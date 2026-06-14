# WO8 — Contrato de exportación longitudinal Farmacia Hospitalaria

**Versión:** 2.0  
**Fecha:** 2026-06-14  
**WO asociada:** WO8.0 (documental) + WO8.0.2 (rediseño operativo)  
**Estado:** `pending_review`  
**Rama:** `work/farmacia-post-demo-wo7g2-dashboard-timeline-20260614`  

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

3. **Una fila = un acto farmacéutico.** Cada fila representa un hecho clínico discreto relacionado con un paciente y, si aplica, una línea terapéutica.

4. **Mismo esquema de columnas en todas las hojas de servicio.** DERMA = REUMA = DIGESTIVO = ONCO. El servicio es una partición humana de trabajo, no un modelo de datos distinto.

5. **Texto libre no sustituye a código normalizado.** Cuando exista `pauta_codigo`, debe registrarse. El texto visible es adicional.

6. **Histórico no se convierte en activo.** `estado_linea` y `tipo_relacion` se conservan exactamente como están.

7. **Todo fármaco nuevo relevante debe generar validación farmacoterapéutica.** Un biológico añadido no debe registrarse solo como concomitante — debe crear nueva línea o nuevo evento de cambio.

8. **El modelo relacional se conserva como capa interna.** No se descarta. Es la referencia para migración a BD futura.

9. **El dashboard es proyección, no fuente.** La exportación se alimenta de datos de captura (validación, primera visita, seguimiento).

10. **Estructura migrable a base de datos.** Cuando se implemente, cada acto farmacéutico de las hojas operativas debe poder descomponerse en las entidades relacionales definidas.

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
| `99_CONFIG_EXPORT_MAP` | (Opcional técnica) Mapa de exportación para parser interno |

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

**Regla:** El modelo lógico no es una hoja manual del Excel. Es la estructura que el Hub podrá derivar internamente desde las hojas operativas (vía parser), y que servirá como esquema de migración a base de datos.

---

## 5. Hojas del Excel operativo

| # | Hoja | Propósito | Manual | 
|---|---|---|---|
| 01 | `01_DERMA` | Actos farmacéuticos de Dermatología | Sí |
| 02 | `02_REUMA` | Actos farmacéuticos de Reumatología | Sí |
| 03 | `03_DIGESTIVO` | Actos farmacéuticos de Digestivo | Sí |
| 04 | `04_ONCO` | Actos farmacéuticos de Oncología | Sí |
| 05 | `05_CATALOGOS` | Listas controladas y fármacos especiales | Sí |
| 99 | `99_CONFIG_EXPORT_MAP` | Mapa técnico para parser interno | No (técnica) |

### Justificación

No se incluyen hojas separadas por dominio de datos (pacientes, líneas, visitas) porque el Excel operativo está diseñado para ser **rellenado manualmente por Farmacia**. La partición por servicio clínico refleja la organización real del trabajo: un farmacéutico revisa pacientes de un servicio concreto. Cada fila contiene toda la información del acto farmacéutico en un formato longitudinal.

Las hojas separadas del modelo lógico se derivarán internamente mediante parser cuando se implemente WO8.1b.

---

## 6. Estructura de las hojas de servicio

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

### E. Validación farmacoterapéutica

| Columna | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `tipo_validacion` | string | No | `inicial`, `cambio`, `adicion`, `renovacion` |
| `resultado_validacion` | string | No | `validado`, `pendiente`, `rechazado`, `no_aplica` |
| `requiere_prebiologico` | boolean | No | True si requiere evaluación prebiológica |
| `tb_estado` | string | No | Resultado de TB |
| `serologias_estado` | string | No | Resultado de serologías |
| `vacunas_estado` | string | No | Estado de vacunación |
| `bloqueantes_validacion` | string | No | Bloqueante activo si aplica |
| `observaciones_validacion` | string | No | Observaciones de la validación |

### F. Seguimiento

| Columna | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `adherencia_morisky` | string | No | `Alta`, `Media`, `Baja` |
| `haq` | number | No | HAQ score (0-3) |
| `eva_dolor` | number | No | EVA dolor (0-10) |
| `dlqi` | number | No | DLQI score (0-30) |
| `respuesta_clinica` | string | No | Valoración de respuesta al tratamiento |
| `incidencias` | string | No | Incidencias detectadas |
| `observaciones_seguimiento` | string | No | Observaciones generales de seguimiento |

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

## 9. Modelo lógico interno / Export analítico derivado

Este modelo **no es una hoja manual del Excel operativo**. Es la capa normalizada que el Hub podrá derivar internamente desde las hojas de servicio, y que servirá como referencia de migración a base de datos.

### 9.1 Entidades normalizadas

