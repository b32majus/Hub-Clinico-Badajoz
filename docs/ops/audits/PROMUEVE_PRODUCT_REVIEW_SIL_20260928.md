# PROMueve — Auditoría manual de producto Sil 2026-09-28 — revisión viva

**Estado:** `IN_PROGRESS` / no autoriza implementación  
**Ámbito:** PROMueve Extremadura — Farmacia Hospitalaria, Reumatología, Dermatología y capacidades transversales  
**Origen:** revisión manual de Sil sobre superficies publicadas y decisiones funcionales pendientes  
**Regla:** cada hallazgo debe clasificarse por alcance (`CORE`, `MODULE`, `SITE`, `MODULE×SITE`), madurez, timing y necesidad de discovery antes de convertirse en backlog aprobado, deuda, issue o WO técnica.

## 0. Principio de trabajo

Este documento captura hallazgos, decisiones y propuestas de la revisión manual para no perder contexto. **No convierte por sí solo ninguna propuesta en implementación autorizada.**

Al cerrar la revisión, los elementos aceptados se reconciliarán con `docs/ops/PROMUEVE_BACKLOG.md`, registros de deuda, contratos y planes vivos correspondientes. La deuda Nexus ya aceptada queda fuera de esta revisión salvo que una observación humana demuestre un defecto funcional nuevo.

Reglas transversales:
- distinguir `ya implementado`, `regresión`, `defecto`, `mejora`, `decisión pendiente`, `discovery` y `futuro`;
- preservar tratamiento solicitado ≠ validado;
- no inferir dosis, vía, pauta, presentación, inducción, renovación, switch, add-on, causalidad, resultado de validación o línea terapéutica desde nombre de fármaco, catálogo, historial o ausencia;
- no usar datos reales de pacientes durante esta evaluación;
- no confundir una capacidad mostrable con una capacidad apta para piloto/producción.

## 1. Matriz viva de hallazgos / evoluciones

| ID | Tema | Tipo | Alcance inicial | Timing | Estado |
|---|---|---|---|---|---|
| `SIL-REV-001` | Nomenclatura oficial de programas/procesos FH SES | DATA / INTEROPERABILITY | CORE + catálogo global FH | Antes de ampliar procesos/reportes | PROPOSED |
| `SIL-REV-002` | Presets de informes periódicos en análisis poblacional | FEATURE / CONFIG | CORE + configuración de reporte | Tras contrato de datos mínimo | PROPOSED |
| `SIL-REV-003` | Reporte trimestral Cosentyx | FEATURE / REPORT | Global FH; primer preset concreto | Discovery/contrato antes de WO | PROPOSED |
| `SIL-REV-004` | Simplificación del circuito prebiológico en Reuma | UX / CLINICAL FLOW | MODULE Reumatología, global entre sites | Próxima evolución funcional Reuma | PROPOSED |
| `SIL-REV-005` | Solicitud Reuma → Farmacia mediante TXT estructurado | INTEROPERABILITY / FEATURE | MODULE Reuma→Farmacia | Tras discovery con Farmacia | PROPOSED |
| `SIL-REV-006` | Conversión de PCR según unidad bibliográfica de cada calculadora | CLINICAL SAFETY / CORE | CORE + SITE + calculator contract | Antes de usar calculadoras multicentro | PROPOSED |
| `SIL-REV-007` | Superficie Dermatología global en PROMueve | FEATURE / NAVIGATION | MODULE Dermatología global; SITE futuro | Corto plazo / demo-discovery | PROPOSED |
| `SIL-REV-008` | Formulario simple Dermatología → Farmacia | INTEROPERABILITY / FEATURE | MODULE Dermatología→FH global | Corto plazo | PROPOSED / fuente disponible |
| `SIL-REV-009` | Adaptación Hub HS completo como consulta monográfica | FEATURE / DATA | MODULE Dermatología-HS global; SITE futuro | Después de discovery | PROPOSED |
| `SIL-REV-010` | Adaptación Hub Psoriasis completo | FEATURE / DATA | MODULE Dermatología-PsO global; SITE futuro | Después de auditoría/corrección | PROPOSED |
| `SIL-REV-011` | Contrato único de solicitud Derma → FH desde superficies simples/completas | INTEROPERABILITY | CORE de integración + MODULE Derma/FH | Antes de integrar botones de solicitud | PROPOSED |
| `SIL-REV-012` | Alertas de renovación de prescripción | CLINICAL FLOW / FEATURE | Global FH + Enfermería + servicios clínicos | Prioridad funcional; antes de piloto | PROPOSED |
| `SIL-REV-013` | Handoff de renovaciones FH → Enfermería → servicio → FH | INTEROPERABILITY / DATA | Global; site configurable | Tras fijar contrato/estados | PROPOSED |
| `SIL-REV-014` | Vista operativa de renovaciones para Enfermería | UX / REPORT | MODULE Enfermería; global inicial | Después del flujo mínimo | DEFERRED/MVP opcional |
| `SIL-REV-015` | ASDAS referido a APs: necesidad clínica por confirmar | CLINICAL SAFETY / CALCULATOR | MODULE Reumatología | Antes de implementar | NEEDS_CLINICAL_VALIDATION |
| `SIL-REV-016` | Catálogo farmacológico/autocomplete común en Reuma | DATA / UX / INTEROPERABILITY | CORE catálogo + MODULE Reuma | Próxima evolución Reuma | PROPOSED |

