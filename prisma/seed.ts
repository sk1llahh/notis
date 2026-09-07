import {
  PrismaClient,
  Difficulty,
  DependencyType,
  Role,
  CourseRole,
  QuestionType,
  GradingStrategy,
  ProgressStatus,
  LearningMode,
  PricingModel,
  AccessSource,
  AccessStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Idempotent teardown: safely removes any existing demonstration entities
 * for course 'cs-foundations' and target seed accounts (*@notis.dev),
 * respecting all Prisma foreign key constraints and onDelete restrictions.
 */
async function cleanDatabase(db: PrismaClient) {
  console.log("🧹 Очистка предыдущих демонстрационных данных...");

  // 1. Clean course and related graph entities
  const courses = await db.course.findMany({
    where: {
      slug: { in: ["cs-foundations", "demo-cs"] },
    },
    select: { id: true },
  });

  const courseIds = courses.map((c) => c.id);

  if (courseIds.length > 0) {
    const topics = await db.topic.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true },
    });
    const topicIds = topics.map((t) => t.id);

    if (topicIds.length > 0) {
      const questions = await db.question.findMany({
        where: { topicId: { in: topicIds } },
        select: { id: true },
      });
      const questionIds = questions.map((q) => q.id);

      if (questionIds.length > 0) {
        // UserQuizAttempt and UserQuestionReview have onDelete: Restrict on Question
        await db.userQuizAttempt.deleteMany({
          where: { questionId: { in: questionIds } },
        });
        await db.userQuestionReview.deleteMany({
          where: { questionId: { in: questionIds } },
        });
        await db.questionTranslation.deleteMany({
          where: { questionId: { in: questionIds } },
        });
        await db.question.deleteMany({
          where: { id: { in: questionIds } },
        });
      }

      await db.topicPrerequisite.deleteMany({
        where: {
          OR: [
            { topicId: { in: topicIds } },
            { prerequisiteId: { in: topicIds } },
          ],
        },
      });
      await db.defaultGraphLayout.deleteMany({
        where: { courseId: { in: courseIds } },
      });
      await db.userGraphLayout.deleteMany({
        where: { courseId: { in: courseIds } },
      });
      await db.userProgress.deleteMany({
        where: { topicId: { in: topicIds } },
      });
      await db.topicTranslation.deleteMany({
        where: { topicId: { in: topicIds } },
      });
      await db.topicTag.deleteMany({
        where: { topicId: { in: topicIds } },
      });
      await db.topic.deleteMany({
        where: { id: { in: topicIds } },
      });
    }

    const tiers = await db.tier.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true },
    });
    const tierIds = tiers.map((t) => t.id);

    if (tierIds.length > 0) {
      await db.tierTranslation.deleteMany({
        where: { tierId: { in: tierIds } },
      });
      await db.tier.deleteMany({
        where: { id: { in: tierIds } },
      });
    }

    await db.payment.deleteMany({
      where: {
        OR: [
          { courseId: { in: courseIds } },
          { enrollment: { courseId: { in: courseIds } } },
        ],
      },
    });

    await db.courseEnrollment.deleteMany({
      where: { courseId: { in: courseIds } },
    });
    await db.courseCollaborator.deleteMany({
      where: { courseId: { in: courseIds } },
    });
    await db.courseTag.deleteMany({
      where: { courseId: { in: courseIds } },
    });
    await db.courseTranslation.deleteMany({
      where: { courseId: { in: courseIds } },
    });
    await db.planCourse.deleteMany({
      where: { courseId: { in: courseIds } },
    });

    await db.course.deleteMany({
      where: { id: { in: courseIds } },
    });
  }

  // 2. Clean seed users by email
  const targetEmails = [
    "admin@notis.dev",
    "author@notis.dev",
    "student@notis.dev",
    "admin@notis.local",
  ];

  const users = await db.user.findMany({
    where: { email: { in: targetEmails } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);

  if (userIds.length > 0) {
    await db.userQuizAttempt.deleteMany({
      where: { userId: { in: userIds } },
    });
    await db.userQuestionReview.deleteMany({
      where: { userId: { in: userIds } },
    });
    await db.userProgress.deleteMany({
      where: { userId: { in: userIds } },
    });
    await db.userGraphLayout.deleteMany({
      where: { userId: { in: userIds } },
    });
    await db.payment.deleteMany({
      where: { userId: { in: userIds } },
    });
    await db.courseEnrollment.deleteMany({
      where: { userId: { in: userIds } },
    });
    await db.subscription.deleteMany({
      where: { userId: { in: userIds } },
    });
    await db.account.deleteMany({
      where: { userId: { in: userIds } },
    });
    await db.session.deleteMany({
      where: { userId: { in: userIds } },
    });
    await db.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }

  console.log("✨ Предыдущие демонстрационные данные успешно очищены.");
}

async function main() {
  console.log("🌱 Начинаем наполнение базы данных Notis...");

  // Teardown previous demo state
  await cleanDatabase(prisma);

  // 1. Locales
  console.log("🌐 1. Создание поддерживаемых локалей (ru, en)...");
  await prisma.locale.upsert({
    where: { code: "ru" },
    update: { name: "Русский", isActive: true },
    create: { code: "ru", name: "Русский", isActive: true },
  });

  await prisma.locale.upsert({
    where: { code: "en" },
    update: { name: "English", isActive: true },
    create: { code: "en", name: "English", isActive: true },
  });

  // 2. Test Users with hashed passwords
  console.log("👥 2. Создание тестовых пользователей...");
  const defaultPassword = "password123";
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

  const admin = await prisma.user.create({
    data: {
      authId: "seed_admin_notis_dev",
      email: "admin@notis.dev",
      name: "Александр (Admin)",
      role: Role.ADMIN,
      passwordHash,
      preferredLocale: "ru",
      emailVerified: new Date(),
    },
  });

  const author = await prisma.user.create({
    data: {
      authId: "seed_author_notis_dev",
      email: "author@notis.dev",
      name: "Елена (Author)",
      role: Role.AUTHOR,
      passwordHash,
      preferredLocale: "ru",
      emailVerified: new Date(),
    },
  });

  const student = await prisma.user.create({
    data: {
      authId: "seed_student_notis_dev",
      email: "student@notis.dev",
      name: "Иван (Student)",
      role: Role.USER,
      passwordHash,
      preferredLocale: "ru",
      emailVerified: new Date(),
      xp: 50,
      streakDays: 1,
      lastStudyAt: new Date(),
    },
  });

  // 3. Demo Course
  console.log("📚 3. Создание демонстрационного курса 'cs-foundations'...");
  const course = await prisma.course.create({
    data: {
      slug: "cs-foundations",
      defaultLocale: "ru",
      availableLocales: ["ru", "en"],
      learningMode: LearningMode.ROADMAP,
      pricingModel: PricingModel.FREE,
      isPublished: true,
      isArchived: false,
      publishedTopicsCount: 6,
      collaborators: {
        create: {
          userId: author.id,
          role: CourseRole.OWNER,
        },
      },
      translations: {
        create: [
          {
            locale: "ru",
            title: "Основы Computer Science и TypeScript",
            tagline:
              "Интерактивная карта ключевых концепций от битов и памяти до продвинутой системы типов",
            description:
              "Фундаментальный курс по компьютерным наукам, структурам данных, оценке алгоритмической сложности и типобезопасной разработке на TypeScript. Включает интерактивные схемы, практические задачи по программированию и систему интервального повторения.",
          },
        ],
      },
    },
  });

  // 4. Tiers
  console.log("🏷️  4. Создание 3 уровней курса (Tiers)...");
  const tier1 = await prisma.tier.create({
    data: {
      slug: "tier-1",
      courseId: course.id,
      order: 1,
      badgeColor: "#3B82F6",
      isPublished: true,
      translations: {
        create: {
          locale: "ru",
          name: "Низкоуровневые основы",
        },
      },
    },
  });

  const tier2 = await prisma.tier.create({
    data: {
      slug: "tier-2",
      courseId: course.id,
      order: 2,
      badgeColor: "#10B981",
      isPublished: true,
      translations: {
        create: {
          locale: "ru",
          name: "Архитектура памяти и алгоритмы",
        },
      },
    },
  });

  const tier3 = await prisma.tier.create({
    data: {
      slug: "tier-3",
      courseId: course.id,
      order: 3,
      badgeColor: "#8B5CF6",
      isPublished: true,
      translations: {
        create: {
          locale: "ru",
          name: "Продвинутая система типов",
        },
      },
    },
  });

  // 5. 6 Topics Forming a DAG
  console.log("🗺️  5. Создание 6 связанных тем с KaTeX, Mermaid и вопросами всех 5 типов...");

  // ---------------------------------------------------------------------------
  // Topic 1: bits-and-masks (Root, Tier 1, x: 300, y: 50)
  // ---------------------------------------------------------------------------
  const topicBits = await prisma.topic.create({
    data: {
      slug: "bits-and-masks",
      courseId: course.id,
      tierId: tier1.id,
      difficulty: Difficulty.BEGINNER,
      estimatedMinutes: 15,
      isPublished: true,
      isFreePreview: true,
      createdById: author.id,
      lastEditedById: author.id,
      translations: {
        create: {
          locale: "ru",
          title: "Битовые операции и маски",
          summary:
            "Основы побитовой арифметики, двоичные сдвиги и применение битовых масок для компактного хранения флагов.",
          keyPoints: [
            "Побитовые операции выполняются процессором за один такт",
            "Сдвиг влево на n бит эквивалентен умножению: $x \\ll n = x \\cdot 2^n$",
            "Битовые маски позволяют хранить до 32 булевых флагов в одном числе",
          ],
          pitfalls: [
            "В JavaScript побитовые операции неявно приводят операнды к 32-битным знаковым целым числам (Int32)",
            "Переполнение при сдвиге более чем на 31 бит",
          ],
          description: `
# Битовые операции и маски

Побитовые операции представляют собой фундаментальный уровень обработки данных, выполняемый процессором за единичные такты. В современных языках программирования битовые манипуляции служат основой криптографических алгоритмов, сетевых протоколов и компактных структур данных.

## 1. Базовые операторы

| Операция | Символ | Описание | Пример |
| :--- | :--- | :--- | :--- |
| **AND** | \`&\` | Побитовое логическое И | \`5 & 3\` $\\to$ \`0101 & 0011 = 0001\` (1) |
| **OR** | \`|\` | Побитовое логическое ИЛИ | \`5 | 3\` $\\to$ \`0101 | 0011 = 0111\` (7) |
| **XOR** | \`^\` | Исключающее ИЛИ | \`5 ^ 3\` $\\to$ \`0101 ^ 0011 = 0110\` (6) |
| **NOT** | \`~\` | Инверсия битов (побитовое отрицание) | \`~0\` $\\to$ \`-1\` (дополнительный код) |
| **LShift** | \`<<\` | Сдвиг влево с заполнением нулями | \`1 << 4\` $\\to$ $1 \\cdot 2^4 = 16$ |
| **RShift** | \`>>\` | Арифметический сдвиг вправо (сохраняет знак) | \`-16 >> 2\` $\\to$ \`-4\` |

## 2. Степени двойки и сдвиги

Двоичный сдвиг влево на $n$ позиций математически строго эквивалентен умножению на $2^n$:

$$x \\ll n = x \\cdot 2^n$$

Соответственно, сдвиг вправо эквивалентен целочисленному делению:

$$x \\gg n = \\lfloor \\frac{x}{2^n} \\rfloor$$

## 3. Битовые маски и флаги

Битовые маски позволяют хранить до 32 булевых состояний в рамках одного 32-битного целого числа:

\`\`\`typescript
const READ_PERMISSION    = 1 << 0; // 0001 (1)
const WRITE_PERMISSION   = 1 << 1; // 0010 (2)
const EXECUTE_PERMISSION = 1 << 2; // 0100 (4)

// Установка флагов (OR)
let permissions = READ_PERMISSION | WRITE_PERMISSION;

// Проверка наличия флага (AND)
const canWrite = (permissions & WRITE_PERMISSION) !== 0;

// Сброс флага (AND NOT)
permissions &= ~WRITE_PERMISSION;
\`\`\`

## 4. Классический трюк Брайана Кернигана

Выражение $n \\ & \\ (n - 1)$ сбрасывает младший установленный бит числа. Если после применения операции результат равен нулю, а само число $n > 0$, то число является точной степенью двойки:

\`\`\`typescript
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}
\`\`\`
          `.trim(),
        },
      },
    },
  });

  // Topic 1 Questions: SINGLE_CHOICE, SHORT_ANSWER, 2 FLASHCARD
  const qBits1 = await prisma.question.create({
    data: {
      topicId: topicBits.id,
      type: QuestionType.SINGLE_CHOICE,
      gradingStrategy: GradingStrategy.EXACT_MATCH,
      order: 1,
      correctAnswerIndexes: [0],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Какой результат вернет операция (1 << 4) в десятичной системе счисления?",
          options: [
            { id: "opt-0", text: "16 (двоичное 10000)" },
            { id: "opt-1", text: "8 (двоичное 1000)" },
            { id: "opt-2", text: "32 (двоичное 100000)" },
            { id: "opt-3", text: "4 (двоичное 100)" },
          ],
          explanation:
            "Сдвиг единицы влево на 4 разряда (1 << 4) эквивалентен вычислению 1 * 2^4 = 16.",
        },
      },
    },
  });

  const qBits2 = await prisma.question.create({
    data: {
      topicId: topicBits.id,
      type: QuestionType.SHORT_ANSWER,
      gradingStrategy: GradingStrategy.CONTAINS_KEYWORDS,
      order: 2,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Чему равно значение выражения (1 << 4) в десятичной системе? Введите число.",
          gradingConfig: {
            acceptedAnswers: ["16", "0x10"],
          },
          explanation:
            "Операция 1 << 4 смещает единицу на 4 позиции влево, что дает число 16.",
        },
      },
    },
  });

  const qBits3 = await prisma.question.create({
    data: {
      topicId: topicBits.id,
      type: QuestionType.FLASHCARD,
      gradingStrategy: GradingStrategy.SELF_ASSESSED,
      order: 3,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Как проверить, установлен ли k-й бит в числе n с помощью битовой маски?",
          explanation:
            "Использовать побитовое И со сдвигом: (n & (1 << k)) !== 0. Если результат не ноль, то k-й бит равен 1.",
        },
      },
    },
  });

  const qBits4 = await prisma.question.create({
    data: {
      topicId: topicBits.id,
      type: QuestionType.FLASHCARD,
      gradingStrategy: GradingStrategy.SELF_ASSESSED,
      order: 4,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Какой эффект дает выражение n & (n - 1) для неотрицательного целого числа n?",
          explanation:
            "Сбрасывает младший установленный бит (самую правую единицу) в числе. Используется в алгоритме Брайана Кернигана для подсчета единичных бит и быстрой проверки степени двойки.",
        },
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Topic 2: stack-and-heap (Tier 2, x: 120, y: 220, Prereq: Topic 1)
  // ---------------------------------------------------------------------------
  const topicStack = await prisma.topic.create({
    data: {
      slug: "stack-and-heap",
      courseId: course.id,
      tierId: tier2.id,
      difficulty: Difficulty.INTERMEDIATE,
      estimatedMinutes: 20,
      isPublished: true,
      isFreePreview: true,
      createdById: author.id,
      lastEditedById: author.id,
      translations: {
        create: {
          locale: "ru",
          title: "Управление памятью: Стек и Куча",
          summary:
            "Архитектурные различия между стековой памятью вызовов и динамической кучей в современных средах выполнения.",
          keyPoints: [
            "Стек работает по принципу LIFO с мгновенной аллокацией через смещение указателя RSP",
            "Куча предназначена для динамических объектов с произвольным временем жизни",
            "Сборщик мусора (GC) освобождает память в куче сканированием достижимых GC Roots",
          ],
          pitfalls: [
            "Stack Overflow при глубокой или бесконечной рекурсии",
            "Утечки памяти (Memory Leaks) из-за неудалимых ссылок в замыканиях или глобальных слушателях",
          ],
          description: `
# Управление памятью: Стек и Куча

В архитектуре современных виртуальных машин оперативная память процесса разделена на две ключевые области: **Стек вызовов (Call Stack)** и **Динамическую кучу (Heap)**.

\`\`\`mermaid
graph TD
  Process[Процесс приложения] --> Stack[Стек вызовов Call Stack]
  Process --> Heap[Куча Heap Memory]
  Stack --> Frame1[Фрейм main]
  Stack --> Frame2[Фрейм calculate]
  Frame2 --> Prim[Примитивы: number, boolean]
  Frame2 --> Ref[Указатели и адреса в кучу]
  Heap --> Obj1[Динамический объект User]
  Heap --> Obj2[Массив buffer: Array]
  Heap --> Closure[Замыкания и контексты]
  Ref -.->|Ссылка 0x7FFE| Obj1
\`\`\`

## 1. Стек вызовов (Call Stack)

- **Организация**: Структура данных LIFO (Last-In, First-Out).
- **Аллокация**: Мгновенная — процессор лишь смещает регистр-указатель стека (\`RSP\`/\`ESP\`).
- **Время жизни**: Данные существуют строго в пределах выполнения текущей функции и автоматически уничтожаются при выходе.
- **Кэш**: Превосходная пространственная локальность (L1/L2 cache hit rate близок к 100%).

## 2. Динамическая куча (Heap Memory)

- **Организация**: Большой неструктурированный пул виртуальной памяти.
- **Аллокация**: Требует поиска свободного блока подходящего размера.
- **Время жизни**: Произвольное — объекты живут до тех пор, пока на них ссылаются «корни» (GC Roots: глобальные переменные, активные стековые фреймы).
- **Управление**: Освобождается сборщиком мусора (Garbage Collection: Generational Mark-and-Sweep).
          `.trim(),
        },
      },
    },
  });

  // Topic 2 Questions: MULTIPLE_CHOICE, 2 FLASHCARD
  await prisma.question.create({
    data: {
      topicId: topicStack.id,
      type: QuestionType.MULTIPLE_CHOICE,
      gradingStrategy: GradingStrategy.EXACT_MATCH,
      order: 1,
      correctAnswerIndexes: [0, 1, 2],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Какие утверждения справедливы для динамической кучи (Heap) по сравнению со стеком (Stack)?",
          options: [
            {
              id: "opt-0",
              text: "Выделение памяти в куче требует поиска свободного блока и медленнее стека",
            },
            {
              id: "opt-1",
              text: "Стек очищается автоматически при выходе из фрейма функции",
            },
            {
              id: "opt-2",
              text: "Размер объектов в куче может определяться динамически во время выполнения (runtime)",
            },
            {
              id: "opt-3",
              text: "Стек не имеет ограничений по размеру и никогда не переполняется",
            },
          ],
          explanation:
            "Куча предназначена для динамических данных и требует поиска свободного блока памяти, тогда как стек имеет фиксированный лимит и автоматически освобождается LIFO.",
        },
      },
    },
  });

  await prisma.question.create({
    data: {
      topicId: topicStack.id,
      type: QuestionType.FLASHCARD,
      gradingStrategy: GradingStrategy.SELF_ASSESSED,
      order: 2,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Что такое утечка памяти (Memory Leak) в управляемой среде со сборщиком мусора?",
          explanation:
            "Ситуация, когда объекты больше не нужны программе, но на них все еще сохраняются достижимые ссылки от GC Roots, из-за чего сборщик мусора не может освободить занятую ими память.",
        },
      },
    },
  });

  await prisma.question.create({
    data: {
      topicId: topicStack.id,
      type: QuestionType.FLASHCARD,
      gradingStrategy: GradingStrategy.SELF_ASSESSED,
      order: 3,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "В чем разница между Stack Allocation и Heap Allocation с точки зрения процессорного кэша?",
          explanation:
            "Стек обладает высокой пространственной локальностью данных (L1/L2 cache-friendly), так как память располагается последовательно. Данные в куче фрагментированы по адресам, что чаще приводит к cache miss.",
        },
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Topic 3: big-o-notation (Tier 2, x: 480, y: 220, Prereq: Topic 1)
  // ---------------------------------------------------------------------------
  const topicBigO = await prisma.topic.create({
    data: {
      slug: "big-o-notation",
      courseId: course.id,
      tierId: tier2.id,
      difficulty: Difficulty.INTERMEDIATE,
      estimatedMinutes: 25,
      isPublished: true,
      isFreePreview: true,
      createdById: author.id,
      lastEditedById: author.id,
      translations: {
        create: {
          locale: "ru",
          title: "Оценка сложности алгоритмов (Big O)",
          summary:
            "Асимптотический анализ времени работы и потребления памяти алгоритмов. Классификация $O$, $\\Omega$, $\\Theta$.",
          keyPoints: [
            "Big O описывает верхнюю границу скорости роста ресурсов при $n \\to \\infty$",
            "Константы и младшие члены отбрасываются при асимптотическом анализе",
            "Бинарный поиск имеет логарифмическую сложность $O(\\log n)$",
          ],
          pitfalls: [
            "Путаница между худшим временем $O(n)$ и средним ожидаемым случаем",
            "Игнорирование пространственной сложности (Space Complexity) при рекурсии",
          ],
          description: `
# Оценка сложности алгоритмов (Big O)

Асимптотический анализ позволяет оценить поведение времени выполнения ($T(n)$) и объема используемой памяти ($S(n)$) алгоритма при стремлении размера входных данных $n$ к бесконечности.

## 1. Математическое определение Big O

Функция $f(n)$ принадлежит классу $O(g(n))$, если существуют константа $c > 0$ и порог $n_0 \\in \\mathbb{N}$, такие что для всех $n \\ge n_0$:

$$|f(n)| \\le c \\cdot |g(n)|$$

## 2. Иерархия классов сложности

По возрастанию скорости роста функций:

$$O(1) \\subset O(\\log n) \\subset O(n) \\subset O(n \\log n) \\subset O(n^2) \\subset O(2^n)$$

- $O(1)$ — Константная сложность (доступ по индексу).
- $O(\\log n)$ — Логарифмическая сложность (бинарный поиск).
- $O(n)$ — Линейная сложность (однократный проход).
- $O(n \\log n)$ — Квазилинейная сложность (Merge Sort, Quick Sort в среднем).
- $O(n^2)$ — Квадратичная сложность (вложенные циклы).

## 3. Рекуррентные соотношения и Master Theorem

Для рекурсивных алгоритмов «разделяй и властвуй», разбивающих задачу на $a$ подзадач размера $n/b$, время описывается формулой:

$$T(n) = aT\\left(\\frac{n}{b}\\right) + f(n)$$

Основная теорема сравнивает скорость роста $f(n)$ с критической функцией $n^{\\log_b a}$, определяя итоговую сложность.
          `.trim(),
        },
      },
    },
  });

  // Topic 3 Questions: SHORT_ANSWER, 2 FLASHCARD
  await prisma.question.create({
    data: {
      topicId: topicBigO.id,
      type: QuestionType.SHORT_ANSWER,
      gradingStrategy: GradingStrategy.CONTAINS_KEYWORDS,
      order: 1,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Какова асимптотическая временная сложность классического бинарного поиска в отсортированном массиве размером n? Запишите в нотации O(log n) или log n.",
          gradingConfig: {
            acceptedAnswers: [
              "O(log n)",
              "O(logn)",
              "log n",
              "logn",
              "O(log(n))",
            ],
          },
          explanation:
            "На каждом шаге бинарный поиск сокращает область поиска в 2 раза, поэтому число итераций равно log2(n) = O(log n).",
        },
      },
    },
  });

  await prisma.question.create({
    data: {
      topicId: topicBigO.id,
      type: QuestionType.FLASHCARD,
      gradingStrategy: GradingStrategy.SELF_ASSESSED,
      order: 2,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Сформулируйте суть Master Theorem (Основной теоремы о рекуррентных соотношениях).",
          explanation:
            "Для соотношений вида T(n) = a*T(n/b) + f(n) теорема сравнивает f(n) с критической функцией n^{log_b(a)}, определяя асимптотику рекурсивного алгоритма.",
        },
      },
    },
  });

  await prisma.question.create({
    data: {
      topicId: topicBigO.id,
      type: QuestionType.FLASHCARD,
      gradingStrategy: GradingStrategy.SELF_ASSESSED,
      order: 3,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "В чем различие между O(n log n) и O(n^2) при n = 1 000 000 элементов?",
          explanation:
            "При n = 10^6 число операций n*log2(n) составляет около 2*10^7 (доли секунды), тогда как n^2 — 10^12 операций (минуты или часы работы CPU).",
        },
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Topic 4: type-narrowing (Tier 3, x: 120, y: 400, Prereq: Topic 2)
  // ---------------------------------------------------------------------------
  const topicNarrowing = await prisma.topic.create({
    data: {
      slug: "type-narrowing",
      courseId: course.id,
      tierId: tier3.id,
      difficulty: Difficulty.ADVANCED,
      estimatedMinutes: 20,
      isPublished: true,
      isFreePreview: false,
      createdById: author.id,
      lastEditedById: author.id,
      translations: {
        create: {
          locale: "ru",
          title: "Сужение типов и Type Guards",
          summary:
            "Продвинутый тайпчекинг TypeScript: предикаты типов (value is Type), discriminated unions и exhaustiveness checking.",
          keyPoints: [
            "Предикаты функций вида fn(x: unknown): x is TargetType сужают тип в блоке if",
            "Тип unknown является безопасным супертипом любого значения, требующим явного сужения",
            "Тип never служит для статической проверки исчерпываемости (Exhaustiveness checking)",
          ],
          pitfalls: [
            "Использование any отключает безопасность типизации и распространяется по всему коду",
            "Предикат типа без реальной валидации в runtime создает дыру в безопасности типов",
          ],
          description: `
# Сужение типов и Type Guards в TypeScript

Система типов TypeScript является структурной. **Сужение типов (Type Narrowing)** — это процесс, при котором компилятор на основе анализа потока управления (Control Flow Analysis) уточняет тип переменной до более конкретного подмножества.

## 1. Встроенные операторы сужения

- \`typeof\` — проверка примитивов (\`typeof x === "string"\`).
- \`instanceof\` — проверка классов (\`x instanceof Date\`).
- \`in\` — проверка наличия поля в объекте (\`"role" in account\`).

## 2. Пользовательские Type Guards

Когда встроенных проверок недостаточно, используются предикаты типов с синтаксисом \`value is TargetType\`:

\`\`\`typescript
interface AdminUser {
  id: string;
  role: "ADMIN";
  permissions: string[];
}

interface RegularUser {
  id: string;
  role: "USER";
}

type AppUser = AdminUser | RegularUser;

function isAdmin(user: AppUser): user is AdminUser {
  return user.role === "ADMIN" && Array.isArray((user as AdminUser).permissions);
}
\`\`\`

## 3. Discriminated Unions и Exhaustiveness Checking

Паттерн размеченного объединения использует общее литеральное поле (дискриминант). Использование типа \`never\` в ветке по умолчанию гарантирует проверку полноты обработки:

\`\`\`typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.size * shape.size;
    default: {
      const _exhaustiveCheck: never = shape;
      return _exhaustiveCheck;
    }
  }
}
\`\`\`
          `.trim(),
        },
      },
    },
  });

  // Topic 4 Questions: SINGLE_CHOICE, 2 FLASHCARD
  await prisma.question.create({
    data: {
      topicId: topicNarrowing.id,
      type: QuestionType.SINGLE_CHOICE,
      gradingStrategy: GradingStrategy.EXACT_MATCH,
      order: 1,
      correctAnswerIndexes: [0],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Какой возвращаемый тип должен иметь кастомный Type Guard для сужения аргумента user к интерфейсу AdminUser?",
          options: [
            { id: "opt-0", text: "user is AdminUser" },
            { id: "opt-1", text: "user as AdminUser" },
            { id: "opt-2", text: "boolean<AdminUser>" },
            { id: "opt-3", text: "asserts user is AdminUser" },
          ],
          explanation:
            "Предикат типа в TypeScript задается конструкцией 'parameter is Type' в возвращаемом типе функции.",
        },
      },
    },
  });

  await prisma.question.create({
    data: {
      topicId: topicNarrowing.id,
      type: QuestionType.FLASHCARD,
      gradingStrategy: GradingStrategy.SELF_ASSESSED,
      order: 2,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "В чем принципиальная разница между типами unknown и any в TypeScript?",
          explanation:
            "any отключает проверку типов и допускает любые вызовы. unknown безопасно принимает любое значение, но запрещает любые операции до явного сужения типа.",
        },
      },
    },
  });

  await prisma.question.create({
    data: {
      topicId: topicNarrowing.id,
      type: QuestionType.FLASHCARD,
      gradingStrategy: GradingStrategy.SELF_ASSESSED,
      order: 3,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Как реализовать проверку исчерпываемости (Exhaustiveness checking) для Discriminated Union?",
          explanation:
            "В ветке default оператора switch присвоить значение переменной типа never: const _exhaustive: never = value. Если в Union добавится новый вариант, компилятор выдаст ошибку TS2322.",
        },
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Topic 5: palindrome-check (Tier 2, x: 480, y: 400, Prereq: Topic 3)
  // ---------------------------------------------------------------------------
  const topicPalindrome = await prisma.topic.create({
    data: {
      slug: "palindrome-check",
      courseId: course.id,
      tierId: tier2.id,
      difficulty: Difficulty.BEGINNER,
      estimatedMinutes: 20,
      isPublished: true,
      isFreePreview: true,
      createdById: author.id,
      lastEditedById: author.id,
      translations: {
        create: {
          locale: "ru",
          title: "Алгоритм проверки палиндрома",
          summary:
            "Классическая задача на два указателя (Two Pointers Pattern). Оптимизация по времени $O(n)$ и памяти $O(1)$.",
          keyPoints: [
            "Паттерн двух указателей позволяет проверить строку без создания копий в памяти",
            "Временная сложность составляет $O(n/2) = O(n)$, пространственная — $O(1)$",
            "Решение устойчиво к длинным строкам и не нагружает сборщик мусора",
          ],
          pitfalls: [
            "Наивный подход str.split('').reverse().join('') выделяет O(n) лишней памяти в куче",
          ],
          description: `
# Алгоритм проверки палиндрома: Паттерн двух указателей

Проверка строки на палиндром (симметричность относительно центра) — классическая задача алгоритмических интервью, демонстрирующая паттерн **двух указателей (Two Pointers)**.

## 1. Анализ наивного решения

\`\`\`typescript
function isPalindromeNaive(str: string): boolean {
  return str === str.split("").reverse().join("");
}
\`\`\`

Недостатки:
- Создает промежуточный массив символов в куче.
- Требует $O(n)$ дополнительной памяти (Space Complexity).

## 2. Оптимальное решение с двумя указателями

Устанавливаем указатели \`left = 0\` и \`right = str.length - 1\` и сдвигаем их навстречу:

\`\`\`typescript
function isPalindrome(str: string): boolean {
  let left = 0;
  let right = str.length - 1;

  while (left < right) {
    if (str[left] !== str[right]) {
      return false;
    }
    left++;
    right--;
  }

  return true;
}
\`\`\`

- **Время работы**: $O(n/2) = O(n)$ — один проход до середины строки.
- **Память**: $O(1)$ — переменные хранятся на стеке, без аллокаций в куче.
          `.trim(),
        },
      },
    },
  });

  // Topic 5 Question: CODE with testCases (2 public, 1 hidden)
  await prisma.question.create({
    data: {
      topicId: topicPalindrome.id,
      type: QuestionType.CODE,
      gradingStrategy: GradingStrategy.CODE_TESTS,
      order: 1,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Напишите функцию isPalindrome(str: string): boolean, которая проверяет, является ли строка палиндромом (читается одинаково слева направо и справа налево). Регистр символов и пробелы учитываются.",
          gradingConfig: {
            codeTemplate:
              "function isPalindrome(str: string): boolean {\n  let left = 0;\n  let right = str.length - 1;\n  while (left < right) {\n    if (str[left] !== str[right]) {\n      return false;\n    }\n    left++;\n    right--;\n  }\n  return true;\n}",
            testCases: [
              {
                name: "Простой палиндром",
                input: ["racecar"],
                expected: true,
                description: "Слово 'racecar' читается одинаково с обоих концов",
                isHidden: false,
              },
              {
                name: "Не палиндром",
                input: ["notis"],
                expected: false,
                description: "Слово 'notis' не является палиндромом",
                isHidden: false,
              },
              {
                name: "Скрытый тест: одиночный символ",
                input: ["a"],
                expected: true,
                description: "Одиночный символ всегда палиндром",
                isHidden: true,
              },
            ],
          },
          explanation:
            "Паттерн двух указателей позволяет проверить палиндром за линейное время O(n) и строго константную память O(1) без создания промежуточных копий строк.",
        },
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Topic 6: conditional-types (Tier 3, Final, x: 300, y: 580, Prereqs: Topic 4 & 5)
  // ---------------------------------------------------------------------------
  const topicConditional = await prisma.topic.create({
    data: {
      slug: "conditional-types",
      courseId: course.id,
      tierId: tier3.id,
      difficulty: Difficulty.EXPERT,
      estimatedMinutes: 30,
      isPublished: true,
      isFreePreview: false,
      createdById: author.id,
      lastEditedById: author.id,
      translations: {
        create: {
          locale: "ru",
          title: "Условные типы и infer в TypeScript",
          summary:
            "Продвинутая мета-типизация: конструкция T extends U ? X : Y, вывод внутренних типов через infer, дистрибутивность условных типов.",
          keyPoints: [
            "Условные типы реализуют ветвление типов по отношению подтипов: T extends U ? X : Y",
            "Ключевое слово infer объявляет переменную вывода типа в условии extends",
            "Naked type parameter в условии автоматически дистрибутируется по элементам union-типа",
          ],
          pitfalls: [
            "Неожиданное распределение (distributivity) условного типа для union, если тип не обернут в кортеж [T]",
          ],
          description: `
# Условные типы и infer в TypeScript

Условные типы (Conditional Types) добавляют в систему типов TypeScript тернарный оператор отношения подтипов:

$$T \\text{ extends } U \\ ? \\ X \\ : \\ Y$$

Если тип $T$ совместим с типом $U$, вычисляется ветка $X$, иначе — ветка $Y$.

## 1. Вывод типов с помощью \`infer\`

Ключевое слово \`infer\` вводится исключительно внутри условия \`extends\` и объявляет типовую переменную, значение которой выводится компилятором автоматически:

\`\`\`typescript
// Извлечение типа элемента массива
type ElementType<T> = T extends (infer U)[] ? U : T;

// Извлечение типа возвращаемого значения функции
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Извлечение типа разрешенного промиса
type MyAwaited<T> = T extends Promise<infer V> ? MyAwaited<V> : T;
\`\`\`

## 2. Дистрибутивность условных типов

Когда проверяемый тип является «голым» типовым параметром, условный тип автоматически распределяется по объединению (Union):

\`\`\`typescript
type MyExclude<T, U> = T extends U ? never : T;

type Result = MyExclude<"a" | "b" | "c", "a">; // "b" | "c"
\`\`\`
          `.trim(),
        },
      },
    },
  });

  // Topic 6 Question: FLASHCARD
  await prisma.question.create({
    data: {
      topicId: topicConditional.id,
      type: QuestionType.FLASHCARD,
      gradingStrategy: GradingStrategy.SELF_ASSESSED,
      order: 1,
      correctAnswerIndexes: [],
      translations: {
        create: {
          locale: "ru",
          prompt:
            "Как работает ключевое слово infer в условных типах TypeScript?",
          explanation:
            "Ключевое слово infer объявляет переменную типа внутри условия extends, которую компилятор автоматически выводит из целевой структуры (например, возвращаемый тип функции или тип содержимого Promise).",
        },
      },
    },
  });

  // 6. Graph Edges (Prerequisites DAG)
  console.log("🔗 6. Связывание тем в ориентированный ациклический граф (DAG)...");
  await prisma.topicPrerequisite.createMany({
    data: [
      // Topic 2 requires Topic 1
      {
        topicId: topicStack.id,
        prerequisiteId: topicBits.id,
        type: DependencyType.REQUIRED,
        order: 1,
      },
      // Topic 3 requires Topic 1
      {
        topicId: topicBigO.id,
        prerequisiteId: topicBits.id,
        type: DependencyType.REQUIRED,
        order: 2,
      },
      // Topic 4 requires Topic 2
      {
        topicId: topicNarrowing.id,
        prerequisiteId: topicStack.id,
        type: DependencyType.REQUIRED,
        order: 3,
      },
      // Topic 5 requires Topic 3
      {
        topicId: topicPalindrome.id,
        prerequisiteId: topicBigO.id,
        type: DependencyType.REQUIRED,
        order: 4,
      },
      // Topic 6 requires Topic 4 AND Topic 5
      {
        topicId: topicConditional.id,
        prerequisiteId: topicNarrowing.id,
        type: DependencyType.REQUIRED,
        order: 5,
      },
      {
        topicId: topicConditional.id,
        prerequisiteId: topicPalindrome.id,
        type: DependencyType.REQUIRED,
        order: 6,
      },
    ],
  });

  // 7. Graph Node Positions (DefaultGraphLayout)
  console.log("📐 7. Настройка координат узлов на холсте роадмапа (DefaultGraphLayout)...");
  await prisma.defaultGraphLayout.createMany({
    data: [
      { courseId: course.id, topicId: topicBits.id, positionX: 300, positionY: 50 },
      { courseId: course.id, topicId: topicStack.id, positionX: 120, positionY: 220 },
      { courseId: course.id, topicId: topicBigO.id, positionX: 480, positionY: 220 },
      { courseId: course.id, topicId: topicNarrowing.id, positionX: 120, positionY: 400 },
      { courseId: course.id, topicId: topicPalindrome.id, positionX: 480, positionY: 400 },
      { courseId: course.id, topicId: topicConditional.id, positionX: 300, positionY: 580 },
    ],
  });

  // 8. Student Starter Progress & Spaced Repetition Queue
  console.log("🎓 8. Настройка стартового прогресса студента student@notis.dev...");
  // Active Enrollment
  await prisma.courseEnrollment.create({
    data: {
      userId: student.id,
      courseId: course.id,
      source: AccessSource.FREE,
      status: AccessStatus.ACTIVE,
      completedTopicsCount: 1,
    },
  });

  // Topic 1 Completed Progress
  await prisma.userProgress.create({
    data: {
      userId: student.id,
      topicId: topicBits.id,
      status: ProgressStatus.COMPLETED,
      startedAt: new Date(Date.now() - 3600 * 1000),
      completedAt: new Date(),
      timeSpentSeconds: 900,
      completedVersion: 1,
    },
  });

  // Topic 1 Quiz Attempts
  await prisma.userQuizAttempt.create({
    data: {
      userId: student.id,
      questionId: qBits1.id,
      selectedAnswer: 0,
      isCorrect: true,
      gradedAt: new Date(),
      locale: "ru",
    },
  });

  await prisma.userQuizAttempt.create({
    data: {
      userId: student.id,
      questionId: qBits2.id,
      selectedAnswer: "16",
      isCorrect: true,
      gradedAt: new Date(),
      locale: "ru",
    },
  });

  // Topic 1 Flashcards Enrolled in SM-2 Spaced Repetition with immediate reviewDueAt
  const now = new Date();
  await prisma.userQuestionReview.createMany({
    data: [
      {
        userId: student.id,
        questionId: qBits3.id,
        reviewDueAt: now,
        repetitionCount: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        lapseCount: 0,
        lastReviewedAt: new Date(Date.now() - 24 * 3600 * 1000),
      },
      {
        userId: student.id,
        questionId: qBits4.id,
        reviewDueAt: now,
        repetitionCount: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        lapseCount: 0,
        lastReviewedAt: new Date(Date.now() - 24 * 3600 * 1000),
      },
    ],
  });

  console.log("🎉 База данных Notis успешно наполнена!");
  console.log("------------------------------------------------------------");
  console.log("Доступные учетные записи (пароль для всех: password123):");
  console.log("  👑 Admin:   admin@notis.dev   (Александр)");
  console.log("  ✍️  Author:  author@notis.dev  (Елена)");
  console.log("  🎓 Student: student@notis.dev (Иван)");
  console.log("Курс: /courses/cs-foundations (6 тем, 3 тира, 5 типов вопросов)");
  console.log("------------------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка при выполнении seed-скрипта:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

