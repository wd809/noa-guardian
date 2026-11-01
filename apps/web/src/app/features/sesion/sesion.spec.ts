import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BudgetStateService } from '../../core/budget-state.service';
import {
  DockClientService,
  tokenFingerprint,
} from '../../core/dock-client.service';
import { DockConnectionService } from '../../core/dock-connection.service';
import { Sesion } from './sesion';

const HEALTH = {
  project: 'noa-guardian-dock',
  version: '1.0.0',
  time: '2026-11-01T00:00:00.000Z',
};

function setup(opts: {
  health?: typeof HEALTH | null;
  auth?: boolean;
  savedToken?: string | null;
}) {
  const dock = {
    baseUrl: signal('http://localhost:3000'),
    token: signal(opts.savedToken ?? null),
    setBaseUrl: vi.fn(),
    setToken: vi.fn((t: string | null) => dock.token.set(t)),
    checkAuth: vi.fn(async () => opts.auth ?? false),
  };
  const connection = {
    estado: signal('connected'),
    refresh: vi.fn(async () => ('health' in opts ? opts.health : HEALTH)),
  };
  const budget = {
    estado: signal({
      limiteUsd: 179.99,
      consumidoUsd: 0,
      restanteUsd: 179.99,
      actualizadoEn: null,
    }),
    actualizar: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [Sesion],
    providers: [
      { provide: DockClientService, useValue: dock },
      { provide: DockConnectionService, useValue: connection },
      { provide: BudgetStateService, useValue: budget },
    ],
  });
  const fixture = TestBed.createComponent(Sesion);
  fixture.detectChanges();
  return { fixture, dock, connection };
}

async function clickButton(
  fixture: ReturnType<typeof setup>['fixture'],
  label: string,
) {
  const el = fixture.nativeElement as HTMLElement;
  const btn = [...el.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(label),
  ) as HTMLButtonElement;
  btn.click();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Sesion', () => {
  it('muestra la huella del token guardado', () => {
    const { fixture } = setup({ savedToken: 't-secreto' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      tokenFingerprint('t-secreto'),
    );
  });

  it('sin token muestra none', () => {
    const { fixture } = setup({ savedToken: null });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This device token:');
    expect(text).toContain('none');
  });

  it('Save and test aceptado: guarda y declara token aceptado', async () => {
    const { fixture, dock } = setup({ auth: true, savedToken: null });
    const el = fixture.nativeElement as HTMLElement;
    const inputs = el.querySelectorAll('input');
    const tokenInput = inputs[1] as HTMLInputElement;
    tokenInput.value = 'nuevo-token';
    tokenInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const after = await clickButton(fixture, 'Save and test');
    expect(dock.setToken).toHaveBeenCalledWith('nuevo-token');
    expect(after.textContent).toContain('Token accepted by the Dock.');
  });

  it('token rechazado (401): lo declara sin maquillar', async () => {
    const { fixture } = setup({ auth: false, savedToken: 'mal-token' });
    const after = await clickButton(fixture, 'Test Dock connection');
    expect(after.textContent).toContain('Token rejected');
  });

  it('sin Dock no hay veredicto de token', async () => {
    const { fixture, dock } = setup({ health: null, savedToken: 't' });
    const after = await clickButton(fixture, 'Test Dock connection');
    expect(after.textContent).toContain('The Dock did not answer.');
    expect(dock.checkAuth).not.toHaveBeenCalled();
    expect(after.textContent).not.toContain('Token accepted');
    expect(after.textContent).not.toContain('Token rejected');
  });
});
