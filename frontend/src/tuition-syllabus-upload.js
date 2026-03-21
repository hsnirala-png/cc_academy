import {
  apiRequest,
  getStoredToken,
  getStoredUser,
  goToStudentLogin,
  initHeaderBehavior,
} from "./mock-api.js?v=2";

const normalizeRole = (user) =>
  String(user?.role || user?.userRole || user?.user_type || user?.accountType || "")
    .trim()
    .toUpperCase();

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderBehavior();

  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || normalizeRole(user) !== "STUDENT") {
    goToStudentLogin();
    return;
  }

  const statusEl = document.querySelector("#tuitionUploadStatus");
  const form = document.querySelector("#tuitionUploadForm");
  const boardSelect = document.querySelector("#tuitionBoardSelect");
  const classSelect = document.querySelector("#tuitionClassSelect");
  const subjectSelect = document.querySelector("#tuitionSubjectSelect");
  const languageSelect = document.querySelector("#tuitionLanguageSelect");
  const fileInput = document.querySelector("#tuitionFileInput");
  const manualTextEl = document.querySelector("#tuitionManualText");

  const setStatus = (message, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = message;
    statusEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  const fillSelect = (select, items, valueKey, labelKey, placeholder) => {
    if (!(select instanceof HTMLSelectElement)) return;
    select.innerHTML = [`<option value="">${placeholder}</option>`]
      .concat(
        items.map(
          (item) =>
            `<option value="${String(item[valueKey] || "")}">${String(item[labelKey] || item[valueKey] || "")}</option>`
        )
      )
      .join("");
  };

  try {
    const bootstrap = await apiRequest({
      path: "/student/tuition/bootstrap",
      token,
    });

    const profile = bootstrap?.profile?.profile || bootstrap?.profile || {};
    const boards = bootstrap?.profile?.boards || [];
    const subjects = bootstrap?.profile?.subjects || [];
    const classes = bootstrap?.profile?.classes || [];

    fillSelect(boardSelect, boards, "code", "name", "Select board");
    fillSelect(subjectSelect, subjects, "code", "name", "Select subject");
    if (classSelect instanceof HTMLSelectElement) {
      classSelect.innerHTML = [`<option value="">Select class</option>`]
        .concat(classes.map((value) => `<option value="${value}">Class ${value}</option>`))
        .join("");
    }

    if (boardSelect instanceof HTMLSelectElement && profile.boardCode) {
      boardSelect.value = profile.boardCode;
    }
    if (subjectSelect instanceof HTMLSelectElement && profile.subjectCode) {
      subjectSelect.value = profile.subjectCode;
    }
    if (classSelect instanceof HTMLSelectElement && profile.classLevel) {
      classSelect.value = String(profile.classLevel);
    }
    if (languageSelect instanceof HTMLSelectElement && profile.preferredLanguage) {
      languageSelect.value = profile.preferredLanguage;
    }

    setStatus("Select the tuition context and upload a syllabus file.", "success");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to load tuition bootstrap.", "error");
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.[0]) {
      setStatus("Please select a syllabus file first.", "error");
      return;
    }

    try {
      setStatus("Saving tuition profile...");
      await apiRequest({
        path: "/student/tuition/profile",
        method: "PUT",
        token,
        body: {
          boardCode: boardSelect instanceof HTMLSelectElement ? boardSelect.value : "",
          classLevel: classSelect instanceof HTMLSelectElement ? Number(classSelect.value || 0) : null,
          subjectCode: subjectSelect instanceof HTMLSelectElement ? subjectSelect.value : "",
          preferredLanguage: languageSelect instanceof HTMLSelectElement ? languageSelect.value : "ENGLISH",
        },
      });

      setStatus("Uploading syllabus file...");
      const file = fileInput.files[0];
      const fileBase64 = await toBase64(file);
      const uploadPayload = await apiRequest({
        path: "/student/tuition/syllabus-uploads",
        method: "POST",
        token,
        body: {
          sourceType: "FILE",
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileBase64,
        },
      });

      setStatus("Preparing chapter draft...");
      const uploadId = uploadPayload?.upload?.id;
      await apiRequest({
        path: `/student/tuition/syllabus-uploads/${uploadId}/parse`,
        method: "POST",
        token,
        body: {
          manualText: manualTextEl instanceof HTMLTextAreaElement ? manualTextEl.value.trim() : "",
        },
      });

      window.location.href = `./tuition-syllabus-review.html?uploadId=${encodeURIComponent(uploadId)}`;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to upload the syllabus.", "error");
    }
  });
});
