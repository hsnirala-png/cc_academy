import {
  apiRequest,
  getStoredToken,
  getStoredUser,
  goToStudentLogin,
  initHeaderBehavior,
} from "./mock-api.js?v=4";

const START_COMMAND = "__START_TUITION_AI_TEACHER__";
const CONTINUE_COMMAND = "__CONTINUE_TUITION_AI_TEACHER__";
const REPEAT_COMMAND = "__REPEAT_TUITION_AI_TEACHER__";
const SIMPLER_COMMAND = "__SIMPLER_TUITION_AI_TEACHER__";
const EXAMPLE_COMMAND = "__EXAMPLE_TUITION_AI_TEACHER__";
const CHECK_COMMAND = "__CHECK_TUITION_AI_TEACHER__";

const SETTINGS_STORAGE_KEY = "cc_tuition_teacher_settings_v2";
const AUTO_FOCUS_COOLDOWN_MS = 1400;
const EXACT_SPEECH_ENGINE = "openai_tts_whisper_word_timestamps";
const MIC_STATUS_IDLE = "Press and hold the mic button to speak. Release to stop recording.";
const MIC_STATUS_LISTENING = "Listening... keep holding the mic button.";
const MIC_STATUS_UNSUPPORTED = "Voice input is not supported in this browser. You can still type your doubt.";
const MIC_STATUS_RETRY = "Mic input could not continue. Release and press again to retry.";
const MIC_STATUS_START_FAILED = "Mic input could not start. Release and press again to retry.";
const TEACHER_COMMANDS = new Set([
  START_COMMAND,
  CONTINUE_COMMAND,
  REPEAT_COMMAND,
  SIMPLER_COMMAND,
  EXAMPLE_COMMAND,
  CHECK_COMMAND,
]);

const normalizeRole = (user) =>
  String(user?.role || user?.userRole || user?.user_type || user?.accountType || "")
    .trim()
    .toUpperCase();

const query = new URLSearchParams(window.location.search || "");
const chapterId = query.get("chapterId") || "";
const sessionIdFromQuery = query.get("sessionId") || "";

