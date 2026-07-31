import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  applyBulkAction,
  getAdminDashboardData,
} from "../../../../../lib/admin-dashboard";

export const runtime = "nodejs";

type BulkRoutePayload = {
  action?: "delete" | "verify" | "archive";
  ids?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BulkRoutePayload;

    if (
      body.action !== "delete" &&
      body.action !== "verify" &&
      body.action !== "archive"
    ) {
      return NextResponse.json(
        { error: "Action en masse invalide." },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: "Aucune offre sélectionnée." },
        { status: 400 },
      );
    }

    const ids = body.ids.map((id) => String(id));
    const result = applyBulkAction(body.action, ids);
    const payload = getAdminDashboardData();

    revalidatePath("/admin");

    return NextResponse.json({
      ...payload,
      message: `${result.updated} offre${
        result.updated > 1 ? "s ont été traitées" : " a été traitée"
      }.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'appliquer l'action en masse.",
      },
      { status: 500 },
    );
  }
}
