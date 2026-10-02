# PROMueve Nexus — Discovery SES de infraestructura, automatización y captura PROM/PREM

| Metadato | Valor |
| --- | --- |
| Fecha | 2026-10-02 |
| Estado | `DISCOVERY_LIVE / NO INSTITUTIONAL DECISION YET` |
| Tipo | Evidencia de discovery + propuesta técnica candidata |
| Base publicada al abrir | `recovery/farmacia-pr-replay-20260727` @ `a8cec03522017a1f4b68e18b92c944601659c84f` |
| Próximo hito | reunión SESATIC Cáceres — 2026-10-09 |
| Datos reales | **NO autorizados por este documento** |
| Piloto/producción | **NO acreditados** |
| Autoridad | Architecture Decision Freeze 2026-09-24 + ADR vigentes; este documento no los sustituye |

> Este documento recoge la nueva ventana institucional comunicada el 2026-10-02 y organiza las pruebas y preguntas siguientes. Distingue lo demostrado, lo reportado, lo propuesto y lo pendiente de verificar. No convierte predisposición institucional en autorización de piloto ni en aprobación de uso de datos reales.

## 1. Por qué se abre este discovery

Durante septiembre PROMueve había explorado varias vías para automatizar lectura/escritura sin backend propio. El 2026-10-02 se comunica un cambio material de contexto: existe predisposición institucional para ampliar permisos Microsoft 365 y estudiar de forma conjunta alternativas de persistencia y automatización con SESATIC.

El objetivo inmediato no es elegir una arquitectura final, sino aprovechar esta ventana para:

1. construir una PoC sintética pequeña y demostrable;
2. caracterizar qué infraestructura y garantías ofrece realmente el SES;
3. comparar rutas sin sobrearquitectura;
4. llegar a la reunión del 2026-10-09 con evidencia y preguntas concretas;
5. preservar seams compatibles con el Architecture Freeze.

## 2. Estado factual al 2026-10-02

### 2.1 `DEMOSTRADO` previamente en entorno exploratorio

- Office Scripts está habilitado y se ha probado desde varios ordenadores del entorno hospitalario.
- SharePoint List + Power Automate Standard se probó en septiembre como circuito de automatización básico dentro de Microsoft 365.
- File System Access API consiguió escribir un artefacto sintético en una carpeta compartida hospitalaria durante una prueba exploratoria.

Estas pruebas demuestran capacidades acotadas. **No demuestran por sí solas** lectura/escritura clínica bidireccional completa, concurrencia multiusuario, auditoría suficiente, recuperación, protección de datos aprobada para el caso PROMueve ni aptitud de piloto.

### 2.2 `REPORTADO` / pendiente de verificación formal

- Se espera poder conceder **Power Automate Premium** a una profesional del SES implicada en las pruebas, no a una cuenta externa.
- Se espera disponer de permisos de lectura/escritura en **OneDrive/SharePoint** dentro del entorno corporativo SES.
- Desde conversaciones con Cáceres y Mérida se considera viable explorar acceso a carpeta compartida hospitalaria.
- Los equipos clínicos transmiten confianza en el entorno Microsoft 365 corporativo para información asistencial; el alcance concreto aplicable a PROMueve debe confirmarse institucionalmente.
- Existe interés creciente de equipos de calidad, Farmacia Hospitalaria y otros servicios en disponer de lectura/escritura automatizada.

### 2.3 `NO SOLICITAR AHORA`

- App Registration / Entra ID para una aplicación PROMueve.
- traslado del frontend PROMueve a infraestructura SES;
- provisión inmediata de VM/backend/DB;
- uso de datos reales;
- integración JARA/FHIR/openEHR/HL7 real.

Estas vías no se rechazan. Se difieren hasta que aporten valor y exista interlocución/autoridad apropiada.

## 3. Estrategia en dos fases

### Fase 1 — antes de la reunión del 2026-10-09

Prioridad de permisos:

1. **Power Automate Premium** para la cuenta SES autorizada que hará la PoC.
2. **SharePoint/OneDrive lectura + escritura** en un espacio de pruebas autorizado.
3. Mantener **Office Scripts**, ya disponible.

Objetivo: demostrar con **datos 100 % sintéticos** un recorrido pequeño, trazable y recuperable.

No se necesita todavía mover PROMueve de su hosting estático actual. Durante desarrollo, mantener el frontend fácilmente actualizable reduce fricción y permite iterar en tiempo real.

