import { Injectable } from '@nestjs/common';
import type {
  AlertasRespuesta,
  GuardianAskResponse,
  GuardianMeta,
  OfficialAlert,
} from '@noa-guardian/contracts';
import {
  DEFAULT_POINT,
  OfficialFeedsProvider,
} from '../providers/official-feeds.provider.js';

/**
 * Modo Guardian (porte fiel de dock/gateway/src/guardian.js, contrato §1+§2):
 * convierte las alertas oficiales YA normalizadas (NWS, USGS, NASA EONET) en
 * una evaluación de seguridad de la ZONA, lista para la PWA y para TTS.
 * Composición determinista, sin LLM: cada afirmación nace de una alerta
 * concreta y lleva su fuente y su URL.
 *
 * Reglas duras:
 *  - Si no hay alertas, se dice tal cual. Si una fuente no respondió, se
 *    declara — jamás se afirma «es seguro» desde un hueco de datos.
 *  - El peligro se define por ZONA — nunca por identidad de personas.
 *  - Nada se persiste: ni la pregunta ni la ubicación (regla dura 2).
 *
 * REGLA DE AVISO PROACTIVO: una alerta dispara aviso prioritario si (a) su
 * severidad es Severe o Extreme, o (b) su evento está en la LISTA CERRADA
 * PROACTIVE_EVENTS (peligro inmediato para la vida aunque la fuente lo
 * etiquete menor). Ampliarla exige cambiar este archivo y la doc.
 */

export const SEVERITY_RANK: Record<string, number> = {
  Extreme: 4,
  Severe: 3,
  Moderate: 2,
  Minor: 1,
  Unknown: 0,
};
export const PROACTIVE_MIN_RANK = SEVERITY_RANK.Severe;

export const PROACTIVE_EVENTS = [
  'tornado warning',
  'flash flood warning',
  'extreme wind warning',
  'hurricane warning',
  'tsunami warning',
  'avalanche warning',
  'blizzard warning',
  'evacuation',
];

export function severityRank(severity: string | undefined): number {
  return SEVERITY_RANK[severity ?? ''] ?? 0;
}

