import { assertAdminPassword } from "@/lib/adminAuth";
import { ApiError } from "@/lib/apiError";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCE_URL = "https://samplas.co.kr/brand.html";

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function GET(request: Request): Promise<Response> {
  try {
    await assertAdminPassword(request);

    const response = await fetch(SOURCE_URL, {
      cache: "no-store",
      headers: {
        "User-Agent": "SAMPLAS-M-Admin/1.0"
      }
    });

    if (!response.ok) {
      return jsonWithCors({ error: "Could not load SAMPLAS brand page." }, 502);
    }

    const html = await response.text();

    return jsonWithCors({
      sourceUrl: SOURCE_URL,
      brands: parseSamplasBrands(html)
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonWithCors({ error: error.message }, error.status);
    }

    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Could not import SAMPLAS brands."
      },
      500
    );
  }
}

function parseSamplasBrands(html: string): Array<{ brandName: string; brandImage: string; description: string }> {
  const matches = html.matchAll(/<div class=["']brand-box["'][\s\S]*?<img[^>]+src=["']([^"']+)["'][\s\S]*?<p class=["']brand-box-dec["'][^>]*>([\s\S]*?)<\/p>/gi);
  const brands: Array<{ brandName: string; brandImage: string; description: string }> = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const brandImage = toAbsoluteUrl(match[1]);
    const text = cleanHtmlText(match[2]);
    const [rawName, ...descriptionParts] = text.split("\n").map((part) => part.trim()).filter(Boolean);
    const brandName = rawName || "";
    const description = descriptionParts.join(" ").replace(/\s+/g, " ").trim();
    const key = brandName.toLowerCase();

    if (!brandName || seen.has(key)) {
      continue;
    }

    seen.add(key);
    brands.push({
      brandName,
      brandImage,
      description
    });
  }

  return brands;
}

function cleanHtmlText(value: string): string {
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .trim()
  );
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function toAbsoluteUrl(value: string): string {
  const src = value.trim();

  if (src.startsWith("https://") || src.startsWith("http://")) {
    return src;
  }

  if (src.startsWith("//")) {
    return `https:${src}`;
  }

  if (src.startsWith("/")) {
    return `https://samplas.co.kr${src}`;
  }

  return `https://samplas.co.kr/${src}`;
}
