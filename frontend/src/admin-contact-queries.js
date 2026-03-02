import {
  apiRequest,
  clearAuth,
  escapeHtml,
  formatDateTime,
  requireRoleGuardStrict,
} from "./mock-api.js?v=2";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireRoleGuardStrict(null, "ADMIN");
  if (!auth) return;
  const { token } = auth;

  const messageEl = document.querySelector("#contactQueriesMessage");
  const replyMessageEl = document.querySelector("#contactReplyMessageText");
  const logoutBtn = document.querySelector("#adminLogoutBtn");
  const listEl = document.querySelector("#contactQueryList");
  const emptyStateEl = document.querySelector("#contactThreadEmptyState");
  const threadContentEl = document.querySelector("#contactThreadContent");
  const searchInput = document.querySelector("#contactQuerySearch");
  const statusFilterInput = document.querySelector("#contactQueryStatusFilter");
  const applyBtn = document.querySelector("#contactQuerySearchBtn");
  const refreshBtn = document.querySelector("#contactQueryRefreshBtn");
  const nameEl = document.querySelector("#contactThreadName");
  const metaEl = document.querySelector("#contactThreadMeta");
  const statusChipEl = document.querySelector("#contactThreadStatusChip");
  const statusSelect = document.querySelector("#contactThreadStatusSelect");
  const statusSaveBtn = document.querySelector("#contactThreadStatusSaveBtn");
  const messagesListEl = document.querySelector("#contactMessagesList");
  const replyForm = document.querySelector("#contactReplyForm");
  const replyInput = document.querySelector("#contactReplyMessage");
  const replyStatusInput = document.querySelector("#contactReplyStatus");
  const replySubmitBtn = document.querySelector("#contactReplySubmitBtn");
  const openCountEl = document.querySelector("#contactOverviewOpen");
  const repliedCountEl = document.querySelector("#contactOverviewReplied");
  const closedCountEl = document.querySelector("#contactOverviewClosed");

  const state = {
    conversations: [],
    selectedConversationId: "",
  };

  const STATUS_LABELS = {
    OPEN: "Open",
    REPLIED: "Replied",
    CLOSED: "Closed",
  };

  const setMessage = (text, type = "") => {
    if (!(messageEl instanceof HTMLElement)) return;
    messageEl.textContent = text || "";
    messageEl.classList.remove("error", "success");
    if (type) messageEl.classList.add(type);
  };

  const setReplyMessage = (text, type = "") => {
    if (!(replyMessageEl instanceof HTMLElement)) return;
    replyMessageEl.textContent = text || "";
    replyMessageEl.classList.remove("error", "success");
    if (type) replyMessageEl.classList.add(type);
  };

  const setOverview = (overview) => {
    if (openCountEl instanceof HTMLElement) openCountEl.textContent = String(Number(overview?.OPEN || 0));
    if (repliedCountEl instanceof HTMLElement) repliedCountEl.textContent = String(Number(overview?.REPLIED || 0));
    if (closedCountEl instanceof HTMLElement) closedCountEl.textContent = String(Number(overview?.CLOSED || 0));
  };

  const statusChipClass = (status) => {
    if (status === "OPEN") return "warning";
    if (status === "REPLIED") return "active";
    return "inactive";
  };

  const renderList = () => {
    if (!(listEl instanceof HTMLElement)) return;
    if (!state.conversations.length) {
      listEl.innerHTML = `<div class="contact-query-empty">No contact queries found.</div>`;
      return;
    }

    listEl.innerHTML = state.conversations
      .map((item) => {
        const isActive = item.id === state.selectedConversationId;
        return `
          <button class="contact-query-item ${isActive ? "active" : ""}" type="button" data-contact-conversation-id="${escapeHtml(
            item.id
          )}">
            <div class="contact-query-item-top">
              <strong>${escapeHtml(item.name)}</strong>
              <span class="chip ${statusChipClass(item.status)}">${escapeHtml(STATUS_LABELS[item.status] || item.status)}</span>
            </div>
            <p>${escapeHtml(item.email)}</p>
            <p>${escapeHtml(item.latestMessageText || "No messages yet.")}</p>
            <div class="contact-query-item-bottom">
              <span>${escapeHtml(item.sourcePage || "landing")}</span>
              <span>${escapeHtml(formatDateTime(item.updatedAt))}</span>
            </div>
          </button>
        `;
      })
      .join("");
  };

  const renderThread = (conversation, messages) => {
    const hasConversation = conversation && typeof conversation === "object";
    if (emptyStateEl instanceof HTMLElement) emptyStateEl.classList.toggle("hidden", hasConversation);
    if (threadContentEl instanceof HTMLElement) threadContentEl.classList.toggle("hidden", !hasConversation);
    if (!hasConversation) return;

    if (nameEl instanceof HTMLElement) nameEl.textContent = conversation.name || "-";
    if (metaEl instanceof HTMLElement) {
      const metaParts = [conversation.email || "-", conversation.sourcePage || "landing"];
      if (conversation.sourceUrl) metaParts.push(conversation.sourceUrl);
      metaEl.textContent = metaParts.filter(Boolean).join(" | ");
    }
    if (statusChipEl instanceof HTMLElement) {
      statusChipEl.textContent = STATUS_LABELS[conversation.status] || conversation.status || "Open";
      statusChipEl.className = `chip ${statusChipClass(conversation.status)}`;
    }
    if (statusSelect instanceof HTMLSelectElement) {
      statusSelect.value = conversation.status || "OPEN";
    }

    if (messagesListEl instanceof HTMLElement) {
      messagesListEl.innerHTML = Array.isArray(messages) && messages.length
        ? messages
            .map((item) => `
              <article class="contact-message-bubble ${item.senderType === "ADMIN" ? "admin" : "visitor"}">
                <div class="contact-message-meta">
                  <strong>${escapeHtml(item.senderName || (item.senderType === "ADMIN" ? "Admin" : "Visitor"))}</strong>
                  <span>${escapeHtml(formatDateTime(item.createdAt))}</span>
                </div>
                ${item.senderEmail ? `<p class="contact-message-email">${escapeHtml(item.senderEmail)}</p>` : ""}
                <p>${escapeHtml(item.body || "")}</p>
              </article>
            `)
            .join("")
        : `<div class="contact-query-empty">No messages in this conversation.</div>`;
      messagesListEl.scrollTop = messagesListEl.scrollHeight;
    }
  };

  const loadConversations = async ({ preserveSelection = true } = {}) => {
    setMessage("Loading contact queries...");
    try {
      const payload = await apiRequest({
        path: "/api/admin/contact-queries",
        token,
        query: {
          status: statusFilterInput instanceof HTMLSelectElement ? statusFilterInput.value : "",
          search: searchInput instanceof HTMLInputElement ? searchInput.value.trim() : "",
        },
      });
      state.conversations = Array.isArray(payload?.conversations) ? payload.conversations : [];
      setOverview(payload?.overview || {});

      if (!preserveSelection || !state.conversations.some((item) => item.id === state.selectedConversationId)) {
        state.selectedConversationId = state.conversations[0]?.id || "";
      }

      renderList();
      setMessage(state.conversations.length ? "" : "No contact queries found.");
      if (state.selectedConversationId) {
        await loadConversation(state.selectedConversationId);
      } else {
        renderThread(null, []);
      }
    } catch (error) {
      setMessage(error?.message || "Unable to load contact queries.", "error");
    }
  };

  const loadConversation = async (conversationId) => {
    if (!conversationId) {
      renderThread(null, []);
      return;
    }
    state.selectedConversationId = conversationId;
    renderList();
    setReplyMessage("");
    try {
      const payload = await apiRequest({
        path: `/api/admin/contact-queries/${encodeURIComponent(conversationId)}`,
        token,
      });
      renderThread(payload?.conversation || null, payload?.messages || []);
    } catch (error) {
      setMessage(error?.message || "Unable to load conversation.", "error");
    }
  };

  applyBtn?.addEventListener("click", () => {
    loadConversations({ preserveSelection: false });
  });

  refreshBtn?.addEventListener("click", () => {
    loadConversations();
  });

  statusSaveBtn?.addEventListener("click", async () => {
    if (!state.selectedConversationId || !(statusSelect instanceof HTMLSelectElement)) return;
    setReplyMessage("Saving conversation status...");
    try {
      await apiRequest({
        path: `/api/admin/contact-queries/${encodeURIComponent(state.selectedConversationId)}/status`,
        method: "PATCH",
        token,
        body: { status: statusSelect.value },
      });
      setReplyMessage("Conversation status updated.", "success");
      await loadConversations();
    } catch (error) {
      setReplyMessage(error?.message || "Unable to update conversation status.", "error");
    }
  });

  listEl?.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-contact-conversation-id]") : null;
    if (!(target instanceof HTMLElement)) return;
    const conversationId = target.getAttribute("data-contact-conversation-id") || "";
    loadConversation(conversationId);
  });

  replyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.selectedConversationId || !(replyInput instanceof HTMLTextAreaElement)) return;
    const message = replyInput.value.trim();
    if (!message) {
      setReplyMessage("Reply is required.", "error");
      return;
    }

    const originalLabel = replySubmitBtn instanceof HTMLButtonElement ? replySubmitBtn.textContent : "";
    try {
      if (replySubmitBtn instanceof HTMLButtonElement) {
        replySubmitBtn.disabled = true;
        replySubmitBtn.textContent = "Saving...";
      }
      setReplyMessage("Saving reply...");
      await apiRequest({
        path: `/api/admin/contact-queries/${encodeURIComponent(state.selectedConversationId)}/messages`,
        method: "POST",
        token,
        body: {
          message,
          status: replyStatusInput instanceof HTMLSelectElement ? replyStatusInput.value : "REPLIED",
        },
      });
      replyInput.value = "";
      setReplyMessage("Reply saved successfully.", "success");
      await loadConversations();
      await loadConversation(state.selectedConversationId);
    } catch (error) {
      setReplyMessage(error?.message || "Unable to save reply.", "error");
    } finally {
      if (replySubmitBtn instanceof HTMLButtonElement) {
        replySubmitBtn.disabled = false;
        replySubmitBtn.textContent = originalLabel || "Save Reply";
      }
    }
  });

  if (logoutBtn instanceof HTMLButtonElement) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./admin-login.html";
    });
  }

  await loadConversations({ preserveSelection: false });
});
