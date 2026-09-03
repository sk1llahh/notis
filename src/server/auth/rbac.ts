import { prisma } from "@/server/db";
import { ActionException } from "@/server/actions/safe-action";

export type AuthorRole = "ADMIN" | "OWNER" | "EDITOR";

export interface AssertCourseAuthorResult {
  courseId: string;
  courseTitle: string;
  role: AuthorRole;
}

/**
 * RBAC Guard: Verifies that a user has authoring or administrative permissions for a given course.
 *
 * Rules:
 * 1. Requires valid userId; otherwise throws ActionException('UNAUTHORIZED').
 * 2. Course must exist; otherwise throws ActionException('NOT_FOUND').
 * 3. System ADMINs have full authoring access ('ADMIN').
 * 4. Course author ('OWNER') has full authoring access.
 * 5. CourseCollaborators with 'OWNER' or 'EDITOR' roles are granted respective access.
 * 6. Otherwise throws ActionException('FORBIDDEN').
 */
export async function assertCourseAuthor(
  courseSlug: string,
  userId?: string
): Promise<AssertCourseAuthorResult> {
  // 1. Check authentication
  if (!userId) {
    throw new ActionException("UNAUTHORIZED", "Требуется авторизация");
  }

  // 2. Fetch user to inspect system-wide role
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: userId }, { authId: userId }, { email: userId }],
    },
    select: {
      id: true,
      role: true,
    },
  });

  // Canonical user ID in the database
  const canonicalUserId = user?.id ?? userId;

  // 3. Fetch course and collaborator records
  const course = await prisma.course.findUnique({
    where: { slug: courseSlug },
    include: {
      translations: true,
      collaborators: {
        where: {
          userId: canonicalUserId,
        },
      },
    },
  });

  if (!course) {
    throw new ActionException("NOT_FOUND", "Курс не найден");
  }

  // Resolve course title from translations or fallback to slug
  const title =
    course.translations.find((t) => t.locale === course.defaultLocale)?.title ??
    course.translations[0]?.title ??
    course.slug;

  // 4. System Admin check
  if (user?.role === "ADMIN") {
    return {
      courseId: course.id,
      courseTitle: title,
      role: "ADMIN",
    };
  }

  // 5. Course author check (direct course.authorId if schema provides it)
  const courseWithAuthor = course as { authorId?: string | null };
  if (
    typeof courseWithAuthor.authorId === "string" &&
    (courseWithAuthor.authorId === canonicalUserId ||
      courseWithAuthor.authorId === userId)
  ) {
    return {
      courseId: course.id,
      courseTitle: title,
      role: "OWNER",
    };
  }

  // 6. Check CourseCollaborator records
  const collaborator = course.collaborators.find(
    (c) => c.userId === canonicalUserId || c.userId === userId
  );

  if (collaborator && (collaborator.role === "OWNER" || collaborator.role === "EDITOR")) {
    return {
      courseId: course.id,
      courseTitle: title,
      role: collaborator.role as "OWNER" | "EDITOR",
    };
  }

  // 7. Forbidden if no matching privileges
  throw new ActionException(
    "FORBIDDEN",
    "Недостаточно прав для редактирования курса"
  );
}
