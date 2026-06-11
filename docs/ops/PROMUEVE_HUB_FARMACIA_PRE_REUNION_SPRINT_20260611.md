# PROMueve / Hub Farmacia — Plan de Mini-Sprint Pre-Reunión

**Status:** pending_review  
**Fecha:** 2026-06-11  
**Reunión objetivo:** Presencial con equipo de Farmacia + Jefe de Servicio (Cáceres, 2026-06-12)  
**Reunión formal siguiente:** 2026-06-16

---

## 1. Contexto

- La demo v0.2 gustó al Jefe de Servicio.
- Mañana hay reunión presencial en Cáceres con el equipo de Farmacia.
- El jefe se incorpora también (no estaba previsto inicialmente).
- Interés alto en el proyecto.
- No hay peticiones específicas de nuevas features antes de la reunión.

## 2. Principio operativo

| ✅ Hacer | ❌ No hacer |
|----------|-------------|
| Tareas de bajo riesgo y reversibles | Backend, integración, persistencia |
| Mejoras visuales menores | Tocar demo congelada v0.2 |
| Documentación y preparación de reunión | Mergear a main |
| Ajustes que no afecten funcionalidad existente | Abrir desarrollos estructurales |
| Preparar demo enfocada para mañana | Prometer funcionalidades sin validar |

## 3. Posibles avances pre-reunión

### 🟢 Verde — Ejecutable sin aprobación

| Tarea | Archivos | Riesgo | Tiempo estimado |
|-------|----------|--------|----------------|
| N/A (todo lo que no sea código ni documentación requiere autorización) | — | — | — |

*Nota: Según la instrucción de Sil, no ejecuto código sin autorización explícita.*

### 🟡 Amarillo — Requiere confirmación de Sil

| Tarea | Archivos | Riesgo | Tiempo | Descripción |
|-------|----------|--------|--------|-------------|
| Pull preview a último SHA de la rama | Preview server | Bajo | 1 min | Asegurar que la URL de preview muestra v0.3 post-demo |
| Mejora visual catálogo fármacos | `farmacia_farmacos.html`, CSS | Bajo | 30 min | Pulir el listado actual para que no parezca esqueleto |
| Añadir botón de acceso rápido a Dashboard Paciente desde Inicio | `farmacia_index.html` | Bajo | 15 min | Mejorar navegabilidad para la demo |

### 🔴 Rojo — No ejecutar antes de reunión

| Tarea | Motivo |
|-------|--------|
| Backend (cualquier tecnología) | Cambio estructural. Requiere acuerdo con servicio. |
| Integración CIMA / catálogo completo | Trampa de complejidad. Validad primero el flujo. |
| Autenticación de usuarios | Sin definir requisitos ni modelo de acceso. |
| Conexión con HIS/JARA/Farmatools | No hay acuerdo, no hay API, no hay permiso. |
| Nuevos módulos (Reuma, etc.) | Cerrar Farmacia primero. |
| Modificar demo v0.2 | Congelada por acuerdo. |
| Merge a main | Requiere autorización explícita de Sil. |

## 4. Checklist para la reunión presencial

### Qué enseñar (prioridad)

1. **Dashboard Paciente v0.3** — el núcleo de valor: ver la evolución del paciente en 5 segundos
2. **Estadísticas del Servicio v0.3** — la foto de la cohorte: cuántos pacientes, qué tratamientos, cómo evolucionan
3. **Flujo de Validación** (v0.2, que ya conocen) — desde que llega la receta hasta que se valida
4. **Plantilla Dermatología** — como prueba de que la arquitectura es transversal (si surge)

### Qué NO enseñar

- ❌ Código, commits, ramas, git
- ❌ Detalles técnicos de implementación
- ❌ Features a medio hacer (catálogo incompleto, actividad servicio pendiente)
- ❌ Backend, CIMA, integraciones (no prometer lo que no se ha acordado)

### Qué preguntar

1. **Flujo real:** ¿Cómo es el proceso de validación hoy? ¿Dónde está el cuello de botella?
2. **Prioridades:** Si pudierais mejorar una sola cosa del proceso actual, ¿cuál sería?
3. **Datos:** ¿Qué pacientes os gustaría ver primero en el dashboard? ¿Podemos empezar con 5-10 casos reales para validar?
4. **Adopción:** ¿Veis esto como una herramienta para usar en el día a día o como un piloto para explorar posibilidades?

### Qué feedback recoger

- ¿Qué funcionalidad les parece más útil?
- ¿Qué falta? ¿Qué sobra?
- ¿Usarían esto semanalmente? ¿A diario?
- ¿Qué les preocupa (privacidad, carga de trabajo, integración)?

## 5. Propuesta de siguiente WO (si Sil la autoriza)

Si Sil da luz verde después de la reunión, la siguiente WO podría ser:

> **Ajustes post-feedback reunión presencial**
> - Incorporar peticiones explícitas del servicio
> - Preparar backend mínimo para piloto con datos reales
> - No abrir nuevos módulos
> - Documentar decisiones de la reunión

## 6. Nota para Sil

Lleva esto impreso o en el móvil durante la reunión. Las 4 preguntas de la sección 4 son lo más importante. El resto es contexto para ti.

Si el jefe o el equipo piden algo concreto, anótalo y lo priorizamos después. **No prometas nada sobre la marcha** — "lo anoto y os confirmo cómo lo encajamos" es una respuesta perfecta.
