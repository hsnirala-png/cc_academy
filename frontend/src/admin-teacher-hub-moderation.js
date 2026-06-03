import { apiRequest, escapeHtml, requireTeacherHubAdmin, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireTeacherHubAdmin();
  if (!auth) return;
  const form = document.querySelector("#adminTeacherHubModerationForm");
  const scopeTypeInput = document.querySelector("#adminModerationScopeType");
  const teacherProfileInput = document.querySelector("#adminModerationTeacherProfileId");
  const reasonInput = document.querySelector("#adminModerationReason");
  const detailsInput = document.querySelector("#adminModerationDetails");
  const messageEl = document.querySelector("#adminTeacherHubModerationMessage");
  const listEl = document.querySelector("#adminTeacherHubModerationList");

  const load = async () => {
    const payload = await apiRequest({ path: "/api/admin/teacher-hub/moderation", token: auth.token });
    const flags = payload?.flags || [];
    if (!(listEl instanceof HTMLElement)) return;
    listEl.innerHTML = flags.length
      ? flags
          .map(
            (item) => `
              <article class="teacher-hub-item">
                <strong>${escapeHtml(item.reason)}</strong>
                <div class="teacher-hub-chip-row">
                  <span class="teacher-hub-chip">${escapeHtml(item.scopeType)}</span>
                  <span class="teacher-hub-chip">${escapeHtml(item.status)}</span>
                </div>
                <p>${escapeHtml(item.details || "")}</p>
                <div class="teacher-hub-actions">
                  <button class="btn-secondary" data-flag-id="${escapeHtml(item.id)}" data-status="RESOLVED" type="button">Resolve</button>
                </div>
              </article>
            `
          )
          .join("")
      : `<div class="teacher-hub-empty">No moderation flags yet.</div>`;
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setMessage(messageEl, "Creating moderation flag...");
      await apiRequest({
        path: "/api/admin/teacher-hub/moderation",
        method: "POST",
        token: auth.token,
        body: {
          scopeType: scopeTypeInput?.value || "CONTENT",
          teacherProfileId: teacherProfileInput?.value || undefined,
          reason: reasonInput?.value || "",
          details: detailsInput?.value || undefined,
        },
      });
      if (form instanceof HTMLFormElement) form.reset();
      await load();
      setMessage(messageEl, "Moderation flag created.", "success");
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to create moderation flag.", "error");
    }
  });

  listEl?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const flagId = target.getAttribute("data-flag-id");
    if (!flagId) return;
    try {
      await apiRequest({
        path: `/api/admin/teacher-hub/moderation/${encodeURIComponent(flagId)}`,
        method: "PATCH",
        token: auth.token,
        body: { status: target.getAttribute("data-status") || "RESOLVED" },
      });
      await load();
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to update moderation flag.", "error");
    }
  });

  await load().catch((error) => setMessage(messageEl, error.message || "Unable to load moderation flags.", "error"));
});
