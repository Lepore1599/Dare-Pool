import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Parses JWT from Authorization header. Sets req.user if valid. Never blocks. */
export function parseAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
}

/** Requires a logged-in user. Returns 401 otherwise. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Login required." });
    return;
  }
  next();
}

/** Requires an admin user. Returns 403 otherwise. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }
  next();
}
