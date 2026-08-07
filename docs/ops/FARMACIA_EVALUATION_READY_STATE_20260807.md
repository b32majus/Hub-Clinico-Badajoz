# Farmacia — estado del paquete de evaluación sintética

| Metadato | Valor |
|---|---|
| `PACKAGE_ID` | `PROMUEVE_FH_EVALUATION_20260807` |
| `CURRENT_GIT_HEAD` | `46e1f3c5923d5d195bb679d2f31ec56028b8f5f9` |
| `LAST_FUNCTIONAL_HEAD` | `fb7b70c50c991baf6a375b42112048d190fe0178` |
| Rama candidate | `work/fh-evaluation-package-01-20260807` |
| Fecha de generación | `2026-08-07T04:19:24+02:00` |
| Datos | `SYNTHETIC_DATA_ONLY = YES` |
| Uso | Evaluación funcional externa sintética; no piloto, no producción |
| Estado | `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION` |

## 1. Trazabilidad funcional

| Capacidad | Issue / PR | Estado publicado |
|---|---|---|
| Estadísticas raw | issue #257 / PR #258 | Integrada antes del HEAD funcional vigente |
| Quick View raw PROMs | issue #261 / PR #262 | Integrada antes del HEAD funcional vigente |
| Patient Longitudinal raw | issue #265 / PR #266 | Último cambio funcional, merge `fb7b70c50c991baf6a375b42112048d190fe0178` |
| Reconciliación post-Longitudinal | issue #267 / PR #268 | Merge documental `46e1f3c5923d5d195bb679d2f31ec56028b8f5f9` |

`CURRENT_GIT_HEAD` incluye documentación posterior. `LAST_FUNCTIONAL_HEAD` identifica el último merge que modificó código funcional. El package no modifica runtime.

## 2. Seis rutas versionadas

| Ruta | Estado |
|---|---|
| `docs/evaluation/FARMACIA_EVALUATION_GUIDE.md` | Creada |
| `docs/evaluation/FARMACIA_EVALUATION_CHECKLIST.md` | Creada |
| `docs/ops/FARMACIA_EVALUATION_READY_STATE_20260807.md` | Creada |
| `docs/INDEX.md` | Actualizada |
| `docs/ops/WORK_ORDER_STATUS.md` | Actualizada |
| `docs/ops/FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md` | Actualizada |

## 3. Workbooks externos

Los artefactos están fuera de Git en `/srv/kairos-lab/outbox/promueve-fh-evaluation-20260807/`.

| Fichero | Tamaño | SHA-256 | Columnas / población |
|---|---:|---|---|
| `PROMueve_FH_EVALUATION_PATIENT_FLOW.xlsx` | 78655 bytes | `fc934b00ec0320c29ddad22eed5f470a7f4fd953ee689e1253c86c9b5e62927f` | 152 columnas; 2 pacientes; 8 filas raw |
| `PROMueve_FH_EVALUATION_STATISTICS.xlsx` | 377390 bytes | `be17bbb428e79ce7d63788b773998ce34388c17eb84547a50985387b8cda379f` | 152 columnas; 55 pacientes; 58 filas raw |

### Provenance Patient Flow

- Source checker: `tools/farmacia_longitudinal_raw_browser_check.mjs`.
- Source checker Git blob SHA: `e8d98a489070edccb1608f4a1aca348bfdc49dc4`.
- Construcción: ejecución externa de la función `workbookBuffer()` sin modificar el checker ni su corpus.
- Corpus: `CIP-LONGITUDINAL-A` y `CIP-LONGITUDINAL-B`, exactamente como los define el checker.
- `CURRENT_GIT_HEAD = 46e1f3c5923d5d195bb679d2f31ec56028b8f5f9`.
- `LAST_FUNCTIONAL_HEAD = fb7b70c50c991baf6a375b42112048d190fe0178`.
- `SYNTHETIC_DATA_ONLY = YES`.

### Reproducción ejecutable

Ejecutar desde la raíz del worktree con Node.js y las dependencias versionadas del repo. Estos comandos extraen y ejecutan la misma `workbookBuffer()` del checker; no crean otra fuente de verdad:

