# Contrato de Evento Longitudinal Común v1

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Proyecto:** Hub Clínico Reuma / PROMueve Extremadura  
**Tipo:** Documento de contrato documental MVP  
**Estado:** Pendiente de validación clínica  
**Aplica a:** Reumatología, Enfermería, Farmacia Hospitalaria

---

## 1. Objetivo

Definir la estructura mínima de un **evento longitudinal** que permita construir una timeline unificada del paciente a partir de registros originados en distintos módulos (Reuma, Enfermería, Farmacia), sin necesidad de que escriban en la misma fuente física.

Cada módulo conserva su Excel propio (según DEC-006/007/008), pero todos generan eventos que alimentan una visión longitudinal común.

---

## 2. Estructura del evento común

| # | Campo | Tipo | Obligatorio | Origen | Descripción |
|---|-------|------|-------------|--------|-------------|
| 1 | `evento_id` | `string` | ✅ Sí | Sistema | Identificador único del evento (UUID o hash) |
| 2 | `cip_paciente` | `string` | ✅ Sí | Precarga Reuma | CIP del paciente. Identificador canónico del proyecto |
| 3 | `fecha_evento` | `date` | ✅ Sí | Origen | Fecha ISO 8601 del evento (YYYY-MM-DD) |
| 4 | `hora_evento` | `time` | ❌ Opcional | Origen | Hora si aplica (HH:MM) |
| 5 | `origen_modulo` | `string` | ✅ Sí | Sistema | Módulo que origina: `reumatologia`, `enfermeria`, `farmacia` |
| 6 | `patologia` | `string` | ❌ Opcional | Precarga Reuma | Código de patología si aplica: `ESPA`, `APS`, `AR`, `LES`, `SJOGREN`, `NULL` |
| 7 | `tipo_evento` | `string` | ✅ Sí | Origen | Tipo: `visita`, `seguimiento_enfermeria`, `educacion_terapeutica`, `validacion_fh`, `efecto_adverso`, `incidencia`, `otro` |
| 8 | `profesional_rol` | `string` | ✅ Sí | Origen | Rol del profesional: `reumatologo`, `enfermeria`, `farmaceutico` |
| 9 | `profesional_nombre` | `string` | ❌ Opcional | Origen | Nombre del profesional (sin datos personales reales en MVP) |
| 10 | `resumen_evento` | `text` | ✅ Sí | Origen | Descripción breve del evento. Texto libre no estructurado |
| 11 | `estado` | `string` | ✅ Sí | Origen | Estado: `completado`, `pendiente`, `en_curso`, `cancelado`, `requiere_revision` |
| 12 | `requiere_valoracion_medica` | `boolean` | ✅ Sí | Origen | `true` si el evento necesita revisión por Reumatología |
| 13 | `referencia_origen` | `string` | ✅ Sí | Sistema | Referencia al registro origen: `{modulo}:{excel}:{hoja}:{fila}` |
| 14 | `observaciones` | `text` | ❌ Opcional | Origen | Observaciones adicionales de texto libre |
| 15 | `fecha_registro` | `datetime` | ✅ Sí | Sistema | Timestamp de cuándo se registró el evento en el sistema |

---

## 3. Reglas de valores

| Campo | Valores permitidos |
|-------|-------------------|
| `origen_modulo` | `reumatologia`, `enfermeria`, `farmacia` |
| `tipo_evento` | `visita`, `seguimiento_enfermeria`, `educacion_terapeutica`, `validacion_fh`, `efecto_adverso`, `incidencia`, `otro` |
| `estado` | `completado`, `pendiente`, `en_curso`, `cancelado`, `requiere_revision` |
| `requiere_valoracion_medica` | `true`, `false` |

---

## 4. Mapeo por módulo

### 4.1 Eventos originados en Reumatología

| Dato Reuma | Evento longitudinal |
|------------|---------------------|
| Visita médica (primera o seguimiento) | `tipo_evento = visita`, fecha = `Fecha_Visita`, profesional_rol = `reumatologo` |
| Cambio terapéutico | Puede generar evento adicional con `tipo_evento = otro`, resumen describiendo el cambio |
| Prebiológico | Genera evento con `tipo_evento = visita`, observaciones incluyen estado prebiológico |
| Solicitud FH | No genera evento longitudinal en MVP (es salida de texto derivada) |

### 4.2 Eventos originados en Enfermería

| Dato Enfermería | Evento longitudinal |
|-----------------|---------------------|
| Seguimiento de enfermería | `tipo_evento = seguimiento_enfermeria` |
| Educación terapéutica | `tipo_evento = educacion_terapeutica` |
| Vacunación / preventiva | `tipo_evento = otro`, resumen especifica vacuna |
| Efecto adverso notificado | `tipo_evento = efecto_adverso`, `requiere_valoracion_medica = true` |
| Incidencia | `tipo_evento = incidencia` |

### 4.3 Eventos originados en Farmacia

| Dato Farmacia | Evento longitudinal |
|--------------|---------------------|
| Validación FH completada | `tipo_evento = validacion_fh` |
| Adherencia registrada | `tipo_evento = otro`, resumen incluye estado adherencia |
| Efecto adverso farmacoterapéutico | `tipo_evento = efecto_adverso`, `requiere_valoracion_medica = true` |

---

## 5. Campos precargables desde Reuma

El módulo de Reumatología puede precargar en el evento común:

- `cip_paciente` — identificador canónico
- `patologia` — diagnóstico primario del paciente
- `fecha_evento` — solo si el evento se deriva de una visita existente

Los módulos de Enfermería y Farmacia completan el resto de campos según su contexto.

---

## 6. Notas para implementación MVP

- Este es un **contrato documental v1**. No define esquema de base de datos ni tabla SQL.
- En MVP los eventos pueden materializarse como JSON en localStorage, array en memoria, o columna derivada en hoja Excel.
- El identificador `cip_paciente` debe coincidir con el `CIP` del contrato Reuma v2.
- `referencia_origen` permite trazabilidad desde la timeline al registro fuente original.
- Los campos marcados como `Pendiente validación clínica` requieren revisión por Sil/Cora antes de implementación.
- No almacenar datos reales de pacientes en MVP. Solo datos sintéticos.

---

## 7. Pendiente de validación clínica

- [ ] ¿`profesional_nombre` debe incluirse o basta con `profesional_rol`?
- [ ] ¿Se necesita `servicio` (Reumatología, Enfermería, Farmacia) como campo adicional?
- [ ] ¿`tipo_evento` cubre todos los casos de uso reales?
- [ ] Validar con Sil/Cora los valores de `estado`.
