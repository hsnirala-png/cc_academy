import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../utils/appError";

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDev = String(process.env.NODE_ENV || "").toLowerCase() !== "production";
  const errMessage = err instanceof Error ? String(err.message || "") : "";
  const isDbConnectivityMessage =
    errMessage.includes("Can't reach database server") ||
    errMessage.includes("Authentication failed") ||
    errMessage.includes("Timed out fetching a new connection from the connection pool") ||
    errMessage.toLowerCase().includes("connection pool");

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.issues.map((issue) => issue.message).join(", ");
    res.status(400).json({ message });
    return;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    const rawMessage = String(err.message || "");
    const isConnectionIssue =
      rawMessage.includes("Can't reach database server") ||
      rawMessage.includes("Authentication failed") ||
      rawMessage.includes("timed out");
    res.status(503).json({
      message: isConnectionIssue
        ? "Database connection failed. Please verify DATABASE_URL and database availability."
        : "Database initialization failed. Please check backend configuration.",
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2024") {
      res.status(503).json({
        message: "Database is busy (connection pool timeout). Please retry in a few seconds.",
      });
      return;
    }

    if (err.code === "P2021") {
      res.status(500).json({
        message: "Database schema mismatch detected. Please run Prisma migrations.",
      });
      return;
    }
  }

  if (isDbConnectivityMessage) {
    res.status(503).json({
      message: "Database connection failed. Please verify database host, port, and credentials.",
    });
    return;
  }

  console.error("Unhandled error:", err);
  if (isDev && err instanceof Error && err.message) {
    res.status(500).json({ message: err.message });
    return;
  }
  res.status(500).json({ message: "Internal server error" });
};
