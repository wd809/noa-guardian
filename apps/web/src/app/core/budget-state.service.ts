import { Injectable, signal } from '@angular/core';
import type { PresupuestoEstado } from '@noa-guardian/contracts';

/**
 * Estado de presupuesto visible en la UI.
 * Se alimenta del contador del Dock (GET /health → budget) cada vez que
 * Sesión prueba la conexión. Sin datos, actualizadoEn = null → «sin datos».
 * Política (WD, 27-oct-2026): $149.99 en créditos + $30.00 pagados autorizados.
 */
@Injectable({ providedIn: 'root' })
export class BudgetStateService {
  readonly estado = signal<PresupuestoEstado>({
    limiteUsd: 179.99,
    consumidoUsd: 0,
    restanteUsd: 179.99,
    actualizadoEn: null,
  });

  /** Aplica el contador del Dock; sin budget, deja «sin datos». */
  actualizar(
    budget?: {
      limitUsd: number;
      spentUsd: number;
      remainingUsd: number;
    } | null,
  ): void {
    if (!budget) return;
    this.estado.set({
      limiteUsd: budget.limitUsd,
      consumidoUsd: budget.spentUsd,
      restanteUsd: budget.remainingUsd,
      actualizadoEn: new Date().toLocaleString(),
    });
  }
}
