import { ApiError } from "@/lib/apiError";
import { assertAdminPassword } from "@/lib/adminAuth";
import { deleteFeedback, updateFeedbackStatus } from "@/lib/feedbackStore";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    await assertAdminPassword(request);

    const { id } = await context.params;
    const body = (await request.json()) as { status?: unknown };
    const feedback = await updateFeedbackStatus(id, body.status);

    return jsonWithCors({
      ok: true,
      feedback
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonWithCors({ error: error.message }, error.status);
    }

    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Could not update feedback."
      },
      500
    );
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  try {
    await assertAdminPassword(request);

    const { id } = await context.params;
    const feedback = await deleteFeedback(id);

    return jsonWithCors({
      ok: true,
      feedback
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonWithCors({ error: error.message }, error.status);
    }

    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Could not delete feedback."
      },
      500
    );
  }
}
