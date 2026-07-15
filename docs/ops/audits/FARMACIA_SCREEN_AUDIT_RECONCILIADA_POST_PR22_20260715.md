# Auditoría reconciliada de pantallas de Farmacia post-PR22

Status: pending_review

## 1. Resumen ejecutivo y límites

Esta auditoría reconcilia la evidencia técnica de `FARMACIA_SCREEN_AUDIT_POST_PR20_20260714.md` con el criterio funcional de Sil en `FARMACIA_SCREEN_REVIEW_SIL_POST_PR20_20260714.md`. La preview es apta para demo supervisada con preocupaciones, pero no para piloto real. Las prioridades inmediatas son evitar mezcla de contexto entre pacientes, preservar el contexto de alta guiada, aclarar y proteger el flujo Enfermería -> Validación, modelar varias líneas de tratamiento sin inferencias y evitar que Seguimiento inicie un fármaco nuevo saltándose Validación.

No se demuestra ningún P0. La ausencia observada de P0 no certifica seguridad clínica, privacidad ni aptitud para piloto. El error reproducible del dashboard se conserva como P1 técnico, pero los dashboards quedan acotados, pendientes y excluidos de decisiones funcionales en esta reconciliación.

**Esta reconciliación no autoriza implementación, piloto, ejecución de backlog ni contratos clínicos.** Tampoco autoriza uso con datos reales, producción, integración automática con JARA, backend, Supabase, Control Plane ni cambios arquitectónicos.

### Fuentes y trazabilidad

- **Fuente técnica:** `FARMACIA_SCREEN_AUDIT_POST_PR20_20260714.md`, especialmente Resumen ejecutivo (líneas 5-9), Detalle por pantalla (líneas 53-295), Findings por prioridad (líneas 297-349) y Riesgos/deuda (líneas 351-383).
- **Fuente Sil:** `FARMACIA_SCREEN_REVIEW_SIL_POST_PR20_20260714.md`, especialmente Principios transversales (líneas 57-90), pantallas (líneas 94-877), hallazgos transversales (líneas 881-911) y WOs candidatas originales (líneas 915-1006).
- **Regla de lectura:** un hecho observado describe evidencia reproducida o texto literal de una fuente; una interpretación técnica no cierra una decisión clínica; un criterio Sil sigue pendiente cuando la propia revisión lo formula como propuesta, duda o evolución futura.

## 2. Matriz compacta por pantalla

