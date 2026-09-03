import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { transformCourseToGraphDTO } from "../roadmap-transform";
import type { RawCourse } from "../../types";

const mockCourse: RawCourse = {
  id: "course-1",
  slug: "cs-foundations",
  defaultLocale: "ru",
  learningMode: "ROADMAP",
  translations: [
    { locale: "ru", title: "Основы CS" },
    { locale: "en", title: "CS Foundations" },
  ],
  tiers: [
    {
      id: "tier-1",
      slug: "tier-basics",
      badgeColor: "#10b981",
      order: 1,
      translations: [
        { locale: "ru", name: "Базовый уровень" },
        { locale: "en", name: "Basics" },
      ],
    },
    {
      id: "tier-2",
      slug: "tier-advanced",
      badgeColor: "#6366f1",
      order: 2,
      translations: [{ locale: "ru", name: "Продвинутый уровень" }],
    },
  ],
  topics: [
    {
      id: "topic-memory",
      slug: "memory-basics",
      difficulty: "BEGINNER",
      version: 2,
      isPublished: true,
      isFreePreview: true,
      tierId: "tier-1",
      translations: [
        { locale: "ru", title: "Устройство памяти" },
        { locale: "en", title: "Memory Layout" },
      ],
      prerequisites: [],
    },
    {
      id: "topic-pointers",
      slug: "pointers-references",
      difficulty: "BEGINNER",
      version: 1,
      isPublished: true,
      isFreePreview: false,
      tierId: "tier-1",
      translations: [{ locale: "ru", title: "Указатели и ссылки" }],
      prerequisites: [
        {
          prerequisiteId: "topic-memory",
          type: "REQUIRED",
        },
      ],
    },
    {
      id: "topic-algorithms",
      slug: "graph-algorithms",
      difficulty: "ADVANCED",
      version: 1,
      isPublished: true,
      isFreePreview: false,
      tierId: "tier-2",
      translations: [{ locale: "ru", title: "Графовые алгоритмы" }],
      prerequisites: [
        {
          prerequisiteId: "topic-pointers",
          type: "REQUIRED",
        },
        {
          prerequisiteId: "topic-memory",
          type: "RECOMMENDED",
        },
      ],
    },
  ],
};

