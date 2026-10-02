# WO-DOC-PROMUEVE-SES-INFRA-DISCOVERY-20261002

**Tipo:** WO documental atómica  
**Fecha:** 2026-10-02  
**Estado:** `DOCUMENTATION_CANDIDATE / NOT_MERGED`  
**Repo:** `b32majus/Hub-Clinico-Badajoz`  
**Base publicada verificada:** `recovery/farmacia-pr-replay-20260727` @ `a8cec03522017a1f4b68e18b92c944601659c84f`  
**Rama candidata:** `docs/promueve-ses-infra-discovery-20261002`

## Objetivo y contexto

Recoger de forma durable, sin convertir hipótesis en decisiones institucionales, la nueva ventana de discovery abierta con el SES el 2026-10-02: permisos Microsoft 365 potencialmente disponibles, alternativas de persistencia/automatización, captura PROM/PREM mediante Microsoft Forms + Power Automate, uso potencial de SharePoint List como cola técnica, carpeta compartida hospitalaria, On-premises Data Gateway, VM/API/DB futura, backup/DR e interoperabilidad.

El documento resultante debe servir para:

- preparar una PoC sintética antes de la reunión del 2026-10-09 con SESATIC Cáceres;
- dirigir la conversación técnica con lenguaje comprensible y terminología correcta;
- distinguir evidencia ya demostrada, información reportada y cuestiones pendientes de verificar;
- preservar las decisiones del Architecture Freeze 2026-09-24;
- no duplicar el diseño existente de captura PROM seudonimizada.

## Preflight

- GitHub live verificado antes de escribir.
- Rama publicada de Farmacia: `recovery/farmacia-pr-replay-20260727`.
- HEAD live al abrir esta WO: `a8cec03522017a1f4b68e18b92c944601659c84f`.
- `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, `docs/architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md` y `docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md` revisados.
- Confirmado que ya existe `docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`; esta WO no lo reescribe ni lo sustituye.

## Rutas

### CREA

- `docs/discovery/PROMUEVE_SES_INFRA_AUTOMATION_DISCOVERY_20261002.md`
- `docs/ops/WO-DOC-PROMUEVE-SES-INFRA-DISCOVERY-20261002.md`

### NO TOCA

- código/runtime;
- `main`;
- snapshots Cáceres;
- contratos clínicos;
- datos demo/workbooks;
- Architecture Freeze/ADR;
- diseño canónico de token/QR PROM;
- configuración M365/SES real;
- permisos, tenant, Entra, Gateway, firewall, VM o infraestructura institucional;
- datos reales de pacientes.

## Reversión

Mientras la candidata no esté integrada, la reversión consiste en no promoverla. Si se integrase posteriormente y se detectara error documental material, usar commit de reversión o WO documental correctiva; no force-push ni reescritura destructiva.

## QA documental

- comprobar que todos los estados se clasifican como `DEMOSTRADO`, `REPORTADO`, `PROPUESTO` o `POR VERIFICAR`;
- no presentar Power Automate Premium, SharePoint R/W, Gateway, VM, FHIR/openEHR/HL7 o backup institucional como concedidos si aún no se han verificado;
- usar `seudonimización`, no `anonimización`, cuando la identidad pueda recuperarse;
- enlazar, no duplicar, el contrato exploratorio de QR/token existente;
- mantener datos reales fuera de la PoC;
- distinguir seguridad informática, protección de datos/gobernanza e integridad/disponibilidad;
- distinguir sincronización de backup y disaster recovery.

## Criterios de aceptación

1. Existe un único documento de discovery que resume el estado y la propuesta de 2026-10-02.
2. Incluye el diseño candidato `Forms → Power Automate → SharePoint List → procesador → destino PROMueve`.
3. Incluye alternativas M365, file server/Gateway y VM/API/DB sin adjudicar una como arquitectura final.
4. Incluye permisos inmediatos a solicitar y cuestiones a llevar a la reunión del 2026-10-09.
5. Incluye backup/DR e interoperabilidad como discovery institucional.
6. Referencia el diseño PROM seudonimizado existente sin redefinirlo.
7. No modifica runtime ni declara piloto, producción o autorización de datos reales.

## Política de commit, push, PR y merge

La instrucción de la usuaria autoriza dejar esta documentación en GitHub. Se autoriza rama documental y publicación de la candidata en esa rama. No se presupone autorización para PR ni merge a `recovery`; cualquier integración posterior requiere frontera humana explícita y, si se abre PR, issue relacionado con `status:approved` conforme a la gobernanza del repo.

## Output esperado

- documento de discovery publicado en rama remota;
- reporte final con rama y commit(s);
- INDEX/WOS no se presentan como reconciliados/publicados hasta que exista integración autorizada.