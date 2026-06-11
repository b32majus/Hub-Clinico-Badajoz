# PROMueve / Hub Farmacia Hospitalaria — Knowledge Update

**Status:** pending_review  
**Fecha:** 2026-06-11  
**Preparado para:** Base de conocimiento / Copia a Cora

---

## Contexto del proyecto

PROMueve es un proyecto para desarrollar un Hub Clínico modular para Farmacia Hospitalaria. El hub permite a los farmacéuticos hospitalarios validar tratamientos, hacer seguimiento farmacoterapéutico, visualizar la evolución de pacientes y analizar la cohorte del servicio.

Inicialmente centrado en hidradenitis supurativa (HS) y fármacos biológicos, con visión futura transversal e interoperable.

## Estado funcional

- **Demo v0.2:** Congelada y validada. Presentada al Jefe de Servicio de Farmacia de Cáceres el 2026-06-06 con recepción positiva. SHA de referencia: `1b7eba7`.
- **Rama v0.3:** Viva como línea de evolución (`work/farmacia-v0-3-post-demo-exploratory-20260607`). No mergeada a main.
- **Dashboard Paciente v0.3:** Aceptado como base post-demo. Muestra datos sintéticos del paciente (índices, PROMs, timelines, eventos adversos, comorbilidades, evolución).
- **Estadísticas del Servicio v0.3:** Aceptada como base post-demo. Dashboard analítico de cohorte con filtros, KPI cards, gráficos agrupados 2×2, tabla y chips de filtros activos.
- **Plantilla Dermatología:** Entregable independiente, validado con farmacéuticas. No requiere rediseño.

## Estado técnico

| Aspecto | Estado |
|---------|--------|
| **Arquitectura** | Frontend estático (HTML/CSS/JS vanilla). Sin backend. |
| **Datos** | Sintéticos (generados por script). No hay persistencia real. |
| **Despliegue** | Servidor HTTP Python en VPS (puerto 8124). Accesible vía dominio/IP pública. |
| **Catálogo farmacológico** | 4023 fármacos cargados manualmente (CSV). Pendiente integración CIMA. |
| **Autenticación** | No implementada. |
| **Pruebas** | Smoke check (33 checks) en `tools/farmacia_smoke_check.mjs`. |

## Módulos existentes

| Módulo | Archivo principal | Estado |
|--------|------------------|--------|
| Inicio Farmacia | `farmacia_index.html` | Funcional en v0.2 |
| Validación | `farmacia_validacion.html` | Funcional en v0.2 |
| Primera Visita | `farmacia_primera_visita.html` | Funcional en v0.2 |
| Seguimiento | `farmacia_seguimiento.html` | Funcional en v0.2 |
| Dashboard Paciente | `farmacia_dashboard_paciente.html` | ✅ Base post-demo v0.3 |
| Estadísticas Servicio | `farmacia_estadisticas.html` | ✅ Base post-demo v0.3 |
| Actividad Servicio | `farmacia_actividad_servicio.html` | Funcional v0.2, pendiente revisión |
| Fármacos | `farmacia_farmacos.html` | Esqueleto catálogo |
| Profesionales | `farmacia_profesionales.html` | Esqueleto |

## Estado de validación

| Entregable | Validado por | Fecha |
|------------|-------------|-------|
| Demo Farmacia v0.2 | Jefe Servicio Farmacia Cáceres | 2026-06-06 |
| Plantilla Dermatología | Farmacéuticas (grupo trabajo) | Anterior a 2026-06 |
| Dashboard Paciente v0.3 | Sil/Cora (aceptación interna) | 2026-06-08 |
| Estadísticas Servicio v0.3 | Sil/Cora (aceptación interna) | 2026-06-08 |

## Próxima reunión presencial

- **Fecha:** 2026-06-12 (viernes)
- **Lugar:** Cáceres — presencial con el equipo de Farmacia
- **Asistentes confirmados:** Equipo de Farmacia + Jefe de Servicio (se incorpora por interés en el proyecto)
- **Adicional:** Reunión formal de seguimiento prevista para 2026-06-16 (lunes)

## Reglas de gobernanza del proyecto

1. **Demo v0.2 congelada.** No se modifica. Es el fallback de presentación.
2. **Rama v0.3 es viva pero no compromiso.** No hay merge a main sin autorización.
3. **Main no se toca.** Protegido.
4. **Frozen v0.1** (`95003a2`) es histórico. No tocar.
5. **Sin PRs, sin merges, sin GitHub Pages sin autorización explícita.**
6. **Avanzar quirúrgicamente.** Tareas de bajo riesgo antes de la reunión. No abrir desarrollos estructurales.
7. **No prometer backend, integración HIS, CIMA completa ni autenticación** hasta cerrar flujo operativo con el servicio.

## Cosas que NO hacer todavía

- ❌ No mergear v0.3 a main
- ❌ No iniciar backend real sin acuerdo con el servicio
- ❌ No construir integración con HIS/JARA/Farmatools
- ❌ No normalizar el catálogo CIMA completo
- ❌ No implementar autenticación sin validación de requisitos
- ❌ No abrir nuevos módulos (Reuma, etc.) sin cerrar el flujo de Farmacia
- ❌ No prometer plazos de implantación real
