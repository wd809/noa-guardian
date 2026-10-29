import { Component, input } from '@angular/core';
import type { OrbState } from '../../core/orb-state';

/**
 * El orbe de estados de la piel v4, portado a Angular (Etapa D, D1).
 * Presentacional puro: recibe el estado ya calculado por `computeOrbState`.
 * El color codifica verificación, no ambiente: verde = calma verificada,
 * ámbar = algo sin verificar, rojo = alerta oficial activa, gris = sin red.
 * La severidad no cambia el color; en rojo cambia la velocidad del pulso.
 */
@Component({
  selector: 'app-status-orb',
  template: `
    <div class="orb-wrap">
      <div
        class="orb"
        [attr.data-state]="state()"
        [attr.data-severity]="severity()"
        role="img"
        [attr.aria-label]="label()"
      ></div>
      <p class="orb-label">{{ label() }}</p>
    </div>
  `,
  styles: [
    `
      .orb-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        text-align: center;
      }
      .orb {
        --size: 110px;
        --ring: #8b85ff;
        width: var(--size);
        height: var(--size);
        border-radius: 50%;
        position: relative;
        background: radial-gradient(
          ellipse at 65% 65%,
          #101638 25%,
          #282481 58%,
          #96aaff 69%,
          #354dc6 72%,
          transparent 75%
        );
        filter: drop-shadow(0 0 12px var(--ring));
        isolation: isolate;
      }
      .orb::before,
      .orb::after {
        content: '';
        position: absolute;
        inset: 8%;
        border-radius: 40% 60% 48% 52%;
        border: 2px solid var(--ring);
        box-shadow: inset 0 0 14px #9b62ff;
        transform: rotate(-35deg);
        animation: orb-orbit 10s linear infinite;
      }
      .orb::after {
        inset: 5% 14%;
        opacity: 0.7;
        animation-direction: reverse;
        animation-duration: 13s;
      }
      .orb[data-state='green'] {
        --ring: #35d99a;
      }
      .orb[data-state='amber'] {
        --ring: #ffb323;
      }
      .orb[data-state='red'] {
        --ring: #ff5a5a;
        animation: orb-pulse 2.4s ease-in-out infinite;
      }
      .orb[data-state='red'][data-severity='Severe'] {
        animation-duration: 1.2s;
      }
      .orb[data-state='gray'] {
        --ring: #5a6a8a;
        filter: grayscale(0.6) drop-shadow(0 0 6px var(--ring));
      }
      .orb-label {
        margin: 0;
        font-size: 17px;
        font-weight: 550;
        color: #f3f4ff;
        max-width: 34ch;
      }
      @keyframes orb-orbit {
        to {
          transform: rotate(325deg);
        }
      }
      @keyframes orb-pulse {
        50% {
          filter: drop-shadow(0 0 26px var(--ring));
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .orb,
        .orb::before,
        .orb::after {
          animation: none !important;
        }
      }
    `,
  ],
})
export class StatusOrb {
  readonly state = input.required<OrbState>();
  readonly label = input.required<string>();
  /** Severidad máxima activa (solo modula el pulso en rojo). */
  readonly severity = input<string | null>(null);
}
