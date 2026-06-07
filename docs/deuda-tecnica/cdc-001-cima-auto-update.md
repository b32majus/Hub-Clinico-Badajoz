# Deuda técnica post-demo

## Catálogo Farmacia

### CDC-001: Automatizar actualización del catálogo CIMA vía GitHub Actions

**Prioridad:** Alta (mejora de mantenibilidad)
**Estimación:** 1 WO nocturna (guión + script + workflow)
**Dependencias:** Demo Farmacia v0.2 cerrada

**Problema:**
El catálogo farmacológico (Excel en `data/catalogos/farmacia/`) está commiteado manualmente. Cada actualización requiere descargar de CIMA, procesar y subir a mano.

**Solución propuesta:**
1. Script Python (`tools/update_cima_catalog.py`) que consuma la API REST pública de CIMA (AEMPS):
   - `GET https://cima.aemps.es/cima/rest/medicamentos`
   - Filtrar por presentaciones hospitalarias
   - Generar Excel con las 2 hojas: `CATALOGO_CIMA` y `CATALOGO_LOCAL_ESPECIAL`
2. Workflow GitHub Actions (`.github/workflows/update-cima-catalog.yml`):
   - Programación mensual (`schedule: cron '0 0 1 * *'`)
   - Ejecuta el script
   - Si hay cambios en el Excel → commit + push automático
   - El push gatilla rebuild de GitHub Pages (la demo se actualiza sola)

**Lo que ya existe:**
- Estructura del Excel target (2 hojas, formato esperado por `window.FarmaciaCatalog.loadFromExcel()`)
- Vendor SheetJS para parseo cliente
- Ruta `data/catalogos/farmacia/` ya servida por GitHub Pages
- Workflow de smoke check existente como referencia

**Lo que hay que crear:**
- `tools/update_cima_catalog.py` — script de extracción, limpieza y generación
- `.github/workflows/update-cima-catalog.yml` — workflow programado
- Tests del script (opcional pero recomendable)

**Riesgos:**
- La API de CIMA puede rate-limit o cambiar su estructura
- El filtering de "hospitalario" puede necesitar ajustes periódicos
- La hoja `CATALOGO_LOCAL_ESPECIAL` depende de input manual de Farmacia del hospital (no automatizable)

**Tags:** farmacia, cima, github-actions, automatizacion, catalogo
**Estado:** pending
**WO asignable:** sí
