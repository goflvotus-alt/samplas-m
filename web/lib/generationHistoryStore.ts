import { isRedisConfigured, redisCommand, redisPipeline, type StorageStatus } from "@/lib/redisStore";
import type { GenerateCardNewsResponse } from "@/lib/types";

export interface GenerationHistoryEntry {
  id: string;
  timestamp: string;
  mode: string;
  input: unknown;
  output: GenerateCardNewsResponse;
}

const GENERATION_HISTORY_KEY = "samplas-m:generation-history";
const HISTORY_LIMIT = 100;

export async function getGenerationHistory(limit = 40): Promise<{ history: GenerationHistoryEntry[]; storage: StorageStatus }> {
  if (!isRedisConfigured()) {
    return {
      history: [],
      storage: "sample"
    };
  }

  const safeLimit = Math.max(1, Math.min(HISTORY_LIMIT, Math.floor(limit) || 40));
  const stored = await redisCommand<string[] | null>(["LRANGE", GENERATION_HISTORY_KEY, 0, safeLimit - 1]);

  return {
    history: Array.isArray(stored) ? stored.map(parseHistoryEntry).filter((entry): entry is GenerationHistoryEntry => Boolean(entry)) : [],
    storage: "redis"
  };
}

export async function saveGenerationHistory(input: unknown, output: GenerateCardNewsResponse): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  const entry: GenerationHistoryEntry = {
    id: createEntryId(),
    timestamp: new Date().toISOString(),
    mode: detectMode(input),
    input,
    output
  };

  await redisPipeline([
    ["LPUSH", GENERATION_HISTORY_KEY, JSON.stringify(entry)],
    ["LTRIM", GENERATION_HISTORY_KEY, 0, HISTORY_LIMIT - 1]
  ]);
}

function parseHistoryEntry(value: string): GenerationHistoryEntry | null {
  try {
    const source = asObject(JSON.parse(value));
    const output = asObject(source.output) as unknown as GenerateCardNewsResponse;

    if (!source.id || !source.timestamp || !output || !Array.isArray(output.cards)) {
      return null;
    }

    return {
      id: String(source.id),
      timestamp: String(source.timestamp),
      mode: String(source.mode || "unknown"),
      input: source.input,
      output
    };
  } catch {
    return null;
  }
}

function detectMode(input: unknown): string {
  const source = asObject(input);

  if (Array.isArray(source.pages) && source.pages.length > 0) {
    return "pages";
  }

  return "topic";
}

function createEntryId(): string {
  return `generation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
