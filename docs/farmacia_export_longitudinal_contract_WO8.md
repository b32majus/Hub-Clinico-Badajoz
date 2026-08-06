# WO8 — Contrato de exportación longitudinal Farmacia Hospitalaria

> **Reconciliación superior vigente 2026-08-06.** El HEAD regional es `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f` e incorpora el issue #250 y la PR #251, junto con el issue #252 y la PR #253. El flujo soportado es normal: Excel raw → reader/selectors → Data Port → sesión del paciente actual → Inicio/Quick View → dashboards → Validación → Primera Visita → Seguimiento. No existe un modo Bridge visible soportado. `sessionStorage` solo conserva el envelope temporal del paciente actual; Farmacia raw tiene precedencia; Estadísticas espera cutover raw/CSV; Actividad permanece demo y diferida. PR #238/#242/#246 queda como trazabilidad histórica.

**Versión:** 3.0 — reconciliación V4
**Fecha:** 2026-08-01
**WO asociada:** WO8.0 + WO8.0.2 + `WO-FH-EXPORT-CONTRACT-V2-RECONCILIATION-01`
**Estado:** `reconciliado_v4`
**HEAD publicado reconciliado:** `recovery/farmacia-pr-replay-20260727` @ `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f`

---

## 0. Reconciliación V4 — decisiones vigentes

Esta sección prevalece sobre cualquier formulación histórica incompatible del resto del documento.

### 0.1 Estado actual y evolución requerida

- Excel v1 implementado contiene **61 columnas** y permanece intacto en Validación, Primera Visita y Seguimiento.
- Export v2 demo paralelo está visible desde PR #227 con un esquema TSV común de **152 columnas**: Validación produce exactamente una fila; Primera Visita y Seguimiento soportan `1..N` filas según líneas explícitas.
- El proveedor técnico histórico de PR #225 permanece limitado a FH-001/FH-004 para regresión; un contexto `unknown/stale` bloquea exclusivamente ese fixture v2.
- Las versiones permanecen en `draft`; no existe promoción a `2.0.0`.
- La activación paralela no es cutover completo ni retirada gobernada de v1.

### 0.2 Acto canónico y filas nativas

Un acto canónico tiene identidad estable (`event_id`, `source_event_id`) y su cardinalidad depende del tipo: Validación genera exactamente una fila; Primera Visita genera `1..N` por líneas explícitamente presentes; Seguimiento genera `1..N` por líneas explícitamente activas. Cada fila conserva contexto común e identidad propia (`row_id`); los campos no aplicables quedan vacíos.

### 0.3 Seguimiento multilínea

Comportamiento publicado v1:

- Excel y CSV generan una fila por cada línea **dispensada explícitamente**;
- los datos comunes de la visita se repiten;
- las líneas evaluadas no dispensadas permanecen en TXT JARA y en el modelo de visita, pero no generan fila Excel/CSV.

Objetivo v2 aprobado:

```text
una visita × cada línea terapéutica activa en esa fecha = una fila por línea activa
```

La existencia de la fila no depende de dispensación ni de revisión específica. Se registran por separado:

- `active_at_visit`;
- `dispensation_status`;
- `specific_review_status`.

No registrar una revisión específica no equivale a eficacia, seguridad, adherencia ni ausencia de problemas.

Estado v2 visible: PR #227 permite copiar varias filas de 152 columnas para Seguimiento cuando el fixture técnico histórico dispone de contexto. Esto no modifica el comportamiento Excel/CSV v1 ni demuestra un CIP desconocido sin registro raw ni roundtrip.

### 0.4 Validación

Validación genera exactamente una fila por acto con los campos aplicables de contexto, solicitud, decisión, tratamiento validado, prebiológico, comorbilidades y observaciones. El bloque **solicitado** y el bloque **validado por Farmacia** permanecen separados. El tratamiento solicitado nunca completa automáticamente el validado; pendiente o denegado no crean línea terapéutica. Los datos no aplicables o ausentes quedan vacíos.

### 0.4bis Primera Visita

Primera Visita genera `1..N` filas, una por cada línea terapéutica explícitamente presente. Todas comparten `event_id`, `source_event_id`, `first_visit_id`, `patient_id`, fecha, contexto y PROMs comunes; cada una conserva `row_id`, `row_key`, `treatment_id`, `line_id`, rol y snapshot explícito. El soporte contractual cubre escenarios comunicados por Farmacia con más de una línea biológica iniciada desde Primera Visita, aunque la UI actual pueda mostrar una sola. No se crea otra línea desde tratamiento previo, catálogo, solicitud, nombre de medicamento o ausencia.

