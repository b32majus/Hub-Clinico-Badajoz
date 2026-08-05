# Índice documental maestro — Hub Clínico Badajoz / PROMueve Nexus

| Metadato | Valor |
|---|---|
| Última actualización | 2026-08-05 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama publicada Farmacia | `origin/recovery/farmacia-pr-replay-20260727` |
| HEAD regional publicado verificado | `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6` |
| Snapshot estable Cáceres | `CÁCERES-REVIEW-0.3` |
| Rama documental de esta edición | `work/doc-fh-post-dashboard-handoff-integration-reconciliation-01-20260805` |

> Este índice orienta. La verdad funcional procede del código publicado, el manifest del despliegue, el estado vivo y los contratos relacionados. No convierte propuestas arquitectónicas en capacidades implementadas.

> La PR que publique esta edición generará un merge SHA posterior. Por ello se registra la base Git de la edición y, por separado, el último SHA que modificó código funcional; el HEAD actual se verifica siempre en GitHub.

---

## 1. Lectura recomendada actual

1. [`docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md) — estado publicado actual, incluida la retirada del ledger, el workbook y el lector raw Bridge v2.
2. [`docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md`](/docs/ops/FARMACIA_PLAN_VACACIONES_20260731.md) — plan operativo 2026-07-31 a 2026-08-15.
3. [`docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`](/docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md) — secuencia vigente: WO6, WO8A-1, WO8A-2A-1 y WO8A-2A-2 integradas; WO7 candidate pausada y formularios/consumidores posteriores pendientes.
4. [`docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](/docs/DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md) — decisión vigente reconciliada con ledger retirado del runtime, workbook implementado y procesamiento longitudinal aún pendiente.
5. [`docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md`](/docs/ops/WO-FH-EXPORT-V2-CANONICAL-CORE-01.md) — core candidate `2.0.0-draft.1` integrado en recovery y visible desde PR #227 mediante Export v2 demo paralelo; no equivale a cutover.
6. [`docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01.md) — adaptador interno de Validación v2 integrado mediante PR #215.
7. [`docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md`](/docs/ops/WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01.md) — adaptador interno de Primera Visita v2 integrado mediante PR #217.
8. [`docs/ops/WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01.md`](/docs/ops/WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01.md) — adaptador interno de Seguimiento v2 integrado mediante PR #221.
9. [`docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md`](/docs/contracts/FARMACIA_EXPORT_V2_FOLLOWUP_ACTIVE_LINES_ADAPTER_CONTRACT.md) — contrato del adaptador interno de Seguimiento v2; integrado mediante PR #221.
10. [`docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](/docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md) — arquitectura objetivo V4 por planos.
11. [`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`](/docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md) — roadmap post-SES y relación V4/V4.5/V5.
12. [`AGENTS.md`](/AGENTS.md) — reglas operativas de agentes y Git.

Para ejecución y merges: [`docs/ops/WORK_ORDER_STATUS.md`](/docs/ops/WORK_ORDER_STATUS.md).

---

## 2. Orden de verdad

1. Instrucción o WO actual.
2. GitHub: código y documentación publicados.
3. Este índice.
4. `docs/ops/WORK_ORDER_STATUS.md`.
5. Documento vivo más reciente relacionado.
6. Documentos históricos y biblioteca.

Una rama, SHA, prioridad o PR recordados no son fuente de verdad sin verificación.

---

## 3. Ramas y referencias

| Rama / ref | Estado | Fuente de verdad para | No es fuente de verdad para |
|---|---|---|---|
| `origin/main` | Legacy / congelada | Historia previa a Reuma v2 | Estado actual |
| `origin/feature/reuma-v2-prebiologico-fh-les-sjogren` | Base canónica Reuma v2 | Reumatología y contrato Excel v2 | Farmacia recovery |
| `origin/recovery/farmacia-pr-replay-20260727` | **Rama regional publicada Farmacia** | Código Farmacia y snapshots hospitalarios | Piloto, producción o datos reales |
| `previews/caceres-fh/` | **Snapshot estable 0.3** | Evaluación Pharmacy-only Cáceres | Evolución regional automática |
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

