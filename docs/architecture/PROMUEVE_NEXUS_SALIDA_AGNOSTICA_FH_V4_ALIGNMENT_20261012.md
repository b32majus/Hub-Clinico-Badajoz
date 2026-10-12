# PROMueve Nexus V4 — Alineamiento funcional y arquitectónico de la salida agnóstica de Farmacia

**Fecha de revisión:** 12 de octubre de 2026

**Estado de este documento:** `ALINEAMIENTO FUNCIONAL RATIFICADO EN CONVERSACIÓN — PENDIENTE DE PUBLICACIÓN EN RAMA CANÓNICA`

**Ámbito:** Farmacia Hospitalaria; captura → Pharmacy Act → proyecciones/adaptadores → Excel manual / Excel Bridge con Office Script / API y base de datos.

**Repositorio de referencia:** `b32majus/Hub-Clinico-Badajoz`

**Base GitHub observada en lectura:** `promueve/nexus-v4@5445878c5df17771801f6823065b5017129e67ce`

**Contrato #671 revisado localmente:** `370cdccdbbab9697c7d63332a19da76efdfb8c01`; **no publicado ni formalmente congelado**.

**Relación con tickets:** #671 continúa abierto; #721 continúa sin aprobación y bloqueado por #671. #577 es discovery de destino/routing.

**No es:** una nueva ADR, un cambio aprobado al contrato #671, autorización del #721, WO técnica de implementación, evidencia de piloto, dictamen legal o QA nueva de navegador.

> **Propósito:** conservar con precisión el razonamiento recuperado entre la responsable del producto y Cora, para no rediscutir en el futuro por qué conviven Pharmacy Act v1, Export V2, Excel Bridge y distintos adaptadores. Distinguir siempre: **[P] publicado/decidido**, **[A] alineamiento funcional ratificado en conversación, sin elevarlo a ADR ni a contrato técnico**, **[H] hipótesis/alternativa pendiente**, **[I] implementado y verificado en el alcance de evidencia indicada**, y **[N] no implementado o no demostrado**.

## 1. Visión de producto: un acto, varios destinos, sin rehacer los formularios

**[P]** Los casos de uso de Validación, Primera Visita y Seguimiento son independientes; construyen actos clínicos completos con datos explícitos, y la capa de entrega va después de su conformidad técnica y autorización de operación. No se usa `commit(event)` como API pública genérica. Las pantallas no deben depender de conocer SQL, hojas, portapapeles o formatos físicos. La fila de Excel es una **proyección de transporte**, no el acto clínico conceptual. Véanse ADR-005, ADR-006 y Architecture Decision Freeze (§6–7).

**[A]** PROMueve debe funcionar en diferentes hospitales y despliegues con distintas capacidades: uno podría utilizar Excel manual; otro Excel Bridge con procesamiento local/Microsoft 365; otro una API hacia SQL Server/PostgreSQL u otro almacenamiento institucional autorizado. **No es una secuencia obligatoria ni una migración irreversible**: pueden coexistir modalidades en distintos centros. Excel no desaparece obligatoriamente cuando exista backend. El código clínico compartido debe mantenerse estable en lo posible; cada destino requiere su propio adaptador y garantías probadas.

**[A]** La prioridad práctica es introducir progresivamente capacidad sin hipotecar la interoperabilidad posterior, manteniendo coherencia clínica y evitando sobrearquitectura para el entorno manual actual. No convertir una compatibilidad exportable en una nueva fuente de verdad clínica.

### 1.1 Diagrama de responsabilidades (objetivo, no despliegue actual)

