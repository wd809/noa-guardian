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
      <p><em>Placeholder honesto de la Etapa A: sin sesión emparejada todavía.</em></p>
    </section>
  `,
})
export class Sesion {
  private readonly dock = inject(DockClientService);
  private readonly budget = inject(BudgetStateService);

  protected readonly estado = signal('sin conexión');
  protected readonly detalle = signal('');
  protected readonly presupuesto = this.budget.estado;

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
