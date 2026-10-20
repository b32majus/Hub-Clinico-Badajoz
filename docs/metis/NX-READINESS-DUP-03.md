# NX-READINESS-DUP-03 — rechazar moduleId duplicados en la entrada del readiness builder

**Superficie:** `tools/deployment_readiness_build.mjs`, herramienta F2.2 que deriva la vista técnica de readiness/navegación a partir de un manifiesto resuelto y un release map. Consumidores existentes: `tools/deployment_readiness_check.mjs`, `npm run check:readiness` y el proceso offline de construcción de deployment. No cambia la interfaz ni contratos clínicos.

## Defecto observado en BASE

El builder ya rechaza módulos duplicados en el **release map**, pero no comprueba duplicados de `moduleId` en `manifest.modules`. Un manifiesto sintético con dos entradas `farmacia` —idénticas o con `entryPath` contradictorio— termina con exit code 0 y emite una vista readiness con dos entradas `farmacia`. Esto crea una representación ambigua en un artefacto que debe ser determinista y fail-closed. El mismo problema se reproduce duplicando `reuma` al principio del array. Por contraste, el manifest checker existente ya considera la duplicación de `moduleId` un error; la entrada al readiness builder no debe suponer integridad no validada en este punto.

## Requisitos numerados y verificables

1. **Duplicado idéntico:** cuando `manifest.modules` repite un `moduleId` incluso con el resto de propiedades iguales, el readiness builder debe salir con **código 1**, informar semánticamente de `duplicate moduleId` incluyendo el ID concreto (`farmacia` en el testigo) y **no crear** el archivo de salida solicitado. Nunca normalizar silenciosamente ni crear dos entradas para el mismo ID.
2. **Duplicado contradictorio:** si `manifest.modules` repite `farmacia` con rutas distintas, aplicar la misma regla (exit 1, error `duplicate moduleId` con `farmacia`, sin archivo de salida). No elegir ninguna ruta por posición ni escribir una vista parcial.
3. **Independiente del ID o la posición:** la protección se aplica también a `reuma` cuando la entrada duplicada aparece en la primera posición: código 1, diagnóstico `duplicate moduleId` con `reuma`, sin salida.
4. **Entradas válidas sin cambios:** el manifest golden produce el mismo documento readiness golden de la versión actual, y si se invierte el orden de los módulos válidos, el readiness conserva exactamente el orden del manifest y las rutas `entryPath` correspondientes. Mantener el contrato CLI `node tools/deployment_readiness_build.mjs <manifest.json> <releases.json> [out.json]`, versión, rutas, `available`, estados, capacidades y datos sin variaciones.
5. **Fallos existentes conservados:** seguir rechazando semánticamente los duplicados del release map con `duplicate moduleId in release map`; las entradas sin release/readiness con `has no release/readiness entry`; los módulos desconocidos del release map con `not part of the resolved deployment manifest`. Todos salen con código 1, no crean artefacto; la regresión existente `deployment_readiness_check.mjs` permanece totalmente verde.
6. **Alcance mínimo:** añadir solo el guard de integridad del array de entrada en `tools/deployment_readiness_build.mjs`. Ninguna dependencia o acceso de red nuevos; no tocar manifest builder, checker, schemas, fixtures, release map, npm, workflow CI, otros datos, UI o capacidades. La corrección debe ser agnóstica al número y nombres de módulos. Si resultara imprescindible salir del único archivo autorizado, terminar con `METIS_STOP: <motivo>`.

## Trazabilidad del comportamiento pedido

| Requisito | Caso independiente |
| --- | --- |
| 1 | `readiness-duplicate-witness`: `identical duplicate farmacia moduleId is rejected with no output` |
| 2 | `readiness-duplicate-witness`: `conflicting duplicate farmacia moduleId is rejected with no output` |
| 3 | `readiness-duplicate-witness`: `duplicate reuma moduleId is rejected regardless of position` |
| 4 | `readiness-duplicate-witness`: `valid manifest yields the original golden readiness document`; `valid reordered manifest retains its module order`; `readiness-existing-regression` |
| 5 | `readiness-duplicate-witness`: `duplicate release-map moduleId keeps its existing rejection message`; `missing deployed module in release map remains rejected fail-closed`; `unknown release-map module remains rejected fail-closed`; `readiness-existing-regression` |
| 6 | `readiness-existing-regression` + gate de un solo archivo modificado |

## Testigos y límites

`tools/deployment_readiness_duplicate_module.test.mjs` ejecuta **el builder real** del checkout con manifestos y release maps sintéticos. Genera mutaciones exclusivamente en un directorio temporal y comprueba salida, código de proceso y inexistencia de artefactos cuando el input es ambiguo. No mockea el builder ni prescribe un mecanismo de implementación. **BASE verificada:** 5 PASS y 3 FAIL estrictamente por la aceptación de duplicados, mientras `tools/deployment_readiness_check.mjs` permanece 10/10 PASS. Los testigos se mantienen congelados durante la implementación.

**Fuera de alcance:** cambios visuales/UX, clínica, intervención en otros productores/consumidores del manifest, migraciones de schemas, reparación amplia de la autenticidad del manifest, refactor de AJV, logs Metis, `main`, cambios de permisos y cualquier integración de runtime.

```metis-unit
{
  "schema": "metis.unit/v1",
  "unit": "nx-readiness-dup-03",
  "riskClass": "volume",
  "uiImpact": "none",
  "sizeClass": "S",
  "maxCorrections": 1,
  "allowedPaths": ["tools/deployment_readiness_build.mjs"],
  "doNotTouch": [
    "tools/deployment_readiness_duplicate_module.test.mjs",
    "tools/deployment_readiness_check.mjs",
    "tools/deployment_manifest_build.mjs",
    "tools/deployment_manifest_check.mjs",
    "tools/fixtures/deployment/",
    "schemas/",
    "docs/",
    "package.json",
    "package-lock.json",
    ".github/",
    "opencode.jsonc",
    "AGENTS.md",
    "CODING_STANDARDS.md"
  ],
  "ports": [],
  "install": ["npm", "ci", "--offline", "--no-audit", "--no-fund", "--ignore-scripts"],
  "witness": [
    {"id":"readiness-duplicate-witness","cmd":["node","--test","tools/deployment_readiness_duplicate_module.test.mjs"],"timeoutSec":90},
    {"id":"readiness-existing-regression","cmd":["node","tools/deployment_readiness_check.mjs"],"timeoutSec":90,"mustFailAtBase":false}
  ]
}
```
