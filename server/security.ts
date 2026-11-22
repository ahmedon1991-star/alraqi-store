import crypto from "node:crypto";

/** The old built-in admin password. It is public (it was in the source code), so it is never accepted. */
export const KNOWN_DEFAULT_ADMIN_PASSWORD = "admin12345";

export const CUSTOMER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
export const MIN_PASSWORD_LENGTH = 6;
export const MIN_ADMIN_PASSWORD_LENGTH = 8;

/**
 * TLS options for PostgreSQL. Hosted databases (Neon, Render…) require TLS, so it stays on by
 * default; set DATABASE_SSL=false only for a local/CI database without TLS.
 */
export function databaseSsl() {
  return process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false };
}

export function createToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function isHashedPassword(stored: string | null | undefined) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  return !!salt && !!hash && /^[0-9a-f]+$/i.test(salt) && /^[0-9a-f]{128}$/i.test(hash);
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash || !isHashedPassword(storedHash)) {
    return false;
  }
  const [salt, hash] = storedHash.split(":");
  const candidate = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (candidate.length !== original.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidate, original);
}

/** Constant-time comparison of two strings. */
export function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * The admin "master" credentials from environment variables (ADMIN_USERNAME / ADMIN_PASSWORD).
 * Returns null when no usable password is configured (missing, or the publicly known default).
 */
export function getEnvAdminCredentials(): { username: string; password: string } | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password === KNOWN_DEFAULT_ADMIN_PASSWORD) {
    return null;
  }
  return {
    username: (process.env.ADMIN_USERNAME || "admin").trim(),
    password,
  };
}

export function isSessionExpired(createdAt: Date | null | undefined, ttlMs: number) {
  if (!createdAt) return true;
  return Date.now() - new Date(createdAt).getTime() > ttlMs;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Base URL used in emails/links. Never derived from the request's Host header in production. */
export function getPublicBaseUrl(fallbackFromRequest?: string) {
  const configured = process.env.PUBLIC_URL || process.env.URL || process.env.RENDER_EXTERNAL_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV !== "production" && fallbackFromRequest) {
    return fallbackFromRequest;
  }
  return "https://alraqi-store.onrender.com";
}