```text
Profesional → Formulario de Farmacia (Validación | Primera Visita | Seguimiento)
            → Caso de uso específico: contexto/autoridad + invariantes
            → Pharmacy Act v1 completo y explícito [F4.4]
            → Frontera de entrega compartida [F4.5 — contrato pendiente]
                ├── Adaptador Excel manual
                │     └── Preparar proyección/archivo compatible → profesional pega
                ├── Adaptador Excel Bridge / Microsoft 365 [futuro]
                │     └── Entrada raw → Office Script Processor → entidades/vistas
                └── Adaptador API autorizada [futuro]
                      └── Servicio/backend → SQL u otra persistencia
            ← DeliveryResult: solo el estado y evidencia realmente acreditados

Lectura, cuando exista en cada destino:
    Excel raw / vistas APP_* / API → Read Adapter/Port → casos de uso → interfaz
```

El esquema no supone que hoy exista un `DeliveryResult` conectado a la UI, que los adaptadores futuros se hayan construido ni que todos los modos tengan las mismas capacidades transaccionales.

## 2. Qué es cada pieza y qué NO es

| Pieza | Responsabilidad correcta | Qué no debe hacer | Estado |
|---|---|---|---|
| Formularios FH | Capturar hechos y decisiones explícitos de la profesional | Decidir formato SQL/hoja o inferir datos terapéuticos | [I] pantallas actuales; integración F4.4 pendiente |
| Caso de uso clínico | Comprobar precondiciones y construir acto según intención profesional | Encadenar automáticamente Validación → Primera Visita → Seguimiento | [P] frontera arquitectónica; integración parcial/pending |
| **Pharmacy Act v1 / F4.4** | Modelo completo del acto: identidad, tiempos, autoría declarada, procedencia, payload y `payload.lines` | Ser una fila Excel, inventar identidad/terapia o prometer que se guardó | [I] contrato/constructores publicados, aún no cableados a las pantallas clínicas |
| **Export V2 (152 columnas)** | Proyectar un acto/evento al formato tabular y filas por línea | Ser base relacional, portador íntegro reversible de todo F4.4 o resultado de persistencia | [I] core/adaptadores y copia técnica demo paralela, no cutover general |
| **Excel Bridge** | Workbook con entrada raw operativa y futura estructura relacional | Resolver por sí mismo el procesamiento/roundtrip | [I] contenedor publicado; [N] Processor y roundtrip completos |
| **Office Script Processor** | Leer raw, validar conjunto, agrupar por acto, comprobar duplicados, descomponer a entidades y registrar errores | Inventar clínica, decidir tratamiento, validación o autoría; interceptar obligatoriamente el portapapeles | [P] diseño histórico; candidato técnico **no fusionado** |
| **Power Automate** | Automatizar disparadores, transporte/ejecución autorizados y gestión administrativa | Ser fuente clínica, firmar actos o decidir su contenido | [P] opción prevista, no dependencia de todos los despliegues; circuito no demostrado completo |
| **Adaptador API/BD** | Traducir la misma semántica clínica a un backend autorizado | Exponer credenciales SQL en navegador o hacer que el DTO copie columnas Excel | [P] dirección de arquitectura; [N] integración FH real demostrada |
| **DeliveryResult / F4.5** | Declarar qué produjo la operación y con qué evidencia/garantía | Transformar clínicamente datos ni confundir preparado con persistido | [P] semántica general ADR; propuesta #671 local, no publicada |
| **Read Adapter** | Recuperar datos de un origen y componer vistas del paciente sin duplicar fuentes | Afirmar recuperación íntegra sin roundtrip demostrado | [I] raw reader/Data Port de lectura; [N] lectura APP_* y roundtrip final |

**[A]** La palabra «adaptador» se puede usar para múltiples piezas. Para evitar confusiones, conviene nombrar explícitamente *proyección tabular* (Export V2), *adaptador de entrega/destino* (Excel, M365, API) y *Processor* (descomposición de Excel raw). **DeliveryResult es un justificante de operación, no el transformador.**

## 3. Por qué existe Export V2 y por qué se conservan sus filas

