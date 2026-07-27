# Plan canónico de recuperación por replay — PROMueve Farmacia Hospitalaria

**Fecha:** 2026-07-27  
**Estado:** decisión funcional aprobada; pendiente de merge documental  
**WO:** `WO-DOC-FH-PR-REPLAY-RECOVERY-PLAN-01`  
**Issue:** #148  
**Rama documental:** `work/docs/fh-pr-replay-recovery-plan-20260727`  
**Base documental:** `rescue/farmacia-v4` en `21b8b1b4678815082791ad9e405a4afe1715813d`

---

## 1. Propósito

Este documento sustituye como **plan operativo activo de recuperación** a la estrategia de continuar ampliando `rescue/farmacia-v4` por capacidades técnicas aisladas.

Su objetivo es recuperar una aplicación Farmacia reconocible, funcional y verificable sin perder:

- la experiencia visible anterior al accidente;
- las mejoras funcionales de los PR previos al rollback;
- los mecanismos de seguridad, persistencia y trazabilidad construidos en `rescue`;
- la capacidad futura de migrar los fixtures sintéticos a Excel sin volver a perder paridad.

La regla rectora es:

```text
Primero recuperar y aprobar la aplicación funcional.
Después incorporar la seguridad útil de rescue.
Solo entonces sustituir los fixtures por un Excel equivalente.
```

---

## 2. Diagnóstico que obliga a cambiar el plan

### 2.1. PR #32 fue un cambio de datos y consumidores simultáneo

PR #32 sustituyó los pacientes y el longitudinal demo hardcodeados por una fuente derivada de:

```text
templates/farmacia_excel_operativo_FH_WO8_v1_sintetico.xlsx
```

El mismo cambio recableó múltiples pantallas. Eso impidió distinguir si una pérdida provenía de:

- la fuente;
- el generador;
- el modelo de identidad;
- el adaptador;
- el formulario;
- el dashboard;
- la eliminación del fixture previo.

### 2.2. El Excel WO8 no garantizaba paridad funcional

La fuente WO8 generó 40 personas y 43 actos, pero no una historia completa para cada recorrido de paciente.

Los actos estaban repartidos entre personas distintas: una persona representaba validación, otra primera visita, otra seguimiento, otra suspensión, otra cambio y otra adición. Eso permite probar pantallas aisladas, pero no demostrar:

```text
solicitud
→ validación
→ primera visita
→ inicio
→ varios seguimientos
→ EA/PROMs/adherencia
→ cambio o suspensión
→ histórico longitudinal
```

### 2.3. Identidad de paciente innecesariamente multiplicada

La fuente WO8 introdujo simultáneamente:

```text
patient_id
cip
internal_code / NHC
```

Para la fase actual la identidad funcional del paciente será únicamente:

```text
CIP
```

En un futuro piloto podrá sustituirse por:

```text
cip_demo_o_hash
```

Los identificadores técnicos de entidades sí son admisibles:

- `line_id`;
- `validation_id`;
- `visit_id`;
- `record_id`;
- `ea_id` si se aprueba.

La identidad de línea durante esta recuperación será:

```text
CIP + line_id
```

No se identificará una línea por nombre del fármaco, principio activo, posición en array o primera coincidencia.

### 2.4. Tests verdes no equivalieron a aplicación restaurada

Los checks focalizados demostraron contratos concretos, pero no paridad global de producto. Desde ahora:

```text
test verde ≠ QA manual visible ≠ aplicación aprobada
```

La revisión manual de Sil pasa a ser criterio obligatorio en cada checkpoint visible.

---

## 3. Referencias y función de cada rama

