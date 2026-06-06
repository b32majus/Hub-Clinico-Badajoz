# Reporte Diferencias Excel Demo v2

_Generado automáticamente: 2026-05-11 11:48_

## Fuente canónica
1. Excel maestro original (`Hub_Clinico_Maestro.xlsx`) para columnas 1-321.
2. `docs/ORDEN_COLUMNAS_EXCEL_REUMA_V2.md` para columnas 322-497.
3. `modules/exportManager.js` como verificación secundaria del orden v2.

## Archivos
- Maestro leído: `C:\Users\b32ma\Documents\HUB Clinico Badajoz_v2\Hub_Clinico_Maestro.xlsx`
- Demo generado: `C:\Users\b32ma\Documents\HUB Clinico Badajoz_v2\data\Hub_Clinico_Maestro_V2_DEMO.xlsx`

## Estructura final
- Columnas históricas intactas: `321`
- Columnas v2 añadidas: `176`
- Total por hoja clínica: `497`

## Cohorte demo cliente
- Pacientes totales: `50`
- Visitas totales: `200`
- Regla longitudinal: `10 pacientes por patología` y `4 visitas por paciente (1 primera + 3 seguimientos)`
- Nota: estos conteos describen este dataset demo y no representan un límite funcional de producción.

## AUDIT-FIX-2 ejecutado — DAPSA incorporado al contrato APs
- Contrato: 497 columnas por hoja clínica.
- DAPSA (492-497) poblado en APs y `NA` en no APs.

## Resumen por hoja

| Hoja | Columnas | Filas |
|---|---:|---:|
| AR | 497 | 40 |
| ESPA | 497 | 40 |
| APS | 497 | 40 |
| LES | 497 | 40 |
| SJOGREN | 497 | 40 |
| Profesionales | (auxiliar) | (copiada del maestro + Raúl Veroz) |
| Fármacos | (auxiliar) | (copiada del maestro) |

## Pacientes demo longitudinales

- `APS-2024-002`: 4 visitas
- `APS-2024-004`: 4 visitas
- `APS-2024-005`: 4 visitas
- `APS-2024-006`: 4 visitas
- `APS-2024-008`: 4 visitas
- `APS-2024-010`: 4 visitas
- `APS-2024-011`: 4 visitas
- `APS-2024-013`: 4 visitas
- `APS-2024-023`: 4 visitas
- `APS-2024-027`: 4 visitas
- `AR-2024-001`: 4 visitas
- `AR-2024-002`: 4 visitas
- `AR-2024-003`: 4 visitas
- `AR-2024-004`: 4 visitas
- `AR-2024-005`: 4 visitas
- `AR-2024-006`: 4 visitas
- `AR-2024-007`: 4 visitas
- `AR-2024-008`: 4 visitas
- `AR-2025-009`: 4 visitas
- `AR-2025-010`: 4 visitas
- `ESP-2024-002`: 4 visitas
- `ESP-2024-003`: 4 visitas
- `ESP-2024-004`: 4 visitas
- `ESP-2024-006`: 4 visitas
- `ESP-2024-009`: 4 visitas
- `ESP-2024-010`: 4 visitas
- `ESP-2024-011`: 4 visitas
- `ESP-2024-012`: 4 visitas
- `ESP-2024-016`: 4 visitas
- `ESP-2024-018`: 4 visitas
- `LES-2026-001`: 4 visitas
- `LES-2026-002`: 4 visitas
- `LES-2026-003`: 4 visitas
- `LES-2026-004`: 4 visitas
- `LES-2026-005`: 4 visitas
- `LES-2026-006`: 4 visitas
- `LES-2026-007`: 4 visitas
- `LES-2026-008`: 4 visitas
- `LES-2026-009`: 4 visitas
- `LES-2026-010`: 4 visitas
- `SJOGREN-2026-001`: 4 visitas
- `SJOGREN-2026-002`: 4 visitas
- `SJOGREN-2026-003`: 4 visitas
- `SJOGREN-2026-004`: 4 visitas
- `SJOGREN-2026-005`: 4 visitas
- `SJOGREN-2026-006`: 4 visitas
- `SJOGREN-2026-007`: 4 visitas
- `SJOGREN-2026-008`: 4 visitas
- `SJOGREN-2026-009`: 4 visitas
- `SJOGREN-2026-010`: 4 visitas

