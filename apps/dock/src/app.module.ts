import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { AwarenessModule } from './awareness/awareness.module.js';
import { BudgetModule } from './budget/budget.module.js';
import { CitizenModule } from './citizen/citizen.module.js';
import { ConfigModule } from './config/config.module.js';
import { ContainmentModule } from './containment/containment.module.js';
import { GuardianModule } from './guardian/guardian.module.js';
import { BridgeModule } from './bridge/bridge.module.js';
import { ObservabilityModule } from './observability/observability.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { AbusePreventionGuard } from './auth/abuse-prevention.guard.js';
import { DockTokenGuard } from './auth/dock-token.guard.js';

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
    ContainmentModule,
    BridgeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Etapa D (D3): guardia preventiva anti-abuso PRIMERO en la cadena
    // (bloqueo por fuerza bruta de token + ritmo por ruta, 429).
    { provide: APP_GUARD, useClass: AbusePreventionGuard },
    // Guardia global de token de emparejamiento (Etapa B): todo excepto
    // las rutas @Public() (GET /health) exige X-Dock-Token si está definido.
    { provide: APP_GUARD, useClass: DockTokenGuard },
  ],
})
export class AppModule {}
