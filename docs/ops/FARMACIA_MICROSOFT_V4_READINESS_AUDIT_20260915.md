# PROMueve Farmacia — Microsoft V4 readiness audit · 2026-09-15

**Issue:** #360
**Tipo:** auditoría read-only / preparación de PoC
**Rama canónica:** `recovery/farmacia-pr-replay-20260727`
**HEAD verificado:** `884b814d305021c8ef52b5bb237da7d32749c2a8`
**Superficie producto:** `https://b32majus.github.io/Hub-Clinico-Badajoz/farmacia_index.html`
**Datos para pruebas:** exclusivamente sintéticos/no clínicos.

## 1. Conclusión ejecutiva

Office Scripts **no se consideran bloqueados ni descartados**. Existe evidencia de campo comunicada por Sil de ejecución viable en Microsoft 365 del SES. El problema pendiente no es demostrar que Office Scripts existen, sino cerrar el transporte y la persistencia V4 completa.

La ruta objetivo sigue siendo coherente:

`Hub -> evento canónico -> adaptador Excel Bridge -> Power Automate/Office Script -> RAW + tablas relacionales -> APP_* -> Excel Read Adapter -> Hub`.

A 2026-09-15 el workbook Bridge está publicado y existe un Processor histórico probado de forma automatizada, pero `Processor + APP_* + Read Adapter + roundtrip` **no están integrados en recovery**. El candidate #236 / `95565e1...` es fuente de requisitos, no candidate ejecutable vigente.

La incertidumbre crítica de hoy es el seam `HTML estático -> Power Automate`: autenticación Entra efectiva, licencia, CORS/políticas del tenant, respuesta al navegador y gobierno del endpoint.
## 2. Niveles de evidencia

- **REPO:** demostrado por código/documentación Git publicada.
- **CAMPO_SES:** observado por Sil/equipo en el tenant SES; no sustituye una prueba reproducible del producto.
- **MICROSOFT:** comportamiento/limitación documentada por Microsoft Learn.
- **POR_PROBAR_HOY:** requiere ejecución real en Microsoft 365 SES.

## 3. Estado actual

| Capacidad | Estado | Evidencia |
|---|---|---|
| Pages genérica Farmacia | PUBLICADA_CANÓNICA | HTML servido = recovery actual tras normalizar EOL |
| Excel Bridge workbook | IMPLEMENTADO/VERIFICADO | PR #233; 152 columnas; hojas operativas DERMA/DIGESTIVO |
| Office Scripts en SES | VIABLE_EN_CAMPO | CAMPO_SES comunicado por Sil |
| Processor histórico | CANDIDATE_STALE | #236 / `95565e1...`; tests automatizados PASS; no mergear tal cual |
| Processor vigente integrado | NO | recovery no contiene `office-scripts/` |
| `APP_*` | NO IMPLEMENTADO | arquitectura/decisión V4 |
| Excel Read Adapter | NO IMPLEMENTADO | arquitectura/decisión V4 |
| Hub -> Excel -> Hub | NO DEMOSTRADO | gate antes de piloto |
| Power Automate -> Run script | A CONFIRMAR E2E | diseño previsto; prueba tenant pendiente |
| HTML -> Power Automate | NO PROBADO | PoC explícitamente pendiente |
| SharePoint Lists | PENDING_CONFIRMATION | evidencia de campo preliminar favorable |
| Identity Plane | NO DECIDIDO | SharePoint posible fase 0, no backend clínico asumido |
## 4. Restricciones Microsoft que condicionan la PoC

Según Microsoft Learn vigente a 2026-09-15:

