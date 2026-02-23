import { Role } from "@prisma/client";
import { randomInt } from "node:crypto";
import { prisma } from "../../utils/prisma";

let isStudentIdentityReady = false;
let studentIdentityReadyPromise: Promise<void> | null = null;
let studentIdentityStorageUnavailable = false;

const STUDENT_CODE_PATTERN = /^CA\d{5}$/i;

type StudentIdentityRow = {
  userId: string;
  studentCode: string;
};

const randomDigits = (length: number): string => {
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += String(randomInt(0, 10));
  }
  return output;
};

const normalizeStudentCode = (value: unknown): string => {
  const raw = String(value || "").trim().toUpperCase();
  return STUDENT_CODE_PATTERN.test(raw) ? raw : "";
};

const buildStudentCodeCandidate = (): string => `CA${randomDigits(5)}`;
const buildDeterministicStudentCode = (seed: string): string => {
  const source = String(seed || "0");
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 100000;
  }
  return `CA${String(Math.abs(hash)).padStart(5, "0")}`;
};

export const isStudentCode = (value: unknown): boolean => Boolean(normalizeStudentCode(value));

export const ensureStudentIdentityStorageReady = async (): Promise<void> => {
  if (studentIdentityStorageUnavailable) return;
  if (isStudentIdentityReady) return;
  if (studentIdentityReadyPromise) return studentIdentityReadyPromise;

  studentIdentityReadyPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`StudentIdentity\` (
          \`userId\` VARCHAR(191) NOT NULL,
          \`studentCode\` VARCHAR(16) NOT NULL,
          \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`userId\`),
          UNIQUE INDEX \`StudentIdentity_studentCode_key\` (\`studentCode\`),
          CONSTRAINT \`StudentIdentity_userId_fkey\`
            FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
            ON DELETE CASCADE ON UPDATE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      isStudentIdentityReady = true;
    } catch {
      // Do not break auth/session if DB user cannot create table in current env.
      studentIdentityStorageUnavailable = true;
      isStudentIdentityReady = false;
    }
  })().finally(() => {
    studentIdentityReadyPromise = null;
  });

  return studentIdentityReadyPromise;
};

const getStudentIdentityByUserId = async (userId: string): Promise<StudentIdentityRow | null> => {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT userId, studentCode
      FROM StudentIdentity
      WHERE userId = ?
      LIMIT 1
    `,
    userId
  )) as StudentIdentityRow[];

  const row = rows[0];
  if (!row) return null;
  const studentCode = normalizeStudentCode(row.studentCode);
  if (!studentCode) return null;
  return { userId: row.userId, studentCode };
};

export const ensureStudentCodeForUser = async (userId: string): Promise<string> => {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) return buildDeterministicStudentCode("0");

  await ensureStudentIdentityStorageReady();
  if (studentIdentityStorageUnavailable) {
    return buildDeterministicStudentCode(normalizedUserId);
  }

  try {
    const existing = await getStudentIdentityByUserId(normalizedUserId);
    if (existing?.studentCode) return existing.studentCode;

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const candidate = buildStudentCodeCandidate();
      const inserted = await prisma
        .$executeRawUnsafe(
          `
            INSERT IGNORE INTO StudentIdentity (userId, studentCode)
            VALUES (?, ?)
          `,
          normalizedUserId,
          candidate
        )
        .catch(() => 0);

      if (Number(inserted || 0) > 0) return candidate;

      const afterInsert = await getStudentIdentityByUserId(normalizedUserId);
      if (afterInsert?.studentCode) return afterInsert.studentCode;
    }
  } catch {
    // Fall back below.
  }
  return buildDeterministicStudentCode(normalizedUserId);
};

export const ensureStudentCodesForUsers = async (
  userIds: string[]
): Promise<Map<string, string>> => {
  await ensureStudentIdentityStorageReady();
  const uniqueIds = Array.from(new Set((userIds || []).map((id) => String(id || "").trim()).filter(Boolean)));
  const map = new Map<string, string>();
  for (const userId of uniqueIds) {
    const code = await ensureStudentCodeForUser(userId);
    if (code) map.set(userId, code);
  }
  return map;
};

export const getUserIdByStudentCode = async (studentCode: string): Promise<string | null> => {
  await ensureStudentIdentityStorageReady();
  const normalized = normalizeStudentCode(studentCode);
  if (!normalized) return null;

  if (!studentIdentityStorageUnavailable) {
    try {
      const rows = (await prisma.$queryRawUnsafe(
        `
          SELECT userId
          FROM StudentIdentity
          WHERE studentCode = ?
          LIMIT 1
        `,
        normalized
      )) as Array<{ userId: string }>;

      const found = String(rows[0]?.userId || "").trim();
      if (found) return found;
    } catch {
      // Fall through to deterministic lookup.
    }
  }

  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT },
    select: { id: true },
  });
  const matched = students.find((row) => buildDeterministicStudentCode(row.id) === normalized);
  return String(matched?.id || "").trim() || null;
};
