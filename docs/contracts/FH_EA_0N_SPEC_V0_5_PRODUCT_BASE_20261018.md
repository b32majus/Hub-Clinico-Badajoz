# PROMueve FH · Acontecimientos adversos 0..N
## Especificación funcional consolidada v0.5 — base funcional aceptada para Ticketing

**Fecha de corte:** 17-10-2026

**Estado:** **BASE DE PRODUCTO v0.5 ACEPTADA EN CONVERSACIÓN PARA TICKETING (17-10-2026)**. Recoge acuerdos recientes explícitos sobre V1–V3, continuidad, causalidad y semántica `Sí/No/No consta`. **No es un ticket ejecutable ni una especificación clínica ratificada por el servicio. Se incorpora como referencia documental de [WO #793](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/793); únicamente el merge verificado acredita publicación en `promueve/nexus-v4`. No autoriza OpenCode, T01 ni piloto.**

**Contexto publicado contrastado:** `b32majus/Hub-Clinico-Badajoz`, rama canónica `promueve/nexus-v4`; plan maestro FH EA 0..N versionado por PR #792, resultado documental, no producto implementado. Registro G0 PR #778 continúa **OPEN** en la comprobación. Atenea canónica `b32majus/Atenea` main, C-087 con enmienda #156.

**Método:** estructura de Matt Pocock `/to-spec`: *Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope, Further Notes*. Las decisiones humanas prevalecen sobre detalles ilustrativos de esquemas o prototipos. Los asuntos marcados **PENDIENTE** no deben resolverse automáticamente en `/to-tickets` ni por el implementador.

### Autoridades y referencias

- Acuerdos de producto de esta conversación: V1–V3, sospecha por episodio; valoración por pareja/acto; historial no sobrescribible; continuidad/resolución/recurrencia explícitas; significado de `Sí/No/No consta`.
- Contrato local v0.3, `PROMueve_FH_Contrato_Captura_EA_0N_Seguimiento_V0_3_ACUERDO_PRODUCTO_20261017.md` (fotografía anterior a esos acuerdos nuevos; sustituida **solo** en los puntos que se identifican abajo).
- [Plan maestro EA multisuperficie y destinos (publicado como propuesta)](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/promueve/nexus-v4/docs/ops/PLAN_FH_EA_0N_MULTISURFACE_DESTINATIONS_20261017.md), [alineamiento EA/FEDRA](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/promueve/nexus-v4/docs/architecture/FARMACIA_EA_ESTRUCTURADOS_FEDRA_READINESS_20261014.md), [CSV longitudinal](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/promueve/nexus-v4/docs/contracts/FARMACIA_ANALYTICAL_LONGITUDINAL_EXPORT_V1.md).
- [Alineamiento de destinos V4](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/promueve/nexus-v4/docs/architecture/PROMUEVE_NEXUS_SALIDA_AGNOSTICA_FH_V4_ALIGNMENT_20261012.md), [DeliveryResult F4.5 fase 1](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/promueve/nexus-v4/docs/contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md) **publicado por PR #747**, mapping EA y adaptador #721 sin aprobar.
- Atenea: [Human Product Design Authority](https://github.com/b32majus/Atenea/blob/main/docs/HUMAN_PRODUCT_DESIGN_AUTHORITY_V1.md), [Attended Product Shaping](https://github.com/b32majus/Atenea/blob/main/docs/ATTENDED_PRODUCT_SHAPING_GUARDRAILS_V1.md), [Product Fidelity Gates](https://github.com/b32majus/Atenea/blob/main/docs/PRODUCT_FIDELITY_GATES_V1.md), [Work Unit Composition](https://github.com/b32majus/Atenea/blob/main/docs/WORK_UNIT_COMPOSITION_POLICY_V1.md) y skill `/.agents/skills/to-spec/SKILL.md`, `/.agents/skills/to-tickets/SKILL.md` en Atenea main.

---

## Problem Statement

La farmacéutica necesita documentar **cero, uno o varios acontecimientos adversos (EA)** identificados o revisados durante un Seguimiento, distinguir sucesos nuevos de episodios ya conocidos y evaluar separadamente su posible relación con uno o varios medicamentos. El prototipo de Farmacia actual representa **un EA singular por Seguimiento** con varios sospechosos. Esta representación no puede documentar correctamente dos EA independientes en la misma visita, su evolución longitudinal ni evaluaciones repetidas en actos distintos.

El dato capturado también debe **consultarse y analizarse**, sin obligar a la profesional a volver a escribirlo: Quick View para detectar lo relevante, Dashboard del paciente para entender evolución, Estadísticas del servicio para analizar episodios y observaciones sin doble contabilización, y exportaciones/adaptadores con garantías explícitas. Actualmente existen bloques parciales en las pantallas y proyecciones, **pero no se ha demostrado el recorrido integrado con EA 0..N**.

**Problema de seguridad:** el nombre de un medicamento, su presencia en un catálogo, una línea anterior, un cero de interfaz o la ausencia de respuesta nunca deben convertirse en atribución causal, evaluación completada, exposición o resolución clínica. Tampoco se puede perder información ya guardada al cambiar selectores o estados.

**Contexto y restricción de entrega:** todo dato usado hasta ahora es demo sintético y desechable; se construye directamente el nuevo funcionamiento, **sin migrador de EA singular histórico**. La demo local-first no equivale a piloto ni persistencia institucional.

## Solution

### Resultado que debe experimentar Farmacia

Dentro del **Seguimiento ya existente**, y sin una página nueva de EA, la farmacéutica responde una pregunta de presencia/revisión de acontecimientos adversos (`No consta`, `No`, `Sí`). Con `Sí` registra una ficha ligera por EA nuevo o añade una observación de un episodio anterior mediante las acciones visibles **«Añadir nuevo EA»** y **«Actualizar EA anterior»**. El registro tiene una descripción original identificativa y campos opcionales; no se exige medicamento sospechoso ni completar un cuestionario para registrar el acontecimiento. La fecha de Seguimiento se captura una vez en el campo existente del acto.

Para un EA anterior, la farmacéutica puede **actualizar su evolución**, **declarar resolución** o **registrar una recurrencia como episodio nuevo relacionado con el anterior**. El programa no deduce continuidad, recurrencia ni resolución por el nombre, el medicamento, la fecha o el silencio en visitas posteriores.

Cada episodio puede tener **0..N medicamentos sospechosos explícitamente vinculados**. Se conserva la sección independiente **«Análisis de causalidad»**, con los dos selectores ya aceptados: **EA → medicamento sospechoso de ese EA**. Los métodos Naranjo y Karch-Lasagna mantienen sus respuestas/estados independientes. Una reevaluación en otra visita es una evaluación nueva vinculada a **la misma pareja episodio–sospechoso y al acto correspondiente**, sin sobrescribir la anterior.

Las vistas posteriores consumen la **misma semántica clínica**. Quick View resume, Dashboard explica episodios/observaciones, Estadísticas distingue pacientes/episodios/observaciones y los destinos representan o declaran expresamente qué datos pueden conservar. No se crean registros clínicos redundantes por pantalla.

### Rieles de producto no negociables

1. **La ruta habitual es sencilla.** Los conceptos técnicos episodio/observación/relación no se muestran como una ontología que la profesional deba aprender; las acciones expresan su tarea clínica.
2. **0..N EA por acto**, sin tope funcional de cuatro; varios sospechosos de uno no multiplican EA ni visitas.
3. **Una fecha del acto**, independiente de fechas opcionales de inicio/resolución del EA, que nunca se infieren.
4. **Dato desconocido distinto de ausencia explícita**; «No» en una visita no resuelve episodios previos.
5. **Sin sospecha, causalidad, gravedad, CTCAE, exposición o decisión terapéutica inferidas.** Tratamientos candidatos no pasan a sospechosos hasta selección expresa.
6. **Corrección sin pérdida silenciosa**: borrador descartable con confirmación, información finalizada corregida/anulada con trazabilidad, evaluaciones anteriores consultables.
7. **Captura ≠ evaluación de causalidad ≠ notificación farmacovigilancia ≠ registro institucional.**
8. **Un único origen semántico**, distintas proyecciones para usuario/analítica/destinos. Excel manual sigue siendo modalidad soportada, sin prometer escritura/persistencia por una copia.
9. **Datos de demo desechables**: no fabricar un sistema de migración histórica del EA singular.
10. **Seguridad y simplicidad antes que arquitectura V5**. Terminología licenciada e integración FEDRA no bloquean demo sintética.

---

## User Stories

### Captura en Seguimiento — V1 aprobado como composición

1. Como farmacéutica, quiero indicar `No consta`, `No` o `Sí` respecto a **EA identificados o revisados en esta visita**, para no convertir desconocimiento en negativa.
2. Como farmacéutica, quiero registrar un primer EA con una **descripción identificativa**, sin aportar un fármaco sospechoso, gravedad ni cuestionario obligatorios, para documentar el hecho incluso con información incompleta.
3. Como farmacéutica, quiero registrar dos o más EA distintos en el mismo Seguimiento, para no comprimirlos en una sola descripción.
4. Como farmacéutica, quiero añadir un quinto EA y sucesivos, para que la interfaz no imponga artificialmente un techo de cuatro.
5. Como farmacéutica, quiero que la fecha del acto permanezca una sola vez en Seguimiento, para no registrar fechas redundantes ni inventar fechas reales de inicio.
6. Como farmacéutica, quiero registrar opcionalmente fechas reales de inicio y resolución, evolución, gravedad clínica, actuación y notas cuando las conozca, dejando lo desconocido sin afirmar.
7. Como farmacéutica, quiero guardar, salir, navegar y recuperar los EA del acto con sus identificaciones y textos originales intactos, utilizando un circuito efectivamente soportado en la demo.
8. Como farmacéutica, quiero conservar un borrador al cambiar de EA o estado, o descartarlo mediante confirmación consciente, para evitar pérdidas por interacción.
9. Como farmacéutica, quiero que el sistema detecte la contradicción entre `No` y EA registrados en ese **mismo acto**, y no la resuelva borrando información.
10. Como farmacéutica, quiero que `No` en la visita actual no cierre automáticamente EA de visitas previas, para preservar la verdad longitudinal.

### Continuidad de episodios — V2 aprobado

11. Como farmacéutica, quiero elegir **«Actualizar EA anterior»** y seleccionar el episodio pertinente, para documentar una observación nueva sin duplicar el episodio.
12. Como farmacéutica, quiero indicar expresamente que el episodio persiste o ha evolucionado, para dejar constancia de la situación observada en ese acto.
13. Como farmacéutica, quiero registrar expresamente su resolución, para que conste **cuándo fue documentada** y, si se conoce, su fecha clínica de resolución.
14. Como farmacéutica, quiero registrar una **recurrencia** como episodio nuevo relacionado con uno anterior, para conservar dos episodios distintos sin perder su relación.
15. Como farmacéutica, quiero que un episodio omitido en una visita conserve su último estado y la fecha de esa observación, para no asumir continuidad clínica actual ni resolución por silencio.
16. Como farmacéutica, quiero que el sistema no vincule automáticamente episodios porque coincidan término o medicamento, para evitar uniones incorrectas.
17. Como farmacéutica, quiero corregir o anular un registro finalizado dejando motivo y rastro de la corrección, para preservar lo documentado sin un borrado silencioso.

### Medicamentos sospechosos y causalidad — V3 aprobado

18. Como farmacéutica, quiero marcar **0..N medicamentos sospechosos explícitos por episodio** y no desde una selección automática de líneas o catálogos, para distinguir candidato de sospechoso real.
19. Como farmacéutica, quiero seleccionar primero un EA y después uno de sus medicamentos sospechosos en la sección existente de causalidad, para evaluar la pareja correcta.
20. Como farmacéutica, quiero completar **Naranjo o Karch-Lasagna por separado**, para no atribuir a un método respuestas del otro.
21. Como farmacéutica, quiero distinguir por método **No evaluado / Borrador / Evaluación completada**, para que una puntuación de presentación inicial de cero no simule una valoración válida.
22. Como farmacéutica, quiero seleccionar otro EA o sospechoso y después volver, recuperando las respuestas de cada pareja sin mezcla ni pérdida.
23. Como farmacéutica, quiero reevaluar una pareja en un Seguimiento posterior mediante **una evaluación nueva ligada a ese acto**, para conservar ambas evaluaciones y su secuencia.
24. Como farmacéutica, quiero desvincular un medicamento de las sospechas activas sin destruir sus valoraciones previas, para mantener la historia y no presentarlo falsamente como sospechoso actual.
25. Como farmacéutica, quiero que un medicamento histórico sea solo candidato hasta elección expresa, sin presumir que fue administrado o estaba activo durante el EA.
26. Como farmacéutica, quiero que no aparezca una causalidad calculada o «completada» si no he respondido/ratificado efectivamente el método requerido.

### Lectura y análisis — dirección de producto aceptada, composición visual por verificar

27. Como farmacéutica, quiero que **Quick View** me muestre los EA registrados relevantes con último estado **explícito**, fecha de la última observación y acceso al detalle, sin confundir registrados con activos.
28. Como farmacéutica, quiero que el **Dashboard del paciente** muestre cada episodio una vez y sus observaciones ordenadas por acto, para comprender la evolución sin duplicaciones.
29. Como farmacéutica, quiero consultar en Dashboard sospechosos y resultados de causalidad **tal como fueron registrados y reevaluados**, sin que el resumen los convierta en causalidad demostrada.
30. Como responsable de Farmacia, quiero conocer por separado pacientes con EA documentados, episodios únicos y observaciones registradas, para no confundir volumen de pacientes con carga longitudinal.
31. Como responsable de Farmacia, quiero filtrar por servicio/patología y gravedad **registrada** del mismo EA, sin asignar severidades por fármaco, para obtener estadísticas reproducibles.
32. Como responsable de Farmacia, quiero distinguir en indicadores/denominadores `No`, `Sí` y `No consta`, para no presentar ausencia de registro como incidencia cero.
33. Como responsable de Farmacia, quiero ver distribución por estado o término EA **solo cuando la codificación y el nivel de agregación sean comparables**, para evitar gráficos clínicamente engañosos.

### Destinos y salida — capacidades y decisiones dependientes de contratos

34. Como analista autorizada, quiero seleccionar una **cohorte de pacientes mediante filtros** y descargar **todos sus actos FH disponibles**, aunque algunos actos no coincidan con el filtro, conforme al contrato longitudinal publicado.
35. Como analista autorizada, quiero distinguir en la salida una fila por **acto × línea explícitamente evaluada**, o una fila de acto sin línea si no hubo líneas evaluadas, para no crear tratamientos ni multiplicar hechos generales del acto.
36. Como analista autorizada, quiero conservar EA/PROM 0..N sin duplicarlos por líneas ni por sospechosos, **una vez aprobado el formato del CSV único**, para hacer análisis longitudinal válido.
37. Como farmacéutica, quiero transferir la información mediante **Excel manual** y entender que se ha **preparado para transferir**, no guardado institucionalmente, con la cobertura real del formato declarada.
38. Como hospital con capacidad Excel Bridge, quiero que un Processor autorizado pueda incorporar y volver a leer las relaciones episodio–observación–sospecha–evaluación, **una vez completados y probados** sus contratos/puertas.
39. Como institución con API/BD autorizada, quiero intercambiar la misma semántica sin que las pantallas dependan de SQL ni expongan secretos; su ejecución pertenece a una fase posterior.
40. Como profesional responsable de seguridad, quiero que una eventual codificación MedDRA/CTCAE preserve texto original, versión y origen, y que una futura exportación ICSR/FEDRA no afirme envío ni acuse sin respuesta institucional verificable.

---

## Implementation Decisions

### Decisiones de producto **CERRADAS** (autoridad humana de esta conversación)

**D01 · V1–V3 como resultados funcionales separados.** V1: registrar/guardar/recuperar EA 0..N; V2: continuidad/resolución/recurrencia; V3: sospechosos y causalidad. Son resultados completos propuestos para la siguiente descomposición Matt; no preaprueban un número concreto de GitHub issues ni un orden técnico de capas.

**D02 · Semántica del estado del acto.** Pregunta «¿Se han identificado o revisado acontecimientos adversos en esta visita?»:

| Respuesta | Significado acordado | Consecuencias |
| --- | --- | --- |
| **Sí** | Al menos un EA nuevo o una observación de uno anterior registrada/revisada en ese acto. | Se documenta al menos una ficha/observación al finalizar; borradores siguen siendo borradores. |
| **No** | No se han identificado EA en la visita actual. | No se crean EA; no se resuelven episodios históricos; no coexistir con EA finalizados **en el mismo acto** sin conciliación. |
| **No consta** | Información insuficiente para afirmar presencia o ausencia. | No se infiere una negativa ni un estado del episodio anterior. |

**D03 · Ficha básica ligera.** Descripción original identificativa obligatoria para finalizar un EA **nuevo**. Para seguimiento de uno anterior se selecciona el episodio y se documenta la observación pertinente, sin duplicar obligatoriamente su descripción. Fechas propias del EA, gravedad clínica, evolución, actuación, notas y sospechosos son opcionales mientras no exista ratificación adicional FH. Seriedad regulatoria no obligatoria ni mezclada con grado CTCAE. No exigir causalidad para registrar EA.

**D04 · Identidad longitudinal.** **Episodio** estable por paciente frente a **observación** asociada a un acto. Nuevo episodio, continuación y recurrencia son elecciones explícitas; una recurrencia es episodio nuevo *relacionado*, no una continuación fabricada. El sistema no relaciona por coincidencia textual.

**D05 · Vínculo de sospecha a episodio.** Cada medicamento sospechoso elegido explícitamente se relaciona con el **episodio**, no con una visita aislada. Seleccionarlo no acredita exposición, tratamiento activo ni relación causal demostrada. Una recurrencia nueva **no hereda automáticamente** los sospechosos del episodio previo.

**D06 · Causalidad por pareja y acto.** Cada evaluación tiene identidad propia y referencia a la **pareja episodio–medicamento sospechoso**, al **método** y al **acto donde se realizó**. Reevaluaciones posteriores crean nuevas evaluaciones, no sobrescriben las anteriores. Naranjo y Karch-Lasagna son independientes. El acto aporta su fecha común si está registrada; no se inventa fecha individual, autoría o estado de completitud.

**D07 · Conservación sin borrado silencioso.** Seleccionar otro EA, cambiar de sospechoso o modificar el estado global no borra datos. Desvincular un sospechoso deja sus valoraciones previas históricas, fuera de la selección activa. Borradores no guardados se descartan solo con confirmación; registros finalizados se corrigen/anulan con motivo y trazabilidad, no con eliminación física silenciosa. Los mecanismos exactos de versionado/almacenamiento pertenecen al diseño técnico, sin cambiar esta semántica.

**D08 · Sección y posición visual.** EA está dentro de Seguimiento, después de evolución/adherencia/PROMs y antes de la sección independiente **Análisis de causalidad**. Esta última incluye selectores **EA → sospechoso** y cuestionarios existentes, no cuestionarios duplicados dentro de cada ficha. La fecha única de Seguimiento permanece en el acto.

**D09 · Captura única y proyecciones.** Quick View detecta y enlaza; Dashboard explica la historia longitudinal; Estadísticas agrega por paciente/episodio/observación. Ninguna constituye un almacén clínico alternativo. La composición final de las vistas necesita confirmación visual con estados poblados.

**D10 · Demo construida directamente en 0..N.** Estado anterior sintético/hardcodeado desechable: regenerar fixtures del modelo nuevo. No mantener dos esquemas ni diseñar migración 1→N. Reiniciar almacenamiento demo local únicamente bajo procedimiento de QA explícito y sin eliminar trabajo ajeno.

### Decisiones arquitectónicas publicadas que se **REUTILIZAN**, sin declararlas implementadas para EA

**D11 · Fronteras de acto y adaptadores.** Farmacia emplea casos de uso y contrato de acto F4.4 independientes del destino, con F4.5 como frontera de entrega; Excel manual es modalidad soportada y la UI no conoce hojas/SQL. DTO **F4.5 fase 1** documentado/publicado únicamente para `export_v2_tabular` + `manual_copy`. No hay prueba de cableado integral EA → F4.4 → F4.5 → destino.

**D12 · Formatos diferentes, garantías diferentes.** Export V2 actual 152 columnas y CSV de Estadísticas 37 columnas **no** son la salida analítica longitudinal ni un portador F4.4 íntegro. El workbook Bridge publicado no acredita Processor ni lectura relacional/roundtrip funcional. No copiar filas a SQL como dominio clínico.

**D13 · Analítica longitudinal ya decidida, formato 0..N abierto.** Filtros de Estadísticas seleccionan **pacientes**; se incluyen **todos sus actos disponibles**, con **acto × línea explícitamente evaluada** y fila sin línea cuando corresponda. Ni el filtro ni la repetición de valores comunes del acto justifica asignar EA/PROM a cada línea. **No queda elegido** JSON en celda, columnas variables, filas adicionales ni fichero accesorio para representar colecciones 0..N en el **CSV único**. Eso exige una decisión G3 de producto/contrato, no una ocurrencia del writer.

**D14 · Codificación y vigilancia condicionadas.** MedDRA, CTCAE o ambos por configuración centro/servicio, no selector individual por visita en producto. Selección/versiones/licencias aún requieren G1. Texto original accesible y codificación pendiente si no hay terminología autorizada. Integración FEDRA/ICSR futura G4, fuera del MVP de EA; no inferir éxito de notificación.

### Semántica de dominio (conceptual; NO DTO final)

| Concepto | Ámbito | Identidad/relación que debe sobrevivir | Prohibición |
| --- | --- | --- | --- |
| Acto FH | Seguimiento | Paciente, acto y fecha observada | Duplicar fecha de visita en EA o inventarla |
| Episodio EA | Longitudinal por paciente | Identidad propia, posible episodio anterior relacionado | Fusionar recurrencias por término |
| Observación EA | Acto + episodio | Identidad propia, información nueva en visita | Contar cada observación como episodio nuevo |
| Sospecha | Episodio + referencia de medicamento explícita | Vinculación vigente/histórica | Inferir exposición, terapia activa o culpabilidad |
| Evaluación | Pareja episodio–sospechoso + método + acto | Identidad/revisión/respuestas/resultado **solo si evaluado** | Sobrescribir una evaluación anterior o concluir a partir de defaults |
| Codificación | EA u observación según contrato G1 | Término/texto original, vocabulario/versión/idioma | Inventar MedDRA/CTCAE o confundir gravedad con seriedad |
| Vista/exportación | Proyección identificada | Provenir de los hechos explícitos y declarar cobertura | Fijar historia alternativa/afirmar persistencia sin prueba |

**Seam candidata para `/to-spec`, sujeta a confirmación humana antes de publicación:** reutilizar el límite existente de Seguimiento/acto y el **Read Port/fachada de lectura paciente** para recuperar eventos; consumidores directos Quick View, Dashboard y Cohort/Estadísticas; destinar proyectores/exportadores posteriores a sus contratos propios. Este es un **punto lógico de prueba**, no una orden de crear un módulo, DTO universal ni API de `commit(event)` pública. El repositorio ya tiene algunas superficies/normalizadores singulares; no se deduce de su existencia que la lectura 0..N esté cableada.

### PENDIENTE: decisiones que la síntesis **no** puede adjudicar

| Puerta | Decisión pendiente y alcance |
| --- | --- |
| **G0 FH clínica** | Ratificar si hay mínimos adicionales, interpretación operativa de continuidad/recurrencia, cómo se documenta la resolución y si las fechas propias de EA deben mostrarse o exigirse; confirmar uso/definiciones de gravedad, seriedad y acciones. Lo aprobado aquí sigue siendo acuerdo de producto, no criterio clínico institucional. |
| **G0 UI y fidelidad** | Incorporar las decisiones nuevas a la maqueta integrada, verificar en pantalla los dos selectores, alternancia segura de estados, borradores y edición; congelar composición y viewport/estado para Visual/UX si procede. Mockup actual no acredita este recorrido completo. |
| **G2 dominio/ejecución** | Cerrar detalles técnicos de versionado, corrección/retirada de vínculos con historial, persistencia local-first y lectura canónica, sin ampliar el flujo clínico ni inventar un backend. |
| **G3 Estadísticas** | Definir ventana/denominador de cada KPI (pacientes con EA registrados vs último estado), manejo de episodios antiguos y comparabilidad entre vocabularios sin confundir prevalencia/incidencia. |
| **G3 CSV único** | Elegir representación verificable de colecciones EA/PROM 0..N manteniendo granularidad acto×línea, tipado, cobertura y tratamiento de ausentes; decidir mapping después de evidencia, no dentro del ticket implementador. |
| **G3 Excel/Bridge** | Aprobar mapping y semántica para EA 0..N en Excel manual; completar y validar Processor/Read Adapter según garantías L0/L1/L2 y `DeliveryResult` aplicables. #721 no aprobado y #671 sigue abierto. |
| **G1/G4** | Licencia terminológica y reglas de CTCAE/MedDRA, autorización institucional de API/DB/ICSR/FEDRA, controles de acceso, seguridad y confirmación de destino. No bloquear demo sintética. |

---

## Testing Decisions

### Estrategia: probar comportamientos, no la estructura interna

- Priorizar el **seam más alto** que puede demostrar cada viaje: interacción soportada de Seguimiento para captura; volver a abrir al mismo paciente/acto para recuperación; abrir Quick View y Dashboard mediante navegación real; filtrar cohortes y comparar conteos/exportaciones; roundtrip Excel real solo cuando esa capacidad esté aprobada.
- Usar datos **solo sintéticos**, con fixtures del esquema nuevo y casos comparables; no emplear DOM alterado, readonly modificado ni estados imposibles para probar funciones asistenciales.
- Los tests unitarios/contractuales de identidad, causalidad, deduplicación y proyección complementan, no sustituyen, el QA de navegador cuando cambia la interacción. Ningún PASS automatizado acredita funcionamiento en el SES ni piloto.
- Ejecutar **pruebas focalizadas por resultado**, conservar pruebas verdes existentes pertinentes y realizar checkpoint visual compuesto tras la primera integración material UI; no una suite enorme por cada cambio por defecto.

### Witnesses mínimos y negativos que deberán llevar los tickets Matt

| Ref | Recorrido sintético falsable | Propiedad que demuestra |
| --- | --- | --- |
| Q01 | `No consta` → guardar/abrir | No se transforma en `No`; no aparecen EA implícitos |
| Q02 | `No` con un EA histórico no resuelto | No cierra automáticamente el histórico; conserva fecha/estado anteriores |
| Q03 | `Sí` → EA con solo descripción → guardar/abrir | Se registra sin sospechoso/causalidad/gravedad inferidos |
| Q04 | Dos EA en mismo acto, un mismo sospechoso en ambos | Dos episodios distintos; ninguna pareja comparte respuestas |
| Q05 | Un EA, dos sospechosos, Naranjo y Karch con respuestas diferentes | Cuatro contextos potencialmente distintos, no contaminación |
| Q06 | EA 1..5 en un solo acto | No límite funcional de cuatro ni truncamiento |
| Q07 | Fecha de acto conocida, fecha clínica de inicio desconocida | No copia automática de fecha ni duración inventada |
| Q08 | Acto A nuevo → acto B continuación | Mismo episodio, dos observaciones, dos actos, conteos correctos |
| Q09 | Acto B resolución explícita → acto C recurrencia vinculada | Dos episodios relacionados; nunca continuidad/recurrencia automática |
| Q10 | Revaloración Naranjo mismo episodio/sospechoso en A y B | Dos evaluaciones con acto y estado propios, ambas recuperables |
| Q11 | Naranjo completo, Karch sin responder; UI muestra default cero | Solo Naranjo evaluado, Karch `No evaluado`, nada inventado en exportación |
| Q12 | Desvincular sospechoso con evaluación previa → recargar | No activo, histórico conservado y accesible |
| Q13 | Cambiar `Sí` → `No` con EA finalizados del mismo acto | Bloqueo de contradicción sin borrar fichas; conciliación explícita |
| Q14 | Descartar borrador vs corregir/anular registro finalizado | Confirmación, motivo/trazabilidad según el caso |
| Q15 | Quick View → Dashboard → Seguimiento | Estados explícitos, último acto y episodio correcto, sin duplicar historia |
| Q16 | Cohorte sintética con 8 pacientes/13 episodios/21 observaciones | Tres denominadores distintos; sin multiplicación por sospechosos o visitas |
| Q17 | Estadísticas filtradas por EA grave explícito | El filtro usa gravedad del EA correcto, no de otro EA del paciente |
| Q18 | Cohorte filtrada → CSV longitudinal, paciente con dos líneas evaluadas y varios EA | Todos los actos de pacientes incluidos, filas acto×línea; no producto cartesiano |
| Q19 | Acto sin líneas terapéuticas evaluadas | Una fila de acto sin tratamiento inventado, si la modalidad admite ese formato |
| Q20 | Copiar Export V2 manual sin pegar en Excel | Resultado `prepared_for_transfer`, **no** `persisted` ni acuse SES |
| Q21 | Terminología ausente/sin licencia | Texto original conservado; códigos/CTCAE ficticios no fabricados |
| Q22 | Reinicio de fixtures demo desechables | Se inicia el nuevo formato sin migración de datos singulares ni limpieza de trabajo ajeno |

La implementación de Q18–Q20 está **bloqueada por G3/contratos y autorizaciones**; enumerar casos de prueba no autoriza seleccionar su formato ni ejecutar una salida real.

### Prior art comprobado en el repositorio

Existen superficies de Seguimiento y causalidad, Quick View con campo EA, Dashboard con tarjetas EA, normalizador/cohorte de Estadísticas con estado global/gravedad y Export V2 con EA común singular/JSON de sospechosos. **Existe código en cada lugar**, pero la verificación de esta especificación **no demuestra cableado 0..N ni pruebas Chromium de todo el recorrido nuevo**. Cada ticket debe identificar y reutilizar los tests/consumidores directos pertinentes al prepararse su handoff C-087, con paths y comandos verificados entonces.

---

## Out of Scope

- Migración, compatibilidad retroactiva o reconciliación del EA singular demo desechable con supuestas historias clínicas reales.
- Convertir una selección de medicamento desde catálogo en prescripción, dosis/vía/pauta/presentación, línea activa, exposición, validación o causalidad.
- Nueva pantalla independiente para causalidad, repetición de cuestionarios dentro de fichas de EA, nueva fecha común por EA o selector de terminología por visita.
- Implementación MedDRA licenciada, equivalencias CTCAE/MedDRA, notificaciones FEDRA/ICSR, conexión Farmatool/PreSalud, firma/autenticación institucional o comunicación con JARA.
- Cambios en Reumatología, Dermatología, Enfermería, Primera Visita FH, otros servicios o arquitectura V5 por efecto automático de este trabajo.
- Fijar ahora esquema físico SQL, conexión API, credenciales, Processor Office Script, tablas `APP_*` ni semántica `persisted` no demostrada.
- Romper/modificar preventivamente CSV poblacional existente, Export V2 152 columnas o contratos F4.4/F4.5 mientras se decide G3; no empaquetar JSON en celdas por defecto para resolver colecciones.
- Fijar el número definitivo de tickets Matt, crear issues/labels `status:approved`, lanzar OpenCode, hacer push/PR/merge o desplegar código clínico como efecto de aprobar esta spec local.

## Further Notes

### Estado de cierre para pasar a `/to-tickets`

**Cerrado por producto:** V1–V3; 0..N; ficha ligera; selector de sospecha por episodio; evaluación por pareja/método/acto independiente y conservada; ausencia/negativa/presencia; nuevo/continuación/resolución/recurrencia explícita; fecha del acto única; causalidad separada; sin inferencias; demo sin migración.

**Pendiente por validar con FH:** matices de criterio clínico y mínimos adicionales; estos pueden mantenerse como bloqueo para aptitud de piloto, sin prometer que el demo ya cumple política del centro.

**Pendiente antes de declarar la UI `fidelity` ejecutable:** congelar la composición visual integrada con los selectores y estados nuevos; el prototipo del 17-10 refleja dirección, no todo el comportamiento recién aprobado.

**Pendiente G3:** políticas de ventanas/denominadores de Estadísticas y representación EA/PROM 0..N en CSV único; el ticket de exportación no podrá ser `READY_TO_LAUNCH` antes de la decisión.

**Candidato de división para examen humano, no tickets cerrados:** V1 capturar/recuperar, V2 seguir/recurrir, V3 sospechosos/causalidad, V4 Quick View, V5 Dashboard, V6 Estadísticas, V7 CSV longitudinal, V8 Excel manual, V9 Excel Bridge relacional. Sólo son títulos de *resultados* que `/to-tickets` debe revisar por tamaño, valor demoable y dependencias reales. API/BD y FEDRA son líneas futuras condicionadas.

### Chequeo de fidelidad post-spec (Cora + responsable)

1. ¿El camino ordinario sigue siendo `Seguimiento → añadir/revisar EA → guardar` sin crear una pantalla ni jerga interna?
2. ¿Un episodio tiene historia real y las valoraciones antiguas permanecen consultables, sin más decisiones visibles de las imprescindibles?
3. ¿Quick View, Dashboard y Estadísticas muestran **la misma historia** con finalidades distintas?
4. ¿El CSV o Excel obliga a rebajar la semántica clínica o a multiplicar datos para adaptarse a columnas? Si sí, detener y rediseñar el mapping, no el hecho clínico.
5. Si todas las futuras slices pasan sus tests, ¿seguiría siendo una herramienta que Farmacia quiera usar, en vez de un editor de entidades internas?

### Siguiente operación propuesta (NO ejecutada)

1. Revisión humana de esta v0.5 y del seam lógico de recuperación.
2. Una vez aceptada, versión repo-local de la spec mediante WO documental separada y reconciliación de PR G0 #778, sin fusionarla automáticamente.
3. `/to-tickets` sobre la spec **aceptada**, presentando primero lista numerada V1..V9 con bloqueos, demo observable y posibles recomposiciones. **Sin creación de issues antes de la aprobación de granularidad y de autorización Git explícita.**
4. Para cada ticket implementable, handoff C-087 ulterior con SHA/base actual, worktree aislado, WHAT/WHERE/REUSE/NO TOCA/PROOF/STOP, perfil fijado y aprobación humana correspondiente; no compilar todos los tickets en un único Train.
