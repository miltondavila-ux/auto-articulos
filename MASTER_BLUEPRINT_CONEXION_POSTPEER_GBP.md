# MASTER BLUEPRINT — CONEXIÓN POSTPEER + GOOGLE BUSINESS PROFILE

**Proyecto:** Creador de artículos / SEO TOTAL
**Nombre de la conversación:** `CONEXION CON POSTPEER`
**Fecha:** 2026-09-20
**Estado:** diseño técnico listo para implementación; no se activan publicaciones reales sin aprobación explícita.

## 1. Objetivo

Permitir que cada usuario conecte su cuenta de Google Business Profile mediante PostPeer y que el lane existente de publicaciones de Google envíe la publicación a PostPeer. La conexión será por usuario, reversible y compatible con la conexión OAuth propia ya existente.

PostPeer será proveedor de conexión y publicación; Auto Artículos no almacenará tokens de Google. La API REST usa `https://api.postpeer.dev/v1`, la cabecera `x-access-key`, `GET /connect/googlebusiness?profileId=...&redirectUri=...` para OAuth y `POST /posts` con `platform: "googlebusiness"`, `accountId`, `publishNow: true` e `idempotencyKey`.

## 2. Decisiones heredadas de MAGO/Composio

1. El método es transparente para el cliente; no se muestran dos tarjetas de Google Business Profile.
2. La conexión propia no se borra ni modifica al conectar PostPeer.
3. La vía se resuelve por usuario y aplicación: `OWN`, `POSTPEER` o `NONE`.
4. Las credenciales centralizadas se guardan cifradas y nunca se registran en chat, logs ni repositorio.
5. La integración nueva queda inerte hasta completar prueba real y autorización de activación.
6. PostPeer conserva los tokens OAuth; Auto Artículos solo guarda identificadores y estado.
7. No se añaden dependencias si `fetch` cubre la API REST.
8. Todo reintento del worker usa idempotencia para no duplicar publicaciones.

## 3. Modelo de datos propuesto

Crear un modelo separado, sin alterar `BusinessProfileIntegration`:

`PostPeerConnection`: `id`, `userId` único, `profileId`, `accountId`, `accountName` opcional, `status` (`ACTIVE`, `PENDING`, `DISCONNECTED`, `ERROR`), `connectedAt`, `updatedAt`, `lastError` opcional.

Crear una ruta global por aplicación (`Business Profile: OWN | POSTPEER`) con valor `OWN` por defecto. La misma migración debe incluir modelo, enum, índices y RLS/políticas necesarias. No se ejecutará sin capitanía de coordinación.

## 4. Flujo de conexión

1. El usuario pulsa conectar en la tarjeta existente.
2. El backend exige sesión, obtiene la clave cifrada y crea o reutiliza el `profileId` de PostPeer para ese usuario.
3. Solicita la URL OAuth de `googlebusiness` con un `redirectUri` firmado y estado anti-CSRF asociado al usuario.
4. El navegador redirige a PostPeer; PostPeer gestiona Google y vuelve al callback.
5. El callback consulta `/connect/integrations?profileId=...`, valida que sea `googlebusiness` y guarda solo `accountId` y metadatos no sensibles.
6. La UI muestra conexión completada y permite probar/desconectar.

No se acepta `accountId` enviado desde el navegador como autoridad ni se permite usar un `profileId` de otro usuario.

## 5. Flujo de publicación

`businessProfilePublish.ts` conserva la preparación actual de resumen, imagen pública y `BusinessProfilePost`:

- `OWN`: usa `createLocalPost` sin cambios.
- `POSTPEER` + conexión `ACTIVE`: llama al adaptador PostPeer.
- `POSTPEER` sin conexión activa: registra reconexión requerida y no publica.
- `NONE`: no procesa.

El adaptador envía `content`, `mediaItems` si existe imagen, destino `googlebusiness` con `accountId`, `publishNow: true` e idempotencia basada en `titleId`. La respuesta sanitizada puede conservarse en `googleResponse`, sin secretos.

## 6. Administración y seguridad

- Nueva clave administrativa `postpeer_api_key` en `SystemSetting`, cifrada con `encryptSecret`.
- Panel administrativo siguiendo el patrón Composio: probar, guardar enmascarada y eliminar.
- Rutas protegidas con `requireAdmin` y `auditLog`.
- Privacidad debe explicar que PostPeer gestiona la conexión.
- La bandera de consumidor se activa solo para el piloto de Lorena, tras las tres auditorías.

## 7. Pruebas y entrega

Pruebas unitarias del cliente (auth, errores, 202, idempotencia y media), del resolvedor (OWN/POSTPEER/NONE), OAuth con cuenta piloto, publicación real única con Milton presente, TypeScript, pruebas web/worker, build y `git diff --check`.

No se fusiona, despliega ni activa la vía PostPeer con una clave o cuenta inventada. Milton introducirá la clave en el panel cuando el código esté listo.
