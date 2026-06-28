import { ApiError } from "@/lib/apiError";
import { assertAdminPassword } from "@/lib/adminAuth";
import { getGenerationHistory } from "@/lib/generationHistoryStore";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function GET(request: Request): Promise<Response> {
  try {
    await assertAdminPassword(request);

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || 40);
    const { history, storage } = await getGenerationHistory(limit);
    const response = jsonWithCors({
      ok: true,
      history
    });

    response.headers.set("X-Samplas-Storage", storage);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonWithCors({ error: error.message }, error.status);
    }

    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Could not load generation history."
      },
      500
    );
  }
}
