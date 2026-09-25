# PROMueve Nexus Home — F3.4

**Estado:** `IMPLEMENTED — artefacto de release sintético construido, verificado y cualificado en navegador real; pendiente de commit/review`
**Issue / WO:** #414 — F3.4 (padre #409), WU Q5b
**Base de ejecución:** rama `work/nexus-home-qualification-03-409-20260925` @ `2407532` (builder + checker F3.4), sobre F3.3 `7c73f37`
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
`gates` (`deterministic`, `browser`), `rollback` y `releaseSha256`.

## Cómo construir y verificar

```bash
# Construir el manifest de release desde las entradas empaquetadas reales
node tools/home_release_build.mjs \
  data/platform/home/deployment-manifest.json \
  data/platform/home/module-readiness.json \
  tools/fixtures/home/module-releases.json \
  /tmp/release-manifest.json

# Verificación determinista (Node; entra en verify:nexus)
node tools/home_release_check.mjs            # 13 OK / 0 FALLIDO
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

Sobre el checker browser hay además una garantía de frontera: A0/A0b verifican
que el artefacto materializado contiene exactamente la unidad declarada, y A3
verifica que Home no solicita nada fuera de ella.

## Frontera de navegador del artefacto y F3.3

F3.3 (`7c73f37`, `tools/nexus_home_f33_browser_check.mjs`) cualificó el Home
**sobre el sitio completo**: sirviendo la raíz del repositorio, las 8 escenas
(S1–S8) pasan en Chromium real. F3.4 WU Q5b añade la capa que F3.3 no cubre: la
cualificación del **artefacto de release declarado**, servido aislado.

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
- El checker browser **no entra en `verify:nexus`** (`NEXUS-DEBT-009`): la QA de
  navegador permanece fuera del gate determinista y se ejecuta explícitamente.
- La cualificación de F3.4 no sustituye la cualificación funcional completa
  (F3.3, ya PASS sobre el sitio completo) ni acredita accesibilidad de teclado,
  que sigue como trabajo posterior.
