# CONTROLADOR DE VERSIONES

## Regla obligatoria

Antes de modificar código, cambiar de rama, crear un commit, ejecutar una migración o desplegar, se debe leer este documento y `COORDINACION_CLAUDE_CODEX.md` completos.

## Fuente de verdad

- La versión funcional completa restaurada parte del estado de `main` anterior al desliz de versión: commit `eec36697`.
- No se debe restaurar un snapshot parcial ni reemplazar `main` sin comparar primero el árbol completo.
- Los cambios locales sin commit pertenecen al usuario y no se deben sobrescribir ni publicar sin autorización.
- Toda publicación debe usar un commit identificable y verificarse en Vercel.

## Verificación obligatoria

1. Comparar la rama/commit propuesto contra producción.
2. Revisar archivos eliminados y migraciones.
3. Ejecutar typecheck/build disponibles.
4. Confirmar Vercel en estado `Ready`.
5. Confirmar el dominio público y los logs de runtime.
6. Registrar commit, despliegue, resultado y pendientes en la coordinación.

## Protección

No usar restauraciones destructivas ni desplegar una versión anterior solo para corregir un error. Si hay conflicto, conservar primero las funcionalidades existentes y resolver de forma incremental.
