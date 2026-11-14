# DermaNEXus · Orden de integración F3c con contratos y adapters de Nexus

**Fecha de acuerdo de secuencia:** 2026-11-14.
**Estado:** `ORDEN_DE_TRABAJO_ACORDADO / DISEÑO_PENDIENTE`, **no** contrato clínico/técnico aprobado, **no** implementación autorizada, **no** piloto.
**Ámbito:** Dermatología, primer caso Psoriasis (PsO); HS futura, sin anticipar su contrato.
**Nombre F3c:** etiqueta de trabajo de la demo DermaNEXus, no una fase equivalente al Foundation F3 ni una WO ejecutable.
**Autoridad:** rama canónica `promueve/nexus-v4` (HEAD comprobado al preparar el documento: `404f86ebe09bc8459da1a9aff55f1e6ae738fc10`; volver a verificar antes de actuar). Este documento se prepara en rama documental aislada; **hasta eventual merge no forma parte de la documentación canónica**.

## 1. Decisión de secuencia

La evolución de Dermatología **reutiliza los límites y contratos del monolito modular Nexus**. No se diseñará de forma aislada una persistencia Derma, un nuevo backend, un procesador Excel o un esquema universal antes de verificar los contratos existentes. El orden de trabajo será, sin invertir las dependencias:

1. **Contrato técnico mínimo de visita Derma** (`DermaVisitAct` candidato).
2. **Contrato de entrada/lectura de Dermatología** (`DermaReadPort` candidato).
3. **Contrato de salida, evidencia de entrega y roundtrip** (acto → representación → destino → relectura).
4. **Elección e implementación del primer adapter físico**, solo tras conocer capacidades y autorizaciones del destino.

Cada paso produce un **candidato revisable** y explicita su gate propio. No habilita automáticamente la etapa siguiente ni obliga a implementar inmediatamente los cuatro pasos.

## 2. Autoridades que no se reabren aquí

