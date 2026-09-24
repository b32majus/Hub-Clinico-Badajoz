# PROMueve Nexus — Revisión arquitectónica independiente / Round 1

**Fecha:** 2026-09-24
**Tipo:** evidencia externa read-only, no autoridad de decisión
**Base verificada por la revisión:** `recovery/farmacia-pr-replay-20260727` @ `ea8b03a0e6895495dff1ec0b9abb2e368c259443`
**QA navegador realizada por la revisión:** no.

> Este documento preserva los hallazgos y recomendaciones que se adjudicaron después. No convierte una recomendación externa en decisión del producto. La autoridad adjudicada vive en `../PROMUEVE_ARCHITECTURE_DECISION_FREEZE_20260924.md` y los ADR asociados.

## 1. Conclusión general de la revisión

La revisión recomendó **mantener el repositorio y evolucionar hacia monolito modular**, pero no aprobar el Foundation tal como se había dibujado inicialmente.

Correcciones principales:

1. Export v2 no es todavía un contrato completo de persistencia clínica.
2. El Read Port Farmacia conserva dependencias de la representación Excel.
3. La configuración necesita límites por propiedad/responsabilidad, no una jerarquía universal de overrides.
4. La Home hospitalaria es adecuada como navegación, no como contenedor de datos clínicos compartidos.
5. Contratos, oráculos y ciclo de vida de datos deben proteger los refactors.

## 2. Hallazgos verificables destacados

### F1 — Read Port Farmacia: seam real, independencia parcial

- el Port y DataSource están implementados y cableados;
- algunos DTO todavía contienen `rows[].canonical_row` o procedencia física;
- consumidores conocen esa estructura;
- contratos implícitamente síncronos;
- búsquedas por CIP pueden recorrer población, diseño poco apropiado para una API restringida.

**Implicación:** preservar la costura, pero no exigir que una futura API simule Excel.

### F2 — El `event` actual no contiene siempre el acto completo

En Primera Visita/Seguimiento, información de líneas y evento común se construyen por caminos que se combinan posteriormente. Persistir solo el `event` actual podría perder líneas.

**Implicación:** el futuro contrato de escritura debe expresar un acto completo, no elevar una representación intermedia de Export v2 a API pública.

### F3 — El core Export v2 no concentra todas las invariantes clínicas

La revisión adversarial comprobó que el core, llamado directamente, puede aceptar combinaciones estructuralmente posibles que el adapter de Validación rechaza clínicamente.

Esto **no demuestra un fallo UI**; demuestra que el core no puede ser la única frontera de seguridad de escritura.

### F4 — Reuma mezcla responsabilidades

Se observaron en `dataManager.js` carga, caché, normalización, consulta, estadísticas y presentación; además:

- recortes de caché por posición/tamaño;
- ausencias de columnas/hojas que pueden permitir continuar;
- conversiones de ausencia a «Sin tratamiento»;
- logs con datos/identificadores.

Estos hallazgos requieren adjudicación separada: refactor y corrección semántica no deben mezclarse.

### F5 — Contrato 497 insuficientemente protegido

`exportManager.js` mezcla mapeo, salida, clipboard/descarga, estado y storage; la validación de longitud puede avisar sin bloquear.

**Implicación:** crear oráculos antes del strangler y distinguir compatibilidad de defectos conocidos.

### F6 — Dependencia de entrada por Reuma

La raíz general era Reuma/Badajoz, pero Farmacia ya podía arrancar mediante entrada propia y el snapshot Cáceres demuestra una entrada Pharmacy-only.

**Implicación:** Home de plataforma es una mejora de composición/navegación, no requisito para que Farmacia exista de forma independiente.

### F7 — Persistencia de navegador heterogénea

Reuma y Farmacia utilizan memoria/Web Storage con políticas diferentes. Debe existir ciclo de vida explícito de workspace y datos antes de piloto.

### F8 — Snapshot Cáceres: disciplina útil, mecanismo específico

Manifest, SHA, allowlist y hashes son valiosos. Sustituciones textuales específicas del builder no deben convertirse en sistema general de configuración hospitalaria.

### F9 — CI cubre menos que el inventario de herramientas

La existencia de scripts/checkers no significa que todos sean gate de PR/release. Reuma carece de protección equivalente suficiente para una migración segura.

## 3. Pasivos arquitectónicos priorizados

| Liability | Frontera necesaria |
|---|---|
| acto repartido entre evento/filas | contrato completo del acto |
| invariantes en adapters de export | dominio común a caminos de escritura |
| DTO con estructura Excel | DTO de aplicación independiente |
| contratos síncronos implícitos | frontera async progresiva |
| globals/Web Storage clínico | ciclo de vida explícito |
| Reuma sin oráculos suficientes | caracterización + aceptación separadas |
| exportar confundido con registrar | resultado explícito de entrega/persistencia |
| hospital como etiqueta | scope hospitalario validado |
| configuración demasiado poderosa | autoridad por propiedad |
| CI/release parcial | matriz de gates por módulo/artefacto |

