# PROMueve Extremadura — Contrato de ejecución

## Rol

Los agentes ejecutan work orders previamente razonadas y aprobadas. No redefinen producto, arquitectura clínica ni prioridades.

## Fuentes de verdad

1. Work order actual.
2. Ref Git autorizada, HEAD, código y documentación versionados.
3. `docs/INDEX.md`.
4. `docs/ops/WORK_ORDER_STATUS.md`.
5. Documento vivo específico indicado por la work order.
6. Artefactos locales de handoff.
7. Engram y memoria como contexto auxiliar.

El cierre y handoff se rigen por [`docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md`](docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md). Un worktree o commit local no equivale a estado publicado; GitHub prevalece sobre copias históricas y todo SHA o estado vivo debe verificarse.

## Preflight

Antes de escribir:

- confirmar repositorio, rama, HEAD y worktree;
- confirmar el alcance y los archivos autorizados;
- crear backup cuando lo exija la work order;
- comprobar que el checkout no contiene cambios ajenos que puedan mezclarse.

## Riesgo y diagnóstico

- Verde: documentación o test aislado, cambio local de bajo riesgo o una pantalla sin helper compartido ni persistencia.
- Ámbar: varias pantallas, helper compartido, snapshots, import/export, persistencia, navegación o identidad, contrato clínico, datos o compatibilidad histórica.
- Rojo: backend, migraciones, autenticación/permisos/identidad, infraestructura, datos reales, arquitectura transversal o cambios destructivos y de seguridad crítica.

Las WOs ámbar y rojas requieren diagnóstico read-only previo de productores, consumidores, callers, persistencia, rerenders, import/export, contratos, legacy, decisiones pendientes y rutas afectadas. No diseñar cambios transversales solo desde el síntoma UI. Rojo requiere además WO diagnóstica o contractual separada y aprobación explícita antes de implementar.

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
- Ante un primer bloqueo independiente, limitar la corrección al contrato vigente. Ante un segundo bloqueo con la misma raíz conceptual, detener, congelar el worktree, generar evidencia y abrir una WO diagnóstica o contractual; no encadenar parches.

## Engram

Guardar en Engram únicamente aprendizajes durables, decisiones técnicas y gotchas reutilizables. No guardar HEAD, rama, prioridad temporal ni estado de PR como verdad operativa.

## Git

- No tocar `main`.
- No tocar ramas Reuma ni referencias HOLD salvo autorización explícita.
- No hacer push, PR, merge ni borrar ramas sin autorización explícita.
- No limpiar, restaurar ni sobrescribir cambios ajenos.
- Mantener commits atómicos y revisables.
- Antes de cualquier commit, generar fuera del repositorio el paquete pre-commit exigido por el protocolo canónico, con `REPORT.md`, `DIFF.patch`, `TESTS.log` y `MANIFEST.sha256`.
- Verificar el diff y obtener autorización posterior al paquete; las WOs ámbar y rojas requieren revisión independiente read-only.
- Distinguir siempre diff local, commit local, rama remota y estado publicado.

## Criterio de cierre

Una WO solo se considera cerrada cuando los checks pasan, el diff contiene únicamente archivos autorizados y el paquete de evidencia identifica riesgos y acciones Git. Si el commit no está autorizado, el diff se conserva sin stage ni publicación.
El reporte debe distinguir hechos comprobados de riesgos pendientes.
Build puede declarar `APTO PARA REVISIÓN`, `BLOQUEADO` o `IMPLEMENTACIÓN EXPERIMENTAL CONGELADA`. En riesgo ámbar o rojo no puede autodeclarar el trabajo apto para commit.

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
