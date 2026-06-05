import { apiRequest, escapeHtml, formatDateTime, requireTeacherHubStudent, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const messageEl = document.querySelector("#teacherHubNoticesMessage");
  let auth = null;
  try {
    auth = await requireTeacherHubStudent();
  } catch (error) {
    setMessage(messageEl, error.message || "Teacher Hub is not available for this account.", "error");
    return;
  }
  if (!auth) return;
  const listEl = document.querySelector("#teacherHubNoticesList");

  const load = async () => {
    const payload = await apiRequest({ path: "/student/teacher-hub/notices", token: auth.token });
    const notices = payload?.notices || [];
    if (!(listEl instanceof HTMLElement)) return;
    if (!notices.length) {
      listEl.innerHTML = `<div class="teacher-hub-empty">No notices yet.</div>`;
      return;
    }
    listEl.innerHTML = notices
      .map(
        (item) => `
        <article class="teacher-hub-item">
          <h3>${escapeHtml(item.title)}</h3>
          <div class="teacher-hub-chip-row">
            <span class="teacher-hub-chip">${item.readAt ? "Read" : "Unread"}</span>
            <span class="teacher-hub-chip">${escapeHtml(item.targetType)}</span>
          </div>
          <p>${escapeHtml(item.body)}</p>
          <small>${escapeHtml(formatDateTime(item.publishedAt || item.createdAt))}</small>
          ${item.readAt ? "" : `<div class="teacher-hub-actions"><button class="btn-secondary" data-read-notice="${escapeHtml(item.id)}" type="button">Mark Read</button></div>`}
        </article>
      `
      )
      .join("");
  };

  listEl?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const noticeId = target.getAttribute("data-read-notice");
    if (!noticeId) return;
    try {
      await apiRequest({
        path: `/student/teacher-hub/notices/${encodeURIComponent(noticeId)}/read`,
        method: "POST",
        token: auth.token,
      });
      await load();
    } catch (error) {
      setMessage(messageEl, error.message || "Unable to update notice.", "error");
    }
  });

  await load().catch((error) => setMessage(messageEl, error.message || "Unable to load notices.", "error"));
});
