# PROMueve Nexus — registro de ticketización Matt / Atenea C-087

**Corte:** 2026-10-11 · **Estado:** CANDIDATO DOCUMENTAL LOCAL; este registro aún no está publicado. **Base publicada:** promueve/nexus-v4@abcf3070500b2f190b2af2aa11a2f428a81d7252. **Madurez:** demo sintética, NO piloto.

La reconciliación parte de [cola operativa](PROMUEVE_SHIPPING_BACKLOG_20261011.md), [fuentes](PROMUEVE_REQUIREMENTS_TRACEABILITY_20261011.md) y [77 unidades originales](PROMUEVE_CANDIDATE_TICKETS_20261011.md). Se han creado 61 nuevos issues [#674–#734](https://github.com/b32majus/Hub-Clinico-Badajoz/issues), todos sin aprobación de ejecución; 57 IDs poseen issue propio y 11 necesidades operativas están agrupadas en cuatro issues. Se reutilizan seis issues existentes y se mantienen tres unidades diferidas sin issue.

Matt /to-tickets: unidades verificables, límites propios, criterios de aceptación y dependencias reales. Las dependencias nativas GitHub se usan solo donde hay gate material (N1→N2→N3, DeliveryResult→F4.6 y Reuma, F6→F7, etc.). **Ticketizar no es aprobar ni demostrar implantación**.

| Métrica | Total |
| --- | ---: |
| Issues nuevos de esta fase | 61 |
| IDs con nuevo issue propio | 57 |
| IDs operativos agrupados | 11 → 4 issues |
| IDs con issue histórico reutilizado | 6 |
| IDs diferidos sin issue | 3 |
| IDs trazados | 77 |

## Correspondencia exacta

| ID | Resultado de la cola | Issue | Estado de ticketización | Gate original |
| --- | --- | --- | --- | --- |
| FH-QA-03 | Primera Visita: inducción solicitada vs realizada, tratamiento previo, fuente y estado. `farmacia_primera_visita.html`, script y read adapter | [#674](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/674) | CREADO / NO APROBADO | READY_FOR_ISSUE_QA |
| FH-QA-04 | Validación con fila Enfermería, servicio y patología correctos, campos completables. `farmacia_validacion.html`, JS y import v6 | [#675](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/675) | CREADO / NO APROBADO | READY_FOR_ISSUE_QA |
| FH-QA-05 | Prebiológico: coherencia Inicio/Pendientes/Validación y procedencia importada | [#676](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/676) | CREADO / NO APROBADO | READY_FOR_ISSUE_QA |
| FH-QA-06 | Multibiológico: elección de línea, seguimiento y EA vinculados a sospechosos explícitos. `farmacia_multitreatment_core.js` y `farmacia_seguimiento.js` | [#677](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/677) | CREADO / NO APROBADO | READY_FOR_ISSUE_QA |
| FH-QA-07 | Causalidad EA en Seguimiento vs residuos ocultos en Validación. `farmacia_seguimiento.js`, `farmacia_validacion.js` | [#678](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/678) | CREADO / NO APROBADO | READY_FOR_ISSUE_QA / SOURCE_OR_TEAM |
| FH-QA-08 | Cobertura de import Enfermería v6: campos realmente soportados, ausentes, variantes de hojas y recuperación | [#679](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/679) | CREADO / NO APROBADO | READY_FOR_ISSUE_QA |
| FH-QA-09 | Morisky/adherencia y educación en Seguimiento respecto al informe S10 (solo campos existentes) | [#680](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/680) | CREADO / NO APROBADO | READY_FOR_ISSUE_QA |
| FH-QA-10 | Separación demo/importado y manejo de fallo de almacenamiento en inicio/cambio paciente | [#681](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/681) | CREADO / NO APROBADO | READY_FOR_ISSUE_QA |
| FH-QA-11 | Profesionales Fármacos / usuario FH visibles: perfil/fuente real frente a demo | [#682](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/682) | CREADO / NO APROBADO | READY_FOR_ISSUE_QA |
| FH-QA-12 | Acceso externo a estratificación SEFH vs registro de nivel FH (S1) | [#683](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/683) | CREADO / NO APROBADO | READY_FOR_ISSUE_QA |
| FH-STAT-VAL | Validación explícita como filtro en `farmacia_estadisticas.js` y `farmacia_statistics_cohort.js` | [#684](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/684) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC |
| FH-STAT-EA | Efectos adversos por severidad documentada | [#685](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/685) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC |
| FH-STAT-CAUS | Causalidad explícita por valoración/evidencia aprobada | [#700](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/700) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| FH-STAT-MOV | Movimiento terapéutico explícito | [#686](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/686) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC |
| FH-STAT-DOSE | Dosis/presentación como dimensión de línea | [#687](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/687) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC |
| FH-STAT-ROUTE | Vía declarada como filtro | [#688](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/688) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC |
| FH-STAT-SCHED | Pauta/frecuencia como filtro | [#689](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/689) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC |
| FH-STAT-TIME | Ventana temporal de cohorte | [#690](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/690) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC |
| FH-STAT-CONCUR | Conteo 1/2/3 líneas activas simultáneas | [#691](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/691) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC / SOURCE_OR_TEAM |
| FH-STAT-DEMOG | Sexo/edad de cohorte raw | [#701](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/701) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| FH-STAT-COMORB | Comorbilidades poblacionales raw | [#702](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/702) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| FH-STAT-ACT | Actividad/control clínico raw | [#703](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/703) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| FH-REN-N1 | Bandeja renovaciones y entrega FH→Enfermería N1 | [#704](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/704) | CREADO / NO APROBADO | DEPENDENT #672 |
| FH-REN-N2 | Excel Enfermería de retorno N2 | [#705](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/705) | CREADO / NO APROBADO | DEPENDENT N1 / SOURCE_OR_TEAM |
| FH-REN-N3 | Acto FH terminal N3 | [#706](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/706) | CREADO / NO APROBADO | DEPENDENT N2 / SOURCE_OR_TEAM |
| FH-PICKUP | `PENDIENTE_RECOGIDA` con fecha/fuente/cadencia explícitas | [#707](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/707) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| FH-ADDON | Primera dispensación del add-on: PV nueva línea vs Seguimiento | [#708](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/708) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| FH-NEOP | Seguimiento específico neoplasias asociadas temporalmente a línea | [#709](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/709) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| FH-MEDSPEC | Medicación extranjera/compasiva/ensayo/local | [#710](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/710) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| FH-CIMA-PRES | Propuestas editables por presentación seleccionada + contexto autorizado | [#692](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/692) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC / SOURCE_OR_TEAM |
| FH-SES-NAMES | Programas/procesos FH con catálogo SES autorizado | [#711](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/711) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| FH-MP-COORD | Prerrequisitos Preventiva en flujo FH ↔ Enfermería | [#712](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/712) | CREADO / NO APROBADO | OPS_DECISION / SOURCE_OR_TEAM |
| FH-REPORT-PDF | PDF real informes V1 | [#597](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/597) | EXISTENTE REUTILIZADO | ISSUE EXISTENTE [#597](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/597) |
| FH-REPORT-V2 | Presets guardados/compartidos | — | DEFERIDO SIN ISSUE | DEFERRED |
| FH-STORAGE | FH-DEBT-001: retención/cifrado/borrado de import clínico en navegador | [#716](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/716) | CREADO / NO APROBADO | ANTES_PILOTO |
| RE-QA-PREV | Tratamientos previos, actuales y solicitados por fuente física | [#693](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/693) | CREADO / NO APROBADO | READY_FOR_ISSUE_QA |
| RE-PCR-SITE | Defaults PCR BAD/MER/CAC | [#717](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/717) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| RE-BASFI | Instrumento BASFI en PV/Seguimiento EspA | [#718](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/718) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| RE-LES | Contrato clínico Lupus | [#719](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/719) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| RE-SJOG | Contrato clínico Sjögren | [#720](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/720) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| RE-LONG | Evolución longitudinal PROM/QR | — | DEFERIDO SIN ISSUE | DEFERRED |
| RE-DELIVERY | Visit Act→destino real/Bridge, 497 como compatibilidad | [#723](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/723) | CREADO / NO APROBADO | DEPENDENT F4.5 / #577 |
| RE-STORAGE | Retención legacy browser y minimización | [#621](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/621) | EXISTENTE REUTILIZADO | ANTES_PILOTO · issue [#621](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/621) |
| RE-CAT | `search(query)` legacy sin categoría | [#450](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/450) | EXISTENTE REUTILIZADO | DEFERRED · issue [#450](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/450) |
| RE-SELECT | Polling `customSelect` de 300 ms | [#570](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/570) | EXISTENTE REUTILIZADO | DEFERRED · issue [#570](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/570) |
| NX-F45-IMPL | Tipos DeliveryResult y adapter Excel sin alterar acto | [#721](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/721) | CREADO / NO APROBADO | DEPENDENT issue [#671](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/671) |
| NX-F46-MAP | Mapping FHIR/openEHR sintético documental | [#722](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/722) | CREADO / NO APROBADO | DEPENDENT F4.5 |
| NX-F61 | Ciclo de vida de estado browser por categoría | [#713](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/713) | CREADO / NO APROBADO | ANTES_PILOTO |
| NX-F62 | Exposición URL/log de PHI | [#714](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/714) | CREADO / NO APROBADO | ANTES_PILOTO |
| NX-F63 | Vendor/dependencias/versiones/CSP | [#715](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/715) | CREADO / NO APROBADO | ANTES_PILOTO |
| NX-F7-BAD-FH | Qualificación BAD×Farmacia | [#724](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/724) | CREADO / NO APROBADO | DEPENDENT ENTORNO |
| NX-F7-BAD-RE | Qualificación BAD×Reuma | [#725](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/725) | CREADO / NO APROBADO | DEPENDENT ENTORNO |
| NX-F7-CAC-FH | Qualificación CAC×Farmacia | [#726](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/726) | CREADO / NO APROBADO | DEPENDENT ENTORNO |
| NX-BRIDGE | Entrada por patología/Excel físico frente a Processor raw relacional | [#577](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/577) | EXISTENTE REUTILIZADO | ISSUE EXISTENTE [#577](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/577) |
| NX-FARMATOOL | Instalación/versionado/interfaces de Farmatool/PreSalud para receta | [#694](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/694) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC / SOURCE_OR_TEAM |
| NX-ORDEN | Salida textual segura para orden clínica, pegado manual | [#695](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/695) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC |
| NX-NURSING | Contrato de consumo y retorno Enfermería | [#696](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/696) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC / SOURCE_OR_TEAM |
| NX-DEBT-389 | Hallazgos bootstrap no bloqueantes | [#389](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/389) | EXISTENTE REUTILIZADO | DEFERRED · issue [#389](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/389) |
| NX-V5 | Configurador multi-servicio y paciente universal | — | DEFERIDO SIN ISSUE | DEFERRED |
| DER-BASE | Navegación, ownership y datos de módulo real Dermatología | [#697](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/697) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC / PRIORIDAD_HUMANA |
| DER-HS | Vertical HS longitudinal | [#727](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/727) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| DER-PSO | Vertical psoriasis longitudinal | [#728](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/728) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| DER-FH | Solicitud Derma→FH reconciliada desde plantilla histórica | [#698](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/698) | CREADO / NO APROBADO | READY_FOR_ISSUE_SPEC / SOURCE_OR_TEAM |
| DER-VHB | Dos hechos vacunales diferenciados en circuito Derma | [#729](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/729) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| DER-HAND | Eccema de manos | [#730](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/730) | CREADO / NO APROBADO | SOURCE_OR_TEAM |
| OPS-QR-CITA | Tarjetas QR/correo clasificado/cambio cita (S2) | [#731](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/731) | AGRUPADO: OPS-COMMS-PACKET / NO APROBADO | OPS_DECISION |
| OPS-QR-EDUC | Material de educación/póster QR Escuela Pacientes (S7) | [#731](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/731) | AGRUPADO: OPS-COMMS-PACKET / NO APROBADO | OPS_DECISION |
| OPS-PREMS | PREMs institucional desde Microsoft Forms (S6) | [#731](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/731) | AGRUPADO: OPS-COMMS-PACKET / NO APROBADO | OPS_DECISION / SOURCE_OR_TEAM |
| OPS-DIGEST | Traslación aprendizaje Digestivo/Calidad (S4) | [#732](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/732) | AGRUPADO: OPS-COORD-PACKET / NO APROBADO | OPS_DECISION |
| OPS-AGENDA | Huecos colchón y bloques agenda FH (S12) | [#732](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/732) | AGRUPADO: OPS-COORD-PACKET / NO APROBADO | OPS_DECISION |
| OPS-CITAS | Protocolo cambios Admisiones–Dermatología–FH (S9) | [#732](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/732) | AGRUPADO: OPS-COORD-PACKET / NO APROBADO | OPS_DECISION |
| OPS-FEEDBACK | Handoff bidireccional clínico en momentos útiles (S13) | [#699](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/699) | CREADO / NO APROBADO | OPS_DECISION / READY_FOR_ISSUE_SPEC |
| OPS-PATIENT | Información y educación terapéutica (S2/S7/P11) | [#731](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/731) | AGRUPADO: OPS-COMMS-PACKET / NO APROBADO | OPS_DECISION |
| OPS-PREVENT | Medicina Preventiva como cuello de botella (P3) | [#732](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/732) | AGRUPADO: OPS-COORD-PACKET / NO APROBADO | OPS_DECISION |
| OPS-FARMATOOL | Audit de capacidades dormidas FarmaTools (S11) | [#733](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/733) | AGRUPADO: OPS-SYSTEMS-PACKET / NO APROBADO | OPS_DECISION / SOURCE_OR_TEAM |
| OPS-METRICS | Indicadores de proceso/impacto PROMueve FHs | [#734](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/734) | AGRUPADO: OPS-METRICS-PACKET / NO APROBADO | OPS_DECISION |
| OPS-SWITCH | Reducir duplicidad en cambio de tratamiento (P12) | [#733](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/733) | AGRUPADO: OPS-SYSTEMS-PACKET / NO APROBADO | OPS_DECISION / SOURCE_OR_TEAM |

## Regla de uso

- Consultar GitHub live para HEAD, status:approved, blockers nativos y cambios de estado; la columna refleja la fotografía de creación, no una aprobación perpetua.
- Para QA de navegador, usar la interacción soportada; PASS de test no equivale a fidelidad clínica ni visual.
- Un issue de fuente/equipo obtiene contrato o decisión, no implementa. La ausencia permanece unknown; no inferir dosis, vía, pauta, inducción, causalidad, línea, switch, renovación ni validación.
- En software, el ticket ejecutable necesita su propia aprobación, WO atómica, QA y autorización independiente de push/PR/merge.
- Los trabajos organizativos de Cáceres siguen siendo externos al código salvo contrato/encargo posterior. Los tres diferidos continúan rastreables solo en la cola.
