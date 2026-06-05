# Plan formativo y protocolo de decisiones por fase — Hub Clínico

**Fecha:** 2026-06-05  
**Versión:** 1.0  
**Proyecto:** Hub Clínico Reumatología — Badajoz / PROMueve Extremadura  
**Propósito:** Guiar cómo Sil y Cora aprenden, deciden y documentan en cada fase natural del proyecto Hub Clínico.

---

## 1. Propósito del documento

Este documento define **cómo aprender, decidir y documentar** en cada fase del Hub Clínico. No es un curso de programación, no es documentación técnica del código, no sustituye a `ARCHITECTURE.md` ni a `docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`.

Es un **protocolo de toma de decisiones y aprendizaje aplicado** que:

- Ayuda a Sil a aprender lo mínimo crítico para decidir bien en cada fase.
- Evita estudiar programación en abstracto.
- Evita que los agentes tomen decisiones clínicas, funcionales o estratégicas.
- Sirve para orientar a Hermes, OpenCode y Claude Code sobre qué pueden preparar y qué no deben decidir.
- Organiza el avance del proyecto en fases naturales con condiciones de salida claras.

---

## 2. Principio general

| Principio | Descripción |
|-----------|-------------|
| **Disparador** | El protocolo se activa al entrar en una nueva fase natural del proyecto, no por dudas aisladas. |
| **Dudas** | Las dudas se registran dentro de la fase correspondiente, pero no son el disparador principal. |
| **Aprendizaje aplicado** | Sil no necesita aprender programación en abstracto. Necesita entender lo mínimo crítico para decidir bien cada fase. |
| **Cada aprendizaje se aplica al Hub** | No hay ejercicios genéricos. Todo concepto se aprende sobre el caso real. |
| **Decisiones documentadas** | Cada decisión relevante debe quedar registrada en el documento canónico correspondiente. |
| **Condición de salida** | Cada fase debe tener una condición de salida clara antes de pasar a la siguiente. |
| **Condición de parada** | Cada fase debe tener condiciones que detengan el avance si aparece un riesgo no resuelto. |

---

## 3. Patrón de trabajo por fase

Cada fase sigue este patrón estándar:

| # | Elemento | Descripción |
|---|----------|-------------|
| 1 | **Fase del proyecto** | Nombre y número de fase |
| 2 | **Objetivo de la fase** | Qué se consigue al completarla |
| 3 | **Por qué esta fase importa** | Contexto y motivación |
| 4 | **Conceptos mínimos que Sil debe entender** | Aprendizaje mínimo necesario para decidir |
| 5 | **Decisiones que deben tomar Sil/Cora** | Preguntas que solo ellas pueden responder |
| 6 | **Dudas abiertas de la fase** | Preguntas aún no resueltas |
| 7 | **Aplicación concreta al Hub** | Cómo se aplica lo aprendido al proyecto real |
| 8 | **Qué puede preparar Hermes/OpenCode** | Materiales y borradores permitidos |
| 9 | **Qué NO puede decidir un agente** | Límites de delegación |
| 10 | **Entregable esperado** | Documento o artefacto que produce la fase |
| 11 | **Documento donde registrar la decisión** | Ubicación canónica |
| 12 | **Condición de salida** | Qué debe cumplirse para avanzar |
| 13 | **Condición de parada** | Qué detiene el avance hasta resolverlo |

---

## 4. Fases formativas del Hub Clínico

---

### Fase 0 — Documentación canónica y arquitectura funcional

**Estado:** ✅ Completada con WO-013/013b. Pendiente de revisión continua.

| Elemento | Descripción |
|----------|-------------|
| **Objetivo** | Tener documentación canónica alineada que gobierne el trabajo de agentes y humanos. |
| **Por qué importa** | Sin documentos fuente de verdad, los agentes improvisan y las decisiones se pierden. |
| **Conceptos mínimos** | Diferencia entre README, ARCHITECTURE, docs/ops, decisiones y contratos. Diferencia entre documentación viva y legacy. Por qué la documentación canónica gobierna a los agentes. |
| **Decisiones Sil/Cora** | Qué documentos son fuente de verdad. Qué documentos no deben usarse como base de implementación. |
| **Qué prepara Hermes** | Índices, inventarios, mapas, auditorías, snapshots documentales. |
| **Qué NO hace Hermes** | Cambiar el significado del producto sin revisión. |
| **Entregables** | README alineado, ARCHITECTURE actualizado, arquitectura funcional v2.1, índice documental. |
| **Condición de salida** | README y ARCHITECTURE no contradicen el estado real. Toda WO documental tiene estado claro. |
| **Condición de parada** | Si la documentación introduce contradicciones con decisiones previas. |

