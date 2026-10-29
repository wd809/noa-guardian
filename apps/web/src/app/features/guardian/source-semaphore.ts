import { Component, input } from '@angular/core';
import type { SourceRow } from '../../core/orb-state';

/**
 * Semáforo de fuentes oficiales (Etapa D, D1; diseño Spark 1.3).
 * Una fila por fuente: punto de color + nombre + etiqueta + edad del dato.
 * Nunca solo color: la etiqueta textual siempre acompaña (accesibilidad).
 * El error crudo de la fuente no se muestra: solo el estado declarado.
 */
@Component({
  selector: 'app-source-semaphore',
  template: `
    <ul class="semaphore" aria-label="Estado de las fuentes oficiales">
      @for (row of rows(); track row.name) {
        <li class="row">
          <span class="dot" [attr.data-color]="row.color" aria-hidden="true"></span>
          <span class="name">{{ row.name }}</span>
          <span class="label" [attr.data-color]="row.color">{{ row.label }}</span>
          <span class="detail">{{ row.detail }}</span>
        </li>
      } @empty {
        <li class="row empty">Consultando las fuentes…</li>
      }
    </ul>
  `,
  styles: [
    `
      .semaphore {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 8px;
      }
      .row {
        display: flex;
        align-items: baseline;
        gap: 10px;
        padding: 10px 14px;
        border: 1px solid #26314a;
        border-radius: 14px;
        background: linear-gradient(120deg, #141c30, #101626);
        flex-wrap: wrap;
      }
      .dot {
        width: 11px;
        height: 11px;
        border-radius: 50%;
        align-self: center;
        flex-shrink: 0;
        background: #5a6a8a;
      }
      .dot[data-color='green'] {
        background: #35d99a;
      }
      .dot[data-color='amber'] {
        background: #ffb323;
      }
      .dot[data-color='red'] {
        background: #ff5a5a;
      }
      .name {
        font-weight: 650;
        color: #f3f4ff;
        min-width: 74px;
      }
      .label {
        font-weight: 600;
        font-size: 13px;
      }
      .label[data-color='green'] {
        color: #35d99a;
      }
      .label[data-color='amber'] {
        color: #ffb323;
      }
      .label[data-color='red'] {
        color: #ff5a5a;
      }
      .label[data-color='gray'] {
        color: #aab9dd;
      }
      .detail {
        color: #aab9dd;
        font-size: 13px;
      }
      .empty {
        color: #aab9dd;
      }
    `,
  ],
})
export class SourceSemaphore {
  readonly rows = input.required<SourceRow[]>();
}