### Fase 2 — reunión y discovery posterior

Caracterizar con SESATIC:

- carpeta compartida/file server hospitalario;
- On-premises Data Gateway;
- backup, snapshots, restauración y disaster recovery;
- disponibilidad futura de VM/API/base institucional;
- DNS/HTTPS/firewall si algún día existe API interna;
- estándares/identificadores de interoperabilidad;
- owners y soporte institucional.

## 4. Rutas de infraestructura candidatas

No son tres productos rivales. Son niveles/adapters que PROMueve Nexus puede soportar si cada uno demuestra sus capacidades.

### Ruta A — Microsoft 365

```text
PROMueve / Microsoft Forms
          ↓
Power Automate
          ↓
SharePoint / OneDrive / Office Scripts
```

**Lenguaje sencillo:** usar las herramientas Microsoft corporativas del SES para recibir, procesar y guardar información automáticamente.

**Fortalezas candidatas:** identidad corporativa, permisos, políticas del tenant, trazabilidad Microsoft, versionado/restauración según configuración y bajo coste de entrada.

**A verificar:** política DLP, ownership, retención, auditoría aplicable, uso autorizado para el caso concreto, semántica de persistencia e integridad del destino.

### Ruta B1 — navegador → carpeta hospitalaria

```text
PROMueve en navegador
        ↓
File System Access API
        ↓
carpeta compartida hospitalaria
```

**Lenguaje sencillo:** el navegador escribe directamente en una carpeta de red del hospital que el usuario ha autorizado.

La escritura sintética ya fue demostrada exploratoriamente. Falta caracterizar lectura soportada, persistencia de permisos, relectura semántica, locking, auditoría, recuperación y operación multiusuario.

### Ruta B2 — Power Automate → Gateway → file server hospitalario

```text
Microsoft Forms / PROMueve
          ↓
Power Automate
          ↓
On-premises Data Gateway
          ↓
File System / carpeta compartida SES
```

**Lenguaje sencillo:** Microsoft 365 automatiza el trabajo, pero el destino final puede seguir estando en los servidores internos del hospital.

Es una vía especialmente interesante si el SES ya dispone de Gateway o acepta habilitarlo. **A día 2026-10-02 no está demostrado ni concedido.**

Pregunta de discovery para 2026-10-09:

> ¿Existe ya un On-premises Data Gateway de Power Platform en el SES? Si existe, ¿quién lo gestiona y permitiría una prueba sintética futura contra una carpeta de red autorizada?

### Ruta C — VM interna + API + base de datos

```text
puestos SES
    ↓ HTTPS
API PROMueve en VM institucional
    ↓
base de datos institucional
```

**Lenguaje sencillo:** en vez de escribir directamente en archivos, un pequeño servidor interno recibe las operaciones, comprueba lo necesario y las guarda de forma estructurada.

Esta es una opción futura robusta para multiusuario, pero **no se solicita ahora**. Si el SES ofreciera una VM, el backend/API podría ser desarrollado/desplegado por personal propio, proveedor habitual del SES o experto externo bajo autorización y gobernanza del SES.

Un servidor físico dedicado o un Mac Mini no son la primera opción mientras existan alternativas institucionales. Son fallback, no requisito actual.

## 5. Tres dimensiones de seguridad que no deben mezclarse

| Dimensión | Pregunta que responde | Ejemplos |
| --- | --- | --- |
| **Ciberseguridad / acceso** | ¿quién puede entrar y por dónde? | identidad, permisos, cifrado, red, firewall, malware |
| **Protección de datos / gobernanza** | ¿está autorizado tratar estos datos aquí y bajo qué reglas? | DLP, minimización, retención, auditoría, roles, finalidad, aprobación institucional |
| **Integridad / disponibilidad** | ¿podemos confiar en que no se pierde/corrompe y se puede recuperar? | atomicidad, concurrencia, idempotencia, backup, snapshots, restauración, DR |

Estar dentro del tenant Microsoft 365 corporativo **no debe documentarse como autorización automática** de cualquier flujo PROMueve. Sí constituye un entorno sobre el que el SES puede aplicar controles institucionales y cuya adecuación concreta debe confirmarse.

Del mismo modo, una carpeta que vive físicamente dentro del hospital no es automáticamente apta para piloto: necesitamos conocer permisos, backup, restauración, auditoría y semántica multiusuario.

