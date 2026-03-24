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
  driver: string;
};

type TuitionParseDriver = {
  name: string;
  parse(input: ParseDraftInput): Promise<ParseDraftResult>;
};

const normalizeLine = (value: string): string =>
  String(value || "")
    .replace(/\r/g, "")
    .replace(/^[\s\-*\u2022\d.)]+/, "")
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

  const headingLines = lines.filter((line) =>
    /^(chapter|unit|lesson|topic)\b/i.test(line) || /^\d+\s*[:.)-]/.test(line)
  );

  const source = headingLines.length ? headingLines : lines;

  const seen = new Set<string>();
  const chapters: string[] = [];
  for (const line of source) {
    const key = normalizeName(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    chapters.push(line);
    if (chapters.length >= 24) break;
  }
  return chapters;
};

const manualReviewDriver: TuitionParseDriver = {
  name: "manual-review",
  async parse(input) {
    const explicitTitle = normalizeLine(String(input.title || ""));
    const rawText = String(input.manualText || "").replace(/\r/g, "").trim();
    const explicitChapters = Array.isArray(input.chapterNames)
      ? input.chapterNames.map(normalizeLine).filter(Boolean)
      : [];

    const warnings: string[] = [];
    let chapters = explicitChapters;

    if (!chapters.length && rawText) {
      chapters = extractChapterCandidates(rawText);
      if (!chapters.length) {
        warnings.push("No chapter headings were confidently detected. Please review the draft manually.");
      } else if (!/chapter|unit|lesson|topic/i.test(rawText)) {
        warnings.push("A manual chapter draft was inferred from the uploaded text. Review the order before confirming.");
      }
    }

    if (!chapters.length) {
      chapters = ["Chapter 1", "Chapter 2", "Chapter 3"];
      warnings.push(
        "OCR provider is not wired yet. A placeholder chapter list was generated. Please review and edit before confirming."
      );
    }

    if (explicitChapters.length) {
      warnings.push("Manual chapter entries were used as the draft source. Please confirm the final order.");
    }

    const resultChapters = chapters.map((name, index) => ({
      name,
      normalizedName: normalizeName(name) || `chapter-${index + 1}`,
      orderIndex: index + 1,
      sourceText: rawText || null,
    }));

    return {
      title: explicitTitle || titleFromFileName(input.fileName),
      rawText,
      chapters: resultChapters,
      warnings,
      status: warnings.length ? "NEEDS_REVIEW" : "PARSED",
      driver: this.name,
    };
  },
};

export const tuitionParserService = {
  async parseDraft(input: ParseDraftInput): Promise<ParseDraftResult> {
    return manualReviewDriver.parse(input);
  },
};
