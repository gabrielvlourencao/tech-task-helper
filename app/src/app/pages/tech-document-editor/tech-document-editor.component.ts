import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  viewChild,
  ElementRef,
  effect,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { DemandService, TechDocumentService } from '../../core';
import { HeaderComponent } from '../../components/header/header.component';
import type { Demand } from '../../core/models/demand.model';

@Component({
  selector: 'app-tech-document-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (printOnlyMode()) {
      <div class="print-only-page">
        <div class="print-area print-visible" [attr.aria-hidden]="false">
          <div class="print-content">
            <h1>Documento Técnico</h1>
            <p class="print-title">{{ title }}</p>
            @if (demand()) {
              <p class="print-demand">Demanda: {{ demand()!.code }} – {{ demand()!.title }}</p>
            } @else {
              <p class="print-demand">Sem demanda vinculada</p>
            }
            <section class="print-section">
              <div class="print-body rich-print-body" [innerHTML]="trustedContent()"></div>
            </section>
            <p class="print-footer">Gerado em {{ printDate() }}</p>
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
              <label for="doc-title">Título</label>
              <input id="doc-title" type="text" class="form-control" [(ngModel)]="title" name="title" placeholder="Ex: Desenho de solução - Integração X" [disabled]="viewMode()" />
            </section>
            <section class="form-section">
              <label for="doc-content">Conteúdo</label>
              <p class="hint">Use a barra de ferramentas: negrito, itálico, sublinhado e títulos (H1/H2/H3).</p>
              @if (viewMode()) {
                <div class="rich-view rich-editor-content form-control form-control-rich" [innerHTML]="trustedContent()" id="doc-content-view"></div>
              } @else {
                <div #toolbarRef class="rich-toolbar" role="toolbar" aria-label="Formatação do texto">
                  <button type="button" class="toolbar-btn" (mousedown)="keepFocus($event)" (click)="execCmd('bold')" title="Negrito (Ctrl+B)" aria-label="Negrito">
                    <strong>B</strong>
                  </button>
                  <button type="button" class="toolbar-btn" (mousedown)="keepFocus($event)" (click)="execCmd('italic')" title="Itálico" aria-label="Itálico">
                    <em>I</em>
                  </button>
                  <button type="button" class="toolbar-btn" (mousedown)="keepFocus($event)" (click)="execCmd('underline')" title="Sublinhado" aria-label="Sublinhado">
                    <span class="underline">S</span>
                  </button>
                  <span class="toolbar-sep" aria-hidden="true"></span>
                  <button type="button" class="toolbar-btn" (mousedown)="keepFocus($event)" (click)="execCmd('formatBlock', 'h1')" title="Título 1" aria-label="Título 1">H1</button>
                  <button type="button" class="toolbar-btn" (mousedown)="keepFocus($event)" (click)="execCmd('formatBlock', 'h2')" title="Título 2" aria-label="Título 2">H2</button>
                  <button type="button" class="toolbar-btn" (mousedown)="keepFocus($event)" (click)="execCmd('formatBlock', 'h3')" title="Título 3" aria-label="Título 3">H3</button>
                </div>
                <div
                  #editorEl
                  class="rich-editor form-control form-control-rich rich-editor-content"
                  contenteditable="true"
                  data-placeholder="Digite o conteúdo do documento..."
                  role="textbox"
                  aria-label="Conteúdo do documento"
                  (input)="onContentInput()"
                  (blur)="onContentBlur()"
                ></div>
              }
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

        @if (docId() || title || content) {
          <div #printArea class="print-area" [attr.aria-hidden]="true">
            <div class="print-content">
              <h1>Documento Técnico</h1>
              <p class="print-title">{{ title || 'Sem título' }}</p>
              @if (demand()) {
                <p class="print-demand">Demanda: {{ demand()!.code }} – {{ demand()!.title }}</p>
              } @else {
                <p class="print-demand">Sem demanda vinculada</p>
              }
              <section class="print-section">
                <div class="print-body rich-print-body" [innerHTML]="trustedContent()"></div>
              </section>
              <p class="print-footer">Gerado em {{ printDate() }}</p>
            </div>
          </div>
        }
      </main>
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
    .form-section:last-of-type { margin-bottom: 0; }
    .form-section label { display: block; font-size: 0.8rem; font-weight: 500; color: #4b5563; margin-bottom: 0.375rem; }
    .hint { font-size: 0.8rem; color: #6b7280; margin: 0 0 0.75rem 0; }
    .form-control { display: block; width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; line-height: 1.4; color: #1f2937; background: #fff; box-sizing: border-box; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .form-control::placeholder { color: #9ca3af; }
    .form-control:hover { border-color: #9ca3af; }
    .form-control:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2); }
    .form-control:disabled { background: #f3f4f6; color: #6b7280; cursor: not-allowed; }
    .form-control-rich { min-height: 200px; resize: vertical; }
    .rich-view.form-control-rich { overflow-y: auto; }

    .rich-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; padding: 0.5rem; background: #f9fafb; border: 1px solid #e5e7eb; border-bottom: none; border-radius: 8px 8px 0 0; }
    .toolbar-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; padding: 0 0.5rem; border: 1px solid transparent; border-radius: 6px; background: #fff; color: #374151; font-size: 0.875rem; cursor: pointer; transition: all 0.15s; }
    .toolbar-btn:hover { background: #e0f2fe; border-color: #bae6fd; color: #0369a1; }
    .toolbar-btn strong, .toolbar-btn em { font-style: normal; font-weight: 700; }
    .toolbar-btn .underline { text-decoration: underline; }
    .toolbar-sep { width: 1px; height: 20px; background: #e5e7eb; margin: 0 0.25rem; }
    .rich-editor { overflow-y: auto; }
    .rich-editor:empty::before { content: attr(data-placeholder); color: #9ca3af; }
    .rich-editor-content h1 { font-size: 1.5rem; font-weight: 700; color: #0c4a6e; margin: 0 0 0.75rem 0; line-height: 1.3; }
    .rich-editor-content h2 { font-size: 1.25rem; font-weight: 600; color: #0e7490; margin: 1rem 0 0.5rem 0; line-height: 1.35; }
    .rich-editor-content h3 { font-size: 1.1rem; font-weight: 600; color: #374151; margin: 0.75rem 0 0.5rem 0; line-height: 1.4; }
    .rich-editor-content p { margin: 0 0 0.5rem 0; }
    .rich-editor-content ul, .rich-editor-content ol { margin: 0.5rem 0; padding-left: 1.5rem; }
    .rich-editor-content table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 0.875rem; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .rich-editor-content th, .rich-editor-content td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
    .rich-editor-content th { background: #f0f9ff; font-weight: 600; color: #0369a1; }

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
    .print-body { line-height: 1.6; color: #374151; }
    .rich-print-body h1 { font-size: 16px; font-weight: 700; margin: 0.75rem 0 0.5rem 0; }
    .rich-print-body h2 { font-size: 14px; font-weight: 600; margin: 0.5rem 0 0.35rem 0; }
    .rich-print-body h3 { font-size: 13px; font-weight: 600; margin: 0.5rem 0 0.35rem 0; }
    .rich-print-body table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; font-size: 12px; }
    .rich-print-body th, .rich-print-body td { border: 1px solid #e5e7eb; padding: 6px 8px; }
    .rich-print-body th { background: #f9fafb; font-weight: 600; }
    .print-footer { margin-top: 24px; padding-top: 12px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .print-only-page { min-height: 100vh; background: white; padding: 20px; }
    @media print {
      body * { visibility: hidden !important; }
      .page-container .print-area,
      .page-container .print-area *,
      .print-only-page .print-area,
      .print-only-page .print-area * { visibility: visible !important; }
      .page-container > *:not(.print-area) { display: none !important; }
      .print-only-page > *:not(.print-area) { display: none !important; }
      .print-area { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: none !important; padding: 15mm !important; margin: 0 !important; background: white !important; }
    }
  `]
})
export class TechDocumentEditorComponent implements OnInit, AfterViewChecked, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private demandService = inject(DemandService);
  private techService = inject(TechDocumentService);
  private sanitizer = inject(DomSanitizer);

  printAreaRef = viewChild<ElementRef<HTMLDivElement>>('printArea');
  editorEl = viewChild<ElementRef<HTMLDivElement>>('editorEl');
  toolbarRef = viewChild<ElementRef<HTMLElement>>('toolbarRef');
  private toolbarMouseDownBound = this.captureToolbarMouseDown.bind(this);

  loading = signal(true);
  docId = signal<string | null>(null);
  demandId = signal<string | null>(null);
  demandSearch = signal('');
  demandDropdownOpen = signal(false);
  viewMode = signal(false);
  printOnlyMode = signal(false);
  private contentPatched = false;
  /** Seleção salva no mousedown da toolbar para restaurar antes do execCommand. */
  private savedRange: Range | null = null;

  title = '';
  content = '';

  isNew = computed(() => !this.docId());
  demand = computed(() => {
    const id = this.demandId();
    return id ? this.demandService.demands().find((d) => d.id === id) ?? null : null;
  });

  printDate = () => new Date().toLocaleString('pt-BR');

  /** HTML do editor como confiável para exibir listas/tabelas sem o sanitizer remover. */
  trustedContent(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.content || '');
  }

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
      this.demandId.set(demandIdFromQuery ?? null);
      this.loading.set(false);
    }
    document.addEventListener('mousedown', this.toolbarMouseDownBound, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousedown', this.toolbarMouseDownBound, true);
  }

  /** Captura mousedown na toolbar antes do navegador mover o foco; salva seleção e impede default. */
  private captureToolbarMouseDown(e: MouseEvent): void {
    const toolbar = this.toolbarRef()?.nativeElement;
    const editor = this.editorEl()?.nativeElement;
    if (!toolbar?.contains(e.target as Node) || !editor) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        this.savedRange = range.cloneRange();
        e.preventDefault();
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.contentPatched || this.viewMode()) return;
    const el = this.editorEl()?.nativeElement;
    if (el && this.content !== undefined && this.content !== null) {
      const current = el.innerHTML;
      if (current !== this.content) {
        el.innerHTML = this.content || '';
        this.contentPatched = true;
      }
    }
  }

  private async loadDoc(id: string): Promise<void> {
    this.loading.set(true);
    this.contentPatched = false;
    try {
      const doc = await this.techService.getById(id);
      if (!doc) {
        this.router.navigate(['/documentos/tech']);
        return;
      }
      this.demandId.set(doc.demandId);
      this.title = doc.title;
      this.content = doc.content ?? '';
      const viewOnly = this.route.snapshot.queryParamMap.get('view') === '1';
      const printParam = this.route.snapshot.queryParamMap.get('print') === '1';
      this.viewMode.set(viewOnly);
      if (printParam) {
        this.printOnlyMode.set(true);
        setTimeout(() => window.print(), 600);
      }
      setTimeout(() => {
        const editor = this.editorEl()?.nativeElement;
        if (editor && !this.viewMode()) {
          editor.innerHTML = this.content || '';
          this.contentPatched = true;
        }
      }, 0);
    } catch {
      this.router.navigate(['/documentos/tech']);
    } finally {
      this.loading.set(false);
    }
  }

  /** Impede que o botão roube o foco e guarda a seleção atual para restaurar no click. */
  keepFocus(event: MouseEvent): void {
    event.preventDefault();
    const editor = this.editorEl()?.nativeElement;
    const sel = window.getSelection();
    if (editor && sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        this.savedRange = range.cloneRange();
      }
    }
  }

  onContentInput(): void {
    const el = this.editorEl()?.nativeElement;
    if (el) this.content = el.innerHTML;
  }

  onContentBlur(): void {
    const el = this.editorEl()?.nativeElement;
    if (el) this.content = el.innerHTML;
  }

  execCmd(cmd: string, value?: string): void {
    const el = this.editorEl()?.nativeElement;
    if (!el) return;
    const rangeToRestore = this.savedRange?.cloneRange() ?? null;
    this.savedRange = null;
    el.focus();
    setTimeout(() => {
      const sel = window.getSelection();
      if (sel && rangeToRestore) {
        try {
          sel.removeAllRanges();
          sel.addRange(rangeToRestore);
        } catch {
          // range pode estar inválido se o DOM mudou
        }
      }
      document.execCommand(cmd, false, value ?? '');
      this.content = el.innerHTML;
    }, 0);
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
    const el = this.editorEl()?.nativeElement;
    if (el) this.content = el.innerHTML;
    const id = this.docId();
    const payload = {
      title: this.title.trim() || 'Sem título',
      content: this.content,
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
    window.print();
  }
}