#!/usr/bin/env bash
# Coordinación local de migraciones. No invoca Prisma ni modifica la base.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT_DIR/packages/db/prisma/migrations"
LOCK_DIR="$ROOT_DIR/.migration-coordination/active"
COORDINATION_DOC="$ROOT_DIR/COORDINACION_CLAUDE_CODEX.md"

usage() {
  cat <<'EOF'
Uso:
  scripts/migration-coordinator.sh status
  scripts/migration-coordinator.sh claim "Nombre del programador" "Motivo/lote"
  scripts/migration-coordinator.sh release "Nombre del programador" "Resultado"

Nunca ejecuta Prisma ni cambia la base de datos. Después de claim/release,
copia el bloque que imprime al documento COORDINACION_CLAUDE_CODEX.md.
EOF
}

list_migrations() {
  find "$MIGRATIONS_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort
}

case "${1:-}" in
  status)
    echo "=== Migraciones locales presentes ==="
    list_migrations
    echo
    if [[ -f "$LOCK_DIR/captain.txt" ]]; then
      echo "=== Capitán de migración activo ==="
      cat "$LOCK_DIR/captain.txt"
      echo
      echo "No ejecutes prisma migrate deploy: coordina primero con esa persona."
    else
      echo "No hay capitán activo. Un solo programador debe reclamar el lote:"
      echo "  scripts/migration-coordinator.sh claim \"Tu nombre\" \"revisión y despliegue del lote\""
    fi
    ;;

  claim)
    NAME="${2:-}"
    REASON="${3:-}"
    [[ -n "$NAME" && -n "$REASON" ]] || { usage; exit 2; }
    mkdir -p "$(dirname "$LOCK_DIR")"
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      {
        echo "programador: $NAME"
        echo "motivo: $REASON"
        echo "reclamado_utc: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
        echo "commit_base: $(git -C "$ROOT_DIR" rev-parse --short HEAD)"
      } > "$LOCK_DIR/captain.txt"
      echo "Reclamo creado. Pega esto en $COORDINATION_DOC:"
      echo
      echo "- **Capitán de migración:** $NAME — revisará y aplicará el lote completo. Motivo: $REASON. Nadie más ejecuta Prisma hasta su liberación."
    else
      echo "Ya hay un capitán activo:" >&2
      cat "$LOCK_DIR/captain.txt" >&2
      exit 1
    fi
    ;;

  release)
    NAME="${2:-}"
    RESULT="${3:-}"
    [[ -n "$NAME" && -n "$RESULT" ]] || { usage; exit 2; }
    [[ -f "$LOCK_DIR/captain.txt" ]] || { echo "No hay capitán activo." >&2; exit 1; }
    if ! grep -Fqx "programador: $NAME" "$LOCK_DIR/captain.txt"; then
      echo "Solo el capitán registrado puede liberar el lote:" >&2
      cat "$LOCK_DIR/captain.txt" >&2
      exit 1
    fi
    rm "$LOCK_DIR/captain.txt"
    rmdir "$LOCK_DIR"
    echo "Lote liberado. Pega esto en $COORDINATION_DOC:"
    echo
    echo "- **Capitán de migración liberó el lote:** $NAME. Resultado: $RESULT. Revisar `git status --short` antes de reclamar otro lote."
    ;;

  *) usage; exit 2 ;;
esac
