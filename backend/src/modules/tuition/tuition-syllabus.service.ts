import { Prisma, TuitionParseStatus } from "@prisma/client";
import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import { storeTuitionSyllabusFile } from "../../services/tuitionSyllabusStorage";
import { tuitionPlanService } from "./tuition-plan.service";
import { tuitionParserService } from "./tuition-parser.service";
import { tuitionProgressService } from "./tuition-progress.service";
import { tuitionProfileService } from "./tuition-profile.service";

const chapterInclude = {
  syllabus: {
    select: {
      id: true,
      title: true,
      isConfirmed: true,
      updatedAt: true,
    },
  },
  chapterPlans: true,
  progressRecords: true,
  sessions: {
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      speedMode: true,
      difficultyMode: true,
      responseLanguage: true,
    },
  },
} satisfies Prisma.TuitionSyllabusChapterInclude;

const uploadInclude = {
  profile: {
    include: {
      board: true,
      subject: true,
    },
  },
  syllabus: {
    include: {
      chapters: {
        orderBy: { orderIndex: "asc" },
      },
    },
  },
} satisfies Prisma.TuitionSyllabusUploadInclude;

type UploadRecord = Prisma.TuitionSyllabusUploadGetPayload<{
  include: typeof uploadInclude;
}>;

type ChapterRecord = Prisma.TuitionSyllabusChapterGetPayload<{
  include: typeof chapterInclude;
}>;

const normalizeText = (value: string | null | undefined): string =>
  String(value || "").replace(/\s+/g, " ").trim();

const normalizeChapterName = (value: string): string =>
  normalizeText(value)
    .replace(/^[\s\-*•\d.)]+/, "")
    .trim();

const toNormalizedSlug = (value: string): string =>
  normalizeChapterName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseWarningsToArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];

const serializeUpload = (upload: UploadRecord) => ({
  id: upload.id,
  sourceType: upload.sourceType,
  fileName: upload.fileName,
  mimeType: upload.mimeType,
  fileUrl: upload.fileUrl,
  parseStatus: upload.parseStatus,
  parseWarnings: parseWarningsToArray(upload.parseWarnings),
  rawText: upload.ocrRawText || "",
  createdAt: upload.createdAt,
  updatedAt: upload.updatedAt,
  syllabus: upload.syllabus
    ? {
        id: upload.syllabus.id,
        title: upload.syllabus.title,
        isConfirmed: upload.syllabus.isConfirmed,
        includedChapterCount: upload.syllabus.chapters.filter((chapter) => chapter.isIncluded).length,
        chapters: upload.syllabus.chapters.map((chapter) => ({
          id: chapter.id,
          name: chapter.name,
          normalizedName: chapter.normalizedName,
          orderIndex: chapter.orderIndex,
          isIncluded: chapter.isIncluded,
        })),
      }
    : null,
});

const serializeChapter = (chapter: ChapterRecord) => {
  const normalizedChapterTitle = normalizeText(chapter.name).toLowerCase();
  const latestSession =
    chapter.sessions.find((session) => normalizeText(session.title).toLowerCase() === normalizedChapterTitle) ||
    chapter.sessions[0] ||
    null;
  const progress = chapter.progressRecords[0] || null;
  const plan = chapter.chapterPlans[0] || null;
  const recommendedOrder = plan?.recommendedOrder || chapter.orderIndex;
  const canResume =
    latestSession?.status === "ACTIVE" || latestSession?.status === "PAUSED" || Boolean(progress?.lastSessionId);
  return {
    id: chapter.id,
    syllabusId: chapter.syllabusId,
    title: chapter.name,
    normalizedName: chapter.normalizedName,
    orderIndex: chapter.orderIndex,
    recommendedOrder,
    isIncluded: chapter.isIncluded,
    sourceText: chapter.sourceText || null,
    syllabusTitle: chapter.syllabus.title,
    syllabusConfirmed: chapter.syllabus.isConfirmed,
    plan: plan
      ? {
          id: plan.id,
          goalSummary: plan.goalSummary,
          estimatedSessions: plan.estimatedSessions,
          recommendedOrder: plan.recommendedOrder,
        }
      : null,
    progress: progress
      ? {
          id: progress.id,
          status: progress.status,
          completionPercent: progress.completionPercent,
          lastSessionId: progress.lastSessionId,
          lastStudiedAt: progress.lastStudiedAt,
          progressLabel:
            progress.status === "COMPLETED"
              ? "Completed"
              : progress.status === "IN_PROGRESS"
                ? "In Progress"
                : "Not Started",
        }
      : null,
    latestSession: latestSession
      ? {
          id: latestSession.id,
          status: latestSession.status,
          updatedAt: latestSession.updatedAt,
          speedMode: latestSession.speedMode,
          difficultyMode: latestSession.difficultyMode,
          responseLanguage: latestSession.responseLanguage,
        }
      : null,
    action: {
      label: canResume ? "Resume Session" : "Start Session",
      sessionId: latestSession?.id || progress?.lastSessionId || null,
      canResume,
    },
  };
};

