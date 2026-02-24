import {
  API_BASE,
  EXAM_LABELS,
  LANGUAGE_LABELS,
  REQUIRED_QUESTIONS_BY_SUBJECT,
  STREAM_LABELS,
  SUBJECT_LABELS,
  apiRequest,
  clearAuth,
  debugSyncLog,
  escapeHtml,
  formatDateTime,
  initHeaderBehavior,
  isDebugSyncEnabled,
  requireRoleGuard,
  requireRoleGuardStrict,
  showConfirmDialog,
} from "./mock-api.js?v=2";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("ADMIN");
  if (!auth) return;
  const strictAuth = await requireRoleGuardStrict(auth, "ADMIN");
  if (!strictAuth) return;
  const { token } = strictAuth;
  initHeaderBehavior();

  const messageEl = document.querySelector("#adminLessonsMessage");
  const messageToastEl = document.querySelector("#adminLessonsToast");
  const logoutBtn = document.querySelector("#adminLogoutBtn");
  const tabButtons = Array.from(document.querySelectorAll("[data-admin-tab]"));
  const tabPanels = Array.from(document.querySelectorAll("[data-admin-tab-panel]"));
  const testsModeButtons = Array.from(document.querySelectorAll("[data-tests-mode]"));

  const courseForm = document.querySelector("#courseForm");
  const courseIdInput = document.querySelector("#courseId");
  const courseTitleInput = document.querySelector("#courseTitle");
  const courseDescriptionInput = document.querySelector("#courseDescription");
  const courseIsActiveInput = document.querySelector("#courseIsActive");
  const courseSubmitBtn = document.querySelector("#courseSubmitBtn");
  const courseCancelBtn = document.querySelector("#courseCancelBtn");
  const coursesTableBody = document.querySelector("#coursesTableBody");

  const chapterContext = document.querySelector("#chapterContext");
  const chapterForm = document.querySelector("#chapterForm");
  const chapterIdInput = document.querySelector("#chapterId");
  const chapterCourseIdInput = document.querySelector("#chapterCourseId");
  const chapterTitleInput = document.querySelector("#chapterTitle");
  const chapterOrderIndexInput = document.querySelector("#chapterOrderIndex");
  const chapterDescriptionInput = document.querySelector("#chapterDescription");
  const chapterSubmitBtn = document.querySelector("#chapterSubmitBtn");
  const chapterCancelBtn = document.querySelector("#chapterCancelBtn");
  const chaptersTableBody = document.querySelector("#chaptersTableBody");

  const lessonContext = document.querySelector("#lessonContext");
  const lessonForm = document.querySelector("#lessonForm");
  const lessonIdInput = document.querySelector("#lessonId");
  const lessonCourseIdInput = document.querySelector("#lessonCourseId");
  const lessonChapterIdInput = document.querySelector("#lessonChapterId");
  const lessonSelectIdInput = document.querySelector("#lessonSelectId");
  const lessonTitleInput = document.querySelector("#lessonTitle");
  const lessonOrderIndexInput = document.querySelector("#lessonOrderIndex");
  const lessonDurationSecInput = document.querySelector("#lessonDurationSec");
  const lessonVideoUrlInput = document.querySelector("#lessonVideoUrl");
  const lessonTranscriptTextInput = document.querySelector("#lessonTranscriptText");
  const lessonUploadedAudioInput = document.querySelector("#lessonUploadedAudio");
  const lessonDurationHint = document.querySelector("#lessonDurationHint");
  const lessonAudioProviderInput = document.querySelector("#lessonAudioProvider");
  const lessonAudioLanguageInput = document.querySelector("#lessonAudioLanguage");
  const lessonAudioVoiceInput = document.querySelector("#lessonAudioVoice");
  const lessonCustomVoiceIdInput = document.querySelector("#lessonCustomVoiceId");
  const lessonAssessmentTestIdInput = document.querySelector("#lessonAssessmentTestId");
  const lessonSubmitBtn = document.querySelector("#lessonSubmitBtn");
  const lessonCancelBtn = document.querySelector("#lessonCancelBtn");
  const lessonsTableBody = document.querySelector("#lessonsTableBody");
  const btnPreviewVoice = document.querySelector("#btnPreviewVoice");
  const btnGenerateVoice = document.querySelector("#btnGenerateVoice");
  const btnCreateNewLesson = document.querySelector("#btnCreateNewLesson");
  const btnRefreshCustomVoices = document.querySelector("#btnRefreshCustomVoices");
  const btnCreateVoiceClone = document.querySelector("#btnCreateVoiceClone");
  const voiceCloneSection = document.querySelector("#voiceCloneSection");
  const cloneVoiceNameInput = document.querySelector("#cloneVoiceName");
  const cloneConsentStatementInput = document.querySelector("#cloneConsentStatement");
  const cloneConsentAudioInput = document.querySelector("#cloneConsentAudio");
  const cloneSampleAudioInput = document.querySelector("#cloneSampleAudio");
  const voiceStatus = document.querySelector("#voiceStatus");
  const voiceGenerationProgressWrap = document.querySelector("#voiceGenerationProgressWrap");
  const voiceGenerationProgressBar = document.querySelector("#voiceGenerationProgressBar");
  const voiceGenerationProgressPercent = document.querySelector("#voiceGenerationProgressPercent");
  const cloneVoiceStatus = document.querySelector("#cloneVoiceStatus");
  const lessonTrackingContext = document.querySelector("#lessonTrackingContext");
  const lessonTrackingSummary = document.querySelector("#lessonTrackingSummary");
  const lessonTrackingSearchInput = document.querySelector("#lessonTrackingSearch");
  const lessonTrackingRefreshBtn = document.querySelector("#lessonTrackingRefreshBtn");
  const lessonTrackingTableBody = document.querySelector("#lessonTrackingTableBody");
  const lessonMockContext = document.querySelector("#lessonMockContext");
  const lessonMockTestForm = document.querySelector("#lessonMockTestForm");
  const lessonMockTestIdInput = document.querySelector("#lessonMockTestId");
  const testsCreatePanel = document.querySelector("#testsCreatePanel");
  const testsAttachPanel = document.querySelector("#testsAttachPanel");
  const testsTrackPanel = document.querySelector("#testsTrackPanel");
  const testsAttachFilterRow = document.querySelector("#testsAttachFilterRow");
  const testsChapterDetailsPanel = document.querySelector("#testsChapterDetailsPanel");
  const lessonAttachFilterTypeInput = document.querySelector("#lessonAttachFilterType");
  const lessonAttachTestSearchInput = document.querySelector("#lessonAttachTestSearch");
  const mockLinkCourseIdInput = document.querySelector("#mockLinkCourseId");
  const mockLinkChapterIdInput = document.querySelector("#mockLinkChapterId");
  const mockLinkLessonIdInput = document.querySelector("#mockLinkLessonId");
  const lessonAttachExistingTestIdInput = document.querySelector("#lessonAttachExistingTestId");
  const btnAttachExistingTestToLesson = document.querySelector("#btnAttachExistingTestToLesson");
  const btnGoCreateTestMode = document.querySelector("#btnGoCreateTestMode");
  const lessonMockTestTitleInput = document.querySelector("#lessonMockTestTitle");
  const lessonMockTestExamTypeInput = document.querySelector("#lessonMockTestExamType");
  const lessonMockTestSubjectInput = document.querySelector("#lessonMockTestSubject");
  const lessonMockStreamWrap = document.querySelector("#lessonMockStreamWrap");
  const lessonMockLanguageWrap = document.querySelector("#lessonMockLanguageWrap");
  const lessonMockTestStreamChoiceInput = document.querySelector("#lessonMockTestStreamChoice");
  const lessonMockTestLanguageModeInput = document.querySelector("#lessonMockTestLanguageMode");
  const lessonMockTestAccessCodeInput = document.querySelector("#lessonMockTestAccessCode");
  const lessonMockTestIsActiveInput = document.querySelector("#lessonMockTestIsActive");
  const lessonMockSubmitBtn = document.querySelector("#lessonMockSubmitBtn");
  const lessonMockCancelBtn = document.querySelector("#lessonMockCancelBtn");
  const lessonQuestionBankPanel = document.querySelector("#lessonQuestionBankPanel");
  const lessonSelectedTestHint = document.querySelector("#lessonSelectedTestHint");
  const lessonQuestionCountWarning = document.querySelector("#lessonQuestionCountWarning");
  const lessonQuestionTargetCountInput = document.querySelector("#lessonQuestionTargetCount");
  const lessonQuestionForm = document.querySelector("#lessonQuestionForm");
  const lessonQuestionIdInput = document.querySelector("#lessonQuestionId");
  const lessonQuestionTextInput = document.querySelector("#lessonQuestionText");
  const lessonOptionAInput = document.querySelector("#lessonOptionA");
  const lessonOptionBInput = document.querySelector("#lessonOptionB");
  const lessonOptionCInput = document.querySelector("#lessonOptionC");
  const lessonOptionDInput = document.querySelector("#lessonOptionD");
  const lessonCorrectOptionInput = document.querySelector("#lessonCorrectOption");
  const lessonQuestionExplanationInput = document.querySelector("#lessonQuestionExplanation");
  const lessonQuestionIsActiveInput = document.querySelector("#lessonQuestionIsActive");
  const lessonQuestionSubmitBtn = document.querySelector("#lessonQuestionSubmitBtn");
  const lessonQuestionCancelBtn = document.querySelector("#lessonQuestionCancelBtn");
  const lessonQuestionsTableBody = document.querySelector("#lessonQuestionsTableBody");
  const lessonBulkImportTextInput = document.querySelector("#lessonBulkImportText");
  const lessonBulkImportBtn = document.querySelector("#lessonBulkImportBtn");
  const lessonBulkImportCsvFileInput = document.querySelector("#lessonBulkImportCsvFile");
  const lessonBulkImportReplaceExistingInput = document.querySelector("#lessonBulkImportReplaceExisting");
  const lessonBulkImportCsvBtn = document.querySelector("#lessonBulkImportCsvBtn");
  const lessonSaveTestBtn = document.querySelector("#lessonSaveTestBtn");
  const lessonMockTestsTableBody = document.querySelector("#lessonMockTestsTableBody");
  const lessonPreviewModal = document.querySelector("#lessonPreviewModal");
  const lessonPreviewClose = document.querySelector("#lessonPreviewClose");
  const lessonPreviewTitle = document.querySelector("#lessonPreviewTitle");
  const lessonPreviewMeta = document.querySelector("#lessonPreviewMeta");
  const lessonPreviewStatus = document.querySelector("#lessonPreviewStatus");
  const previewBtnModeVideo = document.querySelector("#previewBtnModeVideo");
  const previewBtnModeAudio = document.querySelector("#previewBtnModeAudio");
  const previewSettingsRow = document.querySelector("#previewSettingsRow");
  const previewSyncRow = document.querySelector("#previewSyncRow");
  const previewLineSyncRow = document.querySelector("#previewLineSyncRow");
  const previewManualStretchRow = document.querySelector("#previewManualStretchRow");
  const previewTranscriptSubtitle = document.querySelector("#previewTranscriptSubtitle");
  const previewScrollSpeedRow = document.querySelector("#previewScrollSpeedRow");
  const previewScrollSpeedInput = document.querySelector("#previewScrollSpeed");
  const previewHighlightModeInput = document.querySelector("#previewHighlightMode");
  const previewVoiceRateInput = document.querySelector("#previewVoiceRate");
  const previewTextRateInput = document.querySelector("#previewTextRate");
  const previewSyncOffsetInput = document.querySelector("#previewSyncOffsetInput");
  const previewSyncOffsetLabel = document.querySelector("#previewSyncOffsetLabel");
  const previewSyncOffsetManualInput = document.querySelector("#previewSyncOffsetManualInput");
  const previewSyncOffsetResetBtn = document.querySelector("#previewSyncOffsetReset");
  const previewLineSyncSelect = document.querySelector("#previewLineSyncSelect");
  const previewLineSyncMsInput = document.querySelector("#previewLineSyncMsInput");
  const previewLineSyncApplyBtn = document.querySelector("#previewLineSyncApply");
  const previewLineSyncResetBtn = document.querySelector("#previewLineSyncReset");
  const previewAudioCutStartInput = document.querySelector("#previewAudioCutStartInput");
  const previewAudioCutEndInput = document.querySelector("#previewAudioCutEndInput");
  const previewAudioCutStartManualInput = document.querySelector("#previewAudioCutStartManualInput");
  const previewAudioCutEndManualInput = document.querySelector("#previewAudioCutEndManualInput");
  const previewAudioCutSummary = document.querySelector("#previewAudioCutSummary");
  const previewAudioCutResetBtn = document.querySelector("#previewAudioCutReset");
  const previewTextStretchInput = document.querySelector("#previewTextStretchInput");
  const previewTextStretchManualInput = document.querySelector("#previewTextStretchManualInput");
  const previewTextStretchLabel = document.querySelector("#previewTextStretchLabel");
  const previewTextStretchResetBtn = document.querySelector("#previewTextStretchReset");
  const previewVideo = document.querySelector("#previewVideo");
  const previewAudio = document.querySelector("#previewAudio");
  const previewTranscriptList = document.querySelector("#previewTranscriptList");
  const previewAttemptTestBtn = document.querySelector("#previewAttemptTestBtn");
  const lessonQuestionEditModal = document.querySelector("#lessonQuestionEditModal");
  const lessonQuestionEditClose = document.querySelector("#lessonQuestionEditClose");
  const lessonQuestionEditForm = document.querySelector("#lessonQuestionEditForm");
  const lessonQuestionEditIdInput = document.querySelector("#lessonQuestionEditId");
  const lessonQuestionEditTextInput = document.querySelector("#lessonQuestionEditText");
  const lessonQuestionEditOptionAInput = document.querySelector("#lessonQuestionEditOptionA");
  const lessonQuestionEditOptionBInput = document.querySelector("#lessonQuestionEditOptionB");
  const lessonQuestionEditOptionCInput = document.querySelector("#lessonQuestionEditOptionC");
  const lessonQuestionEditOptionDInput = document.querySelector("#lessonQuestionEditOptionD");
  const lessonQuestionEditCorrectInput = document.querySelector("#lessonQuestionEditCorrect");
  const lessonQuestionEditExplanationInput = document.querySelector("#lessonQuestionEditExplanation");
  const lessonQuestionEditIsActiveInput = document.querySelector("#lessonQuestionEditIsActive");
  const lessonQuestionEditCancelBtn = document.querySelector("#lessonQuestionEditCancelBtn");

  // Keep test creation selectors at top of Tests tab, with transcript/settings below.
  if (lessonMockTestForm instanceof HTMLElement && testsChapterDetailsPanel instanceof HTMLElement) {
    lessonMockTestForm.insertAdjacentElement("afterend", testsChapterDetailsPanel);
  }

  if (btnGenerateVoice instanceof HTMLButtonElement) {
    btnGenerateVoice.disabled = true;
    btnGenerateVoice.title = "Create or load a lesson first.";
  }

  const state = {
    courses: [],
    chapters: [],
    lessons: [],
    mockTests: [],
    customVoices: [],
    mockTestsAdmin: [],
    mockChapters: [],
    mockLessons: [],
    trackingLessons: [],
    trackingSummary: null,
    selectedCourseId: "",
    selectedChapterId: "",
    selectedMockCourseId: "",
    selectedMockChapterId: "",
    selectedMockLessonId: "",
    selectedMockTestId: "",
    mockQuestions: [],
    hasPendingTestChanges: false,
    testsMode: "create",
    createdTestIds: [],
    lastAutoMockTitle: "",
    currentTab: "courses",
    previewAudioUrl: "",
    previewAudioPlayer: null,
  };

  const previewState = {
    lesson: null,
    hasVideo: false,
    hasAudio: false,
    mode: "audio",
    voiceRate: 1,
    textRate: 1,
    syncOffsetMs: 0,
    textRateManual: false,
    lineOffsetMsByIndex: {},
    highlightMode: "auto",
    useWordHighlight: true,
    wordHighlightReliable: false,
    inlineTranscriptSegments: [],
    lineTranscriptSegments: [],
    transcriptSegments: [],
    transcriptWords: [],
    transcriptTextTokens: [],
    liveWordTextByIndex: [],
    wordLineIndexByWordIndex: [],
    transcriptWordElements: [],
    transcriptSegmentElements: [],
    activeSegmentIndex: -1,
    activeWordIndex: -1,
    lastAutoScrollAt: 0,
    lastProductionScrollAt: 0,
    searchWordIndex: -1,
    searchSegmentIndex: -1,
    timelineScale: 1,
    timelineOffsetMs: 0,
    hasWordTimestamps: false,
    audioCutStartMs: 0,
    audioCutEndMs: 0,
    textStretchPercent: 100,
    lastSyncLogAt: 0,
    lastSyncLogKey: "",
    renderedProductionTranscriptText: "",
    productionMode: false,
    scrollSpeed: "normal",
    productionScrollVirtual: 0,
  };

  let voiceGenerationProgressTimer = null;
  let voiceGenerationHideTimer = null;
  let voiceGenerationProgressValue = 0;
  let previewSyncRafId = 0;

  const goAdminLogin = () => {
    window.location.href = "./admin-login.html";
  };
  const getMockAttemptPath = () => {
    const pathname = (window.location.pathname || "").toLowerCase();
    const extensionless = Boolean(pathname) && !pathname.endsWith(".html") && pathname !== "/";
    return extensionless ? "./mock-attempt" : "./mock-attempt.html";
  };
  const getLessonPlayerPath = () => {
    const pathname = (window.location.pathname || "").toLowerCase();
    const extensionless = Boolean(pathname) && !pathname.endsWith(".html") && pathname !== "/";
    return extensionless ? "./lesson-player" : "./lesson-player.html";
  };

  let toastTimer = null;
  const showToast = (text, type) => {
    if (!messageToastEl || !text || !type) return;
    messageToastEl.textContent = text;
    messageToastEl.classList.remove("success", "error", "open");
    messageToastEl.classList.add(type, "open");
    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }
    toastTimer = window.setTimeout(() => {
      messageToastEl.classList.remove("open");
      toastTimer = null;
    }, 3200);
  };

  const setMessage = (text, type) => {
    if (!messageEl) return;
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (type) messageEl.classList.add(type);
    if (!text && messageToastEl) {
      messageToastEl.classList.remove("open");
    }
    if (type === "error" || type === "success") {
      showToast(text, type);
    }
  };

  const setVoiceStatus = (text, type) => {
    if (!voiceStatus) return;
    voiceStatus.textContent = text || "";
    voiceStatus.classList.remove("error", "success");
    if (type) voiceStatus.classList.add(type);
  };

  const setCloneVoiceStatus = (text, type) => {
    if (!cloneVoiceStatus) return;
    cloneVoiceStatus.textContent = text || "";
    cloneVoiceStatus.classList.remove("error", "success");
    if (type) cloneVoiceStatus.classList.add(type);
  };

  const setVoiceGenerationProgress = (percent) => {
    const safe = Math.max(0, Math.min(100, Math.round(Number(percent || 0))));
    voiceGenerationProgressValue = safe;
    if (voiceGenerationProgressBar instanceof HTMLElement) {
      voiceGenerationProgressBar.style.width = `${safe}%`;
    }
    if (voiceGenerationProgressPercent instanceof HTMLElement) {
      voiceGenerationProgressPercent.textContent = `${safe}%`;
    }
  };

  const clearVoiceGenerationProgressTimers = () => {
    if (voiceGenerationProgressTimer) {
      window.clearInterval(voiceGenerationProgressTimer);
      voiceGenerationProgressTimer = null;
    }
    if (voiceGenerationHideTimer) {
      window.clearTimeout(voiceGenerationHideTimer);
      voiceGenerationHideTimer = null;
    }
  };

  const startVoiceGenerationProgress = (transcriptText) => {
    clearVoiceGenerationProgressTimers();
    if (voiceGenerationProgressWrap instanceof HTMLElement) {
      voiceGenerationProgressWrap.classList.remove("hidden");
    }
    setVoiceGenerationProgress(1);

    const wordCount = String(transcriptText || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const expectedMs = Math.min(180000, Math.max(14000, wordCount * 520));
    const tickMs = 300;
    const maxAutoPercent = 93;
    const steps = Math.max(1, Math.ceil(expectedMs / tickMs));
    const step = maxAutoPercent / steps;

    voiceGenerationProgressTimer = window.setInterval(() => {
      const jitter = 0.7 + Math.random() * 0.7;
      const next = Math.min(maxAutoPercent, voiceGenerationProgressValue + step * jitter);
      setVoiceGenerationProgress(next);
      if (next >= maxAutoPercent) {
        clearVoiceGenerationProgressTimers();
      }
    }, tickMs);
  };

  const finishVoiceGenerationProgress = (success) => {
    clearVoiceGenerationProgressTimers();
    if (success) {
      setVoiceGenerationProgress(100);
      voiceGenerationHideTimer = window.setTimeout(() => {
        if (voiceGenerationProgressWrap instanceof HTMLElement) {
          voiceGenerationProgressWrap.classList.add("hidden");
        }
      }, 1200);
      return;
    }

    if (voiceGenerationProgressWrap instanceof HTMLElement) {
      voiceGenerationProgressWrap.classList.add("hidden");
    }
  };

  const stopVoicePreview = () => {
    if (state.previewAudioPlayer instanceof HTMLAudioElement) {
      state.previewAudioPlayer.pause();
      state.previewAudioPlayer.src = "";
      state.previewAudioPlayer = null;
    }
    if (state.previewAudioUrl) {
      URL.revokeObjectURL(state.previewAudioUrl);
      state.previewAudioUrl = "";
    }
  };

  const setPreviewStatus = (text, type) => {
    if (!lessonPreviewStatus) return;
    lessonPreviewStatus.textContent = text || "";
    lessonPreviewStatus.classList.remove("error", "success");
    if (type) lessonPreviewStatus.classList.add(type);
  };

  const normalizeAssetUrl = (input) => {
    const raw = String(input || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("/")) return `${API_BASE}${raw}`;
    return `${API_BASE}/${raw.replace(/^\.\//, "")}`;
  };

  const parseInlineTranscriptSegments = (payload) => {
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

    const normalized = collection
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

    return normalized.map((item) => ({
      startMs: Math.round(treatAsSeconds ? item.start * 1000 : item.start),
      endMs: Math.round(treatAsSeconds ? item.end * 1000 : item.end),
      text: item.text,
    }));
  };

  const parseInlineTranscriptWords = (payload) => {
    let source = payload;
    if (typeof source === "string") {
      try {
        source = JSON.parse(source);
      } catch {
        source = [];
      }
    }

    const collection = Array.isArray(source?.words) ? source.words : [];
    const normalized = collection
      .map((item) => ({
        start: Number(item?.startMs ?? item?.start ?? item?.from ?? 0),
        end: Number(item?.endMs ?? item?.end ?? item?.to ?? 0),
        text: String(item?.text ?? item?.word ?? "").trim(),
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

    return normalized.map((item) => ({
      startMs: Math.round(treatAsSeconds ? item.start * 1000 : item.start),
      endMs: Math.round(treatAsSeconds ? item.end * 1000 : item.end),
      text: item.text,
    }));
  };

  const buildTranscriptWordView = (transcriptText, timedWords) => {
    const normalizedText = String(transcriptText || "").replace(/\r\n?/g, "\n");
    const safeTimedWords = Array.isArray(timedWords) ? timedWords : [];
    const normalizeWord = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    const buildLcsPairs = (left, right) => {
      const rowCount = left.length + 1;
      const colCount = right.length + 1;
      const dp = Array.from({ length: rowCount }, () => new Uint16Array(colCount));

      for (let row = 1; row < rowCount; row += 1) {
        for (let col = 1; col < colCount; col += 1) {
          if (left[row - 1] === right[col - 1]) {
            dp[row][col] = dp[row - 1][col - 1] + 1;
          } else {
            dp[row][col] = Math.max(dp[row - 1][col], dp[row][col - 1]);
          }
        }
      }

      const pairs = [];
      let row = left.length;
      let col = right.length;
      while (row > 0 && col > 0) {
        if (left[row - 1] === right[col - 1]) {
          pairs.push([row - 1, col - 1]);
          row -= 1;
          col -= 1;
          continue;
        }
        if (dp[row - 1][col] >= dp[row][col - 1]) {
          row -= 1;
        } else {
          col -= 1;
        }
      }
      pairs.reverse();
      return pairs;
    };

    if (!normalizedText.trim()) {
      const fallbackWords = safeTimedWords.map((word) => ({
        startMs: Number(word.startMs || 0),
        endMs: Number(word.endMs || 0),
        text: String(word.text || "").trim(),
      }));
      const tokens = fallbackWords.map((word, index) => ({
        text: index < fallbackWords.length - 1 ? `${word.text} ` : word.text,
        timedWordIndex: index,
      }));
      return {
        words: fallbackWords,
        tokens,
        quality: {
          mappedCoverage: fallbackWords.length ? 1 : 0,
          distinctWordCoverage: fallbackWords.length ? 1 : 0,
          reliable: Boolean(fallbackWords.length),
        },
      };
    }

    const splitTokens = normalizedText.match(/(\s+|[^\s]+)/g) || [];
    const textWordTokens = [];
    splitTokens.forEach((token, tokenIndex) => {
      if (/^\s+$/.test(token)) return;
      const normalized = normalizeWord(token);
      if (!normalized) return;
      textWordTokens.push({
        tokenIndex,
        normalized,
      });
    });

    const normalizedTimedWords = safeTimedWords
      .map((word) => ({
        startMs: Number(word.startMs || 0),
        endMs: Number(word.endMs || 0),
        text: String(word.text || "").trim(),
        normalized: normalizeWord(word.text),
      }))
      .filter(
        (word) =>
          Number.isFinite(word.startMs) &&
          Number.isFinite(word.endMs) &&
          word.endMs > word.startMs &&
          word.text
      )
      .map((word, timedWordIndex) => ({
        ...word,
        timedWordIndex,
      }));

    const timedWordsForMatch = normalizedTimedWords.filter((word) => word.normalized);
    const tokenToTimedWordIndex = new Map();
    const clampTimedWordIndex = (value) => {
      if (!normalizedTimedWords.length) return -1;
      const next = Number(value);
      if (!Number.isFinite(next)) return -1;
      return Math.max(0, Math.min(normalizedTimedWords.length - 1, Math.round(next)));
    };

    if (textWordTokens.length && timedWordsForMatch.length) {
      const rawPairs = buildLcsPairs(
        textWordTokens.map((token) => token.normalized),
        timedWordsForMatch.map((word) => word.normalized)
      );
      const matchedPairs = rawPairs.map(([textWordIndex, timedWordMatchIndex]) => ({
        textWordIndex,
        timedWordIndex: timedWordsForMatch[timedWordMatchIndex].timedWordIndex,
      }));
      const exactTextWordMap = new Map(matchedPairs.map((pair) => [pair.textWordIndex, pair.timedWordIndex]));

      let pairCursor = 0;
      textWordTokens.forEach((token, textWordIndex) => {
        if (exactTextWordMap.has(textWordIndex)) {
          tokenToTimedWordIndex.set(token.tokenIndex, Number(exactTextWordMap.get(textWordIndex)));
          return;
        }

        while (pairCursor < matchedPairs.length && matchedPairs[pairCursor].textWordIndex < textWordIndex) {
          pairCursor += 1;
        }

        const previousPair = pairCursor > 0 ? matchedPairs[pairCursor - 1] : null;
        const nextPair = pairCursor < matchedPairs.length ? matchedPairs[pairCursor] : null;

        let resolvedTimedWordIndex = -1;
        if (previousPair && nextPair && nextPair.textWordIndex > previousPair.textWordIndex) {
          const textSpan = nextPair.textWordIndex - previousPair.textWordIndex;
          const timedSpan = nextPair.timedWordIndex - previousPair.timedWordIndex;
          const offset = textWordIndex - previousPair.textWordIndex;
          resolvedTimedWordIndex =
            timedSpan > 0
              ? Math.round(previousPair.timedWordIndex + (offset / textSpan) * timedSpan)
              : previousPair.timedWordIndex;
        } else if (previousPair) {
          resolvedTimedWordIndex = previousPair.timedWordIndex;
        } else if (nextPair) {
          resolvedTimedWordIndex = nextPair.timedWordIndex;
        }

        tokenToTimedWordIndex.set(token.tokenIndex, clampTimedWordIndex(resolvedTimedWordIndex));
      });
    }

    const applyPositionalFallbackMap = () => {
      if (!textWordTokens.length || !normalizedTimedWords.length) return;
      const textSize = textWordTokens.length;
      const timedSize = normalizedTimedWords.length;
      textWordTokens.forEach((token, textWordIndex) => {
        const ratio = textSize <= 1 ? 0 : textWordIndex / (textSize - 1);
        const timedWordIndex = clampTimedWordIndex(ratio * (timedSize - 1));
        tokenToTimedWordIndex.set(token.tokenIndex, timedWordIndex);
      });
    };

    const mappedTokenCount = textWordTokens.reduce((count, token) => {
      const value = tokenToTimedWordIndex.get(token.tokenIndex);
      return count + (Number.isFinite(value) && Number(value) >= 0 ? 1 : 0);
    }, 0);
    const mappedCoverage = textWordTokens.length ? mappedTokenCount / textWordTokens.length : 0;
    if (mappedCoverage < 0.35) {
      tokenToTimedWordIndex.clear();
      applyPositionalFallbackMap();
    }

    const tokens = splitTokens.map((token, tokenIndex) => {
      if (/^\s+$/.test(token)) return { text: token, timedWordIndex: -1 };
      return {
        text: token,
        timedWordIndex: tokenToTimedWordIndex.get(tokenIndex) ?? -1,
      };
    });

    const distinctTimedWordIndexCount = (() => {
      const set = new Set();
      tokens.forEach((token) => {
        const index = Number(token?.timedWordIndex ?? -1);
        if (Number.isFinite(index) && index >= 0) {
          set.add(index);
        }
      });
      return set.size;
    })();
    const distinctWordCoverage = normalizedTimedWords.length
      ? distinctTimedWordIndexCount / normalizedTimedWords.length
      : 0;
    const reliable = mappedCoverage >= 0.55 && distinctWordCoverage >= 0.22;

    return {
      words: normalizedTimedWords.map((word) => ({
        startMs: word.startMs,
        endMs: word.endMs,
        text: word.text,
      })),
      tokens,
      quality: {
        mappedCoverage,
        distinctWordCoverage,
        reliable,
      },
    };
  };

  const buildSequencedWordView = (transcriptText, timedWords, totalDurationMs) => {
    const normalizedText = String(transcriptText || "").replace(/\r\n?/g, "\n");
    const splitTokens = normalizedText.match(/(\s+|[^\s]+)/g) || [];
    const wordTokenIndexes = [];
    splitTokens.forEach((token, tokenIndex) => {
      if (!/^\s+$/.test(token)) {
        wordTokenIndexes.push(tokenIndex);
      }
    });

    if (!wordTokenIndexes.length) {
      return {
        words: [],
        tokens: [],
        quality: {
          mappedCoverage: 0,
          distinctWordCoverage: 0,
          reliable: false,
        },
      };
    }

    const timelineWords = Array.isArray(timedWords)
      ? timedWords
          .map((word) => ({
            startMs: Math.max(0, Math.round(Number(word?.startMs || 0))),
            endMs: Math.max(1, Math.round(Number(word?.endMs || 0))),
          }))
          .filter((word) => Number.isFinite(word.startMs) && Number.isFinite(word.endMs) && word.endMs > word.startMs)
      : [];
    const transcriptWordCount = wordTokenIndexes.length;

    let boundaries = [];
    if (timelineWords.length) {
      const timelineBoundaryCount = timelineWords.length + 1;
      const timelineBoundaries = new Array(timelineBoundaryCount).fill(0);
      timelineBoundaries[0] = timelineWords[0].startMs;
      for (let index = 1; index < timelineWords.length; index += 1) {
        const previousEnd = Number(timelineWords[index - 1].endMs || 0);
        const nextStart = Number(timelineWords[index].startMs || previousEnd);
        const midpoint = nextStart >= previousEnd ? Math.round((previousEnd + nextStart) / 2) : nextStart;
        timelineBoundaries[index] = Math.max(timelineBoundaries[index - 1], midpoint);
      }
      timelineBoundaries[timelineBoundaryCount - 1] = Math.max(
        timelineBoundaries[timelineBoundaryCount - 2] || 0,
        Number(timelineWords[timelineWords.length - 1].endMs || 0)
      );

      boundaries = new Array(transcriptWordCount + 1).fill(0);
      for (let boundaryIndex = 0; boundaryIndex <= transcriptWordCount; boundaryIndex += 1) {
        const position = transcriptWordCount <= 0 ? 0 : (boundaryIndex / transcriptWordCount) * timelineWords.length;
        const lowerIndex = Math.max(0, Math.min(timelineBoundaries.length - 1, Math.floor(position)));
        const upperIndex = Math.max(lowerIndex, Math.min(timelineBoundaries.length - 1, Math.ceil(position)));
        const fraction = position - lowerIndex;
        const lowerValue = Number(timelineBoundaries[lowerIndex] || 0);
        const upperValue = Number(timelineBoundaries[upperIndex] || lowerValue);
        boundaries[boundaryIndex] = Math.round(lowerValue + (upperValue - lowerValue) * fraction);
      }
    } else {
      const totalMs = Math.max(1000, Number(totalDurationMs || 0), transcriptWordCount * 220);
      const eachMs = Math.max(60, Math.floor(totalMs / transcriptWordCount));
      boundaries = new Array(transcriptWordCount + 1).fill(0).map((_, index) => index * eachMs);
      boundaries[transcriptWordCount] = Math.max(boundaries[transcriptWordCount], totalMs);
    }

    for (let index = 1; index < boundaries.length; index += 1) {
      if (boundaries[index] <= boundaries[index - 1]) {
        boundaries[index] = boundaries[index - 1] + 1;
      }
    }

    const words = wordTokenIndexes.map((tokenIndex, wordIndex) => {
      const startMs = Math.max(0, Math.round(Number(boundaries[wordIndex] || 0)));
      const endMs = Math.max(startMs + 1, Math.round(Number(boundaries[wordIndex + 1] || startMs + 1)));
      return {
        sequence: wordIndex + 1,
        startMs,
        endMs,
        text: String(splitTokens[tokenIndex] || "").trim(),
      };
    });

    let currentWordIndex = 0;
    const tokens = splitTokens.map((token) => {
      if (/^\s+$/.test(token)) {
        return { text: token, timedWordIndex: -1 };
      }
      const timedWordIndex = currentWordIndex;
      currentWordIndex += 1;
      return { text: token, timedWordIndex };
    });

    return {
      words,
      tokens,
      quality: {
        mappedCoverage: 1,
        distinctWordCoverage: 1,
        reliable: true,
      },
    };
  };

  const buildFallbackSegments = (lesson) => {
    const transcriptText = String(lesson?.transcriptText || "").replace(/\r\n?/g, "\n").trim();
    if (!transcriptText) return [];

    const lines = transcriptText
      .split(/\n+/)
      .flatMap((line) => line.match(/[^.?!]+[.?!]?/g) || [])
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return [];

    const totalDurationMs = Math.max(
      Number(lesson?.audioDurationMs || 0),
      Number(lesson?.durationSec || 0) * 1000,
      lines.length * 3000
    );
    const perLineMs = Math.max(1200, Math.floor(totalDurationMs / lines.length));

    return lines.map((text, index) => {
      const startMs = index * perLineMs;
      return {
        startMs,
        endMs: startMs + perLineMs,
        text,
      };
    });
  };

  const buildTextAlignedSegments = (transcriptText, timedWords, totalDurationMs) => {
    const normalizedText = String(transcriptText || "").replace(/\r\n?/g, "\n").trim();
    if (!normalizedText) return [];

    const rawChunks = normalizedText
      .split(/\n+/)
      .flatMap((line) => line.match(/[^.?!\n]+[.?!]?/g) || [line])
      .map((line) => line.trim())
      .filter(Boolean);
    const chunkByText = rawChunks.flatMap((chunk) => {
      const words = chunk.split(/\s+/).filter(Boolean);
      if (words.length <= 16) return [chunk];
      const pieces = [];
      for (let index = 0; index < words.length; index += 12) {
        pieces.push(words.slice(index, index + 12).join(" "));
      }
      return pieces;
    });
    if (!chunkByText.length) return [];

    const normalizeWord = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    const tokenCounts = chunkByText.map((chunk) => {
      const count = (chunk.match(/[^\s]+/g) || [])
        .map((token) => normalizeWord(token))
        .filter(Boolean).length;
      return Math.max(1, count);
    });
    const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);

    const words = Array.isArray(timedWords)
      ? timedWords
          .map((word) => ({
            startMs: Number(word?.startMs || 0),
            endMs: Number(word?.endMs || 0),
          }))
          .filter(
            (word) =>
              Number.isFinite(word.startMs) &&
              Number.isFinite(word.endMs) &&
              word.startMs >= 0 &&
              word.endMs > word.startMs
          )
      : [];

    const hasTimedWords = words.length > 0;
    const totalMs = Math.max(Number(totalDurationMs || 0), 1000);
    const result = [];
    let cursorTokens = 0;

    chunkByText.forEach((text, index) => {
      const chunkTokens = tokenCounts[index];
      const startToken = cursorTokens;
      const endToken = cursorTokens + chunkTokens - 1;
      cursorTokens += chunkTokens;

      let startMs = 0;
      let endMs = 0;

      if (hasTimedWords) {
        const maxWordIndex = words.length - 1;
        const startRatio = totalTokens <= 1 ? 0 : startToken / (totalTokens - 1);
        const endRatio = totalTokens <= 1 ? 1 : endToken / (totalTokens - 1);
        const startWordIndex = Math.max(0, Math.min(maxWordIndex, Math.round(startRatio * maxWordIndex)));
        const endWordIndex = Math.max(startWordIndex, Math.min(maxWordIndex, Math.round(endRatio * maxWordIndex)));
        startMs = Number(words[startWordIndex]?.startMs || 0);
        endMs = Number(words[endWordIndex]?.endMs || startMs + 240);
      } else {
        const startRatio = totalTokens <= 1 ? 0 : startToken / totalTokens;
        const endRatio = totalTokens <= 1 ? 1 : (endToken + 1) / totalTokens;
        startMs = Math.round(startRatio * totalMs);
        endMs = Math.round(endRatio * totalMs);
      }

      result.push({
        startMs: Math.max(0, Math.round(startMs)),
        endMs: Math.max(1, Math.round(endMs)),
        text,
      });
    });

    if (!result.length) return [];

    // Enforce monotonic non-overlapping timeline for smooth line stepping.
    for (let index = 0; index < result.length; index += 1) {
      const segment = result[index];
      if (index > 0) {
        const previous = result[index - 1];
        if (segment.startMs <= previous.endMs) {
          segment.startMs = previous.endMs + 1;
        }
      }
      if (segment.endMs <= segment.startMs) {
        segment.endMs = segment.startMs + 220;
      }
    }

    return result;
  };

  const buildFallbackTimedWordsFromText = (transcriptText, totalDurationMs) => {
    const text = String(transcriptText || "").replace(/\r\n?/g, "\n").trim();
    if (!text) return [];
    const tokens = text.split(/\s+/).map((token) => token.trim()).filter(Boolean);
    if (!tokens.length) return [];

    const totalMs = Math.max(1000, Number(totalDurationMs || 0), tokens.length * 260);
    const perWordMs = Math.max(90, Math.floor(totalMs / tokens.length));

    return tokens.map((textValue, index) => {
      const startMs = index * perWordMs;
      return {
        startMs,
        endMs: startMs + perWordMs,
        text: textValue,
      };
    });
  };

  const buildTimedWordsFromSegments = (segments) => {
    if (!Array.isArray(segments) || !segments.length) return [];

    const words = [];
    segments.forEach((segment) => {
      const rawText = String(segment?.text || "").trim();
      const startMs = Math.max(0, Math.round(Number(segment?.startMs || 0)));
      const endMs = Math.max(startMs + 1, Math.round(Number(segment?.endMs || 0)));
      if (!rawText || endMs <= startMs) return;

      const tokens = rawText.split(/\s+/).map((token) => token.trim()).filter(Boolean);
      if (!tokens.length) return;

      const totalSpanMs = Math.max(120, endMs - startMs);
      const weights = tokens.map((token) => {
        const normalized = token.replace(/[^\p{L}\p{N}]+/gu, "");
        return Math.max(1, normalized.length || token.length);
      });
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || tokens.length;

      let cursorMs = startMs;
      tokens.forEach((token, tokenIndex) => {
        const isLast = tokenIndex === tokens.length - 1;
        const shareMs = isLast
          ? Math.max(60, endMs - cursorMs)
          : Math.max(60, Math.round((totalSpanMs * weights[tokenIndex]) / totalWeight));
        const wordStartMs = cursorMs;
        const wordEndMs = isLast ? endMs : Math.min(endMs, cursorMs + shareMs);
        if (wordEndMs > wordStartMs) {
          words.push({
            startMs: wordStartMs,
            endMs: wordEndMs,
            text: token,
          });
        }
        cursorMs = wordEndMs;
      });
    });

    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      if (index > 0) {
        const previous = words[index - 1];
        if (word.startMs < previous.startMs) {
          word.startMs = previous.startMs;
        }
      }
      if (word.endMs <= word.startMs) {
        word.endMs = word.startMs + 60;
      }
    }

    return words;
  };

  const buildWordLineIndexMap = (words, lineSegments) => {
    if (!Array.isArray(words) || !words.length || !Array.isArray(lineSegments) || !lineSegments.length) {
      return [];
    }

    return words.map((word) => {
      const midpoint = Math.max(0, Math.floor((Number(word.startMs || 0) + Number(word.endMs || 0)) / 2));
      const lineIndex = findTimedIndexAtTime(lineSegments, midpoint);
      return lineIndex >= 0 ? lineIndex : 0;
    });
  };

  const getPreviewPlayer = () => {
    if (previewState.mode === "audio" && previewState.hasAudio && previewAudio instanceof HTMLAudioElement) {
      return previewAudio;
    }
    if (previewState.hasVideo && previewVideo instanceof HTMLVideoElement) return previewVideo;
    if (previewState.hasAudio && previewAudio instanceof HTMLAudioElement) return previewAudio;
    return null;
  };

  const getPreviewDurationForTiming = () => {
    const player = getPreviewPlayer();
    const playerDurationSec = Number(player?.duration || 0);
    if (Number.isFinite(playerDurationSec) && playerDurationSec > 0) {
      return Math.round(playerDurationSec * 1000);
    }
    const lessonAudioDuration = Number(previewState.lesson?.audioDurationMs || 0);
    if (Number.isFinite(lessonAudioDuration) && lessonAudioDuration > 0) {
      return Math.round(lessonAudioDuration);
    }
    const lessonVideoDurationSec = Number(previewState.lesson?.durationSec || 0);
    if (Number.isFinite(lessonVideoDurationSec) && lessonVideoDurationSec > 0) {
      return Math.round(lessonVideoDurationSec * 1000);
    }
    return 0;
  };

  const getPreviewAudioCutWindow = () => {
    const durationMs = Math.max(0, Math.round(Number(getPreviewDurationForTiming() || 0)));
    if (durationMs <= 0) {
      return {
        durationMs: 0,
        startCutMs: 0,
        endCutMs: 0,
        windowStartMs: 0,
        windowEndMs: 0,
        windowDurationMs: 0,
      };
    }
    const startCutMs = Math.max(0, Math.min(durationMs - 200, Math.round(Number(previewState.audioCutStartMs || 0))));
    const maxEndCutMs = Math.max(0, durationMs - startCutMs - 200);
    const endCutMs = Math.max(0, Math.min(maxEndCutMs, Math.round(Number(previewState.audioCutEndMs || 0))));
    const windowStartMs = startCutMs;
    const windowEndMs = Math.max(windowStartMs + 1, durationMs - endCutMs);
    const windowDurationMs = Math.max(1, windowEndMs - windowStartMs);
    return {
      durationMs,
      startCutMs,
      endCutMs,
      windowStartMs,
      windowEndMs,
      windowDurationMs,
    };
  };

  const formatAudioCutSummary = (startCutMs, endCutMs) =>
    `Start ${Math.max(0, Math.round(Number(startCutMs || 0)))} ms | End ${Math.max(
      0,
      Math.round(Number(endCutMs || 0))
    )} ms`;

  const getPreviewTimingCollection = () => {
    if (previewState.useWordHighlight && previewState.transcriptWords.length) {
      return previewState.transcriptWords;
    }
    if (previewState.transcriptSegments.length) {
      return previewState.transcriptSegments;
    }
    if (previewState.lineTranscriptSegments.length) {
      return previewState.lineTranscriptSegments;
    }
    if (previewState.inlineTranscriptSegments.length) {
      return previewState.inlineTranscriptSegments;
    }
    return [];
  };

  const syncPreviewTimelineCalibration = () => {
    previewState.timelineScale = 1;
    previewState.timelineOffsetMs = 0;

    const collection = getPreviewTimingCollection();
    if (!collection.length) return;

    const firstStartMs = Math.max(0, Math.round(Number(collection[0]?.startMs || 0)));
    const lastEndMs = Math.max(firstStartMs + 1, Math.round(Number(collection[collection.length - 1]?.endMs || 0)));
    const timelineSpanMs = Math.max(1, lastEndMs - firstStartMs);
    if (timelineSpanMs <= 0) return;
    // Keep strict timestamp mapping by default: audio clock -> transcript clock.
    // Any stretch/concise correction is done only by explicit manual controls.
    previewState.timelineScale = 1;
    previewState.timelineOffsetMs = firstStartMs;
  };

  const toHighlightTimeMs = (rawTimeMs) => {
    const raw = Math.max(0, Number(rawTimeMs || 0));
    const cutWindow = getPreviewAudioCutWindow();
    let adjustedRaw = raw;
    if (cutWindow.durationMs > 0) {
      const clamped = Math.max(cutWindow.windowStartMs, Math.min(cutWindow.windowEndMs, raw));
      adjustedRaw = Math.max(0, clamped - cutWindow.windowStartMs);
    }
    const timelineScale = Number(previewState.timelineScale || 1);
    const safeTimelineScale = Number.isFinite(timelineScale) && timelineScale > 0 ? timelineScale : 1;
    const timelineOffsetMs = Number(previewState.timelineOffsetMs || 0);
    const safeTimelineOffset = Number.isFinite(timelineOffsetMs) ? Math.round(timelineOffsetMs) : 0;
    const alignedTimeMs = Math.max(0, Math.round(adjustedRaw * safeTimelineScale) + safeTimelineOffset);
    const stretchPercent = Number(previewState.textStretchPercent || 100);
    const stretchScale = Number.isFinite(stretchPercent)
      ? Math.max(0.6, Math.min(1.8, stretchPercent / 100))
      : 1;
    const stretchedTimeMs =
      safeTimelineOffset + Math.max(0, Math.round((alignedTimeMs - safeTimelineOffset) * stretchScale));
    const rate = Number(previewState.textRate || 1);
    const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
    const offsetMs = Number(previewState.syncOffsetMs || 0);
    const safeOffset = Number.isFinite(offsetMs) ? Math.round(offsetMs) : 0;
    return Math.max(0, Math.round(stretchedTimeMs * safeRate) + safeOffset);
  };

  const getLineOffsetMs = (lineIndex) => {
    const key = String(Number(lineIndex));
    const value = Number(previewState.lineOffsetMsByIndex?.[key] || 0);
    return Number.isFinite(value) ? Math.round(value) : 0;
  };

  const setLineOffsetMs = (lineIndex, nextOffsetMs) => {
    const key = String(Number(lineIndex));
    const safe = Number.isFinite(Number(nextOffsetMs)) ? Math.round(Number(nextOffsetMs)) : 0;
    if (!safe) {
      delete previewState.lineOffsetMsByIndex[key];
      return;
    }
    previewState.lineOffsetMsByIndex[key] = safe;
  };

  const getWordLineOffsetMs = (wordIndex) => {
    const lineIndex = Number(previewState.wordLineIndexByWordIndex?.[wordIndex] ?? -1);
    if (!Number.isFinite(lineIndex) || lineIndex < 0) return 0;
    return getLineOffsetMs(lineIndex);
  };

  const formatSyncOffsetLabel = (offsetMs) => {
    const safe = Number.isFinite(Number(offsetMs)) ? Math.round(Number(offsetMs)) : 0;
    const prefix = safe > 0 ? "+" : "";
    return `${prefix}${safe} ms`;
  };

  const normalizeScrollSpeed = (value) => {
    const next = String(value || "").trim().toLowerCase();
    if (next === "extra-slow" || next === "super-slow" || next === "slow" || next === "fast") return next;
    return "normal";
  };

  const getScrollSpeedFactor = (value) => {
    const speed = normalizeScrollSpeed(value);
    if (speed === "extra-slow") return 0.6;
    if (speed === "super-slow") return 0.8;
    if (speed === "slow") return 0.95;
    if (speed === "fast") return 1.45;
    return 1.1;
  };

  const syncPreviewRateInputs = () => {
    if (previewHighlightModeInput instanceof HTMLSelectElement) {
      previewHighlightModeInput.value = String(previewState.highlightMode || "auto");
    }
    if (previewVoiceRateInput instanceof HTMLSelectElement) {
      previewVoiceRateInput.value = String(previewState.voiceRate || 1);
    }
    if (previewTextRateInput instanceof HTMLSelectElement) {
      previewTextRateInput.value = String(previewState.textRate || 1);
    }
    if (previewSyncOffsetInput instanceof HTMLInputElement) {
      previewSyncOffsetInput.value = String(Math.round(Number(previewState.syncOffsetMs || 0)));
    }
    if (previewSyncOffsetLabel instanceof HTMLElement) {
      previewSyncOffsetLabel.textContent = formatSyncOffsetLabel(previewState.syncOffsetMs || 0);
    }
    if (previewSyncOffsetManualInput instanceof HTMLInputElement) {
      previewSyncOffsetManualInput.value = String(Math.round(Number(previewState.syncOffsetMs || 0)));
    }
    if (previewScrollSpeedInput instanceof HTMLSelectElement) {
      previewScrollSpeedInput.value = normalizeScrollSpeed(previewState.scrollSpeed || "normal");
    }
    const cutWindow = getPreviewAudioCutWindow();
    if (previewAudioCutStartInput instanceof HTMLInputElement) {
      previewAudioCutStartInput.max = String(Math.max(0, cutWindow.durationMs - 200));
      previewAudioCutStartInput.value = String(cutWindow.startCutMs);
    }
    if (previewAudioCutEndInput instanceof HTMLInputElement) {
      previewAudioCutEndInput.max = String(Math.max(0, cutWindow.durationMs - cutWindow.startCutMs - 200));
      previewAudioCutEndInput.value = String(cutWindow.endCutMs);
    }
    if (previewAudioCutStartManualInput instanceof HTMLInputElement) {
      previewAudioCutStartManualInput.max = String(Math.max(0, cutWindow.durationMs - 200));
      previewAudioCutStartManualInput.value = String(cutWindow.startCutMs);
    }
    if (previewAudioCutEndManualInput instanceof HTMLInputElement) {
      previewAudioCutEndManualInput.max = String(Math.max(0, cutWindow.durationMs - cutWindow.startCutMs - 200));
      previewAudioCutEndManualInput.value = String(cutWindow.endCutMs);
    }
    if (previewAudioCutSummary instanceof HTMLElement) {
      previewAudioCutSummary.textContent = formatAudioCutSummary(cutWindow.startCutMs, cutWindow.endCutMs);
    }
    const safeStretch = Math.max(60, Math.min(180, Math.round(Number(previewState.textStretchPercent || 100))));
    if (previewTextStretchInput instanceof HTMLInputElement) {
      previewTextStretchInput.value = String(safeStretch);
    }
    if (previewTextStretchManualInput instanceof HTMLInputElement) {
      previewTextStretchManualInput.value = String(safeStretch);
    }
    if (previewTextStretchLabel instanceof HTMLElement) {
      previewTextStretchLabel.textContent = `${safeStretch}%`;
    }
  };

  const syncSelectedLineOffsetInput = () => {
    if (!(previewLineSyncSelect instanceof HTMLSelectElement)) return;
    if (!(previewLineSyncMsInput instanceof HTMLInputElement)) return;
    const selectedIndex = Number(previewLineSyncSelect.value || -1);
    if (!Number.isFinite(selectedIndex) || selectedIndex < 0) {
      previewLineSyncMsInput.value = "0";
      return;
    }
    previewLineSyncMsInput.value = String(getLineOffsetMs(selectedIndex));
  };

  const renderLineSyncOptions = () => {
    if (!(previewLineSyncSelect instanceof HTMLSelectElement)) return;
    const segments = Array.isArray(previewState.lineTranscriptSegments)
      ? previewState.lineTranscriptSegments
      : [];
    if (!segments.length) {
      previewLineSyncSelect.innerHTML = '<option value="">No lines available</option>';
      previewLineSyncSelect.disabled = true;
      if (previewLineSyncApplyBtn instanceof HTMLButtonElement) previewLineSyncApplyBtn.disabled = true;
      if (previewLineSyncResetBtn instanceof HTMLButtonElement) previewLineSyncResetBtn.disabled = true;
      if (previewLineSyncMsInput instanceof HTMLInputElement) previewLineSyncMsInput.disabled = true;
      return;
    }

    const previous = Number(previewLineSyncSelect.value || 0);
    const options = segments.map((segment, index) => {
      const text = compactLabel(String(segment?.text || `Line ${index + 1}`), 72);
      return `<option value="${index}">Line ${index + 1}: ${escapeHtml(text)}</option>`;
    });
    previewLineSyncSelect.innerHTML = options.join("");
    const bounded = Number.isFinite(previous) && previous >= 0 && previous < segments.length ? previous : 0;
    previewLineSyncSelect.value = String(bounded);
    previewLineSyncSelect.disabled = false;
    if (previewLineSyncApplyBtn instanceof HTMLButtonElement) previewLineSyncApplyBtn.disabled = false;
    if (previewLineSyncResetBtn instanceof HTMLButtonElement) previewLineSyncResetBtn.disabled = false;
    if (previewLineSyncMsInput instanceof HTMLInputElement) previewLineSyncMsInput.disabled = false;
    syncSelectedLineOffsetInput();
  };

  const findTimedIndexAtTimeWithOffset = (collection, timeMs, offsetResolver) => {
    if (!Array.isArray(collection) || !collection.length) return -1;
    const safeMs = Math.max(0, Number(timeMs || 0));
    let previousIndex = -1;
    let previousEnd = -1;

    for (let index = 0; index < collection.length; index += 1) {
      const item = collection[index] || {};
      const offset = Number(offsetResolver?.(index) || 0);
      const safeOffset = Number.isFinite(offset) ? Math.round(offset) : 0;
      const start = Number(item.startMs || 0) + safeOffset;
      const end = Number(item.endMs || 0) + safeOffset;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      if (safeMs >= start && safeMs < end) {
        return index;
      }
      if (safeMs >= end) {
        previousIndex = index;
        previousEnd = end;
      }
    }

    if (previousIndex >= 0 && safeMs - previousEnd <= 120) {
      return previousIndex;
    }

    return -1;
  };

  const applyPreviewPlaybackRate = () => {
    const nextRate = Number(previewState.voiceRate || 1);
    const safeRate = Number.isFinite(nextRate) && nextRate > 0 ? nextRate : 1;
    if (previewVideo instanceof HTMLVideoElement) {
      previewVideo.playbackRate = safeRate;
    }
    if (previewAudio instanceof HTMLAudioElement) {
      previewAudio.playbackRate = safeRate;
    }
  };

  const pausePreviewPlayers = () => {
    if (previewSyncRafId) {
      window.cancelAnimationFrame(previewSyncRafId);
      previewSyncRafId = 0;
    }
    if (previewVideo instanceof HTMLVideoElement) previewVideo.pause();
    if (previewAudio instanceof HTMLAudioElement) previewAudio.pause();
  };

  const startPreviewSyncLoop = () => {
    if (previewSyncRafId) return;
    const tick = () => {
      previewSyncRafId = 0;
      const player = getPreviewPlayer();
      if (!player) return;
      const ms = Math.floor(Number(player.currentTime || 0) * 1000);
      highlightPreviewByTime(toHighlightTimeMs(ms));
      if (!player.paused && !player.ended) {
        previewSyncRafId = window.requestAnimationFrame(tick);
      }
    };
    previewSyncRafId = window.requestAnimationFrame(tick);
  };

  const stopPreviewSyncLoop = () => {
    if (!previewSyncRafId) return;
    window.cancelAnimationFrame(previewSyncRafId);
    previewSyncRafId = 0;
  };

  const maybeAutoScrollActiveToken = (element) => {
    if (!(element instanceof HTMLElement) || !(previewTranscriptList instanceof HTMLElement)) return;

    const containerRect = previewTranscriptList.getBoundingClientRect();
    const tokenRect = element.getBoundingClientRect();
    const topGuard = containerRect.top + 24;
    const bottomGuard = containerRect.bottom - 24;
    const outsideViewport = tokenRect.top < topGuard || tokenRect.bottom > bottomGuard;
    if (!outsideViewport) return;

    const now = Date.now();
    if (now - Number(previewState.lastAutoScrollAt || 0) < 120) return;
    previewState.lastAutoScrollAt = now;
    element.scrollIntoView({ block: "nearest", behavior: "auto" });
  };

  const resolveUseWordHighlight = () => {
    const hasWords = previewState.transcriptWords.length > 0;
    if (!hasWords) return false;
    if (previewState.highlightMode === "word") return true;
    if (previewState.highlightMode === "line") return false;
    return Boolean(previewState.wordHighlightReliable);
  };

  const updatePreviewHighlightModeStatus = () => {
    if (previewState.highlightMode === "line") {
      setPreviewStatus("Line highlight mode enabled.", "success");
      return;
    }
    if (!previewState.useWordHighlight && previewState.transcriptWords.length) {
      setPreviewStatus("Word timing was unreliable. Showing line highlight for stable sync.", "success");
      return;
    }
    setPreviewStatus("");
  };

  const applyPreviewHighlightMode = () => {
    const player = getPreviewPlayer();
    const rawMs = player ? Math.floor(Number(player.currentTime || 0) * 1000) : 0;

    previewState.useWordHighlight = resolveUseWordHighlight();
    previewState.transcriptSegments = previewState.useWordHighlight
      ? previewState.inlineTranscriptSegments.length
        ? previewState.inlineTranscriptSegments
        : previewState.lineTranscriptSegments
      : previewState.lineTranscriptSegments.length
        ? previewState.lineTranscriptSegments
        : previewState.inlineTranscriptSegments;

    previewState.activeWordIndex = -1;
    previewState.activeSegmentIndex = -1;
    previewState.searchWordIndex = -1;
    previewState.searchSegmentIndex = -1;
    renderPreviewTranscript();
    syncPreviewTimelineCalibration();
    updatePreviewHighlightModeStatus();
    highlightPreviewByTime(toHighlightTimeMs(rawMs) + 1);
    syncPreviewRateInputs();
  };

  const seekPreviewPlayer = (ms) => {
    const player = getPreviewPlayer();
    if (!player) return;
    const sec = Math.max(0, Number(ms || 0) / 1000);
    const durationSec = Number(player.duration || 0);
    if (Number.isFinite(durationSec) && durationSec > 0) {
      player.currentTime = Math.min(sec, Math.max(0, durationSec - 0.1));
      return;
    }
    player.currentTime = sec;
  };

  const getPreviewTranscriptFullText = () => {
    const fromLesson = String(previewState.lesson?.transcriptText || "").replace(/\r\n?/g, "\n").trim();
    if (fromLesson) return fromLesson;
    const sourceSegments = Array.isArray(previewState.lineTranscriptSegments) && previewState.lineTranscriptSegments.length
      ? previewState.lineTranscriptSegments
      : previewState.inlineTranscriptSegments;
    return sourceSegments
      .map((segment) => String(segment?.text || "").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  };

  const syncPreviewProductionTranscriptScroll = () => {
    if (!previewState.productionMode) return;
    if (!(previewTranscriptList instanceof HTMLElement)) return;
    const player = getPreviewPlayer();
    const rawDurationSec = Number(player?.duration || 0);
    const durationMs =
      Number.isFinite(rawDurationSec) && rawDurationSec > 0
        ? Math.round(rawDurationSec * 1000)
        : Math.max(0, Math.round(Number(getPreviewDurationForTiming() || 0)));
    if (durationMs <= 0) return;
    const currentMs = player ? Math.max(0, Math.round(Number(player.currentTime || 0) * 1000)) : 0;
    const maxScroll = Math.max(0, previewTranscriptList.scrollHeight - previewTranscriptList.clientHeight);
    if (maxScroll <= 0) return;
    const progress = Math.max(0, Math.min(1, currentMs / durationMs));
    const targetScroll = progress * maxScroll;
    const currentScroll = Number.isFinite(Number(previewState.productionScrollVirtual))
      ? Number(previewState.productionScrollVirtual)
      : Number(previewTranscriptList.scrollTop || 0);
    const now = performance.now();
    const previous = Number(previewState.lastProductionScrollAt || 0);
    previewState.lastProductionScrollAt = now;
    if (!Number.isFinite(previous) || previous <= 0) {
      previewState.productionScrollVirtual = targetScroll;
      previewTranscriptList.scrollTop = targetScroll;
      return;
    }

    const elapsedSec = Math.max(0.001, Math.min(0.12, (now - previous) / 1000));
    const viewportFactor = Math.max(0.85, Math.min(1.25, 420 / Math.max(240, previewTranscriptList.clientHeight)));
    const baseStep = (maxScroll / Math.max(1, durationMs / 1000)) * elapsedSec * viewportFactor;
    const speedFactor = getScrollSpeedFactor(previewState.scrollSpeed || "normal");
    const maxStep = Math.max(0.12, baseStep * speedFactor);
    const diff = targetScroll - currentScroll;
    if (progress >= 0.995 || Math.abs(diff) <= maxStep) {
      previewState.productionScrollVirtual = targetScroll;
      previewTranscriptList.scrollTop = targetScroll;
      return;
    }
    const nextScroll = currentScroll + Math.sign(diff) * Math.min(Math.abs(diff), maxStep);
    previewState.productionScrollVirtual = nextScroll;
    previewTranscriptList.scrollTop = nextScroll;
  };

  const renderPreviewTranscript = () => {
    if (!previewTranscriptList) return;
    previewState.transcriptWordElements = [];
    previewState.transcriptSegmentElements = [];

    if (previewState.productionMode) {
      const fullText = getPreviewTranscriptFullText();
      if (!fullText) {
        previewTranscriptList.innerHTML = '<p class="lesson-transcript-empty">Transcript not available.</p>';
        previewState.renderedProductionTranscriptText = "";
        return;
      }
      if (previewState.renderedProductionTranscriptText !== fullText) {
        previewTranscriptList.innerHTML = `<p class="transcript-full-paragraph">${escapeHtml(fullText)}</p>`;
        previewState.renderedProductionTranscriptText = fullText;
      }
      previewState.productionScrollVirtual = Number(previewTranscriptList.scrollTop || 0);
      return;
    }
    previewState.renderedProductionTranscriptText = "";

    const setSpokenHistoryText = (value) => {
      if (!(previewTranscriptList instanceof HTMLElement)) return;
      const normalized = String(value || "").trim();
      if (!normalized) {
        previewTranscriptList.innerHTML = '<p class="lesson-transcript-empty">Spoken text will appear here.</p>';
        return;
      }
      previewTranscriptList.innerHTML = `<p class="transcript-spoken-history">${escapeHtml(normalized)}</p>`;
      previewTranscriptList.scrollTop = previewTranscriptList.scrollHeight;
    };

    if (previewState.useWordHighlight && previewState.transcriptWords.length) {
      const spokenHistoryText =
        previewState.activeWordIndex >= 0
          ? previewState.liveWordTextByIndex
              .slice(0, previewState.activeWordIndex + 1)
              .map((item) => String(item || "").trim())
              .filter(Boolean)
              .join(" ")
          : "";
      setSpokenHistoryText(spokenHistoryText);
      return;
    }

    if (!previewState.transcriptSegments.length) {
      if (previewTranscriptList instanceof HTMLElement) {
        previewTranscriptList.innerHTML = '<p class="lesson-transcript-empty">Transcript not available.</p>';
      }
      return;
    }

    const spokenHistoryText =
      previewState.activeSegmentIndex >= 0
        ? previewState.transcriptSegments
            .slice(0, previewState.activeSegmentIndex + 1)
            .map((segment) => String(segment?.text || "").trim())
            .filter(Boolean)
            .join("\n")
        : "";
    setSpokenHistoryText(spokenHistoryText);
  };

  const findTimedIndexAtTime = (collection, timeMs) => {
    if (!Array.isArray(collection) || !collection.length) return -1;
    const safeMs = Math.max(0, Number(timeMs || 0));
    const lastIndex = collection.length - 1;
    const firstStart = Number(collection[0]?.startMs || 0);
    if (safeMs < firstStart) return -1;

    const lastEnd = Number(collection[lastIndex]?.endMs || 0);
    if (safeMs >= lastEnd) return lastIndex;

    let low = 0;
    let high = lastIndex;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const row = collection[mid] || {};
      const start = Number(row.startMs || 0);
      const end = Number(row.endMs || 0);
      if (safeMs < start) {
        high = mid - 1;
      } else if (safeMs >= end) {
        low = mid + 1;
      } else {
        return mid;
      }
    }

    // Small gap tolerance prevents visual flicker when there are tiny timing gaps.
    const previousIndex = Math.max(0, high);
    const previous = collection[previousIndex];
    if (previous) {
      const prevEnd = Number(previous.endMs || 0);
      if (safeMs >= prevEnd && safeMs - prevEnd <= 110) {
        return previousIndex;
      }
    }
    return -1;
  };

  const highlightPreviewByTime = (timeMs) => {
    syncPreviewProductionTranscriptScroll();

    const logPreviewSync = (mode, index, expectedMs) => {
      if (!isDebugSyncEnabled()) return;
      const player = getPreviewPlayer();
      const audioCurrentMs = player ? Math.max(0, Math.round(Number(player.currentTime || 0) * 1000)) : 0;
      const safeExpectedMs = Number.isFinite(Number(expectedMs)) ? Math.max(0, Math.round(Number(expectedMs))) : -1;
      const driftMs = safeExpectedMs >= 0 ? audioCurrentMs - safeExpectedMs : null;
      const logKey = `${mode}:${index}:${Math.floor(audioCurrentMs / 250)}`;
      const now = Date.now();
      if (previewState.lastSyncLogKey === logKey && now - Number(previewState.lastSyncLogAt || 0) < 220) {
        return;
      }
      previewState.lastSyncLogAt = now;
      previewState.lastSyncLogKey = logKey;
      debugSyncLog("admin-lesson-preview", {
        audioCurrentMs,
        computedHighlightIndex: index,
        expectedTimestampMs: safeExpectedMs,
        driftMs,
        highlightMode: mode,
        mappedHighlightMs: Math.max(0, Math.round(Number(timeMs || 0))),
      });
    };

    if (previewState.useWordHighlight && previewState.transcriptWords.length) {
      const nextWordIndex = findTimedIndexAtTimeWithOffset(
        previewState.transcriptWords,
        timeMs,
        (index) => getWordLineOffsetMs(index)
      );
      previewState.searchWordIndex = nextWordIndex;
      const expectedWord = previewState.transcriptWords[nextWordIndex];
      const expectedWordMs =
        nextWordIndex >= 0 && expectedWord
          ? Number(expectedWord.startMs || 0) + getWordLineOffsetMs(nextWordIndex)
          : -1;
      logPreviewSync("word", nextWordIndex, expectedWordMs);

      if (nextWordIndex === previewState.activeWordIndex) return;
      previewState.activeWordIndex = nextWordIndex;
      if (!previewState.productionMode) {
        renderPreviewTranscript();
      }
      return;
    }

    if (!previewState.transcriptSegments.length) return;

    const usingLineSegments = previewState.transcriptSegments === previewState.lineTranscriptSegments;
    const nextIndex = findTimedIndexAtTimeWithOffset(
      previewState.transcriptSegments,
      timeMs,
      (index) => (usingLineSegments ? getLineOffsetMs(index) : 0)
    );
    previewState.searchSegmentIndex = nextIndex;
    const expectedSegment = previewState.transcriptSegments[nextIndex];
    const expectedSegmentMs =
      nextIndex >= 0 && expectedSegment
        ? Number(expectedSegment.startMs || 0) + (usingLineSegments ? getLineOffsetMs(nextIndex) : 0)
        : -1;
    logPreviewSync(usingLineSegments ? "line" : "segment", nextIndex, expectedSegmentMs);

    if (nextIndex === previewState.activeSegmentIndex) return;
    previewState.activeSegmentIndex = nextIndex;
    if (!previewState.productionMode) {
      renderPreviewTranscript();
    }
  };

  const setPreviewModeButtons = () => {
    if (previewState.productionMode) {
      if (previewBtnModeVideo instanceof HTMLButtonElement) previewBtnModeVideo.classList.add("hidden");
      if (previewBtnModeAudio instanceof HTMLButtonElement) previewBtnModeAudio.classList.add("hidden");
      return;
    }
    if (previewBtnModeVideo instanceof HTMLButtonElement) {
      previewBtnModeVideo.classList.toggle("hidden", !previewState.hasVideo);
      previewBtnModeVideo.disabled = previewState.mode === "video";
    }
    if (previewBtnModeAudio instanceof HTMLButtonElement) {
      previewBtnModeAudio.classList.toggle("hidden", !previewState.hasAudio);
      previewBtnModeAudio.disabled = previewState.mode === "audio";
    }
  };

  const applyPreviewUiMode = () => {
    const production = Boolean(previewState.productionMode);
    if (previewScrollSpeedRow instanceof HTMLElement) {
      previewScrollSpeedRow.classList.toggle("hidden", !production);
    }
    if (previewSettingsRow instanceof HTMLElement) {
      previewSettingsRow.classList.toggle("hidden", production);
    }
    if (previewSyncRow instanceof HTMLElement) {
      previewSyncRow.classList.toggle("hidden", production);
    }
    if (previewLineSyncRow instanceof HTMLElement) {
      previewLineSyncRow.classList.toggle("hidden", production);
    }
    if (previewManualStretchRow instanceof HTMLElement) {
      previewManualStretchRow.classList.toggle("hidden", production);
    }
    if (previewTranscriptSubtitle instanceof HTMLElement) {
      previewTranscriptSubtitle.textContent = production
        ? "Final student view: full transcript is shown and scrolls with playback."
        : "Live spoken text (word-by-word) is shown here.";
    }
    if (previewAttemptTestBtn instanceof HTMLButtonElement) {
      const hasLinkedTest = Boolean(previewState.lesson?.assessmentTestId);
      const canAttempt = production && hasLinkedTest;
      previewAttemptTestBtn.classList.toggle("hidden", !canAttempt);
      previewAttemptTestBtn.disabled = !canAttempt;
    }
  };

  const getPreviewPlayErrorMessage = (error) => {
    const name = String(error?.name || "").trim();
    if (name === "NotAllowedError") {
      return "Browser blocked auto-play. Press play once to allow preview.";
    }
    if (name === "NotSupportedError") {
      return "Audio format is not supported in browser. Regenerate voice and try again.";
    }
    return "Press play to start preview.";
  };

  const attemptPreviewAutoplay = (player) => {
    if (!(player instanceof HTMLMediaElement)) return;

    const playNow = async () => {
      try {
        await player.play();
        setPreviewStatus("");
      } catch (error) {
        setPreviewStatus(getPreviewPlayErrorMessage(error), "error");
      }
    };

    if (Number(player.readyState || 0) >= 2) {
      void playNow();
      return;
    }

    const onCanPlay = () => {
      player.removeEventListener("error", onError);
      void playNow();
    };
    const onError = () => {
      player.removeEventListener("canplay", onCanPlay);
      setPreviewStatus("Audio could not load for preview. Regenerate voice and try again.", "error");
    };
    player.addEventListener("canplay", onCanPlay, { once: true });
    player.addEventListener("error", onError, { once: true });
  };

  const applyPreviewMode = (mode, { autoplay = false } = {}) => {
    let nextMode = mode;
    if (nextMode === "audio" && !previewState.hasAudio) nextMode = previewState.hasVideo ? "video" : "audio";
    if (nextMode === "video" && !previewState.hasVideo) nextMode = previewState.hasAudio ? "audio" : "video";
    if (nextMode !== "video" && nextMode !== "audio") {
      nextMode = previewState.hasAudio ? "audio" : "video";
    }

    const previousPlayer = getPreviewPlayer();
    const previousMs = previousPlayer ? Math.floor(Number(previousPlayer.currentTime || 0) * 1000) : 0;

    pausePreviewPlayers();
    previewState.mode = nextMode;

    if (previewVideo instanceof HTMLVideoElement) {
      previewVideo.style.display = previewState.hasVideo && previewState.mode === "video" ? "" : "none";
    }
    if (previewAudio instanceof HTMLAudioElement) {
      previewAudio.style.display = previewState.hasAudio && previewState.mode === "audio" ? "" : "none";
    }

    setPreviewModeButtons();
    applyPreviewPlaybackRate();
    syncPreviewTimelineCalibration();
    syncPreviewRateInputs();
    if (previousMs > 0) {
      seekPreviewPlayer(previousMs);
      highlightPreviewByTime(toHighlightTimeMs(previousMs) + 1);
    } else {
      highlightPreviewByTime(toHighlightTimeMs(0) + 1);
    }

    if (autoplay) {
      const current = getPreviewPlayer();
      if (current) {
        attemptPreviewAutoplay(current);
      }
    }
  };

  const closeLessonPreview = () => {
    stopPreviewSyncLoop();
    pausePreviewPlayers();
    if (lessonPreviewModal) {
      lessonPreviewModal.classList.remove("open");
      lessonPreviewModal.setAttribute("aria-hidden", "true");
    }
  };

  const openLessonPreview = (lesson, options = {}) => {
    if (!lesson) return;
    const { productionMode = false } = options;

    const videoUrl = normalizeAssetUrl(lesson.videoUrl);
    const audioUrl = normalizeAssetUrl(lesson.audioUrl);

    previewState.lesson = lesson;
    previewState.hasVideo = Boolean(videoUrl);
    previewState.hasAudio = Boolean(audioUrl);
    previewState.mode = previewState.hasAudio ? "audio" : "video";
    previewState.productionMode = Boolean(productionMode);
    previewState.voiceRate = 1;
    previewState.textRate = 1;
    previewState.syncOffsetMs = 0;
    previewState.textRateManual = false;
    previewState.highlightMode = "auto";
    previewState.useWordHighlight = true;
    previewState.wordHighlightReliable = false;
    previewState.activeSegmentIndex = -1;
    previewState.activeWordIndex = -1;
    previewState.lastAutoScrollAt = 0;
    previewState.lastProductionScrollAt = 0;
    previewState.productionScrollVirtual = 0;
    previewState.searchWordIndex = -1;
    previewState.searchSegmentIndex = -1;
    previewState.timelineScale = 1;
    previewState.timelineOffsetMs = 0;
    previewState.hasWordTimestamps = false;
    previewState.audioCutStartMs = 0;
    previewState.audioCutEndMs = 0;
    previewState.textStretchPercent = 100;
    previewState.lastSyncLogAt = 0;
    previewState.lastSyncLogKey = "";
    previewState.renderedProductionTranscriptText = "";
    previewState.scrollSpeed = "normal";
    previewState.liveWordTextByIndex = [];
    previewState.wordLineIndexByWordIndex = [];
    previewState.lineOffsetMsByIndex = {};
    const inlineSegments = parseInlineTranscriptSegments(lesson.transcriptSegments);
    const totalDurationForTimingMs = Math.max(
      Number(lesson?.audioDurationMs || 0),
      Number(lesson?.durationSec || 0) * 1000
    );
    const parsedTimedWords = parseInlineTranscriptWords(lesson.transcriptSegments);
    previewState.hasWordTimestamps = parsedTimedWords.length > 0;
    const timedWords = parsedTimedWords.length ? parsedTimedWords : [];
    const wordView =
      parsedTimedWords.length > 0
        ? buildTranscriptWordView(lesson.transcriptText, timedWords)
        : {
            words: [],
            tokens: [],
            quality: { mappedCoverage: 0, distinctWordCoverage: 0, reliable: false },
          };
    previewState.transcriptWords = wordView.words;
    previewState.transcriptTextTokens = wordView.tokens;
    previewState.transcriptTextTokens.forEach((token) => {
      const index = Number(token?.timedWordIndex ?? -1);
      if (!Number.isFinite(index) || index < 0) return;
      const existing = String(previewState.liveWordTextByIndex[index] || "");
      previewState.liveWordTextByIndex[index] = `${existing}${String(token.text || "")}`.trim();
    });
    previewState.transcriptWords.forEach((word, index) => {
      if (previewState.liveWordTextByIndex[index]) return;
      previewState.liveWordTextByIndex[index] = String(word?.text || "").trim();
    });
    previewState.wordHighlightReliable = Boolean(previewState.hasWordTimestamps && wordView?.quality?.reliable);

    const timingWordsForLineAlignment = previewState.hasWordTimestamps ? previewState.transcriptWords : [];
    const textAlignedSegments = buildTextAlignedSegments(
      lesson.transcriptText,
      timingWordsForLineAlignment,
      totalDurationForTimingMs
    );
    previewState.inlineTranscriptSegments = inlineSegments;
    previewState.lineTranscriptSegments = textAlignedSegments.length ? textAlignedSegments : inlineSegments;
    if (!previewState.lineTranscriptSegments.length) {
      previewState.lineTranscriptSegments = buildFallbackSegments(lesson);
    }
    if (!previewState.inlineTranscriptSegments.length) {
      previewState.inlineTranscriptSegments = previewState.lineTranscriptSegments;
    }
    previewState.wordLineIndexByWordIndex = buildWordLineIndexMap(
      previewState.transcriptWords,
      previewState.lineTranscriptSegments
    );

    if (!previewState.hasAudio && !previewState.hasVideo) {
      setMessage("No audio/video available for this lesson preview.", "error");
      return;
    }

    if (lessonPreviewTitle) {
      lessonPreviewTitle.textContent = lesson.title || "Lesson Preview";
    }
    if (lessonPreviewMeta) {
      const durationSec =
        Number(lesson.audioDurationMs || 0) > 0
          ? Math.floor(Number(lesson.audioDurationMs) / 1000)
          : Number(lesson.durationSec || 0);
      lessonPreviewMeta.textContent = `Duration: ${durationSec > 0 ? `${durationSec}s` : "-"} | ${
        previewState.hasAudio ? "Audio ready" : "Audio missing"
      }`;
    }
    if (previewState.productionMode && previewState.hasAudio && !previewState.hasWordTimestamps) {
      setPreviewStatus("Word timestamps missing. Regenerate/upload matching audio for exact word sync.", "error");
    } else {
      setPreviewStatus("");
    }
    applyPreviewUiMode();
    renderLineSyncOptions();
    syncPreviewRateInputs();

    if (previewVideo instanceof HTMLVideoElement) {
      if (previewState.hasVideo) {
        previewVideo.src = videoUrl;
      } else {
        previewVideo.removeAttribute("src");
      }
      previewVideo.load();
    }

    if (previewAudio instanceof HTMLAudioElement) {
      if (previewState.hasAudio) {
        previewAudio.src = audioUrl;
      } else {
        previewAudio.removeAttribute("src");
      }
      previewAudio.load();
    }

    applyPreviewHighlightMode();

    if (lessonPreviewModal) {
      lessonPreviewModal.classList.add("open");
      lessonPreviewModal.setAttribute("aria-hidden", "false");
    }

    applyPreviewMode(previewState.mode, { autoplay: true });
  };

  const setActiveTab = (tabKey) => {
    state.currentTab = tabKey || "courses";

    tabButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const isActive = button.getAttribute("data-admin-tab") === state.currentTab;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    tabPanels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      const isActive = panel.getAttribute("data-admin-tab-panel") === state.currentTab;
      panel.classList.toggle("active", isActive);
    });
  };

  const selectedCourse = () => state.courses.find((item) => item.id === state.selectedCourseId) || null;
  const selectedChapter = () => state.chapters.find((item) => item.id === state.selectedChapterId) || null;
  const compactLabel = (value, max = 30) => {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.length > max ? `${text.slice(0, max - 1)}...` : text;
  };
  const SAMPLE_TRANSCRIPT_TEXT = "Dear students welcome to your online classess CC Academy";
  const OPENAI_VOICES = [
    { value: "alloy", label: "Alloy" },
    { value: "onyx", label: "Onyx (Male)" },
    { value: "echo", label: "Echo (Male)" },
    { value: "fable", label: "Fable (Male)" },
    { value: "nova", label: "Nova (Female)" },
    { value: "shimmer", label: "Shimmer (Female)" },
  ];
  const GEMINI_VOICES = [
    { value: "Kore", label: "Kore" },
    { value: "Puck", label: "Puck" },
    { value: "Aoede", label: "Aoede" },
    { value: "Charon", label: "Charon" },
    { value: "Fenrir", label: "Fenrir" },
    { value: "Leda", label: "Leda" },
  ];
  const NON_LANGUAGE_SUBJECTS = new Set([
    "CHILD_PEDAGOGY",
    "MATHS_EVS",
    "SCIENCE_MATH",
    "SOCIAL_STUDIES",
  ]);
  const ACCESS_CODE_LABELS = {
    DEMO: "DEMO",
    MOCK: "MOCK",
    LESSON: "LESSON",
  };
  const isMockScopeReady = () =>
    Boolean(state.selectedMockCourseId && state.selectedMockChapterId && state.selectedMockLessonId);
  const selectedMockTest = () =>
    state.mockTestsAdmin.find((item) => item.id === state.selectedMockTestId) || null;
  const getSuggestedMockTestTitle = () => {
    if (mockLinkLessonIdInput instanceof HTMLSelectElement) {
      const optionText = mockLinkLessonIdInput.selectedOptions?.[0]?.textContent?.trim() || "";
      if (optionText && !/^select\s/i.test(optionText)) {
        return optionText;
      }
    }
    const selectedLesson = selectedMockLesson();
    const title = String(selectedLesson?.title || "").trim();
    return title || "";
  };
  const autoFillMockTestTitleFromSelectedLesson = (options = {}) => {
    const { force = false } = options;
    if (!(lessonMockTestTitleInput instanceof HTMLInputElement)) return;
    const suggested = getSuggestedMockTestTitle();
    if (!suggested) return;
    const current = String(lessonMockTestTitleInput.value || "").trim();
    const shouldOverwrite =
      force || !current || current === state.lastAutoMockTitle || current === "Chapter test title";
    if (!shouldOverwrite) return;
    lessonMockTestTitleInput.value = suggested;
    state.lastAutoMockTitle = suggested;
  };
  const getLessonOrderConflictDetails = (error) => {
    if (!error || typeof error !== "object") return null;
    const payload =
      "payload" in error && error.payload && typeof error.payload === "object" ? error.payload : null;
    const details =
      payload && "details" in payload && payload.details && typeof payload.details === "object"
        ? payload.details
        : null;
    if (!details) return null;

    const orderIndex =
      "orderIndex" in details && Number.isFinite(Number(details.orderIndex))
        ? Number(details.orderIndex)
        : null;
    const conflictLessonId =
      "conflictLessonId" in details && typeof details.conflictLessonId === "string"
        ? details.conflictLessonId
        : "";
    const conflictLessonTitle =
      "conflictLessonTitle" in details && typeof details.conflictLessonTitle === "string"
        ? details.conflictLessonTitle
        : "";

    if (!conflictLessonId && (!orderIndex || orderIndex < 1)) {
      return null;
    }
    return {
      orderIndex,
      conflictLessonId,
      conflictLessonTitle,
    };
  };

  const WORDS_PER_MINUTE = 150;
  const LESSON_SELECT_NEW_VALUE = "__create_new_lesson__";
  const getNextLessonOrderIndex = () => {
    const indices = state.lessons
      .map((item) => Number(item?.orderIndex || 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (!indices.length) return 1;
    return Math.max(...indices) + 1;
  };

  const getSuggestedLessonTitle = () => {
    const base = selectedChapter()?.title?.trim() || "New Lesson";
    const nextOrder = getNextLessonOrderIndex();
    return `${base} - Lesson ${nextOrder}`;
  };

  const estimateDurationSecFromTranscript = (text) => {
    const normalized = String(text || "").trim();
    if (!normalized) return 0;
    const wordCount = normalized.split(/\s+/).filter(Boolean).length;
    if (!wordCount) return 0;
    return Math.max(1, Math.ceil((wordCount / WORDS_PER_MINUTE) * 60));
  };

  const setDurationHint = (seconds, wordCount) => {
    if (!lessonDurationHint) return;
    if (!seconds || !wordCount) {
      lessonDurationHint.textContent = "Duration auto-calculates from transcript text.";
      return;
    }
    lessonDurationHint.textContent = `Estimated duration: ${seconds}s from ${wordCount} words (${WORDS_PER_MINUTE} wpm).`;
  };

  const syncDurationFromTranscript = () => {
    if (!(lessonTranscriptTextInput instanceof HTMLTextAreaElement)) return;
    if (!(lessonDurationSecInput instanceof HTMLInputElement)) return;

    const transcript = lessonTranscriptTextInput.value || "";
    const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).filter(Boolean).length : 0;
    if (!wordCount) {
      setDurationHint(0, 0);
      return;
    }
    const estimatedSec = estimateDurationSecFromTranscript(transcript);

    lessonDurationSecInput.value = estimatedSec > 0 ? String(estimatedSec) : "";
    setDurationHint(estimatedSec, wordCount);
  };

  const ensureSampleTranscriptText = () => {
    if (!(lessonTranscriptTextInput instanceof HTMLTextAreaElement)) return;
    if (lessonTranscriptTextInput.value.trim()) return;
    lessonTranscriptTextInput.value = SAMPLE_TRANSCRIPT_TEXT;
    syncDurationFromTranscript();
  };

  const getSelectedProvider = () => {
    const raw = String(lessonAudioProviderInput?.value || "openai").trim().toLowerCase();
    return raw === "gemini" ? "gemini" : "openai";
  };

  const getBuiltInVoicesForProvider = (provider) => (provider === "gemini" ? GEMINI_VOICES : OPENAI_VOICES);

  const renderBuiltInVoiceOptions = () => {
    if (!(lessonAudioVoiceInput instanceof HTMLSelectElement)) return;
    const provider = getSelectedProvider();
    const voices = getBuiltInVoicesForProvider(provider);
    const previous = String(lessonAudioVoiceInput.value || "").trim();
    lessonAudioVoiceInput.innerHTML = voices
      .map((voice) => `<option value="${escapeHtml(voice.value)}">Voice: ${escapeHtml(voice.label)}</option>`)
      .join("");
    const fallback = provider === "gemini" ? "Kore" : "alloy";
    lessonAudioVoiceInput.value = voices.some((voice) => voice.value === previous) ? previous : fallback;
    if (!lessonAudioVoiceInput.value && voices.length) {
      lessonAudioVoiceInput.value = voices[0].value;
    }
  };

  const syncVoiceProviderUi = () => {
    const provider = getSelectedProvider();
    const isOpenAi = provider === "openai";

    renderBuiltInVoiceOptions();

    if (lessonCustomVoiceIdInput instanceof HTMLSelectElement) {
      lessonCustomVoiceIdInput.disabled = !isOpenAi;
      if (!isOpenAi) {
        lessonCustomVoiceIdInput.value = "";
      }
    }
    if (btnRefreshCustomVoices instanceof HTMLButtonElement) {
      btnRefreshCustomVoices.disabled = !isOpenAi;
      btnRefreshCustomVoices.title = isOpenAi ? "Refresh OpenAI custom voices." : "Custom voices are OpenAI only.";
    }
    if (voiceCloneSection instanceof HTMLElement) {
      voiceCloneSection.classList.toggle("hidden", !isOpenAi);
    }
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      if (!(file instanceof File)) {
        reject(new Error("Audio file is required."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        if (!result) {
          reject(new Error("Unable to read audio file."));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error("Unable to read audio file."));
      reader.readAsDataURL(file);
    });

  const getSelectedVoiceConfig = () => {
    const provider = getSelectedProvider();
    const customVoiceId = lessonCustomVoiceIdInput?.value?.trim() || "";
    if (provider === "openai" && customVoiceId) {
      return {
        provider,
        voice: customVoiceId,
        model: "gpt-4o-mini-tts",
      };
    }
    if (provider === "gemini") {
      return {
        provider,
        voice: lessonAudioVoiceInput?.value?.trim() || "Kore",
        model: "gemini-2.5-flash-preview-tts",
      };
    }
    return {
      provider,
      voice: lessonAudioVoiceInput?.value?.trim() || "alloy",
      model: "tts-1",
    };
  };

  const renderCustomVoiceOptions = () => {
    if (!(lessonCustomVoiceIdInput instanceof HTMLSelectElement)) return;
    const previous = lessonCustomVoiceIdInput.value || "";
    const options = [
      '<option value="">Voice ID: Built-in</option>',
      ...state.customVoices.map(
        (voice) =>
          `<option value="${escapeHtml(voice.id)}" title="${escapeHtml(
            voice.id
          )}">${escapeHtml(compactLabel(voice.name || voice.id, 36))}</option>`
      ),
    ];
    lessonCustomVoiceIdInput.innerHTML = options.join("");
    lessonCustomVoiceIdInput.value = previous;
    if (previous && !state.customVoices.some((voice) => voice.id === previous)) {
      lessonCustomVoiceIdInput.value = "";
    }
  };

  const renderChapterCourseOptions = () => {
    if (!(chapterCourseIdInput instanceof HTMLSelectElement)) return;
    if (!state.selectedCourseId && state.courses.length === 1) {
      state.selectedCourseId = state.courses[0].id;
    }
    const options = [
      '<option value="">Select course</option>',
      ...state.courses.map(
        (course) => `<option value="${course.id}">${escapeHtml(course.title)}</option>`
      ),
    ];
    chapterCourseIdInput.innerHTML = options.join("");
    chapterCourseIdInput.value = state.selectedCourseId || "";
  };

  const renderLessonCourseOptions = () => {
    if (!(lessonCourseIdInput instanceof HTMLSelectElement)) return;
    if (!state.selectedCourseId && state.courses.length === 1) {
      state.selectedCourseId = state.courses[0].id;
    }
    const options = [
      '<option value="">Select course</option>',
      ...state.courses.map(
        (course) =>
          `<option value="${course.id}" title="${escapeHtml(course.title)}">${escapeHtml(
            compactLabel(course.title, 30)
          )}</option>`
      ),
    ];
    lessonCourseIdInput.innerHTML = options.join("");
    lessonCourseIdInput.value = state.selectedCourseId || "";
  };

  const renderLessonChapterOptions = () => {
    if (!(lessonChapterIdInput instanceof HTMLSelectElement)) return;
    if (!state.selectedChapterId && state.chapters.length === 1) {
      state.selectedChapterId = state.chapters[0].id;
    }
    const options = [
      '<option value="">Select subject</option>',
      ...state.chapters.map(
        (chapter) => {
          const full = `${chapter.orderIndex}. ${chapter.title}`;
          return `<option value="${chapter.id}" title="${escapeHtml(full)}">${escapeHtml(
            compactLabel(full, 32)
          )}</option>`;
        }
      ),
    ];
    lessonChapterIdInput.innerHTML = options.join("");
    lessonChapterIdInput.value = state.selectedChapterId || "";
  };

  const renderLessonSelectOptions = () => {
    if (!(lessonSelectIdInput instanceof HTMLSelectElement)) return;
    const previousSelectedValue = String(lessonSelectIdInput.value || "").trim();
    const options = [
      '<option value="">Select chapter to edit</option>',
      `<option value="${LESSON_SELECT_NEW_VALUE}">+ Add new chapter</option>`,
      ...state.lessons.map((lesson) => {
        const label = `${lesson.orderIndex}. ${lesson.title || "Untitled"}`;
        return `<option value="${lesson.id}" title="${escapeHtml(label)}">${escapeHtml(
          compactLabel(label, 40)
        )}</option>`;
      }),
    ];
    lessonSelectIdInput.innerHTML = options.join("");
    const currentLessonId = lessonIdInput?.value?.trim() || "";
    const selectedValue =
      currentLessonId ||
      (previousSelectedValue === LESSON_SELECT_NEW_VALUE ? LESSON_SELECT_NEW_VALUE : "");
    lessonSelectIdInput.value = selectedValue;
  };

  const startCreateNewLessonMode = () => {
    const selectedCourseId = lessonCourseIdInput?.value?.trim() || state.selectedCourseId;
    const selectedChapterId = lessonChapterIdInput?.value?.trim() || state.selectedChapterId;
    if (!selectedCourseId || !selectedChapterId) {
      setMessage("Select course and subject first.", "error");
      return;
    }
    state.selectedCourseId = selectedCourseId;
    state.selectedChapterId = selectedChapterId;
    resetLessonForm();
    if (lessonSelectIdInput instanceof HTMLSelectElement) {
      lessonSelectIdInput.value = LESSON_SELECT_NEW_VALUE;
    }
    setMessage("Ready to create a new chapter.", "success");
    setVoiceStatus("");
    if (lessonOrderIndexInput) {
      lessonOrderIndexInput.value = String(getNextLessonOrderIndex());
    }
    if (lessonTitleInput instanceof HTMLInputElement) {
      lessonTitleInput.focus();
    }
  };

  const selectedMockCourse = () => state.courses.find((item) => item.id === state.selectedMockCourseId) || null;
  const selectedMockChapter = () =>
    state.mockChapters.find((item) => item.id === state.selectedMockChapterId) || null;
  const selectedMockLesson = () =>
    state.mockLessons.find((item) => item.id === state.selectedMockLessonId) || null;
  const linkedLessonForTest = (testId) =>
    state.mockLessons.find((lesson) => String(lesson?.assessmentTestId || "") === String(testId || "")) || null;
  const linkedLessonInLoadedLessons = (testId) =>
    state.lessons.find((lesson) => String(lesson?.assessmentTestId || "") === String(testId || "")) || null;
  let lessonTrackingCache = [];
  const findLinkedLessonForPlay = async (testId) => {
    const normalizedTestId = String(testId || "").trim();
    if (!normalizedTestId) return null;

    const localLinked = linkedLessonForTest(normalizedTestId) || linkedLessonInLoadedLessons(normalizedTestId);
    if (localLinked?.id) {
      return {
        lessonId: String(localLinked.id || "").trim(),
        chapterId: String(localLinked.chapterId || state.selectedMockChapterId || "").trim(),
      };
    }

    if (!lessonTrackingCache.length) {
      const response = await apiRequest({
        path: "/admin/lesson-items/tracking",
        token,
      });
      lessonTrackingCache = Array.isArray(response?.lessons) ? response.lessons : [];
    }

    const matched = lessonTrackingCache.find(
      (lesson) => String(lesson?.assessment?.id || "").trim() === normalizedTestId
    );
    if (!matched?.id) return null;
    return {
      lessonId: String(matched.id || "").trim(),
      chapterId: String(matched?.chapter?.id || "").trim(),
    };
  };
  const normalizeLookupText = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const inferMockExamTypeFromCourse = () => {
    const title = normalizeLookupText(selectedMockCourse()?.title || "");
    if (!title) return "PSTET_1";
    if (
      title.includes("pstet 2") ||
      title.includes("tet 2") ||
      title.includes("paper 2") ||
      /\b2\b/.test(title)
    ) {
      return "PSTET_2";
    }
    return "PSTET_1";
  };
  const inferMockSubjectFromChapter = () => {
    const title = normalizeLookupText(selectedMockChapter()?.title || "");
    if (!title) return "PUNJABI";
    if (title.includes("punjabi")) return "PUNJABI";
    if (title.includes("english")) return "ENGLISH";
    if (title.includes("child") || title.includes("pedagogy")) return "CHILD_PEDAGOGY";
    if (title.includes("social")) return "SOCIAL_STUDIES";
    if (title.includes("science") && title.includes("math")) return "SCIENCE_MATH";
    if (title.includes("math") && title.includes("evs")) return "MATHS_EVS";
    if (title.includes("maths") || title.includes("mathematics") || title.includes("evs")) return "MATHS_EVS";
    return "CHILD_PEDAGOGY";
  };
  const syncMockTaxonomyFromScope = (options = {}) => {
    const { force = false } = options;
    const examType = inferMockExamTypeFromCourse();
    const subject = inferMockSubjectFromChapter();
    if (lessonMockTestExamTypeInput) {
      const hasValue = Boolean(String(lessonMockTestExamTypeInput.value || "").trim());
      if (force || !hasValue || !state.selectedMockTestId) {
        lessonMockTestExamTypeInput.value = examType;
      }
    }
    if (lessonMockTestSubjectInput) {
      const hasValue = Boolean(String(lessonMockTestSubjectInput.value || "").trim());
      if (force || !hasValue || !state.selectedMockTestId) {
        lessonMockTestSubjectInput.value = subject;
      }
    }
    toggleMockSubjectDependentFields();
    if (!state.selectedMockTestId && lessonQuestionTargetCountInput instanceof HTMLInputElement) {
      const selectedSubject = lessonMockTestSubjectInput?.value || "PUNJABI";
      const suggested = REQUIRED_QUESTIONS_BY_SUBJECT[selectedSubject] || 30;
      lessonQuestionTargetCountInput.value = String(suggested);
    }
  };

  const renderMockCourseOptions = () => {
    if (!(mockLinkCourseIdInput instanceof HTMLSelectElement)) return;
    const options = [
      '<option value="">Select course</option>',
      ...state.courses.map(
        (course) =>
          `<option value="${course.id}" title="${escapeHtml(course.title)}">${escapeHtml(
            compactLabel(course.title, 30)
          )}</option>`
      ),
    ];
    mockLinkCourseIdInput.innerHTML = options.join("");
    mockLinkCourseIdInput.value = state.selectedMockCourseId || "";
  };

  const renderMockChapterOptions = () => {
    if (!(mockLinkChapterIdInput instanceof HTMLSelectElement)) return;
    const options = [
      '<option value="">Select subject</option>',
      ...state.mockChapters.map((chapter) => {
        const full = `${chapter.orderIndex}. ${chapter.title}`;
        return `<option value="${chapter.id}" title="${escapeHtml(full)}">${escapeHtml(
          compactLabel(full, 34)
        )}</option>`;
      }),
    ];
    mockLinkChapterIdInput.innerHTML = options.join("");
    mockLinkChapterIdInput.value = state.selectedMockChapterId || "";
  };

  const renderMockLessonOptions = () => {
    if (!(mockLinkLessonIdInput instanceof HTMLSelectElement)) return;
    const options = [
      '<option value="">Select chapter</option>',
      ...state.mockLessons.map((lesson) => {
        const label = `${lesson.orderIndex}. ${lesson.title || "Untitled"}`;
        return `<option value="${lesson.id}" title="${escapeHtml(label)}">${escapeHtml(
          compactLabel(label, 40)
        )}</option>`;
      }),
    ];
    mockLinkLessonIdInput.innerHTML = options.join("");
    mockLinkLessonIdInput.value = state.selectedMockLessonId || "";
  };

  const setTestsMode = (mode) => {
    const nextMode = mode === "attach" ? "attach" : "create";
    state.testsMode = nextMode;
    testsModeButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.classList.toggle("active", button.getAttribute("data-tests-mode") === nextMode);
    });
    if (testsCreatePanel instanceof HTMLElement) {
      testsCreatePanel.classList.toggle("hidden", nextMode !== "create");
    }
    if (testsAttachPanel instanceof HTMLElement) {
      testsAttachPanel.classList.toggle("hidden", nextMode !== "attach");
    }
    if (testsAttachFilterRow instanceof HTMLElement) {
      testsAttachFilterRow.classList.toggle("hidden", nextMode !== "attach");
    }
    if (testsTrackPanel instanceof HTMLElement) {
      testsTrackPanel.classList.toggle("hidden", nextMode !== "attach");
    }
    if (testsChapterDetailsPanel instanceof HTMLElement) {
      testsChapterDetailsPanel.classList.toggle("hidden", nextMode !== "create");
    }
    if (nextMode === "attach") {
      renderAttachExistingTestOptions();
      renderMockTestsAdmin();
    }
    setLessonQuestionBankVisibility();
  };

  const getAttachFilteredTests = () => {
    const selectedFilter = lessonAttachFilterTypeInput?.value || "all";
    const searchText = String(lessonAttachTestSearchInput?.value || "")
      .trim()
      .toLowerCase();
    return state.mockTestsAdmin.filter((test) => {
      const accessCode = String(test.accessCode || "DEMO").toUpperCase();
      if (selectedFilter !== "all" && accessCode !== String(selectedFilter).toUpperCase()) return false;
      if (!searchText) return true;
      const haystack = [
        String(test.title || ""),
        String(EXAM_LABELS[test.examType] || test.examType || ""),
        String(SUBJECT_LABELS[test.subject] || test.subject || ""),
        String(ACCESS_CODE_LABELS[test.accessCode] || test.accessCode || "DEMO"),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchText);
    });
  };

  const renderAttachExistingTestOptions = () => {
    if (!(lessonAttachExistingTestIdInput instanceof HTMLSelectElement)) return;
    const previous = lessonAttachExistingTestIdInput.value || "";
    const filteredTests = getAttachFilteredTests();
    const linkedLessonTestIds = new Set(
      [
        ...state.mockLessons
          .map((lesson) => String(lesson?.assessmentTestId || "").trim())
          .filter(Boolean),
        ...state.trackingLessons
          .map((lesson) => String(lesson?.assessment?.id || "").trim())
          .filter(Boolean),
      ].filter(Boolean)
    );
    const options = [
      '<option value="">Select existing test</option>',
      ...filteredTests.map((test) => {
        const typeLabel = linkedLessonTestIds.has(test.id) ? "Lesson Test" : "Mock Test";
        const activeQuestionCount = Number(test.activeQuestions ?? test._count?.questions ?? 0);
        const label = `${test.title || "Untitled"} [${typeLabel}] (${EXAM_LABELS[test.examType] || test.examType || "-"} / ${
          SUBJECT_LABELS[test.subject] || test.subject || "-"
        } / ${ACCESS_CODE_LABELS[test.accessCode] || test.accessCode || "DEMO"} / Q:${activeQuestionCount})`;
        return `<option value="${test.id}" title="${escapeHtml(label)}">${escapeHtml(
          compactLabel(label, 66)
        )}</option>`;
      }),
    ];
    lessonAttachExistingTestIdInput.innerHTML = options.join("");
    lessonAttachExistingTestIdInput.value =
      filteredTests.some((test) => test.id === previous) ? previous : "";
  };

  const resetLessonQuestionForm = () => {
    if (!(lessonQuestionForm instanceof HTMLFormElement)) return;
    lessonQuestionForm.reset();
    if (lessonQuestionIdInput instanceof HTMLInputElement) lessonQuestionIdInput.value = "";
    if (lessonQuestionIsActiveInput instanceof HTMLInputElement) lessonQuestionIsActiveInput.checked = true;
    if (lessonQuestionSubmitBtn instanceof HTMLButtonElement) lessonQuestionSubmitBtn.textContent = "Add Question";
    if (lessonQuestionCancelBtn instanceof HTMLButtonElement) lessonQuestionCancelBtn.classList.add("hidden");
  };

  const resetLessonQuestionEditForm = () => {
    if (!(lessonQuestionEditForm instanceof HTMLFormElement)) return;
    lessonQuestionEditForm.reset();
    if (lessonQuestionEditIdInput instanceof HTMLInputElement) lessonQuestionEditIdInput.value = "";
    if (lessonQuestionEditCorrectInput instanceof HTMLSelectElement) lessonQuestionEditCorrectInput.value = "A";
    if (lessonQuestionEditIsActiveInput instanceof HTMLInputElement) {
      lessonQuestionEditIsActiveInput.checked = true;
    }
  };

  const closeLessonQuestionEditModal = () => {
    if (!(lessonQuestionEditModal instanceof HTMLElement)) return;
    lessonQuestionEditModal.classList.remove("open");
    lessonQuestionEditModal.setAttribute("aria-hidden", "true");
    resetLessonQuestionEditForm();
  };

  const openLessonQuestionEditModal = (question) => {
    if (!(lessonQuestionEditModal instanceof HTMLElement)) return;
    if (!question) return;

    if (lessonQuestionEditIdInput instanceof HTMLInputElement) {
      lessonQuestionEditIdInput.value = String(question.id || "");
    }
    if (lessonQuestionEditTextInput instanceof HTMLTextAreaElement) {
      lessonQuestionEditTextInput.value = String(question.questionText || "");
    }
    if (lessonQuestionEditOptionAInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionAInput.value = String(question.optionA || "");
    }
    if (lessonQuestionEditOptionBInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionBInput.value = String(question.optionB || "");
    }
    if (lessonQuestionEditOptionCInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionCInput.value = String(question.optionC || "");
    }
    if (lessonQuestionEditOptionDInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionDInput.value = String(question.optionD || "");
    }
    if (lessonQuestionEditCorrectInput instanceof HTMLSelectElement) {
      lessonQuestionEditCorrectInput.value = String(question.correctOption || "A");
    }
    if (lessonQuestionEditExplanationInput instanceof HTMLInputElement) {
      lessonQuestionEditExplanationInput.value = String(question.explanation || "");
    }
    if (lessonQuestionEditIsActiveInput instanceof HTMLInputElement) {
      lessonQuestionEditIsActiveInput.checked = Boolean(question.isActive);
    }

    lessonQuestionEditModal.classList.add("open");
    lessonQuestionEditModal.setAttribute("aria-hidden", "false");
    lessonQuestionEditTextInput?.focus();
  };

  const buildLessonQuestionEditPayload = () => {
    const questionId = lessonQuestionEditIdInput?.value?.trim() || "";
    const payload = {
      questionText: lessonQuestionEditTextInput?.value?.trim() || "",
      optionA: lessonQuestionEditOptionAInput?.value?.trim() || "",
      optionB: lessonQuestionEditOptionBInput?.value?.trim() || "",
      optionC: lessonQuestionEditOptionCInput?.value?.trim() || "",
      optionD: lessonQuestionEditOptionDInput?.value?.trim() || "",
      correctOption: lessonQuestionEditCorrectInput?.value || "A",
      explanation: lessonQuestionEditExplanationInput?.value?.trim() || undefined,
      isActive: Boolean(lessonQuestionEditIsActiveInput?.checked),
    };

    if (!questionId) {
      throw new Error("Question id is missing.");
    }
    if (
      !payload.questionText ||
      !payload.optionA ||
      !payload.optionB ||
      !payload.optionC ||
      !payload.optionD
    ) {
      throw new Error("All question and options fields are required.");
    }

    return { questionId, payload };
  };

  const updateLessonQuestionFromModal = async () => {
    const { questionId, payload } = buildLessonQuestionEditPayload();
    await apiRequest({
      path: `/admin/questions/${encodeURIComponent(questionId)}`,
      method: "PATCH",
      token,
      body: payload,
    });
  };

  const syncQuestionTargetCountForSelectedTest = (options = {}) => {
    if (!(lessonQuestionTargetCountInput instanceof HTMLInputElement)) return;
    const { force = false } = options;
    const selected = selectedMockTest();
    const suggested = selected
      ? Number(selected.requiredQuestions || 0) || REQUIRED_QUESTIONS_BY_SUBJECT[selected.subject] || 30
      : 30;
    const current = Number(lessonQuestionTargetCountInput.value || 0);
    if (!force && Number.isFinite(current) && current > 0) return;
    lessonQuestionTargetCountInput.value = String(suggested);
  };

  const requiredQuestionsForLesson = () => {
    const selected = selectedMockTest();
    const fallback = selected
      ? Number(selected.requiredQuestions || 0) || REQUIRED_QUESTIONS_BY_SUBJECT[selected.subject] || 30
      : 30;
    const current = Math.floor(Number(lessonQuestionTargetCountInput?.value || 0));
    if (Number.isFinite(current) && current > 0) {
      return current;
    }
    return fallback;
  };

  const updateLessonQuestionCountWarning = () => {
    if (!(lessonQuestionCountWarning instanceof HTMLElement)) return;
    if (!isMockScopeReady()) {
      lessonQuestionCountWarning.textContent = "Select course, subject, and chapter first.";
      lessonQuestionCountWarning.classList.remove("success");
      lessonQuestionCountWarning.classList.remove("error");
      return;
    }
    if (!state.selectedMockTestId) {
      lessonQuestionCountWarning.textContent = "Create or attach a test first, then add questions.";
      lessonQuestionCountWarning.classList.remove("success");
      lessonQuestionCountWarning.classList.remove("error");
      return;
    }
    const required = requiredQuestionsForLesson();
    const currentCount = state.mockQuestions.filter((item) => Boolean(item?.isActive)).length;
    if (currentCount < required) {
      lessonQuestionCountWarning.textContent = `Warning: ${currentCount}/${required} questions. Add ${
        required - currentCount
      } more.`;
      lessonQuestionCountWarning.classList.remove("success");
      lessonQuestionCountWarning.classList.add("error");
      return;
    }
    lessonQuestionCountWarning.textContent = `Ready: ${currentCount}/${required} questions available.`;
    lessonQuestionCountWarning.classList.remove("error");
    lessonQuestionCountWarning.classList.add("success");
  };

  const renderLessonQuestions = () => {
    if (!(lessonQuestionsTableBody instanceof HTMLElement)) return;
    if (!state.mockQuestions.length) {
      lessonQuestionsTableBody.innerHTML = "<tr><td colspan='7'>No questions yet.</td></tr>";
      updateLessonQuestionCountWarning();
      return;
    }
    lessonQuestionsTableBody.innerHTML = state.mockQuestions
      .map(
        (question) => `
      <tr>
        <td>${escapeHtml(question.questionText || "-")}</td>
        <td>${escapeHtml(question.optionA || "-")}</td>
        <td>${escapeHtml(question.optionB || "-")}</td>
        <td>${escapeHtml(question.optionC || "-")}</td>
        <td>${escapeHtml(question.optionD || "-")}</td>
        <td>${escapeHtml(question.correctOption || "-")}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="table-btn edit" data-edit-lesson-question="${question.id}">Edit</button>
            <button type="button" class="table-btn delete" data-delete-lesson-question="${question.id}">Delete</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
    updateLessonQuestionCountWarning();
  };

  const updateLessonSelectedTestHint = () => {
    if (!(lessonSelectedTestHint instanceof HTMLElement)) return;
    if (!isMockScopeReady()) {
      lessonSelectedTestHint.textContent =
        "Select course, subject, and chapter. Then create or publish a test to add questions.";
      return;
    }
    if (!state.selectedMockTestId) {
      lessonSelectedTestHint.textContent =
        "No test linked yet for this chapter. Create a test or publish an existing one.";
      return;
    }
    const selected = selectedMockTest();
    lessonSelectedTestHint.textContent = selected
      ? `Managing questions for: ${selected.title}`
      : "Managing questions for selected test.";
  };

  const setLessonQuestionBankVisibility = () => {
    if (!(lessonQuestionBankPanel instanceof HTMLElement)) return;
    const shouldShow = isMockScopeReady() && state.testsMode === "create";
    lessonQuestionBankPanel.classList.toggle("hidden", !shouldShow);
    updateLessonSelectedTestHint();
    updateLessonQuestionCountWarning();
    if (lessonSubmitBtn instanceof HTMLButtonElement) {
      const canSave = state.testsMode !== "create" || Boolean(state.selectedMockLessonId);
      lessonSubmitBtn.disabled = !canSave;
      lessonSubmitBtn.textContent = state.hasPendingTestChanges ? "Save Test *" : "Save Test";
      lessonSubmitBtn.title = canSave
        ? "Save test with current chapter content."
        : "Select course, subject, and chapter first.";
    }
    if (lessonSaveTestBtn instanceof HTMLButtonElement) {
      const canSave = shouldShow && Boolean(state.selectedMockLessonId || mockLinkLessonIdInput?.value?.trim());
      lessonSaveTestBtn.disabled = !canSave;
      lessonSaveTestBtn.textContent = state.hasPendingTestChanges ? "Create Lesson *" : "Create Lesson";
      lessonSaveTestBtn.title = canSave
        ? "Create or update the lesson with transcript, test, and selected mode."
        : "Select course, subject, and chapter first.";
    }
  };

  const setPendingTestChanges = (value) => {
    state.hasPendingTestChanges = Boolean(value);
    setLessonQuestionBankVisibility();
  };

  const parseCsvText = (csvText) => {
    const rows = [];
    let currentRow = [];
    let currentField = "";
    let inQuotes = false;

    const text = String(csvText || "").replace(/^\uFEFF/, "");

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const nextChar = i + 1 < text.length ? text[i + 1] : "";

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i += 1;
        }
        currentRow.push(currentField.trim());
        const hasData = currentRow.some((value) => value !== "");
        if (hasData) rows.push(currentRow);
        currentRow = [];
        currentField = "";
        continue;
      }

      currentField += char;
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      const hasData = currentRow.some((value) => value !== "");
      if (hasData) rows.push(currentRow);
    }

    return rows;
  };

  const normalizeCsvRows = (rows) => {
    if (!rows.length) {
      throw new Error("CSV file is empty.");
    }

    const header = rows[0].map((cell) => cell.toLowerCase().replaceAll(" ", ""));
    const looksLikeHeader =
      header.includes("questiontext") &&
      header.includes("optiona") &&
      header.includes("optionb") &&
      header.includes("optionc") &&
      header.includes("optiond") &&
      header.includes("correctoption");

    const dataRows = looksLikeHeader ? rows.slice(1) : rows;
    if (!dataRows.length) {
      throw new Error("CSV has header only. Add at least one question row.");
    }

    return dataRows.map((row, index) => {
      if (row.length < 6) {
        throw new Error(`CSV row ${index + 1} is invalid. Minimum 6 columns required.`);
      }

      const questionText = (row[0] || "").trim();
      const optionA = (row[1] || "").trim();
      const optionB = (row[2] || "").trim();
      const optionC = (row[3] || "").trim();
      const optionD = (row[4] || "").trim();
      const correctOption = (row[5] || "").trim().toUpperCase();
      const explanation = (row[6] || "").trim();
      const isActiveRaw = (row[7] || "").trim().toLowerCase();

      if (!questionText || !optionA || !optionB || !optionC || !optionD) {
        throw new Error(`CSV row ${index + 1} has empty required columns.`);
      }
      if (!["A", "B", "C", "D"].includes(correctOption)) {
        throw new Error(`CSV row ${index + 1} has invalid correctOption: ${row[5]}`);
      }

      let isActive;
      if (isActiveRaw) {
        if (["true", "1", "yes", "y"].includes(isActiveRaw)) isActive = true;
        else if (["false", "0", "no", "n"].includes(isActiveRaw)) isActive = false;
        else throw new Error(`CSV row ${index + 1} has invalid isActive value: ${row[7]}`);
      }

      return {
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        explanation: explanation || undefined,
        isActive,
      };
    });
  };

  const setMockContextLabels = () => {
    if (!lessonMockContext) {
      setLessonQuestionBankVisibility();
      return;
    }
    if (!state.selectedMockCourseId) {
      lessonMockContext.textContent =
        "Select course, subject, and chapter to create or publish tests.";
      setLessonQuestionBankVisibility();
      return;
    }
    if (!state.selectedMockChapterId) {
      lessonMockContext.textContent = `Course: ${selectedMockCourse()?.title || "-"}. Select a subject.`;
      setLessonQuestionBankVisibility();
      return;
    }
    if (!state.selectedMockLessonId) {
      lessonMockContext.textContent = `Subject: ${selectedMockChapter()?.title || "-"}. Select a chapter.`;
      setLessonQuestionBankVisibility();
      return;
    }

    const courseTitle = selectedMockCourse()?.title || "-";
    const subjectTitle = selectedMockChapter()?.title || "-";
    const chapterTitle = selectedMockLesson()?.title || "-";
    lessonMockContext.textContent = `Ready to publish test questions: ${courseTitle} > ${subjectTitle} > ${chapterTitle}`;
    autoFillMockTestTitleFromSelectedLesson();
    setLessonQuestionBankVisibility();
  };

  const toggleMockSubjectDependentFields = () => {
    const examType = lessonMockTestExamTypeInput?.value || "PSTET_1";
    const subject = lessonMockTestSubjectInput?.value || "PUNJABI";
    const shouldShowStream =
      examType === "PSTET_2" && (subject === "SCIENCE_MATH" || subject === "SOCIAL_STUDIES");
    const shouldShowLanguage = NON_LANGUAGE_SUBJECTS.has(subject);

    if (lessonMockStreamWrap) lessonMockStreamWrap.classList.toggle("hidden", !shouldShowStream);
    if (lessonMockLanguageWrap instanceof HTMLElement) {
      lessonMockLanguageWrap.classList.remove("hidden");
    }

    if (lessonMockTestStreamChoiceInput instanceof HTMLSelectElement) {
      if (!shouldShowStream) {
        lessonMockTestStreamChoiceInput.value = "";
      } else if (!lessonMockTestStreamChoiceInput.value) {
        lessonMockTestStreamChoiceInput.value =
          subject === "SOCIAL_STUDIES" ? "SOCIAL_STUDIES" : "SCIENCE_MATH";
      }
    }

    if (lessonMockTestLanguageModeInput instanceof HTMLSelectElement) {
      lessonMockTestLanguageModeInput.disabled = !shouldShowLanguage;
      lessonMockTestLanguageModeInput.title = shouldShowLanguage
        ? ""
        : "Language mode is not required for this subject.";
      if (!shouldShowLanguage) {
        lessonMockTestLanguageModeInput.value = "";
      }
    }
  };

  const renderMockTestsAdmin = () => {
    if (!lessonMockTestsTableBody) return;
    const testsToRender = state.testsMode === "attach" ? getAttachFilteredTests() : state.mockTestsAdmin;
    if (!testsToRender.length) {
      lessonMockTestsTableBody.innerHTML =
        '<tr><td colspan="10" style="text-align:center;color:#666;">No tests found.</td></tr>';
      return;
    }

    lessonMockTestsTableBody.innerHTML = testsToRender
      .map((test) => {
        const rowSelected = state.selectedMockTestId === test.id || lessonMockTestIdInput?.value === test.id;
        const publishLabel = test.isActive ? "Published" : "Publish";
        return `
          <tr class="${rowSelected ? "row-selected" : ""}">
            <td>${escapeHtml(test.title || "-")}</td>
            <td>${escapeHtml(EXAM_LABELS[test.examType] || test.examType || "-")}</td>
            <td>${escapeHtml(SUBJECT_LABELS[test.subject] || test.subject || "-")}</td>
            <td>${escapeHtml(test.streamChoice ? STREAM_LABELS[test.streamChoice] || test.streamChoice : "")}</td>
            <td>${escapeHtml(test.languageMode ? LANGUAGE_LABELS[test.languageMode] || test.languageMode : "-")}</td>
            <td>${escapeHtml(ACCESS_CODE_LABELS[test.accessCode] || test.accessCode || "DEMO")}</td>
            <td>${Number(test.activeQuestions ?? test._count?.questions ?? 0)}</td>
            <td><span class="chip ${test.isActive ? "active" : "inactive"}">${
              test.isActive ? "Active" : "Inactive"
            }</span></td>
            <td>${escapeHtml(formatDateTime(test.updatedAt || test.createdAt))}</td>
            <td>
              <div class="table-actions">
                <button
                  type="button"
                  class="table-btn"
                  data-play-test="${test.id}"
                  title="Start attempt for testing"
                >Play</button>
                <button
                  type="button"
                  class="table-btn"
                  data-publish-test="${test.id}"
                  ${test.isActive ? 'disabled title="Already published for students."' : ""}
                >${publishLabel}</button>
                <select class="table-btn" data-test-action-select="${test.id}" aria-label="Select action for test">
                  <option value="">Actions</option>
                  <option value="edit">Edit</option>
                  <option value="delete">Delete</option>
                  <option value="deactivate">Deactivate</option>
                </select>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const setContextLabels = () => {
    if (chapterContext) {
      chapterContext.textContent = state.selectedCourseId
        ? `Course: ${selectedCourse()?.title || "-"}`
        : "Select a course first.";
    }
    if (chapterCourseIdInput instanceof HTMLSelectElement) {
      chapterCourseIdInput.value = state.selectedCourseId || "";
    }

    if (lessonContext) {
      lessonContext.textContent = state.selectedChapterId
        ? `Subject: ${selectedChapter()?.title || "-"}`
        : "Select a subject first.";
    }
    if (lessonCourseIdInput instanceof HTMLSelectElement) {
      lessonCourseIdInput.value = state.selectedCourseId || "";
    }
    if (lessonChapterIdInput instanceof HTMLSelectElement) {
      lessonChapterIdInput.value = state.selectedChapterId || "";
    }
    if (lessonSelectIdInput instanceof HTMLSelectElement) {
      const currentLessonId = lessonIdInput?.value?.trim() || "";
      lessonSelectIdInput.value = currentLessonId || "";
    }
    if (btnCreateNewLesson instanceof HTMLButtonElement) {
      const hasCourse = Boolean(lessonCourseIdInput?.value?.trim() || state.selectedCourseId);
      const hasSubject = Boolean(lessonChapterIdInput?.value?.trim() || state.selectedChapterId);
      const canCreate = hasCourse && hasSubject;
      btnCreateNewLesson.disabled = !canCreate;
      btnCreateNewLesson.title = canCreate ? "Start creating a new lesson." : "Select course and subject first.";
    }
    setMockContextLabels();
  };

  const resetCourseForm = () => {
    if (!courseForm) return;
    courseForm.reset();
    if (courseIdInput) courseIdInput.value = "";
    if (courseIsActiveInput) courseIsActiveInput.checked = true;
    if (courseSubmitBtn) courseSubmitBtn.textContent = "Create Course";
    if (courseCancelBtn) courseCancelBtn.classList.add("hidden");
  };

  const resetChapterForm = () => {
    if (!chapterForm) return;
    chapterForm.reset();
    if (chapterIdInput) chapterIdInput.value = "";
    if (chapterCourseIdInput instanceof HTMLSelectElement) {
      chapterCourseIdInput.value = state.selectedCourseId || "";
    }
    if (chapterSubmitBtn) chapterSubmitBtn.textContent = "Create Subject";
    if (chapterCancelBtn) chapterCancelBtn.classList.add("hidden");
  };

  const resetLessonForm = () => {
    if (!lessonForm) return;
    stopVoicePreview();
    finishVoiceGenerationProgress(false);
    lessonForm.reset();
    if (lessonIdInput) lessonIdInput.value = "";
    if (lessonCourseIdInput instanceof HTMLSelectElement) {
      lessonCourseIdInput.value = state.selectedCourseId || "";
    }
    if (lessonChapterIdInput instanceof HTMLSelectElement) {
      lessonChapterIdInput.value = state.selectedChapterId || "";
    }
    if (lessonSelectIdInput instanceof HTMLSelectElement) {
      lessonSelectIdInput.value = "";
    }
    if (lessonAudioLanguageInput instanceof HTMLSelectElement) {
      lessonAudioLanguageInput.value = "auto";
    }
    if (lessonAudioProviderInput instanceof HTMLSelectElement) {
      lessonAudioProviderInput.value = "openai";
    }
    if (lessonAudioVoiceInput instanceof HTMLSelectElement) {
      lessonAudioVoiceInput.value = "alloy";
    }
    if (lessonUploadedAudioInput instanceof HTMLInputElement) {
      lessonUploadedAudioInput.value = "";
    }
    syncVoiceProviderUi();
    renderLessonChapterOptions();
    setDurationHint(0, 0);
    ensureSampleTranscriptText();
    if (lessonSubmitBtn) lessonSubmitBtn.textContent = "Save Test";
    if (lessonCancelBtn) lessonCancelBtn.classList.add("hidden");
    if (lessonAssessmentTestIdInput) {
      lessonAssessmentTestIdInput.value = "";
    }
    if (lessonOrderIndexInput) {
      lessonOrderIndexInput.value = String(getNextLessonOrderIndex());
    }
    if (lessonTitleInput instanceof HTMLInputElement) {
      lessonTitleInput.value = getSuggestedLessonTitle();
    }
    if (btnGenerateVoice instanceof HTMLButtonElement) {
      btnGenerateVoice.disabled = true;
      btnGenerateVoice.title = "Create or load a lesson first.";
    }
  };

  const resetLessonMockTestForm = () => {
    if (!lessonMockTestForm) return;
    lessonMockTestForm.reset();
    setTestsMode("create");
    if (lessonMockTestIdInput) lessonMockTestIdInput.value = "";
    if (mockLinkCourseIdInput instanceof HTMLSelectElement) {
      mockLinkCourseIdInput.value = state.selectedMockCourseId || "";
    }
    if (mockLinkChapterIdInput instanceof HTMLSelectElement) {
      mockLinkChapterIdInput.value = state.selectedMockChapterId || "";
    }
    if (mockLinkLessonIdInput instanceof HTMLSelectElement) {
      mockLinkLessonIdInput.value = state.selectedMockLessonId || "";
    }
    if (lessonMockTestIsActiveInput instanceof HTMLInputElement) {
      lessonMockTestIsActiveInput.checked = true;
    }
    if (lessonMockTestAccessCodeInput) {
      lessonMockTestAccessCodeInput.value = "DEMO";
    }
    if (lessonMockSubmitBtn) lessonMockSubmitBtn.textContent = "Publish Test";
    if (lessonMockCancelBtn) lessonMockCancelBtn.classList.add("hidden");
    syncMockTaxonomyFromScope({ force: true });
    autoFillMockTestTitleFromSelectedLesson({ force: true });
    syncQuestionTargetCountForSelectedTest();
    renderLessonQuestions();
    renderAttachExistingTestOptions();
    renderMockTestsAdmin();
    setLessonQuestionBankVisibility();
  };

  const renderAssessmentOptions = (selectedValue = "") => {
    if (!(lessonAssessmentTestIdInput instanceof HTMLSelectElement)) return;
    const options = [
      '<option value="">None</option>',
      ...state.mockTests.map(
        (test) =>
          `<option value="${test.id}">${escapeHtml(test.title)} (${escapeHtml(test.examType)} / ${escapeHtml(
            test.subject
          )}${test.isActive ? "" : " / INACTIVE"})</option>`
      ),
    ];
    lessonAssessmentTestIdInput.innerHTML = options.join("");
    lessonAssessmentTestIdInput.value = selectedValue || "";
  };

  const populateLessonFormForEdit = (lesson) => {
    if (!lesson) return;
    state.selectedChapterId = lesson.chapterId || state.selectedChapterId;
    if (lessonIdInput) lessonIdInput.value = lesson.id || "";
    if (lessonSelectIdInput instanceof HTMLSelectElement) {
      lessonSelectIdInput.value = lesson.id || "";
    }
    if (lessonCourseIdInput instanceof HTMLSelectElement) {
      lessonCourseIdInput.value = state.selectedCourseId || "";
    }
    if (lessonChapterIdInput instanceof HTMLSelectElement) {
      lessonChapterIdInput.value = state.selectedChapterId || "";
    }
    if (lessonTitleInput) lessonTitleInput.value = lesson.title || "";
    if (lessonOrderIndexInput) lessonOrderIndexInput.value = String(lesson.orderIndex || "");
    if (lessonDurationSecInput) lessonDurationSecInput.value = String(lesson.durationSec || 0);
    if (lessonVideoUrlInput) lessonVideoUrlInput.value = lesson.videoUrl || "";
    if (lessonTranscriptTextInput) {
      lessonTranscriptTextInput.value = lesson.transcriptText || "";
      if (!lessonTranscriptTextInput.value.trim()) {
        lessonTranscriptTextInput.value = SAMPLE_TRANSCRIPT_TEXT;
      }
    }
    if (lessonUploadedAudioInput instanceof HTMLInputElement) {
      lessonUploadedAudioInput.value = "";
    }

    if (lessonAudioLanguageInput instanceof HTMLSelectElement) {
      const nextLanguage = String(lesson.audioLanguageHint || "auto");
      lessonAudioLanguageInput.value = nextLanguage || "auto";
      if (!lessonAudioLanguageInput.value) lessonAudioLanguageInput.value = "auto";
    }
    syncVoiceProviderUi();
    if (lessonAudioVoiceInput instanceof HTMLSelectElement) {
      const provider = getSelectedProvider();
      const fallbackVoice = provider === "gemini" ? "Kore" : "alloy";
      const nextVoice = String(lesson.audioVoice || fallbackVoice);
      lessonAudioVoiceInput.value = nextVoice || fallbackVoice;
      if (!lessonAudioVoiceInput.value) lessonAudioVoiceInput.value = fallbackVoice;
    }

    syncDurationFromTranscript();
    setContextLabels();
    renderAssessmentOptions(lesson.assessmentTestId || "");
    renderLessons();
    if (lessonSubmitBtn) lessonSubmitBtn.textContent = "Save Test";
    if (lessonCancelBtn) lessonCancelBtn.classList.remove("hidden");
    if (btnGenerateVoice instanceof HTMLButtonElement) {
      btnGenerateVoice.disabled = false;
      btnGenerateVoice.title = "Generate voice for this lesson.";
    }
  };

  const renderCourses = () => {
    if (!coursesTableBody) return;
    if (!state.courses.length) {
      coursesTableBody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:#666;">No courses yet.</td></tr>';
      return;
    }

    coursesTableBody.innerHTML = state.courses
      .map(
        (course) => `
          <tr class="${state.selectedCourseId === course.id ? "row-selected" : ""}">
            <td>${escapeHtml(course.title)}</td>
            <td><span class="chip ${course.isActive ? "active" : "inactive"}">${
              course.isActive ? "Active" : "Inactive"
            }</span></td>
            <td>${course._count?.chapters ?? 0}</td>
            <td>${escapeHtml(formatDateTime(course.updatedAt))}</td>
            <td>
              <div class="table-actions">
                <button class="table-btn" type="button" data-open-course="${course.id}">Subjects</button>
                <button class="table-btn edit" type="button" data-edit-course="${course.id}">Edit</button>
                <button class="table-btn" type="button" data-toggle-course="${course.id}" data-next-active="${
                  course.isActive ? "false" : "true"
                }">${course.isActive ? "Deactivate" : "Activate"}</button>
                <button class="table-btn delete" type="button" data-delete-course="${course.id}">Delete</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  };

  const renderChapters = () => {
    if (!chaptersTableBody) return;
    if (!state.selectedCourseId) {
      chaptersTableBody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:#666;">Select a course to view subjects.</td></tr>';
      return;
    }
    if (!state.chapters.length) {
      chaptersTableBody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:#666;">No subjects yet.</td></tr>';
      return;
    }

    chaptersTableBody.innerHTML = state.chapters
      .map(
        (chapter) => `
          <tr class="${state.selectedChapterId === chapter.id ? "row-selected" : ""}">
            <td>${chapter.orderIndex}</td>
            <td>${escapeHtml(chapter.title)}</td>
            <td>${chapter._count?.lessons ?? 0}</td>
            <td>${escapeHtml(formatDateTime(chapter.updatedAt))}</td>
            <td>
              <div class="table-actions">
                <button class="table-btn" type="button" data-open-chapter="${chapter.id}">Chapters</button>
                <button class="table-btn" type="button" data-play-chapter="${chapter.id}">Play</button>
                <button class="table-btn edit" type="button" data-edit-chapter="${chapter.id}">Edit</button>
                <button class="table-btn delete" type="button" data-delete-chapter="${chapter.id}">Delete</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  };

  const renderLessons = () => {
    if (!lessonsTableBody) return;
    renderLessonSelectOptions();
    if (!state.selectedChapterId) {
      lessonsTableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;color:#666;">Select a subject to view chapters.</td></tr>';
      return;
    }
    if (!state.lessons.length) {
      lessonsTableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;color:#666;">No chapters yet.</td></tr>';
      return;
    }

    const selectedLessonId = lessonIdInput?.value?.trim() || "";
    lessonsTableBody.innerHTML = state.lessons
      .map(
        (lesson) => `
          <tr class="${selectedLessonId === lesson.id ? "row-selected" : ""}">
            <td>${lesson.orderIndex}</td>
            <td>${escapeHtml(lesson.title)}</td>
            <td>${lesson.durationSec || 0}s</td>
            <td>${escapeHtml(lesson.assessmentTest?.title || "-")}</td>
            <td>${escapeHtml(formatDateTime(lesson.updatedAt))}</td>
            <td>
              <div class="table-actions">
                <button class="table-btn edit" type="button" data-edit-lesson="${lesson.id}">Edit</button>
                <button class="table-btn delete" type="button" data-delete-lesson="${lesson.id}">Delete</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  };

  const getTrackingScopeText = () => {
    const course = selectedCourse();
    const chapter = selectedChapter();
    if (chapter?.title) {
      return `Scope: ${course?.title || "-"} > ${chapter.title}`;
    }
    if (course?.title) {
      return `Scope: ${course.title} (all chapters)`;
    }
    return "Scope: all courses and chapters.";
  };

  const renderTrackingSummary = () => {
    if (lessonTrackingContext) {
      lessonTrackingContext.textContent = getTrackingScopeText();
    }

    if (!lessonTrackingSummary) return;
    const summary = state.trackingSummary;
    if (!summary) {
      lessonTrackingSummary.textContent = "";
      return;
    }

    lessonTrackingSummary.textContent = `Lessons: ${summary.totalLessons || 0} | With assessment: ${
      summary.withAssessment || 0
    } | Transcript ready: ${summary.transcriptReady || 0} | Audio ready: ${summary.audioReady || 0}`;
  };

  const renderLessonTracking = () => {
    if (!lessonTrackingTableBody) return;

    if (!state.trackingLessons.length) {
      lessonTrackingTableBody.innerHTML =
        '<tr><td colspan="10" style="text-align:center;color:#666;">No lessons found for current scope.</td></tr>';
      return;
    }

    lessonTrackingTableBody.innerHTML = state.trackingLessons
      .map(
        (lesson) => `
          <tr>
            <td>${escapeHtml(lesson.course?.title || "-")}</td>
            <td>${escapeHtml(lesson.chapter?.title || "-")}</td>
            <td>${escapeHtml(lesson.title || "-")}</td>
            <td>${Number(lesson.learnersStarted || 0)}</td>
            <td>${Number(lesson.learnersCompleted || 0)}</td>
            <td>${Number(lesson.completionRate || 0)}%</td>
            <td>${Number(lesson.averageWatchPercent || 0)}%</td>
            <td><span class="chip ${lesson.transcriptReady ? "active" : "inactive"}">${
              lesson.transcriptReady ? "Ready" : "Missing"
            }</span></td>
            <td><span class="chip ${lesson.audioReady ? "active" : "inactive"}">${
              lesson.audioReady ? "Ready" : "Missing"
            }</span></td>
            <td>${escapeHtml(formatDateTime(lesson.lastActivityAt || lesson.updatedAt))}</td>
          </tr>
        `
      )
      .join("");
  };

  const loadCourses = async () => {
    const response = await apiRequest({ path: "/admin/lesson-courses", token });
    state.courses = response.courses || [];
    if (state.selectedCourseId && !state.courses.some((course) => course.id === state.selectedCourseId)) {
      state.selectedCourseId = "";
      state.selectedChapterId = "";
    }
    if (
      state.selectedMockCourseId &&
      !state.courses.some((course) => course.id === state.selectedMockCourseId)
    ) {
      state.selectedMockCourseId = "";
      state.selectedMockChapterId = "";
      state.selectedMockLessonId = "";
      state.selectedMockTestId = "";
      state.mockChapters = [];
      state.mockLessons = [];
      state.mockQuestions = [];
      resetLessonQuestionForm();
      renderLessonQuestions();
    }
    renderCourses();
    renderChapterCourseOptions();
    renderLessonCourseOptions();
    renderMockCourseOptions();
    renderMockChapterOptions();
    renderMockLessonOptions();
    setContextLabels();
  };

  const loadChapters = async (courseId) => {
    if (!courseId) {
      state.chapters = [];
      renderChapters();
      renderLessonChapterOptions();
      setContextLabels();
      return;
    }
    const response = await apiRequest({
      path: `/admin/lesson-courses/${encodeURIComponent(courseId)}/chapters`,
      token,
    });
    state.chapters = response.chapters || [];
    renderChapters();
    renderLessonChapterOptions();
    setContextLabels();
  };

  const loadLessons = async (chapterId) => {
    if (!chapterId) {
      state.lessons = [];
      renderLessons();
      renderLessonSelectOptions();
      setContextLabels();
      if (lessonOrderIndexInput && !(lessonIdInput?.value?.trim() || "")) {
        lessonOrderIndexInput.value = "1";
      }
      return;
    }
    const response = await apiRequest({
      path: `/admin/lesson-chapters/${encodeURIComponent(chapterId)}/lessons`,
      token,
    });
    state.lessons = response.lessons || [];
    renderLessons();
    renderLessonSelectOptions();
    setContextLabels();
    if (lessonOrderIndexInput && !(lessonIdInput?.value?.trim() || "")) {
      lessonOrderIndexInput.value = String(getNextLessonOrderIndex());
      if (lessonTitleInput instanceof HTMLInputElement) {
        lessonTitleInput.value = getSuggestedLessonTitle();
      }
    }
  };

  const loadAssessments = async () => {
    const response = await apiRequest({ path: "/admin/lesson-assessments", token });
    state.mockTests = response.mockTests || [];
    renderAssessmentOptions();
  };

  const loadCustomVoices = async (options = {}) => {
    const { silent = false } = options;
    try {
      let response;
      try {
        response = await apiRequest({ path: "/api/admin/lessons/custom-voices", token });
      } catch (primaryError) {
        if (primaryError?.status !== 404) throw primaryError;
        response = await apiRequest({ path: "/admin/lessons/custom-voices", token });
      }
      state.customVoices = response.voices || [];
      renderCustomVoiceOptions();
      syncVoiceProviderUi();
    } catch (error) {
      if (silent) {
        state.customVoices = [];
        renderCustomVoiceOptions();
        syncVoiceProviderUi();
        return;
      }
      throw error;
    }
  };

  const loadMockQuestions = async (mockTestId) => {
    if (!mockTestId) {
      state.mockQuestions = [];
      renderLessonQuestions();
      return;
    }
    const response = await apiRequest({
      path: `/admin/mock-tests/${encodeURIComponent(mockTestId)}/questions`,
      token,
    });
    state.mockQuestions = response.questions || [];
    renderLessonQuestions();
  };

  const setSelectedMockTestId = async (mockTestId, options = {}) => {
    const { silent = true, forceQuestionCount = false } = options;
    state.selectedMockTestId = mockTestId || "";
    state.hasPendingTestChanges = false;
    resetLessonQuestionForm();
    syncQuestionTargetCountForSelectedTest({ force: forceQuestionCount });
    try {
      await loadMockQuestions(state.selectedMockTestId);
    } catch (error) {
      state.selectedMockTestId = "";
      state.mockQuestions = [];
      renderLessonQuestions();
      if (!silent) {
        setMessage(error.message || "Unable to load questions for selected test.", "error");
      }
    }
    renderAttachExistingTestOptions();
    renderMockTestsAdmin();
    updateLessonSelectedTestHint();
    setLessonQuestionBankVisibility();
    if (!silent && state.selectedMockTestId) {
      setMessage("Question section ready for selected test.", "success");
    }
  };

  const loadMockTestsAdmin = async () => {
    const response = await apiRequest({ path: "/admin/mock-tests", token });
    state.mockTestsAdmin = response.mockTests || [];
    if (state.selectedMockTestId && !state.mockTestsAdmin.some((item) => item.id === state.selectedMockTestId)) {
      state.selectedMockTestId = "";
      state.mockQuestions = [];
      resetLessonQuestionForm();
      renderLessonQuestions();
    }
    renderAttachExistingTestOptions();
    renderMockTestsAdmin();
    setLessonQuestionBankVisibility();
  };

  const loadMockChapters = async (courseId) => {
    if (!courseId) {
      state.mockChapters = [];
      state.mockLessons = [];
      state.selectedMockChapterId = "";
      state.selectedMockLessonId = "";
      state.selectedMockTestId = "";
      state.mockQuestions = [];
      resetLessonQuestionForm();
      renderLessonQuestions();
      renderMockChapterOptions();
      renderMockLessonOptions();
      setMockContextLabels();
      syncMockTaxonomyFromScope({ force: true });
      renderMockTestsAdmin();
      return;
    }

    const response = await apiRequest({
      path: `/admin/lesson-courses/${encodeURIComponent(courseId)}/chapters`,
      token,
    });
    state.mockChapters = response.chapters || [];

    if (!state.mockChapters.some((chapter) => chapter.id === state.selectedMockChapterId)) {
      state.selectedMockChapterId = "";
      state.selectedMockLessonId = "";
      state.mockLessons = [];
      state.selectedMockTestId = "";
      state.mockQuestions = [];
      resetLessonQuestionForm();
      renderLessonQuestions();
    }

    renderMockChapterOptions();
    renderMockLessonOptions();
    setMockContextLabels();
    syncMockTaxonomyFromScope({ force: true });
    renderMockTestsAdmin();
  };

  const loadMockLessons = async (chapterId) => {
    if (!chapterId) {
      state.mockLessons = [];
      state.selectedMockLessonId = "";
      state.selectedMockTestId = "";
      state.mockQuestions = [];
      resetLessonQuestionForm();
      renderLessonQuestions();
      renderMockLessonOptions();
      setMockContextLabels();
      syncMockTaxonomyFromScope({ force: true });
      renderMockTestsAdmin();
      return;
    }

    const response = await apiRequest({
      path: `/admin/lesson-chapters/${encodeURIComponent(chapterId)}/lessons`,
      token,
    });
    state.mockLessons = response.lessons || [];
    if (!state.mockLessons.some((lesson) => lesson.id === state.selectedMockLessonId)) {
      state.selectedMockLessonId = "";
      state.selectedMockTestId = "";
      state.mockQuestions = [];
      resetLessonQuestionForm();
      renderLessonQuestions();
    }
    renderMockLessonOptions();
    syncMockTaxonomyFromScope({ force: true });
    const selectedLesson = selectedMockLesson();
    const linkedTestId = selectedLesson?.assessmentTestId || "";
    if (linkedTestId) {
      await setSelectedMockTestId(linkedTestId, { silent: true, forceQuestionCount: true });
    } else if (!linkedTestId) {
      await setSelectedMockTestId("", { silent: true, forceQuestionCount: true });
    }
    setMockContextLabels();
    renderMockTestsAdmin();
  };

  const linkMockTestToLesson = async (mockTestId, lessonId, options = {}) => {
    const { silent = false } = options;
    if (!mockTestId) {
      throw new Error("Test id is required.");
    }
    if (!lessonId) {
      throw new Error("Select a chapter first.");
    }

    await apiRequest({
      path: `/admin/lesson-items/${encodeURIComponent(lessonId)}`,
      method: "PATCH",
      token,
      body: {
        assessmentTestId: mockTestId,
      },
    });

    if (!silent) {
      setMessage("Test attached to selected chapter.", "success");
    }

    if (state.selectedChapterId && state.selectedChapterId === state.selectedMockChapterId) {
      await loadLessons(state.selectedChapterId);
    }
    await Promise.all([loadAssessments(), loadLessonTracking()]);
  };

  const createOrUpdateLessonQuestion = async () => {
    if (!state.selectedMockTestId) throw new Error("Create or attach a test before adding questions.");
    const payload = {
      questionText: lessonQuestionTextInput?.value?.trim() || "",
      optionA: lessonOptionAInput?.value?.trim() || "",
      optionB: lessonOptionBInput?.value?.trim() || "",
      optionC: lessonOptionCInput?.value?.trim() || "",
      optionD: lessonOptionDInput?.value?.trim() || "",
      correctOption: lessonCorrectOptionInput?.value || "A",
      explanation: lessonQuestionExplanationInput?.value?.trim() || undefined,
      isActive: Boolean(lessonQuestionIsActiveInput?.checked),
    };

    if (
      !payload.questionText ||
      !payload.optionA ||
      !payload.optionB ||
      !payload.optionC ||
      !payload.optionD
    ) {
      throw new Error("All question and options fields are required.");
    }

    await apiRequest({
      path: `/admin/mock-tests/${encodeURIComponent(state.selectedMockTestId)}/questions`,
      method: "POST",
      token,
      body: payload,
    });
  };

  const handleLessonBulkImport = async () => {
    if (!state.selectedMockTestId) throw new Error("Create or attach a test before bulk import.");
    const text = lessonBulkImportTextInput?.value?.trim() || "";
    if (!text) throw new Error("Paste lines in format: question|A|B|C|D|correct|explanation.");

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    for (const line of lines) {
      const parts = line.split("|").map((item) => item.trim());
      if (parts.length < 6) {
        throw new Error(`Invalid line: ${line}`);
      }
      const [questionText, optionA, optionB, optionC, optionD, correctOption, explanation] = parts;
      const normalized = correctOption.toUpperCase();
      if (!["A", "B", "C", "D"].includes(normalized)) {
        throw new Error(`Invalid correct option in line: ${line}`);
      }
      await apiRequest({
        path: `/admin/mock-tests/${encodeURIComponent(state.selectedMockTestId)}/questions`,
        method: "POST",
        token,
        body: {
          questionText,
          optionA,
          optionB,
          optionC,
          optionD,
          correctOption: normalized,
          explanation,
          isActive: true,
        },
      });
    }
  };

  const handleLessonCsvBulkImport = async () => {
    if (!state.selectedMockTestId) throw new Error("Create or attach a test before CSV upload.");
    const file = lessonBulkImportCsvFileInput?.files?.[0];
    if (!file) {
      throw new Error("Please choose a CSV file.");
    }

    const csvText = await file.text();
    const parsedRows = parseCsvText(csvText);
    const rows = normalizeCsvRows(parsedRows);
    const response = await apiRequest({
      path: `/admin/mock-tests/${encodeURIComponent(state.selectedMockTestId)}/questions/import-csv`,
      method: "POST",
      token,
      body: {
        rows,
        replaceExisting: Boolean(lessonBulkImportReplaceExistingInput?.checked),
      },
    });
    return response?.result || { createdCount: rows.length, totalRows: rows.length };
  };

  const saveAndAttachLessonMockTestFromTopFields = async (options = {}) => {
    const { resetAfterSave = false } = options;
    const selectedLessonId = state.selectedMockLessonId || mockLinkLessonIdInput?.value?.trim() || "";
    if (!selectedLessonId) {
      throw new Error("Select course, subject, and chapter before creating a test.");
    }

    syncMockTaxonomyFromScope({ force: !state.selectedMockTestId });
    const payload = {
      title: lessonMockTestTitleInput?.value?.trim() || "",
      examType: lessonMockTestExamTypeInput?.value || "PSTET_1",
      subject: lessonMockTestSubjectInput?.value || "PUNJABI",
      streamChoice: lessonMockTestStreamChoiceInput?.value || null,
      languageMode: lessonMockTestLanguageModeInput?.value || null,
      accessCode: lessonMockTestAccessCodeInput?.value || "DEMO",
      isActive: Boolean(lessonMockTestIsActiveInput?.checked),
    };

    if (!payload.title) {
      throw new Error("Test title is required.");
    }
    if (NON_LANGUAGE_SUBJECTS.has(payload.subject) && !payload.languageMode) {
      throw new Error("Language mode is required for this subject.");
    }

    const existingTestId = lessonMockTestIdInput?.value?.trim() || "";
    let savedTestId = existingTestId;
    if (existingTestId) {
      const updated = await apiRequest({
        path: `/admin/mock-tests/${encodeURIComponent(existingTestId)}`,
        method: "PATCH",
        token,
        body: payload,
      });
      savedTestId = updated?.mockTest?.id || savedTestId;
    } else {
      const created = await apiRequest({
        path: "/admin/mock-tests",
        method: "POST",
        token,
        body: payload,
      });
      savedTestId = created?.mockTest?.id || "";
      if (savedTestId && !state.createdTestIds.includes(savedTestId)) {
        state.createdTestIds.push(savedTestId);
      }
    }

    if (!savedTestId) {
      throw new Error("Unable to get test id after save.");
    }

    await linkMockTestToLesson(savedTestId, selectedLessonId, { silent: true });

    await Promise.all([
      loadMockTestsAdmin(),
      state.selectedMockChapterId ? loadMockLessons(state.selectedMockChapterId) : Promise.resolve(),
    ]);

    await setSelectedMockTestId(savedTestId, { silent: true, forceQuestionCount: true });
    if (resetAfterSave) {
      resetLessonMockTestForm();
    }
    return savedTestId;
  };

  const publishMockTestForStudents = async (mockTestId) => {
    if (!mockTestId) {
      throw new Error("Test id is required.");
    }

    await apiRequest({
      path: `/admin/mock-tests/${encodeURIComponent(mockTestId)}`,
      method: "PATCH",
      token,
      body: {
        isActive: true,
      },
    });

    let linkedLessonId = state.selectedMockLessonId || mockLinkLessonIdInput?.value?.trim() || "";
    if (!linkedLessonId) {
      const alreadyLinkedLesson = state.mockLessons.find(
        (lesson) => String(lesson?.assessmentTestId || "").trim() === mockTestId
      );
      linkedLessonId = alreadyLinkedLesson?.id || "";
    }
    if (!linkedLessonId) {
      throw new Error("Select course, subject, and chapter before publishing so it appears on student dashboard.");
    }
    await linkMockTestToLesson(mockTestId, linkedLessonId, { silent: true });

    await Promise.all([
      loadMockTestsAdmin(),
      loadAssessments(),
      state.selectedMockChapterId ? loadMockLessons(state.selectedMockChapterId) : Promise.resolve(),
    ]);
    await setSelectedMockTestId(mockTestId, { silent: true, forceQuestionCount: true });

    return { linkedLessonId };
  };

  const loadLessonTracking = async () => {
    const query = {
      courseId: state.selectedCourseId || undefined,
      chapterId: state.selectedChapterId || undefined,
      search: lessonTrackingSearchInput?.value?.trim() || undefined,
    };

    const response = await apiRequest({
      path: "/admin/lesson-items/tracking",
      token,
      query,
    });

    state.trackingLessons = response.lessons || [];
    state.trackingSummary = response.summary || null;
    renderTrackingSummary();
    renderLessonTracking();
  };

  const syncMockScopeFromLessonScope = async () => {
    let changed = false;
    if (!state.selectedMockCourseId && state.selectedCourseId) {
      state.selectedMockCourseId = state.selectedCourseId;
      changed = true;
    }

    if (changed) {
      renderMockCourseOptions();
      await loadMockChapters(state.selectedMockCourseId);
    }

    if (
      state.selectedMockCourseId &&
      state.selectedMockCourseId === state.selectedCourseId &&
      !state.selectedMockChapterId &&
      state.selectedChapterId
    ) {
      state.selectedMockChapterId = state.selectedChapterId;
      renderMockChapterOptions();
      await loadMockLessons(state.selectedMockChapterId);
    }

    renderMockCourseOptions();
    renderMockChapterOptions();
    renderMockLessonOptions();
    setMockContextLabels();
    syncMockTaxonomyFromScope();
    renderMockTestsAdmin();
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      stopVoicePreview();
      clearAuth();
      goAdminLogin();
    });
  }

  tabButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener("click", async () => {
      const tabKey = button.getAttribute("data-admin-tab") || "courses";
      setActiveTab(tabKey);
      if (tabKey === "mocktests") {
        try {
          await syncMockScopeFromLessonScope();
        } catch (error) {
          setMessage(error.message || "Unable to load tests scope.", "error");
        }
      }
    });
  });

  testsModeButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-tests-mode") || "create";
      setTestsMode(mode);
    });
  });

  if (previewBtnModeVideo instanceof HTMLButtonElement) {
    previewBtnModeVideo.addEventListener("click", () => applyPreviewMode("video", { autoplay: true }));
  }

  if (previewBtnModeAudio instanceof HTMLButtonElement) {
    previewBtnModeAudio.addEventListener("click", () => applyPreviewMode("audio", { autoplay: true }));
  }

  if (previewAttemptTestBtn instanceof HTMLButtonElement) {
    previewAttemptTestBtn.addEventListener("click", async () => {
      const mockTestId = String(previewState.lesson?.assessmentTestId || "").trim();
      if (!mockTestId) {
        setPreviewStatus("No test is linked to this lesson yet.", "error");
        return;
      }
      const confirmed = await showConfirmDialog({
        title: "Confirm",
        message: "Are you sure you want to close transcript?",
        cancelText: "Cancel",
        confirmText: "Confirm",
      });
      if (!confirmed) return;

      const previewPlayer = getPreviewPlayer();
      const lessonStartMs = previewPlayer
        ? Math.max(0, Math.round(Number(previewPlayer.currentTime || 0) * 1000))
        : 0;
      previewAttemptTestBtn.disabled = true;
      try {
        stopPreviewSyncLoop();
        pausePreviewPlayers();
        closeLessonPreview();
        setPreviewStatus("Starting test attempt...");
        const response = await apiRequest({
          path: "/student/attempts",
          method: "POST",
          token,
          body: { mockTestId },
        });
        const attemptId = String(response?.attempt?.id || "").trim();
        if (!attemptId) {
          throw new Error("Unable to start test attempt.");
        }
        const params = new URLSearchParams();
        params.set("attemptId", attemptId);
        if (lessonStartMs > 0) {
          params.set("lessonStartMs", String(lessonStartMs));
        }
        window.location.href = `${getMockAttemptPath()}?${params.toString()}`;
      } catch (error) {
        setMessage(error?.message || "Unable to start test attempt.", "error");
      } finally {
        previewAttemptTestBtn.disabled = false;
      }
    });
  }

  if (previewHighlightModeInput instanceof HTMLSelectElement) {
    previewHighlightModeInput.addEventListener("change", () => {
      const next = String(previewHighlightModeInput.value || "auto").trim().toLowerCase();
      previewState.highlightMode = next === "word" || next === "line" ? next : "auto";
      applyPreviewHighlightMode();
    });
  }

  if (previewVoiceRateInput instanceof HTMLSelectElement) {
    previewVoiceRateInput.addEventListener("change", () => {
      const previousVoiceRate = Number(previewState.voiceRate || 1);
      const next = Number(previewVoiceRateInput.value || 1);
      previewState.voiceRate = Number.isFinite(next) && next > 0 ? next : 1;
      if (
        !previewState.textRateManual ||
        Math.abs(Number(previewState.textRate || 1) - previousVoiceRate) < 0.001
      ) {
        previewState.textRate = previewState.voiceRate;
      }
      applyPreviewPlaybackRate();
      const player = getPreviewPlayer();
      const rawMs = player ? Math.floor(Number(player.currentTime || 0) * 1000) : 0;
      highlightPreviewByTime(toHighlightTimeMs(rawMs) + 1);
      syncPreviewRateInputs();
    });
  }

  if (previewTextRateInput instanceof HTMLSelectElement) {
    previewTextRateInput.addEventListener("change", () => {
      const next = Number(previewTextRateInput.value || 1);
      previewState.textRate = Number.isFinite(next) && next > 0 ? next : 1;
      previewState.textRateManual = true;
      const player = getPreviewPlayer();
      const rawMs = player ? Math.floor(Number(player.currentTime || 0) * 1000) : 0;
      highlightPreviewByTime(toHighlightTimeMs(rawMs) + 1);
      syncPreviewRateInputs();
    });
  }

  if (previewScrollSpeedInput instanceof HTMLSelectElement) {
    previewScrollSpeedInput.addEventListener("change", () => {
      previewState.scrollSpeed = normalizeScrollSpeed(previewScrollSpeedInput.value);
      previewState.lastProductionScrollAt = 0;
      previewState.productionScrollVirtual = Number(previewTranscriptList?.scrollTop || 0);
      syncPreviewRateInputs();
      syncPreviewProductionTranscriptScroll();
    });
  }

  const applyPreviewSyncOffset = (nextValue) => {
    const next = Number(nextValue);
    previewState.syncOffsetMs = Number.isFinite(next)
      ? Math.max(-4000, Math.min(4000, Math.round(next)))
      : 0;
    const player = getPreviewPlayer();
    const rawMs = player ? Math.floor(Number(player.currentTime || 0) * 1000) : 0;
    highlightPreviewByTime(toHighlightTimeMs(rawMs) + 1);
    syncPreviewRateInputs();
  };

  const refreshPreviewAlignmentAtCurrentPosition = () => {
    syncPreviewTimelineCalibration();
    const player = getPreviewPlayer();
    const rawMs = player ? Math.floor(Number(player.currentTime || 0) * 1000) : 0;
    highlightPreviewByTime(toHighlightTimeMs(rawMs) + 1);
    syncPreviewRateInputs();
  };

  const applyPreviewAudioCut = ({ startMs, endMs }) => {
    const currentStart = Math.max(0, Math.round(Number(previewState.audioCutStartMs || 0)));
    const currentEnd = Math.max(0, Math.round(Number(previewState.audioCutEndMs || 0)));
    const nextStart = Number.isFinite(Number(startMs)) ? Math.max(0, Math.round(Number(startMs))) : currentStart;
    const nextEnd = Number.isFinite(Number(endMs)) ? Math.max(0, Math.round(Number(endMs))) : currentEnd;
    previewState.audioCutStartMs = nextStart;
    previewState.audioCutEndMs = nextEnd;

    const cutWindow = getPreviewAudioCutWindow();
    previewState.audioCutStartMs = cutWindow.startCutMs;
    previewState.audioCutEndMs = cutWindow.endCutMs;
    refreshPreviewAlignmentAtCurrentPosition();
  };

  const applyPreviewTextStretch = (nextValue) => {
    const next = Number(nextValue);
    previewState.textStretchPercent = Number.isFinite(next)
      ? Math.max(60, Math.min(180, Math.round(next)))
      : 100;
    refreshPreviewAlignmentAtCurrentPosition();
  };

  if (previewSyncOffsetInput instanceof HTMLInputElement) {
    previewSyncOffsetInput.addEventListener("input", () => {
      applyPreviewSyncOffset(previewSyncOffsetInput.value);
    });
    previewSyncOffsetInput.addEventListener("change", () => {
      applyPreviewSyncOffset(previewSyncOffsetInput.value);
    });
  }

  if (previewSyncOffsetManualInput instanceof HTMLInputElement) {
    previewSyncOffsetManualInput.addEventListener("input", () => {
      applyPreviewSyncOffset(previewSyncOffsetManualInput.value);
    });
    previewSyncOffsetManualInput.addEventListener("change", () => {
      applyPreviewSyncOffset(previewSyncOffsetManualInput.value);
    });
  }

  if (previewSyncOffsetResetBtn instanceof HTMLButtonElement) {
    previewSyncOffsetResetBtn.addEventListener("click", () => {
      applyPreviewSyncOffset(0);
    });
  }

  if (previewAudioCutStartInput instanceof HTMLInputElement) {
    previewAudioCutStartInput.addEventListener("input", () => {
      applyPreviewAudioCut({
        startMs: previewAudioCutStartInput.value,
      });
    });
    previewAudioCutStartInput.addEventListener("change", () => {
      applyPreviewAudioCut({
        startMs: previewAudioCutStartInput.value,
      });
    });
  }

  if (previewAudioCutEndInput instanceof HTMLInputElement) {
    previewAudioCutEndInput.addEventListener("input", () => {
      applyPreviewAudioCut({
        endMs: previewAudioCutEndInput.value,
      });
    });
    previewAudioCutEndInput.addEventListener("change", () => {
      applyPreviewAudioCut({
        endMs: previewAudioCutEndInput.value,
      });
    });
  }

  if (previewAudioCutStartManualInput instanceof HTMLInputElement) {
    previewAudioCutStartManualInput.addEventListener("input", () => {
      applyPreviewAudioCut({
        startMs: previewAudioCutStartManualInput.value,
      });
    });
    previewAudioCutStartManualInput.addEventListener("change", () => {
      applyPreviewAudioCut({
        startMs: previewAudioCutStartManualInput.value,
      });
    });
  }

  if (previewAudioCutEndManualInput instanceof HTMLInputElement) {
    previewAudioCutEndManualInput.addEventListener("input", () => {
      applyPreviewAudioCut({
        endMs: previewAudioCutEndManualInput.value,
      });
    });
    previewAudioCutEndManualInput.addEventListener("change", () => {
      applyPreviewAudioCut({
        endMs: previewAudioCutEndManualInput.value,
      });
    });
  }

  if (previewAudioCutResetBtn instanceof HTMLButtonElement) {
    previewAudioCutResetBtn.addEventListener("click", () => {
      applyPreviewAudioCut({ startMs: 0, endMs: 0 });
    });
  }

  if (previewTextStretchInput instanceof HTMLInputElement) {
    previewTextStretchInput.addEventListener("input", () => {
      applyPreviewTextStretch(previewTextStretchInput.value);
    });
    previewTextStretchInput.addEventListener("change", () => {
      applyPreviewTextStretch(previewTextStretchInput.value);
    });
  }

  if (previewTextStretchManualInput instanceof HTMLInputElement) {
    previewTextStretchManualInput.addEventListener("input", () => {
      applyPreviewTextStretch(previewTextStretchManualInput.value);
    });
    previewTextStretchManualInput.addEventListener("change", () => {
      applyPreviewTextStretch(previewTextStretchManualInput.value);
    });
  }

  if (previewTextStretchResetBtn instanceof HTMLButtonElement) {
    previewTextStretchResetBtn.addEventListener("click", () => {
      applyPreviewTextStretch(100);
    });
  }

  if (previewLineSyncSelect instanceof HTMLSelectElement) {
    previewLineSyncSelect.addEventListener("change", () => {
      syncSelectedLineOffsetInput();
    });
  }

  const refreshTranscriptAfterLineOffset = () => {
    const player = getPreviewPlayer();
    const rawMs = player ? Math.floor(Number(player.currentTime || 0) * 1000) : 0;
    highlightPreviewByTime(toHighlightTimeMs(rawMs) + 1);
    renderPreviewTranscript();
  };

  if (previewLineSyncApplyBtn instanceof HTMLButtonElement) {
    previewLineSyncApplyBtn.addEventListener("click", () => {
      if (!(previewLineSyncSelect instanceof HTMLSelectElement)) return;
      const selectedIndex = Number(previewLineSyncSelect.value || -1);
      if (!Number.isFinite(selectedIndex) || selectedIndex < 0) return;
      const nextOffset = Number(previewLineSyncMsInput?.value || 0);
      setLineOffsetMs(selectedIndex, nextOffset);
      syncSelectedLineOffsetInput();
      refreshTranscriptAfterLineOffset();
    });
  }

  if (previewLineSyncMsInput instanceof HTMLInputElement) {
    previewLineSyncMsInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (!(previewLineSyncApplyBtn instanceof HTMLButtonElement)) return;
      previewLineSyncApplyBtn.click();
    });
  }

  if (previewLineSyncResetBtn instanceof HTMLButtonElement) {
    previewLineSyncResetBtn.addEventListener("click", () => {
      if (!(previewLineSyncSelect instanceof HTMLSelectElement)) return;
      const selectedIndex = Number(previewLineSyncSelect.value || -1);
      if (!Number.isFinite(selectedIndex) || selectedIndex < 0) return;
      setLineOffsetMs(selectedIndex, 0);
      syncSelectedLineOffsetInput();
      refreshTranscriptAfterLineOffset();
    });
  }

  if (previewVideo instanceof HTMLVideoElement) {
    previewVideo.addEventListener("timeupdate", () => {
      const ms = Math.floor(Number(previewVideo.currentTime || 0) * 1000);
      highlightPreviewByTime(toHighlightTimeMs(ms));
    });
    previewVideo.addEventListener("loadedmetadata", () => {
      syncPreviewTimelineCalibration();
      const ms = Math.floor(Number(previewVideo.currentTime || 0) * 1000);
      highlightPreviewByTime(toHighlightTimeMs(ms));
    });
    previewVideo.addEventListener("play", startPreviewSyncLoop);
    previewVideo.addEventListener("pause", stopPreviewSyncLoop);
    previewVideo.addEventListener("ended", stopPreviewSyncLoop);
    previewVideo.addEventListener("seeking", () => {
      const ms = Math.floor(Number(previewVideo.currentTime || 0) * 1000);
      highlightPreviewByTime(toHighlightTimeMs(ms));
    });
    previewVideo.addEventListener("error", () => {
      setPreviewStatus("Video preview failed to load. Check video URL/format.", "error");
    });
  }

  if (previewAudio instanceof HTMLAudioElement) {
    previewAudio.addEventListener("timeupdate", () => {
      const ms = Math.floor(Number(previewAudio.currentTime || 0) * 1000);
      highlightPreviewByTime(toHighlightTimeMs(ms));
    });
    previewAudio.addEventListener("play", startPreviewSyncLoop);
    previewAudio.addEventListener("pause", stopPreviewSyncLoop);
    previewAudio.addEventListener("ended", stopPreviewSyncLoop);
    previewAudio.addEventListener("seeking", () => {
      const ms = Math.floor(Number(previewAudio.currentTime || 0) * 1000);
      highlightPreviewByTime(toHighlightTimeMs(ms));
    });
    previewAudio.addEventListener("error", () => {
      setPreviewStatus("Audio preview failed to load. Regenerate voice and try again.", "error");
    });
    previewAudio.addEventListener("loadedmetadata", () => {
      syncPreviewTimelineCalibration();
      const duration = Number(previewAudio.duration || 0);
      const ms = Math.floor(Number(previewAudio.currentTime || 0) * 1000);
      highlightPreviewByTime(toHighlightTimeMs(ms));
      if (Number.isFinite(duration) && duration > 0) {
        if (!String(lessonPreviewStatus?.textContent || "").includes("Press play")) {
          setPreviewStatus("");
        }
      }
    });
  }

  if (lessonPreviewClose) {
    lessonPreviewClose.addEventListener("click", closeLessonPreview);
  }

  if (lessonPreviewModal) {
    lessonPreviewModal.addEventListener("click", (event) => {
      if (event.target === lessonPreviewModal) {
        closeLessonPreview();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lessonPreviewModal?.classList.contains("open")) {
      closeLessonPreview();
    }
  });

  if (courseForm) {
    courseForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = {
        title: courseTitleInput?.value?.trim() || "",
        description: courseDescriptionInput?.value?.trim() || undefined,
        isActive: Boolean(courseIsActiveInput?.checked),
      };
      if (!payload.title) {
        setMessage("Course title is required.", "error");
        return;
      }

      try {
        setMessage("Saving course...");
        const courseId = courseIdInput?.value || "";
        if (courseId) {
          await apiRequest({
            path: `/admin/lesson-courses/${encodeURIComponent(courseId)}`,
            method: "PATCH",
            token,
            body: payload,
          });
          setMessage("Course updated.", "success");
        } else {
          const created = await apiRequest({
            path: "/admin/lesson-courses",
            method: "POST",
            token,
            body: payload,
          });
          state.selectedCourseId = created?.course?.id || state.selectedCourseId;
          setMessage("Course created.", "success");
        }
        resetCourseForm();
        await loadCourses();
        if (state.selectedCourseId) {
          await loadChapters(state.selectedCourseId);
        }
        await loadLessonTracking();
      } catch (error) {
        setMessage(error.message || "Unable to save course.", "error");
      }
    });
  }

  if (courseCancelBtn) {
    courseCancelBtn.addEventListener("click", () => {
      resetCourseForm();
      setMessage("");
    });
  }

  if (coursesTableBody) {
    coursesTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const openCourseId = target.getAttribute("data-open-course");
      if (openCourseId) {
        state.selectedCourseId = openCourseId;
        state.selectedChapterId = "";
        resetChapterForm();
        resetLessonForm();
        setActiveTab("chapters");
        await loadChapters(openCourseId);
        state.lessons = [];
        renderLessons();
        renderCourses();
        await loadLessonTracking();
        return;
      }

      const editCourseId = target.getAttribute("data-edit-course");
      if (editCourseId) {
        const course = state.courses.find((item) => item.id === editCourseId);
        if (!course) return;
        if (courseIdInput) courseIdInput.value = course.id;
        if (courseTitleInput) courseTitleInput.value = course.title || "";
        if (courseDescriptionInput) courseDescriptionInput.value = course.description || "";
        if (courseIsActiveInput) courseIsActiveInput.checked = Boolean(course.isActive);
        if (courseSubmitBtn) courseSubmitBtn.textContent = "Update Course";
        if (courseCancelBtn) courseCancelBtn.classList.remove("hidden");
        return;
      }

      const toggleCourseId = target.getAttribute("data-toggle-course");
      if (toggleCourseId) {
        const nextActive = target.getAttribute("data-next-active") === "true";
        try {
          await apiRequest({
            path: `/admin/lesson-courses/${encodeURIComponent(toggleCourseId)}`,
            method: "PATCH",
            token,
            body: { isActive: nextActive },
          });
          await loadCourses();
          await loadLessonTracking();
          setMessage("Course status updated.", "success");
        } catch (error) {
          setMessage(error.message || "Unable to update course status.", "error");
        }
        return;
      }

      const deleteCourseId = target.getAttribute("data-delete-course");
      if (deleteCourseId) {
        const confirmed = window.confirm(
          "Delete this course? All linked subjects and chapters will be deleted."
        );
        if (!confirmed) return;
        try {
          await apiRequest({
            path: `/admin/lesson-courses/${encodeURIComponent(deleteCourseId)}`,
            method: "DELETE",
            token,
          });
          if (state.selectedCourseId === deleteCourseId) {
            state.selectedCourseId = "";
            state.selectedChapterId = "";
            state.chapters = [];
            state.lessons = [];
            renderChapters();
            renderLessons();
            setContextLabels();
          }
          await loadCourses();
          await loadLessonTracking();
          setMessage("Course deleted.", "success");
        } catch (error) {
          setMessage(error.message || "Unable to delete course.", "error");
        }
      }
    });
  }

  if (chapterForm) {
    chapterForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const selectedCourseId = chapterCourseIdInput?.value?.trim() || state.selectedCourseId;
      if (!selectedCourseId) {
        setMessage("Select a course first.", "error");
        return;
      }
      state.selectedCourseId = selectedCourseId;
      renderCourses();

      const payload = {
        courseId: selectedCourseId,
        title: chapterTitleInput?.value?.trim() || "",
        description: chapterDescriptionInput?.value?.trim() || undefined,
        orderIndex: chapterOrderIndexInput?.value ? Number(chapterOrderIndexInput.value) : 0,
      };

      if (!payload.title || !payload.orderIndex) {
        setMessage("Subject title and order index are required.", "error");
        return;
      }

      try {
        setMessage("Saving subject...");
        const chapterId = chapterIdInput?.value || "";
        if (chapterId) {
          await apiRequest({
            path: `/admin/lesson-chapters/${encodeURIComponent(chapterId)}`,
            method: "PATCH",
            token,
            body: {
              title: payload.title,
              description: payload.description,
              orderIndex: payload.orderIndex,
            },
          });
          setMessage("Subject updated.", "success");
        } else {
          const created = await apiRequest({
            path: "/admin/lesson-chapters",
            method: "POST",
            token,
            body: payload,
          });
          state.selectedChapterId = created?.chapter?.id || state.selectedChapterId;
          setMessage("Subject created.", "success");
        }
        resetChapterForm();
        await loadChapters(selectedCourseId);
        if (state.selectedChapterId) {
          await loadLessons(state.selectedChapterId);
        }
        await loadLessonTracking();
      } catch (error) {
        setMessage(error.message || "Unable to save subject.", "error");
      }
    });
  }

  if (chapterCancelBtn) {
    chapterCancelBtn.addEventListener("click", () => {
      resetChapterForm();
      setMessage("");
    });
  }

  if (chapterCourseIdInput) {
    chapterCourseIdInput.addEventListener("change", async () => {
      const nextCourseId = chapterCourseIdInput?.value?.trim() || "";
      state.selectedCourseId = nextCourseId;
      state.selectedChapterId = "";
      resetChapterForm();
      resetLessonForm();

      try {
        if (nextCourseId) {
          await loadChapters(nextCourseId);
        } else {
          state.chapters = [];
          renderChapters();
        }
        state.lessons = [];
        renderLessons();
        renderCourses();
        await loadLessonTracking();
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to load subjects for selected course.", "error");
      }
    });
  }

  if (lessonCourseIdInput) {
    lessonCourseIdInput.addEventListener("change", async () => {
      const nextCourseId = lessonCourseIdInput?.value?.trim() || "";
      state.selectedCourseId = nextCourseId;
      state.selectedChapterId = "";
      resetLessonForm();

      try {
        if (nextCourseId) {
          await loadChapters(nextCourseId);
          if (state.chapters.length) {
            state.selectedChapterId = state.chapters[0].id;
            if (lessonChapterIdInput instanceof HTMLSelectElement) {
              lessonChapterIdInput.value = state.selectedChapterId;
            }
            resetLessonForm();
            await loadLessons(state.selectedChapterId);
          } else {
            state.lessons = [];
            renderLessons();
            setContextLabels();
          }
        } else {
          state.chapters = [];
          renderChapters();
          renderLessonChapterOptions();
          setContextLabels();
          state.lessons = [];
          renderLessons();
        }
        renderCourses();
        await loadLessonTracking();
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to load subjects for selected course.", "error");
      }
    });
  }

  if (lessonChapterIdInput) {
    lessonChapterIdInput.addEventListener("change", async () => {
      const nextChapterId = lessonChapterIdInput?.value?.trim() || "";
      state.selectedChapterId = nextChapterId;
      resetLessonForm();
      try {
        if (nextChapterId) {
          await loadLessons(nextChapterId);
        } else {
          state.lessons = [];
          renderLessons();
          setContextLabels();
        }
        renderChapters();
        await loadLessonTracking();
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to load chapters for selected subject.", "error");
      }
    });
  }

  if (lessonSelectIdInput) {
    lessonSelectIdInput.addEventListener("change", () => {
      const selectedLessonId = lessonSelectIdInput?.value?.trim() || "";
      if (selectedLessonId === LESSON_SELECT_NEW_VALUE) {
        startCreateNewLessonMode();
        return;
      }
      if (!selectedLessonId) {
        resetLessonForm();
        setMessage("");
        return;
      }

      const selectedLesson = state.lessons.find((item) => item.id === selectedLessonId);
      if (!selectedLesson) return;
      populateLessonFormForEdit(selectedLesson);
      setMessage("Lesson loaded. Transcript is ready for editing and voice generation.", "success");
    });
  }

  if (mockLinkCourseIdInput) {
    mockLinkCourseIdInput.addEventListener("change", async () => {
      const nextCourseId = mockLinkCourseIdInput?.value?.trim() || "";
      state.selectedMockCourseId = nextCourseId;
      state.selectedMockChapterId = "";
      state.selectedMockLessonId = "";
      state.selectedMockTestId = "";
      state.mockLessons = [];
      state.mockQuestions = [];
      if (lessonMockTestIdInput instanceof HTMLInputElement) lessonMockTestIdInput.value = "";
      if (lessonMockSubmitBtn instanceof HTMLButtonElement) lessonMockSubmitBtn.textContent = "Publish Test";
      if (lessonMockCancelBtn instanceof HTMLButtonElement) lessonMockCancelBtn.classList.add("hidden");
      resetLessonQuestionForm();
      renderLessonQuestions();
      renderMockCourseOptions();
      renderMockLessonOptions();
      try {
        await loadMockChapters(nextCourseId);
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to load subjects for selected course.", "error");
      }
    });
  }

  if (mockLinkChapterIdInput) {
    mockLinkChapterIdInput.addEventListener("change", async () => {
      const nextChapterId = mockLinkChapterIdInput?.value?.trim() || "";
      state.selectedMockChapterId = nextChapterId;
      state.selectedMockLessonId = "";
      state.selectedMockTestId = "";
      state.mockQuestions = [];
      if (lessonMockTestIdInput instanceof HTMLInputElement) lessonMockTestIdInput.value = "";
      if (lessonMockSubmitBtn instanceof HTMLButtonElement) lessonMockSubmitBtn.textContent = "Publish Test";
      if (lessonMockCancelBtn instanceof HTMLButtonElement) lessonMockCancelBtn.classList.add("hidden");
      resetLessonQuestionForm();
      renderLessonQuestions();
      renderMockChapterOptions();
      try {
        await loadMockLessons(nextChapterId);
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to load chapters for selected subject.", "error");
      }
    });
  }

  if (mockLinkLessonIdInput) {
    mockLinkLessonIdInput.addEventListener("change", async () => {
      state.selectedMockLessonId = mockLinkLessonIdInput?.value?.trim() || "";
      try {
        if (lessonMockTestIdInput instanceof HTMLInputElement) lessonMockTestIdInput.value = "";
        if (lessonMockSubmitBtn instanceof HTMLButtonElement) {
          lessonMockSubmitBtn.textContent = "Publish Test";
        }
        if (lessonMockCancelBtn instanceof HTMLButtonElement) {
          lessonMockCancelBtn.classList.add("hidden");
        }
        const selectedLesson = selectedMockLesson();
        const linkedTestId = selectedLesson?.assessmentTestId || "";
        if (linkedTestId) {
          await setSelectedMockTestId(linkedTestId, { silent: true, forceQuestionCount: true });
        } else {
          await setSelectedMockTestId("", { silent: true, forceQuestionCount: true });
        }
        autoFillMockTestTitleFromSelectedLesson({ force: true });
        renderMockLessonOptions();
        setMockContextLabels();
        syncMockTaxonomyFromScope();
        renderMockTestsAdmin();
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to load linked test for selected chapter.", "error");
      }
    });
  }

  if (lessonMockTestExamTypeInput) {
    lessonMockTestExamTypeInput.addEventListener("change", () => {
      toggleMockSubjectDependentFields();
    });
  }

  if (lessonMockTestSubjectInput) {
    lessonMockTestSubjectInput.addEventListener("change", () => {
      toggleMockSubjectDependentFields();
      if (!state.selectedMockTestId && lessonQuestionTargetCountInput instanceof HTMLInputElement) {
        const subject = lessonMockTestSubjectInput?.value || "PUNJABI";
        const suggested = REQUIRED_QUESTIONS_BY_SUBJECT[subject] || 30;
        lessonQuestionTargetCountInput.value = String(suggested);
      }
    });
  }

  if (btnRefreshCustomVoices) {
    btnRefreshCustomVoices.addEventListener("click", async () => {
      if (getSelectedProvider() !== "openai") {
        setCloneVoiceStatus("Custom voices are available only with OpenAI provider.", "error");
        return;
      }
      try {
        setCloneVoiceStatus("Refreshing custom voices...");
        await loadCustomVoices();
        setCloneVoiceStatus("Custom voices list updated.", "success");
      } catch (error) {
        setCloneVoiceStatus(error.message || "Unable to load custom voices.", "error");
      }
    });
  }

  if (btnCreateVoiceClone) {
    btnCreateVoiceClone.addEventListener("click", async () => {
      if (getSelectedProvider() !== "openai") {
        setCloneVoiceStatus("Voice cloning is available only with OpenAI provider.", "error");
        return;
      }
      try {
        const name = cloneVoiceNameInput?.value?.trim() || "";
        const consentStatement = cloneConsentStatementInput?.value?.trim() || "";
        const consentFile = cloneConsentAudioInput?.files?.[0];
        const sampleFile = cloneSampleAudioInput?.files?.[0];

        if (!name) {
          setCloneVoiceStatus("Voice name is required.", "error");
          return;
        }
        if (!consentFile || !sampleFile) {
          setCloneVoiceStatus("Upload consent and sample audio files.", "error");
          return;
        }

        setCloneVoiceStatus("Uploading files and creating custom voice...");
        const [consentAudioBase64, sampleAudioBase64] = await Promise.all([
          readFileAsBase64(consentFile),
          readFileAsBase64(sampleFile),
        ]);

        let created;
        try {
          created = await apiRequest({
            path: "/api/admin/lessons/custom-voices",
            method: "POST",
            token,
            body: {
              name,
              description: "Created from Admin Lessons",
              consentStatement,
              consentAudioBase64,
              consentAudioMimeType: consentFile.type || "audio/mpeg",
              sampleAudioBase64,
              sampleAudioMimeType: sampleFile.type || "audio/mpeg",
            },
          });
        } catch (primaryError) {
          if (primaryError?.status !== 404) throw primaryError;
          created = await apiRequest({
            path: "/admin/lessons/custom-voices",
            method: "POST",
            token,
            body: {
              name,
              description: "Created from Admin Lessons",
              consentStatement,
              consentAudioBase64,
              consentAudioMimeType: consentFile.type || "audio/mpeg",
              sampleAudioBase64,
              sampleAudioMimeType: sampleFile.type || "audio/mpeg",
            },
          });
        }

        await loadCustomVoices();
        const newVoiceId = created?.voice?.id || "";
        if (lessonCustomVoiceIdInput instanceof HTMLSelectElement && newVoiceId) {
          lessonCustomVoiceIdInput.value = newVoiceId;
        }
        setCloneVoiceStatus("Custom voice created. It is now selected.", "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create custom voice.";
        setCloneVoiceStatus(message, "error");
      }
    });
  }

  if (lessonTranscriptTextInput) {
    lessonTranscriptTextInput.addEventListener("input", () => {
      syncDurationFromTranscript();
    });
  }

  if (chaptersTableBody) {
    chaptersTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const openChapterId = target.getAttribute("data-open-chapter");
      if (openChapterId) {
        state.selectedChapterId = openChapterId;
        resetLessonForm();
        setActiveTab("lessons");
        await loadLessons(openChapterId);
        renderChapters();
        await loadLessonTracking();
        return;
      }

      const playChapterId = target.getAttribute("data-play-chapter");
      if (playChapterId) {
        state.selectedChapterId = playChapterId;
        resetLessonForm();
        try {
          await loadLessons(playChapterId);
          renderChapters();
          const firstLesson = state.lessons[0];
          if (!firstLesson) {
            setMessage("No chapters available in this subject to play.", "error");
            return;
          }
          openLessonPreview(firstLesson);
        } catch (error) {
          setMessage(error.message || "Unable to play chapter preview.", "error");
        }
        return;
      }

      const editChapterId = target.getAttribute("data-edit-chapter");
      if (editChapterId) {
        const chapter = state.chapters.find((item) => item.id === editChapterId);
        if (!chapter) return;
        if (chapterIdInput) chapterIdInput.value = chapter.id;
        if (chapterCourseIdInput instanceof HTMLSelectElement) {
          chapterCourseIdInput.value = state.selectedCourseId || "";
        }
        if (chapterTitleInput) chapterTitleInput.value = chapter.title || "";
        if (chapterOrderIndexInput) chapterOrderIndexInput.value = String(chapter.orderIndex || "");
        if (chapterDescriptionInput) chapterDescriptionInput.value = chapter.description || "";
        if (chapterSubmitBtn) chapterSubmitBtn.textContent = "Update Subject";
        if (chapterCancelBtn) chapterCancelBtn.classList.remove("hidden");
        return;
      }

      const deleteChapterId = target.getAttribute("data-delete-chapter");
      if (deleteChapterId) {
        const confirmed = window.confirm(
          "Delete this subject? All linked chapters will be deleted."
        );
        if (!confirmed) return;
        try {
          await apiRequest({
            path: `/admin/lesson-chapters/${encodeURIComponent(deleteChapterId)}`,
            method: "DELETE",
            token,
          });
          if (state.selectedChapterId === deleteChapterId) {
            state.selectedChapterId = "";
            state.lessons = [];
            renderLessons();
          }
          await loadChapters(state.selectedCourseId);
          await loadLessonTracking();
          setMessage("Subject deleted.", "success");
        } catch (error) {
          setMessage(error.message || "Unable to delete subject.", "error");
        }
      }
    });
  }

  if (lessonForm) {
    lessonForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      let selectedCourseId = lessonCourseIdInput?.value?.trim() || state.selectedCourseId;
      let selectedChapterId = lessonChapterIdInput?.value?.trim() || state.selectedChapterId;
      const shouldSaveTestWithLesson = state.currentTab === "mocktests" && state.testsMode === "create";

      if (!selectedCourseId) {
        selectedCourseId = state.selectedMockCourseId || mockLinkCourseIdInput?.value?.trim() || "";
        if (lessonCourseIdInput instanceof HTMLSelectElement && selectedCourseId) {
          lessonCourseIdInput.value = selectedCourseId;
        }
      }
      if (!selectedChapterId) {
        selectedChapterId = state.selectedMockChapterId || mockLinkChapterIdInput?.value?.trim() || "";
        if (lessonChapterIdInput instanceof HTMLSelectElement && selectedChapterId) {
          lessonChapterIdInput.value = selectedChapterId;
        }
      }

      if (shouldSaveTestWithLesson) {
        const selectedMockLessonId = state.selectedMockLessonId || mockLinkLessonIdInput?.value?.trim() || "";
        const selectedMockTitle = lessonMockTestTitleInput?.value?.trim() || "";
        syncMockTaxonomyFromScope({ force: !state.selectedMockTestId });
        const selectedMockSubject = lessonMockTestSubjectInput?.value || "PUNJABI";
        const selectedMockLanguage = lessonMockTestLanguageModeInput?.value || "";

        if (!selectedMockLessonId) {
          setMessage("Select course, subject, and chapter before creating a test.", "error");
          return;
        }
        if (!selectedMockTitle) {
          setMessage("Test title is required.", "error");
          return;
        }
        if (NON_LANGUAGE_SUBJECTS.has(selectedMockSubject) && !selectedMockLanguage) {
          setMessage("Language mode is required for this subject.", "error");
          return;
        }
      }

      if (!selectedCourseId) {
        setMessage("Select a course first.", "error");
        return;
      }
      if (!selectedChapterId) {
        setMessage("Select a subject first.", "error");
        return;
      }

      state.selectedCourseId = selectedCourseId;
      state.selectedChapterId = selectedChapterId;
      renderCourses();
      renderChapters();
      const lessonId = lessonIdInput?.value || "";
      const editingLesson = lessonId ? state.lessons.find((item) => item.id === lessonId) : null;
      const requestedOrderIndex = lessonOrderIndexInput?.value ? Number(lessonOrderIndexInput.value) : 0;
      const selectedUploadFile =
        lessonUploadedAudioInput instanceof HTMLInputElement
          ? lessonUploadedAudioInput.files && lessonUploadedAudioInput.files.length
            ? lessonUploadedAudioInput.files[0]
            : null
          : null;

      let uploadedAudioBase64;
      let uploadedAudioMimeType;
      if (selectedUploadFile) {
        try {
          uploadedAudioBase64 = await readFileAsBase64(selectedUploadFile);
          uploadedAudioMimeType = selectedUploadFile.type || "audio/mpeg";
        } catch (readError) {
          const readMessage =
            readError instanceof Error ? readError.message : "Unable to read uploaded audio file.";
          setMessage(readMessage, "error");
          return;
        }
      }

      const payload = {
        chapterId: selectedChapterId,
        title: lessonTitleInput?.value?.trim() || "",
        orderIndex:
          requestedOrderIndex ||
          Number(editingLesson?.orderIndex || 0) ||
          getNextLessonOrderIndex(),
        videoUrl: lessonVideoUrlInput?.value?.trim() || undefined,
        transcriptText: lessonTranscriptTextInput?.value?.trim() || undefined,
        uploadedAudioBase64,
        uploadedAudioMimeType,
        durationSec: lessonDurationSecInput?.value ? Number(lessonDurationSecInput.value) : 0,
        assessmentTestId: lessonAssessmentTestIdInput?.value || null,
      };

      if (!payload.title) {
        setMessage("Lesson title is required.", "error");
        return;
      }

      try {
        setMessage(shouldSaveTestWithLesson ? "Saving test..." : "Saving lesson...");
        let savedLessonId = lessonId;
        let successMessage = shouldSaveTestWithLesson ? "Test content saved." : "Lesson saved.";
        let testSavedWithLesson = false;
        let testSaveErrorMessage = "";
        if (lessonId) {
          const updated = await apiRequest({
            path: `/admin/lesson-items/${encodeURIComponent(lessonId)}`,
            method: "PATCH",
            token,
            body: {
              title: payload.title,
              orderIndex: payload.orderIndex,
              videoUrl: payload.videoUrl,
              transcriptText: payload.transcriptText,
              uploadedAudioBase64: payload.uploadedAudioBase64,
              uploadedAudioMimeType: payload.uploadedAudioMimeType,
              durationSec: payload.durationSec,
              assessmentTestId: payload.assessmentTestId,
            },
          });
          successMessage = shouldSaveTestWithLesson
            ? updated?.audioInvalidatedByTranscriptChange
              ? "Test content updated. Transcript changed, so old audio was cleared. Generate voice again."
              : "Test content updated."
            : updated?.audioInvalidatedByTranscriptChange
              ? "Lesson updated. Transcript changed, so old audio was cleared. Generate voice again."
              : "Lesson updated. Opened in edit mode.";
        } else {
          const created = await apiRequest({
            path: "/admin/lesson-items",
            method: "POST",
            token,
            body: payload,
          });
          savedLessonId = created?.lesson?.id || "";
          successMessage = shouldSaveTestWithLesson
            ? "Test content created and opened for edit."
            : "Lesson created and opened for edit.";
        }
        await loadChapters(selectedCourseId);
        await loadLessons(selectedChapterId);
        await loadLessonTracking();

        if (shouldSaveTestWithLesson) {
          try {
            await saveAndAttachLessonMockTestFromTopFields({ resetAfterSave: false });
            testSavedWithLesson = true;
            setPendingTestChanges(false);
          } catch (testError) {
            testSaveErrorMessage =
              testError instanceof Error ? testError.message : "Unable to save and attach test.";
          }
        }

        const finalMessage = testSaveErrorMessage
          ? `${successMessage} But test was not saved: ${testSaveErrorMessage}`
          : testSavedWithLesson
            ? `${successMessage} Test saved and attached.`
            : successMessage;
        const finalType = testSaveErrorMessage ? "error" : "success";
        if (savedLessonId) {
          if (lessonSelectIdInput instanceof HTMLSelectElement) {
            lessonSelectIdInput.value = savedLessonId;
          }
          const savedLesson = state.lessons.find((item) => item.id === savedLessonId);
          if (savedLesson) {
            populateLessonFormForEdit(savedLesson);
            setMessage(finalMessage, finalType);
          } else {
            resetLessonForm();
            setMessage("Lesson saved, but could not reload it for editing.", "error");
          }
        } else {
          resetLessonForm();
          setMessage(finalMessage, finalType);
        }
        if (lessonUploadedAudioInput instanceof HTMLInputElement) {
          lessonUploadedAudioInput.value = "";
        }
      } catch (error) {
        const conflict = getLessonOrderConflictDetails(error);
        if (conflict && selectedChapterId) {
          try {
            await loadLessons(selectedChapterId);
            const conflictingLesson =
              state.lessons.find((item) => item.id === conflict.conflictLessonId) ||
              state.lessons.find((item) =>
                conflict.orderIndex ? Number(item.orderIndex) === Number(conflict.orderIndex) : false
              );
            if (conflictingLesson) {
              populateLessonFormForEdit(conflictingLesson);
              const conflictingTitle = conflict.conflictLessonTitle?.trim() || conflictingLesson.title || "";
              setMessage(
                `Order index ${conflictingLesson.orderIndex} already exists in this subject${
                  conflictingTitle ? ` (${conflictingTitle})` : ""
                }. Existing lesson loaded for edit.`,
                "error"
              );
              return;
            }
          } catch {
            // Fall back to generic error if reload fails.
          }
        }
        setMessage(error.message || "Unable to save lesson.", "error");
      }
    });
  }

  if (lessonCancelBtn) {
    lessonCancelBtn.addEventListener("click", () => {
      resetLessonForm();
      setMessage("");
    });
  }

  if (btnCreateNewLesson) {
    btnCreateNewLesson.addEventListener("click", () => {
      startCreateNewLessonMode();
    });
  }

  if (lessonMockCancelBtn) {
    lessonMockCancelBtn.addEventListener("click", () => {
      resetLessonMockTestForm();
      setMessage("");
    });
  }

  if (btnAttachExistingTestToLesson instanceof HTMLButtonElement) {
    btnAttachExistingTestToLesson.addEventListener("click", async () => {
      const selectedLessonId = state.selectedMockLessonId || mockLinkLessonIdInput?.value?.trim() || "";
      if (!selectedLessonId) {
        setMessage("Select course, subject, and chapter before attaching a test.", "error");
        return;
      }
      const selectedTestId = lessonAttachExistingTestIdInput?.value?.trim() || "";
      if (!selectedTestId) {
        setMessage("Select an existing test to attach.", "error");
        return;
      }
      try {
        setMessage("Attaching selected test...");
        await linkMockTestToLesson(selectedTestId, selectedLessonId);
        await setSelectedMockTestId(selectedTestId, { silent: true, forceQuestionCount: true });
        setTestsMode("create");
      } catch (error) {
        setMessage(error.message || "Unable to attach selected test.", "error");
      }
    });
  }

  if (btnGoCreateTestMode instanceof HTMLButtonElement) {
    btnGoCreateTestMode.addEventListener("click", () => {
      setTestsMode("create");
      setMessage("Switched to Create Test (Question Wise).");
    });
  }

  if (lessonAttachFilterTypeInput instanceof HTMLSelectElement) {
    lessonAttachFilterTypeInput.addEventListener("change", () => {
      renderAttachExistingTestOptions();
      renderMockTestsAdmin();
    });
  }

  if (lessonAttachTestSearchInput instanceof HTMLInputElement) {
    lessonAttachTestSearchInput.addEventListener("input", () => {
      renderAttachExistingTestOptions();
      renderMockTestsAdmin();
    });
  }

  if (lessonMockTestForm) {
    lessonMockTestForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        setMessage("Saving and attaching test...");
        await saveAndAttachLessonMockTestFromTopFields({ resetAfterSave: true });
        setMessage("Test saved and attached. Question section is ready below.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to save and attach test.", "error");
      }
    });
  }

  if (lessonMockTestsTableBody) {
    lessonMockTestsTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const playBtn = target.closest("[data-play-test]");
      if (playBtn instanceof HTMLButtonElement) {
        const testId = playBtn.getAttribute("data-play-test") || "";
        if (!testId || playBtn.disabled) return;

        playBtn.disabled = true;
        try {
          setMessage("Opening transcript page...");
          const linkedLesson = await findLinkedLessonForPlay(testId);
          if (!linkedLesson?.lessonId) {
            throw new Error("This test is not linked to a lesson. Link it first to open transcript flow.");
          }
          const params = new URLSearchParams();
          params.set("lessonId", linkedLesson.lessonId);
          if (linkedLesson.chapterId) {
            params.set("chapterId", linkedLesson.chapterId);
          }
          window.location.href = `${getLessonPlayerPath()}?${params.toString()}`;
        } catch (error) {
          setMessage(error?.message || "Unable to open transcript page.", "error");
        } finally {
          playBtn.disabled = false;
        }
        return;
      }

      const publishBtn = target.closest("[data-publish-test]");
      if (!(publishBtn instanceof HTMLButtonElement)) return;
      const testId = publishBtn.getAttribute("data-publish-test") || "";
      if (!testId || publishBtn.disabled) return;

      try {
        setMessage("Publishing test...");
        await publishMockTestForStudents(testId);
        setMessage("Test published and linked. It is now visible on student dashboard.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to publish test.", "error");
      }
    });

    lessonMockTestsTableBody.addEventListener("change", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) return;
      const actionTestId = target.getAttribute("data-test-action-select") || "";
      const action = String(target.value || "").trim().toLowerCase();
      if (!actionTestId || !action) return;
      target.value = "";

      if (action === "edit") {
        const test = state.mockTestsAdmin.find((item) => item.id === actionTestId);
        if (!test) return;
        if (lessonMockTestIdInput) lessonMockTestIdInput.value = test.id;
        if (lessonMockTestTitleInput) lessonMockTestTitleInput.value = test.title || "";
        if (lessonMockTestExamTypeInput) lessonMockTestExamTypeInput.value = test.examType || "PSTET_1";
        if (lessonMockTestSubjectInput) lessonMockTestSubjectInput.value = test.subject || "PUNJABI";
        toggleMockSubjectDependentFields();
        if (lessonMockTestStreamChoiceInput instanceof HTMLSelectElement) {
          lessonMockTestStreamChoiceInput.value = test.streamChoice || "";
        }
        if (lessonMockTestLanguageModeInput instanceof HTMLSelectElement) {
          lessonMockTestLanguageModeInput.value = test.languageMode || "";
        }
        if (lessonMockTestAccessCodeInput) {
          lessonMockTestAccessCodeInput.value = test.accessCode || "DEMO";
        }
        if (lessonMockTestIsActiveInput instanceof HTMLInputElement) {
          lessonMockTestIsActiveInput.checked = Boolean(test.isActive);
        }
        if (lessonMockSubmitBtn) lessonMockSubmitBtn.textContent = "Update Test";
        if (lessonMockCancelBtn) lessonMockCancelBtn.classList.remove("hidden");
        setTestsMode("create");
        await setSelectedMockTestId(test.id, { silent: true, forceQuestionCount: true });
        renderMockTestsAdmin();
        setMessage("Opened test in Create Test tab for editing.", "success");
        return;
      }

      if (action === "deactivate") {
        try {
          setMessage("Deactivating test...");
          await apiRequest({
            path: `/admin/mock-tests/${encodeURIComponent(actionTestId)}`,
            method: "PATCH",
            token,
            body: {
              isActive: false,
            },
          });
          await Promise.all([
            loadMockTestsAdmin(),
            loadAssessments(),
            state.selectedMockChapterId ? loadMockLessons(state.selectedMockChapterId) : Promise.resolve(),
          ]);
          setMessage("Test deactivated.", "success");
        } catch (error) {
          setMessage(error.message || "Unable to deactivate test.", "error");
        }
        return;
      }

      if (action !== "delete") return;
      const confirmed = window.confirm("Delete this test?");
      if (!confirmed) return;
      try {
        await apiRequest({
          path: `/admin/mock-tests/${encodeURIComponent(actionTestId)}`,
          method: "DELETE",
          token,
        });
        if (lessonMockTestIdInput?.value === actionTestId) {
          resetLessonMockTestForm();
        }
        if (state.selectedMockTestId === actionTestId) {
          await setSelectedMockTestId("", { silent: true, forceQuestionCount: true });
        }
        await Promise.all([
          loadMockTestsAdmin(),
          loadAssessments(),
          state.selectedMockChapterId ? loadMockLessons(state.selectedMockChapterId) : Promise.resolve(),
        ]);
        setMessage("Test deleted.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to delete test.", "error");
      }
    });
  }

  if (lessonQuestionTargetCountInput instanceof HTMLInputElement) {
    lessonQuestionTargetCountInput.addEventListener("input", () => {
      const parsed = Math.floor(Number(lessonQuestionTargetCountInput.value || 0));
      if (Number.isFinite(parsed) && parsed > 0) {
        lessonQuestionTargetCountInput.value = String(parsed);
      }
      updateLessonQuestionCountWarning();
    });
  }

  if (lessonQuestionForm instanceof HTMLFormElement) {
    lessonQuestionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        setMessage("Saving question...");
        await createOrUpdateLessonQuestion();
        resetLessonQuestionForm();
        await Promise.all([loadMockQuestions(state.selectedMockTestId), loadMockTestsAdmin(), loadAssessments()]);
        setPendingTestChanges(true);
        setMessage("Question saved.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to save question.", "error");
      }
    });
  }

  if (lessonQuestionCancelBtn instanceof HTMLButtonElement) {
    lessonQuestionCancelBtn.addEventListener("click", () => {
      resetLessonQuestionForm();
      setMessage("");
    });
  }

  if (lessonQuestionEditForm instanceof HTMLFormElement) {
    lessonQuestionEditForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        setMessage("Updating question...");
        await updateLessonQuestionFromModal();
        closeLessonQuestionEditModal();
        await Promise.all([loadMockQuestions(state.selectedMockTestId), loadMockTestsAdmin(), loadAssessments()]);
        setPendingTestChanges(true);
        setMessage("Question updated.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to update question.", "error");
      }
    });
  }

  if (lessonQuestionEditCancelBtn instanceof HTMLButtonElement) {
    lessonQuestionEditCancelBtn.addEventListener("click", () => {
      closeLessonQuestionEditModal();
      setMessage("");
    });
  }

  if (lessonQuestionEditClose instanceof HTMLButtonElement) {
    lessonQuestionEditClose.addEventListener("click", () => {
      closeLessonQuestionEditModal();
      setMessage("");
    });
  }

  if (lessonQuestionEditModal instanceof HTMLElement) {
    lessonQuestionEditModal.addEventListener("click", (event) => {
      if (event.target === lessonQuestionEditModal) {
        closeLessonQuestionEditModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!(lessonQuestionEditModal instanceof HTMLElement)) return;
    if (!lessonQuestionEditModal.classList.contains("open")) return;
    closeLessonQuestionEditModal();
  });

  if (lessonQuestionsTableBody instanceof HTMLElement) {
    lessonQuestionsTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const editId = target.getAttribute("data-edit-lesson-question");
      if (editId) {
        const question = state.mockQuestions.find((item) => item.id === editId);
        if (!question) return;
        openLessonQuestionEditModal(question);
        return;
      }

      const deleteId = target.getAttribute("data-delete-lesson-question");
      if (!deleteId) return;
      const confirmed = window.confirm("Delete this question?");
      if (!confirmed) return;
      try {
        await apiRequest({
          path: `/admin/questions/${encodeURIComponent(deleteId)}`,
          method: "DELETE",
          token,
        });
        await Promise.all([loadMockQuestions(state.selectedMockTestId), loadMockTestsAdmin(), loadAssessments()]);
        setPendingTestChanges(true);
        setMessage("Question deleted.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to delete question.", "error");
      }
    });
  }

  if (lessonBulkImportBtn instanceof HTMLButtonElement) {
    lessonBulkImportBtn.addEventListener("click", async () => {
      try {
        setMessage("Importing questions...");
        await handleLessonBulkImport();
        if (lessonBulkImportTextInput instanceof HTMLTextAreaElement) {
          lessonBulkImportTextInput.value = "";
        }
        await Promise.all([loadMockQuestions(state.selectedMockTestId), loadMockTestsAdmin(), loadAssessments()]);
        setPendingTestChanges(true);
        setMessage("Bulk import completed.", "success");
      } catch (error) {
        setMessage(error.message || "Bulk import failed.", "error");
      }
    });
  }

  if (lessonBulkImportCsvBtn instanceof HTMLButtonElement) {
    lessonBulkImportCsvBtn.addEventListener("click", async () => {
      try {
        setMessage("Uploading CSV and importing questions...");
        const result = await handleLessonCsvBulkImport();
        if (lessonBulkImportCsvFileInput instanceof HTMLInputElement) {
          lessonBulkImportCsvFileInput.value = "";
        }
        if (lessonBulkImportReplaceExistingInput instanceof HTMLInputElement) {
          lessonBulkImportReplaceExistingInput.checked = false;
        }
        await Promise.all([loadMockQuestions(state.selectedMockTestId), loadMockTestsAdmin(), loadAssessments()]);
        setPendingTestChanges(true);
        setMessage(`CSV import completed. Added ${result.createdCount}/${result.totalRows} questions.`, "success");
      } catch (error) {
        setMessage(error.message || "CSV import failed.", "error");
      }
    });
  }

  if (lessonSaveTestBtn instanceof HTMLButtonElement) {
    lessonSaveTestBtn.addEventListener("click", () => {
      if (!(lessonForm instanceof HTMLFormElement)) return;
      setMessage("Creating lesson with test, transcript, and selected mode...");
      lessonForm.requestSubmit();
    });
  }

  if (lessonsTableBody) {
    lessonsTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const playLessonId = target.getAttribute("data-play-lesson");
      if (playLessonId) {
        const lesson = state.lessons.find((item) => item.id === playLessonId);
        if (!lesson) return;
        openLessonPreview(lesson);
        return;
      }

      const editLessonId = target.getAttribute("data-edit-lesson");
      if (editLessonId) {
        const lesson = state.lessons.find((item) => item.id === editLessonId);
        if (!lesson) return;
        populateLessonFormForEdit(lesson);
        return;
      }

      const deleteLessonId = target.getAttribute("data-delete-lesson");
      if (!deleteLessonId) return;
      const confirmed = window.confirm("Delete this lesson?");
      if (!confirmed) return;
      try {
        await apiRequest({
          path: `/admin/lesson-items/${encodeURIComponent(deleteLessonId)}`,
          method: "DELETE",
          token,
        });
        await loadLessons(state.selectedChapterId);
        await loadChapters(state.selectedCourseId);
        await loadLessonTracking();
        setMessage("Lesson deleted.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to delete lesson.", "error");
      }
    });
  }

  if (lessonTrackingRefreshBtn) {
    lessonTrackingRefreshBtn.addEventListener("click", async () => {
      try {
        setMessage("Refreshing lesson tracker...");
        await loadLessonTracking();
        setMessage("Lesson tracker updated.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to refresh lesson tracker.", "error");
      }
    });
  }

  if (lessonTrackingSearchInput) {
    lessonTrackingSearchInput.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      try {
        setMessage("Searching lessons...");
        await loadLessonTracking();
        setMessage("");
      } catch (error) {
        setMessage(error.message || "Unable to search lessons.", "error");
      }
    });
  }

  if (lessonAudioProviderInput instanceof HTMLSelectElement) {
    lessonAudioProviderInput.addEventListener("change", () => {
      const provider = getSelectedProvider();
      syncVoiceProviderUi();
      if (provider === "gemini") {
        setVoiceStatus("Gemini selected. Custom voice cloning is disabled for this provider.", "success");
      } else {
        setVoiceStatus("");
      }
    });
  }

  if (btnPreviewVoice) {
    btnPreviewVoice.addEventListener("click", async () => {
      try {
        ensureSampleTranscriptText();
        const selectedVoiceConfig = getSelectedVoiceConfig();
        const selectedLanguage = lessonAudioLanguageInput?.value?.trim() || "auto";
        const sampleText = lessonTranscriptTextInput?.value?.trim() || SAMPLE_TRANSCRIPT_TEXT;

        if (!sampleText) {
          setVoiceStatus("Transcript text is required for preview.", "error");
          return;
        }

        setVoiceStatus("Generating sample voice preview...");
        const response = await fetch(`${API_BASE}/api/admin/lessons/preview-audio`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider: selectedVoiceConfig.provider,
            text: sampleText,
            model: selectedVoiceConfig.model,
            voice: selectedVoiceConfig.voice,
            languageHint: selectedLanguage,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message || "Unable to preview voice.");
        }

        const audioBlob = await response.blob();
        stopVoicePreview();
        state.previewAudioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(state.previewAudioUrl);
        state.previewAudioPlayer = audio;
        await audio.play();
        setVoiceStatus(
          selectedVoiceConfig.model === "gpt-4o-mini-tts"
            ? "Playing custom voice preview."
            : `Playing selected ${selectedVoiceConfig.provider === "gemini" ? "Gemini" : "OpenAI"} voice preview.`,
          "success"
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to preview voice.";
        setVoiceStatus(message, "error");
      }
    });
  }

  if (btnGenerateVoice) {
    btnGenerateVoice.addEventListener("click", async () => {
      try {
        let lessonId = lessonIdInput?.value?.trim() || "";
        const selectedCourseId = lessonCourseIdInput?.value?.trim() || state.selectedCourseId;
        const selectedChapterId = lessonChapterIdInput?.value?.trim() || state.selectedChapterId;
        const requestedOrderIndex = lessonOrderIndexInput?.value ? Number(lessonOrderIndexInput.value) : 0;
        const requestedTitle = lessonTitleInput?.value?.trim() || "";
        const transcriptText = lessonTranscriptTextInput?.value?.trim() || "";

        if (!transcriptText) {
          setVoiceStatus("Transcript text is required before generating voice.", "error");
          setMessage("Transcript text is required before generating voice.", "error");
          return;
        }
        startVoiceGenerationProgress(transcriptText);

        if (!lessonId) {
          if (!selectedCourseId) {
            setVoiceStatus("Select a course first.", "error");
            setMessage("Select a course first.", "error");
            finishVoiceGenerationProgress(false);
            return;
          }
          if (!selectedChapterId) {
            setVoiceStatus("Select a subject first.", "error");
            setMessage("Select a subject first.", "error");
            finishVoiceGenerationProgress(false);
            return;
          }
          const createPayload = {
            chapterId: selectedChapterId,
            title: requestedTitle || getSuggestedLessonTitle(),
            orderIndex: requestedOrderIndex || getNextLessonOrderIndex(),
            videoUrl: lessonVideoUrlInput?.value?.trim() || undefined,
            transcriptText: transcriptText || undefined,
            durationSec: lessonDurationSecInput?.value ? Number(lessonDurationSecInput.value) : 0,
            assessmentTestId: lessonAssessmentTestIdInput?.value || null,
          };
          setMessage("Creating lesson before voice generation...");
          const created = await apiRequest({
            path: "/admin/lesson-items",
            method: "POST",
            token,
            body: createPayload,
          });
          lessonId = created?.lesson?.id || "";
          if (!lessonId) {
            throw new Error("Lesson was created but id was missing.");
          }
          state.selectedCourseId = selectedCourseId;
          state.selectedChapterId = selectedChapterId;
          await loadChapters(selectedCourseId);
          await loadLessons(selectedChapterId);
          const savedLesson = state.lessons.find((item) => item.id === lessonId);
          if (savedLesson) {
            populateLessonFormForEdit(savedLesson);
          }
          setMessage("Lesson created. Generating voice now...");
        }

        const selectedVoiceConfig = getSelectedVoiceConfig();
        const selectedLanguage = lessonAudioLanguageInput?.value?.trim() || "auto";
        setVoiceStatus("Generating voice. Please wait...");
        setMessage("Generating voice. Please wait...");
        const response = await fetch(
          `${API_BASE}/api/admin/lessons/${encodeURIComponent(lessonId)}/generate-audio`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              provider: selectedVoiceConfig.provider,
              model: selectedVoiceConfig.model,
              voice: selectedVoiceConfig.voice,
              languageHint: selectedLanguage,
              transcriptText,
            }),
          }
        );

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errorMessage = payload?.message || "Unable to generate voice.";
          throw new Error(errorMessage);
        }

        setVoiceStatus("Voice generated successfully.", "success");
        setMessage("Voice generated successfully.", "success");
        finishVoiceGenerationProgress(true);

        if (state.selectedChapterId) {
          await loadLessons(state.selectedChapterId);
        }
        await loadLessonTracking();
      } catch (error) {
        finishVoiceGenerationProgress(false);
        const selectedChapterId = lessonChapterIdInput?.value?.trim() || state.selectedChapterId;
        const conflict = getLessonOrderConflictDetails(error);
        if (conflict && selectedChapterId) {
          try {
            await loadLessons(selectedChapterId);
            const conflictingLesson =
              state.lessons.find((item) => item.id === conflict.conflictLessonId) ||
              state.lessons.find((item) =>
                conflict.orderIndex ? Number(item.orderIndex) === Number(conflict.orderIndex) : false
              );
            if (conflictingLesson) {
              populateLessonFormForEdit(conflictingLesson);
              const conflictingTitle = conflict.conflictLessonTitle?.trim() || conflictingLesson.title || "";
              const message = `Order index ${conflictingLesson.orderIndex} already exists in this subject${
                conflictingTitle ? ` (${conflictingTitle})` : ""
              }. Existing lesson loaded for edit.`;
              setVoiceStatus(message, "error");
              setMessage(message, "error");
              return;
            }
          } catch {
            // Fall through to generic error.
          }
        }
        const message = error instanceof Error ? error.message : "Unable to generate voice.";
        setVoiceStatus(message, "error");
        setMessage(message, "error");
      }
    });
  }

  try {
    setMessage("Loading lessons admin...");
    setActiveTab("courses");

    const startupTasks = [
      { key: "assessments", run: () => loadAssessments() },
      { key: "courses", run: () => loadCourses() },
      { key: "mock-tests", run: () => loadMockTestsAdmin() },
      { key: "custom-voices", run: () => loadCustomVoices({ silent: true }) },
    ];

    const startupResults = await Promise.allSettled(startupTasks.map((task) => task.run()));
    const startupFailures = startupResults
      .map((result, index) => ({ result, key: startupTasks[index].key }))
      .filter((item) => item.result.status === "rejected")
      .map((item) => ({
        key: item.key,
        message:
          item.result.reason instanceof Error
            ? item.result.reason.message
            : "Request failed",
      }));

    toggleMockSubjectDependentFields();
    resetLessonMockTestForm();
    setTestsMode("create");
    renderChapters();
    renderLessons();
    renderMockChapterOptions();
    renderMockLessonOptions();
    setContextLabels();
    ensureSampleTranscriptText();
    syncVoiceProviderUi();

    try {
      await loadLessonTracking();
    } catch (trackingError) {
      startupFailures.push({
        key: "tracking",
        message: trackingError instanceof Error ? trackingError.message : "Request failed",
      });
    }

    if (startupFailures.length) {
      const firstFailure = startupFailures[0];
      setMessage(`Load failed (${firstFailure.key}): ${firstFailure.message}`, "error");
    } else {
      setMessage("");
    }
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuth();
      goAdminLogin();
      return;
    }
    setMessage(error.message || "Unable to load digital lessons admin.", "error");
  }
});
