import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json({
    GITHUB_REPO: process.env.GITHUB_REPO,
  });
}
