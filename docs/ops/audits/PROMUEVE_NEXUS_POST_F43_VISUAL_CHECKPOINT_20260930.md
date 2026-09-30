# PROMueve Nexus — Checkpoint visual post-F4.3 — 2026-09-30

**Estado:** `COMPLETADO CON HALLAZGO PRODUCT_DEFECT_BLOCKING — HUMAN STOP; el checkpoint NO declara salida limpia` *(reconciliación posterior 2026-09-30: PV-001 `RESOLVED/PUBLISHED` por #482 / PR #484; ver §8. El estado histórico del checkpoint no se reescribe.)*
**Fecha:** 2026-09-30
**Issue / WO:** #480 (WO-NEXUS-POST-F43-VISUAL-CHECKPOINT), parte del TRAIN #479 (T1)
**Base verificada:** `origin/promueve/nexus-v4` @ `91262d8007642aef1d3cbe21e24d20ff369ee19b` (merge PR #478, tree `bd088cc01ef3321e6183041b77dccca213334501`; CI post-merge `Nexus deterministic gates` run `36744075965` = success)
**Rama de trabajo:** `work/nexus-f43-postmerge-checkpoint10-479-20260930`
**Baseline determinista:** `npm ci` + `npm run verify:nexus` PASS al inicio y al final del checkpoint (exit 0)
**Alcance:** QA visual/funcional read-only con navegador real. Cero cambios de producto, runtime, HTML/CSS/JS, tests o checkers.

## 1. Entorno y método

| Elemento | Valor |
| --- | --- |
| Navegador | Chromium 151.0.7922.34 headless (mismo ejecutable que las suites browser publicadas) |
| Runtime | Node v24.15.0; Playwright global; servidor estático local efímero (mismo patrón que los checkers F4.3) |
| Datos | Exclusivamente sintéticos/demo versionados (`CIP-DEMO-FH-001/002`, CIP desconocidos sintéticos) |
| Interacción | Sólo interacciones soportadas: navegación por URL publicada, relleno de buscadores, botones, `Enter`, toggle de panel, aceptación del diálogo de confirmación de cambio de paciente |
| Prohibido y no realizado | Manipulación de DOM/`readonly`, fixtures imposibles, mutación de estado no alcanzable por usuario, llamada a internos privados como flujo de usuario |
| Registro | `console.error` y `pageerror` capturados por recorrido (ruido de recurso filtrado adjudicado por el mismo filtro de los checkers publicados) |
| Sondeos temporales | Los scripts de sondeo usados para completar observaciones viven en `/tmp` y **no están versionados**; ningún artefacto binario ni screenshot entra al repo |

Superficies cubiertas por checkers browser existentes (reutilizados, sin modificación):

| Suite | Resultado |
| --- | --- |
| `node tools/nexus_home_f33_browser_check.mjs` | `RESULTADO: 8 OK / 0 FALLIDO` |
| `node tools/nexus_home_navigation_check.mjs` | `RESULTADO: 11 OK / 0 FALLIDO` |
| `node tools/nexus_home_check.mjs` | `RESULTADO: 11 OK / 0 FALLIDO` |
| `node tools/farmacia_f43a_dashboard_read_browser_check.mjs` | `4 passed, 0 failed` |
| `node tools/farmacia_f43b_validacion_primera_visita_read_browser_check.mjs` | `8 passed, 0 failed` |
| `node tools/farmacia_f43c_seguimiento_estadisticas_read_browser_check.mjs` | `5 passed, 0 failed` |
| `node tools/farmacia_f43d_residual_read_browser_check.mjs` | `PASS 7 scenarios` |

Observaciones que las suites anteriores no cubrían se completaron con navegador real mediante sondeos soportados (secciones 2 y 3). Además se ejecutó un sondeo diagnóstico instrumental (contexto desechable, fuera del repo) para identificar el escritor exacto del valor observado en PV-001; es evidencia de diagnóstico, no parte del recorrido de usuario.

## 2. Matriz de superficies y recorridos

### 2.1 `nexus_home.html`

| # | Recorrido | Resultado observado | Clasificación |
| --- | --- | --- | --- |
| HOME-01 | Carga real, site/módulos visibles según configuración publicada | `PROMueve Nexus — Home`; texto visible `Deployment sintético BAD (demo)`; tile navegable `reuma` (habilitado); `farmacia` registrado-no-navegable según readiness. Consistente con las suites F3.3/nav/WU-A (30 aserciones PASS) | `PASS` |
| HOME-02 | Estados fail-closed sin datos clínicos en Home | S3/S5 de la suite F3.3: empty state explícito y error de manifest fail-closed con cero tiles y cero error; S6 cero transporte paciente/dataset | `PASS` |

### 2.2 `farmacia_index.html` (Inicio)

| # | Recorrido | Resultado observado | Clasificación |
| --- | --- | --- | --- |
| INI-01 | Carga y estado vacío sin CIP | Input de búsqueda vacío, Quick View oculto, sin alta guiada, sin paciente renderizado | `PASS` |
| INI-02 | Restauración init por CIP transportado | Suite f43d: init read restaura el CIP y renderiza el paciente encontrado vía seam | `PASS` |
| INI-03 | Búsqueda por botón y por `Enter` | `Enter` con `CIP-DEMO-FH-001` abre Quick View con `Paciente Demo FH-001`; botón cubierto por f43d | `PASS` |
| INI-04 | CIP sintético desconocido → alta guiada | `Enter` con `CIP-UNKNOWN-479` muestra la sección `Paciente no encontrado — Alta guiada` (f43d además lo aserta) | `PASS` |
| INI-05 | Editar/buscar mientras el init está en vuelo | Suite f43d: init tardío A no reemplaza la búsqueda soportada B; init tardío sin interacción restaura normal | `PASS` |
| INI-06 | Quick View abrir/cerrar por controles soportados | f43d: búsqueda soportada abre Quick View; `quick-view-close-btn` lo cierra | `PASS` |

### 2.3 `farmacia_actividad_servicio.html`

| # | Recorrido | Resultado observado | Clasificación |
| --- | --- | --- | --- |
| ACT-01 | Tarjetas/población vía lectura sync publicada | f43d + sondeo: población demo presente, nota de fuente renderizada, 19 elementos tipo tarjeta visibles | `PASS` |
| ACT-02 | Toggle/panel de pendientes y empty state | Toggle `#pendientesToggle` abre el panel; el panel renderiza sus filas o su estado explícito (f43d) | `PASS` |

### 2.4 `farmacia_validacion.html`

| # | Recorrido | Resultado observado | Clasificación |
| --- | --- | --- | --- |
| VAL-01 | Ruta con paciente explícito / sin paciente / CIP desconocido | f43b + f43d + sondeo: contexto explícito resuelto por el seam; CIP desconocido fail-closed sin paciente inventado; reveal del intake sigue el contexto (paciente → preview oculto; sin paciente → preview-only) | `PASS` |
| VAL-02 | Tratamiento solicitado no aparece como validado por inferencia | FH-002 (pendiente): sección solicitada poblada con su solicitud (fármaco/dosis/vía/pauta); sección `Tratamiento validado por Farmacia` **vacía** (fármaco/dosis/vía = `""`); sin acto de validación no hay validado renderizado | `PASS` |
| VAL-03 | Export v1/v2: separación visible y v2 no es descarga pública | Bloque v1 (`fhValExportTxt`/`fhValExportCsv`/`fhValExcelExportBtn`) y bloque v2 separado en contenedor `data-export-version="v2"` con hint `Export v2 técnico, local y sin cabecera. No apto para piloto real.`; copia v2 local (`Export v2 demo copiado: 1 fila(s) × 152 columnas`), cero descargas y cero navegaciones de frame principal; guards por estado (Excel FH disabled; v2 disabled para FH-002; CSV hidden) | `PASS` |

### 2.5 `farmacia_primera_visita.html`

| # | Recorrido | Resultado observado | Clasificación |
| --- | --- | --- | --- |
| PV-01 | Carga con paciente **pendiente** legacy: presentación del tratamiento | Ver hallazgo PV-001 en sección 3: el tratamiento **solicitado** del paciente demo pendiente se presenta como `Relación terapéutica: validado` / `Estado: Validado · Principal` y la captura queda precargada con él | `PRODUCT_DEFECT_BLOCKING` |
| PV-02 | Captura vacía no se autorrellena desde catálogo/tratamiento previo | La hidratación observada proviene del registro **propio** del paciente (línea de tratamiento del registro demo), no del catálogo de fármacos ni de los tratamientos previos (`tratamientosPreviosHS`/`biologicosPrevios` del paciente no se volcaron a la captura). La desviación de estado detectada se registra como PV-001, no como inferencia de catálogo/previo | `PASS` (con la salvedad registrada en PV-001) |
| PV-03 | Carga/cambio/búsqueda de CIP soportados | f43b: lectura async por seam, búsqueda con guard (CIP conocido y desconocido fail-closed manual) | `PASS` |
| PV-04 | Export/copia disponible sólo según estado soportado | FH-001 (con datos de primera visita propios): botones v1 habilitados y v2 habilitado; FH-002 (pendiente): v2 **disabled** (guard activo), v1 habilitado — véase impacto en PV-001; cero descargas/navegaciones en todos los recorridos | `PASS` |

### 2.6 `farmacia_seguimiento.html`

| # | Recorrido | Resultado observado | Clasificación |
| --- | --- | --- | --- |
| SEG-01 | Carga y cambio de paciente soportado | f43c + sondeo: carga por `?cip=`; el cambio 001→002 mediante botón exige y respeta el diálogo de confirmación de cambio de paciente (`Vas a cambiar de paciente. Se limpiarán los datos no guardados…`); aceptado, el CIP pasa a 002; cancelado (auto-descarte headless), el guard revierte al contexto activo — comportamiento de protección, no defecto | `PASS` |
| SEG-02 | Persistencia/restauración donde el contrato la soporta | Restauración soportada = por CIP explícito (`?cip=`) y envelope de sesión actual (`sessionStorage` limitado a claves cerradas del envelope; sin workbook/bytes/read model). `sessionStorage` observado sin claves clínicas extra; sin persistencia longitudinal — contrato vigente, no defecto | `PASS` |
| SEG-03 | Sin inferencias terapéuticas nuevas | Ninguna captura terapéutica inferida durante los recorridos; consola limpia | `PASS` |

### 2.7 `farmacia_dashboard_paciente.html`

| # | Recorrido | Resultado observado | Clasificación |
| --- | --- | --- | --- |
| DASH-01 | Carga demo / CIP explícito / CIP desconocido fail-closed | f43a: demo sin CIP, CIP explícito con identidad explícita, CIP desconocido → estado not-found gobernado; sección longitudinal detrás del seam | `PASS` |

## 3. Hallazgos clasificados

### 3.1 `PRODUCT_DEFECT_BLOCKING` — PV-001: Primera Visita presenta el tratamiento solicitado de un paciente pendiente como «Validado» e hidrata la captura con él

**Ruta:** `farmacia_primera_visita.html?cip=CIP-DEMO-FH-002` (también alcanzable por búsqueda soportada de `CIP-DEMO-FH-002`; el propio Inicio anuncia FH-002 como «HS pendiente validación»).

**Pasos reproducibles (sólo interacción soportada):**
1. Servir la raíz del repo con un servidor estático.
2. Abrir `farmacia_primera_visita.html?cip=CIP-DEMO-FH-002` y esperar el init read (`fhPvCip = CIP-DEMO-FH-002`).
3. Observar la rejilla de tratamiento y la captura.

**Evidencia observada:**
- Rejilla `fhPvTratamientoGrid`: `Tratamiento principal: Adalimumab 80/40 mg`; `Relación terapéutica: validado`; `Estado: Validado · Principal`; `Origen catálogo: primera_visita`.
- Captura precargada en la misma carga: `fhPvFarmaco = "Adalimumab 80/40 mg"`, `fhPvDosis = "80 mg inducción; 40 mg mantenimiento"`, `fhPvPauta = SEGUN_FASE`, `fhPvVia = SC`.
- En el dataset demo, FH-002 tiene estado `Pendiente` y ese fármaco es su tratamiento **solicitado** (`farmaco_solicitado`); no existe acto de validación FH para FH-002.
- Contraste en la misma carga: la superficie Validación muestra la sección «Tratamiento validado por Farmacia» vacía y el estado del paciente pendiente (VAL-02 PASS).

**Causa técnica factual (código publicado, sólo diagnóstico):**
- `scripts/farmacia_primera_visita.js`: `resolvePrimaryRelation(ctx)` devuelve `'validado'` para **cualquier** paciente no-raw con registro (inferencia desde la existencia del registro, no desde un acto de validación); `applyContext` → `setTreatmentForm(buildPrimaryTreatmentFromContext(ctx))` precarga la captura y `es_validado_farmacia = (relation === 'validado')`.
- En el camino V2/raw (`scripts/farmacia_patient_flow_runtime.js`, `validatedTreatment`), `tratamientoValidado` sólo existe con `validation_result === 'validated'`: semántica correcta. El defecto queda confinado al camino legacy coexistence del mock demo.

**Impacto:** superficie clínica de captura que contradice el límite vigente «tratamiento solicitado ≠ tratamiento validado» y la regla de no inferencia del resultado de validación, visible por interacción soportada en el estado publicado de evaluación sintética. Los botones de export v1 permanecen disponibles con esa hidratación; un export ejecutado por el profesional transportaría el tratamiento solicitado con relación «validado». No se observó escritura automática ni export automático (v2 disabled; cero descargas).

**Contexto de severidad (hecho, no mitigación):** es preexistente (no introducido por F4.3B — commit `7cbfeb4` migró la lectura detrás del seam sin cambiar esta semántica), no está asertado como contrato por ningún checker y no consta como deuda registrada. La siguiente frontera Foundation es **F4.4 Pharmacy Act contract** (acto/escritura): avanzar hacia un contrato de acto sobre una superficie que presenta solicitado como validado consolidaría la semántica incorrecta.

**Acción:** no se corrige dentro de #480. Evidencia preservada en este documento. **HUMAN STOP.**

### 3.2 Resto de hallazgos

Ningún otro hallazgo. No se registran `COSMETIC_NONBLOCKING` ni `FOLLOWUP_DEBT` nuevos en este checkpoint: todas las demás observaciones de la sección 2 son `PASS`, con `console.error=0` y `pageerror=0` en todos los recorridos (ruido de recurso filtrado adjudicado con el filtro estándar de las suites publicadas).

## 4. Evidencia de consola/pageerror

| Recorrido | console.error (no-recurso) | pageerror |
| --- | --- | --- |
| Home (probe) | 0 | 0 |
| Inicio: vacío / Enter demo / Enter desconocido | 0 | 0 |
| Actividad del servicio + pendientes | 0 | 0 |
| Validación FH-001 export v1/v2 | 0 | 0 |
| Validación FH-002 solicitado/validado | 0 | 0 |
| Primera Visita FH-001 / FH-002 (incl. PV-001) | 0 | 0 |
| Seguimiento carga / cambio con confirmación / restauración | 0 | 0 |
| Suites F3.3 / nav / WU-A / f43a / f43b / f43c / f43d | 0 (adjudicado) | 0 |

## 5. Qué quedó demostrado y qué NO

**Demostrado (evaluación sintética, navegador real, interacción soportada):**
- Home y superficies Farmacia del checkpoint cargan y navegan según su contrato actual, con consola limpia.
- La migración de lectura F4.3 (F4.3A–F4.3D) se comporta según sus suites publicadas sobre la base `91262d8`.
- Los límites clínicos verificados puntualmente se mantienen en **Validación** (solicitado poblado, validado vacío para paciente pendiente), en los guards de export (v2 disabled sin contexto/estado soportado; v2 copia local, no descarga pública) y en el guard de cambio de paciente de Seguimiento.
- La captura de Primera Visita no se autorrellena desde catálogo ni desde tratamientos previos.

**NO demostrado / fuera de alcance:**
- Nada de piloto, producción, deploy o Pages.
- Accesibilidad de teclado, responsive o rendimiento (no eran observaciones de este checkpoint).
- El camino V2/raw de pacientes Excel (el checkpoint evalúa el estado publicado de evaluación sintética con el mock demo; PV-001 queda confinado factualmente a ese camino).
- Ninguna corrección: este checkpoint no modifica producto.

## 6. Límite de madurez

Evaluación con datos sintéticos y QA de navegador focalizada. **No acredita** demo acreditada, piloto ni producción. No altera el estado del paquete externo ni del snapshot `CÁCERES-REVIEW-0.6`.

## 7. Recomendación factual antes de reconciliar documentación

Existe **un** `PRODUCT_DEFECT_BLOCKING` (PV-001). Recomendación factual:

1. **No declarar cierre limpio** del checkpoint post-F4.3 ni una reconciliación documental que presente F4.3 «cerrada limpia sin hallazgos». La reconciliación de #481, si se ejecuta, debe limitarse a registrar honestamente este estado (F4.3 publicada + checkpoint con un blocker abierto) sin declarar salida limpia.
2. PV-001 requiere adjudicación humana y WO separada (no cabe corrección dentro del TRAIN #479). Dado que la siguiente frontera Foundation es F4.4 Pharmacy Act contract, la adjudicación de PV-001 (y su relación con F4.4) es decisión humana.
3. **F4.4 no debe iniciarse** sobre la semántica observada en PV-001 sin decisión explícita.

**Estado del T1:** `HUMAN_STOP_BLOCKER` (PV-001). Verificación compuesta: `npm run verify:nexus` PASS, `git diff --check` PASS, diff limitado a este documento.

## 8. Reconciliación posterior — 2026-09-30 (post-publicación PV-001)

Esta sección se añade después del checkpoint y **no reescribe** la evidencia histórica de las secciones 1–7: en el momento del checkpoint #480, PV-001 se detectó correctamente y el T1 terminó `HUMAN_STOP_BLOCKER`, sin salida limpia hacia F4.4.

Hechos posteriores publicados:

- PV-001 fue corregido y publicado por WO #482 / PR #484.
- Candidate final: `75063f25b5cf3de008ab882392b9387f5fdea9c1`.
- Merge de producto: `a04a0ace25012e5f0ac397844165921dccaebcc3` en `promueve/nexus-v4`.
- CI post-merge `Nexus deterministic gates` run `36771991874` = `success`.
- #482 = `CLOSED/completed`.

Evidencia de la corrección:

- oracle `check:fh:pv001` final **40/40** (RED inicial sobre la base; control negativo `followup` solo fail closed);
- browser QA final **35/0**, con `console.error=0` y `pageerror=0`;
- requested-only y followup-only fallan cerrado y no prehidratan la captura;
- se preserva `solicitado != validado`;
- raw `tratamientoValidado` y legacy `validated` explícito siguen soportados como evidencia de validación;
- no se infieren dosis, vía, pauta, presentación, inducción, duración, switch, add-on, causalidad ni línea desde fármaco/catálogo/historial/ausencia.

Estado actual del hallazgo: **`RESOLVED/PUBLISHED`**. Esto **no** convierte el checkpoint histórico #480 en un `PASS` retroactivo: en su momento fue un `HUMAN_STOP_BLOCKER` correcto y así se conserva. La madurez sigue siendo evaluación sintética (sin piloto ni producción). Con PV-001 resuelto, F4.4 queda técnicamente desbloqueada; ese desbloqueo técnico no la convierte en prioridad humana automática ni autoriza su ejecución.
