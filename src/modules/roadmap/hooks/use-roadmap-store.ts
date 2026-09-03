import { create } from "zustand";

export type RoadmapFocusMode = "ALL" | "UNLOCKED_ONLY";

export interface RoadmapState {
  selectedTopicId: string | null;
  isDrawerOpen: boolean;
  focusMode: RoadmapFocusMode;
  hoveredTopicId: string | null;

  // Actions
  selectTopic: (topicId: string | null) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setFocusMode: (mode: RoadmapFocusMode) => void;
  toggleFocusMode: () => void;
  setHoveredTopicId: (topicId: string | null) => void;
  reset: () => void;
}

export const useRoadmapStore = create<RoadmapState>((set) => ({
  selectedTopicId: null,
  isDrawerOpen: false,
  focusMode: "ALL",
  hoveredTopicId: null,

  selectTopic: (topicId) =>
    set({
      selectedTopicId: topicId,
      isDrawerOpen: topicId !== null,
    }),

  openDrawer: () => set({ isDrawerOpen: true }),

  closeDrawer: () => set({ isDrawerOpen: false }),

  setFocusMode: (mode) => set({ focusMode: mode }),

  toggleFocusMode: () =>
    set((state) => ({
      focusMode: state.focusMode === "ALL" ? "UNLOCKED_ONLY" : "ALL",
    })),

  setHoveredTopicId: (topicId) => set({ hoveredTopicId: topicId }),

  reset: () =>
    set({
      selectedTopicId: null,
      isDrawerOpen: false,
      focusMode: "ALL",
      hoveredTopicId: null,
    }),
}));
