# Farmacia — estado del paquete de evaluación sintética (freeze autónomo candidato)

| Metadato | Valor |
|---|---|
| `PACKAGE_ID` | `PROMUEVE_FH_CACERES_AUTONOMOUS_EVALUATION_20260807` |
| `CURRENT_PUBLISHED_HEAD_BEFORE_DOC_FREEZE` | `451d02361fc54cc01f493ca2a89192bde52d7fd9` |
| `LAST_FUNCTIONAL_HEAD` | `fb7b70c50c991baf6a375b42112048d190fe0178` |
| `EVALUATION_PACKAGE_MERGE` | `8bfceaaa956199610be9c0e6df40740a04b73699` |
| `SNAPSHOT_04_CANDIDATE` | `d9cbd56b515ee75c871bfb5e63f96320c963b1e0` |
| `SNAPSHOT_04_PUBLICATION_MERGE` | `9125518a74151010eaa2d48b913c5954fa54b8a1` |
| `MANIFEST_INTEGRITY_CANDIDATE` | `963bac71ffac4e2d6d088aeeb4d9abeaf8f5bad1` |
| `MANIFEST_INTEGRITY_MERGE` | `451d02361fc54cc01f493ca2a89192bde52d7fd9` |
| Snapshot | `CÁCERES-REVIEW-0.4` |
| Pages hosted | Construida sobre `451d0236`, sin errores |
| Rama candidate freeze | `work/fh-evaluation-autonomous-freeze-01-20260807` |
| `PACKAGE_CANDIDATE_STATE` | `FH_EVALUATION_AUTONOMOUS_FREEZE_CANDIDATE_PASS` |
| `DOC_FREEZE_CANDIDATE_SHA` | `<after commit>` |
| `DOC_FREEZE_MERGE_SHA` | `PENDING_OPERATOR_MERGE` |
| Merge / ZIP final | No realizado aún |
| Datos | `SYNTHETIC_DATA_ONLY = YES` |
| Uso | Evaluación funcional externa sintética autónoma; no piloto, no producción |
| `OPERATOR_DISTRIBUTION_APPROVAL` | `YES` |

> No se declara freeze externo final ni `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION` hasta que existan el merge del freeze documental + el manifest/ZIP definitivo con SHAs de publicación. Este documento describe el **candidate** del freeze, no el estado final.

## 1. Trazabilidad funcional

| Capacidad | Issue / PR | Estado publicado |
|---|---|---|
| Paquete de evaluación sintética | issue #269 / PR #270 | Merge `8bfceaaa956199610be9c0e6df40740a04b73699` |
| Snapshot Cáceres 0.4 | issue #271 / PR #272 | Candidato `d9cbd56b515ee75c871bfb5e63f96320c963b1e0`; merge publicación `9125518a74151010eaa2d48b913c5954fa54b8a1` |
| Integridad de manifest EOL | issue #273 / PR #276 | Candidato `963bac71ffac4e2d6d088aeeb4d9abeaf8f5bad1`; merge `451d02361fc54cc01f493ca2a89192bde52d7fd9` |
| Freeze autónomo de evaluación sintética | issue #277 / WO-FH-EVALUATION-AUTONOMOUS-FREEZE-01 | Candidate de este freeze; sin merge aún |

La cadena funcional evaluada permanece en `fb7b70c50c991baf6a375b42112048d190fe0178` (Patient Longitudinal raw), sobre el flujo integrado por #250/#251, #252/#253, #257/#258, #261/#262 y #265/#266. El paquete no modifica runtime.

## 2. Workbook maestro de Farmacia (único)

El paquete no distribuye workbooks paralelos. Existe **un único workbook evaluador de Farmacia**:

`/srv/kairos-lab/outbox/promueve-fh-single-workbook-20260807/PROMueve_FH_EVALUATION_FARMACIA.xlsx`

| Propiedad | Valor |
|---|---|
| SHA-256 | `9e477cdc70a75742d5b02bc03f9f9db53bd0a5307f6abf10f126bde7ae246e96` |
| Columnas | 152 |
| Filas raw | 95 |
| Eventos | 93 |
| Pacientes únicos | 55 |
| CIP longitudinal | `CIP-LONGITUDINAL-A` y `CIP-LONGITUDINAL-B` incluidos |

