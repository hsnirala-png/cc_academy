import {
  apiRequest,
  clearAuth,
  escapeHtml,
  formatDateTime,
  getStoredToken,
  getStoredUser,
  goToAdminLogin,
  goToStudentLogin,
  requireRoleGuard,
} from "./mock-api.js?v=4";

export { apiRequest, clearAuth, escapeHtml, formatDateTime, getStoredToken, getStoredUser };

export const requireTeacherHubStudent = async () => {
  const auth = requireRoleGuard("STUDENT");
  if (!auth) return null;
  await apiRequest({ path: "/student/teacher-hub/bootstrap", token: auth.token });
  return auth;
};

export const requireTeacherHubTeacher = async ({ allowCandidate = false } = {}) => {
  const auth = requireRoleGuard(["STUDENT", "ADMIN"]);
  if (!auth) return null;
  const payload = await apiRequest({ path: "/teacher-hub/bootstrap", token: auth.token });
  const hasApprovedTeacherAccess = Boolean(payload?.access?.hasApprovedTeacherAccess);
  if (!allowCandidate && !hasApprovedTeacherAccess) {
    window.location.href = "./teacher-hub-teacher-profile.html";
    return null;
  }
  return auth;
};

export const requireTeacherHubAdmin = async () => {
  const auth = requireRoleGuard("ADMIN");
  if (!auth) return null;
  return auth;
};

export const setMessage = (element, text, type = "") => {
  if (!(element instanceof HTMLElement)) return;
  element.textContent = text || "";
  element.classList.remove("error", "success");
  if (type) element.classList.add(type);
};

export const redirectTeacherHubByRole = (user) => {
  const role = String(user?.role || "").trim().toUpperCase();
  if (role === "ADMIN") goToAdminLogin();
  else goToStudentLogin();
};
