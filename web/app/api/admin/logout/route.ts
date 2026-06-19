import { clearAdminSessionCookie } from "@/lib/adminAuth";
import { optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function POST(): Promise<Response> {
  const response = new Response(null, {
    status: 303,
    headers: {
      Location: "/login"
    }
  });
  response.headers.append("Set-Cookie", clearAdminSessionCookie());
  return response;
}
