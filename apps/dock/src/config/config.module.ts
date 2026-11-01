import { Module } from '@nestjs/common';
import { DockConfigService } from './dock-config.service.js';

@Module({
  providers: [DockConfigService],
  exports: [DockConfigService],
})
export class ConfigModule {}
