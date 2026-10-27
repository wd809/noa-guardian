import { Module } from '@nestjs/common';
import { SecurityEventsService } from './security-events.service.js';

// Observabilidad: registro mínimo de eventos de seguridad (hora y tipo de
// señal; sin contenido personal). Sin telemetría de terceros.
@Module({
  providers: [SecurityEventsService],
  exports: [SecurityEventsService],
})
export class ObservabilityModule {}
