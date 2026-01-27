import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'demandas',
    loadComponent: () => import('./pages/demands/demands.component').then(m => m.DemandsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [publicGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