---

## 2. `SIL-REV-001` — Nomenclatura oficial de programas/procesos FH SES

### Contexto
Sil aporta `Programas CHUB 2025 def.xls`, utilizado por Farmacia Hospitalaria como nomenclatura estandarizada/unificada de programas/procesos alineados con SES. Esta nomenclatura ya se utilizó como criterio para corregir denominaciones en Hidradenitis Supurativa y debe extenderse a los procesos cubiertos por el catálogo.

### Dirección propuesta
- Tratar el catálogo como referencia global de Farmacia Hospitalaria en PROMueve.
- Evitar denominaciones locales o históricas cuando exista denominación oficial SES.
- Aplicarlo de forma coherente en formularios, dashboards, filtros, reportes y exportaciones.
- Evaluar por separado si la misma nomenclatura debe reutilizarse en servicios clínicos; no asumirlo automáticamente.

### Clasificación
`CORE/DATA` para catálogo y reglas de identificación; consumo global por Farmacia. La posible reutilización por servicios clínicos requiere validación separada.

### Pendiente
Ingestar y revisar el fichero fuente antes de convertirlo en catálogo machine-readable. Preservar el original como referencia. No contiene autorización automática para modificar contratos clínicos.

---

## 3. `SIL-REV-002` — Presets de informes periódicos en análisis poblacional

### Contexto
En el Dashboard/Análisis poblacional se había planteado una capacidad asociada al Control Plane para definir configuraciones versionadas —por ejemplo JSON— que representen filtros/reportes recurrentes. El objetivo es que informes periódicos no dependan de reconstruir manualmente los mismos filtros cada vez.

### Dirección propuesta
- Capacidad global de `report presets` versionados y gobernados.
- Un preset describe ventana temporal, población, indicación, tratamiento/evento y salida esperada.
- Los presets no infieren eventos clínicos; deben apoyarse en actos/eventos explícitos del modelo longitudinal.
- Ejecutar un preset no convierte el dashboard en fuente de verdad clínica.

---

## 4. `SIL-REV-003` — Primer preset: reporte trimestral Cosentyx

### Ventana
Tres meses correspondientes a un trimestre natural.

### Información requerida
1. **PSO / psoriasis:** pacientes con nuevo inicio de Cosentyx durante el trimestre.
2. **PsA / artritis psoriásica:** pacientes con nuevo inicio de Cosentyx durante el trimestre.
3. **HS / hidradenitis supurativa:** pacientes en los que durante el trimestre se inicia la administración de Cosentyx cada 2 semanas, diferenciando conceptualmente:
   - inicio directamente con frecuencia q2w;
   - intensificación explícita desde q4w a q2w.

No es un reporte de unidades dispensadas ni de consumo físico. Para HS tampoco es simplemente “todos los nuevos inicios”: el evento de interés es el inicio de la frecuencia q2w.

### Consecuencia de datos
El filtro debe identificar eventos dentro de la ventana temporal, no una fotografía del tratamiento actual. No se puede inferir intensificación por ausencia de datos ni por nombre de fármaco.

---

## 5. `SIL-REV-004` — Simplificación del circuito prebiológico en Reuma

### Problema
Reuma contiene un circuito prebiológico demasiado detallado que intenta representar múltiples fases intermedias de analítica, Medicina Preventiva/vacunación y readiness. La experiencia posterior de Cáceres demuestra un modelo operativo más simple, liderado por Enfermería.

