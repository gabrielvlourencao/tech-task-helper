import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DemandService, ReleaseDocumentService } from '../../core';
import type { ReleaseDocument } from '../../core/models/release-document.model';

@Component({
  selector: 'app-release-documents-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="content-header">
      <div class="header-left">
        <h2>Documentos de Deploy / Release</h2>
        <span class="doc-count">{{ filteredDocs().length }} documento(s)</span>
      </div>
      <div class="header-right">
        <a [routerLink]="['/documentos-release/novo']" class="btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Novo documento
        </a>
      </div>
    </div>

    <div class="filters-section">
      <div class="filter-group">
        <label for="filter-demand">Demanda</label>
        <select id="filter-demand" [ngModel]="filterDemandId()" (ngModelChange)="filterDemandId.set($event)">
          <option value="">Todas</option>
          @for (d of demands(); track d.id) {
            <option [value]="d.id">{{ d.code }} – {{ d.title }}</option>
          }
        </select>
      </div>
      <div class="filter-group">
        <label for="filter-status">Status da release</label>
        <select id="filter-status" [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)">
          <option value="">Todos</option>
          <option value="rascunho">Em andamento</option>
          <option value="finalizado">Finalizado</option>
        </select>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-state">
        <div class="spinner-lg"></div>
        <p>Carregando documentos...</p>
      </div>
    } @else if (filteredDocs().length === 0) {
      <div class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </div>
        <h3>Nenhum documento de release</h3>
        <p>Crie um documento de deploy vinculado a uma demanda para gerar o PDF para go-live.</p>
        <a [routerLink]="['/documentos-release/novo']" class="btn-primary">Criar primeiro documento</a>
      </div>
    } @else {
      <div class="docs-list">
        @for (doc of filteredDocs(); track doc.id) {
          <div class="doc-card" [class.finalizado]="doc.status === 'finalizado'">
            <div class="doc-card-header">
              <span class="demand-badge">{{ getDemandCode(doc.demandId) }}</span>
              <span class="status-badge" [class.finalizado]="doc.status === 'finalizado'">
                {{ doc.status === 'finalizado' ? 'Finalizado' : 'Em andamento' }}
              </span>
            </div>
            <div class="doc-card-body">
              <p class="doc-title">{{ getDemandTitle(doc.demandId) }}</p>
              @if (doc.dev || doc.lt) {
                <p class="doc-meta">DEV: {{ doc.dev || '–' }} · LT: {{ doc.lt || '–' }}</p>
              }
              <p class="doc-updated">Atualizado em {{ formatDate(doc.updatedAt) }}</p>
            </div>
            <div class="doc-card-actions">
              <a [routerLink]="['/documentos-release', doc.id]" [queryParams]="{ view: '1' }" class="btn-action btn-view" title="Visualizar (somente leitura)">Visualizar</a>
              <a [routerLink]="['/documentos-release', doc.id]" [queryParams]="{ print: '1' }" target="_blank" rel="noopener" class="btn-action btn-export-pdf" title="Exportar PDF">Exportar PDF</a>
              <a [routerLink]="['/documentos-release', doc.id]" class="btn-action btn-edit" title="Editar">Editar</a>
              @if (doc.status === 'rascunho') {
                <button type="button" class="btn-action btn-finalize" (click)="finalize(doc)" title="Finalizar release">
                  Finalizar
                </button>
              } @else {
                <button type="button" class="btn-action btn-unfinalize" (click)="unFinalize(doc)" title="Reabrir como em andamento">
                  Reabrir
                </button>
              }
              <button type="button" class="btn-action btn-delete" (click)="confirmDelete(doc)" title="Excluir">
                Excluir
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .header-left { display: flex; align-items: center; gap: 1rem; }
    .header-left h2 { font-size: 1.5rem; font-weight: 600; color: #1f2937; margin: 0; }
    .doc-count { background: #e5e7eb; color: #6b7280; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem; font-weight: 500; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #667eea; color: white; border-radius: 8px; font-weight: 500; text-decoration: none; transition: all 0.2s; }
    .btn-primary:hover { background: #5a67d8; }
    .filters-section { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .filter-group { display: flex; flex-direction: column; gap: 0.25rem; min-width: 200px; }
    .filter-group label { font-size: 0.8rem; font-weight: 500; color: #6b7280; }
    .filter-group select { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.875rem; background: white; }
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center; }
    .spinner-lg { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-icon { color: #9ca3af; margin-bottom: 1rem; }
    .empty-state h3 { font-size: 1.25rem; font-weight: 600; color: #374151; margin: 0 0 0.5rem 0; }
    .empty-state p { color: #6b7280; margin: 0 0 1rem 0; }
    .docs-list { display: grid; gap: 1rem; }
    .doc-card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; transition: all 0.2s; }
    .doc-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .doc-card.finalizado { border-left: 4px solid #10b981; }
    .doc-card-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: #f9fafb; border-bottom: 1px solid #f3f4f6; }
    .demand-badge { font-family: monospace; font-size: 0.8rem; font-weight: 600; color: #667eea; background: #eef2ff; padding: 0.2rem 0.5rem; border-radius: 6px; }
    .status-badge { font-size: 0.75rem; font-weight: 500; padding: 0.2rem 0.5rem; border-radius: 12px; background: #fef3c7; color: #d97706; }
    .status-badge.finalizado { background: #d1fae5; color: #059669; }
    .doc-card-body { padding: 1rem; }
    .doc-title { font-weight: 600; color: #1f2937; margin: 0 0 0.5rem 0; font-size: 1rem; }
    .doc-meta, .doc-updated { font-size: 0.8rem; color: #6b7280; margin: 0; }
    .doc-card-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0.75rem 1rem; border-top: 1px solid #f3f4f6; }
    .btn-action { padding: 0.375rem 0.75rem; border-radius: 6px; font-size: 0.8rem; font-weight: 500; text-decoration: none; border: 1px solid #e5e7eb; background: white; color: #374151; cursor: pointer; transition: all 0.2s; }
    .btn-action.btn-edit { color: #667eea; }
    .btn-action.btn-edit:hover { background: #eef2ff; }
    .btn-action.btn-finalize { color: #059669; }
    .btn-action.btn-finalize:hover { background: #d1fae5; }
    .btn-action.btn-unfinalize { color: #d97706; }
    .btn-action.btn-unfinalize:hover { background: #fef3c7; }
    .btn-action.btn-delete { color: #dc2626; }
    .btn-action.btn-delete:hover { background: #fee2e2; }
    .btn-action.btn-view { color: #059669; }
    .btn-action.btn-view:hover { background: #d1fae5; }
    .btn-action.btn-export-pdf { color: #374151; }
    .btn-action.btn-export-pdf:hover { background: #f3f4f6; }
  `]
})
export class ReleaseDocumentsListComponent {
  private demandService = inject(DemandService);
  private releaseService = inject(ReleaseDocumentService);

  filterDemandId = signal<string>('');
  filterStatus = signal<string>('');

  demands = this.demandService.demands;
  loading = this.releaseService.loading;

  filteredDocs = computed(() => {
    let list = this.releaseService.documents();
    const demandId = this.filterDemandId();
    const status = this.filterStatus();
    if (demandId) list = list.filter((d) => d.demandId === demandId);
    if (status) list = list.filter((d) => d.status === status);
    return list;
  });

  getDemandCode(demandId: string): string {
    return this.demandService.demands().find((d) => d.id === demandId)?.code ?? demandId.slice(0, 8);
  }

  getDemandTitle(demandId: string): string {
    return this.demandService.demands().find((d) => d.id === demandId)?.title ?? 'Demanda';
  }

  formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async finalize(doc: ReleaseDocument): Promise<void> {
    await this.releaseService.finalize(doc.id);
  }

  async unFinalize(doc: ReleaseDocument): Promise<void> {
    await this.releaseService.unFinalize(doc.id);
  }

  async confirmDelete(doc: ReleaseDocument): Promise<void> {
    if (!confirm('Excluir este documento de release? Esta ação não pode ser desfeita.')) return;
    await this.releaseService.delete(doc.id);
  }
}
