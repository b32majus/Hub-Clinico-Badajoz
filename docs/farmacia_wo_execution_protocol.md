# Protocolo estándar de ejecución — Farmacia

## 1. Propósito

Este protocolo define una pauta operativa reutilizable para ejecutar futuras WOs del módulo de Farmacia Hospitalaria Badajoz con menor consumo de tokens y sin perder seguridad, trazabilidad ni calidad técnica.

Su objetivo es evitar que cada prompt tenga que repetir todo el contexto histórico, manteniendo un marco estable de preflight, alcance, controles de diff, tests, commit, push y reporte final.

## 2. Regla base de cada WO

Cada WO debe declarar explícitamente:

- objetivo
- alcance permitido
- archivos prohibidos
- tests obligatorios
- formato de reporte final

Si una WO no define estos cinco elementos, debe considerarse incompleta antes de empezar su ejecución.

## 3. Preflight obligatorio

Antes de modificar nada, cada WO debe verificar:

- rama actual
- HEAD actual
- working tree limpio
- `git status --short --branch`
- `git log --oneline -5`

Regla operativa:

- si el working tree no está limpio y el prompt no autoriza trabajar sobre cambios previos, detenerse y reportar
- si la rama o el HEAD no coinciden con lo esperado, reportar antes de editar

## 4. Reglas de seguridad

Reglas fijas:

- no tocar `main`
- no tocar GitHub Pages
- no tocar demo congelada salvo autorización explícita
- no usar `git push origin`
- usar `gh` más URL HTTPS explícita para el push
- no usar `sudo git`
- no imprimir secretos
- no ejecutar `gh auth token`
- no modificar `origin` de forma permanente
- si el diff incluye archivos no autorizados, detenerse

Regla de push recomendada:

```bash
gh auth status
gh auth setup-git
git push https://github.com/b32majus/Hub-Clinico-Badajoz.git work/farmacia-wo6-storage-pautas-normalizadas-20260614
```

## 5. Reglas clínicas

En cualquier WO con impacto terapéutico o de representación clínica:

- no convertir un concomitante en tratamiento principal
- no convertir un tratamiento adicional en switch formal
- no crear líneas terapéuticas validadas de forma silenciosa
- no mezclar fármaco sospechoso de efecto adverso con tratamiento principal
- respetar `docs/farmacia_treatment_data_contract.md`

Si una WO necesita cambiar cualquiera de estas reglas, debe documentarlo de forma explícita antes de implementar.

## 6. Reglas técnicas

Reglas mínimas:

- no introducir `innerHTML`
- si se crea un helper nuevo, crear también un test o check dedicado
- si se modifica una pantalla clínica, ejecutar al menos checks sintácticos y smoke check
- si el diff incluye archivos no autorizados por la WO, detenerse y reportar
- si se toca un contrato documental o helper común, validar que no se rompe el smoke check global cuando aplique

## 7. Plantilla corta para futuras WOs

```markdown
# WO[XX] — [Título]

## Objetivo
...

## Archivos permitidos
...

## Archivos prohibidos específicos
...

## Criterios de aceptación
...

## Tests obligatorios
...

## Commit
...

## Reporte final compacto
HEAD inicial:
HEAD final:
Commit:
Archivos modificados:
Tests:
Push:
Working tree:
Desviaciones:
```

## 8. Reporte final estándar compacto

Usar este formato por defecto, salvo que la WO pida más detalle:

```text
HEAD inicial:
HEAD final:
Commit:
Archivos modificados:
Tests:
Push:
Working tree:
Desviaciones:
```

## 9. Uso recomendado a partir de WO7D

A partir de WO7D, los prompts operativos deben:

- referenciar este protocolo
- evitar repetir todo el contexto histórico salvo que afecte a la WO concreta
- declarar solo las restricciones o comprobaciones adicionales que difieran del protocolo base

Esto permite prompts más compactos sin perder controles de rama, diff, validación ni gobierno clínico-técnico.
