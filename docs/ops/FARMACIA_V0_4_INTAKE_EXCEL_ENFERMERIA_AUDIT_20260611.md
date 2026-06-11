# Auditoría Excel Enfermería — Intake Prebiológico v0.4

**Status:** `pending_review`
**Fecha:** 2026-06-11
**WO:** Farmacia v0.4 — Intake Excel Enfermería Prebiológico

---

## Hojas encontradas

| Hoja | Filas | Propósito |
|------|-------|-----------|
| `INICIO_BIOLOGICO` | 200 (4 datos, resto vacías) | Registro principal de enfermería — datos prebiológicos por paciente |
| `PANEL_ENFERMERIA` | 199 | Resumen automático calculado + instrucciones de uso |
| `LISTAS` | 200 | Listas de valores válidos para desplegables |
| `INSTRUCCIONES` | ~20 | Instrucciones rápidas para enfermería |

## Hoja principal: INICIO_BIOLOGICO

### Columnas encontradas (fila 4)

| # | Columna | Ejemplo | Tipo | Obligatorio |
|---|---------|---------|------|-------------|
| 1 | CIP | `000000001` | texto | Sí |
| 2 | Paciente | `Paciente A` | texto | Sí |
| 3 | Servicio | `Derma` | texto (lista) | Sí |
| 4 | Patología | `HS` | texto (lista) | Sí |
| 5 | Fármaco | `Secukinumab` | texto | Sí |
| 6 | Analítica | `OK` / `ALTERADA / BLOQUEO` | desplegable | Sí |
| 7 | Mantoux | `NEGATIVO` / `PENDIENTE` | desplegable | Sí |
| 8 | IGRA | `NEGATIVO` / `NO PRECISA` | desplegable | Sí |
| 9 | VHB | `NEGATIVO` / ... | desplegable | Sí |
| 10 | VHC | `NEGATIVO` | desplegable | Sí |
| 11 | VIH | `NEGATIVO` | desplegable | Sí |
| 12 | Med. Preventiva | `PENDIENTE` / `OK` | desplegable | Sí |
| 13 | Estado | `EN VIGILANCIA` / `BLOQUEADO` / `OK FARMACIA` | **calculado** | Sí |
| 14 | Fecha OK | `2026-06-12` | fecha | No |
| 15 | Observación prebiológico | `Pendiente cita Preventiva` | texto libre | No |

### Mapeo propuesto a modelo JSON

| Campo Excel | Campo JSON | Notas |
|-------------|-----------|-------|
| CIP | `patient_id` | Prefijo CIP-DEMO- |
| Paciente | `display_id` | FH-XXX |
| Servicio | `service` | Directo |
| Patología | `pathology` | Directo |
| Fármaco | `proposed_biologic.name` | Se separa nombre, dosis/ruta/vía opcionales |
| Analítica | `prebiologic_status.analytics_status` | OK / ALTERADA / PENDIENTE |
| Mantoux | `prebiologic_status.tb_screening_status` | Se fusiona Mantoux+IGRA en un campo |
| IGRA | (fusionado con Mantoux) | |
| VHB+VHC+VIH | `prebiologic_status.serologies_status` | OK si todos negativos |
| Med. Preventiva | `prebiologic_status.vaccination_status` | |
| Estado | `prebiologic_status.global_status` | EN VIGILANCIA → `pendiente_servicio`, BLOQUEADO → `devuelto_servicio`, OK FARMACIA → `ok_para_validacion` |
| Fecha OK | N/A | Se almacena como `imported_at` |
| Observación | `nursing_observations` | Directo |

### Estados encontrados en datos demo

| Estado Excel | Significado | Clasificación JSON |
|-------------|-------------|-------------------|
| `EN VIGILANCIA` | Enfermería sigue vigilando | `pendiente_servicio` |
| `BLOQUEADO` | Algo impide continuar | `devuelto_servicio` |
| `OK FARMACIA` | Todo OK, farmacia puede validar | `ok_para_validacion` |

### Campos obligatorios para integración

- CIP (identificador)
- Servicio
- Patología
- Fármaco
- Estado prebiológico global (derivado de analítica + cribados + preventiva)
- Observaciones de enfermería

### Dudas para Sil/Farmacia

- **CIP vs ID interno:** El Excel usa CIP numérico (`000000001`). El Hub usa `CIP-DEMO-FH-XXX`. ¿Mapeamos directamente o generamos IDs Hub?
- **Estados calculados vs manuales:** El Excel dice que el Estado es automático según los campos clínicos. En el Hub calculamos o respetamos el valor del Excel?
- **Fecha OK:** Solo se rellena cuando Estado=OK FARMACIA. ¿La usamos como fecha de "listo para validación"?
- **Multiservicio:** Un paciente puede estar en varios servicios. ¿El Excel asume un registro por paciente-servicio?

### Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Duplicados por CIP repetido | Alto | Validar CIP único antes de importar |
| Datos incompletos (filas sin todos los campos) | Medio | Validar campos obligatorios en script |
| Desbordamiento de columnas si el Excel cambia | Bajo | Mapeo por nombre de columna, no por índice |
| Estado calculado no coincide con reglas Hub | Medio | Documentar diferencia y decidir con Farmacia |

---

**Status:** `pending_review` — Pendiente de validación por Sil antes de implementar mapeo definitivo.

---

## Corrección P1 final — Precarga prebiológica desde Intake

**Fecha:** 2026-06-11
**SHA:** a48bc42 → 4bfb959

### Problemas corregidos

1. **setChipValue** usaba `textContent` en vez de manejar radios correctamente.
2. **IDs de serologías** incorrectos: `fhAnaliticaVHB/VHC/VIH` → `fhAnaliticaSerologiasVhb/Vhc/Vih`.
3. **Mapeo de serologías** solo manejaba OK. Ahora: OK→Negativo, PENDIENTE→Pendiente, ALTERADA→observación.
4. **Mapeo de Mantoux/IGRA** simplificado. Ahora: NEGATIVO→Negativo, PENDIENTE→Pendiente, POSITIVO+TRATADO→"Positivo - tratado", POSITIVO sin TRATADO→Pendiente+obs, NO PRECISA→obs.
5. **Mapeo de vacunación** pasaba valor crudo. Ahora: OK→si, PENDIENTE→pendiente, NO PRECISA→no+obs.
6. **Principio activo** usaba `bio.active_principle`. Ahora: `bio.principio_activo || bio.active_principle`.
7. **Helper appendObservationIfExists** añadido para observaciones seguras.
8. **Función importarExcelEnfermeria** eliminada (no conectada a UI).
9. **Cache busting** actualizado a `v=20260611-intake-c`.

### Validaciones

- `node --check scripts/farmacia_validacion.js` → OK
- `node tools/farmacia_smoke_check.mjs` → OK
- `grep "fhAnaliticaVHB\|fhAnaliticaVHC\|fhAnaliticaVIH" scripts/farmacia_validacion.js` → 0 resultados
- `grep "innerHTML" scripts/farmacia_validacion.js farmacia_validacion.html` → 0 resultados

**Status:** `pending_review`

---

## Corrección P2 — Demo coherente: Derma/HS + causalidad EA + múltiples biológicos
**Fecha:** 2026-06-11
**SHA:** dd7f394 → (nuevo SHA tras commit)

### Cambios
1. JSON demo INTAKE-FH-003 cambiado a Derma/HS/Secukinumab 300mg.
2. Bloque causalidad EA añadido (fhEaNotificado, fhEaTipo, fhEaGravedad, fhEaAccion, fhEaCausalidad + 7 criterios checklist).
3. Precarga defensiva de EA desde data.adverse_event || data.adverseEvent.
4. Sección tratamientos concomitantes con botón "Añadir otro fármaco" + filas dinámicas.
5. Precarga de otros biológicos desde data.other_biologics || data.concomitant_treatments.
6. Export TXT/CSV ampliado con bloques EA y concomitantes.
7. Estilos CSS para EA y concomitantes.
8. Cache busting actualizado a v=20260611-intake-d.

### Validaciones
- node --check scripts/farmacia_validacion.js → OK
- node tools/farmacia_smoke_check.mjs → OK
- grep innerHTML → 0 resultados
- grep IDs antiguos serologías → 0 resultados

**Status:** pending_review

---

## Corrección final pre-demo — Intake visibility
**Fecha:** 2026-06-11
**SHA base:** 556364d

### Problemas detectados
1. Bloques EA y concomitantes solo visibles si había datos adverse_event/other_biologics.
2. fhEaTipo era select con opciones incorrectas (Leve/Moderado/Grave) en vez de input texto.
3. Causalidad incluía 'Definitiva' (no válida) y 'No evaluable' (debe ser 'No evaluada').
4. Nota visible con referencias a Naranjo/WHO-UMC.
5. INTAKE-FH-003 tenía principio_activo vacío.
6. CSV no exportaba resumen de fármacos concomitantes.
7. TXT no exportaba secciones EA/concomitantes si vacías.

### Correcciones aplicadas
- T1: showIfExists helper — eaBlock y concomitantesBlock siempre visibles.
- T2: Valores por defecto EA cuando no hay data.adverse_event.
- T3: fhEaTipo → input texto con placeholder.
- T4: Opciones causalidad corregidas.
- T5: Nota Naranjo/WHO-UMC sustituida.
- T6: Mensaje vacío en concomitantes.
- T7: principio_activo INTAKE-FH-003 = 'Secukinumab'.
- T8: Columna OtrosFarmacosResumen en CSV.
- T9: TXT siempre exporta EA y concomitantes.
- T11: Cache bust v=20260611-intake-e.

### Limitaciones
- Criterios causalidad orientativos, no validados clínicamente.
- Datos demo sintéticos, sin integración real.

**Status:** pending_review