### Dirección funcional
Reuma deja de gestionar el circuito prebiológico detallado. Conserva únicamente el estado mínimo necesario para preparar la solicitud a Farmacia.

Propuesta de estado único por bloque para evitar combinaciones incoherentes:
- `No solicitada`;
- `Solicitada / pendiente`;
- `OK`.

Aplicable inicialmente a:
- Analítica.
- Medicina Preventiva.

`OK` debe ser un estado profesional explícito/importado desde una fuente autorizada; Reuma no lo calcula automáticamente a partir de resultados.

### Alcance
Cambio global del módulo Reumatología, no específico de Badajoz/Cáceres/Mérida.

### Precaución
Decidir por separado si el detalle histórico deja de mostrarse en el flujo principal o se elimina de captura/modelo. No borrar información histórica útil sin decisión explícita.

---

## 6. `SIL-REV-005` — Solicitud Reuma → Farmacia en TXT estructurado

### Dirección
Añadir una acción tipo `Solicitar tratamiento a Farmacia` que genere/copie un TXT estructurado, siguiendo el patrón funcional ya utilizado por Dermatología → Farmacia en Cáceres.

La acción genera una solicitud; no implica transporte real, envío automático, validación ni persistencia clínica por sí misma.

### Contrato pendiente
El conjunto exacto de campos debe acordarse con Farmacia en las reuniones de discovery. Como orientación puede incluir identificador de paciente, patología/indicación, antecedentes/información relevante, comorbilidades y tratamiento/posología explícitamente solicitados, pero **no se fija todavía como contrato**.

No inferir dosis, vía, pauta, presentación, inducción, switch/add-on ni resultado de validación.

---

## 7. `SIL-REV-006` — PCR y unidades de las calculadoras clínicas

### Problema multicentro
- Cáceres y Mérida informan PCR en `mg/L`.
- Badajoz informa PCR en `mg/dL`.

La misma magnitud no puede entrar sin transformación en fórmulas que esperan una unidad concreta.

### Decisión corregida
No existe una “unidad canónica regional de PCR” impuesta por PROMueve ni debe asumirse que todas las calculadoras usan la misma unidad. **La unidad esperada forma parte del contrato bibliográfico de cada calculadora.**

Verificación inicial de contratos:
- ASDAS basado en CRP: PCR en `mg/L`;
- DAS28-CRP: PCR en `mg/L`;
- DAPSA: PCR en `mg/dL`.

### Patrón de diseño
`valor original + unidad original + site` → conversión determinista a la unidad exigida por la calculadora → fórmula oficial intacta.

Si la unidad original o esperada no está definida, el cálculo debe fallar de forma segura y no inferir por magnitud.

### UI
Cuando exista conversión, mostrarla de forma discreta y verificable, por ejemplo:

`PCR informada: 0,8 mg/dL → utilizada para DAS28: 8 mg/L`

Si no existe conversión, no añadir ruido visual innecesario.

### Datos y trazabilidad
Conservar siempre valor y unidad originales. Los valores convertidos son derivados para una finalidad/calculadora concreta y no sobrescriben silenciosamente el dato de laboratorio.

Para RWE/multicentro, una eventual unidad homogénea de intercambio debe definirse como contrato de datos independiente y no derivarse accidentalmente de una calculadora concreta.

### Clasificación
- `CORE`: mecanismo de unidades/conversión determinista;
- `SITE`: unidad de origen configurada por hospital/laboratorio;
- `MODULE/CALCULATOR`: unidad bibliográfica exigida por cada índice;
- `DATA`: trazabilidad de original + derivados;
- `UI`: indicación de conversión cuando ocurra.

---

## 8. `SIL-REV-007` a `011` — Dermatología global: solicitud simple + herramientas completas

### Objetivo global
Hacer visible Dermatología en PROMueve para los tres hospitales. En esta fase, formularios y capacidades se consideran globales; la localización/configuración por hospital se abordará después con la arquitectura Nexus agnóstica por site/deployment.

### Nivel 1 — solicitud simple Dermatología → Farmacia
Se dispone de una plantilla HTML actualizada aportada por Sil como fuente de trabajo. El formulario se titula `Solicitud Dermatología → Farmacia`, contempla actualmente HS, psoriasis, dermatitis atópica, vitíligo y alopecia areata, e incluye un selector explícito de `Programa SES`, tratamiento solicitado y exportación de texto plano para e-Orden.

