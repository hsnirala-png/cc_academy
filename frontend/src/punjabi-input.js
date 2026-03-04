const WORD_OVERRIDES = new Map(
  Object.entries({
    eh: "ਇਹ",
    eho: "ਇਹੋ",
    oh: "ਉਹ",
    asi: "ਅਸੀਂ",
    assi: "ਅਸੀਂ",
    tusi: "ਤੁਸੀਂ",
    main: "ਮੈਂ",
    mai: "ਮੈਂ",
    mera: "ਮੇਰਾ",
    meri: "ਮੇਰੀ",
    mere: "ਮੇਰੇ",
    meree: "ਮੇਰੀ",
    meraa: "ਮੇਰਾ",
    hai: "ਹੈ",
    haan: "ਹਾਂ",
    han: "ਹਨ",
    ha: "ਹਾ",
    nahi: "ਨਹੀਂ",
    nahin: "ਨਹੀਂ",
    school: "ਸਕੂਲ",
    skool: "ਸਕੂਲ",
  })
);

const CONSONANT_PATTERNS = [
  ["ngh", "ੰਘ"],
  ["chh", "ਛ"],
  ["tth", "ਠ"],
  ["ddh", "ਢ"],
  ["kh", "ਖ"],
  ["gh", "ਘ"],
  ["jh", "ਝ"],
  ["th", "ਥ"],
  ["dh", "ਧ"],
  ["ph", "ਫ"],
  ["bh", "ਭ"],
  ["sh", "ਸ਼"],
  ["rr", "ੜ"],
  ["tt", "ਟ"],
  ["dd", "ਡ"],
  ["ng", "ਂਗ"],
  ["ny", "ਞ"],
  ["ch", "ਚ"],
  ["f", "ਫ"],
  ["q", "ਕ"],
  ["x", "ਕਸ"],
  ["k", "ਕ"],
  ["g", "ਗ"],
  ["j", "ਜ"],
  ["t", "ਤ"],
  ["d", "ਦ"],
  ["n", "ਨ"],
  ["p", "ਪ"],
  ["b", "ਬ"],
  ["m", "ਮ"],
  ["y", "ਯ"],
  ["r", "ਰ"],
  ["l", "ਲ"],
  ["v", "ਵ"],
  ["w", "ਵ"],
  ["s", "ਸ"],
  ["h", "ਹ"],
  ["c", "ਕ"],
  ["z", "ਜ਼"],
];

const VOWEL_PATTERNS = [
  ["aee", { independent: "ਐ", dependent: "ੈ" }],
  ["ee", { independent: "ਈ", dependent: "ੀ" }],
  ["ii", { independent: "ਈ", dependent: "ੀ" }],
  ["oo", { independent: "ਊ", dependent: "ੂ" }],
  ["uu", { independent: "ਊ", dependent: "ੂ" }],
  ["aa", { independent: "ਆ", dependent: "ਾ" }],
  ["ai", { independent: "ਐ", dependent: "ੈ" }],
  ["au", { independent: "ਔ", dependent: "ੌ" }],
  ["ei", { independent: "ਏ", dependent: "ੇ" }],
  ["oi", { independent: "ਓਇ", dependent: "ੋਇ" }],
  ["ou", { independent: "ਔ", dependent: "ੌ" }],
  ["a", { independent: "ਅ", dependent: "" }],
  ["i", { independent: "ਇ", dependent: "ਿ" }],
  ["u", { independent: "ਉ", dependent: "ੁ" }],
  ["e", { independent: "ਏ", dependent: "ੇ" }],
  ["o", { independent: "ਓ", dependent: "ੋ" }],
];

