const WORD_SUGGESTIONS = new Map(
  Object.entries({
    aj: ["ਅੱਜ", "ਅਜ", "ਆਜ"],
    ajj: ["ਅੱਜ", "ਅਜ"],
    aaj: ["ਅੱਜ", "ਆਜ"],
    eh: ["ਇਹ", "ਏਹ"],
    eho: ["ਇਹੋ"],
    ih: ["ਇਹ"],
    oh: ["ਉਹ", "ਓਹ"],
    asi: ["ਅਸੀਂ"],
    assi: ["ਅਸੀਂ"],
    tusi: ["ਤੁਸੀਂ"],
    tusee: ["ਤੁਸੀਂ"],
    main: ["ਮੈਂ"],
    mai: ["ਮੈਂ", "ਮੈ"],
    mera: ["ਮੇਰਾ"],
    meri: ["ਮੇਰੀ"],
    mere: ["ਮੇਰੇ"],
    meraa: ["ਮੇਰਾ"],
    meree: ["ਮੇਰੀ"],
    hai: ["ਹੈ"],
    haan: ["ਹਾਂ"],
    han: ["ਹਨ"],
    nahi: ["ਨਹੀਂ"],
    nahin: ["ਨਹੀਂ"],
    punjab: ["ਪੰਜਾਬ", "ਪੁੰਜਾਬ"],
    panjab: ["ਪੰਜਾਬ"],
    pind: ["ਪਿੰਡ"],
    pinda: ["ਪਿੰਡਾਂ"],
    vich: ["ਵਿਚ"],
    wich: ["ਵਿਚ"],
    vic: ["ਵਿਚ"],
    vichon: ["ਵਿਚੋਂ"],
    holi: ["ਹੋਲੀ", "ਹੌਲੀ"],
    hollee: ["ਹੋਲੀ"],
    school: ["ਸਕੂਲ"],
    skool: ["ਸਕੂਲ"],
    ghar: ["ਘਰ"],
    sade: ["ਸਾਡੇ"],
    saade: ["ਸਾਡੇ"],
    sare: ["ਸਾਰੇ"],
    saare: ["ਸਾਰੇ"],
    nu: ["ਨੂੰ", "ਨੂ"],
    noo: ["ਨੂੰ"],
    ne: ["ਨੇ"],
    da: ["ਦਾ"],
    de: ["ਦੇ"],
    di: ["ਦੀ"],
    te: ["ਤੇ"],
    ton: ["ਤੋਂ", "ਤੋੰ"],
    toh: ["ਤੋਂ"],
    kyon: ["ਕਿਉਂ"],
    kyonki: ["ਕਿਉਂਕਿ"],
    aa: ["ਆ"],
    aan: ["ਆਂ"],
  })
);

