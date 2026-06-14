# WO8 — Contrato de exportación longitudinal Farmacia Hospitalaria

**Versión:** 1.0  
**Fecha:** 2026-06-14  
**WO asociada:** WO8.0 (documental)  
**Estado:** `pending_review`  
**Rama:** `work/farmacia-post-demo-wo7g2-dashboard-timeline-20260614`  

---

## 1. Objetivo

Definir la estructura, entidades, reglas y columnas para la exportación longitudinal de datos del módulo de Farmacia Hospitalaria del Hub Clínico Badajoz. El contrato está diseñado para ser implementable como:

- exportación CSV/Excel desde el navegador (WO8.1);
- migración futura a base de datos relacional (WO8.2+);
- fuente de análisis clínico y de servicio.

---

## 2. Alcance y no alcance

### Alcance

- Tratamientos biológicos (principales, adicionales, históricos, exposiciones).
- Fármacos concomitantes.
- Visitas de seguimiento farmacoterapéutico.
- Eventos de tratamiento (inicio, fin, cambio, suspensión, intensificación).
- Efectos adversos y atribución de causalidad.
- PROMs, PREMs y adherencia (Morisky-Green, HAQ, EVA, DLQI).
- Validación prebiológica y bloqueantes.
- Pautas normalizadas (código + texto).
- Datos demográficos básicos del paciente.

### No alcance

- Exportación de datos no farmacológicos (episodios asistenciales no relacionados, comorbilidades no medicamentosas).
- Dashboard como fuente de verdad (es proyección, no origen).
- Estadísticas agregadas (son derivadas, no raw).
- Integración con sistemas externos (SIL, HCIS).
- Autenticación/autorización de usuarios.
- Registro de actividad (audit log de quién exportó).
- Prescripción electrónica ni validación en origen.

---

## 3. Principios de diseño

1. **Marca comercial como nombre principal** — criterio clínico validado por Sil. El medicamento concreto (Benlysta, Orencia, Rixathon) es el identificador visible. El principio activo es campo secundario obligatorio.

2. **Una fila = un evento atómico**. Cada fila de exportación representa un hecho clínico discreto: una línea de tratamiento, una visita, un EA, un PROM.

3. **No hay pérdida por agregación**. Si hay N líneas de tratamiento, hay N filas. Si hay M visitas, hay M filas. No colapsar.

4. **Texto libre no sustituye a código normalizado**. Cuando exista `pauta_codigo`, debe exportarse. El texto visible es adicional.

5. **Histórico no se convierte en activo**. La exportación debe preservar `estado_linea` y `tipo_relacion` exactamente como están registrados.

6. **El dashboard es proyección, no fuente**. La exportación se alimenta de datos de captura (validación, primera visita, seguimiento) y del dataset longitudinal.

7. **Migrable a base de datos**. La estructura debe poder traducirse a tablas SQL con claves foráneas sin rediseño mayor.

8. **Excel único con múltiples hojas**. Una sola hoja plana mezclaría dominios diferentes; hojas separadas permiten análisis granular y JOIN conceptual.

---

## 4. Entidades del modelo

| Entidad | Descripción | Fuente principal |
|---|---|---|
| `Paciente` | Datos demográficos básicos | `farmacia_common.js` / dataset demo |
| `LineaTratamiento` | Línea de tratamiento biológico (principal, adicional, histórico, exposición) | `FarmaciaTratamiento.buildTreatmentFromPatient()` + `patient.biologicos` |
| `VisitaSeguimiento` | Visita de seguimiento farmacoterapéutico | `farmacia_seguimiento.js` — datos de visita |
| `EventoTratamiento` | Hito temporal (inicio, fin, cambio terapéutico, suspensión, intensificación) | `longDataset.cambios_pauta` + `patient.tratamientos` |
| `EfectoAdverso` | Evento adverso con atribución de fármaco sospechoso y causalidad | `farmacia_seguimiento.js` — bloque EA |
| `FarmacoConcomitante` | Medicación concomitante, adicional o exposición registrada en seguimiento | `farmacia_seguimiento.js` — `followupOtherDrugs` |
| `PrebiologicoValidacion` | Validación prebiológica (serologías, TB, vacunas, bloqueantes) | `FarmaciaPrebiologico` |
| `PromsAdherencia` | PROMs (DLQI, HAQ, EVA), adherencia Morisky-Green | `farmacia_dashboard_paciente.js` — `patient.proms` |
| `CatalogoFarmacos` | Catálogo local de fármacos (CIMA + entradas manuales) | `FarmaciaTratamiento` / catálogo CIMA |
| `CatalogoPautas` | Catálogo de pautas normalizadas | `FarmaciaPautasCatalog` (WO6) |