---

### Fase 1 — Diseño funcional de Enfermería y Farmacia

**Estado:** ⏸️ Pendiente de completar por Sil/Cora. Canvas creado (WO-010), no validado.

| Elemento | Descripción |
|----------|-------------|
| **Objetivo** | Definir qué necesita cada perfil (Enfermería, Farmacia) antes de traducirlo a campos, layouts y contratos. |
| **Por qué importa** | Sin diseño funcional validado, los contratos serán especulación y la implementación será errónea. |
| **Conceptos mínimos** | Diferencia entre formulario, contrato, fuente de datos, dashboard, timeline y alerta. Diferencia entre ver datos y escribir datos. Diferencia entre perfil funcional y permiso real. |
| **Decisiones Sil/Cora** | Qué ve Enfermería. Qué escribe Enfermería. Qué NO toca Enfermería. Qué ve Farmacia. Qué escribe Farmacia. Qué NO toca Farmacia. Qué genera timeline. Qué genera alerta. Qué alimenta dashboard. |
| **Qué prepara Hermes** | Canvas, tablas vacías, checklists, síntesis de decisiones. |
| **Qué NO hace Hermes** | Inventar campos clínicos definitivos. Crear contratos definitivos. Implementar formularios. |
| **Entregables** | Canvas completado por Sil/Cora. Decisiones funcionales documentadas. Criterios para pasar a contratos. |
| **Condición de salida** | Canvas de Enfermería y Farmacia completado y validado por Sil/Cora. |
| **Condición de parada** | Si aparecen dudas clínicas, de responsabilidad, visibilidad o escritura cruzada. |

---

### Fase 2 — Modelo de datos y contratos

**Estado:** ⏸️ Bloqueada hasta completar Fase 1.

| Elemento | Descripción |
|----------|-------------|
| **Objetivo** | Definir contratos documentales reales para Enfermería y Farmacia a partir del canvas validado. |
| **Por qué importa** | Los contratos son la especificación que guía la implementación. Sin ellos, el código será adivinatorio. |
| **Conceptos mínimos** | Diferencia entre campo de formulario, dato precargado, dato escrito, dato derivado y evento longitudinal. Diferencia entre Excel MVP y modelo de datos futuro. Por qué los contratos se derivan del uso asistencial, no al revés. |
| **Decisiones Sil/Cora** | Campos mínimos por perfil. Campos obligatorios/opcionales. Campos calculados. Identificador común. Relación entre eventos y visitas. Qué se mantiene fuera del MVP. |
| **Qué prepara Hermes/OpenCode** | Borradores documentales de contratos a partir del canvas validado. Tablas de mapeo. Checklist de validación. |
| **Qué NO hacer** | Usar WO-002 como contrato definitivo. Diseñar contratos antes del canvas validado. |
| **Entregables** | Contratos documentales reales v1. Matriz campo → origen → destino → visibilidad. Criterios de implementación. |
| **Condición de salida** | Contratos revisados y aprobados por Sil/Cora. |
| **Condición de parada** | Si faltan decisiones de formulario o validación clínica. |

---

### Fase 3 — Roles, perfiles y permisos

**Estado:** ⏸️ Bloqueada hasta completar Fase 2.

| Elemento | Descripción |
|----------|-------------|
| **Objetivo** | Definir perfiles funcionales para la demo del 8 de julio sin confundirlos con seguridad real. |
| **Por qué importa** | La demo debe mostrar perfiles diferenciados sin prometer un sistema productivo seguro. |
| **Conceptos mínimos** | Perfil funcional ≠ autenticación real. Interfaz visible ≠ permiso robusto. MVP local-first ≠ sistema productivo seguro. |
| **Decisiones Sil/Cora** | Perfiles necesarios para demo. Qué pantallas ve cada perfil. Qué acciones puede ejecutar cada perfil. Qué queda fuera hasta v3. |
| **Qué prepara Hermes/OpenCode** | Matrices de perfiles. Documentos de visibilidad. Propuestas de navegación. |
| **Qué NO hacer** | Implementar seguridad real falsa. Prometer cumplimiento productivo. Crear autenticación improvisada. |
| **Entregables** | Matriz de perfiles funcionales. Reglas de visibilidad MVP. Limitaciones explícitas para SES/informática. |
| **Condición de salida** | Matriz aprobada por Sil/Cora. |
| **Condición de parada** | Si se confunde demo funcional con seguridad real. |

