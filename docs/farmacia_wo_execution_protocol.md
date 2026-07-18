# Suplemento de ejecución de work orders — Farmacia

## 1. Propósito y prevalencia

Este documento añade controles clínicos y técnicos específicos para WOs de Farmacia Hospitalaria Badajoz. El protocolo global [`docs/ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md`](ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md) prevalece y define preflight, evidencia, handoff, revisión, commit y publicación.

La WO concreta debe declarar objetivo, alcance, archivos permitidos y prohibidos, checks y autorizaciones. Puede endurecer ambos documentos, pero no rebajarlos.

## 2. Riesgo mínimo

Son riesgo ámbar como mínimo las WOs de Farmacia que afecten a:

- helpers compartidos;
- snapshots o persistencia;
- contratos clínicos o de datos;
- más de una pantalla;
- importación o exportación;
- navegación, identidad o compatibilidad histórica.

Estas WOs requieren diagnóstico read-only previo, mapa de productores/consumidores/callers y revisión independiente antes de cualquier commit. Los gates rojos del protocolo global siguen aplicándose cuando aparezcan backend, identidad, permisos, datos reales, arquitectura transversal o seguridad crítica.

## 3. Preflight específico

Además del preflight global, verificar:

- contratos de Farmacia indicados por la WO;
- estado de los datos sintéticos usados en pruebas;
- consumidores clínicos y pantallas que compartan helpers o snapshots;
- importadores, exportadores y persistencia relacionados;
- ausencia de cambios ajenos o rutas no autorizadas.

Si la rama, HEAD o ref remota no coinciden con la WO, detenerse antes de editar.

## 4. Reglas de seguridad clínica

En cualquier WO con impacto terapéutico o de representación clínica:

- no convertir un concomitante en tratamiento principal;
- no convertir un tratamiento adicional en switch formal;
- no crear líneas terapéuticas validadas de forma silenciosa;
- no mezclar fármaco sospechoso de efecto adverso con tratamiento principal;
- no inferir dosis, vía, pauta, presentación, inducción, duración, causalidad o validación desde nombres, CIMA o catálogo;
- respetar `docs/farmacia_treatment_data_contract.md` y cualquier contrato publicado indicado por la WO;
- usar únicamente datos sintéticos y de demostración.

Si una WO necesita cambiar una de estas reglas, requiere decisión y contrato explícitos antes de implementar.

## 5. Reglas técnicas

- No introducir `innerHTML`.
- Si se crea o modifica un helper compartido, añadir o actualizar un check dedicado y ejecutar sus regresiones consumidoras.
- Si se modifica una pantalla clínica, ejecutar al menos checks sintácticos, smoke check y las interacciones soportadas que exija la WO.
- No validar defectos mediante estados imposibles inyectados en DOM, campos readonly u ocultos.
- Si se toca un contrato, snapshot o helper común, comprobar consumidores, persistencia, rerenders, import/export y compatibilidad legacy.
- Si el diff incluye archivos no autorizados, detenerse y reportar.
- Aplicar la regla global de parada tras el segundo bloqueo con la misma raíz conceptual.

## 6. Cierre y handoff

No existe un reporte compacto de Farmacia que sustituya el cierre global. Toda WO con cambios genera el paquete pre-commit y usa los veredictos definidos por [`WO_HANDOFF_AND_REVIEW_PROTOCOL.md`](ops/WO_HANDOFF_AND_REVIEW_PROTOCOL.md).

El paquete debe reflejar también los riesgos de no inferencia clínica, contratos y compatibilidad propios de Farmacia. La salida de los checks se captura durante la ejecución en `TESTS.log`; no se reconstruye al final.

Commit, issue, push, PR y merge son acciones separadas y solo se ejecutan con autorización concreta. Este suplemento no prescribe comandos ni destinos de push.