---

## 5. Hojas/tablas propuestas

| # | Hoja/Tabla | Propósito | Prioridad WO8.1 |
|---|---|---|---|
| 01 | `01_pacientes` | Datos demográficos y de filiación | P0 |
| 02 | `02_lineas_tratamiento` | Todas las líneas de tratamiento biológico | P0 |
| 03 | `03_visitas_seguimiento` | Visitas de seguimiento con datos clínicos | P0 |
| 04 | `04_eventos_tratamiento` | Hitos y cambios en el timeline | P0 |
| 05 | `05_efectos_adversos` | EAs con atribución y causalidad | P0 |
| 06 | `06_farmacos_concomitantes` | Concomitantes, adicionales, históricos, exposiciones | P0 |
| 07 | `07_prebiologico_validacion` | Validación prebiológica | P1 |
| 08 | `08_proms_adherencia` | PROMs, PREMs, adherencia | P1 |
| 09 | `09_catalogo_farmacos_local` | Catálogo de fármacos (CIMA + local) | P1 |
| 10 | `10_catalogo_pautas` | Catálogo de pautas normalizadas | P2 |

**Nota:** `07_prebiologico_validacion`, `09_catalogo_farmacos_local` y `10_catalogo_pautas` son opcionales en WO8.1 porque son catálogos estáticos o pendientes de normalización completa de WO6. Se incluyen en el contrato para completitud.

---

## 6. Claves e identificadores

| Clave | Tipo | Ámbito | Propósito |
|---|---|---|---|
| `patient_id` | UUID / hash | Global | Identificador único del paciente |
| `cip_demo_o_hash` | string | Demo | CIP de demostración o hash del CIP real |
| `tratamiento_id` | UUID | Línea de tratamiento | Identificador único de cada línea registrada |
| `linea_id` | string | Biológico | Identificador de la línea biológica (BIO-FH-004-L1, etc.) |
| `visita_id` | UUID | Seguimiento | Identificador único de cada visita |
| `ea_id` | UUID | Efecto adverso | Identificador único de cada EA |
| `farmaco_sospechoso_id` | string | EA | Referencia al fármaco (tratamiento_id, uid de concomitante) |
| `pauta_codigo` | string | Pauta | Código normalizado de pauta (CADA_4_SEMANAS, etc.) |
| `codigo_nacional` | string | Fármaco | Código nacional del medicamento (si existe) |
| `nregistro` | string | Fármaco | Número de registro del medicamento |
| `demo_flag` | boolean | Global | True si el dato es de demostración |

**Regla:** `tratamiento_id` debe ser estable a lo largo del tiempo para permitir trazabilidad de cambios terapéuticos. `linea_id` es la agrupación lógica (p.ej., todas las modificaciones sobre la línea Belimumab).

---

## 7. Relación paciente-tratamiento-seguimiento

```
Paciente (1) ───< Línea de tratamiento (N)
Paciente (1) ───< Visita de seguimiento (N)
Línea de tratamiento (1) ───< Evento de tratamiento (N)
Visita de seguimiento (1) ───< Efecto adverso (N)
Visita de seguimiento (1) ───< Fármaco concomitante (N)
Visita de seguimiento (1) ───< PROM/Adherencia (1)
Línea de tratamiento (1) ───< Prebiológico/validación (1)
```

Cardinalidades orientativas: un paciente puede tener múltiples líneas de tratamiento (multibiológico), cada línea puede tener múltiples eventos en el tiempo, y cada visita puede registrar múltiples EAs y concomitantes.

---

## 8. Columnas mínimas por hoja

### 01_pacientes

| Columna | Tipo | P0/P1 | Descripción |
|---|---|---|---|
| `patient_id` | string | P0 | Clave primaria |
| `cip_demo_o_hash` | string | P0 | CIP demo o hash |
| `nombre` | string | P0 | Nombre del paciente (demo o anonimizado) |
| `edad` | number | P0 | Edad en años |
| `sexo` | string | P0 | Sexo |
| `servicio` | string | P0 | Servicio clínico de referencia |
| `patologia` | string | P0 | Patología/indicación principal |
| `fecha_alta` | date | P0 | Fecha de alta en programa |
| `primera_visita` | date | P1 | Fecha de primera visita |
| `demo_flag` | boolean | P0 | Flag de datos demo |
| `created_at` | datetime | P1 | Fecha de creación del registro |