## 4. Estado vivo de Farmacia

| Elemento | Estado actual |
|---|---|
| Rama | `recovery/farmacia-pr-replay-20260727` |
| HEAD regional publicado | `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6` |
| Activación funcional Export v2 demo | `fe84d83c7d3574840696c9fed70f98e581ec8916` (PR #227) |
| Retirada del ledger del runtime soportado | `b1ee11e00affa39c4a91626bb03f493fbcdce7d9` (PR #231), merge `19867ef16127548d0b596482360d8e5cbe6e54e5` |
| Workbook Excel Bridge Cáceres | `c286afab70c0e396f16378212e6e29cf56792064` (PR #233), publicado en la historia regional |
| WO8A-1 raw reader/read model | `7da866b205e509120bb2c7abc0a4efdf7341e659` (PR #238), `MERGED_AND_VERIFIED` |
| WO8A-2A-1 selectores + Quick View Bridge | PR #242, commits `3da3d450890508e7ee11ea7b801ad37ba4052cf5` + `94cd44688b82aea0a10e4778e3182ab300bd6be0`, merge histórico `e2c54583ccc5876058403c34a675496cab897972`, `MERGED_AND_VERIFIED` |
| WO8A-2A-2 handoff efímero + dashboard Bridge | Issue #245, PR #246, commits `fe28f21feb7cb58d57c639a7d52d85856b247108` + `7ebc482629e1e818a6227c8e8946cddd12ee113a`, merge/HEAD `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6`, `MERGED_AND_VERIFIED` |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.3` |
| Fuente funcional del snapshot | `815e16f9564c82f469a95745c5c6917593a8c3f0` |
| QA pública regional del HEAD actual | PR #246: handoff 37, selector 82, reader 21, smoke 48 y dashboard legacy 37 PASS; Actions SUCCESS; QA navegador soportada, padding E2E, aislamiento, popup bloqueado, fail-closed, legacy y Enfermería PASS; storage vacío, consola limpia y `pageerror = 0`; no equivale a piloto |
| QA humana Cáceres | PASS |
| Core Export v2 | Integrado en recovery; consumido internamente por los adaptadores de Validación, Primera Visita y Seguimiento |
| Validación v2 | Export v2 demo paralelo visible mediante interacción soportada desde PR #227 |
| Primera Visita v2 | Export v2 demo paralelo visible; adaptador `1..N` por líneas explícitas aunque la UI actual pueda mostrar una |
| Seguimiento v2 | Export v2 demo paralelo visible; `1..N`, una fila por línea explícitamente activa |
| Export v2 demo paralelo | TSV común de 152 columnas: Validación 1 fila; Primera Visita/Seguimiento `1..N`; `unknown/stale` bloquea solo v2 |
| Ledger clínico en runtime | Retirado de Validación, Primera Visita y Seguimiento; módulo histórico permanece versionado y desacoplado |
| `sessionStorage` | El Bridge raw v2 no lo usa; imports legacy y snapshots anteriores aún pueden usarlo como deuda separada |
| Excel Bridge | Workbook operativo creado y verificado: `01_DERMA`, `03_DIGESTIVO`, 152 columnas y 16 shells técnicos vacíos |
| Lector raw v2 / read model | Integrado; lee `01_DERMA` y `03_DIGESTIVO`, valida 152 columnas y preserva `1..N` solo en memoria de la página |
| Quick View Bridge | Integrada, cableada, visible y demostrada mediante interacción soportada dentro de `farmacia_index.html`; exige `identifier_system` + `identifier_value` y resuelve `patient_id` técnico |
| Office Script / tablas relacionales | Candidate de WO7 publicado y pausado por gate Microsoft Office Scripts real; no integrado |
| Handoff efímero | Integrado desde la Quick View al dashboard Bridge mediante `window.open + postMessage` same-origin, READY y payload one-shot |
| Dashboard Bridge | Consumidor de lectura conectado, visible y demostrado mediante interacción soportada; renderer separado del dashboard legacy |
| Formularios Bridge / estadísticas / actividad | Validación, Primera Visita, Seguimiento, exportaciones y Estadísticas pendientes; Actividad del servicio diferida |
| `APP_*` / Read Adapter / roundtrip | Pendientes; no son consumidores del read model todavía |
| Cutover completo / retirada v1 | No; aplazados |
| Salida pública v1 | Preservada (61 columnas) |
| `main` | No modificada |
| Datos | Exclusivamente sintéticos |
| Piloto real | No |

> Reconciliación histórica post-PR #238: el HEAD regional publicado era `92c00eb7...`. PR #242 integró posteriormente WO8A-2A-1: selectores y Quick View Bridge v2 dentro de `farmacia_index.html`. El flujo exige sistema y valor explícitos, no usa fallback demo ni alta guiada con Bridge activo, conserva actos `1..N`, líneas solo por `line_id` explícito y valores `true`, `false`, `0`, `""` y `null`; solicitud y validación siguen separadas. Enfermería permanece independiente.

> El guard P1 rechaza `IDENTIFIER_COMPONENT_EMPTY`, `IDENTIFIER_COMPONENT_TYPE`, `NORMALIZED_IDENTIFIER_COLLISION`, `IDENTIFIER_NOT_INDEXED` e `IDENTIFIER_INDEX_PATIENT_MISMATCH`, comprueba coherencia bidireccional pacientes ↔ índice, usa lookup directo sobre tabla privada `Object.create(null)`, conserva sensibilidad a mayúsculas, permite pacientes sin identificador pero no buscables operativamente y no muta el read model. Evidencia publicada: selector checker 82 casos, reader checker 21 casos, smoke 48 checks, GitHub Actions SUCCESS, QA navegador y focal PASS, consola limpia, `pageerror = 0` y revisión independiente APTO.

> PR #246 conecta la Quick View con un dashboard Bridge de solo lectura en una ventana hija same-origin. La hija recibe únicamente `search_context` y la proyección Quick View, nunca el workbook ni el read model completos. El protocolo verifica `origin`, `source`, nonce y versión, espera `READY`, envía el payload una sola vez y aplica un TTL único de 45 segundos. La URL solo contiene el nonce técnico; no hay datos clínicos en URL ni browser storage. Recarga y acceso directo fallan cerrado, varias ventanas quedan aisladas y nunca aparece un paciente demo en modo Bridge.

> El dashboard Bridge usa un renderer separado del dashboard legacy: no adapta la proyección a paciente plano, no carga el dataset longitudinal demo, no interpreta PROMs o adherencia y no infiere tratamiento, actividad o causalidad. Formularios Bridge, estadísticas, actividad, Office Script integrado, tablas relacionales, `APP_*`, persistencia longitudinal, Read Adapter y roundtrip siguen pendientes. JARA, CSV y Excel v1 de 61 columnas permanecen intactos; no existe deploy automático, promoción del snapshot Cáceres, piloto ni producción.

Documento vivo reconciliado: [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260731.md).

El documento [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md`](/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260728.md) queda histórico y superseded como estado vivo; conserva la fotografía de `CÁCERES-REVIEW-0.1`.

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
- [`docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`](/docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md) — secuencia WO1–WO9 reconciliada; WO6, WO8A-1, WO8A-2A-1 Quick View y WO8A-2A-2 dashboard/handoff integradas; WO7 candidate pausada; formularios Bridge, `APP_*`, descomposición y roundtrip pendientes
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

*Edición reconciliada post-PR #246. WO8A-2A-2 está `MERGED_AND_VERIFIED`: la Quick View abre mediante interacción soportada un dashboard Bridge de solo lectura con handoff efímero, one-shot y sin storage. El read model y el workbook completos no salen de Inicio Farmacia. El candidato Office Script permanece pausado por gate real. Formularios Bridge, Estadísticas, Actividad, `APP_*`, Read Adapter, descomposición relacional, persistencia longitudinal, roundtrip, cutover completo, retirada v1 y promoción a `2.0.0` siguen pendientes. JARA, CSV y Excel v1 de 61 columnas permanecen preservados. `CÁCERES-REVIEW-0.3` no se promociona; no se autorizan piloto, datos reales, producción ni deploy.*
