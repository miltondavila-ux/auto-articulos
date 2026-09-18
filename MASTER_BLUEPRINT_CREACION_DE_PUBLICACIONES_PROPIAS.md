# MASTER BLUEPRINT — CREACION DE PUBLICACIONES PROPIAS

**Documento maestro del proyecto · Auto Artículos / SEO TOTAL**
**Fecha:** 2026-09-18 · **Autor de la especificación:** Claude (entrevista MAGO con Milton) · **Estado:** ESPECIFICACIÓN APROBADA POR ENTREVISTA — implementación NO iniciada

> Nombre exacto de la conversación: `CREACION DE PUBLICACIONES PROPIAS`.
> Nombres anteriores del mismo proyecto (solo referencia histórica):
> `CLAUDE-5 - PROMPT PUBLICACIONES PROPIAS` y, absorbido por él,
> `CODEX - GPT-5 - CREACION DE TITULOS CON PROMPTS`.
>
> **Este documento reemplaza cualquier especificación anterior de este proyecto** que
> lo contradiga. Cambios respecto a versiones anteriores, decididos por Milton el 2026-09-18:
> (1) ya **no** usa Google Search Console, GA ni Bing; (2) ya **no** se crean categorías
> desde la aplicación; (3) **no** se reutiliza PromptBox (proyecto abandonado); (4) lo que el
> usuario escribe es **efímero** y no toca Configuración; (5) tope de **3 solicitudes por día**.

---

## 1. Propósito del documento

Ser la fuente única de verdad para diseñar y, solo después de aprobación, construir la función
"Crear títulos con la IA del sistema" dentro de Publicaciones propias. Lo lee Claude Code
(o cualquier programador que Milton designe) antes de tocar el repositorio.

## 2. Rol que debe asumir Claude Code

Actúa como **arquitecto y desarrollador senior** de este repositorio existente. No es un
proyecto desde cero: hay stack, base de datos, worker, administración, permisos por módulo y
un protocolo de coordinación que debes respetar. Tu primer entregable no es código: es la
**Fase 0** (sección 13). Reutiliza lo que ya existe; no inventes infraestructura paralela.

## 3. Filosofía del producto

- **Asistido, no automático.** La IA propone; el usuario decide qué se publica.
- **Simple para quien empieza de cero.** El usuario nuevo no tiene datos, ni historial, ni experiencia SEO.
- **El prompt es propiedad de Milton.** El usuario nunca lo ve ni lo edita.
- **Nada de datos que luego no se usan.** Cada dato guardado debe tener un uso definido.
- **Reutilizar antes que construir.** Un solo flujo de publicación, un solo listado de títulos.

## 4. Visión, misión y objetivo

- **Visión:** que cualquier usuario, aun sin datos, llegue a tener artículos indexados en Google y Bing.
- **Misión:** darle títulos segmentados (necesidad + ciudad + país + a quién + desde dónde) listos para publicar.
- **Objetivo principal:** en `/dashboard/publicar`, ofrecer dos caminos —poner títulos **a mano** (como hoy)
  o **crearlos con la IA del sistema**— para que el usuario que empieza de cero publique sus primeros lotes.

## 5. Contexto y problema

El módulo **Oportunidades** (`/dashboard/oportunidades`) funciona con un algoritmo que analiza datos
reales de GSC, GA y Bing. Un usuario **sin datos todavía** no obtiene nada de allí. Hoy en Publicaciones
propias ese usuario debe inventar títulos o pedirlos en ChatGPT y pegarlos. Esta función cubre el
**arranque en frío**: el usuario describe su cliente y su tema, y el sistema, con un prompt
administrado por Milton, devuelve hasta 9 títulos para elegir.

**No debe confundirse con Oportunidades:** aquella parte de datos reales; esta parte solo de lo que el usuario escribe.

## 6. Tipo de producto

Función nueva dentro de un **SaaS multiusuario existente**. Toca: interfaz de usuario, API, base de datos
(una tabla), Administración (una caja de prompt), motor de IA (OpenAI, ya integrado) y manual de usuario.

## 7. Usuarios y permisos

