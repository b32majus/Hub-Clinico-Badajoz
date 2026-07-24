# Contrato de datos — Tratamiento farmacológico

**Versión:** 1.1
**Fecha:** 2026-07-18
**WO asociada:** WO7B (documental)
**Origen:** WO7A — Auditoría visual y contrato común de tratamiento farmacológico
**Estado de WO6:** `pending_review`
**Fuente activa funcional:** `work/farmacia-wo5-prebiologico-single-source-20260614`

---

## 1. Propósito

Este contrato define una entidad común de tratamiento farmacológico para el módulo de Farmacia Hospitalaria del Hub Clínico Badajoz.

Nace tras WO7A porque las pantallas de validación farmacoterapéutica, primera visita, seguimiento y dashboard representan hoy `fármaco`, `dosis`, `vía` y `pauta` de forma no homogénea.

El objetivo es fijar una base única de datos para futuras WOs sin modificar todavía helpers, formularios ni lógica funcional.

---

## 2. Problema que resuelve

Este contrato intenta resolver los siguientes problemas estructurales:

- duplicidad en primera visita;
- autocomplete no homogéneo;
- dosis, vía y pauta gestionadas de forma diferente;
- tratamientos principales vs concomitantes/adicionales/históricos/exposición;
- dashboard con shape terapéutico paralelo;
- riesgo de arreglar una pantalla y dejar otras rotas.

Riesgo principal:

- arreglar una pantalla y dejar otras conceptualmente divergentes o técnicamente desalineadas.

---

## 3. Principios

1. El tratamiento farmacológico es una entidad común.
2. Las pantallas pueden mostrarlo de forma distinta, pero no deben inventar contratos distintos.
3. Validación, primera visita, seguimiento y dashboard deben leer/escribir contra el mismo contrato base.
4. La pauta debe reutilizar el contrato WO6 cuando aplique.
5. CIMA/local identifica el medicamento y aporta trazabilidad de catálogo; no alimenta un snapshot terapéutico.
6. El seguimiento no debe crear de forma silenciosa una nueva línea terapéutica validada.
7. Concomitante, adicional, histórico y exposición no son lo mismo.
8. El dashboard debe ser proyección/lectura, no otro modelo paralelo.

---

## 4. Objeto canónico propuesto

```javascript
{
  tratamiento_id: "",
  paciente_cip: "",
  farmaco_nombre: "",
  nombre_comercial: "",
  principio_activo: "",
  dosis_valor: "",
  dosis_unidad: "",
  dosis_texto: "",
  presentacion: "",
  via: "",
  pauta: "",
  pauta_codigo: "",
  pauta_label: "",
  pauta_intervalo_dias: null,
  pauta_unidad: "",
  pauta_otro_texto: "",
  tipo_relacion: "",
  estado_linea: "",
  tipo_movimiento: "",
  fase_tratamiento: "",
  fecha_inicio: "",
  fecha_fin: "",
  motivo: "",
  observaciones: "",
  fuente: "",
  source_type: "",
  selected_drug_id: "",
  codigo_nacional: "",
  nregistro: "",
  es_principal: false,
  es_validado_farmacia: false,
  snapshot_origen: null
}
```

### Notas de interpretación

- `farmaco_nombre`: representación visible principal si la pantalla no distingue marca y resumen.
- `nombre_comercial`: nombre de marca cuando existe.
- `dosis_texto`: representación clínica visible completa.
- `dosis_valor` + `dosis_unidad`: opcionales para una capa más estructurada futura.
- `snapshot_origen`: huella saneada y serializable del origen catálogo si aplica; no es fuente de decisión clínica.

---

## 5. Valores permitidos

### `tipo_relacion`

- `principal`
- `validado`
- `adicional`
- `concomitante`
- `historico`
- `exposicion`
- `sospechoso_ea`

### `estado_linea`

- `propuesto`
- `validado`
- `activo`
- `añadido`
- `suspendido`
- `historico`
- `finalizado`
- `no_aplica`

### `tipo_movimiento`

- `sin_cambios`
- `optimizacion`
- `tratamiento_anadido`
- `cambio_terapeutico`
- `suspension`
- `revision_linea`
- `no_aplica`

### `fase_tratamiento`

- `induccion`
- `mantenimiento`
- `segun_fase`
- `no_aplica`
- `desconocida`

### `fuente`

- `demo`
- `excel`
- `cima`
- `local_especial`
- `validacion`
- `primera_visita`
- `seguimiento`
- `dashboard_adapter`

