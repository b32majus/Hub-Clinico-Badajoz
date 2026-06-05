# Hub Clínico Reumatología — Badajoz / PROMueve Extremadura

Aplicación web **local-first** para captura estructurada de datos clínicos en Reumatología, sin instalación y sin backend remoto.

---

## Estado actual (rama viva)

La rama `feature/reuma-v2-prebiologico-fh-les-sjogren` contiene la versión funcional avanzada del Hub, que sustituye a la `main` legacy.

**Patologías activas:** `AR`, `EspA`, `APs`, `LES`, `Sjögren`.

**Entorno objetivo:** Hospital de Badajoz (restricciones STIC).  
**Base de datos local:** `Hub_Clinico_Maestro.xlsx` (Excel compartido).  
**Flujo de persistencia:** exportar CSV (1 fila) y pegar manualmente en Excel.  
**Caché operativa:** por sesión de navegador (`sessionStorage`), no persistente al cerrar la ventana.

---

## Qué hace actualmente

1. **Registro multipatología** de primera visita y seguimiento para AR, EspA, APs, LES y Sjögren.
2. **Cálculo automático de índices clínicos** específicos por patología (DAS28, CDAI, SDAI, BASDAI, ASDAS-CRP, DAPSA, SLEDAI-2K, SLICC, ESSPRI, ESSDAI).
3. **Bloque prebiológico/vacunación** embebido por visita (estado: SI/NO/NA/Pendiente).
4. **Solicitud FH** (Farmacia Hospitalaria) generada como texto estructurado derivado.
5. **Eventos terapéuticos** derivados del historial de visitas (cambios de tratamiento, scores).
6. **Dashboard de paciente** con métricas por patología, evolución longitudinal y timeline de eventos.
7. **Dashboard de estadísticas poblacionales** con filtros por cohorte y gráficos multipatología.
8. **Búsqueda de pacientes** con vista rápida (quick view) y navegación al dashboard.
9. **Exportación dual:** TXT para historia clínica y CSV estructurado para base de datos (Excel).
10. **Recarga de BD** desde cualquier pantalla mediante badge lateral de estado.
11. **Gestión visual unificada** de catálogos de fármacos y profesionales.
12. **Demo sintética** poblacional integrada para demostraciones.

---

## Arquitectura

- **HTML/CSS/JS vanilla** (sin npm, bundlers, ni build system).
- **Sin backend remoto.** Toda la ejecución es local en el navegador.
- **Sin autenticación ni seguridad real.** Los perfiles funcionales futuros (Reumatología, Enfermería, Farmacia) controlan interfaz, no equivalen a autenticación/autorización.
- **Excel como fuente MVP.** No es la solución definitiva; es el mecanismo de persistencia del piloto.
- **Lectura cruzada sí; escritura cruzada no.** Cada perfil escribirá en su propia fuente física.
- **3 dependencias CDN:** SheetJS (lectura Excel), Chart.js (gráficos), jsPDF (generación PDF).

Ver `ARCHITECTURE.md` para detalle técnico completo.

---

## Estructura de datos (alto nivel)

**Archivo maestro:** `Hub_Clinico_Maestro.xlsx`

**Hojas clínicas:** `AR`, `ESPA`, `APS`, `LES`, `SJOGREN` (497 columnas por hoja).

**Hojas de soporte:** `Fármacos`, `Profesionales`

---

## Gobernanza de agentes

El proyecto utiliza un pipeline Hermes PM → OpenCode Builder para tareas de documentación y desarrollo acotado.

Ver:
- `AGENTS.md` — reglas para agentes del proyecto
- `docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md` — marco operativo completo

---

## Módulos futuros (en diseño funcional)

| Módulo | Estado |
|--------|--------|
| **Enfermería Reuma** | 🟡 Diseño funcional — no implementado. Canvas en `docs/ops/CANVAS_DISENO_FORMULARIOS_ENFERMERIA_FARMACIA_20260606.md` |
| **Farmacia Hospitalaria** | 🟡 Diseño funcional — no implementado. Canvas en mismo documento |
| **Contratos interservicios (WO-002)** | ⏸️ **Pausada.** Borradores en `docs/contratos/`. Pendientes de validación con Sil/Cora. No usar como fuente definitiva |

---

## Documentación de referencia

- Arquitectura e implementación: `ARCHITECTURE.md`
- Arquitectura funcional v2.1: `docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`
- Índice documental completo: `docs/INDEX.md`
- Decisiones de evolución: `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`
- Contrato de datos Reuma v2: `docs/CONTRATO_DATOS_REUMA_V2.md`
- Changelog: `docs/CHANGELOG.md`
- Estado de implementación: `docs/ESTADO_IMPLEMENTACION.md`
- Work order status: `docs/ops/WORK_ORDER_STATUS.md`
- Manual de usuario (PDF): `docs/Manual_Usuario_Hub_Clinico_Badajoz.pdf`
- Manual de usuario (MD): `docs/manual_usuario.md`
- Plantillas Excel por patología en `docs/`

---

## Limitaciones conocidas (diseño intencional)

- Sin backend remoto ni auto-sync por restricciones del entorno STIC.
- Escritura en BD por pegado manual de CSV.
- Dependencia de disciplina operativa para recarga de BD y calidad de nomenclatura.
- Sin tests automatizados (validación manual).
- Dependencias CDN: no funciona offline sin carga previa.
- `sessionStorage` como caché: límite ~5-10 MB, se borra al cerrar pestaña.

---

## Mantenimiento

Cuando se cambie formulario, exportación o lectura de BD, actualizar siempre:
1. Código (`formController`, `exportManager`, `dataManager`, scripts de página).
2. Contrato de datos (`docs/CONTRATO_DATOS_REUMA_V2.md`).
3. Plantillas/cabeceras Excel.
4. Estado funcional (`docs/ESTADO_IMPLEMENTACION.md`).
5. Documentación afectada.