| Rol | Puede |
|---|---|
| Usuario normal con acceso al módulo Publicar | Usar el botón, llenar el formulario, elegir títulos. **No ve ni edita el prompt.** |
| Administrador (Milton) | Escribir/editar el prompt maestro en Administración. Ver el registro de solicitudes. |
| Usuario sin el módulo habilitado | No ve la función (respeta el modelo de permisos por módulo ya existente). |

## 8. Decisiones cerradas por Milton (no reabrir sin su orden)

| # | Decisión |
|---|---|
| 1 | Nombre del proyecto: **CREACION DE PUBLICACIONES PROPIAS**. |
| 2 | Vive en **`/dashboard/publicar`** (menú: "Publicaciones propias"). |
| 3 | Dos caminos: **a mano** (existente) o **con la IA del sistema**. |
| 4 | La IA genera **hasta 9 títulos por solicitud**. |
| 5 | El prompt maestro vive en **Administración**; el usuario no lo ve. |
| 6 | **No usa GSC, GA ni Bing.** Trabaja solo con lo que el usuario escribe. |
| 7 | Los 9 títulos aparecen en una **caja de selección**; el usuario marca cuáles quiere. |
| 8 | Cuántos puede marcar lo limita **dinámicamente su cupo** (el definido en Administración), si es menor que 9. |
| 9 | Los títulos **no marcados se descartan**, pero el sistema **recuerda que ya los ofreció** y no los vuelve a proponer. |
| 10 | **La aplicación no crea categorías.** El usuario las crea en su propia web/plataforma; aquí solo elige entre las **ya sincronizadas**. |
| 11 | Los datos del formulario son **efímeros**: solo sirven para esos 9 títulos; **no se relacionan con Configuración → Contenido**; el formulario empieza vacío. |
| 12 | **Máximo 3 solicitudes por día por usuario**, y la pantalla **debe decirlo** ("Te quedan X de 3"). |
| 13 | Registro compacto para el administrador (ver sección 18), sin acumular basura. |
| 14 | Entrega: **primero se prueba en local**; validado, **se publica para todos**. |
| 15 | Norma de indexación (la aplica el prompt de Milton): dar mucho peso a **necesidad, ciudad, país, a quién atiende, desde dónde atiende y dónde está el producto/servicio**. |

## 9. Fuera de alcance (prohibido construir)

- Crear categorías en la aplicación o dentro del sitio real de 10minutesWebsite.
- Usar datos de GSC, GA o Bing en esta función.
- Guardar o modificar `clientLocations` / `businessLocations` de Configuración → Contenido.
- Un listado, cola o lista de "pendientes" de títulos paralelo al existente.
- Publicación automática sin que el usuario elija.
- Reutilizar PromptBox o sus tablas (**ABANDONADO**, no reabrir).
- Imágenes, redes sociales o cualquier otro generador.
- Cambiar de modelo o proveedor de IA sin aprobación de Milton (ver riesgos).

## 10. Flujo general (user journey)

1. El usuario entra a `/dashboard/publicar`.
2. Ve **dos opciones**: "Poner títulos a mano" (la caja Títulos actual) y "Crear títulos con la IA del sistema".
3. Elige la IA. El sistema muestra el formulario (vacío) y el contador **"Te quedan X de 3 solicitudes hoy"**.
4. Elige la **categoría** entre las ya sincronizadas y llena, todos obligatorios:
   - **Cliente tipo** (a quién va dirigido).
   - **Tema** sobre el que quiere escribir (el sistema lo conecta con las necesidades de ese cliente tipo).
   - **¿Qué desea el cliente?** (la necesidad o deseo concreto).
   - **¿En dónde están tus clientes?** (ciudades/países).
   - **¿En dónde está tu negocio o producto?** (ciudades/países).
5. Presiona el botón. El sistema valida, descuenta 1 de las 3 solicitudes, arma el prompt (admin + datos), llama a la IA.
6. Aparecen **hasta 9 títulos** en una caja de selección. El usuario marca los que quiere; el sistema le deja marcar **como máximo su cupo disponible** (o menos si hay menos títulos).
7. Los marcados pasan al **flujo normal de publicación** (caja Títulos existente → botón Publicar). Los no marcados se descartan.
8. Si quiere más títulos, repite (hasta 3 veces por día).

