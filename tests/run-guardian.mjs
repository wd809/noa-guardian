#!/usr/bin/env node
/**
 * run-guardian.mjs — QA del modo Guardian REAL del Dock (Rol 6 · QA)
 *
 * Mitad determinista (fixtures inyectados en guardian.js, sin red) y mitad
 * contrato HTTP contra el gateway real:
 *   G1  Fixture con alerta SEVERA (Tornado Warning) + una Moderate
 *       → 200, source "feeds", proactiveAlert=true, «AVISO PRIORITARIO»,
 *         conteos por severidad correctos y CADA alerta citada con su
 *         fuente y su URL oficial (contrato: cada afirmación con fuente).
 *   G2  Fixture con solo alertas leves (Minor)
 *       → 200, proactiveAlert=false, sin «AVISO PRIORITARIO», la alerta
 *         aparece en el texto con su fuente.
 *   G3  Fixture SIN alertas → declara «Sin alertas oficiales activas»,
 *         citations vacías, proactiveAlert=false.
 *   G4  Fixture con TODAS las fuentes caídas → NO afirma seguridad:
 *         declara que no pudo consultar; proactiveAlert=false.
 *   G5  Regla proactiva por lista cerrada: «Flash Flood Warning» con
 *         severidad Moderate dispara aviso (isProactive), y un evento
 *         leve fuera de la lista no.
 *   G6  Sin text → 400.
 *   G7  HTTP real: POST /ask {mode:"guardian"} → 200 con la FORMA del
 *         contrato (text, citations[], source "feeds", bloque guardian
 *         con bySeverity y proactiveRule). Las fuentes vivas pueden o no
 *         traer alertas: se valida la forma, no el clima.
 *   G8  HTTP real: POST /ask {mode:"awareness"} → sigue 501 declarado
 *         (vision/SAM llega en el sprint; regresión del contrato).
 *
 * Uso:  node tests/run-guardian.mjs    (exit 0 = todo PASS)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { answerGuardian, isProactive, assessAlerts } from "../dock/gateway/src/guardian.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");
const PORT = 18124;
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
function check(id, name, ok, detail = "") {
  results.push({ id, name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${id}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const POINT = { lat: 40.3356, lon: -75.9269 };
const okSources = { NWS: { ok: true, count: 2 }, USGS: { ok: true, count: 0 }, "NASA EONET": { ok: true, count: 0 } };

const fixtureSevere = {
  alerts: [
    {
      event: "Tornado Warning", severity: "Severe",
      headline: "Tornado Warning issued for Berks County (fixture QA)",
      area: "Berks, PA", ends: "2027-06-01T00:00:00Z",
      source: "NWS", url: "https://api.weather.gov/alerts/fixture-tornado",
    },
    {
      event: "Flood Watch", severity: "Moderate",
      headline: "Flood Watch in effect (fixture QA)",
      area: "Berks, PA", ends: null,
      source: "NWS", url: "https://api.weather.gov/alerts/fixture-flood",
    },
  ],
  sources: okSources,
  point: POINT,
  generatedAt: "2026-10-22T19:00:00Z",
};

const fixtureMinor = {
  alerts: [
    {
      event: "Special Weather Statement", severity: "Minor",
      headline: "Patchy fog possible overnight (fixture QA)",
      area: "Berks, PA", ends: null,
      source: "NWS", url: "https://api.weather.gov/alerts/fixture-fog",
    },
  ],
  sources: { NWS: { ok: true, count: 1 }, USGS: { ok: true, count: 0 }, "NASA EONET": { ok: true, count: 0 } },
  point: POINT,
  generatedAt: "2026-10-22T19:00:00Z",
};

const fixtureEmpty = { alerts: [], sources: { NWS: { ok: true, count: 0 }, USGS: { ok: true, count: 0 }, "NASA EONET": { ok: true, count: 0 } }, point: POINT, generatedAt: "2026-10-22T19:00:00Z" };

const fixtureDown = {
  alerts: [],
  sources: {
    NWS: { ok: false, count: 0, error: "HTTP 503 (fixture)" },
    USGS: { ok: false, count: 0, error: "timeout (fixture)" },
    "NASA EONET": { ok: false, count: 0, error: "HTTP 500 (fixture)" },
  },
  point: POINT,
  generatedAt: "2026-10-22T19:00:00Z",
};

/* Una fuente responde sin eventos y dos caen (regresión 26-oct): la
 * respuesta NO puede afirmar que consultó las tres. */
