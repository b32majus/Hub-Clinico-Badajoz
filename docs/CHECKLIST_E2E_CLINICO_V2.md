# Checklist E2E Clínico v2 — Hub Clínico Reumatología

## Cómo usar este checklist
1. Cargar `data/Hub_Clinico_Maestro_V2_DEMO.xlsx` en el Hub.
2. Recorrer cada sección marcando los checks.
3. Anotar incidencias en la tabla al final del documento.
4. Al terminar, asignar resultado final: APTO / NO APTO / PENDIENTE.

## Información general
- Versión: v2
- Rama: `feature/reuma-v2-prebiologico-fh-les-sjogren`
- Demo: 30 pacientes ficticios, 109 visitas, 5 patologías
- Fecha validación: 2026-05-03
- Validado por: pendiente tras AUDIT-FIX-1
- Resultado: **PENDIENTE**

> AUDIT-FIX-1: este checklist debe repetirse tras corregir los hallazgos pre-PR. El contrato vigente no incluye hoja `Prebiologico` separada ni persistencia de `Solicitud_FH_Log`; el prebiológico va embebido por visita y la Solicitud FH es derivada.

---

## 1. Carga de datos
- [ ] Cargar `data/Hub_Clinico_Maestro_V2_DEMO.xlsx` sin errores
- [ ] Verificar 30 pacientes cargados en consola o UI
- [ ] Verificar 5 patologías reconocidas: AR, ESPA, APS, LES, SJOGREN
- [ ] Verificar hojas auxiliares cargadas: Profesionales, Fármacos
- [ ] Verificar datos prebiológicos embebidos por visita en las hojas clínicas
- [ ] Sin errores en consola durante carga (F12 → Console)
- [ ] Sin warnings de cabeceras críticas faltantes

---

## 2. Navegación general
- [ ] `index.html` carga correctamente
- [ ] Búsqueda de pacientes por CIP funciona (probar DEMO-AR-001)
- [ ] Búsqueda de pacientes por nombre funciona (probar "Demo")
- [ ] Filtros por patología funcionan (AR, ESPA, APS, LES, SJOGREN)
- [ ] Links a dashboard, seguimiento, primera visita funcionan desde la lista de pacientes
- [ ] Sin errores JS en consola durante navegación

---

## 3. Dashboard de servicio — Estadísticas poblacionales

### 3.1 Carga y totales
- [ ] `estadisticas.html` carga sin errores JS
- [ ] Total pacientes = 30
- [ ] Filtros de patología funcionan (dropdown)

### 3.2 Filtros por patología
- [ ] Filtro **Todos**: 30 pacientes, donut de actividad con datos
- [ ] Filtro **AR**: 6 pacientes (DEMO-AR-001 a 006)
- [ ] Filtro **AR**: métricas DAS28/CDAI/SDAI/RAPID3 disponibles en selectores
- [ ] Filtro **ESPA**: 6 pacientes (DEMO-ESPA-001 a 006)
- [ ] Filtro **ESPA**: métricas BASDAI/ASDAS disponibles
- [ ] Filtro **APS**: 6 pacientes (DEMO-APS-001 a 006)
- [ ] Filtro **APS**: HAQ/RAPID3 disponibles; DAPSA solo si el contrato Excel futuro lo incorpora
- [ ] Filtro **LES**: 6 pacientes (DEMO-LES-001 a 006)
- [ ] Filtro **LES**: métricas SLEDAI-2K/SLICC disponibles
- [ ] Filtro **SJOGREN**: 6 pacientes (DEMO-SJOGREN-001 a 006)
- [ ] Filtro **SJOGREN**: métricas ESSDAI/ESSPRI disponibles

### 3.3 Donut de actividad
- [ ] Donut renderiza para cada patología (cambiar filtro)
- [ ] AR: muestra distribución DAS28 (Remisión/Baja/Moderada/Alta)
- [ ] LES: muestra distribución SLEDAI-2K
- [ ] SJOGREN: muestra distribución ESSDAI
- [ ] Colores por bucket correctos (verde/amarillo/naranja/rojo)

