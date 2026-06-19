import { randomUUID } from "crypto";
import sampleFeedback from "@/data/feedback.sample.json";
import { isRedisConfigured, redisCommand, type StorageStatus } from "@/lib/redisStore";

export type FeedbackStatus = "new" | "reviewed" | "useful" | "ignored";

export interface FeedbackEntry {
  id: string;
  timestamp: string;
  originalInput: unknown;
  generatedOutput: unknown;
  feedback: string;
  status: FeedbackStatus;
}

const FEEDBACK_KEY = "samplas-m:feedback:entries";
const MAX_FEEDBACK = 300;
const MAX_FEEDBACK_LENGTH = 4000;
const allowedStatuses: FeedbackStatus[] = ["new", "reviewed", "useful", "ignored"];

export async function getFeedbackEntries(): Promise<{ feedback: FeedbackEntry[]; storage: StorageStatus }> {
  if (!isRedisConfigured()) {
    return {
      feedback: normalizeFeedbackList(sampleFeedback),
      storage: "sample"
    };
  }

  const stored = await redisCommand<string | null>(["GET", FEEDBACK_KEY]);

  if (!stored) {
    return {
      feedback: [],
      storage: "redis"
    };
  }

  try {
    return {
      feedback: normalizeFeedbackList(JSON.parse(stored)),
      storage: "redis"
    };
  } catch {
    return {
      feedback: [],
      storage: "redis"
    };
  }
}

export async function createFeedback(input: unknown): Promise<FeedbackEntry[]> {
  assertRedisStorage("Feedback storage");

  const entry = normalizeFeedbackEntry({
    ...asObject(input),
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    status: "new"
  });

  if (!entry.feedback) {
    throw new Error("Feedback text is required.");
  }

  const feedback = await getStoredFeedbackForWrite();
  const nextFeedback = normalizeFeedbackList([entry, ...feedback]).slice(0, MAX_FEEDBACK);
  await redisCommand<string>(["SET", FEEDBACK_KEY, JSON.stringify(nextFeedback)]);

  return nextFeedback;
}

export async function updateFeedbackStatus(id: string, status: unknown): Promise<FeedbackEntry[]> {
  assertRedisStorage("Feedback updates");

  const nextStatus = normalizeFeedbackStatus(status);
  const feedback = await getStoredFeedbackForWrite();
  const nextFeedback = feedback.map((entry) => (entry.id === id ? { ...entry, status: nextStatus } : entry));

  await redisCommand<string>(["SET", FEEDBACK_KEY, JSON.stringify(nextFeedback)]);
  return nextFeedback;
}

export async function deleteFeedback(id: string): Promise<FeedbackEntry[]> {
  assertRedisStorage("Feedback deletion");

  const feedback = await getStoredFeedbackForWrite();
  const nextFeedback = feedback.filter((entry) => entry.id !== id);

  await redisCommand<string>(["SET", FEEDBACK_KEY, JSON.stringify(nextFeedback)]);
  return nextFeedback;
}

async function getStoredFeedbackForWrite(): Promise<FeedbackEntry[]> {
  const stored = await redisCommand<string | null>(["GET", FEEDBACK_KEY]);

  if (!stored) {
    return [];
  }

  try {
    return normalizeFeedbackList(JSON.parse(stored));
  } catch {
    return [];
  }
}

export function formatUsefulFeedbackForPrompt(feedback: FeedbackEntry[]): string {
  const useful = feedback
    .filter((entry) => entry.status === "useful")
    .map((entry) => entry.feedback)
    .filter(Boolean)
    .slice(0, 12);

  if (useful.length === 0) {
    return "None";
  }

  return useful.map((entry) => `- ${entry}`).join("\n");
}

function normalizeFeedbackList(input: unknown): FeedbackEntry[] {
  const source = Array.isArray(input) ? input : [];
  return source.map(normalizeFeedbackEntry).filter((entry) => entry.id && entry.feedback).slice(0, MAX_FEEDBACK);
}

function normalizeFeedbackEntry(input: unknown): FeedbackEntry {
  const source = asObject(input);

  return {
    id: normalizeText(source.id) || randomUUID(),
    timestamp: normalizeText(source.timestamp) || new Date().toISOString(),
    originalInput: source.originalInput || {},
    generatedOutput: source.generatedOutput || {},
    feedback: normalizeText(source.feedback).slice(0, MAX_FEEDBACK_LENGTH),
    status: normalizeFeedbackStatus(source.status)
  };
}

function normalizeFeedbackStatus(value: unknown): FeedbackStatus {
  const status = String(value || "new").trim().toLowerCase();
  return allowedStatuses.includes(status as FeedbackStatus) ? (status as FeedbackStatus) : "new";
}

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function assertRedisStorage(action: string): void {
  if (!isRedisConfigured()) {
    throw new Error(`${action} needs Redis storage. Add Redis environment variables in Vercel first.`);
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
