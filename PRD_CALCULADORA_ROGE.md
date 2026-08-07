# Calculadora ROGE

## Documento maestro del proyecto (PRD corto)

Este documento es la fuente de verdad para que **Claude Code** diseñe y construya la Calculadora ROGE. Contiene el objetivo del producto, las reglas de negocio exactas de las 5 correduras comparadas, el flujo de usuario, la arquitectura del widget y los criterios de aceptación.

**No deberá escribirse una sola línea de código hasta que la Fase 0 (sección 6) haya sido revisada y aprobada.**

---

## 1. Propósito del documento

Definir con precisión matemática y de negocio cómo debe funcionar un widget web público que compara el ingreso neto de un agente inmobiliario bajo el modelo de **ROGE (Realty ONE Group Evolution)** frente a los modelos de **MY Realty Group, LPT Realty, La Rosa Realty y eXp Realty USA**. El objetivo es que Claude Code tenga toda la información de negocio necesaria sin tener que inventar cifras.

## 2. Rol que debe asumir Claude Code

Actuar como ingeniero frontend senior + analista de producto. Debe:
- Validar los supuestos marcados como "no confirmados" antes de programarlos como definitivos.
- Priorizar la exactitud del cálculo financiero sobre la estética.
- Diseñar el widget para que sea embebible (copiar/pegar) en cualquier página web existente, sin backend ni dependencias externas.

## 3. Visión

Que cualquier agente inmobiliario o prospecto de reclutamiento que visite la página de ROGE pueda, en segundos y sin registrarse, ver cuánto ganaría con ROGE frente a otras 4 correduras conocidas — tanto por producción de ventas como por ingreso de referidos (Equity Club / revenue share) — usando cifras reales del modelo de cada compañía.

## 4. Objetivo principal

Entregar un widget HTML/CSS/JS autocontenido, con la misma calidad de interacción que el archivo de referencia adjunto (`Reinventate_calculadora.html`): sliders en tiempo real, tarjetas comparativas, barras de neto anual y un veredicto en texto — adaptado a la identidad de marca ROGE (negro + dorado) y a las reglas de comisión reales de las 5 correduras.

## 5. Tipo de producto y usuarios

- **Tipo**: widget público embebido (`<div>` + `<script>`) en una página web existente de ROGE.
- **Usuarios**: cualquier visitante de la web — agentes activos evaluando un cambio de corredura, o prospectos de reclutamiento. Sin login, sin cuentas, sin roles.
- **Captura de datos**: ninguna. El widget es 100% anónimo y de uso libre. No se piden email, teléfono ni nombre en ningún punto del flujo.
- **Persistencia**: ninguna. Cálculo 100% client-side, sin backend, sin base de datos, sin llamadas a APIs externas.

## 6. Fase 0 obligatoria — antes de escribir código

Antes de programar, Claude Code debe presentar para aprobación:

- Arquitectura completa del widget (estructura de archivos, cómo se embebe).
- Confirmación o corrección de cada supuesto marcado como "⚠️ no confirmado" en la sección 8.
- Fórmulas exactas de cálculo por corredura, mostradas de forma explícita (como pseudocódigo) para validación antes de implementarlas.
- Mapa de los 2 modos del widget (Agente Productor / Equity Club-Revenue Share) y sus inputs.
- Estructura de carpetas.
- Propuestas de mejora si detecta inconsistencias adicionales en los datos de la sección 8.

**No deberá escribirse una sola línea de código hasta que esta fase haya sido revisada y aprobada.**

## 7. Flujo general

El widget tiene un selector de modo (tabs), igual que el patrón `Agente autónomo / Prescriptor +55` del archivo de referencia:

1. **Modo "Agente Productor"** — el usuario mueve sliders de su actividad de ventas (ventas al año, precio medio de venta, y si aplica, experiencia/camino). El widget calcula y muestra el ingreso neto anual bajo ROGE vs las 4 correduras, con tarjetas, barras y un veredicto.
2. **Modo "Equity Club / Revenue Share"** — el usuario mueve sliders de su red de referidos/reclutados (número de referidos directos, cierres promedio, etc.). El widget calcula el ingreso pasivo anual bajo el esquema de referidos/revenue-share de ROGE vs las 4 correduras.

Ambos modos comparten cabecera, identidad visual y estructura de tarjetas/barras/veredicto del archivo de referencia.

## 8. Reglas de negocio — modelo de cada corredura

