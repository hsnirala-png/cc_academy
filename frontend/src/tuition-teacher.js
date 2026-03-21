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
const chapterId = query.get("chapterId") || "";
const sessionIdFromQuery = query.get("sessionId") || "";

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderBehavior();

  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || normalizeRole(user) !== "STUDENT") {
    goToStudentLogin();
    return;
  }

  if (!chapterId) {
    window.location.href = "./tuition-chapters.html";
    return;
  }

  const titleEl = document.querySelector("#tuitionTeacherTitle");
  const summaryEl = document.querySelector("#tuitionTeacherSummary");
  const statusEl = document.querySelector("#tuitionTeacherStatus");
  const messagesEl = document.querySelector("#tuitionTeacherMessages");
  const form = document.querySelector("#tuitionTeacherForm");
  const inputEl = document.querySelector("#tuitionTeacherInput");
  const languageEl = document.querySelector("#tuitionTeacherLanguage");
  const speedEl = document.querySelector("#tuitionTeacherSpeed");
  const difficultyEl = document.querySelector("#tuitionTeacherDifficulty");

  let activeSessionId = sessionIdFromQuery;

  const setStatus = (message, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = message;
    statusEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  const renderMessages = (messages) => {
    if (!(messagesEl instanceof HTMLElement)) return;
    if (!messages.length) {
      messagesEl.innerHTML = `<div class="tuition-chat-empty">Start by asking about this chapter.</div>`;
      return;
    }
    messagesEl.innerHTML = messages
      .map(
        (message) => `
          <article class="tuition-chat-message ${message.role === "USER" ? "is-user" : "is-assistant"}">
            <strong>${message.role === "USER" ? "You" : "AI Tuition Teacher"}</strong>
            <p>${String(message.content || "").replace(/\n/g, "<br />")}</p>
          </article>
        `
      )
      .join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const loadChapterContext = async () => {
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}`,
      token,
    });
    const chapter = payload?.chapter;
    if (titleEl instanceof HTMLElement) titleEl.textContent = chapter?.title || "Tuition Session";
    if (summaryEl instanceof HTMLElement) {
      summaryEl.textContent =
        chapter?.plan?.goalSummary || "Text-first tuition chat is active for the selected chapter.";
      summaryEl.className = "form-message success";
    }
  };

  const createOrResumeSession = async () => {
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}/sessions`,
      method: "POST",
      token,
      body: {
        responseLanguage: languageEl instanceof HTMLSelectElement ? languageEl.value : "ENGLISH",
        speedMode: speedEl instanceof HTMLSelectElement ? speedEl.value : "NORMAL",
        difficultyMode: difficultyEl instanceof HTMLSelectElement ? difficultyEl.value : "MEDIUM",
        resume: true,
      },
    });
    activeSessionId = payload?.session?.id || "";
    renderMessages(payload?.session?.messages || []);
    setStatus("Session ready. Ask about the concept, examples, or practice.", "success");
  };

  try {
    await loadChapterContext();
    if (activeSessionId) {
      const payload = await apiRequest({
        path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}`,
        token,
      });
      renderMessages(payload?.session?.messages || []);
      setStatus("Session loaded.", "success");
    } else {
      await createOrResumeSession();
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to open the tuition teacher.", "error");
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(inputEl instanceof HTMLTextAreaElement) || !inputEl.value.trim()) {
      setStatus("Enter a message first.", "error");
      return;
    }

    try {
      setStatus("Sending message...");
      const payload = await apiRequest({
        path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}/messages`,
        method: "POST",
        token,
        body: {
          content: inputEl.value.trim(),
          responseLanguage: languageEl instanceof HTMLSelectElement ? languageEl.value : "ENGLISH",
          speedMode: speedEl instanceof HTMLSelectElement ? speedEl.value : "NORMAL",
          difficultyMode: difficultyEl instanceof HTMLSelectElement ? difficultyEl.value : "MEDIUM",
        },
      });
      renderMessages(payload?.session?.messages || []);
      inputEl.value = "";
      setStatus("Response generated for the current chapter.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send the tuition message.", "error");
    }
  });
});
