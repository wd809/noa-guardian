import { Injectable, Logger } from '@nestjs/common';

/**
 * Configuración del Dock desde el entorno (nombres en apps/dock/.env.example).
 * Sin valores por defecto peligrosos: en producción, sin DOCK_TOKEN o sin
 * DOCK_CORS_ORIGINS el Dock NO arranca (fail-closed). En desarrollo el modo
 * abierto se permite pero se grita en el log.
 */
@Injectable()
export class DockConfigService {
  private readonly logger = new Logger('DockConfig');

  readonly port: number;
  readonly dockToken: string;
  readonly aiProviderDefault: string;
  readonly budgetUsdLimit: number;
  readonly nodeEnv: string;
  /** Orígenes CORS declarados; null = sin configurar (dev: abierto). */
  readonly corsOrigins: string[] | null;
  /** Confiar en X-Forwarded-For del proxy inverso (solo tras un proxy propio). */
  readonly trustProxy: boolean;
  /** Enviar Strict-Transport-Security (solo tras HTTPS real). */
  readonly hsts: boolean;

  constructor() {
    this.port = Number(process.env.DOCK_PORT ?? process.env.PORT ?? 3000);
    this.dockToken = process.env.DOCK_TOKEN ?? '';
    this.aiProviderDefault = process.env.AI_PROVIDER_DEFAULT ?? 'mock';
    const budget = Number(process.env.BUDGET_USD_LIMIT ?? '179.99');
    this.budgetUsdLimit = Number.isFinite(budget) ? budget : 179.99;
    this.nodeEnv = process.env.NODE_ENV ?? 'development';
    const origins = (process.env.DOCK_CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    this.corsOrigins = origins.length > 0 ? origins : null;
    this.trustProxy =
      process.env.DOCK_TRUST_PROXY === '1' ||
      process.env.DOCK_TRUST_PROXY === 'true';
    this.hsts =
      process.env.DOCK_HSTS === '1' || process.env.DOCK_HSTS === 'true';

    if (!this.tokenEnabled) {
      if (this.isProduction) {
        throw new Error(
          'DOCK_TOKEN es obligatorio en producción: el Dock no arranca en modo abierto.',
        );
      }
      this.logger.warn(
        'DOCK_TOKEN no definido: el Dock acepta peticiones sin token. ' +
          'Solo aceptable en desarrollo local.',
      );
    }
    if (this.isProduction && !this.corsOrigins) {
      throw new Error(
        'DOCK_CORS_ORIGINS es obligatorio en producción: declara los orígenes de la PWA.',
      );
    }
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get tokenEnabled(): boolean {
    return this.dockToken.length > 0;
  }
}
