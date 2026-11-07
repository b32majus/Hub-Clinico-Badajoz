# Seguimiento de Farmacia · «EA v1 demo» (07-11-2026)

Qué hace hoy la pantalla `farmacia_seguimiento.html` en el cierre de «EA v1 demo» ([#867](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/867), [#869](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/869), [#870](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/870), epic #860). Complementa la adenda `FH_BRIDGE_RAW_EA_0N_C1_ADENDA_TRANSICION_MIXTA_20261029.md` (formato del libro) y la spec `FH_EA_0N_SPEC_V0_5_PRODUCT_BASE_20261018.md`. Solo datos sintéticos. Sin guardado: lo que la pantalla prepara es una copia manual.

## 1. Dos salidas
- **Copiar texto JARA** y **Copiar filas Excel FH**. Esta última es la visita completa en el formato de 166 columnas: una fila de acto, una fila por línea revisada y las filas de EA (observación, sospecha, evaluación). Se pegan en el libro del hospital.
- Fuera de la pantalla: CSV, Excel WO8, «datos estructurados (demo)» y el Bridge raw suelto. Validación y Primera Visita no cambian (siguen en el formato de 152 columnas).

## 2. Identidad del acto
- Con el paciente en el libro, el acto lleva `fh_act_id`, `patient_id` y `fh_patient_ref` **leídos del libro**; nunca se deducen del CIP. Sin `patientRef` declarado la copia se bloquea con motivo.
- Los identificadores nuevos llevan el id del acto: episodio `<actId>-EP-NNNN`, observación `<actId>-OBS-NNNN`, evaluación `<actId>-EV-NNNN`, línea `<actId>-LIN-NNNN` y tratamiento `<actId>-TRT-NNNN`. Dos visitas pegadas en el libro nunca repiten identidades. El registro demo (`CIP-DEMO-FH-*`) conserva sus ids antiguos.
- La fecha del acto debe anotarla el profesional.

## 3. Contenido de la visita
Viaja una sola vez en la fila de acto: estratificación, recogida de PROMs (con sus valores) y otros fármacos (`related_treatments_json`). En cada línea revisada: dispensación, movimiento terapéutico, suspensión, observaciones y adherencia. Un control que el profesional no tocó viaja como «no registrado»; solo cuenta lo que marca. Ausente ≠ NO.

## 4. Fármaco en la primera visita (A1 + A2)
Un paciente sin líneas (primera visita en la plataforma, ya en tratamiento) busca su fármaco en «Tratamiento actual»:
- el fármaco pasa a ser una línea de **esta visita** (`<actId>-LIN-0001`, `session_new`), principal y activa; la tarjeta dice «Registrada en esta visita · aún no está en el libro» y nunca «alta» ni «validada»;
- sirve como sospechoso en EA y aparece en JARA;
- viaja en la copia 166 como una `followup_line` más, con la foto del fármaco; **pauta, dosis, vía y fecha de inicio no se infieren** (lo que no hay viaja vacío). Una vez pegada en el libro, el lector la toma como línea activa del paciente (última foto por `line_id`);
- dos líneas principales en el mismo acto bloquean la copia con motivo.
Límites: el buscador solo crea la primera línea. Los «Otros fármacos» viajan hoy en `related_treatments_json`; por decisión de Sil (07-11) los activos deben viajar como líneas propias, igual que el primero (pendiente: tramo A3, que también cambiará sus sospechosos de `other:<uid>` a `line:<id>`). No se puede deshacer el fármaco elegido sin recargar.

## 5. Formulario de EA (B)
- Un EA es **una fila**: descripción, gravedad opcional y evolución. No hay «Incorporar al acto»: escribir la descripción lo incorpora; vaciarla lo devuelve a borrador (un borrador no viaja).
- Junto a la descripción: «Término codificado: pendiente de codificar», de solo lectura. MedDRA/CTCAE no están implementados (D14 de la spec v0.5, #777); nunca se escribe ni se inventa un código.
- Sospechosos: se marcan **una vez**, en la fila, solo entre medicamentos identificados expresamente. En una ficha longitudinal, los sospechosos de la visita anterior se muestran como referencia, sin marcar, con aviso para preguntar activamente.
- Causalidad (Naranjo y Karch-Lasagna): un único editor que se abre dentro de la fila del sospechoso marcado, sin guardar antes y sin selectores de episodio ni de sospechoso. Con varios sospechosos marcados en la misma fila, cada uno tiene «Evaluar causalidad».
- Si el método está relleno viaja directamente (respuestas, puntuación, categoría y «Valoración final» del profesional, por pareja EA×sospechoso) en las dos salidas; sin tocar, «No evaluada» y no viaja; a medias, **bloquea ambas salidas** con motivo.

## 6. Historia de EA
Con identidad de libro, los EA anteriores del paciente se listan con acciones: abierto → «Continúa» / «Resuelto»; cerrado → «Recurrencia»; ambiguo → ninguna («Revisar en origen»). Cada visita registra su propia observación; el episodio anterior no se modifica. Los pacientes del registro demo no tienen historia.

## 7. Pendiente
Pantalla con el detalle de la evaluación al abrir un episodio (puntuación, categoría, valoración final); columnas EA en el CSV de Estadísticas; guardar y reabrir por Bridge (C3b). Ver `docs/IDEAS.md` y `docs/PREGUNTAS_ABIERTAS.md`.

## Verificación
Checks de navegador (Playwright, servidor efímero): `tools/farmacia_ea_seguimiento_*_browser_check.mjs` (sospechosos, causalidad y salidas, episodios anteriores, dos salidas, contenido de visita, identidad del libro, formulario simplificado), `farmacia_seguimiento_first_visit_drug_browser_check.mjs` y `farmacia_seguimiento_new_line_166_browser_check.mjs` (incluye releer el libro).
