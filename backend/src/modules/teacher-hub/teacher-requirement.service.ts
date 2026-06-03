import { prisma } from "../../utils/prisma";
import { sanitizeTeacherHubOptionalText, sanitizeTeacherHubText } from "../../utils/teacherHubSanitizer";

const requirementModel = () => (prisma as any).teacherRequirement;

const serializeRequirement = (item: any) => ({
  id: item.id,
  studentUserId: item.studentUserId,
  board: item.board || null,
  classLevel: item.classLevel ?? null,
  subject: item.subject,
  modeWanted: item.modeWanted,
  goals: item.goals || null,
  status: item.status,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

export const teacherRequirementService = {
  async createRequirement(studentUserId: string, input: any) {
    const row = await requirementModel().create({
      data: {
        studentUserId,
        board: sanitizeTeacherHubOptionalText(input.board, "board"),
        classLevel: input.classLevel === null || input.classLevel === undefined || input.classLevel === ""
          ? null
          : Number(input.classLevel),
        subject: sanitizeTeacherHubText(input.subject, "subject"),
        modeWanted: String(input.modeWanted || "ONE_TO_ONE").trim().toUpperCase(),
        goals: sanitizeTeacherHubOptionalText(input.goals, "goals"),
      },
    });
    return serializeRequirement(row);
  },

  async listStudentRequirements(studentUserId: string) {
    const rows = await requirementModel().findMany({
      where: { studentUserId },
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map(serializeRequirement);
  },
};
