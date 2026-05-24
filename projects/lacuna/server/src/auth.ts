// Authentication: password hashing + session tokens, built only on node:crypto — no
// external auth provider. scrypt for password storage; opaque random session tokens kept
// in memory (clients re-login after a server restart, which the client handles gracefully).

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  EMAIL_RE,
  HANDLE_RE,
  PASSWORD_MIN,
} from "../../app/src/net/protocol.ts";

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  const known = Buffer.from(hash, "hex");
  if (known.length !== candidate.length) return false;
  return timingSafeEqual(known, candidate);
}

// ─── Input validation (authoritative; the client pre-checks the same rules) ────
export function validateEmail(email: string): string | null {
  if (typeof email !== "string" || !EMAIL_RE.test(email)) return "Enter a valid email address.";
  if (email.length > 254) return "Email is too long.";
  return null;
}
export function validateHandle(handle: string): string | null {
  if (typeof handle !== "string" || !HANDLE_RE.test(handle))
    return "Handle must be 2–16 letters, numbers, or underscores.";
  return null;
}
export function validatePassword(password: string): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN)
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (password.length > 200) return "Password is too long.";
  return null;
}

// ─── Sessions ──────────────────────────────────────────────────────────────--
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class Sessions {
  private byToken = new Map<string, { userId: string; expires: number }>();

  issue(userId: string): string {
    const token = randomBytes(32).toString("hex");
    this.byToken.set(token, { userId, expires: Date.now() + SESSION_TTL_MS });
    return token;
  }

  resolve(token: string): string | null {
    const s = this.byToken.get(token);
    if (!s) return null;
    if (s.expires < Date.now()) {
      this.byToken.delete(token);
      return null;
    }
    return s.userId;
  }

  revoke(token: string): void {
    this.byToken.delete(token);
  }

  /** Revoke every session for a user (used on account deletion). */
  revokeUser(userId: string): void {
    for (const [token, s] of this.byToken) if (s.userId === userId) this.byToken.delete(token);
  }
}
