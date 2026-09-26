# PROMueve Nexus Home — F3.4

**Estado:** `PUBLICADO — release Home sintético determinista y browser-qualified; evaluación sintética, no piloto/producción`
**Fecha:** 2026-09-26
**Issue / WO:** #414 — F3.4 (padre #409), reconciliación post-merge #416
**Base de ejecución:** `work/nexus-home-qualification-03-409-20260925`; Q5a `2407532`, Q5b `612bc03`; candidate final `9004b443619bc2eb8002165de6261176e27db8e9`
**Publicación:** PR #415 → merge `6e6413c4e9cb163f11ee193c24c8f287c9ebdc36` en `promueve/nexus-v4`; tree `1d6834f59c38bd90e883174a773579cd20c474ee` idéntico al candidate; fresh worktree post-merge `npm ci` + `npm run verify:nexus` PASS
**ADRs:** [ADR-007](../architecture/adr/ADR-007-release-tooling-and-quality.md) · [ADR-003](../architecture/adr/ADR-003-hospital-deployment-and-configuration.md) · [ADR-002](../architecture/adr/ADR-002-modular-monolith-and-module-boundaries.md)
**Documento previo:** [`NEXUS_HOME_F3.2.md`](NEXUS_HOME_F3.2.md)

## Propósito

Componer y cualificar **un artefacto de release sintético e inmutable** para el
Home de plataforma Nexus. F3.4 no inventa una jerarquía de artefactos nueva:
reúne piezas ya existentes y ya validadas (el Home F3.2, el seam de plataforma
F3.1 y los artefactos de despliegue empaquetados) en un manifest de release
determinista, y después demuestra que la **unidad declarada por ese manifest es
autosuficiente en un navegador real** sirviéndola aislada de todo el repositorio.

Este documento cubre dos entregables del WU Q5b:

- `tools/nexus_home_release_browser_check.mjs` — cualificación browser del
  **artefacto materializado** (no del árbol del repositorio);
- este propio documento `docs/engineering/NEXUS_HOME_F3.4.md`, referenciado por
  el campo `rollback.documentedIn` del manifest.

## Composición

| Superficie | Responsabilidad |
| --- | --- |
| `tools/home_release_build.mjs` | Builder determinista del manifest de release (WU Q5a, `2407532`). Compone la unidad inmutable desde el manifest de despliegue empaquetado, la vista de readiness y el mapa de releases; congela la lista de ficheros de código Home por SHA-256. No muta fuentes. |
| `tools/home_release_check.mjs` | Checker determinista Node (WU Q5a). Reproducibilidad, validación estructural ADR-007, detección de drift, negativos plantados y escaneo de cero transporte clínico. Entra en `verify:nexus`. |
| `tools/nexus_home_release_browser_check.mjs` | Checker **browser** (WU Q5b). Construye el manifest, materializa el artefacto y lo sirve aislado en Chromium real. Fuera de `verify:nexus` (QA de navegador; `NEXUS-DEBT-009`). |
| Fixtures / artefactos | `tools/fixtures/home/` y `data/platform/home/` — 100% sintéticos; `reuma` cualificado/navegable, `farmacia` registrado-no-navegable. |

### Unidad de release declarada (ADR-007)

`code.files` es la lista congelada del release Home; el artefacto bajo prueba
contiene **exactamente**:

- los ficheros de `code.files`: `nexus_home.html`, `nexus_home.css`,
  `modules/platform/configuration-repository.js`, `modules/platform/platform-context.js`,
  `modules/home/home-bootstrap.js`, `modules/home/home-renderer.js`,
  `modules/home/home-page.js`, `modules/home/home-schema-validators.generated.js`;
- los cuatro artefactos de configuración `data/platform/home/*.json`
  (`module-registry.json`, `deployment-profile.json`, `deployment-manifest.json`,
  `module-readiness.json`);
- el propio manifest de release (`release-manifest.json`).

Campos del manifest de release (ADR-007): `homeReleaseVersion`, `releaseId`,
`site` (`deploymentId`, `siteId`, `display`), `modules`
(`moduleId`, `label`, `route`, `available`, `qualificationState`, `release`,
`readiness`), `code` (`files`, `filesSha256`), `config`
(`registrySha256`, `profileSha256`, `manifestSha256`, `readinessSha256`),
`contracts` (versiones + `schemaIds`), `tooling` (cadenas estáticas),
`gates` (`deterministic`, `browser.site`, `browser.releaseArtifact`), `rollback`
y `releaseSha256`. Cada ámbito de `browser` declara exactamente
`{ suite, requirement }`: `site` apunta a la suite que cualifica el sitio
completo y `releaseArtifact` a la que cualifica el artefacto de release
materializado; el puntero nunca es ambiguo entre ambos.

