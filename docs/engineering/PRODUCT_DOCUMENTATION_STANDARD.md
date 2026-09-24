# PROMueve Nexus — Product Documentation & Handover Standard

**Estado:** `ACCEPTED_ENGINEERING_STANDARD`
**Issue / WO:** #382 — `WO-NEXUS-F0.3`
**Base de shaping:** `promueve/nexus-v4` @ `d160f9669dbcbbfd355aa56009b527586b1eaa4e`
**Autoridad relacionada:** [`../INDEX.md`](../INDEX.md) · [Architecture Decision Freeze](../architecture/PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md) · [ADR-001…008](../architecture/adr/) · [CODING_STANDARDS.md](../../CODING_STANDARDS.md)

Esta norma es la única autoridad normativa humana para la documentación de producto e ingeniería de PROMueve Nexus. La skill `promueve-product-documentation` ayuda a aplicarla; no decide arquitectura, clínica ni estado y nunca amplía ni contradice esta norma.

## 1. Propósito y regla rectora

La documentación existe para que una tercera persona pueda localizar, sin depender de ningún chat ni memoria de agente, cómo está construido, desplegado, verificado, operado, diagnosticado y revertido PROMueve.

**Regla rectora: documentar lo publicado y demostrado, no lo imaginado.** Toda afirmación de capacidad debe ser trazable a código publicado, evidencia de verificación o una decisión aceptada. Lo planeado se marca como planeado; lo decidido pero no implementado se marca `CONTRACT_PENDING` o `DEFERRED`; lo que depende de una decisión institucional se marca `SES_DECISION`.

## 2. Autoridad y vigencia

1. La autoridad vigente de cada cambio es el issue/WO/spec aceptado en GitHub live; este estándar ordena cómo se documenta, no qué se decide.
2. El orden de verdad operativo es el fijado por `AGENTS.md` y `docs/INDEX.md` (GitHub live → INDEX → tablero WO → documentos vivos → memoria auxiliar).
3. Un documento vivo debe declarar: estado, fecha, issue/WO de origen y base (rama/SHA cuando sea material).
4. Cuando cambia el estado real del proyecto, se reconcilian `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` y el documento vivo afectado, dentro del alcance o como tarea documental separada.
5. Los documentos históricos se preservan como evidencia; no se reescriben para simular estado actual.

## 3. Estados de madurez obligatorios

Ninguna afirmación sobre capacidad, entorno o entrega puede usar palabras sueltas ("funciona", "está listo", "en producción"). Se usa la taxonomía común:

| Estado | Significado |
| --- | --- |
| `código` | Existe en el repo en la rama de trabajo; no está integrado a la línea canónica. |
| `wired` | Integrado en la línea canónica y conectado a su punto de uso. |
| `visible` | Alcanzable mediante la interacción soportada del producto. |
| `demostrado` | Verificado con evidencia determinista y/o QA de interacción soportada. |
| `demo` | Publicado para evaluación/demonstración con datos sintéticos. |
| `evaluación` | En evaluación sintética u operativa acotada; no acredita piloto. |
| `piloto` | Uso asistencial real acotado; requiere acreditación SES explícita. |
| `producción` | Operación asistencial plena; requiere acreditación SES explícita. |

Estado asistencial vigente del proyecto: **evaluación con datos sintéticos; no piloto ni producción**, salvo que un documento vivo más reciente aceptado lo cambie.

## 4. Arquitectura y módulos

- La arquitectura decidida vive en el Architecture Decision Freeze y los ADR-001…008; los documentos de módulo referencian ADRs, no los duplican.
- Cada módulo (Reuma, Farmacia, plataforma Nexus) se documenta con: propósito, límites de responsabilidad, entradas/salidas, dependencias técnicas y estado de madurez.
- Las fronteras (`CORE / MODULE / SITE / MODULE×SITE`) se declaran cuando el cambio toca composición, navegación o configuración.

## 5. Contratos y datos

- Los contratos de datos/exportación se documentan en `docs/contracts/` y sus schemas ejecutables en `schemas/`; un contrato sin schema, fixture o checker asociado se marca como pendiente.
- Toda_fixture y dataset de prueba es sintético. Queda prohibido introducir datos reales, identificadores de paciente, credenciales o clínicos en repositorio, commits o herramientas externas.
- La ausencia de un dato se documenta como ausente/`unknown`/`pending`; nunca se infiere.

