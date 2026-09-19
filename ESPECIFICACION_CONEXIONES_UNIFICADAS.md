# ESPECIFICACIÓN — CONEXIONES UNIFICADAS (UX)

**Proyecto:** Auto Artículos (SEO TOTAL) · **Origen:** CONEXION COMPOSIO, Fase 2b · **Fecha:** 2026-09-19
**Formato:** PRD corto (MAGO) · **Estado:** DECISIONES CERRADAS — construcción por etapas, sin código aprobado aún para producción
**Relacionado:** `MASTER_BLUEPRINT_CONEXION_COMPOSIO.md`, `FASE_0_ARQUITECTURA_CONEXION_COMPOSIO.md`

## 1. Problema

Una misma red puede aparecer en varios sitios y el cliente no sabe dónde conectarla:

| Hoy | Dónde |
|---|---|
| Search Console, Analytics, Bing | Configuración → *Indexación y SEO* |
| Facebook, Instagram, Threads, LinkedIn, Pinterest, Bluesky, Tumblr, Blogger, Dev.to, Business Profile | Configuración → *Redes Sociales* |
| Las mismas 4 apps, por Composio | Pestaña aparte *Conexión Composio* (solo cuentas habilitadas) |

Para el cliente **da igual cómo se conecta por dentro** (API propia o Composio). Debe ver **una tarjeta por red, en un solo sitio, ordenada**.

## 2. Objetivo y principios

1. **Un solo sitio, una tarjeta por red.** Nunca la misma red dos veces.
2. **El método es invisible.** El cliente no ve «propia» ni «Composio». Lo decide el administrador.
3. **Cada persona ve solo lo que tiene activado** en Administración → Usuarios. Si no tiene Facebook, no ve nada de Facebook.
4. **Nada de lo que funciona hoy se rompe.** Se reutilizan las tarjetas existentes por dentro; los enlaces viejos siguen funcionando.
5. **Alertas mínimas:** solo por Google Search Console (la única esencial). Todo lo demás es opcional y nunca alerta.

## 3. Decisiones de Milton (entrevista MAGO)

| # | Decisión |
|---|---|
| P1 | **Una pantalla nueva «Conexiones»** con todas las redes (opción A). |
| P1b | El método (API propia o Composio) depende del módulo de administración; para el cliente es transparente. Se controla **por persona** (módulo «Conexión por Composio», Habilitado) y **por red** (interruptor de vía por app). |
| P2 | Al hacer el switch, la conexión anterior **se desconecta** y el HOME muestra una **ALERTA** con enlace para reconectar. |
| P3 | La conexión anterior queda **desactivada pero guardada 14 días** (se puede revertir el switch sin pedir nada al cliente) y luego se revoca sola. |
| P4 | **Una sola alerta** en el HOME, con un botón que lleva a Conexiones. **Solo para Google Search Console.** Se quita sola al reconectar; no se puede cerrar. |
| P5 | Dos botones arriba: **ANALÍTICAS** y **DIFUSIÓN**. Se abre **ANALÍTICAS** por defecto. |
| P6 | Business Profile va en **DIFUSIÓN**, y aparece solo cuando el administrador lo activa (hoy espera la aprobación de Google). |
| P7 | *(Decide Claude, delegado por Milton)* Las pestañas *Indexación y SEO* y *Redes Sociales* **desaparecen**; sus direcciones antiguas **redirigen** a Conexiones (ANALÍTICAS o DIFUSIÓN). |
| P8 | *(Decide Claude)* **Despliegue por etapas:** Conexiones la ven primero solo el administrador y las cuentas piloto; los demás siguen con las pestañas actuales hasta validar. |

## 4. Diseño de la pantalla

**Configuración → Conexiones** (reemplaza a las dos pestañas). Botones: **ANALÍTICAS** | **DIFUSIÓN**.

**ANALÍTICAS** (leen datos): Google Search Console *(esencial, con etiqueta)* · Google Analytics · Bing Webmaster Tools.

**DIFUSIÓN** (publican contenido): Google Business Profile · Facebook · Instagram · Threads · LinkedIn · Pinterest · Bluesky · Tumblr · Blogger · Dev.to. (X sigue oculta como hoy.)

**Reglas de visibilidad:** una tarjeta aparece solo si la persona tiene esa red activada (permisos por red de Administración → Usuarios) y, en Business Profile, solo cuando el administrador la activa. Un botón sin ninguna tarjeta visible no se muestra.

