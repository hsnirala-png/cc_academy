import { prisma } from "../../utils/prisma";
import { sanitizeTeacherHubOptionalText, sanitizeTeacherHubText } from "../../utils/teacherHubSanitizer";
import { storeTeacherHubFile } from "../../utils/teacherHubStorage";
import { teacherEnrollmentService } from "./teacher-enrollment.service";
import { teacherOwnershipService } from "./teacher-ownership.service";
import { teacherProfileService } from "./teacher-profile.service";

const contentModel = () => (prisma as any).teacherContentItem;
const attachmentModel = () => (prisma as any).teacherContentAttachment;

const serializeContent = (item: any, attachments: any[] = []) => ({
  id: item.id,
  teacherProfileId: item.teacherProfileId,
  enrollmentId: item.enrollmentId || null,
  batchId: item.batchId || null,
  contentType: item.contentType,
  title: item.title,
  body: item.body || null,
  visibility: item.visibility,
  status: item.status,
  attachments: attachments.map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    storageUrl: attachment.storageUrl,
  })),
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

export const teacherContentService = {
  async listTeacherContent(userId: string) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const rows = await contentModel().findMany({
      where: { teacherProfileId },
      orderBy: [{ updatedAt: "desc" }],
    });
    const attachments = await attachmentModel().findMany({
      where: { contentItemId: { in: rows.map((item: any) => item.id) } },
    });
    const attachmentMap = new Map<string, any[]>();
    attachments.forEach((item: any) => {
      const list = attachmentMap.get(item.contentItemId) || [];
      list.push(item);
      attachmentMap.set(item.contentItemId, list);
    });
    return rows.map((item: any) => serializeContent(item, attachmentMap.get(item.id) || []));
  },

  async listStudentContent(studentUserId: string) {
    const enrollments = await teacherEnrollmentService.listStudentEnrollments(studentUserId);
    const enrollmentIds = enrollments.map((item: any) => item.id);
    const batchIds = enrollments.map((item: any) => item.batchId).filter(Boolean);
    const rows = await contentModel().findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { enrollmentId: { in: enrollmentIds } },
          ...(batchIds.length ? [{ batchId: { in: batchIds } }] : []),
        ],
      },
      orderBy: [{ updatedAt: "desc" }],
    });
    const attachments = await attachmentModel().findMany({
      where: { contentItemId: { in: rows.map((item: any) => item.id) } },
    });
    const attachmentMap = new Map<string, any[]>();
    attachments.forEach((item: any) => {
      const list = attachmentMap.get(item.contentItemId) || [];
      list.push(item);
      attachmentMap.set(item.contentItemId, list);
    });
    return rows.map((item: any) => serializeContent(item, attachmentMap.get(item.id) || []));
  },

  async createContent(userId: string, input: any) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const scopedTarget = await teacherOwnershipService.validateContentTargetOwnership(userId, {
      enrollmentId: input.enrollmentId || null,
      batchId: input.batchId || null,
    }, { allowBatchOnly: true });
    const row = await contentModel().create({
      data: {
        teacherProfileId,
        enrollmentId: scopedTarget.enrollment?.id || null,
        batchId: scopedTarget.batch?.id || null,
        contentType: String(input.contentType || "NOTE").trim().toUpperCase(),
        title: sanitizeTeacherHubText(input.title, "content title"),
        body: sanitizeTeacherHubOptionalText(input.body, "content body"),
        visibility: String(input.visibility || "ENROLLED_ONLY").trim().toUpperCase(),
        status: "PUBLISHED",
      },
    });

    const attachments = [];
    for (const file of Array.isArray(input.attachments) ? input.attachments : []) {
      const stored = await storeTeacherHubFile("content-files", {
        fileName: String(file.fileName || "attachment"),
        mimeType: String(file.mimeType || "application/octet-stream"),
        fileBase64: String(file.fileBase64 || ""),
      });
      const attachment = await attachmentModel().create({
        data: {
          contentItemId: row.id,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          storageUrl: stored.fileUrl,
        },
      });
      attachments.push(attachment);
    }

    return serializeContent(row, attachments);
  },
};
