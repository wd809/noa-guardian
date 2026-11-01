import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { OfficialAlert, Ubicacion } from '@noa-guardian/contracts';
import type * as Leaflet from 'leaflet';

/** Presentation only. Never geocode area/headline or substitute the query point for an alert. */
export function alertPoint(alert: OfficialAlert): Ubicacion | null {
  // The current Dock contract has no alert coordinates. Accept an additive point
  // only when the response actually supplies finite coordinates; never infer one.
  const point = (alert as OfficialAlert & { point?: Ubicacion }).point;
  return point &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lon) <= 180
    ? point
    : null;
}

@Component({
  selector: 'app-guardian-map',
  template: `
    <section class="map-card" aria-label="Official alerts map">
      <div class="map-heading">
        <div>
          <strong>Your area</strong
          ><span>Official sources · {{ center().lat }}, {{ center().lon }}</span>
        </div>
        <button type="button" (click)="recenter()" aria-label="Recenter map on your query position">
          Recenter
        </button>
      </div>
      <div class="map-frame">
        <div
          #surface
          class="map-surface"
          aria-label="Interactive map of the Guardian query area"
        ></div>
        @if (unavailable()) {
          <p class="map-notice" role="status">Map unavailable offline</p>
        } @else if (!loaded()) {
          <p class="map-notice" role="status">Loading map…</p>
        }
      </div>
      <div class="map-caption" aria-live="polite">
        <span class="position-key">Your position · Guardian query point (not GPS)</span>
        @if (!alertsKnown()) {
          <span>Active alerts not verified. Check Session pairing.</span>
        } @else if (alerts().length === 0) {
          <span>No active official alerts in your area</span>
        } @else {
          <span
            >{{ alerts().length }} active official alert(s). {{ unlocatedCount() }} without
            coordinates; see list below.</span
          >
        }
      </div>
      <div class="map-credit">
        <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>
        ·
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer"
          >© OpenStreetMap contributors</a
        >
      </div>
    </section>
  `,
  styleUrl: './guardian-map.css',
})
export class GuardianMap implements AfterViewInit, OnDestroy {
  readonly center = input.required<Ubicacion>();
  readonly alerts = input<OfficialAlert[]>([]);
  readonly alertsKnown = input(false);
  protected readonly unavailable = signal(false);
  protected readonly loaded = signal(false);
  protected unlocatedCount(): number {
    return this.alerts().filter((a) => !alertPoint(a)).length;
  }
  private readonly surface = viewChild.required<ElementRef<HTMLDivElement>>('surface');
  private leaflet?: typeof Leaflet;
  private map?: Leaflet.Map;
  private position?: Leaflet.CircleMarker;
  private alertLayer?: Leaflet.LayerGroup;
  private resize?: ResizeObserver;
  private timeout?: ReturnType<typeof setTimeout>;
  private destroyed = false;

  constructor() {
    effect(() => {
      const center = this.center();
      const alerts = this.alerts();
      const known = this.alertsKnown();
      if (this.map && this.leaflet) {
        this.position?.setLatLng([center.lat, center.lon]);
        this.renderAlerts(known ? alerts : []);
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      // npm bundle, no remotely loaded scripts. Failures remain inside this component.
      const L = await import('leaflet');
      if (this.destroyed) return;
      this.leaflet = L;
      const { lat, lon } = this.center();
      this.map = L.map(this.surface().nativeElement, { scrollWheelZoom: false }).setView(
        [lat, lon],
        13,
      );
      this.map.attributionControl.setPrefix(false);
      const tiles = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 20, attribution: 'Esri · © OpenStreetMap contributors' },
      );
      const reference = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 20, zIndex: 2 },
      );
      tiles.on('tileload', () => {
        this.loaded.set(true);
        if (this.timeout) clearTimeout(this.timeout);
      });
      // Neither layer may hide a failure in the other layer.
      const failedLayers = new Set<Leaflet.TileLayer>();
      for (const layer of [tiles, reference]) {
        let batchFailed = false;
        layer.on('loading', () => {
          batchFailed = false;
        });
        layer.on('tileerror', () => {
          batchFailed = true;
          failedLayers.add(layer);
          this.unavailable.set(true);
        });
        layer.on('load', () => {
          if (!batchFailed) failedLayers.delete(layer);
          if (failedLayers.size === 0 && this.loaded()) this.unavailable.set(false);
        });
      }
      this.timeout = setTimeout(() => {
        if (!this.loaded()) this.unavailable.set(true);
      }, 12_000);
      tiles.addTo(this.map);
      reference.addTo(this.map);
      this.position = L.circleMarker([lat, lon], {
        radius: 7,
        color: '#e5f5fb',
        weight: 2,
        fillColor: '#30e0eb',
        fillOpacity: 1,
      })
        .bindTooltip('Your position · Guardian query point (not GPS)')
        .addTo(this.map);
      this.alertLayer = L.layerGroup().addTo(this.map);
      this.renderAlerts(this.alertsKnown() ? this.alerts() : []);
      if (typeof ResizeObserver !== 'undefined') {
        this.resize = new ResizeObserver(() => this.map?.invalidateSize({ pan: false }));
        this.resize.observe(this.surface().nativeElement);
      }
    } catch {
      this.unavailable.set(true);
    }
  }

  protected recenter(): void {
    const { lat, lon } = this.center();
    this.map?.setView([lat, lon], 13);
  }

  private renderAlerts(alerts: OfficialAlert[]): void {
    this.alertLayer?.clearLayers();
    if (!this.leaflet || !this.alertLayer) return;
    for (const alert of alerts) {
      const point = alertPoint(alert);
      if (!point) continue;
      const label = document.createElement('span');
      label.textContent = `${alert.source} · ${alert.severity} · ${alert.headline}`;
      this.leaflet
        .circleMarker([point.lat, point.lon], {
          radius: 9,
          color: '#ffdd83',
          fillColor: '#ffb323',
          fillOpacity: 0.9,
          weight: 2,
        })
        .bindTooltip(label)
        .addTo(this.alertLayer);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.timeout) clearTimeout(this.timeout);
    this.resize?.disconnect();
    this.map?.remove();
  }
}