**La tarjeta** (una por red, mismo formato para todas): título, estado (No conectada · Conectada · Autorización sin terminar · Requiere reconectar), qué elige la persona («Usando: …» con **códigos visibles**: sitio, propiedad y cuenta, Página o cuenta de Instagram), y acciones (Conectar / Cambiar / Probar conexión / Desconectar). Cuando hay varias opciones (varios dominios, propiedades o Páginas), se muestra **una lista con el código exacto de cada una, su rol y su actividad reciente** y la persona **elige y aprueba**.

## 5. Alerta del HOME

- **Solo Search Console.** Aparece si la persona tuvo Search Console conectada y el switch la pasó a Composio sin que haya reconectado.
- Texto: *«Debes reconectar Google Search Console»* + botón **Reconectar** → Conexiones (ANALÍTICAS, tarjeta resaltada).
- Desaparece sola al reconectar; no se puede cerrar antes.
- Analytics, Bing, Business Profile y todas las redes **nunca** alertan: su tarjeta muestra «Requiere reconectar».

## 6. Cómo funciona el cambio de método (sin romper nada)

- La conexión propia **no se borra ni se modifica**: las tablas actuales quedan intactas. Un resolvedor decide qué conexión usa el sistema para cada persona y red: si el método es Composio y hay conexión Composio activa, esa; si el método es Composio y aún no reconectó, **ninguna** (la red queda desconectada, como pide P2); si el método es propio, la de siempre.
- «Desactivada pero guardada 14 días»: la fila propia sigue ahí, ignorada; a los 14 días desde el switch se revoca sola. Revertir el switch dentro del plazo devuelve la conexión propia al instante.
- **Importante:** la desconexión al hacer el switch solo se activa cuando existen los consumidores por Composio de esa red (Fase 2b-2 en adelante). Antes, el módulo Composio solo conecta y prueba, sin afectar nada.

## 7. Roadmap (cada entrega: punto de retorno, tres auditorías, verificación)

| Etapa | Entrega | Riesgo |
|---|---|---|
| **2b-1** *(listo para auditar)* | Conectar por Composio, verificar el callback, elegir y aprobar (sitio/propiedad/Página/cuenta con códigos), probar. Módulo opt-in. Pestaña temporal solo para habilitados. | Bajo |
| **UX-1** | Pantalla **Conexiones** (ANALÍTICAS / DIFUSIÓN) reutilizando las tarjetas actuales por dentro, con Composio integrado en su misma tarjeta. Opt-in al principio; redirecciones de las pestañas viejas listas. | Medio |
| **2b-2** | Search Console por Composio (sitemap diario, inspección, métricas) + resolvedor + desconexión al switch + **alerta del HOME**. | Medio |
| **2b-3** | Analytics por Composio. | Bajo |
| **2b-4** | Facebook e Instagram (publicar; Stories de Instagram en prueba, las de Facebook siguen por la API propia). | Alto |
| **2c** | Revocación a los 14 días. | Medio |
| **UX-2** | Abrir Conexiones a todos y retirar las pestañas viejas (quedan como redirecciones). | Medio |

## 8. Criterios de aceptación

1. Ninguna red aparece dos veces para la misma persona.
2. Una persona sin Facebook activado no ve nada de Facebook (ni tarjeta ni aviso).
3. Las direcciones antiguas (`/dashboard/configuracion/indexacion`, `/dashboard/configuracion/redes-sociales`) nunca dan error: llevan a Conexiones. El asistente de inicio y el manual siguen funcionando.
4. Con las cuentas no habilitadas, el comportamiento actual es **idéntico** al de hoy (prueba de regresión).
5. La alerta del HOME aparece solo por Search Console, desaparece al reconectar y no aparece para nadie sin el switch.
6. Revertir el switch dentro de 14 días restaura la conexión propia sin pedir nada al cliente.
7. El cliente no ve nunca las palabras «propia» ni «API» para elegir método; sí ve «Composio» únicamente en la pantalla de permisos de Google/Meta, y así se le explica.

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Cambiar de golpe lo que ven 92 clientes | Despliegue por etapas (P8); solo opt-in al principio. |
| Enlaces viejos rotos | Redirecciones; prueba explícita de cada enlace conocido. |
| Cliente sin la alerta pierde Search Console tras el switch | Alerta no cerrable; switch solo tras validar el piloto; 14 días de reversa. |
| Duplicar tarjetas al integrar Composio | Una sola tarjeta por red con un solo estado visible; el método no se muestra. |
| Tocar componentes complejos existentes | Se reutilizan sin modificar su interior; se envuelven, no se reescriben. |

## 10. Regla de proceso

Antes de construir cada etapa: revisar `COORDINACION_CLAUDE_CODEX.md`, rama y worktree propios, reserva de archivos, punto de retorno en el Controlador de Versiones, tres auditorías y verificación posterior. Sin migraciones salvo que una etapa lo requiera (entonces, capitanía de migración).
