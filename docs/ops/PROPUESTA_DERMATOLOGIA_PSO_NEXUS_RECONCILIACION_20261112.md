# Propuesta local de reconciliación — Dermatología/Psoriasis dentro de PROMueve Nexus

**Estado:** CANDIDATO DE DISEÑO / LOCAL / SIN PUBLICAR / SIN APROBACIÓN CLÍNICA DE DETALLE.
**Fecha:** 2026-11-12. **Instrucción humana actual:** Psoriasis será la primera vertical clínica de Dermatología; HS se retomará después. Esto fija la prioridad de trabajo, no declara módulos publicados ni piloto.
**Autoridad Git verificada:** b32majus/Hub-Clinico-Badajoz, rama promueve/nexus-v4, START_HEAD 179955cca0b7e11f7966a38b719a8fae3ab87e7d (PR #904 integrada). Checkout principal local estaba atrasado; documento creado en worktree aislado sin moverlo.
**Ámbito:** reconciliar el plan de rescate de PsO-Valme con la arquitectura de Nexus y los issues reales de Dermatología. **No implementa ni valida clínica**, no decide formularios/umbrales clínicos sin fuente, no modifica issues ni Home ni Farmacia.
**Referencias primarias:** [Architecture Freeze](../architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md), [ADR-002](../architecture/adr/ADR-002-modular-monolith-and-module-boundaries.md), [reconciliación producto 2026-10-03](audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md), [ledger de producto](PROMUEVE_PRODUCT_STATUS_LEDGER.md), [trazabilidad](PROMUEVE_REQUIREMENTS_TRACEABILITY_20261011.md), [situación actual](../../ESTADO.md), [epic Dermatología #857](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/857).
**Donante PsO:** [plan de Valme](https://github.com/b32majus/Hub-Clinico-PsO-Valme/blob/work/pso-valme-train-c-20260930/docs/plans/PSO_VALME_TO_PROMUEVE_DERMATOLOGY_MASTER_PLAN_20260928.md) y sus auditorías. **Referencia HS para futuro:** [Hub Clínico HS Canarias](https://github.com/b32majus/Hub-Clinico-HS-Canarias), no auditado ni homologado como contrato Nexus en esta WO.

## 1. Dictamen y correcciones frente al plan Valme de septiembre

**Apto como fuente de conocimiento de Psoriasis, no como arquitectura a integrar.** La secuencia original de Valme fue formulada antes de la reconciliación de producto Nexus del 3 de octubre y antes de los contratos ya existentes de plataforma. No copiar V1/V2 ni continuar un segundo producto para preparar Nexus.

| Aspecto del plan Valme | Adaptación para Nexus | Límite |
| --- | --- | --- |
| PsO-Valme como referencia funcional | Extraer únicamente semántica clínica confirmable, longitudinalidad, missingness y oráculos adversariales | No importar 174 columnas ni el XLSX/CSV como modelo canónico |
| Fase 1: saneamiento del donante | Conservado como evidencia de tests; Train-C está publicado en su repo, Train-D es harness+docs local | QA manual de Valme pendiente: no declarar el donante homologado ni bloquear el shaping de Nexus |
| Fase 2: contrato donante PsO (PSO-07) | Usarlo como **evidencia de entrada** del contrato propio Nexus [#728](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/728), sin duplicar autoridades | No elevar escala, umbral ni resultado sin fuente clínica |
| Fase 3: auditoría dirigida de Nexus | No repetirla desde cero: usar auditorías Reuma/FH de Valme como historia y contrastar los seams actuales en Nexus | GitHub actual y código publicado ganan a auditorías de septiembre |
| Fase 4: diseño de Dermatología | Cambiar el centro: módulo nativo en Nexus; **PsO primero**, HS después | HS sigue dentro de la visión del módulo, pero no bloquea PsO ni se simula |
| Formulario de solicitudes | Tratarlo como caso de uso transversal Dermatología→Farmacia con contrato propio [#698](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/698), no como toda la arquitectura del módulo | No copiar la plantilla histórica ni asumir retorno FH |
| Reutilización de Reuma | Reutilizar gramática de journeys, Port/Act, estados seguros y QA | No copiar variables, scores, módulos legacy, fechas por defecto ni persistencia |
| V5 configurable | Aplazada por el Freeze hasta que haya variación real entre PsO, HS y hospitales | No form-builder, paciente universal ni rule engine ahora |

**Matiz de prioridad:** la decisión de producto #501 reconoce HS y PsO como primeras verticales longitudinales; la instrucción humana del 12-11 elige **secuenciar PsO antes de HS**, no eliminar HS ni cambiar el Architecture Freeze. Este ajuste sólo existe como candidato local hasta aprobación/publicación.

## 2. Autoridad arquitectónica e inventario factual de Nexus

- **Plataforma actual:** monolito modular V4; shell Home, módulos con ownership clínico propio y configuración fija de deployment por site. Hospital×módulo requiere qualification. La shell no transporta paciente, CIP, workbook ni cohorte.
- **Existente:** Home y PlatformContext; module-registry, profile, manifest y readiness; módulos registrados únicamente Farmacia y Reumatología. En [module-registry](../../data/platform/home/module-registry.json) **no existe Dermatología**. «DermaNEXus — Próximamente» es presentación, no ruta usable.
- **Referencias aprovechables:** Read Ports y actos de Reuma; contratos de lectura y facade de Farmacia; Unified Clinical Intake y parser textual D17/D17_EXT_V1 de Dermatología→Farmacia; checks de despliegue/contratos. Son patrones, no objetos clínicos intercambiables.
- **No disponible como capacidad Derma:** paciente compartido, módulo Derma habilitado, retorno de validación FH→Derma, persistencia hospitalaria/Excel Bridge acreditada, autorización clínica por site, form-builder genérico. Cualquier aparición futura de esas capacidades exige revalidar GitHub.
- **Deudas que no copiar:** fallbacks demo de Reuma, fecha ausente→hoy, estados ausentes equiparados a cero, caché clínica lossy, arrays/columnas físicas como contrato, exportaciones de 497 columnas y cualquier acoplamiento directo a storage de otras verticales.

## 3. Primer corte clínico PsO — contrato por aprobar, no lista de campos cerrada

El primer recorrido debe ser coherente dentro de Nexus:

**Home (espacio Dermatología) → contexto de paciente exclusivo del módulo → visita PsO → seguimiento/historia longitudinal → vista individual y poblacional.** La solicitud a Farmacia es una acción separada de ese circuito, con su propia titularidad y contrato; puede entregarse tempranamente tras acordar #698, sin reducir la vertical PsO a un formulario de solicitud.

El contrato [#728](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/728) debe precisar con Dermatología, antes de implementación:

1. **Identidades y contexto:** patient ID con ámbito hospitalario, visit ID estable, servicio/patología, origen y autor del dato; ausencia no crea identidad. Sin paciente universal Nexus.
2. **Actos y cronología:** primera visita, seguimiento y evento explícito; fecha clínica separada de captura/importación; ninguna visita futura sirve de antecedente; tipo de visita no se deduce por mera ausencia de registros.
3. **Variables de PsO:** PASI, DLQI, PURE-4, localizaciones/zonas especiales, comorbilidades y otros datos solo si el equipo determina fuente, versión, unidad, completitud y rol. PURE-4 no genera por sí solo diagnóstico ni derivación automática. No heredar HS o Reuma.
4. **Ausencia y cálculos:** no registrado ≠ 0 ≠ negativo ≠ no aplica; parcial/incompleto explícito; reglas derivadas solo con fuente clínica versionada. Scores y cortes quedan pendientes de validación profesional.
5. **Terapia y resultado:** separar tratamiento previo, solicitado y vigente documentado; no fabricar START/SWITCH/ADD_ON, validación, dosis, vía, pauta, inducción o respuesta desde nombre del fármaco, catálogo o comparación temporal.
6. **Longitudinalidad:** estado actual por última visita elegible de ese paciente dentro de ventana clínica, antes de aplicar filtros de estado; histórico no resucita un paciente en la cohorte actual. QA con fechas futuras, ausentes, empates y cambios de tratamiento explícitos.
7. **Salida y provenance:** Read DTO/Port propios de Derma, acto de visita/escritura con resultado honesto; exportación/adapters solo cuando estén contratados. «Preparado para transferencia» nunca significa persistido.
8. **Pruebas de aceptación:** dataset totalmente sintético; cambio directo de paciente, empty/partial, 0 verdadero, rechazo de esquema, carga fuera de orden y filtros actuales versus históricos; navegador con interacción soportada y consola. QA de tests ≠ aceptación clínica ni piloto.

La extracción PSO-07 en Valme sigue su propio gate humano; no bloquear la definición estructural del módulo Nexus, pero tampoco presentar sus escalas/resultados como fuente clínica aprobada.

## 4. Frontera Dermatología ↔ Farmacia

- **Productor:** Dermatología emite solicitud identificada, fechada y atribuida; selección clínica de molécula cuando corresponda y detalles terapéuticos solo declarados explícitamente.
- **Transporte existente:** texto D17/D17_EXT_V1 + parser FH; verificar comportamiento publicado antes de congelar nuevo contrato. La plantilla suelta es referencia histórica, no aplicación ni contrato clínico actualizado.
- **Receptor:** Farmacia revisa/importa según sus gates; «solicitado» nunca es «validado». No reescribir estado de la visita Derma por el mero envío de una solicitud.
- **VHB/prebiológico:** pauta vacunal completa y suficiencia/decisión clínica para iniciar son hechos distintos con fuente/autor explícitos ([#729](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/729)); no inferir aptitud para inicio.
- **Retorno FH→Derma:** [#699](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/699) es shaping organizativo/contractual; no asumir mensajería ni sincronización existente.

## 5. Secuencia mínima acordada para el siguiente trabajo real

| Orden | Unidad existente | Entrega / gate | Estado de autoridad hoy |
| --- | --- | --- | --- |
| 1 | [#697 DER-BASE](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/697) | Spec corta de módulo: ruta, responsable, contexto/visita/estado vacío, capability y qualification; sin habilitar Home | OPEN / question, no status:approved |
| 2 | [#728 DER-PSO](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/728) | Contrato PsO específico con fuente clínica, matriz de ausencias y pruebas negativas; insumo PSO-07/Valme condicionado | OPEN / question, no status:approved |
| 3 | [#698 DER-FH](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/698) y [#729 DER-VHB](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/729) | Contrato de solicitud/recepción y seguridad, revisado con Farmacia; independiente de la validación del acto PsO | OPEN / question, no status:approved |
| 4 | WOs técnicas nuevas tras 1–3 | Implementación nativa mínima de PsO: navegación → visita/seguimiento → read/write/longitudinal → dashboard; QA y gating por site | NO CREADAS / requieren diseño y GO |
| 5 | [#727 DER-HS](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/727) | Segunda vertical, tras extraer patrones reales de PsO; HS-Canarias solo fuente para auditoría posterior | DEFERRED por prioridad humana, no cancelado |
| Posterior | [#699 FEEDBACK](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/699), [#730 HAND](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/730) | Contrato bidireccional/eccema según equipos; fuera del primer corte PsO | PENDIENTE_EQUIPO / SHAPING |

**Gate de diseño:** especificación #697 coherente con ADR-002/003 y contrato PsO #728 con fuentes clínicas por decidir. No encadenar implementación solo porque haya issue; ninguna etiqueta status:approved observada. Las WOs de implementación deberán ser atómicas, con base/HEAD, preflight, NO TOCA, reversión, checks, QA, acceptance y política Git.

## 6. Límites operativos y cierre de esta reconciliación

- Este documento **no sustituye** INDEX/WORK_ORDER_STATUS, Architecture Freeze, ADR, contratos de Farmacia, ni decisiones de equipo. Es propuesta verificable de evolución para adjudicación humana; no declara funcionalidad terminada.
- No tocar Farmacia/Reuma, HS, Valme, schema global, backend, Home, deployment, main, secretos, datos reales, PR/merge ni Pages. No añadir hospitalización/roles/identidad institucional ficticios.
- **Verificación del documento:** enlaces locales existentes y consistencia con registry/ADR/issue; no se ejecutan tests de código ni browser porque no cambia runtime. Antes de PR o publicación exigir autorización explícita y estado actual GitHub.
- **Reversión:** conservar rama candidata aislada y, si se descarta, revertir la futura modificación mediante commit autorizado; nunca reset/clean/force-push ni borrar worktree sin GO.
- **Siguiente decisión mínima de Sil:** aceptar o corregir la secuencia #697→#728→#698/#729 con PsO primera, antes de elevarla a autoridad GitHub.
