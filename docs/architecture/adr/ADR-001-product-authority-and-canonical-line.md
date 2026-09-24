# ADR-001 — Autoridad de producto y futura línea canónica

**Estado:** `ACCEPTED_ENGINEERING`
**Fecha:** 2026-09-24
**Freeze:** `../PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md`

## Contexto

PROMueve conserva `main` legacy, una línea publicada `recovery/farmacia-pr-replay-20260727`, snapshots independientes y la historia Reuma dentro del mismo repositorio. Crear un repo nuevo o declarar una rama nueva sin transición produciría doble autoridad.

## Decisión

1. Mantener un único repositorio: `b32majus/Hub-Clinico-Badajoz`.
2. `main` no se reutiliza automáticamente como nueva base.
3. Architecture Freeze no cambia la autoridad Git vigente.
4. Una futura línea canónica de plataforma se creará mediante WO específica de transición desde el SHA live aprobado, sin cherry-picks selectivos ni rewrite.
5. La activación será explícita: hasta ese hito, recovery conserva su autoridad publicada.
6. Snapshots/releases existentes conservan su propia autoridad de artefacto.

## Procedimiento futuro mínimo

- aprobar WO de transición;
- resolver trabajo pendiente/ventana de freeze;
- verificar GitHub live y gates del SHA fuente;
- crear la línea desde el SHA exacto;
- demostrar equivalencia inicial de árbol/CI;
- reconciliar INDEX/WOS/publicación;
- activar la nueva autoridad;
- congelar recovery como referencia histórica para nuevo desarrollo.

## Alternativas rechazadas

- repo nuevo por limpieza: coste y doble autoridad sin frontera organizativa real;
- mover `main` ahora: mezcla historia legacy con transición no cualificada;
- declarar la rama al publicar este ADR: documentación no ejecuta una transición operativa.

## No decide

- nombre definitivo de la futura rama;
- fecha exacta de transición;
- hosting/release institucional.

## Reabrir si

Ownership, permisos, equipos, regulación o ciclos de release exigen repositorios independientes.
