import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { DockConfigService } from './config/dock-config.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Cabeceras de seguridad (Etapa D, D3 — «helmet» mínimo hecho a mano,
  // sin dependencias): la app no se enmarca, no se adivina su tipo y no
  // filtra el referente.
  app.use(
    (
      _req: unknown,
      res: { setHeader: (k: string, v: string) => void },
      next: () => void,
    ) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('X-DNS-Prefetch-Control', 'off');
      next();
    },
  );
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
