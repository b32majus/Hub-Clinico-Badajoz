# TODO — Hub Clínico Badajoz

## Estado actual

La fase principal de deuda técnica quedó cerrada el 2026-03-07.

### Cierres relevantes
- Codificación y finales de línea saneados en la documentación viva y en los módulos/scripts trabajados durante la fase.
- Normalización canónica extendida a `dataManager`, dashboard, seguimiento y estadísticas.
- Indicador persistente de estado de BD implementado y validado.
- Catálogo de `Fármacos` corregido y validado en formularios.
- Checklist técnico pre-release disponible en `scripts/check_pre_release.js`.
- Checklist E2E operativo disponible en `docs/CHECKLIST_E2E_CLINICO.md`.
- Validación real con Playwright en WSL completada: carga de Excel, sesión profesional, primera visita AR y seguimiento AR con selects de tratamiento poblados.

## Pendientes no bloqueantes

### 1. Ampliar cobertura E2E manual por patología
- **Dónde**: `docs/CHECKLIST_E2E_CLINICO.md`
- **Qué hacer**: Ejecutar y registrar tandas completas para `ESPA`, `APS` y exportación con buffer de pendientes.
- **Estado**: Existe checklist y smoke base validada; falta ampliar trazabilidad si se quiere cobertura más exhaustiva.
- **Prioridad**: Media.

### 2. Pulido incremental de quick view y dashboard
- **Dónde**: `script.js`, `scripts/script_dashboard.js`
- **Qué hacer**: Seguir reduciendo HTML generado inline, ajustar mejoras visuales puntuales y corregir el error residual de Chart.js `Invalid scale configuration for scale: y1` en `dashboard_paciente.html`.
- **Estado**: No bloqueante; detectado en smoke Playwright del dashboard paciente.
- **Prioridad**: Baja-media.

### 3. Mejoras funcionales futuras
- **Dónde**: vistas de gestión y workflows por rol.
- **Qué hacer**: mejoras de usabilidad, vistas específicas y automatizaciones no críticas.
- **Estado**: backlog evolutivo, no deuda urgente.
- **Prioridad**: Baja.

Última revisión: 2026-03-07.