```

Paciente (1) ───< LineaTratamiento (N)
Paciente (1) ───< VisitaSeguimiento (N)
LineaTratamiento (1) ───< EventoTratamiento (N)
VisitaSeguimiento (1) ───< EfectoAdverso (N)
VisitaSeguimiento (1) ───< FarmacoConcomitante (N)
VisitaSeguimiento (1) ───< PromsAdherencia (1)
Paciente (1) ───< PrebiologicoValidacion (N)

```

### 9.2 Mapeo desde hoja operativa a entidades

Cada fila de una hoja de servicio (DERMA, REUMA, etc.) puede descomponerse en:

| Entidad destino | Cómo se deriva |
|---|---|
| `Paciente` | Bloque A (identificación) — datos demográficos |
| `LineaTratamiento` | Bloque C (medicamento) + `linea_id` + `tratamiento_id` |
| `VisitaSeguimiento` | Bloque B (acto) cuando `tipo_acto_fh` es `seguimiento` o `primera_visita` |
| `EventoTratamiento` | Bloque B (acto) + Bloque C cuando hay cambio de estado |
| `EfectoAdverso` | Bloque G (seguridad/EA) cuando `hay_efecto_adverso = TRUE` |
| `FarmacoConcomitante` | Bloque C cuando `tipo_relacion` es concomitante/adicional/exposición |
| `PrebiologicoValidacion` | Bloque E (validación) cuando aplica |
| `PromsAdherencia` | Bloque F (seguimiento) |

### 9.3 Tablas del modelo relacional

#### pacientes

| Columna | Tipo | Descripción |
|---|---|---|
| `patient_id` | PK | Clave primaria |
| `cip_demo_o_hash` | string | CIP o hash |
| `nombre` | string | Nombre (demo o anonimizado) |
| `fecha_nacimiento` | date | Fecha de nacimiento |
| `sexo` | string | Sexo |
| `servicio_origen` | string | Servicio clínico |
| `patologia_indicacion` | string | Patología principal |
| `demo_flag` | boolean | Flag de datos demo |

#### lineas_tratamiento

| Columna | Tipo | Descripción |
|---|---|---|
| `tratamiento_id` | PK | ID del tratamiento |
| `patient_id` | FK | FK a pacientes |
| `linea_id` | string | ID de línea biológica |
| `orden` | number | Orden de la línea |
| `marca_comercial` | string | Nombre principal |
| `principio_activo` | string | Principio activo |
| `codigo_nacional` | string | Código nacional |
| `dosis` | string | Dosis y presentación |
| `via` | string | Vía |
| `pauta_codigo` | string | Código de pauta |
| `pauta_label` | string | Etiqueta de pauta |
| `tipo_relacion` | string | Tipo de relación |
| `estado_linea` | string | Estado de la línea |
| `tipo_movimiento` | string | Tipo de movimiento |
| `es_principal` | boolean | Es línea principal |
| `fecha_inicio` | date | Fecha de inicio |
| `fecha_fin` | date | Fecha de fin |
| `motivo` | string | Motivo del cambio |

#### visitas_seguimiento

| Columna | Tipo | Descripción |
|---|---|---|
| `visita_id` | PK | ID de visita |
| `patient_id` | FK | FK a pacientes |
| `fecha_visita` | date | Fecha de la visita |
| `tipo_acto_fh` | string | Tipo de acto |
| `profesional_fh` | string | Farmacéutico responsable |
| `linea_seleccionada_id` | string | Línea activa en la visita |
| `observaciones` | string | Observaciones |

#### eventos_tratamiento

| Columna | Tipo | Descripción |
|---|---|---|
| `evento_id` | PK | ID del evento |
| `patient_id` | FK | FK a pacientes |
| `tratamiento_id` | FK | FK a línea de tratamiento |
| `fecha_evento` | date | Fecha del evento |
| `tipo_evento` | string | Tipo de evento |
| `marca_comercial` | string | Marca asociada |
| `descripcion` | string | Descripción |

#### efectos_adversos

| Columna | Tipo | Descripción |
|---|---|---|
| `ea_id` | PK | ID del EA |
| `patient_id` | FK | FK a pacientes |
| `visita_id` | FK | FK a visita |
| `fecha_ea` | date | Fecha del EA |
| `ea_descripcion` | string | Descripción |
| `ea_gravedad` | string | Gravedad |
| `farmaco_sospechoso_id` | string | Ref. al fármaco |
| `farmaco_sospechoso_nombre` | string | Nombre del fármaco |
| `causalidad_naranjo` | string | Naranjo |
| `causalidad_karch` | string | Karch-Lasagna |

#### farmacos_concomitantes

