# Protocolo de handoff y revisión de work orders PROMueve

Este documento es la fuente canónica para preparar, ejecutar, cerrar, revisar, commitear y publicar work orders (WOs) de todo PROMueve. Su objetivo es que las decisiones se apoyen en evidencia verificable aunque OpenCode, Cora, Sil y GitHub tengan distinta visibilidad del trabajo.

## 1. Propósito y alcance

- Se aplica a todas las líneas de PROMueve, no solo a Farmacia.
- No sustituye la WO concreta: cada ejecución conserva su objetivo, alcance, checks y autorizaciones.
- La WO concreta puede endurecer este protocolo, pero no rebajarlo.
- Los suplementos clínicos específicos añaden controles de dominio sin crear un cierre paralelo.

## 2. Fuentes de verdad

El orden de precedencia es:

1. WO o instrucción actual.
2. Ref Git autorizada, HEAD, código y documentación versionados.
3. `docs/INDEX.md`.
4. `docs/ops/WORK_ORDER_STATUS.md`.
5. Documento vivo específico indicado por la WO.
6. Artefactos locales de handoff.
7. Engram y memoria como contexto auxiliar.

Un worktree local no es estado publicado. Un reporte describe el worktree, pero no lo sustituye. GitHub prevalece sobre copias históricas cuando se evalúa lo publicado. Todo SHA, ref, estado vivo o afirmación de publicación debe verificarse en su fuente antes de usarse.

## 3. Clasificación de riesgo y gates

| Nivel | Incluye, como mínimo | Gate de entrada |
|---|---|---|
| Verde | Documentación aislada; test aislado; cambio local de bajo riesgo; una pantalla sin helper compartido ni persistencia. | Puede pasar a build tras el preflight. |
| Ámbar | Varias pantallas; helper compartido; snapshots; importación/exportación; persistencia; navegación o identidad; contrato clínico; datos o compatibilidad histórica. | Requiere diagnóstico o mapa read-only previo y revisión independiente antes de commit. |
| Rojo | Backend; migraciones; autenticación, permisos o identidad; infraestructura; datos reales; arquitectura transversal; cambios destructivos o de seguridad crítica. | Requiere WO diagnóstica o contractual separada y aprobación explícita antes de implementar. |

La clasificación declarada no se rebaja por conveniencia. Si durante el preflight o la ejecución aparece un factor superior, se aplica el gate del nivel superior y se escala cuando corresponda.

## 4. Diagnóstico obligatorio para WOs ámbar y rojas

Antes de diseñar o implementar, el diagnóstico read-only debe mapear:

- productores;
- consumidores;
- callers;
- persistencia;
- rerenders;
- importación y exportación;
- contratos publicados;
- compatibilidad legacy;
- decisiones humanas pendientes;
- rutas previsiblemente afectadas.

Está prohibido diseñar una WO transversal únicamente desde el síntoma de interfaz. El diagnóstico debe seguir el flujo de datos y comportamiento hasta sus productores, consumidores y contratos.

## 5. Regla de parada por bloqueos

- Primer bloqueo independiente: se permite una corrección acotada dentro del mismo contrato y alcance autorizado.
- Segundo bloqueo con la misma raíz conceptual: detener la implementación, congelar el worktree, generar el paquete de evidencia y abrir una WO diagnóstica o contractual. No ampliar el cambio mediante parches sucesivos.

Congelar significa conservar el estado para revisión: no hacer reset, restore, clean, stage, commit ni eliminar el worktree salvo instrucción humana concreta.

## 6. Paquete pre-commit obligatorio

Toda WO con cambios debe crear antes de cualquier commit:

```text
/srv/kairos-lab/outbox/reports/<WO-ID>/<UTC-TIMESTAMP>/
```

Archivos obligatorios:

- `REPORT.md`
- `DIFF.patch`
- `TESTS.log`
- `MANIFEST.sha256`

El paquete vive fuera del repositorio, nunca se commitea y representa exactamente el estado sometido a revisión. Su creación no autoriza commit, push ni publicación.

## 7. REPORT.md

El reporte debe incluir:

- WO y fecha UTC;
- repositorio, worktree, rama, base y HEAD observados;
- agente, perfil y modelo cuando puedan verificarse;
- fuentes realmente leídas;
- objetivo y contrato funcional;
- alcance y `NO TOCA`;
- productores, consumidores y callers;
- rutas tracked, untracked, eliminadas o renombradas;
- explicación semántica por archivo;
- evidencia RED y GREEN;
- QA manual y automatizada;
- compatibilidad histórica;
- riesgos y limitaciones;
- decisiones humanas pendientes;
- estado Git literal;
- acciones Git realizadas y no realizadas;
- documentación viva afectada o pendiente;
- veredicto.

Los únicos veredictos de build son:

- `APTO PARA REVISIÓN`;
- `BLOQUEADO`;
- `IMPLEMENTACIÓN EXPERIMENTAL CONGELADA`.

En WOs ámbar o rojas, build no puede autodeclarar el trabajo apto para commit. La autorización debe ser posterior al paquete y a la revisión independiente.

## 8. DIFF.patch

`DIFF.patch` debe contener el diff unificado completo del estado revisado:

- archivos tracked modificados;
- archivos untracked como diff contra `/dev/null`;
- borrados;
- renombrados;
- marcadores de binarios cuando aplique.