Ejemplo de datos válidos: tema "propiedades en Homestead"; cliente tipo "colombianos que viven en Colombia";
desea "invertir en Estados Unidos con poco capital"; clientes en "Colombia, Bogotá"; negocio en "Miami, Homestead".

## 11. FASE 0 OBLIGATORIA — antes de escribir una sola línea de código

**No deberá escribirse una sola línea de código hasta que esta fase haya sido revisada y aprobada por Milton.**

Antes de programar, Claude Code debe entregar para aprobación:

1. **Arquitectura completa** de la función (frontend, API, IA, base de datos, Administración).
2. **Stack tecnológico** (se espera reutilizar el existente; justificar cualquier adición).
3. **Modelo de datos** (tabla de solicitudes, campos, índices, retención) y el **SQL de migración en el mismo commit que el schema**.
4. **Flujos de usuario** (feliz, sin cupo, sin prompt configurado, IA falla, 0 títulos válidos, límite de 3 agotado).
5. **Mapa de navegación** (dónde queda el selector de modo y el formulario dentro de `/dashboard/publicar`).
6. **Estructura de carpetas** (archivos nuevos y archivos existentes que se tocarían).
7. **Roadmap por fases** con criterios de salida.
8. **Riesgos técnicos** y mitigaciones.
9. **Propuestas de mejora** (sin implementarlas).

Además, la Fase 0 debe **resolver estas preguntas abiertas** (proponer y pedir aprobación):

- **Modelo de IA:** hoy `apps/web/src/lib/opportunity-analysis.ts` usa `gpt-4o-mini` vía `OPENAI_URL`. ¿Se usa el mismo mecanismo de clave/modelo? **Cualquier bajada de calidad de modelo requiere investigación real y aprobación de Milton.**
- **Definición de "hoy"** para el tope de 3 (zona horaria; seguir la misma convención que `publishedToday` de la pantalla).
- **¿Cuenta una solicitud fallida?** Propuesta por defecto: solo cuenta si la IA respondió con al menos 1 título válido; un error técnico **no** consume una de las 3.
- **Mecanismo del borrado a los 90 días** de lo que el usuario escribió (tarea programada del worker/GitHub Actions o limpieza al escribir), sin crear infraestructura nueva innecesaria.
- **Cómo llegan los marcados al flujo existente:** propuesta por defecto = se agregan a la caja Títulos actual (una línea por título) para que el usuario los revise y presione Publicar.
- **Idioma de los títulos:** propuesta por defecto = el del selector "Idioma de este lote" que la pantalla ya tiene.
- **Cuántos títulos previos enviar al prompt** para evitar repetidos sin inflar costo/tokens.
- **Sintaxis exacta de variables** y contrato de salida (sección 15).

## 12. Arquitectura funcional (pieza por pieza, reutilizando lo real)

| Pieza | Reutiliza / nace de | Nota |
|---|---|---|
| Pantalla | `apps/web/src/app/dashboard/publicar/page.tsx` (≈590 líneas) | Ya tiene categorías, idioma, estilo, caja Títulos, cupo (`effectiveAvailable` = mínimo entre lote, diario y mensual). |
| Categorías | `GET /api/categories` (solo las sincronizadas; excluir `source: "archived"`) | **No** se usa `POST /api/categories` (categorías "manual"). |
| Cupo | Cálculo actual de `maxTitlesPerBatch`, `dailyArticleLimit`, `monthlyArticleLimit`, `publishedToday` | El tope de marcado = cupo disponible real. |
| Caja de prompt en Administración | Patrón de `apps/web/src/app/api/admin/ai-image-prompt/route.ts` (`requireAdmin`, GET/PUT) + `lib/ai-image-prompt.ts` sobre `SystemSetting` + pestaña "Prompts" de `/dashboard/usuarios` | Nueva clave de configuración. **No requiere migración para el prompt.** No confundir con el modelo `Prompt` (estilos de escritura que elige el usuario). |
| Motor de IA | Llamada a OpenAI como en `opportunity-analysis.ts` | Ver Fase 0. |
| Historial de solicitudes | **Una** tabla nueva (sección 18) | Migración junto al schema, con capitanía. |
| Evitar repetidos | Tabla `Title` (títulos ya creados por el usuario, `text` y `finalTitle`) + títulos ya ofrecidos en la tabla nueva | Ver sección 16. |
| Permisos | Modelo de módulos por usuario (`apps/web/src/lib/modules.ts`, módulo `publicar`) | Sin permiso nuevo. |
| Manual | `apps/web/src/content/manual-usuario.ts` | Se actualiza **en el mismo lote** (orden permanente de Milton). |

