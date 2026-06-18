import { ApiError } from "@/lib/cardNews";

export function assertAdminPassword(request: Request): void {
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    throw new ApiError(500, "ADMIN_PASSWORD is missing. Add it in Vercel Project Settings > Environment Variables.");
  }

  const providedPassword = request.headers.get("x-admin-password") || "";

  if (providedPassword !== expectedPassword) {
    throw new ApiError(401, "Admin password is incorrect.");
  }
}
