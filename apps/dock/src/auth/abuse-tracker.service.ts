import { Inject, Injectable, Optional } from '@nestjs/common';
import { createHash } from 'node:crypto';

/**
 * Registro anti-abuso en memoria (Etapa D, pieza D3 — diseño de la
 * evaluación de Muse Spark 1.2 aprobada por WD el 2026-10-28; el borrador
 * de Spark llegó truncado por el límite de su canal y lo completó Noa).
 *
 * Dos mecanismos, ambos sin persistencia (nada sale del proceso):
 *  1. Cubetas de ritmo por IP y clase de ruta (ventana fija de 60 s):
 *     /alerts 30/min · /ask 15/min · el resto 60/min.
 *  2. Bloqueo preventivo por fuerza bruta de token: 5 fallos de
 *     autenticación en 60 s → la IP queda bloqueada 15 minutos.
 * Las IP se registran solo como hash corto (sha256, 8 hex) cuando haga
 * falta diagnosticar; nunca en claro en respuestas ni en disco.
 */
interface Bucket {
  count: number;
  windowStart: number;
}

export type RouteClass = 'alerts' | 'ask' | 'general';

const WINDOW_MS = 60_000;
const AUTH_FAIL_THRESHOLD = 5;
const AUTH_BLOCK_MS = 15 * 60_000;
const LIMITS: Record<RouteClass, number> = {
  alerts: 30,
  ask: 15,
  general: 60,
};

@Injectable()
export class AbuseTrackerService {
  private readonly buckets = new Map<string, Bucket>();
  private readonly failures = new Map<string, number[]>();
  private readonly blocks = new Map<string, number>();
  private readonly nowFn: () => number;

  constructor(
    // Reloj inyectable SOLO para pruebas unitarias (new manual); en Nest
    // nadie provee este token y @Optional lo deja en el reloj real.
    @Optional() @Inject('ABUSE_NOW_FN') nowFn?: () => number,
  ) {
    this.nowFn = nowFn ?? (() => Date.now());
  }

  ipHash(ip: string): string {
    return createHash('sha256').update(ip).digest('hex').slice(0, 8);
  }

  /** true si la petición cabe en el ritmo permitido para su clase. */
  allow(ip: string, routeClass: RouteClass): boolean {
    const now = this.nowFn();
    const key = `${ip}:${routeClass}`;
    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
      this.buckets.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (bucket.count >= LIMITS[routeClass]) return false;
    bucket.count += 1;
    return true;
  }

  /** Registra un fallo de token; al 5.º en 60 s la IP queda bloqueada. */
  recordAuthFailure(ip: string): void {
    const now = this.nowFn();
    const recent = (this.failures.get(ip) ?? []).filter(
      (t) => now - t < WINDOW_MS,
    );
    recent.push(now);
    this.failures.set(ip, recent);
    if (recent.length >= AUTH_FAIL_THRESHOLD) {
      this.blocks.set(ip, now + AUTH_BLOCK_MS);
    }
  }

  isBlocked(ip: string): boolean {
    const until = this.blocks.get(ip);
    if (!until) return false;
    if (until <= this.nowFn()) {
      this.blocks.delete(ip);
      return false;
    }
    return true;
  }
}