**[P]** La exportación antigua v1 conservaba una fila de 61 columnas y, en Seguimiento, su granularidad estaba ligada a líneas **dispensadas explícitamente**. Se necesitó evolucionar porque un mismo Seguimiento puede contener varias **líneas terapéuticas activas y explícitamente registradas**, independientemente de que cada una se dispense o se revise específicamente. Nunca interpretar una línea activa como dispensación afirmada.

**[P/I]** Export V2, actualmente en `2.0.0-draft.1`, utiliza una fila común de **152 columnas**. Cardinalidad prevista:

- Validación: exactamente **1 fila** por acto; solicitado y validado permanecen separados; pendiente/denegado no generan tratamiento validado por inferencia.
- Primera Visita: **1..N filas** por líneas explícitamente presentes, incluso si la UI actual solo muestra una; ninguna línea adicional se deduce desde catálogo, tratamiento previo o solicitud.
- Seguimiento: **1..N filas** por líneas explícitamente activas en la visita; presencia, dispensación y revisión son dimensiones distintas.

**[P]** Cada fila tiene identidad propia (`row_id`, `row_index`, `row_count`, `line_id` cuando aplica) y comparte identidad del evento/visita con las otras filas (`event_id`, `source_event_id`, `visit_id` cuando aplica). Los campos comunes pueden repetirse para satisfacer el formato tabular. El Processor debe comprobar coherencia y conjunto completo antes de descomponer: no se exige que las filas lleguen exactamente en el mismo instante, sino disponer del grupo completo y válido.

**[A]** Esa duplicación fue deliberada y necesaria para la entrada Excel: conserva la cardinalidad 1:N sin crear una visita clínica distinta por fármaco. Para la futura lectura, agrupar por los identificadores comunes evita contar dos visitas donde solo hubo una.

**[P/I]** Export V2 conserva una salida demo técnica en paralelo en las tres páginas, no equivale al acto conceptual F4.4, no sustituye v1 por completo y no está universalmente conectado a un origen técnico de identidad real: el proveedor de contexto demo utiliza fixtures predeclarados. No afirmar que la interfaz actual genera ya un Pharmacy Act v1 desde los formularios ni que se escribe automáticamente en Bridge.

## 4. Tres modalidades que coexisten en la arquitectura

### 4.1 Modalidad presente — Excel y copia manual

**[P/I]** Se conservan salidas manuales existentes (Excel legacy de 61 columnas y Export V2 paralelo demo de 152 columnas). El flujo depende de que la profesional gestione la transferencia al workbook que corresponda. Copiar o descargar **no guarda institucionalmente el acto** y no demuestra que Excel haya recibido la operación.

**[A]** Es la farmacéutica quien elige conscientemente el Excel y la hoja operativa que corresponden al paciente/servicio en el circuito manual. El sistema no debe inferir destino físico desde nombre de fármaco, catálogo, patología ausente ni tratamiento previo; tampoco introducir automáticamente un selector/routing nuevo por el mero hecho de que exista Bridge. El alcance de mapping/routing específico sigue en discovery #577.

**[A]** No se requiere crear hoy otro almacén de Pharmacy Act completo solo para simular un backend más maduro: sería infraestructura adicional sin utilidad demostrada en el circuito manual. **Eso no concede equivalencia entre filas exportadas y acto F4.4 completo**; si solo se genera TSV parcial, se comunica y conserva como tal. La preferencia funcional de no almacenar en paralelo no sustituye el contrato pendiente Q-1.

### 4.2 Modalidad intermedia — Excel Bridge y Office Script

**[P/I]** Está publicado el workbook sintético por hospital; el de Cáceres dispone de `01_DERMA` y `03_DIGESTIVO` como hojas operativas de entrada con 152 cabeceras comunes y 16 hojas técnicas ocultas inicialmente vacías. No afirmar que estén incorporados `APP_*`, Processor operativo ni persistencia longitudinal cualificada.

**[P]** Flujo original previsto:

