import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";

export function OPTIONS(): Response {
  return optionsResponse();
}

export function GET(): Response {
  return jsonWithCors({ ok: true });
}
