# Catálogo Farmacológico Dual CIMA+Local v0.1

> Generado el 2026-06-06 desde API REST pública de CIMA/AEMPS

## Qué es

Primera versión del catálogo farmacológico dual para el Hub Clínico Badajoz, módulo de Farmacia Hospitalaria. Combina datos oficiales de CIMA con una capa local para situaciones especiales.

## Fuente

**API REST CIMA/AEMPS v1.23**
- Base URL: `https://cima.aemps.es/cima/rest/`
- Documentación: `https://www.aemps.gob.es/apps/cima/docs/CIMA_REST_API.pdf`

### Endpoints usados

| Endpoint | Propósito | Registros |
|----------|-----------|-----------|
| `GET medicamentos?comerc=1` | Medicamentos comercializados | 16.092 |
| `GET presentaciones?comerc=1` | Presentaciones (CN + principios activos) | 27.600 (17.024 nregistros únicos) |
| `GET psuministro` | Problemas de suministro activos | 0 activos |

## Estadísticas

| Métrica | Valor |
|---------|-------|
| Registros totales CIMA | 16.092 |
| Con código nacional (CN) | 16.092 (100%) |
| Con principio activo | 16.092 (100%) |
| Biosimilares | 236 |
| Hospitalarios derivados | 3.982 |
| Revisar (dudosos) | 48 |
| Con receta médica | 15.026 |
| Sin receta | 1.066 |
| Errores | 0 |

## Filtro hospitalario derivado

La columna `es_hospitalario_derivado` se calcula a partir del campo `cpresc` (condiciones de prescripción) de CIMA.

**Patrones considerados hospitalarios:**
- `H` → Uso Hospitalario
- `DH` → Diagnóstico Hospitalario
- `UH` → Uso Hospitalario
- `HOSPITALARIO`, `HOSPITAL` → Literal
- `USO HOSPITALARIO`, `DIAGNÓSTICO HOSPITALARIO`
- `DISPENSACIÓN HOSPITALARIA`

**48 registros marcados como "revisar":** biosimilares que no tienen un patrón hospitalario claro en cpresc. Requieren revisión manual de Farmacia.

> ⚠️ Este filtro es conservador y derivado. No elimina registros. No debe usarse como criterio clínico sin validación de Farmacia.

## Estructura del Excel

### CATALOGO_CIMA (16.092 registros)
Hoja regenerable desde CIMA. No contiene datos manuales.

### CATALOGO_LOCAL_ESPECIAL (3 filas demo)
Preparada para que Farmacia añada: uso compasivo, medicación extranjera, ensayos clínicos, etc.

### CATALOGO_ALIAS (~670 registros)
Índices de búsqueda por nombre comercial, presentación y principio activo.

### CATALOGO_FAVORITOS_CIRCUITO (vacía)
Preparada para priorizar resultados por servicio/patología/circuito.

### TRATAMIENTOS_PACIENTE (vacía)
Preparada para futura integración con datos de pacientes.

### SYNC_LOG
Traza de la extracción: fecha, endpoint, registros, estado.

### VALIDACIONES
Control de calidad: nº registros, duplicados, campos vacíos, etc.

### LISTAS
Valores controlados para validación manual de Farmacia.

## Limitaciones

1. **Código nacional (CN):** Se obtiene de la primera presentación de cada medicamento. Los medicamentos con múltiples presentaciones solo tienen el CN de una de ellas.
2. **Nombre comercial:** Derivado heuristicamente del nombre del medicamento. Puede no ser exacto en todos los casos (especialmente genéricos y combinaciones).
3. **Sin financiación SNS:** No se incluye información de financiación. Decisión tomada: no es necesaria para esta fase.
4. **Sin Nomenclátor/BIFIMED:** No se usa en esta versión. Solo CIMA como fuente oficial.
5. **Problemas de suministro:** El endpoint `psuministro` devuelve 0 registros en esta extracción. Puede ser porque no hay problemas activos o porque requiere filtro adicional.
6. **ATC codes:** No se incluyen del endpoint de listado porque `medicamentos` no los devuelve en la vista paginada. Habría que llamar a `medicamento?nregistro=X` individualmente.

## Cómo repetir la extracción

```bash
cd /srv/kairos-lab/projects/hub-clinico/catalogo-cima-v0-1
python3 extract_cima_catalog.py
```

Para forzar extracción completa (ignorar cachés):
```bash
rm /srv/kairos-lab/outbox/exports/catalogo-cima-v0-1/cima_*.json
python3 extract_cima_catalog.py
```

## Entregables

| Archivo | Ruta |
|---------|------|
| Excel | `/srv/kairos-lab/outbox/exports/catalogo-cima-v0-1/hub_catalogo_farmacologico_dual_cima_local_v0_1_REAL_20260606.xlsx` |
| Script | `/srv/kairos-lab/projects/hub-clinico/catalogo-cima-v0-1/extract_cima_catalog.py` |
| Cache datos | `/srv/kairos-lab/outbox/exports/catalogo-cima-v0-1/cima_raw_data_20260606.json` |
| Cache presentaciones | `/srv/kairos-lab/outbox/exports/catalogo-cima-v0-1/cima_presentaciones_20260606.json` |
| Log extracción | `/srv/kairos-lab/outbox/exports/catalogo-cima-v0-1/extract_log_20260606.txt` |
| Este README | `/srv/kairos-lab/outbox/exports/catalogo-cima-v0-1/README.md` |

## Notas para Farmacia

- Revisar los 48 registros marcados como "revisar" en la columna `es_hospitalario_derivado`.
- Validar el criterio hospitalario: los patrones usados son conservadores. Si Farmacia considera que deben añadirse/quitarse patrones, actualizamos el script.
- Las hojas CATALOGO_LOCAL_ESPECIAL, FAVORITOS_CIRCUITO y TRATAMIENTOS_PACIENTE están preparadas para que Farmacia las cumplimente.
- Este catálogo no debe usarse para decisiones clínicas sin validación farmacéutica.
