# Farmacia v0.4 — Causalidad de efectos adversos

Fecha: 2026-06-11
Estado: propuesta funcional para prototipo demo
Ámbito: Farmacia Hospitalaria, entorno español, sin backend

## 1. Objetivo

Permitir registrar un efecto adverso y estimar su relación causal con uno o varios biológicos sospechosos mediante:

- algoritmo de Naranjo;
- algoritmo del Sistema Español de Farmacovigilancia / Karch-Lasagna modificado.

## 2. Recomendación operativa

Algoritmo principal recomendado para este prototipo:

- `Sistema Español / Karch-Lasagna modificado`

Razones funcionales:

- encaja mejor con el contexto español de Farmacia Hospitalaria;
- es más alineable con evaluación clínica estructurada y farmacovigilancia local;
- facilita justificar causalidad con secuencia temporal, retirada, reexposición y causas alternativas;
- es más interpretable para revisión clínica interna que una puntuación cerrada sin contexto narrativo.

Algoritmo secundario opcional:

- `Naranjo`, útil como contraste y estandarización rápida.

## 3. Algoritmo de Naranjo

## 3.1 Preguntas necesarias

Se recomienda capturar 10 respuestas cerradas:

1. ¿Existen informes concluyentes previos de esta reacción?
2. ¿El EA apareció después de administrar el fármaco?
3. ¿La reacción mejoró al retirar el fármaco o administrar antagonista?
4. ¿La reacción reapareció al reintroducir el fármaco?
5. ¿Existen causas alternativas que expliquen la reacción?
6. ¿La reacción reapareció con placebo?
7. ¿Se detectó el fármaco en concentraciones tóxicas?
8. ¿La reacción fue más grave al aumentar dosis o menor al reducirla?
9. ¿Hubo reacción similar previa con el mismo o similar fármaco?
10. ¿El EA se confirmó con evidencia objetiva?

## 3.2 Puntuación

Cada pregunta se registra como `si`, `no` o `desconocido/no aplica` con la puntuación definida por el algoritmo.

Referencia funcional SEFH usada en esta WO:

- q1 estudios previos: `si=1`, `no=0`, `desc/NA=0`
- q2 relación temporal tras administración: `si=2`, `no=-1`, `desc/NA=0`
- q3 mejora tras retirada/antagonista: `si=1`, `no=0`, `desc/NA=0`
- q4 reaparición con readministración: `si=2`, `no=-1`, `desc/NA=0`
- q5 causas alternativas: `si=-1`, `no=2`, `desc/NA=0`
- q6 reaparición con placebo: `si=-1`, `no=1`, `desc/NA=0`
- q7 concentraciones tóxicas objetivadas: `si=1`, `no=0`, `desc/NA=0`
- q8 relación con aumento/disminución de dosis: `si=1`, `no=0`, `desc/NA=0`
- q9 reacción similar previa: `si=1`, `no=0`, `desc/NA=0`
- q10 evidencia objetiva: `si=1`, `no=0`, `desc/NA=0`

## 3.3 Categorías funcionales

- `definitiva`: >9
- `probable`: 5–8
- `posible`: 1–4
- `dudosa`: <1

## 4. Sistema Español / Karch-Lasagna modificado

## 4.1 Criterios necesarios

Registrar estos bloques:

1. secuencia temporal;
2. conocimiento previo de la reacción;
3. retirada del fármaco;
4. reexposición;
5. causas alternativas;
6. factores contribuyentes;
7. exploraciones complementarias.

Nota de fuente:

- la referencia SEFH aportada en esta sesión confirma la base Karch-Lasagna de 7 preguntas y la lógica de decisión clásica;
- la tabla exacta del Sistema Español / Karch-Lasagna modificado no está transcrita como tabla HTML reutilizable en esa página, por lo que el prototipo v0.4 implementa una calculadora básica alineada con las categorías funcionales, no una reproducción normativa cerrada.

## 4.2 Puntuación y categorías

- `≤0`: improbable / no relacionada
- `1–3`: condicional
- `4–5`: posible
- `6–7`: probable
- `≥8`: definida

