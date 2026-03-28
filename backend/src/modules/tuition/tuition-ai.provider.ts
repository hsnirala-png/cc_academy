import { TuitionDifficultyMode, TuitionSpeedMode } from "@prisma/client";
import { AppError } from "../../utils/appError";
import {
  buildTopicLessonContent,
  type LiveBoardAction,
  type LiveBoardContext,
  type LiveBoardLanguage,
  type LiveBoardLessonContent,
  type LiveBoardPayload,
  type LiveBoardSubjectFamily,
} from "./tuition-live-board-content";

export const tuitionAiVoiceUnavailableMessage =
  "Tuition voice tutor is unavailable right now. Please try again later.";

type TuitionVoiceContext = {
  boardName?: string | null;
  classLevel?: number | null;
  subjectName?: string | null;
  topicTitle: string;
  syllabusTitle?: string | null;
  voiceLanguage?: string | null;
};

type TuitionTeacherContext = {
  boardName?: string | null;
  classLevel?: number | null;
  subjectName?: string | null;
  topicTitle: string;
  explanationLanguage?: string | null;
  boardLanguage?: string | null;
  voiceLanguage?: string | null;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
  studentPrompt: string;
  messageNumber: number;
};

type TuitionVoiceSessionInput = {
  context: TuitionVoiceContext;
  voiceLanguage?: string | null;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
};

type TuitionRealtimeSessionRequest = {
  model: string;
  voice: string;
  instructions: string;
};

type TuitionRealtimeSessionResponse = {
  clientSecret: string;
  expiresAt: string | null;
  sessionId: string | null;
};

type TuitionRealtimeClient = {
  createSession(input: TuitionRealtimeSessionRequest): Promise<TuitionRealtimeSessionResponse>;
};

const normalizeText = (value: string | null | undefined): string =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeTeachingLanguage = (value: string | null | undefined): "English" | "Hindi" | "Punjabi" => {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "HINDI") return "Hindi";
  if (normalized === "PUNJABI") return "Punjabi";
  return "English";
};

const pickLanguage = (
  language: "English" | "Hindi" | "Punjabi",
  english: string,
  hindi: string,
  punjabi: string
): string => {
  if (language === "Hindi") return hindi;
  if (language === "Punjabi") return punjabi;
  return english;
};

type SubjectFamily = "MATHS" | "SCIENCE" | "LANGUAGE" | "SST" | "COMPUTER" | "GENERAL";

const inferSubjectFamily = (subjectName: string | null | undefined): SubjectFamily => {
  const normalized = normalizeText(subjectName).toUpperCase();
  if (normalized.includes("MATH")) return "MATHS";
  if (normalized.includes("SCIENCE")) return "SCIENCE";
  if (
    normalized.includes("ENGLISH") ||
    normalized.includes("HINDI") ||
    normalized.includes("PUNJABI") ||
    normalized.includes("GRAMMAR") ||
    normalized.includes("LANGUAGE")
  ) {
    return "LANGUAGE";
  }
  if (
    normalized.includes("SST") ||
    normalized.includes("SOCIAL") ||
    normalized.includes("HISTORY") ||
    normalized.includes("GEOGRAPHY") ||
    normalized.includes("CIVICS") ||
    normalized.includes("DEMOCRACY")
  ) {
    return "SST";
  }
  if (normalized.includes("COMPUTER") || normalized.includes("INFORMATICS") || normalized.includes("CODING")) {
    return "COMPUTER";
  }
  return "GENERAL";
};

const toLiveBoardLanguage = (
  language: "English" | "Hindi" | "Punjabi"
): LiveBoardLanguage => language;

const toLiveBoardSubjectFamily = (family: SubjectFamily): LiveBoardSubjectFamily => family;

const toIsoString = (value: string | number | null | undefined): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const timestampMs = value > 10_000_000_000 ? value : value * 1000;
    return new Date(timestampMs).toISOString();
  }
  const text = normalizeText(String(value || ""));
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const speedGuidance: Record<TuitionSpeedMode, string> = {
  SLOW: "Speak patiently, pause between ideas, and explain the chapter in small steps.",
  NORMAL: "Keep a balanced teaching pace with clear explanation and one direct example.",
  FAST: "Speak concisely, stay focused, and move quickly to the key application of the topic.",
};

const difficultyGuidance: Record<TuitionDifficultyMode, string> = {
  EASY: "Use simpler spoken wording, direct classroom examples, and gentle follow-up questions.",
  MEDIUM: "Use standard textbook depth with one clear example and one short check-for-understanding prompt.",
  HARD: "Use more reasoning, comparison, and application while staying inside the current chapter.",
};

const lessonSpeedGuidance: Record<TuitionSpeedMode, string> = {
  SLOW: "Break the explanation into smaller steps.",
  NORMAL: "Keep the explanation balanced and practical.",
  FAST: "Keep the explanation compact and move quickly to application.",
};

const lessonDifficultyGuidance: Record<TuitionDifficultyMode, string> = {
  EASY: "Use plain wording, direct examples, and one-step practice.",
  MEDIUM: "Use standard textbook depth with one worked example.",
  HARD: "Include deeper reasoning, comparison, and one application prompt.",
};

export type TuitionBoardPayload = {
  boardTitle: string;
  boardLines: string[];
  formulas: string[];
  steps: string[];
  exampleTitle: string | null;
  exampleSteps: string[];
};

export type TuitionTeachingSpeechChunk = {
  id: string;
  kind: "INTRO" | "EXPLAIN" | "FORMULA" | "DIAGRAM" | "EXAMPLE" | "RECAP" | "QUESTION";
  text: string;
};

export type TuitionTeachingBoardAction = {
  id: string;
  type:
    | "WRITE_TEXT"
    | "WRITE_BULLET"
    | "WRITE_FORMULA"
    | "WRITE_STEP"
    | "DRAW_BOX"
    | "DRAW_ARROW"
    | "DRAW_LABEL"
    | "HIGHLIGHT"
    | "SHOW_RECAP"
    | "ASK_STUDENT";
  lane: "title" | "notes" | "formula" | "steps" | "diagram" | "example" | "recap";
  text?: string;
  label?: string;
  targetId?: string;
  fromLabel?: string;
  toLabel?: string;
  accent?: "important" | "formula" | "example" | "question";
};

export type TuitionTeachingStep = {
  id: string;
  title: string;
  speechChunkId: string | null;
  actionIds: string[];
  autoDelayMs: number;
};

export type TuitionTeacherAssistantPayload = {
  replyText: string;
  title: string;
  chapterTitle: string;
  topicTitle: string;
  subjectName: string;
  explanationLanguage: string;
  boardLanguage: string;
  voiceLanguage: string;
  curriculumBoard: string | null;
  recapPoints: string[];
  nextSuggestedAction: string | null;
  progressUpdate: string | null;
  practiceQuestion: string | null;
  diagramInstructions: string[];
  boardTitle: string;
  boardLines: string[];
  formulas: string[];
  steps: string[];
  exampleTitle: string | null;
  exampleSteps: string[];
  teacherMode: "LIVE_BOARD";
  speechChunks: TuitionTeachingSpeechChunk[];
  boardActions: TuitionTeachingBoardAction[];
  teachingSteps: TuitionTeachingStep[];
};

type TuitionLessonContent = {
  boardPayload: TuitionBoardPayload;
  noteSpeech: string[];
  formulaSpeech: string[];
  stepSpeech: string[];
  exampleSpeech: string;
  recapSpeech: string;
  recapBoardText: string;
  recapPoints: string[];
  practiceQuestion: string;
  diagramInstructions: string[];
  diagramActions: TuitionTeachingBoardAction[];
};

