#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

production_sha="${PRODUCTION_SHA:-}"
if [[ -z "$production_sha" ]]; then
  echo "Falta PRODUCTION_SHA: usa el commit exacto del deployment Production Ready de Vercel." >&2
  echo "No se permite asumir que origin/main es Producción." >&2
  exit 1
fi

git fetch origin main --quiet
git cat-file -e "$production_sha^{commit}"

origin_main_sha="$(git rev-parse origin/main)"
local_sha="$(git rev-parse HEAD)"

echo "Producción (Vercel): $production_sha"
echo "origin/main:        $origin_main_sha"
echo "worktree local:     $local_sha"

if [[ "$origin_main_sha" != "$production_sha" ]]; then
  echo "ADVERTENCIA: origin/main y Producción no están en el mismo commit." >&2
  echo "El worktree debe crearse desde PRODUCTION_SHA y la diferencia debe documentarse." >&2
fi

if ! git merge-base --is-ancestor "$production_sha" HEAD; then
  echo "ERROR: el worktree local no contiene el commit base de Producción." >&2
  exit 1
fi

echo "OK: el worktree local contiene la base exacta de Producción."