const resolveTuitionPagePath = (name, params = {}) => {
  const pathname = String(window.location.pathname || "");
  const isExtensionless = Boolean(pathname) && pathname !== "/" && !pathname.endsWith(".html");
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    queryParams.set(key, String(value));
  });
  const queryString = queryParams.toString();
  return `./${name}${isExtensionless ? "" : ".html"}${queryString ? `?${queryString}` : ""}`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const normalizeTeacherSetting = (value) =>
  String(value || "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const readSavedSettings = () => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const stopSpeech = (resetBoardLoading = true) => {
  if (resetBoardLoading && window.__ccTuitionTeacherSetBoardLoading) {
    window.__ccTuitionTeacherSetBoardLoading(false);
  }
  if (window.__ccTuitionTeacherSpeechController?.cancel) {
    window.__ccTuitionTeacherSpeechController.cancel();
    window.__ccTuitionTeacherSpeechController = null;
  }
  if (window.__ccTuitionTeacherStageAudio instanceof HTMLAudioElement) {
    try {
      window.__ccTuitionTeacherStageAudio.pause();
      window.__ccTuitionTeacherStageAudio.currentTime = 0;
      window.__ccTuitionTeacherStageAudio.removeAttribute("src");
      window.__ccTuitionTeacherStageAudio.load();
    } catch {
      // Ignore audio cleanup errors.
    }
    window.__ccTuitionTeacherStageAudio = null;
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

const normalizeSpeechText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const getSpeechStopwords = (languageCode) => {
  const normalizedLanguage = normalizeLanguageCode(languageCode);
  if (normalizedLanguage === "HINDI") {
    return new Set(["और", "या", "का", "की", "के", "है", "हैं", "में", "से", "पर", "को", "एक"]);
  }
  if (normalizedLanguage === "PUNJABI") {
    return new Set(["ਅਤੇ", "ਜਾਂ", "ਦਾ", "ਦੀ", "ਦੇ", "ਹੈ", "ਹਨ", "ਵਿੱਚ", "ਤੋਂ", "ਤੇ", "ਨੂੰ", "ਕਿ", "ਇੱਕ"]);
  }
  return new Set(["and", "or", "the", "a", "an", "to", "of", "for", "with", "into", "in"]);
};

const compactSpeechBoardLine = (text, languageCode, teachingDepth) => {
  const normalized = normalizeSpeechText(text)
    .split(/[;:]/u)[0]
    .trim();
  if (!normalized) return "";
  const maxWords = teachingDepth === "BASIC" ? 7 : teachingDepth === "ADVANCED" ? 12 : 10;
  const words = normalized.split(/\s+/u).filter(Boolean);
  if (words.length <= maxWords) {
    return normalized.replace(/[.,;:!?।॥]+$/u, "").trim();
  }
  const stopwords = getSpeechStopwords(languageCode);
  let compactWords = words.slice(0, Math.min(words.length, maxWords + 3));
  while (
    compactWords.length > Math.max(4, maxWords - 1) &&
    stopwords.has(compactWords[compactWords.length - 1].toLowerCase())
  ) {
    compactWords = compactWords.slice(0, -1);
  }
  return compactWords.join(" ").replace(/[.,;:!?।॥]+$/u, "").trim();
};

const splitSpeechUnits = (text) =>
  normalizeSpeechText(text)
    .split(/(?<=[.!?।॥])\s+|(?<=,)\s+|(?<=;)\s+/u)
    .map((unit) => normalizeSpeechText(unit))
    .filter(Boolean);

const normalizeLanguageCode = (value) => String(value || "").trim().toUpperCase();

const normalizeWordToken = (value) =>
  String(value || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();

const createAudioObjectUrlFromBase64 = (base64, mimeType = "audio/mpeg") => {
  const raw = String(base64 || "").trim();
  if (!raw) throw new Error("Speech audio payload is empty.");
  const binary = window.atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], { type: mimeType || "audio/mpeg" });
  return URL.createObjectURL(blob);
};

const tokenizeSourceWords = (text) =>
  normalizeSpeechText(text)
    .split(/\s+/u)
    .map((word) => ({
      raw: String(word || "").trim(),
      norm: normalizeWordToken(word),
    }))
    .filter((word) => Boolean(word.raw) && Boolean(word.norm));

const alignTimedWordsSequentially = (timedWords, texts) => {
  const safeWords = Array.isArray(timedWords) ? timedWords : [];
  let cursor = 0;
  return (Array.isArray(texts) ? texts : []).map((text) => {
    const tokens = tokenizeSourceWords(text);
    const matched = [];
    tokens.forEach((token) => {
      while (cursor < safeWords.length) {
        const candidate = safeWords[cursor];
        cursor += 1;
        if (normalizeWordToken(candidate?.text) !== token.norm) {
          continue;
        }
        matched.push({
          startMs: Number(candidate?.startMs || 0),
          endMs: Number(candidate?.endMs || 0),
          text: token.raw,
        });
        break;
      }
    });
    return matched.filter((word) => word.endMs > word.startMs);
  });
};

const alignTimedWordsBySegments = (timedWords, segments) => {
  const safeWords = Array.isArray(timedWords) ? timedWords : [];
  const safeSegments = Array.isArray(segments) ? segments : [];
  return safeSegments.map((segment) =>
    safeWords.filter((word) => {
      const startMs = Number(word?.startMs || 0);
      const endMs = Number(word?.endMs || 0);
      return (
        endMs > startMs &&
        startMs >= Number(segment?.startMs || 0) &&
        endMs <= Number(segment?.endMs || 0)
      );
    })
  );
};

const buildExactTimelineWords = (timedWords, sourceText) => {
  return (Array.isArray(timedWords) ? timedWords : [])
    .map((word) => ({
      startMs: Number(word?.startMs || 0),
      endMs: Number(word?.endMs || 0),
      text: String(word?.text || "").trim(),
    }))
    .filter((word) => word.endMs > word.startMs && word.text);
};

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderBehavior();

  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || normalizeRole(user) !== "STUDENT") {
    goToStudentLogin();
    return;
  }

  if (!chapterId) {
    window.location.href = resolveTuitionPagePath("tuition-chapters");
    return;
  }

  const titleEl = document.querySelector("#tuitionTeacherTitle");
  const summaryEl = document.querySelector("#tuitionTeacherSummary");
  const sessionLabelEl = document.querySelector("#tuitionTeacherSessionLabel");
  const sessionMetaEl = document.querySelector("#tuitionTeacherSessionMeta");
  const statusEl = document.querySelector("#tuitionTeacherStatus");
  const teachBtn = document.querySelector("#tuitionTeacherTeachBtn");
  const resumeBtn = document.querySelector("#tuitionTeacherResumeBtn");
  const subjectEl = document.querySelector("#tuitionTeacherSubject");
  const topicEl = document.querySelector("#tuitionTeacherTopic");
  const explanationLanguageEl = document.querySelector("#tuitionTeacherExplanationLanguage");
  const boardLanguageEl = document.querySelector("#tuitionTeacherBoardLanguage");
  const voiceLanguageEl = document.querySelector("#tuitionTeacherVoiceLanguage");
  const teachingDepthEl = document.querySelector("#tuitionTeacherTeachingDepth");
  const speedEl = document.querySelector("#tuitionTeacherSpeed");
  const difficultyEl = document.querySelector("#tuitionTeacherDifficulty");
  const boardModalEl = document.querySelector("#tuitionTeacherBoardModal");
  const boardModalOverlayEl = document.querySelector("#tuitionTeacherBoardModalOverlay");
  const boardModalCloseBtn = document.querySelector("#tuitionTeacherBoardModalCloseBtn");
  const boardLoadingOverlayEl = document.querySelector("#tuitionTeacherBoardLoadingOverlay");
  const openBoardBtn = document.querySelector("#tuitionTeacherOpenBoardBtn");
  const boardTitleEl = document.querySelector("#tuitionTeacherBoardTitle");
  const boardMetaEl = document.querySelector("#tuitionTeacherBoardMeta");
  const teacherStageTitleEl = document.querySelector("#tuitionTeacherLiveBoardStepTitle");
  const teacherStatusEl = document.querySelector("#tuitionTeacherBoardTeachingStatus");
  const narrationTextEl = document.querySelector("#tuitionTeacherNarrationText");
  const boardCanvasTitleEl = document.querySelector("#tuitionTeacherBoardCanvasTitle");
  const boardCanvasHintEl = document.querySelector("#tuitionTeacherBoardCanvasHint");
  const boardTeacherCueEl = document.querySelector("#tuitionTeacherBoardTeacherCue");
  const whiteboardSurfaceEl = document.querySelector("#tuitionTeacherWhiteboardSurface");
  const stageAudioEl = document.querySelector("#tuitionTeacherStageAudio");
  const boardCurrentConceptEl = document.querySelector("#tuitionTeacherBoardCurrentConcept");
  const boardAnchorsEl = document.querySelector("#tuitionTeacherBoardAnchors");
  const boardFormulaBlockEl = document.querySelector("#tuitionTeacherBoardFormulaBlock");
  const boardFormulaEl = document.querySelector("#tuitionTeacherBoardFormula");
  const boardExampleBlockEl = document.querySelector("#tuitionTeacherBoardExampleBlock");
  const boardExampleLineEl = document.querySelector("#tuitionTeacherBoardExampleLine");
  const boardDiagramBlockEl = document.querySelector("#tuitionTeacherBoardDiagramBlock");
  const boardDiagramLabelsEl = document.querySelector("#tuitionTeacherBoardDiagramLabels");
  const boardRecapBlockEl = document.querySelector("#tuitionTeacherBoardRecapBlock");
  const boardRecapKeywordsEl = document.querySelector("#tuitionTeacherBoardRecapKeywords");
  const questionForm = document.querySelector("#tuitionTeacherQuestionForm");
  const questionInputEl = document.querySelector("#tuitionTeacherQuestionInput");
  const holdToTalkBtn = document.querySelector("#tuitionTeacherHoldToTalkBtn");
  const boardHoldToTalkBtn = document.querySelector("#tuitionTeacherBoardHoldToTalkBtn");
  const micStatusEl = document.querySelector("#tuitionTeacherMicStatus");
  const boardMicStatusEl = document.querySelector("#tuitionTeacherBoardMicStatus");
  const quickSimplerBtn = document.querySelector("#tuitionTeacherQuickSimplerBtn");
  const quickExampleBtn = document.querySelector("#tuitionTeacherQuickExampleBtn");
  const quickRepeatBtn = document.querySelector("#tuitionTeacherQuickRepeatBtn");
  const quickCheckBtn = document.querySelector("#tuitionTeacherQuickCheckBtn");
  const quickContinueBtn = document.querySelector("#tuitionTeacherQuickContinueBtn");
  const replayLastBtn = document.querySelector("#tuitionTeacherReplayLastBtn");
  const boardPrevBtn = document.querySelector("#tuitionTeacherBoardPrevBtn");
  const boardRepeatBtn = document.querySelector("#tuitionTeacherBoardRepeatBtn");
  const boardStopBtn = document.querySelector("#tuitionTeacherBoardStopBtn");
  const boardContinueBtn = document.querySelector("#tuitionTeacherBoardContinueBtn");
  const boardReplayBtn = document.querySelector("#tuitionTeacherBoardReplayBtn");
  const boardNextBtn = document.querySelector("#tuitionTeacherBoardNextBtn");
  const restartTopicBtn = document.querySelector("#tuitionTeacherRestartTopicBtn");
  const doubtPanelEl = document.querySelector("#tuitionTeacherDoubtPanel");
  const doubtTitleEl = document.querySelector("#tuitionTeacherDoubtTitle");
  const doubtQuestionEl = document.querySelector("#tuitionTeacherDoubtQuestion");
  const doubtAnswerEl = document.querySelector("#tuitionTeacherDoubtAnswer");
  const doubtContinueBtn = document.querySelector("#tuitionTeacherDoubtContinueBtn");
  const voiceBtn = document.querySelector("#tuitionTeacherVoiceBtn");
  const voiceEndBtn = document.querySelector("#tuitionTeacherVoiceEndBtn");
  const voiceStateEl = document.querySelector("#tuitionTeacherVoiceState");
  const voiceMetaEl = document.querySelector("#tuitionTeacherVoiceMeta");
  const voiceAudioEl = document.querySelector("#tuitionTeacherVoiceAudio");
  const homeworkBtn = document.querySelector("#tuitionTeacherHomeworkBtn");

  let activeSessionId = sessionIdFromQuery;
  let chapterContext = null;
  let currentSession = null;
  let currentAssistant = null;
  let currentAssistantMessageId = "";
  let activeBoardMessageId = "";
  let activeBoardOverride = null;
  let lastAutoFocusAt = 0;
  let activeInteractionMode = "teaching";
  const exactSpeechTrackCache = new Map();
  const SpeechRecognitionCtor =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let doubtSpeechRecognition = null;
  let isHoldingTalk = false;
  let activeHoldSource = "";
  let holdTalkStartSnapshot = "";
  let pendingBoardAutoAsk = false;
  let voiceSession = {
    peerConnection: null,
    localStream: null,
    dataChannel: null,
    remoteStream: null,
    status: "idle",
  };

  const setStatus = (message, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = message;
    statusEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  const showSpeechFailureState = (message) => {
    const fallback =
      message || "Teacher audio is unavailable right now, so the board cannot play voice-synced teaching.";
    if (teacherStatusEl instanceof HTMLElement) {
      teacherStatusEl.textContent = fallback;
      teacherStatusEl.className = "tuition-board-teaching-status";
    }
    if (narrationTextEl instanceof HTMLElement) {
      narrationTextEl.textContent = fallback;
    }
  };

  const syncMicButtons = (isRecording = false) => {
    [holdToTalkBtn, boardHoldToTalkBtn].forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.classList.toggle("is-recording", isRecording);
    });
    if (holdToTalkBtn instanceof HTMLElement) {
      holdToTalkBtn.textContent = isRecording ? "Release To Stop" : "Hold To Talk";
    }
    if (boardHoldToTalkBtn instanceof HTMLElement) {
      boardHoldToTalkBtn.setAttribute(
        "aria-label",
        isRecording ? "Release to stop speaking your doubt from the live board" : "Hold to speak your doubt from the live board"
      );
      boardHoldToTalkBtn.setAttribute("title", isRecording ? "Release To Stop" : "Hold To Talk");
    }
  };

  const openBoardModal = () => {
    if (!(boardModalEl instanceof HTMLElement)) return;
    boardModalEl.classList.remove("hidden");
    boardModalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("tuition-live-board-open");
  };

  const clearBoardForProcessing = () => {
    activeBoardOverride = null;
    activeBoardMessageId = "";
    if (boardCanvasTitleEl instanceof HTMLElement) {
      boardCanvasTitleEl.textContent = "";
      boardCanvasTitleEl.classList.add("hidden");
    }
    if (teacherStatusEl instanceof HTMLElement) {
      teacherStatusEl.textContent = "";
      teacherStatusEl.className = "tuition-board-teaching-status hidden";
    }
    if (boardCurrentConceptEl instanceof HTMLElement) {
      boardCurrentConceptEl.textContent = "";
      boardCurrentConceptEl.classList.remove("is-live");
    }
    if (boardFormulaBlockEl instanceof HTMLElement) {
      boardFormulaBlockEl.classList.add("hidden");
    }
    if (boardExampleBlockEl instanceof HTMLElement) {
      boardExampleBlockEl.classList.add("hidden");
    }
    if (boardDiagramBlockEl instanceof HTMLElement) {
      boardDiagramBlockEl.classList.add("hidden");
    }
    if (boardRecapBlockEl instanceof HTMLElement) {
      boardRecapBlockEl.classList.add("hidden");
    }
    if (boardAnchorsEl instanceof HTMLElement) {
      boardAnchorsEl.innerHTML = "";
      boardAnchorsEl.classList.add("hidden");
    }
    if (boardDiagramLabelsEl instanceof HTMLElement) {
      boardDiagramLabelsEl.innerHTML = "";
    }
    if (boardRecapKeywordsEl instanceof HTMLElement) {
      boardRecapKeywordsEl.innerHTML = "";
    }
    if (boardFormulaEl instanceof HTMLElement) {
      boardFormulaEl.textContent = "";
    }
    if (boardExampleLineEl instanceof HTMLElement) {
      boardExampleLineEl.textContent = "";
    }
    if (narrationTextEl instanceof HTMLElement) {
      narrationTextEl.textContent = "";
    }
  };

  const setBoardLoading = (isLoading, message = "Please wait while the lesson is being prepared.") => {
    if (!(boardLoadingOverlayEl instanceof HTMLElement)) return;
    if (isLoading) {
      clearBoardForProcessing();
    }
    boardLoadingOverlayEl.classList.toggle("hidden", !isLoading);
    boardLoadingOverlayEl.setAttribute("aria-hidden", isLoading ? "false" : "true");
    if (whiteboardSurfaceEl instanceof HTMLElement) {
      whiteboardSurfaceEl.classList.toggle("is-processing", isLoading);
    }
    const textEl = boardLoadingOverlayEl.querySelector(".tuition-teacher-board-loading-text");
    if (textEl instanceof HTMLElement) {
      textEl.textContent = message;
    }
  };
  window.__ccTuitionTeacherSetBoardLoading = setBoardLoading;

  const setMicStatus = (message, isRecording = false) => {
    if (micStatusEl instanceof HTMLElement) {
      micStatusEl.textContent = message;
    }
    if (boardMicStatusEl instanceof HTMLElement) {
      boardMicStatusEl.textContent = message;
      boardMicStatusEl.classList.toggle("is-recording", isRecording);
    }
    syncMicButtons(isRecording);
  };

  const closeBoardModal = () => {
    if (!(boardModalEl instanceof HTMLElement)) return;
    stopSpeech(false);
    setBoardLoading(false);
    boardModalEl.classList.add("hidden");
    boardModalEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("tuition-live-board-open");
  };

  const currentTeacherContext = () => {
    const explanationLanguage =
      explanationLanguageEl instanceof HTMLSelectElement ? explanationLanguageEl.value : "ENGLISH";
    return {
      subject: subjectEl instanceof HTMLInputElement ? subjectEl.value.trim() : "",
      topic: topicEl instanceof HTMLInputElement ? topicEl.value.trim() : "",
      explanationLanguage,
      boardLanguage:
        boardLanguageEl instanceof HTMLSelectElement ? boardLanguageEl.value : explanationLanguage,
      voiceLanguage:
        voiceLanguageEl instanceof HTMLSelectElement ? voiceLanguageEl.value : explanationLanguage,
      teachingDepth: teachingDepthEl instanceof HTMLSelectElement ? teachingDepthEl.value : "MODERATE",
      speedMode: speedEl instanceof HTMLSelectElement ? speedEl.value : "NORMAL",
      difficultyMode: difficultyEl instanceof HTMLSelectElement ? difficultyEl.value : "MEDIUM",
      curriculumBoard: chapterContext?.profile?.boardName || chapterContext?.chapterContext?.boardName || "",
    };
  };

  const persistSettings = () => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentTeacherContext()));
    } catch {
      // Ignore storage failures.
    }
  };

  const applySavedSettings = () => {
    const saved = readSavedSettings();
    const apply = (el, value) => {
      if (el instanceof HTMLSelectElement && value) {
        el.value = String(value).toUpperCase();
      }
    };
    apply(explanationLanguageEl, saved.explanationLanguage);
    apply(boardLanguageEl, saved.boardLanguage);
    apply(voiceLanguageEl, saved.voiceLanguage);
    apply(teachingDepthEl, saved.teachingDepth);
    apply(speedEl, saved.speedMode);
    apply(difficultyEl, saved.difficultyMode);
  };

  const appendDoubtText = (text) => {
    if (!(questionInputEl instanceof HTMLTextAreaElement)) return;
    const nextText = normalizeSpeechText(
      [questionInputEl.value, text].filter(Boolean).join(" ")
    );
    questionInputEl.value = nextText;
    questionInputEl.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const applyTeacherSettingsToControls = (context = {}) => {
    if (subjectEl instanceof HTMLInputElement && typeof context.subject === "string") {
      subjectEl.value = context.subject;
    }
    if (topicEl instanceof HTMLInputElement && typeof context.topic === "string") {
      topicEl.value = context.topic;
    }
    if (explanationLanguageEl instanceof HTMLSelectElement && context.explanationLanguage) {
      explanationLanguageEl.value = String(context.explanationLanguage).toUpperCase();
    }
    if (boardLanguageEl instanceof HTMLSelectElement && context.boardLanguage) {
      boardLanguageEl.value = String(context.boardLanguage).toUpperCase();
    }
    if (voiceLanguageEl instanceof HTMLSelectElement && context.voiceLanguage) {
      voiceLanguageEl.value = String(context.voiceLanguage).toUpperCase();
    }
    if (teachingDepthEl instanceof HTMLSelectElement && context.teachingDepth) {
      teachingDepthEl.value = String(context.teachingDepth).toUpperCase();
    }
    if (speedEl instanceof HTMLSelectElement && context.speedMode) {
      speedEl.value = String(context.speedMode).toUpperCase();
    }
    if (difficultyEl instanceof HTMLSelectElement && context.difficultyMode) {
      difficultyEl.value = String(context.difficultyMode).toUpperCase();
    }
  };

  const hasTeacherContextDrift = () => {
    const sessionContext = currentSession?.teacherContext || {};
    const nextContext = currentTeacherContext();
    return (
      normalizeTeacherSetting(sessionContext.subject) !== normalizeTeacherSetting(nextContext.subject) ||
      normalizeTeacherSetting(sessionContext.topic) !== normalizeTeacherSetting(nextContext.topic) ||
      normalizeTeacherSetting(sessionContext.explanationLanguage) !== normalizeTeacherSetting(nextContext.explanationLanguage) ||
      normalizeTeacherSetting(sessionContext.boardLanguage) !== normalizeTeacherSetting(nextContext.boardLanguage) ||
      normalizeTeacherSetting(sessionContext.voiceLanguage) !== normalizeTeacherSetting(nextContext.voiceLanguage) ||
      normalizeTeacherSetting(sessionContext.teachingDepth) !== normalizeTeacherSetting(nextContext.teachingDepth)
    );
  };

  const extractLatestAssistantMessage = (messages) =>
    [...(Array.isArray(messages) ? messages : [])]
      .reverse()
      .find((message) => message?.role === "ASSISTANT" && message?.structured) || null;

  const getAssistantMessages = (messages) =>
    (Array.isArray(messages) ? messages : []).filter(
      (message) => message?.role === "ASSISTANT" && message?.structured
    );

  const getAssistantMessageIndex = (messages, messageId) =>
    getAssistantMessages(messages).findIndex((message) => message?.id === messageId);

  const getAssistantMessageByOffset = (messages, messageId, offset) => {
    const assistantMessages = getAssistantMessages(messages);
    if (!assistantMessages.length) return null;
    const currentIndex = getAssistantMessageIndex(messages, messageId);
    const safeIndex = currentIndex >= 0 ? currentIndex : assistantMessages.length - 1;
    const targetIndex = safeIndex + offset;
    if (targetIndex < 0 || targetIndex >= assistantMessages.length) {
      return null;
    }
    return assistantMessages[targetIndex] || null;
  };

  const extractLatestStructured = (messages) => extractLatestAssistantMessage(messages)?.structured || null;

  const isTeacherCommandMessage = (content) => TEACHER_COMMANDS.has(String(content || "").trim());

  const extractLatestDoubtExchange = (messages) => {
    const safeMessages = Array.isArray(messages) ? messages : [];
    for (let index = safeMessages.length - 1; index >= 0; index -= 1) {
      const message = safeMessages[index];
      if (message?.role !== "USER" || isTeacherCommandMessage(message?.content)) {
        continue;
      }
      const answer = safeMessages
        .slice(index + 1)
        .find((candidate) => candidate?.role === "ASSISTANT" && candidate?.structured);
      if (!answer?.structured) {
        continue;
      }
      return {
        question: String(message?.content || "").trim(),
        answer:
          [
            answer.structured.teacherIntro,
            answer.structured.teacherExplanation,
            answer.structured.teacherCheckQuestion,
          ]
            .filter(Boolean)
            .join("\n\n")
            .trim() || "The teacher answered the doubt.",
      };
    }
    return null;
  };

  const getStageFocusTarget = () =>
    whiteboardSurfaceEl instanceof HTMLElement
      ? whiteboardSurfaceEl.querySelector(".tuition-ai-teacher-board-head") || whiteboardSurfaceEl
      : null;

  const getBoardFocusTarget = () =>
    boardCurrentConceptEl instanceof HTMLElement
      ? whiteboardSurfaceEl || boardCurrentConceptEl.closest(".tuition-ai-teacher-board-focus") || boardCurrentConceptEl
      : null;

  const keepBoardTextVisible = (behavior = "smooth") => {
    if (!(whiteboardSurfaceEl instanceof HTMLElement) || !(boardCurrentConceptEl instanceof HTMLElement)) return;
    const conceptBlock =
      boardCurrentConceptEl.closest(".tuition-ai-teacher-board-focus") || boardCurrentConceptEl;
    if (!(conceptBlock instanceof HTMLElement)) return;
    const conceptContainer =
      boardCurrentConceptEl.closest(".tuition-ai-teacher-board-focus") || whiteboardSurfaceEl;
    if (!(conceptContainer instanceof HTMLElement)) return;

    const bottomPadding = 36;
    const targetScrollTop = Math.max(0, conceptContainer.scrollHeight - conceptContainer.clientHeight + bottomPadding);

    conceptContainer.scrollTo({
      top: targetScrollTop,
      behavior,
    });
  };

  const getModalScrollContainer = () =>
    boardModalEl instanceof HTMLElement && !boardModalEl.classList.contains("hidden")
      ? boardModalEl
      : document.scrollingElement instanceof HTMLElement
      ? document.scrollingElement
      : document.documentElement instanceof HTMLElement
        ? document.documentElement
        : null;

  const isMostlyVisible = (element, container = null) => {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    const containerRect =
      container instanceof HTMLElement
        ? container.getBoundingClientRect()
        : { top: 0, bottom: window.innerHeight || document.documentElement.clientHeight || 0 };
    return rect.top >= containerRect.top + 72 && rect.bottom <= containerRect.bottom - 48;
  };

  const scrollTargetIntoContainer = (target, block = "center") => {
    if (!(target instanceof HTMLElement)) return;
    target.scrollIntoView({ behavior: "smooth", block, inline: "nearest" });
  };

  const scrollWithinContainer = (container, target, marginTop = 96, marginBottom = 72) => {
    if (!(container instanceof HTMLElement) || !(target instanceof HTMLElement)) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    let nextTop = container.scrollTop;
    if (targetRect.top < containerRect.top + marginTop) {
      nextTop += targetRect.top - containerRect.top - marginTop;
    } else if (targetRect.bottom > containerRect.bottom - marginBottom) {
      nextTop += targetRect.bottom - containerRect.bottom + marginBottom;
    } else {
      return;
    }
    container.scrollTo({
      top: Math.max(0, Math.round(nextTop)),
      behavior: "smooth",
    });
  };

  const focusActiveTeachingRegion = (reason = "active-step") => {
    const now = Date.now();
    if (now - lastAutoFocusAt < AUTO_FOCUS_COOLDOWN_MS && reason !== "new-step") {
      return;
    }
    const stageTarget = getStageFocusTarget();
    const boardTarget = getBoardFocusTarget();
    const modalContainer = getModalScrollContainer();
    const boardVisible = isMostlyVisible(boardTarget, modalContainer);
    const stageVisible = isMostlyVisible(stageTarget, modalContainer);
    const cueVisible =
      !(boardTeacherCueEl instanceof HTMLElement) || isMostlyVisible(boardTeacherCueEl, modalContainer);
    if (boardVisible && cueVisible && stageVisible) {
      return;
    }
    const target = !stageVisible
      ? stageTarget
      : !boardVisible
        ? boardTarget
        : !cueVisible
          ? boardTeacherCueEl
          : boardTarget || stageTarget;
    lastAutoFocusAt = now;
    if (modalContainer instanceof HTMLElement && stageTarget instanceof HTMLElement) {
      scrollWithinContainer(modalContainer, stageTarget, 92, 72);
      window.setTimeout(() => scrollWithinContainer(modalContainer, stageTarget, 92, 72), 180);
    }
    if (modalContainer instanceof HTMLElement && boardTarget instanceof HTMLElement) {
      scrollWithinContainer(modalContainer, boardTarget, 120, 90);
      window.setTimeout(() => scrollWithinContainer(modalContainer, boardTarget, 120, 90), 260);
    }
    if (target instanceof HTMLElement) {
      window.setTimeout(() => scrollTargetIntoContainer(target, "center"), 120);
    }
    if (boardTarget instanceof HTMLElement && target !== boardTarget) {
      window.setTimeout(() => scrollTargetIntoContainer(boardTarget, "center"), 260);
    }
    window.setTimeout(() => keepBoardTextVisible("smooth"), 200);
  };

  const fetchExactSpeechTrack = async (messageId) => {
    if (!messageId) {
      throw new Error("Exact speech sync is unavailable because the teacher message id is missing.");
    }
    const cached = exactSpeechTrackCache.get(messageId);
    if (cached) {
      return cached;
    }
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}/speech-track`,
      method: "POST",
      token,
      body: { messageId },
    });
    const speechTrack = payload?.speechTrack || null;
    if (!speechTrack?.words?.length) {
      throw new Error("Exact speech sync is blocked because no exact timestamped words were returned.");
    }
    if (speechTrack.engine !== EXACT_SPEECH_ENGINE || speechTrack.syncType !== "exact_timestamp_words") {
      throw new Error("Exact speech sync is blocked because the tuition speech engine did not return exact timestamped words.");
    }
    exactSpeechTrackCache.set(messageId, speechTrack);
    return speechTrack;
  };

  const updateBoardNavigationControls = () => {
    const assistantMessages = getAssistantMessages(currentSession?.messages || []);
    const currentIndex = getAssistantMessageIndex(
      currentSession?.messages || [],
      activeBoardMessageId || currentAssistantMessageId
    );
    const safeIndex = currentIndex >= 0 ? currentIndex : assistantMessages.length - 1;
    if (boardPrevBtn instanceof HTMLButtonElement) {
      boardPrevBtn.disabled = assistantMessages.length < 2 || safeIndex <= 0;
    }
    if (boardNextBtn instanceof HTMLButtonElement) {
      boardNextBtn.disabled = assistantMessages.length < 2 || safeIndex >= assistantMessages.length - 1;
    }
    if (boardReplayBtn instanceof HTMLButtonElement) {
      boardReplayBtn.disabled = assistantMessages.length < 1;
    }
    if (boardStopBtn instanceof HTMLButtonElement) {
      boardStopBtn.disabled = !(window.__ccTuitionTeacherStageAudio instanceof HTMLAudioElement);
    }
  };

  const buildExactBoardPlan = (assistant, speechTrack, languageCode) => {
    const sourceText = normalizeSpeechText(
      speechTrack?.sourceText || assistant?.teacherExplanation || assistant?.teacherIntro || ""
    );
    const timelineWords = buildExactTimelineWords(speechTrack?.words || [], sourceText);

    return {
      timelineWords,
      fullText: sourceText,
      languageCode,
    };
  };

  const renderTextFromExactWords = (words, currentMs) => {
    const safeWords = Array.isArray(words) ? words : [];
    const visibleWords = safeWords.filter((word) => Number(word?.startMs || 0) <= currentMs);
    return visibleWords.map((word) => String(word?.text || "").trim()).filter(Boolean).join(" ").trim();
  };

  const getExactSpeechDrivenBoardState = (assistant, boardPlan, currentMs) => {
    const boardState = assistant?.boardState || {};
    const timelineWords = Array.isArray(boardPlan?.timelineWords) ? boardPlan.timelineWords : [];
    const visibleTranscript = renderTextFromExactWords(timelineWords, currentMs);
    if (!timelineWords.length) {
      return {
        ...boardState,
        currentConcept: normalizeSpeechText(assistant?.teacherExplanation || assistant?.teacherIntro || ""),
        anchors: [],
        formula: null,
        example: null,
        recapKeywords: [],
      };
    }
    return {
      ...boardState,
      currentConcept: visibleTranscript,
      anchors: [],
      formula: null,
      example: null,
      diagramLabels: [],
      recapKeywords: [],
      teacherCue: visibleTranscript,
      highlight: visibleTranscript,
    };
  };

  const startSpeechDrivenBoardSync = async (assistantMessage, languageCode, focusReason = "new-step") => {
    const assistant = assistantMessage?.structured || assistantMessage || null;
    const messageId = assistantMessage?.id || currentAssistantMessageId || "";
    if (!assistant || !messageId) {
      throw new Error("Exact speech sync is unavailable because the tuition teacher message is missing.");
    }
    if (!(stageAudioEl instanceof HTMLAudioElement)) {
      throw new Error("Exact speech sync is unavailable because the tuition stage audio element is missing.");
    }

    stopSpeech();
    activeBoardMessageId = messageId;
    updateBoardNavigationControls();

    const speechTrack = await fetchExactSpeechTrack(messageId);
    const boardLanguage = currentSession?.teacherContext?.boardLanguage || speechTrack.language || languageCode;
    const boardPlan = buildExactBoardPlan(assistant, speechTrack, boardLanguage);
    const objectUrl = createAudioObjectUrlFromBase64(speechTrack.audioBase64, speechTrack.mimeType);
    let frameId = 0;

    const syncBoardToAudio = () => {
      const currentMs = Math.max(0, Math.round(stageAudioEl.currentTime * 1000));
      activeBoardOverride = getExactSpeechDrivenBoardState(assistant, boardPlan, currentMs);
      renderMinimalBoard(assistant, activeBoardOverride);
      if (narrationTextEl instanceof HTMLElement) {
        narrationTextEl.textContent = getExactSpeechDrivenNarration(assistant, boardPlan, currentMs);
      }
      if (!stageAudioEl.paused && !stageAudioEl.ended) {
        frameId = window.requestAnimationFrame(syncBoardToAudio);
      }
    };

    activeBoardOverride = getExactSpeechDrivenBoardState(assistant, boardPlan, 0);
    renderMinimalBoard(assistant, activeBoardOverride);
    if (narrationTextEl instanceof HTMLElement) {
      narrationTextEl.textContent = getExactSpeechDrivenNarration(assistant, boardPlan, 0);
    }
    focusActiveTeachingRegion(focusReason);

    stageAudioEl.src = objectUrl;
    stageAudioEl.load();

    const cleanup = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (stageAudioEl.src === objectUrl) {
        try {
          stageAudioEl.pause();
          stageAudioEl.currentTime = 0;
          stageAudioEl.removeAttribute("src");
          stageAudioEl.load();
        } catch {
          // Ignore audio cleanup errors.
        }
      }
      URL.revokeObjectURL(objectUrl);
      window.__ccTuitionTeacherSpeechController = null;
      window.__ccTuitionTeacherStageAudio = null;
      updateBoardNavigationControls();
    };

    stageAudioEl.onplay = () => {
      setBoardLoading(false);
      if (teacherStatusEl instanceof HTMLElement) {
        teacherStatusEl.className = "tuition-board-teaching-status state-writing";
      }
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(syncBoardToAudio);
    };
    stageAudioEl.onended = () => {
      setBoardLoading(false);
      activeBoardOverride = getExactSpeechDrivenBoardState(
        assistant,
        boardPlan,
        Number(boardPlan?.timelineWords?.at?.(-1)?.endMs || speechTrack.words.at(-1)?.endMs || 0)
      );
      renderMinimalBoard(assistant, activeBoardOverride);
      if (narrationTextEl instanceof HTMLElement) {
        narrationTextEl.textContent = normalizeSpeechText(
          assistant?.teacherExplanation || assistant?.teacherIntro || narrationTextEl.textContent || ""
        );
      }
      if (teacherStatusEl instanceof HTMLElement) {
        teacherStatusEl.className = "tuition-board-teaching-status state-complete";
      }
      cleanup();
    };
    stageAudioEl.onerror = () => {
      setBoardLoading(false);
      if (teacherStatusEl instanceof HTMLElement) {
        teacherStatusEl.className = "tuition-board-teaching-status";
      }
      cleanup();
    };

    window.__ccTuitionTeacherSpeechController = {
      cancel: () => {
        cleanup();
      },
    };
    window.__ccTuitionTeacherStageAudio = stageAudioEl;
    updateBoardNavigationControls();

    try {
      await stageAudioEl.play();
    } catch (error) {
      cleanup();
      throw error instanceof Error ? error : new Error("Unable to play the exact teacher speech track.");
    }
  };

  const renderSummaryRow = (chapter, progress) => {
    if (!(summaryEl instanceof HTMLElement)) return;
    const chips = [
      chapter?.syllabusTitle ? `Syllabus: ${chapter.syllabusTitle}` : "",
      chapter?.title ? `Chapter: ${chapter.title}` : "",
      Number.isFinite(Number(progress?.completionPercent))
        ? `Progress: ${Math.round(Number(progress.completionPercent))}%`
        : "",
    ].filter(Boolean);
    summaryEl.innerHTML = chips.map((chip) => `<span class=\"tuition-summary-inline\">${escapeHtml(chip)}</span>`).join("");
  };

  const renderSessionMeta = (session, progress) => {
    if (!(sessionMetaEl instanceof HTMLElement)) return;
    const chips = [
      session?.teacherContext?.explanationLanguage || "",
      session?.teacherContext?.teachingDepth || "",
      Number.isFinite(Number(progress?.completionPercent))
        ? `${Math.round(Number(progress.completionPercent))}%`
        : "",
    ].filter(Boolean);
    sessionMetaEl.innerHTML = chips.map((chip) => `<span class=\"tuition-chip\">${escapeHtml(chip)}</span>`).join("");
  };

  const renderBoardMeta = (session, assistant) => {
    if (!(boardMetaEl instanceof HTMLElement)) return;
    const chips = [
      session?.teacherContext?.boardLanguage || "",
      session?.teacherContext?.voiceLanguage || "",
      assistant?.teacherState?.currentTeachingPhase || "",
    ].filter(Boolean);
    boardMetaEl.innerHTML = chips.map((chip) => `<span class=\"tuition-chip\">${escapeHtml(chip)}</span>`).join("");
  };

  const renderFocusedDoubtPanel = (messages) => {
    if (!(doubtPanelEl instanceof HTMLElement)) return;
    const latestDoubt = extractLatestDoubtExchange(messages);
    const shouldShow = activeInteractionMode === "doubt" && Boolean(latestDoubt);
    doubtPanelEl.classList.toggle("hidden", !shouldShow);
    if (!shouldShow) {
      return;
    }
    if (doubtTitleEl instanceof HTMLElement) {
      doubtTitleEl.textContent = "Teacher is clarifying your current doubt";
    }
    if (doubtQuestionEl instanceof HTMLElement) {
      doubtQuestionEl.textContent =
        latestDoubt?.question || "Ask a doubt to see the focused answer here.";
    }
    if (doubtAnswerEl instanceof HTMLElement) {
      doubtAnswerEl.textContent =
        latestDoubt?.answer || "The teacher answer will stay here only for the current doubt.";
    }
  };

  const getExactSpeechDrivenNarration = (assistant, boardPlan, currentMs) => {
    const timelineWords = Array.isArray(boardPlan?.timelineWords) ? boardPlan.timelineWords : [];
    const visibleText = renderTextFromExactWords(timelineWords, currentMs);
    return visibleText || "";
  };

  const renderTeacherStage = (messages, assistant) => {
    if (teacherStageTitleEl instanceof HTMLElement) {
      teacherStageTitleEl.textContent =
        assistant?.teacherState?.currentTeachingPhase || "Start the topic to meet the AI teacher.";
    }
    if (teacherStatusEl instanceof HTMLElement) {
      teacherStatusEl.textContent =
        assistant?.teacherState?.currentTeachingPhase === "COMPLETE"
          ? "The teacher has completed this pass and the board is holding the final learning point."
          : activeInteractionMode === "doubt"
            ? "Class is paused for a focused doubt. Continue when you are ready to resume the teaching flow."
            : "The teacher is speaking live here while the board writes in exact sync.";
      teacherStatusEl.className = "tuition-board-teaching-status";
    }
    if (narrationTextEl instanceof HTMLElement) {
      narrationTextEl.textContent =
        activeInteractionMode === "teaching"
          ? "Voice-synced text will appear here when playback starts."
          : "The teacher will answer here in sync when playback starts.";
    }
    renderFocusedDoubtPanel(messages);
  };

  const handleUiActionError = (error, fallbackMessage) => {
    setStatus(error instanceof Error ? error.message : fallbackMessage, "error");
  };

  const withUiAction = (action, fallbackMessage) => async (...args) => {
    try {
      await action(...args);
    } catch (error) {
      handleUiActionError(error, fallbackMessage);
    }
  };

  const focusQuestionComposer = () => {
    if (questionInputEl instanceof HTMLTextAreaElement) {
      questionInputEl.focus({ preventScroll: false });
      questionInputEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  };

  const playBoardMessage = async (assistantMessage, focusReason = "replay") => {
    if (!assistantMessage?.structured) {
      setBoardLoading(false);
      setStatus("No teacher turn is available for the live board.", "error");
      return;
    }
    activeInteractionMode = "teaching";
    openBoardModal();
    renderBoardMeta(currentSession, assistantMessage.structured);
    renderTeacherStage(currentSession?.messages || [], assistantMessage.structured);
    renderMinimalBoard(assistantMessage.structured, null);
    try {
      await startSpeechDrivenBoardSync(
        assistantMessage,
        currentSession?.teacherContext?.voiceLanguage || currentTeacherContext().voiceLanguage,
        focusReason
      );
      window.setTimeout(() => focusActiveTeachingRegion(focusReason), 180);
      window.setTimeout(() => focusActiveTeachingRegion(focusReason), 1100);
    } catch (error) {
      setBoardLoading(false);
      const message =
        error instanceof Error ? error.message : "Teacher audio is unavailable right now.";
      showSpeechFailureState(message);
      throw error;
    }
  };

  const getActiveBoardAssistantMessage = () =>
    getAssistantMessages(currentSession?.messages || []).find(
      (message) => message?.id === activeBoardMessageId
    ) || extractLatestAssistantMessage(currentSession?.messages || []);

  const replayActiveBoardMessage = async () => {
    activeInteractionMode = "teaching";
    const latestAssistantMessage = getActiveBoardAssistantMessage();
    if (!latestAssistantMessage?.structured) {
      setStatus("No teacher explanation is available yet.", "error");
      return;
    }
    await playBoardMessage(latestAssistantMessage, "replay");
  };

  const openAdjacentBoardMessage = async (offset, unavailableMessage) => {
    const targetMessage = getAssistantMessageByOffset(
      currentSession?.messages || [],
      activeBoardMessageId || currentAssistantMessageId,
      offset
    );
    if (!targetMessage?.structured) {
      setStatus(unavailableMessage, "error");
      return;
    }
    await playBoardMessage(targetMessage, "resume");
  };

  const sendTeacherCommand = async (command, successMessage, nextMode = activeInteractionMode) => {
    await sendTeacherMessage(command, successMessage, nextMode);
  };

  const renderBoardList = (element, items, highlight = "") => {
    if (!(element instanceof HTMLElement)) return;
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!safeItems.length) {
      element.innerHTML = '<li class="tuition-empty-note">No board writing yet.</li>';
      return;
    }
    const normalizedHighlight = normalizeSpeechText(highlight);
    element.innerHTML = safeItems
      .map((item) => {
        const isActive = normalizedHighlight && normalizeSpeechText(item) === normalizedHighlight;
        return `<li class="${isActive ? "is-active-board-line" : ""}">${escapeHtml(item)}</li>`;
      })
      .join("");
  };

  const renderMinimalBoard = (assistant, overrideBoardState = null) => {
    const boardState = overrideBoardState || assistant?.boardState || null;
    const hasLiveConcept = Boolean(normalizeSpeechText(boardState?.currentConcept || ""));
    if (boardTitleEl instanceof HTMLElement) {
      boardTitleEl.textContent = assistant?.topicTitle || currentSession?.teacherContext?.topic || "Teaching Session";
    }
    if (boardCanvasTitleEl instanceof HTMLElement) {
      boardCanvasTitleEl.textContent = hasLiveConcept ? "" : boardState?.title || "Waiting for a teacher reply...";
      boardCanvasTitleEl.classList.toggle("hidden", hasLiveConcept);
    }
    if (boardCanvasHintEl instanceof HTMLElement) {
      boardCanvasHintEl.textContent = "";
    }
    if (boardTeacherCueEl instanceof HTMLElement) {
      boardTeacherCueEl.textContent = "";
    }
    if (boardCurrentConceptEl instanceof HTMLElement) {
      boardCurrentConceptEl.textContent = boardState?.currentConcept || "Waiting for the first concept...";
      boardCurrentConceptEl.classList.toggle("is-live", Boolean(boardState?.currentConcept));
    }
    if (teacherStatusEl instanceof HTMLElement) {
      teacherStatusEl.classList.toggle("hidden", hasLiveConcept);
    }
    renderBoardList(boardAnchorsEl, boardState?.anchors || [], boardState?.highlight || boardState?.currentConcept || "");
    if (boardAnchorsEl instanceof HTMLElement) {
      boardAnchorsEl.classList.add("hidden");
    }
    if (boardFormulaBlockEl instanceof HTMLElement) {
      const hasFormula = Boolean(boardState?.formula);
      boardFormulaBlockEl.classList.toggle("hidden", !hasFormula);
      if (boardFormulaEl instanceof HTMLElement) {
        boardFormulaEl.textContent = boardState?.formula || "";
      }
    }
    if (boardExampleBlockEl instanceof HTMLElement) {
      const hasExample = Boolean(boardState?.example);
      boardExampleBlockEl.classList.toggle("hidden", !hasExample);
      if (boardExampleLineEl instanceof HTMLElement) {
        boardExampleLineEl.textContent = boardState?.example || "";
      }
    }
    if (boardDiagramBlockEl instanceof HTMLElement) {
      const hasDiagram = Array.isArray(boardState?.diagramLabels) && boardState.diagramLabels.length > 0;
      boardDiagramBlockEl.classList.toggle("hidden", !hasDiagram);
      renderBoardList(boardDiagramLabelsEl, boardState?.diagramLabels || []);
    }
    if (boardRecapBlockEl instanceof HTMLElement) {
      const hasRecap = Array.isArray(boardState?.recapKeywords) && boardState.recapKeywords.length > 0;
      boardRecapBlockEl.classList.toggle("hidden", !hasRecap);
      renderBoardList(boardRecapKeywordsEl, boardState?.recapKeywords || []);
    }
    window.requestAnimationFrame(() => {
      keepBoardTextVisible(boardState?.currentConcept ? "smooth" : "auto");
      window.setTimeout(() => keepBoardTextVisible("auto"), 120);
    });
  };

  const renderAssistant = (session) => {
    currentSession = session || null;
    const latestAssistantMessage = extractLatestAssistantMessage(session?.messages || []);
    currentAssistant = latestAssistantMessage?.structured || null;
    currentAssistantMessageId = latestAssistantMessage?.id || "";
    const activeBoardMessageStillExists = getAssistantMessages(session?.messages || []).some(
      (message) => message?.id === activeBoardMessageId
    );
    if (!activeBoardMessageId || !activeBoardMessageStillExists) {
      activeBoardMessageId = currentAssistantMessageId;
    }
    if (titleEl instanceof HTMLElement) {
      titleEl.textContent = session?.teacherContext?.topic || session?.title || chapterContext?.chapter?.title || "Tuition Teacher";
    }
    if (sessionLabelEl instanceof HTMLElement) {
      sessionLabelEl.textContent =
        currentAssistant?.teacherState?.currentTeachingPhase === "COMPLETE"
          ? "Lesson complete"
          : currentAssistant?.teacherState?.currentTeachingPhase
            ? `Phase: ${currentAssistant.teacherState.currentTeachingPhase}`
            : "Session ready";
    }
    renderSessionMeta(session, chapterContext?.progress);
    renderBoardMeta(session, currentAssistant);
    renderTeacherStage(session?.messages || [], currentAssistant);
    renderMinimalBoard(currentAssistant, activeBoardOverride);
    updateBoardNavigationControls();
  };

  const applySessionState = (payload) => {
    activeSessionId = payload?.session?.id || activeSessionId;
    if (activeSessionId) {
      const nextUrl = resolveTuitionPagePath("tuition-teacher", {
        chapterId,
        sessionId: activeSessionId,
      });
      window.history.replaceState({}, "", nextUrl);
    }
    currentSession = payload?.session || null;
    if (subjectEl instanceof HTMLInputElement) {
      subjectEl.value =
        payload?.session?.teacherContext?.subject || subjectEl.value || chapterContext?.profile?.subjectName || "";
    }
    if (topicEl instanceof HTMLInputElement) {
      topicEl.value =
        payload?.session?.teacherContext?.topic || topicEl.value || chapterContext?.chapter?.title || "";
    }
    if (explanationLanguageEl instanceof HTMLSelectElement && payload?.session?.teacherContext?.explanationLanguage) {
      explanationLanguageEl.value = payload.session.teacherContext.explanationLanguage;
    }
    if (boardLanguageEl instanceof HTMLSelectElement && payload?.session?.teacherContext?.boardLanguage) {
      boardLanguageEl.value = payload.session.teacherContext.boardLanguage;
    }
    if (voiceLanguageEl instanceof HTMLSelectElement && payload?.session?.teacherContext?.voiceLanguage) {
      voiceLanguageEl.value = payload.session.teacherContext.voiceLanguage;
    }
    if (teachingDepthEl instanceof HTMLSelectElement && payload?.session?.teacherContext?.teachingDepth) {
      teachingDepthEl.value = payload.session.teacherContext.teachingDepth;
    }
    if (speedEl instanceof HTMLSelectElement && payload?.session?.speedMode) {
      speedEl.value = payload.session.speedMode;
    }
    if (difficultyEl instanceof HTMLSelectElement && payload?.session?.difficultyMode) {
      difficultyEl.value = payload.session.difficultyMode;
    }
    persistSettings();
    activeBoardOverride = null;
    renderSummaryRow(chapterContext?.chapter, payload?.progress || chapterContext?.progress);
    renderAssistant(payload?.session || null);
  };

  const loadChapterContext = async () => {
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}`,
      token,
    });
    chapterContext = payload || null;
    if (subjectEl instanceof HTMLInputElement) {
      subjectEl.value = payload?.profile?.subjectName || payload?.chapterContext?.subjectName || "";
    }
    if (topicEl instanceof HTMLInputElement) {
      topicEl.value = payload?.chapter?.title || "";
    }
    applySavedSettings();
    renderSummaryRow(payload?.chapter, payload?.progress);
  };

  const readSessionSettings = () => {
    const context = currentTeacherContext();
    return {
      responseLanguage: context.explanationLanguage,
      explanationLanguage: context.explanationLanguage,
      boardLanguage: context.boardLanguage,
      voiceLanguage: context.voiceLanguage,
      subject: context.subject,
      topic: context.topic,
      curriculumBoard: context.curriculumBoard,
      teachingDepth: context.teachingDepth,
      speedMode: context.speedMode,
      difficultyMode: context.difficultyMode,
      resume: true,
    };
  };

  const createOrResumeSession = async (forceResume = true) => {
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}/sessions`,
      method: "POST",
      token,
      body: {
        ...readSessionSettings(),
        resume: forceResume,
      },
    });
    applySessionState(payload);
    setStatus(payload?.resumed ? "Previous session resumed." : "New tuition session created.", "success");
    return payload;
  };

  const loadSpecificSession = async () => {
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}`,
      token,
    });
    applySessionState(payload);
    setStatus("Saved session loaded.", "success");
    return payload;
  };

  const ensureActiveSession = async () => {
    if (!activeSessionId) {
      await createOrResumeSession(true);
      return;
    }
    if (hasTeacherContextDrift()) {
      await createOrResumeSession(false);
    }
  };

  const sendTeacherMessage = async (
    content,
    successMessage = "Teacher replied.",
    nextInteractionMode = "teaching",
    loadingMessage = "Please wait while the lesson is being prepared."
  ) => {
    const safeContent = String(content || "").trim();
    if (!safeContent) {
      setStatus("Enter a question first.", "error");
      return null;
    }
    const requestedSettings = readSessionSettings();
    await ensureActiveSession();
    applyTeacherSettingsToControls(requestedSettings);
    setStatus("Teacher is thinking...");
    openBoardModal();
    setBoardLoading(true, loadingMessage);
    try {
      const payload = await apiRequest({
        path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}/messages`,
        method: "POST",
        token,
        body: {
          content: safeContent,
          ...requestedSettings,
        },
      });
      activeInteractionMode = nextInteractionMode;
      applySessionState(payload);
      const latestAssistantMessage = extractLatestAssistantMessage(payload?.session?.messages || []);
      if (latestAssistantMessage?.structured) {
        await playBoardMessage(latestAssistantMessage, "new-step");
      } else {
        setBoardLoading(false);
      }
      setStatus(successMessage, "success");
      return payload;
    } catch (error) {
      setBoardLoading(false);
      throw error;
    }
  };

  const renderIdle = () => {
    activeBoardOverride = null;
    activeInteractionMode = "teaching";
    if (titleEl instanceof HTMLElement) {
      titleEl.textContent = chapterContext?.chapter?.title || "Loading topic...";
    }
    if (sessionLabelEl instanceof HTMLElement) {
      sessionLabelEl.textContent = "Preparing session...";
    }
    renderAssistant(currentSession);
  };

  const askCurrentDoubt = async () => {
    const question = questionInputEl instanceof HTMLTextAreaElement ? questionInputEl.value.trim() : "";
    if (!question) {
      setStatus("Type a doubt first.", "error");
      return;
    }
    await sendTeacherMessage(
      question,
      "Teacher answered your doubt.",
      "doubt",
      "Please wait while the teacher is preparing the answer."
    );
    if (questionInputEl instanceof HTMLTextAreaElement) {
      questionInputEl.value = "";
    }
  };

  const stopHoldToTalk = () => {
    pendingBoardAutoAsk = activeHoldSource === "board";
    isHoldingTalk = false;
    activeHoldSource = "";
    if (doubtSpeechRecognition) {
      try {
        doubtSpeechRecognition.stop();
      } catch {
        // Ignore recognition stop errors.
      }
    }
    setMicStatus(MIC_STATUS_IDLE, false);
  };

  const startHoldToTalk = (source = "page") => {
    if (!SpeechRecognitionCtor) {
      setMicStatus(MIC_STATUS_UNSUPPORTED, false);
      return;
    }
    if (isHoldingTalk) {
      return;
    }
    isHoldingTalk = true;
    activeHoldSource = source;
    pendingBoardAutoAsk = false;
    holdTalkStartSnapshot = questionInputEl instanceof HTMLTextAreaElement ? questionInputEl.value.trim() : "";
    if (!doubtSpeechRecognition) {
      doubtSpeechRecognition = new SpeechRecognitionCtor();
      doubtSpeechRecognition.continuous = true;
      doubtSpeechRecognition.interimResults = true;
      doubtSpeechRecognition.maxAlternatives = 1;
      doubtSpeechRecognition.onresult = (event) => {
        const transcripts = [];
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = String(event.results[index]?.[0]?.transcript || "").trim();
          if (transcript && event.results[index].isFinal) {
            transcripts.push(transcript);
          }
        }
        if (transcripts.length) {
          appendDoubtText(transcripts.join(" "));
        }
      };
      doubtSpeechRecognition.onerror = () => {
        pendingBoardAutoAsk = false;
        setMicStatus(MIC_STATUS_RETRY, false);
      };
      doubtSpeechRecognition.onend = () => {
        if (isHoldingTalk) {
          setMicStatus(MIC_STATUS_LISTENING, true);
          try {
            doubtSpeechRecognition.start();
          } catch {
            setMicStatus(MIC_STATUS_RETRY, false);
            isHoldingTalk = false;
          }
          return;
        }
        setMicStatus(MIC_STATUS_IDLE, false);
        const shouldAutoAsk =
          pendingBoardAutoAsk &&
          questionInputEl instanceof HTMLTextAreaElement &&
          questionInputEl.value.trim() &&
          questionInputEl.value.trim() !== holdTalkStartSnapshot;
        pendingBoardAutoAsk = false;
        holdTalkStartSnapshot = "";
        if (shouldAutoAsk) {
          void askCurrentDoubt();
        }
      };
    }
    const explainLanguage =
      explanationLanguageEl instanceof HTMLSelectElement ? explanationLanguageEl.value : "ENGLISH";
    doubtSpeechRecognition.lang =
      explainLanguage === "HINDI" ? "hi-IN" : explainLanguage === "PUNJABI" ? "pa-IN" : "en-IN";
    setMicStatus(MIC_STATUS_LISTENING, true);
    try {
      doubtSpeechRecognition.start();
    } catch {
      setMicStatus(MIC_STATUS_START_FAILED, false);
      isHoldingTalk = false;
    }
  };

  const parseVoiceRealtimeError = async (response) => {
    try {
      const payload = await response.json();
      return String(payload?.error?.message || "Unable to start the voice tutor.");
    } catch {
      return "Unable to start the voice tutor.";
    }
  };

  const setVoiceState = (state, message = "") => {
    voiceSession.status = state;
    if (voiceStateEl instanceof HTMLElement) {
      voiceStateEl.textContent =
        state === "connecting" ? "Connecting" : state === "live" ? "Live" : state === "error" ? "Error" : "Idle";
      voiceStateEl.className = `tuition-chip ${state === "live" ? "tuition-chip-highlight" : ""}`;
    }
    if (voiceMetaEl instanceof HTMLElement) {
      voiceMetaEl.textContent =
        message || "Voice tutor is optional. For live teaching, use AI Teacher Mode above.";
    }
    if (voiceBtn instanceof HTMLButtonElement) {
      voiceBtn.classList.toggle("hidden", state === "live" || state === "connecting");
    }
    if (voiceEndBtn instanceof HTMLButtonElement) {
      voiceEndBtn.classList.toggle("hidden", state !== "live" && state !== "connecting");
    }
  };

  const stopVoiceSession = (state = "idle", message = "") => {
    try {
      if (voiceSession.dataChannel) {
        voiceSession.dataChannel.close();
      }
      if (voiceSession.peerConnection) {
        voiceSession.peerConnection.close();
      }
      if (voiceSession.localStream) {
        voiceSession.localStream.getTracks().forEach((track) => track.stop());
      }
      if (voiceAudioEl instanceof HTMLAudioElement) {
        voiceAudioEl.srcObject = null;
        voiceAudioEl.classList.add("hidden");
      }
    } catch {
      // Ignore voice cleanup errors.
    }
    voiceSession = {
      peerConnection: null,
      localStream: null,
      dataChannel: null,
      remoteStream: null,
      status: state,
    };
    setVoiceState(state, message);
  };

  const startVoiceTutor = async () => {
    if (
      typeof window.RTCPeerConnection === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setVoiceState("error", "Voice tutor needs microphone and WebRTC support in this browser.");
      return;
    }

    await ensureActiveSession();
    setVoiceState("connecting", "Connecting voice tutor...");

    try {
      const bootstrap = await apiRequest({
        path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}/voice-session`,
        method: "POST",
        token,
        body: {
          ...readSessionSettings(),
        },
      });

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const peerConnection = new RTCPeerConnection();
      const remoteStream = new MediaStream();
      const dataChannel = peerConnection.createDataChannel("tuition-oai-events");

      if (voiceAudioEl instanceof HTMLAudioElement) {
        voiceAudioEl.srcObject = remoteStream;
        voiceAudioEl.classList.remove("hidden");
      }

      peerConnection.ontrack = (event) => {
        event.streams.forEach((stream) => {
          stream.getTracks().forEach((track) => remoteStream.addTrack(track));
        });
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          setVoiceState("live", `Voice tutor is live for ${bootstrap?.context?.topicTitle || "this topic"}.`);
        } else if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "disconnected" ||
          peerConnection.connectionState === "closed"
        ) {
          stopVoiceSession("idle", "Voice tutor session ended.");
        }
      };

      dataChannel.onopen = () => {
        dataChannel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["audio", "text"],
              instructions: `Teach ${bootstrap?.context?.topicTitle || currentTeacherContext().topic} like a patient tutor.`,
            },
          })
        );
      };

      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const realtimeResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bootstrap.clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp || "",
      });

      if (!realtimeResponse.ok) {
        throw new Error(await parseVoiceRealtimeError(realtimeResponse));
      }

      const answerSdp = await realtimeResponse.text();
      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      voiceSession = {
        peerConnection,
        localStream,
        dataChannel,
        remoteStream,
        status: "live",
      };
      setVoiceState("live", `Voice tutor is live in ${bootstrap?.session?.responseLanguage || "English"}.`);
    } catch (error) {
      stopVoiceSession("error", error instanceof Error ? error.message : "Unable to start the voice tutor.");
    }
  };

  try {
    setStatus("Opening tuition teacher...");
    await loadChapterContext();
    if (activeSessionId) {
      await loadSpecificSession();
    } else {
      await createOrResumeSession(true);
    }
    renderIdle();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to open the tuition teacher.", "error");
  }

  const wirePersist = (element) => {
    element?.addEventListener("change", () => {
      persistSettings();
    });
  };

  [
    explanationLanguageEl,
    boardLanguageEl,
    voiceLanguageEl,
    teachingDepthEl,
    speedEl,
    difficultyEl,
  ].forEach(wirePersist);

  if (holdToTalkBtn instanceof HTMLButtonElement) {
    if (!SpeechRecognitionCtor) {
      setMicStatus(MIC_STATUS_UNSUPPORTED, false);
      holdToTalkBtn.disabled = true;
      if (boardHoldToTalkBtn instanceof HTMLButtonElement) {
        boardHoldToTalkBtn.disabled = true;
      }
    } else {
      const startPress = (event) => {
        event.preventDefault();
        focusQuestionComposer();
        startHoldToTalk(event.currentTarget === boardHoldToTalkBtn ? "board" : "page");
      };
      const endPress = (event) => {
        event.preventDefault();
        stopHoldToTalk();
      };
      [holdToTalkBtn, boardHoldToTalkBtn].forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) return;
        button.addEventListener("mousedown", startPress);
        button.addEventListener("touchstart", startPress, { passive: false });
        button.addEventListener("mouseup", endPress);
        button.addEventListener("mouseleave", endPress);
        button.addEventListener("touchend", endPress, { passive: false });
        button.addEventListener("touchcancel", endPress, { passive: false });
      });
    }
  }
  ["mouseup", "touchend", "blur"].forEach((eventName) => {
    window.addEventListener(eventName, () => {
      if (isHoldingTalk) {
        stopHoldToTalk();
      }
    });
  });

  teachBtn?.addEventListener(
    "click",
    withUiAction(async () => {
      activeInteractionMode = "teaching";
      openBoardModal();
      await sendTeacherCommand(START_COMMAND, "AI teacher started the topic.", "teaching");
    }, "Unable to start teaching.")
  );

  resumeBtn?.addEventListener(
    "click",
    withUiAction(async () => {
      setStatus("Refreshing lesson...");
      if (activeSessionId) {
        await loadSpecificSession();
      } else {
        await createOrResumeSession(true);
      }
      activeInteractionMode = "teaching";
      focusActiveTeachingRegion("resume");
    }, "Unable to refresh the lesson.")
  );

  questionForm?.addEventListener(
    "submit",
    withUiAction(async (event) => {
      event.preventDefault();
      await askCurrentDoubt();
    }, "Unable to ask the doubt.")
  );

  quickContinueBtn?.addEventListener("click", withUiAction(async () => {
    activeInteractionMode = "teaching";
    await sendTeacherCommand(CONTINUE_COMMAND, "Teacher continued the lesson.", "teaching");
  }, "Unable to continue the lesson."));
  boardContinueBtn?.addEventListener("click", withUiAction(async () => {
    activeInteractionMode = "teaching";
    await sendTeacherCommand(CONTINUE_COMMAND, "Teacher continued the lesson.", "teaching");
  }, "Unable to continue the lesson."));
  quickRepeatBtn?.addEventListener("click", withUiAction(async () => {
    await sendTeacherCommand(REPEAT_COMMAND, "Teacher repeated the point.");
  }, "Unable to repeat the point."));
  boardRepeatBtn?.addEventListener("click", withUiAction(async () => {
    await sendTeacherCommand(REPEAT_COMMAND, "Teacher repeated the point.");
  }, "Unable to repeat the point."));
  quickSimplerBtn?.addEventListener("click", withUiAction(async () => {
    await sendTeacherCommand(SIMPLER_COMMAND, "Teacher explained it more simply.");
  }, "Unable to simplify the explanation."));
  quickExampleBtn?.addEventListener("click", withUiAction(async () => {
    await sendTeacherCommand(EXAMPLE_COMMAND, "Teacher gave an example.");
  }, "Unable to give an example."));
  quickCheckBtn?.addEventListener("click", withUiAction(async () => {
    await sendTeacherCommand(CHECK_COMMAND, "Teacher asked a check question.");
  }, "Unable to ask the check question."));
  replayLastBtn?.addEventListener("click", withUiAction(replayActiveBoardMessage, "Unable to replay the exact teacher speech track."));
  restartTopicBtn?.addEventListener("click", withUiAction(async () => {
    activeInteractionMode = "teaching";
    await sendTeacherCommand(START_COMMAND, "Teacher restarted the topic from the beginning.", "teaching");
  }, "Unable to restart the topic."));
  boardReplayBtn?.addEventListener("click", withUiAction(replayActiveBoardMessage, "Unable to replay the exact teacher speech track."));
  boardPrevBtn?.addEventListener(
    "click",
    withUiAction(() => openAdjacentBoardMessage(-1, "No previous teacher turn is available."), "Unable to open the previous teacher turn.")
  );
  boardNextBtn?.addEventListener(
    "click",
    withUiAction(() => openAdjacentBoardMessage(1, "No next teacher turn is available."), "Unable to open the next teacher turn.")
  );
  boardStopBtn?.addEventListener("click", () => {
    stopSpeech();
    if (teacherStatusEl instanceof HTMLElement) {
      teacherStatusEl.textContent = "Playback stopped. Use replay, previous, next, or continue when you are ready.";
      teacherStatusEl.className = "tuition-board-teaching-status";
    }
    updateBoardNavigationControls();
  });

  doubtContinueBtn?.addEventListener("click", withUiAction(async () => {
    activeInteractionMode = "teaching";
    await sendTeacherCommand(CONTINUE_COMMAND, "Teacher continued the lesson.", "teaching");
  }, "Unable to continue the lesson."));

  openBoardBtn?.addEventListener("click", () => {
    openBoardModal();
    focusActiveTeachingRegion("resume");
  });
  boardModalCloseBtn?.addEventListener("click", closeBoardModal);
  boardModalOverlayEl?.addEventListener("click", closeBoardModal);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && boardModalEl instanceof HTMLElement && !boardModalEl.classList.contains("hidden")) {
      closeBoardModal();
    }
  });

  voiceBtn?.addEventListener("click", async () => {
    await startVoiceTutor();
  });
  voiceEndBtn?.addEventListener("click", () => {
    stopVoiceSession("idle", "Voice tutor session ended.");
  });

  homeworkBtn?.addEventListener("click", async () => {
    try {
      await ensureActiveSession();
      setStatus("Generating homework...");
      const payload = await apiRequest({
        path: `/student/tuition/chapters/${chapterId}/homework`,
        method: "POST",
        token,
        body: {
          sessionId: activeSessionId,
          responseLanguage: currentTeacherContext().explanationLanguage,
          speedMode: currentTeacherContext().speedMode,
          difficultyMode: currentTeacherContext().difficultyMode,
        },
      });
      const homeworkId = payload?.homework?.id;
      if (!homeworkId) {
        throw new Error("Homework generation finished but no homework id was returned.");
      }
      window.location.href = resolveTuitionPagePath("tuition-homework", { homeworkId });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to generate homework.", "error");
    }
  });

  window.addEventListener("beforeunload", () => {
    stopSpeech();
    stopVoiceSession();
    document.body.classList.remove("tuition-live-board-open");
  });
});
