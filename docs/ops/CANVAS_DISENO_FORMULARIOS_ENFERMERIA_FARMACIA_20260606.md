# Canvas de Diseño Funcional — Formularios Enfermería y Farmacia

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Propósito:** Documento de trabajo para que Sil/Cora diseñen los formularios reales de Enfermería y Farmacia  
**Estado:** ⏸️ Pendiente de rellenar por Sil/Cora  
**Uso:** Completar este canvas antes de pasar a contratos documentales definitivos

---

## Instrucciones

Este canvas NO es un contrato de datos ni un diseño de formulario. Es una herramienta para que Sil y Cora definan **qué necesita cada perfil** antes de traducirlo a campos, layouts y contratos.

Cada sección contiene preguntas guía y tablas vacías. Rellenar con el equipo clínico según corresponda.

---

## A. Módulo Enfermería

### A.1 Objetivo asistencial

**Preguntas guía:**
- ¿Qué problema resuelve el módulo de Enfermería en el Hub?
- ¿Qué tipo de profesionales de enfermería lo usarán (reumatología, atención primaria, hospital)?
- ¿Es un registro de actividad o también tiene valor clínico/decisional?

> *Espacio para respuesta de Sil/Cora:*

---

### A.2 Cuándo se usa el formulario

| Situación | ¿Aplica? | Frecuencia estimada |
|-----------|----------|-------------------|
| Visita programada de enfermería | ⬜ | |
| Contacto telefónico de seguimiento | ⬜ | |
| Educación terapéutica grupal/individual | ⬜ | |
| Administración de vacunación | ⬜ | |
| Detección de efecto adverso | ⬜ | |
| Incidencia administrativa/clínica | ⬜ | |
| Valoración de adherencia | ⬜ | |
| Otros (especificar) | ⬜ | |

### A.3 Qué necesita ver Enfermería precargado desde Reuma

**Preguntas guía:**
- ¿Qué datos del paciente debe ver Enfermería nada más abrir el formulario?
- ¿Debe ver el diagnóstico primario, tratamiento actual, scores recientes?
- ¿Debe ver eventos de otros módulos (Farmacia) en la misma vista?

| Dato | ¿Necesario? | ¿Siempre visible? | Notas |
|------|------------|-------------------|-------|
| CIP / identificador paciente | ⬜ | ⬜ | |
| Nombre del paciente | ⬜ | ⬜ | |
| Diagnóstico primario | ⬜ | ⬜ | |
| Tratamiento actual | ⬜ | ⬜ | |
| Última visita Reuma (fecha + resumen) | ⬜ | ⬜ | |
| Scores recientes | ⬜ | ⬜ | |
| Estado prebiológico | ⬜ | ⬜ | |
| Alertas activas (efectos adversos, etc.) | ⬜ | ⬜ | |
| Eventos de Farmacia (validaciones) | ⬜ | ⬜ | |
| Otros | ⬜ | ⬜ | |

### A.4 Qué debe poder escribir Enfermería

**Preguntas guía:**
- ¿Qué datos son responsabilidad exclusiva de Enfermería?
- ¿Qué puede ser opcional vs obligatorio?
- ¿Hay campos calculados o derivados?

| Tipo de registro | ¿Obligatorio? | ¿Estructurado o libre? | ¿Controlado por valores? |
|-----------------|---------------|----------------------|-------------------------|
| Contacto/seguimiento | ⬜ | ⬜ | ⬜ |
| Educación terapéutica impartida | ⬜ | ⬜ | ⬜ |
| Adherencia observada | ⬜ | ⬜ | ⬜ |
| Vacunación administrada | ⬜ | ⬜ | ⬜ |
| Efecto adverso detectado | ⬜ | ⬜ | ⬜ |
| Incidencia | ⬜ | ⬜ | ⬜ |
| Derivación/requiere valoración médica | ⬜ | ⬜ | ⬜ |
| Observaciones libres | ⬜ | ⬜ | ⬜ |

### A.5 Qué NO debe tocar Enfermería

**Preguntas guía:**
- ¿Qué campos están reservados exclusivamente a Reumatología?
- ¿Qué datos clínicos no debe modificar Enfermería bajo ningún concepto?

| Campo/Área | Motivo |
|------------|--------|
| Diagnóstico primario | Sólo Reumatología |
| Scores clínicos (DAS28, BASDAI, SLEDAI, etc.) | Sólo Reumatología |
| Decisión terapéutica / cambios de fármaco | Sólo Reumatología |
| Estado prebiológico final | Sólo Reumatología |
| *(rellenar)* | |

### A.6 Qué genera timeline (visión longitudinal)

Marcar qué actividades de Enfermería deben aparecer en la timeline del paciente, visible para todos los perfiles.

