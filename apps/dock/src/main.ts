import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { DockConfigService } from './config/dock-config.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Mismos límites que el gateway legado: cuerpo JSON <= 256 KB y CORS
  // abierto para la PWA (la autenticación la pone el token, no el origen).
  app.useBodyParser('json', { limit: '256kb' });
  app.enableCors({
    origin: '*',
    methods: 'GET,POST,OPTIONS',
    allowedHeaders: 'Content-Type, X-Dock-Token, X-Session-Id',
  });
  const config = app.get(DockConfigService);
  await app.listen(config.port, '0.0.0.0');
}
await bootstrap();
