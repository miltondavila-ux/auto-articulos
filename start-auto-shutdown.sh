#!/bin/bash
# Inicia la app y la apaga automáticamente tras 5 minutos sin uso

set -e

cd "$(dirname "$0")"

INACTIVITY_TIMEOUT=300  # 5 minutos en segundos
LOG_FILE="/tmp/autoarticulos_activity.log"

echo "🚀 Iniciando Auto Artículos..."
echo "⏱️  Se apagará automáticamente tras ${INACTIVITY_TIMEOUT}s sin actividad"
echo ""

# Limpiar estado anterior
docker-compose down 2>/dev/null || true
rm -f "$LOG_FILE"

# Iniciar servicios en background
docker-compose up --build > "$LOG_FILE" 2>&1 &
COMPOSE_PID=$!

echo "✅ Servicios iniciados (PID: $COMPOSE_PID)"
echo "📍 Accede en: http://localhost:3000"
echo ""

# Esperar a que el servicio web esté listo
echo "Esperando que el servidor esté listo..."
for i in $(seq 1 60); do
  if grep -qE "Ready|started server|Local:|Listening on" "$LOG_FILE" 2>/dev/null; then
    echo "✅ Servidor listo"
    break
  fi
  if ! kill -0 $COMPOSE_PID 2>/dev/null; then
    echo "❌ Error al iniciar servicios"
    cat "$LOG_FILE"
    exit 1
  fi
  sleep 1
done

# Monitorear actividad
last_activity=$(date +%s)
last_line_count=$(wc -l < "$LOG_FILE" 2>/dev/null || echo "0")

echo ""
echo "👀 Monitoreando actividad... (sin actividad por ${INACTIVITY_TIMEOUT}s = apagar)"
echo ""

while kill -0 $COMPOSE_PID 2>/dev/null; do
  sleep 5

  current_line_count=$(wc -l < "$LOG_FILE" 2>/dev/null || echo "0")

  # Si aparecieron líneas nuevas, hay actividad
  if [ "$current_line_count" -gt "$last_line_count" ]; then
    # Verificar si hay requests HTTP en las líneas nuevas
    new_lines=$(tail -n +"$((last_line_count + 1))" "$LOG_FILE" 2>/dev/null)
    if echo "$new_lines" | grep -qE 'GET|POST|PUT|DELETE|PATCH|HEAD'; then
      last_activity=$(date +%s)
    fi
    last_line_count=$current_line_count
  fi

  now=$(date +%s)
  elapsed=$((now - last_activity))
  remaining=$((INACTIVITY_TIMEOUT - elapsed))

  # Mostrar countdown cada 30 segundos
  if [ $((elapsed % 30)) -eq 0 ] && [ $elapsed -gt 0 ]; then
    echo "⏳ Sin actividad: ${elapsed}s / ${INACTIVITY_TIMEOUT}s (apagado en ${remaining}s)"
  fi

  if [ $elapsed -ge $INACTIVITY_TIMEOUT ]; then
    echo ""
    echo "🔴 Sin actividad por ${INACTIVITY_TIMEOUT}s. Apagando automáticamente..."
    break
  fi
done

# Apagar todo
echo "🛑 Deteniendo servicios..."
docker-compose down

# Limpiar
wait $COMPOSE_PID 2>/dev/null || true
rm -f "$LOG_FILE"

echo ""
echo "✅ Auto Artículos apagado correctamente."