No se hace stage para generar el patch. Los archivos untracked se añaden al artefacto mediante comparación individual contra `/dev/null`, no mediante el índice de Git.

Si existen binarios, `REPORT.md` registra ruta, tamaño y SHA-256. El patch puede limitarse al marcador binario. No se copian al paquete datos clínicos, sensibles o reales.

## 9. TESTS.log

A partir de la adopción de este protocolo, la salida se captura durante cada ejecución y no se reconstruye al cierre. Por cada comando se registra:

- timestamp UTC;
- directorio de trabajo;
- comando exacto;
- stdout;
- stderr;
- exit code;
- warnings y errores posteriores a las assertions.

Si una salida no fue preservada, debe indicarse expresamente y nunca inventarse. En una WO ámbar o roja, la ausencia de salida de un check obligatorio impide declarar completo el paquete salvo que exista una comparación reproducible ejecutada y capturada.

Un test no es GREEN solo porque imprime assertions correctas: su proceso completo debe terminar sin error, incluido cualquier fallo asíncrono posterior.

## 10. MANIFEST.sha256

`MANIFEST.sha256` contiene los hashes SHA-256 de:

- `REPORT.md`;
- `DIFF.patch`;
- `TESTS.log`;
- todos los archivos modificados, creados o renombrados del worktree.

No incluye su propio hash. Cada entrada usa un path inequívoco, preferentemente absoluto, para distinguir artefactos del paquete y archivos del worktree.

## 11. Handoff Cora-Sil-OpenCode

| Rol | Responsabilidad |
|---|---|
| OpenCode | Ve el worktree local y reporta su estado, diff y checks sin presentarlos como publicados. |
| Sil | Entrega en el chat el resumen y adjunta como mínimo `REPORT.md` y `DIFF.patch`; adjunta `TESTS.log` y `MANIFEST.sha256` cuando se requieran o exista duda. |
| Cora | Contrasta el paquete, GitHub y los documentos vivos; no afirma haber visto el worktree si solo recibió el reporte; puede exigir revisión read-only adicional. |

## 12. Revisión y commit

- Verde: revisión proporcional al alcance y riesgo residual.
- Ámbar y rojo: revisión independiente read-only obligatoria.
- El commit solo se realiza tras autorización posterior al paquete y a la revisión.
- El commit debe ser atómico y corresponder al estado revisado.
- No se hace amend, rebase ni se introducen cambios nuevos sin autorización.

Si una corrección altera el estado revisado, se repiten los checks afectados y se genera un nuevo paquete pre-commit.

## 13. Paquete post-commit

El paquete pre-commit revisado es inmutable. Después de un commit autorizado se crea un paquete hermano:

```text
/srv/kairos-lab/outbox/reports/<WO-ID>/<UTC-TIMESTAMP>-post-commit/
```

Contiene:

- `POST_COMMIT.md`
- `MANIFEST.sha256`

`POST_COMMIT.md` registra SHA, padre o padres, mensaje, archivos exactos, estado Git, comparación entre el patch revisado y el commit, y confirmación de ausencia de cambios adicionales. El manifiesto hashea `POST_COMMIT.md` y no se incluye a sí mismo.

## 14. Publicación

- Issue, push, PR y merge requieren autorización concreta.
- Antes de abrir una PR debe existir un issue relacionado con `status:approved`.
- Un commit local no está publicado.
- Tras el merge se revisan `docs/INDEX.md`, `docs/ops/WORK_ORDER_STATUS.md` y los documentos vivos afectados.
- La reconciliación post-merge puede ejecutarse mediante una WO documental separada.

Los estados deben distinguir siempre: diff local sin commit, commit local, rama remota, PR y merge publicado.

## 15. Seguridad

El paquete no puede contener:

- datos reales de pacientes;
- identificadores personales o clínicos;
- secretos;
- credenciales;
- tokens;
- exportaciones clínicas reales.

Ante cualquier duda de sensibilidad, se detiene el handoff y se escala sin copiar el contenido al paquete.

## 16. Matriz de visibilidad

| Elemento | OpenCode | Cora | GitHub |
|---|---|---|---|
| Worktree local | Sí | No, salvo paquete | No |
| Diff local | Sí | Solo `DIFF.patch` | No |
| Commit local | Sí | Solo reporte/SHA | No |
| Rama remota | Tras push | Sí | Sí |
| Estado publicado | No por inferencia | Sí tras verificar | Sí |
| QA navegador | Solo si ejecutada | Solo evidencia aportada | No necesariamente |

## 17. Secuencia mínima de cierre

1. Completar el preflight y, para ámbar/rojo, el diagnóstico read-only.
2. Ejecutar la WO dentro del alcance y capturar los checks literalmente en `TESTS.log`.
3. Revisar estado y diff sin stage.
4. Crear `REPORT.md`, `DIFF.patch` y `MANIFEST.sha256` en el paquete pre-commit.
5. Entregar el paquete y obtener la revisión exigida por el riesgo.
6. Esperar autorización concreta antes de commit.
7. Tras un commit autorizado, crear el paquete post-commit sin alterar el pre-commit.
8. Tratar issue, push, PR, merge y reconciliación documental como pasos separados y autorizados.