```text
PROMueve genera 1..N filas TSV del mismo acto
→ profesional pega el conjunto en una hoja operativa del servicio
→ Office Script identifica filas pendientes
→ valida versiones, IDs, cardinalidad, repetición y coherencia
→ conserva raw append-only
→ agrupa el acto (una visita ≠ N visitas)
→ descompone en PATIENTS, VISITS, VISIT_LINES, PROMS, etc.
→ registra auditoría/errores sin destruir la entrada
→ publica vistas APP_* para lectura del Hub
```

**[A]** Office Script **no necesita interpretar el portapapeles ni recibir directamente Pharmacy Act** para ejecutar el procesamiento relacional diseñado. La descomposición se realiza sobre las filas raw ya ingresadas. La entrada, no el script, debe llevar los identificadores y los hechos explícitos necesarios. Si faltan o hay contradicciones, fallo seguro: **no deducir clínica**.

**[P]** Existe un candidato histórico de `office-scripts/farmacia_excel_bridge_processor.ts`, esquema relacional y checks en commit `95565e1698dc4b8333daec0b4d342e298d5d9cfa`; no fue fusionado en la rama canónica, pendiente de cualificación Microsoft Excel. Constituye **evidencia y referencia técnica**, nunca permiso para reutilizar, reactivar ni declarar implementada la capacidad.

**[P]** El Bridge diseñado ya contiene una estrategia relacional futura, pero las vistas de lectura `APP_*`, `RelationalExcelDataSource`, Processor integrado y roundtrip longitudinal siguen pendientes. **Bridge no significa que ya exista una base relacional funcionando.**

### 4.3 Automatización intermedia opcional — Microsoft 365 / Power Automate

**[P]** Puede automatizar eventos de entrada, ejecución autorizada de Office Script y operaciones administrativas. Pruebas parciales registradas no prueban circuito end-to-end ni permisos del tenant. Office Script conserva su responsabilidad de validación/descomposición. Power Automate no sustituye F4.4 ni decide datos clínicos.

**[A]** Es una posibilidad según capacidades y gobernanza del centro: **no será una dependencia para Excel manual ni para otros destinos**. Su eventual conexión con información clínica real exigirá autorización, seguridad y pruebas específicas.

### 4.4 Modalidad futura o alternativa simultánea — API y base de datos

**[P]** Un adaptador futuro puede enviar actos completos a una API autorizada con su almacenamiento SQL Server, PostgreSQL u otra solución institucional. Una arquitectura agnóstica no equivale a admitir acceso SQL directo desde el navegador: credenciales y escritura pertenecen al entorno autorizado. Reglas de concurrencia, deduplicación, revisión, durabilidad y autenticación serán las declaradas y demostradas por ese destino.

**[A]** Este modo no impone abandonar Excel en hospitales sin infraestructura disponible ni reconstruir los formularios cuando el destino cambie. No obstante, **hace falta garantizar compatibilidad semántica**, no basta con intercambiar la URL de almacenamiento.

## 5. Oficina de responsabilidades: qué construye el hub y qué interpreta Office Script

**[P/A]** Formulario captura → caso de uso específico genera un acto F4.4 técnicamente conforme → adaptación/proyección explícita al destino → entrega/transporte → el destino (si es Excel Bridge) valida y descompone **sin reinterpretar decisiones clínicas** → la respuesta de entrega expresa su garantía real.

El Office Script puede:

1. Agrupar filas por identidad del mismo acto, aunque sean varias por línea.
2. Comprobar versiones, cardinalidad, coherencia de información común e identificadores.
3. Evitar duplicados **dentro de las garantías del destino**, registrar conflictos/errores y conservar raw.
4. Descomponer filas en entidades relacionadas y ofrecer proyecciones `APP_*` cuando estén implementadas.

No puede:

1. Completar dosis, vía, pauta, inducción, duración o presentación desde fármaco o catálogo.
2. Declarar validación farmacoterapéutica a partir de una solicitud.
3. Convertir tratamiento previo en inicio nuevo ni crear líneas ausentes.
4. Decidir dispensación, revisión, causalidad, renovación ni autorización profesional sin evidencia explícita.
5. Resolver inconsistencias entre filas «eligiendo» una versión clínica por su cuenta.

