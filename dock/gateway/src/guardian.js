/* guardian.js — Modo Guardian del Guardian Dock v1 (contrato §1 + §2).
 *
 * Convierte las alertas oficiales YA normalizadas por feeds.js (NWS, USGS,
 * NASA EONET) en una evaluación de seguridad de la ZONA, lista para la PWA
 * y para TTS. Sin LLM: composición determinista, como Citizen v1. En el
 * sprint, `brain` (Muse Spark) podrá redactar lenguaje natural SOBRE esta
 * evaluación sin cambiar su forma ni sus fuentes.
 *
 * Reglas duras que este módulo hace cumplir:
 *  - SOLO alertas oficiales vigentes de feeds.js: cada afirmación de la
 *    respuesta nace de una alerta concreta y lleva su fuente (y su URL).
 *  - Si no hay alertas, se dice tal cual: «sin alertas oficiales activas».
 *    Si una fuente no respondió, se declara — jamás se afirma «es seguro»
 *    a partir de un hueco de datos.
 *  - El peligro se define por ZONA (alertas del área) — nunca por identidad
 *    de personas (regla dura 1). Nada se persiste: ni la pregunta ni la
 *    ubicación quedan guardadas (regla dura 2).
 *
 * REGLA DE AVISO PROACTIVO (documentada también en docs/GUARDIAN-MODE-V1.md):
 * una alerta dispara aviso prioritario si cumple CUALQUIERA de:
 *   (a) su severidad normalizada es «Severe» o «Extreme» (rango ≥ 3), o
 *   (b) su evento pertenece a la LISTA CERRADA PROACTIVE_EVENTS (avisos de
 *       peligro inmediato para la vida, aunque la fuente los etiquete con
 *       severidad menor, p. ej. un «Flash Flood Warning» Moderate).
 * La lista es cerrada a propósito: ampliarla exige cambiar este archivo y
 * la doc, no un ajuste silencioso en tiempo de ejecución.
 */
import { getAlerts, DEFAULT_POINT } from "./feeds.js";

export const SEVERITY_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
export const PROACTIVE_MIN_RANK = SEVERITY_RANK.Severe;

/* Lista cerrada de eventos de peligro inmediato (comparación por inclusión
 * sobre el nombre del evento en minúsculas, sin acentos). */
export const PROACTIVE_EVENTS = [
  "tornado warning",
  "flash flood warning",
  "extreme wind warning",
  "hurricane warning",
  "tsunami warning",
  "avalanche warning",
  "blizzard warning",
  "evacuation",
];

export function severityRank(severity) {
  return SEVERITY_RANK[severity] ?? 0;
}

