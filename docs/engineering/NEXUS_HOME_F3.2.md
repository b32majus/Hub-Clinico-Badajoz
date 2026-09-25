# PROMueve Nexus Home — F3.2

**Estado:** `MERGED — deterministic functional behavior demonstrated; NOT browser-qualified; EOL reproducibility debt open`
**Issue / WO:** #403 — `WO-NEXUS-F3.2`
**Base de ejecución:** `promueve/nexus-v4` @ `0847cbcc7891aaee7a776ac81d1f2a01bdc63ffe`
**Candidate:** `61e6e9ca54a787940dc5dc241f0eb517ce5f264d`
**Publicación:** PR #404 → merge `e9096e9bda1d20ac50f9c395823152b7f005403c`; tree `c34689308376c28d9d5e3e9330fcc938ad3c9506` idéntico al candidate
**Rama de trabajo:** `work/nexus-home-f3-2-403-v4retry-20260925`
**Canary Atenea:** `native-v4-heavy`; probe + WU-A + WU-B observaron `nan/deepseek-v4-flash` / `high`; reviews nativas WU-A/WU-B `APPROVED + burned`
**ADRs:** [ADR-002](../architecture/adr/ADR-002-modular-monolith-and-module-boundaries.md) · [ADR-003](../architecture/adr/ADR-003-hospital-deployment-and-configuration.md)
**Contrato de plataforma:** [`PLATFORM_CONTEXT_API.md`](PLATFORM_CONTEXT_API.md)

## Propósito

Primera entrada visible de plataforma Nexus (`nexus_home.html`), distinta de los
entrypoints legacy (`index.html` Reuma, `farmacia_index.html`). Consume
exclusivamente el seam F3.1 (`ConfigurationRepository.load` →
`PlatformContext.fromSnapshot`); no carga workbook/Excel, no transporta
paciente/dataset y no toca el runtime clínico.

## Composición

| Superficie | Responsabilidad |
| --- | --- |
| `nexus_home.html` / `nexus_home.css` | Entrypoint nuevo y estilos; carga exactamente los scripts del seam, los validators generados y los módulos Home |
| `modules/home/home-schema-validators.generated.js` | Validadores JSON Schema (subset draft 2020-12) generados offline desde `schemas/deployment/*.json`; adjunta `PromueveHome.SchemaValidators` |
| `tools/home_validators_build.mjs` | Codegen determinista; el rebuild es byte-idéntico al fichero committed |
| `modules/home/home-bootstrap.js` | `Bootstrap.bootstrap(input)` con input cerrado; delega en el seam y falla cerrado con códigos de plataforma estables; nunca lanza |
| `modules/home/home-renderer.js` | `renderHome` / `renderError` con marcadores DOM congelados (`nexus-home__product-name`, `nexus-home__site-name`, `nexus-home__tile`, `nexus-home__empty`, `nexus-home__error`) |
| `modules/home/home-page.js` | `Page.start()`: fetch de los cuatro artefactos empaquetados, bootstrap y render en `#home-root`; estados vacío y de error explícitos |
| `tools/nexus_home_check.mjs` | Oracle de aceptación WU-A (11 casos deterministas, congelado pre-escritura) |
| `tools/nexus_home_navigation_check.mjs` | Checker determinista WU-B de navegación/integración (11 casos) |
| Fixtures/artefactos | `tools/fixtures/home/` y `data/platform/home/` — 100% sintéticos; `reuma` cualificado/navegable, `farmacia` registrado-no-navegable |

## Navegación (WU-B)

- Los tiles existen solo para `getNavigableModules()`; la ruta se resuelve
  **en el momento del click** mediante `PlatformContext.getModuleRoute(moduleId)`
  y se navega en la misma pestaña con `window.location.assign(route)`.
- Nunca se renderiza una ruta/href al DOM ni se concatena/repara una ruta.
- `MODULE_UNKNOWN` / `MODULE_NOT_AVAILABLE` / ruta no string: estado de error
  explícito (`nexus-home__error` con el código); cero fallback, cero link
  inventado.
- Los entrypoints legacy siguen accesibles directamente y sin referencias a
  `nexus_home`.

## Verificación determinista

```bash
node tools/nexus_home_check.mjs            # 11 OK / 0 FALLIDO
node tools/nexus_home_navigation_check.mjs # 11 OK / 0 FALLIDO
npm run check:platform                     # seam F3.1 sin regresión
npm run verify:nexus                       # suite Nexus completa
```

Ambos checkers incluyen negativos plantados (manifest incoherente, registry
inválido, fetch fallido, validator ausente, input cerrado, módulo desconocido/
no disponible) y el check de cero transporte clínico/paciente sobre fuentes,
fixtures y salida renderizada.

### Verificación post-merge y deuda observada

Sobre un worktree fresco creado desde el merge exacto `e9096e9b...`:

- `nexus_home_navigation_check`: **11/11 PASS**;
- `npm run verify:nexus`: **PASS**;
- GitHub Actions `Nexus deterministic gates`, push run `36116079829`: **success**;
- `nexus_home_check`: **9/11 PASS**. Los únicos fallos son CASO 7 y CASO 8,
  ambos de reproducibilidad byte-identical. `.gitattributes` materializa JS/JSON
  como CRLF, mientras los builders escriben LF. Validators, manifest y readiness
  son byte-idénticos después de normalizar CRLF→LF (`normalized_equal=true`), por
  lo que no se observó un fallo de lógica/runtime en esta verificación. El gap
  queda registrado como `NEXUS-DEBT-011` en #407 y debe resolverse antes de
  activar los checks Home en CI (`NEXUS-DEBT-009`, #405), y no más tarde de F3.4.

La fidelidad futura del subset JSON Schema browser queda registrada como
`NEXUS-DEBT-010` (#405). Ninguna de estas deudas convierte F3.2 en browser-
qualified ni autoriza cambios técnicos dentro de esta reconciliación.

## Límites de madurez

- Estado de madurez: **determinísticamente demostrado en Node**; NO acredita
  QA de navegador, navegación/sesión cualificada (F3.3), release sintético
  (F3.4), piloto ni producción.
- Los tiles son click-only (sin activación por teclado); la accesibilidad de
  teclado queda como trabajo posterior dentro de F3.3.
- Corresponde al canary de ejecución `native-v4-heavy` de Atenea; el canary no
  reduce gates de calidad.
