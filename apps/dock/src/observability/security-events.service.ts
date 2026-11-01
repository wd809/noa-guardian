import { Injectable, Logger } from '@nestjs/common';
import type { EventoSeguridad } from '@noa-guardian/contracts';

/**
 * Registro mínimo de eventos de seguridad (SECURITY-HARDENING §6, paso 3):
 * solo hora y tipo de señal. SIN contenido personal: nunca el texto del
 * usuario, nunca su ubicación, nunca su identidad. En memoria (anillo de
 * 100) — el Dock no persiste nada del usuario (regla dura 2).
 */
@Injectable()
export class SecurityEventsService {
  private readonly logger = new Logger('SecurityEvents');
  private readonly events: EventoSeguridad[] = [];
  private readonly capacity = 100;

  record(type: string): EventoSeguridad {
    const event: EventoSeguridad = { time: new Date().toISOString(), type };
    this.events.push(event);
    if (this.events.length > this.capacity) this.events.shift();
    this.logger.warn(`evento de seguridad: ${type} @ ${event.time}`);
    return event;
  }

  list(): EventoSeguridad[] {
    return [...this.events];
  }

  count(): number {
    return this.events.length;
  }
}
