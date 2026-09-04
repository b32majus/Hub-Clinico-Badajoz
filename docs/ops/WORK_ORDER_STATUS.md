# Work Order Status — Hub Clínico Badajoz / PROMueve Nexus

**Última actualización:** 2026-09-04
**Propósito:** Tablero de estado y trazabilidad de work orders ejecutadas
**Mantenedor:** Cora / Hermes PM; actualizar al cambiar el estado real de una WO

---

## Estado publicado actual de Farmacia

| Elemento | Valor |
|---|---|
| Rama regional | `recovery/farmacia-pr-replay-20260727` |
| Estado publicado | `827163d8c0d4eafb8af235da9a97aa4338a8141f` (merge freeze documental issue #277 / PR #278) |
| Último HEAD funcional | `fb7b70c50c991baf6a375b42112048d190fe0178` (merge funcional issue #265 / PR #266) |
| issue #257 / PR #258 | Issue CLOSED; PR `MERGED_AND_VERIFIED`; Estadísticas raw publicadas en el merge histórico previo `a9d6d464...` |
| Candidate Estadísticas | `5a7ad559549f6a1a059150c3ddd1ef8436121cb9` |
| Merge Estadísticas previo | `a9d6d4645cb90818bbb432d33d07fe2db19f52ee` |
| issue #261 / PR #262 | Issue CLOSED; PR `MERGED_AND_VERIFIED`; Quick View raw PROMs publicado y demostrado para evaluación sintética; merge histórico `f2b827fed26728e2103a9ebca1f4c524d28dfac3` |
| Candidate Quick View | `13963f89a28cd590e01ed0acaea160c93a9ec848` |
| Merge Quick View histórico | `f2b827fed26728e2103a9ebca1f4c524d28dfac3` |
| issue #265 / PR #266 | Issue CLOSED / completed; PR `MERGED_AND_VERIFIED`; Patient Longitudinal raw publicado y demostrado para evaluación sintética |
| Candidate Longitudinal | `a7b8deb7079d46603abcc1a3b1c86763a79bc410` |
| Merge Longitudinal publicado actual | `fb7b70c50c991baf6a375b42112048d190fe0178` |
| Activación funcional Export v2 demo | `fe84d83c7d3574840696c9fed70f98e581ec8916` (PR #227) |
| Retirada ledger runtime | `b1ee11e00affa39c4a91626bb03f493fbcdce7d9` (PR #231), merge `19867ef16127548d0b596482360d8e5cbe6e54e5` |
| Workbook Excel Bridge Cáceres | `c286afab70c0e396f16378212e6e29cf56792064` (PR #233) |
| WO8A-1 raw reader/read model | `7da866b205e509120bb2c7abc0a4efdf7341e659` (PR #238), `MERGED_AND_VERIFIED` |
| WO8A-2A-1 selectores + Quick View (Bridge histórico) | PR #242, commits `3da3d450890508e7ee11ea7b801ad37ba4052cf5` + `94cd44688b82aea0a10e4778e3182ab300bd6be0`, merge histórico `e2c54583ccc5876058403c34a675496cab897972`, `MERGED_AND_VERIFIED` |
| WO8A-2A-2 handoff efímero + dashboard Bridge | Issue #245, PR #246; capacidad histórica conservada, no modo visible soportado actual |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.4`, candidate `d9cbd56b515ee75c871bfb5e63f96320c963b1e0`, merge publicación `9125518a74151010eaa2d48b913c5954fa54b8a1` (issue #271 / PR #272); integridad de manifest `963bac71ffac4e2d6d088aeeb4d9abeaf8f5bad1`, merge `451d02361fc54cc01f493ca2a89192bde52d7fd9` (issue #273 / PR #276) |
| SHA fuente snapshot | `815e16f9564c82f469a95745c5c6917593a8c3f0` (histórico; base funcional del snapshot publicado) |
| QA pública regional del HEAD actual | `LOCAL_CI_EQUIVALENT_PASS`; Reader `21/21`, Selectors `82/82`, Data Port `11/11`, patient-flow `17/17`, smoke `48/48`, Patient-flow Chromium, Quick View PROM Chromium, Estadísticas Chromium y Longitudinal raw Chromium PASS; cohorte de Estadísticas `30` escenarios PASS, raw `55` / CSV `55x37`; `console.error = 0`, `pageerror = 0`; no equivale a piloto |
| Excepción de CI de #258 | GitHub Actions no despachó un run sobre el SHA final durante una incidencia externa; se reprodujo localmente el workflow y los checkers focales desde un archive inmutable del candidate, con Node 20 y sin modificar el repo |
| QA humana Cáceres | PASS |
| Estado asistencial | Evaluación con datos sintéticos; no piloto ni producción |
| Documento vivo | [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](./FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md) |
| Plan vigente | [`FARMACIA_PLAN_VACACIONES_20260731.md`](./FARMACIA_PLAN_VACACIONES_20260731.md) |
| Estado post patient-flow | [`FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md`](./FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md) |
| Evaluation Package (issue #269) | [`FARMACIA_EVALUATION_READY_STATE_20260807.md`](./FARMACIA_EVALUATION_READY_STATE_20260807.md); package exclusivamente sintético, sin piloto ni producción |
| Freeze documental (issue #277 / PR #278) | `MERGED_AND_VERIFIED` dentro del alcance documental/freeze; estado final `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION` |
| Workbook Farmacia | `PROMueve_FH_EVALUATION_FARMACIA.xlsx` (único); SHA-256 `9e477cdc70a75742d5b02bc03f9f9db53bd0a5307f6abf10f126bde7ae246e96`; 152 columnas; 95 filas raw; 93 eventos; 55 pacientes |
| Workbook Enfermería | `enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx`; SHA-256 `88e0adf0f0a13d5fae873189cf67b535ff3ddab36197a4ea85415834868f29a9` |
| Manifest | `MANIFEST.txt`; SHA-256 `e7dfd827b32b5f982bbe1cb697d47e134eb2893754a0049985ca6e592aec1829` |
| ZIP | `PROMueve_FH_Caceres_Evaluacion_Autonoma_20260807.zip`; SHA-256 `f2d3eda693426db8fc3d7ff6323eb73f5c9cd8d544fe72ec5f18b8482bed1d43` |
| Work order actual | `WO-DOC-FH-EVALUATION-FINAL-RECONCILIATION-01` (issue #279); reconciliación documental final del freeze |

## Reconciliación post patient-flow, post-statistics, post-Quick View y post-Longitudinal

El issue #250 y la PR #251 integraron el Data Port, `RawExcelDataSource` y `CurrentPatientSession`; el issue #252 y la PR #253 publicaron el flujo normal sin modo Bridge visible. El issue #257 y la PR #258 publicaron Estadísticas raw para evaluación sintética en el merge histórico `a9d6d464...`, desde el candidate `5a7ad559...`. El issue #261 y la PR #262 publicaron Quick View raw PROMs en el merge histórico `f2b827fe...`, desde el candidate `13963f89...`. El issue #265 y la PR #266 publicaron Patient Longitudinal raw en el último HEAD funcional `fb7b70c50c991baf6a375b42112048d190fe0178`, desde el candidate `a7b8deb...`. El issue #269 y la PR #270 publicaron el paquete de evaluación sintética en el merge `8bfceaaa...` (desde el candidate inicial `a026549...`), el issue #271 y la PR #272 promovieron el snapshot `CÁCERES-REVIEW-0.4` en el merge `9125518a...` (desde el candidate `d9cbd56b...`), el issue #273 y la PR #276 estabilizaron el manifest del snapshot en el merge histórico `451d02361fc54cc01f493ca2a89192bde52d7fd9`, y el issue #277 y la PR #278 congelaron el freeze documental en el merge vigente `827163d8c0d4eafb8af235da9a97aa4338a8141f`, estado publicado actual:

```text
Excel raw → reader/selectors → Data Port → sesión del paciente actual
→ Inicio/Quick View → dashboards → Validación → Primera Visita → Seguimiento
```

- `sessionStorage` solo contiene el envelope versionado del paciente actual: identificador, `patient_id`, generación, proyección, datos explícitos, provenance, borradores y `dirty`.
- El envelope no contiene workbook, bytes, read model completo, población, cohorte ni otros pacientes; cambiar de CIP purga el contexto anterior.
- Farmacia raw tiene precedencia. Excel Enfermería solo enriquece huecos explícitos.
- Inicio/Quick View, dashboards y Validación, Primera Visita y Seguimiento normales están integrados.
- Excel de Farmacia se carga una sola vez en Inicio; la cohorte raw se construye desde el Data Port y llega a Estadísticas mediante handoff efímero same-origin.
- En Estadísticas, raw y demo son mutuamente excluyentes: la cohorte raw sustituye completamente la demo; acceso directo o recarga usa únicamente los 3 pacientes demo versionados.
- Filtros, KPIs, gráficos, tabla y paginación usan la cohorte activa. El CSV exporta la cohorte filtrada completa y tiene 37 columnas.
- Las líneas activas usan solo `active_at_event === true`; `unknown` se separa de `false`; `no_change_recorded` no se presenta como movimiento; una suspensión explícita conserva estado, motivo y fecha efectiva; el PROM del último acto conserva todas las mediciones simultáneas.
- No se almacena una cohorte clínica en storage.
- Actividad permanece demo, con definición funcional pendiente, no se cablea ahora, no bloquea el paquete de evaluación y queda diferida fuera de la siguiente WO técnica.
- La evidencia del merge es `LOCAL_CI_EQUIVALENT_PASS`: smoke Farmacia 48/48, dashboard handoff 37/37, Patient Selectors 82/82, Reader 21/21, Data Port 11/11, patient-flow 17/17, 30 escenarios de cohorte/CSV/handoff, Chromium patient-flow y Estadísticas PASS, `console.error = 0`, `pageerror = 0` y `git diff --check = PASS`.
- Los checkpoints posteriores concluyeron `PATIENT_FLOW_NO_REGRESSION`; `PREEXISTING_QUICKVIEW_P2` queda resuelto/publicado por #261/#262 y `LONGITUDINAL_FULL_HISTORY_NOT_DEMONSTRATED` queda resuelto/publicado por #265/#266.
- Quick View raw PROMs usa un renderer estructurado: elimina `[object Object]`, preserva `0` y `false`, muestra fecha solo cuando existe explícitamente y representa ausencias como `No registrado`; no aplica thresholds ni interpretación clínica. La demo permanece intacta y el cambio de CIP no mezcla PROMs.
- La evidencia específica de Quick View es `Reader 21/21 PASS`, `Selectors 82/82 PASS`, `Data Port 11/11 PASS`, `patient-flow 17/17 PASS`, smoke `48/48 PASS`, Patient-flow Chromium PASS, Quick View PROM Chromium PASS, `console.error = 0`, `pageerror = 0` y `git diff --check = PASS`. La revisión independiente read-only no encontró findings de producto ni scope drift.
- Patient Longitudinal raw (issue #265 / PR #266, candidate `a7b8deb...`, merge `fb7b70c...`) está implementado, publicado y demostrado para evaluación sintética. Usa `CurrentPatientSession` → `FarmaciaPatientFlowRuntime.getCurrentEnvelope()` → `explicit_data` → `FarmaciaLongitudinalRawAdapter` → dashboard Longitudinal. Reconstruye todos los actos disponibles de Primera Visita y Seguimiento, agrupa correctamente los actos multifila y conserva los snapshots explícitos por acto. `active_at_event` distingue activo explícito (`true`), no activo explícito (`false`) y no registrado (otro/ausente); muestra únicamente movimientos explícitos relevantes, excluye `no_change_recorded` y `not_recorded`, y diferencia `schedule_change`, `dose_change`, `dose_and_schedule_change`, `suspension` y `other`. No fabrica fechas terapéuticas ni sustituye `movement_effective_date` ausente por la fecha del acto; conserva PROMs históricos y simultáneos (incluidos `0` y `false`; fecha PROM solo si el propio PROM la contiene) y la historia explícita de adherencia; agrupa EA `present` explícito por identidad conservando updates; `absent`/`not_recorded` no se interpreta como resolución de un EA previo (la resolución solo se afirma por campos explícitos) y la causalidad es exclusivamente explícita. La actividad clínica raw permanece `[]` / No registrado porque el contrato actual no la estructura; la vista no aplica thresholds ni interpretación clínica automática y raw y demo no se mezclan. La evidencia de la batería local/Chromium es `LOCAL_CI_EQUIVALENT_PASS` (Longitudinal raw Chromium PASS, Reader 21/21, Selectors 82/82, Data Port 11/11, patient-flow 17/17, smoke 48/48, Dashboard Paciente 37/37, Quick View PROM Chromium PASS, Statistics 30 escenarios). Aparte, la evidencia hosted post-PR es el Farmacia smoke check #914 con conclusion `success`; la batería local/Chromium completa no debe confundirse con ese smoke hosted.
- El freeze documental del paquete de evaluación sintética (issue #277 / PR #278) quedó `MERGED_AND_VERIFIED` dentro del alcance documental/freeze en el merge `827163d8c0d4eafb8af235da9a97aa4338a8141f`, estado publicado actual. El paquete es final: `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`. Es un **único workbook** de Farmacia (55 pacientes / 93 eventos / 95 filas / 152 columnas), Estadísticas usa el mismo Data Port (55) y Activity permanece demo. No equivale a piloto ni producción.
- Secuencia inmediata: el paquete de evaluación sintética está en estado final `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION` → evaluación externa con farmacéuticas → decidir evolución según feedback. Patient Longitudinal está publicado; no se abre una nueva capacidad funcional en esta etapa.

---

## FH_UNIFIED_CLINICAL_INTAKE_V0 — ticket train aprobado para ejecución (dependency-gated)

> Registrado 2026-09-04. El spec y el ticket train completaron SPEC audit, TICKET/HANDOFF audit, reparación focal y recheck focal independiente. El parent #292 está aprobado explícitamente por la operadora para ejecutar el tren auditado. Los tickets #293–#302 están `status:approved` + `ready-for-agent`; T1 #293 y T2 #294 son roots actualmente desbloqueadas y T3–T10 permanecen dependency-gated hasta sus checkpoints predecesores. Este registro vive en `work/hermes/fh-unified-clinical-intake-brief`; NO representa implementación, publicación en recovery, demo/pilot-ready ni autorización de merge.

| Elemento | Valor |
|---|---|
| Parent spec | [`../specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md`](../specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md) |
| Spec checkpoint | `dff7489931cc41ce658de90b1616c2852204b5da` (rama `work/hermes/fh-unified-clinical-intake-brief`; tree `2d8c6bf6a9b077ee0e6191f7724cf983e4fc60ae`) |
| Parent issue | [#292 — PLAN-FH-UNIFIED_CLINICAL_INTAKE-V0](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/292) — `status:approved`; `MERGE AUTHORIZED = NO` |
| Ticket train | T1 #293 · T2 #294 · T3 #295 · T4 #296 · T5 #297 · T6 #298 · T7 #299 · T8 #300 · T9 #301 · T10 #302 |
| Estado spec | `PASS` — `SPEC_REPAIR=PASS`; rechecks independientes Omen `PASS`, Muse `PASS`; `SPEC_CONTENT=CLOSED` |
| Handoff audit | `BLOCK` — Muse independent clean-context TICKET/HANDOFF audit (inicial) |
| Repair | `PASS` — [#299](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/299) (2026-09-04) |
| Focal recheck | `PASS` — independent clean-context focal recheck |
| Findings | `F-001 = CLOSED`; `F-002 = CLOSED` |
| Technical handoff | `PASS` |
| Authority consistency | `PASS` — #292 operator-approved for execution of the audited train |
| Ejecución | `READY_FOR_AGENT=YES`; T1 #293 + T2 #294 = root frontier desbloqueada; T3–T10 = dependency-gated; `IMPLEMENTATION_STARTED=NO` en este checkpoint; `MERGE_AUTHORIZED=NO` |
| Estado clínico | Desarrollo sintético/demo únicamente; NO PILOTO; NO PRODUCCIÓN |

Notas de autoridad del train:

- #292 es la autoridad ejecutiva del Unified Clinical Intake V0 auditado. #283 permanece como autoridad histórica/paralela acotada al fast-track PreSalud y no es necesaria como autoridad amplia del train.
- T1–T10 = `AUTHORIZED_BY_APPROVED_PARENT_292`; cada ticket conserva sus propios `BLOCKED_BY` y solo entra en frontier cuando sus checkpoints predecesores estén aceptados.
- Los 10 tickets están enlazados como sub-issues nativos de #292. No se registraron relaciones nativas `blocked-by` en este train; el grafo durable vive en los cuerpos de los issues (T1 root, T2 root, T3←T2, T4←T2, T5←T3+T4, T6←T5, T7←T6, T8←T7, T9←T7, T10←T1+T8+T9) y fue aceptado por el Handoff Contract Gate.
- Cierre de dependencia según semántica Atenea D-024: checkpoint remoto duradero aceptado, no merge obligatorio por ticket.
- La reconciliación global del published HEAD / P1 permanece separada en PR #291; esta actualización no duplica ese alcance ni mueve recovery.

---

## Leyenda

| Símbolo | Estado |
|---|---|
| ✅ Merged | Incorporada a la rama base |
| ✅ MERGED_AND_VERIFIED | Fusionada en recovery y verificada en el alcance de su WO; la visibilidad vigente se consulta en el estado publicado superior |
| 📋 Ready for review | Publicada en rama de trabajo y pendiente de revisión/merge |
| 🔄 Superseded | Sustituida funcional o documentalmente por otra WO |
| 🟢 Validated | Validada en una candidata histórica no integrada |
| ✅ Completada | Trabajo finalizado sin merge aplicable |
| 📋 Draft | Borrador no apto para merge |
| ⏸️ Pausada | Detenida hasta decisión humana |
| 🔴 Bloqueada | No puede continuar sin resolver una incidencia |
| ❌ Descartada | No se ejecutará |

> Un merge técnico no demuestra por sí solo corrección funcional. Cuando la QA humana contradice los tests, el tablero refleja la adjudicación funcional real.

---

## Work orders

| WO | Título | Estado | Rama | Merge/Commit | Notas |
|---|---|---|---|---|---|
| **Preflight 1** | SSH GitHub + clonado | ✅ Merged | `feature/reuma-v2-prebiologico-fh-les-sjogren` | — | Preflight manual, sin WO formal |
| **Preflight 2** | Validación post-merge WO-001 | ✅ Merged | `feature/reuma-v2-prebiologico-fh-les-sjogren` | `f7e1083` | Pull `--ff-only` y verificación de gobernanza |
| **WO-001** | Gobernanza ejecutable | ✅ Merged | `work/hermes/wo-001-agent-governance` → `feature/...` | `f5177f7` → `f7e1083` | PR #2 |
| **WO-001b** | Refinar plantilla de reporte | ✅ Merged | `work/hermes/wo-001b-report-template-refinement` | `cf6f80...` | Incluida en PR #2 |

<!-- El resto del ledger histórico permanece sin cambios respecto al blob previo 073202f969078037141f06a56d9086665247456b. -->