### 0.5 Excel Bridge y futuro servidor

El TSV completo de `1..N` filas se pega una sola vez en la hoja operativa del servicio de procedencia: Dermatología, Reumatología, Digestivo, Oncología u otros servicios aprobados en el futuro. Cada fila nativa se conserva íntegra y append-only. El **Office Script Processor** valida versiones, IDs y cardinalidad, conserva la entrada, agrupa el acto, bloquea duplicados, registra errores, descompone en hojas relacionales y genera `APP_*`. El **Excel Read Adapter** reconstruye el Hub desde esas vistas. El futuro **PostgreSQL Migrator** trasladará entidades relacionales validadas, sin copiar ciegamente las 152 columnas a una tabla SQL.

El Excel Bridge por hospital es el contenedor provisional V4 decidido para la fase relacional posterior. El workbook y el raw reader están publicados, pero el read model solo vive en memoria de la página y no constituye persistencia longitudinal resuelta. El flujo actual consume el Excel raw mediante Data Port y la sesión del paciente actual; la profesional puede seleccionar cualquier CIP explícitamente presente en el workbook raw cargado. No se crea un paciente desconocido ni existe consolidación regional automática.

Estado actual: Data Port y sesión del paciente actual integrados; Inicio/Quick View, dashboards, Validación, Primera Visita y Seguimiento integrados; Estadísticas raw/CSV pendientes; Actividad demo/diferida; Office Script, `APP_*`, `RelationalExcelDataSource` y roundtrip pendientes.

El antiguo `parser del Hub` descrito en WO8.1b no se implementó y no es el procesador cotidiano vigente. La denominación WO8.1b terminó reutilizándose para el exportador de fila de 61 columnas.

### 0.6 Identidad y evaluación

- La evaluación selecciona un CIP inventado explícitamente presente en el Excel raw cargado y usa los formularios e interacciones normales; no existe modo, botón, alta especial ni formulario reducido.
- El proveedor de PR #225 es un fixture técnico histórico de Export v2 paralelo, no el proveedor vigente del patient-flow raw.
- CIP/`identifier_value` no equivale a `patient_id`; `patient_id` es técnico y opaco.
- `patient_id` no se deriva del CIP mediante hash, transformación o concatenación.
- El Identity Plane físico, su mecanismo productivo y su custodia permanecen diferidos; no se añade Excel de correspondencia ni alta técnica manual.
- Los fixtures siguen disponibles para demo/regresión, pero no deben ser requisito del funcionamiento.

### 0.7 Browser storage reconciliado

El ledger clínico de PR #199/#203 fue retirado del runtime soportado por PR #231. El issue #250 y la PR #251 incorporan `sessionStorage` solo para el envelope versionado del paciente actual; no contiene workbook, bytes, read model completo, población, cohorte ni otros pacientes. Reload permite continuar o empezar de cero; continuar conserva generación, paciente y borradores; reiniciar purga sesión y borradores; cambiar de CIP exige resolver `dirty` y purga segura. El issue #252 y la PR #253 publican este flujo normal. No se presenta esta sesión temporal como persistencia longitudinal resuelta.

### 0.8 Reconciliación post patient-flow

El issue #250 y la PR #251 integraron el Data Port, `RawExcelDataSource` y `CurrentPatientSession`; el issue #252 y la PR #253 publicaron el flujo normal sin modo Bridge visible.

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

- `sessionStorage` contiene solo `version`, identificador explícito, `patient_id`, `generation`, proyección, datos explícitos, provenance, borradores y `dirty`.
- Farmacia raw tiene precedencia. Excel Enfermería solo enriquece huecos explícitos.
- Estadísticas conserva el dashboard diseñado; `WO-FH-RAW-STATISTICS-CUTOVER-01` debe conectar la fuente raw y el CSV completo de la cohorte filtrada.
- Actividad permanece demo, con definición funcional pendiente, no se cablea ahora y no bloquea el paquete de evaluación; queda diferida fuera de esa WO técnica.
- Sin workbook raw: demo separada y claramente etiquetada; puede usar el JSON demo.
- Con workbook raw: únicamente la cohorte raw; sin JSON demo, sin `generateSyntheticPatients()`, sin 28 pacientes generados y sin mezcla raw/demo.
- El CSV exporta toda la cohorte filtrada, no solo la página visible; su esquema exacto queda pendiente de `WO-FH-RAW-STATISTICS-CUTOVER-01`.
- Secuencia inmediata: `WO-DOC-FH-POST-PATIENT-FLOW-RECONCILIATION-01` → `WO-FH-RAW-STATISTICS-CUTOVER-01` → `WO-FH-EVALUATION-PACKAGE-01` → `APP_*`, `RelationalExcelDataSource`, `Processor` y roundtrip → PostgreSQL/servidor local mediante el mismo Data Port.

