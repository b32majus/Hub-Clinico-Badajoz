# Decisión: Capa temporal de entrada multipatología para Farmacia

**Fecha:** 2026-06-05  
**Versión:** 1.0  
**Proyecto:** Hub Clínico Reumatología — Badajoz / PROMueve Extremadura  
**Propósito:** Documentar una decisión táctica de diseño para la reunión del lunes 2026-06-08 con el jefe de Servicio de Farmacia Hospitalaria de Cáceres.

---

## 1. Contexto de la decisión

El Hub Clínico está actualmente más avanzado en Reumatología (v2.0 multipatología con AR, EspA, APs, LES, Sjögren). Sin embargo, la próxima reunión del **2026-06-08** con el jefe de Servicio de Farmacia Hospitalaria de Cáceres tiene como foco principal **Farmacia** y un caso de **Hidradenitis Supurativa (HS) / Dermatología**.

Se necesita una demo que muestre el valor del módulo de Farmacia aunque el servicio origen (Dermatología) no tenga todavía un módulo completo en el Hub.

---

## 2. Motivo del giro táctico

| Factor | Descripción |
|--------|-------------|
| Reunión inminente | Lunes 2026-06-08 con el jefe de Farmacia de Cáceres. El foco es Farmacia, no Reumatología. |
| Necesidad de mostrar HS | El interlocutor necesita ver el caso de Hidradenitis Supurativa como prioridad. |
| Dermatología no construida | No hay módulo de Dermatología en el Hub. Construir uno completo antes del lunes es inviable y arriesgado. |
| Oportunidad de Farmacia | La reunión es la ocasión ideal para mostrar el módulo de Farmacia multipatología, aunque los servicios origen tengan distinto nivel de madurez. |

---

## 3. Decisión

> **Añadir una capa temporal de entrada multipatología en el diseño del módulo de Farmacia.**

Esta capa permite que Farmacia reciba solicitudes con dos niveles de estructuración, según el servicio origen:

- **Servicios no modelados (HS/Dermatología):** entrada manual/semi-estructurada.
- **Servicios modelados (Reumatología):** entrada estructurada desde el Hub.

---

## 4. Dos modos de entrada

### Modo A: Entrada manual / semi-estructurada (HS/Dermatología)

| Aspecto | Descripción |
|---------|-------------|
| Origen | Orden clínica / JARA (texto no estructurado) |
| Entrada | El farmacéutico introduce los datos manualmente o semi-estructurados desde el texto de la orden |
| Estructura | Campos clave: fármaco, indicación, dosis, pauta, fecha_solicitud |
| Servicio origen | HS/Dermatología (sin módulo Hub propio) |
| Madurez | Baja — muestra el punto de partida actual |

### Modo B: Entrada estructurada desde Hub (Reumatología)

| Aspecto | Descripción |
|---------|-------------|
| Origen | Hub Clínico Reuma v2 |
| Entrada | Datos precargados desde el formulario clínico de Reumatología |
| Estructura | Solicitud FH estructurada con CIP, diagnóstico, tratamiento, scores |
| Servicio origen | Reumatología (con módulo Hub completo) |
| Madurez | Alta — muestra el flujo end-to-end deseado |

---

## 5. Casos demo

### HS/Dermatología — Entrada manual / semi-estructurada

- El farmacéutico recibe una orden clínica (texto simulado de JARA).
- Introduce manualmente los datos mínimos: fármaco, indicación, dosis, pauta.
- La solicitud queda registrada en Farmacia.
- Se inicia el flujo de validación farmacoterapéutica.

**Objetivo:** mostrar que Farmacia puede operar aunque el servicio origen no esté digitalizado.

### Reumatología — Entrada estructurada end-to-end

- El reumatólogo completa una visita en el Hub Reuma v2.
- La Solicitud FH se genera automáticamente con datos estructurados.
- Farmacia recibe la solicitud con CIP, diagnóstico, tratamiento actual, scores.
- Farmacia valida, optimiza o registra seguimiento.

**Objetivo:** mostrar el flujo completo deseado cuando todos los servicios tengan módulo Hub.

---

