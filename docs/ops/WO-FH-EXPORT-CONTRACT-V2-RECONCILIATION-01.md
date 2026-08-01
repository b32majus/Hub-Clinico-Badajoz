# WO-FH-EXPORT-CONTRACT-V2-RECONCILIATION-01

**Título:** Reconciliar el contrato de exportación longitudinal, la fila común y el Excel Bridge V4
**Fecha:** 2026-08-01
**Riesgo:** 🟡 Amarillo documental
**Base remota:** `origin/recovery/farmacia-pr-replay-20260727`
**Base y HEAD esperados:** `68b5383762f3ae747f567d49df2e80118c38fe16`
**Rama:** `work/fh-export-contract-v2-reconciliation-01-20260801`
**Worktree:** `/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/worktrees/fh-export-contract-v2-reconciliation-01-20260801`

## 1. Objetivo y contexto

Registrar sin ambigüedad las decisiones funcionales tomadas sobre la exportación longitudinal de Farmacia Hospitalaria antes de implementar el modelo canónico, el Export Manager v2 o el Excel Bridge.

La documentación publicada contenía tres problemas:

1. Presentaba de forma demasiado simple `una fila = un acto`, aunque Seguimiento ya genera varias filas para una misma visita.
2. Describía un `parser del Hub` como procesador cotidiano del Excel, cuando nunca se implementó y la arquitectura V4 posterior asigna la descomposición al Office Script del Excel Bridge.
3. Trataba las 61 columnas actuales como contrato suficiente, aunque ya no representan toda la verdad clínica disponible y deben evolucionar a una fila común v2.

Esta WO es exclusivamente documental. No modifica comportamiento, plantillas, pruebas funcionales, Pages ni snapshots hospitalarios.

## 2. Evidencia publicada contrastada

En el HEAD base:

- `buildFollowupVisitExportModel()` conserva una visita común, líneas seleccionadas/evaluadas, líneas dispensadas, tratamientos relacionados, EA y causalidades.
- `buildFollowupExcelRows()` itera únicamente `model.dispensed_lines`.
- `buildFollowupCsv()` reutiliza exactamente esas filas Excel y las mismas 61 columnas.
- Una visita con dos líneas dispensadas produce dos filas con `visit_id` y contexto común repetidos.
- Una línea evaluada pero no dispensada aparece en TXT JARA, pero no genera hoy fila Excel/CSV.
- Los tests publicados protegen expresamente este comportamiento.

## 3. Decisiones funcionales cerradas

### 3.1 Fila común longitudinal

- Validación, Primera Visita y Seguimiento usan un único esquema de fila común en todas las hojas de servicio.
- Las 61 columnas actuales son la versión v1 implementada, no el contrato final.
- La fila común debe evolucionar a v2 y ser clínicamente completa; no se conservará el número 61 como restricción artificial.
- Los bloques no aplicables permanecen vacíos.
- `0`, `false` y ausencia se preservan como estados distintos.
- La información la genera el Hub. La profesional pega la salida; no crea ni completa manualmente el paciente en Excel.

### 3.2 Relación entre acto y filas

- El acto canónico mantiene una identidad única mediante `event_id` y `source_event_id`.
- Un acto puede producir una o varias filas nativas.
- Cada fila tendrá identidad propia (`row_id`) y conservará la identidad común del acto.
- La repetición de datos comunes entre filas del mismo acto es una desnormalización operativa deliberada.
- Las métricas de visitas y PROMs deben usar identificadores distintos, no contar filas sin deduplicar.

### 3.3 Grano objetivo de Seguimiento

La fila v2 de Seguimiento tendrá como grano:

```text
visita × línea terapéutica activa en la fecha de la visita
```

Por tanto, cada línea explícitamente activa genera una fila, se dispense o no y se revise específicamente o no.

Tres dimensiones permanecen independientes:

- `active_at_visit`;
- `dispensation_status`;
- `specific_review_status`.

La ausencia de revisión específica no significa eficacia, seguridad, adherencia, corrección del tratamiento ni ausencia de problemas. Solo significa que no se registró una revisión individual de esa línea.

La fotografía de líneas activas pertenece a la visita y no se recalcula retrospectivamente con el estado posterior del paciente.

### 3.4 Estado actual frente a objetivo

**Actual implementado:** una fila por línea dispensada; contexto común duplicado; CSV y Excel comparten el mismo constructor.
**Objetivo v2:** una fila por línea activa en la visita, con dispensación y revisión específica como estados explícitos.

Este cambio requiere una WO técnica futura. La presente WO no altera la salida publicada.

