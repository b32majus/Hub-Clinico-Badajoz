# FH-EA R1 · ea-adaptacion-pasiva

## Problema

T01 publica una colección editable `currentFollowupVisit.adverse_events`, sin contexto paciente/acto en cada ficha. Las cuatro unidades R1 anteriores validan entradas explícitas, pero falta demostrar su composición pasiva con el constructor de Seguimiento F4.4. Esta unidad no conecta la página ni guarda datos.

## Comportamiento solicitado

1. Añadir en `HubTools.farmaciaEaInvariants` un seam puro `composeFollowup(envelope, payload, context)`. `envelope` y `payload` respetan F4.4; `payload.followup.adverse_events` recibe directamente la colección T01 (episode_id, observation_id, status, description y demás datos explícitos, incluidos centinelas). `context` aporta `present`, `history`, `selections`, `revisions` como datos explícitos; las tres colecciones pueden estar vacías. No consultar página, paciente activo, reloj, catálogo ni almacenamiento. No generar IDs. Las fichas T01 toman patientRef/actId de la envelope explícita solamente si no los traen: cualquier referencia ya aportada debe coincidir, no sobrescribirse.
2. Aplicar las invariantes anteriores (validateObservations y validateRevision o comportamiento equivalente). Preservar `si`/`no`/`no_consta`: si vacío falla; no/no_consta con finalizados del mismo acto fallan. Historia de otro acto no acredita observación actual ni se resuelve. Borradores con texto vacío permanecen disponibles sin pérdida en entrada y fuera del acto conforme. N=0/1/2/5 y N>5 sin techo; episodios iguales en texto no se fusionan.
3. Selección sola no crea observación; revisión expresa sin cambios sí, conservando episode_id con observation_id propio y sin exigir otra descripción ni nuevo dato clínico. Usar el vocabulario explícito ya entregado por las unidades anteriores, no crear decisiones clínicas nuevas. Historia y asociaciones paciente/episodio/acto deben ser compatibles, sin contaminación A/B.
4. Para una corrección/anulación aportada en `context.revisions`, cada elemento tiene la entrada existente `{operation,previous,next}` de validateRevision; validar motivo, identidades y ambas versiones, y vincular `next` a la observación correspondiente del acto actual. Una observación con amendment requiere esa revisión explícita, no permite omitir previous. Conservar ambas versiones accesibles en la salida pura. No aceptar revisiones ajenas ni sustituir silenciosamente otra observación. La mera observación de un episodio histórico en acto nuevo no es corrección.
5. Adaptación técnica focal: reemplazar únicamente el valor de `payload.followup.adverse_events` por la representación R1 existente `{patientRef,actId,present,adverse_events,occurredAt?}` (fecha común solo si aportada en envelope). Delegar la construcción de exactamente UN acto a `farmaciaActPayloads.createFollowupAct(envelope, adaptedPayload)` existente; sus firmas, claves, validación y opacidad no cambian. No crear un `adverse_event` singular. Datos ajenos a EA, incluidos bloques opacos y orden/cardinalidad de lines explícitas, permanecen intactos. No generar líneas desde EA.
6. Éxito: `{ok:true,act,retained,history,selections,revisions}`; `act` es el resultado F4.4 y las demás ramas conservan las entradas validadas (revisions conserva operation/previous/next). Fallo estructurado `{ok:false,error:{code,message}}` sin acto ni representación parcial. No se fija texto/código de error nuevo ni prioridad entre errores. Propagar fallos F4.4, sin reimplementar sus reglas. Ninguna mutación ni referencias editables compartidas entrada/salida o entre llamadas; determinismo en repetición.
7. No inferir fechas clínicas, gravedad, evolución, actuación, sospecha, causalidad, tratamiento, duración ni autoría. Ausente, undefined, null, vacío, cero y false permanecen distintos. Nuevo EA con solo descripción puede finalizar. Sospechas/evaluaciones explícitas conservan sus referencias y valores; no se completan desde lines ni historia.
8. Añadir `tools/farmacia_ea_r1_followup_check.mjs` ejecutable por Node, sin dependencias nuevas, que demuestre composición completa y negativos. Ejecutar todos los checks R1 previos, F4.4 y T01 y `npm run -s verify:nexus`, registrando límites reales sin modificar suites.