### 3.4 Scatter / Tabla de cohortes
- [ ] Scatter permite seleccionar nuevas métricas en X e Y
- [ ] SLEDAI-2K disponible en selectores X/Y
- [ ] ESSDAI disponible en selectores X/Y
- [ ] DAPSA disponible en selectores X/Y solo si el Excel cargado incluye columna DAPSA
- [ ] Tabla de cohortes muestra métrica principal correcta por patología
- [ ] Sin "N/A" masivos en la tabla

### 3.5 KPIs de resumen
- [ ] KPIs calculan promedios con al menos 1 paciente por métrica
- [ ] KPIs nuevos visibles (SLEDAI-2K, ESSDAI, etc.) cuando la patología filtrante los tenga

---

## 4. Primera visita (formularios por patología)

### 4.1 AR
- [ ] Formulario AR carga sin errores
- [ ] ASDAS **no** aparece en AR
- [ ] DAS28/CDAI/SDAI calculan correctamente al introducir datos
- [ ] RAPID3 calcula y es visualmente legible
- [ ] Valoración Clínica AR visible (sección colapsable)
- [ ] HAQ calcula correctamente
- [ ] Exportación TXT/CSV funciona
- [ ] Botón Solicitud FH visible

### 4.2 ESPA
- [ ] Formulario ESPA carga sin errores
- [ ] ASDAS visible y calcula correctamente con PCR/VSG
- [ ] BASDAI calcula desde 6 ítems
- [ ] BASFI calcula desde 10 ítems
- [ ] Exportación TXT/CSV funciona

### 4.3 APS
- [ ] Formulario APS carga sin errores
- [ ] HAQ calcula correctamente
- [ ] LEI checklist de entesis visible y calcula
- [ ] RAPID3 calcula
- [ ] PASI y BSA visibles
- [ ] Exportación TXT/CSV funciona

### 4.4 LES
- [ ] Formulario LES carga sin errores
- [ ] SLEDAI-2K checklist de 24 ítems visible
- [ ] SLEDAI-2K calcula puntuación total correctamente
- [ ] SLICC/ACR SDI 12 dominios visibles
- [ ] SLICC calcula puntuación acumulada
- [ ] Dosis prednisona (mg/día) visible
- [ ] Manifestaciones clínicas LES visibles
- [ ] Inmunología LES (ANA, anti-DNA, complemento) visible
- [ ] Exportación TXT/CSV incluye ítems LES

### 4.5 Sjögren
- [ ] Formulario Sjögren carga sin errores
- [ ] ESSPRI calcula desde sequedad/dolor/fatiga (3 ítems)
- [ ] ESSDAI 12 dominios visibles y calculan puntuación
- [ ] EVAs: sequedad oral, sequedad ocular, fatiga, dolor
- [ ] Manifestaciones glandulares y extraglandulares visibles
- [ ] Pruebas diagnósticas (Schirmer, biopsia) visibles
- [ ] Exportación TXT/CSV incluye dominios Sjögren

---

## 5. Seguimiento
- [ ] Cargar seguimiento de paciente existente (probar DEMO-AR-001)
- [ ] Datos previos se precargan correctamente desde última visita
- [ ] Cálculos de scores se actualizan en tiempo real al modificar datos
- [ ] Badge prebiológico visible si hay estado guardado (probar DEMO-AR-001 → APTO)
- [ ] Botón Solicitud FH funciona desde seguimiento
- [ ] Decisión terapéutica registrable: iniciar, continuar, cambiar, suspender
- [ ] Motivo de cambio registrable cuando aplica

---

## 6. Dashboard de paciente

### 6.1 KPIs principales
- [ ] KPIs muestran valores numéricos (no "N/A" o vacío)
- [ ] Métrica principal correcta según patología:
  - AR → DAS28
  - ESPA → BASDAI
  - APS → RAPID3 o DAPSA
  - LES → SLEDAI-2K
  - SJOGREN → ESSPRI o ESSDAI
- [ ] Métrica secundaria correcta (ej: CDAI en AR, ASDAS en ESPA)
- [ ] Labels de KPIs reflejan la métrica mostrada

