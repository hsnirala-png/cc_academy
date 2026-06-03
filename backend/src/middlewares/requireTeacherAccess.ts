import { NextFunction, Request, Response } from "express";
import { teacherFeatureFlagService } from "../modules/teacher-hub/teacher-feature-flag.service";
import { teacherProfileService } from "../modules/teacher-hub/teacher-profile.service";

export const requireTeacherAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId || "";
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const profile = await teacherProfileService.getApprovedProfileByUserId(userId);
    if (!profile) {
      res.status(403).json({ message: "Teacher access is not approved for this account." });
      return;
    }
    const enabled = await teacherFeatureFlagService.isEnabledForUser(userId, profile.id);
    if (!enabled) {
      res.status(404).json({ message: "Teacher Hub is disabled for this teacher account." });
      return;
    }
    (req as any).teacherHub = {
      teacherProfileId: profile.id,
      profile,
    };
    next();
  } catch (error) {
    next(error);
  }
};
