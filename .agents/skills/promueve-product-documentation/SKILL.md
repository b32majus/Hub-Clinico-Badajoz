---
name: promueve-product-documentation
description: Apply the PROMueve Nexus product documentation standard when writing or updating product/engineering documentation, handover material, or runbooks. Read the norm first; this skill only helps apply it.
---

# promueve-product-documentation

Metodología para aplicar la norma documental del proyecto. **No es autoridad normativa** y no decide arquitectura, clínica ni estado: la autoridad única es [`docs/engineering/PRODUCT_DOCUMENTATION_STANDARD.md`](../../../docs/engineering/PRODUCT_DOCUMENTATION_STANDARD.md).

## Cuándo usar

- Crear o actualizar documentación viva de producto/ingeniería (contratos, runbooks, estado, handover).
- Preparar material de handover SES o de una tercera persona.
- Evaluar el impacto documental de un cambio material.

## Pasos

1. Lee la norma vigente y su taxonomía de estados de madurez (`código → wired → visible → demostrado → demo → evaluación → piloto → producción`).
2. Identifica el documento vivo afectado y su issue/WO de origen; verifica estado actual en GitHub live antes de escribir.
3. Escribe solo afirmaciones trazables a código publicado, evidencia de verificación o decisión aceptada. Marca lo pendiente (`CONTRACT_PENDING`, `SES_DECISION`, `DEFERRED`).
4. Declara en el documento: estado, fecha, issue/WO de origen y base (rama/SHA cuando sea material).
5. Para handover, cubre el mínimo de la sección 14 de la norma: construcción, despliegue, verificación, operación, diagnóstico y reversión, más lo NO acreditado.
6. Reconcilia `docs/INDEX.md` y `docs/ops/WORK_ORDER_STATUS.md` si cambia el estado real del proyecto.

## Límites

- No duplicar ADRs, INDEX, WOs ni contenido existente; referéncialos.
- No declarar piloto, producción, persistencia ni acreditaciones SES no existentes.
- Cero datos reales o identificadores en documentación, fixtures o ejemplos.
