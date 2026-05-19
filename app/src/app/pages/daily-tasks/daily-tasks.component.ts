import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, DailyTasksService, DailyTask, todayDateString } from '../../core';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-daily-tasks',
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-container">
      <app-header />

      <main class="main-content">
        <div class="content-header">
          <div class="header-left">
            <a routerLink="/" class="back-link" aria-label="Voltar ao dashboard">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </a>
            <h1>Tarefas do dia</h1>
            <span class="day-badge" [class.today]="isTodaySelected()">{{ selectedDayLabel() }}</span>
          </div>

          @if (dayHistory().length > 1) {
            <div class="day-selector" role="tablist" aria-label="Selecionar dia">
              @for (entry of dayHistory(); track entry.dayDate) {
                <button
                  type="button"
                  role="tab"
                  class="day-btn"
                  [class.active]="selectedDay() === entry.dayDate"
                  [attr.aria-selected]="selectedDay() === entry.dayDate"
                  (click)="selectDay(entry.dayDate)">
                  {{ getDayTabLabel(entry.dayDate) }}
                  <span class="task-count">{{ entry.tasks.length }}</span>
                </button>
              }
            </div>
          }
        </div>

        @if (!isTodaySelected()) {
          <div class="readonly-notice" role="status">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Histórico dos últimos 3 dias (somente leitura). Para editar, selecione hoje.</span>
          </div>
        }

        <div class="progress-card">
          <div class="progress-info">
            <span class="progress-label">Progresso do dia</span>
            <span class="progress-value">{{ doneCount() }}/{{ selectedDayTasks().length }} concluídas</span>
          </div>
          <div class="progress-bar" role="progressbar" [attr.aria-valuenow]="doneCount()" [attr.aria-valuemin]="0" [attr.aria-valuemax]="selectedDayTasks().length || 1">
            <div class="progress-fill" [style.width.%]="progressPercent()"></div>
          </div>
        </div>

        @if (isTodaySelected()) {
          <div class="add-task-bar">
            <input
              type="text"
              class="add-input"
              placeholder="Nova mini tarefa..."
              [ngModel]="newTaskTitle()"
              (ngModelChange)="newTaskTitle.set($event)"
              (keydown.enter)="addTask()"
              aria-label="Título da nova tarefa" />
            <button type="button" class="btn-add" (click)="addTask()" [disabled]="!newTaskTitle().trim()">
              Adicionar
            </button>
          </div>
        }

        <div class="tasks-card">
          @if (sortedTasks().length > 0) {
            <ul class="task-list">
              @for (task of sortedTasks(); track task.id) {
                <li class="task-row" [class.done]="task.status === 'done'">
                  <label class="task-check">
                    <input
                      type="checkbox"
                      [checked]="task.status === 'done'"
                      [disabled]="!isTodaySelected()"
                      (change)="toggleTaskStatus(task)"
                      [attr.aria-label]="'Marcar ' + task.title + ' como concluída'" />
                    <span class="check-ui" aria-hidden="true"></span>
                  </label>

                  <div class="task-body">
                    @if (editingId() === task.id && isTodaySelected()) {
                      <input
                        type="text"
                        class="edit-input"
                        [value]="task.title"
                        (blur)="saveTitleEdit($event, task)"
                        (keydown.enter)="saveTitleEdit($event, task)"
                        (keydown.escape)="editingId.set(null)"
                        aria-label="Editar título da tarefa" />
                    } @else {
                      <span
                        class="task-title"
                        [class.readonly]="!isTodaySelected()"
                        (dblclick)="isTodaySelected() && editingId.set(task.id)">
                        {{ task.title }}
                      </span>
                    }

                    <div class="task-meta">
                      @if (task.demandCode) {
                        <span class="badge badge-demand">{{ task.demandCode }}</span>
                      }
                      @if (task.sistema) {
                        <span class="badge badge-sistema">{{ task.sistema }}</span>
                      }
                      @if (task.source === 'demand') {
                        <span class="badge badge-source">Demanda</span>
                      }
                      @if (task.completedAt) {
                        <span class="badge badge-time" [title]="formatTimeFull(task.completedAt)">
                          {{ formatTimeShort(task.completedAt) }}
                        </span>
                      }
                    </div>
                  </div>

                  @if (isTodaySelected()) {
                    <button
                      type="button"
                      class="btn-remove"
                      (click)="removeTask(task.id)"
                      [attr.aria-label]="'Remover ' + task.title">
                      ×
                    </button>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="empty-state">
              @if (isTodaySelected()) {
                Nenhuma tarefa cadastrada para hoje. Adicione mini tarefas acima ou conclua tarefas nas demandas.
              } @else {
                Nenhuma tarefa registrada neste dia.
              }
            </p>
          }
        </div>

        @if (isTodaySelected() && selectedDayTasks().length > 0) {
          <div class="footer-actions">
            <button type="button" class="btn-clear-all" (click)="clearAll()">
              Limpar todas as tarefas de hoje
            </button>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .page-container {
      min-height: 100vh;
      background: var(--bg-page);
    }

    .main-content {
      max-width: 720px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .content-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 200px;
    }

    .back-link {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      color: var(--text-tertiary);
      text-decoration: none;
      border-radius: 8px;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .back-link:hover {
      background: var(--border);
      color: var(--text-secondary);
    }

    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .day-badge {
      background: var(--bg-surface-hover);
      color: var(--text-tertiary);
      padding: 0.25rem 0.625rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .day-badge.today {
      background: #d1fae5;
      color: #059669;
    }

    .day-selector {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      width: 100%;
    }

    .day-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.625rem;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .day-btn:hover {
      background: var(--bg-surface-alt);
    }

    .day-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }

    .task-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 0.25rem;
      background: rgba(0, 0, 0, 0.08);
      border-radius: 9px;
      font-size: 0.65rem;
      font-weight: 600;
    }

    .day-btn.active .task-count {
      background: rgba(255, 255, 255, 0.25);
    }

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

    .progress-card {
      background: var(--bg-surface);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .progress-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .progress-value {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--accent);
    }

    .progress-bar {
      height: 8px;
      background: var(--bg-surface-hover);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--accent-gradient, linear-gradient(90deg, #667eea, #764ba2));
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .add-task-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .add-input {
      flex: 1;
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 0.875rem;
      background: var(--bg-surface);
      color: var(--text-primary);
      transition: border-color 0.2s ease;
    }

    .add-input:focus {
      outline: none;
      border-color: var(--accent);
    }

    .btn-add {
      padding: 0.625rem 1rem;
      background: var(--accent);
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s ease;
      white-space: nowrap;
    }

    .btn-add:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tasks-card {
      background: var(--bg-surface);
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .task-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .task-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s ease;
    }

    .task-row:last-child {
      border-bottom: none;
    }

    .task-row:hover {
      background: var(--bg-surface-hover);
    }

    .task-row.done .task-title {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .task-check {
      position: relative;
      display: flex;
      align-items: center;
      margin-top: 0.125rem;
      cursor: pointer;
    }

    .task-check input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .check-ui {
      display: block;
      width: 20px;
      height: 20px;
      border: 2px solid var(--border);
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .task-check input:checked + .check-ui {
      background: var(--accent);
      border-color: var(--accent);
    }

    .task-check input:checked + .check-ui::after {
      content: '';
      display: block;
      width: 5px;
      height: 9px;
      margin: 2px auto;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .task-check input:disabled + .check-ui {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .task-body {
      flex: 1;
      min-width: 0;
    }

    .task-title {
      display: block;
      font-size: 0.9rem;
      color: var(--text-primary);
      line-height: 1.4;
      cursor: text;
    }

    .task-title.readonly {
      cursor: default;
    }

    .edit-input {
      width: 100%;
      font-size: 0.9rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid var(--accent);
      border-radius: 6px;
      outline: none;
    }

    .task-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin-top: 0.375rem;
    }

    .badge {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    .badge-demand {
      background: var(--accent-bg);
      color: var(--accent);
      font-family: 'SF Mono', Consolas, monospace;
    }

    .badge-sistema {
      background: #f3e8ff;
      color: #7c3aed;
    }

    .badge-source {
      background: #e0f2fe;
      color: #0369a1;
    }

    .badge-time {
      background: var(--bg-surface-hover);
      color: var(--text-muted);
      font-weight: 500;
    }

    .btn-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.25rem;
      cursor: pointer;
      border-radius: 6px;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .btn-remove:hover {
      background: #fef2f2;
      color: #dc2626;
    }

    .empty-state {
      text-align: center;
      padding: 2.5rem 1.5rem;
      color: var(--text-muted);
      font-size: 0.875rem;
      margin: 0;
    }

    .footer-actions {
      margin-top: 1rem;
      text-align: center;
    }

    .btn-clear-all {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.8rem;
      cursor: pointer;
      text-decoration: underline;
      padding: 0.25rem;
    }

    .btn-clear-all:hover {
      color: #dc2626;
    }

    @media (max-width: 640px) {
      .main-content {
        padding: 1rem;
      }

      .add-task-bar {
        flex-direction: column;
      }

      .btn-add {
        width: 100%;
      }
    }
  `]
})
export class DailyTasksComponent implements OnInit {
  private authService = inject(AuthService);
  private dailyTasksService = inject(DailyTasksService);

  dayHistory = this.dailyTasksService.dayHistory;
  selectedDay = signal<string>(todayDateString());
  newTaskTitle = signal('');
  editingId = signal<string | null>(null);

  selectedDayTasks = computed(() => {
    const day = this.selectedDay();
    return this.dailyTasksService.dayHistory().find(e => e.dayDate === day)?.tasks ?? [];
  });

  doneCount = computed(() => this.selectedDayTasks().filter(t => t.status === 'done').length);
  progressPercent = computed(() => {
    const total = this.selectedDayTasks().length;
    return total === 0 ? 0 : Math.round((this.doneCount() / total) * 100);
  });

  sortedTasks = computed(() => {
    const list = [...this.selectedDayTasks()];
    return list.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  selectedDayLabel = computed(() => {
    const day = this.selectedDay();
    if (day === todayDateString()) return 'Hoje';
    return this.formatDateShort(day);
  });

  ngOnInit(): void {
    this.loadData();
  }

  isTodaySelected(): boolean {
    return this.selectedDay() === todayDateString();
  }

  selectDay(dayDate: string): void {
    this.selectedDay.set(dayDate);
  }

  getDayTabLabel(dayDate: string): string {
    if (dayDate === todayDateString()) return 'Hoje';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dayDate === yesterday.toDateString()) return 'Ontem';
    return this.formatDateShort(dayDate);
  }

  async addTask(): Promise<void> {
    const title = this.newTaskTitle().trim();
    const user = this.authService.user();
    if (!title || !this.isTodaySelected() || !user) return;

    const task: DailyTask = {
      id: this.dailyTasksService.generateId(),
      title,
      status: 'pending',
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    this.newTaskTitle.set('');
    await this.saveTasksForSelectedDay([...this.selectedDayTasks(), task]);
  }

  toggleTaskStatus(task: DailyTask): void {
    if (!this.isTodaySelected()) return;

    const done = task.status !== 'done';
    const tasks = this.selectedDayTasks().map(t =>
      t.id === task.id
        ? {
            ...t,
            status: done ? ('done' as const) : ('pending' as const),
            completedAt: done ? new Date().toISOString() : undefined
          }
        : t
    );
    void this.saveTasksForSelectedDay(tasks);
  }

  saveTitleEdit(event: Event, task: DailyTask): void {
    const input = event.target as HTMLInputElement;
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== task.title) {
      const tasks = this.selectedDayTasks().map(t => (t.id === task.id ? { ...t, title: newTitle } : t));
      void this.saveTasksForSelectedDay(tasks);
    }
    this.editingId.set(null);
  }

  removeTask(id: string): void {
    void this.saveTasksForSelectedDay(this.selectedDayTasks().filter(t => t.id !== id));
  }

  clearAll(): void {
    if (confirm('Remover todas as tarefas de hoje?')) {
      void this.saveTasksForSelectedDay([]);
    }
  }

  private async saveTasksForSelectedDay(tasks: DailyTask[]): Promise<void> {
    const user = this.authService.user();
    if (!user || !this.isTodaySelected()) return;

    try {
      await this.dailyTasksService.setTasksForDay(user.uid, this.selectedDay(), tasks);
    } catch (err) {
      console.error('Erro ao salvar tarefas do dia:', err);
    }
  }

  formatTimeShort(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  formatTimeFull(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR');
  }

  private formatDateShort(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  private async loadData(): Promise<void> {
    await this.waitForAuth();
    const user = this.authService.user();
    if (!user) {
      this.selectedDay.set(todayDateString());
      return;
    }

    try {
      await this.dailyTasksService.ensureLoaded(user.uid);
      this.applyDefaultDay(this.dailyTasksService.dayHistory());
    } catch (err) {
      console.error('Erro ao carregar tarefas do dia:', err);
      this.selectedDay.set(todayDateString());
    }
  }

  private applyDefaultDay(entries: { dayDate: string }[]): void {
    const today = todayDateString();
    if (entries.some(e => e.dayDate === today)) {
      this.selectedDay.set(today);
    } else if (entries.length > 0) {
      this.selectedDay.set(entries[0].dayDate);
    } else {
      this.selectedDay.set(today);
    }
  }

  private async waitForAuth(): Promise<void> {
    const maxWait = 5000;
    const step = 50;
    let elapsed = 0;
    while (this.authService.loading() && elapsed < maxWait) {
      await new Promise<void>(r => setTimeout(r, step));
      elapsed += step;
    }
  }

}
