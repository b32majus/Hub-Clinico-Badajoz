# Contratos de datos — Módulo Farmacia / Hub Clínico Badajoz

**Versión:** 1.0
**Fecha:** 2026-06-14
**WO asociada:** WO6d (documental)
**Fuente activa:** WO5 — `work/farmacia-wo5-prebiologico-single-source-20260614`

---

## 1. Propósito

Este documento define los contratos de datos estables del módulo de farmacia del Hub Clínico Badajoz. Su objetivo es:

- Establecer qué campos existen, su significado, valores válidos y reglas de normalización.
- Servir como referencia única para importación, exportación y visualización de datos de pautas de administración.
- Documentar la deuda técnica explícita y las reglas para futuras work orders.

Quedan fuera de este contrato: fármacos concomitantes/adicionales en seguimiento, pautas de otros fármacos/biológicos en validación.

---

## 2. Principios generales

1. **Dato visible ≠ dato analítico.** Lo que ve el usuario en la UI puede diferir del valor almacenado para análisis.
2. **Texto libre solo como complemento si existe catálogo.** Si una pauta es reconocible por el catálogo, se normaliza a objeto estructurado; el texto original solo se conserva si es necesario.
3. **Todo campo analítico debe tener:** código estable, label visible, valor analítico si aplica, texto libre complementario.
4. **UI muestra · Mapping estructura · Helpers normalizan · Exportación usa campos planos.** Separación de responsabilidades entre capas.

---

## 3. Contrato de pautas de administración

### Objeto canónico

```js
{
  pauta_codigo: string,         // Código estable del catálogo
  pauta_label: string,          // Label visible para el usuario
  pauta_intervalo_dias: number, // Días aproximados entre administraciones (0 si variable o texto libre)
  pauta_unidad: string,         // Unidad de medida (dias, semanas, meses, variable, texto_libre)
  pauta_otro_texto: string     // Texto original si código = OTRO, vacío en caso contrario
}
```

### Catálogo oficial (12 códigos)

| Código | Label | Días | Unidad |
|---|---|---|---|
| DIARIA | Diaria | 1 | dias |
| CADA_48_HORAS | Cada 48 horas | 2 | dias |
| SEMANAL | Semanal | 7 | semanas |
| CADA_2_SEMANAS | Cada 2 semanas | 14 | semanas |
| CADA_4_SEMANAS | Cada 4 semanas | 28 | semanas |
| MENSUAL | Mensual | 30 | meses |
| CADA_6_SEMANAS | Cada 6 semanas | 42 | semanas |
| CADA_8_SEMANAS | Cada 8 semanas | 56 | semanas |
| CADA_12_SEMANAS | Cada 12 semanas | 84 | semanas |
| SEMESTRAL | Semestral | 180 | meses |
| SEGUN_FASE | Según fase / inducción-mantenimiento | 0 | variable |
| OTRO | Otra pauta | 0 | texto_libre |

**Nota:** `pauta_intervalo_dias` es valor aproximado para exportación analítica. No sustituye prescripción clínica. Para pautas SEGUN_FASE y OTRO el valor es 0 porque no es posible determinar un intervalo fijo.

### Propiedades de cada código

| Propiedad | Tipo | Descripción |
|---|---|---|
| `pauta_codigo` | `string` | Código estable, único, en mayúsculas con guiones bajos. Clave primaria del catálogo. |
| `pauta_label` | `string` | Label visible, en español, con capitalización inicial. |
| `pauta_intervalo_dias` | `number` | Días aproximados entre administraciones. Entero ≥ 0. |
| `pauta_unidad` | `string` | Unidad de medida. Valores permitidos: `dias`, `semanas`, `meses`, `variable`, `texto_libre`. |
| `pauta_otro_texto` | `string` | Texto original para código OTRO. Vacío para el resto. |

### Implementación de referencia

El catálogo se define en `scripts/farmacia_pautas_catalog.js` como la constante `PAUTAS_CATALOG` (array de 12 objetos). Se expone al resto del sistema mediante `window.FarmaciaPautasCatalog`.

---

## 4. Reglas de normalización

### Algoritmo general (`normalizePautaLabel` en `farmacia_pautas_catalog.js`)

```
1. Si texto es null o vacío → return null (no se normaliza)
2. Buscar coincidencia exacta por label (normalizado: lowercase, NFD, no diacríticos, no no-alphanum)
3. Si no hay coincidencia exacta, buscar por patrón regex:
   a. Si contiene "según fase", "inducción", "mantenimiento", múltiples pautas o saltos de línea → SEGUN_FASE
   b. Si coincide con algún patrón del catálogo → código correspondiente
4. Si no hay coincidencia → OTRO + pauta_otro_texto = texto original
```

### Tabla de casos de normalización (30 casos)

