export const TEACHER_HUB_FLAG_KEY = "TEACHER_HUB_PHASE1";

export const isTeacherHubEnvEnabled = (): boolean =>
  String(process.env.TEACHER_HUB_ENABLED || "")
    .trim()
    .toLowerCase() === "true";

export const isTeacherHubAdminBypassEnabled = (): boolean =>
  String(process.env.TEACHER_HUB_ALLOW_ADMIN || "")
    .trim()
    .toLowerCase() === "true";
