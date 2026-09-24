# PROMueve — Backlog vivo de producto y arquitectura

**Estado:** vivo / operativo
**Fecha de creación:** 2026-09-19
**Última reconciliación:** 2026-09-24
**Ámbito:** familia PROMueve / Hub Clínico
**Base documental al crear este registro:** `recovery/farmacia-pr-replay-20260727`
**Rama Reuma de referencia:** `feature/reuma-v2-prebiologico-fh-les-sjogren`

## 1. Propósito

Este documento recoge ideas y evoluciones pendientes que todavía no son deuda técnica confirmada ni Work Orders autorizadas, pero que deben conservar suficiente contexto como para poder convertirse más adelante en una decisión, issue o WO sin depender de conversaciones externas.

No debe funcionar como una lista telegráfica de títulos. Cada entrada debe explicar, como mínimo:

- el problema u oportunidad que la origina;
- el estado actual del producto relevante;
- la dirección propuesta;
- por qué importa;
- qué queda explícitamente fuera de alcance;
- cuándo debe resolverse;
- qué evidencia o criterio permitiría considerarla cerrada;
- qué documentos, módulos o decisiones existentes debe respetar.

El objetivo es evitar dos fallos opuestos:

1. implementar demasiado pronto ideas que todavía son solo propuestas;
2. olvidar decisiones arquitectónicas importantes y tener que reconstruir meses después por qué se consideraron necesarias.

## 2. Relación con otros registros

### 2.1 Deuda técnica

`docs/ops/FARMACIA_DEBT_REGISTER.md` conserva únicamente deuda real aceptada y pendiente de Farmacia, con riesgo concreto y criterio de cierre. Una idea futura no debe entrar allí solo por no estar implementada.

Ejemplo:

- «Reuma no tiene todavía Read Port» = backlog arquitectónico.
- «La implementación actual de Reuma pierde o corrompe datos por ese acoplamiento» = podría convertirse en deuda si se demuestra el riesgo real.

### 2.2 Roadmap

`docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md` define dirección estratégica, fases y arquitectura objetivo. Este backlog baja un nivel: conserva unidades suficientemente concretas como para poder analizarlas y convertirlas después en issues/WOs.

### 2.3 Documentos históricos

`docs/MEJORAS_PROPUESTAS.md` se mantiene como documento histórico de marzo de 2026. No se reutiliza como backlog vivo porque mezcla bugs, UX, diseño visual y una concepción de Farmacia ya superada por la arquitectura V4 actual.

### 2.4 Issues y Work Orders

El flujo esperado para una entrada es:

```text
IDEA
  ↓
PROPOSED
  ↓
APPROVED
  ↓
ISSUE / WORK ORDER
  ↓
IMPLEMENTED
```

También son estados válidos `DEFERRED`, `SUPERSEDED` y `REJECTED`.

El hecho de aparecer aquí no autoriza implementación.

## 3. Tipos y timing

Tipos recomendados:

- `ARCHITECTURE`
- `FEATURE`
- `DATA`
- `INTEGRATION`
- `INTEROPERABILITY`
- `PRIVACY`
- `QUALITY`
- `AUTOMATION`
- `UX`

Timing recomendado:

- `NOW`
- `BEFORE_CLOUD_PILOT`
- `BEFORE_REAL_PATIENTS`
- `BEFORE_HOSPITAL_DB`
- `WHEN_NEEDED`
- `LATER`

El timing es un gate, no una fecha prometida.

## Evidencia de entorno SES — 2026-09-17

Estas pruebas son **evidencia técnica/operativa**, no decisiones de arquitectura aprobadas ni autorización para datos reales:

