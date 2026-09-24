# PROMueve Nexus — Alignment arquitectónico independiente / Round 2

**Fecha:** 2026-09-24
**Tipo:** evidencia externa read-only, no autoridad de decisión
**Objetivo:** convertir el Round 1 en decisiones y dependencias ejecutables, sin repetir la auditoría completa.

> La adjudicación final está en `../PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md`. Este documento conserva los detalles que informan ADRs y WOs futuras.

## 1. Contrato conceptual de acto Farmacia

Propuesta de envelope pequeño con payload específico:

```text
PharmacyAct
  contractVersion
  actId + revision
  kind
  siteId
  patientRef
  occurredAt
  authoredAt
  authorRef + attributionAssurance
  provenance
  payload
  amendment? { previousRevision, reason }
```

- `patientRef` es referencia con ámbito, no paciente universal.
- `attributionAssurance` distingue profesional declarado de identidad autenticada.
- la hora de persistencia pertenece al destino cuando puede acreditarse.
- identidad del acto e idempotencia del intento no son lo mismo.
- el acto completo incluye líneas; las filas Excel son una proyección posterior.

Payloads de Validación, Primera Visita y Seguimiento son **específicos e independientes**. No forman una cadena obligatoria; cada caso de uso tiene sus precondiciones explícitas.

Responsabilidades:

| Responsabilidad | Autoridad |
|---|---|
| estructura/versiones | schemas de frontera |
| solicitado≠validado, cardinalidad, transiciones | dominio del módulo |
| autorización | caso de uso + servicio confiable futuro |
| idempotencia | caso de uso conserva clave; destino verifica según capability |
| Excel/API | adapters tras conformidad/autorización |

La expresión correcta no es «Validated PharmacyAct», sino **acto conforme al contrato y autorizado para la operación**, para no confundir validación técnica con validación farmacoterapéutica.

## 2. Escritura de aplicación

Los nombres `recordPharmacyValidation`, `recordFirstVisit`, `recordFollowup` son ejemplos de **casos de uso**, no firmas congeladas.

Frontera conceptual:

```text
caso de uso específico
 → estructura válida
 → contexto/autoridad válidos
 → invariantes clínicas válidas
 → acto completo
 → mecanismo de entrega compartido
 → resultado verificable
```

Resultado común mínimo candidato:

```text
status
actRef
destinationRef
persistenceScope?
sourceRevision?
evidence?
errorCode?
```

Estados iniciales:

`prepared_for_transfer`, `persisted`, `already_recorded`, `conflict`, `rejected`, `outcome_unknown`.

`persisted` siempre identifica destino y garantía. Las correcciones son nuevas revisiones explícitas, no reemplazos silenciosos ni reintentos reinterpretados.

## 3. Read Ports async sin big-bang

Decisión recomendada: **nueva interfaz async + migración progresiva**.

Durante coexistencia:

- consumidores legacy mantienen interfaz síncrona/local;
- consumidores migrados usan Port async;
- ambos usan el mismo estado de lectura controlado;
- no se mantienen dos copias clínicas divergentes;
- una API remota solo se habilita cuando el recorrido necesario está migrado.

Farmacia:

1. congelar tests y DTO inicial sin filas físicas;
2. fachada async sobre DataSource local;
3. migrar un recorrido vertical;
4. controlar espera/error/respuestas tardías;
5. migrar resto;
6. retirar legacy sin consumidores.

Reuma:

1. congelar 497 + lectura aceptada;
2. fachada async sobre `HubTools.data`;
3. migrar búsqueda/historia;
4. migrar recorridos;
5. separar parser/consultas/storage después.

## 4. Matriz de autoridad de configuración

| Clase | Autoridad | Variación site | Gate |
|---|---|---|---|
| semántica/invariantes clínicas | contrato+mando clínico módulo | no por config | release de código/contrato |
| metadata clínica | diccionario gobernado | extensiones explícitas, no redefinición | versión metadata + review clínico |
| config funcional módulo | schema/allowlist módulo | sí dentro de soportado | config release; review según impacto |
| operación site | responsable institucional/técnico | sí | config release |
| composición deployment | responsable release | sí | artefacto hospitalario |
| branding | producto/site | sí | artefacto + QA visual acotada |

