# PROMueve Nexus — Architecture Decision Freeze 2026-09-24

**Estado:** `DECIDED_ENGINEERING / NOT_INSTITUTIONALLY_APPROVED`
**Issue / WO:** #378 — `WO-DOC-PROMUEVE-ARCHITECTURE-DECISION-FREEZE-20260924`
**Base de decisión:** `recovery/farmacia-pr-replay-20260727` @ `ea8b03a0e6895495dff1ec0b9abb2e368c259443` al iniciar la WO
**Datos reales:** no autorizados
**Piloto / producción:** no acreditados
**Cambio de autoridad Git:** **NO ejecutado por este freeze**.

> **Principio rector:** desde este momento PROMueve se diseña para producción. Eso no significa declarar que PROMueve esté en producción.

Este documento es la puerta de entrada a la arquitectura decidida tras baseline factual, revisión adversarial independiente y una ronda específica de alignment. Preserva decisiones de ingeniería, motivos, alternativas rechazadas/deferidas, contratos pendientes, dependencias y decisiones que requieren SES.

## 1. Fuentes de la decisión

Evidencia preservada:

- [`reviews/PROMUEVE_ARCHITECTURE_BASELINE_20260924.md`](./reviews/PROMUEVE_ARCHITECTURE_BASELINE_20260924.md)
- [`reviews/PROMUEVE_ASTRA_ARCHITECTURE_REVIEW_20260924.md`](./reviews/PROMUEVE_ASTRA_ARCHITECTURE_REVIEW_20260924.md)
- [`reviews/PROMUEVE_ASTRA_ALIGNMENT_ROUND2_20260924.md`](./reviews/PROMUEVE_ASTRA_ALIGNMENT_ROUND2_20260924.md)

Las revisiones independientes son evidencia y challenge, no autoridad por sí mismas. La adjudicación aprobada internamente está en este freeze y en los ADR asociados.

## 2. Taxonomía de estado

- `DECIDED`: principio/responsabilidad de ingeniería aceptado.
- `CONTRACT_PENDING`: dirección decidida; DTO/schema/firma/fixture exactos todavía requieren contrato/WO.
- `SES_DECISION`: depende de decisión institucional y no se inventa técnicamente.
- `DEFERRED`: válido como posibilidad futura, no toca ahora.
- `REJECTED`: alternativa descartada en el contexto actual; se documenta motivo y condición de reapertura cuando proceda.

## 3. Decisiones estructurales — `DECIDED`

### 3.1 PROMueve Nexus es la plataforma

`PROMueve Nexus` pasa a ser el nombre interno de la plataforma modular que agrupa los workspaces/servicios sin convertirlos en un único dominio clínico.

```text
PROMueve Nexus
  ├── Reumatología
  ├── Farmacia Hospitalaria
  ├── Dermatología (futuro módulo real; una plantilla no equivale a módulo)
  └── futuros módulos cualificados
```

### 3.2 Mismo repositorio, monolito modular

Se mantiene `b32majus/Hub-Clinico-Badajoz`.

- No se crea un repo nuevo por limpieza.
- Reuma, Farmacia y futuros módulos conservan límites de dominio propios.
- Se compartirán shell, contratos técnicos horizontales y composición donde la presión real lo justifique.
- No se adoptan microservicios como respuesta al crecimiento actual.

### 3.3 Architecture Freeze y transición Git son hitos distintos

Este documento **no cambia la autoridad operativa de ramas**.

Al finalizar esta WO:

- `recovery/farmacia-pr-replay-20260727` sigue siendo la autoridad publicada que indique INDEX/WOS/GitHub live;
- `main` sigue legacy y fuera de alcance;
- snapshots existentes siguen siendo autoridad de sus propios bytes/manifests;
- no existe todavía una nueva línea canónica de plataforma.

La transición futura exige WO separada, SHA live verificado, equivalencia inicial y activación explícita. Ver ADR-001.

### 3.4 Home hospitalaria ligera

La plataforma debe poder arrancar **sin cargar primero una base clínica**.

```text
DeploymentProfile hospitalario fijo
           ↓
PROMueve Nexus Home
           ↓
Módulos habilitados y cualificados para ese hospital
           ↓
Workspace del módulo
```

La Home conoce identidad del despliegue, módulos, rutas, versión y readiness técnico resumido. **No** conoce hojas, cohortes, pacientes, columnas ni reglas clínicas internas.

### 3.5 Hospital fijo por deployment

En un despliegue asistencial dedicado no existe selector libre CAC/BAD/MER.

