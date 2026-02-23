type GeminiGenerateSpeechOptions = {
  model?: string;
  voice?: string;
  languageHint?: string;
};

export type GeneratedGeminiAudio = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  model: string;
  voice: string;
};

const GEMINI_API_BASE = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com";
const DEFAULT_GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const DEFAULT_GEMINI_TTS_VOICE = process.env.GEMINI_TTS_VOICE || "Kore";

const getGeminiApiKey = (): string => {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return apiKey;
};

const parseJsonResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const throwGeminiHttpError = async (response: Response, fallbackMessage: string): Promise<never> => {
  const payload = await parseJsonResponse(response);
  const err = new Error(
    String(
      payload?.error?.message ||
        payload?.message ||
        payload?.candidates?.[0]?.finishReason ||
        fallbackMessage ||
        "Gemini request failed."
    )
  ) as Error & { status?: number; code?: string };
  err.status = response.status;
  err.code = String(payload?.error?.status || payload?.error?.code || "");
  throw err;
};

const extractInlineAudioPart = (payload: any): { data: string; mimeType: string } | null => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    const inline = part?.inlineData || part?.inline_data;
    const data = String(inline?.data || "").trim();
    const mimeType = String(inline?.mimeType || inline?.mime_type || "audio/wav").trim();
    if (data) {
      return {
        data,
        mimeType: mimeType || "audio/wav",
      };
    }
  }
  return null;
};

const extractModelTextMessage = (payload: any): string => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  for (const part of parts) {
    const text = String(part?.text || "").trim();
    if (text) return text;
  }
  return "";
};

const extensionFromMimeType = (mimeType: string): string => {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.includes("mpeg") || normalized.includes("mp3")) return "mp3";
  if (normalized.includes("wav") || normalized.includes("wave")) return "wav";
  if (normalized.includes("pcm") || normalized.includes("l16")) return "wav";
  if (normalized.includes("ogg")) return "ogg";
  if (normalized.includes("mp4")) return "m4a";
  return "wav";
};

const parseMimeParamInt = (mimeType: string, key: string): number | null => {
  const match = String(mimeType || "")
    .toLowerCase()
    .match(new RegExp(`${key}\\s*=\\s*([0-9]+)`));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const isRawPcmMimeType = (mimeType: string): boolean => {
  const normalized = String(mimeType || "").toLowerCase();
  return normalized.includes("audio/pcm") || normalized.includes("audio/l16");
};

const wrapPcm16LeAsWav = (pcmBuffer: Buffer, sampleRate = 24000, channels = 1): Buffer => {
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
};

export const generateGeminiSpeechBuffer = async (
  text: string,
  options: GeminiGenerateSpeechOptions = {}
): Promise<GeneratedGeminiAudio> => {
  const input = String(text || "").trim();
  if (!input) {
    throw new Error("Transcript text is required for Gemini TTS generation.");
  }

  const model = String(options.model || DEFAULT_GEMINI_TTS_MODEL).trim() || DEFAULT_GEMINI_TTS_MODEL;
  const voice = String(options.voice || DEFAULT_GEMINI_TTS_VOICE).trim() || DEFAULT_GEMINI_TTS_VOICE;
  const languageHint = String(options.languageHint || "auto").trim();

  const promptText =
    languageHint && languageHint.toLowerCase() !== "auto"
      ? `Speak naturally in ${languageHint}. Keep words exactly as provided.\n\n${input}`
      : input;

  const response = await fetch(
    `${GEMINI_API_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(getGeminiApiKey())}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    await throwGeminiHttpError(response, "Unable to generate Gemini voice.");
  }

  const payload = await parseJsonResponse(response);
  const inline = extractInlineAudioPart(payload);
  if (!inline?.data) {
    const modelText = extractModelTextMessage(payload);
    throw new Error(
      modelText
        ? `Gemini did not return audio. Model response: ${modelText.slice(0, 300)}`
        : "Gemini response did not include audio data. Verify TTS model/voice settings."
    );
  }

  const buffer: Buffer = Buffer.from(inline.data, "base64");
  if (!buffer.length) {
    throw new Error("Gemini audio payload was empty.");
  }

  let mimeType = inline.mimeType || "audio/wav";
  let resolvedBuffer = buffer;
  if (isRawPcmMimeType(mimeType)) {
    const sampleRate = parseMimeParamInt(mimeType, "rate") || 24000;
    const channels = parseMimeParamInt(mimeType, "channels") || 1;
    resolvedBuffer = wrapPcm16LeAsWav(buffer, sampleRate, channels);
    mimeType = "audio/wav";
  }

  return {
    buffer: resolvedBuffer,
    mimeType,
    extension: extensionFromMimeType(mimeType),
    model,
    voice,
  };
};
