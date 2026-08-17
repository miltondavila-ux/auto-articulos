import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw || !raw.includes("pooler.supabase.com")) return raw;
  try {
    const url = new URL(raw);
    // Supabase Transaction Pooler (6543) must not reuse prepared statements.
    // Keep this defensive so production remains safe even if Vercel's value
    // was saved without the Prisma pooler flags.
    if (url.port === "6543") {
      url.searchParams.set("pgbouncer", "true");
      url.searchParams.set("connection_limit", "1");
      return url.toString();
    }
  } catch {
    // Let Prisma report the original malformed URL with its usual diagnostic.
  }
  return raw;
}

const prismaUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
export const prisma = global.__prisma ?? new PrismaClient(
  prismaUrl ? { datasources: { db: { url: prismaUrl } } } : undefined,
);

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export * from "@prisma/client";
