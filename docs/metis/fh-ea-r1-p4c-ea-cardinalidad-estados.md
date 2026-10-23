# FH-EA R1 · Cardinalidad, estados y borradores

## Problema y autoridad

BASE `f89e9bd627cb3abad982ef72f22a437e82cea487` tiene captura T01 en memoria, pero no una validación pura focal de EA. Esta unidad no conecta esa captura, no guarda y no cambia los bloques opacos ni las firmas F4.4.

Autoridad: CODING_STANDARDS.md; Spec EA v0.5 D02–D07 (`docs/contracts/FH_EA_0N_SPEC_V0_5_PRODUCT_BASE_20261018.md`); plan de rescate (`docs/ops/PLAN_RESCATE_FH_EA_NEXUS_20261023.md`); ADR-005; módulos Pharmacy Act F4.4 y captura publicada en `scripts/farmacia_seguimiento.js`. D-R1-01 ratifica la contradicción también para `no_consta`. No se requiere revisar G2.

## Hechos requeridos

1. Añadir únicamente un módulo puro mínimo EA separado de F4.4, sin almacenamiento, paciente activo, reloj, generación de identidades, dependencias ni contrato universal. No modificar módulos F4.4 ni controlador T01.
2. Admitir 0/1/2/5 y N>5 observaciones nuevas en un solo acto, conservando orden, identidades y textos originales; sin crear actos o líneas terapéuticas. Dos fichas con igual descripción no se fusionan.
3. Conservar exactamente `si`, `no`, `no_consta`. Rechazar `si` sin observaciones incorporadas del acto y `no`/`no_consta` con alguna. Otros tokens no se normalizan. Observaciones de otro acto no cuentan ni se alteran: `no` no resuelve historia.
4. Borradores, incluso sin descripción, quedan fuera de la representación conforme, pero se conservan intactos. Solo fichas nuevas con descripción original explícita no vacía pueden incorporarse. Solo descripción basta: sin exigir sospechoso, gravedad o causalidad ni inventarlos. No transformar una ficha incompleta en finalizada.
5. Recibir paciente, acto, `episode_id` y `observation_id` explícitos: nunca generar ni intercambiar sus roles. Rechazar asociaciones contradictorias de paciente. Preservar ausencias y datos aportados, sin completar clínica.
6. Resultado determinista, entradas intactas también al rechazar, fallos estructurados sin representación parcial y salidas profundamente desconectadas, incluidos borradores e historia retenidos. Una llamada posterior con otro paciente no conserva contexto de la anterior.
7. Añadir `tools/farmacia_ea_r1_states_check.mjs`, ejecutar ese check, los tres checks existentes sin modificarlos y `npm run -s verify:nexus`. Informar impedimentos del entorno, no ocultarlos ni reparar suites ajenas.

## Seam técnico focal (no DTO universal)

Para hacer ejecutable el contrato sin invadir unidades posteriores, exportar en el patrón browser del repositorio `HubTools.farmaciaEaInvariants.validateNewEvents(request)` desde `modules/farmacia_ea_invariants.js`. No requiere cargar F4.4. Es una validación de **nuevas fichas**, no una API para continuación/corrección de episodios.

Entrada: `{patientRef, actId, present, adverse_events}`. Referencias de contexto: strings propios no vacíos. Cada ficha trae explícitamente `{patientRef, actId, episode_id, observation_id, status, description?}`; IDs strings no vacíos, `status` exacto `draft` o `incorporated`, vocabulario T01. Las referencias por ficha delimitan su asociación, no una fuente alternativa de identidad. Las fichas del mismo paciente y otro acto se retienen sin incorporarlas al acto actual. No deducir las referencias del contexto; el llamador debe aportarlas. La adaptación de las fichas T01, que hoy no llevan esas referencias, pertenece a la unidad posterior.

