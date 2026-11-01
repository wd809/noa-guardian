import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Citizen } from './citizen';
import {
  DockClientService,
  DockError,
} from '../../core/dock-client.service';

const ANSWER = {
  text: 'In Pennsylvania you may record with consent. This is not legal advice.',
  citations: ['18 Pa.C.S. § 5703 — Wiretapping · fuente oficial'],
  jurisdiction: 'Pensilvania, EE. UU.',
  source: 'corpus',
  usage: { model: 'dock-citizen-extractivo-v1', inputTokens: 0, outputTokens: 0, costUsd: 0 },
};

function setup(ask: (...args: unknown[]) => unknown) {
  TestBed.configureTestingModule({
    imports: [Citizen],
    providers: [
      provideRouter([]),
      { provide: DockClientService, useValue: { ask: vi.fn(ask) } },
    ],
  });
  const fixture = TestBed.createComponent(Citizen);
  fixture.detectChanges();
  return fixture;
}

async function askQuestion(fixture: ReturnType<typeof setup>, text: string) {
  const el = fixture.nativeElement as HTMLElement;
  const area = el.querySelector('textarea') as HTMLTextAreaElement;
  area.value = text;
  area.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  (el.querySelector('button') as HTMLButtonElement).click();
  await fixture.whenStable();
  fixture.detectChanges();
  return el;
}

describe('Citizen', () => {
  it('muestra la intro intacta y Ask deshabilitado sin pregunta', () => {
    const fixture = setup(() => Promise.resolve(ANSWER));
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('when the corpus does not back an answer');
    expect(el.querySelector('button')?.textContent?.trim()).toBe('Ask');
    expect(
      (el.querySelector('button') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('pregunta al Dock y muestra texto, jurisdicción y citas tal cual', async () => {
    const ask = vi.fn(() => Promise.resolve(ANSWER));
    const el = await askQuestion(setup(ask), 'Can I record this call?');
    expect(ask).toHaveBeenCalledWith({
      mode: 'citizen',
      text: 'Can I record this call?',
    });
    expect(el.textContent).toContain(ANSWER.text);
    expect(el.textContent).toContain('Pensilvania, EE. UU.');
    expect(el.textContent).toContain('18 Pa.C.S. § 5703');
  });

  it('abstención: muestra el texto del Dock y declara que no hay citas', async () => {
    const abstention = { ...ANSWER, citations: [] as string[] };
    const el = await askQuestion(
      setup(() => Promise.resolve(abstention)),
      'Divorce law?',
    );
    expect(el.textContent).toContain(ANSWER.text);
    expect(el.textContent).toContain(
      'None — the Dock cited no sources for this answer.',
    );
  });

  it('si el Dock no responde, mensaje claro como Session', async () => {
    const el = await askQuestion(
      setup(() => Promise.reject(new DockError('x', null, null))),
      'Hello?',
    );
    expect(el.textContent).toContain('The Dock did not answer.');
    expect(el.textContent).not.toContain(ANSWER.text);
  });
});
