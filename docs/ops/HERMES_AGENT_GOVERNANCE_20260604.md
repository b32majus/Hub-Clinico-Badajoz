# Dossier de gobernanza operativa — Hermes, agentes y VPS

**Fecha:** 2026-06-04  
**Versión:** 1.0  
**Proyecto:** Hub Clínico Reuma / PROMueve Extremadura  
**Repositorio:** `b32majus/Hub-Clinico-Badajoz`  
**Rama base actual:** `feature/reuma-v2-prebiologico-fh-les-sjogren`  
**Documento relacionado:** `docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md`  
**Estado:** Documento vivo de gobernanza para trabajo con agentes en VPS KairOS/Hermes

---

## 0. Resumen ejecutivo

Este documento define la forma de trabajar con agentes en el VPS de KairOS/Hermes para el desarrollo del Hub Clínico Reuma.

El objetivo no es que varios agentes editen el repositorio de forma libre, sino establecer una cadena operativa controlada:

```text
Sil + Cora
↓
Plan estratégico / Work Order detallada
↓
Hermes PM
↓
Fragmentación en tareas pequeñas
↓
OpenCode CLI Builder
├── DeepSeek v4 Pro para tareas complejas
└── DeepSeek v4 Flash para tareas simples/verdes
↓
Implementación
↓
Auditoría Hermes PM
├── si falla → corrección por Builder
└── si pasa → commit + push a rama de trabajo
↓
Revisión humana Sil/Cora
↓
Merge manual si procede
```

Regla madre:

> **Los agentes ejecutan planes, no redefinen el producto. Toda decisión arquitectónica, clínica o de alcance debe estar documentada en el dossier, en una work order aprobada o ser escalada a Sil/Cora.**

---

## 1. Propósito del sistema

El sistema busca permitir que Hermes y agentes subordinados puedan trabajar de forma autónoma y trazable en tareas técnicas bien acotadas, sin comprometer:

- seguridad clínica;
- privacidad;
- coherencia arquitectónica;
- estabilidad del MVP;
- trazabilidad Git;
- control humano del merge;
- gobernanza del proyecto.

La ambición operativa es que, una vez definido un lote de work orders, Hermes pueda ejecutarlas incluso en ventanas largas de trabajo —por ejemplo, durante la noche— y que Sil/Cora revisen por la mañana:

- qué hizo;
- qué archivos tocó;
- qué pruebas realizó;
- qué falló;
- qué dejó pendiente;
- qué ramas/commits requieren revisión.

---

## 2. Principios operativos

### 2.1. GitHub es la fuente de verdad

El repositorio remoto en GitHub es la fuente de verdad documental y técnica.

El VPS no sustituye GitHub. El VPS actúa como entorno operativo de ejecución de agentes.

```text
GitHub = fuente de verdad
VPS = taller de ejecución
AGENTS.md = constitución operativa
Work Orders = instrucciones aprobadas
Ramas = unidades revisables
Merge = decisión humana
```

---

### 2.2. El VPS no aloja datos reales

El VPS de KairOS/Hermes no debe contener datos reales de pacientes.

Permitido:

- código;
- documentación;
- plantillas;
- datos sintéticos;
- datasets demo artificiales;
- reports de ejecución;
- work orders;
- prompts técnicos.

Prohibido:

- datos reales de pacientes;
- exports clínicos reales;
- identificadores reales;
- datos personales sanitarios;
- credenciales;
- secretos;
- tokens;
- `.env` con claves reales;
- ficheros descargados de sistemas clínicos.

---

### 2.3. Los agentes no hacen merge

Los agentes pueden:

- crear ramas de trabajo;
- modificar archivos dentro del alcance aprobado;
- ejecutar pruebas;
- commitear;
- pushear a ramas de trabajo;
- redactar reportes;
- proponer PR.

Los agentes no pueden:

- hacer merge a `main`;
- hacer merge a ramas release;
- hacer merge a ramas base vivas;
- cerrar PRs;
- borrar ramas estables;
- reescribir historia Git;
- forzar push;
- cambiar arquitectura fuera de work order;
- introducir frameworks nuevos sin aprobación.