---

## 1. Objetivo

Definir la estructura de exportación/persistencia del módulo de Farmacia Hospitalaria del Hub Clínico Badajoz, distinguiendo dos capas:

1. **Excel operativo actual** — pensado para uso manual por Farmacia, organizado por servicio clínico, fácil de rellenar y revisar.
2. **Modelo lógico/relacional futuro** — pensado para base de datos real, compatible con SQL, mantiene entidades normalizadas.

Ambas capas coexisten en este contrato. La capa operativa es la interfaz temporal mientras el Hub dependa de Excel como backend. La capa relacional será la referencia de migración cuando el Hub evolucione a una base de datos real.

---

## 2. Alcance y no alcance

### Alcance

- Excel operativo organizado por servicio clínico de procedencia.
- Actos farmacéuticos longitudinales: validación, primera visita, seguimiento, cambios, suspensiones, EA.
- Catálogo de fármacos especiales (no CIMA).
- Modelo lógico normalizado como capa interna/analítica.
- Reglas de validación farmacoterapéutica: todo fármaco nuevo relevante debe generar validación.

### No alcance

- Exportación de datos no farmacológicos.
- Dashboard como fuente de verdad (es proyección, no origen).
- Estadísticas agregadas (son derivadas, no raw).
- Integración con sistemas externos (SIL, HCIS).
- Autenticación/autorización de usuarios.
- Registro de actividad (audit log).
- Prescripción electrónica ni validación en origen.

---

## 3. Principios de diseño

1. **Marca comercial como nombre principal** — criterio clínico validado por Sil. El medicamento concreto (Benlysta, Orencia, Rixathon) es el nombre visible. El principio activo es campo secundario obligatorio.

2. **El Excel operativo se organiza por servicio, no por tabla normalizada.** Las hojas son Derma, Reuma, Digestivo, Onco — no pacientes, líneas, visitas separadas.

3. **La cardinalidad depende del acto.** Validación genera exactamente una fila; Primera Visita y Seguimiento generan `1..N` por líneas explícitas. Las filas de un mismo acto comparten identidad común y cada una dispone de identidad propia.

4. **Mismo esquema de columnas en todas las hojas de servicio.** DERMA = REUMA = DIGESTIVO = ONCO. El servicio es una partición humana de trabajo, no un modelo de datos distinto.

5. **Texto libre no sustituye a código normalizado.** Cuando exista `pauta_codigo`, debe registrarse. El texto visible es adicional.

6. **Histórico no se convierte en activo.** `estado_linea` y `tipo_relacion` se conservan exactamente como están.

7. **Todo fármaco nuevo relevante debe generar validación farmacoterapéutica.** Un biológico añadido no debe registrarse solo como concomitante — debe crear nueva línea o nuevo evento de cambio.

8. **El modelo relacional se conserva como capa interna.** No se descarta. Es la referencia para migración a BD futura.

9. **El dashboard es proyección, no fuente.** La exportación se alimenta de datos de captura (validación, primera visita, seguimiento).

10. **Estructura migrable a base de datos.** Las filas nativas de cada acto deben agruparse por identificadores estables y descomponerse sin pérdida en las entidades relacionales definidas.

---

## 4. Entidades del modelo

### 4.1 Excel operativo (hojas visibles)

| Hoja | Propósito |
|---|---|
| `01_DERMA` | Actos farmacéuticos de pacientes de Dermatología |
| `02_REUMA` | Actos farmacéuticos de pacientes de Reumatología |
| `03_DIGESTIVO` | Actos farmacéuticos de pacientes de Digestivo |
| `04_ONCO` | Actos farmacéuticos de pacientes de Oncología |
| `05_CATALOGOS` | Listas desplegables, valores controlados, fármacos especiales |
| `99_CONFIG_EXPORT_MAP` | (Opcional técnica) Mapa técnico de columnas hacia entidades del Excel Bridge |

### 4.2 Modelo lógico interno (capas futuras)