| Referencia | SHA | Uso permitido | No usar para |
|---|---|---|---|
| Estado anterior a PR #32 | `9b7ad5bdd8926ef6e94257a7c0688f72cf08eaf3` | Base de recuperación con fixtures funcionales conocidos. | Afirmar piloto, producción o modelo de datos definitivo. |
| `backup/preview-before-hospital-demo-rollback-20260722` | `c19297b68cd188cc455ffcd7a45bc6831f8fb54a` | Referencia congelada de producto; cantera de PR #40–#57, UI, contratos y tests. | Base automática, cherry-pick masivo o restauración completa. |
| Último HEAD funcional dentro de la congelada | `8cbe362283a4f14e6a45fc29486e4751e57560bb` | Comparar el comportamiento visible de PR #57 antes del cierre documental. | Nueva base sin revisar el impacto de PR #32. |
| `rescue/farmacia-v4` | HEAD documental `21b8b1b4678815082791ad9e405a4afe1715813d`; último HEAD funcional reconciliado `c5a0da77fb8707c6d85cb4e3f8f67df331aaec1e` | Cantera de seguridad: persistencia, inicio explícito, visita confirmada, outputs y guardas. | Base del producto visible, fuente de datos final o prueba de paridad. |
| GitHub Pages | verificar antes de cada publicación | Superficie temporal de observación manual. Sil comunicó que se enlazó temporalmente a `rescue`. | Fuente de verdad de código, rama o estado de piloto. |
| `main` | `a25cccb...` legacy | Historia previa. | Rescate Farmacia actual. No tocar. |

---

## 4. Fixtures que deben conservarse temporalmente

Hasta que exista sustitución equivalente demostrada se conservan:

1. pacientes demo sintéticos hardcodeados;
2. historias longitudinales demo;
3. profesionales demo hardcodeados;
4. fármacos locales/especiales hardcodeados;
5. casos multifármaco y causalidad que permitían recorrer la UI.

Estos elementos no se consideran arquitectura futura ni datos reales. Son **fixtures dorados de regresión funcional**.

No se retirará un fixture hasta que exista un caso sintético equivalente y se demuestre:

- mismo recorrido visible;
- mismos estados relevantes;
- misma información explícita;
- misma ausencia de inferencia clínica;
- misma o mejor persistencia;
- mismo resultado en exportación;
- aprobación manual de Sil.

---

## 5. Replay PR a PR desde la base anterior a PR #32

La rama funcional futura se creará desde:

```text
9b7ad5bdd8926ef6e94257a7c0688f72cf08eaf3
```

Nombre previsto:

```text
recovery/farmacia-pr-replay-20260727
```

No se hará cherry-pick ciego. Cada PR se recuperará por su **intención funcional**, adaptada al árbol con fixtures originales.

### 5.1. Inventario de PR #32–#60

| PR | Intención | Decisión | Qué conservar | Qué evitar |
|---:|---|---|---|---|
| #32 | Sustituir hardcoded por WO8 | **DO NOT REPLAY inicialmente** | Generador, listado de campos y lecciones de migración como referencia. | Retirada masiva de fixtures, triple identidad de paciente, pérdida del longitudinal y recableado global. |
| #34 / #36 | Tooling OpenCode | **NO REPLAY de producto** | Arnés vigente solo si resulta compatible. | Mezclar tooling con restauración funcional. |
| #38 | Guard de fechas indefinidas en Actividad | **ADAPT solo si reaparece** | Defensa frente a fechas ausentes. | Priorizar Actividad antes de decidir su contenido. |
| #40 | Frontera Validación → Seguimiento | **KEEP / ADAPT** | Seguimiento no inicia silenciosamente switch/add-on/nueva línea. Tratamiento previo no equivale a iniciar otro. | Ocultar bloques clínicos no relacionados o alterar fixtures. |
| #43 | Protocolo documental | **NO REPLAY de código** | Referencia de gobernanza. | Burocracia intermedia. |
| #45 | Snapshot de catálogo sin inferencia | **KEEP / ADAPT** | Slots separados, origen CIMA/local, identidad descriptiva y no sobrescritura terapéutica. | Inferir dosis, vía, pauta, presentación o inducción desde el nombre. |
| #47 | Reconciliación documental | **NO REPLAY** | Historia. | Commit documental intermedio. |
| #49 | Semántica de bandejas de Inicio | **KEEP / ADAPT** | Bandejas Enfermería/Farmacia con significado distinto, contadores, estados vacíos y rerender seguro. | Cambiar las fuentes correctas Enfermería/Farmacia o volverlas dependientes del runtime WO8. |
| #50 | Cobertura histórica de Seguimiento | **KEEP como test de referencia** | Casos de payload histórico. | Presentarlo como funcionalidad de producción. |
| #52 | Reconciliación documental | **NO REPLAY** | Historia. | Commit documental intermedio. |
| #54 | Verdad visible de exportación | **KEEP / ADAPT** | Pendiente/validado/denegado, sin `lines[0]`, sin defaults clínicos y 61 columnas cuando siga vigente el contrato. | Acoplar exportación a formulario dirty o a primera línea implícita. |
| #56 | Núcleo multifármaco | **KEEP / ADAPT** | Entidad línea, aislamiento y `validated_not_started`. | Inventar identidad o estado desde datos ausentes. |
| #57 | Seguimiento multilínea | **KEEP / ADAPT** | Selección explícita, aislamiento por línea, histórica no activa, PROMs/EA/causalidad por línea y salidas con contexto común. | Heredar la fuente WO8 o asumir que todos los estados del runtime son válidos. |
| #60 | Cierre documental PR #57 | **NO REPLAY de código** | Evidencia histórica y criterios de aceptación. | Commit documental intermedio. |