## 13. Módulos principales

1. **Selector de modo** en Publicaciones propias (a mano / con IA).
2. **Formulario de solicitud** (6 datos obligatorios) + contador de solicitudes del día.
3. **Endpoint de generación** (validación, límite, armado del prompt, llamada a IA, validación de salida, dedupe, registro).
4. **Caja de selección** de títulos con tope dinámico.
5. **Caja de prompt** en Administración.
6. **Registro** de solicitudes (vista del administrador, mínima).

## 14. Integraciones

- **OpenAI** (ya integrado) para generar los títulos.
- **Categorías sincronizadas** de 10minutesWebsite (solo lectura, ya existe la sincronización).
- **Sin** Google Search Console, GA, Bing, redes sociales ni MCP en esta función.

## 15. Motor de IA — contrato del prompt

**El prompt lo escribe Milton** en la caja de Administración (título de la caja: "PROMPT PUBLICACIONES PROPIAS").
El sistema **no trae un prompt por defecto**: si la caja está vacía, la función queda desactivada para los
usuarios con un mensaje claro ("Esta función aún no está disponible") y el administrador ve un aviso.

**Variables que el sistema inyecta** (nombres a confirmar en Fase 0; deben documentarse junto a la caja de Administración para que Milton las use):

| Variable | Contenido |
|---|---|
| `{{categoria}}` | Nombre de la categoría elegida. |
| `{{cliente_tipo}}` | A quién va dirigido. |
| `{{tema}}` | Tema sobre el que quiere escribir. |
| `{{deseo_cliente}}` | Qué desea o necesita el cliente. |
| `{{ubicacion_clientes}}` | Dónde están sus clientes. |
| `{{ubicacion_negocio}}` | Dónde está su negocio o producto. |
| `{{idioma}}` | Idioma de los títulos. |
| `{{cantidad}}` | 9. |
| `{{titulos_a_evitar}}` | Títulos ya creados u ofrecidos (acotados). |

**Contrato de salida** (lo exige el sistema, se debe recordar al final del prompt de sistema): JSON estricto
`{"titles": ["…", "…"]}` con **hasta 9** títulos, sin texto adicional.

**Norma de contenido (la aplica el prompt de Milton, se registra aquí como requisito no negociable):**
cada título debe dar mucho peso a la **necesidad** que atiende, la **ciudad**, el **país**, **a quién** atiende,
**desde dónde** atiende y **dónde está** el producto o servicio, para favorecer la indexación en Google y Bing.

## 16. Reglas de negocio

1. **Hasta 9 títulos** por solicitud; menos si tras el filtrado quedan menos. **No se rellenan con títulos inventados.**
2. **3 solicitudes por día por usuario**, contadas en el servidor (no solo en la pantalla). El contador debe ser
   **atómico** (dos pestañas a la vez no pueden pasar del tope).
3. **La pantalla muestra siempre** cuántas solicitudes le quedan.
4. **Tope de marcado = cupo disponible** del usuario (mínimo entre lote, diario y mensual, descontando lo ya publicado), o la cantidad de títulos ofrecidos si es menor.
5. **Sin cupo (0):** puede pedir títulos, pero no marcar; se le explica por qué. (Definir en Fase 0 si conviene bloquear la solicitud para no gastar IA.)
6. **No repetir:** ningún título ofrecido puede coincidir —tras normalizar minúsculas, tildes y puntuación— con (a) un título ya creado por el usuario en `Title`, (b) uno ya ofrecido en solicitudes anteriores, (c) otro del mismo lote. Se aplica **en el prompt** (`{{titulos_a_evitar}}`) **y en código** (filtro determinista posterior). Si tras filtrar faltan títulos, un solo reintento; si aún faltan, se muestran los que hay.
7. **Categoría obligatoria y ya sincronizada.** Si el usuario no tiene categorías sincronizadas, la función explica que debe sincronizarlas (no las crea).
8. **Los seis datos son obligatorios** y con longitud máxima razonable (definir en Fase 0).
9. **Los no marcados se descartan** (no hay lista de pendientes).
10. **La caja Títulos manual sigue funcionando igual** que hoy.

