import { TuitionDifficultyMode, TuitionSpeedMode } from "@prisma/client";
import { AppError } from "../../utils/appError";
import {
  buildTopicLessonContent,
  localizeLiveBoardSubjectLabel,
  type LiveBoardAction,
  type LiveBoardContext,
  type LiveBoardLanguage,
  type LiveBoardLessonContent,
  type LiveBoardPayload,
  type LiveBoardSubjectFamily,
  type LiveBoardTeachingDepth,
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
  teachingDepth: LiveBoardTeachingDepth;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
  studentPrompt: string;
  messageNumber: number;
  previousAssistant?: Partial<TuitionTeacherAssistantPayload> | null;
};

type TuitionVoiceSessionInput = {
  context: TuitionVoiceContext;
  voiceLanguage?: string | null;
  teachingDepth: LiveBoardTeachingDepth;
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

const normalizeTopicKey = (value: string | null | undefined): string =>
  String(value || "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeTeachingLanguage = (value: string | null | undefined): "English" | "Hindi" | "Punjabi" => {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "HINDI") return "Hindi";
  if (normalized === "PUNJABI") return "Punjabi";
  return "English";
};

const normalizeTeachingDepth = (value: string | null | undefined): LiveBoardTeachingDepth => {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "BASIC") return "BASIC";
  if (normalized === "ADVANCED") return "ADVANCED";
  return "MODERATE";
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

const topicTitleOverrides: Array<{
  keys: string[];
  english: string;
  hindi: string;
  punjabi: string;
}> = [
  {
    keys: ["chemical reaction", "chemical reactions"],
    english: "Chemical Reaction",
    hindi: "रासायनिक अभिक्रिया",
    punjabi: "ਰਸਾਇਣਕ ਕ੍ਰਿਆ",
  },
  {
    keys: ["photosynthesis"],
    english: "Photosynthesis",
    hindi: "प्रकाश-संश्लेषण",
    punjabi: "ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ",
  },
  {
    keys: ["fractions", "fraction"],
    english: "Fractions",
    hindi: "भिन्न",
    punjabi: "ਭਿੰਨ",
  },
  {
    keys: ["decimals", "decimal"],
    english: "Decimals",
    hindi: "दशमलव",
    punjabi: "ਦਸ਼ਮਲਵ",
  },
  {
    keys: ["respiration"],
    english: "Respiration",
    hindi: "श्वसन",
    punjabi: "ਸ਼ਵਾਸ",
  },
  {
    keys: ["federalism"],
    english: "Federalism",
    hindi: "संघवाद",
    punjabi: "ਸੰਘਵਾਦ",
  },
  {
    keys: ["democracy"],
    english: "Democracy",
    hindi: "लोकतंत्र",
    punjabi: "ਲੋਕਤੰਤਰ",
  },
  {
    keys: ["matter"],
    english: "Matter",
    hindi: "पदार्थ",
    punjabi: "ਪਦਾਰਥ",
  },
];

const displayTopicTitle = (topicTitle: string, language: "English" | "Hindi" | "Punjabi"): string => {
  const normalized = normalizeText(topicTitle);
  if (!normalized) return "";
  const topicKey = normalizeTopicKey(normalized);
  const exactOverride = topicTitleOverrides.find((entry) => entry.keys.includes(topicKey));
  if (exactOverride) {
    return pickLanguage(language, exactOverride.english, exactOverride.hindi, exactOverride.punjabi);
  }
  return pickLanguage(language, normalized, normalized, normalized);
};

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

export type TuitionTeacherPhase =
  | "INTRO"
  | "EXPLAIN_CONCEPT"
  | "WRITE_ANCHOR"
  | "GIVE_EXAMPLE"
  | "ASK_CHECK"
  | "HANDLE_STUDENT_DOUBT"
  | "CONTINUE_LESSON"
  | "RECAP"
  | "PRACTICE_CHECK"
  | "COMPLETE";

export type TuitionTeacherBoardState = {
  title: string;
  currentConcept: string | null;
  anchors: string[];
  formula: string | null;
  example: string | null;
  diagramLabels: string[];
  recapKeywords: string[];
  highlight: string | null;
};

export type TuitionTeacherState = {
  currentTeachingPhase: TuitionTeacherPhase;
  currentConcept: string | null;
  currentConceptIndex: number;
  pausedForStudentQuestion: boolean;
  resumePoint: number;
  currentConversationTurn: number;
  selectedLanguage: string;
  teachingDepth: LiveBoardTeachingDepth;
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
  teachingDepth: LiveBoardTeachingDepth;
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
  teacherMode: "AI_TEACHER_V2" | "LIVE_BOARD";
  teacherIntro?: string | null;
  teacherExplanation?: string | null;
  teacherCheckQuestion?: string | null;
  boardState?: TuitionTeacherBoardState | null;
  teacherState?: TuitionTeacherState | null;
  interactionHints?: string[];
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
  const subjectLine = localizeLiveBoardSubjectLabel(input.subjectName, explanationLanguage);
  const resolvedTopicTitle =
    displayTopicTitle(boardPayload.boardTitle || input.topicTitle, boardLanguage) || normalizeText(input.topicTitle);
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
      `Today we are learning ${resolvedTopicTitle} in ${subjectLine}. I will teach it step by step like a classroom board teacher for ${classLine}.`,
      `आज हम ${subjectLine} में ${resolvedTopicTitle} पढ़ेंगे। मैं इसे कक्षा के बोर्ड शिक्षक की तरह चरणबद्ध तरीके से समझाऊँगा।`,
      `ਅੱਜ ਅਸੀਂ ${subjectLine} ਵਿੱਚ ${resolvedTopicTitle} ਪੜ੍ਹਾਂਗੇ। ਮੈਂ ਇਸਨੂੰ ਕਲਾਸਰੂਮ ਬੋਰਡ ਅਧਿਆਪਕ ਵਾਂਗ ਕਦਮ ਦਰ ਕਦਮ ਸਮਝਾਵਾਂਗਾ।`
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
  const subjectName = localizeLiveBoardSubjectLabel(
    input.subjectName || pickLanguage(boardLanguage, "General Studies", "सामान्य अध्ययन", "ਸਧਾਰਣ ਅਧਿਐਨ"),
    boardLanguage
  );
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
    boardTitle: displayTopicTitle(input.topicTitle, boardLanguage),
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

const shapeSpeechForDepth = (
  language: "English" | "Hindi" | "Punjabi",
  teachingDepth: LiveBoardTeachingDepth,
  text: string
): string => {
  const normalized = normalizeText(text);
  if (!normalized) return "";
  if (teachingDepth === "BASIC") {
    return normalized.split(/(?<=[.!?।॥])\s+/u).slice(0, 1).join(" ");
  }
  if (teachingDepth === "ADVANCED") {
    const cue = pickLanguage(
      language,
      "Notice the deeper idea behind this point.",
      "इस बिंदु के पीछे का गहरा विचार भी समझो।",
      "ਇਸ ਬਿੰਦੂ ਦੇ ਪਿੱਛੇ ਵਾਲਾ ਗਹਿਰਾ ਵਿਚਾਰ ਵੀ ਸਮਝੋ।"
    );
    return normalized.includes(cue) ? normalized : `${normalized} ${cue}`;
  }
  return normalized;
};

const splitSpeechSentences = (text: string): string[] =>
  normalizeText(text)
    .split(/(?<=[.!?।॥])\s+/u)
    .map((sentence) => normalizeText(sentence))
    .filter(Boolean);

const ensureSentenceClosure = (
  language: "English" | "Hindi" | "Punjabi",
  sentence: string
): string => {
  const normalized = normalizeText(sentence);
  if (!normalized) return "";
  if (/[.!?।॥]$/u.test(normalized)) {
    return normalized;
  }
  return normalized + (language === "English" ? "." : "।");
};

const buildContinueSpeechPadding = (
  language: "English" | "Hindi" | "Punjabi",
  topicTitle: string,
  currentAnchor: string
): string[] => [
  pickLanguage(
    language,
    `Keep your attention on the core idea of ${topicTitle}.`,
    `${topicTitle} के मुख्य विचार पर ध्यान बनाए रखो।`,
    `${topicTitle} ਦੇ ਮੁੱਖ ਵਿਚਾਰ 'ਤੇ ਧਿਆਨ ਬਣਾਈ ਰੱਖੋ।`
  ),
  pickLanguage(
    language,
    `The board is showing only the key support point: ${currentAnchor}.`,
    `बोर्ड अभी केवल यही मुख्य सहायक बिंदु दिखा रहा है: ${currentAnchor}।`,
    `ਬੋਰਡ ਇਸ ਵੇਲੇ ਸਿਰਫ਼ ਇਹ ਮੁੱਖ ਸਹਾਇਕ ਬਿੰਦੂ ਦਿਖਾ ਰਿਹਾ ਹੈ: ${currentAnchor}।`
  ),
  pickLanguage(
    language,
    "Try to connect this idea with what you already know from class.",
    "इस विचार को अपनी कक्षा की पहले से जानी हुई बातों से जोड़कर देखो।",
    "ਇਸ ਵਿਚਾਰ ਨੂੰ ਕਲਾਸ ਵਿੱਚ ਪਹਿਲਾਂ ਸਿੱਖੀਆਂ ਗੱਲਾਂ ਨਾਲ ਜੋੜ ਕੇ ਵੇਖੋ।"
  ),
  pickLanguage(
    language,
    "This step matters because it helps you explain the topic clearly in your own words.",
    "यह चरण इसलिए महत्वपूर्ण है क्योंकि इससे तुम इस विषय को अपने शब्दों में साफ़ समझा सकते हो।",
    "ਇਹ ਕਦਮ ਇਸ ਲਈ ਮਹੱਤਵਪੂਰਣ ਹੈ ਕਿਉਂਕਿ ਇਸ ਨਾਲ ਤੁਸੀਂ ਵਿਸ਼ੇ ਨੂੰ ਆਪਣੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਸਾਫ਼ ਸਮਝਾ ਸਕਦੇ ਹੋ।"
  ),
  pickLanguage(
    language,
    "Hold this point in mind before we move to the next classroom detail.",
    "अगले बिंदु पर जाने से पहले इस बात को मन में पक्का कर लो।",
    "ਅਗਲੇ ਬਿੰਦੂ ਤੇ ਜਾਣ ਤੋਂ ਪਹਿਲਾਂ ਇਸ ਗੱਲ ਨੂੰ ਮਨ ਵਿੱਚ ਪੱਕਾ ਕਰ ਲਵੋ।"
  ),
];

const buildLongContinueSpeech = (input: {
  language: "English" | "Hindi" | "Punjabi";
  teachingDepth: LiveBoardTeachingDepth;
  topicTitle: string;
  currentPoint: TeacherLessonPoint | null;
  lessonContent: LiveBoardLessonContent;
  conceptIndex: number;
}): string => {
  const targetSentenceCount =
    input.teachingDepth === "BASIC" ? 8 : input.teachingDepth === "ADVANCED" ? 10 : 9;
  const points = buildLessonPoints(input.lessonContent);
  const nearbyPointSentences = points
    .slice(Math.max(0, input.conceptIndex), Math.min(points.length, input.conceptIndex + 4))
    .flatMap((point) => splitSpeechSentences(point.explanation || point.anchor));
  const sourceSentences = [
    ...nearbyPointSentences,
    ...splitSpeechSentences(input.lessonContent.exampleSpeech),
    ...splitSpeechSentences(input.lessonContent.recapSpeech),
    ...splitSpeechSentences(input.lessonContent.formulaSpeech[0] || ""),
    ...splitSpeechSentences(input.lessonContent.practiceQuestion || ""),
  ];
  const deduped = [];
  const seen = new Set<string>();
  sourceSentences.forEach((sentence) => {
    const closedSentence = ensureSentenceClosure(input.language, sentence);
    const key = normalizeTopicKey(closedSentence);
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(closedSentence);
  });
  const anchor =
    normalizeText(input.currentPoint?.anchor) ||
    normalizeText(points[input.conceptIndex]?.anchor) ||
    normalizeText(input.topicTitle);
  const padding = buildContinueSpeechPadding(input.language, input.topicTitle, anchor);
  while (deduped.length < targetSentenceCount && padding.length) {
    deduped.push(ensureSentenceClosure(input.language, padding[(deduped.length - 1) % padding.length]));
  }
  return deduped.slice(0, targetSentenceCount).join(" ");
};

const buildLongTopicIntroSpeech = (input: {
  language: "English" | "Hindi" | "Punjabi";
  teachingDepth: LiveBoardTeachingDepth;
  topicTitle: string;
  lessonContent: LiveBoardLessonContent;
}): string => {
  const points = buildLessonPoints(input.lessonContent);
  return buildLongContinueSpeech({
    language: input.language,
    teachingDepth: input.teachingDepth,
    topicTitle: input.topicTitle,
    currentPoint: points[0] || null,
    lessonContent: input.lessonContent,
    conceptIndex: 0,
  });
};

const buildDepthAwareIntroSpeech = (
  language: "English" | "Hindi" | "Punjabi",
  teachingDepth: LiveBoardTeachingDepth,
  displayTopicTitle: string,
  subjectLine: string,
  classLine: string
): string => {
  if (teachingDepth === "BASIC") {
    return pickLanguage(
      language,
      `Today we are learning ${displayTopicTitle} in ${subjectLine}. I will explain it in very simple steps and keep the written support short and clear.`,
      `आज हम ${subjectLine} में ${displayTopicTitle} पढ़ेंगे। मैं इसे बहुत सरल चरणों में समझाऊँगा और लिखित सहारा छोटा व साफ रखूँगा।`,
      `ਅੱਜ ਅਸੀਂ ${subjectLine} ਵਿੱਚ ${displayTopicTitle} ਪੜ੍ਹਾਂਗੇ। ਮੈਂ ਇਸਨੂੰ ਬਹੁਤ ਸੌਖੇ ਕਦਮਾਂ ਨਾਲ ਸਮਝਾਵਾਂਗਾ ਅਤੇ ਲਿਖਤੀ ਸਹਾਇਤਾ ਛੋਟੀ ਤੇ ਸਾਫ਼ ਰੱਖਾਂਗਾ।`
    );
  }
  if (teachingDepth === "ADVANCED") {
    return pickLanguage(
      language,
      `Today we are learning ${displayTopicTitle} in ${subjectLine}. I will explain it step by step, connect the core idea, and use short support notes where needed.`,
      `आज हम ${subjectLine} में ${displayTopicTitle} पढ़ेंगे। मैं इसे चरणबद्ध तरीके से समझाऊँगा, मुख्य विचार जोड़ूँगा और जहाँ ज़रूरत होगी वहाँ छोटे सहायक बिंदु लिखूँगा।`,
      `ਅੱਜ ਅਸੀਂ ${subjectLine} ਵਿੱਚ ${displayTopicTitle} ਪੜ੍ਹਾਂਗੇ। ਮੈਂ ਇਸਨੂੰ ਕਦਮ ਦਰ ਕਦਮ ਸਮਝਾਵਾਂਗਾ, ਮੁੱਖ ਵਿਚਾਰ ਜੋੜਾਂਗਾ ਅਤੇ ਜਿੱਥੇ ਲੋੜ ਹੋਵੇ ਉੱਥੇ ਛੋਟੇ ਸਹਾਇਕ ਬਿੰਦੂ ਲਿਖਾਂਗਾ।`
    );
  }
  return pickLanguage(
    language,
    `Today we are learning ${displayTopicTitle} in ${subjectLine}. I will teach it step by step like a live tutor for ${classLine}.`,
    `आज हम ${subjectLine} में ${displayTopicTitle} पढ़ेंगे। मैं इसे एक लाइव ट्यूटर की तरह चरणबद्ध तरीके से समझाऊँगा।`,
    `ਅੱਜ ਅਸੀਂ ${subjectLine} ਵਿੱਚ ${displayTopicTitle} ਪੜ੍ਹਾਂਗੇ। ਮੈਂ ਇਸਨੂੰ ਇੱਕ ਲਾਈਵ ਟਿਊਟਰ ਵਾਂਗ ਕਦਮ ਦਰ ਕਦਮ ਸਮਝਾਵਾਂਗਾ।`
  );
};

const buildSafeLessonContentOverride = (
  subjectName: string,
  topicTitle: string,
  explanationLanguage: "English" | "Hindi" | "Punjabi",
  boardLanguage: "English" | "Hindi" | "Punjabi"
): LiveBoardLessonContent | null => {
  const normalizedTopic = normalizeText(topicTitle).toUpperCase();
  const normalizedTopicKey = normalizeTopicKey(topicTitle);
  const normalizedSubject = normalizeText(subjectName).toUpperCase();
  const isPunjabiGrammar =
    normalizedSubject.includes("PUNJABI") &&
    (normalizedSubject.includes("GRAMMAR") || normalizedSubject.includes("LANGUAGE"));

  if (isPunjabiGrammar && normalizedTopicKey === "ਵਚਨ") {
    return {
      boardPayload: {
        boardTitle: "ਵਚਨ",
        boardLines: [
          "ਵਚਨ ਗਿਣਤੀ ਦੱਸਦਾ ਹੈ।",
          "ਇਕਵਚਨ ਇੱਕ ਲਈ, ਬਹੁਵਚਨ ਕਈਆਂ ਲਈ।",
        ],
        formulas: ["ਇੱਕ -> ਇਕਵਚਨ | ਕਈ -> ਬਹੁਵਚਨ"],
        steps: [],
        exampleTitle: "ਉਦਾਹਰਨ",
        exampleSteps: ["ਮੁੰਡਾ -> ਮੁੰਡੇ"],
      },
      noteSpeech: [
        "ਵਚਨ ਸਾਨੂੰ ਦੱਸਦਾ ਹੈ ਕਿ ਗੱਲ ਇੱਕ ਦੀ ਹੋ ਰਹੀ ਹੈ ਜਾਂ ਇੱਕ ਤੋਂ ਵੱਧ ਦੀ।",
        "ਇੱਕ ਲਈ ਇਕਵਚਨ ਅਤੇ ਕਈਆਂ ਲਈ ਬਹੁਵਚਨ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ।",
      ],
      formulaSpeech: ["ਯਾਦ ਰੱਖੋ: ਇੱਕ ਲਈ ਇਕਵਚਨ ਅਤੇ ਕਈਆਂ ਲਈ ਬਹੁਵਚਨ।"],
      stepSpeech: [],
      exampleSpeech: "ਉਦਾਹਰਨ ਵੇਖੋ: ਮੁੰਡਾ ਇਕਵਚਨ ਹੈ ਅਤੇ ਮੁੰਡੇ ਬਹੁਵਚਨ ਹੈ।",
      recapSpeech: "ਦੁਹਰਾਈ: ਵਚਨ ਗਿਣਤੀ ਦੱਸਦਾ ਹੈ। ਇਕਵਚਨ ਇੱਕ ਲਈ ਅਤੇ ਬਹੁਵਚਨ ਕਈਆਂ ਲਈ ਹੁੰਦਾ ਹੈ।",
      recapBoardText: "ਵਚਨ | ਇਕਵਚਨ | ਬਹੁਵਚਨ",
      recapPoints: ["ਵਚਨ ਗਿਣਤੀ ਦੱਸਦਾ ਹੈ।", "ਇਕਵਚਨ ਇੱਕ ਲਈ ਹੈ।", "ਬਹੁਵਚਨ ਕਈਆਂ ਲਈ ਹੈ।"],
      practiceQuestion: "ਛੋਟੀ ਜਾਂਚ: ਮੁੰਡਾ, ਕੁੜੀ, ਕਿਤਾਬ ਦੇ ਬਹੁਵਚਨ ਬਣਾਓ।",
      diagramInstructions: [],
      diagramActions: [],
    };
  }

  if (isPunjabiGrammar && normalizedTopicKey === "ਲਿੰਗ") {
    return {
      boardPayload: {
        boardTitle: "ਲਿੰਗ",
        boardLines: [
          "ਲਿੰਗ ਨਾਮ ਦਾ ਰੂਪ ਦੱਸਦਾ ਹੈ।",
          "ਪੁਲਿੰਗ ਅਤੇ ਇਸਤ੍ਰੀਲਿੰਗ ਦੋ ਮੁੱਖ ਰੂਪ ਹਨ।",
        ],
        formulas: ["ਪੁਲਿੰਗ -> ਮੁੰਡਾ | ਇਸਤ੍ਰੀਲਿੰਗ -> ਕੁੜੀ"],
        steps: [],
        exampleTitle: "ਉਦਾਹਰਨ",
        exampleSteps: ["ਮੁੰਡਾ / ਕੁੜੀ"],
      },
      noteSpeech: [
        "ਲਿੰਗ ਨਾਲ ਅਸੀਂ ਜਾਣਦੇ ਹਾਂ ਕਿ ਕੋਈ ਨਾਮ ਪੁਲਿੰਗ ਹੈ ਜਾਂ ਇਸਤ੍ਰੀਲਿੰਗ।",
        "ਸਹੀ ਲਿੰਗ ਵਰਤਣ ਨਾਲ ਵਾਕ ਠੀਕ ਬਣਦਾ ਹੈ।",
      ],
      formulaSpeech: ["ਪੁਲਿੰਗ ਅਤੇ ਇਸਤ੍ਰੀਲਿੰਗ ਦੇ ਰੂਪ ਯਾਦ ਰੱਖੋ।"],
      stepSpeech: [],
      exampleSpeech: "ਉਦਾਹਰਨ ਵੇਖੋ: ਮੁੰਡਾ ਪੁਲਿੰਗ ਹੈ ਅਤੇ ਕੁੜੀ ਇਸਤ੍ਰੀਲਿੰਗ ਹੈ।",
      recapSpeech: "ਦੁਹਰਾਈ: ਲਿੰਗ ਨਾਮ ਦਾ ਰੂਪ ਦੱਸਦਾ ਹੈ ਅਤੇ ਪੁਲਿੰਗ ਜਾਂ ਇਸਤ੍ਰੀਲਿੰਗ ਪਛਾਣਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।",
      recapBoardText: "ਲਿੰਗ | ਪੁਲਿੰਗ | ਇਸਤ੍ਰੀਲਿੰਗ",
      recapPoints: ["ਲਿੰਗ ਨਾਮ ਦਾ ਰੂਪ ਦੱਸਦਾ ਹੈ।", "ਪੁਲਿੰਗ ਇੱਕ ਰੂਪ ਹੈ।", "ਇਸਤ੍ਰੀਲਿੰਗ ਦੂਜਾ ਰੂਪ ਹੈ।"],
      practiceQuestion: "ਛੋਟੀ ਜਾਂਚ: ਅਧਿਆਪਕ ਅਤੇ ਅਧਿਆਪਿਕਾ ਦਾ ਲਿੰਗ ਦੱਸੋ।",
      diagramInstructions: [],
      diagramActions: [],
    };
  }

  if (isPunjabiGrammar && normalizedTopicKey === "ਸੰਬੰਧੀ ਸ਼ਬਦ") {
    return {
      boardPayload: {
        boardTitle: "ਸੰਬੰਧੀ ਸ਼ਬਦ",
        boardLines: [
          "ਸੰਬੰਧੀ ਸ਼ਬਦ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ।",
          "ਇਹ ਦੋ ਨਾਮਾਂ ਜਾਂ ਹਿੱਸਿਆਂ ਨੂੰ ਜੋੜਦੇ ਹਨ।",
        ],
        formulas: ["ਨਾਮ + ਸੰਬੰਧੀ ਸ਼ਬਦ + ਨਾਮ"],
        steps: [],
        exampleTitle: "ਉਦਾਹਰਨ",
        exampleSteps: ["ਮੇਜ਼ ਉੱਤੇ ਕਿਤਾਬ ਹੈ।"],
      },
      noteSpeech: [
        "ਸੰਬੰਧੀ ਸ਼ਬਦ ਵਾਕ ਵਿੱਚ ਦੋ ਸ਼ਬਦਾਂ ਦੇ ਵਿਚਕਾਰਲਾ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ।",
        "ਇਹ ਜਗ੍ਹਾ, ਸਥਿਤੀ ਜਾਂ ਦਿਸ਼ਾ ਸਪਸ਼ਟ ਕਰਦੇ ਹਨ।",
      ],
      formulaSpeech: ["ਰਚਨਾ ਵੇਖੋ: ਨਾਮ, ਸੰਬੰਧੀ ਸ਼ਬਦ, ਫਿਰ ਦੂਜਾ ਨਾਮ।"],
      stepSpeech: [],
      exampleSpeech: "ਉਦਾਹਰਨ ਵੇਖੋ: ਮੇਜ਼ ਉੱਤੇ ਕਿਤਾਬ ਹੈ। ਇੱਥੇ 'ਉੱਤੇ' ਸੰਬੰਧੀ ਸ਼ਬਦ ਹੈ।",
      recapSpeech: "ਦੁਹਰਾਈ: ਸੰਬੰਧੀ ਸ਼ਬਦ ਦੋ ਹਿੱਸਿਆਂ ਦਾ ਰਿਸ਼ਤਾ ਸਪਸ਼ਟ ਕਰਦੇ ਹਨ।",
      recapBoardText: "ਰਿਸ਼ਤਾ | ਜਗ੍ਹਾ | ਦਿਸ਼ਾ",
      recapPoints: ["ਸੰਬੰਧੀ ਸ਼ਬਦ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ।", "ਇਹ ਅਰਥ ਸਪਸ਼ਟ ਕਰਦੇ ਹਨ।", "ਉਦਾਹਰਨ ਨਾਲ ਇਨ੍ਹਾਂ ਨੂੰ ਪਛਾਣੋ।"],
      practiceQuestion: "ਛੋਟੀ ਜਾਂਚ: ਖਾਲੀ ਥਾਵਾਂ ਵਿੱਚ ਢੰਗ ਦੇ ਸੰਬੰਧੀ ਸ਼ਬਦ ਭਰੋ।",
      diagramInstructions: [],
      diagramActions: [],
    };
  }

  if (
    isPunjabiGrammar &&
    (normalizedTopic.includes("ਵਚਨ") || normalizedTopic.includes("वचन") || normalizedTopic.includes("SINGULAR"))
  ) {
    return {
      boardPayload: {
        boardTitle: pickLanguage(boardLanguage, "Singular And Plural", "वचन", "ਵਚਨ"),
        boardLines: [
          pickLanguage(
            boardLanguage,
            "Vachan tells whether the noun means one or many.",
            "वचन बताता है कि गिनती एक है या एक से अधिक।",
            "ਵਚਨ ਦੱਸਦਾ ਹੈ ਕਿ ਗਿਣਤੀ ਇੱਕ ਹੈ ਜਾਂ ਇੱਕ ਤੋਂ ਵੱਧ।"
          ),
          pickLanguage(
            boardLanguage,
            "Singular means one person or thing.",
            "एकवचन एक व्यक्ति या वस्तु के लिए होता है।",
            "ਇਕਵਚਨ ਇੱਕ ਵਿਅਕਤੀ ਜਾਂ ਚੀਜ਼ ਲਈ ਹੁੰਦਾ ਹੈ।"
          ),
          pickLanguage(
            boardLanguage,
            "Plural means more than one person or thing.",
            "बहुवचन एक से अधिक के लिए होता है।",
            "ਬਹੁਵਚਨ ਇੱਕ ਤੋਂ ਵੱਧ ਲਈ ਹੁੰਦਾ ਹੈ।"
          ),
        ],
        formulas: [],
        steps: [],
        exampleTitle: pickLanguage(boardLanguage, "Example", "उदाहरण", "ਉਦਾਹਰਨ"),
        exampleSteps: [
          pickLanguage(
            boardLanguage,
            "boy -> boys, book -> books",
            "लड़का -> लड़के, किताब -> किताबें",
            "ਮੁੰਡਾ -> ਮੁੰਡੇ, ਕਿਤਾਬ -> ਕਿਤਾਬਾਂ"
          ),
        ],
      },
      noteSpeech: [
        pickLanguage(
          explanationLanguage,
          "Vachan tells us whether we are talking about one or more than one.",
          "वचन हमें बताता है कि बात एक की हो रही है या एक से अधिक की।",
          "ਵਚਨ ਸਾਨੂੰ ਦੱਸਦਾ ਹੈ ਕਿ ਗੱਲ ਇੱਕ ਦੀ ਹੋ ਰਹੀ ਹੈ ਜਾਂ ਇੱਕ ਤੋਂ ਵੱਧ ਦੀ।"
        ),
        pickLanguage(
          explanationLanguage,
          "When the noun is one, we use singular.",
          "जब संज्ञा एक हो, तो हम एकवचन लिखते हैं।",
          "ਜਦੋਂ ਨਾਮ ਇੱਕ ਹੋਵੇ, ਅਸੀਂ ਇਕਵਚਨ ਵਰਤਦੇ ਹਾਂ।"
        ),
        pickLanguage(
          explanationLanguage,
          "When the noun is more than one, we use plural.",
          "जब संज्ञा एक से अधिक हो, तो हम बहुवचन लिखते हैं।",
          "ਜਦੋਂ ਨਾਮ ਇੱਕ ਤੋਂ ਵੱਧ ਹੋਵੇ, ਅਸੀਂ ਬਹੁਵਚਨ ਵਰਤਦੇ ਹਾਂ।"
        ),
      ],
      formulaSpeech: [],
      stepSpeech: [],
      exampleSpeech: pickLanguage(
        explanationLanguage,
        "Look at the example carefully: boy becomes boys and book becomes books.",
        "उदाहरण ध्यान से देखो: लड़का का रूप लड़के और किताब का रूप किताबें बन जाता है।",
        "ਉਦਾਹਰਨ ਧਿਆਨ ਨਾਲ ਵੇਖੋ: ਮੁੰਡਾ ਦਾ ਰੂਪ ਮੁੰਡੇ ਅਤੇ ਕਿਤਾਬ ਦਾ ਰੂਪ ਕਿਤਾਬਾਂ ਬਣ ਜਾਂਦਾ ਹੈ।"
      ),
      recapSpeech: pickLanguage(
        explanationLanguage,
        "Today we learned that singular is used for one and plural is used for more than one.",
        "आज हमने सीखा कि एकवचन एक के लिए और बहुवचन एक से अधिक के लिए होता है।",
        "ਅੱਜ ਅਸੀਂ ਸਿੱਖਿਆ ਕਿ ਇਕਵਚਨ ਇੱਕ ਲਈ ਅਤੇ ਬਹੁਵਚਨ ਇੱਕ ਤੋਂ ਵੱਧ ਲਈ ਹੁੰਦਾ ਹੈ।"
      ),
      recapBoardText: pickLanguage(
        boardLanguage,
        "one = singular | many = plural",
        "एक = एकवचन | कई = बहुवचन",
        "ਇੱਕ = ਇਕਵਚਨ | ਕਈ = ਬਹੁਵਚਨ"
      ),
      recapPoints: [
        pickLanguage(boardLanguage, "Vachan shows number.", "वचन गिनती दिखाता है।", "ਵਚਨ ਗਿਣਤੀ ਦੱਸਦਾ ਹੈ।"),
        pickLanguage(boardLanguage, "Singular is for one.", "एकवचन एक के लिए है।", "ਇਕਵਚਨ ਇੱਕ ਲਈ ਹੈ।"),
        pickLanguage(boardLanguage, "Plural is for many.", "बहुवचन कई के लिए है।", "ਬਹੁਵਚਨ ਕਈਆਂ ਲਈ ਹੈ।"),
      ],
      practiceQuestion: pickLanguage(
        explanationLanguage,
        "Change these into plural: boy, girl, book.",
        "इनके बहुवचन बनाओ: लड़का, लड़की, किताब।",
        "ਇਨ੍ਹਾਂ ਦੇ ਬਹੁਵਚਨ ਬਣਾਓ: ਮੁੰਡਾ, ਕੁੜੀ, ਕਿਤਾਬ।"
      ),
      diagramInstructions: [],
      diagramActions: [],
    };
  }

  return null;
};

const applyStrictPunjabiGrammarTopicOverride = (
  lessonContent: LiveBoardLessonContent,
  subjectName: string,
  topicTitle: string
): LiveBoardLessonContent => {
  const subjectKey = normalizeTopicKey(subjectName);
  const topicKey = normalizeTopicKey(topicTitle);
  const isPunjabiGrammar = subjectKey.includes("punjabi") && subjectKey.includes("grammar");

  if (!isPunjabiGrammar) {
    return lessonContent;
  }

  if (topicKey === "ਵਚਨ") {
    return {
      ...lessonContent,
      boardPayload: {
        ...lessonContent.boardPayload,
        boardTitle: "ਵਚਨ",
        boardLines: ["ਵਚਨ ਗਿਣਤੀ ਦੱਸਦਾ ਹੈ।", "ਇਕਵਚਨ ਇੱਕ ਲਈ, ਬਹੁਵਚਨ ਕਈਆਂ ਲਈ।"],
        formulas: ["ਇੱਕ -> ਇਕਵਚਨ | ਕਈ -> ਬਹੁਵਚਨ"],
        exampleTitle: "ਉਦਾਹਰਨ",
        exampleSteps: ["ਮੁੰਡਾ -> ਮੁੰਡੇ"],
      },
      noteSpeech: [
        "ਵਚਨ ਸਾਨੂੰ ਦੱਸਦਾ ਹੈ ਕਿ ਗੱਲ ਇੱਕ ਦੀ ਹੋ ਰਹੀ ਹੈ ਜਾਂ ਇੱਕ ਤੋਂ ਵੱਧ ਦੀ।",
        "ਇੱਕ ਲਈ ਇਕਵਚਨ ਅਤੇ ਕਈਆਂ ਲਈ ਬਹੁਵਚਨ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ।",
      ],
      recapBoardText: "ਵਚਨ | ਇਕਵਚਨ | ਬਹੁਵਚਨ",
      recapPoints: ["ਵਚਨ ਗਿਣਤੀ ਦੱਸਦਾ ਹੈ।", "ਇਕਵਚਨ ਇੱਕ ਲਈ ਹੈ।", "ਬਹੁਵਚਨ ਕਈਆਂ ਲਈ ਹੈ।"],
      practiceQuestion: "ਛੋਟੀ ਜਾਂਚ: ਮੁੰਡਾ, ਕੁੜੀ, ਕਿਤਾਬ ਦੇ ਬਹੁਵਚਨ ਬਣਾਓ।",
    };
  }

  if (topicKey === "ਲਿੰਗ") {
    return {
      ...lessonContent,
      boardPayload: {
        ...lessonContent.boardPayload,
        boardTitle: "ਲਿੰਗ",
        boardLines: ["ਲਿੰਗ ਨਾਮ ਦਾ ਰੂਪ ਦੱਸਦਾ ਹੈ।", "ਪੁਲਿੰਗ ਅਤੇ ਇਸਤ੍ਰੀਲਿੰਗ ਦੋ ਰੂਪ ਹਨ।"],
        formulas: ["ਪੁਲਿੰਗ -> ਮੁੰਡਾ | ਇਸਤ੍ਰੀਲਿੰਗ -> ਕੁੜੀ"],
        exampleTitle: "ਉਦਾਹਰਨ",
        exampleSteps: ["ਮੁੰਡਾ / ਕੁੜੀ"],
      },
      noteSpeech: [
        "ਲਿੰਗ ਨਾਲ ਅਸੀਂ ਜਾਣਦੇ ਹਾਂ ਕਿ ਕੋਈ ਨਾਮ ਪੁਲਿੰਗ ਹੈ ਜਾਂ ਇਸਤ੍ਰੀਲਿੰਗ।",
        "ਸਹੀ ਲਿੰਗ ਵਰਤਣ ਨਾਲ ਵਾਕ ਠੀਕ ਬਣਦਾ ਹੈ।",
      ],
      recapBoardText: "ਲਿੰਗ | ਪੁਲਿੰਗ | ਇਸਤ੍ਰੀਲਿੰਗ",
      recapPoints: ["ਲਿੰਗ ਨਾਮ ਦਾ ਰੂਪ ਦੱਸਦਾ ਹੈ।", "ਪੁਲਿੰਗ ਇੱਕ ਰੂਪ ਹੈ।", "ਇਸਤ੍ਰੀਲਿੰਗ ਦੂਜਾ ਰੂਪ ਹੈ।"],
      practiceQuestion: "ਛੋਟੀ ਜਾਂਚ: ਅਧਿਆਪਕ ਅਤੇ ਅਧਿਆਪਿਕਾ ਦਾ ਲਿੰਗ ਦੱਸੋ।",
    };
  }

  if (topicKey === "ਸੰਬੰਧੀ ਸ਼ਬਦ") {
    return {
      ...lessonContent,
      boardPayload: {
        ...lessonContent.boardPayload,
        boardTitle: "ਸੰਬੰਧੀ ਸ਼ਬਦ",
        boardLines: ["ਸੰਬੰਧੀ ਸ਼ਬਦ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ।", "ਇਹ ਦੋ ਹਿੱਸਿਆਂ ਨੂੰ ਜੋੜਦੇ ਹਨ।"],
        formulas: ["ਨਾਮ + ਸੰਬੰਧੀ ਸ਼ਬਦ + ਨਾਮ"],
        exampleTitle: "ਉਦਾਹਰਨ",
        exampleSteps: ["ਮੇਜ਼ ਉੱਤੇ ਕਿਤਾਬ ਹੈ।"],
      },
      noteSpeech: [
        "ਸੰਬੰਧੀ ਸ਼ਬਦ ਵਾਕ ਵਿੱਚ ਦੋ ਸ਼ਬਦਾਂ ਦੇ ਵਿਚਕਾਰਲਾ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ।",
        "ਇਹ ਜਗ੍ਹਾ, ਸਥਿਤੀ ਜਾਂ ਦਿਸ਼ਾ ਸਪਸ਼ਟ ਕਰਦੇ ਹਨ।",
      ],
      recapBoardText: "ਰਿਸ਼ਤਾ | ਜਗ੍ਹਾ | ਦਿਸ਼ਾ",
      recapPoints: ["ਸੰਬੰਧੀ ਸ਼ਬਦ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ।", "ਇਹ ਅਰਥ ਸਪਸ਼ਟ ਕਰਦੇ ਹਨ।", "ਉਦਾਹਰਨ ਨਾਲ ਇਨ੍ਹਾਂ ਨੂੰ ਪਛਾਣੋ।"],
      practiceQuestion: "ਛੋਟੀ ਜਾਂਚ: ਖਾਲੀ ਥਾਵਾਂ ਵਿੱਚ ਢੰਗ ਦੇ ਸੰਬੰਧੀ ਸ਼ਬਦ ਭਰੋ।",
    };
  }

  return lessonContent;
};

type TeacherIntent =
  | "START"
  | "CONTINUE"
  | "DOUBT"
  | "REPEAT"
  | "SIMPLER"
  | "ADVANCED"
  | "EXAMPLE"
  | "CHECK";

type TeacherLessonPoint = {
  anchor: string;
  explanation: string;
};

const START_COMMAND = "__START_TUITION_AI_TEACHER__";
const CONTINUE_COMMAND = "__CONTINUE_TUITION_AI_TEACHER__";
const REPEAT_COMMAND = "__REPEAT_TUITION_AI_TEACHER__";
const SIMPLER_COMMAND = "__SIMPLER_TUITION_AI_TEACHER__";
const ADVANCED_COMMAND = "__ADVANCED_TUITION_AI_TEACHER__";
const EXAMPLE_COMMAND = "__EXAMPLE_TUITION_AI_TEACHER__";
const CHECK_COMMAND = "__CHECK_TUITION_AI_TEACHER__";

const parseTeacherIntent = (prompt: string, messageNumber: number): TeacherIntent => {
  const normalized = normalizeText(prompt).toUpperCase();
  if (!normalized && messageNumber <= 1) return "START";
  if (normalized.startsWith(START_COMMAND)) return "START";
  if (normalized.startsWith(CONTINUE_COMMAND)) return "CONTINUE";
  if (normalized.startsWith(REPEAT_COMMAND)) return "REPEAT";
  if (normalized.startsWith(SIMPLER_COMMAND)) return "SIMPLER";
  if (normalized.startsWith(ADVANCED_COMMAND)) return "ADVANCED";
  if (normalized.startsWith(EXAMPLE_COMMAND)) return "EXAMPLE";
  if (normalized.startsWith(CHECK_COMMAND)) return "CHECK";
  if (/[?]|WHY|HOW|WHAT|DOUBT|DO NOT UNDERSTAND|UNDERSTAND|समझ|क्यों|कैसे|ਕੀ|ਕਿਉਂ|ਕਿਵੇਂ/u.test(normalized)) {
    return "DOUBT";
  }
  return messageNumber <= 1 ? "START" : "DOUBT";
};

const stripTeacherCommand = (prompt: string): string =>
  normalizeText(prompt)
    .replace(START_COMMAND, "")
    .replace(CONTINUE_COMMAND, "")
    .replace(REPEAT_COMMAND, "")
    .replace(SIMPLER_COMMAND, "")
    .replace(ADVANCED_COMMAND, "")
    .replace(EXAMPLE_COMMAND, "")
    .replace(CHECK_COMMAND, "")
    .trim();

const getDepthAnchorLimit = (teachingDepth: LiveBoardTeachingDepth): number => {
  if (teachingDepth === "BASIC") return 1;
  if (teachingDepth === "ADVANCED") return 3;
  return 2;
};

const getTrailingStopwords = (language: "English" | "Hindi" | "Punjabi"): Set<string> => {
  if (language === "Hindi") {
    return new Set(["और", "या", "का", "की", "के", "है", "हैं", "में", "से", "पर", "को", "एक"]);
  }
  if (language === "Punjabi") {
    return new Set(["ਅਤੇ", "ਜਾਂ", "ਦਾ", "ਦੀ", "ਦੇ", "ਹੈ", "ਹਨ", "ਵਿੱਚ", "ਤੋਂ", "ਤੇ", "ਨੂੰ", "ਕਿ", "ਇੱਕ"]);
  }
  return new Set(["and", "or", "the", "a", "an", "to", "of", "for", "with", "into", "in"]);
};

const conciseBoardAnchorOverride = (
  text: string,
  language: "English" | "Hindi" | "Punjabi"
): string | null => {
  const normalized = normalizeText(text);
  const textKey = normalizeTopicKey(normalized);

  if (
    textKey.includes("chemical reaction") ||
    textKey.includes("रासायनिक अभिक्रिया") ||
    textKey.includes("ਰਸਾਇਣਕ ਕ੍ਰਿਆ") ||
    textKey.includes("ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਉਹ ਪ੍ਰਕਿਰਿਆ") ||
    textKey.includes("रासायनिक अभिक्रिया वह प्रक्रिया") ||
    textKey.includes("chemical reaction is a process") ||
    ((textKey.includes("reaction") || textKey.includes("अभिक्रिया") || textKey.includes("ਕ੍ਰਿਆ")) &&
      (textKey.includes("new substances") || textKey.includes("नए पदार्थ") || textKey.includes("ਨਵੇਂ ਪਦਾਰਥ")))
  ) {
    return pickLanguage(
      language,
      "Chemical reactions form new substances.",
      "रासायनिक अभिक्रिया में नए पदार्थ बनते हैं।",
      "ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਵਿੱਚ ਨਵੇਂ ਪਦਾਰਥ ਬਣਦੇ ਹਨ।"
    );
  }

  if (textKey.includes("fraction") || textKey.includes("भिन्न") || textKey.includes("ਭਿੰਨ")) {
    return pickLanguage(
      language,
      "Fractions show equal parts of a whole.",
      "भिन्न पूरे के बराबर भाग दिखाती है।",
      "ਭਿੰਨ ਪੂਰੇ ਦੇ ਬਰਾਬਰ ਭਾਗ ਦਿਖਾਂਦੀ ਹੈ।"
    );
  }

  if (textKey.includes("ਵਚਨ")) {
    return "ਵਚਨ ਗਿਣਤੀ ਦੱਸਦਾ ਹੈ।";
  }

  if (textKey.includes("ਲਿੰਗ")) {
    return "ਲਿੰਗ ਨਾਮ ਦਾ ਰੂਪ ਦੱਸਦਾ ਹੈ।";
  }

  if (textKey.includes("ਸੰਬੰਧੀ ਸ਼ਬਦ")) {
    return "ਸੰਬੰਧੀ ਸ਼ਬਦ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ।";
  }

  return null;
};

const compactBoardText = (
  text: string,
  maxWords: number,
  language: "English" | "Hindi" | "Punjabi" = "English"
): string => {
  const normalized = normalizeText(text)
    .split(/(?<=[.!?।॥])\s+/u)[0]
    .split(/[;:]/u)[0]
    .trim();
  if (!normalized) return "";

  const conciseOverride = conciseBoardAnchorOverride(normalized, language);
  if (conciseOverride) {
    return conciseOverride.replace(/[.,;:!?।॥]+$/u, "").trim();
  }

  const words = normalized.split(/\s+/u).filter(Boolean);
  if (words.length <= maxWords) {
    return normalized.replace(/[.,;:!?।॥]+$/u, "").trim();
  }

  const trailingStopwords = getTrailingStopwords(language);
  const overflowLimit = Math.min(words.length, maxWords + 4);
  let compactWords = words.slice(0, overflowLimit);

  while (
    compactWords.length > Math.max(4, maxWords - 1) &&
    trailingStopwords.has(compactWords[compactWords.length - 1].toLowerCase())
  ) {
    compactWords = compactWords.slice(0, -1);
  }

  return compactWords.join(" ").replace(/[.,;:!?।॥]+$/u, "").trim();
};

const compactKeywordList = (
  recapBoardText: string,
  recapPoints: string[],
  language: "English" | "Hindi" | "Punjabi"
): string[] => {
  const explicitKeywords = normalizeText(recapBoardText)
    .split("|")
    .map((item) => normalizeText(item))
    .filter(Boolean);
  if (explicitKeywords.length) {
    return explicitKeywords.slice(0, 3);
  }
  return recapPoints.map((point) => compactBoardText(point, 5, language)).slice(0, 3);
};

const buildLessonPoints = (lessonContent: LiveBoardLessonContent): TeacherLessonPoint[] =>
  lessonContent.boardPayload.boardLines.map((anchor, index) => ({
    anchor,
    explanation: lessonContent.noteSpeech[index] || anchor,
  }));

const buildMinimalBoardState = (input: {
  lessonContent: LiveBoardLessonContent;
  conceptIndex: number;
  phase: TuitionTeacherPhase;
  teachingDepth: LiveBoardTeachingDepth;
  boardLanguage: "English" | "Hindi" | "Punjabi";
  includeExample?: boolean;
  includeRecap?: boolean;
}): TuitionTeacherBoardState => {
  const points = buildLessonPoints(input.lessonContent);
  const safeConceptIndex = Math.max(0, Math.min(input.conceptIndex, Math.max(points.length - 1, 0)));
  const anchorLimit = getDepthAnchorLimit(input.teachingDepth);
  const introAnchorCount =
    input.teachingDepth === "BASIC" ? 1 : input.teachingDepth === "ADVANCED" ? 2 : 2;
  const visibleCount =
    input.phase === "INTRO"
      ? Math.min(introAnchorCount, points.length, anchorLimit)
      : Math.min(safeConceptIndex + 1, anchorLimit);
  const anchorWordLimit =
    input.teachingDepth === "BASIC" ? 8 : input.teachingDepth === "ADVANCED" ? 14 : 12;
  const localizedTitle = displayTopicTitle(input.lessonContent.boardPayload.boardTitle, input.boardLanguage);
  const anchors = points
    .slice(0, visibleCount)
    .map((point) => compactBoardText(point.anchor, anchorWordLimit, input.boardLanguage));
  const formula = input.lessonContent.boardPayload.formulas[0] || null;
  const example =
    input.includeExample || (input.phase === "INTRO" && input.teachingDepth === "ADVANCED")
      ? compactBoardText(input.lessonContent.boardPayload.exampleSteps[0] || "", 12, input.boardLanguage) || null
      : null;
  const diagramLabels = input.lessonContent.diagramActions
    .map((action) => action.label || action.text || "")
    .filter(Boolean)
    .map((label) => compactBoardText(label, 5, input.boardLanguage))
    .slice(0, 1);
  const recapKeywords = input.includeRecap
    ? compactKeywordList(input.lessonContent.recapBoardText, input.lessonContent.recapPoints, input.boardLanguage)
    : [];

  return {
    title: localizedTitle,
    currentConcept: points[safeConceptIndex]?.anchor || null,
    anchors,
    formula:
      input.phase === "INTRO"
        ? input.teachingDepth === "ADVANCED"
          ? compactBoardText(formula || "", 10, input.boardLanguage) || null
          : null
        : input.phase === "EXPLAIN_CONCEPT" ||
      input.phase === "WRITE_ANCHOR" ||
      input.phase === "GIVE_EXAMPLE" ||
      input.phase === "RECAP"
        ? compactBoardText(formula || "", 10, input.boardLanguage) || null
        : null,
    example,
    diagramLabels,
    recapKeywords,
    highlight: points[safeConceptIndex]?.anchor || localizedTitle,
  };
};

const buildTeacherDoubtResponse = (
  language: "English" | "Hindi" | "Punjabi",
  studentQuestion: string,
  conceptSpeech: string
): string => {
  const cleanQuestion = stripTeacherCommand(studentQuestion);
  return pickLanguage(
    language,
    `Good question. Let us pause here and clear that doubt. ${conceptSpeech}${cleanQuestion ? ` Your question was: ${cleanQuestion}.` : ""} We will continue from this same point after that.`,
    `अच्छा प्रश्न है। हम यहीं रुककर इस शंका को साफ़ करते हैं। ${conceptSpeech}${cleanQuestion ? ` आपका प्रश्न था: ${cleanQuestion}.` : ""} इसके बाद हम इसी बिंदु से आगे बढ़ेंगे।`,
    `ਵਧੀਆ ਸਵਾਲ ਹੈ। ਅਸੀਂ ਇੱਥੇ ਰੁਕ ਕੇ ਇਹ ਸ਼ੱਕ ਸਾਫ਼ ਕਰਦੇ ਹਾਂ। ${conceptSpeech}${cleanQuestion ? ` ਤੁਹਾਡਾ ਸਵਾਲ ਸੀ: ${cleanQuestion}.` : ""} ਇਸ ਤੋਂ ਬਾਅਦ ਅਸੀਂ ਇੱਥੋਂ ਹੀ ਅੱਗੇ ਚੱਲਾਂਗੇ।`
  );
};

const buildTeacherCheckQuestion = (
  language: "English" | "Hindi" | "Punjabi",
  teachingDepth: LiveBoardTeachingDepth,
  question: string
): string => {
  const normalizedQuestion = normalizeText(question)
    .replace(/^Quick check:\s*/i, "")
    .replace(/^Think deeper:\s*/i, "")
    .replace(/^Think a little deeper and answer this:\s*/i, "")
    .replace(/^छोटा जाँच-प्रश्न:\s*/u, "")
    .replace(/^जरा गहराई से सोचो:\s*/u, "")
    .replace(/^थोड़ा गहराई से सोचकर इसका उत्तर दो:\s*/u, "")
    .replace(/^ਛੋਟਾ ਜਾਂਚ-ਪ੍ਰਸ਼ਨ:\s*/u, "")
    .replace(/^ਹੁਣ ਥੋੜ੍ਹੀ ਗਹਿਰਾਈ ਨਾਲ ਸੋਚੋ:\s*/u, "")
    .replace(/^ਥੋੜ੍ਹਾ ਹੋਰ ਗਹਿਰਾਈ ਨਾਲ ਸੋਚੋ ਅਤੇ ਇਸਦਾ ਜਵਾਬ ਦਿਓ:\s*/u, "")
    .trim();
  if (teachingDepth === "BASIC") {
    return pickLanguage(
      language,
      `Quick check: ${normalizedQuestion}`,
      `छोटी जाँच: ${normalizedQuestion}`,
      `ਛੋਟੀ ਜਾਂਚ: ${normalizedQuestion}`
    );
  }
  if (teachingDepth === "ADVANCED") {
    return pickLanguage(
      language,
      `Think a little deeper and answer this: ${normalizedQuestion}`,
      `थोड़ा गहराई से सोचकर इसका उत्तर दो: ${normalizedQuestion}`,
      `ਥੋੜ੍ਹਾ ਹੋਰ ਗਹਿਰਾਈ ਨਾਲ ਸੋਚੋ ਅਤੇ ਇਸਦਾ ਜਵਾਬ ਦਿਓ: ${normalizedQuestion}`
    );
  }
  return normalizedQuestion;
};

const buildConversationHints = (language: "English" | "Hindi" | "Punjabi"): string[] => [
  pickLanguage(language, "Ask for a simpler explanation", "सरल समझाओ", "ਸੌਖੇ ਤਰੀਕੇ ਨਾਲ ਸਮਝਾਓ"),
  pickLanguage(language, "Ask for one example", "एक उदाहरण दो", "ਇੱਕ ਉਦਾਹਰਨ ਦਿਓ"),
  pickLanguage(language, "Ask to repeat the last point", "पिछला बिंदु दोहराओ", "ਪਿਛਲਾ ਬਿੰਦੂ ਦੁਹਰਾਓ"),
  pickLanguage(language, "Ask to continue", "आगे बढ़ो", "ਅੱਗੇ ਚੱਲੋ"),
];

const applyStrictTeacherStateOverride = (
  model: {
    teacherIntro: string;
    teacherExplanation: string;
    teacherCheckQuestion: string | null;
    teacherState: TuitionTeacherState;
    boardState: TuitionTeacherBoardState;
    speechChunks: TuitionTeachingSpeechChunk[];
    boardActions: TuitionTeachingBoardAction[];
    teachingSteps: TuitionTeachingStep[];
    interactionHints: string[];
  },
  input: TuitionTeacherContext
) => {
  const topicText = String(input.topicTitle || "").normalize("NFC");
  const isPunjabiMode =
    normalizeTeachingLanguage(input.explanationLanguage) === "Punjabi" ||
    normalizeTeachingLanguage(input.boardLanguage || input.explanationLanguage) === "Punjabi";

  if (!isPunjabiMode) {
    return model;
  }

  const patchBoardState = (title: string, currentConcept: string, anchors: string[], formula: string | null) => {
    model.boardState = {
      ...model.boardState,
      title,
      currentConcept,
      anchors,
      formula,
      example: model.teacherState.currentTeachingPhase === "GIVE_EXAMPLE" ? model.boardState.example : null,
      recapKeywords: model.teacherState.currentTeachingPhase === "RECAP" ? model.boardState.recapKeywords : [],
      highlight: currentConcept,
    };
  };

  if (topicText.includes("chemical reaction") || topicText.includes("ਰਸਾਇਣਕ ਕ੍ਰਿਆ")) {
    patchBoardState("ਰਸਾਇਣਕ ਕ੍ਰਿਆ", "ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਵਿੱਚ ਨਵੇਂ ਪਦਾਰਥ ਬਣਦੇ ਹਨ।", ["ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਵਿੱਚ ਨਵੇਂ ਪਦਾਰਥ ਬਣਦੇ ਹਨ"], "ਅਭਿਕਾਰਕ -> ਉਤਪਾਦ");
  } else if (topicText.includes("ਵਚਨ")) {
    patchBoardState("ਵਚਨ", "ਵਚਨ ਗਿਣਤੀ ਦੱਸਦਾ ਹੈ।", ["ਵਚਨ ਗਿਣਤੀ ਦੱਸਦਾ ਹੈ"], "ਇੱਕ -> ਇਕਵਚਨ | ਕਈ -> ਬਹੁਵਚਨ");
  } else if (topicText.includes("ਲਿੰਗ")) {
    patchBoardState("ਲਿੰਗ", "ਲਿੰਗ ਨਾਮ ਦਾ ਰੂਪ ਦੱਸਦਾ ਹੈ।", ["ਲਿੰਗ ਨਾਮ ਦਾ ਰੂਪ ਦੱਸਦਾ ਹੈ"], "ਪੁਲਿੰਗ | ਇਸਤ੍ਰੀਲਿੰਗ");
  } else if (topicText.includes("ਸੰਬੰਧੀ ਸ਼ਬਦ")) {
    patchBoardState("ਸੰਬੰਧੀ ਸ਼ਬਦ", "ਸੰਬੰਧੀ ਸ਼ਬਦ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ।", ["ਸੰਬੰਧੀ ਸ਼ਬਦ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ"], "ਨਾਮ + ਸੰਬੰਧੀ ਸ਼ਬਦ + ਨਾਮ");
  }

  return model;
};

const buildTeacherSessionModel = (
  input: TuitionTeacherContext,
  lessonContent: LiveBoardLessonContent
): {
  teacherIntro: string;
  teacherExplanation: string;
  teacherCheckQuestion: string | null;
  teacherState: TuitionTeacherState;
  boardState: TuitionTeacherBoardState;
  speechChunks: TuitionTeachingSpeechChunk[];
  boardActions: TuitionTeachingBoardAction[];
  teachingSteps: TuitionTeachingStep[];
  interactionHints: string[];
} => {
  const explanationLanguage = normalizeTeachingLanguage(input.explanationLanguage);
  const boardLanguage = normalizeTeachingLanguage(input.boardLanguage || input.explanationLanguage);
  const teachingDepth = normalizeTeachingDepth(input.teachingDepth);
  const intent = parseTeacherIntent(input.studentPrompt, input.messageNumber);
  const previousState = input.previousAssistant?.teacherState || null;
  const points = buildLessonPoints(lessonContent);
  const classLine = input.classLevel
    ? `Class ${input.classLevel}`
    : pickLanguage(explanationLanguage, "school", "कक्षा", "ਕਲਾਸ");
  const subjectLine = localizeLiveBoardSubjectLabel(input.subjectName, explanationLanguage);
  const resolvedTopicTitle =
    displayTopicTitle(
      lessonContent.boardPayload.boardTitle || input.topicTitle,
      boardLanguage
    ) || normalizeText(input.topicTitle);

  let conceptIndex = Math.max(0, Number(previousState?.resumePoint ?? previousState?.currentConceptIndex ?? 0));
  let phase: TuitionTeacherPhase = "INTRO";
  let depthForResponse = teachingDepth;

  if (intent === "START") {
    conceptIndex = 0;
    phase = "INTRO";
    depthForResponse = teachingDepth;
  } else if (intent === "CONTINUE") {
    conceptIndex = Math.min(conceptIndex + 1, Math.max(points.length - 1, 0));
    phase = conceptIndex >= points.length - 1 ? "RECAP" : "CONTINUE_LESSON";
  } else if (intent === "REPEAT") {
    phase = "EXPLAIN_CONCEPT";
  } else if (intent === "SIMPLER") {
    phase = "HANDLE_STUDENT_DOUBT";
    depthForResponse = "BASIC";
  } else if (intent === "ADVANCED") {
    phase = "HANDLE_STUDENT_DOUBT";
    depthForResponse = "ADVANCED";
  } else if (intent === "EXAMPLE") {
    phase = "GIVE_EXAMPLE";
  } else if (intent === "CHECK") {
    phase = "ASK_CHECK";
  } else if (intent === "DOUBT") {
    phase = "HANDLE_STUDENT_DOUBT";
  } else if (input.messageNumber > 1) {
    phase = "CONTINUE_LESSON";
  }

  let teacherIntro =
    intent === "START"
      ? buildDepthAwareIntroSpeech(explanationLanguage, teachingDepth, resolvedTopicTitle, subjectLine, classLine)
      : pickLanguage(
          explanationLanguage,
          `We will stay with ${resolvedTopicTitle} and continue from the same point.`,
          `हम ${resolvedTopicTitle} पर ही रहेंगे और इसी बिंदु से आगे बढ़ेंगे।`,
          `ਅਸੀਂ ${resolvedTopicTitle} 'ਤੇ ਹੀ ਰਹਾਂਗੇ ਅਤੇ ਇਸੇ ਬਿੰਦੂ ਤੋਂ ਅੱਗੇ ਵੱਧਾਂਗੇ।`
        );

  const currentPoint = points[Math.max(0, Math.min(conceptIndex, Math.max(points.length - 1, 0)))];
  let teacherExplanation =
    intent === "START"
      ? buildLongTopicIntroSpeech({
          language: explanationLanguage,
          teachingDepth: depthForResponse,
          topicTitle: resolvedTopicTitle,
          lessonContent,
        })
      : shapeSpeechForDepth(
          explanationLanguage,
          depthForResponse,
          currentPoint?.explanation || lessonContent.recapSpeech
        );
  let teacherCheckQuestion: string | null = null;
  let includeExample = false;
  let includeRecap = false;

  if (phase === "HANDLE_STUDENT_DOUBT") {
    teacherExplanation = buildTeacherDoubtResponse(
      explanationLanguage,
      input.studentPrompt,
      shapeSpeechForDepth(explanationLanguage, depthForResponse, currentPoint?.explanation || lessonContent.recapSpeech)
    );
  } else if (phase === "CONTINUE_LESSON") {
    teacherExplanation = buildLongContinueSpeech({
      language: explanationLanguage,
      teachingDepth: depthForResponse,
      topicTitle: resolvedTopicTitle,
      currentPoint,
      lessonContent,
      conceptIndex,
    });
  } else if (phase === "GIVE_EXAMPLE") {
    teacherExplanation = shapeSpeechForDepth(explanationLanguage, depthForResponse, lessonContent.exampleSpeech);
    includeExample = true;
  } else if (phase === "ASK_CHECK") {
    teacherExplanation = pickLanguage(
      explanationLanguage,
      `Let me quickly check your understanding of ${resolvedTopicTitle}.`,
      `अब मैं ${resolvedTopicTitle} की आपकी समझ जल्दी से जाँचता हूँ।`,
      `ਹੁਣ ਮੈਂ ${resolvedTopicTitle} ਬਾਰੇ ਤੁਹਾਡੀ ਸਮਝ ਛੇਤੀ ਨਾਲ ਜਾਂਚਦਾ ਹਾਂ।`
    );
    teacherCheckQuestion = buildTeacherCheckQuestion(explanationLanguage, teachingDepth, lessonContent.practiceQuestion);
  } else if (phase === "RECAP") {
    teacherExplanation = shapeSpeechForDepth(explanationLanguage, depthForResponse, lessonContent.recapSpeech);
    teacherCheckQuestion = buildTeacherCheckQuestion(explanationLanguage, teachingDepth, lessonContent.practiceQuestion);
    includeRecap = true;
  }

  const boardState = buildMinimalBoardState({
    lessonContent,
    conceptIndex,
    phase,
    teachingDepth,
    boardLanguage,
    includeExample,
    includeRecap,
  });

  const boardActions: TuitionTeachingBoardAction[] = [
    {
      id: "teacher-board-title",
      type: "WRITE_TEXT",
      lane: "title",
      text: boardState.title,
      accent: "important",
    },
    ...boardState.anchors.map((anchor, index) => ({
      id: `teacher-board-anchor-${index + 1}`,
      type: "WRITE_BULLET" as const,
      lane: "notes" as const,
      text: anchor,
      accent: index === boardState.anchors.length - 1 ? ("important" as const) : undefined,
    })),
    ...(boardState.formula
      ? [
          {
            id: "teacher-board-formula",
            type: "WRITE_FORMULA" as const,
            lane: "formula" as const,
            text: boardState.formula,
            accent: "formula" as const,
          },
        ]
      : []),
    ...(boardState.example
      ? [
          {
            id: "teacher-board-example",
            type: "WRITE_STEP" as const,
            lane: "example" as const,
            text: boardState.example,
            accent: "example" as const,
          },
        ]
      : []),
    ...boardState.diagramLabels.map((label, index) => ({
      id: `teacher-board-diagram-${index + 1}`,
      type: "DRAW_LABEL" as const,
      lane: "diagram" as const,
      text: label,
    })),
    ...(boardState.recapKeywords.length
      ? [
          {
            id: "teacher-board-recap",
            type: "SHOW_RECAP" as const,
            lane: "recap" as const,
            text: boardState.recapKeywords.join(" | "),
          },
        ]
      : []),
    ...(teacherCheckQuestion
      ? [
          {
            id: "teacher-board-question",
            type: "ASK_STUDENT" as const,
            lane: "recap" as const,
            text: teacherCheckQuestion,
            accent: "question" as const,
          },
        ]
      : []),
  ];

  const speechChunks: TuitionTeachingSpeechChunk[] = [
    { id: "teacher-intro", kind: "INTRO", text: teacherIntro },
    { id: "teacher-explain", kind: "EXPLAIN", text: teacherExplanation },
    ...(teacherCheckQuestion ? [{ id: "teacher-check", kind: "QUESTION" as const, text: teacherCheckQuestion }] : []),
  ];

  const teachingSteps: TuitionTeachingStep[] = [
    {
      id: "teacher-live-step",
      title: phase,
      speechChunkId: "teacher-explain",
      actionIds: boardActions.map((action) => action.id),
      autoDelayMs: 0,
    },
  ];

  return {
    teacherIntro,
    teacherExplanation,
    teacherCheckQuestion,
    teacherState: {
      currentTeachingPhase: phase,
      currentConcept: currentPoint?.anchor || null,
      currentConceptIndex: conceptIndex,
      pausedForStudentQuestion: phase === "HANDLE_STUDENT_DOUBT",
      resumePoint: conceptIndex,
      currentConversationTurn: input.messageNumber,
      selectedLanguage: explanationLanguage,
      teachingDepth,
    },
    boardState,
    speechChunks,
    boardActions,
    teachingSteps,
    interactionHints: buildConversationHints(explanationLanguage),
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
  const baseLessonContent =
    buildSafeLessonContentOverride(subjectName, input.topicTitle, explanationLanguage, boardLanguage) ||
    (await buildTopicLessonContent(
      {
        subjectName,
        topicTitle: input.topicTitle,
        explanationLanguage: toLiveBoardLanguage(explanationLanguage),
        boardLanguage: toLiveBoardLanguage(boardLanguage),
        teachingDepth: input.teachingDepth,
      } satisfies LiveBoardContext,
      toLiveBoardSubjectFamily(inferSubjectFamily(subjectName))
    ));
  const lessonContent = applyStrictPunjabiGrammarTopicOverride(baseLessonContent, subjectName, input.topicTitle);
  const boardPayload: LiveBoardPayload = lessonContent.boardPayload;
  const teacherModel = applyStrictTeacherStateOverride(buildTeacherSessionModel(input, lessonContent), input);
  if (
    normalizeTeachingLanguage(boardLanguage) === "Punjabi" &&
    normalizeTopicKey(input.topicTitle).includes("chemical reaction")
  ) {
    teacherModel.boardState = {
      ...teacherModel.boardState,
      title: "ਰਸਾਇਣਕ ਕ੍ਰਿਆ",
      currentConcept: "ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਵਿੱਚ ਨਵੇਂ ਪਦਾਰਥ ਬਣਦੇ ਹਨ।",
      anchors: ["ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਵਿੱਚ ਨਵੇਂ ਪਦਾਰਥ ਬਣਦੇ ਹਨ।"],
      formula: teacherModel.boardState.formula || "ਅਭਿਕਾਰਕ -> ਉਤਪਾਦ",
      highlight: "ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਵਿੱਚ ਨਵੇਂ ਪਦਾਰਥ ਬਣਦੇ ਹਨ।",
    };
    teacherModel.boardActions = teacherModel.boardActions.map((action) =>
      action.id === "teacher-board-title"
        ? { ...action, text: "ਰਸਾਇਣਕ ਕ੍ਰਿਆ" }
        : action.id === "teacher-board-anchor-1"
        ? { ...action, text: "ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਵਿੱਚ ਨਵੇਂ ਪਦਾਰਥ ਬਣਦੇ ਹਨ।" }
        : action.id === "teacher-board-formula"
        ? { ...action, text: "ਅਭਿਕਾਰਕ -> ਉਤਪਾਦ" }
        : action
    );
  }
  const sparseBoardLines = teacherModel.boardState.anchors;
  const sparseFormulas = teacherModel.boardState.formula ? [teacherModel.boardState.formula] : [];
  const sparseExampleSteps = teacherModel.boardState.example ? [teacherModel.boardState.example] : [];
  const sparseRecapPoints = teacherModel.boardState.recapKeywords.length
    ? teacherModel.boardState.recapKeywords
    : lessonContent.recapPoints.slice(0, teacherModel.teacherState.teachingDepth === "ADVANCED" ? 4 : 3);
  const practiceQuestion =
    teacherModel.teacherCheckQuestion ||
    buildTeacherCheckQuestion(explanationLanguage, teacherModel.teacherState.teachingDepth, lessonContent.practiceQuestion);

  return {
    title: input.topicTitle,
    chapterTitle: input.topicTitle,
    topicTitle: input.topicTitle,
    subjectName,
    explanationLanguage,
    boardLanguage,
    voiceLanguage,
    teachingDepth: input.teachingDepth,
    curriculumBoard: boardName,
    replyText: [teacherModel.teacherIntro, teacherModel.teacherExplanation, teacherModel.teacherCheckQuestion]
      .filter(Boolean)
      .join(" "),
    recapPoints: sparseRecapPoints,
    practiceQuestion,
    diagramInstructions: teacherModel.boardState.diagramLabels,
    nextSuggestedAction:
      teacherModel.teacherState.currentTeachingPhase === "HANDLE_STUDENT_DOUBT"
        ? pickLanguage(
            explanationLanguage,
            "Continue from the same point after the doubt is clear.",
            "शंका साफ होने के बाद इसी बिंदु से आगे बढ़ो।",
            "ਸ਼ੱਕ ਸਾਫ਼ ਹੋਣ ਤੋਂ ਬਾਅਦ ਇਸੇ ਬਿੰਦੂ ਤੋਂ ਅੱਗੇ ਵਧੋ।"
          )
        : pickLanguage(
            explanationLanguage,
            "Use Continue, Give Example, or Ask Doubt to guide the lesson.",
            "पाठ को आगे बढ़ाने के लिए Continue, Give Example या Ask Doubt का उपयोग करो।",
            "ਪਾਠ ਨੂੰ ਅੱਗੇ ਵਧਾਉਣ ਲਈ Continue, Give Example ਜਾਂ Ask Doubt ਵਰਤੋ।"
          ),
    progressUpdate: null,
    boardTitle: teacherModel.boardState.title,
    boardLines: sparseBoardLines,
    formulas: sparseFormulas,
    steps: [],
    exampleTitle: sparseExampleSteps.length ? boardPayload.exampleTitle : null,
    exampleSteps: sparseExampleSteps,
    teacherMode: "AI_TEACHER_V2",
    teacherIntro: teacherModel.teacherIntro,
    teacherExplanation: teacherModel.teacherExplanation,
    teacherCheckQuestion: teacherModel.teacherCheckQuestion,
    boardState: teacherModel.boardState,
    teacherState: teacherModel.teacherState,
    interactionHints: teacherModel.interactionHints,
    speechChunks: teacherModel.speechChunks,
    boardActions: teacherModel.boardActions,
    teachingSteps: teacherModel.teachingSteps,
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