| Entidad | Descripción | Uso |
|---|---|---|
| `Paciente` | Datos demográficos básicos | Capa analítica |
| `LineaTratamiento` | Línea de tratamiento biológico | Capa analítica |
| `VisitaSeguimiento` | Visita de seguimiento farmacoterapéutico | Capa analítica |
| `EventoTratamiento` | Hito temporal (inicio, fin, cambio, suspensión) | Capa analítica |
| `EfectoAdverso` | EA con atribución y causalidad | Capa analítica |
| `FarmacoConcomitante` | Medicación concomitante/adicional/histórica | Capa analítica |
| `PrebiologicoValidacion` | Validación prebiológica | Capa analítica |
| `PromsAdherencia` | PROMs, adherencia Morisky-Green | Capa analítica |
| `CatalogoFarmacos` | Catálogo de fármacos especiales | Soporte |
| `CatalogoPautas` | Catálogo de pautas normalizadas | Soporte |

**Regla:** El modelo lógico no es una hoja manual. El Office Script Processor lo deriva desde las filas nativas; las vistas `APP_*` permiten lectura posterior y el mismo modelo sirve como referencia de migración a PostgreSQL.

---

## 5. Hojas del Excel operativo

| # | Hoja | Propósito | Manual | 
|---|---|---|---|
| 01 | `01_DERMA` | Actos farmacéuticos de Dermatología | Sí |
| 02 | `02_REUMA` | Actos farmacéuticos de Reumatología | Sí |
| 03 | `03_DIGESTIVO` | Actos farmacéuticos de Digestivo | Sí |
| 04 | `04_ONCO` | Actos farmacéuticos de Oncología | Sí |
| 05 | `05_CATALOGOS` | Listas controladas y fármacos especiales | Sí |
| 99 | `99_CONFIG_EXPORT_MAP` | Mapa técnico de descomposición del Excel Bridge | No (técnica) |

### Justificación

Las hojas visibles se organizan por servicio porque reflejan la organización real del trabajo. El Hub genera la fila completa y la profesional la pega en la primera fila libre; no crea ni completa manualmente al paciente en Excel.

El Office Script Processor conserva la fila nativa y genera las hojas técnicas relacionadas. El antiguo parser de WO8.1b no fue implementado y esa denominación terminó reutilizándose para el exportador de 61 columnas.

---

## 6. Estructura v1 publicada de las hojas de servicio

> Las 61 columnas descritas a continuación documentan la implementación actual. No limitan la futura fila común v2 y quedan subordinadas a la reconciliación de la sección 0.

### Mismo esquema en todas

`01_DERMA` = `02_REUMA` = `03_DIGESTIVO` = `04_ONCO`

Las columnas se organizan en **8 bloques** (A-H). Cada bloque agrupa campos relacionados semánticamente.

### A. Identificación paciente

| Columna | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `patient_id` | string | Sí | Identificador único del paciente |
| `cip_demo_o_hash` | string | Sí | CIP demo o hash del CIP real |
| `nhc_o_codigo_interno` | string | No | NHC o código interno del hospital |
| `fecha_nacimiento_o_edad` | date/number | Sí | Fecha nacimiento o edad en años |
| `sexo` | string | Sí | Sexo del paciente |
| `servicio_origen` | string | Sí | Servicio clínico de procedencia |
| `patologia_indicacion` | string | Sí | Patología o indicación principal |

### B. Acto farmacéutico

| Columna | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `fecha_acto` | date | Sí | Fecha del acto farmacéutico |
| `tipo_acto_fh` | string | Sí | Tipo de acto (ver lista controlada §6.1) |
| `visita_id` | string | No | ID de visita de seguimiento (si aplica) |
| `validacion_id` | string | No | ID de validación (si aplica) |
| `tratamiento_id` | string | No | ID del tratamiento asociado |
| `linea_id` | string | No | ID de línea biológica |
| `profesional_fh` | string | Sí | Farmacéutico/a responsable |
| `estado_registro` | string | Sí | `activo`, `completado`, `pendiente_revision` |

### C. Medicamento / línea terapéutica