Éxito: `{ok:true, representation:{patientRef,actId,present,adverse_events}, retained}`. La colección representada contiene exclusivamente incorporadas del acto actual; `retained` contiene las restantes (borradores e historia) en orden, sin descartarlas. Ambos conservan los objetos explícitos completos, sin completar campos. Fallo: `{ok:false,error:{code,message}}`, sin `representation` ni fichas parciales. No se exige texto ni prioridad concreta del error. Entradas clínicas son árboles de datos planos/arrays y escalares compatibles con F4.4; no hace falta soportar objetos de plataforma. Validación nunca debe lanzar para datos inválidos ordinarios.

## Fuera de alcance

Continuidad/recurrencia, revisión expresa, selección de episodios, corrección/anulación y versionado, evaluación/selección de sospechosos o causalidad, adaptación T01 al acto, UI, persistencia, identidad activa, Excel/Bridge, API, CSV, F4.5, otras superficies y cualquier cambio fuera de las dos rutas autorizadas. Conservar campos explícitos no implementa esas reglas futuras. No se prueba ni exige una declaración «sin cambios» en esta unidad.

## Open questions

None dentro de esta unidad. Mínimos institucionales adicionales y decisiones de destino siguen diferidos; no autorizan requisitos implícitos.

## Evidencia de preparación

Oráculo ejecutado sobre BASE sin solución: exit 1, aserción `Missing pure EA validation behavior` (sin import fallido). Instalación offline completada; Node disponible v26.7.0 frente al rango declarado >=20 <21 produce EBADENGINE. Las regresiones deben informarse con esta limitación, sin afirmar acreditación en Node 20.

Con referencia privada: oráculo y check focal PASS; F4.4 contract 243/243, payloads 145/145, T01 69/69, todos exit 0 sin modificar suites. `npm run -s verify:nexus` completó exit 0 en el Node disponible. No hubo impedimentos de ejecución adicionales; no se afirma prueba de navegador ni persistencia. La solución queda fuera de los commits de preparación.

## Trazabilidad

| Requisito | Testigo / criterio |
| --- | --- |
| 1 | `ea-states-oracle`: carga aislada sin globals clínicos; revisión del diff/rutas; regresiones F4.4 |
| 2 | `cardinality`, `equal descriptions` del oráculo |
| 3 | `state matrix`, `historical observations`, `exact tokens` |
| 4 | `drafts`, `description only`, `incomplete incorporation` |
| 5 | `explicit identities`, `association mismatch`, `description only` |
| 6 | `failure atomicity`, `deep isolation`, `repeat A/B` |
| 7 | `ea-states-oracle` ejecuta el check focal; `act-contract`, `act-payloads`, `ea-t01`; regresión verify:nexus añadida por perfil |

```metis-unit
{
  "schema":"metis.unit/v1",
  "unit":"ea-cardinalidad-estados",
  "riskClass":"complex",
  "uiImpact":"none",
  "sizeClass":"M",
  "maxCorrections":1,
  "allowedPaths":["modules/farmacia_ea_invariants.js","tools/farmacia_ea_r1_states_check.mjs"],
  "doNotTouch":["docs/metis/","metis/","modules/farmacia_act_contract.js","modules/farmacia_act_payloads.js","tools/farmacia_act_contract_check.mjs","tools/farmacia_act_payloads_check.mjs","tools/farmacia_ea_t01_check.mjs"],
  "ports":[],
  "witness":[
    {"id":"ea-states-oracle","cmd":["node","metis/oracles/ea-cardinalidad-estados.mjs"],"timeoutSec":60,"mustFailAtBase":true},
    {"id":"act-contract","cmd":["node","tools/farmacia_act_contract_check.mjs"],"timeoutSec":120,"mustFailAtBase":false},
    {"id":"act-payloads","cmd":["node","tools/farmacia_act_payloads_check.mjs"],"timeoutSec":120,"mustFailAtBase":false},
    {"id":"ea-t01","cmd":["node","tools/farmacia_ea_t01_check.mjs"],"timeoutSec":120,"mustFailAtBase":false}
  ]
}
```
