import { Injectable, signal } from '@angular/core';
import type {
  AlertasRespuesta,
  FuentesSaludRespuesta,
  GuardianAnswer,
  GuardianAskInput,
  HealthResponse,
  SeeRespuesta,
  SeeSolicitud,
} from '@noa-guardian/contracts';

/** Timeout por petición al Dock: sin respuesta, la UI declara sin conexión. */
const DOCK_TIMEOUT_MS = 10_000;
/**
 * POST /see tarda: subir la foto + el modelo de visión (el Dock le da
 * 20 s). La UI espera hasta 60 s antes de declarar sin conexión.
 */
const SEE_TIMEOUT_MS = 60_000;

/**
 * Error declarado del Dock: conserva el estado HTTP y el código del Dock
 * (unauthorized, rate_limited, budget_exceeded…) para que la vista decida
 * qué mostrar en vez de un genérico.
 */
export class DockError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'DockError';
  }
}

/**
 * Huella de emparejamiento: 8 hex de un hash NO criptográfico (cyrb53) del
 * token. Solo sirve para comparar a ojo "¿este teléfono y este Dock hablan
 * del mismo token?" — se muestra en la vista Session, NUNCA viaja por red
 * ni sustituye al token.
 *
 * El MISMO algoritmo vive en el Dock (auth/token-fingerprint): cualquier
 * cambio aquí debe replicarse allí, y el vector de prueba es idéntico en
 * ambas suites para que un desfase rompa los tests.
 */
export function tokenFingerprint(token: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < token.length; i++) {
    const ch = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0))
    .toString(16)
    .padStart(14, '0')
    .slice(0, 8);
}

/**
 * Mensaje honesto para un fallo del Dock: sin respuesta → como Session;
 * con respuesta → el estado y código declarados, sin inventar causas.
 */
export function describeDockError(err: unknown): string {
  if (err instanceof DockError) {
    if (err.status === null) {
      return 'The Dock did not answer. Check that it is on and paired in Session.';
    }
    const code = err.code ? ` (${err.code})` : '';
    const pairing = err.status === 401 ? ' Check pairing in Session.' : '';
    return `The Dock answered ${err.status}${code}.${pairing}`;
  }
  return err instanceof Error ? err.message : 'Unexpected error.';
}

/**
 * Cliente del Guardian Dock (contrato: packages/contracts).
 * Etapa A: base sin llamadas automáticas — la UI solo llama cuando el
 * usuario lo pide. Etapa D: la vista Guardian sondea /health/sources y
 * /alerts; el emparejamiento puede llegar por enlace (parámetros
 * `?dock=` y `?token=` en la URL de apertura, patrón del puente D5).
 */
@Injectable({ providedIn: 'root' })
export class DockClientService {
  readonly baseUrl = signal('http://localhost:3000');
  readonly token = signal<string | null>(null);

  constructor() {
    // 1) Lo guardado en el dispositivo (la app Android empareja una vez).
    try {
      const savedUrl = globalThis.localStorage?.getItem('guardian.dockUrl');
      const savedToken = globalThis.localStorage?.getItem('guardian.dockToken');
      if (savedUrl) this.baseUrl.set(savedUrl);
      if (savedToken) this.token.set(savedToken);
    } catch {
      /* Sin almacenamiento (pruebas): se quedan los valores por defecto. */
    }
    // 2) El enlace de emparejamiento (?dock= / ?token=) manda sobre lo guardado.
    try {
      const params = new URLSearchParams(globalThis.location?.search ?? '');
      const dock = params.get('dock');
      const token = params.get('token');
      if (dock) this.setBaseUrl(dock);
      if (token) this.setToken(token);
      // El token no se queda en la URL: historial y capturas no lo ven.
      if ((dock || token) && globalThis.history?.replaceState) {
        params.delete('dock');
        params.delete('token');
        const rest = params.toString();
        const clean =
          globalThis.location.pathname + (rest ? `?${rest}` : '') + globalThis.location.hash;
        globalThis.history.replaceState(null, '', clean);
      }
    } catch {
      /* Sin URL legible (pruebas). */
    }
  }

  setBaseUrl(url: string): void {
    const clean = url.trim().replace(/\/$/, '');
    if (!/^https?:\/\/.+/.test(clean)) {
      throw new Error('Invalid Dock address: use http(s)://host:port.');
    }
    this.baseUrl.set(clean);
    this.persist('guardian.dockUrl', this.baseUrl());
  }

  setToken(token: string | null): void {
    const clean = token?.trim() || null;
    this.token.set(clean);
    this.persist('guardian.dockToken', clean);
  }

  private persist(key: string, value: string | null): void {
    try {
      if (value) globalThis.localStorage?.setItem(key, value);
      else globalThis.localStorage?.removeItem(key);
    } catch {
      /* El emparejamiento en memoria sigue valiendo para la sesión. */
    }
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const token = this.token();
    if (token) headers['x-dock-token'] = token;
    return headers;
  }

  private async request(
    path: string,
    init?: RequestInit,
    timeoutMs: number = DOCK_TIMEOUT_MS,
  ): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl()}${path}`, {
        ...init,
        headers: this.headers(),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new DockError(
        err instanceof Error && err.name === 'TimeoutError'
          ? `The Dock did not answer within ${timeoutMs / 1000} s`
          : 'Cannot reach the Dock',
        null,
        null,
      );
    }
    if (!res.ok) {
      let code: string | null = null;
      try {
        const body = (await res.clone().json()) as { error?: unknown };
        if (typeof body?.error === 'string') code = body.error;
      } catch {
        /* Respuesta no JSON: se conserva solo el estado. */
      }
      throw new DockError(
        `Dock ${path} answered ${res.status}${code ? ` (${code})` : ''}`,
        res.status,
        code,
      );
    }
    return res;
  }

  async health(): Promise<HealthResponse> {
    const res = await this.request('/health');
    return (await res.json()) as HealthResponse;
  }

  /** Etapa D (D1): salud por fuente para el semáforo. Ruta pública, sin token. */
  async sourcesHealth(): Promise<FuentesSaludRespuesta> {
    const res = await this.request('/health/sources');
    return (await res.json()) as FuentesSaludRespuesta;
  }

  /** Alertas oficiales activas (respuesta completa del contrato §2). Requiere token. */
  async alerts(lat: number, lon: number): Promise<AlertasRespuesta> {
    const res = await this.request(`/alerts?lat=${lat}&lon=${lon}`);
    return (await res.json()) as AlertasRespuesta;
  }

  /** POST /ask (contrato §1): guardian y citizen reales; awareness declara 501. */
  async ask(input: GuardianAskInput): Promise<GuardianAnswer> {
    const res = await this.request('/ask', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return (await res.json()) as GuardianAnswer;
  }

  /**
   * Valida el token guardado contra un endpoint protegido barato (GET
   * /bridge/devices: solo lectura en memoria, sin fuentes externas):
   * true si el Dock lo acepta, false si responde 401. Otros fallos
   * (sin red, timeout, 5xx) se relanzan tal cual, sin inventar veredicto.
   */
  async checkAuth(): Promise<boolean> {
    try {
      await this.request('/bridge/devices');
      return true;
    } catch (err) {
      if (err instanceof DockError && err.status === 401) return false;
      throw err;
    }
  }

  /** POST /see (contrato D6): presencia sin identidad. Requiere token. */
  async see(input: SeeSolicitud): Promise<SeeRespuesta> {
    const res = await this.request(
      '/see',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      SEE_TIMEOUT_MS,
    );
    return (await res.json()) as SeeRespuesta;
  }
}
