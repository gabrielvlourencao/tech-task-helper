import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DemandService } from '../../core';
import { HeaderComponent } from '../../components/header/header.component';

interface ReportItem {
  id: string;
  text: string;
  sistema?: string;
  demandCode?: string;
}

interface GroupedReport {
  sistema: string;
  demands: {
    code: string;
    items: ReportItem[];
  }[];
}

// Entrada de histórico de daily - cada entrada representa uma daily específica
interface DailyEntry {
  targetDate: string;      // Data da daily (dia seguinte ao trabalho)
  workDate: string;        // Data em que as tarefas foram feitas
  reportItems: ReportItem[];
  comments: { id: string; text: string }[];
}

// Histórico completo de dailies (máximo 3 dias)
interface DailyHistory {
  entries: DailyEntry[];
}

@Component({
  selector: 'app-daily-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  template: `
    <div class="report-container">
      <app-header />
      
      <main class="main-content">
        <div class="content-header">
          <div class="header-left">
            <a routerLink="/" class="back-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </a>
            <h2>Daily Report</h2>
            <span class="report-date" [class.editable]="isEditableDate()">{{ selectedDateLabel() }}</span>
          </div>
          
          <!-- Seletor de datas do histórico -->
          @if (dailyHistory().length > 1) {
            <div class="date-selector">
              @for (entry of dailyHistory(); track entry.targetDate) {
                <button 
                  class="date-btn" 
                  [class.active]="selectedDate() === entry.targetDate"
                  (click)="selectDate(entry.targetDate)">
                  {{ getDateLabel(entry.targetDate) }}
                  <span class="item-count">{{ entry.reportItems.length + entry.comments.length }}</span>
                </button>
              }
            </div>
          }
          <div class="header-actions">
            <button class="btn-icon" (click)="refreshFromTasks()" [disabled]="!isEditableDate()" title="Atualizar das tarefas">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                <path d="M16 16h5v5"/>
              </svg>
            </button>
            <button class="btn-copy" (click)="copyReport()" [disabled]="!hasContent()">
              @if (copied()) {
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              }
            </button>
          </div>
        </div>

        @if (!isEditableDate()) {
          <div class="readonly-notice">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Visualizando histórico (somente leitura). Para editar, selecione a daily de amanhã.</span>
          </div>
        }

        <div class="report-layout">
          <!-- Report Principal (Preview) -->
          <div class="report-main">
            <div class="report-preview-card">
              <pre class="report-text">{{ generateReportText() }}</pre>
            </div>
          </div>

          <!-- Sidebar - Edição -->
          <div class="report-sidebar">
            <!-- Tarefas Editáveis -->
            <div class="sidebar-section">
              <div class="section-header-mini">
                <span>✅ Tarefas ({{ taskCount() }})</span>
                @if (isEditableDate()) {
                  <button class="btn-clear" (click)="clearAllTasks()" title="Limpar todas">×</button>
                }
              </div>
              <div class="tasks-edit-section">
                @if (groupedReports().length > 0) {
                  @for (group of groupedReports(); track group.sistema) {
                    <div class="edit-group">
                      <div class="edit-group-header">
                        <span class="group-sistema">{{ group.sistema }}</span>
                      </div>
                      @for (demand of group.demands; track demand.code) {
                        <div class="edit-demand">
                          <span class="edit-demand-code">{{ demand.code }}</span>
                          <div class="edit-tasks">
                            @for (item of demand.items; track item.id) {
                              <div class="edit-task-item">
                                @if (editingId() === item.id && isEditableDate()) {
                                  <input 
                                    type="text" 
                                    class="edit-input"
                                    [value]="item.text"
                                    (blur)="saveEdit($event, item)"
                                    (keydown.enter)="saveEdit($event, item)"
                                    (keydown.escape)="editingId.set(null)">
                                } @else {
                                  <span class="edit-task-text" [class.readonly]="!isEditableDate()" (dblclick)="isEditableDate() && editingId.set(item.id)">{{ item.text }}</span>
                                }
                                @if (isEditableDate()) {
                                  <button class="btn-remove-task" (click)="removeTask(item.id)" title="Remover">×</button>
                                }
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                } @else {
                  <p class="empty-text">Nenhuma tarefa no report</p>
                }
              </div>
            </div>

            <!-- Comentários/Observações -->
            <div class="sidebar-section">
              <div class="section-header-mini">
                <span>💬 Observações</span>
              </div>
              <div class="comments-section">
                @for (comment of comments(); track comment.id) {
                  <div class="comment-item">
                    @if (editingId() === comment.id && isEditableDate()) {
                      <input 
                        type="text" 
                        class="edit-input"
                        [value]="comment.text"
                        (blur)="saveCommentEdit($event, comment)"
                        (keydown.enter)="saveCommentEdit($event, comment)"
                        (keydown.escape)="editingId.set(null)">
                    } @else {
                      <span class="comment-text" [class.readonly]="!isEditableDate()" (dblclick)="isEditableDate() && editingId.set(comment.id)">{{ comment.text }}</span>
                    }
                    @if (isEditableDate()) {
                      <button class="btn-remove-mini" (click)="removeComment(comment.id)">×</button>
                    }
                  </div>
                }
                @if (isEditableDate()) {
                  <div class="add-comment">
                    <input 
                      type="text" 
                      placeholder="Adicionar observação..."
                      [ngModel]="newComment()"
                      (ngModelChange)="newComment.set($event)"
                      (keydown.enter)="addComment()">
                    <button class="btn-add-mini" (click)="addComment()" [disabled]="!newComment().trim()">+</button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .report-container {
      min-height: 100vh;
      background: #f3f4f6;
    }

    .main-content {
      max-width: 1000px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .back-link {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      color: #6b7280;
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .back-link:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .header-left h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .report-date {
      background: #eef2ff;
      color: #667eea;
      padding: 0.25rem 0.625rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .report-date.editable {
      background: #d1fae5;
      color: #059669;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
    }
    
    /* Seletor de datas */
    .date-selector {
      display: flex;
      gap: 0.375rem;
      margin-left: auto;
      margin-right: 0.5rem;
    }
    
    .date-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 0.75rem;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .date-btn:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
    }
    
    .date-btn.active {
      background: #667eea;
      border-color: #667eea;
      color: white;
    }
    
    .date-btn .item-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 0.25rem;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 9px;
      font-size: 0.65rem;
      font-weight: 600;
    }
    
    .date-btn.active .item-count {
      background: rgba(255, 255, 255, 0.25);
    }
    
    /* Aviso de modo somente leitura */
    .readonly-notice {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.875rem;
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-size: 0.8rem;
      color: #92400e;
    }
    
    .readonly-notice svg {
      flex-shrink: 0;
    }

    .btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-icon:hover:not(:disabled) {
      background: #f3f4f6;
      color: #374151;
    }
    
    .btn-icon:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .btn-copy {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      background: #667eea;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-copy:hover:not(:disabled) {
      background: #5a67d8;
    }

    .btn-copy:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Layout */
    .report-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 1rem;
    }

    /* Report Principal */
    .report-main {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .report-preview-card {
      padding: 1.25rem;
    }

    .report-text {
      margin: 0;
      font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
      font-size: 0.8rem;
      color: #374151;
      white-space: pre-wrap;
      line-height: 1.7;
    }

    /* Sidebar */
    .report-sidebar {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .sidebar-section {
      background: white;
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .section-header-mini {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.625rem 0.75rem;
      background: #f9fafb;
      font-size: 0.8rem;
      font-weight: 500;
      color: #374151;
      border-bottom: 1px solid #f3f4f6;
    }

    .btn-clear {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: transparent;
      border: none;
      color: #9ca3af;
      font-size: 1rem;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .btn-clear:hover {
      background: #fef2f2;
      color: #dc2626;
    }

    /* Tarefas Editáveis */
    .tasks-edit-section {
      padding: 0.5rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .edit-group {
      margin-bottom: 0.75rem;
    }

    .edit-group:last-child {
      margin-bottom: 0;
    }

    .edit-group-header {
      padding: 0.25rem 0.5rem;
      margin-bottom: 0.25rem;
    }

    .group-sistema {
      font-size: 0.7rem;
      font-weight: 600;
      color: #7c3aed;
      background: #f3e8ff;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    .edit-demand {
      background: #f9fafb;
      border-radius: 6px;
      padding: 0.5rem;
      margin-bottom: 0.375rem;
    }

    .edit-demand:last-child {
      margin-bottom: 0;
    }

    .edit-demand-code {
      display: block;
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.65rem;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 0.375rem;
    }

    .edit-tasks {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .edit-task-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.375rem;
      background: white;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }

    .edit-task-item:hover {
      border-color: #d1d5db;
    }

    .edit-task-text {
      flex: 1;
      font-size: 0.7rem;
      color: #374151;
      cursor: text;
      padding: 0.125rem 0;
    }

    .edit-task-text:hover:not(.readonly) {
      color: #667eea;
    }
    
    .edit-task-text.readonly {
      cursor: default;
    }

    .edit-input {
      flex: 1;
      font-size: 0.7rem;
      padding: 0.25rem 0.375rem;
      border: 1px solid #667eea;
      border-radius: 4px;
      outline: none;
    }

    .btn-remove-task {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      background: transparent;
      border: none;
      color: #d1d5db;
      font-size: 0.8rem;
      cursor: pointer;
      border-radius: 3px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .edit-task-item:hover .btn-remove-task {
      color: #9ca3af;
    }

    .btn-remove-task:hover {
      background: #fef2f2;
      color: #dc2626;
    }

    .empty-text {
      font-size: 0.75rem;
      color: #9ca3af;
      text-align: center;
      margin: 0;
      padding: 1rem 0;
    }

    /* Comentários */
    .comments-section {
      padding: 0.5rem 0.75rem 0.75rem;
    }

    .comment-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.5rem;
      background: #f9fafb;
      border-radius: 6px;
      margin-bottom: 0.375rem;
    }

    .comment-item:last-of-type {
      margin-bottom: 0;
    }

    .comment-text {
      flex: 1;
      font-size: 0.75rem;
      color: #374151;
      cursor: text;
    }

    .comment-text:hover:not(.readonly) {
      color: #667eea;
    }
    
    .comment-text.readonly {
      cursor: default;
    }

    .btn-remove-mini {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: transparent;
      border: none;
      color: #d1d5db;
      font-size: 0.9rem;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .comment-item:hover .btn-remove-mini {
      color: #9ca3af;
    }

    .btn-remove-mini:hover {
      background: #fef2f2;
      color: #dc2626;
    }

    .add-comment {
      display: flex;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .add-comment input {
      flex: 1;
      padding: 0.5rem 0.625rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 0.75rem;
      transition: all 0.2s ease;
    }

    .add-comment input:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn-add-mini {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      padding: 0;
      background: #667eea;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-add-mini:hover:not(:disabled) {
      background: #5a67d8;
    }

    .btn-add-mini:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .main-content {
        padding: 1rem;
      }

      .report-layout {
        grid-template-columns: 1fr;
      }

      .report-sidebar {
        order: -1;
      }

      .tasks-edit-section {
        max-height: 200px;
      }
    }
  `]
})
export class DailyReportComponent implements OnInit {
  private demandService = inject(DemandService);

  demands = this.demandService.demands;
  copied = signal(false);
  editingId = signal<string | null>(null);
  newComment = signal('');

  // Histórico de dailies (máximo 3 dias)
  dailyHistory = signal<DailyEntry[]>([]);
  
  // Data selecionada para visualização (targetDate)
  selectedDate = signal<string>(this.getTargetDate());
  
  // Itens do report (computed baseado na data selecionada)
  reportItems = signal<ReportItem[]>([]);
  comments = signal<{ id: string; text: string }[]>([]);
  
  // Datas disponíveis no histórico para navegação
  availableDates = computed(() => {
    return this.dailyHistory().map(entry => entry.targetDate);
  });

  ngOnInit(): void {
    this.loadFromStorage();
    this.loadSelectedDateData();
    this.refreshFromTasks();
  }
  
  // Retorna a data alvo (amanhã) - quando você vai reportar na daily
  private getTargetDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toDateString();
  }
  
  // Retorna a data de trabalho (hoje) - quando você está fazendo as tarefas
  private getWorkDate(): string {
    return new Date().toDateString();
  }
  
  // Formata uma data para exibição curta (dd/mm)
  formatDateShort(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  
  // Formata uma data para exibição longa
  formatDateLong(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  
  // Verifica se a data selecionada é a data alvo (editável)
  isEditableDate(): boolean {
    return this.selectedDate() === this.getTargetDate();
  }
  
  // Carrega os dados da data selecionada
  loadSelectedDateData(): void {
    const entry = this.dailyHistory().find(e => e.targetDate === this.selectedDate());
    if (entry) {
      this.reportItems.set([...entry.reportItems]);
      this.comments.set([...entry.comments]);
    } else {
      this.reportItems.set([]);
      this.comments.set([]);
    }
  }
  
  // Muda para uma data específica do histórico
  selectDate(dateString: string): void {
    this.selectedDate.set(dateString);
    this.loadSelectedDateData();
  }
  
  // Retorna o label para a data (Hoje, Amanhã, ou data formatada)
  getDateLabel(dateString: string): string {
    const today = new Date().toDateString();
    const tomorrow = this.getTargetDate();
    
    if (dateString === today) return 'Hoje';
    if (dateString === tomorrow) return 'Amanhã';
    return this.formatDateShort(dateString);
  }

  // Data selecionada formatada curta (dd/mm)
  selectedDateShort = computed(() => {
    return this.formatDateShort(this.selectedDate());
  });

  // Data selecionada formatada longa
  selectedDateFormatted = computed(() => {
    return this.formatDateLong(this.selectedDate());
  });
  
  // Label da data selecionada (para o header)
  selectedDateLabel = computed(() => {
    const today = new Date().toDateString();
    const tomorrow = this.getTargetDate();
    const selected = this.selectedDate();
    
    if (selected === tomorrow) return `Daily para ${this.formatDateShort(selected)} (amanhã)`;
    if (selected === today) return `Daily de ${this.formatDateShort(selected)} (hoje)`;
    return `Daily de ${this.formatDateShort(selected)}`;
  });

  taskCount = computed(() => this.reportItems().length);

  hasContent = computed(() => 
    this.reportItems().length > 0 || this.comments().length > 0
  );

  // Agrupa tarefas por Sistema e Demanda
  groupedReports = computed((): GroupedReport[] => {
    const items = this.reportItems();
    const grouped = new Map<string, Map<string, ReportItem[]>>();

    items.forEach(item => {
      const sistema = item.sistema || 'Outros';
      const demandCode = item.demandCode || '-';

      if (!grouped.has(sistema)) {
        grouped.set(sistema, new Map());
      }

      const sistemaDemands = grouped.get(sistema)!;
      if (!sistemaDemands.has(demandCode)) {
        sistemaDemands.set(demandCode, []);
      }

      sistemaDemands.get(demandCode)!.push(item);
    });

    const result: GroupedReport[] = [];
    grouped.forEach((demands, sistema) => {
      const demandList: { code: string; items: ReportItem[] }[] = [];
      demands.forEach((items, code) => {
        demandList.push({ code, items });
      });
      result.push({ sistema, demands: demandList });
    });

    return result.sort((a, b) => a.sistema.localeCompare(b.sistema));
  });

  refreshFromTasks(): void {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const newItems: ReportItem[] = [];

    this.demands().forEach(demand => {
      const sistema = demand.customFields.find(f => f.name === 'Sistema')?.value || 'Outros';

      demand.tasks.forEach(task => {
        if (task.completed && demand.updatedAt >= oneDayAgo) {
          const exists = this.reportItems().some(
            i => i.demandCode === demand.code && i.text === task.title
          );

          if (!exists) {
            newItems.push({
              id: this.generateId(),
              text: task.title,
              sistema,
              demandCode: demand.code
            });
          }
        }
      });
    });

    const existing = this.reportItems();
    this.reportItems.set([...existing, ...newItems]);
    this.saveToStorage();
  }

  // Edição de tarefas
  saveEdit(event: Event, item: ReportItem): void {
    const input = event.target as HTMLInputElement;
    const newText = input.value.trim();

    if (newText && newText !== item.text) {
      this.reportItems.update(items =>
        items.map(i => i.id === item.id ? { ...i, text: newText } : i)
      );
      this.saveToStorage();
    }

    this.editingId.set(null);
  }

  removeTask(id: string): void {
    this.reportItems.update(items => items.filter(i => i.id !== id));
    this.saveToStorage();
  }

  clearAllTasks(): void {
    if (confirm('Limpar todas as tarefas do report?')) {
      this.reportItems.set([]);
      this.saveToStorage();
    }
  }

  // Comentários
  addComment(): void {
    const text = this.newComment().trim();
    if (!text) return;

    this.comments.update(items => [...items, { id: this.generateId(), text }]);
    this.newComment.set('');
    this.saveToStorage();
  }

  saveCommentEdit(event: Event, comment: { id: string; text: string }): void {
    const input = event.target as HTMLInputElement;
    const newText = input.value.trim();

    if (newText && newText !== comment.text) {
      this.comments.update(items =>
        items.map(i => i.id === comment.id ? { ...i, text: newText } : i)
      );
      this.saveToStorage();
    }

    this.editingId.set(null);
  }

  removeComment(id: string): void {
    this.comments.update(items => items.filter(i => i.id !== id));
    this.saveToStorage();
  }

  generateReportText(): string {
    const groups = this.groupedReports();
    const commentsList = this.comments();

    if (groups.length === 0 && commentsList.length === 0) {
      return '📋 Daily Report\n\nNenhuma atividade registrada.';
    }

    let report = `📋 Daily Report - ${this.selectedDateFormatted()}\n`;
    report += `${'─'.repeat(40)}\n\n`;

    if (groups.length > 0) {
      groups.forEach(group => {
        report += `📦 ${group.sistema}\n`;
        group.demands.forEach(demand => {
          report += `   ${demand.code}\n`;
          demand.items.forEach(item => {
            report += `   • ${item.text}\n`;
          });
        });
        report += '\n';
      });
    }

    if (commentsList.length > 0) {
      report += `💬 Observações\n`;
      commentsList.forEach(comment => {
        report += `   • ${comment.text}\n`;
      });
    }

    return report.trim();
  }

  async copyReport(): Promise<void> {
    const report = this.generateReportText();
    if (!this.hasContent()) return;

    try {
      await navigator.clipboard.writeText(report);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private saveToStorage(): void {
    const targetDate = this.getTargetDate();
    const workDate = this.getWorkDate();
    
    // Atualiza ou cria a entrada para a data alvo
    const history = [...this.dailyHistory()];
    const existingIndex = history.findIndex(e => e.targetDate === targetDate);
    
    const newEntry: DailyEntry = {
      targetDate,
      workDate,
      reportItems: this.reportItems(),
      comments: this.comments()
    };
    
    if (existingIndex >= 0) {
      history[existingIndex] = newEntry;
    } else {
      history.push(newEntry);
    }
    
    // Remove entradas com mais de 3 dias
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const filteredHistory = history.filter(entry => {
      const entryDate = new Date(entry.targetDate);
      return entryDate >= threeDaysAgo;
    });
    
    // Mantém no máximo 3 entradas (as mais recentes)
    const sortedHistory = filteredHistory
      .sort((a, b) => new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime())
      .slice(0, 3);
    
    this.dailyHistory.set(sortedHistory);
    
    localStorage.setItem('dailyHistory', JSON.stringify({ entries: sortedHistory }));
  }

  private loadFromStorage(): void {
    // Tenta carregar o novo formato (dailyHistory)
    const storedHistory = localStorage.getItem('dailyHistory');
    if (storedHistory) {
      try {
        const data: DailyHistory = JSON.parse(storedHistory);
        if (data.entries && Array.isArray(data.entries)) {
          // Limpa entradas antigas (mais de 3 dias)
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          
          const validEntries = data.entries.filter(entry => {
            const entryDate = new Date(entry.targetDate);
            return entryDate >= threeDaysAgo;
          });
          
          this.dailyHistory.set(validEntries);
          
          // Define a data selecionada como a mais relevante
          // Prioridade: hoje (para reportar) > amanhã (para editar)
          const today = new Date().toDateString();
          const tomorrow = this.getTargetDate();
          
          const todayEntry = validEntries.find(e => e.targetDate === today);
          const tomorrowEntry = validEntries.find(e => e.targetDate === tomorrow);
          
          if (todayEntry) {
            this.selectedDate.set(today);
          } else if (tomorrowEntry) {
            this.selectedDate.set(tomorrow);
          } else if (validEntries.length > 0) {
            // Seleciona a entrada mais recente
            const sorted = [...validEntries].sort((a, b) => 
              new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime()
            );
            this.selectedDate.set(sorted[0].targetDate);
          } else {
            // Nenhuma entrada, usa amanhã como padrão
            this.selectedDate.set(tomorrow);
          }
          
          return;
        }
      } catch {
        // Ignore invalid data
      }
    }
    
    // Migração: tenta carregar o formato antigo (dailyReport)
    const storedOld = localStorage.getItem('dailyReport');
    if (storedOld) {
      try {
        const data = JSON.parse(storedOld);
        if (data.date && data.reportItems) {
          // Converte para o novo formato
          // O formato antigo usa data de hoje, mas na nova lógica seria para amanhã
          const targetDate = this.getTargetDate();
          const entry: DailyEntry = {
            targetDate,
            workDate: data.date,
            reportItems: data.reportItems || [],
            comments: data.comments || []
          };
          
          this.dailyHistory.set([entry]);
          this.selectedDate.set(targetDate);
          
          // Migra para o novo formato e remove o antigo
          localStorage.setItem('dailyHistory', JSON.stringify({ entries: [entry] }));
          localStorage.removeItem('dailyReport');
        }
      } catch {
        // Ignore invalid data
      }
    }
  }
}
