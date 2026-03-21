import { TuitionDifficultyMode, TuitionSpeedMode } from "@prisma/client";

const languageHeaders = {
  ENGLISH: {
    explanation: "Explanation",
    example: "Example",
    practice: "Quick Check",
    recap: "Recap",
  },
  HINDI: {
    explanation: "व्याख्या",
    example: "उदाहरण",
    practice: "अभ्यास",
    recap: "सारांश",
  },
  PUNJABI: {
    explanation: "ਵਿਆਖਿਆ",
    example: "ਉਦਾਹਰਨ",
    practice: "ਅਭਿਆਸ",
    recap: "ਸਾਰ",
  },
} as const;

const languageLabel = (value: string | null | undefined): keyof typeof languageHeaders => {
  const normalized = String(value || "ENGLISH").trim().toUpperCase();
  if (normalized === "HINDI") return "HINDI";
  if (normalized === "PUNJABI") return "PUNJABI";
  return "ENGLISH";
};

const speedNotes: Record<TuitionSpeedMode, string> = {
  SLOW: "Explain in smaller steps and pause after each idea.",
  NORMAL: "Keep the explanation balanced and practical.",
  FAST: "Keep the explanation compact and move quickly to application.",
};

const difficultyNotes: Record<TuitionDifficultyMode, string> = {
  EASY: "Use simpler words, direct examples, and one-step practice.",
  MEDIUM: "Use standard school-level depth with one worked example.",
  HARD: "Include deeper reasoning, an extra comparison, and a tougher practice prompt.",
};

export const createTuitionAiProvider = () => ({
  provider: "phase-2-static",
  model: "tuition-text-mvp",
  mode: "text-first",
});

export const buildTuitionAssistantReply = (input: {
  boardName?: string | null;
  classLevel?: number | null;
  subjectName?: string | null;
  chapterName: string;
  responseLanguage?: string | null;
  speedMode: TuitionSpeedMode;
  difficultyMode: TuitionDifficultyMode;
  studentPrompt: string;
  messageNumber: number;
}) => {
  const language = languageLabel(input.responseLanguage);
  const header = languageHeaders[language];
  const classText = input.classLevel ? `Class ${input.classLevel}` : "School";
  const boardText = input.boardName ? `${input.boardName} ` : "";
  const subjectText = input.subjectName || "this subject";
  const prompt = String(input.studentPrompt || "").trim();

  return [
    `${header.explanation}: ${input.chapterName} is being explained for ${boardText}${classText} ${subjectText}. ${speedNotes[input.speedMode]} ${difficultyNotes[input.difficultyMode]}`,
    `${header.example}: Connect the topic to one classroom-style example. Student asked: "${prompt}". The next explanation should stay focused on the selected chapter instead of switching to exam revision mode.`,
    `${header.practice}: Ask one short follow-up question that checks understanding without leaving the current chapter.`,
    `${header.recap}: This is message ${input.messageNumber}. Keep the response in ${language} mode as much as possible while preserving textbook terms where needed.`,
  ].join("\n\n");
};
