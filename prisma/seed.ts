import { PrismaClient, Difficulty, DependencyType, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Начинаем наполнение базы данных...");

  // 1. Создаем локали (ru, en)
  await prisma.locale.upsert({
    where: { code: "ru" },
    update: {},
    create: { code: "ru", name: "Русский", isActive: true },
  });

  await prisma.locale.upsert({
    where: { code: "en" },
    update: {},
    create: { code: "en", name: "English", isActive: true },
  });

  // 2. Создаем системного админа/автора
  const author = await prisma.user.upsert({
    where: { email: "admin@notis.local" },
    update: {},
    create: {
      authId: "seed_admin_1",
      email: "admin@notis.local",
      name: "Notis Architect",
      role: Role.ADMIN,
    },
  });

  // 3. Создаем базовый демо-курс
  const course = await prisma.course.upsert({
    where: { slug: "cs-foundations" },
    update: {},
    create: {
      slug: "cs-foundations",
      defaultLocale: "ru",
      availableLocales: ["ru"],
      isPublished: true,
      collaborators: {
        create: {
          userId: author.id,
          role: "OWNER",
        },
      },
      translations: {
        create: {
          locale: "ru",
          title: "Основы Computer Science и Алгоритмов",
          tagline: "Интерактивная карта ключевых концепций программирования",
          description:
            "Фундаментальная база от типов данных до графовых алгоритмов.",
        },
      },
    },
  });

  // 4. Добавляем базовый уровень (Tier 1)
  const tier1 = await prisma.tier.upsert({
    where: {
      courseId_slug: {
        courseId: course.id,
        slug: "tier-1-basics",
      },
    },
    update: {},
    create: {
      slug: "tier-1-basics",
      courseId: course.id,
      badgeColor: "#10b981",
      order: 1,
      isPublished: true,
      translations: {
        create: {
          locale: "ru",
          name: "Базовые концепции и память",
        },
      },
    },
  });

  // 5. Создаем две стартовые темы
  const topicMemory = await prisma.topic.upsert({
    where: {
      courseId_slug: {
        courseId: course.id,
        slug: "memory-basics",
      },
    },
    update: {},
    create: {
      slug: "memory-basics",
      courseId: course.id,
      tierId: tier1.id,
      difficulty: Difficulty.BEGINNER,
      isPublished: true,
      isFreePreview: true,
      createdById: author.id,
      translations: {
        create: {
          locale: "ru",
          title: "Устройство памяти: Стек и Куча",
          summary:
            "Разница между статическим и динамическим выделением памяти.",
          keyPoints: [
            "Стек быстрый и фиксированный",
            "Куча гибкая, но требует менеджмента",
          ],
          pitfalls: ["Утечки памяти при отсутствии очистки в куче"],
        },
      },
    },
  });

  const topicPointers = await prisma.topic.upsert({
    where: {
      courseId_slug: {
        courseId: course.id,
        slug: "pointers-references",
      },
    },
    update: {},
    create: {
      slug: "pointers-references",
      courseId: course.id,
      tierId: tier1.id,
      difficulty: Difficulty.BEGINNER,
      isPublished: true,
      createdById: author.id,
      translations: {
        create: {
          locale: "ru",
          title: "Указатели и ссылки",
          summary: "Как программы обращаются к адресам в памяти.",
          keyPoints: ["Указатель хранит адрес, а не само значение"],
          pitfalls: [
            "Разыменование нулевого указателя (Null Pointer Exception)",
          ],
        },
      },
    },
  });

  // 6. Создаем связь графа: Указатели требуют понимания памяти
  await prisma.topicPrerequisite.upsert({
    where: {
      topicId_prerequisiteId: {
        topicId: topicPointers.id,
        prerequisiteId: topicMemory.id,
      },
    },
    update: {},
    create: {
      topicId: topicPointers.id,
      prerequisiteId: topicMemory.id,
      type: DependencyType.REQUIRED,
    },
  });

  console.log("✅ Данные успешно залиты!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
