# DER-BASE #697 · Especificación candidata del primer recorrido DermaNEXus (PsO primero)

**Estado:** SPEC CANDIDATA / PARA ADJUDICACIÓN / SIN IMPLEMENTACIÓN NI APROBACIÓN CLÍNICA. **Fecha:** 2026-11-12. **Base verificada:** `promueve/nexus-v4@61380191d3fc84122970afbf6d99e63dff99b6ec` (PR #906). **Autoridad de shaping:** [#697](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/697), no `status:approved` de implementación.
**Fuentes:** [reconciliación Dermatología](../ops/PROPUESTA_DERMATOLOGIA_PSO_NEXUS_RECONCILIACION_20261112.md), [decisión producto #501](../ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md), [ADR-002](../architecture/adr/ADR-002-modular-monolith-and-module-boundaries.md), [ADR-003](../architecture/adr/ADR-003-hospital-deployment-and-configuration.md), [Platform Context](../engineering/PLATFORM_CONTEXT_API.md), `modules/home/home-renderer.js` y artefactos `data/platform/home/`. Los detalles clínicos de PsO pertenecen al [#728](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/728).

## Problema / decisión acotada

La Home actual muestra **DermaNEXus — Próximamente**, pero `module-registry.json` solo registra Farmacia y Reumatología: no existe workspace Dermatología navegable ni contrato de primera visita. La reunión de producto previó solicitudes a FH como primera profundidad; la decisión humana **posterior** del 12-11 es comenzar el desarrollo clínico del módulo con **Psoriasis (PsO)** y abordar **HS después**. Esto cambia la secuencia de entregas, no convierte el circuito FH en acto de visita ni habilita el módulo.

## Contrato de experiencia propuesto (sin decidir campos clínicos)

`Nexus Home → DermaNEXus → contexto de paciente del módulo → PsO / Primera Visita o Seguimiento → historia del paciente`. Desde el workspace se reserva una acción **Solicitar a Farmacia** como caso de uso propio, pendiente de especificar por [#698](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/698); no es precondición del contrato longitudinal PsO. Reporting poblacional posterior al primer recorrido validado.

- **Plataforma:** usar `moduleId: derma` (identificador de presentación ya reconocido por Home) y proponer `dermatologia_index.html` como `entryPath` **candidato**, a confirmar en la WO técnica. La ruta, habilitación y `siteId` provienen de los artefactos validados de deployment; no de un enlace, selector manual de hospital ni fallback legacy.
- **Home:** eliminar/sustituir la tarjeta ficticia cuando se registre `derma`: `renderHome` hoy llama incondicionalmente a `renderFutureDermaCard`; registrar sin tratarlo duplicaría DermaNEXus. Un módulo registrado pero no cualificado queda visible como no disponible y **no navegable**. No activar por simple existencia en código.
- **Workspace Dermatología:** la especialidad posee identidad clínica, lectura/historia, visitas y reglas de PsO. La Home no entrega paciente/CIP/cohorte/dataset. Ante paciente no seleccionado, desconocido, ambiguo o error de lectura, mostrar estado explícito, no rellenar con demo. Cambio de paciente cancela/invalida resultados anteriores.
- **Visitas:** Primera Visita y Seguimiento como actos diferenciados con identificación de paciente y visita, fecha clínica explícita, autor/fuente y estados `dato desconocido`/`dato ausente`; sin presumir hoy, tratamiento iniciado o respuesta. En #697 solo se acuerda la **gramática del recorrido**; instrumentos, variables, calculadores, cortes y terapias se definen y validan en #728.
- **Frontera profesional:** lo solicitado a FH no es lo validado/dispensado; formulario/traslado D17/D17_EXT_V1 aún requiere contrato #698. La pantalla Derma no simula mensaje de vuelta ni estado FH; no deduce dosis, vía, pauta, inducción, START/SWITCH/ADD_ON ni aptitud médica.
- **Datos/entorno:** se puede cualificar un **deployment sintético** para demo después de QA, pero no equivale a hospital real ni piloto. No prometer autosave, Excel Bridge, persistencia clínica oficial, autenticación o privacidad por tener URL separada.

## Criterios de aceptación del **futuro** primer slice (8 oráculos independientes)

1. **Home sin duplicación:** con `derma` no registrado hay exactamente una tarjeta «Próximamente» inerte; cuando está registrado hay **una sola** tarjeta Derma, nunca simultáneamente la fija y la real.
2. **Disponibilidad real:** módulo registrado/no cualificado no tiene enlace ni acción de entrada; solo tras configuración coherente y qualification sintética explícita aparece `Entrar`. Ruta desconocida/incoherente falla cerrado, sin navegar.
3. **Navegación soportada:** `Entrar` resuelve `getModuleRoute('derma')` al clic y abre el workspace en la misma pestaña; Back devuelve a Home; no filtra CIP ni paciente por la URL o `PlatformContext`.
4. **Paciente no fabricado:** al abrir sin selección se muestra estado vacío; ID ausente, ambiguo o no encontrado no activa paciente demo. Dos pacientes sintéticos permanecen aislados al alternar; respuesta asíncrona stale no rehidrata el anterior.
5. **Visita con autoría y tiempo:** Primera Visita/Seguimiento tienen contexto explícito de paciente, tipo y fecha clínica. Fecha no informada no se convierte en «hoy» ni existe escritura/resultado de éxito sin contrato/acción soportada.
6. **Ausencia clínica segura:** valores no registrados, incompletos, cero real y negativo conservan su significado y no inducen puntuación/respuesta/decisión; variables de PsO no se copian de Reuma ni HS. Los oráculos clínicos detallados pertenecen a #728.
7. **Solicitudes segregadas:** una acción de solicitud, cuando exista contrato #698, deja explícito `solicitado` y nunca muestra `validado` ni `persistido` por el simple envío/copia; sin canal inverso, su resultado permanece desconocido.
8. **QA y madurez verificables:** pruebas deterministas de registry/profile/manifest/readiness + journey navegador con datos sintéticos, consola limpia, errores/empty state y reporte explícito de lo no validado. **PASS automatizado ≠ QA humano ≠ piloto hospitalario**.

## NO TOCA, gates y siguiente entrega

No implementar ahora: registro Home, entrypoint, formulario, permisos, backend, storage, parsers, escalas, código clínico, site real, HS, Valme ni cambios en Farmacia/Reuma. No modificar `main` ni preparar desplegable institucional. No pacientes reales.

**Decisiones aún necesarias antes de código:** identificador y custodia del paciente en Derma; identidad/autor del acto sin fingir autenticación; contrato PsO #728 con el equipo; fuente de persistencia y resultado de escritura; deployment/demo a cualificar y oráculo de seguridad de navegación. El nombre final de la ruta es candidato, no decisión publicada.

**Próximo tramo:** propuesta y adjudicación de #728 (contrato PsO) usando Valme como evidencia y nunca como implementación a copiar. Si #697 se acepta, preparar WOs separadas y tests RED para Home/registro y para workspace PsO; ninguna etiqueta de aprobación ni capacidad de ejecución se deduce de este documento.
