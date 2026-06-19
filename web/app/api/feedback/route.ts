import { createFeedback, getFeedbackEntries } from "@/lib/feedbackStore";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function GET(): Promise<Response> {
  const { feedback, storage } = await getFeedbackEntries();
  const response = jsonWithCors(feedback);
  response.headers.set("X-Samplas-Storage", storage);
  return response;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const feedback = await createFeedback(body);

    return jsonWithCors({
      ok: true,
      feedback
    });
  } catch (error) {
    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Could not save feedback."
      },
      500
    );
  }
}
