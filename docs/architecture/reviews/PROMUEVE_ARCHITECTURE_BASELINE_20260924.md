# PROMueve Nexus — Architecture Baseline 2026-09-24

**Estado:** evidencia read-only previa al Architecture Decision Freeze
**Issue de preservación:** #378
**Repo:** `b32majus/Hub-Clinico-Badajoz`
**Rama verificada:** `recovery/farmacia-pr-replay-20260727`
**HEAD verificado:** `ea8b03a0e6895495dff1ec0b9abb2e368c259443`
**Uso asistencial:** evaluación/demo con datos sintéticos; no piloto ni producción.

> Este documento preserva la fotografía factual que se entregó a revisión independiente. No es por sí mismo una decisión arquitectónica. La adjudicación vive en `../PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md`.

## 1. Pregunta que motivó el baseline

PROMueve había crecido desde una aplicación Reuma en Badajoz hacia Farmacia Hospitalaria y nuevos frentes hospitalarios/servicios. El objetivo del baseline fue determinar qué arquitectura existía de verdad y qué piezas estaban solo documentadas antes de seguir añadiendo funcionalidad clínica.

Principio acordado al iniciar la revisión:

> **PROMueve se diseña para producción desde este momento. Eso no significa declarar que PROMueve esté en producción.**

## 2. Autoridad revisada

- GitHub live: rama, HEAD, PR/merge y código publicado.
- `AGENTS.md` y `CODING_STANDARDS.md`.
- `docs/INDEX.md`.
- `docs/ops/WORK_ORDER_STATUS.md`.
- arquitectura V4, roadmap post-SES, backlog vivo y decisiones de persistencia/separación Reuma-Farmacia.
- código actual de Reuma y Farmacia, schemas, tools, workflow y snapshot Cáceres.

## 3. Estado Git y producto

- `main` permanece legacy/histórico y fuera de la línea funcional actual.
- `recovery/farmacia-pr-replay-20260727` contiene la historia acumulada de Farmacia y es descendiente de la línea Reuma revisada.
- la coexistencia en una rama no demuestra integración clínica ni convierte Reuma y Farmacia en un único dominio.
- el snapshot `CÁCERES-REVIEW-0.6` es un artefacto separado y congelado; no sigue automáticamente el tip de recovery.
- no se encontró una razón Git que obligue a crear un repositorio nuevo.

## 4. Topología funcional observada

```text
PROMueve actual
├── Reumatología
│   ├── shell/entrada raíz
│   ├── dataManager.js
│   └── exportManager.js
├── Farmacia Hospitalaria
│   ├── shell/entrada propia
│   ├── Application Data Port
│   ├── Raw Excel DataSource
│   └── Export v2/adapters
└── snapshots / tools / docs
```

La experiencia real se comportaba más como **dos aplicaciones enlazadas** que como una plataforma única. La raíz era Reuma/Badajoz, con carga de su Excel antes de entrar; Farmacia disponía después de shell y ciclo de datos propios.

## 5. Farmacia — piezas reales a preservar

### 5.1 Lectura

Existe `FarmaciaApplicationDataPort` y una implementación `FarmaciaRawExcelDataSource`; el import puede inyectar esa fuente en el runtime normal.

Evidencia determinista repetida durante el baseline:

```text
farmacia_application_data_port_check: PASS (11 casos)
farmacia_patient_flow_cutover_check: PASS (17 casos)
```

La costura es real y valiosa, aunque la revisión adversarial posterior mostró filtraciones de representación Excel y sincronicidad que impiden considerarla todavía storage-independent.

### 5.2 Escritura

Export v2 dispone de core versionado y adapters de Validación, Primera Visita y Seguimiento. La fila ancha de 152 columnas es transporte reversible; no debe convertirse en dominio.

Evidencia repetida:

```text
farmacia_export_v2_core_check: PASS
```

El baseline proponía formalizar un Write/Event Port. La revisión posterior corrigió la forma: el acto persistible debe contener la información completa y `commit(event)` no se adopta como API pública genérica.

## 6. Reuma — deuda arquitectónica transversal

`modules/dataManager.js` combina actualmente, entre otras responsabilidades:

- lectura SheetJS y conocimiento de hojas/columnas;
- normalización;
- memoria y `sessionStorage`;
- búsqueda/historia;
- datos poblacionales y proyecciones.

`modules/exportManager.js` conoce directamente el contrato físico de 497 columnas y mezcla generación, transporte/clipboard, estado y presentación.

La dirección segura es strangler incremental, no reescritura:

```text
UI Reuma
  ↓
Read Port / casos de uso
  ↓
Legacy adapter
  ↓
HubTools.data
```

y, para escritura, encapsular primero la salida legacy antes de extraer un acto conceptual.

## 7. Configuración multi-hospital

La V4 ya describía `ConfigurationRepository`, control plane no-paciente y despliegues CAC/BAD/MER, pero el runtime general no implementaba todavía:

- `DeploymentProfile` común;
- `PlatformContext`;
- `ModuleRegistry`;
- carga de `deployments/*.json`;
- resolver de configuración común;
- formularios/dashboards declarativos generales.

Por tanto, multi-hospital era **dirección diseñada**, no seam de aplicación implementado.

## 8. Experience Plane / Home

Se identificó un gap de producto: Reuma no debe seguir siendo la raíz de PROMueve.

Hipótesis enviada a revisión:

```text
Deployment hospitalario fijo
        ↓
PROMueve Nexus Home
        ↓
Módulos habilitados y cualificados
        ↓
Workspace del módulo
```

La shell debe poder arrancar sin cargar datos clínicos. Cada módulo conserva su Data Port y responsabilidades. No se propone un paciente universal ni compartir cohortes por la Home.

## 9. Calidad y operación

- Farmacia dispone de numerosos checkers, pero el workflow publicado cubre un subconjunto.
- no se localizó una suite Reuma equivalente que proteja suficientemente lectura y contrato 497 antes de refactor.
- existen dependencias runtime externas por CDN en superficies legacy.
- Web Storage clínico/temporal presenta regímenes distintos y necesita política explícita antes de piloto.
- identidad/autorización productivas no están demostradas.

## 10. Matriz resumida de madurez

| Capacidad | Estado al baseline |
|---|---|
| Historia Reuma + Farmacia en mismo repo | implementada |
| Shell común | no |
| Deployment/Site context común | no |
| ConfigurationRepository runtime | documentado, no general implementado |
| Read Port Farmacia | coded / wired / tested / published; independencia incompleta |
| Acto completo de escritura Farmacia | no formalizado |
| Read/Write Ports Reuma | pendientes |
| Excel | soporte real, diseños distintos por módulo |
| Cloud/Hospital adapters | futuro |
| Snapshot trazable Cáceres | parcial/específico |
| CI Farmacia | parcial |
| CI/oráculos Reuma | insuficiente |
| Pilot-ready | no demostrado |

## 11. Hipótesis que se enviaron a challenge

- mantener mismo repo;
- monolito modular;
- no reescritura React;
- Excel como adapter soportado;
- Ports por módulo;
- Home hospitalaria ligera;
- configuración empaquetada inicialmente en Git;
- no forks por hospital;
- V4 multi-hospital y V5-ready sin construir V5 universal.

La revisión independiente confirmó parte de esta dirección y modificó otras piezas. Ver las dos evidencias siguientes y el freeze adjudicado.
