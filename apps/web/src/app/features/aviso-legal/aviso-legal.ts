import { Component } from '@angular/core';
import { LEGAL_SECTIONS, LEGAL_VERSION } from '../../core/legal-notice';

/**
 * Vista /aviso-legal: descarga de responsabilidad resumida dentro de la app.
 * La versión completa y vigente vive en docs/LEGAL-NOTICE.md del repositorio.
 */
@Component({
  selector: 'app-aviso-legal',
  template: `
    <section class="aviso">
      <h2>Legal notice</h2>
      <p class="version">Version {{ version }} · Faithful summary of docs/LEGAL-NOTICE.md</p>
      @for (s of sections; track s.title) {
        <h3>{{ s.title }}</h3>
        <p>{{ s.body }}</p>
      }
      <p class="nota">
        This notice is a team draft, pending review by an attorney before any
        commercial or institutional use.
      </p>
    </section>
  `,
  styles: [
    `
      .aviso {
        max-width: 640px;
        margin: 0 auto;
        line-height: 1.55;
        background:
          radial-gradient(ellipse at 65% 35%, #11193466, transparent 65%),
          #080c1c;
        color: #f3f4ff;
        padding: 24px;
        border: 1px solid #26314a;
        border-radius: 24px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      }
      .aviso h2 {
        margin: 0 0 4px;
        color: #f3f4ff;
      }
      .aviso h3 {
        margin: 18px 0 4px;
        font-size: 1rem;
        color: #f3f4ff;
      }
      .aviso p {
        margin: 0;
        color: #aab9dd;
      }
      .version,
      .nota {
        color: #aab9dd;
        font-size: 0.85rem;
      }
      .nota {
        margin-top: 18px;
        border-top: 1px solid #26314a;
        padding-top: 12px;
      }
    `,
  ],
})
export class AvisoLegal {
  protected readonly sections = LEGAL_SECTIONS;
  protected readonly version = LEGAL_VERSION;
}
