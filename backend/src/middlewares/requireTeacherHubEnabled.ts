import { NextFunction, Request, Response } from "express";
import { teacherFeatureFlagService } from "../modules/teacher-hub/teacher-feature-flag.service";
import { teacherProfileService } from "../modules/teacher-hub/teacher-profile.service";

export const requireTeacherHubEnabled = (mode: "student" | "teacher" | "admin" = "student") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (mode === "admin") {
        const enabled = await teacherFeatureFlagService.isEnabledForAdmin();
        if (!enabled) {
          res.status(404).json({ message: "Teacher Hub is disabled for this environment." });
          return;
        }
        next();
        return;
      }

      const userId = req.user?.userId || "";
      const profile = mode === "teacher" && userId
        ? await teacherProfileService.getProfileByUserId(userId)
        : null;
      const enabled = await teacherFeatureFlagService.isEnabledForUser(userId, profile?.id || null);
      if (!enabled) {
        res.status(404).json({ message: "Teacher Hub is disabled for this account." });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