describe("RoadmapTransform: Fog of War and Graph Generation", () => {
  test("Guest / Initial user: Root nodes are AVAILABLE, dependents are LOCKED", () => {
    const graph = transformCourseToGraphDTO({
      course: mockCourse,
      userProgress: [],
    });

    const memoryNode = graph.nodes.find((n) => n.id === "topic-memory");
    const pointersNode = graph.nodes.find((n) => n.id === "topic-pointers");
    const algoNode = graph.nodes.find((n) => n.id === "topic-algorithms");

    assert.equal(memoryNode?.data.status, "AVAILABLE");
    assert.equal(pointersNode?.data.status, "LOCKED");
    assert.equal(algoNode?.data.status, "LOCKED");

    // Check edge unlock status
    const reqEdge = graph.edges.find(
      (e) => e.source === "topic-memory" && e.target === "topic-pointers"
    );
    assert.equal(reqEdge?.isUnlocked, false);
    assert.equal(reqEdge?.type, "required");
  });

  test("When prerequisite completed: Dependent node unlocks to AVAILABLE and edge isUnlocked = true", () => {
    const graph = transformCourseToGraphDTO({
      course: mockCourse,
      userProgress: [
        {
          topicId: "topic-memory",
          status: "COMPLETED",
          completedVersion: 2,
        },
      ],
    });

    const memoryNode = graph.nodes.find((n) => n.id === "topic-memory");
    const pointersNode = graph.nodes.find((n) => n.id === "topic-pointers");
    const algoNode = graph.nodes.find((n) => n.id === "topic-algorithms");

    assert.equal(memoryNode?.data.status, "COMPLETED");
    assert.equal(pointersNode?.data.status, "AVAILABLE");
    assert.equal(algoNode?.data.status, "LOCKED"); // Still locked because topic-pointers is not completed

    const edge = graph.edges.find(
      (e) => e.source === "topic-memory" && e.target === "topic-pointers"
    );
    assert.equal(edge?.isUnlocked, true);
  });

  test("Topic in progress reports IN_PROGRESS status", () => {
    const graph = transformCourseToGraphDTO({
      course: mockCourse,
      userProgress: [
        {
          topicId: "topic-memory",
          status: "IN_PROGRESS",
        },
      ],
    });

    const memoryNode = graph.nodes.find((n) => n.id === "topic-memory");
    assert.equal(memoryNode?.data.status, "IN_PROGRESS");
  });

  test("Version update: Flags hasUpdate = true when completedVersion < currentVersion", () => {
    const graph = transformCourseToGraphDTO({
      course: mockCourse,
      userProgress: [
        {
          topicId: "topic-memory",
          status: "COMPLETED",
          completedVersion: 1, // Current is 2
        },
      ],
    });

    const memoryNode = graph.nodes.find((n) => n.id === "topic-memory");
    assert.equal(memoryNode?.data.progress.hasUpdate, true);
    assert.equal(memoryNode?.data.progress.completedVersion, 1);
    assert.equal(memoryNode?.data.progress.currentVersion, 2);
  });

  test("Recommended prerequisites do not block node availability", () => {
    // Both memory and pointers completed -> algorithms should be AVAILABLE even if extra recommended prereqs exist
    const graph = transformCourseToGraphDTO({
      course: mockCourse,
      userProgress: [
        { topicId: "topic-memory", status: "COMPLETED", completedVersion: 2 },
        { topicId: "topic-pointers", status: "COMPLETED", completedVersion: 1 },
      ],
    });

    const algoNode = graph.nodes.find((n) => n.id === "topic-algorithms");
    assert.equal(algoNode?.data.status, "AVAILABLE");

    const recEdge = graph.edges.find(
      (e) => e.source === "topic-memory" && e.target === "topic-algorithms"
    );
    assert.equal(recEdge?.type, "recommended");
  });

  test("Localization resolution works for requested locale and falls back properly", () => {
    const enGraph = transformCourseToGraphDTO({
      course: mockCourse,
      locale: "en",
    });

    assert.equal(enGraph.course.title, "CS Foundations");
    const enMemory = enGraph.nodes.find((n) => n.id === "topic-memory");
    assert.equal(enMemory?.data.title, "Memory Layout");
    assert.equal(enMemory?.data.tier.title, "Basics");

    // Tier 2 has only Russian translation, should fall back cleanly
    const enAlgo = enGraph.nodes.find((n) => n.id === "topic-algorithms");
    assert.equal(enAlgo?.data.tier.title, "Продвинутый уровень");
  });

  test("Layout priority: User layout > Default layout > Deterministic fallback", () => {
    const graphWithLayouts = transformCourseToGraphDTO({
      course: mockCourse,
      defaultLayouts: [{ topicId: "topic-memory", positionX: 100, positionY: 150 }],
      userLayouts: [{ topicId: "topic-memory", positionX: 500, positionY: 550 }],
    });

    const memoryNode = graphWithLayouts.nodes.find((n) => n.id === "topic-memory");
    assert.deepEqual(memoryNode?.position, { x: 500, y: 550 });

    // Node without user layout uses default layout
    const graphWithDefaultOnly = transformCourseToGraphDTO({
      course: mockCourse,
      defaultLayouts: [{ topicId: "topic-memory", positionX: 100, positionY: 150 }],
      userLayouts: [],
    });
    const memoryNodeDefault = graphWithDefaultOnly.nodes.find((n) => n.id === "topic-memory");
    assert.deepEqual(memoryNodeDefault?.position, { x: 100, y: 150 });

    // Node with no saved layouts gets deterministic layout
    const pointersNode = graphWithDefaultOnly.nodes.find((n) => n.id === "topic-pointers");
    assert.ok(typeof pointersNode?.position.x === "number");
    assert.ok(typeof pointersNode?.position.y === "number");
    assert.ok((pointersNode?.position.y ?? 0) > 0);
  });

  test("Unpublished/missing prerequisites do not lock nodes or generate dangling edges", () => {
    const courseWithDanglingPrereq: RawCourse = {
      ...mockCourse,
      topics: [
        {
          id: "topic-orphan-prereq",
          slug: "orphan-test",
          difficulty: "BEGINNER",
          version: 1,
          isPublished: true,
          isFreePreview: false,
          tierId: "tier-1",
          translations: [
            { locale: "ru", title: "Тема с удаленным пререквизитом" },
          ],
          prerequisites: [
            {
              prerequisiteId: "non-existent-unpublished-topic",
              type: "REQUIRED",
            },
          ],
        },
      ],
    };

    const graph = transformCourseToGraphDTO({
      course: courseWithDanglingPrereq,
      userProgress: [],
    });

    const node = graph.nodes.find((n) => n.id === "topic-orphan-prereq");
    // Since the required prereq does not exist on the canvas, it should not lock the node
    assert.equal(node?.data.status, "AVAILABLE");

    // No dangling edge should be created
    const edge = graph.edges.find(
      (e) => e.source === "non-existent-unpublished-topic"
    );
    assert.equal(edge, undefined);
    assert.equal(graph.edges.length, 0);
  });
});
