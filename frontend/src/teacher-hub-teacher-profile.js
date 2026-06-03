import { apiRequest, requireTeacherHubTeacher, setMessage } from "./teacher-hub-api.js";

const splitCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("#teacherHubTeacherProfileForm");
  const displayNameInput = document.querySelector("#teacherProfileDisplayName");
  const headlineInput = document.querySelector("#teacherProfileHeadline");
  const bioInput = document.querySelector("#teacherProfileBio");
  const subjectsInput = document.querySelector("#teacherProfileSubjects");
  const boardsInput = document.querySelector("#teacherProfileBoards");
  const classLevelsInput = document.querySelector("#teacherProfileClassLevels");
  const modeInput = document.querySelector("#teacherProfileMode");
  const kycLegalInput = document.querySelector("#teacherKycLegalName");
  const kycTypeInput = document.querySelector("#teacherKycDocumentType");
  const kycMaskedInput = document.querySelector("#teacherKycDocumentMasked");
  const payoutTypeInput = document.querySelector("#teacherPayoutType");
  const payoutLabelInput = document.querySelector("#teacherPayoutLabel");
  const messageEl = document.querySelector("#teacherHubTeacherProfileMessage");
  let auth = null;
  try {
    auth = await requireTeacherHubTeacher({ allowCandidate: true });
  } catch (error) {
    setMessage(messageEl, error.message || "Teacher Hub is not available for this account.", "error");
    return;
  }
  if (!auth) return;

  const load = async () => {
    const payload = await apiRequest({ path: "/teacher-hub/profile", token: auth.token });
    const profile = payload?.profile || {};
    const kyc = payload?.kyc || {};
    const payout = payload?.payoutAccount || {};
    if (displayNameInput) displayNameInput.value = profile.displayName || "";
    if (headlineInput) headlineInput.value = profile.headline || "";
    if (bioInput) bioInput.value = profile.bio || "";
    if (subjectsInput) subjectsInput.value = Array.isArray(profile.subjects) ? profile.subjects.join(", ") : "";
    if (boardsInput) boardsInput.value = Array.isArray(profile.boards) ? profile.boards.join(", ") : "";
    if (classLevelsInput) classLevelsInput.value = Array.isArray(profile.classLevels) ? profile.classLevels.join(", ") : "";
    if (modeInput) modeInput.value = profile.canTeachBatch ? (profile.canTeachOneToOne ? "BOTH" : "BATCH") : "ONE_TO_ONE";
    if (kycLegalInput) kycLegalInput.value = kyc.legalName || "";
    if (kycTypeInput) kycTypeInput.value = kyc.documentType || "";
    if (kycMaskedInput) kycMaskedInput.value = kyc.documentNumberMasked || "";
    if (payoutTypeInput) payoutTypeInput.value = payout.accountType || "BANK";
    if (payoutLabelInput) payoutLabelInput.value = payout.accountLabelMasked || "";
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setMessage(messageEl, "Saving teacher profile...");
      const mode = modeInput?.value || "ONE_TO_ONE";
      await apiRequest({
        path: "/teacher-hub/profile",
        method: "PUT",
        token: auth.token,
        body: {
          displayName: displayNameInput?.value || "",
          headline: headlineInput?.value || undefined,
          bio: bioInput?.value || undefined,
          subjects: splitCsv(subjectsInput?.value),
          boards: splitCsv(boardsInput?.value),
          classLevels: splitCsv(classLevelsInput?.value),
          canTeachOneToOne: mode === "ONE_TO_ONE" || mode === "BOTH",
          canTeachBatch: mode === "BATCH" || mode === "BOTH",
        },
      });
      await apiRequest({
        path: "/teacher-hub/kyc",
        method: "PUT",
        token: auth.token,
        body: {
          legalName: kycLegalInput?.value || undefined,
          documentType: kycTypeInput?.value || undefined,
          documentNumberMasked: kycMaskedInput?.value || undefined,
        },
      });
      await apiRequest({
        path: "/teacher-hub/payout-account",
        method: "PUT",
        token: auth.token,
        body: {
          accountType: payoutTypeInput?.value || "BANK",
          accountLabelMasked: payoutLabelInput?.value || "",
        },
      });
      setMessage(messageEl, "Teacher Hub profile saved.", "success");
      await load();
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to save teacher profile.", "error");
    }
  });

  await load().catch((error) => setMessage(messageEl, error.message || "Unable to load teacher profile.", "error"));
});
