import { Controller, Get, HttpException, Query } from '@nestjs/common';
import type { AlertasRespuesta } from '@noa-guardian/contracts';
import {
  DEFAULT_POINT,
  OfficialFeedsProvider,
} from '../providers/official-feeds.provider.js';
import { parseAlertPoint } from './point-validation.js';

/** GET /alerts — contrato §2 ampliado (fuentes oficiales del Dock). */
@Controller()
export class AlertsController {
  constructor(private readonly feeds: OfficialFeedsProvider) {}

  @Get('alerts')
  async alerts(
    @Query('lat') latQ?: string,
    @Query('lon') lonQ?: string,
  ): Promise<AlertasRespuesta> {
    let point: { lat: number; lon: number; defaulted: boolean };
    try {
      point = parseAlertPoint(latQ, lonQ, DEFAULT_POINT);
    } catch (err) {
      throw new HttpException(
        {
          error: 'invalid_point',
          detail:
            err instanceof Error
              ? err.message
              : 'Invalid point: lat in [-90, 90], lon in [-180, 180].',
        },
        400,
      );
    }
    const payload = await this.feeds.getAlerts(point.lat, point.lon);
    return {
      ...payload,
      point: {
        ...payload.point,
        defaulted: point.defaulted,
        ...(point.defaulted ? { label: DEFAULT_POINT.label } : {}),
      },
      fuente: 'NWS · USGS · NASA EONET · USGS Water · AirNow · PennDOT (official sources)',
    };
  }
}
