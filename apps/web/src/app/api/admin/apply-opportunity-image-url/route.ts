import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { requireAdmin } from "@/lib/current-user";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 500 });
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query('ALTER TABLE "SocialOpportunity" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;');
    await client.end();
    return NextResponse.json({ ok: true, applied: 'ALTER TABLE "SocialOpportunity" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

