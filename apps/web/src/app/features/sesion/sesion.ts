import { Component, inject, signal } from '@angular/core';
import { DockClientService } from '../../core/dock-client.service';
import { BudgetStateService } from '../../core/budget-state.service';

@Component({
  selector: 'app-sesion',
  template: `
    <section>
      <h2>Sesión</h2>
      <p>Estado del Dock: <strong>{{ estado() }}</strong></p>
      @if (detalle()) {
        <p>{{ detalle() }}</p>
      }
      <button type="button" (click)="probar()">Probar conexión con el Dock</button>

      <h3>Emparejar con tu Dock</h3>
      <p>
        La dirección del Dock en tu red (p. ej. http://192.168.1.50:3000) y su
        token. Se guarda en este dispositivo.
      </p>
      <label>
        Dirección del Dock
        <input
          type="text"
          [value]="dockUrl()"
          (input)="dockUrl.set($any($event.target).value)"
          placeholder="http://192.168.1.50:3000"
        />
      </label>
      <label>
        Token
        <input
          type="password"
          [value]="dockToken()"
          (input)="dockToken.set($any($event.target).value)"
          placeholder="Token del Dock"
        />
      </label>
      <button type="button" (click)="guardar()">Guardar y probar</button>

      <h3>Presupuesto de API</h3>
      @if (presupuesto().actualizadoEn) {
        <p>
          Consumido: {{ presupuesto().consumidoUsd }} USD de
          {{ presupuesto().limiteUsd }} USD (actualizado:
          {{ presupuesto().actualizadoEn }})
        </p>
      } @else {
        <p>Sin datos del contador todavía — el contador real llega en la Etapa D.</p>
      }
      <p><em>El emparejamiento se guarda solo en este dispositivo; el token nunca sale hacia otro destino que tu Dock.</em></p>
    </section>
  `,
})
export class Sesion {
  private readonly dock = inject(DockClientService);
  private readonly budget = inject(BudgetStateService);

  protected readonly estado = signal('sin conexión');
  protected readonly detalle = signal('');
  protected readonly presupuesto = this.budget.estado;
  protected readonly dockUrl = signal(this.dock.baseUrl());
  protected readonly dockToken = signal(this.dock.token() ?? '');

  protected async guardar(): Promise<void> {
    const url = this.dockUrl().trim();
    if (url) this.dock.setBaseUrl(url);
    this.dock.setToken(this.dockToken().trim() || null);
    await this.probar();
  }

  protected async probar(): Promise<void> {
    try {
      const health = await this.dock.health();
      this.estado.set('conectado');
      this.detalle.set(
        `${health.project} v${health.version} — hora del Dock: ${health.time}`,
      );
    } catch {
      this.estado.set('sin conexión');
      this.detalle.set('El Dock no respondió. Verifica que esté encendido.');
    }
  }
}
