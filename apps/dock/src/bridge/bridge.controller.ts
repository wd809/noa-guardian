import { Body, Controller, Get, HttpException, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  BridgeAlertsDataPayload,
  BridgeAnswerPayload,
  BridgeEnvelope,
  BridgeErrorBody,
  HeartbeatAckPayload,
  HeartbeatPayload,
} from '@noa-guardian/contracts';
import { GuardianService } from '../guardian/guardian.service.js';
import {
  DEFAULT_POINT,
  OfficialFeedsProvider,
} from '../providers/official-feeds.provider.js';
import {
  BRIDGE_GONE_AFTER_SEC,
  BRIDGE_STALE_AFTER_SEC,
  BridgeService,
} from './bridge.service.js';
import { validateBridgeMessage } from './bridge-validation.js';

/**
 * Puente teléfono ↔ Dock (Etapa D, D5; diseño Spark 1.3, ADR-023).
 * Un solo endpoint de mensajes con el sobre v1 validado; los tipos `ask` y
 * `alerts_poll` se resuelven con el mismo cerebro que las rutas directas
 * (GuardianService y el proveedor de fuentes oficiales) — el puente es un
 * transporte, no un segundo cerebro. La ruta NO es @Public(): la protege la
 * guardia global de token, como a /ask y /alerts.
 */
@Controller('bridge')
export class BridgeController {
  constructor(
    private readonly bridge: BridgeService,
    private readonly guardian: GuardianService,
    private readonly feeds: OfficialFeedsProvider,
  ) {}

  @Post('messages')
  async messages(@Body() body: unknown): Promise<BridgeEnvelope<unknown>> {
    const issues = validateBridgeMessage(body, this.bridge.now());
    if (issues.length > 0) {
      throw new HttpException(
        {
          code: 'INVALID_MESSAGE',
          message: 'Message failed validation.',
          details: issues,
        } satisfies BridgeErrorBody,
        400,
      );
    }
    const envelope = body as BridgeEnvelope;
    if (this.bridge.isDuplicate(envelope.deviceId, envelope.msgId)) {
      throw new HttpException(
        {
          code: 'DUPLICATE_MESSAGE',
          message: 'This msgId was already processed for this device.',
          details: [{ field: 'msgId', issue: 'duplicate' }],
        } satisfies BridgeErrorBody,
        409,
      );
    }

    switch (envelope.type) {
      case 'heartbeat': {
        const view = this.bridge.recordHeartbeat(
          envelope.deviceId,
          envelope.msgId,
          envelope.payload as unknown as HeartbeatPayload,
        );
        const serverTime = new Date(this.bridge.now()).toISOString();
        return this.reply<HeartbeatAckPayload>(envelope, 'heartbeat_ack', {
          serverTime,
          sessionState: view.state,
          staleAfterSec: BRIDGE_STALE_AFTER_SEC,
          goneAfterSec: BRIDGE_GONE_AFTER_SEC,
        });
      }
      case 'ask': {
        this.bridge.recordActivity(envelope.deviceId, envelope.msgId);
        const payload = envelope.payload as {
          utterance: string;
          lat?: number;
          lon?: number;
        };
        const { body: answerBody } = await this.guardian.answer({
          text: payload.utterance,
          location:
            typeof payload.lat === 'number' && typeof payload.lon === 'number'
              ? { lat: payload.lat, lon: payload.lon }
              : null,
        });
        const answer = answerBody as {
          text?: string;
          source?: BridgeAnswerPayload['source'];
          citations?: string[];
        };
        return this.reply<BridgeAnswerPayload>(envelope, 'answer', {
          inReplyTo: envelope.msgId,
          replyText:
            typeof answer.text === 'string'
              ? answer.text
              : 'El Dock no pudo formar una respuesta para esa pregunta.',
          source: answer.source ?? 'mock',
          citations: answer.citations ?? [],
        });
      }
      case 'alerts_poll': {
        this.bridge.recordActivity(envelope.deviceId, envelope.msgId);
        const payload = envelope.payload as { lat?: number; lon?: number };
        const data = await this.feeds.getAlerts(
          typeof payload.lat === 'number' ? payload.lat : DEFAULT_POINT.lat,
          typeof payload.lon === 'number' ? payload.lon : DEFAULT_POINT.lon,
        );
        return this.reply<BridgeAlertsDataPayload>(envelope, 'alerts_data', {
          inReplyTo: envelope.msgId,
          fetchedAt: data.generatedAt,
          alerts: data.alerts,
        });
      }
      default:
        // Inalcanzable tras la validación; se deja como defensa declarada.
        throw new HttpException(
          {
            code: 'INVALID_MESSAGE',
            message: 'Message failed validation.',
            details: [{ field: 'type', issue: 'unsupported' }],
          } satisfies BridgeErrorBody,
          400,
        );
    }
  }

  @Get('devices')
  devices(): { devices: ReturnType<BridgeService['devicesView']>; generatedAt: string } {
    return {
      devices: this.bridge.devicesView(),
      generatedAt: new Date(this.bridge.now()).toISOString(),
    };
  }

  private reply<T>(
    request: BridgeEnvelope,
    type: BridgeEnvelope['type'],
    payload: T,
  ): BridgeEnvelope<T> {
    return {
      v: '1.0',
      msgId: randomUUID(),
      type,
      deviceId: request.deviceId,
      ts: new Date(this.bridge.now()).toISOString(),
      payload,
    };
  }
}
