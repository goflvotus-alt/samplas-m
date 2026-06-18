import feedback from "@/data/feedback.sample.json";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";

export function OPTIONS(): Response {
  return optionsResponse();
}

export function GET(): Response {
  return jsonWithCors(feedback);
}

export function POST(): Response {
  return jsonWithCors(
    {
      error: "Feedback storage is scaffolded but not connected to persistent storage yet."
    },
    501
  );
}
