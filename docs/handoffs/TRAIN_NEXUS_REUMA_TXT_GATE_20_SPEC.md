# Train 20 / #621 — SPEC aceptada: TXT→CSV por visita activa, sin persistencia

**Estado:** ACEPTADA PARA EJECUCIÓN LOCAL POR LA OPERADORA (2026-10-10); **no publicada en GitHub, no implementada, no apta para piloto**.
**Procedencia:** decisiones conversacionales explícitas de la operadora sobre #621; repositorio canónico `b32majus/Hub-Clinico-Badajoz@promueve/nexus-v4`. Fuente diagnóstica histórica `docs/ops/audits/REUMA_BROWSER_STORAGE_621_DISCOVERY_20261010.md` sigue marcada `DRAFT / NOT APPROVED` y no se reescribe como decisión.
**Antecedente:** #620 ya publicó copia veraz en el modal por PR #625; #587 retiró la cola insegura por PR #619. Nunca reactivar recuperación ni asumir que el servidor hospitalario está aprobado.

## Problem Statement (perspectiva del profesional)
El profesional prepara una nota TXT y una fila CSV de la misma visita, y debe copiar/pegar manualmente en los sistemas clínicos del SES. La puerta actual usa `sessionStorage` con CIP, fecha, tipo y diagnóstico duplicados; sobrevive recargas y puede habilitar CSV tras abrir un modal sin copiar. Al cambiar los datos de la visita, puede terminar exportando un CSV que no corresponde a la nota TXT anterior. El servidor hospitalario futuro **no suprime** la necesidad actual de pegado manual.

## Solution (interacción aceptada)
Una autorización **temporal, exclusiva de esta instancia activa de página/visita**, sin `sessionStorage` ni `localStorage`, habilita CSV solo después de una copia TXT realmente confirmada por navegador o de la **atestación explícita del profesional** para copia/descarga manual. Debe corresponder a los datos exportables actuales; cualquier diferencia visible en esa captura bloquea CSV hasta repetir el TXT, con un aviso sobrio para revisar el texto incorporado a la historia clínica. Recargar, navegar a otra instancia, volver desde historial (incluido bfcache) o iniciar otro paciente/visita hace perder autorización. No hay mecanismo para verificar escritura en la historia clínica; no exigirla ni afirmar que ocurrió.

