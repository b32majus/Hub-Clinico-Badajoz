# Nightly Farmacia Implementation Report — revisión/corrección PM

Status: pending_review

**Fecha:** 2026-06-06  
**Rama:** `work/hermes/nightly-farmacia-v0-1-20260606`  
**Base:** `feature/reuma-v2-prebiologico-fh-les-sjogren`  
**Objetivo:** preparar una demo funcional de Farmacia Hospitalaria v0.1 para revisión humana antes de la reunión del 2026-06-08.  
**Estado general:** corregido tras auditoría PM; pendiente de revisión de Sil/Cora antes de cualquier merge.

## Resumen ejecutivo

Se revisaron la macro WO original, la auditoría PM y la especificación funcional. La corrección posterior aborda los issues críticos, medios y de estilo detectados:

- `CIP-DEMO-FH-002` ya se trata como paciente demo existente en el buscador.
- Alta guiada y acciones contextuales pasan contexto por URL: `?cip=X&servicio=Y&patologia=Z&entrada=...`.
- Las páginas destino leen query params y precargan CIP/servicio/patología/datos demo cuando existen.
- Validación incluye estado `Pendiente` además de `Validado` y `Denegado`.
- Se elimina el uso de `innerHTML` en los scripts de Farmacia para valores renderizados desde usuario/demo; se usa `textContent` y creación de nodos DOM.
- Profesionales pasan a nombres claramente demo: `Profesional FH-01`, etc.
- Se elimina `<main class="fh-main">`; todas las páginas Farmacia usan `<main class="main-content farmacia-paciente ...">`.
- Se elimina JS inline y estilos inline en páginas Farmacia; la lógica vive en `scripts/farmacia_*.js` y el estilo en `farmacia_style.css`.
- Se añade entrada visible a Farmacia Hospitalaria en la navegación de páginas Reuma principales.

## Commits ejecutados

```text
e1892e0 feat(farmacia): add pharmacy module shell
f029e20 fix(farmacia): update search hint with demo CIPs
2441929 feat(farmacia): add pharmacotherapeutic validation workflow
163e6c4 feat(farmacia): add first pharmacy visit workflow
0f978cc feat(farmacia): add pharmacy follow-up with Morisky-Green
183d5d6 feat(farmacia): add pharmacy patient dashboard with timeline
08a6c53 feat(farmacia): add drug catalog, professionals, stats placeholder and demo CSV dataset
dd0b0fb docs: add nightly pharmacy implementation report
c63286c fix(farmacia): correct demo workflows and hub styling
3687577 fix(farmacia): add pharmacy entry to reuma navigation
62e8c6a docs(farmacia): update implementation report after PM corrections
ca59e9f fix(farmacia): add sri to pharmacy font awesome links
<current> docs(farmacia): update report after SRI correction
```

## WOs revisadas

| WO | Título | Estado tras corrección | Evidencia |
|----|--------|------------------------|-----------|
| WO-017 | Shell UI Farmacia coherente | completed_pending_review | Sidebar completa, logo FH, perfil demo, main-content, estilo SES |
| WO-018 | Buscador CIP + Quick View + alta guiada | completed_pending_review | `scripts/farmacia_index.js`, `scripts/farmacia_common.js` |
| WO-019 | Validación farmacoterapéutica | completed_pending_review | Estado Pendiente, motivo obligatorio si Denegado, TXT/CSV |
| WO-020 | Primera visita Farmacia | completed_pending_review | Precarga por query params y registro demo |
| WO-021 | Seguimiento Farmacia | completed_pending_review | Optimización/suspensión/Morisky/PROMs/EA/aviso cambio fármaco |
| WO-022 | Dashboard paciente | completed_pending_review | Timeline mínima y bloques de validación/visita/seguimiento/PROMs/EA |
| WO-023 | Dataset demo | completed_pending_review | CSVs sintéticos; profesionales renombrados demo |
| WO-024 | Export TXT JARA + CSV | completed_pending_review | Export en `scripts/farmacia_validacion.js` |
| WO-025 | Smoke test + reporte final | completed_pending_review | Verificaciones estáticas ejecutadas y reporte actualizado |

