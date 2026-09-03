/**
 * Topic domain module public facade.
 * Clean boundary: External consumers import ONLY from here.
 */

// Types & DTOs
export type {
  TopicDetailsDTO,
  TopicProgressStatus,
  TopicDifficulty,
  TopicTierDTO,
  TopicUserProgressDTO,
  GetTopicDetailsOptions,
} from "./types";

// Services
export { getTopicDetails } from "./services/topic-service";

// UI Components
export { TopicHeader } from "./components/topic-header";
export { TopicKeyPoints } from "./components/topic-key-points";
export { TopicFooterAction } from "./components/topic-footer-action";
