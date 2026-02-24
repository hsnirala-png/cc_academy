import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolvePublicAssetsDir } from "../utils/publicAssetsPath";

const LESSON_AUDIO_DIR = path.join(resolvePublicAssetsDir(), "audio", "lessons");

const normalizeLessonId = (lessonId: string): string => {
  const normalized = String(lessonId || "").trim();
  if (!normalized) {
    throw new Error("Lesson id is required.");
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) {
    throw new Error("Invalid lesson id for audio storage.");
  }

  return normalized;
};

const sanitizeExtension = (value: string): string => {
  const extension = String(value || "mp3")
    .trim()
    .toLowerCase()
    .replace(/^\./, "");
  return /^[a-z0-9]+$/.test(extension) ? extension : "mp3";
};

export const lessonAudioRelativeUrl = (lessonId: string, extension = "mp3"): string => {
  const normalizedLessonId = normalizeLessonId(lessonId);
  const safeExtension = sanitizeExtension(extension);
  return `/public/audio/lessons/${normalizedLessonId}.${safeExtension}`;
};

export const writeLessonAudio = async (
  lessonId: string,
  audioBuffer: Buffer,
  extension = "mp3"
): Promise<string> => {
  const normalizedLessonId = normalizeLessonId(lessonId);
  const safeExtension = sanitizeExtension(extension);
  const fileName = `${normalizedLessonId}.${safeExtension}`;
  const outputPath = path.join(LESSON_AUDIO_DIR, fileName);

  await mkdir(LESSON_AUDIO_DIR, { recursive: true });
  await writeFile(outputPath, audioBuffer);

  return lessonAudioRelativeUrl(normalizedLessonId, safeExtension);
};

export const writeLessonMp3 = async (lessonId: string, mp3Buffer: Buffer): Promise<string> =>
  writeLessonAudio(lessonId, mp3Buffer, "mp3");