- GitHub Pages → trigger HTTP de Power Automate: bloqueado en el tenant por requisito de Power Automate Premium para el propietario del flujo. No fue un fallo de JSON/CORS del Hub.
- SharePoint List → trigger/acción SharePoint de Power Automate Standard: PASS funcional con datos sintéticos (`PENDING` → `PROCESSED`). Demuestra automatización M365 interna sin Premium, no obliga a usar SharePoint como Data Plane.
- GitHub Pages → Graph/SharePoint directo: viable solo con identidad/aplicación Entra adecuada; el usuario no dispone de acceso a App Registrations, por lo que la ruta quedó bloqueada operacionalmente.
- OneDrive o carpeta SharePoint sincronizada por puesto: descartado como vía operativa actual porque los usuarios objetivo no disponen de OneDrive y no se quiere depender de una carpeta sincronizada en cada PC.
- File System Access API desde GitHub Pages → recurso compartido hospitalario: PASS de PoC para permiso explícito y creación de un archivo sintético en una carpeta de red autorizada. Esto demuestra acceso de fichero desde el navegador; **no** demuestra backend multiusuario, transacciones, concurrencia segura, auditoría clínica ni aptitud para piloto.
- Un Excel compartido puede leerse/escribirse como fichero, pero eso no equivale a SQL ni resuelve por sí solo concurrencia/lost updates. No se adopta un XLSX compartido como base transaccional por esta prueba.
- La arquitectura institucional futura sigue separando frontend y base de datos mediante una API/servicio autorizado; nunca se colocan credenciales SQL/PostgreSQL en el navegador ni se conecta el frontend directamente al puerto de base de datos.

La carpeta compartida queda registrada como una capacidad de almacenamiento central observable que puede informar futuros adaptadores, no como sustituto decidido de una base de datos.

---

# Entradas vivas

## PROM-ARCH-001 — Formalizar el patrón Read Port de PROMueve

**Tipo:** `ARCHITECTURE`
**Estado:** `PROPOSED`
**Timing:** `BEFORE_CLOUD_PILOT`

### Contexto

Farmacia ya dispone de un contrato de lectura versionado, `FarmaciaApplicationDataPort`, y de una implementación concreta, `FarmaciaRawExcelDataSource`, que permite que la UI consuma capacidades de aplicación sin conocer directamente el mecanismo físico de persistencia.

La dirección arquitectónica que queremos consolidar es:

```text
UI / Experience Plane
        │
        ▼
Application Read Port
        │
   ┌────┼─────────────┐
   │    │             │
   ▼    ▼             ▼
 Excel  Cloud API   Hospital API
```

El Port no debe ser «una API genérica que sabe de todo». Debe expresar las necesidades de lectura del dominio correspondiente. Farmacia y Reuma pueden compartir el patrón, pero no necesariamente los mismos métodos.

### Problema que resuelve

Sin esta frontera, la UI termina dependiendo de nombres de hojas, columnas Excel, estructuras de `sessionStorage` o detalles de una API concreta. Eso convierte cualquier cambio futuro de Excel a Neon o SQL Server en un refactor transversal.

### Dirección propuesta

Cada módulo clínico debe exponer un contrato estable de lectura orientado a casos de uso, por ejemplo:

```text
listPatients()
findPatientByIdentifier()
getPatientProjection()
getPatientHistory()
getTreatments()
getVisits()
getPopulationProjection()
```

La implementación física queda detrás del Port.

### No alcance

- No obliga a que Farmacia y Reuma tengan contratos idénticos.
- No implica todavía introducir backend.
- No obliga a React/TypeScript.
- No elimina Excel.

### Criterio de cierre

El patrón podrá considerarse formalizado cuando:

1. exista contrato documentado por módulo;
2. la UI no necesite conocer el origen físico para los casos de lectura cubiertos;
3. exista al menos una implementación Excel que preserve el comportamiento actual;
4. existan contract tests que permitan sustituir la implementación sin cambiar consumidores.

### Referencias actuales

- `scripts/farmacia_application_data_port.js`
- `scripts/farmacia_raw_excel_data_source.js`
- `docs/ROADMAP_ARQUITECTURA_HUB_PROMUEVE_POST_SES.md`

---

## PROM-ARCH-002 — Formalizar Write/Event Port independiente del destino físico

