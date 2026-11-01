import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import { BudgetService } from './budget.service.js';

// Contador de gasto de API con tope impuesto (contrato §4): en memoria por
// proceso. SQLite persistente queda como mejora declarada.
@Module({
  imports: [ConfigModule],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
