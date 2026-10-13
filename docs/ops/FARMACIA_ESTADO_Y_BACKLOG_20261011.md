# PROMueve Nexus — Farmacia Hospitalaria: estado, pendientes y puertas de implementación

**Corte reconciliado:** 2026-10-11 · WO histórica [#647](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/647)/PR #648. **Último cambio de producto FH publicado:** Train30 #659/[PR #660](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/660) §e2cbc861e6632699c04ebc6bfc3c485796a7c5ac§, microcopy veraz de Export V2; previo Train28 §de65dca6b8939fd9e64207f713a985fe2c9dda60§. La rama global alcanzó §a3556b408e91c257c7cd2c829c575ff497c99745§ mediante arnés PR #662. Fotografía, no SHA de lanzamiento. Ver [cola transversal](PROMUEVE_SHIPPING_BACKLOG_20261011.md).
**Actualización posterior 2026-10-14; preservar corte histórico 2026-10-11:** Train31 #768/#769 MERGED por [PR #770](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/770), merge acb7038a8bbdf0fa2e38eac09d93c8558252bdd5, [Nexus gates 38474940173](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/38474940173) y [Pages 38474938655](https://github.com/b32majus/Hub-Clinico-Badajoz/actions/runs/38474938655) SUCCESS. SIL-REV-018-B solo EA y movimientos resueltos; otros B, C/D/E pendientes. Sin Validación, Excel Enfermería ni piloto. [WO](WO_TRAIN31_FH_STATS_EA_MOV_POSTMERGE_RECONCILIATION_20261014.md), [WO #771](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/771).

**Objeto:** mapa de trabajo práctico, sin reabrir auditorías ni decisiones cerradas. Responde «qué existe, qué funciona, qué está publicado, qué falta, qué lo bloquea y cuál es su siguiente acción». No constituye un contrato clínico nuevo, aprobación de prioridad o autorización de piloto.

## 1. Autoridad y reglas de interpretación

**Orden de verdad:** instrucción/WO vigente → GitHub (rama, commits, PR, issue, código) → [INDEX](../INDEX.md), [WORK_ORDER_STATUS](WORK_ORDER_STATUS.md) → [ledger de producto](PROMUEVE_PRODUCT_STATUS_LEDGER.md) → [auditoría manual Sil 28/09 y adenda 01/10](audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md) (#495), [reconciliación 03/10](audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md) (#501), [contrato N0 renovaciones](../contracts/FARMACIA_RENEWAL_HANDOFF_CONTRACT.md) (#509/PR #510), [deuda FH](FARMACIA_DEBT_REGISTER.md) y [backlog transversal](PROMUEVE_BACKLOG.md). Revalidar siempre GitHub live antes de ejecutar: los SHAs son una fotografía, no autoridad futura.

Estados diferentes: **EXISTE EN CÓDIGO**, **CABLEADO**, **VISIBLE**, **DEMOSTRADO por interacción soportada**, **PUBLICADO**, **APTO PARA DEMO SINTÉTICA**, **APTO PARA PILOTO** (no acreditado aquí). `PENDIENTE_DECIDIDO` no equivale a WO autorizada; `PENDIENTE_QA` exige demostrar un defecto antes de tocarlo; `PENDIENTE_EQUIPO / PENDIENTE_FUENTE` no se cierran mediante inferencia técnica; `DEFERIDO` no es siguiente frontier por defecto.

Puertas de preparación: **C-087 directo** solo para un cambio atómico con producto y aceptación ya cerrados; **Matt shaping/spec/tickets** para dividir y formalizar tras fijar contigo la interacción asistencial; **decisión humana/equipo clínico** para semántica abierta; **fuente** para contenido no autorizado; **QA focal** antes de llamar defecto a una observación.

Invariantes: solicitado ≠ validado; validado ≠ dispensado; tratamiento previo ≠ inicio nuevo; plan ≠ tratamiento activo; devolución de Enfermería ≠ renovación actualizada por FH. El catálogo identifica/ayuda: nombre de fármaco, ausencia, tratamiento previo o código CIMA no permiten inferir dosis, vía, pauta, presentación, inducción, duración, switch, add-on, resultado, causalidad o inicio. La propuesta contextual de ficha técnica **solo** puede surgir de una selección explícita de presentación y contexto explícito cuando sea necesario, permaneciendo editable y sin sobrescribir decisión profesional. Sin pacientes reales en repo ni evaluación clínica no autorizada.

## 2. Estado publicado y alcance de lo demostrado

| Producto | Estado y evidencia publicada | Límite |
| --- | --- | --- |
| Home → Farmacia | #575/PR #580 `PUBLICADO`, navegación soportada | Readiness de demo sintética, no cualificación hospitalaria |
| F4.1–F4.3, Read DTO/facade/cutovers FH | PR #430, #474, #478 `PUBLICADOS`; PV-001 solicitado≠validado resuelto #482/PR #484 | Lectura no equivale a escritura/persistencia |
| F4.4 Pharmacy Act v1 | #487/PR #490 `PUBLICADO` | F4.5 DeliveryResult y F4.6 pendientes |
| Inicio y Actividad del servicio→«Pendientes» | #549/#550/PR #555; composición #565/PR #566 `PUBLICADOS` | Renovación de receta / recogidas pendientes solo `? + Próxima fase`, no runtime |
| Validación manual/Excel: claridad de entrada | Train26 #645/PR #646, merge `ba38474e` `PUBLICADO`; **seis textos** | `fhOrigenEntrada` y values/listeners intactos; preselección `demo_formacion` es deuda preexistente fuera del Train |
| Primera Visita: solicitud/inducción | Capacidad UI existente y PV-001 corregido; `IMPLEMENTADO_PARCIAL / QA POR CASO` | Inducción solicitada ≠ validada; no declarar restauración o piloto sin recorrido soportado |
| Export V2 demo (copy mejorado Train30) | Copia técnica TSV de 152 columnas en tres pantallas, label «Copiar datos estructurados (demo)» y explicación veraz; #659/PR #660 publicados | No entrega, no guarda automáticamente, sin backend ni piloto |
| Filtro «Principio activo registrado» (`SIL-REV-018-A`) | Train28 #651/PR #652 `PUBLICADO`, merge `de65dca6b8939fd9e64207f713a985fe2c9dda60`; Chromium 11/11 y CSV 37 columnas verificados | Séptimo selector solo de `activeIngredients` explícitos; combinación AND con «Fármaco» (marca OR molécula), no infiere molécula ni estado activo; B/C/D/E siguen pendientes, sin piloto |
| Estadísticas: análisis poblacional | NUEVE filtros soportados: siete previos + gravedad EA + movimiento explícito; Train31 #768/#769 [PR #770](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/770) MERGED acb7038a8bbdf0fa2e38eac09d93c8558252bdd5; Cora 19/19+11/11 y Cohort 30, CI/Pages postmerge SUCCESS. Mismo cohort para KPI/gráficos/tabla/CSV 37 | Solo EA status present con severity explícita del mismo evento y actos tipados documentados; otras dimensiones SIL B y C/D/E pendientes; no piloto. |
| Informes V1 Cosentyx y Kisqali | #576/#579, PR #581/#582 y ampliaciones #598/#599/#602 PR #600/#601/#603: `PUBLICADOS / QA SINTÉTICA`; informes completos con XLSX calculado y detalle | Primera dispensación **explícita** para nuevo inicio; Kisqali ciclos evaluables ≠ consumo; presentación ≠ dosis |
| Renovaciones | **N0, solo contrato** #509/PR #510 y PR #511 | Sin N1/N2/N3 funcionales; N4 diferido |
| Solicitud Reuma→Farmacia textual | #528–#531/PR #532 **PUBLICADA**; Train25 #649/PR #650 merge `8a4c346babcc2894f2ef36f0468289ae1563c778` **PUBLICADO** | F1: actual físico y plan separados aun con igual nombre; F2: `No` explícito preservado; F3: fallback sin pérdidas. Alias camelCase ambiguo queda vacío en artefacto FH; tarjetas/KPI Reuma eran deuda distinta, **resuelta posteriormente por Train27 #653/PR #654**. No integración estructurada ni piloto. |
| Últimos Trains | Train23 #641/PR #642, Train24 #643/PR #644, Train26 #645/PR #646, Train25 #649/PR #650, **Train28 #651/PR #652 (`de65dca6b8939fd9e64207f713a985fe2c9dda60`)** y **Train27 #653/PR #654 (`124c12b623f12885347c8e6c79dd965ac570df54`)**, todos MERGED | QA sintética y CI; Pages desplegado, **NO PILOTO** |

**Adenda de estado 2026-10-11 — Train28/FH y Train27/Reuma:** #651/PR #652 y #653/PR #654 **MERGED/VERIFICADOS**, con Nexus gates y Pages postmerge SUCCESS. Los issues #651/#653 siguen OPEN administrativamente, sin defecto técnico abierto en sus alcances. El nuevo filtro no demuestra tratamiento activo; la corrección Reuma no convierte plan o tratamiento previo en actual. Overflow horizontal de la tabla de Estadísticas a 820/1080 preexistente y fuera de Train28; `SIL-REV-018-B/C/D/E`, FH-DEBT-001 y N1–N3 permanecen pendientes de sus gates. Solo sintético, **NO PILOTO**.

**Nota Git y administración:** #643 y #645 seguían **OPEN** administrativamente pese al merge de #644/#646; #537 aparece OPEN tras PR #538. Train25 #649/PR #650 ya está MERGED y su issue se cierra en el cierre operativo autorizado. No confundir issue abierto con funcionalidad pendiente; los cierres de #643/#645/#537 son independientes de #647.

## 3. Backlog de ejecución: qué necesita cada cosa

### 3.1 Trabajo recortable de Farmacia tras publicar Train28

| Pendiente | Estado probado | Puerta concreta y evidencia proporcional |
| --- | --- | --- |
| **SIL-REV-018-B: PROM/instrumento/valor, validación, EA/severidad, causalidad, movimientos** | PARCIAL: EA/gravedad y movimientos publicados Train31 #768/#769 [PR #770](https://github.com/b32majus/Hub-Clinico-Badajoz/pull/770); PROM, validación y causalidad siguen no filtrables o pendientes | No repetir EA/MOV. Definir por separado semántica de PROM/validación/causalidad según fuente y decisión autorizada; ninguna causalidad/acto inferido. |
| **`SIL-REV-018-C`: dosis, vía, pauta/frecuencia** | Atributos de líneas/movimientos visibles o exportables; no filtros soportados | Definir línea activa vs evento histórico, coexistencia de líneas, texto vs valor estructurado; no derivar pauta/dosis desde presentación. Shaping funcional focal → WO |
| **`SIL-REV-018-D`: ventana temporal y 1/2/3 tratamientos simultáneos** | Requisito decidido; sin filtro publicado equivalente | Definir fecha/ventana y contar **líneas activas simultáneas explícitas**, no fármacos históricos; fijar semántica antes de spec/ticket |
| **Dashboard FH: «Copiar fila Excel FH», «Vista completa»** | Ambos controles existen; `Vista completa` navega a longitudinal | `PENDIENTE_QA`: probar el recorrido real y preservar acciones útiles/deep-links; decidir retirada solo tras ver utilidad y continuidad |
| **Dashboard FH: comorbilidades** | HTML y `renderComorbidities` están cableados | `PENDIENTE_QA`: verificar fuentes raw/demo, ausencia, representación y contexto soportado. No implementar un segundo componente sin defecto |
| **Export V2: lenguaje de uso** | **RESUELTO/PUBLICADO** por Train30 #659/PR #660; texto y estados veraces, contrato TSV inalterado | No reabrir como pendiente; solo comprobar nuevo defecto reproducido |
| **`FH-DEBT-004`: tablas Cosentyx a 820/1080 px** | `OPEN/P2 PRESENTACIÓN`; desplazamiento horizontal interno sin aviso, sin pérdida de datos | WO visual separada, affordance/reflow y verificación real a 820 y 1080 px; no cambiar cálculos/XLSX |

### 3.2 Trabajo con contrato parcial o decisión clínica material

| Pendiente | Cerrado por autoridad actual | Falta para implementarlo |
| --- | --- | --- |
| **`SIL-REV-012/013` Renovaciones N1** | N0 publicado y congelado: `renewal_id/line_id`, `valid_until` con calidad/origen, ventana, estados, envelopes, errores y checker | WO N1 FH (detección+bandeja+export a Enfermería), oráculo negativo independiente, datos explícitos de caducidad y servicio; parámetros/umbrales del equipo; browser de bandeja. Sin fuente real: solo demo sintética con `unknown/not_evaluable` |
| **Renovaciones N2** | Contrato canónico de ida/vuelta N0 | Layout Excel físico y columnas adicionales (`REN-OPEN-007`), round-trip y rechazo de campos prohibidos, idempotencia; integración después de N1 |
| **Renovaciones N3** | N0 impide que aviso Enfermería prolongue automáticamente validez; terminales solo FH | `REN-OPEN-003` acto de actualización vs Pharmacy Act, historial/report_id, captura de validez y suspensión (`OCT-OPEN-010/011`), reconciliación posterior a N2 |
| **N4 Enfermería renovaciones** | Dirección futura | `DEFERIDO` tras N1–N3 y requisitos reales; no ampliar MVP |
| **`PENDIENTE_RECOGIDA`** | No recogida ≠ abandono/no adherencia/switch; solo dispensación registrada resuelve | `OCT-OPEN-001/002/003` ventana, revisión, destinatario/listado y fuente de dispensación; shaping asistencial atendido |
| **Primera Visita/Seguimiento FH: tratamiento preexistente, nuevas líneas/add-on** | Baseline previo ≠ START; nueva solicitud y validación antes de nuevo medicamento | QA por ruta y fuente explícita; `OCT-OPEN-004` decide primera dispensación de add-on (PV por nueva línea vs Seguimiento+acto). HUMAN STOP ante modelado sin decisión |
| **CIMA FH: propuesta contextual editable** | #501 distingue solicitud clínica por molécula de selección FH de medicamento/presentación concreta | Fuente ficha técnica versionada, indicación/contexto explícitos, mapeo inequívoco, no overwrite de edición profesional y no equiparar propuesta a validación. Shaping clínico + Matt specs |
| **Biosimilares en solicitud clínica** | Principio activo/molécula en solicitud cuando proceda; FH elige marca/presentación | `OCT-OPEN-006` lista/fuente vigente comprobada; Derma→FH aún sin módulo publicado |
| **`SIL-REV-001` nomenclatura SES** | Dirección: referencia global de programas/procesos FH | Fuente autorizada/versionada y vocabulario `service_id`; no mapear etiquetas por heurística |
| **`SIL-REV-018-E` sexo, edad, comorbilidades, control/actividad clínica** | Auditoría: en raw `sex/age` vacíos, `clinical_activity` nula y comorbilidades no proyectadas | Fuente/proyección explícita y criterios clínicos; no simular filtros raw con datos de demo |
| **`SIL-REV-020` medicación especial** | Necesidad registrada (ensayo, uso compasivo, extranjera/local) | DISCOVERY de fuente explícita/versionada o captura profesional; catálogo actual no equivale a clasificación |

### 3.3 Deuda, discovery y evolución no priorizados automáticamente

| Tema | Estado | Dependencia o condición |
| --- | --- | --- |
| Presets/recurrentes compartidos V2 `SIL-REV-002/019` | `DEFERIDO`; V1 Cosentyx/Kisqali ya completo | Shaping de propiedad, filtros guardados/versionados y gobierno; no Control Plane antes de necesidad |
| PDF de informes [#597](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/597) | `OPEN`, no publicado | Elección de motor y QA real; XLSX no bloqueado |
| CIMA autoactualización `SIL-REV-017` | `DEFERIDO, SEPARADO` | Pipeline API→normalización→diff/versionado→PR/revisión; no mezclarse con catálogo clínico |
| Excel Bridge [#577](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/577) | `DISCOVERY`; #236 permanece OPEN pero es histórico | Resolver routing físico por patología frente a entrada común y Processor relacional; no reactivar #236 por número/etiqueta |
| Interoperabilidad estructurada Reuma↔FH | `DISCOVERY_FIRST`, distinta del texto publicado | Contrato de entrega, identidad, retorno, validación, idempotencia; no presuponer escritura PreSalud/Farmatool |
| F4.5/F4.6 | `PENDIENTE_FOUNDATION`; F4.5 técnicamente disponible | Priorización humana específica. F4.6 depende de F4.5 |
| **`FH-DEBT-001`:** `sessionStorage` con Excel clínico importado | `OPEN P1 BEFORE_PILOT`, no impide demo sintética | Decidir seguridad/persistencia, mínima exposición, retención, borrado y continuidad Inicio→Validación. Sin piloto real hasta cierre demostrado |
| Polling customSelect [#570](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/570) | `OPEN DEBT`, no P0/P1 clínico demostrado | Medición/consumidores y fix separado si aporta valor |
| Búsqueda legacy no categorizada [#450](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/450) | `OPEN DEBT`, fuera de controles soportados | Decidir contrato de `search(query)` workbook-only/union; no mezclar con autocomplete o CIMA |
| NEXUS-DEBT-004/005 | Abiertas no bloqueantes | Tratar solo ante presión/WO de seam; no limpieza general |
| Dermatología y solicitud HS/PsO→FH | Dirección aceptada, implementación Nexus pendiente | Shaping clínico/UX propio y fuente biosimilares; no mezclar con Farmacia o V5 |

## 4. Contrato de renovaciones y preguntas que NO están resueltas

La [autoridad única N0](../contracts/FARMACIA_RENEWAL_HANDOFF_CONTRACT.md) es **PUBLICADA** por #509/PR #510 y reconciliada por PR #511; #446 está **CLOSED**. La secuencia de integración es estricta **N1 → N2 → N3**. Los registros `REN-OPEN-001..008` y `OCT-OPEN-010..013` permanecen abiertos según ese contrato: ventana/duraciones, nomenclatura, fuente/precedencia `valid_until`, Excel físico, acto terminal y organización del lote.

La duración **configurada** no puede pasar a confirmada; ausencia de fecha = `not_evaluable`, no fecha inventada. Enfermería no puede escribir `ACTUALIZADA_POR_FH` ni `TRATAMIENTO_SUSPENDIDO`, ni modificar medicación, validez o identidad de línea. `RENEWED_REPORTED ≠ FH_UPDATED`. N1 debe congelar su propio testigo negativo derivado del N0 antes de implementar y demostrar bandeja por interacción soportada cuando exista. No hay otro shaping N0 obligatorio.

## 5. Seguridad, representación y continuidad humana

- El import FH puede persistir dataset clínico en `sessionStorage` (`FH-DEBT-001`). Este P1 es **antes de piloto**: no basta con tests verdes, y no debe «arreglarse» suprimiendo sin diseño el paso Inicio→Validación.
- Una interacción nueva o modificada requiere comprobar, solo **si hay riesgo material**, `acción → respuesta/estado → siguiente acción → continuidad/cierre`. Si hay riesgo visual espacial real, prueba navegador a la anchura concreta; no imponer una auditoría UX general por defecto.
- Un filtro poblacional debe operar sobre `currentCohort` y su CSV formal, con filtros combinados, cero resultados y tratamiento explícito de ausentes. `Buscar en tabla` no equivale a filtrar población.
- Los informes V1 usan fixtures sintéticos y cuentan/calculan desde esos datos; no se publica como indicador de dispensación/consumo real ni se deduce dosis desde presentación.
- GitHub Pages y CI green no significan QA clínica hospedada, datos reales o piloto. No incluir secretos, identificadores o exportaciones de pacientes.

## 6. Secuencia operativa sugerida tras Trains 27/28 — **PROPUESTA, NO NUEVA APROBACIÓN**

1. **Train25 Reuma→FH PUBLICADO**: #649/PR #650, merge `8a4c346babcc2894f2ef36f0468289ae1563c778`, F1/F2/F3 auditados y corregidos con CI y Pages postmerge SUCCESS. No reabrir el candidato local; próximas WOs parten de la rama canónica publicada.
2. **Train28 FH `SIL-REV-018-A` PUBLICADO:** #651/PR #652, merge `de65dca6b8939fd9e64207f713a985fe2c9dda60`; filtro explícito por molécula independiente de «Fármaco», cohorte y CSV de contrato inalterados, Chromium 11/11 y CI/Pages SUCCESS. No queda como candidato. B/C/D/E conservan sus propias puertas.
3. **En paralelo al desarrollo FH**, ticketización N1 desde N0 congelado: shaping solo de las incógnitas materiales, no repetir auditoría ni rediseñar máquina de estados. Ante falta de fuente clínica, HUMAN STOP.
4. Alternativas acotadas para demo: microcopy de Export V2 o `FH-DEBT-004` visual. Separar estética, reporte, clínica y persistencia.

**Conflictos:** verificar solapamientos con la rama canónica que ya incorpora Train27 y Train28; si aparece una superficie o contrato compartido, detenerse y ajustar el hardening y QA al riesgo. No tocar `main` ni ramas ajenas. Antes de publicar, verificar HEAD remoto, cambios autorizados, tests y QA.

## 7. Trazabilidad administrativa y próxima actualización

- #651 (Train28) y #653 (Train27) siguen **OPEN** administrativos pese a PR #652/#654 MERGED. #643, #645 y #537 arrastraban deuda administrativa previa; esta WO **no cierra issues**.
- Este maestro es **agregado navegable**, no reemplazo de hallazgos `SIL-REV`, decisiones #501, N0, deuda FH ni fichas de implementación. El backlog histórico no se «promueve» por copiarlo aquí.
- Cada futura WO debe declarar decisión aprobada, HEAD/base, preflight, reversión, scope/NO TOCA, criterios, QA y política push/PR/merge; una propuesta no se documenta como publicada. La reconciliación tras publicación se hace en su WO apropiada.