### 02_lineas_tratamiento

| Columna | Tipo | P0/P1 | Descripción |
|---|---|---|---|
| `patient_id` | string | P0 | FK a paciente |
| `tratamiento_id` | string | P0 | PK del tratamiento |
| `linea_id` | string | P0 | Identificador de línea biológica |
| `orden` | number | P0 | Orden de la línea (1, 2, 3...) |
| `marca_comercial` | string | P0 | **Nombre principal** (Benlysta, Orencia, Rixathon) |
| `principio_activo` | string | P0 | Principio activo (Belimumab, Abatacept, Rituximab) |
| `codigo_nacional` | string | P1 | Código nacional del medicamento |
| `nregistro` | string | P1 | Número de registro |
| `source_type` | string | P1 | CIMA, LOCAL, DEMO |
| `dosis` | string | P0 | Dosis y presentación |
| `via` | string | P0 | Vía de administración |
| `pauta_codigo` | string | P1 | Código de pauta normalizada |
| `pauta_label` | string | P1 | Etiqueta visible de pauta |
| `pauta_intervalo_dias` | number | P1 | Intervalo en días (si aplica) |
| `pauta_otro_texto` | string | P1 | Texto libre de pauta (si aplica) |
| `tipo_relacion` | string | P0 | principal, adicional, concomitante, historico, exposicion |
| `estado_linea` | string | P0 | activo, suspendido, historico, finalizado, anadido |
| `tipo_movimiento` | string | P0 | sin_cambios, cambio_terapeutico, tratamiento_anadido, suspension |
| `es_principal` | boolean | P0 | True si es la línea principal actual |
| `fecha_inicio` | date | P0 | Fecha de inicio de la línea |
| `fecha_fin` | date | P0 | Fecha de fin/suspensión (vacío si activa) |
| `motivo_inicio` | string | P1 | Motivo clínico de inicio |
| `motivo_cambio` | string | P1 | Motivo de cambio terapéutico |
| `motivo_suspension` | string | P1 | Motivo de suspensión |
| `demo_flag` | boolean | P0 | Flag de datos demo |

### 03_visitas_seguimiento

| Columna | Tipo | P0/P1 | Descripción |
|---|---|---|---|
| `patient_id` | string | P0 | FK a paciente |
| `visita_id` | string | P0 | PK de la visita |
| `fecha_visita` | date | P0 | Fecha de la visita |
| `servicio_origen` | string | P1 | Servicio clínico que realiza la visita |
| `patologia_momento` | string | P1 | Patología activa en el momento |
| `linea_seleccionada_id` | string | P0 | Línea activa seleccionada en la visita |
| `marca_comercial_linea` | string | P0 | Marca de la línea seleccionada |
| `tipo_movimiento_visita` | string | P0 | Movimiento registrado en la visita |
| `estado_linea_visita` | string | P0 | Estado de la línea en la visita |
| `pauta_actual_codigo` | string | P1 | Código de pauta |
| `pauta_actual_label` | string | P1 | Etiqueta de pauta |
| `pauta_actual_otro` | string | P1 | Texto libre de pauta |
| `observaciones` | string | P1 | Observaciones de la visita |
| `es_primera_visita` | boolean | P0 | True si es la primera visita |
| `demo_flag` | boolean | P0 | Flag de datos demo |

### 04_eventos_tratamiento

| Columna | Tipo | P0/P1 | Descripción |
|---|---|---|---|
| `patient_id` | string | P0 | FK a paciente |
| `tratamiento_id` | string | P0 | FK a línea de tratamiento (opcional) |
| `fecha_evento` | date | P0 | Fecha del evento |
| `tipo_evento` | string | P0 | inicio, fin, cambio_farmaco, tratamiento_anadido, suspension, intensificacion |
| `marca_comercial` | string | P0 | Marca asociada al evento |
| `principio_activo` | string | P1 | Principio activo asociado |
| `descripcion` | string | P1 | Descripción del evento |
| `motivo` | string | P1 | Motivo clínico |
| `servicio_solicitante` | string | P1 | Servicio que registra el cambio |
| `estado_validacion` | string | P1 | validado, pendiente, en_seguimiento |
| `demo_flag` | boolean | P0 | Flag de datos demo |

