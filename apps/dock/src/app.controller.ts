import { Controller, Get } from '@nestjs/common';
import type { FuentesSaludRespuesta } from '@noa-guardian/contracts';
import { AppService } from './app.service.js';
import type { DockHealth } from './app.service.js';
import { Public } from './auth/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // /health queda abierto a propósito (sondeo de vida sin datos), como en
  // el gateway legado; todo lo demás exige el token cuando está definido.
  @Public()
  @Get('health')
  getHealth(): DockHealth {
    return this.appService.getHealth();
  }

  // Salud por fuente oficial (Etapa D, D2): estado del circuit breaker,
  // último dato válido y último error. Sin datos personales: pública como
  // /health, y es lo que alimenta el semáforo de fuentes de la app.
  @Public()
  @Get('health/sources')
  getSourcesHealth(): FuentesSaludRespuesta {
    return this.appService.getSourcesHealth();
  }
}
