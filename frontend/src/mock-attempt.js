import {
  API_BASE,
  EXAM_LABELS,
  SUBJECT_LABELS,
  apiRequest,
  clearAuth,
  debugSyncLog,
  escapeHtml,
  initHeaderBehavior,
  isDebugSyncEnabled,
  requireRoleGuard,
} from "./mock-api.js?v=2";

const getAttemptId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("attemptId") || "";
};

const getLessonStartMsFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const rawMs = Number(params.get("lessonStartMs"));
  if (Number.isFinite(rawMs) && rawMs >= 0) return Math.round(rawMs);
  const rawSec = Number(params.get("lessonStartSec"));
  if (Number.isFinite(rawSec) && rawSec >= 0) return Math.round(rawSec * 1000);
  return 0;
};

const isExtensionlessRoute = () => {
  const pathname = (window.location.pathname || "").toLowerCase();
  return Boolean(pathname) && !pathname.endsWith(".html") && pathname !== "/";
};

const getPagePath = (name) => (isExtensionlessRoute() ? `./${name}` : `./${name}.html`);

const getMockTestsPagePath = (role = "STUDENT") => {
  if (role === "ADMIN") {
    return getPagePath("admin-lessons");
  }
  return getPagePath("mock-tests");
};

const getMockAttemptPagePath = () => getPagePath("mock-attempt");

const TRANSCRIPT_SEGMENT_DURATION_MS = 3000;

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

    const [startRaw, endRaw] = timelineLine.split("-->").map((part) => part.trim());
    const start = parseTimecode(startRaw);
    const end = parseTimecode(endRaw);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;

    const timelineIndex = lines.findIndex((line) => line === timelineLine);
    const segmentText = lines.slice(timelineIndex + 1).join(" ").trim();
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
  let source = payload;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      return [];
    }
  }

  const collection = Array.isArray(source)
    ? source
    : Array.isArray(source?.segments)
      ? source.segments
      : [];

  const normalized = collection
    .map((item) => ({
      start: Number(item?.startMs ?? item?.start ?? item?.from ?? 0),
      end: Number(item?.endMs ?? item?.end ?? item?.to ?? 0),
      text: String(item?.text || "").trim(),
    }))
    .filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start && item.text)
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

