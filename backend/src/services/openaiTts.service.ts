const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";

export const generateSpeech = async (text: string): Promise<Buffer> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const input = String(text || "").trim();
  if (!input) {
    throw new Error("Text is required for speech generation.");
  }

  const response = await fetch(OPENAI_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      format: "mp3",
      input,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI TTS request failed (${response.status}): ${errorBody}`);
  }

  const audioArrayBuffer = await response.arrayBuffer();
  return Buffer.from(audioArrayBuffer);
};

