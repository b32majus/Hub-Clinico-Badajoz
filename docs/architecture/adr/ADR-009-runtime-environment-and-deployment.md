# ADR-009 — Entorno de ejecución y despliegue

**Estado:** `ACCEPTED` (decidido por Sil, 2026-11-21)
**Fecha:** 2026-11-21
**Issue:** #956

## Contexto

El repo nació el 2026-03-04 a partir de Reuma v1. Se hizo como páginas HTML estáticas para que funcionara sin servidor y sin instalar nada en los ordenadores del hospital. El primer GitHub Pages es del 2026-06-12. El Freeze del 2026-09-24 y los ADR-001…008 fijaron el monolito modular, la Home como entrada, la configuración por hospital y el release inmutable.

El discovery de infraestructura del SES (2026-10-02, `docs/legacy/ramas/SES_INFRA_AUTOMATION_DISCOVERY_20261002.md`) y las pruebas de Sil del 2026-09-17 (`docs/ops/PROMUEVE_BACKLOG.md`) dieron estos resultados:

- **Bloqueado:** el disparador HTTP de Power Automate desde Pages (exige Premium) y Graph/SharePoint directo (no hay acceso a App Registrations).
- **Descartado:** OneDrive.
- **Funciona:** SharePoint List con Power Automate Standard.
- **Prueba de concepto superada:** escribir en una carpeta de red con File System Access.

La situación de despliegue estaba repartida en varios documentos que no coinciden. El plan de Reuma v2 (junio) exigía «no romper `file://`» y «no añadir CDN», pero el código ya no lo cumplía:

- la Home y el catálogo de Farmacia usan `fetch`;
- Validación usa módulos ES;
- hay Font Awesome 6.0.0-beta3, Chart.js y Google Fonts por CDN.

No hay incidentes reales del hospital registrados en GitHub: las restricciones del entorno eran supuestos.

## Decisión

1. **Hoy** los hospitales abren Nexus desde **GitHub Pages**: la rama `promueve/nexus-v4`, servida bajo una subruta.
2. **Objetivo:** un **servidor real del hospital**, autoalojado. Todavía no está autorizado. Hasta entonces no dependemos de ningún servidor propio.
3. **Abrir desde carpeta (`file://`): abandonado.** Sustituye la regla «no romper `file://`» de `docs/PLAN_IMPLEMENTACION_REUMA_V2.md`.
4. **Nada se instala en el puesto asistencial**: ni programas ni extensiones, solo el navegador (ADR-007).
5. **Puestos:** pantallas modernas y Edge o Chrome actualizados (Sil, 21-11). El uso principal es el escritorio; la tablet se cubre y el móvil es secundario.

## Requisitos (R1-R10)

| # | Requisito | Cómo se garantiza |
|---|---|---|
| R1 | El mismo artefacto funciona en Pages (bajo subruta) y en el futuro servidor del hospital, sin rehacer nada al cambiar | Solo rutas relativas; nada que dependa de Pages en concreto; check de navegador que sirve el sitio bajo una subruta |
| R2 | Cero dependencias externas para funcionar. Lo de fuera solo como extra con respaldo (CIMA en vivo con catálogo publicado, decisión del 12-11) | Iconos, gráficos y letra guardados en `vendor/` con versión, origen, licencia y hash (ADR-007, #715); CSP en `<meta>`; check que falla si una página pide un recurso externo no permitido |
| R3 | Navegadores modernos: lo que Edge y Chrome traen de serie, sin compilar | Módulos ES nativos y CSS moderno (ADR-010); QA en Chrome y Edge |
| R4 | Pantallas modernas, uso principal en escritorio | Diseño de escritorio primero; tablet cubierta; móvil secundario; menos CSS y sin fuentes que bloqueen la carga |
| R5 | Ordenadores compartidos | Botón «Terminar» igual en todos los módulos: borra del navegador el Excel cargado y el paciente abierto para que el siguiente usuario no los vea. Qué borra exactamente lo decide #713 (F6.1). Se mantiene un paciente a la vez (#940) |
| R6 | Los fallos se avisan siempre, nunca en silencio (ventanas emergentes bloqueadas, sin portapapeles, almacenamiento no disponible, datos que no cargan) | Una sola pieza de aviso de error y estado (patrón de la Home); cada pantalla dice qué falla y qué hacer |
| R7 | Privacidad | Nada clínico en la URL ni en los nombres de clave del navegador; sin analítica ni telemetría; CSP (ADR-008, #714, PROM-PRIV-001) |
| R8 | Accesibilidad WCAG 2.1 AA | Foco visible, teclado, contraste calculado en la paleta, nunca solo color (`CODING_STANDARDS.md` §14) |
| R9 | Se puede imprimir | Hoja de impresión en la base común (oculta la navegación, fondo blanco) |
| R10 | Se sabe qué versión tiene cada uno | Un identificador de versión del sitio, el mismo en todas las `?v=` y visible en la interfaz, generado por la herramienta de versión (ADR-010) |

## Consecuencias

- Se retiran las restricciones que imponía `file://`: scripts ES5 con globales, orden manual de `<script>` y prohibición de `fetch`. Lo que las sustituye está en ADR-010.
- R2 concreta F6.3 (#715) para la interfaz.
- R5 depende de #713. Hasta que se decida, el botón no borra nada que no borre ya «cerrar sesión» en Reuma.
- Cada hospital sigue teniendo un despliegue fijo y se cualifica por separado, hospital por módulo (Freeze; F7 #724-#726).

## Pendiente de confirmar (no bloquea)

- Si algún hospital tiene bloqueos de red o una lista de dominios permitidos, se añade a R2.

## Reabrir si

- El SES impone otro navegador, otro entorno de puesto o un hosting con requisitos distintos.
- Se autoriza el servidor del hospital y exige algo que una web estática no puede dar. Llegar al servidor por sí solo no cambia el artefacto (R1).