**Convención común**: se usa como base la "producción" del agente = `ventas_al_año × precio_medio_de_venta × tasa_de_comisión_por_lado`. La tasa de comisión por lado es un supuesto editable (por defecto 3%, igual que el archivo de referencia), visible y ajustable en un panel de "Supuestos" desplegable — así cualquier imprecisión de mercado la corrige el usuario, no el código.

Regla crítica de todas las correduras: **una tarifa solo se resta del neto del agente si la paga el agente.** Las tarifas que el PDF de ROGE indica como "cobrada al vendedor o comprador" **no** se descuentan del ingreso del agente — son costo del cliente, no del agente. Esto debe respetarse igual para los competidores salvo que se indique lo contrario.

### 8.1 ROGE (Realty ONE Group Evolution)

**Camino 1 — Programa 100% de Comisión** (agente con 5+ transacciones cerradas):
- Ventas residenciales ≤ $1M: **100%** de la producción.
- Ventas residenciales > $1M, ventas de negocios, ventas comerciales: **95% / 5%**.
- Alquileres (residencial y comercial): **90% / 10%**.
- Costos fijos del agente (si aplica): $55/mes (plataforma y tecnología) + $348/año (pagada con la primera transacción del año).
- Tarifa de transacción: **$549 por transacción, pagada por el vendedor o comprador** (no se resta del neto del agente). Sube a **$649** en las transacciones donde se activa un pago de Equity Club (ver 8.1.3) — la diferencia de $100 financia esa comisión de referido, tampoco sale del agente.
- Otras tarifas ($30 depósito escrow-renta, $30 transferencia de fondos): pagadas por el cliente, no se descuentan del agente.

**Camino 2 — Programa de Mentoría** (agente nuevo/sin experiencia, hasta completar 5 cierres, 2 de reventa):
- Todas las categorías (residencial, negocios, comercial, alquileres): **70% / 30%**.
- Al completar 5 cierres, pasa automáticamente al Camino 1.
- Tras 24 alquileres cerrados, la división de alquileres mejora a 90%/10% (aunque siga en 70/30 en el resto).
- Mismos costos fijos y tarifas de transacción que el Camino 1.

**Equity Club** (aplica a ambos caminos, disponible desde el 2º agente referido y desde el primer cierre de su red):
- Sistema de referidos a **máximo 2 niveles**.
- Nivel 1 (referido directo): **$150 por cierre** de ese referido.
- Nivel 2 (referido de tu referido): **$50 por cierre** de ese referido indirecto.
- Esta comisión no sale del bolsillo del agente ni del referido: sale de la diferencia de tarifa de transacción ($549 → $649) que cobra el broker en esa transacción específica.
- Sin rangos, sin requisitos de reclutamiento de equipo tradicional; ROGE se encarga del entrenamiento/onboarding de los referidos.

### 8.2 MY Realty Group

- Agentes nuevos: **70/30** en las primeras 3 transacciones → **100% comisión** después.
- Agentes con experiencia: acceso directo a **100% comisión**.
- ⚠️ **No confirmado, investigación profunda agotada**: se buscó en el sitio oficial (`myrealtygroup.us`), Reddit, BiggerPockets, Glassdoor, Indeed, RateMyAgent y el directorio de la asociación local de realtors (Osceola County Association of REALTORS®, donde la oficina está registrada). Ninguna fuente pública indica cuota mensual, cuota anual o tarifa por transacción. Es una empresa pequeña/regional sin la exposición pública de las otras tres. **Usar $0 por defecto** en el panel de supuestos con la etiqueta "sin dato público tras búsqueda exhaustiva — confirmar directamente con la agencia antes de publicar el widget".
- **Ingreso residual por reclutamiento** (equivalente a Equity Club), estructura por niveles de red construida (no por cierres de referidos, sino por tamaño de red y antigüedad de nivel):
  | Nivel | Requisito | Pago por agente en red |
  |---|---|---|
  | Junior | 3 reclutados | $100/mes |
  | Senior | 10 agentes en red | $125/mes |
  | Director | 15 agentes | $150/mes |
  | Executive | 20 agentes | $185/mes |
  | Regional | 25 agentes | $260/mes |

  Modelo de ejemplo dado por la fuente: nivel Regional con 25 agentes = 25 × $260 = $6.500/mes. Para el widget, el input relevante en modo "Revenue Share" es "tamaño de tu red" y el cálculo selecciona el nivel correspondiente y multiplica agentes × pago mensual × 12.

### 8.3 LPT Realty

