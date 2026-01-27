import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Demand, Task, PRIORITY_CONFIG, STATUS_CONFIG, DemandService, CustomField, DemandStatus } from '../../core';
import { CustomFieldModalComponent } from '../custom-field-modal/custom-field-modal.component';

@Component({
  selector: 'app-demand-card',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomFieldModalComponent],
  template: `
    <div class="demand-card" [class.completed]="demand.status === 'concluido'">
      <div class="card-header">
        <div class="header-top">
          <span class="demand-code">{{ demand.code }}</span>
          <div class="badges">
            <div class="priority-badge" [style.background]="getPriorityConfig().bgColor" [style.color]="getPriorityConfig().color">
              {{ getPriorityConfig().label }}
            </div>
          </div>
        </div>
        
        <h3 class="demand-title">{{ demand.title }}</h3>
        
        <!-- Status Selector -->
        <div class="status-section">
          <label class="status-label">Status:</label>
          <div class="status-pills">
            @for (statusOption of statusOptions; track statusOption.value) {
              <button 
                type="button"
                class="status-pill"
                [class.active]="demand.status === statusOption.value"
                [style.--pill-color]="statusOption.config.color"
                [style.--pill-bg]="statusOption.config.bgColor"
                (click)="changeStatus(statusOption.value)">
                <span class="status-icon">{{ statusOption.config.icon }}</span>
                {{ statusOption.config.label }}
              </button>
            }
          </div>
        </div>
        
        <!-- Custom Fields/Badges -->
        @if (demand.customFields.length > 0) {
          <div class="custom-badges">
            @for (field of demand.customFields; track field.id) {
              <div class="custom-badge-wrapper">
                @if (editingFieldId() === field.id) {
                  <input 
                    type="text" 
                    class="badge-edit-input"
                    [value]="field.value"
                    placeholder="Digite o valor..."
                    (blur)="saveFieldEdit($event, field)"
                    (keydown.enter)="saveFieldEdit($event, field)"
                    (keydown.escape)="editingFieldId.set(null)">
                } @else {
                  <span 
                    class="custom-badge" 
                    [class.is-default]="isDefaultField(field)"
                    [style.background]="field.color + '20'"
                    [style.color]="field.color"
                    [style.border-color]="field.color"
                    (dblclick)="editingFieldId.set(field.id)">
                    {{ field.name }}{{ field.value ? ': ' + field.value : '' }}
                    @if (!isDefaultField(field)) {
                      <button class="badge-remove" (click)="removeCustomField(field.id); $event.stopPropagation()" title="Remover">×</button>
                    }
                  </span>
                }
              </div>
            }
          </div>
        }
      </div>

      <div class="card-body">
        <div class="tasks-header">
          <span class="tasks-title">
            Tarefas ({{ completedTasks() }}/{{ demand.tasks.length }})
          </span>
          <div class="tasks-actions">
            <button class="btn-icon btn-add-field" (click)="showFieldModal.set(true)" title="Adicionar campo">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="tasks-progress">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progressPercent()"></div>
          </div>
        </div>

        <div class="tasks-list">
          @for (task of demand.tasks; track task.id) {
            <div class="task-item" [class.completed]="task.completed" [class.in-progress]="task.inProgress && !task.completed">
              <label class="checkbox-container">
                <input 
                  type="checkbox" 
                  [checked]="task.completed"
                  (change)="toggleTask(task)">
                <span class="checkmark"></span>
              </label>
              
              @if (editingTaskId() === task.id) {
                <input 
                  type="text" 
                  class="task-edit-input"
                  [value]="task.title"
                  (blur)="saveTaskEdit($event, task)"
                  (keydown.enter)="saveTaskEdit($event, task)"
                  (keydown.escape)="cancelTaskEdit()">
              } @else {
                <span class="task-title" (dblclick)="startEditTask(task)">
                  @if (task.inProgress && !task.completed) {
                    <span class="in-progress-indicator">▶</span>
                  }
                  {{ task.title }}
                </span>
                @if (task.link) {
                  <a 
                    [href]="task.link" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    class="task-link"
                    title="Abrir link externo"
                    (click)="$event.stopPropagation()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                }
              }

              @if (!task.completed) {
                <button 
                  class="btn-icon btn-progress" 
                  [class.active]="task.inProgress"
                  (click)="setInProgress(task)" 
                  [title]="task.inProgress ? 'Parar execução' : 'Executar agora'">
                  @if (task.inProgress) {
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  }
                </button>
              }

              <button class="btn-icon btn-delete-task" (click)="deleteTask(task)" title="Excluir tarefa">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          }
        </div>

        <div class="add-task">
          <input 
            type="text" 
            placeholder="Adicionar nova tarefa..."
            [value]="newTaskTitle()"
            (input)="newTaskTitle.set($any($event.target).value)"
            (keydown.enter)="addTask()">
          <button class="btn-add-task" (click)="addTask()" [disabled]="!newTaskTitle().trim()">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="card-footer">
        <button class="btn-action btn-edit" (click)="onEdit.emit(demand)">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Editar
        </button>
        <button class="btn-action btn-delete" (click)="onDelete.emit(demand.id)">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Excluir
        </button>
      </div>
    </div>

    @if (showFieldModal()) {
      <app-custom-field-modal
        (onClose)="showFieldModal.set(false)"
        (onSave)="addCustomField($event)"
      />
    }
  `,
  styles: [`
    .demand-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .demand-card:hover {
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .demand-card.completed {
      opacity: 0.85;
      border: 2px solid #10b981;
    }

    .card-header {
      padding: 1.25rem 1.25rem 1rem;
      border-bottom: 1px solid #f3f4f6;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .demand-code {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.8rem;
      font-weight: 600;
      color: #667eea;
      background: #eef2ff;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
    }

    .badges {
      display: flex;
      gap: 0.5rem;
    }

    .priority-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.625rem;
      border-radius: 20px;
    }

    .demand-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 1rem 0;
      line-height: 1.4;
    }

    .status-section {
      margin-bottom: 0.75rem;
    }

    .status-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .status-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      background: white;
      font-size: 0.7rem;
      font-weight: 500;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .status-pill:hover {
      border-color: var(--pill-color);
      color: var(--pill-color);
    }

    .status-pill.active {
      background: var(--pill-bg);
      border-color: var(--pill-color);
      color: var(--pill-color);
    }

    .status-icon {
      font-size: 0.75rem;
    }

    .custom-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .custom-badge-wrapper {
      display: inline-flex;
    }

    .custom-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      border: 1px solid;
      cursor: pointer;
    }

    .custom-badge:hover {
      opacity: 0.9;
    }

    .badge-edit-input {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid #667eea;
      border-radius: 6px;
      outline: none;
      min-width: 120px;
    }

    .badge-remove {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      opacity: 0.6;
      transition: opacity 0.2s;
    }

    .badge-remove:hover {
      opacity: 1;
    }

    .card-body {
      padding: 1rem 1.25rem;
    }

    .tasks-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .tasks-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
    }

    .tasks-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.375rem;
      background: transparent;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-icon:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-add-field:hover {
      border-color: #667eea;
      color: #667eea;
    }

    .tasks-progress {
      margin-bottom: 1rem;
    }

    .progress-bar {
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 240px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }

    .tasks-list::-webkit-scrollbar {
      width: 4px;
    }

    .tasks-list::-webkit-scrollbar-track {
      background: #f3f4f6;
      border-radius: 2px;
    }

    .tasks-list::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 2px;
    }

    .task-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: #f9fafb;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .task-item:hover {
      background: #f3f4f6;
    }

    .task-item.completed {
      opacity: 0.6;
    }

    .task-item.completed .task-title {
      text-decoration: line-through;
      color: #9ca3af;
    }

    .task-item.in-progress {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border: 1px solid rgba(102, 126, 234, 0.3);
      animation: pulse-border 2s infinite;
    }

    @keyframes pulse-border {
      0%, 100% { border-color: rgba(102, 126, 234, 0.3); }
      50% { border-color: rgba(102, 126, 234, 0.6); }
    }

    .in-progress-indicator {
      color: #667eea;
      font-size: 0.7rem;
      margin-right: 0.25rem;
      animation: blink 1s infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .checkbox-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      width: 100%;
      height: 100%;
    }

    .checkmark {
      width: 18px;
      height: 18px;
      border: 2px solid #d1d5db;
      border-radius: 5px;
      transition: all 0.2s ease;
    }

    .checkbox-container input:checked ~ .checkmark {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: #667eea;
    }

    .checkbox-container input:checked ~ .checkmark::after {
      content: '';
      position: absolute;
      left: 6px;
      top: 2px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .task-title {
      flex: 1;
      font-size: 0.9rem;
      color: #374151;
      cursor: default;
    }

    .task-link {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      color: #667eea;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .task-link:hover {
      background: #eef2ff;
      color: #4f46e5;
    }

    .task-edit-input {
      flex: 1;
      font-size: 0.9rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid #667eea;
      border-radius: 4px;
      outline: none;
    }

    .btn-delete-task {
      opacity: 0;
      color: #9ca3af;
      border: none;
      padding: 0.25rem;
    }

    .task-item:hover .btn-delete-task {
      opacity: 1;
    }

    .btn-delete-task:hover {
      color: #dc2626;
      background: #fef2f2;
    }

    .btn-progress {
      opacity: 0;
      color: #6b7280;
      border: none;
      padding: 0.25rem;
      transition: all 0.2s ease;
    }

    .task-item:hover .btn-progress {
      opacity: 1;
    }

    .btn-progress:hover {
      color: #667eea;
      background: #eef2ff;
    }

    .btn-progress.active {
      opacity: 1;
      color: #667eea;
      background: #eef2ff;
    }

    .add-task {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .add-task input {
      flex: 1;
      padding: 0.625rem 0.875rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .add-task input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .btn-add-task {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-add-task:hover:not(:disabled) {
      transform: scale(1.05);
    }

    .btn-add-task:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .card-footer {
      display: flex;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      background: #f9fafb;
      border-top: 1px solid #f3f4f6;
    }

    .btn-action {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-edit {
      background: white;
      border: 1px solid #e5e7eb;
      color: #374151;
    }

    .btn-edit:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
    }

    .btn-delete {
      background: white;
      border: 1px solid #fecaca;
      color: #dc2626;
    }

    .btn-delete:hover {
      background: #fef2f2;
    }
  `]
})
export class DemandCardComponent {
  @Input({ required: true }) demand!: Demand;
  @Output() onEdit = new EventEmitter<Demand>();
  @Output() onDelete = new EventEmitter<string>();

