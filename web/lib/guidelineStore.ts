import sampleGuidelines from "@/data/guidelines.sample.json";
import { isRedisConfigured, redisCommand, redisPipeline, type StorageStatus } from "@/lib/redisStore";

export type GuidelineRuleKey =
  | "brandTone"
  | "contentStructures"
  | "bannedExpressions"
  | "goodExamples"
  | "badExamples"
  | "imageRules";

export type GuidelineKey = GuidelineRuleKey | "references";

export type RuleMap = Record<GuidelineRuleKey, string[]>;

export interface ReferenceEntry {
  id: string;
  title: string;
  url: string;
  note: string;
}

export interface GuidelineCategory {
  id: string;
  name: string;
  rules: RuleMap;
  references: ReferenceEntry[];
}

export interface GuidelineSystem {
  version: 2;
  activeCategoryId: string;
  categories: GuidelineCategory[];
}

export type Guidelines = GuidelineSystem;

export interface GuidelineHistoryEntry {
  version: string;
  updatedBy: string;
  guidelines: Guidelines;
}

const GUIDELINES_KEY = "samplas-m:guidelines:active";
const GUIDELINE_HISTORY_KEY = "samplas-m:guidelines:history";
const MAX_CATEGORIES = 40;
const MAX_RULES_PER_CATEGORY = 80;
const MAX_RULE_LENGTH = 1000;
const MAX_REFERENCES_PER_CATEGORY = 80;
const MAX_REFERENCE_TEXT_LENGTH = 3000;
const HISTORY_LIMIT = 50;

export const GUIDELINE_RULE_SECTIONS: Array<{ key: GuidelineRuleKey; label: string; description: string }> = [
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
  }
];

export const GUIDELINE_SECTIONS: Array<{ key: GuidelineKey; label: string; description: string }> = [
  ...GUIDELINE_RULE_SECTIONS,
  {
    key: "references",
    label: "Reference",
    description: "AI가 해당 콘텐츠 카테고리를 작성할 때 참고할 URL과 메모"
  }
];

const emptyRuleMap = GUIDELINE_RULE_SECTIONS.reduce((rules, section) => {
  rules[section.key] = [];
  return rules;
}, {} as RuleMap);

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
  const rawCategories = Array.isArray(source.categories) ? source.categories : [];
  const categories = rawCategories.length
    ? normalizeCategories(rawCategories)
    : [createCategory(String(source.activeCategory || source.categoryName || "Category"), normalizeRuleMap(source), [])];
  const fallbackCategories = categories.length ? categories : [createCategory("Category", emptyRuleMap, [])];
  const activeCategoryId = normalizeActiveCategoryId(source.activeCategoryId, fallbackCategories);

  return {
    version: 2,
    activeCategoryId,
    categories: fallbackCategories
  };
}

