import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    GITHUB_ACTIONS_TOKEN: process.env.GITHUB_ACTIONS_TOKEN ? "present" : "missing",
    GITHUB_REPO: process.env.GITHUB_REPO,
  });
}
