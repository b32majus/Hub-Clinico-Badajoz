# Contrato de Farmacia Reuma v1

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Proyecto:** Hub Clínico Reuma / PROMueve Extremadura  
**Tipo:** Documento de contrato documental MVP  
**Estado:** Pendiente de validación clínica  
**Origen datos:** Excel propio (`Hub_Farmacia_Reuma_V1.xlsx`)  
**Fuente física de escritura:** Farmacia Hospitalaria  
**Lectura cruzada:** Sí, por Reumatología y Enfermería

---

## 1. Objetivo

Definir los campos mínimos del módulo de Farmacia Hospitalaria para el MVP interservicios, siguiendo las decisiones DEC-006 (escritura separada por rol) y DEC-008 (Farmacia activa con fuente propia para validación farmacoterapéutica, pauta, adherencia, efectos adversos y observaciones).

Farmacia no escribe en el Excel clínico de Reumatología, pero sus registros forman parte del modelo longitudinal del paciente.

---

## 2. Contrato mínimo de datos

| # | Campo | Tipo | Obligatorio | Precargable desde Reuma | Alimenta timeline | Descripción |
|---|-------|------|-------------|------------------------|-------------------|-------------|
| 1 | `cip_paciente` | `string` | ✅ Sí | ✅ Sí | ✅ Sí | CIP del paciente. Identificador canónico |
| 2 | `fecha_validacion` | `date` | ✅ Sí | ❌ No | ✅ Sí | Fecha de la validación farmacoterapéutica |
| 3 | `tipo_intervencion` | `string` | ✅ Sí | ❌ No | ✅ Sí | `validacion_inicial`, `revision_pauta`, `seguimiento_adherencia`, `efecto_adverso`, `otra` |
| 4 | `farmaco` | `string` | ✅ Sí | ✅ Sí | ✅ Sí | Nombre del fármaco (desde catálogo `Farmacos`) |
| 5 | `dosis` | `string` | ✅ Sí | ✅ Sí | ❌ No | Dosis prescrita (ej. `200 mg`, `1 comp`) |
| 6 | `posologia_frecuencia` | `string` | ✅ Sí | ✅ Sí | ❌ No | Frecuencia de administración (ej. `cada 24h`, `cada 12h`, `semanal`) |
| 7 | `via_administracion` | `string` | ✅ Sí | ✅ Sí | ❌ No | Vía: `oral`, `subcutanea`, `intramuscular`, `intravenosa`, `topica`, `otra` |
| 8 | `peso_paciente` | `decimal` | ❌ *Obligatorio si dosis depende de peso* | ✅ Sí | ❌ No | Peso del paciente en kg, si aplica para cálculo de dosis |
| 9 | `indicacion` | `text` | ✅ Sí | ✅ Sí | ❌ No | Indicación clínica del fármaco |
| 10 | `estado_validacion` | `string` | ✅ Sí | ❌ No | ✅ Sí | `validado`, `pendiente_revision`, `no_validado`, `requiere_cambio`, `en_seguimiento` |
| 11 | `adherencia_registrada` | `string` | ❌ Opcional | ❌ No | ✅ Sí | `adecuada`, `parcial`, `no_adherente`, `no_valorado`, `no_procede` |
| 12 | `adherencia_observaciones` | `text` | ❌ Opcional | ❌ No | ❌ No | Observaciones sobre adherencia |
| 13 | `efecto_adverso_presente` | `boolean` | ✅ Sí | ❌ No | ✅ Sí | `true` si se identifica posible efecto adverso al fármaco |
| 14 | `efecto_adverso_descripcion` | `text` | ❌ *Obligatorio si `efecto_adverso_presente = true`* | ❌ No | ✅ Sí | Descripción del efecto adverso |
| 15 | `efecto_adverso_severidad` | `string` | ❌ Opcional | ❌ No | ✅ Sí | `leve`, `moderado`, `grave`, `no_clasificado` |
| 16 | `efecto_adverso_fecha_inicio` | `date` | ❌ Opcional | ❌ No | ❌ No | Fecha de inicio del efecto adverso |
| 17 | `efecto_adverso_requiere_valoracion` | `boolean` | ✅ Sí | ❌ No | ✅ Sí | `true` si Reumatología debe valorar |
| 18 | `interaccion_detectada` | `boolean` | ✅ Sí | ❌ No | ✅ Sí | `true` si se detecta interacción farmacológica relevante |
| 19 | `interaccion_descripcion` | `text` | ❌ *Obligatorio si `interaccion_detectada = true`* | ❌ No | ✅ Sí | Descripción de la interacción |
| 20 | `observaciones_farmacoterapeuticas` | `text` | ❌ Opcional | ❌ No | ❌ No | Observaciones generales de Farmacia |
| 21 | `requiere_cambio_pauta` | `boolean` | ✅ Sí | ❌ No | ✅ Sí | `true` si Farmacia recomienda cambio de pauta |
| 22 | `cambio_propuesto` | `text` | ❌ *Obligatorio si `requiere_cambio_pauta = true`* | ❌ No | ❌ No | Descripción del cambio propuesto |
| 23 | `profesional_farmacia` | `string` | ✅ Sí | ❌ No | ❌ No | Identificador del farmacéutico |
| 24 | `fecha_registro` | `datetime` | ✅ Sí | ❌ No | ✅ Sí | Timestamp de registro |

