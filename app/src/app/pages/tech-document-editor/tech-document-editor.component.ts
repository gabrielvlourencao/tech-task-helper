import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { DemandService, TechDocumentService, AuthService } from '../../core';
import { HeaderComponent } from '../../components/header/header.component';
import { StepDescriptionEditorComponent, sanitizeStepHtml } from './step-description-editor.component';
import type { Demand } from '../../core/models/demand.model';
import type { TechKeyMapping, TechDocumentStep, ImpactedRepo } from '../../core/models/tech-document.model';

const AMBIENTE_OPTIONS = ['DEV', 'QAS', 'PRD'];

@Component({
  selector: 'app-tech-document-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent, StepDescriptionEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (printOnlyMode()) {
      <div class="print-only-page">
        <div class="print-area print-visible" [attr.aria-hidden]="false">
          <div class="print-content">
            <h1>Documento Técnico</h1>
            <p class="print-title">{{ title || 'Sem título' }}</p>
            @if (demand()) {
              <p class="print-demand">Demanda: {{ demand()!.code }} – {{ demand()!.title }}</p>
            } @else {
              <p class="print-demand">Sem demanda vinculada</p>
            }
            @if (summary()) {
              <section class="print-section">
                <h2>Resumo / Contexto</h2>
                <p class="print-body-text">{{ summary() }}</p>
              </section>
            }
            @if (hasImpactedReposForPrint()) {
              <section class="print-section">
                <h2>Repos impactados</h2>
                <table>
                  <thead><tr><th>Nome</th><th>Link</th><th>Stack</th></tr></thead>
                  <tbody>
                    @for (row of impactedRepos(); track row.id) {
                      @if (row.name || row.link || row.stack) {
                        <tr><td>{{ row.name }}</td><td>{{ row.link }}</td><td>{{ row.stack }}</td></tr>
                      }
                    }
                  </tbody>
                </table>
              </section>
            }
            @if (hasKeyMappingsForPrint()) {
              <section class="print-section">
                <h2>Chaves (Keyvault / configuração)</h2>
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
            @if (sortedSteps().length > 0) {
              <section class="print-section">
                <h2>Documentação em tópicos</h2>
                @for (step of sortedSteps(); track step.id) {
                  <div class="print-step">
                    <h3>Step {{ step.order }}: {{ step.title || '(Sem título)' }}</h3>
                    <div class="print-step-desc" [innerHTML]="stepDescriptionTrusted(step)"></div>
                  </div>
                }
              </section>
            } @else if (legacyContent()) {
              <section class="print-section">
                <div class="print-body rich-print-body" [innerHTML]="trustedLegacyContent()"></div>
              </section>
            }
            <section class="print-section">
              <h2>Observações gerais</h2>
              <p class="print-body-text">{{ generalObservationsValue || '—' }}</p>
            </section>
            <p class="print-footer">{{ printFooterLine() }}</p>
          </div>
        </div>
      </div>
    } @else {
    <div class="page-container">
      <app-header />

      <main class="main-content">
        <div class="content-header">
          <a routerLink="/documentos/tech" class="back-link">← Documentos técnicos</a>
          <h2>{{ isNew() ? 'Novo documento técnico' : (viewMode() ? 'Visualizando documento técnico' : 'Editar documento técnico') }}</h2>
          @if (demand()) {
            <p class="demand-ref">{{ demand()!.code }} – {{ demand()!.title }}</p>
          }
        </div>

        @if (viewMode()) {
          <div class="view-mode-banner view-mode-banner-tech" role="status">
            <span class="view-mode-banner-icon" aria-hidden="true">👁</span>
            <div class="view-mode-banner-text">
              <strong>Modo visualização.</strong> Somente leitura.
            </div>
            <button type="button" class="btn-editor-view-mode" (click)="switchToEditMode()">Editar documento</button>
          </div>
        }

        <div class="demand-select-section">
          <label for="demand-combobox-tech">Vincular à demanda (opcional)</label>
          <div class="demand-combobox">
            <input
              id="demand-combobox-tech"
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
              [readonly]="viewMode()"
            />
            @if (demandId()) {
              @if (!viewMode()) {
                <button type="button" class="demand-combobox-clear" (click)="clearDemandSelection()" title="Limpar seleção" aria-label="Limpar seleção">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              }
            }
            @if (demandDropdownOpen() && !viewMode()) {
              <ul class="demand-dropdown" role="listbox" (mousedown)="$event.preventDefault()">
                <li
                  role="option"
                  [attr.aria-selected]="demandId() === null"
                  class="demand-dropdown-item"
                  [class.selected]="demandId() === null"
                  (click)="clearDemandSelection()">
                  <span class="demand-dropdown-empty">Nenhuma (sem demanda)</span>
                </li>
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
                @if (filteredDemands().length === 0 && demandSearch().trim()) {
                  <li class="demand-dropdown-empty">Nenhuma demanda encontrada</li>
                }
              </ul>
            }
          </div>
        </div>

        @if (loading()) {
          <div class="loading-state"><div class="spinner-lg spinner-tech"></div><p>Carregando...</p></div>
        } @else {
          <form class="tech-form" (ngSubmit)="!viewMode() && save()">
            <section class="form-section">
              <h3>Título</h3>
              <input id="doc-title" type="text" class="form-control" [(ngModel)]="title" name="title" placeholder="Ex: Desenho de solução - Integração X" [disabled]="viewMode()" />
            </section>

            <section class="form-section">
              <h3>Resumo / Contexto</h3>
              <p class="hint">Contexto geral da solução ou objetivo do documento.</p>
              <textarea id="doc-summary" class="form-control form-control-textarea" [(ngModel)]="summaryValue" name="summary" rows="3" placeholder="Descreva o contexto..." [disabled]="viewMode()"></textarea>
            </section>

            <section class="form-section">
              <h3>Repos impactados</h3>
              <p class="hint">Repositórios impactados pela solução: Nome, Link e Stack do projeto.</p>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Link</th>
                      <th>Stack</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of impactedRepos(); track row.id) {
                      <tr>
                        <td><input type="text" class="form-control form-control-cell" [(ngModel)]="row.name" [ngModelOptions]="{standalone: true}" placeholder="Nome do repo" [disabled]="viewMode()" /></td>
                        <td><input type="url" class="form-control form-control-cell" [(ngModel)]="row.link" [ngModelOptions]="{standalone: true}" placeholder="https://..." [disabled]="viewMode()" /></td>
                        <td><input type="text" class="form-control form-control-cell" [(ngModel)]="row.stack" [ngModelOptions]="{standalone: true}" placeholder="Ex: .NET 8, Angular 21" [disabled]="viewMode()" /></td>
                        <td>@if (!viewMode()) { <button type="button" class="btn-remove-row" (click)="removeImpactedRepo(row)" title="Remover">×</button> }</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (!viewMode()) {
                <button type="button" class="btn-add-row" (click)="addImpactedRepo()">+ Adicionar repo</button>
              }
            </section>

            <section class="form-section">
              <h3>Chaves (opcional)</h3>
              <p class="hint">Key, Value, Ambiente – se houver alterações de Keyvault/configuração.</p>
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
              <h3>Documentação em tópicos</h3>
              <p class="hint">Step 1, Step 2, … – cada passo com título e descrição (ex: Step 1: API - Criar novo endpoint).</p>
              <div class="steps-list">
                @for (step of sortedSteps(); track step.id) {
                  <div class="step-card">
                    <span class="step-number" aria-hidden="true">Step {{ step.order }}</span>
                    <div class="step-fields">
                      <input type="text" class="form-control" [(ngModel)]="step.title" [ngModelOptions]="{standalone: true}" placeholder="Ex: API - Criar novo endpoint" [disabled]="viewMode()" />
                      @if (viewMode()) {
                        <div class="form-control form-control-textarea form-control-step-desc step-desc-readonly" [innerHTML]="stepDescriptionTrusted(step)" role="document" aria-label="Descrição do passo"></div>
                      } @else {
                        <app-step-description-editor
                          [step]="step"
                          (descriptionChange)="step.description = $event"
                          class="form-control form-control-textarea form-control-step-desc step-desc-editor"
                        />
                      }
                    </div>
                    @if (!viewMode()) {
                      <button type="button" class="btn-remove-row btn-remove-step" (click)="removeStep(step)" title="Remover passo">×</button>
                    }
                  </div>
                }
              </div>
              @if (!viewMode()) {
                <button type="button" class="btn-add-row" (click)="addStep()">+ Adicionar passo</button>
              }
            </section>

            @if (legacyContent()) {
              <section class="form-section form-section-legacy">
                <h3>Conteúdo (formato anterior)</h3>
                <p class="hint">Este documento tinha conteúdo no formato antigo. Você pode mantê-lo como referência ou migrar para os passos acima.</p>
                <textarea class="form-control form-control-textarea" [(ngModel)]="legacyContentValue" name="legacyContent" rows="6" [disabled]="viewMode()"></textarea>
              </section>
            }

            <section class="form-section">
              <h3>Observações gerais</h3>
              <p class="hint">Observações ou notas adicionais sobre o documento.</p>
              <textarea id="doc-general-observations" class="form-control form-control-textarea" [(ngModel)]="generalObservationsValue" name="generalObservations" rows="3" placeholder="Observações gerais..." [disabled]="viewMode()"></textarea>
            </section>

            <div class="form-actions">
              @if (viewMode()) {
                <button type="button" class="btn-primary btn-primary-tech" (click)="switchToEditMode()">Editar documento</button>
                <button type="button" class="btn-export" (click)="exportPdf()">Exportar PDF</button>
                <a routerLink="/documentos/tech" class="btn-cancel">Voltar à lista</a>
              } @else {
                <button type="submit" class="btn-primary btn-primary-tech">Salvar</button>
                @if (docId()) {
                  <button type="button" class="btn-export" (click)="exportPdf()">Exportar PDF</button>
                }
                <a routerLink="/documentos/tech" class="btn-cancel">Cancelar</a>
              }
            </div>
          </form>
        }
      </main>

      @if (docId() || title || summary() || hasImpactedReposForPrint() || generalObservations() || steps().length > 0 || legacyContent()) {
        <div #printArea class="print-area" [attr.aria-hidden]="true">
          <div class="print-content">
            <h1>Documento Técnico</h1>
            <p class="print-title">{{ title || 'Sem título' }}</p>
            @if (demand()) {
              <p class="print-demand">Demanda: {{ demand()!.code }} – {{ demand()!.title }}</p>
            } @else {
              <p class="print-demand">Sem demanda vinculada</p>
            }
            @if (summary()) {
              <section class="print-section">
                <h2>Resumo / Contexto</h2>
                <p class="print-body-text">{{ summary() }}</p>
              </section>
            }
            @if (hasImpactedReposForPrint()) {
              <section class="print-section">
                <h2>Repos impactados</h2>
                <table>
                  <thead><tr><th>Nome</th><th>Link</th><th>Stack</th></tr></thead>
                  <tbody>
                    @for (row of impactedRepos(); track row.id) {
                      @if (row.name || row.link || row.stack) {
                        <tr><td>{{ row.name }}</td><td>{{ row.link }}</td><td>{{ row.stack }}</td></tr>
                      }
                    }
                  </tbody>
                </table>
              </section>
            }
            @if (hasKeyMappingsForPrint()) {
              <section class="print-section">
                <h2>Chaves (Keyvault / configuração)</h2>
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
            @if (sortedSteps().length > 0) {
              <section class="print-section">
                <h2>Documentação em tópicos</h2>
                @for (step of sortedSteps(); track step.id) {
                  <div class="print-step">
                    <h3>Step {{ step.order }}: {{ step.title || '(Sem título)' }}</h3>
                    <div class="print-step-desc" [innerHTML]="stepDescriptionTrusted(step)"></div>
                  </div>
                }
              </section>
              } @else if (legacyContent()) {
                <section class="print-section">
                  <div class="print-body rich-print-body" [innerHTML]="trustedLegacyContent()"></div>
                </section>
              }
              <section class="print-section">
                <h2>Observações gerais</h2>
                <p class="print-body-text">{{ generalObservationsValue || '—' }}</p>
              </section>
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
    .back-link { display: inline-block; color: #0ea5e9; text-decoration: none; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .back-link:hover { text-decoration: underline; }
    .content-header h2 { font-size: 1.5rem; font-weight: 600; color: #0c4a6e; margin: 0; }
    .demand-ref { font-size: 0.9rem; color: #6b7280; margin: 0.25rem 0 0 0; }
    .loading-state { display: flex; flex-direction: column; align-items: center; padding: 3rem; gap: 1rem; }
    .spinner-lg { width: 48px; height: 48px; border: 4px solid #e5e7eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
    .spinner-tech { border-top-color: #0ea5e9; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .tech-form { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.5rem; border-left: 4px solid #0ea5e9; }
    .form-section { margin-bottom: 1.75rem; }
    .form-section-legacy { border-top: 1px dashed #e5e7eb; padding-top: 1.25rem; }
    .form-section h3 { font-size: 1rem; font-weight: 600; color: #374151; margin: 0 0 0.5rem 0; }
    .hint { font-size: 0.8rem; color: #6b7280; margin: 0 0 0.75rem 0; }
    .form-control { display: block; width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; line-height: 1.4; color: #1f2937; background: #fff; box-sizing: border-box; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .form-control::placeholder { color: #9ca3af; }
    .form-control:hover { border-color: #9ca3af; }
    .form-control:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2); }
    .form-control:disabled { background: #f3f4f6; color: #6b7280; cursor: not-allowed; }
    .form-control-textarea { resize: vertical; min-height: 72px; }
    .form-control-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.75rem center; padding-right: 2rem; }
    .table-wrap { overflow-x: auto; margin-bottom: 0.5rem; border: 1px solid #e5e7eb; border-radius: 8px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .data-table th, .data-table td { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; text-align: left; vertical-align: middle; }
    .data-table th { background: #f9fafb; font-weight: 600; color: #374151; }
    .form-control-cell { min-height: 38px; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; }
    .form-control-cell:focus { border-color: #0ea5e9; box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15); }
    .form-control-select.form-control-cell { min-width: 100px; }
    .btn-remove-row { width: 28px; height: 28px; border: none; background: #fee2e2; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 1.2rem; line-height: 1; flex-shrink: 0; }
    .btn-remove-row:hover { background: #fecaca; }
    .btn-add-row { padding: 0.5rem 0.75rem; border: 1px dashed #d1d5db; background: #f9fafb; border-radius: 8px; font-size: 0.85rem; color: #6b7280; cursor: pointer; }
    .btn-add-row:hover { background: #f0f9ff; border-color: #0ea5e9; color: #0369a1; }
    .steps-list { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 0.5rem; }
    .step-card { display: flex; gap: 0.75rem; align-items: flex-start; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 10px; background: #fafafa; }
    .step-number { flex: 0 0 auto; font-size: 0.8rem; font-weight: 700; color: #0ea5e9; padding: 0.25rem 0.5rem; background: #e0f2fe; border-radius: 6px; }
    .step-fields { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .form-control-step-desc { min-height: 60px; font-size: 0.875rem; }
    .btn-remove-step { align-self: center; }
    .form-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; }
    .btn-primary { padding: 0.625rem 1.25rem; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
    .btn-primary-tech { background: #0ea5e9; color: white; }
    .btn-primary-tech:hover { background: #0284c7; }
    .btn-export { padding: 0.625rem 1.25rem; background: #374151; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
    .btn-export:hover { background: #1f2937; }
    .btn-cancel { padding: 0.625rem 1.25rem; color: #6b7280; text-decoration: none; font-size: 0.9rem; }
    .btn-cancel:hover { color: #374151; }
    .demand-select-section { background: white; border-radius: 12px; padding: 1rem 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid #0ea5e9; }
    .demand-select-section label { display: block; font-size: 0.85rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem; }
    .demand-combobox { position: relative; max-width: 520px; }
    .demand-combobox .form-control { padding-right: 2.5rem; }
    .demand-combobox-clear { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: #6b7280; border-radius: 6px; cursor: pointer; }
    .demand-combobox-clear:hover { background: #f3f4f6; color: #374151; }
    .demand-dropdown { position: absolute; left: 0; right: 0; top: 100%; margin: 4px 0 0 0; padding: 0; list-style: none; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-height: 280px; overflow-y: auto; z-index: 50; }
    .demand-dropdown-item { padding: 0.625rem 0.875rem; cursor: pointer; border-bottom: 1px solid #f3f4f6; display: flex; flex-direction: column; gap: 0.125rem; }
    .demand-dropdown-item:last-child { border-bottom: none; }
    .demand-dropdown-item:hover { background: #f0f9ff; }
    .demand-dropdown-item.selected { background: #e0f2fe; color: #0369a1; }
    .demand-dropdown-code { font-size: 0.8rem; font-weight: 600; color: #0ea5e9; }
    .demand-dropdown-title { font-size: 0.875rem; color: #374151; }
    .demand-dropdown-item.selected .demand-dropdown-title { color: #0369a1; }
    .demand-dropdown-empty { padding: 0.5rem 0; font-size: 0.875rem; color: #64748b; }
    .view-mode-banner { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; }
    .view-mode-banner-tech { background: #ecfeff; border: 1px solid #a5f3fc; }
    .view-mode-banner-icon { font-size: 1.25rem; }
    .view-mode-banner-text { flex: 1; min-width: 200px; color: #0e7490; font-size: 0.9rem; }
    .btn-editor-view-mode { padding: 0.5rem 1rem; background: #0ea5e9; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; }
    .btn-editor-view-mode:hover { background: #0284c7; }
    .print-area { position: absolute; left: -9999px; top: 0; width: 210mm; background: white; padding: 24px; font-size: 13px; line-height: 1.45; color: #1f2937; }
    .print-area.print-visible { position: relative; left: 0; max-width: 210mm; margin: 0 auto; }
    .print-content h1 { font-size: 20px; font-weight: 700; color: #0c4a6e; margin: 0 0 4px 0; }
    .print-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0; }
    .print-demand { font-size: 12px; color: #64748b; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
    .print-section { margin-top: 16px; }
    .print-content h2 { font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.03em; }
    .print-body-text { margin: 0; white-space: pre-wrap; line-height: 1.5; color: #374151; }
    .print-step { margin-top: 14px; padding-top: 12px; border-top: 1px solid #f3f4f6; }
    .print-step h3 { font-size: 14px; font-weight: 600; color: #0e7490; margin: 0 0 6px 0; }
    .print-step-desc { font-size: 13px; line-height: 1.5; color: #4b5563; white-space: pre-wrap; }
    .print-step-desc :deep(p) { margin: 0 0 0.5rem 0; }
    .print-step-desc :deep(ul), .print-step-desc :deep(ol) { margin: 0.5rem 0; padding-left: 1.25rem; }
    .print-step-desc :deep(img) { max-width: 100%; height: auto; display: block; margin: 0.5rem 0; border-radius: 6px; }
    .step-desc-readonly { white-space: normal; }
    .step-desc-readonly :deep(img) { max-width: 100%; height: auto; display: block; margin: 0.5rem 0; border-radius: 6px; }
    .print-body { line-height: 1.6; color: #374151; }
    .rich-print-body h1 { font-size: 16px; font-weight: 700; margin: 0.75rem 0 0.5rem 0; }
    .rich-print-body h2 { font-size: 14px; font-weight: 600; margin: 0.5rem 0 0.35rem 0; }
    .rich-print-body h3 { font-size: 13px; font-weight: 600; margin: 0.5rem 0 0.35rem 0; }
    .rich-print-body table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; font-size: 12px; }
    .rich-print-body th, .rich-print-body td { border: 1px solid #e5e7eb; padding: 6px 8px; }
    .rich-print-body th { background: #f9fafb; font-weight: 600; }
    .print-content table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
    .print-content table th, .print-content table td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
    .print-content table th { background: #f9fafb; font-weight: 600; color: #374151; }
    .print-footer { margin-top: 24px; padding-top: 12px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .print-only-page { min-height: 100vh; background: white; padding: 20px; }
    @media print {
      @page { size: auto; margin: 10mm; }
      body * { visibility: hidden !important; }
      .page-container .print-area,
      .page-container .print-area *,
      .print-only-page .print-area,
      .print-only-page .print-area * { visibility: visible !important; }
      .page-container > *:not(.print-area) { display: none !important; }
      .print-only-page > *:not(.print-area) { display: none !important; }
      .print-area { position: static !important; left: auto !important; top: auto !important; width: 100% !important; max-width: none !important; padding: 15mm !important; margin: 0 !important; background: white !important; overflow: visible !important; height: auto !important; min-height: auto !important; }
      .print-content { overflow: visible !important; height: auto !important; }
    }
  `]
})
export class TechDocumentEditorComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private demandService = inject(DemandService);
  private techService = inject(TechDocumentService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  loading = signal(true);
  docId = signal<string | null>(null);
  demandId = signal<string | null>(null);
  demandSearch = signal('');
  demandDropdownOpen = signal(false);
  viewMode = signal(false);
  printOnlyMode = signal(false);

  title = '';
  summaryValue = '';
  impactedRepos = signal<ImpactedRepo[]>([]);
  generalObservationsValue = '';
  keyMappings = signal<TechKeyMapping[]>([]);
  steps = signal<TechDocumentStep[]>([]);
  /** Conteúdo legado (documentos antigos sem steps) */
  legacyContentValue = '';

  private routeParamSub?: Subscription;

  readonly ambienteOptions = AMBIENTE_OPTIONS;

  isNew = computed(() => !this.docId());
  demand = computed(() => {
    const id = this.demandId();
    return id ? this.demandService.demands().find((d) => d.id === id) ?? null : null;
  });

  summary = computed(() => this.summaryValue.trim());
  generalObservations = computed(() => this.generalObservationsValue.trim());
  hasImpactedReposForPrint = (): boolean =>
    this.impactedRepos().some((r) => Boolean(r.name?.trim() || r.link?.trim() || r.stack?.trim()));

  sortedSteps = computed(() => {
    const list = [...this.steps()];
    list.sort((a, b) => a.order - b.order);
    return list;
  });

  /** Conteúdo legado existe quando não há passos e há content salvo */
  legacyContent = computed(() => {
    const steps = this.steps();
    const legacy = this.legacyContentValue.trim();
    return steps.length === 0 && legacy.length > 0;
  });

  printDate = () => new Date().toLocaleString('pt-BR');
  printFooterLine = (): string => {
    const date = this.printDate();
    const u = this.authService.user();
    const userLabel = u?.displayName?.trim() || u?.email || '';
    return userLabel ? `Gerado em ${date} · Usuário: ${userLabel}` : `Gerado em ${date}`;
  };

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
    this.routeParamSub = this.route.paramMap.subscribe((paramMap) => {
      const id = paramMap.get('id');
      const segments = this.route.snapshot.url;
      const lastSegment = segments[segments.length - 1]?.path;
      const isNewRoute = lastSegment === 'novo';
      const demandIdFromQuery = this.route.snapshot.queryParamMap.get('demandId');

      if (!isNewRoute && id) {
        this.docId.set(id);
        this.loadDoc(id);
      } else {
        this.docId.set(null);
        this.demandId.set(demandIdFromQuery ?? null);
        this.loading.set(false);
        this.title = '';
        this.summaryValue = '';
        this.impactedRepos.set([]);
        this.generalObservationsValue = '';
        this.keyMappings.set([]);
        this.steps.set([]);
        this.legacyContentValue = '';
        if (this.keyMappings().length === 0) this.addKeyMapping();
        if (this.steps().length === 0) this.addStep();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeParamSub?.unsubscribe();
  }

  private async loadDoc(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const doc = await this.techService.getById(id);
      if (!doc) {
        this.router.navigate(['/documentos/tech']);
        return;
      }
      this.demandId.set(doc.demandId);
      this.title = doc.title ?? '';
      this.summaryValue = doc.summary ?? '';
      this.impactedRepos.set(Array.isArray(doc.impactedRepos) && doc.impactedRepos.length > 0
        ? doc.impactedRepos.map((r) => ({ ...r }))
        : []);
      this.generalObservationsValue = doc.generalObservations ?? '';
      this.keyMappings.set(doc.keyMappings?.length ? [...doc.keyMappings] : []);
      this.steps.set(doc.steps?.length ? doc.steps.map((s) => ({ ...s })) : []);
      this.legacyContentValue = doc.content ?? '';
      if (this.keyMappings().length === 0) this.addKeyMapping();
      if (this.steps().length === 0 && !(doc.content ?? '').trim()) this.addStep();
      const viewOnly = this.route.snapshot.queryParamMap.get('view') === '1';
      const printParam = this.route.snapshot.queryParamMap.get('print') === '1';
      this.viewMode.set(viewOnly);
      if (printParam) {
        this.printOnlyMode.set(true);
        setTimeout(() => window.print(), 600);
      }
    } catch {
      this.router.navigate(['/documentos/tech']);
    } finally {
      this.loading.set(false);
    }
  }

  addKeyMapping(): void {
    this.keyMappings.update((list) => [...list, this.techService.createKeyMapping()]);
  }

  removeKeyMapping(row: TechKeyMapping): void {
    this.keyMappings.update((list) => list.filter((r) => r.id !== row.id));
  }

  addImpactedRepo(): void {
    this.impactedRepos.update((list) => [...list, this.techService.createImpactedRepo()]);
  }

  removeImpactedRepo(row: ImpactedRepo): void {
    this.impactedRepos.update((list) => list.filter((r) => r.id !== row.id));
  }

  addStep(): void {
    const list = this.steps();
    const nextOrder = list.length === 0 ? 1 : Math.max(...list.map((s) => s.order), 0) + 1;
    this.steps.update((l) => [...l, this.techService.createStep(nextOrder)]);
  }

  removeStep(step: TechDocumentStep): void {
    this.steps.update((list) => list.filter((s) => s.id !== step.id));
    const list = this.steps();
    list.forEach((s, i) => {
      s.order = i + 1;
    });
  }

  hasKeyMappingsForPrint(): boolean {
    return this.keyMappings().some((r) => Boolean(r.key || r.value || r.ambiente));
  }

  stepDescriptionTrusted(step: TechDocumentStep): SafeHtml {
    const html = step.description || '';
    const sanitized = html.includes('<') ? sanitizeStepHtml(html) : html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }

  trustedLegacyContent(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.legacyContentValue || '');
  }

  switchToEditMode(): void {
    this.viewMode.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: null },
      queryParamsHandling: 'merge'
    });
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

  async save(): Promise<void> {
    const id = this.docId();
    const stepsList = this.sortedSteps();
    const payload = {
      title: this.title.trim() || 'Sem título',
      summary: this.summaryValue.trim(),
      impactedRepos: this.impactedRepos().filter((r) => r.name?.trim() || r.link?.trim() || r.stack?.trim()),
      generalObservations: this.generalObservationsValue.trim(),
      keyMappings: this.keyMappings().filter((r) => r.key || r.value || r.ambiente),
      steps: stepsList,
      content: this.legacyContentValue,
      demandId: this.demandId()
    };
    if (id) {
      await this.techService.update(id, payload);
      this.router.navigate(['/documentos/tech']);
    } else {
      const newId = await this.techService.create(payload);
      this.router.navigate(['/documentos-tech', newId], { queryParams: { view: '1' } });
    }
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
