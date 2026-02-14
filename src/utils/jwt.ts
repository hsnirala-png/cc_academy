import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

type TokenPayload = {
  userId: string;
  role: Role;
};

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
};

export const signToken = (userId: string, role: Role): string => {
  return jwt.sign({ userId, role } satisfies TokenPayload, getJwtSecret(), {
    expiresIn: "7d",
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
};
