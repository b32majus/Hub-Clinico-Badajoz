# T01 — Registrar y recuperar varios EA en el mismo Seguimiento

**Estado:** CANDIDATO_DE_TICKET · REFERENCIA DOCUMENTAL DE WO #793 · NO READY_FOR_AGENT · NO AUTORIZA IMPLEMENTACIÓN.

## What to build

La farmacéutica marca **Sí**, registra uno, dos o cinco acontecimientos distintos, termina el registro de cada nuevo EA con su descripción, guarda el acto y vuelve al mismo paciente para recuperarlo. También puede documentar **No** y **No consta** con su significado propio. No necesita declarar sospechosos ni evaluar causalidad para registrar un EA.

## Acceptance criteria

- [ ] Con el flujo soportado se registran y recuperan **0, 1, 2 y 5 EA** vinculados a un mismo acto, con identidades independientes; no hay límite de cuatro.
- [ ] La descripción original es obligatoria solo para **finalizar un EA nuevo**. Los demás campos admiten ausencia explícita o desconocimiento; no se infieren fechas de inicio, gravedad o medicamento.
- [ ] «No» en esta visita no resuelve ni borra EA anteriores. «No consta» no se transforma en «No» y **Sí→No / No consta** con EA registrados en el mismo acto exige conciliación sin borrado.
- [ ] Un único `fhSegFecha` representa fecha del acto; no se crea fecha de EA sintética.
- [ ] Guardar, navegar y recuperar por la UI realmente soportada restaura exactamente actos y EA del caso de prueba sintético; los datos desechables previos pueden reiniciarse de forma explícita.
- [ ] La app mantiene rutas y consumidores previos sin declarar nuevo EA singular como fuente paralela. Errores de guardado visibles y seguros.

## Blocked by

- G0-VIS: composición visual aceptada; HTML y PNG originales verificados 3/3 en la preparación de WO #793. Verificar **merge y SHA-256 en la rama canónica** antes de habilitar el train.

## Evidence to prepare (handoff C-087, no tests executed)

Prueba focal de DOM/eventos con la interacción real de Seguimiento, recarga/navegación y controles de falsación «No» con observaciones; estados 0/1/2/5 y ausencia sin inventar.

## Scope safeguards

- **NO TOCA:** CSV longitudinal, Export V2/Excel manual, Bridge, API/BD, MedDRA licenciado, CTCAE real, FEDRA, pilotos, datos reales o rediseños de otras patologías.
- **Composición:** resultado por conducta de usuario; capas técnicas y rutas se resolverán al crear la WO C-087 de esa unidad, sin ampliar alcance.
- **UI impact:** `fidelity` **provisional**; clasificación definitiva y master/hash al preparar el handoff según la superficie aceptada.

## Autoridad y frontera

- Base funcional aceptada para Ticketing, incluida en WO #793: [Spec FH EA v0.5](../../../contracts/FH_EA_0N_SPEC_V0_5_PRODUCT_BASE_20261018.md). No equivale a ratificación clínica ni a una WO T01 aprobada.
- [Plan maestro EA 0..N publicado como propuesta](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/promueve/nexus-v4/docs/ops/PLAN_FH_EA_0N_MULTISURFACE_DESTINATIONS_20261017.md). Código clínico existente ≠ funcionalidad nueva implementada.
- La PR documental clínica #778 permanece abierta según última verificación. No atribuirle decisiones fusionadas.
- Solo datos ficticios; no inferir exposición, actividad de línea, causalidad, dosis, pauta, fechas, validación ni seriedad regulatoria. Sin migración histórica del modelo singular demo.
- **Ticket candidato, NO `ready-for-agent` ni `status:approved`.** La emisión de una WO ejecutable requiere gates, revisión de autoridad y GO separado.
