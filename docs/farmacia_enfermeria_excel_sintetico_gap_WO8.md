# WO8.1c.1 — Resolución gap Enfermería

**Estado:** `resuelto`
**Fecha:** 2026-06-14
**WO asociada:** WO8.1c.1 — Incorporación plantilla Enfermería Inicio Biológico

---

## Resolución

La plantilla de Enfermería / Inicio Biológico **no estaba dentro del repo**, pero sí existía como activo de conocimiento del proyecto en:

```
/srv/kairos-lab/preview/farmacia-v0-3/data/import/enfermeria/Excel_Enfermeria_Inicio_Biologico_PROMueve_FHs_v3_panel_servicios_mock.xlsx
```

Se incorpora una copia versionada en el repo como recurso sintético operativo:

```
templates/enfermeria_inicio_biologico_PROMueve_sintetico_v1.xlsx
```

## Estructura de la plantilla

| Hoja | Filas | Descripción |
|---|---|---|
| `INICIO_BIOLOGICO` | 7 | Registro de inicio de biológico con datos demo |
| `PANEL_ENFERMERIA` | 14 | Resumen y evolución por servicio |
| `LISTAS` | 11 | Listas desplegables controladas |
| `INSTRUCCIONES` | 6 | Instrucciones rápidas para Enfermería |

## Estado

La plantilla mantiene su estructura original y datos sintéticos/mock existentes. No se ha modificado ni rediseñado.

Queda pendiente revisar manualmente su alineación con:
- El Excel FH WO8 (`farmacia_excel_operativo_FH_WO8_v1.xlsx`)
- El Excel FH sintético (`farmacia_excel_operativo_FH_WO8_v1_sintetico.xlsx`)
- El futuro parser/importación del circuito FH + Enfermería

**Status:** `resolved`