const fixturePartialDown = {
  alerts: [],
  sources: {
    NWS: { ok: true, count: 0 },
    USGS: { ok: false, count: 0, error: "timeout (fixture)" },
    "NASA EONET": { ok: false, count: 0, error: "HTTP 500 (fixture)" },
  },
  point: POINT,
  generatedAt: "2026-10-22T19:00:00Z",
};

/* Una alerta vencida y una vigente (regresión 26-oct): la vencida no cuenta. */
const fixtureExpired = {
  alerts: [
    {
      event: "Heat Advisory", severity: "Severe",
      headline: "Heat Advisory EXPIRED (fixture QA)",
      area: "Berks, PA", ends: "2020-01-01T00:00:00Z",
      source: "NWS", url: "https://api.weather.gov/alerts/fixture-expired",
    },
    {
      event: "Special Weather Statement", severity: "Minor",
      headline: "Patchy fog possible overnight (fixture QA)",
      area: "Berks, PA", ends: null,
      source: "NWS", url: "https://api.weather.gov/alerts/fixture-fog",
    },
  ],
  sources: { NWS: { ok: true, count: 2 }, USGS: { ok: true, count: 0 }, "NASA EONET": { ok: true, count: 0 } },
  point: POINT,
  generatedAt: "2026-10-22T19:00:00Z",
};

const withFixture = (payload) => ({ getAlerts: async () => payload });
const Q = { mode: "guardian", text: "¿Hay algo peligroso cerca de mí?", location: POINT };

async function waitHealth(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return await r.json();
    } catch { /* aún no levanta */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("el gateway no levantó en el puerto de prueba");
}