## Validaciones automáticas

- [x] AR = 497 columnas — 497
- [x] AR = 40 visitas — 40
- [x] ESPA = 497 columnas — 497
- [x] ESPA = 40 visitas — 40
- [x] APS = 497 columnas — 497
- [x] APS = 40 visitas — 40
- [x] LES = 497 columnas — 497
- [x] LES = 40 visitas — 40
- [x] SJOGREN = 497 columnas — 497
- [x] SJOGREN = 40 visitas — 40
- [x] primeras 321 columnas de AR coinciden con maestro — OK
- [x] primeras 321 columnas de ESPA coinciden con maestro — OK
- [x] primeras 321 columnas de APS coinciden con maestro — OK
- [x] AR sin cabeceras vacías
- [x] AR sin cabeceras duplicadas
- [x] ESPA sin cabeceras vacías
- [x] ESPA sin cabeceras duplicadas
- [x] APS sin cabeceras vacías
- [x] APS sin cabeceras duplicadas
- [x] LES sin cabeceras vacías
- [x] LES sin cabeceras duplicadas
- [x] SJOGREN sin cabeceras vacías
- [x] SJOGREN sin cabeceras duplicadas
- [x] APS DAPSA poblado — 40/40 visitas
- [x] DAPSA = NA en no APs
- [x] cada paciente tiene 1 primera + 3 seguimientos — 50 pacientes, 200 visitas total
- [x] 10 pacientes por patología — {'AR': 10, 'ESPA': 10, 'APS': 10, 'LES': 10, 'SJOGREN': 10}
- [x] cohorte total = 50 pacientes / 200 visitas — 50 / 200
- [x] sin hoja Prebiologico
- [x] sin hoja Solicitud_FH

## Diferencias conocidas
- LES/SJOGREN no existen en el maestro original; se construyen con las 321 históricas + 176 v2.
- No se crea hoja `Prebiologico` obligatoria en esta demo (prebiológico embebido por visita).
- No se crea ninguna columna/hoja de `Solicitud FH` (salida derivada TXT).

## Columnas v2 añadidas (322-497)

Total: 176

