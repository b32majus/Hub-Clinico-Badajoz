# PROMueve Nexus — Cola operativa reconciliada de shipping

**Corte de inventario:** 2026-10-11 · **WO documental:** [#663](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/663) · **Estado del documento:** CANDIDATO LOCAL, no publicado en rama canónica hasta PR/merge autorizados.

**HEAD verificado de Nexus al preparar el inventario:** `promueve/nexus-v4@a3556b408e91c257c7cd2c829c575ff497c99745` (PR #662). **Atenea C-087 consultada:** `main@4dd488aea19870e36fa35511ce0a0b8f59dcdf6a` (PR #143/#144). Es una fotografía; GitHub live prevalece. Madurez acreditada exclusivamente con datos sintéticos: **NO PILOTO**.

## 1. Punto único de reentrada y regla de ejecución

Esta cola es el índice de trabajo **vigente al publicarse**, no sustituye decisiones clínicas o contratos ya publicados ni convierte recomendaciones en aprobaciones. Fuentes: [ledger de producto](PROMUEVE_PRODUCT_STATUS_LEDGER.md), [backlog Farmacia](FARMACIA_ESTADO_Y_BACKLOG_20261011.md), [reconciliación 03/10](audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md), [auditoría SIL](audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md), [Foundation](PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md), [N0 renovaciones](../contracts/FARMACIA_RENEWAL_HANDOFF_CONTRACT.md), [deuda FH](FARMACIA_DEBT_REGISTER.md). Auditar todo de nuevo NO es un paso rutinario.

**Estados permitidos de cola:** `PUBLISHED` = PR fusionada/capacidad concreta, no piloto; `ISSUE_PREPARADO` = ticket creado, sin autoridad de ejecución; `PENDIENTE_QA` = comprobar interacción antes de declarar defecto; `READY_TO_SCOPE` = resultado acotado, pendiente aprobación de ticket/WO; `PENDIENTE_SHAPING` = una decisión de contrato/semántica; `PENDIENTE_FUENTE_EQUIPO` = no se puede inferir dato o regla; `PENDIENTE_DEPENDENCIA` = espera una capacidad anterior; `ANTES_PILOTO` = gate de seguridad/institucional, no bloqueante para demo sintética; `DEFERIDO` = no ejecutar por inercia.

**Orden operativo, no prioridad impuesta:** (1) verificar rama/HEAD y posible issue `status:approved` sin bloqueos; (2) consumir primero un ticket aprobado y ejecutable; (3) para QA, comprobar y cerrar como `WORKS` o crear WO correctiva prescriptiva si hay defecto; (4) para shaping, cerrar solo preguntas específicas; (5) solo si no hay trabajo aprobado seleccionar entre candidatos. Un issue `OPEN` o `type:feature` NO da autorización de ejecución. Se requiere además petición humana para lanzamiento. Issue aprobado tampoco autoriza push/PR/merge sin alcance expreso.

## 2. Publicaciones recientes — no reabrir por issues OPEN administrativos

| Entrega | Estado real, evidencia y límite |
| --- | --- |
| Train 27 Reuma Dashboard | **PUBLISHED**: #653/[PR #654](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/654), merge `124c12b623f12885347c8e6c79dd965ac570df54`. Tratamiento actual físico/procedencia y negación `No`; no longitudinalidad general |
| Train 28 FH activo registrado | **PUBLISHED**: #651/[PR #652](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/652), merge `de65dca6b8939fd9e64207f713a985fe2c9dda60`. Filtro separado de molécula explícita, cohorte y CSV; no línea activa inferida |
| Train 29 Reuma Sexo | **PUBLISHED**: #657/[PR #658](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/658), merge `4fca680a2b35b5b7fa951525c3658b77d595a18a`. Máquina M/F, etiquetas Hombre/Mujer; QA Chromium 11/11 del candidato y postmerge CI/Pages SUCCESS |
| Train 30 FH microcopy Export V2 | **PUBLISHED**: #659/[PR #660](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/660), merge `e2cbc861e6632699c04ebc6bfc3c485796a7c5ac`. Botón «Copiar datos estructurados (demo)», hint, estados veraces; 152 columnas TSV y copia preservadas. Postmerge CI/Pages SUCCESS; no integración |
| Sincronización Atenea C-087 | **PUBLISHED**: #661/[PR #662](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/662), merge `a3556b408e91c257c7cd2c829c575ff497c99745`. 15 archivos arnés/docs; model/permission/config sin cambios; postmerge CI/Pages SUCCESS. No trabajo clínico |
| Issues antiguos OPEN tras PR MERGED | **ADMINISTRATIVO**: #537, #643, #645, #651, #653, #657, #659, #661 y otros pueden seguir OPEN; cerrar solo tras autorización administrativa específica, sin reabrir producto ni conservarlos como siguiente frontier |

## 3. Primer paquete: diez issues creados en una única tanda

Todos los siguientes están `ISSUE_PREPARADO`, **sin** `status:approved` ni lanzamiento. El orden es de preparación, no de ejecución forzada.

| ID | Issue | Área / resultado | Estado / gate real | Siguiente acción concreta |
| --- | --- | --- | --- | --- |
| DOC-01 | [#663](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/663) | Ops: cola única, documentación postmerge | WO documental, candidata local | Verificar diff y publicar rama documental únicamente bajo autorización |
| QA-FH-01 | [#664](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/664) | FH Dashboard: Copiar fila Excel y Vista completa | PENDIENTE_QA | Recorrer acciones y retorno con datos sintéticos; fallo → WO concreta |
| QA-FH-02 | [#665](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/665) | FH Dashboard comorbilidades | PENDIENTE_QA | Verificar fuente, datos explícitos, ausencia, recarga |
| QA-RE-01 | [#666](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/666) | Reuma ASDAS PCR/VSG | PENDIENTE_QA y caso clínico de referencia aprobado | Comprobar fórmula/ausentes EspA por ruta soportada; HUMAN STOP si falta criterio |
| QA-RE-02 | [#667](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/667) | Reuma Primera Visita restauración | PENDIENTE_QA | Distinguir capacidad inexistente, PASS y defecto con navegación soportada |
| WO-RE-01 | [#668](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/668) | PCR UI sin opción «Sin unidad» | READY_TO_SCOPE; defaults site no aprobados | Micro-WO solo UI y neutralidad, sin fijar unidad automática |
| WO-FH-01 | [#669](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/669) | Tablas Cosentyx 820/1080 px | READY_TO_SCOPE visual P2 | Affordance/reflow y QA real sin cambiar datos ni XLSX |
| WO-FH-02 | [#670](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/670) | PROM explícito como filtro poblacional | PENDIENTE_SHAPING de instrumentos/valores/vacíos | Congelar semántica; después implementación de cohorte+CSV |
| SPEC-F45-01 | [#671](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/671) | DeliveryResult y Excel adapter (F4.5) | PENDIENTE_SHAPING, solo spec | Definir evidencia, destino, resultado, errores, idempotencia |
| SHAPING-N1-01 | [#672](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/672) | Renovaciones N1 FH→Enfermería | PENDIENTE_FUENTE_EQUIPO | Resolver REN-OPEN-001/002/004/006, OCT-OPEN-013 o aprobar demo parametrizada |

## 4. Inventario completo pendiente: Farmacia Hospitalaria

Las filas con issue #663–#672 del primer paquete remiten a `3; aquí figuran además todos los pendientes restantes. Una observación histórica no reaparece como defecto sin reproducción soportada.

| ID | Resultado faltante y autoridad | Estado / dependencia | Siguiente gate |
| --- | --- | --- | --- |
| FH-01 | Dashboard: utilidad/continuidad de acciones | PENDIENTE_QA · #664 | Recorrido real y clasificación, NO retirar por intuición |
| FH-02 | Comorbilidades longitudinales | PENDIENTE_QA · #665 | Fuente explícita raw/demo y vacío neutral |
| FH-03 | Primera Visita: previo, inducción solicitada/validada y casos complejos | PENDIENTE_QA | QA sintética por ruta; no START/SWITCH/add-on retrospectivo |
| FH-04 | SIL-REV-018-B1: PROM por instrumento/valor/rango | PENDIENTE_SHAPING · #670 | Semántica de instrumento/escala/ausencia |
| FH-05 | SIL-REV-018-B2: validación, EA/severidad, causalidad, movimientos | PENDIENTE_SHAPING / DESCOMPONER | Una WO por dimensión con dato explícito, no causalidad inferida |
| FH-06 | SIL-REV-018-C dosis/vía/pauta | PENDIENTE_SHAPING | Línea activa frente a evento histórico; semántica multilineal |
| FH-07 | SIL-REV-018-D ventana temporal y 1/2/3 líneas simultáneas | PENDIENTE_SHAPING | Fecha y concurrencia explícitas, nunca contar fármacos históricos |
| FH-08 | SIL-REV-018-E sexo/edad/comorbilidades/control clínico FH raw | PENDIENTE_FUENTE_EQUIPO | Source/proyección: raw sex/age vacíos, clinical_activity null |
| FH-09 | SIL-REV-001 nomenclatura oficial SES/programas | PENDIENTE_FUENTE_EQUIPO | Catálogo autorizado, service_id versionado |
| FH-10 | SIL-REV-020 medicación especial | PENDIENTE_FUENTE_EQUIPO | Fuente o entrada profesional, sin inferir por CIMA/nombre |
| FH-11 | Renovaciones N1: detección, bandeja, export a Enfermería | PENDIENTE_SHAPING · #672 | Parámetros/fuente/servicios; oráculo N1 antes del writer |
| FH-12 | Renovaciones N2: Excel retorno | PENDIENTE_DEPENDENCIA N1 | Layout físico, política de columnas extras REN-OPEN-007 |
| FH-13 | Renovaciones N3: retorno y acto FH | PENDIENTE_DEPENDENCIA N2/EQUIPO | Acto, validez, suspensión, idempotencia, no terminal automático |
| FH-14 | Recogidas pendientes | PENDIENTE_FUENTE_EQUIPO | Ventana/dispensación/destinatario; no interpretar abandono |
| FH-15 | Add-on/nueva línea, primera dispensación | PENDIENTE_EQUIPO | OCT-OPEN-004: PV nueva línea vs Seguimiento+acto |
| FH-16 | Propuestas editables CIMA/presentación explícita | PENDIENTE_SHAPING/FUENTE | Ficha/version/contexto, sin sobrescritura ni decisión automática |
| FH-17 | PDF de informes Cosentyx/Kisqali | PENDIENTE_DECISIÓN · [#597](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/597) | Librería vendorizada/licencia o imprimir rotulado, sin falso download |
| FH-18 | FH-DEBT-004 responsive Cosentyx | READY_TO_SCOPE · #669 | QA 820/1080, no cambiar informes ni cálculos |
| FH-19 | FH-DEBT-001 Excel clínico importado en sessionStorage | ANTES_PILOTO P1 | Política de retención/continuidad/borrado; no suprimir a ciegas |
| FH-20 | Escritura/entrega real de Export V2 | PENDIENTE_DEPENDENCIA F4.5 · #671 | Contrato, garantías y destino; copia demo no equivale a persistencia |

**Protecciones específicas:** la bandeja `Pendientes` ya muestra y evalúa estados prebiológicos en código; no reabrir su P1 antiguo sin QA. `Validadas` ≠ solicitadas, `estimada` ≠ confirmada, tratamiento previo ≠ nuevo, nombre/CIMA/presentación genérica no escribe dosis, vía, pauta, duración, switch, add-on ni validación. Ningún dato real de paciente en Git.

## 5. Inventario completo pendiente: Reumatología

| ID | Resultado faltante | Estado / issue | Siguiente gate |
| --- | --- | --- | --- |
| RE-01 | PCR: UI sin «Sin unidad» y ayuda; defaults por hospital separados | READY_TO_SCOPE parcial · #668 / PENDIENTE_FUENTE | Implementar solo UI; default site no autorizado |
| RE-02 | BASFI EspA PV+Seguimiento | PENDIENTE_FUENTE_EQUIPO | Ítems y cálculo clínico versionados antes del ticket |
| RE-03 | ASDAS-PCR/VSG cálculo completo | PENDIENTE_QA · #666 | Casos de referencia aprobados, no cambiar fórmula sin defecto |
| RE-04 | Tratamientos previos actual/anterior/solicitado | PENDIENTE_QA | QA de fuente y continuidad, sin transformar previo en START |
| RE-05 | Restauración soportada de Primera Visita | PENDIENTE_QA · #667 | Demostrar ruta o ausencia de capacidad, no modificar DOM |
| RE-06 | LES/Sjögren | PENDIENTE_EQUIPO | Semántica clínica asistencial por patología |
| RE-07 | Longitudinalidad general y QR/PROM | DEFERIDO | Fixture y checkpoint E2E propios; no defectos basados en demo vieja |
| RE-08 | Residuos storage/TXT→CSV | ANTES_PILOTO · [#621](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/621) | Política de privacidad, minimización y legado; sin limpiar masivamente |
| RE-09 | Contrato search(query) legacy | DEUDA · [#450](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/450) | Decidir workbook-only frente a union si hay presión |
| RE-10 | Polling customSelect 300 ms | DEUDA · [#570](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/570) | Medición focal y fix solo bajo WO aprobada |
| RE-11 | Entrega a Bridge/Processor desde Visit Act | PENDIENTE_DEPENDENCIA F4.5/Bridge | Semántica de delivery y destino; 497 permanece compatibilidad |
| RE-12 | Cualificación BAD×Reuma / otros centros | F7 · ANTES_PILOTO | Site×módulo, datos/fuentes/permisos de despliegue reales |

**No revivir:** Train 29 filtro Sexo M/F ya corregido; Train 27 procedencia de tratamiento actual; Train 24 biologic_start retrospectivo; Train 23 biomarcadores numéricos; Reuma→FH textual publicada; 497 y Read Port publicados pero no integración backend.

## 6. Nexus V4 / Foundation / delivery / seguridad

| Frontera | Estado verificable | Dependencia y siguiente paso |
| --- | --- | --- |
| F0–F3: freeze, tooling, shell, Home/readiness/release sintético | PUBLISHED | No cualifica hospital real |
| FH F4.1–F4.3: read DTO/facade y consumidores | PUBLISHED | No escritura |
| FH F4.4: Pharmacy Act v1 | PUBLISHED (contrato) | No delivery ni persistencia |
| **F4.5** DeliveryResult + Excel adapter | PENDIENTE_SHAPING · #671 | Resultados/evidencia de destino antes de código, no persisted sin commit |
| **F4.6** mapping de interoperabilidad | PENDIENTE_DEPENDENCIA F4.5 / timing | FHIR/openEHR solo sintético/documental; no API hospitalaria |
| Reuma F5.1–F5.4 read/Visit Act/legacy boundary | PUBLISHED | F5.3 497 es frontera de compatibilidad, no delivery final |
| **F6.1** datos navegador/retención | ANTES_PILOTO · FH-DEBT-001 + #621 | Política de seguridad/continuidad y QA |
| **F6.2** URL/log exposición | ANTES_PILOTO | Minimización clínica y observabilidad allowlist sin PHI |
| **F6.3** dependencias/vendors | ANTES_PILOTO | Licencias/versiones/hashes/CSP, según entorno autorizado |
| **F7** qualification hospital×módulo | ANTES_PILOTO / SOLO BAJO NECESIDAD | BAD×Reuma/FH, CAC×FH, MER según presión; no global |
| Excel Bridge físico / Processor | DISCOVERY · [#577](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/577) | Patología explícita con hoja por patología frente a raw común relacional; no router redundante |
| FarmaTool/PreSalud escritura receta y orden clínica | DISCOVERY | Verificar instalación/version/API/autorización; texto para pegar no equivale a escritura |
| V5 form-builder, paciente regional universal, backend anticipado | DEFERIDO | No cargar en fixes V4 |

## 7. Dermatología — dirección aprobada, no módulo operativo

| Bloque | Estado | Gate |
| --- | --- | --- |
| Módulo Dermatología, HS y psoriasis | DECIDIDO_PRODUCTO / PENDIENTE_SHAPING | Seleccionar primer circuito con contrato clínico y UX propia; actualmente DermaNEXus en Home es solo «Próximamente» |
| Solicitud Dermatología→FH | REFERENCIA_HISTÓRICA / PENDIENTE_CONTRATO | Reconciliar plantilla antigua con molécula/presentación, solicitud explícita, inducción/pauta y vacunación; no publicarla como vigente sin revisión |
| Vacunación VHB | DECIDIDO_CONCEPTUAL / NO IMPLEMENTADO | Pauta completa ≠ condición suficiente para iniciar; ninguna autorización inferida |
| Eccema de manos | PENDIENTE_EQUIPO | Entrada clínica y seguimiento, sin inventar semántica |
| Universalización V5 | DEFERIDO | No adelantar Control Plane / form builder |

## 8. Orden de empaquetado y cierre

- **Lote A — read-only, bajo autorización de ejecución específica:** #664 → #665 → #667; #666 solo con referencia clínica acordada. Si pasan, cerrar; si fallan, WO correctiva con diagnóstico explícito y prueba focalizada. No inventar otra auditoría.
- **Lote B — micro-WOs bajo prioridad/aprobación humana:** #668 PCR UI sin defaults; #669 Cosentyx responsive. Una implementación, una revisión Standards+Spec, corrección acotada si aparece hallazgo, sin suites generales por rutina.
- **Lote C — contratos y decisiones:** #670 PROM; #671 F4.5; #672 N1. No lanzar writer de feature hasta congelar la única semántica abierta pertinente.
- **Lote D — restantes:** FH/RE QA adicionales, análisis B/C/D/E descompuesto, gates F6/F7 antes del piloto, Dermatología como producto separado. Nunca elegir por numeración ni elevar microfixes a Train estratégico.

**Condición de éxito de esta cola:** en una nueva conversación, leer GitHub `docs/INDEX.md` → `docs/ops/WORK_ORDER_STATUS.md` → este documento, verificar estado del issue específico y decidir solo la próxima unidad aprobada/desbloqueada. Al cerrar un ticket, actualizar fila/issue/PR por WO documental cuando materialmente cambie; no reinterpretar toda la auditoría. El resultado de QA por navegador debe distinguirse de tests automáticos y de estado publicado.

**Git/política:** DOC-01 #663 prepara este documento en worktree aislado. Ningún issue de lote tiene `status:approved` por creación. No push/PR/merge/deploy sin autorización específica, no pacientes reales y no modificaciones de main ni sesiones ajenas.
