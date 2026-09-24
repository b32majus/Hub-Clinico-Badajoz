# Hub Clínico Badajoz / PROMueve Nexus

Aplicación clínica local-first para flujos de Reumatología, Enfermería y Farmacia Hospitalaria. El repositorio contiene una línea histórica de Reumatología y una línea Farmacia activa y publicada para evaluación con datos sintéticos.

## Estado actual

**Repositorio:** `b32majus/Hub-Clinico-Badajoz`

**Autoridad canónica de desarrollo (transición F0.2):** se resuelve por el estado GitHub de la PR #381. Mientras #381 permanezca sin merge, `recovery/farmacia-pr-replay-20260727` = **ACTIVE** y `promueve/nexus-v4` = **CANDIDATE**. Desde el merge autorizado de #381, `promueve/nexus-v4` = **ACTIVE** para nuevo desarrollo Nexus y recovery = **HISTORICAL**. Ver [`docs/ops/PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md`](docs/ops/PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md).

**Procedencia Farmacia:** la historia funcional publicada hasta F0.2 procede de `recovery/farmacia-pr-replay-20260727`. La transición de autoridad no cambia por sí misma el último HEAD de producto ni el snapshot Cáceres.

**`main`:** línea legacy/histórica. No es la autoridad del producto Farmacia actual.

**Uso asistencial actual:** demo/evaluación con datos sintéticos. No implica piloto ni producción con datos reales.

**Cáceres:** `previews/caceres-fh/` es un snapshot estable separado (`CÁCERES-REVIEW-0.6`). No se actualiza automáticamente cuando avanza `recovery`.

El estado vivo, los HEADs publicados y las fronteras entre recovery, snapshot Cáceres y paquete externo se documentan en [`docs/INDEX.md`](docs/INDEX.md).

## Stack actual

- HTML, CSS y JavaScript vanilla.
- Sin `package.json`, bundler ni framework obligatorio.
- Arquitectura local-first y backend-ready; Excel sigue siendo parte de varios flujos operativos/provisionales.
- Verificación mediante checkers deterministas `tools/*`, smoke checks y pruebas browser/Playwright específicas.
- Datos reales de pacientes, identificadores, exports clínicos reales y secretos están fuera del repositorio.
## Cómo entrar al proyecto

Antes de modificar producto:

1. Verificar GitHub live: issue/instrucción vigente, rama, HEAD y PRs relacionados.
2. Leer `AGENTS.md` y `CODING_STANDARDS.md`.
3. Leer `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md`.
4. Leer la spec, deuda o documento vivo que gobierne la tarea concreta.
5. Tratar Engram y memoria conversacional como evidencia auxiliar, nunca como autoridad de estado.

La entrada normal de ejecución es `pi`. Pi + Gentle nativo poseen ODD, delegación, verificación, work-unit commits y RDD. Herdr puede mantener una sesión visible/persistente, pero no es supervisor ni autoridad de producto o review.

No crear una segunda WO, brief o lifecycle por ritual cuando un issue/spec/instrucción aceptada ya sea ejecutable.

## Líneas funcionales

### Farmacia Hospitalaria

El producto Farmacia publicado hasta F0.2 procede de `recovery/farmacia-pr-replay-20260727`. Para nuevo desarrollo se aplica la regla de autoridad de PR #381: recovery mientras permanezca sin merge; `promueve/nexus-v4` desde su merge autorizado. La línea incluye Validación, Primera Visita, Seguimiento, dashboards, Export v2, Unified Clinical Intake, integración con Enfermería y los contratos/fail-closed documentados en `docs/INDEX.md`.

### Reumatología

El repositorio conserva la aplicación Reuma multipatología y sus contratos/documentación. Para cualquier reanudación de Reuma, resolver primero la autoridad actual desde `docs/INDEX.md`, documentos Reuma y GitHub; no reutilizar automáticamente decisiones Farmacia.
## Autoridades y navegación

- [`docs/INDEX.md`](docs/INDEX.md) — front door documental y estado vivo.
- [`docs/ops/WORK_ORDER_STATUS.md`](docs/ops/WORK_ORDER_STATUS.md) — trazabilidad de WOs/issues/PRs.
- [`docs/ops/FARMACIA_DEBT_REGISTER.md`](docs/ops/FARMACIA_DEBT_REGISTER.md) — deuda Farmacia aceptada.
- [`docs/specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md`](docs/specs/SPEC_FH_UNIFIED_CLINICAL_INTAKE_V0.md) — contrato Unified Clinical Intake.
- [`docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md`](docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md) — arquitectura objetivo V4.
- [`docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md`](docs/ARQUITECTURA_FUNCIONAL_HUB_REUMA_V2_1.md) — referencia funcional Reuma.

`ARCHITECTURE.md`, `TODO.md` y documentación histórica conservan provenance, pero no sustituyen el estado vivo anterior.

## Reglas clínicas transversales

- tratamiento solicitado/importado no equivale a tratamiento validado;
- ausencia o desconocido no autorizan inferencia ni limpieza de datos existentes;
- el catálogo/CIMA ayuda a identificar o seleccionar, no decide dosis, vía, pauta, causalidad ni validación;
- parsing/preview no autorizan aplicación clínica;
- cualquier uso de datos reales requiere una frontera institucional y de seguridad explícitamente autorizada.

Para detalles y excepciones, seguir siempre la autoridad clínica vigente de la tarea.