## Correcciones de auditoría PM

### Issues críticos

1. **CIP-DEMO-FH-002 inconsistente** — corregido.  
   `CIP-DEMO-FH-002` existe en `Pacientes.csv` y en el objeto demo común `scripts/farmacia_common.js`.

2. **Alta guiada no pasaba contexto** — corregido.  
   `farmacia_index.js` construye URLs con `cip`, `servicio`, `patologia` y `entrada`.

3. **Falta estado Pendiente** — corregido.  
   `farmacia_validacion.html` incluye `value="pending"`.

4. **XSS por innerHTML** — corregido en scripts Farmacia.  
   Los scripts `scripts/farmacia_*.js` usan `textContent`, `appendChild` y creación explícita de nodos para valores variables.

5. **Dataset CSV y datos JS desacoplados** — mitigado para demo.  
   Sigue existiendo un objeto demo común en JS, pero ahora está centralizado en `scripts/farmacia_common.js`; no hay duplicación por página. La lectura real de CSV queda como mejora futura.

6. **Nombres de profesionales realistas** — corregido.  
   CSV y selector usan `Profesional FH-01`, `Profesional FH-02`, `Profesional FH-03`, `Profesional FH-04`.

### Issues medios

7. **Quick View incompleta** — ampliada.  
   Incluye última solicitud, estado FH, analítica/vacunación, scores, adherencia, EA activos y PROMs.

8. **Acciones contextuales no distinguen estado** — corregido.  
   `pending` ofrece Validación; `validated` ofrece Primera Visita; `followup` ofrece Seguimiento; Dashboard siempre disponible.

9. **Primera visita incompleta** — ampliada.  
   Incluye fecha solicitud/validación, inducción solicitada y estado analítica/vacunación.

10. **Seguimiento incompleto** — ampliado.  
    Incluye indicación, datos previos, PROMs seguimiento, adherencia y EA.

11. **Dashboard incompleto** — ampliado.  
    Incluye resumen, tratamiento actual, estado validación, timeline, primera visita, seguimientos, PROMs, EA, optimizaciones/suspensiones como bloques demo.

12. **Sin entrada desde navegación principal Reuma** — corregido.  
    Añadida sección Farmacia en `index.html`, `dashboard_paciente.html`, `seguimiento.html`, `primera_visita.html`, `estadisticas.html`, `manage_drugs.html`, `manage_professionals.html`.

13. **Errores de estilos inline** — corregido en páginas Farmacia.  
    Verificación: `inline_style=0` en `farmacia_*.html`.

14. **CDN Font Awesome sin SRI** — no corregido.  
    Se mantiene el mismo patrón que el Hub existente para no introducir divergencia de dependencias antes de la demo. Recomendación futura: resolver globalmente para todo el Hub, no solo Farmacia.

15. **Reporte final contaba 17 vs 18 archivos** — corregido conceptualmente.  
    El reporte ya no fija un conteo rígido; lista los archivos relevantes y commits posteriores.

### Issues de estilo/maquetación

16. **Paleta incorrecta** — corregido.  
    `farmacia_style.css` usa `--ses-green`, `--ses-green-dark`, `--ses-green-light`; verificación: `#0056b3` no aparece en CSS Farmacia.

17. **Clases `fh-*` inventadas** — corregido en páginas y CSS reescritos.  
    Farmacia usa clases del patrón Hub: `patient-header-card`, `patient-header-main`, `patient-avatar`, `patient-info`, `info-grid`, `info-field`, `dashboard-card`, `card-title`, `btn`, `status-badge`.

18. **Layout diferente (`fh-main`)** — corregido.  
    Todas las páginas Farmacia usan `main-content farmacia-paciente`.

19. **Sidebar incompleta** — corregido.  
    Incluye `user-block`, `search-container`, `db-status-indicator`, navegación y footer.

