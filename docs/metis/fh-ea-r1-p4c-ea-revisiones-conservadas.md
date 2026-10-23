# FH-EA R1 · Correcciones y anulaciones sin pérdida

Unidad `ea-revisiones-conservadas` (4/5), BASE de preparación
`7817f700a214d69a4c88df2ded09bd1e39db01ac`. Sin impacto UI.

## Problema y autoridad

El módulo puro ya valida fichas, observaciones y asociaciones clínicas, pero no
ofrece una operación explícita de corrección/anulación de un registro finalizado
que retenga ambas revisiones. No es un almacén ni un segundo contrato de actos.

Fuentes: Spec EA v0.5 D02–D07
(`docs/contracts/FH_EA_0N_SPEC_V0_5_PRODUCT_BASE_20261018.md`), plan publicado
`docs/ops/PLAN_RESCATE_FH_EA_NEXUS_20261023.md` §4 R1,
`docs/architecture/adr/ADR-005-clinical-write-contracts.md`, contrato publicado
en `modules/farmacia_act_contract.js` (revision/amendment), T01 publicado
en `tools/farmacia_ea_t01_check.mjs`. Prevalece el alcance aprobado de esta unidad;
no se requiere revisar G2 ni habilitar persistencia.

## Comportamiento solicitado (hechos numerados)

1. Añadir al módulo existente una entrada pura `validateRevision({operation,
   previous, next})`. `operation` declara `correction` o `annulment`.
   Son nombres técnicos locales para hacer comprobable D07, no decisiones
   clínicas adicionales ni una API de guardado. Ambas entradas son registros
   EA con `status: 'incorporated'`. Una anulación se expresa por la operación
   explícita y una revisión nueva; no elimina la anterior ni significa resolución.
2. Cada registro aporta patientRef, actId, episode_id, observation_id explícitos
   y no vacíos; los cuatro coinciden entre revisiones. La revisión anterior
   debe estar finalizada. `revision` es entero >=1 en ambas entradas; la nueva
   es estrictamente mayor, sin exigir incremento unitario. `next.amendment`
   tiene exactamente `{previousRevision, reason}` como F4.4, referencia la
   revisión recibida y contiene motivo string no vacío. Conservarlo verbatim.
3. Éxito: `{ok:true, operation, previous, next}` permite recuperar íntegramente
   los datos, identidades y metadata de ambas revisiones. Cambios clínicos y
   desvinculaciones explícitas no borran los datos de la revisión anterior.
   Validar coherencia de referencias de sospechas/evaluaciones con su registro
   como en las unidades previas; no completar datos desde la revisión anterior.
4. Sin motivo/referencia/identidad coherentes, rechazar con
   `{ok:false,error:{code,message}}`, sin éxito ni representación parcial.
   No se prescribe código, mensaje ni prioridad entre errores. Ningún resultado
   muta las entradas. No compartir referencias editables entre entradas/salidas,
   revisiones ni ejecuciones; las operaciones repetidas son deterministas y no
   regeneran IDs. No mantener contexto oculto entre pacientes A/B/A.
5. Preservar campos ausentes, undefined propio, null y demás centinelas. No
   autorrellenar fecha clínica, fecha de acto, fecha de autoría ni autoría;
   tampoco gravedad, actuación, evolución, sospechosos o causalidad. Esta
   validación focal no construye un envelope F4.4: no exige sus campos de
   tiempo/autor ni sustituye su builder, que permanece intacto.
6. Una observación expresa del mismo episodio en otro acto sigue entrando por
   `validateObservations`: conserva el acto previo y su observación, posee ID
   de observación propio y no exige amendment ni motivo de corrección.
7. Añadir `tools/farmacia_ea_r1_revisions_check.mjs` con pruebas Node focales.
   Ejecutar ese check, los tres checks R1 anteriores, los oráculos previos y los
   tres checks F4.4/T01 sin modificarlos. Ejecutar `npm run -s verify:nexus`
   según capacidad y distinguir fallo del entorno de éxito. Sin dependencias
   nuevas, red ni cambios en suites para ocultar fallos.

## Fuera de alcance

Adaptación pasiva T01 (unidad 5), UI, controladores, payload/envelope F4.4,
permisos clínicos, paciente activo, Excel, puertos, sesiones, IndexedDB,
guardado/recuperación, backend, entrega F4.5, exportaciones, terminología y datos
reales. No imponer mínimos clínicos institucionales, ni inferir asociaciones.
No crear IDs ni identidad alternativa. STOP ante necesidad de regla clínica no
ratificada o de rutas fuera de alcance.

## Open questions

None dentro de esta unidad. Formato persistido, flujo UI y reglas de permisos
no se deciden aquí. Los nombres de la entrada/salida anteriores fijan únicamente
el seam técnico focal que el oráculo puede invocar.

## Trazabilidad

| Requisito | Testigo |
| --- | --- |
| 1, objetivo 1: corrección/anulación expresa | ea-revisions-oracle: ambas operaciones válidas y operación inválida |
| 2, R1.05/F4.4 | ea-revisions-oracle: motivo ausente/vacío, enlace erróneo, enteros y salto 1→5, identidades faltantes/intercambiadas, borrador |
| 3, objetivo 2 | ea-revisions-oracle: igualdad íntegra previous/next, desvinculación, revisión encadenada |
| 4, R1.09/objetivo 3 | ea-revisions-oracle: atomicidad, mutación anidada, reintentos, A/B/A |
| 5, R1.06 | ea-revisions-oracle: ausencia y centinelas de tiempos/autor/gravedad; ea-clinical-oracle (regresión) |
| 6, objetivo 4 | ea-revisions-oracle: mismo episodio en acto B sin amendment; ea-identity-oracle (regresión) |
| 7, objetivo 5 | ea-revisions-oracle invoca check focal, tres checks R1, oráculos previos y tres checks F4.4/T01; verify-nexus agregado por perfil |

## Unidad ejecutable

Evidencia de preparación: oráculo en BASE falló por aserción de comportamiento
de revisión ausente (no por importación ni timeout). Con referencia privada:
oráculo PASS, incluidos check focal, checks R1 y F4.4/T01; `verify:nexus` PASS.
Instalación offline completada; Node v26.7.0 emitió aviso de engine (proyecto
declara Node 20), sin impedir las verificaciones. No se modificaron suites.

```metis-unit
{
  "schema": "metis.unit/v1",
  "unit": "ea-revisiones-conservadas",
  "riskClass": "complex",
  "uiImpact": "none",
  "sizeClass": "M",
  "maxCorrections": 1,
  "allowedPaths": ["modules/farmacia_ea_invariants.js", "tools/farmacia_ea_r1_revisions_check.mjs"],
  "doNotTouch": ["docs/metis/", "metis/"],
  "ports": [],
  "witness": [{"id": "ea-revisions-oracle", "cmd": ["node", "metis/oracles/ea-revisiones-conservadas.mjs"], "timeoutSec": 180, "mustFailAtBase": true}]
}
```
