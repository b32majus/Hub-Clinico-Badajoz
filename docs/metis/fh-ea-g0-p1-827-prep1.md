# WO FH-EA-G0-P1 · Prep 1 · Aislar «Causalidad final farmacéutica» del editor provisional

- **Base:** `5d236c6d531ce852582109fa6dc72d285d839dfb` (rama `promueve/nexus-v4`, PR #826 MERGED)
- **Autorización humana:** 25-10-2026, «OK, vamos» a una única WO correctiva clínica vía Metis pilot-9.4, camino corto `prep + run`. Sin GO para push/PR/merge/deploy/piloto clínico.
- **Evidencia previa:** `/srv/kairos-lab/metis-runs/nexus/fh-ea-r3/review-pages-g0-20261025/`; testigo Chromium `review-pages-g0-finalcontrol-20261025/final-control.json` con `{"before":"Probable","other":"Probable","returning":"Probable"}`.

## Problema

En la aplicación pública de Seguimiento (`farmacia_seguimiento.html` + `scripts/farmacia_seguimiento.js`), con datos sintéticos y controles soportados: un paciente sintético con un EA nuevo (cefalea) y dos fármacos introducidos por la UI marcados expresamente como sospechosos de ese EA. En la sección G0 de causalidad, con el sospechoso A seleccionado, se elige `Probable` en el selector heredado «Causalidad final farmacéutica» (`#fhCausalidadFinal`, dentro de `#modResumenCausalidad`). Al cambiar en `#fhCausalitySuspect` al sospechoso B **sin evaluarlo**, el selector muestra `Probable` igualmente, y lo conserva al volver a A.

Causa focal en BASE: `refreshEaCausalityEditor()` solo gestiona `#fhCausalidadFinal` con `finalAssessment.disabled = !editing` — el control heredado permanece **visible y operable** en el editor G0 provisional y **su valor nunca se restablece al cambiar de sospechoso**, por lo que una categoría formal elegida para una pareja (EA × sospechoso) se muestra y arrastra a cualquier otra pareja. La captura G0 aceptada valora por **EA × sospechoso × método × acto**; no admite trasladar causalidad entre sospechosos.

Reproducido en este prep con oráculo propio en la base exacta (testigo del oráculo, sesión A):

- BASE: `A editing → {"visible":true,"disabled":false,"value":"No evaluada"}`; tras elegir `Probable` en A y cambiar a B: `{"shown":"Probable"}`; al volver a A: `{"value":"Probable"}`.
- No se ha probado persistencia ni exportación formal de este valor: el fallo demostrado es **en UI**. El oráculo no afirma fuga donde no existe evidencia; las aserciones de almacenamiento y guardias de exportación son regresiones que ya pasan en BASE.

## Comportamiento solicitado (hechos numerados)

1. **Aislamiento por pareja (BASE RED):** con la interacción soportada A `Probable` → B sin evaluación, ninguna pareja B muestra ni recibe categoría formal por A; tampoco al volver a A (`B→A`). El oráculo reproduce el hecho en la base exacta y falla ahí; con la solución correcta el hecho ya no puede reproducirse.
2. **Control final heredado no presentable ni operable (FIX GREEN):** en el contexto G0 provisional el selector heredado `#fhCausalidadFinal` no debe estar visible ni operable como evaluación válida (solución mínima preferente: **ocultar y deshabilitar**, incluida su etiqueta), manteniendo el estado clínicamente neutro `No evaluada` sin arrastrar `Probable` a otro contexto.
3. **Sin valoración formal heredada presentable ni entregable:** el resumen visible de causalidad no presenta ninguna categoría formal heredada («Probable»), y las líneas que la salida TXT/JARA copia no contienen ninguna categoría formal heredada. No se afirma ni exige nada más sobre persistencia/exportación formal (sin evidencia de fuga).
4. **A→B→A, B→A y EA1→EA2 (regresión):** no se transfieren valoraciones ni estados formales; los borradores de Naranjo y Karch-Lasagna por pareja y método se mantienen aislados y se restauran exactamente.
5. **Cambio de paciente A→B→A en flujo soportado (regresión):** no se arrastra causalidad formal ni borradores entre pacientes; la edición de causalidad G0 no produce escritura en almacenamiento por EA (`data-fh-transient`).
6. **Sin sospechoso explícito (regresión):** controles de causalidad no operables; ninguna puntuación calculada por ausencia o nombre de fármaco.
7. **T01 y guardias intactos (regresión):** comportamiento 0/1/2/5 EA, sospechosos solo por marca expresa y guardias de exportación TXT/JARA/CSV/Excel/Export V2 sin cambios ( witness `verify-nexus` + aserciones del oráculo con 2 EA).
8. **Calidad de sesión:** Chromium real, datos sintéticos, `console.error=0` y `pageerror=0`, al menos desktop (1440×900) y móvil focal (390×844); `node --check` y `git diff --check` limpios.

## Fuera de alcance

- F4.4, F4.5, Export V2/CSV/Excel/JARA salvo aserciones de regresión.
- T02+ continuidad/recurrencia; persistencia; identidad/sospecha FH-EA-02B.
- Algoritmo o puntuación clínica Naranjo/Karch; CSS/UX general; backend; Reuma; Dermatología.
- `main`, despliegues, datos reales; refactorizar la máquina singular legacy fuera del defecto focal; reescribir historial.
- Cualquier valoración formal futura de «causalidad final farmacéutica» (requiere otra WO con contrato y origen autorizado).
- No reclamar acto preparado, evaluación clínica formal, histórico, guardado ni aptitud para piloto.

## Trazabilidad

| # | Requisito | Witness / criterio visual |
|---|---|---|
| 1 | A `Probable` → B sin evaluación no muestra `Probable`; B→A tampoco | `g0-final-control-oracle` (sesión A/D, `reproducirHechoBaseSiOperable`, `mustFailAtBase: true`); visual C2 |
| 2 | Selector final heredado no visible ni operable; estado neutro «No evaluada» | `g0-final-control-oracle` (`exigirFinalNeutroYNoOperable`, sesiones A/B/D); visual C1 |
| 3 | Sin categoría formal heredada en resumen visible ni en líneas TXT/JARA | `g0-final-control-oracle` (`exigirFinalNeutroYNoOperable`); visual C1/C2 |
| 4 | A→B→A, B→A, EA1→EA2 sin transferencia; borradores Naranjo/Karch aislados | `g0-final-control-oracle` (sesión A, aserciones de chips y restauración exacta; `mustFailAtBase` cubierto por el mismo witness RED) |
| 5 | Cambio de paciente A→B→A sin arrastre; sin escritura en almacenamiento por EA | `g0-final-control-oracle` (sesión B: traps de `Storage.setItem`, volcados de sessionStorage/localStorage, `getEaEvents()`) |
| 6 | Sin sospechoso explícito: controles no operables, sin puntuación | `g0-final-control-oracle` (sesión C) |
| 7 | T01 0/1/2/5 EA, marca expresa, guardias TXT/JARA/CSV/Excel/V2 | `verify-nexus` (regresión repo, ya presente) + `g0-final-control-oracle` (sesión A: guardia TXT visible con 2 EA, frontera v2 con intento real; sospechosos solo por marca expresa en la preparación soportada) |
| 8 | Chromium real, sintético, consola/pageerror 0, desktop + móvil | `g0-final-control-oracle` (sesiones A–D con contadores de consola; sesión D = móvil 390×844). La receta visual dispara solo en desktop 1440×900: el sidebar recortado a 390px es un rasgo preexistente de la página, ajeno a esta unidad (ver Open questions) |

## Open questions

- **Infra de instalación (resuelta antes de `run`):** el preflight `npm ci --offline` fallaba (INFRA_STOP, exit 1) porque la caché npm local solo tenía `fast-uri@3.1.9` y `ajv@8.20.0` no cacheado, mientras `package-lock.json` fija `fast-uri@3.1.8` (dependencia de `ajv`). Se calentó la caché npm del entorno (`npm cache add fast-uri@3.1.8`, `npm cache add ajv@8.20.0`) sin tocar `package.json`/`package-lock.json` (doNotTouch) ni añadir dependencias; `npm ci --offline --no-audit --no-fund --ignore-scripts` verifica OK en el checkout. No requiere cambios de repositorio.
- **Receta visual solo desktop:** el gate visual rechazó el disparo móvil `g0-final-control-movil` porque el sidebar de la página («Inicio Farmacia», «Validación», …) queda recortado por el borde a 390px — rasgo preexistente de la página en BASE, fuera del defecto focal y del NO TOCA (CSS/UX general). El foco móvil del hecho reproducido sigue cubierto por el oráculo (sesión D, 390×844, consola/pageerror 0, interacción soportada completa). La receta visual dispara únicamente a 1440×900, donde el cambio visible (ausencia del selector final heredado) es plenamente juzgable.
- **Variante «solo deshabilitado»:** el oráculo exige ocultar **y** deshabilitar (solución mínima preferente del issue). Un control visible pero inerte con presentación neutral quedaría fuera de este oráculo; la persona que apruebe la preparación puede relajarlo explícitamente si considera suficiente la variante deshabilitada.
- **Texto de ayuda «Puedes apoyarte en Naranjo y Karch-Lasagna para registrar la valoración final.»:** el oráculo no lo exige oculto; la referencia lo oculta porque solo tiene sentido junto al selector eliminado. Decisión final de redacción es del escritor.
- **«Sin exportación»:** el issue no aporta evidencia de fuga a exportación/persistencia; el oráculo lo cubre solo como no-regresión (resumen visible y líneas TXT/JARA sin categoría heredada, guardias intactos). Cobertura profunda de Export V2/CSV/Excel queda fuera (NO TOCA).
- **Alcance 5 EA:** el comportamiento 0/1/2 EA está asertado en el oráculo y 5 EA queda cubierto por las suites de repo (`verify-nexus`) sin witness focal propio.

## Metis unit

```metis-unit
{
  "schema": "metis.unit/v1",
  "unit": "g0-final-control-isolation",
  "riskClass": "complex",
  "uiImpact": "quality",
  "sizeClass": "S",
  "maxCorrections": 1,
  "allowedPaths": ["scripts/farmacia_seguimiento.js"],
  "doNotTouch": [],
  "ports": [4731],
  "witness": [
    {"id": "g0-final-control-oracle", "cmd": ["node", "metis/oracles/g0-final-control-isolation.mjs"], "timeoutSec": 600, "mustFailAtBase": true}
  ],
  "visualRecipe": "metis/visual/g0-final-control-isolation/recipe.mjs",
  "visual": {
    "cmd": ["node", "metis/visual/g0-final-control-isolation/recipe.mjs"],
    "timeoutSec": 300,
    "shots": ["g0-final-control-contexto", "g0-final-control-otro-sospechoso"],
    "criteria": [
      "C1: en «Resumen de causalidad» no aparece el selector heredado «Causalidad final farmacéutica» ni su etiqueta ni el texto de registro de valoración final; el resumen muestra solo contexto (fármaco sospechoso), Naranjo y Karch-Lasagna.",
      "C2: al cambiar de sospechoso sin evaluarlo, el resumen muestra el estado neutro del contexto («No evaluado») y ninguna categoría formal heredada («Probable») atribuida a la nueva pareja."
    ]
  }
}
```
