# Evaluación funcional PROMueve Farmacia — guía autónoma

> **ENTORNO DE EVALUACIÓN CON DATOS SINTÉTICOS.**
> **NO PILOTO. NO PRODUCCIÓN.**

## 1. Qué estamos evaluando

Esta evaluación permite recorrer una versión funcional de PROMueve Farmacia **publicada de forma autónoma en la web** con datos exclusivamente sintéticos. Buscamos detectar bloqueantes, incoherencias, necesidades y oportunidades antes de decidir la siguiente evolución.

No se necesita desplegar la aplicación ni línea de coordenación: se abre directamente desde una URL pública estable y todo el material de evaluación es sintético.

Nos interesa especialmente la seguridad clínica percibida, la coherencia del flujo, la utilidad asistencial, la claridad de la información y la navegación.

## 2. Qué NO estamos evaluando

No valore esta versión como si ya incluyera:

- integración con JARA, Farmacum, Farmatool u otros sistemas corporativos;
- persistencia longitudinal definitiva o backend;
- permisos y seguridad productivos;
- actividad poblacional completa: **Actividad del servicio permanece demo**;
- Office Script, hojas `APP_*`, PostgreSQL o Identity Plane;
- datos reales.

Estadísticas recibe temporalmente la cohorte del Excel cargado. No es una base poblacional persistida y tampoco es una segunda base de datos.

## 3. Acceso autónomo

1. Use Google Chrome o Chromium. Es el navegador demostrado por la QA.
2. Abra la URL pública estable:

   ```
   https://b32majus.github.io/Hub-Clinico-Badajoz/previews/caceres-fh/
   ```

   Para que la ventana de Estadísticas reciba la cohorte efímera desde Inicio, la navegación visible debe iniciarse desde la superficie canónica **Inicio de Farmacia** (`farmacia_index.html`). Si al abrir la URL el vínculo visible **«Inicio de Farmacia»** de la navegación lleva a `farmacia_index.html`, pulse ese vínculo para fijar la superficie canónica antes de cargar el workbook.

3. Confirme que aparece la identidad **CÁCERES-REVIEW-0.4** y el aviso permanente **«Datos exclusivamente sintéticos. No usar para asistencia clínica real»**.
4. Permita las ventanas emergentes de esa dirección: **Estadísticas del servicio** se abre en una ventana nueva.
5. Tenga disponible **un único workbook**, sin editarlo:

   - `PROMueve_FH_EVALUATION_FARMACIA.xlsx`
6. No introduzca nombres, CIP ni información de pacientes reales. Los únicos CIP de los recorridos individuales son `CIP-LONGITUDINAL-A` y `CIP-LONGITUDINAL-B`.

Si la pantalla no muestra **Inicio Farmacia**, o si conserva información de una evaluación anterior, recargue la página en un contexto limpio y empiece de cero.

## 4. Carga única del workbook

El modelo de esta evaluación es **un único workbook de Farmacia por contexto**:

1. En **Inicio de Farmacia**, pulse **Cargar Excel de Farmacia** y seleccione `PROMueve_FH_EVALUATION_FARMACIA.xlsx`.
2. Espere la confirmación de carga.
3. El mismo workbook cargado alimenta: **Inicio**, **Quick View**, **Dashboard Paciente**, **Patient Longitudinal**, **Validación**, **Primera Visita**, **Seguimiento**, **Estadísticas** y la descarga **CSV**.

No cargue un segundo workbook de Farmacia en ningún módulo. Si desea cambiar de cohorte, recargue la página en un contexto limpio y cargue de nuevo el workbook; no conserve una pestaña antigua para cambiar de dataset.

## 5. Recorrido 1 — paciente individual

Use el mismo workbook ya cargado.

1. En **Inicio de Farmacia**, verifique que **Cargar Excel de Farmacia** está cargado (95 filas · 93 actos · 55 pacientes).
2. Busque `CIP-LONGITUDINAL-A` con **Buscar paciente**.
3. Revise **Quick View**: compruebe si distingue con claridad lo solicitado, validado y actualmente registrado.
4. Pulse **Dashboard** en Quick View y revise **Dashboard Paciente**.
5. Pulse **Vista completa** para abrir **Patient Longitudinal**.
6. Regrese mediante la navegación visible y explore **Validación**, **Primera Visita** y **Seguimiento**.