**[P]** La entrada manual se pega en la hoja operativa. No existe el requisito de interceptar el portapapeles. El Processor observa un conjunto de filas ya disponible en el workbook.

## 6. Reconstrucción clínica no es necesariamente reproducción byte-a-byte de Pharmacy Act

**[P]** Export V2 identifica filas del mismo acto mediante IDs comunes, y el plan Bridge/Processor pretende reconstruir entidades clínicas coherentes. Eso permite proyectar **una visita lógica con N líneas**, no N visitas independientes.

**[P]** Pero Export V2 tiene un esquema distinto: eventos `event_id/source_event_id`, filas tabulares y campos de contexto técnico; F4.4 define `actId/revision/kind`, `patientRef`, `authorRef/attributionAssurance`, `provenance` y `payload` opaco con `payload.lines`. El serializador actual de Export V2 rechaza ciertas estructuras F4.4 válidas, incluidas propiedades propias con `undefined`; además, no hay correspondencia aprobada que garantice reconstrucción íntegra de F4.4 desde las 152 columnas.

**[A]** Distinguir tres niveles de promesa:

- **L0: salida tabular preparada** para copia manual (sin persistencia acreditada).
- **L1: reconstrucción clínica/lógica** de visita y líneas desde filas del Bridge, cuando Processor y Read Adapter estén implementados y probados; no implica recuperar cada propiedad original de F4.4.
- **L2: conservación y recuperación íntegra de Pharmacy Act v1** (identidad, estructura y centinelas, incluido presente-con-`undefined`), solo mediante mecanismo explícito reversible validado; formato y destino aún no decididos.

**[A]** Se acepta la limitación funcional de L0 hoy; L1 es dirección V4 intermedia; L2 es la aspiración de portabilidad a futuro, especialmente útil con backend. **No convertir esa tolerancia temporal en una declaración falsa de que las 152 columnas son L2.**

**[H]** La solución del gap L2 aún debe elegirse tras una matriz de equivalencias: extensión mínima y compatible del Bridge, portador completo separado, o cambio de frontera donde Processor/backend reciba actos completos y derive proyecciones. Ninguna alternativa se aprueba por este documento. No imponer JSON adicional ni una segunda hoja como prerrequisito por intuición.

## 7. Identidad profesional, autoría y JARA

**[P]** El modelo de exportación contempla `professional_ref` y `professional_display`; F4.4 dispone de `authorRef` y `attributionAssurance` explícitos. Estos campos preservan **declaraciones de identidad**, no prueban automáticamente identidad autenticada ni firma verificable.

**[A]** Para el producto descrito por la responsable, PROMueve es un **complemento de apoyo** y JARA continúa siendo el registro clínico institucional correspondiente. Por ahora, la identificación profesional declarada resulta suficiente **como objetivo funcional de la demo/evaluación sintética**, sin introducir firma digital ni autenticación nueva en F4.5. No implica emitir por PROMueve una prescripción legal ni atribuirle validez jurídico-asistencial institucional.

**[N]** No hay en F4.4 un mecanismo que pruebe a un consumidor remoto que un objeto fue generado realmente por su constructor o autorizado por un profesional autenticado. Q-4 es una cuestión de garantía/origen y *no* se solventa añadiendo una columna de nombre. Para pacientes reales, escritura institucional o piloto, aplicar autorizaciones, políticas de datos, autenticación y requisitos SES que correspondan; aún no validados aquí.

## 8. Semántica honesta del resultado de entrega

**[P]** ADR-005/006 establecen el vocabulario conceptual `prepared_for_transfer`, `persisted`, `already_recorded`, `conflict`, `rejected`, `outcome_unknown` con garantías dependientes del destino.