- Excel Online (Business) es conector estándar y admite `Run script`.
- `Run script` admite hasta 3 llamadas/10 s y 1600 llamadas/día.
- El fichero Excel soportado por el conector tiene máximo 25 MB.
- Un workbook puede quedar bloqueado hasta aproximadamente 6 minutos tras uso del conector.
- Microsoft no soporta modificaciones simultáneas del mismo workbook desde varios clientes/conectores; puede producir conflictos e incoherencia.
- Los cambios de filas pueden tardar hasta aproximadamente 30 s en hacerse visibles.
- Office Scripts puede recibir parámetros desde Power Automate y devolver un valor/objeto en `result`.
- Si cambia la firma `main(...)`, debe recrearse/reinsertarse el bloque `Run script` para refrescar parámetros/return.
- El trigger `When an HTTP request is received` admite autenticación restringida a usuarios del tenant o usuarios específicos, además del modo legacy abierto `Anyone`.
- La disponibilidad de esa autenticación se está desplegando por regiones: debe comprobarse en el tenant SES.
- SharePoint es conector estándar de Power Automate y soporta listas genéricas y bibliotecas.
- Las acciones que modifican permisos de ítems/ficheros exigen conexión de propietario de la lista/biblioteca.
- Los conectores HTTP pueden estar afectados por políticas DLP del tenant aunque técnicamente existan.
- El historial de ejecución puede mostrar inputs/outputs; para datos sensibles deben evaluarse `Secure Inputs/Outputs`.

**Consecuencia:** un `hello world` verde no acredita un canal clínico. La PoC debe demostrar autenticación, respuesta, idempotencia, error y concurrencia segura.## 5. Qué reutilizar del Processor histórico #236

El candidate `95565e1...` sigue siendo útil como diseño de seguridad del adaptador Excel:

- preservación RAW;
- agrupación por `source_event_id`;
- idempotencia y rechazo de duplicados;
- validación de versiones/IDs/cardinalidad;
- rechazo de conflictos sin seleccionar un valor;
- tablas `AUDIT_EVENTS` e `IMPORT_ERRORS`;
- fallo seguro y rollback lógico best-effort;
- cero inferencia clínica.

Su `main` actual es:

`main(workbook: ExcelScript.Workbook): ProcessorSummary`

No acepta payload de Power Automate. Procesa filas que **ya existen** en las tablas de entrada y devuelve un resumen (`processedActs`, `rejectedActs`, `rejectedRows`, `skippedRows`).

Por tanto, hoy **no** debemos intentar integrar o mergear #236. Para probar transporte conviene crear en el tenant un script mínimo no clínico con entrada/return, demostrar el canal y usar esa evidencia para redactar después el nuevo contrato de Processor/Repository.

## 6. Regla de la reunión

Todas las pruebas de hoy usarán IDs de prueba y texto neutro (`PROMUEVE-TEST-*`). Cero CIP real, nombres, medicación, export PreSalud real, secretos o credenciales en payloads, capturas o historial de flujo.## 7. Checklist operativo — orden recomendado

### M0 — Inventario del tenant (5 min)

Marcar cada punto `PASS / FAIL / REQUIERE_IT / REQUIERE_PREMIUM / NO_PROBADO`:

1. ¿La usuaria puede crear/editar/activar un cloud flow?
2. ¿Aparece `When an HTTP request is received`?
3. ¿Aparece etiquetado como Premium en ese entorno/licencia?
4. ¿Permite guardar y activar el flow con la licencia efectiva?
5. ¿Qué modos de autenticación muestra: tenant, usuarios específicos, `Anyone`?
6. ¿Está disponible Excel Online (Business)?
7. ¿Aparecen `Run script` y, si procede, `Run script from SharePoint library`?
8. ¿Puede crear una SharePoint List genérica en el sitio previsto sin intervención IT?
9. ¿Aparece algún error de DLP, conector bloqueado o política de entorno?

**Gate M0:** no comprar licencias ni pedir IT durante la reunión. Registrar exactamente el bloqueo si existe.

### M1 — Power Automate -> Office Script (10 min)

Objetivo: demostrar automatización real, no ejecución manual desde Excel.

- Workbook sintético mínimo en una biblioteca SharePoint autorizada.
- Script temporal con `correlationId: string` y return `{ok, correlationId, processedAt}`.
- Flow ejecuta `Run script` y recupera `result`.
- PASS solo si el valor devuelto coincide exactamente y la mutación de prueba esperada es visible.### M2 — Pages genérica -> trigger HTTP (10–15 min)

