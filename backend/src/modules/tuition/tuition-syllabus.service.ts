import { Prisma, TuitionParseStatus } from "@prisma/client";
import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import { storeTuitionSyllabusFile } from "../../services/tuitionSyllabusStorage";
import { tuitionPlanService } from "./tuition-plan.service";
import { tuitionParserService } from "./tuition-parser.service";
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
    take: 1,
    select: {
      id: true,
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
  const latestSession = chapter.sessions[0] || null;
  const progress = chapter.progressRecords[0] || null;
  const plan = chapter.chapterPlans[0] || null;
  return {
    id: chapter.id,
    syllabusId: chapter.syllabusId,
    title: chapter.name,
    normalizedName: chapter.normalizedName,
    orderIndex: chapter.orderIndex,
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
      chapters: Array<{ name: string; orderIndex?: number | null }>;
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
      }))
      .filter((chapter) => chapter.name);

    if (!chapters.length) {
      throw new AppError("At least one syllabus chapter is required.", 400);
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
      include: {
        profile: {
          include: {
            board: true,
          },
        },
      },
    });

    const orderedChapters = [...chapters].sort((left, right) => left.orderIndex - right.orderIndex);

    await prisma.$transaction([
      prisma.tuitionSyllabusChapter.deleteMany({
        where: { syllabusId: syllabus.id },
      }),
      prisma.tuitionSyllabusChapter.createMany({
        data: orderedChapters.map((chapter, index) => ({
          syllabusId: syllabus.id,
          name: chapter.name,
          normalizedName: toNormalizedSlug(chapter.name) || `chapter-${index + 1}`,
          orderIndex: index + 1,
          sourceText: upload.ocrRawText || null,
          isIncluded: true,
        })),
      }),
      prisma.tuitionSyllabusUpload.update({
        where: { id: upload.id },
        data: { parseStatus: TuitionParseStatus.CONFIRMED },
      }),
      prisma.tuitionProfile.update({
        where: { id: upload.profileId },
        data: {
          activeSyllabusId: input.activate === false ? upload.profile.activeSyllabusId : syllabus.id,
        },
      }),
    ]);

    await tuitionPlanService.syncPlanForSyllabus({
      profileId: upload.profileId,
      syllabusId: syllabus.id,
      boardName: syllabus.profile.board?.name || null,
      classLevel: syllabus.classLevel,
    });

    return this.getUpload(userId, upload.id);
  },

  async listChapters(userId: string) {
    const profile = await tuitionProfileService.getOrCreateProfile(userId);
    if (!profile.activeSyllabusId) {
      return {
        profile: await tuitionProfileService.getProfile(userId),
        activeSyllabus: null,
        chapters: [],
      };
    }

    const chapters = await prisma.tuitionSyllabusChapter.findMany({
      where: {
        syllabusId: profile.activeSyllabusId,
        isIncluded: true,
      },
      orderBy: { orderIndex: "asc" },
      include: {
        ...chapterInclude,
        chapterPlans: {
          where: { profileId: profile.id },
        },
        progressRecords: {
          where: { userId },
        },
        sessions: {
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            updatedAt: true,
            speedMode: true,
            difficultyMode: true,
            responseLanguage: true,
          },
        },
      },
    });

    return {
      profile: await tuitionProfileService.getProfile(userId),
      activeSyllabus: {
        id: profile.activeSyllabusId,
        title: profile.activeSyllabus?.title || null,
      },
      chapters: chapters.map(serializeChapter),
    };
  },

  async getChapter(userId: string, chapterId: string) {
    const chapter = await prisma.tuitionSyllabusChapter.findFirst({
      where: {
        id: chapterId,
        syllabus: {
          userId,
        },
      },
      include: {
        ...chapterInclude,
        chapterPlans: true,
        progressRecords: {
          where: { userId },
        },
        sessions: {
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            updatedAt: true,
            speedMode: true,
            difficultyMode: true,
            responseLanguage: true,
          },
        },
      },
    });

    if (!chapter) {
      throw new AppError("Tuition chapter was not found.", 404);
    }

    const serialized = serializeChapter(chapter as ChapterRecord);
    return {
      ...serialized,
      recentSessions: chapter.sessions,
    };
  },

  async resolveOwnedChapter(userId: string, chapterId: string) {
    return resolveOwnedChapter(userId, chapterId);
  },

  async getPhaseStatus() {
    return {
      phase: "phase-2",
      storage: "enabled",
      parsing: "manual-review-enabled",
      ocr: "not-configured",
    };
  },
};
