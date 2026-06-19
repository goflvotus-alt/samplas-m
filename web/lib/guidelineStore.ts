import sampleGuidelines from "@/data/guidelines.sample.json";
import { isRedisConfigured, redisCommand, redisPipeline, type StorageStatus } from "@/lib/redisStore";

export type GuidelineKey =
  | "brandTone"
  | "contentStructures"
  | "bannedExpressions"
  | "goodExamples"
  | "badExamples"
  | "imageRules"
  | "ctaRules"
  | "hashtagRules";

export type Guidelines = Record<GuidelineKey, string[]>;

export interface GuidelineHistoryEntry {
  version: string;
  updatedBy: string;
  guidelines: Guidelines;
}

const GUIDELINES_KEY = "samplas-m:guidelines:active";
const GUIDELINE_HISTORY_KEY = "samplas-m:guidelines:history";
const MAX_RULES_PER_CATEGORY = 80;
const MAX_RULE_LENGTH = 1000;
const HISTORY_LIMIT = 50;

export const GUIDELINE_SECTIONS: Array<{ key: GuidelineKey; label: string; description: string }> = [
  {
    key: "brandTone",
    label: "Brand Tone",
    description: "전체 문체, 말투, 에디토리얼 감도"
  },
  {
    key: "contentStructures",
    label: "Content Structure Types",
    description: "커버, 본문, 마무리 등 슬라이드 구조"
  },
  {
    key: "bannedExpressions",
    label: "Banned Expressions",
    description: "사용하지 않을 표현"
  },
  {
    key: "goodExamples",
    label: "Good Examples",
    description: "좋은 결과 예시"
  },
  {
    key: "badExamples",
    label: "Bad Examples",
    description: "피해야 할 결과 예시"
  },
  {
    key: "imageRules",
    label: "Image Usage Rules",
    description: "이미지 설명, 크롭, 초점 관련 규칙"
  },
  {
    key: "ctaRules",
    label: "CTA Rules",
    description: "콜투액션 사용 방식"
  },
  {
    key: "hashtagRules",
    label: "Hashtag Rules",
    description: "해시태그 작성 방식"
  }
];

export async function getGuidelines(): Promise<{ guidelines: Guidelines; storage: StorageStatus }> {
  if (!isRedisConfigured()) {
    return {
      guidelines: normalizeGuidelines(sampleGuidelines),
      storage: "sample"
    };
  }

  const stored = await redisCommand<string | null>(["GET", GUIDELINES_KEY]);

  if (!stored) {
    return {
      guidelines: normalizeGuidelines(sampleGuidelines),
      storage: "redis"
    };
  }

  try {
    return {
      guidelines: normalizeGuidelines(JSON.parse(stored)),
      storage: "redis"
    };
  } catch {
    return {
      guidelines: normalizeGuidelines(sampleGuidelines),
      storage: "redis"
    };
  }
}

export async function saveGuidelines(input: unknown, updatedBy: string): Promise<GuidelineHistoryEntry> {
  if (!isRedisConfigured()) {
    throw new Error(
      "Guideline storage is not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }

  const guidelines = normalizeGuidelines(input);
  const snapshot: GuidelineHistoryEntry = {
    version: new Date().toISOString(),
    updatedBy: updatedBy.trim() || "admin",
    guidelines
  };

  const serializedGuidelines = JSON.stringify(guidelines);
  await redisCommand<string>(["SET", GUIDELINES_KEY, serializedGuidelines]);

  const stored = await redisCommand<string | null>(["GET", GUIDELINES_KEY]);
  if (stored !== serializedGuidelines) {
    console.error("[guidelines] Redis verification failed", {
      key: GUIDELINES_KEY,
      expectedLength: serializedGuidelines.length,
      storedLength: stored?.length || 0
    });
    throw new Error("Guidelines were written but verification failed.");
  }

  const results = await redisPipeline([
    ["LPUSH", GUIDELINE_HISTORY_KEY, JSON.stringify(snapshot)],
    ["LTRIM", GUIDELINE_HISTORY_KEY, 0, HISTORY_LIMIT - 1]
  ]);

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    console.error("[guidelines] Redis history write failed", {
      activeKey: GUIDELINES_KEY,
      historyKey: GUIDELINE_HISTORY_KEY,
      error: failed.error
    });
  }

  return snapshot;
}

export async function getGuidelineHistory(): Promise<{ history: GuidelineHistoryEntry[]; storage: StorageStatus }> {
  if (!isRedisConfigured()) {
    return {
      history: [
        {
          version: "sample",
          updatedBy: "system",
          guidelines: normalizeGuidelines(sampleGuidelines)
        }
      ],
      storage: "sample"
    };
  }

  const storedEntries = await redisCommand<string[]>(["LRANGE", GUIDELINE_HISTORY_KEY, 0, HISTORY_LIMIT - 1]);
  const history = Array.isArray(storedEntries)
    ? storedEntries
        .map(parseHistoryEntry)
        .filter((entry): entry is GuidelineHistoryEntry => Boolean(entry))
    : [];

  return {
    history,
    storage: "redis"
  };
}

export function normalizeGuidelines(input: unknown): Guidelines {
  const source = asObject(input);

  return GUIDELINE_SECTIONS.reduce((guidelines, section) => {
    guidelines[section.key] = normalizeRuleList(source[section.key]);
    return guidelines;
  }, {} as Guidelines);
}

export function formatGuidelinesForPrompt(guidelines: Guidelines): string {
  return GUIDELINE_SECTIONS.map((section) => {
    const rules = guidelines[section.key];
    if (rules.length === 0) {
      return "";
    }

    return [`${section.label}:`, ...rules.map((rule) => `- ${rule}`)].join("\n");
  })
    .filter(Boolean)
    .join("\n\n");
}

function normalizeRuleList(value: unknown): string[] {
  const rawValues = Array.isArray(value) ? value : typeof value === "string" ? value.split("\n") : [];
  const rules = rawValues
    .map((rule) => String(rule).trim())
    .filter(Boolean)
    .map((rule) => rule.slice(0, MAX_RULE_LENGTH));

  return Array.from(new Set(rules)).slice(0, MAX_RULES_PER_CATEGORY);
}

function parseHistoryEntry(value: string): GuidelineHistoryEntry | null {
  try {
    const parsed = asObject(JSON.parse(value));
    const version = typeof parsed.version === "string" ? parsed.version : "";
    const updatedBy = typeof parsed.updatedBy === "string" ? parsed.updatedBy : "admin";

    if (!version) {
      return null;
    }

    return {
      version,
      updatedBy,
      guidelines: normalizeGuidelines(parsed.guidelines)
    };
  } catch {
    return null;
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