---

### Fase 4 — Trazabilidad y ciclo de vida del dato

**Estado:** ⏸️ Bloqueada hasta completar Fase 2.

| Elemento | Descripción |
|----------|-------------|
| **Objetivo** | Definir quién crea, modifica, visualiza y deriva cada dato en el sistema. |
| **Por qué importa** | Sin trazabilidad clara, la visión longitudinal y las alertas no funcionan de forma fiable. |
| **Conceptos mínimos** | Quién crea un dato. Quién lo modifica. Quién lo visualiza. Qué se deriva. Qué queda como evento. Qué no debe persistirse. |
| **Decisiones Sil/Cora** | Eventos de timeline. Alertas. Trazas mínimas MVP. Trazabilidad futura v3. |
| **Qué prepara Hermes** | Mapas de ciclo de vida del dato. Matrices de origen/destino. Riesgos. |
| **Qué NO hacer** | Definir trazabilidad legal/productiva definitiva. |
| **Entregables** | Mapa de ciclo de vida del dato. Matriz de eventos. Criterios para timeline integrada. |
| **Condición de salida** | Eventos y flujos validados por Sil/Cora. |
| **Condición de parada** | Si no está claro quién escribe o quién debe ver cada dato. |

---

### Fase 5 — Backend-ready / hardening v2.2

**Estado:** ⏸️ Bloqueada hasta completar Fase 2 (pueden solaparse tareas que no comprometan la demo).

| Elemento | Descripción |
|----------|-------------|
| **Objetivo** | Preparar la app para evolucionar a backend real sin romper el MVP actual. |
| **Por qué importa** | El MVP local-first es viable para el piloto, pero hay que reducir deuda técnica antes de escalar. |
| **Conceptos mínimos** | Qué es un diccionario clínico. Qué es una capa repository. Qué es validación de plantillas. Qué significa separar demo de piloto. Por qué no hace falta migrar a React antes de tiempo. |
| **Decisiones Sil/Cora** | Qué mejoras preparan v3 sin romper MVP. Qué deuda técnica se acepta temporalmente. Qué se prioriza antes/después del 8 de julio. |
| **Qué hace Hermes/OpenCode** | Especificaciones técnicas. Checklists. Tareas de refactor acotado. Validadores documentados. |
| **Qué NO hacer** | Reescribir la app. Migrar a framework sin decisión explícita. Romper la demo. |
| **Entregables** | Plan backend-ready. Diccionario clínico v0. Especificación repository layer. Validación de plantillas. |
| **Condición de salida** | Plan técnico aprobado y dividido en work orders amarillas. |
| **Condición de parada** | Si la mejora amenaza la estabilidad del MVP. |

---

### Fase 6 — Dossier SES / informática / DPO

**Estado:** ⏸️ Pendiente de planificar. Depende del resultado de la demo.

| Elemento | Descripción |
|----------|-------------|
| **Objetivo** | Preparar la comunicación institucional del proyecto a SES, informática y DPO. |
| **Por qué importa** | El Hub necesita apoyo institucional para evolucionar de demo a piloto real. |
| **Conceptos mínimos** | Diferencia entre demo, piloto, POC, producción. Límites de datos sintéticos. Límites de Excel. Seguridad real futura. Interoperabilidad futura. |
| **Decisiones Sil/Cora** | Narrativa institucional. Riesgos transparentes. Qué se pide al SES/informática. Qué se ofrece como innovación asistencial. Qué se puede financiar o soportar con externo. |
| **Qué prepara Hermes** | Borradores de dossier. Mapas. Anexos técnicos. Glosario. Tabla de riesgos. |
| **Qué NO hacer** | Prometer cumplimiento RGPD/ENS/seguridad sin validación experta. Escribir como si fuera sistema productivo. |
| **Entregables** | Dossier institucional. Anexo técnico. Matriz de riesgos. Propuesta de evolución. |
| **Condición de salida** | Dossier revisado por Sil/Cora. |
| **Condición de parada** | Si se entra en afirmaciones legales, seguridad o protección de datos no validadas. |

