# Farmacia v0.3 — Realignment Correction

**Fecha:** 2026-06-07
**WO:** wo-farmacia-v0-3-realignment-20260607.md
**Rama:** work/farmacia-v0-3-post-demo-exploratory-20260607
**SHA inicial:** df54890
**Estado:** pending_review

---

## Qué se corrigió

### T2 — Longitudinal integrado canónico
- `renderLongDataSeries()` reescrita: puntos clínicos/PROMs posicionados temporalmente sobre bandas de tratamiento
- SVG polyline conecta puntos temporalmente
- Selectores de variable clínica y PROM funcionales
- Colores diferenciados: azul clínica, violeta PROM

### T3 — Eliminación de duplicidades
- Eliminadas secciones HTML: timeline longitudinal mínima, timeline tratamiento, actividad clínica, PROMs
- Eliminadas funciones JS: `renderActividadClinica()`, `renderProms()`, `renderTimelineTratamiento()`
- Dashboard paciente ahora muestra: resumen + checks + longitudinal integrado

### T4 — Standalone longitudinal como sandbox
- Banner sandbox añadido a `farmacia_dashboard_longitudinal.html`
- Copy: "Sandbox técnico v0.3. La visualización canónica se integra en Dashboard Paciente."
- No aparece en navegación principal

### T5 — Navegación coherente
- Sidebar unificado en todos los HTMLs Farmacia
- "Actividad del servicio" y "Estadísticas del servicio" como entradas separadas
- Corregido `farmacia_estadisticas.html` (faltaba Actividad, decía solo "Estadísticas")
- Corregido `farmacia_farmacos.html` (faltaba Estadísticas del servicio)

### T6 — Filtros poblacionales completos
- 9 filtros nuevos: nombre comercial, dosis, pauta, vía, fuente PROM, tipo EA, acción tomada, intensificación, desintensificación
- `derivePatientProfile()` ampliado con nuevos campos
- Matching y chips actualizados

### T7 — Gráficos asociados a filtros
- 3 gráficos nuevos/corregidos: estado seguimiento, EA por gravedad, intensificación/desintensificación
- Todos recalculan con `filteredPatients`

### T8 — Bug estado validación
- Corregido: `profile.estado_validacion = t.estado_validacion` → `t.estado_validacion_farmacia`

### T9 — Dataset determinista
- `seededRandom(seed)` con semilla fija `20260607`
- 34 `Math.random()` reemplazados por `random()`
- Datos ampliados: intensificación/desintensificación, variedad EA, fuentes PROM

### T10 — Cache busting
- Todos los HTMLs actualizados a `v=20260607-postdemo-d`

---

## Qué queda como deuda

- **Intensificación/desintensificación visual en bandas:** estructura preparada (`change.direction`), pero no se implementó oscurecimiento/aclaramiento de banda por falta de datos claros en dataset demo
- **Filtros de fecha/rango:** no implementados (requieren picker de fechas, out of scope para v0.3 exploratoria)
- **Motivo de denegación:** filtro presente pero sin datos en dataset demo
- **Revisión visual:** pendiente validación Cora/Sil de layout longitudinal integrado

---

## URLs a revisar

```
Dashboard paciente:
http://81.17.100.246:8124/farmacia_dashboard_paciente.html

Actividad del servicio:
http://81.17.100.246:8124/farmacia_actividad_servicio.html

Estadísticas del servicio:
http://81.17.100.246:8124/farmacia_estadisticas.html

Sandbox longitudinal:
http://81.17.100.246:8124/farmacia_dashboard_longitudinal.html
```

---

## Decisión canónica

- **Dashboard paciente** = longitudinal integrado (sección interna, no página standalone)
- **Actividad del servicio** = operativa (pendientes, validaciones, seguimientos, actividad diaria)
- **Estadísticas del servicio** = análisis poblacional filtrable
- **Longitudinal standalone** = sandbox técnico (no ruta operativa principal)

---

## Archivos tocados

- `farmacia_dashboard_paciente.html`
- `scripts/farmacia_dashboard_paciente.js`
- `farmacia_estadisticas.html`
- `scripts/farmacia_estadisticas.js`
- `farmacia_dashboard_longitudinal.html`
- `farmacia_index.html`
- `farmacia_validacion.html`
- `farmacia_primera_visita.html`
- `farmacia_seguimiento.html`
- `farmacia_actividad_servicio.html`
- `farmacia_farmacos.html`
- `farmacia_profesionales.html`
- `farmacia_style.css`
- `docs/ops/FARMACIA_V0_3_REALIGNMENT_CORRECTION_20260607.md`

---

## Validaciones

- Smoke check: 33/33 OK
- JS syntax: OK (node --check)
- innerHTML: 0
- Math.random: 0 (todos reemplazados)
- Cache busting: coherente (v=20260607-postdemo-d)
- Navegación: consistente en todos los HTMLs
- Sin tocar main/demo/frozen/PRs

---

**Status: pending_review**
Requiere revisión visual de Sil/Cora antes de considerar apta.
