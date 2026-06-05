import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import { sanitizeTeacherHubText } from "../../utils/teacherHubSanitizer";
import { teacherEnrollmentService } from "./teacher-enrollment.service";
import { teacherOwnershipService } from "./teacher-ownership.service";
import { teacherProfileService } from "./teacher-profile.service";

const noticeModel = () => (prisma as any).teacherNotice;
const noticeRecipientModel = () => (prisma as any).teacherNoticeRecipient;
const enrollmentModel = () => (prisma as any).teacherEnrollment;
const batchStudentModel = () => (prisma as any).teacherBatchStudent;

const serializeNotice = (item: any) => ({
  id: item.id,
  teacherProfileId: item.teacherProfileId,
  targetType: item.targetType,
  targetId: item.targetId,
  title: item.title,
  body: item.body,
  status: item.status,
  publishedAt: item.publishedAt?.toISOString?.() || null,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

const resolveRecipientUserIds = async (targetType: string, targetId: string): Promise<string[]> => {
  if (targetType === "ENROLLMENT") {
    const enrollment = await enrollmentModel().findUnique({ where: { id: targetId } });
    return enrollment?.studentUserId ? [enrollment.studentUserId] : [];
  }
  if (targetType === "BATCH") {
    const rows = await batchStudentModel().findMany({ where: { batchId: targetId } });
    return rows.map((item: any) => item.studentUserId).filter(Boolean);
  }
  return [];
};

export const teacherNoticeService = {
  async createNotice(userId: string, input: any) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const targetType = String(input.targetType || "ENROLLMENT").trim().toUpperCase();
    const targetId = String(input.targetId || "").trim();
    if (targetType === "ENROLLMENT") {
      await teacherOwnershipService.requireOwnedEnrollment(userId, targetId);
    } else if (targetType === "BATCH") {
      await teacherOwnershipService.requireOwnedBatch(userId, targetId);
    } else {
      throw new AppError("Unsupported teacher notice target.", 400, "TEACHER_HUB_NOTICE_TARGET_INVALID");
    }
    const recipients = await resolveRecipientUserIds(targetType, targetId);
    if (!recipients.length) {
      throw new AppError(
        "Notice recipients could not be resolved for this target.",
        400,
        "TEACHER_HUB_NOTICE_RECIPIENTS_EMPTY"
      );
    }
    const row = await noticeModel().create({
      data: {
        teacherProfileId,
        targetType,
        targetId,
        title: sanitizeTeacherHubText(input.title, "notice title"),
        body: sanitizeTeacherHubText(input.body, "notice body"),
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    await Promise.all(
      recipients.map((studentUserId) =>
        noticeRecipientModel().create({
          data: {
            teacherNoticeId: row.id,
            studentUserId,
          },
        })
      )
    );
    return serializeNotice(row);
  },

  async listTeacherNotices(userId: string) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const rows = await noticeModel().findMany({
      where: { teacherProfileId },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(serializeNotice);
  },

  async listStudentNotices(studentUserId: string) {
    const recipients = await noticeRecipientModel().findMany({
      where: { studentUserId },
      orderBy: [{ updatedAt: "desc" }],
    });
    const noticeIds = recipients.map((item: any) => item.teacherNoticeId);
    if (!noticeIds.length) return [];
    const notices = await noticeModel().findMany({
      where: { id: { in: noticeIds } },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
    const recipientMap = new Map<string, any>(recipients.map((item: any) => [item.teacherNoticeId, item]));
    return notices.map((item: any) => ({
      ...serializeNotice(item),
      readAt: recipientMap.get(item.id)?.readAt?.toISOString?.() || null,
    }));
  },

  async markRead(studentUserId: string, teacherNoticeId: string) {
    const row = await noticeRecipientModel().findFirst({
      where: { teacherNoticeId, studentUserId },
    });
    if (!row) return null;
    const updated = await noticeRecipientModel().update({
      where: { id: row.id },
      data: { readAt: new Date() },
    });
    return {
      id: updated.id,
      teacherNoticeId: updated.teacherNoticeId,
      readAt: updated.readAt?.toISOString?.() || null,
    };
  },
};
