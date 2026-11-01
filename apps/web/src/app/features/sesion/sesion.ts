import { Component, computed, inject, signal } from '@angular/core';
import {
  DockClientService,
  tokenFingerprint,
} from '../../core/dock-client.service';
import { DockConnectionService } from '../../core/dock-connection.service';
import { BudgetStateService } from '../../core/budget-state.service';

type TokenEstado = 'unknown' | 'checking' | 'accepted' | 'rejected';

@Component({
  selector: 'app-sesion',
  template: `
    <section class="session">
      <h2>Session</h2>
      <p class="status">
        Dock status:
        <strong [attr.data-estado]="estado()">{{ estado() }}</strong>
      </p>
      @if (detalle()) {
        <p class="detail">{{ detalle() }}</p>
      }
      <button type="button" class="btn" (click)="probar()">
        Test Dock connection
      </button>

      <h3>Pair with your Dock</h3>
      <p class="intro">
        Your Dock's address on your network (e.g. http://192.168.1.50:3000)
        and its token. Stored on this device only.
      </p>
      <label class="field">
        Dock address
        <input
          class="input"
          type="text"
          [value]="dockUrl()"
          (input)="dockUrl.set($any($event.target).value)"
          placeholder="http://192.168.1.50:3000"
        />
      </label>
      <label class="field">
        Token
        <input
          class="input"
          type="password"
          [value]="dockToken()"
          (input)="dockToken.set($any($event.target).value)"
          placeholder="Dock token"
        />
      </label>
      <button type="button" class="btn" (click)="guardar()">
        Save and test
      </button>
      <p class="note">
        This device token:
        @if (huella()) {
          <span class="mono">{{ huella() }}</span>
        } @else {
          none
        }
      </p>
      @if (tokenEstado() === 'checking') {
        <p class="note" role="status">Checking token…</p>
      }
      @if (tokenEstado() === 'accepted') {
        <p class="token-ok" role="status">Token accepted by the Dock.</p>
      }
      @if (tokenEstado() === 'rejected') {
        <p class="alert-line" role="alert">
          Token rejected — check the value against the Dock.
        </p>
      }

      <h3>API budget</h3>
      @if (presupuesto().actualizadoEn) {
        <p class="budget">
          Spent: {{ presupuesto().consumidoUsd }} USD of
          {{ presupuesto().limiteUsd }} USD (updated:
          {{ presupuesto().actualizadoEn }})
        </p>
      } @else {
        <p class="note">
          No counter data yet — press "Test connection" to read it from the
          Dock.
        </p>
      }
      <p class="privacy">
        <em>
          Pairing is stored only on this device; the token never goes anywhere
          but your Dock.
        </em>
      </p>
    </section>
  `,
  styles: [
    `
      .session {
        display: grid;
        gap: 14px;
        max-width: 720px;
        margin: 0 auto;
        background:
          radial-gradient(ellipse at 65% 35%, #11193466, transparent 65%),
          #080c1c;
        color: #f3f4ff;
        padding: 24px;
        border: 1px solid #26314a;
        border-radius: 24px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      }
      .session h2,
      .session h3 {
        color: #f3f4ff;
        margin: 0;
      }
      .session h3 {
        margin-top: 8px;
      }
      .status {
        margin: 0;
        color: #aab9dd;
      }
      .status strong[data-estado='connected'] {
        color: #35d99a;
      }
      .status strong[data-estado='offline'] {
        color: #aab9dd;
      }
      .detail,
      .intro,
      .note,
      .budget,
      .privacy {
        margin: 0;
        color: #aab9dd;
        font-size: 14px;
        line-height: 1.55;
      }
      .budget {
        color: #f3f4ff;
      }
      .privacy {
        font-size: 13px;
      }
      .mono {
        font-family: ui-monospace, monospace;
        color: #f3f4ff;
      }
      .token-ok {
        margin: 0;
        color: #35d99a;
        font-size: 14px;
        font-weight: 600;
      }
      .alert-line {
        border: 1px solid #ffb323;
        border-radius: 14px;
        padding: 12px 16px;
        background: #ffb32314;
        color: #ffd97a;
        margin: 0;
        font-size: 14px;
      }
      .btn {
        justify-self: start;
        border: 1px solid #35d99a;
        border-radius: 12px;
        background: #35d99a;
        color: #06281c;
        font-weight: 650;
        font-size: 14px;
        padding: 10px 18px;
        cursor: pointer;
      }
      .btn:focus-visible {
        outline: 2px solid #f3f4ff;
        outline-offset: 2px;
      }
      .field {
        display: grid;
        gap: 6px;
        color: #aab9dd;
        font-size: 13px;
      }
      .input {
        width: 100%;
        box-sizing: border-box;
        background: #101626;
        border: 1px solid #26314a;
        border-radius: 12px;
        color: #f3f4ff;
        font-size: 15px;
        padding: 10px 12px;
      }
      .input::placeholder {
        color: #5a6a8a;
      }
      .input:focus {
        outline: none;
        border-color: #35d99a;
      }
    `,
  ],
})
export class Sesion {
  private readonly dock = inject(DockClientService);
  private readonly connection = inject(DockConnectionService);
  private readonly budget = inject(BudgetStateService);

  /** Misma señal que el pill: Session y pill jamás dicen otra cosa. */
  protected readonly estado = this.connection.estado;
  protected readonly detalle = signal('');
  protected readonly presupuesto = this.budget.estado;
  protected readonly dockUrl = signal(this.dock.baseUrl());
  protected readonly dockToken = signal(this.dock.token() ?? '');
  /** Huella del token GUARDADO (el que viaja): comparar con el log del Dock. */
  protected readonly huella = computed(() => {
    const t = this.dock.token();
    return t ? tokenFingerprint(t) : null;
  });
  protected readonly tokenEstado = signal<TokenEstado>('unknown');

  protected async guardar(): Promise<void> {
    const url = this.dockUrl().trim();
    if (url) this.dock.setBaseUrl(url);
    this.dock.setToken(this.dockToken().trim() || null);
    await this.probar();
  }

  protected async probar(): Promise<void> {
    const health = await this.connection.refresh();
    if (!health) {
      this.detalle.set('The Dock did not answer. Check that it is on.');
      this.tokenEstado.set('unknown');
      return;
    }
    this.detalle.set(
      `${health.project} v${health.version} — Dock time: ${health.time}`,
    );
    // El Dock Nest incluye su contador en /health (DockHealth.budget).
    const budget = (
      health as typeof health & {
        budget?: { limitUsd: number; spentUsd: number; remainingUsd: number };
      }
    ).budget;
    this.budget.actualizar(budget ?? null);
    // /health es público: no valida el token. El veredicto real sale de
    // un endpoint protegido; sin token guardado no hay nada que probar.
    if (!this.dock.token()) {
      this.tokenEstado.set('unknown');
      return;
    }
    this.tokenEstado.set('checking');
    try {
      this.tokenEstado.set((await this.dock.checkAuth()) ? 'accepted' : 'rejected');
    } catch {
      this.tokenEstado.set('unknown');
    }
  }
}
