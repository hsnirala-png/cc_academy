import OpenAI from "openai";
import { AppError } from "../../utils/appError";

export type LessonAiContext = {
  lessonId: string;
  lessonTitle: string;
  chapterTitle: string;
  courseTitle: string;
  transcriptText: string;
  transcriptSegments: Array<{
    startMs: number;
    endMs: number;
    text: string;
  }>;
};

export type LessonAiHistoryMessage = {
  role: "USER" | "ASSISTANT";
  content: string;
};

export type GenerateLessonAiReplyInput = {
  context: LessonAiContext;
  userMessage: string;
  selectedText?: string;
  history: LessonAiHistoryMessage[];
  requestType?: string;
  responseLanguage?: string | null;
};

export type GenerateLessonAiReplyResult = {
  content: string;
  tokenUsage: number | null;
  provider: string;
  model: string;
};

export interface LessonAiProvider {
  generateReply(input: GenerateLessonAiReplyInput): Promise<GenerateLessonAiReplyResult>;
}

const FALLBACK_NO_CONTEXT_MESSAGE =
  "The current lesson does not contain enough information to answer that safely.";
const LESSON_AI_UNAVAILABLE_MESSAGE =
  "Lesson AI is temporarily unavailable. Please try again later.";
const LESSON_AI_SELECTION_NEEDS_MORE_CONTEXT_MESSAGE =
  "Please select a clearer part of the transcript, or ask for a general lesson explanation.";

const LESSON_AI_CONTEXT_CHAR_LIMIT = 14000;
const LESSON_AI_HISTORY_CHAR_LIMIT = 5000;
const LESSON_AI_SELECTED_TEXT_CHAR_LIMIT = 2500;

