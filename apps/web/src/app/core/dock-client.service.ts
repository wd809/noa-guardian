import { Injectable, signal } from '@angular/core';
import type {
  AlertasRespuesta,
  FuentesSaludRespuesta,
  GuardianAnswer,
  GuardianAskInput,
  HealthResponse,
} from '@noa-guardian/contracts';

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
    } catch {
      /* Sin URL legible (pruebas). */
    }
  }

  setBaseUrl(url: string): void {
    this.baseUrl.set(url.replace(/\/$/, ''));
    this.persist('guardian.dockUrl', this.baseUrl());
  }

  setToken(token: string | null): void {
    this.token.set(token);
    this.persist('guardian.dockToken', token);
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

  async health(): Promise<HealthResponse> {
    const res = await fetch(`${this.baseUrl()}/health`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Dock /health respondió ${res.status}`);
    return (await res.json()) as HealthResponse;
  }

  /** Etapa D (D1): salud por fuente para el semáforo. Ruta pública, sin token. */
  async sourcesHealth(): Promise<FuentesSaludRespuesta> {
    const res = await fetch(`${this.baseUrl()}/health/sources`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Dock /health/sources respondió ${res.status}`);
    return (await res.json()) as FuentesSaludRespuesta;
  }

  /** Alertas oficiales activas (respuesta completa del contrato §2). Requiere token. */
  async alerts(lat: number, lon: number): Promise<AlertasRespuesta> {
    const res = await fetch(`${this.baseUrl()}/alerts?lat=${lat}&lon=${lon}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Dock /alerts respondió ${res.status}`);
    return (await res.json()) as AlertasRespuesta;
  }

  /** Etapas B–D: el Dock nuevo aún no sirve /ask; el método existe contra el contrato. */
  async ask(input: GuardianAskInput): Promise<GuardianAnswer> {
    const res = await fetch(`${this.baseUrl()}/ask`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Dock /ask respondió ${res.status}`);
    return (await res.json()) as GuardianAnswer;
  }
}