### 05_efectos_adversos

| Columna | Tipo | P0/P1 | Descripción |
|---|---|---|---|
| `patient_id` | string | P0 | FK a paciente |
| `visita_id` | string | P1 | FK a visita |
| `ea_id` | string | P0 | PK del EA |
| `fecha_ea` | date | P0 | Fecha del EA |
| `ea_descripcion` | string | P0 | Descripción del EA |
| `ea_gravedad` | string | P0 | Grave, Moderado, Leve |
| `farmaco_sospechoso_id` | string | P0 | Referencia al fármaco (tratamiento_id o uid concomitante) |
| `farmaco_sospechoso_nombre` | string | P0 | Nombre del fármaco sospechoso |
| `causalidad_naranjo` | string | P0 | Definitiva, Probable, Posible, Dudosa |
| `causalidad_karch` | string | P1 | Karch-Lasagna si aplica |
| `ea_resuelto` | boolean | P1 | True si resuelto |
| `ea_requiere_intervencion` | boolean | P1 | True si requirió intervención |
| `demo_flag` | boolean | P0 | Flag de datos demo |

### 06_farmacos_concomitantes

| Columna | Tipo | P0/P1 | Descripción |
|---|---|---|---|
| `patient_id` | string | P0 | FK a paciente |
| `visita_id` | string | P1 | FK a visita |
| `uid_concomitante` | string | P0 | PK del registro |
| `farmaco_nombre` | string | P0 | Nombre del fármaco |
| `principio_activo` | string | P1 | Principio activo |
| `dosis` | string | P1 | Dosis |
| `via` | string | P1 | Vía de administración |
| `pauta_codigo` | string | P1 | Código de pauta normalizada |
| `pauta_label` | string | P1 | Etiqueta de pauta |
| `pauta_otro_texto` | string | P1 | Texto libre |
| `tipo_relacion` | string | P0 | concomitante, adicional, historico, exposicion, sospechoso_ea |
| `sospechoso_ea` | boolean | P0 | True si se marcó como sospechoso de EA |
| `demo_flag` | boolean | P0 | Flag de datos demo |

### 07_prebiologico_validacion

| Columna | Tipo | P0/P1 | Descripción |
|---|---|---|---|
| `patient_id` | string | P0 | FK a paciente |
| `tb_resultado` | string | P1 | Resultado de TB |
| `serologias_resultado` | string | P1 | Resultado de serologías |
| `vacunas_estado` | string | P1 | Estado de vacunación |
| `bloqueante_activo` | string | P1 | Bloqueante activo si aplica |
| `bloqueante_fecha_inicio` | date | P1 | Fecha de inicio del bloqueante |
| `bloqueante_fecha_fin` | date | P1 | Fecha de fin del bloqueante |
| `prebiologico_estado` | string | P1 | ok, alerta, pendiente, no_aplica |
| `demo_flag` | boolean | P0 | Flag de datos demo |

### 08_proms_adherencia

| Columna | Tipo | P0/P1 | Descripción |
|---|---|---|---|
| `patient_id` | string | P0 | FK a paciente |
| `fecha_prom` | date | P1 | Fecha de medición |
| `dlqi` | number | P1 | DLQI score (0-30) |
| `eva_dolor` | number | P1 | EVA dolor (0-10) |
| `eva_prurito` | number | P1 | EVA prurito (0-10) |
| `haq` | number | P1 | HAQ score (0-3) |
| `morisky_green` | string | P1 | Alta, Media, Baja adherencia |
| `morisky_green_score` | number | P1 | Score numérico (0-4) |
| `demo_flag` | boolean | P0 | Flag de datos demo |

---

## 9. Tratamientos biológicos

### Reglas

1. **Marca comercial primero**: cada línea de tratamiento se exporta con `marca_comercial` como nombre principal (Benlysta, Orencia, Rixathon). `principio_activo` es campo obligatorio secundario (Belimumab, Abatacept, Rituximab).

2. **Una fila por línea**: si el paciente tiene N líneas (principal + adicionales), se exportan N filas en `02_lineas_tratamiento`. No se colapsan.

3. **Estado explícito**: cada línea lleva `estado_linea`, `tipo_relacion` y `es_principal`. El consumidor puede reconstruir el estado actual sin interpretación.