const CONSONANT_PATTERNS = [
  ["tth", "ੱਠ"],
  ["ddh", "ੱਢ"],
  ["chh", "ੱਛ"],
  ["kh", "ਖ"],
  ["gh", "ਘ"],
  ["jh", "ਝ"],
  ["th", "ਥ"],
  ["dh", "ਧ"],
  ["ph", "ਫ"],
  ["bh", "ਭ"],
  ["sh", "ਸ਼"],
  ["rr", "ੜ"],
  ["tt", "ਟ"],
  ["dd", "ਡ"],
  ["ch", "ਚ"],
  ["ny", "ਞ"],
  ["f", "ਫ"],
  ["q", "ਕ"],
  ["x", "ਕਸ"],
  ["k", "ਕ"],
  ["g", "ਗ"],
  ["j", "ਜ"],
  ["t", "ਤ"],
  ["d", "ਦ"],
  ["n", "ਨ", "ਣ"],
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
  ["z", "ਜ਼"],
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
const COMMIT_BOUNDARY_PATTERN = /[\s,.;:!?()[\]{}"']/;
const PUNJABI_WORD_CHAR_PATTERN = /[\u0A00-\u0A7F]/u;
const PUNJABI_WORD_PATTERN = /[\u0A00-\u0A7F]+/u;
const PUNJABI_CONSONANT_CLASS = "[ਕਖਗਘਙਚਛਜਝਞਟਠਡਢਣਤਥਦਧਨਪਫਬਭਮਯਰਲਵਸ਼ਸਹੜਜ਼ਫ਼ਲ਼ਖ਼ਗ਼ਜ਼]";
const NASAL_ENDING_RULES = [
  {
    roman: /(in|ind|ing|inj|int|ink|inch|ingh)$/,
    replace: [
      new RegExp(`ਿਨ(?=${PUNJABI_CONSONANT_CLASS}|$)`, "gu"),
      "ਿੰ",
    ],
  },
  {
    roman: /(un|und|ung|unj|unt|unk)$/,
    replace: [
      new RegExp(`ੁਨ(?=${PUNJABI_CONSONANT_CLASS}|$)`, "gu"),
      "ੁੰ",
    ],
  },
  {
    roman: /(on|ond|ong|onj|ont|onk)$/,
    replace: [
      new RegExp(`ੋਨ(?=${PUNJABI_CONSONANT_CLASS}|$)`, "gu"),
      "ੋਂ",
    ],
  },
  {
    roman: /(an|am|ang|anj|and|amb|ank)$/,
    replace: [new RegExp(`ਨ(?=${PUNJABI_CONSONANT_CLASS}|$)`, "gu"), "ੰ"],
  },
];

const CONTROL_STATE = new WeakMap();

const dropdownState = {
  root: null,
  suggestions: [],
  activeIndex: 0,
  control: null,
  selection: null,
  onChoose: null,
  anchorRect: null,
  mode: "live",
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
    if (!vowelMatch) continue;

    const atWordEnd = index + vowelMatch.pattern.length >= normalized.length;
    const isSingleA = vowelMatch.pattern === "a";
    const isSingleI = vowelMatch.pattern === "i";
    output += atWordEnd && isSingleA ? "ਾ" : atWordEnd && isSingleI ? "ੀ" : vowelMatch.mapped.dependent;
    index += vowelMatch.pattern.length;
  }

  return output || String(value || "");
};

const buildRomanVariants = (token) => {
  const normalized = normalizeRomanToken(token);
  return uniqueValues([
    normalized,
    normalized.replace(/^v/, "w"),
    normalized.replace(/^w/, "v"),
    normalized.replace(/aa/g, "a"),
    normalized.replace(/ee/g, "i"),
    normalized.replace(/oo/g, "u"),
    normalized.replace(/i$/, "ee"),
    normalized.replace(/j$/, "jj"),
    normalized.replace(/n([kgcjtdpbm])/g, "n$1"),
  ]);
};

const buildNasalVariants = (sourceToken, output) => {
  const normalized = normalizeRomanToken(sourceToken);
  if (!normalized || !output) return [];

  return NASAL_ENDING_RULES
    .filter((rule) => rule.roman.test(normalized))
    .map((rule) => output.replace(rule.replace[0], rule.replace[1]))
    .filter((variant) => variant && variant !== output);
};

const buildSuggestionVariants = (token) => {
  const normalized = normalizeRomanToken(token);
  if (!normalized) return [];

  const directSuggestions = WORD_SUGGESTIONS.get(normalized) || [];
  const heuristicSuggestions = buildRomanVariants(normalized).flatMap((romanVariant) => {
    const output = transliterateRomanPunjabiWordBasic(romanVariant);
    return [output, ...buildNasalVariants(romanVariant, output)];
  });

  return uniqueValues([...directSuggestions, ...heuristicSuggestions]).slice(0, 8);
};

const findRomanTokenRangeAtCaret = (value, caretIndex) => {
  const raw = String(value || "");
  const safeCaret = Math.max(0, Math.min(Number(caretIndex || 0), raw.length));
  let tokenEnd = safeCaret;
  if (tokenEnd > 0 && !ROMAN_CHAR_PATTERN.test(raw[tokenEnd - 1])) {
    tokenEnd -= 1;
  }
  if (tokenEnd <= 0 || !ROMAN_CHAR_PATTERN.test(raw[tokenEnd - 1])) return null;

  let tokenStart = tokenEnd - 1;
  while (tokenStart > 0 && ROMAN_CHAR_PATTERN.test(raw[tokenStart - 1])) {
    tokenStart -= 1;
  }

  const token = raw.slice(tokenStart, tokenEnd);
  if (!ROMAN_WORD_PATTERN.test(token)) return null;
  return { token, start: tokenStart, end: tokenEnd, safeCaret };
};

const findPunjabiWordRangeAtCaret = (value, caretIndex) => {
  const raw = String(value || "");
  const safeCaret = Math.max(0, Math.min(Number(caretIndex || 0), raw.length));
  let position = safeCaret;

  if (position < raw.length && PUNJABI_WORD_CHAR_PATTERN.test(raw[position] || "")) {
    position += 1;
  }
  if (position > 0 && !PUNJABI_WORD_CHAR_PATTERN.test(raw[position - 1] || "")) return null;

  let start = position - 1;
  while (start > 0 && PUNJABI_WORD_CHAR_PATTERN.test(raw[start - 1])) {
    start -= 1;
  }

  let end = position;
  while (end < raw.length && PUNJABI_WORD_CHAR_PATTERN.test(raw[end])) {
    end += 1;
  }

  const token = raw.slice(start, end);
  if (!PUNJABI_WORD_PATTERN.test(token)) return null;
  return { token, start, end };
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
  root.style.minWidth = "220px";
  root.style.maxWidth = "320px";
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
  dropdownState.anchorRect = null;
  dropdownState.mode = "live";
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

const showDropdown = (control, selection, suggestions, onChoose, options = {}) => {
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
  dropdownState.anchorRect = options.anchorRect || control.getBoundingClientRect();
  dropdownState.mode = options.mode || "live";

  const hintText =
    dropdownState.mode === "history"
      ? `Suggestions for "${options.sourceToken || selection?.text || ""}"`
      : `Press Tab or Enter to use the highlighted word`;

  root.innerHTML = `
    <div style="padding:6px 10px 8px; font-size:0.76rem; color:#5b6f95;">${hintText}</div>
    ${suggestions
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
      .join("")}
  `;

  const rect = dropdownState.anchorRect;
  root.style.left = `${Math.max(12, rect.left)}px`;
  root.style.top = `${Math.min(window.innerHeight - 16, rect.bottom + 8)}px`;
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
      commits: [],
      beforeInput: null,
    });
  }
  return CONTROL_STATE.get(control);
};

