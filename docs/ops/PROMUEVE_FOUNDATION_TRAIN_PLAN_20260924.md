# PROMueve Nexus — Foundation Train Plan 2026-09-24

**Estado:** `LIVE PLAN / PARTIALLY EXECUTED — F0–F3 published; F4–F7 pending or partial`
**Architecture authority:** `../architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md`
**Issue documental de origen:** #378
**Objetivo:** convertir la arquitectura congelada en una secuencia de WOs atómicas, paralelizables y verificables, sin frenar innecesariamente necesidades clínicas próximas.

> Este plan no autoriza ninguna WO técnica por sí mismo. Cada bloque requiere issue/WO propia, preflight, tests/QA y delivery boundary explícitos.

## 0. Reconciliación de ejecución — 2026-09-26

Este checkpoint actualiza **estado**, no reescribe la arquitectura ni autoriza WOs nuevas. La secuencia original de este documento se conserva debajo como plan de referencia.

| Fase | Estado publicado | Evidencia / lectura operativa |
| --- | --- | --- |
| F0.1 Freeze | **COMPLETADA/PUBLICADA** | #378 / PR #379. Architecture Decision Freeze y ADR-001…008 publicados. |
| F0.2 Canonical transition | **COMPLETADA/PUBLICADA** | #380 / PR #381 `MERGED`; `promueve/nexus-v4` es la autoridad **ACTIVE** para nuevo desarrollo; recovery queda **HISTORICAL**. |
| F0.3 + F1.1 + F2.1 + F2.2 + F1.3A | **COMPLETADAS/PUBLICADAS** | TRAIN-NEXUS-BOOTSTRAP-01 #387 / PR #388. Handover, tooling baseline, deployment/readiness contracts y primer oracle Reuma. |
| F1.2 + F1.3B + F3.1 | **COMPLETADAS/PUBLICADAS** | TRAIN-NEXUS-FOUNDATION-02 #399 / PR #400. CI/oracles + PlatformContext; Promotion Review final PASS. |
| F3.2 Home | **COMPLETADA/PUBLICADA** | #403 / PR #404. Home funcional/fail-closed y navegación determinista. |
| F3.3 + F3.4 | **COMPLETADAS Y CUALIFICADAS EN EVALUACIÓN SINTÉTICA** | TRAIN #409 / PR #415: QA Chromium del sitio, release sintético reproducible y QA del artefacto. |
| Hardening post-F3.4 | **COMPLETADO/PUBLICADO** | TRAIN #419 / PR #422: D012/D013 cerradas; post-merge Fast gates + Deterministic suite `success`. El canary de rollover no se usa como qualification de profile. |
| F4 Farmacia strangler | **PENDIENTE** | Existen oráculos/legacy valioso, pero la migración por Read Port + Act/Delivery contracts del plan todavía no está ejecutada como Foundation Nexus. |
| F5 Reuma strangler | **PARCIAL** | Oracle/caracterización basal existe; F5.1–F5.4 (wrapper/migración/writer boundary/act contract) siguen pendientes. |
| F6 pre-pilot | **PENDIENTE** | Lifecycle, URL/log exposure y dependency/vendor policy siguen siendo frontera antes de piloto real. |
| F7 multi-site qualification | **PENDIENTE POR COMBINACIÓN REAL** | La infraestructura de qualification existe, pero cada hospital×módulo necesita su evidencia propia; no se infiere qualification por presencia en repo. |

**Hito visible del plan:** la primera **PROMueve Nexus Home sintética** ya está alcanzada y endurecida. Lo siguiente no es seguir “haciendo Home”, sino llevar módulos clínicos detrás de contratos estables y demostrar la primera configuración/cualificación real hospital×módulo.

**Critical path recomendado desde este checkpoint:**

1. iniciar **F4.1 Farmacia read DTO contract** y después **F4.2 first vertical slice**;
2. en paralelo o a continuación, **F5.1 Reuma Application Read Port wrapper**, consumiendo `NEXUS-DEBT-007` dentro de ese hardening en vez de abrir un cleanup train;
3. usar la primera necesidad real para ejecutar **F7 hospital×módulo** sobre la infraestructura ya publicada;
4. abordar F6 cuando la siguiente frontera sea piloto, no como prerequisito artificial de la integración sintética.

Deuda abierta Nexus no redefine el critical path: D004 espera al consumo real del release map; D005 se distribuye por WOs naturales; D007 entra con Reuma. No se propone un barrido general de deuda.

## 1. Resultado que buscamos

Primer hito visible:

