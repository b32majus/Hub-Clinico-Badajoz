# FH-EA R1 · Ausencias y asociaciones clínicas explícitas

## Problema y fuentes

Unidad `ea-ausencias-causalidad`, BASE `2b83ad743b01e5123808e5f84d31b9df794bde62`. Los validadores puros existentes conservan fichas opacas, pero pierden la fecha declarada del acto y no comprueban las referencias clínicas anidadas. No crear una historia alternativa ni conectar todavía T01.

Autoridad leída: CODING_STANDARDS.md; Spec EA v0.5 D02–D07 (`docs/contracts/FH_EA_0N_SPEC_V0_5_PRODUCT_BASE_20261018.md`); `docs/ops/PLAN_RESCATE_FH_EA_NEXUS_20261023.md`; ADR-005; contrato/payloads F4.4 y T01 publicada, protegidos por sus tres checks. D-R1-01/02 son decisiones ratificadas del issue. No se necesita revisar G2 ni acceder fuera del checkout.

## Hechos requeridos

1. En ambos validadores existentes, conservar valores explícitos, desconocidos y ausentes: missing ≠ own undefined ≠ null ≠ cadena vacía ≠ 0 ≠ false. Preservar también `NO_VALUE`, `No informado` y texto literal, sin trim, normalización ni sustitución por clínica anterior. No exigir campos clínicos opcionales para finalizar una ficha nueva con descripción.
2. Recibir opcionalmente `occurredAt` una vez, en el contexto del acto. Si es propiedad propia, devolverla exactamente una vez en `representation`; si falta, no crearla. Es transporte puro de dato ya declarado, no validación de metadata F4.4 ni obligación de informar fecha. Nunca proyectar esa fecha como inicio/resolución EA, duración, autoría, tratamiento, gravedad, evolución o actuación. Conservar fechas clínicas explícitas, incluso distintas de la del acto, sin completar otras.
3. Medicamentos listados, prescritos o históricos no son sospechosos. Preservar selecciones expresas por episodio, sin unir episodios iguales ni heredar automáticamente sospechas en una recurrencia. Una revisión sin cambios no copia clínica histórica al registro actual.
4. No fabricar evaluaciones Naranjo/Karch-Lasagna, resultados, respuestas, fechas, autores ni estados de completitud. Un cero de presentación no acredita evaluación; un cero expresamente documentado en una evaluación sí se conserva. Preservar por separado identidad de evaluación, pareja episodio–medicamento, método y acto, respuestas y resultados aportados, incluidos borradores. No calcular, fusionar, completar ni sobrescribir historia al reevaluar en otro acto.
5. Asociaciones clínicas expresas necesitan referencias explícitas coherentes. Rechazar paciente/episodio ajeno y evaluación con acto distinto al de su observación contenedora, también en historia; ausencia/intercambio de referencias no autoriza asociación. Fallo estructurado sin representación parcial ni mutación. No imponer un texto o prioridad particular de errores. Éxitos desconectados profundamente, deterministas y aislados entre episodios, parejas, métodos, actos y pacientes (A→B→A).
6. Añadir y ejecutar `node tools/farmacia_ea_r1_clinical_data_check.mjs` con testigos de ausencia, no inferencia y contaminación. Mantener checks/oráculos R1 anteriores y los tres checks F4.4/T01. Ejecutar `npm run -s verify:nexus` según capacidad sin modificar suites.

## Seam técnico focal (no DTO institucional)

Extender `HubTools.farmaciaEaInvariants.validateNewEvents` y `validateObservations`, conservando firmas, estados, identidades y resultados anteriores. Se mantienen reglas de cardinalidad, selección/revisión expresa, historia, borrador y contradicción de estado. No introducir otro API ni fuente de actos. `occurredAt` es el único nuevo dato de contexto que esta unidad proyecta; las fichas clínicas siguen siendo copias verbatim, no construcciones desde un catálogo.

Para hacer verificables las asociaciones, esta preparación fija una representación técnica mínima local dentro de las fichas, no un cuestionario ni una decisión clínica nueva:

- `suspicions`, si es un array, contiene referencias expresas `{patientRef, episode_id, medicationRef, ...datosExplícitos}`. Paciente y episodio deben coincidir con la ficha. No exigir acto en una sospecha: pertenece al episodio.
- `evaluations`, si es un array, contiene registros `{evaluation_id, patientRef, episode_id, medicationRef, method, actId, ...datosExplícitos}`. Paciente/episodio/acto deben coincidir con la ficha contenedora. Identidad, medicamento y método son strings propios no vacíos, preservados literalmente; métodos opacos, sin traducir ni convertir entre Naranjo y Karch-Lasagna. No se verifica algoritmo, rango de puntuación ni suficiencia de respuestas.
- Estos arrays son declaraciones explícitas, nunca derivados de `medications`, prescripciones, historia, puntuaciones visuales ni `basis`. Las referencias no se resuelven contra un catálogo ni se acredita exposición. Una evaluación aportada no exige repetir una lista activa de sospechas: se conservan también valoraciones históricas de medicamentos desvinculados. No exigir `result`, `responses`, `state`, fechas ni autores si faltan.
- Campos ausentes y centinelas escalares de estas colecciones permanecen tales, no se convierten en arrays vacíos ni evaluaciones. Un array declarado debe contener registros con referencias completas; no autoriza una asociación incompleta. Se conserva todo dato plano adicional sin interpretación. El oráculo usa `visualScores` como dato opaco para demostrar que cero no produce evaluación; no crea un contrato de presentación.