El mismo workbook cargado una sola vez alimenta Inicio, Quick View, Dashboard Paciente, Patient Longitudinal, Validación, Primera Visita, Seguimiento, Estadísticas y la exportación CSV. Estadísticas usa la misma cohorte (55) y el CSV sin filtros es 55 filas × 37 columnas. No se pide cambiar de workbook entre el flujo del paciente y Estadísticas.

Los ficheros históricos `PROMueve_FH_EVALUATION_PATIENT_FLOW.xlsx` y `PROMueve_FH_EVALUATION_STATISTICS.xlsx` quedan retirados como fixtures de QA históricos y **no** se distribuyen como bases de Farmacia para evaluadoras. No se regenera el workbook maestro.

### Evidencia E2E de un solo workbook

- 55 pacientes únicos;
- 93 eventos;
- 95 filas raw;
- CIP-LONGITUDINAL-A / B con secuencia A → B → A;
- un (1) loader de Farmacia;
- mismo Data Port;
- Estadísticas 55 desde la misma cohorte;
- CSV 55 × 37;
- gate hosted Cáceres PASS;
- `console.error` / `pageerror` = 0 / 0;
- sin mezcla raw/demo;
- seguridad clínica PASS.

## 3. Workbook de Enfermería (complementario)

Un único workbook sintético complementario de Enfermería, versionado:

`templates/enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx`

| Propiedad | Valor |
|---|---|
| Tamaño | 43826 bytes |
| SHA-256 | `88e0adf0f0a13d5fae873189cf67b535ff3ddab36197a4ea85415834868f29a9` |
| Hoja principal | Inicio biológico / Panel Enfermería |
| Solo sintético | Sí |
| Identificadores reales | No |
| Carga visible | Vía loader visible `Cargar Excel de Enfermería` |

Se carga por separado a través del loader visible de Enfermería; no reemplaza ni sobrescribe valores explícitos de Farmacia (Farmacia raw tiene precedencia; Enfermería solo enriquece huecos explícitos).

## 4. Inicio, navegador y acceso autónomo

- Navegador demostrado: Chromium / Chrome.
- Acceso autónomo desde la URL pública estable `https://b32majus.github.io/Hub-Clinico-Badajoz/previews/caceres-fh/`.
- Estadísticas se abre en una ventana nueva; se permiten las ventanas emergentes.
- La navegación visible de Estadísticas se inicia desde la superficie canónica `farmacia_index.html` para recibir la cohorte efímera de Farmacia.
- La actividad del servicio permanece demo.

## 5. QA del candidato

| Gate | Resultado |
|---|---|
| Scope exacto de seis rutas | PASS |
| Workbook maestro (152/95/93/55, CIP-A/B) | PASS; SHA verificado |
| Workbook Enfermería sintético + loader visible compatible | PASS |
| Smoke público final del candidato (hosted) | PASS |
| `console.error` / `pageerror` | PASS (`0` / `0`) |
| Sin datos reales | PASS |
| Revisión independiente read-only | APTO |

## 6. Límites vinculantes

- No contiene ni solicita datos reales de pacientes.
- No acredita piloto, producción, versión final, backend, integración corporativa ni persistencia longitudinal definitiva.
- Actividad del servicio permanece demo.
- Los nombres de fármacos no determinan dosis, vía, pauta, presentación, inducción ni duración.
- Solicitado no equivale a validado; tratamiento previo no equivale a nuevo inicio.
- Ausencia, `false` explícito y desconocido permanecen diferenciados.
- `active_at_event === true` es el único activo explícito.
- `no_change_recorded` y `not_recorded` no son movimientos; la suspensión solo es explícita.
- Los PROMs preservan `0` y `false` y no reciben interpretación automática.
- `absent` o `not_recorded` no resuelve un EA previo; la causalidad es solo explícita.

Candidato: `FH_EVALUATION_AUTONOMOUS_FREEZE_CANDIDATE_PASS`. El freeze externo definitivo solo se declarará tras merge verificado, manifest/ZIP final existente y aprobación de distribución humana. No equivale a piloto ni producción.
