import {
  EXAM_LABELS,
  SUBJECT_LABELS,
  apiRequest,
  clearAuth,
  escapeHtml,
  formatDateTime,
  initHeaderBehavior,
  requireRoleGuard,
} from "./mock-api.js";

const getQueryAttemptId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("attemptId") || "";
};

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("STUDENT");
  if (!auth) return;
  const { token } = auth;
  initHeaderBehavior();

  const statusEl = document.querySelector("#historyStatus");
  const historyBody = document.querySelector("#historyTableBody");
  const detailWrap = document.querySelector("#historyDetailWrap");
  const detailTitle = document.querySelector("#historyDetailTitle");
  const detailBody = document.querySelector("#historyDetailBody");
  const logoutBtn = document.querySelector("#logoutBtn");

  const state = {
    attempts: [],
  };

  const setStatus = (text, type) => {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
  };

  const renderAttempts = () => {
    if (!historyBody) return;
    if (!state.attempts.length) {
      historyBody.innerHTML = "<tr><td colspan='7'>No attempts found.</td></tr>";
      return;
    }

    historyBody.innerHTML = state.attempts
      .map((item) => {
        const mockTest = item.mockTest || {};
        return `
          <tr>
            <td>${formatDateTime(item.submittedAt || item.startedAt)}</td>
            <td>${escapeHtml(EXAM_LABELS[mockTest.examType] || mockTest.examType || "-")}</td>
            <td>${escapeHtml(SUBJECT_LABELS[mockTest.subject] || mockTest.subject || "-")}</td>
            <td>${Number(item.correctCount || 0)}/${Number(item.totalQuestions || 0)}</td>
            <td>${Number(item.scorePercent || 0).toFixed(2)}%</td>
            <td>${escapeHtml(item.remarkText || "-")}</td>
            <td>
              <button class="table-btn edit" data-view-attempt="${item.id}" type="button">View</button>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const renderAttemptDetails = (attempt) => {
    if (!detailWrap || !detailTitle || !detailBody) return;
    detailTitle.textContent = `${attempt.mockTest?.title || "Attempt"} | ${Number(
      attempt.correctCount || 0
    )}/${Number(attempt.totalQuestions || 0)} | ${attempt.remarkText || "-"}`;
    const questions = attempt.questions || [];
    detailBody.innerHTML = questions
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

    detailWrap.classList.remove("hidden");
  };

  const loadHistory = async () => {
    const data = await apiRequest({ path: "/student/history", token });
    state.attempts = data.attempts || [];
    renderAttempts();
  };

  const loadAttemptDetails = async (attemptId) => {
    const data = await apiRequest({
      path: `/student/history/${attemptId}`,
      token,
    });
    renderAttemptDetails(data.attempt);
  };

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./index.html";
    });
  }

  if (historyBody) {
    historyBody.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const attemptId = target.getAttribute("data-view-attempt");
      if (!attemptId) return;
      try {
        setStatus("Loading attempt details...");
        await loadAttemptDetails(attemptId);
        setStatus("");
      } catch (error) {
        setStatus(error.message || "Unable to load attempt details", "error");
      }
    });
  }

  try {
    setStatus("Loading history...");
    await loadHistory();
    const queryAttemptId = getQueryAttemptId();
    if (queryAttemptId) {
      await loadAttemptDetails(queryAttemptId);
    }
    setStatus("");
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      clearAuth();
      window.location.href = "./index.html";
      return;
    }
    setStatus(error.message || "Unable to load history", "error");
  }
});