| Actividad | ¿Alimenta timeline? | ¿Visible por Reuma? | ¿Visible por Farmacia? |
|-----------|-------------------|--------------------|----------------------|
| Seguimiento de enfermería | ⬜ | ⬜ | ⬜ |
| Educación terapéutica | ⬜ | ⬜ | ⬜ |
| Vacunación | ⬜ | ⬜ | ⬜ |
| Efecto adverso notificado | ⬜ | ⬜ | ⬜ |
| Incidencia | ⬜ | ⬜ | ⬜ |

### A.7 Qué genera alerta o revisión

| Actividad | ¿Genera alerta? | ¿A quién? | ¿Requiere acción? |
|-----------|----------------|-----------|------------------|
| Efecto adverso detectado | ⬜ | ⬜ | ⬜ |
| No adherencia | ⬜ | ⬜ | ⬜ |
| Incidencia clínica | ⬜ | ⬜ | ⬜ |
| Requiere valoración médica | ⬜ | ⬜ | ⬜ |

### A.8 Qué alimenta dashboard

| Indicador | ¿En dashboard de paciente? | ¿En dashboard de enfermería? | ¿En estadísticas globales? |
|-----------|--------------------------|----------------------------|---------------------------|
| Último contacto de enfermería | ⬜ | ⬜ | ⬜ |
| Adherencia actual | ⬜ | ⬜ | ⬜ |
| Vacunación al día | ⬜ | ⬜ | ⬜ |
| Efectos adversos activos | ⬜ | ⬜ | ⬜ |
| Incidencias abiertas | ⬜ | ⬜ | ⬜ |

---

## B. Módulo Farmacia

### B.1 Objetivo asistencial

**Preguntas guía:**
- ¿Qué problema resuelve el módulo de Farmacia en el Hub?
- ¿Es un módulo de validación, de seguimiento o ambos?
- ¿Qué profesionales de Farmacia lo usarán?

> *Espacio para respuesta de Sil/Cora:*

---

### B.2 Cuándo se usa el formulario

| Situación | ¿Aplica? | Frecuencia estimada |
|-----------|----------|-------------------|
| Validación de Solicitud FH recibida | ⬜ | |
| Revisión periódica de pauta | ⬜ | |
| Seguimiento de adherencia | ⬜ | |
| Detección/registro de efecto adverso | ⬜ | |
| Interacción farmacológica | ⬜ | |
| Propuesta de cambio de pauta | ⬜ | |
| Otros (especificar) | ⬜ | |

### B.3 Qué necesita ver Farmacia precargado desde Reuma

**Preguntas guía:**
- ¿Qué datos del paciente y su tratamiento debe ver Farmacia?
- ¿Debe ver la Solicitud FH enviada por Reumatología?
- ¿Debe ver eventos de Enfermería relevantes para validación?

| Dato | ¿Necesario? | ¿Siempre visible? | Notas |
|------|------------|-------------------|-------|
| CIP / identificador paciente | ⬜ | ⬜ | |
| Diagnóstico primario | ⬜ | ⬜ | |
| Fármaco(s) actual(es) con dosis | ⬜ | ⬜ | |
| Peso del paciente | ⬜ | ⬜ | |
| Fecha inicio tratamiento | ⬜ | ⬜ | |
| Solicitud FH enviada por Reuma | ⬜ | ⬜ | |
| Estado prebiológico | ⬜ | ⬜ | |
| Efectos adversos registrados (cualquier módulo) | ⬜ | ⬜ | |
| Adherencia registrada por Enfermería | ⬜ | ⬜ | |
| Scores recientes | ⬜ | ⬜ | |

### B.4 Qué debe poder escribir Farmacia

| Tipo de registro | ¿Obligatorio? | ¿Estructurado o libre? | ¿Controlado por valores? |
|-----------------|---------------|----------------------|-------------------------|
| Validación FH (estado: validado/rechazado/observaciones) | ⬜ | ⬜ | ⬜ |
| Revisión de pauta | ⬜ | ⬜ | ⬜ |
| Adherencia registrada | ⬜ | ⬜ | ⬜ |
| Efecto adverso farmacoterapéutico | ⬜ | ⬜ | ⬜ |
| Interacción farmacológica detectada | ⬜ | ⬜ | ⬜ |
| Propuesta de cambio de pauta | ⬜ | ⬜ | ⬜ |
| Observaciones farmacoterapéuticas | ⬜ | ⬜ | ⬜ |

### B.5 Qué NO debe tocar Farmacia

| Campo/Área | Motivo |
|------------|--------|
| Diagnóstico primario | Sólo Reumatología |
| Scores clínicos | Sólo Reumatología |
| Registro de visita médica | Sólo Reumatología |
| Estado prebiológico final | Sólo Reumatología |
| Contacto de enfermería | Sólo Enfermería |
| Educación terapéutica | Sólo Enfermería |