Objetivo: demostrar el seam más incierto desde el origen real de PROMueve.

- Origen: `https://b32majus.github.io/Hub-Clinico-Badajoz/farmacia_index.html` o HTML mínimo servido desde el mismo origen.
- Payload neutro: `{"correlation_id":"PROMUEVE-TEST-001","kind":"ping"}`.
- Preferir trigger autenticado por Entra (`tenant` o `specific users`).
- Abrir DevTools y registrar `OPTIONS`/CORS, `POST`, status HTTP, response y errores de consola.
- PASS solo si funciona desde el navegador con un modelo de autenticación aceptable.
- Si necesita app registration/token flow no disponible para el HTML estático: `REQUIERE_IT`, no `FAIL_OFFICE_SCRIPT`.
- Si solo funciona con `Anyone`: demostrar técnicamente, pero clasificar `FAIL_SECURITY` para payload clínico.

### M3 — Transporte E2E sintético

Demostrar:

`HTML -> Power Automate -> Office Script -> workbook -> respuesta del flow -> HTML`.

Respuesta mínima recomendada: `{ok, correlation_id, status, processed_at}`.

PASS exige correlación exacta extremo a extremo; no basta con ver una fila nueva.

### M4 — Idempotencia y reintento

- Enviar dos veces el mismo `correlation_id/source_event_id` sintético.
- Primera llamada: procesada.
- Segunda: duplicado/skipped explícito.
- Cero segunda escritura clínica/lógica.
- Definir qué puede reintentar el navegador tras timeout sin fabricar duplicados.### M5 — Error y feedback al profesional

Provocar de forma sintética tres fallos: payload inválido, tabla/workbook inexistente y error deliberado de script.

Comprobar:
- status/response diferenciable del éxito;
- no mostrar falso `Guardado` en HTML;
- trazabilidad por correlation ID;
- posibilidad de reintento seguro.

### M6 — Concurrencia / single-writer

Microsoft no soporta escritura simultánea del mismo workbook desde varios clientes. Probar dos requests casi simultáneos con IDs distintos.

- Evaluar control de concurrencia del trigger/flow con grado 1 o cola serial equivalente.
- Confirmar que ambos terminan una sola vez y medir latencia.
- Probar además qué ocurre si el workbook está abierto/editándose manualmente.
- Si la solución depende de concurrencia libre sobre un único XLSX: `FAIL_ARCHITECTURE` hasta introducir serialización/cola/partición.

### M7 — Identidad

Con trigger autenticado:
- identificar qué claims/identidad del llamante llegan al flow;
- probar, si es posible, con dos usuarios SES;
- distinguir identidad del llamante de la conexión/propietario que ejecuta Excel/SharePoint;
- no aceptar `professional_email` enviado por el navegador como autoridad por sí solo;
- registrar qué dato confiable podría mapearse posteriormente al profesional PROMueve.### M8 — SharePoint Lists

Crear una lista genérica de prueba no clínica y verificar:

- quién puede crear la lista y quién solo puede editar ítems;
- create/read/update desde UI;
- create/read/update mediante el conector SharePoint de Power Automate;
- historial/versionado disponible;
- comportamiento de permisos por lista/ítem y si exige propietario;
- posibilidad de lectura/escritura desde el futuro flujo PROMueve sin Graph/app registration adicional;
- límites o políticas específicas del sitio SES.

Si PASS, usos candidatos iniciales: **Control Plane no-paciente** (profesionales, roles, servicios, patologías habilitadas, feature flags/configuración) y, si se justifica después, staging/cola técnica. No convertir por esta prueba SharePoint Lists en base clínica general ni Identity Plane definitivo.

### M9 — Privacidad / run history

- Inspeccionar qué payload queda visible en historial de ejecución.
- Verificar disponibilidad y efecto de `Secure Inputs` / `Secure Outputs`.
- Identificar quién puede leer el historial del flow.
- Confirmar que URL, secrets/tokens y datos sensibles no se hardcodean en HTML/repositorio.

### M10 — Propiedad, backup y recuperación

