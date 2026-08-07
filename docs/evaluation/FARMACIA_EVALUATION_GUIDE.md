# Evaluación funcional PROMueve Farmacia

## 1. Qué estamos evaluando

Esta evaluación permite recorrer una versión funcional de PROMueve Farmacia con datos exclusivamente sintéticos. Buscamos detectar bloqueantes, incoherencias, necesidades y oportunidades antes de decidir la siguiente evolución.

> **ENTORNO DE EVALUACIÓN CON DATOS SINTÉTICOS.**
> **NO PILOTO. NO PRODUCCIÓN.**

Nos interesa especialmente la seguridad clínica percibida, la coherencia del flujo, la utilidad asistencial, la claridad de la información y la navegación.

## 2. Qué NO estamos evaluando

No valore esta versión como si ya incluyera:

- integración con JARA, Farmacum, Farmatool u otros sistemas corporativos;
- persistencia longitudinal definitiva o backend;
- permisos y seguridad productivos;
- actividad poblacional completa: **Actividad del servicio permanece demo**;
- Office Script, hojas `APP_*`, PostgreSQL o Identity Plane;
- datos reales.

Estadísticas recibe temporalmente la cohorte del Excel cargado. No es una base poblacional persistida.

## 3. Preparación

1. Use Google Chrome o Chromium. Es el navegador demostrado por la QA actual.
2. El equipo coordinador debe iniciar la aplicación en un servidor local y entregar una ventana limpia abierta en la dirección local que termina en `farmacia_index.html`. El repositorio no contiene un launcher para evaluadoras; no abra el HTML como archivo ni reutilice una sesión anterior.
3. Permita las ventanas emergentes de esa dirección local: Estadísticas se abre en una ventana nueva.
4. Tenga disponibles estos dos ficheros, sin editarlos:
   - `PROMueve_FH_EVALUATION_PATIENT_FLOW.xlsx` para los recorridos de paciente individual.
   - `PROMueve_FH_EVALUATION_STATISTICS.xlsx` para Estadísticas.
5. No introduzca nombres, CIP ni información de pacientes reales. Los únicos CIP de los recorridos individuales son `CIP-LONGITUDINAL-A` y `CIP-LONGITUDINAL-B`.

Si la pantalla no muestra **Inicio Farmacia**, o si conserva información de una evaluación anterior, deténgase y pida al equipo coordinador un contexto limpio.

## 4. Recorrido 1 — paciente individual

Use `PROMueve_FH_EVALUATION_PATIENT_FLOW.xlsx`.

1. En **Inicio Farmacia**, pulse **Cargar Excel de Farmacia** y seleccione el workbook.
2. Espere la confirmación de carga.
3. Busque `CIP-LONGITUDINAL-A` con **Buscar paciente**.
4. Revise **Quick View**: compruebe si distingue con claridad lo solicitado, validado y actualmente registrado.
5. Pulse **Dashboard** en Quick View y revise **Dashboard Paciente**.
6. Pulse **Vista completa** para abrir **Patient Longitudinal**.
7. Regrese mediante la navegación visible y explore **Validación**, **Primera Visita** y **Seguimiento**.

No complete campos clínicos inventados. Explore la interacción y anote qué información sobra, falta o está mal ordenada; etiquetas dudosas; riesgos de interpretación; y cualquier obstáculo para el trabajo habitual.

## 5. Recorrido 2 — cambio de paciente

Vuelva a Inicio y realice la secuencia `A → B → A`:

1. Busque `CIP-LONGITUDINAL-A` y observe su contexto.
2. Cierre Quick View, busque `CIP-LONGITUDINAL-B` y confirme que solo aparecen sus datos.
3. Cierre Quick View y vuelva a `CIP-LONGITUDINAL-A`.

Valore si el paciente actual es inequívoco, si el cambio se entiende y si aparece contaminación de datos. Si ha creado un borrador, describa cómo se presenta la decisión de conservarlo o descartarlo, sin añadir información clínica real.

## 6. Recorrido 3 — Longitudinal

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

## 7. Recorrido 4 — Estadísticas

Inicie un contexto limpio nuevo y use `PROMueve_FH_EVALUATION_STATISTICS.xlsx`.

1. En Inicio, cargue el Excel de Farmacia y confirme que indica **55 pacientes**.
2. Abra **Estadísticas del servicio** mediante la navegación visible. Se abrirá una ventana nueva.
3. Revise filtros, KPIs, gráficos, tabla y paginación.
4. Pruebe una selección de población, limpie los filtros y compruebe que vuelve la cohorte completa.
5. Pulse la exportación CSV. Sin filtros, debe descargar 55 pacientes y 37 columnas; con filtros, debe exportar la cohorte filtrada completa.

No interprete Estadísticas como una base poblacional persistida. Tras una recarga directa de esa ventana, la cohorte cargada desde Excel deja de estar disponible.

## 8. Cómo reportar un problema

Para cada incidencia indique:

- pantalla;
- qué intentaba hacer;
- qué esperaba;
- qué ocurrió;
- si bloquea el trabajo;
- captura opcional;
- comentario.

Use la severidad de la checklist: **BLOQUEANTE**, **IMPORTANTE**, **MENOR** o **SUGERENCIA**.

**Nunca incluya datos reales de pacientes en textos, capturas o ficheros.**

## 9. Cierre

- ¿Qué te impediría utilizar esta herramienta en una evaluación más real?
- ¿Qué cambiarías antes de un piloto?
- ¿Qué parte aporta más valor?
- ¿Qué parte aporta menos valor?
- ¿Hay algún riesgo clínico o de interpretación?
- ¿Qué falta para que el flujo se parezca al trabajo real?