function normalizeEvent(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isProactive(alert) {
  if (severityRank(alert?.severity) >= PROACTIVE_MIN_RANK) return true;
  const ev = normalizeEvent(alert?.event);
  return PROACTIVE_EVENTS.some((p) => ev.includes(p));
}

/* Solo alertas VIGENTES (corrección 26-oct): una alerta con `ends` en el
 * pasado no cuenta ni se clasifica — presentarla como activa inflaría el
 * riesgo y contradice «solo alertas vigentes». Las que no traen fin
 * (USGS/EONET) se conservan. */
export function liveAlerts(alerts, nowMs = Date.now()) {
  return alerts.filter((a) => {
    if (!a.ends) return true;
    const t = Date.parse(a.ends);
    return Number.isNaN(t) || t > nowMs;
  });
}

/* Resumen por severidad de un conjunto de alertas ya normalizadas. */
export function assessAlerts(alerts) {
  const bySeverity = { Extreme: 0, Severe: 0, Moderate: 0, Minor: 0, Unknown: 0 };
  for (const a of alerts) {
    const sev = Object.hasOwn(SEVERITY_RANK, a.severity) ? a.severity : "Unknown";
    bySeverity[sev] += 1;
  }
  const sorted = [...alerts].sort((x, y) => severityRank(y.severity) - severityRank(x.severity));
  const proactive = sorted.filter(isProactive);
  return { total: alerts.length, bySeverity, sorted, proactive };
}

function citationOf(a) {
  return `${a.source} — ${a.event} (${a.severity || "Unknown"})${a.url ? ` · ${a.url}` : ""}`;
}

function alertLine(a) {
  const vig = a.ends ? ` Vigente hasta ${a.ends}.` : "";
  const area = a.area ? ` Zona: ${a.area}.` : "";
  return `• [${a.severity || "Unknown"}] ${a.event} — ${a.headline || ""}${area}${vig} Fuente: ${a.source}${a.url ? ` (${a.url})` : ""}.`;
}

const MAX_LISTED = 5;

export function buildGuardianBody(input, payload, pointInfo) {
  const { sources } = payload;
  const live = liveAlerts(payload.alerts || []);
  const expiredExcluded = (payload.alerts || []).length - live.length;
  const { total, bySeverity, sorted, proactive } = assessAlerts(live);
  const failedSources = Object.entries(sources || {})
    .filter(([, s]) => !s.ok)
    .map(([n]) => n);
  const okSources = Object.entries(sources || {})
    .filter(([, s]) => s.ok)
    .map(([n]) => n);
  const allFailed = failedSources.length > 0 && Object.keys(sources || {}).length === failedSources.length;

  const head = [];
  if (pointInfo.defaulted) {
    head.push(
      `Sin ubicación compartida en esta consulta, evalúo el punto por defecto (${pointInfo.label}).`
    );
  }

  let core;
  if (allFailed) {
    // Sin datos NO se afirma ni seguridad ni peligro (contrato §2).
    core =
      `No pude consultar las fuentes oficiales en este momento (${failedSources.join(", ")} sin respuesta), ` +
      `así que no puedo evaluar tu zona: no afirmo que estés seguro ni que haya peligro. ` +
      `Vuelve a intentarlo en unos minutos.`;
  } else if (total === 0 && failedSources.length) {
    // Cero eventos SOLO en las fuentes que respondieron (corrección 26-oct):
    // afirmar «consulté las tres y ninguna reporta» cuando alguna cayó
    // oculta un hueco de información — exactamente lo prohibido arriba.
    core =
      `Sin eventos vigentes en las fuentes que sí respondieron (${okSources.join(", ")}). ` +
      `No pude consultar: ${failedSources.join(", ")} — esas fuentes podrían tener alertas que ahora no veo, ` +
      `así que esto no es un «todo despejado». Vuelve a intentarlo en unos minutos.`;
  } else if (total === 0) {
    core =
      `Sin alertas oficiales activas para tu zona ahora mismo. Consulté ${okSources.join(", ")} ` +
      `y ninguna reporta eventos vigentes para este punto. Ojo: esto cubre solo alertas oficiales ` +
      `publicadas; no es una garantía de seguridad.`;
  } else {
    const counts = Object.entries(bySeverity)
      .filter(([, n]) => n > 0)
      .map(([sev, n]) => `${n} ${sev}`)
      .join(", ");
    const parts = [`Hay ${total} alerta${total === 1 ? "" : "s"} oficial${total === 1 ? "" : "es"} activa${total === 1 ? "" : "s"} para tu zona (${counts}):`];
    if (proactive.length) {
      parts.push(
        `⚠ AVISO PRIORITARIO: ${proactive.length} cumple${proactive.length === 1 ? "" : "n"} la regla de aviso proactivo ` +
          `(severidad Severe o superior, o evento de peligro inmediato): ${proactive.map((a) => a.event).join("; ")}.`
      );
    }
    parts.push(...sorted.slice(0, MAX_LISTED).map(alertLine));
    if (total > MAX_LISTED) parts.push(`…y ${total - MAX_LISTED} más de menor severidad.`);
    if (failedSources.length) {
      parts.push(`Nota: la fuente ${failedSources.join(", ")} no respondió; esta evaluación no la incluye (fallo declarado, no rellenado).`);
    }
    parts.push("Evalúo solo alertas oficiales vigentes de tu zona; ante una emergencia inmediata, llama al 911.");
    core = parts.join("\n");
  }

  return {
    text: [...head, core].join("\n"),
    /* Extensión documentada del §1 (ver docs/GUARDIAN-MODE-V1.md): en modo
     * guardian, `citations` lleva la fuente oficial de cada alerta citada —
     * en el scaffold sin Dock este campo iba vacío porque no había fuentes. */
    citations: allFailed ? [] : sorted.slice(0, MAX_LISTED).map(citationOf),
    source: "feeds",
    usage: { model: "dock-guardian-feeds-v1", inputTokens: 0, outputTokens: 0, costUsd: 0 },
    guardian: {
      point: { lat: pointInfo.lat, lon: pointInfo.lon, defaulted: Boolean(pointInfo.defaulted) },
      total,
      expiredExcluded,
      bySeverity,
      proactiveAlert: proactive.length > 0 && !allFailed,
      proactiveRule:
        "severity ≥ Severe (rango ≥ 3) o evento en la lista cerrada PROACTIVE_EVENTS de guardian.js",
      alerts: sorted.map((a) => ({
        event: a.event, severity: a.severity, headline: a.headline, area: a.area,
        ends: a.ends ?? null, source: a.source, url: a.url,
      })),
      sources,
      generatedAt: payload.generatedAt || new Date().toISOString(),
    },
  };
}

/* Respuesta del modo guardian (contrato §1). `deps.getAlerts` permite
 * inyectar fixtures en QA sin tocar la red. */
export async function answerGuardian(input, deps = {}) {
  const text = String(input?.text || "").trim();
  if (!text) {
    return { status: 400, body: { error: "missing_text", detail: "POST /ask requiere { mode, text }." } };
  }
  const fetchAlerts = deps.getAlerts || getAlerts;
  const defaultPoint = deps.defaultPoint || DEFAULT_POINT;
  const loc = input?.location;
  const hasLoc = loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon);
  const pointInfo = hasLoc
    ? { lat: loc.lat, lon: loc.lon, defaulted: false }
    : { lat: defaultPoint.lat, lon: defaultPoint.lon, defaulted: true, label: defaultPoint.label };

  const payload = await fetchAlerts(pointInfo.lat, pointInfo.lon);
  return { status: 200, body: buildGuardianBody(input, payload, pointInfo) };
}