| ID | Pantalla | Hallazgo | Fuente técnica | Fuente Sil | Riesgo | Prioridad reconciliada | Decisión | WO candidata |
|---|---|---|---|---|---|---|---|---|
| SCR-01 | Profesionales | Render estático con cuatro profesionales sintéticos; no hay permisos reales. | Técnica, 4.11 (líneas 275-295) | Sil, 3 (líneas 94-137) | Confundir rol visible con autorización, firma o responsabilidad. | P2 temporal / P3 real | Solo valorar nombres reales si están autorizados; gestión real queda diferida. | `WO-FH-SYNTHETIC-DATA-DEMO-HARDCODED-REDUCTION-01` |
| SCR-02 | Inicio Farmacia | Bandejas con semántica ambigua y alta guiada que no conserva todo el contexto. | Técnica, 4.2 y P2-01 (líneas 77-97, 328-333) | Sil, 4.3-4.9 (líneas 160-222) | Solicitud ausente/duplicada o episodio abierto con contexto incompleto. | P1 | Definir estados esperados y propagar servicio, patología y circuito; no decidir aquí una o dos bandejas. | `WO-FH-ALTA-GUIADA-CONTEXT-PROPAGATION-01`; `WO-FH-SYNTHETIC-DATA-DEMO-HARDCODED-REDUCTION-01` |
| SCR-03 | Validación | Check Enfermería -> Validación roto; mezcla de opciones, bloques redundantes y soporte multifármaco no estructurado. | Técnica, 4.3 y P1-02 (líneas 99-119, 312-317) | Sil, 5 (líneas 226-425) | Regresión sin cobertura, origen ambiguo o mezcla de tratamientos. | P1 | Fijar primero flujo y contrato humano; limpiar después sin inferir datos terapéuticos. | `WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-01`; `WO-FH-MULTITREATMENT-VALIDATION-LINES-MVP-01` |
| SCR-04 | Primera visita | Funciona en el recorrido probado, pero cambio de CIP puede conservar datos y existen opciones/copy sin contrato. | Técnica, 4.4 (líneas 121-141) | Sil, 6 (líneas 429-599) | Estado Frankenstein y registro bajo servicio/patología no soportados. | P1 contexto / P2 limpieza | Guard de cambio de paciente antes de limpieza visual; no crear motor PROM dinámico. | `WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01`; `WO-FH-FIRST-VISIT-CLEANUP-PROMS-CMO-01` |
| SCR-05 | Seguimiento | Base funcional útil, con estado residual, múltiples líneas y movimientos aún ambiguos. | Técnica, 4.5 (líneas 143-163) | Sil, 7 (líneas 603-877) | Atribuir datos al paciente/línea incorrectos o iniciar un fármaco sin Validación. | P1 | Permitir registrar una línea previa activa, no iniciar un fármaco nuevo; causalidad final profesional. | `WO-FH-FOLLOWUP-CLEANUP-MOVEMENTS-CAUSALITY-01`; `WO-FH-MULTITREATMENT-VALIDATION-LINES-MVP-01`; `WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01` |
| SCR-06 | Dashboards (acotados) | FH-004 produce dos `pageerror` con `undefined` y `localeCompare`; la causa exacta no está demostrada. | Técnica, 4.6-4.7 y P1-01 (líneas 165-207, 305-310) | Sil, alcance excluido (líneas 37-53) | Render/orden/estado parcial que puede aparentar completitud. | P1 | Conservar el defecto reproducible; causa y contrato temporal pendientes. Sin WO autorizada en esta lista. | No aplica; tema diferido |

### 2.1 Fichas reconciliadas por pantalla

#### SCR-01 Profesionales

- **Hecho técnico observado:** la pantalla renderiza cuatro profesionales sintéticos desde datos estáticos y no ofrece gestión real (técnica, 4.11, líneas 275-295).
- **Criterio Sil:** P2 para sustituir mocks por profesionales reales autorizados si mejora la demo; P3 para fuente gobernada, roles y permisos (Sil, 3.2-3.5, líneas 100-137).
- **Coincidencia/discrepancia:** coincidencia en que la pantalla es demo y no acredita permisos; Sil añade una transición temporal que la auditoría técnica no decide.
- **Interpretación técnica:** cambiar nombres no cambia el modelo de identidad ni autorización.
- **Riesgo clínico/funcional:** atribución aparente de responsabilidad, firma o capacidad administrativa inexistente.
- **Prioridad reconciliada:** P2 para datos demo autorizados; P3 para permisos/Control Plane.
- **Decisión recomendada:** conservar señalización explícita de demo y decidir humanamente si se usan nombres reales.
- **Decisión humana pendiente:** autorización de nombres y responsables; contrato futuro de roles.
- **Qué NO implementar:** CRUD, autenticación, permisos, firma o Supabase por efecto de este documento.
- **WO candidata:** `WO-FH-SYNTHETIC-DATA-DEMO-HARDCODED-REDUCTION-01` solo para reducir hardcoded; la gobernanza real queda diferida.

#### SCR-02 Inicio Farmacia

- **Hecho técnico observado:** se importaron fixtures sintéticos, pero una zona de pendientes quedó en cero; la alta guiada abre destinos (técnica, 4.2 y P2-01, líneas 77-97 y 328-333).
- **Criterio Sil:** distinguir o unificar bandejas y propagar servicio, patología y circuito desde alta guiada (Sil, 4.3-4.9, líneas 160-222).
- **Coincidencia/discrepancia:** coincidencia sobre ambigüedad de bandeja; la técnica no prueba defecto funcional y Sil formula una hipótesis que requiere definición previa.
- **Interpretación técnica:** el cero puede ser filtrado, render o fixture; el contexto incompleto sí exige contrato de navegación.
- **Riesgo clínico/funcional:** omitir una solicitud o abrir un episodio bajo contexto equivocado.
- **Prioridad reconciliada:** P1 para propagación; P2 para semántica de bandejas/fixtures y reducción de hardcoded.
- **Decisión recomendada:** definir estados esperados antes del test y transportar contexto explícito sin simular persistencia.
- **Decisión humana pendiente:** una bandeja o dos, significado de cada estado y resultado esperado por fixture.
- **Qué NO implementar:** no eliminar una bandeja ni inventar estados sin esa decisión; no presentar Excel manual como integración.
- **WO candidata:** `WO-FH-ALTA-GUIADA-CONTEXT-PROPAGATION-01` y `WO-FH-SYNTHETIC-DATA-DEMO-HARDCODED-REDUCTION-01`.