### B.6 Qué genera timeline

| Actividad | ¿Alimenta timeline? | ¿Visible por Reuma? | ¿Visible por Enfermería? |
|-----------|-------------------|--------------------|------------------------|
| Validación FH completada | ⬜ | ⬜ | ⬜ |
| Adherencia registrada | ⬜ | ⬜ | ⬜ |
| Efecto adverso farmacoterapéutico | ⬜ | ⬜ | ⬜ |
| Cambio de pauta propuesto | ⬜ | ⬜ | ⬜ |
| Interacción detectada | ⬜ | ⬜ | ⬜ |

### B.7 Qué devuelve a Reuma/Enfermería

**Preguntas guía:**
- ¿Qué información debe generar Farmacia que otros módulos consuman?
- ¿Cómo recibe Reumatología la validación de su Solicitud FH?
- ¿Hay un circuito cerrado (solicitud → validación → respuesta)?

| Salida | ¿Consumido por Reuma? | ¿Consumido por Enfermería? | Formato esperado |
|--------|----------------------|--------------------------|-----------------|
| Validación FH (estado + observaciones) | ⬜ | ⬜ | |
| Propuesta de cambio de pauta | ⬜ | ⬜ | |
| Alerta de interacción | ⬜ | ⬜ | |
| Alerta de efecto adverso grave | ⬜ | ⬜ | |

### B.8 Qué alimenta dashboard

| Indicador | ¿En dashboard de paciente? | ¿En dashboard de farmacia? | ¿En estadísticas globales? |
|-----------|--------------------------|---------------------------|---------------------------|
| Estado validación FH más reciente | ⬜ | ⬜ | ⬜ |
| Adherencia actual | ⬜ | ⬜ | ⬜ |
| Efectos adversos farmacológicos activos | ⬜ | ⬜ | ⬜ |
| Cambios de pauta recientes | ⬜ | ⬜ | ⬜ |
| Interacciones activas | ⬜ | ⬜ | ⬜ |

---

## C. Preguntas pendientes para Sil/Cora

1. **Solicitud FH**: ¿Debe seguir siendo texto a portapapeles o Farmacia debe tener un módulo que la reciba? Esto cambia el diseño del módulo de Farmacia.
2. **Relación Enfermería → Reuma**: ¿Enfermería necesita derivar pacientes a Reumatología desde su formulario? ¿Cómo se gestiona esa derivación?
3. **Relación Farmacia → Reuma**: ¿La validación de Farmacia debe aparecer como notificación en el formulario de Reumatología?
4. **Evento longitudinal**: ¿Timeline única para los tres perfiles o cada perfil ve la suya filtrada?
5. **Dashboard por perfil**: ¿Cada perfil necesita su propio dashboard o el dashboard de paciente muestra datos de todos?
6. **Frecuencia de uso real**: ¿Enfermería y Farmacia usarán el Hub a diario, semanalmente, o bajo demanda?
7. **Almacenamiento**: ¿Excel propio por perfil (como está decidido) o se plantea ya una base de datos compartida?
8. **Control de acceso en MVP**: ¿Basta con UI hiding por perfil o se necesita autenticación real?

---

## D. Decisiones bloqueantes antes de contratos

| Decisión | ¿Por qué bloquea? | Quién decide |
|----------|------------------|-------------|
| ¿Solicitud FH como circuito cerrado o texto? | Cambia el diseño del módulo Farmacia | Sil/Cora |
| ¿Derivación Enfermería → Reuma? | Cambia flujo de alertas | Sil/Cora + equipo |
| ¿Timeline única o filtrada por perfil? | Cambia el diseño de dashboard | Sil/Cora |
| ¿Excel propio o base de datos? | Impacta arquitectura y carga de datos | Sil/Cora |
| ¿Autenticación en MVP? | Impacta seguridad y esfuerzo | Sil |
| ¿Dashboard por perfil? | Impacta prioridad de desarrollo | Sil/Cora |

---

## E. Criterios para pasar de canvas a contratos documentales

Este canvas se considera completo cuando:

- [ ] Sil/Cora han respondido las preguntas de las secciones A.1 a B.8
- [ ] Las preguntas de la sección C tienen respuesta o están marcadas como post-MVP
- [ ] Las decisiones bloqueantes (sección D) están cerradas
- [ ] El equipo clínico ha validado los flujos descritos
- [ ] Se ha decidido el mecanismo de almacenamiento (Excel vs DB)

Una vez cumplido, se puede proceder a:
1. Definir contratos documentales definitivos por perfil.
2. Diseñar formularios específicos.
3. Crear work orders de implementación.

---

> **Nota:** Este canvas no sustituye a WO-002 ni a ningún contrato de datos. Es una herramienta de diseño previa.