> **PROMueve Nexus Home sintética por hospital**, capaz de arrancar sin base clínica, con deployment fijo, módulos cualificados y legacy clínicamente preservado detrás.

Hito de integración posterior:

> Farmacia y Reuma detrás de contratos/stranglers protegidos, con release reproducible, sin haber reescrito clínica ni creado un paciente universal.

Piloto real es un hito posterior y depende de decisiones SES de identidad, hosting, persistencia, autorización, continuidad y seguridad.

## 2. Principios de ejecución

1. Foundation no es un mega-refactor.
2. Cada refactor espera el oráculo y contrato que le corresponde; no todos esperan toda la batería global.
3. Home puede avanzar antes de terminar los Ports.
4. Correcciones clínicas/semánticas descubiertas durante caracterización son WOs separadas.
5. No doble escritura clínica durante migración.
6. No mover carpetas como sustituto de límites.
7. Cada cambio funcional debe declarar hospital×módulo afectado.
8. Urgencias clínicas acotadas pueden continuar en una lane paralela mientras no contradigan seams congelados.

## 3. Dependency graph

```text
ARCHITECTURE DECISION FREEZE
             │
   ┌─────────┼──────────────┐
   ▼         ▼              ▼
Tooling/CI  Platform       Oráculos + contratos
mínimos     contracts      por recorrido/módulo
   │         │              │
   └─────────┼──────────────┘
             ▼
    PlatformContext + Home
             │
             ▼
    Release sintética Home

Tooling + oráculo FH + contratos FH
             ↓
      Strangler Farmacia

Tooling + oráculo Reuma + contratos Reuma
             ↓
       Strangler Reuma

Home sintética + stranglers cualificados
             ↓
      Release de integración
```

## 4. Lanes de trabajo

### Lane A — Authority / tooling / release

Afecta a todo PROMueve pero no cambia clínica.

### Lane B — Platform shell / deployment

Construye el primer resultado visible de PROMueve Nexus.

### Lane C — Farmacia strangler

Conserva seams útiles, corrige filtraciones de storage/semántica de persistencia y formaliza acto completo.

### Lane D — Reuma strangler

Primero caracteriza y clasifica; después envuelve legacy sin big-bang.

### Lane E — Clinical delivery paralelo

Permite necesidades de la semana próxima si cumplen:

- alcance clínico pequeño/urgente;
- no introducen arquitectura alternativa;
- no dependen de paciente universal/config engine/backend;
- se ejecutan en worktree/WO aislados;
- se rebasan/reintegran contra la autoridad vigente según gobernanza;
- si tocan una frontera que Foundation está congelando, se clasifican con la severidad más restrictiva y se coordina la secuencia.

Cada requisito hospitalario declara además **dónde pertenece**, sin convertir el hospital que lo solicita en su clase automática:

| Clase | Responsabilidad esperada |
| --- | --- |
| `CORE` | Composición, navegación o capacidad técnica realmente compartida por la plataforma. |
| `MODULE` | Comportamiento del dominio del módulo, aunque la necesidad aparezca primero en un hospital. |
| `SITE` | Identidad u operación del deployment dentro de opciones soportadas. |
| `MODULE×SITE` | Variante acotada de un módulo para un site, con contrato, gobierno, qualification e integración explícitos. |

Una excepción hospitalaria temporal solo es admisible si la WO fija responsable, destino de integración y condición de retirada. No crea una rama permanente por hospital.

## 5. WOs candidatas — critical path mínimo

Los identificadores siguientes son nombres de planificación, no issues creados.

### F0 — Documentación y autoridad

#### F0.1 Architecture Decision Freeze