#### SCR-03 Validación

- **Hecho técnico observado:** la acción manual funciona, pero el check específico Enfermería -> Validación falla sobre `formServicioManual.classList` (técnica, 4.3 y P1-02, líneas 99-119 y 312-317).
- **Criterio Sil:** fijar el flujo antes de ajustar solo el test, retirar ambigüedades/redundancias y modelar cada tratamiento como línea estructurada (Sil, 5.2-5.15, líneas 234-425).
- **Coincidencia/discrepancia:** coincidencia en la falta de cobertura verde; la evidencia no demuestra si falla el flujo real o solo el harness. Sil propone cambios que aún requieren decisión funcional.
- **Interpretación técnica:** test y DOM están desalineados; la limpieza debe seguir un contrato funcional, no ocultar el fallo.
- **Riesgo clínico/funcional:** precarga incompleta, origen falso, tratamiento mezclado o inferencia terapéutica.
- **Prioridad reconciliada:** P1.
- **Decisión recomendada:** definir resultado Enfermería -> Validación y bloque mínimo por línea antes de implementar.
- **Decisión humana pendiente:** opciones de origen, semántica de acto/línea, add-on/switch, campos repetidos, salida por línea y tratamiento de renovación.
- **Qué NO implementar:** no inferir dosis, vía, pauta, presentación o inducción; no tratar renovación como validación genérica; no añadir un campo suelto de “otro fármaco”.
- **WO candidata:** `WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-01` y `WO-FH-MULTITREATMENT-VALIDATION-LINES-MVP-01`.

#### SCR-04 Primera visita

- **Hecho técnico observado:** búsqueda, autocomplete y copias funcionaron; no existe persistencia ni ciclo auditable (técnica, 4.4, líneas 121-141).
- **Criterio Sil:** corregir cambio de CIP, retirar opciones sin contrato, reducir copy, aplicar umbrales PROM textuales y enlazar CMO-SEFH como recurso externo (Sil, 6, líneas 429-599).
- **Coincidencia/discrepancia:** la auditoría técnica no reprodujo el cambio Frankenstein; Sil sí lo observó funcionalmente. No hay contradicción: son recorridos distintos.
- **Interpretación técnica:** el contexto debe reemplazarse atómicamente al cambiar paciente; catálogo y PROMs no deben completar decisiones clínicas.
- **Riesgo clínico/funcional:** datos residuales de otro paciente o selección de una indicación sin formulario/contrato.
- **Prioridad reconciliada:** P1 para contexto; P2 para limpieza, opciones, PROMs y enlace CMO.
- **Decisión recomendada:** resolver guard de paciente antes de cambios visuales; mantener interpretación PROM escrita además del color.
- **Decisión humana pendiente:** opciones admitidas por servicio/patología y autorización del enlace/criterios visuales.
- **Qué NO implementar:** motor dinámico de PROMs, cálculo automático CMO, inferencias CIMA ni contratos nuevos de patología.
- **WO candidata:** `WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01` y `WO-FH-FIRST-VISIT-CLEANUP-PROMS-CMO-01`.

#### SCR-05 Seguimiento

