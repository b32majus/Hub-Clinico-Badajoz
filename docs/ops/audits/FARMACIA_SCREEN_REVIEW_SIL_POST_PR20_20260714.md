# Revisión funcional Sil — Farmacia Hospitalaria post-PR20

**Archivo propuesto:** `docs/ops/audits/FARMACIA_SCREEN_REVIEW_SIL_POST_PR20_20260714.md`  
**Estado:** `pending_review`  
**Fecha de trabajo:** 2026-07-14  
**Repositorio:** `b32majus/Hub-Clinico-Badajoz`  
**Rama de referencia:** `preview/demo-lunes-wo4-20260614`  
**HEAD de referencia tras higiene menor:** `8e491f89bf90c64fd466851920e09ab3e14968e1`  
**Autora funcional:** Sil  
**Estructuración:** Cora  

---

## 0. Propósito del documento

Este documento recoge la revisión funcional, visual y estratégica realizada por Sil sobre varias pantallas de Farmacia Hospitalaria tras la auditoría técnica pantalla a pantalla de OpenCode.

No sustituye a la auditoría técnica. La complementa.

- La auditoría técnica registra qué existe, qué carga, qué falla y qué checks pasan o fallan.
- Esta revisión registra criterio asistencial, lógica de negocio, coherencia funcional, prioridades de demo/piloto y deuda de producto detectada por Sil.

Este documento no autoriza implementación, producción, uso con datos reales, integración JARA, backend, Supabase ni piloto real. Sirve como entrada para una futura auditoría reconciliada y para diseñar WOs acotadas.

---

## 1. Alcance de esta revisión

Pantallas revisadas por Sil en esta tanda:

1. Profesionales Farmacia.
2. Inicio Farmacia.
3. Validación farmacoterapéutica.
4. Primera visita FH.
5. Seguimiento FH.

Fuera de alcance en esta tanda:

- Dashboard paciente.
- Dashboard longitudinal.
- Estadísticas poblacionales.
- Arquitectura Supabase/backend.
- PROM Capture Gateway.
- Identity Plane.
- Nursing Readiness Gateway.
- Clinical Event Plane.
- Control Plane real.
- Treatment Lifecycle Engine completo.
- Repository Layer.

### Motivo para dejar dashboards fuera de esta revisión

Los dashboards dependen de decisiones posteriores sobre modelo longitudinal, eventos, múltiples líneas de tratamiento, renovaciones, switch, PROMs, trazabilidad y representación clínica. Cualquier decisión visual sobre dashboards puede condicionar indebidamente el modelo de datos y la información que debe quedar registrada. Se propone revisarlos en una WO específica posterior.

---

## 2. Principios funcionales transversales

### 2.1 No inferencia clínica

Se mantiene como regla global del proyecto:

> Nunca inferir dosis, vía, pauta, presentación, inducción, renovación, fecha de prescripción, fecha de validez, duración de tratamiento ni switch a partir del nombre del fármaco o de la aparición de un nuevo fármaco.

El catálogo CIMA/local puede ayudar a seleccionar, normalizar e identificar un fármaco, pero no decide datos terapéuticos.

### 2.2 Demo, piloto y producto futuro

La app actual puede servir para demo supervisada, pero no para piloto real. Los banners, perfiles visibles y botones no equivalen a seguridad, autenticación, autorización, trazabilidad ni responsabilidad clínica real.

### 2.3 Excel sintético como fuente de prueba preferente

Sil propone reducir progresivamente los pacientes hardcodeados en Farmacia Hospitalaria y utilizar el Excel/dataset clínico sintético como fuente principal para validar la lógica de carga, importación, estados, bandejas y pantallas.

Los datos hardcodeados fueron útiles al inicio, pero ahora pueden falsear la sensación de funcionamiento real.

### 2.4 Patologías y opciones sin contrato

No deben mantenerse opciones tipo “Otro/Otra” cuando no existe formulario, contrato de datos ni flujo validado asociado. Si una patología o indicación no está configurada, no debería poder seleccionarse como si tuviera soporte funcional.

### 2.5 Cambio de paciente / CIP

Toda pantalla con paciente cargado debe tener una política clara al introducir un CIP diferente:

1. Si hay datos del paciente actual, avisar antes de cambiar.
2. Si el nuevo CIP existe, cargar completamente el nuevo paciente.
3. Si el nuevo CIP no existe, limpiar completamente la pantalla y abrir modo nuevo paciente/manual.
4. Si el usuario cancela, mantener el paciente actual.

No debe quedar un estado parcial mezclado tipo “Frankenstein” con datos de distintos pacientes.

---

## 3. Pantalla: Profesionales Farmacia

### 3.1 Observación Sil

