# PROMueve — Recuperación de requisitos y trazabilidad de fuentes

**Corte:** 2026-10-11. **Estado:** candidato documental local, NO publicado. **Base Nexus:** `promueve/nexus-v4@a3556b408e91c257c7cd2c829c575ff497c99745`. **Madurez:** evaluación sintética, NO piloto.

## 1. Jerarquía y universo revisado

**Autoridad actual:** `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, ledger funcional, backlog FH 2026-10-11, reconciliación #501 (03/10), auditoría SIL #495 (28/09), Foundation Train Plan, N0 renovaciones, registro de deuda FH y Freeze/ADR. Confirmación de GitHub PR/HEAD/issue y código publicado prevalece sobre documentos históricos.

**Históricos en repo:** `docs/ops/FARMACIA_V0_4_BACKLOG_NEOPLASIAS_20260611.md`, `FARMACIA_V0_4_MODELO_MULTIBIOLOGICO_20260611.md`, `FARMACIA_V0_4_CAUSALIDAD_EA_20260611.md`, `FARMACIA_V0_3_DASHBOARD_SERVICIO_FILTROS_20260607.md`, plan de formación, catálogos y auditorías de pantallas.

**Adjuntos históricos aportados, no fuente de autoridad clínica vigente:** `Auditoría Farmacia — Rescate funcional y deuda técnica.md`, `plan_maestro_rescate_farmacia_PROMueve.md`, `backlog_priorizado_PROMueve_Farmacia_Badajoz_WO8_2026-06-15.md`, `Informe_PROMueve FHs_Caceres_v5.docx`, `Informe PROMueveFHs Caceres_v5.pptx`, `Proyecto PROMueveFHs_Ext.pptx`, `Manual Práctica Avanzada en Enfermería Reumatológica_v5.md`, `plantilla_solicitud_dermatologia.html`. Están fuera del repo salvo variantes históricas concretas: no copiar pacientes ni las fuentes completas, ni promover sus propuestas/valores como decisiones nuevas.

**Evidencia usada:** comparación de estado/PR y búsqueda de implementación en módulos concretos (no una nueva QA de navegador). Las observaciones se etiquetan `PUBLICADO_DELIMITADO`, `PARCIAL_QA`, `PENDIENTE_FUENTE_EQUIPO`, `SHAPING`, `CIRCUITO_EXTERNO`, `DEFERIDO`, `ANTES_PILOTO`. Nunca se deduce interacción real por presencia en código.

## 2. Informe de Cáceres v5 — propuestas S1, S2, S4–S13

El informe recoge P1–P12 como problemas del circuito, no todos de software. No se encontró S3 numerado. La sección de pendientes v5 mantiene feedback de Farmacia, PREMs desde cuenta institucional, acuerdo Digestivo/Calidad, rol Enfermería y herramienta corporativa final sin cerrar.

| Ref. | Propuesta histórica y evidencia contrastada | Estado y siguiente puerta |
| --- | --- | --- |
| S1 | Estratificación SEFH/CMO. Acceso por enlace externo en `farmacia_primera_visita.html` y `farmacia_seguimiento.html` con registro de nivel; #362 cerrado, checker específico existente | `PUBLICADO_DELIMITADO` enlace/captura; no implica motor CMO calculador nativo ni uso efectivo externo. QA de continuidad si hay necesidad |
| S2 | Tarjetas QR correo clasificado, cambios de cita y educación. Informe describe materiales, no integra bandeja de correo corporativa en Nexus | `CIRCUITO_EXTERNO`: validar entrega, cuentas, destinos, mantenimiento antes de desarrollar |
| S4 | Transferencia del modelo Digestivo/Enfermería/Medicina Preventiva. Informe señala reunión de aprendizaje, protocolo y adaptación sin acreditación final | `CIRCUITO_EXTERNO`: cierre con responsables; no duplicar estructuras por analogía |
| S5 | Formulario Dermatología→Farmacia con campos clínicos explícitos. Plantilla histórica disponible, intake FH y código parcial; DermaNEXus en Home solo `Próximamente` | `SHAPING`: reconciliar contrato actual, nunca introducir formulario histórico como autoridad |
| S6 | PREMs en Microsoft Forms desde cuenta institucional de Farmacia. Informe v5 marca pendiente identidad/cuenta institucional | `PENDIENTE_EQUIPO`: cuenta, protección datos, destino y circuito PREMs antes de integrarlo |
| S7 | Póster QR Escuela Pacientes/recursos educativos | `CIRCUITO_EXTERNO`: verificar materiales, URL, aprobación e impresión; no presumir despliegue |
| S8 | Alertas de recetas, semáforo y handoff. N0 publicado en `schemas/renewal`; N1/N2/N3 sin runtime | `SHAPING` #672: umbrales, fuente y calidad de vencimiento. **Semáforo histórico 15/30/45 días NO es default autorizado** |
| S9 | Coordinación de citas Admisiones–Derma–FH y avisos de cambios | `CIRCUITO_EXTERNO`: validar procedimiento/ownership institucional, no inventar conexión a agendas |
| S10 | Plantilla Primera Visita + Seguimiento FH con Morisky, educación, PROM y EA. Dos pantallas reales y captura parcial, no se acredita paridad integral del informe | `PARCIAL_QA`: comprobar el trayecto sintético y datos exactos; no crear segundo formulario |
| S11 | Auditoría FarmaTools/PreSalud, módulos y capacidades institucionales | `DISCOVERY_EXTERNO`: versión instalada, interfaces y permisos del fabricante antes de plan de lectura/escritura |
| S12 | Huecos colchón para pacientes a demanda y bloques de trabajo | `CIRCUITO_EXTERNO`: validar modelo de agenda con FH; sin implementar un scheduler por defecto |
| S13 | Feedback bidireccional clínico Derma↔FH en momentos de alto valor | `SHAPING`: mensajes, destinatario, evidencia clínica, respuesta/retorno, autoría y ausencia; nunca inferir respuesta |

**P2/P3/P5/P8/P11/P12 del informe** aportan además pacientes sin cita, cuello de botella Medicina Preventiva, descoordinación de visitas, clasificación de emails, educación repetitiva y cambio de tratamiento. Constituyen **necesidades asistenciales/operativas históricas**, no nuevas órdenes de desarrollo. No trasladar porcentajes de ahorro, tiempos, cadencias o parámetros de la presentación a garantías de producto.

## 3. Rescate Farmacia y evolución v0.3→V4 — reconciliación de falsos positivos y ausencias reales

| Fuente | Estado contrastado | Accionable todavía |
| --- | --- | --- |
| WO8 P0 Validación, fármaco ≠ dosis/pauta/vía/inducción | Contratos y checkers CIMA/solicitud y validación publicados; `farmacia_validacion.html` usa datos explícitos | No volver a abrir P0 general. QA de paciente Enfermería importado solo con reproducción soportada |
| Plan rescate WO2–WO4 bloqueantes | `scripts/farmacia_actividad_servicio.js` evalúa paciente y dibuja bloqueantes; mapping Enfermería ampliado | No abrir falta de evaluador. QA de coherencia entre bandeja y Validación, fuente y vacíos si hace falta |
| Continuidad CIP y solicitud | `scripts/farmacia_common.js` contiene contexto de `solicitud_id`, fail-closed en mismatch; F4.3 Read Port/facade publicado | Diferenciar de retención en sessionStorage FH-DEBT-001 y cualificación pre-piloto |
| Modelo multibiológico v0.4 | `scripts/farmacia_multitreatment_core.js`, read adapter y Export V2 multilínea presentes | `PARCIAL_QA` seguimiento/EA y actos por línea; add-on/new-start requieren decisión FH, no heurística |
| Causalidad v0.4 | Causalidad y EA en Seguimiento; `scripts/farmacia_validacion.js` conserva funciones antiguas ocultas | `PARCIAL_QA` de atribución/algoritmos soportados; no activar causalidad en validación inicial, matriz clínica pendiente de fuente |
| **Neoplasias** en paciente con biológicos, petición Cáceres | `farmacia_validacion` capta antecedente/riesgo de neoplasia y Export V2 lo transporta | **NO ES seguimiento oncológico longitudinal por línea**; finalidad, variables, eventos y periodicidad `PENDIENTE_EQUIPO` |
| Histórico doce filtros v0.3 | `SIL-REV-018-A` molecular publicado Train28; raw sigue con `sex:''`, `age:''`, `clinical_activity:null` en `scripts/farmacia_statistics_cohort.js` | B/C/D/E pendientes por fuente/semántica; nunca recuperar filtros demo como inferencia raw |
| Estratificación SEFH | Link externo y campo nivel presentes, revisión previa #362 | Acceso no prueba funcionamiento remoto/implantación en Cáceres; QA solo si cambia flujo |
| Catálogo CIMA | Selección y fuentes versionadas con límites seguros | Propuestas por presentación y auto-update independientes, no sobrescritura |
| Formularios multipatología WO8 (DA/vitíligo/alopecia), Eczema manos | Evolución de producto 03/10 prioriza HS/PsO; eccema requiere equipo, no módulo Derma operativo | No resucitar backlog WO8.3–WO8.8 como decisión actual |
| Cache/versión/guion de demo y pantallas Fármacos/Profesionales | Releases y pantallas publicados, sin QA fresco de necesidad concreta | Historias de calidad/deuda, no defectos actuales demostrados |
| PREMs/QR/medicación especial | Documentos previos y promesas de circuito ≠ servicio en producción | Shaping/ownership y fuente explícita, fuera de fixes urgentes |

## 4. Reumatología — resultado vigente

La adjudicación manual `docs/ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md` `3.2 (1–16) marca resueltos/publicados **1,2,3,5,6,8,9,10,11,12,13,14,15,16** en alcance propio; **4 PCR por site** y **7 BASFI** siguen sin cierre integral. ASDAS es `IMPLEMENTADO_REVALIDAR` (cálculo no adjudicado integralmente); Previos y restauración Primera Visita requieren QA focal; longitudinalidad/QR/PROM general diferido; legacy storage #621 antes piloto. No recrear errores de Sexo M/F (Train29), current treatment (Train27), biomarcador (Train23) ni biologic_start (Train24).