## 4.3 Interpretación funcional

Este algoritmo exige que la UI no sea solo una suma. Debe dejar visibles:

- respuestas concretas;
- puntuación final;
- categoría final;
- comentario clínico breve.

## 5. Modelo de datos propuesto

Cada evento adverso puede incluir:

```json
{
  "id": "EA-FH-003",
  "cip": "CIP-DEMO-FH-003",
  "fecha": "2026-06-09",
  "tipo": "Infeccion respiratoria",
  "gravedad": "moderado",
  "descripcion_corta": "Cuadro infeccioso con necesidad de suspension temporal.",
  "sospechosos": [
    {
      "linea_id": "BIO-FH-003-L2",
      "tratamiento_id": "TRAT-FH-003-B",
      "rol": "sospechoso_principal"
    },
    {
      "linea_id": "BIO-FH-003-L3",
      "tratamiento_id": "TRAT-FH-003-C",
      "rol": "sospechoso_secundario"
    }
  ],
  "causalidad": {
    "algoritmo_principal": "sefh_karch_lasagna_mod",
    "algoritmos": {
      "sefh_karch_lasagna_mod": {
        "puntuacion": 6,
        "categoria": "probable",
        "respuestas": {
          "secuencia_temporal": 2,
          "conocimiento_previo": 1,
          "retirada": 1,
          "reexposicion": 0,
          "causas_alternativas": 1,
          "factores_contribuyentes": 0,
          "exploraciones_complementarias": 1
        }
      },
      "naranjo": {
        "puntuacion": 4,
        "categoria": "posible",
        "respuestas": {
          "q1": 1,
          "q2": 2,
          "q3": 1
        }
      }
    }
  }
}
```

## 6. UI propuesta

Para seguimiento:

- selector de algoritmo principal;
- checklist o radios por criterio;
- puntuación automática;
- categoría visible;
- multiselección de biológicos sospechosos;
- resumen legible para exportación.

Orden recomendado:

1. indicar si hay EA;
2. describir EA;
3. marcar biológicos sospechosos;
4. responder causalidad;
5. mostrar resultado.

## 7. Reglas de UI para el prototipo

- por defecto usar `Sistema Español / Karch-Lasagna modificado`;
- Naranjo puede quedar disponible como alternativa;
- si no hay sospechoso seleccionado, mostrar evaluación no concluyente;
- si hay varios sospechosos, la causalidad se interpreta a nivel del episodio, no como sentencia definitiva por cada línea individual;
- no usar texto en HTML incrustado por `innerHTML`;
- construir el bloque con DOM seguro.

## 8. Exportación TXT/CSV

TXT:

- incluir EA, sospechosos, algoritmo, puntuación, categoría y respuestas.

CSV:

- `ea_detectado`
- `ea_descripcion`
- `ea_gravedad`
- `ea_sospechosos`
- `ea_algoritmo`
- `ea_puntuacion`
- `ea_categoria`
- `ea_respuestas_resumen`

Si hay varios sospechosos:

- serializar como `linea_id:nombre | linea_id:nombre`.

## 9. Estado actual de implementación

- Prototipo básico.
- No sustituye evaluación clínica/farmacovigilancia.
- Pendiente de transcribir matriz exacta del Sistema Español si Farmacia decide usarlo como estándar.
- Naranjo queda documentado, no activo como calculadora en esta versión.

## 10. Decisión para este prototipo v0.4

Implementación mínima segura recomendada:

- prototipo funcional básico de `Sistema Español / Karch-Lasagna modificado`, sin presentarlo como matriz oficial completa;
- estructura preparada para añadir Naranjo;
- exportación de puntuación, categoría y sospechosos;
- visualización en dashboard del resultado de causalidad cuando exista.

## 11. Riesgos y límites

- la causalidad sigue siendo una ayuda documental y no una conclusión clínica definitiva;
- no sustituye notificación formal de farmacovigilancia;
- en multibiológico simultáneo la atribución puede ser compartida o incierta;
- reexposición y exploraciones pueden quedar no evaluables en demos cortas.
