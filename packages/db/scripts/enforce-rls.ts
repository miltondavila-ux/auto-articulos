import { PrismaClient } from "@prisma/client";

// Salvaguarda para tablas nuevas: Postgres no tiene un "RLS activado por
// defecto", y este proyecto usa `prisma db push` (no `migrate deploy`) para
// aplicar cambios de esquema, así que ninguna migración SQL versionada llega
// a ejecutarse contra producción. Sin este paso, cualquier tabla nueva en
// `public` queda expuesta por completo vía la API REST de Supabase
// (PostgREST) hasta que alguien se acuerde de activarle RLS a mano — que es
// exactamente como quedaron expuestas las 26 tablas corregidas el
// 2026-09-02 (ver COORDINACION_CLAUDE_CODEX.md, "TABLA PUBLICA ACCESIBLE
// GRAVE"). Este script corre después de cada `db push` en el workflow de
// migración y activa RLS (sin políticas) en cualquier tabla pública que no
// lo tenga, para que ninguna tabla nueva pueda quedar expuesta más de lo
// que dura una corrida del workflow.

const prisma = new PrismaClient();

async function main() {
  const exposed = await prisma.$queryRaw<{ tablename: string }[]>`
    select tablename from pg_tables
    where schemaname = 'public' and rowsecurity = false
    order by tablename
  `;

  if (exposed.length === 0) {
    console.log('OK: todas las tablas de "public" ya tienen RLS activado.');
    return;
  }

  console.log(
    `Encontradas ${exposed.length} tabla(s) de "public" sin RLS: ` +
      exposed.map((t) => t.tablename).join(", "),
  );

  for (const { tablename } of exposed) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "public"."${tablename}" ENABLE ROW LEVEL SECURITY;`,
    );
    console.log(`RLS activado en "public"."${tablename}".`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
