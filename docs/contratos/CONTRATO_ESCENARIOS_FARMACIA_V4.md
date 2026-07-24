# Contrato de escenarios sintéticos — PROMueve Farmacia V4

**Estado:** contrato canónico propuesto para el rescate V4  
**Fecha:** 2026-07-24  
**WO:** `WO-DOC-FH-SCENARIO-CONTRACT-V4-01`  
**Issue:** #63  
**Plan rector:** [`docs/ops/PLAN_MAESTRO_RESCATE_FARMACIA_V4_20260724.md`](/docs/ops/PLAN_MAESTRO_RESCATE_FARMACIA_V4_20260724.md)  
**Base publicada de referencia:** `preview/demo-lunes-wo4-20260614` en `ddbcf85bdb693e600315a2520a0f7a38e08ffc39`

---

## 1. Propósito

Este contrato define las historias sintéticas mínimas que PROMueve Farmacia V4 debe ser capaz de representar y recorrer antes de recuperar funcionalidad avanzada.

Su función es impedir que una futura migración de Excel, JSON, runtime, modelo de datos, backend o UI conserve únicamente estructura y conteos mientras pierde las historias asistenciales que dan sentido a la aplicación.

Una funcionalidad no se considerará demostrada porque:

- exista una fila en un Excel;
- exista un objeto en JSON;
- exista una función en código;
- renderice una tarjeta;
- pase un test de shape;
- pueda fabricarse manipulando DOM, `sessionStorage`, propiedades `readonly` o estados imposibles.

Debe demostrarse mediante una interacción soportada y con el resultado clínico-funcional esperado.

---

## 2. Principios de seguridad clínica

En todos los escenarios se aplican estas invariantes:

1. El catálogo identifica y ayuda a seleccionar; no decide terapia.
2. No se infieren dosis, vía, pauta, presentación, inducción, duración o fecha de inicio desde el nombre del fármaco, CIMA, catálogo, tratamiento previo, bandeja o dato ausente.
3. Tratamiento solicitado no equivale a tratamiento validado.
4. Tratamiento validado no equivale a tratamiento iniciado.
5. Tratamiento previo no equivale a iniciar un tratamiento nuevo.
6. Una línea histórica no se reactiva por selección, carga o fallback.
7. Seguimiento no crea solicitud, validación, switch, add-on o renovación.
8. Los datos ausentes permanecen vacíos, desconocidos o pendientes.
9. Ningún escenario usa datos reales ni identificadores reales.
10. Los resultados de Naranjo o Karch-Lasagna son ayudas de registro, no decisiones automáticas.

---

## 3. Requisitos de cada escenario

Todo escenario canónico deberá declarar:

| Campo | Requisito |
|---|---|
| `scenario_id` | Identidad estable S01–S12. |
| `patient_id` | Identidad sintética estable. |
| CIP sintético | Identificador visible no real y estable. |
| Fuente | Enfermería, servicio clínico, captura manual FH, importación FH o pre-Hub. |
| Estado inicial | Situación antes de cualquier interacción. |
| Hechos explícitos | Datos realmente presentes y declarados. |
| Ausencias deliberadas | Campos que deben permanecer vacíos. |
| Pantallas | Rutas por las que debe pasar. |
| Acciones soportadas | Clics, selección, búsqueda, guardado o exportación permitidos. |
| Resultado esperado | Estado posterior a cada acción. |
| Acciones bloqueadas | Lo que nunca debe habilitarse. |
| Persistencia | Qué debe restaurarse al recargar. |
| Exportación | Qué debe aparecer y qué debe quedar vacío. |
| Evidencia | Test de modelo, Playwright, QA manual u otra evidencia válida. |

---

## 4. Escenarios obligatorios

## S01 — Solicitud prebiológica bloqueada

### Historia

Paciente procedente de Enfermería con solicitud explícita de tratamiento y una alteración que impide avanzar a Validación.

### Fuente de referencia

Arquetipo equivalente al Paciente B del Excel sintético de Enfermería:

