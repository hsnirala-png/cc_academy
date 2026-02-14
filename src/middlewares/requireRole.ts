import { Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

export const requireRole = (allowedRole: Role) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (req.user.role !== allowedRole) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
};
