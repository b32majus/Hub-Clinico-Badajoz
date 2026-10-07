# Work Order Status — Hub Clínico Badajoz / PROMueve Nexus

**Última actualización:** 2026-10-07
**Propósito:** tablero de estado y trazabilidad de work orders ejecutadas
**Mantenedor:** Cora / Hermes PM; actualizar al cambiar el estado real de una WO

---

## Estado publicado actual de PROMueve Nexus

| Elemento | Valor |
| --- | --- |
| Autoridad canónica activa | `promueve/nexus-v4`; activa desde merge PR #381 (2026-09-24) |
| Tip Git canónico actual | `9d060f448c6ea1367b09993f232574ff1abd40a5` — merge PR #582 / #579 Informe de utilización y dosis — Kisqali sobre `c5b29e23a5488b951152051ba5d358d04b480b26`. |
| Harness / Atenea | **CURRENT C-087**: autoridad externa `b32majus/Atenea@ddaf9612da67da42eb9bd2c9c03d652b254cc332`; reconciliación Nexus por PR #562 y autoridad repo-local `PRODUCT_FIDELITY_GATES_V1.md` por PR #564. C-086 queda histórico. Lifecycle/model routing se conserva; C-087 añade pre-execution hardening, child-readable authority transport y telemetría post-run read-only. |
| Último HEAD de producto Nexus verificado | `9d060f448c6ea1367b09993f232574ff1abd40a5` — PR #582 / #579 Informe de utilización y dosis — Kisqali publicado y verificado. Candidate `73e67b941913e56b3014a5c617571c6534258108`; merge tree `0197b66847a8fef510eb4acb5ba2c6ae04431940`. #581/#576 queda en ancestry como publicación previa. |
| Última entrega clínica/contractual | **WO-NEXUS-REUMA-STATS-CSV-FILTERED-COHORT-15 (#537)** publicado por PR #538: candidate `cccffa433eb7896cbd04a717542e73e257cc1821` → merge `05114fcf899a857ca6505c1da7eaef2c82ac6155`. Estadísticas `Exportar CSV` queda cableado al namespace publicado y exporta `currentCohort`, la cohorte de filtros formales; `Buscar en tabla` permanece presentación local y no altera la exportación. Evidencia sintética: oracle 8/8, browser 6/6 con descarga real, full-journey console/pageerror 0, `verify:nexus` PASS, CI PR/post-merge success. **Anterior:** Train 14 / PR #532. |
| Reconciliación de producto viva | **PRE-BADAJOZ acotada**: #501 mantiene dirección y #574 documenta decisiones humanas 2026-10-07 sin cambiar runtime. Home→Farmacia #575 está publicado por PR #580, `Informe trimestral Cosentyx` #576 por PR #581 y `Informe de utilización y dosis — Kisqali` #579 por PR #582. El bloque de informes demo previsto queda publicado; #577 continúa como discovery separado. La entrada al Excel Bridge queda como DISCOVERY #577: decidir routing físico por patología vs entrada común + procesamiento relacional; no reactiva #236. |
| Ledger vivo de estado funcional | [`PROMUEVE_PRODUCT_STATUS_LEDGER.md`](./PROMUEVE_PRODUCT_STATUS_LEDGER.md) reconciliado 2026-10-07: #545 cerrado por PR #571; RAPID3 ya no conserva defecto abierto en §3.2.10. #570 queda como deuda técnica separada. Evaluación sintética; no piloto/producción. |
| Verificación post-merge clínica | PR #538 head `cccffa433eb7896cbd04a717542e73e257cc1821` → merge `05114fcf899a857ca6505c1da7eaef2c82ac6155`; CI PR run `37336670618` y post-merge run `37336957812` `success`; oracle Stats CSV 8/8 y browser 6/6 con descargas reales y full-journey `console.error=0` / `pageerror=0`. Anterior: PR #532 head `21844e52cad03871656833580163b1ae61cc57df` → merge `03f814875b38409a219f40e3602feece06472f33`; CI PR `37266398878` y post-merge `37266501044` `success`. |
| Home sintética | F3.2/F3.3/F3.4 publicadas; PR #552 humanizó entrada y PR #557 cerró fidelidad visual/favicon/lockup. Release F3.4 declara ahora 10 `code.files`. DermaNEXus visible como `Próximamente` es presentación futura, no módulo registrado ni cualificado. |
| Madurez | Evaluación sintética; **no piloto / no producción** |
| Deuda Nexus abierta | D004; subhallazgos restantes D005; #450 (semántica de búsqueda legacy no categorizada) y #570 (polling `customSelect` cada 300 ms) permanecen abiertas/no bloqueantes en [`NEXUS_DEBT_REGISTER.md`](./NEXUS_DEBT_REGISTER.md). #570 está en DISCOVERY y no tiene autoridad de implementación. |
| Siguiente frontera del plan | **Demo 8-oct / Farmacia:** #575 Home→Farmacia, #576 Cosentyx trimestral y #579 Kisqali utilización/dosis ya están cerrados/publicados por PR #580/#581/#582. El bloque demo `Home → Farmacia → Estadísticas → Informes` queda funcionalmente cerrado en evaluación sintética. #576 conserva primera dispensación explícita como ancla de `nuevo inicio`; #579 usa ciclos mensuales observados/evaluables, mantiene dosis independiente de presentación y no inventa regla mid-cycle. #577 queda fuera de la demo como DISCOVERY para decidir si hace falta routing físico por patología o si basta una entrada común con patología explícita y procesamiento relacional. F4.5/F4.6 y Control Plane siguen sin autorización automática. |
| Última publicación clínica | **#537 / PR #538** `MERGED_AND_VERIFIED`, candidate `cccffa433eb7896cbd04a717542e73e257cc1821` → merge `05114fcf899a857ca6505c1da7eaef2c82ac6155`, CI PR `37336670618` + post-merge `37336957812` success; oracle 8/8 + browser 6/6. **Anterior:** #528 + #529/#530/#531 / PR #532. Sigue en evaluación sintética; no piloto/producción. |
| Última publicación de producto | **#579 / PR #582** `MERGED_AND_VERIFIED`: candidate `73e67b941913e56b3014a5c617571c6534258108` → merge `9d060f448c6ea1367b09993f232574ff1abd40a5`; CI run `37684084213` success; auditoría Cora con `verify:nexus` PASS, checker Kisqali 42/42, browser Kisqali PASS, browser Cosentyx PASS y Statistics cutover PASS. Informe demo sintético; no piloto/producción. **Anterior:** #576 / PR #581. |

### Decisiones de producto para demo Farmacia — 2026-10-07

- **#575 Home → Farmacia:** `CLOSED/completed` / **PUBLICADO Y VERIFICADO** por PR #580. Candidate `ed3e00f97cbc34199b4aa56fcbeb05230d1bf92f` → merge `cdb5b6bd65b9cf2190f4b9d5e04ed68c9c584b3f`. El deployment sintético declara Farmacia `QUALIFIED_FOR_SITE / available=true` con evidencia explícita `not a real hospital qualification`; Home navega soportadamente a `farmacia_index.html`. CI verde + browser real; no piloto/producción.
- **#576 Informe trimestral Cosentyx:** `CLOSED/completed` / **PUBLICADO Y VERIFICADO** por PR #581. Candidate `aea59e23185f9f4d5e2d89aaa1877618ee031406` → merge `c5b29e23a5488b951152051ba5d358d04b480b26`; `Informes` queda separado de análisis poblacional, con cuatro categorías calculadas desde hechos sintéticos explícitos, detalle auditable y XLSX real `Resumen` + `Detalle`. `VALIDATED != DISPENSED`; ausencia y desconocido permanecen distintos. No piloto/producción.
- **#579 Informe de utilización y dosis — Kisqali:** `CLOSED/completed` / **PUBLICADO Y VERIFICADO** por PR #582. Candidate `73e67b941913e56b3014a5c617571c6534258108` → merge `9d060f448c6ea1367b09993f232574ff1abd40a5`; un único motor Mensual/Trimestral/Anual/Histórico pondera por ciclos mensuales observados/evaluables, no días; semana de descanso ≠ 0 mg; dosis y presentación permanecen independientes; sólo cambios explícitos de frontera cuentan y mid-cycle queda no evaluable; trazabilidad por paciente/ciclo y XLSX real `Resumen` + `Pacientes` + `Ciclos`. Datos 100% sintéticos; no consumo/dispensación real ni piloto/producción.
- **Ancla temporal:** para `nuevo inicio`, inclusión por **primera dispensación explícita** del tratamiento, nunca por validación. `VALIDATED != DISPENSED`; ausencia de dispensación explícita no se repara por inferencia.
- **V2 reporting:** presets/filtros guardados, reutilizables y compartibles; futura administración declarativa/Control Plane. Fuera de la demo inmediata.
- **#577 Excel Bridge intake:** DISCOVERY separado. En Reuma, routing por patología es sólo una opción si el workbook sigue dividido por patologías; en Farmacia, el Bridge raw→relacional puede eliminar esa necesidad. Comparar ambas alternativas antes de implementar. #236 sigue siendo Processor raw→relacional y **no** se reactiva automáticamente.

### Closeout C-087 — Farmacia visual + Reuma RAPID3 (2026-10-06/07)

- **Farmacia #565 / PR #566:** `CLOSED/completed` / `MERGED` → `0d35134b5cda4dafa8ed8e2bbdba47a82f2dadbb`; `Requiere atención` queda visualmente reconciliado sin cambiar lógica #549/#550.
- **Reuma #541 / PR #567:** `CLOSED/completed` / `MERGED` → `6dfe34a15bfa145076ae7c80fbee6aac3b628923`; filas MDHAQ de Seguimiento APs/AR legibles, `select 0/1/2/3` y cálculo RAPID3 preservados.
- **Reuma #545 / PR #571:** `CLOSED/completed` / `MERGED` → `663df88993365463e42e419067ffdc771c7d0636`; shared collapsible seam re-mide crecimiento/decrecimiento soportado en superficies abiertas, sin auto-open ni polling nuevo. Review C-087 Go/complex Standards+Spec PASS; finding idle-coupling cerrado; CI Fast + Deterministic verde.
- **Deuda #570:** `OPEN / DISCOVERY / no implementation authority`; `modules/customSelect.js` conserva el polling preexistente cada 300 ms. No forma parte de #545 y no es prioridad automática.
- **Madurez:** evaluación sintética con browser QA soportado; no piloto/producción.

### Closeout C-086 — Home + Farmacia (2026-10-06)

- **Farmacia #549 + #550:** `CLOSED/completed`; PR #555 `MERGED` → `705dda234c6975303eb021eeac2c6d98c65058a4`. Pendientes = cola única publicada; Inicio compacto = counts + CTA `Ver pendientes`; Renovaciones/Recogidas son sólo `? + Próxima fase`, sin runtime.
- **Home #551:** `CLOSED/completed`; PR #552 publicó la entrada humana inicial.
- **Home visual #556:** `CLOSED/completed`; PR #557 `MERGED` → `7ad9c48ad26794c4bdbfaaca13e26d9419357f98`; lockup/favicon/tres tarjetas publicados. DermaNEXus `Próximamente` no altera registry/readiness/rutas.
- **Duplicado #548:** `CLOSED/duplicate` respecto de #549.
- **Test debt #558:** `CLOSED/completed`; PR #559 `MERGED` → `6ca3be0a262a537aa4df5fa660a3d50aba7d0faf`; checker pre-#550 retirado, sin cambio runtime.
- **Madurez:** evaluación sintética con QA browser focal; no piloto ni producción.

### WO-NEXUS-BRANDING-VISUAL-SENTINEL-01 (#507) / WO-RECOVERY-NEXUS-BRANDING-508 (#542) — publicado por PR #508

**Alcance:** branding/visual sentinel exclusivamente; cero cambio clínico y cero runtime fuera del branding.

**Base previa y publicación:** base canónica previa `c8989882dcc962714f0f142ae572bf8d00b7aa78` (merge documental PR #540); candidate reconciliado `e43d954713b8153a5978125940d7f383fd2894d0` → merge PR #508 `bc42b876354dbfb7372b94da9e07cf058cf4d973`; candidate y merge comparten tree `c1a5cceef94ff2de6f8a53c3f0b4715436971c0d`. Diff neto de 3 rutas: `index.html`, `favicon.svg`, `assets/branding/farmanexus-app-icon-64.png`.

**Verificación:** CI PR `Nexus deterministic gates` run `37357854344` `success` y post-merge push run `37359679054` `success` (Fast gates + Deterministic suite); QA de navegador 8/8 sobre `nexus_home.html → Reuma → Primera Visita → Seguimiento → Inicio`, con `console.error=0` / `pageerror=0` en los journeys Reuma; el 404 de `/favicon.ico` desde `nexus_home.html` queda caracterizado como deuda preexistente no causada por #508.

**Estado:** #507 y #542 `CLOSED/completed`; PR #508 `MERGED`. #537 / PR #538 sigue siendo la última entrega clínica/contractual; #541/RAPID3 queda separado; no es rebranding final. **Madurez:** evaluación sintética, no piloto/producción.

### WO-DOC-NEXUS-PRODUCT-RECONCILIATION-20261003 (#501) — reconciliación documental pre-Badajoz

**Alcance:** documentación/product shaping exclusivamente; cero runtime clínico.

**Base verificada al iniciar:** `promueve/nexus-v4` @ `50b48b41d61d94752f5b10edb04b2e5fb1898f08`.

**Rutas:** `docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`.

**Decisiones reconciliadas principales:**

- Farmacia Inicio se orienta a paciente + trabajo pendiente; `Actividad del servicio` evoluciona conceptualmente a `Pendientes`.
- `PENDIENTE_RECOGIDA` no equivale a adherencia y sólo se resuelve mediante dispensación registrada; ventana/frecuencia siguen abiertas.
- entrada manual vs estructurada no tiene valor clínico visible salvo dependencia técnica demostrada.
- Export V2 permanece visible como explicación de interoperabilidad futura, no como persistencia automática.
- Primera Visita puede ser punto inicial de incorporación al Hub; `inducción solicitada ≠ inducción validada`.
- tratamiento preexistente se incorpora como baseline sin fabricar START/SWITCH/ADD_ON retrospectivos.
- caso add-on con nueva dispensación queda `PENDIENTE_EQUIPO` para resolver su circuito operacional.
- en FH, selección explícita de medicamento/presentación CIMA + contexto/indicación explícitos puede proponer datos de ficha técnica aplicables y editables; no sobrescribir ajustes profesionales.
- en solicitud clínica de moléculas con biosimilar, se pide principio activo/molécula; Farmacia selecciona después marca/presentación concreta.
- Dermatología pasa a módulo real candidato de Nexus; primera profundidad solicitudes a Farmacia; HS/PsO primeras verticales longitudinales previstas.
- HBV separa `pauta vacunal completa` de `condición suficiente para iniciar`; la segunda dosis puede ser condición suficiente en el circuito acordado sin falsear pauta completa.
- eccema de manos queda `AWAIT_TEAM_INPUT` y no se diseña por analogía.
- Badajoz/Mérida deben evolucionar como módulo común + diferencias explícitas por deployment; no forks.
- no se aprueban ahora form-builder universal, rule engine genérico, Control Plane mutable ni V5 hiperconfigurable.
- Reumatología requiere ledger `RESUELTO / PENDIENTE / SUPERSEDIDO / REVALIDAR` contra Nexus antes de pedir nueva revisión manual completa.

**NO TOCA:** runtime HTML/JS/CSS; CIMA tooling; Excel/bridge/adapters; F4.5/F4.6; #446/hold; #448/#450; ADRs/Architecture Freeze; `main`; recovery; snapshots; Pages/deploy; datos reales; implementation backlog de eccema de manos; qualification Atenea.

**Estado de publicación:** issue #501 `status:approved`; PR #503 es la publicación documental. La operadora autorizó commit/push/PR y merge si diff/checks permanecen correctos.

### WO-DOC-NEXUS-LIVE-PRODUCT-LEDGER-20261003 (#504) — PR #506 · reconciliación final

**Alcance:** documentación exclusivamente; cero runtime, cero QA navegador.

**Base verificada al iniciar:** rama `docs/nexus-live-product-ledger-504-20261003` @ `657c74aa106c8141b958571a3ebc36cd6699f333` (PR #506 abierto); autoridad canónica `promueve/nexus-v4` @ `a357be8510f4b81ecc077f518bd197ade940270e` (verificada tras `git fetch`). Rama actualizada con **merge normal no destructivo** de `origin/promueve/nexus-v4` (sin rebase, force-push, reset ni rewrite).

**Rutas (las 4 autorizadas por #504):** `docs/ops/PROMUEVE_PRODUCT_STATUS_LEDGER.md`, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`, `docs/ops/NEXUS_DEBT_REGISTER.md`.

**Contenido reconciliado:**

- adjudicación manual Reuma 2026-10-04 (#504) clasificada como `IMPLEMENTADO/VALIDADO_MANUAL`, `DEFECTO_REPRODUCIDO`, `REQUISITO_DECIDIDO_PENDIENTE`, `PENDIENTE_FUENTE/EQUIPO`, `DEFERIDO` y deuda conocida, sin confundir código existente con QA visible;
- **no** se abre defecto de autocomplete/catálogo Reuma: la interacción soportada fue validada manualmente y respeta `Sistémicos / FAMEs / Biológicos`;
- renovaciones: N0 reflejado **únicamente como contrato publicado/verificado** (#509 → PR #510, merge `aa6401af8ad636dd9d19baad9dcf80876ac780df`; reconciliación PR #511); **N1/N2/N3 pendientes**;
- `OCT-OPEN-010..013` y `REN-OPEN-001..008` preservados como no resueltos; LES/Sjögren `PENDIENTE_EQUIPO`; BASFI `PENDIENTE_FUENTE`; QR/PROM y fixture longitudinal `DEFERIDO`;
- #448/#450 mantenidos como deuda no bloqueante; legacy 497 como compatibilidad contenida, no end-state;
- cruce Reuma/Farmacia/Dermatología sólo a nivel de estado/prioridad documental.

**NO TOCA:** runtime HTML/JS/CSS; schemas/fixtures/checkers de renovaciones; F4.5/F4.6; CIMA; Processor/Bridge; branding #507/#508; `main`; recovery histórica; snapshots/Pages/deploy; datos reales.

**Estado:** **PUBLICADO Y VERIFICADO** por PR #506, candidate `ca0df6735941688d78a02d577cf3956888e1a327` → merge `b90eef501f958109fc330fe98f659f9698011250`; issue #504 `CLOSED/completed`. Documentación-only; `git diff --check`/checks del candidate PASS; sin QA navegador por no modificar runtime.

### WO-SHAPE-NEXUS-RENEWALS-N0 (#446) — shaping N0 RECHAZADO en revisión humana; recuperación bajo #509

**Alcance:** shaping/contrato exclusivamente; cero runtime clínico.

**Base verificada:** `promueve/nexus-v4` @ `fca8b7d9fc5f73a84599b8c36999cb73e2351fa6` (merge PR #503).

**Rutas:** `docs/contracts/FARMACIA_RENEWAL_HANDOFF_CONTRACT.md`, `schemas/renewal/` (2 schemas + máquina de estados), `tools/fixtures/renewal/`, `tools/renewal_handoff_contract_check.mjs`, `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`.

**Historial del candidato rechazado:** commit del contrato `61cb081b3ab025127c276c9610c47f6b80beea02`, registro de estado `f9aaf5f`, y candidato de corrección 2 `d829939cb3622227a7f0810c8d6a5e6944765dbc` (rama local `work/nexus-renewals-n0-446-20261004`). El candidato `d829939` fue **RECHAZADO por el HUMAN SHAPING REFREEZE (#446, 2026-10-04)**. La evidencia previa de cierre `70 OK / 0 FAIL` queda **explícitamente invalidada**: era un falso verde con contradicciones de contrato (jerarquía de precedencia de fechas no validada, código de error muerto `SERVICE_CHANGE_REQUIRES_FH_ACT`, precedencia de lote prosa≠código, derivación de duración no exigida, incoherencia de `suspended`, y un checker incapaz de fallar cerrado ante excepción).

**Recuperación:** `WO-RECOVERY-NEXUS-RENEWALS-N0-REFREEZE-20261004` (#509), rama `recovery/nexus-renewals-n0-refreeze-509-20261004` desde `d829939` (checkpoint preservado); ver el bloque dedicado siguiente.

**NO TOCA:** runtime HTML/JS/CSS; scheduler/Actions; CIMA; Reuma; Dermatología; F4.4/F4.5; `main`, recovery, snapshots, Pages/deploy; datos reales.

**Estado de publicación:** el candidato `d829939` **no se publica**. La recuperación #509 sí quedó **PUBLICADA Y VERIFICADA** por PR #510: candidate `54ab2c5eced637774ac5d65e32e3bb340e204d94` → merge `aa6401af8ad636dd9d19baad9dcf80876ac780df`; CI PR run `37198098263` y post-merge run `37198170542` `success`.

### WO-RECOVERY-NEXUS-RENEWALS-N0-REFREEZE-20261004 (#509) — MERGED_AND_VERIFIED · PR #510

**Objetivo:** recuperar y refreezar el contrato N0 de renovaciones FH↔Enfermería del candidato rechazado `d829939cb3622227a7f0810c8d6a5e6944765dbc` desde la semántica ya congelada por el HUMAN SHAPING REFREEZE (#446) y #509, sin inventar producto y sin tercera ronda de corrección.

**Base y publicación:** recovery `recovery/nexus-renewals-n0-refreeze-509-20261004` desde `d829939` (candidato RECHAZADO, checkpoint preservado) sobre `promueve/nexus-v4` @ `fca8b7d9fc5f73a84599b8c36999cb73e2351fa6`; candidate final `54ab2c5eced637774ac5d65e32e3bb340e204d94` → PR #510 → merge `aa6401af8ad636dd9d19baad9dcf80876ac780df`.

**Rutas:** `docs/contracts/FARMACIA_RENEWAL_HANDOFF_CONTRACT.md`, `schemas/renewal/**`, `tools/fixtures/renewal/**`, `tools/renewal_handoff_contract_check.mjs`, `docs/ops/audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md` (solo 4 filas `OCT-OPEN` en §8), `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md`.

**Clasificación KEEP/SIMPLIFY/DELETE:** KEEP identidad por línea/ciclo, modelo cerrado de `valid_until`, semántica de ventana, calendario fail-closed, Excel como adapter, synthetic-only; SIMPLIFY lifecycle a 6 tokens españoles, retorno a 3 tokens, orden de lote único, idempotencia de última operación; DELETE jerarquía `DATE_SOURCE_PRECEDENCE`/`DATE_SOURCE_CONFLICT` (`OCT-OPEN-013`), `SERVICE_CHANGE_REQUIRES_FH_ACT`, `lifecycle_state`/`requested_at`/`comment` del envelope de ida, estados `CANCELLED`/`NOT_APPLICABLE`.

**Incógnitas preservadas:** `OCT-OPEN-010..013` (§8 de la reconciliación) + `REN-OPEN-001..008`, todas `PENDIENTE_EQUIPO`/`CONTRACT_PENDING`.

**Verificación (real, HEAD final):** `node tools/renewal_handoff_contract_check.mjs` → **53 OK / 0 FALLIDO** (exit 0); `node tools/renewal_handoff_contract_check.mjs --probe-exception-fail-closed` → **FAIL + exit 1**; `npm run check:renewal:contract` PASS; `npm run verify:nexus` PASS; `git diff --check` PASS.

**Linaje del candidate publicado:** Commit A (artefacto: contrato + schemas + fixtures + checker) `ee34bd56124d02b53dd1632331ad3094259ae23d`; Commit B (reconciliación documental) `5e336221301c69fd3c5fd0ce6d9eea502265a99a`; corrección 1 `546fd57e879f3f88dbf20bb75430bdad88307c48`; corrección 2 `8e82fa6024377e678a1aeddcc48a9adf0977f7af`; bookkeeping final `54ab2c5eced637774ac5d65e32e3bb340e204d94`; merge PR #510 `aa6401af8ad636dd9d19baad9dcf80876ac780df`.

**Revisión (C-084):** Standards (Luna) + Spec (Sol) ronda 1 sobre `5e33622` → `CHANGES_REQUIRED` con 3 hallazgos materiales (conjunto de terminales no aserto de forma independiente; postcondiciones de cierre de renovación §6 del refreeze ausentes; regla de nuevo `renewal_id` por corrección no autorizada). Corrección 1 finding-scoped `546fd57` los cierra sin abrir alcance. Ronda 2 de confirmación → **Standards `APPROVED` (0 hallazgos) + Spec `APPROVED` (0 hallazgos)**. Corrección 2 (auditoría Cora sobre `4bfd393`, 4 hallazgos: prosa §9 del gate de duplicados alineada con el código + evidencia anti-regresión con filas sin `renewal_id`; política de columnas desconocidas N2 diferida a `REN-OPEN-007`; idempotencia de-normativizada a requisitos de comportamiento, modelo de última operación del arnés marcado como mecánica de test; trazabilidad del finding 6 corregida) → `8e82fa6`. Ronda 3 de confirmación → **Standards `APPROVED` (0) + Spec `APPROVED` (0)**, sin regresiones. Correcciones usadas: **2 de 2** (presupuesto de #509 agotado). Verificación tras corrección 2: checker `53 OK / 0 FALLIDO` (exit 0), sonda `--probe-exception-fail-closed` FAIL + exit 1, `npm run verify:nexus` PASS, `git diff --check` PASS.

**Publicación:** **MERGED_AND_VERIFIED** por PR #510; CI PR run `37198098263` `success`; CI post-merge run `37198170542` `success`. Sin runtime; datos exclusivamente sintéticos; no declara piloto ni producción.

### TRAIN-NEXUS-CLINICAL-STRANGLER-05 (#426) — publicado por PR #430

| Ticket | Alcance | Commits publicados | Evidencia principal |
| --- | --- | --- | --- |
| T1 #427 | F4.1 contrato read DTO V2 de Farmacia | `a0dad4a` | contrato V2 22/22 y verificador independiente sobre el commit exacto |
| T2 #428 | F4.2 facade async + vertical Inicio/Quick View | `06fcba2`, `6ce61fa`, `f572ca7`, `36bfcaa` | selectores 92, facade 18, commit explícito 10, cutover 17, session 17, data port 11, QA Chromium de ambos verticales, verificadores independientes |
| T3 #429 | F5.1 Read Port async de Reuma + vertical búsqueda/historia | `a469ad1`, `966db97`, `ea34105` | puerto Reuma 13/13 con batería de mutaciones, harness Reuma 10/0, acceptance 7/0, QA Chromium del vertical, verificadores independientes |

Publicación: PR #430, candidate `988c2089d1dfa34d5bd1d74b606b410e6e79903c` → merge `10422f4e5b7578dbbb17af17e3b953b5501eb4b2`; merge tree `c0615cb301471808e8505e8bd04a078303bb420b` idéntico al candidate. Madurez: `wired` + `visible` + `demostrado` en `promueve/nexus-v4`; evaluación sintética, no `demo` acreditada por este train, no piloto ni producción. `gentle_review assess` devolvió `risk=unassessable` (#4791) en todas las unidades y se obedeció la ruta fail-closed sin fabricar revisión nativa. Rollover: T1→T2 ratio real 0,2419 (objetivo <0,25 cumplido); T2→T3 ratio 0,2520 (objetivo económico no cumplido), sin promover configuración de routing.

### TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06 (#442) — publicado por PR #449

| Ticket | Alcance | Commit publicado | Evidencia principal |
| --- | --- | --- | --- |
| T1 #443 | PCR/unidades explícitas y conversión fail-closed por calculadora | `636f838844d9304a8b2b2acb3e57394a680aeec7` | oracle PCR 27/0; Chromium 32/0; dato/unidad fuente preservados; sin inferencia por magnitud |
| T2 #444 | Autocomplete Reuma sobre catálogo farmacológico publicado | `fc598166396e747d4b87e78219a47436694f2395` | oracle catálogo congelado 15/0; selección identity-only, sin escritura terapéutica lateral |
| T3 #445 | Prebiológico reducido a Analítica / Medicina Preventiva | `4eeaf1ffdef8dae94d8a903f8d32619e9a31c041` | oracle 16/0; Chromium 33/0; tres estados explícitos por bloque, sin APTO global inferido |
| T2b #447 | Preservar `Sistémicos / FAMEs / Biológicos` con clasificación explícita/versionada | `6b8582a158bdcd6f8e7e425e0e83bc6eb27ca952` | categoría 33/0; Chromium catálogo/categorías 46/0; ausencia/categoría inválida fail-closed |

Publicación: PR #449, candidate final `6b8582a158bdcd6f8e7e425e0e83bc6eb27ca952` → merge de producto `25e57b250ec3d7cc0fc80a501fa308a40620f902`; candidate y merge comparten tree `f8faba3ad0b485f21d27cd14244b37522cc40054`. `npm run verify:nexus` PASS; CI pre-merge `36482893829` success y post-merge `36483698667` success. #442/#443/#444/#445/#447 quedaron CLOSED/completed. Deuda no bloqueante preservada: #448 y #450. Madurez: implementado/cableado/visible y demostrado en navegador con fixtures sintéticos; **no piloto ni producción**. Auditoría/shaping histórico: [`audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md`](./audits/PROMUEVE_PRODUCT_REVIEW_SIL_20260928.md). La reconciliación viva posterior es [`audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md`](./audits/PROMUEVE_PRODUCT_RECONCILIATION_20261003.md).

### TRAIN-NEXUS-REUMA-FOUNDATION-07 (#454) — publicado por PR #459

| Ticket | Alcance | Commit publicado | Evidencia principal |
| --- | --- | --- | --- |
| T1 #455 | F5.2 — migrar lecturas de paciente/historia de Seguimiento detrás del Reuma Read Port | `a5d62953a6c41a5fbd05a749dc498cb4f8d33908` | checks de migración y browser de Seguimiento publicados con el commit (`tools/reuma_seguimiento_read_*`) |
| T2 #456 | F5.2 — migrar lecturas de población de Estadísticas detrás de un seam de lectura Reuma explícito | `07d6caee7d337a1c0fe12019c64821b1c51cbcb1` | seam `scripts/reuma_population_read_port.js` + checks de seam y browser de Estadísticas (`tools/reuma_estadisticas_read_*`) |
| T3 #457 | F5.3 — encapsular el writer legacy de 497 columnas tras una frontera de compatibilidad fail-closed | `52cca14a66e1a848b491b8d584d1197d96f3d0c2` | frontera `modules/reuma_export_boundary.js` + checks de boundary y browser (`tools/reuma_export_boundary_*`); salida exacta protegida, `KNOWN_LEGACY` preservado sin corrección semántica |

Publicación: PR #459, candidate final `52cca14a66e1a848b491b8d584d1197d96f3d0c2` → merge de producto `3c929f8a95c588fdf9db13c593e1f8462bc561a1`; candidate y merge comparten tree `cc1d5e99aa568024cef17768732e7d2507e3abf8`. `npm run verify:nexus` y `git diff --check` PASS en la publicación (#458); CI post-merge `Nexus deterministic gates` run `36625029994` success. #454/#455/#456/#457/#458 quedaron CLOSED/completed. La desviación de routing de T3 quedó aceptada por la operadora como no bloqueante; provenance del lifecycle Atenea del train: C-078/C-079 (CURRENT para operaciones nuevas: C-080). Tras el merge, el tip Git avanzó a `f49ad6ec...` por dos commits administrativos (alta/baja de un `__noop__`) sin cambio neto de árbol. **F5.4 fue publicada después por TRAIN-NEXUS-REUMA-ACT-CONTRACT-08 (#461 / PR #467); ver bloque siguiente.** Madurez: evaluación con datos sintéticos; **no piloto ni producción**.

### TRAIN-NEXUS-REUMA-ACT-CONTRACT-08 (#461) — publicado por PR #467

| Ticket | Alcance | Commits publicados | Evidencia principal |
| --- | --- | --- | --- |
| T1 #462 | F5.4A — contrato Reuma Visit Act v1, independiente del legacy 497 | implementación `c2858cf5554261d1bb7e003f1d26287775bbc487`; oráculo congelado `39d276491752df0de2f507c60a7fa571be5a8ee1` | oráculo de aceptación principal 106/0 |
| T2 #463 | F5.4B — adapter Reuma Visit Act v1 → legacy 497 a través de la frontera F5.3 | implementación `283074453515092ea800258d5362958b153c307f`; oráculo congelado `20940f08b4480ad299cc09695e0d2d8853f5f763` | oráculo 51/0; 10 journeys byte-equivalentes |
| T3 #464 | F5.4C — cutover soportado de los journeys de exportación de Primera Visita y Seguimiento al Visit Act v1 | implementación `773ee93694f64626dfb1007a069da018a7023a96`; oráculo congelado `212bc32a16991fb3a2f0b025e74a1645ac3cfb54` | oráculo 58/0 + QA browser 23/23 |

Publicación: PR #467, candidate final `773ee93694f64626dfb1007a069da018a7023a96` → merge de producto `e64b65db29e6536c01e4f41e182fb157ac19ce2a` (padres `9f1f7179e7927a7d219fef51aeabceec7c92c135` + `773ee936...`); candidate y merge comparten tree `ec42a55b9c374b3987c7a44bf5ca80da9167d67d`. CI del candidate `Nexus deterministic gates` run `36645555852` `success`; run post-merge `36645661418` `success`. Evidencia preservada: frontera F5.3 32/0; export harness 9/0; acceptance 15/0; 3 `CHAR` / 1 `DRIFT` report-only sin corrección semántica; `KNOWN_LEGACY` y deuda `pendingRows`/`createdAt` no corregidas se conservan sin cambio. Gentle C-080: 3/3 reviews nativas terminales approved + burned, 0 fallos de reviewer. #461/#462/#463/#464 quedaron CLOSED/completed. Con esta publicación **F5.1–F5.4 = PUBLISHED**; **F6/F7 permanecen PENDIENTES** según el Foundation Plan. Madurez: evaluación con datos sintéticos; **no piloto ni producción**. Esta publicación no cierra #446/renovaciones, Reuma→Farmacia (`DISCOVERY_FIRST`) ni CIMA; su prioridad relativa posterior queda sometida a #501.

### TRAIN-NEXUS-FARMACIA-READ-MIGRATION-09 (#470) — publicado por PR #474

| Ticket | Alcance | Evidencia principal |
| --- | --- | --- |
| T1 #471 | F4.3A — migrar lecturas de Dashboard Paciente/Longitudinal detrás del facade V2 | oráculo de migración + QA browser soportada (demo, CIP explícito, not-found fail-closed) |
| T2 #472 | F4.3B — migrar lecturas de Validación y Primera Visita detrás del facade V2 | oráculo de migración + QA browser soportada (requested ≠ validated, búsqueda con guard) |
| T3 #473 | F4.3C — migrar lecturas de Seguimiento y Estadísticas detrás del facade/seam V2 | oráculo de migración + QA browser soportada (cohort detrás del seam publicado) |

Publicación: PR #474 `MERGED` → merge `bf0cb3dde91965168effb00d6f119624e43bd764` en `promueve/nexus-v4`. Madurez: evaluación sintética; no piloto ni producción.

### TRAIN-NEXUS-FARMACIA-F4.3-CLOSEOUT-09.1 (#475) — publicado por PR #478

| Ticket | Alcance | Evidencia principal |
| --- | --- | --- |
| T1 #476 | F4.3D — migrar consumidores residuales (Inicio, Actividad del servicio, review de intake) detrás de seams sync publicados | checkers deterministas + browser por superficie; stale init-read race resuelta por `f82bd24` (init tardío nunca reemplaza la búsqueda soportada del usuario) — RESOLVED, sin advisory abierto |
| T2 #477 | F4.3E — cualificar cinco checkers previos en rojo reparando sólo drift de harness | los cinco checkers quedan `HARNESS_DRIFT_FIXED`; no se reescribe su historia como defectos runtime |

Publicación: PR #478 `MERGED` → merge de producto `91262d8007642eaf1d3cbe21e24d20ff369ee19b` (padres `bf0cb3d...` + `f82bd24...`) en `promueve/nexus-v4`. CI post-merge `Nexus deterministic gates` run `36744075965` `success`. Con esta publicación **F4.3 = COMPLETADA/PUBLICADA / PUBLISHED** en la rama canónica. **Checkpoint visual post-F4.3 (#480, TRAIN-NEXUS-F4.3-POSTMERGE-CHECKPOINT-10 #479 / T1):** QA de navegador real con interacciones soportadas sobre `91262d8`; 17 observaciones `PASS` y **1 `PRODUCT_DEFECT_BLOCKING` (PV-001)**: Primera Visita presenta el tratamiento solicitado de un paciente demo pendiente como «validado» e hidrata la captura con él — semántica preexistente del camino legacy coexistence, no introducida por F4.3; estado T1 `HUMAN_STOP_BLOCKER`, follow-up técnico aprobado **#482** (NO ejecutado dentro del train). PV-001 fue posteriormente corregido y publicado por #482 / PR #484 (candidate `75063f25...` → merge `a04a0ace...`, CI post-merge run `36771991874` success); estado actual = `RESOLVED/PUBLISHED`, F4.4 quedó técnicamente desbloqueada y fue publicada después por TRAIN #487 / PR #490 (ver bloque siguiente). Detalle: [`audits/PROMUEVE_NEXUS_POST_F43_VISUAL_CHECKPOINT_20260930.md`](./audits/PROMUEVE_NEXUS_POST_F43_VISUAL_CHECKPOINT_20260930.md). R3-001 (#448) seguía `CONTRACT_COMPLIANT_DEMO_DEBT` en ese checkpoint y quedó cerrada posteriormente por PR #553. Madurez: evaluación con datos sintéticos; no piloto ni producción.

### WO-NEXUS-FARMACIA-PV-001 (#482) — publicado por PR #484

Corrección del `PRODUCT_DEFECT_BLOCKING` PV-001 registrado por el checkpoint visual post-F4.3 (#480, TRAIN #479 T1): `resolvePrimaryRelation` ya no infiere `validado` desde la mera existencia de registro; sólo la evidencia explícita ya soportada (raw `tratamientoValidado`; legacy `estado='validated'`) produce relación validada. `followup` por sí solo y requested-only fallan cerrado y no prehidratan la captura.

Publicación: PR #484 `MERGED` → merge de producto `a04a0ace25012e5f0ac397844165921dccaebcc3` (candidate final `75063f25b5cf3de008ab882392b9387f5fdea9c1`); CI post-merge `Nexus deterministic gates` run `36771991874` `success`. Evidencia: oracle `check:fh:pv001` **40/40**, browser QA final **35/0** con `console.error=0` y `pageerror=0`; `npm run verify:nexus` PASS. #482 quedó CLOSED/completed. Madurez: evaluación con datos sintéticos; no piloto ni producción.

### TRAIN-NEXUS-FARMACIA-ACT-CONTRACT-11 (#487) — publicado por PR #490

F4.4 Pharmacy Act contract como freeze de contrato puro, sin cutover, UI, captura, delivery, persistencia, Pages, deploy ni cambio en `main`.

| Ticket | Alcance | Commit publicado | Evidencia principal |
| --- | --- | --- | --- |
| T1 #488 | F4.4A — contrato común Pharmacy Act v1 independiente de transporte | `98c7aa76b9457f31c17912090e299f0fb62e4c84` | `HubTools.farmaciaActContract.createAct`, `contractVersion = pharmacy-act/v1`; envelope explícito común para Validación/Primera Visita/Seguimiento; fail-closed sin metadata autogenerada ni inferencia clínica; sin dependencia de Excel/TSV/ROW_COLUMNS/SharePoint/SQL ni `commit(event)` público; deep detachment / sin referencias compartidas del caller; oracle de invariantes 243/0 |
| T2 #489 | F4.4B — payloads independientes Validación / Primera Visita / Seguimiento | `b73e1e7e8a219794be8b778d1ae9c4b6d1a5f7bb` | `createValidationAct` `{ request, validation?, transversal?, lines[] }`, `createFirstVisitAct` `{ firstVisit, transversal?, lines[] }`, `createFollowupAct` `{ followup, lines[] }`; solicitado ≠ validado; previo ≠ nuevo; `followup` ≠ validación; cardinalidad/orden de `lines[]` explícitas 0/1/2+ preservada; ausencia preservada sin defaults; oracle de cardinalidad/ausencia/seguridad clínica 145/0 |

Correction candidate `535c65567bc8ca0aef7358f97f99d97520b0ff20`: endureció la trust boundary descubierta en auditoría pre-merge — semántica own-property (`hasOwnProperty`) para metadata requerida/opcional, bloques y `lines` (la cadena de prototipos no otorga autoridad), prototypes custom del caller fail-closed, deep clone sin preservar prototipo controlado por el caller y entradas normales/null-prototype igualmente desacopladas; sólo cambió los dos módulos de contrato y sus oráculos dedicados.

Aseguramiento compuesto Gentle C-080 sobre el delta compuesto `98c7aa76..535c655`: lineage `review-707b45b6c20d35ee`, verdict **APPROVED** (2 WARNING informativos, sin corrección requerida), `review.acknowledge-approved` ejecutado y autoridad **burned**; transporte primario `atenea-review-host`. El recibo histórico fallido `review-c9f7a22a0bb669d7` se conserva como evidencia de incidente y no se usa como autoridad.

Publicación: PR #490 `MERGED` → merge de producto `3bf45760a27630823b61b0d19da8b64aeb060693` (padre base `7e30f5d8...`) en `promueve/nexus-v4`; candidate y merge comparten tree `bc8bc378...`. CI del candidate `Nexus deterministic gates` run `36879118233` y post-merge run `36880209718` `success`. Evidencia final: oracles T1 243/0 y T2 145/0; `npm run verify:nexus` PASS; `git diff --check` PASS; checks Export v2 ejecutados solo como caracterización/paridad read-only; diff limitado a las 5 rutas autorizadas por el train; cero HTML/UI/runtime wiring; cero F4.5/F4.6; #446 y su `TEMPORARY EXECUTION HOLD` intactos. #487/#488/#489 quedaron CLOSED/completed. Con esta publicación **F4.4 = COMPLETADA/PUBLICADA**; **F4.5 (DeliveryResult / adapter semantics) es la siguiente frontera Foundation técnicamente disponible, sin ser prioridad humana automática ni autorización de ejecución**; F4.6, F6 y F7 permanecen pendientes. Madurez: evaluación con datos sintéticos; no piloto ni producción. Esta publicación no cierra #446 (renovaciones, con su `TEMPORARY EXECUTION HOLD` intacto), no altera Reuma→Farmacia (`DISCOVERY_FIRST`) ni la automatización CIMA (separada/diferida); su orden humano queda sujeto a la readjudicación #501.

## Estado publicado actual de Farmacia

| Elemento | Valor |
| --- | --- |
| Línea Farmacia de procedencia | `recovery/farmacia-pr-replay-20260727`; **HISTORICAL** para nuevo desarrollo desde PR #381; conserva trazabilidad Farmacia/snapshots |
| Autoridad canónica de desarrollo F0.2 | `promueve/nexus-v4` **ACTIVE** desde merge PR #381; recovery **HISTORICAL** |
| Tip Git de recovery (volátil) | Consultar GitHub live; verificado 2026-09-24 tras PR #374: `771fb80c5081aa974b86d6a0119ab30059970a25` |
| Último HEAD de producto publicado | `771fb80c5081aa974b86d6a0119ab30059970a25` — merge PR #374 / robustez de resolución de hojas Enfermería v6 |
| HEAD clínico funcional | `e1120ba85817a1807cea8c1e938867ad778921f4` — merge PR #341; source/last-functional de 0.6 |
| Candidate Train C | `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` |
| CI del último HEAD de producto | Farmacia smoke run `35936756453` `success`; Pages build/deployment run `35936755598` `success` sobre `771fb80c5081aa974b86d6a0119ab30059970a25` |
| `origin/main` | `a25cccb8e5a9b90558c462b3e3b96d823f87cb68`; fuera de esta línea |
| Snapshot Cáceres | `CÁCERES-REVIEW-0.6`; issue #345 / PR #346; sigue congelado en source `e1120ba...` y no incorpora automáticamente #363/#370/#374 |
| Source/last-functional snapshot 0.6 | `e1120ba85817a1807cea8c1e938867ad778921f4` según `deployment-manifest.json` |
| Paquete externo | `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`; no refrozen por 0.6 (#345/#346) |
| Estado asistencial | Evaluación con datos sintéticos; no piloto ni producción |
| Documento vivo | [`FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md`](./FARMACIA_RECOVERY_CACERES_REVIEW_STATUS_20260908.md) |
| WO documental vigente | Consultar GitHub live; no se fija una WO “actual” estática en este tablero |

## Architecture Decision Freeze / Foundation — 2026-09-24

| Elemento | Estado |
| --- | --- |
| Issue | #378 — `WO-DOC-PROMUEVE-ARCHITECTURE-DECISION-FREEZE-20260924` |
| Base verificada al iniciar | `recovery/farmacia-pr-replay-20260727` @ `ea8b03a0e6895495dff1ec0b9abb2e368c259443` |
| Alcance | Documentación/arquitectura únicamente; cero runtime |
| Entregables | baseline + review Round 1 + alignment Round 2 + final completeness review + master freeze + ADR-001…008 + Foundation plan |
| Autoridad Git | **sin cambio**; recovery sigue siendo rama publicada hasta WO de transición separada |
| `main` / Cáceres 0.6 | intactos / fuera de alcance |
| Delivery boundary de #378 | rama + commit + push + PR contra recovery; **MERGE NO autorizado** |
| Estado asistencial | sin cambio: sintético/evaluación, no piloto/producción |

El freeze define la dirección de ingeniería futura, no declara implementados los seams ni crea una nueva línea canónica. El cambio efectivo de autoridad Git se ejecutará, si se aprueba, mediante una WO posterior con SHA live, equivalencia inicial y activación explícita.

## Git Canonical Transition F0.2 — 2026-09-24

| Elemento | Estado |
| --- | --- |
| Issue | #380 — `WO-NEXUS-F0.2-GIT-CANONICAL-TRANSITION` (`status:approved`) |
| Base verificada al iniciar | `recovery/farmacia-pr-replay-20260727` @ `a8cec03522017a1f4b68e18b92c944601659c84f` (merge PR #379) |
| Alcance | Transición Git y documentación únicamente; cero runtime/clínica |
| Rama canónica creada | `promueve/nexus-v4` @ `a8cec03522017a1f4b68e18b92c944601659c84f`; nació como **CANDIDATE** y quedó **ACTIVE** al mergearse PR #381 |
| Equivalencia inicial | mismo commit y tree `82e019bbcfb4959c0e31d6a6575edc88363587e3`; diff vacío; 0 commits de diferencia; cero cherry-pick/rewrite |
| Semántica | pre-merge: recovery **ACTIVE** / nexus-v4 **CANDIDATE**; post-merge autorizado: nexus-v4 **ACTIVE** / recovery **HISTORICAL** |
| Entregables | documento de transición + reconciliación INDEX/WOS/ADR-001/train plan/README + estado vivo Farmacia/recovery-Cáceres |
| Autoridad Git | PR #381 `MERGED`: `promueve/nexus-v4` **ACTIVE** / recovery **HISTORICAL** para nuevo desarrollo |
| `main` / Cáceres 0.6 / asistencial | intactos / fuera de alcance |
| Delivery boundary de #380 | rama + commit + push + PR contra `promueve/nexus-v4`; **MERGE NO autorizado** |
| Detalle | [`PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md`](./PROMUEVE_NEXUS_CANONICAL_TRANSITION_20260924.md) |

## TRAIN-NEXUS-V4-ROLLOVER-CANARY-04 — publicación / closeout 2026-09-26

| Elemento | Estado |
| --- | --- |
| Parent / tickets | #419; T1 #420 (`NEXUS-DEBT-012`), T2 #421 (`NEXUS-DEBT-013`) |
| Base del train | `0b78840fc56be92f0366972bbf6787026a8fff91` |
| Candidate final | `133c978a951c6f73a8daf09f0beeab67fa070d53` |
| Publicación | PR #422 `MERGED` → `f46290cd3a368e00427dbe2fb4e5fde00270d6ac` en `promueve/nexus-v4` |
| D012 | RESOLVED/PUBLISHED: evidence pointers browser del release manifest separados por scope y validados fail-closed |
| D013 | RESOLVED/PUBLISHED: `items` array rechazado por el gate antes de emitir validator; hardening 19/0 |
| Verificación candidate | Home 11/0; release 15/0; validator 19/0; `verify:nexus` PASS; doble rebuild byte-idéntico; independent verifier O1–O8 PASS |
| Verificación post-merge | Fast gates + Deterministic suite GitHub Actions `success` sobre `f46290c...` |
| Canary rollover | Continuación automática T1→T2 en la misma sesión: éxito operacional. Target económico `<25% of tokensBefore`: **NO DEMOSTRADO** (estimación 21,54%; first-prompt context `null`; primer contexto fiable end-of-turn 26,77%). |
| Disposición de routing | Evidencia positiva de V4 parent+writer, pero **no** cualifica `native-v4-heavy` canónico ni lo promueve a default |
| Estado asistencial | sin cambio: sintético/evaluación, no piloto/producción |

## Convención operativa de SHAs

- **Tip Git de `recovery`**: se obtiene live de GitHub. Incluye commits de producto, documentación y administración; por tanto puede moverse sin que cambie el producto.
- **Último HEAD de producto publicado**: último commit/merge que cambia producto funcional o snapshot distribuible. Esta es la referencia estable para afirmar qué entrega está publicada.
- **HEAD clínico funcional congelado**: SHA que un snapshot fija en `source_sha` / `last_functional_sha`.
- Un merge `documentation-only` **no** obliga a reconciliar de nuevo los HEADs funcionales. Solo se actualizan si el diff publicado cambia producto/snapshot o si cambia el manifest funcional.
- Incidencia administrativa al iniciar #349: creación accidental de `__noop__` y eliminación inmediata mediante commit normal. Compare `a7428b...→91e0049...` = 2 commits, `files: []`; cero cambio neto de árbol. Detalle completo en #349.

## Última evolución — Unified Clinical Intake A/B/Train C

| Frontera | Autoridad / entrega | Estado real |
| --- | --- | --- |
| Baseline T1–T10 + hardening | #323 / PR #324 → `bff76ff7095fb568948b1bfbc6288df551971add` | Histórico publicado y preservado en la cadena actual |
| Cáceres review 0.5 | #331 / PR #333 → `2ee9c54f310ac8e32d8928b756f007efa0d56b0d` | Snapshot 0.5 publicado desde source `456454172b67a00ea5ba9583f14999a4be5ff0c2`; no espejo automático del recovery posterior |
| A — auto-reveal | #334 / PR #335 → candidate `ad4088c3689b761d695799c86295207653fcab0f`, merge `7b99eda50e9f7b92cf921d0d6e1bd2090ca917f7` | MERGED_AND_VERIFIED; presentación Dermatología/patología, sin prewrite clínico |
| B — D17_EXT_V1 | #336 / PR #337 → candidate `773f66f85081c6d9476599797a289a466adbfed7`, merge `775a8c08c00d3b678838d71b958775bba726009b` | MERGED_AND_VERIFIED; producer→segmenter→parser clínico extendido, backward-compatible y fail-closed |
| Train C parent | #338 | CLOSED/completed; final verifier PASS |
| C1 | #339 → `bbf898bc789840c0b4bc7635636b81d740afe60e` | CLOSED/completed; 39 conceptos clínicos/comorbilidades con proposals/aplicación protegida |
| C2 | #340 → `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` | CLOSED/completed; superficie compartida analítica/vacunación + 7 conceptos seguros |
| Promoción Train C | #342 / PR #341 → `e1120ba85817a1807cea8c1e938867ad778921f4` | MERGED_AND_VERIFIED; #342 CLOSED/completed; smoke post-merge #1019 success |
| Reconciliación documental post Train C | #343 / PR #344 → `79c9fd37f2a631a4316439013e4b0632268cf90a` | MERGED_AND_VERIFIED; #343 CLOSED/completed; smoke #1022 success; documentation-only |
| Promoción Cáceres 0.6 | #345 / PR #346 → candidate `749c82409a415e800500b39018027b189fd6a131`, merge `19d10c9abefb7b25130b4b17e3289d54a17315ee` | MERGED_AND_VERIFIED; #345 CLOSED/completed; smoke #1025 success; Pages #219 success |
| Reconciliación documental post 0.6 | #347 / PR #348 → `a7428b0195435477bfa86e779b63ea95955ed723` | MERGED_AND_VERIFIED; #347 CLOSED/completed; smoke #1028 success; documentation-only |
| Convención HEAD/tip Git | #349 / PR #350 → merge `5150eab2e02ac029aff0cec021b35722725ff318` | MERGED_AND_VERIFIED; #349 CLOSED/completed; taxonomía estable publicada |
| Acceso estratificación SEFH | #362 / PR #363 → merge `6c36ce5d1126b3032937e8e3627b045e1e2ea081` | MERGED_AND_VERIFIED; link SEFH en Primera Visita/Seguimiento; smoke post-merge success |
| Train Enfermería v6 | #364; N1 #365 `6f0cbae`; N2 #366 `7a61421`; N3 #367 `79a1385`; N4 `731211e`; N5 #368 source `4a68006` | COMPLETED_AND_PUBLISHED vía promoción limpia #369 / PR #370 |
| Promoción Enfermería v6 | #369 / PR #370 → candidate `a4b49ca62c90307529a935cbcadcf740af49d345`, merge `e058f0d25a1856ace4a8bec63dfca53584e8a9cb` | MERGED_AND_VERIFIED; smoke #1050 + Pages success; `main`/Cáceres intactos |
| Reconciliación documental + deuda | #371 / PR #372 → merge `92c378b...` | MERGED; registro vivo de deuda creado |
| Reconciliación runtime nativo PROMueve | PR #373 → merge `3aa34825...` | MERGED; AGENTS/CODING_STANDARDS/README/TODO y skills locales alineados con Pi + Gentle nativo |
| Identidad Engram PROMueve | PR #375 → merge `b09bbf72...` | MERGED; identidad canónica de proyecto fijada sin cambiar producto clínico |
| FH-DEBT-002/003 | PR #374 → merge `771fb80c...` | MERGED_AND_VERIFIED; 718/718 deterministas, native review APPROVED/burned, smoke + Pages success |

### Garantías clínicas publicadas

- `REQUESTED_TREATMENT` sigue separado de `VALIDATED_TREATMENT`; pegar/importar nunca valida.
- Ausencia/desmarcado no se convierte en NO y nunca limpia un valor existente.
- Valores existentes requieren reemplazo profesional explícito; reparse/stale-stage conservan sus guards.
- C1 aplica únicamente los 39 mappings cerrados; composites no se trocean.
- C2 aplica únicamente 7 conceptos seguros; `derma_viral_serologies` combinado sigue `NONE/NO_PROPOSAL` y no se reparte a VHB/VHC/VIH.
- No inferencia desde nombre genérico de fármaco, historial o dato ausente. La reconciliación #501 permite **propuestas editables de ficha técnica** en Farmacia sólo tras selección explícita de medicamento/presentación CIMA y contexto explícito cuando proceda; no equivale a validación ni autoriza sobrescritura de ajustes profesionales.
- Intake no crea/selecciona paciente ni escribe tratamiento validado.
- Enfermería v6: matching exclusivamente por `solicitud_id`; `OK FARMACIA` no valida; `validado`/`denegado` terminales solo desde acto FH explícito; misma CIP con IDs distintos no se colapsa.

### Evidencia vigente

- Train C final verifier: oracle final PASS + T10 `14/14 PASS` una sola vez, árbol limpio, cero mutación del verifier.
- Auditoría independiente pre-PR #341 sobre candidate exacto: C1 `147/147`, C2 `134/134`, C2 browser oracle `5/5`, final oracle PASS, IDs DOM duplicados `0`, `git diff --check` PASS.
- PR #341 head smoke #1018 `success`; post-merge recovery smoke #1019 `success`.
- QA manual humana sobre recovery con plantilla D17_EXT_V1 correcta confirmó auto-reveal + hidratación C1/C2.
- Promoción 0.6: builder reproducible, checker 16/16, `BADAJOZ_ZERO`, oracle integrado sobre snapshot PASS, T10 snapshot 14/14, PR #346 head smoke #1024 `success`, post-merge smoke #1025 `success` y Pages #219 `success`.
- PR #370: persistence 57/0, handoff browser 22/0, reconciliación 75/0 + browser 70/0, smoke 49/0; post-merge smoke #1050 success y Pages success; fixtures sintéticos, sin datos reales.
- PR #374: oracle 65/0 + v6 111/0 + Enfermería 95/0 + Validación 109/0 + reconciliación 75/0 + transporte 79/0 + persistencia 57/0 + common 127/0 = 718/718; review `review-bf84091b8c28d96d` APPROVED/burned; post-merge smoke y Pages success; sin cambio UI ni snapshot.
- Todo lo anterior usa fixtures/datos sintéticos; no acredita piloto ni producción.

### Snapshot y paquete

`CÁCERES-REVIEW-0.6` es el snapshot estable vigente y fue promovido explícitamente por #345/#346 desde el HEAD clínico funcional `e1120ba85817a1807cea8c1e938867ad778921f4`. Su publicación no convierte el entorno en piloto/producción. El paquete externo/workbooks permanece en su freeze sintético anterior y no se refreezea por 0.6.

---

## Leyenda

| Símbolo | Estado |
| --- | --- |
| ✅ Merged | Incorporada a la rama base |
| ✅ MERGED_AND_VERIFIED | Fusionada en la rama indicada y verificada en el alcance de su WO; la visibilidad vigente se consulta en el estado publicado superior |
| 📋 Ready for review | Publicada en rama de trabajo y pendiente de revisión/merge |
| 🔄 Superseded | Sustituida funcional o documentalmente por otra WO |
| 🟢 Validated | Validada en una candidata histórica no integrada |
| ✅ Completada | Trabajo finalizado sin merge aplicable |
| 📋 Draft | Borrador no apto para merge |
| ⏸️ Pausada | Detenida hasta decisión humana |
| 🔴 Bloqueada | No puede continuar sin resolver una incidencia |
| ❌ Descartada | No se ejecutará |

> Un merge técnico no demuestra por sí solo corrección funcional. Cuando la QA humana contradice los tests, el tablero refleja la adjudicación funcional real.

---

## Work orders

| WO | Título | Estado | Rama | Merge/Commit | Notas |
| --- | --- | --- | --- | --- | --- |
| **WO-RECOVERY-NEXUS-BRANDING-508 (#542)** | Recovery branding FarmaNEXus visual sentinel (origen #507), publicado por PR #508 | ✅ MERGED_AND_VERIFIED · PR #508 | `work/nexus-branding-508-recovery-542-20261005` (rama head PR `feat/nexus-branding-sentinel-507-20261003`) | candidate `e43d954713b8153a5978125940d7f383fd2894d0` → merge `bc42b876354dbfb7372b94da9e07cf058cf4d973` | Sólo branding/visual sentinel; browser 8/8; CI `37357854344` + `37359679054` success; #507/#542 CLOSED/completed; clínica intacta; evaluación sintética, no piloto/producción. |
| **TRAIN-NEXUS-REUMA-SAFETY-WIRING-12 (#512)** | ASDAS EspA-only + EVA Global→ASDAS + dactilitis EspA + MDA derived/read-only | ✅ MERGED_AND_VERIFIED · publicado junto con #517 por PR #521 | `work/nexus-reuma-safety-wiring-12-512-20261004` | T1 #513 `bdcc553`; T2 #514 `18211bb`; T3 #515 `9f4ee85`; T4 #516 `5d028ca`; continuado por #517 | Candidate #512 terminó HUMAN_STOP correctamente; closeout explícito #517 resolvió los blockers y permitió publicación conjunta. #512–#516 CLOSED/completed. |
| **TRAIN-NEXUS-REUMA-SAFETY-WIRING-12.1 (#517)** | Closeout ASDAS mirror + MDA uncertainty + legacy `mdaCumple` exacto | ✅ MERGED_AND_VERIFIED · PR #521 | `work/nexus-reuma-safety-wiring-12-1-517-20261004` | C1 #518 `b4e75e7`; C2 #519 `5033000`; C3 #520 `8116e7f`; tooling `5ff136a`; correction `1e7b47f` → merge `ee7379d24ef99633d3bede07c64b31a7038558e4` | `verify:nexus` PASS; browser safety+wiring 113/0; Standards+Spec APPROVED; CI PR `37229513878` + post-merge `37229608205` success; #517–#520 CLOSED/completed. |
| **WO-NEXUS-REUMA-PREBIO-MINIMAL-13 (#525)** | Prebiológico Reuma mínimo sin inferencia: Analítica + Medicina Preventiva + Observaciones opcional | ✅ MERGED_AND_VERIFIED · PR #526 | `work/nexus-reuma-prebio-minimal-525-20261004` | oracle `bd648ee`; implementation `59b47c2`; correction `d20e099b7131887e933b734bcb4bb322c8b8f0e9` → merge `1b41724db7f86534880122e0a5263e25206b07ee` | Primer ticket real `Cost policy: go`, `Risk class: complex`; `ATENEA_GO_MODEL_CHECK=PASS`; `verify:nexus` PASS; Chromium 41/0; CI PR `37235279524` + post-merge `37235367636` success; #525 CLOSED/completed; Reuma→Farmacia NO TOCA. |
| **TRAIN-NEXUS-REUMA-PHARMACY-REQUEST-SAFETY-14 (#528)** | Solicitud textual segura Reuma→Farmacia: sólo Analítica + Medicina Preventiva explícitas | ✅ MERGED_AND_VERIFIED · PR #532 | `work/nexus-reuma-pharmacy-request-safety-14-528-20261004` | #529 oracle/source tracing + #530 runtime mínimo + #531 dashboard evidence; final candidate `21844e52cad03871656833580163b1ae61cc57df` → merge `03f814875b38409a219f40e3602feece06472f33` | Oracle 26/0; browser PV+Seguimiento 91/0; Dashboard 46/0; `verify:nexus` PASS; CI PR `37266398878` + post-merge `37266501044` success; Cora integrated audit GO. #528–#531 siguen OPEN administrativamente a fecha de esta reconciliación, sin alterar que el producto está publicado. |
| **WO-OPS-ATENEA-SYNC-20261005 (#533)** | Sync C-084: representation narrowing + affected-surface/shared-seam guardrails | ✅ MERGED_AND_VERIFIED · PR #534 | `ops/atenea-c084-guardrail-sync-533-20261005` | candidate `05c7b2668db1b42d79b5492f1039afbf96c3237b` → merge `5ed5ff8acacfff87252039a8ee3cc29db71385c5` | Harness/gobernanza only; Atenea `79f4a40...`; modelos/routing Go + `opencode.json` sin cambio; CI PR `37267312667` + post-merge `37267416324` success; clinical product changes = 0. #533 sigue OPEN administrativamente a fecha de esta reconciliación. |
| **WO-NEXUS-REUMA-STATS-CSV-FILTERED-COHORT-15 (#537)** | Exportar CSV de Estadísticas desde la cohorte de filtros formales | ✅ MERGED_AND_VERIFIED · PR #538 | `work/nexus-reuma-stats-csv-filtered-cohort-15-537-20261005` | candidate `cccffa433eb7896cbd04a717542e73e257cc1821` → merge `05114fcf899a857ca6505c1da7eaef2c82ac6155` | Root cause: handler apuntaba al namespace raíz inexistente; corrección mínima a `HubTools.export.exportCohortToCSV(currentCohort)`. Oracle 8/8, browser 6/6 con descargas reales, adversarial witnesses `total>filtered`, zero-result non-fallback y search local no autoritativa; CI PR `37336670618` + post-merge `37336957812` success; Cora integrated audit GO. `Buscar en tabla`, toast duplicado y filtro sexo quedan separados. |
| **WO-DOC-NEXUS-LIVE-PRODUCT-LEDGER-20261003 (#504)** | Ledger vivo de estado funcional de Nexus: adjudicación manual Reuma + N0 renovaciones | ✅ MERGED_AND_VERIFIED · PR #506 | `docs/nexus-live-product-ledger-504-20261003` | candidate `ca0df6735941688d78a02d577cf3956888e1a327` → merge `b90eef501f958109fc330fe98f659f9698011250` | Solo documentación; #504 CLOSED/completed. Estado posterior reconciliado por #522 tras publicaciones PR #521/#526. |
| **WO-SHAPE-NEXUS-RENEWALS-N0 (#446)** | N0 shaping: contrato funcional mínimo del circuito de renovaciones FH↔Enfermería (`renewal-handoff/v1`) + schemas + máquina de estados + checker determinista | ✅ Recuperado y **PUBLICADO** bajo #509 · PR #510 | `work/nexus-renewals-n0-446-20261004` → recuperación en `recovery/nexus-renewals-n0-refreeze-509-20261004` (desde `d829939`) | contrato `61cb081b…`, estado `f9aaf5f`, corrección 2 `d829939cb3622227a7f0810c8d6a5e6944765dbc` (**RECHAZADO**); recovery #509 candidate `54ab2c5e` → merge PR #510 `aa6401af` | Solo documentación/contrato; el candidato `d829939` fue rechazado (falso verde `70 OK / 0 FALL` — evidencia invalidada); #509 refrozen y publicado por PR #510: detección≠gestión, flujo MVP de 6 tokens, `RENOVACIÓN_COMUNICADA ≠ ACTUALIZADA_POR_FH` / `SUSPENSIÓN_COMUNICADA ≠ TRATAMIENTO_SUSPENDIDO`, 10 códigos de error, checker fail-closed (`53 OK / 0 FALLIDO`; confirmación Standards+Spec `APPROVED` tras correcciones 2/2, presupuesto agotado; CI PR+post-merge success); `OCT-OPEN-010..013` y `REN-OPEN-001..008` preservados; cero runtime/UI; no ejecuta F4.5; evaluación sintética, no piloto/producción. |
| **TRAIN-NEXUS-FARMACIA-ACT-CONTRACT-11 (#487)** | F4.4 Pharmacy Act v1: contrato común independiente de transporte + payloads independientes Validación/Primera Visita/Seguimiento (sin cutover/UI/delivery/persistencia) | ✅ MERGED_AND_VERIFIED · PR #490 (CI post-merge run `36880209718` success) | `work/nexus-f44-act-contract-487-20260930` | T1 #488 `98c7aa76` (oracle 243/0); T2 #489 `b73e1e7e` (oracle 145/0); correction candidate `535c65567bc8ca0aef7358f97f99d97520b0ff20` (own-property/prototype hardening) → merge de producto `3bf45760a27630823b61b0d19da8b64aeb060693` | Contrato puro: C-080 `review-707b45b6c20d35ee` APPROVED + acknowledged + burned; tree merge = tree candidate `bc8bc378...`; #487/#488/#489 CLOSED/completed; F4.4 COMPLETADA/PUBLICADA; F4.5/F4.6 no ejecutadas; #446 y su hold intactos; evaluación sintética, no piloto/producción. |
| **TRAIN-NEXUS-F4.3-POSTMERGE-CHECKPOINT-10 (#479)** | Checkpoint visual post-F4.3 + reconciliación documental en modo registro honesto del blocker | ✅ T1/T2 COMPLETED · PR #483 (estado Git: consultar live) | `work/nexus-f43-postmerge-checkpoint10-479-20260930` | T1 #480 `eb0e524` (checkpoint `HUMAN_STOP_BLOCKER` por PV-001, follow-up aprobado #482); T2 #481 `835dda2`; PR #483 | Sólo documentación/evidencia: checkpoint #480 + INDEX/WOS/Foundation Plan/auditoría Sil. Cero runtime. Verificación: `verify:nexus` PASS, `git diff --check` PASS. Estado de merge: consultar GitHub live. PV-001 = `RESOLVED/PUBLISHED` por #482 / PR #484. |
| **TRAIN-NEXUS-FOUNDATION-02 (#399)** | Hardening F1.2A/F2.3, PlatformContext F3.1, oracle export Reuma F1.3B, CI F1.2B + correcciones post-Promotion-FAIL | ✅ MERGED_AND_VERIFIED | `work/nexus-foundation-02-399-20260924` | candidate final `bcb94f1b35e693d59a5ba0c305bb0ba03e4fd9f3` → merge `f1bc9ce7f4b3c10508ef9f9d5e13366f3192fe4f` (PR #400); WUs #394 `87de0c0`, #395 `c9b154e`, #398-A `e9e322d`, #398-B `13108b2`, #396-A `0ca2868`, #396-B `cd2451b`, #397 `aa52b60`; corrections #398-C `109b28d`, #396-C `80fdd08`, F3.1-D `4bebeeb`, F3.1-E `4ee94c2` | Promotion Review round 1 FAIL sobre `9e670bf` y round 2 FAIL sobre `858681f`, ambas atendidas; Promotion Review v1 final sobre `bcb94f1` **PASS** (Spec/clinical, Standards/maintainability, Adversarial/safety; 0 blockers). Tree del merge = tree del candidate revisado `5e873df0...`; `npm run verify:nexus` post-merge PASS. `NEXUS-DEBT-006` RESOLVED; findings no bloqueantes preservados como `NEXUS-DEBT-007/008`. Sin browser QA ni declaración de piloto/producción. |
| **WO-NEXUS-F3.2 (#403)** | PROMueve Nexus Home + native-v4-heavy field canary (retry) | ✅ MERGED / estado histórico F3.2; D011 resuelta posteriormente | `work/nexus-home-f3-2-403-v4retry-20260925` | WU-A `172fb2b` (review `review-16e988d40fb1d7a6` APPROVED + burned); WU-B `17f9db6` (review `review-98506c59b732ce1d` APPROVED + burned); candidate `61e6e9c` → merge `e9096e9` (PR #404), tree `c346893...` idéntico | Pre-merge Home 11/11 + nav 11/11 + `verify:nexus` PASS. El fresh checkout post-#404 expuso D011 EOL; D009/D010 quedaron en #405. Todo D009/D010/D011 fue resuelto posteriormente por TRAIN #409 / PR #415. Esta fila conserva la evidencia histórica de F3.2; no acredita por sí sola F3.3/F3.4 ni piloto/producción. Ficha: [`NEXUS_HOME_F3.2.md`](../engineering/NEXUS_HOME_F3.2.md). |
| **WO-NEXUS-HOME-QUALIFICATION-03 (#409)** | Train de cualificación Home: F3.3 browser + F3.4 release sintético + cierre D008/D009/D010/D011 | ✅ MERGED_AND_VERIFIED | `work/nexus-home-qualification-03-409-20260925` | Q1 #410 `74f9963`; Q2 #411 `49deb61`; Q3 #412 `b32ab74`; Q4 #413 `7c73f37`; Q5a #414 `2407532`; Q5b #414 `612bc03`; candidate `9004b443619bc2eb8002165de6261176e27db8e9` → merge `6e6413c4e9cb163f11ee193c24c8f287c9ebdc36` (PR #415), tree `1d6834f59c38bd90e883174a773579cd20c474ee` idéntico | Fresh worktree post-merge: `npm ci` + `npm run verify:nexus` PASS; Home 11/11; nav 11/11; validator hardening 14/0; release 13/0; browser F3.3 8/0 y artefacto F3.4 5/0 en Chromium `151.0.7922.34`; candidate CI run `36150041100` success. Native reviews Q2/Q4/Q5a/Q5b APPROVED+burned; Q3 `review_due=false`. Promotion Review independiente final: PASS, 0 blockers; reviewer real elegido por la operadora `nan/deepseek-v4-flash` high con manifest heredado aún nombrando `openai-codex/gpt-5.6-sol` (desviación de metadata aceptada explícitamente, review no repetida). N2 documental cerrado por #416; N1/N3 preservados como `NEXUS-DEBT-012/013`. Evidencia sintética/determinista/browser-qualified publicada; **no piloto/producción**; Cáceres/legacy intactos. Ficha: [`NEXUS_HOME_F3.4.md`](../engineering/NEXUS_HOME_F3.4.md). |
| **TRAIN-NEXUS-V4-ROLLOVER-CANARY-04 (#419)** | D012/D013 hardening + canary one-touch T1→T2 | ✅ MERGED_AND_VERIFIED (producto) / canary económico no demostrado | `work/nexus-v4-rollover-canary-04-419-20260926` | T1 #420 `9c2b9d6`; T2 #421 `8bad5f9`; docs `133c978`; candidate `133c978a...` → merge `f46290cd...` (PR #422) | D012/D013 publicados; post-merge Fast gates + Deterministic suite success. Rollover automático funcionó en misma sesión; estimación post-compact 21,54%, first-prompt metric no disponible y primer contexto fiable 26,77%; no promover profile/canary. |
| **WO-DOC-NEXUS-POST-419-RECONCILIATION (#423)** | Reconciliar publicación #422, autoridad Nexus y progreso F0–F7 | ✅ MERGED / reconciled | `docs/nexus-postmerge-reconciliation-419-20260926` | candidate `4944373...` → merge `b57d6a48...` (PR #424) | Solo documentación: INDEX/WOS/Foundation plan/debt register + WO. Closeout administrativo bajo el mismo #423; GitHub live resuelve el estado final del issue. No runtime/clínica/main/recovery/snapshots. |
| **TRAIN-NEXUS-CLINICAL-SAFETY-REUMA-06 (#442)** | PCR/unidades → autocomplete farmacológico → prebiológico mínimo + correctiva de categorías | ✅ MERGED_AND_VERIFIED | `work/nexus-reuma-train06-20260928` | #443 `636f838...`; #444 `fc598166...`; #445 `4eeaf1f...`; #447 `6b8582a...`; candidate `6b8582a158bdcd6f8e7e425e0e83bc6eb27ca952` → merge `25e57b250ec3d7cc0fc80a501fa308a40620f902` (PR #449) | Oráculos PCR 27/0, catálogo 15/0, categorías 33/0, prebiológico 16/0; Chromium 32/0 + 46/0 + 33/0; `verify:nexus` PASS; CI post-merge success; #448/#450 estaban abiertas no bloqueantes en ese cierre; #448 quedó cerrada posteriormente por PR #553 y #450 permanece abierta; evaluación sintética, no piloto/producción. |
| **TRAIN-NEXUS-REUMA-ACT-CONTRACT-08 (#461)** | F5.4 acto de escritura Reuma: contrato Visit Act v1 → adapter act→legacy 497 → cutover soportado Primera Visita + Seguimiento | ✅ MERGED_AND_VERIFIED | `work/nexus-reuma-act-contract08-461-20260929` | T1 #462 `c2858cf` (oráculo `39d2764`); T2 #463 `2830744` (oráculo `20940f0`); T3 #464 `773ee93` (oráculo `212bc32`); candidate `773ee93694f64626dfb1007a069da018a7023a96` → merge `e64b65db29e6536c01e4f41e182fb157ac19ce2a` (PR #467) | Oráculos congelados por ticket (106/0, 51/0, 58/0) + browser 23/23; 10 journeys byte-equivalentes; frontera F5.3 32/0, export harness 9/0, acceptance 15/0; 3 CHAR / 1 DRIFT report-only; `KNOWN_LEGACY` y deuda `pendingRows`/`createdAt` sin corregir; CI candidate `36645555852` y post-merge `36645661418` success; tree merge = tree candidate `ec42a55b...`; F5.1–F5.4 PUBLISHED, F6/F7 PENDING; evaluación sintética, no piloto/producción. |
| **TRAIN-NEXUS-REUMA-FOUNDATION-07 (#454)** | F5.2 read migration (Seguimiento + Estadísticas) + F5.3 497 writer compatibility boundary | ✅ MERGED_AND_VERIFIED | `work/nexus-reuma-train07-454-20260928` | T1 #455 `a5d6295`; T2 #456 `07d6cae`; T3 #457 `52cca14`; candidate `52cca14a66e1a848b491b8d584d1197d96f3d0c2` → merge `3c929f8a95c588fdf9db13c593e1f8462bc561a1` (PR #459) | Checks deterministas y browser por ticket; `verify:nexus` + `git diff --check` PASS; CI post-merge run `36625029994` success; tree merge = tree candidate `cc1d5e99...`; desviación de routing T3 aceptada; #458 cerró la publicación; F5.4 publicada después por TRAIN 08 (#461 / PR #467); evaluación sintética, no piloto/producción. |
| **WO-FH-CACERES-REVIEW-0.5 (#331)** | Promoción snapshot Cáceres 0.5 | ✅ Merged | `work/fh-caceres-review-0.5-331-20260907` | candidate `59d7b7e...` → merge `2ee9c54...` (PR #333) | Manifest `CÁCERES-REVIEW-0.5`, source `45645417...`; synthetic/demo only |
| **WO-FH-EORDEN-CONTEXT-AUTO-REVEAL (#334)** | Auto-reveal Dermatología/patología | ✅ Merged | `work/fh-eorden-context-auto-reveal-334-20260907` | `ad4088c...` → `7b99eda...` (PR #335) | Presentation-only; no prewrite de patología |
| **WO-FH-EORDEN-DERMA-EXTENDED-CONTRACT (#336)** | D17_EXT_V1 | ✅ Merged | `work/fh-eorden-derma-extended-contract-336-20260907` | `773f66f...` → `775a8c08...` (PR #337) | Transporte clínico extendido seguro; legacy D17 preservado |
| **TRAIN-FH-EORDEN-CLINICAL-HYDRATION-C (#338)** | Train C C1→C2→verifier | ✅ Completed | `work/fh-eorden-clinical-hydration-train-c-338-20260907` | C1 `bbf898b...`; C2 `e5e52e2...` | Final oracle PASS; T10 14/14 una vez |
| **WO C1 (#339)** | Hidratación clínica patología/comorbilidades | ✅ Completed | Train C | `bbf898bc789840c0b4bc7635636b81d740afe60e` | 39 concepts; D5/D16 + pathology/parent gates |
| **WO C2 (#340)** | Analítica/vacunación compartida + hidratación | ✅ Completed | Train C | `e5e52e2bc8f94805b4771ec40aa19820bb6be02f` | 7 conceptos; serología combinada no-write |
| **WO Train C Promotion (#342)** | Promoción técnica a recovery | ✅ Merged | `work/fh-eorden-clinical-hydration-train-c-338-20260907` | merge `e1120ba85817a1807cea8c1e938867ad778921f4` (PR #341) | Smoke #1019 success; snapshot/package no refrozen |
| **WO-DOC-FH-POST-TRAIN-C (#343)** | Reconciliación documental post Train C | ✅ Merged | `docs/fh-post-train-c-reconciliation-343-20260907` | merge `79c9fd37f2a631a4316439013e4b0632268cf90a` (PR #344) | #343 CLOSED/completed; documentación-only |
| **WO-FH-CACERES-REVIEW-0.6 (#345)** | Promoción snapshot Cáceres 0.6 | ✅ Merged | `work/fh-caceres-review-0.6-345-20260907` | candidate `749c824...` → merge `19d10c9...` (PR #346) | Manifest `CÁCERES-REVIEW-0.6`, source/last-functional `e1120ba8...`; smoke #1025 + Pages #219 success |
| **WO-DOC-FH-POST-CACERES-0.6 (#347)** | Reconciliación documental post 0.6 | ✅ Merged | `docs/fh-post-caceres-0.6-reconciliation-347-20260908` | merge `a7428b0195435477bfa86e779b63ea95955ed723` (PR #348) | #347 CLOSED/completed; smoke #1028 success; documentación-only |
| **WO-DOC-FH-RECOVERY-HEAD-TERMINOLOGY (#349)** | Convención tip Git / HEAD de producto / HEAD clínico | ✅ Merged | `docs/fh-recovery-head-terminology-349-20260908` | merge `5150eab2e02ac029aff0cec021b35722725ff318` (PR #350) | #349 CLOSED/completed; solo documentación |
| **WO-FH-ESTRATIFICACION-SEFH (#362)** | Acceso herramienta estratificación SEFH | ✅ MERGED_AND_VERIFIED | `work/fh-estratificacion-sefh-20260916` | `96028d6...` → merge `6c36ce5...` (PR #363) | Primera Visita/Seguimiento; sin inferencia clínica |
| **TRAIN-FH-ENFERMERIA-V6 (#364)** | Adaptación v6 + identidad/reconciliación | ✅ MERGED_AND_VERIFIED | `work/fh-enfermeria-v6-request-reconciliation-train-20260916` | N1→N5 publicados por PR #370 | Train local preservado como evidencia; promoción limpia separada |
| **N1 (#365)** | Importador Enfermería v6 multihoja + `solicitud_id` | ✅ Completada | Train #364 | `6f0cbae...` | DER/REU/DIG + legacy preservado |
| **N2 (#366)** | Transporte `solicitud_id` a Validación/Excel FH | ✅ Completada | Train #364 | `7a61421...` | Sin fallback por CIP/fármaco; `rechazado` read-alias de `denegado` |
| **N3 (#367)** | Reconciliación Enfermería↔FH por identidad exacta | ✅ Completada | Train #364 | `79a1385...` | Estados fail-closed y same-CIP multi-request independiente |
| **N4** | Handoff Inicio→Validación + hardening identidad | ✅ Completada | Train #364 | `731211e...` | Corrección Cora; allowlist acto FH + coherencia hoja/Servicio |
| **N5 (#368)** | Fail-closed si no puede persistirse importación | ✅ Completada | Train #364 | source `4a68006...` → promotion `a4b49ca...` | Fuente previa preservada en replacement failure; Bridge v2 runtime_memory intacto |
| **PROMOTION (#369)** | Promoción limpia Enfermería v6 | ✅ MERGED_AND_VERIFIED | `review/fh-enfermeria-v6-reconciliation-20260917` | candidate `a4b49ca...` → merge `e058f0d...` (PR #370) | 6 commits limpios; runtime-noise pair excluido; smoke #1050 + Pages success |
| **WO-DOC POST #370 (#371)** | Reconciliación documental + registro vivo de deuda | ✅ Merged | `docs/fh-post-enfermeria-v6-debt-reconciliation-20260917` | merge `92c378b...` (PR #372) | Registro vivo de deuda publicado |
| **PROMUEVE NATIVE WORKFLOW (HISTÓRICO)** | Reconciliación upstream-native del epoch previo | ✅ Merged / HISTORICAL | `docs/promueve-vnext-hygiene-20260924` | merge `3aa34825...` (PR #373) | Evidencia histórica C-077–C-083; Pi/Gentle/RDD/4R/OpenCode V1 y `--pure` ya no gobiernan nuevas ejecuciones; C-084 queda baseline y C-085 es CURRENT |
| **PROMUEVE ENGRAM IDENTITY** | Fijar identidad canónica Engram | ✅ Merged | rama de PR #375 | merge `b09bbf72...` (PR #375) | Gobernanza/memoria; sin cambio clínico |
| **FH-DEBT-002/003** | Resolver split-brain y aliases de hojas Enfermería v6 | ✅ MERGED_AND_VERIFIED | `work/fh-v6-sheet-resolution-native-gentle-20260921` | candidate reconciliado `8f35a296...` → merge `771fb80c...` (PR #374) | 718/718; review `review-bf84091b8c28d96d` APPROVED + burned; `odd/tasks` excluido de la superficie final |
| **TRAIN-NEXUS-BOOTSTRAP-01 (#387)** | Foundation Bootstrap: F0.3 + F1.1 + F2.1 + F2.2 + F1.3A | ✅ MERGED_AND_VERIFIED | `work/nexus-bootstrap-01-387-20260924` | candidate final `38f9660...` → merge `5b47c146...` (PR #388) | 7 work units (#382–#386); gates deterministas PASS; native Gentle lifecycle cerrado; Promotion Review v1 independiente PASS; deuda no bloqueante en #389 |
| **Preflight 1** | SSH GitHub + clonado | ✅ Merged | `feature/reuma-v2-prebiologico-fh-les-sjogren` | — | Preflight manual, sin WO formal |
| **Preflight 2** | Validación post-merge WO-001 | ✅ Merged | `feature/reuma-v2-prebiologico-fh-les-sjogren` | `f7e1083` | Pull `--ff-only` y verificación de gobernanza |
| **WO-001** | Gobernanza ejecutable | ✅ Merged | `work/hermes/wo-001-agent-governance` → `feature/...` | `f5177f7` → `f7e1083` | PR #2 |
| **WO-001b** | Refinar plantilla de reporte | ✅ Merged | `work/hermes/wo-001b-report-template-refinement` | `cf4ed35` | Incluida en PR #2 |
| **WO-002** | Contratos mínimos documentales | ⏸️ Pausada | `work/hermes/wo-002-contratos-minimos` | `fa59106` | Borrador prematuro; no mergear |
| **WO-003** | Inventario técnico Reuma v2 | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `d4172d0` | Integrada vía WO-009b |
| **WO-004** | Mapa de flujos actuales | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `1f61f9d` | Integrada vía WO-009b |
| **WO-005** | Smoke test checklist | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `352fbe1` | Integrada vía WO-009b |
| **WO-006** | Índice documental | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `6e20a2c` | Integrada vía WO-009b |
| **WO-007** | Estado de ramas y decisiones | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `3f40902` | Integrada vía WO-009b |
| **WO-008** | Auditoría de riesgos técnicos | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `6414324` | Integrada vía WO-009b |
| **WO-009** | Reporte de lote nocturno | ✅ Merged | `work/hermes/nightly-green-docs-20260606` | `c9a1276` | Integrada vía WO-009b |
| **WO-009b** | Corrección editorial lote nocturno | ✅ Merged | `work/hermes/wo-009b-correccion-editorial-lote-nocturno` | `16ff810` | Incluye WO-003 a WO-009 |
| **WO-010** | Canvas formularios Enfermería/Farmacia | ✅ Merged | `work/hermes/wo-010-canvas-diseno-formularios` | `194bef0` | Documento de trabajo, no contrato final |
| **WO-011** | Política de modelos y delegación | 🔄 Superseded | `work/hermes/wo-011-model-routing-governance` | `f4a9a33` | Sustituida por WO-012/012b |
| **WO-012** | Governance hygiene | ✅ Merged | `work/hermes/wo-012-governance-hygiene-status` | — | Integrada vía WO-012b |
| **WO-012b** | Refinamiento de gobernanza | ✅ Merged | `work/hermes/wo-012b-status-risk-refinement` | `97f673d` | Incluye WO-012 |
| **WO-013** | Alinear documentación canónica | ✅ Merged | `work/hermes/wo-013-canonical-docs-alignment` | `da39ace` | Integrada vía WO-013b |
| **WO-013b** | Corregir criterios de avance | ✅ Merged | `work/hermes/wo-013b-fix-advancement-criteria` | `1ed2e9b` | Incluye WO-013 |
| **WO-014** | Plan formativo y decisiones por fase | ✅ Merged | `work/hermes/wo-014-learning-decision-protocol` | `bc68cb4` | Integrada vía WO-014b |
| **WO-014b** | Corrección editorial post-WO14 | ✅ Merged | `work/hermes/wo-014b-fix-status-index-formatting` | `f843298` | Incluye WO-014 |
| **WO-015** | Capa temporal multipatología Farmacia | ✅ Merged | `work/hermes/wo-015-documentar-capa-entrada-farmacia` | `d3f785f` | Integrada vía WO-015b |
| **WO-015b** | Corregir frase de arquitectura | ✅ Merged | `work/hermes/wo-015b-fix-arquitectura-frase-perfiles` | `c3bade0` | Incluye WO-015 |
| **WO-016** | Especificación Farmacia v0.1 | ✅ Merged | `work/hermes/wo-016-especificacion-funcional-farmacia-v0-1` | `f5a6397` | Hito histórico de demo |
| **WO-DOC-ROADMAP-POST-SES-01** | Roadmap post-SES | ✅ Merged | `work/hermes/WO-DOC-ROADMAP-POST-SES-01-20260710` | `14e86b29` (PR #9) | Propuesta documental |
| **WO-DOC-ARCHIVE-POST-SES-01** | Archivar documentos obsoletos | ✅ Merged | `work/hermes/WO-DOC-ARCHIVE-POST-SES-01-20260710` | `fa2a4d53` (PR #10) | Solo documentación |
| **WO-DOC-UPDATE-ARCHITECTURE-POST-SES-01** | Alinear arquitectura post-SES | ✅ Merged | `work/hermes/WO-DOC-UPDATE-ARCHITECTURE-POST-SES-01-20260710` | `dc1ce11` (PR #11) | Solo documentación |
| **WO-DOC-DECISION-DISCOVERY-REUMA-FH-POST-SES-01** | No merge Reuma-Farmacia + discovery | ✅ Merged | `work/hermes/WO-DOC-DECISION-DISCOVERY-REUMA-FH-POST-SES-01-20260710` | `bd5687c` (PR #13) | Decisión vigente y revisable |
| **WO-DOC-INDEX-CONTROL-PLANE-POST-SES-01** | Índice + control plane federado | ✅ Merged | `work/hermes/WO-DOC-INDEX-CONTROL-PLANE-POST-SES-01-20260713` | `17f29fa` (PR #14) | La rama HOLD no se mergea |
| **WO-DOC-PROM-CAPTURE-GATEWAY-QR-01** | PROM Gateway QR | ✅ Merged | `work/hermes/WO-DOC-PROM-CAPTURE-GATEWAY-QR-20260714` | `2440924` (PR #16) | Arquitectura exploratoria |
| **WO-DOC-IDENTITY-PLANE-NURSING-READINESS-01** | Identity Plane + Nursing Readiness | ✅ Merged | `work/hermes/WO-DOC-IDENTITY-PLANE-NURSING-READINESS-20260714` | `0a9019b` (PR #17) | Exploratorio; Identity Plane físico diferido el 2026-07-31 |
| **WO-DOC-TREATMENT-LIFECYCLE-ENGINE-01** | Lifecycle y renovaciones | ✅ Merged | `work/hermes/WO-DOC-TREATMENT-LIFECYCLE-ENGINE-20260714` | `b59e09a` (PR #18) | Arquitectura por línea; no implementada |
| **WO-DOC-HOUSEKEEPING-POST-PR17-PR18-01** | Estado post PR #17/#18 | ✅ Merged | `work/hermes/WO-DOC-HOUSEKEEPING-POST-PR17-PR18-20260714` | `84d161d` (PR #19) | Housekeeping |
| **WO-DOC-INGEST-SIL-SCREEN-REVIEW-POST-PR20-01** | Revisión funcional Sil | ✅ Merged | `work/hermes/WO-DOC-INGEST-SIL-SCREEN-REVIEW-POST-PR20-01-20260714` | merge `269627cd...` (PR #21) | Evidencia histórica |
| **WO-DOC-INGEST-FH-TECHNICAL-SCREEN-AUDIT-POST-PR21-01** | Auditoría técnica Farmacia | ✅ Merged | `work/hermes/WO-DOC-INGEST-FH-TECHNICAL-SCREEN-AUDIT-POST-PR21-01-20260715` | merge `7d9bedd6...` (PR #22) | Evidencia histórica |
| **WO-DOC-FH-SCREEN-AUDIT-RECONCILIATION-POST-PR22-01** | Reconciliar auditorías | ✅ Merged | `work/hermes/WO-DOC-FH-SCREEN-AUDIT-RECONCILIATION-POST-PR22-01-20260715` | merge `06b5e2ff...` (PR #23) | No autoriza piloto |
| **WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01** | Cambio seguro de CIP | ✅ Merged | `work/hermes/WO-FH-PATIENT-CONTEXT-SWITCH-GUARD-01-20260715` | merge `48de5909...` (PR #24) | QA acotada |
| **WO-FH-ALTA-GUIADA-CONTEXT-PROPAGATION-01** | Propagar alta guiada | ✅ Merged | `work/hermes/WO-FH-ALTA-GUIADA-CONTEXT-PROPAGATION-01-20260715` | merge `8f7fc562...` (PR #25) | Navegación demo |
| **WO-FH-VALIDACION-FLOW-PREFILL-MINIMAL-01** | Precarga explícita | ✅ Merged | `work/hermes/WO-FH-VALIDACION-FLOW-PREFILL-MINIMAL-01-20260715` | merge `1d8aac74...` (PR #26) | Solicitado separado de validado |
| **WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-MINIMAL-01** | Simplificar Validación | ✅ Merged | `work/hermes/WO-FH-VALIDACION-FUNCTIONAL-CLEANUP-MINIMAL-01-20260715` | merge `58e59b11...` (PR #27) | Limpieza mínima |
| **WO-FH-SEGUIMIENTO-FIRST-SEARCH-CONFIRMATION-FIX-01** | Evitar confirmación falsa | ✅ Merged | `fix/fh-seguimiento-first-search-confirmation-20260715` | merge `84a44bbb...` (PR #29) | Guard de primer contexto |
| **WO-FH-PR57E-DASHBOARD-VISIT-LINE-GROUPING-01** | Dashboard por visita y línea | ✅ Merged | `work/fh-pr57e-dashboard-visit-line-grouping-20260728` | merge `712b413e...` (PR #173, issue #172) | Demo, no persistencia real |
| **WO-FH-DERMA-PATHOLOGY-SPECIFIC-VALIDATION-01** | Dermatología multipatología | ✅ Merged | `work/fh-derma-pathology-validation-20260728` | merge `ce88818b...` (PR #175, issue #174) | Cinco patologías y salidas coherentes |
| **WO-FH-CACERES-PHARMACY-ONLY-DEPLOYMENT-01** | Snapshot Cáceres 0.1 | ✅ Merged | `work/fh-caceres-pharmacy-only-deployment-20260728` | merge `cd258e76...` (PR #177, issue #176) | Histórico; sustituido como snapshot actual por 0.2 |
| **WO-FH-CIMA-CONTEXTLESS-SELECTION-P0-01** | Restaurar CIMA sin contexto de paciente | ✅ Merged | `work/fh-cima-contextless-selection-p0-20260730` | merge `ee1abd88...` (PR #183, issue #182) | QA técnica y navegador PASS |
| **WO-FH-VALIDATION-MANUAL-REQUESTED-CIMA-MINIFIX-01** | Minifix del autocomplete manual | 🔄 Superseded | `work/fh-validation-manual-requested-cima-minifix-20260730` | merge `5e70afa5...` (PR #185, issue #184) | Fusionada, pero FAIL en QA humana pública; sustituida por PR #187 |
| **WO-FH-VALIDATION-MANUAL-REQUESTED-CLONE-WORKING-AUTOCOMPLETE-P0-03** | Clonar autocomplete validado | ✅ Merged | `work/fh-validation-manual-requested-clone-p0-20260730` | merge `54f6bb2c...` (PR #187, issue #186) | Corrección definitiva; QA humana regional PASS |
| **WO-FH-CACERES-REVIEW-02-PROMOTION-01** | Promover Cáceres 0.2 | ✅ Merged | `work/fh-caceres-review-02-promotion-20260730` | merge `accac670...` (PR #189, issue #188) | Snapshot generado; QA humana Cáceres PASS |
| **WO-DOC-FH-V4-VACATION-PLAN-ARCHITECTURE-20260731** | Estado, plan de vacaciones y arquitectura V4 | ✅ Merged | `docs/fh-v4-vacation-plan-architecture-20260731` | merge `9725bf60...` (PR #191, issue #190) | Seis rutas documentales; sin código ni datos reales |
| **WO-FH-CACERES-QUICK-WINS-03-01** | Quick wins de Validación Farmacia | ✅ Merged | `work/fh-caceres-quick-wins-03-01-20260731` | merge `4801e9aa...` (PR #193, issue #192) | En ese merge: CI verde y promoción pendiente; promovida después mediante PR #197 |
| **WO-DOC-FH-CACERES-QUICK-WINS-RECONCILIATION-20260731** | Reconciliar publicación de quick wins | ✅ Merged | `work/doc-fh-caceres-quick-wins-reconciliation-20260731` | merge `815e16f9...` (PR #195, issue #194) | Estado documental y QA reconciliados |
| **WO-FH-CACERES-REVIEW-03-PROMOTION-01** | Promover Cáceres 0.3 | ✅ Merged | `work/fh-caceres-review-03-promotion-20260731` | merge `96a4cb0b...` (PR #197, issue #196) | Snapshot 0.3; fuente funcional `815e16f9...` |
| **WO-FH-SYNTHETIC-EVALUATION-LEDGER-01** | Ledger local de evaluación sintética | ✅ Merged | `work/fh-synthetic-evaluation-ledger-01-20260801` | merge `ac93575d...` (PR #199, issue #198) | Histórico en runtime: módulo aún versionado, pero desacoplado de las tres pantallas por PR #231 |
| **WO-FH-SYNTHETIC-EVALUATION-WORKBOOK-01** | Workbook técnico de evaluación | ✅ Merged | `work/fh-synthetic-evaluation-workbook-01-20260801` | merge `25c75165...` (PR #201, issue #200) | 11 hojas técnicas; artefacto histórico, no workbook operativo definitivo |
| **WO-FH-EVALUATION-FLOW-REALIGN-01** | Realinear persistencia con el flujo asistencial | ✅ Merged | `work/fh-evaluation-flow-realign-01-20260801` | merge `6dcedff4...` (PR #203, issue #202) | Retira cohorte ficticia visible; QA pública PASS; persistencia ledger retirada después por PR #231 |
| **WO-FH-FIRST-VISIT-EXCEL-TRUTH-P0-01** | Verdad del Excel de Primera Visita | ✅ Merged | `work/fh-first-visit-excel-truth-p0-01-20260801` | merge `68b53837...` (PR #205, issue #204) | CIP/acto visible; 61 columnas; QA pública PASS |
| **WO-FH-EXPORT-CONTRACT-V2-RECONCILIATION-01** | Reconciliar contrato export v2 | ✅ Merged | `work/fh-export-contract-v2-reconciliation-01-20260801` | merge `2f54c4ec...` (PR #207, issue #206) | Fila común v2, grano por línea activa y componentes del Bridge documentados |
| **WO-DOC-FH-EXPORT-V2-SEQUENCE-WO1-01** | Secuencia WO1–WO9 y WO1 técnica | ✅ Merged | `work/fh-export-v2-sequence-wo1-docs-20260802` | merge `5e9b59ba...` (PR #209, issue #208) | Siete rutas documentales; no añadió capacidad funcional |
| **WO-FH-EXPORT-V2-CANONICAL-CORE-01** | Núcleo canónico fila v2 | ✅ Merged | `work/fh-export-v2-canonical-core-01-20260802` | commit `7109b5f1...`, merge `6ac041f8...` (PR #211, issue #210) | Estado histórico al merge: 152 columnas candidate y roundtrip TSV, sin salida pública v2; visibilidad añadida después por PR #227 |
| **WO-DOC-FH-EXPORT-V2-CORE-MERGE-RECONCILIATION-01** | Reconciliar publicación de WO1 | ✅ Merged | `work/doc-fh-export-v2-core-merge-reconciliation-01-20260802` | commit `ed1cb13a...`, merge `f46d99a0...` (PR #213, issue #212) | Cinco rutas documentales; reconcilió la publicación del core; superada como estado actual por la reconciliación de adaptadores de 2026-08-03 |
| **WO-FH-EXPORT-V2-VALIDATION-ADAPTER-01** | Adaptador interno de Validación v2 | ✅ MERGED_AND_VERIFIED | `work/fh-export-v2-adapters-stack-01-20260802` | commit `1fcd9e4a...`, merge `17426f60...` (PR #215, issue #214) | Estado histórico al merge: infraestructura interna sin salida pública v2 ni cutover; visibilidad añadida por PR #227 |
| **WO-FH-EXPORT-V2-FIRST-VISIT-ADAPTER-01** | Adaptador interno de Primera Visita v2 | ✅ MERGED_AND_VERIFIED | `work/fh-export-v2-first-visit-adapter-01-20260803` | commit `c42eecef...`, merge `c45b7d13...` (PR #217, issue #216) | Estado histórico al merge: infraestructura interna sin salida pública v2 ni cutover; visibilidad añadida por PR #227 |
| **WO-FH-EXPORT-V2-FOLLOWUP-ACTIVE-LINES-01** | Adaptador interno de Seguimiento v2 por líneas activas | ✅ MERGED_AND_VERIFIED | `work/fh-export-v2-followup-active-lines-01-20260803` | commit `8b7372ac...`, merge `b9f27e96...` (PR #221, issue #220) | Estado histórico al merge: infraestructura interna sin salida pública v2 ni cutover; `activeLines`, guards y QA PASS; visibilidad añadida por PR #227 |
| **WO-FH-EXPORT-V2-FOLLOWUP-DOC-RECONCILIATION-01** | Reconciliar publicación de Seguimiento v2 | ✅ Merged | `work/fh-export-v2-followup-doc-reconciliation-20260804` | commit `b803b4c7...`, merge `dfbbf76b...` (PR #223, issue #222) | Reconciliación documental post-Seguimiento v2; histórica tras PR #227 |
| **WO-FH-EXPORT-V2-TECHNICAL-CONTEXT-01** | Proveedor técnico sintético cerrado | ✅ Merged | `work/fh-export-v2-technical-context-01-20260804` | commit `00e5c8a6...`, merge `e2f2c663...` (PR #225, issue #224) | Registro cerrado a FH-001/FH-004; identidad técnica explícita y separada del CIP; sin storage ni salida pública propia |
| **WO-FH-EXPORT-V2-PARALLEL-ACTIVATION-01** | Activar Export v2 demo en paralelo | ✅ Merged | `work/fh-export-v2-parallel-activation-01-20260804` | commit `fe84d83c...`, merge `f86f72f8...` (PR #227, issue #226) | TSV común de 152 columnas: Validación 1 fila; Primera Visita/Seguimiento `1..N` según líneas explícitas; v1 intacta |
| **WO-FH-EVALUATION-LEDGER-RUNTIME-RETIREMENT-01** | Retirar ledger clínico del runtime soportado | ✅ Merged | `work/fh-evaluation-ledger-runtime-retirement-01-20260804` | commit `b1ee11e0...`, merge `19867ef1...` (PR #231, issue #230) | En aquel merge, tres pantallas sin carga del ledger, sin restauración ni alternativa; superseded después por issue #250 / PR #251 y issue #252 / PR #253 |
| **WO-FH-EXCEL-BRIDGE-WORKBOOK-01** | Workbook operativo Excel Bridge Cáceres | ✅ MERGED_AND_VERIFIED | `work/fh-excel-bridge-workbook-01-20260804` | commit `c286afab...` (PR #233, issue #232) | 18 hojas, 152 columnas, `01_DERMA`/`03_DIGESTIVO`, 16 shells técnicos; QA manual Microsoft Excel y controles negativos PASS; sin Office Script ni `APP_*` |
| **WO-FH-EXCEL-BRIDGE-RAW-READ-MODEL-01** | Lector raw v2 y read model | ✅ MERGED_AND_VERIFIED | `work/fh-excel-bridge-raw-read-model-01-20260805` | commit `7da866b2...`, merge histórico `92c00eb7...` (PR #238, issue #237) | Workbook Bridge, botón `Cargar Excel de Farmacia`, dos hojas raw, 152 columnas, cardinalidad `1..N`; read model solo en memoria; candidate SHA-256 `2b7b2eed0f4310156e701c6357505442f47d13e7492869fcfbc1e9dedf564af4`; QA Node 21 casos, workbook/openpyxl, navegador, legacy, Enfermería y smoke CI PASS |
| **WO-FH-BRIDGE-V2-PATIENT-SELECTORS-QUICK-VIEW-01** | Selectores de paciente y Quick View Bridge v2 | ✅ MERGED_AND_VERIFIED | `work/fh-bridge-v2-patient-selectors-quick-view-01-20260805` | issue #241; PR #242; commits `3da3d450890508e7ee11ea7b801ad37ba4052cf5` + `94cd44688b82aea0a10e4778e3182ab300bd6be0`; merge `e2c54583ccc5876058403c34a675496cab897972` | Búsqueda por sistema + valor explícitos, `patient_id` técnico, Quick View visible dentro de `farmacia_index.html`, sin fallback demo ni alta guiada con Bridge activo; selector checker 82 casos, reader checker 21, smoke 48, Actions SUCCESS, QA navegador/focal PASS, consola limpia, `pageerror = 0`, revisión independiente APTO; no declara piloto, deploy ni persistencia longitudinal |
| **WO-FH-BRIDGE-V2-RUNTIME-HANDOFF-DASHBOARD-01 (histórica)** | Handoff efímero y dashboard Bridge de solo lectura | ✅ MERGED_AND_VERIFIED | `work/fh-bridge-v2-runtime-handoff-dashboard-01-20260805` | issue #245; PR #246; merge `ee749658fdd1d64a2dd1f828683c3f31c2a1abd6` | Capacidad histórica; no experiencia soportada actual, no persistencia, piloto ni deploy |
| **WO-FH-RAW-EXCEL-CURRENT-PATIENT-SESSION-01** | Data Port y sesión del paciente actual | ✅ MERGED_AND_VERIFIED | `recovery/farmacia-pr-replay-20260727` | issue #250; PR #251; merge `de830803e84bc5e89446084bbf5a0313d15426a0` | `RawExcelDataSource`, `CurrentPatientSession` y envelope temporal |
| **WO-FH-RAW-EXCEL-PATIENT-FLOW-CUTOVER-01** | Cutover del flujo normal | ✅ MERGED_AND_VERIFIED | `recovery/farmacia-pr-replay-20260727` | issue #252; PR #253; merge histórico `3f7bf9bb8a2f007bc1f12888d0b6d6f27709333f` | Flujo normal publicado sin modo Bridge visible; superseded como HEAD regional por #257/#258 y posteriormente #261/#262 y #265/#266 |
| **WO-FH-RAW-STATISTICS-CUTOVER-01** | Estadísticas raw y CSV de cohorte | ✅ MERGED_AND_VERIFIED | `work/fh-raw-statistics-cutover-01-20260806` | issue #257; PR #258; candidate `5a7ad559...`; merge histórico `a9d6d464...` | Raw population statistics; handoff efímero; CSV 37 columnas; QA Chromium; `LOCAL_CI_EQUIVALENT_PASS` por incidencia GitHub; no es el HEAD vigente |
| **WO-FH-RAW-QUICKVIEW-PROMS-01** | Quick View PROM raw | ✅ MERGED_AND_VERIFIED | `work/fh-raw-quickview-proms-01-20260806` | issue #261; PR #262; candidate `13963f89...`; merge `f2b827fe...` | Renderer estructurado publicado/demostrado para evaluación sintética; `PREEXISTING_QUICKVIEW_P2` resuelto; sin thresholds ni interpretación clínica; Reader 21/21, Selectors 82/82, Quick View PROM Chromium PASS |
| **WO-FH-RAW-PATIENT-LONGITUDINAL-CUTOVER-01** | Patient Longitudinal raw | ✅ MERGED_AND_VERIFIED | `recovery/farmacia-pr-replay-20260727` | issue #265; PR #266; candidate `a7b8deb...`; merge publicado vigente `fb7b70c...` | Patient Longitudinal raw implementado, publicado y demostrado para evaluación sintética; `LONGITUDINAL_FULL_HISTORY_NOT_DEMONSTRATED` resuelto; hosted Farmacia smoke #914 SUCCESS; sin piloto ni producción |
| **WO-FH-EVALUATION-PACKAGE-01** | Paquete externo de evaluación sintética | ✅ Merged | `work/fh-evaluation-package-01-20260807` | issue #269; PR #270; initial candidate `a026549...`; merge `8bfceaaa956199610be9c0e6df40740a04b73699` | Package exclusivamente sintético, sin cambios funcionales ni autorización de piloto o producción; superseded como WO activa del package por el freeze autónomo del issue #277 |
| **WO-FH-CACERES-EVALUATION-SNAPSHOT-04-01** | Promover snapshot Cáceres 0.4 | ✅ Merged | `work/fh-caceres-evaluation-snapshot-04-20260807` | issue #271; PR #272; candidate `d9cbd56b515ee75c871bfb5e63f96320c963b1e0`; merge `9125518a74151010eaa2d48b913c5954fa54b8a1` | Snapshot `CÁCERES-REVIEW-0.4` publicado; evaluación Pharmacy-only Cáceres |
| **WO-FH-CACERES-MANIFEST-EOL-INTEGRITY-01** | Estabilizar integridad de manifest | ✅ Merged | `work/fh-caceres-manifest-eol-integrity-01-20260807` | issue #273; PR #276; candidate `963bac71ffac4e2d6d088aeeb4d9abeaf8f5bad1`; merge histórico `451d02361fc54cc01f493ca2a89192bde52d7fd9` | Integridad EOL/line-ending del manifest del snapshot 0.4; merge histórico, superado como estado publicado por el freeze documental del issue #277 / PR #278 |
| **WO-FH-EVALUATION-AUTONOMOUS-FREEZE-01** | Freeze autónomo del paquete de evaluación sintética | ✅ MERGED_AND_VERIFIED | `work/fh-evaluation-autonomous-freeze-01-20260807` | issue #277; PR #278; candidate freeze `9d95ec997ff7907e6403f5b69de9375052f817c5`; merge `827163d8c0d4eafb8af235da9a97aa4338a8141f` | Freeze documental `MERGED_AND_VERIFIED` dentro del alcance documental/freeze; paquete final `READY_FOR_EXTERNAL_SYNTHETIC_EVALUATION`; ZIP final integridad PASS |
| **WO-FH-DASHBOARD-PROMS-SHAPE-P1-01** | Fix P1 F-01/F-04 Dashboard PROMs | ✅ MERGED_AND_VERIFIED | `recovery/farmacia-pr-replay-20260727` | issue #288 (CLOSED / completed); PR #289 (MERGED); merge histórico/preservado `9fd6888b662c5d2b38275e3aa459e5dd2e54b5cb` | Fix P1 F-01/F-04 del Dashboard demo publicado en recovery; `proms` STRING legacy como contexto demo sin parseo/iteración clínica; ARRAY raw intacto; QA pre-merge Chromium supported-route PASS y hosted post-merge smoke #943 `success`; snapshot/package NO refrozen |
| **WO-DOC-FH-P1-POSTMERGE-RECONCILIATION-01** | Reconciliación documental post-merge #289 | 🔄 Superseded | `work/fh-p1-doc-reconciliation-20260904` | issue #290; PR #291 abierto/histórico | Fuente del baseline/postscript P1; superseded como estado vivo por #325 tras publicación #324 |
| **WO-DOC-FH-UNIFIED-INTAKE-FINAL-RECONCILIATION-01** | Auditoría/reconciliación final del train original | ✅ Completada | `work/hermes/fh-unified-intake-final-reconciliation-20260906` | issue #315; commit `4cb2c9dd…`; sin merge | Fuente factual del train original; auditoría incorporada por #325 |
| **WO-FH-T8-REPAIR-C-STALE-STAGE-EXPIRY-01** | Repair C autorización stale-stage | ✅ Completada | `work/hermes/fh-t8-repair-c-317-20260906` | issue #317; `d6d4bac…` | Checkpoint aceptado; posteriormente incorporado a recovery por #324 |
| **WO-FH-T9-HARDEN-SES-ATOMIC-WRITE-01** | Hardening SES atomic write | ✅ Completada | `work/hermes/fh-t9-ses-atomic-repair-319-r3-20260906` | issue #319; `4ec70f5…` | Checkpoint aceptado; posteriormente incorporado a recovery por #324 |
| **WO-FH-UNIFIED-INTAKE-COMPOSE-T1-T10-01** | Composición física T1–T10 | ✅ Completada | `work/hermes/fh-unified-intake-compose-t1-t10-322-20260906` | issue #322; `0916989…` | Candidate físico aceptado y usado como fuente de promoción |
| **WO-FH-UNIFIED-INTAKE-PROMOTE-RECOVERY-01** | Promoción Unified Intake a recovery | ✅ MERGED_AND_VERIFIED | `recovery/farmacia-pr-replay-20260727` | issue #323; PR #324; merge `bff76ff7095fb568948b1bfbc6288df551971add` | Producto publicado y verificado post-merge; snapshot Cáceres/package no refrozen |
| **WO-DOC-FH-POST-UNIFIED-INTAKE-PUBLICATION-RECONCILIATION-01** | Reconciliación documental post-publicación | ✅ Completed | `docs/fh-post-unified-intake-reconciliation-325-20260906` | issue #325 CLOSED/completed | Reconciliación histórica post #324; superseded como estado vivo por #347 |
| **WO-DOC-FH-EVALUATION-FINAL-RECONCILIATION-01** | Reconciliación documental final del freeze | 📋 Ready for review | `docs/fh-evaluation-final-reconciliation-01-20260807` | issue #279; sin PR/merge | Reconciliación documental histórica del freeze #277/#278; superada como WO actual por #290 |

Correcciones P1 publicadas en `7ebc482629e1e818a6227c8e8946cddd12ee113a`: normalización simétrica mediante `trim()` para contexto e identificadores almacenados; padding almacenado soportado; componentes whitespace-only rechazados con `HANDOFF_IDENTIFIER_COMPONENT_EMPTY`; sensibilidad a mayúsculas preservada; payload original no mutado; TTL único `sessionTtlMs = 45000`; timeout funcional de 1500 ms retirado. El dashboard Bridge y su handoff quedan como historia técnica; los formularios normales publicados se describen en las entradas posteriores de patient-flow.

### Adjudicación de WO5 Export v2

El alcance original de `WO-FH-EXPORT-V2-CUTOVER-01` incluía activación pública, compatibilidad y retirada gobernada de v1. PR #225 y PR #227 satisfacen una parte mediante unidades menores. Su adjudicación descriptiva es `PARTIALLY_SATISFIED_BY_SMALLER_UNITS / REMAINING_SCOPE_DEFERRED`: no se añade un estado nuevo a la leyenda, no se reabre WO5 como megadesarrollo y tampoco se declara completamente cerrada.

Para esta reconciliación, **WO5A** nombra retrospectivamente `WO-FH-EXPORT-V2-TECHNICAL-CONTEXT-01` (issue #224, PR #225). Aporta fixtures de contexto técnico sintético con `patient_id`, IDs de acto, `treatment_id` y `line_id` explícitos, estables y predeclarados. El proveedor no genera esos IDs, no deriva ni transforma el CIP en identidad técnica y falla cerrado para cualquier contexto no registrado; no es un `IdentityRepository` ni añade salida pública propia. **WO5B** nombra retrospectivamente `WO-FH-EXPORT-V2-PARALLEL-ACTIVATION-01` (issue #226, PR #227). No son títulos oficiales originales. No existe WO5C ejecutada ni se declarará sin issue, manifest, PR y evidencia publicada.

Quedan aplazadas la retirada de v1 y la promoción de versiones `draft`. El workbook operativo está implementado y verificado desde PR #233; el reader/Data Port, sesión, dashboards y formularios normales están integrados por los issues #250/#252 y las PR #251/#253. PR #246 queda como historia técnica del Bridge. Estadísticas raw y CSV están implementados y publicados por #257/#258; Office Script integrado, tablas relacionales pobladas, vistas `APP_*`, `RelationalExcelDataSource`, Processor y roundtrip no están implementados. La decisión completa vive en [`../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md`](../DECISION_FH_V4_PERSISTENCE_AND_EVALUATION_FLOW_20260804.md).

### Estado técnico de persistencia en navegador

PR #231 retiró del runtime soportado el ledger clínico basado en `localStorage`. El issue #250 y la PR #251 usan `sessionStorage` solo para el envelope temporal del paciente actual, con claves cerradas y sin workbook, bytes, read model completo, población, cohorte u otros pacientes. Cambiar de CIP purga el contexto anterior. PR #238/#242/#246 se conserva como trazabilidad del Bridge histórico; no define un modo visible actual. No hay persistencia longitudinal definitiva resuelta.

### Deuda administrativa de issues

A 2026-08-07, los issues #184, #186, #188, #190, #192, #269, #271, #273 y #277 continúan abiertos aunque sus PR están fusionadas (para #277, su PR #278 está fusionada y verificado). Los issues #194, #196, #198, #200, #202, #204, #206, #208, #210, #212, #214, #216, #220, #222, #224, #226, #230, #232 y #245 están cerrados. Esta WO documental no modifica issues históricos ni cierra #269/#271/#273/#277; su cierre queda pendiente de una decisión separada de la operadora.

---

## Bloque Farmacia v0.1 — rama frozen histórica

> Rama: `work/hermes/nightly-farmacia-v0-1-20260606`. No mergeada; se conserva como respaldo histórico.

| WO | Título | Estado | Referencia | Nota |
| --- | --- | --- | --- | --- |
| **WO-017** | Shell UI Farmacia | 📋 Ready for review | `e1892e0` | Histórico, no mergeado |
| **WO-018** | Buscador CIP y alta guiada | 📋 Ready for review | rama nocturna | Histórico |
| **WO-019** | Validación farmacoterapéutica | 📋 Ready for review | rama nocturna | Histórico |
| **WO-020** | Primera Visita | 📋 Ready for review | rama nocturna | Histórico |
| **WO-021** | Seguimiento + Morisky | 📋 Ready for review | rama nocturna | Histórico |
| **WO-022** | Dashboard paciente | 📋 Ready for review | rama nocturna | Histórico |
| **WO-023** | Dataset demo y catálogos | 📋 Ready for review | rama nocturna | Histórico |
| **WO-024** | TXT JARA + CSV | 📋 Ready for review | rama nocturna | Histórico |
| **WO-025** | Smoke/reporte macro | 📋 Ready for review | rama nocturna | Histórico |
| **WO-026** | Hardening visual | 📋 Ready for review | `0ceac8b` | Histórico |
| **WO-027** | Executive summary | 📋 Ready for review | `5ce00a4` | Histórico |
| **WO-028** | Auditorías Claude | 📋 Ready for review | `9fa56ad`, `0d893e4` | Histórico |
| **WO-029** | Pulido pre-demo | 📋 Ready for review | `947b066` | Histórico |
| **WO-030** | Robustez pre-demo | 📋 Ready for review | rama nocturna | Histórico |
| **WO-031** | Reducción de deuda | 📋 Ready for review | `22e7a93` | Histórico |
| **WO-032-lite** | Limpieza + smoke | 📋 Ready for review | `a80b4af` | Histórico |
| **WO-033-lite** | Freeze + CI | 📋 Ready for review | `d0d9739`, `0ac562d` | Histórico |
| **WO-034** | Cierre documental v0.1 | 📋 Ready for review | `1fe6f9b` | Histórico |

---

## Bloque Farmacia v0.2 — candidatas históricas

| WO | Título | Estado | Rama/commit | Notas |
| --- | --- | --- | --- | --- |
| **WO-035** | Catálogo CIMA completo | 🔄 Superseded | `work/farmacia-catalogo-cima-v0-1-20260606` / `3047673` | Sustituido por catálogo hospitalario |
| **WO-036** | Autocomplete dual hospitalario | 🟢 Validated | `work/hermes/farmacia-demo-v0-2-candidate-20260606` / `d631ee7` | Validada como demo histórica |
| **WO-037** | Rama limpia PR #5 | 📋 Draft | `work/farmacia-v0-2-autocomplete-dual-clean-20260606` / `b5643fd` | No mergear |
| **WO-038** | Auditoría técnica v0.2 | ✅ Completada | candidata v0.2 | Sin P0/P1 en su contexto histórico |

---

## Resumen

| Estado | Cantidad |
| --- | ---: |
| ✅ Merged | 64 |
| ✅ MERGED_AND_VERIFIED | 17 |
| 📋 Ready for review | 21 |
| 📋 Draft | 1 |
| 🟢 Validated | 1 |
| 🔄 Superseded | 4 |
| ✅ Completada | 5 |
| ⏸️ Pausada | 1 |
| 🔴 Bloqueada | 0 |
| ❌ Descartada | 0 |

**Total:** 114 work orders / preflights gestionadas.

Comprobación aritmética de las filas de tabla: 64 + 17 + 21 + 1 + 1 + 4 + 5 + 1 + 0 + 0 = 114, coherente con el total registrado.

Los totales incluyen referencias históricas no mergeadas. Ninguna cifra equivale a aptitud para piloto o producción.