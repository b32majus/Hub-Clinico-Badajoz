# PROMueve Nexus — Ledger vivo de estado funcional

**Última actualización:** 2026-10-03  
**Estado:** `LIVE / PRE-BADAJOZ`  
**Issue de creación:** #504  
**Rama canónica:** `promueve/nexus-v4`  
**Base reconstruida:** `fca8b7d9fc5f73a84599b8c36999cb73e2351fa6` (merge documental PR #503)  
**Último HEAD de producto Nexus verificado:** `3bf45760a27630823b61b0d19da8b64aeb060693` (PR #490, F4.4 Pharmacy Act v1)

## 1. Propósito

Este ledger responde a una pregunta distinta de `WORK_ORDER_STATUS.md`, los registros de deuda y las auditorías fechadas:

> **¿Qué existe realmente hoy en PROMueve Nexus, qué está demostrado, qué necesita revalidación y qué sigue pendiente?**

No sustituye:

- `docs/ops/WORK_ORDER_STATUS.md`, que conserva ejecución, candidates, PRs y merges;
- `docs/ops/NEXUS_DEBT_REGISTER.md` y registros de módulo, que conservan deuda técnica aceptada;
- `docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`, que conserva decisiones y dirección de producto;
- issues/WO, que conservan autoridad ejecutable y evidencia detallada.

Cuando haya contradicción prevalece la autoridad definida en `docs/INDEX.md`: instrucción/WO vigente → GitHub live → INDEX/WOS → documento vivo relacionado → evidencia histórica.

## 2. Taxonomía

| Estado | Significado |
| --- | --- |
| `IMPLEMENTADO` | Existe, está cableado/publicado y la evidencia disponible demuestra el alcance indicado. No implica piloto real. |
| `IMPLEMENTADO_REVALIDAR` | Existe y está publicado, pero falta una pasada funcional/UX actual o un journey E2E para la pregunta de producto vigente. |
| `PARCIAL` | Hay una parte publicada y otra frontera material aún pendiente. |
| `PENDIENTE` | Trabajo definido o necesidad conocida todavía no implementada/publicada. |
| `DISCOVERY` | La necesidad existe, pero el contrato funcional/operativo aún no está suficientemente cerrado para implementar. |
| `FUTURO` | Capacidad deliberadamente diferida; no es prioridad inmediata. |
| `SUPERSEDED` | Finding/idea histórica sustituida por evidencia o decisión posterior; no perseguir salvo nueva reproducción soportada. |
| `BLOQUEADO` | Falta una dependencia o input humano explícito que impide diseñar/ejecutar con seguridad. |

### Columnas de madurez

- **Código:** existe implementación.
- **Cableado:** el recorrido soportado consume esa implementación.
- **Visible:** hay superficie accesible para usuario cuando aplica.
- **QA browser:** existe evidencia de interacción soportada en navegador para el alcance indicado.
- **Publicado:** está en `promueve/nexus-v4`, no sólo en candidate/branch.
- **Demo:** `Síntética` significa utilizable/evaluable con datos demo/sintéticos; no equivale a piloto.
- **Piloto:** sólo `Sí` con evidencia y autorización de piloto real. A 2026-10-03 Nexus sigue **sin piloto / sin producción**.

## 3. Reumatología

| Capacidad | Estado | Código | Cableado | Visible | QA browser | Publicado | Demo | Piloto | Issue/WO | Siguiente gate / nota |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Búsqueda + historia de paciente detrás de Reuma Read Port | `IMPLEMENTADO` | Sí | Sí | Sí | Sí, sintético | Sí | Sintética | No | #429 / PR #430 | No reauditar arquitectura; sólo reabrir ante contradicción visible. |
| PCR con unidad explícita y conversión fail-closed | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | Sí, Train 06 | Sí | Sintética | No | #443 / PR #449 | Spot-check natural de UX; fórmulas/unidades no requieren otra auditoría salvo fallo visible. |
| Catálogo/autocomplete Reuma | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | Sí, Train 06 | Sí | Sintética | No | #444 / PR #449 | Revisar experiencia actual, no reconstruir catálogo. |
| Categorías `Sistémicos / FAMEs / Biológicos` | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | Sí, Train 06 | Sí | Sintética | No | #447 / PR #449 | Clasificación explícita/versionada; no inferida en runtime. |
| Hidratación visual de medicamento preseleccionado | `PENDIENTE` | Parcial | Parcial | Defecto visible conocido | Finding previo | Sí | Deuda no bloqueante | No | #448 OPEN | El valor autoritativo no se reporta perdido; falta hidratar texto visible sin blur incidental. |
| Semántica legacy `search(query)` no categorizada | `PENDIENTE` | Sí | Ruta legacy no soportada por controles Reuma actuales | No en recorrido soportado | No necesaria para cerrar train | Sí | Deuda API | No | #450 OPEN | Decidir contrato workbook-only vs union; no mezclar con CIMA ni #448. |
| Prebiológico simplificado: Analítica + Medicina Preventiva | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | Sí, Train 06 | Sí | Sintética | No | #445 / PR #449 | Tres estados explícitos por bloque; sin `APTO` global inferido. Revisar comprensión clínica. |
| Seguimiento detrás del Reuma Read Port | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | Sí en Train 07 | Sí | Sintética | No | #455 / PR #459 | Revalidar journey completo y persistencia/restauración visible. |
| Estadísticas detrás de seam/Read Port Reuma | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | Sí en Train 07 | Sí | Sintética | No | #456 / PR #459 | La migración de lectura no demuestra por sí sola que filtros/gráficos sean los adecuados. |
| Writer legacy 497 tras boundary fail-closed | `IMPLEMENTADO` | Sí | Sí | Indirecto | Sí en Train 07 | Sí | Compatibilidad | No | #457 / PR #459 | Legacy contenido; **no** es arquitectura final. |
| Reuma Visit Act v1 independiente de 497 | `IMPLEMENTADO` | Sí | Sí | Indirecto | Oráculos + Train 08 | Sí | Sintética | No | #462 / PR #467 | Contrato de acto publicado. |
| Adapter Visit Act → legacy 497 | `IMPLEMENTADO` | Sí | Sí | Indirecto | 10 journeys byte-equivalentes | Sí | Compatibilidad | No | #463 / PR #467 | Frontera transitoria explícita. |
| Cutover Primera Visita + Seguimiento → Visit Act v1 | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | 23/23 Train 08 | Sí | Sintética | No | #464 / PR #467 | Hacer una pasada humana natural y guardar→salir→recuperar. |
| DAPSA / PsA | `IMPLEMENTADO_REVALIDAR` | Sí, legado actual | Sí | Sí | Evidencia histórica; no nueva adjudicación humana | Sí | Revalidar | No | — | Comprobar componentes, VAS, PCR, entesitis/dactilitis/extras y que sólo calcule con input suficiente. No mantener bug histórico como confirmado si no se reproduce. |
| ASDAS PCR / ASDAS VSG | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | Evidencia técnica previa | Sí | Revalidar | No | — | PCR preferida/VSG alternativa según contrato; ausencia nunca equivale a cero. |
| Tratamientos previos | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | No adjudicado de nuevo tras Foundation | Sí | Revalidar | No | — | Prior/current/requested no pueden convertirse en “previo” sin hecho explícito. |
| PROM/QR → longitudinal | `IMPLEMENTADO_REVALIDAR` | Existe capacidad histórica | Parcial/por comprobar E2E actual | Sí donde aplique | E2E actual no cerrado por esta reconciliación | Sí | Revalidar | No | — | Revisar paciente→PROM→retorno→longitudinal y evitar duplicación de identidad/CIP. |
| Dashboard longitudinal de paciente | `IMPLEMENTADO_REVALIDAR` | Sí | Sí | Sí | No adjudicado de nuevo tras Foundation | Sí | Revalidar | No | — | Validar resumen, estratificación, alertas/renovación y lectura temporal. |
| Delivery/export Reuma end-state común Nexus | `PARCIAL` | Act + boundary publicados | Aún termina en compatibilidad 497 | No como destino nuevo | No | Parcial | Compatibilidad | No | — | Converger con semántica común de delivery/adapters; no crear otro exportador ad hoc. |
| Reuma → Processor/Bridge común | `PENDIENTE` | No end-state canónico | No | No | No | No | No | No | — | Antecedente histórico útil en Farmacia; adaptación debe depender del contrato delivery Nexus, no copiar legacy automáticamente. |
| Reuma → Farmacia | `DISCOVERY` | No contrato final | No | No | No | No | No | No | Sin issue específico vivo verificado | Definir acto/handoff, autoridad, retorno de estado y ownership antes de WO técnica. |
| Renovaciones/alertas | `DISCOVERY` | Hay arquitectura/shaping previa | No implementación Nexus final | Parcial histórica | No actual | No como ciclo final | No | No | #446 OPEN + `status:approved`, con `TEMPORARY EXECUTION HOLD` | No confundir con Reuma→Farmacia. Revalidar tras revisión humana y feedback operativo. |
| CIMA automática / propuestas estructuradas | `FUTURO` | No automatización actual | No | No | No | No | No | No | — | Línea separada. Selección genérica nunca escribe terapia; en FH la selección explícita de medicamento/presentación + contexto puede **proponer** datos inequívocos, siempre editables y sin sobrescritura silenciosa. |

### 3.1 Qué debe revisar Sil ahora en Reuma

Una única pasada focalizada sobre Nexus, con datos sintéticos:

1. entrada/búsqueda e identidad visible;
2. Primera Visita completa;
3. DAPSA / ASDAS PCR-VSG / PCR-unidades desde UI;
4. tratamientos previos;
5. prebiológico + categorías/autocomplete + reproducción de #448;
6. guardar → salir → recuperar;
7. Seguimiento + PROM;
8. QR/dashboard/evolución temporal si la superficie es accesible por interacción soportada;
9. Estadísticas y spot-check del export visible actual.

No hace falta revisar manualmente las 497 columnas ni volver a demostrar Read Port, boundary 497 o contratos de Visit Act salvo que la UI contradiga la evidencia publicada.

## 4. Farmacia Hospitalaria

| Capacidad / decisión | Estado | Evidencia publicada | Siguiente gate / nota |
| --- | --- | --- | --- |
| F4.1 contrato read DTO V2 | `IMPLEMENTADO` | #427 / PR #430 | Publicado. |
| F4.2 facade async + vertical Inicio/Quick View | `IMPLEMENTADO` | #428 / PR #430 | Publicado y QA sintético. |
| F4.3 lecturas Dashboard/Validación/PV/Seguimiento/Estadísticas/Inicio/Actividad/review detrás de seams | `IMPLEMENTADO` | #470/#475, PR #474/#478 | Completado; PV-001 descubierto después ya está resuelto. |
| PV-001 solicitado ≠ validado | `IMPLEMENTADO` | #482 / PR #484 | `RESOLVED/PUBLISHED`. |
| F4.4 Pharmacy Act v1 | `IMPLEMENTADO` | #487/#488/#489 / PR #490 | Contrato puro publicado; no implica delivery/persistencia. |
| Inicio orientado a “paciente + trabajo pendiente” | `IMPLEMENTADO_REVALIDAR` | UI actual existe; decisión de producto #501 es posterior | Revisión FH ya indicó simplificación: CIP protagonista, Excel secundario, pendientes visibles. Cambios de producto aún no deben darse por implementados sólo por existir pantallas previas. |
| `Actividad del servicio` → futura `Pendientes` | `PENDIENTE` | Decisión #501 | Categorías candidatas: validaciones pendientes + pendientes de recogida. |
| `PENDIENTE_RECOGIDA` | `DISCOVERY` | Semántica #501 | Ausencia de dispensación esperada; no adherencia/abandono/switch. Sólo dispensación registrada lo resuelve. Ventana/frecuencia/recipient siguen abiertos. |
| Simplificación Validación / quitar ruido técnico-visible | `PENDIENTE` | Decisión #501 | `manual vs estructurada` no es dato clínico visible salvo dependencia técnica real; origen/patología manual deben ser explícitos/editables. |
| Export V2 visible | `IMPLEMENTADO_REVALIDAR` | Existe en producto previo; #501 decide mantenerlo | Mantener como explicación de interoperabilidad futura, no como prueba de persistencia/backend. |
| Primera Visita como primer contacto PROMueve | `IMPLEMENTADO_REVALIDAR` | UI/captura existente; semántica #501 | `inducción solicitada ≠ inducción validada`; no exigir historia previa completa. |
| Tratamiento preexistente como baseline | `PENDIENTE` | Decisión #501 | No fabricar START/SWITCH/ADD_ON retrospectivos. |
| Add-on tras nueva solicitud+validación | `DISCOVERY` | #501 `PENDIENTE_EQUIPO` | Resolver si primera dispensación del nuevo tratamiento se registra como PV del nuevo tratamiento o dentro de Seguimiento. |
| Dashboard: quitar ruido Excel + comorbilidades + revisar “Vista completa” | `PENDIENTE` | #501 | Dashboard sigue siendo read-only longitudinal. |
| Estadísticas/reporting SIL-REV-018/019/020 | `PENDIENTE` | #501 + auditoría septiembre | Filtros/población/tiempo/movimientos explícitos/comorbilidades/PROM/validación/EA/actividad desde fuente explícita. |
| Selección CIMA concreta con propuestas editables | `FUTURO` | Dirección #501 | Sólo tras selección explícita de medicamento/presentación y contexto cuando proceda; nunca sobrescribir ajustes profesionales. |
| F4.5 DeliveryResult / adapter semantics | `PENDIENTE` | Foundation Plan | Técnicamente disponible tras F4.4; **no prioridad humana automática ni autorización de ejecución**. |
| F4.6 | `PENDIENTE` | Foundation Plan | Depende de F4.5; no ejecutar por inercia. |
| Renovaciones | `DISCOVERY` | #446 + hold | Shaping aprobado, ejecución temporalmente en hold y prioridad bajo readjudication. |

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
| Nexus Home | `IMPLEMENTADO` | Sí | Browser-qualified + release sintético | No confundir con piloto. |
| Read stranglers Farmacia/Reuma | `IMPLEMENTADO` en alcances F4.1–4.4 / F5.1–5.4 | Sí | Sintética | No reabrir por estética; sólo por producto/defecto real. |
| F4.5 | `PENDIENTE` | No | Foundation | DeliveryResult / adapter semantics. |
| F4.6 | `PENDIENTE` | No | Foundation | Depende de F4.5. |
| F6 pre-pilot | `PENDIENTE` | No | Before-pilot | Lifecycle, URL/log exposure y dependency/vendor policy antes de piloto real. |
| F7 hospital×módulo | `PENDIENTE` | Infraestructura base sí, qualification por combinación no | Requiere combinación real | No inferir qualification por presencia en repo. |
| D004 | `PENDIENTE` deuda | No cierre | No bloqueante actual | Decidir bajo presión real de consumo del release map. |
| D005 subhallazgos restantes | `PENDIENTE` deuda | Parcial | No cleanup amplio | Distribuir por WOs naturales. |
| Branding identificable de Nexus | `PENDIENTE` | No en esta WO | Orientación UI | Se ejecuta como WO runtime/branding separada; no mezclar con esta reconciliación documental. |

## 7. Horizontes

| Horizonte | Qué significa aquí |
| --- | --- |
| `V4 / demo sintética` | Cerrar journeys visibles, deuda clínica/funcional relevante y presentación coherente sin declarar piloto. |
| `V4 / pre-piloto` | F6 + decisiones institucionales/operativas necesarias, qualification real hospital×módulo y persistencia/delivery soportados. |
| `V4.x` | Evoluciones ya justificadas por presión real: multi-site explícito, lifecycle/renovaciones, adapters/bridge y nuevos módulos/patologías. |
| `V5` | Hub agnóstico/configurable más general. No usar V5 para justificar refactors urgentes de V4. |

## 8. Regla para issues

- Defecto/deuda concreta, reproducible y accionable → **issue**.
- Trabajo aprobado y ejecutable → **issue + WO**.
- Discovery sin contrato suficiente → mantener `DISCOVERY`; no fabricar issue técnico prematuro.
- Futuro deliberadamente diferido → mantener horizonte; no llenar backlog de tickets no accionables.
- `REVALIDAR` → no es bug hasta reproducir una carencia mediante interacción soportada.
- Toda deuda/decisión que cambie de estado debe reconciliar este ledger, INDEX/WOS y el documento vivo afectado cuando proceda.

## 9. Punto de reentrada

1. Sil hace la pasada manual focalizada sobre **Nexus**, no sobre recovery.
2. Cada observación se clasifica como `regresión`, `deuda conocida`, `implementado pero UX insuficiente`, `mejora nueva`, `superseded` o `decisión clínica pendiente`.
3. Se actualiza este ledger con evidencia visible real.
4. Se cruzan Reuma + Farmacia + dirección Dermatología.
5. Sólo entonces se adjudican las WOs de producto/técnicas siguientes y se abren issues nuevos donde exista trabajo accionable.

---

**Nota de seguridad clínica:** tratamiento solicitado no equivale a validado; tratamiento previo no equivale a nuevo; datos ausentes permanecen vacíos/desconocidos/pendientes; el catálogo no decide dosis, vía, pauta, presentación, inducción, duración, renovación, switch/add-on ni causalidad. Una propuesta CIMA futura sólo puede partir de selección explícita de medicamento/presentación y contexto suficiente, permanecer editable y nunca sobrescribir silenciosamente decisiones profesionales.
