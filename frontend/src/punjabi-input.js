const WORD_SUGGESTIONS = new Map(
  Object.entries({
    aj: ["ਅੱਜ", "ਅਜ", "ਆਜ"],
    ajj: ["ਅੱਜ", "ਅਜ"],
    eh: ["ਇਹ", "ਏਹ"],
    eho: ["ਇਹੋ"],
    oh: ["ਉਹ", "ਓਹ"],
    asi: ["ਅਸੀਂ"],
    assi: ["ਅਸੀਂ"],
    tusi: ["ਤੁਸੀਂ"],
    tusi: ["ਤੁਸੀਂ"],
    main: ["ਮੈਂ"],
    mai: ["ਮੈਂ", "ਮੈ"],
    mera: ["ਮੇਰਾ"],
    meri: ["ਮੇਰੀ"],
    mere: ["ਮੇਰੇ"],
    hai: ["ਹੈ"],
    haan: ["ਹਾਂ"],
    han: ["ਹਨ"],
    nahi: ["ਨਹੀਂ"],
    nahin: ["ਨਹੀਂ"],
    punjab: ["ਪੰਜਾਬ", "ਪੁੰਜਾਬ"],
    panjab: ["ਪੰਜਾਬ", "ਪੰਜਾਬ"],
    vich: ["ਵਿਚ"],
    wich: ["ਵਿਚ"],
    vic: ["ਵਿਚ"],
    holi: ["ਹੋਲੀ"],
    hollee: ["ਹੋਲੀ"],
    school: ["ਸਕੂਲ"],
    skool: ["ਸਕੂਲ"],
    meree: ["ਮੇਰੀ"],
    meraa: ["ਮੇਰਾ"],
  })
);

const CONSONANT_PATTERNS = [
  ["tth", "ਠ"],
  ["ddh", "ਢ"],
  ["chh", "ਛ"],
  ["ngh", "ੰਘ"],
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
  ["nj", "ੰਜ"],
  ["ng", "ਂਗ"],
  ["nk", "ੰਕ"],
  ["nd", "ੰਦ"],
  ["mb", "ੰਬ"],
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
  ["ou", { independent: "ਔ", dependent: "ੌ" }],
  ["a", { independent: "ਅ", dependent: "" }],
  ["i", { independent: "ਇ", dependent: "ਿ" }],
  ["u", { independent: "ਉ", dependent: "ੁ" }],
  ["e", { independent: "ਏ", dependent: "ੇ" }],
  ["o", { independent: "ਓ", dependent: "ੋ" }],
];

