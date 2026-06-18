import guidelines from "@/data/guidelines.sample.json";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";

export function OPTIONS(): Response {
  return optionsResponse();
}

export function GET(): Response {
  return jsonWithCors(guidelines);
}

export function PUT(): Response {
  return jsonWithCors(
    {
      error: "Guideline editing is scaffolded but not connected to persistent storage yet."
    },
    501
  );
}
