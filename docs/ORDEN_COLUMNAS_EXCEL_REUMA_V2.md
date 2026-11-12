# Orden de Columnas Excel Reuma v2

> Fecha: 2026-05-04. Contrato de orden exacto para las columnas v2 finales con AUDIT-FIX-2: DAPSA incorporado a APs.

## 1. Regla general

Todas las hojas clinicas (`AR`, `ESPA`, `APS`, `LES`, `SJOGREN`) deben compartir el mismo orden de cabeceras para que el flujo sea siempre:

```text
rellenar Hub -> exportar fila -> pegar una sola vez en la hoja de patologia
```

El orden final es:

1. Columnas `1-321`: bloque historico canonico del Excel maestro original.
2. Columnas `322-365`: contexto v2 comun + prebiologico/vacunacion.
3. Columnas `366-438`: LES, incluyendo trazabilidad de SLEDAI-2K y SLICC/ACR SDI.
4. Columnas `439-491`: Sjogren, incluyendo trazabilidad de ESSDAI.
5. Columnas `492-497`: APs/DAPSA explicito. En hojas no APs exporta `NA`.
6. Columnas `498-533`: pauta de las lineas de tratamiento del plan actual y del cambio (#919, 12-11-2026). Vacio = no consta, en todas las patologias.

Total final vigente: `533` columnas por hoja clinica.

## 2. Columnas 1-321: bloque historico

Las columnas `1-321` se copian exactamente desde `Hub_Clinico_Maestro.xlsx`, hoja `AR`, y deben coincidir byte a byte con AR/ESPA/APS historicas.

- Primera columna: `ID_Paciente`.
- Ultima columna historica: `CASPAR_Resultado`.
- No renombrar.
- No reordenar.
- No insertar columnas nuevas en medio.
- No eliminar columnas.

## 3. Columnas v2 finales exactas

### 3.1 Contexto comun y prebiologico/vacunacion

| Posicion | Columna |
|---:|---|
| 322 | `Fecha_Diagnostico` |
| 323 | `Estado_Prebiologico_Final` |
| 324 | `Fecha_Validacion_Prebiologico` |
| 325 | `Profesional_Validador` |
| 326 | `Decision_Clinica_Manual` |
| 327 | `Hemograma_Solicitado` |
| 328 | `Hemograma_Fecha_Solicitud` |
| 329 | `Hemograma_Recibido` |
| 330 | `Hemograma_Fecha_Recepcion` |
| 331 | `Hemograma_Correcto` |
| 332 | `Hemograma_Observaciones` |
| 333 | `Bioquimica_Solicitada` |
| 334 | `Bioquimica_Fecha_Solicitud` |
| 335 | `Bioquimica_Recibida` |
| 336 | `Bioquimica_Fecha_Recepcion` |
| 337 | `Bioquimica_Correcta` |
| 338 | `Bioquimica_Observaciones` |
| 339 | `Serologias_Solicitadas` |
| 340 | `Serologias_Fecha_Solicitud` |
| 341 | `Serologias_Recibidas` |
| 342 | `Serologias_Fecha_Recepcion` |
| 343 | `Serologias_Correctas` |
| 344 | `Serologias_Observaciones` |
| 345 | `IGRA_Mantoux_Solicitado` |
| 346 | `IGRA_Mantoux_Tipo` |
| 347 | `IGRA_Mantoux_Fecha_Solicitud` |
| 348 | `IGRA_Mantoux_Recibido` |
| 349 | `IGRA_Mantoux_Fecha_Recepcion` |
| 350 | `IGRA_Mantoux_Resultado` |
| 351 | `IGRA_Mantoux_Observaciones` |
| 352 | `Rx_Torax_Solicitada` |
| 353 | `Rx_Torax_Fecha_Solicitud` |
| 354 | `Rx_Torax_Recibida` |
| 355 | `Rx_Torax_Fecha_Recepcion` |
| 356 | `Rx_Torax_Correcta` |
| 357 | `Rx_Torax_Observaciones` |
| 358 | `Vacunacion_Revisada` |
| 359 | `Vacunacion_OK` |
| 360 | `Medicina_Preventiva_Requiere_Derivacion` |
| 361 | `Medicina_Preventiva_Derivada` |
| 362 | `Medicina_Preventiva_Fecha_Derivacion` |
| 363 | `Vacunas_Pendientes` |
| 364 | `Vacunacion_Observaciones` |
| 365 | `Observaciones_Prebiologico` |

### 3.2 LES

| Posicion | Columna |
|---:|---|
| 366 | `SLEDAI` |
| 367 | `SLEDAI_2K` |
| 368 | `SLICC_SDI` |
| 369 | `Dosis_Prednisona` |
| 370 | `Brote_Actual` |
| 371 | `Tipo_Brote` |
| 372 | `Actividad_Global_Medico` |
| 373 | `Actividad_Global_Paciente` |
| 374 | `LES_Cutaneo` |
| 375 | `LES_Articular` |
| 376 | `LES_Renal` |
| 377 | `LES_Neurologico` |
| 378 | `LES_Hematologico` |
| 379 | `LES_Seroso` |
| 380 | `LES_Cardiopulmonar` |
| 381 | `LES_Vascular` |
| 382 | `LES_Ocular` |
| 383 | `LES_Otros` |
| 384 | `LES_Manifestaciones_Descripcion` |
| 385 | `ANA_LES` |
| 386 | `Anti_DNA` |
| 387 | `Anti_Sm` |
| 388 | `Anti_Ro` |
| 389 | `Anti_La` |
| 390 | `C3` |
| 391 | `C4` |
| 392 | `Proteinuria_LES` |
| 393 | `Sedimento_Urinario_LES` |
| 394 | `Creatinina_LES` |
| 395 | `PCR_LES` |
| 396 | `VSG_LES` |
| 397 | `Hemograma_Alteraciones_LES` |
| 398 | `Otros_Hallazgos_Analitica_LES` |
| 399 | `EVA_Dolor_LES` |
| 400 | `EVA_Fatiga_LES` |
| 401 | `EVA_Global_LES` |
| 402 | `Calidad_Vida_Comentario_LES` |
| 403 | `sledaiSeizure` |
| 404 | `sledaiPsychosis` |
| 405 | `sledaiOrganicBrainSyndrome` |
| 406 | `sledaiVisualDisturbance` |
| 407 | `sledaiCranialNerveDisorder` |
| 408 | `sledaiLupusHeadache` |
| 409 | `sledaiCVA` |
| 410 | `sledaiVasculitis` |
| 411 | `sledaiArthritis` |
| 412 | `sledaiMyositis` |
| 413 | `sledaiUrinaryCasts` |
| 414 | `sledaiHematuria` |
| 415 | `sledaiProteinuria` |
| 416 | `sledaiPyuria` |
| 417 | `sledaiRash` |
| 418 | `sledaiAlopecia` |
| 419 | `sledaiMucosalUlcers` |
| 420 | `sledaiPleurisy` |
| 421 | `sledaiPericarditis` |
| 422 | `sledaiLowComplement` |
| 423 | `sledaiIncreasedDNABinding` |
| 424 | `sledaiFever` |
| 425 | `sledaiThrombocytopenia` |
| 426 | `sledaiLeukopenia` |
| 427 | `sliccOcular` |
| 428 | `sliccNeuropsychiatric` |
| 429 | `sliccRenal` |
| 430 | `sliccPulmonary` |
| 431 | `sliccCardiovascular` |
| 432 | `sliccPeripheralVascular` |
| 433 | `sliccGastrointestinal` |
| 434 | `sliccMusculoskeletal` |
| 435 | `sliccSkin` |
| 436 | `sliccEndocrineDiabetes` |
| 437 | `sliccGonadal` |
| 438 | `sliccMalignancy` |

### 3.3 Sjogren

| Posicion | Columna |
|---:|---|
| 439 | `ESSPRI_Sequedad` |
| 440 | `ESSPRI_Fatiga` |
| 441 | `ESSPRI_Dolor` |
| 442 | `ESSPRI_Result` |
| 443 | `ESSDAI_Result` |
| 444 | `EVA_Sequedad_Oral` |
| 445 | `EVA_Sequedad_Ocular` |
| 446 | `EVA_Fatiga_Sjogren` |
| 447 | `EVA_Dolor_Sjogren` |
| 448 | `EVA_Global_Sjogren` |
| 449 | `Sjogren_Ocular_Man` |
| 450 | `Sjogren_Oral_Man` |
| 451 | `Sjogren_Glandular` |
| 452 | `Sjogren_Articular_Man` |
| 453 | `Sjogren_Cutaneo` |
| 454 | `Sjogren_Pulmonar` |
| 455 | `Sjogren_Renal` |
| 456 | `Sjogren_Neurologico` |
| 457 | `Sjogren_Hematologico` |
| 458 | `Sjogren_Linfoma_Riesgo` |
| 459 | `Sjogren_Manifestaciones_Descripcion` |
| 460 | `ANA_Sjogren` |
| 461 | `FR_Sjogren` |
| 462 | `Anti_Ro_Sjogren` |
| 463 | `Anti_La_Sjogren` |
| 464 | `C3_Sjogren` |
| 465 | `C4_Sjogren` |
| 466 | `Crioglobulinas` |
| 467 | `Proteinograma` |
| 468 | `Biopsia_Glandula_Salival` |
| 469 | `Test_Schirmer` |
| 470 | `Tincion_Ocular` |
| 471 | `Flujo_Salival` |
| 472 | `Ecografia_Glandular` |
| 473 | `PCR_Sjogren` |
| 474 | `VSG_Sjogren` |
| 475 | `Otros_Hallazgos_Analitica_Sjogren` |
| 476 | `Trat_Sintomatico_Sequedad` |
| 477 | `Trat_Sintomatico_Sequedad_Dosis` |
| 478 | `Trat_Inmunomodulador` |
| 479 | `Trat_Inmunomodulador_Dosis` |
| 480 | `essdaiConstitutional` |
| 481 | `essdaiLymphadenopathy` |
| 482 | `essdaiGlandular` |
| 483 | `essdaiArticular` |
| 484 | `essdaiCutaneous` |
| 485 | `essdaiPulmonary` |
| 486 | `essdaiRenal` |
| 487 | `essdaiMuscular` |
| 488 | `essdaiPeripheralNervousSystem` |
| 489 | `essdaiCentralNervousSystem` |
| 490 | `essdaiHematological` |
| 491 | `essdaiBiological` |

### 3.4 APs/DAPSA

| Posicion | Columna |
|---:|---|
| 492 | `DAPSA_Result` |
| 493 | `DAPSA_NAD68` |
| 494 | `DAPSA_NAT66` |
| 495 | `DAPSA_EVA_Dolor_Paciente` |
| 496 | `DAPSA_EVA_Global_Paciente` |
| 497 | `DAPSA_PCR` |

### 3.5 Pauta de las lineas de tratamiento (#919)

Una pareja por hueco (1-3) y grupo: `..._Pauta_N` lleva el codigo del catalogo comun de pautas de Farmacia (`scripts/farmacia_pautas_catalog.js`, p. ej. `SEMANAL`, `CADA_2_SEMANAS`, `OTRO`); `..._Pauta_Otro_N` lleva el texto libre solo cuando la pauta es `OTRO`. Los huecos son los mismos que las columnas de farmaco y dosis (`Trat_*`, `Cambio_*`). Sin unidad ni via: la presentacion elegida en el buscador ya fija la via, y no se deduce. Vacio = no consta.

| Posicion | Columna |
|---:|---|
| 498 | `Trat_Sistemico_Pauta_1` |
| 499 | `Trat_Sistemico_Pauta_Otro_1` |
| 500 | `Trat_Sistemico_Pauta_2` |
| 501 | `Trat_Sistemico_Pauta_Otro_2` |
| 502 | `Trat_Sistemico_Pauta_3` |
| 503 | `Trat_Sistemico_Pauta_Otro_3` |
| 504 | `Trat_FAME_Pauta_1` |
| 505 | `Trat_FAME_Pauta_Otro_1` |
| 506 | `Trat_FAME_Pauta_2` |
| 507 | `Trat_FAME_Pauta_Otro_2` |
| 508 | `Trat_FAME_Pauta_3` |
| 509 | `Trat_FAME_Pauta_Otro_3` |
| 510 | `Trat_Biologico_Pauta_1` |
| 511 | `Trat_Biologico_Pauta_Otro_1` |
| 512 | `Trat_Biologico_Pauta_2` |
| 513 | `Trat_Biologico_Pauta_Otro_2` |
| 514 | `Trat_Biologico_Pauta_3` |
| 515 | `Trat_Biologico_Pauta_Otro_3` |
| 516 | `Cambio_Sistemico_Pauta_1` |
| 517 | `Cambio_Sistemico_Pauta_Otro_1` |
| 518 | `Cambio_Sistemico_Pauta_2` |
| 519 | `Cambio_Sistemico_Pauta_Otro_2` |
| 520 | `Cambio_Sistemico_Pauta_3` |
| 521 | `Cambio_Sistemico_Pauta_Otro_3` |
| 522 | `Cambio_FAME_Pauta_1` |
| 523 | `Cambio_FAME_Pauta_Otro_1` |
| 524 | `Cambio_FAME_Pauta_2` |
| 525 | `Cambio_FAME_Pauta_Otro_2` |
| 526 | `Cambio_FAME_Pauta_3` |
| 527 | `Cambio_FAME_Pauta_Otro_3` |
| 528 | `Cambio_Biologico_Pauta_1` |
| 529 | `Cambio_Biologico_Pauta_Otro_1` |
| 530 | `Cambio_Biologico_Pauta_2` |
| 531 | `Cambio_Biologico_Pauta_Otro_2` |
| 532 | `Cambio_Biologico_Pauta_3` |
| 533 | `Cambio_Biologico_Pauta_Otro_3` |

## 4. Aliases de implementacion

Estos aliases no son cabeceras nuevas; sirven para mapear formulario/codigo a cabecera estable:

| Cabecera estable | Alias de formulario/codigo |
|---|---|
| `SLEDAI` | `sledaiResult` |
| `SLEDAI_2K` | `sledai2kResult`, `SLEDAI_2K_Result` |
| `SLICC_SDI` | `sliccAcrSdi`, `SLICC_ACR_SDI` |
| `Dosis_Prednisona` | `dosisPrednisona`, `Dosis_Prednisona_Mg_Dia` |
| `ESSDAI_Result` | `essdaiResult` |
| `ESSPRI_Result` | `esspriResult` |
| `ESSPRI_Sequedad` | `esspriSequedad` |
| `ESSPRI_Fatiga` | `esspriFatiga` |
| `ESSPRI_Dolor` | `esspriDolor` |
| `DAPSA_Result` | `dapsaResult`, `DAPSA`, `dapsa` |
| `DAPSA_NAD68` | `dapsaNAD68` |
| `DAPSA_NAT66` | `dapsaNAT66` |
| `DAPSA_EVA_Dolor_Paciente` | `dapsaEvaDolorPaciente` |
| `DAPSA_EVA_Global_Paciente` | `dapsaEvaGlobalPaciente` |
| `DAPSA_PCR` | `dapsaPCR` |

## 5. Campos descartados como columnas

No crear columnas ni hojas para informes derivados:

- `Solicitud_FH`
- `Solicitud_FH_Texto`
- `Informe_FH`
- `Resumen_FH`
- `Resumen_Farmacia`
- `Bloque_Farmacia`
- `Texto_Farmacia`
- `Solicitud_FH_Log`

Solicitud FH se genera desde datos fuente persistidos en la ultima visita clinica.

## 6. Implicacion para la implementacion

El siguiente cambio funcional debe hacer que `exportManager.js` genere exactamente `533` valores por fila clinica, en este orden:

- Posiciones `1-321`: sin cambios.
- Posiciones `322-365`: nuevo bloque comun/prebiologico.
- Posiciones `366-438`: LES, `NA` si no aplica.
- Posiciones `439-491`: Sjogren, `NA` si no aplica.
- Posiciones `492-497`: APs/DAPSA, `NA` si no aplica.
- Posiciones `498-533`: pauta del plan y del cambio, vacio si no consta.

La demo v2 no debe generarse hasta que formulario/export/dashboard/FH esten alineados con este orden.

## AUDIT-FIX-2 ejecutado — DAPSA incorporado al contrato APs

- Motivo: APs v2 necesitaba DAPSA como métrica clínica principal y no estaba persistida en el contrato Excel.
- El contrato pasa de `491` a `497` columnas por hoja clínica.
- Columnas añadidas: `DAPSA_Result`, `DAPSA_NAD68`, `DAPSA_NAT66`, `DAPSA_EVA_Dolor_Paciente`, `DAPSA_EVA_Global_Paciente`, `DAPSA_PCR`.
- Impacto: formulario APs, `formController`, `exportManager`, demo, `dataManager`, dashboard, estadísticas, eventos terapéuticos y Solicitud FH quedan alineados con DAPSA.
- Criterio de unidad: `DAPSA_PCR` se guarda como PCR mg/L; la calculadora convierte a mg/dL dividiendo entre 10 para el total DAPSA.

## AUDIT-FIX-2B ejecutado — Estandarización de PCR (mg/L)

- Unidad canónica del Hub para PCR en UI/Excel/export/import: `mg/L`.
- `DAPSA_PCR` se mantiene como cabecera estable del contrato y almacena PCR en `mg/L`.
- Conversión por fórmula:
  - `DAPSA`: convierte PCR `mg/L -> mg/dL` dividiendo entre `10`.
  - `SDAI`: convierte PCR `mg/L -> mg/dL` dividiendo entre `10`.
  - `DAS28-CRP`: usa PCR en `mg/L` sin conversión.
  - `ASDAS-CRP`: usa PCR en `mg/L` sin conversión.
  - `CDAI`: no usa PCR.
- Restricción de seguridad clínica:
  - No usar `mg/mL`.
  - No inferir unidad por magnitud del valor.
  - No usar heurísticas tipo `if (pcr > 10) pcr = pcr / 10`.

## #919 — pauta en las lineas de tratamiento (12-11-2026)

- Decision de Sil: la linea de tratamiento es igual en Reuma y Farmacia: farmaco (presentacion AEMPS) + dosis (texto libre) + pauta del catalogo comun. Sin unidad ni via.
- El contrato pasa de `497` a `533` columnas por hoja clinica; las 36 nuevas van al final (seccion 3.5).
- Alcance: plan actual (primera visita) y cambio de tratamiento (seguimiento). Previos, psoriasis y Sjogren sin cambios.
- La demo `data/Hub_Clinico_Maestro_V2_DEMO.xlsx` incorpora las 36 cabeceras.
- Las funciones `generateLegacyRow497`, `projectVisitAct497` y `exportarAct497` conservan su nombre; la longitud la fija `FINAL_V2_EXPORT_COLUMN_COUNT`.
