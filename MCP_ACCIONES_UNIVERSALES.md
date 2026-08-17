# Catálogo universal de acciones MCP — Auto Artículos

## Propósito

Este documento define las acciones que un cliente MCP puede realizar sobre
Auto Artículos. El cliente puede ser ChatGPT, Alexa+, Gemini, un agente de voz,
un asistente telefónico u otro canal futuro. El servidor MCP es único: cambia
la conversación y la interfaz, no las reglas de negocio ni los permisos.

**Principio central:** cada persona autoriza su propia cuenta de Auto Artículos
y solo puede consultar u operar sus propios datos. Ningún cliente recibe
secretos, contraseñas, tokens de integraciones, migraciones, acceso a otros
usuarios ni ejecución arbitraria del sistema.

## Convenciones de seguridad

| Nivel | Alcance MCP | Comportamiento |
|---|---|---|
| Consulta | `oportunidades:leer` | Lee datos; nunca cambia nada. |
| Operación | `oportunidades:operar` | Crea propuestas o inicia procesos reversibles; informa el resultado. |
| Publicación | `oportunidades:publicar` | Genera/publica contenido o consume créditos; exige vista previa y confirmación. |
| Configuración | `cuenta:configurar` | Cambia preferencias no secretas; confirma antes de guardar. |
| Integraciones | `integraciones:gestionar` | Solo consulta estado, abre consentimientos visuales o desconecta tras confirmar. |

Una acción con costo, publicación, indexación, cancelación, reintento, borrado
o desconexión debe seguir este patrón:

1. El agente explica qué hará y muestra la lista/impacto.
2. El usuario confirma con lenguaje inequívoco.
3. El cliente llama la herramienta con `confirmar=true`.
4. La herramienta devuelve el resultado real y las validaciones aplicadas.

Nunca interpretar “sí” como confirmación si antes no se mostró una operación
concreta. En voz/teléfono, el agente debe leer el resumen y pedir una
confirmación explícita.

## Estado de implementación

- **Disponible hoy en ChatGPT:** `listar_oportunidades`,
  `estado_de_publicaciones` (solo lectura).
- **Implementado localmente, pendiente de validar/desplegar:** publicación de
  oportunidades seleccionadas y publicación de títulos manuales dentro de una
  categoría, ambas con previsualización y confirmación.
- **Planificado:** las acciones de este catálogo. Cada una debe reutilizar las
  reglas y handlers existentes de la aplicación; no duplicar lógica de cupos,
  créditos, idioma, integraciones o permisos.

## 1. Panorama y diagnóstico

| Acción MCP propuesta | Ejemplos de petición |
|---|---|
| `ver_resumen_cuenta` | “¿Cómo voy este mes?”, “¿cuántos artículos publiqué hoy?” |
| `ver_estado_configuracion` | “¿Qué me falta para poder publicar?” |
| `listar_categorias` | “¿Qué categorías tengo?” |
| `listar_idiomas` | “¿En qué idioma se escribirá?” |
| `ver_integraciones` | “¿Tengo conectado Google, Bing, Threads y LinkedIn?” |
| `ver_historial_publicaciones` | “Muéstrame las últimas publicaciones y fallos.” |
| `estado_de_publicaciones` | “¿Hay algo publicándose ahora?” |
| `ver_limites_y_creditos` | “¿Cuántos artículos puedo publicar hoy?” |

Todas son de consulta.

## 2. Oportunidades SEO y planificación de contenido

| Acción MCP propuesta | Ejemplos de petición | Nivel |
|---|---|---|
| `generar_oportunidades` | “Busca oportunidades nuevas.” | Operación |
| `listar_oportunidades` | “Muéstrame las de seguros de auto.” | Consulta |
| `ver_oportunidad` | “Dime todos los títulos de Miami.” | Consulta |
| `descartar_oportunidad` | “Quita este título.” | Operación + confirmar |
| `descartar_categoria_oportunidades` | “Descarta estas oportunidades.” | Operación + confirmar |
| `publicar_oportunidades_seleccionadas` | “Publica estos tres títulos.” | Publicación + confirmar |
| `publicar_categoria` | “Publica toda la categoría de Miami.” | Publicación + confirmar |
| `publicar_todas_las_oportunidades` | “Publica todas las oportunidades pendientes.” | Publicación + confirmación reforzada |

El listado debe incluir categoría, impresiones, clics, texto de cada título e
identificador interno. El agente puede hablar en lenguaje natural, pero debe
resolver la selección a IDs exactos antes de publicar.

## 3. Publicación manual de artículos

| Acción MCP propuesta | Ejemplos de petición | Nivel |
|---|---|---|
| `publicar_titulos_en_categoria` | “Crea estos cinco títulos en Inmigración y publícalos.” | Publicación + confirmar |
| `previsualizar_publicacion_manual` | “¿Qué vas a publicar?” | Consulta |
| `cancelar_publicacion` | “Detén la publicación actual.” | Operación + confirmar |
| `reintentar_publicacion` | “Reintenta el artículo que falló.” | Operación + confirmar |
| `ver_detalle_publicacion` | “¿Por qué falló este artículo?” | Consulta |
| `limpiar_historial_publicaciones` | “Borra mi historial terminado.” | Operación + confirmación reforzada |

Antes de iniciar una publicación, el servidor debe validar categoría, idioma,
credenciales de publicación, créditos de imagen, cupos diario/mensual, máximo
por lote y ausencia de otra ejecución activa. Estas validaciones no se omiten
por venir de voz o de un LLM.

## 4. Indexación y sitemaps

