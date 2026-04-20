import jwt from "jsonwebtoken";

const SECRET = process.env["SESSION_SECRET"] ?? "darepool-dev-secret";
const EXPIRY = "30d";

export interface JwtPayload {
  userId: number;
  username: string;
  isAdmin: boolean;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