El `Manual Práctica Avanzada en Enfermería Reumatológica_v5.md` constituye recurso de atención/educación/enfermería, NO contrato del módulo Reuma aprobado. Puede alimentar discovery asistencial, pero no autoriza nuevas escalas, ítems, procedimientos ni formularios.

## 5. Nexus Foundation, Dermatología y fronteras institucionales

**PUBLICADO:** F0–F3 shell/deployment/QA sintético, Farmacia F4.1–F4.4 read + Pharmacy Act v1, Reuma F5.1–F5.4 read + Visit Act + legacy 497 compatible. **PENDIENTE:** F4.5 entrega/Excel adapter, F4.6 mapping documental, F6 privacidad/URL/vendor y F7 combinación hospital×módulo real. F4.5 disponible técnicamente no implica priorización automática.

**DISCOVERY DISTINTO:** [Bridge #577](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/577) versus Processor, Farmatool receta y orden clínica institucional, rol/capa Enfermería, contrato y permisos. Copia TXT/TSV ≠ escritura en Farmatool ni acto final validado.

**DERMA:** módulo HS/PsO no cualificado, plantilla original no vigente, VHB pauta completa ≠ condición suficiente de inicio, eccema de manos en espera de equipo. V5 universal, form-builder/paciente regional y backend anticipado diferidos.

## 6. Reglas para no dar falsos cierres

- Riesgo de neoplasia ≠ seguimiento de neoplasias; Morisky en código ≠ educación y validación de todo el informe; PREMs externo ≠ PREMs integrados; tarjeta QR propuesta ≠ canal autorizado por hospital.
- N0 renovaciones ≠ N1–N3; ninguna regla de caducidad ni duración se infiere de documento anterior.
- Botón/enlace en código ≠ verificación de ruta soportada ni piloto; GitHub issue OPEN ≠ pendiente si PR fusionada; HEAD histórico ≠ rama actual.
- No modificar DOM para declarar PASS, no ejecutar nueva batería de navegador en inventario, no transcribir pacientes reales ni fuentes externas sensibles.
- No ampliar medicina preventiva, causalidad, oncología, terapia ni semántica farmacológica sin contrato/fuente y decisión de equipo.

## 7. Salida

**ACTUALIZACIÓN POSTERIOR — CANDIDATO LOCAL, NO PUBLICADO:** la fotografía anterior de 77 unidades sin issue es histórica. El [registro de ticketización Matt](PROMUEVE_TICKETIZATION_REGISTER_20261011.md) documenta 61 issues nuevos (#674–#734), seis reutilizados y tres diferidos. Ningún issue de esta fase tiene status:approved ni ready-for-agent.

[Cola transversal](PROMUEVE_SHIPPING_BACKLOG_20261011.md) = fuente de entrada; [paquete ampliado de unidades candidatas](PROMUEVE_CANDIDATE_TICKETS_20261011.md) = ticketización pendiente. Los issues reales #663–#672 permanecen sin `status:approved` y no se duplican. Sin push/PR/merge ni lanzamiento de OpenCode.
