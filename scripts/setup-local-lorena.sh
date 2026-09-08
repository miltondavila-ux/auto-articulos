#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -z "${LOCAL_LORENA_PASSWORD:-}" ]]; then
  echo "Falta LOCAL_LORENA_PASSWORD (usa una contraseña exclusiva para local)." >&2
  exit 1
fi

docker-compose up -d postgres
npm run db:generate
npm run db:migrate:deploy --workspace=packages/db
npm run local:lorena --workspace=packages/db

echo "Entorno local listo. Arranca la web con: npm run dev:web"
echo "Correo de prueba: lorenalvarez30@gmail.com"
