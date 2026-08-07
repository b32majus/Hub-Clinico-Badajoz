# Farmacia post Longitudinal — estado vigente

> Documento de estado vivo posterior a la WO #254, actualizado tras el issue #257 / PR #258, el issue #261 / PR #262, el issue #265 / PR #266, el issue #269 / PR #270, el issue #271 / PR #272 y el issue #273 / PR #276. Describe el estado publicado y la secuencia inmediata; no crea un contrato clínico nuevo, no autoriza datos reales y no sustituye la revisión humana.

| Metadato | Valor |
|---|---|
| Fecha | 2026-08-07 |
| Origen funcional | `WO-DOC-FH-POST-LONGITUDINAL-RECONCILIATION-01`; issue #267 / PR #268 |
| Actualización vigente de package | `WO-FH-EVALUATION-AUTONOMOUS-FREEZE-01`; issue #277 |
| Estado publicado pre-freeze documental | `451d02361fc54cc01f493ca2a89192bde52d7fd9` (merge issue #273 / PR #276) |
| Último HEAD funcional | `fb7b70c50c991baf6a375b42112048d190fe0178` (merge funcional issue #265 / PR #266) |
| Cambios funcionales incluidos | issue #250 / PR #251, issue #252 / PR #253, issue #257 / PR #258, issue #261 / PR #262, issue #265 / PR #266; paquete de evaluación por issue #269 / PR #270, snapshot 0.4 por issue #271 / PR #272 e integridad de manifest por issue #273 / PR #276 |
| Datos autorizados | Exclusivamente sintéticos |
| Piloto / producción | No acreditados |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.4`, candidate `d9cbd56b515ee75c871bfb5e63f96320c963b1e0`, merge `9125518a74151010eaa2d48b913c5954fa54b8a1`; integridad de manifest `963bac71ffac4e2d6d088aeeb4d9abeaf8f5bad1` / merge `451d02361fc54cc01f493ca2a89192bde52d7fd9` |

## 1. Estado publicado

El issue #250 y la PR #251 integraron el Data Port, `RawExcelDataSource` y `CurrentPatientSession`. El issue #252 y la PR #253 publicaron la navegación clínica normal posterior. El issue #257 y la PR #258 publicaron Estadísticas raw para evaluación sintética; el issue #261 / PR #262 publicó Quick View raw PROMs corregido; y el issue #265 / PR #266 publicó Patient Longitudinal raw. El issue #269 / PR #270 publicó el paquete de evaluación sintética (candidate `a026549...`, merge `8bfceaaa...`); el issue #271 / PR #272 promovió el snapshot `CÁCERES-REVIEW-0.4` (candidate `d9cbd56b...`, merge `9125518a...`); y el issue #273 / PR #276 estabilizó la integridad del manifest (candidate `963bac71...`, merge `451d0236...`). La nomenclatura `Bridge` de PR #238/#242/#246 se conserva para trazabilidad técnica, pero no existe un modo Bridge visible soportado.

La cadena funcional vigente es:

```text
Excel raw
→ reader/selectors
→ Data Port
→ sesión del paciente actual
→ Inicio/Quick View
→ dashboards
→ Validación
→ Primera Visita
→ Seguimiento
```

El Data Port expone lectura por identificador y por `patient_id`, proyección del paciente, eventos, solicitud/validación, visitas/líneas, PROMs, adherencia, efectos adversos/causalidad y proyección poblacional. Inicio/Quick View, dashboards y Validación, Primera Visita y Seguimiento normales están integrados. La fuente raw construye estas lecturas desde el read model en memoria y no es persistencia longitudinal. El proveedor FH-001/FH-004 de Export v2 paralelo queda como fixture técnico histórico para regresión, no como proveedor del patient-flow actual.

El modelo de evaluación Farmacia es **un único workbook** (`PROMueve_FH_EVALUATION_FARMACIA.xlsx`, 55 pacientes / 93 eventos / 95 filas / 152 columnas, CIP-LONGITUDINAL-A/B incluidos) que alimenta Inicio, Quick View, Dashboard, Longitudinal, Validación, Primera Visita, Seguimiento, Estadísticas y CSV; Estadísticas recibe la misma cohorte (55) y el CSV sin filtros es 55 × 37. El smoke hosted del single-workbook es PASS (`console.error = 0`, `pageerror = 0`). El paquete de evaluación es autónomo vía Pages (`https://b32majus.github.io/Hub-Clinico-Badajoz/previews/caceres-fh/`), en freeze candidato bajo el issue #277; los ficheros históricos del flujo de paciente y de Estadísticas quedan retirados como fixtures de QA históricos y no se distribuyen como bases de Farmacia.

## 2. Sesión temporal del paciente actual

La sesión usa `sessionStorage` únicamente para el envelope versionado `promueve.fh.currentPatientSession.v1` del paciente explícitamente seleccionado.

El envelope contiene exactamente:

- `version`;
- `identifier` con `identifier_system` e `identifier_value`;
- `patient_id`;
- `generation`;
- `patient_projection`;
- `explicit_data`;
- `provenance`;
- `drafts`;
- `dirty`.

No contiene workbook, bytes, read model completo, población, cohorte, otros pacientes, secretos, tokens ni credenciales. `localStorage`, IndexedDB, `window.name` y `BroadcastChannel` no son almacenamiento clínico soportado.

Al recargar, la profesional puede continuar o empezar de cero el paciente actual. Continuar conserva generación, paciente y borradores; reiniciar purga sesión y borradores. Al cambiar de CIP se exige resolver `dirty` y purgar de forma segura antes de cargar el siguiente. Los borradores están ligados a CIP, `patient_id` y generación. Esta sesión es temporal y no equivale a persistencia longitudinal definitiva.

## 3. Precedencia de fuentes

- Farmacia raw conserva la precedencia para los campos que aporta.
- Excel Enfermería solo enriquece huecos explícitos y no sustituye valores de Farmacia.
- Una ausencia permanece vacía, pendiente o no registrada; no se infieren dosis, vía, pauta, tratamiento activo, adherencia, causalidad ni otros hechos clínicos.
- El paciente actual se resuelve mediante identificador explícito y Data Port; esto no constituye un Identity Plane productivo.

## 4. Estadísticas

El dashboard de Estadísticas ya está diseñado y conserva filtros, KPIs, gráficos, tabla, paginación, estados vacíos, selección de subpoblación y el requisito de exportar la cohorte filtrada completa a CSV.

El estado publicado de Estadísticas después de #257/#258, en el merge histórico `a9d6d464...` previo a #261/#262, es:

- el Excel de Farmacia se carga una sola vez en Inicio;
- la cohorte estadística raw se construye desde el Data Port y llega mediante handoff efímero same-origin;
- raw sustituye completamente demo; el acceso directo o la recarga usa únicamente los 3 pacientes demo versionados;
- filtros, KPIs, gráficos, tabla y paginación usan la cohorte activa;
- la exportación CSV cubre la cohorte filtrada completa y tiene 37 columnas;
- las líneas activas usan solo `active_at_event === true`; `unknown` se separa de `false`;
- `no_change_recorded` no se presenta como movimiento;
- una suspensión explícita conserva estado, motivo y fecha efectiva;
- el PROM del último acto conserva todas las mediciones simultáneas;
- no se almacena una cohorte clínica en storage.
- QA del candidate: `LOCAL_CI_EQUIVALENT_PASS` sobre archive inmutable; GitHub Actions no despachó un run sobre el SHA final durante la incidencia externa.

La cohorte raw y la demo son mutuamente excluyentes. El dashboard no se rediseña ni se convierte en fuente de verdad clínica.

## 5. Quick View raw PROMs

El issue #261 y la PR #262 publicaron el renderer estructurado de PROMs en Quick View raw, con candidate `13963f89a28cd590e01ed0acaea160c93a9ec848` y merge `f2b827fed26728e2103a9ebca1f4c524d28dfac3`. El estado es implementado, publicado y demostrado para evaluación exclusivamente sintética:

- desaparece `[object Object]`;
- se preservan `0` y `false`;
- la fecha se muestra solo cuando existe explícitamente;
- el valor ausente se representa de forma segura como `No registrado`;
- no se aplican thresholds ni interpretación clínica;
- la demo permanece intacta y el cambio de CIP no mezcla PROMs.

La evidencia disponible incluye Reader `21/21 PASS`, Selectors `82/82 PASS`, Data Port `11/11 PASS`, patient-flow `17/17 PASS`, smoke `48/48 PASS`, Patient-flow Chromium PASS, Quick View PROM Chromium PASS, cohorte de Estadísticas con `30` escenarios PASS, Estadísticas Chromium PASS (`raw 55` / `CSV 55x37`), `console.error = 0`, `pageerror = 0` y `git diff --check = PASS`. La revisión independiente read-only no encontró findings de producto ni scope drift.

### Hallazgos post-checkpoint

1. `PREEXISTING_QUICKVIEW_P2`: hallazgo visual preexistente resuelto y publicado mediante #261/#262. Quick View raw usa un renderer estructurado, elimina `[object Object]`, preserva `0` y `false`, muestra fecha solo cuando existe explícitamente y representa ausencias como `No registrado`; no aplica thresholds ni interpretación clínica.
2. `LONGITUDINAL_FULL_HISTORY_NOT_DEMONSTRATED`: hallazgo histórico resuelto y publicado mediante #265/#266. El patient-flow no presentaba regresión atribuible a #258; la reconstrucción longitudinal completa quedaba sin demostrar. Tras #265/#266, Patient Longitudinal raw está implementado, publicado y demostrado con datos sintéticos para evaluación funcional sintética; no se acredita para piloto ni producción. La actividad clínica raw permanece `[]` / No registrado porque el contrato actual no la estructura, lo que no es una deuda pendiente de esta capacidad sino un límite contractual vigente.

## 6. Patient Longitudinal raw

El issue #265 y la PR #266 publicaron Patient Longitudinal raw, con candidate `a7b8deb7079d46603abcc1a3b1c86763a79bc410` y merge `fb7b70c50c991baf6a375b42112048d190fe0178`. El estado es implementado, publicado y demostrado para evaluación exclusivamente sintética; no está acreditado para piloto ni producción.

Cadena soportada:

```text
CurrentPatientSession
→ FarmaciaPatientFlowRuntime.getCurrentEnvelope()
→ explicit_data
→ FarmaciaLongitudinalRawAdapter
→ Dashboard Longitudinal
```

Comportamiento documentado:

- reconstruye todos los actos disponibles de Primera Visita y Seguimiento;
- agrupa correctamente los actos multifila;
- conserva snapshots explícitos por acto;
- `active_at_event`: `true` = activo explícito, `false` = no activo explícito, otro/ausente = no registrado;
- muestra únicamente movimientos explícitos relevantes y excluye `no_change_recorded` y `not_recorded`;
- diferencia `schedule_change` (Cambio de pauta explícito), `dose_change` (Cambio de dosis explícito), `dose_and_schedule_change` (Cambio de dosis y pauta explícito), `suspension` (Suspensión explícita) y `other` (Movimiento terapéutico explícito);
- no fabrica fechas terapéuticas ni sustituye `movement_effective_date` ausente por la fecha del acto;
- conserva PROMs históricos y simultáneos, incluyendo `0` y `false`; la fecha PROM solo se muestra si el propio PROM la contiene;
- conserva la historia explícita de adherencia;
- agrupa EA `present` por identidad explícita y conserva los updates;
- `absent`/`not_recorded` NO se interpreta como resolución de un EA previo; la resolución solo se afirma desde campos explícitos de resolución;
- la causalidad es solo explícita;
- la actividad clínica raw permanece `[]` / No registrado porque el contrato actual no la estructura;
- no aplica thresholds ni interpretación clínica automática a raw;
- raw y demo no se mezclan.

Navegación demostrada como interacción soportada con datos sintéticos:

```text
Inicio
→ carga Excel sintético
→ búsqueda CIP raw
→ Dashboard Paciente
→ Vista completa visible
→ click real
→ Dashboard Longitudinal raw
```

No se afirma que esta interacción demuestre piloto ni producción.

Evidencia:

- evidencia local / Chromium del candidate `a7b8deb7079d46603abcc1a3b1c86763a79bc410`: Longitudinal raw Chromium PASS, Reader 21/21 PASS, Selectors 82/82 PASS, Data Port 11/11 PASS, patient-flow 17/17 PASS, smoke 48/48 PASS, Dashboard Paciente 37/37 PASS, patient-flow Chromium PASS, Quick View PROM Chromium PASS, Statistics cohorte 30 escenarios PASS, Statistics Chromium PASS, raw 55 / CSV 55x37, A→B→A isolation PASS, `console.error = 0`, `pageerror = 0`, `git diff --check PASS`, revisión independiente read-only APTO.
- evidencia hosted post-PR: Farmacia smoke check #914, conclusion SUCCESS, head `a7b8deb7079d46603abcc1a3b1c86763a79bc410`.

La batería completa local/Chromium no se confunde con el smoke hosted #914 de GitHub Actions; son evidencias distintas y así se documentan.

## 7. Actividad del servicio

Actividad continúa siendo una pantalla demo. Lee el conjunto disponible de `FarmaciaDemo`, calcula tarjetas de actividad y puede mostrar etiquetas de fuente combinada, Excel Farmacia, Excel Enfermería o demo. No está cableada a la población raw completa, su definición funcional está pendiente, no se cablea ahora y no bloquea el paquete de evaluación; queda diferida fuera de la siguiente WO técnica.

## 8. Secuencia inmediata

1. Completar el freeze autónomo del paquete de evaluación sintética (issue #277 / `WO-FH-EVALUATION-AUTONOMOUS-FREEZE-01`); el candidate es `FH_EVALUATION_AUTONOMOUS_FREEZE_CANDIDATE_PASS` y el freeze externo definitivo queda pendiente de merge + manifest/ZIP final.
2. Evaluación con farmacéuticas mediante la guía, checklist y el workbook único Farmacia exclusivamente sintéticos del package; Estadísticas usa la misma cohorte y el CSV sin filtros es 55 × 37.
3. Solo después del feedback, decidir la evolución funcional posterior.

Patient Longitudinal está publicado. El paquete de evaluación (issue #269, merge `8bfceaaa...`) ha superado QA y revisión independiente; su snapshot `CÁCERES-REVIEW-0.4` (issue #271 / PR #272) y la integridad de su manifest (issue #273 / PR #276) están publicados en el estado pre-freeze `451d02361fc54cc01f493ca2a89192bde52d7fd9`. La presente WO orquesta el freeze autónomo candidato con seis rutas documentales, sin cambios funcionales. Su manifest canónico es [`FARMACIA_EVALUATION_READY_STATE_20260807.md`](./FARMACIA_EVALUATION_READY_STATE_20260807.md). Actividad continúa demo y no bloquea esta secuencia. Office Script, Identity Plane, Supabase, V5 y refactor general no se anteponen; cada etapa requiere su propia autorización y evidencia.

## 9. Fuentes y precedencia documental

Para el estado actual prevalecen, en este orden:

1. `WO-FH-EVALUATION-AUTONOMOUS-FREEZE-01` / issue #277, como autoridad actual para el estado del freeze del paquete de evaluación, el material sintético y los gates de publicación/freeze; no cambia funcionalidad.
2. `WO-FH-EVALUATION-PACKAGE-01` / issue #269 (merge `8bfceaaa...`), como paquete de evaluación publicado; `WO-FH-CACERES-EVALUATION-SNAPSHOT-04-01` / issue #271 / PR #272 y `WO-FH-CACERES-MANIFEST-EOL-INTEGRITY-01` / issue #273 / PR #276 como snapshot y manifest publicados.
3. `WO-DOC-FH-POST-LONGITUDINAL-RECONCILIATION-01`, como autoridad para el estado funcional post-Longitudinal reconciliado.
4. Código funcional publicado en `fb7b70c50c991baf6a375b42112048d190fe0178`, último HEAD funcional, merge del issue #265 / PR #266.
5. Cadena funcional previa: issue #261 / PR #262 (merge histórico `f2b827fa...`), issue #257 / PR #258 (merge histórico `a9d6d464...`), issue #250 / PR #251 e issue #252 / PR #253.
6. Este documento, `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md`.
7. Decisiones, contratos, PR #238/#242/#246 y documentos anteriores como trazabilidad secundaria.

`README.md`, `ARCHITECTURE.md`, `TODO.md`, `CHANGELOG.md`, `AGENTS.md`, documentos V0.3/V0.4 y issues replay antiguos no se reescriben en esta WO y no pueden contradecir silenciosamente este estado.

## 10. Límites

- No introducir datos reales de pacientes.
- No presentar la sesión temporal como persistencia longitudinal.
- No presentar Estadísticas o Actividad como población clínica almacenada ni como piloto o producción.
- No abrir un modo Bridge visible.
- No iniciar PostgreSQL, Identity Plane, Supabase, Office Script o refactor general antes de su posición en la secuencia.
- No modificar código funcional en esta ruta documental.
