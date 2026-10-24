# FH-EA-03 · C11: composeFollowup rechaza observación corregida revision>1 sin amendment (unidad c11-r1-amendment-guard, 1/5)

## Problema

En BASE `6c9b541fb596cac07c00e511b945e283162380aa`, `HubTools.farmaciaEaInvariants.composeFollowup(envelope, payload, context)` acepta (`ok:true`) una observación EA incorporada corregida con `revision: 2` cuando `amendment` está ausente: el defecto está reproducido con un oráculo determinista. La regla clínica aprobada (C11, requisito prioritario de seguridad) es que «una corrección con revisión mayor que 1 y sin motivo (amendment) se rechaza». La única superficie autorizada es `composeFollowup` en `modules/farmacia_ea_invariants.js`, en una unidad atómica independiente de lógica pura, antes de cualquier trabajo de UI G0; no se editan `modules/farmacia_act_contract.js` ni `modules/farmacia_act_payloads.js`.

## Comportamiento solicitado

1. `composeFollowup` rechaza una observación EA **incorporada** del acto actual corregida con `revision: 2` y `amendment` ausente, devolviendo `{ok:false, error:{code, message}}`, sin crear acto parcial (el constructor F4.4 no se invoca). El rechazo se comprueba con `revision: 2` en la ficha y también con `envelope.revision: 2`; la regla cubre cualquier `revision` entera mayor que 1 (p. ej. 3).
2. La salida de éxito de una revisión 1 sin corrección se mantiene: una ficha incorporada sin `revision` declarada, o con `revision: 1` y sin `amendment`, sigue componiéndose con éxito.
3. Una corrección válida `revision: 2` con `amendment: {previousRevision: 1, reason: <texto explícito no vacío>}` y vínculo verificable en `context.revisions` (`{operation:'correction', previous, next}` con `next` idéntico a la observación incorporada) sigue admitida; la revisión se conserva íntegra en la salida y la composición es determinista.
4. Un envelope con revisión de acto F4.4 (`envelope.revision`) mayor que 1 **sin corrección de observación EA** NO se rechaza por la nueva regla: no se confunde revisión del acto con corrección de observación. El rechazo por vínculo ausente (`amendment` presente sin revisión en `context.revisions`) se mantiene como comportamiento previo.
5. El fallo es atómico: la entrada no se muta, la salida de fallo tiene exactamente `{ok, error}`, y ningún acto ni representación parcial se construye en éxito o fallo parcial.
6. Regresión: los consumidores actuales (`modules/farmacia_act_payloads.js` vía `createFollowupAct` y `tools/farmacia_ea_r1_followup_check.mjs` con su cadena states/identity/clinical/revisions/F4.4/T01) siguen pasando sin modificaciones.

No se fija código de error concreto ni prioridad entre errores: basta un `code` y `message` explícitos en el fallo. No se exige texto de mensaje determinado.

## Fuera de alcance

- Ninguna otra función R1 (`validateNewEvents`, `validateObservations`, `validateRevision`, asociaciones clínicas), ni `modules/farmacia_act_contract.js`, ni `modules/farmacia_act_payloads.js`.
- UI G0, HTML/CSS, controlador, estado del editor, capturas T01 versionadas: pertenecen a las unidades 2–5 del train.
- Estado de causalidad en memoria, exportaciones, persistencia, F4.4, metadatos de acto, paciente/sesión, otras patologías.
- Borradores (`status: 'draft'`) con `revision > 1`: la regla aprobada habla de observación incorporada; los borradores se retienen fuera del acto conforme y esta unidad no exige ni prohíbe rechazarlos.

## Open questions

- Borradores con `revision > 1` y `amendment` ausente: el requisito aprobado (C11) se enuncia sobre la observación incorporada del acto actual. Esta unidad no exige rechazo de borradores; si se quiere extender la regla a fichas retenidas, decidirlo antes del train.
- Valores de `revision` no enteros o no numéricos (p. ej. `'2'`, `2.5`) en una ficha incorporada: la regla aprobada se expresa sobre `revision: 2`/mayor que 1 en el vocabulario entero R1; esta unidad no añade validación de tipo adicional.

## Trazabilidad

| Requisito | Testigo |
|---|---|
| 1 Rechazo `revision:2`/`revision:3` sin amendment (ficha, y también `envelope.revision:2`), `{ok:false,error:{code,message}}`, sin acto parcial | `ea-r1-revision2-amendment-oracle` casos negativos 1 (RED en BASE: defecto reproducido `ok:true`) |
| 2 Revisión 1 sin corrección admitida | `ea-r1-revision2-amendment-oracle` casos positivos 2 |
| 3 Corrección válida revision:2 con amendment + vínculo `context.revisions` admitida, conservada y determinista | `ea-r1-revision2-amendment-oracle` caso 4 y repetición |
| 4 Envelope F4.4 `revision>1` sin corrección EA no rechazada; vínculo ausente sigue rechazado | `ea-r1-revision2-amendment-oracle` casos 3 y 5 |
| 5 Fallo atómico, entrada intacta, sin acto parcial | `ea-r1-revision2-amendment-oracle` en cada `run` (claves `{ok,error}`, spy del constructor) |
| 6 Regresión de consumidores R1/F4.4/T01 | `ea-r1-revision2-amendment-oracle` ejecuta `tools/farmacia_ea_r1_followup_check.mjs`; `verify-nexus` añadido por perfil |

## Unidad

```metis-unit
{
  "schema": "metis.unit/v1",
  "unit": "c11-r1-amendment-guard",
  "riskClass": "complex",
  "uiImpact": "none",
  "sizeClass": "S",
  "maxCorrections": 1,
  "allowedPaths": ["modules/farmacia_ea_invariants.js", "tools/farmacia_ea_r1_revision2_amendment_check.mjs", "tools/farmacia_ea_r1_followup_check.mjs"],
  "doNotTouch": ["docs/metis/", "metis/"],
  "ports": [],
  "witness": [{"id": "ea-r1-revision2-amendment-oracle", "cmd": ["node", "metis/oracles/ea-r1-revision2-amendment.mjs"], "timeoutSec": 300, "mustFailAtBase": true}]
}
```