- Dos planes a elección del usuario (input tipo toggle):
  - **Plan Blueprint**: split 80/20 hasta un cap de **$15.000** pagado a la corredora; tras el cap, **$195 por transacción**.
  - **Plan Business Builder**: **$500 por transacción** hasta un cap de **$5.000**; tras el cap, **$195 por transacción**.
- **Sin cuota mensual** en ningún plan.
- **Revenue share — confirmado**: LPT retiene 50% del "company dollar" de cada transacción y destina el otro 50% al pool de revenue share, repartido en 7 niveles del upline del agente que transacciona:
  | Nivel | % del pool de revenue share | Mínimo de agentes directos activos requerido |
  |---|---|---|
  | 1 | 31% | 1 |
  | 2 | 18% | 3 |
  | 3 | 7% | 6 |
  | 4 | 7% | 9 |
  | 5 | 7% | 14 |
  | 6 | 10% | 18 |
  | 7 | 20% | 20 |

  Los 7 niveles suman 100% del pool (= 50% del company dollar de cada transacción de la red). Fuente: smartagentalliance.com / next-genagents.com (comparativas de brokerage 2026).
- ⚠️ **No confirmado**: quién paga el fee de $195/$500 por transacción (agente o cliente). Asumir que lo paga el agente (se resta del neto), por ser lo habitual en modelos de cap con "transaction fee", y marcarlo como supuesto editable.

### 8.4 La Rosa Realty

- **100% comisión** con cuota mensual de $0–$75 y tarifa de $495–$695 por transacción (varía por región) — usar el punto medio como valor por defecto editable: $40/mes y $595/transacción.
- Alternativa: **90/10** con cuota de $60/mes, $495/transacción y cap de $10.000.
- Agentes nuevos: primeras 3 transacciones en 70/30, luego 100% inmediato.
- La fuente indica que el fee por transacción "puede pasarse al cliente" — por defecto, asumir que **lo paga el agente** (se resta del neto), igual que LPT, y dejarlo como supuesto editable.
- **Revenue share — confirmado, "Ultimate Plan"** (lanzado en 2023, comunicado oficial de La Rosa Holdings Corp.): plan de 90/10 (90% al agente, 10% financia el pool de revenue share) hasta un cap de **$10.000 por año** pagado al pool; al superar **$100.000 de producción anual**, el agente pasa a 100% comisión. El 10% recolectado se reparte en 5 niveles del upline:
  | Nivel | % del pool de revenue share |
  |---|---|
  | 1 (referido directo) | 50% |
  | 2 | 21% |
  | 3 | 10% |
  | 4 | 10% |
  | 5 | 9% |

  Sin requisito mínimo de producción para empezar a cobrar desde el primer referido. Fuente: comunicado GlobeNewswire "La Rosa Launches Multi-Level Revenue Share Plan for Agents" (nov. 2023) y presentación a inversionistas de La Rosa Holdings Corp. Esto **corrige** la nota anterior de este documento, que asumía —incorrectamente— que La Rosa no tenía programa de referidos equivalente al Equity Club.

### 8.5 eXp Realty USA

- Split único **80/20** para todos los agentes, sin importar producción ni antigüedad, hasta un cap de **$16.000** pagado a la corredora; tras el cap, agente conserva 100% (menos fees de transacción).
- Cuota: **$85/mes**, más **$40 por transacción** (risk management fee), pagados por el agente.
- **Revenue share — confirmado, pero con mecánica compleja de doble columna**: eXp reparte revenue share sobre el AGCI (Adjusted Gross Commission Income) de la red del agente, hasta 7 niveles del árbol de patrocinio (sponsor tree). Cada nivel tiene dos componentes: **"eXpansion Share"** (garantizado desde el primer agente patrocinado, sin requisitos) y **"eXponential Share"** (se desbloquea solo si el agente acumula suficientes "Front Line Qualifying Agents" o FLQA — agentes directos con ≥$5.000 de GCI en los últimos 6 meses):
  | Nivel | eXpansion Share (garantizado) | eXponential Share (desbloqueable) | FLQA requeridos para desbloquear |
  |---|---|---|---|
  | 1 | 3.5% | — | — |
  | 2 | 0.2% | 3.8% | 5 |
  | 3 | 0.1% | 2.4% | 5 |
  | 4 | 0.1% | 1.4% | 5 |
  | 5 | 0.1% | 0.9% | 10 |
  | 6 | 0.5% | 2.0% | 15 |
  | 7 | 0.5% | 4.5% | 30 |

  Fuente: buildingbetteragents.com, smartagentalliance.com, theexponentialfiles.com (chart oficial de eXp Revenue Share Plan).
  **Nota para Fase 0**: pedirle al usuario que ingrese FLQA por nivel es demasiado complejo para un widget de marketing. Claude Code debe proponer en la Fase 0 una simplificación razonable (p. ej. un único input "tamaño de tu red" con un toggle "¿ya tienes agentes calificados (FLQA)?" que active o no el eXponential Share) y obtener aprobación antes de programarlo.