const ROMAN_WORD_PATTERN = /[A-Za-z]+(?:'[A-Za-z]+)*/;
const ROMAN_CHAR_PATTERN = /[A-Za-z']/;
const COMMIT_BOUNDARY_PATTERN = /[\s,.;:!?()\[\]{}"']/;
const PUNJABI_WORD_CHAR_PATTERN = /[\u0A00-\u0A7F]/u;

const CONTROL_STATE = new WeakMap();

const dropdownState = {
  root: null,
  suggestions: [],
  activeIndex: 0,
  control: null,
  selection: null,
  onChoose: null,
};

const normalizeRomanToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z']/g, "");

const uniqueValues = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const readPattern = (value, index, patterns) => {
  const slice = value.slice(index);
  for (const [pattern, mapped] of patterns) {
    if (slice.startsWith(pattern)) {
      return { pattern, mapped };
    }
  }
  return null;
};

const transliterateRomanPunjabiWordBasic = (value) => {
  const normalized = normalizeRomanToken(value);
  if (!normalized) return String(value || "");

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
    if (!vowelMatch) {
      continue;
    }

    const isTerminalSingleA = vowelMatch.pattern === "a" && index + vowelMatch.pattern.length >= normalized.length;
    const isTerminalSingleI = vowelMatch.pattern === "i" && index + vowelMatch.pattern.length >= normalized.length;
    output += isTerminalSingleA ? "ਾ" : isTerminalSingleI ? "ੀ" : vowelMatch.mapped.dependent;
    index += vowelMatch.pattern.length;
  }

  return output || String(value || "");
};

const buildSuggestionVariants = (token) => {
  const normalized = normalizeRomanToken(token);
  const directSuggestions = WORD_SUGGESTIONS.get(normalized) || [];
  const heuristicTokens = [
    normalized,
    normalized.replace(/^v/, "w"),
    normalized.replace(/^w/, "v"),
    normalized.replace(/aa/g, "a"),
    normalized.replace(/ee/g, "i"),
    normalized.replace(/oo/g, "u"),
    normalized.replace(/i$/, "ee"),
  ];

  const heuristicSuggestions = heuristicTokens.map((item) => transliterateRomanPunjabiWordBasic(item));
  return uniqueValues([...directSuggestions, ...heuristicSuggestions]).slice(0, 6);
};

const findRomanTokenRangeAtCaret = (value, caretIndex) => {
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
  if (!ROMAN_WORD_PATTERN.test(token)) return null;
  return { token, start: tokenStart, end: tokenEnd, safeCaret };
};

const replaceRange = (value, start, end, replacement) =>
  `${String(value || "").slice(0, start)}${replacement}${String(value || "").slice(end)}`;

const setControlValue = (control, nextValue, nextCaret) => {
  control.value = nextValue;
  if (typeof nextCaret === "number" && typeof control.setSelectionRange === "function") {
    control.setSelectionRange(nextCaret, nextCaret);
  }
};

const ensureDropdown = () => {
  if (dropdownState.root instanceof HTMLElement) return dropdownState.root;
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.zIndex = "10000";
  root.style.minWidth = "180px";
  root.style.maxWidth = "280px";
  root.style.background = "#ffffff";
  root.style.border = "1px solid #c7d5f3";
  root.style.borderRadius = "12px";
  root.style.boxShadow = "0 12px 28px rgba(25, 55, 120, 0.18)";
  root.style.padding = "6px";
  root.style.display = "none";
  document.body.appendChild(root);
  dropdownState.root = root;
  return root;
};

const hideDropdown = () => {
  if (dropdownState.root instanceof HTMLElement) {
    dropdownState.root.style.display = "none";
    dropdownState.root.innerHTML = "";
  }
  dropdownState.suggestions = [];
  dropdownState.activeIndex = 0;
  dropdownState.control = null;
  dropdownState.selection = null;
  dropdownState.onChoose = null;
};

const updateDropdownHighlight = () => {
  if (!(dropdownState.root instanceof HTMLElement)) return;
  const buttons = Array.from(dropdownState.root.querySelectorAll("button[data-index]"));
  buttons.forEach((button, index) => {
    const active = index === dropdownState.activeIndex;
    button.style.background = active ? "#2f63d8" : "transparent";
    button.style.color = active ? "#ffffff" : "#183153";
  });
};

const showDropdown = (control, selection, suggestions, onChoose) => {
  const root = ensureDropdown();
  if (!suggestions.length) {
    hideDropdown();
    return;
  }

  dropdownState.suggestions = suggestions;
  dropdownState.activeIndex = 0;
  dropdownState.control = control;
  dropdownState.selection = selection;
  dropdownState.onChoose = onChoose;

  root.innerHTML = suggestions
    .map(
      (suggestion, index) => `
        <button
          type="button"
          data-index="${index}"
          style="
            display:block;
            width:100%;
            text-align:left;
            border:0;
            background:transparent;
            border-radius:8px;
            padding:8px 10px;
            font-size:0.98rem;
            cursor:pointer;
          "
        >${suggestion}</button>
      `
    )
    .join("");

  const rect = control.getBoundingClientRect();
  root.style.left = `${Math.max(12, rect.left)}px`;
  root.style.top = `${Math.min(window.innerHeight - 12, rect.bottom + 8)}px`;
  root.style.display = "block";
  updateDropdownHighlight();

  Array.from(root.querySelectorAll("button[data-index]")).forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const index = Number(button.getAttribute("data-index") || 0);
      dropdownState.activeIndex = index;
      updateDropdownHighlight();
      dropdownState.onChoose?.(dropdownState.suggestions[index] || "");
    });
  });
};

const getControlState = (control) => {
  if (!CONTROL_STATE.has(control)) {
    CONTROL_STATE.set(control, {
      internalUpdate: false,
      lastCommit: null,
      activeSelection: null,
    });
  }
  return CONTROL_STATE.get(control);
};

const commitCurrentToken = (control, state) => {
  if (state.internalUpdate) return null;
  const range = findRomanTokenRangeAtCaret(control.value, control.selectionStart ?? control.value.length);
  if (!range) return null;

  const suggestions = buildSuggestionVariants(range.token);
  const committedWord = suggestions[0] || range.token;
  if (!committedWord || committedWord === range.token) return null;

  const nextValue = replaceRange(control.value, range.start, range.end, committedWord);
  const nextCaret = range.safeCaret + (committedWord.length - range.token.length);

  state.internalUpdate = true;
  setControlValue(control, nextValue, nextCaret);
  state.internalUpdate = false;
  state.lastCommit = {
    sourceToken: range.token,
    suggestions,
    start: range.start,
    end: range.start + committedWord.length,
  };
  state.activeSelection = null;
  hideDropdown();
  return state.lastCommit;
};

const matchesSelection = (control, selection) =>
  Boolean(
    selection &&
      (control.selectionStart ?? -1) === selection.start &&
      (control.selectionEnd ?? -1) === selection.end
  );

