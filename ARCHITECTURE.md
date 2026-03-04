# HUB Clínico Badajoz — Arquitectura del Proyecto

> **Propósito**: Referencia rápida para entender la estructura, dependencias y flujos del proyecto sin tener que re-investigar el código.

## Visión General

Aplicación clínica web **offline-first** para gestión de pacientes reumatológicos (EspA y APs). Se ejecuta como archivos estáticos (sin servidor, sin build, sin npm). No usa ES6 modules — todo funciona via `<script>` tags y el namespace global `HubTools`.

**Restricción clave**: No puede usar import/export ni frameworks. La app debe funcionar abriendo el HTML directamente sin instalación, para cumplir restricciones STIC hospitalarias.

---

## Estructura de Archivos

```
├── index.html                    # Dashboard principal (lista pacientes)
├── primera_visita.html           # Formulario primera visita
├── seguimiento.html              # Formulario visita de seguimiento
├── estadisticas.html             # Panel de estadísticas
│
├── style.css                     # Estilos globales (compartido por index/estadísticas)
├── style_primera_visita.css      # CSS base compartido (primera visita + índices)
├── style_seguimiento.css         # CSS seguimiento (importa style_primera_visita.css + extensiones)
│
├── script.js                     # Coordinador de index.html
│
├── modules/                      # Módulos funcionales (namespace HubTools)
│   ├── hubTools.js               # ★ ENTRY POINT - Define namespace HubTools y sub-namespaces
│   ├── formController.js         # Formularios: validación, collapsibles, adaptación por patología, score wiring
│   ├── scoreCalculators.js       # Cálculos puros: BASDAI, ASDAS, HAQ, MDA, RAPID3, LEI
│   ├── homunculus.js             # Homúnculo SVG interactivo (NAD/NAT/Dactilitis)
│   ├── dataManager.js            # Gestión de datos, localStorage, búsqueda pacientes
│   ├── exportManager.js          # Exportación TXT y CSV
│   └── utils.js                  # Utilidades: IMC, notificaciones, helpers
│
├── scripts/                      # Coordinadores de página (orquestan módulos)
│   ├── script_primera_visita.js  # Coordinador primera_visita.html
│   └── script_seguimiento.js     # Coordinador seguimiento.html
│
├── data/                         # Datos estáticos
│   ├── farmacos.json             # Base de datos de fármacos
│   └── mock_patients.js          # Pacientes mock (temporal, para desarrollo)
│
├── TODO.md                       # Tareas pendientes
└── ARCHITECTURE.md               # ★ ESTE ARCHIVO
```

---

## Patrón de Arquitectura: Namespace Global

```
window.HubTools = {
    form:       { ... }    ← formController.js
    scores:     { ... }    ← scoreCalculators.js
    homunculus: { ... }    ← homunculus.js
    data:       { ... }    ← dataManager.js
    export:     { ... }    ← exportManager.js
    utils:      { ... }    ← utils.js
    dashboard:  { ... }    ← script.js (solo en index.html)
}
```

Cada módulo se registra en su sub-namespace al cargar. Los coordinadores de página (`scripts/script_*.js`) orquestan llamando a `HubTools.modulo.funcion()`.

---

## Jerarquía CSS

```
primera_visita.html  →  style_primera_visita.css (base + índices compartidos)
seguimiento.html     →  style_seguimiento.css
                              └── @import style_primera_visita.css (hereda todo)
                              └── + estilos exclusivos de seguimiento
```

> ⚠️ Los estilos de índices (pruebas-apartado, indices-apartado, haq-*, mda-*, rapid3-*, etc.) están en `style_primera_visita.css` Y también en `style_seguimiento.css` (duplicación conocida, deuda técnica menor, no causa bugs).

---

## Flujo de Carga (orden de scripts en HTML)

```html
<!-- Ambas páginas siguen este orden -->
<script src="modules/hubTools.js"></script>      <!-- 1. Namespace -->
<script src="modules/utils.js"></script>          <!-- 2. Utils -->
<script src="modules/dataManager.js"></script>    <!-- 3. Datos -->
<script src="modules/formController.js"></script> <!-- 4. Formularios -->
<script src="modules/scoreCalculators.js"></script><!-- 5. Calculadoras -->
<script src="modules/homunculus.js"></script>     <!-- 6. Homúnculo -->
<script src="modules/exportManager.js"></script>  <!-- 7. Exportación -->
<script src="data/farmacos.json"></script>        <!-- 8. Datos fármacos -->
<script src="data/mock_patients.js"></script>     <!-- 9. Mocks (temporal) -->
<script src="scripts/script_X.js"></script>       <!-- 10. Coordinador -->
```

---

## Score Wiring (Flujo de Datos de Calculadoras)

La función `HubTools.form.initScoreWiring()` (en `formController.js`) conecta los inputs con las calculadoras. Se llama desde ambos coordinadores de página.

### Flujo de datos:

```
Pruebas Complementarias
  pcrValue ──sync──→ asdasPCR (readonly)  ──→ calcularASDAS()
  vsgValue ──sync──→ asdasVSG (readonly)  ──→ calcularASDAS()

Homúnculo (homunculus.js)
  Click articulación ──→ updateASDASFromHomunculus()
    ├── asdasNAD (readonly) ──→ calcularASDASLocal() [= recalcularASDAS]
    ├── asdasNAT (readonly) ──→ calcularMDALocal()   [= recalcularMDA]
    └── Contadores NAD/NAT del homúnculo

BASDAI (P1-P6) ──input──→ recalcularBASDAI() ──→ basdaiResult + color

ASDAS inputs ──input──→ recalcularASDAS() ──→ asdasCrpResult + asdasEsrResult + color

HAQ selects ──change──→ recalcularHAQ() ──cascada──→ recalcularRAPID3() + recalcularMDA()

LEI checkboxes ──change──→ recalcularLEI() ──cascada──→ recalcularMDA()

EVA Global/Dolor ──input──→ recalcularMDA() + recalcularRAPID3()
```

### Funciones expuestas a window (para homunculus.js):
- `window.calcularASDASLocal` → referencia a `recalcularASDAS()`
- `window.calcularMDALocal` → referencia a `recalcularMDA()`

---

## Patología → Secciones Visibles

`HubTools.form.adaptarFormulario(patologia)` muestra/oculta secciones según la patología:

| Sección | EspA | APs |
|---|---|---|
| BASDAI | ✅ `.espa-only` | ❌ |
| ASDAS | ✅ `.espa-aps-only` | ✅ |
| HAQ-DI | ❌ | ✅ `.aps-only` |
| MDA | ❌ | ✅ `.aps-only` |
| RAPID3 | ❌ | ✅ `.aps-only` |
| LEI | ❌ | ✅ `.aps-only` |
| CASPAR | ❌ | ✅ `.aps-only` |
| Criterios ASAS | ✅ `.espa-only` | ❌ |

---

## Funciones Clave por Módulo

### formController.js
| Función | Propósito |
|---|---|
| `inicializarCollapsibles()` | Secciones desplegables |
| `adaptarFormulario(patologia)` | Muestra/oculta secciones por patología |
| `validarFormulario()` | Validación primera visita |
| `validarFormularioSeguimiento()` | Validación seguimiento |
| `recopilarDatosFormulario()` | Recopila datos primera visita |
| `recopilarDatosFormularioSeguimiento()` | Recopila datos seguimiento |
| `prefillSeguimientoForm(datos)` | Pre-rellena formulario con datos históricos |
| `initScoreWiring()` | ★ Conecta inputs con calculadoras |

### scoreCalculators.js
| Función | Input → Output |
|---|---|
| `calcularBASDAI(datos)` | P1-P6 → score 0-10 |
| `calcularASDAS(datos)` | {dolorEspalda, rigidez, evaGlobal, NAD, PCR, VSG} → {asdasCRP, asdasESR} |
| `calcularHAQ(datos)` | 8 categorías + ayudas → score 0-3 |
| `calcularMDA(datos)` | {NAT,NAD,PASI,BSA,LEI,EVA,HAQ} → {criterios[], cumplidos, mdaAlcanzado} |
| `calcularRAPID3(datos)` | {HAQ, EVA dolor, EVA global} → {total, categoria} |
| `categorizeScore(value, type)` | Score → {label, color, backgroundColor} |

### homunculus.js
| Función | Propósito |
|---|---|
| `initHomunculus()` | Inicializa SVG interactivo |
| `updateASDASFromHomunculus()` | Actualiza NAD/NAT en campos ASDAS + llama calcularASDASLocal/MDALocal |

---

## IDs HTML Críticos (usados por el wiring)

```
Pruebas:     pcrValue, vsgValue
ASDAS:       asdasDolorEspalda, asdasDuracionRigidez, asdasEvaGlobal,
             asdasNAD (readonly), asdasNAT (readonly),
             asdasPCR (readonly), asdasVSG (readonly),
             asdasCrpResult (readonly), asdasEsrResult (readonly)
BASDAI:      basdaiP1..P6, basdaiResult (readonly)
EVA:         evaGlobal, evaDolor
HAQ:         .haq-score[data-category="1..8"], .haq-aid[data-category="1..8"], haqTotal
LEI:         .lei-point (checkboxes), leiTotal
MDA:         mdaNAT, mdaNAD, mdaPsoriasis, mdaLEI, mdaEvaDolor, mdaEvaGlobal,
             mdaHAQ, mdaCumplidos, mdaResultadoFinal, mdaStatus1..7, mdaCriterio1..7
RAPID3:      rapid3Funcion, rapid3Dolor, rapid3Global, rapid3Total, rapid3Categoria
Psoriasis:   pasiValue, bsaValue
```

---

*Última actualización: 2026-03-04*