const sortCommits = (commits) => commits.sort((left, right) => left.start - right.start);

const removeOverlappingCommits = (commits, start, end) =>
  commits.filter((commit) => commit.end <= start || commit.start >= end);

const shiftCommitsAfterIndex = (commits, startIndex, delta) =>
  commits.map((commit) =>
    commit.start >= startIndex
      ? { ...commit, start: commit.start + delta, end: commit.end + delta }
      : commit
  );

const upsertCommit = (state, commit, replacedStart, replacedEnd, delta) => {
  const baseCommits = removeOverlappingCommits(state.commits, replacedStart, replacedEnd);
  const shiftedCommits = shiftCommitsAfterIndex(baseCommits, replacedEnd, delta);
  shiftedCommits.push(commit);
  state.commits = sortCommits(shiftedCommits);
  state.lastCommit = commit;
};

const syncCommitsAfterUserEdit = (control, state) => {
  const snapshot = state.beforeInput;
  state.beforeInput = null;
  if (!snapshot || !state.commits.length) return;

  let removedStart = snapshot.start;
  let removedEnd = snapshot.end;
  if (snapshot.inputType === "deleteContentBackward" && removedStart === removedEnd) {
    removedStart = Math.max(0, removedStart - 1);
  } else if (snapshot.inputType === "deleteContentForward" && removedStart === removedEnd) {
    removedEnd = Math.min(snapshot.value.length, removedEnd + 1);
  }

  const removedLength = Math.max(0, removedEnd - removedStart);
  const insertedLength = Math.max(0, (control.selectionStart ?? removedStart) - removedStart);
  const delta = insertedLength - removedLength;

  const nextCommits = [];
  for (const commit of state.commits) {
    if (commit.end <= removedStart) {
      nextCommits.push(commit);
      continue;
    }
    if (commit.start >= removedEnd) {
      nextCommits.push({
        ...commit,
        start: commit.start + delta,
        end: commit.end + delta,
      });
    }
  }
  state.commits = sortCommits(nextCommits);
  if (
    state.lastCommit &&
    !(state.lastCommit.end <= removedStart || state.lastCommit.start >= removedEnd)
  ) {
    state.lastCommit = null;
  }
};

