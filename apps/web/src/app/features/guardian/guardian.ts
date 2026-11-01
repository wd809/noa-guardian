import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import type {
  AlertasRespuesta,
  FuentesSaludRespuesta,
  OfficialAlert,
} from '@noa-guardian/contracts';
import { DockClientService } from '../../core/dock-client.service';
import { computeOrbState, sourceRows } from '../../core/orb-state';
import { SourceSemaphore } from './source-semaphore';
import { StatusOrb } from './status-orb';
import { GuardianMap } from './guardian-map';

/** Punto por defecto del Dock: Reading, PA. */
const READING = { lat: 40.3356, lon: -75.9269 };
const SEVERITY_RANK: Record<string, number> = { Minor: 1, Moderate: 2, Severe: 3 };

/**
 * Vista Guardian (Etapa D, D1): la piel v4 sobre datos reales del Dock.
 * Orbe de estados + semáforo de fuentes alimentados por GET /health/sources
 * (30 s) y GET /alerts (120 s), sondeo pausado con la pestaña oculta y
 * estado gris declarado cuando el Dock no responde — jamás datos viejos
 * presentados como vivos. Diseño del orbe y del semáforo: Spark 1.3.
 */
@Component({
  selector: 'app-guardian',
  imports: [StatusOrb, SourceSemaphore, GuardianMap],
  template: `
    <section class="guardian">
      <h2>Guardian</h2>
      <p class="intro">
        Safety alerts from official sources (NWS · USGS · NASA EONET · USGS Water · AirNow ·
        PennDOT), with each source and its status always visible.
      </p>

      @if (!reachable()) {
        <p class="banner" role="alert">
          Cannot reach the Dock.
          @if (lastCheckAt()) {
            Showing the last check from {{ lastCheckAt() }}.
          }
          Retrying automatically.
        </p>
      }

      <app-guardian-map [center]="mapCenter" [alerts]="alerts()" [alertsKnown]="alertsKnown()" />

      <app-status-orb [state]="orb().state" [label]="orb().label" [severity]="topSeverity()" />

      <h3>Official sources</h3>
      <app-source-semaphore [rows]="rows()" />
      @if (generatedAt()) {
        <p class="checked">Status checked at {{ generatedAt() }} — updates itself.</p>
      }

      @if (contexto()) {
        <h3>Environmental context</h3>
        @if (contexto()?.summary) {
          <p class="context">
            {{ contexto()?.summary }}
            <span class="ctx-tag">context, not an alert</span>
          </p>
        } @else {
          <p class="note">Weather context unavailable right now.</p>
        }
      }

      <h3>Active alerts</h3>
      @if (!alertsKnown()) {
        <p class="note">
          Alerts not checked yet: pair in Session to see your area's alerts. The orb never claims
          calm without that check.
        </p>
      } @else if (alerts().length === 0) {
        <p class="note">No active official alerts in your area.</p>
      } @else {
        <ul class="alerts">
          @for (a of alerts(); track a.headline) {
            <li class="alert">
              <span class="sev" [attr.data-sev]="a.severity">{{ a.severity }}</span>
              <span class="headline">{{ a.headline }}</span>
              <span class="meta">{{ a.source }} · {{ a.area }}</span>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [
    `
      .guardian {
        display: grid;
        gap: 16px;
        /* Héroe: ocupa todo el ancho útil de la columna. */
        background: radial-gradient(ellipse at 65% 35%, #11193466, transparent 65%), #080c1c;
        color: #f3f4ff;
        padding: 28px;
        border: 1px solid #26314a;
        border-radius: 24px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      }
      @media (max-width: 600px) {
        .guardian {
          padding: 16px;
          border-radius: 19px;
        }
      }
      .guardian h2,
      .guardian h3 {
        color: #f3f4ff;
      }
      .intro {
        color: #aab9dd;
        margin: 0;
      }
      .banner {
        border: 1px solid #ffb323;
        border-radius: 14px;
        padding: 12px 16px;
        background: #ffb32314;
        color: #ffd97a;
        margin: 0;
      }
      .checked,
      .note {
        color: #aab9dd;
        font-size: 13px;
        margin: 0;
      }
      .context {
        color: #f3f4ff;
        font-size: 14px;
        margin: 0;
      }
      .ctx-tag {
        color: #5a6a8a;
        font-size: 12px;
        margin-left: 8px;
      }
      .alerts {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }
      .alert {
        display: flex;
        gap: 10px;
        align-items: baseline;
        flex-wrap: wrap;
        border: 1px solid #ba8119;
        border-radius: 14px;
        padding: 12px 16px;
        background: linear-gradient(130deg, #171d1d, #101626);
      }
      .sev {
        font-size: 12px;
        font-weight: 700;
        padding: 2px 9px;
        border-radius: 20px;
        background: #ffb323;
        color: #221a05;
      }
      .sev[data-sev='Severe'] {
        background: #ff5a5a;
        color: #fff;
      }
      .sev[data-sev='Minor'] {
        background: #3c4663;
        color: #dbe4ff;
      }
      .headline {
        font-weight: 600;
      }
      .meta {
        color: #aab9dd;
        font-size: 13px;
      }
    `,
  ],
})
export class Guardian implements OnInit, OnDestroy {
  private readonly dock = inject(DockClientService);
  protected readonly mapCenter = READING;

  protected readonly health = signal<FuentesSaludRespuesta | null>(null);
  protected readonly alertsResp = signal<AlertasRespuesta | null>(null);
  protected readonly reachable = signal(true);
  protected readonly alertsKnown = signal(false);
  protected readonly lastCheckAt = signal<string | null>(null);

  private sourcesTimer: ReturnType<typeof setInterval> | null = null;
  private alertsTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly alerts = computed<OfficialAlert[]>(() => this.alertsResp()?.alerts ?? []);

  protected readonly topSeverity = computed<string | null>(() => {
    let top: string | null = null;
    for (const a of this.alerts()) {
      if (!top || (SEVERITY_RANK[a.severity] ?? 0) > (SEVERITY_RANK[top] ?? 0)) {
        top = a.severity;
      }
    }
    return top;
  });

  protected readonly rows = computed(() => sourceRows(this.health()?.sources ?? null));

  protected readonly generatedAt = computed(() => {
    const g = this.health()?.generatedAt;
    return g ? new Date(g).toLocaleTimeString() : null;
  });

  /** Contexto ambiental (Open-Meteo): solo se muestra, jamás mueve el orbe. */
  protected readonly contexto = computed(() => this.health()?.context?.openMeteo ?? null);

  protected readonly orb = computed(() =>
    computeOrbState({
      reachable: this.reachable(),
      alertsCount: this.alerts().length,
      alertsKnown: this.alertsKnown(),
      topHeadline: this.alerts()[0]?.headline ?? null,
      sources: this.health()?.sources ?? null,
      lastCheckAt: this.lastCheckAt(),
    }),
  );

  ngOnInit(): void {
    void this.refreshSources();
    void this.refreshAlerts();
    this.sourcesTimer = setInterval(() => {
      if (!document.hidden) void this.refreshSources();
    }, 30_000);
    this.alertsTimer = setInterval(() => {
      if (!document.hidden) void this.refreshAlerts();
    }, 120_000);
  }

  ngOnDestroy(): void {
    if (this.sourcesTimer) clearInterval(this.sourcesTimer);
    if (this.alertsTimer) clearInterval(this.alertsTimer);
  }

  private async refreshSources(): Promise<void> {
    try {
      const health = await this.dock.sourcesHealth();
      this.health.set(health);
      this.reachable.set(true);
      this.lastCheckAt.set(new Date().toLocaleTimeString());
    } catch {
      this.reachable.set(false);
    }
  }

  private async refreshAlerts(): Promise<void> {
    if (!this.dock.token()) {
      this.alertsKnown.set(false);
      return;
    }
    try {
      const resp = await this.dock.alerts(READING.lat, READING.lon);
      this.alertsResp.set(resp);
      this.alertsKnown.set(true);
    } catch {
      this.alertsKnown.set(false);
    }
  }
}
