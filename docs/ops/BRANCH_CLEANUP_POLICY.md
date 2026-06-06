# Política de Limpieza de Ramas — Hub Clínico Badajoz

**Versión:** 1.0  
**Fecha:** 2026-06-05  
**Propósito:** Evitar acumulación de ramas `work/hermes/*` en el remoto

---

## 1. Ramas protegidas (nunca se borran)

```
main
release/*
feature/reuma-v2-prebiologico-fh-les-sjogren
```

## 2. Ramas work/hermes/*

### Reglas

1. Una rama `work/hermes/*` puede borrarse cuando **todo** lo siguiente es cierto:
   - La WO asociada está marcada como `✅ Merged` en `WORK_ORDER_STATUS.md`
   - Ha pasado al menos **7 días** desde el merge (período de gracia por si hay que revertir)
   - No hay trabajo pendiente referenciado a esa rama

2. Si una rama no está mergeada pero su WO está marcada como `❌ Descartada` o `⏸️ Pausada` por más de **30 días**, puede borrarse tras notificar a Sil/Cora.

3. Si una rama contiene trabajo intermedio que sirve como base de otra rama activa, no borrar hasta que la rama dependiente esté mergeada.

### Comando seguro para borrar (local + remoto)

```bash
# Verificar que la rama está mergeada
git branch --merged feature/reuma-v2-prebiologico-fh-les-sjogren | grep work/hermes/

# Borrar local
git branch -d work/hermes/nombre-de-rama

# Borrar remoto
git push origin --delete work/hermes/nombre-de-rama
```

⚠️ **Solo un humano debe ejecutar el borrado remoto.** Los agentes no deben borrar ramas sin autorización explícita en una work order.

## 3. Ramas huérfanas

Se considera rama huérfana cualquier `work/hermes/*` que:
- No tenga WO asociada en `WORK_ORDER_STATUS.md`
- No tenga actividad en más de 60 días

Las ramas huérfanas pueden borrarse tras notificación a Sil/Cora.

---

## 4. Ramas actuales (a fecha 2026-06-05)

| Rama | WO | Estado | ¿Borrable? |
|------|----|--------|-----------|
| `work/hermes/preflight-vps-git` | Preflight 1 | ✅ Merged | ❌ No (menos de 7 días desde merge) |
| `work/hermes/wo-001-agent-governance` | WO-001 | ✅ Merged | ❌ No (menos de 7 días) |
| `work/hermes/wo-001b-report-template-refinement` | WO-001b | ✅ Merged | ❌ No (menos de 7 días) |
| `work/hermes/wo-002-contratos-minimos` | WO-002 | ⏸️ Pausada | ❌ No (pendiente decisión) |
| `work/hermes/nightly-green-docs-20260606` | WO-003 a WO-009 | 🟢 Pendiente review | ❌ No (no mergeada) |
| `work/hermes/wo-009b-correccion-editorial-lote-nocturno` | WO-009b | 🟢 Pendiente review | ❌ No |
| `work/hermes/wo-010-canvas-diseno-formularios` | WO-010 | 🟢 Pendiente review | ❌ No |
| `work/hermes/wo-011-model-routing-governance` | WO-011 | 🟢 Pendiente review | ❌ No |
| `work/hermes/wo-012-governance-hygiene-status` | WO-012 | 🟢 Pendiente review | ❌ No |

**Próxima limpieza estimada:** ~2026-06-12 (7 días tras merge de las primeras WOs).
