import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { GuardianAnswer } from '@noa-guardian/contracts';
import {
  describeDockError,
  DockClientService,
} from '../../core/dock-client.service';

@Component({
  selector: 'app-citizen',
  imports: [RouterLink],
  template: `
    <section class="citizen">
      <h2>Citizen</h2>
      <p class="intro">
        Voice legal intelligence with citations to official texts and
        jurisdiction control: when the corpus does not back an answer, Citizen
        abstains.
      </p>
      <p class="hint">
        Pair your Dock in <a routerLink="/sesion">Session</a> to ask, and read
        the <a routerLink="/aviso-legal">legal notice</a> first: informational
        guidance, not legal advice.
      </p>

      <h3>Ask Citizen</h3>
      <label class="field">
        Your question
        <textarea
          class="input"
          rows="3"
          [value]="pregunta()"
          (input)="pregunta.set($any($event.target).value)"
          placeholder="e.g. Can I record this conversation in Pennsylvania?"
        ></textarea>
      </label>
      <button
        type="button"
        class="btn"
        [disabled]="enviando() || !pregunta().trim()"
        (click)="preguntar()"
      >
        Ask
      </button>
      @if (enviando()) {
        <p class="note" role="status">Sending…</p>
      }
      @if (error()) {
        <p class="alert-line" role="alert">{{ error() }}</p>
      }
      @if (respuesta(); as r) {
        <div class="answer">
          <p class="answer-text">{{ r.text }}</p>
          @if (r.jurisdiction) {
            <p class="note">Jurisdiction: {{ r.jurisdiction }}</p>
          }
          <h4>Citations</h4>
          @if (r.citations.length > 0) {
            <ul class="cites">
              @for (c of r.citations; track c) {
                <li>{{ c }}</li>
              }
            </ul>
          } @else {
            <p class="note">
              None — the Dock cited no sources for this answer.
            </p>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .citizen {
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
      .citizen h2,
      .citizen h3 {
        color: #f3f4ff;
        margin: 0;
      }
      .citizen h3 {
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
      .input {
        width: 100%;
        box-sizing: border-box;
        background: #101626;
        border: 1px solid #26314a;
        border-radius: 12px;
        color: #f3f4ff;
        font-size: 15px;
        padding: 10px 12px;
        resize: vertical;
        min-height: 76px;
        font-family: inherit;
      }
      .input::placeholder {
        color: #5a6a8a;
      }
      .input:focus {
        outline: none;
        border-color: #35d99a;
      }
      .btn {
        justify-self: start;
        border: 1px solid #35d99a;
        border-radius: 12px;
        background: #35d99a;
        color: #06281c;
        font-weight: 650;
        font-size: 14px;
        padding: 10px 18px;
        cursor: pointer;
      }
      .btn:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .btn:focus-visible {
        outline: 2px solid #f3f4ff;
        outline-offset: 2px;
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
export class Citizen {
  private readonly dock = inject(DockClientService);

  protected readonly pregunta = signal('');
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly respuesta = signal<GuardianAnswer | null>(null);

  protected async preguntar(): Promise<void> {
    const text = this.pregunta().trim();
    if (!text || this.enviando()) return;
    this.enviando.set(true);
    this.error.set('');
    try {
      this.respuesta.set(await this.dock.ask({ mode: 'citizen', text }));
    } catch (err) {
      this.respuesta.set(null);
      this.error.set(describeDockError(err));
    } finally {
      this.enviando.set(false);
    }
  }
}
