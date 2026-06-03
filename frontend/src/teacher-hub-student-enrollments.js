import { apiRequest, escapeHtml, requireTeacherHubStudent, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const messageEl = document.querySelector("#teacherHubEnrollmentsMessage");
  let auth = null;
  try {
    auth = await requireTeacherHubStudent();
  } catch (error) {
    setMessage(messageEl, error.message || "Teacher Hub is not available for this account.", "error");
    return;
  }
  if (!auth) return;
  const listEl = document.querySelector("#teacherHubEnrollmentsList");

  const load = async () => {
    const payload = await apiRequest({ path: "/student/teacher-hub/enrollments", token: auth.token });
    const enrollments = payload?.enrollments || [];
    if (!(listEl instanceof HTMLElement)) return;
    if (!enrollments.length) {
      listEl.innerHTML = `<div class="teacher-hub-empty">No active teacher enrollments yet.</div>`;
      return;
    }

    const previews = await Promise.all(
      enrollments.map(async (item) => {
        try {
          const previewPayload = await apiRequest({
            path: `/student/teacher-hub/enrollments/${encodeURIComponent(item.id)}/orders/preview`,
            token: auth.token,
          });
          return { enrollmentId: item.id, preview: previewPayload?.preview || null };
        } catch {
          return { enrollmentId: item.id, preview: null };
        }
      })
    );
    const previewMap = new Map(previews.map((item) => [item.enrollmentId, item.preview]));

    listEl.innerHTML = enrollments
      .map((item) => {
        const preview = previewMap.get(item.id);
        return `
          <article class="teacher-hub-item">
            <h3>${escapeHtml(item.mode)} Enrollment</h3>
            <div class="teacher-hub-chip-row">
              <span class="teacher-hub-chip">${escapeHtml(item.status)}</span>
              <span class="teacher-hub-chip">${escapeHtml(item.billingCycle)}</span>
            </div>
            <p>Enrollment ID: <code>${escapeHtml(item.id)}</code></p>
            <p>Cycle: ${escapeHtml(item.currentCycleStart || "-")} to ${escapeHtml(item.currentCycleEnd || "-")}</p>
            <p>${preview ? `Cycle gross amount: Rs ${Number(preview.grossAmount || 0).toFixed(2)}` : "Order preview unavailable."}</p>
          </article>
        `;
      })
      .join("");
  };

  await load().catch((error) => setMessage(messageEl, error.message || "Unable to load enrollments.", "error"));
});