---

## 5. Tabla resumen de fases

| Fase | Objetivo | Aprendizaje mínimo | Decisiones Sil/Cora | Delegable a Hermes/OpenCode | No delegable | Entregable | Condición de salida |
|------|----------|-------------------|---------------------|---------------------------|--------------|------------|---------------------|
| **F0** Doc canónica | Alinear docs | README vs ARCH vs docs/ops vs contratos | Qué es fuente de verdad | Índices, inventarios, mapas | Cambiar significado del producto | Docs alineados | Sin contradicciones |
| **F1** Diseño funcional | Definir Enfermería/Farmacia | Formulario vs contrato vs fuente vs timeline | Qué ve/escribe cada perfil | Canvas, tablas, checklists | Inventar campos definitivos | Canvas validado | Canvas completado |
| **F2** Contratos | Especificar datos | Campo vs precarga vs derivado vs evento | Campos mínimos, obligatorios, calculados | Borradores desde canvas | Usar WO-002 como fuente | Contratos v1 | Aprobados por Sil/Cora |
| **F3** Perfiles | Roles demo | Perfil funcional ≠ auth real | Pantallas y acciones por perfil | Matrices, propuestas | Seguridad falsa | Matriz aprobada | Aprobación |
| **F4** Trazabilidad | Ciclo del dato | Quién crea/modifica/ve/deriva | Eventos, alertas, trazas | Mapas, matrices, riesgos | Trazabilidad legal | Mapa de ciclo | Eventos validados |
| **F5** Hardening | Preparar v3 | Diccionario, repository, validación | Qué mejorar sin romper MVP | Especificaciones, refactor | Reescribir app | Plan técnico | Aprobado en WOs |
| **F6** Dossier SES | Comunicación institucional | Demo vs piloto vs producción | Narrativa, riesgos, peticiones | Borradores, anexos | Prometer cumplimiento | Dossier | Revisado por Sil/Cora |

---

## 6. Dudas abiertas por fase

| Fase | Duda | Impacto | Cómo resolverla | Quién decide | Documento |
|------|------|---------|-----------------|--------------|-----------|
| F1 | ¿Qué diferencia hay entre perfil funcional y permiso real? | Arquitectura y expectativas | Leer Fase 3 de este protocolo | Sil/Cora | `ARQUITECTURA_FUNCIONAL` |
| F1 | ¿Qué datos debe ver Enfermería? | Contratos, formularios, dashboard | Rellenar canvas WO-010 | Sil/Cora | Canvas (WO-010) |
| F1 | ¿Qué datos debe escribir Farmacia? | Contratos, fuentes, permisos | Rellenar canvas WO-010 | Sil/Cora | Canvas (WO-010) |
| F2 | ¿Qué es un evento longitudinal? | Timeline, alertas, trazabilidad | Leer Fase 4 y `ARQUITECTURA_FUNCIONAL` | Sil/Cora | Contratos v1 |
| F2 | ¿Qué debe quedar en Excel y qué debe ser derivado? | Arquitectura MVP vs futura | Analizar flujos actuales (`MAPA_FLUJOS`) | Sil/Cora | Contratos v1 |
| F5 | ¿Cuándo pasar de Excel a BD? | Roadmap técnico | Evaluar después del 8 de julio | Sil + SES | Plan técnico v2.2 |
| F6 | ¿Qué puede presentarse al SES como demo y qué no? | Estrategia, riesgos, imagen | Definir narrativa con Sil/Cora | Sil/Cora | Dossier SES |

---

## 7. Tabla de delegación

