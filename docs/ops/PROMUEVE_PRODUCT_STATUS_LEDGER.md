# PROMueve Nexus — Ledger vivo de estado funcional

**Última actualización:** 2026-10-10
**Estado:** `LIVE / PRE-BADAJOZ`
**Issue de creación:** #504 (publicación: PR #506)
**Rama canónica:** `promueve/nexus-v4`
**Base reconstruida:** `fca8b7d9fc5f73a84599b8c36999cb73e2351fa6` (merge documental PR #503)
**Base canónica verificada para esta reconciliación:** `promueve/nexus-v4@71cc10871d1368431e18fb28b1dc91d2c700ba12` (WO #633/PR #634, head `a78ab892a85d71f82e29f7edcebbd23c0ac5380a`, base `ae06dce5e94044772c14435d32af062d9ac9859e`). Último producto anterior Train20 `4145393486e3ff3b519faf7977964d653768c12a`. El tip puede avanzar tras WO documental #635; GitHub live prevalece.
**Último HEAD de producto Nexus verificado:** Train 21 WO #633 / PR #634: candidato `a78ab892a85d71f82e29f7edcebbd23c0ac5380a` → merge de producto `71cc10871d1368431e18fb28b1dc91d2c700ba12` desde `ae06dce5e94044772c14435d32af062d9ac9859e`; CI PR 4/4, postmerge 5/5 SUCCESS, Pages built. Reuma: TXT y CSV sin Clipboard API usan sus modales manuales existentes, con gate efímero y confirmación TXT explícita; 497 campos sin cambios, sin éxito de copia fingido. Gates 3/4 Cora GO: memoria 36/36, boundary 29/29, shared modal/FH 95/95, 390/1280; `verify:nexus` PASS en local. Node20 CI verde. WO #633 CLOSED, #621 OPEN por retención legacy; bfcache W22 SKIP. Sin QA de flujo hospedado ni autorización de piloto.
**QA manual Reuma:** pasada manual soportada de Sil **adjudicada por humano el 2026-10-04** (comentario en #504); cerrada para shaping, sin nueva auditoría general
**Renovaciones FH ↔ Enfermería:** contrato N0 **PUBLICADO Y VERIFICADO** por #509 → PR #510 (merge `aa6401af8ad636dd9d19baad9dcf80876ac780df`), reconciliado por PR #511; **N1/N2/N3 siguen pendientes**

**Safety/wiring Reuma:** #512 + #517 **PUBLICADOS Y VERIFICADOS** por PR #521 (merge `ee7379d24ef99633d3bede07c64b31a7038558e4`); #512–#520 cerrados/completed
**Prebiológico mínimo Reuma:** #525 **PUBLICADO Y VERIFICADO** por PR #526 (merge `1b41724db7f86534880122e0a5263e25206b07ee`); esa WO no modificó la solicitud Reuma→Farmacia, publicada después por Train 14
**Solicitud textual Reuma→Farmacia:** #528 + #529/#530/#531 **PUBLICADOS Y VERIFICADOS** por PR #532 (merge `03f814875b38409a219f40e3602feece06472f33`); oracle 26/0, browser PV+Seguimiento 91/0 y Dashboard 46/0; sólo estados explícitos de Analítica/Medicina Preventiva, sin detalle legacy ni inferencia terapéutica
**Micro-polish Reuma GO (corte histórico #586):** #584 CIP, #585 CASPAR neutral y #583 toast duplicado publicados PR #588; en ese corte #587 seguía abierto y recovery no operativo. **Posteriormente** #618/PR #619 publicó decisión explícita de RETIRADA. No interpretar texto histórico como estado vivo de recovery.
**Estadísticas CSV Reuma:** #537 **PUBLICADO Y VERIFICADO** por PR #538 (merge `05114fcf899a857ca6505c1da7eaef2c82ac6155`): contrato formal `currentCohort` y oracle 8/8, browser 6/6 con descarga real. La búsqueda local `Buscar en tabla` se retiró **después**, por #613/Train #614/PR #615, sin alterar filtros formales ni exportación. El helper `filterTableBySearch` se conserva definido/no invocado por UI para el oracle existente.
**Farmacia Inicio visual fidelity:** #565 **PUBLICADO Y VERIFICADO** por PR #566 (merge `0d35134b5cda4dafa8ed8e2bbdba47a82f2dadbb`); `Requiere atención` vuelve a la composición compacta aprobada sin modificar lógica de conteos ni futuros `? + Próxima fase`
**RAPID3 Seguimiento layout:** #541 **PUBLICADO Y VERIFICADO** por PR #567 (merge `6dfe34a15bfa145076ae7c80fbee6aac3b628923`); APs/AR conservan `select 0/1/2/3` y cálculo, con filas MDHAQ legibles. El shared seam de Primera Visita quedó separado en #545 y fue cerrado después por PR #571
**RAPID3 shared collapsible dynamic-height:** #545 **PUBLICADO Y VERIFICADO** por PR #571 (candidate `4fd264a8d67bb534e879cf55e51f86c1219105a1` → merge `663df88993365463e42e419067ffdc771c7d0636`); PV APs/AR, Seguimiento APs/AR y Estadísticas cualificados; idle seam 0 invocaciones/3 s tras settle; sin cambio clínico. Polling `customSelect` preexistente separado como deuda #570
**Harness C-087:** Nexus reconciliado por PR #562 contra Atenea `ddaf9612da67da42eb9bd2c9c03d652b254cc332`; PR #564 añade `docs/PRODUCT_FIDELITY_GATES_V1.md` repo-local para authority transport. Sin cambio clínico de producto

## 1. Propósito

Este ledger responde a una pregunta distinta de `WORK_ORDER_STATUS.md`, los registros de deuda y las auditorías fechadas:

> **¿Qué existe realmente hoy en PROMueve Nexus, qué está demostrado, qué necesita revalidación y qué sigue pendiente?**

No sustituye:

- `docs/ops/WORK_ORDER_STATUS.md`, que conserva ejecución, candidates, PRs y merges;
- `docs/ops/NEXUS_DEBT_REGISTER.md` y registros de módulo, que conservan deuda técnica aceptada;
- `docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`, que conserva decisiones y dirección de producto;
- `docs/contracts/FARMACIA_RENEWAL_HANDOFF_CONTRACT.md`, que es la única autoridad N0 de renovaciones;
- issues/WO, que conservan autoridad ejecutable y evidencia detallada.

Cuando haya contradicción prevalece la autoridad definida en `docs/INDEX.md`: instrucción/WO vigente → GitHub live → INDEX/WOS → documento vivo relacionado → evidencia histórica.

## 2. Taxonomía

| Estado | Significado |
| --- | --- |
| `IMPLEMENTADO` | Existe, está cableado/publicado y la evidencia disponible demuestra el alcance indicado. No implica piloto real. |
| `IMPLEMENTADO / VALIDADO_MANUAL` | Implementado, cableado/visible **y** validado mediante interacción soportada en la pasada manual humana de 2026-10-04. No implica piloto. |
| `IMPLEMENTADO_REVALIDAR` | Existe y está publicado, pero falta una pasada funcional/UX actual o un journey E2E para la pregunta de producto vigente. |
| `DEFECTO_REPRODUCIDO` | Carencia observada/reproducida en esa pasada manual soportada. Accionable como issue/WO técnica; la WO debe volver a reproducirla por interacción soportada antes de corregir. |
| `REQUISITO_DECIDIDO_PENDIENTE` | Decisión humana (2026-10-04 salvo indicación) que fija un cambio concreto aún no implementado/publicado. |
| `PENDIENTE_FUENTE` / `PENDIENTE_EQUIPO` | Bloqueado por fuente clínica autorizada, equipo u operador. No inventar contenido ni diseñar por analogía; no se resuelve con trabajo técnico. |
| `PARCIAL` | Hay una parte publicada y otra frontera material aún pendiente. |
| `PENDIENTE` | Trabajo definido o necesidad conocida todavía no implementada/publicada. |
| `DISCOVERY` | La necesidad existe, pero el contrato funcional/operativo aún no está suficientemente cerrado para implementar. |
| `DEFERIDO` | Fuera de la ronda pre-Badajoz actual; se conserva en horizonte sin abrir backlog de tickets no accionables. |
| `FUTURO` | Capacidad deliberadamente diferida; no es prioridad inmediata. |
| `SUPERSEDED` | Finding/idea histórica sustituida por evidencia o decisión posterior; no perseguir salvo nueva reproducción soportada. |
| `BLOQUEADO` | Falta una dependencia o input humano explícito que impide diseñar/ejecutar con seguridad. |

Regla de lectura: **existir en código no equivale a QA visible.** La columna *QA browser / evidencia* y el prefijo `VALIDADO_MANUAL` registran la evidencia real; una fila `IMPLEMENTADO_REVALIDAR` nunca se promueve por presencia de código. #448 queda cerrada por evidencia focal publicada en PR #553; #450 permanece deuda no bloqueante hasta decisión explícita de contrato.

### Columnas de madurez

- **Código:** existe implementación.
- **Cableado:** el recorrido soportado consume esa implementación.
- **Visible:** hay superficie accesible para usuario cuando aplica.
- **QA browser / evidencia:** interacción soportada en navegador, evidencia determinista o **pasada manual humana 2026-10-04**, según la fila.
- **Publicado:** está en `promueve/nexus-v4`, no sólo en candidate/branch.
- **Demo:** `Síntética` significa utilizable/evaluable con datos demo/sintéticos; no equivale a piloto.
- **Piloto:** sólo `Sí` con evidencia y autorización de piloto real. A 2026-10-05 Nexus sigue **sin piloto / sin producción**.

## 3. Reumatología

| Capacidad | Estado | Código | Cableado | Visible | QA browser / evidencia | Publicado | Demo | Piloto | Issue/WO | Siguiente gate / nota |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Búsqueda + historia de paciente detrás de Reuma Read Port | `IMPLEMENTADO / VALIDADO_MANUAL` | Sí | Sí | Sí | Manual 2026-10-04 y browser CIP #584/PR #588 7/7 | Sí | Sintética | No | #429/PR #430; #584/PR #588 | Placeholder principal `Buscar por CIP...` publicado, búsqueda intacta. |
| Fechas compactas y chips discretos Reuma UX | `IMPLEMENTADO / PUBLICADO` | Sí | Sí | Sí | #610 Chromium 104/104 (desktop/móvil, readonly); #611 C2 Chromium 113/113 EspA+APs, clic/teclado/vacío-export, Gate 4 visual favorable | Sí | Sintética | No | #610/#611 / Train #614 / PR #615 | Campos fecha nativos/valores inalterados. Cuatro `select` PV siguen autoridad para chips; valor vacío no equivale a `No`. **Restauración soportada de formulario PV no demostrada**: sólo propiedad técnica de sincronía programática. |
| PCR con unidad explícita y conversión fail-closed | `IMPLEMENTADO / VALIDADO_MANUAL` | Sí | Sí | Sí | Manual 2026-10-04: unidades explícitas y conversión operativas | Sí | Sintética | No | #443 / PR #449 | Nunca inferir unidad por magnitud. UI por site (retirar `Sin unidad`, ayuda contextual, default por site) = `REQUISITO_DECIDIDO_PENDIENTE` con verificación previa de fuente versionada (3.2.4). |
| Catálogo/autocomplete Reuma | `IMPLEMENTADO / VALIDADO_MANUAL` | Sí | Sí | Sí | Manual 2026-10-04: **funciona; sin defecto de autocomplete** | Sí | Sintética | No | #444 / PR #449 | La carencia aparente en `Sistémicos` fue cobertura/fuente, **no** fallo del autocomplete. No abrir defecto de autocomplete. |
| Categorías `Sistémicos / FAMEs / Biológicos` | `IMPLEMENTADO / VALIDADO_MANUAL` | Sí | Sí | Sí | Manual 2026-10-04: respeta las tres categorías | Sí | Sintética | No | #447 / PR #449 | Clasificación explícita/versionada; no inferida en runtime. Evolución CIMA = concern separado. |
| Hidratación visual de medicamento preseleccionado | `IMPLEMENTADO / PUBLICADO` | Sí | Sí | Sí | PR #553: browser focal 56/56; preselección visible sin blur; refresh conserva consulta activa y blur resincroniza etiqueta | Sí | Sintética | No | #448 / PR #553 | Cerrada sin cambiar valor autoritativo, categoría ni semántica terapéutica. |
| Semántica legacy `search(query)` no categorizada | `PENDIENTE` (deuda no bloqueante) | Sí | Ruta legacy no soportada por controles Reuma actuales | No en recorrido soportado | No necesaria para cerrar train | Sí | Deuda API | No | #450 OPEN | Deuda no bloqueante preservada; decidir contrato workbook-only vs union; no mezclar con CIMA ni #448. |
| Prebiológico simplificado: Analítica + Medicina Preventiva | `IMPLEMENTADO` | Sí | Sí | Sí | Manual 2026-10-04 + Chromium #525 41/0; `verify:nexus` PASS | Sí | Sintética | No | #445 / PR #449 + #525 / PR #526 | Estados explícitos `NO SOLICITADA / SOLICITADA-PENDIENTE / OK`; una Observaciones opcional; `Fecha diagnóstico` prebiológica retirada; sin `APTO` global. Compatibilidad histórica de fecha general preservada. El handoff FH es una capacidad separada, publicada después por #528 / PR #532. |
| Seguimiento detrás del Reuma Read Port | `IMPLEMENTADO / VALIDADO_MANUAL` | Sí | Sí | Sí | Manual 2026-10-04: ruta/funcionamiento operativos | Sí | Sintética | No | #455 / PR #459 | Identidad editable + baseline preexistente decididos (3.2.15); persistencia/restauración no quedó adjudicada explícitamente en la pasada. |
| Estadísticas detrás de seam/Read Port Reuma | `IMPLEMENTADO / PUBLICADO` | Sí | Sí | Sí | Manual 2026-10-04 filtros correctos; #613/PR #615 browser Read 8/8 sin buscador local | Sí | Sintética | No | #456/PR #459; #613/PR #615 | Eliminar `Buscar en tabla` es publicado; filtros formales siguen definiendo `currentCohort` y CSV #537, sin cambio de semántica. |
| Exportar CSV de Estadísticas (cohorte filtrada) | `IMPLEMENTADO / PUBLICADO` | Sí | Sí | Sí | #537 oracle 8/8 byte-unchanged, browser 6/6 descarga; #613/PR #615 E5/B5 adaptados al buscador ausente con export invariante | Sí | Sintética | No | #537/PR #538; #613/PR #615 | `HubTools.export.exportCohortToCSV(currentCohort)` sigue ligado sólo a filtros formales; helper local de search sin UI. Sin revalidación general de todas las columnas ni cambio de CSV. |

| Writer legacy 497 tras boundary fail-closed | `IMPLEMENTADO` | Sí | Sí | Indirecto | Evidencia Train 07; no reabierto por la pasada manual | Sí | Compatibilidad | No | #457 / PR #459 | Legacy contenido; **no** es arquitectura final. |
| Reuma Visit Act v1 independiente de 497 | `IMPLEMENTADO` | Sí | Sí | Indirecto | Oráculos + Train 08 | Sí | Sintética | No | #462 / PR #467 | Contrato de acto publicado. |
| Adapter Visit Act → legacy 497 | `IMPLEMENTADO` | Sí | Sí | Indirecto | 10 journeys byte-equivalentes | Sí | Compatibilidad | No | #463 / PR #467 | Frontera transitoria explícita. |
| Cutover Primera Visita + Seguimiento → Visit Act v1 | `IMPLEMENTADO / PUBLICADO` | Sí | Sí | Sí | Train 20 integrity 65/65, frozen 30/30+1SKIP, boundary 29/29, CSV 497 idéntico | Sí | Sintética | No | #464/PR #467, #629/PR #630 | TXT→CSV exige TXT confirmado en misma instancia; edición de datos bloquea. No certifica pegado en HCE. |
| Modal compartido Copiar — TXT/CSV/Solicitud FH | `IMPLEMENTADO / PUBLICADO` | Sí | Sí, consumidores PV/Seguimiento y Solicitud FH | Sí | Train20 C2 responsive 24/24; Train21 shared modal 95/95 y Gate4 390/1280 | Sí | Sintética | No | #620/PR #625; #629/PR #630; #633/PR #634 | TXT modal 4 controles, FH/CSV modal 2; sin Clipboard API el nuevo fallback usa el modal existente. Copia realmente confirmada o feedback manual veraz, sin efectos clínicos. |

| TXT/CSV manual sin Clipboard API — Reuma | `IMPLEMENTADO / PUBLICADO` | Sí | Sí, PV/Seguimiento | Sí, botones TXT/CSV; consumidor secundario solo vía API JS | Train21 N1–N10, memory 36/36, export boundary 29/29, shared modal/FH 95/95, Gate4 390/1280; GitHub CI 4/4 + 5/5 | Sí | Sintética | No | #633/PR #634 | Sin `navigator.clipboard.writeText` el TXT ofrece atestación manual y CSV modal 497 exacto, sin checklist de copia automática; sin confirmación TXT, CSV bloqueado. No implica pegado en HCE ni seguridad TLS del entorno hospitalario. |

| Gate TXT→CSV efímero por visita Reuma | `IMPLEMENTADO / PUBLICADO` | Sí | Sí, Primera Visita y Seguimiento | Sí (clics soportados) | Train20 frozen 30/30 + W22 SKIP, memory 26/26, integrity 65/65; Train21 memory 36/36, boundary 29/29, Cora Gates 3/4 GO | Sí | Sintética | No | #621 parcial, #629/PR #630, #633/PR #634 | Gate en memoria por clipboard real o confirmación TXT explícita; API ausente da alternativa manual sin autorizar por abrir/cerrar; cambios/reapertura invalidan. Legacy anterior sin borrar; no demuestra pegado en HCE. |

| Exportación de visita Reuma: recuperación clínica retirada | `IMPLEMENTADO / PUBLICADO` (sin recovery) | Sí | Sí | Sí | Train18 retiro 52/52, Train20 boundary 29/29, Train21 boundary 29/29; legacy unchanged | Sí | Sintética | No | #618/PR #619; #629/PR #630; #633/PR #634; #587 CLOSED | No reintroduce recovery; `hubPendingRows` histórico no leído/borrado, #621 OPEN. |
| DAPSA / PsA | `IMPLEMENTADO / VALIDADO_MANUAL` + UX `PUBLICADO` | Sí | Sí | Sí | Cálculo observado manual 2026-10-04; categoría y resultado numérico neutros QA Chromium #612-C2 87/87 PV+Seguimiento APs, Gate 4 Cora favorable | Sí | Sintética | No | #612/#614/PR #615 | Derivado/read-only, puntuación/cutoffs/PCR/export sin cambios; estado `Incompleto` neutral en ambos formularios, sin lectura terapéutica por color. |
| ASDAS PCR / ASDAS VSG | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | Scope/wiring técnico #512/#517 verificado con oracles + QA Chromium: EspA-only y EVA Global explícita reutilizada; **el cálculo completo del índice no fue adjudicado en la pasada manual humana** | Sí | Revalidar | No | #513/#514/#518 / PR #521 | Alcance/wiring publicados: ASDAS no se muestra/ejecuta en APs; mirror EVA→ASDAS contenido a EspA, sin fuga legacy y ausencia≠0. Fórmula/umbrales no cambiados. Mantener `IMPLEMENTADO_REVALIDAR` hasta revalidación específica del cálculo; PCR default por site sigue pendiente de fuente versionada. |
| Dactilitis EspA (afectación periférica) | `IMPLEMENTADO` | Sí | Sí | Sí | Reproducción soportada + oracle/Chromium #515; recuento deriva selecciones reales | Sí | Sintética | No | #515 / PR #521 | Control operable en EspA sin manipulación DOM; no fabrica estado ni cambia semántica de otras patologías. |
| MDA APs derivado/read-only | `IMPLEMENTADO` | Sí | Sí | Sí | Oracles + Chromium #516/#519/#520; tres verdicts `ALCANZADO / NO ALCANZADO / PENDIENTE`; export legacy exacto | Sí | Sintética | No | #516/#519/#520 / PR #521 | Mantiene regla clínica publicada `cumplidos >= 5`, 7 criterios y thresholds; missing permanece pendiente cuando puede cambiar el resultado; sólo `MDA ALCANZADO` explícito produce `mdaCumple=true`. |
| BASFI para EspA (Primera Visita + Seguimiento) | `PENDIENTE_FUENTE` | No completo | Parcial | No | No implementado con fuente autorizada | Sí (parcial) | No | No | Sin issue (bloqueo humano) | Requiere autoridad clínica/fuente explícita de ítems y cálculo; **no inventar ítems**. BASDAI sí existe. |
| LES / Sjögren | `PENDIENTE_EQUIPO` | Limitado | Limitado | Limitado | No adjudicado clínicamente | Sí | No | No | — | No ampliar ni corregir semántica clínica por intuición; sólo coherencia visual/tooltips neutrales que no añadan significado clínico. |
| Tratamientos previos | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | No adjudicado de nuevo tras Foundation | Sí | Revalidar | No | — | Prior/current/requested no pueden convertirse en “previo” sin hecho explícito. |
| PROM/QR → longitudinal | `DEFERIDO` | Existe capacidad histórica | Parcial/por comprobar E2E actual | Sí donde aplique | E2E actual no cerrado | Sí | Revalidar después | No | — | QR/PROM **diferido**: fuera de la ronda pre-Badajoz actual. Revalidar después con fixture sintético longitudinal actualizado. |
| Dashboard longitudinal de paciente / evolución PROM | `DEFERIDO` | Sí | Sí | Sí | No adjudicado de nuevo tras Foundation | Sí | Revalidar después | No | — | Revalidar tras fixture longitudinal actualizado; **no** declarar defecto sólo por BD demo vieja. |
| Delivery/export Reuma end-state común Nexus | `PARCIAL` | Act + boundary publicados | Aún termina en compatibilidad 497 | No como destino nuevo | No | Parcial | Compatibilidad | No | — | Converger con semántica común de delivery/adapters tras F4.5; legacy 497 queda como compatibilidad contenida, no end-state. |
| Reuma → Processor/Bridge común | `PENDIENTE` | No end-state canónico | No | No | No | No | No | No | — | Pendiente de diseño tras la semántica de delivery/F4.5; no copiar legacy automáticamente. |
| Solicitud textual Reuma → Farmacia (acción soportada `Solicitud FH`) | `IMPLEMENTADO` | Sí | Sí: Primera Visita + Seguimiento + Dashboard comparten generador | Sí (acción/artefacto) | Train #528: oracle 26/0; browser PV+Seguimiento 91/0; Dashboard 46/0; console/pageerror sin blockers | Sí | Sintética | No | #528/#529/#530/#531 / PR #532 | Emite sólo `Analítica` y `Medicina Preventiva` cuando existe estado explícito válido; ausencia permanece ausente. No transporta estado global/date/source/Notas/observaciones prebio ni desglose legacy de laboratorio/vacunación. Preserva el resto clínico explícito; sin validación ni START/SWITCH/ADD_ON inferidos. |
| Integración estructurada Reuma ↔ Farmacia / retorno de estado y ownership | `DISCOVERY` | No contrato end-state | No | No | No | No | No | No | Sin WO autorizada | Train 14 publica el handoff textual; no define por sí mismo acto estructurado, persistencia, retorno de estado, ownership ni integración bidireccional. Requiere shaping/autoridad separada si se prioriza. |
| Renovaciones/alertas | `PARCIAL` | Contrato N0 publicado | Sin runtime Nexus | Contrato/schemas/checker publicados | Evidencia determinista del contrato (checker 53/0), sin QA navegador | Sí (contrato) | Sintética | No | #446 CLOSED/completed + #509 cerrada | **Sólo contrato N0 publicado**: #509 → PR #510 (merge `aa6401a`) + reconciliación PR #511. N1/N2/N3 requieren WOs propias. `OCT-OPEN-010..013` y `REN-OPEN-001..008` siguen abiertos. No confundir con Reuma→Farmacia. |
| CIMA automática / propuestas estructuradas | `FUTURO` | No automatización actual | No | No | No | No | No | No | — | Línea separada. Selección genérica nunca escribe terapia; en FH la selección explícita de medicamento/presentación + contexto puede **proponer** datos inequívocos, siempre editables y sin sobrescritura silenciosa. |

> **Observación no resuelta detectada durante #537:** el filtro sexo expone `Hombre/Mujer` mientras el corpus/datos observados usan `M/F`. Es deuda funcional preexistente de semántica de filtro, fuera de #537; no se corrigió ni se convierte aquí en prioridad clínica. El contenido de otras columnas del CSV (p. ej. Edad/Fecha_Nacimiento) tampoco queda validado por #537.

### 3.1 Adjudicación manual Reuma 2026-10-04 — cerrada para shaping

La pasada manual soportada de Sil sobre Nexus Reumatología quedó **adjudicada por humano** en #504. No vuelve a abrirse una auditoría general; sólo la reproducción soportada propia de cada WO técnica.

Confirmado funcional (`IMPLEMENTADO / VALIDADO_MANUAL`):

1. Home y rutas Nueva Visita / Seguimiento / Cuadro de mando.
2. Carga de BD y búsqueda por CIP; placeholder principal `Buscar por CIP...` publicado por #584/PR #588.
3. Catálogo/autocomplete Reuma con `Sistémicos / FAMEs / Biológicos`; **no hay defecto de autocomplete**.
4. IMC, homúnculo NAD/NAT, metrología, ASAS/CASPAR/ACR-EULAR observados operativos salvo los hallazgos de 3.2.
5. PCR con unidades explícitas y conversión; no inferir unidad por magnitud.
6. Barrera TXT antes de estructurar CSV: funciona y se conserva.
7. Estado prebiológico por bloques; contrato `Analítica` + `Medicina Preventiva` con estados explícitos.
8. DAPSA: cálculo y reutilización correctos; se mantiene derivado.
9. Estadísticas: filtros observados funcionando.

### 3.2 Reuma — defectos reproducidos y requisitos decididos (adjudicación 2026-10-04)

| # | Hallazgo / requisito | Clasificación | Nota |
| --- | --- | --- | --- |
| 1 | Home: el placeholder principal debe decir búsqueda por CIP, coherente con sidebar | `RESUELTO / PUBLICADO` | #584/Train #586/PR #588; copy `Buscar por CIP...`, búsqueda sin cambios. |
| 2 | UX formularios: acortar campos fecha; chips para opciones discretas simples (dolor axial/rigidez/irradiación/maniobras) cuando mejoren claridad | `RESUELTO / PUBLICADO` | #610/#611 / Train #614 / PR #615; fechas PV/Seguimiento compactas, chips PV con `select` autoritativo, blanco distinto de `No`, Chromium 104/104 + 113/113, Gate 4 Cora cerrado. No hay restauración soportada PV demostrada. |
| 3 | EspA homúnculo: dactilitis debe estar disponible también en EspA por posible afectación periférica; control/recuento observado no utilizable con infraestructura existente | `RESUELTO / PUBLICADO` | #515 / PR #521: reproducido y corregido por interacción soportada; recuento/estado deriva sólo selecciones reales. |
| 4 | PCR UI por site: retirar `Sin unidad` de la selección soportada + ayuda contextual | `REQUISITO_DECIDIDO_PENDIENTE` (default por site = `PENDIENTE_FUENTE`) | Autoridad humana actual: Badajoz `mg/dL`; Mérida y Cáceres `mg/L`. Verificar contra la autoridad versionada del repo **antes** de fijar cualquier default; nunca inferir por valor/magnitud. |
| 5 | ASDAS sólo en EspA: retirar ASDAS-CRP/ASDAS-VSG de APs en Primera Visita y Seguimiento | `RESUELTO / PUBLICADO` | #513 / PR #521: APs ya no muestra ni ejecuta ASDAS; EspA lo conserva. |
| 6 | EVA Global del paciente → ASDAS: reutilizar la ya capturada, sin reentrada manual; observado no arrastrado (PCR/VSG sí) | `RESUELTO / PUBLICADO` | #514 + containment #518 / PR #521: EspA reutiliza EVA Global explícita; fuera de EspA el mirror queda vacío/fail-safe y no contamina legacy. |
| 7 | BASDAI/BASFI presentes en Primera Visita y Seguimiento para EspA; BASFI falta o no está completo | `PENDIENTE_FUENTE` | Implementar BASFI sólo con autoridad clínica/fuente explícita de ítems y cálculo; no inventar ítems. |
| 8 | APs MDA: mantener derivado/read-only con wiring desde campos de origen; observado 0/7 incompleto por falta de fuentes | `RESUELTO / PUBLICADO` | #516 + #519/#520 / PR #521: fuentes cableadas, missing visible como pendiente cuando procede, verdict ternario seguro y `mdaCumple` legacy exacto; regla `>=5` intacta. |
| 9 | DAPSA: mantener derivado; mejorar feedback visual por categoría | `RESUELTO / PUBLICADO` | #612 / Train #614 / PR #615: feedback textual y aspecto neutral (categoría y campo numérico) en PV + Seguimiento APs; 87/87 Chromium C2, Gate 4 favorable; cálculo, umbrales, PCR, export intactos. |
| 10 | RAPID3: conservar representación clínica; clipping dinámico en Primera Visita APs/AR; layout de Seguimiento APs/AR | `RESUELTO / PUBLICADO` | **Seguimiento** resuelto por #541 / PR #567: 10 filas MDHAQ legibles con mismos `select 0/1/2/3`. **Shared collapsible / Primera Visita** resuelto por #545 / PR #571: crecimiento/decrecimiento soportado re-mide la sección abierta sin auto-open ni polling nuevo. Fórmula/categorías intactas. |
| 11 | Resultados/categorías: feedback por categoría explícita; CASPAR sin verde=bueno/rojo=malo | `RESUELTO / PUBLICADO` | CASPAR #585/Train #586/PR #588 neutral; DAPSA #612/Train #614/PR #615 neutral en APs PV+Seguimiento. Sin umbrales/fórmulas nuevos. |
| 12 | Prebiológico: retirar `Fecha diagnóstico` del bloque; conservar Observaciones prebiológico opcionales; no sintetizar APTO global | `RESUELTO / PUBLICADO` | #525 / PR #526: bloque mínimo publicado en Primera Visita + Seguimiento; sólo Analítica + Medicina Preventiva + una Observaciones opcional. |
| 13 | Solicitud Reuma → Farmacia: eliminar el desglose legacy de hemograma/bioquímica/serologías/vacunación; sólo los dos estados resumidos de Analítica y Medicina Preventiva cuando consten explícitamente | `RESUELTO / PUBLICADO` | #528 + #529/#530/#531 / PR #532: artefacto soportado cualificado en Primera Visita, Seguimiento y Dashboard; ausencia no fabrica estado; resto clínico explícito preservado; sin inferencia terapéutica. |
| 14 | Toasts export: mantener siguiente paso y retirar toast verde duplicado | `RESUELTO / PUBLICADO` | #583/PR #588 eliminó toast duplicado, #618/PR #619 retiró recovery/checklist falso, #624/PR #625 corrigió botón Copiar compartido; **#629/PR #630** solo habilita CSV con copia/atestación TXT confirmada, no modal-open. |
| 15 | Seguimiento con CIP sin paciente previo: nombre y apellidos editables + capturar tratamiento actual preexistente y fecha de inicio como baseline explícito | `REQUISITO_DECIDIDO_PENDIENTE` | Sin fabricar START/SWITCH/ADD_ON ni validación retrospectiva. |
| 16 | Estadísticas: `Exportar CSV` debe exportar la cohorte de filtros activos y retirar `Buscar en tabla` | `RESUELTO / PUBLICADO` (ambas partes) | #537/PR #538 conserva export `currentCohort` de filtros formales (oracle 8/8, browser 6/6); #613/Train #614/PR #615 retira control/listener de búsqueda local, con E5/B5 Chromium 6/6 y 8/8. `filterTableBySearch` sigue definido/no llamado por UI para oracle, sin cambio en el contrato CSV. |

Los ítems **1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14 y 16** están RESUELTOS/PUBLICADOS en su alcance. Train 18 retiró recovery, Train 19 corrigió Copiar, Train 20 #629/PR #630 retiró gate persistente y lo sustituyó por copia/atestación efímera. Pendientes #4 PCR site (PENDIENTE_FUENTE), #7 BASFI (PENDIENTE_FUENTE), #15 baseline Seguimiento (REQUISITO_DECIDIDO_PENDIENTE). **#621 OPEN** para residuo histórico legacy; sin piloto.

**#587 — Recuperación de filas pendientes (RETIRADA PUBLICADA / CLOSED):** #618/PR #619 eliminó cola/UI sin recuperar filas; Train 20 #629/PR #630 retiró lectura/escritura del gate TXT identificativo nuevo, sin borrar restos de navegadores previos. #621 OPEN exclusivamente para posible retención legacy + validación de privacidad; no afirmar limpieza ejecutada.

### 3.3 Reuma — pendientes, defer y deuda preservada

- **LES / Sjögren:** `PENDIENTE_EQUIPO`. No ampliar ni corregir semántica clínica por intuición; sólo coherencia visual/tooltips neutrales que no añadan significado clínico.
- **BASFI:** `PENDIENTE_FUENTE`. Fuente/autoridad clínica explícita de ítems y cálculo antes de implementar.
- **Dashboard longitudinal / evolución PROM:** `DEFERIDO`. Revalidar después con fixture sintético longitudinal actualizado; no declarar defecto sólo por BD demo vieja.
- **QR/PROM:** `DEFERIDO`. Diferido; no entra en la ronda pre-Badajoz actual.
- **CIMA / actualización de Sistémicos y fuente completa:** concern separado; el autocomplete actual no se considera roto.
- **#448:** `RESUELTA / PUBLICADA` por PR #553 con evidencia browser focal; **#450:** deuda técnica no bloqueante aún abierta hasta decisión explícita de contrato.
- **#570 customSelect polling:** `DISCOVERY / NO IMPLEMENTATION AUTHORITY`. `modules/customSelect.js` conserva `window.setInterval(syncAllCustomSelects, 300)`; la deuda se identificó al cualificar #545, pero #545 la desacopló del seam de colapsables sin modificar `customSelect.js`. Shaping separado antes de cualquier implementación.
- **Reuma delivery/export → Processor/Bridge común:** pendiente de diseño tras la semántica de delivery/F4.5; el legacy 497 está contenido como compatibilidad, **no** como arquitectura final.
- **Reuma → Farmacia:** la solicitud textual soportada está `IMPLEMENTADA / PUBLICADA` por #528 / PR #532. Cualquier integración estructurada posterior (acto, persistencia, retorno de estado, ownership) permanece `DISCOVERY` y requiere autoridad propia; no confundir ambas fronteras.

## 4. Farmacia Hospitalaria

| Capacidad / decisión | Estado | Evidencia publicada | Siguiente gate / nota |
| --- | --- | --- | --- |
| Home Nexus → Farmacia | `RESUELTO / PUBLICADO` | #575 / PR #580; candidate `ed3e00f97...` → merge `cdb5b6bd...` | Deployment sintético: Farmacia `QUALIFIED_FOR_SITE / available=true` con evidencia explícita de demo sintética; navegación soportada Home → `farmacia_index.html`, same-tab + Back demostrados. No cualifica hospital real, piloto ni producción. |
| F4.1 contrato read DTO V2 | `IMPLEMENTADO` | #427 / PR #430 | Publicado. |
| F4.2 facade async + vertical Inicio/Quick View | `IMPLEMENTADO` | #428 / PR #430 | Publicado y QA sintético. |
| F4.3 lecturas Dashboard/Validación/PV/Seguimiento/Estadísticas/Inicio/Actividad/review detrás de seams | `IMPLEMENTADO` | #470/#475, PR #474/#478 | Completado; PV-001 descubierto después ya está resuelto. |
| PV-001 solicitado ≠ validado | `IMPLEMENTADO` | #482 / PR #484 | `RESOLVED/PUBLISHED`. |
| F4.4 Pharmacy Act v1 | `IMPLEMENTADO` | #487/#488/#489 / PR #490 | Contrato puro publicado; no implica delivery/persistencia. |
| Inicio orientado a “paciente + trabajo pendiente” | `IMPLEMENTADO / PUBLICADO` | #550 / PR #555 | Inicio compacto: CIP/búsqueda preservados, importación secundaria y tarjeta `Solicitudes pendientes` con total + Listas para validación + En vigilancia + Bloqueadas; QA determinista/browser compuesta. |
| `Actividad del servicio` → `Pendientes` | `IMPLEMENTADO / PUBLICADO` | #549 / PR #555 | URL física `farmacia_actividad_servicio.html` preservada; cola única `Solicitudes pendientes`, resumen explícito, provenance Enfermería sin segunda categoría y acciones por estado preservadas. |
| Inicio — `Renovaciones de receta` / `Recogidas pendientes` | `PRESENTACIÓN_FUTURA` | #550 / PR #555 | Ambas muestran `?` + `Próxima fase`; sin href, handler, destino soportado ni datos fabricados. No implementan renovaciones runtime ni `PENDIENTE_RECOGIDA`. |
| `PENDIENTE_RECOGIDA` | `DISCOVERY` | Semántica #501 | Ausencia de dispensación esperada; no adherencia/abandono/switch. Sólo dispensación registrada lo resuelve. Ventana/frecuencia/recipient siguen abiertos. |
| Simplificación Validación / quitar ruido técnico-visible | `PENDIENTE` | Decisión #501 | `manual vs estructurada` no es dato clínico visible salvo dependencia técnica real; origen/patología manual deben ser explícitos/editables. |
| Export V2 visible | `IMPLEMENTADO_REVALIDAR` | Existe en producto previo; #501 decide mantenerlo | Mantener como explicación de interoperabilidad futura, no como prueba de persistencia/backend. |
| Primera Visita como primer contacto PROMueve | `IMPLEMENTADO_REVALIDAR` | UI/captura existente; semántica #501 | `inducción solicitada ≠ inducción validada`; no exigir historia previa completa. |
| Tratamiento preexistente como baseline | `PENDIENTE` | Decisión #501 | No fabricar START/SWITCH/ADD_ON retrospectivos. |
| Add-on tras nueva solicitud+validación | `DISCOVERY` | #501 `PENDIENTE_EQUIPO` | Resolver si primera dispensación del nuevo tratamiento se registra como PV del nuevo tratamiento o dentro de Seguimiento. |
| Excel Bridge — decisión de entrada por patología vs Bridge relacional | `DISCOVERY` | #577; reutiliza #232 + arquitectura V4 + #365 | No es duplicado de #236. En Reuma, una entrada única podría resolver la hoja por patología **sólo si** esa partición física sigue vigente. En Farmacia debe compararse con entrada común + patología explícita + Processor raw→relacional, que puede hacer redundante el routing. No implementación autorizada. |
| Dashboard: quitar ruido Excel + comorbilidades + revisar “Vista completa” | `PENDIENTE` | #501 | Dashboard sigue siendo read-only longitudinal. |
| Estadísticas/reporting SIL-REV-018/019/020 | `PARCIAL — V1 INFORMES DEMO RESUELTOS/PUBLICADOS; ANALÍTICA AMPLIADA/V2 PENDIENTES` | #576 / PR #581 + #579 / PR #582 (shell `Informes`) + #598 / PR #600 + #599 / PR #601 + #602 / PR #603 (categorías, fixtures, sección `Informes`) | `Informes` existe separado de `Análisis poblacional`. **Cosentyx trimestral** (#576) está publicado/verificado con primera dispensación explícita para nuevo inicio, detalle auditable y XLSX real `Resumen` + `Detalle`. **Kisqali utilización/dosis** (#579) está publicado/verificado con Mensual/Trimestral/Anual/Histórico por ciclos mensuales observados/evaluables, trazabilidad cruda y XLSX real `Resumen` + `Pacientes` + `Ciclos`; sin inferir consumo/dispensación real. Recuperación de dimensiones poblacionales y V2 de presets/Control Plane siguen pendientes/diferidos. |
| `Reportes farmacéuticos` — entrada neutral + `Ver reporte` gated | `RESUELTO / PUBLICADO` | #602 / PR #603: `farmacia_estadisticas.html`, `farmacia_style.css`, `scripts/farmacia_estadisticas_informes.js` + 2 browser checkers | Entrada neutral a `Reportes farmacéuticos` con `Ver reporte` gated; resumen ejecutivo + detalle progresivo. Ejes de madurez distintos: UI visible ≠ QA candidate ≠ publicación ≠ hosting ≠ piloto; ningún eje declara piloto/producción. |
| Categorías Kisqali — presentaciones/dosis independientes | `RESUELTO / PUBLICADO` | #598 / PR #600: `scripts/farmacia_kisqali_informe_{fixture,model}.js` + checkers | Presentaciones/dosis independientes Kisqali 200/400/600 mg (#591); dosis y presentaciones como hechos independientes; fixtures demo explícitamente sintéticos; XLSX real `Resumen` + `Pacientes` + `Ciclos`. Datos 100% sintéticos; no acredita consumo ni dispensación real. |
| Categorías Cosentyx — presentaciones/dosis independientes + motivo Q4 | `RESUELTO / PUBLICADO` | #598 / PR #600 + #599 / PR #601: fixture Cosentyx + checkers | Presentaciones/dosis independientes Cosentyx 150/300 mg con estado actual (#592); reducción Q2W→Q4W más eventos explícitos de discontinuación (#593); motivo sintético explícito de discontinuación Q4 para `COS-HS-010` con negativo de motivo ausente aislado sólo local al checker (#599); XLSX real `Resumen` + `Detalle`. Datos 100% sintéticos. |
| Export PDF de informes (#597) | `PENDIENTE` — fuera de publicado | Sin PR; decisión de motor pendiente | #597 sigue OPEN y fuera de publicado; no convertir en publicado sin decisión explícita de motor. |
| Selección CIMA concreta con propuestas editables | `FUTURO` | Dirección #501 | Sólo tras selección explícita de medicamento/presentación y contexto cuando proceda; nunca sobrescribir ajustes profesionales. |
| F4.5 DeliveryResult / adapter semantics | `PENDIENTE` | Foundation Plan | Técnicamente disponible tras F4.4; **no prioridad humana automática ni autorización de ejecución**. |
| F4.6 | `PENDIENTE` | Foundation Plan | Depende de F4.5; no ejecutar por inercia. |
| Renovaciones FH ↔ Enfermería | `PARCIAL` | **N0 contrato PUBLICADO Y VERIFICADO**: #509 → PR #510 (candidate `54ab2c5e…` → merge `aa6401af…`), reconciliación PR #511 (tip canónico `a357be85…`); CI PR `37198098263` y post-merge `37198170542` `success` | **Sólo contrato N0** (schemas, máquina de estados, checker `check:renewal:contract` 53/0). **N1 (bandeja FH + export), N2 (adapter Excel Enfermería) y N3 (reconciliación del retorno + acto FH) siguen pendientes** y requieren WOs propias; sin runtime, UI ni QA navegador. `OCT-OPEN-010..013` y `REN-OPEN-001..008` permanecen abiertos; no se resolvieron por conveniencia técnica. #446 sigue OPEN. El candidato `d829939` permanece rechazado. |

## 5. Dermatología

| Capacidad / decisión | Estado | Evidencia | Siguiente gate / nota |
| --- | --- | --- | --- |
| Dermatología como módulo real Nexus | `PENDIENTE` | Reconciliación #501 | Dirección aprobada de producto; todavía no equivale a implementación Nexus. |
| Fase 1 `Home → Dermatología → Solicitudes a Farmacia` | `PENDIENTE` | #501 | Primera profundidad recomendada. |
| Solicitud clínica por molécula/principio activo cuando proceda biosimilar | `PENDIENTE` | #501 | FH selecciona después producto/presentación concreta. No congelar lista de biosimilares sin fuente vigente. |
| HS longitudinal | `PENDIENTE` | Input equipo + #501 | Primera vertical longitudinal prevista junto con psoriasis. |
| Psoriasis longitudinal | `PENDIENTE` | Input equipo + #501 | Primera vertical longitudinal prevista junto con HS. |
| Eccema de manos | `BLOQUEADO` | #501 | `AWAIT_TEAM_INPUT`; prohibido diseñar por analogía. |
| HBV: pauta completa vs condición suficiente para iniciar | `PENDIENTE` | #501 | Modelar hechos separados; no convertir “segunda dosis suficiente en circuito acordado” en “pauta completa”. |
| Plantilla HTML actual Derma→FH | `IMPLEMENTADO_REVALIDAR` como referencia externa, **no autoridad repo** | Referencia funcional conocida fuera del repo | Incorporar sólo tras reconciliar decisiones superadas; no copiar a ciegas. |

## 6. Nexus / Foundation

| Capacidad | Estado | Publicado | Madurez | Siguiente gate |
| --- | --- | --- | --- | --- |
| Rama canónica `promueve/nexus-v4` | `IMPLEMENTADO` | Sí, desde PR #381 | Desarrollo activo | Recovery queda histórico para nuevo desarrollo. |
| PlatformContext + contratos deployment/readiness | `IMPLEMENTADO` | Sí | Sintética | Mantener fail-closed. |
| Nexus Home | `IMPLEMENTADO / PUBLICADO` | Sí: PR #552 + PR #557 | Browser-qualified + release sintético; lockup/favicon NEXus y 3 tarjetas visibles | `DermaNEXus — Próximamente` es capability futura presentacional; no implica registry/readiness/ruta ni implementación Dermatología. No confundir con piloto. |
| Read stranglers Farmacia/Reuma | `IMPLEMENTADO` en alcances F4.1–4.4 / F5.1–5.4 | Sí | Sintética | No reabrir por estética; sólo por producto/defecto real. |
| F4.5 | `PENDIENTE` | No | Foundation | DeliveryResult / adapter semantics. |
| F4.6 | `PENDIENTE` | No | Foundation | Depende de F4.5. |
| F6 pre-pilot | `PENDIENTE` | No | Before-pilot | Lifecycle, URL/log exposure y dependency/vendor policy antes de piloto real. |
| F7 hospital×módulo | `PENDIENTE` | Infraestructura base sí, qualification por combinación no | Requiere combinación real | No inferir qualification por presencia en repo. |
| D004 | `PENDIENTE` deuda | No cierre | No bloqueante actual | Decidir bajo presión real de consumo del release map. |
| D005 subhallazgos restantes | `PENDIENTE` deuda | Parcial | No cleanup amplio | Distribuir por WOs naturales. |
| Branding identificable de Nexus | `IMPLEMENTADO / PUBLICADO` | #507/#508 + #551/#552 + #556/#557 | Home NEXus con lockup completo y favicon; FarmaNEXus/ReumaNEXus visibles según contexto | PR #557 es presentación/plataforma; no altera semántica clínica ni cualificación de módulos. |
| Ledger vivo de estado funcional (#504) | `IMPLEMENTADO` (documental, **PUBLICADO**) | Sí: PR #506, merge `b90eef501f958109fc330fe98f659f9698011250` | Documental; sin QA navegador por ser documentación-only | Reconciliado por #522 con publicaciones PR #521/#526; issue #504 CLOSED/completed. |

## 7. Horizontes

| Horizonte | Qué significa aquí |
| --- | --- |
| `V4 / demo sintética` | Cerrar journeys visibles, deuda clínica/funcional relevante y presentación coherente sin declarar piloto. |
| `V4 / pre-piloto` | F6 + decisiones institucionales/operativas necesarias, qualification real hospital×módulo y persistencia/delivery soportados. |
| `V4.x` | Evoluciones ya justificadas por presión real: multi-site explícito, lifecycle/renovaciones, adapters/bridge y nuevos módulos/patologías. |
| `V5` | Hub agnóstico/configurable más general. No usar V5 para justificar refactors urgentes de V4. |

## 8. Cruce documental pre-Badajoz (Reuma + Farmacia + Dermatología)

Cruce **sólo de estado/prioridad**; no define contratos de integración ni semántica de producto futura.

- **Reumatología:** publicados safety/prebio, Solicitud FH, CSV #537, UX Reuma, retiro recovery Train18, Copiar veraz Train19, gate memoria Train20 #629/PR #630 y **TXT/CSV manual sin Clipboard API Train21 #633/PR #634**. Sin cambio en TXT clínico, 497 campos ni tratamientos. §3.2.15 baseline Seguimiento, §3.2.4 PCR site, BASFI PENDIENTE_FUENTE, LES/Sjögren PENDIENTE_EQUIPO; #621 OPEN por datos legacy.
- **Farmacia Hospitalaria:** revisión FH y decisiones #501 ya publicadas; F4.4 publicada; contrato N0 de renovaciones publicado (#509 / PR #510 / PR #511) con N1/N2/N3 pendientes; informes Kisqali/Cosentyx publicados (#598/#599/#602 por PRs #600/#601/#603) con fixtures sintéticos explícitos y XLSX real; cutover raíz Pages publicado (#606 / PR #607, `built` sobre `ed0642f...`); PDF #597 fuera de publicado; F4.5/F4.6 siguen sin autorización automática.
- **Dermatología:** dirección #501 vigente (módulo candidato; HS/PsO primeras verticales; eccema de manos `AWAIT_TEAM_INPUT`); sin implementación Nexus, sin contratos nuevos.
- **Prioridad:** PRE-26-OCT: Train21 publicado para evaluación sintética; no piloto sin QA hospitalaria/retención legacy #621. Próximos Seguimiento baseline §3.2.15, PCR §3.2.4 y Bridge #577; bfcache W22 SKIP residual no resuelto.

## 9. Regla para issues

- `DEFECTO_REPRODUCIDO` concreto, reproducible y accionable → **issue**.
- Trabajo aprobado (`REQUISITO_DECIDIDO_PENDIENTE`) y ejecutable → **issue + WO**.
- `PENDIENTE_FUENTE` / `PENDIENTE_EQUIPO` → **no** abrir issue técnico; resolver primero la entrada humana/fuente.
- Discovery sin contrato suficiente → mantener `DISCOVERY`; no fabricar issue técnico prematuro.
- Futuro o fuera de la ronda actual → mantener `DEFERIDO`/horizonte; no llenar backlog de tickets no accionables.
- `REVALIDAR` → no es bug hasta reproducir una carencia mediante interacción soportada.
- Toda deuda/decisión que cambie de estado debe reconciliar este ledger, INDEX/WOS y el documento vivo afectado cuando proceda.

## 10. Punto de reentrada

1. ✅ Sil ejecutó la pasada manual focalizada sobre **Nexus**, no sobre recovery (adjudicada 2026-10-04 en #504).
2. ✅ Cada observación se clasificó (`DEFECTO_REPRODUCIDO`, `REQUISITO_DECIDIDO_PENDIENTE`, `PENDIENTE_FUENTE/EQUIPO`, `DEFERIDO`, deuda conocida) en este ledger.
3. ✅ Este ledger quedó actualizado con evidencia visible real.
4. ✅ Se cruzaron Reuma + Farmacia + dirección Dermatología a nivel de estado/prioridad (`8).
5. **Siguiente:** Trains 18–21 publicados para evaluación sintética; CSV 497 preservado, fallback manual sin Clipboard API disponible, sin recovery ni marcador TXT nuevo persistido. #621 OPEN: posible almacenamiento legacy anterior no tratado, requiere política de privacidad. Continuar Seguimiento §3.2.15, PCR §3.2.4 y Bridge #577. No inferir pegado en HCE ni piloto.

---

**Nota de seguridad clínica:** tratamiento solicitado no equivale a validado; tratamiento previo no equivale a nuevo; datos ausentes permanecen vacíos/desconocidos/pendientes; el catálogo no decide dosis, vía, pauta, presentación, inducción, duración, renovación, switch/add-on ni causalidad; ninguna unidad se infiere por magnitud. Una propuesta CIMA futura sólo puede partir de selección explícita de medicamento/presentación y contexto suficiente, permanecer editable y nunca sobrescribir silenciosamente decisiones profesionales.
