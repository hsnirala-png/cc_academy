import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

const SEGMENT_DURATION_SEC = 3;
const transcriptOutputDir = path.resolve(
  __dirname,
  "../../../../frontend/public/transcripts"
);

const splitTranscriptIntoSentences = (transcriptText: string): string[] => {
  const normalized = transcriptText.replace(/\r/g, " ").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const matches = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
};

const buildSegments = (transcriptText: string): TranscriptSegment[] =>
  splitTranscriptIntoSentences(transcriptText).map((sentence, index) => {
    const start = index * SEGMENT_DURATION_SEC;
    return {
      start,
      end: start + SEGMENT_DURATION_SEC,
      text: sentence,
    };
  });

export const createLessonTranscriptFile = async (
  lessonId: string,
  transcriptText: string
): Promise<string> => {
  const segments = buildSegments(transcriptText);
  const fileName = `${lessonId}.json`;
  const filePath = path.join(transcriptOutputDir, fileName);

  await mkdir(transcriptOutputDir, { recursive: true });
  await writeFile(filePath, JSON.stringify(segments, null, 2), "utf8");

  return `/public/transcripts/${fileName}`;
};

