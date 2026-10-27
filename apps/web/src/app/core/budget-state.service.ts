import { Injectable, signal } from '@angular/core';
import type { PresupuestoEstado } from '@noa-guardian/contracts';

/**
 * Estado de presupuesto visible en la UI.
 * Etapa A: estructura sin datos reales (actualizadoEn = null → «sin datos»).
 * El contador transaccional que alimenta este estado llega en la Etapa D.
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
}