- **Hecho técnico observado:** el recorrido probado registra evolución, movimientos, RAM y algoritmos; no hay ciclo real de renovación/validez (técnica, 4.5, líneas 143-163).
- **Criterio Sil:** limpiar estado residual, representar cada línea activa, definir movimientos y permitir registrar tratamiento previo sin iniciar uno nuevo saltándose Validación (Sil, 7, líneas 603-877).
- **Coincidencia/discrepancia:** coincidencia en que movimientos y causalidad requieren contrato profesional; Sil aporta el defecto de estado y la frontera Validación/Seguimiento.
- **Interpretación técnica:** movimiento debe aplicarse a una línea identificada; Naranjo/Karch-Lasagna son ayudas, no decisión final.
- **Riesgo clínico/funcional:** movimiento aplicado a línea/paciente incorrectos, switch inferido o alta de fármaco fuera del flujo de Validación.
- **Prioridad reconciliada:** P1 para contexto, líneas y frontera de inicio; P2 para limpieza/PROMs/CMO/etiquetas; P3 para Lifecycle.
- **Decisión recomendada:** separar registro de línea previa de inicio de nuevo fármaco y exigir identificación de línea para movimientos.
- **Decisión humana pendiente:** semántica de cada movimiento, mínimos por línea, causalidad final y tratamiento de pausas/cierres.
- **Qué NO implementar:** no iniciar fármaco nuevo desde Seguimiento, no inferir switch, no automatizar causalidad ni renovación.
- **WO candidata:** `WO-FH-FOLLOWUP-CLEANUP-MOVEMENTS-CAUSALITY-01`, `WO-FH-MULTITREATMENT-VALIDATION-LINES-MVP-01` y `WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01`.

#### SCR-06 Dashboards, alcance limitado

- **Hecho técnico observado:** FH-004 registró dos errores `Cannot read properties of undefined (reading 'localeCompare')`; el longitudinal cargó en prueba básica (técnica, 4.6-4.7 y P1-01, líneas 165-207 y 305-310).
- **Criterio Sil:** dashboards fuera de esta revisión hasta decidir modelo longitudinal, líneas, renovaciones, switch, PROMs y trazabilidad (Sil, alcance, líneas 37-53).
- **Coincidencia/discrepancia:** no hay discrepancia; se excluye diseño funcional, no evidencia técnica reproducible.
- **Interpretación técnica:** **error reproducible de dashboard / ordenación / estado no robusto**. La fuente sugiere un valor `undefined` al usar `localeCompare`, pero no prueba literalmente que la causa exacta sea una fecha.
- **Riesgo clínico/funcional:** orden o render parcial que aparenta completitud.
- **Prioridad reconciliada:** P1 para el defecto observado; P3 para dashboard longitudinal definitivo.
- **Decisión recomendada:** conservar reproducción y diagnosticar causa sin inferir fechas; revisión funcional diferida.
- **Decisión humana pendiente:** contrato temporal, eventos admisibles sin fecha y futura representación longitudinal.
- **Qué NO implementar:** no estimar fechas, no rediseñar dashboards, no cerrar el modelo longitudinal.
- **WO candidata:** ninguna de las siete autorizadas como candidata; posible corrección queda como tema de decisión diferido.

## 3. Registro canónico deduplicado de hallazgos

### 3.1 Matriz canónica

