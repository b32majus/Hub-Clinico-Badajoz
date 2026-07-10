# Decisión estratégica: no integrar Farmacia en `main` ni en Reuma v2 post-SES

**Fecha:** 2026-07-10
**Contexto:** Post-reunión SES y post-SES roadmap (`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`)
**WO:** `WO-DOC-DECISION-DISCOVERY-REUMA-FH-POST-SES-01`
**Estado de esta decisión:** Revisable únicamente tras discovery con equipos clínicos de Badajoz/Mérida
**Rama de trabajo:** `work/hermes/WO-DOC-DECISION-DISCOVERY-REUMA-FH-POST-SES-01-20260710`

---

## 1. Resumen ejecutivo

Se decide **no integrar** la línea funcional de Farmacia Hospitalaria (preview/demo post-SES) en `main` ni en la rama canónica funcional `feature/reuma-v2-prebiologico-fh-les-sjogren`.

La decisión preserva tres planos separados:

1. `main` como referencia histórica/legacy, inmutable salvo decisión explícita futura.
2. `feature/reuma-v2-prebiologico-fh-les-sjogren` como base funcional canónica de Reumatología, sin mezcla de lógica de Farmacia.
3. `preview/demo-lunes-wo4-20260614` como evidencia de aprendizaje/demo post-SES, no canónica global ni productiva.

Esta decisión **no autoriza ningún merge**, **no define campos clínicos finales**, **no habilita backend, producción, datos reales ni integración institucional**. Es una decisión de contención estratégica reversible tras descubrir con Reumatología y Farmacia Hospitalaria de Badajoz/Mérida (y, en su caso, Enfermería) cómo debe articularse la interfaz clínica.

---

## 2. Contexto post-SES

Tras la reunión con la Subdirección General de Farmacia del SES queda claro que el proyecto ya no puede explicarse solo como una aplicación de Reumatología. Existe una línea Farmacia Hospitalaria con demo funcional en `preview/demo-lunes-wo4-20260614` que demuestra capacidad técnica, pero no constituye un producto institucional aprobado ni un contrato clínico definitivo.

El roadmap post-SES (`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`) propone una vía dual:

- Piloto local-first controlado.
- Arquitectura corporativa futura, condicionada a Salud Digital/STIC.

Antes de decidir si y cómo Farmacia se integra en la base canónica, es necesario entender el circuito real entre Reumatología y Farmacia Hospitalaria en los hospitales de Badajoz y Mérida.

---

## 3. Decisión

### 3.1 No mergear Farmacia a `main`

`main` permanece como referencia histórica/legacy. No se autoriza merge de Farmacia ni de Reuma v2 a `main` en esta WO.

### 3.2 No mezclar Farmacia en `feature/reuma-v2-prebiologico-fh-les-sjogren`

La rama Reuma v2 es la base funcional canónica de Reumatología. No se incorpora código, contratos ni lógica de Farmacia hasta que:

- Se defina la interfaz clínica Reuma ↔ Farmacia con los equipos de Badajoz/Mérida.
- Se valide si la lógica legacy `Reuma → Solicitud FH` sigue siendo válida o debe rediseñarse.
- Se confirme que Reuma v2 no asumirá funciones de validación farmacoterapéutica ni de prescripción.

### 3.3 Mantener `preview/demo-lunes-wo4-20260614` como aprendizaje no canónico

La preview es evidencia técnica de demo. Sirve para aprender, mostrar flujos y validar comprensión, pero no es base de código global ni productiva.

---

## 4. Tres planos separados

| Plano | Rama/Ref | Estado | Qué se permite | Qué NO se permite |
|---|---|---|---|---|
| **Histórico / legacy** | `main` (`a25cccb`) | Estable, no tocar sin autorización | Conservar como referencia | Mergear Reuma v2 o Farmacia sin decisión explícita |
| **Canónico funcional Reuma** | `feature/reuma-v2-prebiologico-fh-les-sjogren` | Base viva del MVP Reuma | Evolucionar Reuma v2 dentro de su alcance | Mezclar lógica de Farmacia, asumir funciones FH, integrar preview sin WO específica |
| **Aprendizaje / demo post-SES** | `preview/demo-lunes-wo4-20260614` (`f202f79` y descendientes) | Evidencia de demo, no productiva | Correcciones de bug autorizadas, demos controladas | Presentar como producto institucional, usar datos reales, mergear sin auditoría |

---

## 5. Razones de la no integración

### 5.1 La interfaz Reuma ↔ Farmacia Hospitalaria aún no está definida con Badajoz/Mérida

La demo previa se validó con Cáceres como contexto de aprendizaje. Cáceres no define el circuito de Badajoz ni de Mérida. Los flujos reales (quién solicita, en qué sistema, qué datos viajan, quién valida, dónde se registra el acto farmacéutico) deben confirmarse con los equipos locales.

