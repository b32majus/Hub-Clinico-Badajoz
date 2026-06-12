# Farmacia v0.5 — Programming model refactor

## Rescate Codex — UI real de causalidad y múltiples fármacos

Fecha: 2026-06-12
Status: pending_review

### Problema

La implementación previa añadía funciones de causalidad al modelo, pero no una UI operativa. Sil no podía ver ni usar Naranjo/Karch-Lasagna ni localizar claramente la opción de múltiples fármacos.

### Corrección

- Añadido panel visible de navegación.
- Añadido módulo visible de múltiples fármacos.
- Añadida UI completa de Naranjo con 10 preguntas, score y categoría.
- Añadida UI completa de Karch-Lasagna con preguntas y categoría.
- Añadido resumen comparativo y causalidad final editable.
- Algoritmos se muestran solo si existe sospecha de RAM.
- Export TXT/CSV ampliado.
- Modelo mantiene funciones puras sin DOM.

### Limitaciones

- Demo/formativo.
- Requiere revisión clínica/metodológica.
- No sustituye juicio clínico.
- No sustituye farmacovigilancia oficial.
- Sin backend ni persistencia.