La pantalla actual muestra profesionales sintéticos/hardcodeados tipo “profesional 1”, “profesional 2”.

### 3.2 Criterio funcional

Sil visualiza dos fases:

#### Fase 1 — Demo/piloto inicial controlado

Mantener datos hardcodeados, pero sustituir profesionales ficticios por profesionales reales del servicio:

- Cristina Cava.
- Paula Pérez.
- Luis Carlos.

Luis Carlos, como jefe del servicio, debería aparecer como futuro administrador funcional o perfil con capacidad para gestionar altas de profesionales cuando exista control real de roles/permisos.

#### Fase 2 — Producto/piloto avanzado

Migrar esta pantalla a una fuente editable y gobernada, idealmente dentro del Control Plane:

- profesionales;
- roles;
- permisos;
- estado activo/inactivo;
- alta/baja de profesionales;
- trazabilidad de cambios;
- capacidad de gestión solo para rol autorizado.

### 3.3 Riesgo

No presentar esta pantalla como control real de permisos. Mostrar un rol visible no equivale a autenticación, autorización, firma ni responsabilidad técnica.

### 3.4 Prioridad Sil

- **P2:** sustituir profesionales ficticios por nombres reales si mejora la demo y está autorizado.
- **P3:** gestión real vía Supabase/backend/Control Plane.

### 3.5 Recomendación

No implementar CRUD ni Supabase todavía. Para la fase actual basta con decidir si se sustituyen los mocks por nombres reales y dejar claramente indicado que no existe control de permisos real.

---

## 4. Pantalla: Inicio Farmacia

### 4.1 Observación Sil

La pantalla de inicio tiene botones para cargar datos de Enfermería y datos de Farmacia, pero no se observa botón para cargar datos procedentes de servicios clínicos.

En esta fase no es crítico, porque todavía no se espera recibir información directa de servicios clínicos en ese flujo, pero debe quedar registrado como posible necesidad futura.

### 4.2 Fuente de datos: hardcoded vs Excel sintético

Sil propone retirar progresivamente los pacientes ficticios hardcodeados de la rama Farmacia Hospitalaria y hacer que el comportamiento se alimente del Excel/dataset sintético canónico.

Motivo:

- el Excel sintético permite probar continuamente la lógica real de carga;
- evita que la demo funcione solo por fallback hardcodeado;
- obliga a validar importación, normalización, estados y bandejas;
- reduce inconsistencias entre datos demo y datos importados.

### 4.3 Duplicidad de bandejas/tarjetas

Existe una sección/tarjeta de solicitudes procedentes de Enfermería o inicio biológico que se alimenta del Excel de Enfermería y funciona.

Además, existe otra tarjeta llamada “Pacientes pendientes de validación farmacéutica” que también parece indicar que se alimenta del Excel de Enfermería, pero no carga nada o queda vacía.

Esto genera duplicidad/confusión.

### 4.4 Decisión funcional propuesta

Opción preferida:

- mantener una única bandeja/tarjeta funcional de solicitudes procedentes de Enfermería/inicio biológico;
- eliminar, ocultar o redefinir la tarjeta duplicada de “Pacientes pendientes de validación farmacéutica”.

Si se mantienen ambas, deben tener significados distintos:

- una para solicitudes entrantes desde Enfermería;
- otra para validaciones farmacéuticas ya asignadas o pendientes dentro del flujo FH.

No deben decir ambas que se alimentan del mismo Excel de Enfermería si no representan estados distintos.

### 4.5 Relación con auditoría técnica

La auditoría técnica observó que, tras importar 4 registros de Enfermería y 10 de Farmacia, una zona de tarjetas pendientes quedaba en 0. La hipótesis funcional de Sil es que esto corresponde a la duplicidad de bandejas/tarjetas y a que una de ellas no está bien definida o no está funcionando.

Antes de crear un test de regresión, hay que decidir qué bandeja debe existir y cuál es el resultado esperado del Excel sintético.

### 4.6 Alta guiada desde Inicio

Cuando se introduce un CIP no registrado, la pantalla muestra una tarjeta de “Paciente no encontrado / alta guiada”.

Esto es correcto.

La tarjeta permite elegir:

- origen del paciente;
- patología;
- circuito de entrada.

Problema observado:

- al iniciar episodio, abre la pantalla correspondiente de Validación, Primera Visita o Seguimiento;
- pero no arrastra correctamente los datos que se acaban de introducir, especialmente servicio de origen y patología.

### 4.7 Criterio funcional

Todo dato introducido en alta guiada debe viajar como contexto inicial a la pantalla destino.

No significa persistencia real todavía, pero sí contexto de navegación completo.

### 4.8 Prioridad Sil