const buildTextTranscriptSegments = (transcriptText, totalDurationMs = 0) => {
  const normalized = String(transcriptText || "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const chunks = lines.length
    ? lines
    : normalized
        .split(/(?<=[.?!])\s+/)
        .map((line) => line.trim())
        .filter(Boolean);
  if (!chunks.length) return [];

  const effectiveDurationMs = Math.max(
    chunks.length * TRANSCRIPT_SEGMENT_DURATION_MS,
    Math.round(Number(totalDurationMs || 0))
  );
  const totalChars = chunks.reduce((sum, line) => sum + Math.max(1, line.length), 0);
  let cursor = 0;

  return chunks.map((line, index) => {
    const weight = Math.max(1, line.length) / Math.max(1, totalChars);
    const isLast = index === chunks.length - 1;
    const durationMs = isLast
      ? Math.max(250, effectiveDurationMs - cursor)
      : Math.max(250, Math.round(effectiveDurationMs * weight));
    const startMs = cursor;
    const endMs = startMs + durationMs;
    cursor = endMs;
    return { startMs, endMs, text: line };
  });
};

const normalizeAssetUrl = (input) => {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${API_BASE}${raw}`;
  return `${API_BASE}/${raw.replace(/^\.\//, "")}`;
};

const transcriptFromSegments = (payload) => {
  let source = payload;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      source = [];
    }
  }
  const collection = Array.isArray(source)
    ? source
    : Array.isArray(source?.segments)
      ? source.segments
      : [];
  return collection
    .map((item) => String(item?.text || "").trim())
    .filter(Boolean)
    .join("\n");
};

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard(["STUDENT", "ADMIN"]);
  if (!auth) return;
  const { token, user } = auth;
  initHeaderBehavior();
  const attemptId = getAttemptId();
  const lessonStartMsFromQuery = getLessonStartMsFromQuery();
  if (!attemptId) {
    window.location.href = getMockTestsPagePath(user?.role || "STUDENT");
    return;
  }
  const lessonPlaybackStorageKey = `ccacademy_attempt_lesson_playback_${attemptId}`;

  const titleEl = document.querySelector("#attemptTitle");
  const statusEl = document.querySelector("#attemptStatus");
  const attemptCardEl = document.querySelector(".attempt-card");
  const attemptPostActionsEl = document.querySelector("#attemptPostActions");
  const reattemptBtn = document.querySelector("#reattemptTestBtn");
  const backToTestsBtn = document.querySelector("#backToTestsBtn");
  const progressEl = document.querySelector("#attemptProgress");
  const questionIndexEl = document.querySelector("#questionIndex");
  const attemptTimerEl = document.querySelector("#attemptTimer");
  const questionTextEl = document.querySelector("#questionText");
  const optionsFormEl = document.querySelector("#optionsForm");
  const prevBtn = document.querySelector("#prevQuestionBtn");
  const nextBtn = document.querySelector("#nextQuestionBtn");
  const stopAttemptBtn = document.querySelector("#stopAttemptBtn");
  const submitBtn = document.querySelector("#submitAttemptBtn");
  const reviewWrap = document.querySelector("#reviewWrap");
  const reviewTableBody = document.querySelector("#reviewTableBody");
  const resultScoreEl = document.querySelector("#resultScore");
  const resultRemarkEl = document.querySelector("#resultRemark");
  const logoutBtn = document.querySelector("#logoutBtn");
  const stopAttemptModal = document.querySelector("#stopAttemptModal");
  const stopAttemptCloseBtn = document.querySelector("#stopAttemptCloseBtn");
  const stopAttemptCancelBtn = document.querySelector("#stopAttemptCancelBtn");
  const stopAttemptConfirmBtn = document.querySelector("#stopAttemptConfirmBtn");
  const lessonRefWrap = document.querySelector("#attemptLessonRef");
  const lessonMetaEl = document.querySelector("#attemptLessonMeta");
  const lessonAudioEl = document.querySelector("#attemptLessonAudio");
  const lessonVideoEl = document.querySelector("#attemptLessonVideo");
  const lessonTranscriptEl = document.querySelector("#attemptLessonTranscript");

  const state = {
    attempt: null,
    questions: [],
    currentIndex: 0,
    isSubmitted: false,
    remainingSeconds: 0,
    timerIntervalId: null,
    lessonContext: null,
    isFinalizing: false,
    lessonStartMs: Math.max(0, lessonStartMsFromQuery),
    lessonPlaybackMs: Math.max(0, lessonStartMsFromQuery),
    lessonReplayFromStart: false,
    lastLessonPlaybackPersistAt: 0,
    lessonTranscriptSegments: [],
    lessonTranscriptNodes: [],
    activeLessonTranscriptIndex: -1,
    closedSource: "",
    lastSyncLogAt: 0,
    lastSyncLogKey: "",
  };

  const setStatus = (text, type) => {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
  };

  const getCurrentLessonPlayer = () => {
    if (lessonAudioEl instanceof HTMLAudioElement && !lessonAudioEl.classList.contains("hidden")) {
      return lessonAudioEl;
    }
    if (lessonVideoEl instanceof HTMLVideoElement && !lessonVideoEl.classList.contains("hidden")) {
      return lessonVideoEl;
    }
    return null;
  };

  const findLessonTranscriptIndexByTime = (timeMs) => {
    const segments = state.lessonTranscriptSegments;
    if (!segments.length) return -1;
    const safeMs = Math.max(0, Number(timeMs || 0));
    let index = segments.findIndex(
      (segment) => safeMs >= Number(segment.startMs || 0) && safeMs < Number(segment.endMs || 0)
    );
    if (index === -1 && safeMs >= Number(segments[segments.length - 1]?.endMs || 0)) {
      index = segments.length - 1;
    }
    return index;
  };

  const setActiveLessonTranscriptIndex = (nextIndex, { autoScroll = true } = {}) => {
    if (nextIndex === state.activeLessonTranscriptIndex) return;

    const previousNode = state.lessonTranscriptNodes[state.activeLessonTranscriptIndex];
    if (previousNode instanceof HTMLElement) {
      previousNode.classList.remove("active");
    }

    state.activeLessonTranscriptIndex = nextIndex;
    const nextNode = state.lessonTranscriptNodes[nextIndex];
    if (nextNode instanceof HTMLElement) {
      nextNode.classList.add("active");
      if (autoScroll) {
        nextNode.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  };

  const syncLessonTranscriptToMs = (timeMs, options) => {
    if (!state.lessonTranscriptSegments.length) return;
    const nextIndex = findLessonTranscriptIndexByTime(timeMs);
    if (isDebugSyncEnabled()) {
      const expectedSegment = state.lessonTranscriptSegments[nextIndex];
      const expectedMs = expectedSegment ? Math.max(0, Math.round(Number(expectedSegment.startMs || 0))) : -1;
      const audioCurrentMs = Math.max(0, Math.round(Number(timeMs || 0)));
      const driftMs = expectedMs >= 0 ? audioCurrentMs - expectedMs : null;
      const logKey = `${nextIndex}:${Math.floor(audioCurrentMs / 250)}`;
      const now = Date.now();
      if (!(state.lastSyncLogKey === logKey && now - Number(state.lastSyncLogAt || 0) < 220)) {
        state.lastSyncLogAt = now;
        state.lastSyncLogKey = logKey;
        debugSyncLog("mock-attempt-lesson-ref", {
          audioCurrentMs,
          computedHighlightIndex: nextIndex,
          expectedTimestampMs: expectedMs,
          driftMs,
        });
      }
    }
    setActiveLessonTranscriptIndex(nextIndex, options);
  };

  const readLessonPlaybackState = () => {
    try {
      const raw = window.localStorage.getItem(lessonPlaybackStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      const startMs = Math.max(0, Math.round(Number(parsed.startMs || 0)));
      const currentMs = Math.max(0, Math.round(Number(parsed.currentMs || 0)));
      return {
        startMs,
        currentMs,
        replayFromStart: Boolean(parsed.replayFromStart),
      };
    } catch {
      return null;
    }
  };

  const clearLessonPlaybackState = () => {
    try {
      window.localStorage.removeItem(lessonPlaybackStorageKey);
    } catch {
      // ignore storage errors
    }
  };

  const persistLessonPlaybackState = ({ force = false } = {}) => {
    if (state.isSubmitted) return;
    const now = Date.now();
    if (!force && now - Number(state.lastLessonPlaybackPersistAt || 0) < 250) return;
    state.lastLessonPlaybackPersistAt = now;
    try {
      window.localStorage.setItem(
        lessonPlaybackStorageKey,
        JSON.stringify({
          startMs: Math.max(0, Math.round(Number(state.lessonStartMs || 0))),
          currentMs: Math.max(0, Math.round(Number(state.lessonPlaybackMs || 0))),
          replayFromStart: Boolean(state.lessonReplayFromStart),
          updatedAt: now,
        }),
      );
    } catch {
      // ignore storage errors
    }
  };

  const pauseLessonPlayers = () => {
    if (lessonAudioEl instanceof HTMLAudioElement) lessonAudioEl.pause();
    if (lessonVideoEl instanceof HTMLVideoElement) lessonVideoEl.pause();
  };

  const seekLessonPlayerMs = (player, rawMs) => {
    if (!(player instanceof HTMLMediaElement)) return 0;
    const desiredMs = Math.max(0, Math.round(Number(rawMs || 0)));
    const desiredSec = desiredMs / 1000;
    const durationSec = Number(player.duration || 0);
    let nextSec = desiredSec;
    if (Number.isFinite(durationSec) && durationSec > 0) {
      nextSec = Math.min(desiredSec, Math.max(0, durationSec - 0.05));
    }
    player.currentTime = Math.max(0, nextSec);
    return Math.max(0, Math.round(nextSec * 1000));
  };

  const applyLessonPlaybackPosition = (player) => {
    if (!(player instanceof HTMLMediaElement)) return;
    const desiredMs =
      Number(state.lessonPlaybackMs || 0) > 0
        ? Number(state.lessonPlaybackMs || 0)
        : Number(state.lessonStartMs || 0);
    if (desiredMs <= 0) return;
    const apply = () => {
      const nextMs = seekLessonPlayerMs(player, desiredMs);
      state.lessonPlaybackMs = nextMs;
      persistLessonPlaybackState({ force: true });
      syncLessonTranscriptToMs(nextMs, { autoScroll: false });
    };
    if (Number(player.readyState || 0) >= 1) {
      apply();
      return;
    }
    player.addEventListener("loadedmetadata", apply, { once: true });
  };

  const bindLessonPlaybackEvents = (player) => {
    if (!(player instanceof HTMLMediaElement)) return;
    if (player.dataset.lessonPlaybackBound === "1") return;
    player.dataset.lessonPlaybackBound = "1";

    player.addEventListener("timeupdate", () => {
      if (state.isSubmitted) return;
      state.lessonPlaybackMs = Math.max(0, Math.round(Number(player.currentTime || 0) * 1000));
      persistLessonPlaybackState();
      syncLessonTranscriptToMs(state.lessonPlaybackMs);
    });

    player.addEventListener("pause", () => {
      if (state.isSubmitted) return;
      state.lessonPlaybackMs = Math.max(0, Math.round(Number(player.currentTime || 0) * 1000));
      persistLessonPlaybackState({ force: true });
      syncLessonTranscriptToMs(state.lessonPlaybackMs, { autoScroll: false });
    });

    player.addEventListener("seeked", () => {
      if (state.isSubmitted) return;
      state.lessonPlaybackMs = Math.max(0, Math.round(Number(player.currentTime || 0) * 1000));
      persistLessonPlaybackState({ force: true });
      syncLessonTranscriptToMs(state.lessonPlaybackMs, { autoScroll: true });
    });

    player.addEventListener("ended", () => {
      if (state.isSubmitted) return;
      state.lessonReplayFromStart = true;
      const nextMs = seekLessonPlayerMs(player, state.lessonStartMs);
      state.lessonPlaybackMs = nextMs;
      persistLessonPlaybackState({ force: true });
      syncLessonTranscriptToMs(state.lessonPlaybackMs, { autoScroll: true });
    });

    player.addEventListener("play", () => {
      if (state.isSubmitted) return;
      if (!state.lessonReplayFromStart) return;
      state.lessonReplayFromStart = false;
      const nextMs = seekLessonPlayerMs(player, state.lessonStartMs);
      state.lessonPlaybackMs = nextMs;
      persistLessonPlaybackState({ force: true });
      syncLessonTranscriptToMs(state.lessonPlaybackMs, { autoScroll: true });
    });
  };

  const initLessonPlaybackMemory = () => {
    const saved = readLessonPlaybackState();
    const queryStartMs = Math.max(0, Math.round(Number(lessonStartMsFromQuery || 0)));
    if (saved) {
      state.lessonStartMs = Math.max(0, saved.startMs);
      state.lessonPlaybackMs = Math.max(0, saved.currentMs || saved.startMs);
      state.lessonReplayFromStart = Boolean(saved.replayFromStart);
      return;
    }
    state.lessonStartMs = queryStartMs;
    state.lessonPlaybackMs = queryStartMs;
    state.lessonReplayFromStart = false;
    if (queryStartMs > 0) {
      persistLessonPlaybackState({ force: true });
    }
  };

  const loadLessonTranscriptSegments = async () => {
    const lesson = state.lessonContext;
    if (!lesson) {
      state.lessonTranscriptSegments = [];
      return;
    }

    const inlineSegments = parseJsonSegments(lesson?.transcriptSegments);
    if (inlineSegments.length) {
      state.lessonTranscriptSegments = inlineSegments;
      return;
    }

    const transcriptUrl = normalizeAssetUrl(lesson?.transcriptUrl);
    if (transcriptUrl) {
      try {
        const response = await fetch(transcriptUrl, { cache: "no-store" });
        if (response.ok) {
          const contentType = String(response.headers.get("content-type") || "").toLowerCase();
          if (contentType.includes("application/json") || transcriptUrl.toLowerCase().endsWith(".json")) {
            const payload = await response.json();
            const parsed = parseJsonSegments(payload);
            if (parsed.length) {
              state.lessonTranscriptSegments = parsed;
              return;
            }
          } else {
            const rawText = await response.text();
            if (rawText.trim().startsWith("WEBVTT")) {
              const parsed = parseVttSegments(rawText);
              if (parsed.length) {
                state.lessonTranscriptSegments = parsed;
                return;
              }
            } else {
              try {
                const payload = JSON.parse(rawText);
                const parsed = parseJsonSegments(payload);
                if (parsed.length) {
                  state.lessonTranscriptSegments = parsed;
                  return;
                }
              } catch {
                // ignore parsing failure and fallback to plain text timing
              }
            }
          }
        }
      } catch {
        // ignore and fallback
      }
    }

    const transcriptText = String(lesson?.transcriptText || "").trim() || transcriptFromSegments(lesson?.transcriptSegments);
    state.lessonTranscriptSegments = buildTextTranscriptSegments(
      transcriptText,
      Number(lesson?.audioDurationMs || 0) || Number(lesson?.durationSec || 0) * 1000
    );
  };

  const renderLessonContext = () => {
    if (!(lessonRefWrap instanceof HTMLElement)) return;
    const lesson = state.lessonContext;
    if (!lesson) {
      lessonRefWrap.classList.add("hidden");
      return;
    }

    if (lessonMetaEl) {
      const durationSec =
        Number(lesson?.durationSec || 0) > 0
          ? Number(lesson.durationSec)
          : Math.floor(Number(lesson?.audioDurationMs || 0) / 1000);
      const durationMin = durationSec > 0 ? `${Math.max(1, Math.round(durationSec / 60))} min` : "Duration -";
      const courseTitle = lesson?.course?.title || "-";
      const chapterTitle = lesson?.chapter?.title || "-";
      lessonMetaEl.textContent = `${courseTitle} | ${chapterTitle} | ${durationMin}`;
    }

    if (lessonTranscriptEl instanceof HTMLElement) {
      state.lessonTranscriptNodes = [];
      state.activeLessonTranscriptIndex = -1;
      if (!state.lessonTranscriptSegments.length) {
        const transcriptText = String(lesson?.transcriptText || "").trim();
        const fromSegments = transcriptFromSegments(lesson?.transcriptSegments);
        lessonTranscriptEl.innerHTML = `<p class="lesson-transcript-empty">${escapeHtml(
          transcriptText || fromSegments || "Transcript not available."
        )}</p>`;
      } else {
        lessonTranscriptEl.innerHTML = state.lessonTranscriptSegments
          .map(
            (segment, index) => `
              <button
                type="button"
                class="transcript-inline-segment"
                data-attempt-segment-index="${index}"
              >
                ${escapeHtml(segment.text)}
              </button>
            `
          )
          .join("");
        state.lessonTranscriptNodes = Array.from(
          lessonTranscriptEl.querySelectorAll("[data-attempt-segment-index]")
        );
      }
    }

    const audioUrl = normalizeAssetUrl(lesson?.audioUrl);
    const videoUrl = normalizeAssetUrl(lesson?.videoUrl);
    if (lessonAudioEl instanceof HTMLAudioElement) {
      if (audioUrl) {
        lessonAudioEl.src = audioUrl;
        lessonAudioEl.classList.remove("hidden");
        bindLessonPlaybackEvents(lessonAudioEl);
      } else {
        lessonAudioEl.removeAttribute("src");
        lessonAudioEl.classList.add("hidden");
      }
      lessonAudioEl.load();
      if (audioUrl) {
        applyLessonPlaybackPosition(lessonAudioEl);
        syncLessonTranscriptToMs(state.lessonPlaybackMs, { autoScroll: false });
      }
    }
    if (lessonVideoEl instanceof HTMLVideoElement) {
      if (!audioUrl && videoUrl) {
        lessonVideoEl.src = videoUrl;
        lessonVideoEl.classList.remove("hidden");
        bindLessonPlaybackEvents(lessonVideoEl);
      } else {
        lessonVideoEl.removeAttribute("src");
        lessonVideoEl.classList.add("hidden");
      }
      lessonVideoEl.load();
      if (!audioUrl && videoUrl) {
        applyLessonPlaybackPosition(lessonVideoEl);
        syncLessonTranscriptToMs(state.lessonPlaybackMs, { autoScroll: false });
      }
    }

    lessonRefWrap.classList.remove("hidden");
  };

  const showPostAttemptActions = () => {
    if (attemptPostActionsEl instanceof HTMLElement) {
      attemptPostActionsEl.classList.remove("hidden");
    }
    if (backToTestsBtn instanceof HTMLAnchorElement) {
      backToTestsBtn.setAttribute("href", getMockTestsPagePath(user?.role || "STUDENT"));
    }
    if (reattemptBtn instanceof HTMLButtonElement) {
      const hasMockTestId = Boolean(String(state.attempt?.mockTestId || "").trim());
      reattemptBtn.disabled = !hasMockTestId;
    }
  };

  const closeAttemptView = (source = "") => {
    state.closedSource = source;
    if (attemptCardEl instanceof HTMLElement) {
      attemptCardEl.classList.add("hidden");
    }
    closeStopModal();
    showPostAttemptActions();
  };

  const answeredCount = () =>
    state.questions.reduce((count, question) => (question.selectedOption ? count + 1 : count), 0);

  const clearTimer = () => {
    if (state.timerIntervalId) {
      window.clearInterval(state.timerIntervalId);
      state.timerIntervalId = null;
    }
  };

  const formatTimer = (totalSeconds) => {
    const safe = Math.max(0, Number(totalSeconds) || 0);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}:00`;
  };

  const renderTimer = () => {
    if (!attemptTimerEl) return;
    attemptTimerEl.textContent = formatTimer(state.remainingSeconds);
  };

  const isTimeOver = () => !state.isSubmitted && state.remainingSeconds <= 0;

  const startCountdown = () => {
    clearTimer();
    const totalQuestions =
      Number(state.attempt?.totalQuestions || 0) || Number(state.questions.length || 0);
    const allottedSeconds = Math.max(0, totalQuestions * 60);
    const startedAtMs = new Date(state.attempt?.startedAt || Date.now()).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));

    state.remainingSeconds = Math.max(0, allottedSeconds - elapsedSeconds);
    renderTimer();

    if (state.isSubmitted || state.remainingSeconds <= 0) {
      if (state.remainingSeconds <= 0 && !state.isSubmitted) {
        void finalizeAttempt("time");
      }
      return;
    }

    state.timerIntervalId = window.setInterval(() => {
      state.remainingSeconds = Math.max(0, state.remainingSeconds - 1);
      renderTimer();
      updateProgress();
      if (state.remainingSeconds <= 0) {
        clearTimer();
        void finalizeAttempt("time");
      }
    }, 1000);
  };

  const updateProgress = () => {
    const total = state.questions.length;
    const answered = answeredCount();
    const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
    const currentQuestion = state.questions[state.currentIndex];
    const hasCurrentAnswer = Boolean(currentQuestion?.selectedOption);
    const canMoveNext =
      state.currentIndex < total - 1 &&
      (state.isSubmitted || (!isTimeOver() && hasCurrentAnswer));

    if (progressEl) {
      progressEl.textContent = `${answered}/${total} answered (${percent}%)`;
    }
    if (submitBtn) {
      submitBtn.disabled = state.isSubmitted || answered !== total || !total;
    }
    if (stopAttemptBtn) {
      stopAttemptBtn.disabled = state.isSubmitted || isTimeOver() || !total || state.isFinalizing;
    }
    if (nextBtn) {
      nextBtn.disabled = !canMoveNext;
    }
    if (prevBtn) {
      prevBtn.disabled = state.currentIndex <= 0 || (!state.isSubmitted && isTimeOver());
    }
  };

  const openStopModal = () => {
    if (!stopAttemptModal || state.isSubmitted || stopAttemptBtn?.disabled) return;
    stopAttemptModal.classList.add("open");
    stopAttemptModal.setAttribute("aria-hidden", "false");
  };

  const closeStopModal = () => {
    if (!stopAttemptModal) return;
    stopAttemptModal.classList.remove("open");
    stopAttemptModal.setAttribute("aria-hidden", "true");
  };

  const renderCurrentQuestion = () => {
    if (!state.questions.length) return;
    const current = state.questions[state.currentIndex];
    const total = state.questions.length;
    if (questionIndexEl) {
      questionIndexEl.textContent = `Question ${state.currentIndex + 1} of ${total}`;
    }
    if (questionTextEl) {
      questionTextEl.textContent = current.questionText;
    }
    if (optionsFormEl) {
      optionsFormEl.innerHTML = ["A", "B", "C", "D"]
        .map((option) => {
          const checked = current.selectedOption === option ? "checked" : "";
          const optionText = current[`option${option}`] || "";
          const disabled = state.isSubmitted ? "disabled" : "";
          return `
            <label class="attempt-option">
              <input type="radio" name="attemptOption" value="${option}" ${checked} ${disabled} />
              <span><strong>${option}.</strong> ${escapeHtml(optionText)}</span>
            </label>
          `;
        })
        .join("");
    }

    if (prevBtn) prevBtn.disabled = state.currentIndex <= 0 || (!state.isSubmitted && isTimeOver());
    updateProgress();
  };

  const renderReview = (details) => {
    if (!reviewWrap || !reviewTableBody) return;
    const questions = details.questions || [];
    reviewTableBody.innerHTML = questions
      .map((question) => {
        const selected = question.selectedOption || "-";
        const correct = question.correctOption || "-";
        const isCorrect = selected === correct;
        return `
          <tr>
            <td>${question.orderIndex}</td>
            <td>${escapeHtml(question.questionText)}</td>
            <td>${escapeHtml(selected)}</td>
            <td>${escapeHtml(correct)}</td>
            <td><span class="chip ${isCorrect ? "active" : "inactive"}">${isCorrect ? "Correct" : "Wrong"}</span></td>
            <td>${escapeHtml(question.explanation || "-")}</td>
          </tr>
        `;
      })
      .join("");
    reviewWrap.classList.remove("hidden");
  };

  const loadAttemptData = async () => {
    const [attemptMeta, questionsData] = await Promise.all([
      apiRequest({ path: `/student/attempts/${attemptId}`, token }),
      apiRequest({ path: `/student/attempts/${attemptId}/questions`, token }),
    ]);

    state.attempt = attemptMeta.attempt;
    state.questions = questionsData.questions || [];
    state.currentIndex = 0;
    state.isSubmitted = state.attempt?.status === "SUBMITTED";
    initLessonPlaybackMemory();
    if (state.isSubmitted) {
      clearLessonPlaybackState();
    }

    const mockTest = state.attempt?.mockTest;
    if (titleEl && mockTest) {
      titleEl.textContent = `${mockTest.title} | ${
        EXAM_LABELS[mockTest.examType] || mockTest.examType
      } | ${SUBJECT_LABELS[mockTest.subject] || mockTest.subject}`;
    }

    try {
      const lessonPayload = await apiRequest({
        path: `/student/mock-tests/${encodeURIComponent(state.attempt?.mockTestId || "")}/lesson-context`,
        token,
      });
      state.lessonContext = lessonPayload?.lesson || null;
    } catch {
      state.lessonContext = null;
    }
    await loadLessonTranscriptSegments();
    renderLessonContext();

    startCountdown();
    renderCurrentQuestion();

    if (state.isSubmitted) {
      const history = await apiRequest({
        path: `/student/history/${attemptId}`,
        token,
      });
      const submittedAttempt = history.attempt || {};
      if (resultScoreEl) {
        resultScoreEl.textContent = `${submittedAttempt.correctCount || 0}/${
          submittedAttempt.totalQuestions || 0
        }`;
      }
      if (resultRemarkEl) {
        resultRemarkEl.textContent = `${submittedAttempt.remarkText || "-"} (${Number(
          submittedAttempt.scorePercent || 0
        ).toFixed(2)}%)`;
      }
      renderReview(submittedAttempt);
      closeAttemptView("submitted");
      setStatus("Attempt already submitted. Showing review.", "success");
    }
  };

  const saveAnswer = async (questionId, selectedOption) => {
    await apiRequest({
      path: `/student/attempts/${attemptId}/answers`,
      method: "POST",
      token,
      body: { questionId, selectedOption },
    });
  };

  const submitAttempt = async () => {
    const data = await apiRequest({
      path: `/student/attempts/${attemptId}/submit`,
      method: "POST",
      token,
    });
    const result = data.result;
    if (resultScoreEl) {
      resultScoreEl.textContent = `${result.correctCount || 0}/${result.totalQuestions || 0}`;
    }
    if (resultRemarkEl) {
      resultRemarkEl.textContent = `${result.remarkText || "-"} (${Number(
        result.scorePercent || 0
      ).toFixed(2)}%)`;
    }
    state.isSubmitted = true;
    clearTimer();
    pauseLessonPlayers();
    clearLessonPlaybackState();
    setStatus("Attempt submitted successfully.", "success");

    const details = await apiRequest({
      path: `/student/history/${attemptId}`,
      token,
    });
    renderReview(details.attempt);
    closeAttemptView(state.closedSource || "submit");
  };

  const finalizeAttempt = async (source = "submit") => {
    if (state.isSubmitted || state.isFinalizing) return;
    state.isFinalizing = true;
    updateProgress();
    try {
      if (source === "time") {
        setStatus("Time is over. Submitting attempted answers...", "error");
      } else if (source === "stop") {
        setStatus("Stopping test and calculating score...", "error");
      } else {
        setStatus("Submitting attempt...", "error");
      }
      await submitAttempt();
      const total = Number(state.attempt?.totalQuestions || state.questions.length || 0);
      const attempted = answeredCount();
      const unattempted = Math.max(0, total - attempted);
      if (source === "time") {
        closeAttemptView("time");
        setStatus(`Time is over. Submitted with ${attempted} attempted, ${unattempted} unattempted.`, "success");
      } else if (source === "stop") {
        closeAttemptView("stop");
        setStatus(`Test stopped. Submitted with ${attempted} attempted, ${unattempted} unattempted.`, "success");
      } else {
        closeAttemptView("submit");
        setStatus("Attempt submitted successfully.", "success");
      }
    } catch (error) {
      setStatus(error?.message || "Unable to submit attempt", "error");
    } finally {
      state.isFinalizing = false;
      updateProgress();
    }
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./index.html";
    });
  }

  if (stopAttemptBtn) {
    stopAttemptBtn.addEventListener("click", () => {
      openStopModal();
    });
  }

  if (stopAttemptCloseBtn) {
    stopAttemptCloseBtn.addEventListener("click", () => {
      closeStopModal();
    });
  }

  if (stopAttemptCancelBtn) {
    stopAttemptCancelBtn.addEventListener("click", () => {
      closeStopModal();
    });
  }

  if (stopAttemptConfirmBtn) {
    stopAttemptConfirmBtn.addEventListener("click", async () => {
      closeStopModal();
      await finalizeAttempt("stop");
    });
  }

  if (stopAttemptModal) {
    stopAttemptModal.addEventListener("click", (event) => {
      if (event.target === stopAttemptModal) closeStopModal();
    });
  }

  if (lessonTranscriptEl instanceof HTMLElement) {
    lessonTranscriptEl.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const segmentButton = target.closest("[data-attempt-segment-index]");
      if (!(segmentButton instanceof HTMLElement)) return;
      const index = Number(segmentButton.getAttribute("data-attempt-segment-index"));
      const segment = state.lessonTranscriptSegments[index];
      if (!segment) return;
      const player = getCurrentLessonPlayer();
      if (!(player instanceof HTMLMediaElement)) return;
      const nextMs = seekLessonPlayerMs(player, Number(segment.startMs || 0));
      state.lessonPlaybackMs = nextMs;
      persistLessonPlaybackState({ force: true });
      syncLessonTranscriptToMs(nextMs, { autoScroll: true });
    });
  }

  if (optionsFormEl) {
    optionsFormEl.addEventListener("change", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.name !== "attemptOption") return;
      if (state.isSubmitted) return;
      if (isTimeOver()) return;

      const current = state.questions[state.currentIndex];
      if (!current) return;

      const selectedOption = target.value;
      current.selectedOption = selectedOption;
      updateProgress();

      try {
        setStatus("Saving answer...");
        await saveAnswer(current.questionId, selectedOption);
        setStatus("");
      } catch (error) {
        setStatus(error.message || "Failed to save answer", "error");
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      state.currentIndex = Math.max(0, state.currentIndex - 1);
      renderCurrentQuestion();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const currentQuestion = state.questions[state.currentIndex];
      if (!state.isSubmitted && !currentQuestion?.selectedOption) return;
      state.currentIndex = Math.min(state.questions.length - 1, state.currentIndex + 1);
      renderCurrentQuestion();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      if (state.isSubmitted) return;
      await finalizeAttempt("submit");
    });
  }

  if (backToTestsBtn instanceof HTMLAnchorElement) {
    backToTestsBtn.setAttribute("href", getMockTestsPagePath(user?.role || "STUDENT"));
    backToTestsBtn.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = getMockTestsPagePath(user?.role || "STUDENT");
    });
  }

  if (reattemptBtn instanceof HTMLButtonElement) {
    reattemptBtn.addEventListener("click", async () => {
      const mockTestId = String(state.attempt?.mockTestId || "").trim();
      if (!mockTestId) {
        setStatus("Mock test is unavailable for reattempt.", "error");
        return;
      }
      reattemptBtn.disabled = true;
      try {
        setStatus("Starting new attempt...");
        const response = await apiRequest({
          path: "/student/attempts",
          method: "POST",
          token,
          body: { mockTestId },
        });
        const newAttemptId = String(response?.attempt?.id || "").trim();
        if (!newAttemptId) {
          throw new Error("Unable to start reattempt.");
        }
        const params = new URLSearchParams();
        params.set("attemptId", newAttemptId);
        if (Number(state.lessonStartMs || 0) > 0) {
          params.set("lessonStartMs", String(Math.max(0, Math.round(Number(state.lessonStartMs || 0)))));
        }
        window.location.href = `${getMockAttemptPagePath()}?${params.toString()}`;
      } catch (error) {
        setStatus(error?.message || "Unable to start reattempt.", "error");
      } finally {
        reattemptBtn.disabled = false;
      }
    });
  }

  try {
    setStatus("Loading attempt...");
    await loadAttemptData();
    setStatus("");
  } catch (error) {
    if (error.status === 401) {
      clearAuth();
      window.location.href = "./index.html";
      return;
    }
    setStatus(error.message || "Unable to load attempt", "error");
  }

  window.addEventListener("beforeunload", () => {
    clearTimer();
    if (!state.isSubmitted) {
      persistLessonPlaybackState({ force: true });
    }
  });
});

