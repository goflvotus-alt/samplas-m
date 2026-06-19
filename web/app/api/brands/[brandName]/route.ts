import { ApiError } from "@/lib/apiError";
import { assertAdminPassword } from "@/lib/adminAuth";
import { deleteBrand, upsertBrand } from "@/lib/brandStore";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    brandName: string;
  }>;
};

export function OPTIONS(): Response {
  return optionsResponse();
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  try {
    await assertAdminPassword(request);

    const { brandName } = await context.params;
    const body = await request.json();
    const brands = await upsertBrand(body, decodeURIComponent(brandName));

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
        error: error instanceof Error ? error.message : "Could not update brand."
      },
      500
    );
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  try {
    await assertAdminPassword(request);

    const { brandName } = await context.params;
    const brands = await deleteBrand(decodeURIComponent(brandName));

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
        error: error instanceof Error ? error.message : "Could not delete brand."
      },
      500
    );
  }
}
