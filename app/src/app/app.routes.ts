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
    path: 'daily-report',
    loadComponent: () => import('./pages/daily-report/daily-report.component').then(m => m.DailyReportComponent),
    canActivate: [authGuard]
  },
  {
    path: 'documentos',
    loadComponent: () => import('./pages/documentos/documentos.component').then(m => m.DocumentosComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'releases', pathMatch: 'full' },
      {
        path: 'releases',
        loadComponent: () => import('./pages/release-documents-list/release-documents-list.component').then(m => m.ReleaseDocumentsListComponent)
      },
      {
        path: 'tech',
        loadComponent: () => import('./pages/tech-documents-list/tech-documents-list.component').then(m => m.TechDocumentsListComponent)
      }
    ]
  },
  {
    path: 'documentos-release',
    loadComponent: () => import('./pages/release-documents/release-documents.component').then(m => m.ReleaseDocumentsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'documentos-release/novo',
    loadComponent: () => import('./pages/release-document-editor/release-document-editor.component').then(m => m.ReleaseDocumentEditorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'documentos-release/:id',
    loadComponent: () => import('./pages/release-document-editor/release-document-editor.component').then(m => m.ReleaseDocumentEditorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'documentos-tech/novo',
    loadComponent: () => import('./pages/tech-document-editor/tech-document-editor.component').then(m => m.TechDocumentEditorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'documentos-tech/:id',
    loadComponent: () => import('./pages/tech-document-editor/tech-document-editor.component').then(m => m.TechDocumentEditorComponent),
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