| # | Texto de entrada | pauta_codigo | pauta_label | pauta_intervalo_dias | pauta_unidad | pauta_otro_texto |
|---|---|---|---|---|---|---|
| 1 | `""` (vacío) | `null` | — | — | — | — |
| 2 | `"Diaria"` | `DIARIA` | Diaria | 1 | dias | |
| 3 | `"SC / diaria"` | `DIARIA` | Diaria | 1 | dias | |
| 4 | `"cada 48 horas"` | `CADA_48_HORAS` | Cada 48 horas | 2 | dias | |
| 5 | `"cada 48h"` | `CADA_48_HORAS` | Cada 48 horas | 2 | dias | |
| 6 | `"Semanal"` | `SEMANAL` | Semanal | 7 | semanas | |
| 7 | `"SC / semanal"` | `SEMANAL` | Semanal | 7 | semanas | |
| 8 | `"1 vez por semana"` | `SEMANAL` | Semanal | 7 | semanas | |
| 9 | `"Cada 2 semanas"` | `CADA_2_SEMANAS` | Cada 2 semanas | 14 | semanas | |
| 10 | `"SC / cada 2 semanas"` | `CADA_2_SEMANAS` | Cada 2 semanas | 14 | semanas | |
| 11 | `"c/2 sem"` | `CADA_2_SEMANAS` | Cada 2 semanas | 14 | semanas | |
| 12 | `"Cada 4 semanas"` | `CADA_4_SEMANAS` | Cada 4 semanas | 28 | semanas | |
| 13 | `"SC / cada 4 semanas"` | `CADA_4_SEMANAS` | Cada 4 semanas | 28 | semanas | |
| 14 | `"c/4 sem"` | `CADA_4_SEMANAS` | Cada 4 semanas | 28 | semanas | |
| 15 | `"Mensual"` | `MENSUAL` | Mensual | 30 | meses | |
| 16 | `"cada mes"` | `MENSUAL` | Mensual | 30 | meses | |
| 17 | `"SC / cada 6 semanas"` | `CADA_6_SEMANAS` | Cada 6 semanas | 42 | semanas | |
| 18 | `"c/6 sem"` | `CADA_6_SEMANAS` | Cada 6 semanas | 42 | semanas | |
| 19 | `"SC / cada 8 semanas"` | `CADA_8_SEMANAS` | Cada 8 semanas | 56 | semanas | |
| 20 | `"IV cada 8 semanas"` | `CADA_8_SEMANAS` | Cada 8 semanas | 56 | semanas | |
| 21 | `"c/8 sem"` | `CADA_8_SEMANAS` | Cada 8 semanas | 56 | semanas | |
| 22 | `"SC / cada 12 semanas"` | `CADA_12_SEMANAS` | Cada 12 semanas | 84 | semanas | |
| 23 | `"c/12 sem"` | `CADA_12_SEMANAS` | Cada 12 semanas | 84 | semanas | |
| 24 | `"cada 6 meses"` | `SEMESTRAL` | Semestral | 180 | meses | |
| 25 | `"Dias 1 y 15 cada 6 meses"` | `SEMESTRAL` | Semestral | 180 | meses | |
| 26 | `"según fase"` / `"segun fase"` | `SEGUN_FASE` | Según fase / inducción-mantenimiento | 0 | variable | |
| 27 | `"inducción mantenimiento"` / `"induccion mantenimiento"` | `SEGUN_FASE` | Según fase / inducción-mantenimiento | 0 | variable | |
| 28 | `"SC / semanal según fase"` | `SEGUN_FASE` | Según fase / inducción-mantenimiento | 0 | variable | |
| 29 | `"L2 semanal + L3 semestral"` (múltiples pautas) | `SEGUN_FASE` | Según fase / inducción-mantenimiento | 0 | variable | |
| 30 | `"Texto inventado"` (no reconocido) | `OTRO` | Otra pauta | 0 | texto_libre | "Texto inventado" |

### Reglas detalladas de normalización

1. **Vacío o nulo:** `null` o `""` → la función devuelve `null`. No se genera objeto pauta.
2. **Reconocido por label exacto:** si el texto normalizado coincide exactamente con el label de algún código del catálogo → devuelve copia del objeto canónico.
3. **Reconocido por patrón regex:** si el texto normalizado coincide con algún patrón de `PAUTA_REGEX_PATTERNS` → devuelve copia del objeto canónico correspondiente.
4. **No reconocido:** si no hay coincidencia ni por label ni por patrón → código `OTRO`, `pauta_otro_texto` = texto original.
5. **SEGUN_FASE:** se activa si el texto normalizado contiene "segun fase", "induccion" o "mantenimiento", o si el texto original contiene saltos de línea, o si el texto coincide con más de un patrón regex del catálogo (múltiples pautas).
6. **Múltiples pautas:** si el texto coincide con varios patrones del catálogo (ej. "L2 semanal + L3 semestral") → se considera `SEGUN_FASE`. No se descompone en pautas independientes ni se elige una sobre otra.
7. **Saltos de línea:** si el texto original contiene `\n` se considera múltiples pautas → `SEGUN_FASE`.
8. **Prefijos de vía de administración:** prefijos como "SC", "IV", "IM" seguidos de separador (`/`, ` `) se ignoran en la normalización (ej. "SC / cada 4 semanas" → `CADA_4_SEMANAS`).

