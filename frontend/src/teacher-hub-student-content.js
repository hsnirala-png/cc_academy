import { apiRequest, escapeHtml, formatDateTime, requireTeacherHubStudent, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const messageEl = document.querySelector("#teacherHubContentMessage");
  let auth = null;
  try {
    auth = await requireTeacherHubStudent();
  } catch (error) {
    setMessage(messageEl, error.message || "Teacher Hub is not available for this account.", "error");
    return;
  }
  if (!auth) return;
  const listEl = document.querySelector("#teacherHubContentList");

  try {
    const payload = await apiRequest({ path: "/student/teacher-hub/content", token: auth.token });
    const content = payload?.content || [];
    if (!(listEl instanceof HTMLElement)) return;
    if (!content.length) {
      listEl.innerHTML = `<div class="teacher-hub-empty">No teacher content yet.</div>`;
      return;
    }
    listEl.innerHTML = content
      .map(
        (item) => `
        <article class="teacher-hub-item">
          <h3>${escapeHtml(item.title)}</h3>
          <div class="teacher-hub-chip-row">
            <span class="teacher-hub-chip">${escapeHtml(item.contentType)}</span>
            <span class="teacher-hub-chip">${escapeHtml(item.visibility)}</span>
          </div>
          <p>${escapeHtml(item.body || "No body text.")}</p>
          ${
            Array.isArray(item.attachments) && item.attachments.length
              ? `<div class="teacher-hub-list">${item.attachments
                  .map(
                    (attachment) => `
                    <article class="teacher-hub-item">
                      <strong>${escapeHtml(attachment.fileName)}</strong>
                      <div class="teacher-hub-actions"><a class="btn-secondary" href="${escapeHtml(attachment.storageUrl)}" target="_blank" rel="noreferrer">Open File</a></div>
                    </article>
                  `
                  )
                  .join("")}</div>`
              : ""
          }
          <small>${escapeHtml(formatDateTime(item.createdAt))}</small>
        </article>
      `
      )
      .join("");
  } catch (error) {
    setMessage(messageEl, error.message || "Unable to load teacher content.", "error");
  }
});
