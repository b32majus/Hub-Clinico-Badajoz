# DermaNEXus Psoriasis · orden de construcción clínica y UX (candidato local)

**Fecha:** 2026-11-12 · **Promotor funcional:** Sil · **Estado:** PLAN DE TRABAJO APROBADO EN CONVERSACIÓN / NO PUBLICADO EN CANÓNICA / SIN HOMOLOGACIÓN CLÍNICA.
**Base:** `b32majus/Hub-Clinico-Badajoz` rama `promueve/nexus-v4`, prototipo aislado `work/derma-pso-reuma-shell-20261112@444f9d1`. PR #916 DRAFT sigue sin merge. Contratos #697 (Derma base) y #728 (PsO) abiertos sin firma clínica.
**Instrucción:** sil 12-11: «Primera Visita y Seguimiento deben alimentar lo demás»; «deja primero documentado cómo vamos a proceder y empieza por Primera Visita». Diseño UX de Reuma como referencia; catálogo de variables Valme como **donante**, no como norma médica ni identidad institucional.

## Orden de ejecución acordado (separar entregables y WOs)

| Fase | Qué se termina | Qué la habilita | Qué NO debe presentarse todavía |
| --- | --- | --- | --- |
| **F1 — Primera Visita, AHORA** | Formulario PsO completo y manejable por bloques: cabecera, historia, comorbilidades, localizaciones, exploración, síntomas, cuestionarios, tratamientos y plan. Chips y desplegables con semántica segura, navegación entre bloques y estado de cumplimentación de **borrador** | Prototipo actual y 174 campos fuente en `modules/derma/pso_valme_fields.js` | Guardado, acto firmado, calculadora clínica homologada, diagnóstico automático, validación de FH |
| **F2 — Seguimiento** | Estructura de visita repetida diferenciada del inicio, estado actual vs histórico, comparación y precarga **solo tras acuerdo clínico y fuente válida**. El formulario de seguimiento sigue siendo explícito y editable | F1 y decisión sobre qué campos se revisan y cuál es su vigencia | Reutilización indiscriminada de datos previos, switch o continuación implícitos |
| **F3 — Modelo longitudinal** | Contratos de paciente, visita, IDs de acto, fecha clínica, fuente/autoría y estado de escritura; borrador → comprobación → almacenamiento/restauración solo cuando haya backend/Excel aprobado | Decisiones #697/#728, protección de privacidad y política de persistencia | Demostrar una lista de visitas reales usando borradores en memoria; escribir datos clínicos sin soporte |
| **F4 — Pantallas consumidoras** | Quick View, dashboard individual, historia, filtros/estadísticas con **una única lectura del mismo contrato**, diferenciando `pendiente`, `incompleto`, `no consta` y resultado disponible | Datos F1/F2 + contrato F3 y reglas de evaluabilidad firmadas | KPIs clínicos, líneas terapéuticas o categorías de control inventadas |
| **F5 — Pulido visual común** | Homogeneizar tipografía, proporciones, espaciado y accesibilidad de Inicio, sidebar y formularios con Reuma | Flujos revisados y estables | Refactor transversal prematuro de todos los módulos |

## Contrato del primer corte F1 · Primera Visita

**Se conservan los 174 nombres de campos de Valme como inventario de trazabilidad (incluidos seguimiento y derivados), no como 174 inputs ni esquema de Nexus.** Primera Visita solo expone grupos y entradas aplicables a su acto. No introducir nuevos datos de salud, algoritmos o catálogos no aprobados.

**Recorrido objetivo en demo:** DermaNEXus Inicio / buscador → Nueva Visita → paciente **sintético** explícito → patología `Psoriasis` explícita → formulario con **índice de secciones clicable** y estado visual `sin consignar` / `borrador con datos` / `revisado` (solo si existe confirmación real del grupo) → consulta/editado temporal de respuestas → Quick View y dashboard **no interpretan el borrador como acto clínico persistido**.

**Secciones por orden asistencial a revisar con Dermatología:** (1) datos de visita y procedencia; (2) historia PsO, fechas, fenotipo, desencadenantes y tratamientos previos; (3) comorbilidades; (4) localizaciones y zonas especiales; (5) exploración BSA/PGA/componentes PASI (sin total clínico no homologado); (6) síntomas; (7) DLQI, (8) PURE-4 como instrumentos candidatos con texto y versiones pendientes; (9) derivaciones; (10) tratamiento documentado (4 familias y filas editables, sin auto-posología); (11) impresión/plan/revisión.

**Interacciones F1:** índice de secciones permite saltar sin alterar datos; cuenta únicamente respuestas realmente consignadas, jamás se describe como porcentaje de validación clínica. Los chips no seleccionados significan `no consignado`; marcar `No presente` exige confirmación explícita por grupo. No activar automáticamente campos, derivados, tratamientos, derivaciones ni scores por respuesta parcial. Un botón `Guardar`/finalizar no debe aparecer sin almacenamiento real; no usar `completo` como firma clínica. Fechas ausentes permanecen vacías. Campos libres permanecen libres donde el donante no ofrece opciones verificadas. Si se muestran ítems DLQI/PURE-4 sin licencia/versiones, **etiqueta de demostración**, no texto de cuestionario oficial.

**Datos:** estado efímero por `paciente sintético + tipo visita + patología explícita`, separado; cambio de paciente/visita no arrastra selección clínica. Valor de `0` explícito difiere de ausencia. Ninguna selección del fármaco rellena dosis, vía, pauta, inducción, frecuencia, duración o mecanismo de decisión.

## QA y puertas de avance

- **F1:** ejecutar Chromium sobre ruta de prototipo con prueba real de orden, navegación de bloques, chips, estado, datos desconocidos, tratamientos seguros, cambio de paciente, móvil, consola, storage y fuga de datos; conservar 8/8 PsO y 8/8 shell en verde. Diferenciar QA automatizada de revisión humana.
- **F2:** test específico de aislamiento primera/seguimiento, fuente de precarga y fechas, ausencia de acciones clínicas deducidas.
- **F3:** no implementar guardado sin contrato de procedencia y persistencia y autorización separada.
- **F4:** consumidores leen únicamente datos permitidos (fuente + estado + elegibilidad); ningún borrador se convierte en un acto.
- **F5:** QA visual tras estabilizar rutas y vocabularios.
- Cada fase exige WO propia y prueba focal; no reauditar lo ya concluyente. Ninguna versión publicada en `promueve/nexus-v4` o la demo privada se mueve automáticamente al cerrar una fase. Autorización específica para cada push/PR/merge/deploy.

## Riesgos y NO TOCA

- **Pendiente clínico:** Dermatología debe validar variables obligatorias, instrumentos/versiones y licencias, rangos/cálculos, precargas, control, derivaciones y roles. La evidencia Valme acredita presencia de campos, no homologación clínica.
- **Pendiente institucional:** `siteId`, identificación, origen/autorización, fecha de acto, firma y almacenamiento de visitas, #697/#728. No usar NUSHA como identidad universal.
- **No tocar:** Reuma, Farmacia, HS, Valme donante, Home global, API, Excel/backend, datos reales, credenciales, worktrees ajenos, GitHub Pages, PR #916, instancia privada Tailscale, `main`, agentes Herdr.
- **Trazabilidad:** esta fase es candidata local. Antes de publicar, decidir cambios exactos de `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` y contrato vivo, sin escribir `implementado` por una captura o test de demo.