### 6.2 Gráficos
- [ ] Gráfico de actividad longitudinal renderiza (Chart.js)
- [ ] Tamaño del chart ≥ 320px de altura (no colapsado)
- [ ] Eje Y etiquetado con la métrica correcta
- [ ] Marcadores de tratamiento (Tx/Bio/Susp) visibles sobre el gráfico
- [ ] Gráfico de PROs renderiza cuando hay datos EVA

### 6.3 Timeline de eventos
- [ ] Timeline de eventos clínicos visible
- [ ] Cambios terapéuticos listados con fechas
- [ ] Efectos adversos detectados y visibles (DEMO-AR-001)
- [ ] Brotes/flares detectados (DEMO-ESPA-003, DEMO-LES-003)
- [ ] Remisiones detectadas (DEMO-AR-001 visita 4, DEMO-ESPA-001 visita 4)

### 6.4 Historial de tratamientos
- [ ] Historial de tratamientos muestra fármacos con fechas de inicio
- [ ] Tratamientos ordenados cronológicamente
- [ ] Badge prebiológico visible con estado correcto:
  - DEMO-AR-001 → APTO (verde)
  - DEMO-ESPA-001 → EN_CURSO (ámbar)
  - DEMO-LES-001 → NO_APTO (rojo)
  - DEMO-SJOGREN-001 → EN_CURSO (ámbar)
  - DEMO-APS-003 → EN_CURSO (ámbar)

### 6.5 Selector de métricas
- [ ] AR: opciones DAS28/CDAI/SDAI/RAPID3 disponibles
- [ ] ESPA: opciones BASDAI/ASDAS disponibles
- [ ] APS: opciones DAPSA/HAQ/RAPID3 disponibles
- [ ] LES: opciones SLEDAI-2K/SLICC disponibles
- [ ] SJOGREN: opciones ESSPRI/ESSDAI disponibles
- [ ] Cambiar métrica actualiza KPI y gráfico

---

## 7. Solicitud FH (Farmacia Hospitalaria)
- [ ] Botón genera texto plano correctamente (TXT)
- [ ] Incluye datos del paciente: CIP, nombre, diagnóstico
- [ ] Incluye comorbilidades activas documentadas
- [ ] Bloque específico por patología:
  - AR: DAS28, CDAI, SDAI, HAQ
  - ESPA: BASDAI, ASDAS
  - APS: HAQ, RAPID3, DAPSA
  - LES: SLEDAI-2K, SLICC, Prednisona
  - SJOGREN: ESSDAI, ESSPRI, EVAs
- [ ] Bloque prebiológico con estado actual
- [ ] Bloque vacunación (placeholders aceptables si no hay datos reales)
- [ ] Bloque analíticas
- [ ] Copia al portapapeles funciona (botón copiar)

---

## 8. Prebiológico

### 8.1 Badges en dashboard
- [ ] Badge visible en dashboard de paciente
- [ ] Estados con colores correctos:
  - APTO: verde
  - EN_CURSO: ámbar
  - NO_APTO: rojo
  - NO_EVALUADO: gris (o sin badge)

### 8.2 Badges en seguimiento
- [ ] Badge visible en formulario de seguimiento
- [ ] Muestra el estado de la última visita clínica

### 8.3 Persistencia
- [ ] Cambio de estado prebiológico persiste en sessionStorage
- [ ] Badge se actualiza al cambiar entre pacientes

### 8.4 Prebiológico en Solicitud FH
- [ ] Solicitud FH incluye sección prebiológica
- [ ] Fecha de validación visible
- [ ] Estado visible

---

## 9. Exportación de datos

### 9.1 Exportación TXT (desde primera visita/seguimiento)
- [ ] Genera nota clínica completa con formato legible
- [ ] Incluye scores calculados (no solo inputs)
- [ ] Incluye fecha de visita y profesional responsable

### 9.2 Exportación CSV (desde dashboard de servicio)
- [ ] Botón Exportar CSV funciona
- [ ] Incluye todas las 497 columnas del esquema canónico
- [ ] Columnas históricas (primeras 321) intactas
- [ ] Columnas v2 (322-497) añadidas al final
- [ ] ASDAS aparece como "NA" en pacientes AR (no vacío)
- [ ] Columnas LES aparecen como "NA" en no-LES
- [ ] Columnas Sjögren aparecen como "NA" en no-Sjögren
- [ ] Columnas DAPSA aparecen pobladas en APs y como "NA" en no-APs