```bash
node -e "const {readFileSync,writeFileSync}=require('node:fs');const path=require('node:path');const {createRequire}=require('node:module');const ROOT=process.cwd();const req=createRequire(path.join(ROOT,'tools','extract.cjs'));const XLSX=req(path.join(ROOT,'vendor/sheetjs/xlsx.full.min.js'));req(path.join(ROOT,'scripts/farmacia_export_v2_core.js'));const core=globalThis.FarmaciaExportV2Core;const CIP_A='CIP-LONGITUDINAL-A';const CIP_B='CIP-LONGITUDINAL-B';const source=readFileSync(path.join(ROOT,'tools/farmacia_longitudinal_raw_browser_check.mjs'),'utf8');eval(source.slice(source.indexOf('function fixture'),source.indexOf('\nconst mime')));writeFileSync('/tmp/PROMueve_FH_EVALUATION_PATIENT_FLOW.xlsx',workbookBuffer());"
node -e "const {readFileSync,writeFileSync}=require('node:fs');const path=require('node:path');const {createRequire}=require('node:module');const ROOT=process.cwd();const req=createRequire(path.join(ROOT,'tools','extract.cjs'));const XLSX=req(path.join(ROOT,'vendor/sheetjs/xlsx.full.min.js'));req(path.join(ROOT,'scripts/farmacia_export_v2_core.js'));const core=globalThis.FarmaciaExportV2Core;const PATIENT_COUNT=55;const source=readFileSync(path.join(ROOT,'tools/farmacia_statistics_cutover_browser_check.mjs'),'utf8');eval(source.slice(source.indexOf('function fixture'),source.indexOf('\nfunction parseCsv')));writeFileSync('/tmp/PROMueve_FH_EVALUATION_STATISTICS.xlsx',workbookBuffer());"
sha256sum /tmp/PROMueve_FH_EVALUATION_PATIENT_FLOW.xlsx /tmp/PROMueve_FH_EVALUATION_STATISTICS.xlsx
```

Los SHA esperados son los registrados en la tabla anterior. La reproducción byte a byte fue PASS en el candidate.

### Provenance Statistics

- Source checker: `tools/farmacia_statistics_cutover_browser_check.mjs`.
- Source checker Git blob SHA: `0af7c6da68acfc56eadea13a62535368a762d404`.
- Construcción: ejecución externa de la función `workbookBuffer()` sin modificar el checker ni su corpus.
- Corpus: 55 pacientes (`PATIENT_COUNT = 55`), exactamente como los define el checker.
- `CURRENT_GIT_HEAD = 46e1f3c5923d5d195bb679d2f31ec56028b8f5f9`.
- `LAST_FUNCTIONAL_HEAD = fb7b70c50c991baf6a375b42112048d190fe0178`.
- `SYNTHETIC_DATA_ONLY = YES`.

## 4. Inicio y navegador

- Navegador demostrado: Chromium.
- Método: el coordinador inicia un servidor HTTP local sobre el source tree verificado y abre `farmacia_index.html` en un contexto limpio.
- La evaluación usa navegación visible y clicks reales. No usa mutación DOM, retirada de `hidden`, URLs directas para sustituir acciones, storage artificial ni fixtures imposibles.
- Estadísticas requiere permitir la ventana emergente abierta desde Inicio.

## 5. QA del candidate

| Gate | Resultado |
|---|---|
| Scope exacto de seis rutas | PASS |
| Apertura / 152 columnas / provenance workbooks | PASS |
| Patient Flow en contexto limpio | PASS |
| A → B → A | PASS |
| Quick View / Dashboard Paciente / Longitudinal | PASS |
| Statistics raw 55 / filtros / CSV 55x37 | PASS |
| `console.error` / `pageerror` | PASS (`0` / `0`) |
| Regresión mínima obligatoria | PASS: smoke 48/48; Reader 21/21; Selectors 82/82; Data Port 11/11; patient-flow 17/17; Dashboard Paciente 37/37; Longitudinal adapter; Statistics 30 escenarios; cuatro checkers Chromium |
| Guía seguida literalmente | PASS con contextos limpios y artefactos externos; recorridos oficiales equivalentes reproducidos byte a byte |
| Checklist usable sin datos reales | PASS |
| Revisión independiente read-only | APTO; recheck sin findings tras una ronda consolidada de correcciones mecánicas |

## 6. Límites vinculantes

- No contiene datos reales ni solicita su uso.
- No acredita piloto, producción, versión final, backend, integración corporativa ni persistencia longitudinal definitiva.
- Actividad del servicio permanece demo.
- Los nombres de fármaco no determinan dosis, vía, pauta, presentación, inducción ni duración.
- Solicitado no equivale a validado; tratamiento previo no equivale a nuevo inicio.
- Ausencia, `false` explícito y desconocido permanecen diferenciados.
- `active_at_event === true` es el único activo explícito.
- `no_change_recorded` y `not_recorded` no son movimientos; la suspensión solo es explícita.
- Los PROMs preservan `0` y `false` y no reciben interpretación automática.
- `absent` o `not_recorded` no resuelve un EA previo; la causalidad es solo explícita.

Todos los gates están en PASS y la revisión independiente es APTA. El estado del candidate es `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`; no equivale a piloto, producción ni autorización de publicación.
