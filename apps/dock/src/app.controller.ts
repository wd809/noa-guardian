import { Controller, Get } from '@nestjs/common';
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
}
