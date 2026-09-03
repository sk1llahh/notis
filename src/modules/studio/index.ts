/**
 * Course Studio Module Facade.
 */

export { StudioCanvas } from "./components/studio-canvas";
export { StudioTopicDrawer } from "./components/studio-topic-drawer";
export {
  getCourseStudioGraph,
  getTopicStudioDetails,
} from "./services/studio-service";

export type {
  StudioGraphDTO,
  StudioNode,
  StudioEdge,
  SyncStatus,
  ConnectionType,
  TopicStudioDetailsDTO,
  StudioQuizQuestionDTO,
  StudioQuizOptionDTO,
} from "./types";

