# WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01 — reporte operativo

## Identificación

- **Base:** `origin/recovery/farmacia-pr-replay-20260727`
- **SHA base/HEAD inicial:** `17426f608400bf80bbb593dc6778993849069d80`
- **Rama:** `work/fh-export-v2-first-visit-adapter-01-20260803`
- **Riesgo:** P1 ámbar, clínico-estructural
- **Estado de entrega:** `READY_FOR_CORA_REVIEW`

La base, rama, worktree limpio y manifest autorizado se verificaron antes de editar. No se realizó stage, commit, push, issue, PR, merge, publicación ni despliegue.

## Implementado

- Adaptador puro `FarmaciaExportV2FirstVisitAdapter` `1.0.0-draft.1`, con API pública exacta de cinco miembros y errores tipados.
- Input cerrado de cinco bloques; IDs, fecha y timestamps explícitos; fecha canónica `YYYY-MM-DD` sin reloj ni fallback.
- Evento `pharmacy_first_visit`; proyección ordenada `1..N` a filas `first_visit_line`; exactamente una principal; estado activo explícito; TSV reversible delegado al core.
- PROMs estructurados con matriz estado/payload, DLQI parcial/completo, ceros reales y EVA condicionada a interacción.
- Bridge DOM de una única línea visible, sin contexto técnico generado y sin fallback a paciente/contexto stale.
- Snapshot de catálogo condicionado a slot + CIP + nombre visibles exactos y limitado a identidad/metadatos permitidos.
- Regla no heurística del control combinado presentación/dosis.
- Defaults visibles `No informado` para inducción, estratificación y PROMs; única fecha canónica explicada.
- Core y adaptador cargados antes del bridge, sin botón ni descarga v2.
- Export público v1 y bloques fuente JARA/CSV preservados.
- Corrección Cora: `No informado` se acepta y normaliza a `null` solo en los dos triestados de Primera Visita; sigue rechazado en cualquier otro string. DLQI exige al menos una respuesta explícita y conserva el cero cuando está sustentado por respuestas de puntuación cero.

## Probado automáticamente

El gate obligatorio incluye:

```text
node --check scripts/farmacia_export_v2_first_visit_adapter.js
node --check scripts/farmacia_primera_visita.js
node tools/farmacia_export_v2_core_check.mjs
node tools/farmacia_export_v2_first_visit_adapter_check.mjs
node tools/farmacia_primera_visita_check.mjs
node tools/farmacia_excel_row_export_check.mjs
node tools/farmacia_smoke_check.mjs
node tools/farmacia_common_check.mjs
node tools/farmacia_tratamiento_common_check.mjs
npx --yes --package=playwright node tools/farmacia_export_v2_first_visit_browser_check.mjs
git diff --check
```

El checker específico verifica pureza/determinismo, contrato cerrado, errores, ausencia de generación técnica, fecha, PROMs, `null/0/false`, una y dos líneas, unicidad, principal única, estado activo, no contaminación, validación core y TSV reversible.

Resultado de ejecución local: todos los comandos anteriores finalizaron con código `0`. Además, el browser checker v1 existente `farmacia_first_visit_excel_truth_browser_check.mjs` finalizó con código `0` contra un servidor local efímero, confirmando de nuevo las 61 columnas, DLQI/EVA cero y consola/page errors vacíos.

Tras la corrección solicitada por Cora, se reejecutaron con código `0` la sintaxis del adaptador, el checker contractual focal, la regresión de Primera Visita y `git diff --check`. Los casos añadidos prueban ambos triestados `No informado` → `null`, el rechazo del mismo literal fuera de esos campos, el rechazo de DLQI vacío y la validez del DLQI cero con respuesta explícita.

## Demostrado en navegador

Chromium real con servidor HTTP efímero y datos sintéticos cubre los 14 criterios de la WO mediante controles soportados: defaults, fecha única y error tipado sin fecha; aislamiento de contexto stale; selección real de catálogo sin inferencias; metadatos exactos; regla presentación/dosis; PROM ausente; DLQI y EVA cero explícitos; fila principal canónica; ausencia de salida pública v2; salida Excel v1 de 61 columnas; y consola/page errors vacíos.

Solo se intercepta la frontera de portapapeles Excel para inspeccionar la salida. No se fabrican estados DOM imposibles.

## No publicado y limitaciones

- Sin cutover: ningún botón, descarga o salida pública consume v2.
- La UI sigue representando una sola línea; el soporte `1..N` está en el adaptador puro y sus fixtures sintéticos.
- No apto para piloto real. Requiere revisión Cora y una WO posterior de publicación/cutover.
- No se modificaron core, schemas, helpers comunes, catálogo, exportador v1, storage, manifests, índices ni estados.

## Reversión

Retirar el adaptador, los cuatro builders del bridge, los dos script tags, defaults/ayuda y checkers/documentos de esta WO. El core, schemas, v1 y demás actos permanecen independientes.