### `source_type`

- `CIMA`
- `LOCAL`
- `LOCAL_PENDIENTE_DEMO`
- `DEMO`
- `EXCEL`
- `MANUAL`

---

## 6. Relación con contrato de pautas WO6

Este contrato depende conceptualmente de:

- `docs/farmacia_data_contracts.md`

Reglas:

1. No duplicar lógica de pauta.
2. Si hay pauta normalizable, usar:
   - `pauta_codigo`
   - `pauta_label`
   - `pauta_intervalo_dias`
   - `pauta_unidad`
   - `pauta_otro_texto`
3. No usar texto libre como variable analítica principal si existe normalización posible.
4. `SEGUN_FASE` debe conservarse para inducción/mantenimiento/múltiples pautas.
5. El campo `pauta` puede seguir existiendo como representación visible o legacy, pero no debe ser la única capa analítica.

---

## 7. Comportamiento por pantalla

| Pantalla | Rol terapéutico | Debe editar | Debe mostrar | Debe autocompletar | Debe exportar | Comentario |
| --- | --- | --- | --- | --- | --- | --- |
| Validación | Alta/validación inicial del tratamiento principal | Sí | Tratamiento principal + contexto clínico | Sí | Sí | Pantalla de referencia para el bloque común |
| Primera visita | Confirmación/inicio del seguimiento farmacoterapéutico | Sí, un único bloque terapéutico principal | Contexto del paciente + tratamiento principal | Sí | Sí | No debe duplicar el tratamiento en dos tarjetas |
| Seguimiento | Registro de evolución terapéutica | Sí, movimientos y relacionados; principal en modo protegido | Tratamiento actual + cambios | Sí, cuando aplique | Sí | No debe crear líneas nuevas validadas silenciosas |
| Otros biológicos | Relacionados no principales | Sí | Tratamiento, estado y contexto | Sí, si se decide en WO7F | Sí | Mantener separación clínica entre adicional y principal |
| Concomitantes | Medicación relevante coexistente | Sí | Tratamiento y contexto | Sí opcional | Sí | La normalización de pauta se decide en WO7F |
| Dashboard paciente | Proyección longitudinal / lectura | No | Resumen, líneas, timeline, hitos | No como editor | No como fuente primaria | Debe consumir adapter |
| Actividad servicio | Resumen operativo | No | Resumen sintético | No | No | Solo lectura |
| Estadísticas | Explotación analítica | No | Agregados | No | Sí | Debe consumir el contrato común |

---

## 8. Primera visita — decisión conceptual recomendada

Primera visita debe tener una única fuente de verdad terapéutica.

Propuesta:

- “Datos del paciente” recoge identidad y contexto clínico básico.
- El tratamiento principal debe vivir en un único bloque terapéutico.
- La tarjeta “Tratamiento validado por Farmacia” puede existir, pero como bloque único editable/resumible, no duplicado.
- Si no hay paciente, no debe haber tratamiento fantasma.
- Si hay paciente desde validación, debe precargar el mismo contrato.
- Si hay paciente importado/histórico, debe cargar el mismo contrato en modo revisable.

---

## 9. Seguimiento — decisión conceptual recomendada

Reglas recomendadas:

- el tratamiento principal puede aparecer como contexto protegido;
- cambios de pauta y movimiento terapéutico deben registrarse como movimiento, no como línea nueva silenciosa;
- concomitantes, adicionales, históricos y exposición deben compartir el contrato base;
- `tipo_relacion` debe conservar la semántica clínica;
- la pauta normalizada en relacionados debe decidirse en WO7F para no romper separación clínica.

---

## 10. Dashboard — decisión conceptual recomendada

Reglas:

- el dashboard no debe tener un shape terapéutico propio incompatible;
- debe consumir un adapter desde el contrato común;
- `biologicos[]`, `tratamientos[]` y `cambios_pauta[]` deben mapearse a una representación común o a un adapter documental explícito.

Principio:

- el dashboard es una vista de lectura y proyección longitudinal, no una fuente de verdad independiente.

---

## 11. Helper futuro

Sin implementar todavía, se propone:

- archivo: `scripts/farmacia_tratamiento_common.js`
- namespace: `window.FarmaciaTratamiento`

Funciones futuras:

```javascript
normalizeTreatmentInput
buildTreatmentSnapshot
buildTreatmentFromPatient
populateTreatmentFromCatalogSelection
populateTreatmentForm
readTreatmentForm
attachTreatmentAutocomplete
populatePautaSelect
mapViaToSelect
buildTreatmentCsvFields
renderTreatmentSummary
renderTreatmentReadonlyCard
```