Regla:

> **Todo merge requiere revisión explícita de Sil/Cora.**

---

### 2.4. Hermes es PM técnico, no builder principal

Hermes actúa como PM técnico operativo:

- lee contexto;
- entiende la work order;
- fragmenta en subtareas;
- decide si una tarea se delega a Builder;
- selecciona modelo según complejidad;
- audita resultados;
- pide correcciones;
- produce reporte;
- prepara commits/push.

Hermes no debe improvisar producto ni ampliar alcance por iniciativa propia.

---

### 2.5. OpenCode Builder ejecuta, no decide producto

OpenCode CLI ejecuta tareas concretas delegadas por Hermes.

El Builder puede:

- editar código;
- crear archivos;
- modificar documentación;
- ejecutar tests;
- corregir errores;
- explicar diffs técnicos.

El Builder no puede:

- cambiar arquitectura global;
- migrar framework;
- añadir dependencias mayores;
- mover estructura completa;
- modificar ramas base;
- decidir alcance clínico;
- redefinir contratos clínicos sin aprobación.

---

## 3. Roles del sistema

### 3.1. Sil

Responsable de:

- dirección estratégica;
- decisión clínica/funcional;
- validación de entregables;
- aceptación de merges;
- priorización del roadmap;
- contacto institucional;
- decisión sobre alcance.

---

### 3.2. Cora

Responsable de:

- razonamiento estratégico;
- diseño de work orders;
- integración de contexto;
- revisión crítica de arquitectura;
- preparación de dossiers;
- preparación de guiones y criterios de aceptación;
- apoyo a la revisión humana.

Cora no ejecuta trabajo en segundo plano. Cora prepara planes y, cuando tiene herramientas disponibles, puede crear o actualizar documentación/repos bajo instrucción explícita.

---

### 3.3. Hermes PM

Responsable de:

- ejecutar work orders aprobadas;
- dividir en subtareas;
- asignar Builder;
- auditar resultados;
- iterar correcciones;
- generar commits y push;
- dejar reportes claros;
- detenerse ante ambigüedad crítica;
- no exceder alcance.

Hermes debe leer siempre:

```text
AGENTS.md
docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md
docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md
```

Y, según tarea:

```text
docs/RESUMEN_RELEASE_REUMA_V2.md
docs/CONTRATO_DATOS_REUMA_V2.md
docs/PLAN_IMPLEMENTACION_REUMA_V2.md
```

---

### 3.4. OpenCode CLI Builder

Responsable de:

- implementar subtareas pequeñas;
- respetar archivos permitidos/prohibidos;
- devolver resultado a Hermes PM;
- no commitear directamente salvo que Hermes lo autorice;
- no ampliar alcance.

Modelos recomendados:

```text
DeepSeek v4 Flash
├── tareas simples;
├── documentación menor;
├── cambios localizados;
├── validaciones sencillas;
└── refactors pequeños.

DeepSeek v4 Pro
├── cambios multiarchivo;
├── lógica compleja;
├── debugging difícil;
├── diseño técnico;
└── refactor con riesgo.
```

---

### 3.5. Claude Code

Claude Code queda como agente especialista opcional.

Uso recomendado:

- revisión arquitectónica compleja;
- refactor multiarchivo difícil;
- análisis de deuda técnica;
- revisión UX/estructura;
- preparación de migración v3;
- documentación larga.

No forma parte obligatoria del pipeline estándar.

Activación solo si la work order lo permite explícitamente:

```text
Escalado permitido a Claude Code: sí/no
Motivo:
Alcance:
Archivos permitidos:
```

---

## 4. Modelo operativo estándar

### 4.1. Flujo normal

