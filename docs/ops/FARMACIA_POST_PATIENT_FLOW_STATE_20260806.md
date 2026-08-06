# Farmacia post patient-flow — estado vigente

> Documento de reconciliación documental de la WO #254. Describe el estado publicado y la secuencia inmediata; no crea un contrato clínico nuevo, no autoriza datos reales y no sustituye la revisión humana.

| Metadato | Valor |
|---|---|
| Fecha | 2026-08-06 |
| Issue vinculante | #254 `WO-DOC-FH-POST-PATIENT-FLOW-RECONCILIATION-01` |
| HEAD regional publicado | `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f` |
| Cambios funcionales incluidos | issue #250 / PR #251 e issue #252 / PR #253 |
| Datos autorizados | Exclusivamente sintéticos |
| Piloto / producción | No acreditados |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.3`, tree `81740136ce2b17572ba7851ef8d31dac4940a073` |

## 1. Estado publicado

El issue #250 y la PR #251 integraron el Data Port, `RawExcelDataSource` y `CurrentPatientSession`. El issue #252 y la PR #253 publicaron la navegación clínica normal posterior. La nomenclatura `Bridge` de PR #238/#242/#246 se conserva para trazabilidad técnica, pero no existe un modo Bridge visible soportado.

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

El estado actual de la fuente no es todavía el cutover raw:

- carga `data/demo/farmacia/farmacia_longitudinal_demo_v0_3.json`;
- genera 28 pacientes sintéticos reproducibles en JavaScript;
- concatena el JSON demo con esos pacientes;
- muestra el estado como pacientes sintéticos;
- el botón CSV/informe permanece en desarrollo.

Sin workbook raw, la demo es separada y claramente etiquetada y puede usar el JSON demo. Con workbook raw, Estadísticas usa únicamente la cohorte raw: sin JSON demo, sin `generateSyntheticPatients()`, sin 28 pacientes generados y sin mezcla raw/demo.

La siguiente unidad `WO-FH-RAW-STATISTICS-CUTOVER-01` debe cambiar la fuente a la proyección raw, conservar los filtros y habilitar el CSV de toda la cohorte filtrada, no solo de la página visible. El esquema exacto queda pendiente de esa WO; no debe rediseñar el dashboard ni convertir estadísticas en fuente de verdad.

## 5. Actividad del servicio

Actividad continúa siendo una pantalla demo. Lee el conjunto disponible de `FarmaciaDemo`, calcula tarjetas de actividad y puede mostrar etiquetas de fuente combinada, Excel Farmacia, Excel Enfermería o demo. No está cableada a la población raw completa, su definición funcional está pendiente, no se cablea ahora y no bloquea el paquete de evaluación; queda diferida fuera de la siguiente WO técnica.

## 6. Secuencia inmediata

1. `WO-DOC-FH-POST-PATIENT-FLOW-RECONCILIATION-01` — esta reconciliación documental.
2. `WO-FH-RAW-STATISTICS-CUTOVER-01` — fuente raw y CSV completo de cohorte filtrada.
3. `WO-FH-EVALUATION-PACKAGE-01` — paquete de evaluación sobre el flujo normal.
4. `APP_*`, `RelationalExcelDataSource`, `Processor` y roundtrip.
5. PostgreSQL/servidor local mediante el mismo Data Port.

Office Script, Identity Plane, Supabase, Actividad, V5 y refactor general no se anteponen a esta secuencia. Cada etapa requiere su propia autorización y evidencia.

## 7. Fuentes y precedencia documental

Para el estado actual prevalecen, en este orden:

1. Issue #254 y su work order aprobada.
2. Código publicado en `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f`.
3. issue #250 / PR #251 e issue #252 / PR #253.
4. Este documento, `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md`.
5. Decisión y contrato reconciliados del ciclo.
6. PR #238/#242/#246 y documentos anteriores como trazabilidad histórica.

`README.md`, `ARCHITECTURE.md`, `TODO.md`, `CHANGELOG.md`, `AGENTS.md`, documentos V0.3/V0.4 y issues replay antiguos no se reescriben en esta WO y no pueden contradecir silenciosamente este estado.

## 8. Límites

- No introducir datos reales de pacientes.
- No presentar la sesión temporal como persistencia longitudinal.
- No presentar Estadísticas o Actividad como población raw completa.
- No abrir un modo Bridge visible.
- No iniciar PostgreSQL, Identity Plane, Supabase, Office Script o refactor general antes de su posición en la secuencia.
- No modificar código funcional en esta ruta documental.
