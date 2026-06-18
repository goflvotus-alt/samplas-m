import { jsonWithCors, optionsResponse } from "@/lib/cors";
import { getGuidelineHistory } from "@/lib/guidelineStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function GET(): Promise<Response> {
  const { history, storage } = await getGuidelineHistory();
  const response = jsonWithCors(history);
  response.headers.set("X-Samplas-Storage", storage);
  return response;
}
