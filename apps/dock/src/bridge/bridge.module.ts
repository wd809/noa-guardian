import { Module } from '@nestjs/common';
import { GuardianModule } from '../guardian/guardian.module.js';
import { ProvidersModule } from '../providers/providers.module.js';
import { BridgeController } from './bridge.controller.js';
import { BridgeService } from './bridge.service.js';

@Module({
  imports: [GuardianModule, ProvidersModule],
  controllers: [BridgeController],
  providers: [BridgeService],
})
export class BridgeModule {}