| ID | Pantalla | Hallazgo | Fuente técnica | Fuente Sil | Riesgo | Prioridad reconciliada | Decisión | WO candidata |
|---|---|---|---|---|---|---|---|---|
| FH-R01 | Primera visita, Seguimiento, transversal | Cambio de CIP puede mezclar contexto de pacientes. | Técnica: riesgo de estado local, 4.4-4.5 | Sil: 2.5, 6.10, 7.5 | Atribución clínica al paciente incorrecto. | P1 | Reemplazo completo o cancelación; contrato humano sobre aviso/cambios. | `WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01` |
| FH-R02 | Inicio y destinos | Alta guiada no propaga todo el contexto. | Técnica: 4.2 | Sil: 4.6-4.9 | Episodio bajo servicio/patología/circuito equivocados. | P1 | Propagar contexto explícito, sin fingir persistencia. | `WO-FH-ALTA-GUIADA-CONTEXT-PROPAGATION-01` |
| FH-R03 | Inicio, Validación | Flujo Enfermería -> Validación sin check verde. | Técnica: P1-02 | Sil: 5.2 y 5.14 | Regresión o precarga incompleta no detectada. | P1 | Fijar resultado funcional y después alinear test/DOM. | `WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-01` |
| FH-R04 | Validación | Orígenes, prebiológico, responsable y exportación presentan ambigüedad/duplicación. | Técnica: 4.3 | Sil: 5.3, 5.11-5.13 | Flujo operativo confuso o capacidad demo presentada como real. | P1 | Limpieza condicionada a decisiones humanas enumeradas. | `WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-01` |
| FH-R05 | Validación, Seguimiento | Multifármaco/multitratamiento carece de líneas estructuradas. | Técnica: 4.3, 4.5, deuda funcional | Sil: 5.4-5.5, 7.8-7.9 | Mezcla de dosis, estados, movimientos y salidas entre tratamientos. | P1 | Definir acto y bloque mínimo por línea; decisión clínica/funcional pendiente. | `WO-FH-MULTITREATMENT-VALIDATION-LINES-MVP-01` |
| FH-R06 | Seguimiento | Puede confundirse registrar tratamiento previo con iniciar fármaco nuevo. | Técnica: 4.5 | Sil: 7.14 | Bypass de Validación. | P1 | Permitir registro previo; prohibir inicio nuevo desde Seguimiento. | `WO-FH-FOLLOWUP-CLEANUP-MOVEMENTS-CAUSALITY-01` |
| FH-R07 | Dashboard paciente | Error reproducible de dashboard / ordenación / estado no robusto. | Técnica: 4.6 y P1-01 | Sil: dashboards excluidos | Render parcial o secuencia incorrecta. | P1 | Diagnóstico acotado; causa exacta y contrato temporal pendientes. | Ninguna; tema diferido |
| FH-R08 | Inicio | Bandejas y fixtures no tienen semántica/resultado esperado cerrado. | Técnica: P2-01 | Sil: 4.3-4.5 | Solicitudes invisibles, duplicadas o mal interpretadas. | P2 | Decidir estados y fixture antes de cambiar UI/test. | `WO-FH-SYNTHETIC-DATA-DEMO-HARDCODED-REDUCTION-01` |
| FH-R09 | Validación, Primera visita, Seguimiento | Copy, chips, PROMs y acceso CMO requieren simplificación semántica. | Técnica: P2-02 y pantallas 4.3-4.5 | Sil: 5.8, 6.2/6.6-6.8, 7.3/7.7/7.10-7.11 | Color o copy interpretado como estado/decisión clínica. | P2 | Texto explícito, CMO externo y color nunca como única señal. | `WO-FH-FIRST-VISIT-CLEANUP-PROMS-CMO-01`; `WO-FH-FOLLOWUP-CLEANUP-MOVEMENTS-CAUSALITY-01` |
| FH-R10 | Validación, Primera visita, Seguimiento | “Otro/Otra”, etiquetas y catálogo carecen de contrato uniforme. | Técnica: 4.10 | Sil: 2.4, 5.6-5.7, 6.4/6.9, 7.6 | Indicación no soportada o dato de catálogo tomado como prescripción. | P2 | Retirar opciones sin contrato tras confirmación; distinguir CIMA/local. | `WO-FH-FIRST-VISIT-CLEANUP-PROMS-CMO-01`; `WO-FH-FOLLOWUP-CLEANUP-MOVEMENTS-CAUSALITY-01` |
| FH-R11 | Profesionales, datos demo | Profesionales/casos hardcoded pueden falsear madurez funcional. | Técnica: 4.2, 4.11, deuda técnica | Sil: 2.3, 3, 4.2, 7.15 | Demo dependiente de fallback y responsabilidad aparente. | P2 | Reducir hardcoded con datos sintéticos; nombres reales solo autorizados. | `WO-FH-SYNTHETIC-DATA-DEMO-HARDCODED-REDUCTION-01` |
| FH-R12 | Transversal | No existen permisos reales, Control Plane, Supabase ni trazabilidad productiva. | Técnica: P1-03, P3-01 | Sil: 2.2, 3.2, 8.3 | Uso real sin autorización ni responsabilidad verificable. | P3 | Mantener fuera de demo como capacidad futura. | Ninguna; arquitectura diferida |
| FH-R13 | Primera visita, Seguimiento | PROMs dinámicos por patología no están implementados. | Técnica: capacidades no implementadas | Sil: 6.8, 7.11, 8.3 | Instrumento incorrecto para una patología. | P3 | No crear motor hasta contrato humano por patología. | Ninguna; producto diferido |
| FH-R14 | Seguimiento, dashboards | Lifecycle, renovaciones/validez/ciclos y dashboards definitivos siguen pendientes. | Técnica: 4.5-4.7, P3-01 | Sil: 5.4, 7.2, 7.16, 8.3 | Estado longitudinal o renovación sin línea/trazabilidad. | P3 | Diseñar después de contratos por línea y decisiones clínicas. | Ninguna; producto/arquitectura diferidos |

