import sampleBrands from "@/data/brands.sample.json";
import { isRedisConfigured, redisCommand, type StorageStatus } from "@/lib/redisStore";

export interface BrandEntry {
  brandName: string;
  designer: string;
  brandImage: string;
  keywords: string[];
  description: string;
  comparableBrands: string[];
  notes: string[];
}

const BRANDS_KEY = "samplas-m:brands:active";
const LEGACY_BRAND_IMAGE_NOTE_PREFIX = "Brand Image:";
const MAX_BRANDS = 200;
const MAX_LIST_ITEMS = 60;
const MAX_TEXT_LENGTH = 1800;

export async function getBrands(): Promise<{ brands: BrandEntry[]; storage: StorageStatus }> {
  if (!isRedisConfigured()) {
    return {
      brands: normalizeBrands(sampleBrands),
      storage: "sample"
    };
  }

  const stored = await redisCommand<string | null>(["GET", BRANDS_KEY]);

  if (!stored) {
    return {
      brands: [],
      storage: "redis"
    };
  }

  try {
    return {
      brands: normalizeBrands(JSON.parse(stored)),
      storage: "redis"
    };
  } catch {
    return {
      brands: [],
      storage: "redis"
    };
  }
}

export async function upsertBrand(input: unknown, originalBrandName = ""): Promise<BrandEntry[]> {
  assertRedisStorage("Brand editing");

  const brand = normalizeBrand(input);

  if (!brand.brandName) {
    throw new Error("Brand name is required.");
  }

  const brands = await getStoredBrandsForWrite();
  const originalKey = normalizeKey(originalBrandName || brand.brandName);
  const nextBrands = brands.filter((item) => normalizeKey(item.brandName) !== originalKey);
  const existingIndex = nextBrands.findIndex((item) => normalizeKey(item.brandName) === normalizeKey(brand.brandName));

  if (existingIndex >= 0) {
    nextBrands[existingIndex] = brand;
  } else {
    nextBrands.unshift(brand);
  }

  const normalized = normalizeBrands(nextBrands).slice(0, MAX_BRANDS);
  await redisCommand<string>(["SET", BRANDS_KEY, JSON.stringify(normalized)]);

  return normalized;
}

export async function deleteBrand(brandName: string): Promise<BrandEntry[]> {
  assertRedisStorage("Brand deletion");

  const brands = await getStoredBrandsForWrite();
  const key = normalizeKey(brandName);
  const nextBrands = brands.filter((brand) => normalizeKey(brand.brandName) !== key);

  await redisCommand<string>(["SET", BRANDS_KEY, JSON.stringify(nextBrands)]);
  return nextBrands;
}

async function getStoredBrandsForWrite(): Promise<BrandEntry[]> {
  const stored = await redisCommand<string | null>(["GET", BRANDS_KEY]);

  if (!stored) {
    return [];
  }

  try {
    return normalizeBrands(JSON.parse(stored));
  } catch {
    return [];
  }
}

export function formatBrandsForPrompt(brands: BrandEntry[], selectedNames: string[] = []): string {
  const selectedKeys = new Set(selectedNames.map(normalizeKey).filter(Boolean));
  const relevantBrands = selectedKeys.size
    ? brands.filter((brand) => selectedKeys.has(normalizeKey(brand.brandName)))
    : brands.slice(0, 8);

  if (relevantBrands.length === 0) {
    return "None";
  }

  return relevantBrands
    .map((brand) =>
      [
        `Brand: ${brand.brandName}`,
        brand.designer ? `Designer: ${brand.designer}` : "",
        brand.brandImage ? `Brand image: ${brand.brandImage}` : "",
        brand.keywords.length ? `Keywords: ${brand.keywords.join(", ")}` : "",
        brand.description ? `Description: ${brand.description}` : "",
        brand.comparableBrands.length ? `Comparable brands: ${brand.comparableBrands.join(", ")}` : "",
        brand.notes.length ? `Notes: ${brand.notes.join(" / ")}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function normalizeBrands(input: unknown): BrandEntry[] {
  const source = Array.isArray(input) ? input : [];
  const brands = source.map(normalizeBrand).filter((brand) => brand.brandName);
  const seen = new Set<string>();
  const uniqueBrands: BrandEntry[] = [];

  for (const brand of brands) {
    const key = normalizeKey(brand.brandName);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueBrands.push(brand);
  }

  return uniqueBrands.slice(0, MAX_BRANDS);
}

function normalizeBrand(input: unknown): BrandEntry {
  const source = asObject(input);
  const notes = normalizeList(source.notes);

  return {
    brandName: normalizeText(source.brandName),
    designer: normalizeText(source.designer),
    brandImage: normalizeText(source.brandImage) || extractLegacyBrandImage(notes),
    keywords: normalizeList(source.keywords),
    description: normalizeText(source.description),
    comparableBrands: normalizeList(source.comparableBrands),
    notes: notes.filter((note) => !note.startsWith(LEGACY_BRAND_IMAGE_NOTE_PREFIX))
  };
}

function extractLegacyBrandImage(notes: string[]): string {
  const imageNote = notes.find((note) => note.startsWith(LEGACY_BRAND_IMAGE_NOTE_PREFIX));

  return imageNote ? normalizeText(imageNote.slice(LEGACY_BRAND_IMAGE_NOTE_PREFIX.length)) : "";
}

function normalizeList(input: unknown): string[] {
  const values = Array.isArray(input) ? input : typeof input === "string" ? input.split("\n") : [];
  const cleaned = values.map(normalizeText).filter(Boolean);

  return Array.from(new Set(cleaned)).slice(0, MAX_LIST_ITEMS);
}

function normalizeText(value: unknown): string {
  return String(value || "").trim().slice(0, MAX_TEXT_LENGTH);
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function assertRedisStorage(action: string): void {
  if (!isRedisConfigured()) {
    throw new Error(`${action} needs Redis storage. Add Redis environment variables in Vercel first.`);
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
