#!/usr/bin/env bash
# Verificación local obligatoria antes de subir cambios de código a producción.
#
# Reproduce EXACTAMENTE lo que Vercel ejecuta (Root Directory = apps/web,
# buildCommand = "npm run build", outputDirectory = ".next" — ver la
# "ADVERTENCIA CRÍTICA SOBRE VERCEL" en COORDINACION_CLAUDE_CODEX.md) más el
# resto de las verificaciones que ya exige el Protocolo de No Destrucción,
# en un solo comando: `npm run verify` desde la raíz del repo.
#
# Requiere una base de datos Postgres local accesible por DATABASE_URL
# (ver .env.example). La forma más simple: `docker-compose up -d postgres`.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env.local ]; then
    set -a; source .env.local; set +a
  elif [ -f .env ]; then
    set -a; source .env; set +a
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Falta DATABASE_URL. Arranca la base local con:"
  echo "   docker-compose up -d postgres"
  echo "   (usa las mismas credenciales que .env.example: postgresql://autoarticulos:autoarticulos@localhost:5432/autoarticulos?schema=public)"
  exit 1
fi

echo "== 1/6 · git diff --check (sin errores de espacio en blanco) =="
git diff --check

echo "== 2/6 · Prisma generate =="
npm run db:generate

echo "== 3/6 · Typecheck de apps/web =="
npm run typecheck --workspace=apps/web

echo "== 4/6 · Build de apps/web (mismo comando exacto que usa Vercel) =="
(cd apps/web && npm run build)

echo "== 5/6 · Build de apps/worker (incluye chequeo de tipos) =="
npm run build --workspace=apps/worker

echo "== 6/6 · Tests de apps/worker =="
npm test --workspace=apps/worker

echo ""
echo "✅ Verificación local completa. Esto reproduce las auditorías 1 y 2"
echo "   (funcional/regresión) del Protocolo. La auditoría 3 (integración/"
echo "   producción real) sigue haciéndose sobre el Preview/despliegue real,"
echo "   nunca solo con este script."
