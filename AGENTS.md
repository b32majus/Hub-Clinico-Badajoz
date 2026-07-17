# PROMueve Extremadura — Contrato de ejecución

## Rol

Los agentes ejecutan work orders previamente razonadas y aprobadas. No redefinen producto, arquitectura clínica ni prioridades.

## Fuentes de verdad

1. Work order actual.
2. `docs/INDEX.md`.
3. `docs/ops/WORK_ORDER_STATUS.md`.
4. Documento vivo específico indicado por la work order.
5. Código y tests del HEAD autorizado.

Engram es memoria auxiliar y puede estar obsoleta. GitHub y la documentación versionada son la fuente de verdad.

## Preflight

Antes de escribir:

- confirmar repositorio, rama, HEAD y worktree;
- confirmar el alcance y los archivos autorizados;
- crear backup cuando lo exija la work order;
- comprobar que el checkout no contiene cambios ajenos que puedan mezclarse.

## Seguridad clínica

Nunca inferir desde el nombre de un fármaco, CIMA o catálogo:

- dosis, vía, pauta o presentación;
- inducción, switch, add-on, renovación o duración;
- causalidad o resultado de validación.

Tratamiento solicitado no equivale a tratamiento validado. Los datos ausentes permanecen vacíos o pendientes. Usar únicamente datos sintéticos y de demostración.

## Ejecución

- Ejecutar solo la work order aprobada.
- No redefinir el plan ni ampliar la WO.
- No crear especificaciones o documentación no solicitada.
- No delegar salvo que la WO o el agente lo permita.
- Una sugerencia de revisión no cambia el contrato.
- Un defecto UI solo es válido si se reproduce mediante interacción soportada.
- No inyectar estados imposibles mediante DOM, campos readonly o campos ocultos.
- Mantener el proyecto sin herramientas o dependencias nuevas salvo autorización explícita.

## Engram

Guardar en Engram únicamente aprendizajes durables, decisiones técnicas y gotchas reutilizables. No guardar HEAD, rama, prioridad temporal ni estado de PR como verdad operativa.

## Git

- No tocar `main`.
- No tocar ramas Reuma ni referencias HOLD salvo autorización explícita.
- No hacer push, PR, merge ni borrar ramas sin autorización explícita.
- No limpiar, restaurar ni sobrescribir cambios ajenos.
- Mantener commits atómicos y revisables.
- Verificar el diff antes de cualquier commit.

## Criterio de cierre

Una WO solo se considera cerrada cuando los checks pasan, el diff contiene únicamente archivos autorizados y el reporte identifica riesgos y acciones Git. Si el commit no está autorizado, se deja preparado pero no se publica.
El reporte debe distinguir hechos comprobados de riesgos pendientes.

## STOP

Detenerse ante:

- contradicción clínica o necesidad de inferir datos;
- cambio de contrato no autorizado;
- dependencia nueva;
- HEAD inesperado o conflicto Git;
- ampliación de alcance;
- fallo repetido del harness;
- necesidad de modificar una capa programada para desaparecer;
- necesidad de acceder a secretos, datos reales o rutas externas.

## Cierre

Reportar archivos, cambios, checks, QA, diff, riesgos, commit y cualquier acción Git realizada. Indicar expresamente si no hubo push, PR ni merge.
