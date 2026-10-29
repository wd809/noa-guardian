import type { BridgeEnvelope } from '@noa-guardian/contracts';

/**
 * Validación del sobre del puente teléfono ↔ Dock (Etapa D, D5).
 * Diseño: Muse Spark 1.3 (2026-10-29); implementación: Noa.
 * Función pura: devuelve la lista de problemas por campo — vacía = válido.
 * El Dock rechaza con 400 y error declarado, jamás con una pila.
 */

export interface BridgeFieldIssue {
  field: string;
  issue: string;
}

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEVICE_ID = /^[a-z0-9-]{4,64}$/;
const INBOUND_TYPES = ['heartbeat', 'ask', 'alerts_poll'] as const;
const MAX_PAYLOAD_BYTES = 64 * 1024;
export const MAX_TS_SKEW_MS = 300_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkLatLon(
  payload: Record<string, unknown>,
  issues: BridgeFieldIssue[],
  prefix = 'payload',
): void {
  const { lat, lon } = payload;
  if (lat !== undefined && (typeof lat !== 'number' || lat < -90 || lat > 90)) {
    issues.push({ field: `${prefix}.lat`, issue: 'must be a number in [-90, 90]' });
  }
  if (
    lon !== undefined &&
    (typeof lon !== 'number' || lon < -180 || lon > 180)
  ) {
    issues.push({
      field: `${prefix}.lon`,
      issue: 'must be a number in [-180, 180]',
    });
  }
}

export function validateBridgeMessage(
  body: unknown,
  nowMs: number,
): BridgeFieldIssue[] {
  const issues: BridgeFieldIssue[] = [];
  if (!isRecord(body)) {
    return [{ field: 'body', issue: 'must be a JSON object' }];
  }

  if (JSON.stringify(body).length > MAX_PAYLOAD_BYTES) {
    issues.push({ field: 'payload', issue: 'message exceeds 64KB' });
  }

  const { v, msgId, type, deviceId, ts, payload } = body as Partial<
    Record<keyof BridgeEnvelope, unknown>
  >;

  if (typeof v !== 'string' || !/^1(\.\d+)?$/.test(v)) {
    issues.push({ field: 'v', issue: 'must be a supported v1 version string' });
  }
  if (typeof msgId !== 'string' || !UUID_V4.test(msgId)) {
    issues.push({ field: 'msgId', issue: 'must be a UUID v4' });
  }
  if (
    typeof type !== 'string' ||
    !(INBOUND_TYPES as readonly string[]).includes(type)
  ) {
    issues.push({
      field: 'type',
      issue: `must be one of: ${INBOUND_TYPES.join(', ')}`,
    });
  }
  if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) {
    issues.push({ field: 'deviceId', issue: 'must match [a-z0-9-]{4,64}' });
  }
  const tsMs = typeof ts === 'string' ? Date.parse(ts) : NaN;
  if (Number.isNaN(tsMs)) {
    issues.push({ field: 'ts', issue: 'must be an RFC 3339 timestamp' });
  } else if (Math.abs(nowMs - tsMs) > MAX_TS_SKEW_MS) {
    issues.push({ field: 'ts', issue: 'skew >300s' });
  }
  if (!isRecord(payload)) {
    issues.push({ field: 'payload', issue: 'must be an object, never null' });
    return issues;
  }

  if (type === 'heartbeat') {
    const { batteryPct, net, glassesConnected, loc } = payload;
    if (
      typeof batteryPct !== 'number' ||
      !Number.isInteger(batteryPct) ||
      batteryPct < 0 ||
      batteryPct > 100
    ) {
      issues.push({
        field: 'payload.batteryPct',
        issue: 'must be an integer 0-100',
      });
    }
    if (net !== 'wifi' && net !== 'cellular' && net !== 'offline') {
      issues.push({
        field: 'payload.net',
        issue: 'must be wifi | cellular | offline',
      });
    }
    if (typeof glassesConnected !== 'boolean') {
      issues.push({
        field: 'payload.glassesConnected',
        issue: 'must be a boolean',
      });
    }
    if (loc !== undefined) {
      if (!isRecord(loc)) {
        issues.push({ field: 'payload.loc', issue: 'must be an object' });
      } else {
        checkLatLon(loc, issues, 'payload.loc');
        if (
          loc['accM'] !== undefined &&
          (typeof loc['accM'] !== 'number' || loc['accM'] < 0)
        ) {
          issues.push({
            field: 'payload.loc.accM',
            issue: 'must be a number >= 0',
          });
        }
      }
    }
  }

  if (type === 'ask') {
    const { utterance, dialogId } = payload;
    if (
      typeof utterance !== 'string' ||
      utterance.trim().length === 0 ||
      utterance.trim().length > 500
    ) {
      issues.push({
        field: 'payload.utterance',
        issue: 'must be a string of 1-500 non-blank characters',
      });
    }
    if (
      dialogId !== undefined &&
      (typeof dialogId !== 'string' || !UUID_V4.test(dialogId))
    ) {
      issues.push({ field: 'payload.dialogId', issue: 'must be a UUID v4' });
    }
    checkLatLon(payload, issues);
  }

  if (type === 'alerts_poll') {
    checkLatLon(payload, issues);
  }

  return issues;
}
