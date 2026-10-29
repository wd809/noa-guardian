/**
 * Circuit breaker por fuente oficial (Etapa D, pieza D2 — diseño de la
 * evaluación de Muse Spark 1.2 aprobada por WD el 2026-10-28, implementado
 * por Noa porque el canal de código de Spark truncaba los archivos).
 *
 * Regla: 3 fallos consecutivos abren el circuito 5 minutos. Mientras está
 * abierto NO se llama a la fuente (se declara el hueco, jamás se rellena).
 * Al vencer el plazo hay un intento de prueba: si responde, el circuito se
 * cierra y los fallos vuelven a 0; si falla, se reabre otros 5 minutos.
 * Sin dependencias externas; el reloj es inyectable para las pruebas.
 */
export type SourceName = 'NWS' | 'USGS' | 'NASA EONET' | 'PennDOT';
export type SourceState = 'ok' | 'degraded' | 'down' | 'not_configured';

export interface SourceHealth {
  state: SourceState;
  consecutiveFailures: number;
  lastOkAt: string | null;
  lastError: string | null;
  circuitOpenUntil: string | null;
}

export const CIRCUIT_OPEN_AFTER = 3;
export const CIRCUIT_OPEN_MS = 5 * 60_000;

interface Entry {
  failures: number;
  openUntil: number;
  lastOkAt: number | null;
  lastError: string | null;
}

const SOURCES: SourceName[] = ['NWS', 'USGS', 'NASA EONET'];

export class CircuitBreakerRegistry {
  private readonly entries = new Map<SourceName, Entry>();

  constructor(private readonly nowFn: () => number = () => Date.now()) {}

  private entry(source: SourceName): Entry {
    let e = this.entries.get(source);
    if (!e) {
      e = { failures: 0, openUntil: 0, lastOkAt: null, lastError: null };
      this.entries.set(source, e);
    }
    return e;
  }

  recordSuccess(source: SourceName): void {
    const e = this.entry(source);
    e.failures = 0;
    e.openUntil = 0;
    e.lastOkAt = this.nowFn();
    e.lastError = null;
  }

  recordFailure(source: SourceName, error: string): void {
    const e = this.entry(source);
    e.failures += 1;
    e.lastError = error;
    if (e.failures >= CIRCUIT_OPEN_AFTER) {
      e.openUntil = this.nowFn() + CIRCUIT_OPEN_MS;
    }
  }

  isOpen(source: SourceName): boolean {
    return this.entry(source).openUntil > this.nowFn();
  }

  minutesSinceLastOk(source: SourceName): number | null {
    const e = this.entry(source);
    if (e.lastOkAt === null) return null;
    return Math.max(0, Math.floor((this.nowFn() - e.lastOkAt) / 60_000));
  }

  /** Salud de UNA fuente (también las que no están en el snapshot fijo). */
  snapshotOne(source: SourceName): SourceHealth {
    const now = this.nowFn();
    const e = this.entry(source);
    const open = e.openUntil > now;
    return {
      state: open ? 'down' : e.failures > 0 ? 'degraded' : 'ok',
      consecutiveFailures: e.failures,
      lastOkAt:
        e.lastOkAt === null ? null : new Date(e.lastOkAt).toISOString(),
      lastError: e.lastError,
      circuitOpenUntil: open ? new Date(e.openUntil).toISOString() : null,
    };
  }

  snapshot(): Record<SourceName, SourceHealth> {
    const now = this.nowFn();
    const out = {} as Record<SourceName, SourceHealth>;
    for (const s of SOURCES) {
      const e = this.entry(s);
      const open = e.openUntil > now;
      const state: SourceState = open
        ? 'down'
        : e.failures > 0
          ? 'degraded'
          : 'ok';
      out[s] = {
        state,
        consecutiveFailures: e.failures,
        lastOkAt: e.lastOkAt === null ? null : new Date(e.lastOkAt).toISOString(),
        lastError: e.lastError,
        circuitOpenUntil: open ? new Date(e.openUntil).toISOString() : null,
      };
    }
    return out;
  }
}
