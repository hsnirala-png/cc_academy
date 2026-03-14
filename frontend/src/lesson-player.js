import {
  API_BASE,
  apiRequest,
  clearAuth,
  debugSyncLog,
  escapeHtml,
  initHeaderBehavior,
  isDebugSyncEnabled,
  requireRoleGuard,
  showConfirmDialog,
} from "./mock-api.js?v=2";

const SAVE_INTERVAL_MS = 10000;
const END_BUFFER_MS = 3000;
const TRANSCRIPT_MIN_SEGMENT_MS = 2500;
const TRANSCRIPT_APPROX_CHAR_MS = 35;

const parseTimecode = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/(?:(\d+):)?(\d{2}):(\d{2})(?:[.,](\d{1,3}))?/);
  if (!match) return NaN;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const millis = Number((match[4] || "0").padEnd(3, "0"));
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
};

const parseVttSegments = (rawText) => {
  const text = String(rawText || "").replace(/\r/g, "");
  const blocks = text.split("\n\n");
  const segments = [];

  blocks.forEach((block) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;

    const timelineLine = lines.find((line) => line.includes("-->"));
    if (!timelineLine) return;

    const [startRaw, endRaw] = timelineLine.split("-->").map((item) => item.trim());
    const start = parseTimecode(startRaw);
    const end = parseTimecode(endRaw);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;

    const timeLineIndex = lines.findIndex((line) => line === timelineLine);
    const segmentText = lines.slice(timeLineIndex + 1).join(" ").trim();
    if (!segmentText) return;

    segments.push({
      startMs: Math.round(start * 1000),
      endMs: Math.round(end * 1000),
      text: segmentText,
    });
  });

  return segments.sort((a, b) => a.startMs - b.startMs);
};