const buildBoardLineCount = (speedMode: TuitionSpeedMode, difficultyMode: TuitionDifficultyMode): number => {
  if (speedMode === TuitionSpeedMode.FAST) return 3;
  if (speedMode === TuitionSpeedMode.SLOW) return difficultyMode === TuitionDifficultyMode.HARD ? 5 : 4;
  return difficultyMode === TuitionDifficultyMode.HARD ? 4 : 3;
};

const buildStepCount = (speedMode: TuitionSpeedMode, difficultyMode: TuitionDifficultyMode): number => {
  if (speedMode === TuitionSpeedMode.SLOW) return difficultyMode === TuitionDifficultyMode.HARD ? 5 : 4;
  if (speedMode === TuitionSpeedMode.FAST) return 2;
  return difficultyMode === TuitionDifficultyMode.HARD ? 4 : 3;
};
const subjectPatternLabel = (
  family: SubjectFamily,
  language: "English" | "Hindi" | "Punjabi"
): string => {
  if (family === "MATHS") {
    return pickLanguage(language, "stepwise derivation", "चरणबद्ध हल", "ਪੜਾਅਵਾਰ ਹੱਲ");
  }
  if (family === "SCIENCE") {
    return pickLanguage(language, "concept with observation and conclusion", "अवधारणा, कारण और निष्कर्ष", "ਧਾਰਣਾ, ਕਾਰਨ ਅਤੇ ਨਤੀਜਾ");
  }
  if (family === "LANGUAGE") {
    return pickLanguage(language, "rule, meaning, and example sentence", "नियम, अर्थ और उदाहरण", "ਨਿਯਮ, ਅਰਥ ਅਤੇ ਉਦਾਹਰਨ");
  }
  if (family === "SST") {
    return pickLanguage(language, "points, cause-effect, and flow", "बिंदु, कारण-परिणाम और प्रवाह", "ਬਿੰਦੂ, ਕਾਰਨ-ਪਰਭਾਵ ਅਤੇ ਪ੍ਰਵਾਹ");
  }
  if (family === "COMPUTER") {
    return pickLanguage(language, "concept, process, and practical use", "अवधारणा, प्रक्रिया और उपयोग", "ਧਾਰਣਾ, ਪ੍ਰਕਿਰਿਆ ਅਤੇ ਵਰਤੋਂ");
  }
  return pickLanguage(language, "main idea with one example", "मुख्य विचार और एक उदाहरण", "ਮੁੱਖ ਵਿਚਾਰ ਅਤੇ ਇੱਕ ਉਦਾਹਰਨ");
};

const buildSubjectFormulas = (
  subjectName: string,
  topicTitle: string,
  boardLanguage: "English" | "Hindi" | "Punjabi"
): string[] => {
  const family = inferSubjectFamily(subjectName);
  if (family === "MATHS") {
    return [
      pickLanguage(
        boardLanguage,
        "Rule: identify the known value -> choose the correct formula -> simplify carefully.",
        "नियम: दी गई राशि पहचानो -> सही सूत्र चुनो -> सावधानी से सरल करो।",
        "ਨਿਯਮ: ਦਿੱਤੀ ਰਕਮ ਪਛਾਣੋ -> ਸਹੀ ਫਾਰਮੂਲਾ ਚੁਣੋ -> ਧਿਆਨ ਨਾਲ ਸਰਲ ਕਰੋ।"
      ),
      pickLanguage(
        boardLanguage,
        "Check the answer by substitution, reverse thinking, or estimation.",
        "उत्तर को प्रतिस्थापन, उल्टी जाँच या अनुमान से जाँचो।",
        "ਉੱਤਰ ਨੂੰ substitution, ਉਲਟੀ ਜਾਂਚ ਜਾਂ ਅੰਦਾਜ਼ੇ ਨਾਲ ਜਾਂਚੋ।"
      ),
    ];
  }
  if (family === "SCIENCE") {
    return [
      pickLanguage(
        boardLanguage,
        "Science board rule: observation -> reason -> conclusion.",
        "विज्ञान बोर्ड नियम: प्रेक्षण -> कारण -> निष्कर्ष।",
        "ਵਿਗਿਆਨ ਬੋਰਡ ਨਿਯਮ: ਨਿਰੀਖਣ -> ਕਾਰਨ -> ਨਤੀਜਾ।"
      ),
      pickLanguage(
        boardLanguage,
        `Connect ${topicTitle} with one real-life effect or measurable result.`,
        `${topicTitle} को एक वास्तविक प्रभाव या मापने योग्य परिणाम से जोड़ो।`,
        `${topicTitle} ਨੂੰ ਇੱਕ ਵਾਸਤਵਿਕ ਪ੍ਰਭਾਵ ਜਾਂ ਮਾਪੇ ਜਾਣ ਵਾਲੇ ਨਤੀਜੇ ਨਾਲ ਜੋੜੋ।`
      ),
    ];
  }
  if (family === "LANGUAGE") {
    return [
      pickLanguage(
        boardLanguage,
        "Language rule: keyword -> meaning -> example sentence.",
        "भाषा नियम: मुख्य शब्द -> अर्थ -> उदाहरण वाक्य।",
        "ਭਾਸ਼ਾ ਨਿਯਮ: ਮੁੱਖ ਸ਼ਬਦ -> ਅਰਥ -> ਉਦਾਹਰਨ ਵਾਕ।"
      ),
      pickLanguage(
        boardLanguage,
        "Writing frame: point -> example -> clear conclusion.",
        "लेखन ढाँचा: बिंदु -> उदाहरण -> साफ निष्कर्ष।",
        "ਲਿਖਤ ਢਾਂਚਾ: ਬਿੰਦੂ -> ਉਦਾਹਰਨ -> ਸਾਫ ਨਤੀਜਾ।"
      ),
    ];
  }
  if (family === "SST") {
    return [
      pickLanguage(
        boardLanguage,
        "SST frame: definition -> cause -> effect -> example.",
        "एसएसटी ढाँचा: परिभाषा -> कारण -> परिणाम -> उदाहरण।",
        "ਐਸਐਸਟੀ ਢਾਂਚਾ: ਪਰਿਭਾਸ਼ਾ -> ਕਾਰਨ -> ਪ੍ਰਭਾਵ -> ਉਦਾਹਰਨ।"
      ),
      pickLanguage(
        boardLanguage,
        `Link ${topicTitle} with a timeline, process, or civic example.`,
        `${topicTitle} को समयरेखा, प्रक्रिया या नागरिक उदाहरण से जोड़ो।`,
        `${topicTitle} ਨੂੰ ਟਾਈਮਲਾਈਨ, ਪ੍ਰਕਿਰਿਆ ਜਾਂ ਨਾਗਰਿਕ ਉਦਾਹਰਨ ਨਾਲ ਜੋੜੋ।`
      ),
    ];
  }
  if (family === "COMPUTER") {
    return [
      pickLanguage(
        boardLanguage,
        "Computer frame: input -> process -> output.",
        "कंप्यूटर ढाँचा: इनपुट -> प्रोसेस -> आउटपुट।",
        "ਕੰਪਿਊਟਰ ਢਾਂਚਾ: ਇਨਪੁੱਟ -> ਪ੍ਰਕਿਰਿਆ -> ਆਉਟਪੁੱਟ।"
      ),
      pickLanguage(
        boardLanguage,
        `Show where ${topicTitle} is used in practical work.`,
        `दिखाओ कि ${topicTitle} का उपयोग वास्तविक कार्य में कहाँ होता है।`,
        `ਦਿਖਾਓ ਕਿ ${topicTitle} ਦੀ ਵਰਤੋਂ ਅਸਲ ਕੰਮ ਵਿੱਚ ਕਿੱਥੇ ਹੁੰਦੀ ਹੈ।`
      ),
    ];
  }
  return [
    pickLanguage(
      boardLanguage,
      "Board frame: main idea -> supporting point -> example.",
      "बोर्ड ढाँचा: मुख्य विचार -> सहायक बिंदु -> उदाहरण।",
      "ਬੋਰਡ ਢਾਂਚਾ: ਮੁੱਖ ਵਿਚਾਰ -> ਸਹਾਇਕ ਬਿੰਦੂ -> ਉਦਾਹਰਨ।"
    ),
  ];
};

