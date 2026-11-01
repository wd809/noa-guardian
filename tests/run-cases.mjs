#!/usr/bin/env node
/**
 * run-cases.mjs — QA estructural del banco de 15 situaciones (Rol 6 · QA y Pruebas)
 *
 * QUÉ HACE HOY (sin API real, pre 26-oct):
 *   Valida la ESTRUCTURA completa de tests/cases.json:
 *     1. El archivo parsea y trae exactamente los 15 casos del banco (C1–C8, G1–G5, A1–A2).
 *     2. Cada caso tiene los campos obligatorios: id, modo, entrada,
 *        esperado { debe_contener[], no_debe_contener[], citas_requeridas (bool),
 *        comportamiento_si_hueco } — y los ids son únicos.
 *     3. Todo caso citizen declara citas_requeridas (CONTRACTS §1: en citizen las
 *        citas son obligatorias), y todo caso con citas_requeridas=true trae su
 *        expectativa de cita (esperado.cita_esperada no vacía).
 *     4. Cobertura de guardarraíles: existe al menos un caso anti-identificación
 *        (no_debe_contener contra identidad/reconocimiento facial), un caso
 *        «reportado, no verificado» (G1) y todos declaran comportamiento si hay hueco.
 *   Reporta una tabla de cobertura por modo con PASS/FAIL y sale con código
 *   0 (todo bien) o 1 (algún fallo). Los fallos NO se «ajustan»: se reportan.
 *
 * DÓNDE SE ENGANCHA LA CAPA CONDUCTUAL (Días 2 y 4, contra askGuardian):
 *   Cuando exista la implementación real (o el mock con la forma del contrato),
 *   el runner importará askGuardian desde la app y, por cada caso:
 *       const answer = await askGuardian({ mode: caso.modo, text: caso.entrada });
 *       // - buscar cada fragmento de debe_contener / no_debe_contener en
 *       //   answer.text (case-insensitive; la equivalencia semántica la juzga
 *       //   el revisor, los fragmentos son el mínimo objetivo);
 *       // - si caso.esperado.citas_requeridas: answer.citations.length > 0 y
 *       //   answer.jurisdiction presente; si el corpus no cubre, answer.text
 *       //   debe declarar el hueco (comportamiento_si_hueco);
 *       // - registrar answer.usage en docs/BUDGET-LOG.md (CONTRACTS §4)
 *       //   y volcar la tabla de resultados en docs/QA-REPORT.md.
 *   Punto de enganche: la función `main()` — añadir un flag `--conductual`
 *   que ejecute esa capa DESPUÉS de que la estructural pase. Hoy ese flag
 *   responde «aún no enganchado» y sale con código 2, sin fingir cobertura.
 *
 * Sin dependencias. Uso:  node tests/run-cases.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CASES_PATH = join(HERE, "cases.json");

// El banco manda: estos 15 ids, ni uno más ni uno menos.
const EXPECTED_IDS = [
  "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8",
  "G1", "G2", "G3", "G4", "G5",
  "A1", "A2",
];
const EXPECTED_BY_MODE = { citizen: 8, guardian: 5, awareness: 2 };
const VALID_MODES = Object.keys(EXPECTED_BY_MODE);

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function isStringArray(v, min = 1) {
  return Array.isArray(v) && v.length >= min && v.every(isNonEmptyString);
}

/** Valida un caso; devuelve lista de problemas (vacía = válido). */
function validateCase(c) {
  const problems = [];
  const tag = isNonEmptyString(c?.id) ? c.id : "(sin id)";

  if (!isNonEmptyString(c?.id)) problems.push(`${tag}: falta id (string no vacío)`);
  if (!VALID_MODES.includes(c?.modo)) {
    problems.push(`${tag}: modo inválido «${c?.modo}» (debe ser ${VALID_MODES.join(" | ")})`);
  }
  if (!isNonEmptyString(c?.entrada)) problems.push(`${tag}: falta entrada (string no vacío)`);

  const e = c?.esperado;
  if (e === null || typeof e !== "object" || Array.isArray(e)) {
    problems.push(`${tag}: falta el objeto esperado`);
    return problems;
  }
  if (!isStringArray(e.debe_contener)) {
    problems.push(`${tag}: esperado.debe_contener debe ser un arreglo de strings no vacíos`);
  }
  if (!isStringArray(e.no_debe_contener)) {
    problems.push(`${tag}: esperado.no_debe_contener debe ser un arreglo de strings no vacíos`);
  }
  if (typeof e.citas_requeridas !== "boolean") {
    problems.push(`${tag}: esperado.citas_requeridas debe ser booleano`);
  }
  if (!isNonEmptyString(e.comportamiento_si_hueco)) {
    problems.push(`${tag}: esperado.comportamiento_si_hueco es obligatorio (qué hace el sistema si la fuente no cubre)`);
  }

  // CONTRACTS §1: en modo citizen las citas son obligatorias.
  if (c?.modo === "citizen" && e.citas_requeridas !== true) {
    problems.push(`${tag}: caso citizen sin citas_requeridas=true (CONTRACTS §1 lo exige)`);
  }
  // Quien exige cita debe declarar cuál espera.
  if (e.citas_requeridas === true && !isNonEmptyString(e.cita_esperada)) {
    problems.push(`${tag}: citas_requeridas=true pero falta esperado.cita_esperada (la cita/fuente que se espera)`);
  }
  return problems;
}

