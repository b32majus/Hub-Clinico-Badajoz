# DermaNEXus Psoriasis · orden de construcción clínica y UX (candidato local)

**Fecha:** 2026-11-12 · **Promotor funcional:** Sil · **Estado:** PLAN DE TRABAJO APROBADO EN CONVERSACIÓN / NO PUBLICADO EN CANÓNICA / SIN HOMOLOGACIÓN CLÍNICA.
**Base:** `b32majus/Hub-Clinico-Badajoz` rama `promueve/nexus-v4`, prototipo aislado `work/derma-pso-reuma-shell-20261112@444f9d1`. PR #916 DRAFT sigue sin merge. Contratos #697 (Derma base) y #728 (PsO) abiertos sin firma clínica.
**Instrucción:** sil 12-11: «Primera Visita y Seguimiento deben alimentar lo demás»; «deja primero documentado cómo vamos a proceder y empieza por Primera Visita». Diseño UX de Reuma como referencia; catálogo de variables Valme como **donante**, no como norma médica ni identidad institucional.

## F2.1 · Corrección funcional y UX tras revisión humana — CANDIDATA LOCAL (12-11-2026)

**Origen de la revisión:** Sil validó el CIP nuevo y detectó que el contenido F2 «no está bien», y que se habían perdido chips, botones, estética y UX/UI de Primera Visita. Inspección real de los 11 apartados: la primera pantalla estaba dominada por PASI en desplegables, chips escondidos, PURE-4/Morisky respondibles sin enunciados, tratamiento anterior como campo sin fuente. Las 38 pruebas técnicas previas no fueron aprobación clínica ni de UX.

**Cambio implementado solo en la rama aislada work/derma-pso-f2-functional-ux-20261112**, base F2 bdffcba, sin actualizar demo privada ni GitHub canónico:
- **Misma UX F1:** chips de síntomas, localizaciones y familia terapéutica visibles desde el inicio; selección solo por color, sin check. Comorbilidades como revisión opcional, nunca «sin cambios» inferido. F1 no se edita. No recuperar tarjeta de guía ni botones «Siguiente apartado».
- **Orden F2:** contexto → tratamiento declarado → síntomas → localizaciones → PASI/actividad → DLQI candidato → adherencia/tolerabilidad/decisión → comorbilidades opcionales → PURE-4 pendiente → derivación realizada explícita → plan.
- **Tratamiento:** sin historia conectada. Cuatro familias de chips (un grupo visible por vez); relación por línea opcional y expresamente elegida: actual_referido, anterior_referido, propuesto_no_validado. Contexto muestra únicamente datos del borrador en sesión, nunca tratamiento válido por historia. Un nombre no escribe dosis, vía, pauta, continuidad, inducción, switch o validación. Sugerencias Valme provisionales.
- **Actividad/PASI:** 4 regiones en tarjetas con 4 componentes cada una, BSA %, PGA, cero distinto de vacío, sin cálculos ni interpretación. DLQI conserva 10 ítems candidatos sin total clínico.
- **Revisión:** chips de adherencia, efectos adversos y decisión; detalles condicionales, confirmación antes de descartar información previa. Ninguna propuesta equivale a solicitud ni validación FH.
- **Instrumentos incompletos:** PURE-4 y Morisky-Green no presentan controles de respuestas mientras no se aprueben textos, derechos, versiones y puntuaciones. Sus 8 claves fuente permanecen en el crosswalk, sin aparentar cuestionario completado.
- **Plan:** fecha orientativa adicional extra_seg_proxima_fecha_prevista independiente de proxima_revision (texto donante); no programa cita ni sobrescribe campo Valme. Los campos extra no están en contrato clínico aprobado ni son exportables a piloto.

**QA técnica:** Chromium F2 original 8/8 adaptado a nueva secuencia + batería UX 9/9 + regresiones F1/PsO/Reuma-shell/CIP, **47/47 PASS**. Capturas completas desktop/móvil y focales PASI, tratamientos y decisiones inspeccionadas. No hay QA clínica humana de este corte, instrumento clínico homologado, persistencia F3 ni consumidores F4. Demo Tailscale sigue con F2 anterior hasta GO independiente de despliegue privado y QA HTTPS.