### 3.2 Fichas de hallazgo canónico

Cada ficha distingue los campos exigidos; las citas completas están en la matriz anterior.

| ID | Hecho técnico observado | Criterio Sil | Coincidencia/discrepancia | Interpretación técnica | Riesgo clínico/funcional | Prioridad | Decisión recomendada | Decisión humana pendiente | Qué NO implementar | WO candidata |
|---|---|---|---|---|---|---|---|---|---|---|
| FH-R01 | Estado local y pantallas con contexto cargado. | Cambio CIP debe confirmar, cargar o limpiar por completo. | Sil aporta reproducción funcional; técnica aporta riesgo de estado. | Reemplazo atómico del contexto. | Paciente equivocado. | P1 | Guard transversal. | Copy y condiciones exactas. | Mezcla parcial o limpieza silenciosa. | `WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01` |
| FH-R02 | Alta guiada navega a destinos. | Debe arrastrar servicio, patología y circuito. | Coinciden en flujo; técnica no certifica datos propagados. | Contexto de navegación explícito. | Episodio mal contextualizado. | P1 | Propagar y verificar. | Campos obligatorios por destino. | Persistencia ficticia o defaults inferidos. | `WO-FH-ALTA-GUIADA-CONTEXT-PROPAGATION-01` |
| FH-R03 | Check falla en `formServicioManual.classList`. | Fijar primero flujo real. | Coincidencia; no se sabe si falla harness o producto. | Desalineación DOM/test. | Regresión no protegida. | P1 | Contrato y test alineados. | Resultado esperado de precarga. | Arreglar solo para “poner verde”. | `WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-01` |
| FH-R04 | Validación funciona parcialmente con bloques demo. | Limpiar origen, redundancias y representación de responsable/exportación. | Sil prescribe dirección; detalles siguen abiertos. | Menos estados y bloques ambiguos. | Capacidad falsa o decisión en bloque incorrecto. | P1 | Limpieza funcional acotada. | Opciones definitivas y campos conservados. | Firma, JARA automático o reglas clínicas nuevas. | `WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-01` |
| FH-R05 | Formularios admiten tratamiento, pero no contrato multilínea real. | Acto con una o varias líneas, cada una estructurada. | Coincidencia en deuda; modelo requiere decisión. | Identidad estable por línea. | Cruce de tratamiento/estado/salida. | P1 | MVP multilínea tras contrato. | Campos, switch/add-on y exportación. | Campo “otro fármaco” suelto o renovación genérica. | `WO-FH-MULTITREATMENT-VALIDATION-LINES-MVP-01` |
| FH-R06 | Seguimiento registra movimientos. | Línea previa sí; fármaco nuevo sin Validación no. | Criterio Sil cierra la frontera funcional, no su implementación. | Dos intenciones distintas. | Bypass de validación. | P1 | Separar acciones. | Evidencia mínima de línea previa. | Alta de fármaco desde Seguimiento. | `WO-FH-FOLLOWUP-CLEANUP-MOVEMENTS-CAUSALITY-01` |
| FH-R07 | Dos `pageerror` con `undefined`/`localeCompare`. | Dashboard fuera de revisión. | Exclusión de diseño no elimina defecto. | Ordenación/estado no robusto; causa exacta pendiente. | Render parcial. | P1 | Diagnosticar con fixture. | Contrato temporal. | Inferir fecha o rediseñar dashboard. | Ninguna |
| FH-R08 | Una zona queda en cero tras fixtures. | Bandejas deben tener significado distinto o unificarse. | El defecto exacto no está probado. | Falta oráculo funcional. | Solicitud perdida/aparente. | P2 | Definir fixture y estados. | Una/dos bandejas. | Eliminar UI o cambiar filtro por hipótesis. | `WO-FH-SYNTHETIC-DATA-DEMO-HARDCODED-REDUCTION-01` |
| FH-R09 | UI mezcla versiones y señales visuales. | Simplificar copy, PROMs/chips semánticos y CMO externo. | Coincidencia en claridad; umbrales requieren validación. | Texto siempre acompaña color. | Lectura clínica errónea. | P2 | Limpieza por pantalla. | Umbrales/instrumentos aprobados. | CMO automático o color como decisión. | `WO-FH-FIRST-VISIT-CLEANUP-PROMS-CMO-01`; `WO-FH-FOLLOWUP-CLEANUP-MOVEMENTS-CAUSALITY-01` |
| FH-R10 | Catálogo es referencia, no prescripción. | Retirar opciones sin contrato y distinguir CIMA/local. | Coincidencia en no inferencia. | Catálogo normaliza identidad farmacológica. | Dato no confirmado tratado como terapéutico. | P2 | Etiquetas precisas. | Catálogos/orígenes soportados. | Inferir régimen o crear patologías genéricas. | `WO-FH-FIRST-VISIT-CLEANUP-PROMS-CMO-01`; `WO-FH-FOLLOWUP-CLEANUP-MOVEMENTS-CAUSALITY-01` |
| FH-R11 | Datos/profesionales hardcoded. | Migrar casos a dataset sintético; nombres reales solo autorizados. | Coincidencia en deuda demo. | Fixtures canónicos reducen falsos positivos. | Madurez o responsabilidad aparente. | P2 | Reducir hardcoded gradualmente. | Identidades autorizadas y fixture canónico. | Datos reales de pacientes. | `WO-FH-SYNTHETIC-DATA-DEMO-HARDCODED-REDUCTION-01` |
| FH-R12 | Sin autenticación, autorización o backend real. | Demo no equivale a piloto. | Coincidencia completa. | Avisos visuales no son controles. | Acceso/uso real no gobernado. | P3 | Mantener gate humano. | Arquitectura e institución. | Supabase/Control Plane por esta WO. | Ninguna |
| FH-R13 | PROMs actuales son limitados/demo. | Futuro motor por patología. | Coincidencia en alcance futuro. | Instrumentos dependen de contrato clínico. | PROM inadecuado. | P3 | Diferir. | Set validado por patología. | Motor genérico ahora. | Ninguna |
| FH-R14 | Sin ciclo real; dashboards parciales/exploratorios. | Renovación pertenece a línea y Lifecycle futuro. | Coincidencia completa. | Estado longitudinal exige identidad de línea/evento. | Renovación/estado incorrectos. | P3 | Diseño posterior. | Ciclos, validez, cierres y representación. | Renovación genérica o dashboard definitivo. | Ninguna |

