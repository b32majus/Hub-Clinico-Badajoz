# NX-DEPLOY-PATH-02 — generador de manifiestos compatible con rutas locales con espacios y Unicode

**Superficie:** `tools/deployment_manifest_build.mjs`, generador determinista de la composición Nexus F2.1. Consumidores conocidos: script `check:manifest` en `package.json` (mediante `tools/deployment_manifest_check.mjs`), builder/readiness y las composiciones sintéticas de deployment. Solo corrección de resolución de ruta local del propio generador, no alteración de su contrato de despliegue.

## Problema reproducido

El builder pasa en un checkout local con nombre ASCII simple, pero falla cuando el código está ubicado en una carpeta real con espacios o caracteres no ASCII. Intenta leer su propio schema en una ruta de disco con `%20` o `%C3%B1` literales en lugar de caracteres del sistema de archivos: `ENOENT .../path%20with%20spaces/schemas/deployment/module-registry.schema.json`. La diferencia procede de la resolución de URL local del módulo; los mismos archivos JSON válidos deben funcionar con independencia del nombre de carpeta.

Testigo independiente: `tools/deployment_manifest_path_portability.test.mjs` copia el **builder real**, tres schemas reales y fixtures sintéticos a subdirectorios temporales con nombres ASCII, espacios y Unicode. La instalación `npm ci --offline` facilita Ajv desde la caché sin peticiones de red. En BASE reproduce **2 PASS / 3 FAIL** exclusivamente por rutas localmente codificadas; regresión `tools/deployment_manifest_check.mjs` **12/12 PASS**. La corrección no está implementada en esta preparación.

## Requisitos verificables

1. Si el builder y sus schemas están en un checkout cuyo directorio real contiene espacios, generar un manifiesto válido desde el mismo registry/profile sintéticos que funcionan en una ruta normal; no intentar rutas de esquema con secuencias `%20` literales.
2. Si la ruta del checkout contiene caracteres Unicode, generar el mismo manifiesto válido; no intentar abrir rutas de esquema con secuencias codificadas de la URL como `%C3%B1` literales.
3. En la ruta con espacios, un profile sintético que selecciona `derma` no registrado debe **seguir fallando por la razón semántica correcta**, con salida no cero y mensaje que contenga `not registered in the module registry`, no por `ENOENT` del schema. No transformar un documento inválido en válido.
4. En la ruta ASCII normal, mantener manifiesto válido con dos módulos `farmacia` y `reuma`, mismo `deploymentId` `bad-synthetic-demo-01` y hashes de procedencia; conservar determinismo, golden, controles de integridad y rechazo del profile inválido. El checker `node tools/deployment_manifest_check.mjs` debe conservar todos sus checks en PASS, incluidos normalización EOL y módulo ausente.
5. Conservar el contrato de CLI (`registry.json profile.json [out.json]`), reglas clínicas y fail-closed, esquema, IDs, orden de módulos, hash y formato de salida. No modificar rutas de otros builders ni recursos empaquetados; ningún acceso externo, dependencia o configuración nueva. Si fuera imprescindible salir de este único archivo, termina con `METIS_STOP: <motivo>`.

## Trazabilidad de aceptación

| Requisito | Evidencia en el testigo / regresión |
| --- | --- |
| 1 | `checkout directory containing spaces produces a valid manifest` (testigo nuevo) |
| 2 | `checkout directory containing non-ASCII characters produces a valid manifest` (testigo nuevo) |
| 3 | `invalid profile in a path with spaces fails for its semantic reason` (testigo nuevo) |
| 4 | `ordinary ASCII checkout keeps producing a valid manifest`, `ordinary checkout preserves the invalid-profile fail-closed rule` y `deployment-manifest-regression` |
| 5 | `deployment-manifest-regression` + gate de diff restringido a un único builder, sin alterar los demás contratos |

## Fuera de alcance

No realizar refactor general de loaders, AJV, paths de otros scripts, UI/Nexus Home ni cambios en golden JSON/schema, manifests/fixtures, scripts de npm, CI, Atenea, Metis o artefactos clínicos. Esta unidad no aprueba nuevos contratos de despliegue, datos reales ni aptitud para piloto.

```metis-unit
{
  "schema": "metis.unit/v1",
  "unit": "nx-deploy-path-02",
  "riskClass": "volume",
  "uiImpact": "none",
  "sizeClass": "S",
  "maxCorrections": 1,
  "allowedPaths": ["tools/deployment_manifest_build.mjs"],
  "doNotTouch": [
    "tools/deployment_manifest_path_portability.test.mjs",
    "tools/deployment_manifest_check.mjs",
    "tools/deployment_readiness_build.mjs",
    "tools/fixtures/deployment/",
    "schemas/",
    "docs/",
    "package.json",
    "package-lock.json",
    ".github/",
    "AGENTS.md",
    "CODING_STANDARDS.md"
  ],
  "ports": [],
  "install": ["npm", "ci", "--offline", "--no-audit", "--no-fund", "--ignore-scripts"],
  "witness": [
    {"id":"portable-local-path","cmd":["node","--test","tools/deployment_manifest_path_portability.test.mjs"],"timeoutSec":90},
    {"id":"deployment-manifest-regression","cmd":["node","tools/deployment_manifest_check.mjs"],"timeoutSec":90,"mustFailAtBase":false}
  ]
}
```
