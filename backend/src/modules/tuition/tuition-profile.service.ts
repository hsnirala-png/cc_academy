import { Prisma } from "@prisma/client";
import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";

const TUITION_BOARD_SEEDS = [
  { code: "CBSE", name: "CBSE" },
  { code: "ICSE", name: "ICSE" },
  { code: "PSEB", name: "PSEB" },
] as const;

const TUITION_SUBJECT_SEEDS = [
  { code: "MATHS", name: "Mathematics" },
  { code: "SCIENCE", name: "Science" },
  { code: "ENGLISH", name: "English" },
  { code: "SOCIAL_STUDIES", name: "Social Studies" },
  { code: "HINDI", name: "Hindi" },
  { code: "PUNJABI", name: "Punjabi" },
] as const;

const TUITION_CLASS_LEVELS = [6, 7, 8, 9, 10, 11, 12] as const;
let seedPromise: Promise<void> | null = null;

const profileInclude = {
  board: true,
  subject: true,
  activeSyllabus: {
    select: {
      id: true,
      title: true,
      isConfirmed: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.TuitionProfileInclude;

type TuitionProfileRecord = Prisma.TuitionProfileGetPayload<{
  include: typeof profileInclude;
}>;

const normalizeCode = (value: string | null | undefined): string =>
  String(value || "")
    .trim()
    .toUpperCase();

const resolveProfile = async (userId: string): Promise<TuitionProfileRecord> => {
  let profile = await prisma.tuitionProfile.findUnique({
    where: { userId },
    include: profileInclude,
  });

  if (!profile) {
    profile = await prisma.tuitionProfile.create({
      data: { userId },
      include: profileInclude,
    });
  }

  if (!profile.activeSyllabusId) {
    const latestConfirmed = await prisma.tuitionSyllabus.findFirst({
      where: { profileId: profile.id, isConfirmed: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (latestConfirmed?.id) {
      profile = await prisma.tuitionProfile.update({
        where: { id: profile.id },
        data: { activeSyllabusId: latestConfirmed.id },
        include: profileInclude,
      });
    }
  }

  return profile;
};

const serializeProfile = (profile: TuitionProfileRecord) => ({
  id: profile.id,
  userId: profile.userId,
  boardCode: profile.board?.code || null,
  boardName: profile.board?.name || null,
  classLevel: profile.classLevel ?? null,
  subjectCode: profile.subject?.code || null,
  subjectName: profile.subject?.name || null,
  preferredLanguage: profile.preferredLanguage || null,
  activeSyllabusId: profile.activeSyllabusId || null,
  activeSyllabusTitle: profile.activeSyllabus?.title || null,
  activeSyllabusConfirmed: profile.activeSyllabus?.isConfirmed ?? false,
});

const serializeBoard = (board: { id: string; code: string; name: string; isActive: boolean }) => ({
  id: board.id,
  code: board.code,
  name: board.name,
  isActive: board.isActive,
});

const serializeSubject = (subject: { id: string; code: string; name: string; isActive: boolean }) => ({
  id: subject.id,
  code: subject.code,
  name: subject.name,
  isActive: subject.isActive,
});

export const tuitionProfileService = {
  async ensureSeedData() {
    if (!seedPromise) {
      seedPromise = (async () => {
        for (const board of TUITION_BOARD_SEEDS) {
          await prisma.tuitionBoard.upsert({
            where: { code: board.code },
            update: { name: board.name, isActive: true },
            create: { code: board.code, name: board.name, isActive: true },
          });
        }

        for (const subject of TUITION_SUBJECT_SEEDS) {
          await prisma.tuitionSubject.upsert({
            where: { code: subject.code },
            update: { name: subject.name, isActive: true },
            create: { code: subject.code, name: subject.name, isActive: true },
          });
        }
      })().finally(() => {
        seedPromise = null;
      });
    }

    await seedPromise;
  },

  async listBoards() {
    await this.ensureSeedData();
    const boards = await prisma.tuitionBoard.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return boards.map(serializeBoard);
  },

  async listSubjects() {
    await this.ensureSeedData();
    const subjects = await prisma.tuitionSubject.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return subjects.map(serializeSubject);
  },

  async getOrCreateProfile(userId: string) {
    await this.ensureSeedData();
    return resolveProfile(userId);
  },

  async getProfile(userId: string) {
    const profile = await this.getOrCreateProfile(userId);
    return serializeProfile(profile);
  },

  async getBootstrap(userId: string) {
    const [profile, boards, subjects, syllabiSummary] = await Promise.all([
      this.getOrCreateProfile(userId),
      this.listBoards(),
      this.listSubjects(),
      prisma.tuitionSyllabus.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          isConfirmed: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      domain: "AI Tuition Teacher",
      phase: "phase-2",
      status: "ready",
      profile: serializeProfile(profile),
      boards,
      subjects,
      classes: TUITION_CLASS_LEVELS,
      storedSyllabi: syllabiSummary.map((item) => ({
        id: item.id,
        title: item.title,
        isConfirmed: item.isConfirmed,
        updatedAt: item.updatedAt,
      })),
      flow: {
        upload: "/student/tuition/syllabus-uploads",
        review: "/student/tuition/syllabus-uploads/:uploadId/review",
        chapters: "/student/tuition/chapters",
        teacher: "/student/tuition/chapters/:chapterId/sessions",
      },
    };
  },

  async updateProfile(
    userId: string,
    input: {
      boardCode?: string | null;
      classLevel?: number | null;
      subjectCode?: string | null;
      preferredLanguage?: string | null;
      activeSyllabusId?: string | null;
    }
  ) {
    await this.ensureSeedData();
    const profile = await resolveProfile(userId);

    let boardId: string | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(input, "boardCode")) {
      const boardCode = normalizeCode(input.boardCode);
      if (!boardCode) {
        boardId = null;
      } else {
        const board = await prisma.tuitionBoard.findUnique({
          where: { code: boardCode },
          select: { id: true },
        });
        if (!board) throw new AppError("Selected tuition board is not available.", 400);
        boardId = board.id;
      }
    }

    let subjectId: string | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(input, "subjectCode")) {
      const subjectCode = normalizeCode(input.subjectCode);
      if (!subjectCode) {
        subjectId = null;
      } else {
        const subject = await prisma.tuitionSubject.findUnique({
          where: { code: subjectCode },
          select: { id: true },
        });
        if (!subject) throw new AppError("Selected tuition subject is not available.", 400);
        subjectId = subject.id;
      }
    }

    let activeSyllabusId: string | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(input, "activeSyllabusId")) {
      const requestedId = String(input.activeSyllabusId || "").trim();
      if (!requestedId) {
        activeSyllabusId = null;
      } else {
        const syllabus = await prisma.tuitionSyllabus.findFirst({
          where: { id: requestedId, userId },
          select: { id: true },
        });
        if (!syllabus) throw new AppError("Selected syllabus was not found for this student.", 404);
        activeSyllabusId = syllabus.id;
      }
    }

    if (
      input.classLevel !== undefined &&
      input.classLevel !== null &&
      !TUITION_CLASS_LEVELS.includes(input.classLevel as (typeof TUITION_CLASS_LEVELS)[number])
    ) {
      throw new AppError("Class level must be between 6 and 12.", 400);
    }

    const updated = await prisma.tuitionProfile.update({
      where: { id: profile.id },
      data: {
        ...(boardId !== undefined ? { boardId } : {}),
        ...(subjectId !== undefined ? { subjectId } : {}),
        ...(input.classLevel !== undefined ? { classLevel: input.classLevel ?? null } : {}),
        ...(input.preferredLanguage !== undefined
          ? { preferredLanguage: String(input.preferredLanguage || "").trim() || null }
          : {}),
        ...(activeSyllabusId !== undefined ? { activeSyllabusId } : {}),
      },
      include: profileInclude,
    });

    return serializeProfile(updated);
  },
};
