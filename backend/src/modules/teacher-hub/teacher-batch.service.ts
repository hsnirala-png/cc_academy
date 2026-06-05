import { prisma } from "../../utils/prisma";
import { sanitizeTeacherHubText } from "../../utils/teacherHubSanitizer";
import { teacherOwnershipService } from "./teacher-ownership.service";
import { teacherProfileService } from "./teacher-profile.service";

const batchModel = () => (prisma as any).teacherBatch;

const serializeBatch = (item: any) => ({
  id: item.id,
  teacherProfileId: item.teacherProfileId,
  teacherOfferingId: item.teacherOfferingId,
  title: item.title,
  capacity: item.capacity ?? null,
  status: item.status,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

export const teacherBatchService = {
  async listTeacherBatches(userId: string) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const rows = await batchModel().findMany({
      where: { teacherProfileId },
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map(serializeBatch);
  },

  async createBatch(userId: string, input: any) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const offering = await teacherOwnershipService.requireOwnedOffering(
      userId,
      String(input.teacherOfferingId || "").trim()
    );
    const row = await batchModel().create({
      data: {
        teacherProfileId,
        teacherOfferingId: offering.id,
        title: sanitizeTeacherHubText(input.title, "batch title"),
        capacity: input.capacity === null || input.capacity === undefined || input.capacity === ""
          ? null
          : Number(input.capacity),
        status: String(input.status || "ACTIVE").trim().toUpperCase(),
      },
    });
    return serializeBatch(row);
  },
};
