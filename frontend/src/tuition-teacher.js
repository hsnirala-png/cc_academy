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

const stopSpeech = () => {
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
  const boardTitleEl = document.querySelector("#tuitionTeacherBoardTitle");
  const boardMetaEl = document.querySelector("#tuitionTeacherBoardMeta");
  const teacherStageTitleEl = document.querySelector("#tuitionTeacherLiveBoardStepTitle");
  const teacherStatusEl = document.querySelector("#tuitionTeacherBoardTeachingStatus");
  const teacherTurnsEl = document.querySelector("#tuitionTeacherTeacherTurns");
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
  const quickSimplerBtn = document.querySelector("#tuitionTeacherQuickSimplerBtn");
  const quickExampleBtn = document.querySelector("#tuitionTeacherQuickExampleBtn");
  const quickRepeatBtn = document.querySelector("#tuitionTeacherQuickRepeatBtn");
  const quickCheckBtn = document.querySelector("#tuitionTeacherQuickCheckBtn");
  const quickContinueBtn = document.querySelector("#tuitionTeacherQuickContinueBtn");
  const replayLastBtn = document.querySelector("#tuitionTeacherReplayLastBtn");
  const restartTopicBtn = document.querySelector("#tuitionTeacherRestartTopicBtn");
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
  let activeBoardOverride = null;
  let lastAutoFocusAt = 0;
  const exactSpeechTrackCache = new Map();
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

  const openBoardModal = () => {
    if (!(boardModalEl instanceof HTMLElement)) return;
    boardModalEl.classList.remove("hidden");
    boardModalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  };

  const closeBoardModal = () => {
    if (!(boardModalEl instanceof HTMLElement)) return;
    boardModalEl.classList.add("hidden");
    boardModalEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
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

  const extractLatestStructured = (messages) => extractLatestAssistantMessage(messages)?.structured || null;

  const getLastTeacherMessageEl = () =>
    teacherTurnsEl instanceof HTMLElement
      ? teacherTurnsEl.querySelector(".tuition-chat-message.is-assistant:last-of-type")
      : null;

  const getBoardFocusTarget = () =>
    boardCurrentConceptEl instanceof HTMLElement
      ? whiteboardSurfaceEl || boardCurrentConceptEl.closest(".tuition-ai-teacher-board-focus") || boardCurrentConceptEl
      : null;

  const getModalScrollContainer = () =>
    boardModalEl instanceof HTMLElement
      ? boardModalEl.querySelector(".tuition-teacher-board-card-modal")
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
    const teacherTarget = getLastTeacherMessageEl();
    const boardTarget = getBoardFocusTarget();
    const modalContainer = getModalScrollContainer();
    const boardVisible = isMostlyVisible(boardTarget, modalContainer);
    const cueVisible = isMostlyVisible(boardTeacherCueEl, modalContainer);
    const teacherVisible = isMostlyVisible(teacherTarget, modalContainer);
    if (boardVisible && cueVisible && teacherVisible) {
      return;
    }
    const target = !teacherVisible
      ? teacherTarget
      : !boardVisible
        ? boardTarget
        : !cueVisible
          ? boardTeacherCueEl
          : teacherTarget;
    lastAutoFocusAt = now;
    if (boardModalEl instanceof HTMLElement) {
      boardModalEl.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    }
    if (teacherTurnsEl instanceof HTMLElement && teacherTarget instanceof HTMLElement) {
      teacherTurnsEl.scrollTo({
        top: teacherTurnsEl.scrollHeight,
        behavior: "smooth",
      });
      window.setTimeout(() => scrollWithinContainer(teacherTurnsEl, teacherTarget, 24, 24), 40);
    }
    if (modalContainer instanceof HTMLElement && boardTarget instanceof HTMLElement) {
      scrollWithinContainer(modalContainer, boardTarget, 180, 90);
      window.setTimeout(() => scrollWithinContainer(modalContainer, boardTarget, 180, 90), 220);
    }
    if (teacherTarget instanceof HTMLElement) {
      scrollTargetIntoContainer(teacherTarget, "nearest");
    }
    if (target instanceof HTMLElement && target !== teacherTarget) {
      window.setTimeout(() => scrollTargetIntoContainer(target, "center"), 120);
    }
    if (boardTarget instanceof HTMLElement && target !== boardTarget) {
      window.setTimeout(() => scrollTargetIntoContainer(boardTarget, "center"), 260);
    }
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

  const trimAlignedWordsForBoardLine = (words, languageCode, teachingDepth) => {
    const safeWords = Array.isArray(words) ? words.filter(Boolean) : [];
    if (!safeWords.length) return [];
    const maxWords = teachingDepth === "BASIC" ? 6 : teachingDepth === "ADVANCED" ? 10 : 8;
    const stopwords = getSpeechStopwords(languageCode);
    let trimmed = safeWords.slice(0, Math.min(safeWords.length, maxWords));
    while (
      trimmed.length > Math.max(3, maxWords - 2) &&
      stopwords.has(String(trimmed[trimmed.length - 1]?.text || "").toLowerCase())
    ) {
      trimmed = trimmed.slice(0, -1);
    }
    return trimmed.length ? trimmed : safeWords.slice(0, Math.min(safeWords.length, maxWords));
  };

  const buildExactBoardPlan = (assistant, speechTrack, languageCode) => {
    const teachingDepth = String(assistant?.teacherState?.teachingDepth || "MODERATE").toUpperCase();
    const explanationText = normalizeSpeechText(assistant?.teacherExplanation || "");
    const sourceSegments = splitSpeechUnits(explanationText);
    const exactSegmentWords = alignTimedWordsSequentially(speechTrack?.words || [], sourceSegments);
    const maxLines = teachingDepth === "BASIC" ? 1 : teachingDepth === "ADVANCED" ? 3 : 2;
    const lines = exactSegmentWords
      .map((segmentWords) => trimAlignedWordsForBoardLine(segmentWords, languageCode, teachingDepth))
      .filter((segmentWords) => segmentWords.length)
      .slice(0, maxLines)
      .map((segmentWords, index) => ({
        id: `line-${index}`,
        words: segmentWords,
        startMs: Number(segmentWords[0]?.startMs || 0),
        endMs: Number(segmentWords[segmentWords.length - 1]?.endMs || 0),
      }))
      .filter((line) => line.endMs > line.startMs);

    return {
      lines,
      teachingDepth,
    };
  };

  const renderTextFromExactWords = (words, currentMs) => {
    const safeWords = Array.isArray(words) ? words : [];
    const visibleWords = safeWords.filter((word) => Number(word?.startMs || 0) <= currentMs);
    return visibleWords.map((word) => String(word?.text || "").trim()).filter(Boolean).join(" ").trim();
  };

  const getExactSpeechDrivenBoardState = (assistant, boardPlan, currentMs) => {
    const boardState = assistant?.boardState || {};
    const lines = Array.isArray(boardPlan?.lines) ? boardPlan.lines : [];
    if (!lines.length) {
      return {
        ...boardState,
        currentConcept: normalizeSpeechText(assistant?.teacherExplanation || assistant?.teacherIntro || ""),
        anchors: [],
        formula: null,
        example: null,
        recapKeywords: [],
      };
    }

    const renderedLines = lines
      .map((line) => ({
        ...line,
        visibleText: renderTextFromExactWords(line.words, currentMs),
      }))
      .filter((line) => Boolean(line.visibleText));

    const activeLine =
      renderedLines.find((line) => currentMs >= line.startMs && currentMs <= line.endMs) ||
      renderedLines[renderedLines.length - 1] ||
      lines[0];

    const visibleAnchors = renderedLines.map((line) => line.visibleText).filter(Boolean);

    return {
      ...boardState,
      currentConcept: activeLine?.visibleText || normalizeSpeechText(assistant?.teacherExplanation || ""),
      anchors: visibleAnchors,
      formula: null,
      example: null,
      diagramLabels: [],
      recapKeywords: [],
      teacherCue: activeLine?.visibleText || normalizeSpeechText(assistant?.teacherExplanation || assistant?.teacherIntro || ""),
      highlight: activeLine?.visibleText || visibleAnchors[visibleAnchors.length - 1] || "",
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

    const speechTrack = await fetchExactSpeechTrack(messageId);
    const boardLanguage = currentSession?.teacherContext?.boardLanguage || speechTrack.language || languageCode;
    const boardPlan = buildExactBoardPlan(assistant, speechTrack, boardLanguage);
    const objectUrl = createAudioObjectUrlFromBase64(speechTrack.audioBase64, speechTrack.mimeType);
    let frameId = 0;

    const syncBoardToAudio = () => {
      const currentMs = Math.max(0, Math.round(stageAudioEl.currentTime * 1000));
      activeBoardOverride = getExactSpeechDrivenBoardState(assistant, boardPlan, currentMs);
      renderMinimalBoard(assistant, activeBoardOverride);
      if (!stageAudioEl.paused && !stageAudioEl.ended) {
        frameId = window.requestAnimationFrame(syncBoardToAudio);
      }
    };

    activeBoardOverride = getExactSpeechDrivenBoardState(assistant, boardPlan, 0);
    renderMinimalBoard(assistant, activeBoardOverride);
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
    };

    stageAudioEl.onplay = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(syncBoardToAudio);
    };
    stageAudioEl.onended = () => {
      activeBoardOverride = getExactSpeechDrivenBoardState(
        assistant,
        boardPlan,
        Number(boardPlan?.lines?.at?.(-1)?.endMs || speechTrack.words.at(-1)?.endMs || 0)
      );
      renderMinimalBoard(assistant, activeBoardOverride);
      cleanup();
    };
    stageAudioEl.onerror = () => {
      cleanup();
    };

    window.__ccTuitionTeacherSpeechController = {
      cancel: () => {
        cleanup();
      },
    };
    window.__ccTuitionTeacherStageAudio = stageAudioEl;

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

  const renderTeacherTurns = (messages, assistant) => {
    if (!(teacherTurnsEl instanceof HTMLElement)) return;
    const recentMessages = Array.isArray(messages) ? messages.slice(-6) : [];
    if (!recentMessages.length && !assistant) {
      teacherTurnsEl.innerHTML =
        '<div class="tuition-chat-empty">Start teaching to see the teacher explanation here.</div>';
      return;
    }
    const lastAssistantIndex = recentMessages.reduce(
      (latest, message, index) => (message.role === "ASSISTANT" ? index : latest),
      -1
    );
    teacherTurnsEl.innerHTML = recentMessages
      .map((message, index) => {
        const isAssistant = message.role === "ASSISTANT";
        const structured = message.structured || null;
        const heading = isAssistant ? "Teacher" : "Student";
        const body =
          isAssistant && structured
            ? [structured.teacherIntro, structured.teacherExplanation, structured.teacherCheckQuestion]
                .filter(Boolean)
                .join("\n\n")
            : message.content;
        return `
          <article class="tuition-chat-message ${isAssistant ? "is-assistant" : "is-user"} ${index === lastAssistantIndex ? "is-active-turn" : ""}">
            <strong>${escapeHtml(heading)}</strong>
            <p>${escapeHtml(body).replaceAll("\n", "<br />")}</p>
          </article>
        `;
      })
      .join("");
  };

  const renderBoardList = (element, items) => {
    if (!(element instanceof HTMLElement)) return;
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!safeItems.length) {
      element.innerHTML = '<li class="tuition-empty-note">No board writing yet.</li>';
      return;
    }
    element.innerHTML = safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  };

  const renderMinimalBoard = (assistant, overrideBoardState = null) => {
    const boardState = overrideBoardState || assistant?.boardState || null;
    if (boardTitleEl instanceof HTMLElement) {
      boardTitleEl.textContent = assistant?.topicTitle || currentSession?.teacherContext?.topic || "Teaching Session";
    }
    if (boardCanvasTitleEl instanceof HTMLElement) {
      boardCanvasTitleEl.textContent = boardState?.title || "Waiting for a teacher reply...";
    }
    if (boardCanvasHintEl instanceof HTMLElement) {
      boardCanvasHintEl.textContent =
        "The teacher keeps only short support points, one rule, and one example when needed.";
    }
    if (boardTeacherCueEl instanceof HTMLElement) {
      boardTeacherCueEl.textContent =
        boardState?.teacherCue ||
        assistant?.nextSuggestedAction ||
        "Ask a doubt, ask for an example, or continue the lesson.";
    }
    if (boardCurrentConceptEl instanceof HTMLElement) {
      boardCurrentConceptEl.textContent = boardState?.currentConcept || "Waiting for the first concept...";
      boardCurrentConceptEl.classList.toggle("is-live", Boolean(boardState?.currentConcept));
    }
    renderBoardList(boardAnchorsEl, boardState?.anchors || []);
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
  };

  const renderAssistant = (session) => {
    currentSession = session || null;
    const latestAssistantMessage = extractLatestAssistantMessage(session?.messages || []);
    currentAssistant = latestAssistantMessage?.structured || null;
    currentAssistantMessageId = latestAssistantMessage?.id || "";
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
    renderTeacherTurns(session?.messages || [], currentAssistant);
    renderMinimalBoard(currentAssistant, activeBoardOverride);

    if (teacherStageTitleEl instanceof HTMLElement) {
      teacherStageTitleEl.textContent = currentAssistant?.teacherState?.currentTeachingPhase || "Waiting for the teacher";
    }
    if (teacherStatusEl instanceof HTMLElement) {
      teacherStatusEl.textContent =
        currentAssistant?.teacherExplanation ||
        "Start teaching to hear the teacher explanation and see the short support notes.";
    }
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
    if (!activeSessionId || hasTeacherContextDrift()) {
      await createOrResumeSession(true);
    }
  };

  const sendTeacherMessage = async (content, successMessage = "Teacher replied.") => {
    const safeContent = String(content || "").trim();
    if (!safeContent) {
      setStatus("Enter a question first.", "error");
      return null;
    }
    await ensureActiveSession();
    setStatus("Teacher is thinking...");
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}/messages`,
      method: "POST",
      token,
      body: {
        content: safeContent,
        ...readSessionSettings(),
      },
    });
    applySessionState(payload);
    openBoardModal();
    const latestAssistantMessage = extractLatestAssistantMessage(payload?.session?.messages || []);
    if (latestAssistantMessage?.structured) {
      await startSpeechDrivenBoardSync(
        latestAssistantMessage,
        payload?.session?.teacherContext?.voiceLanguage || currentTeacherContext().voiceLanguage,
        "new-step"
      );
      window.setTimeout(() => focusActiveTeachingRegion("resume"), 180);
      window.setTimeout(() => focusActiveTeachingRegion("resume"), 1100);
    }
    setStatus(successMessage, "success");
    return payload;
  };

  const renderIdle = () => {
    activeBoardOverride = null;
    if (titleEl instanceof HTMLElement) {
      titleEl.textContent = chapterContext?.chapter?.title || "Loading topic...";
    }
    if (sessionLabelEl instanceof HTMLElement) {
      sessionLabelEl.textContent = "Preparing session...";
    }
    renderAssistant(currentSession);
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

  teachBtn?.addEventListener("click", async () => {
    try {
      openBoardModal();
      await sendTeacherMessage(START_COMMAND, "AI teacher started the topic.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to start teaching.", "error");
    }
  });

  resumeBtn?.addEventListener("click", async () => {
    try {
      setStatus("Refreshing lesson...");
      if (activeSessionId) {
        await loadSpecificSession();
      } else {
        await createOrResumeSession(true);
      }
      focusActiveTeachingRegion("resume");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to refresh the lesson.", "error");
    }
  });

  questionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const question = questionInputEl instanceof HTMLTextAreaElement ? questionInputEl.value.trim() : "";
      if (!question) {
        setStatus("Type a doubt first.", "error");
        return;
      }
      await sendTeacherMessage(question, "Teacher answered your doubt.");
      if (questionInputEl instanceof HTMLTextAreaElement) {
        questionInputEl.value = "";
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to ask the doubt.", "error");
    }
  });

  quickContinueBtn?.addEventListener("click", async () => {
    await sendTeacherMessage(CONTINUE_COMMAND, "Teacher continued the lesson.");
  });
  quickRepeatBtn?.addEventListener("click", async () => {
    await sendTeacherMessage(REPEAT_COMMAND, "Teacher repeated the point.");
  });
  quickSimplerBtn?.addEventListener("click", async () => {
    await sendTeacherMessage(SIMPLER_COMMAND, "Teacher explained it more simply.");
  });
  quickExampleBtn?.addEventListener("click", async () => {
    await sendTeacherMessage(EXAMPLE_COMMAND, "Teacher gave an example.");
  });
  quickCheckBtn?.addEventListener("click", async () => {
    await sendTeacherMessage(CHECK_COMMAND, "Teacher asked a check question.");
  });
  replayLastBtn?.addEventListener("click", async () => {
    try {
      const latestAssistantMessage = extractLatestAssistantMessage(currentSession?.messages || []);
      if (!latestAssistantMessage?.structured) {
        setStatus("No teacher explanation is available yet.", "error");
        return;
      }
      openBoardModal();
      await startSpeechDrivenBoardSync(
        latestAssistantMessage,
        currentSession?.teacherContext?.voiceLanguage || currentTeacherContext().voiceLanguage,
        "replay"
      );
      window.setTimeout(() => focusActiveTeachingRegion("replay"), 180);
      window.setTimeout(() => focusActiveTeachingRegion("replay"), 1100);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to replay the exact teacher speech track.", "error");
    }
  });
  restartTopicBtn?.addEventListener("click", async () => {
    await sendTeacherMessage(START_COMMAND, "Teacher restarted the topic from the beginning.");
  });

  boardModalCloseBtn?.addEventListener("click", closeBoardModal);
  boardModalOverlayEl?.addEventListener("click", closeBoardModal);

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
  });
});
