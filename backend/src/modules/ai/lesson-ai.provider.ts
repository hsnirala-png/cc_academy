import OpenAI from "openai";
import { AppError } from "../../utils/appError";
import {
  isLessonAiMcqSet,
  LessonAiMcqOption,
  LessonAiMcqOptionKey,
  LessonAiMcqSet,
} from "./lesson-ai-mcq";

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
  mcqSet?: LessonAiMcqSet | null;
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

const splitSourceSentences = (sourceText: string) =>
  String(sourceText || "")
    .split(/(?<=[.?!])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

const buildRequestTypeGuidance = (requestType: string) => {
  if (requestType === "SUMMARIZE") {
    return "Return concise study notes for revision. Focus on the main lesson idea, a simple explanation, and an exam point.";
  }

  if (requestType === "KEY_EXAM_POINTS") {
    return "Return short, high-yield revision notes from this lesson only. Keep them concise, exam-oriented, and easy to revise.";
  }

  if (requestType === "ASK_3_MCQS") {
    return "Create exactly 3 lesson-grounded MCQs. Each MCQ must have 4 options. Put the correct answers only after all 3 questions. Do not include facts or options that are not clearly supported by the supplied lesson context.";
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
  const sentences = splitSourceSentences(sourceText);
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

const buildKeyExamPoints = (sourceText: string, requestedLanguage: string) => {
  const sentences = splitSourceSentences(sourceText);
  const points = (sentences.length ? sentences : [sourceText])
    .slice(0, 4)
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);

  if (requestedLanguage === "Hindi") {
    return [
      "मुख्य परीक्षा बिंदु:",
      ...points.map((point) => `- ${point}`),
    ].join("\n");
  }

  if (requestedLanguage === "Punjabi") {
    return [
      "ਮੁੱਖ ਪੇਪਰ ਪੁਆਇੰਟ:",
      ...points.map((point) => `- ${point}`),
    ].join("\n");
  }

  return [
    "Key Exam Points:",
    ...points.map((point) => `- ${point}`),
  ].join("\n");
};

const buildMcqOptionsFromPool = (optionPool: string[]): LessonAiMcqOption[] =>
  optionPool.slice(0, 4).map((option, index) => ({
    key: (["A", "B", "C", "D"][index] || "A") as LessonAiMcqOptionKey,
    text: option,
  }));

const buildLessonMcqSet = (sourceText: string, requestedLanguage: string): LessonAiMcqSet => {
  const sentences = splitSourceSentences(sourceText);
  const optionPool = (sentences.length ? sentences : [sourceText])
    .slice(0, 4)
    .map((item) => clipText(item, 110))
    .filter(Boolean);

  while (optionPool.length < 4) {
    optionPool.push(clipText(sourceText, 110));
  }

  const stems =
    requestedLanguage === "Hindi"
      ? [
          "इस पाठ के अनुसार कौन-सा बिंदु सही है?",
          "इस पाठ में किस विचार पर ज़ोर दिया गया है?",
          "पुनरावृत्ति के लिए कौन-सा विचार इसी पाठ से लिया गया है?",
        ]
      : requestedLanguage === "Punjabi"
        ? [
            "ਇਸ ਪਾਠ ਅਨੁਸਾਰ ਕਿਹੜਾ ਬਿੰਦੂ ਸਹੀ ਹੈ?",
            "ਇਸ ਪਾਠ ਵਿੱਚ ਕਿਸ ਵਿਚਾਰ ਉੱਤੇ ਜ਼ੋਰ ਦਿੱਤਾ ਗਿਆ ਹੈ?",
            "ਦੁਹਰਾਈ ਲਈ ਕਿਹੜਾ ਵਿਚਾਰ ਇਸੇ ਪਾਠ ਤੋਂ ਲਿਆ ਗਿਆ ਹੈ?",
          ]
        : [
            "According to this lesson, which point is correct?",
            "Which idea is emphasized in this lesson?",
            "Which idea should a student revise from this lesson?",
          ];

  const labels = ["A", "B", "C", "D"] as const;
  const title =
    requestedLanguage === "Hindi"
      ? "3 Lesson MCQs"
      : requestedLanguage === "Punjabi"
        ? "3 Lesson MCQs"
        : "3 Lesson MCQs";
  const questions = [];

  for (let index = 0; index < 3; index += 1) {
    const correctIndex = index % 4;
    questions.push({
      id: `q${index + 1}`,
      question: stems[index],
      options: buildMcqOptionsFromPool(optionPool),
      correctAnswer: labels[correctIndex],
      explanation:
        requestedLanguage === "Hindi"
          ? "यह सही उत्तर सीधे इसी पाठ की दी गई जानकारी से लिया गया है।"
          : requestedLanguage === "Punjabi"
            ? "ਇਹ ਸਹੀ ਜਵਾਬ ਸਿੱਧਾ ਇਸੇ ਪਾਠ ਦੀ ਦਿੱਤੀ ਜਾਣਕਾਰੀ ਤੋਂ ਲਿਆ ਗਿਆ ਹੈ।"
            : "This correct answer comes directly from the current lesson content.",
    });
    optionPool.push(optionPool.shift() || optionPool[0]);
  }

  return {
    title,
    questions,
  };
};

const buildLessonMcqSummary = (requestedLanguage: string) => {
  if (requestedLanguage === "Hindi") {
    return "Opened 3 grounded lesson MCQs in the popup.";
  }
  if (requestedLanguage === "Punjabi") {
    return "Opened 3 grounded lesson MCQs in the popup.";
  }
  return "Opened 3 grounded lesson MCQs in the popup.";
};

const parseLessonMcqSet = (rawContent: string): LessonAiMcqSet | null => {
  try {
    const parsed = JSON.parse(rawContent);
    return isLessonAiMcqSet(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const buildTeacherStyleExplanation = (
  sourceText: string,
  requestedLanguage: string,
  hasSelectedText: boolean
) => {
  const sentences = splitSourceSentences(sourceText);
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
    "For key exam points requests, return concise high-yield revision bullets from the lesson only.",
    "For MCQ requests, create exactly 3 MCQs with 4 options each and place the answer key after all 3 questions.",
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

export const buildRealtimeVoiceTutorInstructions = ({
  context,
  responseLanguage,
}: {
  context: LessonAiContext;
  responseLanguage?: string | null;
}) => {
  const requestedLanguage = normalizeResponseLanguage(responseLanguage);
  const contextText = buildGroundingContextText(context);
  return [
    buildSystemPrompt(),
    "This is a live voice tutoring session for the current lesson only.",
    "Speak naturally like a supportive exam-prep teacher.",
    "Keep spoken replies short, clear, and easy to follow unless the student asks for more detail.",
    "Answer follow-up questions only when they are clearly supported by the supplied lesson context.",
    "If the student asks for Punjabi, Hindi, or English, respond in that language when it is still grounded in the lesson.",
    requestedLanguage
      ? `Preferred spoken answer language for this session: ${requestedLanguage}.`
      : "",
    "If the student asks something outside this lesson, reply exactly with the fallback message and do not guess.",
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
    let mcqSet: LessonAiMcqSet | null = null;
    if (requestType === "SUMMARIZE") {
      content = buildExamStudyNotes(sourceText, requestedLanguage);
    } else if (requestType === "KEY_EXAM_POINTS") {
      content = buildKeyExamPoints(sourceText, requestedLanguage);
    } else if (requestType === "ASK_3_MCQS") {
      mcqSet = buildLessonMcqSet(sourceText, requestedLanguage);
      content = buildLessonMcqSummary(requestedLanguage);
    } else if (requestType === "EXPLAIN_SELECTION" && selectedText) {
      content = buildTeacherStyleExplanation(selectedText, requestedLanguage, true);
    }

    return {
      content,
      tokenUsage: null,
      provider: "mock",
      model: "mock-grounded",
      mcqSet,
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
    const requestType = normalizeRequestType(input.requestType);
    if (requestType === "ASK_3_MCQS") {
      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              buildSystemPrompt(),
              "For this request, return JSON only.",
              'Required JSON shape: {"title":"3 Lesson MCQs","questions":[{"id":"q1","question":"...","options":[{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],"correctAnswer":"A","explanation":"..."}]}',
              "Return exactly 3 questions.",
            ].join(" "),
          },
          {
            role: "user",
            content: buildUserPrompt(input),
          },
        ],
      });

      const rawContent = String(response.choices?.[0]?.message?.content || "").trim();
      const mcqSet = parseLessonMcqSet(rawContent);
      if (!mcqSet) {
        throw new AppError("Lesson AI provider returned invalid MCQ data.", 502);
      }

      return {
        content: buildLessonMcqSummary(normalizeResponseLanguage(input.responseLanguage)),
        tokenUsage: Number(response.usage?.total_tokens || 0) || null,
        provider: "openai",
        model: this.model,
        mcqSet,
      };
    }

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
      mcqSet: null,
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