const revealSuggestionsForLastCommit = (control, state) => {
  const lastCommit = state.lastCommit;
  if (!lastCommit) return false;
  const caret = control.selectionStart ?? 0;
  if ((control.selectionEnd ?? 0) !== caret) return false;

  const canRevealAtWordEnd = caret === lastCommit.end;
  const canRevealAfterBoundary =
    caret === lastCommit.end + 1 && !PUNJABI_WORD_CHAR_PATTERN.test(String(control.value || "")[caret - 1] || "");
  if (!canRevealAtWordEnd && !canRevealAfterBoundary) return false;

  control.setSelectionRange(lastCommit.start, lastCommit.end);
  state.activeSelection = {
    start: lastCommit.start,
    end: lastCommit.end,
    sourceToken: lastCommit.sourceToken,
    suggestions: lastCommit.suggestions,
  };
  showDropdown(control, state.activeSelection, lastCommit.suggestions, (suggestion) => {
    const nextValue = replaceRange(control.value, state.activeSelection.start, state.activeSelection.end, suggestion);
    const nextCaret = state.activeSelection.start + suggestion.length;
    state.internalUpdate = true;
    setControlValue(control, nextValue, nextCaret);
    state.internalUpdate = false;
    state.lastCommit = {
      sourceToken: state.activeSelection.sourceToken,
      suggestions: state.activeSelection.suggestions,
      start: state.activeSelection.start,
      end: state.activeSelection.start + suggestion.length,
    };
    state.activeSelection = null;
    hideDropdown();
  });
  return true;
};

const deleteSingleLetterFromSelection = (control, state) => {
  if (!matchesSelection(control, state.activeSelection)) return false;
  const activeSelection = state.activeSelection;
  if (!activeSelection || activeSelection.end <= activeSelection.start) return false;

  const deleteIndex = activeSelection.end - 1;
  const nextValue = replaceRange(control.value, deleteIndex, activeSelection.end, "");
  state.internalUpdate = true;
  setControlValue(control, nextValue, deleteIndex);
  state.internalUpdate = false;
  state.lastCommit = null;
  state.activeSelection = null;
  hideDropdown();
  return true;
};

const handleSuggestionNavigation = (event) => {
  if (!dropdownState.suggestions.length) return false;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    dropdownState.activeIndex = (dropdownState.activeIndex + 1) % dropdownState.suggestions.length;
    updateDropdownHighlight();
    return true;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    dropdownState.activeIndex =
      (dropdownState.activeIndex - 1 + dropdownState.suggestions.length) % dropdownState.suggestions.length;
    updateDropdownHighlight();
    return true;
  }
  if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault();
    dropdownState.onChoose?.(dropdownState.suggestions[dropdownState.activeIndex] || "");
    return true;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    hideDropdown();
    return true;
  }
  return false;
};

document.addEventListener("mousedown", (event) => {
  if (!(dropdownState.root instanceof HTMLElement)) return;
  if (dropdownState.root.contains(event.target)) return;
  hideDropdown();
});

export const getPunjabiSuggestionsForWord = (word) => buildSuggestionVariants(word);

export const applyPunjabiInputMode = (control, getMode) => {
  if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return () => {};

  const state = getControlState(control);

  const handleInput = (event) => {
    if (state.internalUpdate) return;
    if (String(getMode?.() || "ENGLISH").toUpperCase() !== "PUNJABI") {
      hideDropdown();
      return;
    }
    if (event?.isComposing) return;
    if (COMMIT_BOUNDARY_PATTERN.test(String(event?.data || ""))) {
      commitCurrentToken(control, state);
      return;
    }
    state.activeSelection = null;
    hideDropdown();
  };

  const handleBlur = () => {
    if (String(getMode?.() || "ENGLISH").toUpperCase() !== "PUNJABI") return;
    commitCurrentToken(control, state);
  };

  const handleClick = () => {
    state.activeSelection = null;
    hideDropdown();
  };

  const handleKeydown = (event) => {
    if (String(getMode?.() || "ENGLISH").toUpperCase() !== "PUNJABI") {
      hideDropdown();
      return;
    }
    if (handleSuggestionNavigation(event)) {
      return;
    }
    if (event.key !== "Backspace") {
      state.activeSelection = null;
      hideDropdown();
      return;
    }
    if (deleteSingleLetterFromSelection(control, state)) {
      event.preventDefault();
      return;
    }
    if (revealSuggestionsForLastCommit(control, state)) {
      event.preventDefault();
    }
  };

  control.addEventListener("input", handleInput);
  control.addEventListener("blur", handleBlur);
  control.addEventListener("click", handleClick);
  control.addEventListener("keydown", handleKeydown);

  return () => {
    control.removeEventListener("input", handleInput);
    control.removeEventListener("blur", handleBlur);
    control.removeEventListener("click", handleClick);
    control.removeEventListener("keydown", handleKeydown);
  };
};

export const getPunjabiInputModeLabel = (mode) =>
  String(mode || "").toUpperCase() === "PUNJABI" ? "Punjabi Transliteration" : "English Typing";
