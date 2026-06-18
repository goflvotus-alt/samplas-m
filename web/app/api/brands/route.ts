import brands from "@/data/brands.sample.json";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";

export function OPTIONS(): Response {
  return optionsResponse();
}

export function GET(): Response {
  return jsonWithCors(brands);
}

export function POST(): Response {
  return jsonWithCors(
    {
      error: "Brand editing is scaffolded but not connected to persistent storage yet."
    },
    501
  );
}