20. **JS inline** — corregido.  
    Nuevos scripts separados:
    - `scripts/farmacia_common.js`
    - `scripts/farmacia_index.js`
    - `scripts/farmacia_validacion.js`
    - `scripts/farmacia_primera_visita.js`
    - `scripts/farmacia_seguimiento.js`
    - `scripts/farmacia_dashboard_paciente.js`

21. **Logo inconsistente** — corregido/ajustado.  
    Se conserva el mismo estilo visual de `logo-circle` y `logo-text`, con texto `FH` para Farmacia Hospitalaria.

## Archivos principales modificados

### Páginas Farmacia

- `farmacia_index.html`
- `farmacia_validacion.html`
- `farmacia_primera_visita.html`
- `farmacia_seguimiento.html`
- `farmacia_dashboard_paciente.html`
- `farmacia_estadisticas.html`
- `farmacia_farmacos.html`
- `farmacia_profesionales.html`

### Estilo y lógica

- `farmacia_style.css`
- `scripts/farmacia_common.js`
- `scripts/farmacia_index.js`
- `scripts/farmacia_validacion.js`
- `scripts/farmacia_primera_visita.js`
- `scripts/farmacia_seguimiento.js`
- `scripts/farmacia_dashboard_paciente.js`

### Datos demo

- `data/farmacia_demo/Profesionales.csv`

### Navegación Reuma

- `index.html`
- `dashboard_paciente.html`
- `seguimiento.html`
- `primera_visita.html`
- `estadisticas.html`
- `manage_drugs.html`
- `manage_professionals.html`

## Verificaciones ejecutadas

```text
node --check scripts/farmacia*.js
static verification OK
farmacia nav verification OK
```

Verificaciones específicas confirmadas:

- `fh-main` ausente en todas las páginas `farmacia_*.html`.
- `<script>` inline ausente en páginas `farmacia_*.html`.
- `style=` inline ausente en páginas `farmacia_*.html`.
- `#0056b3` ausente en `farmacia_style.css`.
- Select de validación incluye `pending`.
- `CIP-DEMO-FH-002` incluido en los datos comunes de demo.
- Scripts Farmacia sin `innerHTML`.
- Navegación Reuma incluye enlace a `farmacia_index.html` en páginas principales.

## Limitaciones pendientes

- No se implementó lectura real de CSV en navegador; los datos demo se centralizan en `scripts/farmacia_common.js`. Para demo es aceptable; para piloto real debe conectarse a CSV/Excel o backend.
- No hay persistencia real; guardar validación/visita/seguimiento muestra resultado en memoria de sesión.
- No se resolvió SRI de Font Awesome porque el patrón CDN sin SRI es global del Hub actual. Requiere decisión de endurecimiento transversal.
- No se creó XLSX; se mantienen CSVs demo, alternativa permitida por la macro WO.

## No tocado

- No se tocó `.env`.
- No se tocaron credenciales, tokens, auth, cookies ni secretos.
- No se tocaron `docs/contratos/*`.
- No se hizo merge a `feature/reuma-v2-prebiologico-fh-les-sjogren`.
- No se abrió PR.
- No se introdujeron datos reales.
- No hay integración real con JARA/SES/Pharmatool.

## Recomendación PM

**ready_for_human_review**, no merge automático.

Orden recomendado de revisión manual:

1. `farmacia_index.html` — CIP existentes, CIP nuevo, alta guiada y query params.
2. `farmacia_validacion.html` — Pendiente/Validado/Denegado, motivo obligatorio, TXT/CSV.
3. `farmacia_primera_visita.html` — precarga desde query params.
4. `farmacia_seguimiento.html` — Morisky, optimización, suspensión, aviso cambio fármaco.
5. `farmacia_dashboard_paciente.html` — timeline y bloques mínimos.
6. Reuma sidebar — comprobar que la nueva entrada Farmacia no rompe navegación existente.
