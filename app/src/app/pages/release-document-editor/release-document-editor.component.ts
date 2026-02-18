import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
  viewChild,
  ElementRef,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { DemandService, ReleaseDocumentService, AuthService } from '../../core';
import { HeaderComponent } from '../../components/header/header.component';
import type {
  ReleaseDocument,
  KeyMapping,
  RepoAfetado
} from '../../core/models/release-document.model';
import { STATUS_CONFIG } from '../../core/models/demand.model';
import type { Demand } from '../../core/models/demand.model';

@Component({
  selector: 'app-release-document-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (printOnlyMode()) {
      <div class="print-only-page">
        <div class="print-area print-visible" [attr.aria-hidden]="false">
          <div class="print-content">
            <h1>Documento de Release / Deploy</h1>
            <p class="print-demand">{{ getDemandLabel() }}</p>
            <p class="print-status">Status da demanda: {{ getDemandStatusLabel() }} · Status da release: {{ (loadedDocStatus() ?? currentDoc()?.status) === 'finalizado' ? 'Finalizado' : 'Em andamento' }}</p>
            <section class="print-section">
              <h2>DEV – LT – Funcional / Gestor</h2>
              <p><strong>DEV:</strong> {{ dev || '–' }} · <strong>LT:</strong> {{ lt || '–' }} · <strong>Funcional/Gestor:</strong> {{ funcionalGestor || '–' }}</p>
            </section>
            @if (hasKeyMappingsForPrint()) {
              <section class="print-section">
                <h2>Mapeamento de chaves alteradas</h2>
                <table>
                  <thead><tr><th>Key</th><th>Value</th><th>Ambiente</th></tr></thead>
                  <tbody>
                    @for (row of keyMappings(); track row.id) {
                      @if (row.key || row.value || row.ambiente) {
                        <tr><td>{{ row.key }}</td><td>{{ row.value }}</td><td>{{ row.ambiente }}</td></tr>
                      }
                    }
                  </tbody>
                </table>
              </section>
            }
            @if (hasReposForPrint()) {
              <section class="print-section">
                <h2>Repositórios afetados</h2>
                <ul class="print-repos-list">
                  @for (r of reposAfetados(); track r.id) {
                    @if (r.url) {
                      <li><a class="print-repo-link" [href]="r.url" target="_blank" rel="noopener noreferrer">{{ r.nome || r.url }}</a><span class="print-repo-url"> {{ r.url }}</span></li>
                    }
                  }
                </ul>
              </section>
            }
            @if (observacoesGerais) {
              <section class="print-section">
                <h2>Observações gerais</h2>
                <p class="print-observacoes">{{ observacoesGerais }}</p>
              </section>
            }
            <p class="print-footer">{{ printFooterLine() }}</p>
          </div>
        </div>
      </div>
    } @else {
    <div class="page-container">
      <app-header />

      <main class="main-content">
        <div class="content-header">
          <a routerLink="/documentos-release" class="back-link">← Documentos de release</a>
          <h2>{{ isNew() ? 'Novo documento de release' : (viewMode() ? 'Visualizando documento de release' : 'Editar documento de release') }}</h2>
          @if (demand()) {
            <p class="demand-ref">{{ demand()!.code }} – {{ demand()!.title }}</p>
          }
        </div>
        @if (viewMode()) {
          <div class="view-mode-banner" role="status">
            @if (viewModeFromCreated()) {
              <span class="view-mode-banner-icon">✓</span>
              <div class="view-mode-banner-text">
                <strong>Documento criado com sucesso.</strong> Você está em modo visualização (somente leitura).
              </div>
            } @else {
              <span class="view-mode-banner-icon" aria-hidden="true">👁</span>
              <div class="view-mode-banner-text">
                <strong>Modo visualização.</strong> Você está visualizando o documento (somente leitura).
              </div>
            }
            <button type="button" class="btn-editor-view-mode" (click)="switchToEditMode()">Editar documento</button>
          </div>
        }
        @if (isNew()) {
          <div class="demand-select-section">
            <label for="demand-combobox">Vincular à demanda</label>
            <div class="demand-combobox">
              <input
                id="demand-combobox"
                type="text"
                class="form-control"
                [ngModel]="demandSearch()"
                (ngModelChange)="onDemandSearchChange($event)"
                (focus)="demandDropdownOpen.set(true)"
                (blur)="onDemandComboboxBlur()"
                (keydown.escape)="demandDropdownOpen.set(false)"
                autocomplete="off"
                placeholder="Digite para filtrar (código ou título)..."
                aria-label="Filtrar e selecionar demanda"
                [attr.aria-expanded]="demandDropdownOpen()"
                aria-haspopup="listbox"
              />
              @if (demandId()) {
                <button type="button" class="demand-combobox-clear" (click)="clearDemandSelection()" title="Limpar seleção" aria-label="Limpar seleção">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              }
              @if (demandDropdownOpen()) {
                <ul class="demand-dropdown" role="listbox" (mousedown)="$event.preventDefault()">
                  @for (d of filteredDemands(); track d.id) {
                    <li
                      role="option"
                      [attr.aria-selected]="demandId() === d.id"
                      class="demand-dropdown-item"
                      [class.selected]="demandId() === d.id"
                      (click)="selectDemand(d)">
                      <span class="demand-dropdown-code">{{ d.code }}</span>
                      <span class="demand-dropdown-title">{{ d.title }}</span>
                    </li>
                  }
                  @if (filteredDemands().length === 0) {
                    <li class="demand-dropdown-empty">Nenhuma demanda encontrada</li>
                  }
                </ul>
              }
            </div>
            <p class="demand-combobox-hint">Digite o código (ex: DMND001) ou parte do título para filtrar. Clique em uma demanda para vincular.</p>
          </div>
        }

        @if (loading()) {
          <div class="loading-state"><div class="spinner-lg"></div><p>Carregando...</p></div>
        } @else {
          <form class="release-form" (ngSubmit)="!viewMode() && save()">
            <section class="form-section">
              <h3>DEV – LT – Funcional / Gestor de projetos</h3>
              <div class="form-row">
                <div class="field">
                  <label for="dev">DEV</label>
                  <input id="dev" type="text" class="form-control" [(ngModel)]="dev" name="dev" placeholder="Ex: João Silva" [disabled]="viewMode()" />
                </div>
                <div class="field">
                  <label for="lt">LT</label>
                  <input id="lt" type="text" class="form-control" [(ngModel)]="lt" name="lt" placeholder="Ex: LT 123" [disabled]="viewMode()" />
                </div>
                <div class="field full">
                  <label for="funcionalGestor">Funcional / Gestor de projetos</label>
                  <input id="funcionalGestor" type="text" class="form-control" [(ngModel)]="funcionalGestor" name="funcionalGestor" placeholder="Nome do funcional ou gestor" [disabled]="viewMode()" />
                </div>
              </div>
            </section>

            <section class="form-section">
              <h3>Mapeamento de chaves alteradas</h3>
              <p class="hint">Key, Value, Ambiente (se houver alterações de Keyvaults etc.)</p>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Key</th>
                      <th>Value</th>
                      <th>Ambiente</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of keyMappings(); track row.id) {
                      <tr>
                        <td><input type="text" class="form-control form-control-cell" [(ngModel)]="row.key" [ngModelOptions]="{standalone: true}" placeholder="Key" [disabled]="viewMode()" /></td>
                        <td><input type="text" class="form-control form-control-cell" [(ngModel)]="row.value" [ngModelOptions]="{standalone: true}" placeholder="Value" [disabled]="viewMode()" /></td>
                        <td>
                          <select class="form-control form-control-cell form-control-select" [(ngModel)]="row.ambiente" [ngModelOptions]="{standalone: true}" [disabled]="viewMode()">
                            <option value="">Ambiente</option>
                            @for (opt of ambienteOptions; track opt) {
                              <option [value]="opt">{{ opt }}</option>
                            }
                          </select>
                        </td>
                        <td>@if (!viewMode()) { <button type="button" class="btn-remove-row" (click)="removeKeyMapping(row)" title="Remover">×</button> }</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (!viewMode()) {
                <button type="button" class="btn-add-row" (click)="addKeyMapping()">+ Adicionar linha</button>
              }
            </section>

            <section class="form-section">
              <h3>Repositórios afetados</h3>
              <p class="hint">Links para GitHub, Azure DevOps etc.</p>
              <div class="repos-list">
                @for (repo of reposAfetados(); track repo.id) {
                  <div class="repo-row">
                    <input type="text" class="form-control repo-nome" [(ngModel)]="repo.nome" [ngModelOptions]="{standalone: true}" placeholder="Nome (opcional)" [disabled]="viewMode()" />
                    <input type="url" class="form-control repo-url" [(ngModel)]="repo.url" [ngModelOptions]="{standalone: true}" placeholder="https://..." [disabled]="viewMode()" />
                    @if (!viewMode()) { <button type="button" class="btn-remove-row" (click)="removeRepo(repo)" title="Remover">×</button> }
                  </div>
                }
              </div>
              @if (!viewMode()) {
                <button type="button" class="btn-add-row" (click)="addRepo()">+ Adicionar repositório</button>
              }
            </section>

            <section class="form-section">
              <h3>Observações gerais</h3>
              <p class="hint">Coisas não comuns que precisam ser detalhadas para o go-live.</p>
              <textarea class="form-control form-control-textarea" [(ngModel)]="observacoesGerais" name="observacoesGerais" rows="4" placeholder="Descreva observações importantes..." [disabled]="viewMode()"></textarea>
            </section>

            <div class="form-actions">
              @if (viewMode()) {
                <button type="button" class="btn-primary" (click)="switchToEditMode()">Editar documento</button>
                <button type="button" class="btn-export" (click)="exportPdf()" title="Para não exibir a URL no PDF, desmarque 'Cabeçalhos e rodapés' nas opções de impressão.">Exportar PDF</button>
                <a routerLink="/documentos-release" class="btn-cancel">Voltar à lista</a>
              } @else {
                <button type="submit" class="btn-primary">Salvar</button>
                @if (docId() && currentDoc()?.status === 'rascunho') {
                  <button type="button" class="btn-finalize" (click)="finalize()">Finalizar release</button>
                }
                @if (docId()) {
                  <button type="button" class="btn-export" (click)="exportPdf()" title="Para não exibir a URL no PDF, desmarque 'Cabeçalhos e rodapés' nas opções de impressão.">Exportar PDF</button>
                }
                <a routerLink="/documentos-release" class="btn-cancel">Cancelar</a>
              }
            </div>
          </form>
        }
      </main>

      <!-- Área para impressão / PDF (oculta, usada no print) - usa dados atuais do formulário -->
      @if (docId() || demandId()) {
        <div #printArea class="print-area" [attr.aria-hidden]="true">
          <div class="print-content">
            <h1>Documento de Release / Deploy</h1>
            <p class="print-demand">{{ getDemandLabel() }}</p>
            <p class="print-status">Status da demanda: {{ getDemandStatusLabel() }} · Status da release: {{ (loadedDocStatus() ?? currentDoc()?.status) === 'finalizado' ? 'Finalizado' : 'Em andamento' }}</p>
            <section class="print-section">
              <h2>DEV – LT – Funcional / Gestor</h2>
              <p><strong>DEV:</strong> {{ dev || '–' }} · <strong>LT:</strong> {{ lt || '–' }} · <strong>Funcional/Gestor:</strong> {{ funcionalGestor || '–' }}</p>
            </section>
            @if (hasKeyMappingsForPrint()) {
              <section class="print-section">
                <h2>Mapeamento de chaves alteradas</h2>
                <table>
                  <thead><tr><th>Key</th><th>Value</th><th>Ambiente</th></tr></thead>
                  <tbody>
                    @for (row of keyMappings(); track row.id) {
                      @if (row.key || row.value || row.ambiente) {
                        <tr><td>{{ row.key }}</td><td>{{ row.value }}</td><td>{{ row.ambiente }}</td></tr>
                      }
                    }
                  </tbody>
                </table>
              </section>
            }
            @if (hasReposForPrint()) {
              <section class="print-section">
                <h2>Repositórios afetados</h2>
                <ul class="print-repos-list">
                  @for (r of reposAfetados(); track r.id) {
                    @if (r.url) {
                      <li><a class="print-repo-link" [href]="r.url" target="_blank" rel="noopener noreferrer">{{ r.nome || r.url }}</a><span class="print-repo-url"> {{ r.url }}</span></li>
                    }
                  }
                </ul>
              </section>
            }
            @if (observacoesGerais) {
              <section class="print-section">
                <h2>Observações gerais</h2>
                <p class="print-observacoes">{{ observacoesGerais }}</p>
              </section>
            }
            <p class="print-footer">{{ printFooterLine() }}</p>
          </div>
        </div>
      }
    </div>
    }
  `,
  styles: [`
    .page-container { min-height: 100vh; background: #f3f4f6; }
    .main-content { max-width: 800px; margin: 0 auto; padding: 2rem; }
    .content-header { margin-bottom: 1.5rem; }
    .back-link { display: inline-block; color: #667eea; text-decoration: none; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .back-link:hover { text-decoration: underline; }
    .content-header h2 { font-size: 1.5rem; font-weight: 600; color: #1f2937; margin: 0; }
    .demand-ref { font-size: 0.9rem; color: #6b7280; margin: 0.25rem 0 0 0; }
    .loading-state { display: flex; flex-direction: column; align-items: center; padding: 3rem; gap: 1rem; }
    .spinner-lg { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #667eea; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .release-form { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; }
    .form-section { margin-bottom: 1.75rem; }
    .form-section:last-of-type { margin-bottom: 0; }
    .form-section h3 { font-size: 1rem; font-weight: 600; color: #374151; margin: 0 0 0.5rem 0; }
    .hint { font-size: 0.8rem; color: #6b7280; margin: 0 0 0.75rem 0; }
    .form-row { display: flex; flex-wrap: wrap; gap: 1rem; }
    .field { flex: 1; min-width: 140px; }
    .field.full { flex: 1 1 100%; }
    .field label { display: block; font-size: 0.8rem; font-weight: 500; color: #4b5563; margin-bottom: 0.375rem; }
    .form-control { display: block; width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; line-height: 1.4; color: #1f2937; background: #fff; box-sizing: border-box; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .form-control::placeholder { color: #9ca3af; }
    .form-control:hover { border-color: #9ca3af; }
    .form-control:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2); }
    .form-control:disabled { background: #f3f4f6; color: #6b7280; cursor: not-allowed; }
    .field .form-control { min-height: 40px; }
    .form-control-textarea { resize: vertical; min-height: 96px; }
    .form-control-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; padding-right: 2rem; }
    .table-wrap { overflow-x: auto; margin-bottom: 0.5rem; border: 1px solid #e5e7eb; border-radius: 8px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; table-layout: fixed; }
    .data-table th, .data-table td { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; text-align: left; vertical-align: middle; }
    .data-table th { background: #f9fafb; font-weight: 600; color: #374151; }
    .data-table th:nth-child(1), .data-table td:nth-child(1) { width: 18%; }
    .data-table th:nth-child(2), .data-table td:nth-child(2) { width: 52%; min-width: 0; overflow: hidden; }
    .data-table th:nth-child(3), .data-table td:nth-child(3) { width: 18%; }
    .data-table td:nth-child(2) input { min-width: 0; max-width: 100%; box-sizing: border-box; }
    .data-table tbody tr:hover { background: #fafafa; }
    .form-control-cell { min-height: 38px; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; }
    .form-control-cell:focus { border-color: #667eea; box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15); }
    .form-control-select.form-control-cell { min-width: 100px; }
    .btn-remove-row { width: 28px; height: 28px; border: none; background: #fee2e2; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 1.2rem; line-height: 1; }
    .btn-remove-row:hover { background: #fecaca; }
    .btn-add-row { padding: 0.5rem 0.75rem; border: 1px dashed #d1d5db; background: #f9fafb; border-radius: 8px; font-size: 0.85rem; color: #6b7280; cursor: pointer; }
    .btn-add-row:hover { background: #f3f4f6; border-color: #9ca3af; }
    .repos-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
    .repo-row { display: flex; gap: 0.5rem; align-items: center; }
    .repo-nome { flex: 0 0 180px; }
    .repo-url { flex: 1; }
    .form-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; }
    .btn-primary { padding: 0.625rem 1.25rem; background: #667eea; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
    .btn-primary:hover { background: #5a67d8; }
    .btn-finalize { padding: 0.625rem 1.25rem; background: #059669; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
    .btn-finalize:hover { background: #047857; }
    .btn-export { padding: 0.625rem 1.25rem; background: #374151; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
    .btn-export:hover { background: #1f2937; }
    .btn-cancel { padding: 0.625rem 1.25rem; color: #6b7280; text-decoration: none; font-size: 0.9rem; }
    .btn-cancel:hover { color: #374151; }
    .print-area { position: absolute; left: -9999px; top: 0; width: 210mm; background: white; padding: 24px; font-size: 15px; line-height: 1.5; color: #1f2937; }
    .print-area.print-visible { position: relative; left: 0; max-width: 210mm; margin: 0 auto; }
    .print-content { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .print-content h1 { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 6px 0; letter-spacing: -0.02em; }
    .print-demand { font-size: 14px; color: #4b5563; margin: 0 0 6px 0; font-weight: 500; }
    .print-status { font-size: 13px; color: #6b7280; margin: 0 0 18px 0; padding-bottom: 14px; border-bottom: 1px solid #e5e7eb; }
    .print-section { margin-top: 20px; padding-top: 14px; border-top: 1px solid #f3f4f6; }
    .print-content h2 { font-size: 15px; font-weight: 600; color: #374151; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.03em; }
    .print-content section > p { margin: 0; color: #374151; font-size: 15px; line-height: 1.6; }
    .print-content table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 14px; table-layout: fixed; }
    .print-content table th, .print-content table td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; word-break: break-all; overflow-wrap: break-word; }
    .print-content table th { background: #f9fafb; font-weight: 600; color: #374151; }
    .print-content table td { min-width: 0; }
    .print-content table tbody tr:nth-child(even) { background: #fafafa; }
    .print-repos-list { margin: 0; padding-left: 20px; list-style: disc; font-size: 15px; }
    .print-repos-list li { margin-bottom: 8px; }
    .print-repo-link { color: #2563eb; text-decoration: underline; }
    .print-repo-link:hover { color: #1d4ed8; }
    .print-repo-url { font-size: 13px; color: #6b7280; word-break: break-all; }
    .print-observacoes { margin: 0; white-space: pre-wrap; line-height: 1.6; color: #374151; font-size: 15px; }
    .print-footer { margin-top: 28px; padding-top: 14px; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .demand-select-section { background: white; border-radius: 12px; padding: 1rem 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .demand-select-section label { display: block; font-size: 0.85rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem; }
    .demand-combobox { position: relative; max-width: 520px; }
    .demand-combobox .form-control { padding-right: 2.5rem; }
    .demand-combobox-clear { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: #6b7280; border-radius: 6px; cursor: pointer; }
    .demand-combobox-clear:hover { background: #f3f4f6; color: #374151; }
    .demand-dropdown { position: absolute; left: 0; right: 0; top: 100%; margin: 4px 0 0 0; padding: 0; list-style: none; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-height: 280px; overflow-y: auto; z-index: 50; }
    .demand-dropdown-item { padding: 0.625rem 0.875rem; cursor: pointer; border-bottom: 1px solid #f3f4f6; display: flex; flex-direction: column; gap: 0.125rem; }
    .demand-dropdown-item:last-child { border-bottom: none; }
    .demand-dropdown-item:hover { background: #f9fafb; }
    .demand-dropdown-item.selected { background: #eef2ff; color: #4338ca; }
    .demand-dropdown-code { font-size: 0.8rem; font-weight: 600; color: #667eea; }
    .demand-dropdown-title { font-size: 0.875rem; color: #374151; }
    .demand-dropdown-item.selected .demand-dropdown-title { color: #4338ca; }
    .demand-dropdown-empty { padding: 1rem; text-align: center; color: #9ca3af; font-size: 0.875rem; }
    .demand-combobox-hint { font-size: 0.75rem; color: #6b7280; margin: 0.5rem 0 0 0; }
    .view-mode-banner { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; }
    .view-mode-banner-icon { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #10b981; color: white; border-radius: 50%; font-weight: 700; font-size: 1rem; }
    .view-mode-banner-text { flex: 1; min-width: 200px; color: #065f46; font-size: 0.9rem; }
    .view-mode-banner-text strong { display: block; margin-bottom: 0.125rem; }
    .btn-editor-view-mode { padding: 0.5rem 1rem; background: #059669; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; white-space: nowrap; }
    .btn-editor-view-mode:hover { background: #047857; }
    .print-only-page { min-height: 100vh; background: white; padding: 20px; }
    @media print {
      @page { size: auto; margin: 8mm; }
      body * { visibility: hidden !important; }
      .page-container .print-area,
      .page-container .print-area * { visibility: visible !important; }
      .print-only-page .print-area,
      .print-only-page .print-area * { visibility: visible !important; }
      .page-container > *:not(.print-area) { display: none !important; }
      .print-only-page > *:not(.print-area) { display: none !important; }
      .print-area { position: static !important; left: auto !important; top: auto !important; width: 100% !important; max-width: none !important; padding: 15mm !important; margin: 0 !important; background: white !important; overflow: visible !important; height: auto !important; min-height: auto !important; }
      .print-content { overflow: visible !important; height: auto !important; }
      .print-repo-link { color: #2563eb !important; text-decoration: underline !important; }
    }
  `]
})
export class ReleaseDocumentEditorComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  demandService = inject(DemandService);
  private releaseService = inject(ReleaseDocumentService);
  private authService = inject(AuthService);

  printAreaRef = viewChild<ElementRef<HTMLDivElement>>('printArea');

  loading = signal(true);
  docId = signal<string | null>(null);
  demandId = signal<string | null>(null);
  demandSearch = signal('');
  demandDropdownOpen = signal(false);
  /** Modo visualização (somente leitura) após criar documento ou ao abrir com ?view=1 */
  viewMode = signal(false);
  /** True quando entrou em modo visualização por ter acabado de criar (exibe banner de sucesso) */
  viewModeFromCreated = signal(false);
  /** Modo somente impressão (aberto via ?print=1 na lista) */
  printOnlyMode = signal(false);
  /** Status do documento carregado (para impressão direta quando currentDoc ainda não está na lista) */
  loadedDocStatus = signal<'rascunho' | 'finalizado' | null>(null);

  dev = '';
  lt = '';
  funcionalGestor = '';
  keyMappings = signal<KeyMapping[]>([]);
  reposAfetados = signal<RepoAfetado[]>([]);
  observacoesGerais = '';

  isNew = computed(() => !this.docId());
  demand = computed(() => {
    const id = this.demandId();
    return id ? this.demandService.demands().find((d) => d.id === id) : null;
  });
  currentDoc = computed(() => {
    const id = this.docId();
    return id ? this.releaseService.documents().find((d) => d.id === id) : null;
  });
  printDate = () => new Date().toLocaleString('pt-BR');
  printFooterLine = (): string => {
    const date = this.printDate();
    const u = this.authService.user();
    const userLabel = u?.displayName?.trim() || u?.email || '';
    return userLabel ? `Gerado em ${date} · Usuário: ${userLabel}` : `Gerado em ${date}`;
  };

  readonly ambienteOptions = ['DEV', 'QAS', 'PRD'];

  filteredDemands = computed(() => {
    const q = this.demandSearch().trim().toLowerCase();
    const list = this.demandService.demands();
    if (!q) return list;
    return list.filter(
      (d) =>
        d.code.toLowerCase().includes(q) || d.title.toLowerCase().includes(q)
    );
  });

  constructor() {
    effect(() => {
      const d = this.demand();
      const id = this.demandId();
      if (id && d && this.demandSearch() === '') {
        this.demandSearch.set(this.getDemandLabelFor(d));
      }
    });
  }

  ngOnInit(): void {
    const segments = this.route.snapshot.url;
    const lastSegment = segments[segments.length - 1]?.path;
    const isNewRoute = lastSegment === 'novo';
    const id = this.route.snapshot.paramMap.get('id');
    const demandIdFromQuery = this.route.snapshot.queryParamMap.get('demandId');
    if (!isNewRoute && id) {
      this.docId.set(id);
      this.loadDoc(id);
    } else {
      this.docId.set(null);
      this.demandId.set(demandIdFromQuery);
      this.loading.set(false);
      if (this.keyMappings().length === 0) this.addKeyMapping();
      if (this.reposAfetados().length === 0) this.addRepo();
    }
  }

  private async loadDoc(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const doc = await this.releaseService.getById(id);
      if (!doc) {
        this.router.navigate(['/documentos-release']);
        return;
      }
      this.demandId.set(doc.demandId);
      this.dev = doc.dev;
      this.lt = doc.lt;
      this.funcionalGestor = doc.funcionalGestor;
      this.keyMappings.set(doc.keyMappings?.length ? [...doc.keyMappings] : []);
      this.reposAfetados.set(doc.reposAfetados?.length ? [...doc.reposAfetados] : []);
      this.observacoesGerais = doc.observacoesGerais ?? '';
      this.loadedDocStatus.set(doc.status);
      if (this.keyMappings().length === 0) this.addKeyMapping();
      if (this.reposAfetados().length === 0) this.addRepo();
      const created = this.route.snapshot.queryParamMap.get('created') === '1';
      const viewOnly = this.route.snapshot.queryParamMap.get('view') === '1';
      const printParam = this.route.snapshot.queryParamMap.get('print') === '1';
      this.viewMode.set(created || viewOnly);
      this.viewModeFromCreated.set(created);
      if (printParam) {
        this.printOnlyMode.set(true);
        setTimeout(() => window.print(), 600);
      }
    } catch {
      this.router.navigate(['/documentos-release']);
    } finally {
      this.loading.set(false);
    }
  }

  switchToEditMode(): void {
    this.viewMode.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { created: null },
      queryParamsHandling: 'merge'
    });
  }

  addKeyMapping(): void {
    this.keyMappings.update((list) => [...list, this.releaseService.createKeyMapping()]);
  }

  removeKeyMapping(row: KeyMapping): void {
    this.keyMappings.update((list) => list.filter((r) => r.id !== row.id));
  }

  addRepo(): void {
    this.reposAfetados.update((list) => [...list, this.releaseService.createRepoAfetado()]);
  }

  removeRepo(repo: RepoAfetado): void {
    this.reposAfetados.update((list) => list.filter((r) => r.id !== repo.id));
  }

  getDemandLabel(): string {
    const d = this.demand();
    return d ? `${d.code} – ${d.title}` : 'Demanda';
  }

  getDemandLabelFor(d: Demand): string {
    return `${d.code} – ${d.title}`;
  }

  onDemandSearchChange(value: string): void {
    this.demandSearch.set(value);
    if (!value.trim()) this.demandId.set(null);
    this.demandDropdownOpen.set(true);
  }

  selectDemand(d: Demand): void {
    this.demandId.set(d.id);
    this.demandSearch.set(this.getDemandLabelFor(d));
    this.demandDropdownOpen.set(false);
  }

  clearDemandSelection(): void {
    this.demandId.set(null);
    this.demandSearch.set('');
    this.demandDropdownOpen.set(false);
  }

  onDemandComboboxBlur(): void {
    setTimeout(() => this.demandDropdownOpen.set(false), 200);
  }

  getDemandStatusLabel(): string {
    const d = this.demand();
    return d ? (STATUS_CONFIG[d.status]?.label ?? d.status) : '–';
  }

  hasKeyMappingsForPrint(): boolean {
    return this.keyMappings().some((r) => Boolean(r.key || r.value || r.ambiente));
  }

  hasReposForPrint(): boolean {
    return this.reposAfetados().some((r) => Boolean(r.url));
  }

  async save(): Promise<void> {
    const id = this.docId();
    const demandId = this.demandId();
    const payload = {
      dev: this.dev,
      lt: this.lt,
      funcionalGestor: this.funcionalGestor,
      keyMappings: this.keyMappings().filter((r) => r.key || r.value || r.ambiente),
      reposAfetados: this.reposAfetados().filter((r) => r.url),
      observacoesGerais: this.observacoesGerais
    };
    if (id) {
      await this.releaseService.update(id, payload);
      this.router.navigate(['/documentos-release']);
    } else {
      if (!demandId) {
        alert('Selecione uma demanda. Use a página de demandas e clique em "Criar documento de release" ou escolha uma demanda ao criar.');
        return;
      }
      const newId = await this.releaseService.create(demandId, payload);
      this.router.navigate(['/documentos-release', newId], {
        queryParams: { created: '1' }
      });
    }
  }

  async finalize(): Promise<void> {
    const id = this.docId();
    if (!id) return;
    await this.save();
    await this.releaseService.finalize(id);
  }

  exportPdf(): void {
    const prevTitle = document.title;
    document.title = ' ';
    const onAfterPrint = (): void => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', onAfterPrint);
    };
    window.addEventListener('afterprint', onAfterPrint);
    window.print();
  }
}
