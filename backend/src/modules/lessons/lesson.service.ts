import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import { Role } from "@prisma/client";

const COMPLETION_PERCENT = 0.9;
const COMPLETION_END_BUFFER_SEC = 5;

const toIso = (value: Date | null): string | null => (value ? value.toISOString() : null);

const completionThresholdSec = (durationSec: number): number => {
  if (durationSec <= 0) return 0;
  const byPercent = Math.floor(durationSec * COMPLETION_PERCENT);
  const byEndBuffer = Math.max(0, durationSec - COMPLETION_END_BUFFER_SEC);
  return Math.max(byPercent, byEndBuffer);
};

const normalizePositionSec = (rawValue: number, durationSec: number): number => {
  const value = Math.max(0, Math.floor(Number(rawValue) || 0));
  if (durationSec <= 0) return value;
  return Math.min(value, durationSec);
};

const assertEnrollment = async (userId: string, courseId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === Role.ADMIN) return;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: {
      id: true,
    },
  });
  if (!enrollment) {
    throw new AppError("This course is not assigned to your account yet.", 403);
  }
};

const getAssignedCourses = async (userId: string) =>
  prisma.enrollment.findMany({
    where: {
      userId,
      course: {
        isActive: true,
      },
    },
    orderBy: [{ enrolledAt: "desc" }],
    select: {
      enrolledAt: true,
      course: {
        select: {
          id: true,
          title: true,
          isActive: true,
          _count: {
            select: { chapters: true },
          },
        },
      },
    },
  });

const mapLessonProgress = (
  progress:
    | {
        id: string;
        lastPositionSec: number;
        completed: boolean;
        completedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }
    | null
) =>
  progress
    ? {
        id: progress.id,
        lastPositionSec: progress.lastPositionSec,
        completed: progress.completed,
        completedAt: toIso(progress.completedAt),
        createdAt: progress.createdAt.toISOString(),
        updatedAt: progress.updatedAt.toISOString(),
      }
    : {
        id: null,
        lastPositionSec: 0,
        completed: false,
        completedAt: null,
        createdAt: null,
        updatedAt: null,
      };

