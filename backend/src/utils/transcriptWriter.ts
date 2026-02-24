import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TranscriptSegment } from "./transcriptGenerator";
import { resolvePublicAssetsDir } from "./publicAssetsPath";

const transcriptsDir = path.join(resolvePublicAssetsDir(), "transcripts");

export const writeTranscriptJson = async (
  lessonId: string | number,
  segments: TranscriptSegment[]
): Promise<string> => {
  const normalizedLessonId = String(lessonId || "").trim();
  if (!normalizedLessonId) {
    throw new Error("Lesson id is required to write transcript file.");
  }

  const fileName = `lesson-${normalizedLessonId}.json`;
  const filePath = path.join(transcriptsDir, fileName);

  await mkdir(transcriptsDir, { recursive: true });
  await writeFile(filePath, JSON.stringify(segments, null, 2), "utf8");

  return `/public/transcripts/${fileName}`;
};
