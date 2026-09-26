# INFORME · AUDITORÍA TRIPLE DE CONEXIONES A REDES SOCIALES Y PUBLICADORES
**Fecha:** 2026-09-26 · **Autor:** Claude · **Estado:** solo lectura, no se cambió código de la app · **Referencia (el estándar):** Google Search Console y Google Analytics

## 1. Método (tres pasadas independientes)
| Pasada | Qué se hizo | Fuente |
|---|---|---|
| **A · Código** | Inventario de cada sección de conexión contra la plantilla de GSC/GA (pasos, botón, éxito, prueba, desconexión, errores) | 14 componentes de `apps/web/src/components` |
| **B · Errores y lenguaje** | Qué mensajes técnicos, crudos o en inglés puede ver el usuario; adónde vuelve cada OAuth | 9 grupos de rutas `api/search-integrations`, callbacks, worker `socialPublish.ts` (51 errores), Historial |
| **C · Pantallas reales** | Cada pantalla abierta en localhost (Lorena con todos los permisos, base local) y comparada con GSC/GA | 12 pantallas de Conexiones |

Las tres coinciden en las conclusiones de abajo. La C confirmó lo visto en A y B, y añadió dos hallazgos (GBP sin tarjeta, títulos "API").

## 2. El estándar (GSC/GA, ya validado en producción)
Tarjeta con título y frase *«Conexión administrada desde esta tarjeta…»* → **Cómo hacerlo paso a paso** (5 pasos) → botón **Nueva conexión** → retorno a Conexiones con mensaje claro → elegir en **dropdown** ordenado, una sola opción → **Aprobar y guardar** → pantalla estática de **Conexión exitosa** (nombre + código) → **Probar conexión** (mensaje corto) → **Cambiar / Desconectar** → **Volver al menú de Conexiones** → errores siempre en español claro. Facebook e Instagram ya lo cumplen.

## 3. Resultado por red (✓ cumple · ≈ parcial · ✗ no cumple)
| Red | 1 Instrucciones | 2 Sin errores de conexión | 3 Look & feel / proceso | 4 Como GSC/GA |
|---|---|---|---|---|
| Facebook | ✓ | ✓ | ✓ | ✓ |
| Instagram | ✓ | ≈ (sin enlace en Historial) | ✓ | ✓ |
| Bing Webmaster | ≈ genérico | ✓ (vuelve a Conexiones) | ≈ | ≈ |
| Threads | ≈ genérico | ✗ retorno OAuth se pierde | ✗ | ✗ |
| LinkedIn | ≈ genérico | ✗ retorno + JSON crudo | ✗ | ✗ |
| Pinterest | ≈ genérico | ✗ retorno + error crudo | ≈ («Paso 1 de 2 / 2 de 2» es buen patrón) | ✗ |
| Tumblr | ≈ genérico | ✗ retorno OAuth se pierde | ✗ | ✗ |
| Blogger | ✗ sin pasos propios | ✗ retorno OAuth se pierde | ✗ (botón y select sin estilo) | ✗ |
| Bluesky | ≈ propios, buenos («Si falla») | ≈ mensaje genérico | ✗ | ✗ |
| DEV.to | ≈ propios, con términos en inglés | ≈ mensaje genérico | ✗ | ✗ |
| Google Business Profile | ≈ | ≈ | ✗ **no tiene tarjeta** en el índice | ✗ |
| X / Twitter | apagado | — | — | — |

## 4. Hallazgos
### P1 · Fallan o exponen algo (arreglar primero)
1. **El retorno de OAuth se pierde.** Threads, LinkedIn, Pinterest, Tumblr y Blogger (y los antiguos de Instagram/X) devuelven al usuario a `/dashboard/configuracion?red=connected|error`, que hoy es solo un índice. **Ningún componente lee ese parámetro:** el usuario autoriza y no ve ni éxito ni error. Solo Bing y las conexiones nuevas vuelven a `/dashboard/configuracion/conexiones`.
2. **Errores de publicación en crudo en Historial.** `errorLog` se guarda con `error.message` tal cual y el Historial lo muestra (`<strong>Error:</strong> {opp.errorLog}`) sin traducir. Con Composio los mensajes de Meta llegan en inglés. Además 3 errores del worker incrustan el texto de la red (`Threads`, `Tumblr`, `Blogger`: «autorización expiró… ${error.message}/${response.text()}»).
3. **Fugas de texto técnico o de nombres.**
   - LinkedIn: «Sincronización con errores: `JSON.stringify(...)`» y el botón «Sincronizar base de datos».
   - Pinterest: `boardsError = error.message` llega al cliente.
   - Instagram (callback antiguo): `msg=<error.message>` en la URL. Bing: `detalle` crudo de 200 caracteres.
   - **«Módulo reservado a administradores y Lorena.»** nombra a una persona real (`facebook-pages/route.ts`).
   - **GBP: «Conectado a Google Business Profile mediante PostPeer»** muestra el nombre del proveedor (misma regla que Composio: el cliente no debe verlo).