## 6. Captura PROM/PREM: Forms como adapter transitorio, no como base de datos

### 6.1 Dirección candidata inmediata

Para la PoC y una eventual fase temprana, Microsoft Forms puede actuar como **canal de entrada**. PROMueve no debe depender del Excel automático de Forms como fuente conceptual.

Ruta candidata:

```text
PACIENTE
   ↓
Microsoft Forms
   ↓
Power Automate
   ↓
SHAREPOINT LIST — cola técnica
   ↓
procesador
   ↓
DESTINO PROMueve
```

Power Automate puede dispararse por una nueva respuesta de Forms y obtener los detalles de esa respuesta. Por tanto, el Excel asociado a Forms no necesita actuar como intermediario de integración ni ser movido a otra carpeta.

### 6.2 SharePoint List como cola técnica

Diseño mínimo candidato:

```text
correlation_id
response_id
token_pseudónimo
tipo_PRO
received_at
status
error
retry_count
```

Estados conceptuales iniciales candidatos:

```text
PENDING
PROCESSING
PROCESSED
ERROR
```

La List no se propone porque se espere gran volumen. Su objetivo es:

- desacoplar captura y persistencia final;
- no perder una respuesta si el destino temporalmente falla;
- permitir retry controlado;
- detectar duplicados/idempotencia mediante IDs estables;
- conocer qué llegó, cuándo y en qué estado quedó;
- facilitar troubleshooting y auditoría técnica del procesamiento.

**Volumen esperado reportado:** bajo; una respuesta cada 15–30 minutos ya sería un escenario muy favorable y coincidencias exactas serían excepcionales. Por tanto, no se optimiza throughput. Una latencia aproximada de 10 segundos es aceptable si mejora trazabilidad y seguridad operacional.

### 6.3 Qué guarda exactamente la List — `OPEN`

Dos variantes a contrastar con SES:

**A. Cola mínima:** metadatos, `response_id`, token, estado y errores; el payload clínico se recupera/procesa desde la fuente.

**B. Staging durable:** además conserva el payload PROM/PREM necesario para reintentos/recovery.

La opción A minimiza duplicación de datos de salud. La opción B puede mejorar resiliencia. La elección depende de garantías técnicas y gobernanza/retención autorizada; no queda adjudicada aquí.

### 6.4 Destino intercambiable

La cola no debe casarse con un único almacenamiento:

```text
hoy:      SharePoint / Excel corporativo
posible:  file server SES vía Gateway
futuro:   API + DB institucional
```

Forms y el paciente no necesitan conocer ese cambio.

## 7. Seudonimización: no duplicar el contrato existente

La autoridad exploratoria existente es:

[`../architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`](../architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md)

Este documento **no redefine** el token, QR, `hub_patient_key`, tarjeta permanente ni token temporal.

Principio que se conserva:

```text
ENTORNO HOSPITALARIO IDENTIFICADO
paciente / CIP ↔ identificador técnico seguro
              │
              │ solo sale referencia seudónima
              ▼
CANAL PROM/PREM
Forms / futuro portal paciente
              ↓
respuesta seudonimizada
              ↓
reconciliación dentro del entorno autorizado
```

Si la identidad puede recuperarse mediante una tabla custodiada, se habla de **seudonimización**, no anonimización.

Para el adapter Microsoft Forms, el campo `token_pseudónimo` de la cola es deliberadamente conceptual. La equivalencia exacta con `hub_patient_key`, `prom_card_token` o `visit_token` queda pendiente de contrato; no se crea un identificador nuevo por conveniencia.

Microsoft Forms es una solución transitoria/pragmática de captura. La dirección de largo plazo del Gateway PROM/PREM —portal controlado por PROMueve con backend intercambiable— no queda derogada.

## 8. File server: términos y preguntas

### 8.1 Terminología

- **SMB — Server Message Block:** protocolo habitual de Windows para carpetas compartidas de red.
- **UNC path:** ruta tipo `\\SERVIDOR\\Carpeta\\PROMueve`.
- **ACL / permisos AD:** reglas que definen qué usuarios/grupos pueden leer o escribir.
- **File server:** servidor que almacena y sirve ficheros por red.
- **NAS:** dispositivo especializado de almacenamiento; puede o no ser la tecnología concreta del SES.