**Histórico:** el apartado posterior «Estado F2» describe el primer corte técnicamente verde, con errores de diseño identificados después. Este bloque F2.1 prevalece para la revisión F2. INDEX/WORK_ORDER_STATUS canónicos no reflejan estos cambios locales.

## F1 · Revisión UX solicitada por Sil (12-11-2026) — CANDIDATA LOCAL

- La pantalla empieza como Reuma: **buscar CIP** y, si aún no consta, introducirlo; después **nombre y apellidos, sexo y patología** explícitos. En la demo solo se aceptan identidades ficticias con prefijo `DEMO-`, sin conexión hospitalaria, sin historia persistida ni autorización de uso con pacientes.
- **Retirada por revisión humana:** tarjeta «¿Qué necesitas registrar?», índice por secciones y botones «Siguiente apartado». La sección/visita conserva el acordeón clínico. Chips seleccionados solo cambian de color (ARIA pressed preservado, sin ✓ visible).
- **Datos nuevos propuestos, FUERA de los 174 de Valme:** situación tabaquismo (`Fumador actual` / `Exfumador`), cigarrillos/día o años de abandono; consumo de alcohol (`Consumo actual` / `Consumo anterior`) y bebidas/semana. Solo aparecen tras seleccionar el chip correspondiente y son entradas explícitas editables. No se calcula ningún riesgo y los no seleccionados no son negativos.
- **DLQI 10 ítems:** mostrado el texto completo **de la fuente Valme**, con ítem 7 condicional y «Sin relación» distinguido de «Nada». **Hallazgo crítico:** el ítem 9 de `scripts/farmacia_primera_visita.js` trata de sueño, mientras que Valme lo describe como dificultades sexuales. No se ha copiado esa variante contradictoria ni aprobado instrumento/versiones/licencia. Sin total clínico ni interpretación.
- **Tratamientos:** cuatro grupos Tópicos, Sistémicos convencionales, Biológicos y Fototerapia, con búsqueda preliminar por sugerencias Valme (nativa `datalist`), filas añadibles, fármaco/modalidad, **dosis/vía/pauta separadas** e inicialmente vacías. La lista es provisional: **NO es el autocompletado unificado de Reuma/Farmacia**. El componente compartido actual solo reconoce categorías explícitas Reuma (`Sistemicos`, `FAMEs`, `Biologicos`), no topicos/fototerapia PsO. Integración unificada requiere contrato de categorías propio y QA específico.
- **Límite clínico obligatorio:** elegir solo el nombre del fármaco no puede escribir ni sugerir dosis, vía, pauta, inducción o duración. Una eventual selección **explícita de presentación o régimen** podría proponer valores editables únicamente tras aprobación clínica y reglas versionadas; ahora no está implementada.
- No se ha actualizado GitHub canónico ni la demo privada con este refinamiento; no está homologado ni apto para piloto. F2 Seguimiento, F3 almacenamiento y consumidores F4 permanecen en sus fases independientes.

## Orden de ejecución acordado (separar entregables y WOs)

