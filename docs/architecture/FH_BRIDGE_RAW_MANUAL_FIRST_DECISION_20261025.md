# Farmacia Hospitalaria · Decisión de producto: Excel Bridge raw manual primero, procesamiento relacional después

**Fecha del acuerdo funcional:** 25 de octubre de 2026.

> **Reconciliación de estado (25-10-2026; WO-DOC #847):** decisión funcional ratificada. El núcleo puro C2a ya está **MERGED** en `promueve/nexus-v4` por [PR #846](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/846) ([issue #845](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/845), cerrada), SHA `2862cd26a7cac69b840eaaf163c7fcc19f8416be`, CI/Pages postmerge SUCCESS. **No existe aún salida de Seguimiento conectada, lector raw 166 integrado, ida/vuelta Excel Windows ni piloto.** Los enunciados más abajo sobre “estado al acordar” y “documento local” son cortes históricos anteriores a esta reconciliación, no estado vivo.
**Estado:** **DECISIÓN DE DIRECCIÓN ACORDADA EN CONVERSACIÓN; registro documental candidato LOCAL, NO PUBLICADO hasta PR/merge.**
**Ámbito:** PROMueve Nexus V4, Farmacia Hospitalaria, pruebas sintéticas y preparación de primeros días de trabajo.
**Fuente GitHub contrastada:** `b32majus/Hub-Clinico-Badajoz`, `promueve/nexus-v4@b392e89927fed2e213a9cd6bbd639cb8326d5104`. Verificar HEAD de nuevo antes de ejecutar cualquier WO posterior.

## 1. Decisión funcional acordada

**[DECISIÓN DE DIRECCIÓN — objetivo, todavía NO implementado como circuito completo]**

1. **Unificar progresivamente el libro operativo manual de Farmacia en Excel Bridge**, empleando **primero sus hojas raw de entrada**. La profesional registra el acto en PROMueve y copia/pega manualmente la proyección estructurada en el libro y hoja conscientemente seleccionados.
2. **No exigir el Processor relacional para empezar a usar la entrada raw**. La conversión posterior raw → entidades relacionales, auditoría, vistas `APP_*` y lectura relacional es una capacidad independiente, implantable y verificable cuando corresponda. El libro y el modelo clínico no deben tratarse como sinónimos.
3. **Conservar WO8 como salida operativa legacy hasta demostrar el circuito sustituto completo**. La decisión **NO autoriza hoy borrar, ocultar, renombrar ni desactivar** su botón, exportador, plantilla ni el CSV heredado. El cambio de uso habitual/retirada será una WO propia condicionada a pruebas.
4. **Mantener arquitectura de destinos coexistentes**, no una secuencia obligatoria: Excel raw manual, Excel Bridge procesado, y adaptadores locales o API/BD hospitalaria cuando se autoricen y acrediten. La interfaz/caso clínico debe poder conservar la misma semántica clínica independientemente del destino. No se aprueba construir hoy SQLite, IndexedDB, Oracle o cualquier integración SQL; son posibilidades/entornos a concretar, **no adaptadores implementados**.
5. **La finalidad inmediata no es fabricar una BD relacional en Excel, sino el recorrido real de ida y vuelta**: registrar → exportar con garantías → pegar → guardar físicamente el libro → cerrar/volver a cargar → reconstruir exactamente la información clínica disponible, incluidos EA 0..N, a través de una interacción soportada.

**Esta decisión define un objetivo de producto y un orden de trabajo, NO demuestra que las 152 columnas actuales sean suficientes ni que su sistema de lectura actual sea lossless.** Las modificaciones de schema, adaptación F4.4→V2 y cambios de botón requieren decisión contractual y WOs específicas.

## 2. Estado de verdad al acordar (código publicado frente al objetivo)

| Componente | Evidencia en canónica | Estado real y límite |
| --- | --- | --- |
| Excel WO8, 62 columnas | `scripts/farmacia_excel_row_export.js`, `scripts/farmacia_seguimiento.js`, [PR #841](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/841) | Copia manual TXT/JARA y filas WO8 EA 0..N por **línea efectivamente dispensada**, con EA común/específico; QA navegador sintética. El libro WO8 **no es la fuente clínica actual del Data Port de paciente**. Pegado en Excel Windows no acreditado. |
| Export V2 152 columnas | `scripts/farmacia_export_v2_core.js`, adaptadores V2, `schemas/farmacia_export_row_v2.schema.json` | Copia demo visible en ciertos contextos, 1 fila Validación, 1..N Primera Visita/Seguimiento por **líneas explícitas activas**, no por dispensación. En Seguimiento el botón **bloquea correctamente** cuando hay cobertura EA porque su adaptador actual no representa EA 0..N. No desactivar esa guardia hasta probar la cobertura completa. |
| Excel Bridge de Cáceres | `templates/PROMueve_FH_Caceres_Bridge_DEMO.xlsx`; `tools/generate_farmacia_excel_bridge_workbook.py` | Plantilla publicada con `01_DERMA` y `03_DIGESTIVO` operativas y **16 hojas técnicas ocultas inicialmente vacías**. Hojas y nombres de columnas no convierten el libro por sí mismos en BD relacional. |
| Lectura raw | `scripts/farmacia_common.js` → `farmacia_bridge_v2_reader.js` → `farmacia_raw_excel_data_source.js` → Data Port / `farmacia_patient_flow_runtime.js` | Conectada a carga local de Excel Farmacia: lee hojas raw V2 y crea población/paciente actual en **memoria de ejecución**, con sesión temporal del paciente. Pruebas sintéticas del flujo antiguo acreditadas, **no** relectura íntegra EA 0..N ni datos almacenados por WO8. |
| Proyección pura EA longitudinal | [PR #844](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/844), `modules/farmacia_ea_patient_projection.js` | Publicada y auditada, **no cableada a las pantallas o Read Port real, no visible y sin persistencia**. No equivale a recuperar historial de Excel. |
| Processor y lectura relacional Bridge | [Matriz de equivalencia](reviews/FARMACIA_F44_EXPORT_V2_BRIDGE_EQUIVALENCE_20261012.md), candidato histórico `95565e1` | Descomposición Office Script, vistas `APP_*`, `RelationalExcelDataSource` y roundtrip **NO integrados ni acreditados en la rama publicada**. |
| F4.4 / F4.5 | [DeliveryResult v1](../contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md), [mapeo candidato](reviews/FARMACIA_F44_EXPORT_V2_MAPPING_CANDIDATE_20261013.md), #671 / #721 | Contratos/constructores parciales publicados; integración completa desde pantallas hacia V2 **no aprobada ni probada**; #721 sin `status:approved`. Export V2 no es portador íntegro del Pharmacy Act F4.4 (L2). |

**Distinción de cardinalidad que NO debe borrarse:** WO8 genera filas por medicamentos **dispensados**; Export V2 genera filas por líneas **activas explícitas** del evento. El número de líneas y la presencia de dispensación no autorizan a inferir prescripción, administración ni resultado de validación.

## 3. Puertas de decisión todavía abiertas (NO aprobadas por el acuerdo)

1. **Cobertura y fidelidad EA 0..N:** seleccionar versión y representación del transporte que recupere **episodio, observación, acto, vínculos explícitos de sospechosos, evaluaciones, estado de completitud, ausencias y correcciones** sin pérdida ni duplicación. Las 152 columnas actuales incluyen campos singulares/JSON de EA y causalidad, pero **no acreditan** por sí solas cobertura de colecciones EA. No elegir automáticamente columnas dinámicas, empaquetado JSON en una celda ni filas adicionales por EA. Si hay que evolucionar schema/acompañamiento normalizado, requerirá aprobación/versionado y compatibilidad explícita.
2. **Mapping clínico autorizado:** F4.4→proyección tabular debe conservar fuente, `actId`/`event_id` sin equivalencias inventadas, `patientRef`, `episode_id`, `observation_id` y relaciones. No perder `undefined`/ausencia/null donde pertenezcan al contrato; no prometer L2 desde el TSV.
3. **Lectura real y contrato de evolución:** en recarga A→B→A, el mismo episodio debe conservar identidad y observaciones distintas; una recurrencia solo puede crearse si es **explícita** y con episodio nuevo. No derivar «activo/resuelto», último, sospechoso ni causalidad de nombre de fármaco, silencio, catálogo o ausencia.
4. **Destino, escritura y evidencia:** profesional elige conscientemente libro y hoja permitidos; no inferir hospital/servicio físico desde datos incompletos. `copy` = `prepared_for_transfer`; solo lectura verificada del libro efectivamente guardado puede acreditar la **copia observada**, no transacción, ausencia de conflictos, unicidad/latest, guardado institucional o piloto. Política `single-writer`, concurrencia, lote incompleto, duplicados, idempotencia, errores y reintentos se acordará por capacidad real.
5. **Salidas coexistentes y versionado:** compatibilidad o rechazo seguro de libros V2 antiguos y WO8, política de migración de datos sintéticos, sin convertir silenciosamente columnas antiguas a estructura nueva. No modificar CSV 37 columnas ni TXT/JARA al abordar esta unidad, salvo WO independiente.
6. **Ámbito hospitalario y datos:** plantilla Cáceres hoy soporta dos hojas de entrada; no declarar Reumatología/Oncología operativas en el Bridge por existir en WO8 u otro producto. Cualquier prueba debe usar datos **sintéticos** y entornos/archivos autorizados. No registrar pacientes reales ni credenciales en repositorio o herramientas externas.

## 4. Secuencia mínima aprobada para preparar implementación (NO GO para ejecutarla)

| Etapa | Resultado acotado | Criterio de paso |
| --- | --- | --- |
| **C1 · Contrato/compatibilidad raw EA 0..N** | Matriz de cobertura real actual (WO8 de 62 y V2 de 152 columnas no equiparables), elegir representación versionada, compatibilidad y mapeo necesario; bloquear pérdidas; no tocar Processor. | La especificación demuestra, sin depender de inferencias clínicas, cómo recuperar casos 0/1/2/5 EA, sospechosos por línea y externos, y dos observaciones de un mismo episodio. |
| **C2 · Salida manual Bridge EA 0..N** | Adaptar productor, esquema y, si se aprueba, plantilla; conservar guardia V2 hasta que el nuevo formato supere prueba. | Copia manual completa y segura con IDs, filas/eventos, límites de Excel, sanitización, 0 truncamientos y ausencia de datos fabricados. |
| **C3 · Entrada raw y relectura** | Adaptar reader/Data Port a representación aprobada; sin Processor relacional; conectar consumidores solo cuando haya datos respaldados por el archivo. | En navegador real: registrar dos líneas y tres EA (un sospechoso línea A, otro B, un EA común/externo), guardar libro, cerrar/reabrir sesión y **recargar ese mismo archivo**; leer la misma información e identidades, sin dobles episodios ni contaminación entre pacientes. Casos 0 EA, revisiones/recurrencia explícitas, errores, carga incompleta y archivo antiguo. |
| **C4 · Cambio de procedimiento** | Solo tras C3 PASS en Excel Windows con copia de libro operativo, evaluar activar como salida manual preferente. | QA reproducible, garantías comunicadas y consentimiento del entorno; conservar WO8 hasta aceptación. Su retirada/ocultación requiere WO/G0 propio. |
| **C5 · Bridge relacional (posterior)** | Office Script Processor raw→entidades, `APP_*`, Read Adapter relacional; diferenciar L0 filas, L1 acto reconstruible y L2 acto F4.4 completo. | Pruebas de Excel/Office Script reales, deduplicación y fallos seguros con identidad, evidencia y acuses; sin declarar L2 si no existe portador reversible. |

**No hay nueva autorización técnica, de piloto o de publicación derivada de este documento.** Esta secuencia es una prioridad de producto, no una WO transversal que mezcle dominio, exportación, lectores y arquitectura futura.

## 5. Contratos, gobierno y reconciliación

- Compatible con [ADR-006](adr/ADR-006-persistence-adapters-and-excel.md): Excel como modalidad soportada y otros adaptadores por capacidades demostradas; UI independiente de tecnología física; copia no es persistencia.
- Compatible con [alineamiento V4](PROMUEVE_NEXUS_SALIDA_AGNOSTICA_FH_V4_ALIGNMENT_20261012.md): no confundir Export V2, Processor, portador íntegro, DeliveryResult y lector; ningún backend obligatorio para iniciar pruebas de copia manual.
- Compatible con [plan de EA 0..N](../ops/PLAN_FH_EA_0N_MULTISURFACE_DESTINATIONS_20261017.md), que mantiene C como gate para una modalidad con lectura/escritura acreditadas. Este acuerdo precisa **qué modalidad preparar primero**, no declara C superado.
- **Documentación viva pendiente:** `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` y plan EA vivo deben incorporar enlace/resumen del acuerdo **solo tras publicación documental autorizada**, coordinándolo con la [WO documental #842](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/842), que ya mantiene tres Markdown modificados en otro worktree.
- Toda implementación exige WO atómica propia: objetivo, preflight BASE/HEAD, alcance/NO TOCA, reversión, tests, QA, criterios, política commit/push/PR/merge, informe. No tocar `main`; push/issue/PR/merge solo tras GO específico e issue `status:approved` previo a PR. Preservar worktrees y cambios ajenos.

## 6. Estado de la decisión

**APROBADO COMO OBJETIVO FUNCIONAL (25/10/2026):** una entrada raw Bridge manual operativa y recuperable como futura salida principal, con relacionalización posterior y adaptadores coexistentes.
**NO APROBADO / NO DEMOSTRADO:** suficiencia del esquema de 152 columnas para EA 0..N, C1–C5 técnicos, retirada WO8, datos reales, escritura hospitalaria, acto F4.4 íntegro, lectura longitudinal operativa de EA ni piloto.
**ESTADO DE ESTE DOCUMENTO:** registro candidato en rama local; hasta PR/merge no representa documentación publicada del repositorio.
