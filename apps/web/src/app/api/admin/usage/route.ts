import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";

interface DbSizeRow {
  bytes: bigint;
}

interface PerUserTitlesRow {
  userId: string;
  email: string;
  runs: bigint;
  titles: bigint;
  titleBytes: bigint;
}

interface PerUserEventsRow {
  userId: string;
  events: bigint;
  eventBytes: bigint;
}

// Todo esto se calcula con agregaciones SQL (COUNT/SUM/pg_database_size)
// hechas por Postgres — solo viajan por la red unos pocos números, nunca
// las filas completas, así que consultar esta página no pesa nada en la
// cuota de transferencia.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [dbSize, perUserTitles, perUserEvents] = await Promise.all([
    prisma.$queryRaw<
      DbSizeRow[]
    >`SELECT pg_database_size(current_database()) as bytes`,
    prisma.$queryRaw<PerUserTitlesRow[]>`
      SELECT
        u.id as "userId",
        u.email as email,
        COUNT(DISTINCT r.id) as runs,
        COUNT(DISTINCT t.id) as titles,
        COALESCE(SUM(LENGTH(t.text)), 0)
          + COALESCE(SUM(LENGTH(COALESCE(t."finalTitle", ''))), 0)
          + COALESCE(SUM(LENGTH(COALESCE(t."errorMessage", ''))), 0) as "titleBytes"
      FROM "User" u
      LEFT JOIN "Run" r ON r."userId" = u.id
      LEFT JOIN "Title" t ON t."runId" = r.id
      GROUP BY u.id, u.email
    `,
    prisma.$queryRaw<PerUserEventsRow[]>`
      SELECT
        u.id as "userId",
        COUNT(e.id) as events,
        COALESCE(SUM(LENGTH(e.message)), 0) as "eventBytes"
      FROM "User" u
      LEFT JOIN "Run" r ON r."userId" = u.id
      LEFT JOIN "Title" t ON t."runId" = r.id
      LEFT JOIN "TitleEvent" e ON e."titleId" = t.id
      GROUP BY u.id
    `,
  ]);

  const eventsByUser = new Map(
    perUserEvents.map((row) => [
      row.userId,
      { events: Number(row.events), eventBytes: Number(row.eventBytes) },
    ]),
  );

  const perUser = perUserTitles
    .map((row) => {
      const events = eventsByUser.get(row.userId) ?? {
        events: 0,
        eventBytes: 0,
      };
      return {
        userId: row.userId,
        email: row.email,
        runs: Number(row.runs),
        titles: Number(row.titles),
        events: events.events,
        estimatedBytes: Number(row.titleBytes) + events.eventBytes,
      };
    })
    .sort((a, b) => b.estimatedBytes - a.estimatedBytes);

  return NextResponse.json({
    databaseSizeBytes: Number(dbSize[0]?.bytes ?? 0),
    perUser,
  });
}
