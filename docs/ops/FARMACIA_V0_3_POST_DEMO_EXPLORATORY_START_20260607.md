# Farmacia Hospitalaria v0.3 — Rama exploratoria post-demo

## Estado

Rama exploratoria post-demo creada desde la demo Farmacia v0.2 congelada.

## Rama base demo

`work/hermes/farmacia-demo-v0-2-candidate-20260606`

## SHA base

`1b7eba7ef6c7c4fe39ec6be5a08315c4c26b6e74`

(Base funcional: `9f54f02`. Último commit: freeze documental `1b7eba7`.)

## Rama post-demo

`work/farmacia-v0-3-post-demo-exploratory-20260607`

## Objetivo

Explorar y desarrollar evoluciones v0.3 sin tocar la demo congelada.

## Principio operativo

La demo v0.2 queda protegida.  
Toda evolución post-demo se hará aquí o en ramas derivadas.

---

## Líneas de trabajo post-demo

### 1. Dashboard longitudinal paciente

Diseñar una visualización longitudinal que integre:

- bandas temporales de tratamiento;
- fármaco;
- principio activo;
- dosis;
- pauta;
- fecha de inicio/fin;
- cambios de dosis/pauta;
- eventos adversos con marcador visual;
- tooltip de evento adverso;
- evolución de PROMs;
- evolución de actividad clínica;
- selector de variable PROM;
- posible doble eje PROM / actividad clínica;
- lectura longitudinal tratamiento-respuesta-eventos.

Variables candidatas para HS:

- DLQI;
- EVA dolor;
- EVA prurito;
- IHS4;
- Hurley;
- localización relevante;
- adherencia;
- efectos adversos;
- analítica/vacunación prebiológica;
- comorbilidades relevantes.

Variables candidatas para Reuma, si se integra más adelante:

- DAS28;
- BASDAI;
- ASDAS;
- HAQ;
- otros índices del módulo correspondiente.

### 2. Dashboard del servicio con filtros analíticos

Diseñar filtros por:

- servicio de origen;
- patología;
- estado clínico;
- remisión/baja actividad/actividad moderada/alta si existe;
- fármaco;
- principio activo;
- dosis;
- pauta;
- PROM;
- rango/valor PROM;
- comorbilidades;
- eventos adversos;
- adherencia;
- sexo;
- edad;
- estado de validación;
- estado de seguimiento.

Inspirarse en el dashboard de Reumatología, sin tocar Reuma hasta WO específica.

### 3. Modelo multi-servicio / multi-tratamiento

Explorar modelo para paciente con:

- varios servicios implicados;
- varias patologías;
- varios tratamientos;
- comorbilidades relevantes;
- medicación concomitante relevante;
- episodios asistenciales longitudinales.

Objetivo futuro: representar al paciente de forma transversal, no solo por episodio o por servicio.

### 4. Catálogo farmacológico transversal

Explorar cómo convertir el catálogo CIMA/local en fuente común para:

- Farmacia;
- Reumatología;
- Dermatología;
- futuros módulos.

Objetivos:

- evitar listas separadas por módulo;
- usar autocomplete común;
- mejorar trazabilidad por marca comercial, principio activo, código nacional y nregistro;
- mantener hoja local especial diferenciada;
- permitir evolución futura hacia actualización automática.

No tocar Reuma todavía.

### 5. CIMA auto-update / GitHub Actions

Continuar deuda técnica CDC-001:

- script Python para actualizar catálogo desde CIMA/AEMPS;
- workflow GitHub Actions;
- control de cambios;
- revisión de fármacos hospitalarios;
- mantenimiento de hoja local especial;
- validación de integridad antes de publicar catálogo.

### 6. Arquitectura futura

Explorar progresivamente:

- separación frontend/datos;
- JSON estático derivado de Excel/CIMA;
- persistencia real solo en fase posterior;
- posible backend;
- base de datos;
- integración hospitalaria futura;
- trazabilidad de cambios;
- auditoría de datos.

---

## Reglas de esta rama

Esta rama sí puede evolucionar funcionalmente en WOs posteriores, pero toda WO debe:

- mantener demo v0.2 congelada intacta;
- evitar datos reales;
- evitar backend hasta decisión explícita;
- no tocar `main` sin PR/revisión;
- no tocar Reuma salvo WO específica;
- documentar decisiones;
- mantener trazabilidad de cambios;
- clasificar hallazgos P0/P1/P2/P3;
- aplicar auditoría PM por capas.

## No objetivos inmediatos

No implementar en esta WO:

- gráfico longitudinal;
- filtros avanzados;
- comorbilidades estructuradas;
- modelo multi-servicio;
- catálogo transversal;
- CIMA auto-update;
- backend;
- persistencia real;
- PR;
- merge.
