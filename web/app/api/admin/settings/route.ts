import { ApiError } from "@/lib/apiError";
import { getAdminPasswordStatus, updateAdminPassword } from "@/lib/adminAuth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function GET(): Promise<Response> {
  try {
    const status = await getAdminPasswordStatus();
    return jsonWithCors(status);
  } catch (error) {
    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Could not load settings."
      },
      500
    );
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { nextPassword?: unknown };
    const status = await updateAdminPassword(request, body.nextPassword);

    return jsonWithCors({
      ok: true,
      ...status
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonWithCors({ error: error.message }, error.status);
    }

    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Could not update settings."
      },
      500
    );
  }
}
