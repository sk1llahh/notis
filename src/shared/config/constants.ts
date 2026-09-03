export const APP_CONFIG = {
  NAME: "Notis",
  DEFAULT_LOCALE: "ru",
  SUPPORTED_LOCALES: ["ru", "en"] as const,
  // Backwards compatibility properties
  defaultLocale: "ru",
  supportedLocales: ["ru", "en"] as const,
  siteName: "Notis",
  siteDescription:
    "Интерактивная платформа обучения со структурированными роадмапами и интервальным повторением",
} as const;

export const GRAPH_DIMENSIONS = {
  NODE_WIDTH: 240,
  NODE_HEIGHT: 110,
  LAYER_GAP_X: 300,
  NODE_GAP_Y: 150,
  MIN_ZOOM: 0.2,
  MAX_ZOOM: 1.8,
  DEFAULT_ZOOM: 1.0,
  FOCUS_ANIMATION_DURATION_MS: 700,
} as const;

// Backward-compatible alias for layout calculations
export const GRAPH_CONFIG = {
  defaultNodeWidth: GRAPH_DIMENSIONS.NODE_WIDTH,
  defaultNodeHeight: GRAPH_DIMENSIONS.NODE_HEIGHT,
  tierHorizontalSpacing: GRAPH_DIMENSIONS.LAYER_GAP_X,
  nodeVerticalSpacing: GRAPH_DIMENSIONS.NODE_GAP_Y,
} as const;

export const GAMIFICATION_RULES = {
  XP_TOPIC_COMPLETION: 50,
  XP_QUIZ_PERFECT_SCORE: 25,
  STREAK_EXPIRATION_HOURS: 36,
} as const;

export const SM2_CONFIG = {
  DEFAULT_EASINESS_FACTOR: 2.5,
  MIN_EASINESS_FACTOR: 1.3,
  INITIAL_INTERVAL_DAYS: 1,
} as const;

export const ROUTES = {
  HOME: "/",
  COURSES: "/courses",
  COURSE: (slug: string) => `/courses/${slug}`,
  TOPIC: (courseSlug: string, topicSlug: string) =>
    `/courses/${courseSlug}/topics/${topicSlug}`,
  PRACTICE: "/practice",
  PROFILE: "/profile",
} as const;
