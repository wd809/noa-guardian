import type { FuenteSalud } from '@noa-guardian/contracts';

/**
 * Lógica pura del orbe de estados y del semáforo de fuentes (Etapa D, D1).
 * Diseño: Muse Spark 1.3 (consulta 2026-10-29), integrado por Noa.
 * Principio rector: el orbe jamás afirma una calma que no puede verificar.
 *
 * Precedencia (mayor primero): gris (sin conexión) > rojo (alerta oficial
 * activa) > ámbar (algo sin verificar) > verde (calma verificada).
 * La severidad NO cambia el color: cambia el texto y el pulso.
 * Las fuentes `not_configured` no cuentan ni para el verde ni para el ámbar:
 * son un estado declarado, no un fallo.
 */
export type OrbState = 'green' | 'amber' | 'red' | 'gray';

export interface OrbInput {
  /** false cuando el Dock no respondió (red, timeout o 5xx). */
  reachable: boolean;
  /** Alertas oficiales activas según GET /alerts (0 si aún no se consultó). */
  alertsCount: number;
  /**
   * false cuando /alerts no pudo consultarse (sin emparejar o error): sin
   * esa comprobación no se puede afirmar la calma — el orbe cae a ámbar.
   */
  alertsKnown?: boolean;
  /** Titular de la alerta principal, para la etiqueta del estado rojo. */
  topHeadline?: string | null;
  /** Salud por fuente según GET /health/sources (null si aún no se consultó). */
  sources: Record<string, FuenteSalud> | null;
  /** Marca ISO de la última comprobación con éxito, para el estado gris. */
  lastCheckAt?: string | null;
}

export interface OrbResult {
  state: OrbState;
  label: string;
  /** Fuentes configuradas que no se pudieron verificar (degradadas o caídas). */
  unverified: string[];
}

export function unverifiedSources(
  sources: Record<string, FuenteSalud> | null,
): string[] {
  if (!sources) return [];
  return Object.entries(sources)
    .filter(([, s]) => s.state === 'degraded' || s.state === 'down')
    .map(([name]) => name);
}

export function computeOrbState(input: OrbInput): OrbResult {
  const unverified = unverifiedSources(input.sources);
  if (!input.reachable) {
    return {
      state: 'gray',
      label: input.lastCheckAt
        ? `Offline — last check ${input.lastCheckAt}`
        : 'Offline — no check yet',
      unverified,
    };
  }
  if (input.alertsCount > 0) {
    return {
      state: 'red',
      label: input.topHeadline
        ? `Official alert: ${input.topHeadline}`
        : 'Official alert active',
      unverified,
    };
  }
  if (input.alertsKnown === false) {
    return {
      state: 'amber',
      label: 'Partial view — alerts not checked',
      unverified,
    };
  }
  if (unverified.length > 0) {
    return {
      state: 'amber',
      label: `Partial view — ${unverified.length} unverified`,
      unverified,
    };
  }
  if (input.alertsKnown !== true || input.sources === null) {
    return {
      state: 'amber',
      label: 'Partial view — check incomplete',
      unverified,
    };
  }
  return { state: 'green', label: 'All clear — verified', unverified };
}

/** Fila lista para pintar en el semáforo de fuentes. */
export interface SourceRow {
  name: string;
  state: FuenteSalud['state'];
  label: string;
  color: 'green' | 'amber' | 'red' | 'gray';
  detail: string;
}

const STATE_ORDER: Record<FuenteSalud['state'], number> = {
  down: 0,
  degraded: 1,
  ok: 2,
  not_configured: 3,
};

function ageText(lastOkAt: string | null, now: Date): string {
  if (!lastOkAt) return 'no successful check yet';
  const seconds = Math.max(
    0,
    Math.round((now.getTime() - new Date(lastOkAt).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ago`;
}

/**
 * Semáforo por fuente (diseño Spark 1.3): caídas primero, no configuradas al
 * final; la edad del dato siempre visible; el error crudo nunca es titular.
 */
export function sourceRows(
  sources: Record<string, FuenteSalud> | null,
  now: Date = new Date(),
): SourceRow[] {
  if (!sources) return [];
  return Object.entries(sources)
    .map(([name, s]): SourceRow => {
      // La última lectura verificada acompaña a la edad del dato, nunca sola.
      const withSummary = (detail: string): string =>
        s.summary ? `${detail} · ${s.summary}` : detail;
      switch (s.state) {
        case 'ok':
          return {
            name,
            state: s.state,
            label: 'Live',
            color: 'green',
            detail: withSummary(
              s.lastOkAt
                ? `Updated ${ageText(s.lastOkAt, now)}`
                : 'Live — recent check',
            ),
          };
        case 'degraded':
          return {
            name,
            state: s.state,
            label: 'Degraded',
            color: 'amber',
            detail: withSummary(
              s.lastOkAt
                ? `Slow or partial data — last good data ${ageText(s.lastOkAt, now)}`
                : 'Slow or partial data — no good data yet',
            ),
          };
        case 'down':
          return {
            name,
            state: s.state,
            label: 'Down',
            color: 'red',
            detail: withSummary(
              s.lastOkAt
                ? `Unavailable — last good data ${ageText(s.lastOkAt, now)}`
                : 'Unavailable — no good data yet',
            ),
          };
        case 'not_configured':
          return {
            name,
            state: s.state,
            label: 'Not connected',
            color: 'gray',
            detail: 'Access pending — not part of verification',
          };
      }
    })
    .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]);
}
