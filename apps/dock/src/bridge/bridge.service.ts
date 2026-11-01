import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
  BridgeDeviceView,
  BridgeSessionState,
  HeartbeatPayload,
} from '@noa-guardian/contracts';

/**
 * Registro de dispositivos del puente (Etapa D, D5).
 * Latido cada 30 s: `stale` tras 3 latidos perdidos (90 s) y `gone` tras
 * 10 (300 s), según el diseño de Spark 1.3. Estado en memoria: el Dock es
 * de un solo hogar y el registro se reconstruye con los latidos.
 * Adaptación documentada en ADR-023: no hay registro previo de dispositivos
 * — el token de emparejamiento del Dock es la puerta; un deviceId con la
 * forma válida queda registrado en su primer latido.
 */
export const BRIDGE_STALE_AFTER_SEC = 90;
export const BRIDGE_GONE_AFTER_SEC = 300;
const SEEN_MSG_IDS_CAP = 500;

interface DeviceRecord {
  deviceId: string;
  lastSeenMs: number;
  lastNet: string | null;
  batteryPct: number | null;
  seenMsgIds: string[];
}

@Injectable()
export class BridgeService {
  private readonly devices = new Map<string, DeviceRecord>();
  private readonly nowFn: () => number;

  constructor(
    @Optional() @Inject('BRIDGE_NOW_FN') nowFn?: () => number,
  ) {
    this.nowFn = nowFn ?? (() => Date.now());
  }

  now(): number {
    return this.nowFn();
  }

  stateFor(lastSeenMs: number, atMs: number = this.nowFn()): BridgeSessionState {
    const silentSec = (atMs - lastSeenMs) / 1000;
    if (silentSec >= BRIDGE_GONE_AFTER_SEC) return 'gone';
    if (silentSec >= BRIDGE_STALE_AFTER_SEC) return 'stale';
    return 'active';
  }

  /** true si el msgId ya se vio en este dispositivo (idempotencia v1). */
  isDuplicate(deviceId: string, msgId: string): boolean {
    return this.devices.get(deviceId)?.seenMsgIds.includes(msgId) ?? false;
  }

  /** Registra un latido: crea o refresca el dispositivo y memoriza el msgId. */
  recordHeartbeat(
    deviceId: string,
    msgId: string,
    payload: HeartbeatPayload,
  ): BridgeDeviceView {
    const record = this.touch(deviceId, msgId);
    record.lastNet = payload.net;
    record.batteryPct = payload.batteryPct;
    return this.view(record);
  }

  /** Todo mensaje válido (ask, alerts_poll) también cuenta como presencia. */
  recordActivity(deviceId: string, msgId: string): void {
    this.touch(deviceId, msgId);
  }

  devicesView(): BridgeDeviceView[] {
    return [...this.devices.values()].map((r) => this.view(r));
  }

  private touch(deviceId: string, msgId: string): DeviceRecord {
    let record = this.devices.get(deviceId);
    if (!record) {
      record = {
        deviceId,
        lastSeenMs: this.nowFn(),
        lastNet: null,
        batteryPct: null,
        seenMsgIds: [],
      };
      this.devices.set(deviceId, record);
    }
    record.lastSeenMs = this.nowFn();
    record.seenMsgIds.push(msgId);
    if (record.seenMsgIds.length > SEEN_MSG_IDS_CAP) {
      record.seenMsgIds.splice(
        0,
        record.seenMsgIds.length - SEEN_MSG_IDS_CAP,
      );
    }
    return record;
  }

  private view(record: DeviceRecord): BridgeDeviceView {
    return {
      deviceId: record.deviceId,
      lastSeenAt: new Date(record.lastSeenMs).toISOString(),
      state: this.stateFor(record.lastSeenMs),
      lastNet: record.lastNet,
      batteryPct: record.batteryPct,
    };
  }
}
