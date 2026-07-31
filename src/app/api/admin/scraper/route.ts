import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  getAdminDashboardData,
  triggerScraperRun,
} from "../../../../lib/admin-dashboard";

export const runtime = "nodejs";

export async function GET() {
  const payload = getAdminDashboardData();
  return NextResponse.json(payload);
}

export async function POST() {
  try {
    const scraperHealth = await triggerScraperRun();

    revalidatePath("/admin");

    return NextResponse.json({
      scraperHealth,
      message: scraperHealth.message ?? "Le scraper a bien été déclenché.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Le scraper n'a pas pu être déclenché.",
      },
      { status: 500 },
    );
  }
}