export function formatGuidelinesForPrompt(guidelines: Guidelines, selectedCategoryNames: string[] = []): string {
  const system = normalizeGuidelines(guidelines);
  const categories = getRelevantCategories(system, selectedCategoryNames);

  return categories
    .map((category) => {
      const ruleText = GUIDELINE_RULE_SECTIONS.map((section) => {
        const rules = category.rules[section.key];
        if (rules.length === 0) {
          return "";
        }

        return [`${section.label}:`, ...rules.map((rule) => `- ${rule}`)].join("\n");
      })
        .filter(Boolean)
        .join("\n\n");
      const references = formatReferences(category.references);

      return [
        `Content Category: ${category.name}`,
        ruleText,
        references ? `References:\n${references}` : ""
      ]
        .filter(Boolean)
        .join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function normalizeCategories(input: unknown[]): GuidelineCategory[] {
  const categories = input.map(normalizeCategory).filter((category) => category.name);
  const seen = new Set<string>();
  const uniqueCategories: GuidelineCategory[] = [];

  for (const category of categories) {
    const key = normalizeMatchKey(category.name);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueCategories.push(category);
  }

  return uniqueCategories.slice(0, MAX_CATEGORIES);
}

function normalizeCategory(input: unknown): GuidelineCategory {
  const source = asObject(input);
  const name = normalizeText(source.name || source.categoryName || "Category", 80) || "Category";
  const id = normalizeText(source.id, 120) || toCategoryId(name);
  const rules = normalizeRuleMap(source.rules || source);
  const references = normalizeReferences(source.references);

  return {
    id,
    name,
    rules,
    references
  };
}

function createCategory(name: string, rules: RuleMap, references: ReferenceEntry[]): GuidelineCategory {
  const categoryName = normalizeText(name, 80) || "Category";

  return {
    id: toCategoryId(categoryName),
    name: categoryName,
    rules: normalizeRuleMap(rules),
    references: normalizeReferences(references)
  };
}

function normalizeRuleMap(input: unknown): RuleMap {
  const source = asObject(input);

  return GUIDELINE_RULE_SECTIONS.reduce((rules, section) => {
    rules[section.key] = normalizeRuleList(source[section.key]);
    return rules;
  }, {} as RuleMap);
}

function normalizeReferences(input: unknown): ReferenceEntry[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item, index) => {
      const source = asObject(item);
      const title = normalizeText(source.title, 180);
      const url = normalizeText(source.url, 500);
      const note = normalizeText(source.note || source.text || source.body, MAX_REFERENCE_TEXT_LENGTH);

      if (!title && !url && !note) {
        return null;
      }

      return {
        id: normalizeText(source.id, 120) || `reference-${index + 1}`,
        title,
        url,
        note
      };
    })
    .filter((item): item is ReferenceEntry => Boolean(item))
    .slice(0, MAX_REFERENCES_PER_CATEGORY);
}

function normalizeRuleList(value: unknown): string[] {
  const rawValues = Array.isArray(value) ? value : typeof value === "string" ? value.split("\n") : [];
  const rules = rawValues
    .map((rule) => normalizeText(rule, MAX_RULE_LENGTH))
    .filter(Boolean);

  return Array.from(new Set(rules)).slice(0, MAX_RULES_PER_CATEGORY);
}

function normalizeActiveCategoryId(value: unknown, categories: GuidelineCategory[]): string {
  const activeId = normalizeText(value, 120);

  if (activeId && categories.some((category) => category.id === activeId)) {
    return activeId;
  }

  return categories[0]?.id || "category";
}

function getRelevantCategories(system: GuidelineSystem, selectedCategoryNames: string[]): GuidelineCategory[] {
  const selectedKeys = new Set(selectedCategoryNames.map(normalizeMatchKey).filter(Boolean));

  if (selectedKeys.size === 0) {
    const activeCategory = system.categories.find((category) => category.id === system.activeCategoryId) || system.categories[0];
    return activeCategory ? [activeCategory] : [];
  }

  const matched = system.categories.filter((category) => selectedKeys.has(normalizeMatchKey(category.name)));
  const fallback = system.categories.find((category) => category.id === system.activeCategoryId) || system.categories[0];

  return matched.length ? matched : fallback ? [fallback] : [];
}

function formatReferences(references: ReferenceEntry[]): string {
  return references
    .map((reference, index) => {
      const lines = [
        `${index + 1}. ${reference.title || "Untitled reference"}`,
        reference.url ? `URL: ${reference.url}` : "",
        reference.note ? `Note: ${reference.note}` : ""
      ].filter(Boolean);

      return lines.join("\n");
    })
    .join("\n\n");
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

function normalizeText(value: unknown, maxLength: number): string {
  return String(value || "").trim().slice(0, maxLength);
}

function toCategoryId(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9가-힣-]+/gi, "")
    .replace(/^-+|-+$/g, "");

  return normalized || "category";
}

function normalizeMatchKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[^a-z0-9가-힣]+/gi, "");
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