const mapLessonOverview = (
  lesson: {
    id: string;
    title: string;
    orderIndex: number;
    videoUrl: string;
    transcriptUrl: string | null;
    transcriptText: string | null;
    transcriptSegments: unknown;
    audioUrl: string | null;
    audioDurationMs: number | null;
    durationSec: number;
    assessmentTestId: string | null;
    createdAt: Date;
    updatedAt: Date;
    progress: Array<{
      id: string;
      lastPositionSec: number;
      completed: boolean;
      completedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  },
  progress: {
    id: string | null;
    lastPositionSec: number;
    completed: boolean;
    completedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  },
  options?: {
    includeTranscriptContent?: boolean;
  }
) => ({
  id: lesson.id,
  title: lesson.title,
  orderIndex: lesson.orderIndex,
  videoUrl: lesson.videoUrl,
  transcriptUrl: lesson.transcriptUrl,
  audioUrl: lesson.audioUrl,
  audioDurationMs: lesson.audioDurationMs,
  durationSec: lesson.durationSec,
  assessmentTestId: lesson.assessmentTestId,
  assessmentLocked: Boolean(lesson.assessmentTestId && !progress.completed),
  createdAt: lesson.createdAt.toISOString(),
  updatedAt: lesson.updatedAt.toISOString(),
  ...(options?.includeTranscriptContent
    ? {
        transcriptText: lesson.transcriptText,
        transcriptSegments: lesson.transcriptSegments,
      }
    : {}),
  progress,
});

export const canStartTest = async (userId: string, testId: string) => {
  const linkedLessons = await prisma.lesson.findMany({
    where: {
      assessmentTestId: testId,
    },
    orderBy: [{ chapter: { orderIndex: "asc" } }, { orderIndex: "asc" }],
    select: {
      id: true,
      title: true,
      chapterId: true,
    },
  });

  if (!linkedLessons.length) {
    return { allowed: true as const };
  }

  const completedRows = await prisma.lessonProgress.findMany({
    where: {
      userId,
      lessonId: { in: linkedLessons.map((lesson) => lesson.id) },
      completed: true,
    },
    select: { lessonId: true },
  });

  const completedLessonIds = new Set(completedRows.map((row) => row.lessonId));
  const firstIncompleteLesson = linkedLessons.find((lesson) => !completedLessonIds.has(lesson.id));

  if (!firstIncompleteLesson) {
    return { allowed: true as const };
  }

  return {
    allowed: false as const,
    lessonId: firstIncompleteLesson.id,
    chapterId: firstIncompleteLesson.chapterId,
    lessonTitle: firstIncompleteLesson.title,
  };
};

export const lessonService = {
  async listAssignedCourses(userId: string) {
    const rows = await getAssignedCourses(userId);
    return rows.map((item) => ({
      id: item.course.id,
      title: item.course.title,
      isActive: item.course.isActive,
      chapterCount: item.course._count.chapters,
      enrolledAt: item.enrolledAt.toISOString(),
    }));
  },

  async getLessonForUser(userId: string, lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
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
        progress: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!lesson) {
      throw new AppError("Lesson not found", 404);
    }

    await assertEnrollment(userId, lesson.chapter.course.id);

    const progress = mapLessonProgress(lesson.progress[0] ?? null);
    const assignedCourses = await this.listAssignedCourses(userId);

    return {
      lesson: mapLessonOverview(lesson, progress, {
        includeTranscriptContent: true,
      }),
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
      assignedCourses,
      completionThresholdSec: completionThresholdSec(lesson.durationSec),
      assessmentUnlocked: Boolean(!lesson.assessmentTestId || progress.completed),
    };
  },

  async upsertLessonProgress(
    userId: string,
    lessonId: string,
    payload: {
      lastPositionSec: number;
      completed?: boolean;
    }
  ) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new AppError("Lesson not found", 404);
    }

    await assertEnrollment(userId, lesson.chapter.courseId);

    const nextPositionSec = normalizePositionSec(payload.lastPositionSec, lesson.durationSec);
    const autoCompleted =
      lesson.durationSec > 0 && nextPositionSec >= completionThresholdSec(lesson.durationSec);

    const existing = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    const nextCompleted = Boolean(existing?.completed || payload.completed || autoCompleted);
    const nextCompletedAt = nextCompleted ? existing?.completedAt ?? new Date() : null;

    const progress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        lastPositionSec: nextPositionSec,
        completed: nextCompleted,
        completedAt: nextCompletedAt,
      },
      create: {
        userId,
        lessonId,
        lastPositionSec: nextPositionSec,
        completed: nextCompleted,
        completedAt: nextCompletedAt,
      },
    });

    return {
      progress: mapLessonProgress(progress),
      completionThresholdSec: completionThresholdSec(lesson.durationSec),
      assessmentUnlocked: Boolean(!lesson.assessmentTestId || progress.completed),
    };
  },

  async getChapterOverview(userId: string, chapterId: string) {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            isActive: true,
          },
        },
        lessons: {
          orderBy: { orderIndex: "asc" },
          include: {
            progress: {
              where: { userId },
              take: 1,
            },
          },
        },
      },
    });

    if (!chapter) {
      throw new AppError("Chapter not found", 404);
    }

    await assertEnrollment(userId, chapter.course.id);
    const assignedCourses = await this.listAssignedCourses(userId);

    const lessons = chapter.lessons.map((lesson) => {
      const progress = mapLessonProgress(lesson.progress[0] ?? null);
      return mapLessonOverview(lesson, progress);
    });

    const completedCount = lessons.filter((lesson) => lesson.progress.completed).length;
    const nextLesson =
      lessons.find((lesson) => !lesson.progress.completed) ?? lessons[lessons.length - 1] ?? null;

    return {
      chapter: {
        id: chapter.id,
        title: chapter.title,
        orderIndex: chapter.orderIndex,
      },
      course: {
        id: chapter.course.id,
        title: chapter.course.title,
        isActive: chapter.course.isActive,
      },
      lessons,
      summary: {
        totalLessons: lessons.length,
        completedLessons: completedCount,
        completionPercent:
          lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0,
      },
      assignedCourses,
      nextLesson: nextLesson
        ? {
            id: nextLesson.id,
            title: nextLesson.title,
            orderIndex: nextLesson.orderIndex,
          }
        : null,
    };
  },

  async getDefaultChapterOverview(userId: string, courseId?: string | null) {
    const assignedCourses = await this.listAssignedCourses(userId);
    if (!assignedCourses.length) {
      throw new AppError("No course assigned to this student yet.", 404);
    }

    const selectedCourseId =
      courseId && assignedCourses.some((item) => item.id === courseId)
        ? courseId
        : assignedCourses[0]?.id;

    if (!selectedCourseId) {
      throw new AppError("No course assigned to this student yet.", 404);
    }

    const firstChapter = await prisma.chapter.findFirst({
      where: {
        courseId: selectedCourseId,
      },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    if (!firstChapter) {
      throw new AppError("No chapter available in assigned course yet.", 404);
    }

    return this.getChapterOverview(userId, firstChapter.id);
  },
};
