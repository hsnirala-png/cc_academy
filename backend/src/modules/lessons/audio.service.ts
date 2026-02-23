import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const audioOutputDir = path.resolve(__dirname, "../../../../frontend/public/audio");

export const generateAudioFromText = async (text: string): Promise<Buffer> => {
  const normalized = text.trim();
  if (!normalized) {
    return Buffer.alloc(0);
  }

  // Placeholder provider: replace with real TTS integration.
  return Buffer.from(normalized, "utf8");
};

export const createLessonAudioFile = async (
  lessonId: string,
  transcriptText: string
): Promise<string> => {
  const audioBuffer = await generateAudioFromText(transcriptText);
  const fileName = `${lessonId}.mp3`;
  const filePath = path.join(audioOutputDir, fileName);

  await mkdir(audioOutputDir, { recursive: true });
  await writeFile(filePath, audioBuffer);

  return `/public/audio/${fileName}`;
};

