# Contrato de Enfermería Reuma v1

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Proyecto:** Hub Clínico Reuma / PROMueve Extremadura  
**Tipo:** Documento de contrato documental MVP  
**Estado:** Pendiente de validación clínica  
**Origen datos:** Excel propio (`Hub_Enfermeria_Reuma_V1.xlsx`)  
**Fuente física de escritura:** Enfermería  
**Lectura cruzada:** Sí, por Reumatología y Farmacia

---

## 1. Objetivo

Definir los campos mínimos del módulo de Enfermería para el MVP interservicios, siguiendo las decisiones DEC-006 (escritura separada por rol) y DEC-007 (Enfermería integrada en visión longitudinal con fuente propia).

Enfermería actúa como nexo asistencial y registra eventos longitudinales que no equivalen a visitas médicas de Reumatología, pero son relevantes para la visión integrada del paciente.

---

## 2. Contrato mínimo de datos

| # | Campo | Tipo | Obligatorio | Precargable desde Reuma | Alimenta timeline | Descripción |
|---|-------|------|-------------|------------------------|-------------------|-------------|
| 1 | `cip_paciente` | `string` | ✅ Sí | ✅ Sí | ✅ Sí | CIP del paciente. Identificador canónico |
| 2 | `fecha_contacto` | `date` | ✅ Sí | ❌ No | ✅ Sí | Fecha del contacto de enfermería |
| 3 | `tipo_contacto` | `string` | ✅ Sí | ❌ No | ✅ Sí | `seguimiento`, `educacion_terapeutica`, `vacunacion`, `telefonico`, `incidencia`, `otro` |
| 4 | `motivo_contacto` | `text` | ✅ Sí | ❌ No | ❌ No | Motivo del contacto de enfermería |
| 5 | `seguimiento_previo` | `text` | ❌ Opcional | ✅ Sí | ❌ No | Resumen de evolución desde última visita Reuma |
| 6 | `educacion_terapeutica` | `text` | ❌ Opcional | ❌ No | ✅ Sí | Contenido de educación impartida al paciente |
| 7 | `adherencia` | `string` | ✅ Sí | ❌ No | ✅ Sí | `adecuada`, `parcial`, `no_adherente`, `no_procede` |
| 8 | `adherencia_observaciones` | `text` | ❌ Opcional | ❌ No | ❌ No | Observaciones sobre adherencia |
| 9 | `vacunacion_aplicada` | `string` | ❌ Opcional | ❌ No | ✅ Sí | Vacuna administrada: `gripe`, `neumococo`, `herpes_zoster`, `covid19`, `otra`, `no_procede` |
| 10 | `vacunacion_fecha` | `date` | ❌ Opcional | ❌ No | ✅ Sí | Fecha de administración |
| 11 | `vacunacion_observaciones` | `text` | ❌ Opcional | ❌ No | ❌ No | Observaciones sobre vacunación |
| 12 | `efecto_adverso_presente` | `boolean` | ✅ Sí | ❌ No | ✅ Sí | `true` si se detecta posible efecto adverso |
| 13 | `efecto_adverso_descripcion` | `text` | ❌ *Obligatorio si `efecto_adverso_presente = true`* | ❌ No | ✅ Sí | Descripción del efecto adverso detectado |
| 14 | `efecto_adverso_fecha_inicio` | `date` | ❌ Opcional | ❌ No | ❌ No | Fecha de inicio del efecto adverso |
| 15 | `efecto_adverso_requiere_valoracion` | `boolean` | ✅ Sí | ❌ No | ✅ Sí | `true` si requiere valoración por Reumatología |
| 16 | `incidencia_tipo` | `string` | ❌ Opcional | ❌ No | ✅ Sí | Tipo de incidencia: `administrativa`, `clinica`, `social`, `otra` |
| 17 | `incidencia_descripcion` | `text` | ❌ *Obligatorio si hay incidencia* | ❌ No | ✅ Sí | Descripción de la incidencia |
| 18 | `incidencia_resuelta` | `boolean` | ❌ Opcional | ❌ No | ❌ No | `true` si la incidencia está resuelta |
| 19 | `requiere_valoracion_medica` | `boolean` | ✅ Sí | ❌ No | ✅ Sí | `true` si enfermería considera que Reumatología debe evaluar |
| 20 | `profesional_enfermeria` | `string` | ✅ Sí | ❌ No | ❌ No | Identificador de la enfermera/o |
| 21 | `observaciones` | `text` | ❌ Opcional | ❌ No | ❌ No | Observaciones generales de enfermería |
| 22 | `fecha_registro` | `datetime` | ✅ Sí | ❌ No | ✅ Sí | Timestamp de registro |

---

## 3. Campos que alimentan la visión longitudinal

Los siguientes campos de Enfermería generan eventos en la timeline común:

| Campo enfermería | Evento longitudinal generado |
|-----------------|------------------------------|
| `tipo_contacto = seguimiento` | `tipo_evento = seguimiento_enfermeria` |
| `tipo_contacto = educacion_terapeutica` | `tipo_evento = educacion_terapeutica` |
| `vacunacion_aplicada` informado | `tipo_evento = otro` con resumen de vacuna |
| `efecto_adverso_presente = true` | `tipo_evento = efecto_adverso`, `requiere_valoracion_medica = true` |
| `incidencia_tipo` informado | `tipo_evento = incidencia` |

---

## 4. Campos precargables desde Reumatología

Enfermería puede precargar desde el módulo Reuma:

- `cip_paciente` — identificador canónico
- `seguimiento_previo` — última evolución registrada por Reumatología (texto informativo)

No se precargan datos clínicos de Reuma en el contrato de Enfermería para mantener la separación de fuentes (DEC-006).

---

## 5. Dependencias con otros contratos

| Contrato | Relación |
|----------|----------|
| `CONTRATO_EVENTO_LONGITUDINAL_COMUN_V1.md` | Enfermería alimenta la timeline con eventos de seguimiento, educación, vacunación y efectos adversos |
| `CONTRATO_DATOS_REUMA_V2.md` | Reuma es fuente de `cip_paciente` y `seguimiento_previo` |
| `CONTRATO_FARMACIA_REUMA_V1.md` | Sin dependencia directa en MVP. Posible cruce en adherencia o efectos adversos |

---

## 6. Notas MVP

- Este es un **contrato documental v1**. No define esquema de base de datos.
- En MVP los datos residen en `Hub_Enfermeria_Reuma_V1.xlsx`, hoja única, con estas columnas.
- La hoja Excel debe poder ser leída por el módulo de Reumatología para construir la timeline.
- `profesional_enfermeria` debe usar identificador no nominal en MVP (ej. código profesional).
- Ningún campo debe contener datos reales de pacientes en MVP.

---

## 7. Pendiente de validación clínica

- [ ] Validar tipos de `tipo_contacto` con enfermería real
- [ ] ¿`seguimiento_previo` es útil o añade ruido?
- [ ] Validar campos de vacunación con protocolo real del servicio
- [ ] ¿Hace falta campo `constantes_vitales` (TA, FC, SatO2)?
- [ ] Confirmar que `adherencia` cubre los casos de uso de enfermería
