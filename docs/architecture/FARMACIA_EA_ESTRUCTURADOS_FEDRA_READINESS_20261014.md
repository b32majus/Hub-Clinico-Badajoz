# PROMueve Nexus · Farmacia Hospitalaria
## Alineamiento funcional: acontecimientos adversos estructurados, terminologías y preparación para farmacovigilancia

**Fecha de propuesta:** 14-10-2026  
**Estado:** ALINEAMIENTO FUNCIONAL RATIFICADO · DOCUMENTADO · PENDIENTE DE VALIDACIÓN CLÍNICA DETALLADA E IMPLEMENTACIÓN; **NO PILOTO**. No es contrato de integración, licencia terminológica ni autorización de desarrollo. **WO documental [#775](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/775)**.  
**Base técnica contrastada (fotografía):** `b32majus/Hub-Clinico-Badajoz`, `promueve/nexus-v4@d70a398b12057f38ee4cd7b99f42e95545f72f01`; la autoridad del estado operativo es siempre GitHub live.  
**Propósito:** preservar la decisión funcional de producto y las posibilidades verificadas externamente sin atribuir a PROMueve capacidades aún no implementadas, ni prometer acceso a la API FEDRA.

### Convención de certeza

- **[ACORDADO FUNCIONALMENTE]**: dirección de producto ratificada por la responsable y conservada en este alineamiento; pendiente validación clínica detallada del equipo FH y WO de ejecución.
- **[VERIFICADO EXTERNO]**: publicado en fuentes oficiales citadas al final.
- **[EXISTENTE EN CÓDIGO]**: identificable en el repositorio publicado; no implica que se haya completado un QA de navegador para el nuevo flujo.
- **[PENDIENTE]**: necesita confirmación clínica, de terminología, autorización, especificación o implementación.
- **[PROPUESTA]**: solución técnica candidata, no congelada por una WO.

## 1. Necesidad y aportación diferencial

[ACORDADO FUNCIONALMENTE] Un profesional de Farmacia Hospitalaria debe poder **registrar varios acontecimientos adversos (EA) distintos durante un mismo seguimiento**, incluso cuando todos sean sospechosamente atribuibles al mismo medicamento. La captura debe favorecer el registro de **términos codificados, comparables y explotables**, no obligar a agrupar todos los EA en una única descripción de texto libre. El profesional **registra una vez**; el registro estructurado puede alimentar el seguimiento asistencial, la analítica longitudinal y, cuando proceda y esté autorizado, la preparación de una notificación de farmacovigilancia.

La propuesta **no equivale** a notificación automatizada, autorización institucional, causalidad farmacológica probada ni compatibilidad implementada con FEDRA. La ganancia de eficiencia que se persigue es eliminar la doble transcripción y conservar información reutilizable, pero debe demostrarse en un futuro piloto.

## 2. Situación actual de PROMueve (no confundir con objetivo)

[EXISTENTE EN CÓDIGO] En `farmacia_seguimiento.html` existe una sección única de EA con presencia, gravedad textual, resolución, actuación, observaciones, lista de medicamentos sospechosos y selector del medicamento cuya causalidad se evalúa. En `scripts/farmacia_seguimiento.js`, el estado usa `currentFollowupVisit.adverse_event` (singular) y `causality_by_suspect` (valoraciones separadas por sospechoso). Existen cuestionarios Naranjo y Karch-Lasagna. **Un único EA estructurado no equivale a un único sospechoso**.

[EXISTENTE EN CÓDIGO] Export V2 (`scripts/farmacia_export_v2_core.js`) presenta `adverse_event_id`, `adverse_event_status`, descripción, gravedad, resolución y actuación como campos comunes del acto, y dispone de `adverse_event_suspects_json` y `causality_assessments_json`; sus filas por línea no son una estructura para diferentes EA por línea. La proyección poblacional actual (`scripts/farmacia_statistics_cohort.js`) resume/deduplica datos. **Ni Export V2 ni el CSV de Estadísticas de 37 columnas acreditan captura o exportación completa de N EA por acto.**

[EXISTENTE EN CÓDIGO] Pharmacy Act F4.4 está publicado como contrato/constructores, pero no se ha demostrado que todas las pantallas clínicas creen y persistan íntegramente esos actos a través del circuito final. Sigue vigente el contrato de exportación analítica longitudinal aprobado en `docs/contracts/FARMACIA_ANALYTICAL_LONGITUDINAL_EXPORT_V1.md`, publicado mediante PR #774: cohorte filtrada de pacientes → todos sus actos disponibles, granularidad acto × línea explícitamente comprendida/evaluada o fila de acto sin línea; representación 0/1/N de observaciones pendiente.

## 3. Reglas clínicas y semánticas que deben preservarse

**3.1 Identidad de un EA.** [ACORDADO FUNCIONALMENTE] Un acto admite `0..N` EA independientes. Cada uno dispone de identificador propio y debe poder conservar su **descripción original** y, cuando exista, su término normalizado, código, vocabulario, versión e idioma. Dos EA del mismo acto no son dos visitas; dos medicamentos sospechosos del mismo EA no son dos EA. El mismo EA seguido en visitas posteriores debe poder referenciar el **mismo episodio** y registrar cambios fechados, evitando nuevas incidencias artificiales por duplicación de visitas. La política exacta de identidad longitudinal necesita contrato.

**3.2 Diferenciar dimensiones.** [ACORDADO FUNCIONALMENTE] `EA registrado` ≠ `sospecha respecto a un medicamento` ≠ `causalidad evaluada` ≠ `causalidad demostrada` ≠ `notificación emitida` ≠ `notificación recibida en FEDRA`. Una sospecha no crea tratamiento, dosis, vía, régimen, exposición ni relación causal implícitos. Estado ausente ≠ respuesta negativa. Un EA puede tener 0/1/N medicamentos sospechosos; cada relación EA–medicamento puede tener 0/1/N evaluaciones trazables, si el profesional las efectúa. No evaluar no equivale a evaluación negativa.

**3.3 Gravedad clínica y seriedad regulatoria.** [ACORDADO FUNCIONALMENTE] CTCAE grado (cuando aplique) y *seriedad* de farmacovigilancia (por criterios regulatorios como fallecimiento, riesgo vital, hospitalización, discapacidad, etc.) son **variables distintas**. No inferir una de la otra ni emitir reglas automáticas de notificación por grado. Los grados CTCAE dependen del término y sus descriptores; no todos los términos admiten los cinco grados.

**3.4 Procedencia e integridad.** Preservar autoría declarada, timestamps registrados (inicio del EA, fecha del acto, registro, seguimiento/fin cuando existan), origen, catálogo+versión y trazabilidad de correcciones, distinguiendo dato registrado de derivación aprobada. No construir exposiciones ni causalidades desde CIMA, historial, el nombre del fármaco o un valor ausente. Manejar conflicto, ausencia o actualización de vocabulario sin reescritura silenciosa de registros ya guardados.

## 4. Terminologías y servicios: hechos externos verificados

**MedDRA** [VERIFICADO EXTERNO]. Terminología médica internacional para codificación y análisis de acontecimientos/reacciones. La AEMPS documenta que cada caso FEDRA puede tener **varios** signos, síntomas o diagnósticos, codificados con términos MedDRA. Su guía SEFV-H de codificación (2025) explica la selección de términos y los criterios comunes. MedDRA dispone de buscadores oficiales con sinónimos, y **API de búsqueda y consulta**; la documentación técnica y el uso se sujetan a suscripción/condiciones aplicables. No suponer que una licencia hospitalaria autoriza empaquetar o redistribuir el diccionario con PROMueve.

**CTCAE 6.0** [VERIFICADO EXTERNO]. Es **terminología de EA más criterios específicos de graduación**, no solo un grado. El NCI indica CTCAE v6.0 (2025), vinculada a **MedDRA 28.0** y con Excel/diccionario oficial. La posible correspondencia con otras versiones MedDRA o entre términos requiere mapping verificado y versionado. No imponer CTCAE para toda la actividad de Farmacia sin confirmación del equipo; no deducir el grado de la palabra elegida.

**FEDRA** [VERIFICADO EXTERNO]. Es la base española de notificaciones de sospechas de RAM, gestionada por el sistema de farmacovigilancia y coordinada por AEMPS; **no es un tercer diccionario de autocompletado**. El BOE 17-08-2026 (BOE-A-2026-17878) documenta una **API FEDRA de pasarela** institucional, HTTPS/REST, para transmitir notificaciones desde sistemas autorizados de centros autonómicos, con documentación/procedimientos acordados. La existencia de la API **no supone endpoint abierto de búsqueda de términos, acceso concedido a PROMueve, ni especificación disponible para implementar ya un adaptador validado**.

**ICH E2B(R3)** [VERIFICADO EXTERNO]. Referencia internacional de información y mensajería de informes individuales de seguridad (ICSR). Resulta útil como **inventario conceptual de datos** a preservar y futura correspondencia; **no demuestra** que FEDRA acepte automáticamente un XML, payload o contrato generado por PROMueve. El contrato FEDRA concreto solo se podrá preparar cuando la AEMPS/SES facilite especificaciones y autorizaciones.


### 4.1 Contraste documental adicional: E2B(R3) internacional ≠ contrato técnico de la API FEDRA

**[VERIFICADO EXTERNO]** La EMA exige ISO ICSR/ICH **E2B(R3)** para los mensajes de **EudraVigilance** y publica guía europea, reglas de negocio, referencias XML y pruebas de interoperabilidad. La estructura de elementos R3 incluye **C** (identificación del caso, remitente y fuentes), **D** (paciente), **E** (reacciones/acontecimientos, repetibles), **F** (pruebas), **G** (medicamentos, repetibles) y **H** (narrativa). La descripción simplificada «secciones A y B» del material secundario consultado remite a nomenclaturas anteriores y **no es un esquema de datos R3 utilizable**. Tampoco basta con validar solo contra un XSD: las reglas de negocio y terminología regionales importan.

**[VERIFICADO EXTERNO]** El convenio [BOE-A-2026-17878](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-17878) describe **otra interfaz concreta**: API de pasarela **REST/HTTPS** utilizada desde un sistema autonómico autorizado, mensajes con el **formato establecido por la AEMPS**, documentación técnica facilitada al emisor y **pruebas acordadas antes de producción**. El texto publicado no permite afirmar que el payload REST sea directamente un XML E2B(R3), ni que esa API opere mediante AS2, SOAP o certificados X.509. **No confundir** XML/EDI EudraVigilance, pasarela FEDRA y notificación web a servicios de farmacovigilancia.

**[VERIFICADO EXTERNO]** Para esa pasarela, el BOE distingue **respuesta HTTP 200** de **acuse de recepción**, con acuses que pueden informar de errores que impiden la incorporación. Por ello, el futuro estado del envío deberá conservar separadamente: intento y fecha, resultado de transporte, acuse real, validación/rechazo, revisión o reenvío; **200 OK ≠ notificación definitivamente aceptada**. Las reglas concretas de reintentos, plazos, autenticación y datos personales dependerán del convenio y del emisor autorizado; no implementarlas anticipadamente como comportamiento universal.

**[LIMITACIÓN DE LAS FUENTES]** Las [preguntas y respuestas de AEMPS sobre transmisiones electrónicas de 2014](https://www.aemps.gob.es/farmacovigilancia-humana-industria-farmaceutica/preguntas-y-respuestas-sobre-transmision-electronica-de-sospechas-de-reacciones-adversas-posautorizacion/) describen fundamentalmente **TAC/ReTAC**, formatos XML y referencias ICH E2B(R2); son antecedentes útiles, **no** especificación vigente de la API REST autonómica publicada en 2026. Que una guía general sea pública no significa que los requisitos de implementación institucional de FEDRA estén completamente publicados.

**[RECOMENDACIÓN PARA FUTURO MAPPING; NO CONTRATO APROBADO]** Mantener una entidad lógica **ICSR/caso** diferenciada de paciente, seguimiento, cada EA y cada medicamento. Conservar múltiples reacciones, sospechosos/concomitantes, identificadores, texto original y codificación MedDRA versionada, tiempos realmente registrados, fuentes, seriedad regulatoria explícita y seguimiento/correcciones. Registrar **dosis, vía, pauta, presentación, lote o exposición exclusivamente cuando estén documentados y autorizados**: un futuro mapeo regulatorio puede exigir datos que hoy no existen, pero no permite inventarlos. La EMA también prescribe terminología **EDQM** para forma farmacéutica y vía en su circuito E2B(R3); no trasladar automáticamente esa exigencia a la API FEDRA sin su especificación.

**Fuentes complementarias oficiales:** [EMA — Electronic reporting / E2B(R3)](https://www.ema.europa.eu/en/human-regulatory-overview/research-development/pharmacovigilance-research-development/eudravigilance/eudravigilance-electronic-reporting); [EMA — Change management, guía EU y business rules](https://www.ema.europa.eu/en/human-regulatory-overview/research-development/pharmacovigilance-research-development/eudravigilance/change-management-eudravigilance-system); [EMA — Guía ICH E2B(R3)](https://www.ema.europa.eu/en/scientific-guidelines/ich-e2b-r3-electronic-transmission-individual-case-safety-reports-icsrs-data-elements-message-specification-implementation-guide); [BOE — convenio de pasarela FEDRA 2026](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-17878).

### 4.2 Decisiones de producto y alcance transversal · 17-10-2026

**[ACORDADO FUNCIONALMENTE — actualización posterior al alineamiento inicial]** La responsable de producto ha revisado el **mockup G0 de EA 0..N** y ha **aprobado su dirección visual y el patrón de una ficha por EA**, con entrada incremental «Añadir EA». La visualización cómoda de hasta cuatro fichas no impone límite de cardinalidad. **Esta conformidad visual no sustituye la validación de campos clínicos, criterios de terminología ni QA del módulo clínico por Farmacia.** Véase el [registro vivo de decisiones y responsables](../ops/FARMACIA_EA_DECISION_REGISTER_20261017.md) (WO documental #777).

**[ACORDADO FUNCIONALMENTE]** La **fecha del acto farmacéutico o clínico es común** a todas las fichas EA registradas en esa visita y debe capturarse una sola vez en la cabecera del acto. La **fecha real de inicio o fin de cada EA**, si se documenta, es semánticamente independiente y puede diferir tanto entre eventos como de la fecha de visita. No presuponer que todos empezaron ese día, ni copiar automáticamente la fecha del acto a campos EA ausentes. En la maqueta G0 R2 la cronología propia del EA queda como sección opcional.

**[ACORDADO COMO DIRECCIÓN DE PRODUCTO]** MedDRA, CTCAE 6.0 o **ambos** son modos configurables por deployment/hospital/servicio. El selector del mockup solo sirve para **simular configuraciones**: en la interfaz asistencial definitiva se mostrará el modo preconfigurado, sin obligar a cada profesional a escogerlo en cada visita. Si ambos están habilitados, no crear equivalencias ni grados sin correspondencia y validación explícitas. Licencia de catálogo y permisos de notificación FEDRA son asuntos diferentes y siguen pendientes.

**[DIRECCIÓN EVOLUTIVA; NO IMPLEMENTADA NI PRIORIZADA]** El patrón estructurado de EA debe ser **reutilizable por otros servicios clínicos** en sus **visitas de Seguimiento y, cuando proceda, Primera Visita**, además de Farmacia Hospitalaria. No asumir que los flujos, campos o responsabilidades clínicos sean idénticos; decidir con cada servicio cuándo y cómo registrar EA. Esto **no amplía la próxima WO de captura FH a Reumatología, Dermatología u otros módulos**, ni implica compartir datos de pacientes entre deployments.

**[PENDIENTE]** El registro [EA-P02 a EA-P15](../ops/FARMACIA_EA_DECISION_REGISTER_20261017.md) identifica los asuntos a resolver por Farmacia, servicios clínicos, estadística, MSSO/TI o circuito SES/AEMPS y la fase exacta en que bloquean. G0 **visual** está aprobado; G0 **clínico** permanece abierto en campos mínimos, cronología e identidad longitudinal.

## 5. Captura propuesta — funcionalidad visible

[PROPUESTA EN LÍNEA CON LA DECISIÓN]

- Una sección **«Eventos adversos»** con estado del seguimiento `Sí / No / No consta` y una primera ficha EA al registrar `Sí`.
- Control **«Añadir evento adverso»** que cree fichas independientes. Mostrar hasta cuatro de manera cómoda en la interfaz no limita `0..N` del modelo; no bloquear el caso excepcional de un quinto.
- **Buscador tipo autocomplete CIMA**: permitir entrada clínica libre para buscar; devolver candidatos MedDRA con etiqueta, código, nivel terminológico e idioma/versión cuando el catálogo esté autorizado y disponible. El profesional **selecciona/valida**; no codificar automáticamente ni corregir texto clínico en silencio. Mantener opción de texto original/pendiente de codificación y estado sin catálogo.
- En cada ficha EA: término original, codificación, fechas registradas, manifestaciones/observaciones, evolución y actuación. **CTCAE opcional** y solo cuando exista término/criterio aplicable y el equipo lo apruebe. Seriedad regulatoria separada si se incorpora a captura, sin asumir que una clasificación clínica implica notificación.
- **Medicamentos sospechosos seleccionados explícitamente por EA**, con posibilidad de más de uno, y cuestionarios Naranjo/Karch-Lasagna contextualizados para el par EA–sospechoso sin asignación causal automática.
- Persistencia/restauración robusta de varias fichas y cambios de selección, sin perder otras evaluaciones ni duplicar EA al cambiar de línea o volver a la visita.

[PENDIENTE DE VALIDACIÓN CON FH] Vocabulario principal (MedDRA propuesto), idioma, nivel de selección (LLT/PT), indicaciones de uso CTCAE en Dermato/Reuma, qué datos mínimos adicionales se justificarían hoy en el flujo asistencial, ergonomía definitiva y responsabilidades de codificación. No imponer campos regulatorios excesivos antes de validar su utilidad y obligaciones.

## 6. Modelo lógico mínimo propuesto (no esquema implementado)

```text
Patient local al despliegue
  └── PharmacyAct / Seguimiento (identidad y cronología explícitas)
        ├── TherapeuticLine 0..N (presente / incluida / evaluada / dispensada: conceptos separados)
        └── AdverseEvent 0..N
              ├── adverse_event_id (estable) + observaciones/versiones fechadas
              ├── verbatim_description
              ├── coding 0..N: system, code, label, term_level, language, version, validation_status
              ├── onset/end/outcome/action (cuando estén registrados)
              ├── CTCAE term/version/grade, nullable, solo si corresponde
              ├── regulatory_seriousness_criteria: explícitos, no derivados de CTCAE
              └── suspect_relations 0..N
                    ├── referenced_medication_or_line (explícita, identidad/procedencia)
                    └── causality_assessments 0..N (método, resultado, fecha, versión)

RegulatoryCase / Notification (futuro, separado del acto y del EA):
  candidate/draft → reviewed/approved → submitted → acknowledged/rejected
  con event/case ids, origen, destinatario, autoría, timestamps, comprobante y errores reales.
  Estos estados son propuesta de dominio, NO un runtime implementado.
```

**Precaución:** un ICSR puede incluir varios EA y múltiples medicamentos; **no es obligatorio que cada seguimiento cree un ICSR ni que cada EA sea una notificación separada**. Las reglas de agregación de casos, deduplicación, consentimiento/base jurídica, comprobación de mínimos, responsabilidades profesionales y circuito institucional quedan pendientes de especificación AEMPS/SES.

## 7. Fronteras de producto y de datos

- **Captura clínica**: debe funcionar sin FEDRA y, si es viable conforme a licencia, con catálogo MedDRA local/offline. No exponer credenciales en navegador ni enviar textos libres clínicos/pacientes a servicios externos no autorizados. Un buscador de términos puede requerir conexión solo desde un backend autorizado o utilizar un índice local con permisos de distribución.
- **Exportación analítica longitudinal**: respeta el contrato publicado de una fila por acto × línea explícita (o fila sin línea); los EA pertenecen a su ámbito clínico y **no crean filas terapéuticas adicionales**. Debe evitar contabilización múltiple y preservar `0..N`; estructura de columnas dinámicas, JSON u otra técnica **no decidida**. Mantener intactos CSV de Estadísticas 37 y Export V2 152 hasta WO específica.
- **Interoperabilidad farmacovigilancia**: salida futura separada (ICSR/pasarela FEDRA si autorizado), con validación humana, sin notificación implícita ni compromiso sobre endpoint, payload, autenticación, acuse o destino. No usar Export V2 como sustituto improvisado de notificación.
- **Datos y seguridad**: para desarrollo y QA únicamente datos sintéticos; los datos de pacientes, profesionales, identificadores, credenciales y exportaciones reales nunca van a GitHub ni servicios externos sin autorización y controles institucionales.

## 8. Gates antes de construir y antes de pilotar

**G0 — decisión clínica de captura:** equipo FH confirma escenarios 0/1/N, término original + normalización, unidad EA vs visita vs sospechoso, criterio para reidentificar EA repetidos, CTCAE sí/no y alcance mínimo. Revisar la interfaz mediante un mockup HTML/CSS antes de modificar Seguimiento.

**G1 — terminología y licencias:** MSSO MedDRA confirma modalidad de acceso, uso de API, derecho a precargar índice, redistribución entre hospitales y proceso de actualización/versionado; NCI CTCAE fuente/formato/uso; mapping CTCAE 6.0 ↔ versión MedDRA vigente verificado por códigos, nunca aproximación por texto.

**G2 — captura técnica:** WO atómica aislada; esquema y migración compatibles con histórico (EA singular, desconocidos); test de múltiples EA para un solo sospechoso, un EA con varios sospechosos, dos EA con sospechosos distintos, ausencia de causalidad, recaptura/restauración, errores y fallo seguro. QA de navegador por interacción soportada; no afirmar piloto sin validación clínica.

**G3 — proyección analítica:** WO distinta; resolver materialización CSV y ámbito de cada observación sin producto cartesiano ni pérdida, con comprobación de cantidades por `adverse_event_id`, `act_id`, `line_id`, y trazabilidad. No confundir act*line con número de EA.

**G4 — FEDRA (futuro, no bloqueante de G2):** SES/Centro Autonómico de Farmacovigilancia/AEMPS confirman legitimidad y modalidad del emisor, documentación técnica concreta, datos mínimos y obligatorios, ICSR/ICH E2B(R3) y particularidades nacionales, autenticación, pruebas de homologación, respuesta/acuses, errores, auditoría, protección de datos, responsabilidades, plazos y circuito de autorización humana. Solo entonces especificar adaptador y probarlo; hoy **NO INTEGRADO / NO APTO PARA PILOTO**.

## 9. Delimitación de WOs posteriores

No mezclar: **WO documental de alineamiento** (este texto, índices y backlog) ≠ **WO de UX/contrato de captura 0..N** ≠ **WO terminológica** ≠ **WO de exportación longitudinal** ≠ **WO adaptador FEDRA**. Evitar ampliar una WO de demo con arquitectura futura. **La WO #775 es exclusivamente documental; su aprobación no autoriza cambios técnicos, integración FEDRA ni despliegue. La publicación y el cierre administrativo requieren autorización y verificación propias.** No tocar `main`.

## 10. Rutas documentales y NO TOCA

1. **Documento:** `docs/architecture/FARMACIA_EA_ESTRUCTURADOS_FEDRA_READINESS_20261014.md` — contenido del presente alineamiento.
2. **Índice:** `docs/INDEX.md` — una fila junto al contrato de exportación FH con estado «ACORDADO FUNCIONALMENTE / NO IMPLEMENTADO / FEDRA PENDIENTE INSTITUCIONAL».
3. **Backlog:** `docs/ops/FARMACIA_ESTADO_Y_BACKLOG_20261011.md` — una fila de futura evolución clínica EA 0..N y terminología, diferenciada de `SIL-REV-018-B` y de exportación.
4. **Estado operativo:** `docs/ops/WORK_ORDER_STATUS.md` — revisar su coherencia al cerrar la WO documental; reconciliar mediante alcance separado solo si existe una discrepancia material.

**NO TOCA:** `scripts/**`, pantallas HTML, `docs/contracts/FARMACIA_ANALYTICAL_LONGITUDINAL_EXPORT_V1.md`, Export V2, F4.4/F4.5/F4.6, Excel Enfermería, configuración/arnés, `main`, datos reales, integración FEDRA. No abrir issue/push/PR/merge sin autorización específica.

## 11. Fuentes de autoridad verificables (consulta 14-10-2026)

- **GitHub:** `docs/INDEX.md`; `docs/ops/WORK_ORDER_STATUS.md`; `docs/ops/FARMACIA_ESTADO_Y_BACKLOG_20261011.md`; `docs/contracts/FARMACIA_ANALYTICAL_LONGITUDINAL_EXPORT_V1.md`; `docs/architecture/PROMUEVE_NEXUS_SALIDA_AGNOSTICA_FH_V4_ALIGNMENT_20261012.md`; `farmacia_seguimiento.html`; `scripts/farmacia_seguimiento.js`; `scripts/farmacia_export_v2_core.js`; `scripts/farmacia_statistics_cohort.js` (rama canónica; confirmar HEAD en ejecución).
- **AEMPS:** *Guía de codificación SEFV-H (2025)*: https://www.aemps.gob.es/vigilancia/medicamentosUsoHumano/SEFV-H/docs/guia-codificacion-SEFV-H-2025.pdf
- **AEMPS:** *Qué datos contiene FEDRA*: https://www.aemps.gob.es/medicamentos-de-uso-humano/farmacovigilancia-de-medicamentos-de-uso-humano/informacion-de-sospechas-de-reacciones-adversas-a-medicamentos-de-uso-humano/informacion/que-datos-contiene/
- **BOE:** *BOE-A-2026-17878*, convenio AEMPS-Generalitat Valenciana sobre pasarela API FEDRA: https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-17878
- **MSSO:** *MedDRA API Function Summary* (GxP frente a sandbox y búsquedas): https://files.meddra.org/www/Website%20Files/APIs/Summary_of_API_Functions.pdf
- **MSSO:** *MedDRA Subscription Rates* y *Terms & Conditions*: https://www.meddra.org/subscription-rates ; https://www.meddra.org/node/2773
- **NCI:** *CTCAE and AE Reporting* y versión v6.0: https://dctd.cancer.gov/research/ctep-trials/for-sites/adverse-events
- **ICH:** *E2B(R3) ICSR Specification and Related Files*: https://admin.ich.org/node/348

**Conclusión:** un acto clínico con EA 0..N, terminología trazable y relaciones explícitas EA–medicamento puede aportar eficiencia asistencial y preparar un futuro circuito regulatorio. La interoperabilidad FEDRA queda como **capacidad objetivo condicionada**, no como integración existente, notificación automática, contrato homologado ni garantía de compatibilidad.