- servicio: Dermatología;
- patología: hidradenitis supurativa;
- fármaco solicitado: Adalimumab;
- analítica o prueba prebiológica: alterada/bloqueante;
- estado: `BLOQUEADO`.

### Debe demostrar

- aparece en la bandeja de Enfermería;
- muestra el elemento bloqueante explícito;
- no ofrece acceso como solicitud lista para Validación;
- no crea acto de validación;
- no crea línea terapéutica;
- no aparece como candidato a Primera Visita o Seguimiento.

### Aserciones negativas

- no autovalidación;
- no línea activa;
- no fecha de inicio;
- no dosis, vía, pauta o presentación inferidas.

---

## S02 — Solicitud en vigilancia

### Historia

Paciente con prebiológico incompleto o Medicina Preventiva pendiente, sin bloqueo definitivo y sin estado listo para Farmacia.

### Debe demostrar

- aparece en la bandeja de Enfermería;
- estado visible `En vigilancia`;
- pendientes explícitos visibles;
- no se confunde con `OK FARMACIA`;
- no habilita Validación;
- una importación posterior actualiza el mismo paciente sin duplicarlo.

### Aserciones negativas

- `PENDIENTE`, `NO PRECISA`, `NEGATIVO` y `OK` no se reinterpretan entre sí;
- no se fabrica un resultado clínico por normalización de texto.

---

## S03 — Enfermería lista para Validación

### Historia

Paciente con prebiológico completo y estado explícito `OK FARMACIA`.

### Fuente de referencia

Arquetipo equivalente al Paciente C:

- CIP sintético: `000000003`;
- servicio: Reumatología;
- patología: artritis reumatoide;
- fármaco solicitado: Upadacitinib;
- prebiológico: completo;
- estado: `OK FARMACIA`;
- fecha de aptitud: explícita.

El Excel de referencia no aporta dosis, vía, pauta, presentación ni inducción.

### Debe demostrar

- aparece solo en la bandeja de Enfermería;
- ofrece acceso a Validación;
- abre Validación con paciente, servicio, patología, origen y fármaco solicitado;
- conserva vacíos los datos terapéuticos ausentes;
- permite completarlos manualmente;
- el catálogo puede identificar el fármaco sin escribir la terapia.

### Aserciones negativas obligatorias

```text
dosis = vacío
vía = vacío
pauta = vacío
presentación = vacío
inducción = vacío
resultado de validación = no decidido
línea activa = inexistente
```

---

## S04 — Solicitud general no procedente de Enfermería

### Historia

Solicitud pendiente importada desde un servicio clínico o capturada manualmente por Farmacia, sin estado de preparación Enfermería.

### Debe demostrar

- aparece en la bandeja general;
- no aparece en la bandeja Enfermería;
- conserva su origen explícito;
- puede abrir Validación;
- no recibe artificialmente un estado `vigilancia`, `bloqueado` u `OK FARMACIA`.

### Aserción estructural

Las bandejas Enfermería y general son excluyentes para una misma solicitud.

---

## S05 — Validación pendiente

### Historia

Farmacia abre una solicitud y guarda el resultado como `Pendiente`.

### Debe demostrar

- resultado visible pendiente;
- restauración posterior como pendiente;
- exportación con estado pendiente;
- no creación de línea;
- no habilitación de Primera Visita o Seguimiento.

### Aserciones negativas

- no default a validado;
- no `line_id` producido;
- no fecha de inicio;
- no tratamiento activo.

---

## S06 — Validación denegada

### Historia

Farmacia registra explícitamente `Denegado` y un motivo.

### Debe demostrar

- resultado denegado visible;
- motivo preservado;
- exportación denegada;
- no producción de línea;
- no acceso a Primera Visita o Seguimiento.

### Invariante

Un acto pendiente o denegado no puede contener `produced_line_id`.

---

## S07 — Validado, pendiente de inicio

### Historia

Solicitud validada correctamente, pero el paciente todavía no ha iniciado tratamiento.

### Estado canónico

```text
validated_not_started
```

### Debe demostrar