- **P1:** si la tarjeta duplicada vacía o el no arrastre de datos confunde el flujo en demo.
- **P2:** si se puede controlar por guion y no es flujo principal inmediato.

### 4.9 Recomendación

Separar en futuras WOs:

1. Definir una sola bandeja funcional o roles claros para dos bandejas distintas.
2. Corregir la propagación de contexto desde alta guiada.
3. Migrar/depender menos de pacientes hardcodeados y más del dataset sintético.

---

## 5. Pantalla: Validación farmacoterapéutica

### 5.1 Evaluación Sil

La pantalla de Validación sigue siendo la pantalla que más mezcla flujo operativo real, opciones demo/futuras, duplicidades prebiológicas y campos que no corresponden estrictamente a una validación inicial.

Necesita limpieza funcional antes de crecer.

### 5.2 Relación con auditoría técnica

La auditoría técnica indica que la integración Enfermería → Validación no tiene check verde completo. También indica que el harness/arnés de test falla por una dependencia DOM relacionada con `formServicioManual.classList`.

Interpretación funcional:

- el importador base puede estar funcionando;
- pero el test específico que protege el flujo Enfermería → Validación está desalineado con el HTML/DOM real;
- antes de corregir solo el test, hay que fijar cómo debe funcionar realmente la pantalla.

### 5.3 Origen de entrada

Opciones actuales observadas:

- Entrada manual Farmacia.
- Servicio clínico compatible futuro.
- Demo/formación.
- Desde Excel Enfermería.

Criterio Sil:

- Mantener “Entrada manual Farmacia”.
- “Servicio clínico compatible futuro” quizá no sea necesario; puede quedar temporalmente si no interfiere, pero no debe parecer funcional definitivo.
- Eliminar “Demo/formación” de una pantalla operativa.
- Eliminar “Desde Excel Enfermería” como opción manual dentro de Validación, porque si los datos vienen de Enfermería deben aparecer previamente como tarjeta en Inicio Farmacia. Desde esa tarjeta se abre Validación ya precargada.

### 5.4 Tipo de validación

Opciones funcionalmente correctas como concepto:

- Inicio de nuevo fármaco.
- Switch/cambio de tratamiento.
- Tratamiento adicional/add-on.

Pendiente:

- Renovación requiere discusión específica y probablemente no debe tratarse como una validación genérica. Pertenece a la línea de tratamiento y al futuro Treatment Lifecycle Engine.

Criterio Sil:

- Inicio de nuevo fármaco es el flujo desarrollado.
- Switch y add-on son necesarios como conceptos.
- Validación doble o multifármaco debe resolverse pronto porque es una petición funcional relevante desde Digestivo y puede ocurrir con frecuencia.
- No conviene aparcarlo demasiado porque arrastraría deuda estructural.

### 5.5 Validación doble / multifármaco

Criterio funcional propuesto:

- Una validación farmacéutica puede entenderse como un acto.
- Dentro de ese acto puede haber una o varias líneas de tratamiento.
- Cada línea debe tener su propio bloque mínimo estructurado.

Cada línea debería incluir, al menos:

- servicio de origen;
- patología/indicación;
- fármaco solicitado;
- inducción solicitada;
- dosis/pauta/vía/presentación si vienen explícitamente de la solicitud o son registradas por el profesional;
- resultado de validación;
- observaciones específicas;
- salida estructurada propia.

No se recomienda un campo suelto de “otro fármaco” sin repetir el bloque mínimo de solicitud/validación. Eso mezclaría tratamientos y perdería trazabilidad.

### 5.6 Servicio y patología

La selección manual servicio/patología es adecuada.

Corrección detectada:

- En Reumatología falta **Sjögren** en el desplegable de patología.

Dermatología está más desarrollada y debe contrastarse con la plantilla ya validada por Farmacia:

- `plantilla_solicitud_dermatologia.html`

### 5.7 Tratamiento solicitado

La sección “Tratamiento solicitado” es correcta.

Faltan o requieren corrección:

- el autocomplete debe funcionar en “fármaco solicitado”;
- debe añadirse el campo “inducción solicitada”.

Criterio crítico:

- el autocomplete CIMA/local puede ayudar a seleccionar y normalizar;
- puede mostrar identificadores de catálogo y, si procede, código nacional/presentación seleccionada;
- no debe inferir dosis, vía, pauta, presentación prescrita ni inducción;
- todo dato terapéutico debe venir de la solicitud, de la importación o de entrada profesional explícita.

### 5.8 Analítica y vacunación

Problema visual-funcional:

- Los chips actuales incluyen icono/check interno redundante.
- Si el chip ya expresa estado, el icono puede eliminarse.

Propuesta de color por estado:

- Verde:
  - hemograma/bioquímica verificados;
  - Mantoux negativo;
  - Mantoux positivo tratado;
  - serologías negativas;
  - vacunación realizada/completa.
