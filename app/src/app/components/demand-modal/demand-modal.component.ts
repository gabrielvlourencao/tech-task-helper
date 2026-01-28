import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Demand, Priority, DemandStatus, PRIORITY_CONFIG, STATUS_CONFIG } from '../../core';

@Component({
  selector: 'app-demand-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onClose.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ demand ? 'Editar Demanda' : 'Nova Demanda' }}</h2>
          <button class="btn-close" (click)="onClose.emit()">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="code">ID da Demanda (DMND) <span class="required">*</span></label>
            <input 
              type="text" 
              id="code"
              placeholder="Ex: DMND12345"
              [ngModel]="code()"
              (ngModelChange)="code.set($event)"
              [class.invalid]="!code().trim() && showValidation()">
            @if (!code().trim() && showValidation()) {
              <span class="error-msg">ID da demanda é obrigatório</span>
            }
          </div>

          <div class="form-group">
            <label for="title">Título da Demanda</label>
            <input 
              type="text" 
              id="title"
              placeholder="Ex: Implementação do módulo de pagamentos"
              [ngModel]="title()"
              (ngModelChange)="title.set($event)">
          </div>

          <div class="form-group">
            <label>Prioridade</label>
            <div class="priority-options">
              @for (option of priorityOptions; track option.value) {
                <button 
                  type="button"
                  class="priority-btn"
                  [class.selected]="priority() === option.value"
                  [style.--btn-color]="option.config.color"
                  [style.--btn-bg]="option.config.bgColor"
                  (click)="priority.set(option.value)">
                  {{ option.config.label }}
                </button>
              }
            </div>
          </div>

          <div class="form-group">
            <label>Status Inicial</label>
            <div class="status-options">
              @for (option of statusOptions; track option.value) {
                <button 
                  type="button"
                  class="status-btn"
                  [class.selected]="status() === option.value"
                  [style.--btn-color]="option.config.color"
                  [style.--btn-bg]="option.config.bgColor"
                  (click)="status.set(option.value)">
                  <span class="status-icon">{{ option.config.icon }}</span>
                  {{ option.config.label }}
                </button>
              }
            </div>
          </div>

          <div class="form-group">
            <label for="sistema">Nome do Sistema <span class="required">*</span></label>
            <input 
              type="text" 
              id="sistema"
              placeholder="Nome do sistema (ex: SAP, Salesforce...)"
              [ngModel]="sistema()"
              (ngModelChange)="sistema.set($event)"
              [class.invalid]="!sistema().trim() && showValidation()">
            @if (!sistema().trim() && showValidation()) {
              <span class="error-msg">Nome do sistema é obrigatório</span>
            }
          </div>

          <div class="form-group">
            <label for="consultoria">Consultoria</label>
            <input 
              type="text" 
              id="consultoria"
              placeholder="Nome da consultoria (ex: Accenture, Capgemini...)"
              [ngModel]="consultoria()"
              (ngModelChange)="consultoria.set($event)">
          </div>

          @if (!demand) {
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox"
                  [ngModel]="useDefaultTasks()"
                  (ngModelChange)="useDefaultTasks.set($event)">
                <span class="checkbox-text">
                  Incluir tarefas padrão (Keyvaults, Release, Branchs)
                </span>
              </label>
            </div>
          }
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" (click)="onClose.emit()">Cancelar</button>
          <button 
            class="btn-save" 
            [disabled]="!code().trim() || !sistema().trim()"
            (click)="save()">
            {{ demand ? 'Salvar Alterações' : 'Criar Demanda' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 540px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      animation: slideUp 0.2s ease;
      max-height: 90vh;
      overflow-y: auto;
    }

    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .btn-close {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      background: transparent;
      border: none;
      color: #6b7280;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .btn-close:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-group label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .form-group input[type="text"] {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }

    .form-group input[type="text"]:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group input[type="text"].invalid {
      border-color: #dc2626;
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
    }

    .required {
      color: #dc2626;
      font-weight: 600;
    }

    .error-msg {
      display: block;
      color: #dc2626;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .priority-options {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .priority-btn {
      flex: 1;
      min-width: 80px;
      padding: 0.625rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      background: white;
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .priority-btn:hover {
      border-color: var(--btn-color);
      color: var(--btn-color);
    }

    .priority-btn.selected {
      background: var(--btn-bg);
      border-color: var(--btn-color);
      color: var(--btn-color);
    }

    .status-options {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .status-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      background: white;
      font-size: 0.8rem;
      font-weight: 500;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .status-btn:hover {
      border-color: var(--btn-color);
      color: var(--btn-color);
    }

    .status-btn.selected {
      background: var(--btn-bg);
      border-color: var(--btn-color);
      color: var(--btn-color);
    }

    .status-icon {
      font-size: 0.9rem;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: 20px;
      height: 20px;
      margin-top: 2px;
      accent-color: #667eea;
    }

    .checkbox-text {
      font-size: 0.9rem;
      color: #374151;
      line-height: 1.5;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      border-radius: 0 0 16px 16px;
    }

    .btn-cancel {
      padding: 0.75rem 1.25rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-cancel:hover {
      background: #f3f4f6;
    }

    .btn-save {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 500;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-save:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class DemandModalComponent implements OnInit {
  @Input() demand: Demand | null = null;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<{ code: string; title: string; priority: Priority; status: DemandStatus; consultoria: string; sistema: string; useDefaultTasks: boolean }>();

  code = signal('');
  title = signal('');
  priority = signal<Priority>('medium');
  status = signal<DemandStatus>('setup');
  consultoria = signal('');
  sistema = signal('');
  useDefaultTasks = signal(true);
  showValidation = signal(false);

  priorityOptions = Object.entries(PRIORITY_CONFIG).map(([value, config]) => ({
    value: value as Priority,
    config
  }));

  statusOptions = Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value: value as DemandStatus,
    config
  }));

  ngOnInit(): void {
    if (this.demand) {
      this.code.set(this.demand.code);
      this.title.set(this.demand.title);
      this.priority.set(this.demand.priority);
      this.status.set(this.demand.status || 'setup');
      
      // Buscar valor do campo Consultoria
      const consultoriaField = this.demand.customFields.find(f => f.name === 'Consultoria');
      if (consultoriaField) {
        this.consultoria.set(consultoriaField.value);
      }

      // Buscar valor do campo Sistema
      const sistemaField = this.demand.customFields.find(f => f.name === 'Sistema');
      if (sistemaField) {
        this.sistema.set(sistemaField.value);
      }
    }
  }

  save(): void {
    this.showValidation.set(true);
    
    if (!this.code().trim() || !this.sistema().trim()) return;

    this.onSave.emit({
      code: this.code().trim(),
      title: this.title().trim(),
      priority: this.priority(),
      status: this.status(),
      consultoria: this.consultoria().trim(),
      sistema: this.sistema().trim(),
      useDefaultTasks: this.useDefaultTasks()
    });
  }
}