---

## 12. Reglas para implementación futura

1. No crear otro autocomplete terapéutico nuevo sin usar helper común.
2. No añadir campos manuales de dosis, pauta o vía sin mapearlos al contrato.
3. No cambiar el significado de `tipo_relacion`.
4. No convertir concomitante en tratamiento activo.
5. No convertir biológico adicional en switch formal si no se registra como movimiento terapéutico.
6. No usar dashboard como fuente de verdad.
7. No usar labels visibles como clave analítica.
8. No mezclar tratamiento principal con medicamentos relevantes para causalidad.

---

## 13. Fases recomendadas tras WO7B

- `WO7C` — helper común `farmacia_tratamiento_common.js`
- `WO7D` — primera visita: eliminar duplicidad y aplicar bloque único
- `WO7E` — seguimiento: aplicar contrato común a tratamiento principal/nueva pauta
- `WO7F` — relacionados/concomitantes/adicionales
- `WO7G` — dashboard adapter
- `WO8` — exportación fila pegable Excel

---

## 14. Estado de WO6

Se deja explícito:

- WO6 sigue `pending_review`;
- no se promociona todavía;
- WO6 queda como base técnica de pauta y storage;
- WO7 es necesaria para alineación terapéutica entre pantallas.

---

## 15. Frontera aprobada catálogo/tratamiento

La frontera entre identidad de catálogo y tratamiento clínico queda aprobada para esta versión. Las decisiones más amplias de ciclo de vida, líneas, movimientos, validación y persistencia longitudinal continúan siendo provisionales y requieren su propia aprobación.

### CatalogSelectionSnapshot v1

La selección desde CIMA o catálogo local produce exclusivamente un `CatalogSelectionSnapshot`:

```javascript
{
  snapshot_kind: "catalog_selection",
  snapshot_version: 1,
  selected_at: "",
  context: {
    slot: "primera_visita.tratamiento | validacion.solicitado | validacion.validado | seguimiento.tratamiento",
    paciente_cip: "",
    tratamiento_id: "",
    linea_id: ""
  }
}
```

El snapshot puede conservar nombre, principio activo, fuente, identificadores y metadatos CIMA como referencia interna de catálogo. Esos metadatos no son tratamiento clínico.

### Contexto y persistencia

Una selección persistida solo se aplica si el `slot` coincide exactamente. CIP, `tratamiento_id` y `linea_id` también deben coincidir exactamente cuando cualquiera de los dos contextos informa el valor. Ante una incompatibilidad se descarta y limpia el snapshot de memoria y `sessionStorage`, sin modificar los datos clínicos actuales.

Un snapshot recuperado implícitamente de `sessionStorage` sin tipo o sin contexto compatible se rechaza y limpia. Un snapshot legacy pasado explícitamente a un adaptador puede aportar únicamente identidad y trazabilidad; nunca se clasifica por presencia de dosis, presentación, vía o principio activo.

### Sustitución atómica de identidad

Una selección reemplaza conjuntamente `farmaco_nombre`, `nombre_comercial`, `principio_activo`, `drug_id`, `selected_drug_id`, `source_type`, `codigo_nacional`, `nregistro` y la trazabilidad de catálogo. Los valores ausentes del nuevo medicamento quedan vacíos; no se conservan identificadores del anterior.

La selección no escribe dosis, presentación prescrita, vía, pauta, inducción, duración, fechas, relación, estado, movimiento, fase, validación u observaciones profesionales. Tampoco deriva relación, estado o movimiento desde `es_principal` dentro de esta corrección.

### snapshot_origen saneado

En el tratamiento canónico, `snapshot_origen` solo puede conservar `snapshot_kind`, `snapshot_version`, `selected_at`, `context`, identidad farmacológica, fuente e identificadores de catálogo. No contiene `dosis_presentacion`, `presentacion_snapshot`, `via_snapshot`, pauta, inducción ni etiquetas terapéuticamente interpretables. No se exporta en bruto.

`snapshot_kind` y `snapshot_version` no pertenecen al tratamiento canónico.

### Fuera de alcance

No se implementa `ClinicalTreatmentSnapshot`: no existe un productor real aprobado. Un tipo desconocido, typo o `clinical_treatment` no registrado no recibe privilegios clínicos. El tratamiento clínico solo se construye desde formulario, paciente, línea, validación o importación explícita.
