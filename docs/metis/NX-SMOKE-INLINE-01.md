# NX-SMOKE-INLINE-01 — Recuento correcto de estilos inline en smoke Farmacia

**Superficie:** `tools/farmacia_smoke_check.mjs`, comprobación [5] («Sin style= inline en farmacia_*.html»), ejecutada desde `npm run smoke` / CI Nexus.

## Problema real demostrado

Durante la auditoría de PR clínica #798 el smoke informó de 7 líneas con estilos inline, aunque la inspección detectó 9 atributos en 8 líneas. La comprobación [5] usa una expresión regular con estado interno entre líneas y produce un recuento dependiente de la posición de las coincidencias.

El testigo independiente `tools/farmacia_smoke_inline_style_state.test.mjs` reproduce una situación con **dos líneas consecutivas** con `style=`, primero al final de una línea larga y después al principio de una corta. En BASE el smoke **rechaza** el fichero pero cuenta incorrectamente «1 líneas» en lugar de «2 líneas». Es defecto del diagnóstico de CI, **no** una incidencia visual, clínica ni de la UI del producto.

## Comportamiento pedido

1. En [5], contar **todas las líneas no comentadas** que contienen atributos HTML `style=`, independientemente de la longitud o posición de las coincidencias anteriores. El caso adversarial debe informar `farmacia_farmacos.html (2 líneas)`. No contar dos veces una línea con varios atributos.
2. Preservar el comportamiento existente: **cero** líneas con estilo inline permiten smoke exitoso; **una o más** causan fallo del control con salida no cero. Mantener **exactamente** el formato del mensaje de fallo `style= inline en <archivo> (<N> líneas)`, incluido «líneas» con N = 1. No modificar los demás checks o mensajes esenciales.
3. Preservar la excepción actual para **comentario HTML de línea completa** que empieza por `<!--` tras recortar espacios. No ampliar ni reinterpretar la política de comentarios o implementar un parser HTML.
4. Mantener los 49 checks de smoke del repo canónico y no cambiar HTML, CSS, datos, scripts clínicos ni interfaces.

**Consumidores directos:** `package.json` (scripts `smoke`, `verify:fast`) y GitHub Actions Nexus deterministic gates; conservar ambos sin escritura.

**Fuera de alcance:** cambios oportunistas en otros regex globales (DNI/teléfono), arquitecturas QA, `.github/`, `package.json`, `AGENTS.md`, `CODING_STANDARDS.md`, páginas, JS clínico, datasets, fixtures congelados, Metis/Atenea. Si descubres un consumidor obligatorio adicional, termina con `METIS_STOP: <motivo>`.

**Evidencia BASE ya reproducida:** `node --test tools/farmacia_smoke_inline_style_state.test.mjs` → 4 PASS y 1 FAIL solo por `actual 1 !== expected 2`; `node tools/farmacia_smoke_check.mjs` → 49/49 PASS, datos sintéticos, sin red.

```metis-unit
{
  "schema": "metis.unit/v1",
  "unit": "nx-smoke-inline-01",
  "riskClass": "volume",
  "uiImpact": "none",
  "sizeClass": "S",
  "maxCorrections": 1,
  "allowedPaths": ["tools/farmacia_smoke_check.mjs"],
  "doNotTouch": [
    "tools/farmacia_smoke_inline_style_state.test.mjs",
    "docs/",
    ".github/",
    "package.json",
    "AGENTS.md",
    "CODING_STANDARDS.md",
    "farmacia_seguimiento.html",
    "farmacia_farmacos.html",
    "farmacia_style.css",
    "scripts/"
  ],
  "ports": [],
  "witness": [
    {"id":"two-line-inline-style-count","cmd":["node","--test","tools/farmacia_smoke_inline_style_state.test.mjs"],"timeoutSec":60},
    {"id":"smoke-regression","cmd":["node","tools/farmacia_smoke_check.mjs"],"timeoutSec":60,"mustFailAtBase":false}
  ]
}
```
