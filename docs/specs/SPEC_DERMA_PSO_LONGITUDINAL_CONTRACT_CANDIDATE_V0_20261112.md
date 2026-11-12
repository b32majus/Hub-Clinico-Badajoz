# DER-PSO #728 · Contrato longitudinal candidato de psoriasis para DermaNEXus

**Estado:** PROPUESTA CLÍNICO-FUNCIONAL / LOCAL / NO HOMOLOGADA / NO IMPLEMENTADA / NO APTA PARA PILOTO. **Fecha:** 2026-11-12. **Base de diseño:** `promueve/nexus-v4@0696c8acf697c884dbb2d34be850a2f1c61e205e`.
**Titularidad:** Dermatología debe validar los datos, versiones de escalas, cálculos, acciones y criterios de evaluación. Esta propuesta no es el contrato donante PSO-07 aprobado de Valme: su QA humano sigue pendiente.

**Fuentes Nexus (autoridad vigente):** [#697, primer recorrido común](SPEC_DERMA_BASE_PSO_FIRST_V0_20261112.md); [reconciliación publicada](../ops/PROPUESTA_DERMATOLOGIA_PSO_NEXUS_RECONCILIACION_20261112.md); [decisiones de producto del 03-10](../ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md); [issue #728](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/728).
**Fuentes Valme (evidencia donante, NO autoridad clínica Nexus):** [plan maestro F2/PSO-07](https://github.com/b32majus/Hub-Clinico-PsO-Valme/blob/work/pso-valme-train-c-20260930/docs/plans/PSO_VALME_TO_PROMUEVE_DERMATOLOGY_MASTER_PLAN_20260928.md), [auditoría inicial](https://github.com/b32majus/Hub-Clinico-PsO-Valme/blob/work/pso-valme-train-c-20260930/docs/audits/PSO_VALME_INITIAL_AUDIT_20260928.md), [caracterización V1/V2](https://github.com/b32majus/Hub-Clinico-PsO-Valme/blob/work/pso-valme-train-c-20260930/docs/audits/PSO_DASHBOARD_V1_V2_CHARACTERIZATION_20260928.md), [QA de Train-C](https://github.com/b32majus/Hub-Clinico-PsO-Valme/blob/work/pso-valme-train-c-20260930/docs/qa/TRAIN_C_MANUAL_QA_HANDOFF_20260930.md), `Guia_Operativa_Psoriasis_Valme.docx` en el repo Valme. La guía describe un comportamiento deseado, no acredita su aprobación actual.

## 1. Recorrido y entidad clínica (acordado para el módulo, no para cada escala)

**Navegación común:** `Nexus Home → DermaNEXus → Primera Visita / Seguimiento → patología seleccionada explícitamente: Psoriasis → secciones específicas PsO → historia`. Menú por **circuito**, nunca por patología. Con HS futura, se reutiliza el mismo circuito con otro contrato clínico y sin crear submódulos separados.

**Entidades candidatas:** `PacienteDerma` (identidad acotada por `siteId`/módulo, sin paciente universal), `VisitaDerma` (ID estable nuevo; no inferido de la posición de fila, más tipo y fecha clínica), `PatologiaDeVisita` (selección `pso` documentada), `EvaluacionPsO` (cuestionarios, completitud y fuente), `TratamientoDocumentado`, `AccionClinicaExplicita`. No son nombres de objetos de código ni esquema aprobado.

**Reglas:** la existencia de otra visita o de un NUSHA en Valme **no decide** automáticamente Primera Visita/Seguimiento ni el diagnóstico en Nexus. Las respuestas por visita son independientes. Una visita existente restaura su propia patología, no la más reciente de otra. Datos existentes quedan protegidos ante cambio de patología o paciente; no hay guardado, descarte ni cambio silencioso.

## 2. Matriz de información: evidencia donante frente a decisión clínica pendiente

| Grupo | Observable en Valme (fuente donante) | Contrato candidato Nexus / pendiente del equipo |
| --- | --- | --- |
| Identidad, procedencia y visita | `nusha`, fecha/tipo de visita, procedencia; guía distingue primera visita y seguimiento | ID de paciente/visita propios, site, autor/fuente, fecha de acto vs fecha de importación; definición institucional pendiente. No adoptar NUSHA como clave universal |
| Perfil y enfermedad | Fenotipo, curso evolutivo, historia de psoriasis | Qué campos son estables o reevaluables y en qué visita; fuente, catálogo y obligatoriedad por validar |
| Actividad médica | PASI, BSA, PGA | Instrumento/versión, unidades, ítems, fórmula, completitud, rango y vigencia **a validar por Dermatología**; sin umbrales de control copiados |
| Resultados comunicados por paciente | DLQI; síntomas como EVA de prurito y dolor | Escala, versión, periodización, interpretación y destinatario por validar; no fabricar un resultado con respuestas parciales |
| Cribado y adherencia | PURE-4 y Morisky aparecen en formulario/guía | Confirmar versión, ámbito, derechos de uso y reglas de interpretación; screening positivo ≠ derivación efectuada |
| Exploración y contexto | Localizaciones, zonas especiales, afectación ungueal, comorbilidades | Diccionario PsO, fecha/visita de observación, estado desconocido/no explorado y autorización clínica |
| Tratamiento | Familias de tratamientos; capturas primera/seguimiento, fármaco y posología en Valme | Separar previo, vigente documentado y solicitado a FH. NO deducir dosis, pauta, duración, inducción, START/SWITCH ni validación desde fármaco o historia |
| Derivación/decisión | `derivacion_derma_reuma`, seguimiento y ajustes declarados | Motivo/sospecha/cribado, decisión, solicitud y derivación **realizada** son hechos distintos; solo registrar acción explicitada por profesional |
| Longitudinalidad | Filas de visita, historial y cuadro individual V2 | Orden temporal por fecha clínica validada + ID estable; una visita futura/fecha inválida no es «visita previa»; datos por patología y paciente |
| Poblacional | Cohortes, últimos registros, filtros de tratamiento/control, KPIs | Delimitar visitas elegibles de PsO y ventana temporal → último estado por paciente → filtros de estado actual. Denominador total y evaluable separados; ninguna categoría de control legacy queda aprobada |

**Regla de evidencia:** los grupos anteriores acreditan **presencia en un prototipo y/o pruebas técnicas**, no validez médica de fórmulas, campos, cortes, respuestas terapéuticas ni transferencia de esquema de 174 columnas. `psoriasis_valme_base_longitudinal.xlsx` usa 124 columnas distintas y falla cerrado ante el esquema dashboard `nusha`; no se usa como contrato ni fuente maestra Nexus.

## 3. Ausencia, tiempo, seguridad y resultados

- **Missingness:** instrumento sin respuestas = `pendiente/no evaluable`; parcial = `incompleto`, sin total clínico válido; cumplimentado con resultado cero = **cero legítimo**; `No`, `No aplica`, `Desconocido` y vacío se distinguen donde el instrumento exija esos estados. Los tests Valme certifican técnicamente PASI/DLQI/PURE-4, **no validan fórmulas clínicas para Nexus**.
- **Escritura:** editar ≠ guardar; exportar/copiar ≠ persistir. Un resultado de acto incluye estado explícito de confirmación/error y provenance, sin fingir usuario autenticado o backend hospitalario.
- **Seguimiento:** la guía Valme recomienda precargar historia/comorbilidades/localizaciones/tratamiento y reevaluar PASI, BSA, PGA, síntomas, DLQI, PURE-4 y Morisky. En Nexus la **lista de campos precargables y vigencia** debe aprobarse; ninguna precarga sobrescribe dato de la visita ni procede de una visita futura.
- **Cohorte:** un registro anterior no puede «resucitar» un paciente en un filtro del estado actual; una fecha inválida no se convierte en hoy ni un empate temporal se resuelve por orden físico XLSX. El control `rojo/verde/intermedia` de Valme y sus umbrales **no** son política Nexus sin firma clínica.
- **Seguridad clínica:** no establecer tratamiento ni derivación automática por score, catálogo, formulario incompleto o histórico. La acción Dermatología→FH pertenece a #698; solicitado ≠ validado. Datos exclusivamente sintéticos en diseño y QA.

## 4. Criterios verificables para la futura implementación (8)

1. El profesional entra por **Primera Visita o Seguimiento**, elige `Psoriasis` dentro de la visita y obtiene solo secciones PsO; ni HS ni otras patologías se simulan como operativas. El selector vacío no precarga campos PsO.
2. La visita registra identidad paciente/visita/site, patología, tipo, fecha clínica y provenance explícitos; la misma persona puede tener diferentes patologías sin mezclar sus episodios. Identidad desconocida impide atribución del acto; fecha no informada queda pendiente y **no se usa para ordenación clínica** ni se sustituye por hoy. El resultado de escritura depende del contrato de acto aprobado.
3. PASI, DLQI y PURE-4 con ningún ítem, parcial y completo cero conservan tres estados distintos; sin puntuación inválida ni interpretación clínica por defecto. BSA, PGA, Morisky y EVA quedan sujetas a su contrato de escala firmado.
4. Un seguimiento recupera solo hechos elegibles anteriores al acto; nunca valores de fecha futura ni campos de otra patología. Reabrir una visita restaura su estado original y un cambio de paciente ignora resultados async desactualizados.
5. Cambiar la patología mientras haya datos editados no pierde ni traslada campos, ni crea actos nuevos implícitos. En tanto el comportamiento exacto no esté aprobado, el cambio se **bloquea explícitamente** con estado seguro.
6. Tratamiento previo, solicitado, actual registrado y validado FH no se equiparan. Ningún nombre de fármaco/importación escribe automáticamente dosis, vía, pauta, inducción, duración, switch, renovación ni causalidad.
7. PURE-4/cribado, sospecha, decisión de derivación y derivación ejecutada se presentan separadas: ninguna respuesta positiva marca una acción realizada. Los datos ausentes no generan decisiones o categorías de control.
8. QA con datos sintéticos demuestra estados vacíos/parciales, cambio paciente/patología, fechas futuras/incorrectas, cohorte actual vs histórica, denominador de evaluables, errores y consola en **interacciones soportadas**. Tests verdes ≠ QA humano ≠ qualification hospital×módulo ≠ piloto.

## 5. Pendientes de validación clínica y decisión de producto

**Dermatología (autoridad clínica):** confirmar conjunto obligatorio/opcional por Primera Visita y Seguimiento; versiones, ítems, interpretaciones y licencia de PASI/BSA/PGA/DLQI/PURE-4/Morisky/EVA; comorbilidades/localizaciones; qué se puede precargar; definición de control/evaluable y acciones de derivación. Registrar fuente versionada, profesional responsable y fecha de aprobación. **No declarar resolución por existencia en Valme**.

**Producto/SES:** identidad institucional y provenance del acto, capacidad real de guardar/reabrir, manejo explícito de múltiples patologías y cambios con edición, site de demo y qualification; frontera con Farmacia (#698/#729). Sin paciente universal, form-builder ni reglas clínicas runtime en configuración. La decisión final sobre el tipo de visita nunca se obtiene solo de una visita anterior.

**Gate:** esta spec candidata permite diseñar oráculos y discutir con el equipo sin abrir HTML antiguos, pero **no satisface todavía la aprobación clínica requerida por #728**. PSO-07 Valme sigue con QA humano pendiente; no alterar ni completar su gate desde Nexus. **NO TOCA:** código, datos, formularios, Home, Reuma, Farmacia, Valme, HS, `main`, despliegue ni publicación sin nuevo GO.
