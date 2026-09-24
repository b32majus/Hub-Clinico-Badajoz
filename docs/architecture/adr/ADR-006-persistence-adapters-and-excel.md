# ADR-006 — Persistence adapters y Excel como modo soportado

**Estado:** `ACCEPTED_ENGINEERING`
**Fecha:** 2026-09-24

## Decisión

Excel permanece como adapter soportado de PROMueve. No es el dominio ni una etapa necesariamente desechable.

Modos futuros posibles:

- local Excel;
- cloud API autorizada;
- hospital API/institucional.

La UI/casos de uso no conocen SQL, hojas ni portapapeles.

## Capabilities

Los adapters son sustituibles solo para capacidades compatibles. No se presume:

- concurrencia;
- atomicidad;
- identidad autenticada;
- control de revisión;
- auditoría;
- persistencia duradera.

Cada capability exige evidencia y condición operativa.

## Semántica de persistencia

- copy/download: `prepared_for_transfer`;
- File System Access puede llegar a `persisted` en archivo con close + relectura/validación y condiciones declaradas;
- Bridge + Office Script puede llegar a `persisted` si el acto completo queda incorporado y su guardado duradero se confirma;
- reimport/roundtrip confirma la copia observada, no unicidad/latest ni ausencia de concurrencia.

`persisted in Bridge` ≠ `registrado oficialmente en SES`.

## Concurrencia

Excel puede operar con `single-writer` cuando sea una condición explícita y cualificada. Una futura API puede declarar otras garantías sin cambiar el significado clínico del acto.

## Alternativas rechazadas

- Excel como base conceptual;
- copiar 152/497 columnas a SQL como dominio;
- credenciales DB en navegador;
- afirmar persistencia por portapapeles o por finalización de un script sin evidencia suficiente.

## Reabrir si

SES determina un único repositorio obligatorio que retire un modo o si las limitaciones operativas de Excel hacen inviable el alcance permitido.
