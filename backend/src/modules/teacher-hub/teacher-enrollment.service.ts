import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import { resolveTeacherHubCycleDays } from "../../utils/teacherHubPolicy";
import { teacherProfileService } from "./teacher-profile.service";

const enrollmentModel = () => (prisma as any).teacherEnrollment;
const batchStudentModel = () => (prisma as any).teacherBatchStudent;
const offeringModel = () => (prisma as any).teacherOffering;
const billingCycleModel = () => (prisma as any).teacherBillingCycle;

const serializeEnrollment = (item: any) => ({
  id: item.id,
  studentUserId: item.studentUserId,
  teacherProfileId: item.teacherProfileId,
  teacherOfferingId: item.teacherOfferingId,
  batchId: item.batchId || null,
  mode: item.mode,
  status: item.status,
  billingCycle: item.billingCycle,
  currentCycleStart: item.currentCycleStart?.toISOString?.() || null,
  currentCycleEnd: item.currentCycleEnd?.toISOString?.() || null,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

const buildCycleDates = (billingCycle: string) => {
  const startsOn = new Date();
  const endsOn = new Date(startsOn.getTime() + resolveTeacherHubCycleDays(billingCycle) * 24 * 60 * 60 * 1000);
  return { startsOn, endsOn };
};

export const teacherEnrollmentService = {
  async createEnrollment(input: {
    studentUserId: string;
    teacherOfferingId: string;
    teacherProfileId?: string | null;
    batchId?: string | null;
  }) {
    const offering = await offeringModel().findUnique({ where: { id: input.teacherOfferingId } });
    if (!offering) throw new AppError("Teacher offering not found.", 404, "TEACHER_HUB_OFFERING_NOT_FOUND");

    const cycleDates = buildCycleDates(offering.billingCycle);
    const enrollment = await enrollmentModel().create({
      data: {
        studentUserId: input.studentUserId,
        teacherProfileId: input.teacherProfileId || offering.teacherProfileId,
        teacherOfferingId: offering.id,
        batchId: input.batchId || null,
        mode: offering.mode,
        status: "ACTIVE",
        billingCycle: offering.billingCycle,
        currentCycleStart: cycleDates.startsOn,
        currentCycleEnd: cycleDates.endsOn,
      },
    });

    if (input.batchId) {
      await batchStudentModel().create({
        data: {
          batchId: input.batchId,
          studentUserId: input.studentUserId,
          enrollmentId: enrollment.id,
        },
      });
    }

    await billingCycleModel().create({
      data: {
        teacherEnrollmentId: enrollment.id,
        teacherProfileId: enrollment.teacherProfileId,
        cycleType: enrollment.billingCycle,
        startsOn: cycleDates.startsOn,
        endsOn: cycleDates.endsOn,
      },
    });

    return serializeEnrollment(enrollment);
  },

  async listStudentEnrollments(studentUserId: string) {
    const rows = await enrollmentModel().findMany({
      where: { studentUserId },
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map(serializeEnrollment);
  },

  async listTeacherEnrollments(userId: string) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const rows = await enrollmentModel().findMany({
      where: { teacherProfileId },
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map(serializeEnrollment);
  },

  async requireTeacherEnrollment(userId: string, enrollmentId: string) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const row = await enrollmentModel().findFirst({
      where: { id: enrollmentId, teacherProfileId },
    });
    if (!row) throw new AppError("Teacher enrollment not found.", 404, "TEACHER_HUB_ENROLLMENT_NOT_FOUND");
    return row;
  },

  async requireStudentEnrollment(studentUserId: string, enrollmentId: string) {
    const row = await enrollmentModel().findFirst({
      where: { id: enrollmentId, studentUserId },
    });
    if (!row) throw new AppError("Student enrollment not found.", 404, "TEACHER_HUB_ENROLLMENT_NOT_FOUND");
    return row;
  },
};