```text
1. Sil/Cora definen objetivo.
2. Cora redacta work order detallada.
3. Work order se guarda en repo o se entrega a Hermes.
4. Hermes lee AGENTS.md + dossier + work order.
5. Hermes fragmenta en subtareas.
6. Hermes decide qué delegar a OpenCode.
7. Builder implementa subtarea.
8. Hermes audita diff y criterios de aceptación.
9. Si hay errores, Hermes pide corrección.
10. Si pasa, Hermes prepara commit.
11. Hermes pushea a rama de trabajo.
12. Hermes deja reporte final.
13. Sil/Cora revisan.
14. Si procede, Sil/Cora hacen merge manual.
```

---

### 4.2. Flujo nocturno

Para permitir trabajo durante la noche:

1. Sil/Cora dejan work orders cerradas y priorizadas.
2. Cada work order debe tener rama propia o lote autorizado.
3. Hermes ejecuta secuencialmente, no en paralelo caótico.
4. Hermes debe detenerse si encuentra ambigüedad clínica, riesgo de arquitectura o fallo repetido.
5. Hermes no debe entrar en bucles de corrección infinitos.
6. Hermes debe generar un reporte matinal.

Regla de parada nocturna:

```text
Si una tarea falla dos veces por el mismo motivo, Hermes marca blocked/pending_review y pasa a la siguiente tarea segura o se detiene si no hay tareas seguras.
```

Reporte matinal esperado:

```text
Resumen ejecutivo
Work orders ejecutadas
Commits generados
Ramas actualizadas
Pruebas realizadas
Errores encontrados
Correcciones aplicadas
Tareas bloqueadas
Decisiones requeridas por Sil/Cora
Recomendación de revisión
```

---

## 5. Política de ramas

### 5.1. Rama base actual

```text
feature/reuma-v2-prebiologico-fh-les-sjogren
```

Es la base funcional viva del proyecto Reuma v2.

---

### 5.2. Ramas de trabajo Hermes

Formato recomendado:

```text
work/hermes/<paquete>-<descripcion-corta>
```

Ejemplos:

```text
work/hermes/mvp-contratos-enfermeria-farmacia
work/hermes/mvp-role-config
work/hermes/mvp-carga-multiarchivo
work/hermes/backend-ready-diccionario-clinico
work/hermes/backend-ready-repository-layer
```

---

### 5.3. Ramas release

Formato recomendado:

```text
release/mvp-luis-bravo-20260708
```

Las ramas release son ramas de estabilización. Los agentes no pueden hacer merge directo a ellas salvo instrucción explícita y revisión posterior obligatoria.

---

### 5.4. Ramas prohibidas para escritura directa

```text
main
release/*
feature/reuma-v2-prebiologico-fh-les-sjogren
```

Salvo work order explícita de documentación o preparación aprobada por Sil/Cora.

---

## 6. Política de commits

### 6.1. Principios

- Commits pequeños.
- Un commit = una unidad revisable.
- Mensajes claros.
- No mezclar documentación, lógica y estilos salvo que la tarea lo exija.
- No commits gigantes con cambios no relacionados.

---

### 6.2. Formato recomendado

```text
docs: add nursing data contract v1
feat: add role selector scaffold
feat: add pharmacy validation form skeleton
fix: correct longitudinal event normalization
refactor: extract clinical repository interface
chore: add synthetic nursing demo rows
```

---

### 6.3. Commits prohibidos

```text
update files
changes
fix stuff
work in progress
massive refactor
final version
```

---

## 7. Política de push y PR

Los agentes pueden hacer push a ramas `work/hermes/*`.

Los agentes no deben abrir PR automáticamente salvo autorización explícita.

Formato recomendado de PR si se autoriza:

```text
Título:
[WO-XXX] Descripción breve

Contenido:
- Objetivo
- Archivos modificados
- Criterios de aceptación
- Pruebas realizadas
- Riesgos
- Pendientes
- Decisiones requeridas
```

---

## 8. Definición de done

Una tarea se considera completa solo si:

- cumple todos los criterios de aceptación;
- no toca archivos prohibidos;
- no introduce datos reales;
- no rompe la v2 funcional;
- queda documentada;
- tiene commit trazable;
- tiene reporte final;
- se han ejecutado pruebas razonables;
- Hermes PM ha auditado el resultado.