const parseJsonSegments = (payload) => {
  let sourcePayload = payload;
  if (typeof sourcePayload === "string") {
    try {
      sourcePayload = JSON.parse(sourcePayload);
    } catch {
      return [];
    }
  }

  const source = Array.isArray(sourcePayload)
    ? sourcePayload
    : Array.isArray(sourcePayload?.segments)
      ? sourcePayload.segments
      : [];

  const normalized = source
    .map((item) => ({
      start: Number(item?.startMs ?? item?.start ?? item?.from ?? 0),
      end: Number(item?.endMs ?? item?.end ?? item?.to ?? 0),
      text: String(item?.text ?? "").trim(),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.start) &&
        Number.isFinite(item.end) &&
        item.start >= 0 &&
        item.end > item.start &&
        item.text
    )
    .sort((a, b) => a.start - b.start);

  if (!normalized.length) return [];

  const maxEnd = Math.max(...normalized.map((item) => item.end));
  const treatAsSeconds = maxEnd <= 1000;

  return normalized
    .map((item) => ({
      startMs: Math.round(treatAsSeconds ? item.start * 1000 : item.start),
      endMs: Math.round(treatAsSeconds ? item.end * 1000 : item.end),
      text: item.text,
    }))
    .filter((item) => item.endMs > item.startMs);
};

const buildTextTranscriptSegments = (transcriptText) => {
  const normalized = String(transcriptText || "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const parts = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const blocks = parts.length ? parts : [normalized];
  const totalChars = Math.max(1, normalized.length);
  const estimatedTotalMs = Math.max(
    blocks.length * TRANSCRIPT_MIN_SEGMENT_MS,
    totalChars * TRANSCRIPT_APPROX_CHAR_MS
  );

  let cursorMs = 0;
  return blocks.map((block, index) => {
    const ratio = Math.max(0.08, block.length / totalChars);
    const remainingBlocks = blocks.length - index;
    const remainingMs = Math.max(TRANSCRIPT_MIN_SEGMENT_MS, estimatedTotalMs - cursorMs);
    const estimatedMs = Math.max(
      TRANSCRIPT_MIN_SEGMENT_MS,
      Math.round(estimatedTotalMs * ratio)
    );
    const allocatedMs =
      remainingBlocks === 1
        ? remainingMs
        : Math.min(remainingMs - TRANSCRIPT_MIN_SEGMENT_MS * (remainingBlocks - 1), estimatedMs);
    const startMs = cursorMs;
    const endMs = startMs + Math.max(TRANSCRIPT_MIN_SEGMENT_MS, allocatedMs);
    cursorMs = endMs;
    return {
      startMs,
      endMs,
      text: block,
    };
  });
};

const buildAssetUrlCandidates = (input) => {
  const raw = String(input || "").trim();
  if (!raw) return [];
  if (raw.startsWith("http://") || raw.startsWith("https://")) return [raw];

  const sameOrigin = window.location.origin || "";
  if (raw.startsWith("/public/")) {
    const rootPath = `/${raw.replace(/^\/public\/+/, "")}`;
    const sameOriginUrl = sameOrigin ? `${sameOrigin}${raw}` : "";
    const apiUrl = API_BASE ? `${API_BASE}${raw}` : sameOriginUrl;
    const sameOriginRootUrl = sameOrigin ? `${sameOrigin}${rootPath}` : "";
    const apiRootUrl = API_BASE ? `${API_BASE}${rootPath}` : sameOriginRootUrl;
    return Array.from(
      new Set([sameOriginUrl, apiUrl, sameOriginRootUrl, apiRootUrl].filter(Boolean))
    );
  }

  if (raw.startsWith("/")) {
    const apiUrl = API_BASE ? `${API_BASE}${raw}` : "";
    const sameOriginUrl = sameOrigin ? `${sameOrigin}${raw}` : "";
    return Array.from(new Set([apiUrl, sameOriginUrl].filter(Boolean)));
  }

  const relative = raw.replace(/^\.\//, "");
  const apiUrl = API_BASE ? `${API_BASE}/${relative}` : "";
  const sameOriginUrl = sameOrigin ? `${sameOrigin}/${relative}` : "";
  return Array.from(new Set([apiUrl, sameOriginUrl].filter(Boolean)));
};

const getQueryParam = (key) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || "";
};

const getQueryNonNegativeInt = (key) => {
  const value = Number(getQueryParam(key));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
};

const detectPreferredLessonLanguage = (value) => {
  const text = String(value || "").trim();
  if (!text) return "English";
  if (/[\u0A00-\u0A7F]/.test(text)) return "Punjabi";
  if (/[\u0900-\u097F]/.test(text)) return "Hindi";
  return "English";
};

const isExtensionlessRoute = () => {
  const pathname = (window.location.pathname || "").toLowerCase();
  return Boolean(pathname) && !pathname.endsWith(".html") && pathname !== "/";
};

const getPagePath = (name) => (isExtensionlessRoute() ? `./${name}` : `./${name}.html`);

const buildLessonLink = (lessonId, chapterId) => {
  if (!lessonId) return getPagePath("lessons");
  const params = new URLSearchParams();
  params.set("lessonId", lessonId);
  if (chapterId) params.set("chapterId", chapterId);
  return `${getPagePath("lesson-player")}?${params.toString()}`;
};

const buildOverviewLink = (chapterId, role = "STUDENT") => {
  if (String(role || "").toUpperCase() === "ADMIN") {
    return getPagePath("admin-lessons");
  }
  return getPagePath("dashboard");
};

const lessonHasTranscriptFlow = (lesson) =>
  Boolean(
    String(lesson?.transcriptUrl || "").trim() ||
      String(lesson?.transcriptText || "").trim() ||
      String(lesson?.audioUrl || "").trim() ||
      String(lesson?.videoUrl || "").trim() ||
      (Array.isArray(lesson?.transcriptSegments) && lesson.transcriptSegments.length)
  );

const normalizeScrollSpeed = (value) => {
  const next = String(value || "").trim().toLowerCase();
  if (
    next === "extra-slow" ||
    next === "super-slow" ||
    next === "slow" ||
    next === "fast" ||
    next === "super-fast"
  ) {
    return next;
  }
  return "normal";
};

const getScrollSpeedMultiplier = (value) => {
  const speed = normalizeScrollSpeed(value);
  if (speed === "extra-slow") return 0.68;
  if (speed === "super-slow") return 0.82;
  if (speed === "slow") return 0.92;
  if (speed === "fast") return 1.16;
  if (speed === "super-fast") return 1.34;
  return 1;
};

const getScrollResponseRate = (value) => {
  const speed = normalizeScrollSpeed(value);
  if (speed === "extra-slow") return 2.4;
  if (speed === "super-slow") return 3.2;
  if (speed === "slow") return 4.1;
  if (speed === "fast") return 7.2;
  if (speed === "super-fast") return 9.4;
  return 5.5;
};

const configureMediaSource = (mediaEl, candidates, options = {}) => {
  if (!(mediaEl instanceof HTMLMediaElement)) return;
  const { onFinalError } = options;
  const urls = Array.from(new Set((candidates || []).filter(Boolean)));
  const fallbackStateKey = "__ccFallbackState";
  const previousState = mediaEl[fallbackStateKey];
  if (previousState?.onError) {
    mediaEl.removeEventListener("error", previousState.onError);
  }

  if (!urls.length) {
    mediaEl.removeAttribute("src");
    mediaEl.load();
    mediaEl[fallbackStateKey] = null;
    return;
  }

  const state = {
    index: 0,
    onError: null,
  };

  const applyCurrent = () => {
    mediaEl.src = urls[state.index];
    mediaEl.load();
  };

  state.onError = () => {
    if (state.index + 1 < urls.length) {
      state.index += 1;
      applyCurrent();
      return;
    }
    if (typeof onFinalError === "function") {
      onFinalError();
    }
  };

  mediaEl.addEventListener("error", state.onError);
  mediaEl[fallbackStateKey] = state;
  applyCurrent();
};

const startAssessmentAttempt = async (
  token,
  mockTestId,
  {
    lessonStartMs = 0,
    autoplay = false,
    existingAttemptId = "",
    attemptQuestionIndex = null,
  } = {}
) => {
  let attemptId = String(existingAttemptId || "").trim();
  if (!attemptId) {
    const response = await apiRequest({
      path: "/student/attempts",
      method: "POST",
      token,
      body: { mockTestId },
    });
    attemptId = String(response?.attempt?.id || "").trim();
  }
  if (!attemptId) {
    throw new Error("Unable to start assessment.");
  }

  const params = new URLSearchParams();
  params.set("attemptId", String(attemptId));
  const normalizedQuestionIndex = Number(attemptQuestionIndex);
  if (Number.isFinite(normalizedQuestionIndex) && normalizedQuestionIndex >= 0) {
    params.set("attemptQuestionIndex", String(Math.floor(normalizedQuestionIndex)));
  }
  const safeStartMs = Math.max(0, Math.round(Number(lessonStartMs || 0)));
  if (safeStartMs > 0) {
    params.set("lessonStartMs", String(safeStartMs));
  }
  if (autoplay) {
    params.set("autoplay", "1");
  }
  window.location.href = `${getPagePath("mock-attempt")}?${params.toString()}`;
};

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard(["STUDENT", "ADMIN"]);
  if (!auth) return;
  const { token, user } = auth;
  initHeaderBehavior();

  const logoutBtn = document.querySelector("#logoutBtn");
  const lessonTitleEl = document.querySelector("#lessonTitle");
  const lessonMetaEl = document.querySelector("#lessonMeta");
  const playerStatusEl = document.querySelector("#playerStatus");
  const videoEl = document.querySelector("#lessonVideo");
  const audioEl = document.querySelector("#audioPlayer");
  const btnModeVideo = document.querySelector("#btnModeVideo");
  const btnModeAudio = document.querySelector("#btnModeAudio");
  const transcriptListEl = document.querySelector("#transcriptList");
  const transcriptScrollSpeedInput = document.querySelector("#transcriptScrollSpeed");
  const progressInfoEl = document.querySelector("#progressInfo");
  const startAssessmentBtn = document.querySelector("#startAssessmentBtn");
  const lessonAiCardEl = document.querySelector(".lesson-ai-card");
  const lessonAiStatusEl = document.querySelector("#lessonAiStatus");
  const lessonAiLanguageSelect = document.querySelector("#lessonAiLanguageSelect");
  const lessonAiMessagesEl = document.querySelector("#lessonAiMessages");
  const lessonAiForm = document.querySelector("#lessonAiForm");
  const lessonAiInput = document.querySelector("#lessonAiInput");
  const lessonAiSendBtn = document.querySelector("#lessonAiSendBtn");
  const lessonAiSelectionHintEl = document.querySelector("#lessonAiSelectionHint");
  const lessonAiKeyExamPointsBtn = document.querySelector("#lessonAiKeyExamPointsBtn");
  const lessonAiAskMcqsBtn = document.querySelector("#lessonAiAskMcqsBtn");
  const lessonAiExplainSelectionBtn = document.querySelector("#lessonAiExplainSelectionBtn");
  const lessonAiVoiceStartBtn = document.querySelector("#lessonAiVoiceStartBtn");
  const lessonAiVoiceStopBtn = document.querySelector("#lessonAiVoiceStopBtn");
  const lessonAiVoiceStateEl = document.querySelector("#lessonAiVoiceState");
  const lessonAiVoiceOutputEl = document.querySelector("#lessonAiVoiceOutput");
  const lessonAiMcqModalEl = document.querySelector("#lessonAiMcqModal");
  const lessonAiMcqTitleEl = document.querySelector("#lessonAiMcqTitle");
  const lessonAiMcqProgressEl = document.querySelector("#lessonAiMcqProgress");
  const lessonAiMcqStatusEl = document.querySelector("#lessonAiMcqStatus");
  const lessonAiMcqQuestionEl = document.querySelector("#lessonAiMcqQuestion");
  const lessonAiMcqOptionsEl = document.querySelector("#lessonAiMcqOptions");
  const lessonAiMcqResultEl = document.querySelector("#lessonAiMcqResult");
  const lessonAiMcqNextBtn = document.querySelector("#lessonAiMcqNextBtn");
  const lessonAiMcqDoneBtn = document.querySelector("#lessonAiMcqDoneBtn");
  const lessonAiMcqCloseBtn = document.querySelector("#lessonAiMcqCloseBtn");

  const state = {
    lessonId: getQueryParam("lessonId"),
    chapterId: getQueryParam("chapterId"),
    returnAttemptId: getQueryParam("attemptId"),
    returnAttemptQuestionIndex:
      getQueryNonNegativeInt("attemptQuestionIndex") ?? getQueryNonNegativeInt("questionIndex"),
    lesson: null,
    completionThresholdSec: 0,
    transcriptSegments: [],
    transcriptRawText: "",
    activeTranscriptIndex: -1,
    lastSavedPositionMs: 0,
    hasVideo: false,
    hasAudio: false,
    currentMode: "video",
    isCompleted: false,
    saveTimer: null,
    saveInFlight: false,
    syncRafId: 0,
    syncPlayer: null,
    lastSyncLogAt: 0,
    lastSyncLogKey: "",
    scrollSpeed: "normal",
    lastTranscriptScrollAt: 0,
    transcriptScrollVirtual: 0,
    autoPlayRequested: /^(1|true|yes)$/i.test(getQueryParam("autoplay")),
    autoPlayAttempted: false,
    assessmentLaunchInFlight: false,
    aiConversationId: "",
    aiMessages: [],
    aiSelectedText: "",
    aiBusy: false,
    aiHasTranscript: false,
    aiUnavailable: false,
    aiEnabled: String(user?.role || "").trim().toUpperCase() === "STUDENT",
    aiLessonLanguage: "English",
    aiOpenQuestionId: "",
    aiHistoryInitialized: false,
    aiMcqSet: null,
    aiMcqCurrentIndex: 0,
    aiMcqAnswers: {},
    aiMcqCompleted: false,
    aiVoiceState: "idle",
    aiVoiceStatusText: "Voice: idle",
    aiVoiceSessionBusy: false,
    aiVoiceSessionActive: false,
    aiVoicePeerConnection: null,
    aiVoiceDataChannel: null,
    aiVoiceLocalStream: null,
    aiVoiceRemoteStream: null,
    aiVoiceStopRequested: false,
  };

  if (!state.aiEnabled && lessonAiCardEl instanceof HTMLElement) {
    lessonAiCardEl.classList.add("hidden");
  }

  const setStatus = (text, type) => {
    if (!playerStatusEl) return;
    playerStatusEl.textContent = text || "";
    playerStatusEl.classList.remove("error", "success");
    if (type) playerStatusEl.classList.add(type);
  };

  const setAiStatus = (text, type) => {
    if (!(lessonAiStatusEl instanceof HTMLElement)) return;
    lessonAiStatusEl.textContent = text || "";
    lessonAiStatusEl.classList.remove("error", "success");
    if (type) lessonAiStatusEl.classList.add(type);
  };

  const browserSupportsVoiceTutor = () =>
    typeof window.RTCPeerConnection === "function" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window.fetch === "function";

  const canUseTextAi = () =>
    state.aiEnabled &&
    !state.aiUnavailable &&
    state.aiHasTranscript &&
    Boolean(String(state.aiConversationId || "").trim());

  const canUseVoiceTutor = () =>
    state.aiEnabled &&
    state.aiHasTranscript &&
    browserSupportsVoiceTutor();

  const renderAiVoiceState = () => {
    if (lessonAiVoiceStateEl instanceof HTMLElement) {
      lessonAiVoiceStateEl.textContent = state.aiVoiceStatusText || "Voice: idle";
      lessonAiVoiceStateEl.className = `lesson-ai-voice-state is-${state.aiVoiceState}`;
    }

    if (lessonAiVoiceStartBtn instanceof HTMLButtonElement) {
      lessonAiVoiceStartBtn.disabled =
        state.aiBusy ||
        state.aiVoiceSessionBusy ||
        state.aiVoiceSessionActive ||
        !canUseVoiceTutor();
    }

    if (lessonAiVoiceStopBtn instanceof HTMLButtonElement) {
      const canStopVoiceTutor = state.aiVoiceSessionBusy || state.aiVoiceSessionActive;
      lessonAiVoiceStopBtn.disabled = !canStopVoiceTutor;
    }
  };

  const setAiVoiceState = (nextState, text) => {
    state.aiVoiceState = String(nextState || "idle").trim() || "idle";
    state.aiVoiceStatusText = String(text || "").trim() || `Voice: ${state.aiVoiceState}`;
    renderAiVoiceState();
  };

  const getAiResponseLanguage = () => {
    const selectedLanguage =
      lessonAiLanguageSelect instanceof HTMLSelectElement
        ? String(lessonAiLanguageSelect.value || "").trim()
        : "";
    if (selectedLanguage === "Punjabi" || selectedLanguage === "Hindi" || selectedLanguage === "English") {
      return selectedLanguage;
    }
    return state.aiLessonLanguage || "English";
  };

  const scrollAiMessagesToEnd = () => {
    if (!(lessonAiMessagesEl instanceof HTMLElement)) return;
    lessonAiMessagesEl.scrollTop = lessonAiMessagesEl.scrollHeight;
  };

  const formatAiMessageTimestamp = (value) => {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const buildAiConversationThreads = (messages) => {
    const threads = [];
    let currentThread = null;

    messages.forEach((message) => {
      const role = String(message?.role || "").trim().toUpperCase();
      if (role === "USER") {
        currentThread = {
          id: String(message?.id || "").trim() || `question_${threads.length + 1}`,
          question: String(message?.content || "").trim(),
          createdAt: String(message?.createdAt || "").trim(),
          answers: [],
        };
        threads.push(currentThread);
        return;
      }

      if (role === "ASSISTANT" && currentThread) {
        currentThread.answers.push({
          id: String(message?.id || "").trim(),
          content: String(message?.content || "").trim(),
          createdAt: String(message?.createdAt || "").trim(),
        });
      }
    });

    return threads.filter((thread) => thread.question);
  };

  const getLatestAiQuestionId = (messages) => {
    const threads = buildAiConversationThreads(Array.isArray(messages) ? messages : []);
    return threads[threads.length - 1]?.id || "";
  };

  const renderAiMessages = ({
    autoScroll = false,
    focusThreadId = "",
  } = {}) => {
    if (!(lessonAiMessagesEl instanceof HTMLElement)) return;
    const previousScrollTop = lessonAiMessagesEl.scrollTop;
    const messages = Array.isArray(state.aiMessages) ? state.aiMessages : [];
    if (!messages.length) {
      lessonAiMessagesEl.innerHTML =
        '<p class="lesson-ai-empty">Ask a lesson doubt, revise key exam points, generate 3 grounded MCQs, or explain a selected transcript part.</p>';
      return;
    }

    const threads = buildAiConversationThreads(messages);
    if (!threads.length) {
      lessonAiMessagesEl.innerHTML =
        '<p class="lesson-ai-empty">Your lesson questions will appear here with their AI answers.</p>';
      return;
    }

    if (!state.aiHistoryInitialized) {
      state.aiOpenQuestionId = threads[threads.length - 1]?.id || "";
      state.aiHistoryInitialized = true;
    } else if (
      state.aiOpenQuestionId &&
      !threads.some((thread) => thread.id === state.aiOpenQuestionId)
    ) {
      state.aiOpenQuestionId = "";
    }

    lessonAiMessagesEl.innerHTML = threads
      .map((thread, index) => {
        const isOpen = thread.id === state.aiOpenQuestionId;
        const answerBlocks = thread.answers.length
          ? thread.answers
              .map((answer) => {
                const answerTime = formatAiMessageTimestamp(answer.createdAt);
                const answerHeader = answerTime ? `AI Teacher | ${answerTime}` : "AI Teacher";
                return `
                  <div class="lesson-ai-thread-answer-block">
                    <span class="lesson-ai-thread-answer-role">${escapeHtml(answerHeader)}</span>
                    <div class="lesson-ai-thread-answer">${escapeHtml(answer.content)}</div>
                  </div>
                `;
              })
              .join("")
          : '<p class="lesson-ai-thread-pending">AI Teacher answer is being prepared.</p>';

        return `
          <div class="lesson-ai-thread ${isOpen ? "is-open" : ""}">
            <div
              class="lesson-ai-thread-toggle"
              role="button"
              tabindex="0"
              data-thread-id="${escapeHtml(thread.id)}"
              aria-expanded="${isOpen ? "true" : "false"}"
            >
              <span class="lesson-ai-thread-order">Q${index + 1}</span>
              <span class="lesson-ai-thread-main">
                <span class="lesson-ai-thread-question">${escapeHtml(thread.question)}</span>
                <span class="lesson-ai-thread-time">${escapeHtml(formatAiMessageTimestamp(thread.createdAt) || "Just now")}</span>
              </span>
              <span class="lesson-ai-thread-chevron" aria-hidden="true">${isOpen ? "-" : "+"}</span>
            </div>
            <div class="lesson-ai-thread-answer-wrap ${isOpen ? "" : "hidden"}">
              ${answerBlocks}
            </div>
          </div>
        `;
      })
      .join("");

    lessonAiMessagesEl.querySelectorAll('.lesson-ai-thread-toggle').forEach((toggle) => {
      const handleToggle = () => {
        const threadId = String(toggle.getAttribute('data-thread-id') || '').trim();
        const nextThreadId = state.aiOpenQuestionId === threadId ? '' : threadId;
        state.aiOpenQuestionId = nextThreadId;
        renderAiMessages({
          autoScroll: false,
          focusThreadId: nextThreadId,
        });
      };
      toggle.addEventListener('click', handleToggle);
      toggle.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleToggle();
        }
      });
    });

    if (autoScroll) {
      scrollAiMessagesToEnd();
      return;
    }

    lessonAiMessagesEl.scrollTop = previousScrollTop;
    if (focusThreadId) {
      const focusedThread = lessonAiMessagesEl.querySelector(
        `.lesson-ai-thread-toggle[data-thread-id="${CSS.escape(focusThreadId)}"]`
      );
      if (focusedThread instanceof HTMLElement) {
        focusedThread.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  };
  const renderAiSelection = () => {
    const canUseAi =
      state.aiEnabled &&
      !state.aiUnavailable &&
      state.aiHasTranscript &&
      Boolean(String(state.aiConversationId || "").trim());
    if (lessonAiExplainSelectionBtn instanceof HTMLButtonElement) {
      lessonAiExplainSelectionBtn.disabled =
        state.aiBusy || !canUseAi || !String(state.aiSelectedText || "").trim();
    }
    if (!(lessonAiSelectionHintEl instanceof HTMLElement)) return;
    const selectedText = String(state.aiSelectedText || "").trim();
    if (!state.aiEnabled) {
      lessonAiSelectionHintEl.classList.remove("is-active");
      lessonAiSelectionHintEl.textContent = "";
      return;
    }
    if (state.aiUnavailable) {
      lessonAiSelectionHintEl.classList.remove("is-active");
      lessonAiSelectionHintEl.textContent = "Text AI Teacher is unavailable for this lesson right now.";
      return;
    }
    if (!state.aiHasTranscript) {
      lessonAiSelectionHintEl.classList.remove("is-active");
      lessonAiSelectionHintEl.textContent = "Transcript is required before AI Teacher can explain this lesson.";
      return;
    }
    if (!selectedText) {
      lessonAiSelectionHintEl.classList.remove("is-active");
      lessonAiSelectionHintEl.textContent = "Select transcript text to enable paragraph explanation.";
      return;
    }
    const selectedWords = selectedText.split(/\s+/).filter(Boolean).length;
    lessonAiSelectionHintEl.classList.add("is-active");
    if (selectedText.length < 20 || selectedWords < 4) {
      lessonAiSelectionHintEl.textContent =
        "Selected text looks short. AI Teacher may ask you to select a clearer sentence or ask for a general explanation.";
      return;
    }
    lessonAiSelectionHintEl.textContent = `Selected: ${selectedText.slice(0, 220)}${selectedText.length > 220 ? "..." : ""}`;
  };

  const setAiBusy = (busy) => {
    state.aiBusy = Boolean(busy);
    const canUseAi = canUseTextAi();
    const canUseAnyAi = state.aiEnabled && state.aiHasTranscript;
    if (lessonAiInput instanceof HTMLTextAreaElement) {
      lessonAiInput.disabled = state.aiBusy || !canUseAi;
    }
    if (lessonAiSendBtn instanceof HTMLButtonElement) {
      lessonAiSendBtn.disabled = state.aiBusy || !canUseAi;
    }
    if (lessonAiLanguageSelect instanceof HTMLSelectElement) {
      lessonAiLanguageSelect.disabled =
        state.aiBusy || !canUseAnyAi || state.aiVoiceSessionBusy || state.aiVoiceSessionActive;
    }
    [lessonAiKeyExamPointsBtn, lessonAiAskMcqsBtn].forEach((button) => {
      if (button instanceof HTMLButtonElement) {
        button.disabled = state.aiBusy || !canUseAi;
      }
    });
    renderAiSelection();
    renderAiVoiceState();
  };

  const isValidLessonAiMcqSet = (value) => {
    if (!value || typeof value !== "object") return false;
    const questions = Array.isArray(value.questions) ? value.questions : [];
    if (questions.length !== 3) return false;
    return questions.every((question) => {
      if (!question || typeof question !== "object") return false;
      if (!String(question.id || "").trim() || !String(question.question || "").trim()) return false;
      if (!["A", "B", "C", "D"].includes(String(question.correctAnswer || "").trim().toUpperCase())) return false;
      const options = Array.isArray(question.options) ? question.options : [];
      if (options.length !== 4) return false;
      const keys = options.map((option) => String(option?.key || "").trim().toUpperCase()).sort();
      return JSON.stringify(keys) === JSON.stringify(["A", "B", "C", "D"]);
    });
  };

  const canAdvanceLessonAiMcq = (selectedOption) =>
    ["A", "B", "C", "D"].includes(String(selectedOption || "").trim().toUpperCase());

  const getLessonAiMcqOptionText = (question, optionKey) => {
    if (!question || !optionKey) return null;
    const option = Array.isArray(question.options)
      ? question.options.find((item) => String(item?.key || "").trim().toUpperCase() === String(optionKey || "").trim().toUpperCase())
      : null;
    return String(option?.text || "").trim() || null;
  };

  const buildLessonAiMcqWrongFeedback = (question, selectedOption) => {
    const selectedText = getLessonAiMcqOptionText(question, selectedOption);
    const correctAnswer = String(question?.correctAnswer || "").trim().toUpperCase();
    const correctText = getLessonAiMcqOptionText(question, correctAnswer) || "the lesson-supported answer";
    const groundedExplanation = String(question?.explanation || "").trim();

    if (!selectedText) {
      if (groundedExplanation) {
        return `You did not choose the lesson-supported option. ${correctAnswer} is correct because ${groundedExplanation}`;
      }
      return `You did not choose the lesson-supported option. ${correctAnswer} is correct because it matches the current lesson context better.`;
    }

    if (groundedExplanation) {
      return `${selectedOption} is not correct because "${selectedText}" is not the lesson-supported point here. ${correctAnswer} is right because "${correctText}" matches the lesson, and ${groundedExplanation}`;
    }

    return `${selectedOption} is not correct because "${selectedText}" is not clearly supported by this lesson for this question. ${correctAnswer} is right because "${correctText}" matches the current lesson context better.`;
  };

  const buildLessonAiWeakAreaSummary = (items) => {
    const wrongItems = Array.isArray(items) ? items.filter((item) => !item?.isCorrect) : [];
    if (!wrongItems.length) {
      return "Weak Area: none identified in these 3 lesson MCQs. Keep revising the same lesson ideas to retain them.";
    }

    const revisionTargets = Array.from(
      new Set(
        wrongItems
          .map((item) => String(item?.correctOptionText || item?.explanation || "").trim())
          .filter(Boolean)
      )
    ).slice(0, 2);

    if (!revisionTargets.length) {
      return "Weak Area: revise the exact lesson point behind the wrong MCQs, because that concept was not secure yet.";
    }

    return `Weak Area: revise ${revisionTargets.join(" and ")}. These are the lesson points that need one more quick revision.`;
  };

  const evaluateLessonAiMcqSet = () => {
    const mcqSet = state.aiMcqSet;
    if (!isValidLessonAiMcqSet(mcqSet)) {
      return {
        score: 0,
        total: 0,
        items: [],
        weakAreaSummary: "",
      };
    }

    const items = mcqSet.questions.map((question) => {
      const selectedOption = String(state.aiMcqAnswers?.[question.id] || "").trim().toUpperCase() || null;
      const correctAnswer = String(question.correctAnswer || "").trim().toUpperCase();
      const correctOptionText = getLessonAiMcqOptionText(question, correctAnswer) || "the lesson-supported answer";
      return {
        questionId: question.id,
        question: question.question,
        selectedOption,
        selectedOptionText: getLessonAiMcqOptionText(question, selectedOption),
        correctAnswer,
        correctOptionText,
        isCorrect: selectedOption === correctAnswer,
        explanation: String(question.explanation || "").trim(),
        feedback:
          selectedOption === correctAnswer
            ? `Correct. ${correctAnswer} matches the lesson because "${correctOptionText}" is directly supported by the current lesson context.`
            : buildLessonAiMcqWrongFeedback(question, selectedOption),
      };
    });

    return {
      score: items.reduce((sum, item) => sum + (item.isCorrect ? 1 : 0), 0),
      total: items.length,
      items,
      weakAreaSummary: buildLessonAiWeakAreaSummary(items),
    };
  };

  const setLessonAiMcqStatus = (text, type) => {
    if (!(lessonAiMcqStatusEl instanceof HTMLElement)) return;
    lessonAiMcqStatusEl.textContent = text || "";
    lessonAiMcqStatusEl.classList.remove("error", "success");
    if (type) lessonAiMcqStatusEl.classList.add(type);
  };

  const closeLessonAiMcqModal = () => {
    if (!(lessonAiMcqModalEl instanceof HTMLElement)) return;
    lessonAiMcqModalEl.classList.remove("open");
    lessonAiMcqModalEl.setAttribute("aria-hidden", "true");
  };

  const renderLessonAiMcqResult = () => {
    if (!(lessonAiMcqResultEl instanceof HTMLElement)) return;
    const result = evaluateLessonAiMcqSet();
    if (!result.total) {
      lessonAiMcqResultEl.classList.add("hidden");
      lessonAiMcqResultEl.innerHTML = "";
      return;
    }

    lessonAiMcqResultEl.classList.remove("hidden");
    lessonAiMcqResultEl.innerHTML = [
      `<p class="lesson-ai-mcq-score">Score: ${result.score} / ${result.total}</p>`,
      result.weakAreaSummary
        ? `<div class="lesson-ai-mcq-weak-area"><strong>Weak Area</strong><p>${escapeHtml(result.weakAreaSummary)}</p></div>`
        : "",
      ...result.items.map((item, index) => {
        const feedback = !item.isCorrect && item.feedback ? `<p class="lesson-ai-mcq-feedback">${escapeHtml(item.feedback)}</p>` : "";
        return `
          <div class="lesson-ai-mcq-review-item ${item.isCorrect ? "is-correct" : "is-wrong"}">
            <strong>Q${index + 1}: ${item.isCorrect ? "Correct" : "Wrong"}</strong>
            <p>Your answer: ${escapeHtml(item.selectedOption || "-")}${item.selectedOptionText ? ` - ${escapeHtml(item.selectedOptionText)}` : ""}</p>
            <p>Correct answer: ${escapeHtml(item.correctAnswer)}${item.correctOptionText ? ` - ${escapeHtml(item.correctOptionText)}` : ""}</p>
            ${feedback}
          </div>
        `;
      }),
    ].join("");
  };

  const renderLessonAiMcqModal = () => {
    if (
      !(lessonAiMcqQuestionEl instanceof HTMLElement) ||
      !(lessonAiMcqOptionsEl instanceof HTMLElement) ||
      !(lessonAiMcqProgressEl instanceof HTMLElement) ||
      !(lessonAiMcqNextBtn instanceof HTMLButtonElement) ||
      !(lessonAiMcqDoneBtn instanceof HTMLButtonElement)
    ) {
      return;
    }

    const mcqSet = state.aiMcqSet;
    if (!isValidLessonAiMcqSet(mcqSet)) {
      setLessonAiMcqStatus("Unable to load grounded lesson MCQs right now.", "error");
      return;
    }

    const question = mcqSet.questions[state.aiMcqCurrentIndex];
    if (!question) return;

    if (lessonAiMcqTitleEl instanceof HTMLElement) {
      lessonAiMcqTitleEl.textContent = String(mcqSet.title || "3 Lesson MCQs");
    }
    lessonAiMcqProgressEl.textContent = `${state.aiMcqCurrentIndex + 1} / ${mcqSet.questions.length}`;
    lessonAiMcqQuestionEl.textContent = question.question;

    const selectedOption = String(state.aiMcqAnswers?.[question.id] || "").trim().toUpperCase();
    lessonAiMcqOptionsEl.innerHTML = question.options
      .map((option) => {
        const optionKey = String(option?.key || "").trim().toUpperCase();
        const isChecked = optionKey === selectedOption;
        return `
          <label class="lesson-ai-mcq-option ${isChecked ? "is-selected" : ""}">
            <input type="radio" name="lessonAiMcqOption" value="${escapeHtml(optionKey)}" ${isChecked ? "checked" : ""} />
            <span><strong>${escapeHtml(optionKey)}.</strong> ${escapeHtml(String(option?.text || "").trim())}</span>
          </label>
        `;
      })
      .join("");

    const attempted = canAdvanceLessonAiMcq(selectedOption);
    const isLast = state.aiMcqCurrentIndex === mcqSet.questions.length - 1;
    lessonAiMcqNextBtn.classList.toggle("hidden", isLast);
    lessonAiMcqNextBtn.disabled = !attempted;
    lessonAiMcqDoneBtn.classList.toggle("hidden", !isLast);
    lessonAiMcqDoneBtn.disabled = !attempted;
    lessonAiMcqOptionsEl.querySelectorAll('input[name="lessonAiMcqOption"]').forEach((input) => {
      input.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        state.aiMcqAnswers[question.id] = String(target.value || "").trim().toUpperCase();
        renderLessonAiMcqModal();
      });
    });

    if (lessonAiMcqResultEl instanceof HTMLElement && !state.aiMcqCompleted) {
      lessonAiMcqResultEl.classList.add("hidden");
      lessonAiMcqResultEl.innerHTML = "";
    }
  };

  const openLessonAiMcqModal = (mcqSet) => {
    if (!isValidLessonAiMcqSet(mcqSet) || !(lessonAiMcqModalEl instanceof HTMLElement)) {
      setAiStatus("Unable to open grounded lesson MCQs right now.", "error");
      return;
    }

    state.aiMcqSet = mcqSet;
    state.aiMcqCurrentIndex = 0;
    state.aiMcqAnswers = {};
    state.aiMcqCompleted = false;
    setLessonAiMcqStatus("");
    renderLessonAiMcqModal();
    lessonAiMcqModalEl.classList.add("open");
    lessonAiMcqModalEl.setAttribute("aria-hidden", "false");
  };

  const getTranscriptSelectionText = () => {
    if (!(transcriptListEl instanceof HTMLElement)) return "";
    const selection = window.getSelection();
    if (!selection || selection.rangeCount < 1) return "";
    const selectedText = String(selection.toString() || "").trim();
    if (!selectedText) return "";
    const range = selection.getRangeAt(0);
    const anchorNode =
      range.commonAncestorContainer instanceof Node && range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : range.commonAncestorContainer;
    if (!(anchorNode instanceof Node) || !transcriptListEl.contains(anchorNode)) return "";
    return selectedText;
  };

  const updateAiSelectionState = () => {
    state.aiSelectedText = getTranscriptSelectionText().slice(0, 3000);
    renderAiSelection();
  };

  const ensureAiConversation = async () => {
    if (!state.lessonId) return null;
    const payload = await apiRequest({
      path: `/student/ai/lesson/${encodeURIComponent(state.lessonId)}/conversations`,
      method: "POST",
      token,
    });
    state.aiConversationId = String(payload?.conversation?.id || "").trim();
    state.aiMessages = Array.isArray(payload?.conversation?.messages) ? payload.conversation.messages : [];
    if (!state.aiHistoryInitialized) {
      state.aiOpenQuestionId = getLatestAiQuestionId(state.aiMessages);
    } else if (
      state.aiOpenQuestionId &&
      !buildAiConversationThreads(state.aiMessages).some((thread) => thread.id === state.aiOpenQuestionId)
    ) {
      state.aiOpenQuestionId = "";
    }
    state.aiHasTranscript = Boolean(payload?.context?.hasTranscript);
    state.aiUnavailable = !state.aiConversationId;
    renderAiMessages({ autoScroll: true });
    if (!state.aiHasTranscript) {
      setAiStatus("AI Teacher needs transcript text for this lesson before it can answer safely.", "error");
    } else {
      setAiStatus("");
    }
    setAiBusy(false);
    return payload;
  };

  const sendAiMessage = async ({
    content,
    selectedText = "",
    requestType = "CHAT",
    responseLanguage = getAiResponseLanguage(),
  }) => {
    const message = String(content || "").trim();
    if (!message) {
      setAiStatus("Enter a message for AI Teacher.", "error");
      return;
    }

    if (!state.aiConversationId) {
      await ensureAiConversation();
    }
    if (!state.aiConversationId) {
      throw new Error("AI conversation is unavailable for this lesson.");
    }

    setAiBusy(true);
    setAiStatus("AI Teacher is preparing a grounded reply...");
    try {
      const payload = await apiRequest({
        path: `/student/ai/lesson/${encodeURIComponent(state.lessonId)}/conversations/${encodeURIComponent(
          state.aiConversationId
        )}/messages`,
        method: "POST",
        token,
        body: {
          content: message,
          selectedText: String(selectedText || "").trim() || undefined,
          requestType,
          responseLanguage,
        },
      });
      state.aiMessages = Array.isArray(payload?.conversation?.messages) ? payload.conversation.messages : [];
      state.aiOpenQuestionId = getLatestAiQuestionId(state.aiMessages);
      state.aiUnavailable = false;
      renderAiMessages({ autoScroll: true });
      if (requestType === "ASK_3_MCQS") {
        if (isValidLessonAiMcqSet(payload?.mcqSet)) {
          openLessonAiMcqModal(payload.mcqSet);
        } else {
          setAiStatus("Unable to generate grounded lesson MCQs right now.", "error");
        }
      }
      if (!payload?.context?.hasTranscript) {
        setAiStatus("This lesson does not have enough transcript context for AI explanation.", "error");
      } else if (requestType !== "ASK_3_MCQS" || isValidLessonAiMcqSet(payload?.mcqSet)) {
        setAiStatus("");
      }
    } catch (error) {
      if (error?.status === 401) {
        clearAuth();
        window.location.href = "./index.html";
        return;
      }
      if (Number(error?.status || 0) >= 500) {
        state.aiUnavailable = true;
      }
      const messageText = error instanceof Error ? error.message : "Unable to contact AI Teacher.";
      setAiStatus(messageText, "error");
    } finally {
      setAiBusy(false);
    }
  };

  const cleanupAiVoiceSession = () => {
    const dataChannel = state.aiVoiceDataChannel;
    if (dataChannel && typeof dataChannel.close === "function") {
      try {
        dataChannel.close();
      } catch {
        // Ignore close failures during cleanup.
      }
    }

    const peerConnection = state.aiVoicePeerConnection;
    if (peerConnection && typeof peerConnection.close === "function") {
      try {
        peerConnection.ontrack = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.close();
      } catch {
        // Ignore close failures during cleanup.
      }
    }

    const localStream = state.aiVoiceLocalStream;
    if (localStream instanceof MediaStream) {
      localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore stop failures during cleanup.
        }
      });
    }

    const remoteStream = state.aiVoiceRemoteStream;
    if (remoteStream instanceof MediaStream) {
      remoteStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore stop failures during cleanup.
        }
      });
    }

    if (lessonAiVoiceOutputEl instanceof HTMLAudioElement) {
      lessonAiVoiceOutputEl.pause();
      lessonAiVoiceOutputEl.srcObject = null;
    }

    state.aiVoiceDataChannel = null;
    state.aiVoicePeerConnection = null;
    state.aiVoiceLocalStream = null;
    state.aiVoiceRemoteStream = null;
    state.aiVoiceSessionActive = false;
    state.aiVoiceSessionBusy = false;
  };

  const stopAiVoiceTutor = ({ message = "Voice tutor session ended.", nextState = "ended" } = {}) => {
    state.aiVoiceStopRequested = true;
    cleanupAiVoiceSession();
    setAiVoiceState(nextState, message);
  };

  const handleAiVoiceRealtimeEvent = (payload) => {
    const eventType = String(payload?.type || "").trim();
    if (!eventType) return;

    if (eventType === "input_audio_buffer.speech_started") {
      setAiVoiceState("listening", "Voice: listening...");
      return;
    }

    if (eventType === "output_audio_buffer.started" || eventType === "response.output_audio.delta") {
      setAiVoiceState("speaking", "Voice: AI Teacher is speaking...");
      return;
    }

    if (eventType === "output_audio_buffer.stopped" || eventType === "response.done") {
      if (state.aiVoiceSessionActive) {
        setAiVoiceState("listening", "Voice: listening for your next question...");
      }
      return;
    }

    if (eventType === "error") {
      const message =
        String(payload?.error?.message || "").trim() ||
        "Voice tutor encountered an error. Please try again later.";
      setAiStatus(message, "error");
      stopAiVoiceTutor({
        message: "Voice: error",
        nextState: "error",
      });
    }
  };

  const startAiVoiceTutor = async () => {
    if (!state.lessonId) return;
    if (!browserSupportsVoiceTutor()) {
      setAiVoiceState("error", "Voice: unsupported in this browser");
      setAiStatus("This browser does not support live voice tutor.", "error");
      return;
    }
    if (!state.aiHasTranscript) {
      setAiVoiceState("error", "Voice: transcript required");
      setAiStatus("Voice tutor needs transcript text for this lesson before it can start.", "error");
      return;
    }
    if (state.aiVoiceSessionBusy || state.aiVoiceSessionActive) {
      return;
    }

    state.aiVoiceSessionBusy = true;
    state.aiVoiceStopRequested = false;
    setAiVoiceState("connecting", "Voice: connecting...");
    setAiStatus("Starting voice tutor...");
    renderAiVoiceState();

    try {
      const sessionPayload = await apiRequest({
        path: `/student/ai/lesson/${encodeURIComponent(state.lessonId)}/voice-session`,
        method: "POST",
        token,
        body: {
          responseLanguage: getAiResponseLanguage(),
        },
      });

      const clientSecret = String(sessionPayload?.clientSecret || "").trim();
      if (!clientSecret) {
        throw new Error("Voice tutor session could not be started.");
      }

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const peerConnection = new RTCPeerConnection();
      const remoteStream = new MediaStream();
      const dataChannel = peerConnection.createDataChannel("oai-events");

      state.aiVoiceLocalStream = localStream;
      state.aiVoicePeerConnection = peerConnection;
      state.aiVoiceRemoteStream = remoteStream;
      state.aiVoiceDataChannel = dataChannel;

      if (lessonAiVoiceOutputEl instanceof HTMLAudioElement) {
        lessonAiVoiceOutputEl.srcObject = remoteStream;
      }

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        const inboundStream =
          event.streams?.[0] instanceof MediaStream ? event.streams[0] : null;
        if (inboundStream) {
          inboundStream.getTracks().forEach((track) => {
            remoteStream.addTrack(track);
          });
        } else if (event.track) {
          remoteStream.addTrack(event.track);
        }

        if (lessonAiVoiceOutputEl instanceof HTMLAudioElement) {
          lessonAiVoiceOutputEl.srcObject = remoteStream;
          lessonAiVoiceOutputEl.play().catch(() => {});
        }
      };

      peerConnection.onconnectionstatechange = () => {
        const connectionState = String(peerConnection.connectionState || "").trim().toLowerCase();
        if (connectionState === "failed" || connectionState === "disconnected" || connectionState === "closed") {
          if (!state.aiVoiceStopRequested) {
            setAiStatus("Voice tutor connection ended.", "error");
            stopAiVoiceTutor({
              message: connectionState === "closed" ? "Voice: ended" : "Voice: connection ended",
              nextState: connectionState === "closed" ? "ended" : "error",
            });
          }
        }
      };

      dataChannel.addEventListener("open", () => {
        state.aiVoiceSessionActive = true;
        state.aiVoiceSessionBusy = false;
        setAiVoiceState("listening", "Voice: listening...");
        setAiStatus("Voice tutor is live. Ask about the current lesson.", "success");
      });

      dataChannel.addEventListener("close", () => {
        if (!state.aiVoiceStopRequested) {
          stopAiVoiceTutor({
            message: "Voice: ended",
            nextState: "ended",
          });
        }
      });

      dataChannel.addEventListener("error", () => {
        setAiStatus("Voice tutor connection failed.", "error");
        stopAiVoiceTutor({
          message: "Voice: error",
          nextState: "error",
        });
      });

      dataChannel.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(String(event.data || "{}"));
          handleAiVoiceRealtimeEvent(payload);
        } catch {
          // Ignore non-JSON realtime events.
        }
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const response = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: String(offer.sdp || ""),
      });

      if (!response.ok) {
        throw new Error("Unable to connect to voice tutor right now.");
      }

      const answerSdp = await response.text();
      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });
    } catch (error) {
      if (error?.status === 401) {
        clearAuth();
        window.location.href = "./index.html";
        return;
      }
      state.aiVoiceStopRequested = true;
      cleanupAiVoiceSession();
      const name = String(error?.name || "").trim();
      const message =
        name === "NotAllowedError"
          ? "Microphone access was denied. Allow microphone permission to use voice tutor."
          : error instanceof Error
            ? error.message
            : "Unable to start voice tutor right now.";
      setAiVoiceState("error", "Voice: error");
      setAiStatus(message, "error");
    } finally {
      state.aiVoiceSessionBusy = false;
      renderAiVoiceState();
    }
  };

  setAiBusy(false);
  setAiVoiceState("idle", "Voice: idle");

  const getActivePlayer = () => {
    if (state.currentMode === "audio" && state.hasAudio && audioEl instanceof HTMLAudioElement) {
      return audioEl;
    }
    if (state.hasVideo && videoEl instanceof HTMLVideoElement) return videoEl;
    if (state.hasAudio && audioEl instanceof HTMLAudioElement) return audioEl;
    return null;
  };

  const getPlayerCurrentMs = (player = getActivePlayer()) => {
    if (!player) return 0;
    return Math.max(0, Math.floor(Number(player.currentTime || 0) * 1000));
  };

  const getPlayerDurationMs = (player) => {
    if (!player) return 0;
    const duration = Number(player.duration || 0);
    return Number.isFinite(duration) && duration > 0 ? Math.round(duration * 1000) : 0;
  };

  const getActiveDurationMs = () => {
    if (state.currentMode === "audio" && Number(state.lesson?.audioDurationMs || 0) > 0) {
      return Math.round(Number(state.lesson.audioDurationMs));
    }

    const fromPlayer = getPlayerDurationMs(getActivePlayer());
    if (fromPlayer > 0) return fromPlayer;

    if (state.currentMode === "video" && Number(state.lesson?.durationSec || 0) > 0) {
      return Math.round(Number(state.lesson.durationSec) * 1000);
    }

    if (state.currentMode === "audio" && Number(state.lesson?.audioDurationMs || 0) > 0) {
      return Math.round(Number(state.lesson.audioDurationMs));
    }

    if (Number(state.lesson?.durationSec || 0) > 0) {
      return Math.round(Number(state.lesson.durationSec) * 1000);
    }

    return 0;
  };

  const seekPlayerMs = (player, positionMs) => {
    if (!player) return;
    const requestedSec = Math.max(0, Number(positionMs || 0) / 1000);
    const durationSec = Number(player.duration || 0);
    if (Number.isFinite(durationSec) && durationSec > 0) {
      player.currentTime = Math.min(requestedSec, Math.max(0, durationSec - 0.1));
      return;
    }
    player.currentTime = requestedSec;
  };

  const seekActivePlayerMs = (positionMs) => {
    seekPlayerMs(getActivePlayer(), positionMs);
  };

  const pausePlayers = () => {
    if (videoEl instanceof HTMLVideoElement) videoEl.pause();
    if (audioEl instanceof HTMLAudioElement) audioEl.pause();
  };

  const setModeButtons = () => {
    if (btnModeVideo instanceof HTMLButtonElement) {
      btnModeVideo.classList.toggle("hidden", !state.hasVideo);
      btnModeVideo.disabled = state.currentMode === "video";
    }
    if (btnModeAudio instanceof HTMLButtonElement) {
      btnModeAudio.classList.toggle("hidden", !state.hasAudio);
      btnModeAudio.disabled = state.currentMode === "audio";
    }
  };

  const renderTranscript = () => {
    if (!transcriptListEl) return;
    const rawTranscript = String(state.transcriptRawText || "").replace(/\r\n?/g, "\n").trim();
    if (rawTranscript) {
      transcriptListEl.innerHTML = `<p class="transcript-full-paragraph">${escapeHtml(rawTranscript)}</p>`;
      state.transcriptScrollVirtual = Number(transcriptListEl.scrollTop || 0);
      return;
    }
    if (!state.transcriptSegments.length) {
      transcriptListEl.innerHTML = '<p class="lesson-transcript-empty">Transcript not available.</p>';
      return;
    }
    const fullText = state.transcriptSegments
      .map((segment) => String(segment?.text || "").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    if (!fullText) {
      transcriptListEl.innerHTML = '<p class="lesson-transcript-empty">Transcript not available.</p>';
      return;
    }
    transcriptListEl.innerHTML = `<p class="transcript-full-paragraph">${escapeHtml(fullText)}</p>`;
    state.transcriptScrollVirtual = Number(transcriptListEl.scrollTop || 0);
  };

  const syncTranscriptReadingScroll = (timeMs) => {
    if (!(transcriptListEl instanceof HTMLElement)) return;
    const durationMs = getActiveDurationMs();
    if (durationMs <= 0) return;
    const maxScroll = Math.max(0, transcriptListEl.scrollHeight - transcriptListEl.clientHeight);
    if (maxScroll <= 0) return;
    const currentMs = Math.max(0, Math.round(Number(timeMs || 0)));
    const progress = Math.max(0, Math.min(1, currentMs / durationMs));
    const speed = normalizeScrollSpeed(state.scrollSpeed || "normal");
    const speedAdjustedProgress = Math.max(0, Math.min(1, progress * getScrollSpeedMultiplier(speed)));
    const targetScroll = speedAdjustedProgress * maxScroll;
    const currentScroll = Number.isFinite(Number(state.transcriptScrollVirtual))
      ? Number(state.transcriptScrollVirtual)
      : Number(transcriptListEl.scrollTop || 0);
    const now = performance.now();
    const previous = Number(state.lastTranscriptScrollAt || 0);
    state.lastTranscriptScrollAt = now;
    if (!Number.isFinite(previous) || previous <= 0) {
      state.transcriptScrollVirtual = targetScroll;
      transcriptListEl.scrollTop = targetScroll;
      return;
    }

    const elapsedSec = Math.max(0.001, Math.min(0.2, (now - previous) / 1000));
    const responseRate = getScrollResponseRate(speed);
    const blend = Math.max(0.05, Math.min(0.98, 1 - Math.exp(-responseRate * elapsedSec)));
    const diff = targetScroll - currentScroll;
    if (progress >= 0.995 || Math.abs(diff) <= 0.2) {
      state.transcriptScrollVirtual = targetScroll;
      transcriptListEl.scrollTop = targetScroll;
      return;
    }
    const nextScroll = currentScroll + diff * blend;
    state.transcriptScrollVirtual = nextScroll;
    transcriptListEl.scrollTop = nextScroll;
  };

  const highlightByTimeMs = (timeMs) => {
    if (!state.transcriptSegments.length) return;
    syncTranscriptReadingScroll(timeMs);

    let nextIndex = state.transcriptSegments.findIndex(
      (segment) => timeMs >= Number(segment.startMs) && timeMs < Number(segment.endMs)
    );

    const lastSegment = state.transcriptSegments[state.transcriptSegments.length - 1];
    if (nextIndex === -1 && lastSegment && timeMs >= Number(lastSegment.endMs)) {
      nextIndex = state.transcriptSegments.length - 1;
    }
    if (nextIndex === -1 && state.activeTranscriptIndex >= 0) {
      const activeSegment = state.transcriptSegments[state.activeTranscriptIndex];
      const activeEndMs = Number(activeSegment?.endMs || 0);
      if (Number.isFinite(activeEndMs) && timeMs >= activeEndMs && timeMs - activeEndMs <= 140) {
        nextIndex = state.activeTranscriptIndex;
      }
    }

    if (isDebugSyncEnabled()) {
      const expectedSegment = state.transcriptSegments[nextIndex];
      const expectedMs = expectedSegment ? Math.max(0, Math.round(Number(expectedSegment.startMs || 0))) : -1;
      const audioCurrentMs = Math.max(0, Math.round(Number(timeMs || 0)));
      const driftMs = expectedMs >= 0 ? audioCurrentMs - expectedMs : null;
      const logKey = `${nextIndex}:${Math.floor(audioCurrentMs / 250)}`;
      const now = Date.now();
      if (!(state.lastSyncLogKey === logKey && now - Number(state.lastSyncLogAt || 0) < 220)) {
        state.lastSyncLogAt = now;
        state.lastSyncLogKey = logKey;
        debugSyncLog("lesson-player", {
          audioCurrentMs,
          computedHighlightIndex: nextIndex,
          expectedTimestampMs: expectedMs,
          driftMs,
        });
      }
    }

    if (nextIndex === state.activeTranscriptIndex) return;
    state.activeTranscriptIndex = nextIndex;
  };

  const setProgressText = () => {
    if (!progressInfoEl) return;
    const durationMs = getActiveDurationMs();
    const currentMs = getPlayerCurrentMs();
    const percent = durationMs > 0 ? Math.min(100, Math.round((currentMs / durationMs) * 100)) : 0;
    progressInfoEl.textContent = state.isCompleted ? `Progress: ${percent}% (Completed)` : `Progress: ${percent}%`;
  };

  const getCompletionRuleHit = () => {
    const durationMs = getActiveDurationMs();
    const currentMs = getPlayerCurrentMs();

    if (durationMs > 0) {
      const thresholdByPercent = Math.floor(durationMs * 0.9);
      const thresholdByTail = Math.max(0, durationMs - END_BUFFER_MS);
      const thresholdMs = Math.max(thresholdByPercent, thresholdByTail);
      return currentMs >= thresholdMs;
    }

    const fallbackThresholdMs = Math.max(0, Math.floor(Number(state.completionThresholdSec || 0) * 1000));
    return fallbackThresholdMs > 0 && currentMs >= fallbackThresholdMs;
  };

  const toggleAssessmentButton = () => {
    if (!startAssessmentBtn) return;
    const hasAssessment = Boolean(state.lesson?.assessmentTestId);
    const canStart = hasAssessment;
    startAssessmentBtn.classList.toggle("hidden", !canStart);
    startAssessmentBtn.disabled = !canStart;
  };

  const launchAssessment = async ({ skipConfirm = false } = {}) => {
    const testId = state.lesson?.assessmentTestId;
    if (!testId || state.assessmentLaunchInFlight) return;

    if (!skipConfirm) {
      const confirmed = await showConfirmDialog({
        title: "Confirm",
        message: "Are you sure you want to close transcript?",
        cancelText: "Cancel",
        confirmText: "Confirm",
      });
      if (!confirmed) return;
    }

    try {
      state.assessmentLaunchInFlight = true;
      setStatus(
        state.returnAttemptId ? "Returning to test..." : "Starting test attempt..."
      );
      const lessonStartMs = getPlayerCurrentMs();
      await startAssessmentAttempt(token, testId, {
        lessonStartMs,
        autoplay: true,
        existingAttemptId: state.returnAttemptId || "",
        attemptQuestionIndex: state.returnAttemptQuestionIndex,
      });
    } catch (error) {
      state.assessmentLaunchInFlight = false;
      const message = error instanceof Error ? error.message : "Unable to start assessment.";
      setStatus(message, "error");
    }
  };

  const applyMode = (mode, { preservePosition = true } = {}) => {
    if (!state.hasVideo && !state.hasAudio) return;

    let nextMode = mode;
    if (nextMode === "audio" && !state.hasAudio) nextMode = state.hasVideo ? "video" : "audio";
    if (nextMode === "video" && !state.hasVideo) nextMode = state.hasAudio ? "audio" : "video";
    if (nextMode !== "video" && nextMode !== "audio") {
      nextMode = state.hasVideo ? "video" : "audio";
    }

    const previousMs = preservePosition ? getPlayerCurrentMs() : state.lastSavedPositionMs;
    stopSyncLoop();
    pausePlayers();
    state.currentMode = nextMode;

    if (videoEl instanceof HTMLVideoElement) {
      videoEl.style.display = state.hasVideo && state.currentMode === "video" ? "" : "none";
    }
    if (audioEl instanceof HTMLAudioElement) {
      audioEl.style.display = state.hasAudio && state.currentMode === "audio" ? "" : "none";
    }

    if (preservePosition && previousMs > 0) {
      seekActivePlayerMs(previousMs);
    }

    state.lastTranscriptScrollAt = 0;
    state.transcriptScrollVirtual = Number(transcriptListEl?.scrollTop || 0);
    setModeButtons();
    highlightByTimeMs(getPlayerCurrentMs());
    setProgressText();
  };

  const attemptAutoPlayOnLoad = () => {
    if (!state.autoPlayRequested || state.autoPlayAttempted) return;
    const player = getActivePlayer();
    if (!(player instanceof HTMLMediaElement)) return;
    state.autoPlayAttempted = true;

    const startPlayback = () => {
      const playResult = player.play();
      if (playResult && typeof playResult.then === "function") {
        playResult.catch(() => {
          setStatus("Tap play to start lesson audio.");
        });
      }
    };

    if (Number(player.readyState || 0) >= 2) {
      startPlayback();
      return;
    }
    player.addEventListener("canplay", startPlayback, { once: true });
  };

  const saveProgress = async ({ force = false, completed = false, keepalive = false } = {}) => {
    if (!state.lessonId) return;

    const currentMs = getPlayerCurrentMs();
    const completedByRule = getCompletionRuleHit();
    const shouldComplete = Boolean(state.isCompleted || completed || completedByRule);
    const hasMeaningfulDelta = Math.abs(currentMs - state.lastSavedPositionMs) >= SAVE_INTERVAL_MS;

    if (!force && !shouldComplete && !hasMeaningfulDelta) return;
    if (state.saveInFlight && !keepalive) return;

    const body = {
      lastPositionSec: Math.floor(currentMs / 1000),
      ...(shouldComplete ? { completed: true } : {}),
    };

    try {
      state.saveInFlight = true;
      let payload;

      if (keepalive) {
        const response = await fetch(`${API_BASE}/api/lessons/${encodeURIComponent(state.lessonId)}/progress`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          keepalive: true,
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type") || "";
          payload = contentType.includes("application/json") ? await response.json() : null;
        }
      } else {
        payload = await apiRequest({
          path: `/api/lessons/${encodeURIComponent(state.lessonId)}/progress`,
          method: "PUT",
          token,
          body,
        });
      }

      state.lastSavedPositionMs = currentMs;
      if (payload?.progress?.completed || shouldComplete) {
        state.isCompleted = true;
      }

      toggleAssessmentButton();
      setProgressText();
    } catch (error) {
      if (!keepalive) {
        const message = error instanceof Error ? error.message : "Unable to save progress.";
        setStatus(message, "error");
      }
    } finally {
      state.saveInFlight = false;
    }
  };

  const scheduleProgressSave = () => {
    if (state.saveTimer) return;
    state.saveTimer = window.setTimeout(async () => {
      state.saveTimer = null;
      await saveProgress({ force: false });
    }, SAVE_INTERVAL_MS);
  };

  const loadTranscript = async (transcriptUrl, transcriptText) => {
    const candidates = buildAssetUrlCandidates(transcriptUrl);
    if (!candidates.length) {
      return buildTextTranscriptSegments(transcriptText);
    }

    for (const url of candidates) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) continue;

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json") || url.toLowerCase().endsWith(".json")) {
          const payload = await response.json();
          const parsed = parseJsonSegments(payload);
          if (parsed.length) return parsed;
          continue;
        }

        const rawText = await response.text();
        if (rawText.trim().startsWith("WEBVTT")) {
          const parsed = parseVttSegments(rawText);
          if (parsed.length) return parsed;
          continue;
        }

        try {
          const payload = JSON.parse(rawText);
          const parsed = parseJsonSegments(payload);
          if (parsed.length) return parsed;
        } catch {
          // Try next candidate.
        }
      } catch {
        // Try next candidate.
      }
    }

    return buildTextTranscriptSegments(transcriptText);
  };

  const stopSyncLoop = () => {
    if (!state.syncRafId) return;
    window.cancelAnimationFrame(state.syncRafId);
    state.syncRafId = 0;
    state.syncPlayer = null;
  };

  const startSyncLoop = (player) => {
    if (!(player instanceof HTMLMediaElement)) return;
    if (state.syncRafId && state.syncPlayer === player) return;
    stopSyncLoop();
    state.syncPlayer = player;

    const tick = () => {
      state.syncRafId = 0;
      if (state.syncPlayer !== player) return;
      const currentMs = Math.max(0, Math.round(Number(player.currentTime || 0) * 1000));
      highlightByTimeMs(currentMs);
      setProgressText();
      scheduleProgressSave();

      if (!state.isCompleted && getCompletionRuleHit()) {
        state.isCompleted = true;
        toggleAssessmentButton();
        setProgressText();
        saveProgress({ force: true, completed: true }).catch(() => {});
        setStatus("Lesson completed.", "success");
      }

      if (!player.paused && !player.ended) {
        state.syncRafId = window.requestAnimationFrame(tick);
      }
    };

    state.syncRafId = window.requestAnimationFrame(tick);
  };

  const wireEvents = () => {
    const handleTimeUpdate = () => {
      const player = getActivePlayer();
      if (player && !player.paused && !player.ended) {
        startSyncLoop(player);
        return;
      }
      highlightByTimeMs(getPlayerCurrentMs());
      setProgressText();
      scheduleProgressSave();
    };

    const handlePause = () => {
      stopSyncLoop();
      state.lastTranscriptScrollAt = 0;
      state.transcriptScrollVirtual = Number(transcriptListEl?.scrollTop || 0);
      saveProgress({ force: true }).catch(() => {});
    };

    const handleEnded = () => {
      stopSyncLoop();
      state.isCompleted = true;
      toggleAssessmentButton();
      setProgressText();
      saveProgress({ force: true, completed: true }).catch(() => {});
      if (state.lesson?.assessmentTestId) {
        setStatus("Lesson completed. Opening test...", "success");
        window.setTimeout(() => {
          launchAssessment({ skipConfirm: true }).catch(() => {});
        }, 120);
        return;
      }
      setStatus("Lesson completed.", "success");
    };

    const handlePlay = (event) => {
      const player = event?.currentTarget;
      if (player instanceof HTMLMediaElement) {
        startSyncLoop(player);
      }
    };

    const handleSeeked = () => {
      state.lastTranscriptScrollAt = 0;
      state.transcriptScrollVirtual = Number(transcriptListEl?.scrollTop || 0);
      highlightByTimeMs(getPlayerCurrentMs());
      setProgressText();
      scheduleProgressSave();
    };

    if (videoEl instanceof HTMLVideoElement) {
      videoEl.addEventListener("timeupdate", handleTimeUpdate);
      videoEl.addEventListener("play", handlePlay);
      videoEl.addEventListener("pause", handlePause);
      videoEl.addEventListener("seeked", handleSeeked);
      videoEl.addEventListener("ended", handleEnded);
    }

    if (audioEl instanceof HTMLAudioElement) {
      audioEl.addEventListener("timeupdate", handleTimeUpdate);
      audioEl.addEventListener("play", handlePlay);
      audioEl.addEventListener("pause", handlePause);
      audioEl.addEventListener("seeked", handleSeeked);
      audioEl.addEventListener("ended", handleEnded);
    }

    if (btnModeVideo instanceof HTMLButtonElement) {
      btnModeVideo.addEventListener("click", () => applyMode("video"));
    }
    if (btnModeAudio instanceof HTMLButtonElement) {
      btnModeAudio.addEventListener("click", () => applyMode("audio"));
    }

    if (transcriptListEl) {
      transcriptListEl.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const segmentButton = target.closest("[data-segment-index]");
        if (!(segmentButton instanceof HTMLElement)) return;

        const index = Number(segmentButton.getAttribute("data-segment-index"));
        const segment = state.transcriptSegments[index];
        if (!segment) return;

        seekActivePlayerMs(segment.startMs);
        highlightByTimeMs(segment.startMs + 1);
        setProgressText();
      });
      transcriptListEl.addEventListener("mouseup", () => {
        window.setTimeout(updateAiSelectionState, 0);
      });
      transcriptListEl.addEventListener("keyup", () => {
        window.setTimeout(updateAiSelectionState, 0);
      });
    }

    document.addEventListener("selectionchange", () => {
      if (!(transcriptListEl instanceof HTMLElement)) return;
      if (!document.hasFocus()) return;
      window.setTimeout(updateAiSelectionState, 0);
    });

    window.addEventListener("beforeunload", () => {
      stopSyncLoop();
      state.aiVoiceStopRequested = true;
      cleanupAiVoiceSession();
      if (state.saveTimer) {
        window.clearTimeout(state.saveTimer);
        state.saveTimer = null;
      }
      saveProgress({ force: true, keepalive: true }).catch(() => {});
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        saveProgress({ force: true, keepalive: true }).catch(() => {});
      }
    });
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      state.aiVoiceStopRequested = true;
      cleanupAiVoiceSession();
      clearAuth();
      window.location.href = "./index.html";
    });
  }

  if (!state.lessonId) {
    setStatus("Lesson id is missing in URL.", "error");
    const fallbackLink = buildOverviewLink(state.chapterId, user?.role || "STUDENT");
    window.setTimeout(() => {
      window.location.href = fallbackLink;
    }, 300);
    return;
  }

  wireEvents();

  try {
    setStatus("Loading lesson...");
    const payload = await apiRequest({
      path: `/api/lessons/${encodeURIComponent(state.lessonId)}`,
      token,
    });

    state.lesson = payload?.lesson || null;
    state.completionThresholdSec = Number(payload?.completionThresholdSec || 0);
    state.lastSavedPositionMs = Math.max(0, Number(payload?.lesson?.progress?.lastPositionSec || 0) * 1000);
    state.isCompleted = Boolean(payload?.lesson?.progress?.completed);

    if (
      state.lesson?.assessmentTestId &&
      (Boolean(state.lesson?.directAttemptOnly) || !lessonHasTranscriptFlow(state.lesson))
    ) {
      toggleAssessmentButton();
      setStatus("Starting test attempt...");
      await launchAssessment({ skipConfirm: true });
      return;
    }

    if (!state.chapterId && payload?.chapter?.id) {
      state.chapterId = payload.chapter.id;
    }

    if (lessonTitleEl) {
      lessonTitleEl.textContent = payload?.lesson?.title || "Lesson Player";
    }

    if (lessonMetaEl) {
      const courseTitle = payload?.course?.title || "-";
      const chapterTitle = payload?.chapter?.title || "-";
      const durationSec =
        Number(payload?.lesson?.durationSec || 0) > 0
          ? Number(payload.lesson.durationSec)
          : Math.floor(Number(payload?.lesson?.audioDurationMs || 0) / 1000);
      const durationMin = Math.max(1, Math.round(durationSec / 60));
      lessonMetaEl.textContent = `${courseTitle} | ${chapterTitle} | ${durationMin} min`;
    }

    const videoUrlCandidates = buildAssetUrlCandidates(payload?.lesson?.videoUrl);
    const audioUrlCandidates = buildAssetUrlCandidates(payload?.lesson?.audioUrl);
    state.hasVideo = videoUrlCandidates.length > 0;
    state.hasAudio = audioUrlCandidates.length > 0;

    if (videoEl instanceof HTMLVideoElement) {
      configureMediaSource(videoEl, videoUrlCandidates, {
        onFinalError: () => setStatus("Video failed to load for this lesson.", "error"),
      });
    }

    if (audioEl instanceof HTMLAudioElement) {
      configureMediaSource(audioEl, audioUrlCandidates, {
        onFinalError: () =>
          setStatus(
            "Audio failed to load. Re-upload or regenerate lesson audio from Admin.",
            "error"
          ),
      });
    }

    const resumeMs = state.lastSavedPositionMs;
    if (resumeMs > 0) {
      if (videoEl instanceof HTMLVideoElement && state.hasVideo) {
        const resumeVideo = () => seekPlayerMs(videoEl, resumeMs);
        if (videoEl.readyState >= 1) resumeVideo();
        else videoEl.addEventListener("loadedmetadata", resumeVideo, { once: true });
      }
      if (audioEl instanceof HTMLAudioElement && state.hasAudio) {
        const resumeAudio = () => seekPlayerMs(audioEl, resumeMs);
        if (audioEl.readyState >= 1) resumeAudio();
        else audioEl.addEventListener("loadedmetadata", resumeAudio, { once: true });
      }
    }

    state.transcriptRawText = String(payload?.lesson?.transcriptText || "")
      .replace(/\r\n?/g, "\n")
      .trim();
    const inlineSegments = parseJsonSegments(payload?.lesson?.transcriptSegments);
    state.transcriptSegments =
      inlineSegments.length > 0
        ? inlineSegments
        : await loadTranscript(payload?.lesson?.transcriptUrl, state.transcriptRawText);
    if (!state.transcriptSegments.length && state.transcriptRawText) {
      state.transcriptSegments = buildTextTranscriptSegments(state.transcriptRawText);
    }
    const transcriptPreview =
      state.transcriptRawText ||
      state.transcriptSegments
        .map((segment) => String(segment?.text || "").trim())
        .filter(Boolean)
        .join("\n");
    state.aiHasTranscript = Boolean(String(transcriptPreview || "").trim());
    state.aiLessonLanguage = detectPreferredLessonLanguage(transcriptPreview);
    if (lessonAiLanguageSelect instanceof HTMLSelectElement) {
      lessonAiLanguageSelect.value = "AUTO";
      lessonAiLanguageSelect.title = `Default lesson language: ${state.aiLessonLanguage}`;
    }

    state.activeTranscriptIndex = -1;
    renderTranscript();
    renderAiSelection();
    renderAiMessages();
    renderAiVoiceState();
    toggleAssessmentButton();

    if (state.aiEnabled) {
      try {
        await ensureAiConversation();
      } catch (aiInitError) {
        state.aiUnavailable = true;
        setAiBusy(false);
        const aiMessage = aiInitError instanceof Error ? aiInitError.message : "Unable to load AI Teacher.";
        setAiStatus(aiMessage, "error");
      }
    }

    const initialMode = state.hasAudio ? "audio" : "video";
    state.currentMode = initialMode;
    applyMode(initialMode, { preservePosition: false });
    setProgressText();
    attemptAutoPlayOnLoad();
    setStatus("");
  } catch (error) {
    if (error?.status === 401) {
      clearAuth();
      window.location.href = "./index.html";
      return;
    }
    const message = error instanceof Error ? error.message : "Unable to load lesson.";
    setStatus(message, "error");
  }

  if (startAssessmentBtn) {
    startAssessmentBtn.addEventListener("click", async () => {
      await launchAssessment();
    });
  }

  if (transcriptScrollSpeedInput instanceof HTMLSelectElement) {
    transcriptScrollSpeedInput.value = normalizeScrollSpeed(state.scrollSpeed || "normal");
    transcriptScrollSpeedInput.addEventListener("change", () => {
      state.scrollSpeed = normalizeScrollSpeed(transcriptScrollSpeedInput.value);
      state.lastTranscriptScrollAt = 0;
      state.transcriptScrollVirtual = Number(transcriptListEl?.scrollTop || 0);
      syncTranscriptReadingScroll(getPlayerCurrentMs());
    });
  }

  if (state.aiEnabled && lessonAiForm instanceof HTMLFormElement) {
    lessonAiForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const content = String(lessonAiInput instanceof HTMLTextAreaElement ? lessonAiInput.value : "").trim();
      if (!content) {
        setAiStatus("Enter a message for AI Teacher.", "error");
        return;
      }
      if (lessonAiInput instanceof HTMLTextAreaElement) {
        lessonAiInput.value = "";
      }
      await sendAiMessage({
        content,
        requestType: "EXPLAIN_LESSON",
      });
    });
  }

  if (state.aiEnabled && lessonAiKeyExamPointsBtn instanceof HTMLButtonElement) {
    lessonAiKeyExamPointsBtn.addEventListener("click", async () => {
      await sendAiMessage({
        content: "Give key exam points from this lesson only. Keep them short, high-yield, and easy to revise.",
        requestType: "KEY_EXAM_POINTS",
      });
    });
  }

  if (state.aiEnabled && lessonAiAskMcqsBtn instanceof HTMLButtonElement) {
    lessonAiAskMcqsBtn.addEventListener("click", async () => {
      await sendAiMessage({
        content: "Ask 3 MCQs from this lesson only. Give 4 options each and place the correct answers after all 3 questions.",
        requestType: "ASK_3_MCQS",
      });
    });
  }

  if (state.aiEnabled && lessonAiExplainSelectionBtn instanceof HTMLButtonElement) {
    lessonAiExplainSelectionBtn.addEventListener("click", async () => {
      const selectedText = String(state.aiSelectedText || "").trim();
      if (!selectedText) {
        setAiStatus("Select transcript text first.", "error");
        return;
      }
      await sendAiMessage({
        content: `Explain the selected lesson text like a teacher in ${getAiResponseLanguage()}. Start from the selected lines, keep it simple, and stay inside the lesson context.`,
        selectedText,
        requestType: "EXPLAIN_SELECTION",
      });
    });
  }

  if (state.aiEnabled && lessonAiVoiceStartBtn instanceof HTMLButtonElement) {
    lessonAiVoiceStartBtn.addEventListener("click", async () => {
      await startAiVoiceTutor();
    });
  }

  if (state.aiEnabled && lessonAiVoiceStopBtn instanceof HTMLButtonElement) {
    lessonAiVoiceStopBtn.addEventListener("click", () => {
      stopAiVoiceTutor({
        message: "Voice: ended",
        nextState: "ended",
      });
      setAiStatus("Voice tutor session ended.", "success");
    });
  }

  if (lessonAiMcqCloseBtn instanceof HTMLButtonElement) {
    lessonAiMcqCloseBtn.addEventListener("click", () => {
      closeLessonAiMcqModal();
    });
  }

  if (lessonAiMcqModalEl instanceof HTMLElement) {
    lessonAiMcqModalEl.addEventListener("click", (event) => {
      if (event.target === lessonAiMcqModalEl) {
        closeLessonAiMcqModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLessonAiMcqModal();
    }
  });

  if (lessonAiMcqNextBtn instanceof HTMLButtonElement) {
    lessonAiMcqNextBtn.addEventListener("click", () => {
      const mcqSet = state.aiMcqSet;
      if (!isValidLessonAiMcqSet(mcqSet)) return;
      const question = mcqSet.questions[state.aiMcqCurrentIndex];
      const selectedOption = String(state.aiMcqAnswers?.[question?.id] || "").trim().toUpperCase();
      if (!canAdvanceLessonAiMcq(selectedOption)) {
        setLessonAiMcqStatus("Select an option before moving to the next MCQ.", "error");
        return;
      }
      setLessonAiMcqStatus("");
      state.aiMcqCurrentIndex = Math.min(mcqSet.questions.length - 1, state.aiMcqCurrentIndex + 1);
      renderLessonAiMcqModal();
    });
  }

  if (lessonAiMcqDoneBtn instanceof HTMLButtonElement) {
    lessonAiMcqDoneBtn.addEventListener("click", () => {
      const mcqSet = state.aiMcqSet;
      if (!isValidLessonAiMcqSet(mcqSet)) return;
      const question = mcqSet.questions[state.aiMcqCurrentIndex];
      const selectedOption = String(state.aiMcqAnswers?.[question?.id] || "").trim().toUpperCase();
      if (!canAdvanceLessonAiMcq(selectedOption)) {
        setLessonAiMcqStatus("Select an option before finishing the lesson MCQs.", "error");
        return;
      }
      state.aiMcqCompleted = true;
      setLessonAiMcqStatus("Lesson MCQs evaluated.", "success");
      renderLessonAiMcqResult();
    });
  }
});


