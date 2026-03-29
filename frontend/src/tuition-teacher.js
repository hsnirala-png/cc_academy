import {
  apiRequest,
  getStoredToken,
  getStoredUser,
  goToStudentLogin,
  initHeaderBehavior,
} from "./mock-api.js?v=4";

const normalizeRole = (user) =>
  String(user?.role || user?.userRole || user?.user_type || user?.accountType || "")
    .trim()
    .toUpperCase();

const query = new URLSearchParams(window.location.search || "");
const chapterId = query.get("chapterId") || "";
const sessionIdFromQuery = query.get("sessionId") || "";
const allowSavedSessionOverride = query.get("savedSession") === "1";

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

const normalizeTopicText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

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
  const planModalEl = document.querySelector("#tuitionTeacherPlanModal");
  const planOverlayEl = document.querySelector("#tuitionTeacherPlanOverlay");
  const planCloseBtn = document.querySelector("#tuitionTeacherPlanCloseBtn");
  const planTextEl = document.querySelector("#tuitionTeacherPlanText");
  const sessionLabelEl = document.querySelector("#tuitionTeacherSessionLabel");
  const sessionMetaEl = document.querySelector("#tuitionTeacherSessionMeta");
  const statusEl = document.querySelector("#tuitionTeacherStatus");
  const messagesEl = document.querySelector("#tuitionTeacherMessages");
  const form = document.querySelector("#tuitionTeacherForm");
  const inputEl = document.querySelector("#tuitionTeacherInput");
  const teachBtn = document.querySelector("#tuitionTeacherTeachBtn");
  const subjectEl = document.querySelector("#tuitionTeacherSubject");
  const topicEl = document.querySelector("#tuitionTeacherTopic");
  const explanationLanguageEl = document.querySelector("#tuitionTeacherExplanationLanguage");
  const boardLanguageEl = document.querySelector("#tuitionTeacherBoardLanguage");
  const voiceLanguageEl = document.querySelector("#tuitionTeacherVoiceLanguage");
  const speedEl = document.querySelector("#tuitionTeacherSpeed");
  const difficultyEl = document.querySelector("#tuitionTeacherDifficulty");
  const resumeBtn = document.querySelector("#tuitionTeacherResumeBtn");
  const voiceBtn = document.querySelector("#tuitionTeacherVoiceBtn");
  const voiceEndBtn = document.querySelector("#tuitionTeacherVoiceEndBtn");
  const voiceStateEl = document.querySelector("#tuitionTeacherVoiceState");
  const voiceMetaEl = document.querySelector("#tuitionTeacherVoiceMeta");
  const voiceAudioEl = document.querySelector("#tuitionTeacherVoiceAudio");
  const homeworkBtn = document.querySelector("#tuitionTeacherHomeworkBtn");
  const boardTitleEl = document.querySelector("#tuitionTeacherBoardTitle");
  const boardMetaEl = document.querySelector("#tuitionTeacherBoardMeta");
  const boardAutoplayBtn = document.querySelector("#tuitionTeacherBoardAutoplayBtn");
  const boardPauseBtn = document.querySelector("#tuitionTeacherBoardPauseBtn");
  const boardNextBtn = document.querySelector("#tuitionTeacherBoardNextBtn");
  const boardReplayStepBtn = document.querySelector("#tuitionTeacherBoardReplayStepBtn");
  const boardClearBtn = document.querySelector("#tuitionTeacherBoardClearBtn");
  const boardReplayBtn = document.querySelector("#tuitionTeacherBoardReplayBtn");
  const boardCanvasTitleEl = document.querySelector("#tuitionTeacherBoardCanvasTitle");
  const boardCanvasHintEl = document.querySelector("#tuitionTeacherBoardCanvasHint");
  const boardTeachingStatusEl = document.querySelector("#tuitionTeacherBoardTeachingStatus");
  const boardTeacherCueEl = document.querySelector("#tuitionTeacherBoardTeacherCue");
  const boardProgressBarEl = document.querySelector("#tuitionTeacherBoardProgressBar");
  const liveBoardSceneEl = document.querySelector("#tuitionTeacherLiveBoardScene");
  const liveBoardStepTitleEl = document.querySelector("#tuitionTeacherLiveBoardStepTitle");
  const liveBoardSpeechEl = document.querySelector("#tuitionTeacherLiveBoardSpeech");
  const liveBoardCanvasEl = document.querySelector("#tuitionTeacherLiveBoardCanvas");
  const boardEmptyEl = document.querySelector("#tuitionTeacherBoardEmpty");
  const boardPanelEl = document.querySelector("#tuitionTeacherBoardPanel");
  const boardLinesSectionEl = document.querySelector("#tuitionTeacherBoardLinesSection");
  const boardFormulasSectionEl = document.querySelector("#tuitionTeacherBoardFormulasSection");
  const boardStepsSectionEl = document.querySelector("#tuitionTeacherBoardStepsSection");
  const boardLinesEl = document.querySelector("#tuitionTeacherBoardLines");
  const boardFormulasEl = document.querySelector("#tuitionTeacherBoardFormulas");
  const boardStepsEl = document.querySelector("#tuitionTeacherBoardSteps");
  const boardExampleEl = document.querySelector("#tuitionTeacherBoardExample");
  const boardExampleTitleEl = document.querySelector("#tuitionTeacherBoardExampleTitle");
  const boardExampleStepsEl = document.querySelector("#tuitionTeacherBoardExampleSteps");

  let activeSessionId = sessionIdFromQuery;
  let chapterContext = null;
  let voiceSession = {
    peerConnection: null,
    localStream: null,
    dataChannel: null,
    remoteStream: null,
    status: "idle",
  };
  let boardLesson = {
    timers: [],
    token: 0,
    structured: null,
    session: null,
    cleared: false,
    actionElements: new Map(),
    speakToken: 0,
    autoplay: true,
    paused: false,
    currentStepIndex: -1,
    teachingSteps: [],
    completed: false,
    mode: "teaching",
  };

  const closePlanModal = () => {
    if (!(planModalEl instanceof HTMLElement)) return;
    planModalEl.classList.add("hidden");
    planModalEl.setAttribute("aria-hidden", "true");
  };

  const openPlanModal = (planText) => {
    if (!(planModalEl instanceof HTMLElement)) return;
    if (planTextEl instanceof HTMLElement) {
      planTextEl.textContent = planText || "Explain the topic in a text-first flow.";
    }
    planModalEl.classList.remove("hidden");
    planModalEl.setAttribute("aria-hidden", "false");
  };

  const setStatus = (message, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = message;
    statusEl.className = `form-message${type ? ` ${type}` : ""}`;
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
      curriculumBoard: chapterContext?.profile?.boardName || chapterContext?.chapterContext?.boardName || "",
    };
  };

  const readSessionSettings = () => ({
    responseLanguage: currentTeacherContext().explanationLanguage,
    explanationLanguage: currentTeacherContext().explanationLanguage,
    boardLanguage: currentTeacherContext().boardLanguage,
    voiceLanguage: currentTeacherContext().voiceLanguage,
    subject: currentTeacherContext().subject,
    topic: currentTeacherContext().topic,
    curriculumBoard: currentTeacherContext().curriculumBoard,
    speedMode: speedEl instanceof HTMLSelectElement ? speedEl.value : "NORMAL",
    difficultyMode: difficultyEl instanceof HTMLSelectElement ? difficultyEl.value : "MEDIUM",
    resume: true,
  });

  const setVoiceState = (state, message = "") => {
    voiceSession.status = state;
    if (voiceStateEl instanceof HTMLElement) {
      const label =
        state === "connecting"
          ? "Connecting"
          : state === "live"
            ? "Live"
            : state === "ended"
              ? "Ended"
              : state === "error"
                ? "Error"
                : "Idle";
      voiceStateEl.textContent = label;
      voiceStateEl.className = `tuition-chip tuition-voice-chip state-${state}`;
    }
    if (voiceMetaEl instanceof HTMLElement) {
      voiceMetaEl.textContent =
        message ||
        (state === "live"
          ? "Voice tutor is live. Speak naturally about the current topic."
          : state === "connecting"
            ? "Connecting microphone and voice tutor..."
            : state === "ended"
              ? "Voice tutor ended. You can start another voice session any time."
              : state === "error"
                ? "Voice tutor could not start."
                : "Start voice mode to speak with the tutor using the current subject, topic, language, speed, and difficulty.");
    }
    if (voiceBtn instanceof HTMLButtonElement) {
      voiceBtn.disabled = state === "connecting";
      voiceBtn.textContent = state === "connecting" ? "Connecting Voice..." : "Start Voice Tutor";
    }
    if (voiceEndBtn instanceof HTMLButtonElement) {
      voiceEndBtn.classList.toggle("hidden", !(state === "connecting" || state === "live"));
    }
  };

  const stopVoiceSession = (state = "ended", message = "") => {
    if (voiceSession.dataChannel) {
      try {
        voiceSession.dataChannel.close();
      } catch {
        // Ignore close errors.
      }
    }
    if (voiceSession.peerConnection) {
      try {
        voiceSession.peerConnection.close();
      } catch {
        // Ignore close errors.
      }
    }
    if (voiceSession.localStream) {
      voiceSession.localStream.getTracks().forEach((track) => track.stop());
    }
    if (voiceAudioEl instanceof HTMLAudioElement) {
      voiceAudioEl.pause();
      voiceAudioEl.srcObject = null;
      voiceAudioEl.classList.add("hidden");
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

  const clearBoardLessonPlayback = () => {
    boardLesson.timers.forEach((timerId) => window.clearTimeout(timerId));
    boardLesson.timers = [];
    boardLesson.token += 1;
    boardLesson.speakToken += 1;
    boardLesson.paused = false;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const setBoardCanvasTitle = (title, hint = "") => {
    if (boardCanvasTitleEl instanceof HTMLElement) {
      boardCanvasTitleEl.textContent = title || "Teaching canvas";
    }
    if (boardCanvasHintEl instanceof HTMLElement) {
      boardCanvasHintEl.textContent = hint || "The latest teacher reply can rebuild this board any time.";
    }
  };

  const setBoardTeachingStatus = (message, state = "idle") => {
    if (!(boardTeachingStatusEl instanceof HTMLElement)) return;
    boardTeachingStatusEl.textContent = message;
    boardTeachingStatusEl.className = `tuition-board-teaching-status state-${state}`;
  };

  const setBoardTeacherCue = (message) => {
    if (boardTeacherCueEl instanceof HTMLElement) {
      boardTeacherCueEl.textContent = message;
    }
  };

  const setBoardProgress = (value) => {
    if (boardProgressBarEl instanceof HTMLElement) {
      const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
      boardProgressBarEl.style.width = `${safeValue}%`;
    }
  };

  const setBoardControlState = () => {
    const hasStructuredBoard = Boolean(boardLesson.structured);
    const hasTeachingSteps = Array.isArray(boardLesson.teachingSteps) && boardLesson.teachingSteps.length > 0;
    const canAdvance = hasStructuredBoard && hasTeachingSteps && !boardLesson.completed;
    const hasCurrentStep = hasStructuredBoard && hasTeachingSteps && boardLesson.currentStepIndex >= 0;
    if (boardAutoplayBtn instanceof HTMLButtonElement) {
      boardAutoplayBtn.disabled = !hasStructuredBoard || !hasTeachingSteps;
      boardAutoplayBtn.textContent = `Autoplay: ${boardLesson.autoplay ? "On" : "Off"}`;
      boardAutoplayBtn.classList.toggle("is-active", boardLesson.autoplay);
    }
    if (boardPauseBtn instanceof HTMLButtonElement) {
      boardPauseBtn.disabled = !hasStructuredBoard || !hasTeachingSteps || boardLesson.completed;
      boardPauseBtn.textContent = boardLesson.paused ? "Resume" : "Pause";
    }
    if (boardNextBtn instanceof HTMLButtonElement) {
      boardNextBtn.disabled = !canAdvance;
    }
    if (boardReplayStepBtn instanceof HTMLButtonElement) {
      boardReplayStepBtn.disabled = !hasCurrentStep;
    }
    if (boardClearBtn instanceof HTMLButtonElement) {
      boardClearBtn.disabled = !hasStructuredBoard;
    }
    if (boardReplayBtn instanceof HTMLButtonElement) {
      boardReplayBtn.disabled = !hasStructuredBoard;
    }
  };

  const getBoardPlaybackConfig = () => {
    const speedMode = speedEl instanceof HTMLSelectElement ? speedEl.value : "NORMAL";
    if (speedMode === "SLOW") {
      return { introDelay: 220, itemDelay: 700, stageDelay: 240 };
    }
    if (speedMode === "FAST") {
      return { introDelay: 120, itemDelay: 240, stageDelay: 120 };
    }
    return { introDelay: 160, itemDelay: 420, stageDelay: 180 };
  };

  const getSpeechSynthesisLanguage = () => {
    const selected =
      voiceLanguageEl instanceof HTMLSelectElement
        ? String(voiceLanguageEl.value || "").toUpperCase()
        : explanationLanguageEl instanceof HTMLSelectElement
          ? String(explanationLanguageEl.value || "").toUpperCase()
          : "ENGLISH";
    if (selected === "HINDI") return "hi-IN";
    if (selected === "PUNJABI") return "pa-IN";
    return "en-IN";
  };

  const speakBoardChunk = (text) => {
    if (!text || !window.speechSynthesis || voiceSession.status === "live") return;
    boardLesson.speakToken += 1;
    const speakToken = boardLesson.speakToken;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = getSpeechSynthesisLanguage();
    utterance.rate =
      speedEl instanceof HTMLSelectElement && speedEl.value === "SLOW"
        ? 0.88
        : speedEl instanceof HTMLSelectElement && speedEl.value === "FAST"
          ? 1.08
          : 0.96;
    utterance.onend = () => {
      if (speakToken !== boardLesson.speakToken) return;
    };
    window.speechSynthesis.speak(utterance);
  };

  const parseVoiceRealtimeError = async (response) => {
    const text = await response.text().catch(() => "");
    if (!text) return "Voice tutor session could not be started.";
    try {
      const payload = JSON.parse(text);
      return (
        String(payload?.error?.message || payload?.message || "").trim() ||
        "Voice tutor session could not be started."
      );
    } catch {
      return text.trim() || "Voice tutor session could not be started.";
    }
  };

  const boardLaneTitles = {
    title: "Topic Title",
    notes: "Teaching Notes",
    formula: "Formula Line",
    diagram: "Board Sketch",
    steps: "Solved Steps",
    example: "Worked Example",
    recap: "Recap",
  };

  const showLiveBoardScene = (visible) => {
    if (!(liveBoardSceneEl instanceof HTMLElement)) return;
    liveBoardSceneEl.classList.toggle("hidden", !visible);
  };

  const setLiveBoardNarration = (stepTitle, speechText) => {
    if (liveBoardStepTitleEl instanceof HTMLElement) {
      liveBoardStepTitleEl.textContent = stepTitle || "Waiting for a teaching step...";
    }
    if (liveBoardSpeechEl instanceof HTMLElement) {
      liveBoardSpeechEl.textContent =
        speechText || "The teacher narration will appear here while the board writes step by step.";
    }
  };

  const buildBoardActionElement = (action, indexInLane = 0) => {
    const element = document.createElement("div");
    element.className = `tuition-live-action type-${String(action.type || "").toLowerCase()} is-item-pending`;
    element.dataset.actionId = action.id;
    element.dataset.actionType = action.type;
    if (action.targetId) {
      element.dataset.targetId = action.targetId;
    }
    if (action.accent) {
      element.dataset.accent = action.accent;
      element.classList.add(`accent-${String(action.accent).toLowerCase()}`);
    }

    const safeText = escapeHtml(action.text || "");
    const safeLabel = escapeHtml(action.label || "");
    const safeFrom = escapeHtml(action.fromLabel || "");
    const safeTo = escapeHtml(action.toLabel || "");

    if (action.type === "WRITE_TEXT") {
      element.classList.add("tuition-live-title-line");
      element.innerHTML = `<span>${safeText}</span>`;
      return element;
    }

    if (action.type === "WRITE_BULLET") {
      element.classList.add("tuition-live-bullet");
      element.innerHTML = `<span class="tuition-live-bullet-dot">•</span><span>${safeText}</span>`;
      return element;
    }

    if (action.type === "WRITE_FORMULA") {
      element.classList.add("tuition-live-formula");
      element.innerHTML = `<span>${safeText}</span>`;
      return element;
    }

    if (action.type === "WRITE_STEP") {
      element.classList.add("tuition-live-step");
      element.innerHTML = `
        <span class="tuition-live-step-index">${indexInLane + 1}</span>
        <span class="tuition-live-step-text">${safeText}</span>
      `;
      return element;
    }

    if (action.type === "DRAW_BOX") {
      element.classList.add("tuition-live-diagram-box");
      element.innerHTML = `
        <strong>${safeLabel || "Box"}</strong>
        <span>${safeText}</span>
      `;
      return element;
    }

    if (action.type === "DRAW_ARROW") {
      element.classList.add("tuition-live-diagram-arrow");
      element.innerHTML = `
        <span>${safeFrom || "Start"}</span>
        <span class="tuition-live-arrow-glyph">→</span>
        <span>${safeTo || "End"}</span>
        ${safeText ? `<small>${safeText}</small>` : ""}
      `;
      return element;
    }

    if (action.type === "DRAW_LABEL") {
      element.classList.add("tuition-live-diagram-label");
      element.innerHTML = `
        <strong>${safeLabel || "Label"}</strong>
        <span>${safeText}</span>
      `;
      return element;
    }

    if (action.type === "SHOW_RECAP") {
      element.classList.add("tuition-live-recap");
      element.innerHTML = `<span>${safeText}</span>`;
      return element;
    }

    if (action.type === "ASK_STUDENT") {
      element.classList.add("tuition-live-question");
      element.innerHTML = `<span>${safeText}</span>`;
      return element;
    }

    element.classList.add("tuition-live-generic");
    element.innerHTML = `<span>${safeText || safeLabel || escapeHtml(action.type)}</span>`;
    return element;
  };

  const buildLiveBoardScene = (structured) => {
    if (!(liveBoardCanvasEl instanceof HTMLElement)) return;
    liveBoardCanvasEl.innerHTML = "";
    boardLesson.actionElements = new Map();

    const actions = Array.isArray(structured?.boardActions) ? structured.boardActions.filter(Boolean) : [];
    if (!actions.length) {
      showLiveBoardScene(false);
      return;
    }

    const laneOrder = ["title", "notes", "formula", "diagram", "steps", "example", "recap"];
    const laneMap = new Map();

    laneOrder.forEach((lane) => {
      const laneActions = actions.filter((action) => action.lane === lane && action.type !== "HIGHLIGHT");
      if (!laneActions.length) return;
      const laneEl = document.createElement("section");
      laneEl.className = `tuition-live-lane lane-${lane}`;
      laneEl.dataset.lane = lane;
      laneEl.innerHTML = `
        <p class="tuition-live-lane-tag">${escapeHtml(boardLaneTitles[lane] || lane)}</p>
        <div class="tuition-live-lane-items"></div>
      `;
      const itemsEl = laneEl.querySelector(".tuition-live-lane-items");
      laneActions.forEach((action, index) => {
        if (!(itemsEl instanceof HTMLElement)) return;
        const actionEl = buildBoardActionElement(action, index);
        itemsEl.appendChild(actionEl);
        boardLesson.actionElements.set(action.id, actionEl);
      });
      liveBoardCanvasEl.appendChild(laneEl);
      laneMap.set(lane, laneEl);
    });

    actions
      .filter((action) => action.type === "HIGHLIGHT")
      .forEach((action, index) => {
        const recapLane =
          laneMap.get("recap") ||
          (() => {
            const laneEl = document.createElement("section");
            laneEl.className = "tuition-live-lane lane-recap";
            laneEl.dataset.lane = "recap";
            laneEl.innerHTML = `
              <p class="tuition-live-lane-tag">${escapeHtml(boardLaneTitles.recap)}</p>
              <div class="tuition-live-lane-items"></div>
            `;
            liveBoardCanvasEl.appendChild(laneEl);
            laneMap.set("recap", laneEl);
            return laneEl;
          })();
        const itemsEl = recapLane.querySelector(".tuition-live-lane-items");
        if (!(itemsEl instanceof HTMLElement)) return;
        const actionEl = buildBoardActionElement(
          {
            ...action,
            text: action.text || "Highlight this key idea on the board.",
            type: "SHOW_RECAP",
          },
          index
        );
        actionEl.classList.add("tuition-live-highlight-note");
        itemsEl.appendChild(actionEl);
        boardLesson.actionElements.set(action.id, actionEl);
      });

    showLiveBoardScene(true);
  };

  const revealLiveBoardAction = (action) => {
    const actionEl = boardLesson.actionElements.get(action.id);
    if (actionEl instanceof HTMLElement) {
      actionEl.classList.remove("is-item-pending");
      actionEl.classList.add("is-item-revealed");
    }
    if (action.type === "HIGHLIGHT" && action.targetId) {
      const targetEl = boardLesson.actionElements.get(action.targetId);
      if (targetEl instanceof HTMLElement) {
        targetEl.classList.add("is-live-highlight");
      }
    }
  };

  const pulseLiveBoardAction = (action) => {
    const actionEl = boardLesson.actionElements.get(action.id);
    if (!(actionEl instanceof HTMLElement)) return;
    actionEl.classList.remove("is-item-replayed");
    void actionEl.offsetWidth;
    actionEl.classList.add("is-item-replayed");
  };

  const getTeachingSteps = (structured) =>
    Array.isArray(structured?.teachingSteps) ? structured.teachingSteps.filter(Boolean) : [];

  const getSpeechChunkText = (structured, speechChunkId) =>
    Array.isArray(structured?.speechChunks)
      ? structured.speechChunks.find((chunk) => chunk.id === speechChunkId)?.text || ""
      : "";

  const getBoardProgressValue = () => {
    if (!(Array.isArray(boardLesson.teachingSteps) && boardLesson.teachingSteps.length)) return 0;
    if (boardLesson.completed) return 100;
    return 4 + Math.round((((boardLesson.currentStepIndex + 1) || 0) / boardLesson.teachingSteps.length) * 96);
  };

  const applyTeachingStep = (structured, stepIndex, options = {}) => {
    const teachingSteps = getTeachingSteps(structured);
    const step = teachingSteps[stepIndex];
    if (!step) return false;
    const shouldReplay = Boolean(options?.replay);
    const speechText = getSpeechChunkText(structured, step.speechChunkId);
    boardLesson.currentStepIndex = stepIndex;
    boardLesson.completed = stepIndex >= teachingSteps.length - 1;
    setBoardTeachingStatus(`Teacher is teaching: ${step.title}`, "writing");
    setBoardTeacherCue(speechText || "Teacher is writing the next point on the board.");
    setLiveBoardNarration(step.title, speechText);
    speakBoardChunk(speechText);
    step.actionIds.forEach((actionId) => {
      const action = structured?.boardActions?.find((item) => item.id === actionId);
      if (!action) return;
      revealLiveBoardAction(action);
      if (shouldReplay) {
        pulseLiveBoardAction(action);
      }
    });
    setBoardProgress(getBoardProgressValue());
    setBoardControlState();
    return true;
  };

  const finishTeachingPlayback = (structured, session) => {
    boardLesson.completed = true;
    boardLesson.paused = false;
    setBoardTeachingStatus("Live board lesson complete. Replay it any time.", "complete");
    setBoardTeacherCue("Ask a follow-up question, replay the current step, or rebuild the full lesson.");
    setLiveBoardNarration(
      "Lesson complete",
      "You can replay the current step, rebuild the full board lesson, or continue with practice."
    );
    setBoardCanvasTitle(
      structured?.boardTitle || session?.chapter?.title || "Teaching canvas",
      "Use Clear Board to blank the canvas or Rebuild Board to replay the latest live teacher layout."
    );
    setBoardProgress(100);
    setBoardControlState();
  };

  const queueNextTeachingStep = (structured, session) => {
    clearBoardLessonPlayback();
    const teachingSteps = boardLesson.teachingSteps;
    const nextIndex = boardLesson.currentStepIndex + 1;
    if (!teachingSteps.length || nextIndex >= teachingSteps.length) {
      finishTeachingPlayback(structured, session);
      return;
    }
    if (boardLesson.paused) {
      setBoardTeachingStatus("Board lesson paused. Resume or step forward manually.", "idle");
      setBoardTeacherCue("Resume autoplay or click Next Step to continue.");
      setBoardControlState();
      return;
    }
    if (!boardLesson.autoplay) {
      setBoardTeachingStatus("Autoplay is off. Use Next Step to continue the lesson.", "idle");
      setBoardTeacherCue("Manual mode is active. Click Next Step to reveal the next teaching move.");
      setBoardControlState();
      return;
    }
    const step = teachingSteps[nextIndex];
    const playback = getBoardPlaybackConfig();
    const delayMs = nextIndex === 0 ? playback.introDelay : Number(step.autoDelayMs || playback.itemDelay * 2);
    const token = boardLesson.token;
    const timerId = window.setTimeout(() => {
      if (token !== boardLesson.token || boardLesson.paused) return;
      const applied = applyTeachingStep(structured, nextIndex);
      if (!applied) return;
      if (nextIndex >= teachingSteps.length - 1) {
        finishTeachingPlayback(structured, session);
        return;
      }
      queueNextTeachingStep(structured, session);
    }, delayMs);
    boardLesson.timers.push(timerId);
    setBoardControlState();
  };

  const prepareTeachingPlayback = (structured, session) => {
    boardLesson.structured = structured || null;
    boardLesson.session = session || null;
    boardLesson.cleared = false;
    boardLesson.paused = false;
    boardLesson.currentStepIndex = -1;
    boardLesson.completed = false;
    boardLesson.mode = "teaching";
    boardLesson.teachingSteps = getTeachingSteps(structured);
    clearBoardLessonPlayback();
    if (boardPanelEl instanceof HTMLElement) {
      boardPanelEl.classList.remove("hidden");
    }
    if (boardEmptyEl instanceof HTMLElement) {
      boardEmptyEl.classList.add("hidden");
    }
    buildLiveBoardScene(structured);
    setBoardCanvasTitle(
      structured?.boardTitle || session?.chapter?.title || "Teaching canvas",
      "Watch the teacher explain and write each step in order."
    );
    setBoardTeachingStatus(
      boardLesson.autoplay ? "Teacher is opening the live board lesson..." : "Manual mode is ready. Use Next Step to begin.",
      boardLesson.autoplay ? "writing" : "idle"
    );
    setBoardTeacherCue(
      boardLesson.autoplay
        ? "The teacher is about to write the first idea on the board."
        : "Autoplay is off. Click Next Step to reveal the first teaching move."
    );
    setLiveBoardNarration(
      boardLesson.autoplay ? "Opening lesson" : "Manual board lesson ready",
      boardLesson.autoplay
        ? "The teacher narration will stay aligned with each board step."
        : "Use Next Step, Pause, Resume, or Replay Step while the board writes."
    );
    setBoardProgress(0);
    setBoardControlState();
  };

  const runTeachingPlayback = (structured, session) => {
    prepareTeachingPlayback(structured, session);
    queueNextTeachingStep(structured, session);
  };

  const stepBoardForward = () => {
    if (!boardLesson.structured || !boardLesson.teachingSteps.length || boardLesson.completed) return;
    clearBoardLessonPlayback();
    boardLesson.paused = true;
    const nextIndex = boardLesson.currentStepIndex + 1;
    const applied = applyTeachingStep(boardLesson.structured, nextIndex);
    if (!applied) {
      finishTeachingPlayback(boardLesson.structured, boardLesson.session);
      return;
    }
    if (nextIndex >= boardLesson.teachingSteps.length - 1) {
      finishTeachingPlayback(boardLesson.structured, boardLesson.session);
      return;
    }
    setBoardTeachingStatus("Manual mode is active. Click Next Step to continue.", "idle");
    setBoardTeacherCue("The board is waiting for your next step.");
    setBoardControlState();
  };

  const toggleBoardPause = () => {
    if (!boardLesson.structured || !boardLesson.teachingSteps.length || boardLesson.completed) return;
    if (boardLesson.paused) {
      boardLesson.paused = false;
      setBoardTeachingStatus(
        boardLesson.autoplay ? "Autoplay resumed. Teacher is continuing the lesson..." : "Manual mode resumed. Use Next Step to continue.",
        boardLesson.autoplay ? "writing" : "idle"
      );
      setBoardTeacherCue(
        boardLesson.autoplay ? "The teacher is continuing from the next board step." : "Click Next Step when you want the next board move."
      );
      setBoardControlState();
      if (boardLesson.autoplay && !boardLesson.completed) {
        queueNextTeachingStep(boardLesson.structured, boardLesson.session);
      }
      return;
    }
    clearBoardLessonPlayback();
    boardLesson.paused = true;
    setBoardTeachingStatus("Board lesson paused.", "idle");
    setBoardTeacherCue("Resume autoplay or continue manually from the current lesson state.");
    setBoardControlState();
  };

  const replayCurrentTeachingStep = () => {
    if (!boardLesson.structured || boardLesson.currentStepIndex < 0) return;
    clearBoardLessonPlayback();
    boardLesson.paused = true;
    const applied = applyTeachingStep(boardLesson.structured, boardLesson.currentStepIndex, { replay: true });
    if (!applied) return;
    setBoardTeachingStatus("Current step replayed.", "complete");
    setBoardTeacherCue("The current board step has been replayed.");
    setBoardControlState();
  };

  const renderSummary = (chapter, progress) => {
    if (!(summaryEl instanceof HTMLElement)) return;
    summaryEl.innerHTML = `
      <div class="tuition-summary-item">
        <strong>Chapter</strong>
        <span>${escapeHtml(chapter?.title || "Tuition Chapter")}</span>
      </div>
      <div class="tuition-summary-item">
        <strong>Syllabus</strong>
        <span>${escapeHtml(chapter?.syllabusTitle || "-")}</span>
      </div>
      <div class="tuition-summary-item">
        <strong>Plan Goal</strong>
        <span>${escapeHtml(chapter?.plan?.goalSummary || "Explain the topic in a text-first flow.")}</span>
      </div>
      <div class="tuition-summary-item">
        <strong>Progress</strong>
        <span>${escapeHtml(String(progress?.completionPercent || 0))}% · ${escapeHtml(
          progress?.progressLabel || progress?.status || "Not Started"
        )}</span>
      </div>
    `;
  };

  const renderSummaryRow = (chapter, progress) => {
    if (!(summaryEl instanceof HTMLElement)) return;
    const planGoal = chapter?.plan?.goalSummary || "Explain the topic in a text-first flow.";
    summaryEl.innerHTML = `
      <div class="tuition-summary-inline">
        <strong>Syllabus:</strong>
        <span>${escapeHtml(chapter?.syllabusTitle || "-")}</span>
      </div>
      <div class="tuition-summary-inline">
        <strong>Progress:</strong>
        <span>${escapeHtml(String(progress?.completionPercent || 0))}%</span>
      </div>
      <button
        type="button"
        class="btn-secondary tuition-summary-plan-btn"
        data-plan-button="1"
        data-plan-text="${escapeHtml(planGoal)}"
      >
        Plan Goal
      </button>
    `;
  };

  const renderMessages = (messages) => {
    if (!(messagesEl instanceof HTMLElement)) return;
    if (!messages.length) {
      messagesEl.innerHTML = `<div class="tuition-chat-empty">Start by asking about the current topic.</div>`;
      return;
    }

    messagesEl.innerHTML = messages
      .map((message) => {
        const structured = message?.structured;
        return `
          <article class="tuition-chat-message ${message.role === "USER" ? "is-user" : "is-assistant"}">
            <strong>${message.role === "USER" ? "You" : "AI Tuition Teacher"}</strong>
            <p>${escapeHtml(structured?.replyText || message.content || "").replace(/\n/g, "<br />")}</p>
            ${
              structured?.recapPoints?.length
                ? `<div class="tuition-chat-list"><strong>Recap</strong><ul>${structured.recapPoints
                    .map((item) => `<li>${escapeHtml(item)}</li>`)
                    .join("")}</ul></div>`
                : ""
            }
            ${
              structured?.nextSuggestedAction
                ? `<div class="tuition-summary-item compact"><strong>Next</strong><span>${escapeHtml(
                    structured.nextSuggestedAction
                  )}</span></div>`
                : ""
            }
            ${
              structured?.progressUpdate
                ? `<div class="tuition-summary-item compact"><strong>Progress</strong><span>${escapeHtml(
                    structured.progressUpdate
                  )}</span></div>`
                : ""
            }
          </article>
        `;
      })
      .join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const renderSessionMeta = (session, progress) => {
    if (sessionLabelEl instanceof HTMLElement) {
      sessionLabelEl.textContent = session?.status ? `Session ${session.status}` : "Session Ready";
    }
    if (!(sessionMetaEl instanceof HTMLElement)) return;
    sessionMetaEl.innerHTML = [
      session?.teacherContext?.explanationLanguage || session?.responseLanguage || "ENGLISH",
      session?.speedMode || "NORMAL",
      session?.difficultyMode || "MEDIUM",
      `${progress?.completionPercent || 0}%`,
    ]
      .map((item) => `<span class="tuition-chip">${escapeHtml(item)}</span>`)
      .join("");
  };

  if (summaryEl instanceof HTMLElement) {
    summaryEl.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("[data-plan-button='1']") : null;
      if (!(target instanceof HTMLElement)) return;
      openPlanModal(target.dataset.planText || "");
    });
  }

  if (planCloseBtn instanceof HTMLButtonElement) {
    planCloseBtn.addEventListener("click", closePlanModal);
  }

  if (planOverlayEl instanceof HTMLElement) {
    planOverlayEl.addEventListener("click", closePlanModal);
  }

  topicEl?.addEventListener("input", () => {
    if (!(titleEl instanceof HTMLElement) || !(topicEl instanceof HTMLInputElement)) return;
    titleEl.textContent = topicEl.value.trim() || chapterContext?.chapter?.title || "Tuition Session";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePlanModal();
    }
  });

  const extractLatestBoardPayload = (messages) =>
    [...(Array.isArray(messages) ? messages : [])]
      .reverse()
      .find(
        (message) =>
          message?.role === "ASSISTANT" &&
          message?.structured &&
          (message.structured.boardTitle ||
            message.structured.boardLines?.length ||
            message.structured.formulas?.length ||
            message.structured.steps?.length ||
            message.structured.exampleSteps?.length)
      )?.structured || null;

  const renderBoardList = (element, items, tagName = "li") => {
    if (!(element instanceof HTMLElement)) return;
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!safeItems.length) {
      element.innerHTML = `<${tagName} class="tuition-board-empty-item">No notes yet.</${tagName}>`;
      return;
    }
    element.innerHTML = safeItems
      .map(
        (item, index) =>
          `<${tagName} class="tuition-board-reveal-item is-item-pending" data-board-item-index="${index}">${escapeHtml(
            item
          )}</${tagName}>`
      )
      .join("");
  };

  const getBoardLessonStages = (structured) => [
    {
      label: "Key Board Lines",
      cue: "Teacher is writing the topic focus and main ideas first.",
      sectionEl: boardLinesSectionEl,
      listEl: boardLinesEl,
      items: Array.isArray(structured?.boardLines) ? structured.boardLines.filter(Boolean) : [],
    },
    {
      label: "Rules And Formulas",
      cue: "Teacher is adding the rules or formulas students should remember.",
      sectionEl: boardFormulasSectionEl,
      listEl: boardFormulasEl,
      items: Array.isArray(structured?.formulas) ? structured.formulas.filter(Boolean) : [],
    },
    {
      label: "Worked Steps",
      cue: "Teacher is solving the idea step by step on the board.",
      sectionEl: boardStepsSectionEl,
      listEl: boardStepsEl,
      items: Array.isArray(structured?.steps) ? structured.steps.filter(Boolean) : [],
    },
    {
      label: structured?.exampleTitle || "Worked Example",
      cue: "Teacher is finishing with one complete worked example.",
      sectionEl: boardExampleEl,
      listEl: boardExampleStepsEl,
      items: Array.isArray(structured?.exampleSteps) ? structured.exampleSteps.filter(Boolean) : [],
    },
  ].filter((stage) => stage.sectionEl instanceof HTMLElement && stage.items.length);

  const markBoardSection = (sectionEl, state) => {
    if (!(sectionEl instanceof HTMLElement)) return;
    sectionEl.classList.toggle("is-stage-pending", state === "pending");
    sectionEl.classList.toggle("is-stage-active", state === "active");
    sectionEl.classList.toggle("is-stage-complete", state === "complete");
  };

  const resetBoardLessonVisuals = (stages) => {
    stages.forEach((stage) => {
      markBoardSection(stage.sectionEl, "pending");
      Array.from(stage.listEl?.children || []).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        child.classList.add("is-item-pending");
        child.classList.remove("is-item-revealed");
      });
    });
  };

  const revealBoardLessonInstantly = (structured, session) => {
    const stages = getBoardLessonStages(structured);
    const teachingSteps = getTeachingSteps(structured);
    boardLesson.cleared = false;
    boardLesson.teachingSteps = teachingSteps;
    boardLesson.currentStepIndex = teachingSteps.length ? teachingSteps.length - 1 : -1;
    boardLesson.completed = Boolean(teachingSteps.length);
    boardLesson.mode = teachingSteps.length ? "teaching" : "stages";
    if (boardPanelEl instanceof HTMLElement) {
      boardPanelEl.classList.remove("hidden");
    }
    if (boardEmptyEl instanceof HTMLElement) {
      boardEmptyEl.classList.add("hidden");
    }
    buildLiveBoardScene(structured);
    if (teachingSteps.length) {
      teachingSteps.forEach((step) => {
        step.actionIds.forEach((actionId) => {
          const action = structured?.boardActions?.find((item) => item.id === actionId);
          if (action) {
            revealLiveBoardAction(action);
          }
        });
      });
      const lastStep = teachingSteps[teachingSteps.length - 1];
      setLiveBoardNarration(lastStep?.title || "Board lesson ready", getSpeechChunkText(structured, lastStep?.speechChunkId));
    } else {
      showLiveBoardScene(false);
      setLiveBoardNarration("", "");
    }
    stages.forEach((stage) => {
      markBoardSection(stage.sectionEl, "complete");
      Array.from(stage.listEl?.children || []).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        child.classList.remove("is-item-pending");
        child.classList.add("is-item-revealed");
      });
    });

    if (boardReplayBtn instanceof HTMLButtonElement) {
      boardReplayBtn.disabled = !stages.length;
    }
    setBoardControlState();

    if (!stages.length) {
      setBoardCanvasTitle(
        "Waiting for a teacher reply...",
        "Ask a topic question to build notes, formulas, steps, and a classwork example."
      );
      setBoardTeachingStatus("Ask a topic question to start the guided board lesson.", "idle");
      setBoardTeacherCue("The teacher will start writing after the next reply.");
      setBoardProgress(0);
      return;
    }

    setBoardCanvasTitle(
      structured?.boardTitle || session?.chapter?.title || "Teaching canvas",
      "The latest teacher reply has been laid out like a class board."
    );
    setBoardTeachingStatus("Board lesson ready. Replay it any time.", "complete");
    setBoardTeacherCue(
      `The latest board lesson for ${
        session?.teacherContext?.topic || structured?.topicTitle || structured?.title || session?.chapter?.title || "this topic"
      } is ready.`
    );
    setBoardProgress(100);
  };

  const playBoardLesson = (structured, session = null) => {
    const stages = getBoardLessonStages(structured);
    const teachingSteps = getTeachingSteps(structured);
    clearBoardLessonPlayback();
    boardLesson.structured = structured || null;
    boardLesson.session = session || null;
    boardLesson.cleared = false;
    boardLesson.mode = teachingSteps.length ? "teaching" : "stages";
    boardLesson.teachingSteps = teachingSteps;

    if (boardReplayBtn instanceof HTMLButtonElement) {
      boardReplayBtn.disabled = !stages.length;
    }
    setBoardControlState();

    if (!stages.length) {
      revealBoardLessonInstantly(structured, session);
      return;
    }

    if (teachingSteps.length) {
      runTeachingPlayback(structured, session);
      return;
    }

    resetBoardLessonVisuals(stages);
    showLiveBoardScene(false);
    setLiveBoardNarration("", "");
    setBoardCanvasTitle(
      structured?.boardTitle || session?.chapter?.title || "Teaching canvas",
      "Watch the teacher build the board progressively from the latest explanation."
    );
    setBoardTeachingStatus("Teacher is opening the board...", "writing");
    setBoardTeacherCue("Watch the board notes appear in teaching order.");
    setBoardProgress(4);

    const playback = getBoardPlaybackConfig();
    const totalItems = stages.reduce((count, stage) => count + stage.items.length, 0) || 1;
    const token = boardLesson.token;
    let revealedItems = 0;
    let cursor = playback.introDelay;

    const schedule = (delayMs, callback) => {
      const timerId = window.setTimeout(() => {
        if (token !== boardLesson.token) return;
        callback();
      }, delayMs);
      boardLesson.timers.push(timerId);
    };

    stages.forEach((stage) => {
      schedule(cursor, () => {
        markBoardSection(stage.sectionEl, "active");
        setBoardTeachingStatus(`Teacher is writing ${stage.label.toLowerCase()}...`, "writing");
        setBoardTeacherCue(stage.cue);
        stage.sectionEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });

      const children = Array.from(stage.listEl?.children || []).filter((child) => child instanceof HTMLElement);
      children.forEach((child, childIndex) => {
        schedule(cursor + playback.itemDelay * (childIndex + 1), () => {
          if (!(child instanceof HTMLElement)) return;
          child.classList.remove("is-item-pending");
          child.classList.add("is-item-revealed");
          revealedItems += 1;
          setBoardProgress(4 + Math.round((revealedItems / totalItems) * 96));
        });
      });

      cursor += playback.itemDelay * (children.length + 1);
      schedule(cursor, () => {
        markBoardSection(stage.sectionEl, "complete");
      });
      cursor += playback.stageDelay;
    });

    schedule(cursor, () => {
      setBoardTeachingStatus("Board lesson complete. Replay it any time.", "complete");
      setBoardTeacherCue("You can replay the board lesson or continue asking follow-up questions.");
      setBoardCanvasTitle(
        structured?.boardTitle || session?.chapter?.title || "Teaching canvas",
        "Use Clear Board to blank the canvas or Rebuild Board to replay the latest teacher layout."
      );
      setBoardProgress(100);
      if (boardReplayBtn instanceof HTMLButtonElement) {
        boardReplayBtn.disabled = false;
      }
    });
  };

  const renderBoard = (structured, session = null, options = {}) => {
    const hasBoard =
      structured &&
      (structured.boardTitle ||
        structured.boardLines?.length ||
        structured.formulas?.length ||
        structured.steps?.length ||
        structured.exampleSteps?.length);

    if (boardTitleEl instanceof HTMLElement) {
      boardTitleEl.textContent = hasBoard ? structured.boardTitle || "Teaching Board" : "Teaching Board";
    }
    if (boardMetaEl instanceof HTMLElement) {
      boardMetaEl.innerHTML = hasBoard
        ? [
            session?.teacherContext?.boardLanguage ||
              session?.teacherContext?.explanationLanguage ||
              session?.responseLanguage ||
              "ENGLISH",
            session?.speedMode || "NORMAL",
            session?.difficultyMode || "MEDIUM",
          ]
            .map((item) => `<span class="tuition-chip">${escapeHtml(item)}</span>`)
            .join("")
        : "";
    }
    if (boardEmptyEl instanceof HTMLElement) {
      boardEmptyEl.classList.toggle("hidden", Boolean(hasBoard));
    }
    if (boardPanelEl instanceof HTMLElement) {
      boardPanelEl.classList.toggle("hidden", !hasBoard);
    }
    if (!hasBoard) {
      showLiveBoardScene(false);
      setLiveBoardNarration("", "");
    }
    if (!hasBoard) {
      boardLesson.structured = null;
      boardLesson.session = session || null;
      boardLesson.cleared = false;
      clearBoardLessonPlayback();
      if (boardEmptyEl instanceof HTMLElement) {
        boardEmptyEl.textContent =
          "Ask the tuition teacher a topic question to generate structured board notes, formulas, steps, and a worked example.";
      }
      setBoardCanvasTitle(
        "Waiting for a teacher reply...",
        "Ask a topic question to build notes, formulas, worked steps, and one solved classwork example."
      );
      setBoardControlState();
      setBoardTeachingStatus("Ask a topic question to start the guided board lesson.", "idle");
      setBoardTeacherCue("The teacher will start writing after the next reply.");
      setBoardProgress(0);
      return;
    }

    boardLesson.structured = structured;
    boardLesson.session = session || null;
    renderBoardList(boardLinesEl, structured.boardLines);
    renderBoardList(boardFormulasEl, structured.formulas);
    renderBoardList(boardStepsEl, structured.steps, "li");

    const hasExample = Boolean(structured.exampleTitle || structured.exampleSteps?.length);
    if (boardExampleEl instanceof HTMLElement) {
      boardExampleEl.classList.toggle("hidden", !hasExample);
    }
    if (boardExampleTitleEl instanceof HTMLElement) {
      boardExampleTitleEl.textContent = structured.exampleTitle || "Worked Example";
    }
    renderBoardList(boardExampleStepsEl, structured.exampleSteps, "li");

    if (options.animate) {
      playBoardLesson(structured, session);
      return;
    }

    revealBoardLessonInstantly(structured, session);
  };

  const clearBoardView = () => {
    clearBoardLessonPlayback();
    boardLesson.cleared = true;
    if (boardPanelEl instanceof HTMLElement) {
      boardPanelEl.classList.add("hidden");
    }
    showLiveBoardScene(false);
    setLiveBoardNarration("Board cleared", "Use Rebuild Board to replay the latest teacher lesson.");
    if (boardEmptyEl instanceof HTMLElement) {
      boardEmptyEl.classList.remove("hidden");
      boardEmptyEl.textContent =
        "Board cleared for this view only. Use Rebuild Board to redraw the latest teacher reply.";
    }
    setBoardCanvasTitle(
      boardLesson.session?.chapter?.title || chapterContext?.chapter?.title || "Teaching canvas",
      "The latest board content is still saved for this session. Rebuild it any time."
    );
    setBoardTeachingStatus("Board cleared for this view.", "idle");
    setBoardTeacherCue("Use Rebuild Board to draw the latest teacher reply again.");
    setBoardProgress(0);
    setBoardControlState();
  };

  const applySessionState = (payload, options = {}) => {
    activeSessionId = payload?.session?.id || activeSessionId;
    if (activeSessionId) {
      const nextUrl = resolveTuitionPagePath("tuition-teacher", {
        chapterId,
        sessionId: activeSessionId,
      });
      window.history.replaceState({}, "", nextUrl);
    }
    const teacherContext = payload?.session?.teacherContext || {};
    if (subjectEl instanceof HTMLInputElement) {
      subjectEl.value = teacherContext.subject || subjectEl.value || chapterContext?.profile?.subjectName || "";
    }
    if (topicEl instanceof HTMLInputElement) {
      topicEl.value = teacherContext.topic || topicEl.value || chapterContext?.chapter?.title || "";
    }
    if (titleEl instanceof HTMLElement) {
      titleEl.textContent = teacherContext.topic || payload?.session?.title || chapterContext?.chapter?.title || "Tuition Session";
    }
    if (explanationLanguageEl instanceof HTMLSelectElement) {
      explanationLanguageEl.value =
        teacherContext.explanationLanguage || payload?.session?.responseLanguage || explanationLanguageEl.value;
    }
    if (boardLanguageEl instanceof HTMLSelectElement) {
      boardLanguageEl.value = teacherContext.boardLanguage || teacherContext.explanationLanguage || boardLanguageEl.value;
    }
    if (voiceLanguageEl instanceof HTMLSelectElement) {
      voiceLanguageEl.value = teacherContext.voiceLanguage || teacherContext.explanationLanguage || voiceLanguageEl.value;
    }
    if (speedEl instanceof HTMLSelectElement && payload?.session?.speedMode) {
      speedEl.value = payload.session.speedMode;
    }
    if (difficultyEl instanceof HTMLSelectElement && payload?.session?.difficultyMode) {
      difficultyEl.value = payload.session.difficultyMode;
    }
    renderMessages(payload?.session?.messages || []);
    renderSessionMeta(payload?.session, payload?.progress);
    renderBoard(extractLatestBoardPayload(payload?.session?.messages || []), payload?.session || null, options);
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
    if (titleEl instanceof HTMLElement) titleEl.textContent = payload?.chapter?.title || "Tuition Session";
    if (explanationLanguageEl instanceof HTMLSelectElement && payload?.profile?.preferredLanguage) {
      explanationLanguageEl.value = String(payload.profile.preferredLanguage).toUpperCase();
    }
    if (boardLanguageEl instanceof HTMLSelectElement && explanationLanguageEl instanceof HTMLSelectElement) {
      boardLanguageEl.value = explanationLanguageEl.value;
    }
    if (voiceLanguageEl instanceof HTMLSelectElement && explanationLanguageEl instanceof HTMLSelectElement) {
      voiceLanguageEl.value = explanationLanguageEl.value;
    }
    renderSummaryRow(payload?.chapter, payload?.progress);
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
    setStatus(payload?.resumed ? "Previous session resumed." : "New teaching session created.", "success");
  };

  const loadSpecificSession = async () => {
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}`,
      token,
    });
    const chapterTopic =
      chapterContext?.chapter?.title || payload?.session?.chapter?.title || "";
    const sessionTopic =
      payload?.session?.teacherContext?.topic ||
      payload?.session?.title ||
      payload?.session?.chapter?.title ||
      "";

    if (
      !allowSavedSessionOverride &&
      normalizeTopicText(chapterTopic) &&
      normalizeTopicText(sessionTopic) &&
      normalizeTopicText(chapterTopic) !== normalizeTopicText(sessionTopic)
    ) {
      activeSessionId = "";
      const nextUrl = resolveTuitionPagePath("tuition-teacher", { chapterId });
      window.history.replaceState({}, "", nextUrl);
      await createOrResumeSession(true);
      setStatus("Loaded the chapter lesson instead of an unrelated saved topic session.", "success");
      return;
    }
    applySessionState(payload);
    setStatus("Saved session loaded.", "success");
  };

  const sendTeacherMessage = async (content, successMessage = "Response generated for the current topic.") => {
    const safeContent = String(content || "").trim();
    if (!safeContent) {
      setStatus("Enter a message first.", "error");
      return;
    }

    if (!activeSessionId) {
      await createOrResumeSession(true);
    }

    setStatus("Sending message...");
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}/messages`,
      method: "POST",
      token,
      body: {
        content: safeContent,
        ...readSessionSettings(),
      },
    });
    applySessionState(payload, { animate: true });
    if (chapterContext?.chapter) {
      renderSummaryRow(chapterContext.chapter, payload?.progress);
    }
    if (inputEl instanceof HTMLTextAreaElement && inputEl.value.trim() === safeContent) {
      inputEl.value = "";
    }
    setStatus(successMessage, "success");
  };

  const startVoiceTutor = async () => {
    if (voiceSession.status === "connecting" || voiceSession.status === "live") {
      return;
    }
    if (
      typeof window.RTCPeerConnection === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setVoiceState("error", "Voice tutor needs microphone and WebRTC support in this browser.");
      return;
    }

    try {
      if (!activeSessionId) {
        setStatus("Preparing a session before starting voice tutor...");
        await createOrResumeSession(true);
      }

      setVoiceState("connecting");
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
          setVoiceState(
            "live",
            `Voice tutor is live for ${bootstrap?.context?.topicTitle || currentTeacherContext().topic || chapterContext?.chapter?.title || "this topic"}.`
          );
        } else if (peerConnection.connectionState === "failed") {
          stopVoiceSession("error", "Voice tutor connection failed.");
        } else if (
          peerConnection.connectionState === "disconnected" ||
          peerConnection.connectionState === "closed"
        ) {
          stopVoiceSession("ended", "Voice tutor session ended.");
        }
      };

      dataChannel.onopen = () => {
        dataChannel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["audio", "text"],
              instructions:
                `Greet the student briefly in ${bootstrap?.session?.responseLanguage || "English"} and ask ` +
                `which part of ${bootstrap?.context?.topicTitle || currentTeacherContext().topic || "the topic"} they want help with.`,
            },
          })
        );
      };
      dataChannel.onerror = () => {
        setVoiceState("error", "Voice tutor data channel reported an error.");
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

      setVoiceState(
        "live",
        `Voice tutor is live in ${bootstrap?.session?.responseLanguage || "English"} with ${
          bootstrap?.session?.speedMode || "NORMAL"
        } pace and ${bootstrap?.session?.difficultyMode || "MEDIUM"} depth.`
      );
    } catch (error) {
      stopVoiceSession(
        "error",
        error instanceof Error ? error.message : "Unable to start the voice tutor."
      );
    }
  };

  try {
    await loadChapterContext();
    if (activeSessionId) {
      await loadSpecificSession();
    } else {
      await createOrResumeSession(true);
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to open the tuition teacher.", "error");
  }

  resumeBtn?.addEventListener("click", async () => {
    try {
      setStatus("Refreshing session with current settings...");
      await createOrResumeSession(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to refresh the session.", "error");
    }
  });

  voiceBtn?.addEventListener("click", async () => {
    await startVoiceTutor();
  });

  voiceEndBtn?.addEventListener("click", () => {
    stopVoiceSession("ended", "Voice tutor session ended.");
  });

  homeworkBtn?.addEventListener("click", async () => {
    try {
      if (!activeSessionId) {
        setStatus("Preparing a session before generating homework...");
        await createOrResumeSession(true);
      }
      setStatus("Generating homework...");
      const payload = await apiRequest({
        path: `/student/tuition/chapters/${chapterId}/homework`,
        method: "POST",
        token,
        body: {
          sessionId: activeSessionId,
          responseLanguage: currentTeacherContext().explanationLanguage,
          speedMode: speedEl instanceof HTMLSelectElement ? speedEl.value : "NORMAL",
          difficultyMode: difficultyEl instanceof HTMLSelectElement ? difficultyEl.value : "MEDIUM",
        },
      });
      const homeworkId = payload?.homework?.id;
      if (!homeworkId) {
        throw new Error("Homework generation completed but no homework id was returned.");
      }
      window.location.href = resolveTuitionPagePath("tuition-homework", { homeworkId });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to generate homework.", "error");
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await sendTeacherMessage(inputEl instanceof HTMLTextAreaElement ? inputEl.value.trim() : "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send the tuition message.", "error");
    }
  });

  teachBtn?.addEventListener("click", async () => {
    try {
      const prompt =
        inputEl instanceof HTMLTextAreaElement && inputEl.value.trim()
          ? inputEl.value.trim()
          : `Teach me ${currentTeacherContext().topic || chapterContext?.chapter?.title || "this topic"} in ${currentTeacherContext().subject || chapterContext?.profile?.subjectName || "this subject"} like a real board teacher. Start with the title, explain the definition or core idea, write the main points step by step, solve one example, recap the idea, and ask me one practice question.`;
      await sendTeacherMessage(prompt, "Live board lesson generated for the current topic.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to start the live board lesson.", "error");
    }
  });

  window.addEventListener("beforeunload", () => {
    clearBoardLessonPlayback();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopVoiceSession("ended");
  });

  boardReplayBtn?.addEventListener("click", () => {
    if (!boardLesson.structured) {
      setBoardTeachingStatus("Ask a topic question first to create a board lesson.", "idle");
      return;
    }
    playBoardLesson(boardLesson.structured, boardLesson.session);
  });

  boardAutoplayBtn?.addEventListener("click", () => {
    if (!boardLesson.structured || !boardLesson.teachingSteps.length) return;
    boardLesson.autoplay = !boardLesson.autoplay;
    if (!boardLesson.autoplay) {
      clearBoardLessonPlayback();
      boardLesson.paused = false;
      setBoardTeachingStatus("Autoplay is off. Use Next Step to continue the lesson.", "idle");
      setBoardTeacherCue("Manual mode is active. Click Next Step to reveal the next teaching move.");
      setBoardControlState();
      return;
    }
    boardLesson.paused = false;
    setBoardTeachingStatus("Autoplay is on. The teacher will continue step by step.", "writing");
    setBoardTeacherCue("Autoplay has resumed for the live board lesson.");
    setBoardControlState();
    if (!boardLesson.paused && !boardLesson.completed) {
      queueNextTeachingStep(boardLesson.structured, boardLesson.session);
    }
  });

  boardPauseBtn?.addEventListener("click", () => {
    toggleBoardPause();
  });

  boardNextBtn?.addEventListener("click", () => {
    stepBoardForward();
  });

  boardReplayStepBtn?.addEventListener("click", () => {
    replayCurrentTeachingStep();
  });

  boardClearBtn?.addEventListener("click", () => {
    if (!boardLesson.structured) {
      setBoardTeachingStatus("Ask a topic question first to create a board lesson.", "idle");
      return;
    }
    clearBoardView();
  });
});
