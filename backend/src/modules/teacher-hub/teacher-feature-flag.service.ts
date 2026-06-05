import { prisma } from "../../utils/prisma";
import {
  TEACHER_HUB_FLAG_KEY,
  isTeacherHubAdminBypassEnabled,
  isTeacherHubEnvEnabled,
} from "../../utils/teacherHubFeatureFlags";

const featureFlagModel = () => (prisma as any).teacherFeatureFlagRollout;

const serializeFlag = (item: any) => ({
  id: item.id,
  flagKey: item.flagKey,
  scopeType: item.scopeType,
  userId: item.userId || null,
  teacherProfileId: item.teacherProfileId || null,
  isEnabled: Boolean(item.isEnabled),
  note: item.note || null,
  createdBy: item.createdBy || null,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

export const teacherFeatureFlagService = {
  async isEnabledForUser(userId: string, teacherProfileId?: string | null) {
    if (isTeacherHubEnvEnabled()) return true;

    const rows = await featureFlagModel().findMany({
      where: {
        flagKey: TEACHER_HUB_FLAG_KEY,
        isEnabled: true,
        OR: [
          { scopeType: "GLOBAL" },
          ...(userId ? [{ scopeType: "USER", userId }] : []),
          ...(teacherProfileId ? [{ scopeType: "TEACHER", teacherProfileId }] : []),
        ],
      },
      take: 10,
    });
    return rows.length > 0;
  },

  async isEnabledForAdmin() {
    if (isTeacherHubEnvEnabled() || isTeacherHubAdminBypassEnabled()) return true;
    const rows = await featureFlagModel().findMany({
      where: {
        flagKey: TEACHER_HUB_FLAG_KEY,
        isEnabled: true,
        OR: [{ scopeType: "GLOBAL" }, { scopeType: "ADMIN" }],
      },
      take: 10,
    });
    return rows.length > 0;
  },

  async listFlags() {
    const rows = await featureFlagModel().findMany({
      where: { flagKey: TEACHER_HUB_FLAG_KEY },
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map(serializeFlag);
  },

  async upsertFlag(input: {
    scopeType: string;
    userId?: string | null;
    teacherProfileId?: string | null;
    isEnabled: boolean;
    note?: string | null;
    createdBy?: string | null;
  }) {
    const existing = await featureFlagModel().findFirst({
      where: {
        flagKey: TEACHER_HUB_FLAG_KEY,
        scopeType: input.scopeType,
        userId: input.userId || null,
        teacherProfileId: input.teacherProfileId || null,
      },
    });

    const payload = {
      flagKey: TEACHER_HUB_FLAG_KEY,
      scopeType: input.scopeType,
      userId: input.userId || null,
      teacherProfileId: input.teacherProfileId || null,
      isEnabled: Boolean(input.isEnabled),
      note: input.note || null,
      createdBy: input.createdBy || null,
    };

    const row = existing
      ? await featureFlagModel().update({
          where: { id: existing.id },
          data: payload,
        })
      : await featureFlagModel().create({
          data: payload,
        });

    return serializeFlag(row);
  },
};
