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
  };

  const setStatus = (text, type) => {
    if (!playerStatusEl) return;
    playerStatusEl.textContent = text || "";
    playerStatusEl.classList.remove("error", "success");
    if (type) playerStatusEl.classList.add(type);
  };

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
      saveProgress({ force: true, completed: true }).catch(() => {});
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
    }

    window.addEventListener("beforeunload", () => {
      stopSyncLoop();
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

    state.activeTranscriptIndex = -1;
    renderTranscript();
    toggleAssessmentButton();

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
      const testId = state.lesson?.assessmentTestId;
      if (!testId) return;
      const confirmed = await showConfirmDialog({
        title: "Confirm",
        message: "Are you sure you want to close transcript?",
        cancelText: "Cancel",
        confirmText: "Confirm",
      });
      if (!confirmed) return;

      try {
        setStatus(state.returnAttemptId ? "Returning to test..." : "Starting test attempt...");
        const lessonStartMs = getPlayerCurrentMs();
        await startAssessmentAttempt(token, testId, {
          lessonStartMs,
          autoplay: true,
          existingAttemptId: state.returnAttemptId || "",
          attemptQuestionIndex: state.returnAttemptQuestionIndex,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to start assessment.";
        setStatus(message, "error");
      }
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
});
