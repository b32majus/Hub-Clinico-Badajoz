# Farmacia post patient-flow — estado vigente

> Documento de estado vivo posterior a la WO #254, actualizado tras el issue #257 / PR #258. Describe el estado publicado y la secuencia inmediata; no crea un contrato clínico nuevo, no autoriza datos reales y no sustituye la revisión humana.

| Metadato | Valor |
|---|---|
| Fecha | 2026-08-06 |
| Issue de origen / actualización | #254 `WO-DOC-FH-POST-PATIENT-FLOW-RECONCILIATION-01`; issue #257 CLOSED / PR #258 MERGED_AND_VERIFIED |
| HEAD regional publicado | `a9d6d4645cb90818bbb432d33d07fe2db19f52ee` |
| Cambios funcionales incluidos | issue #250 / PR #251, issue #252 / PR #253 e issue #257 / PR #258 |
| Datos autorizados | Exclusivamente sintéticos |
| Piloto / producción | No acreditados |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.3`, tree `81740136ce2b17572ba7851ef8d31dac4940a073`; intacto, sin promoción de #258 |

## 1. Estado publicado

El issue #250 y la PR #251 integraron el Data Port, `RawExcelDataSource` y `CurrentPatientSession`. El issue #252 y la PR #253 publicaron la navegación clínica normal posterior. El issue #257 y la PR #258 publicaron Estadísticas raw para evaluación sintética. La nomenclatura `Bridge` de PR #238/#242/#246 se conserva para trazabilidad técnica, pero no existe un modo Bridge visible soportado.

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

El estado publicado después de #257/#258 es:

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

### Hallazgos post-checkpoint

1. `PREEXISTING_QUICKVIEW_P2`: Quick View raw muestra actualmente el array de PROMs como `[object Object],...`. Es un hallazgo visual preexistente, no una regresión de #258, y queda para `WO-FH-RAW-QUICKVIEW-PROMS-01`.
2. `LONGITUDINAL_FULL_HISTORY_NOT_DEMONSTRATED`: el patient-flow no presenta regresión atribuible a #258, pero no está demostrada la reconstrucción completa de todos los seguimientos históricos, movimientos/cambios de tratamiento, cambios de pauta/dosis, fechas históricas completas de línea y actividad clínica raw. Queda para `WO-FH-RAW-PATIENT-LONGITUDINAL-CUTOVER-01`; no se afirma que Longitudinal esté corregido.

## 5. Actividad del servicio

Actividad continúa siendo una pantalla demo. Lee el conjunto disponible de `FarmaciaDemo`, calcula tarjetas de actividad y puede mostrar etiquetas de fuente combinada, Excel Farmacia, Excel Enfermería o demo. No está cableada a la población raw completa, su definición funcional está pendiente, no se cablea ahora y no bloquea el paquete de evaluación; queda diferida fuera de la siguiente WO técnica.

## 6. Secuencia inmediata

1. `WO-FH-RAW-QUICKVIEW-PROMS-01` — Quick View PROM raw.
2. `WO-FH-RAW-PATIENT-LONGITUDINAL-CUTOVER-01` — Patient Longitudinal raw.
3. `WO-FH-EVALUATION-PACKAGE-01` — paquete de evaluación.
4. Evaluación con farmacéuticas.
5. Solo después, decidir evolución según feedback.

Actividad continúa demo y no bloquea esta secuencia. Office Script, Identity Plane, Supabase, V5 y refactor general no se anteponen; cada etapa requiere su propia autorización y evidencia.

## 7. Fuentes y precedencia documental

Para el estado actual prevalecen, en este orden:

1. Issue #254 y su work order aprobada, como reconciliación de origen.
2. Código publicado en `a9d6d4645cb90818bbb432d33d07fe2db19f52ee`, merge del issue #257 / PR #258.
3. issue #250 / PR #251, issue #252 / PR #253 e issue #257 / PR #258.
4. Este documento, `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md`.
5. Decisión y contrato reconciliados del ciclo.
6. PR #238/#242/#246 y documentos anteriores como trazabilidad histórica.

`README.md`, `ARCHITECTURE.md`, `TODO.md`, `CHANGELOG.md`, `AGENTS.md`, documentos V0.3/V0.4 y issues replay antiguos no se reescriben en esta WO y no pueden contradecir silenciosamente este estado.

## 8. Límites

- No introducir datos reales de pacientes.
- No presentar la sesión temporal como persistencia longitudinal.
- No presentar Estadísticas o Actividad como población clínica almacenada ni como piloto o producción.
- No abrir un modo Bridge visible.
- No iniciar PostgreSQL, Identity Plane, Supabase, Office Script o refactor general antes de su posición en la secuencia.
- No modificar código funcional en esta ruta documental.
