# Resumen de Release — Hub Clínico Reuma v2

**Fecha:** 2026-05-03  
**Versión:** v2.0.0  
**Rama:** `feature/reuma-v2-prebiologico-fh-les-sjogren`  
**Estado:** Listo para PR/merge

---

## Qué se ha implementado

Esta release transforma el Hub Clínico de Reumatología desde una herramienta monopatología (AR/EspA/APs) a una plataforma multipatología completa con soporte para LES y Sjögren, además de módulos transversales de prebiológico y Farmacia Hospitalaria.

### Funcionalidades nuevas

| Funcionalidad | Descripción |
|---------------|-------------|
| **CIP como identificador** | Visible en toda la UI, con alias de compatibilidad |
| **LES completo** | Formularios, exportación, dashboard SLEDAI-2K/SLICC, calculadoras |
| **Sjögren completo** | Formularios, exportación, dashboard ESSPRI/ESSDAI, calculadoras |
| **Prebiológico manual** | 4 estados, badge persistente, sessionStorage |
| **Solicitud FH** | Texto plano por patología, copia a portapapeles |
| **Eventos terapéuticos** | Timeline + anotaciones Chart.js, derivados de visitas |
| **Estadísticas v2** | 5 patologías, KPIs adaptativos, scatter ampliado |
| **Demo poblacional** | 30 pacientes, 109 visitas, script reproducible |

---

## Archivos principales tocados

### Módulos nuevos
- `modules/pharmacyRequest.js` — Solicitud FH
- `modules/prebiologicManager.js` — Prebiológico
- `modules/treatmentEventsManager.js` — Eventos terapéuticos

### Módulos modificados
- `modules/dataManager.js` — Normalización LES/Sjögren, estadísticas multipatología
- `modules/exportManager.js` — Exportación CSV/TXT para LES y Sjögren
- `modules/formController.js` — Visibilidad por patología, wiring de calculadoras
- `modules/scoreCalculators.js` — SLEDAI-2K, SLICC, ESSPRI, ESSDAI
- `modules/fieldNormalizer.js` — Alias CIP, normalización LES/Sjögren

### Scripts de página
- `scripts/script_dashboard.js` — KPIs adaptativos, eventos, timeline
- `scripts/script_estadisticas.js` — Estadísticas multipatología
- `scripts/script_primera_visita.js` — Formularios LES/Sjögren, botón FH
- `scripts/script_seguimiento.js` — Formularios LES/Sjögren, botón FH

### HTML
- `primera_visita.html` — Secciones LES y Sjögren
- `seguimiento.html` — Secciones LES y Sjögren
- `dashboard_paciente.html` — Timeline, badge prebiológico
- `estadisticas.html` — Selectores nuevos
- `index.html` — Label CIP

### CSS
- `style_dashboard.css` — Badge prebiológico, timeline
- `style_seguimiento.css` — Formularios LES/Sjögren

### Demo y scripts
- `scripts/generate_demo_db.py` — Generador de cohorte ficticia
- `data/Hub_Clinico_Maestro_V2_DEMO.xlsx` — Base demo 30 pacientes

---

## Validación realizada

- **Checklist E2E v2:** 110+ checks, resultado **APTO**
- **Pacientes demo validados:** 30 pacientes, 5 patologías, 109 visitas
- **Dashboards individuales:** AR, EspA, APs, LES, Sjögren ✅
- **Estadísticas poblacionales:** 5 patologías ✅
- **Solicitud FH:** 5 patologías ✅
- **Prebiológico:** 4 estados ✅
- **Consola JS:** 0 errores críticos ✅
- **Sintaxis JS:** 12/12 archivos pasan `node --check` ✅

---

## Qué queda fuera de alcance

- Exportación de estadísticas a CSV (no implementada en esta versión).
- Checklist SLICC ítem por ítem (implementado como entrada estructurada por dominios).
- Backend persistente: todo sigue siendo local-first, sessionStorage + Excel.
- Frameworks: sigue siendo HTML/CSS/JS vanilla.

---

## Riesgos conocidos

1. **Tratamiento_Actual como texto libre:** la detección de cambios de tratamiento por string puede ser frágil.
2. **Eventos terapéuticos derivados:** no se persisten como tabla propia, dependen del historial de visitas.
3. **Prebiológico en sessionStorage:** se pierde al limpiar navegador.
4. **APS/DAPSA selector:** muestra DAPSA aunque la demo no tenga datos DAPSA. No bloqueante: se resuelve con datos reales.

---

## Pendientes no bloqueantes

| # | Pendiente | Severidad | Solución |
|---|-----------|-----------|----------|
| 1 | Selector APS muestra DAPSA sin datos DAPSA en demo | Baja | Datos reales |
| 2 | Exportación estadísticas a CSV | Media | Fase futura |
| 3 | Checklist SLICC completo | Baja | Fase futura |

---

## Instrucciones de prueba rápida

1. Clonar/actualizar rama `feature/reuma-v2-prebiologico-fh-les-sjogren`.
2. Abrir `index.html` en navegador (Chrome/Edge recomendado).
3. Cargar `data/Hub_Clinico_Maestro_V2_DEMO.xlsx`.
4. Probar:
   - Buscar DEMO-AR-001 → dashboard → Solicitud FH
   - Buscar DEMO-LES-001 → dashboard → SLEDAI-2K/SLICC
   - Buscar DEMO-SJOGREN-001 → dashboard → ESSPRI/ESSDAI
   - Ir a Estadísticas → filtrar por cada patología
5. Verificar consola (F12) sin errores rojos.

---

## Recomendación

**APTO para merge a `main`.**  
La rama está 37 commits por delante, 0 por detrás. Sin bugs bloqueantes conocidos. Validación E2E completa.

---

*Documento generado para revisión antes de PR/merge. No crear PR sin autorización explícita.*
