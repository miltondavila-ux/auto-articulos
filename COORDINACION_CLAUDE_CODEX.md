# COORDINACIÓN CLAUDE · CODEX · ANTIGRAVITY

Documento maestro operativo. Contiene únicamente reglas vigentes y rutas de
registro. El histórico completo anterior al aligeramiento del 2026-09-10 se
conserva, sin cambios, en [ARCHIVO_COORDINACION_HISTORICO.md](ARCHIVO_COORDINACION_HISTORICO.md).

## 1. Unidad de trabajo y nomenclatura

**Conversación = tarea = chat.** Es la unidad operativa de un microprograma:
comienza con un problema concreto, ejecuta su alcance y termina con un cierre
registrado.

- **Tarea Codex:** conversación ejecutada por Codex.
- **Chat Claude:** conversación ejecutada por Claude.
- **Antigravity:** conversación ejecutada por Antigravity.
- Nombre obligatorio: `[AGENTE] - [NOMBRE EXACTO DEL PROBLEMA]`.
- Al iniciar, registrar literalmente el nombre recibido en
  `INVENTARIO_CONVERSACIONES.md`.

## 2. Regla de activación

Cuando Milton invoque explícitamente Coordinación, la primera pregunta es:

> ¿Cuál es el nombre exacto de esta conversación y qué deseas hacer en ella?

Toda conversación activa debe leer este documento antes de actuar y reportar
automáticamente sus avances, reservas, archivos, commits, auditorías,
despliegues, bloqueos y cierre en los documentos correspondientes. Milton no
debe actuar como mensajero entre programadores.

## 3. Aislamiento obligatorio

Cada tarea trabaja en una rama y worktree independientes. Nunca se programa
directamente sobre `main`, ni se mezclan cambios de otra tarea.

Antes de editar:

1. Revisar estado, rama, worktrees y diff.
2. Reservar cada archivo en Coordinación o en el registro de la tarea.
3. Consultar si otro agente tiene el archivo reservado.
4. Si está ocupado, coordinar o trabajar mediante interfaz, adaptador o
   archivo nuevo; nunca sobrescribir.

El capitán del archivo es quien mantiene el diseño coherente cuando un archivo
está caliente. Las tareas paralelas deben entregar parches pequeños y
reaplicables, no copiar ni absorber el trabajo ajeno. Al terminar, liberar las
reservas y registrar la hora.

## 4. Commit y control de cambios

Antes de cada commit:

- ejecutar `git status`;
- revisar el diff completo;
- revisar el diff preparado;
- añadir archivos explícitos, nunca `git add .` ni `git add -A`;
- confirmar que el commit contiene exclusivamente la tarea.

No cambiar versiones de software sin explicar previamente riesgo e impacto.

### Regla suprema: esquema y migración juntos

Todo cambio en `schema.prisma` debe incluir su migración SQL correspondiente
en el mismo commit. Un reviewer debe rechazar cualquier PR que no los incluya
juntos. Nunca usar `--accept-data-loss` sin autorización explícita de Milton.

## 5. Flujo local primero

El espejo local debe ser la primera estación de prueba y debe representar la
versión que está funcionando en Producción. Usar el usuario local de prueba
`lorenalvarez30@gmail.com` únicamente en localhost. Las credenciales y tokens
reales no se copian ni se publican; se simulan o se cargan de forma segura.

Flujo mínimo: prueba local → auditorías → Preview solo si aporta valor →
Producción únicamente con autorización y evidencia. No generar deployments de
Vercel por cada ajuste local.

## 6. Tres auditorías y producción

Toda tarea con código ejecuta tres auditorías proporcionales e independientes:

1. **Integridad:** estado, diff, secretos, alcance, reservas y migraciones.
2. **Funcional:** pruebas locales, build, rutas y comportamiento esperado.
3. **Regresión/entrega:** efectos sobre funciones existentes, Preview,
   deployment y verificación posterior.

No se declara terminada hasta tener commit exclusivo, auditorías aprobadas,
deployment autorizado y verificación posterior en Producción. Si una auditoría
falla, el estado es BLOQUEADO, no terminado.

## 7. Vercel: barrera de seguridad

Antes de tocar `vercel.json`, middleware, autenticación o secretos, verificar
el `Root Directory` real y los logs completos del build.

Si `Root Directory = apps/web`, la configuración exacta es:

```json
{"buildCommand":"npm run build","outputDirectory":".next"}
```

Solo usar `--workspace=apps/web` y `apps/web/.next` cuando Vercel trabaje desde
la raíz del repositorio. Nunca desplegar si hay contradicción entre Vercel,
el repositorio y la prueba local. No ejecutar ninguna acción que pueda tumbar
Producción.

## 8. Estados y registros

- `ACTIVO`: tarea en ejecución, con dueño, rama, worktree y siguiente acción.
- `BLOQUEADO`: requiere resolver una evidencia o dependencia concreta.
- `ARCHIVADO`: tarea cerrada; su contexto permanece consultable.

Registrar cada conversación y su dueño en `INVENTARIO_CONVERSACIONES.md`.
Registrar versiones, commits, migraciones, auditorías y deployments en
`CONTROLADOR_DE_VERSIONES.md`. Registrar ideas y pendientes no autorizados en
`TO-DO.md`; leerlos no autoriza ejecutarlos. Las reglas de producto y operación
para usuarios deben vivir en el manual correspondiente, no aquí.

## 9. Comunicación entre conversaciones

Un canal de comunicación solo se abre cuando Milton lo solicita con:
`Canal de comunicación: [título exacto]`. Las entradas son breves, cronológicas,
firmadas y no se borran. Cada lado revisa aproximadamente cada 30 segundos y
reporta avances, preguntas, bloqueos y cierre. El canal no sustituye el
Inventario ni el registro de versiones.

## 10. Incidentes y contradicciones

No borrar, ocultar ni reescribir información histórica. Si existe una
contradicción, conservar el dato original en el archivo histórico y registrar
la corrección vigente en el documento apropiado. La corrección de un incidente
no autoriza borrar su causa, responsable registrado, commit ni evidencia.

## 11. Índice de registros

- [Inventario de conversaciones](INVENTARIO_CONVERSACIONES.md)
- [Controlador de versiones](CONTROLADOR_DE_VERSIONES.md)
- [TO-DO](TO-DO.md)
- [Histórico completo de Coordinación](ARCHIVO_COORDINACION_HISTORICO.md)
- [Reparador del árbol principal](REPARADOR_DEL_ARBOL_PRINCIPAL.md)

Última reorganización: 2026-09-10. El documento fue reducido a reglas
operativas; el histórico anterior se conserva íntegramente en su archivo.
