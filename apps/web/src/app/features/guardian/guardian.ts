import { Component } from '@angular/core';

@Component({
  selector: 'app-guardian',
  template: `
    <section>
      <h2>Guardian</h2>
      <p>
        Alertas de seguridad de fuentes oficiales (NWS · USGS · NASA EONET),
        con la fuente y su estado siempre visibles.
      </p>
      <p><strong>Estado: sin conexión.</strong></p>
      <p><em>Placeholder de la Etapa A — la integración con el Dock llega en la Etapa B.</em></p>
    </section>
  `,
})
export class Guardian {}
