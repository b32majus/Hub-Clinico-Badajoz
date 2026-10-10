# Train 21 — Reuma: vía manual TXT→CSV cuando no existe Clipboard API

**Status:** ACCEPTED FOR LOCAL PREPARATION / LOCAL IMPLEMENTATION ONLY, no remote WO, no push/PR/merge. Fuente: decisión humana posterior a Train 20 y contrato aceptado `TRAIN_NEXUS_REUMA_TXT_GATE_20_SPEC.md`. Rama canónica base `promueve/nexus-v4@ae06dce5e94044772c14435d32af062d9ac9859e`.

## Problem Statement

En Primera Visita y Seguimiento Reuma, la ausencia de `navigator.clipboard` o de su método `writeText` hace que `exportarTXT` termine antes de ofrecer el modal, y que `copyTextWithFallback` rechace el CSV sin modal. Es una limitación de compatibilidad del cliente, particularmente relevante al evaluar entornos de intranet sin contexto seguro, **no** prueba de que el hospital haya elegido HTTP. El profesional pierde una vía manual aceptada pese a conservar capacidad de seleccionar/copiar o guardar texto. Ningún fallo de portapapeles debe habilitar CSV ni dar un éxito falso.

## Solution

Conservar el recorrido asistencial **Exportar TXT → copia/atestación explícita → Exportar CSV** sin API del portapapeles, utilizando exclusivamente las alternativas manuales ya publicadas. El TXT habilita CSV solo tras éxito real verificable del botón `Copiar` o confirmación explícita `He copiado el TXT` / `He guardado el TXT`; no basta mostrar, seleccionar o descargar. El CSV, cuando `navigator.clipboard.writeText` es inexistente, muestra el modal manual del texto exacto de 497 campos y nunca presenta checklist/toast de copia automática exitosa. Si tampoco existe modal, ambos recorridos fallan cerrados y explican el siguiente paso; no se crea un nuevo sistema de almacenamiento.

## User Stories / acceptance (observables, falsables)

1. Como profesional en Primera Visita, cuando no existe Clipboard API y pulso **Exportar TXT**, obtengo el modal real con la nota completa y cuatro acciones existentes; CSV permanece bloqueado hasta confirmación válida.
2. Como profesional en Seguimiento, recibo esa misma posibilidad sin cambiar el contrato de visita ni introducir tratamiento nuevo.
3. Como profesional, puedo confirmar manualmente una copia/descarga TXT realizada mediante una acción soportada; **el permiso efímero existente** habilita CSV solo con mismo contexto/datos exportables.
4. Como profesional, cerrar el modal, fallar al copiar o no atestiguar conserva CSV bloqueado y evita mensajes engañosos.
5. Como profesional que ya confirmó TXT, pulso **Exportar CSV** sin Clipboard API y obtengo el modal manual con fila exactamente idéntica a `projectVisitAct497` (497 columnas) en Primera Visita y Seguimiento; el gate sigue vigente.
6. Como profesional, si el modal CSV no se puede abrir, recibo un fallo veraz, nunca éxito o checklist automático.
7. Como clínico, la ausencia de dato, selección de fármaco, tratamiento previo y estados de validación **no cambian** como efecto de esta compatibilidad.
8. Como operador, los casos con Clipboard API disponible (copia real / rechazo / excepción) siguen funcionando como en Train 20 y Solicitud FH no cambia.

## Implementation Decisions — CLOSED, no redescubrir

- Fuente única del gate en memoria y de atestación: `modules/exportManager.js` + `modules/formController.js::mostrarModalTexto`, aprobados/publicados en Train 20. No abrir otro gate, retener datos clínicos o escribir marcadores Web Storage.
- `exportarTXT` debe tratar la **API ausente como fallo de transporte** que alcance el mismo fallback ya aceptado para rechazo de la promesa. No reabrir reglas de temporización, estado en vuelo ni protección de resultados stale.
- `copyTextWithFallback` debe utilizar el mismo `openManualCopyModal` cuando falta la API, sin asumir copia exitosa ni alterar el éxito real de Clipboard API.
- Los dos consumidores relevantes CSV son `exportarAct497` (ruta normal Visit Act) y `exportarYCopiarCSV` (boundary compatible): ambos reutilizan `entregarFilaProyectadaCSV`. No duplicar arreglos por pantalla o consumidor.
- Conservar la **modalidad TXT con cuatro acciones** y CSV/FH con sus dos acciones; su aspecto y texto siguen siendo autoridad publicada.
- Seleccionar la condición técnica precisa `!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function'`, sin depender de que la API exista en todos los navegadores.
- Selección manual y descarga iniciada **no acreditan** pegado en HCE. Las confirmaciones de historia clínica y de CSV son distintas; la copia/atestación TXT no certifica subida o registro.
- No inferir instalación/versión de Farmatool, TLS ni servidor hospitalario.

## Test Decisions — REUSE FIRST, proof por fase

- Antes de tocar producción, congelar un **testigo de aceptación independiente del implementador** para: TXT sin API abre modal pero no autoriza por apertura; luego la atestación permite CSV; CSV sin API muestra modal de fila 497 sin checklist de copia. Ejecutar RED contra base publicada.
- Reutilizar `tools/reuma_txt_gate_memory_browser_check.mjs` (D10 y E1–E7), `tools/reuma_shared_modal_copy_truth_browser_check.mjs` (C4/C5), `tools/reuma_export_boundary_browser_check.mjs` (497 / transporte), `tools/reuma_txt_gate_integrity_browser_check.mjs` (invariante de edición). **Extender mínimamente** harness existentes, no duplicar otras 4000 líneas ni cambiar resultados antiguos que sigan siendo válidos.
- Implementador T21-01: pruebas focales TXT sin API PV/Seguimiento, rechazo y cancelación; T21-02: pruebas focales CSV real PV/Seguimiento y fallos veraces.
- Integración: ambos recorridos, dos consumidores CSV si representan rutas realmente soportadas, smoke de modal FH si se altera helper compartido. Revisión canónica única Standards + Spec sobre candidato fijo; corrector fresco y RED→GREEN solo de findings autorizados, máximo dos intentos.
- UI realmente renderizada: comprobación corta a 390 y 1280 px si la vía no-API expone el modal; visibilidad, cuatro botones accesibles y clics efectivos, reutilizando C2. No hacer una campaña responsive nueva, CSS NO TOCA.
- Suite `npm run verify:nexus` solo en integración/closeout si lo justifica el candidato, no cada ticket. Si los checks globales se corren, verificar `ajv` antes. No falsificar bfcache ni estados clínicos imposibles.

## Out of Scope / NO TOCA

CSV formal/proyección de 497, contenido TXT, inferencias terapéuticas, `sessionStorage`/`localStorage`, legacy `hubPendingRows`, control del gate, CSS, `formController.js`, HCE/Farmatool, Excel/Bridge/SQL, PDF, baseline clínico Seguimiento 3.2.15, PCR site, BASFI, múltiples módulos, documentales vivos INDEX/WOS/ledger, `main`. Nada de datos reales.

## STOP / publicación

HUMAN STOP si exige modificar callbacks del modal, estado/semántica del gate, datos clínicos, nuevas rutas, requisitos de privacidad o un renderer/servidor alternativo; si el proof no puede reproducir ausencia de API sin manipular controles clínicos; si surge un defecto fuera del seam; o tras dos correcciones sin GO. Local only: commits atómicos y QA; sin issue mutation, push, PR, merge ni deploy. La operadora decide publicación después de Cora Gate 3/4 cuando corresponda.