const buildSubjectDiagramActions = (
  subjectName: string,
  topicTitle: string,
  boardLanguage: "English" | "Hindi" | "Punjabi"
): TuitionTeachingBoardAction[] => {
  const family = inferSubjectFamily(subjectName);
  const normalizedTopic = normalizeText(topicTitle).toUpperCase();

  if (family === "SCIENCE" && normalizedTopic.includes("REACTION")) {
    return [
      {
        id: "diagram-box-reactants",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Reactants", "अभिकारक", "ਅਭਿਕਾਰਕ"),
        text: pickLanguage(boardLanguage, "Starting substances", "शुरुआती पदार्थ", "ਸ਼ੁਰੂਆਤੀ ਪਦਾਰਥ"),
        accent: "important",
      },
      {
        id: "diagram-arrow-reaction",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: pickLanguage(boardLanguage, "Reactants", "अभिकारक", "ਅਭਿਕਾਰਕ"),
        toLabel: pickLanguage(boardLanguage, "Products", "उत्पाद", "ਉਤਪਾਦ"),
        text: pickLanguage(boardLanguage, "Reaction / change", "प्रतिक्रिया / परिवर्तन", "ਪ੍ਰਤੀਕ੍ਰਿਆ / ਬਦਲਾਅ"),
      },
      {
        id: "diagram-box-products",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Products", "उत्पाद", "ਉਤਪਾਦ"),
        text: pickLanguage(boardLanguage, "New substances formed", "नए पदार्थ बनते हैं", "ਨਵੇਂ ਪਦਾਰਥ ਬਣਦੇ ਹਨ"),
        accent: "important",
      },
    ];
  }

  if (family === "SCIENCE") {
    return [
      {
        id: "diagram-box-observation",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Observe", "प्रेक्षण", "ਨਿਰੀਖਣ"),
        text: pickLanguage(boardLanguage, "What do we notice first?", "पहले क्या दिखाई देता है?", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਕੀ ਦਿਖਦਾ ਹੈ?"),
      },
      {
        id: "diagram-arrow-reason",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: pickLanguage(boardLanguage, "Observe", "प्रेक्षण", "ਨਿਰੀਖਣ"),
        toLabel: pickLanguage(boardLanguage, "Reason", "कारण", "ਕਾਰਨ"),
        text: pickLanguage(boardLanguage, "Why does it happen?", "यह क्यों होता है?", "ਇਹ ਕਿਉਂ ਹੁੰਦਾ ਹੈ?"),
      },
      {
        id: "diagram-box-conclusion",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Conclusion", "निष्कर्ष", "ਨਤੀਜਾ"),
        text: pickLanguage(
          boardLanguage,
          `State the science idea of ${topicTitle}.`,
          `${topicTitle} का विज्ञान विचार लिखो।`,
          `${topicTitle} ਦਾ ਵਿਗਿਆਨਕ ਵਿਚਾਰ ਲਿਖੋ।`
        ),
      },
    ];
  }

  if (family === "MATHS") {
    return [
      {
        id: "diagram-box-given",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Given", "दिया गया", "ਦਿੱਤਾ ਗਿਆ"),
        text: pickLanguage(boardLanguage, "List the known value or condition.", "दी हुई राशि या शर्त लिखो।", "ਦਿੱਤੀ ਰਕਮ ਜਾਂ ਸ਼ਰਤ ਲਿਖੋ।"),
      },
      {
        id: "diagram-arrow-rule",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: pickLanguage(boardLanguage, "Given", "दिया गया", "ਦਿੱਤਾ ਗਿਆ"),
        toLabel: pickLanguage(boardLanguage, "Rule", "नियम", "ਨਿਯਮ"),
        text: pickLanguage(boardLanguage, "Choose the right formula or method.", "सही सूत्र या विधि चुनो।", "ਸਹੀ ਫਾਰਮੂਲਾ ਜਾਂ ਤਰੀਕਾ ਚੁਣੋ।"),
      },
      {
        id: "diagram-box-solve",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Solve", "हल", "ਹੱਲ"),
        text: pickLanguage(boardLanguage, "Work one step at a time.", "एक-एक चरण में हल करो।", "ਇੱਕ-ਇੱਕ ਕਦਮ ਨਾਲ ਹੱਲ ਕਰੋ।"),
      },
    ];
  }

  if (family === "LANGUAGE") {
    return [
      {
        id: "diagram-box-rule",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Rule", "नियम", "ਨਿਯਮ"),
        text: pickLanguage(boardLanguage, "Write the grammar or language rule.", "व्याकरण या भाषा नियम लिखो।", "ਵਿਆਕਰਣ ਜਾਂ ਭਾਸ਼ਾ ਨਿਯਮ ਲਿਖੋ।"),
      },
      {
        id: "diagram-arrow-meaning",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: pickLanguage(boardLanguage, "Rule", "नियम", "ਨਿਯਮ"),
        toLabel: pickLanguage(boardLanguage, "Example", "उदाहरण", "ਉਦਾਹਰਨ"),
        text: pickLanguage(boardLanguage, "Show it in a sentence.", "इसे एक वाक्य में दिखाओ।", "ਇਸਨੂੰ ਇੱਕ ਵਾਕ ਵਿੱਚ ਦਿਖਾਓ।"),
      },
    ];
  }

  if (family === "SST") {
    return [
      {
        id: "diagram-box-definition",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Definition", "परिभाषा", "ਪਰਿਭਾਸ਼ਾ"),
        text: pickLanguage(boardLanguage, "Write the main idea.", "मुख्य विचार लिखो।", "ਮੁੱਖ ਵਿਚਾਰ ਲਿਖੋ।"),
      },
      {
        id: "diagram-arrow-cause",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: pickLanguage(boardLanguage, "Cause", "कारण", "ਕਾਰਨ"),
        toLabel: pickLanguage(boardLanguage, "Effect", "परिणाम", "ਪ੍ਰਭਾਵ"),
        text: pickLanguage(boardLanguage, "Show the flow clearly.", "प्रवाह को साफ दिखाओ।", "ਪ੍ਰਵਾਹ ਨੂੰ ਸਾਫ ਦਿਖਾਓ।"),
      },
    ];
  }

  return [
    {
      id: "diagram-box-main",
      type: "DRAW_BOX",
      lane: "diagram",
      label: pickLanguage(boardLanguage, "Main Idea", "मुख्य विचार", "ਮੁੱਖ ਵਿਚਾਰ"),
      text: pickLanguage(boardLanguage, `Focus on ${topicTitle}.`, `${topicTitle} पर ध्यान दो।`, `${topicTitle} 'ਤੇ ਧਿਆਨ ਦਿਓ।`),
    },
  ];
};

const buildRecapText = (
  topicTitle: string,
  boardLanguage: "English" | "Hindi" | "Punjabi"
) =>
  pickLanguage(
    boardLanguage,
    `Remember: ${topicTitle} is best understood through definition, rule, example, and recap.`,
    `याद रखो: ${topicTitle} को परिभाषा, नियम, उदाहरण और पुनरावृत्ति से अच्छी तरह समझा जाता है।`,
    `ਯਾਦ ਰੱਖੋ: ${topicTitle} ਨੂੰ ਪਰਿਭਾਸ਼ਾ, ਨਿਯਮ, ਉਦਾਹਰਨ ਅਤੇ ਦੁਹਰਾਈ ਨਾਲ ਵਧੀਆ ਸਮਝਿਆ ਜਾਂਦਾ ਹੈ।`
  );

const buildPracticeQuestion = (
  family: SubjectFamily,
  topicTitle: string,
  language: "English" | "Hindi" | "Punjabi"
) => {
  if (family === "MATHS") {
    return pickLanguage(
      language,
      `Practice: solve one simple question from ${topicTitle} and explain each step.`,
      `अभ्यास: ${topicTitle} का एक सरल प्रश्न हल करो और हर चरण समझाओ।`,
      `ਅਭਿਆਸ: ${topicTitle} ਦਾ ਇੱਕ ਸੌਖਾ ਪ੍ਰਸ਼ਨ ਹੱਲ ਕਰੋ ਅਤੇ ਹਰ ਕਦਮ ਸਮਝਾਓ।`
    );
  }
  if (family === "SCIENCE") {
    return pickLanguage(
      language,
      `Practice: explain one real-life example of ${topicTitle}.`,
      `अभ्यास: ${topicTitle} का एक वास्तविक जीवन उदाहरण समझाओ।`,
      `ਅਭਿਆਸ: ${topicTitle} ਦਾ ਇੱਕ ਅਸਲੀ ਜੀਵਨ ਉਦਾਹਰਨ ਸਮਝਾਓ।`
    );
  }
  if (family === "LANGUAGE") {
    return pickLanguage(
      language,
      `Practice: use ${topicTitle} in one correct sentence.`,
      `अभ्यास: ${topicTitle} का एक सही वाक्य में प्रयोग करो।`,
      `ਅਭਿਆਸ: ${topicTitle} ਨੂੰ ਇੱਕ ਸਹੀ ਵਾਕ ਵਿੱਚ ਵਰਤੋ।`
    );
  }
  if (family === "SST") {
    return pickLanguage(
      language,
      `Practice: write one cause and one effect related to ${topicTitle}.`,
      `अभ्यास: ${topicTitle} से जुड़ा एक कारण और एक परिणाम लिखो।`,
      `ਅਭਿਆਸ: ${topicTitle} ਨਾਲ ਸੰਬੰਧਿਤ ਇੱਕ ਕਾਰਨ ਅਤੇ ਇੱਕ ਪ੍ਰਭਾਵ ਲਿਖੋ।`
    );
  }
  return pickLanguage(
    language,
    `Practice: explain ${topicTitle} in your own words.`,
    `अभ्यास: ${topicTitle} को अपने शब्दों में समझाओ।`,
    `ਅਭਿਆਸ: ${topicTitle} ਨੂੰ ਆਪਣੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਸਮਝਾਓ।`
  );
};

const buildLiveTeachingModel = (
  input: TuitionTeacherContext,
  boardPayload: TuitionBoardPayload
): {
  speechChunks: TuitionTeachingSpeechChunk[];
  boardActions: TuitionTeachingBoardAction[];
  teachingSteps: TuitionTeachingStep[];
  practiceQuestion: string;
  diagramInstructions: string[];
} => {
  const explanationLanguage = normalizeTeachingLanguage(input.explanationLanguage);
  const boardLanguage = normalizeTeachingLanguage(input.boardLanguage || input.explanationLanguage);
  const classLine = input.classLevel ? `Class ${input.classLevel}` : pickLanguage(explanationLanguage, "school", "कक्षा", "ਕਲਾਸ");
  const subjectLine = normalizeText(input.subjectName) || pickLanguage(explanationLanguage, "the subject", "विषय", "ਵਿਸ਼ਾ");
  const family = inferSubjectFamily(subjectLine);
  const speechChunks: TuitionTeachingSpeechChunk[] = [];
  const boardActions: TuitionTeachingBoardAction[] = [];
  const teachingSteps: TuitionTeachingStep[] = [];

  const pushStep = (
    id: string,
    title: string,
    kind: TuitionTeachingSpeechChunk["kind"],
    speechText: string,
    actions: TuitionTeachingBoardAction[],
    autoDelayMs: number
  ) => {
    const speechChunkId = `${id}-speech`;
    speechChunks.push({ id: speechChunkId, kind, text: speechText });
    boardActions.push(...actions);
    teachingSteps.push({
      id,
      title,
      speechChunkId,
      actionIds: actions.map((action) => action.id),
      autoDelayMs,
    });
  };

  pushStep(
    "step-intro",
    pickLanguage(explanationLanguage, "Topic Intro", "विषय परिचय", "ਵਿਸ਼ਾ ਜਾਣ-ਪਛਾਣ"),
    "INTRO",
    pickLanguage(
      explanationLanguage,
      `Today we are learning ${input.topicTitle} in ${subjectLine}. I will teach it step by step like a classroom board teacher for ${classLine}.`,
      `आज हम ${subjectLine} में ${input.topicTitle} पढ़ेंगे। मैं इसे कक्षा के बोर्ड शिक्षक की तरह चरणबद्ध तरीके से समझाऊँगा।`,
      `ਅੱਜ ਅਸੀਂ ${subjectLine} ਵਿੱਚ ${input.topicTitle} ਪੜ੍ਹਾਂਗੇ। ਮੈਂ ਇਸਨੂੰ ਕਲਾਸਰੂਮ ਬੋਰਡ ਅਧਿਆਪਕ ਵਾਂਗ ਕਦਮ ਦਰ ਕਦਮ ਸਮਝਾਵਾਂਗਾ।`
    ),
    [
      {
        id: "action-title",
        type: "WRITE_TEXT",
        lane: "title",
        text: boardPayload.boardTitle,
        accent: "important",
      },
      {
        id: "action-highlight-title",
        type: "HIGHLIGHT",
        lane: "title",
        targetId: "action-title",
        text: pickLanguage(boardLanguage, "Start with the topic title and class focus.", "विषय शीर्षक और कक्षा फोकस से शुरू करो।", "ਵਿਸ਼ੇ ਦੇ ਸਿਰਲੇਖ ਅਤੇ ਕਲਾਸ ਫੋਕਸ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ।"),
      },
    ],
    900
  );

  boardPayload.boardLines.forEach((line, index) => {
    pushStep(
      `step-note-${index + 1}`,
      pickLanguage(explanationLanguage, `Teaching Point ${index + 1}`, `शिक्षण बिंदु ${index + 1}`, `ਸਿੱਖਣ ਬਿੰਦੂ ${index + 1}`),
      "EXPLAIN",
      line,
      [
        {
          id: `action-note-${index + 1}`,
          type: "WRITE_BULLET",
          lane: "notes",
          text: line,
          accent: index === 0 ? "important" : undefined,
        },
      ],
      850
    );
  });

  boardPayload.formulas.forEach((formula, index) => {
    pushStep(
      `step-formula-${index + 1}`,
      pickLanguage(explanationLanguage, `Rule ${index + 1}`, `नियम ${index + 1}`, `ਨਿਯਮ ${index + 1}`),
      "FORMULA",
      formula,
      [
        {
          id: `action-formula-${index + 1}`,
          type: "WRITE_FORMULA",
          lane: "formula",
          text: formula,
          accent: "formula",
        },
      ],
      820
    );
  });

  const diagramActions = buildSubjectDiagramActions(subjectLine, input.topicTitle, boardLanguage);
  if (diagramActions.length) {
    pushStep(
      "step-diagram",
      pickLanguage(explanationLanguage, "Board Sketch", "बोर्ड चित्र", "ਬੋਰਡ ਚਿੱਤਰ"),
      "DIAGRAM",
      pickLanguage(
        explanationLanguage,
        `Now let us make a simple board sketch for ${input.topicTitle}.`,
        `अब ${input.topicTitle} के लिए एक सरल बोर्ड चित्र बनाते हैं।`,
        `ਹੁਣ ${input.topicTitle} ਲਈ ਇੱਕ ਸਧਾਰਣ ਬੋਰਡ ਚਿੱਤਰ ਬਣਾਈਏ।`
      ),
      diagramActions,
      950
    );
  }

  boardPayload.steps.forEach((step, index) => {
    pushStep(
      `step-solve-${index + 1}`,
      pickLanguage(explanationLanguage, `Worked Step ${index + 1}`, `हल चरण ${index + 1}`, `ਹੱਲ ਕਦਮ ${index + 1}`),
      "EXPLAIN",
      step,
      [
        {
          id: `action-step-${index + 1}`,
          type: "WRITE_STEP",
          lane: "steps",
          text: step,
        },
      ],
      880
    );
  });

  if (boardPayload.exampleSteps.length) {
    pushStep(
      "step-example",
      pickLanguage(explanationLanguage, "Solved Example", "हल किया उदाहरण", "ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ"),
      "EXAMPLE",
      pickLanguage(
        explanationLanguage,
        `Let us solve one example of ${input.topicTitle} step by step.`,
        `आओ ${input.topicTitle} का एक उदाहरण चरणबद्ध हल करें।`,
        `ਆਓ ${input.topicTitle} ਦਾ ਇੱਕ ਉਦਾਹਰਨ ਕਦਮ ਦਰ ਕਦਮ ਹੱਲ ਕਰੀਏ।`
      ),
      boardPayload.exampleSteps.map((exampleStep, index) => ({
        id: `action-example-${index + 1}`,
        type: "WRITE_STEP",
        lane: "example",
        text: exampleStep,
        accent: "example",
      })),
      1000
    );
  }

  const practiceQuestion = buildPracticeQuestion(family, input.topicTitle, explanationLanguage);
  pushStep(
    "step-recap",
    pickLanguage(explanationLanguage, "Recap", "पुनरावृत्ति", "ਦੁਹਰਾਈ"),
    "RECAP",
    pickLanguage(
      explanationLanguage,
      `Recap the main idea of ${input.topicTitle}, then answer one short practice question.`,
      `${input.topicTitle} के मुख्य विचार की पुनरावृत्ति करो, फिर एक छोटा अभ्यास प्रश्न करो।`,
      `${input.topicTitle} ਦੇ ਮੁੱਖ ਵਿਚਾਰ ਦੀ ਦੁਹਰਾਈ ਕਰੋ, ਫਿਰ ਇੱਕ ਛੋਟਾ ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ ਕਰੋ।`
    ),
    [
      {
        id: "action-recap",
        type: "SHOW_RECAP",
        lane: "recap",
        text: buildRecapText(input.topicTitle, boardLanguage),
      },
      {
        id: "action-ask-student",
        type: "ASK_STUDENT",
        lane: "recap",
        text: practiceQuestion,
        accent: "question",
      },
    ],
    900
  );

  return {
    speechChunks,
    boardActions,
    teachingSteps,
    practiceQuestion,
    diagramInstructions: diagramActions.map((action) => action.text || action.label || action.type),
  };
};

export const buildTuitionBoardPayload = (input: TuitionTeacherContext): TuitionBoardPayload => {
  const boardLanguage = normalizeTeachingLanguage(input.boardLanguage || input.explanationLanguage);
  const subjectName =
    normalizeText(input.subjectName) ||
    pickLanguage(boardLanguage, "General Studies", "सामान्य अध्ययन", "ਸਧਾਰਣ ਅਧਿਐਨ");
  const boardName = normalizeText(input.boardName);
  const classLabel = input.classLevel
    ? pickLanguage(boardLanguage, `Class ${input.classLevel}`, `कक्षा ${input.classLevel}`, `ਕਲਾਸ ${input.classLevel}`)
    : pickLanguage(boardLanguage, "school", "विद्यालय", "ਸਕੂਲ");
  const lineCount = buildBoardLineCount(input.speedMode, input.difficultyMode);
  const stepCount = buildStepCount(input.speedMode, input.difficultyMode);
  const studentPrompt =
    normalizeText(input.studentPrompt) ||
    pickLanguage(boardLanguage, "Explain the topic clearly.", "विषय को साफ़ समझाओ।", "ਵਿਸ਼ੇ ਨੂੰ ਸਾਫ਼ ਸਮਝਾਓ।");
  const boardClassLine = `${boardName ? `${boardName} ` : ""}${classLabel} ${subjectName}`.trim();

  const boardLineTemplates = [
    pickLanguage(boardLanguage, `Topic: ${input.topicTitle}`, `विषय: ${input.topicTitle}`, `ਵਿਸ਼ਾ: ${input.topicTitle}`),
    pickLanguage(boardLanguage, `Class focus: ${boardClassLine}`, `कक्षा फोकस: ${boardClassLine}`, `ਕਲਾਸ ਫੋਕਸ: ${boardClassLine}`),
    input.difficultyMode === TuitionDifficultyMode.EASY
      ? pickLanguage(
          boardLanguage,
          `Meaning: explain ${input.topicTitle} in simple classroom words.`,
          `अर्थ: ${input.topicTitle} को सरल कक्षा-शब्दों में समझाओ।`,
          `ਅਰਥ: ${input.topicTitle} ਨੂੰ ਸੌਖੀ ਕਲਾਸ-ਭਾਸ਼ਾ ਵਿੱਚ ਸਮਝਾਓ।`
        )
      : pickLanguage(
          boardLanguage,
          `Core idea: define ${input.topicTitle} in clean textbook language.`,
          `मुख्य विचार: ${input.topicTitle} को साफ़ पाठ्यपुस्तक भाषा में परिभाषित करो।`,
          `ਮੁੱਖ ਵਿਚਾਰ: ${input.topicTitle} ਨੂੰ ਸਾਫ਼ ਪਾਠ-ਪੁਸਤਕ ਭਾਸ਼ਾ ਵਿੱਚ ਪਰਿਭਾਸ਼ਿਤ ਕਰੋ।`
        ),
    input.speedMode === TuitionSpeedMode.SLOW
      ? pickLanguage(boardLanguage, "Board plan: write one small point at a time.", "बोर्ड योजना: एक बार में एक छोटा बिंदु लिखो।", "ਬੋਰਡ ਯੋਜਨਾ: ਇਕ ਵਾਰ ਵਿੱਚ ਇਕ ਛੋਟਾ ਬਿੰਦੂ ਲਿਖੋ।")
      : pickLanguage(boardLanguage, "Board plan: keep only the highest-value teaching points.", "बोर्ड योजना: केवल सबसे महत्वपूर्ण शिक्षण बिंदु रखो।", "ਬੋਰਡ ਯੋਜਨਾ: ਸਿਰਫ਼ ਸਭ ਤੋਂ ਮਹੱਤਵਪੂਰਣ ਸਿਖਲਾਈ ਬਿੰਦੂ ਰੱਖੋ।"),
    input.difficultyMode === TuitionDifficultyMode.HARD
      ? pickLanguage(boardLanguage, "Deep link: add one comparison or why/how connection.", "गहराई: एक तुलना या क्यों/कैसे जोड़ो।", "ਗਹਿਰਾਈ: ਇਕ ਤੁਲਨਾ ਜਾਂ ਕਿਉਂ/ਕਿਵੇਂ ਜੋੜੋ।")
      : pickLanguage(boardLanguage, "Example link: add one direct classroom example.", "उदाहरण: एक सीधा कक्षा-उदाहरण जोड़ो।", "ਉਦਾਹਰਨ: ਇੱਕ ਸਿੱਧਾ ਕਲਾਸ-ਉਦਾਹਰਨ ਜੋੜੋ।"),
    pickLanguage(boardLanguage, `Student focus: ${studentPrompt}`, `विद्यार्थी फोकस: ${studentPrompt}`, `ਵਿਦਿਆਰਥੀ ਫੋਕਸ: ${studentPrompt}`),
  ];

  const steps = Array.from({ length: stepCount }, (_, index) => {
    const stepNumber = index + 1;
    if (input.difficultyMode === TuitionDifficultyMode.HARD) {
      if (stepNumber === 1) {
        return pickLanguage(boardLanguage, "Write the exact topic idea first.", "सबसे पहले विषय का सटीक विचार लिखो।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਵਿਸ਼ੇ ਦਾ ਸਹੀ ਵਿਚਾਰ ਲਿਖੋ।");
      }
      if (stepNumber === 2) {
        return pickLanguage(boardLanguage, "Compare it with a related idea or earlier concept.", "इसे किसी संबंधित विचार या पहले के सिद्धांत से तुलना करो।", "ਇਸਦੀ ਕਿਸੇ ਸੰਬੰਧਿਤ ਵਿਚਾਰ ਜਾਂ ਪਹਿਲਾਂ ਦੇ ਸੰਕਲਪ ਨਾਲ ਤੁਲਨਾ ਕਰੋ।");
      }
      if (stepNumber === 3) {
        return pickLanguage(boardLanguage, "Show why the rule works or where it is applied.", "दिखाओ कि नियम क्यों काम करता है या कहाँ लागू होता है।", "ਦਿਖਾਓ ਕਿ ਨਿਯਮ ਕਿਉਂ ਕੰਮ ਕਰਦਾ ਹੈ ਜਾਂ ਕਿੱਥੇ ਲਾਗੂ ਹੁੰਦਾ ਹੈ।");
      }
      if (stepNumber === 4) {
        return pickLanguage(boardLanguage, "Solve one higher-level classroom situation.", "एक थोड़ा कठिन कक्षा-स्थिति हल करो।", "ਇੱਕ ਥੋੜ੍ਹੀ ਔਖੀ ਕਲਾਸ-ਸਥਿਤੀ ਹੱਲ ਕਰੋ।");
      }
      return pickLanguage(boardLanguage, "Finish with one challenge check for the student.", "अंत में विद्यार्थी के लिए एक चुनौतीपूर्ण जाँच दो।", "ਅੰਤ ਵਿੱਚ ਵਿਦਿਆਰਥੀ ਲਈ ਇੱਕ ਚੁਣੌਤੀਪੂਰਨ ਜਾਂਚ ਦਿਓ।");
    }
    if (input.difficultyMode === TuitionDifficultyMode.EASY) {
      if (stepNumber === 1) {
        return pickLanguage(boardLanguage, "Write the simplest meaning in plain words.", "सबसे सरल अर्थ आसान शब्दों में लिखो।", "ਸਭ ਤੋਂ ਸੌਖਾ ਅਰਥ ਆਸਾਨ ਸ਼ਬਦਾਂ ਵਿੱਚ ਲਿਖੋ।");
      }
      if (stepNumber === 2) {
        return pickLanguage(boardLanguage, "Add one easy point from the topic.", "विषय से एक आसान बिंदु जोड़ो।", "ਵਿਸ਼ੇ ਤੋਂ ਇੱਕ ਸੌਖਾ ਬਿੰਦੂ ਜੋੜੋ।");
      }
      if (stepNumber === 3) {
        return pickLanguage(boardLanguage, "Give one direct example students already know.", "ऐसा सीधा उदाहरण दो जो विद्यार्थी पहले से जानते हों।", "ਇੱਕ ਸਿੱਧਾ ਉਦਾਹਰਨ ਦਿਓ ਜੋ ਵਿਦਿਆਰਥੀ ਪਹਿਲਾਂ ਤੋਂ ਜਾਣਦੇ ਹਨ।");
      }
      return pickLanguage(boardLanguage, "Ask one short check question before moving ahead.", "आगे बढ़ने से पहले एक छोटा जाँच-प्रश्न पूछो।", "ਅੱਗੇ ਵੱਧਣ ਤੋਂ ਪਹਿਲਾਂ ਇੱਕ ਛੋਟਾ ਜਾਂਚ-ਪ੍ਰਸ਼ਨ ਪੁੱਛੋ।");
    }
    if (stepNumber === 1) {
      return pickLanguage(boardLanguage, "Write the main definition or topic point.", "मुख्य परिभाषा या विषय-बिंदु लिखो।", "ਮੁੱਖ ਪਰਿਭਾਸ਼ਾ ਜਾਂ ਵਿਸ਼ੇ-ਬਿੰਦੂ ਲਿਖੋ।");
    }
    if (stepNumber === 2) {
      return pickLanguage(boardLanguage, "Add the rule, property, or key feature.", "नियम, गुण या मुख्य विशेषता जोड़ो।", "ਨਿਯਮ, ਗੁਣ ਜਾਂ ਮੁੱਖ ਵਿਸ਼ੇਸ਼ਤਾ ਜੋੜੋ।");
    }
    if (stepNumber === 3) {
      return pickLanguage(boardLanguage, "Connect the point to one clear example.", "इस बिंदु को एक साफ़ उदाहरण से जोड़ो।", "ਇਸ ਬਿੰਦੂ ਨੂੰ ਇੱਕ ਸਾਫ਼ ਉਦਾਹਰਨ ਨਾਲ ਜੋੜੋ।");
    }
    return pickLanguage(boardLanguage, "Close with one quick understanding check.", "अंत में एक छोटा समझ-जाँच प्रश्न रखो।", "ਅੰਤ ਵਿੱਚ ਇੱਕ ਛੋਟਾ ਸਮਝ-ਜਾਂਚ ਪ੍ਰਸ਼ਨ ਰੱਖੋ।");
  });

  const exampleSteps =
    input.speedMode === TuitionSpeedMode.FAST
      ? [
          pickLanguage(
            boardLanguage,
            `Identify which idea from ${input.topicTitle} is being used.`,
            `${input.topicTitle} का कौन-सा विचार उपयोग हो रहा है, पहचानो।`,
            `${input.topicTitle} ਦਾ ਕਿਹੜਾ ਵਿਚਾਰ ਵਰਤਿਆ ਜਾ ਰਿਹਾ ਹੈ, ਪਛਾਣੋ।`
          ),
          pickLanguage(
            boardLanguage,
            "Write the shortest correct worked answer and final conclusion.",
            "सबसे छोटा सही हल और अंतिम निष्कर्ष लिखो।",
            "ਸਭ ਤੋਂ ਛੋਟਾ ਸਹੀ ਹੱਲ ਅਤੇ ਅੰਤਿਮ ਨਤੀਜਾ ਲਿਖੋ।"
          ),
        ]
      : [
          pickLanguage(
            boardLanguage,
            `Identify the exact idea from ${input.topicTitle} that this example is testing.`,
            `इस उदाहरण में ${input.topicTitle} का कौन-सा सटीक विचार जाँचा जा रहा है, पहचानो।`,
            `ਇਸ ਉਦਾਹਰਨ ਵਿੱਚ ${input.topicTitle} ਦਾ ਕਿਹੜਾ ਸਹੀ ਵਿਚਾਰ ਜਾਂਚਿਆ ਜਾ ਰਿਹਾ ਹੈ, ਪਛਾਣੋ।`
          ),
          pickLanguage(
            boardLanguage,
            "Show the first worked step clearly on the board.",
            "पहला हल किया गया चरण बोर्ड पर साफ़ दिखाओ।",
            "ਪਹਿਲਾ ਹੱਲ ਕੀਤਾ ਕਦਮ ਬੋਰਡ 'ਤੇ ਸਾਫ਼ ਦਿਖਾਓ।"
          ),
          input.difficultyMode === TuitionDifficultyMode.HARD
            ? pickLanguage(
                boardLanguage,
                "Add the reasoning behind the step and check the result.",
                "उस चरण के पीछे का तर्क जोड़ो और परिणाम जाँचो।",
                "ਉਸ ਕਦਮ ਦੇ ਪਿੱਛੇ ਦਾ ਤਰਕ ਜੋੜੋ ਅਤੇ ਨਤੀਜਾ ਜਾਂਚੋ।"
              )
            : pickLanguage(
                boardLanguage,
                "Finish with a short conclusion or textbook-style answer.",
                "छोटे निष्कर्ष या पाठ्यपुस्तक शैली के उत्तर से समाप्त करो।",
                "ਛੋਟੇ ਨਤੀਜੇ ਜਾਂ ਪਾਠ-ਪੁਸਤਕ ਅੰਦਾਜ਼ ਦੇ ਉੱਤਰ ਨਾਲ ਖਤਮ ਕਰੋ।"
              ),
        ];

  return {
    boardTitle: `${input.topicTitle} Teaching Board`,
    boardLines: boardLineTemplates.slice(0, lineCount),
    formulas: buildSubjectFormulas(subjectName, input.topicTitle, boardLanguage),
    steps,
    exampleTitle:
      input.difficultyMode === TuitionDifficultyMode.HARD
        ? pickLanguage(boardLanguage, `${input.topicTitle} Worked Reasoning Example`, `${input.topicTitle} हल किया तर्क उदाहरण`, `${input.topicTitle} ਹੱਲ ਕੀਤਾ ਤਰਕ ਉਦਾਹਰਨ`)
        : pickLanguage(boardLanguage, `${input.topicTitle} Worked Example`, `${input.topicTitle} हल किया उदाहरण`, `${input.topicTitle} ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ`),
    exampleSteps,
  };
};

const buildLiveTeachingModelV2 = (
  input: TuitionTeacherContext,
  lessonContent: LiveBoardLessonContent
): {
  speechChunks: TuitionTeachingSpeechChunk[];
  boardActions: TuitionTeachingBoardAction[];
  teachingSteps: TuitionTeachingStep[];
  practiceQuestion: string;
  diagramInstructions: string[];
} => {
  const explanationLanguage = normalizeTeachingLanguage(input.explanationLanguage);
  const boardLanguage = normalizeTeachingLanguage(input.boardLanguage || input.explanationLanguage);
  const classLine = input.classLevel ? `Class ${input.classLevel}` : pickLanguage(explanationLanguage, "school", "कक्षा", "ਕਲਾਸ");
  const subjectLine = normalizeText(input.subjectName) || pickLanguage(explanationLanguage, "the subject", "विषय", "ਵਿਸ਼ਾ");
  const speechChunks: TuitionTeachingSpeechChunk[] = [];
  const boardActions: TuitionTeachingBoardAction[] = [];
  const teachingSteps: TuitionTeachingStep[] = [];

  const pushStep = (
    id: string,
    title: string,
    kind: TuitionTeachingSpeechChunk["kind"],
    speechText: string,
    actions: LiveBoardAction[],
    autoDelayMs: number
  ) => {
    const speechChunkId = `${id}-speech`;
    speechChunks.push({ id: speechChunkId, kind, text: speechText });
    boardActions.push(...(actions as TuitionTeachingBoardAction[]));
    teachingSteps.push({
      id,
      title,
      speechChunkId,
      actionIds: actions.map((action) => action.id),
      autoDelayMs,
    });
  };

  pushStep(
    "step-intro",
    pickLanguage(explanationLanguage, "Topic Intro", "विषय परिचय", "ਵਿਸ਼ਾ ਜਾਣ-ਪਛਾਣ"),
    "INTRO",
    pickLanguage(
      explanationLanguage,
      `Today we are learning ${input.topicTitle} in ${subjectLine}. I will teach it step by step like a classroom board teacher for ${classLine}.`,
      `आज हम ${subjectLine} में ${input.topicTitle} पढ़ेंगे। मैं इसे कक्षा के बोर्ड शिक्षक की तरह चरणबद्ध तरीके से समझाऊँगा।`,
      `ਅੱਜ ਅਸੀਂ ${subjectLine} ਵਿੱਚ ${input.topicTitle} ਪੜ੍ਹਾਂਗੇ। ਮੈਂ ਇਸਨੂੰ ਕਲਾਸਰੂਮ ਬੋਰਡ ਅਧਿਆਪਕ ਵਾਂਗ ਕਦਮ ਦਰ ਕਦਮ ਸਮਝਾਵਾਂਗਾ।`
    ),
    [
      { id: "action-title", type: "WRITE_TEXT", lane: "title", text: lessonContent.boardPayload.boardTitle, accent: "important" },
      {
        id: "action-highlight-title",
        type: "HIGHLIGHT",
        lane: "title",
        targetId: "action-title",
        text: pickLanguage(boardLanguage, "Start with the topic title and class focus.", "विषय शीर्षक और कक्षा फोकस से शुरू करो।", "ਵਿਸ਼ੇ ਦੇ ਸਿਰਲੇਖ ਅਤੇ ਕਲਾਸ ਫੋਕਸ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ।"),
      },
    ],
    900
  );

  lessonContent.boardPayload.boardLines.forEach((line, index) => {
    pushStep(`step-note-${index + 1}`, pickLanguage(explanationLanguage, `Teaching Point ${index + 1}`, `शिक्षण बिंदु ${index + 1}`, `ਸਿੱਖਣ ਬਿੰਦੂ ${index + 1}`), "EXPLAIN", lessonContent.noteSpeech[index] || line, [{ id: `action-note-${index + 1}`, type: "WRITE_BULLET", lane: "notes", text: line, accent: index === 0 ? "important" : undefined }], 850);
  });

  lessonContent.boardPayload.formulas.forEach((formula, index) => {
    pushStep(`step-formula-${index + 1}`, pickLanguage(explanationLanguage, `Rule ${index + 1}`, `नियम ${index + 1}`, `ਨਿਯਮ ${index + 1}`), "FORMULA", lessonContent.formulaSpeech[index] || formula, [{ id: `action-formula-${index + 1}`, type: "WRITE_FORMULA", lane: "formula", text: formula, accent: "formula" }], 820);
  });

  if (lessonContent.diagramActions.length) {
    pushStep(
      "step-diagram",
      pickLanguage(explanationLanguage, "Board Sketch", "बोर्ड चित्र", "ਬੋਰਡ ਚਿੱਤਰ"),
      "DIAGRAM",
      pickLanguage(explanationLanguage, `Now let us make a simple board sketch for ${input.topicTitle}.`, `अब ${input.topicTitle} के लिए एक सरल बोर्ड चित्र बनाते हैं।`, `ਹੁਣ ${input.topicTitle} ਲਈ ਇੱਕ ਸਧਾਰਣ ਬੋਰਡ ਚਿੱਤਰ ਬਣਾਈਏ।`),
      lessonContent.diagramActions,
      950
    );
  }

  lessonContent.boardPayload.steps.forEach((step, index) => {
    pushStep(`step-solve-${index + 1}`, pickLanguage(explanationLanguage, `Worked Step ${index + 1}`, `हल चरण ${index + 1}`, `ਹੱਲ ਕਦਮ ${index + 1}`), "EXPLAIN", lessonContent.stepSpeech[index] || step, [{ id: `action-step-${index + 1}`, type: "WRITE_STEP", lane: "steps", text: step }], 880);
  });

  if (lessonContent.boardPayload.exampleSteps.length) {
    pushStep(
      "step-example",
      pickLanguage(explanationLanguage, "Solved Example", "हल किया उदाहरण", "ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ"),
      "EXAMPLE",
      lessonContent.exampleSpeech,
      lessonContent.boardPayload.exampleSteps.map((exampleStep, index) => ({ id: `action-example-${index + 1}`, type: "WRITE_STEP", lane: "example", text: exampleStep, accent: "example" })),
      1000
    );
  }

  pushStep(
    "step-recap",
    pickLanguage(explanationLanguage, "Recap", "पुनरावृत्ति", "ਦੁਹਰਾਈ"),
    "RECAP",
    lessonContent.recapSpeech,
    [
      { id: "action-recap", type: "SHOW_RECAP", lane: "recap", text: lessonContent.recapBoardText },
      { id: "action-ask-student", type: "ASK_STUDENT", lane: "recap", text: lessonContent.practiceQuestion, accent: "question" },
    ],
    900
  );

  return {
    speechChunks,
    boardActions,
    teachingSteps,
    practiceQuestion: lessonContent.practiceQuestion,
    diagramInstructions: lessonContent.diagramInstructions,
  };
};

export const buildTuitionTeacherAssistantPayload = async (
  input: TuitionTeacherContext
): Promise<TuitionTeacherAssistantPayload> => {
  const explanationLanguage = normalizeTeachingLanguage(input.explanationLanguage);
  const boardLanguage = normalizeTeachingLanguage(input.boardLanguage || input.explanationLanguage);
  const voiceLanguage = normalizeTeachingLanguage(input.voiceLanguage || input.explanationLanguage);
  const subjectName = normalizeText(input.subjectName) || "General Studies";
  const boardName = normalizeText(input.boardName) || null;
  const lessonContent = await buildTopicLessonContent(
    {
      subjectName,
      topicTitle: input.topicTitle,
      explanationLanguage: toLiveBoardLanguage(explanationLanguage),
      boardLanguage: toLiveBoardLanguage(boardLanguage),
    } satisfies LiveBoardContext,
    toLiveBoardSubjectFamily(inferSubjectFamily(subjectName))
  );
  const boardPayload: LiveBoardPayload = lessonContent.boardPayload;
  const liveTeachingModel = buildLiveTeachingModelV2(input, lessonContent);
  return {
    title: input.topicTitle,
    chapterTitle: input.topicTitle,
    topicTitle: input.topicTitle,
    subjectName,
    explanationLanguage,
    boardLanguage,
    voiceLanguage,
    curriculumBoard: boardName,
    replyText:
      liveTeachingModel.speechChunks.map((chunk) => chunk.text).join(" "),
    recapPoints: lessonContent.recapPoints,
    practiceQuestion: liveTeachingModel.practiceQuestion,
    diagramInstructions: liveTeachingModel.diagramInstructions,
    nextSuggestedAction:
      input.messageNumber > 3
        ? pickLanguage(
            explanationLanguage,
            "Ask the student to explain the board summary in one sentence.",
            "विद्यार्थी से बोर्ड सार को एक वाक्य में समझाने को कहो।",
            "ਵਿਦਿਆਰਥੀ ਨੂੰ ਬੋਰਡ ਸਾਰ ਇੱਕ ਵਾਕ ਵਿੱਚ ਸਮਝਾਉਣ ਲਈ ਕਹੋ।"
          )
        : pickLanguage(
            explanationLanguage,
            "Ask one short follow-up about the same topic point.",
            "उसी विषय-बिंदु पर एक छोटा अनुवर्ती प्रश्न पूछो।",
            "ਉਸੇ ਵਿਸ਼ੇ-ਬਿੰਦੂ 'ਤੇ ਇੱਕ ਛੋਟਾ ਅਗਲਾ ਪ੍ਰਸ਼ਨ ਪੁੱਛੋ।"
          ),
    progressUpdate: null,
    boardTitle: boardPayload.boardTitle,
    boardLines: boardPayload.boardLines,
    formulas: boardPayload.formulas,
    steps: boardPayload.steps,
    exampleTitle: boardPayload.exampleTitle,
    exampleSteps: boardPayload.exampleSteps,
    teacherMode: "LIVE_BOARD",
    speechChunks: liveTeachingModel.speechChunks,
    boardActions: liveTeachingModel.boardActions,
    teachingSteps: liveTeachingModel.teachingSteps,
  };
};

export const buildTuitionRealtimeVoiceInstructions = (input: TuitionVoiceSessionInput): string => {
  const voiceLanguage = normalizeTeachingLanguage(input.voiceLanguage || input.context.voiceLanguage);
  const board = normalizeText(input.context.boardName);
  const subject = normalizeText(input.context.subjectName) || "the selected subject";
  const classLabel = input.context.classLevel ? `Class ${input.context.classLevel}` : "school";
  const syllabusTitle = normalizeText(input.context.syllabusTitle);

  return [
    "You are a live tuition voice tutor for one student.",
    "Teach like a patient school tutor, not a competitive exam coach or test-prep mentor.",
    `Teach only the topic "${input.context.topicTitle}" for ${board ? `${board} ` : ""}${classLabel} ${subject}.`,
    syllabusTitle ? `The topic belongs to the syllabus "${syllabusTitle}".` : "",
    `Speak in ${voiceLanguage}.`,
    speedGuidance[input.speedMode],
    difficultyGuidance[input.difficultyMode],
    "Keep the session conversational and interactive.",
    "Use spoken explanations, quick checks, and short examples tied to the same topic.",
    "Do not switch to other topics, exam strategy, advanced whiteboard-only output, or homework grading.",
    "If the student is confused, restate the same idea more simply before moving on.",
  ]
    .filter(Boolean)
    .join(" ");
};

const createOpenAiRealtimeClient = (): TuitionRealtimeClient => {
  const apiKey = normalizeText(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    return {
      async createSession() {
        throw new AppError(
          tuitionAiVoiceUnavailableMessage,
          503,
          "TUITION_AI_VOICE_UNAVAILABLE"
        );
      },
    };
  }

  return {
    async createSession(input) {
      const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: input.model,
            instructions: input.instructions,
            audio: {
              input: {
                turn_detection: {
                  type: "server_vad",
                },
              },
              output: {
                voice: input.voice,
              },
            },
          },
        }),
      });

      let payload: Record<string, any> = {};
      try {
        payload = (await response.json()) as Record<string, any>;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new AppError(
          normalizeText(payload?.error?.message) || tuitionAiVoiceUnavailableMessage,
          response.status >= 400 && response.status < 500 ? 502 : 503,
          "TUITION_AI_VOICE_SESSION_FAILED"
        );
      }

      const clientSecret = normalizeText(payload?.client_secret?.value || payload?.value);
      if (!clientSecret) {
        throw new AppError(
          tuitionAiVoiceUnavailableMessage,
          503,
          "TUITION_AI_VOICE_UNAVAILABLE"
        );
      }

      return {
        clientSecret,
        expiresAt: toIsoString(payload?.client_secret?.expires_at ?? payload?.expires_at),
        sessionId: normalizeText(payload?.id) || null,
      };
    },
  };
};

export const createTuitionAiProvider = ({
  realtimeClient = createOpenAiRealtimeClient(),
  model = normalizeText(process.env.OPENAI_REALTIME_MODEL) || "gpt-realtime",
  voice = normalizeText(process.env.OPENAI_REALTIME_VOICE) || "marin",
} = {}) => ({
  async createVoiceSession(input: TuitionVoiceSessionInput) {
    const instructions = buildTuitionRealtimeVoiceInstructions(input);
    const session = await realtimeClient.createSession({
      model,
      voice,
      instructions,
    });

    return {
      clientSecret: session.clientSecret,
      expiresAt: session.expiresAt,
      session: {
        id: session.sessionId,
        model,
        voice,
        responseLanguage: normalizeTeachingLanguage(input.voiceLanguage || input.context.voiceLanguage),
        speedMode: input.speedMode,
        difficultyMode: input.difficultyMode,
      },
      context: {
        topicTitle: input.context.topicTitle,
        boardName: input.context.boardName || null,
        classLevel: input.context.classLevel ?? null,
        subjectName: input.context.subjectName || null,
        syllabusTitle: input.context.syllabusTitle || null,
      },
      instructions,
    };
  },
});

export const tuitionAiProvider = createTuitionAiProvider();
