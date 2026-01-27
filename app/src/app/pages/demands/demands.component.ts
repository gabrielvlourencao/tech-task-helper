import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, DemandService, Demand, ViewMode, PRIORITY_ORDER } from '../../core';
import { HeaderComponent } from '../../components/header/header.component';
import { DemandCardComponent } from '../../components/demand-card/demand-card.component';
import { DemandModalComponent } from '../../components/demand-modal/demand-modal.component';

@Component({
  selector: 'app-demands',
  standalone: true,
  imports: [CommonModule, HeaderComponent, DemandCardComponent, DemandModalComponent],
  template: `
    <div class="demands-container">
      <app-header />
      
      <main class="main-content">
        <div class="content-header">
          <div class="header-left">
            <h2>Suas Demandas</h2>
            <span class="demand-count">{{ filteredDemands().length }} demanda(s)</span>
          </div>
          <div class="header-right">
            <div class="view-tabs">
              <button 
                class="tab-btn" 
                [class.active]="viewMode() === 'active'"
                (click)="viewMode.set('active')">
                <span class="tab-icon">📋</span>
                Ativas
                <span class="tab-count">{{ activeDemands().length }}</span>
              </button>
              <button 
                class="tab-btn" 
                [class.active]="viewMode() === 'completed'"
                (click)="viewMode.set('completed')">
                <span class="tab-icon">✅</span>
                Concluídas
                <span class="tab-count">{{ completedDemands().length }}</span>
              </button>
              <button 
                class="tab-btn" 
                [class.active]="viewMode() === 'all'"
                (click)="viewMode.set('all')">
                <span class="tab-icon">📁</span>
                Todas
                <span class="tab-count">{{ demands().length }}</span>
              </button>
            </div>
            <button class="btn-primary" (click)="openNewDemandModal()">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Nova Demanda
            </button>
          </div>
        </div>

        @if (loading()) {
          <div class="loading-state">
            <div class="spinner-lg"></div>
            <p>Carregando demandas...</p>
          </div>
        } @else if (filteredDemands().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              @if (viewMode() === 'completed') {
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              } @else {
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              }
            </div>
            @if (viewMode() === 'completed') {
              <h3>Nenhuma demanda concluída</h3>
              <p>Complete suas demandas para vê-las aqui</p>
            } @else if (viewMode() === 'active') {
              <h3>Nenhuma demanda ativa</h3>
              <p>Crie uma nova demanda para começar</p>
              <button class="btn-primary" (click)="openNewDemandModal()">
                Criar primeira demanda
              </button>
            } @else {
              <h3>Nenhuma demanda ainda</h3>
              <p>Crie sua primeira demanda para começar a organizar suas tarefas</p>
              <button class="btn-primary" (click)="openNewDemandModal()">
                Criar primeira demanda
              </button>
            }
          </div>
        } @else {
          <div class="demands-grid">
            @for (demand of filteredDemands(); track demand.id) {
              <app-demand-card 
                [demand]="demand"
                (onEdit)="openEditDemandModal($event)"
                (onDelete)="deleteDemand($event)"
              />
            }
          </div>
        }
      </main>

      @if (showModal()) {
        <app-demand-modal
          [demand]="editingDemand()"
          (onClose)="closeModal()"
          (onSave)="saveDemand($event)"
        />
      }
    </div>
  `,
  styles: [`
    .demands-container {
      min-height: 100vh;
      background: #f3f4f6;
    }

    .main-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-left h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .demand-count {
      background: #e5e7eb;
      color: #6b7280;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .view-tabs {
      display: flex;
      background: white;
      border-radius: 10px;
      padding: 0.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: #374151;
      background: #f3f4f6;
    }

    .tab-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .tab-btn.active .tab-count {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .tab-icon {
      font-size: 1rem;
    }

    .tab-count {
      background: #e5e7eb;
      color: #6b7280;
      padding: 0.125rem 0.5rem;
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      color: #6b7280;
    }

    .spinner-lg {
      width: 48px;
      height: 48px;
      border: 3px solid #e5e7eb;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      text-align: center;
    }

    .empty-icon {
      color: #9ca3af;
      margin-bottom: 1.5rem;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #374151;
      margin: 0 0 0.5rem 0;
    }

    .empty-state p {
      color: #6b7280;
      margin: 0 0 1.5rem 0;
      max-width: 400px;
    }

    .demands-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 1.5rem;
    }

    @media (max-width: 768px) {
      .main-content {
        padding: 1rem;
      }

      .content-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-right {
        flex-direction: column;
      }

      .view-tabs {
        width: 100%;
        justify-content: center;
      }

      .btn-primary {
        width: 100%;
        justify-content: center;
      }

      .demands-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DemandsComponent {
  private authService = inject(AuthService);
  private demandService = inject(DemandService);

  demands = this.demandService.demands;
  loading = this.demandService.loading;

  viewMode = signal<ViewMode>('active');
  showModal = signal(false);
  editingDemand = signal<Demand | null>(null);

  activeDemands = computed(() => 
    this.demands().filter(d => d.status !== 'concluido')
  );

  completedDemands = computed(() => 
    this.demands().filter(d => d.status === 'concluido')
  );

  filteredDemands = computed(() => {
    const mode = this.viewMode();
    const allDemands = this.demands();

    let filtered: Demand[];
    switch (mode) {
      case 'active':
        filtered = allDemands.filter(d => d.status !== 'concluido');
        break;
      case 'completed':
        filtered = allDemands.filter(d => d.status === 'concluido');
        break;
      default:
        filtered = [...allDemands];
    }

    // Ordenar por prioridade (crítica primeiro)
    return filtered.sort((a, b) => {
      const priorityA = PRIORITY_ORDER[a.priority] || 0;
      const priorityB = PRIORITY_ORDER[b.priority] || 0;
      return priorityB - priorityA;
    });
  });

  openNewDemandModal(): void {
    this.editingDemand.set(null);
    this.showModal.set(true);
  }

  openEditDemandModal(demand: Demand): void {
    this.editingDemand.set(demand);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingDemand.set(null);
  }

  async saveDemand(data: { title: string; priority: Demand['priority']; status: Demand['status']; consultoria: string; useDefaultTasks: boolean }): Promise<void> {
    try {
      const editing = this.editingDemand();
      if (editing) {
        await this.demandService.updateDemand(editing.id, {
          title: data.title,
          priority: data.priority,
          status: data.status
        });
        await this.demandService.updateConsultoria(editing.id, data.consultoria);
      } else {
        await this.demandService.createDemand(data.title, data.priority, data.useDefaultTasks, data.status, data.consultoria);
      }
      this.closeModal();
    } catch (error) {
      console.error('Error saving demand:', error);
    }
  }

  async deleteDemand(demandId: string): Promise<void> {
    if (confirm('Tem certeza que deseja excluir esta demanda?')) {
      try {
        await this.demandService.deleteDemand(demandId);
      } catch (error) {
        console.error('Error deleting demand:', error);
      }
    }
  }
}