- **Copia/descarga manual:** `prepared_for_transfer` cuando existe artefacto realmente preparado conforme al contrato de esa operación; ni pegado correcto, ni persistencia, ni acto registrado oficialmente.
- **Excel Bridge/Office Script:** `persisted` solo podría afirmarse con incorporación del **acto completo** y confirmación verificable de guardado duradero en Bridge; procesamiento en un script sin prueba de durabilidad no basta. Guardado en Bridge ≠ registrado en JARA/SES.
- **API/BD:** `persisted` dependerá de la confirmación, evidencia, alcance y garantías transaccionales del backend real.
- `already_recorded`, conflictos, rechazo y resultado incierto requieren autoridad observadora del destino y evidencia; no inventar estos estados en una preparación manual.

**[A]** El actual botón de Export V2 conserva su semántica de **copia demo tabular**; no debe rebautizarse como «entrega íntegra de Pharmacy Act». Si el DTO propuesto en #671 exige artefacto F4.4 íntegro, la simple salida TSV de 152 columnas **no cumple ese contrato**. Esto requiere reconciliación, no prometer que ya funciona ni alterar silenciosamente la definición del DTO.

## 9. Qué está disponible y qué falta, sin confundir estados

| Unidad | Código | UI/consumo | Evidencia/madurez |
|---|---|---|---|
| Pharmacy Act v1 (F4.4) | Sí, publicado (#487/PR #490) | No integrado directamente en controladores clínicos actuales según búsqueda de consumidores | Contratos y pruebas publicadas; sin flow de entrega/UI demostrado |
| Export V2 152 col. | Sí, publicado (#226/PR #227 y posteriores) | Botones paralelos en Validación, PV, Seguimiento | Copia demo; proveedor de identidad técnica sintética/limitado; no persistencia |
| Excel legacy 61 col. | Sí | Sí, ruta existente | Compatibilidad, no destino arquitectónico final |
| Workbook Cáceres Bridge | Sí, publicado (#232/PR #233) | Entrada raw disponible | 2 hojas operativas + 16 técnicas inicialmente vacías; QA de Excel sintético histórico |
| Lector raw + Data Port | Sí, publicado (PR #238, #251, #253) | Flujo normal actual | Lectura/proyección en memoria; no roundtrip longitudinal completo |
| Office Script Processor relacional | **Candidato local histórico** commit `95565e1` | No integrado ni publicado | Referencia para revisión; gate Excel real pendiente |
| Vistas `APP_*` + Read Adapter relacional | No completo | No | Pendiente |
| Power Automate FH | No ruta integral cualificada | No | Opcional; pruebas parciales previas |
| DeliveryResult #671 | Documento propuesto y revisado en commit **local** `370cdccd` | No | `PROPUESTO/REVISABLE`, `CONTRACT_PENDING` |
| Implementación #721 | No | No | Issue OPEN, sin `status:approved`, bloqueado por #671 |
| Backend escritura institucional | No demostrado | No | Infraestructura/identidad/permisos futuros; no piloto |

## 10. Cuatro preguntas Q-1..Q-4: acuerdo conceptual versus contrato cerrado

### Q-1. ¿Cómo llevar toda la semántica de F4.4 a un destino sin pérdida?

**[P]** Export V2 y F4.4 son complementarios, no equivalentes. El formato tabular existe para líneas 1:N y compatibilidad Excel. El freeze requiere que, cuando se declare entrega de acto completo, no se pierda el acto conceptual.

**[A]** Se acepta **no crear por defecto un almacén paralelo del acto íntegro en el Excel manual** si no aporta utilidad ahora. También se acepta que a futuro la recuperación completa requiere preservar identidad y hechos suficientes. La diferencia L0/L1/L2 debe ser visible.

**[H]** Faltan matriz F4.4 ↔ Export V2 ↔ Bridge y decisión sobre portador/mapping/roundtrip íntegro. El contrato #671 no está formalmente congelado para implementación hasta resolverlo o delimitar qué parte exacta se declara soportada.

### Q-2. ¿Quién genera `attemptId`?

**[P]** Identidad del acto distinta de identidad del intento. Ningún adaptador debe inferir terapia ni afirmar deduplicación institucional por repetición local.

**[H]** Política exacta de generación, formato, ciclo de reintento y responsabilidad del llamador; no decidir UUID ni almacenamiento sin evidencia o WO específica. El DTO local #671 propone un `attemptId` explícito; política no congelada.

### Q-3. ¿Qué es `destination` y cómo se resuelve la hoja?

**[A]** En Excel manual la profesional elige fichero/hoja; el sistema no selecciona automáticamente la hoja «intuyendo» patología/medicación. En Bridge puede haber entrada raw común por servicio y Processor relacional; añadir routing físico por patología requiere justificarlo (#577). La compatibilidad por centro es configurable y debe fallar cerrado ante mapping físico desconocido.

**[H]** El descriptor genérico del resultado y cualquier mapping operacional explícito a libro, servicio y hoja aún deben decidirse por capacidad/escenario. No afirmar un destino realmente persistido basándose en selección manual.

### Q-4. ¿Cómo demostrar origen/autoridad del acto?

**[P]** F4.4 garantiza conformidad estructural de lo que construye; no certifica automáticamente firma/autorización institucional.

**[A]** Para evaluación sintética complementaria a JARA basta mostrar autoría **declarada** y el límite de procedencia, sin desplegar nueva autenticación ahora. Ello no demuestra acceso autorizado a datos clínicos reales ni suficiencia legal para otros entornos.

**[H]** Autenticación/provenance acreditada si se plantea una escritura institucional o piloto, dependiente de SES y entorno. No resolver mediante una simple columna de nombre.

## 11. Secuencia posterior de trabajo — propuesta, no autorizada

1. **Validación humana de este documento:** alineamiento funcional ratificado por la responsable el 2026-10-12; su incorporación y publicación documental en GitHub sigue siendo independiente y no cambia las autoridades de ADR/F4.4.
2. **WO documental independiente**, si se autoriza: publicar este alineamiento en la ruta indicada, enlazarlo desde `docs/INDEX.md` y registrar estado/trazabilidad en `docs/ops/WORK_ORDER_STATUS.md` sin presentarlo como nuevo ADR o contrato congelado. Conservar textos históricos; añadir punteros y aclaraciones mínimos.
3. **Matriz F4.4 ↔ Export V2 ↔ Bridge**: estudiar identidad, cardinalidad, información clínica, autoría, provenance, ausencias/centinelas, serialización, recuperación L0/L1/L2 y gaps; contrastar diseño histórico del Processor sin tratarlo como código publicado. Read-only antes de escoger solución.
4. **Decisión Q-1 acotada**, seguida del mínimo de Q-2/Q-3 necesario y límite Q-4, mediante el proceso de contrato #671. Mantener distinción entre diseño del primer modo manual y promesa futura de portabilidad/roundtrip.
5. **Aceptar/publicar #671 solo con autorización**; después preparar **una WO individual para #721**, con revisión de alcance y gates propios. No encadenar tickets ni implementar UI, Bridge, Office Script, SQL o Enfermería dentro de #671.

## 12. NO TOCA y condiciones de seguridad

- No modificar ni afirmar ya corregidos F4.4, Export V2, legacy, workbook, Office Script, Power Automate ni backend.
- No introducir datos reales, pacientes, CIP clínicos reales, tokens, credenciales, claves, endpoint institucional o datasets en GitHub o demos externas.
- No derivar dosis/vía/pauta/presentación/inducción/duración, validación, renovación, switch/add-on, causalidad, dispensación o línea terapéutica desde fármaco, catálogo, tratamiento previo, ausencia o posición de fila.
- No confundir **datos de autoría declarada** con autenticación efectiva, **guardar en Bridge** con registrar en SES/JARA, **tests verdes** con QA real, ni **documento revisado local** con publicado.
- No tocar automáticamente issues #671, #721, #577, #236; ni `main`, ramas/worktrees ajenos, PR, push o merge. Cualquier publicación requiere WO documental autorizada y preflight de HEAD vigente.

## 13. Fuentes y trazabilidad (rutas relativas a `docs/architecture/` si se publica allí)

**Autoridad primaria de arquitectura vigente:**

- [Architecture Decision Freeze 2026-09-24](PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md), §§5–7, 10.
- [ADR-005 — Clinical write contracts](adr/ADR-005-clinical-write-contracts.md).
- [ADR-006 — Persistence adapters and Excel](adr/ADR-006-persistence-adapters-and-excel.md).
- [Foundation Train Plan — F4.4/F4.5](../ops/PROMUEVE_FOUNDATION_TRAIN_PLAN_20260924.md).
- [INDEX](../INDEX.md) y [WO Status](../ops/WORK_ORDER_STATUS.md), leídos en la revisión.

**Diseño operativo y estado de producto que deben interpretarse conforme al freeze:**

- [Contrato longitudinal WO8 reconciliado](../farmacia_export_longitudinal_contract_WO8.md), §§0 y 9.
- [Decisión FH V4 persistencia/evaluación 2026-08-04, con reconciliación 2026-09-24](../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md).
- [Target Architecture V4 de 2026-07-31](PROMUEVE_NEXUS_V4_TARGET_ARCHITECTURE_20260731.md), secciones 7, 9, 13; **su descripción histórica del estado técnico puede estar superada** por las reconciliaciones posteriores.
- [Backlog Farmacia 2026-10-11](../ops/FARMACIA_ESTADO_Y_BACKLOG_20261011.md).
- [Ledger vivo de estado](../ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md).
- [Contrato Export V2 Core](../contracts/FARMACIA_EXPORT_V2_CORE_CONTRACT.md) y `schemas/farmacia_export_row_v2.schema.json`.
- `modules/farmacia_act_contract.js`, `modules/farmacia_act_payloads.js` (código publicado F4.4).
- `scripts/farmacia_export_v2_core.js`, adaptadores `scripts/farmacia_export_v2_*_adapter.js`, `scripts/farmacia_export_v2_context.js`, formularios HTML y `scripts/farmacia_bridge_v2_reader.js`.
- `templates/PROMueve_FH_Caceres_Bridge_DEMO.xlsx`, `tools/generate_farmacia_excel_bridge_workbook.py`, `tools/farmacia_excel_bridge_workbook_check.py`.
- Commit histórico candidato **no publicado** `95565e1698dc4b8333daec0b4d342e298d5d9cfa` (Office Script Processor/schema/checks).
- Contrato #671 **solo local**: `docs/contracts/FARMACIA_DELIVERY_RESULT_V1_CONTRACT.md` en worktree `work/issue671-f45-delivery-spec-complex-20261012@370cdccdbbab9697c7d63332a19da76efdfb8c01`; **no puede citarse como archivo de la rama canónica** hasta publicación.

**Decisiones expresadas por la responsable en la conversación 2026-10-12:** convivencia por centro, selección manual consciente de hoja en Excel actual, Office Script como Processor de raw sin interceptar portapapeles, Power Automate opcional, registro institucional JARA separado, no añadir almacén paralelo de acto íntegro solo para Excel actual, aspiración de reconstrucción completa futura y necesidad de matriz antes de cualquier decisión de portador.

---

**Checkpoint de lectura:** alineamiento conversacional ratificado por la responsable; hasta publicación GitHub es un candidato documental local, no una nueva autoridad técnica. Si se modifica la definición de alguno de estos puntos, actualizar el alineamiento y registrar fuente/fecha sin reescribir retroactivamente lo que estaba publicado. **No se inicia ni aprueba #721 por crear este documento.**
