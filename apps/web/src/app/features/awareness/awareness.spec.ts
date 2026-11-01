import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Awareness } from './awareness';
import {
  DockClientService,
  DockError,
} from '../../core/dock-client.service';

const SCENE = {
  description: 'A street with parked cars.',
  peoplePresent: true,
  peopleCount: 2,
  hazards: ['Uneven sidewalk'],
  readableText: ['STOP'],
  confidence: 'high',
  source: 'model',
  usage: { model: 'meta-vision', inputTokens: 0, outputTokens: 0, costUsd: 0 },
};

class FakeReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;
  readAsDataURL(_file: Blob): void {
    this.result = 'data:image/jpeg;base64,/9j/fake';
    queueMicrotask(() => this.onload?.());
  }
}

function setup(see: (...args: unknown[]) => unknown) {
  vi.stubGlobal('FileReader', FakeReader);
  TestBed.configureTestingModule({
    imports: [Awareness],
    providers: [
      provideRouter([]),
      { provide: DockClientService, useValue: { see: vi.fn(see) } },
    ],
  });
  const fixture = TestBed.createComponent(Awareness);
  fixture.detectChanges();
  return fixture;
}

async function chooseFile(
  fixture: ReturnType<typeof setup>,
  file: { name: string; size: number },
) {
  const comp = fixture.componentInstance as unknown as {
    elegir(e: unknown): Promise<void>;
  };
  await comp.elegir({ target: { files: [file], value: 'photo.jpg' } });
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Awareness', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra la intro intacta y acepta imágenes sin forzar captura', () => {
    const fixture = setup(() => Promise.resolve(SCENE));
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('there is never facial recognition');
    const input = el.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute('accept')).toBe('image/*');
    expect(input.hasAttribute('capture')).toBe(false);
  });

  it('envía la foto a /see y muestra presencia tal cual, sin identidad', async () => {
    const see = vi.fn(() => Promise.resolve(SCENE));
    const el = await chooseFile(setup(see), { name: 'photo.jpg', size: 1024 });
    expect(see).toHaveBeenCalledWith({ image: 'data:image/jpeg;base64,/9j/fake' });
    expect(el.textContent).toContain('A street with parked cars.');
    expect(el.textContent).toContain('People present: yes (2)');
    expect(el.textContent).toContain('Uneven sidewalk');
    expect(el.textContent).toContain('Confidence: high');
  });

  it('imagen mayor de 5 MB: se declara sin llamar al Dock', async () => {
    const see = vi.fn(() => Promise.resolve(SCENE));
    const el = await chooseFile(setup(see), {
      name: 'big.jpg',
      size: 6 * 1024 * 1024,
    });
    expect(see).not.toHaveBeenCalled();
    expect(el.textContent).toContain('larger than 5 MB');
  });

  it('501 not_configured del Dock se muestra declarado', async () => {
    const el = await chooseFile(
      setup(() => Promise.reject(new DockError('x', 501, 'not_configured'))),
      { name: 'photo.jpg', size: 1024 },
    );
    expect(el.textContent).toContain(
      'The Dock answered 501 (not_configured).',
    );
  });
});
