# Work Order Status — Hub Clínico Badajoz

**Última actualización:** 2026-06-05  
**Propósito:** Tablero de estado de todas las work orders ejecutadas  
**Mantenedor:** Hermes PM (actualizar al mergear/cambiar estado cada WO)

---

## Leyenda

| Símbolo | Estado |
|---------|--------|
| ✅ Merged | Incorporada a rama base |
| 📋 Ready for review | Commiteada y pusheada, esperando revisión humana |
| 🔄 Superseded | Contenido absorbido por otra WO. No mergear por separado |
| ⏸️ Pausada | Detenida hasta decisión humana |
| 🔴 Bloqueada | No puede continuar sin resolver incidencia |
| ❌ Descartada | No se ejecutará |

---

## Work orders

| WO | Título | Estado | Rama | Merge/Commit | Notas |
|----|--------|--------|------|-------------|-------|
| **Preflight 1** | SSH GitHub + clonado | ✅ Merged | `feature/reuma-v2-prebiologico-fh-les-sjogren` | — | Preflight manual, sin WO formal. Clave SSH + deploy key + clone |
| **Preflight 2** | Validación post-merge WO-001 | ✅ Merged | `feature/reuma-v2-prebiologico-fh-les-sjogren` | `f7e1083` | Pull --ff-only, verificación gobernanza |
| **WO-001** | Gobernanza ejecutable (AGENTS.md, templates) | ✅ Merged | `work/hermes/wo-001-agent-governance` → `feature/...` | `f5177f7` → merge `f7e1083` | PR #2 mergeado por Cora |
| **WO-001b** | Refinar plantilla reporte | ✅ Merged | `work/hermes/wo-001b-report-template-refinement` → `feature/...` | `cf4ed35` | Incluido en PR #2 |
| **WO-002** | Contratos mínimos documentales | ⏸️ **Pausada** | `work/hermes/wo-002-contratos-minimos` | `fa59106` | **No mergear.** Borrador prematuro. Pendiente de diseñar formularios con Sil/Cora |
| **WO-003** | Inventario técnico Reuma v2 | 📋 Ready for review | `work/hermes/nightly-green-docs-20260606` | `d4172d0` | Lote nocturno |
| **WO-004** | Mapa de flujos actuales | 📋 Ready for review | `work/hermes/nightly-green-docs-20260606` | `1f61f9d` | Lote nocturno |
| **WO-005** | Smoke test checklist | 📋 Ready for review | `work/hermes/nightly-green-docs-20260606` | `352fbe1` | Lote nocturno |
| **WO-006** | Índice documental | 📋 Ready for review | `work/hermes/nightly-green-docs-20260606` | `6e20a2c` | Lote nocturno |
| **WO-007** | Estado de ramas y decisiones | 📋 Ready for review | `work/hermes/nightly-green-docs-20260606` | `3f40902` | Lote nocturno |
| **WO-008** | Auditoría riesgos técnicos | 📋 Ready for review | `work/hermes/nightly-green-docs-20260606` | `6414324` | Lote nocturno |
| **WO-009** | Reporte lote nocturno | 📋 Ready for review | `work/hermes/nightly-green-docs-20260606` | `c9a1276` | Lote nocturno |
| **WO-009b** | Corrección editorial lote nocturno | 📋 Ready for review | `work/hermes/wo-009b-correccion-editorial-lote-nocturno` | `16ff810` | |
| **WO-010** | Canvas diseño formularios Enfermería/Farmacia | 📋 Ready for review | `work/hermes/wo-010-canvas-diseno-formularios` | `2c9d87b` | Pendiente de rellenar por Sil/Cora |
| **WO-011** | Política de modelos y delegación | 🔄 **Superseded** | `work/hermes/wo-011-model-routing-governance` | `f4a9a33` | **Superseded by WO-012.** Contenido ya integrado en gobernanza principal. No mergear por separado |
| **WO-012** | Governance hygiene and operations status | 📋 Ready for review | `work/hermes/wo-012-governance-hygiene-status` | `f6a74a0` | |
| **WO-012b** | Governance hygiene status refinement | 📋 Ready for review | `work/hermes/wo-012b-status-risk-refinement` | `—` | Refina estados WO-011/012 y matiz riesgo contratos |

|---

## Resumen

| Estado | Cantidad |
|--------|----------|
| ✅ Merged | 4 (Preflight 1, Preflight 2, WO-001, WO-001b) |
| 📋 Ready for review | 12 (WO-003 a WO-010, WO-012, WO-012b) |
| 🔄 Superseded | 1 (WO-011) |
| ⏸️ Pausada | 1 (WO-002) |
| 🔴 Bloqueada | 0 |
| ❌ Descartada | 0 |

**Total:** 18 work orders / preflights gestionadas.
