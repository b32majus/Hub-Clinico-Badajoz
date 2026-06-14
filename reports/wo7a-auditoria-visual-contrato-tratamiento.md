# WO7A — Auditoría visual y contrato común de tratamiento farmacológico

Fecha: 2026-06-14
Estado objetivo: `wo7a_auditoria_visual_contrato_tratamiento_completed_pending_Sil_Cora_review`

## 1. Estado de rama / HEAD

- Repositorio auditado: `/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo`
- Rama actual confirmada: `work/farmacia-wo6-storage-pautas-normalizadas-20260614`
- HEAD confirmado: `69c5185` (`WO6e: actualizar estado WO6 en manifiesto`)
- Working tree: limpio en la lectura realizada (`git status --short --branch` no mostró cambios de ficheros)
- No se ha cambiado de rama
- No se ha hecho commit
- No se han tocado `main`, `Pages`, preview publicada ni datos demo

## 2. Alcance y método

Se ha auditado:

- Documentación y contrato: `docs/farmacia_data_contracts.md`, `docs/farmacia_branch_manifest_20260614.md`
- Código común: `scripts/farmacia_pautas_catalog.js`, `scripts/farmacia_common.js`
- Pantallas/scripts clave: validación, primera visita, seguimiento y dashboard paciente
- Pantallas revisadas visual/DOM: `farmacia_validacion.html`, `farmacia_primera_visita.html`, `farmacia_seguimiento.html`, `farmacia_dashboard_paciente.html?cip=CIP-DEMO-FH-004`, `farmacia_index.html`, `farmacia_actividad_servicio.html`

Limitación:

- No hay navegador gráfico disponible en este entorno.
- La revisión visual se ha hecho con lectura de HTML/CSS structure + ejecución DOM con `jsdom`.
- No se han generado capturas PNG; no existe carpeta `reports/wo7a_screenshots/`.

## 3. Resumen ejecutivo

WO6 resuelve bien la normalización de `pauta` para el tratamiento principal importado/exportado, pero no resuelve el problema estructural de UI: el módulo no comparte un contrato ni un bloque común de tratamiento farmacológico entre validación, primera visita, seguimiento y dashboard.

Hallazgos críticos:

1. Primera visita duplica conceptualmente el tratamiento.
   - El bloque "Datos del paciente" permite editar `fármaco/dosis/pauta/vía`.
   - Justo debajo, "Tratamiento validado por Farmacia" vuelve a representar el mismo tratamiento y añade un segundo flujo de búsqueda/autocomplete.
   - Referencias: [farmacia_primera_visita.html](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/farmacia_primera_visita.html:107), [farmacia_primera_visita.html](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/farmacia_primera_visita.html:110), [scripts/farmacia_primera_visita.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_primera_visita.js:16), [scripts/farmacia_primera_visita.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_primera_visita.js:32)

2. Primera visita tiene dos comportamientos contradictorios para el buscador.
   - `searchCIP()` oculta el bloque autocomplete si encuentra paciente.
   - `DOMContentLoaded` lo vuelve a mostrar siempre.
   - Resultado observado en DOM para `CIP-DEMO-FH-004`: quedan visibles a la vez los campos manuales y el bloque "Buscar fármaco en catálogo".
   - Referencias: [scripts/farmacia_primera_visita.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_primera_visita.js:518), [scripts/farmacia_primera_visita.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_primera_visita.js:740)

3. Seguimiento separa mejor el tratamiento principal, pero deja contratos distintos para principal vs concomitantes/adicionales.
   - Tratamiento principal: `pauta` normalizada WO6 solo en `fhSegNuevaPauta`.
   - Otros fármacos/biológicos: `pauta` sigue siendo texto libre; no hay select normalizado.
   - En concomitantes se autocompleta `fármaco`, `principio activo` y `dosis`, pero no `vía` ni `pauta`.
   - Referencias: [farmacia_seguimiento.html](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/farmacia_seguimiento.html:148), [scripts/farmacia_seguimiento.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_seguimiento.js:240), [scripts/farmacia_seguimiento.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_seguimiento.js:390)