**Tipo:** `ARCHITECTURE`
**Estado:** `PROPOSED`
**Timing:** `BEFORE_CLOUD_PILOT`

### Contexto

Farmacia ya separa gran parte de la escritura mediante Export v2: los formularios se proyectan a eventos/filas canónicas versionadas y después se transportan al Excel Bridge. Sin embargo, la abstracción pública sigue expresándose principalmente como Export y no como un Port de persistencia explícito.

La evolución deseada es que la aplicación exprese:

```text
"quiero registrar este acto"
```

y no:

```text
"quiero generar una fila Excel"
```

### Dirección propuesta

Conservar el modelo event-driven de Farmacia y formalizar una frontera equivalente a:

```text
Clinical UI
    │
    ▼
Canonical Event
    │
    ▼
Write / Event Port
    │
 ┌──┼──────────────┐
 │  │              │
 ▼  ▼              ▼
Excel Cloud API  Hospital API
```

Un contrato conceptual mínimo podría ser `commit(event)`, aunque su forma definitiva debe decidirse por dominio y no se da por aprobada en esta entrada.

### Por qué importa

Esto permite que Excel, Neon y una API hospitalaria sean destinos intercambiables sin convertir la infraestructura de persistencia en lógica clínica.

### No alcance

- No diseñar todavía el endpoint REST definitivo.
- No elegir ORM.
- No elegir Neon como solución productiva definitiva.
- No retirar salidas TXT/JARA/Excel que tengan valor operativo propio.

### Criterio de cierre

1. evento o comando de escritura definido antes del adaptador físico;
2. Excel implementado como adaptador, no como dominio;
3. capacidad de añadir un adaptador API sin modificar formularios;
4. pruebas de paridad sobre los actos principales.

---

## PROM-ARCH-003 — Llevar Read Port a Reuma sin big-bang refactor

**Tipo:** `ARCHITECTURE`
**Estado:** `PROPOSED`
**Timing:** `BEFORE_CLOUD_PILOT`

### Estado actual comprobado

En `feature/reuma-v2-prebiologico-fh-les-sjogren`, `modules/dataManager.js` combina hoy varias responsabilidades:

- lectura de `.xlsx` mediante SheetJS;
- conocimiento explícito de hojas `AR`, `ESPA`, `APS`, `LES`, `SJOGREN`;
- normalización;
- almacenamiento en memoria;
- caché en `sessionStorage`;
- consultas por paciente e historia;
- datos poblacionales y parte de las proyecciones para dashboards.

La superficie pública de `HubTools.data` ya actúa como una interfaz informal:

- `getAllPatients()`
- `findPatientById()`
- `getPatientHistory()`
- `getPoblationalData()`
- `getProfesionales()`
- `getFarmacosPorTipo()`

La propia `ARCHITECTURE.md` de Reuma reserva una `repository layer` para la evolución backend-ready, pero esa separación todavía no está implementada.

### Estrategia propuesta

No hacer una reescritura masiva. Introducir primero una costura compatible:

```text
UI Reuma
   │
   ▼
ReumaApplicationDataPort
   │
   ▼
LegacyReumaDataAdapter
   │
   ▼
HubTools.data actual
```

Después extraer progresivamente:

```text
ReumaApplicationDataPort
   │
   ▼
ReumaExcelDataSource
   │
   ▼
SheetJS / workbook
```

Solo entonces sería necesario añadir:

```text
ReumaCloudApiDataSource
ReumaHospitalApiDataSource
```

### Objetivo

Que dashboards, buscador, primera visita y seguimiento consuman el Port y no sepan si la información procede de Excel, Neon o SQL Server.

### No alcance

- No rediseñar los formularios.
- No cambiar el contrato clínico de Reuma.
- No sustituir Excel durante esta refactorización.
- No introducir simultáneamente una base de datos.

### Criterio de cierre

Paridad funcional completa del adaptador Excel frente al comportamiento anterior, con pruebas sobre búsqueda, historial, dashboard, estadísticas, catálogos y profesionales.

