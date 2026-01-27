import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomField } from '../../core';

@Component({
  selector: 'app-custom-field-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onClose.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Adicionar Campo Personalizado</h3>
          <button class="btn-close" (click)="onClose.emit()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label for="fieldName">Nome do Campo</label>
            <input 
              type="text" 
              id="fieldName"
              placeholder="Ex: Ambiente, Squad, Sprint..."
              [ngModel]="fieldName()"
              (ngModelChange)="fieldName.set($event)">
          </div>

          <div class="form-group">
            <label for="fieldValue">Valor</label>
            <input 
              type="text" 
              id="fieldValue"
              placeholder="Ex: Produção, Alpha Team, 2024.1..."
              [ngModel]="fieldValue()"
              (ngModelChange)="fieldValue.set($event)">
          </div>

          <div class="form-group">
            <label>Cor do Badge</label>
            <div class="color-options">
              @for (color of colorOptions; track color) {
                <button 
                  type="button"
                  class="color-btn"
                  [class.selected]="fieldColor() === color"
                  [style.background]="color"
                  (click)="fieldColor.set(color)">
                </button>
              }
            </div>
          </div>

          <div class="preview">
            <label>Preview:</label>
            <span 
              class="badge-preview"
              [style.background]="fieldColor() + '20'"
              [style.color]="fieldColor()"
              [style.border-color]="fieldColor()">
              {{ fieldName() || 'Campo' }}: {{ fieldValue() || 'Valor' }}
            </span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cancel" (click)="onClose.emit()">Cancelar</button>
          <button 
            class="btn-save" 
            [disabled]="!fieldName().trim() || !fieldValue().trim()"
            (click)="save()">
            Adicionar Campo
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
      z-index: 1100;
      padding: 1rem;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      animation: slideUp 0.2s ease;
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
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-header h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .btn-close {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.375rem;
      background: transparent;
      border: none;
      color: #6b7280;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .btn-close:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .modal-body {
      padding: 1.25rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-group label {
      display: block;
      font-size: 0.8rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .form-group input[type="text"] {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .form-group input[type="text"]:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .color-options {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .color-btn {
      width: 32px;
      height: 32px;
      border: 2px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .color-btn:hover {
      transform: scale(1.1);
    }

    .color-btn.selected {
      border-color: #1f2937;
      box-shadow: 0 0 0 2px white, 0 0 0 4px currentColor;
    }

    .preview {
      background: #f9fafb;
      padding: 1rem;
      border-radius: 8px;
    }

    .preview label {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .badge-preview {
      display: inline-flex;
      align-items: center;
      font-size: 0.8rem;
      font-weight: 500;
      padding: 0.375rem 0.625rem;
      border-radius: 6px;
      border: 1px solid;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      border-radius: 0 0 12px 12px;
    }

    .btn-cancel {
      padding: 0.625rem 1rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-cancel:hover {
      background: #f3f4f6;
    }

    .btn-save {
      padding: 0.625rem 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
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
export class CustomFieldModalComponent {
  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Omit<CustomField, 'id'>>();

  fieldName = signal('');
  fieldValue = signal('');
  fieldColor = signal('#667eea');

  colorOptions = [
    '#667eea', // Purple-blue
    '#764ba2', // Purple
    '#059669', // Green
    '#0891b2', // Cyan
    '#d97706', // Orange
    '#dc2626', // Red
    '#7c3aed', // Violet
    '#db2777', // Pink
    '#475569', // Slate
  ];

  save(): void {
    if (!this.fieldName().trim() || !this.fieldValue().trim()) return;

    this.onSave.emit({
      name: this.fieldName().trim(),
      value: this.fieldValue().trim(),
      color: this.fieldColor()
    });
  }
}
