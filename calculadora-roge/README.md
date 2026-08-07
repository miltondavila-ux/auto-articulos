# Calculadora ROGE — Fase 1 (Agente Productor)

Widget HTML/CSS/JS autocontenido, sin backend ni dependencias externas, que compara el ingreso neto anual de un agente entre ROGE, MY Realty Group, LPT Realty, La Rosa Realty y eXp Realty USA.

## Cómo embeberlo

1. Abre [`roge-calculadora.html`](roge-calculadora.html).
2. Copia todo el contenido entre los comentarios:
   ```
   <!-- BLOQUE EMBEBIBLE — copia desde aquí... -->
   ...
   <!-- ...hasta aquí -->
   ```
3. Pega ese bloque (el `<div id="rogecalc-widget">` completo, con su `<style>` y `<script>`) en cualquier página HTML existente del sitio de ROGE.

No requiere servidor, build step, ni llamadas externas. Todo el CSS y JS está namespaced bajo `#rogecalc-widget` para no chocar con los estilos del sitio anfitrión.

## Supuestos editables (con valores por defecto)

| Supuesto | Default | Estado |
|---|---|---|
| Tasa de comisión por lado | 3% | Estimado, editable |
| ROGE — cuota mensual / anual | $55 / $348 | Confirmado (PRD 8.1) |
| MY Realty Group — cuota mensual/anual/fee por tx | $0 / $0 / $0 | **Sin dato público** — confirmar con la agencia |
| LPT — ¿fee por tx lo paga el agente? | Sí | Supuesto, no confirmado |
| La Rosa — cuota mensual / fee por tx | $40 / $595 | Punto medio del rango publicado |
| La Rosa — ¿fee por tx lo paga el agente? | Sí | Supuesto, no confirmado |
| eXp — cuota mensual / risk mgmt fee | $85 / $40 | Confirmado |

## Estado del roadmap

- ✅ **Fase 1** — Modo Agente Productor (este archivo).
- ⏳ **Fase 2** — Modo Equity Club / Revenue Share. Pendiente de aprobación explícita tras verificar Fase 1, según el PRD (`../PRD_CALCULADORA_ROGE.md`, sección 14).