---

## PROM-ARCH-004 — Llevar Write/Event Port y evento canónico a Reuma

**Tipo:** `ARCHITECTURE`
**Estado:** `PROPOSED`
**Timing:** `BEFORE_CLOUD_PILOT`

### Estado actual comprobado

`modules/exportManager.js` de Reuma conoce directamente la forma física de salida. Mantiene:

- `FINAL_V2_EXPORT_COLUMN_COUNT = 497`;
- generadores específicos por patología y tipo de visita;
- posiciones y cabeceras del Excel;
- construcción directa de filas TSV/CSV;
- clipboard y UX post-export.

Ejemplos:

- `generarFilaCSV_AR_PrimeraVisita()`
- `generarFilaCSV_AR_Seguimiento()`
- equivalentes para APs, EspA, LES y Sjögren.

Hoy el flujo conceptual es:

```text
Formulario
   │
   ▼
exportManager
   │
   ▼
fila Excel de 497 columnas
```

### Dirección propuesta

Separar tres responsabilidades:

```text
Formulario
   │
   ▼
Evento/acto canónico Reuma
   │
   ▼
Write/Event Port
   │
   ▼
ExcelWriteAdapter
   │
   ▼
fila compatible con contrato actual
```

Posteriormente podrán añadirse:

```text
CloudApiWriteAdapter
HospitalApiWriteAdapter
```

### Principio crítico

La fila de 497 columnas debe convertirse en una representación de transporte, no en la definición conceptual del acto clínico.

Esto sigue el aprendizaje ya aplicado en Farmacia, donde las 152 columnas de Export v2 no son el esquema relacional final.

### Estrategia incremental

Primera etapa:

```text
ReumaWritePort
   ↓
LegacyExcelWriteAdapter
   ↓
exportManager actual
```

Segunda etapa: extraer del `exportManager` la representación canónica y dejar en él únicamente adaptadores/presentación.

### Criterio de cierre

- misma salida Excel que antes;
- ningún cambio clínico silencioso;
- tests de equivalencia por patología y tipo de visita;
- posibilidad demostrada de implementar un segundo adaptador sin tocar formularios.

---

## PROM-ARCH-005 — Mantener Excel como adaptador de primera clase, no como etapa desechable

**Tipo:** `ARCHITECTURE`
**Estado:** `PROPOSED`
**Timing:** `BEFORE_CLOUD_PILOT`

### Decisión a preservar

La evolución no debe entenderse necesariamente como:

```text
Excel → Neon → SQL Server
```

donde cada etapa elimina la anterior.

El objetivo es permitir despliegues distintos del mismo producto:

```text
                 PROMueve
                    │
          Persistence adapters
             ┌──────┼───────┐
             ▼      ▼       ▼
           Excel   Neon   Hospital API
```

### Casos de uso

- hospital sin infraestructura backend autorizada: Excel local;
- demo/piloto técnico cloud con datos aptos para ello: Neon/API;
- hospital con infraestructura institucional: API + SQL Server/PostgreSQL.

### Consecuencia

Los adaptadores deben ser suficientemente equivalentes para que la experiencia y el dominio no se bifurquen en productos distintos.

### Criterio de cierre

No se considera cerrado por tener tres tecnologías disponibles. Se considera cerrado cuando las capacidades declaradas del Port tienen comportamiento equivalente o diferencias explícitamente documentadas por modo.

---

## PROM-DATA-001 — Adaptador cloud para piloto V2 con Neon u otra base gestionada

**Tipo:** `DATA`
**Estado:** `IDEA`
**Timing:** `WHEN_NEEDED`

### Objetivo

Disponer de una persistencia multiusuario gestionada para desarrollo/evaluación sin administrar servidores propios.

Neon es actualmente un candidato especialmente interesante por permitir PostgreSQL gestionado y una evolución sencilla desde frontends estáticos, pero esta entrada no lo convierte en dependencia permanente ni solución clínica productiva.

### Arquitectura objetivo