Un cambio de configuración produce nueva identidad de artefacto. No todo cambio exige repetir toda la validación clínica.

## 5. Primera configuración real

No crear cuatro capas ni resolver universal.

Fuente inicial mínima:

### `module-registry.json`

- module ID estable;
- nombre;
- ruta relativa;
- versión de contrato compatible;
- modos de persistencia soportados;
- referencia a options schema solo cuando exista variación real.

### `deployment-profile.json`

- schema version;
- `deploymentId`, `siteId`;
- nombre/branding mínimo;
- módulos habilitados;
- modo seleccionado por módulo;
- opciones Module×Site estrictamente necesarias.

### `deployment-manifest.json` generado

Fija código, config, schemas, dependencias y hashes.

`ConfigurationRepository` puede empezar como función pequeña que carga, valida, cruza referencias, congela y devuelve snapshot inmutable.

Fuera al inicio: formularios declarativos, scores, reglas clínicas, roles de seguridad, profesionales/pacientes, catálogo completo, filtros arbitrarios y edición runtime.

## 6. Scope hospitalario e aislamiento

Distinguir:

| Garantía | Mecanismo |
|---|---|
| identidad/contexto | perfil fijo + hospital visible + validación de scope |
| aislamiento navegador | origin HTTPS distinto por hospital si se usa Web Storage |
| autorización real | identidad/permisos/infraestructura institucional |

Un origin distinto no autoriza uso clínico ni protege frente a usuarios del mismo puesto. Una carpeta URL no aísla storage.

## 7. Excel y significado de `persisted`

Definición:

> El acto completo está incorporado al destino declarado y existe evidencia suficiente de esa incorporación.

Esto **no** significa registro oficial SES.

| Camino | Estado máximo honesto sin más evidencia |
|---|---|
| copy/download manual | `prepared_for_transfer` |
| File System Access | puede llegar a `persisted` en archivo si escritura finaliza y existe relectura/validación bajo condición single-writer |
| Bridge + Office Script | puede llegar a `persisted` en Bridge si acto completo queda incorporado y guardado duraderamente con evidencia |
| reimport/roundtrip | confirma persistencia observada en esa copia; no garantiza que sea la más reciente ni ausencia de concurrencia |

«Incorporar al Bridge» y **confirmar guardado duradero** puede acreditar persistencia en ese Bridge; no acredita registro oficial SES.

Excel monousuario puede declarar `concurrencyMode: single-writer`; no debe contaminar el contrato de una futura API concurrente.

## 8. Home temprana

`PlatformContext + Profile + Registry + Home` pueden avanzar mientras los Ports nuevos siguen pendientes.

Antes de que la Home sea entrada canónica:

- profile fijo y módulos habilitados;
- rutas directas/vuelta válidas;
- cero traslado de paciente/dataset entre módulos;
- config inválida/módulo no disponible fallan de forma segura;
- navegación respeta borradores/dirty state;
- release/scope sintético visibles;
- QA de rutas y reversión;
- decisión explícita sobre artefacto objetivo; snapshots congelados intactos.

**Matiz de qualification:** una Home con `siteId=CAC` no hace automáticamente compatible Reuma/Farmacia con CAC. Cada combinación hospital×módulo se habilita solo tras comprobar identidad, fuentes, navegación y outputs del site.

Una plantilla Derma no equivale a módulo Derma disponible.

## 9. Transición de autoridad Git

Architecture Freeze y cambio de autoridad son hitos distintos.

Trigger para la transición:

- ADR de autoridad aprobado;
- baseline mínimo cualificado;
- decisión explícita de iniciar Foundation con una única línea de integración.

Procedimiento futuro:

1. WO específica de transición;
2. pausar/reconciliar trabajo pendiente;
3. verificar SHA real de recovery;
4. crear nueva línea desde ese SHA, sin cherry-picks ni reescritura;
5. comprobar equivalencia inicial y CI;
6. publicar registro de activación;
7. recovery pasa a referencia histórica; snapshots siguen siendo autoridad de sus artefactos.

Publicar los ADR **no cambia** por sí mismo la autoridad de recovery.

## 10. Tooling y CI mínimos

Propuesta incremental, sin migración de framework:

- Node fijado para dev/CI;
- `package.json` + npm lockfile + `npm ci` cuando se implemente;
- conservar checkers actuales y agrupar scripts;
- `node:test` para nuevas pruebas cuando aporte valor;
- validador JSON Schema mantenido (p.ej. Ajv) cuando se implemente config;
- JSDoc/checkJs en fronteras nuevas; TypeScript solo donde se adopte explícitamente;
- empaquetado Node reproducible, sin bundler obligatorio;
- Playwright como harness browser común;
- dependencias runtime vendorizadas con versión/origen/licencia/hash.

Gates separados: PR rápida, suite completa, release hospitalaria.

## 11. Oráculos Reuma sin canonizar defectos

Separar caracterización de aceptación:

| Clase | Tratamiento |
|---|---|
| invariante a preservar | gate obligatorio |
| legacy temporal aceptado | test de caracterización + condición de retirada |
| defecto clínico/semántico | resultado correcto + WO separada; no golden del defecto |
| entrada que debe fallar cerrada | test negativo explícito |

Ejemplos de la revisión:

- preservar 497 posiciones y significado `NA/ND` cuando esté contratado;
- legacy temporal: nombres/acceso vía `HubTools`;
- defecto separado: ausencia → «Sin tratamiento»;
- fail-closed objetivo: identidad/fila incompatible o ambigua.

## 12. ADR_NOW vs SES_DECISION

### ADR_NOW

- mismo repo y transición gobernada;
- monolito modular;
- acto completo por tipo/envelope pequeño;
- casos de uso específicos con delivery compartido;
- invariantes independientes del adapter;
- resultados explícitos de persistencia;
- Ports async por strangler;
- config por autoridad de propiedad;
- registry/profile mínimos congelados por artefacto;
- site fijo; contexto ≠ aislamiento ≠ autorización;
- Excel soportado con capabilities demostradas;
- tooling/oráculos/CI/release reproducible;
- 497 como compatibilidad, no dominio;
- no exposición clínica innecesaria en logs/URL.

### ADR_LATER / SES_DECISION

- repositorio que constituye registro oficial;
- hosting/perfil de puesto/offline;
- identidad profesional y permisos;
- custodia/reconciliación de paciente;
- almacenamiento local/retención/borrado/auditoría;
- concurrencia institucional;
- disponibilidad de Office Scripts/File System Access;
- gobierno institucional de metadata;
- soporte/continuidad/autorización de piloto.

## 13. Critical path revisado

```text
ADRs + autoridad de transición
        ├── Tooling/CI mínimo
        ├── Oráculos/clasificación legacy
        └── Contratos específicos

Platform contract + oráculos de recorridos afectados + tooling
        ↓
PlatformContext + Home
        ↓
Release sintética de entrada

Tooling + oráculo FH + contratos FH → Strangler Farmacia
Tooling + oráculo Reuma + contratos Reuma → Strangler Reuma

Home + ambos stranglers
        ↓
Release de integración
```

La Home no espera a terminar todos los Ports. Cada refactor sí espera su oráculo y contrato aplicable.

## 14. Riesgos abiertos recordados

- `persisted` sin destino/garantía volvería a ser ambiguo;
- Home puede perder borradores si no respeta lifecycle existente;
- async requiere control de generaciones/respuestas tardías;
- origin separado aísla storage, no autoriza clínica;
- Excel first-class no implica implementar todas sus variantes;
- acto completo no autoriza inventar nuevos campos clínicos;
- los adversarial checks del core no prueban defecto UI;
- oráculo no significa perpetuar defectos legacy.