| Columna | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `marca_comercial` | string | Sí | **Nombre principal** (Benlysta, Orencia, Rixathon) |
| `principio_activo` | string | Sí | Principio activo (Belimumab, Abatacept, Rituximab) |
| `codigo_nacional` | string | No | Código nacional del medicamento |
| `numero_registro` | string | No | Número de registro |
| `source_type` | string | No | `CIMA`, `LOCAL`, `DEMO`, `EXCEL` |
| `categoria_farmaco` | string | No | Categoría (biológico, biosimilar, pequeño molécula, etc.) |
| `tipo_relacion` | string | Sí | `principal`, `adicional`, `concomitante`, `historico`, `exposicion` |
| `estado_linea` | string | Sí | `activo`, `suspendido`, `historico`, `finalizado`, `anadido` |
| `tipo_movimiento` | string | No | `sin_cambios`, `cambio_terapeutico`, `tratamiento_anadido`, `suspension` |
| `es_principal` | boolean | Sí | True si es la línea principal actual |
| `fecha_inicio` | date | Sí | Fecha de inicio de la línea |
| `fecha_fin` | date | No | Fecha de fin/suspensión (vacío si activa) |
| `motivo_inicio_cambio_suspension` | string | No | Motivo clínico del evento |

### D. Pauta y administración

| Columna | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `dosis_presentacion` | string | Sí | Dosis y presentación |
| `via` | string | Sí | Vía de administración |
| `pauta_codigo` | string | No | Código de pauta normalizada |
| `pauta_label` | string | No | Etiqueta visible de pauta |
| `pauta_otro_texto` | string | No | Texto libre (si la pauta no es normalizable) |

### E. Solicitud y validación farmacoterapéutica

La versión v2 deberá contener dos bloques separados. Los nombres físicos de columnas se cerrarán en la WO de contrato v2.

**Solicitud clínica:**

- `request_id`;
- tratamiento solicitado: nombre, principio activo, presentación/dosis, vía, pauta e inducción cuando estén explícitos;
- justificación clínica;
- fecha y procedencia de la solicitud.

**Validación de Farmacia:**

- `validation_id`;
- resultado explícito de validación;
- tratamiento validado: nombre, principio activo, presentación/dosis, vía, pauta e inducción cuando estén explícitos;
- observaciones de Farmacia;
- motivo explícito de pendiente o rechazo;
- estado prebiológico y bloqueantes cuando correspondan.

El solicitado no rellena el validado. Una solicitud no crea por sí misma una línea activa.

### F. Primera visita y Seguimiento

La versión v1 contiene PROMs, adherencia y observaciones, pero no representa suficientemente el grano multilínea.

Para Seguimiento v2, cada línea activa en la fecha de visita genera una fila y registra por separado:

- `visit_id` y contexto común de la visita;
- `line_id` y `treatment_id`;
- `active_at_visit`;
- `dispensation_status`;
- `specific_review_status`;
- motivo y detalle de la revisión específica, solo cuando exista;
- cambios explícitos de dosis, pauta o suspensión;
- observaciones de línea;
- adherencia específica si se recoge;
- PROMs comunes de visita sin convertir cada fila en una nueva medición.

Los datos comunes se repiten de forma deliberada. Los dashboards deben deduplicar visitas y PROMs por identificador.

Para Primera Visita v2, cada línea explícitamente presente genera una fila. N filas del mismo acto comparten la identidad y los datos comunes indicados en la sección 0.4bis; producen un registro lógico de Primera Visita, N líneas asociadas y PROMs deduplicados por identidad de acto/instrumento.

### G. Seguridad / EA

| Columna | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `hay_efecto_adverso` | boolean | Sí | True si existe notificación de EA |
| `ea_id` | string | No | ID del EA (si aplica) |
| `ea_descripcion` | string | No | Descripción del EA |
| `ea_gravedad` | string | No | `Grave`, `Moderado`, `Leve` |
| `farmaco_sospechoso_id` | string | No | Referencia al fármaco (tratamiento_id o uid) |
| `farmaco_sospechoso_nombre` | string | No | Nombre del fármaco sospechoso |
| `causalidad_naranjo` | string | No | `Definitiva`, `Probable`, `Posible`, `Dudosa` |
| `causalidad_karch` | string | No | Causalidad Karch-Lasagna si aplica |
| `accion_ea` | string | No | Acción tomada (suspensión, reducción dosis, etc.) |

### H. Trazabilidad

| Columna | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `created_at` | datetime | Sí | Fecha de creación del registro |
| `updated_at` | datetime | No | Fecha de última modificación |
| `demo_flag` | boolean | Sí | True si el dato es de demostración |
| `observaciones_generales` | string | No | Observaciones transversales |

### 6.1 Tipos de acto farmacéutico (lista controlada)