### 3.5 Validación: solicitado y validado

- El tratamiento solicitado y el tratamiento validado por Farmacia son bloques distintos.
- El solicitado no se copia automáticamente al validado.
- Una solicitud no crea por sí misma una línea activa.
- Si el tratamiento validado no está informado, permanece vacío.
- Dosis, presentación, vía, pauta, inducción, duración, línea, switch o add-on nunca se infieren por nombre, catálogo o ausencia.

### 3.6 Excel Bridge

La fila común completa se pega en la hoja operativa del servicio. El Office Script:

1. conserva íntegra la fila nativa;
2. valida `schema_version`, `source_event_id` y `row_id`;
3. procesa de forma idempotente;
4. agrupa las filas del mismo acto;
5. descompone en hojas relacionales;
6. no corrige ni infiere clínica;
7. marca `PROCESADA` o `ERROR`;
8. registra el error sin destruir la entrada;
9. genera vistas `APP_*` para lectura del Hub.

Para una visita con N líneas activas, la proyección relacional esperada es:

```text
VISITS:      1 registro por visit_id
VISIT_LINES: N registros por visit_id + line_id
PROMS:       0..N por visita e instrumento
ADVERSE_EVENTS: solo si existe EA explícito
CAUSALITY:   una valoración por EA y sospechoso cuando exista
```

Si filas del mismo acto contienen datos comunes incompatibles, el Office Script no elige ni corrige: registra error y conserva las filas originales.

### 3.7 Componentes con nombres no ambiguos

- **Office Script Processor:** fila nativa → hojas relacionales.
- **Excel Read Adapter:** vistas `APP_*` → reconstrucción del Hub.
- **PostgreSQL Migrator:** Excel Bridge existente → servidor local PostgreSQL.

El antiguo `parser del Hub` no es una capacidad implementada. Solo conserva sentido futuro como adaptador de lectura o migrador, no como procesador diario principal.

## 4. Decisiones todavía abiertas

- Número y nombres definitivos de las columnas v2.
- Enums finales de dispensación y revisión específica.
- Política exacta de `row_id`, `row_index` y `row_count`.
- Representación nativa de tratamientos relacionados 1:N.
- Representación nativa de varios sospechosos y causalidades.
- Tratamiento de líneas suspendidas durante la propia visita.
- Cardinalidad de filas para actos de Validación o Primera Visita con varias líneas.
- Compatibilidad temporal y retirada de la plantilla de 61 columnas.

Estas cuestiones no se presentan como decisiones aprobadas.

## 5. Rutas

- `docs/ops/WO-FH-EXPORT-CONTRACT-V2-RECONCILIATION-01.md`
- `docs/farmacia_export_longitudinal_contract_WO8.md`
- `docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`
- `docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`
- `docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`
- `docs/INDEX.md`
- `docs/ops/WORK_ORDER_STATUS.md`

## 6. NO TOCA

- JavaScript, HTML o CSS.
- Plantilla Excel o workbook técnico.
- Tests funcionales o de navegador.
- Persistencia local, ledger o workbook.
- `main`.
- `previews/caceres-fh/`.
- GitHub Pages.
- Backend, Supabase, SharePoint o servidor.
- Datos reales o identificadores reales.

## 7. Reversión

Revertir exclusivamente el commit documental de esta WO. No existe migración de datos ni cambio funcional que revertir.

## 8. QA documental

- `git diff --check`.
- Verificación de enlaces internos y rutas.
- Búsqueda de las formulaciones obsoletas `una fila = un acto` y `parser del Hub` en los documentos modificados.
- Verificación de que la documentación distingue actual implementado, objetivo v2 y pendiente.
- Verificación de HEAD, snapshot Cáceres y PRs publicados.

## 9. Criterios de aceptación

- Las decisiones de esta WO aparecen de forma coherente en contrato, arquitectura y plan.
- Se documenta el comportamiento actual de Seguimiento sin presentarlo como objetivo final.
- La fila v2 se define como común y completa, sin limitarse a 61 columnas.
- Se registra el grano objetivo `visita × línea activa`.
- Solicitado y validado permanecen separados.
- Se eliminan las referencias al parser cotidiano del Hub como arquitectura vigente.
- Índice, tablero y estado vivo reflejan el estado publicado real hasta PR #205.
- No cambia ningún archivo funcional.

## 10. Política Git

La redacción puede realizarse y revisarse localmente en esta rama. Commit, push, issue, PR y merge requieren autorización separada. No se elimina la rama ni el worktree automáticamente.