const matchesSelection = (control, selection) =>
  Boolean(
    selection &&
      (control.selectionStart ?? -1) === selection.start &&
      (control.selectionEnd ?? -1) === selection.end
  );

const applySuggestionToSelection = (control, state, selection, suggestion) => {
  const nextValue = replaceRange(control.value, selection.start, selection.end, suggestion);
  const nextCaret = selection.start + suggestion.length;
  const delta = suggestion.length - (selection.end - selection.start);

  state.internalUpdate = true;
  setControlValue(control, nextValue, nextCaret);
  state.internalUpdate = false;

  const commit = {
    sourceToken: selection.sourceToken || selection.text || "",
    suggestions: selection.suggestions || [suggestion],
    start: selection.start,
    end: selection.start + suggestion.length,
    text: suggestion,
  };
  upsertCommit(state, commit, selection.start, selection.end, delta);
  state.activeSelection = null;
  hideDropdown();
};

const commitCurrentToken = (control, state) => {
  if (state.internalUpdate) return null;
  const range = findRomanTokenRangeAtCaret(control.value, control.selectionStart ?? control.value.length);
  if (!range) return null;

  const suggestions = buildSuggestionVariants(range.token);
  const committedWord = suggestions[0] || range.token;
  if (!committedWord || committedWord === range.token) return null;

  const selection = {
    start: range.start,
    end: range.end,
    sourceToken: range.token,
    suggestions,
    text: range.token,
  };
  applySuggestionToSelection(control, state, selection, committedWord);
  return state.lastCommit;
};

const findCommitAtCaret = (control, state) => {
  const caret = control.selectionStart ?? 0;
  const selectionEnd = control.selectionEnd ?? caret;
  return (
    state.commits.find(
      (commit) =>
        (caret >= commit.start && caret <= commit.end) ||
        (selectionEnd >= commit.start && selectionEnd <= commit.end)
    ) || null
  );
};

const showSuggestionsForCommit = (control, state, commit) => {
  if (!commit) return false;
  control.setSelectionRange(commit.start, commit.end);
  state.activeSelection = {
    start: commit.start,
    end: commit.end,
    sourceToken: commit.sourceToken,
    suggestions: commit.suggestions,
    text: control.value.slice(commit.start, commit.end),
  };

  showDropdown(
    control,
    state.activeSelection,
    commit.suggestions,
    (suggestion) => applySuggestionToSelection(control, state, state.activeSelection, suggestion),
    {
      mode: "history",
      sourceToken: commit.sourceToken,
      anchorRect: control.getBoundingClientRect(),
    }
  );
  return true;
};

