import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/utils/prisma";
import { writeLessonAudio } from "../src/services/audioStorage";
import { buildSegmentsFromTextAndDuration } from "../src/services/transcriptSegments";
import { generateGeminiSpeechBuffer } from "../src/services/geminiTts";
import { generateSpeechMp3Buffer, transcribeMp3WithTimestamps } from "../src/services/openaiTts";

type Provider = "openai" | "gemini";

const args = process.argv.slice(2);

const readArgValue = (name: string): string => {
  const prefix = `--${name}=`;
  const match = args.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length).trim() : "";
};

const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const providerArg = readArgValue("provider").toLowerCase();
const provider: Provider = providerArg === "gemini" ? "gemini" : "openai";
const lessonIdFilter = readArgValue("lessonId");
const dryRun = hasFlag("dry-run");

const backendPublicDir = path.resolve(__dirname, "..", "public");
const frontendPublicDir = path.resolve(__dirname, "..", "..", "frontend", "public");
const OPENAI_TTS_MAX_INPUT_CHARS = 4096;
const GEMINI_TTS_MAX_INPUT_CHARS = 12000;

const resolveAssetCandidates = (rawValue: string | null | undefined): string[] => {
  const raw = String(rawValue || "").trim();
  if (!raw) return [];
  const rel = raw.replace(/^\/+/, "");
  const withoutPublic = rel.replace(/^public\/+/, "");
  return [
    path.join(backendPublicDir, withoutPublic),
    path.join(frontendPublicDir, withoutPublic),
    path.join(backendPublicDir, rel),
    path.join(frontendPublicDir, rel),
  ];
};

const lessonAudioExists = (audioUrl: string | null | undefined): boolean =>
  resolveAssetCandidates(audioUrl).some((candidate) => fs.existsSync(candidate));

const tokenizeForCoverage = (value: string): string[] =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const computeTokenCoverage = (referenceText: string, spokenText: string): number | null => {
  const referenceTokens = tokenizeForCoverage(referenceText);
  const spokenTokens = tokenizeForCoverage(spokenText);
  if (!referenceTokens.length || !spokenTokens.length) return null;

  const spokenCount = new Map<string, number>();
  spokenTokens.forEach((token) => {
    spokenCount.set(token, (spokenCount.get(token) || 0) + 1);
  });

  let matched = 0;
  referenceTokens.forEach((token) => {
    const count = spokenCount.get(token) || 0;
    if (count > 0) {
      matched += 1;
      spokenCount.set(token, count - 1);
    }
  });

  return matched / referenceTokens.length;
};

const parseAudioDurationMs = async (audioBuffer: Buffer, mimeType = "audio/mpeg"): Promise<number> => {
  const maybeMusicMetadataModule = (await import("music-metadata")) as any;
  const musicMetadataModule =
    typeof maybeMusicMetadataModule?.loadMusicMetadata === "function"
      ? await maybeMusicMetadataModule.loadMusicMetadata()
      : maybeMusicMetadataModule;

  if (typeof musicMetadataModule?.parseBuffer !== "function") {
    return 0;
  }

  const metadata = await musicMetadataModule.parseBuffer(audioBuffer, { mimeType });
  const durationSec = Number(metadata.format.duration || 0);
  return durationSec > 0 ? Math.round(durationSec * 1000) : 0;
};

const getTimelineEndMs = (items: Array<{ endMs?: number }>): number => {
  if (!Array.isArray(items) || !items.length) return 0;
  const endMs = Math.max(...items.map((item) => Number(item?.endMs || 0)));
  return Number.isFinite(endMs) && endMs > 0 ? Math.round(endMs) : 0;
};

const generateAudio = async (
  transcriptText: string,
  lessonVoice: string | null,
  lessonLanguageHint: string | null
) => {
  if (provider === "gemini") {
    return generateGeminiSpeechBuffer(transcriptText, {
      model: process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts",
      voice: lessonVoice || process.env.GEMINI_TTS_VOICE || "Kore",
      languageHint: lessonLanguageHint || "auto",
    });
  }

  return {
    buffer: await generateSpeechMp3Buffer(transcriptText, {
      model: "tts-1",
      voice: lessonVoice || "alloy",
      languageHint: lessonLanguageHint || "auto",
    }),
    mimeType: "audio/mpeg",
    extension: "mp3",
    model: "tts-1",
    voice: lessonVoice || "alloy",
  };
};