- línea visible con identidad estable;
- estado textual `Validado · pendiente de inicio`;
- acceso posible a Primera Visita;
- Seguimiento bloqueado;
- ausencia de fecha de inicio salvo dato explícito;
- persistencia al recargar.

### Aserciones negativas

- validado no equivale a activo;
- la carga del paciente no activa la línea;
- el catálogo no activa la línea;
- seleccionar la línea no activa la línea.

---

## S08 — Inicio confirmado en Primera Visita

### Historia

El paciente llega a Primera Visita con una línea `validated_not_started`. Farmacia confirma explícitamente el inicio.

### Transición permitida

```text
validated_not_started -> active
```

### Datos mínimos

- `patient_id`;
- `line_id`;
- confirmación explícita de inicio;
- fecha real de inicio;
- profesional demo responsable.

### Debe demostrar

- la transición requiere una acción soportada;
- se mantiene el mismo `line_id`;
- no se crea una segunda línea;
- queda registrada la fecha real;
- Seguimiento pasa a estar habilitado;
- exportación refleja la fecha real.

### Aserciones negativas

- no activación silenciosa;
- no activación por búsqueda;
- no activación por importación;
- no activación por nombre de fármaco.

---

## S09 — Seguimiento de una línea activa

### Historia

Paciente con una única línea activa y seguimiento ordinario.

### Debe demostrar

- selección por `patient_id + line_id`;
- Morisky, PROMs, EA y movimientos ligados a la línea;
- borrador restaurado para esa misma línea;
- JARA, CSV y Excel consumen el mismo contexto;
- sin línea activa válida no se exporta;
- cambiar de paciente limpia el contexto anterior.

### Aserciones negativas

- no selección por nombre de fármaco;
- no selección por posición en array;
- no creación de nueva solicitud o validación desde Seguimiento.

---

## S10 — Línea histórica sin reactivación

### Historia

Paciente con una línea histórica o suspendida y, opcionalmente, otra línea actual.

### Debe demostrar

- la línea histórica es visible;
- no es seleccionable como línea activa de Seguimiento;
- no habilita exportación de Seguimiento;
- no se usa como fallback `lines[0]`;
- puede mostrarse como tratamiento previo cuando proceda.

### Aserciones negativas

- no reactivación por selección;
- no reactivación por carga;
- no reactivación por catálogo;
- no conversión automática a línea activa.

---

## S11 — Varias líneas activas o relacionadas

### Historia

Paciente con, al menos:

- una línea principal activa;
- una línea relacionada activa;
- una línea histórica.

Este escenario demuestra representación segura de varias líneas existentes. No demuestra todavía switch o add-on completos.

### Debe demostrar

- tarjetas y estados separados;
- identidad propia de cada línea;
- selección explícita;
- borradores independientes;
- PROMs, adherencia, EA y causalidad aislados;
- exportaciones asociadas a la línea seleccionada;
- ninguna línea se elige por posición o primera coincidencia.

### Aserciones negativas

- principal no significa automáticamente única;
- concomitante no significa add-on validado;
- una línea histórica no contamina los datos de la activa.

---

## S12 — Cambio de paciente con datos sin guardar

### Historia

Una pantalla tiene el paciente A cargado y datos manuales modificados. El usuario busca otro CIP.

### Debe demostrar

- aviso antes del cambio;
- cancelar conserva paciente y datos;
- aceptar limpia el estado anterior;
- el nuevo paciente se carga completo;
- CIP desconocido abre contexto neutral o manual limpio;
- no sobreviven datos de la persona anterior.

### Cobertura mínima

- Validación;
- Primera Visita;
- Seguimiento;
- dashboard, si permite cambio de paciente.

### Aserciones negativas

No pueden sobrevivir al cambio:

- dosis o pauta;
- línea seleccionada;
- PROMs;
- EA;
- causalidad;
- observaciones;
- contenido exportable.

---

## 5. Escenarios posteriores no bloqueantes del primer rescate

## S13 — Switch

Secuencia mínima futura:

```text
línea origen activa
-> solicitud explícita de switch
-> validación
-> línea destino validated_not_started
-> inicio explícito de destino
-> origen suspendida o histórica
```

