import OpenAI from "openai";

type GenerateSpeechOptions = {
  model?: string;
  voice?: string;
  languageHint?: string;
};

type CreateCustomVoiceInput = {
  name: string;
  description?: string;
  consentStatement: string;
  consentAudioBase64: string;
  consentAudioMimeType?: string;
  sampleAudioBase64: string;
  sampleAudioMimeType?: string;
};

export type CustomVoiceItem = {
  id: string;
  name: string;
  createdAt?: string | null;
  description?: string | null;
};

export type TimedTranscriptItem = {
  startMs: number;
  endMs: number;
  text: string;
};

let openaiClient: OpenAI | null = null;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com";

const getOpenAiClient = (): OpenAI => {
  if (openaiClient) return openaiClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
};

const getApiKey = (): string => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
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

const throwOpenAiHttpError = async (response: Response, fallbackMessage: string): Promise<never> => {
  const payload = await parseJsonResponse(response);
  const err = new Error(
    String(payload?.error?.message || payload?.message || fallbackMessage || "OpenAI request failed.")
  ) as Error & { status?: number; code?: string };
  err.status = response.status;
  err.code = String(payload?.error?.code || payload?.code || "");
  throw err;
};

const decodeBase64Audio = (value: string, fieldLabel: string): Buffer => {
  const raw = String(value || "").trim();
  if (!raw) throw new Error(`${fieldLabel} is required.`);

  const withoutPrefix = raw.includes(",") ? raw.split(",").slice(-1)[0] : raw;
  const normalized = withoutPrefix.replace(/\s/g, "");
  const buffer = Buffer.from(normalized, "base64");
  if (!buffer.length) throw new Error(`${fieldLabel} is invalid base64 audio.`);
  return buffer;
};

const normalizeTimedItems = (rows: any[], textKeyCandidates: string[]): TimedTranscriptItem[] => {
  if (!Array.isArray(rows) || !rows.length) return [];

  const normalized = rows
    .map((row, index) => {
      const startSeconds = Number(row?.start ?? row?.start_time ?? row?.startTime ?? 0);
      const endSecondsRaw = Number(row?.end ?? row?.end_time ?? row?.endTime ?? 0);
      const text = textKeyCandidates
        .map((key) => String(row?.[key] ?? "").trim())
        .find((value) => Boolean(value));
      if (!Number.isFinite(startSeconds) || startSeconds < 0 || !text) return null;

      const nextStartSeconds =
        index < rows.length - 1 ? Number(rows[index + 1]?.start ?? rows[index + 1]?.start_time ?? 0) : NaN;
      const resolvedEndSeconds =
        Number.isFinite(endSecondsRaw) && endSecondsRaw > startSeconds
          ? endSecondsRaw
          : Number.isFinite(nextStartSeconds) && nextStartSeconds > startSeconds
            ? nextStartSeconds
            : startSeconds + 0.24;

      return {
        startMs: Math.max(0, Math.round(startSeconds * 1000)),
        endMs: Math.max(1, Math.round(resolvedEndSeconds * 1000)),
        text,
      };
    })
    .filter((row): row is TimedTranscriptItem => Boolean(row));

  return normalized.filter((row) => row.endMs > row.startMs);
};