const resolveOwnedUpload = async (userId: string, uploadId: string): Promise<UploadRecord> => {
  const upload = await prisma.tuitionSyllabusUpload.findFirst({
    where: { id: uploadId, userId },
    include: uploadInclude,
  });

  if (!upload) {
    throw new AppError("Tuition syllabus upload was not found.", 404);
  }

  return upload;
};

const resolveOwnedChapter = async (userId: string, chapterId: string): Promise<ChapterRecord> => {
  const chapter = await prisma.tuitionSyllabusChapter.findFirst({
    where: {
      id: chapterId,
      syllabus: {
        userId,
      },
    },
    include: chapterInclude,
  });

  if (!chapter) {
    throw new AppError("Tuition chapter was not found.", 404);
  }

  return chapter;
};

export const tuitionSyllabusService = {
  resolveOwnedChapter,

  async createUpload(
    userId: string,
    input: {
      sourceType: string;
      fileName: string;
      mimeType: string;
      fileBase64: string;
    }
  ) {
    const profile = await tuitionProfileService.getOrCreateProfile(userId);
    const stored = await storeTuitionSyllabusFile(input);

    const upload = await prisma.tuitionSyllabusUpload.create({
      data: {
        userId,
        profileId: profile.id,
        sourceType: input.sourceType,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileUrl: stored.fileUrl,
        parseStatus: TuitionParseStatus.UPLOADED,
      },
      include: uploadInclude,
    });

    return serializeUpload(upload);
  },

  async getUpload(userId: string, uploadId: string) {
    const upload = await resolveOwnedUpload(userId, uploadId);
    return serializeUpload(upload);
  },

  async parseUpload(
    userId: string,
    uploadId: string,
    input: {
      title?: string | null;
      manualText?: string | null;
      chapterNames?: string[];
    }
  ) {
    const upload = await resolveOwnedUpload(userId, uploadId);

    await prisma.tuitionSyllabusUpload.update({
      where: { id: upload.id },
      data: { parseStatus: TuitionParseStatus.PROCESSING },
    });

    const draft = await tuitionParserService.parseDraft({
      fileName: upload.fileName,
      title: input.title,
      manualText: input.manualText,
      chapterNames: input.chapterNames,
    });

    const status =
      draft.status === "FAILED"
        ? TuitionParseStatus.FAILED
        : draft.status === "PARSED"
          ? TuitionParseStatus.PARSED
          : TuitionParseStatus.NEEDS_REVIEW;

    const syllabus = await prisma.tuitionSyllabus.upsert({
      where: { uploadId: upload.id },
      update: {
        title: draft.title,
        boardId: upload.profile.boardId,
        classLevel: upload.profile.classLevel,
        subjectId: upload.profile.subjectId,
        isConfirmed: false,
      },
      create: {
        userId,
        profileId: upload.profileId,
        uploadId: upload.id,
        title: draft.title,
        boardId: upload.profile.boardId,
        classLevel: upload.profile.classLevel,
        subjectId: upload.profile.subjectId,
        isConfirmed: false,
      },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.tuitionSyllabusChapter.deleteMany({
        where: { syllabusId: syllabus.id },
      }),
      prisma.tuitionSyllabusChapter.createMany({
        data: draft.chapters.map((chapter) => ({
          syllabusId: syllabus.id,
          name: chapter.name,
          normalizedName: chapter.normalizedName,
          orderIndex: chapter.orderIndex,
          sourceText: chapter.sourceText,
          isIncluded: true,
        })),
      }),
      prisma.tuitionSyllabusUpload.update({
        where: { id: upload.id },
        data: {
          parseStatus: status,
          ocrRawText: draft.rawText || null,
          parseWarnings: draft.warnings,
        },
      }),
    ]);

    return this.getUpload(userId, upload.id);
  },

  async reviewUpload(
    userId: string,
    uploadId: string,
    input: {
      title: string;
      chapters: Array<{ name: string; orderIndex?: number | null; isIncluded?: boolean | null }>;
      activate?: boolean;
    }
  ) {
    const upload = await resolveOwnedUpload(userId, uploadId);
    const title = normalizeText(input.title);
    if (!title) {
      throw new AppError("Syllabus title is required.", 400);
    }

    const chapters = input.chapters
      .map((chapter, index) => ({
        name: normalizeChapterName(chapter.name),
        orderIndex: chapter.orderIndex && chapter.orderIndex > 0 ? chapter.orderIndex : index + 1,
        isIncluded: chapter.isIncluded !== false,
      }))
      .filter((chapter) => chapter.name);

    if (!chapters.length) {
      throw new AppError("At least one syllabus chapter is required.", 400);
    }

    if (!chapters.some((chapter) => chapter.isIncluded)) {
      throw new AppError("Include at least one chapter before confirming the syllabus.", 400);
    }

    const syllabus = await prisma.tuitionSyllabus.upsert({
      where: { uploadId: upload.id },
      update: {
        title,
        boardId: upload.profile.boardId,
        classLevel: upload.profile.classLevel,
        subjectId: upload.profile.subjectId,
        isConfirmed: true,
      },
      create: {
        userId,
        profileId: upload.profileId,
        uploadId: upload.id,
        title,
        boardId: upload.profile.boardId,
        classLevel: upload.profile.classLevel,
        subjectId: upload.profile.subjectId,
        isConfirmed: true,
      },
      select: {
        id: true,
        profileId: true,
        board: {
          select: {
            name: true,
          },
        },
        classLevel: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.tuitionSyllabusChapter.deleteMany({
        where: { syllabusId: syllabus.id },
      });

      await tx.tuitionSyllabusChapter.createMany({
        data: chapters.map((chapter, index) => ({
          syllabusId: syllabus.id,
          name: chapter.name,
          normalizedName: toNormalizedSlug(chapter.name) || `chapter-${index + 1}`,
          orderIndex: chapter.orderIndex,
          sourceText: null,
          isIncluded: chapter.isIncluded,
        })),
      });

      await tx.tuitionSyllabusUpload.update({
        where: { id: upload.id },
        data: {
          parseStatus: TuitionParseStatus.CONFIRMED,
        },
      });

      if (input.activate !== false) {
        await tx.tuitionProfile.update({
          where: { id: upload.profileId },
          data: { activeSyllabusId: syllabus.id },
        });
      }
    });

    await tuitionPlanService.syncPlanForSyllabus({
      profileId: syllabus.profileId,
      syllabusId: syllabus.id,
      boardName: syllabus.board?.name || null,
      classLevel: syllabus.classLevel,
      subjectName: upload.profile.subject?.name || null,
    });
    await tuitionProgressService.syncForSyllabus(userId, syllabus.id);

    return this.getUpload(userId, upload.id);
  },

  async listChapters(userId: string) {
    const profile = await tuitionProfileService.getOrCreateProfile(userId);

    const activeSyllabusId = profile.activeSyllabusId
      ? profile.activeSyllabusId
      : (
          await prisma.tuitionSyllabus.findFirst({
            where: { profileId: profile.id, isConfirmed: true },
            orderBy: { updatedAt: "desc" },
            select: { id: true, title: true },
          })
        )?.id || null;

    if (!activeSyllabusId) {
      return {
        activeSyllabus: null,
        chapters: [],
      };
    }

    if (profile.activeSyllabusId !== activeSyllabusId) {
      await prisma.tuitionProfile.update({
        where: { id: profile.id },
        data: { activeSyllabusId },
      });
    }

    const activeSyllabus = await prisma.tuitionSyllabus.findUnique({
      where: { id: activeSyllabusId },
      select: {
        id: true,
        title: true,
        isConfirmed: true,
        updatedAt: true,
      },
    });

    const chapters = await prisma.tuitionSyllabusChapter.findMany({
      where: {
        syllabusId: activeSyllabusId,
        isIncluded: true,
      },
      orderBy: { orderIndex: "asc" },
      include: {
        ...chapterInclude,
        progressRecords: {
          where: { userId },
        },
      },
    });

    const progressSummary = await tuitionProgressService.summarizeForSyllabus(userId, activeSyllabusId);
    const serializedChapters = chapters
      .map(serializeChapter)
      .sort((left, right) => {
        if (left.recommendedOrder !== right.recommendedOrder) {
          return left.recommendedOrder - right.recommendedOrder;
        }
        return left.orderIndex - right.orderIndex;
      });

    return {
      activeSyllabus: activeSyllabus
        ? {
            ...activeSyllabus,
            progressSummary,
          }
        : null,
      chapters: serializedChapters,
    };
  },

  async getChapter(userId: string, chapterId: string) {
    const ownedChapter = await resolveOwnedChapter(userId, chapterId);
    await tuitionProgressService.ensureChapterProgress(userId, ownedChapter.id);

    const chapter = await prisma.tuitionSyllabusChapter.findFirst({
      where: {
        id: chapterId,
        syllabus: {
          userId,
        },
      },
      include: {
        ...chapterInclude,
        progressRecords: {
          where: { userId },
        },
      },
    });

    if (!chapter) {
      throw new AppError("Tuition chapter was not found.", 404);
    }

    return serializeChapter(chapter);
  },
};
