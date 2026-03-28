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
  boardLines: z.array(z.string().trim().min(1).max(500)).min(3).max(4),
  formulas: z.array(z.string().trim().min(1).max(250)).max(3),
  steps: z.array(z.string().trim().min(1).max(320)).min(3).max(4),
  exampleTitle: z.string().trim().min(1).max(200).nullable(),
  exampleSteps: z.array(z.string().trim().min(1).max(320)).min(1).max(3),
  noteSpeech: z.array(z.string().trim().min(1).max(500)).min(3).max(4),
  formulaSpeech: z.array(z.string().trim().min(1).max(400)).max(3),
  stepSpeech: z.array(z.string().trim().min(1).max(400)).min(3).max(4),
  exampleSpeech: z.string().trim().min(1).max(500),
  recapSpeech: z.string().trim().min(1).max(500),
  recapBoardText: z.string().trim().min(1).max(300),
  recapPoints: z.array(z.string().trim().min(1).max(220)).min(2).max(4),
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

const boardTitle = (topic: string, language: LiveBoardLanguage): string =>
  pickLanguage(language, `${topic} Teaching Board`, `${topic} शिक्षण बोर्ड`, `${topic} ਸਿਖਲਾਈ ਬੋਰਡ`);

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
  const topic = context.topicTitle;
  const subject = context.subjectName;
  return {
    boardPayload: {
      boardTitle: boardTitle(topic, boardLanguage),
      boardLines: [
        pickLanguage(
          boardLanguage,
          `${topic} is an important topic in ${subject}.`,
          `${topic} ${subject} का एक महत्वपूर्ण विषय है।`,
          `${topic} ${subject} ਦਾ ਇੱਕ ਮਹੱਤਵਪੂਰਨ ਵਿਸ਼ਾ ਹੈ।`
        ),
        pickLanguage(
          boardLanguage,
          `First understand the meaning of ${topic} in simple classroom language.`,
          `पहले ${topic} का अर्थ सरल कक्षा-भाषा में समझो।`,
          `ਸਭ ਤੋਂ ਪਹਿਲਾਂ ${topic} ਦਾ ਅਰਥ ਸੌਖੀ ਕਲਾਸ-ਭਾਸ਼ਾ ਵਿੱਚ ਸਮਝੋ।`
        ),
        pickLanguage(
          boardLanguage,
          `Then connect the concept with one clear example.`,
          `फिर इस विचार को एक साफ़ उदाहरण से जोड़ो।`,
          `ਫਿਰ ਇਸ ਵਿਚਾਰ ਨੂੰ ਇੱਕ ਸਾਫ਼ ਉਦਾਹਰਨ ਨਾਲ ਜੋੜੋ।`
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
        pickLanguage(boardLanguage, `Write the main idea of ${topic}.`, `${topic} का मुख्य विचार लिखो।`, `${topic} ਦਾ ਮੁੱਖ ਵਿਚਾਰ ਲਿਖੋ।`),
        pickLanguage(boardLanguage, "Add one important point.", "एक महत्वपूर्ण बिंदु जोड़ो।", "ਇੱਕ ਮਹੱਤਵਪੂਰਨ ਬਿੰਦੂ ਜੋੜੋ।"),
        pickLanguage(boardLanguage, "Support it with one example.", "इसे एक उदाहरण से समझाओ।", "ਇਸਨੂੰ ਇੱਕ ਉਦਾਹਰਨ ਨਾਲ ਸਮਝਾਓ।")
      ],
      exampleTitle: pickLanguage(boardLanguage, `${topic} Worked Example`, `${topic} हल किया उदाहरण`, `${topic} ਹੱਲ ਕੀਤਾ ਉਦਾਹਰਨ`),
      exampleSteps: [
        pickLanguage(boardLanguage, `Identify what the example is asking about ${topic}.`, `पहचानो कि उदाहरण ${topic} के बारे में क्या पूछ रहा है।`, `ਪਛਾਣੋ ਕਿ ਉਦਾਹਰਨ ${topic} ਬਾਰੇ ਕੀ ਪੁੱਛ ਰਿਹਾ ਹੈ।`),
        pickLanguage(boardLanguage, "Show the answer in a simple textbook style.", "उत्तर को सरल पाठ्यपुस्तक शैली में दिखाओ।", "ਉੱਤਰ ਨੂੰ ਸੌਖੀ ਪਾਠ-ਪੁਸਤਕ ਸ਼ੈਲੀ ਵਿੱਚ ਦਿਖਾਓ।")
      ]
    },
    noteSpeech: [],
    formulaSpeech: [],
    stepSpeech: [],
    exampleSpeech: pickLanguage(
      context.explanationLanguage,
      `Let us solve one simple example for ${topic}.`,
      `आओ ${topic} का एक सरल उदाहरण हल करें।`,
      `ਆਓ ${topic} ਦਾ ਇੱਕ ਸੌਖਾ ਉਦਾਹਰਨ ਹੱਲ ਕਰੀਏ।`
    ),
    recapSpeech: pickLanguage(
      context.explanationLanguage,
      `Recap the key idea of ${topic} and answer one practice question.`,
      `${topic} के मुख्य विचार की पुनरावृत्ति करो और एक अभ्यास प्रश्न हल करो।`,
      `${topic} ਦੇ ਮੁੱਖ ਵਿਚਾਰ ਦੀ ਦੁਹਰਾਈ ਕਰੋ ਅਤੇ ਇੱਕ ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ ਹੱਲ ਕਰੋ।`
    ),
    recapBoardText: pickLanguage(
      boardLanguage,
      `${topic} is best remembered through meaning, key point, and one example.`,
      `${topic} को अर्थ, मुख्य बिंदु और एक उदाहरण से याद रखा जाता है।`,
      `${topic} ਨੂੰ ਅਰਥ, ਮੁੱਖ ਬਿੰਦੂ ਅਤੇ ਇੱਕ ਉਦਾਹਰਨ ਨਾਲ ਚੰਗੀ ਤਰ੍ਹਾਂ ਯਾਦ ਰੱਖਿਆ ਜਾਂਦਾ ਹੈ।`
    ),
    recapPoints: [
      pickLanguage(context.explanationLanguage, `Understand the meaning of ${topic}.`, `${topic} का अर्थ समझो।`, `${topic} ਦਾ ਅਰਥ ਸਮਝੋ।`),
      pickLanguage(context.explanationLanguage, "Remember one main point and one example.", "एक मुख्य बिंदु और एक उदाहरण याद रखो।", "ਇੱਕ ਮੁੱਖ ਬਿੰਦੂ ਅਤੇ ਇੱਕ ਉਦਾਹਰਨ ਯਾਦ ਰੱਖੋ।")
    ],
    practiceQuestion: pickLanguage(
      context.explanationLanguage,
      `Practice: explain ${topic} in your own words with one example.`,
      `अभ्यास: ${topic} को अपने शब्दों में एक उदाहरण सहित समझाओ।`,
      `ਅਭਿਆਸ: ${topic} ਨੂੰ ਆਪਣੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਇੱਕ ਉਦਾਹਰਨ ਸਮੇਤ ਸਮਝਾਓ।`
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

  if (family === "SCIENCE") {
    return {
      boardPayload: {
        boardTitle: boardTitle(topic, boardLanguage),
        boardLines: [
          pickLanguage(boardLanguage, `${topic} is a science concept that explains a process, property, or change in the natural world.`, `${topic} विज्ञान का एक विचार है जो किसी प्रक्रिया, गुण या परिवर्तन को समझाता है।`, `${topic} ਵਿਗਿਆਨ ਦਾ ਇੱਕ ਵਿਚਾਰ ਹੈ ਜੋ ਕਿਸੇ ਪ੍ਰਕਿਰਿਆ, ਗੁਣ ਜਾਂ ਬਦਲਾਅ ਨੂੰ ਸਮਝਾਉਂਦਾ ਹੈ।`),
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
        pickLanguage(explanationLanguage, `${topic} explains an important science idea in the natural world.`, `${topic} विज्ञान की एक महत्वपूर्ण अवधारणा समझाता है।`, `${topic} ਵਿਗਿਆਨ ਦੀ ਇੱਕ ਮਹੱਤਵਪੂਰਨ ਧਾਰਨਾ ਨੂੰ ਸਮਝਾਉਂਦਾ ਹੈ।`),
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
        boardTitle: boardTitle(topic, boardLanguage),
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
        boardTitle: boardTitle(topic, boardLanguage),
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
        boardTitle: boardTitle(topic, boardLanguage),
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
          "A chemical reaction is a process in which one or more substances change into new substances.",
          "रासायनिक अभिक्रिया वह प्रक्रिया है जिसमें एक या अधिक पदार्थ बदलकर नए पदार्थ बनाते हैं।",
          "ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਉਹ ਪ੍ਰਕਿਰਿਆ ਹੈ ਜਿਸ ਵਿੱਚ ਇੱਕ ਜਾਂ ਵੱਧ ਪਦਾਰਥ ਬਦਲ ਕੇ ਨਵੇਂ ਪਦਾਰਥ ਬਣਾਉਂਦੇ ਹਨ।"
        ),
        pickLanguage(
          boardLanguage,
          "Common signs are change in colour, change in temperature, gas formation, and formation of a precipitate.",
          "सामान्य संकेत हैं रंग में परिवर्तन, तापमान में परिवर्तन, गैस बनना और अवक्षेप बनना।",
          "ਆਮ ਸੰਕੇਤ ਹਨ ਰੰਗ ਵਿੱਚ ਬਦਲਾਅ, ਤਾਪਮਾਨ ਵਿੱਚ ਬਦਲਾਅ, ਗੈਸ ਬਣਨਾ ਅਤੇ ਤਲਛਟ ਬਣਨਾ।"
        ),
        pickLanguage(
          boardLanguage,
          "Reactants are the starting substances and products are the new substances formed after the reaction.",
          "अभिकारक प्रारम्भिक पदार्थ होते हैं और उत्पाद वे नए पदार्थ होते हैं जो अभिक्रिया के बाद बनते हैं।",
          "ਅਭਿਕਾਰਕ ਸ਼ੁਰੂਆਤੀ ਪਦਾਰਥ ਹੁੰਦੇ ਹਨ ਅਤੇ ਉਤਪਾਦ ਉਹ ਨਵੇਂ ਪਦਾਰਥ ਹਨ ਜੋ ਕ੍ਰਿਆ ਤੋਂ ਬਾਅਦ ਬਣਦੇ ਹਨ।"
        )
      ],
      formulas: [
        pickLanguage(boardLanguage, "Reactants -> Products", "अभिकारक -> उत्पाद", "ਅਭਿਕਾਰਕ -> ਉਤਪਾਦ"),
        "Mg + O2 -> MgO"
      ],
      steps: [
        pickLanguage(boardLanguage, "Read the equation: magnesium reacts with oxygen.", "समीकरण पढ़ो: मैग्नीशियम ऑक्सीजन के साथ अभिक्रिया करता है।", "ਸਮੀਕਰਨ ਪੜ੍ਹੋ: ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸੀਜਨ ਨਾਲ ਕ੍ਰਿਆ ਕਰਦਾ ਹੈ।"),
        pickLanguage(boardLanguage, "Identify the reactants: magnesium and oxygen.", "अभिकारकों की पहचान करो: मैग्नीशियम और ऑक्सीजन।", "ਅਭਿਕਾਰਕ ਪਛਾਣੋ: ਮੈਗਨੀਸ਼ੀਅਮ ਅਤੇ ਆਕਸੀਜਨ।"),
        pickLanguage(boardLanguage, "Identify the product: magnesium oxide is formed.", "उत्पाद की पहचान करो: मैग्नीशियम ऑक्साइड बनता है।", "ਉਤਪਾਦ ਪਛਾਣੋ: ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ ਬਣਦਾ ਹੈ।")
      ],
      exampleTitle: pickLanguage(boardLanguage, "Burning Magnesium Ribbon", "मैग्नीशियम रिबन का जलना", "ਮੈਗਨੀਸ਼ੀਅਮ ਰਿਬਨ ਦਾ ਸੜਨਾ"),
      exampleSteps: [
        pickLanguage(boardLanguage, "Magnesium ribbon burns with a bright white flame.", "मैग्नीशियम रिबन चमकदार सफेद लौ के साथ जलता है।", "ਮੈਗਨੀਸ਼ੀਅਮ ਰਿਬਨ ਤੇਜ਼ ਸਫ਼ੈਦ ਲੌ ਨਾਲ ਸੜਦਾ ਹੈ।"),
        pickLanguage(boardLanguage, "A new white powder called magnesium oxide is formed.", "एक नया सफेद पाउडर बनता है जिसे मैग्नीशियम ऑक्साइड कहते हैं।", "ਇੱਕ ਨਵਾਂ ਸਫ਼ੈਦ ਚੂਰਾ ਬਣਦਾ ਹੈ ਜਿਸਨੂੰ ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ ਕਹਿੰਦੇ ਹਨ।"),
        pickLanguage(boardLanguage, "This proves that a new substance is formed, so it is a chemical reaction.", "यह सिद्ध करता है कि नया पदार्थ बना है, इसलिए यह रासायनिक अभिक्रिया है।", "ਇਹ ਸਾਬਤ ਕਰਦਾ ਹੈ ਕਿ ਨਵਾਂ ਪਦਾਰਥ ਬਣਿਆ ਹੈ, ਇਸ ਲਈ ਇਹ ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਹੈ।")
      ]
    },
    noteSpeech: [
      pickLanguage(explanationLanguage, "A chemical reaction changes old substances into new substances with new properties.", "रासायनिक अभिक्रिया में पुराने पदार्थ बदलकर नए गुणों वाले पदार्थ बनाते हैं।", "ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਵਿੱਚ ਪੁਰਾਣੇ ਪਦਾਰਥ ਬਦਲ ਕੇ ਨਵੇਂ ਗੁਣਾਂ ਵਾਲੇ ਪਦਾਰਥ ਬਣਦੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "We identify a chemical reaction through visible signs such as heat, colour change, gas, or precipitate.", "हम रासायनिक अभिक्रिया को ऊष्मा, रंग परिवर्तन, गैस या अवक्षेप जैसे संकेतों से पहचानते हैं।", "ਅਸੀਂ ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਨੂੰ ਤਾਪ, ਰੰਗ ਬਦਲਾਅ, ਗੈਸ ਜਾਂ ਤਲਛਟ ਵਰਗੇ ਸੰਕੇਤਾਂ ਨਾਲ ਪਛਾਣਦੇ ਹਾਂ।"),
      pickLanguage(explanationLanguage, "The substances before reaction are reactants and the new substances after reaction are products.", "अभिक्रिया से पहले के पदार्थ अभिकारक होते हैं और बाद में बनने वाले नए पदार्थ उत्पाद होते हैं।", "ਕ੍ਰਿਆ ਤੋਂ ਪਹਿਲਾਂ ਦੇ ਪਦਾਰਥ ਅਭਿਕਾਰਕ ਹੁੰਦੇ ਹਨ ਅਤੇ ਬਾਅਦ ਵਿੱਚ ਬਣੇ ਨਵੇਂ ਪਦਾਰਥ ਉਤਪਾਦ ਹੁੰਦੇ ਹਨ।")
    ],
    formulaSpeech: [
      pickLanguage(explanationLanguage, "This short form helps us remember that reactants change into products.", "यह संक्षिप्त रूप याद दिलाता है कि अभिकारक बदलकर उत्पाद बनते हैं।", "ਇਹ ਛੋਟਾ ਰੂਪ ਯਾਦ ਦਿਵਾਉਂਦਾ ਹੈ ਕਿ ਅਭਿਕਾਰਕ ਬਦਲ ਕੇ ਉਤਪਾਦ ਬਣਦੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "This equation shows magnesium reacting with oxygen to form magnesium oxide.", "यह समीकरण दिखाता है कि मैग्नीशियम ऑक्सीजन के साथ अभिक्रिया करके मैग्नीशियम ऑक्साइड बनाता है।", "ਇਹ ਸਮੀਕਰਨ ਦਿਖਾਉਂਦਾ ਹੈ ਕਿ ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸੀਜਨ ਨਾਲ ਕ੍ਰਿਆ ਕਰਕੇ ਮੈਗਨੀਸ਼ੀਅਮ ਆਕਸਾਈਡ ਬਣਾਉਂਦਾ ਹੈ।")
    ],
    stepSpeech: [
      pickLanguage(explanationLanguage, "First read the reaction carefully so you know which substances are taking part.", "पहले अभिक्रिया को ध्यान से पढ़ो ताकि पता चले कौन-कौन से पदार्थ भाग ले रहे हैं।", "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਕ੍ਰਿਆ ਧਿਆਨ ਨਾਲ ਪੜ੍ਹੋ ਤਾਂ ਕਿ ਪਤਾ ਲੱਗੇ ਕਿਹੜੇ ਪਦਾਰਥ ਹਿੱਸਾ ਲੈ ਰਹੇ ਹਨ।"),
      pickLanguage(explanationLanguage, "Now pick out the reactants written on the left side.", "अब बाईं ओर लिखे अभिकारकों की पहचान करो।", "ਹੁਣ ਖੱਬੇ ਪਾਸੇ ਲਿਖੇ ਅਭਿਕਾਰਕ ਪਛਾਣੋ।"),
      pickLanguage(explanationLanguage, "Finally identify the product on the right side and connect it to the observed change.", "अंत में दाईं ओर बने उत्पाद की पहचान करो और उसे देखे गए परिवर्तन से जोड़ो।", "ਅੰਤ ਵਿੱਚ ਸੱਜੇ ਪਾਸੇ ਬਣੇ ਉਤਪਾਦ ਦੀ ਪਛਾਣ ਕਰੋ ਅਤੇ ਉਸਨੂੰ ਦੇਖੇ ਗਏ ਬਦਲਾਅ ਨਾਲ ਜੋੜੋ।")
    ],
    exampleSpeech: pickLanguage(explanationLanguage, "Let us take the burning of magnesium ribbon as a real classroom example of a chemical reaction.", "आओ मैग्नीशियम रिबन के जलने को रासायनिक अभिक्रिया के वास्तविक कक्षा-उदाहरण के रूप में समझें।", "ਆਓ ਮੈਗਨੀਸ਼ੀਅਮ ਰਿਬਨ ਦੇ ਸੜਨ ਨੂੰ ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਦੇ ਅਸਲੀ ਕਲਾਸਰੂਮ ਉਦਾਹਰਨ ਵਜੋਂ ਸਮਝੀਏ।"),
    recapSpeech: pickLanguage(explanationLanguage, "Recap: a chemical reaction forms new substances, shows clear signs, and can be represented by an equation.", "पुनरावृत्ति: रासायनिक अभिक्रिया नए पदार्थ बनाती है, स्पष्ट संकेत दिखाती है और समीकरण से दर्शाई जा सकती है।", "ਦੁਹਰਾਈ: ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਨਵੇਂ ਪਦਾਰਥ ਬਣਾਉਂਦੀ ਹੈ, ਸਾਫ਼ ਸੰਕੇਤ ਦਿਖਾਉਂਦੀ ਹੈ ਅਤੇ ਸਮੀਕਰਨ ਨਾਲ ਦਰਸਾਈ ਜਾ ਸਕਦੀ ਹੈ।"),
    recapBoardText: pickLanguage(boardLanguage, "Remember: new substance formation is the key idea of a chemical reaction.", "याद रखो: नया पदार्थ बनना रासायनिक अभिक्रिया का मुख्य विचार है।", "ਯਾਦ ਰੱਖੋ: ਨਵਾਂ ਪਦਾਰਥ ਬਣਨਾ ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਦਾ ਮੁੱਖ ਵਿਚਾਰ ਹੈ।"),
    recapPoints: [
      pickLanguage(explanationLanguage, "A chemical reaction makes new substances.", "रासायनिक अभिक्रिया नए पदार्थ बनाती है।", "ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਨਵੇਂ ਪਦਾਰਥ ਬਣਾਉਂਦੀ ਹੈ।"),
      pickLanguage(explanationLanguage, "Signs include colour change, temperature change, gas, or precipitate.", "संकेतों में रंग परिवर्तन, ताप परिवर्तन, गैस या अवक्षेप शामिल हैं।", "ਸੰਕੇਤਾਂ ਵਿੱਚ ਰੰਗ ਬਦਲਾਅ, ਤਾਪ ਬਦਲਾਅ, ਗੈਸ ਜਾਂ ਤਲਛਟ ਸ਼ਾਮਲ ਹਨ।"),
      pickLanguage(explanationLanguage, "Reactants change into products.", "अभिकारक बदलकर उत्पाद बनते हैं।", "ਅਭਿਕਾਰਕ ਬਦਲ ਕੇ ਉਤਪਾਦ ਬਣਦੇ ਹਨ।")
    ],
    practiceQuestion: pickLanguage(explanationLanguage, "Practice question: Why is burning magnesium considered a chemical reaction?", "अभ्यास प्रश्न: मैग्नीशियम का जलना रासायनिक अभिक्रिया क्यों माना जाता है?", "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਮੈਗਨੀਸ਼ੀਅਮ ਦਾ ਸੜਨਾ ਰਸਾਇਣਕ ਕ੍ਰਿਆ ਕਿਉਂ ਮੰਨਿਆ ਜਾਂਦਾ ਹੈ?"),
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

const genderLesson = (context: LiveBoardContext): LiveBoardLessonContent => {
  const boardLanguage = context.boardLanguage;
  const topic = "ਲਿੰਗ";
  return {
    boardPayload: {
      boardTitle: boardTitle(topic, boardLanguage),
      boardLines: [
        "ਲਿੰਗ ਦੱਸਦਾ ਹੈ ਕਿ ਕੋਈ ਨਾਮ ਪੁਲਿੰਗ ਹੈ ਜਾਂ ਇਸਤ੍ਰੀਲਿੰਗ।",
        "ਪੰਜਾਬੀ ਵਿਆਕਰਣ ਵਿੱਚ ਲਿੰਗ ਸਹੀ ਨਾਮ-ਰੂਪ ਅਤੇ ਵਰਤੋਂ ਲਈ ਮਹੱਤਵਪੂਰਨ ਹੈ।",
        "ਉਦਾਹਰਨ: ਮੁੰਡਾ ਪੁਲਿੰਗ ਹੈ ਅਤੇ ਕੁੜੀ ਇਸਤ੍ਰੀਲਿੰਗ ਹੈ।"
      ],
      formulas: ["ਪੁਲਿੰਗ -> ਮੁੰਡਾ, ਘੋੜਾ", "ਇਸਤ੍ਰੀਲਿੰਗ -> ਕੁੜੀ, ਘੋੜੀ"],
      steps: [
        "ਸ਼ਬਦ ਵੇਖੋ ਅਤੇ ਪਤਾ ਕਰੋ ਕਿ ਇਹ ਕਿਸ ਬਾਰੇ ਬੋਲ ਰਿਹਾ ਹੈ।",
        "ਰੂਪ ਅਤੇ ਵਰਤੋਂ ਦੇ ਆਧਾਰ 'ਤੇ ਪੁਲਿੰਗ ਜਾਂ ਇਸਤ੍ਰੀਲਿੰਗ ਪਛਾਣੋ।",
        "ਇੱਕ ਠੀਕ ਵਾਕ ਵਿੱਚ ਇਸ ਸ਼ਬਦ ਦੀ ਵਰਤੋਂ ਕਰੋ।"
      ],
      exampleTitle: "ਲਿੰਗ ਉਦਾਹਰਨ",
      exampleSteps: ["ਮੁੰਡਾ ਖੇਡ ਰਿਹਾ ਹੈ। ਇੱਥੇ ਮੁੰਡਾ ਪੁਲਿੰਗ ਹੈ।", "ਕੁੜੀ ਪੜ੍ਹ ਰਹੀ ਹੈ। ਇੱਥੇ ਕੁੜੀ ਇਸਤ੍ਰੀਲਿੰਗ ਹੈ।"]
    },
    noteSpeech: [
      "ਲਿੰਗ ਸਾਨੂੰ ਇਹ ਸਮਝਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ ਕਿ ਕੋਈ ਨਾਮ ਪੁਲਿੰਗ ਹੈ ਜਾਂ ਇਸਤ੍ਰੀਲਿੰਗ।",
      "ਸਹੀ ਲਿੰਗ ਜਾਣਨ ਨਾਲ ਵਾਕ ਦੀ ਵਰਤੋਂ ਸਹੀ ਬਣਦੀ ਹੈ।",
      "ਮੁੰਡਾ ਅਤੇ ਕੁੜੀ ਵਰਗੇ ਸ਼ਬਦ ਲਿੰਗ ਸਮਝਣ ਲਈ ਬਹੁਤ ਆਸਾਨ ਉਦਾਹਰਨ ਹਨ।"
    ],
    formulaSpeech: ["ਇਹ ਉਦਾਹਰਨ ਪੁਲਿੰਗ ਦੇ ਆਮ ਸ਼ਬਦ ਦਿਖਾਉਂਦੀ ਹੈ।", "ਇਹ ਉਦਾਹਰਨ ਇਸਤ੍ਰੀਲਿੰਗ ਦੇ ਆਮ ਸ਼ਬਦ ਦਿਖਾਉਂਦੀ ਹੈ।"],
    stepSpeech: ["ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਸ਼ਬਦ ਦਾ ਅਰਥ ਸਮਝੋ।", "ਫਿਰ ਵੇਖੋ ਕਿ ਸ਼ਬਦ ਪੁਲਿੰਗ ਹੈ ਜਾਂ ਇਸਤ੍ਰੀਲਿੰਗ।", "ਅੰਤ ਵਿੱਚ ਉਸ ਸ਼ਬਦ ਨੂੰ ਇੱਕ ਠੀਕ ਵਾਕ ਵਿੱਚ ਵਰਤੋ।"],
    exampleSpeech: "ਆਓ ਮੁੰਡਾ ਅਤੇ ਕੁੜੀ ਦੇ ਉਦਾਹਰਨ ਨਾਲ ਲਿੰਗ ਸਪਸ਼ਟ ਕਰੀਏ।",
    recapSpeech: "ਦੁਹਰਾਈ: ਲਿੰਗ ਨਾਮ ਦੇ ਰੂਪ ਅਤੇ ਵਰਤੋਂ ਨੂੰ ਸਹੀ ਬਣਾਉਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ।",
    recapBoardText: "ਯਾਦ ਰੱਖੋ: ਮੁੰਡਾ ਪੁਲਿੰਗ, ਕੁੜੀ ਇਸਤ੍ਰੀਲਿੰਗ।",
    recapPoints: ["ਲਿੰਗ ਨਾਮ ਦਾ ਪ੍ਰਕਾਰ ਦੱਸਦਾ ਹੈ।", "ਪੁਲਿੰਗ ਅਤੇ ਇਸਤ੍ਰੀਲਿੰਗ ਦੋ ਮੁੱਖ ਰੂਪ ਹਨ।", "ਉਦਾਹਰਨ ਨਾਲ ਲਿੰਗ ਆਸਾਨੀ ਨਾਲ ਯਾਦ ਰਹਿੰਦਾ ਹੈ।"],
    practiceQuestion: "ਅਭਿਆਸ ਪ੍ਰਸ਼ਨ: ਸ਼ਬਦ 'ਅਧਿਆਪਿਕਾ' ਦਾ ਲਿੰਗ ਦੱਸੋ ਅਤੇ ਇੱਕ ਵਾਕ ਬਣਾਓ।",
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
  const topic = "Democracy";
  return {
    boardPayload: {
      boardTitle: boardTitle(topic, boardLanguage),
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
    `Subject family: ${familyLabel(family)}.`,
    `Subject: ${context.subjectName}.`,
    `Topic: ${context.topicTitle}.`,
    `Explanation language: ${languageLabel(context.explanationLanguage)}.`,
    `Board writing language: ${languageLabel(context.boardLanguage)}.`,
    "Return actual teaching content only. Do not write meta-instructions such as 'write the definition' or 'add one example'.",
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

  return plannerToLessonContent(context, family, planned);
};

export const buildTopicLessonContent = async (
  context: LiveBoardContext,
  family: LiveBoardSubjectFamily
): Promise<LiveBoardLessonContent> => {
  const subject = normalize(context.subjectName);
  const topic = normalize(context.topicTitle);

  if (family === "SCIENCE" && includesAny(topic, ["chemical reaction", "chemical reactions"])) {
    return chemicalReactionLesson(context);
  }

  if (family === "MATHS" && includesAny(topic, ["linear equation", "linear equations"])) {
    return linearEquationLesson(context);
  }

  if (family === "LANGUAGE" && includesAny(topic, ["ਲਿੰਗ", "ling", "gender"])) {
    return genderLesson(context);
  }

  if (family === "SST" && includesAny(topic, ["democracy"])) {
    return democracyLesson(context);
  }

  try {
    return await buildAiPlannedLesson(context, family);
  } catch {
    return buildFallbackLesson(context, family);
  }
};