---

## 3. Campos que alimentan la visión longitudinal

Los siguientes campos de Farmacia generan eventos en la timeline común:

| Campo farmacia | Evento longitudinal generado |
|---------------|------------------------------|
| `estado_validacion` informado | `tipo_evento = validacion_fh` |
| `adherencia_registrada` informado | `tipo_evento = otro` con resumen de adherencia |
| `efecto_adverso_presente = true` | `tipo_evento = efecto_adverso`, `requiere_valoracion_medica = true` |
| `requiere_cambio_pauta = true` | `tipo_evento = otro` con resumen del cambio propuesto |

---

## 4. Campos precargables desde Reumatología

Farmacia puede precargar desde el módulo Reuma:

- `cip_paciente` — identificador canónico
- `farmaco` — fármaco prescrito por Reumatología
- `dosis` — dosis prescrita
- `posologia_frecuencia` — pauta prescrita
- `via_administracion` — vía de administración
- `peso_paciente` — último peso registrado en visita Reuma
- `indicacion` — indicación clínica desde Reuma

Estos campos permiten a Farmacia validar sin necesidad de que Reuma los transmita en cada interacción.

---

## 5. Dependencias con otros contratos

| Contrato | Relación |
|----------|----------|
| `CONTRATO_EVENTO_LONGITUDINAL_COMUN_V1.md` | Farmacia alimenta la timeline con eventos de validación, adherencia y efectos adversos |
| `CONTRATO_DATOS_REUMA_V2.md` | Reuma es fuente de fármaco, dosis, posología y peso |
| `CONTRATO_ENFERMERIA_REUMA_V1.md` | Posible cruce en adherencia y efectos adversos en fase post-MVP |

---

## 6. Notas MVP

- Este es un **contrato documental v1**. No define esquema de base de datos.
- En MVP los datos residen en `Hub_Farmacia_Reuma_V1.xlsx`, hoja única, con estas columnas.
- El catálogo de fármacos es el existente en el Excel Reuma v2 (hoja `Farmacos`).
- `profesional_farmacia` debe usar identificador no nominal en MVP (ej. código profesional).
- La validación FH en MVP se concibe como registro estructurado, no como texto libre de Solicitud FH.
- Ningún campo debe contener datos reales de pacientes en MVP.

---

## 7. Pendiente de validación clínica

- [ ] Validar que `tipo_intervencion` cubre los flujos reales de Farmacia Hospitalaria
- [ ] Confirmar codificación de `estado_validacion` con farmacia real
- [ ] ¿`interaccion_detectada` es viable sin base de datos de interacciones?
- [ ] Validar campos de peso y dosis con casos de fármacos biológicos
- [ ] ¿Hace falta campo `lote` o `numero_serie` para trazabilidad?
- [ ] Confirmar periodicidad esperada de las validaciones (cada visita, trimestral, etc.)
