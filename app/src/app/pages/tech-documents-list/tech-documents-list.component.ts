import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DemandService, TechDocumentService } from '../../core';
import type { TechDocument } from '../../core/models/tech-document.model';

@Component({
  selector: 'app-tech-documents-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="content-header content-header-tech">
      <div class="header-left">
        <h2>Documentos Técnicos</h2>
        <span class="doc-count doc-count-tech">{{ documents().length }} documento(s)</span>
      </div>
      <div class="header-right">
        <a [routerLink]="['/documentos-tech/novo']" class="btn-primary btn-primary-tech">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Novo documento
        </a>
      </div>
    </div>

    <div class="filter-section-tech">
      <div class="filter-group">
        <label for="filter-demand-tech">Demanda vinculada</label>
        <select id="filter-demand-tech" [ngModel]="filterDemandId()" (ngModelChange)="filterDemandId.set($event)">
          <option value="">Todos</option>
          <option value="__none__">Sem demanda</option>
          @for (d of demands(); track d.id) {
            <option [value]="d.id">{{ d.code }} – {{ d.title }}</option>
          }
        </select>
      </div>
    </div>

    @if (loading()) {
      <div class="loading-state">
        <div class="spinner-lg spinner-tech"></div>
        <p>Carregando documentos...</p>
      </div>
    } @else if (filteredDocs().length === 0) {
      <div class="empty-state empty-state-tech">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <path d="M16 13H8"></path>
            <path d="M16 17H8"></path>
            <path d="M10 9H8"></path>
          </svg>
        </div>
        <h3>Nenhum documento técnico</h3>
        <p>Crie desenhos de solução, especificações técnicas e outros docs. A demanda é opcional.</p>
        <a [routerLink]="['/documentos-tech/novo']" class="btn-primary btn-primary-tech">Criar primeiro documento</a>
      </div>
    } @else {
      <div class="docs-list">
        @for (doc of filteredDocs(); track doc.id) {
          <div class="doc-card doc-card-tech">
            <div class="doc-card-header">
              @if (doc.demandId) {
                <span class="demand-badge demand-badge-tech">{{ getDemandCode(doc.demandId) }}</span>
              } @else {
                <span class="no-demand-badge">Sem demanda</span>
              }
            </div>
            <div class="doc-card-body">
              <p class="doc-title">{{ doc.title || 'Sem título' }}</p>
              @if (docPreview(doc)) {
                <p class="doc-preview">{{ docPreview(doc) }}</p>
              }
              <p class="doc-updated">Atualizado em {{ formatDate(doc.updatedAt) }}</p>
            </div>
            <div class="doc-card-actions">
              <a [routerLink]="['/documentos-tech', doc.id]" [queryParams]="{ view: '1' }" class="btn-action btn-view" title="Visualizar">Visualizar</a>
              <a [routerLink]="['/documentos-tech', doc.id]" [queryParams]="{ print: '1' }" target="_blank" rel="noopener" class="btn-action btn-export-pdf" title="Exportar PDF">Exportar PDF</a>
              <a [routerLink]="['/documentos-tech', doc.id]" class="btn-action btn-edit" title="Editar">Editar</a>
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
    .content-header-tech .header-left h2 { color: #0c4a6e; }
    .header-left { display: flex; align-items: center; gap: 1rem; }
    .header-left h2 { font-size: 1.5rem; font-weight: 600; margin: 0; }
    .doc-count { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem; font-weight: 500; }
    .doc-count-tech { background: #e0f2fe; color: #0369a1; }
    .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; border-radius: 8px; font-weight: 500; text-decoration: none; transition: all 0.2s; }
    .btn-primary-tech { background: #0ea5e9; color: white; }
    .btn-primary-tech:hover { background: #0284c7; }
    .filter-section-tech { margin-bottom: 1.5rem; background: white; padding: 1rem; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #0ea5e9; }
    .filter-group { display: flex; flex-direction: column; gap: 0.25rem; min-width: 200px; }
    .filter-group label { font-size: 0.8rem; font-weight: 500; color: #6b7280; }
    .filter-group select { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.875rem; background: white; }
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center; }
    .spinner-lg { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .spinner-tech { border-top-color: #0ea5e9; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-icon { color: #7dd3fc; margin-bottom: 1rem; }
    .empty-state-tech h3 { font-size: 1.25rem; font-weight: 600; color: #0c4a6e; margin: 0 0 0.5rem 0; }
    .empty-state p { color: #6b7280; margin: 0 0 1rem 0; }
    .docs-list { display: grid; gap: 1rem; }
    .doc-card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; transition: all 0.2s; }
    .doc-card-tech { border-left: 4px solid #0ea5e9; }
    .doc-card-tech:hover { box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15); }
    .doc-card-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: #f0f9ff; border-bottom: 1px solid #e0f2fe; }
    .demand-badge-tech { font-family: monospace; font-size: 0.8rem; font-weight: 600; color: #0369a1; background: #e0f2fe; padding: 0.2rem 0.5rem; border-radius: 6px; }
    .no-demand-badge { font-size: 0.75rem; color: #64748b; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 6px; }
    .doc-card-body { padding: 1rem; }
    .doc-title { font-weight: 600; color: #1f2937; margin: 0 0 0.5rem 0; font-size: 1rem; }
    .doc-preview { font-size: 0.85rem; color: #64748b; margin: 0 0 0.5rem 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .doc-updated { font-size: 0.8rem; color: #94a3b8; margin: 0; }
    .doc-card-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; padding: 0.75rem 1rem; border-top: 1px solid #f3f4f6; }
    .btn-action { padding: 0.375rem 0.75rem; border-radius: 6px; font-size: 0.8rem; font-weight: 500; text-decoration: none; border: 1px solid #e5e7eb; background: white; color: #374151; cursor: pointer; transition: all 0.2s; }
    .btn-action.btn-edit { color: #0ea5e9; }
    .btn-action.btn-edit:hover { background: #e0f2fe; }
    .btn-action.btn-delete { color: #dc2626; }
    .btn-action.btn-delete:hover { background: #fee2e2; }
    .btn-action.btn-view { color: #059669; }
    .btn-action.btn-view:hover { background: #d1fae5; }
    .btn-action.btn-export-pdf { color: #374151; }
    .btn-action.btn-export-pdf:hover { background: #f3f4f6; }
  `]
})
export class TechDocumentsListComponent {
  private demandService = inject(DemandService);
  private techService = inject(TechDocumentService);

  filterDemandId = signal<string>('');

  demands = this.demandService.demands;
  documents = this.techService.documents;
  loading = this.techService.loading;

  filteredDocs = computed(() => {
    let list = this.techService.documents();
    const demandId = this.filterDemandId();
    if (demandId === '__none__') {
      list = list.filter((d) => !d.demandId);
    } else if (demandId) {
      list = list.filter((d) => d.demandId === demandId);
    }
    return list;
  });

  getDemandCode(demandId: string): string {
    return this.demandService.demands().find((d) => d.id === demandId)?.code ?? demandId.slice(0, 8);
  }

  /** Remove tags HTML e retorna texto para preview */
  preview(content: string, maxLen = 120): string {
    if (!content) return '';
    const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length <= maxLen ? text : text.slice(0, maxLen) + '…';
  }

  /** Preview do documento: resumo, primeiro passo ou conteúdo legado */
  docPreview(doc: TechDocument, maxLen = 120): string {
    if (doc.summary?.trim()) return doc.summary.length <= maxLen ? doc.summary : doc.summary.slice(0, maxLen) + '…';
    if (doc.steps?.length) {
      const first = doc.steps.find((s) => s.title?.trim() || s.description?.trim());
      if (first?.title?.trim()) return first.title.length <= maxLen ? first.title : first.title.slice(0, maxLen) + '…';
      if (first?.description?.trim()) return this.preview(first.description, maxLen);
      return doc.steps.length === 1 ? '1 passo' : `${doc.steps.length} passos`;
    }
    if (doc.content?.trim()) return this.preview(doc.content, maxLen);
    return '';
  }

  formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  async confirmDelete(doc: TechDocument): Promise<void> {
    if (!confirm('Excluir este documento técnico? Esta ação não pode ser desfeita.')) return;
    await this.techService.delete(doc.id);
  }
}