## 4. Challenge de hipótesis

| Hipótesis | Recomendación Round 1 |
|---|---|
| mismo repo | CONFIRM |
| nueva línea canónica inmediata | MODIFY: decidir autoridad primero |
| monolito modular | CONFIRM |
| reescritura para limpiar | REJECT |
| local-first | CONFIRM |
| Excel soportado | CONFIRM con capabilities reales |
| un código común sin forks | CONFIRM |
| Domain / Metadata / Config | MODIFY: metadata también gobernada |
| `Platform→Module→Site→Module×Site` como override total | REJECT |
| resolver sin deep merge | CONFIRM |
| JSON declarativo = seguro | REJECT |
| Repo JSON inicial | CONFIRM, empaquetado con release |
| config remota inicial | REJECT |
| Read Ports por módulo | CONFIRM, con contratos más completos |
| Farmacia como patrón terminado | MODIFY |
| `commit(event)` público | REJECT |
| evento transversal único | REJECT; envelope técnico mínimo como máximo |
| adapters equivalentes en todo | MODIFY: equivalencia por capabilities |
| strangler Reuma | CONFIRM |
| snapshot como precursor | CONFIRM disciplina, no transformaciones |
| adelantar seams V5 | CONFIRM |
| motor V5 genérico | REJECT |
| vanilla inicialmente | CONFIRM |
| ausencia de tooling | REJECT |
| diferir identidad por completo | MODIFY: diferir integración, definir trust boundaries ya |
| Home hospitalaria | MODIFY: ligera y con acceso directo cuando proceda |
| hospital fijado por deployment | CONFIRM |
| Data Workspace común | MODIFY: readiness técnico, no datos compartidos |

## 5. Arquitectura objetivo propuesta por la revisión

```text
Release hospitalaria (código + config + contratos)
        ↓
Composición validada
   ├── Home/navegación
   ├── Workspace Farmacia → app/domain → Ports → adapters
   └── Workspace Reuma    → app/domain → Ports → adapters

Adapters por módulo/capability
   ├── Excel local
   ├── Cloud API autorizada
   └── Hospital API
```

La shell no consume Ports clínicos ni resuelve pacientes. Los adapters son familias de implementaciones, no un adapter universal de plataforma.

## 6. Configuración — recomendación clave

Tratar Platform, Module, Site y Module×Site como **responsabilidades/documentos tipados**, no como cuatro objetos que se sobreescriben universalmente.

Resolución propuesta:

1. cargar versiones exactas empaquetadas;
2. validar schema y referencias;
3. aplicar solo operaciones permitidas por propiedad;
4. validar invariantes del resultado;
5. congelar configuración efectiva por sesión/artefacto;
6. conservar hash/procedencia.

La configuración no puede contener fórmulas clínicas libres, transiciones, derivaciones terapéuticas ni ocultar requisitos del acto.

## 7. Escritura — recomendación clave

Preferir casos de uso explícitos a `commit(event)` genérico. El acto debe contener todo lo necesario para persistirse, incluidas líneas.

Distinguir al menos:

- `prepared_for_transfer`;
- `persisted`;
- `already_recorded`;
- `conflict`;
- `rejected`;
- `outcome_unknown`.

Registrar un acto, generar documento, copiar representación y confirmar persistencia son operaciones conceptualmente distintas.

## 8. Home hospitalaria

La revisión confirmó:

- hospital fijado por deployment;
- arranque sin datos clínicos;
- carga semántica dentro del módulo;
- readiness resumido por capability;
- `PlatformContext`/registry antes o junto a la Home;
- sin paciente universal;
- acceso directo posible en despliegues de un solo módulo.

Advertencia: carpetas diferentes bajo el mismo origin no aíslan Web Storage ni constituyen autorización.

## 9. Riesgos antes de piloto

Entre otros:

- persistencia clínica en navegador;
- exposición por consola/URL;
- escritura duradera no acreditada;
- identidad/atribución/autorización;
- historia parcial por caché Reuma;
- inferencias por ausencia;
- contratos que solo avisan;
- duplicados/correcciones/concurrencia;
- dependencias externas;
- release equivocada;
- soporte/backup/recuperación;
- ausencia de QA longitudinal asistencial.

## 10. Decisiones institucionales abiertas

La revisión no intentó resolver técnicamente:

- fuente oficial de verdad y significado de «registrado»;
- perfil de ejecución/hosting;
- quién puede leer/validar/corregir/exportar;
- persistencia local permitida;
- identidad de paciente y actor;
- concurrencia;
- gobierno clínico/configuración;
- soporte, backup, continuidad y evaluación regulatoria/institucional.

## 11. Resultado de esta evidencia

La revisión no recomendó parar la evolución: recomendó **acotar Foundation a contratos, oráculos, tooling y seams reales**, manteniendo una Home temprana de alcance ligero. La ronda de alignment siguiente convirtió estas recomendaciones en una secuencia mucho más ejecutable.
