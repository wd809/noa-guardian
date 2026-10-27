import { Component } from '@angular/core';

@Component({
  selector: 'app-awareness',
  template: `
    <section>
      <h2>Awareness</h2>
      <p>
        Descripción del entorno en manos libres. Las personas se detectan solo
        para difuminarlas: nunca hay reconocimiento facial.
      </p>
      <p><strong>Estado: sin conexión.</strong></p>
      <p><em>Placeholder de la Etapa A — la visión y la voz llegan en la Etapa D.</em></p>
    </section>
  `,
})
export class Awareness {}