No puede derivarse de que aparezca un fármaco nuevo.

## S14 — Add-on

Secuencia mínima futura:

```text
línea base activa
-> solicitud explícita de adición
-> validación
-> línea adicional validated_not_started
-> inicio explícito
-> línea base continúa activa
```

Debe conservar `base_line_id`.

## S15 — Suspensión

Movimiento explícito sobre una línea activa, con fecha y motivo.

## S16 — Optimización

Movimiento sobre la misma línea, sin crear línea nueva y sin escribir una pauta desde catálogo.

## S17 — Renovación

Fuera del rescate inicial. Necesita contrato de ciclo, validez, fechas, responsabilidad y reglas temporales.

---

## 6. Contrato de paridad para migraciones

Toda sustitución de Excel, JSON, runtime, modelo de datos, backend o UI deberá superar esta paridad.

## 6.1 Paridad de identidad

Por escenario deben conservarse:

- `scenario_id`;
- `patient_id` o mapeo explícito;
- CIP sintético;
- `line_id`, cuando exista;
- origen y servicio.

Si cambian los identificadores, debe existir un mapeo versionado:

```text
escenario anterior -> escenario nuevo equivalente
```

## 6.2 Paridad de historia

Debe conservarse:

- estado inicial;
- solicitudes;
- actos de validación;
- líneas;
- movimientos;
- visitas;
- PROMs;
- EA;
- datos deliberadamente ausentes.

## 6.3 Paridad de comportamiento

Por pantalla debe declararse:

| Dimensión | Estado esperado |
|---|---|
| Visible | Qué debe mostrarse. |
| Interactuable | Qué acción puede realizarse. |
| Editable | Qué campos son editables. |
| Bloqueado | Qué acción no puede ejecutarse. |
| Persistido | Qué se guarda. |
| Restaurado | Qué vuelve tras recarga. |
| Exportado | Qué aparece en la salida. |

## 6.4 Paridad negativa

Cada escenario debe mantener sus prohibiciones.

Ejemplo S03:

```text
no completar dosis
no completar vía
no completar pauta
no completar presentación
no activar línea
no decidir validación
```

## 6.5 Paridad de evidencia

Un check de conteos o shape no sustituye el recorrido funcional.

---

## 7. Evidencias aceptadas

| Evidencia | Qué demuestra | Qué no demuestra |
|---|---|---|
| Check de estructura | Shape, campos, IDs y conteos. | Interacción visible o coherencia clínica completa. |
| Test de modelo | Invariantes y reglas puras. | Wiring de UI. |
| Harness DOM/VM | Comportamiento parcial del script. | Recorrido soportado completo. |
| Playwright | Interacción real en navegador. | Validación clínica humana. |
| QA manual Sil | Coherencia funcional y narrativa asistencial. | Seguridad institucional o piloto. |
| Captura/guion | Qué se enseñó o preparó. | Que se ejecutara el recorrido. |
| Revisión clínica | Validez semántica del contrato. | Implementación técnica. |

No se aceptará como evidencia E2E:

- editar el DOM manualmente;
- eliminar `readonly`;
- inyectar storage imposible;
- usar fixtures que la UI no puede producir;
- navegar por rutas no soportadas;
- afirmar ausencia de error sin revisar consola y `pageerror`.

---

## 8. Matriz mínima de aceptación E2E