## 6. Qué NO implica esta decisión

| Exclusión | Explicación |
|-----------|-------------|
| ❌ No implica construir Dermatología completa | Solo se implementa la entrada a Farmacia, no el módulo clínico de Dermatología. |
| ❌ No implica duplicar el repo | Todo sigue en el mismo repositorio. |
| ❌ No implica cambiar el roadmap general | La arquitectura progresiva, las fases del plan formativo y las decisiones DEC-001 a DEC-017 siguen vigentes. |
| ❌ No implica solución definitiva | La entrada manual es una capa temporal de demostración. La solución definitiva es la entrada estructurada desde cada servicio. |
| ❌ No implica integración real con JARA | Los datos de JARA se simulan. No hay conexión real. |
| ❌ No implica uso con datos reales | Toda la demo usa datos sintéticos. |

---

## 7. Qué SÍ permite

| Capacidad | Descripción |
|-----------|-------------|
| ✅ Validar el circuito de Farmacia | Flujo completo: solicitud → validación → seguimiento → optimización. |
| ✅ Enseñar presente y futuro | Entrada manual (presente) y automatizada (futuro) en la misma demo. |
| ✅ Seguimiento farmacoterapéutico multipatología | Farmacia gestiona pacientes de distintos servicios origen. |
| ✅ Captura de datos clave | Fármaco, indicación, dosis, pauta, validación, inicio, seguimiento, optimización, adherencia, efectos adversos y PROMs. |
| ✅ Preparar el terreno para Enfermería | La misma lógica de entrada multipatología podrá aplicarse a Enfermería en el futuro. |

---

## 8. Riesgos

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| Confundir entrada manual con integración real | 🟡 Alto | Dejar claro en la demo que es simulado, no conectado a JARA. |
| Sobredimensionar el módulo antes de validar con Farmacia | 🟡 Medio | La capa temporal es mínima: solo lo necesario para la demo. No implementar funcionalidades sin validar. |
| Duplicar campos que ya vienen del servicio origen | 🟡 Medio | Revisar que los campos de entrada manual no dupliquen los que ya proporciona el Hub estructurado. |
| Prometer Dermatología completa antes de tenerla | 🟡 Alto | Dejar explícito en la demo que HS es un caso de entrada manual, no un módulo clínico completo. |

---

## 9. Reglas de comunicación para la reunión

1. **HS/Dermatología** se presenta como caso de uso prioritario y necesidad identificada por Farmacia.
2. **Reumatología** se presenta como ejemplo de flujo estructurado completo, demostrando hacia dónde se evolucionará.
3. **El módulo de Farmacia** se diseña para admitir distintos niveles de madurez del servicio origen (manual ↔ estructurado).
4. **La demo usa exclusivamente datos sintéticos.**
5. **No hay integración real** con JARA, SES ni sistemas productivos.
6. El presente es la entrada manual; el futuro es la entrada estructurada desde cada servicio.

---

## 10. Relación con la arquitectura

| Principio | Aplicación |
|-----------|------------|
| Lectura cruzada sí / escritura cruzada no | ✅ Se mantiene. Farmacia lee datos del Hub Reuma (Modo B) pero escribe en su propia fuente. |
| Fuente propia de Farmacia | ✅ Farmacia conserva su Excel independiente. |
| Datos mínimos por solicitud | Cada solicitud de Farmacia debe incluir: `servicio_origen`, `indicacion`, `farmaco`, `dosis`, `pauta`, `fecha_solicitud`, `tipo_entrada` (manual/estructurada). |
| Capa temporal | La entrada manual es transitoria. Cuando un servicio tenga módulo Hub, migrará a entrada estructurada. |

---

## 11. Próximo paso

**Especificación funcional Farmacia v0.1** orientada a la reunión del 2026-06-08:

- Definir campos mínimos del formulario de entrada farmacéutica.
- Definir campos de validación y seguimiento.
- Definir integración con timeline de eventos.
- Preparar datos demo para HS/Dermatología y Reumatología.
- Preparar flujo de demo: solicitud → validación → seguimiento.

---

*Última actualización: 2026-06-05.*