## 9. Diseño y marca

- Paleta: negro + dorado, siguiendo la identidad "ONE" vista en el PDF de ROGE (círculo dorado "ONE", tipografía elegante, acabados en dorado sobre fondo negro/blanco).
- Mismo lenguaje visual que el archivo de referencia (`Reinventate_calculadora.html`): tarjetas con card ganadora resaltada, barras horizontales de comparación, panel de "Supuestos" colapsable con inputs editables, veredicto en texto destacado.
- Responsive: debe funcionar embebido en cualquier ancho de contenedor de la web anfitriona (igual que el grid `minmax(0,360px) 1fr` con fallback a una columna en móvil del archivo de referencia).

## 10. Stack técnico

- **HTML + CSS + JavaScript puro, autocontenido en un solo archivo**, sin frameworks ni dependencias externas ni build step — igual que el archivo de referencia.
- Debe poder incrustarse copiando un bloque `<div>` + `<script>` en cualquier página existente, sin conflictos de CSS/JS con el resto del sitio (namespacing de clases/IDs).
- Sin backend, sin base de datos, sin llamadas a APIs externas.

## 11. Roadmap (2 fases)

- **Fase 1**: Modo "Agente Productor" completo — comparación de ingreso neto anual de ROGE (Camino 1 y Camino 2) vs MY Realty, LPT, La Rosa y eXp, con panel de supuestos editable para las tasas/fees no confirmados.
- **Fase 2**: Modo "Equity Club / Revenue Share" — comparación de ingreso pasivo por referidos/reclutamiento de ROGE vs las 4 correduras, incluyendo el caso de La Rosa sin programa equivalente.

## 12. Riesgos y mitigaciones

- **Único dato aún no confirmado tras investigación profunda**: cuotas/fees de MY Realty Group (mensual, anual, por transacción). Mitigado con panel de supuestos editable, valor por defecto $0 y etiqueta visible "sin dato público — confirmar con la agencia" — no bloquea el desarrollo, pero el veredicto textual no debe afirmar esta cifra como definitiva.
- **Mecánica de eXp Revenue Share** (eXpansion Share vs eXponential Share, desbloqueo por FLQA) es demasiado compleja para replicarse 1:1 en un input de slider — requiere una simplificación de UX que debe aprobarse en Fase 0 (ver sección 8.5).
- **Ambigüedad de quién paga cada fee** (agente vs cliente): resuelto explícitamente para ROGE; para LPT y La Rosa se deja como supuesto editable por defecto "lo paga el agente".
- **Presentar el widget como asesoría financiera**: el pie de página debe incluir un disclaimer de que las cifras son ilustrativas y deben validarse con cada corredora antes de tomar una decisión (mismo patrón que el footer del archivo de referencia).

## 13. Criterios de aceptación

- El widget calcula y actualiza en tiempo real (sin recargar página) al mover cualquier slider, en ambos modos.
- Los 5 competidores (ROGE + 4) aparecen siempre en la comparación, con la tarjeta ganadora resaltada visualmente.
- Todos los supuestos marcados ⚠️ en la sección 8 son editables desde el panel de "Supuestos" del widget, con los valores por defecto documentados en este documento.
- El widget no envía, guarda ni solicita ningún dato personal del visitante.
- El widget se embebe correctamente copiando un único bloque de código en una página HTML externa, sin romper estilos del resto del sitio.
- Fase 1 y Fase 2 son entregables independientes y verificables por separado.

## 14. Instrucciones finales antes de escribir código

1. Presentar la Fase 0 (sección 6) para aprobación explícita del usuario.
2. Confirmar o corregir cada supuesto marcado ⚠️ en la sección 8 antes de fijarlo en el código.
3. Mostrar las fórmulas de cálculo de cada corredura como pseudocódigo, para revisión, antes de implementarlas.
4. No añadir captura de datos, backend, analítica ni integraciones no solicitadas en este documento.
5. No iniciar la Fase 2 hasta que la Fase 1 esté aprobada y verificada.
