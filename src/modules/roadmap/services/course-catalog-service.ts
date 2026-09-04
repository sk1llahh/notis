import { prisma } from "@/server/db";

export type CourseDifficulty =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "EXPERT";

export interface CourseCardDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: CourseDifficulty;
  topicsCount: number;
  estimatedHours: number;
  tags: string[];
  isEnrolled: boolean;
  progressPercent: number;
  authorName: string;
}

export interface GetCatalogCoursesOptions {
  userId?: string;
  query?: string;
  difficulty?: string;
}

/**
 * Derives overall course difficulty from the distribution of its active topics.
 */
function calculateCourseDifficulty(
  topics: Array<{ difficulty: string }>
): CourseDifficulty {
  if (topics.length === 0) return "BEGINNER";

  const weights: Record<string, number> = {
    BEGINNER: 1,
    INTERMEDIATE: 2,
    ADVANCED: 3,
    EXPERT: 4,
  };

  const avgWeight =
    topics.reduce(
      (sum, topic) => sum + (weights[topic.difficulty] || 1),
      0
    ) / topics.length;

  if (avgWeight >= 3.5) return "EXPERT";
  if (avgWeight >= 2.5) return "ADVANCED";
  if (avgWeight >= 1.7) return "INTERMEDIATE";
  return "BEGINNER";
}

/**
 * Queries and formats published courses for the catalog showcase,
 * including completion metrics for authenticated users and search/difficulty filters.
 */
export async function getCatalogCourses(
  options?: GetCatalogCoursesOptions
): Promise<CourseCardDTO[]> {
  const { userId, query, difficulty } = options ?? {};

  // 1. Resolve canonical user ID if authId was provided
  let canonicalUserId = userId;
  if (userId) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userId }, { authId: userId }],
      },
      select: { id: true },
    });
    if (user) {
      canonicalUserId = user.id;
    }
  }

  // 2. Query published courses with topics, translations, collaborators, tags, and enrollments
  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      isArchived: false,
    },
    include: {
      translations: true,
      topics: {
        where: {
          isPublished: true,
          isArchived: false,
        },
        select: {
          id: true,
          difficulty: true,
          estimatedMinutes: true,
        },
      },
      collaborators: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      courseTags: {
        include: {
          tag: {
            include: {
              translations: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
      ...(canonicalUserId
        ? {
            enrollments: {
              where: {
                userId: canonicalUserId,
                status: "ACTIVE",
              },
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Transform to CourseCardDTO with progress metrics
  const catalogList: CourseCardDTO[] = await Promise.all(
    courses.map(async (course) => {
      const translation =
        course.translations.find((t) => t.locale === "ru") ??
        course.translations[0];

      const title = translation?.title ?? course.slug;
      const description =
        translation?.description ?? translation?.tagline ?? "";

      const topicsCount =
        course.publishedTopicsCount > 0
          ? course.publishedTopicsCount
          : course.topics.length;

      const totalMinutes = course.topics.reduce(
        (sum, t) => sum + (t.estimatedMinutes || 15),
        0
      );
      const estimatedHours = Math.max(1, Math.round(totalMinutes / 60));

      const tags = course.courseTags.map((ct) => {
        const tagTrans =
          ct.tag.translations.find((t) => t.locale === "ru") ??
          ct.tag.translations[0];
        return tagTrans?.name ?? ct.tag.slug;
      });

      const ownerCollaborator =
        course.collaborators.find((c) => c.role === "OWNER") ??
        course.collaborators[0];

      const authorName =
        ownerCollaborator?.user.name ??
        ownerCollaborator?.user.email?.split("@")[0] ??
        "Команда Notis";

      const courseDifficulty = calculateCourseDifficulty(course.topics);

      // Progress Calculation
      let isEnrolled = false;
      let progressPercent = 0;

      if (canonicalUserId) {
        const hasEnrollment =
          Array.isArray(course.enrollments) && course.enrollments.length > 0;

        const completedTopics = await prisma.userProgress.count({
          where: {
            userId: canonicalUserId,
            status: "COMPLETED",
            topic: {
              courseId: course.id,
              isPublished: true,
              isArchived: false,
            },
          },
        });

        isEnrolled = hasEnrollment || completedTopics > 0;
        progressPercent =
          topicsCount > 0
            ? Math.min(100, Math.round((completedTopics / topicsCount) * 100))
            : 0;
      }

      return {
        id: course.id,
        slug: course.slug,
        title,
        description,
        difficulty: courseDifficulty,
        topicsCount,
        estimatedHours,
        tags,
        isEnrolled,
        progressPercent,
        authorName,
      };
    })
  );

  // 4. Apply Filters (Query and Difficulty)
  return catalogList.filter((course) => {
    if (difficulty && difficulty.toUpperCase() !== "ALL") {
      if (course.difficulty !== difficulty.toUpperCase()) {
        return false;
      }
    }

    if (query && query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      const inTitle = course.title.toLowerCase().includes(q);
      const inDesc = course.description.toLowerCase().includes(q);
      const inSlug = course.slug.toLowerCase().includes(q);
      const inTags = course.tags.some((tag) => tag.toLowerCase().includes(q));

      if (!inTitle && !inDesc && !inSlug && !inTags) {
        return false;
      }
    }

    return true;
  });
}
