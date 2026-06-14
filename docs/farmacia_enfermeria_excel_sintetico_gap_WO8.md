# WO8.1c — Gap: Excel sintético de Enfermería / inicio biológico

**Estado:** `pending_review`
**Fecha:** 2026-06-14
**WO asociada:** WO8.1c — Datos sintéticos FH

---

## 1. No se encontró plantilla base de Enfermería

Tras búsqueda exhaustiva en el repositorio:

- **No existe** ningún archivo con nombre `enfermeria`, `inicio_biologico` o `biologico` en el directorio `templates/`.
- **No existe** ningún archivo con estos nombres en `data/`.
- **No existe** la plantilla `Enfermeria_Inicio_Biologico*.xlsx` en ninguna ruta del repositorio.
- Las únicas plantillas Excel existentes son las de Farmacia Hospitalaria (`farmacia_excel_operativo_FH_WO8_v1.xlsx` y su versión sintética).

El flujo de Enfermería para inicio biológico está documentado parcialmente en el código funcional del Hub:
- `scripts/farmacia_prebiologico.js` — helper de evaluación prebiológica (TB, serologías, vacunas).
- `scripts/farmacia_validacion.js` — validación farmacoterapéutica.
- Los datos de enfermería prebiológica se capturan desde la pantalla de validación.

Pero **no existe un Excel base de Enfermería** que organice los pacientes pendientes de validación prebiológica como herramienta operativa similar al Excel FH.

---

## 2. Por qué no se inventa un Excel de Enfermería en esta WO

1. **No hay estructura canónica definida.** El contrato WO8 define la estructura del Excel FH operativo, pero no define un Excel de Enfermería. No hay contrato documental equivalente.
2. **Riesgo de divergencia semántica.** Si se inventa un Excel de Enfermería sin contrato, su estructura podría no alinearse con el modelo relacional futuro ni con las pantallas del Hub (validación prebiológica).
3. **La WO8.1c se centra en FH.** El dataset sintético FH ya cubre los casos de validación prebiológica dentro de las hojas de servicio (bloque E: validación farmacoterapéutica).
4. **El gap es documental, no de datos.** Los pacientes pendientes de validación con datos prebiológicos incompletos ya existen en el Excel FH sintético (ej. DERMA-001 pendiente de TB y vacunas, DIGESTIVO-001 pendiente de validación inicial).

---

## 3. Propuesta de columnas mínimas para Excel de Enfermería (futuro)

Si en el futuro se decide crear un Excel de Enfermería / inicio biológico, estas son las columnas mínimas recomendadas basadas en el contrato WO8 y el helper prebiológico existente:

### Bloque A: Identificación paciente
| Columna | Tipo | Descripción |
|---|---|---|
| `patient_id` | string | ID del paciente |
| `cip_demo_o_hash` | string | CIP demo o hash |
| `nhc` | string | NHC |
| `nombre_apellidos` | string | Nombre (sintético) |
| `fecha_nacimiento` | date | Fecha nacimiento |
| `servicio_origen` | string | Derma, Reuma, Digestivo |
| `patologia_indicacion` | string | Patología |
| `profesional_enfermeria` | string | Enfermera/o responsable |

### Bloque B: Estado prebiológico
| Columna | Tipo | Descripción |
|---|---|---|
| `tb_estado` | string | `pendiente`, `negativo`, `positivo`, `no_informado` |
| `tb_fecha` | date | Fecha de resultado TB |
| `serologias_estado` | string | `pendiente`, `completo`, `incompleto` |
| `serologias_fecha` | date | Fecha serologías |
| `vacunas_estado` | string | `pendiente`, `completo`, `incompleto` |
| `vacunas_fecha` | date | Fecha vacunación |
| `bloqueante_prebiologico` | string | Bloqueante activo si lo hay |
| `estado_global_prebio` | string | `ok`, `pendiente`, `bloqueado` |

### Bloque C: Validación
| Columna | Tipo | Descripción |
|---|---|---|
| `fecha_validacion` | date | Fecha de validación |
| `resultado_validacion` | string | `validado`, `pendiente`, `rechazado` |
| `farmaco_propuesto` | string | Fármaco propuesto (marca) |
| `principio_activo` | string | Principio activo |
| `derivado_desde` | string | Servicio que deriva |
| `observaciones` | string | Observaciones |

### Bloque D: Trazabilidad
| Columna | Tipo | Descripción |
|---|---|---|
| `created_at` | datetime | Fecha creación |
| `demo_flag` | boolean | TRUE para demo |
| `estado_registro` | string | `pendiente`, `completado` |

**Total estimado:** ~20 columnas.

---

## 4. Recomendación para WO futura

**WO recomendada:** `WO8.1d — Plantilla Excel Enfermería inicio biológico sintético`

**Acciones:**
1. Definir contrato documental de Enfermería (similar al WO8 pero para prebiológico).
2. Crear plantilla Excel base de Enfermería con las columnas mínimas propuestas.
3. Crear versión sintética poblada con los casos descritos en WO8.1c §14.
4. Integrar con el Excel FH: el `patient_id` debe ser el mismo que en FH para trazabilidad.

**Dependencias:**
- Contrato WO8 ya define la evaluación prebiológica como bloque E del Excel FH.
- El helper `FarmaciaPrebiologico.evaluatePatientPrebiologico()` es la fuente JS de verdad.
- No hay urgencia: los casos de validación prebiológica ya están cubiertos en el dataset FH sintético.

---

**Status:** `pending_review`
**Siguiente acción:** Sil/Cora decide si crear WO8.1d o posponer hasta después de validar WO8.1c.
