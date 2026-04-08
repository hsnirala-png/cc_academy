import {
  apiRequest,
  clearAuth,
  escapeHtml,
  formatDateTime,
  initHeaderBehavior,
  requireRoleGuard,
  requireRoleGuardStrict,
} from "./mock-api.js?v=2";

const PROMOTED_MIN_OCCURRENCES = 2;
const PROMOTED_MIN_IMPORTANCE = 4;

const isPromotedDoubt = (doubt) =>
  Number(doubt?.occurrenceCount || 0) >= PROMOTED_MIN_OCCURRENCES &&
  Number(doubt?.importanceScore || 0) >= PROMOTED_MIN_IMPORTANCE;

const toPreviewText = (value, max = 180) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "-";
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3).trim()}...`;
};

const toNumberText = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? String(parsed) : "0";
};

document.addEventListener("DOMContentLoaded", async () => {
  const auth = requireRoleGuard("ADMIN");
  if (!auth) return;
  const strictAuth = await requireRoleGuardStrict(auth, "ADMIN");
  if (!strictAuth) return;
  initHeaderBehavior();

  const { token } = strictAuth;
  const messageEl = document.querySelector("#tuitionCacheMessage");
  const topicInput = document.querySelector("#tuitionCacheTopicInput");
  const limitInput = document.querySelector("#tuitionCacheLimitInput");
  const refreshBtn = document.querySelector("#tuitionCacheRefreshBtn");
  const applyBtn = document.querySelector("#tuitionCacheApplyBtn");
  const logoutBtn = document.querySelector("#adminLogoutBtn");
  const cacheCountEl = document.querySelector("#tuitionCacheCount");
  const doubtCountEl = document.querySelector("#tuitionDoubtCount");
  const promotedCountEl = document.querySelector("#tuitionPromotedCount");
  const avgHitCountEl = document.querySelector("#tuitionAverageHitCount");
  const cacheTableBody = document.querySelector("#tuitionCacheTableBody");
  const doubtTableBody = document.querySelector("#tuitionDoubtTableBody");

  const setMessage = (text, type = "") => {
    if (!(messageEl instanceof HTMLElement)) return;
    messageEl.textContent = text || "";
    messageEl.className = "form-message";
    if (type) messageEl.classList.add(type);
  };

  const renderCaches = (caches) => {
    if (!(cacheTableBody instanceof HTMLElement)) return;
    if (!Array.isArray(caches) || !caches.length) {
      cacheTableBody.innerHTML =
        '<tr><td colspan="4" class="tuition-cache-empty">No saved lesson caches found for this filter.</td></tr>';
      return;
    }

    cacheTableBody.innerHTML = caches
      .map((cache) => {
        const subject = escapeHtml(cache.subjectName || "-");
        const topic = escapeHtml(cache.topicTitle || "-");
        const promptText = escapeHtml(toPreviewText(cache.promptText, 120));
        const promptType = escapeHtml(cache.promptType || "UNKNOWN");
        const explanationLanguage = escapeHtml(cache.explanationLanguage || "-");
        const boardLanguage = escapeHtml(cache.boardLanguage || "-");
        const voiceLanguage = escapeHtml(cache.voiceLanguage || "-");
        const depth = escapeHtml(cache.teachingDepth || "-");
        const board = escapeHtml(cache.boardName || "General");
        const usageText = `${toNumberText(cache.hitCount)} hits`;
        return `
          <tr>
            <td>
              <div><strong>${topic}</strong></div>
              <div class="tuition-cache-meta">
                <span>${subject}</span>
                <span>${escapeHtml(formatDateTime(cache.updatedAt))}</span>
              </div>
            </td>
            <td>
              <div class="tuition-cache-meta">
                <span>${board} board</span>
                <span>${explanationLanguage} / ${boardLanguage} / ${voiceLanguage}</span>
                <span>${depth}</span>
              </div>
            </td>
            <td>
              <div style="margin-bottom:0.35rem;">
                <span class="tuition-chip cache-prompt">${promptType}</span>
              </div>
              <div class="tuition-cache-text">${promptText}</div>
            </td>
            <td>
              <div style="margin-bottom:0.35rem;">
                <span class="tuition-chip cache-hit">${escapeHtml(usageText)}</span>
              </div>
              <div class="tuition-cache-meta">
                <span>Generated: ${escapeHtml(formatDateTime(cache.generatedAt))}</span>
                <span>Last used: ${escapeHtml(formatDateTime(cache.lastUsedAt))}</span>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const renderDoubts = (doubts) => {
    if (!(doubtTableBody instanceof HTMLElement)) return;
    if (!Array.isArray(doubts) || !doubts.length) {
      doubtTableBody.innerHTML =
        '<tr><td colspan="4" class="tuition-cache-empty">No repeated doubts found for this filter.</td></tr>';
      return;
    }

    doubtTableBody.innerHTML = doubts
      .map((doubt) => {
        const promoted = isPromotedDoubt(doubt);
        const answerPreview = escapeHtml(
          toPreviewText(
            doubt?.answerPayloadJson?.teacherExplanation ||
              doubt?.answerPayloadJson?.replyText ||
              doubt?.answerPayloadJson?.boardState?.currentConcept ||
              "",
            150
          )
        );
        return `
          <tr>
            <td>
              <div class="tuition-cache-text"><strong>${escapeHtml(toPreviewText(doubt.questionText, 180))}</strong></div>
              <div style="margin-top:0.45rem;">
                <span class="tuition-chip ${promoted ? "promoted" : "neutral"}">${
                  promoted ? "Promoted candidate" : "Observed doubt"
                }</span>
              </div>
            </td>
            <td>
              <div class="tuition-cache-meta">
                <span>Importance: ${escapeHtml(toNumberText(doubt.importanceScore))}</span>
                <span>Asked: ${escapeHtml(toNumberText(doubt.occurrenceCount))} times</span>
                <span>Last asked: ${escapeHtml(formatDateTime(doubt.lastAskedAt))}</span>
              </div>
            </td>
            <td>
              <div class="tuition-cache-meta">
                <span><strong>${escapeHtml(doubt.topicTitle || "-")}</strong></span>
                <span>${escapeHtml(doubt.subjectName || "-")}</span>
                <span>${escapeHtml(doubt.explanationLanguage || "-")} / ${escapeHtml(doubt.boardLanguage || "-")}</span>
              </div>
            </td>
            <td>
              <div class="tuition-cache-text">${answerPreview}</div>
            </td>
          </tr>
        `;
      })
      .join("");
  };

  const renderOverview = (payload) => {
    const caches = Array.isArray(payload?.caches) ? payload.caches : [];
    const doubts = Array.isArray(payload?.doubts) ? payload.doubts : [];
    const promotedCount = doubts.filter(isPromotedDoubt).length;
    const averageHitCount =
      caches.length > 0
        ? (caches.reduce((sum, cache) => sum + Number(cache?.hitCount || 0), 0) / caches.length).toFixed(1)
        : "0";

    if (cacheCountEl instanceof HTMLElement) {
      cacheCountEl.textContent = toNumberText(payload?.counts?.caches);
    }
    if (doubtCountEl instanceof HTMLElement) {
      doubtCountEl.textContent = toNumberText(payload?.counts?.doubts);
    }
    if (promotedCountEl instanceof HTMLElement) {
      promotedCountEl.textContent = String(promotedCount);
    }
    if (avgHitCountEl instanceof HTMLElement) {
      avgHitCountEl.textContent = averageHitCount;
    }
  };

  const loadInspectorData = async () => {
    const topic = topicInput instanceof HTMLInputElement ? topicInput.value.trim() : "";
    const limit = limitInput instanceof HTMLSelectElement ? limitInput.value : "20";
    setMessage("Loading AI Teacher cache data...");
    try {
      const payload = await apiRequest({
        path: "/admin/tuition/lesson-cache",
        token,
        query: {
          topic,
          limit,
        },
      });
      renderOverview(payload);
      renderCaches(payload?.caches || []);
      renderDoubts(payload?.doubts || []);
      setMessage("AI Teacher cache data loaded.", "success");
    } catch (error) {
      renderCaches([]);
      renderDoubts([]);
      setMessage(error?.message || "Could not load AI Teacher cache data.", "error");
    }
  };

  if (refreshBtn instanceof HTMLButtonElement) {
    refreshBtn.addEventListener("click", loadInspectorData);
  }

  if (applyBtn instanceof HTMLButtonElement) {
    applyBtn.addEventListener("click", loadInspectorData);
  }

  if (topicInput instanceof HTMLInputElement) {
    topicInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void loadInspectorData();
      }
    });
  }

  if (logoutBtn instanceof HTMLButtonElement) {
    logoutBtn.addEventListener("click", () => {
      clearAuth();
      window.location.href = "./admin-login.html";
    });
  }

  await loadInspectorData();
});
