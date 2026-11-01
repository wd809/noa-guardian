#!/usr/bin/env node
/**
 * run-dock.mjs — QA del Guardian Dock v1 (Rol 6 · QA y Pruebas)
 *
 * Levanta el gateway real (dock/gateway/src/server.js) en un puerto de
 * prueba, con el corpus del repo, y valida los CONTRATOS:
 *   D1  GET /health            → 200, status ok, corpus cargado (>= 16 piezas §3).
 *   D2  GET /alerts            → 200, arreglo de alertas + estado por fuente
 *                                (NWS/USGS/NASA EONET); cada alerta trae
 *                                event/source/url; si una fuente cae, su
 *                                fallo viene DECLARADO (error), nunca oculto.
 *   D3  POST /ask citizen cubierta (grabar)   → source "corpus", citas con § 5703.
 *   D4  POST /ask citizen cubierta (depósito) → citas con 68 P.S. § 250.512.
 *   D5  POST /ask citizen cubierta (contratista) → citas HICPA.
 *   D6  POST /ask citizen NO cubierta         → declara «no está en el corpus»,
 *                                citations vacías (regla dura 3: no inventar).
 *   D7  POST /ask modo awareness → 501 declarado (vision/SAM llega en el
 *                                sprint). El modo guardian ya es REAL sobre
 *                                las alertas oficiales: su QA vive en
 *                                tests/run-guardian.mjs.
 *   D8  POST /see               → 501 declarado (SAM 3.1 llega en el sprint).
 *   D9  POST /ask sin text      → 400.
 *   D10 Integración PWA         → app.js consume el Dock (/ask, /alerts) y
 *                                etiqueta el respaldo mock cuando el Dock
 *                                no responde (honestidad de demo).
 *
 * Las fuentes externas pueden fallar por red: D2 exige la FORMA del
 * contrato y la declaración del fallo, no que las tres respondan.
 *
 * Uso:  node tests/run-dock.mjs    (exit 0 = todo PASS)
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");
const PORT = 18123;
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
function check(id, name, ok, detail = "") {
  results.push({ id, name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${id}  ${name}${detail ? ` — ${detail}` : ""}`);
}

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
  console.log("NOA Guardian — QA del Guardian Dock v1");
  console.log("=======================================");
  const child = spawn("node", [join(REPO, "dock/gateway/src/server.js")], {
    env: { ...process.env, PORT: String(PORT), CORPUS_DIR: join(REPO, "corpus") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  child.stdout.on("data", (d) => (serverLog += d));
  child.stderr.on("data", (d) => (serverLog += d));

  try {
    const health = await waitHealth();
    check("D1", "GET /health",
      health.status === "ok" && health.corpus?.documents >= 16 && health.corpus?.chunks > 0,
      `docs=${health.corpus?.documents} chunks=${health.corpus?.chunks}`);

    const alertsRes = await fetch(`${BASE}/alerts?lat=40.3356&lon=-75.9269`);
    const alerts = await alertsRes.json();
    const srcNames = ["NWS", "USGS", "NASA EONET"];
    const sourcesOk = srcNames.every((n) => {
      const s = alerts.sources?.[n];
      return s && typeof s.ok === "boolean" && (s.ok || (typeof s.error === "string" && s.error.length > 0));
    });
    const alertsShape = Array.isArray(alerts.alerts) && alerts.alerts.every(
      (a) => a.event && a.source && typeof a.url === "string" && a.url.startsWith("http")
    );
    check("D2", "GET /alerts (contrato + fallo declarado por fuente)",
      alertsRes.status === 200 && sourcesOk && alertsShape,
      srcNames.map((n) => `${n}:${alerts.sources?.[n]?.ok ? `ok(${alerts.sources[n].count})` : "declarado-caído"}`).join(" "));

    const ask = async (body) => {
      const r = await fetch(`${BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: r.status, body: await r.json() };
    };

    const grab = await ask({ mode: "citizen", text: "¿Puedo grabar una conversación privada en Pensilvania?" });
    check("D3", "POST /ask citizen — grabar (Wiretap)",
      grab.status === 200 && grab.body.source === "corpus" &&
        grab.body.citations?.length >= 1 && grab.body.citations.join(" ").includes("5703"),
      `citas=${grab.body.citations?.length ?? 0}`);

    const dep = await ask({ mode: "citizen", text: "Mi arrendador no me devuelve el depósito de seguridad" });
    check("D4", "POST /ask citizen — depósito (68 P.S. § 250.512)",
      dep.status === 200 && dep.body.citations?.join(" ").includes("250.512"),
      `citas=${dep.body.citations?.length ?? 0}`);

    const con = await ask({ mode: "citizen", text: "El contratista me cobró un adelanto y desapareció sin terminar el trabajo" });
    check("D5", "POST /ask citizen — contratista (HICPA)",
      con.status === 200 && con.body.citations?.length >= 1 &&
        /HICPA|Home Improvement/i.test(con.body.citations.join(" ") + con.body.text),
      `citas=${con.body.citations?.length ?? 0}`);

    const luna = await ask({ mode: "citizen", text: "¿Cuál es la pena por minería ilegal de asteroides en la Luna?" });
    check("D6", "POST /ask citizen — tema NO cubierto se declara",
      luna.status === 200 && luna.body.citations?.length === 0 &&
        /no está en el corpus/i.test(luna.body.text || ""),
      "citations=[] y hueco declarado");

    const ca = await ask({ mode: "citizen", text: "¿Cuánto tiempo tiene mi casero para devolverme el depósito de seguridad en California?" });
    check("D12", "POST /ask citizen — jurisdicción: California nombrada → NO se responde con ley de PA",
      ca.status === 200 && ca.body.citations?.length === 0 &&
        /California/.test(ca.body.text || "") && !/250\.512/.test(ca.body.text || ""),
      "puerta de jurisdicción: abstención etiquetada");

    const aw = await ask({ mode: "awareness", text: "Describe riesgos en esta foto" });
    check("D7", "POST /ask modo awareness → 501 declarado",
      aw.status === 501 && aw.body.error === "not_implemented");

    const seeRes = await fetch(`${BASE}/see`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const see = await seeRes.json();
    check("D8", "POST /see → 501 stub declarado (SAM 3.1)",
      seeRes.status === 501 && see.error === "not_implemented" && /SAM 3\.1/.test(see.detail || ""));

    const bad = await ask({ mode: "citizen", text: "" });
    check("D9", "POST /ask sin texto → 400", bad.status === 400);

    const appJs = readFileSync(join(REPO, "app.js"), "utf8");
    check("D10", "PWA consume el Dock y etiqueta el respaldo",
      appJs.includes("/ask") && appJs.includes("/alerts") &&
        appJs.includes("DOCK_BASE") && /[Rr]espaldo/.test(appJs) &&
        appJs.includes("mockAskGuardian"),
      "app.js: dockFetch + fallback mock etiquetado");

    const swJs = readFileSync(join(REPO, "sw.js"), "utf8");
    check("D11", "Service worker: caché SOLO de la cáscara listada (nunca respuestas con datos)",
      swJs.includes("SHELL_PATHS") && swJs.includes("url.search") &&
        swJs.indexOf("SHELL_PATHS.has(url.pathname)") !== -1 &&
        swJs.indexOf("SHELL_PATHS.has(url.pathname)") < swJs.indexOf("cache.put"),
      "sw.js: lista explícita antes de cualquier cache.put");

    check("D13", "PWA: la pregunta guardian lleva ubicación y el emparejamiento envía X-Dock-Token",
      appJs.includes("input.location") && appJs.includes("getPositionSoft") &&
        appJs.includes("X-Dock-Token") && appJs.includes("dock_token"),
      "app.js: location en /ask (guardian) + cabecera de emparejamiento");
  } catch (err) {
    check("D0", "arranque del gateway", false, String(err?.message || err));
    if (serverLog) console.log("\n--- log del gateway ---\n" + serverLog);
  } finally {
    child.kill("SIGTERM");
  }

  const passed = results.filter((r) => r.ok).length;
  console.log("---------------------------------------");
  console.log(`RESULTADO: ${passed === results.length ? "PASS" : "FAIL"} — ${passed}/${results.length} verificaciones del Dock`);
  process.exit(passed === results.length ? 0 : 1);
}

main();