## Cómo construir y verificar

```bash
# Construir el manifest de release desde las entradas empaquetadas reales
node tools/home_release_build.mjs \
  data/platform/home/deployment-manifest.json \
  data/platform/home/module-readiness.json \
  tools/fixtures/home/module-releases.json \
  /tmp/release-manifest.json

# Verificación determinista (Node; entra en verify:nexus)
node tools/home_release_check.mjs            # 15 OK / 0 FALLIDO
npm run verify:nexus                         # suite Nexus completa

# Cualificación browser del artefacto (Chromium real; NO entra en verify:nexus)
node tools/nexus_home_release_browser_check.mjs
```

`tools/nexus_home_release_browser_check.mjs` materializa el artefacto en un
directorio temporal (`os.tmpdir()`), lo sirve como sitio estático **aislado** y
ejecuta las escenas A0/A1/A2/A3. Salida: bloque `ENVIRONMENT` (Chromium,
headless, Node, puerto, `releaseId`, raíz del artefacto),
`RESULTADO: N OK / 0 FALLIDO` y `F3.4 Home release artifact browser qualification PASSED`;
código de salida distinto de cero ante cualquier fallo.

## Garantías de reproducibilidad

- **Doble build byte-idéntico:** dos ejecuciones del builder sobre las mismas
  entradas producen bytes idénticos (JSON canónico: indentación de 2 espacios,
  LF, newline final).
- **Invariancia CRLF:** todos los SHA-256 se calculan sobre bytes
  canonicalizados a LF (CRLF y CR sueltos → LF), de forma que un checkout con
  ficheros CRLF produce el mismo `releaseId` y los mismos hashes
  (`NEXUS-DEBT-001`).
- **Sin datos de entorno en runtime:** `tooling` son cadenas estáticas; no hay
  timestamps, ni `process.version`, ni datos de entorno en ninguna parte del
  manifest, por lo que el release es idéntico entre máquinas y ejecuciones.

## Negativos plantados

Sobre el checker determinista (`tools/home_release_check.mjs`):

1. **Drift de código:** el builder apunta a un árbol temporal con un byte
   alterado en `nexus_home.css`; se detecta el drift y se nombra el fichero.
2. **Fichero de código ausente:** falla cerrado y no escribe artefacto.
3. **Manifest schema-inválido:** falla cerrado y no escribe artefacto.
4. **Drift de configuración schema-válido:** un manifest alterado cambia
   `config.manifestSha256` y `releaseSha256`.
5. **Mapa de releases sin un módulo desplegado:** falla cerrado y lo nombra.
6. **Tooling manipulado / campo desconocido:** rechazado por la validación
   estructural.
7. **Punteros de evidencia browser defectuosos:** punteros de ámbito
   intercambiados, un ámbito `site`/`releaseArtifact` ausente, literales de
   `requirement` intercambiados o la forma plana legacy son rechazados por la
   validación estructural nombrando el puntero infractor
   (`gates.browser.<ámbito>.suite|requirement`).
8. **Puntero de suite colgante:** una ruta de suite sintetizada que no es un
   fichero real del repositorio falla la validación estructural y nombra la
   suite ausente.

Sobre el checker browser hay además una garantía de frontera: A0/A0b verifican
que el artefacto materializado contiene exactamente la unidad declarada, y A3
verifica que Home no solicita nada fuera de ella.

## Frontera de navegador del artefacto y F3.3

F3.3 (`7c73f37`, `tools/nexus_home_f33_browser_check.mjs`) cualificó el Home
**sobre el sitio completo**: sirviendo la raíz del repositorio, las 8 escenas
(S1–S8) pasan en Chromium real. F3.4 WU Q5b añade la capa que F3.3 no cubre: la
cualificación del **artefacto de release declarado**, servido aislado.

El manifest de release declara esa frontera de forma explícita en
`gates.browser`, con dos ámbitos disjuntos y literales exactos:

- `gates.browser.site = { suite: "tools/nexus_home_f33_browser_check.mjs",
  requirement: "PASS on the full repository site" }` — cualificación F3.3 sobre
  el sitio completo del repositorio (8 escenas S1–S8);
- `gates.browser.releaseArtifact = { suite:
  "tools/nexus_home_release_browser_check.mjs", requirement: "PASS on the
  release artifact" }` — cualificación del artefacto materializado y servido
  aislado (escenas A0/A0b/A1/A2/A3).

