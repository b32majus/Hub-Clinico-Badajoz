# ADR-004 — Contratos de lectura clínica por módulo

**Estado:** `ACCEPTED_ENGINEERING`
**Fecha:** 2026-09-24

## Contexto

Farmacia tiene un Data Port real pero todavía filtra detalles de representación Excel. Reuma mezcla parser, storage, consultas y proyecciones. Una API futura no debe verse obligada a simular hojas o filas.

## Decisión

Cada módulo expone Read Ports/casos de uso propios. No se crea un mega-port transversal.

Los nuevos contratos deben definir:

- DTO independiente del soporte físico;
- ausencia legítima frente a error;
- scope hospitalario/fuente;
- procedencia y completitud/revisión;
- ambigüedad;
- comportamiento temporal/cancelación/respuestas tardías;
- paginación cuando proceda.

## Asincronía

La dirección es async, pero por **strangler progresivo**:

- legacy síncrono puede coexistir temporalmente;
- se añade fachada async sobre la fuente local;
- se migra un recorrido vertical;
- no se mantiene una segunda copia clínica divergente;
- la API remota solo se habilita cuando el recorrido consumidor está preparado.

## Farmacia

Preservar `FarmaciaApplicationDataPort`/DataSource como seam y retirar progresivamente `canonical_row`/provenance física del contrato de aplicación.

## Reuma

Primero envolver `HubTools.data`; extraer parser/storage después. Oráculos aceptados preceden a cada refactor.

## Alternativas rechazadas

- hacer síncrona una API remota;
- migrar todos los consumidores de una vez;
- contract común idéntico para Reuma/Farmacia.

## Reabrir si

La implementación de un adapter real demuestra que el contrato elegido no expresa completitud, scope o latencia necesarios.
