import { Module } from '@nestjs/common';
import { ContainmentModule } from '../containment/containment.module.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { AlertsController } from './alerts.controller.js';
import { AskController } from './ask.controller.js';
import { GuardianService } from './guardian.service.js';

@Module({
  imports: [ProvidersModule, ContainmentModule],
  controllers: [AlertsController, AskController],
  providers: [GuardianService],
  exports: [GuardianService],
})
export class GuardianModule {}
