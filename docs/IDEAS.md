# IDEAS — futuro no comprometido (27-10-2026)

Aquí viven las ideas **no decididas**. No se convierten en issue hasta que se decidan (así no se repite la avalancha de 61 issues en bloque). Cada idea enlaza al documento largo que la desarrolla. «RAMA» = copia en `docs/legacy/ramas/`.

## Adaptadores, Bridge y persistencia
- **Un acto, varios destinos** (Excel manual, Bridge + Office Script, Power Automate, API/BD) conviviendo. Dirección decidida; ver `docs/DECISIONES.md`.
- **Excel Bridge por hospital:** hojas por servicio, hojas técnicas, vistas `APP_*` e ida y vuelta. Publicado solo el libro de Cáceres; faltan Processor, `APP_*` y Read Adapter. → arquitectura V4 §9.
- **Office Script Processor** (raw → tablas relacionales). Código en RAMA; según la auditoría Microsoft es «fuente de requisitos, no se fusiona tal cual». → `docs/legacy/ramas/office_script_*`
- **Adaptador cloud** (PostgreSQL gestionado) — PROM-DATA-001; **API hospitalaria + SQL** (nunca navegador → BD) — PROM-INTEG-001; **hosting estático fuera del flujo clínico** — PROM-PRIV-001. → `docs/ops/PROMUEVE_BACKLOG.md`
- **Rutas de infraestructura SES:** A) Forms → Power Automate → SharePoint; B1) navegador → carpeta de red; B2) Power Automate → Gateway → file server; C) VM + API + BD. → `docs/legacy/ramas/SES_INFRA_AUTOMATION_DISCOVERY_20261002.md`
- **Límites de Microsoft** para Office Script y Power Automate. → `docs/legacy/ramas/FARMACIA_MICROSOFT_V4_READINESS_AUDIT_20260915.md`
- **Llevar Reuma al Bridge/Processor común** (los 497 solo como compatibilidad).
- **Exportación analítica longitudinal** (1 fila por acto × línea evaluada). Contrato FH 14-10, sin implementar.
- **Parser de orden clínica y de Presalud** (determinista, vista previa y confirmación).

## PROMs y PREMs
- **PROM Capture Gateway:** tarjeta QR permanente + código corto, QR temporal de visita, seudónimo, solo respuestas cerradas, backend intercambiable. → `docs/architecture/PROM_CAPTURE_GATEWAY_QR_SEUDONIMIZADO_20260714.md`
- **Forms como adaptador transitorio** con cola SharePoint (`PENDING/PROCESSING/PROCESSED/ERROR`). → Discovery SES.
- **PROMs por patología** (hoy DLQI + EVA fijos) y chips con interpretación.
- **Filtro poblacional por PROM** (instrumento, valor, rango, vacíos).
- **PREMs** institucionales (SEFH en Forms del hospital) y PREMs anónimos por QR.

## Identidad, Enfermería y profesionales
- **Identity Plane local** (CIP ↔ clave seudónima bajo custodia del hospital) y **Clinical Event Plane** seudonimizado. Diferido hasta que haya servidor. → `IDENTITY_PLANE_Y_NURSING_READINESS_GATEWAY_20260714.md`
- **Nursing Readiness Gateway** (estados cerrados de analítica, serología, vacunación, profilaxis, «OK Enfermería para Farmacia»).
- **Roles y permisos por área.** El Freeze rechaza por ahora una autenticación propia.

## Tratamiento y renovaciones
- La renovación pertenece a la línea de tratamiento; fechas confirmadas, verificadas y estimadas son distintas; tarea ≠ alerta ≠ notificación. MVP 1 sin cron, MVP 2 con job diario. → `TREATMENT_LIFECYCLE_ENGINE_Y_RENOVACIONES_20260714.md`
- El semáforo de 15/30/45 días **no** es un valor por defecto autorizado.

## Configuración y plataforma
- **Control Plane federado** y **V5 agnóstico** (Organización → Servicio → Programa → Patología → Recorrido → Visita → Formulario → Variable). Diferidos deliberadamente por el Freeze; reabrir solo con variación repetida real (Badajoz↔Mérida, Reuma↔Derma). → `docs/legacy/ramas/FH_V4_6_control_plane_federado_20260713.md`
- **Hilo documental del Control Plane:** dossier 04-06 → V4.6 (13-07) → arquitectura V4 (31-07) → Freeze (24-09) → reconciliación (03-10) → PR #778 (17-10).

## Interoperabilidad, EA y farmacovigilancia
- **FHIR/openEHR:** un acto canónico proyectado a TXT JARA, Excel, FHIR y openEHR candidatos (F4.6). Perfiles: decisión del SES.
- **EA estructurados:** MedDRA con código y versión + texto original; CTCAE opcional; sospechoso y causalidad por EA. FEDRA solo con autorización SES/AEMPS.
- **PR #778 (abierta):** MedDRA/CTCAE configurable por hospital o servicio; patrón EA reutilizable en otros servicios; fechas propias por EA.
- **Farmatool/Presalud:** discovery de versión, API y permisos. **Salida textual** para pegar en la orden clínica.

## Catálogo / CIMA
- Actualización automática mensual (API → normalización → diff → PR revisable).
- Catálogo local especial (ensayo, compasivo, extranjera) que no se sobrescribe.
- Propuesta editable desde la ficha técnica tras elegir presentación; solicitud por molécula para biosimilares.

## Informes y estadística
- SIL-REV-018 B (PROM, validación, causalidad), C (dosis/vía/pauta), D (ventana temporal, líneas simultáneas) y E (sexo/edad/comorbilidades/actividad).
- PDF de informes; filtros guardados y compartidos V2; indicadores del proyecto.

## Dermatología
- Módulo base, HS y PsO longitudinales (IHS4, Hurley, PROs por acordar), solicitud Derma→FH, VHB (pauta completa ≠ suficiente para iniciar), eccema de manos (a la espera del equipo).

## Circuito asistencial de Cáceres (no es software de Nexus)
- S1–S13 y P1–P12 del informe Cáceres v5: QR y correo clasificado, educación, PREMs, coordinación Digestivo/Calidad, huecos en agenda, feedback Derma↔FH, Medicina Preventiva, auditoría de FarmaTools. → `docs/ops/PROMUEVE_REQUIREMENTS_TRACEABILITY_20261011.md`

## Cómo mantenerlo
Una idea que se decide pasa a `docs/DECISIONES.md` y, si es trabajo, a un issue con su epic. Una idea descartada se marca aquí `DESCARTADA` con el motivo, no se borra.