| Fase | Qué se termina | Qué la habilita | Qué NO debe presentarse todavía |
| --- | --- | --- | --- |
| **F1 — Primera Visita, AHORA** | Formulario PsO completo y manejable por bloques: cabecera, historia, comorbilidades, localizaciones, exploración, síntomas, cuestionarios, tratamientos y plan. Chips y desplegables con semántica segura, navegación entre bloques y estado de cumplimentación de **borrador** | Prototipo actual y 174 campos fuente en `modules/derma/pso_valme_fields.js` | Guardado, acto firmado, calculadora clínica homologada, diagnóstico automático, validación de FH |
| **F2 — Seguimiento** | Estructura de visita repetida diferenciada del inicio, estado actual vs histórico, comparación y precarga **solo tras acuerdo clínico y fuente válida**. El formulario de seguimiento sigue siendo explícito y editable | F1 y decisión sobre qué campos se revisan y cuál es su vigencia | Reutilización indiscriminada de datos previos, switch o continuación implícitos |
| **F3 — Modelo longitudinal** | Contratos de paciente, visita, IDs de acto, fecha clínica, fuente/autoría y estado de escritura; borrador → comprobación → almacenamiento/restauración solo cuando haya backend/Excel aprobado | Decisiones #697/#728, protección de privacidad y política de persistencia | Demostrar una lista de visitas reales usando borradores en memoria; escribir datos clínicos sin soporte |
| **F4 — Pantallas consumidoras** | Quick View, dashboard individual, historia, filtros/estadísticas con **una única lectura del mismo contrato**, diferenciando `pendiente`, `incompleto`, `no consta` y resultado disponible | Datos F1/F2 + contrato F3 y reglas de evaluabilidad firmadas | KPIs clínicos, líneas terapéuticas o categorías de control inventadas |
| **F5 — Pulido visual común** | Homogeneizar tipografía, proporciones, espaciado y accesibilidad de Inicio, sidebar y formularios con Reuma | Flujos revisados y estables | Refactor transversal prematuro de todos los módulos |

## Estado F2 · Seguimiento de Psoriasis, CANDIDATO LOCAL — 12-11-2026

- **GO funcional:** Sil «vamos con seguimiento», tras revisar satisfactoriamente el CIP demo de F1. Implementación solo rama aislada: **sin push, PR ni despliegue privado**.
- Identificación común CIP DEMO-, nombre, sexo, selección explícita de Psoriasis y fecha vacía; un CIP sintético sin Primera Visita en demo puede iniciar borrador F2, sin inventar historia o tratamiento previo.
- F2 con 11 secciones de visita actual: datos de consulta, comorbilidades opcionales, localizaciones, exploración PASI/BSA/PGA, síntomas, DLQI candidato, PURE-4 candidato, derivaciones declaradas, tratamientos documentados Seguimiento, adherencia/ajustes explícitos y plan/próxima revisión. No repetir historia inicial ni mostrar tratamiento Primera en el formulario F2.
- Se pueden consultar **solo metadatos no clínicos** de un borrador de Primera Visita en esta sesión (existencia y número de respuestas): no son hechos guardados ni validados. **Ninguna precarga** de fecha, terapia, score o comorbilidades. F2 es un borrador único por CIP+patología, no múltiples visitas longitudinales.
- **QA técnico:** Chromium focal F2 8/8 y regresiones F1 8/8, PsO/Valme 8/8, Shell 8/8 y nuevo CIP 6/6; **38/38 PASS**. Capturas desktop/móvil inspeccionadas. No QA clínica humana ni auditoría independiente.
- **F3/F4 pendientes:** contrato de visitas múltiples y act IDs, provenance, persistencia, historia, elegibilidad de precarga y consumidores. No se han activado cálculos, fármacos inferidos ni actos FH. No apto piloto.

## Estado de ejecución local de F1 — 12-11-2026

**Estado histórico del primer corte F1 (simplificado después por Sil):** mapa de captura con 11 apartados en 4 grupos, botones de salto a sección y «Siguiente apartado», indicador de respuestas consignadas por bloque, reconocimiento de cero legítimo y chips con revisión negativa explícita. La navegación no escribe datos ni decide validación; todos los cálculos y decisiones clínicas siguen bloqueados. La referencia a F2 pendiente corresponde al primer corte F1; F2 se inició después según el estado anterior. F3 (persistencia) y F4 (consumidores) siguen pendientes. La versión privada Tailscale y PR #916 no se han actualizado con F1.

**Verificación técnica:** tests Chromium F1, PsO anterior y Reuma-shell, 8/8 cada uno; capturas locales 1400/390 px examinadas. No hay revisión humana clínica ni auditoría independiente DIA. El producto no está homologado ni apto para piloto. Hasta publicar por GO, el estado en Nexus canónico permanece sin cambiar.

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
