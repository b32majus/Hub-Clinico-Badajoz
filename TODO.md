# TODO — navegación, no backlog vivo

**Estado:** reconciliado 2026-09-24.

Este archivo no mantiene una lista estática de “lo siguiente”. En un proyecto activo, issues/PRs y ramas avanzan más rápido que un TODO manual.

## Fuente de trabajo actual

Antes de empezar una tarea:

1. consultar GitHub live;
2. leer `docs/INDEX.md`;
3. leer `docs/ops/WORK_ORDER_STATUS.md`;
4. para Farmacia, consultar `docs/ops/FARMACIA_DEBT_REGISTER.md`;
5. resolver la spec/issue/instrucción aceptada de la tarea concreta.

No convertir entradas históricas de este archivo en trabajo vigente sin revalidación.

## Farmacia — deuda conocida

`FH-DEBT-001` permanece abierto y debe resolverse antes de piloto real: frontera de persistencia/seguridad para datos clínicos importados.

`FH-DEBT-002` y `FH-DEBT-003` tienen ya una implementación candidate preservada en `work/fh-v6-sheet-resolution-native-gentle-20260921` (`2015897...`), pendiente de promoción/revisión contra `recovery`; no deben reimplementarse desde cero.

La autoridad exacta de esas entradas está en `docs/ops/FARMACIA_DEBT_REGISTER.md`.