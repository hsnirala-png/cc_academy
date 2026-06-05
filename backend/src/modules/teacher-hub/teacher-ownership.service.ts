import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import { teacherProfileService } from "./teacher-profile.service";

const offeringModel = () => (prisma as any).teacherOffering;
const batchModel = () => (prisma as any).teacherBatch;
const enrollmentModel = () => (prisma as any).teacherEnrollment;

export const teacherOwnershipService = {
  async requireTeacherProfileId(userId: string) {
    return teacherProfileService.requireProfileIdForUser(userId);
  },

  async requireOwnedOffering(userId: string, teacherOfferingId: string) {
    const teacherProfileId = await this.requireTeacherProfileId(userId);
    const offering = await offeringModel().findFirst({
      where: { id: teacherOfferingId, teacherProfileId },
    });
    if (!offering) {
      throw new AppError("Teacher offering not found.", 404, "TEACHER_HUB_OFFERING_NOT_FOUND");
    }
    return offering;
  },

  async requireOwnedBatch(userId: string, batchId: string) {
    const teacherProfileId = await this.requireTeacherProfileId(userId);
    const batch = await batchModel().findFirst({
      where: { id: batchId, teacherProfileId },
    });
    if (!batch) {
      throw new AppError("Teacher batch not found.", 404, "TEACHER_HUB_BATCH_NOT_FOUND");
    }
    return batch;
  },

  async requireOwnedEnrollment(userId: string, enrollmentId: string) {
    const teacherProfileId = await this.requireTeacherProfileId(userId);
    const enrollment = await enrollmentModel().findFirst({
      where: { id: enrollmentId, teacherProfileId },
    });
    if (!enrollment) {
      throw new AppError("Teacher enrollment not found.", 404, "TEACHER_HUB_ENROLLMENT_NOT_FOUND");
    }
    return enrollment;
  },

  async validateContentTargetOwnership(
    userId: string,
    input: { enrollmentId?: string | null; batchId?: string | null },
    options: { allowBatchOnly?: boolean } = {}
  ) {
    const enrollmentId = String(input.enrollmentId || "").trim();
    const batchId = String(input.batchId || "").trim();
    if (!enrollmentId && !batchId) {
      throw new AppError(
        "An enrollment or batch target is required.",
        400,
        "TEACHER_HUB_TARGET_REQUIRED"
      );
    }

    const enrollment = enrollmentId ? await this.requireOwnedEnrollment(userId, enrollmentId) : null;
    const batch = batchId ? await this.requireOwnedBatch(userId, batchId) : null;

    if (!options.allowBatchOnly && batch && !enrollment) {
      throw new AppError(
        "Batch-only board delivery is not enabled in Phase 1.",
        403,
        "TEACHER_HUB_BATCH_BOARD_DISABLED"
      );
    }

    if (enrollment && batch) {
      if (String(enrollment.batchId || "").trim() !== String(batch.id || "").trim()) {
        throw new AppError(
          "Enrollment and batch do not belong to the same teacher delivery target.",
          400,
          "TEACHER_HUB_TARGET_MISMATCH"
        );
      }
    }

    return {
      enrollment,
      batch,
    };
  },
};