No complete campos clínicos inventados. Explore la interacción y anote qué información sobra, falta o está mal ordenada; etiquetas dudosas; riesgos de interpretación; y cualquier obstáculo para el trabajo habitual.

## 6. Recorrido 2 — cambio de paciente

Vuelva a Inicio y realice la secuencia `A → B → A`:

1. Busque `CIP-LONGITUDINAL-A` y observe su contexto.
2. Cierre Quick View, busque `CIP-LONGITUDINAL-B` y confirme que solo aparecen sus datos.
3. Cierre Quick View y vuelva a `CIP-LONGITUDINAL-A`.

Valore si el paciente actual es inequívoco, si el cambio se entiende y si aparece contaminación de datos. Si ha creado un borrador, describa cómo se presenta la decisión de conservarlo o descartarlo, sin añadir información clínica real.

## 7. Recorrido 3 — Longitudinal

En Patient Longitudinal de `CIP-LONGITUDINAL-A`, valore si resultan comprensibles:

- los actos y el acto multifila;
- los tratamientos y sus estados explícitos activo, no activo y no registrado;
- los cambios de dosis y pauta;
- la suspensión explícita;
- los PROMs históricos, incluidos `0`, `false` y los valores sin fecha;
- la adherencia histórica;
- los efectos adversos, sus actualizaciones y la causalidad explícita;
- las ausencias y los valores **No registrado**.

No valide umbrales clínicos ni interpretaciones automáticas: esta vista no debe aplicarlos. Una fecha ausente no debe aparecer inventada y un EA no debe parecer resuelto sin resolución explícita.

## 8. Recorrido 4 — Estadísticas

Estadísticas usa **la misma cohorte cargada una sola vez desde el único workbook de Farmacia**. No se carga un segundo workbook para Estadísticas.

1. Desde Inicio, con el workbook de Farmacia ya cargado, abra **Estadísticas del servicio** mediante la navegación visible. Se abrirá una ventana nueva con **la misma cohorte de 55 pacientes**.
2. Revise filtros, KPIs, gráficos, tabla y paginación.
3. Pruebe una selección de población, limpie los filtros y compruebe que vuelve la cohorte completa.
4. Pulse la exportación CSV. Sin filtros, debe descargar 55 pacientes y 37 columnas; con filtros, debe exportar la cohorte filtrada completa.

No interprete Estadísticas como una base hospitalaria persistida ni como un segundo dataset. Si se abre directamente o se recarga esa ventana, la cohorte efímera de Farmacia deja de estar disponible: vuelva a Inicio y abra Estadísticas de nuevo desde la misma cohorte cargada.

## 9. Enfermería complementaria

La Enfermería es un módulo complementario y opcional, con su propio loader visible:

1. En Inicio de Farmacia, localice el módulo **«Excel de Enfermería»** y use **Cargar Excel de Enfermería**.
2. Cargue el workbook sintético de Enfermería por separado.
3. Verifique que se muestran las solicitudes de Enfermería / Inicio biológico.
4. Confirme que el workbook de Enfermería **no sustituye ni sobrescribe** los valores explícitos del workbook de Farmacia.

**Precedencia:** Farmacia raw tiene precedencia; Enfermería solo enriquece huecos.

## 10. Cómo reportar un problema

Para cada incidencia indique:

- pantalla;
- qué intentaba hacer;
- qué esperaba;
- qué ocurrió;
- si bloquea el trabajo;
- captura opcional;
- comentario.

Use la severidad de la checklist: **BLOQUEANTE**, **IMPORTANTE**, **MENOR** o **SUGERENCIA**.

**Nunca incluya datos reales de pacientes en textos, capturas o ficheros. La actividad evaluada es demo y no forma parte de la evaluación de la población raw.**
