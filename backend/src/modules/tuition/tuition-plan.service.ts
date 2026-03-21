import { prisma } from "../../utils/prisma";

const buildGoalSummary = (chapterName: string, context: { boardName?: string | null; classLevel?: number | null }) => {
  const boardLabel = context.boardName ? `${context.boardName} ` : "";
  const classLabel = context.classLevel ? `Class ${context.classLevel}` : "school";
  return `Build strong ${boardLabel}${classLabel} understanding for ${chapterName} through concept explanation, worked examples, and short practice.`;
};

export const tuitionPlanService = {
  async syncPlanForSyllabus(input: {
    profileId: string;
    syllabusId: string;
    boardName?: string | null;
    classLevel?: number | null;
  }) {
    const chapters = await prisma.tuitionSyllabusChapter.findMany({
      where: { syllabusId: input.syllabusId, isIncluded: true },
      orderBy: { orderIndex: "asc" },
      select: {
        id: true,
        name: true,
        orderIndex: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      const chapterIds = chapters.map((chapter) => chapter.id);
      await tx.tuitionChapterPlan.deleteMany({
        where: {
          profileId: input.profileId,
          syllabusChapter: {
            syllabusId: input.syllabusId,
          },
          ...(chapterIds.length ? { syllabusChapterId: { notIn: chapterIds } } : {}),
        },
      });

      for (const chapter of chapters) {
        await tx.tuitionChapterPlan.upsert({
          where: {
            profileId_syllabusChapterId: {
              profileId: input.profileId,
              syllabusChapterId: chapter.id,
            },
          },
          update: {
            recommendedOrder: chapter.orderIndex,
            goalSummary: buildGoalSummary(chapter.name, input),
            estimatedSessions: 2,
          },
          create: {
            profileId: input.profileId,
            syllabusChapterId: chapter.id,
            recommendedOrder: chapter.orderIndex,
            estimatedSessions: 2,
            goalSummary: buildGoalSummary(chapter.name, input),
          },
        });
      }
    });

    return this.getPlanForSyllabus(input.profileId, input.syllabusId);
  },

  async getPlanForSyllabus(profileId: string, syllabusId: string) {
    const plans = await prisma.tuitionChapterPlan.findMany({
      where: {
        profileId,
        syllabusChapter: {
          syllabusId,
        },
      },
      orderBy: { recommendedOrder: "asc" },
      include: {
        syllabusChapter: {
          select: {
            id: true,
            name: true,
            orderIndex: true,
          },
        },
      },
    });

    return plans.map((plan) => ({
      id: plan.id,
      syllabusChapterId: plan.syllabusChapterId,
      recommendedOrder: plan.recommendedOrder,
      estimatedSessions: plan.estimatedSessions,
      goalSummary: plan.goalSummary,
      chapterName: plan.syllabusChapter.name,
      chapterOrderIndex: plan.syllabusChapter.orderIndex,
    }));
  },

  async getPhaseStatus() {
    return {
      phase: "phase-2",
      chapterPlanning: "enabled",
    };
  },
};