- **Estado:** esta WO documental (#378).
- **Entrega:** evidence + master freeze + ADR + plan + reconciliación.
- **Cambio clínico:** no.

#### F0.2 Git Canonical Transition

- **Estado:** ejecutada y publicada por #380/#381 (2026-09-24): `promueve/nexus-v4` creada desde `a8cec03522017a1f4b68e18b92c944601659c84f` con equivalencia inicial demostrada; PR #381 `MERGED`, por lo que Nexus está **ACTIVE** y recovery **HISTORICAL** para nuevo desarrollo. Detalle: [`PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md`](./PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md).
- **Timing:** después de merge/aprobación del freeze, antes de que Foundation acumule trabajo en dos bases.
- **Objetivo:** crear/activar futura línea canónica desde SHA live cualificado.
- **Cambio clínico:** no.
- **NO incluye:** reorganización de código.

#### F0.3 Product Documentation & Handover Standard

- **Timing:** puede ejecutarse en paralelo tras el freeze; no bloquea Home.
- **Objetivo:** crear `docs/engineering/PRODUCT_DOCUMENTATION_STANDARD.md`, la skill `promueve-product-documentation` y la referencia obligatoria desde `AGENTS.md`.
- **Contenido:** autoridad/vigencia, estados de madurez, contratos, arquitectura, datos, operación, release/rollback, troubleshooting, QA, seguridad, deuda, ownership y handover SES.
- **Regla:** la skill aplica el estándar; no crea decisiones ni una segunda autoridad.
- **Cambio clínico:** no.

### F1 — Tooling y oráculos mínimos

#### F1.1 Tooling reproducible baseline

- Node/versiones de CI;
- package/lock mínimo si se aprueba en esa WO;
- scripts para ejecutar gates vigentes;
- clasificación de tools: vigente/histórico/redundante;
- sin bundler/framework.

#### F1.2 CI gate consolidation Farmacia

- convertir checkers relevantes ya aceptados en gates explícitos;
- separar PR rápida / full suite;
- no inventar nuevos contratos clínicos.

#### F1.3 Reuma read/export oracle baseline

- fixtures sintéticos cinco patologías/tipos de visita relevantes;
- 497 posiciones/semántica contratada;
- `NA/ND/vacío/0/false` según autoridad real;
- caracterización de lectura/historia;
- inventario de defectos conocidos separado de golden.

**Nota:** F1.1, F1.2 y F1.3 pueden avanzar en paralelo si no pisan los mismos archivos.

### F2 — Platform contracts

#### F2.1 Deployment contract v0

Crear contratos/schemas mínimos para:

- `module-registry`;
- `deployment-profile`;
- manifest generado;
- qualification state hospital×módulo.

No crear form builder ni configuración clínica.

#### F2.2 Module readiness/navigation contract

Definir qué puede conocer la shell:

- moduleId/nombre/ruta;
- enabled/qualified;
- readiness técnico resumido;
- versión/release.

No incluir datos clínicos/paciente.

F2.1 y F2.2 pueden ejecutarse tras el freeze y en paralelo parcial con tooling/oráculos.

### F3 — PlatformContext + Home

#### F3.1 PlatformContext / ModuleRegistry implementation

- carga config empaquetada;
- validación/fail-closed;
- site fijo;
- módulos cualificados;
- no cambio clínico.

#### F3.2 PROMueve Nexus Home

- nueva entrada de plataforma;
- branding/site/version;
- tiles/rutas solo de módulos cualificados;
- entrada directa y vuelta;
- sin carga de Excel en shell;
- sin paciente compartido.

#### F3.3 Home navigation/session qualification

- dirty drafts;
- rutas soportadas;
- módulo no disponible/config inválida;
- cero transporte paciente/dataset;
- browser QA;
- reversión de entrada.

#### F3.4 Synthetic Home release

- builder/manifest;
- artefacto sintético;
- identifica site/módulos/versiones;
- snapshots históricos no se tocan.

**Hito:** primera PROMueve Nexus visible.

### F4 — Farmacia strangler

#### F4.1 Farmacia read DTO contract

- DTO sin `canonical_row`/detalles físicos;
- ausencia/error/provenance/completitud;
- contract tests sobre DataSource local.

#### F4.2 Farmacia async facade + first vertical slice

- fachada Promise sobre fuente local;
- selección/contexto + una pantalla;
- loading/error/out-of-order guards;
- legacy coexistente sin segunda copia clínica.

#### F4.3 Farmacia read migration remainder

- migrar recorridos restantes por lotes pequeños;
- retirar sync legacy solo sin consumidores.

#### F4.4 Pharmacy Act contract

- envelope/payloads específicos;
- líneas completas;
- invariantes comunes a todos los paths;
- casos de uso independientes;
- sin cambiar captura clínica.

#### F4.5 Delivery result + Excel adapter semantics

- `prepared_for_transfer/persisted/...`;
- destino/garantía/evidence;
- preservar outputs existentes;
- `persisted` solo donde la evidencia lo permita.

#### F4.6 Interoperability readiness mapping v0.1 — documental/sintético

- **Timing:** después de un primer contrato de acto completo revisable (F4.4) y su diccionario mínimo; no bloquea Home.
- mapear por significado un caso sintético a FHIR candidato y openEHR candidato;
- registrar campos sin correspondencia, pérdidas, extensiones, ausencia, multilínea, revisión/corrección y versión del mapping;
- validar técnicamente solo contra los supuestos/modelos declarados;
- no servidor FHIR, CDR openEHR, perfiles SES ni terminologías institucionales inventadas;
- no usar Excel como fuente conceptual del mapping.

F4.1/F4.4 pueden diseñarse parcialmente en paralelo después de sus oráculos; F4.2 depende de F4.1. F4.5 y F4.6 dependen conceptualmente de F4.4, pero ninguna bloquea la primera Home sintética.

### F5 — Reuma strangler

#### F5.1 Reuma Application Read Port wrapper

- wrapper async sobre `HubTools.data`;
- sin extraer parser todavía;
- first vertical: búsqueda/historia;
- equivalencia contra oráculo.

#### F5.2 Reuma read migration by journey

- dashboard/visitas/estadística según oráculos;
- retirar consumidores directos por tramos.

#### F5.3 Reuma legacy 497 writer boundary

- encapsular `exportManager` tras frontera de compatibilidad;
- salida exacta protegida;
- longitud/shape incompatible no se oculta;
- defectos semánticos no se corrigen dentro del refactor neutral.

#### F5.4 Reuma act/write contract extraction

- acto conceptual separado de 497;
- adapter legacy genera formato compatible;
- futuras APIs no dependen de columnas.

### F6 — Data lifecycle / dependency hardening

Estas WOs son necesarias antes de piloto, pero no bloquean la primera Home sintética salvo rutas que afecten.

#### F6.1 Browser state lifecycle

- categorías de estado/datos;
- session/drafts/purge;
- comportamiento por navegación/reload/site;
- resolver deuda FH y legacy Reuma de forma gobernada.

#### F6.2 URL/log exposure

- eliminar exposición clínica innecesaria;
- observabilidad allowlist no-PHI;
- pruebas negativas.

#### F6.3 Runtime dependency/vendor policy

- SheetJS/Chart.js/iconos/fuentes donde proceda;
- versión/origen/licencia/hash;
- CSP/conectividad acordadas para el perfil sintético.

### F7 — Multi-site qualification

No se crea una WO gigante CAC/BAD/MER.

Cada combinación real se cualifica por presión de producto, por ejemplo:

- BAD × Reuma;
- BAD × Farmacia;
- CAC × Farmacia;
- MER × módulo cuando exista necesidad real.

Cada qualification comprueba:

- site identity;
- source scope;
- outputs;
- navegación;
- config;
- QA.

No se muestra Derma como módulo hasta existir un módulo real y su qualification.

## 6. Dependencias estrictas vs paralelas

### Estrictas

- un refactor clínico espera su oráculo y contrato aplicable;
- Home espera Deployment/Module contracts y QA de las rutas que afecta;
- synthetic Home release espera Home qualification;
- Git transition espera ADR/Freeze aprobado y SHA cualificado;
- integración espera Home + stranglers que pretenda incluir.

### Paralelizables

- Reuma oracle y Farmacia CI consolidation;
- Platform contracts y Reuma oracle;
- write contract Farmacia y read contract Farmacia cuando los archivos/contextos estén aislados;
- Home y contracts de módulo, una vez congelados sus límites;
- clinical delivery urgente no intersectante.

## 7. Gate para habilitar un módulo en Home

Estado recomendado:

```text
NOT_IMPLEMENTED
IMPLEMENTED_NOT_QUALIFIED
QUALIFIED_FOR_SITE
DISABLED_BY_DEPLOYMENT
```

Para `QUALIFIED_FOR_SITE` se exige evidencia del hospital×módulo; no basta que el módulo exista en repo.

La Home no debe presentar `Derma` por existir `plantilla_solicitud_dermatologia.html`.

## 8. Clinical parallel lane — cómo no frenar la semana próxima

Mientras se prepara Foundation se permite continuar trabajo clínico necesario en la autoridad vigente, siempre que se clasifique. Si un cambio encaja en más de una categoría, prevalece **`ROJO > ÁMBAR > VERDE`**. El color describe interferencia arquitectónica; no sustituye autorización clínica, oráculo, tests ni QA.

### VERDE — puede avanzar

- corrección clínica acotada;
- formulario/UX necesaria para reunión;
- datos sintéticos/QA/documentación;
- cambio que no crea nueva capa de persistencia/configuración/identidad;
- output existente cuyo contrato no se redefine.

### ÁMBAR — coordinar con Foundation

- toca `dataManager`, `exportManager`, Data Port, Export v2 core;
- cambia navegación raíz;
- cambia storage/session;
- añade hospital/site hardcode;
- crea nueva entrada/módulo.

Puede hacerse, pero la WO debe declarar cómo encaja con ADRs, su clase `CORE / MODULE / SITE / MODULE×SITE` y evitar trabajo desechable. Si introduce una excepción temporal local, debe indicar su condición de integración o retirada.

### ROJO — pausar hasta Foundation/decisión

- nuevo backend directo;
- paciente universal;
- nuevo framework;
- generic config/rules engine;
- branch permanente por hospital;
- doble escritura;
- auth propia;
- reescritura transversal de Reuma/Farmacia.

## 9. Estimación de tamaño en WOs

Estimación de planificación, no compromiso de calendario:

| Meta | WOs aproximadas |
|---|---:|
| Freeze + transición Git | 2 |
| tooling/CI/oráculos mínimos | 3–4 |
| Platform contracts + Home + release sintética | 4–6 |
| Farmacia strangler útil | 4–6 |
| Reuma strangler útil | 4–6 |
| lifecycle/dependencies before-pilot | 2–4 |
| qualification multi-site | 1 por combinación real o pequeño lote |

**Hasta Home sintética:** aproximadamente 7–10 WOs incluyendo freeze/transición/tooling/contratos/QA, varias paralelizables.
**Foundation de integración Reuma+Farmacia:** aproximadamente 15–22 WOs, dependiendo de defectos descubiertos por oráculos y de cuánto legacy pueda envolverse sin corrección semántica.

La unidad útil es la dependencia, no el número bruto de tickets. WOs demasiado grandes reducen la seguridad; WOs microscópicas aumentan coste de coordinación.

## 10. Trains overnight

Sí pueden utilizarse cuando la autoridad y oráculos estén bien definidos.

### Buenos candidatos

- tooling/CI;
- schema/manifest/config deterministic work;
- generación de fixtures no clínicos ya especificados;
- wrappers mecánicos con oráculo congelado;
- contract tests/parity;
- migración por lotes de consumidores después de validar el primer vertical slice;
- vendorización/checks reproducibles.

### Malos candidatos sin checkpoint humano

- adjudicar defectos clínicos Reuma;
- cambiar semántica de acto;
- decidir `persisted` en un nuevo adapter;
- resolver ambigüedad de identidad/autorización;
- diseño UX clínico no especificado;
- migration que requiera elegir entre comportamientos contradictorios.

### Regla

Un train nocturno ejecuta decisiones cerradas; **no debe convertirse en el lugar donde el agente decide clínica o arquitectura pendiente**.

## 11. QA por hito

### Home sintética

- config schema/reference PASS;
- rutas/return PASS;
- hospital visible correcto;
- solo módulos cualificados;
- sin carga Reuma al entrar;
- no patient/dataset transfer;
- dirty-state QA;
- consola/pageerror;
- artefacto/release visible y reversible.

### Strangler módulo

- contract/oracle PASS;
- legacy parity donde corresponda;
- defectos conocidos separados;
- QA browser del recorrido migrado;
- no second clinical copy;
- no unsupported remote adapter.

### Integration release

- suite completa;
- manifest/hashes;
- modules/site qualification;
- browser E2E sintético;
- dependency/network policy;
- compatibility/reversal.

## 12. Stop conditions

STOP y devolver a adjudicación si:

- cambia la **autoridad canónica** o aparece un conflicto material con la base durante una WO;
- una WO ligada expresamente a un SHA inmutable deja de cumplir esa condición;
- oráculo contradice spec/decisión;
- aparece dato real;
- refactor exige cambiar clínica para pasar tests;
- un módulo no puede respetar site sin cambio funcional no autorizado;
- la Home requiere compartir paciente para funcionar;
- un adapter necesita mentir sobre persistencia/capabilities;
- merge/destructive action no está autorizado.

Un avance ordinario y compatible del HEAD dentro de la **misma autoridad** no es STOP automático: antes de integrar se revalida la base live, se reconcilian cambios concurrentes y se repiten los gates afectados. Esta regla no autoriza rebase, merge, overwrite ni reescritura de historia fuera del alcance explícitamente aprobado.

## 13. Éxito del Foundation

Foundation no se considera terminado porque existan nuevas carpetas o interfaces.

Debe demostrar:

1. entrada PROMueve Nexus independiente de Reuma;
2. deployment/site validado y reproducible;
3. módulos habilitados solo donde están cualificados;
4. contratos de lectura/escritura no definidos por Excel;
5. Excel conservado como adapter soportado con garantías honestas;
6. Reuma/Farmacia protegidos por oráculos/CI;
7. releases reproducibles;
8. documentación suficiente para que una tercera persona pueda construir, diagnosticar y revertir el producto.