4. La "nueva pauta" en seguimiento existe, pero queda escondida por regla de UI.
   - Solo aparece cuando `fhSegOptimiza === "Sí"`.
   - La pauta actual sí se precarga y la nueva pauta se preselecciona con el valor actual, pero el control permanece oculto hasta activar optimización.
   - Esto puede ser clínicamente correcto, pero hoy no queda autoexplicado en la pantalla.
   - Referencias: [scripts/farmacia_seguimiento.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_seguimiento.js:734), [scripts/farmacia_seguimiento.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_seguimiento.js:1662)

5. Dashboard paciente no consume un contrato homogéneo.
   - `biologicos[]` se representa con líneas biológicas separadas.
   - La timeline terapéutica usa `tratamientos[]` y `cambios_pauta[]`, no `biologicos[]`.
   - `proms` se trata como array de objetos con `fecha`, pero en `farmacia_common.js` el paciente demo base tiene `proms` como string. En la ejecución DOM esto rompió el render del dashboard de FH-004 antes de completar líneas y timeline.
   - Referencias: [scripts/farmacia_dashboard_paciente.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_dashboard_paciente.js:259), [scripts/farmacia_dashboard_paciente.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_dashboard_paciente.js:295), [scripts/farmacia_dashboard_paciente.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_dashboard_paciente.js:413), [scripts/farmacia_common.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_common.js:117)

## 4. Pantallas revisadas

### `farmacia_validacion.html`

- Flujo entendible para tratamiento principal.
- Autocomplete principal existe y está cableado al catálogo.
- Autorrellena `fármaco`, `principio activo`, `dosis`, `vía`.
- `pauta` principal usa select WO6.
- "Otros fármacos / biológicos" usa modelo distinto: texto libre para `pauta`, sin autocomplete por fila.

### `farmacia_primera_visita.html`

- Visualmente aparecen dos zonas terapéuticas distintas para el mismo concepto.
- Sin CIP: se ven vacíos `fármaco/dosis/pauta/vía` y además el buscador del catálogo.
- Con FH-004: se cargan datos en los campos manuales y además se renderiza otra tarjeta resumen del mismo tratamiento.
- El bloque de tratamiento validado puede mostrar datos desde paciente o snapshot, pero no es la fuente maestra única.

### `farmacia_seguimiento.html`

- El tratamiento principal se presenta como ficha de solo lectura con línea biológica seleccionable.
- Para paciente vacío, aparece autocomplete de tratamiento principal.
- Para paciente existente, se oculta el autocomplete y se congela la ficha principal.
- "Otros fármacos / biológicos" crea tarjetas nuevas siempre tituladas "Fármaco concomitante", aunque el `Tipo de relación` permita adicional/histórico/exposición.
- La evolución farmacoterapéutica usa `nueva dosis` + `nueva pauta`, pero solo visible al marcar optimización.

### `farmacia_dashboard_paciente.html?cip=CIP-DEMO-FH-004`

- La intención de producto es buena: resumen, líneas biológicas y timeline.
- La arquitectura de datos no es homogénea con seguimiento/validación.
- En la ejecución DOM el render se interrumpió por incompatibilidad de `proms`.
- Riesgo alto de demo inconsistente para paciente multibiológico si no entra `extData` con el shape esperado.

### `farmacia_index.html`

- No es pantalla de captura terapéutica.
- Sí expone rápidamente el caso FH-004 y el punto de entrada a los flujos.

### `farmacia_actividad_servicio.html`

- No es pantalla de captura terapéutica.
- Impacta solo como resumen/listado de pacientes y actividad.

## 5. Hallazgos visuales principales

### 5.1 Primera visita

- Duplicidad material:
  - "Datos del paciente" ya contiene `fhPvFarmaco`, `fhPvDosis`, `fhPvPauta`, `fhPvVia`.
  - "Tratamiento validado por Farmacia" vuelve a mostrar el tratamiento y añade `fhPvDrugSearch`.
- La tarjeta inferior parece una fuente canónica, pero en realidad el formulario editable superior sigue exportando los datos.
- `selectDrugPV()` rellena solo `fhPvFarmaco`, `fhPvDosis`, `fhPvVia`; no rellena `fhPvPauta`.
  - Si el usuario usa el catálogo en primera visita, el resultado terapéutico queda parcialmente sincronizado.
  - Referencia: [scripts/farmacia_primera_visita.js](/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/repo/scripts/farmacia_primera_visita.js:634)