### 5.2 La lógica legacy `Reuma → Solicitud FH` puede estar desactualizada

La Solicitud FH actual en Reuma v2 es un texto derivado para copiar/pegar en orden clínica. La demo de Farmacia preview introduce validación farmacoterapéutica, primera visita, seguimiento, dashboards y exportaciones propias. No se puede asumir que la solicitud de texto plano heredada represente el contrato de entrada que Farmacia Hospitalaria de Badajoz/Mérida necesita.

### 5.3 Farmacia Hospitalaria tiene su propio hub/demo

La línea Farmacia ha evolucionado con su propio contrato de tratamiento, catálogo de pautas, validación prebiológica, exportación longitudinal y flujo multipatología. Forzar su integración prematura en Reuma v2 acoplaría dos dominios que aún no han acordado su interfaz.

### 5.4 Reuma no debe asumir que genera actos ni informes de Farmacia

Reuma v2 genera una solicitud clínica estructurada (o texto derivado). No genera validaciones farmacéuticas, pautas definitivas, informes de adherencia ni actos de dispensación. Esos actos pertenecen al ámbito profesional de Farmacia Hospitalaria.

---

## 6. Principio funcional de separación

> **Reumatología genera una solicitud clínica estructurada.**
> **Farmacia Hospitalaria valida farmacoterapéuticamente y sigue su propio circuito de farmacoterapia.**
> **El Hub digital coordina visibilidad y flujo, pero nunca sustituye el acto profesional clínico ni farmacéutico.**

Este principio implica:

- El Hub no infiere dosis, vía, pauta, presentación o inducción a partir del nombre del fármaco.
- El Hub no registra actos farmacéuticos en nombre de Farmacia.
- El Hub no convierte una solicitud de Reuma en una orden o validación automática.
- El Hub puede mostrar a cada profesional la información relevante del otro módulo, pero la decisión clínica/farmacéutica permanece en manos del profesional responsable.

---

## 7. Cinco riesgos de una integración inmediata

| # | Riesgo | Por qué es grave | Mitigación actual |
|---|---|---|---|
| 1 | **Pérdida de la base canónica de Reuma v2** | Mezclar código/demo de Farmacia podría romper flujos validados de AR, EspA, APs, LES y Sjögren | Mantener `feature/reuma-v2...` sin cambios de Farmacia |
| 2 | **Acoplamiento de dos dominios sin interfaz acordada** | Reuma y Farmacia tienen modelos de datos, contratos y responsabilidades distintas | No integrar hasta definir contrato mínimo Reuma↔FH |
| 3 | **Inferencia clínica no validada** | Automatizar la solicitud FH como si generara un acto farmacéutico violaría la regla de no inferencia | Separar generación de solicitud de validación FH |
| 4 | **Contaminación de la fuente de datos de Farmacia** | Si Reuma escribe o asume datos farmacoterapéuticos, se rompe el principio de escritura separada por rol | Mantener fuente propia de Farmacia y lectura cruzada controlada |
| 5 | **Falsa sensación de producto/institucionalización** | La demo podría interpretarse como producción o como autorización del SES | Documentar explícitamente que es demo/learning, no producto |

---

## 8. Condiciones de revisión

Esta decisión solo se revisará cuando se cumplan, como mínimo, las siguientes condiciones:

1. Se haya realizado el discovery con Reumatología de Badajoz y Mérida.
2. Se haya realizado el discovery con Farmacia Hospitalaria de Badajoz y Mérida.
3. Se haya documentado el circuito actual (mapa de proceso) y la matriz funcional/localización.
4. Se haya identificado quién genera cada dato, quién lo valida y dónde se registra el acto profesional.
5. Se haya validado con Sil/Cora que la interfaz propuesta no contradice decisiones cerradas (DEC-001 a DEC-019) ni el roadmap post-SES.
6. Exista una WO específica de integración con alcance, riesgos y criterio de salida definidos.

Hasta entonces, **no se autoriza merge, backend, producción, datos reales ni integración institucional**.

---

## 9. Checklist de lo que esta decisión NO autoriza

- [ ] No autoriza merge de Farmacia a `main`.
- [ ] No autoriza merge de Farmacia a `feature/reuma-v2-prebiologico-fh-les-sjogren`.
- [ ] No define campos finales del contrato Reuma↔Farmacia.
- [ ] No define campos finales del módulo de Farmacia.
- [ ] No habilita backend, base de datos real, API ni autenticación.
- [ ] No habilita uso de datos reales de pacientes.
- [ ] No habilita integración con JARA, SES, Pharmatool ni otros sistemas institucionales.
- [ ] No convierte la demo/preview en producto institucional aprobado.

---

## 10. Referencias

- `docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`
- `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`
- `docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- `docs/discovery/GUIA_DISCOVERY_REUMA_FH_BADAJOZ_MERIDA.md`
