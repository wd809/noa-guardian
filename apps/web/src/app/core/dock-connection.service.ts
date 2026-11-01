import { Injectable, inject, signal } from '@angular/core';
import type { HealthResponse } from '@noa-guardian/contracts';
import { DockClientService } from './dock-client.service';

export type DockConnectionState = 'connected' | 'offline';

/**
 * Estado de conexión con el Dock compartido por el pill (App) y la vista
 * Session: una sola señal, una sola verdad. «connected» solo cuando el Dock
 * respondió a /health; «offline» cuando no respondió (red, timeout o 5xx).
 * El emparejamiento (dirección + token) sigue viviendo en DockClientService.
 */
@Injectable({ providedIn: 'root' })
export class DockConnectionService {
  private readonly dock = inject(DockClientService);

  readonly estado = signal<DockConnectionState>('offline');

  /**
   * Comprueba /health y actualiza la señal compartida. Devuelve la respuesta
   * cuando el Dock contestó, o null cuando no hubo respuesta.
   */
  async refresh(): Promise<HealthResponse | null> {
    try {
      const health = await this.dock.health();
      this.estado.set('connected');
      return health;
    } catch {
      this.estado.set('offline');
      return null;
    }
  }
}