- La limpieza de snapshot fantasma sin paciente sí parece correcta tras WO6e.
  - En prueba DOM con `sessionStorage.farmacia_drug_snapshot` precargado, el snapshot quedó vacío al cargar la pantalla sin paciente.

### 5.2 Seguimiento

- El bloque principal está más cerca de un contrato único:
  - línea biológica
  - estado de línea
  - ficha read-only de tratamiento
  - contexto de catálogo
- Pero conviven dos capas:
  - capa clínica longitudinal (`linea principal`, `estado`, `movimiento`)
  - capa de edición farmacológica (`autocomplete`, `nueva pauta`, `nueva dosis`)
- En otros fármacos:
  - el título fijo "Fármaco concomitante" no refleja el `relationType` real
  - la `pauta` sigue manual
  - la `vía` no se autocompleta desde catálogo
  - no hay `pauta_codigo/pauta_label/...` por fila

### 5.3 Validación

- Es la pantalla con mejor comportamiento terapéutico principal:
  - autocomplete real
  - select de vía
  - select de pauta WO6
  - exportación con campos normalizados
- El problema es que ese contrato no se reutiliza después.

### 5.4 Dashboard paciente

- El dashboard intenta representar multibiológico por `biologicos[]`.
- Seguimiento también entiende `biologicos[]`.
- Pero la timeline terapéutica del dashboard depende de `tratamientos[]`, que no es el mismo shape.
- Resultado: no hay una única entidad "tratamiento farmacológico" reutilizada por todas las pantallas.

## 6. Tabla campo por campo