const clipText = (value: string, limit: number) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3)).trim()}...`;
};

const normalizeWhitespace = (value: string) =>
  String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const buildTranscriptFromSegments = (
  segments: Array<{
    startMs: number;
    endMs: number;
    text: string;
  }>
) =>
  segments
    .map((segment) => String(segment?.text || "").trim())
    .filter(Boolean)
    .join("\n");

const normalizeRequestType = (value?: string) => String(value || "CHAT").trim().toUpperCase() || "CHAT";

const normalizeResponseLanguage = (value?: string | null) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "punjabi") return "Punjabi";
  if (normalized === "hindi") return "Hindi";
  if (normalized === "english") return "English";
  return "";
};

const buildRequestTypeGuidance = (requestType: string) => {
  if (requestType === "SUMMARIZE") {
    return "Return concise study notes for revision. Focus on the main lesson idea, a simple explanation, and an exam point.";
  }

  if (requestType === "EXPLAIN_SELECTION") {
    return "Explain the selected lesson text first. Then connect it to the lesson only if that connection is clearly supported by the supplied context.";
  }

  if (requestType.startsWith("EXPLAIN_SELECTION_")) {
    return "Explain the selected lesson text first. Then connect it to the lesson only if that connection is clearly supported by the supplied context. Keep the answer in the requested language.";
  }

  if (requestType === "EXPLAIN_LESSON" || requestType.startsWith("EXPLAIN_LESSON_")) {
    return "Treat this as a lesson-grounded concept explanation. If the student's wording is different from the transcript, you may paraphrase only when the concept is clearly supported by the supplied lesson context. If not clearly supported, use the fallback message.";
  }

  return "Treat this as a grounded lesson explanation, not open-ended chat. Answer only when the concept is clearly supported by the supplied lesson context.";
};

const extractPrimaryStudyText = (input: GenerateLessonAiReplyInput) => {
  const selectedText = normalizeWhitespace(String(input.selectedText || ""));
  if (selectedText) return selectedText;
  return (
    normalizeWhitespace(input.context.transcriptText) || buildTranscriptFromSegments(input.context.transcriptSegments)
  );
};

const buildExamStudyNotes = (sourceText: string, requestedLanguage: string) => {
  const sentences = sourceText
    .split(/(?<=[.?!])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const concept = clipText(sentences[0] || sourceText, 220);
  const explanation = clipText(sentences.slice(0, 2).join(" ") || sourceText, 420);
  const examPoint = clipText(sentences.slice(0, 3).join(" ") || sourceText, 300);

  if (requestedLanguage === "Hindi") {
    return [
      "स्टडी नोट्स:",
      `- मुख्य विचार: ${concept}`,
      `- सरल समझ: इस पाठ के अनुसार, ${explanation}`,
      `- परीक्षा बिंदु: ${examPoint}`,
    ].join("\n");
  }

  if (requestedLanguage === "Punjabi") {
    return [
      "ਸਟਡੀ ਨੋਟਸ:",
      `- ਮੁੱਖ ਧਾਰਨਾ: ${concept}`,
      `- ਸੌਖੀ ਸਮਝ: ਇਸ ਪਾਠ ਅਨੁਸਾਰ, ${explanation}`,
      `- ਪੇਪਰ ਪੁਆਇੰਟ: ${examPoint}`,
    ].join("\n");
  }

  return [
    "Study Notes:",
    `- Concept: ${concept}`,
    `- Simple explanation: ${explanation}`,
    `- Exam point: ${examPoint}`,
  ].join("\n");
};

const buildTeacherStyleExplanation = (
  sourceText: string,
  requestedLanguage: string,
  hasSelectedText: boolean
) => {
  const sentences = sourceText
    .split(/(?<=[.?!])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const concept = clipText(sentences[0] || sourceText, 220);
  const explanation = clipText(sentences.slice(0, 2).join(" ") || sourceText, 420);
  const examPoint = clipText(sentences.slice(0, 3).join(" ") || sourceText, 280);

  if (requestedLanguage === "Hindi") {
    return [
      `विषय: ${concept}`,
      `सरल समझ: इस पाठ के अनुसार, ${explanation}`,
      `परीक्षा बिंदु: ${hasSelectedText ? "चुने गए हिस्से को इसी विचार से जोड़कर याद रखें।" : examPoint}`,
    ].join("\n");
  }

  if (requestedLanguage === "Punjabi") {
    return [
      `ਧਾਰਨਾ: ${concept}`,
      `ਸੌਖੀ ਸਮਝ: ਇਸ ਪਾਠ ਅਨੁਸਾਰ, ${explanation}`,
      `ਪੇਪਰ ਪੁਆਇੰਟ: ${hasSelectedText ? "ਚੁਣੇ ਹੋਏ ਹਿੱਸੇ ਨੂੰ ਇਸੇ ਵਿਚਾਰ ਨਾਲ ਜੋੜ ਕੇ ਯਾਦ ਕਰੋ।" : examPoint}`,
    ].join("\n");
  }

  return [
    `Concept: ${concept}`,
    `Simple explanation: ${explanation}`,
    `Exam point: ${hasSelectedText ? "Revise the selected line together with this core lesson idea." : examPoint}`,
  ].join("\n");
};

const buildGroundingContextText = (context: LessonAiContext, selectedText?: string) => {
  const transcriptText =
    normalizeWhitespace(context.transcriptText) || buildTranscriptFromSegments(context.transcriptSegments);
  const groundedTranscript = clipText(transcriptText, LESSON_AI_CONTEXT_CHAR_LIMIT);
  const selectedBlock = clipText(
    normalizeWhitespace(String(selectedText || "")),
    LESSON_AI_SELECTED_TEXT_CHAR_LIMIT
  );

  return [
    `Lesson Title: ${context.lessonTitle || "-"}`,
    `Chapter: ${context.chapterTitle || "-"}`,
    `Course: ${context.courseTitle || "-"}`,
    selectedBlock ? `Selected Text:\n${selectedBlock}` : "",
    groundedTranscript ? `Lesson Transcript:\n${groundedTranscript}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

const buildHistoryText = (history: LessonAiHistoryMessage[]) => {
  if (!Array.isArray(history) || !history.length) return "";
  const normalized = history
    .filter((message) => message.role === "USER")
    .slice(-8)
    .map((message) => {
      return `Student: ${String(message.content || "").trim()}`;
    })
    .filter(Boolean)
    .join("\n");
  return clipText(normalized, LESSON_AI_HISTORY_CHAR_LIMIT);
};

export const buildSystemPrompt = () =>
  [
    "You are CC Academy Lesson AI Teacher for an exam-prep platform.",
    "Behave like a patient teacher helping a student revise for an exam, not like a generic chatbot.",
    "You must answer strictly and only from the supplied lesson context.",
    "Do not use outside knowledge, prior knowledge, or internet knowledge.",
    `If the answer is missing from the lesson context, reply exactly: "${FALLBACK_NO_CONTEXT_MESSAGE}"`,
    "Keep answers concise unless the student explicitly asks for more detail.",
    "Use simple, student-friendly wording and explain step by step when needed.",
    "When it fits, structure the reply with these short sections: Concept, Simple explanation, Exam point.",
    "For lesson summaries, return concise study notes with short bullets or short labeled sections.",
    "If selected lesson text is provided, explain that exact excerpt first before expanding to the surrounding lesson context.",
    "If the student asks for Punjabi, Hindi, or English explanation, answer in that language using only the provided lesson context.",
    "If no explicit answer language is requested, answer in the same language as the student's question whenever possible.",
    "For lesson explanation requests, a grounded paraphrase is allowed only when the concept is clearly supported by the supplied lesson transcript/context.",
    "Do not fabricate formulas, definitions, facts, or examples not present in the context.",
  ].join(" ");

