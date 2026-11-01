import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SeeRespuesta } from '@noa-guardian/contracts';
import {
  describeDockError,
  DockClientService,
} from '../../core/dock-client.service';

/** Tope del Dock (POST /see rechaza imágenes mayores de 5 MB). */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read the image file.'));
    };
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.readAsDataURL(file);
  });
}

@Component({
  selector: 'app-awareness',
  imports: [RouterLink],
  template: `
    <section class="awareness">
      <h2>Awareness</h2>
      <p class="intro">
        Hands-free understanding of your surroundings. People are detected only
        to be blurred: there is never facial recognition.
      </p>
      <p class="hint">
        Pair your Dock in <a routerLink="/sesion">Session</a> to analyze a
        photo. Images are never stored: they live only in the request.
      </p>

      <h3>Analyze a photo</h3>
      <label class="field">
        Photo from camera or gallery
        <input
          type="file"
          class="file"
          accept="image/*"
          [disabled]="enviando()"
          (change)="elegir($event)"
        />
      </label>
      @if (enviando()) {
        <p class="note" role="status">
          Analyzing{{ fileName() ? ' ' + fileName() : '' }}… this can take up
          to a minute.
        </p>
      }
      @if (error()) {
        <p class="alert-line" role="alert">{{ error() }}</p>
      }
      @if (resultado(); as r) {
        <div class="answer">
          <p class="answer-text">{{ r.description }}</p>
          <p class="note">
            People present: {{ r.peoplePresent ? 'yes' : 'no' }}@if (
              r.peopleCount !== null
            ) {
              ({{ r.peopleCount }})
            }
          </p>
          @if (r.hazards.length > 0) {
            <h4>Hazards</h4>
            <ul class="cites">
              @for (h of r.hazards; track h) {
                <li>{{ h }}</li>
              }
            </ul>
          }
          @if (r.readableText.length > 0) {
            <h4>Readable text</h4>
            <ul class="cites">
              @for (t of r.readableText; track t) {
                <li>{{ t }}</li>
              }
            </ul>
          }
          <p class="note">Confidence: {{ r.confidence }}</p>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .awareness {
        display: grid;
        gap: 14px;
        max-width: 720px;
        margin: 0 auto;
        background:
          radial-gradient(ellipse at 65% 35%, #11193466, transparent 65%),
          #080c1c;
        color: #f3f4ff;
        padding: 24px;
        border: 1px solid #26314a;
        border-radius: 24px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      }
      .awareness h2,
      .awareness h3 {
        color: #f3f4ff;
        margin: 0;
      }
      .awareness h3 {
        margin-top: 8px;
      }
      .intro,
      .hint,
      .note {
        margin: 0;
        color: #aab9dd;
        font-size: 14px;
        line-height: 1.55;
      }
      .hint a {
        color: #35d99a;
      }
      .field {
        display: grid;
        gap: 6px;
        color: #aab9dd;
        font-size: 13px;
      }
      .file {
        color: #aab9dd;
        font-size: 14px;
      }
      .file::file-selector-button {
        border: 1px solid #35d99a;
        border-radius: 12px;
        background: #35d99a;
        color: #06281c;
        font-weight: 650;
        font-size: 14px;
        padding: 10px 18px;
        margin-right: 12px;
        cursor: pointer;
        font-family: inherit;
      }
      .file:disabled::file-selector-button {
        opacity: 0.45;
        cursor: default;
      }
      .alert-line {
        border: 1px solid #ffb323;
        border-radius: 14px;
        padding: 12px 16px;
        background: #ffb32314;
        color: #ffd97a;
        margin: 0;
        font-size: 14px;
      }
      .answer {
        display: grid;
        gap: 10px;
        border-top: 1px solid #26314a;
        padding-top: 14px;
      }
      .answer-text {
        margin: 0;
        color: #f3f4ff;
        font-size: 15px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      .answer h4 {
        margin: 4px 0 0;
        color: #f3f4ff;
        font-size: 14px;
      }
      .cites {
        margin: 0;
        padding-left: 20px;
        display: grid;
        gap: 6px;
        color: #aab9dd;
        font-size: 13px;
        line-height: 1.5;
      }
    `,
  ],
})
export class Awareness {
  private readonly dock = inject(DockClientService);

  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly fileName = signal('');
  protected readonly resultado = signal<SeeRespuesta | null>(null);

  protected async elegir(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (input) input.value = '';
    if (!file || this.enviando()) return;
    this.error.set('');
    this.resultado.set(null);
    if (file.size > MAX_IMAGE_BYTES) {
      this.error.set('The image is larger than 5 MB; choose a smaller one.');
      return;
    }
    this.enviando.set(true);
    this.fileName.set(file.name);
    try {
      const image = await readAsDataURL(file);
      this.resultado.set(await this.dock.see({ image }));
    } catch (err) {
      this.resultado.set(null);
      this.error.set(describeDockError(err));
    } finally {
      this.enviando.set(false);
    }
  }
}
