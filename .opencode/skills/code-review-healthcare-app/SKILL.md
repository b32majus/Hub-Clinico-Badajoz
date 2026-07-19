---
name: code-review-healthcare-app
description: "Code review para apps clínicas — revisión proporcional al riesgo, centrada en el diff y los efectos alcanzables del cambio, con clasificación por hallazgo y acción mínima suficiente"
---

# Code Review — Healthcare App (proporcional)

## Propósito

Revisar cambios de código en apps clínicas con foco exclusivo en el diff real y sus efectos demostrablemente alcanzables, no en el archivo completo ni en código legacy inalcanzable. La profundidad de revisión es proporcional al riesgo declarado en la WO. Aplicar siempre la solución mínima suficiente.

## Revisión obligatoria (todo cambio, todo riesgo)

### Seguridad clínica y privacidad (siempre)
- [ ] Sin datos reales de pacientes en código, commits ni comentarios.
- [ ] Sin credenciales, tokens ni variables de entorno expuestas.
- [ ] Sin `innerHTML` con entrada no sanitizada.
- [ ] Sin `eval()` ni ejecución dinámica de código.
- [ ] Sin inferencia clínica no autorizada desde nombres de fármacos, catálogos o datos sintéticos.

### Cumplimiento de WO (siempre)
- [ ] Los cambios coinciden con los criterios de aceptación de la WO.
- [ ] Sin scope creep: solo se tocan los archivos autorizados.
- [ ] Sin código, dependencias, infraestructura ni contratos nuevos fuera del alcance declarado.

### Verificación básica (siempre)
- [ ] `node --check` pasa sobre los archivos JS aplicables (los que contienen lógica nueva o modificada).
- [ ] Smoke tests del comportamiento tocado por el diff pasan sin errores nuevos.
- [ ] Sin errores de consola en la UI (navegador) introducidos por el cambio.
- [ ] Los ítems no aplicables se marcan como N/A con justificación breve.

---

## Revisión condicional por área

Las siguientes áreas se activan solo cuando el riesgo de la WO (ámbar/rojo) o el contenido del diff lo exigen. Cada área evalúa exclusivamente los archivos tocados por el diff y sus efectos alcanzables (callers, consumidores, contratos afectados). El código legacy inalcanzable no se revisa salvo que impida el cambio; en ese caso se clasifica sin expandir el alcance.

### 1. Flujo clínico / producto
*Activado si el diff toca lógica de pantallas, navegación, validación o estados clínicos.*
- [ ] Los IDs de DOM nuevos tienen manejadores JS correspondientes.
- [ ] El branching por tipo de fuente cubre todos los valores esperados en el diff.
- [ ] Los flujos de pantalla introducidos mantienen coherencia clínica con el resto del módulo afectado.
- [ ] No se introducen estados clínicos imposibles ni transiciones sin respaldo en el contrato de datos.

### 2. Seguridad clínica y privacidad (ampliada)
*Siempre activo; se amplía si el diff toca almacenamiento, exportación o comunicación.*
- [ ] Los datos clínicos introducidos no se persisten sin capa de protección adecuada al contexto (demo, piloto, producción).
- [ ] Las exportaciones nuevas no incluyen campos no declarados en el contrato de datos vigente.
- [ ] Sin exposición de identificadores personales en logs, DOM o exportaciones.

### 3. Salud del código
*Activado si el diff introduce lógica nueva o modifica lógica existente.*
- [ ] Los code smells detectados son **señales de investigación, nunca gates automáticos de refactor**. Solo generan hallazgo si se demuestra un efecto alcanzable introducido o agravado con riesgo concreto.
- [ ] No se exige extracción de helpers, componentes ni módulos de solo dos fragmentos salvo que compartan semántica o evolución previsible demostrable.
- [ ] No se exigen cambios de estilo personal, reformateos ni renombrados. El estilo existente no es defecto.
- [ ] Sin magic strings clínicos nuevos que deban ser constantes con nombre.
- [ ] Sin funciones nuevas con más de una responsabilidad clínica distinta sin justificación.

### 4. Diseño, arquitectura y contratos de datos
*Activado si el diff toca contratos, schemas, APIs, modelos de datos o estructura de archivos.*
- [ ] Los contratos de datos modificados mantienen compatibilidad con el resto del módulo.
- [ ] No se introducen acoplamientos implícitos por ID de DOM entre pantallas no relacionadas.
- [ ] Los cambios arquitectónicos (nuevos módulos, nueva estructura de archivos) están autorizados por la WO.
- [ ] Toda abstracción nueva tiene un consumidor real en el diff, no solo hipotético.