- Ubicación efectiva del workbook: SharePoint library/OneDrive autorizado.
- Version history y restauración de una versión anterior.
- Papelera/retención aplicable.
- Propietario y co-propietarios del flow/conexiones.
- Qué ocurre si la cuenta del maker queda deshabilitada o cambia de puesto.
- Quién puede recuperar flow, workbook y listas sin depender de una única persona.## 8. Matriz que debe salir de la reunión

| Gate | Resultado | Evidencia a guardar |
|---|---|---|
| M0 licencias/conectores/DLP | PENDIENTE | captura/nota del tenant |
| M1 Flow -> Office Script | PENDIENTE | run ID + input/output neutro |
| M2 Pages -> trigger autenticado | PENDIENTE | Network/console + auth mode |
| M3 E2E con respuesta | PENDIENTE | correlation ID extremo a extremo |
| M4 idempotencia | PENDIENTE | dos llamadas / una escritura |
| M5 error seguro | PENDIENTE | response y UI sin falso éxito |
| M6 concurrencia | PENDIENTE | dos requests + estrategia serial |
| M7 identidad | PENDIENTE | claim/caller vs owner connection |
| M8 SharePoint Lists | PENDIENTE | create/read/update + permisos |
| M9 privacidad | PENDIENTE | run history / secure I/O |
| M10 backup/ownership | PENDIENTE | version restore + ownership |

Valores permitidos: `PASS`, `FAIL`, `REQUIERE_IT`, `REQUIERE_PREMIUM`, `NO_PROBADO`.

## 9. Decisiones después de la reunión

- Si M1–M6 son PASS con autenticación segura y serialización: mantener Excel Bridge + Office Scripts + Power Automate como ruta V4 prioritaria y diseñar nueva WO de persistencia completa.
- Si Office Script funciona pero M2 requiere app registration/IT: Office Scripts siguen viables; solo queda bloqueado el transporte directo desde Pages. No confundir ambos problemas.
- Si el trigger solo funciona como `Anyone`: no usarlo para datos clínicos; buscar una ruta autenticada o un frontend/servicio institucional.
- Si M8 es PASS sin fricción IT: elevar SharePoint Lists a candidato fuerte para Control Plane y configuración profesional; mantener separada la decisión sobre datos clínicos/Identity Plane.
- Si Excel no admite la concurrencia prevista incluso serializando: estudiar staging/cola o partición por hospital/servicio antes de piloto.

No abrir una WO técnica de Processor/APP_*/roundtrip hasta reconciliar estos resultados.## 10. Fuentes Microsoft consultadas

Documentación oficial vigente consultada el 2026-09-15:

- OAuth en `When an HTTP request is received`: https://learn.microsoft.com/en-us/power-automate/oauth-authentication
- Protección de inputs/outputs y trigger HTTP: https://learn.microsoft.com/en-us/power-automate/guidance/coding-guidelines/use-secure-inputs-outputs-triggers
- Parámetros y return de Office Scripts en Power Automate: https://learn.microsoft.com/en-us/office/dev/scripts/develop/power-automate-parameters-returns
- Excel Online (Business) connector y límites: https://learn.microsoft.com/en-us/connectors/excelonlinebusiness/
- SharePoint connector: https://learn.microsoft.com/en-us/connectors/sharepoint/
- Licencias Power Automate: https://learn.microsoft.com/en-us/power-platform/admin/power-automate-licensing/faqs
- Clasificación/DLP de conectores: https://learn.microsoft.com/en-us/power-platform/admin/dlp-connector-classification

## 11. Límites de esta auditoría

No se ha probado el tenant SES desde el VPS y no se ha modificado ningún flow, workbook, script o lista institucional. Las afirmaciones `CAMPO_SES` proceden de la evidencia comunicada por Sil y quedan separadas de las comprobaciones reproducibles.

Esta auditoría no acredita piloto ni producción. Tampoco decide todavía SharePoint como backend, Identity Plane, PostgreSQL, Supabase o V5.

**VERDICT:** `MICROSOFT_V4_READINESS_PREMEETING_PASS_WITH_TENANT_GATES_PENDING`.
