type ParseDraftInput = {
  fileName: string;
  title?: string | null;
  manualText?: string | null;
  chapterNames?: string[];
};

type ParseDraftResult = {
  title: string;
  rawText: string;
  chapters: Array<{
    name: string;
    normalizedName: string;
    orderIndex: number;
    sourceText: string | null;
  }>;
  warnings: string[];
  status: "PARSED" | "NEEDS_REVIEW" | "FAILED";
};

const normalizeLine = (value: string): string =>
  String(value || "")
    .replace(/\r/g, "")
    .replace(/^[\s\-*•\d.)]+/, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeName = (value: string): string =>
  normalizeLine(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const titleFromFileName = (value: string): string =>
  String(value || "Tuition Syllabus")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Tuition Syllabus";

const extractChapterCandidates = (rawText: string): string[] => {
  const lines = rawText
    .split("\n")
    .map(normalizeLine)
    .filter((line) => line.length >= 3 && line.length <= 160);

  const seen = new Set<string>();
  const chapters: string[] = [];
  for (const line of lines) {
    const key = normalizeName(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    chapters.push(line);
    if (chapters.length >= 24) break;
  }
  return chapters;
};

export const tuitionParserService = {
  async parseDraft(input: ParseDraftInput): Promise<ParseDraftResult> {
    const explicitTitle = normalizeLine(String(input.title || ""));
    const rawText = String(input.manualText || "").replace(/\r/g, "").trim();
    const explicitChapters = Array.isArray(input.chapterNames)
      ? input.chapterNames.map(normalizeLine).filter(Boolean)
      : [];

    const warnings: string[] = [];
    let chapters = explicitChapters;

    if (!chapters.length && rawText) {
      chapters = extractChapterCandidates(rawText);
    }

    if (!chapters.length) {
      chapters = ["Chapter 1", "Chapter 2", "Chapter 3"];
      warnings.push(
        "No OCR provider is wired yet, so a placeholder chapter list was generated. Please review and edit it."
      );
    }

    const resultChapters = chapters.map((name, index) => ({
      name,
      normalizedName: normalizeName(name) || `chapter-${index + 1}`,
      orderIndex: index + 1,
      sourceText: rawText || null,
    }));

    const title = explicitTitle || titleFromFileName(input.fileName);
    const status = warnings.length ? "NEEDS_REVIEW" : "PARSED";

    return {
      title,
      rawText,
      chapters: resultChapters,
      warnings,
      status,
    };
  },
};
