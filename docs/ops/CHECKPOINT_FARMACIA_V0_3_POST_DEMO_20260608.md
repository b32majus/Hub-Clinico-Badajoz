# Checkpoint — Farmacia v0.3 post-demo

**Status:** `postdemo_v0_3_checkpoint_documented`
**Fecha:** 2026-06-08
**Rama activa:** `work/farmacia-v0-3-post-demo-exploratory-20260607`
**SHA actual:** `6aad4a2`

---

## Estado de la rama

La rama `work/farmacia-v0-3-post-demo-exploratory-20260607` queda como **rama viva de trabajo post-demo v0.3**. No es una demo congelada ni un release. Se sigue trabajando en ella.

---

## Módulos aceptados como base post-demo

| Módulo | Estado | Último SHA relevante |
|--------|--------|----------------------|
| **Dashboard Paciente v0.3** | Aceptado como base post-demo | `a7afdf6` |
| **Estadísticas del servicio v0.3** | Aceptado como base post-demo | `6aad4a2` |

Ambos módulos han pasado por:
- Rediseño UX guiado por mockup aprobado
- Múltiples rondas de micro-ajustes visuales
- Pulido responsive
- Validación automática (smoke 33/33, JS syntax, 0 innerHTML)
- Revisión visual de Sil/Cora

---

## Estado de otros módulos Farmacia

| Módulo | Estado |
|--------|--------|
| farmacia_index.html | Opera |
| farmacia_validacion.html | Opera |
| farmacia_primera_visita.html | Opera |
| farmacia_seguimiento.html | Opera |
| farmacia_farmacos.html | Opera |
| farmacia_profesionales.html | Opera |
| farmacia_actividad_servicio.html | Opera (no rediseñado) |

---

## Límites establecidos

- **Demo v0.2 congelada** (`work/hermes/farmacia-demo-v0-2-candidate-20260606`, HEAD `1b7eba7`): intacta, sigue siendo fallback de presentación.
- **Main** (`a25cccb`): no se toca. Sin merge de v0.3.
- **Sin PR, sin merge, sin GitHub Pages.**
- La rama v0.3 **no se mergea todavía** a main.

---

## Próximo bloque prioritario

**Plantilla Dermatología independiente.**

Objetivo: crear una plantilla o dashboard específico para Dermatología, separado del Hub general, aprovechando la estructura y lógica de datos del módulo Farmacia.

---

## Backlog post-demo

Quedan pendientes para futuras iteraciones:
- Catálogo farmacológico (completar si aplica)
- Módulo Reumatología (plantilla independiente)
- Mejoras en Actividad del servicio
- Exportación de informes
- Personalización de columnas en tablas
- Rango temporal en filtros

---

## Commits en la rama (resumen)

```
6aad4a2  feat(estadisticas): chips de filtros activos eliminables con x
44d0de6  refactor(estadisticas): reestructuración layout v0.3 — grid 2x2, limpieza
1146614  feat(estadisticas): responsive adaptativo — 7 breakpoints
5afbaae  fix: estadísticas microfix final — donut optimización, filtros compactos
79e6321  feat: micro UX adjustments in farmacia estadisticas
19aac02  feat: UX redesign estadísticas servicio v0.3
a7afdf6  style(dashboard): pulido visual final Dashboard Paciente v0.3 ronda 2
b03891b  style(dashboard): pulido visual Dashboard Paciente v0.3
7f9b6bd  fix(dashboard): renderExtendedBlocks con datos de longDataset tras fetch
c016508  feat: dashboard recomposition v0.3
93c1fff  fix: P1 fixes dashboard v0.3
a58d3fd  feat: dashboard realignment v0.3
```

---

## Notas

- Esta rama se ha trabajado con el pipeline KairOS Brain → PM Codex (qwen3.7-plus) → Builder (kimi-k2.6 / deepseek-v4-flash).
- Gobernanza v2 activa: checks deterministas, auditoría por niveles, reporte compacto, `pending_review` hasta validación humana.
- Próxima sesión: retomar con plantilla Dermatología salvo que Sil re-priorice.
