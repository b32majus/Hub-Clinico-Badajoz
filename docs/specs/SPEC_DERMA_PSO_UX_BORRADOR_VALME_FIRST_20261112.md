# DER-PSO #728 · Borrador funcional completo de captura Psoriasis (Valme → DermaNEXus)

**Estado:** PROPUESTA DE UX PARA DISCUSIÓN CON DERMATOLOGÍA / NO HOMOLOGADA / SIN CÓDIGO NI PILOTO. **Fecha:** 2026-11-12. **Base:** `promueve/nexus-v4@2447d34f3ee801a5cca17e5ea19544a9c175c4fe`.
**Instrucción humana (Sil, 12-11):** **partir de las variables que ya existen en Valme**, conservando cobertura, y convertir cuanto resulte razonable en **desplegables, chips seleccionables y controles compactos**, para que el clínico critique un borrador concreto en vez de construirlo desde cero. Esto es una decisión de *alcance del borrador*, **no aprobación clínica de cada dato/escala/regla**.
**Autoridad Nexus:** [#697 navegación por circuito](SPEC_DERMA_BASE_PSO_FIRST_V0_20261112.md); [#728 contrato clínico candidato](SPEC_DERMA_PSO_LONGITUDINAL_CONTRACT_CANDIDATE_V0_20261112.md); [issue #728](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/728). **Fuente donante:** `b32majus/Hub-Clinico-PsO-Valme`, rama `work/pso-valme-train-c-20260930`, formulario `index.html`, esquema `HEADERS` y `Base Datos_PsO_Valme_demo.csv` (174 columnas), más [QA Train-C](https://github.com/b32majus/Hub-Clinico-PsO-Valme/blob/work/pso-valme-train-c-20260930/docs/qa/TRAIN_C_MANUAL_QA_HANDOFF_20260930.md).

## 1. Contrato de presentación acordado

**No crear navegación por patologías.** Una sola barra lateral de DermaNEXus: `Inicio | Primera Visita | Seguimiento | Pacientes | Estadísticas (cuando exista)`. El profesional entra en Primera Visita o Seguimiento, selecciona `Patología: Psoriasis` y ve el formulario PsO. Hasta disponer de contrato HS, **HS no es una opción clínica operativa**.

**La exhaustividad reside en el modelo de captura, no en la longitud de la pantalla.** El formulario presenta secciones plegables, un resumen con campos cumplimentados/pendientes y controles compactos. La interacción puede esconder *grupos no aplicables* por decisión profesional explícita, pero nunca descarta datos ni cambia el significado de campos existentes. En las visitas futuras se sustituirán grupos de otra patología sin duplicar la barra lateral.

**Ejemplo conceptual, no mockup implementado:**
- `Primera Visita / Seguimiento > Patología [Psoriasis ▾] > Datos de visita`
- `Comorbilidades · [HTA] [Dislipemia] [EII] [APs conocida] [Sospecha APs] …`, chips que **permanecen visualmente marcados** cuando se seleccionan, con opción visible de desmarcar/revisar.
- `Localizaciones · [Cuero cabelludo] [Cara] [Tronco] [Pliegues] [Uñas] …` y badges explicativos de zonas especiales seleccionadas.
- `Exploración · BSA [valor] PGA [0…5 ▾] PASI [tabla compacta 4 regiones]`
- `Tratamiento · [+ Añadir línea] Tipo [Biológico ▾] Fármaco [ … ▾ ] Pauta explícita [vacío]`.

## 2. Traducción de datos Valme a controles sencillos

| Bloque real de Valme | Presentación propuesta Nexus | Qué no se debe alterar |
| --- | --- | --- |
| Datos de consulta (5 campos) | Cabecera de visita: paciente, fecha, procedencia; tipo de visita determinado por el circuito seleccionado | NUSHA no es identidad universal; fecha y tipo nunca deducidos de historia |
| Historia de psoriasis (18) | Fechas; desplegables de curso/fenotipo/tipo de tratamiento previo; chips para desencadenantes; Sí/No/Sin consignar para familiares y antecedente terapéutico; texto para otros/motivo/respuesta | Mantener catálogo de opciones Valme inicialmente; no convertir «previo» en «actual» |
| Comorbilidades (19) | Chips de presencia agrupados por cardiometabólicas, hepáticas, inflamatorias, cardiovasculares y otras | No marcado ≠ ausencia: revisar regla de grupo, no volcar ceros silenciosos |
| Localizaciones (10) y zonas especiales (7) | Chips anatómicos; si el profesional marca una localización que Valme identifica como zona especial, reflejarla en badge | La relación `loc_*`/`zona_esp_*` reproduce una **selección explícita**; no duplicar pregunta ni inferir afectación desde diagnóstico |
| Exploración: BSA, PGA, PASI (19: 2+16 componentes+total) y ungueal/observaciones (2) | BSA numérico; PGA selector 0–5 según donante; PASI como tabla breve de 4 regiones con selects 0–4 y 0–6; total solo completo; uñas triestado y observaciones libres | No validar fórmulas/umbrales por aparecer en Valme; `PASI pendiente` ≠ PASI 0 |
| Síntomas e impacto (7) | EVA prurito/dolor con control discreto 1–10 y valor visible; escozor/fisuración/sangrado chips triestado; funcionalidad y sueño desplegables No/Leve/Moderada/Intensa | Respuestas no cumplimentadas no equivalen a «No» |
| DLQI (11 columnas: 10 ítems+total) | Opciones de respuesta compactas por pregunta, como chips de **selección única**; ítem 7 mantiene su pregunta condicional; total y completitud visibles | No esconder opciones, modificar sentido, calcular parcial o asumir licencia/versiones |
| PURE-4 (5: 4+total) | Cuatro respuestas Sí/No/Sin contestar; resumen solo con 4/4 respondidas | Resultado de cribado no significa derivación ordenada ni realizada |
| Primera visita (28 campos de tratamiento) | Cuatro categorías Valme — tópicos, sintéticos convencionales, fototerapia, biológicos — como secciones; cada una añade líneas de fármaco + pauta explícita + Otros | No son 28 preguntas fijas: son 4 familias × 3 slots fuente × 2 datos + Otros; no rellenar pauta desde fármaco |
| Seguimiento (28 campos de tratamiento + 9 del resto) | Misma captura de líneas, bajo decisión **explícita** Continuar/Cambiar si clínico la registra; adherencia desplegable; Morisky con cuatro chips Sí/No; ajuste, cambio y EA documentados | Tratamiento anterior no es orden nueva ni valida cambio; no heredar posología como hecho actual |
| Derivación Derma–Reuma (1) y plan (5) | Pregunta explícita de derivación Sí/No/Sin consignar; objetivos, impresión, otras derivaciones, revisión y comentarios conservan texto/fecha según dato | No convertir sospecha/PURE-4 en derivación realizada; no generar orden a FH |

**Cobertura comprobable:** el archivo [inventario campo→control](DER_PSO_VALME_UX_INVENTORY_174_V0_20261112.csv) contiene **174 filas únicas de campos fuente**, agrupadas por las 13 áreas anteriores. Es un **crosswalk de auditoría**, **no** el esquema de base de datos Nexus, ni una indicación de copiar un CSV de 174 columnas. Las entidades y adaptadores del módulo serán propios.

## 3. Semántica de interacción que debe conservarse

1. **Chips que quedan marcados:** un clic positivo registra únicamente `Sí/presente` para ese concepto y muestra selección visual persistente dentro del estado de la visita; otro clic permite deselección con confirmación si ya hay datos guardados. La selección reaparece al reabrir una visita **solo después de restauración real y comprobada**, no por ficción de demo.
2. **No evaluado vs negativo:** al abrir Comorbilidades/Desencadenantes/Localizaciones, ningún chip marcado significa `no consignado`, no `No`. Permitir acto **explícito** `Ninguna identificada`/revisión de grupo con indicación de qué ausencias documenta. Si hay positivos seleccionados, el resto permanece desconocido a menos que el clínico confirme expresamente que ha revisado los demás. Ninguna deselección cambia automáticamente a «No».
3. **Multiselección vs exclusividad:** comorbilidades, localizaciones y desencadenantes son múltiples; fenotipo, curso, procedencia, puntuación por ítem y decisiones clínicas son selecciones únicas según opciones donante. No usar un chip binario para preguntas con más de dos categorías.
4. **Cuestionarios y escalas:** respuestas discretas y visibles, opción de borrar/restablecer; mostrar `Pendiente`, `Incompleto n/N` y `0` válido. Los resultados de PASI, DLQI, PURE-4 y Morisky se calcularán solo después de aprobar instrumento y fórmula/versiones: no se presenta un score no homologado como clínicamente evaluable.
5. **Líneas de tratamiento:** selector de fármaco y campo independiente de pauta/dosis/frecuencia; `Otros` y múltiples líneas conservados. Ninguna elección de nombre propone o escribe dosis, vía, inducción, duración, renovación o switch; el estado clínico (previo, vigente documentado o solicitado) debe quedar explícito, no deducido.
6. **Primera vs Seguimiento:** navegación determina el circuito; el dato `tipo_visita` se guarda explícitamente desde esa acción, no con desplegable duplicado. Compartir bloques no implica que una escala o dato previo se conserve automáticamente. El equipo decide en #728 qué se revisa en cada acto y qué se muestra como lectura histórica.
7. **Cambio de patología/paciente:** si hay edición no guardada, bloquear cambio o pedir confirmación sin pérdida; nunca transportar respuestas PsO a HS ni a otro paciente. La identidad y las fechas de visita deben estar explícitas; ninguna selección de patología por defecto equivale a diagnóstico.
8. **Salida/QA:** solo datos sintéticos y acciones realmente soportadas. La propuesta no garantiza persistencia Excel, mensajería FH, autenticación ni piloto. Confirmar en navegador los chips, teclado, estado vacío, restauración, validación de valores, cambio paciente y consola cuando exista implementación.

## 4. Revisión guiada que haremos con Dermatología (no bloquea mostrar el borrador)

**Entregar un formulario PsO completo y navegable como borrador**, con todos los grupos Valme y sin reglas de decisión clínica automáticas no aprobadas. En la sesión preguntar por **eliminación/modificación/adición de campos**, selección única o múltiple, qué se debe cumplimentar en primera visita/seguimiento, campos que pueden venir de historia, vocabulario y textos, y aceptabilidad de los controles propuestos. Será más fácil comentar sobre algo visible que enumerar variables en abstracto.

**Gates aún abiertos:** versiones/permiso de uso de instrumentos y reglas de puntuación; fuente de autoría/persistencia; comportamiento de chips negativos y cambios con datos; equivalencias de zonas especiales; tratamientos y actos de derivación. Si el usuario pide demo antes de homologación, debe estar marcada como **demostración sintética no clínica**, sin cálculo clínico ni acciones FH que simulen validación.

## 5. Aceptación futura del corte UX (8 comprobaciones)

1. La barra lateral tiene una única Primera Visita y Seguimiento, con PsO seleccionada dentro; HS no está habilitada antes de contrato.
2. La pantalla ofrece todos los grupos de Valme y el inventario enlaza 174/174 campos fuente, sin copiarlos como modelo canónico.
3. Todos los chips seleccionados quedan visualmente activos, son accesibles por teclado y permiten editar sin generar silenciosamente `No` en chips no seleccionados.
4. Desplegables conservan opciones de Valme donde existen; no se sustituyen campos libres por vocabularios no aprobados.
5. Cuestionarios mantienen ítems/opciones/completitud; las escalas incompletas no generan resultados válidos ni decisiones automatizadas.
6. Tratamiento admite múltiples líneas por las cuatro familias, fármaco y pauta explícitos separados, con `Otros` y sin inferencia.
7. Primera Visita/Seguimiento, paciente y patología se mantienen aislados; una transición con datos editados no causa pérdida ni mezcla.
8. QA en navegador con datos sintéticos y caminos de interacción soportados: inicial vacío, selección, deselección, revisión, navegación, restauración, errores, consola; reportar explícitamente lo que esté solo en código frente a lo demostrado.

**NO TOCA en este diseño:** código de los módulos, registro/activación de Dermatología, Valme, HS, FarmaNEXus, Reuma, módulos de persistencia, importadores, test fixtures, despliegue, `main` o información real de pacientes. Publicación pendiente de GO explícito.
