import { ApiError } from "@/lib/apiError";
import { createAdminSessionCookie, verifyAdminPassword } from "@/lib/adminAuth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { password?: unknown };
    await verifyAdminPassword(String(body.password || ""));

    const response = jsonWithCors({ ok: true });
    response.headers.append("Set-Cookie", createAdminSessionCookie());
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonWithCors({ error: error.message }, error.status);
    }

    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Could not log in."
      },
      500
    );
  }
}
