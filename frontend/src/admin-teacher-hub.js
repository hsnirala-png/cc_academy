import { apiRequest, requireTeacherHubAdmin, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireTeacherHubAdmin();
  if (!auth) return;
  const messageEl = document.querySelector("#adminTeacherHubMessage");
  const teachersCountEl = document.querySelector("#adminTeacherHubTeachersCount");
  const offeringsCountEl = document.querySelector("#adminTeacherHubOfferingsCount");
  const flagForm = document.querySelector("#adminTeacherHubFlagForm");
  const flagScopeInput = document.querySelector("#adminTeacherHubFlagScope");
  const flagUserIdInput = document.querySelector("#adminTeacherHubFlagUserId");
  const flagTeacherProfileIdInput = document.querySelector("#adminTeacherHubFlagTeacherProfileId");
  const flagEnabledInput = document.querySelector("#adminTeacherHubFlagEnabled");
  const flagNoteInput = document.querySelector("#adminTeacherHubFlagNote");
  const flagsListEl = document.querySelector("#adminTeacherHubFlagsList");

  const load = async () => {
    const payload = await apiRequest({ path: "/api/admin/teacher-hub/overview", token: auth.token });
    const flagsPayload = await apiRequest({ path: "/api/admin/teacher-hub/feature-flags", token: auth.token });
    if (teachersCountEl) teachersCountEl.textContent = String(payload?.overview?.teachers || 0);
    if (offeringsCountEl) offeringsCountEl.textContent = String(payload?.overview?.offerings || 0);
    if (flagsListEl instanceof HTMLElement) {
      const flags = flagsPayload?.flags || [];
      flagsListEl.innerHTML = flags.length
        ? flags
            .map(
              (item) => `
                <article class="teacher-hub-item">
                  <strong>${item.scopeType}</strong>
                  <div class="teacher-hub-chip-row">
                    <span class="teacher-hub-chip">${item.isEnabled ? "Enabled" : "Disabled"}</span>
                    <span class="teacher-hub-chip">${item.userId || item.teacherProfileId || "global"}</span>
                  </div>
                  <p>${item.note || ""}</p>
                </article>
              `
            )
            .join("")
        : `<div class="teacher-hub-empty">No Teacher Hub feature flags saved yet.</div>`;
    }
  };

  flagForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setMessage(messageEl, "Saving feature flag...");
      await apiRequest({
        path: "/api/admin/teacher-hub/feature-flags",
        method: "POST",
        token: auth.token,
        body: {
          scopeType: flagScopeInput?.value || "GLOBAL",
          userId: flagUserIdInput?.value || undefined,
          teacherProfileId: flagTeacherProfileIdInput?.value || undefined,
          isEnabled: (flagEnabledInput?.value || "true") === "true",
          note: flagNoteInput?.value || undefined,
        },
      });
      if (flagForm instanceof HTMLFormElement) flagForm.reset();
      await load();
      setMessage(messageEl, "Feature flag saved.", "success");
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to save Teacher Hub feature flag.", "error");
    }
  });

  await load().catch((error) =>
    setMessage(messageEl, error.message || "Unable to load admin Teacher Hub overview.", "error")
  );
});
