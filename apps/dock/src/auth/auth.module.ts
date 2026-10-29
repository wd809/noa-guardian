import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import { AbusePreventionGuard } from './abuse-prevention.guard.js';
import { AbuseTrackerService } from './abuse-tracker.service.js';
import { DockTokenGuard } from './dock-token.guard.js';

@Module({
  imports: [ConfigModule],
  providers: [DockTokenGuard, AbuseTrackerService, AbusePreventionGuard],
  exports: [DockTokenGuard, AbuseTrackerService, AbusePreventionGuard],
})
export class AuthModule {}
