/**
 * Course Studio Module Facade.
 */

export { StudioCanvas } from "./components/studio-canvas";
export { getCourseStudioGraph } from "./services/studio-service";

export type {
  StudioGraphDTO,
  StudioNode,
  StudioEdge,
  SyncStatus,
  ConnectionType,
} from "./types";
