export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

const SEGMENT_DURATION_SEC = 3;

const splitIntoSentences = (transcriptText: string): string[] => {
  const normalized = String(transcriptText || "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  return normalized
    .split(/\n+/)
    .flatMap((line) => line.match(/[^.?!]+[.?!]?/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
};

export const makeTranscriptSegments = (transcriptText: string): TranscriptSegment[] =>
  splitIntoSentences(transcriptText).map((sentence, index) => {
    const start = index * SEGMENT_DURATION_SEC;
    return {
      start,
      end: start + SEGMENT_DURATION_SEC,
      text: sentence,
    };
  });