- Rojo:
  - serología positiva;
  - no vacunado/no realizada cuando sea relevante;
  - hallazgo que exige atención.
- Naranja:
  - pendiente;
  - revisar;
  - no completado.

Matiz:

- “Positivo tratado” debe mostrarse explícitamente como tal, no solo como “positivo” en verde.

### 5.9 Datos clínicos de origen

Sección correcta.

Representa información procedente de la orden clínica o petición médica que Farmacia revisa/copia.

### 5.10 Tratamiento validado

La sección funciona razonablemente bien.

Duda principal:

- la opción “otro fármaco” dentro de tratamiento validado no debería mantenerse como campo simple si cada fármaco requiere validación independiente.

Debe resolverse con el modelo de validación multifármaco descrito en la sección 5.5.

### 5.11 Prebiológico duplicado

Existe una sección posterior de estudio prebiológico redundante con la sección previa de analítica/vacunación.

Criterio Sil:

- eliminar la segunda sección redundante de estudio prebiológico;
- conservar, si procede:
  - fecha de cita en Farmacia;
  - observaciones farmacoterapéuticas.

### 5.12 Farmacéutico responsable

La tarjeta de “farmacéutico responsable / profesional X” no aporta si el perfil de sesión ya está cargado.

Criterio:

- no hace falta una tarjeta grande;
- debe guardarse/mostrarse discretamente como usuario de sesión o responsable de registro;
- no debe sugerir firma real o responsabilidad técnica si no hay autenticación/permiso real.

### 5.13 Exportación

Eliminar el título o bloque visual “Exportación” si no aporta.

Mantener botones:

- Copiar texto para JARA.
- Copiar fila Excel FH.

Recordatorio:

- copiar texto para JARA es portapapeles manual;
- no es integración JARA.

### 5.14 Apertura desde tarjeta Enfermería

Cuando Validación se abre desde una tarjeta generada por Excel Enfermería:

- tratamiento solicitado debe precargarse desde Excel Enfermería;
- tratamiento validado por Farmacia debería precargarse con esa información cuando proceda;
- todo lo precargado debe ser editable por Farmacia;
- Farmacia debe poder corregir errores de captura o interpretación de Enfermería;
- lo ausente debe quedar vacío/pendiente;
- no debe inferirse información terapéutica.

### 5.15 Prioridades Sil

- **P1:** limpiar origen de entrada, redundancias, prebiológico duplicado y flujo Enfermería → Validación.
- **P1:** definir soporte mínimo de validación doble/multifármaco para no arrastrar deuda.
- **P1/P2:** autocomplete de fármaco solicitado y campo inducción solicitada.
- **P2:** semántica visual de chips.
- **P2:** simplificar exportación y farmacéutico responsable.
- **P3:** renovación dentro de Treatment Lifecycle Engine.

---

## 6. Pantalla: Primera visita FH

### 6.1 Evaluación Sil

La pantalla funciona razonablemente bien cuando se accede desde un paciente ya validado: precarga tratamiento, permite registrar primera visita y los bloques principales tienen sentido.

Los problemas principales son:

- exceso de mensajes redundantes;
- tarjeta de tratamiento validado demasiado cargada;
- comportamiento inseguro al cambiar de CIP;
- opciones sin contrato en modo manual.

### 6.2 Cabecera y textos redundantes

Sobran:

- texto explicativo bajo el título “Primera visita”;
- tarjeta/banda azul tipo “busca primero un paciente por CIP o accede desde Quick View”;
- botón “ir al buscador de Farmacia”.

Motivo:

- el buscador ya está visible en el sidebar;
- el primer campo de la pantalla ya permite buscar paciente por CIP;
- la pantalla repite la misma instrucción demasiadas veces.

### 6.3 Tarjeta de tratamiento validado por Farmacia

La tarjeta carga información, pero contiene datos que no aportan o son redundantes.

Elementos a eliminar/revisar:

- “Relación terapéutica: validado” → no aporta.
- “Origen del catálogo: primera visita” → no aporta o está mal rotulado.
- Mini bloque “Resumen” dentro de una tarjeta que ya es resumen → redundante.
- “Estado: validado principal” → probablemente no aporta porque si llega a primera visita debe estar validado.

### 6.4 Código nacional / número de registro

Ahora aparece “Código nacional / número de registro”, pero no son lo mismo.

Criterio Sil:

- Si se muestra, dejar solo “Código nacional”.
- Debe precargarse desde CIMA cuando el fármaco se haya seleccionado desde catálogo.

Matiz posterior detectado desde Seguimiento:

- Sí puede tener sentido mostrar “origen de catálogo” si distingue correctamente CIMA vs catálogo local FH.
- No debe mostrarse “origen del catálogo: primera visita”.