## 17. Seguridad y privacidad

- Todo lo que escribe el usuario es **texto no confiable** (riesgo de inyección de prompt): va en un bloque delimitado, con longitud limitada y sin poder alterar las instrucciones del administrador. La salida de la IA se **valida estrictamente** (JSON, tipo, longitud, cantidad).
- **El prompt maestro nunca viaja al navegador del usuario** ni aparece en respuestas de la API, logs de cliente ni errores.
- Endpoints de Administración protegidos con `requireAdmin`. Endpoint de usuario protegido por sesión y permiso del módulo.
- Las claves de OpenAI siguen el manejo actual; **no se escriben en el documento, ni en logs, ni en el repositorio.**
- Lo que el usuario escribe **no se copia a Configuración** ni se usa para otro fin.

## 18. Historial, logs y recuperación

**Una sola tabla nueva** (nombre y campos a proponer en Fase 0), **una fila por solicitud**, con:
usuario, fecha, categoría, lo que el usuario escribió, los títulos ofrecidos, cuáles marcó.

- Sirve para: hacer cumplir el límite de 3, no repetir títulos, y que Milton revise qué se pide y qué devuelve la IA para afinar su prompt.
- **Retención:** lo que el usuario escribió se **borra a los 90 días**; los títulos ofrecidos se **conservan** (son los que impiden repetir).
- **No** se crean otras tablas ni historiales.
- Migración: `schema.prisma` y su SQL **en el mismo commit**; sin `--accept-data-loss`.
- Recuperación: si la IA falla, no se consume solicitud (propuesta, confirmar en Fase 0) y el usuario puede reintentar.

## 19. Dashboard e interfaz

- **Usuario (`/dashboard/publicar`):** selector de modo, formulario, contador "Te quedan X de 3", estados de carga (la llamada a IA tarda segundos), caja de selección con casillas y contador "puedes marcar N", mensajes claros de error y de límite alcanzado.
- **Administración (`/dashboard/usuarios`, pestaña "Prompts"):** caja de texto grande para el prompt maestro, botón guardar, lista de variables disponibles, y aviso si está vacío.
- **Administrador — registro:** vista mínima de las últimas solicitudes (o consulta simple); no se construye un dashboard nuevo.
- Estilo visual: el estilo Apple ya establecido en la plataforma (paleta y componentes existentes). No introducir un estilo nuevo.
- Idioma de la interfaz: español (y respetar marca blanca: los usuarios de tagcrush no deben ver la marca "10minutesWebsite").
- `publicar/page.tsx` es un **archivo caliente**: reservarlo en Coordinación antes de editar y preferir componentes nuevos para no absorber trabajo ajeno.

## 20. Notificaciones y alertas

Ninguna nueva. Solo mensajes dentro de la pantalla (límite alcanzado, sin prompt, error de IA).

## 21. Roadmap sugerido

| Fase | Contenido | Salida |
|---|---|---|
| **0** | Arquitectura y preguntas abiertas (sección 11) | Aprobación de Milton |
| **1** | Backend en rama y worktree propios: caja de prompt, tabla + migración, endpoint, límite atómico, dedupe, validación de salida | Pruebas locales del endpoint |
| **2** | UI en `/dashboard/publicar`: selector, formulario, contador, caja de selección | Flujo completo en local |
| **3** | Validación **en local** con el usuario local de pruebas (`lorenalvarez30@gmail.com`, solo localhost), tres auditorías, manual actualizado | Evidencia de aceptación |
| **4** | Producción **para todos**, con autorización de Milton, migración aplicada **antes o junto con** el merge, verificación posterior | Función activa |

Milton decidió **no** hacer fase intermedia solo para una cuenta en producción: se valida en local y luego se publica para todos.

