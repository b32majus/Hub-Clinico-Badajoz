# PROMueve FH · G0 v0.4 — aceptación de la referencia visual de Seguimiento EA

**Fecha de reconciliación:** 2026-10-18. **Decisión humana:** «OK» tras presentar maqueta interactiva v0.4 y proponer su congelado visual y preparación de T01.

**Estado de aceptación:** `PRODUCT_VISUAL_DIRECTION_ACCEPTED_IN_CONVERSATION` + `LOCAL_HASHED_FREEZE` con hashes congelados. Este paquete se somete a publicación documental por [WO #793](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/793); el estado `REPO_PUBLISHED` / `ATENEA_FIDELITY_AUTHORITY_IN_REPO` requiere comprobar el merge de la PR y los bytes en `promueve/nexus-v4`. **NO** `T01_APPROVED` ni `PILOT_READY`.

## Referencia aceptada y alcance

- HTML maestro **idéntico al mostrado**: `G0_Seguimiento_EA_v0_4_MASTER_VISUAL_APROBADO_LOCAL.html`, SHA-256 `6dae55cb9b25372ad4c32904a7319b41ee16a71e197e6072eb411a5b6cd6bdd9`.
- Captura «Evaluación de efectos adversos»: `G0_Seguimiento_EA_v0_4_Captura.png`, SHA-256 `3ce6059642b490526bcde774bead2a35913c034d9e295e67ad7c5e90bc557e34`; recorte del bloque DOM de **1099 × 1017 píxeles**, la maqueta se ha probado además en Chromium con viewport de **1440 × 900**; el PNG recortado no acredita por sí mismo el viewport de origen.
- Captura «Análisis de causalidad»: `G0_Seguimiento_EA_v0_4_Causalidad.png`, SHA-256 `a7a58f89540aa39289e6379a6eb91f6dd78901fe62afb72d01e4eeb7a91c0ce0`; recorte de bloque DOM **1099 × 735 píxeles** de la misma composición (no es una captura de viewport completo).
- Las capturas congelan las **composiciones y estados DEMO representados**, no todas las combinaciones posibles de número de EA, estado de resolución ni métodos reales.
- **Congelado de composición del recorrido final**, no obligación de completar todas las tarjetas y controles en T01. En cada slice se compara solo la zona alcanzada por ese ticket, preservando el layout global; controles de T02–T04 se completan en sus propias unidades.

### Criterios de fidelidad de producto

1. Dentro de Seguimiento, bajo la fecha única del acto, una pregunta de presencia/estado `Sí` / `No` / `No consta`; información de lo que **sí** se ha registrado en la visita sin inferir estado actual histórico.
2. «Añadir EA nuevo» principal; selección explícita «Actualizar EA anterior» y recurrencia como alternativa; tarjetas de EA ligeras con descripción identificativa y campos adicionales progresivos.
3. Sospechosos **seleccionados explícitamente por episodio**, sin convertir catálogo ni tratamiento anterior en exposición, actividad o causalidad.
4. **Una sección de causalidad independiente** —no un cuestionario por tarjeta— con selectores en orden EA → sospechoso. Reutilizar los cuestionarios Naranjo y Karch-Lasagna existentes; mockup solo muestra notas sintéticas, NO calcula puntuaciones.
5. Una evaluación se conserva por pareja EA×sospechoso, método y acto; no sobrescribir valoraciones históricas por cambiar de selección ni por desvincular un sospechoso.
6. No borraremos o resolveremos episodios previos al declarar `No` en un acto posterior. Contradicciones en el mismo acto deben bloquear finalización o exigir conciliación consciente.
7. Pantalla acorde al sistema visual existente de Farmacia; mantener jerarquía, densidad, controles y contexto simultáneo sin copiar la lógica JS de la maqueta.

### Límites del congelado

- **No** valida capacidades de guardado/restauración real, lectura longitudinal, cuestionarios clínicos, exportación, Excel, API, integración hospitalaria ni datos reales.
- No congela Quick View, Dashboard del paciente o Estadísticas: sus tickets T05–T07 tienen autoridades funcionales, pero sus composiciones deberán verificarse cuando corresponda.
- La maqueta usa datos y memoria **exclusivamente sintéticos**; no es una fuente de datos ni un codec clínico a transportar literalmente.
- La aceptación visual no ratifica las obligaciones clínicas opcionales pendientes del equipo de Farmacia Hospitalaria; no autoriza piloto.
- Si la implementación descubre un conflicto material entre la maqueta y un requisito de seguridad clínica, **HUMAN STOP**, no ajustar silenciosamente el diseño.

## QA comprobada de la maqueta (18-10-2026)

Se ejecutó sin modificar los archivos originales `python /mnt/data/fh_ea_visual_v04_qa.py`, usando Chromium local con un HTML inyectado por Playwright (`page.set_content`). **10/10 PASS** para: 2 EA y cuestionarios solo en sección independiente; impedir Sí→No con EA del acto; añadir EA en borrador; separar notas por pareja/método; desvincular conservando borrador; continuidad explícita; recurrencia relacionada; 5 EA; estado No distinto de No consta; ausencia de errores JS. Es prueba de la maqueta, **no navegación/QA de la aplicación real**.

## Publicación posterior necesaria para `UI impact: fidelity`

El master se incluye en la WO documental [#793](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/793), en la ruta estable `docs/product/fh-ea/g0-v0.4/`. Conservar idénticos bytes y hashes, registrar pantalla/estado/viewport y enlazar la spec v0.5 reconciliada. Solo **después del merge comprobado** podrá un handoff de Atenea referirse a estos PNG/HTML como autoridad publicada; el agente deberá recibir los píxeles, no solo una ruta textual. INDEX y WORK_ORDER_STATUS se reconcilian separadamente dentro de esa misma WO documental; no cambia el runtime.

**GitHub verificado en revisión:** rama `promueve/nexus-v4` remoto `7c0b7bea2c16d8d2e10f16993603e954ea8a408e` (fotografía, revalidar antes de cualquier publicación); PR #778 OPEN, no fusionada. El plan EA está publicado como **propuesta** mediante PR #792. La spec v0.5 se incluye para publicación mediante WO #793 como base de producto, no como protocolo FH ratificado; verificar merge GitHub.