const ROMAN_WORD_PATTERN = /[A-Za-z]+(?:'[A-Za-z]+)*/;
const ROMAN_CHAR_PATTERN = /[A-Za-z']/;
const COMMIT_BOUNDARY_PATTERN = /[\s,.;:!?()\[\]{}"'-]/;

const normalizeRomanToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z']/g, "");

const isRomanToken = (value) => ROMAN_WORD_PATTERN.test(String(value || ""));

const readPattern = (value, index, patterns) => {
  const slice = value.slice(index);
  for (const [pattern, mapped] of patterns) {
    if (slice.startsWith(pattern)) {
      return { pattern, mapped };
    }
  }
  return null;
};

const transliterateRomanPunjabiWord = (value) => {
  const normalized = normalizeRomanToken(value);
  if (!normalized) return String(value || "");
  if (WORD_OVERRIDES.has(normalized)) {
    return WORD_OVERRIDES.get(normalized) || String(value || "");
  }

  let index = 0;
  let output = "";
  while (index < normalized.length) {
    const consonantMatch = readPattern(normalized, index, CONSONANT_PATTERNS);
    if (!consonantMatch) {
      const vowelMatch = readPattern(normalized, index, VOWEL_PATTERNS);
      if (vowelMatch) {
        output += vowelMatch.mapped.independent;
        index += vowelMatch.pattern.length;
        continue;
      }
      output += normalized[index];
      index += 1;
      continue;
    }

    output += consonantMatch.mapped;
    index += consonantMatch.pattern.length;

    const vowelMatch = readPattern(normalized, index, VOWEL_PATTERNS);
    if (vowelMatch) {
      const isTerminalSingleA =
        vowelMatch.pattern === "a" && index + vowelMatch.pattern.length >= normalized.length;
      output += isTerminalSingleA ? "ਾ" : vowelMatch.mapped.dependent;
      index += vowelMatch.pattern.length;
    }
  }

  return output || String(value || "");
};

const transliterateCommittedTokenAtCaret = (value, caretIndex) => {
  const raw = String(value || "");
  const safeCaret = Math.max(0, Math.min(Number(caretIndex || 0), raw.length));
  let tokenEnd = safeCaret;
  if (tokenEnd > 0 && !ROMAN_CHAR_PATTERN.test(raw[tokenEnd - 1])) {
    tokenEnd -= 1;
  }
  if (tokenEnd <= 0 || !ROMAN_CHAR_PATTERN.test(raw[tokenEnd - 1])) {
    return null;
  }

  let tokenStart = tokenEnd - 1;
  while (tokenStart > 0 && ROMAN_CHAR_PATTERN.test(raw[tokenStart - 1])) {
    tokenStart -= 1;
  }

  const token = raw.slice(tokenStart, tokenEnd);
  if (!isRomanToken(token)) return null;
  const transliterated = transliterateRomanPunjabiWord(token);
  if (!transliterated || transliterated === token) return null;

  return {
    nextValue: `${raw.slice(0, tokenStart)}${transliterated}${raw.slice(tokenEnd)}`,
    nextCaret: safeCaret + (transliterated.length - token.length),
  };
};

const setControlValue = (control, nextValue, nextCaret) => {
  if (!control) return;
  control.value = nextValue;
  if (typeof nextCaret === "number" && typeof control.setSelectionRange === "function") {
    control.setSelectionRange(nextCaret, nextCaret);
  }
};

export const applyPunjabiInputMode = (control, getMode) => {
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return () => {};

  let internalUpdate = false;
  const commitCurrentToken = () => {
    if (internalUpdate) return;
    if (String(getMode?.() || "ENGLISH").toUpperCase() !== "PUNJABI") return;
    const result = transliterateCommittedTokenAtCaret(control.value, control.selectionStart ?? control.value.length);
    if (!result) return;
    internalUpdate = true;
    setControlValue(control, result.nextValue, result.nextCaret);
    internalUpdate = false;
  };

  const handleInput = (event) => {
    if (internalUpdate) return;
    if (String(getMode?.() || "ENGLISH").toUpperCase() !== "PUNJABI") return;
    if (event?.isComposing) return;
    if (!COMMIT_BOUNDARY_PATTERN.test(String(event?.data || ""))) return;
    commitCurrentToken();
  };

  control.addEventListener("input", handleInput);
  control.addEventListener("blur", commitCurrentToken);

  return () => {
    control.removeEventListener("input", handleInput);
    control.removeEventListener("blur", commitCurrentToken);
  };
};

export const getPunjabiInputModeLabel = (mode) =>
  String(mode || "").toUpperCase() === "PUNJABI" ? "Punjabi Transliteration" : "English Typing";