| Acción MCP propuesta | Ejemplos de petición | Nivel |
|---|---|---|
| `ver_estado_indexacion` | “¿Está conectado Google y Bing?” | Consulta |
| `enviar_sitemap_google` | “Envía mi sitemap a Google.” | Operación + confirmar |
| `enviar_sitemap_bing` | “Envía mi sitemap a Bing.” | Operación + confirmar |
| `indexar_articulo_en_bing` | “Indexa este artículo en Bing.” | Operación + confirmar |
| `activar_o_desactivar_indexacion_lote` | “Publica este lote sin indexar.” | Publicación + confirmar |

## 5. Redes sociales

| Acción MCP propuesta | Ejemplos de petición | Nivel |
|---|---|---|
| `ver_redes_conectadas` | “¿Qué redes tengo conectadas?” | Consulta |
| `generar_propuestas_sociales` | “Crea propuestas para LinkedIn y Threads.” | Operación |
| `listar_propuestas_sociales` | “Muéstrame las propuestas pendientes.” | Consulta |
| `editar_propuesta_social` | “Haz esta propuesta más corta.” | Operación + confirmar |
| `descartar_propuesta_social` | “Descarta esa publicación.” | Operación + confirmar |
| `previsualizar_publicacion_social` | “¿Cómo se verá en LinkedIn?” | Consulta |
| `publicar_propuesta_social` | “Publica esta propuesta en LinkedIn.” | Publicación + confirmar |
| `limpiar_propuestas_sociales_terminadas` | “Limpia las propuestas ya enviadas.” | Operación + confirmar |

El agente no inventa la conexión OAuth de una red. Si falta una integración,
debe explicar qué falta y abrir el consentimiento visual en la web.

## 6. Preferencias de la cuenta

| Acción MCP propuesta | Ejemplos de petición | Nivel |
|---|---|---|
| `ver_preferencias_contenido` | “¿Qué firma e idioma tengo?” | Consulta |
| `cambiar_idioma_contenido` | “Escribe los próximos artículos en inglés.” | Configuración + confirmar |
| `actualizar_firma_articulo` | “Usa esta firma al final de mis artículos.” | Configuración + confirmar |
| `actualizar_telefono_contacto` | “Cambia mi teléfono de contacto.” | Configuración + confirmar |
| `actualizar_prompt_imagen` | “Usa este estilo para las imágenes.” | Configuración + confirmar |
| `sincronizar_categorias` | “Actualiza mis categorías desde la plataforma.” | Operación + confirmar |
| `sincronizar_idiomas` | “Actualiza los idiomas disponibles.” | Operación + confirmar |

Las credenciales de 10minutesWebsite y cualquier secreto se configuran solo en
la interfaz segura de Auto Artículos; MCP puede informar que faltan, nunca
leerlos, dictarlos ni guardarlos mediante una conversación.

## 7. Integraciones externas

| Acción MCP propuesta | Ejemplos de petición | Nivel |
|---|---|---|
| `ver_integracion_google` / `ver_integracion_bing` | “¿Google está conectado?” | Consulta |
| `iniciar_conexion_google` / `iniciar_conexion_bing` | “Conecta Google Search Console.” | Abre consentimiento web |
| `desconectar_google` / `desconectar_bing` | “Desconecta Bing.” | Integraciones + confirmación reforzada |
| `ver_integracion_red_social` | “¿Threads sigue conectado?” | Consulta |
| `iniciar_conexion_red_social` | “Conecta LinkedIn.” | Abre consentimiento web |
| `desconectar_red_social` | “Desconecta X.” | Integraciones + confirmación reforzada |
| `ver_google_business_profile` | “¿Mi perfil de Google Business está activo?” | Consulta |

OAuth de terceros siempre se completa en navegador. Un agente puede abrir el
enlace correcto y explicar el paso, pero no puede recibir ni solicitar
contraseñas, códigos MFA o secretos.

## 8. Experiencia conversacional y de voz

Los mismos nombres de herramientas deben permitir conversaciones naturales:

- “Activa oportunidades” equivale a generar oportunidades y luego mostrar el
  resultado, no a publicar.
- “Publica esas” requiere que exista una lista reciente, inequívoca y leída al
  usuario; si hay duda, el agente pregunta categoría/títulos.
- “Para” o “cancela” se interpreta como cancelar una ejecución concreta, nunca
  como borrar datos históricos sin confirmación.
- Para teléfono, el agente debe resumir cantidades, categoría, idioma,
  indexación y costo potencial antes de pedir “¿confirmas?”.
- Todo resultado debe usar lenguaje claro: qué se hizo, qué no se hizo, qué
  falló y qué paso sigue.

## 9. Acciones prohibidas para cualquier MCP

No implementar herramientas para:

- ver, modificar o revelar secretos, contraseñas, tokens o variables de entorno;
- ejecutar migraciones, SQL arbitrario, comandos de servidor o despliegues;
- suplantar usuarios o administrar otras cuentas;
- cambiar roles, límites, planes, facturación o permisos globales;
- saltar OAuth, MFA, confirmaciones, cupos, créditos o controles de contenido;
- publicar acciones masivas sin un resumen y una confirmación explícita.

## Orden de desarrollo

1. Oportunidades y publicación manual (lote prioritario actual).
2. Panorama, categorías, límites, historial y diagnóstico.
3. Gestión de ejecuciones, indexación y sitemaps.
4. Redes sociales: propuestas, edición, previsualización y publicación.
5. Preferencias e integraciones con consentimientos web.
6. Adaptadores de experiencia para ChatGPT, Alexa+, Gemini y voz/teléfono,
   manteniendo el mismo servidor y las mismas reglas.