## 4. Reglas clínicas y de gobernanza

| Regla | Clasificación | Base / estado |
|---|---|---|
| CIMA/catálogo normaliza y permite seleccionar; nunca infiere dosis, vía, pauta/régimen, presentación, inducción, switch, renovación, validez o duración. | Evidencia de fuente + restricción de gobernanza clínica | Técnica, Riesgos clínicos (líneas 351-357); Sil, 2.1 y 5.7 (líneas 59-65, 312-326). Contrato clínico definitivo pendiente. |
| Naranjo y Karch-Lasagna orientan; la decisión final corresponde al profesional. | Evidencia de fuente + restricción de gobernanza clínica | Técnica, líneas 355-356; Sil, 7.12 (líneas 794-807). Detalle de registro pendiente. |
| La renovación pertenece a una línea de tratamiento, no al paciente genérico. | Restricción de gobernanza + contrato humano pendiente | Sil, 5.4 (líneas 260-277) y prioridades P3; no implementado técnicamente. |
| Seguimiento puede registrar tratamiento activo previo, pero no iniciar un fármaco nuevo saltándose Validación. | Criterio funcional Sil + restricción de gobernanza | Sil, 7.14 (líneas 822-843). Implementación y evidencia mínima pendientes. |
| El texto/export manual para JARA no es integración automática. | Evidencia de fuente + restricción de gobernanza | Técnica, NOT real-pilot-ready (líneas 389-391); Sil, 5.13 y 7.13. |
| Una demo no es un piloto real; ocultar botones o roles visualmente no constituye control de permisos. | Evidencia de fuente + restricción de gobernanza | Técnica, P1-03 y líneas 389-391; Sil, 2.2 y 3.3. Arquitectura real pendiente. |