function normalizeEvent(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isProactive(alert: OfficialAlert): boolean {
  if (severityRank(alert?.severity) >= PROACTIVE_MIN_RANK) return true;
  const ev = normalizeEvent(alert?.event);
  return PROACTIVE_EVENTS.some((p) => ev.includes(p));
}

/** Solo alertas VIGENTES: una con `ends` en el pasado no cuenta. */
export function liveAlerts(
  alerts: OfficialAlert[],
  nowMs: number = Date.now(),
): OfficialAlert[] {
  return alerts.filter((a) => {
    if (!a.ends) return true;
    const t = Date.parse(a.ends);
    return Number.isNaN(t) || t > nowMs;
  });
}

export function assessAlerts(alerts: OfficialAlert[]): {
  total: number;
  bySeverity: Record<string, number>;
  sorted: OfficialAlert[];
  proactive: OfficialAlert[];
} {
  const bySeverity: Record<string, number> = {
    Extreme: 0,
    Severe: 0,
    Moderate: 0,
    Minor: 0,
    Unknown: 0,
  };
  for (const a of alerts) {
    const sev = Object.hasOwn(SEVERITY_RANK, a.severity) ? a.severity : 'Unknown';
    bySeverity[sev] += 1;
  }
  const sorted = [...alerts].sort(
    (x, y) => severityRank(y.severity) - severityRank(x.severity),
  );
  const proactive = sorted.filter(isProactive);
  return { total: alerts.length, bySeverity, sorted, proactive };
}

function citationOf(a: OfficialAlert): string {
  return `${a.source} — ${a.event} (${a.severity || 'Unknown'})${a.url ? ` · ${a.url}` : ''}`;
}

function alertLine(a: OfficialAlert): string {
  const vig = a.ends ? ` Vigente hasta ${a.ends}.` : '';
  const area = a.area ? ` Zona: ${a.area}.` : '';
  return `• [${a.severity || 'Unknown'}] ${a.event} — ${a.headline || ''}${area}${vig} Fuente: ${a.source}${a.url ? ` (${a.url})` : ''}.`;
}

const MAX_LISTED = 5;

export interface PointInfo {
  lat: number;
  lon: number;
  defaulted: boolean;
  label?: string;
}

export function buildGuardianBody(
  payload: AlertasRespuesta,
  pointInfo: PointInfo,
): GuardianAskResponse & { guardian: GuardianMeta } {
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
  const allFailed =
    failedSources.length > 0 &&
    Object.keys(sources || {}).length === failedSources.length;

  const head: string[] = [];
  if (pointInfo.defaulted) {
    head.push(
      `Sin ubicación compartida en esta consulta, evalúo el punto por defecto (${pointInfo.label}).`,
    );
  }

  let core: string;
  if (allFailed) {
    // Sin datos NO se afirma ni seguridad ni peligro (contrato §2).
    core =
      `No pude consultar las fuentes oficiales en este momento (${failedSources.join(', ')} sin respuesta), ` +
      `así que no puedo evaluar tu zona: no afirmo que estés seguro ni que haya peligro. ` +
      `Vuelve a intentarlo en unos minutos.`;
  } else if (total === 0 && failedSources.length) {
    // Cero eventos SOLO en las fuentes que respondieron: no es un despeje.
    core =
      `Sin eventos vigentes en las fuentes que sí respondieron (${okSources.join(', ')}). ` +
      `No pude consultar: ${failedSources.join(', ')} — esas fuentes podrían tener alertas que ahora no veo, ` +
      `así que esto no es un «todo despejado». Vuelve a intentarlo en unos minutos.`;
  } else if (total === 0) {
    core =
      `Sin alertas oficiales activas para tu zona ahora mismo. Consulté ${okSources.join(', ')} ` +
      `y ninguna reporta eventos vigentes para este punto. Ojo: esto cubre solo alertas oficiales ` +
      `publicadas; no es una garantía de seguridad.`;
  } else {
    const counts = Object.entries(bySeverity)
      .filter(([, n]) => n > 0)
      .map(([sev, n]) => `${n} ${sev}`)
      .join(', ');
    const parts = [
      `Hay ${total} alerta${total === 1 ? '' : 's'} oficial${total === 1 ? '' : 'es'} activa${total === 1 ? '' : 's'} para tu zona (${counts}):`,
    ];
    if (proactive.length) {
      parts.push(
        `⚠ AVISO PRIORITARIO: ${proactive.length} cumple${proactive.length === 1 ? '' : 'n'} la regla de aviso proactivo ` +
          `(severidad Severe o superior, o evento de peligro inmediato): ${proactive.map((a) => a.event).join('; ')}.`,
      );
    }
    parts.push(...sorted.slice(0, MAX_LISTED).map(alertLine));
    if (total > MAX_LISTED) {
      parts.push(`…y ${total - MAX_LISTED} más de menor severidad.`);
    }
    if (failedSources.length) {
      parts.push(
        `Nota: la fuente ${failedSources.join(', ')} no respondió; esta evaluación no la incluye (fallo declarado, no rellenado).`,
      );
    }
    parts.push(
      'Evalúo solo alertas oficiales vigentes de tu zona; ante una emergencia inmediata, llama al 911.',
    );
    core = parts.join('\n');
  }

  return {
    text: [...head, core].join('\n'),
    citations: allFailed ? [] : sorted.slice(0, MAX_LISTED).map(citationOf),
    source: 'feeds',
    usage: { model: 'dock-guardian-feeds-v1', inputTokens: 0, outputTokens: 0, costUsd: 0 },
    guardian: {
      point: {
        lat: pointInfo.lat,
        lon: pointInfo.lon,
        defaulted: Boolean(pointInfo.defaulted),
      },
      total,
      expiredExcluded,
      bySeverity,
      proactiveAlert: proactive.length > 0 && !allFailed,
      proactiveRule:
        'severity ≥ Severe (rango ≥ 3) o evento en la lista cerrada PROACTIVE_EVENTS de guardian.service',
      alerts: sorted.map((a) => ({
        event: a.event,
        severity: a.severity,
        headline: a.headline,
        area: a.area,
        ends: a.ends ?? null,
        source: a.source,
        url: a.url,
      })),
      sources,
      generatedAt: payload.generatedAt || new Date().toISOString(),
    },
  };
}

@Injectable()
export class GuardianService {
  constructor(private readonly feeds: OfficialFeedsProvider) {}

  /** Respuesta del modo guardian (contrato §1). */
  async answer(input: {
    text?: unknown;
    location?: { lat?: unknown; lon?: unknown } | null;
  }): Promise<{ status: number; body: unknown }> {
    const text = String(input?.text ?? '').trim();
    if (!text) {
      return {
        status: 400,
        body: {
          error: 'missing_text',
          detail: 'POST /ask requiere { mode, text }.',
        },
      };
    }
    const loc = input?.location;
    const hasLoc =
      loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon);
    const pointInfo: PointInfo = hasLoc
      ? { lat: Number(loc.lat), lon: Number(loc.lon), defaulted: false }
      : {
          lat: DEFAULT_POINT.lat,
          lon: DEFAULT_POINT.lon,
          defaulted: true,
          label: DEFAULT_POINT.label,
        };
    const payload = await this.feeds.getAlerts(pointInfo.lat, pointInfo.lon);
    return { status: 200, body: buildGuardianBody(payload, pointInfo) };
  }
}
