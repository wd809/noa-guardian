import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../observability/observability.module.js';
import { ContainmentController } from './containment.controller.js';
import { ContainmentInterceptor } from './containment.interceptor.js';
import { ContainmentService } from './containment.service.js';

// Bucle de contención ante inyección de prompt (SECURITY-HARDENING §6).
// Vive en el gateway, antes del modelo; el modelo no posee permisos.
@Module({
  imports: [ObservabilityModule],
  controllers: [ContainmentController],
  providers: [ContainmentService, ContainmentInterceptor],
  exports: [ContainmentService, ContainmentInterceptor],
})
export class ContainmentModule {}
