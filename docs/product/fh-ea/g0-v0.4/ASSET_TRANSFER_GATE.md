# G0 v0.4 · puerta de transferencia de evidencia visual

**Estado al preparar (18-10-2026):** `BLOCKED_ASSET_TRANSFER` (registro histórico anterior a la transferencia).
**Estado verificado tras transferencia (18-10-2026):** `LOCAL_ASSET_TRANSFER_PASS_3_OF_3`, como evidencia para la WO documental [#793](https://github.com/b32majus/Hub-Clinico-Badajoz/issues/793). La transferencia no acredita por sí misma el merge ni autoriza T01. HTML y dos PNG originales presentes en el mismo worktree documental, con SHA-256 3/3 correctos.

## Archivos aceptados, SHA-256 y uso

| Archivo repo-local | SHA-256 original aceptado | Estado al crear worktree |
| --- | --- | --- |
| `G0_Seguimiento_EA_v0_4_MASTER_VISUAL_APROBADO_LOCAL.html` | `6dae55cb9b25372ad4c32904a7319b41ee16a71e197e6072eb411a5b6cd6bdd9` | ORIGINAL VERIFICADO: SHA256 PASS |
| `G0_Seguimiento_EA_v0_4_Captura.png` | `3ce6059642b490526bcde774bead2a35913c034d9e295e67ad7c5e90bc557e34` | ORIGINAL VERIFICADO: SHA256 PASS |
| `G0_Seguimiento_EA_v0_4_Causalidad.png` | `a7a58f89540aa39289e6379a6eb91f6dd78901fe62afb72d01e4eeb7a91c0ce0` | ORIGINAL VERIFICADO: SHA256 PASS |

Ambos PNG son **recortes de bloque**, no capturas completas del viewport 1440×900. La evidencia de diseño congelado cubre estados sintéticos mostrados. La futura captura comparativa debe tomarse de la aplicación real mediante navegación/interacción soportada, con evidencia visual accesible a los revisores; una referencia en Markdown sin píxeles no basta.

## Comando read-only de aceptación (desde esta carpeta)

```bash
printf '%s  %s\n' \
  '6dae55cb9b25372ad4c32904a7319b41ee16a71e197e6072eb411a5b6cd6bdd9' 'G0_Seguimiento_EA_v0_4_MASTER_VISUAL_APROBADO_LOCAL.html' \
  '3ce6059642b490526bcde774bead2a35913c034d9e295e67ad7c5e90bc557e34' 'G0_Seguimiento_EA_v0_4_Captura.png' \
  'a7a58f89540aa39289e6379a6eb91f6dd78901fe62afb72d01e4eeb7a91c0ce0' 'G0_Seguimiento_EA_v0_4_Causalidad.png' | sha256sum -c -
```

Solo 3/3 PASS permite solicitar publicación de autoridad visual. Se requiere **merge verificado en GitHub** antes de declarar `ATENEA_FIDELITY_AUTHORITY_IN_REPO`. La aceptación G0 original sigue válida como dirección visual, pero NO equivale a publicación en rama canónica.

## Traslado físico completado en worktree (sin reinterpretar como QA)

El ZIP `PROMueve_FH_EA_G0v04_PNG_Originales_para_worktree_20261018.zip` existe en la conversación y se ha comprobado en el contenedor local: SHA-256 `40e7029d009b804c13e2bc29ba8d5d44543de67e9ad8bbe5ecd31950a289b3cd`. Contiene exactamente dos entradas bajo `docs/product/fh-ea/g0-v0.4/`, de 132927 y 93996 bytes, con hashes coincidentes con la tabla anterior.

**El ZIP ya está en Hermes**, en `/srv/kairos-lab/outbox/PROMueve_FH_EA_G0v04_PNG_Originales_para_worktree_20261018.zip`, verificado con el SHA-256 indicado. Se ha inspeccionado su contenido, comprobado CRC, nombres/tamaños/hashes de las dos entradas, y extraído de forma exclusiva (sin sobrescribir archivos) al worktree `docs/product/fh-ea/g0-v0.4/`. El original se conserva intacto en outbox como copia de transferencia. Los tres hashes de HTML + PNG + PNG han pasado `sha256sum -c`. No se ha hecho commit, push ni PR.

**TRANSFERENCIA COMPLETADA / WO-DOC #793 AUTORIZADA.** La autoridad publicada solo se acredita verificando el merge y las tres rutas/hashes en `promueve/nexus-v4`. La autorización de documentación #793 permite únicamente esta publicación y sus gates; **HUMAN STOP para T01**, sin GO de implementación.
