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
            <span class="report-date">{{ todayShort() }}</span>
          </div>
          <div class="header-actions">
            <button class="btn-icon" (click)="refreshFromTasks()" title="Atualizar das tarefas">
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
                <button class="btn-clear" (click)="clearAllTasks()" title="Limpar todas">×</button>
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
                                @if (editingId() === item.id) {
                                  <input 
                                    type="text" 
                                    class="edit-input"
                                    [value]="item.text"
                                    (blur)="saveEdit($event, item)"
                                    (keydown.enter)="saveEdit($event, item)"
                                    (keydown.escape)="editingId.set(null)">
                                } @else {
                                  <span class="edit-task-text" (dblclick)="editingId.set(item.id)">{{ item.text }}</span>
                                }
                                <button class="btn-remove-task" (click)="removeTask(item.id)" title="Remover">×</button>
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
                    @if (editingId() === comment.id) {
                      <input 
                        type="text" 
                        class="edit-input"
                        [value]="comment.text"
                        (blur)="saveCommentEdit($event, comment)"
                        (keydown.enter)="saveCommentEdit($event, comment)"
                        (keydown.escape)="editingId.set(null)">
                    } @else {
                      <span class="comment-text" (dblclick)="editingId.set(comment.id)">{{ comment.text }}</span>
                    }
                    <button class="btn-remove-mini" (click)="removeComment(comment.id)">×</button>
                  </div>
                }
                <div class="add-comment">
                  <input 
                    type="text" 
                    placeholder="Adicionar observação..."
                    [ngModel]="newComment()"
                    (ngModelChange)="newComment.set($event)"
                    (keydown.enter)="addComment()">
                  <button class="btn-add-mini" (click)="addComment()" [disabled]="!newComment().trim()">+</button>
                </div>
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

    .header-actions {
      display: flex;
      gap: 0.5rem;
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

    .btn-icon:hover {
      background: #f3f4f6;
      color: #374151;
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

    .edit-task-text:hover {
      color: #667eea;
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

    .comment-text:hover {
      color: #667eea;
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

  // Itens do report
  reportItems = signal<ReportItem[]>([]);
  comments = signal<{ id: string; text: string }[]>([]);

  ngOnInit(): void {
    this.loadFromStorage();
    this.refreshFromTasks();
  }

  todayShort = computed(() => {
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: '2-digit'
    };
    return new Date().toLocaleDateString('pt-BR', options);
  });

  todayFormatted = computed(() => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long'
    };
    return new Date().toLocaleDateString('pt-BR', options);
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

    let report = `📋 Daily Report - ${this.todayFormatted()}\n`;
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
    const data = {
      date: new Date().toDateString(),
      reportItems: this.reportItems(),
      comments: this.comments()
    };
    localStorage.setItem('dailyReport', JSON.stringify(data));
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem('dailyReport');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.date === new Date().toDateString()) {
          this.reportItems.set(data.reportItems || []);
          this.comments.set(data.comments || []);
        }
      } catch {
        // Ignore invalid data
      }
    }
  }
}
