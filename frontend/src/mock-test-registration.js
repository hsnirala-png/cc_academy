import {
  EXAM_LABELS,
  apiRequest,
  clearAuth,
  initHeaderBehavior,
  requireRoleGuard,
} from "./mock-api.js?v=2";

const resolveAttemptPagePath = async () => {
  const currentPath = window.location.pathname || "";
  const prefersExtensionless = currentPath.endsWith("/mock-test-registration");
  const candidates = prefersExtensionless
    ? ["./mock-attempt", "./mock-attempt.html"]
    : ["./mock-attempt.html", "./mock-attempt"];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: "no-store" });
      if (response.ok) return candidate;
    } catch {
      // continue
    }
  }
  return candidates[0];
};

const TIME_LABELS = {
  "09:00": "09:00 am",
  "17:00": "05:00 pm",
};

const formatDateLabel = (value) => {
  const date = new Date(`${String(value || "")}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const toScheduleTimestamp = (dateValue, timeValue) => {
  const dateText = String(dateValue || "").trim();
  const timeText = String(timeValue || "").trim();
  if (!dateText) return Number.NaN;
  const normalizedTime = /^\d{2}:\d{2}$/.test(timeText) ? timeText : "00:00";
  const stamp = Date.parse(`${dateText}T${normalizedTime}:00`);
  return Number.isFinite(stamp) ? stamp : Number.NaN;
};

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("STUDENT");
  if (!auth) return;
  const { token, user } = auth;
  initHeaderBehavior();

  const searchParams = new URLSearchParams(window.location.search);
  const requestedMockTestId = String(searchParams.get("mockTestId") || "").trim();
  const requestedFriendReferralCode = String(
    searchParams.get("ref") || searchParams.get("referralCode") || ""
  )
    .trim()
    .toUpperCase();

  const statusEl = document.querySelector("#registrationStatus");
  const logoutBtn = document.querySelector("#logoutBtn");
  const titleEl = document.querySelector("#registrationTitle");
  const descriptionEl = document.querySelector("#registrationDescription");
  const attemptsInfoEl = document.querySelector("#registrationAttemptsInfo");
  const reminderCard = document.querySelector("#registrationReminderCard");
  const reminderTitleEl = document.querySelector("#registrationReminderTitle");
  const reminderWhenEl = document.querySelector("#registrationReminderWhen");
  const form = document.querySelector("#registrationForm");
  const examTypeInput = document.querySelector("#regExamType");
  const pstet2SubjectWrap = document.querySelector("#regPstet2SubjectWrap");
  const pstet2SubjectInput = document.querySelector("#regPstet2Subject");
  const fullNameInput = document.querySelector("#regFullName");
  const mobileInput = document.querySelector("#regMobile");
  const emailInput = document.querySelector("#regEmail");
  const preferredDateInput = document.querySelector("#regPreferredDate");
  const timeSlotInputs = Array.from(document.querySelectorAll('input[name="regTimeSlot"]'));
  const startAttemptBtn = document.querySelector("#startAttemptBtn");
  const buyMockBtn = document.querySelector("#buyMockBtn");
  const friendReferralCodeInput = document.querySelector("#regFriendReferralCode");
  const noFriendReferralCodeInput = document.querySelector("#regNoFriendReferralCode");
  const referralIdTextEl = document.querySelector("#regReferralIdText");
  const referralLinkInput = document.querySelector("#regReferralLink");
  const shareReferralBtn = document.querySelector("#regShareReferralBtn");
  const copyReferralBtn = document.querySelector("#regCopyReferralBtn");
  const referralStatsEl = document.querySelector("#regReferralStats");
  let copyReferralFeedbackTimer = null;

  const state = {
    options: [],
    selectedMockTestId: "",
    selectedExamType: "",
    selectedStreamChoice: "",
    studentReferralCode: "",
    noChancePromptShown: false,
  };

  const setStatus = (text, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = text || "";
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
  };

  const getRegistrationPagePath = () => {
    const currentPath = (window.location.pathname || "").toLowerCase();
    return currentPath.endsWith("/mock-test-registration") || currentPath.endsWith("/mock-tests")
      ? "./mock-test-registration"
      : "./mock-test-registration.html";
  };

  const buildRegistrationPageUrl = ({ mockTestId = "", referralCode = "" } = {}) => {
    const url = new URL(getRegistrationPagePath(), window.location.href);
    if (mockTestId) {
      url.searchParams.set("mockTestId", mockTestId);
    }
    if (referralCode) {
      url.searchParams.set("ref", referralCode);
    }
    return url.toString();
  };

  const clearIncomingReferralParam = () => {
    if (!requestedFriendReferralCode) return;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("ref");
    nextUrl.searchParams.delete("referralCode");
    const nextSearch = nextUrl.searchParams.toString();
    const nextPath = `${nextUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}${nextUrl.hash || ""}`;
    window.history.replaceState({}, "", nextPath);
  };

  const selectedOption = () =>
    state.options.find((item) => item.mockTestId === state.selectedMockTestId) || null;

  const getReferenceOption = () => selectedOption() || pickBestOption(state.options) || null;

  const hasAnyRegisteredOption = () => state.options.some((item) => Boolean(item?.isRegistered));

  const hasAnyChanceAvailable = () =>
    state.options.some(
      (item) => Boolean(item?.hasPaidAccess) || Math.max(0, Number(item?.remainingAttempts || 0)) > 0
    );

  const canEditRegistration = (option) =>
    Boolean(option) &&
    (Boolean(option?.isRegistered) ||
      Boolean(option?.hasPaidAccess) ||
      Math.max(0, Number(option?.remainingAttempts || 0)) > 0);

  const buildReferralShareUrl = (option = selectedOption()) => {
    const referralCode = String(state.studentReferralCode || "").trim().toUpperCase();
    if (!referralCode) return "";
    const mockTestId = String(option?.mockTestId || requestedMockTestId || "").trim();
    return buildRegistrationPageUrl({ mockTestId, referralCode });
  };

  const getIncomingReferralCode = (option) => {
    if (!option || option.isRegistered || hasAnyRegisteredOption()) return "";
    const code = String(requestedFriendReferralCode || "").trim().toUpperCase();
    const ownCode = String(state.studentReferralCode || "").trim().toUpperCase();
    if (!code || code === ownCode) return "";
    return code;
  };

  const getSelectedTimeSlot = () => {
    const checked = timeSlotInputs.find((input) => input instanceof HTMLInputElement && input.checked);
    return checked instanceof HTMLInputElement ? checked.value : "";
  };

  const setSelectedTimeSlot = (value) => {
    const normalized = String(value || "").trim();
    timeSlotInputs.forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      input.checked = input.value === normalized;
    });
  };

  const setTimeSlotDisabled = (disabled) => {
    timeSlotInputs.forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      input.disabled = Boolean(disabled);
    });
  };

  const getOptionStream = (option) =>
    String(option?.preferredStreamChoice || option?.streamChoice || "")
      .trim()
      .toUpperCase();

  const getOptionExam = (option) => String(option?.examType || "").trim().toUpperCase();

  const syncFriendReferralInputState = () => {
    const hasNoCode = noFriendReferralCodeInput instanceof HTMLInputElement && noFriendReferralCodeInput.checked;
    const formLocked = form instanceof HTMLFormElement && form.classList.contains("mock-form-locked");
    const registeredSelection = Boolean(selectedOption()?.isRegistered);
    if (friendReferralCodeInput instanceof HTMLInputElement) {
      friendReferralCodeInput.disabled = registeredSelection || formLocked || hasNoCode;
      if (hasNoCode) friendReferralCodeInput.value = "";
    }
    if (noFriendReferralCodeInput instanceof HTMLInputElement) {
      noFriendReferralCodeInput.disabled = registeredSelection || formLocked;
    }
  };

  const renderOwnReferralCode = (option) => {
    const candidate = String(option?.studentReferralCode || state.studentReferralCode || "")
      .trim()
      .toUpperCase();
    state.studentReferralCode = candidate;
    if (referralIdTextEl instanceof HTMLElement) {
      referralIdTextEl.textContent = candidate ? `Your Student ID: ${candidate}` : "Student ID unavailable.";
    }
    if (referralLinkInput instanceof HTMLInputElement) {
      referralLinkInput.value = buildReferralShareUrl(option) || "Referral link unavailable";
    }
  };

  const renderReferralStats = (option) => {
    if (!(referralStatsEl instanceof HTMLElement)) return;
    referralStatsEl.textContent = "";
    referralStatsEl.classList.add("hidden");
  };

  const renderChanceCard = (option, { inactiveSelection = false } = {}) => {
    if (!(attemptsInfoEl instanceof HTMLElement)) return;

    if (!option) {
      attemptsInfoEl.className = "mock-chance-panel mock-chance-panel--empty";
      attemptsInfoEl.textContent = "No mock registration option available right now.";
      return;
    }

    if (option.hasPaidAccess) {
      attemptsInfoEl.className = "mock-chance-panel";
      attemptsInfoEl.innerHTML = `
        <div class="mock-chance-summary">
          <span class="mock-chance-total">Paid</span>
          <span class="mock-chance-summary-label">Access Status</span>
        </div>
        <div class="mock-chance-grid">
          <div class="mock-chance-item">
            <span class="mock-chance-item-label">Attempts</span>
            <span class="mock-chance-item-value">Unlimited</span>
          </div>
          <div class="mock-chance-item">
            <span class="mock-chance-item-label">Mock Type</span>
            <span class="mock-chance-item-value">Any Active</span>
          </div>
        </div>
        <p class="mock-chance-note">You can use your access for any active mock test.</p>
      `;
      return;
    }

    const freeAttemptLimit = Math.max(0, Number(option.freeAttemptLimit || 0));
    const referralBonusAttempts = Math.max(0, Number(option.referralBonusAttempts || 0));
    const totalFreeAttemptLimit = Math.max(
      0,
      Number(option.totalFreeAttemptLimit || freeAttemptLimit + referralBonusAttempts)
    );
    const usedAttempts = Math.max(0, Number(option.usedAttempts || 0));
    const remainingAttempts = Math.max(0, Number(option.remainingAttempts || 0));

    attemptsInfoEl.className = "mock-chance-panel";
    attemptsInfoEl.innerHTML = `
      <div class="mock-chance-summary">
        <span class="mock-chance-total">${totalFreeAttemptLimit}</span>
        <span class="mock-chance-summary-label">Total Free Chances</span>
      </div>
      <div class="mock-chance-grid">
        <div class="mock-chance-item">
          <span class="mock-chance-item-label">Free Chances</span>
          <span class="mock-chance-item-value">${freeAttemptLimit}</span>
        </div>
        <div class="mock-chance-item">
          <span class="mock-chance-item-label">Referral Bonus</span>
          <span class="mock-chance-item-value">${referralBonusAttempts}</span>
        </div>
        <div class="mock-chance-item">
          <span class="mock-chance-item-label">Used</span>
          <span class="mock-chance-item-value">${usedAttempts}</span>
        </div>
        <div class="mock-chance-item">
          <span class="mock-chance-item-label">Remaining</span>
          <span class="mock-chance-item-value">${remainingAttempts}</span>
        </div>
      </div>
      <p class="mock-chance-note">${
        inactiveSelection
          ? "Selected test type is inactive. Switch to any active mock and use the same available chance."
          : "You can use this chance on any active PSTET mock, including PSTET-1, PSTET-2, SST, or SCI/MATHS."
      }</p>
    `;
  };

  const getReferralSharePayload = (option = selectedOption()) => {
    const shareUrl = buildReferralShareUrl(option);
    if (!shareUrl) return null;

    const shareTitle = "CC Academy Mock Test Registration";
    const shareText = "Use this link to open mock registration with my student ID already filled in.";
    return { shareUrl, shareTitle, shareText };
  };

  const shareReferralLink = async (option = selectedOption()) => {
    const payload = getReferralSharePayload(option);
    if (!payload) {
      setStatus("Referral link is not available yet.", "error");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.shareTitle,
          text: payload.shareText,
          url: payload.shareUrl,
        });
        setStatus("Share dialog opened.", "success");
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
        setStatus("Unable to open share dialog on this device.", "error");
        return;
      }
    }

    setStatus("Share is not available on this device. Use Copy Link to share manually.", "error");
  };

  const copyReferralLink = async (option = selectedOption()) => {
    const payload = getReferralSharePayload(option);
    if (!payload) {
      setStatus("Referral link is not available yet.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(payload.shareUrl);
      if (copyReferralBtn instanceof HTMLButtonElement) {
        copyReferralBtn.classList.add("is-copied");
        if (copyReferralFeedbackTimer) {
          window.clearTimeout(copyReferralFeedbackTimer);
        }
        copyReferralFeedbackTimer = window.setTimeout(() => {
          copyReferralBtn.classList.remove("is-copied");
          copyReferralFeedbackTimer = null;
        }, 2500);
      }
      setStatus("Referral link copied. Share it manually.", "success");
    } catch {
      setStatus("Unable to copy referral link automatically.", "error");
    }
  };

  const ensureNoChanceModal = () => {
    let modal = document.querySelector("#mockNoChanceModal");
    if (!(modal instanceof HTMLElement)) {
      modal = document.createElement("div");
      modal.id = "mockNoChanceModal";
      modal.className = "mock-registration-modal hidden";
      modal.innerHTML = `
        <div class="mock-registration-dialog mock-no-chance-dialog" role="dialog" aria-modal="true" aria-labelledby="mockNoChanceTitle">
          <button type="button" class="mock-registration-close" data-close-no-chance aria-label="Close">x</button>
          <h3 id="mockNoChanceTitle" class="mock-no-chance-title">No Mock Chance Available</h3>
          <p class="mock-no-chance-text">You do not have any chance Refer a friend to win free chance or buy the Mock test</p>
          <p id="mockNoChanceStudentId" class="mock-no-chance-id hidden"></p>
          <div class="mock-no-chance-actions">
            <button id="mockNoChanceReferBtn" class="btn-primary" type="button">Refer a Friend</button>
            <button id="mockNoChanceBuyBtn" class="btn-secondary" type="button">Buy Mock</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    return modal;
  };

  const closeNoChanceModal = () => {
    const modal = document.querySelector("#mockNoChanceModal");
    if (modal instanceof HTMLElement) {
      modal.classList.add("hidden");
    }
  };

  const openNoChanceModal = () => {
    const modal = ensureNoChanceModal();
    const studentIdEl = modal.querySelector("#mockNoChanceStudentId");
    const referBtn = modal.querySelector("#mockNoChanceReferBtn");
    const buyBtn = modal.querySelector("#mockNoChanceBuyBtn");
    const closeBtn = modal.querySelector("[data-close-no-chance]");
    const option = selectedOption();
    const studentCode = String(state.studentReferralCode || "").trim().toUpperCase();

    if (studentIdEl instanceof HTMLElement) {
      studentIdEl.textContent = studentCode ? `Share your Student ID: ${studentCode}` : "";
      studentIdEl.classList.toggle("hidden", !studentCode);
    }
    if (referBtn instanceof HTMLButtonElement) {
      referBtn.onclick = async () => {
        await shareReferralLink(option);
      };
    }
    if (buyBtn instanceof HTMLButtonElement) {
      buyBtn.onclick = () => {
        const buyUrl = String(option?.buyNowUrl || "").trim();
        window.location.href = buyUrl || "./products.html";
      };
    }
    if (closeBtn instanceof HTMLButtonElement) {
      closeBtn.onclick = () => closeNoChanceModal();
    }

    modal.classList.remove("hidden");
  };

  const syncRegistrationAvailability = (option = selectedOption()) => {
    const canEdit = canEditRegistration(option);
    const isRegistered = Boolean(option?.isRegistered);
    const hasSavedEmail = Boolean(String(option?.email || emailInput?.value || "").trim());
    if (form instanceof HTMLFormElement) {
      form.classList.toggle("mock-form-locked", !canEdit);
      const controls = Array.from(form.querySelectorAll("input, select, button[type='submit']"));
      controls.forEach((control) => {
        if (
          control instanceof HTMLInputElement ||
          control instanceof HTMLSelectElement ||
          control instanceof HTMLButtonElement
        ) {
          const keepEnabled =
            control === examTypeInput ||
            control === pstet2SubjectInput ||
            control === preferredDateInput ||
            control === emailInput ||
            (control instanceof HTMLInputElement && control.name === "regTimeSlot");
          if (keepEnabled) {
            if (control === emailInput) {
              control.disabled = !canEdit || (isRegistered && hasSavedEmail);
            } else {
              control.disabled = !canEdit ? !(control === examTypeInput || control === pstet2SubjectInput) : false;
            }
            return;
          }
          if (control === fullNameInput || control === mobileInput) {
            control.disabled = !canEdit || isRegistered;
            return;
          }
          control.disabled = !canEdit;
        }
      });
    }
    syncFriendReferralInputState();

    if (startAttemptBtn instanceof HTMLButtonElement) {
      const hasAttemptsRemaining =
        Boolean(option?.hasPaidAccess) || Math.max(0, Number(option?.remainingAttempts || 0)) > 0;
      startAttemptBtn.disabled = !option?.isRegistered || !hasAttemptsRemaining;
    }
  };

  const syncNoChancePrompt = () => {
    const shouldShow = Boolean(state.options.length) && !hasAnyChanceAvailable();
    if (!shouldShow) {
      closeNoChanceModal();
      state.noChancePromptShown = false;
      return;
    }
    if (!state.noChancePromptShown) {
      openNoChanceModal();
      state.noChancePromptShown = true;
    }
  };

  const getFilteredOptions = () => {
    const exam = String(state.selectedExamType || "").trim().toUpperCase();
    const stream = String(state.selectedStreamChoice || "").trim().toUpperCase();
    let rows = state.options.slice();
    if (exam) {
      rows = rows.filter((item) => getOptionExam(item) === exam);
    }
    if (exam === "PSTET_2" && stream) {
      rows = rows.filter((item) => getOptionStream(item) === stream);
    }
    return rows;
  };

  const pickBestOption = (rows) => {
    if (!rows.length) return null;
    const now = Date.now();
    const withTs = rows.map((item) => {
      const date = String(item.preferredDate || item.scheduledDate || "").trim();
      const time = String(item.preferredTimeSlot || item.scheduledTimeSlot || "").trim();
      return {
        item,
        ts: toScheduleTimestamp(date, time),
      };
    });

    const requested = withTs.find((row) => row.item.mockTestId === requestedMockTestId);
    if (requested) return requested.item;

    const upcomingRegistered = withTs
      .filter((row) => row.item.isRegistered && Number.isFinite(row.ts) && row.ts > now)
      .sort((a, b) => a.ts - b.ts)[0];
    if (upcomingRegistered) return upcomingRegistered.item;

    const registered = rows.find((item) => item.isRegistered);
    if (registered) return registered;

    const pending = rows.find((item) => !item.hasPaidAccess && Number(item.remainingAttempts || 0) > 0);
    if (pending) return pending;

    return rows[0];
  };

  const renderExamTypeOptions = () => {
    if (!(examTypeInput instanceof HTMLSelectElement)) return;
    const sorted = ["PSTET_1", "PSTET_2"];
    examTypeInput.innerHTML = [
      '<option value="">Select test type</option>',
      ...sorted.map((code) => `<option value="${code}">${EXAM_LABELS[code] || code}</option>`),
    ].join("");

    if (!state.selectedExamType || !sorted.includes(state.selectedExamType)) {
      state.selectedExamType = sorted[0] || "";
    }
    examTypeInput.value = state.selectedExamType;
  };

  const renderStreamOptions = () => {
    const isPstet2 = state.selectedExamType === "PSTET_2";
    if (pstet2SubjectWrap instanceof HTMLElement) {
      pstet2SubjectWrap.classList.toggle("hidden", !isPstet2);
    }
    if (!(pstet2SubjectInput instanceof HTMLSelectElement)) return;
    if (!isPstet2) {
      pstet2SubjectInput.value = "";
      state.selectedStreamChoice = "";
      return;
    }

    const streams = ["SOCIAL_STUDIES", "SCIENCE_MATH"];

    pstet2SubjectInput.innerHTML = [
      '<option value="">Select PSTET-2 Subject</option>',
      ...streams.map((code) => {
        const label = code === "SOCIAL_STUDIES" ? "SST" : "SCI/MATHS";
        return `<option value="${code}">${label}</option>`;
      }),
    ].join("");

    if (!state.selectedStreamChoice || !streams.includes(state.selectedStreamChoice)) {
      state.selectedStreamChoice = streams[0] || "";
    }
    pstet2SubjectInput.value = state.selectedStreamChoice;
  };

  const renderReminderCard = (option) => {
    if (!(reminderCard instanceof HTMLElement) || !(reminderTitleEl instanceof HTMLElement) || !(reminderWhenEl instanceof HTMLElement)) {
      return;
    }
    if (!option?.isRegistered) {
      reminderCard.classList.add("hidden");
      return;
    }

    const reminderDate = String(option.preferredDate || option.scheduledDate || "").trim();
    const reminderTime = String(option.preferredTimeSlot || option.scheduledTimeSlot || "").trim();
    const scheduleTs = toScheduleTimestamp(reminderDate, reminderTime);
    if (!Number.isFinite(scheduleTs) || scheduleTs <= Date.now()) {
      reminderCard.classList.add("hidden");
      return;
    }

    const timeLabel = TIME_LABELS[reminderTime] || reminderTime || "Time pending";
    reminderTitleEl.textContent = option.title || option.mockTestTitle || "Upcoming Mock Test";
    reminderWhenEl.textContent = `${formatDateLabel(reminderDate)} | ${timeLabel}`;
    reminderCard.classList.remove("hidden");
  };

  const applySelectionByFilters = () => {
    const filtered = getFilteredOptions();
    const picked = pickBestOption(filtered);
    state.selectedMockTestId = picked?.mockTestId || "";
  };

  const renderSelectedOption = () => {
    const option = selectedOption();
    const referenceOption = getReferenceOption();

    if (!option) {
      if (titleEl instanceof HTMLElement) titleEl.textContent = "Mock Test Registration";
      if (descriptionEl instanceof HTMLElement) {
        descriptionEl.textContent = "Selected test type is not active right now. Please switch to another available mock.";
      }
      renderChanceCard(referenceOption, { inactiveSelection: Boolean(referenceOption) });
      if (friendReferralCodeInput instanceof HTMLInputElement) friendReferralCodeInput.value = "";
      if (noFriendReferralCodeInput instanceof HTMLInputElement) noFriendReferralCodeInput.checked = false;
      renderOwnReferralCode(referenceOption);
      renderReferralStats(null);
      syncFriendReferralInputState();
      if (startAttemptBtn instanceof HTMLButtonElement) startAttemptBtn.disabled = true;
      if (reminderCard instanceof HTMLElement) reminderCard.classList.add("hidden");
      syncRegistrationAvailability(null);
      return;
    }

    if (titleEl instanceof HTMLElement) {
      titleEl.textContent = option.title || option.mockTestTitle || "Mock Registration";
    }
    if (descriptionEl instanceof HTMLElement) {
      descriptionEl.textContent = option.description || "";
    }
    renderChanceCard(option);

    if (friendReferralCodeInput instanceof HTMLInputElement) {
      const savedCode = String(option.friendReferralCode || "").trim().toUpperCase();
      friendReferralCodeInput.value = savedCode || getIncomingReferralCode(option);
    }
    if (noFriendReferralCodeInput instanceof HTMLInputElement) {
      const hasPrefilledCode =
        friendReferralCodeInput instanceof HTMLInputElement && Boolean(friendReferralCodeInput.value);
      noFriendReferralCodeInput.checked = Boolean(option.noFriendReferralCode) && !hasPrefilledCode;
    }
    renderOwnReferralCode(option);
    renderReferralStats(option);
    syncFriendReferralInputState();

    const scheduleDate = String(option.scheduledDate || "").trim();
    const scheduleTime = String(option.scheduledTimeSlot || "").trim();

    if (preferredDateInput instanceof HTMLInputElement) {
      const selectedDate = String(option.preferredDate || scheduleDate || "").trim();
      preferredDateInput.value = selectedDate;
      preferredDateInput.disabled = Boolean(scheduleDate);
    }

    if (scheduleTime) {
      setSelectedTimeSlot(scheduleTime);
      setTimeSlotDisabled(true);
    } else {
      setSelectedTimeSlot(option.preferredTimeSlot || "");
      setTimeSlotDisabled(false);
    }

    renderReminderCard(option);

    syncRegistrationAvailability(option);
  };

  const hydrateFiltersFromOption = (option) => {
    if (!option) return;
    state.selectedExamType = getOptionExam(option);
    state.selectedStreamChoice = getOptionStream(option);
  };

  const loadOptions = async () => {
    const data = await apiRequest({
      path: "/student/mock-registrations/options",
      token,
    });
    state.options = Array.isArray(data?.options) ? data.options : [];
    state.studentReferralCode = String(data?.studentReferralCode || "").trim().toUpperCase();

    if (!state.options.length) {
      renderExamTypeOptions();
      renderStreamOptions();
      state.selectedMockTestId = "";
      renderSelectedOption();
      return;
    }

    const requested = state.options.find((item) => item.mockTestId === requestedMockTestId);
    const defaultOption = requested || pickBestOption(state.options);
    if (!state.selectedExamType && defaultOption) {
      hydrateFiltersFromOption(defaultOption);
    }

    renderExamTypeOptions();
    renderStreamOptions();
    applySelectionByFilters();

    const selected = selectedOption();
    if (selected) {
      hydrateFiltersFromOption(selected);
      if (examTypeInput instanceof HTMLSelectElement) examTypeInput.value = state.selectedExamType;
      if (pstet2SubjectInput instanceof HTMLSelectElement && state.selectedExamType === "PSTET_2") {
        pstet2SubjectInput.value = state.selectedStreamChoice;
      }
    }

    if (
      requestedFriendReferralCode &&
      (hasAnyRegisteredOption() ||
        requestedFriendReferralCode === String(state.studentReferralCode || "").trim().toUpperCase())
    ) {
      clearIncomingReferralParam();
    }

    renderSelectedOption();
    syncNoChancePrompt();
  };

  const startAttempt = async () => {
    const option = selectedOption();
    if (!option?.mockTestId) throw new Error("Please select mock chance first.");

    const data = await apiRequest({
      path: "/student/attempts",
      method: "POST",
      token,
      body: { mockTestId: option.mockTestId },
    });
    const attemptId = String(data?.attempt?.id || "").trim();
    if (!attemptId) throw new Error("Unable to start attempt.");
    const attemptPagePath = await resolveAttemptPagePath();
    const sep = attemptPagePath.includes("?") ? "&" : "?";
    window.location.href = `${attemptPagePath}${sep}attemptId=${encodeURIComponent(attemptId)}`;
  };

  if (fullNameInput instanceof HTMLInputElement) {
    fullNameInput.value = String(user?.name || "").trim();
  }
  if (mobileInput instanceof HTMLInputElement) {
    mobileInput.value = String(user?.mobile || "").trim();
  }
  if (emailInput instanceof HTMLInputElement) {
    emailInput.value = String(user?.email || "").trim();
  }

  if (logoutBtn instanceof HTMLButtonElement) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./index.html";
    });
  }

  if (examTypeInput instanceof HTMLSelectElement) {
    examTypeInput.addEventListener("change", () => {
      state.selectedExamType = String(examTypeInput.value || "").trim().toUpperCase();
      if (state.selectedExamType !== "PSTET_2") {
        state.selectedStreamChoice = "";
      }
      renderStreamOptions();
      applySelectionByFilters();
      renderSelectedOption();
      syncNoChancePrompt();
    });
  }

  if (pstet2SubjectInput instanceof HTMLSelectElement) {
    pstet2SubjectInput.addEventListener("change", () => {
      state.selectedStreamChoice = String(pstet2SubjectInput.value || "").trim().toUpperCase();
      applySelectionByFilters();
      renderSelectedOption();
      syncNoChancePrompt();
    });
  }

  if (friendReferralCodeInput instanceof HTMLInputElement) {
    friendReferralCodeInput.addEventListener("input", () => {
      friendReferralCodeInput.value = friendReferralCodeInput.value.trim().toUpperCase();
      if (
        noFriendReferralCodeInput instanceof HTMLInputElement &&
        friendReferralCodeInput.value
      ) {
        noFriendReferralCodeInput.checked = false;
      }
      syncFriendReferralInputState();
    });
  }

  if (noFriendReferralCodeInput instanceof HTMLInputElement) {
    noFriendReferralCodeInput.addEventListener("change", () => {
      syncFriendReferralInputState();
    });
  }

  if (copyReferralBtn instanceof HTMLButtonElement) {
    copyReferralBtn.addEventListener("click", async () => {
      await copyReferralLink();
    });
  }

  if (shareReferralBtn instanceof HTMLButtonElement) {
    shareReferralBtn.addEventListener("click", async () => {
      await shareReferralLink();
    });
  }

  timeSlotInputs.forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.addEventListener("change", () => {
      if (input.disabled) return;
      if (!input.checked) return;
      timeSlotInputs.forEach((other) => {
        if (!(other instanceof HTMLInputElement)) return;
        if (other !== input) other.checked = false;
      });
    });
  });

  if (form instanceof HTMLFormElement) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const option = selectedOption();
        if (!option?.mockTestId) throw new Error("Please select mock chance.");
        if (!canEditRegistration(option)) {
          openNoChanceModal();
          throw new Error("You do not have any chance Refer a friend to win free chance or buy the Mock test");
        }

        const selectedExamType = String(state.selectedExamType || option.examType || "").trim().toUpperCase();
        const isPstet2 = selectedExamType === "PSTET_2";
        const preferredStreamChoice = String(pstet2SubjectInput?.value || "").trim().toUpperCase();
        const preferredDate = String(preferredDateInput?.value || "").trim();
        const preferredTimeSlot = getSelectedTimeSlot();
        const email = String(emailInput?.value || "").trim();
        const friendReferralCode = String(friendReferralCodeInput?.value || "")
          .trim()
          .toUpperCase();
        const noFriendReferralCode = Boolean(noFriendReferralCodeInput?.checked);

        if (!selectedExamType) throw new Error("Please select test type.");
        if (isPstet2 && !preferredStreamChoice) {
          throw new Error("Please select PSTET-2 subject: SST or SCI/MATHS.");
        }
        if (!email) throw new Error("Please enter email.");
        if (!friendReferralCode && !noFriendReferralCode) {
          throw new Error("Enter friend refer code or select 'I do not have friend refer code'.");
        }
        if (friendReferralCode && noFriendReferralCode) {
          throw new Error("Use either friend refer code or 'I do not have friend refer code'.");
        }
        if (!preferredDate) throw new Error("Please select preferred date.");
        if (!preferredTimeSlot) throw new Error("Please select preferred time.");

        setStatus("Saving registration...");
        const result = await apiRequest({
          path: `/student/mock-tests/${encodeURIComponent(option.mockTestId)}/register`,
          method: "POST",
          token,
          body: {
            fullName: String(fullNameInput?.value || "").trim(),
            mobile: String(mobileInput?.value || "").trim(),
            email,
            friendReferralCode: friendReferralCode || undefined,
            noFriendReferralCode,
            preferredExamType: selectedExamType,
            preferredStreamChoice: isPstet2 ? preferredStreamChoice : undefined,
            preferredDate,
            preferredTimeSlot,
          },
        });

        await loadOptions();

        const selectedAfterSave = selectedOption() || option;
        const examLabel = EXAM_LABELS[selectedExamType] || selectedExamType || "Mock";
        const streamLabel = isPstet2
          ? ` (${preferredStreamChoice === "SOCIAL_STUDIES" ? "SST" : "SCI/MATHS"})`
          : "";
        const timeLabel = TIME_LABELS[preferredTimeSlot] || preferredTimeSlot;
        const dateLabel = formatDateLabel(preferredDate);
        const mockName = selectedAfterSave.title || selectedAfterSave.mockTestTitle || "Mock test";
        const referralNotice = result?.referralBonusAwarded
          ? " Referral accepted. Your friend has received +1 free chance."
          : "";
        setStatus(
          `Congratulations! You have registered successfully for ${mockName} (${examLabel}${streamLabel}) at ${timeLabel} on ${dateLabel}.${referralNotice}`,
          "success"
        );
      } catch (error) {
        if (String(error?.payload?.code || "").trim() === "MOCK_NO_CHANCE_AVAILABLE") {
          openNoChanceModal();
        }
        setStatus(error?.message || "Unable to save registration.", "error");
      }
    });
  }

  if (startAttemptBtn instanceof HTMLButtonElement) {
    startAttemptBtn.addEventListener("click", async () => {
      try {
        setStatus("Starting attempt...");
        await startAttempt();
      } catch (error) {
        const payload = error?.payload || {};
        const errorCode = String(payload?.code || "").trim();
        if (error?.status === 401 || error?.status === 403) {
          if (errorCode === "MOCK_REG_REQUIRED") {
            setStatus("Please complete registration first.", "error");
            return;
          }
        }
        if (error?.status === 402 || errorCode === "MOCK_ATTEMPTS_EXHAUSTED") {
          const buyNowUrl = String(payload?.details?.buyNowUrl || "").trim();
          if (buyNowUrl) {
            window.location.href = buyNowUrl;
            return;
          }
          setStatus(error?.message || "Free attempts exhausted. Please buy mock.", "error");
          return;
        }
        setStatus(error?.message || "Unable to start attempt.", "error");
      }
    });
  }

  if (buyMockBtn instanceof HTMLButtonElement) {
    buyMockBtn.addEventListener("click", () => {
      const option = selectedOption();
      const url = String(option?.buyNowUrl || "").trim();
      if (url) {
        window.location.href = url;
        return;
      }
      window.location.href = "./products.html";
    });
  }

  try {
    setStatus("Loading registration details...");
    await loadOptions();
    if (!state.options.length) {
      setStatus("No active mock registration is available right now.", "error");
      return;
    }
    setStatus("");
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      clearAuth();
      window.location.href = "./index.html";
      return;
    }
    setStatus(error?.message || "Unable to load registration details.", "error");
  }
});
