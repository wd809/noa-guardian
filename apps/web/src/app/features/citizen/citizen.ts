import { Component } from '@angular/core';

@Component({
  selector: 'app-citizen',
  template: `
    <section>
      <h2>Citizen</h2>
      <p>
        Inteligencia legal por voz con citas a textos oficiales y control de
        jurisdicción: si el corpus no respalda la respuesta, Citizen se abstiene.
      </p>
      <p><strong>Estado: sin conexión.</strong></p>
      <p><em>Placeholder de la Etapa A — el corpus y la recuperación llegan en la Etapa C.</em></p>
    </section>
  `,
})
export class Citizen {}