El mismo control de referencias aplica a fichas nuevas, borradores e historia recibida. Las observaciones históricas conservan sus evaluaciones en su acto original, nunca se recolocan en el actual. No implementar retirada de sospechas, correcciones/anulaciones ni versionado de registros (unidad posterior).

En `evolution`, solo los tokens longitudinales ya soportados (`continuation`, `resolution`, `recurrence`) acreditan una declaración longitudinal y requieren `basis`. Un valor desconocido/centinela se conserva como dato, no acredita revisión ni resuelve un episodio; la revisión expresa sigue siendo necesaria cuando no hay una evolución longitudinal declarada.

## Fuera de alcance

Adaptación pasiva T01 (unidad posterior), integración UI, fechas/relojes generados, mínimos clínicos institucionales, cuestionarios/cálculo/flujo V3, persistencia/lectura, IndexedDB, identidad o sesión paralela, catálogo, Excel, CSV, Bridge/F4.5, backend, permisos, terminología, FEDRA y pacientes reales. No cambiar F4.4, T01 ni suites existentes. No modificar otras rutas de producto que las dos autorizadas.

## Open questions

None para esta unidad. La grafía técnica local de asociaciones no ratifica un DTO clínico universal; integración y mínimos institucionales siguen diferidos.

## Trazabilidad

| Hecho / requisito del issue | Testigo |
| --- | --- |
| 1 / R1.06 centinelas y ausencias | `ea-clinical-oracle`: matriz por ambos validadores, comparación exacta y propiedad own undefined; fechas clínicas y texto literal |
| 2 / fecha única, no clínica inferida | mismo: act date presente/ausente/centinelas, igualdad exacta de fichas sin nuevos campos |
| 3 / R1.07 sospecha expresa y recurrencias | mismo: medicamentos listados/prescritos/históricos, revisión sin cambios y recurrencia con historia poblada, arrays por episodio |
| 4 / causalidad no inferida y conservada | mismo: cero visual sin evaluación, cero documentado; dos episodios × dos medicamentos × dos métodos; nueva evaluación en C e historia B intacta |
| 5 / R1.09 y contaminación | mismo: referencias ausentes/cruzadas, episodio ajeno, acto histórico contaminado, fallos atómicos, clonación y A→B→A |
| 6 / comprobaciones | oráculo ejecuta clinical_data_check, oráculos R1 anteriores y tres checks F4.4/T01; perfil añade regresiones y verify-nexus |
| R1 anteriores sin ampliarlos | ea-states-oracle, ea-identity-oracle: cardinalidad/estados/borradores, identidad longitudinal/revisión expresa |

## Evidencia de preparación

Oráculo en BASE ejecutado: exit 1 por aserción de comportamiento (falta `representation.occurredAt`), no crash/import ausente. Instalación offline completada. Sin impacto visual ni receta. La solución privada se deja sin commit y la evidencia de ejecución final se comunica en el cierre.

Con referencia privada: oráculo y check clinical_data PASS; ambos oráculos/checks R1 previos y los tres checks F4.4/T01 PASS (ejecutados por el oráculo). `npm run -s verify:nexus` exit 0, sin retocar suites. La instalación avisa EBADENGINE por Node v26.7.0 frente a >=20 <21: no se acredita Node 20 ni ejecución de navegador/persistencia.

```metis-unit
{
  "schema":"metis.unit/v1",
  "unit":"ea-ausencias-causalidad",
  "riskClass":"complex",
  "uiImpact":"none",
  "sizeClass":"M",
  "maxCorrections":1,
  "allowedPaths":["modules/farmacia_ea_invariants.js","tools/farmacia_ea_r1_clinical_data_check.mjs"],
  "doNotTouch":["docs/metis/","metis/","tools/farmacia_ea_r1_states_check.mjs","tools/farmacia_ea_r1_identity_check.mjs","modules/farmacia_act_contract.js","modules/farmacia_act_payloads.js","tools/farmacia_act_contract_check.mjs","tools/farmacia_act_payloads_check.mjs","tools/farmacia_ea_t01_check.mjs"],
  "ports":[],
  "witness":[
    {"id":"ea-clinical-oracle","cmd":["node","metis/oracles/ea-ausencias-causalidad.mjs"],"timeoutSec":120,"mustFailAtBase":true}
  ]
}
```
