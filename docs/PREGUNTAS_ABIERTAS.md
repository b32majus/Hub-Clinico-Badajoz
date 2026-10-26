# PREGUNTAS ABIERTAS (27-10-2026)

Lo que **no se puede resolver técnicamente**: falta una fuente, una decisión clínica o del equipo. Una línea por pregunta, con quién debe responder. Los agentes no las contestan por inferencia.

## Reconciliación 03-10 (OCT-OPEN)
Fuente: `docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`.

| ID | Pregunta | Quién responde |
|---|---|---|
| OCT-OPEN-001…003 | Ventana, frecuencia y destinatario de las recogidas pendientes | Equipo FH Cáceres |
| OCT-OPEN-004 | ¿La primera dispensación de un add-on va en Primera Visita o en Seguimiento? | Equipo FH |
| OCT-OPEN-005 | Eccema de manos | Dermatología |
| OCT-OPEN-006 | Lista de biosimilares | Farmacia |
| OCT-OPEN-007 | Qué variaciones entre Badajoz y Mérida se configuran | Sil, tras las revisiones de proceso |
| OCT-OPEN-008 | Alcance del Control Plane / form-builder | Sil (Freeze: diferido) |
| OCT-OPEN-010…013 | Renovaciones: duración, suspensión, organización por lotes, precedencia de `valid_until` | Farmacia + Enfermería |

## Renovaciones
REN-OPEN-001…008: ver `docs/architecture/TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md` y `docs/contracts/FARMACIA_RENEWAL_HANDOFF_CONTRACT.md`.

## Clínicas de Reuma
- **PCR por hospital:** valores que constan como autoridad de Sil (Badajoz mg/dL; Mérida y Cáceres mg/L). Falta contrastarlos con una fuente versionada.
- **BASFI:** faltan ítems y fórmula autorizados.
- **LES y Sjögren:** lo decide el equipo clínico.

## Etiquetas de puntuación del Quick View (hallazgo 26-10)
- **DLQI:** el Quick View usa «Muy grave» (11–20) y «Extremadamente grave» (>20); la revisión de Sil del 14-07 fija 11–20 «Efecto grave» y 21–30 «Efecto muy grave». Los dashboards sí usan los cortes de Sil. Decide Sil.
- **IHS4 y HAQ:** cortes por confirmar con Dermatología/Farmacia contra una fuente citada (no confirmados en esta sesión).
- Solo afecta a la etiqueta visual de la ficha rápida; datos sintéticos.

## Farmacia
- Neoplasias en pacientes con biológicos (petición de Cáceres, 11-06): 6 preguntas clínicas abiertas.
- Comorbilidades y actividad clínica en la cohorte raw.
- Nomenclatura SES de programas FH (SIL-REV-001): falta la fuente.
- Medicación especial (ensayo, compasivo, extranjera; SIL-REV-020): requiere discovery.
- «Revisión de línea» en el tipo de movimiento de Seguimiento: Sil pidió eliminarla o redefinirla; sin decisión de redefinición.

## EA
- Decidido el 27-10: se cierra «EA v1 demo» (ver `docs/DECISIONES.md`).
- Continuidad/recurrencia (T02/T03) y exportación longitudinal: se piden después, con uso real.
- Perfiles FHIR/openEHR: decisión del SES. FEDRA: autorización SES/AEMPS.

## Infraestructura (SES)
- Elección entre rutas A/B1/B2/C y qué permisos concede SESATIC (Power Automate HTTP bloqueado por Premium en el entorno de prueba del 17-09).
- Farmatool/Presalud: versión, API y permisos.

## Documentación
- Dos referencias de la plantilla Derma→FH (`D17_EXT_V1` fuera del repo y la «HISTORICAL_REFERENCE» de #501 que no está en el repo): ¿cuál es la última?

## Cómo mantenerlo
Al responder una pregunta, moverla a `docs/DECISIONES.md` con la fecha y quién respondió. No borrar la fila: marcarla `RESUELTA → ver DECISIONES`.
