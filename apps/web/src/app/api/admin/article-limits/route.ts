import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

const DOMAINS = ["net", "site", "tagcrush"] as const;
const fields = ["monthlyArticleLimit", "dailyArticleLimit", "maxTitlesPerBatch"] as const;

export const dynamic = "force-dynamic";

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 403 }); }
  const configs = await prisma.articleLimitsConfig.findMany({ orderBy: { platformDomain: "asc" } });
  return NextResponse.json({ configs }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "No autorizado" }, { status: 403 }); }
  const body = await request.json();
  const platformDomain = typeof body.platformDomain === "string" ? body.platformDomain : "";
  if (!(DOMAINS as readonly string[]).includes(platformDomain)) return NextResponse.json({ error: "Servidor no válido" }, { status: 400 });
  const data: Record<string, number | null> = {};
  for (const field of fields) {
    const value = body[field];
    if ((field === "monthlyArticleLimit" || field === "dailyArticleLimit") && value === null) data[field] = null;
    else if (Number.isInteger(value) && value >= (field === "maxTitlesPerBatch" ? 1 : 0)) data[field] = value;
    else return NextResponse.json({ error: `${field} no es válido` }, { status: 400 });
  }
  const config = await prisma.articleLimitsConfig.upsert({ where: { platformDomain }, create: { platformDomain, ...data } as never, update: data });
  return NextResponse.json({ config });
}
