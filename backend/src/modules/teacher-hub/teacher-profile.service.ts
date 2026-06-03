import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import { sanitizeTeacherHubOptionalText, sanitizeTeacherHubText } from "../../utils/teacherHubSanitizer";

const profileModel = () => (prisma as any).teacherProfile;

const serializeProfile = (item: any) => ({
  id: item.id,
  userId: item.userId,
  displayName: item.displayName,
  headline: item.headline || null,
  bio: item.bio || null,
  status: item.status,
  canTeachOneToOne: Boolean(item.canTeachOneToOne),
  canTeachBatch: Boolean(item.canTeachBatch),
  subjects: Array.isArray(item.subjectsJson) ? item.subjectsJson : [],
  boards: Array.isArray(item.boardsJson) ? item.boardsJson : [],
  classLevels: Array.isArray(item.classLevelsJson) ? item.classLevelsJson : [],
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

export const teacherProfileService = {
  async getProfileByUserId(userId: string) {
    const row = await profileModel().findUnique({ where: { userId } });
    return row ? serializeProfile(row) : null;
  },

  async getApprovedProfileByUserId(userId: string) {
    const row = await profileModel().findFirst({
      where: { userId, status: "APPROVED" },
    });
    return row ? serializeProfile(row) : null;
  },

  async requireApprovedProfileByUserId(userId: string) {
    const profile = await this.getApprovedProfileByUserId(userId);
    if (!profile) {
      throw new AppError("Teacher access is not approved for this account.", 403, "TEACHER_HUB_NOT_APPROVED");
    }
    return profile;
  },

  async upsertOwnProfile(userId: string, input: {
    displayName: string;
    headline?: string | null;
    bio?: string | null;
    canTeachOneToOne?: boolean;
    canTeachBatch?: boolean;
    subjects?: string[];
    boards?: string[];
    classLevels?: Array<number | string>;
  }) {
    const existing = await profileModel().findUnique({ where: { userId } });
    const payload = {
      displayName: sanitizeTeacherHubText(input.displayName, "display name"),
      headline: sanitizeTeacherHubOptionalText(input.headline, "headline"),
      bio: sanitizeTeacherHubOptionalText(input.bio, "bio"),
      canTeachOneToOne: input.canTeachOneToOne !== false,
      canTeachBatch: Boolean(input.canTeachBatch),
      subjectsJson: Array.isArray(input.subjects) ? input.subjects.map((item) => String(item || "").trim()).filter(Boolean) : [],
      boardsJson: Array.isArray(input.boards) ? input.boards.map((item) => String(item || "").trim()).filter(Boolean) : [],
      classLevelsJson: Array.isArray(input.classLevels)
        ? input.classLevels.map((item) => Number(item)).filter((item) => Number.isFinite(item))
        : [],
    };

    const row = existing
      ? await profileModel().update({
          where: { id: existing.id },
          data: payload,
        })
      : await profileModel().create({
          data: {
            userId,
            status: "PENDING",
            ...payload,
          },
        });

    return serializeProfile(row);
  },

  async listProfiles(filters: { status?: string | null } = {}) {
    const rows = await profileModel().findMany({
      where: filters.status ? { status: filters.status } : {},
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map(serializeProfile);
  },

  async updateStatus(profileId: string, status: string) {
    const row = await profileModel().update({
      where: { id: profileId },
      data: { status: String(status || "").trim().toUpperCase() || "PENDING" },
    });
    return serializeProfile(row);
  },

  async requireProfileIdForUser(userId: string) {
    const row = await profileModel().findUnique({ where: { userId } });
    if (!row) throw new AppError("Teacher profile not found.", 404, "TEACHER_PROFILE_NOT_FOUND");
    return row.id as string;
  },
};