## 5. Dudas que requieren decisión humana

1. ¿Debe Inicio mostrar una sola bandeja o dos estados operativos distintos, y qué registros debe producir cada fixture sintético?
2. ¿Qué campos exactos de alta guiada son obligatorios y cómo se representan cuando el destino no los soporta?
3. ¿Cuáles son los orígenes válidos de Validación y qué debe precargarse al abrir desde Enfermería?
4. ¿Qué constituye el acto de validación y la identidad mínima de cada línea en inicio, add-on y switch? ¿Cómo se exporta cada línea?
5. ¿Qué opciones de servicio/patología están realmente soportadas y puede retirarse “Otro/Otra” sin abrir un contrato alternativo?
6. ¿Qué semántica exacta tienen optimización, tratamiento añadido, switch, suspensión y pausa, y qué motivo/evidencia exige cada movimiento?
7. ¿Qué evidencia permite registrar una línea activa previa sin convertir Seguimiento en vía de inicio?
8. ¿Qué eventos pueden carecer de fecha y cuál es el contrato temporal del dashboard? La causa exacta del error reproducible sigue abierta.
9. ¿Se autoriza mostrar nombres reales de profesionales en demo y bajo qué consentimiento/gobernanza?
10. ¿Qué instrumentos PROM, umbrales y textos están validados por patología? El color nunca sustituirá la categoría escrita.

## 6. WOs candidatas no autorizadas

**Estas WOs son candidatas. No quedan autorizadas por este documento.** Su orden no constituye backlog ejecutable y cada una requiere una WO formal, alcance cerrado y revisión humana.

| WO candidata | Evidencia reconciliada | Dependencias / decisiones previas |
|---|---|---|
| `WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01` | FH-R01; Sil 2.5, 6.10, 7.5. | Política de aviso/cancelación y definición de reemplazo completo por pantalla. |
| `WO-FH-ALTA-GUIADA-CONTEXT-PROPAGATION-01` | FH-R02; Sil 4.6-4.9. | Campos obligatorios por destino y representación de valores no soportados. |
| `WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-01` | FH-R03 y FH-R04; técnica P1-02; Sil 5.2-5.15. | Flujo Enfermería -> Validación, opciones de origen y bloques que se conservan. |
| `WO-FH-MULTITREATMENT-VALIDATION-LINES-MVP-01` | FH-R05 y frontera FH-R06; Sil 5.4-5.5 y 7.8-7.9. | Contrato humano de acto/línea, campos, estados, switch/add-on y exportación. |
| `WO-FH-FIRST-VISIT-CLEANUP-PROMS-CMO-01` | FH-R01, FH-R09 y FH-R10; Sil 6.2-6.10. | Guard de paciente, opciones soportadas, umbrales validados y enlace externo autorizado. |
| `WO-FH-FOLLOWUP-CLEANUP-MOVEMENTS-CAUSALITY-01` | FH-R01, FH-R05, FH-R06, FH-R09 y FH-R10; Sil 7.3-7.14. | Semántica de movimientos, identidad de línea, registro previo y decisión final profesional. |
| `WO-FH-SYNTHETIC-DATA-DEMO-HARDCODED-REDUCTION-01` | FH-R08 y FH-R11; técnica P2-01/deuda hardcoded; Sil 2.3, 4.2 y 7.15. | Dataset sintético canónico, oráculo de bandejas y autorización de cualquier nombre profesional real. |

Una corrección del dashboard, gates de piloto y decisiones de arquitectura pueden estudiarse como temas diferidos, pero **no se añaden a esta lista de siete WOs candidatas**. No existe autorización para ejecutarlos ni para convertirlos en backlog.