| Columna | Tipo | Descripción |
|---|---|---|
| `uid_concomitante` | PK | ID del registro |
| `patient_id` | FK | FK a pacientes |
| `visita_id` | FK | FK a visita |
| `farmaco_nombre` | string | Nombre del fármaco |
| `principio_activo` | string | Principio activo |
| `tipo_relacion` | string | Tipo de relación |
| `sospechoso_ea` | boolean | Es sospechoso de EA |

#### prebiologico_validacion

| Columna | Tipo | Descripción |
|---|---|---|
| `prebio_id` | PK | ID |
| `patient_id` | FK | FK a pacientes |
| `tb_estado` | string | TB |
| `serologias_estado` | string | Serologías |
| `vacunas_estado` | string | Vacunas |
| `bloqueante` | string | Bloqueante |
| `prebiologico_estado` | string | Estado global |

#### proms_adherencia

| Columna | Tipo | Descripción |
|---|---|---|
| `prom_id` | PK | ID |
| `patient_id` | FK | FK a pacientes |
| `fecha_prom` | date | Fecha de medición |
| `dlqi` | number | DLQI |
| `eva_dolor` | number | EVA dolor |
| `haq` | number | HAQ |
| `morisky_green` | string | Adherencia |

---

## 10. Preguntas y respuestas

| Pregunta | Respuesta |
|---|---|
| **¿Excel único o varias hojas?** | Excel único. Hojas operativas por servicio (DERMA, REUMA, DIGESTIVO, ONCO) + CATALOGOS. El modelo normalizado no es hoja manual. |
| **¿Qué hoja es fuente maestra de líneas terapéuticas?** | Las hojas de servicio, columna `linea_id`. El modelo relacional `lineas_tratamiento` se deriva internamente. |
| **¿Cómo representar varios biológicos activos?** | Múltiples filas en la hoja de servicio, cada una con su `linea_id` y `tipo_relacion`. La columna `es_principal` distingue la línea principal. |
| **¿Cómo representar cambio terapéutico?** | `tipo_acto_fh = nueva_validacion_cambio` + `tipo_movimiento = cambio_terapeutico`. La línea anterior se marca como histórica. |
| **¿Cómo conservar histórico?** | Las líneas con `estado_linea = historico` o `finalizado` se conservan en las hojas de servicio. No se filtran ni eliminan. |
| **¿Cómo evitar duplicados por marca/principio activo?** | `tratamiento_id` como identificador único estable. `linea_id` como agrupación lógica. |
| **¿Cómo exportar concomitantes?** | En la misma hoja de servicio, con `tipo_relacion = concomitante`. Una fila por fármaco concomitante. |
| **¿Cómo exportar sospechoso de EA?** | Bloque G. `hay_efecto_adverso = TRUE` + `farmaco_sospechoso_id` + `causalidad_naranjo`. |
| **¿Cómo exportar pauta normalizada?** | `pauta_codigo` + `pauta_label` + `pauta_otro_texto` (fallback a texto libre). |
| **¿Qué queda fuera de WO8.1?** | Parser del Excel operativo al modelo relacional (WO8.1b). Export analítico normalizado (WO8.1c). Catálogo de pautas completo (depende de WO6). |

---

## 11. Reglas de exportación/import Excel

### Formato

- **Formato único para import/export**: Excel (.xlsx) con hojas por servicio.
- Codificación: UTF-8 con BOM.
- Fechas en formato ISO (YYYY-MM-DD).
- Valores vacíos como celdas vacías, no como "null" o "-".
- Booleanos como TRUE/FALSE.
- Listas desplegables en `05_CATALOGOS` para valores controlados.

### Comportamiento de import

1. El parser lee cada hoja de servicio y descompone cada fila en las entidades del modelo lógico.
2. Valida que `tipo_acto_fh` sea un valor de la lista controlada.
3. Valida que `marca_comercial` no esté vacía para actos que involucren medicación.
4. Si `demo_flag = TRUE`, marca los datos como demo.
5. Ignora hojas que no estén en el mapa (p.ej., hojas temporales).
6. La hoja `99_CONFIG_EXPORT_MAP` define el mapeo columnas → entidades (opcional, para personalización).

### Reglas de importación clínica

1. **No perder líneas históricas**: si una línea ya existe con `estado_linea = historico`, no se sobrescribe.
2. **No convertir suspensión en alta**: si `tipo_acto_fh = suspension`, la línea debe quedar como histórica.
3. **Validación obligatoria para fármacos nuevos**: si aparece un `tratamiento_id` nuevo con `tipo_relacion = principal`, debe existir un acto de `validacion_inicial` o `nueva_validacion_adicion` asociado.
4. **Marca comercial requerida**: no se puede importar una línea de tratamiento sin `marca_comercial`.

---

## 12. Reglas para evitar pérdida de información