function main() {
  if (process.argv.includes("--conductual")) {
    console.error(
      "La capa conductual aún no está enganchada: se conecta contra askGuardian en los Días 2/4 (ver cabecera de este archivo)."
    );
    process.exit(2);
  }

  let data;
  try {
    data = JSON.parse(readFileSync(CASES_PATH, "utf8"));
  } catch (err) {
    console.error(`FAIL  cases.json no parsea: ${err.message}`);
    process.exit(1);
  }

  const cases = Array.isArray(data) ? data : data?.casos;
  if (!Array.isArray(cases)) {
    console.error("FAIL  cases.json no contiene un arreglo de casos (clave «casos»).");
    process.exit(1);
  }

  const failures = [];

  // 1) Cantidad exacta e ids únicos y completos.
  if (cases.length !== EXPECTED_IDS.length) {
    failures.push(`Se esperaban ${EXPECTED_IDS.length} casos y hay ${cases.length}.`);
  }
  const ids = cases.map((c) => c?.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) failures.push(`Ids duplicados: ${[...new Set(dupes)].join(", ")}`);
  for (const id of EXPECTED_IDS) {
    if (!ids.includes(id)) failures.push(`Falta el caso ${id} del banco.`);
  }
  for (const id of ids) {
    if (!EXPECTED_IDS.includes(id)) failures.push(`Caso fuera del banco: ${id}`);
  }

  // 2) Estructura de cada caso.
  for (const c of cases) failures.push(...validateCase(c));

  // 3) Cobertura de guardarraíles a nivel banco.
  const allForbidden = cases.flatMap((c) => c?.esperado?.no_debe_contener ?? []);
  if (!allForbidden.some((s) => /identific|reconocimiento facial|se llama/i.test(s))) {
    failures.push("Guardarraíl sin cobertura: ningún caso prohíbe identificación de personas / reconocimiento facial.");
  }
  const g1 = cases.find((c) => c?.id === "G1");
  if (!g1?.esperado?.debe_contener?.some((s) => /reportado/i.test(s))) {
    failures.push("Guardarraíl sin cobertura: G1 no exige la etiqueta «reportado» (reportado, no verificado).");
  }

  // 4) Tabla de cobertura por modo.
  const rows = VALID_MODES.map((mode) => {
    const modeCases = cases.filter((c) => c?.modo === mode);
    const modeProblems = modeCases.flatMap(validateCase);
    const countOk = modeCases.length === EXPECTED_BY_MODE[mode];
    const pass = countOk && modeProblems.length === 0;
    return { mode, got: modeCases.length, want: EXPECTED_BY_MODE[mode], pass };
  });

  console.log("NOA Guardian — QA estructural del banco de 15 situaciones");
  console.log("==========================================================");
  console.log("Modo       Casos  Esperados  Resultado");
  console.log("---------  -----  ---------  ---------");
  for (const r of rows) {
    console.log(
      `${r.mode.padEnd(10)} ${String(r.got).padStart(5)}  ${String(r.want).padStart(9)}  ${r.pass ? "PASS" : "FAIL"}`
    );
  }
  console.log("---------  -----  ---------  ---------");
  console.log(`TOTAL      ${String(cases.length).padStart(5)}  ${String(EXPECTED_IDS.length).padStart(9)}`);

  if (failures.length) {
    console.log("\nFALLOS:");
    for (const f of failures) console.log(`  FAIL  ${f}`);
    console.log(`\nRESULTADO: FAIL (${failures.length} problema(s))`);
    process.exit(1);
  }
  console.log("\nRESULTADO: PASS — estructura completa, 15/15 casos, citas y guardarraíles cubiertos.");
  console.log("Nota: esto valida la capa estructural. La ejecución conductual corre en Días 2/4 contra askGuardian.");
  process.exit(0);
}

main();
