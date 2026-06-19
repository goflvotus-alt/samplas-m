import { ApiError } from "@/lib/apiError";
import { assertAdminPassword } from "@/lib/adminAuth";
import { getBrands, upsertBrand } from "@/lib/brandStore";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function GET(): Promise<Response> {
  const { brands, storage } = await getBrands();
  const response = jsonWithCors(brands);
  response.headers.set("X-Samplas-Storage", storage);
  return response;
}

export async function POST(request: Request): Promise<Response> {
  try {
    await assertAdminPassword(request);

    const body = await request.json();
    const brands = await upsertBrand(body);

    return jsonWithCors({
      ok: true,
      brands
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonWithCors({ error: error.message }, error.status);
    }

    return jsonWithCors(
      {
        error: error instanceof Error ? error.message : "Could not save brand."
      },
      500
    );
  }
}