### 5.2. Orden de replay

```text
Checkpoint cero
→ PR #40
→ PR #45
→ PR #49
→ PR #54
→ PR #56
→ PR #57
```

Cada PR se materializará como un commit separado y reconocible.

No se comienza el siguiente si el checkpoint visible anterior no está aprobado.

---

## 6. Qué cosechar de `rescue/farmacia-v4`

`rescue` no se descarta. Se divide en paquetes coherentes que se trasladarán después del replay funcional.

### 6.1. Paquete A — Validación e inicio

| Capacidad | Procedencia orientativa | Decisión |
|---|---|---|
| Persistencia Pendiente/Denegado/Validado | PR #75 | **KEEP / ADAPT** al formulario restaurado. |
| QA real de Validación | PR #77 | **KEEP** como recorrido focalizado reducido. |
| Importación XLSX por input soportado | PR #79 | **KEEP como evidencia técnica**, no como fuente final. |
| Outputs desde decisión guardada | PR #82 | **KEEP / ADAPT** al contrato final. |
| Rectificación antes del inicio | PR #84 corregida por #86 | **KEEP el resultado final de #86**, no #84 aislada. |
| Inicio explícito `validated_not_started → active` | PR #91 / #102 | **KEEP / ADAPT**. Fecha explícita; misma línea; no duplicado. |
| Handoff identificado a Primera Visita/Seguimiento | PR #98–#104 | **KEEP / ADAPT** usando `CIP + line_id`. |
| Bloqueo de rectificación postinicio | PR #106 | **KEEP / ADAPT**. |
| Outputs Primera Visita desde estado confirmado | PR #110 | **KEEP / ADAPT** tras aprobar campos de Primera Visita. |

### 6.2. Paquete B — Seguimiento seguro

| Capacidad | Procedencia orientativa | Decisión |
|---|---|---|
| Contexto canónico de línea activa | PR #114 | **KEEP / ADAPT** a `CIP + line_id`. |
| Borradores aislados y guard S12 | PR #116 | **KEEP / ADAPT**. |
| Adherencia cruda MG1–MG4 | PR #120 | **KEEP** como captura explícita, sin interpretación automática inicial. |
| EA crudo | PR #124 | **KEEP / ADAPT** al formulario restaurado. |
| PROMs manuales crudos | PR #128 | **KEEP / ADAPT**; cero válido y ausencia vacía. |
| Revisión de último persistido | PR #132 | **KEEP / ADAPT**. |
| Visita confirmada append-only | PR #136 | **KEEP / ADAPT**. |
| TXT/CSV/Excel desde visita confirmada | PR #140 | **KEEP / ADAPT** al contrato final. |
| Guard de salida desde Seguimiento | PR #144 | **KEEP / ADAPT**. |

### 6.3. Elementos de `rescue` que no se trasladan como base

- `farmacia_wo8_runtime_v1.json` como fuente rectora;
- modo normal vacío y S01–S12 disponibles solo por fixture QA;
- `patient_id` e `internal_code` como identidades paralelas del paciente;
- eliminación del longitudinal demo antes de tener sustituto;
- UI clínica de Seguimiento ocultada o amputada para encajar un slice técnico;
- dashboards construidos sobre una proyección todavía inestable;
- proliferación de workflows por tarjeta o campo;
- reconciliaciones documentales tras cada PR.