La plantilla actualizada **todavía no se considera integrada en PROMueve** por el hecho de existir como HTML. Debe incorporarse mediante WO propia, preservando el contrato ya acordado entre Dermatología y Farmacia y revisando su comportamiento antes de publicarla como superficie soportada.

### Nivel 2 — herramientas completas de consulta
Dos prototipos externos sirven de baseline funcional:
- `b32majus/Hub-Clinico-HS-Canarias` para una consulta monográfica de Hidradenitis Supurativa con seguimiento/base longitudinal;
- `b32majus/Hub-Clinico-PsO-Valme` para Psoriasis, actualmente con errores conocidos y por tanto no apto para presentarse como funcionalmente cerrado.

Dirección propuesta:
- no clonar ciegamente los repos dentro de PROMueve;
- utilizarlos como baseline para discovery y localización a Extremadura;
- hacer visible la existencia de estas capacidades para discusión clínica;
- distinguir claramente `formulario simple disponible/acordado` de `prototipo completo pendiente de adaptación`.

### Contrato único Derma → Farmacia
A largo plazo, el formulario simple y los módulos completos HS/PsO deben producir la **misma semántica de solicitud a Farmacia**. El módulo completo podrá tener una UI mucho más rica, pero el botón `Solicitar tratamiento a Farmacia` debe generar un contrato equivalente al formulario simple, no una tercera variante incompatible.

### Alcance
- global de Dermatología inicialmente;
- personalización por hospital como configuración futura `SITE`, no forks clínicos independientes desde el principio.

---

## 9. `SIL-REV-012` y `013` — Renovaciones: alerta FH y circuito con Enfermería/servicios

### Problema asistencial
En las Farmacias Hospitalarias de Extremadura se producen situaciones en las que el paciente acude y la prescripción del servicio clínico está caducada. Farmacia no puede renovar esa prescripción y necesita anticipar la gestión con el servicio de origen.

### Regla funcional inicial a validar
Como hipótesis operativa aportada por Sil:
- validez esperada de referencia: 1 año desde la validación/fecha base definida;
- entrar en estado de alerta cuando resten **60 días** para la fecha prevista de caducidad.

**No codificar esta regla como universal sin validar el contrato real:** duración, fecha base y excepciones deben ser configurables/confirmadas antes de implementación clínica.

### Superficie Farmacia
Crear una vista operativa de pacientes próximos a renovación, al menos:
- agrupada/filtrable por servicio clínico de origen;
- identificador de paciente;
- tratamiento/línea relevante solo si consta explícitamente;
- fecha base, fecha prevista de caducidad y días restantes;
- estado del circuito de renovación.

La alerta identifica necesidad de gestión; **no renueva ni prolonga automáticamente la validación FH**.

### Handoff propuesto
1. Farmacia identifica pacientes que han entrado en ventana de renovación.
2. Por servicio, Farmacia genera una salida estructurada —inicialmente CSV/filas pegables en Excel— para Enfermería.
3. El workbook de Enfermería, ya utilizado para inicios biológicos, incorpora una superficie de `Renovaciones` por servicio o estructura equivalente.
4. Enfermería coordina la renovación con el equipo médico de origen.
5. Cuando existe evidencia de renovación completada, Enfermería registra explícitamente el estado `renovado`/equivalente.
6. Farmacia vuelve a importar/reconciliar esa información y ve que existe una renovación reportada.
7. La actualización/prolongación de la validación en Farmacia sigue requiriendo **acto profesional FH explícito**; un check de Enfermería no equivale a validación farmacoterapéutica.

### Identidad y trazabilidad
No basar reconciliación en heurísticas por nombre o mera coincidencia visual. El circuito debe disponer de un identificador estable de renovación (`renovacion_id` o contrato equivalente), además de la identidad del paciente y servicio.

### Estados a diseñar
Ejemplo provisional, pendiente de discovery:
- `NO_DUE` / fuera de ventana;
- `DUE_SOON` / entra en ventana;
- `REQUESTED_TO_SERVICE` / enviado a Enfermería/servicio;
- `IN_PROGRESS`;
- `RENEWED_REPORTED` / Enfermería informa renovación;
- `FH_REVIEW_PENDING`;
- `FH_UPDATED` / acto FH explícito completado.

Los nombres finales y transiciones deben cerrarse antes de implementar.

