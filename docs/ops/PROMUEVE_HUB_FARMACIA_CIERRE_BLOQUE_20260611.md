# PROMueve / Hub Farmacia Hospitalaria — Cierre de Bloque v0.2–v0.3

**Status:** documented  
**Fecha:** 2026-06-11  
**Rama activa:** `work/farmacia-v0-3-post-demo-exploratory-20260607`  
**SHA cierre:** `4d2b7bc`

---

## Resumen ejecutivo

El Hub Clínico de Farmacia Hospitalaria del proyecto PROMueve ha completado su primera fase operativa: una demo funcional (v0.2) y una evolución post-demo (v0.3) con dos módulos aceptados como base. La plantilla Dermatología, desarrollada en paralelo, está validada por farmacéuticas como entregable independiente.

El proyecto cuenta con validación positiva del Jefe de Servicio de Farmacia Hospitalaria de Cáceres y tiene programada una reunión presencial con el equipo completo de Farmacia el 2026-06-12, además de una reunión formal de seguimiento.

---

## Demo realizada

- **Fecha:** 2026-06-06
- **Versión:** Demo Farmacia v0.2 (freeze SHA `1b7eba7`)
- **Asistentes:** Jefe de Servicio de Farmacia Hospitalaria de Cáceres
- **Resultado:** Valoración positiva. Interés confirmado en el proyecto.
- **Acuerdo:** La demo v0.2 queda congelada como fallback estable y referente de presentación.

---

## Validación del Jefe de Servicio

- La herramienta fue bien recibida en su conjunto.
- Se identificó interés en profundizar en los flujos de validación y seguimiento.
- El jefe ha confirmado asistencia a la reunión presencial del 2026-06-12 (adicional a la reunión formal inicialmente prevista para el 2026-06-16).
- No se recibieron peticiones específicas de nuevas funcionalidades antes de la reunión presencial.

---

## Estado de la rama post-demo v0.3

| Atributo | Valor |
|----------|-------|
| **Rama** | `work/farmacia-v0-3-post-demo-exploratory-20260607` |
| **SHA** | `4d2b7bc` |
| **Naturaleza** | Rama viva de evolución. No es release ni demo congelada. |
| **Merge a main** | No autorizado todavía. |
| **Relación con v0.2** | Independiente. v0.2 permanece intacta como fallback. |

---

## Estado de los módulos

### Dashboard Paciente v0.3

| Atributo | Valor |
|----------|-------|
| **Estado** | ✅ Aceptado como base post-demo |
| **Último commit** | `b03891b` (pulido visual, confirmado en `a7afdf6`) |
| **Funcionalidad** | Visualización de datos sintéticos del paciente: índices clínicos, PROMs, timelines, eventos adversos, comorbilidades, evolución longitudinal |
| **Cache busting** | `v=20260608-dashboard-e` |

### Estadísticas del Servicio v0.3

| Atributo | Valor |
|----------|-------|
| **Estado** | ✅ Aceptado como base post-demo |
| **Último commit** | `6aad4a2` (chips filtros activos eliminables) |
| **Funcionalidad** | Dashboard analítico de cohorte: KPI cards, filtros rápidos/avanzados, gráficos agrupados (2×2), tabla de pacientes, chips de filtros activos, optimización farmacoterapéutica |
| **Cache busting** | `v=20260608-stats-f` |
| **Nota** | Ha recibido 5 iteraciones de refinamiento UX. Estado estable. |

### Plantilla Dermatología (entregable independiente)

| Atributo | Valor |
|----------|-------|
| **Estado** | ✅ Validada con farmacéuticas |
| **Naturaleza** | Módulo independiente del Hub. No requiere rediseño de fondo. |
| **Uso estratégico** | Demostrar que la arquitectura es transversal a servicios |

### Otros módulos (estado actual)

| Módulo | Estado | Notas |
|--------|--------|-------|
| Validación Farmacia | Implementado (v0.1/v0.2) | Formulario funcional en demo congelada |
| Primera Visita | Implementado (v0.1/v0.2) | Formulario funcional en demo congelada |
| Seguimiento | Implementado (v0.1/v0.2) | Formulario funcional en demo congelada |
| Actividad del Servicio | Implementado (v0.2) | Pendiente de revisión post-demo |
| Catálogo Farmacológico | Esqueleto con carga manual (4023 fármacos) | Pendiente de integración CIMA |

---

## Ramas y SHAs relevantes

| Rama | SHA | Estado |
|------|-----|--------|
| `main` | `a25cccb` | Protegido. No tocar sin autorización explícita. |
| `work/hermes/farmacia-demo-v0-2-candidate-20260606` | `1b7eba7` (funcional: `9f54f02`) | Demo congelada. Fallback de presentación. |
| `work/hermes/nightly-farmacia-v0-1-20260606` | `95003a2` | Frozen v0.1. Histórico. |
| `work/farmacia-v0-3-post-demo-exploratory-20260607` | `4d2b7bc` | **Rama viva de evolución.** |

---

## Decisiones tomadas

1. La demo v0.2 queda congelada y no se modifica.
2. La rama v0.3 es línea evolutiva, no compromiso de implantación inmediata.
3. No mergear a main hasta nueva orden.
4. Dashboard Paciente v0.3 aceptado como base.
5. Estadísticas del Servicio v0.3 aceptada como base.
6. Plantilla Dermatología es módulo independiente validado.
7. No sobredimensionar promesas antes de cerrar flujo operativo con el servicio.
8. Avanzar quirúrgicamente antes de la reunión presencial: solo tareas de bajo riesgo.

---

## Riesgos y deudas técnicas

| Riesgo | Impacto | Estado |
|--------|---------|--------|
| Datos sintéticos en toda la demo | Alto — no permite validación clínica real | Abierto |
| Sin backend/persistencia | Alto — todo es frontend estático | Abierto |
| Catálogo farmacológico incompleto | Medio — carga manual, no sincronizado con CIMA | Abierto |
| CRLF/LF mismatch en el repo | Bajo — Git lo gestiona automáticamente | Abierto |
| Sin autenticación | Medio — demo viable, producción inviable | Abierto |
| Sin pruebas automatizadas (más allá del smoke check) | Medio | Abierto |

---

## Backlog vivo

### Prioridad alta (pre-reunión)

- [ ] Preparar demo enfocada para reunión presencial 2026-06-12
- [ ] Cerrar presentación de propuesta de valor para Farmacia
- [ ] Preparar 3 preguntas clave para el servicio

### Prioridad media (post-reunión)

- [ ] Backend mínimo (autenticación + persistencia)
- [ ] Flujo de validación integrado con datos reales
- [ ] Dashboard Paciente con datos reales (piloto 5-10 pacientes)
- [ ] Estadísticas del Servicio con datos reales

### Prioridad baja (futuro)

- [ ] Integración CIMA para catálogo farmacológico
- [ ] Plantilla Reumatología
- [ ] Trazabilidad y seguridad
- [ ] Integración hospitalaria (HIS/JARA/Farmatools)

---

## Próximos pasos

1. **Inmediato:** Reunión presencial con equipo de Farmacia y Jefe de Servicio (2026-06-12)
2. **Próxima semana:** Reunión formal de seguimiento (2026-06-16)
3. **Post-reunión:** Definir MVP operativo basado en feedback recibido
4. **30 días:** Backend mínimo + piloto con datos reales
