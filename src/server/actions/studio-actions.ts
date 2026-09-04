"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { assertCourseAuthor } from "@/server/auth";
import { wouldCreateCycle } from "@/modules/roadmap/lib/cycle-detector";
import { createSafeAction, ActionException } from "./safe-action";

// =============================================================================
// SCHEMAS & TYPES
// =============================================================================

export const updateNodePositionsSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  positions: z.record(
    z.string(),
    z.object({
      x: z.number({ message: "Координата X обязательна" }),
      y: z.number({ message: "Координата Y обязательна" }),
    })
  ),
});

export type UpdateNodePositionsInput = z.infer<typeof updateNodePositionsSchema>;

export interface UpdateNodePositionsOutput {
  updatedCount: number;
}

export const connectPrerequisiteSchema = z
  .object({
    courseSlug: z.string().min(1, "Слаг курса обязателен"),
    topicId: z.string().min(1, "ID темы обязателен"),
    prerequisiteId: z.string().min(1, "ID пререквизита обязателен"),
    type: z.enum(["REQUIRED", "RECOMMENDED"]).default("REQUIRED"),
  })
  .refine((data) => data.topicId !== data.prerequisiteId, {
    message: "Нельзя связать тему саму с собой",
    path: ["prerequisiteId"],
  });

export type ConnectPrerequisiteInput = z.infer<typeof connectPrerequisiteSchema>;

export interface ConnectPrerequisiteOutput {
  id: string;
  topicId: string;
  prerequisiteId: string;
  type: "REQUIRED" | "RECOMMENDED";
}

export const disconnectPrerequisiteSchema = z.object({
  courseSlug: z.string().min(1, "Слаг курса обязателен"),
  topicId: z.string().min(1, "ID темы обязателен"),
  prerequisiteId: z.string().min(1, "ID пререквизита обязателен"),
});

export type DisconnectPrerequisiteInput = z.infer<typeof disconnectPrerequisiteSchema>;

export interface DisconnectPrerequisiteOutput {
  topicId: string;
  prerequisiteId: string;
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Server Action: Batch updates topic positions in DefaultGraphLayout.
 * Requires course author/admin permissions.
 */
export const updateNodePositionsAction = createSafeAction(
  updateNodePositionsSchema,
  async (input, { session }): Promise<UpdateNodePositionsOutput> => {
    // 1. RBAC Guard
    const courseAuth = await assertCourseAuthor(input.courseSlug, session.user?.id);

    const positionEntries = Object.entries(input.positions);
    if (positionEntries.length === 0) {
      return { updatedCount: 0 };
    }

    // 2. Transactional upsert in DefaultGraphLayout
    await prisma.$transaction(
      positionEntries.map(([topicId, pos]) =>
        prisma.defaultGraphLayout.upsert({
          where: {
            courseId_topicId: {
              courseId: courseAuth.courseId,
              topicId,
            },
          },
          create: {
            courseId: courseAuth.courseId,
            topicId,
            positionX: pos.x,
            positionY: pos.y,
          },
          update: {
            positionX: pos.x,
            positionY: pos.y,
          },
        })
      )
    );

    // 3. Cache revalidation
    revalidatePath(`/courses/${input.courseSlug}`);

    return { updatedCount: positionEntries.length };
  }
);

/**
 * Server Action: Connects a prerequisite edge from prerequisiteId to topicId.
 * Validates self-references and prevents mutual cyclic dependencies.
 * Requires course author/admin permissions.
 */
export const connectPrerequisiteAction = createSafeAction(
  connectPrerequisiteSchema,
  async (input, { session }): Promise<ConnectPrerequisiteOutput> => {
    // 1. Defense in depth: Check self-connection
    if (input.topicId === input.prerequisiteId) {
      throw new ActionException(
        "BAD_REQUEST",
        "Нельзя связать тему саму с собой"
      );
    }

    // 2. RBAC Guard
    const courseAuth = await assertCourseAuthor(input.courseSlug, session.user?.id);

    // 3. Cycle prevention: load all existing edges for the course and verify DAG invariant via DFS
    const existingPrerequisites = await prisma.topicPrerequisite.findMany({
      where: {
        topic: {
          courseId: courseAuth.courseId,
        },
      },
      select: {
        prerequisiteId: true,
        topicId: true,
      },
    });

    const existingEdges = existingPrerequisites.map((p) => ({
      source: p.prerequisiteId,
      target: p.topicId,
    }));

    const newEdge = {
      source: input.prerequisiteId,
      target: input.topicId,
    };

    if (wouldCreateCycle(existingEdges, newEdge)) {
      throw new ActionException(
        "CONFLICT",
        "Невозможно добавить связь: обнаружен циклический путь зависимостей"
      );
    }

    // 4. Upsert prerequisite relationship
    const record = await prisma.topicPrerequisite.upsert({
      where: {
        topicId_prerequisiteId: {
          topicId: input.topicId,
          prerequisiteId: input.prerequisiteId,
        },
      },
      create: {
        topicId: input.topicId,
        prerequisiteId: input.prerequisiteId,
        type: input.type,
      },
      update: {
        type: input.type,
      },
    });

    // 5. Cache revalidation
    revalidatePath(`/courses/${input.courseSlug}`);

    return {
      id: record.id,
      topicId: record.topicId,
      prerequisiteId: record.prerequisiteId,
      type: record.type,
    };
  }
);

/**
 * Server Action: Disconnects a prerequisite edge between topics.
 * Requires course author/admin permissions.
 */
export const disconnectPrerequisiteAction = createSafeAction(
  disconnectPrerequisiteSchema,
  async (input, { session }): Promise<DisconnectPrerequisiteOutput> => {
    // 1. RBAC Guard
    await assertCourseAuthor(input.courseSlug, session.user?.id);

    // 2. Delete prerequisite edge
    await prisma.topicPrerequisite.deleteMany({
      where: {
        topicId: input.topicId,
        prerequisiteId: input.prerequisiteId,
      },
    });

    // 3. Cache revalidation
    revalidatePath(`/courses/${input.courseSlug}`);

    return {
      topicId: input.topicId,
      prerequisiteId: input.prerequisiteId,
    };
  }
);
