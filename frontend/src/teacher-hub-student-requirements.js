import { apiRequest, escapeHtml, formatDateTime, requireTeacherHubStudent, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("#teacherHubRequirementForm");
  const boardInput = document.querySelector("#requirementBoard");
  const classInput = document.querySelector("#requirementClassLevel");
  const subjectInput = document.querySelector("#requirementSubject");
  const modeInput = document.querySelector("#requirementMode");
  const goalsInput = document.querySelector("#requirementGoals");
  const messageEl = document.querySelector("#teacherHubRequirementsMessage");
  let auth = null;
  try {
    auth = await requireTeacherHubStudent();
  } catch (error) {
    setMessage(messageEl, error.message || "Teacher Hub is not available for this account.", "error");
    return;
  }
  if (!auth) return;
  const listEl = document.querySelector("#teacherHubRequirementsList");

  const render = (items) => {
    if (!(listEl instanceof HTMLElement)) return;
    if (!items.length) {
      listEl.innerHTML = `<div class="teacher-hub-empty">No teacher requirements yet.</div>`;
      return;
    }
    listEl.innerHTML = items
      .map(
        (item) => `
        <article class="teacher-hub-item">
          <h3>${escapeHtml(item.subject)}</h3>
          <div class="teacher-hub-chip-row">
            <span class="teacher-hub-chip">${escapeHtml(item.modeWanted)}</span>
            <span class="teacher-hub-chip">${escapeHtml(item.board || "Board pending")}</span>
            <span class="teacher-hub-chip">${escapeHtml(item.status)}</span>
          </div>
          <p>${escapeHtml(item.goals || "No goals added.")}</p>
          <small>${escapeHtml(formatDateTime(item.createdAt))}</small>
        </article>
      `
      )
      .join("");
  };

  const load = async () => {
    const payload = await apiRequest({ path: "/student/teacher-hub/requirements", token: auth.token });
    render(payload?.requirements || []);
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setMessage(messageEl, "Submitting requirement...");
      await apiRequest({
        path: "/student/teacher-hub/requirements",
        method: "POST",
        token: auth.token,
        body: {
          board: boardInput?.value || undefined,
          classLevel: classInput?.value || undefined,
          subject: subjectInput?.value || "",
          modeWanted: modeInput?.value || "ONE_TO_ONE",
          goals: goalsInput?.value || undefined,
        },
      });
      if (form instanceof HTMLFormElement) form.reset();
      await load();
      setMessage(messageEl, "Requirement submitted successfully.", "success");
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to submit requirement.", "error");
    }
  });

  await load().catch((error) => setMessage(messageEl, error.message || "Unable to load requirements.", "error"));
});
