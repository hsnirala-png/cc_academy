import { prisma } from "../../utils/prisma";
import { teacherProfileService } from "./teacher-profile.service";

const kycModel = () => (prisma as any).teacherKyc;

const serializeKyc = (item: any) => ({
  id: item.id,
  teacherProfileId: item.teacherProfileId,
  legalName: item.legalName || null,
  documentType: item.documentType || null,
  documentNumberMasked: item.documentNumberMasked || null,
  verificationStatus: item.verificationStatus,
  verifiedByAdminId: item.verifiedByAdminId || null,
  verifiedAt: item.verifiedAt?.toISOString?.() || null,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

export const teacherKycService = {
  async getOwnKyc(userId: string) {
    const profile = await teacherProfileService.getProfileByUserId(userId);
    if (!profile?.id) return null;
    const teacherProfileId = profile.id;
    const row = await kycModel().findFirst({ where: { teacherProfileId } });
    return row ? serializeKyc(row) : null;
  },

  async upsertOwnKyc(userId: string, input: {
    legalName?: string | null;
    documentType?: string | null;
    documentNumberMasked?: string | null;
    documentMetaJson?: Record<string, unknown> | null;
  }) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const existing = await kycModel().findFirst({ where: { teacherProfileId } });
    const row = existing
      ? await kycModel().update({
          where: { id: existing.id },
          data: {
            legalName: input.legalName || null,
            documentType: input.documentType || null,
            documentNumberMasked: input.documentNumberMasked || null,
            documentMetaJson: input.documentMetaJson || null,
            verificationStatus: existing.verificationStatus === "APPROVED" ? "APPROVED" : "PENDING",
          },
        })
      : await kycModel().create({
          data: {
            teacherProfileId,
            legalName: input.legalName || null,
            documentType: input.documentType || null,
            documentNumberMasked: input.documentNumberMasked || null,
            documentMetaJson: input.documentMetaJson || null,
          },
        });
    return serializeKyc(row);
  },

  async listForAdmin() {
    const rows = await kycModel().findMany({ orderBy: [{ updatedAt: "desc" }] });
    return rows.map(serializeKyc);
  },

  async updateVerificationStatus(kycId: string, status: string, adminUserId: string) {
    const normalized = String(status || "").trim().toUpperCase() || "PENDING";
    const row = await kycModel().update({
      where: { id: kycId },
      data: {
        verificationStatus: normalized,
        verifiedByAdminId: adminUserId,
        verifiedAt: normalized === "APPROVED" ? new Date() : null,
      },
    });
    return serializeKyc(row);
  },
};