| Pantalla | Bloque visual | Campo visible | ID HTML / selector | Campo JS/modelo | ¿CIMA/autocomplete? | ¿Rellena principio activo? | ¿Rellena dosis/presentación? | ¿Rellena vía? | ¿Usa pauta normalizada WO6? | ¿Exporta campos normalizados? | Problema | Propuesta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Validación | Tratamiento principal | Fármaco solicitado | `#fhDermaFarmaco` | `patient.farmaco` / catálogo | Sí | Sí | Sí | Sí | Parcial, vía `#fhDermaPauta` | Sí | Es el único flujo completo reutilizable y no se comparte | Convertirlo en bloque común base |
| Validación | Tratamiento principal | Principio activo | `#fhDermaPrincipioActivo` | `patient.principioActivo` / catálogo | Derivado de autocomplete | Sí | n/a | n/a | n/a | Sí indirectamente | Campo editable aunque normalmente debería venir del selector | Derivarlo por defecto y permitir override controlado |
| Validación | Tratamiento principal | Dosis | `#fhDermaDosis` | `patient.dosis` / `drug.dosis` | Sí en principal | n/a | Sí | n/a | n/a | Sí | En validación usa `drug.dosis`, no fallback a `nombre_presentacion` | Unificar helper de snapshot y presentación |
| Validación | Tratamiento principal | Vía | `#fhDermaVia` | `patient.via` / `drug.via` | Sí en principal | n/a | n/a | Sí | n/a | Sí | Mapping de vía local a select solo aquí | Extraer `mapViaToSelect()` a helper común |
| Validación | Tratamiento principal | Pauta | `#fhDermaPauta` + `#fhDermaPautaOtro` | `patient.pauta` / `P.normalizePautaLabel()` | No búsqueda propia | n/a | n/a | n/a | Sí | Sí | Correcto, pero solo para tratamiento principal | Reusar exactamente el mismo subcomponente en PV/seguimiento |
| Validación | Otros fármacos | Tipo de relación | fila `select` | `otherDrugs[].relationType` | No | n/a | n/a | n/a | No | No | Contrato separado y pobre | Migrar a `tratamientos_relacionados[]` con mismo shape base |
| Validación | Otros fármacos | Fármaco | fila `input` | `otherDrugs[].farmaco` | No | No | No | No | No | No | Sin catálogo ni normalización | Añadir helper opcional de autocomplete por fila |
| Validación | Otros fármacos | Dosis/Vía/Pauta | filas `input/select` | `otherDrugs[]` | No | No | No | Manual | No | No | Totalmente manual | Decidir qué subset se normaliza en WO7F |
| Primera visita | Datos del paciente | Fármaco activo / validado | `#fhPvFarmaco` | `ctx.patient.farmaco` | No directo | No | No | No | No | Sí, pero desde este bloque | Duplica la tarjeta inferior | Reducirlo a resumen o convertirlo en único editor |
| Primera visita | Datos del paciente | Dosis | `#fhPvDosis` | `ctx.patient.dosis` | No directo | n/a | No | n/a | No | Sí | Dato editable y paralelo al bloque inferior | Misma propuesta |
| Primera visita | Datos del paciente | Pauta | `#fhPvPauta` + `#fhPvPautaOtro` | `ctx.patient.pauta` | No directo | n/a | n/a | n/a | Sí | Sí | Sí usa WO6, pero no se sincroniza con selección por catálogo | Usar un único editor de tratamiento |
| Primera visita | Datos del paciente | Vía | `#fhPvVia` | `ctx.patient.via` | No directo | n/a | n/a | No | No | Sí | Se edita aparte del bloque validado | Unificar |
| Primera visita | Tratamiento validado por Farmacia | Resumen del tratamiento | `#fhPvTratamientoGrid` | snapshot o `ctx.patient` | Indirecto | Sí si snapshot | Sí si snapshot | Sí si snapshot | No, muestra label legacy | No directamente | Es resumen visual, no fuente única | Dejarlo solo como resumen de snapshot si existe |
| Primera visita | Tratamiento validado por Farmacia | Buscar fármaco | `#fhPvDrugSearch` | catálogo snapshot | Sí | No, solo al seleccionar | Sí parcial | Sí | No | Sí vía export del bloque superior | `selectDrugPV()` no rellena pauta ni principio activo visible | Crear `populateTreatmentFromCatalogSelection()` común |
| Seguimiento | Tratamiento actual | Línea / biológico principal | `#fhSegLineaPrincipal` | `patient.biologicos[]` | No | n/a | n/a | n/a | n/a | n/a | Bien conceptualmente, pero no usa entidad común con validación/PV | Mantener capa longitudinal separada del editor base |
| Seguimiento | Tratamiento actual | Fármaco/PA/presentación/dosis/vía/pauta actual | `#fhSeg*` read-only | `patient` o `selectedLine` | Solo si no hay paciente | Sí | Parcial | Sí | Pauta actual se normaliza solo para export y nueva pauta | Sí para pauta actual exportada | La ficha principal y la edición están separadas sin contrato único | Introducir `treatmentSnapshot` común |
| Seguimiento | Tratamiento actual | Buscar fármaco | `#fhSegDrugSearch` | catálogo | Sí si no hay paciente | Sí | Sí | Sí | No | n/a | Flujo alternativo distinto del de PV | Reutilizar mismo helper de autocomplete |
| Seguimiento | Evolución farmacoterapéutica | Nueva pauta | `#fhSegNuevaPauta` + `#fhSegNuevaPautaOtro` | `P.normalizePautaLabel()` | No búsqueda | n/a | n/a | n/a | Sí | Sí | Hidden por defecto; semántica ligada a optimización no explicitada | Mantener regla, pero explicar estado y origen |
| Seguimiento | Otros fármacos/biológicos | Tipo de relación | fila `select` | `followupOtherDrugs[].relationType` | No | n/a | n/a | n/a | No | No | Título de tarjeta siempre "Fármaco concomitante" | Título dinámico según tipo_relacion |
| Seguimiento | Otros fármacos/biológicos | Fármaco | fila `input.js-cima-autocomplete` | `followupOtherDrugs[].farmaco` | Sí | Sí | Sí | No | No | No | Mejor que validación, pero contrato aún distinto | Reusar helper común por fila |
| Seguimiento | Otros fármacos/biológicos | Pauta | fila `input[data-field="pauta"]` | `followupOtherDrugs[].pauta` | No | n/a | n/a | n/a | No | No | Sin select normalizado WO6 | Decidir si solo para biológicos adicionales/históricos |
| Dashboard paciente | Líneas biológicas | Línea/estado/relación | `#biologicLinesContainer` | `patient.biologicos[]` | No | Sí textual | Sí textual | Sí textual | No | No | Representación distinta de la usada en seguimiento principal | Alimentar desde contrato común + metadatos longitudinales |
| Dashboard paciente | Timeline de tratamiento | Hitos de tratamiento | `#timelineTratamientoContainer` | `patient.tratamientos[]`, `patient.cambios_pauta[]` | No | n/a | n/a | n/a | No | No | No consume `biologicos[]`; contrato paralelo | Unificar adapter longitudinal desde tratamientos comunes |