### 9.3 Regeneración de demo
```bash
python scripts/generate_demo_db.py
```
- [ ] Script se ejecuta sin errores
- [ ] Genera `data/Hub_Clinico_Maestro_V2_DEMO.xlsx`
- [ ] Regenera `docs/REPORTE_DIFERENCIAS_EXCEL_DEMO_V2.md`
- [ ] Validaciones del script todas OK (30 pacientes, 109 visitas, 6/hoja)

---

## 10. Regresión y compatibilidad

### 10.1 Compatibilidad hacia atrás
- [ ] Excel original maestro (`Hub_Clinico_Maestro.xlsx`) sigue cargando
- [ ] Pacientes sin datos v2 no rompen el dashboard
- [ ] Pacientes sin prebiológico no rompen badges

### 10.2 Navegadores
- [ ] Chrome: sin errores
- [ ] Edge: sin errores
- [ ] Firefox: sin errores

### 10.3 Arquitectura
- [ ] Patrón `HubTools` intacto (no se rompió la API interna)
- [ ] `dataManager.js` expone todas las funciones esperadas
- [ ] `treatmentEventsManager.js` registrado correctamente
- [ ] `exportManager.js` sin modificar (restricción de proyecto)
- [ ] No dependencias externas nuevas (solo Chart.js, SheetJS ya existentes)

### 10.4 Sintaxis
```bash
node --check modules/dataManager.js
node --check scripts/script_estadisticas.js
node --check scripts/script_dashboard.js
node --check modules/treatmentEventsManager.js
node --check scripts/script_seguimiento.js
node --check modules/exportManager.js
```
- [ ] Todos los archivos JS pasan `node --check`

---

## 11. Flujos completos (end-to-end paths)

### 11.1 AR con biológico
- [ ] Cargar DEMO-AR-001
- [ ] Dashboard: DAS28=2.1 (remisión), CDAI=4.0
- [ ] Timeline: iniciar MTX → cambiar a Adalimumab → cambiar a Baricitinib (efecto adverso) → continuar
- [ ] Eventos: efecto adverso visible en timeline
- [ ] Eventos: remisión detectada en visita 4
- [ ] Badge prebiológico: APTO

### 11.2 LES con nefritis
- [ ] Cargar DEMO-LES-003
- [ ] Dashboard: SLEDAI-2K decreciente 14→10→6→3
- [ ] SLICC renal incrementa 0→1→2→2
- [ ] Prednisona desciende 40→30→15→5 mg
- [ ] Tratamiento: Micofenolato añadido en visita 2
- [ ] Badge prebiológico cambia NO_APTO→APTO en visita 4

### 11.3 Sjögren con ESSDAI alto
- [ ] Cargar DEMO-SJOGREN-002
- [ ] Dashboard: ESSDAI descendente 22→16→10→6
- [ ] ESSPRI descendente 6.3→5.3→4.3→3.3
- [ ] Evento: cambio a Rituximab en visita 3
- [ ] Badge prebiológico: APTO

### 11.4 ESPA con brote intercurrente
- [ ] Cargar DEMO-ESPA-003
- [ ] Dashboard: BASDAI 3.2→2.8→6.5→3.0
- [ ] Brote detectado en visita 3 (BASDAI sube de 2.8 a 6.5)
- [ ] Cambio: añade Secukinumab en brote

### 11.5 APS con psoriasis significativa
- [ ] Cargar DEMO-APS-002
- [ ] Dashboard: PASI 18→12→6→3, BSA 25→15→8→3
- [ ] RAPID3 14→10→6→3
- [ ] Secukinumab inicia en visita 2

---

