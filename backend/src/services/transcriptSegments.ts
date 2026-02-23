type TranscriptSegment = {
  startMs: number;
  endMs: number;
  text: string;
};

const splitTranscriptUnits = (text: string): string[] => {
  return String(text || "")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((line) => line.trim())
    .filter(Boolean);
};

export const buildSegmentsFromTextAndDuration = (
  text: string,
  durationMs: number
): TranscriptSegment[] => {
  const units = splitTranscriptUnits(text);
  if (!units.length) return [];

  const safeDurationMs = Number.isFinite(durationMs) && durationMs > 0 ? Math.floor(durationMs) : 0;
  const fallbackDurationMs = Math.max(5000, units.length * 3000);
  const totalDurationMs = safeDurationMs > 0 ? safeDurationMs : fallbackDurationMs;

  const totalWeight = units.reduce((sum, unit) => sum + unit.length, 0);
  if (totalWeight <= 0) {
    const each = Math.max(1, Math.floor(totalDurationMs / units.length));
    return units.map((unit, index) => {
      const startMs = index * each;
      const endMs = index === units.length - 1 ? totalDurationMs : Math.min(totalDurationMs, startMs + each);
      return {
        startMs,
        endMs,
        text: unit,
      };
    });
  }

  let cursorMs = 0;
  return units.map((unit, index) => {
    const rawShare = Math.round((unit.length / totalWeight) * totalDurationMs);
    const shareMs = Math.max(200, rawShare);
    const startMs = cursorMs;
    const endMs =
      index === units.length - 1 ? totalDurationMs : Math.min(totalDurationMs, startMs + shareMs);
    cursorMs = endMs;
    return {
      startMs,
      endMs,
      text: unit,
    };
  });
};