async function main() {
  console.log("NOA Guardian — QA del modo Guardian (Dock)");
  console.log("===========================================");

  // ---- Fixtures deterministas (sin red) ----
  const g1 = await answerGuardian(Q, withFixture(fixtureSevere));
  const b1 = g1.body;
  check("G1", "Fixture severa → aviso prioritario + fuentes por alerta",
    g1.status === 200 && b1.source === "feeds" && b1.guardian?.proactiveAlert === true &&
      /AVISO PRIORITARIO/.test(b1.text) && b1.text.includes("Tornado Warning") &&
      b1.guardian.bySeverity.Severe === 1 && b1.guardian.bySeverity.Moderate === 1 &&
      b1.citations.length === 2 && b1.citations.every((c) => c.includes("NWS") && c.includes("https://")),
    `proactive=${b1.guardian?.proactiveAlert} citas=${b1.citations?.length}`);

  const g2 = await answerGuardian(Q, withFixture(fixtureMinor));
  check("G2", "Fixture leve → sin aviso prioritario, alerta con fuente",
    g2.status === 200 && g2.body.guardian?.proactiveAlert === false &&
      !/AVISO PRIORITARIO/.test(g2.body.text) &&
      g2.body.text.includes("Special Weather Statement") && /Fuente: NWS/.test(g2.body.text),
    `total=${g2.body.guardian?.total}`);

  const g3 = await answerGuardian(Q, withFixture(fixtureEmpty));
  check("G3", "Sin alertas → se declara «sin alertas oficiales activas»",
    g3.status === 200 && /sin alertas oficiales activas/i.test(g3.body.text) &&
      g3.body.citations.length === 0 && g3.body.guardian?.proactiveAlert === false,
    "citations=[] y hueco declarado");

  const g4 = await answerGuardian(Q, withFixture(fixtureDown));
  check("G4", "Todas las fuentes caídas → no se afirma seguridad",
    g4.status === 200 && /no pude consultar/i.test(g4.body.text) &&
      !/sin alertas oficiales activas/i.test(g4.body.text) &&
      g4.body.guardian?.proactiveAlert === false,
    "incertidumbre declarada, jamás rellenada");

  const closedList = isProactive({ event: "Flash Flood Warning", severity: "Moderate" });
  const leveFuera = isProactive({ event: "Special Weather Statement", severity: "Minor" });
  const rankRule = isProactive({ event: "Freeze Warning", severity: "Severe" });
  check("G5", "Regla proactiva: lista cerrada + rango de severidad",
    closedList === true && leveFuera === false && rankRule === true &&
      assessAlerts(fixtureSevere.alerts).proactive.length === 1,
    "Moderate en lista dispara; Minor fuera de lista no");

  const g6 = await answerGuardian({ mode: "guardian", text: "" }, withFixture(fixtureEmpty));
  check("G6", "Sin texto → 400", g6.status === 400 && g6.body.error === "missing_text");

  const g9 = await answerGuardian(Q, withFixture(fixturePartialDown));
  check("G9", "Caída parcial sin eventos → se declara qué fuente faltó (no «consulté las tres»)",
    g9.status === 200 && /No pude consultar/.test(g9.body.text) &&
      g9.body.text.includes("USGS") && g9.body.text.includes("NASA EONET") &&
      !/Consulté NWS, USGS y NASA EONET/.test(g9.body.text) &&
      /no es un «todo despejado»/.test(g9.body.text),
    "hueco parcial declarado con nombres");

  const g10 = await answerGuardian(Q, withFixture(fixtureExpired));
  check("G10", "Alerta vencida → excluida del conteo y de la clasificación",
    g10.status === 200 && g10.body.guardian?.total === 1 &&
      g10.body.guardian?.expiredExcluded === 1 &&
      !g10.body.text.includes("Heat Advisory") &&
      g10.body.guardian?.proactiveAlert === false,
    `total=${g10.body.guardian?.total} excluidas=${g10.body.guardian?.expiredExcluded}`);

  // ---- Contrato HTTP contra el gateway real ----
  const child = spawn("node", [join(REPO, "dock/gateway/src/server.js")], {
    env: { ...process.env, PORT: String(PORT), CORPUS_DIR: join(REPO, "corpus") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  child.stdout.on("data", (d) => (serverLog += d));
  child.stderr.on("data", (d) => (serverLog += d));
  try {
    await waitHealth();
    const ask = async (body) => {
      const r = await fetch(`${BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: r.status, body: await r.json() };
    };
    const live = await ask({ mode: "guardian", text: "¿Es seguro salir ahora?" });
    const lb = live.body;
    check("G7", "HTTP guardian real → 200 con forma de contrato §1 + bloque guardian",
      live.status === 200 && typeof lb.text === "string" && Array.isArray(lb.citations) &&
        lb.source === "feeds" && lb.usage?.costUsd === 0 &&
        lb.guardian && typeof lb.guardian.total === "number" &&
        typeof lb.guardian.bySeverity === "object" &&
        typeof lb.guardian.proactiveRule === "string" &&
        lb.citations.every((c) => typeof c === "string"),
      `total vivo=${lb.guardian?.total} proactive=${lb.guardian?.proactiveAlert}`);

    const aw = await ask({ mode: "awareness", text: "Describe riesgos en esta foto" });
    check("G8", "HTTP awareness → sigue 501 declarado (SAM en el sprint)",
      aw.status === 501 && aw.body.error === "not_implemented");
  } catch (err) {
    check("G0", "arranque del gateway", false, String(err?.message || err));
    if (serverLog) console.log("\n--- log del gateway ---\n" + serverLog);
  } finally {
    child.kill("SIGTERM");
  }

  // ---- Autenticación del Dock (regresión 26-oct) ----
  // Un segundo gateway con DOCK_TOKEN: sin cabecera → 401 en /ask;
  // con la cabecera correcta → 200; /health sigue abierto (sondeo de vida).
  const PORT2 = 18125;
  const BASE2 = `http://127.0.0.1:${PORT2}`;
  const authChild = spawn("node", [join(REPO, "dock/gateway/src/server.js")], {
    env: { ...process.env, PORT: String(PORT2), CORPUS_DIR: join(REPO, "corpus"), DOCK_TOKEN: "qa-token-secreto" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      try { const r = await fetch(`${BASE2}/health`); up = r.ok; } catch { /* aún no */ }
      if (!up) await new Promise((r) => setTimeout(r, 250));
    }
    const healthOpen = await fetch(`${BASE2}/health`);
    const noTok = await fetch(`${BASE2}/ask`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "citizen", text: "¿Puedo grabar una conversación?" }),
    });
    const withTok = await fetch(`${BASE2}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Dock-Token": "qa-token-secreto" },
      body: JSON.stringify({ mode: "citizen", text: "¿Puedo grabar una conversación?" }),
    });
    check("G11", "Dock con DOCK_TOKEN → 401 sin cabecera, 200 con cabecera, /health abierto",
      up && healthOpen.status === 200 && noTok.status === 401 && withTok.status === 200,
      `sin=${noTok.status} con=${withTok.status} health=${healthOpen.status}`);
  } catch (err) {
    check("G11", "Dock con DOCK_TOKEN → 401 sin cabecera, 200 con cabecera, /health abierto", false, String(err?.message || err));
  } finally {
    authChild.kill("SIGTERM");
  }

  const passed = results.filter((r) => r.ok).length;
  console.log("-------------------------------------------");
  console.log(`RESULTADO: ${passed === results.length ? "PASS" : "FAIL"} — ${passed}/${results.length} verificaciones Guardian`);
  process.exit(passed === results.length ? 0 : 1);
}

main();
