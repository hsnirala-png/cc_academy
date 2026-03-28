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

const query = new URLSearchParams(window.location.search || "");
const homeworkId = query.get("homeworkId") || "";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatDateTime = (value) => {
  if (!value) return "Not submitted yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not submitted yet";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderBehavior();

  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || normalizeRole(user) !== "STUDENT") {
    goToStudentLogin();
    return;
  }

  if (!homeworkId) {
    window.location.href = "./tuition-chapters.html";
    return;
  }

  const titleEl = document.querySelector("#tuitionHomeworkTitle");
  const metaEl = document.querySelector("#tuitionHomeworkMeta");
  const statusEl = document.querySelector("#tuitionHomeworkStatus");
  const summaryEl = document.querySelector("#tuitionHomeworkSummary");
  const tasksEl = document.querySelector("#tuitionHomeworkTasks");
  const form = document.querySelector("#tuitionHomeworkForm");
  const notesEl = document.querySelector("#tuitionHomeworkNotes");
  const recentEl = document.querySelector("#tuitionHomeworkRecent");
  const submissionsEl = document.querySelector("#tuitionHomeworkSubmissions");
  const backLink = document.querySelector("#tuitionHomeworkBackLink");

  let homeworkState = null;

  const setStatus = (message, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = message;
    statusEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  const renderSummary = (homework) => {
    if (!(summaryEl instanceof HTMLElement)) return;
    summaryEl.innerHTML = `
      <div class="tuition-summary-item">
        <strong>Chapter</strong>
        <span>${escapeHtml(homework?.chapter?.title || "-")}</span>
      </div>
      <div class="tuition-summary-item">
        <strong>Syllabus</strong>
        <span>${escapeHtml(homework?.chapter?.syllabusTitle || "-")}</span>
      </div>
      <div class="tuition-summary-item">
        <strong>Instructions</strong>
        <span>${escapeHtml(homework?.instructions || "Complete the chapter homework in order.")}</span>
      </div>
      <div class="tuition-summary-item">
        <strong>Status</strong>
        <span>${escapeHtml(homework?.status || "GENERATED")}</span>
      </div>
    `;
  };

  const renderMeta = (homework) => {
    if (!(metaEl instanceof HTMLElement)) return;
    metaEl.innerHTML = [
      homework?.responseLanguage || "ENGLISH",
      homework?.speedMode || "NORMAL",
      homework?.difficultyMode || "MEDIUM",
      `${homework?.submissionCount || 0} submission(s)`,
    ]
      .map((item) => `<span class="tuition-chip">${escapeHtml(item)}</span>`)
      .join("");
  };

  const renderTasks = (homework) => {
    if (!(tasksEl instanceof HTMLElement)) return;
    const tasks = homework?.assignmentPayload?.tasks || [];
    if (!tasks.length) {
      tasksEl.innerHTML = `<p class="tuition-empty-note">No homework tasks were generated.</p>`;
      return;
    }

    tasksEl.innerHTML = tasks
      .map(
        (task, index) => `
          <article class="tuition-homework-task">
            <div class="tuition-homework-task-head">
              <span class="eyebrow">Task ${index + 1}</span>
              <span class="tuition-chip">${escapeHtml(task.type || "practice")}</span>
            </div>
            <h3>${escapeHtml(task.prompt || "Homework prompt")}</h3>
            <p class="tuition-homework-format"><strong>Expected format:</strong> ${escapeHtml(
              task.expectedFormat || "Written answer"
            )}</p>
            ${
              Array.isArray(task.scaffolding) && task.scaffolding.length
                ? `<ul class="tuition-chat-list">${task.scaffolding
                    .map((item) => `<li>${escapeHtml(item)}</li>`)
                    .join("")}</ul>`
                : ""
            }
            <label>
              <span>Your answer</span>
              <textarea
                data-homework-question-id="${escapeHtml(task.id || `task-${index + 1}`)}"
                rows="4"
                maxlength="8000"
                placeholder="Write your answer here."
                required
              ></textarea>
            </label>
          </article>
        `
      )
      .join("");
  };

  const renderRecentHomework = (items) => {
    if (!(recentEl instanceof HTMLElement)) return;
    if (!items.length) {
      recentEl.innerHTML = `<p class="tuition-empty-note">No recent homework yet.</p>`;
      return;
    }
    recentEl.innerHTML = items
      .map(
        (item) => `
          <article class="tuition-list-card">
            <div>
              <strong>${escapeHtml(item.title || "Homework")}</strong>
              <p>${escapeHtml(item.chapter?.title || "-")} · ${escapeHtml(item.status || "GENERATED")}</p>
            </div>
            <a class="btn-ghost" href="./tuition-homework.html?homeworkId=${encodeURIComponent(item.id)}">Open</a>
          </article>
        `
      )
      .join("");
  };

  const renderSubmissions = (homework) => {
    if (!(submissionsEl instanceof HTMLElement)) return;
    const submissions = Array.isArray(homework?.submissions) ? homework.submissions : [];
    if (!submissions.length) {
      submissionsEl.innerHTML = `<p class="tuition-empty-note">Submit the worksheet to store your first answer set.</p>`;
      return;
    }
    submissionsEl.innerHTML = submissions
      .map(
        (submission) => `
          <article class="tuition-list-card">
            <div>
              <strong>${formatDateTime(submission.createdAt)}</strong>
              <p>${escapeHtml(submission.notes || "No notes added.")}</p>
            </div>
            <span class="tuition-chip">${Array.isArray(submission.answerPayload?.answers) ? submission.answerPayload.answers.length : 0} answer(s)</span>
          </article>
        `
      )
      .join("");
  };

  const applyHomework = (homework) => {
    homeworkState = homework || null;
    if (titleEl instanceof HTMLElement) titleEl.textContent = homework?.title || "Tuition Homework";
    renderMeta(homework);
    renderSummary(homework);
    renderTasks(homework);
    renderSubmissions(homework);

      if (backLink instanceof HTMLAnchorElement) {
        if (homework?.session?.id) {
          backLink.href = `./tuition-teacher.html?chapterId=${encodeURIComponent(
            homework.chapter.id
          )}&sessionId=${encodeURIComponent(homework.session.id)}&savedSession=1`;
        } else if (homework?.chapter?.id) {
          backLink.href = `./tuition-teacher.html?chapterId=${encodeURIComponent(homework.chapter.id)}`;
        } else {
          backLink.href = "./tuition-chapters.html";
        }
    }
  };

  const loadHomework = async () => {
    const [homeworkPayload, recentPayload] = await Promise.all([
      apiRequest({
        path: `/student/tuition/homework/${homeworkId}`,
        token,
      }),
      apiRequest({
        path: "/student/tuition/homework",
        token,
      }),
    ]);

    applyHomework(homeworkPayload?.homework || {});
    renderRecentHomework(recentPayload?.homework || []);
    setStatus("Homework loaded. Answer the tasks and submit when ready.", "success");
  };

  try {
    await loadHomework();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to load homework.", "error");
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!homeworkState) {
      setStatus("Homework details are still loading.", "error");
      return;
    }

    const answers = Array.from(
      document.querySelectorAll("[data-homework-question-id]")
    )
      .map((field) => ({
        questionId: String(field.getAttribute("data-homework-question-id") || "").trim(),
        response: field instanceof HTMLTextAreaElement ? field.value.trim() : "",
      }))
      .filter((item) => item.questionId && item.response);

    if (!answers.length) {
      setStatus("Write at least one answer before submitting the homework.", "error");
      return;
    }

    try {
      setStatus("Submitting homework...");
      const payload = await apiRequest({
        path: `/student/tuition/homework/${homeworkId}/submissions`,
        method: "POST",
        token,
        body: {
          answers,
          notes: notesEl instanceof HTMLTextAreaElement ? notesEl.value.trim() : "",
        },
      });
      applyHomework(payload?.homework || homeworkState);
      if (notesEl instanceof HTMLTextAreaElement) notesEl.value = "";
      setStatus("Homework submitted and stored for this chapter.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit homework.", "error");
    }
  });
});