4. **Multibiológico**: varias líneas con `es_principal=false` y `estado_linea=activo` o `añadido`. La línea con `es_principal=true` es la principal; las demás son complementarias.

5. **Histórico**: línea con `estado_linea=historico` o `finalizado` y `fecha_fin` poblada. No debe desaparecer del export.

### Ejemplo FH-004

| linea_id | marca_comercial | principio_activo | estado_linea | tipo_relacion | es_principal | fecha_inicio | fecha_fin |
|---|---|---|---|---|---|---|---|
| BIO-FH-004-L1 | Orencia | Abatacept | historico | cambio_terapeutico | false | 2025-09-01 | 2026-02-10 |
| BIO-FH-004-L2 | Benlysta | Belimumab | activo | base | true | 2026-02-20 | |
| BIO-FH-004-L3 | Rixathon | Rituximab | anadido | tratamiento_anadido | false | 2026-05-28 | |

---

## 10. Concomitantes/adicionales/históricos/exposiciones

### Reglas

1. Los fármacos registrados en `followupOtherDrugs` se exportan en `06_farmacos_concomitantes`.
2. El campo `tipo_relacion` distingue: `concomitante`, `adicional`, `historico`, `exposicion`, `sospechoso_ea`.
3. Si un fármaco concomitante está marcado como sospechoso de EA, se refleja en `sospechoso_ea=true` y se referencia también en `05_efectos_adversos`.
4. No mezclar líneas de tratamiento principal con concomitantes. Son dos hojas separadas.
5. La pauta del concomitante debe exportarse con `pauta_codigo` si está normalizada, y con `pauta_otro_texto` si es texto libre.

---

## 11. Pautas normalizadas

### Reglas

1. Toda pauta debe exportarse como **código + etiqueta** si está normalizada en `FarmaciaPautasCatalog`.
2. `pauta_codigo`: identificador único (CADA_4_SEMANAS, CADA_8_SEMANAS, SEMANAL, MENSUAL, etc.).
3. `pauta_label`: texto visible ("Cada 4 semanas", "Semanal", etc.).
4. `pauta_intervalo_dias`: intervalo numérico en días si aplica (28, 7, etc.).
5. `pauta_otro_texto`: preserva el texto libre original si la pauta no es normalizable.
6. La pauta como texto visible en pantalla se conserva, pero no debe ser el único campo exportado.

### Formato CSV propuesto

```
pauta_codigo, pauta_label, pauta_intervalo_dias, pauta_otro_texto
SEMANAL, Semanal, 7,
CADA_2_SEMANAS, Cada 2 semanas, 14,
CADA_4_SEMANAS, Cada 4 semanas, 28,
CADA_8_SEMANAS, Cada 8 semanas, 56,
MENSUAL, Mensual, 30,
,,, "Texto libre original"
```

---

## 12. Efectos adversos y causalidad

### Reglas

1. Cada EA se exporta como una fila en `05_efectos_adversos`.
2. `farmaco_sospechoso_id` referencia al fármaco: puede ser un `tratamiento_id` (de línea principal) o un `uid_concomitante` (de concomitante).
3. `farmaco_sospechoso_nombre` es el nombre visible del fármaco (marca o nombre genérico).
4. `causalidad_naranjo` usa los valores del algoritmo de Naranjo: `Definitiva`, `Probable`, `Posible`, `Dudosa`.
5. Un mismo EA puede tener múltiples fármacos sospechosos si hay atribución múltiple (cada combinación es una fila, o se usa el mismo `ea_id` con distintos `farmaco_sospechoso_id`).
6. Los campos de causalidad (Naranjo, Karch) deben exportarse como texto, no como código interno.

---

## 13. PROMs/PREMs/adherencia

### Reglas

1. Cada medición de PROM se exporta como una fila en `08_proms_adherencia`.
2. Se incluyen: DLQI, EVA dolor, EVA prurito, HAQ.
3. Adherencia Morisky-Green se exporta como categoría (Alta, Media, Baja) más score numérico.
4. No mezclar en la misma fila con datos de tratamiento o EA. La hoja es temática.
5. La fecha de medición (`fecha_prom`) permite orden cronológico.
6. P1 porque los datos actuales son mayoritariamente demo y la estructura de captura puede evolucionar.

---

## 14. Prebiológico/validación

### Reglas