```text
Static frontend
      │
      ▼
API / backend boundary
      │
      ▼
Managed PostgreSQL
```

El navegador no debe contener credenciales PostgreSQL con privilegios de escritura ni hablar directamente con la base clínica.

### Condición previa

Read/Write Ports suficientemente estabilizados para que el adaptador cloud no contamine UI o dominio con detalles de Neon.

### Datos

El uso con información clínica real requiere decisión específica de gobierno, seguridad, contrato, RGPD y entorno autorizado. Un proveedor técnicamente capaz no implica autorización clínica.

---

## PROM-INTEG-001 — Adaptador hospitalario mediante API local y SQL Server/PostgreSQL institucional

**Tipo:** `INTEGRATION`
**Estado:** `IDEA`
**Timing:** `BEFORE_HOSPITAL_DB`

### Objetivo

Permitir que PROMueve use una base de datos dentro de infraestructura hospitalaria sin que el frontend conozca el motor físico.

### Arquitectura

```text
Browser
   │
 HTTPS
   ▼
Hospital API
   │
 private DB connection
   ▼
SQL Server / PostgreSQL
```

Nunca:

```text
Browser → SQL Server :1433
```

### Principio

El frontend debe consumir el mismo contrato de aplicación independientemente de que la implementación hospitalaria utilice SQL Server, PostgreSQL u otra tecnología autorizada.

### Requisitos futuros

- autenticación y autorización institucional;
- TLS;
- auditoría;
- permisos mínimos;
- control de concurrencia;
- política de backup/restore;
- APIs versionadas;
- migraciones de esquema controladas.

### No alcance

No seleccionar ahora framework backend, mecanismo SSO ni esquema físico definitivo.

---

## PROM-PRIV-001 — Mantener el hosting estático fuera del data plane clínico

**Tipo:** `PRIVACY`
**Estado:** `PROPOSED`
**Timing:** `BEFORE_REAL_PATIENTS`

### Contexto

GitHub Pages, Render Static u otro host estático pueden distribuir HTML/CSS/JS sin recibir por ello los datos que el usuario carga o procesa localmente.

En el modelo local:

```text
Static host
    │
    │ HTML/CSS/JS
    ▼
Browser hospital
    │
    ▼
Excel local
```

En el modelo institucional:

```text
Static host
    │
    │ HTML/CSS/JS
    ▼
Browser hospital
    │
    ▼
Hospital API
    │
    ▼
Hospital DB
```

En ambos casos el host estático queda fuera del flujo clínico siempre que el JavaScript no envíe datos a terceros.

### Requisitos

Antes de usar datos reales debe verificarse explícitamente ausencia o configuración segura de:

- analytics que capturen contexto clínico;
- session replay;
- error tracking con payloads;
- logging remoto de formularios;
- IDs o información clínica en URLs/querystrings;
- APIs externas no autorizadas;
- dependencias que transmitan datos clínicos inesperadamente.

### Criterio de cierre

Una revisión reproducible de network/privacy debe demostrar qué peticiones externas realiza el frontend y que los datos clínicos no alcanzan el proveedor de hosting estático ni terceros no autorizados.

---

## PROM-QUAL-001 — Contract tests y pruebas de paridad entre adaptadores

**Tipo:** `QUALITY`
**Estado:** `PROPOSED`
**Timing:** `BEFORE_CLOUD_PILOT`

### Problema

Tener Ports no sirve si cada implementación interpreta los datos de forma distinta.

### Objetivo

Definir una batería compartida de comportamiento esperado para cada Port. El mismo conjunto de casos debe poder ejecutarse contra:

- Excel;
- API cloud;
- API hospitalaria.

### Ejemplos de invariantes

- misma búsqueda por identificador;
- misma ordenación/selección de visitas;
- misma representación de ausencia;
- mismos IDs técnicos;
- mismas cardinalidades 1:N;
- misma reconstrucción longitudinal;
- mismo comportamiento ante duplicados;
- misma distinción entre `false`, `0`, vacío y `not_recorded`;
- escritura idempotente cuando corresponda.

