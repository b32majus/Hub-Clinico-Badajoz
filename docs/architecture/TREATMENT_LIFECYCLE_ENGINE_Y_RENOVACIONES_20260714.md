# Treatment Lifecycle Engine y gestión de renovaciones por línea de tratamiento

| Metadato | Valor |
|---|---|
| Estado | Propuesta exploratoria avanzada |
| Fecha | 2026-07-14 |
| Repo | `b32majus/Hub-Clinico-Badajoz` |
| Rama base | `preview/demo-lunes-wo4-20260614` |
| Tipo | Arquitectura funcional/técnica |
| Implementación | No implementado |
| Datos reales | No autorizados |
| Validación clínica | Pendiente |
| Relación | PROM Capture Gateway + Identity Plane/Nursing Readiness |

> Este documento no autoriza uso con datos reales, despliegue productivo, integración con Presalud ni automatización clínica. Registra una arquitectura propuesta pendiente de validación clínica, técnica, institucional y de seguridad.

## 1. Metadatos

Los metadatos anteriores identifican la procedencia, alcance y límites de esta propuesta exploratoria.

## 2. Resumen ejecutivo

El Hub debe poder representar el ciclo de vida de cada línea de tratamiento, evaluar reglas temporales configurables y generar tareas operativas para los profesionales responsables. La renovación de prescripción es el primer caso de uso concreto de esta capacidad, no una regla aislada para un fármaco, patología o servicio.

La renovación pertenece a una línea de tratamiento, no al paciente. Este enfoque admite tratamientos simultáneos, entradas tardías al Hub, switches, suspensiones y ciclos sucesivos sin perder el histórico.

## 3. Relación con arquitectura existente

- El [PROM Capture Gateway](PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md) resuelve la captura PROM/PREM seudonimizada.
- El [Identity Plane y Nursing Readiness Gateway](IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md) resuelven la identidad local y estados prebiológicos estructurados.
- El Treatment Lifecycle Engine resuelve la evolución temporal de tratamientos y las tareas derivadas.

No repite esos documentos: utiliza `hub_patient_key` para la asociación seudonimizada y conserva la recomposición de identidad exclusivamente en el Hub profesional.

## 4. Problema asistencial

Una fecha única de renovación por paciente no representa el trabajo real. Un paciente puede tener tratamientos de servicios distintos, prescripciones con vencimientos diferentes, una línea suspendida, un cambio explícito o varios ciclos previos. Modelar esa complejidad como una alerta genérica del paciente produciría falsos vencimientos, duplicados e histórico sobrescrito.

## 5. Decisiones cerradas

1. La unidad de renovación es la línea de tratamiento.
2. Una línea posee identidad técnica propia, por ejemplo `treatment_id` o `treatment_key`; el formato definitivo queda abierto.
3. Las fechas confirmadas, verificadas y estimadas son categorías distintas y visibles.
4. Un switch es una operación explícita; la aparición de otro fármaco no lo prueba.
5. Las tareas se asignan preferentemente a rol y servicio, no solo a una persona.
6. Las reglas se declaran por configuración, pero requieren un motor para evaluarse.
7. El cálculo al abrir el Hub y el job periódico futuro deben invocar el mismo motor.
8. Las tareas operativas pueden persistirse; una alerta y una notificación son representaciones derivadas, no sinónimos de tarea.

## 6. Línea de tratamiento como unidad

Modelo conceptual:

```text
Paciente
|- Línea A: inicio, prescripción, validez, ciclos y tareas
|- Línea B: inicio, prescripción, validez, ciclos y tareas
`- Línea C finalizada: fecha de fin, motivo e histórico
```

Cada línea conserva `status`, referencia de servicio, fechas y ciclos propios. No existe una única "receta del paciente" como simplificación estructural. Esta decisión es coherente con los antecedentes multibiológico: un tratamiento adicional no equivale automáticamente a un switch.

## 7. Modelo de fechas y jerarquía

| Campo conceptual | Significado |
|---|---|
| `circuit_entry_date` | Entrada al circuito o registro inicial autorizado; no equivale necesariamente a emisión de prescripción. |
| `prescription_issue_date` | Fecha confirmada de emisión de prescripción. |
| `prescription_valid_until` | Fecha confirmada de validez; fuente preferente cuando exista. |
| `treatment_start_date` | Inicio real o previsto; no debe asumirse igual a la fecha de receta. |
| `estimated_valid_until` | Vencimiento provisional calculado; siempre se muestra como estimado. |
| `renewed_at` | Momento de confirmación operativa de la renovación. |

Jerarquía conceptual de fuente:

1. `prescription_valid_until` confirmada.
2. `prescription_issue_date` más duración confirmada.
3. Fecha o periodo restante verificado por Farmacia.
4. Fecha estimada derivada de alta o entrada al circuito.

La aplicación debe distinguir `confirmed`, `verified` y `estimated`. Valores orientativos de `reference_date_type` son `prescription_valid_until_confirmed`, `prescription_issue_date_confirmed`, `pharmacy_verified_remaining_period`, `nursing_circuit_entry_estimate` y `manual_estimate`. No son contrato técnico definitivo.

## 8. Escenarios de entrada

El motor no depende de un único servicio de entrada. Debe conservar el origen del registro, con una taxonomía aún abierta como `nursing`, `pharmacy`, `biologics_committee` u `other_authorized_entry`. Si participa Farmacia en el comité, puede registrar el alta; el paciente seguirá pasando por Enfermería cuando el circuito prebiológico lo requiera.

## 9. Paciente nuevo

Enfermería puede ser el punto de entrada habitual y registrar el circuito antes de la validación farmacéutica. La receta puede haber comenzado antes. Cuando no exista una fuente mejor, `circuit_entry_date` puede servir como referencia provisional, marcada como estimada y pendiente de confirmación.

No se afirma que fecha de alta de Enfermería y fecha de receta sean equivalentes.

## 10. Paciente ya en tratamiento

No se debe calcular `fecha_alta_hub + 365 días`: el tratamiento puede llevar meses activo. En el alta inicial se preguntará preferentemente cuándo caduca la prescripción actual. Si no se conoce la fecha exacta, puede registrarse un periodo restante aproximado; por ejemplo, cuatro meses produce `estimated_valid_until = fecha_alta_hub + 4 meses` y una procedencia de estimación pendiente de verificación por Farmacia.

## 11. Múltiples tratamientos

Cada tratamiento activo conserva como mínimo identidad técnica, servicio o referencia de servicio, estado, vencimiento, ciclo y tareas. Las alertas pueden ser distintas por línea. El tratamiento histórico permanece disponible para trazabilidad y no se colapsa con los activos.

## 12. Switch

Un switch requiere un flujo explícito:

1. Seleccionar la línea anterior.
2. Registrar fecha de fin y motivo codificado `switch`.
3. Cambiar el estado de la línea anterior a `switched`, `stopped` o `cancelled` según corresponda.
4. Cancelar tareas futuras de renovación incompatibles.
5. Crear una línea nueva con sus fechas y ciclo propios.
6. Conservar las líneas y ciclos previos completos.

No se sobrescribe el tratamiento anterior ni se infiere un switch por un segundo fármaco.

## 13. Suspensión y cierre

Las líneas `stopped`, `cancelled` o `switched` no generan nuevas tareas de renovación. Las tareas abiertas se cierran, cancelan o marcan no aplicables conforme a una regla validada. La ausencia de acción nunca implica renovación.

## 14. Treatment Lifecycle Engine

El Treatment Lifecycle Engine es la capacidad funcional que representa y evalúa el ciclo de vida de líneas de tratamiento, genera tareas desde reglas temporales y preserva histórico de cambios, renovaciones, switches, suspensiones y cierres.

No es una pantalla, una alerta aislada, un cron, una tabla, una regla fija de 365 días ni una automatización específica de Supabase.

Funciones conceptuales:

- crear y activar una línea;
- registrar fechas confirmadas o estimadas;
- calcular proximidad a vencimiento;
- crear o actualizar tareas de renovación;
- registrar solicitud y confirmar renovación;
- cerrar un ciclo y abrir el siguiente;
- registrar switch, suspensión o finalización;
- cancelar tareas incompatibles;
- conservar histórico.

Estados conceptuales, no taxonomía definitiva:

| Ámbito | Estados posibles |
|---|---|
| Línea de tratamiento | `planned`, `active`, `stopped`, `switched`, `cancelled`, `completed` |
| Ciclo de renovación | `not_due`, `due_soon`, `urgent`, `expired`, `renewed`, `cancelled`, `not_applicable` |
| Tarea | `pending`, `requested`, `verified`, `closed`, `cancelled` |

Los ámbitos no se mezclan. Por ejemplo, una línea puede estar `active`, su ciclo `due_soon` y su tarea `requested`.

## 15. Reglas declarativas

Una regla puede definirse como JSON, pero JSON no ejecuta nada por sí solo: JSON es definición; Rules Engine es evaluación; scheduler, cron futuro o apertura del Hub son mecanismos de ejecución.

```json
{
  "rule_type": "treatment_renewal",
  "enabled": true,
  "default_validity_days": 365,
  "thresholds_days": [60, 45, 15],
  "assigned_roles": ["farmacia", "enfermeria"],
  "evaluation_mode": "daily",
  "estimated_dates_allowed": true
}
```

El ejemplo es conceptual: no es contrato JSON aprobado, esquema de producción ni definición de seguridad. Los umbrales y la duración se configuran por tenant o programa; no se codifican como constantes universales.

## 16. Motor de evaluación

No se crea un cron por paciente, tratamiento, alerta, patología o tenant. El patrón propuesto es un evaluador genérico que carga reglas activas, consulta líneas activas, calcula estado temporal y crea o actualiza tareas.

La idempotencia conceptual evita duplicados: misma línea, mismo ciclo y mismo tipo de tarea implican actualizar la tarea existente, no generar otra en cada evaluación.

## 17. Cálculo al abrir vs job diario

En el MVP, la evaluación puede ejecutarse al abrir el Hub, la bandeja de renovaciones, datos del tenant o una fecha relevante. Reduce complejidad, pero no genera cambios mientras nadie use la aplicación.

Un job diario futuro puede implementarse con la infraestructura validada entonces. La tecnología concreta queda abierta. El mecanismo de ejecución debe ser intercambiable y llamar al mismo motor; no se duplica lógica entre apertura y ejecución diaria.

## 18. Alertas, tareas y notificaciones

| Concepto | Responsabilidad |
|---|---|
| Regla | Define condiciones, por ejemplo avisar a 60, 45 y 15 días. |
| Evaluación | Calcula días restantes desde `valid_until` y la fecha actual. |
| Tarea | Trabajo pendiente, por ejemplo solicitar o verificar renovación. |
| Alerta | Representación visual de una tarea o condición. |
| Notificación | Canal de entrega: badge, bandeja, contador, panel, correo futuro o aviso externo futuro. |

Las condiciones temporales se calculan. Las tareas operativas pueden persistirse. Las notificaciones pueden generarse o marcarse como leídas. Ejemplo: la regla "faltan 60 días o menos" crea o actualiza una `renewal_task`; la UI muestra una fila y badge derivados.

## 19. Ciclos de renovación

Al confirmar Farmacia una renovación, el sistema futuro debe cerrar el ciclo anterior, registrar `renewed_at` y actor de sesión, crear el ciclo siguiente, calcular la nueva validez y reevaluar tareas. No se limita a sumar un año al vencimiento sin registrar el evento.

La duración habitual puede proponerse como 12 meses o 365 días, pero es configurable. La interfaz conceptual puede proponer la fecha y hora de confirmación y ofrecer 12 meses u otra fecha. El caso frecuente debe ser sencillo sin impedir una excepción autorizada.

## 20. Roles y colas

| Rol | Acción conceptual |
|---|---|
| Enfermería | Ve tareas, marca que la renovación fue solicitada y actualiza `renewal_requested`; no confirma por defecto la renovación oficial. |
| Farmacia Hospitalaria | Verifica renovación en Presalud, confirma, cierra el ciclo y activa el siguiente en el flujo actual. |
| Clínico prescriptor | Rol futuro para recibir, renovar o confirmar directamente. |
| Administrador | Corrige con auditoría; no borra historial ni cambia estados clínicos sin trazabilidad. |

Las colas usan `assigned_role`, `assigned_service` y opcionalmente `assigned_user`. Esto mantiene continuidad ante vacaciones, cambios de personal y trabajo compartido.

## 21. Bandeja de renovaciones

Se propone una futura sección "Renovaciones de medicación", no implementada. Filtros conceptuales: vencidas, hasta 15 días, 16-45 días, 46-60 días, solicitadas, renovadas recientemente, fecha estimada pendiente de verificar, servicio, tratamiento y responsable.

Columnas mínimas: paciente recompuesto localmente, tratamiento, servicio, vencimiento, días restantes, origen de fecha, confirmada o estimada, estado de tarea, responsable y última acción. Una fecha estimada debe mostrar la advertencia "Fecha estimada pendiente de verificar".

## 22. Modelo conceptual de entidades

### `treatment_lines`

```text
id, tenant_id, hub_patient_key, treatment_id, drug_reference,
service_reference, status, treatment_start_date, treatment_end_date,
end_reason, created_at, updated_at
```

### `treatment_renewal_cycles`

```text
id, tenant_id, hub_patient_key, treatment_id, cycle_number, reference_date,
reference_date_type, valid_until, validity_status, renewed_at, renewed_by,
created_at, closed_at
```

### `renewal_tasks`

```text
id, tenant_id, hub_patient_key, treatment_id, renewal_cycle_id, task_type,
status, assigned_role, assigned_service, assigned_user, due_at, requested_at,
verified_at, closed_at, created_at, updated_at
```

### `renewal_rule_definitions`

```text
id, tenant_id, rule_key, version, enabled, definition_json,
created_at, published_at, archived_at
```

Las definiciones de reglas se versionan. `audit_log` debe registrar creación de línea, modificación de fecha, transición estimada a confirmada, solicitud, renovación, switch, suspensión, cancelación y corrección administrativa. Estas entidades son conceptuales: no son migraciones, SQL ni contrato clínico final.

Ubicación conceptual por planos:

| Plano o capacidad | Responsabilidad |
|---|---|
| Identity Plane local | Correspondencia `CIP <-> hub_patient_key`; no contiene necesariamente reglas de renovación. |
| Clinical Event Plane seudonimizado | Líneas técnicas, ciclos, tareas, solicitudes, confirmaciones, switches y suspensiones. Sigue siendo información de salud seudonimizada. |
| Control Plane | Umbrales, duración estándar, reglas JSON, roles destinatarios, permisos, configuración por tenant y versionado. |
| Workflow/Lifecycle capability | Capacidad funcional que combina los tres planos; no presupone un cuarto almacenamiento físico. |

## 23. Seguridad y auditoría

- RLS o controles equivalentes, separación por tenant y permisos en backend.
- Farmacia verifica; Enfermería solicita; el resto depende de configuración validada.
- Usuario inactivo o tenant no resuelto bloquean acceso.
- No hay `service role` en frontend, lectura pública ni texto libre en el MVP.
- Ocultar un botón no es control de acceso.
- Los eventos del Clinical Event Plane siguen siendo datos de salud seudonimizados.

## 24. MVP propuesto

Como recomendación de MVP funcional 1: renovación por línea, múltiples tratamientos, fecha confirmada o estimada, umbrales configurables, cálculo al abrir el Hub, bandeja, solicitud de Enfermería, verificación de Farmacia, ciclos históricos, switch explícito y suspensión; sin cron ni notificación externa.

## 25. Evolución futura

Un MVP funcional 2 podrá incorporar job diario, motor JSON más amplio, actualización automática de tareas, notificaciones internas, colas por servicio y escalado de tareas vencidas, tras diseño técnico, validación clínica y controles institucionales.

Realtime propaga cambios registrados, por ejemplo una solicitud de Enfermería visible a Farmacia. No evalúa por sí mismo el paso del tiempo y no sustituye al scheduler.

## 26. Líneas rojas

- No inferir renovación.
- No inferir fecha de prescripción ni fecha de validez.
- No inferir duración por fármaco.
- No inferir switch porque aparezca un nuevo fármaco.
- No sumar un año automáticamente sin confirmación.
- No crear tareas para tratamientos suspendidos.
- No ocultar que una fecha es estimada.
- No sobrescribir histórico.
- Nunca inferir dosis, vía, pauta, presentación o inducción a partir del nombre del fármaco.
- No implementar en esta WO cron, Supabase, tablas reales, esquema JSON, notificaciones, RLS, autenticación ni integración con Presalud.

## 27. Decisiones pendientes

- Quién confirma clínicamente cada renovación.
- Duración por programa, umbrales definitivos y excepciones.
- Obtención de la fecha real desde Presalud e integración frente a verificación manual.
- Tecnología del scheduler, retención de tareas y política de escalado.
- Tratamiento de excepciones y diseño clínico final del switch.
- Campos definitivos y validación por Farmacia y Enfermería.

## 28. Criterios de futura implementación

Una futura WO técnica deberá validar modelo de datos, permisos, RLS o controles equivalentes, idempotencia, transiciones de estado, auditoría, fuentes de fecha, UX de estimaciones, reglas versionadas y pruebas de flujos multi-línea. No deberá asumir que este documento aprueba infraestructura, contratos clínicos definitivos, datos reales o automatización productiva.
