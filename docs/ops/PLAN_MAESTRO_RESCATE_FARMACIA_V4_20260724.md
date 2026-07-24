# Plan maestro de rescate — PROMueve Farmacia V4

**Estado:** propuesta publicada para ejecución por fases  
**Fecha:** 2026-07-24  
**WO:** `WO-DOC-FH-RESCUE-MASTER-PLAN-V4-01`  
**Issue:** #61  
**Rama de referencia hospitalaria:** `preview/demo-lunes-wo4-20260614`  
**HEAD hospitalario verificado:** `a6b15353a2e5a813818695642a07f0d27298904e`  
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

La estrategia no será restaurar una rama completa. Será reconstruir una línea V4 controlada desde la referencia hospitalaria y recuperar selectivamente las mejoras avanzadas después de reparar el contrato de escenarios.

---

## 2. Fuentes de verdad y referencias congeladas

### 2.1 Referencia hospitalaria

```text
preview/demo-lunes-wo4-20260614
a6b15353a2e5a813818695642a07f0d27298904e
```

Uso permitido:

- referencia visual y funcional;
- comparación durante el rescate;
- punto de rollback;
- evidencia de la superficie utilizada en la demostración hospitalaria.

No debe usarse como rama de integración cotidiana ni moverse durante el rescate.

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

---

## 3. Diagnóstico consolidado

### 3.1 Hallazgo rector

La sustitución de pacientes demo y del longitudinal previo por el runtime derivado del Excel WO8 consiguió:

- una fuente técnica común;
- generación determinista;
- eliminación de pacientes legacy hardcodeados;
- fallo seguro sin fallback clínico;
- cableado común de las pantallas principales.

Sin embargo, no se publicó un contrato de paridad de escenarios que garantizara que las historias sintéticas utilizadas para construir y validar la demo continuaban existiendo con nuevos identificadores.

Por ello pudieron coexistir tests verdes y pérdida de coherencia funcional.

### 3.2 Contradicciones conocidas de la fuente WO8

Deben resolverse antes de ampliar la UI:

- pacientes que figuran simultáneamente con validación pendiente y línea activa;
- una misma `linea_id` representada con estados incompatibles sin eventos temporales diferenciados;
- filas que mezclan acto, validación, línea, visita, seguimiento y movimiento sin secuencia longitudinal explícita;
- líneas sin identidad suficiente para Seguimiento multilínea;
- estados históricos, adicionales o activos que no pueden distinguirse de forma segura únicamente por posición o primera coincidencia.

### 3.3 Estado real de las dos referencias

La referencia hospitalaria:

- existe, está publicada y sirve para demo supervisada;
- ya utiliza el runtime WO8;
- no recupera las historias legacy anteriores;
- no acredita piloto real.

El estado avanzado:

- incorpora mejoras de no inferencia, bandejas, exportación y Seguimiento multilínea;
- separa solicitud, validación, línea y movimiento en un core canónico;
- representa `validated_not_started` de forma segura;
- no completa la transición explícita `validated_not_started -> active`;
- no implementa switch, add-on, renovación ni lifecycle completo;
- no acredita piloto real.

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

## 5. Rama de integración futura

Tras autorización específica se propone crear:

```text
rescue/farmacia-v4
```

Base exacta:

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
8. no tocar la preview hospitalaria;
9. no tocar `main`.

Una candidata completa podrá publicarse posteriormente en una preview separada, por ejemplo:

```text
preview/farmacia-v4-rescue
```

La creación de esa rama no queda autorizada por este documento.

---

## 6. Contrato mínimo de escenarios

Antes de recuperar funcionalidad avanzada se publicará un contrato documental separado con, al menos, doce escenarios:

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

Antes de la WO se deberá cerrar quién confirma el inicio, qué acto se registra y qué campos mínimos son obligatorios.

Criterios de salida:

- el no iniciado no habilita Seguimiento;
- el inicio explícito activa la misma línea;
- no hay activación por catálogo, carga o selección;
- persistencia/restauración;
- QA visible.

### Fase 5 — Seguimiento por línea

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

Fuera del rescate frontend inmediato. Requiere, como mínimo:

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

No se autoriza cherry-pick masivo de los 24 commits posteriores al estado hospitalario.

| Pieza | Estrategia |
|---|---|
| Catálogo/no inferencia | Reaplicar diff acotado y realizar QA visual |
| Bandejas duales | Recuperar tras reparar escenarios |
| Cobertura histórica VM/DOM | Mantener como test auxiliar |
| Exportación fiel de Validación | Recuperar casi directamente tras contrato |
| Core multifármaco | Recuperar y adaptar migración |
| Seguimiento por líneas | Recuperar tras transición de inicio |
| Dashboards avanzados | Usar como referencia, no restaurar directamente |
| Gobernanza KairOS | Fuera del rescate del producto |

---

## 9. Cola futura de WOs

Esta lista expresa orden y separación de alcance. No autoriza su ejecución.

### Documentación y contrato

```text
WO-DOC-FH-SCENARIO-CONTRACT-V4-01
```

### Datos

```text
WO-FH-SCENARIO-MANIFEST-V4-01
WO-FH-WO8-SCENARIO-PARITY-REPAIR-01
WO-FH-SCENARIO-CONTRACT-CHECKS-01
```

### Inicio

```text
WO-FH-INICIO-DUAL-TRAY-RECOVERY-01
WO-FH-NURSING-IMPORT-E2E-SCENARIOS-01
```

### Validación

```text
WO-FH-VALIDATION-VISIBLE-TRUTH-RECOVERY-01
WO-FH-VALIDATION-CANONICAL-ACT-LINE-01
```

### Primera Visita

```text
WO-FH-FIRST-VISIT-START-TRANSITION-MVP-01
```

### Seguimiento

```text
WO-FH-MULTITREATMENT-CORE-RECOVERY-01
WO-FH-MULTITREATMENT-RUNTIME-MIGRATION-01
WO-FH-FOLLOWUP-CANONICAL-LINES-RECOVERY-01
```

### Dashboards

```text
WO-FH-DASHBOARD-CANONICAL-LONGITUDINAL-01
WO-FH-STATISTICS-CANONICAL-SOURCE-01
```

### Release

```text
WO-FH-V4-DEMO-QA-FREEZE-01
WO-DOC-FH-V4-STATE-RECONCILIATION-01
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
| Ejecución técnica | No iniciada |
| Fase actual | Publicación del plan maestro |
| Base propuesta futura | `a6b15353a2e5a813818695642a07f0d27298904e` |
| Preview hospitalaria | Congelada |
| Backup avanzado | Preservado |
| Próximo hito | Publicar contrato de escenarios mediante WO separada |
| Riesgo principal | Recuperar código antes de reparar historias |
| Aptitud actual | Demo supervisada |
| Aptitud piloto | No demostrada |
| Backend/V5 | Aparcados |

### Señales de desviación

Detener el trabajo si:

- se tocan dashboards antes de cerrar los escenarios;
- se recupera Seguimiento multilínea antes de la transición de inicio;
- se usa un test sin interacción soportada como prueba E2E;
- se corrige una contradicción desde la UI;
- se toca la preview hospitalaria o `main`;
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

La publicación de este plan:

- no autoriza código;
- no crea la rama de integración V4;
- no modifica datasets;
- no aprueba automáticamente las WOs futuras;
- no autoriza merge de esta WO;
- no convierte la aplicación en piloto.

Siguiente acción propuesta tras su revisión y eventual merge:

```text
WO-DOC-FH-SCENARIO-CONTRACT-V4-01
```
