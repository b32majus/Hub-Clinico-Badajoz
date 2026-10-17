# PROMueve Nexus · Farmacia Hospitalaria
## Registro vivo de decisiones, dependencias y puertas · EA estructurados, terminología y farmacovigilancia

**Corte:** 17-10-2026  
**Estado de este archivo:** REGISTRO DOCUMENTAL EN PR (pendiente de merge) · DIRECCIÓN VISUAL G0 APROBADA POR RESPONSABLE DE PRODUCTO; PENDIENTE VALIDACIÓN DE CAMPOS CLÍNICOS Y TERMINOLOGÍA CON LOS GRUPOS. **NO IMPLEMENTADO / NO PILOTO**. Las decisiones funcionales expresas se separan de propuestas y decisiones externas todavía abiertas. **WO documental [#777](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/777)**.  
**Repo y rama de referencia (verificados en esta preparación):** `b32majus/Hub-Clinico-Badajoz`, `promueve/nexus-v4@de4d40264474243af0bca1dcad8d67bffbf3ac53`. Volver a comprobar antes de operar.  
**Autoridad relacionada:** [`docs/architecture/FARMACIA_EA_ESTRUCTURADOS_FEDRA_READINESS_20261014.md`](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/promueve/nexus-v4/docs/architecture/FARMACIA_EA_ESTRUCTURADOS_FEDRA_READINESS_20261014.md) (PR #776); [`docs/contracts/FARMACIA_ANALYTICAL_LONGITUDINAL_EXPORT_V1.md`](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/promueve/nexus-v4/docs/contracts/FARMACIA_ANALYTICAL_LONGITUDINAL_EXPORT_V1.md) (PR #774); [`docs/ops/FARMACIA_ESTADO_Y_BACKLOG_20261011.md`](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/promueve/nexus-v4/docs/ops/FARMACIA_ESTADO_Y_BACKLOG_20261011.md).

> **Propósito operativo:** cuando toque construir cada fase, saber qué está decidido, qué necesita confirmación de la responsable de producto, qué pregunta llevar a un grupo asistencial y qué depende de licencias/servicios informáticos/regulador. Esto **no es** un contrato técnico ni una WO de código ni permiso de integración FEDRA.

### Convenciones

- **DECIDIDO funcional:** ratificado por la responsable de PROMueve; no implica desarrollado ni validado por Farmacia. **G0 visual aprobado** no equivale a G0 clínico completamente cerrado.
- **PROPUESTA de diseño:** candidata razonada, pendiente de revisión de mockup o del grupo clínico.
- **PENDIENTE FH:** decisión asistencial que necesita grupo Farmacia.
- **PENDIENTE técnica/licencia:** no se cierra por preferencia de producto.
- **PENDIENTE institucional:** depende de SES/Centro Autonómico de Farmacovigilancia/AEMPS y del entorno concreto.
- **G0–G4:** puertas del alineamiento publicado; G0 mockup/criterio clínico; G1 catálogo/licencias; G2 captura/persistencia; G3 CSV; G4 posible pasarela FEDRA.

## A. Decisiones cerradas como dirección funcional

| ID | Decisión | Estado | Evidencia / alcance | Se retoma en |
| --- | --- | --- | --- | --- |
| EA-D01 | Un Seguimiento podrá registrar **0..N acontecimientos adversos diferentes**, incluso varios posiblemente relacionados con un único fármaco. | **DECIDIDO funcional** | Complementa registro EA singular actual; no implementado. | G0, G2 |
| EA-D02 | **Cada EA** conserva identidad estable, cronología propia **solo si se registra** (inicio/fin/evolución), información original, estado y codificación trazable si existe. La **fecha del acto es única** y se registra en la cabecera común, no una vez por EA. | **DECIDIDO funcional** | La identidad entre visitas debe especificarse; no es sinónimo de cada acto o notificación. | G0, G2 |
| EA-D03 | Medicamentos sospechosos **por cada EA**, cero/uno/varios; causalidad **por relación EA–fármaco**, solo evaluada explícitamente. | **DECIDIDO funcional** | No inferir causalidad ni exposición del catálogo/CIMA ni fármaco activo automáticamente. | G0, G2 |
| EA-D04 | PROMueve será **agnóstico y configurable por hospital o servicio**: modo de registro/codificación **MedDRA**, **CTCAE**, o **ambos**. | **DECIDIDO funcional (17-10)** | Elección de la configuración institucional, no tres formularios ni selector obligatorio en cada captura. La configuración exacta es diseño pendiente. | G0, G1 |
| EA-D05 | Se capturará el EA **una sola vez** y se proyectará a análisis y, si hay autorización, a futura preparación de notificación de farmacovigilancia. | **DECIDIDO funcional** | Ni captura de EA ni generación ICSR equivalen a envío/acuse FEDRA. | G2, G3, G4 |
| EA-D06 | **G4 FEDRA no bloqueará** la mejora de captura ni el CSV; adaptar sólo con especificación y circuito institucional autorizados. | **DECIDIDO funcional** | E2B(R3) es referencia, no contrato de la API REST concreta. | G4 |
| EA-D07 | La salida longitudinal conserva la granularidad **acto × línea explícitamente comprendida/evaluada**, sin duplicar EA/PROM. | **DECIDIDO funcional previo** | Contrato CSV publicado, mapping y materialización 0..N pendientes. | G3 |
| EA-D08 | **Fecha única del acto clínico/farmacéutico** para todas las fichas EA de esa visita; sin multiplicar la entrada de fecha. | **DECIDIDO funcional (17-10)** | **No sustituye** fecha real de aparición/resolución de cada EA: si se conocen, son datos independientes, opcionales y no inferidos desde la fecha de visita. | G0, G2 |
| EA-D09 | Diseñar el patrón EA como **reutilizable en otros servicios clínicos**: potencialmente Primera Visita y Seguimiento, además de Farmacia. | **DIRECCIÓN EVOLUTIVA DECIDIDA (17-10)** | **Pendiente de especificación y priorización por módulo**; no se afirma que el registro EA de Farmacia ya funcione en Reuma, Dermatología u otras visitas, ni se implementa ahora. | Backlog futuro, tras G2 |
| EA-D10 | La configuración **MedDRA / CTCAE / ambos** se decide en el despliegue por hospital/servicio; en asistencia el profesional ve solo el modo habilitado, sin selector repetido. | **DECIDIDO funcional / UI (17-10)** | El selector del mockup es un **simulador de configuración**, no un control definitivo por visita; pendiente política de herencia/versionado. | G0, G1 |

## B. Decisiones que NO debemos dar por cerradas

| ID | Pregunta concreta / alternativa | Responsable de respuesta | Momento / dependencia | Evidencia de cierre exigible | Estado |
| --- | --- | --- | --- | --- | --- |
| EA-P01 | Diseño visual: ficha EA individual, lista y botón «Añadir», y escenarios 0/1/2/4 o más EA; **aprobado por responsable**. Falta confirmar con Farmacia los campos mínimos y su obligatoriedad. | Responsable de producto **validó UI**; pendiente grupo FH | **G0 visual cerrado; G0 clínico pendiente** | Visto bueno expreso de producto 17-10; revisión de trabajo asistencial y campos en grupo. | **CERRADO visual / PENDIENTE FH** |
| EA-P02 | ¿Campos asistenciales mínimos **por EA** (inicio/fin, evolución, actuación, descripción, gravedad clínica) y qué puede quedar opcional? | **Grupo FH** con responsable de producto | **G0**, antes de especificar persistencia | Checklist de campos aprobada, sin añadir burocracia regulatoria por defecto. | **PENDIENTE FH** |
| EA-P03 | ¿Cuándo una observación posterior actualiza el **mismo EA longitudinal** y cuándo inicia un EA nuevo? | **Grupo FH** | G0 → G2 | Casos clínicos sintéticos: evento persistente, recurrencia y diferente evento. | **PENDIENTE FH** |
| EA-P04 | ¿Elegimos términos MedDRA LLT, PT u otra presentación? ¿Qué idioma y criterios de selección/verificación? | **Grupo FH** + MSSO/técnica | **G1**; antes del autocomplete real | Norma de selección y vocabulario/versionado validada, sin codificación automática. | **PENDIENTE FH/G1** |
| EA-P05 | En modo CTCAE, ¿selección de término y grado del catálogo? En modo ambos, ¿se requiere que ambos queden codificados o se admite uno pendiente? | **Grupo FH** + responsable de producto | G0 → G1 | Regla de obligatoriedad y ausencias, mapeo código/versionado validado. | **PENDIENTE FH** |
| EA-P06 | ¿En qué servicios/patologías se utilizará CTCAE y qué criterio específico de gravedad? ¿Cómo separar seriedad regulatoria? | **Grupo FH** | G0 / G1 | Criterio clínico firmado por grupo; prohibida equivalencia grado→seriedad. | **PENDIENTE FH** |
| EA-P07 | ¿Qué configuración institucional hereda cada módulo y cómo se modifica/versiona sin reescribir registros históricos? | Responsable de producto + arquitectura | G1 / WO técnica posterior | Diseño mínimo por despliegue/servicio; versiones y fallback explícitos. | **PROPUESTA técnica** |
| EA-P08 | ¿Modalidad MedDRA **licenciada**: API oficial vía entorno autorizado, índice local precargado o combinación? ¿Derechos de uso/distribución entre hospitales? | Responsable técnica/producto + **MSSO y TI/licencias del hospital** | **G1**, antes de usar catálogo real | Licencia/condiciones confirmadas para el despliegue y actualización; sin secretos en frontend. | **PENDIENTE técnica/licencia** |
| EA-P09 | ¿Qué hacer sin red/catálogo o si no hay coincidencias verificadas? | Responsable de producto + grupo FH | G0/G1, antes de QA | Captura verbatim y estado «pendiente de codificación», sin fabricar códigos, y reglas de validación. | **PROPUESTA** |
| EA-P10 | ¿Qué hacer con datos previos de un único EA y sus cuestionarios al migrar a 0..N? | Arquitectura + QA, validación clínica de equivalencia | G2, **antes de escribir código** | Matriz migración/roundtrip, identidad estable, no pérdida ni nueva causalidad implícita. | **PENDIENTE técnica** |
| EA-P11 | ¿Cómo materializar **0..N EA y 0..N PROM** en **un solo CSV** analíticamente útil sin multiplicaciones ni pérdida de respuestas? | Producto + estadística/FH + arquitectura | **G3**, tras definir semántica G0–G2 | Contrato de esquema, cardinalidades, diccionario de variables y casos de estrés. | **PENDIENTE** |
| EA-P12 | ¿Qué documentos y datos mínimos exige el circuito FEDRA autonómico; qué autorizaciones, endpoint, payload, acuses y responsable notificante? | **SES / Centro Autonómico de Farmacovigilancia / AEMPS** | **G4 diferido**, no bloquea G0–G3 | Especificación de la pasarela/autorización y plan de homologación, no deducción desde E2B(R3). | **PENDIENTE institucional** |
| EA-P13 | ¿Qué campos regulatorios merece la pena recoger ahora sin introducir carga asistencial innecesaria? | **Grupo FH** + farmacovigilancia regional | G0/G4 | Lista mínima por circuito; no asumir lote, dosis, vía, indicación ni seriedad a partir de nombres. | **PENDIENTE FH/institucional** |
| EA-P14 | ¿Qué cambios de semántica, campos, permisos y momentos de captura requieren **Primera Visita y Seguimiento de cada servicio clínico** (Reuma, Derma, otros)? | Responsables de cada servicio + producto + arquitectura | **Evolución futura; no bloquea FH G2** | Casos y contrato separados por módulo; decisión de prioridades por servicio, sin copiar indiscriminadamente el formulario FH. | **PENDIENTE grupos clínicos** |
| EA-P15 | ¿Necesitamos en cada EA fechas propias de inicio/resolución visibles, opcionales y con qué criterio de registro? | **Grupo FH**, posteriormente otros servicios | **G0 clínico → G2** | Confirmar campos y uso; la fecha única del acto se mantiene sin inventar fechas individuales. | **PENDIENTE FH** |

## C. Configuración terminológica de producto — decisión nueva, aún sin implementación

**Se ratifica como dirección funcional:** cada deployment o servicio podrá activar **MedDRA**, **CTCAE**, o **MedDRA + CTCAE**. La aplicación ofrecerá una **experiencia unificada** de búsqueda/registro; el profesional nunca estará obligado a elegir en cada acto entre tres diccionarios: ese selector queda **solo en el mockup para ensayar configuraciones**, no en la captura diaria. **FEDRA no es un tercer vocabulario de autocompletado**.

**Se mantiene pendiente para G0/G1:** si un servicio exige ambas codificaciones, cómo representar «una está codificada / la otra pendiente», si se autorizan traducciones entre diccionarios por correspondencia oficial versionada y cómo se actualizan catálogos sin alteración retroactiva. CTCAE contiene términos y criterios de graduación; no es «solo un grado». En la demo se usarán términos sintéticos y códigos `DEMO-*`, nunca un volcado de MedDRA sujeto a licencia. La configuración por centro no autoriza compartir información clínica entre despliegues.

**Licencia vs comunicación externa (dos puertas diferentes):**
- **MedDRA/G1:** permiso de usar catálogo/API y/o construir índice local, restricciones contractuales, actualización, idiomas, autenticación de la API de terminología. Una instalación hospitalaria podría tener permisos propios; el desarrollador no debe presumir redistribución.
- **FEDRA/G4:** habilitación de una **pasarela institucional para notificaciones ICSR** al circuito oficial y documentación específica del emisor. Ninguna licencia terminológica da acceso automáticamente a FEDRA. Envío y acuse son estados distintos; el transporte no sustituye validación humana.

## D. Orden acordado de los cuatro próximos trabajos (sin simultanear WOs)

| Orden | Entregable | Puerta y condición de salida | Alcance NO TOCA |
| --- | --- | --- | --- |
| **1 — ahora** | Mockup **HTML/CSS navegable**, con escenarios sintéticos 0/1/2/4 EA y configuración MedDRA/CTCAE/ambos; **dirección visual aprobada el 17-10**, R2 ajusta fecha común de acto. | **G0 visual confirmado por producto; G0 campos clínicos por Farmacia pendiente**. | No scripts de producto ni modelado FEDRA. |
| **2** | Contrato de captura clínica 0..N + política de terminología/licencia y casos de fallo. | **G1** y parte de G0 FH; decidir identidad, relación sospecha, ausencia, exportabilidad. | No dar por demostradas API/librerías o equivalencias. |
| **3** | Implementación atómica de captura/persistencia en rama aislada y tests + QA de navegador. | **G2**; migración de EA singular, múltiples EA/sospechosos, restauración, fallo seguro. | No integrar FEDRA ni rehacer arquitectura general. |
| **4** | WO separada de exportación CSV longitudinal; mapping/fila acto×línea y estructuras repetibles. | **G3**; tests sintéticos adversariales, analítica sin doble contabilización. | No reemplazar CSV 37 ni Export V2 por accidente. |

**FEDRA G4** permanece diferido, con puerta institucional explícita. No trabajar en un driver de envío ahora.

## E. Próximas convocatorias / preguntas para grupos de trabajo

**Grupo Farmacia — llevar con mockup G0 ya aprobado visualmente por producto:** campos mínimos EA; si admiten múltiples EA por seguimiento; decisión de episodio vs nueva observación; modos deseados por centro/patología; obligatoriedad de grados CTCAE; ejemplos de lenguaje habitual/autocomplete; rol del codificador y conducta ante términos no encontrados; posible seriedad regulatoria (sin equivalencia automática).

**Grupo de estadística/calidad — llevar al entrar en G3:** unidad de análisis paciente/acto/EA/línea; denominadores; cómo tratar EA repetidos o seguidos; definición de variables para explotación multicéntrica; limitaciones de «un CSV» ante cardinalidades 0..N.

**TI institucional / interlocutor MSSO — llevar al iniciar G1:** versión e idioma autorizados, suscripción, API oficial o índice local, restricciones de precarga en despliegues, renovación y credenciales, uso sin exposición de búsquedas clínicas a terceros.

**SES/Centro Regional/AEMPS — solo G4:** emisor autorizado, especificación real de API FEDRA, payload, datos de notificador, consentimiento/base legal cuando aplique, identidad de casos y seguimiento, pruebas, seguridad, acuse/rechazo y homologación.

## F. Trazabilidad, estados y gobernanza

- Código publicado todavía usa `currentFollowupVisit.adverse_event` singular; causalidad `causality_by_suspect`. No existe UI 0..N, catálogo MedDRA ni envío FEDRA integrado.
- Contrato analítico v1 y alineamiento FEDRA publicados por PR #774 y #776, respectivamente; **son dirección funcional/documentación**, no QA de navegador, capacidad piloto ni implementación.
- Para mockup aislado local **no se cambia el producto**. Una WO técnica necesita preflight GitHub, reversión, NO TOCA, tests, QA, aceptación y permiso explícito de publicación.
- **Este documento es un registro vivo publicado a revisión en rama documental**, no un contrato clínico aprobado por Farmacia ni una WO de código. Su inclusión en rama canónica requiere **merge autorizado**. Se enlaza desde INDEX y backlog y se alinea con arquitectura. `WORK_ORDER_STATUS.md` se revisó y solo cambiará al reconciliar estados reales posteriores al merge.
- No meter datos reales de pacientes ni claves API en GitHub, worktrees de demo o herramientas externas.

## G. Alcance transversal y fecha del acto — validación visual 17-10-2026

**Fecha común:** la fecha del acto es una propiedad de la visita, no de cada EA. El mockup R2 conserva un único control en cabecera. No se infiere desde ella el comienzo ni la resolución de ninguna reacción adversa; esos datos temporales individuales permanecen opcionales si fueron documentados. **No interpretar «EA notificado/recogido en una visita» como «EA comenzado ese mismo día»**.

**Extensión a servicios clínicos:** el modelo debe poder reutilizar el concepto de EA 0..N en Primera Visita (cuando proceda) y Seguimiento de Dermatología, Reumatología y futuros servicios, con la configuración terminológica del despliegue. **Se registra como línea evolutiva futura, no como WO aprobada ni como alcance de la primera implementación FH**. Requiere análisis de formularios, semántica de eventos y QA propios por módulo. No generar un paciente universal ni compartir datos entre despliegues.

**Estado del mockup:** la responsable aprobó expresamente el diseño estético y el patrón de hasta cuatro EA visibles, con capacidad 0..N. Es una dirección visual **validada por producto**, no una aprobación de todos los campos clínicos ni una validación de navegador del producto real. Selector de terminología solo visible para ensayos/configuración; en un despliegue operativo, el modo ya estaría fijado. La versión R2 del prototipo se mantiene fuera de GitHub dentro de esta WO documental.
