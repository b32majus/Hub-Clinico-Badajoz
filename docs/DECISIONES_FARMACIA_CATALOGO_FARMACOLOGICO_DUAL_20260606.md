# Decisión: Catálogo Farmacológico Dual para Farmacia Hospitalaria

**Status:** `pending_review`
**Fecha:** 2026-06-06
**Autor:** KairOS (decisión validada por Sil)
**Rama:** `work/farmacia-catalogo-cima-v0-1-20260606`
**PR:** [#3 — Draft](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/3)

---

## Resumen ejecutivo

Se ha decidido que la evolución del módulo de Farmacia Hospitalaria hacia una entrada estructurada de fármacos usará un **catálogo farmacológico dual** compuesto por:

1. **CATALOGO_CIMA** — fuente oficial regenerable desde CIMA/AEMPS
2. **CATALOGO_LOCAL_ESPECIAL** — fuente local editable por Farmacia para situaciones especiales

Esta decisión es **estable para Farmacia v0.2/post-demo**. No se implementa antes de la demo del lunes 2026-06-08.

---

## Problema que resuelve

La demo actual de Farmacia v0.1 usa campos de texto libre o semiestructurados para el fármaco solicitado. Esto presenta problemas conocidos:

- **Texto libre**: errores tipográficos, variaciones del mismo fármaco, imposibilidad de trazabilidad estructurada, sin normalización.
- **Desplegable infinito**: miles de presentaciones en CIMA (~67k), impracticable como selector único sin búsqueda.
- **Mezcla fuente oficial/local**: sin distinción de origen, un fármaco de uso compasivo y un medicamento autorizado aparecen igual, lo que dificulta la auditoría farmacéutica.

---

## Decisión tomada

### Arquitectura del catálogo dual

```
┌─────────────────────────────────────────────────────┐
│                   AUTOCOMPLETE                       │
│          (búsqueda unificada + snapshot)             │
├──────────────────────────┬──────────────────────────┤
│    CATALOGO_CIMA         │  CATALOGO_LOCAL_ESPECIAL │
│   (CIMA/AEMPS oficial)   │  (Farmacia edita)        │
│                          │                          │
│ • ~16k medicamentos      │ • Uso compasivo          │
│ • Regenerable por API    │ • Medicación extranjera  │
│ • NO editable manual     │ • Ensayo clínico         │
│ • Solo baja de CIMA      │ • Precomercialización    │
│ • Incluye biosimilares   │ • Moléculas sin nombre   │
│ • Incluye filtro hosp.   │ • Fuera de ficha técnica │
│ • CN + nregistro + PA    │ • Protocolos locales     │
│                          │ • Otras situac. especiales│
└──────────────────────────┴──────────────────────────┘
```

### Para la demo v0.1 (lunes 2026-06-08)

- ❌ **No se implementa autocomplete**
- ❌ **No se toca la demo congelada**
- ✅ Se ha generado un Excel de 2 hojas como artefacto de revisión funcional para Farmacia
- ✅ El Excel está versionado en la rama `work/farmacia-catalogo-cima-v0-1-20260606` (PR #3 draft)
- ✅ Los campos de la demo siguen siendo texto simple — no hay cambio funcional

### Para Farmacia v0.2 (post-demo)

- Se diseñará un autocomplete unificado que busque en ambas hojas
- Buscará por: nombre comercial, principio activo, presentación, código nacional
- Distinguirá origen con etiqueta visual (CIMA / Local)
- Priorizará hospitalarios derivados si procede
- Incluirá opción "No encuentro el fármaco / solicitar alta local especial"
- Se implementará snapshot del tratamiento seleccionado (trazabilidad ante cambios futuros en CIMA)
- Se definirá flujo de reconciliación: cuando un fármaco local pase a existir en CIMA

---

## Estructura del Excel de 2 hojas (artefacto revisable)

### CATALOGO_CIMA (16.092 registros)

| Columna | Descripción |
|---------|-------------|
| drug_source_id | ID interno (nregistro) |
| codigo_nacional | CN de la primera presentación |
| nregistro | Nº registro CIMA |
| nombre_presentacion | Nombre completo |
| nombre_comercial | Derivado heuristicamente |
| principio_activo | Principio(s) activo(s) |
| forma_farmaceutica | Ej: comprimido, solución |
| dosis_presentacion | Dosificación |
| via | Vía de administración |
| laboratorio | Laboratorio titular |
| comercializado | Sí/No |
| receta | Requiere receta |
| cpresc_raw | Condiciones prescripción original |
| es_hospitalario_derivado | TRUE/FALSE/revisar |
| criterio_hospitalario | Patrón que disparó el filtro |
| biosimilar | Sí/No |
| problema_suministro | Observaciones si aplica |
| url_ficha_tecnica | Enlace PDF/HTML |
| url_prospecto | Enlace PDF/HTML |
| fecha_extraccion | Timestamp de extracción |
| observaciones_import | Notas |

### CATALOGO_LOCAL_ESPECIAL (vacía + 2 ejemplos DEMO)

| Columna | Descripción |
|---------|-------------|
| local_drug_id | ID interno local |
| display_name | Nombre visible |
| ... | (21 columnas en total) |

Columnas diseñadas para: tipo de situación (uso compasivo, ensayo, extranjero...), estado de desarrollo, origen, validación FH, fechas, responsable.

---

## Alcance demo v0.1

- ✅ Catálogo de 6 fármacos demo en `farmacia_farmacos.html`
- ✅ Campos de texto libre en formularios (Validación, Seguimiento)
- ✅ Datos hardcodeados en `farmacia_common.js`
- ❌ **No incluye** autocomplete real contra CIMA
- ❌ **No incluye** catálogo dual integrado en la app
- ❌ **No incluye** persistencia de selección

## Alcance Farmacia v0.2

- [ ] Revisar Excel con Farmacia y validar columnas
- [ ] Decidir campos visibles para perfil no técnico
- [ ] Diseñar componente de autocomplete unificado
- [ ] Implementar búsqueda en ambas fuentes (CIMA + Local)
- [ ] Implementar snapshot del tratamiento seleccionado
- [ ] Decidir formato de datos (JSON derivado del Excel para consumo JS)
- [ ] Definir flujo de alta local especial por Farmacia
- [ ] Implementar reconciliación CIMA ↔ Local

---

## No objetivos

- ❌ No es un sistema de prescripción clínica
- ❌ No sustituye a JARA, SES ni Pharmatool
- ❌ No incluye financiación SNS ni Nomenclátor/BIFIMED
- ❌ No es un catálogo nacional completo (solo medicamentos comercializados en España)
- ❌ No valida interacciones, dosis ni contraindicaciones
- ❌ No es una base de datos de fichas técnicas (solo enlaces)

---

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Datos CIMA desactualizados entre extracciones | Medio | El catálogo es regenerable. El snapshot del tratamiento protege la trazabilidad. |
| Nombre comercial derivado heuristicamente | Bajo | Los campos principales (nregistro, CN) son oficiales. El nombre comercial es auxiliar para búsqueda. |
| Filtro hospitalario derivado impreciso | Medio | Los 48 registros "revisar" requieren validación de Farmacia. El filtro no elimina, solo marca. |
| Catálogo local crece sin control | Medio | El alta local debe requerir validación FH. El campo `activo_en_catalogo` permite desactivar sin borrar. |
| Dependencia de API CIMA externa | Bajo | La API es pública y estable. En caso de caída, el catálogo local sigue funcionando. El CIMA se regenera cuando la API vuelve. |

---

## Estado actual

| Elemento | Estado |
|----------|--------|
| Excel completo (8 hojas) | ✅ Generado |
| Excel simplificado (2 hojas) | ✅ Generado y en Drive |
| Excel en GitHub (rama separada) | ✅ PR #3 (draft) |
| Script de extracción | ✅ `tools/catalogos/extract_cima_catalog.py` |
| README técnico | ✅ En repo y Drive |
| Decisión documentada | ✅ Este documento |
| Autocomplete implementado | ❌ Fase v0.2 |
| Integración en app | ❌ Fase v0.2 |
| Revisión por Farmacia | ⏳ Pendiente (post-demo) |

---

## Referencias

- [Excel simplificado en Drive](https://docs.google.com/spreadsheets/d/1vvBa73ia7xYNHf0FpLShIL4INOq0kzfR/edit?usp=drivesdk)
- [PR #3 — Catálogo CIMA en GitHub](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/3)
- [Script de extracción](tools/catalogos/extract_cima_catalog.py)
- [CIMA REST API v1.23](https://www.aemps.gob.es/apps/cima/docs/CIMA_REST_API.pdf)
- [Deuda técnica post-demo](ops/DEUDA_TECNICA_FARMACIA_POST_DEMO_20260606.md)
