# WO documental — Reuma D2 → D3 → D1 · cierre postmerge

**Fecha:** 2026-10-13 · **Issue aprobada:** [#766](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/766) (`status:approved`).
**Autoridad:** petición humana de publicar, mergear si correcto, reconciliar y limpiar de forma segura.
**Publicación clínica:** [PR #765](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/765) MERGED `ca2e6c549f96026c90ca79157bcbd3f641c685cd` en `promueve/nexus-v4`.
**Estado acreditado:** IMPLEMENTADO/PUBLICADO; QA sintética con navegador; **NO PILOTO**.

## Objetivo y contexto

Cerrar documentalmente las correcciones de procedencia terapéutica originadas por la QA read-only [#693](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/693), ejecutadas en Atenea C-087 con WOs aprobadas #762, #763 y #764:

- **D2 / #762:** Seguimiento acredita «Tratamiento Actual» únicamente con la propiedad física explícita `Tratamiento_Actual`, nunca a partir de `Biologico`, `FAME`, `Sistemico` ni alias del plan.
- **D3 / #763:** `Tratamiento_Actual` y `Fecha_Inicio_Tratamiento` deben pertenecer a la última visita física. Última visita sin tratamiento físico = no retroceder a antiguos; literal `No` sin inicio activo.
- **D1 / #764:** historial de Dashboard solo con tratamientos físicos registrados, etiquetados «Registrado» sin atribuir actividad actual. No inventar tratamiento desde planes, inicios desde fechas de visita ni anotaciones terapéuticas sin inicio explícito.

## Base / preflight / trazabilidad

Repositorio `b32majus/Hub-Clinico-Badajoz`. HEAD canónico de partida `ca2e6c549f96026c90ca79157bcbd3f641c685cd` verificado en GitHub, tras cinco commits de PR #765. Rama documental aislada `docs/reuma-treatment-d2d3d1-postmerge-20261013`, sin modificar `main`.

La PR clínica tuvo cuatro checks verdes; repetición independiente Cora: Seguimiento Chromium **22/22**, migración Read Port **12/12**, Dashboard Chromium **173/173 (exit 0)**. [CI Nexus postmerge 38425084311](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/38425084311) y [Pages 38425083484](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/38425083484) finalizaron **SUCCESS** sobre `ca2e6c549f96026c90ca79157bcbd3f641c685cd`. Los tres issues clínicos fueron cerrados administrativamente como `completed`.

## RUTAS / NO TOCA

**Rutas:** `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, `docs/ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md`, esta WO. Solo cuatro Markdown.

**NO TOCA:** JavaScript, CSS, HTML, pruebas, algoritmos clínicos, contrato CSV/TXT 497, Read Port, Farmacia, `main`, arnés Atenea y trabajo ajeno. Ni dosis, pauta, vía, validación FH, START/SWITCH/ADD_ON, ni persistencia hospitalaria derivada. Cuatro handoffs originales locales/untracked preservados.

## QA documental y aceptación

- Diff limitado a las cuatro rutas; `git diff --check` PASS; enlaces relativos y referencias contrastados.
- INDEX, WORK_ORDER_STATUS y ledger concuerdan en PR, merge, pruebas y madurez.
- Lo **demostrado**: código integrado, recorridos locales con interacciones soportadas y datos sintéticos, CI y Pages build/deployment.
- Lo **no demostrado**: QA manual del sitio Pages, datos reales, uso asistencial, persistencia institucional, seguridad de piloto y aptitud para producción.

## REVERSIÓN / política / OUTPUT

Reversión mediante revert específico con autorización; no reset, force-push, rebase ni limpieza destructiva. WO propia de documentación con commit, push, PR y merge autorizados por la petición de cierre humano, solo si checks y scope verde. Cerrar #766 como `completed` tras su merge. Reportar SHA/PR documental y estado de recursos locales sin borrar ramas ni handoffs ajenos.