- [Architecture Decision Freeze](../architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md) y [ADR-002](../architecture/adr/ADR-002-modular-monolith-and-module-boundaries.md): shell común, propiedad clínica por módulo; la Home no transporta paciente/CIP ni una historia universal.
- [ADR-003](../architecture/adr/ADR-003-hospital-deployment-and-configuration.md): contexto y qualification hospital × módulo; `siteId` no se escoge arbitrariamente en UI.
- [ADR-004](../architecture/adr/ADR-004-clinical-read-contracts.md): Read Ports por módulo, DTO ajenos a filas/hojas, ausencia/ambigüedad/error, procedencia, completitud, scope y respuestas tardías; evolución async por strangler.
- [ADR-005](../architecture/adr/ADR-005-clinical-write-contracts.md): intención profesional → acto con identidad y revisión → delivery con resultado verificable. Casos de Primera Visita y Seguimiento separados; ninguna cadena automática. Rechazado `commit(event)` público genérico.
- [ADR-006](../architecture/adr/ADR-006-persistence-adapters-and-excel.md): Excel como adapter válido y no obligatorio; otros destinos por capacidades acreditadas; copia = `prepared_for_transfer`, no `persisted`; identidad del acto distinta del intento/reintento.
- [ADR-008](../architecture/adr/ADR-008-clinical-safety-boundaries.md): sin inferencias clínicas ni garantías institucionales ficticias.
- [DER-BASE #697](../specs/SPEC_DERMA_BASE_PSO_FIRST_V0_20261112.md) y [DER-PSO #728](../specs/SPEC_DERMA_PSO_LONGITUDINAL_CONTRACT_CANDIDATE_V0_20261112.md): **especificaciones candidatas**, pendientes de adjudicación y validación clínica. Valme es fuente de evidencia para PsO, no esquema canónico.
- [F4.5 DeliveryResult FH](../contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md), [salida agnóstica](../architecture/PROMUEVE_NEXUS_SALIDA_AGNOSTICA_FH_V4_ALIGNMENT_20261012.md) y [decisión Bridge raw-first](../architecture/FH_BRIDGE_RAW_MANUAL_FIRST_DECISION_20261025.md): patrones de capacidades/garantías; **no** se traslada a Derma la representación FH de 152/166 columnas ni sus reglas de EA o tratamiento.

El Processor de ingesta del Bridge (validación/agrupación/descomposición de filas), el Read Adapter (reconstrucción desde una fuente) y el Delivery Adapter (representación/entrega de un acto) son **responsabilidades diferentes**. Excel raw, Bridge relacional, API/BD o una integración M365 pueden coexistir cuando se autoricen, sin convertir uno en paso obligatorio hacia otro.

## 3. Reglas funcionales de base que debe respetar cualquier etapa

- **Solo un paciente y una visita ACTIVOS en edición** en la instancia actual de la demo. Si se abandona una visita editada sin guardar, se confirma y se descarta definitivamente; no hay recuperación de esos borradores.
- **La unicidad de edición no prohíbe historia.** En una modalidad futura persistente pueden existir múltiples actos previos guardados y consultables por el paciente y patología. Ninguno es un borrador abandonado; corregir un acto guardado exige revisión y trazabilidad, no sobreescritura silenciosa.
- El aislamiento actual es **por instancia de navegador**, no garantiza exclusividad entre pestañas, dispositivos ni usuarios. En piloto, cualquier garantía de concurrencia y autorización requiere contrato institucional y evidencia.
- La patología pertenece **a cada visita**, seleccionada expresamente; no se hereda del paciente, de otra visita ni del circuito. PsO es la primera opción operativa; HS no se simula.
- Datos ausentes, desconocidos, negativos, no aplicables, parciales y cero legítimo se diferencian. No inferir fecha clínica, resultado de escala, inicio, tratamiento validado, dosis, vía, pauta, duración, causalidad, continuidad, switch o derivación desde nombres, catálogos, historia o silencio.
- Formularios y **174 claves Valme** son referencia de cobertura, no contrato clínico longitudinal aprobado. PASI/DLQI/PURE-4/Morisky y sus interpretaciones requieren validación clínica y, cuando proceda, derechos de uso.
- **Superficie de uso actual:** escritorio hospitalario. Móvil fuera de prioridad de optimización; conservar únicamente compatibilidad básica sin gastar un tramo UX móvil.

## 4. Etapas, entregables y puertas de avance

### Paso 1 · Acto de visita `DermaVisitAct` (candidato)

**Entregable:** especificar intención y contrato separado para Primera Visita / Seguimiento, identificador de paciente en scope de módulo/site, ID estable de visita/acto, tipo, patología explícita, fecha clínica declarada, fuente/autoría/assurance declaradas y su grado de acreditación, versión/revisión, semántica de amendment y payload PsO. Decidir qué datos del formulario pueden formar parte del acto y cuáles permanecen solo en UI mientras no estén homologados.

**No confundir:** nombres de clases propuestos ≠ objetos ya publicados; `patientRef` ≠ CIP ≠ `patient_id` técnico, y `actId` ≠ ID de intento ni número de fila. La función clínica pertenece al módulo Derma, no al Shell ni al adapter.

**Gate:** contrato estructural y escenarios positivos/negativos revisables; señalar expresamente decisiones que requieren responsables de Dermatología o SES. Sin autocompletar procedencia, fecha, validación ni tratamiento.

### Paso 2 · Lectura `DermaReadPort` (candidato)

**Entregable:** operaciones para resolver paciente y leer visita/historia por scope, con DTO agnósticos del medio físico, identidad/provenance, versiones, completitud y estados `ok`, `not_found`, `ambiguous`, `unavailable`, `error`. Política de carga asíncrona, cancelación, resultados obsoletos y cero contaminación por cambio de CIP.

**Gate:** distinguir «no consta dato» de «no existe acto» y «no disponible»; separar visita actual, historial elegible y datos aptos para precarga. Una visita futura/no fechada no da contexto anterior por defecto; la lista de campos precargables y su vigencia queda sujeta a aprobación clínica.

### Paso 3 · Salida, resultado y roundtrip

**Entregable:** proyección versionada de `DermaVisitAct` a un `DeliveryAdapter` por capacidades, con matriz de representabilidad/fidelidad y resultados de operación compatibles con ADR-005/006: `prepared_for_transfer`, `persisted`, `already_recorded`, `conflict`, `rejected`, `outcome_unknown` cuando estén justificados. Destination/evidence verificables; falta de garantía implica bloqueo o estado indeterminado, nunca éxito supuesto.

**Gate:** demostrar escenarios negativos y criterios de ida y vuelta sin fabricar paciente, acto, fecha, tratamiento ni respuesta. Distinción `L0` (artefacto tabular), `L1` (acto lógico reconstruible) y `L2` (acto completo y reversible); no prometer L2 por copiar TSV. Copia no es guardado y relectura de una copia no acredita latest/unicidad/concurrencia ni registro oficial. No imponer Processor Bridge cuando el raw autorizado y un Read Adapter bastan.

### Paso 4 · Primer adapter físico, después de la decisión del destino

**Entregable futuro:** comparar Excel raw/Bridge, SharePoint/M365, API/BD hospitalaria u otros soportes realmente disponibles, con permisos, titular, custodia, capability de escritura, lectura, concurrencia, control de versión, auditabilidad, reversión y qualification hospital × módulo. Elegir **uno** para la primera WO de ejecución acotada, sin forzar un stack por preferencias de desarrollo.

**Gate:** prueba soportada con datos sintéticos de edición → entrega explícita → guardado físico autorizado → cierre/reapertura → misma identidad y contenido reconstruido por Read Port, incluidos fallos, reintentos, duplicados e incompatibilidades. Solo después cabe discutir piloto con las exigencias institucionales.

## 5. Estado comprobado y límites de autorización

- La demo privada PsO funciona con **visita única efímera**; la reconciliación de ocho scripts dejó 101/101 checks verdes en rama local, **no en la rama canónica**. No hay persistencia externa, historia longitudinal ni exclusividad multiusuario demostradas.
- En GitHub, [PR #916](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/916) está DRAFT/OPEN y contiene una versión anterior del prototipo. [#697](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/697) y [#728](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/728) son issues de especificación abiertos sin `status:approved` de implementación.
- Esta secuencia **no** aprueba todavía un `DermaVisitAct` ni un `DermaReadPort` exactos, contratos clínicos de escalas, backend, Processor, migración FH, persistencia, lanzamiento de piloto, PR técnica o merge.
- **Git:** cada modificación requiere WO atómica (preflight HEAD, RUTAS, NO TOCA, REVERSIÓN, tests/QA, aceptación, commit/push/PR/merge, reporte). No tocar `main` ni mezclar con corregir diseño móvil, arquitectura V5 o deuda FH. Ninguna PR sin issue pertinente con `status:approved` y GO concreto.

**Siguiente tarea de diseño:** producir y revisar el candidato del **paso 1**; después paso 2, luego paso 3 y, solo cuando se justifique, paso 4.