## 6. Deployment y configuración

- La configuración gobernada (registry, profile, manifest, qualification hospital×módulo) se documenta junto a su contracto y verificación determinista.
- Un deployment documentado declara `deploymentId`/`siteId`, módulos cualificados, modo de persistencia demostrado y versión de contrato.
- No se documenta ningún deployment hospitalario real mientras no exista autorización SES explícita.

## 7. Build, release y rollback

- Los gates vigentes (smoke, checkers, suites) se enumeran con su comando reproducible y su clasificación vigente/histórica.
- Un release documentado declara: artefacto, manifest (release ID, code SHA, hashes, versiones de contrato), gates ejecutados y evidencia.
- Todo release documenta su reversión: qué se restaura, desde qué snapshot/rama y qué no se restaura automáticamente.
- Los snapshots congelados (p. ej. `CÁCERES-REVIEW-*`) se documentan como artefactos inmutables con su `source_sha`; no heredan automáticamente cambios posteriores.

## 8. QA y evidencia

- `Tests green` no equivale a QA manual ni a aptitud de demo/piloto; cada nivel se acredita por separado (existe → wired → visible → funciona en interacción soportada → publicado en rama correcta → demo → piloto).
- La evidencia de una WO incluye: checks ejecutados con resultado, candidate SHA, review/lifecycle aplicado y, si procede, QA browser con interacciones soportadas.
- Los negativos plantados (fixtures inválidos que deben fallar) forman parte de la evidencia de un contrato, no un extra opcional.

## 9. Seguridad, privacidad y trust boundaries

- Se documentan los trust boundaries reales: cliente, almacenamiento de sesión, archivos locales, red, identidad.
- No se documentan credenciales ni secretos; se referencia su ubicación gobernada o su ausencia.
- La exposición de datos en logs/URLs se documenta como riesgo cuando exista, con su deuda registrada.

## 10. Dependencias y licencias

- Las dependencias runtime críticas se documentan con versión, origen, licencia y forma de entrega (vendor/local/CDN).
- Las dependencias de tooling se declaran en el manifiesto de paquetes del repo; ninguna dependencia de tooling es requisito del puesto asistencial.

## 11. Troubleshooting y runbooks

- Los procedimientos de diagnóstico (reproducir un fallo, regenerar fixtures, reconstruir un snapshot, verificar un deployment) se documentan como runbooks con comandos exactos y precondiciones.
- Un runbook declara qué NO hace (sin destrucción, sin reset amplio, sin tocar datos reales).

## 12. Deuda y riesgos

- La deuda aceptada se registra en el registro vivo de deuda (`docs/ops/FARMACIA_DEBT_REGISTER.md` o su sucesor) con condición de retirada.
- Los riesgos abiertos (persistencia, identidad, seguridad) se documentan con su estado (`CONTRACT_PENDING`, `SES_DECISION`, `DEFERRED`).

## 13. Ownership y extensiones

- Cada superficie normativa (freeze, ADRs, contratos, snapshots) indica su mantenedor esperado (rol, no persona efímera) y el camino para modificarla (issue/WO nueva).
- Una extensión nueva (módulo, site, contrato) documenta su clase de frontera, su estado de madurez y su evidence de qualification.

## 14. Handover SES y recovery

- El handover a una tercera parte o institución se apoya en: este estándar, `docs/INDEX.md`, el Architecture Freeze, los ADRs, los contratos vigentes, el estado publicado (`docs/ops/WORK_ORDER_STATUS.md`) y los runbooks de release/rollback/recovery.
- El handover declara explícitamente qué NO está acreditado: piloto, producción, identidad/autorización, persistencia longitudinal, interoperabilidad institucional.
- La historia de recovery y las ramas congeladas se describen con su propósito y su condición de no uso para desarrollo nuevo.

## 15. Aplicación

- La skill project-local `promueve-product-documentation` guía la creación y actualización de documentación conforme a esta norma; su contenido es metodológico y no normativo.
- Un cambio material de producto/ingeniería debe evaluar impacto documental (qué documentos vivos cambian) y reconciliarlos en el mismo alcance o en tarea separada.
- Si esta norma entra en conflicto con un documento vivo más restrictivo o una decisión SES, prevalece lo más restrictivo y se registra la discrepancia como deuda documental.
