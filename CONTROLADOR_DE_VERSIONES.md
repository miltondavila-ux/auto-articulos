# CONTROLADOR DE VERSIONES

## Regla obligatoria

Antes de modificar código, crear un commit, cambiar de rama, desplegar o ejecutar una migración, el agente debe leer este documento completo y comprobar el estado real del repositorio y de producción.

## Fuente de verdad

- La versión estable restaurada de producción parte de `8d62657`.
- Toda nueva versión debe conservar las funcionalidades de esa base, salvo una instrucción explícita del usuario.
- El despliegue debe hacerse desde una rama/commit verificable; nunca se debe desplegar `main` sin comparar antes su historial con la versión estable.
- Los cambios locales sin commit pertenecen al usuario y no se deben perder, sobrescribir ni publicar sin autorización explícita.

## Procedimiento mínimo antes de desplegar

1. Leer este controlador y `COORDINACION_CLAUDE_CODEX.md`.
2. Registrar la rama, commit base, archivos modificados y diferencias frente a producción.
3. Confirmar que no se están usando archivos locales sin commit como si fueran parte de la versión publicada.
4. Ejecutar las validaciones disponibles.
5. Desplegar con un commit identificable.
6. Verificar el estado de Vercel, la respuesta pública y los logs de runtime.
7. Informar el commit exacto y no declarar éxito hasta completar esas verificaciones.

## Protección de producción

- No hacer reset destructivo ni reescribir producción sin autorización.
- No desplegar una rama anterior solo para reparar un error sin reconstruir primero las mejoras que estaban activas.
- Las migraciones de base de datos deben ser seguras, revisadas y separadas de cambios de interfaz.
- Si producción falla, conservar la evidencia del error y restaurar la última versión funcional completa, no una base parcial.

## Registro de restauración

- Restauración solicitada por Milton: 27/08/2026.
- Versión funcional objetivo: `8d62657`.
- Reparación de compatibilidad necesaria: Prisma debe incluir `rhel-openssl-3.0.x` además de `native`.
