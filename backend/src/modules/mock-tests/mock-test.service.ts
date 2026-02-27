import {
  AttemptStatus,
  ExamType,
  MockOption,
  MockSubject,
  Prisma,
  StreamChoice,
} from "@prisma/client";
import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import {
  ensureStudentCodeForUser,
  ensureStudentCodesForUsers,
  getUserIdByStudentCode,
  isStudentCode,
} from "../students/student-id.utils";
import { calculateAttemptScore } from "./mock-test.scoring";
import { getRequiredQuestionCount, validateMockTestRule } from "./mock-test.rules";

type LanguageMode = "PUNJABI" | "ENGLISH" | "HINDI";
type AccessCode = "DEMO" | "MOCK" | "LESSON";
type MockTestSectionType =
  | "COMPREHENSION"
  | "GENERAL_MCQ"
  | "GRAMMAR"
  | "MATH_FORMULA"
  | "SCIENCE_EQUATION"
  | "CUSTOM";

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy;
};

const toIso = (date: Date | null): string | null => (date ? date.toISOString() : null);

const normalizeLessonAssetUrl = (value: string | null | undefined): string | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
  if (raw.startsWith("/public/")) return raw;
  if (raw.startsWith("/audio/") || raw.startsWith("/transcripts/")) return `/public${raw}`;
  if (raw.startsWith("./public/")) return `/${raw.slice(2)}`;
  if (raw.startsWith("public/")) return `/${raw}`;
  if (raw.startsWith("./")) return `/${raw.slice(2)}`;
  if (raw.startsWith("/")) return raw;
  return `/${raw}`;
};

const resolveRequiredQuestions = (subject: MockSubject, activeQuestionCount: number): number => {
  const safeActiveCount = Math.max(0, Math.floor(Number(activeQuestionCount) || 0));
  if (safeActiveCount <= 0) return 0;
  return Math.min(getRequiredQuestionCount(subject), safeActiveCount);
};

const normalizeAccessCode = (value: unknown): AccessCode => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (normalized === "MOCK" || normalized === "LESSON") return normalized;
  return "DEMO";
};

const normalizeSectionLabel = (value: unknown): string | null => {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, 120) : null;
};

const normalizeSectionType = (value: unknown): MockTestSectionType => {
  const normalized = String(value || "").trim().toUpperCase();
  if (
    [
      "COMPREHENSION",
      "GENERAL_MCQ",
      "GRAMMAR",
      "MATH_FORMULA",
      "SCIENCE_EQUATION",
      "CUSTOM",
    ].includes(normalized)
  ) {
    return normalized as MockTestSectionType;
  }
  return "GENERAL_MCQ";
};

const loadMockTestAccessMap = async (mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Map<string, AccessCode>();
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        mt.id AS mockTestId,
        (
          SELECT mar.accessCode
          FROM MockTestAccessRule mar
          WHERE mar.mockTestId = mt.id
          ORDER BY mar.updatedAt DESC, mar.createdAt DESC
          LIMIT 1
        ) AS accessCode
      FROM MockTest mt
      WHERE mt.id IN (${placeholders})
    `,
    ...mockTestIds
  )) as Array<{ mockTestId: string; accessCode: string | null }>;
  return new Map(rows.map((row) => [row.mockTestId, normalizeAccessCode(row.accessCode)]));
};

const upsertMockTestAccessCode = async (mockTestId: string, accessCode: AccessCode) => {
  const now = new Date();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO MockTestAccessRule (mockTestId, accessCode, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        accessCode = VALUES(accessCode),
        updatedAt = VALUES(updatedAt)
    `,
    mockTestId,
    accessCode,
    now,
    now
  );

  // Keep product demo linkage aligned with current access code:
  // any test marked DEMO should appear as free in product TOC.
  try {
    if (accessCode === "DEMO") {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO ProductDemoMockTest (productId, mockTestId, createdAt)
          SELECT pmt.productId, pmt.mockTestId, ?
          FROM ProductMockTest pmt
          WHERE pmt.mockTestId = ?
          ON DUPLICATE KEY UPDATE
            createdAt = ProductDemoMockTest.createdAt
        `,
        now,
        mockTestId
      );
      return;
    }

    await prisma.$executeRawUnsafe(
      `
        DELETE FROM ProductDemoMockTest
        WHERE mockTestId = ?
      `,
      mockTestId
    );
  } catch (error) {
    const message = String((error as { message?: string })?.message || "").toLowerCase();
    const missingDemoLinkTable =
      (message.includes("1146") || message.includes("p2010")) &&
      message.includes("productdemomocktest");
    if (!missingDemoLinkTable) throw error;
  }
};

const loadLinkedProductCountMap = async (mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Map<string, number>();
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT mockTestId, COUNT(*) AS productCount
      FROM ProductMockTest
      WHERE mockTestId IN (${placeholders})
      GROUP BY mockTestId
    `,
    ...mockTestIds
  )) as Array<{ mockTestId: string; productCount: number | string }>;
  return new Map(rows.map((row) => [row.mockTestId, Number(row.productCount || 0)]));
};

