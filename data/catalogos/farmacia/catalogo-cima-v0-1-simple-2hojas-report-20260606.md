# Reporte — Catálogo CIMA v0.1 — Versión Simple 2 Hojas

**Status:** pending_review

**Fecha:** 2026-06-06

---

## Resumen

Se ha generado una versión simplificada del catálogo farmacológico dual CIMA+Local, reduciendo de 8 a 2 hojas para facilitar la revisión funcional por Farmacia.

## Archivo generado

**Ruta:** `/srv/kairos-lab/outbox/exports/catalogo-cima-v0-1/hub_catalogo_farmacologico_dual_SIMPLE_2hojas_20260606.xlsx`

## Estructura

| Hoja | Registros | Columnas | Estado |
|------|-----------|----------|--------|
| CATALOGO_CIMA | 16.092 | 21 | ✅ Datos reales CIMA |
| CATALOGO_LOCAL_ESPECIAL | 2 (DEMO) | 21 | ✅ Lista para editar por Farmacia |

## Columnas conservadas en CATALOGO_CIMA

Se redujeron de 28 a 21 columnas, eliminando las técnicas/internas:
- `source_type` (constante = "CIMA")
- `cpresc_normalizado`
- `generico`
- `atc_codes`
- `fecha_autorizacion`
- `fecha_actualizacion_cima`
- `activo_en_catalogo` (constante = TRUE)

Columnas conservadas: todas las relevantes para búsqueda, selección y revisión farmacéutica: código nacional, nregistro, nombre, marca comercial, principio activo, forma, dosis, vía, laboratorio, comercialización, receta, cpresc, hospitalario, biosimilar, suministro, fichas técnicas y observaciones.

## Hojas eliminadas (6)

| Hoja | Motivo |
|------|--------|
| CATALOGO_ALIAS | Técnica — índices de búsqueda |
| CATALOGO_FAVORITOS_CIRCUITO | Preparada para futuro |
| TRATAMIENTOS_PACIENTE | Preparada para futuro |
| SYNC_LOG | Técnica — trazabilidad de extracción |
| VALIDACIONES | Técnica — control de calidad |
| LISTAS | Técnica — valores controlados |

La información técnica de las hojas eliminadas se conserva en:
- `README_catalogo_CIMA_v0.1.md` (Drive)
- `catalogo-cima-v0-1-report-20260606.md` (Drive)
- `catalogo-cima-v0-1-simple-2hojas-report-20260606.md` (este archivo)

## Formato

- ✅ Congelada primera fila (cabecera siempre visible)
- ✅ Filtros activados en ambas hojas
- ✅ Encabezados en negrita con fondo corporativo (#003B5C)
- ✅ Anchos de columna ajustados
- ✅ Texto ajustado en celdas largas
- ✅ Filas DEMO en CATALOGO_LOCAL con fondo amarillo claro

## Validación

- ✅ Excel existe
- ✅ Exactamente 2 hojas
- ✅ CATALOGO_CIMA: 16.092 registros
- ✅ CATALOGO_LOCAL_ESPECIAL: editable, con 2 ejemplos DEMO
- ✅ Datos CIMA no modificados (solo eliminación de columnas)
- ✅ No se ha tocado el repo, la demo, HTML/CSS/JS, gateway, systemd, credenciales

## Archivos en Drive

La versión simple se subirá a la misma carpeta: **KairOS OS > Catálogo CIMA v0.1**