---

## 7. Formularios que gobiernan el futuro Excel

El Excel no se rediseña antes de cerrar visual y funcionalmente:

1. Validación;
2. Primera Visita;
3. Seguimiento.

Para cada campo se fijará:

| Propiedad | Pregunta |
|---|---|
| Visibilidad | ¿Debe verse y en qué estado? |
| Fuente | ¿Solicitud, Excel, catálogo, profesional o visita previa? |
| Edición | ¿Editable, read-only o derivado? |
| Persistencia | ¿Se guarda o es solo UI? |
| Entidad | ¿Paciente, solicitud, validación, línea o visita? |
| Exportación | ¿TXT, CSV, Excel, dashboard o ninguno? |
| Ausencia | ¿Vacío, no informado, pendiente o no aplica? |

No se diseñarán columnas desde el código existente sin confirmar primero el contrato clínico-visible.

---

## 8. Requisitos del nuevo dataset/Excel

### 8.1. Identidad

- Un único identificador funcional de paciente: `CIP`.
- Identificadores técnicos solo para entidades diferentes.
- La app no exigirá NHC sintético ni `patient_id` paralelo.

### 8.2. Historias completas

El nuevo dataset debe contener pocos pacientes, pero recorridos completos y coherentes.

Como mínimo:

| Escenario | Historia persistente esperada |
|---|---|
| S01 | Solicitud bloqueada por prerrequisitos explícitos. |
| S02 | Vigilancia con pendientes visibles. |
| S03 | OK Farmacia desde Enfermería. |
| S04 | Solicitud general Farmacia. |
| S05 | Validación pendiente, sin línea creada. |
| S06 | Validación denegada, sin línea creada. |
| S07 | Validada y `validated_not_started`. |
| S08 | Primera Visita e inicio explícito. |
| S09 | Una línea activa con varias visitas de seguimiento históricas. |
| S10 | Una línea histórica y una activa. |
| S11 | Dos líneas activas y al menos una histórica, aisladas. |

S12 no pertenece al Excel: es un escenario de interacción con cambios no guardados.

### 8.3. Cobertura clínica-visible

Los casos deben permitir probar, cuando estén aprobados:

- autocompletes CIMA/local;
- tratamiento solicitado, validado y activo separados;
- Primera Visita completa;
- adherencia;
- PROMs/DLQI/EVA;
- EA, gravedad, resolución y sospechoso;
- concomitantes;
- Naranjo y Karch-Lasagna manuales;
- causalidad final profesional;
- historial y múltiples líneas;
- exports;
- dashboards consumidores.

### 8.4. Gate para retirar hardcoded

No se elimina ningún fixture hasta superar una matriz de paridad caso por caso y QA manual de Sil.

---

## 9. Checkpoints manuales obligatorios

| Checkpoint | Contenido | Evidencia automática mínima | QA manual Sil |
|---|---|---|---|
| C0 | Base `9b7ad5...` sin replay | smoke + consola | Confirmar app y fixtures reconocibles. |
| C1 | PR #40 + #45 | test frontera + catálogo | Validación, Primera Visita y autocompletes. |
| C2 | PR #49 | test bandejas + smoke | Inicio con ambas fuentes y Quick View. |
| C3 | PR #54 + #56 + #57 | test export/core + un E2E | Primera Visita y Seguimiento completos. |
| C4 | Harvest Paquete A | un E2E Validación→Inicio | Validación e inicio explícito. |
| C5 | Harvest Paquete B | un E2E Seguimiento | Seguimiento clínico y guardas. |
| C6 | Nuevo Excel/runtime | paridad por escenarios | Carga, recorrido y dashboards. |
| C7 | Freeze | smoke global + consola | Aprobación para envío. |

Una captura o test que manipule DOM, storage, readonly o estados imposibles no sustituye QA soportada.

---

## 10. Política de QA eficiente

Por checkpoint:

1. un check focalizado;
2. un recorrido Playwright soportado;
3. smoke global una vez;
4. consola y `pageerror`;
5. revisión manual de Sil.

No se crearán por defecto:

- workflows por cada campo;
- bundles gigantes por cada ajuste ordinario;
- árboles prospectivos para cambios UI triviales;
- WOs documentales intermedias;
- pruebas duplicadas que cubran el mismo contrato.

Hashes y paquetes exhaustivos se reservan para publicación, migraciones de datos, cambios clínicos de riesgo o reconciliaciones complejas.

---

## 11. Condiciones de parada

Detener el bloque y revisar antes de continuar si:

- un formulario pierde campos aprobados;
- un autocomplete visible deja de funcionar;
- aparece inferencia terapéutica;
- la identidad de paciente deja de ser inequívoca;
- un paciente pierde su historia al navegar;
- un estado pendiente/denegado crea línea;
- una histórica se reactiva;
- una salida usa inputs dirty;
- el nuevo Excel no reproduce una historia conocida;
- Sil no reconoce o no aprueba la pantalla.

---

## 12. Secuencia operativa y plazo

### Lunes 27

- crear rama de recuperación desde `9b7ad5...`;
- ejecutar C0;
- replay de PR #40, #45 y #49;
- continuar con #54, #56 y #57 solo tras checkpoints manuales;
- no tocar Excel ni dashboards consumidores finales.

### Martes 28

- completar replay si queda pendiente;
- cosechar Paquete A y Paquete B de `rescue`;
- cerrar formularios y salidas;
- diseñar el nuevo contrato Excel solo si los formularios están aprobados;
- implementar mejoras concretas solicitadas por Farmacia sin mezclarlas con la reconstrucción histórica.

### Miércoles 29

- freeze de rama aprobada;
- publicación controlada en Pages con backup previo;
- smoke y QA manual final;
- envío a farmacéuticos.

### Jueves 30

- revisión con Farmacia;
- registrar feedback como mejoras nuevas, no como parte retroactiva del rescate.

El calendario es un objetivo operativo, no una autorización para saltar checkpoints de seguridad clínica o QA manual.

---

## 13. Gobernanza Git

- No tocar `main`.
- No mover Pages sin autorización explícita y backup.
- No usar `rescue` como base de la nueva rama de producto.
- No restaurar `c19297b...` en bloque.
- Cada PR replay funcional debe quedar en commit separado.
- No mezclar replay, harvest de `rescue`, Excel y mejoras nuevas en el mismo commit.
- No hacer merge sin autorización explícita.
- Un commit local o una rama remota no equivalen a publicación.

Rama funcional prevista:

```text
recovery/farmacia-pr-replay-20260727
```

Informe vivo de ejecución fuera del repo:

```text
/srv/kairos-lab/outbox/reviews/FH_PR_REPLAY_RECOVERY_20260727.md
```

Se actualizará en cada checkpoint con:

- SHA;
- PR recuperado;
- intención original;
- adaptación;
- tests;
- navegador;
- resultado manual Sil;
- decisión de continuar o detener.

---

## 14. Límites del producto

Aunque se complete este plan, la app seguirá siendo:

- prototipo/demo con datos sintéticos;
- local-first;
- sin integración JARA real;
- sin firma clínica;
- sin autenticación o permisos productivos;
- sin backend hospitalario;
- no apta automáticamente para piloto real ni producción.

La recuperación busca devolver funcionalidad, coherencia y capacidad de revisión; no convierte la demo en producto sanitario desplegado.

---

## 15. Decisión resumida

```text
BASE:
9b7ad5... con fixtures hardcodeados preservados

REFERENCIA DE PRODUCTO:
c19297b... / funcional 8cbe362...

REPLAY:
PR #40 → #45 → #49 → #54 → #56 → #57

HARVEST RESCUE:
Validación/inicio + Seguimiento seguro

IDENTIDAD:
CIP; línea = CIP + line_id

EXCEL:
solo después de aprobar formularios;
historias completas;
paridad antes de retirar fixtures

QA:
check focalizado + un E2E + smoke + revisión Sil

DOCUMENTACIÓN:
este plan ahora;
reconciliación única al final
```
