# Plan maestro de rescate — PROMueve Farmacia V4

**Estado:** plan vivo reconciliado con la integración hasta PR #116
**Fecha de reconciliación:** 2026-07-26
**WO:** `WO-DOC-FH-RESCUE-MASTER-PLAN-V4-01`  
**Issue:** #61  
**Rama de rescate integrada:** `rescue/farmacia-v4`
**Último HEAD funcional reconciliado:** `6e920bb68d8796b9780c7daaf106fe80d14c7d78` (PR #116). La propia reconciliación documental puede avanzar posteriormente el HEAD sin añadir funcionalidad clínica.
**Fuente Pages configurada/publicada:** `preview/demo-lunes-wo4-20260614` en `2ee3b34739abec874424a572d445798fef565765`
**Ref candidata coincidente:** `preview/farmacia-v4-rescue` en `2ee3b34739abec874424a572d445798fef565765`; no es una segunda fuente Pages publicada
**Inicio de publicación temporal:** issue #80 llevó inicialmente la fuente Pages a `8902aa334ab2ed51ae47c187603595f6e75f9d92`; no cubre todo el avance posterior
**Referencia hospitalaria preservada:** `backup/preview-hospital-before-v4-qa-20260725` en `35a2cdd58a43f588a94882824bf1de9444521ad6`
**Baseline hospitalario histórico:** `a6b15353a2e5a813818695642a07f0d27298904e`
**Estado avanzado preservado:** `backup/preview-before-hospital-demo-rollback-20260722`  
**HEAD avanzado preservado:** `c19297b68cd188cc455ffcd7a45bc6831f8fb54a`

---

## 1. Propósito

Este documento gobierna el rescate funcional de PROMueve Farmacia Hospitalaria V4 después de reconciliar:

- el estado publicado utilizado como referencia hospitalaria;
- la evolución avanzada preservada antes del rollback;
- las auditorías técnicas y funcionales;
- los contratos de datos;
- los Excel sintéticos de Enfermería y Farmacia;
- los escenarios clínicos históricos y actuales;
- los límites entre demo, piloto real y producto futuro.

La reconstrucción previa se considera suficientemente cerrada. El problema rector no es la ausencia de funcionalidad aislada, sino la pérdida de historias sintéticas coherentes durante la migración a la fuente WO8 y la posterior evolución parcial del lifecycle terapéutico.

La estrategia aprobada fue no restaurar una rama completa, sino reconstruir una línea V4 controlada desde la referencia hospitalaria y recuperar selectivamente mejoras después de reparar el contrato de escenarios. Esa ejecución ya está integrada hasta PR #116; este documento conserva el razonamiento histórico y distingue lo integrado de lo publicado y de lo todavía pendiente.

---

## 2. Fuentes de verdad y referencias verificadas

### 2.1 Referencia hospitalaria histórica y backup actual

```text
preview/demo-lunes-wo4-20260614
a6b15353a2e5a813818695642a07f0d27298904e
```

Ese fue el baseline al iniciar el rescate. Antes de la publicación temporal V4 se preservó una referencia más reciente:

```text
backup/preview-hospital-before-v4-qa-20260725
35a2cdd58a43f588a94882824bf1de9444521ad6
```

Uso permitido:

- referencia visual y funcional;
- comparación durante el rescate;
- punto de rollback;
- evidencia de la superficie utilizada en la demostración hospitalaria.

El baseline histórico no es la integración actual. La preview sí fue movida después mediante la autorización operativa del issue #80; por ello ya no se considera congelada en `a6b15353...`.

### 2.2 Estado avanzado preservado

```text
backup/preview-before-hospital-demo-rollback-20260722
c19297b68cd188cc455ffcd7a45bc6831f8fb54a
```

Uso permitido:

- consultar implementaciones;
- recuperar contratos y tests;
- comparar comportamiento;
- reutilizar código acotado cuando proceda.

No debe convertirse directamente en nueva base de trabajo, publicarse como conjunto ni restaurarse mediante cherry-pick masivo.

### 2.3 `main`

`main` queda fuera del rescate y no se modifica sin autorización explícita separada.

### 2.4 Integración y publicación V4 verificadas

```text
rescue/farmacia-v4
6e920bb68d8796b9780c7daaf106fe80d14c7d78

preview/farmacia-v4-rescue
preview/demo-lunes-wo4-20260614
2ee3b34739abec874424a572d445798fef565765
```

La rama de rescate contiene la secuencia funcional integrada hasta PR #116. El issue #80 inició la publicación temporal llevando la fuente Pages `preview/demo-lunes-wo4-20260614` hasta `8902aa...`.

La rama fue avanzada posteriormente y su estado actual verificado es `2ee3b347...`, hasta PR #86. Esta reconciliación registra el estado actual sin atribuir todo el avance posterior al alcance original del issue #80. La candidata `preview/farmacia-v4-rescue` coincide en ese SHA, pero no es una segunda publicación Pages. En consecuencia, **integrado no equivale a publicado**: PR #88 a #116 no están acreditados en Pages.

---

## 3. Diagnóstico consolidado

### 3.1 Hallazgo rector histórico

La sustitución de pacientes demo y del longitudinal previo por el runtime derivado del Excel WO8 consiguió:

- una fuente técnica común;
- generación determinista;
- eliminación de pacientes legacy hardcodeados;
- fallo seguro sin fallback clínico;
- cableado común de las pantallas principales.

Sin embargo, no se publicó un contrato de paridad de escenarios que garantizara que las historias sintéticas utilizadas para construir y validar la demo continuaban existiendo con nuevos identificadores.

Por ello pudieron coexistir tests verdes y pérdida de coherencia funcional.

### 3.2 Contradicciones de partida de la fuente WO8

Estas contradicciones motivaron el contrato, manifiesto y runtime de PR #64, #66 y #68; se conservan como diagnóstico de partida:

- pacientes que figuran simultáneamente con validación pendiente y línea activa;
- una misma `linea_id` representada con estados incompatibles sin eventos temporales diferenciados;
- filas que mezclan acto, validación, línea, visita, seguimiento y movimiento sin secuencia longitudinal explícita;
- líneas sin identidad suficiente para Seguimiento multilínea;
- estados históricos, adicionales o activos que no pueden distinguirse de forma segura únicamente por posición o primera coincidencia.

### 3.3 Estado reconciliado

La referencia hospitalaria histórica:

- fue el baseline hospitalario/demo y conserva evidencia histórica de aquella superficie;
- ya utilizaba el runtime WO8;
- no recuperaba las historias legacy anteriores;
- no acredita piloto real.

El estado avanzado preservado:

- incorpora mejoras de no inferencia, bandejas, exportación y Seguimiento multilínea;
- separa solicitud, validación, línea y movimiento en un core canónico;
- representa `validated_not_started` de forma segura;
- no completa la transición explícita `validated_not_started -> active`;
- no implementa switch, add-on, renovación ni lifecycle completo;
- no acredita piloto real.

El rescate integrado actual:

- contiene contrato y manifiesto sintéticos y runtime de paridad (PR #64, #66 y #68);
- contiene el cableado de Inicio V4 y recuperaciones selectivas de catálogo/no inferencia, verdad visible y core multitratamiento;
- integra Validación con persistencia canónica, QA de navegador real, importación XLSX sintética por interacción soportada, exportación canónica y rectificación reversible antes del inicio (PR #75–#86);
- integra el core de inicio y la cadena de Primera Visita hasta confirmación explícita, handoff a Seguimiento y bloqueo de rectificación post-inicio (PR #91–#106);
- cierra en PR #110 el gate que impide exportar antes del inicio y genera JARA/CSV/Excel postinicio desde el contexto canónico, con `start_date` canónico, 61 columnas Excel, defaults clínicos neutrales y QA soportada S01–S08;
- integra en PR #114 el contexto canónico y gate de Seguimiento sobre `patient_id + line_id`: solo líneas `active` son elegibles, las históricas permanecen visibles pero no elegibles, la selección es explícita cuando existen varias activas y la búsqueda CIP falla de forma cerrada;
- integra en PR #116 borradores de Seguimiento aislados por `patient_id + line_id` en `sessionStorage` versionado y fail-closed, con restauración/separación exactas y guard S12 antes de cambiar paciente, CIP, línea, URL o contexto dentro de Seguimiento;
- inicia parcialmente la Fase 5 en ese alcance de contexto, gate, borradores y guard, sin cerrar S09–S12 ni demostrar el guard S12 transversalmente;
- mantiene bloqueados el registro clínico interno, las exportaciones JARA/CSV/Excel de Seguimiento y los dashboards canónicos; tampoco acredita release freeze, backend, V5 ni piloto.

La fuente Pages publicada actual llega solo a PR #86. No acredita como publicados PR #88–#116, incluidos el cutover operativo, la cadena de inicio/Primera Visita y el alcance parcial de Seguimiento.

---

## 4. Objetivo V4 del rescate

Construir una V4:

- local-first y backend-ready;
- apoyada exclusivamente en datos sintéticos coherentes y versionados durante demo;
- con solicitud, validación, inicio, línea y seguimiento diferenciados;
- clínicamente no inferencial;
- capaz de representar varias líneas sin mezclarlas;
- con salidas manuales revisables para JARA/CSV/Excel;
- probada mediante interacción soportada y QA visible;
- preparada para una futura evaluación de piloto.

No pretende todavía:

- producción;
- datos reales;
- integración JARA automática;
- autenticación o permisos institucionales;
- backend definitivo;
- renovaciones o lifecycle completo;
- configuración V5 agnóstica.

---

## 5. Rama de integración y preview

La rama propuesta fue creada y es la integración viva verificada:

```text
rescue/farmacia-v4
```

Base histórica usada para iniciar el rescate:

```text
a6b15353a2e5a813818695642a07f0d27298904e
```

Reglas:

1. backup previo;
2. worktree aislado;
3. una rama por WO;
4. cada WO parte del último HEAD validado de `rescue/farmacia-v4`;
5. tests y QA según riesgo;
6. revisión independiente cuando proceda;
7. commit, push, PR y merge solo dentro de la autorización concreta;
8. no mover previews sin autorización específica;
9. no tocar `main`.

La ref candidata separada fue creada:

```text
preview/farmacia-v4-rescue
```

El issue #80 inició la publicación temporal llevando solo la fuente Pages configurada `preview/demo-lunes-wo4-20260614` hasta `8902aa...`.

La rama fue avanzada posteriormente y su estado actual verificado es `2ee3b347...` (PR #86). Esta reconciliación registra el estado actual sin atribuir todo el avance posterior al alcance original del issue #80. La candidata `preview/farmacia-v4-rescue` coincide en el SHA actual; no fue una segunda fuente Pages movida/publicada. Ambas refs van por detrás del rescue HEAD. Cualquier movimiento adicional requiere autorización separada; este plan no lo autoriza.

---

## 6. Contrato mínimo de escenarios

El contrato documental separado se integró en PR #64 y el manifiesto versionado en PR #66. Define doce escenarios:

1. solicitud prebiológica bloqueada;
2. solicitud en vigilancia;
3. Enfermería lista para Validación;
4. solicitud general no procedente de Enfermería;
5. validación pendiente;
6. validación denegada;
7. validado pendiente de inicio;
8. inicio confirmado en Primera Visita;
9. seguimiento de una línea activa;
10. línea histórica sin reactivación;
11. varias líneas activas o relacionadas;
12. cambio de paciente con datos sin guardar.

Cada escenario deberá definir:

- identidad sintética estable;
- fuente de entrada;
- estado inicial;
- hechos explícitos;
- datos deliberadamente ausentes;
- pantallas y acciones soportadas;
- resultados esperados;
- persistencia/restauración;
- salidas;
- acciones prohibidas;
- evidencia de aceptación.

No se considerará demostrado un escenario mediante manipulación de DOM, modificación de `readonly`, fixtures imposibles o estados inaccesibles por la interacción soportada.

---

## 7. Fases del rescate

### Fase 0 — Reconstrucción y gobierno

**Estado:** cerrada.

Entregables consolidados:

- cronología reconciliada;
- comparación hospitalaria/avanzada;
- diagnóstico causal;
- matriz funcional;
- contrato mínimo propuesto de escenarios;
- clasificación de piezas recuperables;
- separación demo/piloto/producto futuro.

### Fase 1 — Contrato y fuente de escenarios

**Estado reconciliado:** completada e integrada en PR #64, #66 y #68. El contrato, manifiesto y runtime determinista existen; esto no demuestra por sí solo cada flujo de pantalla.

**Objetivo:** reparar la fuente sintética antes de tocar pantallas.

Trabajo previsto:

- publicar el contrato de escenarios;
- crear un manifiesto versionado;
- corregir contradicciones WO8;
- generar un runtime determinista;
- añadir checks de paridad.

Criterios de salida:

- doce escenarios válidos;
- cero contradicciones conocidas de estado;
- ausencia de inferencias terapéuticas;
- IDs ausentes conservados como ausentes;
- fallo de carga seguro;
- hashes y versionado;
- sin cambios de UI.

### Fase 2 — Inicio, bandejas e importación

**Estado reconciliado:** parcialmente completada. Inicio S01–S04 quedó cableado a la fuente V4 (`1a8e4f4...`); la importación real del XLSX sintético de Enfermería y su recorrido soportado están integrados en PR #79. No se declara cerrado todo importador Farmacia ni toda la aceptación de bandejas más allá de la evidencia integrada.

**Objetivo:** representar correctamente qué solicitudes requieren atención.

Trabajo previsto:

- importadores Enfermería y Farmacia;
- dos bandejas excluyentes;
- clasificación neutral;
- prevención de duplicados;
- acceso a Validación solo desde estado explícito apto.

Criterios de salida:

- escenarios 1 a 4 E2E;
- consola y `pageerror` cero;
- QA manual de bandejas;
- ningún fallback legacy.

### Fase 3 — Validación farmacoterapéutica

**Estado reconciliado:** integrada y probada en navegador dentro del alcance S01–S07. PR #75 persiste el acto canónico; #77 aporta QA real; #82 alinea exportación; #84 introdujo un guard inicialmente irreversible y #86 lo corrigió para permitir rectificación pre-inicio. PR #106 añade el bloqueo post-inicio en el rescue HEAD, pero ese último tramo no está publicado.

**Objetivo:** convertir Validación en fuente explícita del acto farmacéutico.

Trabajo previsto:

- pendiente, validado y denegado;
- no inferencia;
- exportación fiel al estado visible;
- solicitud y acto de validación separados;
- línea solo tras validación positiva;
- línea resultante en `validated_not_started`.

Criterios de salida:

- datos ausentes permanecen vacíos;
- pendiente y denegado no producen línea;
- validado produce una única línea no iniciada;
- 61 columnas fieles;
- persistencia/restauración demo;
- escenarios 3 a 7 E2E;
- QA manual.

### Fase 4 — Primera Visita e inicio explícito

**Estado reconciliado:** cerrada en alcance clínico-técnico e integrada en `rescue/farmacia-v4`. El core (#91), identidad (#98), contexto canónico (#100), confirmación explícita (#102), handoff (#104), bloqueo postinicio (#106) y salidas canónicas con QA S01–S08 (#110) cierran este alcance.

La Fase 4:

- existe en código;
- está cableada;
- está visible;
- funciona por interacción soportada;
- tiene tests;
- tiene QA de navegador;
- está integrada en `rescue/farmacia-v4`;
- **NO** está publicada en Pages;
- **NO** está congelada como demo-ready;
- **NO** es apta para piloto.

La publicación y el freeze no son condiciones del cierre técnico de Fase 4; permanecen bajo la Fase 7.

**Objetivo:** cerrar la transición:

```text
validated_not_started -> active
```

Trabajo previsto:

- confirmación profesional explícita;
- fecha real de inicio;
- mantenimiento de identidad de línea;
- no duplicación;
- habilitación posterior de Seguimiento.

La implementación integrada exige confirmación profesional explícita y fecha de inicio; no deben extrapolarse otros campos, roles o reglas clínicas más allá del contrato implementado.

Criterios de salida:

- el no iniciado no habilita Seguimiento;
- el inicio explícito activa la misma línea;
- no hay activación por catálogo, carga o selección;
- persistencia/restauración;
- QA visible.

### Fase 5 — Seguimiento por línea

**Estado reconciliado:** iniciada parcialmente. PR #114 demuestra contexto, selección y gate S09–S11 dentro de Seguimiento; PR #116 demuestra borradores por línea y guard S12 dentro de Seguimiento. Esto no cierra S09–S12, no constituye registro asistencial y no demuestra un guard S12 transversal fuera de Seguimiento.

Demostrado:

- resolución canónica `patient_id + line_id`;
- solo líneas `active` elegibles;
- líneas `historical` visibles y no elegibles;
- selección explícita cuando existen varias líneas activas;
- búsqueda CIP fail-closed;
- gate permanente de módulos y outputs;
- borradores independientes por línea en `sessionStorage` versionado y fail-closed;
- restauración y descarte exactos;
- guard S12 dentro de Seguimiento antes de cambiar paciente, CIP, línea, URL o contexto;
- QA Playwright soportada.

No demostrado o pendiente:

- Morisky y adherencia clínica;
- PROMs, DLQI y EVA;
- efectos adversos y causalidad;
- optimización;
- suspensión;
- JARA, CSV y Excel de Seguimiento;
- dashboards;
- cierre completo de S09–S12;
- guard S12 transversal fuera de Seguimiento.

**Objetivo:** recuperar Seguimiento canónico sobre historias coherentes.

Trabajo previsto:

- core multifármaco;
- migración del runtime al modelo canónico;
- selección por `patient_id + line_id`;
- solo `active` habilita Seguimiento;
- borradores, PROMs, adherencia, EA y causalidad por línea;
- JARA, CSV y Excel desde contexto común;
- cambio de CIP seguro.

Criterios de salida:

- escenarios 9 a 12 E2E;
- histórica visible pero no activa;
- aislamiento por línea;
- ninguna selección por nombre o posición;
- consola y `pageerror` cero;
- QA manual.

### Fase 6 — Dashboards y explotación

**Estado reconciliado:** no iniciada en el rescate V4 reconciliado.

**Objetivo:** reconstruir longitudinal y estadísticas desde eventos fiables.

Trabajo previsto:

- dashboard como proyección de lectura;
- estados vacíos honestos;
- identidad temporal explícita;
- unificación o retirada del sandbox longitudinal;
- estadísticas desde la fuente canónica.

Criterios de salida:

- cero fechas inferidas;
- cero excepciones;
- modelo común;
- QA visible;
- resultados sintéticos claramente etiquetados.

### Fase 7 — Release V4 demo estable

**Estado reconciliado:** pendiente. Existe una publicación parcial hasta PR #86, pero el rescue HEAD no está publicado y no hay freeze/checklist completo que permita etiquetarlo `V4 demo-ready`.

**Objetivo:** congelar una candidata demo-ready sin añadir funcionalidad.

Trabajo previsto:

- cache-busting y versión;
- checklist de navegador;
- pruebas en incógnito;
- importación, persistencia y exportación;
- capturas de evidencia;
- guion de demo;
- documentación de límites;
- backup y preview separada.

Criterio de salida:

```text
existe
+ está cableado
+ está visible
+ funciona por interacción soportada
+ tiene tests
+ tiene QA navegador
+ está publicado en la preview correcta
+ sirve para demo
```

Etiqueta resultante: `V4 demo-ready`, no piloto.

### Fase 8 — Preparación para piloto real

**Estado reconciliado:** no iniciada/no demostrada. Sigue fuera del rescate frontend inmediato y requiere, como mínimo:

- aprobación funcional y clínica;
- entorno hospitalario;
- identidad y permisos;
- trazabilidad;
- persistencia segura;
- backups y concurrencia;
- política de datos;
- protección de datos;
- QA institucional;
- soporte y responsables;
- procedimiento ante fallos;
- integración o exportación gobernada.

---

## 8. Recuperación selectiva del estado avanzado

No se autorizó un cherry-pick masivo de los 24 commits posteriores al estado hospitalario. La recuperación ejecutada fue selectiva:

| Pieza | Estado reconciliado |
|---|---|
| Catálogo/no inferencia | Integrado selectivamente en `24510d2...`; no infiere tratamiento. |
| Bandejas/Inicio | Fuente V4 cableada en `1a8e4f4...`; alcance de fase aún parcial. |
| Cobertura histórica VM/DOM | Auxiliar; no sustituye QA por interacción soportada. |
| Exportación fiel de Validación | Integrada en PR #82. |
| Core multifármaco | Integrado en PR #73 y reutilizado por la cadena de inicio. |
| Seguimiento por líneas | PR #114 integra contexto canónico, elegibilidad/selección y gate S09–S11; PR #116 integra borradores aislados por línea y guard S12 dentro de Seguimiento. Registro clínico, exportaciones, cierre S09–S12 y guard transversal siguen pendientes. |
| Dashboards avanzados | Pendientes; siguen siendo referencia, no restauración directa. |
| Gobernanza KairOS | `WO-HUB-KAIROS-V4-PROJECT-OVERLAY-CUTOVER-01` integrado en PR #88; no es funcionalidad de Farmacia. |

---

## 9. Cola de WOs reconciliada

Esta lista preserva la cola original y registra qué se integró o quedó pendiente. No autoriza trabajo adicional.

### Documentación y contrato

```text
WO-DOC-FH-SCENARIO-CONTRACT-V4-01 — completada, PR #64
WO-DOC-FH-RESCUE-STATUS-RECONCILIATION-V4-01 — completada, PR #108; reconciliación previa hasta PR #106, sin funcionalidad ni movimiento de Pages
WO-DOC-FH-FOLLOWUP-POST-PR114-PR116-RECONCILIATION-V4-01 — en revisión, issue #117; solo documentación y sin movimiento de Pages
```

### Datos

```text
WO-FH-SCENARIO-MANIFEST-V4-01 — completada, PR #66
WO-FH-WO8-SCENARIO-PARITY-REPAIR-01 — completada, PR #68
WO-FH-SCENARIO-CONTRACT-CHECKS-01 — absorbida por los checks del contrato/manifiesto/runtime integrado
```

### Inicio

```text
WO-FH-V4-DATA-SOURCE-INICIO-S01-S04-01 — completada, commit 1a8e4f4... / issue #69
WO-FH-INICIO-DUAL-TRAY-RECOVERY-01 — parcial; queda trabajo de bandejas fuera del cableado de fuente
WO-FH-V4-REAL-NURSING-IMPORT-E2E-01 — completada en alcance sintético soportado, PR #79
```

### Validación

```text
WO-FH-VALIDATION-VISIBLE-TRUTH-RECOVERY-01 — completada mediante merge directo 73021a0...
WO-FH-VALIDATION-CANONICAL-PERSISTENCE-V4-01 — completada, PR #75
WO-FH-V4-VALIDATION-BROWSER-QA-01 — completada, PR #77
WO-FH-V4-VALIDATION-CANONICAL-EXPORT-TRUTH-01 — completada, PR #82
WO-FH-V4-VALIDATION-TRANSITION-GUARD-01 — completada en PR #84 y corregida por PR #86
WO-FH-V4-VALIDATION-REVERSIBLE-BEFORE-FIRST-VISIT-01 — completada, PR #86
WO-FH-VALIDATION-POSTSTART-GUARD-V4-01 — completada, PR #106; no publicada
```

### Primera Visita

```text
WO-FH-TREATMENT-START-CORE-CONTRACT-V4-01 — completada, PR #91; no publicada
WO-FH-FIRST-VISIT-IDENTITY-HANDOFF-V4-01 — completada, PR #98; no publicada
WO-FH-FIRST-VISIT-CANONICAL-CONTEXT-V4-01 — completada, PR #100; no publicada
WO-FH-FIRST-VISIT-CONFIRM-START-V4-01 — completada, PR #102; no publicada
WO-FH-FIRST-VISIT-FOLLOWUP-HANDOFF-V4-01 — completada, PR #104; prerrequisito técnico, no implementación de Seguimiento S09–S12, y no publicada
WO-FH-FIRST-VISIT-CANONICAL-OUTPUTS-V4-01 — completada, PR #110; cierre técnico S01–S08, no publicada
```

### Seguimiento

```text
WO-FH-MULTITREATMENT-CORE-RECOVERY-01 — completada, PR #73
WO-FH-MULTITREATMENT-RUNTIME-MIGRATION-01 — prerrequisito técnico presente en Validación/Primera Visita y utilizado por el contexto canónico integrado de Seguimiento
WO-FH-FOLLOWUP-CANONICAL-CONTEXT-GATE-V4-01 — completada, PR #114; contexto/selección/gate S09–S11, sin módulos clínicos ni exportaciones
WO-FH-FOLLOWUP-LINE-DRAFTS-S12-GUARD-V4-01 — completada, PR #116; borradores por línea y guard S12 dentro de Seguimiento, sin registro asistencial
```

### Dashboards

```text
WO-FH-DASHBOARD-CANONICAL-LONGITUDINAL-01 — pendiente
WO-FH-STATISTICS-CANONICAL-SOURCE-01 — pendiente
```

### Release

```text
WO-FH-V4-DEMO-QA-FREEZE-01 — pendiente
WO-DOC-FH-V4-STATE-RECONCILIATION-01 — cubierta por WO-DOC-FH-RESCUE-STATUS-RECONCILIATION-V4-01, completada en PR #108
```

---

## 10. Definiciones de aptitud

### Demo-ready

Requiere:

- datos sintéticos;
- guion controlado;
- flujos anunciados interactuables;
- Playwright;
- consola limpia;
- ausencia de manipulación interna;
- salidas revisables;
- límites visibles;
- preview versionada.

### Piloto-ready

Además requiere:

- contratos clínicos aprobados;
- entorno institucional;
- identidad y permisos reales;
- trazabilidad;
- persistencia segura;
- backups;
- responsabilidades;
- gobernanza de datos;
- QA institucional;
- protección de datos;
- soporte operativo.

### Producto futuro

Además requiere:

- configuración agnóstica;
- multi-hospital o multi-tenant;
- backend intercambiable;
- interoperabilidad;
- lifecycle;
- repository layer;
- observabilidad;
- mantenimiento y evolución.

---

## 11. Tablero de control

| Campo | Estado |
|---|---|
| Mapa y diagnóstico | Cerrados |
| Ejecución técnica | Integrada hasta PR #116; Fases 1 y 3 completadas en su alcance técnico, Fase 2 parcial, Fase 4 cerrada técnicamente y Fase 5 iniciada parcialmente |
| Fase actual | Seguimiento por línea iniciado parcialmente; capacidades clínicas y salidas pendientes |
| Release/freeze (Fase 7) | Pendiente; no condiciona el cierre clínico-técnico de Fase 4 |
| Rescue actual | `rescue/farmacia-v4`; último HEAD funcional reconciliado `6e920bb68d8796b9780c7daaf106fe80d14c7d78` (PR #116) |
| Baseline histórico | `a6b15353a2e5a813818695642a07f0d27298904e` |
| Fuente Pages publicada | `preview/demo-lunes-wo4-20260614` en `2ee3b34739abec874424a572d445798fef565765` (hasta PR #86); no permanece en el baseline histórico |
| Ref candidata | `preview/farmacia-v4-rescue` coincide en `2ee3b34739abec874424a572d445798fef565765`; no es una segunda fuente Pages publicada |
| Backup hospitalario | `backup/preview-hospital-before-v4-qa-20260725` en `35a2cdd58a43f588a94882824bf1de9444521ad6` |
| Backup avanzado | `backup/preview-before-hospital-demo-rollback-20260722` preservado en `c19297b...` |
| Próximo hito seguro | Definir mediante una WO separada una única capacidad clínica de Seguimiento, sin fijar todavía qué módulo debe ir primero. |
| Riesgo principal | Confundir contexto o borrador con un registro asistencial completo, o presentar el rescue HEAD como publicado/demo-ready |
| Aptitud actual | Integrado hasta PR #116; no publicado, no demo-ready y no piloto |
| Aptitud piloto | No; no demostrada ni autorizada |
| Backend/V5 | Aparcados |

### Señales de desviación

Detener el trabajo si:

- se tocan dashboards antes de resolver mediante WOs separadas las capacidades pendientes de Seguimiento sobre escenarios soportados;
- se presenta el handoff #104 como Seguimiento multilínea implementado;
- se usa un test sin interacción soportada como prueba E2E;
- se corrige una contradicción desde la UI;
- se mueve una preview sin autorización específica o se toca `main`;
- se mezclan V5, backend o piloto con el rescate;
- se introducen datos reales.

---

## 12. Gobernanza de documentación

Al cerrar o publicar una WO que cambie el estado real se revisarán:

- `docs/INDEX.md`;
- `docs/ops/WORK_ORDER_STATUS.md`;
- el contrato o plan vivo afectado.

Debe distinguirse siempre:

- implementado;
- cableado;
- visible;
- probado por interacción soportada;
- QA de navegador;
- publicado;
- apto para demo;
- apto para piloto;
- futuro.

Una decisión conversacional no se presentará como estado publicado hasta que se integre mediante una WO documental autorizada.

---

## 13. Estado de este documento

La reconciliación de este plan:

- no autoriza código;
- no modifica datasets;
- no aprueba automáticamente WOs futuras ni mueve previews;
- no convierte integración en publicación o freeze;
- no convierte la aplicación en piloto.

Siguientes acciones seguras propuestas tras esta reconciliación:

```text
1. Definir mediante una WO separada una única capacidad clínica de Seguimiento, sin fijar todavía cuál debe ir primero.
   Aplicar contrato acotado, datos sintéticos y QA por interacción soportada, sin confundir borrador con registro asistencial.
2. Reconstruir dashboards canónicos solo después de cerrar Seguimiento.
3. Ejecutar publicación, QA de release y freeze bajo la Fase 7.
```

La publicación y el freeze no condicionan el cierre técnico ya alcanzado de Primera Visita. No hay evidencia actual para declarar V4 demo-ready, producción, aptitud para piloto, QA institucional, datos reales, backend o V5.