## 22. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Calidad de los títulos depende del prompt | El prompt es de Milton; el registro (sección 18) da evidencia real para afinarlo. |
| Costo de IA sube | Tope de 3 por día; una sola llamada por solicitud (+1 reintento máximo). |
| Repetidos | Doble barrera: prompt + filtro determinista normalizado. |
| Inyección de prompt por los campos del usuario | Bloque delimitado, límites, validación estricta de salida. |
| IA devuelve formato inválido o menos de 9 | Validación, un reintento, mostrar lo válido sin inventar. |
| Carrera en el contador (dos pestañas) | Incremento atómico en base de datos. |
| Migración y código desincronizados | Regla suprema: schema + migración juntos; **aplicar la migración antes o junto con el merge** (un incidente real tumbó `/dashboard` por fusionar código sin migración). Requiere capitanía. |
| Conflicto en `publicar/page.tsx` | Reserva en Coordinación; componentes nuevos; rama y worktree propios. |
| "Hoy" ambiguo (zona horaria) | Decisión explícita en Fase 0. |
| Cambiar de modelo de IA por ahorrar | Prohibido sin investigación real y aprobación de Milton. |
| Latencia de la IA en funciones serverless | Estado de carga; revisar límites de duración en Fase 0. |

## 23. Criterios de aceptación

- [ ] En `/dashboard/publicar` el usuario elige entre **a mano** y **con la IA**; el modo a mano funciona exactamente como antes.
- [ ] El formulario empieza **vacío**, exige los 6 datos y solo ofrece categorías **ya sincronizadas**.
- [ ] Sin prompt configurado en Administración, la función está desactivada con mensaje claro.
- [ ] Con prompt, una solicitud devuelve **hasta 9** títulos en una caja de selección, sin repetidos entre sí, ni con títulos ya creados, ni con los ya ofrecidos antes.
- [ ] El usuario **no puede marcar más** que su cupo disponible; si su cupo es menor que los títulos ofrecidos, el límite se ve y se aplica.
- [ ] Los marcados llegan al flujo normal de publicación; los no marcados se descartan y **no vuelven a ofrecerse**.
- [ ] La pantalla muestra **"Te quedan X de 3"** y, al llegar a 3, el botón se desactiva con explicación; el tope se hace cumplir **en el servidor** aun con dos pestañas abiertas.
- [ ] Lo que el usuario escribe **no modifica** Configuración → Contenido.
- [ ] El prompt maestro **no aparece** en ninguna respuesta que vea un usuario normal.
- [ ] Solo el administrador puede leer/editar el prompt.
- [ ] Existe **una sola** tabla nueva, con migración en el mismo commit que el schema; el borrado a 90 días funciona.
- [ ] Manual de usuario actualizado en el mismo lote.
- [ ] Tres auditorías (integridad, funcional, regresión/entrega) aprobadas; typecheck y build limpios; commit exclusivo de este proyecto.
- [ ] Probado en local con el usuario de pruebas local antes de cualquier despliegue; producción solo con autorización expresa de Milton y verificación posterior.

## 24. Reglas de coordinación del repositorio (obligatorias)

Leer `COORDINACION_CLAUDE_CODEX.md` e `INVENTARIO_CONVERSACIONES.md` **antes de actuar**. Rama y **worktree propios**
(nunca trabajar en `main` ni en el árbol de otra tarea); reservar archivos calientes; nunca `git add .` / `git add -A`;
revisar el diff antes de cada commit; no aplicar migraciones sin **capitanía** (`scripts/migration-coordinator.sh`)
y liberarla al terminar; no desplegar sin autorización de Milton; no tocar cambios ajenos sin commitear.
Registrar avances, commits y cierre en los documentos de coordinación e inventario con el nombre exacto
`CREACION DE PUBLICACIONES PROPIAS`.

## 25. Instrucciones finales antes de escribir código

1. Lee este documento completo y los dos documentos de coordinación.
2. Inspecciona el código real de `publicar/page.tsx`, `/api/categories`, `/api/me`, `admin/ai-image-prompt`, `lib/ai-image-prompt.ts`, `opportunity-analysis.ts`, `modules.ts` y el modelo `Title`, y confirma o corrige cada suposición de la sección 12.
3. Entrega la **Fase 0** (sección 11) y **espera la aprobación de Milton**.
4. **No deberá escribirse una sola línea de código hasta que esta fase haya sido revisada y aprobada.**
5. Después, ejecuta el roadmap por fases, probando primero en local.
