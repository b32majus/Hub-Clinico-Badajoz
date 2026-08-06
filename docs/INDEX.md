# Índice documental maestro — Hub Clínico Badajoz / PROMueve Nexus

| Metadato | Valor |
|---|---|
| Última actualización | 2026-08-06 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama publicada Farmacia | `origin/recovery/farmacia-pr-replay-20260727` |
| HEAD regional publicado verificado | `a9d6d4645cb90818bbb432d33d07fe2db19f52ee` (merge issue #257 / PR #258) |
| `origin/main` verificado | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68` |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.3`, tree `81740136ce2b17572ba7851ef8d31dac4940a073` |
| Rama documental de esta edición | `work/doc-fh-post-stats-reconciliation-01-20260806` |

> Este índice orienta. Para Farmacia, la verdad funcional de esta edición es el código publicado en `a9d6d464...`, el issue #257 y la PR #258, junto con los issues/PR previos que integraron el flujo de paciente. Los documentos históricos no convierten propuestas arquitectónicas en capacidades implementadas.

> La PR que publique esta edición generará un merge SHA posterior. Por ello se registra la base Git de la edición y, por separado, el último SHA que modificó código funcional; el HEAD actual se verifica siempre en GitHub.

---

## 1. Lectura recomendada actual

1. [`docs/ops/FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md`](/docs/ops/FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md) — estado reconciliado después del issue #250 / PR #251, del issue #252 / PR #253 y del issue #257 / PR #258.
2. [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md) — publicación regional, evaluación sintética y snapshot Cáceres sin promoción automática.
3. [`docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`](/docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md) — secuencia histórica post patient-flow, subordinada al estado post-#258.
4. [`docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](/docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md) — decisión de persistencia temporal y evaluación; el estado publicado actual se concreta en #257/#258 y en este estado post-stats.
5. [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) — trazabilidad de WOs y PRs, con issue #250 / PR #251, issue #252 / PR #253 e issue #257 / PR #258 cerradas/publicadas.
6. [`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md) — plan anterior subordinado a la secuencia post patient-flow.
7. [`docs/farmacia_export_longitudinal_contract_WO8.md`](/docs/farmacia_export_longitudinal_contract_WO8.md) — contrato histórico y referencia secundaria para la evolución longitudinal.

Para ejecución y merges: [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md).

---

## 2. Orden de verdad

1. Issue/WO actual; en esta edición, issue #257 / PR #258.
2. GitHub: código publicado en `a9d6d464...` y estado real del issue #257 / PR #258, sobre el flujo integrado por #250/#251 y #252/#253.
3. Decisiones vinculantes del ciclo, subordinadas al estado publicado de #257/#258.
4. Este índice reconciliado.
5. `docs/ops/WORK_ORDER_STATUS.md` reconciliado.
6. [`docs/ops/FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md`](/docs/ops/FARMACIA_POST_PATIENT_FLOW_STATE_20260806.md).
7. Documentos históricos y biblioteca.

Una rama, SHA, prioridad o PR recordados no son fuente de verdad sin verificación.

---

## 3. Ramas y referencias

| Rama / ref | Estado | Fuente de verdad para | No es fuente de verdad para |
|---|---|---|---|
| `origin/main` | Legacy / congelada | Historia previa a Reuma v2 | Estado actual |
| `origin/feature/reuma-v2-prebiologico-fh-les-sjogren` | Base canónica Reuma v2 | Reumatología y contrato Excel v2 | Farmacia recovery |
| `origin/recovery/farmacia-pr-replay-20260727` | **Rama regional publicada Farmacia**, HEAD `a9d6d464...` | Código Farmacia y evaluación sintética | Piloto, producción o datos reales |
| `previews/caceres-fh/` | **Snapshot estable 0.3**, tree `81740136...` | Evaluación Pharmacy-only Cáceres | Evolución regional automática |
| `origin/preview/demo-lunes-wo4-20260614` | Histórico | Evidencia post-demo y documentación de origen | Desarrollo publicado vigente |
| `origin/docs/promueve-fh-control-plane-federado-20260713` | HOLD | Cantera histórica del concepto Control Plane | Arquitectura aprobada o rama a mergear |
| `origin/work/*`, `origin/docs/*` | Trabajo/revisión | WOs atómicas | Estado publicado sin merge |
| `origin/backup/*` y tags demo | Retorno | Recuperación de estados | Desarrollo activo |

### Reglas

- No tocar `main` sin autorización explícita.
- Reuma v2 y Farmacia permanecen separadas mientras siga vigente la decisión de no merge.
- El snapshot Cáceres solo cambia por promoción explícita desde un SHA regional aprobado.
- No editar manualmente `previews/caceres-fh/`.

---

## 4. Estado vivo de Farmacia post patient-flow

| Elemento | Estado actual |
|---|---|
| Rama | `recovery/farmacia-pr-replay-20260727` |
| HEAD regional publicado | `a9d6d4645cb90818bbb432d33d07fe2db19f52ee` (merge issue #257 / PR #258) |
| issue #250 / PR #251 | Data Port, `RawExcelDataSource` y `CurrentPatientSession` integrados; merge `de830803...` |
| issue #252 / PR #253 | Cutover del flujo normal publicado; merge histórico `3f7bf9bb...` con CI verde, superseded como HEAD regional por #257/#258 |
| issue #257 / PR #258 | Issue CLOSED; PR MERGED_AND_VERIFIED; Estadísticas raw publicadas para evaluación sintética; merge `a9d6d464...`; candidate `5a7ad559...` |
| Flujo clínico | Excel raw 152 columnas → reader/selectors → Data Port → sesión del paciente actual → Inicio/Quick View → dashboards → Validación → Primera Visita → Seguimiento |
| Modo Bridge visible | No existe como experiencia soportada; Bridge queda como nombre técnico de reader/selectors históricos |
| `sessionStorage` | Solo envelope versionado del paciente actual; no workbook, bytes, read model completo, población, cohorte ni otros pacientes |
| Excel Enfermería | Solo enriquece huecos explícitos; Farmacia raw mantiene precedencia |
| Estadísticas | RAW publicado para evaluación sintética; cohorte desde Data Port, handoff efímero y CSV completo de 37 columnas |
| Deuda post-checkpoint | `PREEXISTING_QUICKVIEW_P2` y `LONGITUDINAL_FULL_HISTORY_NOT_DEMONSTRATED`; pendientes, preexistentes y no regresiones de #258 |
| Actividad del servicio | Demo, contenido funcional no decidido y fuera de la siguiente WO técnica |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.3`, tree `81740136ce2b17572ba7851ef8d31dac4940a073`; intacto y sin promoción de PR #258 |
| `origin/main` | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68`; intacta |
| Datos / uso | Exclusivamente sintéticos; evaluación/demo funcional, no piloto ni producción |

> Los SHA de PR #238/#242/#246 y del merge previo de PR #253 que aparecen en secciones históricas no son el HEAD actual. El estado actual de Farmacia se verifica contra `a9d6d464...`, merge del issue #257 / PR #258, que conserva el flujo integrado por #250/#251 y #252/#253.

> El guard P1 rechaza `IDENTIFIER_COMPONENT_EMPTY`, `IDENTIFIER_COMPONENT_TYPE`, `NORMALIZED_IDENTIFIER_COLLISION`, `IDENTIFIER_NOT_INDEXED` e `IDENTIFIER_INDEX_PATIENT_MISMATCH`, comprueba coherencia bidireccional pacientes ↔ índice, usa lookup directo sobre tabla privada `Object.create(null)`, conserva sensibilidad a mayúsculas, permite pacientes sin identificador pero no buscables operativamente y no muta el read model. Para el candidate de #258, integrado en `a9d6d464...`, la evidencia es `LOCAL_CI_EQUIVALENT_PASS` sobre archive inmutable del SHA exacto: smoke 48/48, dashboard handoff 37/37, Selectors 82/82, Reader 21/21, Data Port 11/11, patient-flow 17/17, cohorte/CSV/handoff 30 escenarios, Chromium patient-flow y Estadísticas PASS, `console.error = 0`, `pageerror = 0` y `git diff --check = PASS`. GitHub Actions no despachó un run sobre el SHA final durante la incidencia externa.

> PR #246 queda como referencia técnica histórica del handoff. #252/#253 retiraron esa experiencia Bridge visible del flujo soportado y trasladaron la navegación al buscador CIP, Quick View y páginas clínicas normales.

> El runtime publicado conserva la no inferencia clínica: lo ausente permanece vacío, pendiente o no registrado; no se infieren principio activo, dosis, vía, pauta, tratamiento activo, adherencia, causalidad ni ausencia de EA. JARA, CSV y Excel v1 permanecen intactos; no existe deploy, promoción de Cáceres por #258, piloto ni producción.

Documento vivo reconciliado: [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md).

El documento [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md) queda histórico y superseded como estado vivo; conserva la fotografía de `CÁCERES-REVIEW-0.1`.

### Reconciliación común post patient-flow

- La sesión temporal usa `sessionStorage` únicamente para el envelope versionado del paciente actual: identificador explícito, `patient_id`, generación, proyección actual, provenance, borradores y `dirty`.
- Nunca se guardan en ese envelope el workbook, bytes, read model completo, población, cohorte ni otros pacientes. `localStorage` e IndexedDB no son almacenamiento clínico soportado y la sesión no es persistencia longitudinal definitiva.
- El reload permite continuar o empezar de cero; los borradores pertenecen solo al paciente actual y el cambio de CIP purga el contexto anterior antes de cargar otro.
- Excel Enfermería solo enriquece huecos explícitos. Farmacia raw conserva precedencia; la ausencia queda vacía, pendiente o no registrada y no se infiere información terapéutica.

### Estadísticas y Actividad

Estadísticas está publicada para evaluación sintética mediante el issue #257 / PR #258: el Excel de Farmacia se carga una sola vez en Inicio, la cohorte raw se construye desde el Data Port y se entrega mediante handoff efímero same-origin. La cohorte raw sustituye completamente la demo; el acceso directo o la recarga usa únicamente los 3 pacientes demo versionados. Filtros, KPIs, gráficos, tabla y paginación usan la cohorte activa. El CSV exporta la cohorte filtrada completa, con 37 columnas; las líneas activas usan solo `active_at_event === true`, `unknown` se separa de `false`, `no_change_recorded` no se presenta como movimiento, una suspensión explícita conserva estado, motivo y fecha efectiva, y el PROM del último acto conserva todas las mediciones simultáneas. No se almacena una cohorte clínica en storage. Actividad del servicio permanece demo, con definición funcional pendiente, no se cablea ahora y no bloquea el paquete de evaluación.

### Secuencia vigente post patient-flow

1. `WO-DOC-FH-POST-STATS-RECONCILIATION-01`
2. `WO-FH-RAW-QUICKVIEW-PROMS-01`
3. `WO-FH-RAW-PATIENT-LONGITUDINAL-CUTOVER-01`
4. `WO-FH-EVALUATION-PACKAGE-01`
5. Evaluación con farmacéuticas
6. Solo después, decidir evolución según feedback

Actividad del servicio continúa demo y no bloquea esta secuencia. No se anteponen Office Script, `APP_*`, PostgreSQL, Supabase, Identity Plane, V5 ni refactor general.

---

## 5. Plan y arquitectura V4

### Plan operativo

[`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md)

Define:

- entrega rápida del 2026-08-03;
- modelo canónico;
- Export Manager;
- Excel Bridge;
- roundtrip;
- Control Plane Supabase;
- CIMA;
- parsers;
- renovaciones;
- FHIR/openEHR;
- dependencias y WOs.

### Arquitectura objetivo

[`docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](/docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md)

Decisiones principales:

- `PROMueve Nexus` como plataforma provisional;
- `FarmaNEXus` como módulo Farmacia;
- V4 local-first y backend-ready;
- un Data Plane por hospital;
- Supabase solo para configuración no-paciente;
- CIMA oficial versionado en GitHub;
- Identity Plane físico diferido hasta servidor/PROM Gateway automatizado;
- cardinalidad por acto: Validación genera 1 fila; Primera Visita `1..N` por líneas explícitamente presentes; Seguimiento `1..N` por líneas explícitamente activas;
- modelo canónico como fuente de Excel, JARA, FHIR y openEHR;
- V5 agnóstica diferida.

---

## 6. Documentos canónicos generales

| Documento | Estado | Uso |
|---|---|---|
| [`AGENTS.md`](/AGENTS.md) | Vigente con metadata histórica pendiente de alinear | Gobernanza operativa |
| [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md) | Vigente | Trazabilidad de WOs y PRs |
| [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) | Propuesta canónica + addendum 2026-07-31 | Evolución post-SES |
| [`docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md`](/docs/DECISION_NO_MERGE_REUMA_FARMACIA_POST_SES.md) | Vigente | Separación Reuma/Farmacia |
| [`docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md`](/docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md) | Vigente | Discovery Badajoz/Mérida |
| [`docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`](/docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md) | Vigente para DEC-001..019 | Decisiones históricas Reuma |
| [`docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md`](/docs/ops/PLAN_FORMACION_Y_DECISIONES_HUB_CLINICO_20260606.md) | Vigente | Aprendizaje y decisiones por fases |

---

## 7. Reumatología

Fuentes principales:

- [`docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`](/docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md)
- [`docs/CONTRATO_DATOS_REUMA_V2.md`](/docs/CONTRATO_DATOS_REUMA_V2.md)
- [`docs/PLAN_IMPLEMENTACION_REUMA_V2.md`](/docs/PLAN_IMPLEMENTACION_REUMA_V2.md)
- [`docs/RESUMEN_RELEASE_REUMA_V2.md`](/docs/RESUMEN_RELEASE_REUMA_V2.md)
- [`docs/CHECKLIST_E2E_CLINICO_V2.md`](/docs/CHECKLIST_E2E_CLINICO_V2.md)
- [`docs/VALIDACION_MANUAL_DEMO_V2.md`](/docs/VALIDACION_MANUAL_DEMO_V2.md)

El contrato ancho de Reuma no debe reutilizarse automáticamente como modelo V4 de Farmacia ni normalizarse sin WO específica.

---

## 8. Farmacia Hospitalaria

### Estado y ejecución

- [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md)
- [`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md)
- [`docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](/docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md)
- [`docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md) — reporte operativo de WO2 (Validación v2)
- [`docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md) — reporte operativo de WO3 (Primera Visita v2)
- [`docs/ops/WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01.md`](/docs/ops/WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01.md) — reporte operativo de WO4 (Seguimiento v2)
- Los planes históricos de recuperación PR replay y rescate V4 citados en ediciones previas no están publicados en la rama `recovery`; no se usan como estado vivo.
- [`docs/farmacia_wo_execution_protocol.md`](/docs/farmacia_wo_execution_protocol.md)

### Contratos

- [`docs/farmacia_data_contracts.md`](/docs/farmacia_data_contracts.md) — contrato regional actualizado por PR #193 con `CADA_3_SEMANAS`; incluido en la fuente funcional promovida a `CÁCERES-REVIEW-0.3`.
- [`docs/farmacia_treatment_data_contract.md`](/docs/farmacia_treatment_data_contract.md)
- [`docs/farmacia_export_longitudinal_contract_WO8.md`](/docs/farmacia_export_longitudinal_contract_WO8.md) — v3 reconciliada: fila común v2, Seguimiento por línea activa y Excel Bridge
- [`docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`](/docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md) — secuencia histórica y estado post patient-flow; flujo normal integrado; WO7 candidate pausada; Estadísticas raw/CSV superados como pendientes por #257/#258; `APP_*`, descomposición, Processor y roundtrip pendientes
- [`docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md`](/docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md) — core candidate `2.0.0-draft.1` integrado; Export v2 demo paralelo visible desde PR #227, sin cutover ni retirada v1
- [`docs/contracts/FARMACIA_EXPORT_V2_VALIDATION_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_VALIDATION_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Validación v2; integrado mediante PR #215
- [`docs/contracts/FARMACIA_EXPORT_V2_FIRST_VISIT_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_FIRST_VISIT_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Primera Visita v2; integrado mediante PR #217
- [`docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Seguimiento v2; integrado mediante PR #221
- El contrato de escenarios Farmacia V4 citado en ediciones previas no está publicado en `recovery`; su incorporación formal permanece pendiente.

### Historia y auditoría

- [`docs/farmacia_branch_manifest_20260614.md`](/docs/farmacia_branch_manifest_20260614.md) — inventario histórico extenso.
- [`docs/ops/audits/FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md`](/docs/ops/audits/FARMACIA_SCREEN_AUDIT_RECONCILIADA_POST_PR22_20260715.md)
- `docs/ops/FARMACIA_V0_3_*`, `FARMACIA_V0_4_*`, `FARMACIA_V0_5_*` — exploración histórica, no estado vivo.

---

## 9. Enfermería, PROMs e identidad

- [`docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md`](/docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md)
- [`docs/farmacia_enfermeria_excel_sintetico_gap_WO8.md`](/docs/farmacia_enfermeria_excel_sintetico_gap_WO8.md)
- [`docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`](/docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md)
- [`docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md`](/docs/architecture/IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md)

Decisión 2026-07-31: el Identity Plane físico no se implementa durante el ciclo de vacaciones. Se reservan identificadores e interfaz, pero se evita todo doble registro manual hasta disponer de servidor/PROM Gateway automatizado.

---

## 10. Treatment Lifecycle y renovaciones

- [`docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`](/docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md)

Reglas vigentes:

- renovación por línea;
- fechas confirmadas, verificadas y estimadas separadas;
- JSON define reglas, no las ejecuta;
- tareas, alertas y notificaciones son conceptos distintos;
- no marcar renovado por silencio;
- Presalud solo alimentará el motor desde campos reales verificados.

---

## 11. Catálogo CIMA y catálogo local

- [`docs/ops/FARMACIA_V0_3_CIMA_AUTOUPDATE_PLAN_20260607.md`](/docs/ops/FARMACIA_V0_3_CIMA_AUTOUPDATE_PLAN_20260607.md)
- [`docs/deuda-tecnica/cdc-001-cima-auto-update.md`](/docs/deuda-tecnica/cdc-001-cima-auto-update.md)

Estado real:

- CIMA oficial puede permanecer versionado en GitHub.
- El snapshot Cáceres usa el artefacto de junio de 2026.
- No existe todavía una Action mensual activa.
- La futura Action debe extraer, validar, generar diff y abrir PR revisable.
- El catálogo local especial no se sobrescribe al actualizar CIMA.

---

## 12. Backend, Control Plane e interoperabilidad

- [`docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](/docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md)
- [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md)
- [`ARCHITECTURE.md`](/ARCHITECTURE.md) — útil, pero desactualizado respecto a recovery.

Fronteras:

- Excel Bridge: datos clínico-operativos por hospital.
- Supabase: configuración no-paciente.
- Identity Plane: servidor local futuro.
- FHIR/openEHR: adaptadores del modelo canónico, no conversión directa del Excel.
- V5: diferida.

---

## 13. Deuda documental abierta

Requiere WO posterior, sin mezclarla con quick wins clínicos:

| Documento | Deuda |
|---|---|
| `README.md` | Presenta Farmacia como no implementada |
| `ARCHITECTURE.md` | Baseline, ramas y persistencia Farmacia desactualizados |
| `CHANGELOG.md` | No recoge la línea recovery reciente |
| `AGENTS.md` | Metadata/rama base histórica; verificar arnés real antes de editar |
| `docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md` | Modelo operativo antiguo |
| `opencode.jsonc` | No existe en recovery; verificar entorno VPS antes de afirmar el arnés efectivo |
| Planes históricos PR replay/rescate V4 | Referenciados previamente, pero sus archivos no están publicados en recovery |
| Contrato de escenarios Farmacia V4 | Referenciado previamente, pero no publicado en recovery |

---

## 14. Documentos históricos / no usar como estado vivo

- [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md) — fotografía 0.1.
- [`docs/archive/CHANGELOG_20260307.md`](/docs/archive/CHANGELOG_20260307.md)
- [`docs/archive/ESTADO_IMPLEMENTACION_20260307.md`](/docs/archive/ESTADO_IMPLEMENTACION_20260307.md)
- [`docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md`](/docs/archive/CONTRATO_DATOS_UNIFICADO_LEGACY.md)
- ramas nocturnas/demo antiguas sin merge.

Para el estado actual de Farmacia también son memoria histórica o referencia secundaria, no fuente de estado vivo:

- `README.md`;
- `ARCHITECTURE.md`;
- `TODO.md`;
- `CHANGELOG.md`;
- `AGENTS.md`;
- documentos `FARMACIA_V0_3_*` y `FARMACIA_V0_4_*`;
- issues replay históricos abiertos de julio.

Cuando contradigan el merge #257/#258, el código publicado, este índice, `WORK_ORDER_STATUS.md` o el estado post-stats, prevalece esa cadena actual. La documentación histórica no se reescribe en esta WO.

---

## 15. Decisiones pendientes

| Tema | Estado |
|---|---|
| Formato Presalud | Solicitado, pendiente |
| Diccionario regional de patologías | Solicitado, pendiente |
| Formulario Digestivo | Pendiente |
| Consenso SEFH/PROs | Preparación por Silvia |
| Trigger HTML Power Automate | Pendiente de PoC |
| Servidor local por hospital | Disponibilidad comunicada en Badajoz/Mérida; diseño pendiente |
| Identity Plane físico | Diferido hasta servidor/PROM Gateway automatizado |
| Auth/permisos | Pendiente institucional |
| Arquitectura FHIR/openEHR SES | Pendiente institucional |
| Nomenclatura externa PROMueve Nexus/FarmaNEXus | Provisional |

---

*Edición reconciliada post patient-flow y post-#257/#258. El HEAD regional publicado es `a9d6d464...`; Estadísticas raw usa la cohorte del Data Port mediante handoff efímero y exporta CSV completo de 37 columnas para evaluación sintética. Quick View PROM raw y la historia longitudinal completa permanecen como deudas separadas; `CÁCERES-REVIEW-0.3` conserva su tree `81740136...`; no se autorizan datos reales, piloto, producción, promoción ni deploy.*