`siteId` y `deploymentId` forman parte del artefacto/configuración validada. Un perfil laboratorio multi-site sería otro deployment explícito, no un modo oculto del profesional.

### 3.6 Qualification gate hospital × módulo

La Home no hace automáticamente compatible un módulo legacy con un hospital.

Una combinación solo se habilita cuando se ha comprobado que:

- no presenta identidad de otro hospital;
- no emite IDs/contexto/site incorrectos;
- sus fuentes corresponden al ámbito declarado;
- navegación y outputs conservan ese scope;
- QA aplicable es verde.

`módulo preservado clínicamente` no significa `módulo habilitable en cualquier site`.

### 3.7 Sin paciente universal ahora

La shell no transporta por defecto CIP, paciente activo, historia, workbook ni cohorte entre módulos.

Una futura experiencia transversal de paciente requerirá Identity Plane, permisos, contrato y Data Plane suficientemente maduros. Se clasifica como `DEFERRED`.

## 4. Configuración — `DECIDED` + `CONTRACT_PENDING`

### 4.1 No existe una cascada universal de overrides

Se retira la hipótesis `Platform → Module → Site → Module×Site` como jerarquía universal de sobrescritura.

Platform, Module, Site y Module×Site representan responsabilidades distintas. Cada propiedad tiene una autoridad y operaciones permitidas propias.

### 4.2 Configuración inicial mínima

Primera implementación objetivo:

```text
module-registry.json
deployment-profile.json
        ↓ build/validation
deployment-manifest.json
```

`ConfigurationRepository` puede empezar como una función pequeña que carga, valida schemas y referencias, congela y devuelve un snapshot inmutable.

No se construyen todavía:

- form builder;
- rule engine;
- resolver genérico arbitrario;
- configuración remota mutable;
- edición runtime;
- roles de seguridad en JSON;
- fórmulas/scores clínicos configurables.

### 4.3 Autoridad por clase de propiedad

| Clase | Autoridad | Variación hospitalaria |
|---|---|---|
| semántica/invariantes clínicas | contrato + responsables clínicos del módulo | nunca por override de site |
| metadata clínica | diccionario gobernado | extensiones explícitas, no redefinición |
| config funcional del módulo | schema/allowlist del módulo | sí, solo opciones soportadas |
| operación del site | responsable técnico/institucional | sí |
| composición del deployment | responsable de release | sí |
| branding | producto/site | sí |

Un cambio de configuración genera nueva identidad de artefacto/config release, aunque no todos los cambios requieran repetir toda la validación clínica.

## 5. Contratos de lectura — `DECIDED` / detalles `CONTRACT_PENDING`

- Ports por módulo, orientados a casos de uso.
- DTO de aplicación no debe obligar a una API futura a imitar filas/hojas Excel.
- La dirección futura es async, introducida por strangler; **no** se convierten todos los consumidores de golpe.
- Durante coexistencia no habrá dos copias clínicas divergentes.
- Cada operación debe definir ausencia legítima, errores, scope, procedencia, completitud/revisión y comportamiento temporal.
- Cambio de paciente/fuente debe impedir hidratación tardía del contexto incorrecto.

Farmacia conserva su seam actual como punto de partida, no como contrato terminado. Reuma se envuelve antes de extraer parser/storage.

## 6. Contratos de escritura — `DECIDED` / detalles `CONTRACT_PENDING`

### 6.1 Casos de uso independientes

Validación, Primera Visita y Seguimiento **no son una cadena automática**. Son operaciones independientes con precondiciones explícitas.

Nombres como `recordPharmacyValidation`, `recordFirstVisit` o `recordFollowup` son ejemplos de casos de uso, no firmas congeladas.

### 6.2 Acto completo

La frontera de aplicación debe construir un **acto conforme al contrato y autorizado para la operación** antes del adapter.

No usar la expresión `Validated PharmacyAct`: «validado» tiene semántica farmacoterapéutica y no debe confundirse con conformidad técnica.

Envelope conceptual mínimo candidato:

```text
contractVersion
actId + revision
kind
siteId
patientRef
occurredAt
authoredAt
authorRef + attributionAssurance
provenance
payload completo (incluye líneas cuando correspondan)
amendment? { previousRevision, reason }
```

La fila Excel de 152/497 columnas es una proyección/compatibilidad de transporte, no el acto conceptual.

### 6.3 `commit(event)` público rechazado

`commit(event)` se rechaza como API pública genérica porque oculta intención, autorización, contenido completo y garantía de persistencia.

Una infraestructura interna común de entrega sí puede existir después de la validación del caso de uso.

### 6.4 Resultado honesto