`tools/home_release_check.mjs` exige exactamente esa forma de dos ámbitos:
rechaza la forma plana legacy, un ámbito ausente, un puntero o un literal de
requisito intercambiados, cualquier clave desconocida bajo `gates.browser` o
 dentro de un ámbito, y un puntero de suite que no resuelva a un fichero real
del repositorio (resuelto relativo a la raíz).

Frontera honesta del artefacto:

- **Ruta autorizada fuera de la unidad:** al pulsar el tile, el Home navega en
  la misma pestaña a `<origin>/index.html` (la ruta del módulo `reuma`). Ese
  documento **no forma parte de la unidad de release Home** (lo aporta el
  despliegue del sitio / release legacy), por lo que servido desde el artefacto
  aislado responde **404**. El 404 se **adjudica explícitamente** en la salida
  (se imprime estado y cuerpo) y `pageerror` permanece en 0; el `goBack()` real
  re-renderiza el Home con su tile en la misma pestaña.
- **Recurso browser-level fuera de la unidad:** el artefacto no declara icono,
  así que Chromium emite su única petición implícita `/favicon.ico`
  (browser-level, nunca iniciada por Home) en el primer documento del origen.
  El checker calienta el origen con una navegación previa sin scripting y
  reinicia los buffers, de modo que el `console.error === 0` de A1 mide el
  documento Home, y la petición browser-level queda adjudicada e impresa.
- **Autocontención (A3):** se recoge cada URL solicitada durante A1/A2; la única
  respuesta no perteneciente al conjunto declarado es el 404 adjudicado de la
  ruta objetivo. No hay fuga a CDN, vendor ni rutas del repositorio.

## Reversión

Coincide con el campo `rollback` del manifest de release:

> `remove the Home entrypoint (nexus_home.html) and its files; legacy entrypoints index.html and farmacia_index.html remain direct and functional`

Es decir: para revertir, se retiran `nexus_home.html` y los ficheros Home
declarados en `code.files`. Los entrypoints legacy `index.html` (Reuma) y
`farmacia_index.html` permanecen accesibles directamente y funcionales, sin
referencias a `nexus_home`. **No se toca ningún snapshot** (ni Cáceres ni legacy)
durante build, verificación ni reversión.

## Límites de madurez

- **Evidencia de release SINTÉTICA únicamente.** Este WU demuestra que el
  artefacto declarado se compone, se verifica y se cualifica en navegador real;
  **NO** es evidencia de piloto ni de producción.
- No se introduce ni transporta **dato real de paciente**; todos los fixtures y
  artefactos son sintéticos y el Home no transporta paciente/dataset.
- **Los snapshots Cáceres/legacy no se tocan.** El builder, el checker y el
  checker browser no mutan `previews/`, `templates/`, `snapshots/` ni código
  clínico.
- El checker browser **no entra en `verify:nexus`**: la QA de navegador permanece
  fuera del gate determinista y se ejecuta explícitamente. `NEXUS-DEBT-009` sí está
  RESOLVED porque los checks deterministas Home + navegación están cableados en CI.
- La cualificación de F3.4 no sustituye la cualificación funcional completa
  (F3.3, ya PASS sobre el sitio completo) ni acredita accesibilidad de teclado,
  que sigue como trabajo posterior.
- La Promotion Review sobre el candidate exacto terminó PASS y 0 blockers; preservó
  como deuda material no bloqueante `NEXUS-DEBT-012` (puntero de evidencia browser
  del release manifest) y `NEXUS-DEBT-013` (forma array de `items` en el validator).
  `NEXUS-DEBT-012` queda RESOLVED en este train: `gates.browser` declara ahora los
  dos ámbitos `site` y `releaseArtifact`, cada uno apuntando a la suite que
  realmente cualifica su alcance, y la validación estructural rechaza cualquier
  puntero ambiguo, ausente o colgante. `NEXUS-DEBT-013` queda RESOLVED en el mismo
  train (ticket T2 #421): el gate de build `tools/home_validators_build.mjs` es
  ahora sensible a la forma de `items` y rechaza determinísticamente la forma array
  (tuple) nombrando schema, puntero y forma, sin escribir artefacto de salida; el
  hardening checker incorpora el negativo plantado N5 (control prístino, fallo
  cerrado, ausencia de artefacto, preexistente intacto) y su barrido N4 trata la
  forma array como no soportada; ningún schema aceptado usa esa forma y el
  artefacto generado permanece byte-idéntico. N2 documental quedó reconciliado por #416.
- La ruta real de esa Promotion Review fue `nan/deepseek-v4-flash` high por elección
  explícita de la operadora; el manifest de evidencia heredado conservaba el literal
  `openai-codex/gpt-5.6-sol`. La desviación de metadata se conserva como hecho y la
  review no se repitió por decisión humana.