const loadUserAccessibleProductMockTests = async (userId: string, mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Set<string>();
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT DISTINCT pmt.mockTestId
      FROM ProductMockTest pmt
      WHERE pmt.mockTestId IN (${placeholders})
        AND pmt.productId IN (
          SELECT pp.productId FROM ProductPurchase pp WHERE pp.userId = ?
          UNION
          SELECT spa.productId FROM StudentProductAccess spa WHERE spa.userId = ?
        )
    `,
    ...mockTestIds,
    userId,
    userId
  )) as Array<{ mockTestId: string }>;
  return new Set(rows.map((row) => row.mockTestId));
};

const loadDemoLinkedMockTests = async (mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Set<string>();
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT DISTINCT pdmt.mockTestId
      FROM ProductDemoMockTest pdmt
      WHERE pdmt.mockTestId IN (${placeholders})
    `,
    ...mockTestIds
  )) as Array<{ mockTestId: string }>;
  return new Set(rows.map((row) => row.mockTestId));
};

const loadUserLessonEntitledMockTests = async (userId: string, mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Set<string>();
  const placeholders = mockTestIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT DISTINCT l.assessmentTestId AS mockTestId
      FROM Enrollment e
      INNER JOIN Chapter c ON c.courseId = e.courseId
      INNER JOIN Lesson l ON l.chapterId = c.id
      WHERE e.userId = ?
        AND l.assessmentTestId IS NOT NULL
        AND l.assessmentTestId IN (${placeholders})
    `,
    userId,
    ...mockTestIds
  )) as Array<{ mockTestId: string }>;
  return new Set(rows.map((row) => row.mockTestId));
};

const canUserAccessMockTest = (
  accessCode: AccessCode,
  mockTestId: string,
  demoEntitled: Set<string>,
  productEntitled: Set<string>,
  lessonEntitled: Set<string>
) => {
  if (accessCode === "DEMO") return true;
  if (demoEntitled.has(mockTestId)) return true;
  if (productEntitled.has(mockTestId)) return true;
  if (accessCode === "LESSON" && lessonEntitled.has(mockTestId)) return true;
  return false;
};

const serializeMockTest = (item: {
  id: string;
  title: string;
  examType: ExamType;
  subject: MockSubject;
  streamChoice: StreamChoice | null;
  languageMode: LanguageMode | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  accessCode?: AccessCode;
  linkedProductCount?: number;
  _count?: { questions: number };
}) => ({
  ...item,
  accessCode: normalizeAccessCode(item.accessCode),
  linkedProductCount: Math.max(0, Number(item.linkedProductCount || 0)),
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

const serializeMockTestWithCounts = (
  item: {
    id: string;
    title: string;
    examType: ExamType;
    subject: MockSubject;
    streamChoice: StreamChoice | null;
    languageMode: LanguageMode | null;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    accessCode?: AccessCode;
    linkedProductCount?: number;
    _count?: { questions: number };
  },
  activeQuestionCount: number
) => {
  const activeQuestions = Math.max(0, Math.floor(Number(activeQuestionCount) || 0));
  return {
    ...serializeMockTest(item),
    activeQuestions,
    requiredQuestions: resolveRequiredQuestions(item.subject, activeQuestions),
  };
};

const buildActiveQuestionCountMap = async (mockTestIds: string[]) => {
  if (!mockTestIds.length) return new Map<string, number>();
  const grouped = await prisma.question.groupBy({
    by: ["mockTestId"],
    where: {
      mockTestId: { in: mockTestIds },
      isActive: true,
    },
    _count: {
      _all: true,
    },
  });
  return new Map(grouped.map((item) => [item.mockTestId, Number(item._count?._all || 0)]));
};

const serializeQuestion = (item: {
  id: string;
  mockTestId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: MockOption;
  explanation: string | null;
  sectionLabel: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...item,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

const serializeMockTestSection = (item: {
  id: string;
  mockTestId: string;
  sectionLabel: string;
  sectionType: string;
  transcriptText: string | null;
  audioUrl: string | null;
  questionLimit: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...item,
  sectionType: normalizeSectionType(item.sectionType),
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

type AdminAttemptFilters = {
  examType?: ExamType;
  subject?: MockSubject;
  studentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minScore?: number;
};

const buildAttemptWhere = (filters: AdminAttemptFilters): Prisma.AttemptWhereInput => {
  const where: Prisma.AttemptWhereInput = {};

  if (filters.studentId) {
    where.userId = filters.studentId;
  }

  if (filters.examType || filters.subject) {
    where.mockTest = {
      examType: filters.examType,
      subject: filters.subject,
    };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.startedAt = {};
    if (filters.dateFrom) {
      where.startedAt.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      where.startedAt.lte = filters.dateTo;
    }
  }

  if (typeof filters.minScore === "number") {
    where.scorePercent = { gte: filters.minScore };
  }

  return where;
};

const resolveStudentFilterUserId = async (studentIdOrCode?: string): Promise<string | undefined> => {
  const normalized = String(studentIdOrCode || "").trim();
  if (!normalized) return undefined;
  if (isStudentCode(normalized)) {
    const userId = await getUserIdByStudentCode(normalized);
    return userId || "__no_matching_student__";
  }
  return normalized;
};

const ensureMockTestExists = async (mockTestId: string) => {
  const mockTest = await prisma.mockTest.findUnique({
    where: { id: mockTestId },
  });
  if (!mockTest) {
    throw new AppError("Mock test not found", 404);
  }
  return mockTest;
};

const ensureQuestionLimitForSection = async (input: {
  mockTestId: string;
  sectionLabel: string | null;
  incomingCount: number;
  excludeQuestionId?: string;
}) => {
  const normalizedLabel = normalizeSectionLabel(input.sectionLabel);
  if (!normalizedLabel) return;
  const incomingCount = Math.max(1, Math.floor(Number(input.incomingCount) || 1));
  const section = await prisma.mockTestSection.findFirst({
    where: {
      mockTestId: input.mockTestId,
      sectionLabel: normalizedLabel,
      isActive: true,
    },
  });
  if (!section || Number(section.questionLimit || 0) <= 0) return;
  const existingCount = await prisma.question.count({
    where: {
      mockTestId: input.mockTestId,
      sectionLabel: normalizedLabel,
      isActive: true,
      ...(input.excludeQuestionId
        ? {
            NOT: { id: input.excludeQuestionId },
          }
        : {}),
    },
  });
  if (existingCount + incomingCount > section.questionLimit) {
    throw new AppError(
      `Section "${normalizedLabel}" question limit exceeded (${existingCount}/${section.questionLimit}).`,
      409
    );
  }
};

const ensureAttemptOwner = async (attemptId: string, userId: string) => {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      mockTest: true,
    },
  });

  if (!attempt) {
    throw new AppError("Attempt not found", 404);
  }

  if (attempt.userId !== userId) {
    throw new AppError("Forbidden", 403);
  }

  return attempt;
};

const isAttemptTimedOut = (attempt: {
  status: AttemptStatus;
  totalQuestions: number;
  startedAt: Date;
}) => {
  if (attempt.status !== AttemptStatus.IN_PROGRESS) return false;
  const allottedSeconds = Math.max(0, Number(attempt.totalQuestions || 0)) * 60;
  if (allottedSeconds <= 0) return true;
  return Date.now() - attempt.startedAt.getTime() >= allottedSeconds * 1000;
};

const submitTimedOutAttemptIfNeeded = async <T extends { id: string; status: AttemptStatus; totalQuestions: number; startedAt: Date }>(
  userId: string,
  attempt: T
) => {
  if (!isAttemptTimedOut(attempt)) return attempt;
  try {
    await mockTestService.submitAttempt(userId, attempt.id);
  } catch (error) {
    const message =
      error instanceof AppError ? error.message : String((error as { message?: string })?.message || "");
    if (!message.toLowerCase().includes("already submitted")) {
      throw error;
    }
  }
  return ensureAttemptOwner(attempt.id, userId);
};

const fetchAttemptDetails = async (attemptId: string) => {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          mobile: true,
        },
      },
      mockTest: {
        select: {
          id: true,
          title: true,
          examType: true,
          subject: true,
          streamChoice: true,
          languageMode: true,
        },
      },
      attemptQuestions: {
        orderBy: { orderIndex: "asc" },
        include: {
          question: true,
        },
      },
      answers: true,
    },
  });

  if (!attempt) {
    throw new AppError("Attempt not found", 404);
  }

  const studentCode = await ensureStudentCodeForUser(attempt.user.id);

  const answerMap = new Map(attempt.answers.map((item) => [item.questionId, item]));
  const questions = attempt.attemptQuestions.map((item) => {
    const answer = answerMap.get(item.questionId);
    return {
      orderIndex: item.orderIndex,
      questionId: item.question.id,
      questionText: item.question.questionText,
      optionA: item.question.optionA,
      optionB: item.question.optionB,
      optionC: item.question.optionC,
      optionD: item.question.optionD,
      correctOption: item.question.correctOption,
      selectedOption: answer?.selectedOption ?? null,
      answeredAt: toIso(answer?.answeredAt ?? null),
      explanation: item.question.explanation,
    };
  });

  return {
    ...attempt,
    user: {
      ...attempt.user,
      studentCode,
    },
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: toIso(attempt.submittedAt),
    questions,
  };
};

const assertStudentCanAccessMockTest = async (userId: string, mockTestId: string) => {
  const accessMap = await loadMockTestAccessMap([mockTestId]);
  const accessCode = accessMap.get(mockTestId) || "DEMO";
  if (accessCode === "DEMO") return accessCode;

  const [demoEntitledSet, productEntitledSet, lessonEntitledSet] = await Promise.all([
    loadDemoLinkedMockTests([mockTestId]),
    loadUserAccessibleProductMockTests(userId, [mockTestId]),
    loadUserLessonEntitledMockTests(userId, [mockTestId]),
  ]);
  const allowed = canUserAccessMockTest(
    accessCode,
    mockTestId,
    demoEntitledSet,
    productEntitledSet,
    lessonEntitledSet
  );

  if (!allowed) {
    throw new AppError(
      accessCode === "LESSON"
        ? "This lesson test is locked. Buy linked product or get assignment from admin."
        : "This mock test is locked. Buy linked product or get assignment from admin.",
      403
    );
  }

  return accessCode;
};

export const mockTestService = {
  async listMockTests() {
    const tests = await prisma.mockTest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    const testIds = tests.map((item) => item.id);
    const [activeCountMap, accessMap, linkedProductCountMap] = await Promise.all([
      buildActiveQuestionCountMap(testIds),
      loadMockTestAccessMap(testIds),
      loadLinkedProductCountMap(testIds),
    ]);

    return tests.map((item) =>
      serializeMockTestWithCounts(
        {
          ...item,
          accessCode: accessMap.get(item.id) || "DEMO",
          linkedProductCount: linkedProductCountMap.get(item.id) || 0,
        },
        activeCountMap.get(item.id) || 0
      )
    );
  },

  async createMockTest(input: {
    title: string;
    examType: ExamType;
    subject: MockSubject;
    streamChoice?: StreamChoice | null;
    languageMode?: LanguageMode | null;
    accessCode?: AccessCode;
    isActive?: boolean;
    createdBy: string;
  }) {
    validateMockTestRule(input.examType, input.subject, input.streamChoice, input.languageMode);

    const created = await prisma.mockTest.create({
      data: {
        title: input.title,
        examType: input.examType,
        subject: input.subject,
        streamChoice: input.streamChoice,
        languageMode: input.languageMode,
        isActive: input.isActive ?? true,
        createdBy: input.createdBy,
      },
    });

    await upsertMockTestAccessCode(created.id, normalizeAccessCode(input.accessCode));

    return this.getMockTestById(created.id);
  },

  async getMockTestById(mockTestId: string) {
    const mockTest = await prisma.mockTest.findUnique({
      where: { id: mockTestId },
      include: {
        _count: {
          select: { questions: true, attempts: true },
        },
      },
    });
    if (!mockTest) {
      throw new AppError("Mock test not found", 404);
    }

    const activeCount = await prisma.question.count({
      where: {
        mockTestId,
        isActive: true,
      },
    });

    const [accessMap, linkedProductCountMap] = await Promise.all([
      loadMockTestAccessMap([mockTestId]),
      loadLinkedProductCountMap([mockTestId]),
    ]);

    return serializeMockTestWithCounts(
      {
        ...mockTest,
        accessCode: accessMap.get(mockTestId) || "DEMO",
        linkedProductCount: linkedProductCountMap.get(mockTestId) || 0,
      },
      activeCount
    );
  },

  async updateMockTest(
    mockTestId: string,
    updates: Partial<{
      title: string;
      examType: ExamType;
      subject: MockSubject;
      streamChoice?: StreamChoice | null;
      languageMode?: LanguageMode | null;
      accessCode: AccessCode;
      isActive: boolean;
    }>
  ) {
    const existing = await ensureMockTestExists(mockTestId);
    const nextExamType = updates.examType ?? existing.examType;
    const nextSubject = updates.subject ?? existing.subject;
    const nextStreamChoice =
      updates.streamChoice === undefined ? existing.streamChoice : updates.streamChoice;
    const nextLanguageMode =
      updates.languageMode === undefined ? existing.languageMode : updates.languageMode;

    validateMockTestRule(nextExamType, nextSubject, nextStreamChoice, nextLanguageMode);

    const updated = await prisma.mockTest.update({
      where: { id: mockTestId },
      data: {
        title: updates.title,
        examType: updates.examType,
        subject: updates.subject,
        streamChoice: updates.streamChoice,
        languageMode: updates.languageMode,
        isActive: updates.isActive,
      },
    });

    if (updates.accessCode !== undefined) {
      await upsertMockTestAccessCode(updated.id, normalizeAccessCode(updates.accessCode));
    }

    return this.getMockTestById(updated.id);
  },

  async deleteMockTest(mockTestId: string) {
    try {
      await prisma.mockTest.delete({ where: { id: mockTestId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new AppError(
          "Mock test has attempts history and cannot be deleted. Set it inactive instead.",
          409
        );
      }
      throw error;
    }
  },

  async listSections(mockTestId: string) {
    await ensureMockTestExists(mockTestId);
    const sections = await prisma.mockTestSection.findMany({
      where: { mockTestId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return sections.map(serializeMockTestSection);
  },

  async createSection(
    mockTestId: string,
    input: {
      sectionLabel: string;
      sectionType?: MockTestSectionType;
      transcriptText?: string;
      audioUrl?: string;
      questionLimit?: number;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) {
    await ensureMockTestExists(mockTestId);
    const sectionLabel = normalizeSectionLabel(input.sectionLabel);
    if (!sectionLabel) {
      throw new AppError("Section label is required.", 400);
    }
    const sectionType = normalizeSectionType(input.sectionType);
    const section = await prisma.mockTestSection.upsert({
      where: {
        mockTestId_sectionLabel: {
          mockTestId,
          sectionLabel,
        },
      },
      create: {
        mockTestId,
        sectionLabel,
        sectionType,
        transcriptText: input.transcriptText?.trim() || null,
        audioUrl: normalizeLessonAssetUrl(input.audioUrl) || null,
        questionLimit: Math.max(1, Math.floor(Number(input.questionLimit || 10))),
        sortOrder: Math.max(0, Math.floor(Number(input.sortOrder || 0))),
        isActive: input.isActive ?? true,
      },
      update: {
        sectionType,
        transcriptText: input.transcriptText?.trim() || null,
        audioUrl: normalizeLessonAssetUrl(input.audioUrl) || null,
        questionLimit: Math.max(1, Math.floor(Number(input.questionLimit || 10))),
        sortOrder: Math.max(0, Math.floor(Number(input.sortOrder || 0))),
        isActive: input.isActive ?? true,
      },
    });
    return serializeMockTestSection(section);
  },

  async updateSection(
    sectionId: string,
    updates: Partial<{
      sectionLabel: string;
      sectionType: MockTestSectionType;
      transcriptText?: string;
      audioUrl?: string;
      questionLimit: number;
      sortOrder: number;
      isActive: boolean;
    }>
  ) {
    const existing = await prisma.mockTestSection.findUnique({
      where: { id: sectionId },
    });
    if (!existing) {
      throw new AppError("Section not found", 404);
    }
    const nextLabel =
      updates.sectionLabel === undefined
        ? existing.sectionLabel
        : normalizeSectionLabel(updates.sectionLabel);
    if (!nextLabel) {
      throw new AppError("Section label is required", 400);
    }

    const updated = await prisma.mockTestSection.update({
      where: { id: sectionId },
      data: {
        sectionLabel: nextLabel,
        sectionType:
          updates.sectionType === undefined
            ? undefined
            : normalizeSectionType(updates.sectionType),
        transcriptText:
          updates.transcriptText === undefined ? undefined : updates.transcriptText?.trim() || null,
        audioUrl:
          updates.audioUrl === undefined ? undefined : normalizeLessonAssetUrl(updates.audioUrl) || null,
        questionLimit:
          updates.questionLimit === undefined
            ? undefined
            : Math.max(1, Math.floor(Number(updates.questionLimit || 1))),
        sortOrder:
          updates.sortOrder === undefined
            ? undefined
            : Math.max(0, Math.floor(Number(updates.sortOrder || 0))),
        isActive: updates.isActive,
      },
    });

    return serializeMockTestSection(updated);
  },

  async deleteSection(sectionId: string) {
    await prisma.mockTestSection.delete({
      where: { id: sectionId },
    });
  },

  async listQuestions(mockTestId: string) {
    await ensureMockTestExists(mockTestId);
    const questions = await prisma.question.findMany({
      where: { mockTestId },
      orderBy: { createdAt: "asc" },
    });

    return questions.map(serializeQuestion);
  },

  async createQuestion(
    mockTestId: string,
    input: {
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: MockOption;
      explanation?: string;
      sectionLabel?: string;
      isActive?: boolean;
    }
  ) {
    await ensureMockTestExists(mockTestId);
    const normalizedSectionLabel = normalizeSectionLabel(input.sectionLabel);
    await ensureQuestionLimitForSection({
      mockTestId,
      sectionLabel: normalizedSectionLabel,
      incomingCount: 1,
    });
    const question = await prisma.question.create({
      data: {
        mockTestId,
        questionText: input.questionText,
        optionA: input.optionA,
        optionB: input.optionB,
        optionC: input.optionC,
        optionD: input.optionD,
        correctOption: input.correctOption,
        explanation: input.explanation,
        sectionLabel: normalizedSectionLabel,
        isActive: input.isActive ?? true,
      },
    });

    return serializeQuestion(question);
  },

  async bulkImportQuestions(
    mockTestId: string,
    rows: Array<{
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: MockOption;
      explanation?: string;
      sectionLabel?: string;
      isActive?: boolean;
    }>,
    options?: {
      replaceExisting?: boolean;
    }
  ) {
    await ensureMockTestExists(mockTestId);
    const replaceExisting = Boolean(options?.replaceExisting);

    const payload = rows.map((row) => ({
      mockTestId,
      questionText: row.questionText.trim(),
      optionA: row.optionA.trim(),
      optionB: row.optionB.trim(),
      optionC: row.optionC.trim(),
      optionD: row.optionD.trim(),
      correctOption: row.correctOption,
      explanation: row.explanation?.trim() || null,
      sectionLabel: normalizeSectionLabel(row.sectionLabel),
      isActive: row.isActive ?? true,
    }));

    const result = await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        const attemptsBoundToTest = await tx.attempt.count({
          where: { mockTestId },
        });
        if (attemptsBoundToTest > 0) {
          throw new AppError(
            "Cannot replace existing questions because attempts already exist for this test.",
            409
          );
        }

        await tx.question.deleteMany({
          where: { mockTestId },
        });
      }

      const incomingSectionCounts = new Map<string, number>();
      payload.forEach((row) => {
        const label = normalizeSectionLabel(row.sectionLabel);
        if (!label) return;
        incomingSectionCounts.set(label, Number(incomingSectionCounts.get(label) || 0) + 1);
      });

      const limitedSections = await tx.mockTestSection.findMany({
        where: {
          mockTestId,
          isActive: true,
          questionLimit: { gt: 0 },
          sectionLabel: { in: Array.from(incomingSectionCounts.keys()) },
        },
      });
      if (limitedSections.length) {
        const existingBySection = replaceExisting
          ? new Map<string, number>()
          : new Map(
              (
                await tx.question.groupBy({
                  by: ["sectionLabel"],
                  where: {
                    mockTestId,
                    isActive: true,
                    sectionLabel: { in: limitedSections.map((item) => item.sectionLabel) },
                  },
                  _count: { _all: true },
                })
              ).map((row) => [String(row.sectionLabel || ""), Number(row._count?._all || 0)])
            );
        for (const section of limitedSections) {
          const incoming = Number(incomingSectionCounts.get(section.sectionLabel) || 0);
          if (!incoming) continue;
          const existing = Number(existingBySection.get(section.sectionLabel) || 0);
          if (existing + incoming > section.questionLimit) {
            throw new AppError(
              `Section "${section.sectionLabel}" question limit exceeded (${existing}/${section.questionLimit}).`,
              409
            );
          }
        }
      }

      const created = await tx.question.createMany({
        data: payload,
      });

      return {
        createdCount: created.count,
      };
    });

    return {
      totalRows: rows.length,
      createdCount: result.createdCount,
      replaceExisting,
    };
  },

  async updateQuestion(
    questionId: string,
    updates: Partial<{
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctOption: MockOption;
      explanation?: string;
      sectionLabel?: string;
      isActive: boolean;
    }>
  ) {
    const existing = await prisma.question.findUnique({ where: { id: questionId } });
    if (!existing) {
      throw new AppError("Question not found", 404);
    }
    const nextSectionLabel =
      updates.sectionLabel === undefined ? existing.sectionLabel : normalizeSectionLabel(updates.sectionLabel);
    const nextIsActive = updates.isActive === undefined ? existing.isActive : updates.isActive;
    if (nextIsActive && nextSectionLabel) {
      await ensureQuestionLimitForSection({
        mockTestId: existing.mockTestId,
        sectionLabel: nextSectionLabel,
        incomingCount: 1,
        excludeQuestionId: questionId,
      });
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: {
        questionText: updates.questionText,
        optionA: updates.optionA,
        optionB: updates.optionB,
        optionC: updates.optionC,
        optionD: updates.optionD,
        correctOption: updates.correctOption,
        explanation: updates.explanation,
        sectionLabel: updates.sectionLabel === undefined ? undefined : nextSectionLabel,
        isActive: updates.isActive,
      },
    });

    return serializeQuestion(updated);
  },

  async deleteQuestion(questionId: string) {
    try {
      await prisma.question.delete({ where: { id: questionId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new AppError(
          "Question is part of existing attempts and cannot be deleted. Set it inactive instead.",
          409
        );
      }
      throw error;
    }
  },

  async listAttempts(filters: AdminAttemptFilters) {
    const resolvedStudentUserId = await resolveStudentFilterUserId(filters.studentId);
    const where = buildAttemptWhere({
      ...filters,
      studentId: resolvedStudentUserId,
    });
    const attempts = await prisma.attempt.findMany({
      where,
      orderBy: { startedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
        mockTest: {
          select: {
            id: true,
            title: true,
            examType: true,
            subject: true,
            streamChoice: true,
            languageMode: true,
          },
        },
      },
    });

    const studentCodeMap = await ensureStudentCodesForUsers(attempts.map((item) => item.user.id));

    return attempts.map((item) => ({
      ...item,
      user: {
        ...item.user,
        studentCode: studentCodeMap.get(item.user.id) || null,
      },
      startedAt: item.startedAt.toISOString(),
      submittedAt: toIso(item.submittedAt),
    }));
  },

  async getAttemptDetails(attemptId: string) {
    return fetchAttemptDetails(attemptId);
  },

  async listStudentMockTests(input: {
    userId: string;
    examType: ExamType;
    subject: MockSubject;
    streamChoice?: StreamChoice;
    languageMode?: LanguageMode | null;
  }) {
    validateMockTestRule(input.examType, input.subject, input.streamChoice, input.languageMode, {
      allowStreamOnCommonSubjects: true,
      allowMissingLanguageMode: true,
    });

    const requiresStream =
      input.examType === ExamType.PSTET_2 && getRequiredQuestionCount(input.subject) === 60;
    const streamChoice = requiresStream ? input.streamChoice : null;
    const isNonLanguageSubject =
      input.subject !== MockSubject.PUNJABI && input.subject !== MockSubject.ENGLISH;
    const languageMode = isNonLanguageSubject ? input.languageMode ?? undefined : null;

    const mockTests = await prisma.mockTest.findMany({
      where: {
        examType: input.examType,
        subject: input.subject,
        streamChoice,
        ...(isNonLanguageSubject
          ? languageMode
            ? { languageMode }
            : {}
          : { languageMode: null }),
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    const mockTestIds = mockTests.map((item) => item.id);
    const [activeCountMap, accessMap, linkedProductCountMap, demoEntitledSet, productEntitledSet, lessonEntitledSet] =
      await Promise.all([
        buildActiveQuestionCountMap(mockTestIds),
        loadMockTestAccessMap(mockTestIds),
        loadLinkedProductCountMap(mockTestIds),
        loadDemoLinkedMockTests(mockTestIds),
        loadUserAccessibleProductMockTests(input.userId, mockTestIds),
        loadUserLessonEntitledMockTests(input.userId, mockTestIds),
      ]);

    return mockTests
      .filter((item) => {
        const accessCode = accessMap.get(item.id) || "DEMO";
        return canUserAccessMockTest(
          accessCode,
          item.id,
          demoEntitledSet,
          productEntitledSet,
          lessonEntitledSet
        );
      })
      .map((item) =>
        serializeMockTestWithCounts(
          {
            ...item,
            accessCode: accessMap.get(item.id) || "DEMO",
            linkedProductCount: linkedProductCountMap.get(item.id) || 0,
          },
          activeCountMap.get(item.id) || 0
        )
      );
  },

  async startAttempt(userId: string, mockTestId: string) {
    const mockTest = await prisma.mockTest.findUnique({
      where: { id: mockTestId },
    });

    if (!mockTest || !mockTest.isActive) {
      throw new AppError("Mock test is not available", 404);
    }

    validateMockTestRule(mockTest.examType, mockTest.subject, mockTest.streamChoice, mockTest.languageMode, {
      allowMissingLanguageMode: true,
    });
    await assertStudentCanAccessMockTest(userId, mockTest.id);

    const existingAttempt = await prisma.attempt.findFirst({
      where: {
        userId,
        mockTestId: mockTest.id,
        status: AttemptStatus.IN_PROGRESS,
      },
      orderBy: { startedAt: "desc" },
    });

    if (existingAttempt && !isAttemptTimedOut(existingAttempt)) {
      return {
        ...existingAttempt,
        startedAt: existingAttempt.startedAt.toISOString(),
        submittedAt: toIso(existingAttempt.submittedAt),
      };
    }

    if (existingAttempt && isAttemptTimedOut(existingAttempt)) {
      await submitTimedOutAttemptIfNeeded(userId, existingAttempt);
    }

    const questionPool = await prisma.question.findMany({
      where: {
        mockTestId: mockTest.id,
        isActive: true,
      },
      select: { id: true },
    });
    const requiredQuestions = resolveRequiredQuestions(mockTest.subject, questionPool.length);

    if (requiredQuestions < 1) {
      throw new AppError(
        "No active questions are available for this test.",
        400
      );
    }

    const selected = shuffle(questionPool).slice(0, requiredQuestions);

    const attempt = await prisma.$transaction(async (tx) => {
      const createdAttempt = await tx.attempt.create({
        data: {
          userId,
          mockTestId: mockTest.id,
          totalQuestions: requiredQuestions,
          status: AttemptStatus.IN_PROGRESS,
        },
      });

      await tx.attemptQuestion.createMany({
        data: selected.map((question, index) => ({
          attemptId: createdAttempt.id,
          questionId: question.id,
          orderIndex: index + 1,
        })),
      });

      return createdAttempt;
    });

    return {
      ...attempt,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: toIso(attempt.submittedAt),
    };
  },

  async getStudentAttemptMeta(userId: string, attemptId: string) {
    let attempt = await ensureAttemptOwner(attemptId, userId);
    attempt = await submitTimedOutAttemptIfNeeded(userId, attempt);

    const answeredCount = await prisma.attemptAnswer.count({
      where: { attemptId },
    });

    return {
      ...attempt,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: toIso(attempt.submittedAt),
      answeredCount,
    };
  },

  async getStudentAttemptQuestions(userId: string, attemptId: string) {
    let attempt = await ensureAttemptOwner(attemptId, userId);
    attempt = await submitTimedOutAttemptIfNeeded(userId, attempt);

    const attemptQuestions = await prisma.attemptQuestion.findMany({
      where: { attemptId },
      orderBy: { orderIndex: "asc" },
      include: {
        question: true,
      },
    });

    const answers = await prisma.attemptAnswer.findMany({
      where: { attemptId },
    });
    const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
    const isSubmitted = attempt.status === AttemptStatus.SUBMITTED;

    return attemptQuestions.map((item) => {
      const answer = answerMap.get(item.questionId);
      return {
        orderIndex: item.orderIndex,
        questionId: item.question.id,
        questionText: item.question.questionText,
        optionA: item.question.optionA,
        optionB: item.question.optionB,
        optionC: item.question.optionC,
        optionD: item.question.optionD,
        selectedOption: answer?.selectedOption ?? null,
        answeredAt: toIso(answer?.answeredAt ?? null),
        correctOption: isSubmitted ? item.question.correctOption : undefined,
        explanation: isSubmitted ? item.question.explanation : undefined,
      };
    });
  },

  async saveAttemptAnswer(
    userId: string,
    attemptId: string,
    payload: {
      questionId: string;
      selectedOption: MockOption;
    }
  ) {
    let attempt = await ensureAttemptOwner(attemptId, userId);
    attempt = await submitTimedOutAttemptIfNeeded(userId, attempt);
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new AppError("Time is over. Attempt already submitted.", 400);
    }

    const questionExistsInAttempt = await prisma.attemptQuestion.findUnique({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: payload.questionId,
        },
      },
    });

    if (!questionExistsInAttempt) {
      throw new AppError("Question does not belong to this attempt", 400);
    }

    const answer = await prisma.attemptAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId: payload.questionId,
        },
      },
      update: {
        selectedOption: payload.selectedOption,
        answeredAt: new Date(),
      },
      create: {
        attemptId,
        questionId: payload.questionId,
        selectedOption: payload.selectedOption,
      },
    });

    return {
      ...answer,
      answeredAt: answer.answeredAt.toISOString(),
    };
  },

  async submitAttempt(userId: string, attemptId: string) {
    const result = await prisma.$transaction(async (tx) => {
      const attempt = await tx.attempt.findUnique({
        where: { id: attemptId },
        include: {
          attemptQuestions: {
            include: {
              question: {
                select: {
                  id: true,
                  correctOption: true,
                },
              },
            },
          },
        },
      });

      if (!attempt) {
        throw new AppError("Attempt not found", 404);
      }

      if (attempt.userId !== userId) {
        throw new AppError("Forbidden", 403);
      }

      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new AppError("Attempt already submitted", 400);
      }

      const answers = await tx.attemptAnswer.findMany({
        where: { attemptId },
      });

      const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.selectedOption]));
      let correctCount = 0;

      attempt.attemptQuestions.forEach((attemptQuestion) => {
        const selected = answerMap.get(attemptQuestion.questionId);
        if (selected && selected === attemptQuestion.question.correctOption) {
          correctCount += 1;
        }
      });

      const scored = calculateAttemptScore(correctCount, attempt.totalQuestions);

      return tx.attempt.update({
        where: { id: attempt.id },
        data: {
          status: AttemptStatus.SUBMITTED,
          correctCount: scored.correctCount,
          scorePercent: scored.scorePercent,
          remarkText: scored.remarkText,
          submittedAt: new Date(),
        },
      });
    });

    return {
      ...result,
      startedAt: result.startedAt.toISOString(),
      submittedAt: toIso(result.submittedAt),
    };
  },

  async listStudentHistory(userId: string) {
    const attempts = await prisma.attempt.findMany({
      where: {
        userId,
        status: AttemptStatus.SUBMITTED,
      },
      orderBy: { submittedAt: "desc" },
      include: {
        mockTest: {
          select: {
            id: true,
            title: true,
            examType: true,
            subject: true,
            streamChoice: true,
            languageMode: true,
          },
        },
      },
    });

    return attempts.map((item) => ({
      ...item,
      startedAt: item.startedAt.toISOString(),
      submittedAt: toIso(item.submittedAt),
    }));
  },

  async getStudentHistoryDetail(userId: string, attemptId: string) {
    const attempt = await ensureAttemptOwner(attemptId, userId);
    if (attempt.status !== AttemptStatus.SUBMITTED) {
      throw new AppError("Attempt is not submitted yet", 400);
    }

    return fetchAttemptDetails(attemptId);
  },

  async getLessonContextForMockTest(mockTestId: string, userId?: string) {
    const lessons = await prisma.lesson.findMany({
      where: {
        assessmentTestId: mockTestId,
      },
      orderBy: [{ chapter: { orderIndex: "asc" } }, { orderIndex: "asc" }],
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            orderIndex: true,
            course: {
              select: {
                id: true,
                title: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!lessons.length) return null;
    const [accessMap, demoEntitledSet, enrollments] = await Promise.all([
      loadMockTestAccessMap([mockTestId]),
      loadDemoLinkedMockTests([mockTestId]),
      userId
        ? prisma.enrollment.findMany({
            where: {
              userId,
              courseId: {
                in: Array.from(new Set(lessons.map((lesson) => lesson.chapter.course.id))),
              },
            },
            select: {
              courseId: true,
            },
          })
        : Promise.resolve([] as Array<{ courseId: string }>),
    ]);
    const accessCode = accessMap.get(mockTestId) || "DEMO";
    const isDemoLessonContext = accessCode === "DEMO" || demoEntitledSet.has(mockTestId);
    const enrolledCourseIds = new Set(enrollments.map((row) => row.courseId));
    const eligibleLessons = isDemoLessonContext
      ? lessons
      : lessons.filter((lesson) => enrolledCourseIds.has(lesson.chapter.course.id));

    if (!eligibleLessons.length) return null;

    const scoreLesson = (lesson: (typeof eligibleLessons)[number]) => {
      let score = 0;
      const hasAudio = Boolean(normalizeLessonAssetUrl(lesson.audioUrl));
      const hasVideo = Boolean(normalizeLessonAssetUrl(lesson.videoUrl));
      const hasTranscript = Boolean(
        normalizeLessonAssetUrl(lesson.transcriptUrl) ||
          String(lesson.transcriptText || "").trim() ||
          (Array.isArray(lesson.transcriptSegments) && lesson.transcriptSegments.length)
      );

      if (lesson.chapter.course.isActive) score += 8;
      if (hasAudio) score += 100;
      if (hasVideo) score += 40;
      if (hasTranscript) score += 20;
      if (Number(lesson.audioDurationMs || 0) > 0) score += 10;
      if (Number(lesson.durationSec || 0) > 0) score += 4;
      return score;
    };

    const lesson = eligibleLessons
      .map((item, index) => ({ item, score: scoreLesson(item), index }))
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        return left.index - right.index;
      })[0].item;

    return {
      id: lesson.id,
      title: lesson.title,
      orderIndex: lesson.orderIndex,
      durationSec: lesson.durationSec,
      videoUrl: normalizeLessonAssetUrl(lesson.videoUrl),
      audioUrl: normalizeLessonAssetUrl(lesson.audioUrl),
      audioDurationMs: lesson.audioDurationMs,
      transcriptUrl: normalizeLessonAssetUrl(lesson.transcriptUrl),
      transcriptText: lesson.transcriptText,
      transcriptSegments: lesson.transcriptSegments,
      chapter: {
        id: lesson.chapter.id,
        title: lesson.chapter.title,
        orderIndex: lesson.chapter.orderIndex,
      },
      course: {
        id: lesson.chapter.course.id,
        title: lesson.chapter.course.title,
        isActive: lesson.chapter.course.isActive,
      },
      createdAt: lesson.createdAt.toISOString(),
      updatedAt: lesson.updatedAt.toISOString(),
    };
  },
};