const revealSuggestionsForLastCommit = (control, state) => {
  const lastCommit = state.lastCommit;
  if (!lastCommit) return false;
  const caret = control.selectionStart ?? 0;
  if ((control.selectionEnd ?? 0) !== caret) return false;

  const canRevealAtWordEnd = caret === lastCommit.end;
  const canRevealAfterBoundary =
    caret === lastCommit.end + 1 && !PUNJABI_WORD_CHAR_PATTERN.test(String(control.value || "")[caret - 1] || "");
  if (!canRevealAtWordEnd && !canRevealAfterBoundary) return false;

  return showSuggestionsForCommit(control, state, lastCommit);
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
  state.commits = removeOverlappingCommits(state.commits, activeSelection.start, activeSelection.end);
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

  const handleBeforeInput = (event) => {
    if (state.internalUpdate) return;
    state.beforeInput = {
      value: control.value,
      start: control.selectionStart ?? 0,
      end: control.selectionEnd ?? control.selectionStart ?? 0,
      inputType: event.inputType || "",
    };
  };

  const handleInput = (event) => {
    if (state.internalUpdate) return;
    syncCommitsAfterUserEdit(control, state);
    if (String(getMode?.() || "ENGLISH").toUpperCase() !== "PUNJABI") {
      state.activeSelection = null;
      hideDropdown();
      return;
    }
    if (event?.isComposing) return;

    if (COMMIT_BOUNDARY_PATTERN.test(String(event?.data || ""))) {
      commitCurrentToken(control, state);
      return;
    }

    const liveToken = findRomanTokenRangeAtCaret(control.value, control.selectionStart ?? control.value.length);
    if (liveToken) {
      const suggestions = buildSuggestionVariants(liveToken.token);
      showDropdown(
        control,
        {
          start: liveToken.start,
          end: liveToken.end,
          sourceToken: liveToken.token,
          suggestions,
          text: liveToken.token,
        },
        suggestions,
        (suggestion) =>
          applySuggestionToSelection(
            control,
            state,
            {
              start: liveToken.start,
              end: liveToken.end,
              sourceToken: liveToken.token,
              suggestions,
              text: liveToken.token,
            },
            suggestion
          ),
        { mode: "live" }
      );
      state.activeSelection = null;
      return;
    }

    state.activeSelection = null;
    hideDropdown();
  };

  const handleBlur = () => {
    if (String(getMode?.() || "ENGLISH").toUpperCase() !== "PUNJABI") return;
    commitCurrentToken(control, state);
    hideDropdown();
  };

  const handleClick = () => {
    if (String(getMode?.() || "ENGLISH").toUpperCase() !== "PUNJABI") {
      state.activeSelection = null;
      hideDropdown();
      return;
    }

    const commit = findCommitAtCaret(control, state);
    if (commit) {
      showSuggestionsForCommit(control, state, commit);
      return;
    }

    const punjabiRange = findPunjabiWordRangeAtCaret(control.value, control.selectionStart ?? 0);
    if (!punjabiRange) {
      state.activeSelection = null;
      hideDropdown();
    }
  };

  const handleKeydown = (event) => {
    if (String(getMode?.() || "ENGLISH").toUpperCase() !== "PUNJABI") {
      hideDropdown();
      return;
    }
    if (handleSuggestionNavigation(event)) return;
    if (event.key !== "Backspace") {
      state.activeSelection = null;
      if (!ROMAN_CHAR_PATTERN.test(event.key || "")) {
        hideDropdown();
      }
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

  control.addEventListener("beforeinput", handleBeforeInput);
  control.addEventListener("input", handleInput);
  control.addEventListener("blur", handleBlur);
  control.addEventListener("click", handleClick);
  control.addEventListener("keydown", handleKeydown);

  return () => {
    control.removeEventListener("beforeinput", handleBeforeInput);
    control.removeEventListener("input", handleInput);
    control.removeEventListener("blur", handleBlur);
    control.removeEventListener("click", handleClick);
    control.removeEventListener("keydown", handleKeydown);
  };
};

export const getPunjabiInputModeLabel = (mode) =>
  String(mode || "").toUpperCase() === "PUNJABI" ? "Punjabi Transliteration" : "English Typing";
