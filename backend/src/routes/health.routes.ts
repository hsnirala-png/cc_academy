import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    app: "CC Academy",
    time: new Date().toISOString(),
  });
});