```text
322 Fecha_Diagnostico
323 Estado_Prebiologico_Final
324 Fecha_Validacion_Prebiologico
325 Profesional_Validador
326 Decision_Clinica_Manual
327 Hemograma_Solicitado
328 Hemograma_Fecha_Solicitud
329 Hemograma_Recibido
330 Hemograma_Fecha_Recepcion
331 Hemograma_Correcto
332 Hemograma_Observaciones
333 Bioquimica_Solicitada
334 Bioquimica_Fecha_Solicitud
335 Bioquimica_Recibida
336 Bioquimica_Fecha_Recepcion
337 Bioquimica_Correcta
338 Bioquimica_Observaciones
339 Serologias_Solicitadas
340 Serologias_Fecha_Solicitud
341 Serologias_Recibidas
342 Serologias_Fecha_Recepcion
343 Serologias_Correctas
344 Serologias_Observaciones
345 IGRA_Mantoux_Solicitado
346 IGRA_Mantoux_Tipo
347 IGRA_Mantoux_Fecha_Solicitud
348 IGRA_Mantoux_Recibido
349 IGRA_Mantoux_Fecha_Recepcion
350 IGRA_Mantoux_Resultado
351 IGRA_Mantoux_Observaciones
352 Rx_Torax_Solicitada
353 Rx_Torax_Fecha_Solicitud
354 Rx_Torax_Recibida
355 Rx_Torax_Fecha_Recepcion
356 Rx_Torax_Correcta
357 Rx_Torax_Observaciones
358 Vacunacion_Revisada
359 Vacunacion_OK
360 Medicina_Preventiva_Requiere_Derivacion
361 Medicina_Preventiva_Derivada
362 Medicina_Preventiva_Fecha_Derivacion
363 Vacunas_Pendientes
364 Vacunacion_Observaciones
365 Observaciones_Prebiologico
366 SLEDAI
367 SLEDAI_2K
368 SLICC_SDI
369 Dosis_Prednisona
370 Brote_Actual
371 Tipo_Brote
372 Actividad_Global_Medico
373 Actividad_Global_Paciente
374 LES_Cutaneo
375 LES_Articular
376 LES_Renal
377 LES_Neurologico
378 LES_Hematologico
379 LES_Seroso
380 LES_Cardiopulmonar
381 LES_Vascular
382 LES_Ocular
383 LES_Otros
384 LES_Manifestaciones_Descripcion
385 ANA_LES
386 Anti_DNA
387 Anti_Sm
388 Anti_Ro
389 Anti_La
390 C3
391 C4
392 Proteinuria_LES
393 Sedimento_Urinario_LES
394 Creatinina_LES
395 PCR_LES
396 VSG_LES
397 Hemograma_Alteraciones_LES
398 Otros_Hallazgos_Analitica_LES
399 EVA_Dolor_LES
400 EVA_Fatiga_LES
401 EVA_Global_LES
402 Calidad_Vida_Comentario_LES
403 sledaiSeizure
404 sledaiPsychosis
405 sledaiOrganicBrainSyndrome
406 sledaiVisualDisturbance
407 sledaiCranialNerveDisorder
408 sledaiLupusHeadache
409 sledaiCVA
410 sledaiVasculitis
411 sledaiArthritis
412 sledaiMyositis
413 sledaiUrinaryCasts
414 sledaiHematuria
415 sledaiProteinuria
416 sledaiPyuria
417 sledaiRash
418 sledaiAlopecia
419 sledaiMucosalUlcers
420 sledaiPleurisy
421 sledaiPericarditis
422 sledaiLowComplement
423 sledaiIncreasedDNABinding
424 sledaiFever
425 sledaiThrombocytopenia
426 sledaiLeukopenia
427 sliccOcular
428 sliccNeuropsychiatric
429 sliccRenal
430 sliccPulmonary
431 sliccCardiovascular
432 sliccPeripheralVascular
433 sliccGastrointestinal
434 sliccMusculoskeletal
435 sliccSkin
436 sliccEndocrineDiabetes
437 sliccGonadal
438 sliccMalignancy
439 ESSPRI_Sequedad
440 ESSPRI_Fatiga
441 ESSPRI_Dolor
442 ESSPRI_Result
443 ESSDAI_Result
444 EVA_Sequedad_Oral
445 EVA_Sequedad_Ocular
446 EVA_Fatiga_Sjogren
447 EVA_Dolor_Sjogren
448 EVA_Global_Sjogren
449 Sjogren_Ocular_Man
450 Sjogren_Oral_Man
451 Sjogren_Glandular
452 Sjogren_Articular_Man
453 Sjogren_Cutaneo
454 Sjogren_Pulmonar
455 Sjogren_Renal
456 Sjogren_Neurologico
457 Sjogren_Hematologico
458 Sjogren_Linfoma_Riesgo
459 Sjogren_Manifestaciones_Descripcion
460 ANA_Sjogren
461 FR_Sjogren
462 Anti_Ro_Sjogren
463 Anti_La_Sjogren
464 C3_Sjogren
465 C4_Sjogren
466 Crioglobulinas
467 Proteinograma
468 Biopsia_Glandula_Salival
469 Test_Schirmer
470 Tincion_Ocular
471 Flujo_Salival
472 Ecografia_Glandular
473 PCR_Sjogren
474 VSG_Sjogren
475 Otros_Hallazgos_Analitica_Sjogren
476 Trat_Sintomatico_Sequedad
477 Trat_Sintomatico_Sequedad_Dosis
478 Trat_Inmunomodulador
479 Trat_Inmunomodulador_Dosis
480 essdaiConstitutional
481 essdaiLymphadenopathy
482 essdaiGlandular
483 essdaiArticular
484 essdaiCutaneous
485 essdaiPulmonary
486 essdaiRenal
487 essdaiMuscular
488 essdaiPeripheralNervousSystem
489 essdaiCentralNervousSystem
490 essdaiHematological
491 essdaiBiological
492 DAPSA_Result
493 DAPSA_NAD68
494 DAPSA_NAT66
495 DAPSA_EVA_Dolor_Paciente
496 DAPSA_EVA_Global_Paciente
497 DAPSA_PCR
```