const buildFallbackSegments = (transcriptText: string, durationMs: number) =>
  buildSegmentsFromTextAndDuration(
    transcriptText,
    durationMs > 0 ? durationMs : Math.max(8000, transcriptText.length * 40)
  );

const repair = async () => {
  const lessons = await prisma.lesson.findMany({
    where: {
      audioUrl: { not: null },
      ...(lessonIdFilter ? { id: lessonIdFilter } : {}),
    },
    select: {
      id: true,
      title: true,
      audioUrl: true,
      transcriptText: true,
      transcriptSegments: true,
      audioVoice: true,
      audioLanguageHint: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const missingLessons = lessons.filter((lesson) => !lessonAudioExists(lesson.audioUrl));

  console.log(
    `Found ${missingLessons.length} lesson(s) with missing audio file${lessonIdFilter ? ` for lesson ${lessonIdFilter}` : ""}.`
  );

  let repaired = 0;
  let failed = 0;

  for (const lesson of missingLessons) {
    const transcriptText = String(lesson.transcriptText || "").trim();
    if (!transcriptText) {
      failed += 1;
      console.error(`Skipping ${lesson.id} (${lesson.title}): transcriptText is empty.`);
      continue;
    }

    const maxChars = provider === "gemini" ? GEMINI_TTS_MAX_INPUT_CHARS : OPENAI_TTS_MAX_INPUT_CHARS;
    if (transcriptText.length > maxChars) {
      failed += 1;
      console.error(
        `Skipping ${lesson.id} (${lesson.title}): transcript length ${transcriptText.length} exceeds ${provider} limit ${maxChars}.`
      );
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] Would regenerate audio for ${lesson.id} (${lesson.title}).`);
      repaired += 1;
      continue;
    }

    try {
      const generatedAudio = await generateAudio(
        transcriptText,
        lesson.audioVoice || null,
        lesson.audioLanguageHint || null
      );

      const durationMs = await parseAudioDurationMs(generatedAudio.buffer, generatedAudio.mimeType).catch(() => 0);

      let transcriptSegments: unknown = lesson.transcriptSegments || buildFallbackSegments(transcriptText, durationMs);

      try {
        const aligned = await transcribeMp3WithTimestamps(generatedAudio.buffer, transcriptText, {
          mimeType: generatedAudio.mimeType,
          fileName: `lesson-audio.${generatedAudio.extension || "mp3"}`,
          languageHint: lesson.audioLanguageHint || undefined,
        });

        if (aligned.words.length) {
          const spokenText = aligned.words
            .map((item) => String(item.text || "").trim())
            .filter(Boolean)
            .join(" ");
          const coverage = computeTokenCoverage(transcriptText, spokenText);
          const timelineEndMs = getTimelineEndMs(aligned.words);
          const timingGap =
            durationMs > 0 && timelineEndMs > 0 ? Math.abs(timelineEndMs - durationMs) / durationMs : 0;

          if ((coverage === null || coverage >= 0.82) && timingGap <= 0.22) {
            transcriptSegments = {
              segments: aligned.segments,
              words: aligned.words,
            };
          }
        }
      } catch (alignmentError) {
        console.warn(`Alignment fallback used for ${lesson.id}: ${(alignmentError as Error)?.message || alignmentError}`);
      }

      const audioUrl = await writeLessonAudio(
        lesson.id,
        generatedAudio.buffer,
        generatedAudio.extension || "mp3"
      );

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          audioUrl,
          audioDurationMs: durationMs || null,
          audioGeneratedAt: new Date(),
          transcriptSegments: transcriptSegments as any,
          audioVoice: generatedAudio.voice || lesson.audioVoice || undefined,
          audioLanguageHint: lesson.audioLanguageHint || "auto",
        },
      });

      repaired += 1;
      console.log(`Repaired ${lesson.id} (${lesson.title}) -> ${audioUrl}`);
    } catch (error) {
      failed += 1;
      console.error(`Failed ${lesson.id} (${lesson.title}):`, error);
    }
  }

  console.log(`Repair complete. Success: ${repaired}, Failed: ${failed}`);
};

repair()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