### 6.5 Registro de primera visita

Está correcto:

- fecha de primera visita;
- inducción;
- nivel de estratificación;
- PROMs basales;
- EVA dolor;
- EVA prurito;
- notas farmacoterapéuticas.

### 6.6 Estratificación CMO-SEFH

Propuesta Sil:

Añadir en la parte superior derecha de la tarjeta “Registro de primera visita” un botón o enlace a la herramienta de estratificación CMO de la SEFH:

<https://ramonmorillo.github.io/hub-estratificacionCMO/>

Criterio:

- El Hub no calcula automáticamente la estratificación.
- El profesional accede al recurso externo, realiza la estratificación y registra aquí el nivel resultante.
- El botón debe decir algo como “Abrir herramienta CMO-SEFH”, no “Calcular automáticamente”.

### 6.7 PROMs basales / DLQI

La lógica de “PROMs recogidos: sí/no” funciona correctamente.

Mejora propuesta:

El badge/tarjeta DLQI no debe estar siempre verde. Debe cambiar color/estado según los puntos de corte:

| Puntuación DLQI | Interpretación |
|---:|---|
| 0–1 | Sin efecto |
| 2–5 | Efecto leve |
| 6–10 | Efecto moderado |
| 11–20 | Efecto grave |
| 21–30 | Efecto muy grave |

Eliminar la frase:

> “Responda todas las preguntas para ver la interpretación”

Motivo: es obvia y añade ruido.

El color no debe sustituir al texto. La categoría debe estar siempre escrita.

### 6.8 PROMs por patología

Actualmente se despliegan PROMs asociados a Hidradenitis porque son los únicos registrados.

Evolución futura:

- los PROMs deben cargarse según la patología asociada al paciente;
- HS puede mantener DLQI/EVA dolor/EVA prurito;
- otras patologías necesitarán sus instrumentos propios validados.

No implementar un motor de PROMs dinámico en esta WO.

### 6.9 Primera visita manual para CIP no registrado

El flujo tiene sentido para pacientes que ya están en el servicio cuando empieza a usarse la herramienta.

#### Servicio de origen

Opciones actuales incluyen:

- Dermatología.
- Reumatología.
- Digestivo.
- Alergia.
- Farmacia Hospitalaria.
- Oncología.
- Otro.

Criterio Sil:

- eliminar “Farmacia Hospitalaria” como servicio de origen;
- eliminar “Otro”.

Farmacia no debería ser servicio clínico origen de una primera visita farmacoterapéutica. “Otro” abre flujos sin contrato.

#### Patologías

Eliminar “Otra” de todos los desplegables de patología.

Si una patología no está configurada, no debe poder seleccionarse porque no tendrá formulario ni contrato asociado.

Por servicio:

- Dermatología: mantener patologías configuradas.
- Reumatología: mantener las configuradas, incluyendo Sjögren donde aplique.
- Digestivo: Crohn y colitis ulcerosa; eliminar “otra”.
- Alergia: urticaria crónica espontánea; eliminar “otra”.
- Oncología: desplegable pendiente de construir; no dejar “indicación oncológica” como si estuviera resuelto.

### 6.10 Cambio de CIP / estado Frankenstein

Hallazgo importante:

Si la pantalla tiene datos precargados de un paciente y se introduce otro CIP:

- si el CIP existe, debería cargar completamente el nuevo paciente;
- si el CIP no existe, debería limpiar completamente la pantalla y preparar una primera visita manual;
- actualmente puede hacer una mezcla parcial y dejar algunas respuestas antiguas.

Esto es un riesgo funcional transversal.

### 6.11 Prioridades Sil

- **P1:** cambio/limpieza de contexto de paciente al introducir nuevo CIP.
- **P1/P2:** eliminar opciones sin contrato (“Otro”, Farmacia como origen).
- **P2:** limpiar textos redundantes y tarjeta de tratamiento.
- **P2:** DLQI con interpretación por umbrales.
- **P2:** enlace CMO-SEFH.
- **P3:** PROMs dinámicos por patología.

---

## 7. Pantalla: Seguimiento FH

### 7.1 Evaluación Sil

La pantalla de Seguimiento tiene una base funcional buena:

- precarga datos del paciente registrado;
- muestra tratamiento actual;
- muestra adherencia;
- muestra últimos PROMs;
- muestra efectos adversos previos;
- permite registrar evolución;
- permite registrar adherencia;
- permite recoger PROMs de seguimiento;
- permite registrar efectos adversos;
- permite calcular algoritmos de causalidad;
- deja la causalidad final a decisión farmacéutica.

No obstante, necesita ordenar:

1. contexto de paciente/tratamiento;
2. duplicidad de bloques;
3. múltiples tratamientos activos;
4. semántica de movimiento terapéutico;
5. registros de tratamiento previo vs inicio de nuevo fármaco.

### 7.2 Relación con auditoría técnica

La auditoría técnica indica deuda funcional porque no existe ciclo real de aprobación, renovación o validez. Esto se asume como parte pendiente del futuro Treatment Lifecycle Engine.

También recomienda una WO clínica para validar la semántica de movimiento y causalidad, sin automatizar decisiones.

Interpretación Sil/Cora:

- movimiento terapéutico = qué ocurre con una línea de tratamiento durante la visita;
- causalidad = cómo se evalúa y registra un efecto adverso;
- antes de automatizar consecuencias, hay que decidir qué significa cada opción.

### 7.3 Cabecera y ayuda redundante

Igual que en Primera Visita, sobran:

- texto explicativo bajo el título;
- banda/tarjeta “busca primero un paciente por CIP”;
- botón “ir al buscador”.

### 7.4 Precarga y duplicidad del tratamiento

Cuando se busca un CIP registrado, la información previa precarga bien, pero aparece duplicada:

- por un lado, campos iniciales que deberían autocompletarse;
- por otro, una tarjeta/resumen de tratamiento validado.

Criterio Sil:

- dejar los campos originales del formulario y que se autocompleten;
- eliminar o reducir la tarjeta duplicada.

### 7.5 Datos residuales sin paciente cargado

Aparecen datos previos en campos como:

- código nacional;
- número de registro;
- etiqueta;

incluso sin paciente precargado.

Esto parece parte del problema transversal de limpieza de estado/Frankenstein.

Debe corregirse como P1.

### 7.6 Código nacional, número de registro, etiquetas y origen del catálogo

Criterio Sil:

- Código nacional: puede ser útil.
- Número de registro: sobra en esta pantalla.
- Etiquetas tipo “hospitalario”: no aportan claramente.
- Origen del catálogo sí puede tener sentido si distingue CIMA frente a catálogo local de Farmacia.

Esto permite contemplar:

- fármacos CIMA;
- fármacos de catálogo local;
- fármacos de ensayo clínico;
- uso compasivo;
- medicación extranjera;
- preparación especial;
- otros casos gestionados por Farmacia.

Aplicación transversal:

- revisar también cómo se muestra origen de catálogo en Validación y Primera Visita.

### 7.7 Últimos PROMs

La precarga funciona, pero la visualización debería mejorar.

Propuesta Sil:

- desdoblar últimos PROMs en chips/campos separados;
- un chip por PROM recogido;
- color/estado según umbrales o interpretación clínica;
- no usar un único campo compacto que mezcle todo.

### 7.8 Tarjeta “principio activo CIMA”

Inicialmente parece repetitiva, pero tiene sentido cuando el paciente tiene más de un tratamiento activo.

Criterio:

- si el paciente tiene un único tratamiento activo, no hace falta una tarjeta adicional redundante;
- si tiene varios tratamientos activos, debe haber una mini tarjeta por cada línea activa.

Cada mini tarjeta debería mostrar, como mínimo:

- fármaco;
- principio activo;
- origen catálogo: CIMA/local;
- presentación si está confirmada;
- dosis/pauta/vía si están confirmadas;
- fecha de inicio si existe;
- estado de la línea;
- servicio/patología asociado.

Esto es relevante para seguridad farmacoterapéutica.

### 7.9 Tipo de movimiento terapéutico

Opciones actuales:

- sin cambios;
- optimización;
- tratamiento añadido;
- cambio terapéutico;
- suspensión;
- revisión de línea.

Criterio Sil:

- “Revisión de línea” no aporta o debe redefinirse;
- probablemente debería eliminarse;
- si no hay cambio, ya existe “sin cambios”.

Criterio funcional:

El movimiento terapéutico debe representar el resultado de la visita, no ser un dato decorativo.

Cada opción debe tener significado:

- Sin cambios → seguimiento sin modificar línea.
- Optimización → modificación de dosis/pauta/frecuencia u otra estrategia, con motivo.
- Tratamiento añadido → creación/activación de otra línea de tratamiento, con validación adecuada.
- Cambio terapéutico/switch → cierre de línea anterior y creación de nueva línea.
- Suspensión → cierre o pausa de línea con motivo.

No inferir switch porque aparezca un nuevo fármaco.

### 7.10 Evolución farmacoterapéutica

Funcionan o tienen sentido:

- fecha de seguimiento;
- cambio de nivel de estratificación;
- requiere optimización;
- requiere suspensión;
- cuestionario de adherencia;
- evaluación de efectos adversos;
- causalidad con Naranjo/Karch-Lasagna;
- causalidad final farmacéutica.