## 7. Duplicidades detectadas

### Primera visita

Pregunta: ¿son dos entidades distintas?

- Hoy, no de forma clara.
- En código y UI, ambos bloques hablan del mismo tratamiento principal.
- Solo cambia la fuente:
  - bloque superior: formulario editable/exportable
  - bloque inferior: snapshot catálogo o resumen paciente

Conclusión:

- Están duplicando el mismo dato terapéutico.
- Debe existir una sola entidad `tratamiento_principal`.

Recomendación funcional:

- Si entra sin paciente:
  - mostrar un único bloque de edición terapéutica con búsqueda de catálogo integrada
  - no mostrar dos tarjetas paralelas
- Si entra con paciente desde validación:
  - cargar el tratamiento como `snapshot`/`state` del bloque único
  - mostrar metadatos de origen catálogo como información secundaria
- Si entra con paciente histórico/importado:
  - cargar el tratamiento actual como base editable o revisable según política
  - no duplicar resumen y editor salvo que el resumen sea estrictamente solo lectura y visualmente subordinado

### Seguimiento

- Hay una separación clínica razonable entre:
  - tratamiento principal
  - tratamiento adicional
  - concomitante
  - histórico
  - exposición
- El problema no es la separación clínica, sino que cada una usa un mini-contrato distinto.

Qué debe quedar editable:

- `tipo_movimiento_terapéutico`
- `nueva_dosis`
- `nueva_pauta`
- altas de adicional/concomitante/exposición
- motivo/contexto clínico

Qué debe quedar protegido:

- tratamiento actual consolidado
- origen catálogo
- códigos de snapshot ya validados
- fechas e hitos previos del histórico

Qué debe autocompletarse:

- `farmaco_nombre`
- `principio_activo`
- `presentacion`
- `dosis_texto`
- `via`
- pauta normalizada cuando aplique al tratamiento biológico principal y, de forma selectiva, a adicionales biológicos

Qué puede seguir libre:

- `pauta_otro_texto`
- `motivo`
- `observaciones`
- casos especiales clínicamente ambiguos o multirégimen

## 8. Riesgos clínicos y de datos

1. Riesgo de doble edición del tratamiento en primera visita.
   - El usuario puede interpretar que el bloque superior y el inferior son dos tratamientos distintos o dos fases distintas.

2. Riesgo de incoherencia parcial de tratamiento.
   - En primera visita, selección por catálogo no completa la misma huella terapéutica que validación.

3. Riesgo analítico.
   - WO6 normaliza la pauta del principal importado/exportado, pero no la de relacionados/concomitantes/adicionales.

4. Riesgo longitudinal.
   - El dashboard usa shapes distintos (`biologicos[]`, `tratamientos[]`, `cambios_pauta[]`), lo que favorece divergencias.

5. Riesgo demo.
   - `scripts/farmacia_dashboard_paciente.js` espera `patient.proms` como array con `fecha`; `farmacia_common.js` define `proms` base de FH-004 como string resumido. En la ejecución DOM la vista se interrumpió por `a.fecha.localeCompare(b.fecha)`.

## 9. Propuesta de contrato común

Propongo separar dos niveles:

### 9.1 Entidad base de tratamiento

```js
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
  tipo_relacion: "",        // principal | validado | adicional | concomitante | historico | exposicion
  estado_linea: "",         // propuesto | activo | añadido | suspendido | historico | finalizado
  tipo_movimiento: "",      // sin_cambios | optimizacion | tratamiento_anadido | cambio_terapeutico | suspension | revision_linea
  fase_tratamiento: "",     // induccion | mantenimiento | segun_fase | no_aplica
  fecha_inicio: "",
  fecha_fin: "",
  motivo: "",
  observaciones: "",
  fuente: "",               // demo | excel | cima | local_especial | validacion | primera_visita | seguimiento
  source_type: "",          // CIMA | LOCAL | LOCAL_PENDIENTE_DEMO | DEMO
  selected_drug_id: "",
  codigo_nacional: "",
  nregistro: "",
  es_principal: false,
  es_validado_farmacia: false,
  snapshot_origen: null
}
```