### Alcance
Capacidad global para Farmacia/Enfermería/servicios clínicos. El transporte inicial puede usar Excel como adaptador soportado; no convierte Excel en autoridad conceptual del flujo.

---

## 10. `SIL-REV-014` — Vista operativa de renovaciones en Enfermería

### Idea
Si el workbook de Enfermería termina manteniendo una superficie de solicitud/inicio y otra de renovaciones por servicio, puede ser útil una vista-resumen sencilla con recuentos como:
- renovaciones pendientes;
- renovaciones en curso;
- renovaciones completadas/reportadas;
- otros seguimientos pendientes si existe contrato claro.

### Prioridad
**No es requisito del MVP del circuito.** Primero deben funcionar identidad, estados, ida/vuelta FH↔Enfermería y reconciliación segura. Añadir dashboard solo si mejora realmente la operación y puede derivarse sin ambigüedad de esos estados.

---

## 11. `SIL-REV-015` — ASDAS referido a artritis psoriásica: validar antes de implementar

Sil identifica como posible ausencia una calculadora ASDAS en el contexto de Artritis Psoriásica.

### Adjudicación provisional de seguridad
No implementar todavía como simple “calculadora faltante”. ASDAS es el **Axial Spondyloarthritis Disease Activity Score**, diseñado/validado para actividad de espondiloartritis axial. Si la necesidad real es valorar **afectación axial en un paciente con PsA**, debe definirse explícitamente con Reumatología qué población/indicación y qué instrumento quieren utilizar.

### Acción
Discovery clínico corto con Reumatología antes de WO:
- confirmar si se referían a PsA con afectación axial;
- confirmar si el instrumento deseado es ASDAS u otro;
- fijar fórmula, inputs, unidad de PCR y bibliografía oficial;
- no mostrar una calculadora bajo una patología si su interpretación no está clínicamente acordada.

---

## 12. `SIL-REV-016` — Catálogo farmacológico/autocomplete común en Reuma

### Problema actual percibido
Reumatología mantiene/selecciona fármacos desde un catálogo propio alimentado manualmente por responsables del servicio. Esto añade mantenimiento local y riesgo de desalineación.

### Dirección propuesta
Reutilizar en Reuma el patrón de catálogo/autocomplete farmacológico centralizado ya utilizado en Farmacia, basado en el catálogo versionado del proyecto y su proceso de actualización desde fuentes regulatorias/locales aprobadas.

Principios:
- un único catálogo mantenible para identificación/selección;
- autocomplete en todos los campos de fármaco relevantes de Reuma;
- no inferir dosis, vía, pauta, presentación, inducción ni decisión terapéutica al seleccionar un nombre;
- separar catálogo de identificación de contrato terapéutico;
- fallback/fallo seguro si el catálogo no está disponible;
- conservar capacidad de catálogo local cuando exista una necesidad institucional explícita, pero no duplicar listas manuales sin necesidad.

### Alcance
`CORE/DATA` para la capacidad de catálogo y `MODULE/REUMA` para el consumo UI. Debe reconciliarse con la arquitectura Nexus y con la fuente real vigente del catálogo antes de ejecutar.

---

## 13. Fuentes de trabajo de esta revisión

- `Programas CHUB 2025 def.xls` — aportado por Sil; pendiente de ingestión/normalización documental.
- `plantilla_solicitud_dermatologia(1).html` — versión actualizada aportada por Sil; fuente de trabajo, todavía no integrada en PROMueve.
- `b32majus/Hub-Clinico-HS-Canarias` — baseline externo para HS completa.
- `b32majus/Hub-Clinico-PsO-Valme` — baseline externo para Psoriasis completa; errores conocidos pendientes de auditoría/corrección.
- documentación viva y código publicado de `b32majus/Hub-Clinico-Badajoz`.

---

## 14. Próximo uso de este documento

Continuar añadiendo hallazgos de la revisión manual por fases. No implementar durante la captura salvo WO separada y autorización explícita.

Al cerrar la auditoría:
1. reconciliar cada entrada con código y documentación vivos;
2. marcar `ya implementado`, `regresión`, `defecto`, `mejora`, `decisión pendiente`, `discovery` o `futuro`;
3. decidir `CORE / MODULE / SITE / MODULE×SITE` definitivo;
4. mover solo lo aprobado al backlog vivo o a deuda si existe defecto demostrado;
5. crear WOs atómicas separadas por naturaleza y riesgo;
6. preservar la distinción entre demo, evaluación sintética, piloto y producción.
