import { Injectable, Logger } from '@nestjs/common';

/**
 * Configuración del Dock desde el entorno (nombres en apps/dock/.env.example).
 * Sin valores por defecto peligrosos: si DOCK_TOKEN no está definido, el Dock
 * arranca en modo abierto y lo grita en el log — ese modo solo es aceptable
 * en desarrollo local (misma regla que el gateway legado, server.js).
 */
@Injectable()
export class DockConfigService {
  private readonly logger = new Logger('DockConfig');

  readonly port: number;
  readonly dockToken: string;
  readonly aiProviderDefault: string;
  readonly budgetUsdLimit: number;
  readonly nodeEnv: string;

  constructor() {
    this.port = Number(process.env.DOCK_PORT ?? process.env.PORT ?? 3000);
    this.dockToken = process.env.DOCK_TOKEN ?? '';
    this.aiProviderDefault = process.env.AI_PROVIDER_DEFAULT ?? 'mock';
    const budget = Number(process.env.BUDGET_USD_LIMIT ?? '179.99');
    this.budgetUsdLimit = Number.isFinite(budget) ? budget : 179.99;
    this.nodeEnv = process.env.NODE_ENV ?? 'development';

    if (!this.tokenEnabled) {
      this.logger.warn(
        'DOCK_TOKEN no definido: el Dock acepta peticiones sin token. ' +
          'Solo aceptable en desarrollo local.',
      );
    }
  }

  get tokenEnabled(): boolean {
    return this.dockToken.length > 0;
  }
}
