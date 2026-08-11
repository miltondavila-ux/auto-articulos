import { NextResponse } from "next/server";
import { Client } from "pg";

export async function POST() {
  // Endpoint one-shot: aplica ALTER idempotente. Seguro aún sin auth porque
  // usa IF NOT EXISTS — si la columna ya existe es no-op. Pensado para que
  // el bot pueda ejecutarlo desde cualquier origen cuando Vercel no haya
  // corrido las migraciones en el build. Pensar en eliminarlo una vez
  // estable.
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

