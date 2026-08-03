# WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01 — reporte operativo

## Identificación

- **Base:** `origin/recovery/farmacia-pr-replay-20260727`
- **SHA base/HEAD inicial:** `3710409b90bb4ec589327ab9049ea29d01d6d3d9` (merge de PR #219)
- **Rama:** `work/fh-export-v2-followup-active-lines-01-20260803`
- **Riesgo:** P1 ámbar, clínico-estructural
- **Estado de entrega:** `MERGED_AND_VERIFIED`
- **Estado candidate previo:** `READY_FOR_CORA_REVIEW` (2026-08-03, antes de la publicación)

Durante la fase candidate se verificaron la base, la rama y el worktree limpio (`git fetch origin --prune` confirmó `c45b7d1..3710409` en remoto y local) y no se realizó stage, commit, push, issue, PR, merge, publicación ni despliegue. La publicación posterior consta en la sección «Publicación».

## Publicación — 2026-08-04

- **Issue:** #220 — CLOSED.
- **PR:** #221 — MERGED, base `recovery/farmacia-pr-replay-20260727`.
- **Commit funcional:** `8b7372ac398fd8aa6049d26c0ee067e219f6b2ea`.
- **Merge SHA / HEAD recovery:** `b9f27e96f90f5bb20017ba805bb68f823b4df00f`.
- **Checks push y pull_request:** SUCCESS.
- `main` no modificada.
- El candidate publicado permanece como **infraestructura interna**: sin cutover ni salida pública v2, sin despliegue clínico y no apto para piloto real; la salida pública v1 de 61 columnas permanece preservada.
- Los tests contractuales, la regresión v1 y el QA Chromium descritos abajo corresponden al candidate publicado.

## Corrección de revisión Cora (vocabulario de rol)

La revisión Cora detectó una incoherencia contractual: WO4 cerraba `lineRole` como `primary`/`additional` mientras el adaptador de Primera Visita v2 publicado por PR #217 emite `principal`/`additional`; el mismo campo canónico `line_role` no puede usar vocabularios distintos según el acto.

Corrección aplicada en WO4, adoptando el vocabulario publicado por Primera Visita:

- `lineRole='principal'` ⇔ `isPrimaryLine=true`; `lineRole='additional'` ⇔ `isPrimaryLine=false`.
- Cero o una principal válidas; más de una principal inválida.
- `'primary'` se rechaza con `INVALID_LINE_ROLE`; no hay normalización silenciosa `primary→principal` ni aceptación de ambos vocabularios.
- El bridge, el HTML y el exportador v1 no contenían el literal de vocabulario WO4; `primary` en v1 (`tipo_relacion`, `DEMO_LINE_CONTRACT`, clases Bootstrap) permanece intacto.
- No se modificaron WO3, core, schemas ni los fixtures de datos v2.

Tests focales añadidos al checker: `principal+true` válido, `additional+false` válido, `principal+false` inválido, `additional+true` inválido, `primary` inválido, cero/una/dos principales, y verificación de que Primera Visita (checker y QA publicados) y Seguimiento documentan el mismo valor `principal`.

## Plan aprobado y ajustes

El plan técnico fue aprobado con seis ajustes obligatorios (A1–A6), todos implementados:

- **A1 (fuente única y guard):** `activeLines` técnico es la única fuente del conjunto activo. El bridge exige CIP visible exacto == `identifierValue` (`BRIDGE_CIP_MISMATCH`) y correspondencia visible inequívoca de cada `lineId` (`BRIDGE_LINE_NOT_VISIBLE` / `BRIDGE_AMBIGUOUS_LINE`); no añade, filtra, completa ni reordena `activeLines`; no exige igualdad de conjuntos con el runtime; una línea visible adicional no se incorpora ni invalida por sí sola.
- **A2 (orden):** orden explícito del array preservado exactamente; `row_index=1..N` y `row_count=N` siguen ese orden (el core no reordena).
- **A3 (principal):** se admiten cero o una principal; se rechazan >1 (`MULTIPLE_PRIMARY_LINES`), `isPrimaryLine=true` con rol distinto de `principal`, `isPrimaryLine=false` con `lineRole=principal` (`INVALID_PRIMARY_COHERENCE`) y roles fuera del enum cerrado `['principal','additional']` (`INVALID_LINE_ROLE`). El vocabulario canónico es el publicado por el adaptador de Primera Visita v2 (PR #217): `principal`/`additional`; el literal inglés `primary` se rechaza.
- **A4 (ausencia):** `null`, `false` y `0` se preservan distintos (evento, filas y TSV); strings opcionales vacíos/whitespace → `null`; obligatorios vacíos → error (`EMPTY_REQUIRED`); `drugName=""` / `activeIngredient=""` no identifican.
- **A5 (fecha):** `visitDate` técnico explícito real `YYYY-MM-DD` (timestamps rechazados); `occurredAt`/`recordedAt` ISO explícitos sin fallback de reloj/`Date`; el control DOM autocompletado no alimenta v2. El QA usa fecha sintética técnica `2026-09-15` y contrasta con la fecha DOM autocompletada.
- **A6 (clasificación):** tabla C1–C5 campo a campo completa en el contrato; solo C1 entra en evento/filas. Ver `docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md`.

Además: cero líneas → input inválido con `EMPTY_ACTIVE_LINES` y error tipado de los builders (nunca proyección vacía válida); los 12 tests adicionales obligatorios quedan cubiertos en el checker contractual; la excepción baseline de `farmacia_export_clipboard_check.mjs` se documenta sin corregir.

## Implementado

- Adaptador puro `FarmaciaExportV2FollowupActiveLinesAdapter` `1.0.0-draft.1`, API pública exacta de cuatro miembros y errores tipados con `code`/`message`/`details`.
- Input cerrado `technical`/`context`/`visit`/`activeLines`; IDs, fechas y timestamps explícitos; `visitDate` canónico `YYYY-MM-DD` sin reloj ni fallback.
- Evento `pharmacy_followup`; proyección ordenada `1..N` a filas `followup_line` con `bridge_status=PENDIENTE`; estado `active`/`activeAtEvent=true` exigido en toda línea; TSV reversible delegado al core (152 columnas).
- Reglas de línea: unicidad de `rowKey`/`lineId`, identidad clínica por `drugName` o `activeIngredient`, rol cerrado, 0..1 principal, sin reordenación ni filtración silenciosa de inactivas.
- Bridge `buildFollowupV2Input` / `buildFollowupV2Projection` en `window.FarmaciaSeguimiento`: contexto técnico cerrado (`FOLLOWUP_V2_TECHNICAL_CONTEXT_FIELDS`), guards A1, sin mutación del contexto, `BRIDGE_ADAPTER_UNAVAILABLE` si falta el adaptador.
- Core y adaptador cargados antes del bridge, sin botón ni descarga v2.
- Export público v1 y bloques fuente JARA/CSV/Excel FH preservados; dispensación y revisión específica intactas (independientes de esta WO, secuencia WO2–WO4).

## Probado automáticamente

El gate obligatorio incluye:

```text
node --check scripts/farmacia_export_v2_followup_active_lines_adapter.js
node --check scripts/farmacia_seguimiento.js
node tools/farmacia_export_v2_followup_active_lines_adapter_check.mjs
node tools/farmacia_export_v2_core_check.mjs
node tools/farmacia_seguimiento_check.mjs
node tools/farmacia_pr57a_line_selection_check.mjs
node tools/farmacia_pr57b_visit_isolation_check.mjs
node tools/farmacia_pr57c_ea_causality_check.mjs
node tools/farmacia_pr57d_visit_outputs_check.mjs
node tools/farmacia_excel_row_export_check.mjs
node tools/farmacia_evaluation_ledger_check.mjs
node tools/farmacia_smoke_check.mjs
npx --yes --package=playwright node tools/farmacia_export_v2_followup_browser_check.mjs
git diff --check
```

El checker contractual (PASS) cubre API exacta, versión, pureza sin DOM/storage/red/reloj/aleatoriedad, input cerrado, errores tipados, IDs y fechas explícitas, orden preservado (incluido orden no alterado por `rowKey`), cero/una/dos principales, coherencia rol/boolean, opcionales vacíos → `null`, obligatorios vacíos → error, `visitDate` ausente/inválida, línea técnica inexistente → error, bridge sin mutación de `activeLines`, campos C2–C5 ausentes de evento/filas/TSV y reversibilidad.

La excepción `tools/farmacia_export_clipboard_check.mjs` es baseline preexistente (aserciones editoriales v1 desactualizadas: CSV visible, etiqueta publicada del botón Excel «Copiar filas Excel FH», notices); se documenta sin corregir, como autorizado.

## Demostrado en navegador

Chromium real con servidor HTTP efímero y datos sintéticos: 1 tarjeta con auto-selección y fecha DOM contrastada contra `visitDate` técnico; 2 tarjetas sin auto-selección y proyección de 2 filas con orden preservado (`row_index [1,2]`, `row_count [2,2]`, roles `[principal,additional]`); proyección parcial sin incorporar línea extra visible; `BRIDGE_LINE_NOT_VISIBLE` para línea inexistente y para línea de otro paciente; no mutación; dispensado → JARA/CSV v1 y Excel FH de 61 columnas (frontera de portapapeles interceptada); sin botones ni descargas v2; CIP sin líneas → `BRIDGE_CIP_MISMATCH` (contexto stale) / `BRIDGE_EMPTY_ACTIVE_LINES`; CIP manual → autocomplete de catálogo visible y cero tarjetas; consola y page errors vacíos.

## No activado públicamente y limitaciones

- Sin cutover: ningún botón, descarga o salida pública consume v2.
- La detección de líneas activas del QA usa fixtures sintéticos y guard del bridge; no se fabrican estados DOM imposibles.
- No apto para piloto real. Requiere el cierre explícito del gate conjunto WO2–WO4 y la WO posterior de publicación/cutover (`WO-FH-EXPORT-V2-CUTOVER-01`), aún no iniciada.
- No se modificaron core, schemas, helpers comunes, catálogo, exportador v1, ledger, storage, manifests, índices ni estados.

## Reversión

Retirar el adaptador, los dos builders del bridge y sus guards, los dos script tags y los checkers/documentos de esta WO. El core, schemas, v1 y demás actos permanecen independientes.