## User Stories / criterios de aceptación falsables
1. Como clínico de Primera Visita, antes de TXT no puedo exportar CSV; el mensaje indica el paso pendiente.
2. Como clínico de Seguimiento, un TXT **copiado por clipboard API con resolución satisfactoria** habilita CSV para los mismos datos.
3. Como clínico, un rechazo/fallo de clipboard automático **no** habilita CSV solo por abrir el modal.
4. Como clínico, el botón «Copiar» existente del modal habilita CSV únicamente después de un resultado exitoso (protección #620); si falla conserva texto y CSV bloqueado.
5. Como clínico que usa selección manual Ctrl+A/Ctrl+C u otra copia fuera del navegador observable, puedo **declarar explícitamente** «He copiado el TXT» en el flujo Reuma; no debe confundirse con confirmación automática ni exigirse pegar en PreSalud para continuar.
6. Como clínico que recurre al archivo .txt, puedo **confirmar explícitamente** que lo he descargado/guardado; pulsar solo descargar no autoriza CSV. Si no se puede presentar un control de confirmación fiable, falla cerrado y debe informarse.
7. Como clínico, cerrar/cancelar modal sin copia o atestación deja CSV bloqueado y no muestra éxito.
8. Como clínico, si modifico un campo cuyo valor figure en los datos exportables tras copiar/confirmar TXT, CSV bloquea y muestra: «Los datos de la visita han cambiado desde el TXT. Vuelve a exportarlo y revisa que la historia clínica refleje la versión actual antes de generar el CSV». El mensaje **no declara** que se pegó o se guardó en historia.
9. Como clínico, un cambio de presentación pura sin modificar el payload exportable no fuerza repetición.
10. Como clínico, una copia antigua cuyo Promise resuelva después de una segunda exportación o de una edición/cancelación **no habilita** el CSV ni cambia el modal de la visita actual.
11. Como clínico, después de recargar, navegar fuera, reabrir una visita, restaurar página desde bfcache o usar «Nuevo paciente», necesito repetir TXT.
12. Como clínico, dos visitas distintas con igual CIP/fecha/tipo/diagnóstico **no heredan autorización entre instancias de visita**. El gate no inventa un identificador clínico ni supone que dos formularios visualmente idénticos son visitas diferentes sin una acción de nueva instancia.
13. Como clínico, reexportar CSV dentro de la **misma** instancia de visita **sin modificar datos** no exige repetir TXT, salvo nueva visita/recarga.
14. Como evaluador de seguridad, una marca antigua en `sessionStorage`, incluso si encaja con CIP/fecha, **nunca** autoriza CSV; tampoco se lee, elimina o migra. El posible `hubPendingRows` histórico permanece intacto.
15. Como evaluador, la exportación formal de 497 campos, su orden y su igualdad byte a byte con el adaptador cutover no cambian; el TXT generado tampoco cambia.
16. Como profesional, al fallar el estado temporal el sistema falla **cerrado**; no se restituye una antigua marca por conveniencia.
17. Como evaluador de consumidores, Solicitud FH mantiene intactos los textos, su modal y las confirmaciones veraces de #620; Dashboard no recibe un gate TXT funcional que no tenía.
18. Como responsable de proyecto, CI y QA sintéticas son evidencia de demo: sin servidor local autorizado, interoperabilidad, ni verificación real de pegado, **no** piloto/producción.

## Implementation Decisions (decisiones aceptadas; no son pseudocódigo de implementación)
- Estado de permiso no persistente y privado del módulo Reuma; como máximo **una autorización por instancia activa**. No introducir hash de CIP en storage ni `indexedDB`, cookie, URL, backend o un TTL arbitrario. No se guardará en browser storage la tupla clínica ni datos de la nota.
- Puerta consultada **en las dos rutas existentes** de CSV: `exportarYCopiarCSV` y `exportarAct497`. La fuente de datos comparables es la recopilación existente `recopilarDatosFormulario` / `recopilarDatosFormularioSeguimiento`, usada para TXT y CSV; no comparar `generarNotaClinica` literalmente si contiene timestamps de presentación. Una instantánea en memoria del **payload exportable** permite comparar integralmente; si el colector contiene campos de entorno no deterministas, enumerarlos y justificar su exclusión antes de hacer tests verdes. Prohibido ignorar campos clínicos para «arreglar» un test.
- El vínculo de contexto debe respetar tipo de visita, patología e identidad explícita. **No** se introducen datos terapéuticos inferidos ni se trata el tratamiento previo como el solicitado. Una nueva instancia de visita necesita un límite observable y soportado: navegación/recarga, `pageshow.persisted`, «Nuevo paciente» (Primera Visita usa `location.reload()`) u otra señal comprobada. **HUMAN STOP** si hay un flujo real de nueva visita dentro del mismo documento, con mismos datos, que no puede detectarse sin nueva decisión de UX.
- La confirmación automática depende exclusivamente de resultado real `navigator.clipboard.writeText` (o el botón Copiar del modal con la semántica #620). Para Ctrl+A/Ctrl+C y descarga manual, usar una **acción explícita etiquetada** de atestación del profesional, acotada al TXT de Reuma; jamás deducir éxito del foco, selección, `modal.open`, descarga disparada o texto visible. La confirmación de usuario **no** es prueba de escritura en HCE.
- El mismo contrato vale para Primera Visita y Seguimiento. `dashboard_paciente` y páginas que solo cargan `exportManager.js` deben seguir cargando, sin habilitar CSV inapropiado.
- Corridas concurrentes: una nueva exportación TXT invalida la anterior **antes** de iniciar una copia asíncrona; la edición invalidante y cierre de visita también desactivan todo resultado en vuelo. No generar doble toast ni un permiso tardío tras cerrar/reabrir.
- El marcador legacy `HubClinico_TxtExportDone_*` y el posible `localStorage.hubPendingRows` **ni se consultan, ni se modifican, ni se borran**; evidencia con centinelas sintéticos. No reutilizar nombres de claves.
- El recorrido descargable debe incluir su confirmación explícita, no una falsa promesa de éxito desde `link.click()`. Si no hay posibilidad fiable de confirmación in-flow, bloquear CSV y mostrar cómo reintentar TXT.
- **Mensajería aprobada:** «TXT copiado» cuando clipboard informa éxito; «TXT confirmado por el profesional» en autoatestación; tras editar datos, aviso de discrepancia y necesidad de actualizar/revisar HCE; nunca «guardado en HCE», «validado», «registrado en servidor» o «pegado» sin evidencia.
- No ampliar esta WO a saneamiento de `console.log` con datos clínicos: es deuda separada, importante antes de piloto y sin cambio autorizado en este train.

## Testing Decisions / seams públicos acordados
- **Seam principal:** controles reales de Primera Visita y Seguimiento `Exportar TXT` → `Estructurar CSV`, con formulario sintético y exportación de 497 columnas. Observar botones, modal, notificaciones, escritura del portapapeles y entrega CSV sin modificar readonly/DOM para crear estados artificiales.
- **Seam compartido:** botón Copiar de `mostrarModalTexto`, solo cuando lo invoca el TXT Reuma; recorrer Solicitud FH como consumidor hermano de regresión.
- **Contratos negativos independientes:** marca antigua plantada no autoriza; segunda visita/same-day, cambio clínico posterior, cambio no exportable, rejected/false clipboard, cierre modal, descarga no confirmada, falta de señales de identidad, recarga/bfcache, contexto ausente, storage denegado, resultados Promise stale.
- **Evidencia mínima:** oráculos deterministas centrados en resultado y browser Chromium con clicks soportados; centinela legacy byte-unchanged, cero escrituras del gate nuevo en Web Storage, fila CSV 497 igualdad byte a byte. Baseline RED debe probar defecto previo; pruebas positivas y negativas final GREEN. No se admite únicamente un `eval` aislado o alteración artificial del DOM como prueba funcional.
- **Gate 3:** mapear consumidores reales del módulo compartido y comportamiento ante importaciones en siete HTML; **Gate 4**: ver aviso por edición y confirmación manual real, sin rehacer diseño ni CSS.

## Out of Scope / NO TOCA
- Prescripción Farmatool/PreSalud, pegado o verificación real en HCE/orden clínica, SQL Server, integración local, concesión del servidor, FHIR/HL7, automatización de pasta manual.
- Datos reales, CIP reales, exportaciones clínicas, secrets, telemetry con contenido clínico.
- Cambio de motores/proyección/columnas 497, fórmulas, estados terapéuticos, XLSX/Bridge, Home general, Farmacia, contrato de Solicitud FH, módulos derma.
- Borrado/migración del marcador legacy y `hubPendingRows` (requiere evaluación de privacidad hospitalaria y WO propia), higiene general de consola, refactor masivo de formController.
- Publicación GitHub/merge/deploy/cierre de issue y actualización del ledger vivo: WOs y autorizaciones separadas.

## Further Notes
- Informe discovery #621 antiguo: describe estado anterior; la aceptación de este contrato **no actualiza GitHub** ni reemplaza retroactivamente ese documento. El alcance de la decisión funcional no equivale a autorización del hospital para borrado histórico o piloto.
- El 21 hay reunión con gerencia y se ha solicitado servidor local; **no** convertir la expectativa de infraestructura en requisito técnico para este V4 local-first. El pegado manual continúa.
- Diseñado para aplicación conforme a Matt /to-spec → /to-tickets (locales) y Atenea C-087; no usar las skills de publicación para crear issues sin permiso. El operador lanza manualmente desde TUI persistente.
