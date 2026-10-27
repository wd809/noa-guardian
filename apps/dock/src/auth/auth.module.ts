import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import { DockTokenGuard } from './dock-token.guard.js';

@Module({
  imports: [ConfigModule],
  providers: [DockTokenGuard],
  exports: [DockTokenGuard],
})
export class AuthModule {}
