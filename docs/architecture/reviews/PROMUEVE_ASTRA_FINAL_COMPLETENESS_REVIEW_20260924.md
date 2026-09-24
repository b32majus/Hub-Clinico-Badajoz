# PROMueve Nexus — Astra Final Completeness Review — 2026-09-24

**Tipo:** evidencia externa read-only; no autoridad de decisión por sí misma.
**Base revisada:** PR #379, base `ea8b03a0e6895495dff1ec0b9abb2e368c259443`, head `1ccdb2fb1cde09304470282926550ed96d6087db`.
**Resultado declarado por la revisión:** `READY_WITH_MINIMAL_AMENDMENTS`.

> El contenido de la revisión se preserva a continuación como evidencia. La adjudicación y los cambios aceptados viven en el Architecture Decision Freeze, INDEX y Foundation Plan.

---

**La arquitectura es suficiente para continuar hacia Foundation. No encuentro una capacidad futura importante que obligue a cambiar sus límites. Antes de mergear, corregiría dos ambigüedades documentales: autoridad histórica y reglas de trabajo paralelo.**

Verificación GitHub live al concluir:

- [PR #379](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/379): abierta, sin merge.
- Base: `ea8b03a0e6895495dff1ec0b9abb2e368c259443`.
- Head: `1ccdb2fb1cde09304470282926550ed96d6087db`.
- Coinciden con los esperados; 20 archivos modificados, todos documentales.
- Checks `smoke-check`: satisfactorios. No he ejecutado tests ni QA de navegador en esta revisión.

He contrastado freeze, ocho ADR, Foundation Plan, tres evidencias, reconciliaciones y documentación futura, incluyendo superficies históricas adicionales de CIMA, formularios, catálogo transversal y farmacovigilancia. Los estados históricos no se han tratado como capacidades actuales.

## A. PR #379 — Material blockers before merge

**No hay un bloqueo arquitectónico estructural. Sí hay dos correcciones documentales necesarias para evitar instrucciones contradictorias durante ejecución.**

### 1. INDEX mantiene afirmaciones de vigencia incompatibles con el freeze

La cabecera nueva establece correctamente la precedencia, pero otras secciones del mismo [INDEX](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/1ccdb2fb1cde09304470282926550ed96d6087db/docs/INDEX.md) siguen diciendo:

- Dossier de junio: **«Vigente para DEC-001..019»**. Entre esas decisiones figuran integración longitudinal por CIP y una arquitectura tecnológica que ya no debe interpretarse como compromiso vigente.
- Treatment Lifecycle: **«Reglas vigentes: JSON define reglas, no las ejecuta»**. Es una frontera insuficiente: JSON puede determinar comportamiento clínico aunque otro componente lo ejecute. ADR-008 establece una restricción más precisa.
- Plan de vacaciones: aparece como plan operativo y mantiene Control Plane Supabase entre sus entregables, aunque Foundation ha cambiado la secuencia inicial.

**Corrección mínima:** actualizar esas entradas concretas para distinguir principios conservados, propuestas históricas y autoridad actual. No hace falta reescribir los documentos antiguos.

### 2. El Foundation Plan contiene una contradicción de ejecución paralela

En el [Foundation Plan](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/1ccdb2fb1cde09304470282926550ed96d6087db/docs/ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md):

- §6 permite trabajo paralelo.
- §12 exige STOP si **«GitHub base/authority cambia durante una WO»**.

Leído literalmente, cualquier merge independiente detiene todas las WOs. Además, una corrección clínica pequeña puede ser VERDE por alcance y ÁMBAR porque toca un Port o `exportManager`; falta precedencia explícita.

**Corrección mínima:** separar cambio de autoridad de avance ordinario del HEAD, y establecer `ROJO > ÁMBAR > VERDE`. El color no sustituye autorización clínica, oráculo ni QA.

### Los cinco ajustes están preservados

| AjusteComprobación                                                        |                                                                               |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Casos de escritura independientes                                         | Freeze §6 y ADR-005; no cadena obligatoria.                                   |
| Home no cualifica automáticamente un módulo para otro hospital            | Freeze §3.6, ADR-003 y gate hospital×módulo del plan.                         |
| Excel/Bridge requiere evidencia durable; no acredita registro oficial SES | Freeze §7.2 y ADR-006.                                                        |
| Freeze y transición Git son hitos distintos                               | Freeze §3.3, ADR-001, INDEX y WOS.                                            |
| ADR fija responsabilidades, no contratos exhaustivos                      | Distinción `DECIDED`/`CONTRACT_PENDING`; contratos concretos asignados a WOs. |

## B. Future-evolution inventory

La clasificación de `WHEN` usa exclusivamente las categorías solicitadas. «Implementar ahora» significa dentro de una WO Foundation autorizada, no autorización derivada de esta revisión.

Divido el inventario en dos tablas enlazadas por ID para mantener legibles todos los campos.

| ID / EVOLUTIONCURRENT_STATUSPRESERVE_SEAM_NOWIMPLEMENT_NOWWHEN |                                                                                                                                    |                                                                                             |                                                                                   |                                |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| E1. Identity Plane                                             | Propuesta exploratoria; implementación física diferida.                                                                            | Referencias con ámbito; correspondencias separadas; actor declarado ≠ autenticado.          | Referencias y límites de confianza; no servicio de identidad.                     | `SES_DECISION`                 |
| E2. Nursing Readiness                                          | Gateway exploratorio. Existe evolución publicada Enfermería v6/reconciliación por `solicitud_id`; no equivale al gateway completo. | Solicitud, preparación y validación FH independientes; ID de solicitud estable.             | Preservar contrato existente al migrar.                                           | `AFTER_FOUNDATION`             |
| E3. PROM/PREM Capture Gateway                                  | Diseño exploratorio de tarjetas/QR; no acredita servicio operativo.                                                                | Identidad ≠ token; instrumento/versiones; respuestas originales; autor, informante y canal. | Solo preservación conceptual; no portal público.                                  | `SES_DECISION`                 |
| E4. Treatment lifecycle, renovaciones y tareas                 | Propuesta; automatización futura no acreditada.                                                                                    | Identidad de línea/ciclo; fechas y certeza; tarea ≠ alerta ≠ notificación.                  | Preservar información disponible; no scheduler ni inferencia de renovación.       | `DOCUMENT_NOW_IMPLEMENT_LATER` |
| E5. Presalud e intake                                          | Parser V0 presente en código; intake publicado según estado vivo. `Estado`/`Días` siguen sin interpretación clínica autorizada.    | Fuente → interpretación → propuesta → aplicación; provenance; incertidumbre.                | Proteger fronteras existentes durante refactor.                                   | `FOUNDATION_SEAM_NOW`          |
| E6. CIMA y catálogo transversal                                | Catálogo existente; actualización mensual y componente transversal siguen propuestos.                                              | Identificación farmacológica separada de tratamiento; versión/fuente del catálogo.          | Registrar dependencias/versiones; no actualización automática de clínica.         | `AFTER_FOUNDATION`             |
| E7. Excel Bridge / Office Scripts / Power Automate             | Bridge/roundtrip descritos como pendientes; existen PoC limitadas de entorno M365/FSA.                                             | Acto completo, entrega, idempotencia y evidencia durable.                                   | Contrato de capabilities/resultados; no asumir todas las variantes implementadas. | `AFTER_FOUNDATION`             |
| E8. Cloud/Hospital API y PostgreSQL/SQL Server                 | Backlog de adapters; sin autorización institucional implícita.                                                                     | Ports async, errores, revisiones, concurrencia y autorización confiable.                    | Fronteras y contratos; no backend.                                                | `SES_DECISION`                 |
| E9. Auth, roles y permisos                                     | Sin solución institucional congelada.                                                                                              | Contexto de actor y operación; autorización independiente de visibilidad UI.                | Separar responsabilidades; no auth propia.                                        | `SES_DECISION`                 |
| E10. Diccionario/metadata/terminologías                        | Previsto expresamente en V4; no registro general operativo acreditado.                                                             | IDs semánticos, tipos, unidades, ausencia, versiones y bindings opcionales.                 | Subconjunto de los contratos que se extraigan.                                    | `FOUNDATION_SEAM_NOW`          |
| E11. JARA y perfiles de exportación                            | Salidas documentales existentes; integración institucional automática no acreditada.                                               | Proyección versionada por destino; generación ≠ envío ≠ registro.                           | Preservar outputs soportados y su trazabilidad.                                   | `FOUNDATION_SEAM_NOW`          |
| E12. FHIR/openEHR/HL7                                          | Mapping candidato documentado; integración institucional pendiente.                                                                | Contratos de dominio independientes; contexto, tiempo, semántica y pérdidas explícitas.     | Preparación contractual; no servidor/CDR.                                         | `DOCUMENT_NOW_IMPLEMENT_LATER` |
| E13. Audit/provenance/observabilidad                           | Hay reglas y evidencia parcial; auditoría asistencial institucional pendiente.                                                     | Procedencia clínica separada de logs técnicos; correcciones y revisiones.                   | Provenance necesaria y diagnóstico mínimo sin payload clínico.                    | `FOUNDATION_SEAM_NOW`          |
| E14. Migración/versionado de datos                             | Dirección documentada; no migrador integral acreditado.                                                                            | Versiones fuente/destino; IDs, cardinalidad, rechazo y compatibilidad.                      | Contratos y oráculos; migradores cuando exista transición concreta.               | `FOUNDATION_SEAM_NOW`          |
| E15. Multi-site y extensiones locales                          | Snapshot CAC real; plataforma general planificada.                                                                                 | Deployment fijo; qualification módulo×site; extensiones gobernadas.                         | Profile/registry/manifest y combinaciones necesarias.                             | `FOUNDATION_SEAM_NOW`          |
| E16. Backup, recuperación y soporte                            | Necesidad reconocida; operación institucional no cerrada.                                                                          | Separar restauración de aplicación, configuración y datos.                                  | Documentar responsabilidades y requisitos; no inventar infraestructura.           | `BEFORE_REAL_PILOT`            |
| E17. Visión longitudinal intermodular                          | Objetivo histórico; integración universal diferida.                                                                                | Referencias con ámbito y contratos de intercambio explícitos.                               | Nada en la Home que agregue pacientes o historias.                                | `SES_DECISION`                 |
| E18. Neoplasias/farmacovigilancia y nuevos módulos             | Backlog clínico pendiente; una plantilla o prototipo no acredita módulo soportado.                                                 | Asociación explícita a acto/línea y extensiones de dominio versionadas.                     | Solo requisitos aceptados en WOs clínicas separadas.                              | `AFTER_FOUNDATION`             |
| E19. Formularios, dashboards y reglas universales              | Ambición histórica V5; el freeze la difiere.                                                                                       | Límites de módulo y metadata gobernada.                                                     | No construir motor genérico.                                                      | `DEFER_V5`                     |

| IDSES_DEPENDENCYDOC_ACTIONRISK_IF_IGNORED |                                                                        |                                                                                       |                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| E1                                        | Custodia, resolución de paciente, permisos.                            | Conservar como exploratorio; no reactivar mapeo manual como requisito Foundation.     | Identidades duplicadas o asociación incorrecta.                      |
| E2                                        | Responsabilidad y significado de estados del circuito.                 | Distinguir importación v6 de gateway de readiness.                                    | Convertir «listo para tramitar» en validado.                         |
| E3                                        | Canal, identidad, privacidad, soporte y captura asistida.              | Mantener diseño candidato; retirar cualquier lectura normativa de `scoring_json`.     | Token usado como identidad o scoring configurable sin gobierno.      |
| E4                                        | Política clínica, responsables y datos fiables de prescripción.        | Conservar reglas clínicas como propuestas; activar políticas versionadas y aprobadas. | Renovaciones inventadas o tareas sobre línea equivocada.             |
| E5                                        | Adjudicación de campos todavía ambiguos.                               | Reconciliar «parser pendiente» histórico con V0 existente y sus límites.              | Duplicar parser o interpretar `Días` como duración/vigencia.         |
| E6                                        | Gobierno del catálogo local y políticas farmacológicas.                | Mantener extracción → diff → revisión → release.                                      | Actualización externa cambia comportamiento clínico silenciosamente. |
| E7                                        | Disponibilidad real de herramientas, custodia y concurrencia.          | Registrar qué prueba demuestra cada capability.                                       | Confundir PoC de fichero o flujo con persistencia segura.            |
| E8                                        | Hosting, API, fuente oficial, seguridad y operación.                   | Mantener candidatos sustituibles.                                                     | Filtrar modelo SQL/Excel a la aplicación.                            |
| E9                                        | Proveedor de identidad y matriz de permisos.                           | Separar atribución, autenticación y autorización.                                     | Selector de profesional tratado como autenticación.                  |
| E10                                       | Gobernanza clínica y terminologías definitivas.                        | Diccionario incremental junto a cada contrato.                                        | Perder significado al conservar únicamente valores y etiquetas.      |
| E11                                       | Receptor y perfiles institucionales de intercambio.                    | Documentar alcance del export y confirmación que puede acreditar.                     | Presentar TXT generado como incorporación a JARA.                    |
| E12                                       | Perfiles, versiones, endpoints y terminologías institucionales.        | Mapping v0.1 candidato con gaps y límites explícitos.                                 | Export sintáctico presentado como interoperabilidad.                 |
| E13                                       | Auditoría oficial, acceso y retención.                                 | Diferenciar evidencia de acto, recibo de persistencia y diagnóstico técnico.          | Pérdida de trazabilidad o exposición clínica en logs.                |
| E14                                       | Migración real y aceptación del repositorio destino.                   | Compatibilidad y reconciliación por transición concreta.                              | Pérdidas silenciosas o rollback que no puede leer datos nuevos.      |
| E15                                       | Circuitos y qualification de cada hospital.                            | Clasificar requisitos locales y ruta de integración.                                  | Fork funcional encubierto por hospital.                              |
| E16                                       | Custodio, soporte, retención y objetivos de recuperación.              | Runbook y prueba de restauración antes del piloto.                                    | Confundir tener ZIP/Git con recuperar datos clínicos.                |
| E17                                       | Identidad, consentimiento/base aplicable, permisos y fuente de verdad. | Conservar como evolución condicionada; no unión automática por CIP.                   | Compartir datos o mezclar pacientes sin autoridad suficiente.        |
| E18                                       | Definición y aceptación clínica.                                       | WO específica con alcance y semántica; no absorberla en Foundation.                   | Modelo clínico improvisado como extensión local.                     |
| E19                                       | Necesidad futura demostrada y gobierno del producto.                   | Mantener diferido; no diseñar ahora todos sus schemas.                                | Construir una plataforma de configuración antes que el producto.     |

Fuentes especialmente relevantes: [V4 §§16–17](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/1ccdb2fb1cde09304470282926550ed96d6087db/docs/architecture/PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md), [backlog vivo](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/1ccdb2fb1cde09304470282926550ed96d6087db/docs/ops/PROMUEVE_BACKLOG.md), [estado Farmacia](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/1ccdb2fb1cde09304470282926550ed96d6087db/docs/ops/FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md) y [parser Presalud](https://github.com/b32majus/Hub-Clinico-Badajoz/blob/1ccdb2fb1cde09304470282926550ed96d6087db/scripts/fh_presalud_parser.js).

## C. Documentation & handover governance

**La separación Standard / Skill / AGENTS es correcta.** La relación debe ser:

- **Standard:** obligaciones duraderas, legibles y aplicables también por humanos.
- **Skill:** procedimiento para cumplirlas; sin decisiones adicionales ni una segunda autoridad.
- **AGENTS:** referencia obligatoria y evaluación de impacto documental; no copia del estándar.

Actualmente esos dos nuevos archivos propuestos no aparecen en el árbol revisado. AGENTS ya exige reconciliación documental cuando cambia el estado real: el estándar desarrollaría esa obligación.

### Mínimo que debe exigir el estándar

1. **Autoridad y estado:** responsable, alcance, vigencia, documento sustituido y sucesor.
2. **Madurez precisa:** separar `documented / coded / wired / visible / supported / tested / published / pilot-ready`.
3. **Trazabilidad del cambio:** requisito o decisión → contrato/comportamiento afectado → evidencia → artefacto publicado.
4. **Contratos comprensibles:** significado, ausencia, errores, límites, versiones y compatibilidad.
5. **Operación:** construir, probar, empaquetar, desplegar, diagnosticar y revertir.
6. **Datos:** fuentes, destinos, persistencia, correcciones, migración, recuperación y responsabilidades.
7. **Límites clínicos:** qué hace el producto, qué requiere confirmación profesional y qué no demuestra.
8. **Ejemplos sintéticos reproducibles**, sin depender de conversaciones o memoria de agentes.

No exigiría un documento nuevo por cada PR. Una corrección breve en la fuente canónica puede bastar.

### Activación de la skill

Ante cambios en comportamiento soportado, contratos, configuración, dependencias, despliegue, seguridad, operación o estado de madurez; también al preparar una entrega institucional.

Para ajustes sin impacto documental: declaración breve de «sin impacto» con motivo. No actualizar INDEX/WOS por cada detalle interno ni por cada movimiento del tip Git.

### Paquete necesario para SES

Debe permitir a un equipo receptor:

- identificar qué recibe y para qué hospital/módulos;
- reconstruir el artefacto y ejecutar sus verificaciones;
- entender arquitectura y contratos;
- operar los flujos soportados y reconocer sus límites;
- diagnosticar incidencias sin extraer datos clínicos;
- actualizar, revertir y recuperar;
- conocer dependencias/licencias, responsables y decisiones institucionales abiertas.

**Mecanismo ligero:** campo de impacto documental en PR y comprobación de enlaces locales. Más adelante, comprobar que el manifest referencia documentación de la release. No introduciría ahora un sistema de puntuación documental ni un bot que exija cambios en `docs/` para cualquier PR.

Esta política puede desarrollarse en una **WO documental posterior**, en paralelo al arranque Foundation. No bloquea #379.

## D. Interoperability readiness

**Confirmo dominio/contratos canónicos → adapters.** No usaría Excel, FHIR ni openEHR como modelo interno obligatorio.

El matiz: un dominio propio también puede quedar encerrado en sus formularios. La independencia del formato solo es útil si preserva significado. Además, los adapters serán específicos por intercambio y dirección; no hay que prometer un «FHIR adapter universal».

### Qué preservar durante Foundation

En los contratos que realmente se extraigan:

- IDs estables y con ámbito para actos, líneas, solicitudes y referencias externas.
- Identificador semántico y versión del concepto; no solo etiqueta visible.
- Tipo, unidad y precisión cuando correspondan.
- Tiempo clínico separado de captura/importación/persistencia; no inventar precisión temporal ausente.
- Autor, informante o fuente, con su nivel de atribución.
- Hospital, servicio y contexto asistencial diferenciados.
- Ausencia, desconocido, negativo explícito y no aplicable según contrato.
- Provenance de transformaciones y versión del mapping.
- Binding terminológico opcional: sistema, código, versión y estado de revisión cuando exista.

**No obliga a rellenar datos que hoy no se capturan ni a añadirlos todos al envelope común.** Algunos pertenecen al payload, otros al diccionario y otros al adapter.

ADR-004 puede retirar hojas/columnas de los DTO de aplicación **sin destruir la procedencia original**: conservarla detrás de una referencia trazable cuando el contrato la necesite.

### Qué sería prematuro

Servidor FHIR, CDR openEHR, catálogo terminológico universal, mappings definitivos SNOMED CT/LOINC/ATC, modelo universal de observaciones, SDK de interoperabilidad compartido o perfil institucional inventado.

Tampoco consideraría «FHIR-ready» evidencia de compatibilidad HL7 v2: sería otro intercambio que requeriría contrato propio.

### WO de mapping v0.1

Tiene sentido **cuando F4.4 disponga de un primer contrato completo revisable y su diccionario mínimo**, antes de cerrar decisiones difíciles de cambiar sobre ese contrato. No necesita esperar al final de Foundation ni bloquear la Home.

El plan de vacaciones ya contempla `WO-DOC-FH-INTEROPERABILITY-MAPPING-V0-1-01`; no hace falta inventar otra línea de trabajo.

Bundle FHIR candidato y COMPOSITION candidata aportan evidencia **limitada a los casos probados** si incluyen:

- versión y supuestos del destino;
- mapping por significado;
- pérdidas, extensiones y campos sin correspondencia;
- casos de ausencia, varias líneas y corrección;
- validación técnica y revisión semántica.

Dos JSON con aspecto correcto no bastan. FHIR distingue estructura, bindings, perfiles y reglas de negocio; openEHR valida contenido mediante modelos, arquetipos y templates. Ninguno de esos ejemplos acredita aceptación institucional o integración operativa. ([FHIR v4.0.1](https://hl7.org/fhir/R4/validation.html?utm_source=chatgpt.com "Validation"))

**No cambiaría el diagrama congelado.** V4 ya conserva esta dirección; sus detalles pertenecen a las WOs de contratos y mapping.

## E. Parallel hospital work

La lane paralela es viable. No necesita ramas permanentes por hospital.

Añadiría una clasificación breve al requisito local:

| ClaseUbicación esperada |                                                                              |
| ----------------------- | ---------------------------------------------------------------------------- |
| CORE                    | Composición, navegación o capacidad técnica realmente compartida.            |
| MODULE                  | Comportamiento del dominio, aunque lo solicite inicialmente un hospital.     |
| SITE                    | Operación o identidad del despliegue dentro de opciones admitidas.           |
| MODULE×SITE             | Variante acotada del módulo, con contrato, gobierno y qualification propios. |

**El origen hospitalario de una petición no determina su clase.** Una necesidad clínica nueva de CAC puede pertenecer a MODULE; no debe convertirse automáticamente en JSON de CAC.

Para integrar después sin deuda estructural:

- especificar la ubicación prevista y los contratos afectados;
- aplicar precedencia `ROJO > ÁMBAR > VERDE`;
- coordinar cambios sobre fronteras compartidas, no paralizar todo trabajo local;
- admitir una excepción temporal solo con alcance, responsable y condición de retirada;
- integrar en la autoridad vigente y publicar artefactos hospitalarios cualificados.

VERDE significa baja interferencia arquitectónica, **no ausencia de riesgo clínico**. Una corrección semántica conserva su WO y oráculo propios.

## F. Forgotten or conflicting roadmap items

Los puntos importantes encontrados son estos:

1. **Integración por CIP en junio.** DEC-017 propone una visión multiarchivo usando CIP y datos del evento. No debe reaparecer como identidad universal ni clave de deduplicación. La evolución longitudinal sigue siendo posible mediante contratos autorizados.
2. **Reglas JSON en renovaciones y PROMs.** El lifecycle propone parámetros/reglas configurables y el gateway contiene `scoring_json`. Son diseños exploratorios; ADR-008 prevalece. Debe conservarse la necesidad clínica, no canonizar el mecanismo.
3. **CIMA auto-publicado.** CDC-001 propone commit/push y actualización automática de la demo. El plan posterior y el INDEX ya orientan a extracción, validación, diff y PR revisable. Clasificación de la publicación automática histórica: `SUPERSEDED`. La actualización del catálogo sigue siendo válida.
4. **Presalud «pendiente» no describe todo el presente.** Hay parser V0. Eso no habilita un motor de renovaciones: `Estado` y `Días` siguen preservados sin interpretación clínica autorizada. No duplicar el parser ni saltar ese límite.
5. **PoC M365/FSA no es capacidad institucional completa.** El backlog registra bloqueo del trigger HTTP por Premium, restricción de App Registrations, ausencia de OneDrive operativo y una PoC de creación de fichero. Deben informar las futuras WOs, no convertirse en supuestos de disponibilidad general.
6. **Equidad en captura de PROMs.** El dossier de junio contempla captura asistida desde Atención Primaria. Conservar canal e informante evita diseñar el gateway únicamente para paciente con móvil. No exige construirlo ahora.
7. **Neoplasias/farmacovigilancia.** Existe backlog específico pendiente de definición clínica. No debe perderse dentro de «V5» ni implementarse como campos locales sin relación longitudinal definida.
8. **Recuperación y handover.** El freeze reconoce continuidad y que revertir frontend no revierte datos. Falta concretar operación, responsables y prueba de restauración; corresponde a `BEFORE_REAL_PILOT`, no al cierre de esta PR.

Los documentos antiguos que hablan de «pilotaje inmediato» no constituyen autorización actual. Tampoco convertiría sus preferencias React/OCI/Fastify o sus calendarios en obligaciones de Foundation.

## G. Minimal pre-merge amendments

Haría **solo estas dos enmiendas**, ambas documentales:

### M1 — Corregir las entradas contradictorias del INDEX

En §§5, 6 y 10:

- sustituir «Vigente para DEC-001..019» por vigencia parcial, subordinada al freeze, señalando integración por CIP y stack histórico como no adoptados para Foundation;
- identificar el plan de vacaciones como planificación histórica, con Foundation como secuencia vigente;
- sustituir «JSON define reglas, no las ejecuta» por la regla de ADR-008: configuración selecciona políticas implementadas, versionadas, probadas y autorizadas; no introduce lógica clínica;
- mantener explícitamente como evolución futura las necesidades de lifecycle e interoperabilidad.

### M2 — Hacer ejecutable la lane paralela

En §§4, 8 y 12 del Foundation Plan:

- incorporar `CORE / MODULE / SITE / MODULE×SITE` como clasificación de responsabilidad, no cascada de overrides;
- establecer precedencia `ROJO > ÁMBAR > VERDE`;
- exigir condición de integración/retirada para excepciones hospitalarias temporales;
- distinguir:
  - **cambio de autoridad o conflicto material:** STOP y adjudicación;
  - **avance ordinario compatible de la base:** revalidación antes de integrar y repetición de gates afectados;
  - **WO ligada expresamente a SHA inmutable:** respetar su condición específica.

Esto no autoriza rebases, merges ni reescritura de historia.

**No exigiría antes del merge:** nuevo ADR, schemas exhaustivos, skill documental implementada, mapping FHIR/openEHR terminado, backend, Identity Plane o inventario terminológico completo.

## H. Final Foundation readiness

La arquitectura conserva las evoluciones conocidas mediante fronteras suficientes y evita construirlas prematuramente. Las dos enmiendas anteriores resuelven contradicciones de autoridad y ejecución; no reabren la arquitectura.

Después, contratos detallados, estándar documental, mapping candidato y preparación operativa deben avanzar mediante WOs posteriores. El freeze no autoriza esas WOs por sí mismo, no cambia la autoridad Git y no acredita piloto.

READY_WITH_MINIMAL_AMENDMENTS