export const buildUserPrompt = (input: GenerateLessonAiReplyInput) => {
  const historyText = buildHistoryText(input.history);
  const contextText = buildGroundingContextText(input.context, input.selectedText);
  const requestType = normalizeRequestType(input.requestType);
  const responseLanguage = normalizeResponseLanguage(input.responseLanguage);
  return [
    historyText ? `Conversation History:\n${historyText}` : "",
    `Requested Response Mode: ${requestType}`,
    responseLanguage ? `Requested Answer Language: ${responseLanguage}` : "",
    `Request Guidance: ${buildRequestTypeGuidance(requestType)}`,
    `Current Student Request:\n${String(input.userMessage || "").trim()}`,
    `Grounded Lesson Context:\n${contextText}`,
  ]
    .filter(Boolean)
    .join("\n\n");
};

class MockLessonAiProvider implements LessonAiProvider {
  async generateReply(input: GenerateLessonAiReplyInput): Promise<GenerateLessonAiReplyResult> {
    const transcriptText = extractPrimaryStudyText({
      ...input,
      selectedText: "",
    });
    const selectedText = normalizeWhitespace(String(input.selectedText || ""));
    const requestType = normalizeRequestType(input.requestType);
    const requestedLanguage = normalizeResponseLanguage(input.responseLanguage);

    if (!transcriptText) {
      return {
        content: FALLBACK_NO_CONTEXT_MESSAGE,
        tokenUsage: null,
        provider: "mock",
        model: "mock-grounded",
      };
    }

    const sourceText = selectedText || transcriptText;
    let content = buildTeacherStyleExplanation(sourceText, requestedLanguage, Boolean(selectedText));
    if (requestType === "SUMMARIZE") {
      content = buildExamStudyNotes(sourceText, requestedLanguage);
    } else if (requestType === "EXPLAIN_SELECTION" && selectedText) {
      content = buildTeacherStyleExplanation(selectedText, requestedLanguage, true);
    }

    return {
      content,
      tokenUsage: null,
      provider: "mock",
      model: "mock-grounded",
    };
  }
}

class DisabledLessonAiProvider implements LessonAiProvider {
  constructor(private readonly message: string) {}

  async generateReply(): Promise<GenerateLessonAiReplyResult> {
    throw new AppError(this.message, 503, "LESSON_AI_PROVIDER_UNAVAILABLE");
  }
}

class OpenAiLessonAiProvider implements LessonAiProvider {
  private client: OpenAI;

  constructor(private readonly model: string, apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateReply(input: GenerateLessonAiReplyInput): Promise<GenerateLessonAiReplyResult> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(),
        },
        {
          role: "user",
          content: buildUserPrompt(input),
        },
      ],
    });

    const content = String(response.choices?.[0]?.message?.content || "").trim();
    if (!content) {
      throw new AppError("Lesson AI provider returned an empty response.", 502);
    }

    return {
      content,
      tokenUsage: Number(response.usage?.total_tokens || 0) || null,
      provider: "openai",
      model: this.model,
    };
  }
}

export const createLessonAiProvider = (): LessonAiProvider => {
  const configuredProvider = String(process.env.LESSON_AI_PROVIDER || "")
    .trim()
    .toLowerCase();
  const openAiApiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const openAiModel = String(process.env.OPENAI_LESSON_AI_MODEL || "gpt-4o-mini").trim() || "gpt-4o-mini";

  if (configuredProvider === "openai" && !openAiApiKey) {
    return new DisabledLessonAiProvider(LESSON_AI_UNAVAILABLE_MESSAGE);
  }

  if (configuredProvider && configuredProvider !== "openai" && configuredProvider !== "mock") {
    return new DisabledLessonAiProvider(LESSON_AI_UNAVAILABLE_MESSAGE);
  }

  if ((configuredProvider === "openai" || (!configuredProvider && openAiApiKey)) && openAiApiKey) {
    return new OpenAiLessonAiProvider(openAiModel, openAiApiKey);
  }

  return new MockLessonAiProvider();
};

export const lessonAiFallbackMessage = FALLBACK_NO_CONTEXT_MESSAGE;
export const lessonAiSelectionNeedsMoreContextMessage = LESSON_AI_SELECTION_NEEDS_MORE_CONTEXT_MESSAGE;
export const lessonAiUnavailableMessage = LESSON_AI_UNAVAILABLE_MESSAGE;