El seam y su ubicación de representación son decisiones técnicas locales para ejecutar la prueba, no un DTO clínico universal, un contrato de persistencia ni una modificación de T01/F4.4. R2 conectará la página posteriormente.

## Fuentes

- `CODING_STANDARDS.md`, `AGENTS.md`.
- `docs/contracts/FH_EA_0N_SPEC_V0_5_PRODUCT_BASE_20261018.md`, D02–D07, con D-R1-01/02 ratificadas en la issue del 2026-10-23.
- `docs/ops/PLAN_RESCATE_FH_EA_NEXUS_20261023.md`, R1 (R2 y destinos fuera).
- `docs/architecture/adr/ADR-005-clinical-write-contracts.md`.
- `modules/farmacia_act_contract.js`, `modules/farmacia_act_payloads.js` y checks F4.4 como autoridad ejecutable.
- `scripts/farmacia_seguimiento.js` (createEaDraft / incorporateEaDraft) y `tools/farmacia_ea_t01_check.mjs`, solo lectura.
- Módulo y oráculos R1 anteriores presentes en BASE; no se requiere inspeccionar G2.

## Fuera de alcance

Controlador, HTML/CSS, UI/G0, persistencia/recuperación, almacenamiento de navegador, sesiones/paciente activo, fuentes/importadores/Excel, ports, F4.5, exportación, dashboards/estadísticas, cálculo causal, cuestionarios, MedDRA/CTCAE/FEDRA, permisos clínicos, nuevos mínimos institucionales. No tocar F4.4 ni las suites previas. No datos reales, red ni dependencias nuevas. uiImpact none: no receta visual.

## Open questions

None. Los mínimos institucionales y el cableado R2 están diferidos, no son decisiones de esta unidad.

## Trazabilidad

| Requisito | Testigo |
|---|---|
| 1 / R1.08 entrada T01 y contexto explícito | ea-followup-oracle: fixtures T01 sin patientRef/actId, contexto ausente/contradictorio, VM sin página |
| 2 / R1.01–03 cardinalidad, estados, borradores | ea-followup-oracle: 0/1/2/5/9/37 × 0/1/2 lines; matriz estados; retained; regresión ea-states-oracle |
| 3 / R1.04 identidad, historia, revisión expresa | ea-followup-oracle: OLD→A, selección y review sin cambios, rechazo sin review/A-B; ea-identity-oracle |
| 4 / R1.05 correcciones | ea-followup-oracle: corrección con/sin motivo y versiones; ea-revisions-oracle (anulación y asociaciones) |
| 5 / R1.08 autoridad única F4.4 y datos opacos | ea-followup-oracle: spy builder, igualdad acto F4.4, lines/notes, negativos F4.4; act-contract/act-payloads/ea-t01 |
| 6 / R1.09 inmutabilidad, rechazo total y determinismo | ea-followup-oracle: snapshots, mutación posterior, repetición y A/B/A |
| 7 / R1.06–07 ausencias y no inferencias | ea-followup-oracle: fichas mínimas/centinelas/review sin defaults; ea-clinical-oracle y check clínico previo |
| 8 / validación Node y regresiones | ea-followup-oracle invoca check followup y checks R1, oráculo revisiones invoca anteriores/F4.4/T01; verify-nexus añadido por perfil |

## Unidad

```metis-unit
{
  "schema": "metis.unit/v1",
  "unit": "ea-adaptacion-pasiva",
  "riskClass": "complex",
  "uiImpact": "none",
  "sizeClass": "M",
  "maxCorrections": 1,
  "allowedPaths": ["modules/farmacia_ea_invariants.js", "tools/farmacia_ea_r1_followup_check.mjs"],
  "doNotTouch": ["docs/metis/", "metis/"],
  "ports": [],
  "witness": [{"id":"ea-followup-oracle","cmd":["node","metis/oracles/ea-adaptacion-pasiva.mjs"],"timeoutSec":180,"mustFailAtBase":true}]
}
```
