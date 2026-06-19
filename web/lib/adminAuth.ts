import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { ApiError } from "@/lib/apiError";
import { isRedisConfigured, redisCommand } from "@/lib/redisStore";

const ADMIN_PASSWORD_KEY = "samplas-m:admin:password";
export const ADMIN_SESSION_COOKIE = "samplas_admin_session";
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface AdminPasswordStatus {
  storage: "redis" | "env";
  canChangePassword: boolean;
  hasCustomPassword: boolean;
  hasFallbackPassword: boolean;
}

export async function assertAdminPassword(request: Request): Promise<void> {
  if (isValidAdminSessionRequest(request)) {
    return;
  }

  const providedPassword = request.headers.get("x-admin-password") || "";

  if (!providedPassword) {
    throw new ApiError(401, "Admin login is required.");
  }

  await verifyAdminPassword(providedPassword);
}

export async function verifyAdminPassword(providedPassword: string): Promise<void> {
  const storedPasswordRecord = await getStoredPasswordRecord();

  if (storedPasswordRecord) {
    if (verifyPasswordRecord(providedPassword, storedPasswordRecord)) {
      return;
    }

    throw new ApiError(401, "Admin password is incorrect.");
  }

  const fallbackPassword = process.env.ADMIN_PASSWORD || "";

  if (!fallbackPassword) {
    throw new ApiError(500, "ADMIN_PASSWORD is missing. Add it in Vercel Project Settings > Environment Variables.");
  }

  if (!safeStringEquals(providedPassword, fallbackPassword)) {
    throw new ApiError(401, "Admin password is incorrect.");
  }
}

export function createAdminSessionCookie(): string {
  const createdAt = Date.now().toString();
  const signature = signSessionValue(createdAt);
  const value = encodeURIComponent(`${createdAt}.${signature}`);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return `${ADMIN_SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function clearAdminSessionCookie(): string {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function isValidAdminSessionCookieValue(value: string): boolean {
  if (!value) {
    return false;
  }

  let decoded = "";

  try {
    decoded = decodeURIComponent(value);
  } catch {
    return false;
  }
  const [createdAt, signature] = decoded.split(".");
  const createdAtNumber = Number(createdAt);

  if (!createdAt || !signature || !Number.isFinite(createdAtNumber)) {
    return false;
  }

  if (Date.now() - createdAtNumber > SESSION_MAX_AGE_SECONDS * 1000) {
    return false;
  }

  return safeStringEquals(signature, signSessionValue(createdAt));
}

export function isValidAdminSessionRequest(request: Request): boolean {
  return isValidAdminSessionCookieValue(getCookieValue(request.headers.get("cookie") || "", ADMIN_SESSION_COOKIE));
}

export async function getAdminPasswordStatus(): Promise<AdminPasswordStatus> {
  const hasCustomPassword = Boolean(await getStoredPasswordRecord());

  return {
    storage: isRedisConfigured() ? "redis" : "env",
    canChangePassword: isRedisConfigured(),
    hasCustomPassword,
    hasFallbackPassword: Boolean(process.env.ADMIN_PASSWORD)
  };
}

export async function updateAdminPassword(request: Request, nextPassword: unknown): Promise<AdminPasswordStatus> {
  await assertAdminPassword(request);

  if (!isRedisConfigured()) {
    throw new ApiError(503, "Password changes need Redis storage. Add Redis environment variables in Vercel first.");
  }

  const password = String(nextPassword || "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ApiError(400, `New password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`);
  }

  await redisCommand<string>(["SET", ADMIN_PASSWORD_KEY, createPasswordRecord(password)]);
  return getAdminPasswordStatus();
}

async function getStoredPasswordRecord(): Promise<string> {
  if (!isRedisConfigured()) {
    return "";
  }

  return (await redisCommand<string | null>(["GET", ADMIN_PASSWORD_KEY])) || "";
}

function createPasswordRecord(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function signSessionValue(createdAt: string): string {
  return createHmac("sha256", getSessionSecret()).update(`${ADMIN_SESSION_COOKIE}:${createdAt}`).digest("hex");
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "samplas-m-local-admin-session";
}

function getCookieValue(cookieHeader: string, name: string): string {
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const cookie = cookies.find((item) => item.startsWith(prefix));

  return cookie ? cookie.slice(prefix.length) : "";
}

function verifyPasswordRecord(password: string, record: string): boolean {
  const [algorithm, salt, storedHash] = record.split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const hash = scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHash, "hex");

  return stored.length === hash.length && timingSafeEqual(stored, hash);
}

function safeStringEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