Añadir, como en Primera Visita, enlace a la herramienta CMO-SEFH junto al nivel de estratificación:

<https://ramonmorillo.github.io/hub-estratificacionCMO/>

El botón debe formularse como acceso externo, no cálculo automático.

### 7.11 PROMs de seguimiento

Criterio Sil:

En lugar de mostrar directamente opciones concretas tipo DLQI/EVA, el desplegable debería ser:

- No recogidos.
- Sí, recoger.

Si se elige “Sí, recoger”, entonces se despliegan los PROMs correspondientes a la patología.

Esto evita hardcodear HS como si fuera universal.

### 7.12 Efectos adversos y causalidad

El flujo está bien planteado:

1. No consta / No / Sí.
2. Si Sí, aparecen gravedad, si se ha solucionado y cómo se ha corregido.
3. Fármaco sospechoso seleccionable, especialmente importante si hay más de un tratamiento activo.
4. Algoritmos de causalidad se responden y se calculan.
5. Farmacia decide la causalidad final farmacéutica.

Criterio:

- Naranjo y Karch-Lasagna son apoyo al registro/evaluación;
- no sustituyen la decisión profesional final.

### 7.13 Exportación

Mismo criterio que en Validación y Primera Visita:

- eliminar bloque/título visual “Exportación” si no aporta;
- dejar botones:
  - Copiar texto para JARA;
  - Copiar fila Excel FH.

Recordatorio:

- copia manual, no integración JARA.

### 7.14 CIP no registrado y tratamiento actual

Cuando entra un CIP no registrado, el autocomplete de tratamiento actual funciona bien.

Problema:

- aparece una sección “otro fármaco biológico”.

Criterio Sil:

- ningún fármaco nuevo debería iniciarse desde Seguimiento saltándose Validación;
- pero sí debe poder registrarse un tratamiento activo previo cuando el Hub empieza a usarse en pacientes que ya están en seguimiento.

Distinción necesaria:

No:

> Añadir nuevo fármaco desde seguimiento.

Sí:

> Registrar tratamiento activo previo / línea existente.

### 7.15 Paciente FH-004 multibiológico

El paciente FH-004 sirve como caso demo de varios biológicos, pero actualmente vive como dato hardcodeado.

Criterio Sil:

- mover FH-004 y sus líneas múltiples al Excel/dataset clínico sintético;
- reducir dependencia de hardcoded demo.

### 7.16 Prioridades Sil

**P1:**

- limpiar estado residual / Frankenstein de CIP;
- eliminar duplicidad de tratamiento si confunde registro;
- arrastrar correctamente datos de alta guiada;
- definir mínimo seguro para múltiples tratamientos activos;
- no permitir iniciar nuevo fármaco desde Seguimiento saltándose Validación.

**P2:**

- limpiar cabecera y banda de ayuda;
- mejorar visualización de PROMs;
- quitar número de registro/etiquetas no útiles;
- añadir enlace CMO-SEFH;
- simplificar bloque de exportación.

**P3:**

- PROMs dinámicos por patología;
- motor real de líneas de tratamiento;
- Treatment Lifecycle completo;
- renovación/validez/ciclos.

---

## 8. Hallazgos transversales derivados de la revisión Sil

### 8.1 P1 transversales

1. Cambio de CIP / limpieza completa de contexto.
2. Alta guiada no arrastra correctamente servicio/patología/circuito.
3. Duplicidad de tarjetas/bloques de tratamiento.
4. Validación doble/multifármaco mal modelada si se mantiene como “otro fármaco”.
5. Validación tiene secciones redundantes.
6. Seguimiento no debe iniciar fármacos nuevos saltándose Validación.
7. Pacientes y casos hardcodeados empiezan a generar falsos positivos de funcionamiento.

### 8.2 P2 transversales

1. Limpieza visual/copy en cabeceras y bandas de ayuda.
2. Chips de prebiológico y PROMs con colores semánticos.
3. DLQI por umbrales.
4. Enlace externo a herramienta CMO-SEFH.
5. Profesionales reales hardcodeados temporalmente, si se aprueba.
6. Eliminar “Otro/Otra” donde no hay contrato.
7. Simplificar bloques de exportación.

### 8.3 P3 transversales

1. Supabase/control plane.
2. PROMs dinámicos por patología.
3. Treatment Lifecycle completo.
4. Backend real.
5. Permisos reales.
6. Dashboards longitudinales definitivos.
7. Repository Layer.

---

## 9. WOs candidatas derivadas

Estas WOs no deben ejecutarse automáticamente. Requieren reconciliación previa con la auditoría técnica de OpenCode y decisión Sil/Cora.

### 9.1 `WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01`

**Objetivo:** resolver el problema transversal de cambio de CIP y estado Frankenstein.

