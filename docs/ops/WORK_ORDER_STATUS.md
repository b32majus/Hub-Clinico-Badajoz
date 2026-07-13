# Work Order Status — Hub Clínico Badajoz

**Última actualización:** 2026-07-13
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
| **WO-015** | Documentar capa temporal de entrada multipatología para Farmacia | ✅ **Merged** | `work/hermes/wo-015-documentar-capa-entrada-farmacia` → `feature/...` | `d3f785f` | Mergeado vía WO-015b. Fast-forward en rama viva |
| **WO-015b** | Corregir frase truncada en arquitectura funcional tras WO-015 | ✅ **Merged** | `work/hermes/wo-015b-fix-arquitectura-frase-perfiles` → `feature/...` | `c3bade0` | Fast-forward merge a rama viva. Incluye WO-015 |
| **WO-016** | Especificación funcional Farmacia Hospitalaria v0.1 para demo 2026-06-08 | ✅ **Merged** | `work/hermes/wo-016-especificacion-funcional-farmacia-v0-1` → `feature/...` | `f5a6397` | Fast-forward merge a rama viva |
| **WO-DOC-ROADMAP-POST-SES-01** | Roadmap de arquitectura post-SES | ✅ Merged | `work/hermes/WO-DOC-ROADMAP-POST-SES-01-20260710` → `preview/demo-lunes-wo4-20260614` | `14e86b29` (PR #9) | Documento canónico propuesto; sin cambios de código ni merge automático |
| **WO-DOC-ARCHIVE-POST-SES-01** | Archivar documentos obsoletos post-SES | ✅ Merged | `work/hermes/WO-DOC-ARCHIVE-POST-SES-01-20260710` → `preview/demo-lunes-wo4-20260614` | `fa2a4d53` (PR #10) | Mueve tres documentos legacy a `docs/archive/` y corrige enlaces canónicos; sin cambios de código/demo |
| **WO-DOC-UPDATE-ARCHITECTURE-POST-SES-01** | Alinear arquitectura con estado post-SES | ✅ Merged | `work/hermes/WO-DOC-UPDATE-ARCHITECTURE-POST-SES-01-20260710` → `preview/demo-lunes-wo4-20260614` | `dc1ce11` (PR #11) | Actualiza `ARCHITECTURE.md` con estado real de Farmacia preview, distinción demo/piloto/producción y arquitectura futura propuesta; sin cambios de código |
| **WO-DOC-DECISION-DISCOVERY-REUMA-FH-POST-SES-01** | Decisión no merge Reuma-Farmacia + guía discovery Badajoz/Mérida | 📋 Ready for review | `work/hermes/WO-DOC-DECISION-DISCOVERY-REUMA-FH-POST-SES-01-20260710` → `preview/demo-lunes-wo4-20260614` | — | Documentos estratégicos de discovery; sin cambios de código ni merge |
| **WO-DOC-INDEX-CONTROL-PLANE-POST-SES-01** | Índice documental maestro + control plane federado | 📋 Ready for review | `work/hermes/WO-DOC-INDEX-CONTROL-PLANE-POST-SES-01-20260713` → `preview/demo-lunes-wo4-20260614` | — | Documentación; sin cambios de código. |

---

## Bloque Farmacia Hospitalaria v0.1 — rama frozen (fallback)

> 📌 **Rama:** `work/hermes/nightly-farmacia-v0-1-20260606`
> **Estado:** `fallback_ready` — demo principal migrada a v0.2 candidate
> **Merge:** ❌ No mergeado. Mantener frozen como respaldo operativo.
> **Base:** `feature/reuma-v2-prebiologico-fh-les-sjogren`

| WO | Título | Estado | Rama | Merge/Commit | Notas |
|----|--------|--------|------|-------------|-------|
| **WO-017** | Shell UI Farmacia | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | `e1892e0` | Commit en rama nocturna. No mergeado |
| **WO-018** | Buscador CIP + Quick View + alta guiada | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | — | Commit en rama nocturna. No mergeado |
| **WO-019** | Validación farmacoterapéutica | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | — | Commit en rama nocturna. No mergeado |
| **WO-020** | Primera visita Farmacia | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | — | Commit en rama nocturna. No mergeado |
| **WO-021** | Seguimiento Farmacia + Morisky-Green | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | — | Commit en rama nocturna. No mergeado |
| **WO-022** | Dashboard paciente Farmacia | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | — | Commit en rama nocturna. No mergeado |
| **WO-023** | Dataset demo + catálogos | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | — | Commit en rama nocturna. No mergeado |
| **WO-024** | Export TXT JARA + CSV básico | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | — | Commit en rama nocturna. No mergeado |
| **WO-025** | Smoke/reporte macro inicial | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | — | Commit en rama nocturna. No mergeado |
| **WO-026** | Hardening demo previo a visual review | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | `0ceac8b` | Commit en rama nocturna. No mergeado |
| **WO-027** | Executive summary Farmacia demo | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | `5ce00a4` | Resumen ejecutivo. No mergeado |
| **WO-028** | Auditoría visual + global Claude | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | `9fa56ad`, `0d893e4` | Auditorías visual y global. No mergeado |
| **WO-029** | Pulido pre-demo | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | `947b066` | Correcciones visuales P1/P2. No mergeado |
| **WO-030** | Robustez pre-demo | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | — | Guards JS, innerHTML zero. No mergeado |
| **WO-031** | Reducción deuda técnica pre-demo | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | `22e7a93` | Centralización common.js. No mergeado |
| **WO-032-lite** | Limpieza con tokens limitados + smoke check | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | `a80b4af` | Smoke check 33/33 OK. No mergeado |
| **WO-033-lite** | Freeze demo + CI smoke check | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | `d0d9739`, `0ac562d` | CI workflow + freeze doc. No mergeado |
| **WO-034** | Cierre documental global Farmacia v0.1 | 📋 Ready for review | `work/hermes/nightly-farmacia-v0-1-20260606` | `1fe6f9b` | Cierre documental global; no mergeado; rama congelada para demo |

---

## Bloque Farmacia Hospitalaria v0.2 — Autocomplete dual (demo principal)

> 📌 **Rama demo principal:** `work/hermes/farmacia-demo-v0-2-candidate-20260606`
> **Estado:** ✅ `validated_for_demo` — validada por Sil como demo del lunes 2026-06-08
> **Commit:** `d631ee70c9f7f6c98929d58596f2c6dcca73051e`
> **Base:** `work/hermes/nightly-farmacia-v0-1-20260606` (`95003a2`)
> **Merge:** ❌ No mergeado. Rama candidata para demo. Post-demo decidir merge.

| WO | Título | Estado | Rama | Commit | Notas |
|----|--------|--------|------|--------|-------|
| **WO-035** | Catálogo CIMA v0.1 (extracción + Excel dual) | 🔄 Superseded | `work/farmacia-catalogo-cima-v0-1-20260606` | `3047673` | **Superseded by WO-036.** Catálogo completo 16k registros. Reemplazado por hospitalario filtrado. PR #3 draft, sin merge |
| **WO-036** | Autocomplete farmacológico dual hospitalario v0.2 | 🟢 **Validated** | `work/hermes/farmacia-demo-v0-2-candidate-20260606` | `d631ee7` | **Validado por Sil como demo principal.** 7 archivos, 4.032 registros, SheetJS local, sin CDN |
| **WO-037** | Rama limpia PR #5 (histórico squash) | 📋 Draft | `work/farmacia-v0-2-autocomplete-dual-clean-20260606` | `b5643fd` | PR #5 draft. Rama limpia desde main (2 commits). No mergear |
| **WO-038** | Auditoría técnica pre-prueba v0.2 candidate | ✅ Completada | `work/hermes/farmacia-demo-v0-2-candidate-20260606` | — | Auditoría PM Codex. Sin P0/P1, P3 documentales. `pending_attention` |

---

## Resumen

| Estado | Cantidad |
|--------|----------|
| ✅ Merged | 25 (Preflights, WO-001, WO-001b, WO-003 a WO-010, WO-012, WO-012b, WO-013, WO-013b, WO-014, WO-014b, WO-015, WO-015b, WO-016, WO-DOC-ROADMAP-POST-SES-01, WO-DOC-ARCHIVE-POST-SES-01, WO-DOC-UPDATE-ARCHITECTURE-POST-SES-01) |
| 📋 Ready for review | 21 (WO-017 a WO-034 — rama nocturna Farmacia frozen) + 1 (WO-037 — PR #5 draft) + 1 (WO-DOC-DECISION-DISCOVERY-REUMA-FH-POST-SES-01) + 1 (WO-DOC-INDEX-CONTROL-PLANE-POST-SES-01) |
| 🟢 Validated | 1 (WO-036 — v0.2 candidate) |
| 🔄 Superseded | 2 (WO-011, WO-035) |
| ✅ Completada | 1 (WO-038 — auditoría pre-prueba) |
| ⏸️ Pausada | 1 (WO-002) |
| 🔴 Bloqueada | 0 |
| ❌ Descartada | 0 |

**Total:** 51 work orders / preflights gestionadas.
