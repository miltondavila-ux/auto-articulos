# TODO — Ideas pendientes del usuario (Auto Artículos)

Este documento es un buzón de ideas de Milton, no un plan de trabajo ni una
cola de tareas automática.

## Regla obligatoria para cualquier agente (Claude, Codex, Antigravity)

**Este archivo SOLO GUARDA. Ningún agente ejecuta, propone iniciar ni empieza
a investigar un ítem de esta lista por su cuenta**, sin importar cuánto
tiempo lleve aquí, lo simple que parezca o lo relacionado que esté con la
tarea actual. Un ítem escrito aquí no es una instrucción — es una nota que
Milton se deja a sí mismo para pedirla más adelante, cuando él decida.

Está permitido y es útil leer este archivo para tener contexto de hacia
dónde va el proyecto. Lo que no está permitido es actuar sobre él sin que
Milton lo pida explícitamente en la conversación activa, exactamente igual
que con cualquier otra instrucción no autorizada.

## Cómo agregar un ítem

Cuando Milton pida guardar una idea aquí: agregarla tal cual la describió,
con la fecha, en "Pendientes". No expandirla, no diseñarla, no dividirla en
pasos — eso se hace recién cuando él pida ejecutarla.

## Cómo cerrar un ítem

Cuando Milton pida ejecutar algo de esta lista: al terminar, moverlo a
"Hecho" con la fecha y el commit/PR correspondiente, y documentar el cambio
real en `HANDOFF.md` como de costumbre (este archivo no reemplaza al
HANDOFF, solo alimenta ideas hacia él).

## Pendientes

- **(7/8/2026)** Que Oportunidades use la data de Bing Webmaster Tools
  además de la de Google Search Console, cuando el usuario tenga las dos
  conectadas (hoy `POST /api/opportunities` solo usa Google, y de hecho
  bloquea el análisis si Google no está conectado, aunque haya Bing). Plan
  ya conversado con Claude ese día: Google deja de ser obligatorio (basta
  con tener uno de los dos); si hay Bing conectado, se traen sus consultas
  con más impresiones/clics (`GetQueryStats` de la API de Bing Webmaster
  Tools) y se le pasan a la IA como evidencia aparte, claramente etiquetada
  como "Bing" (Bing solo da consulta, no consulta+página como Google); si
  hay ambos, se combinan. Sin probar contra una cuenta real de Bing todavía.
  Reconfirmado por el usuario el 8/8/2026 (mismo pedido, sin cambios de
  diseño); ver detalle técnico completo en `HANDOFF.md`, sección
  "PENDIENTE: combinar Bing + Google en Oportunidades".
- **(8/8/2026)** Motor de Distribución Inteligente SEO para Redes Sociales:
  Crear un programador automático que publique un máximo de 2 posts por semana
  por red social activa (X, LinkedIn, Threads, Instagram, Facebook Pages y
  múltiples Facebook Groups). Los temas y artículos a publicar se seleccionarán
  automáticamente en base a cuáles están puntuando/creciendo mejor en impresiones
  y clics dentro de Google Search Console, para darles un empuje de tráfico social
  estratégico. Evita el spam y el shadowban.

## Hecho

_(vacío por ahora)_