Alcance esperado:

- Primera Visita.
- Seguimiento.
- Validación si aplica.
- Inicio/alta guiada si aplica.

Criterio:

- si cambia CIP, confirmar;
- si existe, cargar completo;
- si no existe, limpiar completo;
- no conservar datos residuales.

### 9.2 `WO-FH-START-GUIDED-CONTEXT-PROPAGATION-01`

**Objetivo:** asegurar que la alta guiada desde Inicio arrastra servicio, patología y circuito a la pantalla destino.

### 9.3 `WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-SIL-01`

**Objetivo:** limpiar Validación como pantalla operativa.

Incluir:

- origen de entrada;
- eliminación demo/formación;
- eliminación “desde Excel Enfermería” como selector manual si procede;
- prebiológico duplicado;
- farmacéutico responsable;
- exportación;
- autocomplete fármaco solicitado;
- inducción solicitada;
- Sjögren en Reuma.

### 9.4 `WO-FH-MULTILINE-VALIDATION-CONTRACT-01`

**Objetivo:** definir contrato mínimo para validación doble/multifármaco.

No implementar lógica avanzada sin cerrar:

- qué es acto de validación;
- qué es línea de tratamiento;
- qué campos se repiten por línea;
- cómo se exporta;
- cómo se refleja en primera visita/seguimiento.

### 9.5 `WO-FH-HARDCODED-DEMO-DATA-TO-SYNTHETIC-EXCEL-01`

**Objetivo:** migrar casos hardcodeados relevantes, incluido FH-004 multibiológico, al Excel/dataset clínico sintético.

### 9.6 `WO-FH-FIRSTVISIT-SEGUIMIENTO-COPY-VISUAL-CLEANUP-01`

**Objetivo:** limpiar subtítulos, bandas redundantes, exportación visual y tarjetas resumen en Primera Visita y Seguimiento.

### 9.7 `WO-FH-PROMS-THRESHOLDS-AND-PATHOLOGY-PLACEHOLDER-01`

**Objetivo:** mejorar DLQI por umbrales y dejar preparado el criterio de PROMs por patología, sin crear todavía un motor completo.

### 9.8 `WO-FH-FOLLOWUP-MOVEMENT-SEMANTICS-01`

**Objetivo:** validar semántica de movimientos terapéuticos y causalidad.

Decidir:

- si “revisión de línea” se elimina;
- qué implica optimización;
- qué implica tratamiento añadido;
- qué implica switch;
- qué implica suspensión;
- cómo se conserva la decisión final profesional en causalidad.

### 9.9 `WO-FH-CATALOG-SOURCE-LABELS-CIMA-LOCAL-01`

**Objetivo:** unificar cómo se muestra el origen del fármaco: CIMA vs catálogo local FH.

Evitar:

- “origen del catálogo: primera visita”;
- etiquetas genéricas sin valor funcional;
- confusión entre código nacional y número de registro.

### 9.10 `WO-FH-DASHBOARD-REVIEW-DEFERRED-01`

**Objetivo:** revisar dashboards en una fase posterior, con modelo longitudinal, líneas de tratamiento y eventos mejor definidos.

---

## 10. Recomendación de secuencia

No implementar todavía cambios funcionales complejos.

Secuencia propuesta:

1. Subir este documento como revisión funcional Sil.
2. Reconciliarlo con la auditoría técnica de OpenCode.
3. Crear auditoría reconciliada y backlog priorizado.
4. Ejecutar primero P1 transversales que reducen riesgo de mezcla de datos y confusión:
   - cambio de CIP / limpieza de contexto;
   - alta guiada y propagación de contexto;
   - validación funcional limpia;
   - contrato multifármaco mínimo.
5. Después ejecutar limpieza visual/copy P2.
6. Dejar dashboards, PROMs dinámicos, Treatment Lifecycle, backend, Supabase y Control Plane real para fases posteriores.

---

## 11. Resumen ejecutivo para decisión

La revisión de Sil confirma que Farmacia Hospitalaria es válida como demo supervisada, pero necesita una limpieza funcional antes de seguir añadiendo capas nuevas.

Las prioridades no son estéticas únicamente. Las más importantes son de coherencia de flujo:

- evitar mezcla de pacientes al cambiar CIP;
- eliminar duplicidades que confunden qué bloque manda;
- asegurar que el alta guiada arrastra contexto;
- no permitir que Seguimiento inicie fármacos nuevos saltándose Validación;
- modelar validación múltiple de forma estructurada porque es una necesidad real;
- reducir dependencia de hardcoded demo;
- no presentar como reales capacidades que son futuras.

Este documento debe usarse como entrada para la auditoría reconciliada post-PR20, no como orden directa de implementación.
