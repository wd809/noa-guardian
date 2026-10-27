import { Routes } from '@angular/router';

// Rutas diferidas (Etapa A): cada modo carga su feature solo cuando se visita.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sesion' },
  {
    path: 'sesion',
    loadComponent: () => import('./features/sesion/sesion').then((m) => m.Sesion),
  },
  {
    path: 'guardian',
    loadComponent: () => import('./features/guardian/guardian').then((m) => m.Guardian),
  },
  {
    path: 'citizen',
    loadComponent: () => import('./features/citizen/citizen').then((m) => m.Citizen),
  },
  {
    path: 'awareness',
    loadComponent: () =>
      import('./features/awareness/awareness').then((m) => m.Awareness),
  },
  { path: '**', redirectTo: 'sesion' },
];
