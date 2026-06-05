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
| **WO-003** | Inventario técnico Reuma v2 | ✅ Merged | `work/hermes/nightly-green-docs-20260606` → `feature/...` | `d4172d0` | Fusionado vía WO-009b |
| **WO-004** | Mapa de flujos actuales | ✅ Merged | `work/hermes/nightly-green-docs-20260606` → `feature/...` | `1f61f9d` | Fusionado vía WO-009b |
| **WO-005** | Smoke test checklist | ✅ Merged | `work/hermes/nightly-green-docs-20260606` → `feature/...` | `352fbe1` | Fusionado vía WO-009b |
| **WO-006** | Índice documental | ✅ Merged | `work/hermes/nightly-green-docs-20260606` → `feature/...` | `6e20a2c` | Fusionado vía WO-009b |
| **WO-007** | Estado de ramas y decisiones | ✅ Merged | `work/hermes/nightly-green-docs-20260606` → `feature/...` | `3f40902` | Fusionado vía WO-009b |
| **WO-008** | Auditoría riesgos técnicos | ✅ Merged | `work/hermes/nightly-green-docs-20260606` → `feature/...` | `6414324` | Fusionado vía WO-009b |
| **WO-009** | Reporte lote nocturno | ✅ Merged | `work/hermes/nightly-green-docs-20260606` → `feature/...` | `c9a1276` | Fusionado vía WO-009b |
| **WO-009b** | Corrección editorial lote nocturno | ✅ Merged | `work/hermes/wo-009b-correccion-editorial-lote-nocturno` → `feature/...` | `16ff810` | Fast-forward merge. Incluye WO-003 a WO-009 |
| **WO-010** | Canvas diseño formularios Enfermería/Farmacia | ✅ Merged | `work/hermes/wo-010-canvas-diseno-formularios` → `feature/...` | `194bef0` | Merge commit |
| **WO-011** | Política de modelos y delegación | 🔄 **Superseded** | `work/hermes/wo-011-model-routing-governance` | `f4a9a33` | **Superseded by WO-012/012b.** Contenido ya integrado en gobernanza principal. No mergear por separado |
| **WO-012** | Governance hygiene and operations status | ✅ Merged | `work/hermes/wo-012-governance-hygiene-status` → `feature/...` | — | Fusionado vía WO-012b |
| **WO-012b** | Governance hygiene status refinement | ✅ Merged | `work/hermes/wo-012b-status-risk-refinement` → `feature/...` | `97f673d` | Merge commit. Incluye WO-012 + refinamiento WO-012b |
| **WO-013** | Alinear documentación canónica del Hub Clínico Badajoz | ✅ **Merged** | `work/hermes/wo-013-canonical-docs-alignment` → `feature/...` | `da39ace` | Integrado vía WO-013b. Fast-forward en rama viva |
| **WO-013b** | Corregir criterios de avance en arquitectura funcional | ✅ **Merged** | `work/hermes/wo-013b-fix-advancement-criteria` → `feature/...` | `1ed2e9b` | Fast-forward merge a rama viva. Incluye WO-013 |
| **WO-014** | Plan formativo y protocolo de decisiones por fase | ✅ **Merged** | `work/hermes/wo-014-learning-decision-protocol` → `feature/...` | `bc68cb4` | Integrado vía WO-014b. Fast-forward en rama viva |
| **WO-014b** | Corrección editorial de status e índice tras WO-014 | ✅ **Merged** | `work/hermes/wo-014b-fix-status-index-formatting` → `feature/...` | `f843298` | Fast-forward merge a rama viva. Incluye WO-014 |

---

## Resumen

| Estado | Cantidad |
|--------|----------|
| ✅ Merged | 19 (Preflights, WO-001, WO-001b, WO-003 a WO-010, WO-012, WO-012b, WO-013, WO-013b, WO-014, WO-014b) |
| 📋 Ready for review | 0 |
| 🔄 Superseded | 1 (WO-011) |
| ⏸️ Pausada | 1 (WO-002) |
| 🔴 Bloqueada | 0 |
| ❌ Descartada | 0 |

**Total:** 20 work orders / preflights gestionadas.
