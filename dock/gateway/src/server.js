/* server.js — Guardian Dock v1: gateway único (ADR-003, docs/DOCK.md).
 *
 * v1 es un monolito modular a propósito: este proceso cumple los roles
 * `gateway` + `feeds` + `citizen` del diseño. En el sprint se separan
 * `brain` (Muse Spark, Meta Model API) y `vision` (SAM 3.1) como servicios
 * propios SIN cambiar los contratos de docs/CONTRACTS.md:
 *   - POST /ask    → contrato §1 (askGuardian). Hoy: Citizen extractivo
 *                    sobre el corpus (citizen.js) y Guardian REAL sobre las
 *                    alertas oficiales de feeds.js (guardian.js); awareness
 *                    responde 501 declarado hasta que llegue vision.
 *   - GET  /alerts → contrato §2 ampliado (NWS + USGS + NASA EONET).
 *   - POST /see    → stub declarado 501 (SAM 3.1 entra el Día 2 del sprint).
 *   - GET  /health → estado del Dock, del corpus y de las fuentes.
 *
 * Cero dependencias (solo node:http) y cero persistencia: nada del usuario
 * se guarda — ni preguntas, ni ubicación, ni imágenes (regla dura 2).
 */
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCorpus, answerCitizen } from "./citizen.js";
import { answerGuardian } from "./guardian.js";
import { getAlerts, feedsStatus, DEFAULT_POINT } from "./feeds.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const VERSION = "1.0.0";

/* Autenticación de aplicación (endurecimiento 26-oct, hallazgo de revisión
 * externa): si el despliegue define DOCK_TOKEN, TODO endpoint excepto
 * GET /health exige la cabecera `X-Dock-Token` con ese valor. Sin token
 * configurado el Dock arranca en modo abierto y lo GRITA en el log: ese
 * modo solo es aceptable en desarrollo local. Tailscale/LAN son transporte
 * privado, NO autenticación — por eso el token vive en la aplicación. */
const DOCK_TOKEN = process.env.DOCK_TOKEN || "";
function tokenOk(req) {
  if (!DOCK_TOKEN) return true;
  const given = String(req.headers["x-dock-token"] || "");
  const a = Buffer.from(given);
  const b = Buffer.from(DOCK_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* El corpus llega por volumen Docker (/corpus) o por CORPUS_DIR; en
 * desarrollo local se cae a ../../corpus relativo a este archivo. */
function resolveCorpusDir() {
  const candidates = [
    process.env.CORPUS_DIR,
    "/corpus",
    join(HERE, "..", "..", "..", "corpus"),
  ].filter(Boolean);
  return candidates.find((d) => existsSync(d)) || candidates[0];
}

const corpusDir = resolveCorpusDir();
let corpus;
try {
  corpus = loadCorpus(corpusDir);
  console.log(`[dock] corpus cargado: ${corpus.docs.length} piezas, ${corpus.chunks.length} fragmentos (${corpusDir})`);
} catch (err) {
  corpus = { docs: [], chunks: [], loadedAt: null, error: String(err?.message || err) };
  console.error(`[dock] ERROR cargando el corpus en ${corpusDir}: ${corpus.error}`);
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Dock-Token",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function readBody(req, cap = 256 * 1024) {
  return new Promise((resolve, reject) => {
    const parts = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > cap) { reject(new Error("body_too_large")); req.destroy(); return; }
      parts.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(parts).toString("utf8")));
    req.on("error", reject);
  });
}

