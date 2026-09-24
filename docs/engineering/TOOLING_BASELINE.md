# PROMueve Nexus — Tooling Baseline (F1.1)

**Estado:** `ACCEPTED_ENGINEERING_BASELINE`
**Issue / WO:** #383 — `WO-NEXUS-F1.1`
**Base de shaping:** `promueve/nexus-v4` @ `d160f9669dbcbbfd355aa56009b527586b1eaa4e`
**Norma documental:** [`PRODUCT_DOCUMENTATION_STANDARD.md`](./PRODUCT_DOCUMENTATION_STANDARD.md)

## Runtime de tooling

| Elemento | Valor |
| --- | --- |
| Runtime | Node.js **major 20** (`.nvmrc` = `20`; `engines` fijado en `package.json`) |
| Package manager | **npm** con `package-lock.json`; instalación reproducible con `npm ci` |
| Ámbito | Desarrollo y CI únicamente. El puesto asistencial y la entrega estática al hospital **no** requieren Node |
| Dependencias | Una única dev-dependencia: `ajv ^8.20.0` (validador JSON Schema, añadida por F2.1/Bootstrap 01); vive en el lockfile (`package-lock.json`) |

## Comandos estables

```bash
npm ci                 # instalación limpia reproducible desde el lockfile
npm run smoke          # smoke Farmacia vigente (tools/farmacia_smoke_check.mjs, 49 checks)
npm run check:syntax   # node --check sobre los módulos farmacia y bridge en gate de CI
npm run check:bridge   # checkers Bridge v2 vigentes (handoff, patient selectors, reader)
npm run verify         # smoke + syntax + bridge, en el mismo orden que el workflow de CI
npm run verify:fast    # alias estable de `verify` (feedback rápido de PR; job `fast-gates` de CI)
npm run check:contracts       # contratos de deployment (tools/deployment_contracts_check.mjs)
npm run check:manifest       # deployment manifest (tools/deployment_manifest_check.mjs)
npm run check:readiness      # deployment readiness (tools/deployment_readiness_check.mjs)
npm run check:platform       # contrato de plataforma (tools/platform_contract_check.mjs)
npm run check:reuma:read           # oráculo de lectura Reuma (tools/reuma_read_acceptance_check.mjs)
npm run check:reuma:export-harness # harness de export Reuma (tools/reuma_export_harness_check.mjs)
npm run check:reuma:export         # oráculo de export Reuma (tools/reuma_export_acceptance_check.mjs)
npm run verify:nexus     # verify + los 7 gates check:* anteriores, con && (propagación fail-fast de exit codes)
npm run check:pre-release  # check transversal auxiliar (no gate CI; ver clasificación)
```

Estos scripts son **wrappers** de los gates ya existentes; no introducen una nueva fuente de verdad clínica ni cambian resultados.

**Hashes de provenance del deployment manifest (NEXUS-DEBT-001):** `tools/deployment_manifest_build.mjs` calcula los SHA-256 de provenance sobre contenido EOL-canonicalizado (CRLF/CR → LF): JSON lógicamente idéntico produce hashes idénticos en checkouts LF/CRLF.

## Clasificación de tooling

Clasificación por categorías vigente a esta base (actualizada por F1.2B, #397: los checkers de deployment, plataforma y Reuma aceptados se promovieron a gates de CI; el QA browser/manual sigue siendo una categoría de gate separada, F3.3).

### Vigente — gates de CI (`.github/workflows/nexus-checks.yml`)

- `tools/farmacia_smoke_check.mjs` — smoke Farmacia transversal (49 checks).
- `node --check` sobre `scripts/farmacia_common.js`, `farmacia_index.js`, `farmacia_validacion.js`, `farmacia_primera_visita.js`, `farmacia_seguimiento.js`, `farmacia_dashboard_paciente.js`, `scripts/farmacia_bridge_v2_dashboard_handoff.js`, `tools/farmacia_bridge_v2_dashboard_handoff_check.js`.
- `tools/farmacia_bridge_v2_dashboard_handoff_check.js`, `tools/farmacia_bridge_v2_patient_selectors_check.js`, `tools/farmacia_bridge_v2_reader_check.js`.
- `tools/deployment_contracts_check.mjs` (F2.1), `tools/deployment_manifest_check.mjs` (F2.1), `tools/deployment_readiness_check.mjs` (F2.2) — contratos de deployment.
- `tools/platform_contract_check.mjs` — contrato de plataforma.
- `tools/reuma_read_acceptance_check.mjs` — oráculo de lectura Reuma.
- `tools/reuma_export_harness_check.mjs` y `tools/reuma_export_acceptance_check.mjs` — harness y oráculo de export Reuma (#396).

Equivalente local reproducible: `npm run verify` (gates rápidos) y `npm run verify:nexus` (suite determinista completa, mismo orden y misma propagación de exit codes que el job de CI).

El job de suite determinista ejecuta `npm ci` antes de `npm run verify:nexus`: los checkers de deployment y plataforma dependen de la dev-dependencia `ajv` (presente en el lockfile). Los gates rápidos no requieren instalación.

QA browser/manual: no forma parte de estos gates; es una categoría de gate separada (F3.3, carril propio) y esta suite no acredita piloto ni producción (ADR-007).

### Auxiliar — evidencia/QA puntual, no gate

- Checkers browser (`*browser_check.mjs`): requieren navegador/Playwright; se ejecutan cuando la WO lo pide, no en cada push.
- `scripts/check_pre_release.js`: check transversal de pre-release (sintaxis, mojibake, EOL). No es gate de CI; tiene 2 incidencias preexistentes de mojibake en `vendor/sheetjs/xlsx.full.min.js` (vendor minificado) documentadas como deuda.
- Generadores/builders (`tools/build_*.mjs`, `tools/generate_*.py`, `create_excel.py`, `generate_mock_data.py`): se ejecutan bajo demanda de su WO/snapshot; no gate.
- Checkers unitarios por WO (`tools/*_check.mjs` que no están en CI): evidencia de su issue/WO. Los checkers aceptados (deployment, plataforma, Reuma) se promovieron a gates en #397; el resto sigue como evidencia, su promoción es decisión futura.

### Histórico

- Scripts y checkers ligados a WOs cerradas cuya surface ya no existe o fue sustituida (p. ej. checkers del Bridge histórico PR #246, ledger de evaluación retirado del runtime por PR #231). Se preservan como evidencia; no se mantienen como gates.

## Límites de esta WO

- No añade CI nuevo (F1.2), bundler, framework, transpile ni dependencias runtime browser.
- No cambia el comportamiento clínico ni las páginas entregadas.
- Si un check reclama ser promocionado a gate o requiere consolidación, STOP y reportar: es F1.2.
