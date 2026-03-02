import {
  apiRequest,
  clearAuth,
  escapeHtml,
  formatDateTime,
  requireRoleGuardStrict,
} from "./mock-api.js?v=2";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireRoleGuardStrict(null, "STUDENT");
  if (!auth) return;
  const { token, user } = auth;

  const logoutBtn = document.querySelector("#logoutBtn");
  const pageMessageEl = document.querySelector("#supportPageMessage");
  const createMessageEl = document.querySelector("#supportCreateMessage");
  const replyMessageEl = document.querySelector("#supportReplyMessageText");
  const createForm = document.querySelector("#supportCreateForm");
  const createBtn = document.querySelector("#supportCreateBtn");
  const subjectInput = document.querySelector("#supportSubject");
  const initialMessageInput = document.querySelector("#supportInitialMessage");
  const refreshBtn = document.querySelector("#supportRefreshBtn");
  const listEl = document.querySelector("#supportConversationList");
  const emptyEl = document.querySelector("#supportThreadEmpty");
  const threadEl = document.querySelector("#supportThreadContent");
  const titleEl = document.querySelector("#supportThreadTitle");
  const metaEl = document.querySelector("#supportThreadMeta");
  const statusEl = document.querySelector("#supportThreadStatus");
  const messagesEl = document.querySelector("#supportMessagesList");
  const replyForm = document.querySelector("#supportReplyForm");
  const replyBtn = document.querySelector("#supportReplyBtn");
  const replyInput = document.querySelector("#supportReplyMessage");
  const openCountEl = document.querySelector("#supportOverviewOpen");
  const repliedCountEl = document.querySelector("#supportOverviewReplied");
  const closedCountEl = document.querySelector("#supportOverviewClosed");

  const state = {
    conversations: [],
    selectedId: "",
  };

  const STATUS_LABELS = {
    OPEN: "Open",
    REPLIED: "Replied",
    CLOSED: "Closed",
  };

  const setMessage = (el, text, type = "") => {
    if (!(el instanceof HTMLElement)) return;
    el.textContent = text || "";
    el.classList.remove("error", "success");
    if (type) el.classList.add(type);
  };

  const statusChipClass = (status) => {
    if (status === "OPEN") return "warning";
    if (status === "REPLIED") return "active";
    return "inactive";
  };

  const setOverview = (overview) => {
    if (openCountEl instanceof HTMLElement) openCountEl.textContent = String(Number(overview?.OPEN || 0));
    if (repliedCountEl instanceof HTMLElement) repliedCountEl.textContent = String(Number(overview?.REPLIED || 0));
    if (closedCountEl instanceof HTMLElement) closedCountEl.textContent = String(Number(overview?.CLOSED || 0));
  };

  const renderConversationList = () => {
    if (!(listEl instanceof HTMLElement)) return;
    if (!state.conversations.length) {
      listEl.innerHTML = `<div class="contact-query-empty">No conversations yet.</div>`;
      return;
    }

    listEl.innerHTML = state.conversations
      .map((item) => {
        const active = item.id === state.selectedId;
        return `
          <button class="contact-query-item ${active ? "active" : ""}" type="button" data-support-conversation-id="${escapeHtml(
            item.id
          )}">
            <div class="contact-query-item-top">
              <strong>${escapeHtml(item.latestMessageText || "Conversation")}</strong>
              <span class="chip ${statusChipClass(item.status)}">${escapeHtml(STATUS_LABELS[item.status] || item.status)}</span>
            </div>
            <p>${escapeHtml(item.email || user?.email || "")}</p>
            <p>${escapeHtml(formatDateTime(item.updatedAt))}</p>
          </button>
        `;
      })
      .join("");
  };

  const renderThread = (conversation, messages) => {
    const hasConversation = conversation && typeof conversation === "object";
    if (emptyEl instanceof HTMLElement) emptyEl.classList.toggle("hidden", hasConversation);
    if (threadEl instanceof HTMLElement) threadEl.classList.toggle("hidden", !hasConversation);
    if (!hasConversation) return;

    if (titleEl instanceof HTMLElement) {
      titleEl.textContent = conversation.latestMessageText || "Support Conversation";
    }
    if (metaEl instanceof HTMLElement) {
      metaEl.textContent = `${conversation.email || user?.email || "-"} | ${formatDateTime(conversation.createdAt)}`;
    }
    if (statusEl instanceof HTMLElement) {
      statusEl.textContent = STATUS_LABELS[conversation.status] || conversation.status || "Open";
      statusEl.className = `chip ${statusChipClass(conversation.status)}`;
    }
    if (messagesEl instanceof HTMLElement) {
      messagesEl.innerHTML = Array.isArray(messages) && messages.length
        ? messages
            .map((item) => `
              <article class="contact-message-bubble ${item.senderType === "ADMIN" ? "admin" : "visitor"}">
                <div class="contact-message-meta">
                  <strong>${escapeHtml(item.senderType === "ADMIN" ? "Admin" : item.senderName || user?.name || "You")}</strong>
                  <span>${escapeHtml(formatDateTime(item.createdAt))}</span>
                </div>
                <p>${escapeHtml(item.body || "")}</p>
              </article>
            `)
            .join("")
        : `<div class="contact-query-empty">No messages yet.</div>`;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  };

  const loadConversation = async (conversationId) => {
    if (!conversationId) {
      renderThread(null, []);
      return;
    }
    state.selectedId = conversationId;
    renderConversationList();
    setMessage(replyMessageEl, "");
    try {
      const payload = await apiRequest({
        path: `/api/student/contact-queries/${encodeURIComponent(conversationId)}`,
        token,
      });
      renderThread(payload?.conversation || null, payload?.messages || []);
    } catch (error) {
      setMessage(pageMessageEl, error?.message || "Unable to load conversation.", "error");
    }
  };

  const loadConversations = async ({ preserveSelection = true } = {}) => {
    setMessage(pageMessageEl, "Loading support conversations...");
    try {
      const payload = await apiRequest({
        path: "/api/student/contact-queries",
        token,
      });
      state.conversations = Array.isArray(payload?.conversations) ? payload.conversations : [];
      setOverview(payload?.overview || {});
      if (!preserveSelection || !state.conversations.some((item) => item.id === state.selectedId)) {
        state.selectedId = state.conversations[0]?.id || "";
      }
      renderConversationList();
      setMessage(pageMessageEl, state.conversations.length ? "" : "No support conversations yet.");
      if (state.selectedId) {
        await loadConversation(state.selectedId);
      } else {
        renderThread(null, []);
      }
    } catch (error) {
      setMessage(pageMessageEl, error?.message || "Unable to load support conversations.", "error");
    }
  };

  createForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const subject = subjectInput instanceof HTMLInputElement ? subjectInput.value.trim() : "";
    const message = initialMessageInput instanceof HTMLTextAreaElement ? initialMessageInput.value.trim() : "";
    if (!subject || !message) {
      setMessage(createMessageEl, "Subject and message are required.", "error");
      return;
    }

    const originalText = createBtn instanceof HTMLButtonElement ? createBtn.textContent : "";
    try {
      if (createBtn instanceof HTMLButtonElement) {
        createBtn.disabled = true;
        createBtn.textContent = "Starting...";
      }
      setMessage(createMessageEl, "Starting conversation...");
      const payload = await apiRequest({
        path: "/api/student/contact-queries",
        method: "POST",
        token,
        body: {
          subject,
          message,
          sourcePage: "student-support",
          sourceUrl: window.location.href,
        },
      });
      if (subjectInput instanceof HTMLInputElement) subjectInput.value = "";
      if (initialMessageInput instanceof HTMLTextAreaElement) initialMessageInput.value = "";
      state.selectedId = payload?.conversation?.id || "";
      setMessage(createMessageEl, "Conversation started successfully.", "success");
      await loadConversations({ preserveSelection: true });
    } catch (error) {
      setMessage(createMessageEl, error?.message || "Unable to start conversation.", "error");
    } finally {
      if (createBtn instanceof HTMLButtonElement) {
        createBtn.disabled = false;
        createBtn.textContent = originalText || "Start Conversation";
      }
    }
  });

  refreshBtn?.addEventListener("click", () => {
    loadConversations();
  });

  listEl?.addEventListener("click", (event) => {
    const trigger = event.target instanceof HTMLElement ? event.target.closest("[data-support-conversation-id]") : null;
    if (!(trigger instanceof HTMLElement)) return;
    const conversationId = trigger.getAttribute("data-support-conversation-id") || "";
    loadConversation(conversationId);
  });

  replyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.selectedId || !(replyInput instanceof HTMLTextAreaElement)) return;
    const message = replyInput.value.trim();
    if (!message) {
      setMessage(replyMessageEl, "Message is required.", "error");
      return;
    }

    const originalText = replyBtn instanceof HTMLButtonElement ? replyBtn.textContent : "";
    try {
      if (replyBtn instanceof HTMLButtonElement) {
        replyBtn.disabled = true;
        replyBtn.textContent = "Sending...";
      }
      setMessage(replyMessageEl, "Sending message...");
      await apiRequest({
        path: `/api/student/contact-queries/${encodeURIComponent(state.selectedId)}/messages`,
        method: "POST",
        token,
        body: { message },
      });
      replyInput.value = "";
      setMessage(replyMessageEl, "Message sent successfully.", "success");
      await loadConversations({ preserveSelection: true });
      await loadConversation(state.selectedId);
    } catch (error) {
      setMessage(replyMessageEl, error?.message || "Unable to send message.", "error");
    } finally {
      if (replyBtn instanceof HTMLButtonElement) {
        replyBtn.disabled = false;
        replyBtn.textContent = originalText || "Send Reply";
      }
    }
  });

  if (logoutBtn instanceof HTMLButtonElement) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./index.html";
    });
  }

  await loadConversations({ preserveSelection: false });
});
