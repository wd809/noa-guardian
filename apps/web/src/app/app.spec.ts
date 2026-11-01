import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the NOA Guardian header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header')?.textContent).toContain('NOA Guardian');
  });

  it('should render the five tabs with their labels and routes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const links = [
      ...fixture.nativeElement.querySelectorAll('nav.tabs a'),
    ] as HTMLAnchorElement[];
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Session',
      'Guardian',
      'Citizen',
      'Awareness',
      'Legal notice',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/sesion',
      '/guardian',
      '/citizen',
      '/awareness',
      '/aviso-legal',
    ]);
  });
});
