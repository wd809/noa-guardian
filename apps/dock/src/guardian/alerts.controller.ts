import { Controller, Get, Query } from '@nestjs/common';
import type { AlertasRespuesta } from '@noa-guardian/contracts';
import {
  DEFAULT_POINT,
  OfficialFeedsProvider,
} from '../providers/official-feeds.provider.js';

/** GET /alerts — contrato §2 ampliado (NWS · USGS · NASA EONET). */
@Controller()
export class AlertsController {
  constructor(private readonly feeds: OfficialFeedsProvider) {}

  @Get('alerts')
  async alerts(
    @Query('lat') latQ?: string,
    @Query('lon') lonQ?: string,
  ): Promise<AlertasRespuesta> {
    const lat = parseFloat(latQ ?? '');
    const lon = parseFloat(lonQ ?? '');
    const hasPoint = Number.isFinite(lat) && Number.isFinite(lon);
    const payload = await this.feeds.getAlerts(
      hasPoint ? lat : DEFAULT_POINT.lat,
      hasPoint ? lon : DEFAULT_POINT.lon,
    );
    return {
      ...payload,
      point: {
        ...payload.point,
        defaulted: !hasPoint,
        ...(hasPoint ? {} : { label: DEFAULT_POINT.label }),
      },
      fuente: 'NWS · USGS · NASA EONET (fuentes oficiales)',
    };
  }
}
