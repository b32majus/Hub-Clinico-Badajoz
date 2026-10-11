# PROMueve — Paquete ampliado de unidades de trabajo preparadas para ticketización

**ACTUALIZACIÓN POSTERIOR — CANDIDATO LOCAL, NO PUBLICADO:** la fotografía anterior de 77 unidades sin issue es histórica. El [registro de ticketización Matt](PROMUEVE_TICKETIZATION_REGISTER_20261011.md) documenta 61 issues nuevos (#674–#734), seis reutilizados y tres diferidos. Ningún issue de esta fase tiene status:approved ni ready-for-agent.

**Estado:** propuestas documentales locales; **NO son issues creados en GitHub ni autorizaciones para implementar**. Corte `promueve/nexus-v4@a3556b408e91c257c7cd2c829c575ff497c99745`, Atenea C-087. Fuente y adjudicación: [trazabilidad](PROMUEVE_REQUIREMENTS_TRACEABILITY_20261011.md), [cola principal](PROMUEVE_SHIPPING_BACKLOG_20261011.md).

## 1. Regla de apertura

Los **10 issues existentes** [#663–#672](PROMUEVE_SHIPPING_BACKLOG_20261011.md#3-primer-paquete-diez-issues-creados-en-una-única-tanda) cubren DOC-01, QA-FH-01/02, QA-RE-01/02, WO-RE-01, WO-FH-01/02, SPEC-F45-01 y SHAPING-N1-01. **No recrearlos.** El presente listado descompone los demás resultados en unidades atómicas, con dependencia y testigo mínimo. Estados:

- `READY_FOR_ISSUE_QA`: solo diagnóstico soportado, read-only; NO defecto sin reproducción.
- `READY_FOR_ISSUE_SPEC`: pregunta funcional/arquitectónica específica y salida documental; sin implementación.
- `SOURCE_OR_TEAM`: falta fuente clínica/institucional, la salida es obtener/adjudicar fuente, no una WO de código.
- `DEPENDENT`: crear solo después del cierre específico de una dependencia.
- `OPS_DECISION`: organización/protocolo/hospital; no atribuir automáticamente a Nexus.
- `DEFERRED`: inventariado, no issue ejecutable por defecto.

La prioridad por lote es **propuesta**, no aprobada. QA básica reutiliza checkers/fixtures ya publicados; interfaces alteradas requieren Chromium soportado y paso humano visual cuando sea material. Ningún elemento requiere Train de prueba sintético del arnés.

## 2. Farmacia — QA de flujo y seguridad (separadas de las dimensiones poblacionales)

| ID | Gate | Resultado acotado / rutas | Testigo de aceptación y NO TOCA |
| --- | --- | --- | --- |
| FH-QA-03 | READY_FOR_ISSUE_QA | Primera Visita: inducción solicitada vs realizada, tratamiento previo, fuente y estado. `farmacia_primera_visita.html`, script y read adapter | Con paciente sintético explícito, previo no genera START; falta de pauta queda vacía; sin rediseñar F4 |
| FH-QA-04 | READY_FOR_ISSUE_QA | Validación con fila Enfermería, servicio y patología correctos, campos completables. `farmacia_validacion.html`, JS y import v6 | Importación soportada con paciente sintético; no arrastra HS/Cosentyx/dosis demo; datos ausentes pendientes, no readonly artificial; no tocar catálogo |
| FH-QA-05 | READY_FOR_ISSUE_QA | Prebiológico: coherencia Inicio/Pendientes/Validación y procedencia importada | Misma solicitud y datos explícitos → estados y bloqueantes equivalentes, sin falsas validaciones; **no rehacer helper publicado** |
| FH-QA-06 | READY_FOR_ISSUE_QA | Multibiológico: elección de línea, seguimiento y EA vinculados a sospechosos explícitos. `farmacia_multitreatment_core.js` y `farmacia_seguimiento.js` | Dos líneas sintéticas simultáneas, una desconocida, export legible, sin inferir switch o add-on; no rehacer modelo completo |
| FH-QA-07 | READY_FOR_ISSUE_QA / SOURCE_OR_TEAM | Causalidad EA en Seguimiento vs residuos ocultos en Validación. `farmacia_seguimiento.js`, `farmacia_validacion.js` | Flujo soportado con ausencia y varios sospechosos; puntuación sólo con autoridad de cuestionario aprobada, no activar módulos legacy |
| FH-QA-08 | READY_FOR_ISSUE_QA | Cobertura de import Enfermería v6: campos realmente soportados, ausentes, variantes de hojas y recuperación | Checker/fixture sintético por versión, no afirmar paridad de Excel hospitalario sin autorización, no mutar import |
| FH-QA-09 | READY_FOR_ISSUE_QA | Morisky/adherencia y educación en Seguimiento respecto al informe S10 (solo campos existentes) | Con respuestas explícitas/ausentes verificar cálculo/etiquetas y registro; educación no se declara impartida automáticamente |
| FH-QA-10 | READY_FOR_ISSUE_QA | Separación demo/importado y manejo de fallo de almacenamiento en inicio/cambio paciente | Navegación real con datos sintéticos y fuente fallida; avisos veraces, no crear persistencia secundaria |
| FH-QA-11 | READY_FOR_ISSUE_QA | Profesionales Fármacos / usuario FH visibles: perfil/fuente real frente a demo | Captura actual soportada y estado no identificado; no simular permisos ni firma electrónica |
| FH-QA-12 | READY_FOR_ISSUE_QA | Acceso externo a estratificación SEFH vs registro de nivel FH (S1) | Clic al destino previsto, ausencia de transferencia clínica tácita, retorno/visita; **no construir segundo motor CMO** |

## 3. Farmacia — análisis poblacional SIL-REV-018 (una semántica por unidad)

Se preserva `currentCohort` única entre KPIs/tabla/CSV; criterios explícitos, intersección AND, cero resultados, desconocido ≠ negación/0. Ninguna línea histórica puede convertirse en activa por su nombre; si fuente/proyección no existe → `SOURCE_OR_TEAM`, no filtro falso.

| ID | Gate | Producto / superficie | Aceptación mínima / fuente bloqueante |
| --- | --- | --- | --- |
| FH-STAT-VAL | READY_FOR_ISSUE_SPEC | Validación explícita como filtro en `farmacia_estadisticas.js` y `farmacia_statistics_cohort.js` | Definir evento vs estado actual; negativo ausencia y CSV igual al cohort |
| FH-STAT-EA | READY_FOR_ISSUE_SPEC | Efectos adversos por severidad documentada | Distinguir EA presente, gravedad conocida, no reportado; sin asignar causalidad |
| FH-STAT-CAUS | SOURCE_OR_TEAM | Causalidad explícita por valoración/evidencia aprobada | Contrato y procedencia; no deducir a partir de EA o algoritmo sin fuente |
| FH-STAT-MOV | READY_FOR_ISSUE_SPEC | Movimiento terapéutico explícito | START/SWITCH/INTENSIFICACIÓN solo evento documentado; sin comparar visitas para inventarlo |
| FH-STAT-DOSE | READY_FOR_ISSUE_SPEC | Dosis/presentación como dimensión de línea | Solo texto/valor explícito; varias líneas y missing, nunca seleccionar medicamento para rellenar |
| FH-STAT-ROUTE | READY_FOR_ISSUE_SPEC | Vía declarada como filtro | Texto fuente/ausencia/versionado, sin completar por nombre |
| FH-STAT-SCHED | READY_FOR_ISSUE_SPEC | Pauta/frecuencia como filtro | Código vs label explícito, movimiento temporal vs línea; sin inferir pauta |
| FH-STAT-TIME | READY_FOR_ISSUE_SPEC | Ventana temporal de cohorte | Fechas clínicas frente a captura/import y límites inclusivos antes del writer |
| FH-STAT-CONCUR | READY_FOR_ISSUE_SPEC / SOURCE_OR_TEAM | Conteo 1/2/3 líneas activas simultáneas | Contrato temporal y validez de línea; no contar fármacos históricos |
| FH-STAT-DEMOG | SOURCE_OR_TEAM | Sexo/edad de cohorte raw | Raw hoy devuelve `sex:''` y `age:''`; fijar fuente/cálculo autorizado sin inventar sexo ni edad |
| FH-STAT-COMORB | SOURCE_OR_TEAM | Comorbilidades poblacionales raw | Catálogo y fuente explícitos, no extraer de CIMA ni de etiquetas |
| FH-STAT-ACT | SOURCE_OR_TEAM | Actividad/control clínico raw | Fuente clínica/control explícitos (raw `clinical_activity:null`), no algoritmo de control inventado |

**El filtro PROM de instrumento/valor** ya tiene issue #670; requiere decisión por escala, observación temporal, ausentes y contrato. **Principio activo registrado** ya publicado por Train28; no volver a crearlo.

## 4. Farmacia — casos funcionales y contratos clínicos

| ID | Gate | Resultado acotado | Aceptación y límites |
| --- | --- | --- | --- |
| FH-REN-N1 | DEPENDENT #672 | Bandeja renovaciones y entrega FH→Enfermería N1 | Solo fecha/origen/calidad/ventana aprobados, `not_evaluable` ante ausencia, un ciclo abierto por línea; N0 checker/oráculo previo, QA de ruta |
| FH-REN-N2 | DEPENDENT N1 / SOURCE_OR_TEAM | Excel Enfermería de retorno N2 | Layout versión y extras, roundtrip sintético, ausencia/no modificación de terapia por Enfermería |
| FH-REN-N3 | DEPENDENT N2 / SOURCE_OR_TEAM | Acto FH terminal N3 | Nueva validez/suspensión solo si consta acto autorizado, no cierre automático |
| FH-PICKUP | SOURCE_OR_TEAM | `PENDIENTE_RECOGIDA` con fecha/fuente/cadencia explícitas | Identificar no recogida según política, NO etiquetar como abandono/adherencia inferida |
| FH-ADDON | SOURCE_OR_TEAM | Primera dispensación del add-on: PV nueva línea vs Seguimiento | Decisión OCT-OPEN-004, evento explícito y validación; no presuponer nueva terapia |
| FH-NEOP | SOURCE_OR_TEAM | Seguimiento específico neoplasias asociadas temporalmente a línea | Preguntas del backlog junio: finalidad/variables/frecuencia/atribución/salida; **antecedente/riesgo actual no resuelve caso** |
| FH-MEDSPEC | SOURCE_OR_TEAM | Medicación extranjera/compasiva/ensayo/local | Fuente o captura profesional versionada, sin heurística catálogo |
| FH-CIMA-PRES | READY_FOR_ISSUE_SPEC / SOURCE_OR_TEAM | Propuestas editables por presentación seleccionada + contexto autorizado | Nunca escribir/sobrescribir desde nombre genérico; separar de CIMA auto-updates |
| FH-SES-NAMES | SOURCE_OR_TEAM | Programas/procesos FH con catálogo SES autorizado | Fuente institucional `service_id` y validación con equipo antes de filtros/import |
| FH-MP-COORD | OPS_DECISION / SOURCE_OR_TEAM | Prerrequisitos Preventiva en flujo FH ↔ Enfermería | Estado/autor del dato y tiempo de derivación; pauta completa ≠ autorización de inicio |
| FH-REPORT-PDF | ISSUE EXISTENTE [#597](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/597) | PDF real informes V1 | Motor/licencia aprobados; no etiquetar print-html como descarga PDF real |
| FH-REPORT-V2 | DEFERRED | Presets guardados/compartidos | Gobernanza V2, no bloquea informes Cosentyx/Kisqali ya publicados |
| FH-STORAGE | ANTES_PILOTO | FH-DEBT-001: retención/cifrado/borrado de import clínico en navegador | Política hospitalaria y QA por ciclo sin romper Inicio→Validación |

## 5. Reumatología — pendientes no cubiertos por #666–#668

| ID | Gate | Resultado acotado | Prueba/NO TOCA |
| --- | --- | --- | --- |
| RE-QA-PREV | READY_FOR_ISSUE_QA | Tratamientos previos, actuales y solicitados por fuente física | Caso sintético de tres hechos distintos; sin START/SWITCH por previo, Dashboard y Solicitud FH coherentes |
| RE-PCR-SITE | SOURCE_OR_TEAM | Defaults PCR BAD/MER/CAC | Confirmar fuente institucional versionada, luego default editable y test; NO se incluye en #668 |
| RE-BASFI | SOURCE_OR_TEAM | Instrumento BASFI en PV/Seguimiento EspA | Ítems/fórmula/permiso de fuente; BASDAI existente no rellena BASFI |
| RE-LES | SOURCE_OR_TEAM | Contrato clínico Lupus | Equipo decide datos y escala; no diseñar por analogía de AR |
| RE-SJOG | SOURCE_OR_TEAM | Contrato clínico Sjögren | Equipo decide campos/recorrido específicos; no una plantilla deducida |
| RE-LONG | DEFERRED | Evolución longitudinal PROM/QR | Fixture longitudinal actualizado + circuito y QA bajo prioridad; demo antigua no prueba bug |
| RE-DELIVERY | DEPENDENT F4.5 / #577 | Visit Act→destino real/Bridge, 497 como compatibilidad | Contrato de entrega/prueba sin lectura inversa ficticia |
| RE-STORAGE | ANTES_PILOTO · issue [#621](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/621) | Retención legacy browser y minimización | Política/QA negativa, sin purga masiva ni reintroducir recovery |
| RE-CAT | DEFERRED · issue [#450](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/450) | `search(query)` legacy sin categoría | Contrato explícito solo si consumidor real lo necesita |
| RE-SELECT | DEFERRED · issue [#570](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/570) | Polling `customSelect` de 300 ms | Caracterización/fix posterior, no bloquear clínica por coste no demostrado |

## 6. Nexus, Foundation y sitios (no convertir todo en un único Train)

| ID | Gate | Resultado acotado | Dependencia y evidencia |
| --- | --- | --- | --- |
| NX-F45-IMPL | DEPENDENT issue [#671](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/671) | Tipos DeliveryResult y adapter Excel sin alterar acto | Error/fail-closed, evidencia destino; export/copia ≠ persistido |
| NX-F46-MAP | DEPENDENT F4.5 | Mapping FHIR/openEHR sintético documental | Campos sin correspondencia, pérdida, versionado; no institucionalizar perfiles |
| NX-F61 | ANTES_PILOTO | Ciclo de vida de estado browser por categoría | FH-DEBT-001 y RE #621; continuidad, consentimiento institucional y borrado |
| NX-F62 | ANTES_PILOTO | Exposición URL/log de PHI | Allowlist no-PHI y pruebas negativas; no muestras reales |
| NX-F63 | ANTES_PILOTO | Vendor/dependencias/versiones/CSP | Licencia, origen/hash y perfil de conectividad real |
| NX-F7-BAD-FH | DEPENDENT ENTORNO | Qualificación BAD×Farmacia | Sitio, fuente, rutas, seguridad, outputs y QA propio; demo no equivale |
| NX-F7-BAD-RE | DEPENDENT ENTORNO | Qualificación BAD×Reuma | Misma regla propia sin heredar PASS de FH |
| NX-F7-CAC-FH | DEPENDENT ENTORNO | Qualificación CAC×Farmacia | Preservar snapshot Cáceres, recursos y permisos propios |
| NX-BRIDGE | ISSUE EXISTENTE [#577](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/577) | Entrada por patología/Excel físico frente a Processor raw relacional | Decisión de arquitectura, no router duplicado por defecto |
| NX-FARMATOOL | READY_FOR_ISSUE_SPEC / SOURCE_OR_TEAM | Instalación/versionado/interfaces de Farmatool/PreSalud para receta | Contrato fabricante/permisos, nada de automatización terminal sin entorno/autorización |
| NX-ORDEN | READY_FOR_ISSUE_SPEC | Salida textual segura para orden clínica, pegado manual | Campos mínimos explícitos, identidad/contexto, ausencia; no declarar escritura en HCE |
| NX-NURSING | READY_FOR_ISSUE_SPEC / SOURCE_OR_TEAM | Contrato de consumo y retorno Enfermería | Papel, paciente/servicio/sitio, ownership y seguridad; no backend precipitado |
| NX-DEBT-389 | DEFERRED · issue [#389](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/389) | Hallazgos bootstrap no bloqueantes | Reutilizar deuda original y gate real; no reabrir todo Foundation |
| NX-V5 | DEFERRED | Configurador multi-servicio y paciente universal | No en el roadmap inmediato V4 ni como refactor de estética |

## 7. Dermatología: vertical y solicitudes, separadas

| ID | Gate | Resultado | Prueba/gate clínico |
| --- | --- | --- | --- |
| DER-BASE | READY_FOR_ISSUE_SPEC / PRIORIDAD_HUMANA | Navegación, ownership y datos de módulo real Dermatología | No habilitar mosaico Home hasta qualification; gramática Reuma sin copiar contenido clínico |
| DER-HS | SOURCE_OR_TEAM | Vertical HS longitudinal | Campos IHS4/Hurley/PROs y flujo acordado con Derma; no módulo entero por analogía |
| DER-PSO | SOURCE_OR_TEAM | Vertical psoriasis longitudinal | Escalas/fuente/intervalos acordados; no inferir desde HS |
| DER-FH | READY_FOR_ISSUE_SPEC / SOURCE_OR_TEAM | Solicitud Derma→FH reconciliada desde plantilla histórica | Captura de tratamiento/pauta/inducción explícita; solicitado ≠ validado, nueva orden no automática |
| DER-VHB | SOURCE_OR_TEAM | Dos hechos vacunales diferenciados en circuito Derma | Pauta completa vs suficiencia para inicio autorizada por profesional, sin apto global inferido |
| DER-HAND | SOURCE_OR_TEAM | Eccema de manos | Entrada y seguimiento facilitados por equipo; sin vocabulario supuesto |

## 8. Circuitos operativos FH–Derma–Enfermería (NO tickets de código automáticos)

| ID | Gate | Resultado de organización | Testigo/estado |
| --- | --- | --- | --- |
| OPS-QR-CITA | OPS_DECISION | Tarjetas QR/correo clasificado/cambio cita (S2) | Verificar si se entregaron, cuenta/destino institucional, mantenimiento; sin duplicar app |
| OPS-QR-EDUC | OPS_DECISION | Material de educación/póster QR Escuela Pacientes (S7) | Validación contenidos y URL, aprobación servicio; no prometer seguimiento digital |
| OPS-PREMS | OPS_DECISION / SOURCE_OR_TEAM | PREMs institucional desde Microsoft Forms (S6) | Cuenta, tratamiento de datos y cuestionario; informe v5 pendiente, no integrado |
| OPS-DIGEST | OPS_DECISION | Traslación aprendizaje Digestivo/Calidad (S4) | Acta/acuerdo roles y preventivo, no inventar reglas |
| OPS-AGENDA | OPS_DECISION | Huecos colchón y bloques agenda FH (S12) | Aprobación servicio y piloto operativo, no implementar agenda informática |
| OPS-CITAS | OPS_DECISION | Protocolo cambios Admisiones–Dermatología–FH (S9) | Destinatarios y actuación ante cambio; no escribir agenda sin API |
| OPS-FEEDBACK | OPS_DECISION / READY_FOR_ISSUE_SPEC | Handoff bidireccional clínico en momentos útiles (S13) | Quién firma/envía/recibe, hechos explícitos, error y retorno; sin concluir eficacia |
| OPS-PATIENT | OPS_DECISION | Información y educación terapéutica (S2/S7/P11) | Herramientas existentes y material validado; no afirmar visita completada por QR |
| OPS-PREVENT | OPS_DECISION | Medicina Preventiva como cuello de botella (P3) | Reglas de derivación/resultado y responsabilidad del equipo; no inferir pauta vacunal |
| OPS-FARMATOOL | OPS_DECISION / SOURCE_OR_TEAM | Audit de capacidades dormidas FarmaTools (S11) | Versión/config/vendor/institución; usar NX-FARMATOOL para interfaz digital si procede |
| OPS-METRICS | OPS_DECISION | Indicadores de proceso/impacto PROMueve FHs | Denominadores/ventanas y fuentes aprobadas; cifras objetivo históricas no son QA de producto |
| OPS-SWITCH | OPS_DECISION / SOURCE_OR_TEAM | Reducir duplicidad en cambio de tratamiento (P12) | No reutilizar validación anterior como autorización de nueva línea; contrato separado |

## 9. Orden de conversión futura (sin creación de issues en este entregable)

1. **QA con evidencia disponible**: FH-QA-03/04/05/06/08/09, RE-QA-PREV y los issues QA #664/#665/#667. #666 requiere oráculo clínico. No reabrir defectos antes del recorrido real.
2. **Micro-WOs ya acotadas**: #668 PCR UI sin defaults y #669 presentación Cosentyx, sólo cuando se seleccione prioridad.
3. **Especificación por dimensión del análisis FH**: FH-STAT-VAL / EA / MOV / DOSE / ROUTE / SCHED y PROM #670; **fuentes primero** para CAUS/DEMOG/COMORB/ACT.
4. **Producto con dependencia**: N1 #672 → FH-REN-N1/N2/N3; F4.5 #671 → NX-F45-IMPL → entrega Reuma/FH; Bridge #577.
5. **Clínica/ops institucional**: RE-BASFI, RE-LES/RE-SJOG, FH-NEOP, DER-HS/PSO/DER-FH, S6/S9/S13 bajo decisión del equipo. No mezclar con programa de correcciones urgentes.
6. **Antes de piloto**: F6, F7 por sitio/módulo, privacidad FH/RE. V5 y ampliación genérica quedan deferidos.

**Política común para cada futura WO:** objetivo y contexto, HEAD live, preflight/worktree limpio, reversión, rutas exactas, NO TOCA, test/QA focal, criterio de aceptación y STOP de publicación. Corrección diagnosticada → instrucción prescriptiva C-087, no segunda investigación. Ninguna propuesta admite inferencia de dosis, ruta, pauta, inducción, vigencia, switch/add-on, estado de validación, respuesta ni consentimiento.