1. Se exporta como hoja separada `07_prebiologico_validacion` (P1).
2. Incluye el resultado de evaluación de TB, serologías y estado vacunal.
3. Incluye bloqueante prebiológico si aplica (tipo, fecha inicio, fecha fin).
4. No se mezcla con línea de tratamiento: el prebiológico valida condiciones previas, no el tratamiento en sí.
5. Cada paciente puede tener múltiples evaluaciones prebiológicas si ha cambiado de tratamiento o han pasado revisiones periódicas.

---

## 15. Timeline longitudinal

### Reglas

1. Los eventos del timeline se exportan en `04_eventos_tratamiento`.
2. Cada evento representa un hito: inicio de tratamiento, fin, cambio farmacológico, adición, suspensión, intensificación.
3. La fuente de datos es `patient.cambios_pauta` + `patient.tratamientos` del longDataset.
4. Cada evento lleva `fecha_evento`, `tipo_evento`, y la `marca_comercial` / `principio_activo` asociados.
5. El orden cronológico se reconstruye ordenando por `fecha_evento`.
6. No se pierde ningún evento: los fines de Abatacept y cambios a Belimumab deben estar presentes.

---

## 16. Reglas de exportación CSV/Excel

### Formato

- **Formato único**: Excel (.xlsx) con múltiples hojas.
- Hoja por tabla (01_pacientes, 02_lineas_tratamiento, etc.).
- Primera fila: cabeceras con nombres de columna.
- Codificación: UTF-8 con BOM (para compatibilidad Excel español).
- Fechas en formato ISO (YYYY-MM-DD).
- Valores vacíos como celdas vacías, no como "null", "N/A" o "-".
- Booleanos como TRUE/FALSE.

### Comportamiento

1. Exportación desde el Dashboard Paciente, opción "Exportar datos longitudinales".
2. Filtro opcional por paciente (un solo paciente) o todos los visibles.
3. Si se exporta un solo paciente, las hojas contienen solo datos de ese paciente.
4. Si se exportan varios, las hojas contienen datos agrupados con `patient_id` como discriminante.
5. El archivo se descarga al navegador, no se almacena en servidor.
6. Nombre de archivo: `exportacion_farmacia_YYYYMMDD_HHMM.xlsx`.

### Sin implementar en WO8.1

- Selección de hojas a exportar (se exportan todas).
- Filtros por rango de fechas.
- Filtros por tipo de evento.
- Personalización de columnas.

---

## 17. Reglas para evitar pérdida de información

1. **No truncar histórico**: las líneas con `estado_linea=historico` o `finalizado` se exportan en `02_lineas_tratamiento` igual que las activas. No se filtran.

2. **No colapsar multibiológico**: N líneas activas = N filas separadas. No concatenar en una celda.

3. **Texto libre + código**: si hay pauta normalizada, se exporta código y texto. Si no, se exporta solo texto. Nunca se pierde el texto original.

4. **Causalidad completa**: aunque el algoritmo de Naranjo tenga ítems opcionales, el resultado final (Definitiva/Probable/Possible/Dudosa) debe exportarse siempre que exista.

5. **PROMs sin fecha**: si no hay fecha de medición, la fila se exporta igual con la fecha vacía. No se descarta.

6. **Concomitantes sin pauta**: se exporta el fármaco aunque no tenga pauta normalizada. No silenciar filas por datos incompletos.

7. **Demo flag**: todos los datos de demostración llevan `demo_flag=TRUE`. Los datos reales futuros llevarán `demo_flag=FALSE`. Esto evita mezclar en análisis.

---

## 18. Compatibilidad futura con base de datos

La estructura de hojas está diseñada para que cada hoja pueda convertirse en tabla SQL con:

- Clave primaria (PK) compuesta o UUID por fila.
- Claves foráneas (FK) referenciadas por columnas con prefijo `_id`.
- Tipos de columna directamente asignables (TEXT, INTEGER, REAL, DATE, BOOLEAN).
- Sin celdas con múltiples valores (no listas separadas por comas).

### Mapeo tabla a SQL