Estados conceptuales iniciales:

- `prepared_for_transfer`;
- `persisted`;
- `already_recorded`;
- `conflict`;
- `rejected`;
- `outcome_unknown`.

`persisted` siempre declara **destino y garantía**.

## 7. Persistencia y adapters — `DECIDED`

### 7.1 Excel es adapter de primera clase

No se adopta `Excel → cloud → SQL` como secuencia que elimina la etapa anterior.

PROMueve puede soportar deployments con capacidades diferentes:

- Excel/local;
- API cloud autorizada;
- API hospitalaria/institucional.

No se finge equivalencia transaccional entre ellas. Las capabilities se demuestran con pruebas y condiciones operativas.

### 7.2 Semántica Excel

- copy/download manual: `prepared_for_transfer`;
- File System Access: puede acreditar `persisted` en archivo solo con escritura finalizada + evidencia/relectura semántica y condiciones operativas válidas;
- Bridge + Office Script: incorporar el acto completo **y confirmar guardado duradero** puede acreditar `persisted` en ese Bridge;
- reimport/roundtrip confirma la copia observada, no que sea la copia más reciente ni ausencia de concurrencia.

Persistencia en Bridge **no equivale** a registro oficial SES.

### 7.3 Concurrencia

Un modo Excel puede declarar `single-writer` si esa condición está acordada y probada. Una futura API puede declarar otras capabilities sin contaminar el contrato común.

## 8. Oráculos, legacy y refactor — `DECIDED`

Separar:

1. invariantes que deben preservarse;
2. comportamiento legacy temporal aceptado con condición de retirada;
3. defectos clínicos/semánticos que requieren WO separada;
4. entradas que deben fallar cerradas.

Un oráculo de caracterización **no convierte un defecto en comportamiento correcto**.

Reuma requiere protección previa de lectura y contrato 497 antes de su strangler. Correcciones como ausencia→«Sin tratamiento», logs/exposición o endurecimiento de rechazo no se esconden en un refactor neutral.

## 9. Tooling y releases — `DECIDED`

- tooling reproducible de desarrollo/CI se introduce antes de una migración grande;
- no hay rewrite masivo a TypeScript ni cambio de framework;
- salida al hospital puede seguir siendo HTML/CSS/JS/JSON/XLSX estático;
- package/lock, schema validator, browser harness y vendor de runtime se introducirán en WOs acotadas cuando corresponda;
- gates separados: PR rápida, suite completa y release hospitalaria;
- release hospitalaria es un artefacto inmutable con manifest de code/config/schema/dependencies/evidence.

La reversión de frontend no implica reversión de datos; compatibilidad de datos debe comprobarse.

## 10. Seguridad clínica — `DECIDED`

Nunca se degrada:

- solicitado ≠ validado;
- validado ≠ inicio;
- ausencia ≠ NO;
- tratamiento previo ≠ nuevo inicio;
- catálogo/CIMA no decide dosis, vía, pauta, presentación, inducción o duración;
- parser/preview ≠ apply;
- configuración no crea reglas clínicas nuevas;
- un site override no redefine semántica canónica;
- una migración/adaptador no altera silenciosamente cardinalidades/estados;
- errores de scope/schema relevantes fallan cerrados.

Logs/URLs/diagnósticos deben minimizar exposición clínica; observabilidad técnica no equivale a auditoría asistencial.

## 11. ADR aprobados en este freeze

1. [`adr/ADR-001-product-authority-and-canonical-line.md`](./adr/ADR-001-product-authority-and-canonical-line.md)
2. [`adr/ADR-002-modular-monolith-and-module-boundaries.md`](./adr/ADR-002-modular-monolith-and-module-boundaries.md)
3. [`adr/ADR-003-hospital-deployment-and-configuration.md`](./adr/ADR-003-hospital-deployment-and-configuration.md)
4. [`adr/ADR-004-clinical-read-contracts.md`](./adr/ADR-004-clinical-read-contracts.md)
5. [`adr/ADR-005-clinical-write-contracts.md`](./adr/ADR-005-clinical-write-contracts.md)
6. [`adr/ADR-006-persistence-adapters-and-excel.md`](./adr/ADR-006-persistence-adapters-and-excel.md)
7. [`adr/ADR-007-release-tooling-and-quality.md`](./adr/ADR-007-release-tooling-and-quality.md)
8. [`adr/ADR-008-clinical-safety-boundaries.md`](./adr/ADR-008-clinical-safety-boundaries.md)

Los ADR fijan principios/responsabilidades/condiciones de reapertura. DTO exactos, schemas, firmas y fixtures se desarrollan en contratos/WOs posteriores.