### 9.2 Entidad longitudinal separada

```js
{
  linea_id: "",
  tratamiento_id: "",
  orden: 0,
  estado_linea: "",
  tipo_relacion: "",
  fecha_inicio: "",
  fecha_fin: "",
  motivo_cambio: "",
  motivo_suspension: ""
}
```

Principio:

- el tratamiento farmacológico es una entidad única
- la línea longitudinal es una proyección clínica de esa entidad

## 10. Propuesta de componente/helper común

Nombre sugerido:

- `scripts/farmacia_tratamiento_common.js`
- namespace: `window.FarmaciaTratamiento`

API sugerida:

```js
window.FarmaciaTratamiento = {
  normalizeTreatmentInput,
  buildTreatmentSnapshot,
  buildTreatmentFromPatient,
  populateTreatmentFromCatalogSelection,
  populateTreatmentForm,
  readTreatmentForm,
  attachTreatmentAutocomplete,
  populatePautaSelect,
  mapViaToSelect,
  buildTreatmentCsvFields,
  renderTreatmentSummary,
  renderTreatmentReadonlyCard
};
```

Reparto recomendado:

- `farmacia_common.js`
  - contexto global, catálogo, dataset demo, imports
- `farmacia_tratamiento_common.js`
  - contrato terapéutico común
- `farmacia_validacion.js`
  - decide flujo clínico de validación
- `farmacia_primera_visita.js`
  - decide flujo de arranque/administración inicial
- `farmacia_seguimiento.js`
  - decide evolución/movimiento terapéutico y tratamientos relacionados

## 11. Recomendación de implementación por fases

- `WO7B`
  - Documento oficial del contrato de `tratamiento farmacológico`
  - Sin tocar UI todavía

- `WO7C`
  - Crear `scripts/farmacia_tratamiento_common.js`
  - Extraer helpers compartidos de pauta, vía, snapshot, autocomplete y CSV

- `WO7D`
  - Primera visita
  - Eliminar duplicidad conceptual
  - Definir un único bloque fuente de verdad del tratamiento principal

- `WO7E`
  - Seguimiento
  - Aplicar bloque común al tratamiento principal y a `nueva pauta/nueva dosis`
  - Hacer explícita la relación entre optimización y visibilidad de nueva pauta

- `WO7F`
  - Seguimiento/validación
  - Rediseñar `otros fármacos / biológicos`
  - Decidir dónde aplicar pauta normalizada sin romper separación clínica

- `WO7G`
  - Dashboard paciente
  - Adaptador único desde `tratamiento[]`/`lineas[]`
  - Corregir incompatibilidad de `proms`

- `WO8`
  - Exportación fila pegable Excel

- `WO9`
  - PROMs por patología

- `WO10`
  - Visualización multibiológico longitudinal completa

## 12. Qué no se debe tocar todavía

- No promocionar WO6 a fuente activa todavía
- No tocar `main`
- No tocar `Pages` ni preview congelada
- No mover el contrato Excel FH
- No abrir todavía refactor de PROMs por patología
- No mezclar esta WO con dashboard longitudinal completo
- No extender aún el catálogo a fármacos especiales sin decidir el contrato común

## 13. Recomendación final

- WO6 debe seguir `pending_review`.
  - Técnicamente aporta valor en normalización de pauta.
  - Funcionalmente no resuelve la deuda estructural entre pantallas.

- Conviene congelar WO6 como base técnica no promocionada y abrir WO7.
  - La siguiente iteración no debe ser un microfix visual.
  - Debe ser una WO de contrato común + helper compartido.

- Corrección mínima imprescindible antes de seguir:
  - No recomiendo microfix inmediato en esta WO7A.
  - Sí recomiendo que WO7B/WO7C arranquen pronto, porque seguir corrigiendo pantalla a pantalla agravará la divergencia.
  - Riesgo puntual a vigilar: dashboard paciente FH-004 por incompatibilidad de shape de `proms`.

## 14. Resultado de la auditoría

- Informe generado: `reports/wo7a-auditoria-visual-contrato-tratamiento.md`
- Capturas generadas: no
- Estado recomendado: `wo7a_auditoria_visual_contrato_tratamiento_completed_pending_Sil_Cora_review`
