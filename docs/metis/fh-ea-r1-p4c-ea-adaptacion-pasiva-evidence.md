# Evidencia de preparación · ea-adaptacion-pasiva

Entorno: Node v26.7.0, Linux; datos sintéticos; sin navegador ni red.

| Ejecución | Resultado |
|---|---|
| `npm ci --offline --no-audit --no-fund --ignore-scripts` | PASS, exit 0 |
| `node metis/oracles/ea-adaptacion-pasiva.mjs` sin referencia | FAIL, exit 1, aserción “missing passive T01 → existing F4.4 composition”; módulo existente carga correctamente, falta comportamiento |
| Mismo oráculo con referencia | PASS, exit 0 |
| `node tools/farmacia_ea_r1_followup_check.mjs` | PASS (invocado por el oráculo) |
| Checks R1 states / identity / clinical_data / revisions | PASS (invocados por el oráculo) |
| Oráculos previos cardinalidad / episodios / ausencias / revisiones | PASS (revisiones invoca los tres anteriores) |
| `node tools/farmacia_act_contract_check.mjs` | PASS (regresión encadenada por oráculo revisiones) |
| `node tools/farmacia_act_payloads_check.mjs` | PASS (misma cadena) |
| `node tools/farmacia_ea_t01_check.mjs` | PASS (misma cadena) |
| `npm run -s verify:nexus` | PASS, exit 0 |

No se alteraron suites anteriores. No limitaciones detectadas en las ejecuciones solicitadas. No se afirma UI integrada, entrega, persistencia ni aptitud clínica institucional. Sin receta visual porque uiImpact=none. Preparación versionada aparte de los dos archivos de referencia privados, que quedan sin commit.
