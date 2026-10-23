# FH-EA R1 · Identidad longitudinal y revisión expresa

## Problema y autoridad

Unidad `ea-episodios-observaciones`, BASE `8aed0fbac73129fa44539c23c6838fc67189e683`. La validación de fichas nuevas existe, pero no distingue selección de revisión ni valida vínculos longitudinales explícitos. No conectar todavía T01 ni construir otra historia clínica.

Autoridad: CODING_STANDARDS.md; Spec EA v0.5 D02–D07 (`docs/contracts/FH_EA_0N_SPEC_V0_5_PRODUCT_BASE_20261018.md`); `docs/ops/PLAN_RESCATE_FH_EA_NEXUS_20261023.md`; ADR-005; Pharmacy Act F4.4 y T01 (`scripts/farmacia_seguimiento.js`). D-R1-01/02 ratificadas por el issue. No revisar G2 fuera del checkout.

## Hechos requeridos

1. Conservar el seam anterior y añadir validación pura longitudinal con historia explícita. Un episodio conserva `episode_id` entre actos; cada observación tiene `observation_id` propio. No generar IDs ni fusionar episodios por texto, medicamentos o fechas.
2. Abrir/seleccionar solo conserva la selección: nunca incorpora observaciones. Una revisión expresa verificable, incluso sin cambios, sí permite una observación propia del acto nuevo; no exige repetir descripción original, gravedad, sospechoso ni causalidad. Una ficha nueva sigue necesitando descripción.
3. Continuación, resolución y recurrencia solo se conservan si se declaran. La recurrencia es episodio nuevo con relación explícita al anterior, no reutilización del episodio previo. No interpretar texto ni cronología para decidirlas.
4. Rechazar referencias ausentes, intercambiadas o contradictorias de paciente, acto, episodio y observación que autoricen un vínculo; no aceptar un ID de observación reutilizado en otro acto/episodio. Fallo estructurado sin representación parcial, sin modificar entradas. No se exige prioridad ni texto específico del error.
5. `no`/`no_consta` del presente no alteran historia; ambos rechazan observaciones finalizadas del acto presente. Historia y selección no satisfacen `si`. Conservar borradores; no completar clínica. Resultado determinista, sin referencias editables compartidas; aislamiento A→B→A.
6. Añadir y ejecutar `node tools/farmacia_ea_r1_identity_check.mjs`; mantener check/oráculo anteriores R1 y tres checks F4.4/T01; ejecutar `npm run -s verify:nexus` según capacidad sin retocar suites.

## Seam técnico focal

Mantener `validateNewEvents` intacto en comportamiento. Añadir `HubTools.farmaciaEaInvariants.validateObservations(request)` en el mismo módulo, sin dependencias nuevas. No es un DTO institucional, autoridad de paciente ni API de persistencia.

Entrada: `{patientRef, actId, present, adverse_events, history, selections}`. Contexto y fichas usan los nombres/estados técnicos de la unidad anterior. `history` es una colección explícita de observaciones incorporadas de actos anteriores del mismo paciente; `selections` contiene referencias a esas observaciones. Las fichas actuales deben pertenecer al acto recibido. No se acepta historia de otro paciente como autorización. Campos clínicos adicionales se conservan sin interpretación.

Una referencia histórica es la tupla completa `{patientRef, actId, episode_id, observation_id}` y debe corresponder exactamente a una observación aportada. Una ficha de seguimiento lleva `basis` con esa tupla y conserva su episodio; sin `basis` una ficha finalizada solo puede ser nueva, con episodio no presente en historia y descripción explícita. Una ficha de recurrencia lleva `basis` del episodio anterior y un `episode_id` nuevo (distinto de todos los históricos).

El transporte focal usa `review: {confirmed:true, unchanged:true}` para revisión sin cambios, o `review: {confirmed:true}` para otra revisión expresa; `evolution` opcional transporta `continuation`, `resolution` o `recurrence`. Una evolución expresamente declarada también acredita una observación, pero no se infiere si falta. `basis` solo NO acredita revisión. Son nombres de transporte, no mínimos clínicos ni obligación de escribir una frase: el oráculo no interpreta texto descriptivo para acreditar revisión, y prueba revisión sin cambios sin `evolution`, descripción ni otro dato clínico. No exige la cadena «revisado sin cambios». `review` incompleto/no confirmado no autoriza por sí solo incorporación. Borradores no necesitan acreditar revisión.

Éxito: `{ok:true, representation:{patientRef,actId,present,adverse_events}, retained, history, selections}`: solo incorporadas actuales en representación; borradores en retained; historia y selecciones completas sin mutación ni relleno. Fallo: `{ok:false,error:{code,message}}`. Árboles planos y escalares como en la unidad anterior. No generar episodios, observaciones ni inferir orden temporal; IDs son opacos. La novedad de una observación no es corrección del registro histórico.

## Fuera de alcance

Correcciones/anulaciones y versionado (unidad posterior), reglas de ausencias/sospecha/causalidad, adaptación T01, UI, persistencia, Excel/Bridge/F4.5, relojes, identidad activa, catálogos, terminologías, pacientes reales. No modificar F4.4, T01, suites existentes ni ninguna ruta fuera de allowedPaths. La selección aquí es solo entrada explícita, no nuevo selector de pacientes.

## Open questions

None dentro de la unidad. Mínimos institucionales adicionales y formato de integración quedan diferidos; los nombres de transporte no ratifican vocabulario clínico institucional.

## Trazabilidad

| Hecho | Testigo |
| --- | --- |
| 1 | `ea-identity-oracle`: longitudinal, equal text/drug, opaque chronology; regresión ea-states-oracle |
| 2 | selection only, explicit review, no implicit review, new description |
| 3 | explicit evolution, recurrence, no inferred evolution |
| 4 | tuple negatives, current context, duplicate observation, atomic failure |
| 5 | state/history matrix, drafts, deterministic, deep isolation, A/B/A |
| 6 | oráculo ejecuta check focal; regresiones del perfil: ea-states-oracle, act-contract, act-payloads, ea-t01, verify-nexus |

## Evidencia de preparación

BASE sin cambios de producto: oráculo exit 1 por aserción `Missing longitudinal identity / explicit review behavior`, sin import fallido. `npm ci --offline --no-audit --no-fund --ignore-scripts` completado; Node v26.7.0 produce EBADENGINE frente al rango >=20 <21. Se registrará resultado de referencia antes del cierre. No hay impacto visual ni receta de capturas.

```metis-unit
{
  "schema":"metis.unit/v1",
  "unit":"ea-episodios-observaciones",
  "riskClass":"complex",
  "uiImpact":"none",
  "sizeClass":"M",
  "maxCorrections":1,
  "allowedPaths":["modules/farmacia_ea_invariants.js","tools/farmacia_ea_r1_identity_check.mjs"],
  "doNotTouch":["docs/metis/","metis/","tools/farmacia_ea_r1_states_check.mjs","modules/farmacia_act_contract.js","modules/farmacia_act_payloads.js","tools/farmacia_act_contract_check.mjs","tools/farmacia_act_payloads_check.mjs","tools/farmacia_ea_t01_check.mjs"],
  "ports":[],
  "witness":[
    {"id":"ea-identity-oracle","cmd":["node","metis/oracles/ea-episodios-observaciones.mjs"],"timeoutSec":60,"mustFailAtBase":true}
  ]
}
```
