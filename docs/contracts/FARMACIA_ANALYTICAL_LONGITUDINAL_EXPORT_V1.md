# Farmacia Hospitalaria — Exportación analítica longitudinal v1

**Estado: DECISIÓN FUNCIONAL APROBADA · PENDIENTE DE ESPECIFICACIÓN TÉCNICA E IMPLEMENTACIÓN · NO PILOTO.** 14-10-2026. WO documental [#773](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/773). Origen: decisión humana posterior al Train31 ([PR #770](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/770)). **No constituye una modificación de Pharmacy Act, Export V2 ni Estadísticas.**

Referencias: [alineamiento F4.4/Export V2](../architecture/PROMUEVE_NEXUS_SALIDA_AGNOSTICA_FH_V4_ALIGNMENT_20261012.md), [identidad técnica](FARMACIA_EXPORT_V2_TECHNICAL_CONTEXT_CONTRACT.md), [SIL-REV-018](../ops/audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md).

## 1. Resultado funcional fijado

Los filtros de Estadísticas de Farmacia **seleccionan pacientes**, no solo episodios. La futura descarga analítica será **un CSV longitudinal** que incluya **todos los actos farmacéuticos disponibles** de cada paciente seleccionado, incluso actos anteriores o posteriores que no cumplan individualmente el filtro. Por ejemplo, filtrar pacientes con EA grave no limita la exportación al acto del EA.

**Granularidad: una fila por acto farmacéutico × línea terapéutica explícitamente evaluada o comprendida en ese acto.**

| Acto registrado | Filas | Identidad |
| --- | --- | --- |
| Una línea evaluada | 1 | Acto y línea |
| Seguimiento con dos líneas evaluadas | 2 | Mismo ID de acto; dos IDs de línea |
| N líneas evaluadas | N | Un solo acto lógico |
| Sin líneas evaluadas registradas | 1 | Fila de acto sin línea ni tratamiento inventados |

No generar una fila por línea simplemente por aparecer como **activa, prescrita, dispensada, solicitada o histórica**: ninguno de esos estados acredita por sí solo evaluación en el acto. Si la fuente no distingue participación/evaluación, el mapping y la completitud quedan pendientes; no inferirlos.

## 2. Integridad estadística y clínica

Conservar, cuando existan y puedan acreditarse, identificadores con su ámbito correcto de **paciente, acto, línea, tratamiento, revisión y evento**, fechas, procedencia y variables clínicas pertinentes. La repetición de un bloque común del acto en varias filas **no duplica** el acto, los EA, los PROM, las mediciones ni las decisiones. Los conteos de pacientes y actos se hacen por ID único, nunca por filas exportadas.

Una observación de acto o paciente no se adjudica a cada línea por aparecer en filas repetidas; los datos de línea solo se atribuyen cuando la relación es explícita. No inventar dosis, vía, pauta, presentación, fecha, START/SWITCH/add-on, causalidad, validación, dispensación ni tratamientos activos. Distinguir solicitado, validado, dispensado y actual. Vacíos/desconocidos siguen como tales.

**Todo dato disponible** significa dato registrado que el futuro adaptador autorizado pueda extraer con trazabilidad; **no** asegura que la proyección raw actual incluya sexo, edad, comorbilidades, actividad clínica u otros campos faltantes. Si no se garantiza cobertura, declararla como incompleta.

## 3. Punto técnico todavía abierto

Un acto puede tener **varios EA, PROM u observaciones** con distinta relación paciente/acto/línea. La salida debe conservarlos sin pérdida silenciosa ni doble contabilización.

**PENDIENTE:** definir y comprobar cómo representar colecciones 0/1/N en **un único CSV estadísticamente utilizable** manteniendo la granularidad anterior. No queda aprobado por esta decisión ni empaquetar JSON en una celda, ni generar columnas variables, ni crear filas adicionales. La implementación exigirá un contrato de mapping, esquema, datos ausentes y casos sintéticos adversariales.

## 4. Frontera con contratos ya publicados

- **CSV de Estadísticas (37 columnas):** resumen poblacional actual, una fila por paciente y campos JSON. El Train31 prueba igualdad de la cohorte filtrada, **no** exportación longitudinal completa. No modificarlo ahora.
- **Export V2 (152 columnas):** proyección tabular para transferencia/Bridge, con cardinalidades y limitaciones propias. No equivale a portador íntegro F4.4 ni a la salida analítica aprobada. En V2, Validación es 1 fila, Primera Visita 1..N y Seguimiento 1..N según su contrato; esta decisión no lo cambia.
- **Pharmacy Act v1 (F4.4):** contrato puro de acto con `payload.lines` 0/1/N. Que exista no demuestra que todas las pantallas lo escriban o que la totalidad de actos históricos sea recuperable. Un acto sin líneas requiere una fila analítica sin inventar terapia; V2 tabular actual no admite necesariamente ese caso.

## 5. Criterios para una futura WO técnica

Con datos **sintéticos** demostrar: cohorte filtrada → **todos** los actos disponibles de esos pacientes; 1 y 2 líneas evaluadas → 1 y 2 filas con identidad correcta; acto sin líneas → una fila sin línea; varios EA/PROM en un acto → sin pérdida ni atribución indebida; histórico ordenable por fechas reales; desconocidos preservados; resultados reproducibles y conteos sin duplicaciones. No usar manipulación DOM ni afirmar QA clínica con solo pruebas verdes.

Para un piloto real se requerirán autorización y seguridad institucional, minimización, seudonimización y control de acceso a exportaciones.

**Fijado:** quién entra en cohorte, qué actos se incluyen y granularidad acto×línea. **No fijado:** mapping efectivo, codificación de observaciones repetidas, número de columnas, adaptador, UI o pruebas finales. La decisión documental **no autoriza** código, cambios de Validación, Excel Enfermería, F4.5/F4.6 ni publicación clínica.