## 12. Alternativas rechazadas o deferidas

| Alternativa | Estado | Motivo actual | Reabrir si… |
|---|---|---|---|
| repo nuevo por limpieza | REJECTED | doble autoridad/migración sin frontera organizativa real | ownership/permisos/ciclos de vida se separan de verdad |
| microservicios/Kubernetes | REJECTED | coste/operación sin presión real | límites operativos independientes lo exigen |
| rewrite React | REJECTED NOW | la deuda principal es límites/estado | UI/scale/tooling demuestran necesidad real |
| `commit(event)` público | REJECTED | intención/contenido/autoridad ambiguos | solo como infraestructura interna bien definida |
| evento clínico universal | REJECTED | dominios diferentes | no previsto; envelope técnico mínimo sí |
| cascada universal de overrides | REJECTED | confunde dimensiones con autoridad | no previsto |
| deep merge genérico | REJECTED | semántica implícita/peligrosa | no previsto |
| config remota inicial | DEFERRED | dependencia/gobierno sin presión | cambios sin redeploy se vuelven requisito real |
| paciente universal/buscador regional | DEFERRED | Identity/permisos/Data Plane inmaduros | contratos e identidad institucional lo justifican |
| form builder/rule engine | DEFERRED | V5 prematura | variabilidad repetida y gobernada lo exige |
| backend inmediato | DEFERRED | no requerido para seams | piloto/infraestructura autorizada lo exige |
| Excel como etapa desechable | REJECTED | soporte operativo real | política institucional futura podría retirar un modo concreto |
| doble escritura Excel/API | REJECTED NOW | divergencia/efectos duplicados | protocolo explícito y necesidad demostrada |
| cambio de autoridad al publicar ADR | REJECTED | freeze documental ≠ operación Git | transición solo por WO separada |
| auth propia | REJECTED NOW | carga de seguridad/soporte | ninguna identidad institucional viable y decisión explícita |
| V5 universal ahora | DEFERRED | sobrearquitectura | nuevos módulos demuestran variación estable |

## 13. Decisiones institucionales abiertas — `SES_DECISION`

No se inventan desde ingeniería:

- fuente de verdad oficial y significado institucional de «registrado»;
- hosting final, modalidad offline y acceso desde puestos;
- identidad/autenticación del profesional y permisos;
- identidad/custodia/reconciliación del paciente;
- uso permitido de Web Storage, borradores, descargas y portapapeles;
- retención, borrado, auditoría y recuperación;
- concurrencia permitida y single-writer cuando aplique;
- disponibilidad real de Office Scripts/File System Access en cada entorno;
- gobierno institucional de metadata/config clínica;
- soporte, owners, continuidad y autorización de piloto.

Estos puntos condicionan pilot-ready, pero no impiden construir seams que eviten acoplamiento.

## 14. Critical path del Foundation

El plan operativo detallado vive en [`../ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`](../ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md).

Resumen:

```text
Architecture Decision Freeze
          │
  ┌───────┼─────────────┐
  ▼       ▼             ▼
Tooling  Platform      Oráculos/contratos
mínimo   contracts     por módulo/recorrido
  │       │             │
  └───────┼─────────────┘
          ▼
PlatformContext + Home
          ↓
Release sintética de entrada

Tooling + oráculo + contratos FH    → Strangler Farmacia
Tooling + oráculo + contratos Reuma → Strangler Reuma

Home + stranglers cualificados
          ↓
Release de integración
```

La Home puede avanzar antes de terminar los nuevos Ports; solo espera sus dependencias reales de deployment/navegación/lifecycle.

## 15. Qué no autoriza este freeze

- no crea/mueve una rama canónica;
- no toca `main`;
- no cambia runtime;
- no habilita Derma como módulo por existir una plantilla;
- no declara CAC/BAD/MER compatibles con todos los módulos;
- no autoriza datos reales;
- no declara piloto ni producción;
- no elige backend/hosting/auth institucional;
- no aprueba cambios clínicos encontrados en Reuma;
- no implementa V5.

## 16. Condiciones de reapertura global

Revisar una decisión solo ante evidencia nueva material, por ejemplo:

- requisito institucional incompatible;
- segundo/tercer módulo demuestra variación no soportable;
- adapter real muestra límites del contrato;
- QA/producto demuestra daño en UX/seguridad;
- ownership/permisos obligan a frontera de repositorio;
- SES define fuente oficial/identidad/hosting que cambie trust boundaries.

No reabrir arquitectura por moda tecnológica o preferencia estética.