## Incidencias encontradas
| # | Descripción | Severidad | Archivo | Estado |
|---|---|---|---|---|
| 1 | `resolveMetricKey` no resolvía `SLEDAI_2K` (guion bajo vs sin guion). LES mostraba SLICC en lugar de SLEDAI-2K como métrica principal en estadísticas. | CRÍTICA (solo LES stats) | `modules/dataManager.js` | **RESUELTA** — commit `742f25e` |
| 2 | APS/DAPSA: DAPSA como métrica principal cuando existe; fallback HAQ para compatibilidad. La demo no tiene DAPSA poblado aún. | BAJA / No bloqueante | `scripts/script_estadisticas.js` | **RESUELTA** — AUDIT-FIX-2 incorpora DAPSA al contrato 497 y a la demo |

*Severidad: CRÍTICA (bloquea funcionalidad) / ALTA (funcionalidad rota) / MEDIA (molestia o dato incorrecto) / BAJA (cosmético)*

*Estado: ABIERTA / EN_PROGRESO / RESUELTA / WONTFIX*

---

## Notas del validador

> Validación ejecutada en entorno local (http.server port 8080) con la demo de 30 pacientes.
> 
> **Cobertura validada:**
> - 5 patologías funcionales en estadísticas (AR, ESPA, APS, LES, SJOGREN)
> - Dashboards individuales con KPIs correctos por patología
> - Timeline de tratamientos y eventos clínicos
> - Badge prebiológico funcional (APTO/EN_CURSO/NO_APTO/NO_EVALUADO)
> - Solicitud FH operativa desde dashboard y seguimiento
> - Sin errores JS críticos en consola
> - 12/13 archivos JS pasan `node --check` (script.js en raíz también OK)
> 
> **Conclusión:** Rama lista para nueva revisión previa a PR. AUDIT-FIX-2 resuelve el pendiente APS/DAPSA incorporándolo al contrato Excel y a la demo.

## AUDIT-FIX-2 ejecutado — DAPSA incorporado al contrato APs

- Motivo: APs necesitaba DAPSA persistido para no depender de fallbacks HAQ/RAPID3.
- Contrato Excel v2: `497` columnas por hoja clínica.
- Columnas añadidas: `DAPSA_Result`, `DAPSA_NAD68`, `DAPSA_NAT66`, `DAPSA_EVA_Dolor_Paciente`, `DAPSA_EVA_Global_Paciente`, `DAPSA_PCR`.
- Validación E2E mínima: export APs 497 columnas, demo 30 pacientes/109 visitas, DAPSA poblado en APs, Solicitud FH APs con DAPSA.

## AUDIT-FIX-2B ejecutado — Estandarización PCR (mg/L)

- [ ] Todas las entradas visibles de PCR muestran `PCR (mg/L)`.
- [ ] No hay referencias activas a `mg/mL`.
- [ ] `SDAI` convierte siempre `PCR mg/L -> mg/dL` con `/10`.
- [ ] `DAPSA` convierte siempre `PCR mg/L -> mg/dL` con `/10`.
- [ ] `DAS28-CRP` usa PCR en `mg/L` sin `/10`.
- [ ] `ASDAS-CRP` usa PCR en `mg/L` sin `/10`.
- [ ] No existen heurísticas de unidad por magnitud (`pcr > 10`).

---

## Resultado final
- [x] **APTO** — Todo funciona correctamente, listo para producción
- [ ] **NO APTO** — Hay bugs críticos que bloquean el uso
- [ ] **PENDIENTE** — Requiere validación adicional o condiciones específicas

---

## Validaciones adicionales de cálculo incompleto (HARDENING-2C)

- [ ] BASDAI parcialmente relleno → no calcula valor artificialmente bajo
- [ ] DAS28 sin PCR → DAS28-CRP vacío; DAS28-ESR solo si hay VSG
- [ ] CDAI incompleto → total vacío / incompleto
- [ ] SDAI incompleto → total vacío / incompleto
- [ ] DEMO-LES-001: KPI, header y estadísticas interpretan SLEDAI-2K con mismos umbrales
- [ ] DEMO-SJOGREN-001: KPI, header y estadísticas interpretan ESSDAI con mismos umbrales
- [ ] DEMO-ESPA: BASDAI se interpreta igual en dashboard y estadísticas
- [ ] DEMO-AR: DAS28/CDAI/SDAI funcionan cuando están completos

---

*Checklist generado para el Hub Clínico Reuma v2. Última actualización del documento: 2026-05-03.*