---

## 9. Formato de work order

Toda work order debe tener:

```markdown
# Work Order — <ID> — <Título>

## Objetivo

## Contexto

## Rama base

## Rama de trabajo

## Documentos obligatorios de lectura

## Alcance

## Fuera de alcance

## Archivos permitidos

## Archivos prohibidos

## Criterios de aceptación

## Pruebas esperadas

## Política de commits

## Política de push

## Escalado permitido

## Condiciones de parada

## Reporte final esperado
```

---

## 10. Ejemplo de work order correcta

```markdown
# Work Order — WO-001 — Contratos mínimos Enfermería y evento longitudinal

## Objetivo
Crear la primera versión documental del contrato de datos del módulo Enfermería y del evento longitudinal común.

## Rama base
feature/reuma-v2-prebiologico-fh-les-sjogren

## Rama de trabajo
work/hermes/mvp-contratos-enfermeria-evento-v1

## Documentos obligatorios
- AGENTS.md
- docs/DECISIONES_EVOLUCION_HUB_CLINICO_REUMA_20260604.md
- docs/ops/HERMES_AGENT_GOVERNANCE_20260604.md
- docs/CONTRATO_DATOS_REUMA_V2.md

## Alcance
Crear:
- docs/contratos/CONTRATO_ENFERMERIA_REUMA_V1.md
- docs/contratos/CONTRATO_EVENTO_LONGITUDINAL_COMUN_V1.md

## Fuera de alcance
- No tocar HTML.
- No tocar JS.
- No tocar Excel maestro.
- No modificar estilos.
- No crear backend.

## Criterios de aceptación
- Define campos mínimos de Enfermería.
- Distingue datos propios vs datos precargados desde Reuma.
- Incluye mapeo a evento longitudinal común.
- Define obligatorios/opcionales.
- No contiene datos reales.
- No modifica código.

## Pruebas esperadas
- Revisión documental.
- Comprobación de enlaces/rutas.

## Commit esperado
`docs: add nursing and longitudinal event contracts v1`

## Reporte final
Incluir archivos creados, resumen, riesgos y pendientes.
```

---

## 11. Formato de reporte de ejecución Hermes

```markdown
# Hermes Execution Report — <WO-ID>

## Estado
completed / completed_with_notes / blocked / failed

## Resumen ejecutivo

## Rama de trabajo

## Commits generados

## Archivos modificados

## Subtareas ejecutadas

## Builder usado

## Pruebas realizadas

## Resultado de auditoría PM

## Desviaciones del plan

## Riesgos detectados

## Pendientes

## Decisiones requeridas por Sil/Cora

## Recomendación
ready_for_review / needs_human_decision / do_not_merge
```

---

## 12. Criterios de escalado a Sil/Cora

Hermes debe detenerse y escalar si aparece cualquiera de estos casos:

- ambigüedad clínica;
- duda sobre protección de datos;
- necesidad de cambiar arquitectura;
- necesidad de nueva dependencia;
- necesidad de tocar ramas protegidas;
- conflicto Git no trivial;
- cambio de contrato de datos;
- fallo repetido tras dos intentos;
- resultado que puede afectar demo del 8 de julio;
- decisión de producto no documentada.

---

## 13. Paquetes de trabajo recomendados

### Paquete 1 — Gobernanza

```text
AGENTS.md
WORK_ORDER_TEMPLATE.md
HERMES_EXECUTION_REPORT_TEMPLATE.md
política de ramas
política de merge
```

---

### Paquete 2 — Contratos

```text
Contrato módulo Reuma
Contrato módulo Enfermería
Contrato módulo Farmacia
Contrato paciente común
Contrato evento longitudinal común
```

---

### Paquete 3 — MVP funcional v2.1

```text
selector de perfil
carga multiarchivo
formulario Enfermería
dashboard Enfermería
formulario Farmacia
dashboard Farmacia
vista longitudinal multiarchivo
```

---

