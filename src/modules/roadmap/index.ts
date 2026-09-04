/**
 * Roadmap Domain Module Public Facade.
 * Clean boundary: All external consumers import ONLY from here.
 */

// Domain DTOs and contracts
export type {
  TopicNodeStatus,
  TopicDifficulty,
  TopicNodePayload,
  RoadmapNodeDTO,
  RoadmapEdgeDTO,
  RoadmapGraphDTO,
  RawCourse,
  RawTier,
  RawTopic,
  RawPrerequisite,
  RawTranslation,
  RawUserProgress,
  RawPosition,
  TransformRoadmapOptions,
} from "./types";

// Domain Services
export {
  getCourseRoadmapGraph,
  type GetCourseRoadmapOptions,
} from "./services/roadmap-service";

export {
  transformCourseToGraphDTO,
  resolveTranslation,
} from "./services/roadmap-transform";

export {
  computeDeterministicLayout,
  type ComputedPositionMap,
} from "./services/roadmap-layout";

// UI Components and Hooks
export { RoadmapCanvas } from "./components/roadmap-canvas";
export { TopicNode, type TopicNodeType } from "./components/nodes/topic-node";
export { TopicEdge, type TopicEdgeType } from "./components/edges/topic-edge";
export { RoadmapNextAction } from "./components/controls/roadmap-next-action";
export { RoadmapDrawer } from "./components/drawer/roadmap-drawer";
export { useRoadmapStore, type RoadmapFocusMode, type RoadmapState } from "./hooks/use-roadmap-store";

// Catalog Service & Components
export {
  getCatalogCourses,
  type CourseCardDTO,
  type CourseDifficulty,
  type GetCatalogCoursesOptions,
} from "./services/course-catalog-service";

export { CourseCard, type CourseCardProps } from "./components/catalog/CourseCard";
export { CourseCatalogFilter } from "./components/catalog/CourseCatalogFilter";