  private demandService = inject(DemandService);

  newTaskTitle = signal('');
  editingTaskId = signal<string | null>(null);
  editingFieldId = signal<string | null>(null);
  showFieldModal = signal(false);

  statusOptions = Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value: value as DemandStatus,
    config
  }));

  completedTasks = () => this.demand.tasks.filter(t => t.completed).length;
  
  progressPercent = () => {
    if (this.demand.tasks.length === 0) return 0;
    return (this.completedTasks() / this.demand.tasks.length) * 100;
  };

  // Campos default que não podem ser removidos
  readonly defaultFieldNames = ['Consultoria'];

  getPriorityConfig() {
    return PRIORITY_CONFIG[this.demand.priority];
  }

  isDefaultField(field: CustomField): boolean {
    return this.defaultFieldNames.includes(field.name);
  }

  async changeStatus(status: DemandStatus): Promise<void> {
    await this.demandService.updateStatus(this.demand.id, status);
  }

  async toggleTask(task: Task): Promise<void> {
    await this.demandService.toggleTask(this.demand.id, task.id);
  }

  async addTask(): Promise<void> {
    const title = this.newTaskTitle().trim();
    if (!title) return;

    await this.demandService.addTask(this.demand.id, title);
    this.newTaskTitle.set('');
  }

  startEditTask(task: Task): void {
    this.editingTaskId.set(task.id);
  }

  async saveTaskEdit(event: Event, task: Task): Promise<void> {
    const input = event.target as HTMLInputElement;
    const newTitle = input.value.trim();
    
    if (newTitle && newTitle !== task.title) {
      await this.demandService.updateTask(this.demand.id, task.id, { title: newTitle });
    }
    
    this.editingTaskId.set(null);
  }

  cancelTaskEdit(): void {
    this.editingTaskId.set(null);
  }

  async deleteTask(task: Task): Promise<void> {
    await this.demandService.deleteTask(this.demand.id, task.id);
  }

  async setInProgress(task: Task): Promise<void> {
    await this.demandService.setTaskInProgress(this.demand.id, task.id);
  }

  async addCustomField(field: Omit<CustomField, 'id'>): Promise<void> {
    await this.demandService.addCustomField(this.demand.id, field);
    this.showFieldModal.set(false);
  }

  async saveFieldEdit(event: Event, field: CustomField): Promise<void> {
    const input = event.target as HTMLInputElement;
    const newValue = input.value.trim();
    
    await this.demandService.updateCustomField(this.demand.id, field.id, { value: newValue });
    this.editingFieldId.set(null);
  }

  async removeCustomField(fieldId: string): Promise<void> {
    await this.demandService.deleteCustomField(this.demand.id, fieldId);
  }
}
