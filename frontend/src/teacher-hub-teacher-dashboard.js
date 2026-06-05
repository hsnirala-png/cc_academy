import { apiRequest, requireTeacherHubTeacher, setMessage } from "./teacher-hub-api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const messageEl = document.querySelector("#teacherHubTeacherDashboardMessage");
  let auth = null;
  try {
    auth = await requireTeacherHubTeacher();
  } catch (error) {
    setMessage(messageEl, error.message || "Teacher Hub is not available for this account.", "error");
    return;
  }
  if (!auth) return;
  const offeringCountEl = document.querySelector("#teacherHubTeacherOfferingCount");
  const enrollmentCountEl = document.querySelector("#teacherHubTeacherEnrollmentCount");

  try {
    const payload = await apiRequest({ path: "/teacher-hub/dashboard", token: auth.token });
    if (offeringCountEl) offeringCountEl.textContent = String(payload?.counts?.offerings || 0);
    if (enrollmentCountEl) enrollmentCountEl.textContent = String(payload?.counts?.enrollments || 0);
    setMessage(messageEl, "");
  } catch (error) {
    setMessage(messageEl, error.message || "Unable to load teacher dashboard.", "error");
  }
});
