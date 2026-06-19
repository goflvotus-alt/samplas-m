import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { ApiError } from "@/lib/apiError";
import { isRedisConfigured, redisCommand } from "@/lib/redisStore";

const ADMIN_PASSWORD_KEY = "samplas-m:admin:password";
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export interface AdminPasswordStatus {
  storage: "redis" | "env";
  canChangePassword: boolean;
  hasCustomPassword: boolean;
  hasFallbackPassword: boolean;
}

export async function assertAdminPassword(request: Request): Promise<void> {
  const providedPassword = request.headers.get("x-admin-password") || "";

  if (!providedPassword) {
    throw new ApiError(401, "Admin password is required.");
  }

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
