import { apiRequest, requireTeacherHubStudent, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const messageEl = document.querySelector("#teacherHubStudentMessage");
  let auth = null;
  try {
    auth = await requireTeacherHubStudent();
  } catch (error) {
    setMessage(messageEl, error.message || "Teacher Hub is not available for this account.", "error");
    return;
  }
  if (!auth) return;
  const requirementCountEl = document.querySelector("#teacherHubStudentRequirementCount");
  const noticeCountEl = document.querySelector("#teacherHubStudentNoticeCount");

  try {
    setMessage(messageEl, "Loading Teacher Hub...");
    const [requirementsPayload, noticesPayload] = await Promise.all([
      apiRequest({ path: "/student/teacher-hub/requirements", token: auth.token }),
      apiRequest({ path: "/student/teacher-hub/notices", token: auth.token }),
    ]);
    if (requirementCountEl) requirementCountEl.textContent = `${(requirementsPayload?.requirements || []).length} requests`;
    if (noticeCountEl) noticeCountEl.textContent = `${(noticesPayload?.notices || []).length} notices`;
    setMessage(messageEl, "");
  } catch (error) {
    setMessage(messageEl, error.message || "Unable to load Teacher Hub.", "error");
  }
});