4. **Ninguna red fuera de Google/Meta tiene «Probar conexión»**, así que un token vencido solo se descubre al fallar una publicación.

### P2 · Inconsistencias de experiencia
5. **Tres estilos de instrucciones:** «Cómo hacerlo paso a paso» (GSC/GA/FB/IG, 5 pasos), «Proceso estándar de conexión» (4 pasos genéricos: Threads, LinkedIn, Pinterest, Tumblr, Blogger, Bing) y «Cómo conectar X, paso a paso» (Bluesky, DEV.to, con «Si falla»). Blogger no tiene pasos propios.
6. **Nueve nombres para el mismo botón:** «Nueva conexión», «Conectar Threads», «Conectar cuenta de usuario», «Conectar Pinterest →», «Conectar Tumblr →», «Conectar Blogger» (un enlace con otro estilo), «Conectar Bluesky», «Conectar DEV.to», «Buscar fichas disponibles».
7. **Siete formas de decir «conectado»:** «✓ Conexión activa», «✓ Tumblr conectado», «● Conectada», «Conectado: blog», «✓ Conectado — @x», «○ No conectado — x», «● Pendiente». Y cinco de «vencido»: «Token expirado», «⚠ … venció», «La autorización expiró», «(autorización expirada)».
8. **Desconectar tiene tres nombres** («Desconectar», «Desconectar Threads/Blogger», «Revocar conexión») y siete redes usan el `confirm()` nativo del navegador con textos distintos.
9. **Ninguna de las 9 redes tiene pantalla de «Conexión exitosa»**; el resultado es una línea suelta.
10. **Elegir destino cambia de forma:** «Guardar tablero», «Guardar blog», «Guardar ficha», select sin estilo en Blogger; el estándar es dropdown + «Aprobar y guardar».
11. **GBP no aparece como tarjeta** en el índice (12 tarjetas; falta GBP) y solo se ve en la vista general de Difusión.

### P3 · Lenguaje
12. Términos técnicos al cliente: «OAuth», «LinkedIn API», «Blogger API», «Token», «Client ID/Secret» (bloques de administrador dentro de la misma pantalla). Instrucciones de DEV.to con menús en inglés («Settings → Extensions → API Keys», «Forgot password?»).
13. Mensajes de fallo genéricos: «Error de conexión al guardar X» sin decir qué hacer.
14. Bloques de administrador («Credenciales globales de la App») mezclados con la pantalla del cliente.

## 5. Qué se debe reformular (propuesta)
**Una plantilla única, dos familias**, con componentes compartidos (`ConnectionCard`, `ConnectionSteps` de 5 pasos, `ConnectionSuccess` que ya existe, `friendlyConnectionError` que ya existe, `ConnectionActions`):
- **Familia OAuth** (Threads, LinkedIn, Pinterest, Tumblr, Blogger, Bing, GBP): Nueva conexión → retorno a Conexiones → elegir en dropdown → Aprobar y guardar → éxito → Probar conexión → Desconectar.
- **Familia credencial** (Bluesky, DEV.to): 5 pasos con «Si falla» (lo mejor que hay hoy) → campos → Conectar → éxito → Probar conexión → Desconectar.
- Los bloques de administrador salen a una pestaña o pantalla solo para admins.

**Orden sugerido (cada fase = 1 PR, con pruebas y manual):**
1. **Fase 1 · P1 (urgente):** retorno de OAuth a Conexiones con mensaje; traductor en Historial y en el worker; quitar JSON y textos crudos; quitar «Lorena» y «PostPeer» del cliente.
2. **Fase 2 · Componentes compartidos + Bluesky y DEV.to** (los más simples).
3. **Fase 3 · Familia OAuth** (Threads, LinkedIn, Pinterest, Tumblr, Blogger, Bing) y tarjeta de GBP.
4. **Fase 4 · «Probar conexión» para todas, manual y pruebas de regresión.**

## 6. Riesgos y notas
- Hoy el punto 1 significa que **un cliente que conecta Tumblr, Pinterest, Threads, LinkedIn o Blogger no recibe confirmación**; conviene hacer la Fase 1 antes de invitar a más usuarios a conectar redes.
- No se tocó ninguna conexión ni permiso real: las pruebas de la pasada C fueron en la base local y los permisos de Lorena se restauraron.
- Instagram sigue sin enlace en Historial (necesita una operación nueva de Composio no incluida en la lista permitida).
- No se auditó la publicación real de cada red (solo su configuración y sus mensajes); Facebook e Instagram sí están validados en producción.