### 5. Infraestructura y dependencias
*Activado SOLO si el diff introduce, modifica o elimina dependencias, infraestructura, servicios o configuración de entorno.*
- [ ] Las dependencias nuevas están explícitamente autorizadas por la WO.
- [ ] Sin cambios en infraestructura (CI, deploy, hosting, rutas de build) no solicitados.
- [ ] Sin modificación de configuraciones de entorno sin autorización.

### 6. Tests, QA y evidencia de agente
*Activado si el diff toca tests, harness, smoke checks o si la WO exige QA.*
- [ ] Los tests introducidos cubren el nuevo comportamiento, no el archivo completo.
- [ ] La evidencia de QA no usa estados DOM imposibles ni interacciones no soportadas.
- [ ] `TESTS.log` captura comandos exactos, salida literal y exit codes, sin reconstrucción.
- [ ] Los tests no introducen dependencias nuevas de testing sin autorización.

### 7. Alcance, deuda y documentación
*Activado siempre para verificar fronteras del cambio.*
- [ ] El código obsoleto por esta WO (reemplazado, no usado tras el cambio) puede retirarse dentro del alcance autorizado.
- [ ] El código muerto preexistente (legacy, no creado por esta WO) no se elimina ni modifica. Si interfiere con el cambio, se clasifica como DEUDA PREEXISTENTE sin expandir el alcance.
- [ ] Sin limpieza especulativa de imports, comentarios, logs o código inactivo fuera del alcance.
- [ ] La documentación viva afectada se registra como hallazgo documental, no se modifica sin autorización.

---

## Clasificación de hallazgos

Todo hallazgo real debe incluir: **evidencia** (ruta, línea, fragmento), **rango** (archivos y símbolos afectados), **riesgo** (🟢/🟡/🔴), **acción mínima** (corrección concreta sin sobredimensionar) y exactamente una de estas clasificaciones:

### BLOQUEANTE
El cambio no puede continuar sin reparar este hallazgo. Supone un riesgo clínico, de seguridad, de datos o de arquitectura no autorizada. Disposición: detener, reportar y esperar autorización para la reparación.

### REPARABLE FUERA DE ALCANCE
El hallazgo es real y alcanzable, pero no impide el cierre funcional. Reparable solo fuera de esta WO. Disposición: registrar en el reporte con acción mínima propuesta. No puede repararse en esta WO ni ampliar su alcance; cualquier reparación requiere una WO separada aprobada.

### DEUDA PREEXISTENTE
El hallazgo existe en código no tocado por el diff pero interfiere con el cambio. No reparable en esta WO. Disposición: registrar sin expandir alcance; no se repara en esta WO. Puede motivar una WO de deuda técnica separada.

### MEJORA FUERA DE ALCANCE
El hallazgo sería una mejora legítima pero no está en el diff ni es consecuencia del cambio. No reparable en esta WO. Disposición: registrar como observación; no se exige ni se implementa. No bloquea.

---

## Reglas de revisión

- **Solo diff y efectos alcanzables:** la revisión se limita a los archivos del diff y a sus efectos demostrablemente alcanzables (callers, consumidores, contratos). El código legacy inalcanzable se excluye salvo que impida el cambio.
- **Code smells = señales, no gates:** un smell detectado no genera hallazgo por sí mismo. Solo se convierte en hallazgo si se demuestra un efecto alcanzable introducido o agravado con riesgo concreto.
- **Sin bloqueos por estilo personal:** no se rechazan cambios por formato, nombres, organización o preferencias estilísticas no funcionales.
- **Sin limpieza especulativa:** no se exige ni se realiza limpieza de código fuera del alcance del diff.
- **Sin borrado de dead code heredado:** el código muerto preexistente no se elimina. Solo el código que esta WO deja obsoleto puede retirarse dentro del alcance.
- **Sin abstracción de solo dos fragmentos similares:** no se exige extraer helpers o componentes de dos fragmentos parecidos salvo que compartan semántica o evolución previsible.
- **Sin revisión redundante:** no se repiten comprobaciones ya superadas en auditorías previas. La revisión se detiene cuando la evidencia cubre el riesgo declarado.

---

## Escalado

- Lógica clínica ambigua → escalar a Sil/Cora.
- Cambio arquitectónico no previsto en la WO → detener.
- Datos reales de paciente detectados → detener y reportar.
- Hallazgo BLOQUEANTE no previsto en la WO → congelar evidencia y escalar.
- Dependencia, infraestructura o servicio nuevo no autorizado → detener.

---

## Referencias

- `[[hub-clinico-farmacia]]`, `[[frontend-vanilla-healthcare]]`
- `docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md` — protocolo canónico de cierre, revisión y evidencia.
- `AGENTS.md` — niveles de riesgo, proporcionalidad y modelo operativo.