| Tipo | Descripción |
|---|---|
| `validacion_inicial` | Primera validación farmacoterapéutica del paciente |
| `primera_visita` | Primera visita de seguimiento |
| `seguimiento` | Visita de seguimiento rutinaria |
| `nueva_validacion_cambio` | Validación por cambio terapéutico |
| `nueva_validacion_adicion` | Validación por adición de nuevo fármaco |
| `suspension` | Suspensión de un tratamiento |
| `cambio_pauta` | Modificación de pauta (dosis, frecuencia, vía) |
| `efecto_adverso` | Notificación de efecto adverso |
| `renovacion_continuidad` | Renovación de continuidad del tratamiento |
| `otro` | Otro tipo de acto no categorizado |

### Regla clínica importante

Todo fármaco nuevo relevante iniciado debe generar una validación farmacoterapéutica. Por tanto:

- Un biológico añadido no debe registrarse solo como concomitante.
- Debe poder crear nueva línea terapéutica (`tipo_acto_fh = nueva_validacion_adicion` o `cambio_terapeutico`).
- Si sustituye a otro, debe registrar `nueva_validacion_cambio`.
- Si se suspende un tratamiento, debe registrar `suspension` y conservar el histórico.

---

## 7. Catálogo de fármacos (hoja 05_CATALOGOS)

### Decisión sobre CIMA

Los fármacos oficialmente disponibles se consultan desde CIMA / autocomplete del Hub. **No se replica CIMA completo en el Excel.**

### Contenido de la hoja CATALOGOS

La hoja `05_CATALOGOS` contiene:

1. **Listas desplegables** para valores controlados del Excel (tipos de acto, estado_linea, tipo_relacion, vías, pautas, etc.).
2. **Fármacos especiales**: medicamentos no disponibles o no normalizados en CIMA:
   - Uso fuera de ficha técnica.
   - Ensayo clínico.
   - Uso compasivo.
   - Medicación extranjera.
   - Preparación especial (fórmula magistral, dosis personalizada).
   - Fármaco local pendiente de normalización.
   - Otros.

### Columnas de fármaco especial

| Columna | Obligatorio | Descripción |
|---|---|---|
| `marca_nombre_visible` | Sí | Marca o nombre visible del fármaco |
| `principio_activo` | No | Principio activo si existe |
| `categoria_especial` | Sí | Categoría del fármaco especial (ver lista) |
| `indicacion_uso` | No | Indicación o uso previsto |
| `observaciones` | No | Observaciones adicionales |
| `fecha_alta_catalogo` | Sí | Fecha de alta en el catálogo local |
| `activo` | Sí | `Sí` / `No` — si está disponible actualmente |

### Categorías de fármaco especial

- `fuera_de_ficha_tecnica`
- `ensayo_clinico`
- `uso_compasivo`
- `medicacion_extranjera`
- `preparacion_especial`
- `pendiente_normalizacion`
- `otro`

---

## 8. Catálogo de pautas (incluido en 05_CATALOGOS)

Las pautas normalizadas se definen en `FarmaciaPautasCatalog` (WO6). En el Excel operativo:

- `pauta_codigo`: identificador único (CADA_4_SEMANAS, CADA_8_SEMANAS, SEMANAL, MENSUAL, etc.).
- `pauta_label`: texto visible ("Cada 4 semanas", "Semanal", etc.).
- `pauta_intervalo_dias`: intervalo numérico en días si aplica.
- `pauta_otro_texto`: preserva el texto libre original si la pauta no es normalizable.

La hoja `05_CATALOGOS` incluirá una sección de pautas disponibles como lista desplegable.

---

## 9. Modelo relacional V4 y Excel Bridge

### 9.1 Entidades objetivo

| Hoja/entidad | Grano | Regla principal |
|---|---|---|
| `PATIENTS` | un paciente técnico | No duplicar por fila exportada |
| `REQUESTS` | una solicitud | Solicitado separado de validado |
| `VALIDATIONS` | un acto de validación | Resultado y tratamiento validado explícitos |
| `TREATMENTS` | una identidad de tratamiento | No inferir desde nombre o catálogo |
| `TREATMENT_LINES` | una línea terapéutica | Estado y fechas explícitos |
| `TREATMENT_MOVEMENTS` | un cambio confirmado | Inicio, cambio, suspensión u optimización explícitos |
| `VISITS` | una visita | Una por `visit_id`, aunque existan varias filas nativas |
| `VISIT_LINES` | visita × línea | Una por `visit_id + line_id` |
| `OBSERVATIONS` | observación común o de línea | Mantener ámbito y procedencia |
| `PROMS` | visita × instrumento/medición | No multiplicar por número de líneas |
| `ADVERSE_EVENTS` | un EA explícito | No inferir por incidencia genérica |
| `CAUSALITY` | EA × sospechoso | Una valoración por sospechoso cuando exista |
| `IMPORT_ERRORS` | un error de procesamiento | No destruir la fila nativa |
| `APP_PATIENTS_SNAPSHOT` | vista de lectura | Proyección para el Hub |
| `APP_LONGITUDINAL` | vista longitudinal | Proyección para dashboards y roundtrip |

