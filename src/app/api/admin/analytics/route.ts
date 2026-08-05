import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/adminSession";
import { getAdminAnalyticsData } from "@/lib/admin-analytics";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (auth.error) return auth.error;

  try {
    const data = await getAdminAnalyticsData(14);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de lire les données analytics.",
      },
      { status: 500 },
    );
  }
}