### Paquete 4 — Backend-ready v2.2

```text
diccionario clínico
repository layer
validación de plantillas Excel
configuración declarativa
separación exportación/persistencia
auditoría mínima
```

---

### Paquete 5 — POC v3

```text
repo separado
modelo DB
datos sintéticos
API mínima
frontend React/TS/Vite
dashboard desde backend
```

---

## 14. Operación en VPS

### 14.1. Ruta recomendada

```text
/srv/kairos-lab/projects/promueve/hub-clinico-badajoz
```

Estructura recomendada:

```text
/srv/kairos-lab/projects/promueve/hub-clinico-badajoz/
├── repo/
├── work-orders/
├── reports/
├── prompts/
└── tmp/
```

---

### 14.2. Clonado inicial recomendado

```bash
mkdir -p /srv/kairos-lab/projects/promueve/hub-clinico-badajoz
cd /srv/kairos-lab/projects/promueve/hub-clinico-badajoz

git clone git@github.com:b32majus/Hub-Clinico-Badajoz.git repo
cd repo

git checkout feature/reuma-v2-prebiologico-fh-les-sjogren
git pull
```

Si SSH a GitHub no está configurado, debe resolverse antes de ejecutar work orders.

---

### 14.3. Seguridad operativa VPS

No tocar:

```text
systemd
Hermes core
.env globales
secretos
configuración SSH
Tailscale
SanitarIA
KairOS core
otros proyectos
```

El trabajo del Hub debe permanecer dentro de:

```text
/srv/kairos-lab/projects/promueve/hub-clinico-badajoz
```

---

## 15. AGENTS.md — contenido mínimo futuro

El `AGENTS.md` del repo debe incluir:

```text
1. Identidad del proyecto.
2. Documentos obligatorios de lectura.
3. Rama base y ramas protegidas.
4. Modelo Hermes PM → OpenCode Builder.
5. Política de ramas.
6. Política de commits.
7. Política de push.
8. Política de merge humano.
9. Datos permitidos/prohibidos.
10. Reglas de arquitectura.
11. Formato de work orders.
12. Formato de reportes.
13. Criterios de escalado.
14. Definición de done.
```

---

## 16. Decisiones pendientes

| Decisión | Impacto | Propuesta inicial |
|---|---:|---|
| Ruta final en VPS | Medio | `/srv/kairos-lab/projects/promueve/hub-clinico-badajoz` |
| Método GitHub auth | Alto | SSH con permisos mínimos |
| Si Hermes puede abrir PR | Medio | No inicialmente; solo push rama |
| Si Hermes puede crear ramas | Medio | Sí, `work/hermes/*` |
| Si Hermes puede ejecutar work orders nocturnas | Alto | Sí, con condiciones de parada |
| Número máximo de correcciones por tarea | Medio | 2 intentos antes de bloquear |
| Uso de Claude Code | Medio | Solo si work order lo permite |
| Primer paquete ejecutable | Alto | Gobernanza + plantillas |
| Primera work order funcional | Alto | Contratos Enfermería/Farmacia/evento común |

---

## 17. Próximos pasos recomendados

Orden correcto antes de ejecutar código:

```text
1. Crear este dossier de gobernanza.
2. Crear AGENTS.md en raíz del repo.
3. Crear plantilla de work order.
4. Crear plantilla de reporte Hermes.
5. Clonar repo en VPS.
6. Validar acceso GitHub desde VPS.
7. Ejecutar primera work order documental.
8. Revisar comportamiento Hermes PM → OpenCode.
9. Ajustar gobernanza.
10. Lanzar work orders funcionales pequeñas.
```

---

## 18. Regla final

> **La velocidad vendrá de la gobernanza, no de soltar agentes antes de tiempo.**

Si la gobernanza es sólida, Hermes puede trabajar durante ventanas largas con seguridad. Si la gobernanza es débil, cada tarea aparentemente rápida generará deuda, riesgo y revisión extra.

Por tanto, antes de construir más funcionalidad, se debe construir primero el sistema de delegación.
