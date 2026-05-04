# Contrato de Datos Reuma v2

> Revisión 2026-05-04, AUDIT-FIX-2. Contrato vigente Reuma v2: 5 hojas clínicas con 497 columnas cada una. El bloque prebiológico/vacunación va embebido por visita. La Solicitud FH es una salida derivada de texto y no se persiste como hoja ni columna.

---

## 1. Hojas del Excel maestro v2

| Hoja | Contenido | Estado |
|---|---|---|
| `ESPA` | Espondiloartritis axial (existente) | Conservada |
| `APS` | Artritis psoriásica (existente) | Conservada |
| `AR` | Artritis reumatoide (existente) | Conservada |
| `LES` | Lupus eritematoso sistémico | **Nueva v2** |
| `SJOGREN` | Síndrome de Sjögren | **Nueva v2** |
| `Profesionales` | Catálogo de profesionales | Existente |
| `Farmacos` | Catálogo de fármacos | Existente |

No existen hojas clínicas obligatorias separadas para `Prebiologico`, `Solicitud_FH_Log`, `Informe_FH` ni `Solicitud_FH_Texto`.

---

## 2. Columnas comunes a todas las hojas clínicas

Todas las hojas de patología (ESPA, APS, AR, LES, SJOGREN) tienen **497 columnas**. Las primeras 321 columnas preservan el contrato histórico; las columnas v2 añaden bloque prebiológico/vacunación, LES, Sjögren y APs/DAPSA sin crear hojas clínicas adicionales.

El identificador visible canónico es `CIP`, pero el contrato Excel histórico conserva `ID_Paciente` como cabecera física compatible. El loader normaliza ambos.

Cabeceras base históricas de referencia:

1. `ID_Paciente`
2. `Nombre_Paciente`
3. `Sexo`
4. `Fecha_Visita`
5. `Tipo_Visita` (`primera`, `seguimiento`)
6. `Profesional`
7. `Diagnostico_Primario`
8. `Diagnostico_Secundario`
9. `Peso`
10. `Talla`
11. `IMC`
12. `TA`
13. `Comorbilidad_HTA`
14. `Comorbilidad_DM`
15. `Comorbilidad_DLP`
16. `Comorbilidad_ECV`
17. `Comorbilidad_Obesidad`
18. `Comorbilidad_Osteoporosis`
19. `Toxico_Tabaco`
20. `Toxico_Tabaco_Desc`
21. `Toxico_Alcohol`
22. `Toxico_Alcohol_Desc`
23. `Tratamiento_Actual`
24. `Fecha_Inicio_Tratamiento`
25. `Decision_Terapeutica`
26. `Cambio_Motivo`
27. `Cambio_Efectos_Adversos`
28. `Cambio_Descripcion_Efectos`
29. `Cambio_Biologico_Farmaco`
30. `Cambio_Biologico_Dosis`
31. `Fecha_Proxima_Revision`
32. `Comentarios_Adicionales`
33. Campos clínicos históricos restantes hasta columna 321.
34. Bloque v2 común embebido por visita desde columna 322, incluyendo `Estado_Prebiologico_Final` y `Fecha_Validacion_Prebiologico`.
35. Bloque APs/DAPSA en columnas 492-497: `DAPSA_Result`, `DAPSA_NAD68`, `DAPSA_NAT66`, `DAPSA_EVA_Dolor_Paciente`, `DAPSA_EVA_Global_Paciente`, `DAPSA_PCR`. En hojas no APs exporta `NA`.

> **Nota de compatibilidad**: Las hojas ESPA/APS/AR existentes usan `ID_Paciente` en lugar de `CIP`. El loader normaliza ambos campos mediante `HubTools.normalizer.getPatientCIP()`.

---

## 3. Reglas de codificación

| Valor | Significado |
|---|---|
| `SI` | Presente / positivo / cumplido |
| `NO` | Ausente / negativo / no cumplido |
| `ND` | No determinado / no interrogado / no analizado |
| `NA` | No aplica por patología o tipo de visita |
| `""` (vacío) | Texto libre sin dato |

---

## 4. Referencias por patología

- Columnas específicas de **LES**: ver `docs/template_les_excel.md`
- Columnas específicas de **Sjögren**: ver `docs/template_sjogren_excel.md`
- Columnas específicas de **APs/DAPSA**: ver `docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md`, posiciones 492-497.
- Columnas de **prebiológico**: bloque común embebido por visita; ver `docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md`.
- Estructura de **Solicitud FH**: salida derivada de texto; no columna/hoja persistida.
- Columnas históricas ESPA/APS/AR: ver `docs/CONTRATO_DATOS_UNIFICADO.md`

---

## 5. Regla de longitudinalidad

Cada patología mantiene primera visita y seguimiento en la misma hoja mediante `Tipo_Visita`. No se crean hojas separadas por tipo de visita.