1. **No truncar histórico**: las líneas históricas o finalizadas se conservan. No se filtran.

2. **No colapsar multibiológico**: N líneas activas = N filas separadas. No concatenar.

3. **Texto libre + código**: si hay pauta normalizada, se registra código y texto. Si no, solo texto. Nunca se pierde el texto original.

4. **Causalidad completa**: el resultado de Naranjo debe exportarse siempre que exista.

5. **PROMs sin fecha**: si no hay fecha, la fila se exporta igual con la fecha vacía.

6. **Concomitantes incompletos**: se exporta el fármaco aunque no tenga pauta normalizada.

7. **Demo flag**: todos los datos de demostración llevan `demo_flag = TRUE`.

---

## 13. Compatibilidad futura con base de datos

### Principio

El modelo relacional definido en §9.3 está diseñado para que cada entidad se convierta en tabla SQL con:

- Clave primaria (PK) UUID por fila.
- Claves foráneas (FK) con integridad referencial.
- Tipos directamente asignables (TEXT, INTEGER, REAL, DATE, BOOLEAN).
- Sin celdas con múltiples valores.

### Migración desde Excel a BD

1. El parser lee las hojas operativas y las descompone en el modelo relacional.
2. Desde el modelo relacional, la migración a SQL es directa: cada entidad es una tabla.
3. Las relaciones 1:N se mantienen mediante FK.
4. Las listas controladas (tipos de acto, estados, etc.) se convierten en tablas de dominio o CHECK constraints.

---

## 14. Campos P0/P1/P2

### P0 — Imprescindibles en WO8.1

- `patient_id`, `cip_demo_o_hash`, `servicio_origen`, `patologia_indicacion`
- `fecha_acto`, `tipo_acto_fh`, `profesional_fh`
- `marca_comercial`, `principio_activo`, `dosis_presentacion`, `via`
- `tipo_relacion`, `estado_linea`, `es_principal`, `fecha_inicio`, `fecha_fin`
- `hay_efecto_adverso`, `ea_gravedad`, `farmaco_sospechoso_nombre`, `causalidad_naranjo`
- `demo_flag`, `created_at`

### P1 — Deseables en WO8.1, obligatorios en WO8.2

- `codigo_nacional`, `numero_registro`, `source_type`
- `pauta_codigo`, `pauta_label`, `pauta_intervalo_dias`, `pauta_otro_texto`
- `motivo_inicio_cambio_suspension`
- `tb_estado`, `serologias_estado`, `vacunas_estado`, `bloqueantes_validacion`
- `adherencia_morisky`, `haq`, `eva_dolor`, `dlqi`
- `causalidad_karch`
- `nhc_o_codigo_interno`

### P2 — Futuro

- `created_at`, `updated_at` completos
- Catálogo completo de pautas
- Categoría de fármaco detallada
- Dosis estructurada (valor + unidad)

---

## 15. Recomendación de implementación WO8.1

### WO8.1a — Plantilla Excel operativa

Crear la plantilla Excel (.xlsx) con:

- Hojas `01_DERMA`, `02_REUMA`, `03_DIGESTIVO`, `04_ONCO` con el esquema de columnas A-H.
- Hoja `05_CATALOGOS` con listas desplegables y fármacos especiales.
- Hoja `99_CONFIG_EXPORT_MAP` (opcional técnica).
- Validaciones de datos y listas desplegables integradas.

### WO8.1b — Parser/interpretador del Excel

Implementar función en el Hub que:

1. Lee el Excel subido.
2. Valida estructura contra el contrato.
3. Descompone cada fila en el modelo lógico interno.
4. Almacena en memoria o exporta a JSON/CSV analítico.

### WO8.1c — Export analítico normalizado

Generar, desde el parser:

- Export en formato normalizado (10 hojas del modelo relacional).
- CSV/Excel analítico desacoplado del formato operativo.

### Prioridad

**WO8.1a primero.** La plantilla Excel es la base operativa. El parser y el export analítico dependen de que la plantilla esté definida y validada por Farmacia.

### Archivos a tocar

| Fase | Archivos |
|---|---|
| WO8.1a | `scripts/farmacia_export_plantilla.js` (nuevo), `tools/farmacia_export_plantilla_check.mjs` (nuevo) |
| WO8.1b | `scripts/farmacia_parser_excel.js` (nuevo), `tools/farmacia_parser_excel_check.mjs` (nuevo) |
| WO8.1c | `scripts/farmacia_export_analitic.js` (nuevo), o reutilizar estructura de WO8.0 original |

### No tocar

- `main`, rama demo, `FarmaciaTratamiento`, `FarmaciaPautasCatalog`.
- Datos demo JSON.
- Pantallas de captura (seguimiento, PV, validación).

---

**Status:** `pending_review`
