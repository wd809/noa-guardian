import { Injectable } from '@nestjs/common';
import { DockConfigService } from '../config/dock-config.service.js';

/** Se lanza cuando el gasto alcanza el tope: el Dock responde 429. */
export class BudgetExceededError extends Error {
  constructor() {
    super('API budget exhausted');
    this.name = 'BudgetExceededError';
  }
}

export interface BudgetStatus {
  limitUsd: number;
  spentUsd: number;
  remainingUsd: number;
}

/**
 * Contador de gasto de API (contrato §4, tope impuesto). Cada llamada real
 * a un modelo de pago pasa por aquí: requireBudget() antes y record() con
 * el costo declarado después. Sin presupuesto, 429 budget_exceeded.
 *
 * Vive en memoria: el tope rige por proceso en ejecución. La persistencia
 * SQLite queda como mejora declarada; el tope ya se impone, no solo se registra.
 */
@Injectable()
export class BudgetService {
  private spentUsd = 0;

  constructor(private readonly config: DockConfigService) {}

  private static round6(n: number): number {
    return Math.round(n * 1_000_000) / 1_000_000;
  }

  get limit(): number {
    return this.config.budgetUsdLimit;
  }

  get spent(): number {
    return this.spentUsd;
  }

  status(): BudgetStatus {
    const spent = BudgetService.round6(this.spentUsd);
    return {
      limitUsd: this.config.budgetUsdLimit,
      spentUsd: spent,
      remainingUsd: BudgetService.round6(
        Math.max(0, this.config.budgetUsdLimit - spent),
      ),
    };
  }

  /** Lanza BudgetExceededError si el tope ya se alcanzó. */
  requireBudget(): void {
    if (this.spentUsd >= this.config.budgetUsdLimit) {
      throw new BudgetExceededError();
    }
  }

  /** Anota el costo declarado de una llamada real al modelo. */
  record(costUsd: number): void {
    if (!Number.isFinite(costUsd) || costUsd <= 0) return;
    this.spentUsd = BudgetService.round6(this.spentUsd + costUsd);
  }
}
