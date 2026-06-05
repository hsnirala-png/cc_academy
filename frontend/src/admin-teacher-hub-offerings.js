import { apiRequest, escapeHtml, requireTeacherHubAdmin, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireTeacherHubAdmin();
  if (!auth) return;
  const messageEl = document.querySelector("#adminTeacherHubOfferingsMessage");
  const listEl = document.querySelector("#adminTeacherHubOfferingsList");

  const load = async () => {
    const payload = await apiRequest({ path: "/api/admin/teacher-hub/offerings", token: auth.token });
    const offerings = payload?.offerings || [];
    if (!(listEl instanceof HTMLElement)) return;
    listEl.innerHTML = offerings.length
      ? offerings
          .map(
            (item) => `
              <article class="teacher-hub-item">
                <strong>${escapeHtml(item.title)}</strong>
                <div class="teacher-hub-chip-row">
                  <span class="teacher-hub-chip">${escapeHtml(item.status)}</span>
                  <span class="teacher-hub-chip">${escapeHtml(item.mode)}</span>
                </div>
                <p>${escapeHtml(item.description || "")}</p>
                <div class="teacher-hub-actions">
                  <button class="btn-secondary" data-offering-id="${escapeHtml(item.id)}" data-publish="true" type="button">Publish</button>
                  <button class="btn-secondary" data-offering-id="${escapeHtml(item.id)}" data-publish="false" type="button">Unpublish</button>
                </div>
              </article>
            `
          )
          .join("")
      : `<div class="teacher-hub-empty">No teacher offerings yet.</div>`;
  };

  listEl?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const offeringId = target.getAttribute("data-offering-id");
    if (!offeringId) return;
    try {
      const isPublished = target.getAttribute("data-publish") === "true";
      await apiRequest({
        path: `/api/admin/teacher-hub/offerings/${encodeURIComponent(offeringId)}`,
        method: "PATCH",
        token: auth.token,
        body: {
          isPublished,
          status: isPublished ? "PUBLISHED" : "DRAFT",
        },
      });
      await load();
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to update offering.", "error");
    }
  });

  await load().catch((error) => setMessage(messageEl, error.message || "Unable to load offerings.", "error"));
});
