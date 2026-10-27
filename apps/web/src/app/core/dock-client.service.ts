import { Injectable, signal } from '@angular/core';
import type {
  GuardianAnswer,
  GuardianAskInput,
  HealthResponse,
  OfficialAlert,
} from '@noa-guardian/contracts';

/**
 * Cliente del Guardian Dock (contrato: packages/contracts).
 * Etapa A: base sin llamadas automáticas — la UI solo llama cuando el
 * usuario lo pide. El token de emparejamiento se fija en la Etapa B.
 */
@Injectable({ providedIn: 'root' })
export class DockClientService {
  readonly baseUrl = signal('http://localhost:3000');
  readonly token = signal<string | null>(null);

  setBaseUrl(url: string): void {
    this.baseUrl.set(url.replace(/\/$/, ''));
  }

  setToken(token: string | null): void {
    this.token.set(token);
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

  /** Etapa B: el Dock nuevo aún no sirve /alerts; el método existe contra el contrato. */
  async alerts(lat: number, lon: number): Promise<OfficialAlert[]> {
    const res = await fetch(`${this.baseUrl()}/alerts?lat=${lat}&lon=${lon}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Dock /alerts respondió ${res.status}`);
    return (await res.json()) as OfficialAlert[];
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
