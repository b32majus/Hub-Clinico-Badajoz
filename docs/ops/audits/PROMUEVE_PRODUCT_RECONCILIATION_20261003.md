# PROMUEVE — Reconciliación de producto pre-Badajoz 2026-10-03

**Estado:** `LIVE / PRE-BADAJOZ_EXECUTION`

**Autoridad de ejecución documental:** issue #501 — `WO-DOC-NEXUS-PRODUCT-RECONCILIATION-20261003`

**Autoridad de desarrollo:** `promueve/nexus-v4`

**Base verificada al iniciar:** `50b48b41d61d94752f5b10edb04b2e5fb1898f08`

**Última reconciliación de estado:** 2026-10-05 (#539), sobre `promueve/nexus-v4 @ 05114fcf899a857ca6505c1da7eaef2c82ac6155`; último HEAD clínico/producto `05114fcf899a857ca6505c1da7eaef2c82ac6155` (PR #538 / #537). El merge documental de #539 puede mover después el tip Git sin cambiar este HEAD de producto.

**Ámbito:** Farmacia Hospitalaria, Dermatología, Reumatología y evolución multi-hospital de PROMueve Nexus.

**Madurez asistencial:** evaluación con datos sintéticos; **no piloto / no producción**.

## 0. Propósito y relación con documentos anteriores

Este documento conserva la reconciliación de producto acordada el 2026-10-03 después de:

- la reunión reciente Farmacia Hospitalaria + Dermatología;
- la revisión de la última plantilla operativa conocida de solicitud Dermatología→Farmacia, disponible fuera del repo y todavía no publicada como autoridad Nexus;
- la revisión manual de Farmacia realizada por Sil;
- la discusión Cora+Sil posterior para distinguir qué está decidido, qué necesita diseño y qué debe volver al equipo asistencial;
- la decisión de reconstruir Reumatología contra el estado real de Nexus antes de repetir una revisión manual completa.

No reescribe retrospectivamente la auditoría de producto de septiembre [`PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md). Aquella revisión permanece cerrada como evidencia histórica y sus hallazgos publicados o pendientes conservan trazabilidad. Este documento es la autoridad viva posterior para las decisiones y preguntas nuevas de octubre cuando exista conflicto temporal con la revisión de septiembre.

Tampoco modifica por sí mismo el Architecture Decision Freeze, los ADRs, F4.5/F4.6, #446 ni los contratos clínicos ya publicados. Es una reconciliación de producto y una frontera para el siguiente trabajo real.

## 1. Leyenda de estado

| Estado | Significado |
| --- | --- |
| `DECIDIDO` | Alineación humana suficientemente clara para convertirse en requisito de una futura WO, sin implicar que esté implementado. |
| `PENDIENTE_DISEÑO` | Necesidad real aceptada, pero falta definir semántica/UX/contrato antes de implementar. |
| `PENDIENTE_EQUIPO` | La decisión debe volver al equipo clínico/asistencial; PROMueve no debe inventarla. |
| `PENDIENTE_QA` | Debe comprobarse en Nexus por interacción soportada antes de adjudicar cambios. |
| `AWAIT_TEAM_INPUT` | Existe demanda, pero no existe todavía contrato clínico suficiente para diseñar. |
| `HISTORICAL_REFERENCE` | Evidencia útil del producto previo; no autoridad de nuevo desarrollo. |
| `UNDER_READJUDICATION` | La prioridad existe en backlog previo, pero la secuencia humana está temporalmente abierta por nueva evidencia. |

## 2. Decisiones transversales que siguen vigentes

1. Nuevo desarrollo sólo en `promueve/nexus-v4`. `recovery/farmacia-pr-replay-20260727` conserva historia funcional y puede servir de referencia/demo, pero es `HISTORICAL` para nuevo desarrollo.
2. Tratamiento solicitado no equivale a tratamiento validado.
3. Tratamiento previo no equivale a nuevo inicio.
4. Ausencia de dato no equivale a `NO`, validado, línea terapéutica ni evento clínico.
5. Datos reales de pacientes, identificadores y exports clínicos no entran en repo/fixtures/herramientas externas.
6. La expansión multi-módulo no autoriza todavía un paciente universal, un form-builder genérico ni un Control Plane mutable.
7. La Home hospitalaria debe facilitar acceso a **espacios/módulos**; no simular identidad, rol o autorización que todavía no existe.

## 3. Farmacia Hospitalaria — revisión manual 2026-10-03

### 3.1 Inicio — `DECIDIDO`

La pantalla de Inicio debe responder a dos preguntas operativas:

1. **¿Qué paciente quiero abrir?**
2. **¿Hay algo que requiera mi atención?**

Dirección acordada:

- una búsqueda CIP principal y clara;
- no duplicar la misma búsqueda mediante varias tarjetas equivalentes;
- la carga/importación de Excel permanece disponible, pero visualmente secundaria y discreta;
- los accesos rápidos no deben repetir el sidebar; cuando exista trabajo pendiente deben resumirlo y conducir a la superficie `Pendientes`;
- el paciente demo puede mantenerse mientras sea útil para presentación/QA, siempre claramente sintético.

La revisión manual confirmó que la búsqueda y Quick View funcionan; esta decisión es principalmente de simplificación UX, no una reingeniería de la lógica de búsqueda.

### 3.2 `Actividad del servicio` → `Pendientes` — `DECIDIDO` + `PENDIENTE_DISEÑO`

La superficie actual `Actividad del servicio` no tiene hoy una utilidad operativa proporcional y conserva contenido demo/hardcoded. Se reutilizará conceptualmente como **Pendientes**.

Primeras categorías candidatas:

- `Validaciones pendientes`;
- `Pendientes de recogida`.

No se congela todavía un dashboard de jefatura: ese discovery está previsto con responsables de Farmacia a final de año y no debe condicionar esta superficie operativa.

Se reserva la palabra **alerta** para estados excepcionales; la cola normal de trabajo se denomina `Pendientes`.

### 3.3 `PENDIENTE_RECOGIDA` — `DECIDIDO` con parámetros abiertos

`PENDIENTE_RECOGIDA` describe un hecho observable: existe una dispensación esperada que no se ha registrado dentro del intervalo acordado.

No significa por sí mismo:

- pérdida de adherencia;
- abandono del tratamiento;
- negativa del paciente;
- switch, suspensión o resultado clínico.

Regla acordada:

- un paciente puede entrar en `PENDIENTE_RECOGIDA` cuando falte una dispensación esperada según el futuro contrato temporal;
- **sólo una dispensación registrada puede resolver ese estado**;
- en el modelo actual, una dispensación se registra mediante Primera Visita o Seguimiento;
- una validación farmacoterapéutica, consulta, edición u otro evento sobre el CIP no resuelve el pendiente.

Quedan **abiertos**:

- intervalo exacto para considerar la recogida suficientemente retrasada;
- frecuencia de revisión operativa de la cola;
- destinatario/formato del listado cuando el retraso persista.

Los ejemplos discutidos de ~1 mes y revisión semanal son ejemplos de trabajo, no requisitos congelados.

### 3.4 Validación — `DECIDIDO`

La revisión manual detectó exceso de explicación técnica/duplicación de conceptos en la UI de Validación.

Dirección acordada:

- simplificar la entrada y retirar tarjetas/textos que explican detalles de implementación sin utilidad asistencial;
- cuando sea necesario completar manualmente una solicitud, `Servicio de origen` y `Patología` deben poder capturarse explícitamente/editables;
- `entrada manual` vs `solicitud estructurada` **no aporta valor clínico visible** y no debe conservarse en la UI ni en el modelo clínico por inercia;
- antes de eliminar técnicamente ese atributo debe comprobarse si algún adapter/bridge/oracle real depende de él; si sólo fuese metadata técnica de transporte, debe permanecer fuera de la superficie clínica.

### 3.5 Export V2 — `DECIDIDO: MANTENER VISIBLE`

No retirar el botón/superficie Export V2 en esta fase.

Tiene valor demostrativo para explicar a los equipos que PROMueve no queda acoplado a una fila Excel y que la salida estructurada puede soportar evoluciones posteriores como Excel, Power Automate o servidor/API cuando exista infraestructura autorizada.

La mejora necesaria es de **explicación y UX**, no de eliminación: evitar mensajes crípticos de ingeniería y presentar la capacidad como preparación para integraciones estructuradas.

Esta decisión no convierte Export V2 en persistencia, integración automática ni backend operativo.

### 3.6 Primera Visita — `DECIDIDO`

PROMueve debe soportar implantación progresiva: un paciente puede aparecer por primera vez en el Hub durante Primera Visita aunque su historia previa no haya pasado por Validación dentro de PROMueve.

Se preservan dos hechos diferentes:

- `Inducción solicitada`: dato explícito de la prescripción/solicitud;
- `Inducción validada`: decisión explícita de Farmacia.

Cuando se incorpora un paciente previo al sistema, ambos pueden capturarse manualmente si procede, pero **una no genera automáticamente la otra**.

La tarjeta principal debe reducir metadatos secundarios sin utilidad asistencial inmediata (p. ej. información técnica de catálogo/registro cuando no sea necesaria para la decisión visible), sin destruir la información técnica que otros adapters realmente requieran.

### 3.7 CIMA, ficha técnica y autorrelleno en Farmacia — `DECIDIDO`

Se distinguen dos superficies que no deben mezclarse:

#### A. Solicitud desde el servicio clínico

Para moléculas con biosimilar, la solicitud clínica debe expresar **principio activo/molécula**, no marca comercial. Esa solicitud no selecciona una presentación CIMA concreta.

#### B. Validación/captura en Farmacia

En el Hub de Farmacia, el profesional selecciona un **medicamento/presentación concreta del catálogo CIMA**. Esta selección no es equivalente a escribir un nombre genérico.

Dirección acordada:

- una selección explícita de medicamento/presentación CIMA, combinada con la indicación/patología explícita cuando la ficha técnica tenga regímenes distintos por contexto, puede proponer la información de ficha técnica aplicable;
- la propuesta puede incluir, cuando sea inequívoca para la combinación seleccionada, principio activo, presentación, vía, dosis, pauta, inducción u otros datos estructurados disponibles;
- los campos propuestos permanecen **editables**;
- el profesional puede ajustar pauta/dosis/inducción u otros campos cuando exista intensificación, deintensificación, ajuste individual o uso fuera de ficha técnica;
- una modificación manual posterior no debe ser sobrescrita silenciosamente por una rehidratación del catálogo;
- la propuesta no equivale a validación ni sustituye la decisión profesional.

Ejemplo de la semántica acordada: una pluma precargada determina de forma inequívoca su vía, mientras que la pauta puede depender también de la indicación explícita y posteriormente modificarse por decisión profesional.

Esta decisión **supera para esta superficie** la formulación anterior demasiado restrictiva de “catálogo identity-only”. La salvaguarda real es no deducir un régimen desde un nombre genérico o un dato ausente; sí se permite proponer datos explícitos de ficha técnica desde una selección estructurada y contextualizada, manteniendo edición profesional.

### 3.8 Biosimilares en solicitud clínica — `DECIDIDO`, lista concreta pendiente de fuente

En solicitudes Dermatología→Farmacia —y por extensión en futuras solicitudes equivalentes donde proceda—, los medicamentos con biosimilar deben solicitarse por **molécula/principio activo**, no por marca, dejando a Farmacia la selección posterior de marca/presentación según disponibilidad/criterio vigente.

No se congela en este documento una lista de moléculas. Antes de implementación debe verificarse una fuente vigente en España; la memoria o ejemplos de reunión no son suficiente autoridad para hardcodear el catálogo.

### 3.9 Seguimiento e incorporación de tratamiento preexistente — `DECIDIDO` + una decisión clínica abierta

El Seguimiento debe soportar pacientes que ya estaban en tratamiento antes de entrar en PROMueve.

Reglas acordadas:

- incorporar un tratamiento ya existente sirve como **baseline** del Hub;
- no debe fabricar retrospectivamente un `START`, `SWITCH` o `ADD_ON` que PROMueve no observó;
- si el paciente cambia de fármaco o añade uno nuevo, debe existir una **nueva solicitud desde el servicio clínico y una nueva validación farmacoterapéutica en Farmacia**;
- la leyenda actual que menciona sólo “cambio de fármaco” debe abarcar también incorporaciones tipo add-on cuando se implemente la mejora.

#### Decisión que debe volver a Farmacia — `PENDIENTE_EQUIPO`

Cuando un paciente ya en seguimiento incorpora un segundo fármaco tras nueva solicitud + validación:

- ¿la primera dispensación del nuevo fármaco se registra como una Primera Visita del nuevo tratamiento?
- ¿o se registra dentro de Seguimiento, con un evento explícito de inicio/add-on de esa nueva línea?

La respuesta afecta a reporting de nuevos inicios, actos/visitas, dispensación y movimientos terapéuticos. No debe decidirse sólo por elegancia del modelo.

### 3.10 Dashboard del paciente — `DECIDIDO / PENDIENTE_QA`

Dirección acordada:

- retirar de la superficie longitudinal acciones técnicas como `copiar fila Excel FH` cuando no aporten lectura clínica;
- revisar/eliminar `Vista completa` si su efecto no resulta comprensible mediante interacción soportada;
- incorporar comorbilidades al resumen longitudinal cuando exista dato explícito;
- preservar el dashboard como superficie de lectura longitudinal, no convertirlo en un segundo formulario de edición.

### 3.11 Estadísticas y reporting — `DECIDIDO / REQUISITOS DEMO PENDIENTES`

**Publicación acotada posterior (#537 / PR #538):** el botón soportado `Exportar CSV` de Estadísticas queda cableado al exportador publicado y toma `currentCohort`, la cohorte que resulta de los filtros formales. `Buscar en tabla` sigue siendo una copia de presentación local y **no** forma parte de la semántica de exportación. Evidencia sintética publicada: oracle 8/8, browser 6/6 con descargas reales, witness `total > filtered`, zero-result sin fallback y búsqueda local estrechada sin alterar el CSV; merge `05114fcf899a857ca6505c1da7eaef2c82ac6155`, CI PR `37336670618` y post-merge `37336957812` `success`. Esto **no** resuelve el reporting amplio de esta sección, no valida otras columnas CSV ni autoriza piloto/producción. Durante la cualificación se observó deuda preexistente del filtro sexo (`Hombre/Mujer` en UI frente a `M/F` en datos); queda reportada, no corregida ni priorizada automáticamente.

La revisión actual confirma y amplía `SIL-REV-018/019/020` de la auditoría de septiembre.

Necesidades confirmadas:

- recuperar filtros poblacionales que existían históricamente cuando la fuente actual los soporta explícitamente;
- filtro temporal;
- principio activo separado de otros atributos del tratamiento;
- movimientos terapéuticos explícitos;
- comorbilidades;
- PROM/instrumento/valor explícitos;
- validación, eventos adversos/severidad y causalidad cuando exista dato explícito;
- control/actividad de enfermedad sólo desde fuente clínica explícita;
- población con 1/2/3 tratamientos entendida como **líneas activas simultáneas** según contrato, no fármacos históricos acumulados;
- gráficos/representaciones más interpretables para uso asistencial y reporting.

Reglas de seguridad:

- `optimización`, intensificación o deintensificación deben proceder de un movimiento terapéutico explícito, no de comparar dos estados y deducir causalidad;
- `controlado/no controlado` no se sintetiza sin contrato clínico explícito;
- la dimensión `Servicio` debe representar servicio clínico de origen/seguimiento cuando corresponda; Farmacia no debe aparecer artificialmente como servicio propietario universal;
- medicamentos especiales (ensayo clínico, uso compasivo, medicamento extranjero, registros locales) siguen en discovery y requieren fuente explícita/versionada o captura profesional.

**Decisión humana 2026-10-07 — demo inmediata (#576) — PUBLICADA Y VERIFICADA por PR #581:**

- dentro de Estadísticas se separa `Análisis poblacional` de una sección propia `Informes`;
- informes demo definidos: **Informe trimestral Cosentyx** (#576) y **Informe de utilización y dosis — Kisqali** (#579);
- V1 debe ser completo y demostrable, no una versión intermedia;
- se permite fixture sintético dedicado, pero los resultados/conteos se calculan realmente y se muestra detalle auditable;
- XLSX descargable real es salida mínima; PDF es formato adicional si se implementa sin comprometer robustez;
- para `nuevo inicio`, la ventana temporal usa la **primera dispensación explícitamente registrada** del tratamiento. La validación no basta: `VALIDATED != DISPENSED`;
- no inferir dispensación, inicio ni intensificación desde visita, tratamiento actual, nombre del fármaco o dato ausente;
- la proyección raw actual no transporta dispensación explícita; una demo purpose-built puede introducir ese hecho sólo en fixture sintético, sin presentarlo como capacidad de fuente real;
- HS q4w→q2w exige movimiento explícito y un ancla temporal explícita antes de usar datos no sintéticos;
- **Kisqali #579:** un único motor Mensual/Trimestral/Anual/Histórico usa ciclos/meses evaluables como unidad de peso, no patient-days; la semana de descanso no es dosis 0. Presentación explícita (p. ej. `200 mg - 21` / `200 mg - 63`) y dosis explícita 200/400/600 son hechos independientes y no se derivan entre sí. Debe mostrar media por paciente/cohorte, distribución al cierre, cambios explícitos, cobertura de dosis y trazabilidad por ciclo; un cambio mid-cycle sin regla aprobada falla cerrado/no se evalúa. El indicador no equivale a consumo real. Fixture sintético dedicado; sin integración CIMA/raw real en V1.
- V2 preserva el seam para presets/filtros guardados, reutilizables y compartibles; futuro Control Plane queda fuera de la demo.

### 3.12 Excel Bridge — capa de entrada/routing multipatología — `DISCOVERY / EVOLUCIÓN`

La idea planteada el 2026-10-07 **no es una duplicación desde cero**.

Ya existe autoridad previa:

- #232 materializó el workbook Bridge con hojas operativas por servicio;
- la arquitectura V4 define `Hub → TSV → hoja operativa del servicio → Procesar pendientes`;
- #236 describió un Office Script Processor idempotente para transformar raw en tablas relacionadas, pero no un router de entrada;
- #365 demostró un workbook Enfermería v6 multihoja con servicio/hoja explícitos e identidad estable.

La aclaración humana posterior del 2026-10-07 corrige el alcance de #577: **no se decide todavía que deba existir una capa de routing física por patología**.

Hay dos situaciones distintas que deben compararse:

1. **Reumatología:** el workbook inicial 1.0 estaba físicamente separado por patologías (AR, EspA, LES, etc.). Si esa partición sigue siendo necesaria, una entrada única con patología explícita podría resolver la hoja adecuada y reducir el riesgo de escritura manual en la hoja equivocada.
2. **Farmacia / Excel Bridge V4:** el patrón raw append-only + Processor → tablas relacionales comunes puede hacer innecesario cualquier routing físico por patología. En ese caso, añadir otra capa sería complejidad sin valor.

Por tanto, #577 debe decidir entre **routing físico por patología** y **entrada común + servicio/patología explícitos + procesamiento relacional**, pudiendo la respuesta variar por módulo/site.

Invariantes ya válidos:

- servicio/patología vienen explícitos del formulario/payload cuando sean necesarios;
- no se infieren desde fármaco, texto clínico, catálogo, tratamiento previo o ausencia;
- sólo existe mapping a hoja/tabla si el diseño físico realmente lo exige;
- mapping desconocido falla cerrado;
- el contrato de entrada debe poder sobrevivir a Excel → API/DB.

#577 queda en `DISCOVERY / IMPLEMENTATION_AUTHORITY=NO`, fuera de la demo inmediata. No reactiva #236 ni modifica el Architecture Decision Freeze.

## 4. Dermatología — cambio de contexto de producto

### 4.1 Dermatología pasa a ser módulo real candidato de Nexus — `DECIDIDO`

La reunión cambia materialmente el contexto: Dermatología no quiere únicamente rellenar un trámite para Farmacia; existe interés en utilizar PROMueve para mejorar el seguimiento y disponer de una base longitudinal propia.

Dirección acordada:

1. `Nexus Home → Dermatología` como espacio/módulo real;
2. primera profundidad: **Solicitudes a Farmacia**;
3. evolución posterior a una vertical clínica longitudinal completa;
4. estructura/gramática de producto coherente con Reumatología, pero sin copiar semántica clínica de Reuma.

Dermatología debe nacer dentro de Nexus, no como una aplicación temporal destinada a tirarse después.

### 4.2 Misma gramática que Reumatología, contrato clínico propio — `DECIDIDO`

Reumatología y Dermatología deben compartir patrones horizontales donde realmente exista el mismo conocimiento:

- acceso desde Home;
- navegación coherente;
- pacientes/historia;
- Primera Visita;
- Seguimiento;
- análisis poblacional/reporting;
- interoperabilidad con otros servicios cuando proceda;
- estados vacíos, fail-safe y reglas de QA coherentes.

No comparten automáticamente:

- variables clínicas;
- escalas;
- tratamientos;
- criterios de actividad/control;
- formulario clínico;
- semántica terapéutica.

La segunda vertical real servirá para distinguir estructura verdaderamente común de similitudes accidentales de Reumatología.

### 4.3 HS y psoriasis — `DECIDIDO COMO PRIMERAS VERTICALES LONGITUDINALES`

El equipo de Dermatología ha dado OK a incorporar la plataforma para:

- hidradenitis supurativa (HS);
- psoriasis (PsO).

Esto no afirma que estén ya implementadas como módulo Nexus ni que estén listas para piloto. Define la dirección de producto y el siguiente contexto de discovery/implementación cuando se adjudique prioridad.

### 4.4 Plantilla Dermatología→Farmacia actual — `HISTORICAL_REFERENCE / INPUT FUNCIONAL`

La última plantilla HTML utilizada es la referencia funcional operativa conocida del formulario Dermatología→Farmacia, pero todavía no está publicada como autoridad del repo Nexus.

Contiene decisiones que la reunión ha superado —especialmente la solicitud por marca comercial— y por tanto **no debe incorporarse al repo sin reconciliación**.

La evolución prevista es:

- integrar primero la capacidad de solicitud dentro del módulo Dermatología;
- conservar sólo las decisiones clínicas vigentes;
- sustituir progresivamente el formulario aislado por capacidades nativas del Hub Dermatología.

### 4.5 Vacunación / hepatitis B — `DECIDIDO`

Se separan dos datos:

- `Pauta vacunal completa`;
- `Condición suficiente para iniciar tratamiento`.

No son equivalentes.

La solicitud del clínico no debe transformarse en cartilla de Medicina Preventiva. El resto del circuito de vacunación/seguimiento pertenece a la capa asistencial correspondiente.

Input asistencial recibido: en hepatitis B, dentro del circuito acordado, la **segunda dosis** puede ser condición suficiente para dar OK de inicio sin esperar a completar toda la pauta, que es más larga.

Cuando se implemente:

- no registrar falsamente `pauta completa = sí`;
- representar el OK de inicio como hecho distinto y explícito;
- no sintetizar un “apto global” por inferencia.

### 4.6 Inducción y pauta en solicitud Dermatología→Farmacia — `DECIDIDO / YA CONTEMPLADO EN PLANTILLA`

Dermatología debe ser explícita respecto a:

- si existe inducción;
- pauta solicitada;
- resto de datos terapéuticos que el profesional realmente solicite.

La plantilla conocida ya contemplaba esa captura. La implementación Nexus debe verificar que la semántica final sigue siendo correcta y que no se pierda durante la migración.

### 4.7 Eccema de manos — `AWAIT_TEAM_INPUT`

Se ha solicitado añadir **eccema de manos** al circuito Dermatología→Farmacia y posteriormente a Farmacia (Validación, Primera Visita, Seguimiento y capacidades que correspondan).

No existe todavía contrato clínico suficiente.

El equipo de Dermatología aportará qué necesita en:

- formulario de solicitud;
- variables/historia previa;
- seguimiento;
- cualquier requisito clínico específico.

Hasta entonces:

- no copiar dermatitis atópica, psoriasis o HS y cambiar etiquetas;
- no inventar escalas, criterios, tratamiento previo ni reglas por analogía;
- no abrir una WO de implementación clínica.

## 5. Nexus multi-hospital — dirección confirmada

### 5.1 Home por espacio, no por identidad — `DECIDIDO`

La Home debe plantear algo equivalente a:

> **¿A qué espacio quieres acceder?**
> Dermatología · Reumatología · Farmacia Hospitalaria

No debe preguntar “quién eres” como si existiera un modelo de autenticación/roles que todavía no está implementado.

Cuando existan identidad y autorización reales, la Home podrá limitar/mostrar espacios conforme a esa autoridad; no antes.

**Decisión demo 2026-10-07 (#575) — PUBLICADA Y VERIFICADA:** PR #580 publica el acceso soportado Home → Farmacia sobre el deployment sintético. Candidate `ed3e00f97cbc34199b4aa56fcbeb05230d1bf92f` → merge `cdb5b6bd65b9cf2190f4b9d5e04ed68c9c584b3f`; Farmacia queda `QUALIFIED_FOR_SITE / available=true` mediante el contrato de readiness existente y conserva `farmacia_index.html` como ruta. QA browser real demuestra click same-tab + Back; no hubo bypass, cambio de registry ni cualificación hospitalaria. Esto sigue siendo demo/evaluación sintética, no piloto ni producción.

### 5.2 Badajoz y Mérida — mismo módulo, variación explícita — `DECIDIDO`

Hitos humanos conocidos:

- **8-oct-2026 — Badajoz:** presentación asistencial de PROMueve; no es una demo formal de producto, aunque se enseñarán algunas pantallas/capturas y Farmacia verá el Hub por primera vez;
- **26-oct-2026 — Mérida:** primera reunión del grupo de trabajo de esa vertical.

La arquitectura de producto debe favorecer:

`módulo común → deployment/site Badajoz`  
`módulo común → deployment/site Mérida`

No dos forks independientes.

Puede existir variación real —por ejemplo, un formulario más simple en un hospital— pero debe expresarse de forma explícita y gobernada sólo cuando la presión real lo justifique.

### 5.3 Qué aprenderemos antes de generalizar configuración

Tres comparaciones reales servirán para descubrir el contrato mínimo de configuración Nexus:

1. **Reuma Badajoz ↔ Reuma Mérida:** cuánto puede variar un mismo módulo entre hospitales.
2. **Reumatología ↔ Dermatología:** qué estructura es común de verdad entre especialidades.
3. **HS ↔ PsO ↔ futuro eccema de manos:** qué necesita una nueva patología dentro de un módulo.

No diseñar ahora “el JSON universal de Nexus”.

### 5.4 JSON / Control Plane / form-builder — `NO APROBADO AHORA`

La arquitectura actual ya dispone de configuración declarativa para composición/deployment (`module-registry`, `deployment-profile`, manifest y capacidades), pero V4 congeló deliberadamente el form-builder/rule-engine/Control Plane mutable genérico.

Este documento no revierte esa decisión.

Dirección:

- observar variaciones reales primero;
- extraer sólo las dimensiones que realmente cambian;
- mantener semántica clínica en contratos/código gobernados donde corresponda;
- recuperar Control Plane/configuración más potente sólo si Reuma+Derma demuestran presión suficiente.

**Matiz 2026-10-07:** la evolución de reporting aporta una presión real acotada: en V2 se prevén presets/filtros guardados, reutilizables y compartibles. Esto **no** aprueba todavía un Control Plane mutable; únicamente obliga a no hardcodear V1 de forma que impida sustituir después la definición fija por configuración gobernada.

## 6. Reumatología — reconciliación antes de nueva revisión manual

### 6.1 Por qué no repetir ahora una auditoría legacy

La revisión de Reumatología está fragmentada entre conversaciones, WOs, issues y migraciones Nexus. Una nueva revisión manual contra una rama legacy produciría falsos positivos porque parte de los hallazgos ya están corregidos/publicados en Nexus.

### 6.2 Ledger Reuma + Q&A focalizado — `COMPLETADO / VIVO`

La reconstrucción prevista ya se completó y fue adjudicada mediante #504 / PR #506. El ledger vivo está en [`../PROMUEVE_PRODUCT_STATUS_LEDGER.md`](../PROMUEVE_PRODUCT_STATUS_LEDGER.md) y se ha ido reconciliando con las publicaciones posteriores:

- safety/wiring #512/#517 → PR #521;
- prebiológico mínimo #525 → PR #526;
- solicitud textual segura Reuma→Farmacia #528 + #529/#530/#531 → PR #532;
- export CSV de Estadísticas desde la cohorte de filtros formales #537 → PR #538.

La pasada manual focalizada de Reuma quedó adjudicada el 2026-10-04. No procede repetir una auditoría general ya concluyente: el trabajo pre-Badajoz continúa sólo mediante WOs atómicas sobre los hallazgos que el ledger mantiene pendientes, con reproducción soportada y QA proporcional.

La solicitud textual Reuma→Farmacia ya no es un requisito pendiente: Train 14 la publica con sólo Analítica + Medicina Preventiva explícitas y ausencia fail-safe. Esto **no** equivale a una integración estructurada bidireccional: acto/persistencia/retorno de estado/ownership siguen siendo una frontera separada si se prioriza en el futuro.

## 7. Prioridad pre-Badajoz — `EN_EJECUCIÓN_ACOTADA`

La secuencia inicial `#446 renovaciones → Reuma→Farmacia discovery → CIMA` queda preservada como contexto histórico, pero el estado real ya ha avanzado:

- renovaciones N0 se refreezó/publicó por #509 → PR #510 y se reconcilió por PR #511; N1/N2/N3 siguen pendientes;
- safety/wiring Reuma #512/#517 se publicó por PR #521;
- prebiológico mínimo #525 se publicó por PR #526;
- la **solicitud textual Reuma→Farmacia** se publicó por #528 + #529/#530/#531 → PR #532;
- el **CSV de Estadísticas sobre la cohorte de filtros formales** se publicó por #537 → PR #538; `Buscar en tabla` sigue pendiente como requisito separado;
- el harness PROMueve se sincronizó por #533 → PR #534 con Atenea `79f4a40...`, sin cambio clínico de producto; #537 se ejecutó después con autoridad Atenea vigente `77754c1...` mediante refresh Cora/humano, routing Go sin cambio y sin mutar el harness project-local.

Por tanto, ya no hay `UNDER_READJUDICATION` general ni necesidad de completar de nuevo ledger/Q&A. La ronda pre-Badajoz continúa sólo con los ítems pendientes del ledger. F4.5 sigue **técnicamente disponible**, no prioridad humana automática; CIMA permanece concern separado; Dermatología entra en dirección real de producto sin autorizar un gran train; eccema de manos permanece `AWAIT_TEAM_INPUT`. Una futura integración estructurada Reuma↔Farmacia sigue separada del handoff textual ya publicado.

### Criterio para el 8-oct

La reunión de Badajoz no exige una “release espectáculo”. El criterio será:

- corregir riesgos/defectos que afecten coherencia clínica o funcional;
- arreglar P0/P1 visibles que condicionen lo que se va a enseñar;
- aprovechar mejoras pequeñas de UX de alto impacto si son seguras;
- no abrir refactors amplios, Control Plane, Derma completa o arquitectura V5 por presión de fecha.

Recovery puede seguir sirviendo como referencia/demo histórica si resulta conveniente; no se invertirá esfuerzo estructural nuevo allí. Si Nexus está suficientemente estable para enseñar una parte, puede mostrarse como dirección futura.

## 8. Preguntas abiertas preservadas

| ID | Pregunta | Estado |
| --- | --- | --- |
| OCT-OPEN-001 | Ventana exacta para `PENDIENTE_RECOGIDA` | `PENDIENTE_EQUIPO/DISEÑO` |
| OCT-OPEN-002 | Frecuencia operativa de revisión de pendientes de recogida | `PENDIENTE_EQUIPO/DISEÑO` |
| OCT-OPEN-003 | Destinatario y formato del listado persistente de no recogidas | `PENDIENTE_EQUIPO` |
| OCT-OPEN-004 | Primera dispensación de un add-on: Primera Visita del nuevo tratamiento vs Seguimiento+inicio/add-on | `PENDIENTE_EQUIPO` |
| OCT-OPEN-005 | Contenido clínico/formulario de eccema de manos | `AWAIT_TEAM_INPUT` |
| OCT-OPEN-006 | Lista vigente de moléculas con biosimilar aplicables a la regla de solicitud por principio activo | `PENDIENTE_FUENTE_EXPLICITA` |
| OCT-OPEN-007 | Qué variaciones Badajoz/Mérida merecen configuración declarativa | `PENDIENTE_PRESION_REAL` |
| OCT-OPEN-008 | Alcance futuro de JSON/Control Plane/form-builder | `DEFERRED / NO_APROBADO` |
| OCT-OPEN-009 | Priorización final de WOs pre-8 | `SUPERSEDED / EN_EJECUCIÓN_ACOTADA` — ledger/Q&A completados; ejecución continúa por WOs atómicas sobre pendientes vivos |
| OCT-OPEN-010 | Cierre de renovación: fecha explícita vs duración (12 meses habitual; posibles 6/3) con cálculo/confirmación de nueva validez | `PENDIENTE_EQUIPO` |
| OCT-OPEN-011 | Suspensión: dato mínimo del acto FH (hipótesis: fecha del acto + observación opcional) y fecha clínica distinta posterior | `PENDIENTE_EQUIPO` |
| OCT-OPEN-012 | Organización operativa del lote por servicio (cadencia/corte/distribución, evitar duplicar ciclo ya enviado); no condiciona N0 | `PENDIENTE_EQUIPO` |
| OCT-OPEN-013 | Fuente/precedencia real de `valid_until`; hasta validación: fecha + calidad/origen explícitos y fallo cerrado ante discrepancia material, sin jerarquía universal | `PENDIENTE_EQUIPO` |

## 9. NO TOCA de esta reconciliación

- runtime HTML/JS/CSS;
- plantilla Dermatología;
- código CIMA;
- Excel, Export Manager, bridge o adapters;
- F4.5/F4.6;
- #446 o su hold;
- #448/#450;
- ADRs / Architecture Freeze;
- `main`, recovery, Pages, deploy o snapshots;
- datos reales;
- implementation backlog de eccema de manos;
- qualification adicional de Atenea.

## 10. Siguiente secuencia operativa

1. Continuar sólo con WOs atómicas de los ítems que el ledger mantiene pendientes y que tengan autoridad suficiente.
2. Priorizar antes de Badajoz seguridad/coherencia funcional y P0/P1 visibles; no abrir refactors amplios ni V5 por presión de fecha.
3. Mantener `PENDIENTE_FUENTE`, `PENDIENTE_EQUIPO` y `DEFERIDO` sin resolver por intuición.
4. Tratar una futura integración estructurada Reuma↔Farmacia como frontera separada del handoff textual ya publicado; requiere shaping propio si se prioriza.
5. Reconciliar documentación al cerrar cada publicación que cambie estado real, sin reabrir auditorías ya concluyentes.

## 11. Historial y trazabilidad

- Revisión anterior: [`PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md).
- Estado general de WOs: [`../WORK_ORDER_STATUS.md`](../WORK_ORDER_STATUS.md).
- Índice maestro: [`../../INDEX.md`](../../INDEX.md).
- Autoridad documental original de esta reconciliación: issue #501.
- Ledger vivo y Q&A Reuma: #504 / PR #506; publicaciones posteriores #521, #526, #532 y #538.
- Harness C-084 project-local en PROMueve tras #533 / PR #534: sincronizado con `b32majus/Atenea@79f4a40d2330b0377d50dbba266762f450090c99`; #537 se ejecutó bajo autoridad Atenea actualizada `77754c1d03c6dab20e5b5ee5a658b55efe562174` sin cambio de routing ni sync de harness. Cambio de gobernanza, no de producto clínico.
- Reconciliación de estado 2026-10-05: #539 (post-PR #538 / WO #537).

Cerrar/publicar esta reconciliación **no significa implementar** las decisiones descritas. Cada cambio técnico requerirá su propia autoridad acotada, tests/QA proporcionales y reconciliación documental cuando cambie el estado real.