### 9.2 Procesamiento cotidiano

```text
Hub
→ genera el TSV de 1..N filas según la cardinalidad del acto
→ la profesional pega la salida una sola vez en la hoja operativa del servicio
→ Office Script Processor
    ├── conserva cada fila íntegra y append-only
    ├── valida versiones, IDs y cardinalidad
    ├── rechaza duplicados
    ├── agrupa filas del mismo acto
    ├── descompone en entidades
    ├── registra errores
    └── genera APP_*
```

Para Seguimiento, N filas con el mismo `visit_id` producen un único `VISITS` y N `VISIT_LINES`. Si los campos comunes de esas filas discrepan, se registra error; el script no elige un valor.

Para Primera Visita, N filas del mismo acto producen un registro lógico de Primera Visita, N registros de líneas asociadas y PROMs comunes deduplicados por acto/instrumento. Para Seguimiento, PROMs, adherencia y EA comunes se deduplican según identificadores y ámbito; causalidades y sospechosos conservan cardinalidad explícita. Toda discrepancia en datos comunes produce error, nunca selección, corrección o inferencia del Office Script.

### 9.3 Lectura y migración

- **Excel Read Adapter:** lee `APP_PATIENTS_SNAPSHOT` y `APP_LONGITUDINAL` para reconstruir el Hub mientras Excel sea backend.
- **PostgreSQL Migrator:** valida y traslada las entidades del Excel Bridge al servidor local cuando exista infraestructura autorizada.
- El migrador no forma parte del procesamiento cotidiano y no se confunde con el parser de órdenes clínicas o Presalud.

---

## 10. Preguntas y respuestas vigentes

| Pregunta | Respuesta |
|---|---|
| **¿Excel único o varias hojas?** | Un libro por hospital, con hojas operativas por servicio y hojas técnicas relacionales. |
| **¿Todas las hojas de servicio usan el mismo esquema?** | Sí. La fila común v2 será idéntica en DERMA, REUMA, DIGESTIVO y ONCO. |
| **¿Las 61 columnas son definitivas?** | No. Son la v1 implementada y deben evolucionar sin pérdida clínica. |
| **¿Una fila equivale siempre a un acto?** | Validación sí genera exactamente una; Primera Visita y Seguimiento generan `1..N` según líneas explícitas. |
| **¿Cuál es el grano de Seguimiento v2?** | Una fila por línea terapéutica activa en la fecha de la visita. |
| **¿Dispensada equivale a evaluada?** | No. Presencia activa, dispensación y revisión específica son dimensiones independientes. |
| **¿Cómo se cuentan visitas?** | Por `COUNT DISTINCT visit_id`, no por número de filas. |
| **¿Cómo se conservan PROMs comunes?** | Una medición por acto/instrumento; las filas nativas pueden repetirla, pero el modelo relacional la deduplica. |
| **¿Cómo se representan solicitado y validado?** | En bloques separados. Nunca se copia automáticamente uno al otro. |
| **¿Cómo se procesan las filas?** | Mediante Office Script Processor idempotente, no mediante un parser cotidiano del Hub. |
| **¿Para qué servirá un parser/migrador futuro?** | Para leer vistas `APP_*` o migrar el Excel Bridge a PostgreSQL, no para decidir clínica. |
| **¿Cómo se representan tratamientos relacionados y varios sospechosos?** | El modelo relacional exige cardinalidad 1:N; la representación física en la fila v2 sigue pendiente de diseño. |

---

## 11. Reglas de exportación y procesamiento

- Fechas ISO cuando estén disponibles.
- Valores ausentes como celdas vacías, no `null`, guiones ni valores inferidos.
- Booleanos preservan `TRUE`, `FALSE` y ausencia.
- `schema_version`, `source_event_id`, `event_id` y `row_id` serán obligatorios en v2.
- La fila nativa se conserva append-only.
- La reejecución del Office Script no duplica registros.
- Una discrepancia entre filas del mismo acto produce error, no corrección automática.
- `demo_flag = TRUE` identifica datos de evaluación sintética.
- Ningún componente decide dosis, vía, pauta, presentación, inducción, duración, validación, switch, add-on, renovación o causalidad.

---