### Criterio de cierre

Un nuevo adaptador no se considera apto por «funcionar» manualmente; debe superar el contrato de comportamiento correspondiente.

---

## PROM-ARCH-006 — Configuración explícita del modo de persistencia

**Tipo:** `ARCHITECTURE`
**Estado:** `IDEA`
**Timing:** `WHEN_NEEDED`

### Oportunidad

Cuando existan varios adaptadores, la selección del modo no debe resolverse mediante bifurcaciones dispersas por las pantallas.

Debe existir una única composición/configuración de aplicación que seleccione, por despliegue:

```text
local-excel
cloud-api
hospital-api
```

La UI debería recibir un Port ya construido y no preguntar repetidamente «qué backend tengo».

### No alcance

No diseñar ahora un panel de administración para cambiar el backend en caliente. En muchos despliegues la selección será una decisión de build/configuración institucional, no una opción visible para el profesional.

---

## PROM-ARCH-007 — Conservar separación entre dominio, transporte y almacenamiento

**Tipo:** `ARCHITECTURE`
**Estado:** `PROPOSED`
**Timing:** `BEFORE_CLOUD_PILOT`

### Principio

PROMueve debe distinguir sistemáticamente:

1. **dominio:** qué significa el acto clínico;
2. **transporte:** cómo se representa para moverlo entre capas;
3. **almacenamiento:** cómo se persiste físicamente.

Farmacia ya ofrece un ejemplo útil:

- evento clínico canónico;
- fila TSV de 152 columnas como transporte reversible;
- Processor que descompone en entidades relacionales;
- futuro PostgreSQL que debe migrar entidades, no copiar ciegamente la fila ancha.

Reuma debe evolucionar con el mismo principio aunque su dominio sea diferente.

### Riesgo que evita

Convertir el Excel ancho en «la base de datos conceptual» y después replicar sus 497 columnas en SQL.

---

# 4. Notas específicas por módulo

## Farmacia

Piezas ya existentes que deben preservarse como referencia:

- `FarmaciaApplicationDataPort`;
- `FarmaciaRawExcelDataSource`;
- Export v2 canonical core;
- adaptadores de Validación, Primera Visita y Seguimiento;
- esquema relacional del Excel Bridge;
- Processor Office Script candidate;
- decisión explícita de migrar a PostgreSQL/servidor local mediante el mismo Data Port.

Pendiente importante: formalizar el Write/Event Port como frontera de aplicación y no únicamente como infraestructura de exportación.

## Reuma

Situación actual:

- lectura y fuente Excel todavía acopladas en `modules/dataManager.js`;
- escritura y representación física de 497 columnas todavía acopladas en `modules/exportManager.js`;
- `HubTools.data` ofrece una interfaz informal aprovechable para una migración incremental;
- `ARCHITECTURE.md` ya sitúa una `repository layer` en la evolución backend-ready.

Dirección: introducir primero Ports/wrappers compatibles y extraer después los adaptadores, evitando un refactor masivo simultáneo.

---

# 5. Regla de mantenimiento de este backlog

Al añadir una entrada nueva:

1. explicar el contexto suficiente para entenderla sin conversación externa;
2. enlazar módulos/documentos actuales que motivan la propuesta;
3. marcar claramente si es `IDEA`, `PROPOSED` o `APPROVED`;
4. indicar timing/gate;
5. separar «qué queremos conseguir» de «cómo creemos hoy que podría implementarse»;
6. evitar convertir una tecnología candidata en una decisión irreversible;
7. cuando se cree una WO, enlazarla desde esta entrada;
8. cuando se implemente, conservar la entrada como `IMPLEMENTED` con referencias de issue/PR/commit;
9. si una propuesta queda superada, marcar `SUPERSEDED` y explicar por qué; no borrarla sin trazabilidad.

La finalidad es que el backlog funcione como memoria de producto y arquitectura, no como cementerio de títulos.
