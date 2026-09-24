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
| Dependencias | Ninguna por ahora; las dev-dependencies se añaden por presión real (p. ej. validador JSON Schema en F2.1) y quedan en el lockfile |

## Comandos estables

```bash
npm ci                 # instalación limpia reproducible desde el lockfile
npm run smoke          # smoke Farmacia vigente (tools/farmacia_smoke_check.mjs, 49 checks)
npm run check:syntax   # node --check sobre los módulos farmacia y bridge en gate de CI
npm run check:bridge   # checkers Bridge v2 vigentes (handoff, patient selectors, reader)
npm run verify         # smoke + syntax + bridge, en el mismo orden que el workflow de CI
npm run check:pre-release  # check transversal auxiliar (no gate CI; ver clasificación)
```

Estos scripts son **wrappers** de los gates ya existentes; no introducen una nueva fuente de verdad clínica ni cambian resultados.

## Clasificación de tooling

Clasificación por categorías vigente a esta base. No convierte scripts heredados en gates; la consolidación de CI es F1.2 (#train siguiente) y decide ahí qué se promueve.

### Vigente — gates de CI (`.github/workflows/farmacia-smoke-check.yml`)

- `tools/farmacia_smoke_check.mjs` — smoke Farmacia transversal (49 checks).
- `node --check` sobre `scripts/farmacia_common.js`, `farmacia_index.js`, `farmacia_validacion.js`, `farmacia_primera_visita.js`, `farmacia_seguimiento.js`, `farmacia_dashboard_paciente.js`, `scripts/farmacia_bridge_v2_dashboard_handoff.js`, `tools/farmacia_bridge_v2_dashboard_handoff_check.js`.
- `tools/farmacia_bridge_v2_dashboard_handoff_check.js`, `tools/farmacia_bridge_v2_patient_selectors_check.js`, `tools/farmacia_bridge_v2_reader_check.js`.

Equivalente local reproducible: `npm run verify`.

### Auxiliar — evidencia/QA puntual, no gate

- Checkers browser (`*browser_check.mjs`): requieren navegador/Playwright; se ejecutan cuando la WO lo pide, no en cada push.
- `scripts/check_pre_release.js`: check transversal de pre-release (sintaxis, mojibake, EOL). No es gate de CI; tiene 2 incidencias preexistentes de mojibake en `vendor/sheetjs/xlsx.full.min.js` (vendor minificado) documentadas como deuda.
- Generadores/builders (`tools/build_*.mjs`, `tools/generate_*.py`, `create_excel.py`, `generate_mock_data.py`): se ejecutan bajo demanda de su WO/snapshot; no gate.
- Checkers unitarios por WO (`tools/*_check.mjs` que no están en CI): evidencia de su issue/WO; su promoción a gate es decisión de F1.2.

### Histórico

- Scripts y checkers ligados a WOs cerradas cuya surface ya no existe o fue sustituida (p. ej. checkers del Bridge histórico PR #246, ledger de evaluación retirado del runtime por PR #231). Se preservan como evidencia; no se mantienen como gates.

## Límites de esta WO

- No añade CI nuevo (F1.2), bundler, framework, transpile ni dependencias runtime browser.
- No cambia el comportamiento clínico ni las páginas entregadas.
- Si un check reclama ser promocionado a gate o requiere consolidación, STOP y reportar: es F1.2.
