export type LiveBoardLanguage = "English" | "Hindi" | "Punjabi";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export type LiveBoardSubjectFamily =
  | "MATHS"
  | "SCIENCE"
  | "LANGUAGE"
  | "SST"
  | "COMPUTER"
  | "GENERAL";

export type LiveBoardTeachingDepth = "BASIC" | "MODERATE" | "ADVANCED";

export type LiveBoardAction = {
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

export type LiveBoardPayload = {
  boardTitle: string;
  boardLines: string[];
  formulas: string[];
  steps: string[];
  exampleTitle: string | null;
  exampleSteps: string[];
};

export type LiveBoardLessonContent = {
  boardPayload: LiveBoardPayload;
  noteSpeech: string[];
  formulaSpeech: string[];
  stepSpeech: string[];
  exampleSpeech: string;
  recapSpeech: string;
  recapBoardText: string;
  recapPoints: string[];
  practiceQuestion: string;
  diagramInstructions: string[];
  diagramActions: LiveBoardAction[];
};

export type LiveBoardContext = {
  subjectName: string;
  topicTitle: string;
  explanationLanguage: LiveBoardLanguage;
  boardLanguage: LiveBoardLanguage;
  teachingDepth: LiveBoardTeachingDepth;
};

const plannerDiagramSchema = z
  .object({
    leftLabel: z.string().trim().min(1).max(60),
    leftText: z.string().trim().min(1).max(120),
    arrowText: z.string().trim().min(1).max(120),
    rightLabel: z.string().trim().min(1).max(60),
    rightText: z.string().trim().min(1).max(120),
  })
  .nullable();

const plannerLessonSchema = z.object({
  boardTitle: z.string().trim().min(1).max(200),
  boardLines: z.array(z.string().trim().min(1).max(500)).min(1).max(4),
  formulas: z.array(z.string().trim().min(1).max(250)).max(3),
  steps: z.array(z.string().trim().min(1).max(320)).min(1).max(4),
  exampleTitle: z.string().trim().min(1).max(200).nullable(),
  exampleSteps: z.array(z.string().trim().min(1).max(320)).min(1).max(3),
  noteSpeech: z.array(z.string().trim().min(1).max(500)).min(1).max(4),
  formulaSpeech: z.array(z.string().trim().min(1).max(400)).max(3),
  stepSpeech: z.array(z.string().trim().min(1).max(400)).min(1).max(4),
  exampleSpeech: z.string().trim().min(1).max(500),
  recapSpeech: z.string().trim().min(1).max(500),
  recapBoardText: z.string().trim().min(1).max(300),
  recapPoints: z.array(z.string().trim().min(1).max(220)).min(1).max(4),
  practiceQuestion: z.string().trim().min(1).max(400),
  diagramPlan: plannerDiagramSchema,
});

type PlannerLesson = z.infer<typeof plannerLessonSchema>;

const normalize = (value: string | null | undefined): string =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const pickLanguage = (
  language: LiveBoardLanguage,
  english: string,
  hindi: string,
  punjabi: string
): string => {
  if (language === "Hindi") return hindi;
  if (language === "Punjabi") return punjabi;
  return english;
};

const includesAny = (text: string, values: string[]): boolean => {
  const normalized = normalize(text).toUpperCase();
  return values.some((value) => normalized.includes(value.toUpperCase()));
};

const normalizeTopicKey = (value: string | null | undefined): string =>
  String(value || "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const requiresExactTopicFidelity = (topic: string): boolean => /[\u0900-\u097F\u0A00-\u0A7F]/u.test(topic);

const plannerMatchesRequestedTopic = (context: LiveBoardContext, planned: PlannerLesson): boolean => {
  if (!requiresExactTopicFidelity(context.topicTitle)) {
    return true;
  }

  const requestedTopic = normalizeTopicKey(context.topicTitle);
  if (!requestedTopic) {
    return true;
  }

  const candidateText = normalizeTopicKey(
    [
      planned.boardTitle,
      planned.boardLines?.[0],
      planned.boardLines?.[1],
      planned.exampleTitle,
      planned.practiceQuestion,
      planned.recapBoardText,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return candidateText.includes(requestedTopic);
};

const boardTitle = (topic: string, language: LiveBoardLanguage): string =>
  pickLanguage(language, topic, topic, topic);

const shortBoardTitle = (topic: string, language: LiveBoardLanguage): string =>
  pickLanguage(language, topic, topic, topic);

export const localizeLiveBoardSubjectLabel = (
  subjectName: string | null | undefined,
  language: LiveBoardLanguage
): string => {
  const subject = normalize(subjectName);
  if (!subject) {
    return pickLanguage(language, "the subject", "विषय", "ਵਿਸ਼ਾ");
  }

  if (language === "English") {
    return subject;
  }

  const normalized = subject.toUpperCase();

  if (normalized.includes("PUNJABI") && normalized.includes("GRAMMAR")) {
    return pickLanguage(language, subject, "पंजाबी व्याकरण", "ਪੰਜਾਬੀ ਵਿਆਕਰਣ");
  }
  if (normalized.includes("HINDI") && normalized.includes("GRAMMAR")) {
    return pickLanguage(language, subject, "हिंदी व्याकरण", "ਹਿੰਦੀ ਵਿਆਕਰਣ");
  }
  if (normalized.includes("ENGLISH") && normalized.includes("GRAMMAR")) {
    return pickLanguage(language, subject, "अंग्रेज़ी व्याकरण", "ਅੰਗਰੇਜ਼ੀ ਵਿਆਕਰਣ");
  }
  if (normalized.includes("GRAMMAR") || normalized.includes("LANGUAGE")) {
    return pickLanguage(language, subject, "भाषा और व्याकरण", "ਭਾਸ਼ਾ ਅਤੇ ਵਿਆਕਰਣ");
  }
  if (normalized.includes("MATH")) {
    return pickLanguage(language, subject, "गणित", "ਗਣਿਤ");
  }
  if (normalized.includes("SCIENCE")) {
    return pickLanguage(language, subject, "विज्ञान", "ਵਿਗਿਆਨ");
  }
  if (
    normalized.includes("SST") ||
    normalized.includes("SOCIAL") ||
    normalized.includes("HISTORY") ||
    normalized.includes("GEOGRAPHY") ||
    normalized.includes("CIVICS")
  ) {
    return pickLanguage(language, subject, "सामाजिक अध्ययन", "ਸਮਾਜਿਕ ਅਧਿਐਨ");
  }
  if (normalized.includes("PUNJABI")) {
    return pickLanguage(language, subject, "पंजाबी", "ਪੰਜਾਬੀ");
  }
  if (normalized.includes("HINDI")) {
    return pickLanguage(language, subject, "हिंदी", "ਹਿੰਦੀ");
  }
  if (normalized.includes("ENGLISH")) {
    return pickLanguage(language, subject, "अंग्रेज़ी", "ਅੰਗਰੇਜ਼ੀ");
  }

  return subject;
};

const languageLabel = (language: LiveBoardLanguage): string => {
  if (language === "Hindi") return "Hindi in Devanagari script";
  if (language === "Punjabi") return "Punjabi in Gurmukhi script";
  return "English";
};

const familyLabel = (family: LiveBoardSubjectFamily): string => {
  switch (family) {
    case "MATHS":
      return "Maths";
    case "SCIENCE":
      return "Science";
    case "LANGUAGE":
      return "Language/Grammar";
    case "SST":
      return "Social Studies";
    case "COMPUTER":
      return "Computer";
    default:
      return "General Studies";
  }
};

const languageClassroomGuidance = (language: LiveBoardLanguage): string =>
  pickLanguage(
    language,
    "Use natural school-teacher English.",
    "Use clean, standard school-level Hindi in Devanagari. Avoid translationese, awkward literal phrasing, and broken grammar.",
    "Use natural, standard educational Punjabi in Gurmukhi. Avoid Hindi sentence structure copied into Punjabi, broken grammar, and mixed-script wording."
  );

const normalizeTeachingDepth = (value: string | null | undefined): LiveBoardTeachingDepth => {
  const normalized = normalize(value).toUpperCase();
  if (normalized === "BASIC") return "BASIC";
  if (normalized === "ADVANCED") return "ADVANCED";
  return "MODERATE";
};

const getTeachingDepthPolicy = (depth: LiveBoardTeachingDepth) => {
  if (depth === "BASIC") {
    return {
      boardLines: 1,
      formulas: 1,
      steps: 1,
      exampleSteps: 1,
      recapPoints: 2,
      diagramActions: 1,
      explanationGuidance:
        "Keep the explanation beginner-friendly with simple sentences, one direct example, and one easy check question.",
      boardGuidance:
        "Keep the board minimal: title, one key point, one simple example or formula, and a short recap. Avoid note dumps.",
    };
  }
  if (depth === "ADVANCED") {
    return {
      boardLines: 4,
      formulas: 2,
      steps: 3,
      exampleSteps: 2,
      recapPoints: 3,
      diagramActions: 3,
      explanationGuidance:
        "Teach with deeper conceptual links, school-appropriate terminology, and one analytical follow-up.",
      boardGuidance:
        "Keep the board structured and teacher-like: concept points, one or two examples, rule or formula where relevant, and a meaningful recap without long paragraphs.",
    };
  }
  return {
    boardLines: 3,
    formulas: 1,
    steps: 2,
    exampleSteps: 1,
    recapPoints: 3,
    diagramActions: 3,
    explanationGuidance:
      "Teach in standard classroom depth with clear language, one useful example, and one understanding check.",
    boardGuidance:
      "Keep the board balanced: title, two to four key points, one example, one rule if relevant, and a short recap.",
  };
};

const splitIntoSentences = (text: string): string[] =>
  normalize(text)
    .split(/(?<=[.!?।])\s+/u)
    .map((item) => normalize(item))
    .filter(Boolean);

const compressTextByDepth = (text: string, depth: LiveBoardTeachingDepth): string => {
  const normalized = normalize(text);
  if (!normalized) return "";
  const sentences = splitIntoSentences(normalized);
  if (!sentences.length) return normalized;
  if (depth === "BASIC") {
    return sentences.slice(0, 1).join(" ").slice(0, 180).trim();
  }
  if (depth === "ADVANCED") {
    return sentences.slice(0, 2).join(" ").slice(0, 320).trim();
  }
  return sentences.slice(0, 2).join(" ").slice(0, 240).trim();
};

const simplifyPracticeQuestion = (
  text: string,
  language: LiveBoardLanguage,
  depth: LiveBoardTeachingDepth
): string => {
  if (depth === "BASIC") {
    return pickLanguage(
      language,
      `Quick check: ${compressTextByDepth(text, "BASIC")}`,
      `छोटा जाँच-प्रश्न: ${compressTextByDepth(text, "BASIC")}`,
      `ਛੋਟਾ ਜਾਂਚ-ਪ੍ਰਸ਼ਨ: ${compressTextByDepth(text, "BASIC")}`
    );
  }
  if (depth === "ADVANCED") {
    return pickLanguage(
      language,
      `Think deeper: ${compressTextByDepth(text, "ADVANCED")}`,
      `ज़रा गहराई से सोचो: ${compressTextByDepth(text, "ADVANCED")}`,
      `ਹੁਣ ਥੋੜ੍ਹੀ ਗਹਿਰਾਈ ਨਾਲ ਸੋਚੋ: ${compressTextByDepth(text, "ADVANCED")}`
    );
  }
  return compressTextByDepth(text, "MODERATE");
};

const applyTeachingDepthPolicy = (
  lesson: LiveBoardLessonContent,
  context: LiveBoardContext
): LiveBoardLessonContent => {
  const depth = normalizeTeachingDepth(context.teachingDepth);
  const policy = getTeachingDepthPolicy(depth);
  const boardLines = lesson.boardPayload.boardLines.slice(0, policy.boardLines).map((item) => compressTextByDepth(item, depth));
  const formulas = lesson.boardPayload.formulas.slice(0, policy.formulas).map((item) => compressTextByDepth(item, depth));
  const steps = lesson.boardPayload.steps.slice(0, policy.steps).map((item) => compressTextByDepth(item, depth));
  const exampleSteps = lesson.boardPayload.exampleSteps
    .slice(0, policy.exampleSteps)
    .map((item) => compressTextByDepth(item, depth));

  return {
    boardPayload: {
      boardTitle: lesson.boardPayload.boardTitle,
      boardLines,
      formulas,
      steps,
      exampleTitle: exampleSteps.length ? lesson.boardPayload.exampleTitle : null,
      exampleSteps,
    },
    noteSpeech: lesson.noteSpeech.slice(0, boardLines.length).map((item) => compressTextByDepth(item, depth)),
    formulaSpeech: lesson.formulaSpeech.slice(0, formulas.length).map((item) => compressTextByDepth(item, depth)),
    stepSpeech: lesson.stepSpeech.slice(0, steps.length).map((item) => compressTextByDepth(item, depth)),
    exampleSpeech: compressTextByDepth(lesson.exampleSpeech, depth),
    recapSpeech: compressTextByDepth(lesson.recapSpeech, depth),
    recapBoardText: compressTextByDepth(lesson.recapBoardText, depth),
    recapPoints: lesson.recapPoints.slice(0, policy.recapPoints).map((item) => compressTextByDepth(item, depth)),
    practiceQuestion: simplifyPracticeQuestion(lesson.practiceQuestion, context.explanationLanguage, depth),
    diagramInstructions: lesson.diagramInstructions.slice(0, policy.diagramActions).map((item) => compressTextByDepth(item, depth)),
    diagramActions: lesson.diagramActions.slice(0, policy.diagramActions),
  };
};

const localizedTopicLabel = (
  english: string,
  hindi: string,
  punjabi: string,
  language: LiveBoardLanguage
): string => pickLanguage(language, english, hindi, punjabi);

const buildDiagramActions = (
  diagramPlan: PlannerLesson["diagramPlan"],
  boardLanguage: LiveBoardLanguage,
  family: LiveBoardSubjectFamily
): LiveBoardAction[] => {
  if (diagramPlan) {
    return [
      {
        id: "diagram-box-left",
        type: "DRAW_BOX",
        lane: "diagram",
        label: diagramPlan.leftLabel,
        text: diagramPlan.leftText,
        accent: "important",
      },
      {
        id: "diagram-arrow-main",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: diagramPlan.leftLabel,
        toLabel: diagramPlan.rightLabel,
        text: diagramPlan.arrowText,
      },
      {
        id: "diagram-box-right",
        type: "DRAW_BOX",
        lane: "diagram",
        label: diagramPlan.rightLabel,
        text: diagramPlan.rightText,
        accent: "important",
      },
    ];
  }

  if (family === "SCIENCE") {
    return [
      {
        id: "diagram-box-left",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Input", "इनपुट", "ਇਨਪੁੱਟ"),
        text: pickLanguage(boardLanguage, "Starting condition or material", "शुरुआती अवस्था या पदार्थ", "ਸ਼ੁਰੂਆਤੀ ਹਾਲਤ ਜਾਂ ਪਦਾਰਥ"),
        accent: "important",
      },
      {
        id: "diagram-arrow-main",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: pickLanguage(boardLanguage, "Input", "इनपुट", "ਇਨਪੁੱਟ"),
        toLabel: pickLanguage(boardLanguage, "Result", "परिणाम", "ਨਤੀਜਾ"),
        text: pickLanguage(boardLanguage, "Process or change", "प्रक्रिया या परिवर्तन", "ਪ੍ਰਕਿਰਿਆ ਜਾਂ ਬਦਲਾਅ"),
      },
      {
        id: "diagram-box-right",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Result", "परिणाम", "ਨਤੀਜਾ"),
        text: pickLanguage(boardLanguage, "Observed effect or conclusion", "देखा गया प्रभाव या निष्कर्ष", "ਦੇਖਿਆ ਗਿਆ ਪ੍ਰਭਾਵ ਜਾਂ ਨਤੀਜਾ"),
        accent: "important",
      },
    ];
  }

  if (family === "MATHS") {
    return [
      {
        id: "diagram-box-left",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Given", "दिया गया", "ਦਿੱਤਾ"),
        text: pickLanguage(boardLanguage, "Question or expression", "प्रश्न या व्यंजक", "ਪ੍ਰਸ਼ਨ ਜਾਂ ਪ੍ਰਗਟਾਵਾ"),
        accent: "important",
      },
      {
        id: "diagram-arrow-main",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: pickLanguage(boardLanguage, "Given", "दिया गया", "ਦਿੱਤਾ"),
        toLabel: pickLanguage(boardLanguage, "Answer", "उत्तर", "ਉੱਤਰ"),
        text: pickLanguage(boardLanguage, "Apply rule step by step", "नियम चरणबद्ध लगाओ", "ਨਿਯਮ ਕਦਮ ਦਰ ਕਦਮ ਲਗਾਓ"),
      },
      {
        id: "diagram-box-right",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Answer", "उत्तर", "ਉੱਤਰ"),
        text: pickLanguage(boardLanguage, "Final simplified result", "अंतिम सरल परिणाम", "ਅੰਤਿਮ ਸਧਾਰਿਆ ਨਤੀਜਾ"),
        accent: "important",
      },
    ];
  }

  if (family === "LANGUAGE") {
    return [
      {
        id: "diagram-box-left",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Rule", "नियम", "ਨਿਯਮ"),
        text: pickLanguage(boardLanguage, "Grammar or language rule", "व्याकरण या भाषा नियम", "ਵਿਆਕਰਣ ਜਾਂ ਭਾਸ਼ਾ ਨਿਯਮ"),
        accent: "important",
      },
      {
        id: "diagram-arrow-main",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: pickLanguage(boardLanguage, "Rule", "नियम", "ਨਿਯਮ"),
        toLabel: pickLanguage(boardLanguage, "Example", "उदाहरण", "ਉਦਾਹਰਨ"),
        text: pickLanguage(boardLanguage, "Use in a sentence", "वाक्य में प्रयोग", "ਵਾਕ ਵਿੱਚ ਵਰਤੋਂ"),
      },
      {
        id: "diagram-box-right",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Example", "उदाहरण", "ਉਦਾਹਰਨ"),
        text: pickLanguage(boardLanguage, "Correct sentence form", "सही वाक्य रूप", "ਸਹੀ ਵਾਕ ਰੂਪ"),
        accent: "important",
      },
    ];
  }

  if (family === "SST") {
    return [
      {
        id: "diagram-box-left",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Idea", "विचार", "ਵਿਚਾਰ"),
        text: pickLanguage(boardLanguage, "Main concept", "मुख्य अवधारणा", "ਮੁੱਖ ਧਾਰਨਾ"),
        accent: "important",
      },
      {
        id: "diagram-arrow-main",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: pickLanguage(boardLanguage, "Idea", "विचार", "ਵਿਚਾਰ"),
        toLabel: pickLanguage(boardLanguage, "Impact", "प्रभाव", "ਪ੍ਰਭਾਵ"),
        text: pickLanguage(boardLanguage, "Cause and effect", "कारण और प्रभाव", "ਕਾਰਣ ਅਤੇ ਪ੍ਰਭਾਵ"),
      },
      {
        id: "diagram-box-right",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Impact", "प्रभाव", "ਪ੍ਰਭਾਵ"),
        text: pickLanguage(boardLanguage, "Historical or social outcome", "ऐतिहासिक या सामाजिक परिणाम", "ਇਤਿਹਾਸਕ ਜਾਂ ਸਮਾਜਿਕ ਨਤੀਜਾ"),
        accent: "important",
      },
    ];
  }

  return [];
};

const genericLesson = (
  context: LiveBoardContext,
  family: LiveBoardSubjectFamily
): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  const topic = context.topicTitle;
  const boardSubject = localizeLiveBoardSubjectLabel(context.subjectName, boardLanguage);
  const spokenSubject = localizeLiveBoardSubjectLabel(context.subjectName, explanationLanguage);
  return {
    boardPayload: {
      boardTitle: shortBoardTitle(topic, boardLanguage),
      boardLines: [
        pickLanguage(
          boardLanguage,
          `${topic} is an important idea in ${boardSubject}.`,
          `${topic}, ${boardSubject} का एक महत्वपूर्ण विषय है।`,
          `${topic}, ${boardSubject} ਦਾ ਇੱਕ ਮਹੱਤਵਪੂਰਨ ਵਿਸ਼ਾ ਹੈ।`
        ),
        pickLanguage(
          boardLanguage,
          `${topic} becomes clearer through definition, key points, and an example.`,
          `${topic} को परिभाषा, मुख्य बिंदु और उदाहरण से समझो।`,
          `${topic} ਨੂੰ ਪਰਿਭਾਸ਼ਾ, ਮੁੱਖ ਬਿੰਦੂ ਅਤੇ ਉਦਾਹਰਨ ਨਾਲ ਸਮਝੋ।`
        ),
        pickLanguage(
          boardLanguage,
          `Revise it through one clear classroom example.`,
          `इसे एक साफ़ कक्षा-उदाहरण से दोहराओ।`,
          `ਇਸਨੂੰ ਇੱਕ ਸਾਫ਼ ਕਲਾਸਰੂਮ ਉਦਾਹਰਨ ਨਾਲ ਦੁਹਰਾਓ।`
        )
      ],
      formulas:
        family === "MATHS"
          ? [
              pickLanguage(
                boardLanguage,
                "Given value -> correct rule -> simplify carefully",
                "दी गई राशि -> सही नियम -> ध्यान से सरल करो",
                "ਦਿੱਤੀ ਰਾਸ਼ੀ -> ਸਹੀ ਨਿਯਮ -> ਧਿਆਨ ਨਾਲ ਸਧਾਰੋ"
              )
            ]
          : [],
      steps: [
        pickLanguage(boardLanguage, `State the main idea of ${topic}.`, `${topic} का मुख्य विचार बताओ।`, `${topic} ਦਾ ਮੁੱਖ ਵਿਚਾਰ ਦੱਸੋ।`),
        pickLanguage(boardLanguage, "Add one clear supporting point.", "एक स्पष्ट सहायक बिंदु लिखो।", "ਇੱਕ ਸਾਫ਼ ਸਹਾਇਕ ਬਿੰਦੂ ਲਿਖੋ।"),
        pickLanguage(boardLanguage, "Use one relevant example.", "एक उपयुक्त उदाहरण दो।", "ਇੱਕ ਠੀਕ ਉਦਾਹਰਨ ਦਿਓ।")
      ],
      exampleTitle: pickLanguage(boardLanguage, `${topic} Worked Example`, `${topic} हल किया उदाहरण`, `${topic} ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ`),
      exampleSteps: [
        pickLanguage(boardLanguage, `Notice what the example shows about ${topic}.`, `देखो कि उदाहरण ${topic} के बारे में क्या दिखाता है।`, `ਵੇਖੋ ਕਿ ਉਦਾਹਰਨ ${topic} ਬਾਰੇ ਕੀ ਦਿਖਾਉਂਦਾ ਹੈ।`),
        pickLanguage(boardLanguage, "Write the answer in clear textbook style.", "उत्तर को साफ़ पाठ्यपुस्तक शैली में लिखो।", "ਉੱਤਰ ਨੂੰ ਸਾਫ਼ ਪਾਠ-ਪੁਸਤਕ ਸ਼ੈਲੀ ਵਿੱਚ ਲਿਖੋ।")
      ]
    },
    noteSpeech: [
      pickLanguage(
        explanationLanguage,
        `${topic} is an important school topic in ${spokenSubject}. Let us understand it through its meaning, key point, and one simple example.`,
        `${topic}, ${spokenSubject} का एक महत्वपूर्ण पाठ्य-विषय है। इसे हम अर्थ, मुख्य बिंदु और एक सरल उदाहरण से समझेंगे।`,
        `${topic}, ${spokenSubject} ਦਾ ਇੱਕ ਮਹੱਤਵਪੂਰਨ ਪਾਠ-ਵਿਸ਼ਾ ਹੈ। ਅਸੀਂ ਇਸਨੂੰ ਅਰਥ, ਮੁੱਖ ਬਿੰਦੂ ਅਤੇ ਇੱਕ ਸੌਖੇ ਉਦਾਹਰਨ ਨਾਲ ਸਮਝਾਂਗੇ।`
      ),
      pickLanguage(
        explanationLanguage,
        `When the main idea is clear, the example becomes easy to understand.`,
        `जब मुख्य विचार साफ़ हो जाता है, तब उदाहरण भी आसानी से समझ आ जाता है।`,
        `ਜਦੋਂ ਮੁੱਖ ਵਿਚਾਰ ਸਾਫ਼ ਹੋ ਜਾਂਦਾ ਹੈ, ਤਦੋਂ ਉਦਾਹਰਨ ਵੀ ਆਸਾਨੀ ਨਾਲ ਸਮਝ ਆ ਜਾਂਦੀ ਹੈ।`
      ),
      pickLanguage(
        explanationLanguage,
        `So keep the definition, one key point, and one example connected.`,
        `इसलिए परिभाषा, एक मुख्य बिंदु और एक उदाहरण को आपस में जोड़कर याद रखो।`,
        `ਇਸ ਲਈ ਪਰਿਭਾਸ਼ਾ, ਇੱਕ ਮੁੱਖ ਬਿੰਦੂ ਅਤੇ ਇੱਕ ਉਦਾਹਰਨ ਨੂੰ ਆਪਸ ਵਿੱਚ ਜੋੜ ਕੇ ਯਾਦ ਰੱਖੋ।`
      ),
    ],
    formulaSpeech: [],
    stepSpeech: [
      pickLanguage(explanationLanguage, `First, understand the central idea of ${topic}.`, `सबसे पहले ${topic} का मूल विचार समझो।`, `ਸਭ ਤੋਂ ਪਹਿਲਾਂ ${topic} ਦਾ ਮੂਲ ਵਿਚਾਰ ਸਮਝੋ।`),
      pickLanguage(explanationLanguage, "Next, note the most important supporting point.", "फिर उससे जुड़ा सबसे महत्वपूर्ण बिंदु समझो।", "ਫਿਰ ਇਸ ਨਾਲ ਜੁੜਿਆ ਸਭ ਤੋਂ ਮਹੱਤਵਪੂਰਨ ਬਿੰਦੂ ਸਮਝੋ।"),
      pickLanguage(explanationLanguage, "Finally, use an example so the idea becomes easy to remember.", "अंत में एक उदाहरण लो ताकि बात आसानी से याद रहे।", "ਅੰਤ ਵਿੱਚ ਇੱਕ ਉਦਾਹਰਨ ਲਵੋ ਤਾਂ ਕਿ ਗੱਲ ਆਸਾਨੀ ਨਾਲ ਯਾਦ ਰਹੇ।"),
    ],
    exampleSpeech: pickLanguage(
      explanationLanguage,
      `Let us take one simple classroom example of ${topic}.`,
      `आओ ${topic} का एक सरल कक्षा-उदाहरण देखें।`,
      `ਆਓ ${topic} ਦਾ ਇੱਕ ਸੌਖਾ ਕਲਾਸ-ਉਦਾਹਰਨ ਵੇਖੀਏ।`
    ),
    recapSpeech: pickLanguage(
      explanationLanguage,
      `Recap the key idea of ${topic}, the main supporting point, and the example we used.`,
      `${topic} के मुख्य विचार, उससे जुड़े मुख्य बिंदु और उदाहरण की पुनरावृत्ति करो।`,
      `${topic} ਦੇ ਮੁੱਖ ਵਿਚਾਰ, ਉਸ ਨਾਲ ਜੁੜੇ ਮੁੱਖ ਬਿੰਦੂ ਅਤੇ ਉਦਾਹਰਨ ਦੀ ਦੁਹਰਾਈ ਕਰੋ।`
    ),
    recapBoardText: pickLanguage(
      boardLanguage,
      `${topic} is best remembered through meaning, key point, and one example.`,
      `${topic} को अर्थ, मुख्य बिंदु और एक उदाहरण से याद रखा जाता है।`,
      `${topic} ਨੂੰ ਅਰਥ, ਮੁੱਖ ਬਿੰਦੂ ਅਤੇ ਇੱਕ ਉਦਾਹਰਨ ਨਾਲ ਚੰਗੀ ਤਰ੍ਹਾਂ ਯਾਦ ਰੱਖਿਆ ਜਾਂਦਾ ਹੈ।`
    ),
    recapPoints: [
      pickLanguage(explanationLanguage, `The main meaning of ${topic} should be clear.`, `${topic} का मुख्य अर्थ स्पष्ट होना चाहिए।`, `${topic} ਦਾ ਮੁੱਖ ਅਰਥ ਸਾਫ਼ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।`),
      pickLanguage(explanationLanguage, "An answer becomes stronger when the key point and example are linked together.", "मुख्य बिंदु और उदाहरण साथ में याद रखने से उत्तर बेहतर बनता है।", "ਮੁੱਖ ਬਿੰਦੂ ਅਤੇ ਉਦਾਹਰਨ ਇਕੱਠੇ ਯਾਦ ਰੱਖਣ ਨਾਲ ਉੱਤਰ ਵਧੀਆ ਬਣਦਾ ਹੈ।")
    ],
    practiceQuestion: pickLanguage(
      explanationLanguage,
      `Practice: explain ${topic} in your own words and add one suitable example.`,
      `अभ्यास प्रश्न: ${topic} को अपने शब्दों में समझाओ और एक उपयुक्त उदाहरण लिखो।`,
      `ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ${topic} ਨੂੰ ਆਪਣੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਸਮਝਾਓ ਅਤੇ ਇੱਕ ਢੰਗ ਦੀ ਉਦਾਹਰਨ ਲਿਖੋ।`
    ),
    diagramInstructions: [],
    diagramActions: []
  };
};

const buildFallbackLesson = (
  context: LiveBoardContext,
  family: LiveBoardSubjectFamily
): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  const topic = context.topicTitle;
  const boardSubject = localizeLiveBoardSubjectLabel(context.subjectName, boardLanguage);
  const spokenSubject = localizeLiveBoardSubjectLabel(context.subjectName, explanationLanguage);

  if (family === "SCIENCE") {
    return {
      boardPayload: {
        boardTitle: shortBoardTitle(topic, boardLanguage),
        boardLines: [
          pickLanguage(boardLanguage, `${topic} is an important idea in ${boardSubject} that explains a process, property, or change.`, `${topic}, ${boardSubject} का एक महत्वपूर्ण विचार है जो किसी प्रक्रिया, गुण या परिवर्तन को समझाता है।`, `${topic}, ${boardSubject} ਦਾ ਇੱਕ ਮਹੱਤਵਪੂਰਨ ਵਿਚਾਰ ਹੈ ਜੋ ਕਿਸੇ ਪ੍ਰਕਿਰਿਆ, ਗੁਣ ਜਾਂ ਬਦਲਾਅ ਨੂੰ ਸਮਝਾਉਂਦਾ ਹੈ।`),
          pickLanguage(boardLanguage, `To understand ${topic}, we look at what happens, why it happens, and what evidence we observe.`, `${topic} को समझने के लिए हम देखते हैं कि क्या होता है, क्यों होता है और कौन-सा प्रमाण दिखाई देता है।`, `${topic} ਨੂੰ ਸਮਝਣ ਲਈ ਅਸੀਂ ਵੇਖਦੇ ਹਾਂ ਕਿ ਕੀ ਹੁੰਦਾ ਹੈ, ਕਿਉਂ ਹੁੰਦਾ ਹੈ ਅਤੇ ਕਿਹੜਾ ਪ੍ਰਮਾਣ ਦਿਖਾਈ ਦਿੰਦਾ ਹੈ।`),
          pickLanguage(boardLanguage, `A good science answer on ${topic} includes definition, key factors, and one real example.`, `${topic} पर अच्छे विज्ञान-उत्तर में परिभाषा, मुख्य कारण और एक वास्तविक उदाहरण शामिल होता है।`, `${topic} ਬਾਰੇ ਚੰਗੇ ਵਿਗਿਆਨਕ ਉੱਤਰ ਵਿੱਚ ਪਰਿਭਾਸ਼ਾ, ਮੁੱਖ ਕਾਰਣ ਅਤੇ ਇੱਕ ਅਸਲੀ ਉਦਾਹਰਨ ਸ਼ਾਮਲ ਹੁੰਦੀ ਹੈ।`),
        ],
        formulas: [
          pickLanguage(boardLanguage, "Observation -> explanation -> conclusion", "अवलोकन -> व्याख्या -> निष्कर्ष", "ਅਵਲੋਕਨ -> ਵਿਆਖਿਆ -> ਨਤੀਜਾ"),
          pickLanguage(boardLanguage, `${topic}: cause -> process -> result`, `${topic}: कारण -> प्रक्रिया -> परिणाम`, `${topic}: ਕਾਰਣ -> ਪ੍ਰਕਿਰਿਆ -> ਨਤੀਜਾ`),
        ],
        steps: [
          pickLanguage(boardLanguage, `State the meaning of ${topic}.`, `${topic} का अर्थ बताओ।`, `${topic} ਦਾ ਅਰਥ ਦੱਸੋ।`),
          pickLanguage(boardLanguage, `Explain the main process or reason behind ${topic}.`, `${topic} के पीछे की मुख्य प्रक्रिया या कारण समझाओ।`, `${topic} ਦੇ ਪਿੱਛੇ ਦੀ ਮੁੱਖ ਪ੍ਰਕਿਰਿਆ ਜਾਂ ਕਾਰਣ ਸਮਝਾਓ।`),
          pickLanguage(boardLanguage, `Connect ${topic} with one real-life or school-lab example.`, `${topic} को एक वास्तविक या स्कूल-प्रयोगशाला उदाहरण से जोड़ो।`, `${topic} ਨੂੰ ਇੱਕ ਅਸਲੀ ਜਾਂ ਸਕੂਲ-ਲੈਬ ਉਦਾਹਰਨ ਨਾਲ ਜੋੜੋ।`),
        ],
        exampleTitle: pickLanguage(boardLanguage, `${topic} Example`, `${topic} उदाहरण`, `${topic} ਉਦਾਹਰਨ`),
        exampleSteps: [
          pickLanguage(boardLanguage, `Take one familiar example where ${topic} can be observed.`, `एक परिचित उदाहरण लो जहाँ ${topic} देखा जा सके।`, `ਇੱਕ ਜਾਣ-ਪਛਾਣ ਵਾਲੀ ਉਦਾਹਰਨ ਲਵੋ ਜਿੱਥੇ ${topic} ਵੇਖਿਆ ਜਾ ਸਕੇ।`),
          pickLanguage(boardLanguage, `State what is observed and what it teaches about ${topic}.`, `बताओ क्या देखा गया और उससे ${topic} के बारे में क्या सीख मिलती है।`, `ਦੱਸੋ ਕੀ ਦੇਖਿਆ ਗਿਆ ਅਤੇ ਉਸ ਤੋਂ ${topic} ਬਾਰੇ ਕੀ ਸਿੱਖ ਮਿਲਦੀ ਹੈ।`),
        ],
      },
      noteSpeech: [
        pickLanguage(explanationLanguage, `${topic} explains an important idea from ${spokenSubject}.`, `${topic}, ${spokenSubject} की एक महत्वपूर्ण अवधारणा है।`, `${topic}, ${spokenSubject} ਦੀ ਇੱਕ ਮਹੱਤਵਪੂਰਨ ਧਾਰਨਾ ਹੈ।`),
        pickLanguage(explanationLanguage, `In science, we study ${topic} by linking observation with explanation.`, `विज्ञान में हम ${topic} को अवलोकन और व्याख्या से जोड़कर समझते हैं।`, `ਵਿਗਿਆਨ ਵਿੱਚ ਅਸੀਂ ${topic} ਨੂੰ ਅਵਲੋਕਨ ਅਤੇ ਵਿਆਖਿਆ ਨਾਲ ਜੋੜ ਕੇ ਸਮਝਦੇ ਹਾਂ।`),
        pickLanguage(explanationLanguage, `A strong answer on ${topic} should include the main idea, cause, and one example.`, `${topic} पर अच्छे उत्तर में मुख्य विचार, कारण और एक उदाहरण होना चाहिए।`, `${topic} ਬਾਰੇ ਚੰਗੇ ਉੱਤਰ ਵਿੱਚ ਮੁੱਖ ਵਿਚਾਰ, ਕਾਰਣ ਅਤੇ ਇੱਕ ਉਦਾਹਰਨ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।`),
      ],
      formulaSpeech: [
        pickLanguage(explanationLanguage, `This pattern helps us explain ${topic} in a scientific way.`, `यह ढाँचा ${topic} को वैज्ञानिक ढंग से समझाने में मदद करता है।`, `ਇਹ ਢਾਂਚਾ ${topic} ਨੂੰ ਵਿਗਿਆਨਕ ਢੰਗ ਨਾਲ ਸਮਝਾਉਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।`),
        pickLanguage(explanationLanguage, `We can think of ${topic} in terms of cause, process, and result.`, `हम ${topic} को कारण, प्रक्रिया और परिणाम के रूप में समझ सकते हैं।`, `ਅਸੀਂ ${topic} ਨੂੰ ਕਾਰਣ, ਪ੍ਰਕਿਰਿਆ ਅਤੇ ਨਤੀਜੇ ਦੇ ਰੂਪ ਵਿੱਚ ਸਮਝ ਸਕਦੇ ਹਾਂ।`),
      ],
      stepSpeech: [
        pickLanguage(explanationLanguage, `Start by giving the meaning of ${topic}.`, `${topic} का अर्थ बताकर शुरू करो।`, `${topic} ਦਾ ਅਰਥ ਦੱਸ ਕੇ ਸ਼ੁਰੂ ਕਰੋ।`),
        pickLanguage(explanationLanguage, `Now explain how or why ${topic} happens.`, `अब समझाओ कि ${topic} कैसे या क्यों होता है।`, `ਹੁਣ ਸਮਝਾਓ ਕਿ ${topic} ਕਿਵੇਂ ਜਾਂ ਕਿਉਂ ਹੁੰਦਾ ਹੈ।`),
        pickLanguage(explanationLanguage, `Finish by connecting ${topic} with one practical example.`, `अंत में ${topic} को एक व्यावहारिक उदाहरण से जोड़ो।`, `ਅੰਤ ਵਿੱਚ ${topic} ਨੂੰ ਇੱਕ ਕਾਰਗਰ ਉਦਾਹਰਨ ਨਾਲ ਜੋੜੋ।`),
      ],
      exampleSpeech: pickLanguage(explanationLanguage, `Let us use one simple real-life example to make ${topic} easier to remember.`, `आओ एक सरल वास्तविक उदाहरण से ${topic} को यादगार बनाएं।`, `ਆਓ ਇੱਕ ਸੌਖੀ ਅਸਲੀ ਉਦਾਹਰਨ ਨਾਲ ${topic} ਨੂੰ ਯਾਦਗਾਰ ਬਣਾਈਏ।`),
      recapSpeech: pickLanguage(explanationLanguage, `Recap: ${topic} should be explained through meaning, process, and evidence.`, `पुनरावृत्ति: ${topic} को अर्थ, प्रक्रिया और प्रमाण के आधार पर समझाना चाहिए।`, `ਦੁਹਰਾਈ: ${topic} ਨੂੰ ਅਰਥ, ਪ੍ਰਕਿਰਿਆ ਅਤੇ ਪ੍ਰਮਾਣ ਦੇ ਆਧਾਰ 'ਤੇ ਸਮਝਾਉਣਾ ਚਾਹੀਦਾ ਹੈ।`),
      recapBoardText: pickLanguage(boardLanguage, `Remember ${topic} through meaning, process, and result.`, `${topic} को अर्थ, प्रक्रिया और परिणाम से याद रखो।`, `${topic} ਨੂੰ ਅਰਥ, ਪ੍ਰਕਿਰਿਆ ਅਤੇ ਨਤੀਜੇ ਨਾਲ ਯਾਦ ਰੱਖੋ।`),
      recapPoints: [
        pickLanguage(explanationLanguage, `${topic} is a science concept.`, `${topic} विज्ञान का एक विषय है।`, `${topic} ਵਿਗਿਆਨ ਦਾ ਇੱਕ ਵਿਸ਼ਾ ਹੈ।`),
        pickLanguage(explanationLanguage, `Explain it with observation and reason.`, `इसे अवलोकन और कारण से समझाओ।`, `ਇਸਨੂੰ ਅਵਲੋਕਨ ਅਤੇ ਕਾਰਣ ਨਾਲ ਸਮਝਾਓ।`),
        pickLanguage(explanationLanguage, `Use one clear example in the answer.`, `उत्तर में एक साफ़ उदाहरण दो।`, `ਉੱਤਰ ਵਿੱਚ ਇੱਕ ਸਾਫ਼ ਉਦਾਹਰਨ ਦਿਓ।`),
      ],
      practiceQuestion: pickLanguage(explanationLanguage, `Practice question: Define ${topic} and explain it with one example.`, `अभ्यास प्रश्न: ${topic} की परिभाषा लिखो और एक उदाहरण सहित समझाओ।`, `ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ${topic} ਦੀ ਪਰਿਭਾਸ਼ਾ ਲਿਖੋ ਅਤੇ ਇੱਕ ਉਦਾਹਰਨ ਨਾਲ ਸਮਝਾਓ।`),
      diagramInstructions: [],
      diagramActions: buildDiagramActions(null, boardLanguage, family),
    };
  }

  if (family === "MATHS") {
    return {
      boardPayload: {
        boardTitle: shortBoardTitle(topic, boardLanguage),
        boardLines: [
          pickLanguage(boardLanguage, `${topic} is a maths topic based on quantity, relation, or operation.`, `${topic} गणित का विषय है जो मात्रा, संबंध या क्रिया पर आधारित है।`, `${topic} ਗਣਿਤ ਦਾ ਵਿਸ਼ਾ ਹੈ ਜੋ ਮਾਤਰਾ, ਸੰਬੰਧ ਜਾਂ ਕ੍ਰਿਆ 'ਤੇ ਆਧਾਰਿਤ ਹੈ।`),
          pickLanguage(boardLanguage, `To solve ${topic}, identify the given data and apply the correct rule carefully.`, `${topic} हल करने के लिए दिए गए डेटा को पहचानो और सही नियम सावधानी से लगाओ।`, `${topic} ਨੂੰ ਹੱਲ ਕਰਨ ਲਈ ਦਿੱਤੇ ਡਾਟੇ ਨੂੰ ਪਛਾਣੋ ਅਤੇ ਸਹੀ ਨਿਯਮ ਧਿਆਨ ਨਾਲ ਲਗਾਓ।`),
          pickLanguage(boardLanguage, `Every maths answer should show steps clearly, not only the final result.`, `हर गणितीय उत्तर में केवल अंतिम परिणाम नहीं बल्कि चरण भी साफ़ होने चाहिए।`, `ਹਰ ਗਣਿਤੀ ਉੱਤਰ ਵਿੱਚ ਸਿਰਫ਼ ਅੰਤਿਮ ਨਤੀਜਾ ਨਹੀਂ, ਸਗੋਂ ਕਦਮ ਵੀ ਸਾਫ਼ ਹੋਣੇ ਚਾਹੀਦੇ ਹਨ।`),
        ],
        formulas: [pickLanguage(boardLanguage, "Given values -> apply rule -> simplify -> check", "दी गई राशियाँ -> नियम लगाओ -> सरल करो -> जाँचो", "ਦਿੱਤੀਆਂ ਰਾਸ਼ੀਆਂ -> ਨਿਯਮ ਲਗਾਓ -> ਸਧਾਰੋ -> ਜਾਂਚੋ")],
        steps: [
          pickLanguage(boardLanguage, `Read the question for ${topic} carefully.`, `${topic} से जुड़ा प्रश्न ध्यान से पढ़ो।`, `${topic} ਨਾਲ ਜੁੜਿਆ ਪ੍ਰਸ਼ਨ ਧਿਆਨ ਨਾਲ ਪੜ੍ਹੋ।`),
          pickLanguage(boardLanguage, `Choose the correct operation or rule.`, `सही क्रिया या नियम चुनो।`, `ਸਹੀ ਕ੍ਰਿਆ ਜਾਂ ਨਿਯਮ ਚੁਣੋ।`),
          pickLanguage(boardLanguage, `Solve step by step and check the answer.`, `चरणबद्ध हल करो और उत्तर जाँचो।`, `ਕਦਮ ਦਰ ਕਦਮ ਹੱਲ ਕਰੋ ਅਤੇ ਉੱਤਰ ਦੀ ਜਾਂਚ ਕਰੋ।`),
        ],
        exampleTitle: pickLanguage(boardLanguage, `${topic} Worked Example`, `${topic} हल किया उदाहरण`, `${topic} ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ`),
        exampleSteps: [
          pickLanguage(boardLanguage, `Take one simple number-based example of ${topic}.`, `${topic} का एक सरल संख्यात्मक उदाहरण लो।`, `${topic} ਦਾ ਇੱਕ ਸੌਖਾ ਸੰਖਿਆਤਮਕ ਉਦਾਹਰਨ ਲਵੋ।`),
          pickLanguage(boardLanguage, `Show each step clearly before writing the final answer.`, `अंतिम उत्तर लिखने से पहले हर कदम साफ़ दिखाओ।`, `ਅੰਤਿਮ ਉੱਤਰ ਲਿਖਣ ਤੋਂ ਪਹਿਲਾਂ ਹਰ ਕਦਮ ਸਾਫ਼ ਦਿਖਾਓ।`),
        ],
      },
      noteSpeech: [
        pickLanguage(explanationLanguage, `${topic} is understood best when we connect the idea to a clear rule and example.`, `${topic} को नियम और उदाहरण से जोड़ने पर सबसे अच्छी तरह समझा जा सकता है।`, `${topic} ਨੂੰ ਨਿਯਮ ਅਤੇ ਉਦਾਹਰਨ ਨਾਲ ਜੋੜਿਆਂ ਸਭ ਤੋਂ ਵਧੀਆ ਸਮਝਿਆ ਜਾਂਦਾ ਹੈ।`),
        pickLanguage(explanationLanguage, `In maths, correct method is as important as the final answer.`, `गणित में सही विधि अंतिम उत्तर जितनी ही महत्वपूर्ण होती है।`, `ਗਣਿਤ ਵਿੱਚ ਸਹੀ ਵਿਧੀ ਅੰਤਿਮ ਉੱਤਰ ਜਿੰਨੀ ਹੀ ਮਹੱਤਵਪੂਰਨ ਹੁੰਦੀ ਹੈ।`),
        pickLanguage(explanationLanguage, `We solve ${topic} by reading carefully, applying the rule, and checking the result.`, `हम ${topic} को ध्यान से पढ़कर, नियम लगाकर और परिणाम जाँचकर हल करते हैं।`, `ਅਸੀਂ ${topic} ਨੂੰ ਧਿਆਨ ਨਾਲ ਪੜ੍ਹ ਕੇ, ਨਿਯਮ ਲਗਾ ਕੇ ਅਤੇ ਨਤੀਜਾ ਜਾਂਚ ਕੇ ਹੱਲ ਕਰਦੇ ਹਾਂ।`),
      ],
      formulaSpeech: [pickLanguage(explanationLanguage, `This is the standard maths workflow for ${topic}.`, `यह ${topic} के लिए मानक गणितीय कार्यविधि है।`, `ਇਹ ${topic} ਲਈ ਮਿਆਰੀ ਗਣਿਤੀ ਕਾਰਵਿਧੀ ਹੈ।`)],
      stepSpeech: [
        pickLanguage(explanationLanguage, `Start by reading the question correctly.`, `सही शुरुआत प्रश्न को ठीक से पढ़ने से होती है।`, `ਸਹੀ ਸ਼ੁਰੂਆਤ ਪ੍ਰਸ਼ਨ ਨੂੰ ਠੀਕ ਤਰ੍ਹਾਂ ਪੜ੍ਹਣ ਨਾਲ ਹੁੰਦੀ ਹੈ।`),
        pickLanguage(explanationLanguage, `Now choose the proper rule or operation.`, `अब उचित नियम या क्रिया चुनो।`, `ਹੁਣ ਢੰਗ ਦਾ ਨਿਯਮ ਜਾਂ ਕ੍ਰਿਆ ਚੁਣੋ।`),
        pickLanguage(explanationLanguage, `Finally solve neatly and verify the result.`, `अंत में साफ़ हल करके परिणाम की जाँच करो।`, `ਅੰਤ ਵਿੱਚ ਸਾਫ਼ ਹੱਲ ਕਰਕੇ ਨਤੀਜੇ ਦੀ ਜਾਂਚ ਕਰੋ।`),
      ],
      exampleSpeech: pickLanguage(explanationLanguage, `Let us look at one short worked example of ${topic}.`, `आओ ${topic} का एक छोटा हल किया उदाहरण देखें।`, `ਆਓ ${topic} ਦਾ ਇੱਕ ਛੋਟਾ ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ ਵੇਖੀਏ।`),
      recapSpeech: pickLanguage(explanationLanguage, `Recap: understand the rule, apply it step by step, and always check the answer.`, `पुनरावृत्ति: नियम समझो, चरणबद्ध लगाओ और उत्तर अवश्य जाँचो।`, `ਦੁਹਰਾਈ: ਨਿਯਮ ਸਮਝੋ, ਕਦਮ ਦਰ ਕਦਮ ਲਗਾਓ ਅਤੇ ਉੱਤਰ ਜ਼ਰੂਰ ਜਾਂਚੋ।`),
      recapBoardText: pickLanguage(boardLanguage, `Remember ${topic} through rule, steps, and checking.`, `${topic} को नियम, चरण और जाँच से याद रखो।`, `${topic} ਨੂੰ ਨਿਯਮ, ਕਦਮ ਅਤੇ ਜਾਂਚ ਨਾਲ ਯਾਦ ਰੱਖੋ।`),
      recapPoints: [
        pickLanguage(explanationLanguage, `${topic} needs a clear method.`, `${topic} में स्पष्ट विधि चाहिए।`, `${topic} ਵਿੱਚ ਸਾਫ਼ ਵਿਧੀ ਚਾਹੀਦੀ ਹੈ।`),
        pickLanguage(explanationLanguage, `Show steps before the final answer.`, `अंतिम उत्तर से पहले चरण दिखाओ।`, `ਅੰਤਿਮ ਉੱਤਰ ਤੋਂ ਪਹਿਲਾਂ ਕਦਮ ਦਿਖਾਓ।`),
        pickLanguage(explanationLanguage, `Check the answer at the end.`, `अंत में उत्तर जाँचो।`, `ਅੰਤ ਵਿੱਚ ਉੱਤਰ ਜਾਂਚੋ।`),
      ],
      practiceQuestion: pickLanguage(explanationLanguage, `Practice question: Solve one simple question based on ${topic} and show all steps.`, `अभ्यास प्रश्न: ${topic} पर आधारित एक सरल प्रश्न हल करो और सभी चरण दिखाओ।`, `ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ${topic} ਅਧਾਰਿਤ ਇੱਕ ਸੌਖਾ ਪ੍ਰਸ਼ਨ ਹੱਲ ਕਰੋ ਅਤੇ ਸਾਰੇ ਕਦਮ ਦਿਖਾਓ।`),
      diagramInstructions: [],
      diagramActions: buildDiagramActions(null, boardLanguage, family),
    };
  }

  if (family === "LANGUAGE") {
    return {
      boardPayload: {
        boardTitle: shortBoardTitle(topic, boardLanguage),
        boardLines: [
          pickLanguage(boardLanguage, `${topic} is a language topic about meaning, form, or correct usage.`, `${topic} भाषा का विषय है जो अर्थ, रूप या सही प्रयोग से जुड़ा है।`, `${topic} ਭਾਸ਼ਾ ਦਾ ਵਿਸ਼ਾ ਹੈ ਜੋ ਅਰਥ, ਰੂਪ ਜਾਂ ਸਹੀ ਵਰਤੋਂ ਨਾਲ ਜੁੜਿਆ ਹੈ।`),
          pickLanguage(boardLanguage, `A good language answer on ${topic} gives the rule and then shows it in examples.`, `${topic} पर अच्छे भाषा-उत्तर में पहले नियम और फिर उदाहरण आते हैं।`, `${topic} ਬਾਰੇ ਚੰਗੇ ਭਾਸ਼ਾਈ ਉੱਤਰ ਵਿੱਚ ਪਹਿਲਾਂ ਨਿਯਮ ਅਤੇ ਫਿਰ ਉਦਾਹਰਨ ਆਉਂਦੇ ਹਨ।`),
          pickLanguage(boardLanguage, `Correct usage becomes clear when we place ${topic} inside a sentence.`, `${topic} की सही समझ तब बनती है जब उसे वाक्य में रखा जाता है।`, `${topic} ਦੀ ਸਹੀ ਸਮਝ ਤਦ ਬਣਦੀ ਹੈ ਜਦੋਂ ਇਸਨੂੰ ਵਾਕ ਵਿੱਚ ਰੱਖਿਆ ਜਾਂਦਾ ਹੈ।`),
        ],
        formulas: [pickLanguage(boardLanguage, "Rule -> example -> sentence usage", "नियम -> उदाहरण -> वाक्य प्रयोग", "ਨਿਯਮ -> ਉਦਾਹਰਨ -> ਵਾਕ ਵਰਤੋਂ")],
        steps: [
          pickLanguage(boardLanguage, `Write the rule or meaning of ${topic}.`, `${topic} का नियम या अर्थ लिखो।`, `${topic} ਦਾ ਨਿਯਮ ਜਾਂ ਅਰਥ ਲਿਖੋ।`),
          pickLanguage(boardLanguage, `Add one simple example.`, `एक सरल उदाहरण जोड़ो।`, `ਇੱਕ ਸੌਖਾ ਉਦਾਹਰਨ ਜੋੜੋ।`),
          pickLanguage(boardLanguage, `Show the correct sentence use.`, `सही वाक्य प्रयोग दिखाओ।`, `ਸਹੀ ਵਾਕ ਵਰਤੋਂ ਦਿਖਾਓ।`),
        ],
        exampleTitle: pickLanguage(boardLanguage, `${topic} Example`, `${topic} उदाहरण`, `${topic} ਉਦਾਹਰਨ`),
        exampleSteps: [
          pickLanguage(boardLanguage, `Take one word or sentence based on ${topic}.`, `${topic} पर आधारित एक शब्द या वाक्य लो।`, `${topic} ਅਧਾਰਿਤ ਇੱਕ ਸ਼ਬਦ ਜਾਂ ਵਾਕ ਲਵੋ।`),
          pickLanguage(boardLanguage, `Explain why the usage is correct.`, `समझाओ कि यह प्रयोग सही क्यों है।`, `ਸਮਝਾਓ ਕਿ ਇਹ ਵਰਤੋਂ ਸਹੀ ਕਿਉਂ ਹੈ।`),
        ],
      },
      noteSpeech: [
        pickLanguage(explanationLanguage, `${topic} is best learned by combining rule, example, and sentence use.`, `${topic} को नियम, उदाहरण और वाक्य-प्रयोग से सबसे अच्छे ढंग से सीखा जाता है।`, `${topic} ਨੂੰ ਨਿਯਮ, ਉਦਾਹਰਨ ਅਤੇ ਵਾਕ-ਵਰਤੋਂ ਨਾਲ ਸਭ ਤੋਂ ਵਧੀਆ ਸਿੱਖਿਆ ਜਾਂਦਾ ਹੈ।`),
        pickLanguage(explanationLanguage, `The main focus is correct form and correct usage.`, `मुख्य ध्यान सही रूप और सही प्रयोग पर होता है।`, `ਮੁੱਖ ਧਿਆਨ ਸਹੀ ਰੂਪ ਅਤੇ ਸਹੀ ਵਰਤੋਂ 'ਤੇ ਹੁੰਦਾ ਹੈ।`),
        pickLanguage(explanationLanguage, `One good example often makes the grammar point much clearer.`, `एक अच्छा उदाहरण व्याकरण-बिंदु को अधिक स्पष्ट बना देता है।`, `ਇੱਕ ਚੰਗਾ ਉਦਾਹਰਨ ਵਿਆਕਰਣ ਬਿੰਦੂ ਨੂੰ ਕਾਫ਼ੀ ਸਾਫ਼ ਕਰ ਦਿੰਦਾ ਹੈ।`),
      ],
      formulaSpeech: [pickLanguage(explanationLanguage, `This pattern helps us remember the language point in order.`, `यह ढाँचा भाषा-बिंदु को क्रम में याद रखने में मदद करता है।`, `ਇਹ ਢਾਂਚਾ ਭਾਸ਼ਾਈ ਬਿੰਦੂ ਨੂੰ ਕ੍ਰਮ ਵਿੱਚ ਯਾਦ ਰੱਖਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।`)],
      stepSpeech: [
        pickLanguage(explanationLanguage, `Start with the rule or meaning.`, `नियम या अर्थ से शुरू करो।`, `ਨਿਯਮ ਜਾਂ ਅਰਥ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ।`),
        pickLanguage(explanationLanguage, `Then add a simple example.`, `फिर एक सरल उदाहरण जोड़ो।`, `ਫਿਰ ਇੱਕ ਸੌਖਾ ਉਦਾਹਰਨ ਜੋੜੋ।`),
        pickLanguage(explanationLanguage, `Finally show how it is used correctly in a sentence.`, `अंत में दिखाओ कि यह वाक्य में सही तरह कैसे आता है।`, `ਅੰਤ ਵਿੱਚ ਦਿਖਾਓ ਕਿ ਇਹ ਵਾਕ ਵਿੱਚ ਠੀਕ ਤਰ੍ਹਾਂ ਕਿਵੇਂ ਆਉਂਦਾ ਹੈ।`),
      ],
      exampleSpeech: pickLanguage(explanationLanguage, `Let us use one sentence example to make ${topic} clearer.`, `आओ एक वाक्य-उदाहरण से ${topic} को और स्पष्ट करें।`, `ਆਓ ਇੱਕ ਵਾਕ-ਉਦਾਹਰਨ ਨਾਲ ${topic} ਨੂੰ ਹੋਰ ਸਾਫ਼ ਕਰੀਏ।`),
      recapSpeech: pickLanguage(explanationLanguage, `Recap: learn ${topic} through rule, example, and correct usage.`, `पुनरावृत्ति: ${topic} को नियम, उदाहरण और सही प्रयोग से सीखो।`, `ਦੁਹਰਾਈ: ${topic} ਨੂੰ ਨਿਯਮ, ਉਦਾਹਰਨ ਅਤੇ ਸਹੀ ਵਰਤੋਂ ਨਾਲ ਸਿੱਖੋ।`),
      recapBoardText: pickLanguage(boardLanguage, `Remember ${topic} through rule and usage.`, `${topic} को नियम और प्रयोग से याद रखो।`, `${topic} ਨੂੰ ਨਿਯਮ ਅਤੇ ਵਰਤੋਂ ਨਾਲ ਯਾਦ ਰੱਖੋ।`),
      recapPoints: [
        pickLanguage(explanationLanguage, `${topic} has a clear rule or usage idea.`, `${topic} का एक स्पष्ट नियम या प्रयोग-विचार होता है।`, `${topic} ਦਾ ਇੱਕ ਸਾਫ਼ ਨਿਯਮ ਜਾਂ ਵਰਤੋਂ-ਵਿਚਾਰ ਹੁੰਦਾ ਹੈ।`),
        pickLanguage(explanationLanguage, `Examples make the point easier.`, `उदाहरण इसे आसान बनाते हैं।`, `ਉਦਾਹਰਨ ਇਸਨੂੰ ਆਸਾਨ ਬਣਾਉਂਦੇ ਹਨ।`),
        pickLanguage(explanationLanguage, `Use it correctly in a sentence.`, `इसे वाक्य में सही प्रयोग करो।`, `ਇਸਨੂੰ ਵਾਕ ਵਿੱਚ ਸਹੀ ਵਰਤੋਂ ਕਰੋ।`),
      ],
      practiceQuestion: pickLanguage(explanationLanguage, `Practice question: Explain ${topic} and use it in one correct sentence.`, `अभ्यास प्रश्न: ${topic} समझाओ और एक सही वाक्य में प्रयोग करो।`, `ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ${topic} ਨੂੰ ਸਮਝਾਓ ਅਤੇ ਇੱਕ ਠੀਕ ਵਾਕ ਵਿੱਚ ਵਰਤੋ।`),
      diagramInstructions: [],
      diagramActions: buildDiagramActions(null, boardLanguage, family),
    };
  }

  if (family === "SST") {
    return {
      boardPayload: {
        boardTitle: shortBoardTitle(topic, boardLanguage),
        boardLines: [
          pickLanguage(boardLanguage, `${topic} is an SST topic connected with institutions, society, history, or governance.`, `${topic} एसएसटी का विषय है जो संस्थाओं, समाज, इतिहास या शासन से जुड़ा है।`, `${topic} ਐੱਸਐੱਸਟੀ ਦਾ ਵਿਸ਼ਾ ਹੈ ਜੋ ਸੰਸਥਾਵਾਂ, ਸਮਾਜ, ਇਤਿਹਾਸ ਜਾਂ ਸ਼ਾਸਨ ਨਾਲ ਜੁੜਿਆ ਹੈ।`),
          pickLanguage(boardLanguage, `To explain ${topic}, define it, then list its key features and impact.`, `${topic} को समझाने के लिए पहले परिभाषा दो, फिर मुख्य विशेषताएँ और प्रभाव बताओ।`, `${topic} ਨੂੰ ਸਮਝਾਉਣ ਲਈ ਪਹਿਲਾਂ ਪਰਿਭਾਸ਼ਾ ਦਿਓ, ਫਿਰ ਮੁੱਖ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਅਤੇ ਪ੍ਰਭਾਵ ਦੱਸੋ।`),
          pickLanguage(boardLanguage, `One real example makes the idea more meaningful and easier to remember.`, `एक वास्तविक उदाहरण विचार को अधिक अर्थपूर्ण और यादगार बनाता है।`, `ਇੱਕ ਅਸਲੀ ਉਦਾਹਰਨ ਵਿਚਾਰ ਨੂੰ ਹੋਰ ਅਰਥਪੂਰਨ ਅਤੇ ਯਾਦਗਾਰ ਬਣਾਉਂਦਾ ਹੈ।`),
        ],
        formulas: [pickLanguage(boardLanguage, "Idea -> structure -> impact", "विचार -> संरचना -> प्रभाव", "ਵਿਚਾਰ -> ਢਾਂਚਾ -> ਪ੍ਰਭਾਵ")],
        steps: [
          pickLanguage(boardLanguage, `Define ${topic} in one clear line.`, `${topic} को एक साफ़ पंक्ति में परिभाषित करो।`, `${topic} ਨੂੰ ਇੱਕ ਸਾਫ਼ ਲਾਈਨ ਵਿੱਚ ਪਰਿਭਾਸ਼ਿਤ ਕਰੋ।`),
          pickLanguage(boardLanguage, `List the key features or points.`, `मुख्य विशेषताएँ या बिंदु लिखो।`, `ਮੁੱਖ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਜਾਂ ਬਿੰਦੂ ਲਿਖੋ।`),
          pickLanguage(boardLanguage, `Add one real example or effect.`, `एक वास्तविक उदाहरण या प्रभाव जोड़ो।`, `ਇੱਕ ਅਸਲੀ ਉਦਾਹਰਨ ਜਾਂ ਪ੍ਰਭਾਵ ਜੋੜੋ।`),
        ],
        exampleTitle: pickLanguage(boardLanguage, `${topic} Example`, `${topic} उदाहरण`, `${topic} ਉਦਾਹਰਨ`),
        exampleSteps: [
          pickLanguage(boardLanguage, `Take one real case linked to ${topic}.`, `${topic} से जुड़ा एक वास्तविक उदाहरण लो।`, `${topic} ਨਾਲ ਜੁੜਿਆ ਇੱਕ ਅਸਲੀ ਉਦਾਹਰਨ ਲਵੋ।`),
          pickLanguage(boardLanguage, `Explain how that example shows the idea of ${topic}.`, `बताओ कि वह उदाहरण ${topic} को कैसे दिखाता है।`, `ਸਮਝਾਓ ਕਿ ਉਹ ਉਦਾਹਰਨ ${topic} ਨੂੰ ਕਿਵੇਂ ਦਿਖਾਉਂਦਾ ਹੈ।`),
        ],
      },
      noteSpeech: [
        pickLanguage(explanationLanguage, `${topic} should be understood through definition, features, and social or political impact.`, `${topic} को परिभाषा, विशेषताओं और सामाजिक या राजनीतिक प्रभाव से समझना चाहिए।`, `${topic} ਨੂੰ ਪਰਿਭਾਸ਼ਾ, ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਅਤੇ ਸਮਾਜਿਕ ਜਾਂ ਰਾਜਨੀਤਿਕ ਪ੍ਰਭਾਵ ਨਾਲ ਸਮਝਣਾ ਚਾਹੀਦਾ ਹੈ।`),
        pickLanguage(explanationLanguage, `In SST, key points and examples help build a strong written answer.`, `एसएसटी में मुख्य बिंदु और उदाहरण मिलकर अच्छा लिखित उत्तर बनाते हैं।`, `ਐੱਸਐੱਸਟੀ ਵਿੱਚ ਮੁੱਖ ਬਿੰਦੂ ਅਤੇ ਉਦਾਹਰਨ ਮਿਲ ਕੇ ਵਧੀਆ ਲਿਖਤੀ ਉੱਤਰ ਬਣਾਉਂਦੇ ਹਨ।`),
        pickLanguage(explanationLanguage, `A real example makes ${topic} more meaningful and memorable.`, `एक वास्तविक उदाहरण ${topic} को अधिक अर्थपूर्ण और यादगार बना देता है।`, `ਇੱਕ ਅਸਲੀ ਉਦਾਹਰਨ ${topic} ਨੂੰ ਹੋਰ ਅਰਥਪੂਰਨ ਅਤੇ ਯਾਦਗਾਰ ਬਣਾ ਦਿੰਦਾ ਹੈ।`),
      ],
      formulaSpeech: [pickLanguage(explanationLanguage, `This structure helps us organize the SST answer clearly.`, `यह संरचना एसएसटी उत्तर को साफ़ ढंग से व्यवस्थित करने में मदद करती है।`, `ਇਹ ਢਾਂਚਾ ਐੱਸਐੱਸਟੀ ਉੱਤਰ ਨੂੰ ਸਾਫ਼ ਢੰਗ ਨਾਲ ਵਿਵਸਥਿਤ ਕਰਨ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।`)],
      stepSpeech: [
        pickLanguage(explanationLanguage, `Start with a direct definition.`, `सीधी परिभाषा से शुरू करो।`, `ਸਿੱਧੀ ਪਰਿਭਾਸ਼ਾ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ।`),
        pickLanguage(explanationLanguage, `Now list the main points in order.`, `अब मुख्य बिंदु क्रम से लिखो।`, `ਹੁਣ ਮੁੱਖ ਬਿੰਦੂ ਕ੍ਰਮ ਨਾਲ ਲਿਖੋ।`),
        pickLanguage(explanationLanguage, `Finish with one real example or effect.`, `अंत में एक वास्तविक उदाहरण या प्रभाव दो।`, `ਅੰਤ ਵਿੱਚ ਇੱਕ ਅਸਲੀ ਉਦਾਹਰਨ ਜਾਂ ਪ੍ਰਭਾਵ ਦਿਓ।`),
      ],
      exampleSpeech: pickLanguage(explanationLanguage, `Let us use one real example to make ${topic} easier to remember.`, `आओ एक वास्तविक उदाहरण से ${topic} को और स्पष्ट करें।`, `ਆਓ ਇੱਕ ਅਸਲੀ ਉਦਾਹਰਨ ਨਾਲ ${topic} ਨੂੰ ਹੋਰ ਸਾਫ਼ ਕਰੀਏ।`),
      recapSpeech: pickLanguage(explanationLanguage, `Recap: remember ${topic} through definition, key points, and one example.`, `पुनरावृत्ति: ${topic} को परिभाषा, मुख्य बिंदु और एक उदाहरण से याद रखो।`, `ਦੁਹਰਾਈ: ${topic} ਨੂੰ ਪਰਿਭਾਸ਼ਾ, ਮੁੱਖ ਬਿੰਦੂ ਅਤੇ ਇੱਕ ਉਦਾਹਰਨ ਨਾਲ ਯਾਦ ਰੱਖੋ।`),
      recapBoardText: pickLanguage(boardLanguage, `Remember ${topic} through idea, features, and impact.`, `${topic} को विचार, विशेषताओं और प्रभाव से याद रखो।`, `${topic} ਨੂੰ ਵਿਚਾਰ, ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਅਤੇ ਪ੍ਰਭਾਵ ਨਾਲ ਯਾਦ ਰੱਖੋ।`),
      recapPoints: [
        pickLanguage(explanationLanguage, `${topic} is an SST concept.`, `${topic} एसएसटी की एक अवधारणा है।`, `${topic} ਐੱਸਐੱਸਟੀ ਦੀ ਇੱਕ ਧਾਰਨਾ ਹੈ।`),
        pickLanguage(explanationLanguage, `Write key points in order.`, `मुख्य बिंदु क्रम से लिखो।`, `ਮੁੱਖ ਬਿੰਦੂ ਕ੍ਰਮ ਨਾਲ ਲਿਖੋ।`),
        pickLanguage(explanationLanguage, `Use one real example in the answer.`, `उत्तर में एक वास्तविक उदाहरण दो।`, `ਉੱਤਰ ਵਿੱਚ ਇੱਕ ਅਸਲੀ ਉਦਾਹਰਨ ਦਿਓ।`),
      ],
      practiceQuestion: pickLanguage(explanationLanguage, `Practice question: Define ${topic} and write any two key points with one example.`, `अभ्यास प्रश्न: ${topic} की परिभाषा लिखो और दो मुख्य बिंदु एक उदाहरण सहित बताओ।`, `ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ${topic} ਦੀ ਪਰਿਭਾਸ਼ਾ ਲਿਖੋ ਅਤੇ ਦੋ ਮੁੱਖ ਬਿੰਦੂ ਇੱਕ ਉਦਾਹਰਨ ਸਮੇਤ ਦੱਸੋ।`),
      diagramInstructions: [],
      diagramActions: buildDiagramActions(null, boardLanguage, family),
    };
  }

  return genericLesson(context, family);
};

const chemicalReactionLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  const topic = "Chemical Reaction";
  return {
    boardPayload: {
      boardTitle: boardTitle(topic, boardLanguage),
      boardLines: [
        pickLanguage(
          boardLanguage,
          "A chemical reaction is a process in which reactants change into products with new properties.",
          "रासायनिक अभिक्रिया वह प्रक्रिया है जिसमें अभिकारक बदलकर नए गुणों वाले उत्पाद बनाते हैं।",
          "ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਉਹ ਪ੍ਰਕਿਰਿਆ ਹੈ ਜਿਸ ਵਿੱਚ ਅਭਿਕਾਰਕ ਬਦਲ ਕੇ ਨਵੇਂ ਗੁਣਾਂ ਵਾਲੇ ਉਤਪਾਦ ਬਣਾਉਂਦੇ ਹਨ।"
        ),
        pickLanguage(
          boardLanguage,
          "Scientific signs: colour change, temperature change, gas evolution, or precipitate formation.",
          "वैज्ञानिक संकेत हैं रंग परिवर्तन, ताप परिवर्तन, गैस का निकलना या अवक्षेप का बनना।",
          "ਵਿਗਿਆਨਕ ਸੰਕੇਤ ਹਨ ਰੰਗ ਬਦਲਾਅ, ਤਾਪ ਬਦਲਾਅ, ਗੈਸ ਨਿਕਲਣਾ ਜਾਂ ਤਲਛਟ ਬਣਨਾ।"
        ),
        pickLanguage(
          boardLanguage,
          "Example symbols: Mg = magnesium, O2 = oxygen, MgO = magnesium oxide.",
          "प्रतीक उदाहरण: Mg = मैग्नीशियम, O2 = ऑक्सीजन, MgO = मैग्नीशियम ऑक्साइड।",
          "ਪ੍ਰਤੀਕ ਉਦਾਹਰਨ: Mg = ਮੈਗਨੀਸ਼ੀਅਮ, O2 = ਆਕਸੀਜਨ, MgO = ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ।"
        )
      ],
      formulas: [
        pickLanguage(boardLanguage, "Reactants -> Products", "अभिकारक -> उत्पाद", "ਅਭਿਕਾਰਕ -> ਉਤਪਾਦ"),
        "2Mg + O2 -> 2MgO"
      ],
      steps: [
        pickLanguage(boardLanguage, "Read the balanced equation: 2Mg + O2 -> 2MgO.", "संतुलित समीकरण पढ़ो: 2Mg + O2 -> 2MgO.", "ਸੰਤੁਲਿਤ ਸਮੀਕਰਨ ਪੜ੍ਹੋ: 2Mg + O2 -> 2MgO."),
        pickLanguage(boardLanguage, "Identify the reactants on the left: magnesium metal and oxygen gas.", "बाईं ओर के अभिकारकों की पहचान करो: मैग्नीशियम धातु और ऑक्सीजन गैस।", "ਖੱਬੇ ਪਾਸੇ ਦੇ ਅਭਿਕਾਰਕ ਪਛਾਣੋ: ਮੈਗਨੀਸ਼ੀਅਮ ਧਾਤੁ ਅਤੇ ਆਕਸੀਜਨ ਗੈਸ।"),
        pickLanguage(boardLanguage, "Identify the product on the right: magnesium oxide, a new white solid.", "दाईं ओर के उत्पाद की पहचान करो: मैग्नीशियम ऑक्साइड, एक नया सफेद ठोस।", "ਸੱਜੇ ਪਾਸੇ ਦੇ ਉਤਪਾਦ ਦੀ ਪਛਾਣ ਕਰੋ: ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ, ਇੱਕ ਨਵਾਂ ਸਫ਼ੈਦ ਠੋਸ।")
      ],
      exampleTitle: pickLanguage(boardLanguage, "Burning Magnesium Ribbon", "मैग्नीशियम रिबन का जलना", "ਮੈਗਨੀਸ਼ੀਅਮ ਰਿਬਨ ਦਾ ਸੜਨਾ"),
      exampleSteps: [
        pickLanguage(boardLanguage, "Magnesium ribbon burns with a bright white flame.", "मैग्नीशियम रिबन चमकदार सफेद लौ के साथ जलता है।", "ਮੈਗਨੀਸ਼ੀਅਮ ਰਿਬਨ ਤੇਜ਼ ਸਫ਼ੈਦ ਲੌ ਨਾਲ ਸੜਦਾ ਹੈ।"),
        pickLanguage(boardLanguage, "A new white solid called magnesium oxide forms; its formula is MgO.", "एक नया सफेद ठोस बनता है जिसे मैग्नीशियम ऑक्साइड कहते हैं; इसका सूत्र MgO है।", "ਇੱਕ ਨਵਾਂ ਸਫ਼ੈਦ ਠੋਸ ਬਣਦਾ ਹੈ ਜਿਸਨੂੰ ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ ਕਹਿੰਦੇ ਹਨ; ਇਸਦਾ ਸੂਤਰ MgO ਹੈ।"),
        pickLanguage(boardLanguage, "Because a new substance with new properties forms, this is a chemical reaction called oxidation.", "क्योंकि नए गुणों वाला नया पदार्थ बनता है, यह ऑक्सीकरण नाम की रासायनिक अभिक्रिया है।", "ਕਿਉਂਕਿ ਨਵੇਂ ਗੁਣਾਂ ਵਾਲਾ ਨਵਾਂ ਪਦਾਰਥ ਬਣਦਾ ਹੈ, ਇਹ ਆਕਸੀਕਰਨ ਨਾਮ ਦੀ ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਹੈ।")
      ]
    },
    noteSpeech: [
      pickLanguage(explanationLanguage, "A chemical reaction converts reactants into products, and the products have properties different from the starting substances.", "रासायनिक अभिक्रिया में अभिकारक उत्पादों में बदलते हैं, और उत्पादों के गुण प्रारम्भिक पदार्थों से भिन्न होते हैं।", "ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਵਿੱਚ ਅਭਿਕਾਰਕ ਉਤਪਾਦਾਂ ਵਿੱਚ ਬਦਲ ਜਾਂਦੇ ਹਨ, ਅਤੇ ਉਤਪਾਦਾਂ ਦੇ ਗੁਣ ਸ਼ੁਰੂਆਤੀ ਪਦਾਰਥਾਂ ਤੋਂ ਵੱਖਰੇ ਹੁੰਦੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "In the reaction 2Mg + O2 -> 2MgO, magnesium, written as Mg, reacts with oxygen gas, written as O2, to form magnesium oxide, written as MgO.", "समीकरण 2Mg + O2 -> 2MgO में Mg से लिखे मैग्नीशियम की O2 से लिखी ऑक्सीजन गैस के साथ अभिक्रिया होकर MgO से लिखा मैग्नीशियम ऑक्साइड बनता है।", "ਸਮੀਕਰਨ 2Mg + O2 -> 2MgO ਵਿੱਚ Mg ਨਾਲ ਲਿਖਿਆ ਮੈਗਨੀਸ਼ੀਅਮ, O2 ਨਾਲ ਲਿਖੀ ਆਕਸੀਜਨ ਗੈਸ ਨਾਲ ਕ੍ਰਿਆ ਕਰਕੇ MgO ਨਾਲ ਲਿਖਿਆ ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ ਬਣਾਉਂਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "A bright white flame and the formation of white magnesium oxide show that oxidation has taken place and a new substance has formed.", "तेज सफेद लौ और सफेद मैग्नीशियम ऑक्साइड का बनना यह दिखाता है कि ऑक्सीकरण हुआ है और नया पदार्थ बना है।", "ਤੇਜ਼ ਸਫ਼ੈਦ ਲੌ ਅਤੇ ਸਫ਼ੈਦ ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ ਦਾ ਬਣਨਾ ਦਿਖਾਉਂਦਾ ਹੈ ਕਿ ਆਕਸੀਕਰਨ ਹੋਇਆ ਹੈ ਅਤੇ ਨਵਾਂ ਪਦਾਰਥ ਬਣਿਆ ਹੈ।")
    ],
    formulaSpeech: [
      pickLanguage(explanationLanguage, "This short rule reminds us that reactants on the left change into products on the right.", "यह छोटा नियम याद दिलाता है कि बाईं ओर के अभिकारक दाईं ओर के उत्पादों में बदलते हैं।", "ਇਹ ਛੋਟਾ ਨਿਯਮ ਯਾਦ ਦਿਵਾਉਂਦਾ ਹੈ ਕਿ ਖੱਬੇ ਪਾਸੇ ਦੇ ਅਭਿਕਾਰਕ ਸੱਜੇ ਪਾਸੇ ਦੇ ਉਤਪਾਦਾਂ ਵਿੱਚ ਬਦਲ ਜਾਂਦੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "The balanced equation 2Mg + O2 -> 2MgO conserves the number of magnesium and oxygen atoms on both sides.", "संतुलित समीकरण 2Mg + O2 -> 2MgO दोनों पक्षों पर मैग्नीशियम और ऑक्सीजन परमाणुओं की संख्या बराबर रखता है।", "ਸੰਤੁਲਿਤ ਸਮੀਕਰਨ 2Mg + O2 -> 2MgO ਦੋਵੇਂ ਪਾਸਿਆਂ ਤੇ ਮੈਗਨੀਸ਼ੀਅਮ ਅਤੇ ਆਕਸੀਜਨ ਪਰਮਾਣੂਆਂ ਦੀ ਗਿਣਤੀ ਬਰਾਬਰ ਰੱਖਦਾ ਹੈ।")
    ],
    stepSpeech: [
      pickLanguage(explanationLanguage, "First read the balanced reaction carefully so you know the exact scientific symbols taking part.", "पहले संतुलित अभिक्रिया को ध्यान से पढ़ो ताकि शामिल वैज्ञानिक प्रतीकों को ठीक से पहचान सको।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਸੰਤੁਲਿਤ ਕ੍ਰਿਆ ਧਿਆਨ ਨਾਲ ਪੜ੍ਹੋ ਤਾਂ ਕਿ ਸ਼ਾਮਲ ਵਿਗਿਆਨਕ ਪ੍ਰਤੀਕ ਸਹੀ ਤਰ੍ਹਾਂ ਪਛਾਣ ਸਕੋ।"),
      pickLanguage(explanationLanguage, "Now identify the reactants on the left side: magnesium metal and oxygen gas.", "अब बाईं ओर के अभिकारकों की पहचान करो: मैग्नीशियम धातु और ऑक्सीजन गैस।", "ਹੁਣ ਖੱਬੇ ਪਾਸੇ ਦੇ ਅਭਿਕਾਰਕ ਪਛਾਣੋ: ਮੈਗਨੀਸ਼ੀਅਮ ਧਾਤੁ ਅਤੇ ਆਕਸੀਜਨ ਗੈਸ।"),
      pickLanguage(explanationLanguage, "Finally identify magnesium oxide on the right side and connect it to the white ash formed in the experiment.", "अंत में दाईं ओर मैग्नीशियम ऑक्साइड की पहचान करो और उसे प्रयोग में बने सफेद राख जैसे पदार्थ से जोड़ो।", "ਅੰਤ ਵਿੱਚ ਸੱਜੇ ਪਾਸੇ ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ ਦੀ ਪਛਾਣ ਕਰੋ ਅਤੇ ਇਸਨੂੰ ਪ੍ਰਯੋਗ ਵਿੱਚ ਬਣੀ ਸਫ਼ੈਦ ਰਾਖ ਵਰਗੀ ਪਦਾਰਥ ਨਾਲ ਜੋੜੋ।")
    ],
    exampleSpeech: pickLanguage(explanationLanguage, "Let us take the burning of magnesium ribbon as a real classroom example of oxidation, where magnesium combines with oxygen to form magnesium oxide.", "आओ मैग्नीशियम रिबन के जलने को ऑक्सीकरण के वास्तविक कक्षा-उदाहरण के रूप में समझें, जहाँ मैग्नीशियम ऑक्सीजन से मिलकर मैग्नीशियम ऑक्साइड बनाता है।", "ਆਓ ਮੈਗਨੀਸ਼ੀਅਮ ਰਿਬਨ ਦੇ ਸੜਨ ਨੂੰ ਆਕਸੀਕਰਨ ਦੇ ਅਸਲੀ ਕਲਾਸਰੂਮ ਉਦਾਹਰਨ ਵਜੋਂ ਸਮਝੀਏ, ਜਿੱਥੇ ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸੀਜਨ ਨਾਲ ਮਿਲ ਕੇ ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ ਬਣਾਉਂਦਾ ਹੈ।"),
    recapSpeech: pickLanguage(explanationLanguage, "Recap: a chemical reaction forms new substances, uses scientific symbols such as Mg, O2, and MgO, and can be represented by a balanced equation.", "पुनरावृत्ति: रासायनिक अभिक्रिया नए पदार्थ बनाती है, Mg, O2 और MgO जैसे वैज्ञानिक प्रतीकों का उपयोग करती है और संतुलित समीकरण से दर्शाई जा सकती है।", "ਦੁਹਰਾਈ: ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਨਵੇਂ ਪਦਾਰਥ ਬਣਾਉਂਦੀ ਹੈ, Mg, O2 ਅਤੇ MgO ਵਰਗੇ ਵਿਗਿਆਨਕ ਪ੍ਰਤੀਕ ਵਰਤਦੀ ਹੈ ਅਤੇ ਸੰਤੁਲਿਤ ਸਮੀਕਰਨ ਨਾਲ ਦਰਸਾਈ ਜਾ ਸਕਦੀ ਹੈ।"),
    recapBoardText: pickLanguage(boardLanguage, "Remember: 2Mg + O2 -> 2MgO shows new substance formation.", "याद रखो: 2Mg + O2 -> 2MgO नया पदार्थ बनने को दिखाता है।", "ਯਾਦ ਰੱਖੋ: 2Mg + O2 -> 2MgO ਨਵੇਂ ਪਦਾਰਥ ਬਣਨ ਨੂੰ ਦਿਖਾਉਂਦਾ ਹੈ।"),
    recapPoints: [
      pickLanguage(explanationLanguage, "Reactants change into products with new properties.", "अभिकारक बदलकर नए गुणों वाले उत्पाद बनाते हैं।", "ਅਭਿਕਾਰਕ ਬਦਲ ਕੇ ਨਵੇਂ ਗੁਣਾਂ ਵਾਲੇ ਉਤਪਾਦ ਬਣਾਉਂਦੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "Mg stands for magnesium, O2 for oxygen, and MgO for magnesium oxide.", "Mg मैग्नीशियम, O2 ऑक्सीजन और MgO मैग्नीशियम ऑक्साइड को दर्शाता है।", "Mg ਮੈਗਨੀਸ਼ੀਅਮ, O2 ਆਕਸੀਜਨ ਅਤੇ MgO ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ ਨੂੰ ਦਰਸਾਉਂਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "Balanced equations conserve the number of atoms on both sides.", "संतुलित समीकरण दोनों पक्षों पर परमाणुओं की संख्या बराबर रखते हैं।", "ਸੰਤੁਲਿਤ ਸਮੀਕਰਨ ਦੋਵੇਂ ਪਾਸਿਆਂ ਤੇ ਪਰਮਾਣੂਆਂ ਦੀ ਗਿਣਤੀ ਬਰਾਬਰ ਰੱਖਦੇ ਹਨ।")
    ],
    practiceQuestion: pickLanguage(explanationLanguage, "Practice question: Why is 2Mg + O2 -> 2MgO considered a chemical reaction and not a physical change?", "अभ्यास प्रश्न: 2Mg + O2 -> 2MgO को रासायनिक अभिक्रिया क्यों माना जाता है, भौतिक परिवर्तन क्यों नहीं?", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: 2Mg + O2 -> 2MgO ਨੂੰ ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਕਿਉਂ ਮੰਨਿਆ ਜਾਂਦਾ ਹੈ, ਭੌਤਿਕ ਬਦਲਾਅ ਕਿਉਂ ਨਹੀਂ?"),
    diagramInstructions: [
      pickLanguage(boardLanguage, "Starting substances", "प्रारम्भिक पदार्थ", "ਸ਼ੁਰੂਆਤੀ ਪਦਾਰਥ"),
      pickLanguage(boardLanguage, "Reaction / change", "अभिक्रिया / परिवर्तन", "ਕ੍ਰਿਆ / ਬਦਲਾਅ"),
      pickLanguage(boardLanguage, "New substances formed", "नए पदार्थ बने", "ਨਵੇਂ ਪਦਾਰਥ ਬਣੇ")
    ],
    diagramActions: [
      { id: "diagram-box-reactants", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "Reactants", "अभिकारक", "ਅਭਿਕਾਰਕ"), text: pickLanguage(boardLanguage, "Starting substances", "प्रारम्भिक पदार्थ", "ਸ਼ੁਰੂਆਤੀ ਪਦਾਰਥ"), accent: "important" },
      { id: "diagram-arrow-reaction", type: "DRAW_ARROW", lane: "diagram", fromLabel: pickLanguage(boardLanguage, "Reactants", "अभिकारक", "ਅਭਿਕਾਰਕ"), toLabel: pickLanguage(boardLanguage, "Products", "उत्पाद", "ਉਤਪਾਦ"), text: pickLanguage(boardLanguage, "Reaction / change", "अभिक्रिया / परिवर्तन", "ਕ੍ਰਿਆ / ਬਦਲਾਅ") },
      { id: "diagram-box-products", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "Products", "उत्पाद", "ਉਤਪਾਦ"), text: pickLanguage(boardLanguage, "New substances formed", "नए पदार्थ बने", "ਨਵੇਂ ਪਦਾਰਥ ਬਣੇ"), accent: "important" }
    ]
  };
};

const linearEquationLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  const topic = "Linear Equation";
  return {
    boardPayload: {
      boardTitle: boardTitle(topic, boardLanguage),
      boardLines: [
        pickLanguage(boardLanguage, "A linear equation in one variable is an equation in which the highest power of the variable is 1.", "एक चर वाला रैखिक समीकरण वह समीकरण है जिसमें चर की उच्चतम घात 1 होती है।", "ਇੱਕ ਚਰ ਵਾਲਾ ਰੇਖੀ ਸਮੀਕਰਨ ਉਹ ਹੁੰਦਾ ਹੈ ਜਿਸ ਵਿੱਚ ਚਰ ਦੀ ਸਭ ਤੋਂ ਵੱਧ ਘਾਤ 1 ਹੁੰਦੀ ਹੈ।"),
        pickLanguage(boardLanguage, "Its standard form is ax + b = 0 where a is not zero.", "इसका मानक रूप ax + b = 0 है जहाँ a शून्य नहीं होता।", "ਇਸਦਾ ਮਿਆਰੀ ਰੂਪ ax + b = 0 ਹੈ ਜਿੱਥੇ a ਸਿਫਰ ਨਹੀਂ ਹੁੰਦਾ।"),
        pickLanguage(boardLanguage, "The solution is the value of x that makes the equation true.", "हल वह x का मान है जो समीकरण को सत्य बनाता है।", "ਹੱਲ x ਦਾ ਉਹ ਮੂਲ ਹੈ ਜੋ ਸਮੀਕਰਨ ਨੂੰ ਸਹੀ ਬਣਾਉਂਦਾ ਹੈ।")
      ],
      formulas: ["ax + b = 0", "x = -b / a"],
      steps: [
        pickLanguage(boardLanguage, "Example: 2x + 3 = 11", "उदाहरण: 2x + 3 = 11", "ਉਦਾਹਰਨ: 2x + 3 = 11"),
        pickLanguage(boardLanguage, "Subtract 3 from both sides: 2x = 8", "दोनों पक्षों से 3 घटाओ: 2x = 8", "ਦੋਵੇਂ ਪਾਸਿਆਂ ਤੋਂ 3 ਘਟਾਓ: 2x = 8"),
        pickLanguage(boardLanguage, "Divide both sides by 2: x = 4", "दोनों पक्षों को 2 से भाग दो: x = 4", "ਦੋਵੇਂ ਪਾਸਿਆਂ ਨੂੰ 2 ਨਾਲ ਭਾਗ ਦਿਓ: x = 4")
      ],
      exampleTitle: pickLanguage(boardLanguage, "Solved Example", "हल किया उदाहरण", "ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ"),
      exampleSteps: [
        pickLanguage(boardLanguage, "Check the answer by putting x = 4 into 2x + 3.", "उत्तर की जाँच x = 4 को 2x + 3 में रखकर करो।", "ਉੱਤਰ ਦੀ ਜਾਂਚ x = 4 ਨੂੰ 2x + 3 ਵਿੱਚ ਰੱਖ ਕੇ ਕਰੋ।"),
        pickLanguage(boardLanguage, "2(4) + 3 = 8 + 3 = 11, so the answer is correct.", "2(4) + 3 = 8 + 3 = 11, इसलिए उत्तर सही है।", "2(4) + 3 = 8 + 3 = 11, ਇਸ ਲਈ ਉੱਤਰ ਸਹੀ ਹੈ।")
      ]
    },
    noteSpeech: [
      pickLanguage(explanationLanguage, "A linear equation has the variable only to the power one, so its graph is a straight line.", "रैखिक समीकरण में चर की घात केवल एक होती है, इसलिए इसका ग्राफ सीधी रेखा होता है।", "ਰੇਖੀ ਸਮੀਕਰਨ ਵਿੱਚ ਚਰ ਦੀ ਘਾਤ ਸਿਰਫ਼ ਇੱਕ ਹੁੰਦੀ ਹੈ, ਇਸ ਲਈ ਇਸਦਾ ਗ੍ਰਾਫ ਸਿੱਧੀ ਰੇਖਾ ਹੁੰਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "The form ax plus b equals zero helps us see the coefficient and constant clearly.", "ax + b = 0 का रूप हमें गुणांक और स्थिरांक को साफ़ देखने में मदद करता है।", "ax + b = 0 ਦਾ ਰੂਪ ਸਾਨੂੰ ਗੁਣਾਕ ਅਤੇ ਸਥਿਰ ਅੰਕ ਨੂੰ ਸਾਫ਼ ਵੇਖਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "The solution is the value that balances both sides of the equation.", "हल वह मान है जो समीकरण के दोनों पक्षों को बराबर कर देता है।", "ਹੱਲ ਉਹ ਮੂਲ ਹੈ ਜੋ ਸਮੀਕਰਨ ਦੇ ਦੋਵੇਂ ਪਾਸਿਆਂ ਨੂੰ ਸੰਤੁਲਿਤ ਕਰਦਾ ਹੈ।")
    ],
    formulaSpeech: [
      pickLanguage(explanationLanguage, "This is the standard form of a linear equation in one variable.", "यह एक चर वाले रैखिक समीकरण का मानक रूप है।", "ਇਹ ਇੱਕ ਚਰ ਵਾਲੇ ਰੇਖੀ ਸਮੀਕਰਨ ਦਾ ਮਿਆਰੀ ਰੂਪ ਹੈ।"),
      pickLanguage(explanationLanguage, "After moving the constant term, we can divide by the coefficient to find x.", "स्थिरांक को दूसरी ओर ले जाने के बाद हम गुणांक से भाग देकर x ज्ञात करते हैं।", "ਸਥਿਰ ਅੰਕ ਨੂੰ ਦੂਜੇ ਪਾਸੇ ਲਿਜਾਣ ਤੋਂ ਬਾਅਦ ਅਸੀਂ ਗੁਣਾਕ ਨਾਲ ਭਾਗ ਦੇ ਕੇ x ਲੱਭਦੇ ਹਾਂ।")
    ],
    stepSpeech: [
      pickLanguage(explanationLanguage, "Let us start with a simple equation so every algebraic move is clear.", "आओ एक सरल समीकरण से शुरू करें ताकि हर बीजगणितीय कदम स्पष्ट रहे।", "ਆਓ ਇੱਕ ਸੌਖੇ ਸਮੀਕਰਨ ਨਾਲ ਸ਼ੁਰੂ ਕਰੀਏ ਤਾਂ ਜੋ ਹਰ ਬੀਜਗਣਿਤੀ ਕਦਮ ਸਾਫ਼ ਹੋਵੇ।"),
      pickLanguage(explanationLanguage, "We remove the constant term first by subtracting 3 from both sides.", "हम पहले स्थिरांक हटाते हैं और दोनों पक्षों से 3 घटाते हैं।", "ਅਸੀਂ ਪਹਿਲਾਂ ਸਥਿਰ ਅੰਕ ਹਟਾਉਂਦੇ ਹਾਂ ਅਤੇ ਦੋਵੇਂ ਪਾਸਿਆਂ ਤੋਂ 3 ਘਟਾਉਂਦੇ ਹਾਂ।"),
      pickLanguage(explanationLanguage, "Now divide both sides by the coefficient to get the value of x.", "अब गुणांक से दोनों पक्षों को भाग देकर x का मान निकालते हैं।", "ਹੁਣ ਗੁਣਾਕ ਨਾਲ ਦੋਵੇਂ ਪਾਸਿਆਂ ਨੂੰ ਭਾਗ ਦੇ ਕੇ x ਦਾ ਮੂਲ ਕੱਢਦੇ ਹਾਂ।")
    ],
    exampleSpeech: pickLanguage(explanationLanguage, "After solving, always check the answer by substitution.", "हल के बाद उत्तर को प्रतिस्थापन द्वारा अवश्य जाँचो।", "ਹੱਲ ਤੋਂ ਬਾਅਦ ਉੱਤਰ ਦੀ ਜਾਂਚ ਸਥਾਨਾਪਨ ਨਾਲ ਜ਼ਰੂਰ ਕਰੋ।"),
    recapSpeech: pickLanguage(explanationLanguage, "Recap: identify the equation, isolate the variable step by step, and finally verify the answer.", "पुनरावृत्ति: समीकरण पहचानो, चर को चरणबद्ध तरीके से अलग करो और अंत में उत्तर जाँचो।", "ਦੁਹਰਾਈ: ਸਮੀਕਰਨ ਪਛਾਣੋ, ਚਰ ਨੂੰ ਕਦਮ ਦਰ ਕਦਮ ਅਲੱਗ ਕਰੋ ਅਤੇ ਅੰਤ ਵਿੱਚ ਉੱਤਰ ਦੀ ਜਾਂਚ ਕਰੋ।"),
    recapBoardText: pickLanguage(boardLanguage, "Remember: move the constant, divide by the coefficient, then check the answer.", "याद रखो: स्थिरांक हटाओ, गुणांक से भाग दो, फिर उत्तर जाँचो।", "ਯਾਦ ਰੱਖੋ: ਸਥਿਰ ਅੰਕ ਹਟਾਓ, ਗੁਣਾਕ ਨਾਲ ਭਾਗ ਦਿਓ, ਫਿਰ ਉੱਤਰ ਦੀ ਜਾਂਚ ਕਰੋ।"),
    recapPoints: [
      pickLanguage(explanationLanguage, "A linear equation has variable power 1.", "रैखिक समीकरण में चर की घात 1 होती है।", "ਰੇਖੀ ਸਮੀਕਰਨ ਵਿੱਚ ਚਰ ਦੀ ਘਾਤ 1 ਹੁੰਦੀ ਹੈ।"),
      pickLanguage(explanationLanguage, "Standard form is ax + b = 0.", "मानक रूप ax + b = 0 है।", "ਮਿਆਰੀ ਰੂਪ ax + b = 0 ਹੈ।"),
      pickLanguage(explanationLanguage, "Solve by isolating the variable and then checking the answer.", "चर को अलग करके हल करो और फिर उत्तर जाँचो।", "ਚਰ ਨੂੰ ਅਲੱਗ ਕਰਕੇ ਹੱਲ ਕਰੋ ਅਤੇ ਫਿਰ ਉੱਤਰ ਦੀ ਜਾਂਚ ਕਰੋ।")
    ],
    practiceQuestion: pickLanguage(explanationLanguage, "Practice question: Solve 3x + 5 = 17 and check your answer.", "अभ्यास प्रश्न: 3x + 5 = 17 हल करो और उत्तर जाँचो।", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: 3x + 5 = 17 ਹੱਲ ਕਰੋ ਅਤੇ ਉੱਤਰ ਦੀ ਜਾਂਚ ਕਰੋ।"),
    diagramInstructions: [
      pickLanguage(boardLanguage, "Given equation", "दिया गया समीकरण", "ਦਿੱਤਾ ਸਮੀਕਰਨ"),
      pickLanguage(boardLanguage, "Apply rule", "नियम लगाओ", "ਨਿਯਮ ਲਗਾਓ"),
      pickLanguage(boardLanguage, "Find solution", "हल निकालो", "ਹੱਲ ਕੱਢੋ")
    ],
    diagramActions: [
      { id: "diagram-box-given", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "Given", "दिया गया", "ਦਿੱਤਾ"), text: pickLanguage(boardLanguage, "Given equation", "दिया गया समीकरण", "ਦਿੱਤਾ ਸਮੀਕਰਨ"), accent: "important" },
      { id: "diagram-arrow-rule", type: "DRAW_ARROW", lane: "diagram", fromLabel: pickLanguage(boardLanguage, "Given", "दिया गया", "ਦਿੱਤਾ"), toLabel: pickLanguage(boardLanguage, "Rule", "नियम", "ਨਿਯਮ"), text: pickLanguage(boardLanguage, "Apply rule", "नियम लगाओ", "ਨਿਯਮ ਲਗਾਓ") },
      { id: "diagram-box-solve", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "Solve", "हल", "ਹੱਲ"), text: pickLanguage(boardLanguage, "Find solution", "हल निकालो", "ਹੱਲ ਕੱਢੋ"), accent: "important" }
    ]
  };
};

const fractionLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  const topic = localizedTopicLabel("Fractions", "भिन्न", "ਭਿੰਨ", boardLanguage);
  return {
    boardPayload: {
      boardTitle: shortBoardTitle(topic, boardLanguage),
      boardLines: [
        pickLanguage(boardLanguage, "A fraction shows equal parts of a whole.", "भिन्न किसी पूरे के बराबर भागों को दिखाती है।", "ਭਿੰਨ ਕਿਸੇ ਪੂਰੀ ਵਸਤੂ ਦੇ ਬਰਾਬਰ ਹਿੱਸਿਆਂ ਨੂੰ ਦਰਸਾਉਂਦੀ ਹੈ।"),
        pickLanguage(boardLanguage, "Numerator = number of parts taken; denominator = total equal parts.", "अंश = लिए गए भाग; हर = कुल बराबर भाग।", "ਅੰਸ਼ = ਲਏ ਗਏ ਹਿੱਸੇ; ਹਰ = ਕੁੱਲ ਬਰਾਬਰ ਹਿੱਸੇ।"),
        pickLanguage(boardLanguage, "Example: 3/4 means 4 equal parts in all and 3 parts taken.", "उदाहरण: 3/4 में कुल 4 बराबर भाग होते हैं और 3 भाग लिए जाते हैं।", "ਉਦਾਹਰਨ: 3/4 ਵਿੱਚ ਕੁੱਲ 4 ਬਰਾਬਰ ਹਿੱਸੇ ਹੁੰਦੇ ਹਨ ਅਤੇ 3 ਹਿੱਸੇ ਲਏ ਜਾਂਦੇ ਹਨ।"),
      ],
      formulas: [
        pickLanguage(boardLanguage, "Fraction = numerator / denominator", "भिन्न = अंश / हर", "ਭਿੰਨ = ਅੰਸ਼ / ਹਰ"),
      ],
      steps: [
        pickLanguage(boardLanguage, "Read the denominator first: how many equal parts are made.", "पहले हर पढ़ो: पूरे को कितने बराबर भागों में बाँटा गया है।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਹਰ ਪੜ੍ਹੋ: ਪੂਰੀ ਵਸਤੂ ਨੂੰ ਕਿੰਨੇ ਬਰਾਬਰ ਹਿੱਸਿਆਂ ਵਿੱਚ ਵੰਡਿਆ ਗਿਆ ਹੈ।"),
        pickLanguage(boardLanguage, "Then read the numerator: how many parts are taken.", "फिर अंश पढ़ो: उनमें से कितने भाग लिए गए हैं।", "ਫਿਰ ਅੰਸ਼ ਪੜ੍ਹੋ: ਉਨ੍ਹਾਂ ਵਿੱਚੋਂ ਕਿੰਨੇ ਹਿੱਸੇ ਲਏ ਗਏ ਹਨ।"),
        pickLanguage(boardLanguage, "Write the fraction and explain it with a picture or object.", "भिन्न लिखो और उसे चित्र या वस्तु से समझाओ।", "ਭਿੰਨ ਲਿਖੋ ਅਤੇ ਉਸਨੂੰ ਚਿੱਤਰ ਜਾਂ ਵਸਤੂ ਨਾਲ ਸਮਝਾਓ।"),
      ],
      exampleTitle: pickLanguage(boardLanguage, "Worked Example", "हल किया उदाहरण", "ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ"),
      exampleSteps: [
        pickLanguage(boardLanguage, "A pizza is cut into 8 equal pieces.", "एक पिज़्ज़ा 8 बराबर टुकड़ों में काटा गया।", "ਇੱਕ ਪਿਜ਼ਾ 8 ਬਰਾਬਰ ਟੁਕੜਿਆਂ ਵਿੱਚ ਕੱਟਿਆ ਗਿਆ।"),
        pickLanguage(boardLanguage, "If 3 pieces are eaten, the fraction eaten is 3/8.", "यदि 3 टुकड़े खाए गए, तो खाया गया भाग 3/8 होगा।", "ਜੇ 3 ਟੁਕੜੇ ਖਾਏ ਗਏ, ਤਾਂ ਖਾਇਆ ਗਿਆ ਭਾਗ 3/8 ਹੋਵੇਗਾ।"),
        pickLanguage(boardLanguage, "Here 3 is the numerator and 8 is the denominator.", "यहाँ 3 अंश है और 8 हर है।", "ਇੱਥੇ 3 ਅੰਸ਼ ਹੈ ਅਤੇ 8 ਹਰ ਹੈ।"),
      ],
    },
    noteSpeech: [
      pickLanguage(explanationLanguage, "Fractions tell us how much of a whole has been taken or shaded.", "भिन्न हमें बताती है कि पूरे में से कितना भाग लिया गया है।", "ਭਿੰਨ ਸਾਨੂੰ ਦੱਸਦੀ ਹੈ ਕਿ ਪੂਰੀ ਚੀਜ਼ ਵਿੱਚੋਂ ਕਿੰਨਾ ਹਿੱਸਾ ਲਿਆ ਗਿਆ ਹੈ।"),
      pickLanguage(explanationLanguage, "In every fraction, the numerator and denominator have different jobs, so we must read both carefully.", "हर भिन्न में अंश और हर का काम अलग होता है, इसलिए दोनों को ध्यान से पढ़ना चाहिए।", "ਹਰ ਭਿੰਨ ਵਿੱਚ ਅੰਸ਼ ਅਤੇ ਹਰ ਦਾ ਕੰਮ ਵੱਖਰਾ ਹੁੰਦਾ ਹੈ, ਇਸ ਲਈ ਦੋਵੇਂ ਨੂੰ ਧਿਆਨ ਨਾਲ ਪੜ੍ਹਨਾ ਚਾਹੀਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "If the parts are equal, then the fraction is meaningful and correct.", "यदि भाग बराबर हों, तभी भिन्न सही अर्थ देती है।", "ਜੇ ਹਿੱਸੇ ਬਰਾਬਰ ਹੋਣ, ਤਦੋਂ ਹੀ ਭਿੰਨ ਸਹੀ ਅਰਥ ਦਿੰਦੀ ਹੈ।"),
    ],
    formulaSpeech: [
      pickLanguage(explanationLanguage, "This simple form reminds us that the numerator is written above and the denominator below.", "यह रूप याद दिलाता है कि अंश ऊपर और हर नीचे लिखा जाता है।", "ਇਹ ਰੂਪ ਯਾਦ ਦਿਵਾਉਂਦਾ ਹੈ ਕਿ ਅੰਸ਼ ਉੱਪਰ ਅਤੇ ਹਰ ਹੇਠਾਂ ਲਿਖਿਆ ਜਾਂਦਾ ਹੈ।"),
    ],
    stepSpeech: [
      pickLanguage(explanationLanguage, "First understand into how many equal parts the whole has been divided.", "सबसे पहले यह समझो कि पूरा कितने बराबर भागों में बाँटा गया है।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਇਹ ਸਮਝੋ ਕਿ ਪੂਰੀ ਚੀਜ਼ ਕਿੰਨੇ ਬਰਾਬਰ ਹਿੱਸਿਆਂ ਵਿੱਚ ਵੰਡੀ ਗਈ ਹੈ।"),
      pickLanguage(explanationLanguage, "Now see how many of those equal parts have been taken.", "अब देखो कि उन बराबर भागों में से कितने भाग लिए गए हैं।", "ਹੁਣ ਵੇਖੋ ਕਿ ਉਨ੍ਹਾਂ ਬਰਾਬਰ ਹਿੱਸਿਆਂ ਵਿੱਚੋਂ ਕਿੰਨੇ ਹਿੱਸੇ ਲਏ ਗਏ ਹਨ।"),
      pickLanguage(explanationLanguage, "Then write the fraction and explain it with an object-based example.", "फिर भिन्न को लिखो और किसी वस्तु के उदाहरण से समझाओ।", "ਫਿਰ ਭਿੰਨ ਨੂੰ ਲਿਖੋ ਅਤੇ ਕਿਸੇ ਵਸਤੂ ਦੇ ਉਦਾਹਰਨ ਨਾਲ ਸਮਝਾਓ।"),
    ],
    exampleSpeech: pickLanguage(explanationLanguage, "Let us use a pizza example, because fractions become much clearer when we see equal parts.", "आओ पिज़्ज़ा का उदाहरण लें, क्योंकि बराबर भाग देखकर भिन्न तुरंत समझ में आती है।", "ਆਓ ਪਿਜ਼ਾ ਦਾ ਉਦਾਹਰਨ ਲਈਏ, ਕਿਉਂਕਿ ਬਰਾਬਰ ਹਿੱਸੇ ਵੇਖਣ ਨਾਲ ਭਿੰਨ ਤੁਰੰਤ ਸਮਝ ਆ ਜਾਂਦੀ ਹੈ।"),
    recapSpeech: pickLanguage(explanationLanguage, "Recap: a fraction has a numerator, a denominator, and it always represents equal parts of a whole.", "पुनरावृत्ति: भिन्न में अंश और हर होते हैं, और यह हमेशा पूरे के बराबर भाग दिखाती है।", "ਦੁਹਰਾਈ: ਭਿੰਨ ਵਿੱਚ ਅੰਸ਼ ਅਤੇ ਹਰ ਹੁੰਦੇ ਹਨ ਅਤੇ ਇਹ ਹਮੇਸ਼ਾ ਪੂਰੀ ਚੀਜ਼ ਦੇ ਬਰਾਬਰ ਹਿੱਸੇ ਦਰਸਾਂਦੀ ਹੈ।"),
    recapBoardText: pickLanguage(boardLanguage, "Remember: denominator = total parts, numerator = parts taken.", "याद रखो: हर = कुल भाग, अंश = लिए गए भाग।", "ਯਾਦ ਰੱਖੋ: ਹਰ = ਕੁੱਲ ਹਿੱਸੇ, ਅੰਸ਼ = ਲਏ ਗਏ ਹਿੱਸੇ।"),
    recapPoints: [
      pickLanguage(explanationLanguage, "A fraction represents equal parts of a whole.", "भिन्न पूरे के बराबर भागों को दिखाती है।", "ਭਿੰਨ ਪੂਰੀ ਚੀਜ਼ ਦੇ ਬਰਾਬਰ ਹਿੱਸਿਆਂ ਨੂੰ ਦਰਸਾਂਦੀ ਹੈ।"),
      pickLanguage(explanationLanguage, "The numerator tells how many parts are taken.", "अंश बताता है कितने भाग लिए गए हैं।", "ਅੰਸ਼ ਦੱਸਦਾ ਹੈ ਕਿ ਕਿੰਨੇ ਹਿੱਸੇ ਲਏ ਗਏ ਹਨ।"),
      pickLanguage(explanationLanguage, "The denominator tells the total number of equal parts.", "हर बताता है कुल कितने बराबर भाग बने हैं।", "ਹਰ ਦੱਸਦਾ ਹੈ ਕਿ ਕੁੱਲ ਕਿੰਨੇ ਬਰਾਬਰ ਹਿੱਸੇ ਬਣੇ ਹਨ।"),
    ],
    practiceQuestion: pickLanguage(explanationLanguage, "Practice question: A chocolate bar is divided into 6 equal parts. If 4 parts are eaten, write the fraction eaten and name its numerator and denominator.", "अभ्यास प्रश्न: एक चॉकलेट 6 बराबर भागों में बाँटी गई है। यदि 4 भाग खा लिए जाएँ, तो खाया गया भिन्न रूप लिखो और उसका अंश व हर बताओ।", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਇੱਕ ਚਾਕਲੇਟ 6 ਬਰਾਬਰ ਹਿੱਸਿਆਂ ਵਿੱਚ ਵੰਡੀ ਗਈ ਹੈ। ਜੇ 4 ਹਿੱਸੇ ਖਾ ਲਏ ਜਾਣ, ਤਾਂ ਖਾਧੇ ਭਾਗ ਦੀ ਭਿੰਨ ਲਿਖੋ ਅਤੇ ਉਸ ਦਾ ਅੰਸ਼ ਤੇ ਹਰ ਦੱਸੋ।"),
    diagramInstructions: [
      pickLanguage(boardLanguage, "Show the whole.", "पूरा दिखाओ।", "ਪੂਰੀ ਵਸਤੂ ਦਿਖਾਓ।"),
      pickLanguage(boardLanguage, "Divide it into equal parts.", "उसे बराबर भागों में बाँटो।", "ਇਸਨੂੰ ਬਰਾਬਰ ਹਿੱਸਿਆਂ ਵਿੱਚ ਵੰਡੋ।"),
      pickLanguage(boardLanguage, "Mark the parts taken.", "लिए गए भाग चिन्हित करो।", "ਲਏ ਗਏ ਹਿੱਸੇ ਨਿਸ਼ਾਨਿਤ ਕਰੋ।"),
    ],
    diagramActions: [
      {
        id: "diagram-box-whole",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Whole", "पूरा", "ਪੂਰਾ"),
        text: pickLanguage(boardLanguage, "1 complete object", "1 पूरी वस्तु", "1 ਪੂਰੀ ਵਸਤੂ"),
        accent: "important",
      },
      {
        id: "diagram-arrow-divide",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: pickLanguage(boardLanguage, "Whole", "पूरा", "ਪੂਰਾ"),
        toLabel: pickLanguage(boardLanguage, "Equal parts", "बराबर भाग", "ਬਰਾਬਰ ਹਿੱਸੇ"),
        text: pickLanguage(boardLanguage, "Divide equally", "बराबर बाँटो", "ਬਰਾਬਰ ਵੰਡੋ"),
      },
      {
        id: "diagram-box-parts",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Equal parts", "बराबर भाग", "ਬਰਾਬਰ ਹਿੱਸੇ"),
        text: pickLanguage(boardLanguage, "Example: 8 equal pieces", "उदाहरण: 8 बराबर भाग", "ਉਦਾਹਰਨ: 8 ਬਰਾਬਰ ਹਿੱਸੇ"),
      },
      {
        id: "diagram-box-selected",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Taken part", "लिया गया भाग", "ਲਿਆ ਗਿਆ ਹਿੱਸਾ"),
        text: pickLanguage(boardLanguage, "Example: 3 pieces = 3/8", "उदाहरण: 3 भाग = 3/8", "ਉਦਾਹਰਨ: 3 ਹਿੱਸੇ = 3/8"),
        accent: "example",
      },
    ],
  };
};

const photosynthesisLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  const topic = localizedTopicLabel("Photosynthesis", "प्रकाश-संश्लेषण", "ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ", boardLanguage);
  return {
    boardPayload: {
      boardTitle: shortBoardTitle(topic, boardLanguage),
      boardLines: [
        pickLanguage(boardLanguage, "Photosynthesis is the process by which green plants make their own food.", "प्रकाश-संश्लेषण वह प्रक्रिया है जिससे हरे पौधे अपना भोजन बनाते हैं।", "ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਉਹ ਪ੍ਰਕਿਰਿਆ ਹੈ ਜਿਸ ਨਾਲ ਹਰੇ ਪੌਦੇ ਆਪਣਾ ਭੋਜਨ ਬਣਾਉਂਦੇ ਹਨ।"),
        pickLanguage(boardLanguage, "Plants use sunlight, water, carbon dioxide, and chlorophyll.", "इसमें सूर्य का प्रकाश, जल, कार्बन डाइऑक्साइड और क्लोरोफिल की आवश्यकता होती है।", "ਇਸ ਵਿੱਚ ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼, ਜਲ, ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ ਅਤੇ ਕਲੋਰੋਫ਼ਿਲ ਦੀ ਲੋੜ ਹੁੰਦੀ ਹੈ।"),
        pickLanguage(boardLanguage, "Food is made as glucose and oxygen is released.", "इस प्रक्रिया में ग्लूकोज़ बनता है और ऑक्सीजन बाहर निकलती है।", "ਇਸ ਪ੍ਰਕਿਰਿਆ ਵਿੱਚ ਗਲੂਕੋਜ਼ ਬਣਦਾ ਹੈ ਅਤੇ ਆਕਸੀਜਨ ਬਾਹਰ ਨਿਕਲਦੀ ਹੈ।"),
      ],
      formulas: [
        pickLanguage(boardLanguage, "Carbon dioxide + Water --sunlight/chlorophyll--> Glucose + Oxygen", "कार्बन डाइऑक्साइड + जल --सूर्यप्रकाश/क्लोरोफिल--> ग्लूकोज़ + ऑक्सीजन", "ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ + ਜਲ --ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼/ਕਲੋਰੋਫ਼ਿਲ--> ਗਲੂਕੋਜ਼ + ਆਕਸੀਜਨ"),
      ],
      steps: [
        pickLanguage(boardLanguage, "Roots absorb water from the soil.", "जड़ें मिट्टी से जल लेती हैं।", "ਜੜਾਂ ਮਿੱਟੀ ਵਿੱਚੋਂ ਜਲ ਲੈਂਦੀਆਂ ਹਨ।"),
        pickLanguage(boardLanguage, "Leaves take in carbon dioxide and trap sunlight with chlorophyll.", "पत्तियाँ कार्बन डाइऑक्साइड लेती हैं और क्लोरोफिल की सहायता से सूर्यप्रकाश ग्रहण करती हैं।", "ਪੱਤੀਆਂ ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ ਲੈਂਦੀਆਂ ਹਨ ਅਤੇ ਕਲੋਰੋਫ਼ਿਲ ਦੀ ਮਦਦ ਨਾਲ ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼ ਫੜਦੀਆਂ ਹਨ।"),
        pickLanguage(boardLanguage, "The plant prepares food and releases oxygen.", "पौधा भोजन बनाता है और ऑक्सीजन छोड़ता है।", "ਪੌਦਾ ਭੋਜਨ ਬਣਾਉਂਦਾ ਹੈ ਅਤੇ ਆਕਸੀਜਨ ਛੱਡਦਾ ਹੈ।"),
      ],
      exampleTitle: pickLanguage(boardLanguage, "Worked Example", "हल किया उदाहरण", "ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ"),
      exampleSteps: [
        pickLanguage(boardLanguage, "Keep one potted plant in sunlight and another in darkness.", "एक गमले वाले पौधे को धूप में और दूसरे को अँधेरे में रखो।", "ਇੱਕ ਗਮਲੇ ਵਾਲੇ ਪੌਦੇ ਨੂੰ ਧੁੱਪ ਵਿੱਚ ਅਤੇ ਦੂਜੇ ਨੂੰ ਹਨੇਰੇ ਵਿੱਚ ਰੱਖੋ।"),
        pickLanguage(boardLanguage, "The plant kept in sunlight can prepare starch in its leaves.", "धूप वाला पौधा पत्तियों में स्टार्च बना पाता है।", "ਧੁੱਪ ਵਾਲਾ ਪੌਦਾ ਪੱਤੀਆਂ ਵਿੱਚ ਸਟਾਰਚ ਬਣਾਉਂਦਾ ਹੈ।"),
        pickLanguage(boardLanguage, "This shows that sunlight is necessary for photosynthesis.", "इससे सिद्ध होता है कि प्रकाश-संश्लेषण के लिए सूर्यप्रकाश आवश्यक है।", "ਇਸ ਨਾਲ ਸਾਬਤ ਹੁੰਦਾ ਹੈ ਕਿ ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਲਈ ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼ ਜ਼ਰੂਰੀ ਹੈ।"),
      ],
    },
    noteSpeech: [
      pickLanguage(explanationLanguage, "Photosynthesis is the food-making process of green plants.", "प्रकाश-संश्लेषण हरे पौधों में भोजन बनने की प्रक्रिया है।", "ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਹਰੇ ਪੌਦਿਆਂ ਵਿੱਚ ਭੋਜਨ ਬਣਨ ਦੀ ਪ੍ਰਕਿਰਿਆ ਹੈ।"),
      pickLanguage(explanationLanguage, "Plants do not get ready-made food from outside. They prepare it in their leaves.", "पौधे बाहर से तैयार भोजन नहीं लेते। वे अपनी पत्तियों में भोजन बनाते हैं।", "ਪੌਦੇ ਬਾਹਰੋਂ ਤਿਆਰ ਭੋਜਨ ਨਹੀਂ ਲੈਂਦੇ। ਉਹ ਆਪਣੀਆਂ ਪੱਤੀਆਂ ਵਿੱਚ ਭੋਜਨ ਬਣਾਉਂਦੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "For this process, sunlight, water, carbon dioxide, and chlorophyll are all necessary.", "इस प्रक्रिया के लिए सूर्यप्रकाश, जल, कार्बन डाइऑक्साइड और क्लोरोफिल सभी आवश्यक हैं।", "ਇਸ ਪ੍ਰਕਿਰਿਆ ਲਈ ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼, ਜਲ, ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ ਅਤੇ ਕਲੋਰੋਫ਼ਿਲ ਸਭ ਲਾਜ਼ਮੀ ਹਨ।"),
    ],
    formulaSpeech: [
      pickLanguage(explanationLanguage, "This equation shows the raw materials needed and the products formed during photosynthesis.", "यह समीकरण बताता है कि प्रकाश-संश्लेषण में कौन-कौन से पदार्थ लगते हैं और क्या बनता है।", "ਇਹ ਸਮੀਕਰਨ ਦੱਸਦਾ ਹੈ ਕਿ ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਵਿੱਚ ਕਿਹੜੇ ਪਦਾਰਥ ਲੱਗਦੇ ਹਨ ਅਤੇ ਕੀ ਬਣਦਾ ਹੈ।"),
    ],
    stepSpeech: [
      pickLanguage(explanationLanguage, "सबसे पहले जड़ें मिट्टी से जल लेती हैं।", "सबसे पहले जड़ें मिट्टी से जल लेती हैं।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਜੜਾਂ ਮਿੱਟੀ ਵਿੱਚੋਂ ਜਲ ਲੈਂਦੀਆਂ ਹਨ।"),
      pickLanguage(explanationLanguage, "फिर पत्तियाँ कार्बन डाइऑक्साइड लेती हैं और क्लोरोफिल सूर्यप्रकाश को ग्रहण करता है।", "फिर पत्तियाँ कार्बन डाइऑक्साइड लेती हैं और क्लोरोफिल सूर्यप्रकाश को ग्रहण करता है।", "ਫਿਰ ਪੱਤੀਆਂ ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ ਲੈਂਦੀਆਂ ਹਨ ਅਤੇ ਕਲੋਰੋਫ਼ਿਲ ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼ ਨੂੰ ਫੜਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "इन सबकी सहायता से पौधा ग्लूकोज़ बनाता है और ऑक्सीजन छोड़ता है।", "इन सबकी सहायता से पौधा ग्लूकोज़ बनाता है और ऑक्सीजन छोड़ता है।", "ਇਨ੍ਹਾਂ ਸਭ ਦੀ ਮਦਦ ਨਾਲ ਪੌਦਾ ਗਲੂਕੋਜ਼ ਬਣਾਉਂਦਾ ਹੈ ਅਤੇ ਆਕਸੀਜਨ ਛੱਡਦਾ ਹੈ।"),
    ],
    exampleSpeech: pickLanguage(explanationLanguage, "A simple sunlight experiment helps us understand this process very clearly.", "धूप वाला एक सरल प्रयोग इस प्रक्रिया को बहुत साफ़ ढंग से समझाता है।", "ਧੁੱਪ ਵਾਲਾ ਇੱਕ ਸੌਖਾ ਪ੍ਰਯੋਗ ਇਸ ਪ੍ਰਕਿਰਿਆ ਨੂੰ ਬਹੁਤ ਸਾਫ਼ ਢੰਗ ਨਾਲ ਸਮਝਾਉਂਦਾ ਹੈ।"),
    recapSpeech: pickLanguage(explanationLanguage, "Recap: during photosynthesis, green plants use sunlight, water, and carbon dioxide to make food and release oxygen.", "पुनरावृत्ति: प्रकाश-संश्लेषण में हरे पौधे सूर्यप्रकाश, जल और कार्बन डाइऑक्साइड की सहायता से भोजन बनाते हैं और ऑक्सीजन छोड़ते हैं।", "ਦੁਹਰਾਈ: ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਵਿੱਚ ਹਰੇ ਪੌਦੇ ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼, ਜਲ ਅਤੇ ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ ਦੀ ਮਦਦ ਨਾਲ ਭੋਜਨ ਬਣਾਉਂਦੇ ਹਨ ਅਤੇ ਆਕਸੀਜਨ ਛੱਡਦੇ ਹਨ।"),
    recapBoardText: pickLanguage(boardLanguage, "Remember: sunlight + water + carbon dioxide -> food + oxygen", "याद रखो: सूर्यप्रकाश + जल + कार्बन डाइऑक्साइड -> भोजन + ऑक्सीजन", "ਯਾਦ ਰੱਖੋ: ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼ + ਜਲ + ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ -> ਭੋਜਨ + ਆਕਸੀਜਨ"),
    recapPoints: [
      pickLanguage(explanationLanguage, "प्रकाश-संश्लेषण पौधों में भोजन बनने की प्रक्रिया है।", "प्रकाश-संश्लेषण पौधों में भोजन बनने की प्रक्रिया है।", "ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਪੌਦਿਆਂ ਵਿੱਚ ਭੋਜਨ ਬਣਨ ਦੀ ਪ੍ਰਕਿਰਿਆ ਹੈ।"),
      pickLanguage(explanationLanguage, "क्लोरोफिल और सूर्यप्रकाश इसके लिए आवश्यक हैं।", "क्लोरोफिल और सूर्यप्रकाश इसके लिए आवश्यक हैं।", "ਕਲੋਰੋਫ਼ਿਲ ਅਤੇ ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼ ਇਸ ਲਈ ਲਾਜ਼ਮੀ ਹਨ।"),
      pickLanguage(explanationLanguage, "इस प्रक्रिया में ग्लूकोज़ बनता है और ऑक्सीजन निकलती है।", "इस प्रक्रिया में ग्लूकोज़ बनता है और ऑक्सीजन निकलती है।", "ਇਸ ਪ੍ਰਕਿਰਿਆ ਵਿੱਚ ਗਲੂਕੋਜ਼ ਬਣਦਾ ਹੈ ਅਤੇ ਆਕਸੀਜਨ ਨਿਕਲਦੀ ਹੈ।"),
    ],
    practiceQuestion: pickLanguage(explanationLanguage, "Practice question: Why is sunlight necessary for photosynthesis? Write the answer in two or three clear lines.", "अभ्यास प्रश्न: प्रकाश-संश्लेषण के लिए सूर्यप्रकाश क्यों आवश्यक है? दो या तीन स्पष्ट पंक्तियों में उत्तर लिखो।", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਲਈ ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼ ਕਿਉਂ ਜ਼ਰੂਰੀ ਹੈ? ਦੋ ਜਾਂ ਤਿੰਨ ਸਾਫ਼ ਲਾਈਨਾਂ ਵਿੱਚ ਉੱਤਰ ਲਿਖੋ।"),
    diagramInstructions: [
      pickLanguage(boardLanguage, "Write the raw materials.", "कच्चे पदार्थ लिखो।", "ਕੱਚੇ ਪਦਾਰਥ ਲਿਖੋ।"),
      pickLanguage(boardLanguage, "Show sunlight and chlorophyll over the process arrow.", "प्रक्रिया के तीर पर सूर्यप्रकाश और क्लोरोफिल लिखो।", "ਪ੍ਰਕਿਰਿਆ ਵਾਲੇ ਤੀਰ ਉੱਪਰ ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼ ਅਤੇ ਕਲੋਰੋਫ਼ਿਲ ਲਿਖੋ।"),
      pickLanguage(boardLanguage, "Write the food and oxygen formed.", "बने हुए भोजन और ऑक्सीजन लिखो।", "ਬਣਿਆ ਭੋਜਨ ਅਤੇ ਆਕਸੀਜਨ ਲਿਖੋ।"),
    ],
    diagramActions: [
      {
        id: "diagram-box-input",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Input", "इनपुट", "ਇਨਪੁੱਟ"),
        text: pickLanguage(boardLanguage, "Water + Carbon dioxide", "जल + कार्बन डाइऑक्साइड", "ਜਲ + ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ"),
        accent: "important",
      },
      {
        id: "diagram-arrow-process",
        type: "DRAW_ARROW",
        lane: "diagram",
        fromLabel: pickLanguage(boardLanguage, "Input", "इनपुट", "ਇਨਪੁੱਟ"),
        toLabel: pickLanguage(boardLanguage, "Output", "आउटपुट", "ਆਉਟਪੁੱਟ"),
        text: pickLanguage(boardLanguage, "Sunlight + chlorophyll", "सूर्यप्रकाश + क्लोरोफिल", "ਸੂਰਜੀ ਪ੍ਰਕਾਸ਼ + ਕਲੋਰੋਫ਼ਿਲ"),
      },
      {
        id: "diagram-box-output",
        type: "DRAW_BOX",
        lane: "diagram",
        label: pickLanguage(boardLanguage, "Output", "आउटपुट", "ਆਉਟਪੁੱਟ"),
        text: pickLanguage(boardLanguage, "Glucose + Oxygen", "ग्लूकोज़ + ऑक्सीजन", "ਗਲੂਕੋਜ਼ + ਆਕਸੀਜਨ"),
        accent: "important",
      },
    ],
  };
};

const numberLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const topic = "ਵਚਨ";
  return {
    boardPayload: {
      boardTitle: shortBoardTitle(topic, boardLanguage),
      boardLines: [
        "ਵਚਨ ਨਾਲ ਪਤਾ ਲੱਗਦਾ ਹੈ ਕਿ ਗਿਣਤੀ ਇੱਕ ਹੈ ਜਾਂ ਇੱਕ ਤੋਂ ਵੱਧ ਹੈ।",
        "ਪੰਜਾਬੀ ਵਿਆਕਰਣ ਵਿੱਚ ਵਚਨ ਦੇ ਦੋ ਰੂਪ ਹਨ: ਇਕਵਚਨ ਅਤੇ ਬਹੁਵਚਨ।",
        "ਉਦਾਹਰਨ: ਮੁੰਡਾ -> ਮੁੰਡੇ, ਕਿਤਾਬ -> ਕਿਤਾਬਾਂ।"
      ],
      formulas: ["ਇਕਵਚਨ -> ਇੱਕ ਵਿਅਕਤੀ ਜਾਂ ਚੀਜ਼", "ਬਹੁਵਚਨ -> ਇੱਕ ਤੋਂ ਵੱਧ ਵਿਅਕਤੀ ਜਾਂ ਚੀਜ਼ਾਂ"],
      steps: [
        "ਪਹਿਲਾਂ ਵੇਖੋ ਕਿ ਗੱਲ ਇੱਕ ਦੀ ਹੋ ਰਹੀ ਹੈ ਜਾਂ ਕਈਆਂ ਦੀ।",
        "ਇੱਕ ਲਈ ਇਕਵਚਨ ਅਤੇ ਇੱਕ ਤੋਂ ਵੱਧ ਲਈ ਬਹੁਵਚਨ ਲਿਖੋ।",
        "ਫਿਰ ਸ਼ਬਦ ਨੂੰ ਵਾਕ ਵਿੱਚ ਸਹੀ ਰੂਪ ਨਾਲ ਵਰਤੋ।"
      ],
      exampleTitle: "ਵਚਨ ਉਦਾਹਰਨ",
      exampleSteps: [
        "ਇਕਵਚਨ: ਬੱਚਾ ਸਕੂਲ ਜਾਂਦਾ ਹੈ।",
        "ਬਹੁਵਚਨ: ਬੱਚੇ ਸਕੂਲ ਜਾਂਦੇ ਹਨ।",
        "ਇਕਵਚਨ: ਕਿਤਾਬ ਮੇਜ਼ 'ਤੇ ਪਈ ਹੈ। ਬਹੁਵਚਨ: ਕਿਤਾਬਾਂ ਮੇਜ਼ 'ਤੇ ਪਈਆਂ ਹਨ।"
      ]
    },
    noteSpeech: [
      "ਵਚਨ ਸਾਨੂੰ ਦੱਸਦਾ ਹੈ ਕਿ ਕੋਈ ਨਾਮ ਜਾਂ ਸਰਵਨਾਮ ਇੱਕ ਹੈ ਜਾਂ ਇੱਕ ਤੋਂ ਵੱਧ ਹੈ।",
      "ਜਦੋਂ ਗੱਲ ਇੱਕ ਵਿਅਕਤੀ, ਇੱਕ ਚੀਜ਼ ਜਾਂ ਇੱਕ ਥਾਂ ਦੀ ਹੋਵੇ, ਅਸੀਂ ਇਕਵਚਨ ਵਰਤਦੇ ਹਾਂ।",
      "ਜਦੋਂ ਗੱਲ ਕਈ ਵਿਅਕਤੀਆਂ ਜਾਂ ਕਈ ਚੀਜ਼ਾਂ ਦੀ ਹੋਵੇ, ਅਸੀਂ ਬਹੁਵਚਨ ਵਰਤਦੇ ਹਾਂ।"
    ],
    formulaSpeech: [
      "ਇਕਵਚਨ ਦਾ ਮਤਲਬ ਇੱਕ ਹੁੰਦਾ ਹੈ।",
      "ਬਹੁਵਚਨ ਦਾ ਮਤਲਬ ਇੱਕ ਤੋਂ ਵੱਧ ਹੁੰਦਾ ਹੈ।"
    ],
    stepSpeech: [
      "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਇਹ ਪਛਾਣੋ ਕਿ ਗਿਣਤੀ ਇੱਕ ਹੈ ਜਾਂ ਵੱਧ ਹੈ।",
      "ਹੁਣ ਉਸ ਦੇ ਅਨੁਸਾਰ ਇਕਵਚਨ ਜਾਂ ਬਹੁਵਚਨ ਰੂਪ ਚੁਣੋ।",
      "ਅੰਤ ਵਿੱਚ ਸ਼ਬਦ ਨੂੰ ਵਾਕ ਵਿੱਚ ਰੱਖ ਕੇ ਦੇਖੋ ਕਿ ਵਰਤੋਂ ਠੀਕ ਬਣ ਰਹੀ ਹੈ ਜਾਂ ਨਹੀਂ।"
    ],
    exampleSpeech: "ਆਓ ਇਕਵਚਨ ਅਤੇ ਬਹੁਵਚਨ ਨੂੰ ਸੌਖੇ ਵਾਕਾਂ ਨਾਲ ਸਮਝੀਏ, ਤਾਂ ਜੋ ਫਰਕ ਤੁਰੰਤ ਸਪਸ਼ਟ ਹੋ ਜਾਵੇ।",
    recapSpeech: "ਦੁਹਰਾਈ: ਵਚਨ ਸ਼ਬਦ ਦੀ ਗਿਣਤੀ ਦੱਸਦਾ ਹੈ। ਇੱਕ ਲਈ ਇਕਵਚਨ ਅਤੇ ਇੱਕ ਤੋਂ ਵੱਧ ਲਈ ਬਹੁਵਚਨ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ।",
    recapBoardText: "ਯਾਦ ਰੱਖੋ: ਇੱਕ = ਇਕਵਚਨ, ਕਈ = ਬਹੁਵਚਨ।",
    recapPoints: [
      "ਵਚਨ ਗਿਣਤੀ ਦਾ ਬੋਧ ਕਰਵਾਉਂਦਾ ਹੈ।",
      "ਇਕਵਚਨ ਇੱਕ ਲਈ ਅਤੇ ਬਹੁਵਚਨ ਇੱਕ ਤੋਂ ਵੱਧ ਲਈ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ।",
      "ਵਾਕ ਵਿੱਚ ਸਹੀ ਵਚਨ ਵਰਤਣ ਨਾਲ ਭਾਸ਼ਾ ਸਹੀ ਬਣਦੀ ਹੈ।"
    ],
    practiceQuestion: "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਹੇਠਾਂ ਦਿੱਤੇ ਸ਼ਬਦਾਂ ਦੇ ਬਹੁਵਚਨ ਬਣਾਓ - ਮੁੰਡਾ, ਲੜਕੀ, ਕਿਤਾਬ। ਫਿਰ ਕਿਸੇ ਇੱਕ ਦਾ ਵਾਕ ਬਣਾਓ।",
    diagramInstructions: ["ਗਿਣਤੀ ਪਛਾਣੋ", "ਰੂਪ ਚੁਣੋ", "ਵਾਕ ਵਿੱਚ ਵਰਤੋ"],
    diagramActions: [
      { id: "diagram-box-count", type: "DRAW_BOX", lane: "diagram", label: "ਗਿਣਤੀ", text: "ਇੱਕ ਜਾਂ ਇੱਕ ਤੋਂ ਵੱਧ", accent: "important" },
      { id: "diagram-arrow-form", type: "DRAW_ARROW", lane: "diagram", fromLabel: "ਗਿਣਤੀ", toLabel: "ਰੂਪ", text: "ਇਕਵਚਨ / ਬਹੁਵਚਨ" },
      { id: "diagram-box-usage", type: "DRAW_BOX", lane: "diagram", label: "ਵਰਤੋਂ", text: "ਸਹੀ ਵਾਕ ਬਣਾਓ", accent: "important" }
    ]
  };
};

const genderLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const topic = "ਲਿੰਗ";
  return {
    boardPayload: {
      boardTitle: shortBoardTitle(topic, boardLanguage),
      boardLines: [
        "ਲਿੰਗ ਨਾਲ ਪਤਾ ਲੱਗਦਾ ਹੈ ਕਿ ਨਾਮ ਪੁਲਿੰਗ ਹੈ ਜਾਂ ਇਸਤ੍ਰੀਲਿੰਗ।",
        "ਪੰਜਾਬੀ ਵਿਆਕਰਣ ਵਿੱਚ ਲਿੰਗ ਦੀ ਸਹੀ ਪਛਾਣ ਨਾਲ ਵਾਕ ਸਹੀ ਬਣਦਾ ਹੈ।",
        "ਉਦਾਹਰਨ: ਮੁੰਡਾ ਪੁਲਿੰਗ, ਕੁੜੀ ਇਸਤ੍ਰੀਲਿੰਗ।"
      ],
      formulas: ["ਪੁਲਿੰਗ -> ਮੁੰਡਾ, ਘੋੜਾ", "ਇਸਤ੍ਰੀਲਿੰਗ -> ਕੁੜੀ, ਘੋੜੀ"],
      steps: [
        "ਸ਼ਬਦ ਦਾ ਅਰਥ ਸਮਝੋ।",
        "ਵੇਖੋ ਕਿ ਇਹ ਪੁਲਿੰਗ ਹੈ ਜਾਂ ਇਸਤ੍ਰੀਲਿੰਗ।",
        "ਫਿਰ ਇਸ ਸ਼ਬਦ ਨੂੰ ਠੀਕ ਵਾਕ ਵਿੱਚ ਵਰਤੋ।"
      ],
      exampleTitle: "ਲਿੰਗ ਉਦਾਹਰਨ",
      exampleSteps: [
        "ਮੁੰਡਾ ਖੇਡ ਰਿਹਾ ਹੈ। ਇੱਥੇ 'ਮੁੰਡਾ' ਪੁਲਿੰਗ ਹੈ।",
        "ਕੁੜੀ ਪੜ੍ਹ ਰਹੀ ਹੈ। ਇੱਥੇ 'ਕੁੜੀ' ਇਸਤ੍ਰੀਲਿੰਗ ਹੈ।",
        "ਘੋੜਾ ਦੌੜ ਰਿਹਾ ਹੈ, ਘੋੜੀ ਚੱਲ ਰਹੀ ਹੈ। ਇੱਥੇ ਦੋਵੇਂ ਰੂਪ ਲਿੰਗ ਅਨੁਸਾਰ ਬਦਲੇ ਹਨ।"
      ]
    },
    noteSpeech: [
      "ਲਿੰਗ ਵਿਆਕਰਣ ਦਾ ਉਹ ਭਾਗ ਹੈ ਜਿਸ ਨਾਲ ਅਸੀਂ ਜਾਣਦੇ ਹਾਂ ਕਿ ਕੋਈ ਨਾਮ ਪੁਲਿੰਗ ਹੈ ਜਾਂ ਇਸਤ੍ਰੀਲਿੰਗ।",
      "ਜੇ ਲਿੰਗ ਦੀ ਪਛਾਣ ਸਹੀ ਹੋਵੇ, ਤਾਂ ਵਾਕ ਵਿੱਚ ਕਿਰਿਆ ਅਤੇ ਹੋਰ ਸ਼ਬਦ ਵੀ ਠੀਕ ਲੱਗਦੇ ਹਨ।",
      "ਇਸ ਲਈ ਲਿੰਗ ਨੂੰ ਸਿਰਫ਼ ਰਟਣਾ ਨਹੀਂ, ਸਗੋਂ ਉਦਾਹਰਨਾਂ ਨਾਲ ਸਮਝਣਾ ਚਾਹੀਦਾ ਹੈ।"
    ],
    formulaSpeech: ["ਇਹ ਪੁਲਿੰਗ ਦੇ ਆਮ ਰੂਪ ਹਨ।", "ਇਹ ਇਸਤ੍ਰੀਲਿੰਗ ਦੇ ਆਮ ਰੂਪ ਹਨ।"],
    stepSpeech: ["ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਸ਼ਬਦ ਦਾ ਅਰਥ ਸਮਝੋ।", "ਫਿਰ ਪਛਾਣੋ ਕਿ ਸ਼ਬਦ ਪੁਲਿੰਗ ਹੈ ਜਾਂ ਇਸਤ੍ਰੀਲਿੰਗ।", "ਅੰਤ ਵਿੱਚ ਉਸੇ ਸ਼ਬਦ ਨੂੰ ਵਾਕ ਵਿੱਚ ਠੀਕ ਤਰ੍ਹਾਂ ਵਰਤੋ।"],
    exampleSpeech: "ਆਓ ਸਧਾਰਣ ਉਦਾਹਰਨਾਂ ਨਾਲ ਵੇਖੀਏ ਕਿ ਲਿੰਗ ਪਛਾਣਣ ਨਾਲ ਵਾਕ ਕਿਵੇਂ ਸਹੀ ਬਣਦਾ ਹੈ।",
    recapSpeech: "ਦੁਹਰਾਈ: ਲਿੰਗ ਨਾਲ ਨਾਮ ਦਾ ਰੂਪ ਪਤਾ ਲੱਗਦਾ ਹੈ। ਪੁਲਿੰਗ ਅਤੇ ਇਸਤ੍ਰੀਲਿੰਗ ਦੀ ਸਹੀ ਪਛਾਣ ਵਿਆਕਰਣਕ ਸਹੀਪਣ ਲਈ ਜ਼ਰੂਰੀ ਹੈ।",
    recapBoardText: "ਯਾਦ ਰੱਖੋ: ਲਿੰਗ ਪਛਾਣੋ, ਫਿਰ ਸਹੀ ਰੂਪ ਵਰਤੋ।",
    recapPoints: ["ਲਿੰਗ ਨਾਮ ਦੇ ਰੂਪ ਦਾ ਬੋਧ ਕਰਾਉਂਦਾ ਹੈ।", "ਪੁਲਿੰਗ ਅਤੇ ਇਸਤ੍ਰੀਲਿੰਗ ਦੋ ਮੁੱਖ ਰੂਪ ਹਨ।", "ਸਹੀ ਲਿੰਗ ਨਾਲ ਵਾਕ ਦੀ ਬਣਤਰ ਠੀਕ ਰਹਿੰਦੀ ਹੈ।"],
    practiceQuestion: "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਸ਼ਬਦ 'ਅਧਿਆਪਕ' ਅਤੇ 'ਅਧਿਆਪਿਕਾ' ਦਾ ਲਿੰਗ ਦੱਸੋ ਅਤੇ ਦੋ ਵੱਖ-ਵੱਖ ਵਾਕ ਬਣਾਓ।",
    diagramInstructions: ["ਵਿਆਕਰਣ ਨਿਯਮ", "ਉਦਾਹਰਨ ਨਾਲ ਜੋੜ", "ਸਹੀ ਵਾਕ ਵਰਤੋਂ"],
    diagramActions: [
      { id: "diagram-box-rule", type: "DRAW_BOX", lane: "diagram", label: "ਨਿਯਮ", text: "ਵਿਆਕਰਣ ਨਿਯਮ", accent: "important" },
      { id: "diagram-arrow-meaning", type: "DRAW_ARROW", lane: "diagram", fromLabel: "ਨਿਯਮ", toLabel: "ਉਦਾਹਰਨ", text: "ਉਦਾਹਰਨ ਨਾਲ ਜੋੜ" },
      { id: "diagram-box-usage", type: "DRAW_BOX", lane: "diagram", label: "ਵਰਤੋਂ", text: "ਸਹੀ ਵਾਕ ਵਰਤੋਂ", accent: "important" }
    ]
  };
};

const democracyLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  const topic = localizedTopicLabel("Democracy", "लोकतंत्र", "ਲੋਕਤੰਤਰ", boardLanguage);
  return {
    boardPayload: {
      boardTitle: shortBoardTitle(topic, boardLanguage),
      boardLines: [
        pickLanguage(boardLanguage, "Democracy is a form of government in which people choose their rulers through elections.", "लोकतंत्र वह शासन-प्रणाली है जिसमें लोग चुनाव द्वारा अपने शासक चुनते हैं।", "ਲੋਕਤੰਤਰ ਉਹ ਪ੍ਰਣਾਲੀ ਹੈ ਜਿਸ ਵਿੱਚ ਲੋਕ ਚੋਣਾਂ ਰਾਹੀਂ ਆਪਣੇ ਸ਼ਾਸਕ ਚੁਣਦੇ ਹਨ।"),
        pickLanguage(boardLanguage, "It is based on equality, participation, and accountability.", "यह समानता, भागीदारी और जवाबदेही पर आधारित है।", "ਇਹ ਸਮਾਨਤਾ, ਭਾਗੀਦਾਰੀ ਅਤੇ ਜਵਾਬਦੇਹੀ 'ਤੇ ਆਧਾਰਿਤ ਹੈ।"),
        pickLanguage(boardLanguage, "India is an example of a democratic country.", "भारत एक लोकतांत्रिक देश का उदाहरण है।", "ਭਾਰਤ ਇੱਕ ਲੋਕਤੰਤਰਕ ਦੇਸ਼ ਦਾ ਉਦਾਹਰਨ ਹੈ।")
      ],
      formulas: [pickLanguage(boardLanguage, "People -> Elections -> Government", "लोग -> चुनाव -> सरकार", "ਲੋਕ -> ਚੋਣਾਂ -> ਸਰਕਾਰ")],
      steps: [
        pickLanguage(boardLanguage, "Understand that power comes from the people.", "समझो कि शक्ति जनता से आती है।", "ਸਮਝੋ ਕਿ ਸ਼ਕਤੀ ਲੋਕਾਂ ਤੋਂ ਆਉਂਦੀ ਹੈ।"),
        pickLanguage(boardLanguage, "Representatives are chosen through elections.", "प्रतिनिधि चुनाव द्वारा चुने जाते हैं।", "ਪ੍ਰਤੀਨਿਧੀ ਚੋਣਾਂ ਰਾਹੀਂ ਚੁਣੇ ਜਾਂਦੇ ਹਨ।"),
        pickLanguage(boardLanguage, "Government stays answerable to the people.", "सरकार जनता के प्रति जवाबदेह रहती है।", "ਸਰਕਾਰ ਲੋਕਾਂ ਪ੍ਰਤੀ ਜਵਾਬਦੇਹ ਰਹਿੰਦੀ ਹੈ।")
      ],
      exampleTitle: pickLanguage(boardLanguage, "Democracy Example", "लोकतंत्र उदाहरण", "ਲੋਕਤੰਤਰ ਉਦਾਹਰਨ"),
      exampleSteps: [
        pickLanguage(boardLanguage, "In India, citizens above 18 years vote in elections.", "भारत में 18 वर्ष से ऊपर के नागरिक चुनाव में मतदान करते हैं।", "ਭਾਰਤ ਵਿੱਚ 18 ਸਾਲ ਤੋਂ ਉੱਪਰ ਦੇ ਨਾਗਰਿਕ ਚੋਣਾਂ ਵਿੱਚ ਵੋਟ ਪਾਂਦੇ ਹਨ।"),
        pickLanguage(boardLanguage, "The elected representatives form the government.", "चुने हुए प्रतिनिधि सरकार बनाते हैं।", "ਚੁਣੇ ਹੋਏ ਪ੍ਰਤੀਨਿਧੀ ਸਰਕਾਰ ਬਣਾਉਂਦੇ ਹਨ।")
      ]
    },
    noteSpeech: [
      pickLanguage(explanationLanguage, "Democracy means the people have the power to choose their government.", "लोकतंत्र का अर्थ है कि जनता को अपनी सरकार चुनने की शक्ति होती है।", "ਲੋਕਤੰਤਰ ਦਾ ਅਰਥ ਹੈ ਕਿ ਲੋਕਾਂ ਕੋਲ ਆਪਣੀ ਸਰਕਾਰ ਚੁਣਨ ਦੀ ਸ਼ਕਤੀ ਹੁੰਦੀ ਹੈ।"),
      pickLanguage(explanationLanguage, "Its main values are equality, participation, and accountability.", "इसके मुख्य मूल्य समानता, भागीदारी और जवाबदेही हैं।", "ਇਸਦੇ ਮੁੱਖ ਮੁੱਲ ਸਮਾਨਤਾ, ਭਾਗੀਦਾਰੀ ਅਤੇ ਜਵਾਬਦੇਹੀ ਹਨ।"),
      pickLanguage(explanationLanguage, "India is a practical example where people elect representatives.", "भारत एक व्यावहारिक उदाहरण है जहाँ लोग प्रतिनिधि चुनते हैं।", "ਭਾਰਤ ਇੱਕ ਵਿਆਵਹਾਰਿਕ ਉਦਾਹਰਨ ਹੈ ਜਿੱਥੇ ਲੋਕ ਪ੍ਰਤੀਨਿਧੀ ਚੁਣਦੇ ਹਨ।")
    ],
    formulaSpeech: [pickLanguage(explanationLanguage, "This simple flow shows how people elect a government in a democracy.", "यह सरल प्रवाह दिखाता है कि लोकतंत्र में लोग सरकार कैसे चुनते हैं।", "ਇਹ ਸਧਾਰਣ ਧਾਰਾ ਦਿਖਾਉਂਦੀ ਹੈ ਕਿ ਲੋਕਤੰਤਰ ਵਿੱਚ ਲੋਕ ਸਰਕਾਰ ਕਿਵੇਂ ਚੁਣਦੇ ਹਨ।")],
    stepSpeech: [
      pickLanguage(explanationLanguage, "The first idea is that final authority rests with the people.", "पहला विचार यह है कि अंतिम शक्ति जनता में निहित होती है।", "ਪਹਿਲਾ ਵਿਚਾਰ ਇਹ ਹੈ ਕਿ ਅੰਤਿਮ ਅਧਿਕਾਰ ਲੋਕਾਂ ਕੋਲ ਹੁੰਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "The second idea is that elections are the tool for choosing representatives.", "दूसरा विचार यह है कि चुनाव प्रतिनिधि चुनने का साधन हैं।", "ਦੂਜਾ ਵਿਚਾਰ ਇਹ ਹੈ ਕਿ ਚੋਣਾਂ ਪ੍ਰਤੀਨਿਧੀ ਚੁਣਨ ਦਾ ਸਾਧਨ ਹਨ।"),
      pickLanguage(explanationLanguage, "The third idea is that government must answer to the people.", "तीसरा विचार यह है कि सरकार जनता के प्रति जवाबदेह होनी चाहिए।", "ਤੀਜਾ ਵਿਚਾਰ ਇਹ ਹੈ ਕਿ ਸਰਕਾਰ ਲੋਕਾਂ ਦੇ ਪ੍ਰਤੀ ਜਵਾਬਦੇਹ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।")
    ],
    exampleSpeech: pickLanguage(explanationLanguage, "Let us use India as a real example of how democracy works in practice.", "आओ भारत को उदाहरण बनाकर समझें कि लोकतंत्र व्यवहार में कैसे काम करता है।", "ਆਓ ਭਾਰਤ ਨੂੰ ਉਦਾਹਰਨ ਬਣਾਕੇ ਸਮਝੀਏ ਕਿ ਲੋਕਤੰਤਰ ਅਮਲ ਵਿੱਚ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ।"),
    recapSpeech: pickLanguage(explanationLanguage, "Recap: democracy means rule by the people through elections and accountability.", "पुनरावृत्ति: लोकतंत्र का अर्थ है चुनाव और जवाबदेही के माध्यम से जनता का शासन।", "ਦੁਹਰਾਈ: ਲੋਕਤੰਤਰ ਦਾ ਅਰਥ ਹੈ ਚੋਣਾਂ ਅਤੇ ਜਵਾਬਦੇਹੀ ਰਾਹੀਂ ਲੋਕਾਂ ਦਾ ਸ਼ਾਸਨ।"),
    recapBoardText: pickLanguage(boardLanguage, "Remember: democracy = people, elections, accountability.", "याद रखो: लोकतंत्र = जनता, चुनाव, जवाबदेही।", "ਯਾਦ ਰੱਖੋ: ਲੋਕਤੰਤਰ = ਲੋਕ, ਚੋਣਾਂ, ਜਵਾਬਦੇਹੀ।"),
    recapPoints: [
      pickLanguage(explanationLanguage, "People choose their rulers in a democracy.", "लोकतंत्र में लोग अपने शासक चुनते हैं।", "ਲੋਕਤੰਤਰ ਵਿੱਚ ਲੋਕ ਆਪਣੇ ਸ਼ਾਸਕ ਚੁਣਦੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "Elections are the main method.", "चुनाव मुख्य साधन हैं।", "ਚੋਣਾਂ ਮੁੱਖ ਸਾਧਨ ਹਨ।"),
      pickLanguage(explanationLanguage, "Government must remain accountable to the people.", "सरकार को जनता के प्रति जवाबदेह रहना होता है।", "ਸਰਕਾਰ ਨੂੰ ਲੋਕਾਂ ਪ੍ਰਤੀ ਜਵਾਬਦੇਹ ਰਹਿਣਾ ਹੁੰਦਾ ਹੈ।")
    ],
    practiceQuestion: pickLanguage(explanationLanguage, "Practice question: Why are elections important in a democracy?", "अभ्यास प्रश्न: लोकतंत्र में चुनाव क्यों महत्वपूर्ण हैं?", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਲੋਕਤੰਤਰ ਵਿੱਚ ਚੋਣਾਂ ਕਿਉਂ ਮਹੱਤਵਪੂਰਨ ਹਨ?"),
    diagramInstructions: [
      pickLanguage(boardLanguage, "People", "जनता", "ਲੋਕ"),
      pickLanguage(boardLanguage, "Elections", "चुनाव", "ਚੋਣਾਂ"),
      pickLanguage(boardLanguage, "Government", "सरकार", "ਸਰਕਾਰ")
    ],
    diagramActions: [
      { id: "diagram-box-people", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "People", "जनता", "ਲੋਕ"), text: pickLanguage(boardLanguage, "Citizens", "नागरिक", "ਨਾਗਰਿਕ"), accent: "important" },
      { id: "diagram-arrow-election", type: "DRAW_ARROW", lane: "diagram", fromLabel: pickLanguage(boardLanguage, "People", "जनता", "ਲੋਕ"), toLabel: pickLanguage(boardLanguage, "Government", "सरकार", "ਸਰਕਾਰ"), text: pickLanguage(boardLanguage, "Elections", "चुनाव", "ਚੋਣਾਂ") },
      { id: "diagram-box-government", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "Government", "सरकार", "ਸਰਕਾਰ"), text: pickLanguage(boardLanguage, "Chosen representatives", "चुने हुए प्रतिनिधि", "ਚੁਣੇ ਹੋਏ ਪ੍ਰਤੀਨਿਧੀ"), accent: "important" }
    ]
  };
};

const decimalsLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  const topic = localizedTopicLabel("Decimals", "दशमलव", "ਦਸ਼ਮਲਵ", boardLanguage);
  return {
    boardPayload: {
      boardTitle: shortBoardTitle(topic, boardLanguage),
      boardLines: [
        pickLanguage(boardLanguage, "A decimal represents a part of a whole using place value.", "दशमलव स्थान-मूल्य की सहायता से पूरे का भाग दिखाती है।", "ਦਸ਼ਮਲਵ ਸਥਾਨ-ਮੂਲ ਦੀ ਮਦਦ ਨਾਲ ਪੂਰੇ ਦਾ ਹਿੱਸਾ ਦਰਸਾਂਦਾ ਹੈ।"),
        pickLanguage(boardLanguage, "The first place after the point is tenths, then hundredths.", "दशमलव बिंदु के बाद पहला स्थान दसवाँ और दूसरा स्थान सौवाँ होता है।", "ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਤੋਂ ਬਾਅਦ ਪਹਿਲਾ ਸਥਾਨ ਦਸਵਾਂ ਅਤੇ ਦੂਜਾ ਸਥਾਨ ਸੌਵਾਂ ਹੁੰਦਾ ਹੈ।"),
        pickLanguage(boardLanguage, "While adding or subtracting decimals, keep the decimal points in one line.", "दशमलवों को जोड़ते या घटाते समय दशमलव बिंदु एक सीध में रखो।", "ਦਸ਼ਮਲਵਾਂ ਨੂੰ ਜੋੜਦੇ ਜਾਂ ਘਟਾਉਂਦੇ ਸਮੇਂ ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਇਕੋ ਲਾਈਨ ਵਿੱਚ ਰੱਖੋ।"),
      ],
      formulas: ["3.45 = 3 + 4/10 + 5/100"],
      steps: [
        pickLanguage(boardLanguage, "Read the whole number part and the decimal part separately.", "पूरे भाग और दशमलव भाग को अलग-अलग पढ़ो।", "ਪੂਰੇ ਭਾਗ ਅਤੇ ਦਸ਼ਮਲਵ ਭਾਗ ਨੂੰ ਅਲੱਗ ਅਲੱਗ ਪੜ੍ਹੋ।"),
        pickLanguage(boardLanguage, "Identify the place value of each digit after the decimal point.", "दशमलव बिंदु के बाद प्रत्येक अंक का स्थान-मूल्य पहचानो।", "ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਤੋਂ ਬਾਅਦ ਹਰ ਅੰਕ ਦਾ ਸਥਾਨ-ਮੂਲ ਪਛਾਣੋ।"),
        pickLanguage(boardLanguage, "Align decimal points before doing any operation.", "कोई भी क्रिया करने से पहले दशमलव बिंदु बराबर मिलाओ।", "ਕੋਈ ਵੀ ਕ੍ਰਿਆ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਮਿਲਾਓ।"),
      ],
      exampleTitle: pickLanguage(boardLanguage, "Worked Example", "हल किया उदाहरण", "ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ"),
      exampleSteps: [
        pickLanguage(boardLanguage, "Write 2.5 and 1.25 with aligned decimal points.", "2.5 और 1.25 को दशमलव बिंदु मिलाकर लिखो।", "2.5 ਅਤੇ 1.25 ਨੂੰ ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਮਿਲਾ ਕੇ ਲਿਖੋ।"),
        pickLanguage(boardLanguage, "Add zero where needed: 2.50 + 1.25.", "ज़रूरत हो तो शून्य लगाओ: 2.50 + 1.25।", "ਲੋੜ ਹੋਵੇ ਤਾਂ ਸਿਫ਼ਰ ਲਗਾਓ: 2.50 + 1.25।"),
        pickLanguage(boardLanguage, "The sum is 3.75.", "योग 3.75 होगा।", "ਜੋੜ 3.75 ਹੋਵੇਗਾ।"),
      ],
    },
    noteSpeech: [
      pickLanguage(explanationLanguage, "Decimals help us write numbers that are not complete whole numbers.", "दशमलव हमें ऐसी संख्याएँ लिखने में मदद करती है जो पूर्ण पूर्णांक नहीं होतीं।", "ਦਸ਼ਮਲਵ ਸਾਨੂੰ ਉਹ ਸੰਖਿਆਵਾਂ ਲਿਖਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ ਜੋ ਪੂਰੇ ਅੰਕ ਨਹੀਂ ਹੁੰਦੀਆਂ।"),
      pickLanguage(explanationLanguage, "Their meaning becomes clear when we understand place value after the decimal point.", "इनका अर्थ तब स्पष्ट होता है जब हम दशमलव बिंदु के बाद के स्थान-मूल्य को समझते हैं।", "ਇਨ੍ਹਾਂ ਦਾ ਅਰਥ ਤਦ ਸਾਫ਼ ਹੁੰਦਾ ਹੈ ਜਦੋਂ ਅਸੀਂ ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਤੋਂ ਬਾਅਦ ਦੇ ਸਥਾਨ-ਮੂਲ ਨੂੰ ਸਮਝਦੇ ਹਾਂ।"),
      pickLanguage(explanationLanguage, "In operations, neat arrangement is as important as the final answer.", "दशमलव पर क्रिया करते समय सही व्यवस्था अंतिम उत्तर जितनी ही महत्वपूर्ण है।", "ਦਸ਼ਮਲਵ ਉੱਤੇ ਕ੍ਰਿਆ ਕਰਦੇ ਸਮੇਂ ਸਹੀ ਗੱਠਨ ਅੰਤਿਮ ਉੱਤਰ ਜਿੰਨੀ ਹੀ ਮਹੱਤਵਪੂਰਨ ਹੁੰਦੀ ਹੈ।"),
    ],
    formulaSpeech: [
      pickLanguage(explanationLanguage, "This expansion shows how each digit gets its value from its place.", "यह विस्तार दिखाता है कि हर अंक को उसका मान उसके स्थान से मिलता है।", "ਇਹ ਵਿਸਥਾਰ ਦਿਖਾਉਂਦਾ ਹੈ ਕਿ ਹਰ ਅੰਕ ਨੂੰ ਉਸਦਾ ਮੂਲ ਉਸਦੇ ਸਥਾਨ ਤੋਂ ਮਿਲਦਾ ਹੈ।"),
    ],
    stepSpeech: [
      pickLanguage(explanationLanguage, "पहले पूरे भाग और दशमलव भाग को अलग-अलग पहचानो।", "पहले पूरे भाग और दशमलव भाग को अलग-अलग पहचानो।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਪੂਰੇ ਭਾਗ ਅਤੇ ਦਸ਼ਮਲਵ ਭਾਗ ਨੂੰ ਵੱਖ ਵੱਖ ਪਛਾਣੋ।"),
      pickLanguage(explanationLanguage, "फिर दशमलव बिंदु के बाद के अंकों का स्थान-मूल्य समझो।", "फिर दशमलव बिंदु के बाद के अंकों का स्थान-मूल्य समझो।", "ਫਿਰ ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਤੋਂ ਬਾਅਦ ਦੇ ਅੰਕਾਂ ਦਾ ਸਥਾਨ-ਮੂਲ ਸਮਝੋ।"),
      pickLanguage(explanationLanguage, "अंत में क्रिया करते समय दशमलव बिंदु एक सीध में रखो।", "अंत में क्रिया करते समय दशमलव बिंदु एक सीध में रखो।", "ਅੰਤ ਵਿੱਚ ਕ੍ਰਿਆ ਕਰਦੇ ਸਮੇਂ ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਇਕੋ ਸੀਧ ਵਿੱਚ ਰੱਖੋ।"),
    ],
    exampleSpeech: pickLanguage(explanationLanguage, "A short addition example makes decimal alignment very easy to understand.", "एक छोटा जोड़ का उदाहरण दशमलव मिलान को बहुत आसानी से समझा देता है।", "ਜੋੜ ਦੀ ਇੱਕ ਛੋਟੀ ਉਦਾਹਰਨ ਦਸ਼ਮਲਵ ਮਿਲਾਣ ਨੂੰ ਬਹੁਤ ਆਸਾਨ ਬਣਾ ਦਿੰਦੀ ਹੈ।"),
    recapSpeech: pickLanguage(explanationLanguage, "Recap: decimals depend on place value, and operations become correct when decimal points are aligned.", "पुनरावृत्ति: दशमलव स्थान-मूल्य पर आधारित होती है और क्रियाएँ तभी सही बनती हैं जब दशमलव बिंदु बराबर मिलाए जाएँ।", "ਦੁਹਰਾਈ: ਦਸ਼ਮਲਵ ਸਥਾਨ-ਮੂਲ ਤੇ ਆਧਾਰਿਤ ਹੁੰਦਾ ਹੈ ਅਤੇ ਕ੍ਰਿਆਵਾਂ ਤਦ ਹੀ ਸਹੀ ਬਣਦੀਆਂ ਹਨ ਜਦੋਂ ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਮਿਲਾਏ ਜਾਣ।"),
    recapBoardText: pickLanguage(boardLanguage, "Remember: place value + aligned decimal point", "याद रखो: स्थान-मूल्य + मिला हुआ दशमलव बिंदु", "ਯਾਦ ਰੱਖੋ: ਸਥਾਨ-ਮੂਲ + ਮਿਲਿਆ ਹੋਇਆ ਦਸ਼ਮਲਵ ਬਿੰਦੂ"),
    recapPoints: [
      pickLanguage(explanationLanguage, "दशमलव पूर्ण संख्या के साथ उसके भाग को भी दिखाती है।", "दशमलव पूर्ण संख्या के साथ उसके भाग को भी दिखाती है।", "ਦਸ਼ਮਲਵ ਪੂਰੇ ਅੰਕ ਦੇ ਨਾਲ ਉਸਦੇ ਹਿੱਸੇ ਨੂੰ ਵੀ ਦਿਖਾਂਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "दशमलव बिंदु के बाद का हर स्थान अपना अलग मान रखता है।", "दशमलव बिंदु के बाद का हर स्थान अपना अलग मान रखता है।", "ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਤੋਂ ਬਾਅਦ ਹਰ ਸਥਾਨ ਦਾ ਅਲੱਗ ਮੂਲ ਹੁੰਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "जोड़-घटाव में दशमलव बिंदु मिलाना ज़रूरी है।", "जोड़-घटाव में दशमलव बिंदु मिलाना ज़रूरी है।", "ਜੋੜ-ਘਟਾਓ ਵਿੱਚ ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਮਿਲਾਉਣਾ ਲਾਜ਼ਮੀ ਹੈ।"),
    ],
    practiceQuestion: pickLanguage(explanationLanguage, "Practice question: Add 4.6 and 2.35 by aligning the decimal points and show each step.", "अभ्यास प्रश्न: 4.6 और 2.35 को दशमलव बिंदु मिलाकर जोड़ो और सभी चरण दिखाओ।", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: 4.6 ਅਤੇ 2.35 ਨੂੰ ਦਸ਼ਮਲਵ ਬਿੰਦੂ ਮਿਲਾ ਕੇ ਜੋੜੋ ਅਤੇ ਸਾਰੇ ਕਦਮ ਦਿਖਾਓ।"),
    diagramInstructions: [],
    diagramActions: [
      { id: "diagram-box-whole", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "Whole part", "पूर्ण भाग", "ਪੂਰਾ ਭਾਗ"), text: "3", accent: "important" },
      { id: "diagram-arrow-point", type: "DRAW_ARROW", lane: "diagram", fromLabel: pickLanguage(boardLanguage, "Whole part", "पूर्ण भाग", "ਪੂਰਾ ਭਾਗ"), toLabel: pickLanguage(boardLanguage, "Decimal part", "दशमलव भाग", "ਦਸ਼ਮਲਵ ਭਾਗ"), text: pickLanguage(boardLanguage, "Decimal point", "दशमलव बिंदु", "ਦਸ਼ਮਲਵ ਬਿੰਦੂ") },
      { id: "diagram-box-decimal", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "Decimal part", "दशमलव भाग", "ਦਸ਼ਮਲਵ ਭਾਗ"), text: pickLanguage(boardLanguage, "4 tenths, 5 hundredths", "4 दसवाँ, 5 सौवाँ", "4 ਦਸਵਾਂ, 5 ਸੌਵਾਂ"), accent: "example" },
    ],
  };
};

const respirationLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  const isPlant = includesAny(context.topicTitle, ["plant", "plants", "पौध", "ਪੌਦ"]);
  const topic = isPlant
    ? localizedTopicLabel("Respiration in Plants", "पौधों में श्वसन", "ਪੌਦਿਆਂ ਵਿੱਚ ਸ਼ਵਾਸ", boardLanguage)
    : localizedTopicLabel("Respiration", "श्वसन", "ਸ਼ਵਾਸ", boardLanguage);
  return {
    boardPayload: {
      boardTitle: shortBoardTitle(topic, boardLanguage),
      boardLines: isPlant
        ? [
            pickLanguage(boardLanguage, "Plants also respire to release energy from food.", "पौधे भी भोजन से ऊर्जा प्राप्त करने के लिए श्वसन करते हैं।", "ਪੌਦੇ ਵੀ ਭੋਜਨ ਤੋਂ ਊਰਜਾ ਪ੍ਰਾਪਤ ਕਰਨ ਲਈ ਸ਼ਵਾਸ ਕਰਦੇ ਹਨ।"),
            pickLanguage(boardLanguage, "This process goes on day and night in living cells.", "यह प्रक्रिया जीवित कोशिकाओं में दिन-रात चलती रहती है।", "ਇਹ ਪ੍ਰਕਿਰਿਆ ਜੀਵਿਤ ਕੋਸ਼ਿਕਾਵਾਂ ਵਿੱਚ ਦਿਨ ਰਾਤ ਚੱਲਦੀ ਰਹਿੰਦੀ ਹੈ।"),
            pickLanguage(boardLanguage, "Plants take in oxygen and release carbon dioxide during respiration.", "श्वसन के समय पौधे ऑक्सीजन लेते हैं और कार्बन डाइऑक्साइड छोड़ते हैं।", "ਸ਼ਵਾਸ ਦੌਰਾਨ ਪੌਦੇ ਆਕਸੀਜਨ ਲੈਂਦੇ ਹਨ ਅਤੇ ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ ਛੱਡਦੇ ਹਨ।"),
          ]
        : [
            pickLanguage(boardLanguage, "Respiration is the process of releasing energy from food.", "श्वसन वह प्रक्रिया है जिसमें भोजन से ऊर्जा प्राप्त होती है।", "ਸ਼ਵਾਸ ਉਹ ਪ੍ਰਕਿਰਿਆ ਹੈ ਜਿਸ ਵਿੱਚ ਭੋਜਨ ਤੋਂ ਊਰਜਾ ਪ੍ਰਾਪਤ ਹੁੰਦੀ ਹੈ।"),
            pickLanguage(boardLanguage, "Oxygen goes in and carbon dioxide comes out.", "इससे जुड़ी क्रिया में ऑक्सीजन अंदर जाती है और कार्बन डाइऑक्साइड बाहर आती है।", "ਇਸ ਨਾਲ ਜੁੜੀ ਕ੍ਰਿਆ ਵਿੱਚ ਆਕਸੀਜਨ ਅੰਦਰ ਜਾਂਦੀ ਹੈ ਅਤੇ ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ ਬਾਹਰ ਆਉਂਦੀ ਹੈ।"),
            pickLanguage(boardLanguage, "Cells break down food and release energy.", "कोशिकाएँ भोजन को तोड़कर ऊर्जा मुक्त करती हैं।", "ਕੋਸ਼ਿਕਾਵਾਂ ਭੋਜਨ ਨੂੰ ਤੋੜ ਕੇ ਊਰਜਾ ਛੱਡਦੀਆਂ ਹਨ।"),
          ],
      formulas: [
        pickLanguage(boardLanguage, "Food + Oxygen -> Energy + Carbon dioxide + Water", "भोजन + ऑक्सीजन -> ऊर्जा + कार्बन डाइऑक्साइड + जल", "ਭੋਜਨ + ਆਕਸੀਜਨ -> ਊਰਜਾ + ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ + ਜਲ"),
      ],
      steps: isPlant
        ? [
            pickLanguage(boardLanguage, "Remember that plants make food, but they also respire.", "याद रखो कि पौधे भोजन बनाते हैं, पर वे श्वसन भी करते हैं।", "ਯਾਦ ਰੱਖੋ ਕਿ ਪੌਦੇ ਭੋਜਨ ਬਣਾਉਂਦੇ ਹਨ, ਪਰ ਉਹ ਸ਼ਵਾਸ ਵੀ ਕਰਦੇ ਹਨ।"),
            pickLanguage(boardLanguage, "Gas exchange happens through stomata, stems, and roots.", "गैसों का आदान-प्रदान रंध्रों, तनों और जड़ों के माध्यम से होता है।", "ਗੈਸਾਂ ਦਾ ਅਦਾਨ-ਪ੍ਰਦਾਨ ਰੰਧਰਾਂ, ਤਣਿਆਂ ਅਤੇ ਜੜਾਂ ਰਾਹੀਂ ਹੁੰਦਾ ਹੈ।"),
            pickLanguage(boardLanguage, "Respiration releases the energy needed for plant life.", "श्वसन पौधे के जीवन-कार्य के लिए ऊर्जा देता है।", "ਸ਼ਵਾਸ ਪੌਦੇ ਦੇ ਜੀਵਨ-ਕਾਰਜ ਲਈ ਊਰਜਾ ਦਿੰਦਾ ਹੈ।"),
          ]
        : [
            pickLanguage(boardLanguage, "First understand the meaning of respiration.", "सबसे पहले श्वसन का अर्थ समझो।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਸ਼ਵਾਸ ਦਾ ਅਰਥ ਸਮਝੋ।"),
            pickLanguage(boardLanguage, "Then note the role of oxygen in releasing energy.", "फिर ऊर्जा-मुक्ति में ऑक्सीजन की भूमिका समझो।", "ਫਿਰ ਊਰਜਾ-ਮੁਕਤੀ ਵਿੱਚ ਆਕਸੀਜਨ ਦੀ ਭੂਮਿਕਾ ਸਮਝੋ।"),
            pickLanguage(boardLanguage, "Finally connect respiration with body needs.", "अंत में श्वसन को शरीर की ज़रूरत से जोड़ो।", "ਅੰਤ ਵਿੱਚ ਸ਼ਵਾਸ ਨੂੰ ਸਰੀਰ ਦੀ ਲੋੜ ਨਾਲ ਜੋੜੋ।"),
          ],
      exampleTitle: pickLanguage(boardLanguage, "Worked Example", "हल किया उदाहरण", "ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ"),
      exampleSteps: isPlant
        ? [
            pickLanguage(boardLanguage, "Plants exchange gases even when they are not photosynthesizing.", "पौधे प्रकाश-संश्लेषण न होने पर भी गैसों का आदान-प्रदान करते हैं।", "ਪੌਦੇ ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਨਾ ਹੋਣ 'ਤੇ ਵੀ ਗੈਸਾਂ ਦਾ ਅਦਾਨ-ਪ੍ਰਦਾਨ ਕਰਦੇ ਹਨ।"),
            pickLanguage(boardLanguage, "This shows that respiration is a separate life process.", "इससे पता चलता है कि श्वसन एक अलग जीवन-प्रक्रिया है।", "ਇਸ ਨਾਲ ਪਤਾ ਲੱਗਦਾ ਹੈ ਕਿ ਸ਼ਵਾਸ ਇੱਕ ਵੱਖਰੀ ਜੀਵਨ-ਪ੍ਰਕਿਰਿਆ ਹੈ।"),
          ]
        : [
            pickLanguage(boardLanguage, "After running, breathing becomes faster.", "दौड़ने के बाद साँस तेज हो जाती है।", "ਦੌੜਣ ਤੋਂ ਬਾਅਦ ਸਾਹ ਤੇਜ਼ ਹੋ ਜਾਂਦਾ ਹੈ।"),
            pickLanguage(boardLanguage, "This happens because the body needs more oxygen for more energy.", "ऐसा इसलिए होता है क्योंकि शरीर को अधिक ऊर्जा के लिए अधिक ऑक्सीजन चाहिए होती है।", "ਇਹ ਇਸ ਲਈ ਹੁੰਦਾ ਹੈ ਕਿਉਂਕਿ ਸਰੀਰ ਨੂੰ ਵੱਧ ਊਰਜਾ ਲਈ ਵੱਧ ਆਕਸੀਜਨ ਚਾਹੀਦੀ ਹੁੰਦੀ ਹੈ।"),
          ],
    },
    noteSpeech: [
      isPlant
        ? pickLanguage(explanationLanguage, "Plants also respire, even though they prepare their own food.", "पौधे अपना भोजन स्वयं बनाते हैं, फिर भी वे श्वसन करते हैं।", "ਪੌਦੇ ਆਪਣਾ ਭੋਜਨ ਆਪ ਬਣਾਉਂਦੇ ਹਨ, ਫਿਰ ਵੀ ਉਹ ਸ਼ਵਾਸ ਕਰਦੇ ਹਨ।")
        : pickLanguage(explanationLanguage, "Respiration gives the body the energy needed for life activities.", "श्वसन शरीर को जीवन-क्रियाओं के लिए आवश्यक ऊर्जा देता है।", "ਸ਼ਵਾਸ ਸਰੀਰ ਨੂੰ ਜੀਵਨ-ਕਿਰਿਆਵਾਂ ਲਈ ਲੋੜੀਂਦੀ ਊਰਜਾ ਦਿੰਦਾ ਹੈ।"),
      isPlant
        ? pickLanguage(explanationLanguage, "This process continues in living cells during both day and night.", "यह प्रक्रिया जीवित कोशिकाओं में दिन और रात दोनों समय चलती है।", "ਇਹ ਪ੍ਰਕਿਰਿਆ ਜੀਵਿਤ ਕੋਸ਼ਿਕਾਵਾਂ ਵਿੱਚ ਦਿਨ ਤੇ ਰਾਤ ਦੋਵੇਂ ਵੇਲੇ ਚੱਲਦੀ ਹੈ।")
        : pickLanguage(explanationLanguage, "In school science, we connect respiration with oxygen, food, and energy release.", "स्कूल विज्ञान में हम श्वसन को ऑक्सीजन, भोजन और ऊर्जा-मुक्ति से जोड़कर समझते हैं।", "ਸਕੂਲੀ ਵਿਗਿਆਨ ਵਿੱਚ ਅਸੀਂ ਸ਼ਵਾਸ ਨੂੰ ਆਕਸੀਜਨ, ਭੋਜਨ ਅਤੇ ਊਰਜਾ-ਮੁਕਤੀ ਨਾਲ ਜੋੜ ਕੇ ਸਮਝਦੇ ਹਾਂ।"),
      isPlant
        ? pickLanguage(explanationLanguage, "So respiration should not be confused with only photosynthesis.", "इसलिए श्वसन को केवल प्रकाश-संश्लेषण के साथ मिलाकर नहीं देखना चाहिए।", "ਇਸ ਲਈ ਸ਼ਵਾਸ ਨੂੰ ਸਿਰਫ਼ ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਨਾਲ ਜੋੜ ਕੇ ਨਹੀਂ ਦੇਖਣਾ ਚਾਹੀਦਾ।")
        : pickLanguage(explanationLanguage, "A good answer explains what respiration is and why it is needed.", "अच्छे उत्तर में यह बताया जाता है कि श्वसन क्या है और क्यों आवश्यक है।", "ਚੰਗੇ ਉੱਤਰ ਵਿੱਚ ਦੱਸਿਆ ਜਾਂਦਾ ਹੈ ਕਿ ਸ਼ਵਾਸ ਕੀ ਹੈ ਅਤੇ ਕਿਉਂ ਲੋੜੀਂਦਾ ਹੈ।"),
    ],
    formulaSpeech: [
      pickLanguage(explanationLanguage, "This equation helps us remember the main inputs and outputs of respiration.", "यह समीकरण श्वसन के मुख्य इनपुट और आउटपुट याद रखने में मदद करता है।", "ਇਹ ਸਮੀਕਰਨ ਸ਼ਵਾਸ ਦੇ ਮੁੱਖ ਇਨਪੁੱਟ ਅਤੇ ਆਉਟਪੁੱਟ ਯਾਦ ਰੱਖਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।"),
    ],
    stepSpeech: [
      pickLanguage(explanationLanguage, "सबसे पहले श्वसन का मूल अर्थ समझो।", "सबसे पहले श्वसन का मूल अर्थ समझो।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਸ਼ਵਾਸ ਦਾ ਮੂਲ ਅਰਥ ਸਮਝੋ।"),
      pickLanguage(explanationLanguage, isPlant ? "अब गैसों के आदान-प्रदान का स्थान समझो।" : "अब ऑक्सीजन की भूमिका समझो।", isPlant ? "अब गैसों के आदान-प्रदान का स्थान समझो।" : "अब ऑक्सीजन की भूमिका समझो।", isPlant ? "ਹੁਣ ਗੈਸਾਂ ਦੇ ਅਦਾਨ-ਪ੍ਰਦਾਨ ਵਾਲੇ ਸਥਾਨ ਨੂੰ ਸਮਝੋ।" : "ਹੁਣ ਆਕਸੀਜਨ ਦੀ ਭੂਮਿਕਾ ਸਮਝੋ।"),
      pickLanguage(explanationLanguage, "अंत में इसे ऊर्जा-प्राप्ति से जोड़ो।", "अंत में इसे ऊर्जा-प्राप्ति से जोड़ो।", "ਅੰਤ ਵਿੱਚ ਇਸਨੂੰ ਊਰਜਾ-ਪ੍ਰਾਪਤੀ ਨਾਲ ਜੋੜੋ।"),
    ],
    exampleSpeech: pickLanguage(explanationLanguage, "A familiar example makes the idea of respiration much easier to remember.", "एक परिचित उदाहरण श्वसन की धारणा को जल्दी याद करा देता है।", "ਇੱਕ ਜਾਣ-ਪਛਾਣ ਵਾਲੀ ਉਦਾਹਰਨ ਸ਼ਵਾਸ ਦੀ ਧਾਰਨਾ ਜਲਦੀ ਯਾਦ ਕਰਵਾ ਦਿੰਦੀ ਹੈ।"),
    recapSpeech: pickLanguage(explanationLanguage, "Recap: respiration releases energy from food and involves oxygen use and carbon dioxide release.", "पुनरावृत्ति: श्वसन भोजन से ऊर्जा मुक्त करता है और इसमें ऑक्सीजन की भूमिका तथा कार्बन डाइऑक्साइड का निष्कासन शामिल है।", "ਦੁਹਰਾਈ: ਸ਼ਵਾਸ ਭੋਜਨ ਤੋਂ ਊਰਜਾ ਮੁਕਤ ਕਰਦਾ ਹੈ ਅਤੇ ਇਸ ਵਿੱਚ ਆਕਸੀਜਨ ਦੀ ਵਰਤੋਂ ਤੇ ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ ਦਾ ਨਿਕਾਸ ਸ਼ਾਮਲ ਹੈ।"),
    recapBoardText: pickLanguage(boardLanguage, "Remember: food + oxygen -> energy", "याद रखो: भोजन + ऑक्सीजन -> ऊर्जा", "ਯਾਦ ਰੱਖੋ: ਭੋਜਨ + ਆਕਸੀਜਨ -> ਊਰਜਾ"),
    recapPoints: isPlant
      ? [
          pickLanguage(explanationLanguage, "पौधे भी श्वसन करते हैं।", "पौधे भी श्वसन करते हैं।", "ਪੌਦੇ ਵੀ ਸ਼ਵਾਸ ਕਰਦੇ ਹਨ।"),
          pickLanguage(explanationLanguage, "यह प्रक्रिया जीवित कोशिकाओं में चलती है।", "यह प्रक्रिया जीवित कोशिकाओं में चलती है।", "ਇਹ ਪ੍ਰਕਿਰਿਆ ਜੀਵਿਤ ਕੋਸ਼ਿਕਾਵਾਂ ਵਿੱਚ ਚੱਲਦੀ ਹੈ।"),
          pickLanguage(explanationLanguage, "श्वसन से ऊर्जा मिलती है।", "श्वसन से ऊर्जा मिलती है।", "ਸ਼ਵਾਸ ਤੋਂ ਊਰਜਾ ਮਿਲਦੀ ਹੈ।"),
        ]
      : [
          pickLanguage(explanationLanguage, "श्वसन भोजन से ऊर्जा प्राप्त करने की प्रक्रिया है।", "श्वसन भोजन से ऊर्जा प्राप्त करने की प्रक्रिया है।", "ਸ਼ਵਾਸ ਭੋਜਨ ਤੋਂ ਊਰਜਾ ਪ੍ਰਾਪਤ ਕਰਨ ਦੀ ਪ੍ਰਕਿਰਿਆ ਹੈ।"),
          pickLanguage(explanationLanguage, "ऑक्सीजन इसमें महत्वपूर्ण भूमिका निभाती है।", "ऑक्सीजन इसमें महत्वपूर्ण भूमिका निभाती है।", "ਆਕਸੀਜਨ ਇਸ ਵਿੱਚ ਮਹੱਤਵਪੂਰਨ ਭੂਮਿਕਾ ਨਿਭਾਂਦੀ ਹੈ।"),
          pickLanguage(explanationLanguage, "अधिक काम के समय शरीर को अधिक श्वसन की ज़रूरत होती है।", "अधिक काम के समय शरीर को अधिक श्वसन की ज़रूरत होती है।", "ਵੱਧ ਕੰਮ ਵੇਲੇ ਸਰੀਰ ਨੂੰ ਵੱਧ ਸ਼ਵਾਸ ਦੀ ਲੋੜ ਹੁੰਦੀ ਹੈ।"),
        ],
    practiceQuestion: isPlant
      ? pickLanguage(explanationLanguage, "Practice question: Why do plants also need respiration? Write two or three clear lines.", "अभ्यास प्रश्न: पौधों को भी श्वसन की आवश्यकता क्यों होती है? दो या तीन स्पष्ट पंक्तियाँ लिखो।", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਪੌਦਿਆਂ ਨੂੰ ਵੀ ਸ਼ਵਾਸ ਦੀ ਲੋੜ ਕਿਉਂ ਹੁੰਦੀ ਹੈ? ਦੋ ਜਾਂ ਤਿੰਨ ਸਾਫ਼ ਲਾਈਨਾਂ ਲਿਖੋ।")
      : pickLanguage(explanationLanguage, "Practice question: Why does breathing become faster after running? Explain using respiration.", "अभ्यास प्रश्न: दौड़ने के बाद साँस तेज क्यों हो जाती है? श्वसन के आधार पर समझाओ।", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਦੌੜਣ ਤੋਂ ਬਾਅਦ ਸਾਹ ਤੇਜ਼ ਕਿਉਂ ਹੋ ਜਾਂਦਾ ਹੈ? ਸ਼ਵਾਸ ਦੇ ਆਧਾਰ ਤੇ ਸਮਝਾਓ।"),
    diagramInstructions: [],
    diagramActions: [
      { id: "diagram-box-input", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "Input", "प्रवेश", "ਪ੍ਰਵੇਸ਼"), text: pickLanguage(boardLanguage, "Food + Oxygen", "भोजन + ऑक्सीजन", "ਭੋਜਨ + ਆਕਸੀਜਨ"), accent: "important" },
      { id: "diagram-arrow-process", type: "DRAW_ARROW", lane: "diagram", fromLabel: pickLanguage(boardLanguage, "Input", "प्रवेश", "ਪ੍ਰਵੇਸ਼"), toLabel: pickLanguage(boardLanguage, "Output", "निष्कर्ष", "ਨਤੀਜਾ"), text: pickLanguage(boardLanguage, "Respiration", "श्वसन", "ਸ਼ਵਾਸ") },
      { id: "diagram-box-output", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "Output", "निष्कर्ष", "ਨਤੀਜਾ"), text: pickLanguage(boardLanguage, "Energy + Carbon dioxide", "ऊर्जा + कार्बन डाइऑक्साइड", "ਊਰਜਾ + ਕਾਰਬਨ ਡਾਇਆਕਸਾਈਡ"), accent: "important" },
    ],
  };
};

const federalismLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  const topic = localizedTopicLabel("Federalism", "संघवाद", "ਸੰਘਵਾਦ", boardLanguage);
  return {
    boardPayload: {
      boardTitle: shortBoardTitle(topic, boardLanguage),
      boardLines: [
        pickLanguage(boardLanguage, "Federalism is a system in which power is divided between levels of government.", "संघवाद वह व्यवस्था है जिसमें शासन-शक्ति अलग-अलग स्तरों में बाँटी जाती है।", "ਸੰਘਵਾਦ ਉਹ ਪ੍ਰਣਾਲੀ ਹੈ ਜਿਸ ਵਿੱਚ ਸ਼ਾਸਕੀ ਸ਼ਕਤੀ ਵੱਖ-ਵੱਖ ਪੱਧਰਾਂ ਵਿੱਚ ਵੰਡੀ ਜਾਂਦੀ ਹੈ।"),
        pickLanguage(boardLanguage, "These levels usually include the central and state governments.", "इन स्तरों में सामान्यतः केंद्र और राज्य सरकार शामिल होती हैं।", "ਇਨ੍ਹਾਂ ਪੱਧਰਾਂ ਵਿੱਚ ਆਮ ਤੌਰ ਤੇ ਕੇਂਦਰ ਅਤੇ ਰਾਜ ਸਰਕਾਰ ਸ਼ਾਮਲ ਹੁੰਦੀਆਂ ਹਨ।"),
        pickLanguage(boardLanguage, "Division of power prevents authority from concentrating in one place.", "शक्ति-विभाजन से सारी सत्ता एक ही स्थान पर केंद्रित नहीं होती।", "ਸ਼ਕਤੀ-ਵੰਡ ਨਾਲ ਸਾਰੀ ਸੱਤਾ ਇੱਕੇ ਥਾਂ ਕੇਂਦਰਿਤ ਨਹੀਂ ਹੁੰਦੀ।"),
      ],
      formulas: [pickLanguage(boardLanguage, "Center + State + Local levels", "केंद्र + राज्य + स्थानीय स्तर", "ਕੇਂਦਰ + ਰਾਜ + ਸਥਾਨਕ ਪੱਧਰ")],
      steps: [
        pickLanguage(boardLanguage, "First understand the meaning of division of powers.", "सबसे पहले शक्ति-विभाजन का अर्थ समझो।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਸ਼ਕਤੀ-ਵੰਡ ਦਾ ਅਰਥ ਸਮਝੋ।"),
        pickLanguage(boardLanguage, "Then identify the main levels of government.", "फिर शासन के मुख्य स्तर पहचानो।", "ਫਿਰ ਸ਼ਾਸਨ ਦੇ ਮੁੱਖ ਪੱਧਰ ਪਛਾਣੋ।"),
        pickLanguage(boardLanguage, "Finally connect federalism with daily administration.", "अंत में संघवाद को प्रशासन के व्यावहारिक काम से जोड़ो।", "ਅੰਤ ਵਿੱਚ ਸੰਘਵਾਦ ਨੂੰ ਪ੍ਰਸ਼ਾਸਨ ਦੇ ਅਸਲੀ ਕੰਮ ਨਾਲ ਜੋੜੋ।"),
      ],
      exampleTitle: pickLanguage(boardLanguage, "Worked Example", "हल किया उदाहरण", "ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ"),
      exampleSteps: [
        pickLanguage(boardLanguage, "The Union government handles national defence.", "केंद्र सरकार राष्ट्रीय रक्षा जैसे विषय संभालती है।", "ਕੇਂਦਰ ਸਰਕਾਰ ਰਾਸ਼ਟਰੀ ਰੱਖਿਆ ਵਰਗੇ ਵਿਸ਼ੇ ਸੰਭਾਲਦੀ ਹੈ।"),
        pickLanguage(boardLanguage, "State governments handle many subjects linked to their own states.", "राज्य सरकारें अपने राज्य से जुड़े अनेक विषय संभालती हैं।", "ਰਾਜ ਸਰਕਾਰਾਂ ਆਪਣੇ ਰਾਜ ਨਾਲ ਜੁੜੇ ਕਈ ਵਿਸ਼ੇ ਸੰਭਾਲਦੀਆਂ ਹਨ।"),
      ],
    },
    noteSpeech: [
      pickLanguage(explanationLanguage, "Federalism helps large countries run administration in a balanced way.", "संघवाद बड़े देशों में प्रशासन को संतुलित ढंग से चलाने में मदद करता है।", "ਸੰਘਵਾਦ ਵੱਡੇ ਦੇਸ਼ਾਂ ਵਿੱਚ ਪ੍ਰਸ਼ਾਸਨ ਨੂੰ ਸੰਤੁਲਿਤ ਢੰਗ ਨਾਲ ਚਲਾਉਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "Its core idea is shared power, not one government doing everything alone.", "इसका मूल विचार साझी शक्ति है, न कि सारा काम केवल एक ही सरकार करे।", "ਇਸਦਾ ਮੂਲ ਵਿਚਾਰ ਸਾਂਝੀ ਸ਼ਕਤੀ ਹੈ, ਨਾ ਕਿ ਸਾਰਾ ਕੰਮ ਕੇਵਲ ਇੱਕੋ ਸਰਕਾਰ ਕਰੇ।"),
      pickLanguage(explanationLanguage, "So focus on levels of government and division of work.", "इसलिए शासन के स्तर और कार्य-विभाजन पर ध्यान दो।", "ਇਸ ਲਈ ਸ਼ਾਸਨ ਦੇ ਪੱਧਰ ਅਤੇ ਕੰਮ ਦੀ ਵੰਡ ਉੱਤੇ ਧਿਆਨ ਦਿਓ।"),
    ],
    formulaSpeech: [pickLanguage(explanationLanguage, "This simple flow reminds us that federalism works through more than one level of government.", "यह क्रम याद दिलाता है कि संघवाद एक से अधिक स्तरों वाली शासन-व्यवस्था है।", "ਇਹ ਕ੍ਰਮ ਯਾਦ ਦਿਵਾਂਦਾ ਹੈ ਕਿ ਸੰਘਵਾਦ ਇੱਕ ਤੋਂ ਵੱਧ ਪੱਧਰਾਂ ਵਾਲੀ ਪ੍ਰਣਾਲੀ ਹੈ।")],
    stepSpeech: [
      pickLanguage(explanationLanguage, "पहले समझो कि शक्ति-विभाजन क्यों ज़रूरी होता है।", "पहले समझो कि शक्ति-विभाजन क्यों ज़रूरी होता है।", "ਪਹਿਲਾਂ ਸਮਝੋ ਕਿ ਸ਼ਕਤੀ-ਵੰਡ ਕਿਉਂ ਜ਼ਰੂਰੀ ਹੁੰਦੀ ਹੈ।"),
      pickLanguage(explanationLanguage, "फिर केंद्र और राज्य स्तर की भूमिका समझो।", "फिर केंद्र और राज्य स्तर की भूमिका समझो।", "ਫਿਰ ਕੇਂਦਰ ਅਤੇ ਰਾਜ ਪੱਧਰ ਦੀ ਭੂਮਿਕਾ ਸਮਝੋ।"),
      pickLanguage(explanationLanguage, "अंत में इसे व्यावहारिक शासन से जोड़ो।", "अंत में इसे व्यावहारिक शासन से जोड़ो।", "ਅੰਤ ਵਿੱਚ ਇਸਨੂੰ ਅਸਲੀ ਸ਼ਾਸਨ ਨਾਲ ਜੋੜੋ।"),
    ],
    exampleSpeech: pickLanguage(explanationLanguage, "An example from daily administration makes federalism easier to understand.", "प्रशासन से जुड़ा उदाहरण संघवाद को आसानी से समझा देता है।", "ਪ੍ਰਸ਼ਾਸਨ ਨਾਲ ਜੁੜੀ ਉਦਾਹਰਨ ਸੰਘਵਾਦ ਨੂੰ ਆਸਾਨੀ ਨਾਲ ਸਮਝਾ ਦਿੰਦੀ ਹੈ।"),
    recapSpeech: pickLanguage(explanationLanguage, "Recap: federalism means division of powers among more than one level of government.", "पुनरावृत्ति: संघवाद का अर्थ है शासन-शक्ति का एक से अधिक स्तरों में विभाजन।", "ਦੁਹਰਾਈ: ਸੰਘਵਾਦ ਦਾ ਅਰਥ ਹੈ ਸ਼ਾਸਕੀ ਸ਼ਕਤੀ ਦਾ ਇੱਕ ਤੋਂ ਵੱਧ ਪੱਧਰਾਂ ਵਿੱਚ ਵੰਡ ਹੋਣਾ।"),
    recapBoardText: pickLanguage(boardLanguage, "Remember: one country, shared powers", "याद रखो: एक देश, साझा शक्तियाँ", "ਯਾਦ ਰੱਖੋ: ਇੱਕ ਦੇਸ਼, ਸਾਂਝੀਆਂ ਸ਼ਕਤੀਆਂ"),
    recapPoints: [
      pickLanguage(explanationLanguage, "संघवाद में शक्ति बाँटी जाती है।", "संघवाद में शक्ति बाँटी जाती है।", "ਸੰਘਵਾਦ ਵਿੱਚ ਸ਼ਕਤੀ ਵੰਡੀ ਜਾਂਦੀ ਹੈ।"),
      pickLanguage(explanationLanguage, "केंद्र और राज्य इसके मुख्य स्तर हैं।", "केंद्र और राज्य इसके मुख्य स्तर हैं।", "ਕੇਂਦਰ ਅਤੇ ਰਾਜ ਇਸਦੇ ਮੁੱਖ ਪੱਧਰ ਹਨ।"),
      pickLanguage(explanationLanguage, "इससे शासन अधिक संतुलित बनता है।", "इससे शासन अधिक संतुलित बनता है।", "ਇਸ ਨਾਲ ਸ਼ਾਸਨ ਹੋਰ ਸੰਤੁਲਿਤ ਬਣਦਾ ਹੈ।"),
    ],
    practiceQuestion: pickLanguage(explanationLanguage, "Practice question: Why is division of powers important in federalism? Write two clear points.", "अभ्यास प्रश्न: संघवाद में शक्ति-विभाजन क्यों महत्वपूर्ण है? दो स्पष्ट बिंदु लिखो।", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਸੰਘਵਾਦ ਵਿੱਚ ਸ਼ਕਤੀ-ਵੰਡ ਕਿਉਂ ਮਹੱਤਵਪੂਰਨ ਹੈ? ਦੋ ਸਾਫ਼ ਬਿੰਦੂ ਲਿਖੋ।"),
    diagramInstructions: [],
    diagramActions: [
      { id: "diagram-box-center", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "Center", "केंद्र", "ਕੇਂਦਰ"), text: pickLanguage(boardLanguage, "National subjects", "राष्ट्रीय विषय", "ਰਾਸ਼ਟਰੀ ਵਿਸ਼ੇ"), accent: "important" },
      { id: "diagram-arrow-share", type: "DRAW_ARROW", lane: "diagram", fromLabel: pickLanguage(boardLanguage, "Center", "केंद्र", "ਕੇਂਦਰ"), toLabel: pickLanguage(boardLanguage, "State", "राज्य", "ਰਾਜ"), text: pickLanguage(boardLanguage, "Division of powers", "शक्ति-विभाजन", "ਸ਼ਕਤੀ-ਵੰਡ") },
      { id: "diagram-box-state", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "State", "राज्य", "ਰਾਜ"), text: pickLanguage(boardLanguage, "Regional subjects", "राज्य विषय", "ਰਾਜੀ ਵਿਸ਼ੇ"), accent: "important" },
    ],
  };
};

const numberChangeLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  return {
    boardPayload: {
      boardTitle: shortBoardTitle("ਵਚਨ ਬਦਲੋ", boardLanguage),
      boardLines: [
        "ਵਚਨ ਬਦਲੋ ਦਾ ਅਰਥ ਹੈ ਇਕਵਚਨ ਨੂੰ ਬਹੁਵਚਨ ਜਾਂ ਬਹੁਵਚਨ ਨੂੰ ਇਕਵਚਨ ਵਿੱਚ ਬਦਲਣਾ।",
        "ਸ਼ਬਦ ਬਦਲਦੇ ਸਮੇਂ ਰੂਪ ਅਤੇ ਗਿਣਤੀ ਦੋਵੇਂ ਦਾ ਧਿਆਨ ਰੱਖੋ।",
        "ਉਦਾਹਰਨ: ਮੁੰਡਾ -> ਮੁੰਡੇ, ਕਿਤਾਬ -> ਕਿਤਾਬਾਂ।"
      ],
      formulas: ["ਇਕਵਚਨ -> ਇੱਕ", "ਬਹੁਵਚਨ -> ਇੱਕ ਤੋਂ ਵੱਧ"],
      steps: [
        "ਪਹਿਲਾਂ ਵੇਖੋ ਕਿ ਦਿੱਤਾ ਸ਼ਬਦ ਇਕਵਚਨ ਹੈ ਜਾਂ ਬਹੁਵਚਨ।",
        "ਹੁਣ ਉਸਦਾ ਉਲਟ ਵਚਨ ਬਣਾਓ।",
        "ਫਿਰ ਨਵੇਂ ਰੂਪ ਨੂੰ ਵਾਕ ਵਿੱਚ ਵਰਤ ਕੇ ਜਾਂਚੋ।"
      ],
      exampleTitle: "ਵਚਨ ਬਦਲੋ ਉਦਾਹਰਨ",
      exampleSteps: ["ਮੁੰਡਾ -> ਮੁੰਡੇ", "ਕੁੜੀ -> ਕੁੜੀਆਂ", "ਕਿਤਾਬ -> ਕਿਤਾਬਾਂ"]
    },
    noteSpeech: [
      "ਵਚਨ ਬਦਲੋ ਵਾਲੇ ਪ੍ਰਸ਼ਨਾਂ ਵਿੱਚ ਸਹੀ ਰੂਪ ਦੀ ਪਛਾਣ ਬਹੁਤ ਜ਼ਰੂਰੀ ਹੁੰਦੀ ਹੈ।",
      "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਇਹ ਵੇਖਣਾ ਹੁੰਦਾ ਹੈ ਕਿ ਸ਼ਬਦ ਇੱਕ ਲਈ ਹੈ ਜਾਂ ਇੱਕ ਤੋਂ ਵੱਧ ਲਈ।",
      "ਉਸ ਤੋਂ ਬਾਅਦ ਉਸਦਾ ਢੰਗ ਦਾ ਵਚਨ-ਰੂਪ ਬਣਾਇਆ ਜਾਂਦਾ ਹੈ।"
    ],
    formulaSpeech: ["ਇਕਵਚਨ ਇੱਕ ਦਾ ਬੋਧ ਕਰਾਉਂਦਾ ਹੈ।", "ਬਹੁਵਚਨ ਇੱਕ ਤੋਂ ਵੱਧ ਦਾ ਬੋਧ ਕਰਾਉਂਦਾ ਹੈ।"],
    stepSpeech: ["ਪਹਿਲਾਂ ਦਿੱਤੇ ਸ਼ਬਦ ਦੀ ਗਿਣਤੀ ਪਛਾਣੋ।", "ਫਿਰ ਉਸ ਦਾ ਵਿਰੋਧੀ ਵਚਨ-ਰੂਪ ਬਣਾਓ।", "ਅੰਤ ਵਿੱਚ ਉਸ ਰੂਪ ਨੂੰ ਵਾਕ ਵਿੱਚ ਰੱਖ ਕੇ ਵੇਖੋ ਕਿ ਉਹ ਠੀਕ ਲੱਗਦਾ ਹੈ ਜਾਂ ਨਹੀਂ।"],
    exampleSpeech: "ਆਓ ਕੁਝ ਸੌਖੀਆਂ ਉਦਾਹਰਨਾਂ ਨਾਲ ਵਚਨ ਬਦਲਣਾ ਅਭਿਆਸ ਕਰੀਏ।",
    recapSpeech: "ਦੁਹਰਾਈ: ਵਚਨ ਬਦਲੋ ਵਿੱਚ ਅਸੀਂ ਸ਼ਬਦ ਦਾ ਇਕਵਚਨ ਅਤੇ ਬਹੁਵਚਨ ਰੂਪ ਠੀਕ ਤਰ੍ਹਾਂ ਲਿਖਣਾ ਸਿੱਖਦੇ ਹਾਂ।",
    recapBoardText: "ਯਾਦ ਰੱਖੋ: ਪਹਿਲਾਂ ਗਿਣਤੀ ਪਛਾਣੋ, ਫਿਰ ਰੂਪ ਬਦਲੋ।",
    recapPoints: ["ਵਚਨ ਬਦਲੋ ਵਿੱਚ ਸ਼ਬਦ ਦਾ ਰੂਪ ਬਦਲਦਾ ਹੈ।", "ਇਕਵਚਨ ਅਤੇ ਬਹੁਵਚਨ ਦੀ ਪਛਾਣ ਜ਼ਰੂਰੀ ਹੈ।", "ਸਹੀ ਰੂਪ ਨੂੰ ਵਾਕ ਵਿੱਚ ਵਰਤ ਕੇ ਜਾਂਚਿਆ ਜਾ ਸਕਦਾ ਹੈ।"],
    practiceQuestion: "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਹੇਠਾਂ ਦਿੱਤੇ ਸ਼ਬਦਾਂ ਦੇ ਵਚਨ ਬਦਲੋ - ਮੁੰਡਾ, ਬੱਚੀ, ਪੰਛੀ, ਰੁੱਖ।",
    diagramInstructions: [],
    diagramActions: [
      { id: "diagram-box-word", type: "DRAW_BOX", lane: "diagram", label: "ਸ਼ਬਦ", text: "ਦਿੱਤਾ ਰੂਪ", accent: "important" },
      { id: "diagram-arrow-change", type: "DRAW_ARROW", lane: "diagram", fromLabel: "ਸ਼ਬਦ", toLabel: "ਨਵਾਂ ਰੂਪ", text: "ਵਚਨ ਬਦਲੋ" },
      { id: "diagram-box-new", type: "DRAW_BOX", lane: "diagram", label: "ਨਵਾਂ ਰੂਪ", text: "ਇਕਵਚਨ / ਬਹੁਵਚਨ", accent: "example" }
    ]
  };
};

const relationWordsLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  return {
    boardPayload: {
      boardTitle: shortBoardTitle("ਸੰਬੰਧੀ ਸ਼ਬਦ", boardLanguage),
      boardLines: [
        "ਸੰਬੰਧੀ ਸ਼ਬਦ ਉਹ ਸ਼ਬਦ ਹੁੰਦੇ ਹਨ ਜੋ ਦੋ ਨਾਮਾਂ ਜਾਂ ਵਿਚਾਰਾਂ ਵਿਚਕਾਰ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ।",
        "ਇਹ ਸ਼ਬਦ ਵਾਕ ਵਿੱਚ ਜਗ੍ਹਾ, ਸਮਾਂ, ਦਿਸ਼ਾ ਜਾਂ ਸਬੰਧ ਨੂੰ ਸਾਫ਼ ਕਰਦੇ ਹਨ।",
        "ਉਦਾਹਰਨ: ਦੇ ਨਾਲ, ਦੇ ਕੋਲ, ਦੇ ਅੱਗੇ, ਦੇ ਪਿੱਛੇ।"
      ],
      formulas: ["ਨਾਮ + ਸੰਬੰਧੀ ਸ਼ਬਦ + ਨਾਮ", "ਸਹੀ ਸੰਬੰਧੀ ਸ਼ਬਦ ਨਾਲ ਵਾਕ ਦਾ ਅਰਥ ਸਪਸ਼ਟ ਹੁੰਦਾ ਹੈ"],
      steps: [
        "ਪਹਿਲਾਂ ਵੇਖੋ ਕਿ ਵਾਕ ਵਿੱਚ ਕਿਹੜੇ ਦੋ ਸ਼ਬਦਾਂ ਦਾ ਰਿਸ਼ਤਾ ਦੱਸਣਾ ਹੈ।",
        "ਹੁਣ ਢੰਗ ਦਾ ਸੰਬੰਧੀ ਸ਼ਬਦ ਚੁਣੋ।",
        "ਅੰਤ ਵਿੱਚ ਪੂਰਾ ਵਾਕ ਪੜ੍ਹ ਕੇ ਜਾਂਚੋ ਕਿ ਅਰਥ ਸਹੀ ਬਣ ਰਿਹਾ ਹੈ ਜਾਂ ਨਹੀਂ।"
      ],
      exampleTitle: "ਸੰਬੰਧੀ ਸ਼ਬਦ ਦੀ ਉਦਾਹਰਨ",
      exampleSteps: [
        "ਕਿਤਾਬ ਮੇਜ਼ ਤੇ ਪਈ ਹੈ।",
        "ਬੱਚਾ ਘਰ ਦੇ ਅੰਦਰ ਬੈਠਾ ਹੈ।",
        "ਸਕੂਲ ਦੇ ਸਾਹਮਣੇ ਬਾਗ ਹੈ।"
      ]
    },
    noteSpeech: [
      pickLanguage(explanationLanguage, "Relational words show the connection between two words in a sentence.", "संबंधी शब्द वाक्य में दो शब्दों के बीच का संबंध बताते हैं।", "ਸੰਬੰਧੀ ਸ਼ਬਦ ਵਾਕ ਵਿੱਚ ਦੋ ਸ਼ਬਦਾਂ ਦੇ ਵਿਚਕਾਰਲਾ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "They help us understand place, direction, time, or position more clearly.", "इनकी मदद से हमें स्थान, दिशा, समय या स्थिति का पता साफ़ लगता है।", "ਇਨ੍ਹਾਂ ਦੀ ਮਦਦ ਨਾਲ ਸਾਨੂੰ ਜਗ੍ਹਾ, ਦਿਸ਼ਾ, ਸਮਾਂ ਜਾਂ ਸਥਿਤੀ ਬਾਰੇ ਸਪਸ਼ਟ ਜਾਣਕਾਰੀ ਮਿਲਦੀ ਹੈ।"),
      pickLanguage(explanationLanguage, "So while reading a sentence, pay attention to how one noun is linked with another.", "इसलिए वाक्य पढ़ते समय देखो कि एक नाम दूसरे नाम से कैसे जुड़ रहा है।", "ਇਸ ਲਈ ਵਾਕ ਪੜ੍ਹਦੇ ਸਮੇਂ ਵੇਖੋ ਕਿ ਇੱਕ ਨਾਮ ਦੂਜੇ ਨਾਮ ਨਾਲ ਕਿਵੇਂ ਜੁੜ ਰਿਹਾ ਹੈ।")
    ],
    formulaSpeech: [
      pickLanguage(explanationLanguage, "A relational word usually sits between two parts of a sentence and makes their relation clear.", "संबंधी शब्द अक्सर वाक्य के दो भागों के बीच आकर उनका संबंध स्पष्ट करता है।", "ਸੰਬੰਧੀ ਸ਼ਬਦ ਅਕਸਰ ਵਾਕ ਦੇ ਦੋ ਹਿੱਸਿਆਂ ਦੇ ਵਿਚਕਾਰ ਆ ਕੇ ਉਨ੍ਹਾਂ ਦਾ ਸੰਬੰਧ ਸਪਸ਼ਟ ਕਰਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "Choose the word that matches the exact relation shown in the sentence.", "वही शब्द चुनो जो वाक्य में सही संबंध दिखाए।", "ਉਹੀ ਸ਼ਬਦ ਚੁਣੋ ਜੋ ਵਾਕ ਵਿੱਚ ਸਹੀ ਸੰਬੰਧ ਦਿਖਾਏ।")
    ],
    stepSpeech: [
      pickLanguage(explanationLanguage, "First identify which two words or ideas are being connected.", "सबसे पहले पहचानो कि कौन-से दो शब्द या विचार जुड़े हुए हैं।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਪਛਾਣੋ ਕਿ ਕਿਹੜੇ ਦੋ ਸ਼ਬਦ ਜਾਂ ਵਿਚਾਰ ਆਪਸ ਵਿੱਚ ਜੁੜੇ ਹੋਏ ਹਨ।"),
      pickLanguage(explanationLanguage, "Then choose the relational word that best fits that connection.", "फिर उस संबंध के अनुसार सही संबंधी शब्द चुनो।", "ਫਿਰ ਉਸ ਰਿਸ਼ਤੇ ਦੇ ਅਨੁਸਾਰ ਸਹੀ ਸੰਬੰਧੀ ਸ਼ਬਦ ਚੁਣੋ।"),
      pickLanguage(explanationLanguage, "Finally read the full sentence to confirm that the meaning sounds natural and correct.", "अंत में पूरा वाक्य पढ़कर देखो कि अर्थ स्वाभाविक और सही बन रहा है या नहीं।", "ਅੰਤ ਵਿੱਚ ਪੂਰਾ ਵਾਕ ਪੜ੍ਹ ਕੇ ਵੇਖੋ ਕਿ ਅਰਥ ਸੁਭਾਵਿਕ ਅਤੇ ਸਹੀ ਬਣ ਰਿਹਾ ਹੈ ਜਾਂ ਨਹੀਂ।")
    ],
    exampleSpeech: pickLanguage(explanationLanguage, "These short examples show how relational words make sentence meaning more precise.", "ये छोटे उदाहरण दिखाते हैं कि संबंधी शब्द वाक्य का अर्थ कैसे अधिक स्पष्ट बनाते हैं।", "ਇਹ ਛੋਟੀਆਂ ਉਦਾਹਰਨਾਂ ਦਿਖਾਉਂਦੀਆਂ ਹਨ ਕਿ ਸੰਬੰਧੀ ਸ਼ਬਦ ਵਾਕ ਦਾ ਅਰਥ ਕਿਵੇਂ ਹੋਰ ਸਪਸ਼ਟ ਬਣਾਉਂਦੇ ਹਨ।"),
    recapSpeech: pickLanguage(explanationLanguage, "Recap: relational words tell us the connection between words, especially place, position, or direction.", "पुनरावृत्ति: संबंधी शब्द हमें शब्दों के बीच का संबंध बताते हैं, खासकर स्थान, स्थिति या दिशा।", "ਦੁਹਰਾਈ: ਸੰਬੰਧੀ ਸ਼ਬਦ ਸਾਨੂੰ ਸ਼ਬਦਾਂ ਦੇ ਵਿਚਕਾਰਲਾ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ, ਖ਼ਾਸ ਕਰਕੇ ਜਗ੍ਹਾ, ਸਥਿਤੀ ਜਾਂ ਦਿਸ਼ਾ।"),
    recapBoardText: pickLanguage(boardLanguage, "ਯਾਦ ਰੱਖੋ: ਸਹੀ ਸੰਬੰਧੀ ਸ਼ਬਦ ਨਾਲ ਅਰਥ ਸਪਸ਼ਟ ਹੁੰਦਾ ਹੈ।", "याद रखो: सही संबंधी शब्द से अर्थ स्पष्ट होता है।", "ਯਾਦ ਰੱਖੋ: ਸਹੀ ਸੰਬੰਧੀ ਸ਼ਬਦ ਨਾਲ ਅਰਥ ਸਪਸ਼ਟ ਹੁੰਦਾ ਹੈ।"),
    recapPoints: [
      pickLanguage(explanationLanguage, "Relational words show how two words are connected.", "संबंधी शब्द दो शब्दों का संबंध बताते हैं।", "ਸੰਬੰਧੀ ਸ਼ਬਦ ਦੋ ਸ਼ਬਦਾਂ ਦਾ ਰਿਸ਼ਤਾ ਦੱਸਦੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "They are useful for place, direction, and position.", "ये स्थान, दिशा और स्थिति बताने में उपयोगी होते हैं।", "ਇਹ ਜਗ੍ਹਾ, ਦਿਸ਼ਾ ਅਤੇ ਸਥਿਤੀ ਦੱਸਣ ਵਿੱਚ ਮਦਦਗਾਰ ਹੁੰਦੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "Use the word that makes the sentence meaning exact and natural.", "उसी शब्द का प्रयोग करो जो वाक्य का अर्थ सही और स्वाभाविक बनाए।", "ਉਸੇ ਸ਼ਬਦ ਦੀ ਵਰਤੋਂ ਕਰੋ ਜੋ ਵਾਕ ਦਾ ਅਰਥ ਸਹੀ ਅਤੇ ਸੁਭਾਵਿਕ ਬਣਾਏ।")
    ],
    practiceQuestion: pickLanguage(explanationLanguage, "Practice question: Fill in suitable relational words in these sentences and read them aloud.", "अभ्यास प्रश्न: दिए गए वाक्यों में उचित संबंधी शब्द भरो और उन्हें पढ़ो।", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਦਿੱਤੇ ਵਾਕਾਂ ਵਿੱਚ ਢੰਗ ਦੇ ਸੰਬੰਧੀ ਸ਼ਬਦ ਭਰੋ ਅਤੇ ਉਨ੍ਹਾਂ ਨੂੰ ਪੜ੍ਹੋ।"),
    diagramInstructions: [],
    diagramActions: [
      { id: "diagram-box-first-noun", type: "DRAW_BOX", lane: "diagram", label: "ਪਹਿਲਾ ਨਾਮ", text: "ਜਿਵੇਂ ਕਿਤਾਬ", accent: "important" },
      { id: "diagram-arrow-relation", type: "DRAW_ARROW", lane: "diagram", fromLabel: "ਪਹਿਲਾ ਨਾਮ", toLabel: "ਦੂਜਾ ਨਾਮ", text: "ਸੰਬੰਧੀ ਸ਼ਬਦ" },
      { id: "diagram-box-second-noun", type: "DRAW_BOX", lane: "diagram", label: "ਦੂਜਾ ਨਾਮ", text: "ਜਿਵੇਂ ਮੇਜ਼", accent: "example" }
    ]
  };
};

const democracyFeaturesLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const explanationLanguage = context.explanationLanguage;
  const topic = localizedTopicLabel("Features of Democracy", "लोकतंत्र की विशेषताएँ", "ਲੋਕਤੰਤਰ ਦੀਆਂ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ", boardLanguage);
  return {
    boardPayload: {
      boardTitle: shortBoardTitle(topic, boardLanguage),
      boardLines: [
        pickLanguage(boardLanguage, "In democracy, people choose their representatives.", "लोकतंत्र में जनता अपने प्रतिनिधि चुनती है।", "ਲੋਕਤੰਤਰ ਵਿੱਚ ਲੋਕ ਆਪਣੇ ਪ੍ਰਤੀਨਿਧੀ ਚੁਣਦੇ ਹਨ।"),
        pickLanguage(boardLanguage, "Democracy is based on equality, freedom, and accountability.", "लोकतंत्र समानता, स्वतंत्रता और जवाबदेही पर आधारित है।", "ਲੋਕਤੰਤਰ ਸਮਾਨਤਾ, ਆਜ਼ਾਦੀ ਅਤੇ ਜਵਾਬਦੇਹੀ 'ਤੇ ਆਧਾਰਿਤ ਹੈ।"),
        pickLanguage(boardLanguage, "Government works according to the Constitution and public opinion.", "सरकार संविधान और जनमत के अनुसार काम करती है।", "ਸਰਕਾਰ ਸੰਵਿਧਾਨ ਅਤੇ ਲੋਕ-ਰਾਇ ਦੇ ਅਨੁਸਾਰ ਕੰਮ ਕਰਦੀ ਹੈ।"),
      ],
      formulas: [pickLanguage(boardLanguage, "People -> Election -> Government -> Accountability", "जनता -> चुनाव -> सरकार -> जवाबदेही", "ਲੋਕ -> ਚੋਣ -> ਸਰਕਾਰ -> ਜਵਾਬਦੇਹੀ")],
      steps: [
        pickLanguage(boardLanguage, "First note that power finally rests with the people.", "सबसे पहले ध्यान दो कि अंतिम शक्ति जनता के पास होती है।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਧਿਆਨ ਦਿਓ ਕਿ ਅੰਤਿਮ ਸ਼ਕਤੀ ਲੋਕਾਂ ਕੋਲ ਹੁੰਦੀ ਹੈ।"),
        pickLanguage(boardLanguage, "Then list the main features one by one.", "फिर मुख्य विशेषताएँ एक-एक करके लिखो।", "ਫਿਰ ਮੁੱਖ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਇੱਕ-ਇੱਕ ਕਰਕੇ ਲਿਖੋ।"),
        pickLanguage(boardLanguage, "Finally relate them to good governance.", "अंत में इन्हें अच्छे शासन से जोड़ो।", "ਅੰਤ ਵਿੱਚ ਇਨ੍ਹਾਂ ਨੂੰ ਚੰਗੇ ਸ਼ਾਸਨ ਨਾਲ ਜੋੜੋ।"),
      ],
      exampleTitle: pickLanguage(boardLanguage, "Worked Example", "हल किया उदाहरण", "ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ"),
      exampleSteps: [
        pickLanguage(boardLanguage, "Citizens vote to choose their government.", "नागरिक मतदान करके अपनी सरकार चुनते हैं।", "ਨਾਗਰਿਕ ਵੋਟ ਪਾ ਕੇ ਆਪਣੀ ਸਰਕਾਰ ਚੁਣਦੇ ਹਨ।"),
        pickLanguage(boardLanguage, "If the government does not work well, people can question it.", "यदि सरकार सही काम न करे, तो जनता उससे प्रश्न कर सकती है।", "ਜੇ ਸਰਕਾਰ ਠੀਕ ਕੰਮ ਨਾ ਕਰੇ, ਤਾਂ ਲੋਕ ਉਸ ਤੋਂ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹਨ।"),
      ],
    },
    noteSpeech: [
      pickLanguage(explanationLanguage, "These features show why democracy is considered a people-centered system.", "ये विशेषताएँ बताती हैं कि लोकतंत्र को जनता-केन्द्रित व्यवस्था क्यों कहा जाता है।", "ਇਹ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਦੱਸਦੀਆਂ ਹਨ ਕਿ ਲੋਕਤੰਤਰ ਨੂੰ ਲੋਕ-ਕੇਂਦਰਿਤ ਪ੍ਰਣਾਲੀ ਕਿਉਂ ਕਿਹਾ ਜਾਂਦਾ ਹੈ।"),
      pickLanguage(explanationLanguage, "Its major features include elections, equality, freedom, and accountability.", "इसकी प्रमुख विशेषताओं में चुनाव, समानता, स्वतंत्रता और जवाबदेही शामिल हैं।", "ਇਸ ਦੀਆਂ ਮੁੱਖ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਵਿੱਚ ਚੋਣਾਂ, ਸਮਾਨਤਾ, ਆਜ਼ਾਦੀ ਅਤੇ ਜਵਾਬਦੇਹੀ ਸ਼ਾਮਲ ਹਨ।"),
      pickLanguage(explanationLanguage, "These features help prevent misuse of power.", "ये विशेषताएँ सत्ता के दुरुपयोग को रोकने में मदद करती हैं।", "ਇਹ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਸੱਤਾ ਦੇ ਦੁਰਪਯੋਗ ਨੂੰ ਰੋਕਣ ਵਿੱਚ ਮਦਦ ਕਰਦੀਆਂ ਹਨ।"),
    ],
    formulaSpeech: [pickLanguage(explanationLanguage, "This flow shows the main democratic chain from people to accountable government.", "यह क्रम जनता से जवाबदेह सरकार तक की लोकतांत्रिक कड़ी दिखाता है।", "ਇਹ ਕ੍ਰਮ ਲੋਕਾਂ ਤੋਂ ਜਵਾਬਦੇਹ ਸਰਕਾਰ ਤੱਕ ਦੀ ਲੋਕਤੰਤਰਕ ਕੜੀ ਦਿਖਾਉਂਦਾ ਹੈ।")],
    stepSpeech: [
      pickLanguage(explanationLanguage, "सबसे पहले लोकतंत्र का केंद्र जनता को मानो।", "सबसे पहले लोकतंत्र का केंद्र जनता को मानो।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਲੋਕਤੰਤਰ ਦਾ ਕੇਂਦਰ ਲੋਕਾਂ ਨੂੰ ਮੰਨੋ।"),
      pickLanguage(explanationLanguage, "फिर इसकी मुख्य विशेषताओं को क्रम से समझो।", "फिर इसकी मुख्य विशेषताओं को क्रम से समझो।", "ਫਿਰ ਇਸ ਦੀਆਂ ਮੁੱਖ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਨੂੰ ਕ੍ਰਮ ਨਾਲ ਸਮਝੋ।"),
      pickLanguage(explanationLanguage, "अंत में समझो कि ये विशेषताएँ शासन को कैसे बेहतर बनाती हैं।", "अंत में समझो कि ये विशेषताएँ शासन को कैसे बेहतर बनाती हैं।", "ਅੰਤ ਵਿੱਚ ਸਮਝੋ ਕਿ ਇਹ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਸ਼ਾਸਨ ਨੂੰ ਕਿਵੇਂ ਵਧੀਆ ਬਣਾਉਂਦੀਆਂ ਹਨ।"),
    ],
    exampleSpeech: pickLanguage(explanationLanguage, "A simple election example connects these features with real life.", "चुनाव का सरल उदाहरण इन विशेषताओं को जीवन से जोड़ देता है।", "ਚੋਣ ਦੀ ਸੌਖੀ ਉਦਾਹਰਨ ਇਹ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਨੂੰ ਅਸਲ ਜੀਵਨ ਨਾਲ ਜੋੜ ਦਿੰਦੀ ਹੈ।"),
    recapSpeech: pickLanguage(explanationLanguage, "Recap: democracy is identified by elections, equality, freedom, and public accountability.", "पुनरावृत्ति: लोकतंत्र की पहचान चुनाव, समानता, स्वतंत्रता और जनता के प्रति जवाबदेही से होती है।", "ਦੁਹਰਾਈ: ਲੋਕਤੰਤਰ ਦੀ ਪਛਾਣ ਚੋਣਾਂ, ਸਮਾਨਤਾ, ਆਜ਼ਾਦੀ ਅਤੇ ਲੋਕਾਂ ਪ੍ਰਤੀ ਜਵਾਬਦੇਹੀ ਨਾਲ ਹੁੰਦੀ ਹੈ।"),
    recapBoardText: pickLanguage(boardLanguage, "Remember: people, equality, freedom, accountability", "याद रखो: जनता, समानता, स्वतंत्रता, जवाबदेही", "ਯਾਦ ਰੱਖੋ: ਲੋਕ, ਸਮਾਨਤਾ, ਆਜ਼ਾਦੀ, ਜਵਾਬਦੇਹੀ"),
    recapPoints: [
      pickLanguage(explanationLanguage, "लोकतंत्र में जनता महत्वपूर्ण होती है।", "लोकतंत्र में जनता महत्वपूर्ण होती है।", "ਲੋਕਤੰਤਰ ਵਿੱਚ ਲੋਕ ਸਭ ਤੋਂ ਮਹੱਤਵਪੂਰਨ ਹੁੰਦੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "चुनाव और जवाबदेही इसकी मुख्य विशेषताएँ हैं।", "चुनाव और जवाबदेही इसकी मुख्य विशेषताएँ हैं।", "ਚੋਣਾਂ ਅਤੇ ਜਵਾਬਦੇਹੀ ਇਸ ਦੀਆਂ ਮੁੱਖ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਹਨ।"),
      pickLanguage(explanationLanguage, "स्वतंत्रता और समानता लोकतंत्र को मज़बूत बनाती हैं।", "स्वतंत्रता और समानता लोकतंत्र को मज़बूत बनाती हैं।", "ਆਜ਼ਾਦੀ ਅਤੇ ਸਮਾਨਤਾ ਲੋਕਤੰਤਰ ਨੂੰ ਮਜ਼ਬੂਤ ਬਣਾਉਂਦੀਆਂ ਹਨ।"),
    ],
    practiceQuestion: pickLanguage(explanationLanguage, "Practice question: Write any three features of democracy and explain one of them.", "अभ्यास प्रश्न: लोकतंत्र की कोई तीन विशेषताएँ लिखो और उनमें से एक को समझाओ।", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਲੋਕਤੰਤਰ ਦੀਆਂ ਕੋਈ ਤਿੰਨ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ ਲਿਖੋ ਅਤੇ ਉਨ੍ਹਾਂ ਵਿੱਚੋਂ ਇੱਕ ਨੂੰ ਸਮਝਾਓ।"),
    diagramInstructions: [],
    diagramActions: [
      { id: "diagram-box-people", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "People", "जनता", "ਲੋਕ"), text: pickLanguage(boardLanguage, "Choose representatives", "प्रतिनिधि चुनते हैं", "ਪ੍ਰਤੀਨਿਧੀ ਚੁਣਦੇ ਹਨ"), accent: "important" },
      { id: "diagram-arrow-election", type: "DRAW_ARROW", lane: "diagram", fromLabel: pickLanguage(boardLanguage, "People", "जनता", "ਲੋਕ"), toLabel: pickLanguage(boardLanguage, "Government", "सरकार", "ਸਰਕਾਰ"), text: pickLanguage(boardLanguage, "Election", "चुनाव", "ਚੋਣ") },
      { id: "diagram-box-accountability", type: "DRAW_BOX", lane: "diagram", label: pickLanguage(boardLanguage, "Government", "सरकार", "ਸਰਕਾਰ"), text: pickLanguage(boardLanguage, "Works with accountability", "जवाबदेही से काम करती है", "ਜਵਾਬਦੇਹੀ ਨਾਲ ਕੰਮ ਕਰਦੀ ਹੈ"), accent: "important" }
    ]
  };
};

const plannerToLessonContent = (
  context: LiveBoardContext,
  family: LiveBoardSubjectFamily,
  planned: PlannerLesson
): LiveBoardLessonContent => {
  const boardLines = planned.boardLines.slice(0, 4);
  const formulas = planned.formulas.slice(0, 3);
  const steps = planned.steps.slice(0, 4);
  const noteSpeech = planned.noteSpeech.slice(0, boardLines.length);
  while (noteSpeech.length < boardLines.length) noteSpeech.push(boardLines[noteSpeech.length]);
  const formulaSpeech = planned.formulaSpeech.slice(0, formulas.length);
  while (formulaSpeech.length < formulas.length) formulaSpeech.push(formulas[formulaSpeech.length]);
  const stepSpeech = planned.stepSpeech.slice(0, steps.length);
  while (stepSpeech.length < steps.length) stepSpeech.push(steps[stepSpeech.length]);
  const diagramActions = buildDiagramActions(planned.diagramPlan, context.boardLanguage, family);
  return {
    boardPayload: {
      boardTitle: planned.boardTitle,
      boardLines,
      formulas,
      steps,
      exampleTitle: planned.exampleTitle,
      exampleSteps: planned.exampleSteps.slice(0, 3),
    },
    noteSpeech,
    formulaSpeech,
    stepSpeech,
    exampleSpeech: planned.exampleSpeech,
    recapSpeech: planned.recapSpeech,
    recapBoardText: planned.recapBoardText,
    recapPoints: planned.recapPoints.slice(0, 4),
    practiceQuestion: planned.practiceQuestion,
    diagramInstructions: diagramActions.map((item) => item.text || item.label || "").filter(Boolean),
    diagramActions,
  };
};

let openaiClient: OpenAI | null = null;

const getOpenAiClient = (): OpenAI => {
  if (openaiClient) return openaiClient;
  const apiKey = normalize(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
};

const getPlannerModel = (): string =>
  normalize(process.env.OPENAI_TUITION_PLANNER_MODEL) ||
  normalize(process.env.OPENAI_TRANSLATION_MODEL) ||
  "gpt-4o-mini";

const buildFamilyPrompt = (family: LiveBoardSubjectFamily, topic: string): string => {
  switch (family) {
    case "SCIENCE":
      return `Teach ${topic} as a school science topic. Include a real definition, 2 key explanatory points, a relevant rule, relation, or process if suitable, one concrete school example, one recap, and one practice question.`;
    case "MATHS":
      return `Teach ${topic} as a school maths topic. Include a real definition, a real rule, standard form, or formula if suitable, one actual solved example with numeric steps, one recap, and one practice question.`;
    case "LANGUAGE":
      return `Teach ${topic} as a language or grammar topic. Include the real rule or meaning, examples, sentence usage, one recap, and one practice question.`;
    case "SST":
      return `Teach ${topic} as a social studies topic. Include a real definition, key points, cause-effect or structure if suitable, one real example, one recap, and one practice question.`;
    case "COMPUTER":
      return `Teach ${topic} as a school computer topic. Include a real definition, how it works, one practical example, one recap, and one practice question.`;
    default:
      return `Teach ${topic} as a school topic with a real definition, key points, one example, one recap, and one practice question.`;
  }
};

const buildPlannerInstructions = (context: LiveBoardContext, family: LiveBoardSubjectFamily): string =>
  [
    "You are generating a live board teacher lesson in structured JSON for a school tutoring system.",
    buildFamilyPrompt(family, context.topicTitle),
    `Teaching depth: ${context.teachingDepth}.`,
    `Subject family: ${familyLabel(family)}.`,
    `Subject: ${localizeLiveBoardSubjectLabel(context.subjectName, context.explanationLanguage)}.`,
    `Topic: ${context.topicTitle}.`,
    `Explanation language: ${languageLabel(context.explanationLanguage)}.`,
    `Board writing language: ${languageLabel(context.boardLanguage)}.`,
    languageClassroomGuidance(context.explanationLanguage),
    `For board writing language, ${languageClassroomGuidance(context.boardLanguage)}`,
    "Return actual teaching content only. Do not write meta-instructions such as 'write the definition' or 'add one example'.",
    "Do not produce placeholder wording, robotic transitions, or teacher instructions written as lesson content.",
    "Use classroom-ready definitions, natural explanation, correct examples, and revision-friendly board notes.",
    getTeachingDepthPolicy(context.teachingDepth).explanationGuidance,
    getTeachingDepthPolicy(context.teachingDepth).boardGuidance,
    "Recap points must match the actual lesson content. Practice questions must test the exact taught idea.",
    "The boardTitle, boardLines, formulas, steps, exampleTitle, exampleSteps, recapBoardText, and diagramPlan must be in the board language.",
    "The noteSpeech, formulaSpeech, stepSpeech, exampleSpeech, recapSpeech, recapPoints, and practiceQuestion must be in the explanation language.",
    "For arbitrary topics, create a safe but topic-grounded school-level explanation.",
    "If a formula does not fit the topic, return an empty formulas array.",
    "If a diagram is not suitable, return null for diagramPlan.",
    "Do not mention AI, system prompts, or JSON.",
  ].join(" ");

const buildAiPlannedLesson = async (
  context: LiveBoardContext,
  family: LiveBoardSubjectFamily
): Promise<LiveBoardLessonContent> => {
  const response = await getOpenAiClient().responses.parse({
    model: getPlannerModel(),
    instructions: buildPlannerInstructions(context, family),
    input: `${context.subjectName} | ${context.topicTitle}`,
    text: {
      format: zodTextFormat(plannerLessonSchema, "tuition_live_board_lesson"),
    },
  });

  const planned = response.output_parsed;
  if (!planned) {
    throw new Error("Planner returned an empty lesson.");
  }
  if (!plannerMatchesRequestedTopic(context, planned)) {
    throw new Error("Planner returned off-topic lesson content.");
  }

  return plannerToLessonContent(context, family, planned);
};

export const buildTopicLessonContent = async (
  context: LiveBoardContext,
  family: LiveBoardSubjectFamily
): Promise<LiveBoardLessonContent> => {
  const topic = normalize(context.topicTitle);
  let lesson: LiveBoardLessonContent;

  if (family === "SCIENCE" && includesAny(topic, ["respiration", "श्वसन", "ਸ਼ਵਾਸ"])) {
    lesson = respirationLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "SCIENCE" && includesAny(topic, ["chemical reaction", "chemical reactions"])) {
    lesson = chemicalReactionLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "SCIENCE" && includesAny(topic, ["photosynthesis", "प्रकाश-संश्लेषण", "ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ"])) {
    lesson = photosynthesisLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "MATHS" && includesAny(topic, ["linear equation", "linear equations"])) {
    lesson = linearEquationLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "MATHS" && includesAny(topic, ["decimals", "decimal", "दशमलव", "ਦਸ਼ਮਲਵ"])) {
    lesson = decimalsLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "MATHS" && includesAny(topic, ["fractions", "fraction", "भिन्न", "ਭਿੰਨ"])) {
    lesson = fractionLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "LANGUAGE" && includesAny(topic, ["ਲਿੰਗ", "ling", "gender"])) {
    lesson = genderLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "LANGUAGE" && includesAny(topic, ["ਵਚਨ ਬਦਲੋ", "वचन बदलो", "change number"])) {
    lesson = numberChangeLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "LANGUAGE" && includesAny(topic, ["ਸੰਬੰਧੀ ਸ਼ਬਦ", "संबंधी शब्द", "relational words", "related words"])) {
    lesson = relationWordsLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "LANGUAGE" && includesAny(topic, ["ਵਚਨ", "number", "numbers in grammar", "वचन"])) {
    lesson = numberLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "SST" && includesAny(topic, ["federalism", "संघवाद", "ਸੰਘਵਾਦ"])) {
    lesson = federalismLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "SST" && includesAny(topic, ["लोकतंत्र की विशेषताएँ", "ਲੋਕਤੰਤਰ ਦੀਆਂ ਵਿਸ਼ੇਸ਼ਤਾਵਾਂ", "features of democracy"])) {
    lesson = democracyFeaturesLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  if (family === "SST" && includesAny(topic, ["democracy", "लोकतंत्र", "ਲੋਕਤੰਤਰ"])) {
    lesson = democracyLesson(context);
    return applyTeachingDepthPolicy(lesson, context);
  }

  try {
    lesson = await buildAiPlannedLesson(context, family);
  } catch {
    lesson = buildFallbackLesson(context, family);
  }

  return applyTeachingDepthPolicy(lesson, context);
};