export const generateSpeechMp3Buffer = async (
  text: string,
  options: GenerateSpeechOptions = {}
): Promise<Buffer> => {
  const input = String(text || "").trim();
  if (!input) {
    throw new Error("Transcript text is required for TTS generation.");
  }

  const model = String(options.model || "tts-1").trim() || "tts-1";
  const voice = String(options.voice || "alloy").trim() || "alloy";

  const response = await getOpenAiClient().audio.speech.create({
    model,
    voice,
    input,
    response_format: "mp3",
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const transcribeMp3WithTimestamps = async (
  mp3Buffer: Buffer,
  referenceText?: string,
  options: { mimeType?: string; fileName?: string } = {}
): Promise<{ segments: TimedTranscriptItem[]; words: TimedTranscriptItem[] }> => {
  if (!mp3Buffer?.length) {
    return { segments: [], words: [] };
  }

  const fileMimeType = String(options.mimeType || "audio/mpeg").trim() || "audio/mpeg";
  const fileName = String(options.fileName || "lesson-audio.mp3").trim() || "lesson-audio.mp3";

  const form = new FormData();
  form.append("file", new Blob([mp3Buffer], { type: fileMimeType }), fileName);
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("timestamp_granularities[]", "word");
  form.append("temperature", "0");
  const prompt = String(referenceText || "")
    .replace(/\s+/g, " ")
    .trim();
  if (prompt) {
    form.append("prompt", prompt.slice(0, 3500));
  }

  const response = await fetch(`${OPENAI_API_BASE}/v1/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: form,
  });

  if (!response.ok) {
    await throwOpenAiHttpError(response, "Unable to transcribe generated audio.");
  }

  const payload = await parseJsonResponse(response);
  const segments = normalizeTimedItems(payload?.segments, ["text", "transcript"]);
  const words = normalizeTimedItems(payload?.words, ["word", "text"]);

  return { segments, words };
};

const listFromPayload = (payload: any): any[] => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.voices)) return payload.voices;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const listCustomVoices = async (): Promise<CustomVoiceItem[]> => {
  const response = await fetch(`${OPENAI_API_BASE}/v1/audio/voices`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  });

  if (!response.ok) {
    await throwOpenAiHttpError(response, "Unable to list custom voices.");
  }

  const payload = await parseJsonResponse(response);
  const rows = listFromPayload(payload);
  return rows
    .map((row: any) => ({
      id: String(row?.id || row?.voice_id || "").trim(),
      name: String(row?.name || row?.display_name || row?.id || row?.voice_id || "").trim(),
      createdAt: row?.created_at ? String(row.created_at) : null,
      description: row?.description ? String(row.description) : null,
    }))
    .filter((row: CustomVoiceItem) => Boolean(row.id));
};

const createVoiceConsent = async (payload: {
  name: string;
  consentStatement: string;
  consentAudio: Buffer;
  consentAudioMimeType?: string;
}): Promise<string> => {
  const form = new FormData();
  const mimeType = String(payload.consentAudioMimeType || "audio/mpeg");
  form.append("name", `${payload.name} consent`);
  form.append("consent_statement", payload.consentStatement);
  form.append("audio", new Blob([payload.consentAudio], { type: mimeType }), "consent-audio.mp3");

  const response = await fetch(`${OPENAI_API_BASE}/v1/audio/voice_consents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: form,
  });

  if (!response.ok) {
    await throwOpenAiHttpError(response, "Unable to create voice consent.");
  }

  const result = await parseJsonResponse(response);
  const consentId = String(result?.id || result?.consent_id || "").trim();
  if (!consentId) {
    throw new Error("Voice consent created but consent id missing in response.");
  }
  return consentId;
};

export const createCustomVoice = async (input: CreateCustomVoiceInput): Promise<CustomVoiceItem> => {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Voice name is required.");

  const consentStatement = String(input.consentStatement || "").trim();
  if (!consentStatement) {
    throw new Error("Consent statement is required.");
  }

  const consentAudio = decodeBase64Audio(input.consentAudioBase64, "Consent audio");
  const sampleAudio = decodeBase64Audio(input.sampleAudioBase64, "Sample audio");

  const consentId = await createVoiceConsent({
    name,
    consentStatement,
    consentAudio,
    consentAudioMimeType: input.consentAudioMimeType,
  });

  const voiceForm = new FormData();
  const sampleMimeType = String(input.sampleAudioMimeType || "audio/mpeg");
  voiceForm.append("name", name);
  voiceForm.append("description", String(input.description || "").trim());
  voiceForm.append("consent_id", consentId);
  voiceForm.append("audio", new Blob([sampleAudio], { type: sampleMimeType }), "voice-sample.mp3");

  const response = await fetch(`${OPENAI_API_BASE}/v1/audio/voices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: voiceForm,
  });

  if (!response.ok) {
    await throwOpenAiHttpError(response, "Unable to create custom voice.");
  }

  const payload = await parseJsonResponse(response);
  const id = String(payload?.id || payload?.voice_id || "").trim();
  if (!id) {
    throw new Error("Custom voice created but voice id missing in response.");
  }

  return {
    id,
    name: String(payload?.name || name).trim() || name,
    createdAt: payload?.created_at ? String(payload.created_at) : null,
    description: payload?.description ? String(payload.description) : null,
  };
};