const NOT_IMPLEMENTED_ASK = {
  error: "not_implemented",
  detail:
    "El Dock v1 implementa /ask en modos citizen (corpus verificado) y " +
    "guardian (alertas oficiales NWS/USGS/NASA EONET). El modo awareness " +
    "llega con el servicio vision (SAM 3.1) durante el sprint, sin cambiar " +
    "el contrato §1. Mientras tanto la PWA usa su respaldo local " +
    "etiquetado como mock para awareness.",
  source: "dock",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://dock.local");
  try {
    if (req.method === "OPTIONS") return json(res, 204, {});

    // /health queda abierto a propósito (sondeo de vida sin datos); todo lo
    // demás exige el token cuando el despliegue lo configura.
    const isHealth = req.method === "GET" && url.pathname === "/health";
    if (!isHealth && !tokenOk(req)) {
      return json(res, 401, {
        error: "unauthorized",
        detail: "Este Dock exige la cabecera X-Dock-Token (emparejamiento). Configura el token en la PWA o revisa el DOCK_TOKEN del despliegue.",
      });
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, {
        status: corpus.error ? "degraded" : "ok",
        service: "guardian-dock",
        version: VERSION,
        time: new Date().toISOString(),
        corpus: {
          documents: corpus.docs.length,
          chunks: corpus.chunks.length,
          loadedAt: corpus.loadedAt,
          dir: corpusDir,
          ...(corpus.error ? { error: corpus.error } : {}),
        },
        feeds: feedsStatus(),
        endpoints: {
          "GET /alerts": "ok",
          "POST /ask": "citizen ok · guardian ok (alertas oficiales) · awareness 501 (sprint)",
          "POST /see": "501 stub (SAM 3.1, Día 2 del sprint)",
        },
      });
    }

    if (req.method === "GET" && url.pathname === "/alerts") {
      const latQ = parseFloat(url.searchParams.get("lat"));
      const lonQ = parseFloat(url.searchParams.get("lon"));
      const hasPoint = Number.isFinite(latQ) && Number.isFinite(lonQ);
      const lat = hasPoint ? latQ : DEFAULT_POINT.lat;
      const lon = hasPoint ? lonQ : DEFAULT_POINT.lon;
      const payload = await getAlerts(lat, lon);
      return json(res, 200, {
        ...payload,
        point: { ...payload.point, defaulted: !hasPoint, ...(hasPoint ? {} : { label: DEFAULT_POINT.label }) },
        fuente: "NWS · USGS · NASA EONET (fuentes oficiales)",
      });
    }

    if (req.method === "POST" && url.pathname === "/ask") {
      let input;
      try {
        input = JSON.parse(await readBody(req));
      } catch {
        return json(res, 400, { error: "invalid_json", detail: "POST /ask espera JSON { mode, text }." });
      }
      const mode = input?.mode || "citizen";
      if (mode === "citizen") {
        const { status, body } = answerCitizen(corpus, input);
        return json(res, status, body);
      }
      if (mode === "guardian") {
        // Guardian REAL: evalúa las alertas oficiales vigentes (feeds.js)
        // para el punto del usuario o el punto por defecto declarado.
        const { status, body } = await answerGuardian(input);
        return json(res, status, body);
      }
      if (mode === "awareness") {
        return json(res, 501, { ...NOT_IMPLEMENTED_ASK, mode });
      }
      return json(res, 400, { error: "invalid_mode", detail: `Modo desconocido: ${mode}` });
    }

    if (req.method === "POST" && url.pathname === "/see") {
      // Stub declarado: SAM 3.1 (Meta Model API) se integra el Día 2 del
      // sprint. Hoy el Dock NO procesa imágenes — y lo dice.
      return json(res, 501, {
        error: "not_implemented",
        endpoint: "POST /see",
        detail:
          "Awareness por visión llega con SAM 3.1 (Meta Model API) el Día 2 del sprint. " +
          "El Dock v1 no procesa ni almacena imágenes.",
        source: "dock",
      });
    }

    if (req.method === "GET" && url.pathname === "/") {
      return json(res, 200, {
        service: "guardian-dock",
        version: VERSION,
        docs: "docs/DOCK.md · docs/CONTRACTS.md",
        endpoints: ["GET /health", "GET /alerts?lat&lon", "POST /ask", "POST /see (501)"],
      });
    }

    return json(res, 404, { error: "not_found", path: url.pathname });
  } catch (err) {
    return json(res, 500, { error: "internal", detail: String(err?.message || err) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[dock] Guardian Dock v${VERSION} escuchando en :${PORT}`);
  console.log(
    DOCK_TOKEN
      ? "[dock] autenticación por token ACTIVA (X-Dock-Token)."
      : "[dock] AVISO: DOCK_TOKEN no definido — el Dock acepta peticiones sin token. Solo aceptable en desarrollo local."
  );
});
