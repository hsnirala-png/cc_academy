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

  async markSessionStarted(userId: string, syllabusChapterId: string, sessionId: string) {
    const progress = await prisma.tuitionProgress.upsert({
      where: {
        userId_syllabusChapterId: {
          userId,
          syllabusChapterId,
        },
      },
      update: {
        status: TuitionProgressStatus.IN_PROGRESS,
        lastSessionId: sessionId,
        lastStudiedAt: new Date(),
        completionPercent: {
          increment: 5,
        },
      },
      create: {
        userId,
        syllabusChapterId,
        status: TuitionProgressStatus.IN_PROGRESS,
        completionPercent: 5,
        lastSessionId: sessionId,
        lastStudiedAt: new Date(),
      },
    });

    if (progress.completionPercent > 100) {
      const normalized = await prisma.tuitionProgress.update({
        where: { id: progress.id },
        data: { completionPercent: 100 },
      });
      return serializeProgress(normalized);
    }

    return serializeProgress(progress);
  },

  async bumpForMessage(userId: string, syllabusChapterId: string, sessionId: string) {
    const current = await prisma.tuitionProgress.findUnique({
      where: {
        userId_syllabusChapterId: {
          userId,
          syllabusChapterId,
        },
      },
    });

    const nextPercent = clampPercent((current?.completionPercent || 0) + 12);
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

  async getPhaseStatus() {
    return {
      phase: "phase-2",
      progressTracking: "enabled",
    };
  },
};
