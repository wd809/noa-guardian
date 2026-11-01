import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppModule } from './app.module.js';
import { tokenFingerprint } from './auth/token-fingerprint.js';
import { HttpErrorFilter } from './common/http-error.filter.js';
import { DockConfigService } from './config/dock-config.service.js';

/**
 * Carga apps/dock/.env cuando existe, sin pisar las variables que ya vengan
 * del entorno (el entorno manda). Sin dependencias: usa
 * `process.loadEnvFile` (Node ≥22) con un lector KEY=VALUE de respaldo.
 * Devuelve el archivo cargado, o null si no había ninguno.
 */
function loadDockEnv(): string | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(process.cwd(), '.env'),
    join(process.cwd(), 'apps/dock/.env'),
    join(here, '../.env'),
    join(here, '../../apps/dock/.env'),
  ];
  const seen = new Set<string>();
  for (const file of candidates) {
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const loader = (
      process as typeof process & { loadEnvFile?: (path?: string) => void }
    ).loadEnvFile;
    if (typeof loader === 'function') {
      loader.call(process, file);
    } else {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const clean = line.trim();
        if (!clean || clean.startsWith('#') || !clean.includes('=')) continue;
        const eq = clean.indexOf('=');
        const key = clean.slice(0, eq).trim();
        if (!key || process.env[key] !== undefined) continue;
        let value = clean.slice(eq + 1).trim();
        if (
          value.length >= 2 &&
          ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'")))
        ) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
    return file;
  }
  return null;
}

async function bootstrap() {
  const hadSessionToken = (process.env.DOCK_TOKEN?.length ?? 0) > 0;
  const envFile = loadDockEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(DockConfigService);
  const logger = new Logger('Bootstrap');
  if (envFile) {
    logger.log(`Variables cargadas desde ${envFile} (el entorno manda).`);
  } else {
    logger.log('Sin archivo .env: solo variables del entorno.');
  }
  // Huella del token EFECTIVO (nunca el valor): comparar con la vista
  // Session del teléfono para cazar despareos en segundos.
  if (config.tokenEnabled) {
    const source = hadSessionToken ? 'session env' : 'file .env';
    logger.log(
      `token fingerprint: ${tokenFingerprint(config.dockToken)} (source: ${source}).`,
    );
  } else {
    logger.log('token: none (open mode).');
  }

  if (config.trustProxy) {
    // Detrás de un proxy inverso propio: req.ip real para el rate-limit.
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  // Cabeceras de seguridad (Etapa D, D3 + endurecimiento 30-oct, sin
  // dependencias): la API no se enmarca, no ejecuta nada activo y no filtra
  // el referente. HSTS solo tras HTTPS real (DOCK_HSTS=1).
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
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; frame-ancestors 'none'",
      );
      res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=()',
      );
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      if (config.hsts) {
        res.setHeader(
          'Strict-Transport-Security',
          'max-age=15552000; includeSubDomains',
        );
      }
      next();
    },
  );
  // POST /see acepta fotos de hasta 5 MB (el controlador lo valida): un
  // único parser JSON por petición — 6mb para /see, 256kb para el resto.
  // (Dos parsers encadenados NO sirven: el segundo re-evalúa el límite con
  // el content-length y rechaza con 413 lo que el primero ya aceptó.)
  const jsonSee = json({ limit: '6mb' });
  const jsonDefault = json({ limit: '256kb' });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/see' || req.path === '/see/') {
      jsonSee(req, res, next);
    } else {
      jsonDefault(req, res, next);
    }
  });
  if (config.corsOrigins) {
    // Producción: solo los orígenes declarados por el propietario.
    app.enableCors({
      origin: config.corsOrigins,
      methods: 'GET,POST,OPTIONS',
      allowedHeaders: 'Content-Type, X-Dock-Token, X-Session-Id',
    });
  } else {
    // Sin lista solo se llega en desarrollo (en producción la config no
    // deja arrancar). La autenticación la pone el token, no el origen.
    logger.warn('CORS abierto (*): solo aceptable en desarrollo local.');
    app.enableCors({
      origin: '*',
      methods: 'GET,POST,OPTIONS',
      allowedHeaders: 'Content-Type, X-Dock-Token, X-Session-Id',
    });
  }
  // Errores no declarados como JSON mínimo, sin pilas ni detalle interno.
  app.useGlobalFilters(new HttpErrorFilter());
  await app.listen(config.port, '0.0.0.0');
}
await bootstrap();