| Escenario | Inicio | Validación | Primera Visita | Seguimiento | Exportación | Persistencia | QA navegador |
|---|---:|---:|---:|---:|---:|---:|---:|
| S01 Bloqueado | Sí | Bloqueada | No | No | No | Sí | Obligatoria |
| S02 Vigilancia | Sí | Bloqueada | No | No | No | Sí | Obligatoria |
| S03 OK Farmacia | Sí | Sí | No | No | Pendiente | Sí | Obligatoria |
| S04 General pendiente | Sí | Sí | No | No | Pendiente | Sí | Obligatoria |
| S05 Validación pendiente | Sí | Sí | No | No | Sí | Sí | Obligatoria |
| S06 Denegado | Sí | Sí | No | No | Sí | Sí | Obligatoria |
| S07 Validado no iniciado | Sí | Sí | Visible | Bloqueado | Sí | Sí | Obligatoria |
| S08 Inicio confirmado | Sí | Lectura | Sí | Habilitado | Sí | Sí | Obligatoria |
| S09 Seguimiento activo | Lectura | Lectura | Lectura | Sí | Sí | Sí | Obligatoria |
| S10 Histórica | Lectura | Lectura | Lectura | No activa | Bloqueada | Sí | Obligatoria |
| S11 Multilínea | Lectura | Lectura | Lectura | Por línea | Por línea | Por línea | Obligatoria |
| S12 Cambio CIP | No aplica | Sí | Sí | Sí | Limpia | Limpia | Obligatoria |

---

## 9. Criterios de aceptación del dataset futuro

La futura fuente V4 deberá:

- contener los doce escenarios;
- tener IDs estables y versionados;
- ser exclusivamente sintética;
- separar solicitud, validación, línea, visita y movimiento;
- no contener estados simultáneos incompatibles;
- no usar la posición de un array como identidad;
- preservar vacíos deliberados;
- fallar de forma segura;
- generar el runtime de manera determinista;
- incluir hash o versión de la fuente;
- documentar el mapeo desde escenarios históricos reutilizados.

---

## 10. Reutilización de arquetipos actuales

### Reutilizables casi directamente

- Paciente A de Enfermería: S02.
- Paciente B de Enfermería: S01.
- Paciente C de Enfermería: S03.
- Paciente D de Enfermería: segundo caso S02.
- Una línea histórica coherente: S10.
- Un paciente con principal + concomitante explícitos: S11, tras revisión.

### Reutilizables tras reparar la historia

- pacientes con validación completa y línea activa: S08 o S09, pero no ambos sin evento de inicio;
- pacientes etiquetados como switch: solo si se separan origen, solicitud, validación y destino;
- pacientes etiquetados como add-on: solo si se conserva línea base y secuencia explícita.

### No reutilizar sin rediseño

- filas donde una misma línea aparece simultáneamente añadida y activa sin evento temporal;
- pacientes pendientes de validación y activos a la vez;
- escenarios con `Otro` como patología supuestamente gobernada;
- casos oncológicos especiales sin formularios y contrato funcional aprobados;
- payloads históricos creados únicamente para harness.

---

## 11. Orden de ejecución derivado

1. Publicar este contrato.
2. Crear manifiesto de escenarios.
3. Reparar la fuente WO8 y generar runtime V4.
4. Demostrar Inicio e importadores con S01–S04.
5. Demostrar Validación con S03–S07.
6. Implementar el inicio explícito con S07–S08.
7. Recuperar Seguimiento por línea con S09–S12.
8. Reconstruir dashboards desde eventos fiables.
9. Congelar release V4 demo-ready.

---

## 12. Demo, piloto y producto

### Este contrato puede gobernar una demo cuando

- todos los escenarios anunciados son interactuables;
- los datos son sintéticos;
- Playwright y QA manual están documentados;
- consola y `pageerror` están limpios;
- las limitaciones son visibles.

### No acredita piloto

Para piloto siguen faltando, como mínimo:

- entorno institucional;
- identidad, permisos y responsabilidades;
- persistencia segura;
- trazabilidad;
- backups;
- gobernanza de datos;
- protección de datos;
- QA institucional;
- soporte operativo.

### No define la V5

La configuración agnóstica, multi-hospital, lifecycle completo, backend intercambiable y control plane pertenecen a una fase posterior.

---

## 13. Estado de este documento

La publicación de este contrato:

- no modifica código;
- no modifica Excel, JSON o runtime;
- no crea la rama `rescue/farmacia-v4`;
- no autoriza automáticamente las WOs técnicas;
- no implementa switch, add-on o renovación;
- no acredita piloto.

Siguiente bloque previsto:

```text
WO-FH-SCENARIO-MANIFEST-V4-01
```