## 12. Reglas para evitar pérdida de información

1. No truncar histórico ni convertir una línea histórica en activa.
2. No colapsar líneas activas, sospechosos, causalidades ni tratamientos relacionados en una única conclusión clínica.
3. Preservar texto original además de códigos normalizados.
4. Preservar `0`, `false` y ausencia.
5. No multiplicar visitas, PROMs o EA comunes al descomponer varias filas del mismo acto.
6. No crear una dispensación porque la línea esté activa o evaluada.
7. No crear una revisión específica porque la línea se haya dispensado.
8. No crear una línea validada desde el tratamiento solicitado.
9. Un error de proceso no destruye la entrada nativa.

---

## 13. Compatibilidad futura con PostgreSQL

Las hojas relacionales son una representación transitoria compatible con el futuro servidor local:

- claves primarias y foráneas estables;
- relaciones 1:N explícitas;
- tipos asignables a SQL;
- listas controladas convertibles en dominios o `CHECK`;
- ausencia de celdas multivalor en las tablas relacionales.

La migración se realizará desde las entidades validadas del Excel Bridge mediante un PostgreSQL Migrator específico. No se diseñará el esquema SQL copiando sin más las columnas anchas de la fila nativa.

---

## 14. Decisiones de diseño y gates para la fila v2

Decisiones funcionales cerradas:

- event schema y row schema tienen versiones independientes;
- Validación genera exactamente una fila y conserva solicitado y validado por separado;
- Primera Visita genera `1..N` filas por líneas explícitas y usa una única fecha canónica;
- Seguimiento usa `visita × línea activa`;
- dispensación y revisión específica son dimensiones independientes;
- los campos clínicos binarios usan triestado;
- dominios 1:N se conservarán estructurados y deberán superar un roundtrip TSV sin pérdida.

WO1 fija una candidate técnica `2.0.0-draft.1` de 152 columnas. PR #227 la expone como Export v2 demo paralelo para contextos técnicos registrados; sigue sin ser contrato final, cutover ni versión `2.0.0`. Permanecen para WOs posteriores:

- mapeo exacto desde cada formulario;
- política de compatibilidad y retirada de v1;
- comportamiento UI de confirmación `same_as_requested`;
- representación operativa final en el libro Excel;
- Office Script, vistas `APP_*` y migración PostgreSQL.

---

## 15. Secuencia de implementación vigente

La secuencia inmediata post patient-flow es:

1. `WO-DOC-FH-POST-PATIENT-FLOW-RECONCILIATION-01` — reconciliación documental.
2. `WO-FH-RAW-STATISTICS-CUTOVER-01` — fuente raw para Estadísticas y CSV completo de cohorte filtrada.
3. `WO-FH-EVALUATION-PACKAGE-01` — paquete de evaluación sobre el flujo normal.
4. `APP_*`, `RelationalExcelDataSource`, `Processor` y roundtrip.
5. PostgreSQL/servidor local mediante el mismo Data Port.

La secuencia histórica del core, adaptadores, workbook y reader se conserva en este contrato. Office Script, Identity Plane, Actividad y refactor general no se anteponen a las cinco unidades anteriores.

WO1–WO4 están integradas. La adjudicación de WO5 es `PARTIALLY_SATISFIED_BY_SMALLER_UNITS / REMAINING_SCOPE_DEFERRED`: no se reabre como megadesarrollo ni se declara completamente cerrada; retirada v1 y promoción de versiones `draft` quedan aplazadas. La secuencia histórica vive en `docs/ops/FH_EXPORT_V2_IMPLEMENTATION_SEQUENCE_20260802.md`; la secuencia inmediata está en la sección 0.8 y aquí arriba.

No se presenta la evaluación como paquete longitudinal final, piloto o producción. El CIP de evaluación debe estar explícitamente presente en el Excel raw cargado; un CIP desconocido sin registro raw queda fuera de alcance. Office Script, vistas `APP_*`, Excel Read Adapter y roundtrip Hub → Excel → Hub siguen pendientes. Ver [`DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md).

### Aclaración histórica de WO8.1b

En la versión 2.0 del contrato, WO8.1b se describió como parser Excel → modelo relacional. Ese parser no se implementó. En el manifiesto de rama, la misma etiqueta WO8.1b se reutilizó después para el exportador de fila operativa de 61 columnas. La arquitectura vigente abandona esa ambigüedad y usa los nombres Office Script Processor, Excel Read Adapter y PostgreSQL Migrator.

---

**Status:** `reconciliado_v4`
