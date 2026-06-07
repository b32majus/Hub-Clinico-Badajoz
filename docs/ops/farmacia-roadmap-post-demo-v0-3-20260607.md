# Roadmap post-demo — Farmacia Hospitalaria v0.3
**Fecha:** 2026-06-07
**Status:** pending_review
**Documento base:** `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`

> ⚠️ Este documento describe líneas de evolución para v0.3. **Nada de lo aquí recogido se implementa en la WO actual.** Es un documento de planificación post-demo, no una orden de ejecución.

---

## 1. Dashboard longitudinal paciente v0.3

Evolución del dashboard paciente actual hacia una vista temporal completa:

- **Bandas temporales:** Línea de vida del paciente con segmentación por episodio (diagnóstico, inicio tratamiento, cambio, suspensión). Visualización en timeline horizontal o carrusel de periodos.
- **Eventos:** Hitos clínicos (visitas, validaciones, cambios de fármaco, pruebas) pinchables que abran detalle. Filtrables por tipo de evento.
- **Evolución PROMs:** Gráfico de evolución de scores (DAS28, BASDAI, HAQ) sobre la línea temporal. Curvas superpuestas por dominio clínico.
- **Selector de variables:** Panel que permita al clínico elegir qué variables mostrar en el timeline (fármaco activo, actividad, PROMs, adherencia, analítica). Persistencia de selección en sesión.

**Dependencias:** Necesita que el modelo de datos permita asociar eventos a fechas. El paciente debe poder tener múltiples eventos en una misma visita.

---

## 2. Dashboard servicio con filtros analíticos

Vista agregada del servicio (reumatología, farmacia) con capacidad de filtrado cruzado:

- **Servicio:** Selector de servicio hospitalario (Reumatología, Farmacia, Enfermería). Cada servicio ve sus paneles.
- **Patología:** Filtro por patología (HS, AR, PsA, LES, Sjögren). Muestra solo pacientes de esa patología.
- **Fármaco:** Filtro por principio activo o nombre comercial. Muestra pacientes bajo ese tratamiento.
- **PROM:** Filtro por rango de score PROM. Útil para identificar pacientes con mala evolución.
- **Adherencia:** Filtro por nivel Morisky-Green (alta/baja/medio). Cruce con PROM para detectar abandonos silenciosos.
- **Período:** Selector de rango de fechas para acotar los datos mostrados.

**Salida esperada:** Tabla/resumen de pacientes que cumplen los filtros, con acceso rápido al dashboard individual.

---

## 3. Modelo multi-servicio / multi-tratamiento

El modelo actual asume un paciente → un servicio → un tratamiento. v0.3 debe soportar:

- **Multi-servicio:** Un paciente puede estar en Reumatología y Farmacia simultáneamente. Cada servicio ve sus propios formularios y eventos.
- **Multi-tratamiento:** Un paciente puede tener varios fármacos activos (p.ej., FAME biológico + FAME sintético + AINE). Cada tratamiento tiene su propio seguimiento, validación y eventos.
- **Visibilidad cruzada:** Un evento en Farmacia (validación, cambio de dosis) debe aparecer en la timeline que ve Reumatología.
- **Separación lógica de datos:** Cada servicio escribe en su espacio; la capa de presentación agrega.

**Impacto:** Cambio significativo en modelo de datos. Requiere decisión arquitectónica (backend, estructura JSON, base de datos) antes de implementar.

---

## 4. Catálogo farmacológico transversal

Base de datos de fármacos común a todos los módulos:

- **Fuente primaria:** Integración con CIMA (AEMPS) para datos oficiales de medicamentos. Alternativa: carga local de catálogo estático actualizable.
- **Información por fármaco:** Principio activo, nombre comercial, dosis presentación, vía de administración, indicaciones, contraindicaciones básicas.
- **Transversal:** Un mismo catálogo usado por Reumatología, Farmacia y Enfermería. Cambios en el catálogo afectan a todos los módulos.
- **Modo desconectado:** El catálogo debe poder funcionar sin conexión a CIMA (copia local con versión y fecha de actualización).
- **Búsqueda:** Autocompletado por nombre comercial o principio activo con selección rápida.

**Dependencia:** Es prerrequisito para multi-tratamiento (necesitas un catálogo común para referenciar fármacos entre servicios).

---

## Propuesta de prioridad / secuencia v0.3

| Orden | Bloque | Depende de | Riesgo |
|-------|--------|------------|--------|
| 1 | Catálogo farmacológico transversal | — | Bajo: es dato, no lógica clínica |
| 2 | Dashboard servicio con filtros | Catálogo (para filtro por fármaco) | Medio: requiere agregación de datos |
| 3 | Dashboard longitudinal paciente | Catálogo (eventos con fármaco) + modelo multi | Medio-alto: integración con timeline |
| 4 | Modelo multi-servicio/multi-tratamiento | Catálogo | Alto: cambio arquitectónico |

**Nota:** El orden refleja dependencias técnicas. Un MVP de v0.3 podría entregar (1) y (2) en una primera iteración, dejando (3) y (4) para iteraciones posteriores.

---

## Fuera de alcance ahora

- Backend real con API REST. Hasta nueva decisión, se mantiene el modelo de datos hardcodeado o carga JSON plana.
- Integración con sistemas hospitalarios (JARA, SES, Pharmatool). Pendiente de decisión de producto.
- Autenticación y autorización. Tampoco se aborda ahora.
- Migración a framework (React, Svelte, etc.). Se mantiene vanilla JS.
- Persistencia en base de datos. Los datos se pierden al cerrar sesión.
- Datos reales de pacientes. Solo datos sintéticos/demo.
- Cualquier cambio en los módulos de Reumatología v0.2 (congelados para la demo).
- Tests automatizados end-to-end. Se documentan aquí como necesidad futura pero no se implementan.

---

## Prerrequisitos para comenzar v0.3

1. Decisión de producto sobre **modelo de datos**: ¿seguimos con JSON plano? ¿CSV? ¿migramos a Supabase/SQLite?
2. Decisión sobre **catálogo CIMA**: ¿integración vía API o carga estática? La primera requiere backend; la segunda es más rápida para demo.
3. Decisión sobre **multi-servicio**: ¿misma app con selector o apps separadas por servicio? Impacta en routing y sidebar.

Sin estas tres decisiones, cualquier implementación corre el riesgo de tener que reescribirse.

---

*Documento generado: T6 — Roadmap post-demo v0.3, 2026-06-07. Builder: DeepSeek v4 Flash.*
