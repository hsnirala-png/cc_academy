import { TuitionProgressStatus } from "@prisma/client";
import { prisma } from "../../utils/prisma";

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const serializeProgress = (progress: {
  id: string;
  status: TuitionProgressStatus;
  completionPercent: number;
  lastSessionId: string | null;
  lastStudiedAt: Date | null;
  updatedAt?: Date;
}) => ({
  id: progress.id,
  status: progress.status,
  completionPercent: progress.completionPercent,
  lastSessionId: progress.lastSessionId,
  lastStudiedAt: progress.lastStudiedAt,
  updatedAt: progress.updatedAt,
});

const computePercentFromSessionActivity = (messageCount: number, currentPercent = 0): number => {
  const next = 18 + messageCount * 14;
  return clampPercent(Math.max(currentPercent, next));
};

export const tuitionProgressService = {
  async getChapterProgress(userId: string, syllabusChapterId: string) {
    const progress = await prisma.tuitionProgress.findUnique({
      where: {
        userId_syllabusChapterId: {
          userId,
          syllabusChapterId,
        },
      },
    });

    return progress ? serializeProgress(progress) : null;
  },

  async syncForSyllabus(userId: string, syllabusId: string) {
    const chapters = await prisma.tuitionSyllabusChapter.findMany({
      where: {
        syllabusId,
        isIncluded: true,
      },
      orderBy: { orderIndex: "asc" },
      select: { id: true },
    });

    const chapterIds = chapters.map((chapter) => chapter.id);

    if (!chapterIds.length) {
      await prisma.tuitionProgress.deleteMany({
        where: {
          userId,
          syllabusChapter: {
            syllabusId,
          },
        },
      });
      return [];
    }

    await prisma.tuitionProgress.deleteMany({
      where: {
        userId,
        syllabusChapter: {
          syllabusId,
        },
        syllabusChapterId: {
          notIn: chapterIds,
        },
      },
    });

    await prisma.tuitionProgress.createMany({
      data: chapterIds.map((syllabusChapterId) => ({
        userId,
        syllabusChapterId,
        status: TuitionProgressStatus.NOT_STARTED,
        completionPercent: 0,
      })),
      skipDuplicates: true,
    });

    const progressRecords = await prisma.tuitionProgress.findMany({
      where: {
        userId,
        syllabusChapterId: {
          in: chapterIds,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return progressRecords.map(serializeProgress);
  },

  async markSessionStarted(userId: string, syllabusChapterId: string, sessionId: string) {
    const current = await prisma.tuitionProgress.findUnique({
      where: {
        userId_syllabusChapterId: {
          userId,
          syllabusChapterId,
        },
      },
    });

    const nextPercent =
      current?.status === TuitionProgressStatus.COMPLETED
        ? 100
        : clampPercent(Math.max(current?.completionPercent || 0, 10));

    const nextStatus =
      nextPercent >= 100 ? TuitionProgressStatus.COMPLETED : TuitionProgressStatus.IN_PROGRESS;

    const progress = await prisma.tuitionProgress.upsert({
      where: {
        userId_syllabusChapterId: {
          userId,
          syllabusChapterId,
        },
      },
      update: {
        status: nextStatus,
        lastSessionId: sessionId,
        lastStudiedAt: new Date(),
        completionPercent: nextPercent,
      },
      create: {
        userId,
        syllabusChapterId,
        status: nextStatus,
        completionPercent: nextPercent,
        lastSessionId: sessionId,
        lastStudiedAt: new Date(),
      },
    });

    return serializeProgress(progress);
  },

  async bumpForMessage(userId: string, syllabusChapterId: string, sessionId: string) {
    const [current, messageCount] = await Promise.all([
      prisma.tuitionProgress.findUnique({
        where: {
          userId_syllabusChapterId: {
            userId,
            syllabusChapterId,
          },
        },
      }),
      prisma.tuitionMessage.count({
        where: { sessionId },
      }),
    ]);

    const nextPercent = computePercentFromSessionActivity(messageCount, current?.completionPercent || 0);
    const nextStatus =
      nextPercent >= 100 ? TuitionProgressStatus.COMPLETED : TuitionProgressStatus.IN_PROGRESS;

    const updated = await prisma.tuitionProgress.upsert({
      where: {
        userId_syllabusChapterId: {
          userId,
          syllabusChapterId,
        },
      },
      update: {
        status: nextStatus,
        completionPercent: nextPercent,
        lastSessionId: sessionId,
        lastStudiedAt: new Date(),
      },
      create: {
        userId,
        syllabusChapterId,
        status: nextStatus,
        completionPercent: nextPercent,
        lastSessionId: sessionId,
        lastStudiedAt: new Date(),
      },
    });

    return serializeProgress(updated);
  },

  async bumpForHomeworkSubmission(userId: string, syllabusChapterId: string) {
    const current = await prisma.tuitionProgress.findUnique({
      where: {
        userId_syllabusChapterId: {
          userId,
          syllabusChapterId,
        },
      },
    });

    const nextPercent = clampPercent(
      Math.max(current?.completionPercent || 0, (current?.completionPercent || 0) + 16)
    );
    const nextStatus =
      nextPercent >= 100 ? TuitionProgressStatus.COMPLETED : TuitionProgressStatus.IN_PROGRESS;

    const updated = await prisma.tuitionProgress.upsert({
      where: {
        userId_syllabusChapterId: {
          userId,
          syllabusChapterId,
        },
      },
      update: {
        status: nextStatus,
        completionPercent: nextPercent,
        lastStudiedAt: new Date(),
      },
      create: {
        userId,
        syllabusChapterId,
        status: nextStatus,
        completionPercent: nextPercent,
        lastStudiedAt: new Date(),
      },
    });

    return serializeProgress(updated);
  },

  async summarizeForSyllabus(userId: string, syllabusId: string) {
    const records = await prisma.tuitionProgress.findMany({
      where: {
        userId,
        syllabusChapter: {
          syllabusId,
          isIncluded: true,
        },
      },
      orderBy: [{ lastStudiedAt: "desc" }, { updatedAt: "desc" }],
    });

    const completedCount = records.filter(
      (item) => item.status === TuitionProgressStatus.COMPLETED || item.completionPercent >= 100
    ).length;

    return {
      totalChapters: records.length,
      completedChapters: completedCount,
      averageCompletionPercent: records.length
        ? clampPercent(
            records.reduce((sum, item) => sum + Number(item.completionPercent || 0), 0) / records.length
          )
        : 0,
      lastStudiedAt: records[0]?.lastStudiedAt || null,
    };
  },

  formatProgressUpdate(progress: {
    status: TuitionProgressStatus;
    completionPercent: number;
  } | null) {
    if (!progress) return null;
    if (progress.status === TuitionProgressStatus.COMPLETED || progress.completionPercent >= 100) {
      return "This chapter is now marked complete.";
    }
    if (progress.completionPercent >= 75) {
      return `Chapter progress is now ${progress.completionPercent}%. One more focused revision can finish it.`;
    }
    if (progress.completionPercent >= 40) {
      return `Chapter progress is now ${progress.completionPercent}%. Continue with another short explanation or practice step.`;
    }
    return `Chapter progress started at ${progress.completionPercent}%. Keep the discussion focused on the current concept.`;
  },

  async ensureChapterProgress(userId: string, syllabusChapterId: string) {
    const current = await prisma.tuitionProgress.findUnique({
      where: {
        userId_syllabusChapterId: {
          userId,
          syllabusChapterId,
        },
      },
    });

    const updated = await prisma.tuitionProgress.upsert({
      where: {
        userId_syllabusChapterId: {
          userId,
          syllabusChapterId,
        },
      },
      update: {
        status: current?.status || TuitionProgressStatus.NOT_STARTED,
      },
      create: {
        userId,
        syllabusChapterId,
        status: TuitionProgressStatus.NOT_STARTED,
        completionPercent: 0,
      },
    });

    return serializeProgress(updated);
  },
};
