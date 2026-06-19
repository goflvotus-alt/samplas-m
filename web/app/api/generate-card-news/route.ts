import { ApiError } from "@/lib/apiError";
import { generateCardNews } from "@/lib/cardNews";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const result = await generateCardNews(body);

    return jsonWithCors(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonWithCors(
        {
          error: error.message,
          details: error.details || undefined
        },
        error.status
      );
    }

    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Invalid request."
      },
      400
    );
  }
}
