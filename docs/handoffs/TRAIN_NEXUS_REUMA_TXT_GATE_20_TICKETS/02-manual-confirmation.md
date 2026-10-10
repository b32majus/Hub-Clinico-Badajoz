# T20-02 — Copia y descarga manual: confirmación explícita

**Status:** READY_FOR_AGENT / LOCAL ONLY. **Blocked by:** T20-01 completado. **Contexto:** #621 + contrato compartido #620 publicado.

**WHAT:** el fallo de copia automática abre modal de nota TXT; el CSV sigue bloqueado. El botón existente «Copiar» confirma solo éxito real de API/execCommand (contrato #620); el profesional que copia mediante Ctrl+A/Ctrl+C o descarga TXT puede usar un **control explícito y visible** «He copiado el TXT» / «He guardado el TXT» para autoatestación. Abrir, seleccionar, descargar, cancelar o cerrar sin confirmar **NO habilita CSV**; no afirmar que se pegó en HCE ni que el archivo quedó grabado.

**WHERE/REUSE:** `exportManager.js::exportarTXT` y sus tres rutas (clipboard, fallback modal, descarga); `formController.js::mostrarModalTexto` con opción/callback **opt-in** exclusiva de TXT Reuma, manteniendo compatibilidad de los tres argumentos y protección stale #620. No rediseñar modal compartido, ni habilitar confirmación de TXT al exportar Solicitud FH o CSV. Si falta modal y hay descarga, atestación explícita soportada o bloqueo seguro con instrucción de reintento; nunca autorizar por `link.click()` solamente.

**Acceptance/PROOF:** browser PV/Seguimiento con clicks reales: clipboard auto fail + Copiar modal true permite, false/throw bloquea; Ctrl+A/Ctrl+C + autoatestación permite, sin ella bloquea; descarga disparada sin confirmación bloquea; descarga + confirmación permite; cerrar modal sin confirmar bloquea; intentos nuevos invalidan callbacks antiguos. FH Solicitud modal y CSV manual siguen byte-identical/sin botones de gate. Copia confirmada != pegado en HCE.

**RUTAS:** `modules/exportManager.js`, `modules/formController.js` solo extensión opt-in; ampliar oráculo T20-01, tokens de `formController.js` solo en HTML consumidores efectivamente alterados, documentar mapa. **NO TOCA:** motores clínicos, 497, Home/Farmacia, logs generales, Web Storage, CSS general, nuevos sistemas de portapapeles.

**PREFLIGHT:** T20-01 SHA, RED por recorrido antes de implementación. **STOP:** tocar FH/CSV funcionalmente, otra decisión de interacción no aprobada, no existe control de confirmación confiable. **REVERSIÓN:** revert de commit propio. **OUTPUT:** un commit local T20-02 y oráculos focalizados, sin publicación ni issues.
