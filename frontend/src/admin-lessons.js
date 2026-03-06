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
import { applyPunjabiInputMode, getPunjabiInputModeLabel } from "./punjabi-input.js?v=7";

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
  const testsBuilderTabButtons = Array.from(document.querySelectorAll("[data-tests-builder-tab]"));
  const testsBuilderTabPanels = Array.from(document.querySelectorAll("[data-tests-builder-panel]"));
  const questionBankModeButtons = Array.from(document.querySelectorAll("[data-question-bank-tab]"));
  const questionBankModePanels = Array.from(document.querySelectorAll("[data-question-bank-panel]"));

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
  const chapterSubSubjectInput = document.querySelector("#chapterSubSubject");
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
  const lessonInlineSaveBtn = document.querySelector("#lessonInlineSaveBtn");
  const lessonsTableBody = document.querySelector("#lessonsTableBody");
  const btnPreviewVoice = document.querySelector("#btnPreviewVoice");
  const btnGenerateVoice = document.querySelector("#btnGenerateVoice");
  const btnCreateNewLesson = document.querySelector("#btnCreateNewLesson");
  const btnPlaySelectedLessonAudio = document.querySelector("#btnPlaySelectedLessonAudio");
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
  const testsBuilderWorkspace = document.querySelector("#testsBuilderWorkspace");
  const testsTranscriptPanelHost = document.querySelector("#testsTranscriptPanelHost");
  const testsQuestionBankPanelHost = document.querySelector("#testsQuestionBankPanelHost");
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
  const lessonMockTestCategoryInput = document.querySelector("#lessonMockTestCategory");
  const lessonMockTestIsActiveInput = document.querySelector("#lessonMockTestIsActive");
  const lessonMockSubmitBtn = document.querySelector("#lessonMockSubmitBtn");
  const lessonMockCancelBtn = document.querySelector("#lessonMockCancelBtn");
  const lessonQuestionBankPanel = document.querySelector("#lessonQuestionBankPanel");
  const lessonSelectedTestHint = document.querySelector("#lessonSelectedTestHint");
  const lessonQuestionCountWarning = document.querySelector("#lessonQuestionCountWarning");
  const lessonQuestionTargetCountInput = document.querySelector("#lessonQuestionTargetCount");
  const lessonQuestionCategoryFilterInput = document.querySelector("#lessonQuestionCategoryFilter");
  const lessonQuestionSectionFilterInput = document.querySelector("#lessonQuestionSectionFilter");
  const lessonQuestionSectionSummary = document.querySelector("#lessonQuestionSectionSummary");
  const lessonSectionForm = document.querySelector("#lessonSectionForm");
  const lessonSectionIdInput = document.querySelector("#lessonSectionId");
  const lessonSectionTypeInput = document.querySelector("#lessonSectionType");
  const lessonSectionLabelInput = document.querySelector("#lessonSectionLabel");
  const lessonSectionQuestionLimitInput = document.querySelector("#lessonSectionQuestionLimit");
  const lessonSectionAudioUrlInput = document.querySelector("#lessonSectionAudioUrl");
  const lessonSectionTranscriptInput = document.querySelector("#lessonSectionTranscript");
  const lessonSectionSkipTranscriptInput = document.querySelector("#lessonSectionSkipTranscript");
  const lessonSectionSaveBtn = document.querySelector("#lessonSectionSaveBtn");
  const lessonSectionCancelBtn = document.querySelector("#lessonSectionCancelBtn");
  const lessonSectionsTableBody = document.querySelector("#lessonSectionsTableBody");
  const lessonQuestionForm = document.querySelector("#lessonQuestionForm");
  const lessonQuestionIdInput = document.querySelector("#lessonQuestionId");
  const lessonQuestionAltToggleWrap = document.querySelector("#lessonQuestionAltToggleWrap");
  const lessonQuestionAltToggleInput = document.querySelector("#lessonQuestionAltToggle");
  const lessonQuestionInputModeInput = document.querySelector("#lessonQuestionInputMode");
  const lessonGlobalVoiceToggleBtn = document.querySelector("#lessonGlobalVoiceToggle");
  const lessonStickyVoiceToggleBtn = document.querySelector("#lessonStickyVoiceToggle");
  const lessonStickyVoiceFocusBtn = document.querySelector("#lessonStickyVoiceFocus");
  const lessonQuestionVoiceToggleBtn = document.querySelector("#lessonQuestionVoiceToggle");
  const lessonQuestionInputModeHint = document.querySelector("#lessonQuestionInputModeHint");
  const lessonQuestionPassageWrap = document.querySelector("#lessonQuestionPassageWrap");
  const lessonQuestionPassageTextInput = document.querySelector("#lessonQuestionPassageText");
  const lessonQuestionFormulaWrap = document.querySelector("#lessonQuestionFormulaWrap");
  const lessonQuestionFormulaTextInput = document.querySelector("#lessonQuestionFormulaText");
  const lessonQuestionEquationWrap = document.querySelector("#lessonQuestionEquationWrap");
  const lessonQuestionEquationTextInput = document.querySelector("#lessonQuestionEquationText");
  const lessonQuestionBilingualWrap = document.querySelector("#lessonQuestionBilingualWrap");
  const lessonQuestionTextInput = document.querySelector("#lessonQuestionText");
  const lessonQuestionTextAltInput = document.querySelector("#lessonQuestionTextAlt");
  const lessonQuestionSectionInput = document.querySelector("#lessonQuestionSection");
  const lessonQuestionBilingualOptionsWrap = document.querySelector("#lessonQuestionBilingualOptionsWrap");
  const lessonOptionAInput = document.querySelector("#lessonOptionA");
  const lessonOptionAAltInput = document.querySelector("#lessonOptionAAlt");
  const lessonOptionBInput = document.querySelector("#lessonOptionB");
  const lessonOptionBAltInput = document.querySelector("#lessonOptionBAlt");
  const lessonOptionCInput = document.querySelector("#lessonOptionC");
  const lessonOptionCAltInput = document.querySelector("#lessonOptionCAlt");
  const lessonOptionDInput = document.querySelector("#lessonOptionD");
  const lessonOptionDAltInput = document.querySelector("#lessonOptionDAlt");
  const lessonCorrectOptionInput = document.querySelector("#lessonCorrectOption");
  const lessonQuestionExplanationInput = document.querySelector("#lessonQuestionExplanation");
  const lessonQuestionExplanationAltWrap = document.querySelector("#lessonQuestionExplanationAltWrap");
  const lessonQuestionExplanationAltInput = document.querySelector("#lessonQuestionExplanationAlt");
  const lessonQuestionDisplayOrderInput = document.querySelector("#lessonQuestionDisplayOrder");
  const lessonQuestionIsActiveInput = document.querySelector("#lessonQuestionIsActive");
  const lessonQuestionSubmitBtn = document.querySelector("#lessonQuestionSubmitBtn");
  const lessonQuestionCancelBtn = document.querySelector("#lessonQuestionCancelBtn");
  const lessonQuestionsTableBody = document.querySelector("#lessonQuestionsTableBody");
  const lessonBulkImportTextInput = document.querySelector("#lessonBulkImportText");
  const lessonBulkImportUseAltWrap = document.querySelector("#lessonBulkImportUseAltWrap");
  const lessonBulkImportUseAltInput = document.querySelector("#lessonBulkImportUseAlt");
  const lessonBulkImportAltWrap = document.querySelector("#lessonBulkImportAltWrap");
  const lessonBulkImportTextAltInput = document.querySelector("#lessonBulkImportTextAlt");
  const lessonBulkImportSectionInput = document.querySelector("#lessonBulkImportSection");
  const lessonBulkImportBtn = document.querySelector("#lessonBulkImportBtn");
  const lessonBulkImportCsvFileInput = document.querySelector("#lessonBulkImportCsvFile");
  const lessonBulkImportCsvUseAltWrap = document.querySelector("#lessonBulkImportCsvUseAltWrap");
  const lessonBulkImportCsvUseAltInput = document.querySelector("#lessonBulkImportCsvUseAlt");
  const lessonBulkImportCsvFileAltInput = document.querySelector("#lessonBulkImportCsvFileAlt");
  const lessonBulkImportReplaceExistingInput = document.querySelector("#lessonBulkImportReplaceExisting");
  const lessonBulkImportCsvSectionInput = document.querySelector("#lessonBulkImportCsvSection");
  const lessonBulkImportCsvAltHint = document.querySelector("#lessonBulkImportCsvAltHint");
  const lessonCsvTemplateFormatInput = document.querySelector("#lessonCsvTemplateFormat");
  const lessonBulkImportCsvBtn = document.querySelector("#lessonBulkImportCsvBtn");
  const lessonSectionCsvSampleBtn = document.querySelector("#lessonSectionCsvSampleBtn");
  const lessonReviewDownloadCsvBtn = document.querySelector("#lessonReviewDownloadCsvBtn");
  const lessonSectionTypeGuide = document.querySelector("#lessonSectionTypeGuide");
  const lessonQuestionTypeGuide = document.querySelector("#lessonQuestionTypeGuide");
  const lessonSaveTestBtn = document.querySelector("#lessonSaveTestBtn");
  const lessonSaveQuestionsWithTestBtn = document.querySelector("#lessonSaveQuestionsWithTestBtn");
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
  const lessonQuestionEditInputModeInput = document.querySelector("#lessonQuestionEditInputMode");
  const lessonQuestionEditVoiceToggleBtn = document.querySelector("#lessonQuestionEditVoiceToggle");
  const lessonQuestionEditInputModeHint = document.querySelector("#lessonQuestionEditInputModeHint");
  const lessonQuestionEditBilingualWrap = document.querySelector("#lessonQuestionEditBilingualWrap");
  const lessonQuestionEditTextInput = document.querySelector("#lessonQuestionEditText");
  const lessonQuestionEditTextAltInput = document.querySelector("#lessonQuestionEditTextAlt");
  const lessonQuestionEditBilingualOptionsWrap = document.querySelector("#lessonQuestionEditBilingualOptionsWrap");
  const lessonQuestionEditOptionAInput = document.querySelector("#lessonQuestionEditOptionA");
  const lessonQuestionEditOptionAAltInput = document.querySelector("#lessonQuestionEditOptionAAlt");
  const lessonQuestionEditOptionBInput = document.querySelector("#lessonQuestionEditOptionB");
  const lessonQuestionEditOptionBAltInput = document.querySelector("#lessonQuestionEditOptionBAlt");
  const lessonQuestionEditOptionCInput = document.querySelector("#lessonQuestionEditOptionC");
  const lessonQuestionEditOptionCAltInput = document.querySelector("#lessonQuestionEditOptionCAlt");
  const lessonQuestionEditOptionDInput = document.querySelector("#lessonQuestionEditOptionD");
  const lessonQuestionEditOptionDAltInput = document.querySelector("#lessonQuestionEditOptionDAlt");
  const lessonQuestionEditSectionInput = document.querySelector("#lessonQuestionEditSection");
  const lessonQuestionEditCorrectInput = document.querySelector("#lessonQuestionEditCorrect");
  const lessonQuestionEditExplanationInput = document.querySelector("#lessonQuestionEditExplanation");
  const lessonQuestionEditExplanationAltWrap = document.querySelector("#lessonQuestionEditExplanationAltWrap");
  const lessonQuestionEditExplanationAltInput = document.querySelector("#lessonQuestionEditExplanationAlt");
  const lessonQuestionEditDisplayOrderInput = document.querySelector("#lessonQuestionEditDisplayOrder");
  const lessonQuestionEditIsActiveInput = document.querySelector("#lessonQuestionEditIsActive");
  const lessonQuestionEditCancelBtn = document.querySelector("#lessonQuestionEditCancelBtn");

  if (testsTranscriptPanelHost instanceof HTMLElement && testsChapterDetailsPanel instanceof HTMLElement) {
    testsTranscriptPanelHost.appendChild(testsChapterDetailsPanel);
  }
  if (testsQuestionBankPanelHost instanceof HTMLElement && lessonQuestionBankPanel instanceof HTMLElement) {
    testsQuestionBankPanelHost.appendChild(lessonQuestionBankPanel);
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
    mockTestSections: [],
    mockQuestions: [],
    hasPendingTestChanges: false,
    testsMode: "create",
    createdTestIds: [],
    lastAutoMockTitle: "",
    currentTab: "courses",
    testsBuilderTab: "transcript",
    questionBankMode: "sections",
    questionInputMode: "ENGLISH",
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

  const getQuestionInputMode = () => String(state.questionInputMode || "ENGLISH").toUpperCase();
  const AUTO_TRANSLATION_INPUT_MODES = new Set(["PUNJABI", "HINDI"]);

  const getQuestionTranslationProfile = () => {
    const currentLanguageMode = String(lessonMockTestLanguageModeInput?.value || "").trim().toUpperCase();
    if (currentLanguageMode !== "BILINGUAL") return null;
    const inputMode = getQuestionInputMode();
    if (inputMode === "PUNJABI") {
      return { sourceLanguage: "punjabi", targetLanguage: "english" };
    }
    if (inputMode === "HINDI") {
      return { sourceLanguage: "hindi", targetLanguage: "english" };
    }
    return null;
  };

  const clearAutoTranslationMeta = (control) => {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
    delete control.dataset.autoTranslationSource;
    delete control.dataset.autoTranslationGenerated;
    delete control.dataset.autoTranslationEdited;
    delete control.dataset.autoTranslationPending;
    delete control.dataset.autoTranslationApplying;
  };

  const setAutoTranslationMeta = (control, sourceText, translatedText) => {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
    control.dataset.autoTranslationApplying = "true";
    control.value = translatedText;
    control.dataset.autoTranslationSource = sourceText;
    control.dataset.autoTranslationGenerated = translatedText ? "true" : "false";
    control.dataset.autoTranslationEdited = "false";
    delete control.dataset.autoTranslationPending;
    control.dataset.autoTranslationApplying = "false";
  };

  const primeAutoTranslationMeta = (leftControl, rightControl) => {
    if (
      !(leftControl instanceof HTMLInputElement || leftControl instanceof HTMLTextAreaElement) ||
      !(rightControl instanceof HTMLInputElement || rightControl instanceof HTMLTextAreaElement)
    ) {
      return;
    }
    const sourceText = String(leftControl.value || "").trim();
    const translatedText = String(rightControl.value || "").trim();
    if (!translatedText) {
      clearAutoTranslationMeta(rightControl);
      return;
    }
    rightControl.dataset.autoTranslationSource = sourceText;
    rightControl.dataset.autoTranslationGenerated = "true";
    rightControl.dataset.autoTranslationEdited = "false";
    delete rightControl.dataset.autoTranslationPending;
    delete rightControl.dataset.autoTranslationApplying;
  };

  const markAutoTranslationEdited = (control) => {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return;
    if (control.dataset.autoTranslationApplying === "true") return;
    if (String(control.value || "").trim()) {
      control.dataset.autoTranslationEdited = "true";
      control.dataset.autoTranslationGenerated = "false";
    } else {
      control.dataset.autoTranslationEdited = "false";
      control.dataset.autoTranslationGenerated = "false";
      delete control.dataset.autoTranslationSource;
    }
  };

  const requestAdminFieldTranslation = async (text, sourceLanguage, targetLanguage) => {
    const response = await apiRequest({
      path: "/api/admin/translation/field",
      method: "POST",
      token,
      body: {
        text,
        sourceLanguage,
        targetLanguage,
      },
    });
    return String(response?.translation || "").trim();
  };

  const maybeAutoTranslateField = async (leftControl, rightControl) => {
    if (
      !(leftControl instanceof HTMLInputElement || leftControl instanceof HTMLTextAreaElement) ||
      !(rightControl instanceof HTMLInputElement || rightControl instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    const profile = getQuestionTranslationProfile();
    if (!profile || !AUTO_TRANSLATION_INPUT_MODES.has(getQuestionInputMode())) return;

    const sourceText = String(leftControl.value || "").trim();
    if (!sourceText) {
      if (
        rightControl.dataset.autoTranslationGenerated === "true" &&
        rightControl.dataset.autoTranslationEdited !== "true"
      ) {
        rightControl.value = "";
        clearAutoTranslationMeta(rightControl);
      }
      return;
    }

    const currentRightText = String(rightControl.value || "").trim();
    const generated = rightControl.dataset.autoTranslationGenerated === "true";
    const edited = rightControl.dataset.autoTranslationEdited === "true";
    const lastSource = String(rightControl.dataset.autoTranslationSource || "");

    if (edited && currentRightText) return;
    if (currentRightText && !generated) return;
    if (generated && currentRightText && lastSource === sourceText) return;

    const requestKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    rightControl.dataset.autoTranslationPending = requestKey;

    try {
      const translatedText = await requestAdminFieldTranslation(
        sourceText,
        profile.sourceLanguage,
        profile.targetLanguage
      );
      if (!translatedText) return;
      if (rightControl.dataset.autoTranslationPending !== requestKey) return;
      if (String(leftControl.value || "").trim() !== sourceText) return;
      if (rightControl.dataset.autoTranslationEdited === "true" && String(rightControl.value || "").trim()) return;
      setAutoTranslationMeta(rightControl, sourceText, translatedText);
    } catch (error) {
      console.error("Unable to auto-translate right-side field.", error);
    } finally {
      if (rightControl.dataset.autoTranslationPending === requestKey) {
        delete rightControl.dataset.autoTranslationPending;
      }
    }
  };

  const bindAutoTranslationPair = (leftControl, rightControl) => {
    if (
      !(leftControl instanceof HTMLInputElement || leftControl instanceof HTMLTextAreaElement) ||
      !(rightControl instanceof HTMLInputElement || rightControl instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    rightControl.addEventListener("input", () => {
      markAutoTranslationEdited(rightControl);
    });
    leftControl.addEventListener("blur", () => {
      void maybeAutoTranslateField(leftControl, rightControl);
    });
  };

  const autoTranslateVisibleQuestionFields = () => {
    if (!getQuestionTranslationProfile()) return;
    [
      [lessonQuestionTextInput, lessonQuestionTextAltInput],
      [lessonOptionAInput, lessonOptionAAltInput],
      [lessonOptionBInput, lessonOptionBAltInput],
      [lessonOptionCInput, lessonOptionCAltInput],
      [lessonOptionDInput, lessonOptionDAltInput],
      [lessonQuestionExplanationInput, lessonQuestionExplanationAltInput],
      [lessonQuestionEditTextInput, lessonQuestionEditTextAltInput],
      [lessonQuestionEditOptionAInput, lessonQuestionEditOptionAAltInput],
      [lessonQuestionEditOptionBInput, lessonQuestionEditOptionBAltInput],
      [lessonQuestionEditOptionCInput, lessonQuestionEditOptionCAltInput],
      [lessonQuestionEditOptionDInput, lessonQuestionEditOptionDAltInput],
      [lessonQuestionEditExplanationInput, lessonQuestionEditExplanationAltInput],
    ].forEach(([leftControl, rightControl]) => {
      void maybeAutoTranslateField(leftControl, rightControl);
    });
  };

  const BrowserSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const VOICE_INPUT_LANG_BY_MODE = {
    ENGLISH: "en-IN",
    PUNJABI: "pa-IN",
    HINDI: "hi-IN",
  };
  const isTextEntryControl = (control) =>
    control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement;
  const unsupportedVoiceInputTypes = new Set([
    "hidden",
    "checkbox",
    "radio",
    "file",
    "button",
    "submit",
    "reset",
    "password",
  ]);
  const isSupportedVoiceInputControl = (control) => {
    if (control instanceof HTMLTextAreaElement) return true;
    if (!(control instanceof HTMLInputElement)) return false;
    const type = String(control.type || "text").toLowerCase();
    return !unsupportedVoiceInputTypes.has(type);
  };
  const questionEntryCreateControls = [
    lessonQuestionPassageTextInput,
    lessonQuestionFormulaTextInput,
    lessonQuestionEquationTextInput,
    lessonQuestionTextInput,
    lessonOptionAInput,
    lessonOptionBInput,
    lessonOptionCInput,
    lessonOptionDInput,
    lessonQuestionExplanationInput,
  ].filter(isTextEntryControl);
  const questionEntryEditControls = [
    lessonQuestionEditTextInput,
    lessonQuestionEditOptionAInput,
    lessonQuestionEditOptionBInput,
    lessonQuestionEditOptionCInput,
    lessonQuestionEditOptionDInput,
    lessonQuestionEditExplanationInput,
  ].filter(isTextEntryControl);
  const questionEntryControls = [...questionEntryCreateControls, ...questionEntryEditControls];
  const questionAltControls = [
    lessonQuestionTextAltInput,
    lessonOptionAAltInput,
    lessonOptionBAltInput,
    lessonOptionCAltInput,
    lessonOptionDAltInput,
    lessonQuestionExplanationAltInput,
    lessonQuestionEditTextAltInput,
    lessonQuestionEditOptionAAltInput,
    lessonQuestionEditOptionBAltInput,
    lessonQuestionEditOptionCAltInput,
    lessonQuestionEditOptionDAltInput,
    lessonQuestionEditExplanationAltInput,
  ].filter(isTextEntryControl);
  const generalVoiceTypingControls = Array.from(document.querySelectorAll("input, textarea")).filter(
    (control) =>
      isSupportedVoiceInputControl(control) && !questionEntryControls.includes(control) && !questionAltControls.includes(control)
  );
  const allVoiceTypingControls = Array.from(
    new Set([...questionEntryControls, ...questionAltControls, ...generalVoiceTypingControls])
  );
  const supportsVoiceTyping = typeof BrowserSpeechRecognition === "function";
  let activeVoiceSession = null;
  let lastFocusedVoiceControl = null;

  const updateVoiceTypingButtons = () => {
    const mode = String(activeVoiceSession?.mode || getQuestionInputMode() || "ENGLISH").toUpperCase();
    const modeLabel = mode === "PUNJABI" ? "Punjabi" : mode === "HINDI" ? "Hindi" : "English";

    [
      {
        button: lessonGlobalVoiceToggleBtn instanceof HTMLButtonElement ? lessonGlobalVoiceToggleBtn : null,
        context: "global",
      },
      {
        button: lessonStickyVoiceToggleBtn instanceof HTMLButtonElement ? lessonStickyVoiceToggleBtn : null,
        context: "global",
      },
      {
        button: lessonQuestionVoiceToggleBtn instanceof HTMLButtonElement ? lessonQuestionVoiceToggleBtn : null,
        context: "create",
      },
      {
        button: lessonQuestionEditVoiceToggleBtn instanceof HTMLButtonElement ? lessonQuestionEditVoiceToggleBtn : null,
        context: "edit",
      },
    ]
      .filter((item) => item.button)
      .forEach(({ button, context }) => {
        const isActive = Boolean(activeVoiceSession) && activeVoiceSession.context === context;
        const disabled = !supportsVoiceTyping;
        button.disabled = disabled;
        button.textContent = isActive ? `Stop Voice Typing (${modeLabel})` : "Voice Typing";
        button.classList.toggle("is-recording", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
        if (!supportsVoiceTyping) {
          button.title = "Voice typing is available in Chrome and Edge only.";
        } else if (isActive) {
          button.title = "Click to stop voice typing.";
        } else {
          button.title = "Click and start speaking into the focused text field.";
        }
      });
  };

  const renderQuestionInputModeHints = () => {
    const modeLabel = getPunjabiInputModeLabel(getQuestionInputMode());
    const transliterationHint =
      getQuestionInputMode() === "ENGLISH"
        ? ""
        : " Use `ll` for `।`; `.` stays available for maths and decimals.";
    const voiceHint = supportsVoiceTyping
      ? " Voice Typing is available for English, Punjabi, and Hindi."
      : " Voice Typing requires Chrome or Edge browser.";
    const translationHint = getQuestionTranslationProfile()
      ? " Right-side English fields auto-fill from the left on blur, and remain editable."
      : "";
    const hintText = `${modeLabel}. Applied only to admin question entry/edit fields.${transliterationHint}${voiceHint}${translationHint}`;
    if (lessonQuestionInputModeHint instanceof HTMLElement) {
      lessonQuestionInputModeHint.textContent = hintText;
    }
    if (lessonQuestionEditInputModeHint instanceof HTMLElement) {
      lessonQuestionEditInputModeHint.textContent = hintText;
    }
  };

  const syncQuestionInputModeControls = () => {
    const currentMode = getQuestionInputMode();
    if (lessonQuestionInputModeInput instanceof HTMLSelectElement) {
      lessonQuestionInputModeInput.value = currentMode;
    }
    if (lessonQuestionEditInputModeInput instanceof HTMLSelectElement) {
      lessonQuestionEditInputModeInput.value = currentMode;
    }
    renderQuestionInputModeHints();
    updateVoiceTypingButtons();
  };

  const setQuestionInputMode = (nextMode) => {
    const normalizedMode = String(nextMode || "ENGLISH").toUpperCase();
    state.questionInputMode =
      normalizedMode === "PUNJABI" || normalizedMode === "HINDI" ? normalizedMode : "ENGLISH";
    syncQuestionInputModeControls();
  };

  questionEntryControls.forEach((control) => {
    applyPunjabiInputMode(control, getQuestionInputMode);
  });

  questionAltControls.forEach((control) => {
    applyPunjabiInputMode(control, () => "ENGLISH");
  });

  allVoiceTypingControls.forEach((control) => {
    control.addEventListener("focus", () => {
      lastFocusedVoiceControl = control;
      if (!activeVoiceSession) return;
      const controlsForContext = getControlsForVoiceContext(activeVoiceSession.context);
      if (controlsForContext.includes(control)) {
        activeVoiceSession.control = control;
      }
    });
  });

  [
    [lessonQuestionTextInput, lessonQuestionTextAltInput],
    [lessonOptionAInput, lessonOptionAAltInput],
    [lessonOptionBInput, lessonOptionBAltInput],
    [lessonOptionCInput, lessonOptionCAltInput],
    [lessonOptionDInput, lessonOptionDAltInput],
    [lessonQuestionExplanationInput, lessonQuestionExplanationAltInput],
    [lessonQuestionEditTextInput, lessonQuestionEditTextAltInput],
    [lessonQuestionEditOptionAInput, lessonQuestionEditOptionAAltInput],
    [lessonQuestionEditOptionBInput, lessonQuestionEditOptionBAltInput],
    [lessonQuestionEditOptionCInput, lessonQuestionEditOptionCAltInput],
    [lessonQuestionEditOptionDInput, lessonQuestionEditOptionDAltInput],
    [lessonQuestionEditExplanationInput, lessonQuestionEditExplanationAltInput],
  ].forEach(([leftControl, rightControl]) => {
    bindAutoTranslationPair(leftControl, rightControl);
  });

  syncQuestionInputModeControls();

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

  const canUseVoiceTargetControl = (control) =>
    isTextEntryControl(control) && !control.disabled && !control.readOnly;

  const getControlsForVoiceContext = (context) => {
    if (context === "edit") return questionEntryEditControls;
    if (context === "create") return questionEntryCreateControls;
    return allVoiceTypingControls;
  };

  const resolveVoiceModeForControl = (control) => {
    if (questionEntryControls.includes(control)) {
      return getQuestionInputMode();
    }
    return "ENGLISH";
  };

  const resolveVoiceTargetControl = (context) => {
    const controls = getControlsForVoiceContext(context);
    if (!controls.length) return null;

    if (controls.includes(lastFocusedVoiceControl) && canUseVoiceTargetControl(lastFocusedVoiceControl)) {
      return lastFocusedVoiceControl;
    }

    const activeControl = document.activeElement;
    if (controls.includes(activeControl) && canUseVoiceTargetControl(activeControl)) {
      return activeControl;
    }

    return (
      controls.find((control) => canUseVoiceTargetControl(control) && !control.closest(".hidden")) ||
      controls.find((control) => canUseVoiceTargetControl(control)) ||
      null
    );
  };

  const focusVoiceTargetControl = (context) => {
    const control = resolveVoiceTargetControl(context);
    if (!control) {
      setMessage("No writable text field is currently available.", "error");
      return;
    }
    control.focus();
    control.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    lastFocusedVoiceControl = control;
    setMessage("Ready. Start typing or use Voice Typing.");
  };

  const emitInputEvent = (control, text) => {
    try {
      control.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          composed: true,
          data: text,
          inputType: "insertText",
        })
      );
    } catch (_error) {
      control.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  const insertDictationTextAtCaret = (control, rawText) => {
    if (!canUseVoiceTargetControl(control)) return;

    const transcript = String(rawText || "").trim();
    if (!transcript) return;

    const currentValue = String(control.value || "");
    const start = control.selectionStart ?? currentValue.length;
    const end = control.selectionEnd ?? start;
    const before = currentValue.slice(0, start);
    const after = currentValue.slice(end);
    const needsLeadingSpace = Boolean(before) && !/\s$/.test(before) && !/^[,.;:!?)]/.test(transcript);
    const needsTrailingSpace = !after || (!/^\s/.test(after) && !/^[,.;:!?)]/.test(after));
    const chunk = `${needsLeadingSpace ? " " : ""}${transcript}${needsTrailingSpace ? " " : ""}`;

    control.focus();
    control.value = `${before}${chunk}${after}`;
    const nextCaret = before.length + chunk.length;
    if (typeof control.setSelectionRange === "function") {
      control.setSelectionRange(nextCaret, nextCaret);
    }
    emitInputEvent(control, chunk);
  };

  const stopActiveVoiceTyping = (options = {}) => {
    const notify = options.notify !== false;
    if (!activeVoiceSession) return;

    const session = activeVoiceSession;
    session.stoppedManually = true;
    try {
      session.recognition.stop();
    } catch (_error) {
      // Ignore unsupported stop edge-cases from browser recognition API.
    }
    if (notify) {
      setMessage("Voice typing stopped.");
    }
  };

  const startVoiceTypingForContext = (context, triggerButton) => {
    if (!supportsVoiceTyping) {
      setMessage("Voice typing is available in Chrome and Edge only.", "error");
      return;
    }

    const targetControl = resolveVoiceTargetControl(context);
    if (!targetControl) {
      setMessage("Select a text field first, then start voice typing.", "error");
      return;
    }

    const mode = resolveVoiceModeForControl(targetControl);
    const lang = VOICE_INPUT_LANG_BY_MODE[mode] || VOICE_INPUT_LANG_BY_MODE.ENGLISH;

    if (activeVoiceSession) {
      stopActiveVoiceTyping({ notify: false });
    }

    const recognition = new BrowserSpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const session = {
      recognition,
      context,
      button: triggerButton,
      control: targetControl,
      mode,
      stoppedManually: false,
    };
    activeVoiceSession = session;
    updateVoiceTypingButtons();
    setMessage(`Voice typing started (${mode}). Speak now...`);

    recognition.onresult = (event) => {
      if (activeVoiceSession !== session) return;
      let finalText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result?.isFinal) continue;
        finalText += ` ${String(result[0]?.transcript || "").trim()}`;
      }
      if (!finalText.trim()) return;

      const controlsForContext = getControlsForVoiceContext(session.context);
      const selectedControl =
        controlsForContext.includes(lastFocusedVoiceControl) && canUseVoiceTargetControl(lastFocusedVoiceControl)
          ? lastFocusedVoiceControl
          : session.control;
      session.control = selectedControl;
      insertDictationTextAtCaret(selectedControl, finalText);
    };

    recognition.onerror = (event) => {
      if (activeVoiceSession !== session) return;
      const errorCode = String(event?.error || "").trim();
      if (errorCode === "no-speech") {
        setMessage("No speech detected. Try again and speak clearly.", "error");
      } else if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
        setMessage("Microphone access was blocked. Allow mic permission and retry.", "error");
      } else if (errorCode !== "aborted") {
        setMessage("Voice typing failed. Please retry.", "error");
      }
    };

    recognition.onend = () => {
      if (activeVoiceSession !== session) return;
      const stoppedManually = session.stoppedManually;
      activeVoiceSession = null;
      updateVoiceTypingButtons();
      if (!stoppedManually) {
        setMessage("Voice typing ended. Click Voice Typing to continue.");
      }
    };

    try {
      recognition.start();
    } catch (_error) {
      if (activeVoiceSession === session) {
        activeVoiceSession = null;
      }
      updateVoiceTypingButtons();
      setMessage("Unable to start voice typing on this browser tab.", "error");
    }
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
    if (raw.startsWith("/public/")) {
      return `${window.location.origin}${raw}`;
    }
    if (raw.startsWith("/")) return API_BASE ? `${API_BASE}${raw}` : `${window.location.origin}${raw}`;
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
    "MATHS",
    "EVS",
    "MATHS_EVS",
    "SCIENCE_MATH",
    "SOCIAL_STUDIES",
  ]);
  const SUBJECTS_BY_EXAM = {
    PSTET_1: ["PUNJABI", "ENGLISH", "CHILD_PEDAGOGY", "MATHS", "EVS"],
    PSTET_2: ["PUNJABI", "ENGLISH", "CHILD_PEDAGOGY", "SCIENCE_MATH", "SOCIAL_STUDIES"],
  };
  const CHAPTER_SUB_SUBJECT_LABELS = {
    SOCIAL_STUDIES: "SST",
    SCIENCE_MATH: "SCI + MATHS",
  };
  const ACCESS_CODE_LABELS = {
    DEMO: "DEMO",
    MOCK: "MOCK",
    LESSON: "LESSON",
  };
  const MOCK_CATEGORY_LABELS = {
    FREE: "Free",
    PREMIUM: "Premium",
  };
  const DEFAULT_QUESTION_SECTIONS = [
    "Comprehension",
    "Grammar",
    "General MCQs",
    "Math Formulas",
    "Science Equations",
  ];
  const SECTION_TYPE_LABELS = {
    COMPREHENSION: "Comprehension",
    GENERAL_MCQ: "General MCQs",
    GRAMMAR: "Grammar",
    MATH_FORMULA: "Math Formulas",
    SCIENCE_EQUATION: "Science Equations",
    CUSTOM: "Chart / Graph / Custom",
  };
  const SECTION_TYPE_FILTER_ORDER = [
    "COMPREHENSION",
    "GENERAL_MCQ",
    "GRAMMAR",
    "MATH_FORMULA",
    "SCIENCE_EQUATION",
    "CUSTOM",
  ];
  const SECTION_TYPE_FROM_LABEL = {
    Comprehension: "COMPREHENSION",
    "General MCQs": "GENERAL_MCQ",
    Grammar: "GRAMMAR",
    "Math Formulas": "MATH_FORMULA",
    "Science Equations": "SCIENCE_EQUATION",
  };
  const CSV_TEMPLATE_DEFAULT_SECTION = {
    general: "General MCQs",
    comprehension: "Comprehension",
    math: "Math Formulas",
    science: "Science Equations",
  };
  const SECTION_TYPE_GUIDE_TEXT = {
    COMPREHENSION:
      "Comprehension keeps one paragraph or passage at section level, then lets you add its questions manually, by line import, or by CSV.",
    GENERAL_MCQ:
      "General MCQ is the fastest mode for standard one-question items. Use manual entry, line text, or CSV without extra shared context.",
    GRAMMAR:
      "Grammar sections behave like single questions or grouped language drills. You can keep them single-language or bilingual question-wise.",
    MATH_FORMULA:
      "Math Formula sections carry one formula/context with each question. Manual, line import, and CSV all keep the same save flow.",
    SCIENCE_EQUATION:
      "Science Equation sections work like structured science items and can also carry graph/equation references before the question text.",
    CUSTOM:
      "Chart / Graph / Custom sections let you store chart notes, graph descriptions, or any custom prompt and then add questions by any mode.",
  };
  const normalizeSectionType = (value) => {
    const normalized = String(value || "").trim().toUpperCase();
    if (
      [
        "COMPREHENSION",
        "GENERAL_MCQ",
        "GRAMMAR",
        "MATH_FORMULA",
        "SCIENCE_EQUATION",
        "CUSTOM",
      ].includes(normalized)
    ) {
      return normalized;
    }
    return "GENERAL_MCQ";
  };
  const getCsvTemplateFormat = () => {
    const raw = String(lessonCsvTemplateFormatInput?.value || "general").toLowerCase();
    return Object.prototype.hasOwnProperty.call(CSV_TEMPLATE_DEFAULT_SECTION, raw) ? raw : "general";
  };
  const syncCsvSectionByTemplate = (options = {}) => {
    const { force = false } = options;
    if (!(lessonBulkImportCsvSectionInput instanceof HTMLSelectElement)) return;
    const format = getCsvTemplateFormat();
    const recommendedSection = CSV_TEMPLATE_DEFAULT_SECTION[format] || DEFAULT_QUESTION_SECTIONS[0];
    if (!force && normalizeQuestionSectionLabel(lessonBulkImportCsvSectionInput.value)) return;
    lessonBulkImportCsvSectionInput.value = recommendedSection;
  };
  const normalizeQuestionSectionLabel = (value) => {
    const normalized = String(value || "").trim();
    return normalized ? normalized.slice(0, 120) : "";
  };
  const getSectionMetaByLabel = (sectionLabel) => {
    const normalizedLabel = normalizeQuestionSectionLabel(sectionLabel);
    if (!normalizedLabel) return null;
    return (
      state.mockTestSections.find(
        (item) => normalizeQuestionSectionLabel(item?.sectionLabel) === normalizedLabel
      ) || null
    );
  };
  const structuredQuestionTextFromParts = ({
    sectionType,
    questionText,
    passageText,
    formulaText,
    equationText,
    fallbackTranscript,
  }) => {
    const normalizedQuestion = String(questionText || "").trim();
    const normalizedPassage = String(passageText || "").trim() || String(fallbackTranscript || "").trim();
    const normalizedFormula = String(formulaText || "").trim() || String(fallbackTranscript || "").trim();
    const normalizedEquation = String(equationText || "").trim() || String(fallbackTranscript || "").trim();
    if (!normalizedQuestion) return "";
    const type = normalizeSectionType(sectionType);
    if (type === "COMPREHENSION" && normalizedPassage) {
      return `Passage:\n${normalizedPassage}\n\nQuestion: ${normalizedQuestion}`.trim();
    }
    if (type === "MATH_FORMULA" && normalizedFormula) {
      return `Formula: ${normalizedFormula}\n\nQuestion: ${normalizedQuestion}`.trim();
    }
    if (type === "SCIENCE_EQUATION" && normalizedEquation) {
      return `Equation: ${normalizedEquation}\n\nQuestion: ${normalizedQuestion}`.trim();
    }
    return normalizedQuestion;
  };
  const isBilingualQuestionMode = () => String(lessonMockTestLanguageModeInput?.value || "").trim() === "BILINGUAL";
  const hasAnyAltQuestionPayload = (payload) =>
    Boolean(
      String(payload?.questionTextAlt || "").trim() ||
        String(payload?.optionAAlt || "").trim() ||
        String(payload?.optionBAlt || "").trim() ||
        String(payload?.optionCAlt || "").trim() ||
        String(payload?.optionDAlt || "").trim() ||
        String(payload?.explanationAlt || "").trim()
    );
  const hasCompleteAltQuestionPayload = (payload) =>
    Boolean(
      String(payload?.questionTextAlt || "").trim() &&
        String(payload?.optionAAlt || "").trim() &&
        String(payload?.optionBAlt || "").trim() &&
        String(payload?.optionCAlt || "").trim() &&
        String(payload?.optionDAlt || "").trim()
    );
  const isLineImportAltEnabled = () =>
    isBilingualQuestionMode() &&
    Boolean(lessonBulkImportUseAltInput instanceof HTMLInputElement && lessonBulkImportUseAltInput.checked);
  const isCsvImportAltEnabled = () =>
    isBilingualQuestionMode() &&
    Boolean(lessonBulkImportCsvUseAltInput instanceof HTMLInputElement && lessonBulkImportCsvUseAltInput.checked);
  const setTestsBuilderTab = (tab) => {
    const nextTab = tab === "question-bank" ? "question-bank" : "transcript";
    state.testsBuilderTab = nextTab;
    testsBuilderTabButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.classList.toggle("active", button.getAttribute("data-tests-builder-tab") === nextTab);
    });
    testsBuilderTabPanels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      panel.classList.toggle("active", panel.getAttribute("data-tests-builder-panel") === nextTab);
    });
  };
  const setQuestionBankMode = (mode) => {
    const nextMode = ["manual", "lines", "csv", "review"].includes(mode) ? mode : "sections";
    state.questionBankMode = nextMode;
    questionBankModeButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.classList.toggle("active", button.getAttribute("data-question-bank-tab") === nextMode);
    });
    questionBankModePanels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      panel.classList.toggle("active", panel.getAttribute("data-question-bank-panel") === nextMode);
    });
    if (nextMode === "review") {
      if (lessonQuestionCategoryFilterInput instanceof HTMLSelectElement) {
        lessonQuestionCategoryFilterInput.value = "ALL";
      }
      if (lessonQuestionSectionFilterInput instanceof HTMLSelectElement) {
        lessonQuestionSectionFilterInput.value = "ALL";
      }
      renderLessonQuestions();
    }
  };
  const updateSectionTypeGuide = () => {
    if (!(lessonSectionTypeGuide instanceof HTMLElement)) return;
    const sectionType = normalizeSectionType(lessonSectionTypeInput?.value);
    lessonSectionTypeGuide.textContent =
      SECTION_TYPE_GUIDE_TEXT[sectionType] || SECTION_TYPE_GUIDE_TEXT.GENERAL_MCQ;
  };
  const updateQuestionLanguageGuide = () => {
    if (!(lessonQuestionTypeGuide instanceof HTMLElement)) return;
    if (!isBilingualQuestionMode()) {
      lessonQuestionTypeGuide.textContent =
        "This test is single-language, so questions, line import, and CSV upload use only the left-side fields.";
      return;
    }
    const manualMode = "both languages";
    lessonQuestionTypeGuide.textContent =
      `This test is bilingual. Manual entry is currently set for ${manualMode}; line import and CSV can also stay single-language unless you enable their right-language pairs.`;
  };
  const toggleLessonSectionTranscriptState = () => {
    const shouldSkip = Boolean(lessonSectionSkipTranscriptInput instanceof HTMLInputElement && lessonSectionSkipTranscriptInput.checked);
    if (lessonSectionTranscriptInput instanceof HTMLTextAreaElement) {
      lessonSectionTranscriptInput.disabled = shouldSkip;
      lessonSectionTranscriptInput.placeholder = shouldSkip
        ? "Transcript skipped for this section."
        : "Add passage, paragraph, chart notes, graph description, or transcript for this section.";
    }
  };
  const toggleBilingualQuestionInputs = () => {
    const isBilingual = isBilingualQuestionMode();
    const manualAlt = isBilingual;
    const lineAlt = isLineImportAltEnabled();
    const csvAlt = isCsvImportAltEnabled();
    lessonQuestionAltToggleWrap?.classList.add("hidden");
    if (lessonQuestionAltToggleInput instanceof HTMLInputElement) {
      lessonQuestionAltToggleInput.checked = isBilingual;
    }
    lessonBulkImportUseAltWrap?.classList.toggle("hidden", !isBilingual);
    lessonBulkImportCsvUseAltWrap?.classList.toggle("hidden", !isBilingual);
    lessonQuestionBilingualWrap?.classList.toggle("hidden", !manualAlt);
    lessonQuestionBilingualOptionsWrap?.classList.toggle("hidden", !manualAlt);
    lessonQuestionExplanationAltWrap?.classList.toggle("hidden", !manualAlt);
    lessonBulkImportAltWrap?.classList.toggle("hidden", !lineAlt);
    lessonBulkImportCsvAltHint?.classList.toggle("hidden", !csvAlt);
    if (lessonBulkImportCsvFileAltInput instanceof HTMLInputElement) {
      lessonBulkImportCsvFileAltInput.classList.toggle("hidden", !csvAlt);
    }
    lessonQuestionEditBilingualWrap?.classList.toggle("hidden", !isBilingual);
    lessonQuestionEditBilingualOptionsWrap?.classList.toggle("hidden", !isBilingual);
    lessonQuestionEditExplanationAltWrap?.classList.toggle("hidden", !isBilingual);
    if (!isBilingual) {
      if (lessonQuestionAltToggleInput instanceof HTMLInputElement) lessonQuestionAltToggleInput.checked = false;
      if (lessonBulkImportUseAltInput instanceof HTMLInputElement) lessonBulkImportUseAltInput.checked = false;
      if (lessonBulkImportCsvUseAltInput instanceof HTMLInputElement) lessonBulkImportCsvUseAltInput.checked = false;
      if (lessonQuestionTextAltInput instanceof HTMLTextAreaElement) lessonQuestionTextAltInput.value = "";
      if (lessonOptionAAltInput instanceof HTMLInputElement) lessonOptionAAltInput.value = "";
      if (lessonOptionBAltInput instanceof HTMLInputElement) lessonOptionBAltInput.value = "";
      if (lessonOptionCAltInput instanceof HTMLInputElement) lessonOptionCAltInput.value = "";
      if (lessonOptionDAltInput instanceof HTMLInputElement) lessonOptionDAltInput.value = "";
      if (lessonQuestionExplanationAltInput instanceof HTMLInputElement) lessonQuestionExplanationAltInput.value = "";
      if (lessonBulkImportTextAltInput instanceof HTMLTextAreaElement) lessonBulkImportTextAltInput.value = "";
      if (lessonBulkImportCsvFileAltInput instanceof HTMLInputElement) lessonBulkImportCsvFileAltInput.value = "";
      if (lessonQuestionEditTextAltInput instanceof HTMLTextAreaElement) lessonQuestionEditTextAltInput.value = "";
      if (lessonQuestionEditOptionAAltInput instanceof HTMLInputElement) lessonQuestionEditOptionAAltInput.value = "";
      if (lessonQuestionEditOptionBAltInput instanceof HTMLInputElement) lessonQuestionEditOptionBAltInput.value = "";
      if (lessonQuestionEditOptionCAltInput instanceof HTMLInputElement) lessonQuestionEditOptionCAltInput.value = "";
      if (lessonQuestionEditOptionDAltInput instanceof HTMLInputElement) lessonQuestionEditOptionDAltInput.value = "";
      if (lessonQuestionEditExplanationAltInput instanceof HTMLInputElement) {
        lessonQuestionEditExplanationAltInput.value = "";
      }
      [
        lessonQuestionTextAltInput,
        lessonOptionAAltInput,
        lessonOptionBAltInput,
        lessonOptionCAltInput,
        lessonOptionDAltInput,
        lessonQuestionExplanationAltInput,
        lessonQuestionEditTextAltInput,
        lessonQuestionEditOptionAAltInput,
        lessonQuestionEditOptionBAltInput,
        lessonQuestionEditOptionCAltInput,
        lessonQuestionEditOptionDAltInput,
        lessonQuestionEditExplanationAltInput,
      ].forEach((control) => {
        clearAutoTranslationMeta(control);
      });
    } else {
      if (!(lessonBulkImportUseAltInput instanceof HTMLInputElement && lessonBulkImportUseAltInput.checked)) {
        if (lessonBulkImportTextAltInput instanceof HTMLTextAreaElement) lessonBulkImportTextAltInput.value = "";
      }
      if (!(lessonBulkImportCsvUseAltInput instanceof HTMLInputElement && lessonBulkImportCsvUseAltInput.checked)) {
        if (lessonBulkImportCsvFileAltInput instanceof HTMLInputElement) lessonBulkImportCsvFileAltInput.value = "";
      }
      autoTranslateVisibleQuestionFields();
    }
    updateQuestionLanguageGuide();
  };
  const resolveQuestionSectionType = (question) => {
    const sectionLabel = normalizeQuestionSectionLabel(question?.sectionLabel);
    const sectionMeta = sectionLabel ? getSectionMetaByLabel(sectionLabel) : null;
    return normalizeSectionType(sectionMeta?.sectionType || SECTION_TYPE_FROM_LABEL[sectionLabel] || "GENERAL_MCQ");
  };
  const getQuestionCategoryOptions = () => {
    const options = [];
    const include = (value) => {
      const normalized = normalizeSectionType(value);
      if (!normalized || options.includes(normalized)) return;
      options.push(normalized);
    };
    SECTION_TYPE_FILTER_ORDER.forEach((sectionType) => include(sectionType));
    state.mockTestSections.forEach((section) => include(section?.sectionType));
    state.mockQuestions.forEach((question) => include(resolveQuestionSectionType(question)));
    return options;
  };
  const getQuestionSectionOptions = (categoryFilter = "") => {
    const normalizedCategory = categoryFilter ? normalizeSectionType(categoryFilter) : "";
    const options = [];
    const include = (label, sectionType) => {
      const normalizedLabel = normalizeQuestionSectionLabel(label);
      if (!normalizedLabel) return;
      const normalizedType = normalizeSectionType(sectionType || SECTION_TYPE_FROM_LABEL[normalizedLabel]);
      if (normalizedCategory && normalizedType !== normalizedCategory) return;
      if (!options.includes(normalizedLabel)) {
        options.push(normalizedLabel);
      }
    };
    DEFAULT_QUESTION_SECTIONS.forEach((label) => {
      include(label, SECTION_TYPE_FROM_LABEL[label]);
    });
    state.mockTestSections.forEach((section) => {
      include(section?.sectionLabel, section?.sectionType);
    });
    state.mockQuestions.forEach((question) => {
      include(question?.sectionLabel, resolveQuestionSectionType(question));
    });
    return options;
  };
  const currentQuestionCategoryFilter = () =>
    lessonQuestionCategoryFilterInput instanceof HTMLSelectElement
      ? String(lessonQuestionCategoryFilterInput.value || "ALL")
      : "ALL";
  const activeQuestionCategoryFilter = () => {
    const filter = currentQuestionCategoryFilter();
    return filter === "ALL" ? "" : normalizeSectionType(filter);
  };
  const currentQuestionSectionFilter = () =>
    lessonQuestionSectionFilterInput instanceof HTMLSelectElement
      ? String(lessonQuestionSectionFilterInput.value || "ALL")
      : "ALL";
  const resetQuestionSectionFilter = () => {
    if (lessonQuestionSectionFilterInput instanceof HTMLSelectElement) {
      lessonQuestionSectionFilterInput.value = "ALL";
    }
  };
  const activeQuestionSectionFilter = () => {
    const filter = currentQuestionSectionFilter();
    return filter === "ALL" ? "" : filter;
  };
  const visibleMockQuestions = () => {
    const categoryFilter = activeQuestionCategoryFilter();
    const sectionFilter = activeQuestionSectionFilter();
    if (!categoryFilter && !sectionFilter) return state.mockQuestions;
    return state.mockQuestions.filter(
      (question) =>
        (!categoryFilter || resolveQuestionSectionType(question) === categoryFilter) &&
        (!sectionFilter || normalizeQuestionSectionLabel(question?.sectionLabel) === sectionFilter)
    );
  };
  const orderedMockQuestions = (options = {}) => {
    const { excludeQuestionId = "" } = options;
    return [...state.mockQuestions]
      .filter((question) => question && String(question.id || "") !== String(excludeQuestionId || ""))
      .sort((left, right) => {
        const leftOrder = Number(left?.displayOrder || 0);
        const rightOrder = Number(right?.displayOrder || 0);
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return String(left?.id || "").localeCompare(String(right?.id || ""));
      });
  };
  const renderQuestionDisplayOrderSelect = (input, questions, selectedValue) => {
    if (!(input instanceof HTMLSelectElement)) return;
    const safeQuestions = Array.isArray(questions) ? questions : [];
    const options = [];
    if (!safeQuestions.length) {
      options.push('<option value="1">1. First question</option>');
    } else {
      options.push('<option value="1">1. At beginning</option>');
      safeQuestions.forEach((question, index) => {
        const label = compactLabel(String(question?.questionText || "Untitled question"), 56);
        options.push(
          `<option value="${index + 2}">${escapeHtml(`After ${index + 1}. ${label}`)}</option>`
        );
      });
    }
    input.innerHTML = options.join("");
    const maxPosition = safeQuestions.length + 1;
    const nextValue = Math.min(Math.max(Number(selectedValue || maxPosition), 1), maxPosition);
    input.value = String(nextValue);
  };
  const renderQuestionDisplayOrderControls = (options = {}) => {
    const {
      manualSelectedOrder = Number(lessonQuestionDisplayOrderInput?.value || 0),
      editSelectedOrder = Number(lessonQuestionEditDisplayOrderInput?.value || 0),
      editExcludeQuestionId = lessonQuestionEditIdInput?.value || "",
    } = options;
    renderQuestionDisplayOrderSelect(
      lessonQuestionDisplayOrderInput,
      orderedMockQuestions(),
      manualSelectedOrder || orderedMockQuestions().length + 1
    );
    renderQuestionDisplayOrderSelect(
      lessonQuestionEditDisplayOrderInput,
      orderedMockQuestions({ excludeQuestionId: editExcludeQuestionId }),
      editSelectedOrder || 1
    );
  };
  const renderQuestionSectionControls = () => {
    const sectionOptions = getQuestionSectionOptions();
    const categoryOptions = getQuestionCategoryOptions();
    const renderSectionSelectOptions = (optionsList, selectedValue, includeAll = false) => {
      const options = [];
      if (includeAll) {
        options.push('<option value="ALL">All Sections</option>');
      }
      optionsList.forEach((label) => {
        const selected = selectedValue === label ? " selected" : "";
        options.push(`<option value="${escapeHtml(label)}"${selected}>${escapeHtml(label)}</option>`);
      });
      return options.join("");
    };
    const renderCategorySelectOptions = (selectedValue, includeAll = false) => {
      const options = [];
      if (includeAll) {
        options.push('<option value="ALL">All Categories</option>');
      }
      categoryOptions.forEach((category) => {
        const normalizedCategory = normalizeSectionType(category);
        const selected = selectedValue === normalizedCategory ? " selected" : "";
        const label = SECTION_TYPE_LABELS[normalizedCategory] || normalizedCategory;
        options.push(
          `<option value="${escapeHtml(normalizedCategory)}"${selected}>${escapeHtml(label)}</option>`
        );
      });
      return options.join("");
    };

    if (lessonQuestionSectionInput instanceof HTMLSelectElement) {
      const configuredDefault =
        normalizeQuestionSectionLabel(state.mockTestSections?.[0]?.sectionLabel) || sectionOptions[0] || "";
      const previous = normalizeQuestionSectionLabel(lessonQuestionSectionInput.value) || configuredDefault;
      lessonQuestionSectionInput.innerHTML = renderSectionSelectOptions(sectionOptions, previous, false);
      lessonQuestionSectionInput.value = sectionOptions.includes(previous) ? previous : sectionOptions[0] || "";
    }
    if (lessonBulkImportSectionInput instanceof HTMLSelectElement) {
      const previous = normalizeQuestionSectionLabel(lessonBulkImportSectionInput.value) || sectionOptions[0] || "";
      lessonBulkImportSectionInput.innerHTML = renderSectionSelectOptions(sectionOptions, previous, false);
      lessonBulkImportSectionInput.value = sectionOptions.includes(previous) ? previous : sectionOptions[0] || "";
    }
    if (lessonBulkImportCsvSectionInput instanceof HTMLSelectElement) {
      const previous = normalizeQuestionSectionLabel(lessonBulkImportCsvSectionInput.value) || sectionOptions[0] || "";
      lessonBulkImportCsvSectionInput.innerHTML = renderSectionSelectOptions(sectionOptions, previous, false);
      lessonBulkImportCsvSectionInput.value = sectionOptions.includes(previous) ? previous : sectionOptions[0] || "";
    }
    if (lessonQuestionEditSectionInput instanceof HTMLSelectElement) {
      const previous = normalizeQuestionSectionLabel(lessonQuestionEditSectionInput.value) || sectionOptions[0] || "";
      lessonQuestionEditSectionInput.innerHTML = renderSectionSelectOptions(sectionOptions, previous, false);
      lessonQuestionEditSectionInput.value = sectionOptions.includes(previous) ? previous : sectionOptions[0] || "";
    }
    let selectedCategoryFilter = currentQuestionCategoryFilter();
    if (lessonQuestionCategoryFilterInput instanceof HTMLSelectElement) {
      const normalizedPrevious =
        selectedCategoryFilter === "ALL" ? "ALL" : normalizeSectionType(selectedCategoryFilter);
      lessonQuestionCategoryFilterInput.innerHTML = renderCategorySelectOptions(normalizedPrevious, true);
      lessonQuestionCategoryFilterInput.value =
        normalizedPrevious === "ALL" || categoryOptions.includes(normalizedPrevious)
          ? normalizedPrevious
          : "ALL";
      selectedCategoryFilter = lessonQuestionCategoryFilterInput.value || "ALL";
    }
    const selectedCategory = selectedCategoryFilter === "ALL" ? "" : normalizeSectionType(selectedCategoryFilter);
    const filteredSectionOptions = getQuestionSectionOptions(selectedCategory);
    if (lessonQuestionSectionFilterInput instanceof HTMLSelectElement) {
      const previous = currentQuestionSectionFilter();
      lessonQuestionSectionFilterInput.innerHTML = renderSectionSelectOptions(
        filteredSectionOptions,
        previous,
        true
      );
      lessonQuestionSectionFilterInput.value =
        previous === "ALL" || filteredSectionOptions.includes(previous) ? previous : "ALL";
    }
    renderQuestionDisplayOrderControls();
  };
  const updateQuestionSectionSummary = () => {
    if (!(lessonQuestionSectionSummary instanceof HTMLElement)) return;
    if (!state.mockQuestions.length) {
      lessonQuestionSectionSummary.textContent = "No questions added yet.";
      return;
    }
    const sectionOptions = getQuestionSectionOptions();
    const sectionSummary = sectionOptions
      .map((label) => {
        const total = state.mockQuestions.filter(
          (question) => normalizeQuestionSectionLabel(question?.sectionLabel) === label
        ).length;
        return `${label}: ${total}`;
      })
      .join(" | ");
    const totalActive = state.mockQuestions.filter((question) => Boolean(question?.isActive)).length;
    const target = requiredQuestionsForLesson();
    lessonQuestionSectionSummary.textContent = `Section-wise count: ${sectionSummary} | Total: ${totalActive}/${target}`;
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
  const addTestToToc = async (testId) => {
    const normalizedTestId = String(testId || "").trim();
    if (!normalizedTestId) {
      throw new Error("Test id is required.");
    }

    const targetCourseId = String(
      state.selectedMockCourseId || mockLinkCourseIdInput?.value?.trim() || state.selectedCourseId || ""
    ).trim();
    const targetChapterId = String(
      state.selectedMockChapterId || mockLinkChapterIdInput?.value?.trim() || state.selectedChapterId || ""
    ).trim();
    if (!targetCourseId || !targetChapterId) {
      throw new Error("Select course and subject first so the TOC entry can be created in the right place.");
    }

    const existingLinkedLesson = await findLinkedLessonForPlay(normalizedTestId);
    if (existingLinkedLesson?.lessonId) {
      if (existingLinkedLesson.chapterId) {
        state.selectedMockChapterId = existingLinkedLesson.chapterId;
        state.selectedChapterId = existingLinkedLesson.chapterId;
      }
      state.selectedMockLessonId = existingLinkedLesson.lessonId;
      renderMockChapterOptions();
      if (state.selectedMockChapterId) {
        await loadMockLessons(state.selectedMockChapterId);
      }
      return {
        lessonId: existingLinkedLesson.lessonId,
        created: false,
      };
    }

    state.selectedCourseId = targetCourseId;
    state.selectedChapterId = targetChapterId;
    if (lessonCourseIdInput instanceof HTMLSelectElement) {
      lessonCourseIdInput.value = targetCourseId;
    }
    if (lessonChapterIdInput instanceof HTMLSelectElement) {
      lessonChapterIdInput.value = targetChapterId;
    }
    await loadLessons(targetChapterId);

    const test = state.mockTestsAdmin.find((item) => String(item?.id || "").trim() === normalizedTestId);
    if (!test) {
      throw new Error("Selected test was not found.");
    }

    const created = await apiRequest({
      path: "/admin/lesson-items",
      method: "POST",
      token,
      body: {
        chapterId: targetChapterId,
        title: String(test.title || "Untitled test").trim() || "Untitled test",
        orderIndex: getNextLessonOrderIndex(),
        assessmentTestId: normalizedTestId,
      },
    });

    const savedLessonId = String(created?.lesson?.id || "").trim();
    lessonTrackingCache = [];
    await Promise.all([
      loadLessons(targetChapterId),
      loadMockLessons(targetChapterId),
      loadLessonTracking(),
      loadAssessments(),
    ]);
    if (savedLessonId) {
      state.selectedMockLessonId = savedLessonId;
      if (mockLinkLessonIdInput instanceof HTMLSelectElement) {
        mockLinkLessonIdInput.value = savedLessonId;
      }
      renderMockLessonOptions();
    }

    return {
      lessonId: savedLessonId,
      created: true,
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
  const inferMockSubjectFromChapter = (examType = inferMockExamTypeFromCourse()) => {
    const chapterTitle = normalizeLookupText(selectedMockChapter()?.title || "");
    const lessonTitle = normalizeLookupText(selectedMockLesson()?.title || "");
    const combinedTitle = `${chapterTitle} ${lessonTitle}`.trim();
    if (!combinedTitle) return "PUNJABI";
    if (combinedTitle.includes("punjabi")) return "PUNJABI";
    if (combinedTitle.includes("english")) return "ENGLISH";
    if (combinedTitle.includes("child") || combinedTitle.includes("pedagogy")) return "CHILD_PEDAGOGY";

    const mentionsEvs =
      combinedTitle.includes("evs") ||
      combinedTitle.includes("environment") ||
      combinedTitle.includes("environmental");
    const mentionsMaths =
      combinedTitle.includes("maths") ||
      combinedTitle.includes("mathematics") ||
      combinedTitle.includes("math ");

    if (mentionsMaths && mentionsEvs) return "MATHS_EVS";
    if (mentionsEvs) return "EVS";
    if (mentionsMaths) return "MATHS";
    if (examType === "PSTET_2") {
      if (combinedTitle.includes("social")) return "SOCIAL_STUDIES";
      if (combinedTitle.includes("science") && combinedTitle.includes("math")) return "SCIENCE_MATH";
    }
    return "CHILD_PEDAGOGY";
  };
  const normalizeMockSubjectValue = (value) => {
    const raw = String(value || "")
      .trim()
      .toUpperCase()
      .replace(/^\d+\s*[\.\-:)]\s*/, "")
      .replace(/\s+/g, " ");

    if (!raw) return "PUNJABI";
    if (raw === "MATHEMATICS") return "MATHS";
    if (raw === "CHILD PEDAGOGY" || raw === "CHILD DEVELOPMENT & PEDAGOGY") {
      return "CHILD_PEDAGOGY";
    }
    if (raw === "SCIENCE/MATH" || raw === "SCIENCE & MATH") return "SCIENCE_MATH";
    if (raw === "SOCIAL STUDIES" || raw === "SOCIAL STUDY") return "SOCIAL_STUDIES";
    if (raw === "MATHS/EVS" || raw === "MATHS EVS" || raw === "MATHEMATICS/EVS") {
      return "MATHS_EVS";
    }
    if (raw.includes("EVS") && !raw.includes("MATH")) return "EVS";
    if ((raw.includes("MATH") || raw.includes("MATHEMAT")) && raw.includes("EVS")) {
      return "MATHS_EVS";
    }
    if (raw.includes("MATH") || raw.includes("MATHEMAT")) return "MATHS";
    return raw.replace(/\s+/g, "_");
  };
  const normalizeProductAttachmentType = (value) => {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "DEMO") return "DEMO";
    if (normalized === "LESSON") return "LESSON";
    return "MOCK";
  };
  const loadActiveProductsForLessonFlow = async () => {
    const response = await apiRequest({
      path: "/admin/products",
      token,
      query: { isActive: true },
    });
    return Array.isArray(response?.products) ? response.products : [];
  };
  const findProductsLinkedToMockTest = async (mockTestId) => {
    const normalizedMockTestId = String(mockTestId || "").trim();
    if (!normalizedMockTestId) return [];
    const products = await loadActiveProductsForLessonFlow();
    return products.filter((product) => {
      const linkedMockTests = Array.isArray(product?.linkedMockTests) ? product.linkedMockTests : [];
      const linkedDemoMockTests = Array.isArray(product?.linkedDemoMockTests) ? product.linkedDemoMockTests : [];
      return [...linkedMockTests, ...linkedDemoMockTests].some(
        (item) => String(item?.id || "").trim() === normalizedMockTestId
      );
    });
  };
  const buildProductAttachmentSetupUrl = (mockTestId) => {
    const selected = selectedMockTest();
    const params = new URLSearchParams();
    params.set("tab", "attachments");
    params.set(
      "attachmentType",
      normalizeProductAttachmentType(selected?.accessCode || lessonMockTestAccessCodeInput?.value || "DEMO")
    );
    const courseTitle = String(selectedMockCourse()?.title || "").trim();
    const chapterTitle = String(selectedMockChapter()?.title || "").trim();
    const subjectValue = normalizeMockSubjectValue(selected?.subject || lessonMockTestSubjectInput?.value || "");
    const languageValue = String(selected?.languageMode || lessonMockTestLanguageModeInput?.value || "")
      .trim()
      .toUpperCase();
    const titleValue = String(selected?.title || lessonMockTestTitleInput?.value || "").trim();
    if (courseTitle) params.set("course", courseTitle);
    if (chapterTitle) params.set("chapter", chapterTitle);
    if (subjectValue) params.set("subject", subjectValue);
    if (languageValue) params.set("language", languageValue);
    if (titleValue) params.set("title", titleValue);
    if (mockTestId) params.set("testId", String(mockTestId));
    params.set(
      "message",
      "First-time product attachment is needed. Open the correct product, keep Attachments tab, check this test, and save once."
    );
    return `./admin-products.html?${params.toString()}`;
  };
  const syncMockSubjectOptionsByExam = () => {
    if (!(lessonMockTestSubjectInput instanceof HTMLSelectElement)) return;
    const examType = lessonMockTestExamTypeInput?.value || "PSTET_1";
    const allowedSubjects = new Set(SUBJECTS_BY_EXAM[examType] || SUBJECTS_BY_EXAM.PSTET_1);
    Array.from(lessonMockTestSubjectInput.options).forEach((option) => {
      const allowed = allowedSubjects.has(option.value);
      option.hidden = !allowed;
      option.disabled = !allowed;
    });
    const normalizedCurrent = normalizeMockSubjectValue(lessonMockTestSubjectInput.value || "");
    lessonMockTestSubjectInput.value = allowedSubjects.has(normalizedCurrent)
      ? normalizedCurrent
      : normalizeMockSubjectValue(inferMockSubjectFromChapter(examType));
  };
  const syncMockTaxonomyFromScope = (options = {}) => {
    const { force = false } = options;
    const examType = inferMockExamTypeFromCourse();
    const subject = normalizeMockSubjectValue(inferMockSubjectFromChapter(examType));
    if (lessonMockTestExamTypeInput) {
      const hasValue = Boolean(String(lessonMockTestExamTypeInput.value || "").trim());
      if (force || !hasValue || !state.selectedMockTestId) {
        lessonMockTestExamTypeInput.value = examType;
      }
    }
    syncMockSubjectOptionsByExam();
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
      testsTrackPanel.classList.remove("hidden");
    }
    if (testsBuilderWorkspace instanceof HTMLElement) {
      testsBuilderWorkspace.classList.toggle("hidden", nextMode !== "create");
    }
    if (nextMode === "attach") {
      renderAttachExistingTestOptions();
      renderMockTestsAdmin();
    } else {
      setTestsBuilderTab(state.testsBuilderTab || "transcript");
    }
    setLessonQuestionBankVisibility();
  };

  const getAttachFilteredTests = () => {
    const selectedFilter = lessonAttachFilterTypeInput?.value || "all";
    const searchText = String(lessonAttachTestSearchInput?.value || "")
      .trim()
      .toLowerCase();
    const selectedTitle = String(lessonMockTestTitleInput?.value || "")
      .trim()
      .toLowerCase();
    const selectedSubject = String(lessonMockTestSubjectInput?.value || "")
      .trim()
      .toUpperCase();
    const selectedAccess = String(lessonMockTestAccessCodeInput?.value || "")
      .trim()
      .toUpperCase();
    const selectedCategory = String(lessonMockTestCategoryInput?.value || "")
      .trim()
      .toUpperCase();
    const selectedLanguageMode = String(lessonMockTestLanguageModeInput?.value || "")
      .trim()
      .toUpperCase();
    return state.mockTestsAdmin.filter((test) => {
      const accessCode = String(test.accessCode || "DEMO").toUpperCase();
      if (selectedFilter !== "all" && accessCode !== String(selectedFilter).toUpperCase()) return false;
      if (selectedSubject && String(test.subject || "").toUpperCase() !== selectedSubject) return false;
      if (selectedAccess && accessCode !== selectedAccess) return false;
      if (selectedCategory && String(test.mockCategory || "").toUpperCase() !== selectedCategory) return false;
      if (
        selectedLanguageMode &&
        String(test.languageMode || "")
          .trim()
          .toUpperCase() !== selectedLanguageMode
      ) {
        return false;
      }
      if (selectedTitle && !String(test.title || "").toLowerCase().includes(selectedTitle)) return false;
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
  const refreshAttachFilteredViews = () => {
    if (state.testsMode !== "attach") return;
    renderAttachExistingTestOptions();
    renderMockTestsAdmin();
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
    syncQuestionInputModeControls();
    if (lessonQuestionIdInput instanceof HTMLInputElement) lessonQuestionIdInput.value = "";
    if (lessonQuestionSectionInput instanceof HTMLSelectElement) {
      const defaultSection =
        normalizeQuestionSectionLabel(lessonQuestionSectionInput.value) || DEFAULT_QUESTION_SECTIONS[0];
      lessonQuestionSectionInput.value = defaultSection;
    }
    if (lessonQuestionIsActiveInput instanceof HTMLInputElement) lessonQuestionIsActiveInput.checked = true;
    if (lessonQuestionSubmitBtn instanceof HTMLButtonElement) lessonQuestionSubmitBtn.textContent = "Add Question";
    if (lessonQuestionCancelBtn instanceof HTMLButtonElement) lessonQuestionCancelBtn.classList.add("hidden");
    if (lessonQuestionAltToggleInput instanceof HTMLInputElement) lessonQuestionAltToggleInput.checked = false;
    if (lessonQuestionPassageTextInput instanceof HTMLTextAreaElement) lessonQuestionPassageTextInput.value = "";
    if (lessonQuestionFormulaTextInput instanceof HTMLInputElement) lessonQuestionFormulaTextInput.value = "";
    if (lessonQuestionEquationTextInput instanceof HTMLInputElement) lessonQuestionEquationTextInput.value = "";
    if (lessonQuestionTextAltInput instanceof HTMLTextAreaElement) lessonQuestionTextAltInput.value = "";
    if (lessonOptionAAltInput instanceof HTMLInputElement) lessonOptionAAltInput.value = "";
    if (lessonOptionBAltInput instanceof HTMLInputElement) lessonOptionBAltInput.value = "";
    if (lessonOptionCAltInput instanceof HTMLInputElement) lessonOptionCAltInput.value = "";
    if (lessonOptionDAltInput instanceof HTMLInputElement) lessonOptionDAltInput.value = "";
    if (lessonQuestionExplanationAltInput instanceof HTMLInputElement) lessonQuestionExplanationAltInput.value = "";
    [
      lessonQuestionTextAltInput,
      lessonOptionAAltInput,
      lessonOptionBAltInput,
      lessonOptionCAltInput,
      lessonOptionDAltInput,
      lessonQuestionExplanationAltInput,
    ].forEach((control) => {
      clearAutoTranslationMeta(control);
    });
    if (lessonQuestionDisplayOrderInput instanceof HTMLSelectElement) {
      renderQuestionDisplayOrderControls({ manualSelectedOrder: orderedMockQuestions().length + 1 });
    }
    refreshManualCorrectOptionChoices();
    toggleBilingualQuestionInputs();
    toggleQuestionStructuredFields();
    updateQuestionLanguageGuide();
  };

  const resetLessonSectionForm = () => {
    if (!(lessonSectionForm instanceof HTMLFormElement)) return;
    lessonSectionForm.reset();
    if (lessonSectionIdInput instanceof HTMLInputElement) lessonSectionIdInput.value = "";
    if (lessonSectionTypeInput instanceof HTMLSelectElement) {
      lessonSectionTypeInput.value = "COMPREHENSION";
    }
    if (lessonSectionQuestionLimitInput instanceof HTMLInputElement) {
      const suggested = Math.max(1, Math.floor(requiredQuestionsForLesson() / 3));
      lessonSectionQuestionLimitInput.value = String(suggested || 10);
    }
    if (lessonSectionSaveBtn instanceof HTMLButtonElement) {
      lessonSectionSaveBtn.textContent = "Save Section";
    }
    if (lessonSectionCancelBtn instanceof HTMLButtonElement) {
      lessonSectionCancelBtn.classList.add("hidden");
    }
    if (lessonSectionSkipTranscriptInput instanceof HTMLInputElement) {
      lessonSectionSkipTranscriptInput.checked = false;
    }
    toggleLessonSectionTranscriptState();
    updateSectionTypeGuide();
  };

  const renderLessonSections = () => {
    if (!(lessonSectionsTableBody instanceof HTMLElement)) return;
    if (!state.mockTestSections.length) {
      lessonSectionsTableBody.innerHTML = "<tr><td colspan='5'>No sections yet.</td></tr>";
      return;
    }
    lessonSectionsTableBody.innerHTML = state.mockTestSections
      .map((section) => {
        const label = normalizeQuestionSectionLabel(section?.sectionLabel);
        const activeCount = state.mockQuestions.filter(
          (question) => normalizeQuestionSectionLabel(question?.sectionLabel) === label
        ).length;
        return `
      <tr>
        <td>${escapeHtml(label || "-")}</td>
        <td>${escapeHtml(SECTION_TYPE_LABELS[normalizeSectionType(section?.sectionType)] || "-")}</td>
        <td>${Number(section?.questionLimit || 0) || "-"}</td>
        <td>${activeCount}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="table-btn edit" data-edit-lesson-section="${section.id}">Edit</button>
            <button type="button" class="table-btn delete" data-delete-lesson-section="${section.id}">Delete</button>
          </div>
        </td>
      </tr>`;
      })
      .join("");
  };

  const loadMockTestSections = async (mockTestId) => {
    if (!mockTestId) {
      state.mockTestSections = [];
      renderLessonSections();
      renderQuestionSectionControls();
      return;
    }
    const response = await apiRequest({
      path: `/admin/mock-tests/${encodeURIComponent(mockTestId)}/sections`,
      token,
    });
    state.mockTestSections = response.sections || [];
    renderLessonSections();
    renderQuestionSectionControls();
    toggleQuestionStructuredFields();
  };

  const buildLessonSectionPayload = () => {
    const sectionType = normalizeSectionType(lessonSectionTypeInput?.value);
    const sectionLabel = normalizeQuestionSectionLabel(lessonSectionLabelInput?.value);
    const skipTranscript = Boolean(
      lessonSectionSkipTranscriptInput instanceof HTMLInputElement && lessonSectionSkipTranscriptInput.checked
    );
    const transcriptText = skipTranscript ? "" : String(lessonSectionTranscriptInput?.value || "").trim();
    const audioUrl = String(lessonSectionAudioUrlInput?.value || "").trim();
    const questionLimit = Math.max(1, Math.floor(Number(lessonSectionQuestionLimitInput?.value || 0)));
    if (!sectionLabel) {
      throw new Error("Section name is required.");
    }
    if (!Number.isFinite(questionLimit) || questionLimit < 1) {
      throw new Error("Section question limit must be 1 or greater.");
    }
    return {
      sectionType,
      sectionLabel,
      transcriptText: transcriptText || undefined,
      audioUrl: audioUrl || undefined,
      questionLimit,
      isActive: true,
    };
  };

  const saveMockTestSection = async () => {
    if (!state.selectedMockTestId) {
      throw new Error("Create or attach a test before saving sections.");
    }
    const payload = buildLessonSectionPayload();
    const sectionId = String(lessonSectionIdInput?.value || "").trim();
    if (sectionId) {
      await apiRequest({
        path: `/admin/mock-test-sections/${encodeURIComponent(sectionId)}`,
        method: "PATCH",
        token,
        body: payload,
      });
      return;
    }
    await apiRequest({
      path: `/admin/mock-tests/${encodeURIComponent(state.selectedMockTestId)}/sections`,
      method: "POST",
      token,
      body: payload,
    });
  };

  const openLessonSectionForEdit = (section) => {
    if (!section) return;
    setTestsBuilderTab("question-bank");
    setQuestionBankMode("sections");
    if (lessonSectionIdInput instanceof HTMLInputElement) {
      lessonSectionIdInput.value = String(section.id || "");
    }
    if (lessonSectionTypeInput instanceof HTMLSelectElement) {
      lessonSectionTypeInput.value = normalizeSectionType(section.sectionType);
    }
    if (lessonSectionLabelInput instanceof HTMLInputElement) {
      lessonSectionLabelInput.value = String(section.sectionLabel || "");
    }
    if (lessonSectionQuestionLimitInput instanceof HTMLInputElement) {
      const nextLimit = Math.max(1, Number(section.questionLimit || 1));
      lessonSectionQuestionLimitInput.value = String(nextLimit);
    }
    if (lessonSectionAudioUrlInput instanceof HTMLInputElement) {
      lessonSectionAudioUrlInput.value = String(section.audioUrl || "");
    }
    if (lessonSectionTranscriptInput instanceof HTMLTextAreaElement) {
      lessonSectionTranscriptInput.value = String(section.transcriptText || "");
    }
    if (lessonSectionSkipTranscriptInput instanceof HTMLInputElement) {
      lessonSectionSkipTranscriptInput.checked = !String(section.transcriptText || "").trim();
    }
    toggleLessonSectionTranscriptState();
    if (lessonSectionSaveBtn instanceof HTMLButtonElement) {
      lessonSectionSaveBtn.textContent = "Update Section";
    }
    if (lessonSectionCancelBtn instanceof HTMLButtonElement) {
      lessonSectionCancelBtn.classList.remove("hidden");
    }
    updateSectionTypeGuide();
  };

  const refreshManualCorrectOptionChoices = () => {
    if (!(lessonCorrectOptionInput instanceof HTMLSelectElement)) return;
    Array.from(lessonCorrectOptionInput.options).forEach((entry) => {
      const key = String(entry.value || "").trim().toUpperCase();
      if (!["A", "B", "C", "D"].includes(key)) return;
      entry.textContent = key;
    });

    const selectedKeyRaw = String(lessonCorrectOptionInput.value || "A").trim().toUpperCase();
    const selectedKey = ["A", "B", "C", "D"].includes(selectedKeyRaw) ? selectedKeyRaw : "A";
    lessonCorrectOptionInput.value = selectedKey;

    const leftAnswerMap = {
      A: String(lessonOptionAInput?.value || "").trim(),
      B: String(lessonOptionBInput?.value || "").trim(),
      C: String(lessonOptionCInput?.value || "").trim(),
      D: String(lessonOptionDInput?.value || "").trim(),
    };
    const rightAnswerMap = {
      A: String(lessonOptionAAltInput?.value || "").trim(),
      B: String(lessonOptionBAltInput?.value || "").trim(),
      C: String(lessonOptionCAltInput?.value || "").trim(),
      D: String(lessonOptionDAltInput?.value || "").trim(),
    };

    if (lessonQuestionExplanationInput instanceof HTMLInputElement) {
      lessonQuestionExplanationInput.value = leftAnswerMap[selectedKey] || "";
    }
    if (lessonQuestionExplanationAltInput instanceof HTMLInputElement) {
      lessonQuestionExplanationAltInput.value = rightAnswerMap[selectedKey] || "";
    }
  };

  const refreshEditCorrectOptionChoices = () => {
    if (!(lessonQuestionEditCorrectInput instanceof HTMLSelectElement)) return;
    Array.from(lessonQuestionEditCorrectInput.options).forEach((entry) => {
      const key = String(entry.value || "").trim().toUpperCase();
      if (!["A", "B", "C", "D"].includes(key)) return;
      entry.textContent = key;
    });

    const selectedKeyRaw = String(lessonQuestionEditCorrectInput.value || "A").trim().toUpperCase();
    const selectedKey = ["A", "B", "C", "D"].includes(selectedKeyRaw) ? selectedKeyRaw : "A";
    lessonQuestionEditCorrectInput.value = selectedKey;

    const leftAnswerMap = {
      A: String(lessonQuestionEditOptionAInput?.value || "").trim(),
      B: String(lessonQuestionEditOptionBInput?.value || "").trim(),
      C: String(lessonQuestionEditOptionCInput?.value || "").trim(),
      D: String(lessonQuestionEditOptionDInput?.value || "").trim(),
    };
    const rightAnswerMap = {
      A: String(lessonQuestionEditOptionAAltInput?.value || "").trim(),
      B: String(lessonQuestionEditOptionBAltInput?.value || "").trim(),
      C: String(lessonQuestionEditOptionCAltInput?.value || "").trim(),
      D: String(lessonQuestionEditOptionDAltInput?.value || "").trim(),
    };

    if (lessonQuestionEditExplanationInput instanceof HTMLInputElement) {
      lessonQuestionEditExplanationInput.value = leftAnswerMap[selectedKey] || "";
    }
    if (lessonQuestionEditExplanationAltInput instanceof HTMLInputElement) {
      lessonQuestionEditExplanationAltInput.value = rightAnswerMap[selectedKey] || "";
    }
  };

  const toggleQuestionStructuredFields = () => {
    const sectionLabel = normalizeQuestionSectionLabel(lessonQuestionSectionInput?.value);
    const sectionMeta = getSectionMetaByLabel(sectionLabel);
    const sectionType = normalizeSectionType(sectionMeta?.sectionType || SECTION_TYPE_FROM_LABEL[sectionLabel]);
    if (lessonQuestionPassageWrap instanceof HTMLElement) {
      lessonQuestionPassageWrap.classList.toggle("hidden", sectionType !== "COMPREHENSION");
    }
    if (lessonQuestionFormulaWrap instanceof HTMLElement) {
      lessonQuestionFormulaWrap.classList.toggle("hidden", sectionType !== "MATH_FORMULA");
    }
    if (lessonQuestionEquationWrap instanceof HTMLElement) {
      lessonQuestionEquationWrap.classList.toggle("hidden", sectionType !== "SCIENCE_EQUATION");
    }
    if (sectionMeta && lessonQuestionPassageTextInput instanceof HTMLTextAreaElement && sectionType === "COMPREHENSION") {
      if (!lessonQuestionPassageTextInput.value.trim() && String(sectionMeta.transcriptText || "").trim()) {
        lessonQuestionPassageTextInput.value = String(sectionMeta.transcriptText || "").trim();
      }
    }
  };

  const resetLessonQuestionEditForm = () => {
    if (!(lessonQuestionEditForm instanceof HTMLFormElement)) return;
    lessonQuestionEditForm.reset();
    syncQuestionInputModeControls();
    if (lessonQuestionEditIdInput instanceof HTMLInputElement) lessonQuestionEditIdInput.value = "";
    if (lessonQuestionEditSectionInput instanceof HTMLSelectElement) {
      const defaultSection =
        normalizeQuestionSectionLabel(lessonQuestionEditSectionInput.value) || DEFAULT_QUESTION_SECTIONS[0];
      lessonQuestionEditSectionInput.value = defaultSection;
    }
    if (lessonQuestionEditCorrectInput instanceof HTMLSelectElement) lessonQuestionEditCorrectInput.value = "A";
    if (lessonQuestionEditIsActiveInput instanceof HTMLInputElement) {
      lessonQuestionEditIsActiveInput.checked = true;
    }
    if (lessonQuestionEditTextAltInput instanceof HTMLTextAreaElement) lessonQuestionEditTextAltInput.value = "";
    if (lessonQuestionEditOptionAAltInput instanceof HTMLInputElement) lessonQuestionEditOptionAAltInput.value = "";
    if (lessonQuestionEditOptionBAltInput instanceof HTMLInputElement) lessonQuestionEditOptionBAltInput.value = "";
    if (lessonQuestionEditOptionCAltInput instanceof HTMLInputElement) lessonQuestionEditOptionCAltInput.value = "";
    if (lessonQuestionEditOptionDAltInput instanceof HTMLInputElement) lessonQuestionEditOptionDAltInput.value = "";
    if (lessonQuestionEditExplanationAltInput instanceof HTMLInputElement) {
      lessonQuestionEditExplanationAltInput.value = "";
    }
    [
      lessonQuestionEditTextAltInput,
      lessonQuestionEditOptionAAltInput,
      lessonQuestionEditOptionBAltInput,
      lessonQuestionEditOptionCAltInput,
      lessonQuestionEditOptionDAltInput,
      lessonQuestionEditExplanationAltInput,
    ].forEach((control) => {
      clearAutoTranslationMeta(control);
    });
    if (lessonQuestionEditDisplayOrderInput instanceof HTMLSelectElement) {
      renderQuestionDisplayOrderControls({ editSelectedOrder: 1, editExcludeQuestionId: "" });
    }
    refreshEditCorrectOptionChoices();
    toggleBilingualQuestionInputs();
  };

  const closeLessonQuestionEditModal = () => {
    if (!(lessonQuestionEditModal instanceof HTMLElement)) return;
    if (activeVoiceSession?.context === "edit") {
      stopActiveVoiceTyping({ notify: false });
    }
    lessonQuestionEditModal.classList.remove("open");
    lessonQuestionEditModal.setAttribute("aria-hidden", "true");
    resetLessonQuestionEditForm();
  };

  const openLessonQuestionEditModal = (question) => {
    if (!(lessonQuestionEditModal instanceof HTMLElement)) return;
    if (!question) return;

    renderQuestionSectionControls();

    if (lessonQuestionEditIdInput instanceof HTMLInputElement) {
      lessonQuestionEditIdInput.value = String(question.id || "");
    }
    if (lessonQuestionEditTextInput instanceof HTMLTextAreaElement) {
      lessonQuestionEditTextInput.value = String(question.questionText || "");
    }
    if (lessonQuestionEditTextAltInput instanceof HTMLTextAreaElement) {
      lessonQuestionEditTextAltInput.value = String(question.questionTextAlt || "");
    }
    if (lessonQuestionEditOptionAInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionAInput.value = String(question.optionA || "");
    }
    if (lessonQuestionEditOptionAAltInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionAAltInput.value = String(question.optionAAlt || "");
    }
    if (lessonQuestionEditOptionBInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionBInput.value = String(question.optionB || "");
    }
    if (lessonQuestionEditOptionBAltInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionBAltInput.value = String(question.optionBAlt || "");
    }
    if (lessonQuestionEditOptionCInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionCInput.value = String(question.optionC || "");
    }
    if (lessonQuestionEditOptionCAltInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionCAltInput.value = String(question.optionCAlt || "");
    }
    if (lessonQuestionEditOptionDInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionDInput.value = String(question.optionD || "");
    }
    if (lessonQuestionEditOptionDAltInput instanceof HTMLInputElement) {
      lessonQuestionEditOptionDAltInput.value = String(question.optionDAlt || "");
    }
    if (lessonQuestionEditSectionInput instanceof HTMLSelectElement) {
      lessonQuestionEditSectionInput.value =
        normalizeQuestionSectionLabel(question.sectionLabel) || DEFAULT_QUESTION_SECTIONS[0];
    }
    if (lessonQuestionEditCorrectInput instanceof HTMLSelectElement) {
      lessonQuestionEditCorrectInput.value = String(question.correctOption || "A");
    }
    if (lessonQuestionEditExplanationInput instanceof HTMLInputElement) {
      lessonQuestionEditExplanationInput.value = String(question.explanation || "");
    }
    if (lessonQuestionEditExplanationAltInput instanceof HTMLInputElement) {
      lessonQuestionEditExplanationAltInput.value = String(question.explanationAlt || "");
    }
    if (lessonQuestionEditIsActiveInput instanceof HTMLInputElement) {
      lessonQuestionEditIsActiveInput.checked = Boolean(question.isActive);
    }
    if (lessonQuestionEditDisplayOrderInput instanceof HTMLSelectElement) {
      renderQuestionDisplayOrderControls({
        editSelectedOrder: Number(question.displayOrder || 1),
        editExcludeQuestionId: question.id,
      });
    }
    [
      [lessonQuestionEditTextInput, lessonQuestionEditTextAltInput],
      [lessonQuestionEditOptionAInput, lessonQuestionEditOptionAAltInput],
      [lessonQuestionEditOptionBInput, lessonQuestionEditOptionBAltInput],
      [lessonQuestionEditOptionCInput, lessonQuestionEditOptionCAltInput],
      [lessonQuestionEditOptionDInput, lessonQuestionEditOptionDAltInput],
      [lessonQuestionEditExplanationInput, lessonQuestionEditExplanationAltInput],
    ].forEach(([leftControl, rightControl]) => {
      primeAutoTranslationMeta(leftControl, rightControl);
    });

    refreshEditCorrectOptionChoices();
    toggleBilingualQuestionInputs();
    lessonQuestionEditModal.classList.add("open");
    lessonQuestionEditModal.setAttribute("aria-hidden", "false");
    lessonQuestionEditTextInput?.focus();
  };

  const buildLessonQuestionEditPayload = () => {
    const questionId = lessonQuestionEditIdInput?.value?.trim() || "";
    const payload = {
      questionText: lessonQuestionEditTextInput?.value?.trim() || "",
      questionTextAlt: lessonQuestionEditTextAltInput?.value?.trim() || undefined,
      optionA: lessonQuestionEditOptionAInput?.value?.trim() || "",
      optionAAlt: lessonQuestionEditOptionAAltInput?.value?.trim() || undefined,
      optionB: lessonQuestionEditOptionBInput?.value?.trim() || "",
      optionBAlt: lessonQuestionEditOptionBAltInput?.value?.trim() || undefined,
      optionC: lessonQuestionEditOptionCInput?.value?.trim() || "",
      optionCAlt: lessonQuestionEditOptionCAltInput?.value?.trim() || undefined,
      optionD: lessonQuestionEditOptionDInput?.value?.trim() || "",
      optionDAlt: lessonQuestionEditOptionDAltInput?.value?.trim() || undefined,
      sectionLabel:
        normalizeQuestionSectionLabel(lessonQuestionEditSectionInput?.value) || DEFAULT_QUESTION_SECTIONS[0],
      correctOption: lessonQuestionEditCorrectInput?.value || "A",
      explanation: lessonQuestionEditExplanationInput?.value?.trim() || undefined,
      explanationAlt: lessonQuestionEditExplanationAltInput?.value?.trim() || undefined,
      displayOrder: Number(lessonQuestionEditDisplayOrderInput?.value || 1),
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
    if (isBilingualQuestionMode() && hasAnyAltQuestionPayload(payload) && !hasCompleteAltQuestionPayload(payload)) {
      throw new Error("If you add right language content, fill all right-side question and option fields.");
    }

    return { questionId, payload };
  };

  const updateLessonQuestionFromModal = async () => {
    await ensureSelectedMockTestTopFieldsSaved();
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

  const ensureQuestionTargetCapacity = (incomingCount = 1) => {
    const incoming = Math.max(0, Math.floor(Number(incomingCount) || 0));
    if (!incoming) return;
    const target = requiredQuestionsForLesson();
    const activeCount = state.mockQuestions.filter((item) => Boolean(item?.isActive)).length;
    if (activeCount + incoming > target) {
      throw new Error(
        `Question limit exceeded. Target is ${target}, existing active questions are ${activeCount}, incoming ${incoming}.`
      );
    }
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
    renderQuestionSectionControls();
    updateQuestionSectionSummary();
    renderLessonSections();
    const filteredQuestions = visibleMockQuestions();
    if (!state.mockQuestions.length) {
      lessonQuestionsTableBody.innerHTML = "<tr><td colspan='10'>No questions yet.</td></tr>";
      updateLessonQuestionCountWarning();
      return;
    }
    if (!filteredQuestions.length) {
      const activeCategory = activeQuestionCategoryFilter();
      const activeSection = activeQuestionSectionFilter();
      const categoryLabel = activeCategory
        ? SECTION_TYPE_LABELS[activeCategory] || activeCategory
        : "All Categories";
      const sectionLabel = activeSection || "All Sections";
      lessonQuestionsTableBody.innerHTML =
        `<tr><td colspan='10'>No questions found for Category "${escapeHtml(
          categoryLabel
        )}" and Sub-category "${escapeHtml(sectionLabel)}". Select "All Categories" and "All Sections" to review all questions.</td></tr>`;
      updateLessonQuestionCountWarning();
      return;
    }
    lessonQuestionsTableBody.innerHTML = filteredQuestions
      .map(
        (question) => `
      <tr>
        <td>${Number(question.displayOrder || 0) || "-"}</td>
        <td>${escapeHtml(question.questionText || "-")}</td>
        <td>${escapeHtml(question.questionTextAlt || "-")}</td>
        <td>${escapeHtml(question.optionA || "-")}</td>
        <td>${escapeHtml(question.optionB || "-")}</td>
        <td>${escapeHtml(question.optionC || "-")}</td>
        <td>${escapeHtml(question.optionD || "-")}</td>
        <td>${escapeHtml(normalizeQuestionSectionLabel(question.sectionLabel) || "-")}</td>
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
    testsBuilderTabButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const isQuestionBankButton = button.getAttribute("data-tests-builder-tab") === "question-bank";
      button.disabled = isQuestionBankButton && !shouldShow;
      button.title =
        isQuestionBankButton && !shouldShow
          ? "Create or select a test first."
          : "";
    });
    if (!shouldShow && state.testsBuilderTab === "question-bank") {
      setTestsBuilderTab("transcript");
    }
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
    if (lessonSaveQuestionsWithTestBtn instanceof HTMLButtonElement) {
      const canSave = shouldShow && Boolean(state.selectedMockTestId);
      lessonSaveQuestionsWithTestBtn.disabled = !canSave;
      lessonSaveQuestionsWithTestBtn.title = canSave
        ? "Persist current question set with selected test and chapter."
        : "Select chapter and test first.";
    }
    if (lessonSectionSaveBtn instanceof HTMLButtonElement) {
      const canSaveSection = shouldShow && Boolean(state.selectedMockTestId);
      lessonSectionSaveBtn.disabled = !canSaveSection;
      lessonSectionSaveBtn.title = canSaveSection
        ? "Save or update section for selected test."
        : "Create or select a test first.";
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

  const normalizeCsvRows = (rows, options = {}) => {
    const { defaultSectionLabel = "", sectionLookup = new Map() } = options;
    if (!rows.length) {
      throw new Error("CSV file is empty.");
    }

    const normalizeHeaderKey = (value) =>
      String(value || "")
        .toLowerCase()
        .replaceAll(" ", "")
        .replaceAll("_", "")
        .trim();
    const findHeaderIndex = (headers, aliases) =>
      aliases.map((alias) => headers.indexOf(alias)).find((index) => index >= 0) ?? -1;
    const buildCsvQuestionText = ({
      questionText,
      passageText,
      formulaText,
      equationText,
      sectionType,
      fallbackTranscript,
    }) => {
      const normalizedQuestion = String(questionText || "").trim();
      const normalizedPassage = String(passageText || "").trim();
      const normalizedFormula = String(formulaText || "").trim();
      const normalizedEquation = String(equationText || "").trim();
      return structuredQuestionTextFromParts({
        sectionType,
        questionText: normalizedQuestion,
        passageText: normalizedPassage,
        formulaText: normalizedFormula,
        equationText: normalizedEquation,
        fallbackTranscript,
      });
    };
    const header = rows[0].map((cell) => normalizeHeaderKey(cell));
    const headerQuestionIndex = findHeaderIndex(header, ["questiontext", "question", "prompt"]);
    const looksLikeHeader =
      headerQuestionIndex >= 0 &&
      header.includes("optiona") &&
      header.includes("optionb") &&
      header.includes("optionc") &&
      header.includes("optiond") &&
      header.includes("correctoption");
    const headerMap = looksLikeHeader
      ? {
          questionText: headerQuestionIndex,
          optionA: header.indexOf("optiona"),
          optionB: header.indexOf("optionb"),
          optionC: header.indexOf("optionc"),
          optionD: header.indexOf("optiond"),
          correctOption: header.indexOf("correctoption"),
          explanation: header.indexOf("explanation"),
          isActive: header.indexOf("isactive"),
          passage: findHeaderIndex(header, ["passage", "paragraph", "comprehension", "context"]),
          formula: findHeaderIndex(header, ["formula", "mathformula", "math"]),
          equation: findHeaderIndex(header, ["equation", "scienceequation", "science"]),
          sectionLabel: Math.max(
            header.indexOf("sectionlabel"),
            header.indexOf("section"),
            header.indexOf("questionsection")
          ),
        }
      : null;

    const dataRows = looksLikeHeader ? rows.slice(1) : rows;
    if (!dataRows.length) {
      throw new Error("CSV has header only. Add at least one question row.");
    }

    return dataRows.map((row, index) => {
      if (row.length < 6) {
        throw new Error(`CSV row ${index + 1} is invalid. Minimum 6 columns required.`);
      }

      const readByIndex = (explicitIndex, fallbackIndex) => {
        const indexToRead = Number.isFinite(explicitIndex) && explicitIndex >= 0 ? explicitIndex : fallbackIndex;
        return (row[indexToRead] || "").trim();
      };

      const rawQuestionText = readByIndex(headerMap?.questionText, 0);
      const optionA = readByIndex(headerMap?.optionA, 1);
      const optionB = readByIndex(headerMap?.optionB, 2);
      const optionC = readByIndex(headerMap?.optionC, 3);
      const optionD = readByIndex(headerMap?.optionD, 4);
      const correctOption = readByIndex(headerMap?.correctOption, 5).toUpperCase();
      const explanation = readByIndex(headerMap?.explanation, 6);
      const isActiveRaw = readByIndex(headerMap?.isActive, 7).toLowerCase();
      const passageText = readByIndex(headerMap?.passage, -1);
      const formulaText = readByIndex(headerMap?.formula, -1);
      const equationText = readByIndex(headerMap?.equation, -1);
      const sectionLabelRaw = readByIndex(headerMap?.sectionLabel, 8);
      const sectionLabel =
        normalizeQuestionSectionLabel(sectionLabelRaw) ||
        normalizeQuestionSectionLabel(defaultSectionLabel) ||
        DEFAULT_QUESTION_SECTIONS[0];
      const sectionMeta = sectionLookup.get(sectionLabel) || null;
      const sectionType = normalizeSectionType(
        sectionMeta?.sectionType || SECTION_TYPE_FROM_LABEL[sectionLabel]
      );
      const questionText = buildCsvQuestionText({
        questionText: rawQuestionText,
        passageText,
        formulaText,
        equationText,
        sectionType,
        fallbackTranscript: sectionMeta?.transcriptText || "",
      });

      if (!rawQuestionText || !optionA || !optionB || !optionC || !optionD) {
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
        sectionLabel,
        isActive,
      };
    });
  };

  const mergeBilingualQuestionRows = (leftRows, rightRows, sourceLabel = "Import") => {
    if (leftRows.length !== rightRows.length) {
      throw new Error(`${sourceLabel} left and right question counts must match in bilingual mode.`);
    }
    return leftRows.map((leftRow, index) => {
      const rightRow = rightRows[index] || {};
      const hasAnyRightContent =
        Boolean(String(rightRow.questionText || "").trim()) ||
        Boolean(String(rightRow.optionA || "").trim()) ||
        Boolean(String(rightRow.optionB || "").trim()) ||
        Boolean(String(rightRow.optionC || "").trim()) ||
        Boolean(String(rightRow.optionD || "").trim()) ||
        Boolean(String(rightRow.explanation || "").trim());
      if (!hasAnyRightContent) {
        return {
          ...leftRow,
        };
      }
      const rightCorrect = String(rightRow.correctOption || leftRow.correctOption || "").toUpperCase();
      if (rightCorrect && rightCorrect !== leftRow.correctOption) {
        throw new Error(`${sourceLabel} row ${index + 1} has different correct options in left and right files.`);
      }
      if (
        !String(rightRow.questionText || "").trim() ||
        !String(rightRow.optionA || "").trim() ||
        !String(rightRow.optionB || "").trim() ||
        !String(rightRow.optionC || "").trim() ||
        !String(rightRow.optionD || "").trim()
      ) {
        throw new Error(`${sourceLabel} row ${index + 1} has partial right-language content.`);
      }
      return {
        ...leftRow,
        questionTextAlt: rightRow.questionText,
        optionAAlt: rightRow.optionA,
        optionBAlt: rightRow.optionB,
        optionCAlt: rightRow.optionC,
        optionDAlt: rightRow.optionD,
        explanationAlt: rightRow.explanation || undefined,
      };
    });
  };

  const toCsvCell = (value) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes('"') || text.includes("\n") || text.includes("\r")) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  };
  const downloadCsvRowsAsFile = (rows, filename) => {
    const csvContent = `${rows
      .map((row) => row.map((cell) => toCsvCell(cell)).join(","))
      .join("\n")}\n`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const slugifyFilePart = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const questionHasAnyRightLanguageContent = (question) =>
    Boolean(
      String(question?.questionTextAlt || "").trim() ||
        String(question?.optionAAlt || "").trim() ||
        String(question?.optionBAlt || "").trim() ||
        String(question?.optionCAlt || "").trim() ||
        String(question?.optionDAlt || "").trim() ||
        String(question?.explanationAlt || "").trim()
    );
  const questionHasCompleteRightLanguageContent = (question) =>
    Boolean(
      String(question?.questionTextAlt || "").trim() &&
        String(question?.optionAAlt || "").trim() &&
        String(question?.optionBAlt || "").trim() &&
        String(question?.optionCAlt || "").trim() &&
        String(question?.optionDAlt || "").trim()
    );
  const buildCsvRowFromQuestion = (question, useAltLanguage = false) => {
    const pick = (leftValue, rightValue) => {
      if (!useAltLanguage) return String(leftValue || "").trim();
      return String(rightValue || "").trim();
    };
    return [
      pick(question?.questionText, question?.questionTextAlt),
      pick(question?.optionA, question?.optionAAlt),
      pick(question?.optionB, question?.optionBAlt),
      pick(question?.optionC, question?.optionCAlt),
      pick(question?.optionD, question?.optionDAlt),
      String(question?.correctOption || "").trim().toUpperCase(),
      pick(question?.explanation, question?.explanationAlt),
      question?.isActive === false ? "FALSE" : "TRUE",
      normalizeQuestionSectionLabel(question?.sectionLabel) || DEFAULT_QUESTION_SECTIONS[0],
    ];
  };
  const downloadFilteredQuestionReviewCsv = () => {
    const filteredQuestions = [...visibleMockQuestions()].sort((left, right) => {
      const leftOrder = Number(left?.displayOrder || 0);
      const rightOrder = Number(right?.displayOrder || 0);
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left?.id || "").localeCompare(String(right?.id || ""));
    });
    if (!filteredQuestions.length) {
      throw new Error("No questions available for the selected category/sub-category filters.");
    }

    const header = [
      "questionText",
      "optionA",
      "optionB",
      "optionC",
      "optionD",
      "correctOption",
      "explanation",
      "isActive",
      "sectionLabel",
    ];
    const categoryFilter = activeQuestionCategoryFilter();
    const sectionFilter = activeQuestionSectionFilter();
    const categoryPart = categoryFilter ? SECTION_TYPE_LABELS[categoryFilter] || categoryFilter : "all-categories";
    const sectionPart = sectionFilter || "all-sections";
    const fileSuffix = [slugifyFilePart(categoryPart), slugifyFilePart(sectionPart)].filter(Boolean).join("-");
    const leftRows = [header, ...filteredQuestions.map((question) => buildCsvRowFromQuestion(question, false))];
    downloadCsvRowsAsFile(leftRows, `mock-test-questions-${fileSuffix || "all"}-left.csv`);

    const hasAnyRightContent = filteredQuestions.some((question) => questionHasAnyRightLanguageContent(question));
    const hasCompleteRightContent =
      hasAnyRightContent &&
      filteredQuestions.every((question) => questionHasCompleteRightLanguageContent(question));
    if (hasCompleteRightContent) {
      const rightRows = [header, ...filteredQuestions.map((question) => buildCsvRowFromQuestion(question, true))];
      downloadCsvRowsAsFile(rightRows, `mock-test-questions-${fileSuffix || "all"}-right.csv`);
      setMessage(
        `Downloaded filtered CSV for ${filteredQuestions.length} questions (left and right language files).`,
        "success"
      );
      return;
    }
    if (hasAnyRightContent) {
      setMessage(
        `Downloaded filtered CSV for ${filteredQuestions.length} questions (left file). Right-language data is partial, so right CSV was not generated.`,
        "success"
      );
      return;
    }
    setMessage(`Downloaded filtered CSV for ${filteredQuestions.length} questions.`, "success");
  };

  const downloadLessonSectionCsvSample = () => {
    const formatKey = getCsvTemplateFormat();
    const formatDefaultSection = CSV_TEMPLATE_DEFAULT_SECTION[formatKey] || DEFAULT_QUESTION_SECTIONS[0];
    const selectedSection =
      normalizeQuestionSectionLabel(lessonBulkImportCsvSectionInput?.value) ||
      normalizeQuestionSectionLabel(formatDefaultSection) ||
      DEFAULT_QUESTION_SECTIONS[0];

    let rows;
    if (formatKey === "comprehension") {
      rows = [
        [
          "passage",
          "questionText",
          "optionA",
          "optionB",
          "optionC",
          "optionD",
          "correctOption",
          "explanation",
          "isActive",
          "sectionLabel",
        ],
        [
          "Children learn language by listening, repetition, and meaningful interaction in class and home.",
          "Which factor mostly improves comprehension in young learners?",
          "Rote memorization only",
          "Context-rich interaction",
          "Silent reading only",
          "Random worksheets",
          "B",
          "Meaningful context supports understanding.",
          "TRUE",
          selectedSection,
        ],
      ];
    } else if (formatKey === "math") {
      rows = [
        [
          "formula",
          "questionText",
          "optionA",
          "optionB",
          "optionC",
          "optionD",
          "correctOption",
          "explanation",
          "isActive",
          "sectionLabel",
        ],
        [
          "a^2 + b^2 = ?",
          "For a right triangle, which expression is correct?",
          "c^2",
          "2ab",
          "a + b",
          "a - b",
          "A",
          "Pythagorean relation in right triangle.",
          "TRUE",
          selectedSection,
        ],
      ];
    } else if (formatKey === "science") {
      rows = [
        [
          "equation",
          "questionText",
          "optionA",
          "optionB",
          "optionC",
          "optionD",
          "correctOption",
          "explanation",
          "isActive",
          "sectionLabel",
        ],
        [
          "6CO2 + 6H2O -> C6H12O6 + 6O2",
          "This equation represents which process?",
          "Respiration",
          "Photosynthesis",
          "Fermentation",
          "Combustion",
          "B",
          "Plants form glucose in photosynthesis.",
          "TRUE",
          selectedSection,
        ],
      ];
    } else {
      rows = [
        [
          "questionText",
          "optionA",
          "optionB",
          "optionC",
          "optionD",
          "correctOption",
          "explanation",
          "isActive",
          "sectionLabel",
        ],
        [
          "Sample question 1",
          "Option A",
          "Option B",
          "Option C",
          "Option D",
          "B",
          "Sample explanation 1",
          "TRUE",
          selectedSection,
        ],
        [
          "Sample question 2",
          "Option A",
          "Option B",
          "Option C",
          "Option D",
          "A",
          "Sample explanation 2",
          "TRUE",
          selectedSection,
        ],
      ];
    }
    const fileSuffix = String(formatKey || "general").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadCsvRowsAsFile(rows, `mock-test-import-template-${fileSuffix || "general"}.csv`);
  };

  const setMockContextLabels = () => {
    const hasSelectedMockLesson = Boolean(
      state.selectedMockLessonId || mockLinkLessonIdInput?.value?.trim()
    );
    if (btnPlaySelectedLessonAudio instanceof HTMLButtonElement) {
      btnPlaySelectedLessonAudio.disabled = !hasSelectedMockLesson;
      btnPlaySelectedLessonAudio.title = hasSelectedMockLesson
        ? "Open selected chapter audio preview."
        : "Select a chapter first.";
    }
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
    syncMockSubjectOptionsByExam();
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
    toggleBilingualQuestionInputs();
  };

  const renderMockTestsAdmin = () => {
    if (!lessonMockTestsTableBody) return;
    const testsToRender = state.testsMode === "attach" ? getAttachFilteredTests() : state.mockTestsAdmin;
    if (!testsToRender.length) {
      lessonMockTestsTableBody.innerHTML =
        '<tr><td colspan="11" style="text-align:center;color:#666;">No tests found.</td></tr>';
      return;
    }

    lessonMockTestsTableBody.innerHTML = testsToRender
      .map((test) => {
        const rowSelected = state.selectedMockTestId === test.id || lessonMockTestIdInput?.value === test.id;
        const publishLabel = test.isActive ? "Published" : "Publish";
        const isLinkedToToc =
          Boolean(linkedLessonForTest(test.id)) ||
          Boolean(linkedLessonInLoadedLessons(test.id)) ||
          state.trackingLessons.some(
            (lesson) => String(lesson?.assessment?.id || "").trim() === String(test.id || "").trim()
          );
        return `
          <tr class="${rowSelected ? "row-selected" : ""}">
            <td>${escapeHtml(test.title || "-")}</td>
            <td>${escapeHtml(EXAM_LABELS[test.examType] || test.examType || "-")}</td>
            <td>${escapeHtml(SUBJECT_LABELS[test.subject] || test.subject || "-")}</td>
            <td>${escapeHtml(test.streamChoice ? STREAM_LABELS[test.streamChoice] || test.streamChoice : "")}</td>
            <td>${escapeHtml(test.languageMode ? LANGUAGE_LABELS[test.languageMode] || test.languageMode : "-")}</td>
            <td>${escapeHtml(ACCESS_CODE_LABELS[test.accessCode] || test.accessCode || "DEMO")}</td>
            <td>${escapeHtml(MOCK_CATEGORY_LABELS[test.mockCategory] || test.mockCategory || "Premium")}</td>
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
                  data-add-test-toc="${test.id}"
                  ${isLinkedToToc ? 'disabled title="This test is already added in TOC."' : 'title="Add this test as a chapter entry in TOC"'}
                >${isLinkedToToc ? "TOC Added" : "Add TOC"}</button>
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
    const hasCourse = Boolean(lessonCourseIdInput?.value?.trim() || state.selectedCourseId);
    const hasSubject = Boolean(lessonChapterIdInput?.value?.trim() || state.selectedChapterId);
    const canCreate = hasCourse && hasSubject;
    if (btnCreateNewLesson instanceof HTMLButtonElement) {
      btnCreateNewLesson.disabled = !canCreate;
      btnCreateNewLesson.title = canCreate ? "Start creating a new lesson." : "Select course and subject first.";
    }
    if (lessonInlineSaveBtn instanceof HTMLButtonElement) {
      lessonInlineSaveBtn.disabled = !canCreate;
      lessonInlineSaveBtn.title = canCreate ? "Save chapter in selected subject." : "Select course and subject first.";
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
    if (chapterSubSubjectInput instanceof HTMLSelectElement) {
      chapterSubSubjectInput.value = "";
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
    setTestsBuilderTab("transcript");
    setQuestionBankMode("sections");
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
      lessonMockTestAccessCodeInput.value = "";
    }
    if (lessonMockTestCategoryInput) {
      lessonMockTestCategoryInput.value = "PREMIUM";
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
    toggleBilingualQuestionInputs();
    updateQuestionLanguageGuide();
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
        '<tr><td colspan="6" style="text-align:center;color:#666;">Select a course to view subjects.</td></tr>';
      return;
    }
    if (!state.chapters.length) {
      chaptersTableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;color:#666;">No subjects yet.</td></tr>';
      return;
    }

    chaptersTableBody.innerHTML = state.chapters
      .map(
        (chapter) => `
          <tr class="${state.selectedChapterId === chapter.id ? "row-selected" : ""}">
            <td>${chapter.orderIndex}</td>
            <td>${escapeHtml(chapter.title)}</td>
            <td>${escapeHtml(CHAPTER_SUB_SUBJECT_LABELS[String(chapter.subSubject || "").trim()] || "-")}</td>
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

  const formatAssessmentDisplayTitle = (value) =>
    String(value || "")
      .replace(/^\s*\d+\s*[\.\-\)]\s*/, "")
      .trim();

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
    const totalLessons = state.lessons.length;
    lessonsTableBody.innerHTML = state.lessons
      .map(
        (lesson) => `
          <tr class="${selectedLessonId === lesson.id ? "row-selected" : ""}">
            <td>${lesson.orderIndex}</td>
            <td>${escapeHtml(lesson.title)}</td>
            <td>${lesson.durationSec || 0}s</td>
            <td>${escapeHtml(formatAssessmentDisplayTitle(lesson.assessmentTest?.title) || "-")}</td>
            <td>${escapeHtml(formatDateTime(lesson.updatedAt))}</td>
            <td>
              <div class="table-actions">
                <button
                  class="table-btn"
                  type="button"
                  data-move-up-lesson="${lesson.id}"
                  ${lesson.orderIndex <= 1 ? "disabled" : ""}
                  title="Shift this lesson up"
                >
                  Up
                </button>
                <button
                  class="table-btn"
                  type="button"
                  data-move-down-lesson="${lesson.id}"
                  ${lesson.orderIndex >= totalLessons ? "disabled" : ""}
                  title="Shift this lesson down"
                >
                  Down
                </button>
                <input
                  type="number"
                  min="1"
                  max="${totalLessons}"
                  value="${lesson.orderIndex}"
                  data-move-to-order-input="${lesson.id}"
                  style="width:72px"
                  title="Move to this order number"
                />
                <button
                  class="table-btn"
                  type="button"
                  data-move-to-lesson="${lesson.id}"
                  title="Move lesson to entered number"
                >
                  OK
                </button>
                <button class="table-btn edit" type="button" data-edit-lesson="${lesson.id}">Edit</button>
                <button class="table-btn delete" type="button" data-delete-lesson="${lesson.id}">Delete</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  };

  const reorderLessonInChapter = async (lessonId, targetOrderIndex) => {
    const safeLessonId = String(lessonId || "").trim();
    const nextOrderIndex = Math.floor(Number(targetOrderIndex));
    if (!safeLessonId) return;
    if (!Number.isFinite(nextOrderIndex) || nextOrderIndex < 1) {
      throw new Error("Enter a valid order number (1 or more).");
    }
    if (!state.selectedChapterId) {
      throw new Error("Select a subject first.");
    }

    const response = await apiRequest({
      path: `/admin/lesson-items/${encodeURIComponent(safeLessonId)}/reorder`,
      method: "POST",
      token,
      body: {
        targetOrderIndex: nextOrderIndex,
      },
    });

    await Promise.all([
      loadLessons(state.selectedChapterId),
      state.selectedCourseId ? loadChapters(state.selectedCourseId) : Promise.resolve(),
      loadLessonTracking(),
    ]);
    return Number(response?.movedToOrderIndex || nextOrderIndex);
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
      state.mockTestSections = [];
      resetLessonQuestionForm();
      resetLessonSectionForm();
      renderLessonQuestions();
      renderLessonSections();
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
    resetQuestionSectionFilter();
    if (lessonMockTestIdInput instanceof HTMLInputElement) {
      lessonMockTestIdInput.value = state.selectedMockTestId;
    }
    state.hasPendingTestChanges = false;
    resetLessonQuestionForm();
    syncQuestionTargetCountForSelectedTest({ force: forceQuestionCount });
    try {
      await Promise.all([loadMockQuestions(state.selectedMockTestId), loadMockTestSections(state.selectedMockTestId)]);
      resetLessonSectionForm();
    } catch (error) {
      state.selectedMockTestId = "";
      state.mockQuestions = [];
      state.mockTestSections = [];
      renderLessonQuestions();
      renderLessonSections();
      if (!silent) {
        setMessage(error.message || "Unable to load questions for selected test.", "error");
      }
    }
    renderAttachExistingTestOptions();
    renderMockTestsAdmin();
    updateLessonSelectedTestHint();
    setLessonQuestionBankVisibility();
    if (state.selectedMockTestId && lessonSectionLabelInput instanceof HTMLInputElement) {
      lessonSectionLabelInput.scrollIntoView({ behavior: "smooth", block: "center" });
      lessonSectionLabelInput.focus();
    }
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
      state.mockTestSections = [];
      resetLessonQuestionForm();
      resetLessonSectionForm();
      renderLessonQuestions();
      renderLessonSections();
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
      state.mockTestSections = [];
      resetLessonQuestionForm();
      resetLessonSectionForm();
      renderLessonQuestions();
      renderLessonSections();
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
      state.mockTestSections = [];
      resetLessonQuestionForm();
      resetLessonSectionForm();
      renderLessonQuestions();
      renderLessonSections();
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
      state.mockTestSections = [];
      resetLessonQuestionForm();
      resetLessonSectionForm();
      renderLessonQuestions();
      renderLessonSections();
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
      state.mockTestSections = [];
      resetLessonQuestionForm();
      resetLessonSectionForm();
      renderLessonQuestions();
      renderLessonSections();
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
    await ensureSelectedMockTestTopFieldsSaved();
    const sectionLabel =
      normalizeQuestionSectionLabel(lessonQuestionSectionInput?.value) || DEFAULT_QUESTION_SECTIONS[0];
    const sectionMeta = getSectionMetaByLabel(sectionLabel);
    const sectionType = normalizeSectionType(sectionMeta?.sectionType || SECTION_TYPE_FROM_LABEL[sectionLabel]);
    const plainQuestionText = lessonQuestionTextInput?.value?.trim() || "";
    const plainQuestionTextAlt = lessonQuestionTextAltInput?.value?.trim() || "";
    const builtQuestionText = structuredQuestionTextFromParts({
      sectionType,
      questionText: plainQuestionText,
      passageText: lessonQuestionPassageTextInput?.value?.trim() || "",
      formulaText: lessonQuestionFormulaTextInput?.value?.trim() || "",
      equationText: lessonQuestionEquationTextInput?.value?.trim() || "",
      fallbackTranscript: sectionMeta?.transcriptText || "",
    });
    const builtQuestionTextAlt = isBilingualQuestionMode() ? plainQuestionTextAlt : "";
    const payload = {
      questionText: builtQuestionText,
      questionTextAlt: builtQuestionTextAlt || undefined,
      optionA: lessonOptionAInput?.value?.trim() || "",
      optionAAlt: lessonOptionAAltInput?.value?.trim() || undefined,
      optionB: lessonOptionBInput?.value?.trim() || "",
      optionBAlt: lessonOptionBAltInput?.value?.trim() || undefined,
      optionC: lessonOptionCInput?.value?.trim() || "",
      optionCAlt: lessonOptionCAltInput?.value?.trim() || undefined,
      optionD: lessonOptionDInput?.value?.trim() || "",
      optionDAlt: lessonOptionDAltInput?.value?.trim() || undefined,
      sectionLabel,
      displayOrder: Number(lessonQuestionDisplayOrderInput?.value || orderedMockQuestions().length + 1),
      correctOption: lessonCorrectOptionInput?.value || "A",
      explanation: lessonQuestionExplanationInput?.value?.trim() || undefined,
      explanationAlt: lessonQuestionExplanationAltInput?.value?.trim() || undefined,
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
    if (isBilingualQuestionMode() && hasAnyAltQuestionPayload(payload) && !hasCompleteAltQuestionPayload(payload)) {
      throw new Error("If you add right language content, fill all right-side question and option fields.");
    }
    ensureQuestionTargetCapacity(1);

    await apiRequest({
      path: `/admin/mock-tests/${encodeURIComponent(state.selectedMockTestId)}/questions`,
      method: "POST",
      token,
      body: payload,
    });
  };

  const handleLessonBulkImport = async () => {
    if (!state.selectedMockTestId) throw new Error("Create or attach a test before bulk import.");
    await ensureSelectedMockTestTopFieldsSaved();
    const text = lessonBulkImportTextInput?.value?.trim() || "";
    if (!text) throw new Error("Paste lines in format: question|A|B|C|D|correct|explanation|section.");
    const defaultSection =
      normalizeQuestionSectionLabel(lessonBulkImportSectionInput?.value) || DEFAULT_QUESTION_SECTIONS[0];
    const isBilingual = isBilingualQuestionMode();
    const rightText = lessonBulkImportTextAltInput?.value?.trim() || "";

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const rightLines = rightText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (isBilingual && rightLines.length && lines.length !== rightLines.length) {
      throw new Error("Left and right bulk import line counts must match.");
    }
    ensureQuestionTargetCapacity(lines.length);
    for (const [index, line] of lines.entries()) {
      const parts = line.split("|").map((item) => item.trim());
      if (parts.length < 6) {
        throw new Error(`Invalid line: ${line}`);
      }
      const [questionText, optionA, optionB, optionC, optionD, correctOption, explanation, sectionLabelRaw] = parts;
      const normalized = correctOption.toUpperCase();
      if (!["A", "B", "C", "D"].includes(normalized)) {
        throw new Error(`Invalid correct option in line: ${line}`);
      }
      const sectionLabel =
        normalizeQuestionSectionLabel(sectionLabelRaw) ||
        normalizeQuestionSectionLabel(defaultSection) ||
        DEFAULT_QUESTION_SECTIONS[0];
      const rightLine = isBilingual ? String(rightLines[index] || "").trim() : "";
      const rightParts = rightLine ? rightLine.split("|").map((item) => item.trim()) : [];
      if (isBilingual && rightLine && rightParts.length < 6) {
        throw new Error(`Invalid right-language line: ${rightLine}`);
      }
      const [
        questionTextAlt,
        optionAAlt,
        optionBAlt,
        optionCAlt,
        optionDAlt,
        rightCorrectOption,
        explanationAlt,
      ] = rightParts;
      if (isBilingual && rightLine && String(rightCorrectOption || "").toUpperCase() !== normalized) {
        throw new Error(`Correct option must match in both languages for line ${index + 1}.`);
      }
      if (
        isBilingual &&
        rightLine &&
        (
          !questionTextAlt ||
          !optionAAlt ||
          !optionBAlt ||
          !optionCAlt ||
          !optionDAlt
        )
      ) {
        throw new Error(`Line ${index + 1} has partial right-language content.`);
      }
      await apiRequest({
        path: `/admin/mock-tests/${encodeURIComponent(state.selectedMockTestId)}/questions`,
        method: "POST",
        token,
        body: {
          questionText,
          questionTextAlt: isBilingual && rightLine ? questionTextAlt : undefined,
          optionA,
          optionAAlt: isBilingual && rightLine ? optionAAlt : undefined,
          optionB,
          optionBAlt: isBilingual && rightLine ? optionBAlt : undefined,
          optionC,
          optionCAlt: isBilingual && rightLine ? optionCAlt : undefined,
          optionD,
          optionDAlt: isBilingual && rightLine ? optionDAlt : undefined,
          correctOption: normalized,
          explanation,
          explanationAlt: isBilingual && rightLine ? explanationAlt : undefined,
          sectionLabel,
          isActive: true,
        },
      });
    }
  };

  const handleLessonCsvBulkImport = async () => {
    if (!state.selectedMockTestId) throw new Error("Create or attach a test before CSV upload.");
    await ensureSelectedMockTestTopFieldsSaved();
    const file = lessonBulkImportCsvFileInput?.files?.[0];
    if (!file) {
      throw new Error("Please choose a CSV file.");
    }
    const isBilingual = isBilingualQuestionMode();
    const rightFile = lessonBulkImportCsvFileAltInput?.files?.[0];
    const defaultSection =
      normalizeQuestionSectionLabel(lessonBulkImportCsvSectionInput?.value) || DEFAULT_QUESTION_SECTIONS[0];

    const csvText = await file.text();
    const parsedRows = parseCsvText(csvText);
    const sectionLookup = new Map(
      state.mockTestSections.map((section) => [normalizeQuestionSectionLabel(section.sectionLabel), section])
    );
    const leftRows = normalizeCsvRows(parsedRows, {
      defaultSectionLabel: defaultSection,
      sectionLookup,
    });
    let rows = leftRows;
    if (isBilingual && rightFile) {
      const rightCsvText = await rightFile.text();
      const rightParsedRows = parseCsvText(rightCsvText);
      const rightRows = normalizeCsvRows(rightParsedRows, {
        defaultSectionLabel: defaultSection,
        sectionLookup,
      });
      rows = mergeBilingualQuestionRows(leftRows, rightRows, "CSV upload");
    }
    const replaceExisting = Boolean(lessonBulkImportReplaceExistingInput?.checked);
    if (replaceExisting) {
      const target = requiredQuestionsForLesson();
      if (rows.length > target) {
        throw new Error(`CSV rows exceed target limit. Target ${target}, CSV rows ${rows.length}.`);
      }
    } else {
      ensureQuestionTargetCapacity(rows.length);
    }
    const response = await apiRequest({
      path: `/admin/mock-tests/${encodeURIComponent(state.selectedMockTestId)}/questions/import-csv`,
      method: "POST",
      token,
      body: {
        rows,
        replaceExisting,
      },
    });
    return response?.result || { createdCount: rows.length, totalRows: rows.length };
  };

  const buildCurrentMockTestTopFieldPayload = () => {
    syncMockTaxonomyFromScope({ force: !state.selectedMockTestId });
    return {
      title: lessonMockTestTitleInput?.value?.trim() || "",
      examType: lessonMockTestExamTypeInput?.value || "PSTET_1",
      subject: normalizeMockSubjectValue(lessonMockTestSubjectInput?.value || "PUNJABI"),
      streamChoice: lessonMockTestStreamChoiceInput?.value || null,
      languageMode: lessonMockTestLanguageModeInput?.value || null,
      accessCode: lessonMockTestAccessCodeInput?.value || "",
      mockCategory: lessonMockTestCategoryInput?.value || "PREMIUM",
      isActive: Boolean(lessonMockTestIsActiveInput?.checked),
    };
  };

  const hasMockTestTopFieldDrift = () => {
    const selected = selectedMockTest();
    if (!selected || !state.selectedMockTestId) return false;
    const current = buildCurrentMockTestTopFieldPayload();
    return (
      String(selected.title || "").trim() !== current.title ||
      String(selected.examType || "PSTET_1") !== current.examType ||
      normalizeMockSubjectValue(selected.subject || "") !== current.subject ||
      String(selected.streamChoice || "") !== String(current.streamChoice || "") ||
      String(selected.languageMode || "") !== String(current.languageMode || "") ||
      String(selected.accessCode || "") !== String(current.accessCode || "") ||
      String(selected.mockCategory || "PREMIUM") !== String(current.mockCategory || "PREMIUM") ||
      Boolean(selected.isActive) !== Boolean(current.isActive)
    );
  };

  const ensureSelectedMockTestTopFieldsSaved = async () => {
    if (!state.selectedMockTestId) return;
    if (!hasMockTestTopFieldDrift()) return;
    await saveAndAttachLessonMockTestFromTopFields({ resetAfterSave: false });
  };

  const saveAndAttachLessonMockTestFromTopFields = async (options = {}) => {
    const { resetAfterSave = false } = options;
    const selectedLessonId = state.selectedMockLessonId || mockLinkLessonIdInput?.value?.trim() || "";
    if (!selectedLessonId) {
      throw new Error("Select course, subject, and chapter before creating a test.");
    }

    const payload = buildCurrentMockTestTopFieldPayload();

    if (!payload.title) {
      throw new Error("Test title is required.");
    }
    if (!payload.accessCode) {
      throw new Error("Access code is required.");
    }
    if (NON_LANGUAGE_SUBJECTS.has(payload.subject) && !payload.languageMode) {
      throw new Error("Language mode is required for this subject.");
    }

    const existingTestId =
      String(state.selectedMockTestId || "").trim() ||
      lessonMockTestIdInput?.value?.trim() ||
      "";
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
    if (lessonMockTestIdInput instanceof HTMLInputElement) {
      lessonMockTestIdInput.value = savedTestId;
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
    setTestsBuilderTab("question-bank");
    setQuestionBankMode("sections");
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

    if (
      state.selectedMockCourseId &&
      state.selectedMockCourseId === state.selectedCourseId &&
      state.selectedMockChapterId &&
      state.selectedMockChapterId === state.selectedChapterId
    ) {
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
      if (tabKey === "chapters") {
        try {
          const selectedCourseId =
            state.selectedCourseId || String(chapterCourseIdInput?.value || "").trim();
          if (selectedCourseId) {
            state.selectedCourseId = selectedCourseId;
            await loadChapters(selectedCourseId);
          }
        } catch (error) {
          setMessage(error.message || "Unable to load subjects.", "error");
        }
      }
      if (tabKey === "lessons") {
        try {
          const selectedChapterId =
            state.selectedChapterId || String(lessonChapterIdInput?.value || "").trim();
          if (selectedChapterId) {
            state.selectedChapterId = selectedChapterId;
            await loadLessons(selectedChapterId);
          }
        } catch (error) {
          setMessage(error.message || "Unable to load chapters.", "error");
        }
      }
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
        subSubject: chapterSubSubjectInput?.value?.trim() || undefined,
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
              subSubject: chapterSubSubjectInput?.value?.trim() || null,
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
      state.mockTestSections = [];
      if (lessonMockTestIdInput instanceof HTMLInputElement) lessonMockTestIdInput.value = "";
      if (lessonMockSubmitBtn instanceof HTMLButtonElement) lessonMockSubmitBtn.textContent = "Publish Test";
      if (lessonMockCancelBtn instanceof HTMLButtonElement) lessonMockCancelBtn.classList.add("hidden");
      resetLessonQuestionForm();
      resetLessonSectionForm();
      renderLessonQuestions();
      renderLessonSections();
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
      state.mockTestSections = [];
      if (lessonMockTestIdInput instanceof HTMLInputElement) lessonMockTestIdInput.value = "";
      if (lessonMockSubmitBtn instanceof HTMLButtonElement) lessonMockSubmitBtn.textContent = "Publish Test";
      if (lessonMockCancelBtn instanceof HTMLButtonElement) lessonMockCancelBtn.classList.add("hidden");
      resetLessonQuestionForm();
      resetLessonSectionForm();
      renderLessonQuestions();
      renderLessonSections();
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

  if (lessonMockTestLanguageModeInput instanceof HTMLSelectElement) {
    lessonMockTestLanguageModeInput.addEventListener("change", () => {
      toggleBilingualQuestionInputs();
    });
  }

  if (lessonQuestionInputModeInput instanceof HTMLSelectElement) {
    lessonQuestionInputModeInput.addEventListener("change", () => {
      setQuestionInputMode(lessonQuestionInputModeInput.value);
      autoTranslateVisibleQuestionFields();
      if (
        activeVoiceSession &&
        activeVoiceSession.context !== "global" &&
        activeVoiceSession.mode !== getQuestionInputMode()
      ) {
        stopActiveVoiceTyping({ notify: false });
      }
    });
  }

  if (lessonQuestionEditInputModeInput instanceof HTMLSelectElement) {
    lessonQuestionEditInputModeInput.addEventListener("change", () => {
      setQuestionInputMode(lessonQuestionEditInputModeInput.value);
      autoTranslateVisibleQuestionFields();
      if (
        activeVoiceSession &&
        activeVoiceSession.context !== "global" &&
        activeVoiceSession.mode !== getQuestionInputMode()
      ) {
        stopActiveVoiceTyping({ notify: false });
      }
    });
  }

  if (lessonGlobalVoiceToggleBtn instanceof HTMLButtonElement) {
    lessonGlobalVoiceToggleBtn.addEventListener("click", () => {
      if (activeVoiceSession?.context === "global") {
        stopActiveVoiceTyping({ notify: true });
        return;
      }
      startVoiceTypingForContext("global", lessonGlobalVoiceToggleBtn);
    });
  }

  if (lessonStickyVoiceToggleBtn instanceof HTMLButtonElement) {
    lessonStickyVoiceToggleBtn.addEventListener("click", () => {
      if (activeVoiceSession?.context === "global") {
        stopActiveVoiceTyping({ notify: true });
        return;
      }
      startVoiceTypingForContext("global", lessonStickyVoiceToggleBtn);
    });
  }

  if (lessonStickyVoiceFocusBtn instanceof HTMLButtonElement) {
    lessonStickyVoiceFocusBtn.addEventListener("click", () => {
      focusVoiceTargetControl("global");
    });
  }

  if (lessonQuestionVoiceToggleBtn instanceof HTMLButtonElement) {
    lessonQuestionVoiceToggleBtn.addEventListener("click", () => {
      if (activeVoiceSession?.button === lessonQuestionVoiceToggleBtn) {
        stopActiveVoiceTyping({ notify: true });
        return;
      }
      startVoiceTypingForContext("create", lessonQuestionVoiceToggleBtn);
    });
  }

  if (lessonQuestionEditVoiceToggleBtn instanceof HTMLButtonElement) {
    lessonQuestionEditVoiceToggleBtn.addEventListener("click", () => {
      if (activeVoiceSession?.button === lessonQuestionEditVoiceToggleBtn) {
        stopActiveVoiceTyping({ notify: true });
        return;
      }
      startVoiceTypingForContext("edit", lessonQuestionEditVoiceToggleBtn);
    });
  }

  if (lessonSectionSkipTranscriptInput instanceof HTMLInputElement) {
    lessonSectionSkipTranscriptInput.addEventListener("change", () => {
      toggleLessonSectionTranscriptState();
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
        if (chapterSubSubjectInput instanceof HTMLSelectElement) {
          chapterSubSubjectInput.value = String(chapter.subSubject || "");
        }
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
        const selectedMockAccessCode = lessonMockTestAccessCodeInput?.value || "";

        if (!selectedMockLessonId) {
          setMessage("Select course, subject, and chapter before creating a test.", "error");
          return;
        }
        if (!selectedMockTitle) {
          setMessage("Test title is required.", "error");
          return;
        }
        if (!selectedMockAccessCode) {
          setMessage("Access code is required.", "error");
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
      let lessonId = lessonIdInput?.value?.trim() || "";
      if (!lessonId && shouldSaveTestWithLesson) {
        lessonId = state.selectedMockLessonId || mockLinkLessonIdInput?.value?.trim() || "";
        if (lessonId && lessonIdInput instanceof HTMLInputElement) {
          lessonIdInput.value = lessonId;
        }
      }
      const editingLesson = lessonId
        ? state.lessons.find((item) => item.id === lessonId) ||
          state.mockLessons.find((item) => item.id === lessonId) ||
          null
        : null;
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

      const fallbackLessonTitle = String(editingLesson?.title || selectedMockLesson()?.title || "").trim();
      const payload = {
        chapterId: selectedChapterId,
        title: lessonTitleInput?.value?.trim() || fallbackLessonTitle,
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

      if (!lessonTitleInput?.value?.trim() && payload.title && lessonTitleInput instanceof HTMLInputElement) {
        lessonTitleInput.value = payload.title;
      }

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
        let csvImportedWithLesson = false;
        let csvImportErrorMessage = "";
        let csvImportResult = null;
        const hasPendingCsvImport =
          shouldSaveTestWithLesson &&
          lessonBulkImportCsvFileInput instanceof HTMLInputElement &&
          Boolean(lessonBulkImportCsvFileInput.files?.length);
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
        if (
          state.selectedMockCourseId &&
          state.selectedMockCourseId === selectedCourseId &&
          state.selectedMockChapterId &&
          state.selectedMockChapterId === selectedChapterId
        ) {
          await loadMockLessons(selectedChapterId);
        }
        await loadLessonTracking();

        if (shouldSaveTestWithLesson) {
          try {
            await saveAndAttachLessonMockTestFromTopFields({ resetAfterSave: false });
            testSavedWithLesson = true;
            setPendingTestChanges(false);
            if (hasPendingCsvImport) {
              try {
                setMessage("Test saved. Uploading CSV questions...");
                csvImportResult = await handleLessonCsvBulkImport();
                csvImportedWithLesson = true;
                if (lessonBulkImportCsvFileInput instanceof HTMLInputElement) {
                  lessonBulkImportCsvFileInput.value = "";
                }
                if (lessonBulkImportCsvFileAltInput instanceof HTMLInputElement) {
                  lessonBulkImportCsvFileAltInput.value = "";
                }
                if (lessonBulkImportReplaceExistingInput instanceof HTMLInputElement) {
                  lessonBulkImportReplaceExistingInput.checked = false;
                }
                await Promise.all([
                  loadMockQuestions(state.selectedMockTestId),
                  loadMockTestsAdmin(),
                  loadAssessments(),
                ]);
              } catch (csvError) {
                csvImportErrorMessage =
                  csvError instanceof Error ? csvError.message : "Unable to import CSV questions.";
              }
            }
          } catch (testError) {
            testSaveErrorMessage =
              testError instanceof Error ? testError.message : "Unable to save and attach test.";
          }
        }

        let finalMessage = testSaveErrorMessage
          ? `${successMessage} But test was not saved: ${testSaveErrorMessage}`
          : csvImportErrorMessage
            ? `${successMessage} Test saved and attached. But CSV import failed: ${csvImportErrorMessage}`
            : csvImportedWithLesson && csvImportResult
              ? `${successMessage} Test saved and attached. CSV import added ${csvImportResult.createdCount}/${csvImportResult.totalRows} questions.`
          : testSavedWithLesson
            ? `${successMessage} Test saved and attached.`
            : successMessage;
        const finalType = testSaveErrorMessage || csvImportErrorMessage ? "error" : "success";
        if (shouldSaveTestWithLesson && finalType === "success" && state.selectedMockTestId) {
          const linkedProducts = await findProductsLinkedToMockTest(state.selectedMockTestId);
          if (!linkedProducts.length) {
            window.location.href = buildProductAttachmentSetupUrl(state.selectedMockTestId);
            return;
          }
          finalMessage = `${finalMessage} Product attachment already exists, so TOC updates will reflect immediately.`;
        }
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

  if (btnPlaySelectedLessonAudio instanceof HTMLButtonElement) {
    btnPlaySelectedLessonAudio.addEventListener("click", async () => {
      const selectedLessonId = state.selectedMockLessonId || mockLinkLessonIdInput?.value?.trim() || "";
      if (!selectedLessonId) {
        setMessage("Select course, subject, and chapter first.", "error");
        return;
      }

      let lesson =
        state.mockLessons.find((item) => item.id === selectedLessonId) ||
        state.lessons.find((item) => item.id === selectedLessonId) ||
        null;

      if (!lesson && state.selectedMockChapterId) {
        try {
          await loadMockLessons(state.selectedMockChapterId);
          lesson =
            state.mockLessons.find((item) => item.id === selectedLessonId) ||
            state.lessons.find((item) => item.id === selectedLessonId) ||
            null;
        } catch (error) {
          setMessage(error.message || "Unable to load selected chapter audio.", "error");
          return;
        }
      }

      if (!lesson) {
        setMessage("Selected chapter was not found. Reload chapter list and try again.", "error");
        return;
      }

      setMessage("Opening chapter audio preview...");
      openLessonPreview(lesson, { productionMode: true });
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
      refreshAttachFilteredViews();
    });
  }

  if (lessonAttachTestSearchInput instanceof HTMLInputElement) {
    lessonAttachTestSearchInput.addEventListener("input", () => {
      refreshAttachFilteredViews();
    });
  }

  if (lessonMockTestTitleInput instanceof HTMLInputElement) {
    lessonMockTestTitleInput.addEventListener("input", () => {
      refreshAttachFilteredViews();
    });
  }

  if (lessonMockTestSubjectInput instanceof HTMLSelectElement) {
    lessonMockTestSubjectInput.addEventListener("change", () => {
      refreshAttachFilteredViews();
    });
  }

  if (lessonMockTestAccessCodeInput instanceof HTMLSelectElement) {
    lessonMockTestAccessCodeInput.addEventListener("change", () => {
      refreshAttachFilteredViews();
    });
  }

  if (lessonMockTestCategoryInput instanceof HTMLSelectElement) {
    lessonMockTestCategoryInput.addEventListener("change", () => {
      refreshAttachFilteredViews();
    });
  }

  if (lessonMockTestLanguageModeInput instanceof HTMLSelectElement) {
    lessonMockTestLanguageModeInput.addEventListener("change", () => {
      refreshAttachFilteredViews();
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

      const addTocBtn = target.closest("[data-add-test-toc]");
      if (addTocBtn instanceof HTMLButtonElement) {
        const testId = addTocBtn.getAttribute("data-add-test-toc") || "";
        if (!testId || addTocBtn.disabled) return;

        addTocBtn.disabled = true;
        try {
          setMessage("Adding test to TOC...");
          const result = await addTestToToc(testId);
          renderMockTestsAdmin();
          setMessage(
            result.created
              ? "Test added to TOC. You can now manage it from this table or from the Create Lesson review flow."
              : "This test is already linked in TOC.",
            "success"
          );
        } catch (error) {
          setMessage(error?.message || "Unable to add test to TOC.", "error");
        } finally {
          addTocBtn.disabled = false;
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
          lessonMockTestAccessCodeInput.value = test.accessCode || "";
        }
        if (lessonMockTestCategoryInput) {
          lessonMockTestCategoryInput.value = test.mockCategory || "PREMIUM";
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

  if (lessonSectionTypeInput instanceof HTMLSelectElement) {
    lessonSectionTypeInput.addEventListener("change", () => {
      const sectionType = normalizeSectionType(lessonSectionTypeInput.value);
      if (lessonSectionLabelInput instanceof HTMLInputElement && !lessonSectionLabelInput.value.trim()) {
        lessonSectionLabelInput.value = SECTION_TYPE_LABELS[sectionType] || "Section";
      }
      updateSectionTypeGuide();
    });
  }

  testsBuilderTabButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener("click", () => {
      if (button.disabled) return;
      setTestsBuilderTab(button.getAttribute("data-tests-builder-tab") || "transcript");
    });
  });

  questionBankModeButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener("click", () => {
      setQuestionBankMode(button.getAttribute("data-question-bank-tab") || "sections");
    });
  });

  if (lessonQuestionAltToggleInput instanceof HTMLInputElement) {
    lessonQuestionAltToggleInput.addEventListener("change", () => {
      toggleBilingualQuestionInputs();
    });
  }

  if (lessonBulkImportUseAltInput instanceof HTMLInputElement) {
    lessonBulkImportUseAltInput.addEventListener("change", () => {
      toggleBilingualQuestionInputs();
    });
  }

  if (lessonBulkImportCsvUseAltInput instanceof HTMLInputElement) {
    lessonBulkImportCsvUseAltInput.addEventListener("change", () => {
      toggleBilingualQuestionInputs();
    });
  }

  if (lessonSectionForm instanceof HTMLFormElement) {
    lessonSectionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        setMessage("Saving section...");
        await saveMockTestSection();
        await loadMockTestSections(state.selectedMockTestId);
        resetLessonSectionForm();
        setMessage("Section saved.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to save section.", "error");
      }
    });
  }

  if (lessonSectionCancelBtn instanceof HTMLButtonElement) {
    lessonSectionCancelBtn.addEventListener("click", () => {
      resetLessonSectionForm();
      setMessage("");
    });
  }

  if (lessonSectionsTableBody instanceof HTMLElement) {
    lessonSectionsTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const editId = target.getAttribute("data-edit-lesson-section");
      if (editId) {
        const section = state.mockTestSections.find((item) => item.id === editId);
        if (section) {
          openLessonSectionForEdit(section);
        }
        return;
      }
      const deleteId = target.getAttribute("data-delete-lesson-section");
      if (!deleteId) return;
      const confirmed = window.confirm("Delete this section?");
      if (!confirmed) return;
      try {
        await apiRequest({
          path: `/admin/mock-test-sections/${encodeURIComponent(deleteId)}`,
          method: "DELETE",
          token,
        });
        await Promise.all([loadMockTestSections(state.selectedMockTestId), loadMockQuestions(state.selectedMockTestId)]);
        setMessage("Section deleted.", "success");
      } catch (error) {
        setMessage(error.message || "Unable to delete section.", "error");
      }
    });
  }

  if (lessonQuestionSectionInput instanceof HTMLSelectElement) {
    lessonQuestionSectionInput.addEventListener("change", () => {
      toggleQuestionStructuredFields();
    });
  }

  [
    lessonOptionAInput,
    lessonOptionBInput,
    lessonOptionCInput,
    lessonOptionDInput,
    lessonOptionAAltInput,
    lessonOptionBAltInput,
    lessonOptionCAltInput,
    lessonOptionDAltInput,
  ].forEach((control) => {
    if (!(control instanceof HTMLInputElement)) return;
    control.addEventListener("input", () => {
      refreshManualCorrectOptionChoices();
    });
  });
  if (lessonCorrectOptionInput instanceof HTMLSelectElement) {
    lessonCorrectOptionInput.addEventListener("change", () => {
      refreshManualCorrectOptionChoices();
    });
  }
  refreshManualCorrectOptionChoices();

  [
    lessonQuestionEditOptionAInput,
    lessonQuestionEditOptionBInput,
    lessonQuestionEditOptionCInput,
    lessonQuestionEditOptionDInput,
    lessonQuestionEditOptionAAltInput,
    lessonQuestionEditOptionBAltInput,
    lessonQuestionEditOptionCAltInput,
    lessonQuestionEditOptionDAltInput,
  ].forEach((control) => {
    if (!(control instanceof HTMLInputElement)) return;
    control.addEventListener("input", () => {
      refreshEditCorrectOptionChoices();
    });
  });
  if (lessonQuestionEditCorrectInput instanceof HTMLSelectElement) {
    lessonQuestionEditCorrectInput.addEventListener("change", () => {
      refreshEditCorrectOptionChoices();
    });
  }
  refreshEditCorrectOptionChoices();

  if (lessonQuestionSectionFilterInput instanceof HTMLSelectElement) {
    lessonQuestionSectionFilterInput.addEventListener("change", () => {
      renderLessonQuestions();
    });
  }
  if (lessonQuestionCategoryFilterInput instanceof HTMLSelectElement) {
    lessonQuestionCategoryFilterInput.addEventListener("change", () => {
      resetQuestionSectionFilter();
      renderLessonQuestions();
    });
  }
  if (lessonReviewDownloadCsvBtn instanceof HTMLButtonElement) {
    lessonReviewDownloadCsvBtn.addEventListener("click", () => {
      try {
        downloadFilteredQuestionReviewCsv();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to download filtered CSV.", "error");
      }
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
        if (lessonBulkImportTextAltInput instanceof HTMLTextAreaElement) {
          lessonBulkImportTextAltInput.value = "";
        }
        await Promise.all([loadMockQuestions(state.selectedMockTestId), loadMockTestsAdmin(), loadAssessments()]);
        setPendingTestChanges(true);
        setQuestionBankMode("review");
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
        if (lessonBulkImportCsvFileAltInput instanceof HTMLInputElement) {
          lessonBulkImportCsvFileAltInput.value = "";
        }
        if (lessonBulkImportReplaceExistingInput instanceof HTMLInputElement) {
          lessonBulkImportReplaceExistingInput.checked = false;
        }
        await Promise.all([loadMockQuestions(state.selectedMockTestId), loadMockTestsAdmin(), loadAssessments()]);
        setPendingTestChanges(true);
        setQuestionBankMode("review");
        setMessage(`CSV import completed. Added ${result.createdCount}/${result.totalRows} questions.`, "success");
      } catch (error) {
        setMessage(error.message || "CSV import failed.", "error");
      }
    });
  }

  if (lessonCsvTemplateFormatInput instanceof HTMLSelectElement) {
    lessonCsvTemplateFormatInput.addEventListener("change", () => {
      syncCsvSectionByTemplate({ force: true });
      setMessage("Sample format changed. Default section updated.");
    });
  }

  if (lessonSectionCsvSampleBtn instanceof HTMLButtonElement) {
    lessonSectionCsvSampleBtn.addEventListener("click", () => {
      downloadLessonSectionCsvSample();
      setMessage("Sample CSV downloaded.", "success");
    });
  }

  if (lessonSaveTestBtn instanceof HTMLButtonElement) {
    lessonSaveTestBtn.addEventListener("click", () => {
      if (!(lessonForm instanceof HTMLFormElement)) return;
      setMessage("Creating lesson with test, transcript, and selected mode...");
      lessonForm.requestSubmit();
    });
  }

  if (lessonSaveQuestionsWithTestBtn instanceof HTMLButtonElement) {
    lessonSaveQuestionsWithTestBtn.addEventListener("click", async () => {
      try {
        setMessage("Saving questions with test...");
        await saveAndAttachLessonMockTestFromTopFields({ resetAfterSave: false });
        let csvImportResult = null;
        const hasPendingCsvImport =
          lessonBulkImportCsvFileInput instanceof HTMLInputElement &&
          Boolean(lessonBulkImportCsvFileInput.files?.length);
        if (hasPendingCsvImport) {
          setMessage("Test saved. Uploading CSV questions...");
          csvImportResult = await handleLessonCsvBulkImport();
          if (lessonBulkImportCsvFileInput instanceof HTMLInputElement) {
            lessonBulkImportCsvFileInput.value = "";
          }
          if (lessonBulkImportCsvFileAltInput instanceof HTMLInputElement) {
            lessonBulkImportCsvFileAltInput.value = "";
          }
          if (lessonBulkImportReplaceExistingInput instanceof HTMLInputElement) {
            lessonBulkImportReplaceExistingInput.checked = false;
          }
        }
        await Promise.all([loadMockQuestions(state.selectedMockTestId), loadMockTestsAdmin(), loadAssessments()]);
        setPendingTestChanges(false);
        setMessage(
          csvImportResult
            ? `Questions are saved with selected test. CSV import added ${csvImportResult.createdCount}/${csvImportResult.totalRows} questions.`
            : "Questions are saved with selected test.",
          "success"
        );
      } catch (error) {
        setMessage(error.message || "Unable to save questions with test.", "error");
      }
    });
  }

  if (lessonsTableBody) {
    lessonsTableBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const moveUpBtn = target.closest("[data-move-up-lesson]");
      if (moveUpBtn instanceof HTMLButtonElement) {
        const moveLessonId = String(moveUpBtn.getAttribute("data-move-up-lesson") || "").trim();
        if (!moveLessonId) return;
        const lesson = state.lessons.find((item) => item.id === moveLessonId);
        if (!lesson || lesson.orderIndex <= 1) return;
        try {
          setMessage("Shifting lesson up...");
          const movedTo = await reorderLessonInChapter(moveLessonId, Number(lesson.orderIndex) - 1);
          setMessage(`Lesson moved to order ${movedTo}.`, "success");
        } catch (error) {
          setMessage(error.message || "Unable to shift lesson.", "error");
        }
        return;
      }

      const moveDownBtn = target.closest("[data-move-down-lesson]");
      if (moveDownBtn instanceof HTMLButtonElement) {
        const moveLessonId = String(moveDownBtn.getAttribute("data-move-down-lesson") || "").trim();
        if (!moveLessonId) return;
        const lesson = state.lessons.find((item) => item.id === moveLessonId);
        if (!lesson) return;
        const maxOrder = state.lessons.length;
        if (Number(lesson.orderIndex) >= maxOrder) return;
        try {
          setMessage("Shifting lesson down...");
          const movedTo = await reorderLessonInChapter(moveLessonId, Number(lesson.orderIndex) + 1);
          setMessage(`Lesson moved to order ${movedTo}.`, "success");
        } catch (error) {
          setMessage(error.message || "Unable to shift lesson.", "error");
        }
        return;
      }

      const moveToBtn = target.closest("[data-move-to-lesson]");
      if (moveToBtn instanceof HTMLButtonElement) {
        const moveLessonId = String(moveToBtn.getAttribute("data-move-to-lesson") || "").trim();
        if (!moveLessonId) return;
        const row = moveToBtn.closest("tr");
        const orderInput =
          row instanceof HTMLElement
            ? row.querySelector(`[data-move-to-order-input="${moveLessonId}"]`)
            : null;
        const requestedOrder = Number(
          orderInput instanceof HTMLInputElement ? orderInput.value : Number.NaN
        );
        try {
          setMessage("Moving lesson to selected order...");
          const movedTo = await reorderLessonInChapter(moveLessonId, requestedOrder);
          setMessage(`Lesson moved to order ${movedTo}.`, "success");
        } catch (error) {
          setMessage(error.message || "Unable to move lesson.", "error");
        }
        return;
      }

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
    if (state.selectedCourseId) {
      await loadChapters(state.selectedCourseId);
    }
    if (state.selectedChapterId) {
      await loadLessons(state.selectedChapterId);
    }
    renderChapters();
    renderLessons();
    renderMockChapterOptions();
    renderMockLessonOptions();
    renderQuestionSectionControls();
    renderLessonSections();
    setTestsBuilderTab("transcript");
    setQuestionBankMode("sections");
    resetLessonSectionForm();
    toggleLessonSectionTranscriptState();
    toggleQuestionStructuredFields();
    toggleBilingualQuestionInputs();
    updateSectionTypeGuide();
    updateQuestionLanguageGuide();
    syncCsvSectionByTemplate({ force: true });
    updateQuestionSectionSummary();
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

