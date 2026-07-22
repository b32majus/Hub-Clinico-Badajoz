# FH-R05 — Cierre del slice de Seguimiento multilínea

**Fecha:** 2026-07-22  
**Estado:** implementado, demostrado e integrado en la rama preview  
**Repositorio:** `b32majus/Hub-Clinico-Badajoz`  
**Rama publicada de referencia:** `preview/demo-lunes-wo4-20260614`  
**HEAD tras merge:** `8cbe362283a4f14e6a45fc29486e4751e57560bb`  
**PR funcional:** #57  
**Issue funcional:** #58  
**WO:** `WO-FH-MULTITREATMENT-FOLLOWUP-LINES-MVP-01`

---

## 1. Qué queda implementado y demostrado

Seguimiento consume el núcleo canónico multifármaco y trabaja sobre líneas de tratamiento explícitas del paciente.

Queda demostrado mediante checks Node, harness focalizado y Playwright 1.61.1 que:

- se muestran las líneas canónicas del paciente;
- solo las líneas con estado `active` habilitan seguimiento;
- `validated_not_started` e históricas permanecen visibles pero no activas;
- la selección de línea es explícita;
- los borradores quedan aislados por paciente y por línea;
- Morisky, DLQI, EVA, movimiento terapéutico, causalidad, efecto adverso y fármaco sospechoso quedan ligados a la línea seleccionada;
- JARA, CSV y Excel consumen el mismo contexto canónico;
- las exportaciones quedan bloqueadas si no existe una línea activa válida;
- al deseleccionar o cambiar de CIP se limpia el estado ligado a la línea;
- la subpregunta DLQI Q7b se muestra, oculta y restaura de forma aislada por línea;
- la consola y `pageerror` permanecen en cero en el flujo soportado.

## 2. Identidad canónica cerrada

La identidad canónica de una línea de tratamiento en este slice es:

```text
patient_id + line_id
```

`tratamiento_id` puede conservarse como metadato legacy opcional cuando exista, pero:

- no es obligatorio;
- no identifica la línea;
- no se genera para completar ausencias;
- no se usa para seleccionar, persistir, restaurar o exportar;
- nunca puede sobrescribir o contradecir `line_id`.

Tampoco se identifica una línea por nombre de fármaco, principio activo, posición en un array ni primera coincidencia.

## 3. Invariantes clínicas conservadas

- El catálogo identifica; no decide terapia ni estado.
- No se infieren dosis, vía, pauta, presentación, inducción, duración, validación o inicio desde el nombre del fármaco, catálogo o ausencia de datos.
- Tratamiento solicitado no equivale a tratamiento validado.
- `validated_not_started` no equivale a `active`.
- Una línea histórica no se reactiva por selección.
- Seguimiento no crea silenciosamente solicitud, validación, switch o add-on.

## 4. Evidencia

- Commit funcional: `8a23bb27d69d9ef25fb1383dc8dfb94d7eff0c77`.
- Merge commit: `8cbe362283a4f14e6a45fc29486e4751e57560bb`.
- Diff SHA-256 aprobado antes del commit: `967830f802b72576c906baad76212007f02af7e9a62db2ac454f911c8dac2c8b`.
- Node: PASS.
- Playwright 1.61.1: PASS.
- Consola y `pageerror`: 0.
- Catálogo/no inferencia, core, tratamiento common y smoke: PASS.
- `git diff --check`: PASS.

Las líneas `validated_not_started` e histórica se cubrieron mediante harness cuando la UI soportada no permitía fabricar esos estados sin manipulación interna. No se alteraron DOM, storage, `readonly` ni funciones internas para simular éxito.

## 5. Estado real del producto

Este slice:

- existe en código;
- está cableado en Seguimiento;
- es visible e interactuable mediante flujo soportado;
- está integrado en la rama preview;
- sirve para demo del comportamiento multilínea cubierto.

No acredita por sí solo:

- piloto real;
- backend;
- datos reales;
- permisos o autenticación;
- integración corporativa;
- interoperabilidad;
- producción.

## 6. FH-R05 pendiente después de este slice

La siguiente WO funcional separada es:

```text
WO-FH-MULTITREATMENT-FOLLOWUP-START-TRANSITION-MVP-01
```

Debe abordar la transición explícita y trazable:

```text
validated_not_started -> active
```

Siguen fuera de alcance y pendientes de contrato propio:

- switch;
- add-on;
- renovación;
- lifecycle completo;
- persistencia backend.

## 7. Transferencia operativa a otra conversación

Antes de continuar:

1. verificar GitHub y el HEAD vivo de `preview/demo-lunes-wo4-20260614`;
2. leer `docs/INDEX.md`;
3. leer `docs/ops/WORK_ORDER_STATUS.md`;
4. leer este cierre;
5. contrastar después `docs/farmacia_treatment_data_contract.md` y el backlog/auditoría viva vigente.

No usar como verdad ramas, SHA o prioridades recordadas. La fuente de verdad sigue siendo GitHub y la documentación publicada.

## 8. Contexto operativo KairOS

Esta WO se utilizó inicialmente para validar el ciclo real de KairOS/OpenCode y terminó convirtiéndose en trabajo funcional de Farmacia. El resultado debe tratarse como producto publicado en preview, no como simple smoke del arnés.

KairOS v3 queda suficientemente validado para:

- preflight y selección de perfil;
- implementación delegada;
- revisión independiente;
- parada por código repetido;
- reparación humana dirigida;
- QA Playwright;
- revisión directa Cora/Hermes;
- commit, push, PR y merge autorizados.

La optimización posterior de OpenCode/Playwright/tooling debe continuar como línea separada y no mezclarse con FH-R05.
