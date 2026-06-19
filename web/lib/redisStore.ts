export type RedisResponse<T> = {
  result?: T;
  error?: string;
};

export type StorageStatus = "redis" | "sample";

export function isRedisConfigured(): boolean {
  return Boolean(getRedisUrlValue() && getRedisTokenValue());
}

export async function redisCommand<T>(command: Array<string | number>): Promise<T | null> {
  const response = await fetch(getRedisUrl(), {
    method: "POST",
    headers: getRedisHeaders(),
    body: JSON.stringify(command),
    cache: "no-store"
  });

  const json = (await response.json()) as RedisResponse<T>;

  if (!response.ok || json.error) {
    throw new Error(json.error || "Redis request failed.");
  }

  return json.result ?? null;
}

export async function redisPipeline(commands: Array<Array<string | number>>): Promise<Array<RedisResponse<unknown>>> {
  const response = await fetch(`${getRedisUrl()}/pipeline`, {
    method: "POST",
    headers: getRedisHeaders(),
    body: JSON.stringify(commands),
    cache: "no-store"
  });

  const json = (await response.json()) as Array<RedisResponse<unknown>> | RedisResponse<unknown>;

  if (!response.ok || !Array.isArray(json)) {
    throw new Error(Array.isArray(json) ? "Redis pipeline failed." : json.error || "Redis pipeline failed.");
  }

  return json;
}

function getRedisUrl(): string {
  const url = getRedisUrlValue();

  if (!url) {
    throw new Error("UPSTASH_REDIS_REST_URL is missing.");
  }

  return url.replace(/\/$/, "");
}

function getRedisHeaders(): HeadersInit {
  const token = getRedisTokenValue();

  if (!token) {
    throw new Error("UPSTASH_REDIS_REST_TOKEN is missing.");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
}

function getRedisUrlValue(): string {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
}

function getRedisTokenValue(): string {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
}
