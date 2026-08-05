import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/adminSession";
import { getAdminUsersData } from "@/lib/admin-users";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (auth.error) return auth.error;

  try {
    const data = await getAdminUsersData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de lire les utilisateurs inscrits.",
      },
      { status: 500 },
    );
  }
}