| Tipo de tarea | Hermes | OpenCode | Sil/Cora | Experto externo | Riesgo |
|---------------|--------|----------|----------|-----------------|--------|
| Índices documentales | ✅ Preparar | ❌ | ✅ Revisar | ❌ | 🟢 Verde |
| Inventarios técnicos | ✅ Preparar | ❌ | ✅ Revisar | ❌ | 🟢 Verde |
| Mapas de flujos | ✅ Preparar | ❌ | ✅ Revisar | ❌ | 🟢 Verde |
| Check lists | ✅ Preparar | ❌ | ✅ Revisar | ❌ | 🟢 Verde |
| Borradores documentales | ✅ Redactar | ❌ | ✅ Validar | ❌ | 🟢 Verde |
| Canvas de diseño | ✅ Preparar tabla | ❌ | ✅ Rellenar | ❌ | 🟡 Amarillo |
| Contratos documentales | ⏸️ Solo desde canvas validado | ❌ | ✅ Decidir y validar | ❌ | 🟡 Amarillo |
| Código funcional acotado | ❌ | ✅ Bajo WO | ✅ Revisar | ❌ | 🟡 Amarillo |
| Arquitectura funcional | ❌ | ❌ | ✅ Decidir | ❌ | 🔴 Rojo |
| Formularios clínicos | ❌ | ❌ | ✅ Diseñar | ❌ | 🔴 Rojo |
| Contratos definitivos | ❌ | ❌ | ✅ Decidir | ❌ | 🔴 Rojo |
| Estrategia institucional | ❌ | ❌ | ✅ Decidir | Puede asesorar | 🔴 Rojo |
| Seguridad real / RGPD / ENS | ❌ | ❌ | ❌ | ✅ Informática/DPO | 🔴 Rojo |
| Integración hospitalaria | ❌ | ❌ | ❌ | ✅ SES/STIC | 🔴 Rojo |
| Despliegue productivo | ❌ | ❌ | ❌ | ✅ SES/STIC | 🔴 Rojo |

---

## 8. Registro de decisiones

Cada tipo de decisión se registra en su documento canónico:

| Tipo de decisión | Documento |
|-----------------|-----------|
| Decisiones estratégicas y de evolución del proyecto | `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md` (o futuro equivalente) |
| Estado de work orders | `docs/ops/WORK_ORDER_STATUS.md` |
| Arquitectura técnica | `ARCHITECTURE.md` |
| Arquitectura funcional | `docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md` |
| Diseño de formularios | Documento derivado del canvas de cada perfil |
| Contratos de datos | `docs/contratos/*` (solo cuando estén validados por Sil/Cora) |

---

## 9. Condiciones generales de parada

El avance del proyecto debe detenerse y escalarse a Sil/Cora si aparece cualquiera de estas condiciones:

1. **Campos clínicos definitivos** — una tarea exige decidir campos clínicos sin validación previa.
2. **Cambio arquitectónico** — una tarea modifica la arquitectura definida en `ARCHITECTURE.md` o `ARQUITECTURA_FUNCIONAL`.
3. **Seguridad, RGPD, ENS o datos reales** — una tarea puede afectar a protección de datos, seguridad o normativa.
4. **Canvas a contrato sin revisión** — una tarea convierte un borrador exploratorio en contrato sin validación de Sil/Cora.
5. **Backend, autenticación o integración externa** — una tarea introduce dependencias de infraestructura no planificadas.
6. **Código funcional sin WO amarilla** — una tarea requiere modificar código funcional sin una work order de nivel amarillo.
7. **Ambigüedad clínica o funcional** — una tarea encuentra un vacío de decisión no documentado.

---

## 10. Relación con el estado actual del proyecto

Este documento se publica después de completar la Fase 0 (documentación canónica alineada vía WO-013/013b). El estado actual del proyecto en relación con las fases es:

| Elemento | Estado |
|----------|--------|
| WO-002 | ⏸️ **Pausada / No mergear.** Los contratos en `docs/contratos/` son exploratorios. Pendiente de completar Fase 1 (canvas) y Fase 2 (contratos validados). |
| WO-010 | ✅ Canvas creado, pero **no equivale a formulario validado ni a contrato funcional.** Pendiente de completar por Sil/Cora. |
| WO-013/013b | ✅ **Merged.** Documentación canónica alineada. |
| **Próximo paso humano** | **Completar el canvas de Enfermería y Farmacia** (Fase 1 de este protocolo). |
| **Después del canvas** | Crear contratos documentales reales (Fase 2). |
| **Después de contratos** | Planificar implementaciones (Fases 3-5). |

---

*Última actualización: 2026-06-05.*