### Patrones regex por código

| Código | Patrones |
|---|---|
| DIARIA | `\b(diaria\|diario\|cada\s+dia)\b` |
| CADA_48_HORAS | `\bcada\s+48\s*(horas\|h)\b`, `\b48\s*h\b` |
| SEMANAL | `\bsemanal\b`, `\b1\s+vez\s+por\s+semana\b` |
| CADA_2_SEMANAS | `\bcada\s+2\s+semanas\b`, `\bc\s*2\s*sem(?:anas)?\b` |
| CADA_4_SEMANAS | `\bcada\s+4\s+semanas\b`, `\bc\s*4\s*sem(?:anas)?\b` |
| CADA_6_SEMANAS | `\bcada\s+6\s+semanas\b`, `\bc\s*6\s*sem(?:anas)?\b` |
| CADA_8_SEMANAS | `\bcada\s+8\s+semanas\b`, `\bc\s*8\s*sem(?:anas)?\b`, `\biv\s+cada\s+8\s+semanas\b` |
| CADA_12_SEMANAS | `\bcada\s+12\s+semanas\b`, `\bc\s*12\s*sem(?:anas)?\b` |
| MENSUAL | `\bmensual\b`, `\bcada\s+mes\b` |
| SEMESTRAL | `\bsemestral\b`, `\bcada\s+6\s+meses\b` |

**Nota:** SEGUN_FASE y OTRO no tienen patrones propios; se resuelven por exclusión y reglas semánticas.

---

## 5. Compatibilidad legacy

El campo `pauta` (texto plano original) se mantiene en el objeto paciente para compatibilidad con código legacy.

Reglas de derivación:
- Si la pauta es reconocida por el catálogo → `pauta` se deriva de `pauta_label` del código correspondiente.
- Si la pauta es `OTRO` → `pauta` conserva el texto original.
- Si la pauta es `SEGUN_FASE` → `pauta` se deriva de `pauta_label` ("Según fase / inducción-mantenimiento").

No eliminar el campo `pauta`. Los nuevos campos (`pauta_codigo`, `pauta_label`, `pauta_intervalo_dias`, `pauta_unidad`, `pauta_otro_texto`) son adicionales y conviven con el campo legacy.

Para obtener el label legacy desde un objeto pauta estructurado se usa `getLegacyPautaLabel()`:
- Si `pauta_codigo === "OTRO"` y `pauta_otro_texto` tiene valor → devuelve `pauta_otro_texto`.
- Si `pauta_label` existe → devuelve `pauta_label`.
- Si solo `pauta_codigo` existe → busca en el catálogo y devuelve su label.
- Por defecto → `""`.

---

## 6. Contrato importación Excel

Al importar un paciente desde Excel (vía `FarmaciaDemo.buildImportedPatientCandidate` en `farmacia_common.js`), se generan los siguientes campos a partir del campo `pauta` del Excel:

| Campo en BD | Origen | Tipo |
|---|---|---|
| `pauta` | `row.pauta` → normalizado si reconocido, texto original si OTRO | `string` |
| `pauta_estructurada` | Objeto resultado de `normalizePautaString` | `object` |
| `pauta_codigo` | `pauta_estructurada.pauta_codigo` | `string` |
| `pauta_label` | `pauta_estructurada.pauta_label` | `string` |
| `pauta_intervalo_dias` | `pauta_estructurada.pauta_intervalo_dias` | `number` |
| `pauta_unidad` | `pauta_estructurada.pauta_unidad` | `string` |
| `pauta_otro_texto` | `pauta_estructurada.pauta_otro_texto` | `string` |

Si el campo `pauta` del Excel está vacío, no se generan `pauta_estructurada`, `pauta_codigo`, `pauta_label`, `pauta_intervalo_dias`, `pauta_unidad` ni `pauta_otro_texto`. El campo `pauta` permanece vacío.

### Mapeo de columnas Excel

| Columna Excel | Campo destino |
|---|---|
| `pauta` | `pauta` + normalización a campos planos |
| `cip` | `cip` |
| Otras columnas clínicas | Según contrato de validación prebiológica |

---

## 7. Contrato exportación CSV/Excel

Al exportar datos, los campos de pauta se incluyen como columnas planas:

