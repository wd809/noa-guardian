import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from './config/config.module.js';
import { AuthModule } from './auth/auth.module.js';
import { GuardianModule } from './guardian/guardian.module.js';
import { CitizenModule } from './citizen/citizen.module.js';
import { AwarenessModule } from './awareness/awareness.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { BudgetModule } from './budget/budget.module.js';
import { ObservabilityModule } from './observability/observability.module.js';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    GuardianModule,
    CitizenModule,
    AwarenessModule,
    ProvidersModule,
    BudgetModule,
    ObservabilityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
