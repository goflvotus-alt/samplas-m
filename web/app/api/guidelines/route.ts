import { assertAdminPassword } from "@/lib/adminAuth";
import { ApiError } from "@/lib/apiError";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { getGuidelines, saveGuidelines } from "@/lib/guidelineStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function GET(): Promise<Response> {
  const { guidelines, storage } = await getGuidelines();
  const response = jsonWithCors(guidelines);
  response.headers.set("X-Samplas-Storage", storage);
  return response;
}

export async function PUT(request: Request): Promise<Response> {
  try {
    await assertAdminPassword(request);

    const body = await request.json();
    const source = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    console.info("[guidelines] Save request received", {
      hasGuidelines: Boolean(source.guidelines),
      categories:
        source.guidelines && typeof source.guidelines === "object" && Array.isArray((source.guidelines as Record<string, unknown>).categories)
          ? ((source.guidelines as Record<string, unknown>).categories as unknown[]).length
          : 0,
      storage: "redis"
    });

    const snapshot = await saveGuidelines(source.guidelines, String(source.updatedBy || "admin"));

    return jsonWithCors({
      ok: true,
      saved: true,
      version: snapshot.version,
      guidelines: snapshot.guidelines
    });
  } catch (error) {
    console.error("[guidelines] Save failed", error);

    if (error instanceof ApiError) {
      return jsonWithCors({ error: error.message }, error.status);
    }

    const message = error instanceof Error ? error.message : "Could not save guidelines.";

    return jsonWithCors(
      {
        error: message
      },
      message.includes("Guideline storage is not configured") ? 503 : 500
    );
  }
}
