import { prisma } from "../../utils/prisma";
import { sanitizeTeacherHubOptionalText, sanitizeTeacherHubText } from "../../utils/teacherHubSanitizer";
import { teacherOwnershipService } from "./teacher-ownership.service";
import { teacherProfileService } from "./teacher-profile.service";

const offeringModel = () => (prisma as any).teacherOffering;
const offeringPolicyModel = () => (prisma as any).teacherOfferingPolicy;

const serializeOffering = (item: any, policy?: any) => ({
  id: item.id,
  teacherProfileId: item.teacherProfileId,
  mode: item.mode,
  title: item.title,
  board: item.board || null,
  classLevel: item.classLevel ?? null,
  subject: item.subject,
  billingCycle: item.billingCycle,
  cyclePrice: Number(item.cyclePrice || 0),
  demoPrice: Number(item.demoPrice || 0),
  batchCapacity: item.batchCapacity ?? null,
  isPublished: Boolean(item.isPublished),
  status: item.status,
  description: item.description || null,
  policy: policy
    ? {
        cancellationPolicy: policy.cancellationPolicy || null,
        refundPolicy: policy.refundPolicy || null,
        noShowPolicy: policy.noShowPolicy || null,
        lateJoinPolicy: policy.lateJoinPolicy || null,
      }
    : null,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

export const teacherOfferingService = {
  async listOwnOfferings(userId: string) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const rows = await offeringModel().findMany({
      where: { teacherProfileId },
      orderBy: [{ updatedAt: "desc" }],
    });
    const policies = await offeringPolicyModel().findMany({
      where: { teacherOfferingId: { in: rows.map((row: any) => row.id) } },
    });
    const policyMap = new Map(policies.map((item: any) => [item.teacherOfferingId, item]));
    return rows.map((item: any) => serializeOffering(item, policyMap.get(item.id)));
  },

  async listAdminOfferings() {
    const rows = await offeringModel().findMany({ orderBy: [{ updatedAt: "desc" }] });
    const policies = await offeringPolicyModel().findMany({
      where: { teacherOfferingId: { in: rows.map((row: any) => row.id) } },
    });
    const policyMap = new Map(policies.map((item: any) => [item.teacherOfferingId, item]));
    return rows.map((item: any) => serializeOffering(item, policyMap.get(item.id)));
  },

  async upsertOwnOffering(userId: string, input: any, offeringId?: string) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    if (offeringId) {
      await teacherOwnershipService.requireOwnedOffering(userId, offeringId);
    }
    const offeringPayload = {
      mode: String(input.mode || "ONE_TO_ONE").trim().toUpperCase(),
      title: sanitizeTeacherHubText(input.title, "offering title"),
      board: sanitizeTeacherHubOptionalText(input.board, "board"),
      classLevel: input.classLevel === null || input.classLevel === undefined || input.classLevel === ""
        ? null
        : Number(input.classLevel),
      subject: sanitizeTeacherHubText(input.subject, "subject"),
      billingCycle: String(input.billingCycle || "MONTHLY").trim().toUpperCase(),
      cyclePrice: Number(input.cyclePrice || 0),
      demoPrice: Number(input.demoPrice || 0),
      batchCapacity: input.batchCapacity === null || input.batchCapacity === undefined || input.batchCapacity === ""
        ? null
        : Number(input.batchCapacity),
      isPublished: Boolean(input.isPublished),
      status: String(input.status || (input.isPublished ? "PUBLISHED" : "DRAFT")).trim().toUpperCase(),
      description: sanitizeTeacherHubOptionalText(input.description, "description"),
    };

    const row = offeringId
      ? await offeringModel().update({
          where: { id: offeringId },
          data: offeringPayload,
        })
      : await offeringModel().create({
          data: {
            teacherProfileId,
            ...offeringPayload,
          },
        });

    const existingPolicy = await offeringPolicyModel().findFirst({
      where: { teacherOfferingId: row.id },
    });
    const policyPayload = {
      cancellationPolicy: sanitizeTeacherHubOptionalText(input.cancellationPolicy, "cancellation policy"),
      refundPolicy: sanitizeTeacherHubOptionalText(input.refundPolicy, "refund policy"),
      noShowPolicy: sanitizeTeacherHubOptionalText(input.noShowPolicy, "no-show policy"),
      lateJoinPolicy: sanitizeTeacherHubOptionalText(input.lateJoinPolicy, "late join policy"),
    };

    const policy = existingPolicy
      ? await offeringPolicyModel().update({
          where: { id: existingPolicy.id },
          data: policyPayload,
        })
      : await offeringPolicyModel().create({
          data: {
            teacherOfferingId: row.id,
            ...policyPayload,
          },
        });

    return serializeOffering(row, policy);
  },

  async adminUpdateOffering(offeringId: string, input: any) {
    const row = await offeringModel().update({
      where: { id: offeringId },
      data: {
        ...(input.status !== undefined ? { status: String(input.status || "").trim().toUpperCase() } : {}),
        ...(input.isPublished !== undefined ? { isPublished: Boolean(input.isPublished) } : {}),
      },
    });
    const policy = await offeringPolicyModel().findFirst({ where: { teacherOfferingId: offeringId } });
    return serializeOffering(row, policy);
  },
};
