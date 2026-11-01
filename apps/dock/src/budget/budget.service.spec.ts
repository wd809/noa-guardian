import { DockConfigService } from '../config/dock-config.service.js';
import { BudgetExceededError, BudgetService } from './budget.service.js';

process.env.BUDGET_USD_LIMIT = '1';

function makeService(): BudgetService {
  return new BudgetService(new DockConfigService());
}

describe('BudgetService (tope impuesto, contrato §4)', () => {
  it('empieza en cero con el límite del entorno', () => {
    const b = makeService();
    expect(b.status()).toEqual({ limitUsd: 1, spentUsd: 0, remainingUsd: 1 });
  });

  it('record acumula gasto y baja el restante', () => {
    const b = makeService();
    b.requireBudget();
    b.record(0.25);
    b.record(0.25);
    expect(b.status()).toEqual({
      limitUsd: 1,
      spentUsd: 0.5,
      remainingUsd: 0.5,
    });
  });

  it('requireBudget lanza al alcanzar el tope', () => {
    const b = makeService();
    b.record(1);
    expect(b.status().remainingUsd).toBe(0);
    expect(() => b.requireBudget()).toThrow(BudgetExceededError);
  });

  it('ignora costos inválidos o no positivos', () => {
    const b = makeService();
    b.record(NaN);
    b.record(-2);
    b.record(0);
    expect(b.spent).toBe(0);
  });
});