---

## 6. Cambios respecto a v1

- `ID_Paciente` → `CIP` como identificador canónico visible (con alias de lectura para compatibilidad).
- Añadidas columnas transversales `Estado_Prebiologico_Final` y `Fecha_Validacion_Prebiologico` a todas las hojas clínicas.
- Añadidas columnas APs/DAPSA al final del contrato v2. `DAPSA_PCR` se guarda como PCR mg/L; el cálculo DAPSA convierte a mg/dL dividiendo entre 10.
- Nuevas hojas clínicas: `LES`, `SJOGREN`.
- No se crean hojas `Prebiologico` ni `Solicitud_FH_Log` en el contrato vigente.
- ASDAS en AR: columnas conservadas pero codificadas como `NA` (ver Fase 2 del plan).

---

## 7. Columnas propuestas para eventos terapéuticos (futuro v2+)

Estas columnas **no existen actualmente** en las hojas clínicas. Se documentan como propuesta para una futura versión en la que los eventos terapéuticos se persistan explícitamente en lugar de derivarse desde visitas.

| Columna | Tipo | Descripción |
|---|---|---|
| `Evento_Terapeutico_Tipo` | string | Tipo de evento detectado (`treatment_start`, `treatment_change`, `treatment_suspend`, `biologic_start`, `biologic_change`, `adverse_event`, `flare`, `remission`, `prebiologic_apto`, `fh_request`) |
| `Evento_Terapeutico_Descripcion` | string | Descripción textual del evento legible para el clínico |
| `Evento_Terapeutico_Fecha` | date | Fecha del evento (fecha de visita asociada) |
| `Biologico_Actual` | string | Fármaco biológico en curso en el momento del evento |
| `Biologico_Fecha_Inicio` | date | Fecha de inicio del biológico actual |

### 7.1. Estado actual (v2)

En la versión actual del sistema, los eventos terapéuticos **se derivan** desde el historial de visitas mediante `modules/treatmentEventsManager.js` y no se persisten como tabla propia. El módulo genera objetos inmutables de evento a partir de los campos de visita existentes (`Tratamiento_Actual`, `Decision_Terapeutica`, `planBiologicoEntries`, `Cambio_Efectos_Adversos`, scores de actividad, estado prebiológico en sessionStorage).

**Campos fuente utilizados:**
- `Tratamiento_Actual` — tratamiento activo en la visita
- `Fecha_Inicio_Tratamiento` — fecha de inicio del tratamiento actual
- `Decision_Terapeutica` — decisión clínica (`continuar`, `cambiar`, `suspender`, `iniciar`)
- `Cambio_Efectos_Adversos` — boolean que indica efectos adversos reportados
- `Cambio_Descripcion_Efectos` — descripción de los efectos adversos
- `planBiologicoEntries`, `previoBiologicoEntries` — fármacos biológicos planificados/previos
- `biologicoSelect`, `fameSelect`, `sistemicoSelect` — selectores de tratamiento
- Scores de actividad por patología: DAS28, CDAI, SDAI, BASDAI, ASDAS, DAPSA, SLEDAI-2K, ESSDAI, ESSPRI
- `Estado_Prebiologico_Final` y `Fecha_Validacion_Prebiologico` — estado prebiológico persistido por visita

**Formato de evento derivado** (inmutable, en memoria):
```javascript
{
  id: string,              // hash: `${type}_${date}_${index}`
  date: string,            // ISO date de la visita
  type: string,            // tipo de evento (ver columna arriba)
  description: string,     // texto humano
  source: string,          // 'visit', 'prebiologic', 'manual'
  visitIndex: number|null, // índice en allVisits
  metadata: {
    previousValue?: any,
    currentValue?: any,
    severity?: string,     // 'leve', 'moderado', 'grave'
    scoreDelta?: number,
    notes?: string
  }
}
```

Si en el futuro se decide persistir eventos explícitos, se crearán las columnas listadas arriba en una hoja `Eventos_Terapeuticos` o como columnas adicionales en las hojas de visita.

---

## AUDIT-FIX-2 ejecutado — DAPSA incorporado al contrato APs

- Motivo: APs requería DAPSA como métrica principal persistida y auditable.
- El contrato vigente pasa de 491 a 497 columnas por hoja clínica.
- Columnas añadidas al final del contrato: `DAPSA_Result`, `DAPSA_NAD68`, `DAPSA_NAT66`, `DAPSA_EVA_Dolor_Paciente`, `DAPSA_EVA_Global_Paciente`, `DAPSA_PCR`.
- Impacto: exportación, demo, carga Excel, dashboard, estadísticas, eventos terapéuticos y Solicitud FH consumen DAPSA cuando está disponible.
- Para no APs estas columnas exportan `NA`; para APs quedan pobladas si existen los componentes.
