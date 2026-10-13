# WO documental — Train31 Estadísticas FH postmerge (2026-10-14)

**Issue:** [#771](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/771), aprobada como WO documental atómica.
**Autoridad humana:** publicar y mergear el Train31 con checks verdes; reconciliar documentación y cerrar #768/#769.
**Publicación clínica:** [PR #770](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/770) MERGED, commit acb7038a8bbdf0fa2e38eac09d93c8558252bdd5 en promueve/nexus-v4.
**Base documental fijada:** promueve/nexus-v4@acb7038a8bbdf0fa2e38eac09d93c8558252bdd5; rama local aislada docs/train31-fh-stats-postmerge-20261014.
**Estado producto:** IMPLEMENTADO / PUBLICADO / QA SINTÉTICA; **NO PILOTO**.

## Objetivo y alcance funcional acreditado

Registrar cierre postmerge de U1 #768 (gravedad EA presente con severidad explícita) y U2 #769 (movimiento terapéutico explícito normalizado), originados en SIL-REV-018, contratos #685 y #686 CLOSED/completed.

La interfaz de Estadísticas ahora dispone de nueve filtros: siete anteriores, gravedad EA y movimiento registrado. Se combinan mediante AND y una misma cohorte de pacientes gobierna contador, KPI, gráficos, tabla y CSV. CSV de Estadísticas conserva sus 37 columnas y la proyección clínica original no se modifica.

La gravedad requiere status present y severity explícita **en el mismo evento**. El movimiento requiere evento tipado o suspensión explícita normalizada. Ausente o desconocido no se convierte en negativo, ni el nombre de un medicamento, variación de fármacos o visita construyen START, SWITCH, ADD_ON o causalidad.

**SIL-REV-018-B: cumplimiento parcial exclusivo de EA/gravedad y movimientos.** Quedan por resolver como unidades separadas PROM/instrumento/valor, validación y causalidad; SIL C (dosis/ruta/pauta), D (ventanas/concurrencia) y E (demografía/comorbilidades) siguen pendientes de sus correspondientes contratos o fuentes. El overflow horizontal preexistente 820/1080 de la tabla no se corrige aquí.

## Evidencia de aceptación

- PR #770: cuatro checks PR PASS, cuatro commits de producto/QA, diff de exactamente dos archivos runtime y dos checkers.
- QA sintética independiente de Cora sobre candidato final 9a892ebb1aa013cb4d3c42f0a86f86e18894f148: Cohort 30 escenarios PASS; Chromium extra filtros 19/19 PASS; Chromium principio activo 11/11 PASS; console.error=0/pageerror=0; git diff --check PASS.
- Standards y Spec independientes por U1 y U2; cierre del hallazgo material de Spec U2 mediante aserciones focales de KPI/gráficos. Actualización acotada del testigo 7 a 9 grupos aprobada explícitamente.
- [Nexus deterministic gates postmerge](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/38474940173): SUCCESS.
- [GitHub Pages postmerge](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/38474938655): SUCCESS.
- Issues #768/#769 CLOSED/completed tras verificar merge y CI postmerge. El despliegue Pages **no acredita QA manual en URL hospedada ni uso hospitalario/piloto real**.

## Rutas y DO NOT TOUCH

Rutas documentales autorizadas: docs/INDEX.md, docs/ops/WORK_ORDER_STATUS.md, docs/ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md, docs/ops/FARMACIA_ESTADO_Y_BACKLOG_20261011.md y esta WO. Exactamente cinco Markdown.

**NO TOCA:** producto JS/HTML/CSS, tests, Cohort ni su CSV, Export V2, import Excel Enfermería, Validación FH, CIMA, seguimiento terapéutico, F4.5, Reumatología, arnés Atenea, datos reales, otras ramas/worktrees o main. No reescribir el estado histórico de otras WOs.

## QA documental, reversión y política

Comprobar diff restringido a cinco Markdown, git diff --check, enlaces locales y GitHub, coherencia de INDEX/status/ledger/backlog, sin atribuciones falsas de QA clínica hospedada o estado de piloto.

Reversión solo con revert focal autorizado; nunca force-push, reset destructivo o limpieza de trabajos ajenos. La instrucción humana autoriza commit, push, PR y merge de esta WO documental si los checks son verdes. Si el remoto avanza o el CI falla, HUMAN STOP. Cerrar #771 completed solo cuando la PR documental se integre satisfactoriamente.

## Output

Reportar commit, PR/CI/merge documental, cierre de issues y preservación del handoff original no versionado junto a los worktrees. Sin autorizar nuevas funcionalidades.