| Columna CSV | Contenido |
|---|---|
| `Pauta` | Label legacy (`getLegacyPautaLabel()`) |
| `PautaCodigo` | `pauta_codigo` o vacío |
| `PautaLabel` | `pauta_label` o vacío |
| `PautaIntervaloDias` | `pauta_intervalo_dias` o vacío |
| `PautaUnidad` | `pauta_unidad` o vacío |
| `PautaOtroTexto` | `pauta_otro_texto` o vacío |

La columna legacy `Pauta` se mantiene para no romper exportaciones existentes. Las columnas nuevas se añaden a continuación.

---

## 8. Storage

Los datos importados (pacientes, pautas normalizadas) se almacenan en **sessionStorage**, no en localStorage.

**Motivación:**
- Evitar datos obsoletos entre sesiones.
- Forzar recarga de datos al abrir la aplicación.
- Reducir discrepancias entre sesiones de distintos usuarios en el mismo navegador.

**Funciones de acceso** (en `farmacia_common.js`):
- `safeGetSessionStorage(key)` — lectura con try/catch
- `safeSetSessionStorage(key, value)` — escritura con try/catch
- `safeRemoveSessionStorage(key)` — borrado con try/catch

**Fallback en memoria:** si sessionStorage no está disponible (entorno restrictivo), se usa `SESSION_STORAGE_FALLBACK`, un objeto en memoria.

**Lectura de datos importados:** `readImportedDataset()` en `farmacia_common.js`:
1. Intenta leer de sessionStorage.
2. Si no hay datos, usa `SESSION_STORAGE_FALLBACK[kind]`.
3. Si no hay fallback, retorna array vacío.

---

## 9. Deuda explícita

Quedan fuera del alcance de WO6 y de este contrato:

1. **Pautas de otros fármacos/biológicos en validación:** el catálogo actual cubre las pautas normalizadas del módulo de farmacia. Otros fármacos con regímenes de dosificación diferentes no están contemplados.
2. **Fármacos concomitantes/adicionales en seguimiento:** los contratos de datos para fármacos concomitantes y adicionales están fuera del alcance. Motivo: evitar reabrir lógica de separación clínica ya validada en WOs anteriores.
3. **Reglas de inducción-mantenimiento complejas:** `SEGUN_FASE` es un cajón único. No se modelan sub-estados de inducción vs mantenimiento.
4. **Combinaciones de pautas:** no se descomponen textos con múltiples pautas en objetos independientes. Todo se resuelve como `SEGUN_FASE`.

---

## 10. Tests asociados

| Test | Archivo | Descripción |
|---|---|---|
| Pautas catalog check | `tools/farmacia_pautas_catalog_check.mjs` | Verifica catálogo (12 elementos, propiedades, códigos únicos, 6 funciones expuestas, 27+ casos de normalización) |
| Common check | `tools/farmacia_common_check.mjs` | Verifica `buildImportedPatientCandidate` con casos A (pauta reconocible), B (texto libre), C (vacío) y campos planos |
| Storage policy check | `tools/farmacia_storage_policy_check.mjs` | Verifica uso de sessionStorage (no localStorage), existencia de safeGet/Set/RemoveSessionStorage, fallback memoria, normalización de pautas |
| Syntax check | `node --check scripts/farmacia_pautas_catalog.js` | Verifica sintaxis JS del catálogo |

---

## 11. Reglas para futuras WOs

1. **Nueva pauta → actualizar catálogo + contrato + tests + exportación.** Cualquier nuevo código de pauta debe añadirse al array `PAUTAS_CATALOG`, a este documento de contrato, a los tests de verificación y a la exportación CSV/Excel.
2. **No cambiar significado de código existente.** Una vez establecido, un `pauta_codigo` no puede cambiar su `pauta_label`, `pauta_intervalo_dias` o `pauta_unidad`. Si el significado cambia, crear un nuevo código y deprecar el anterior.
3. **Deprecar, no reutilizar.** Los códigos obsoletos se marcan como deprecated en el catálogo pero no se eliminan ni se reasignan a otros significados.
4. **No usar labels como clave primaria.** `pauta_codigo` es la clave primaria estable. `pauta_label` puede cambiar sin previo aviso (ej. ajustes de redacción).
5. **No mezclar vía con pauta.** La vía de administración (SC, IV, IM, oral, etc.) es un campo conceptualmente distinto de la pauta. No deben concatenarse en el mismo campo.
6. **No interpretar inducción/mantenimiento como frecuencia simple.** `SEGUN_FASE` no tiene un intervalo de días fijo. No forzar un valor numérico donde no existe.
7. **No mapear combinaciones complejas a frecuencia única.** Textos con múltiples pautas, escalados de dosis o regímenes variables deben resolverse como `SEGUN_FASE`, no como una frecuencia simple arbitraria.
