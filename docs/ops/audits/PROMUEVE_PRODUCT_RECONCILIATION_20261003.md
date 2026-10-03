# PROMUEVE — Reconciliación de producto pre-Badajoz 2026-10-03

**Estado:** `IN_PROGRESS / PRE-BADAJOZ_RECONCILIATION`

**Autoridad de ejecución documental:** issue #501 — `WO-DOC-NEXUS-PRODUCT-RECONCILIATION-20261003`

**Autoridad de desarrollo:** `promueve/nexus-v4`

**Base verificada al iniciar:** `50b48b41d61d94752f5b10edb04b2e5fb1898f08`

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

### 3.11 Estadísticas y reporting — `DECIDIDO COMO DIRECCIÓN`, implementación pendiente

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

## 6. Reumatología — reconciliación antes de nueva revisión manual

### 6.1 Por qué no repetir ahora una auditoría legacy

La revisión de Reumatología está fragmentada entre conversaciones, WOs, issues y migraciones Nexus. Una nueva revisión manual contra una rama legacy produciría falsos positivos porque parte de los hallazgos ya están corregidos/publicados en Nexus.

### 6.2 Ledger que debe reconstruir Cora — `NEXT_ACTION`

Antes de pedir otra pasada manual a Sil, reconstruir contra `promueve/nexus-v4` un ledger con estados:

- `RESUELTO`;
- `PENDIENTE`;
- `SUPERSEDIDO`;
- `REVALIDAR`.

Debe cruzar al menos:

- revisión histórica de Reuma;
- issues/WOs correspondientes;
- código publicado actual;
- PCR/unidades;
- catálogo/autocomplete y categorías;
- simplificación prebiológico;
- Reuma Read Port;
- Seguimiento y Estadísticas migrados;
- frontera legacy 497;
- Visit Act v1 y cutover de Primera Visita/Seguimiento;
- deudas abiertas #448 y #450 mientras sigan vivas.

Después, entregar una checklist manual **sobre Nexus**, no una auditoría genérica, para que Sil pueda validar de una sola pasada los journeys/hallazgos que realmente siguen abiertos.

## 7. Prioridad pre-Badajoz — `UNDER_READJUDICATION`

El estado anterior mantenía como secuencia humana:

`#446 renovaciones → Reuma→Farmacia discovery → CIMA`

La nueva información no cancela automáticamente esa secuencia, pero impide ejecutarla por inercia.

Hasta completar el ledger + Q&A manual Reuma y cruzarlo con la revisión Farmacia:

- F4.5 sigue **técnicamente disponible**, no prioridad humana automática;
- #446 conserva su estado/hold y no se toca por esta reconciliación;
- Reuma→Farmacia sigue necesitando discovery;
- CIMA sigue como concern separado;
- Dermatología entra en la dirección real de producto, pero no se abre todavía un gran train de implementación;
- eccema de manos permanece `AWAIT_TEAM_INPUT`.

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
| OCT-OPEN-009 | Priorización final de WOs pre-8 | `PENDIENTE_LEDGER_QA_REUMA` |

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

1. Publicar esta reconciliación documental.
2. Reconstruir ledger Reumatología contra Nexus.
3. Entregar checklist manual Nexus a Sil.
4. Ejecutar una única revisión manual Reuma centrada en lo todavía relevante.
5. Cruzar Reuma + revisión Farmacia ya cerrada.
6. Adjudicar WOs pequeñas pre-8 y backlog posterior.
7. Sólo después abrir implementación adicional de producto bajo C-084, con tickets muy acotados y sin dejar decisiones materiales a OpenCode.

## 11. Historial y trazabilidad

- Revisión anterior: [`PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md).
- Estado general de WOs: [`../WORK_ORDER_STATUS.md`](../WORK_ORDER_STATUS.md).
- Índice maestro: [`../../INDEX.md`](../../INDEX.md).
- Autoridad documental de esta reconciliación: issue #501.

Cerrar/publicar esta reconciliación **no significa implementar** las decisiones descritas. Cada cambio técnico requerirá su propia autoridad acotada, tests/QA proporcionales y reconciliación documental cuando cambie el estado real.