| Hoja | PK propuesta | FK |
|---|---|---|
| pacientes | patient_id | — |
| lineas_tratamiento | tratamiento_id | patient_id → pacientes |
| visitas_seguimiento | visita_id | patient_id → pacientes |
| eventos_tratamiento | (evento_id) | patient_id, tratamiento_id |
| efectos_adversos | ea_id | patient_id, visita_id, farmaco_sospechoso_id |
| farmacos_concomitantes | (uid_concomitante) | patient_id, visita_id |
| prebiologico_validacion | (prebio_id) | patient_id |
| proms_adherencia | (prom_id) | patient_id |
| catalogo_farmacos | (codigo_nacional) | — |
| catalogo_pautas | pauta_codigo | — |

---

## 19. Campos P0/P1/P2

### P0 — Imprescindibles en WO8.1

- `patient_id`, `cip_demo_o_hash`, `nombre`, `edad`, `sexo`, `servicio`, `patologia`
- `tratamiento_id`, `linea_id`, `orden`, `marca_comercial`, `principio_activo`, `dosis`, `via`
- `tipo_relacion`, `estado_linea`, `tipo_movimiento`, `es_principal`, `fecha_inicio`, `fecha_fin`
- `visita_id`, `fecha_visita`, `linea_seleccionada_id`, `marca_comercial_linea`
- `ea_id`, `ea_descripcion`, `ea_gravedad`, `farmaco_sospechoso`, `causalidad_naranjo`
- `uid_concomitante`, `farmaco_nombre`, `sospechoso_ea`
- `demo_flag`

### P1 — Deseables en WO8.1, obligatorios en WO8.2

- `codigo_nacional`, `nregistro`, `source_type`
- `pauta_codigo`, `pauta_label`, `pauta_intervalo_dias`, `pauta_otro_texto`
- `motivo_inicio`, `motivo_cambio`, `motivo_suspension`
- `descripcion` de evento
- `causalidad_karch`
- `servicio_origen`, `servicio_solicitante`
- `dlqi`, `eva_dolor`, `eva_prurito`, `haq`, `morisky_green`
- `tb_resultado`, `serologias_resultado`, `prebiologico_estado`

### P2 — Futuro

- `created_at`, `updated_at`
- Datos de catálogo de fármacos completo (09)
- Catálogo de pautas completo (10)
- Campos de fase de tratamiento, inducción/mantenimiento
- Campos de dosis estructurada (dosis_valor + dosis_unidad)

---

## 20. Recomendación de implementación WO8.1

### Enfoque

Implementar WO8.1 como exportación desde el Dashboard Paciente usando las funciones ya existentes:

1. **`getPatientBiologicLines()`** — fuente para `02_lineas_tratamiento`.
2. **`patient.proms`** — fuente para `08_proms_adherencia`.
3. **`patient.eventos_adversos`** — fuente para `05_efectos_adversos`.
4. **`followupOtherDrugs`** (vía `farmacia_seguimiento.js`) — fuente para `06_farmacos_concomitantes`.
5. **`patient.tratamientos` + `patient.cambios_pauta`** — fuente para `04_eventos_tratamiento`.
6. **longDataset** — fuente consolidada para todas las anteriores.

### Archivos a implementar

- `scripts/farmacia_dashboard_paciente.js` — añadir función `exportLongitudinalData(patient)`.
- `farmacia_dashboard_paciente.html` — añadir botón "Exportar datos" en la sección longitudinal.
- `tools/farmacia_export_longitudinal_check.mjs` — tests.
- Dependencias: `xlsx` (SheetJS) o generación CSV manual.

### Archivos a NO tocar

- `farmacia_seguimiento.js` — solo lectura de datos existentes.
- `FarmaciaTratamiento` — consumir, no modificar.
- `FarmaciaPautasCatalog` — consumir, no modificar.
- `main`, rama demo.

### Orden de prioridad WO8.1

1. Exportar paciente actual desde Dashboard Paciente (botón + Excel).
2. Hojas P0: pacientes, líneas, visitas, eventos, EA, concomitantes.
3. Hojas P1: prebiológico, PROMs.
4. Validar con FH-001, FH-004.

### Tests sugeridos

- Export produce archivo con extension .xlsx
- FH-004 líneas de tratamiento = 3 filas (Orencia, Benlysta, Rixathon)
- FH-004 eventos de tratamiento ≥ 5 (inicio Orencia, fin Orencia, cambio, inicio Benlysta, inicio Rixathon)
- Marca comercial es primer campo de fármaco
- Principio activo presente como campo secundario
- Las 6 hojas P0 tienen datos
- demo_flag = TRUE en todos los registros demo
- No hay filas sin patient_id

---

**Status:** `pending_review`