No asumir que la carpeta compartida tiene una “copia local y otra central”. Hay que preguntar cómo está implementada, si existe caché/offline files, réplica o alta disponibilidad.

### 8.2 Qué necesitamos conocer

- tecnología real del recurso compartido;
- ruta/ámbito autorizado para PROMueve;
- autenticación y permisos por usuario/grupo;
- logs/auditoría de acceso y modificación;
- comportamiento si dos usuarios modifican el mismo fichero;
- backups y snapshots;
- recuperación de un único fichero;
- réplica/alta disponibilidad;
- protección ante ransomware;
- ubicación/fault domain de las copias;
- propietario técnico y soporte.

El bajo volumen de Forms reduce el riesgo práctico de colisión en esa entrada. **No elimina** el problema general si 50–60 usuarios potenciales de PROMueve terminan escribiendo sobre el mismo Excel compartido.

## 9. VM/API: qué preguntar sin solicitarla todavía

Pregunta sencilla:

> Si más adelante PROMueve necesitara una pequeña aplicación interna con base de datos, ¿podríais proporcionarnos una máquina virtual dentro de la infraestructura SES y permitir acceso desde los puestos hospitalarios?

Si la respuesta es afirmativa, descubrir después:

- quién provisiona/gestiona la VM;
- sistema operativo soportado;
- quién despliega la API;
- si existe DB corporativa aprovechable;
- DNS interno;
- certificado TLS/HTTPS;
- firewall/acceso 443 desde puestos;
- monitorización;
- backup/DR;
- parcheo y soporte;
- proceso para proveedor externo autorizado.

### Traducción rápida

| Término | Lenguaje sencillo |
| --- | --- |
| VM | un servidor virtual dentro de la infraestructura SES |
| API | la ventanilla que recibe peticiones de PROMueve |
| DB | el almacén estructurado de datos |
| DNS interno | el nombre legible del servidor en vez de una IP |
| HTTPS/TLS | comunicación cifrada + certificado que identifica al servidor |
| Firewall / 443 | permiso de red para que los puestos lleguen a la API por la puerta HTTPS estándar |

No se plantea navegador → SQL directo.

## 10. Backup, sincronización y disaster recovery

No confundir:

```text
COPIA           = tener otro ejemplar
SINCRONIZACIÓN  = mantener ejemplares iguales
BACKUP          = poder volver a un estado anterior
DR              = recuperar/continuar tras una avería grave
```

Una réplica sincronizada puede copiar también un borrado o corrupción. Por eso hay que preguntar por backups/versionado independiente.

### Preguntas para SESATIC

- ¿la carpeta/SharePoint entra en backup institucional?;
- frecuencia de copia;
- retención de versiones;
- snapshots;
- restauración granular de un fichero;
- ubicación físicamente/fault-domain separada;
- protección frente a ransomware;
- quién solicita y ejecuta una restauración;
- si se prueban restauraciones periódicamente;
- qué ocurre ante caída completa del servidor/site.

Términos útiles si la interlocutora los usa:

- **RPO:** cuántos datos/tiempo de trabajo máximo se acepta perder.
- **RTO:** cuánto tiempo máximo se acepta tardar en recuperar el servicio.

PROMueve no define unilateralmente estos valores; son requisitos institucionales a descubrir.

## 11. Interoperabilidad: preguntas para no cerrarnos puertas

Pregunta marco:

> Si PROMueve tuviera que integrarse en el futuro con JARA u otros sistemas corporativos, ¿qué identificadores, estándares y sistemas de codificación debemos preservar desde ahora?

Investigar:

- HL7 FHIR: si se usa, versión, perfiles y casos reales;
- HL7 v2;
- openEHR;
- identificador canónico de paciente y su scope;
- identidad de profesional;
- códigos de centro/servicio/episodio;
- SNOMED CT;
- LOINC;
- ATC / códigos nacionales AEMPS / catálogos locales;
- CIE-10-ES u otras clasificaciones;
- servidor/servicio terminológico si existe;
- interfaces disponibles con JARA;
- equipo regional responsable de interoperabilidad.

**Regla:** no implementar bindings terminológicos, perfiles FHIR/openEHR ni identificadores institucionales por suposición. El Architecture Freeze clasifica esos detalles como `SES_DECISION`.

## 12. Qué llevar a la reunión del 2026-10-09

### Demostración deseada

PoC sintética, idealmente:

```text
Forms sintético
  ↓
Power Automate
  ↓
SharePoint List
  PENDING
  ↓
procesado
  ↓
destino sintético
  ↓
verificación/relectura
  ↓
PROCESSED
```

Añadir una prueba negativa controlada:

```text
fallo destino
  ↓
ERROR
  ↓
retry
  ↓
PROCESSED sin duplicado
```

No se necesita rendimiento. Sí se necesita observabilidad e idempotencia básica.

### Preguntas priorizadas

1. ¿Power Automate Premium queda disponible para la cuenta SES de prueba?
2. ¿Qué espacio SharePoint/OneDrive R/W se puede dedicar a la PoC?
3. ¿Qué políticas DLP/retención/auditoría aplican?
4. ¿La carpeta compartida puede reservar un ámbito de prueba para PROMueve?
5. ¿Qué backup/snapshots/restore tiene esa carpeta?
6. ¿Existe On-premises Data Gateway y quién lo administra?
7. ¿Podría autorizarse más adelante una PoC Gateway → file server?
8. Si evolucionamos a API/DB, ¿existe capacidad de VM/servicio interno y proveedor de soporte?
9. ¿Quién lleva interoperabilidad/JARA/estándares en el SES?
10. ¿Qué proceso y evidencias exigirían antes de autorizar una prueba/piloto con datos reales?

## 13. Matriz de decisión provisional

| Ruta | Automatización | Datos | Integridad multiusuario | Dependencia SES | Estado 2026-10-02 |
| --- | --- | --- | --- | --- | --- |
| Forms → PA → SharePoint/List | alta | tenant M365 SES | mejor para elementos independientes; destino a validar | permisos/licencia/políticas tenant | **prioridad PoC** |
| Browser → File System Access → share | media-alta con interacción del usuario | on-prem SES | depende del patrón de ficheros; mismo Excel requiere cautela | permisos file server/browser | escritura sintética demostrada; ampliar evidence |
| PA → Gateway → file server | alta | M365 orchestration + on-prem destino | depende del destino; Gateway no convierte Excel en DB | Gateway + permisos | **discovery** |
| VM → API → DB institucional | alta | on-prem/institucional | diseñada para concurrencia/transacciones | infraestructura, soporte, auth, DB | **futuro / preguntar disponibilidad** |

No se adjudica una ruta final hasta obtener evidencia y preferencias institucionales.

## 14. Criterios de la PoC de Fase 1

Con datos sintéticos exclusivamente:

- una respuesta de Forms crea exactamente una unidad de trabajo identificable;
- existe `correlation_id`/`response_id` suficiente para detectar duplicados;
- la cola permite distinguir `PENDING/PROCESSING/PROCESSED/ERROR` o equivalente;
- el destino confirma escritura y, cuando el adapter lo permita, relectura semántica;
- un fallo controlado no pierde la respuesta;
- retry no duplica el resultado final;
- no se expone CIP/nombre/DNI/email/teléfono en el canal PROM/PREM;
- tiempos del orden de segundos son aceptables; no hay requisito de baja latencia;
- todo el recorrido queda demostrable a SESATIC sin usar datos reales.

## 15. Qué NO decide este documento

- no elige fuente oficial de verdad SES;
- no autoriza datos reales;
- no declara el tenant M365 suficiente por sí mismo para cualquier tratamiento de datos;
- no declara Gateway disponible;
- no fija SharePoint List como componente permanente;
- no obliga a usar Microsoft Forms a largo plazo;
- no mueve el frontend al SES;
- no solicita ni despliega VM;
- no crea API/backend;
- no elige SQL Server/PostgreSQL;
- no cambia contratos clínicos;
- no cambia el diseño de QR/token existente;
- no implementa FHIR/openEHR/HL7;
- no declara piloto/producción.

## 16. Relación con la arquitectura vigente

Este discovery es compatible con:

- [`../architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md`](../architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md): adapters con garantías explícitas, decisiones SES no inventadas, backend diferido hasta necesidad/autorización;
- [`../ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md`](../ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md): Foundation no depende de elegir ya el backend y el piloto queda condicionado a identidad/hosting/persistencia/continuidad/seguridad;
- [`../architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`](../architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md): separación de identidad y captura PROM/PREM seudonimizada con backend intercambiable.

La evidencia nueva puede reabrir decisiones `SES_DECISION` cuando sea material, pero **no convierte este discovery en un ADR ni en una aprobación institucional**.
