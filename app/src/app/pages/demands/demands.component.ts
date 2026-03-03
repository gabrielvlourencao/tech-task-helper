import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, DemandService, Demand, Task, PRIORITY_ORDER, PRIORITY_CONFIG, STATUS_CONFIG, DemandStatus, ReleaseDocumentService } from '../../core';
import { RELEASE_DOC_TASK_TITLE } from '../../core/models/release-document.model';
import { HeaderComponent } from '../../components/header/header.component';
import { DemandModalComponent } from '../../components/demand-modal/demand-modal.component';

type DisplayMode = 'list' | 'kanban';

@Component({
  selector: 'app-demands',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, DemandModalComponent],
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
            <button 
              class="toggle-completed-btn"
              [class.active]="showCompleted()"
              (click)="showCompleted.set(!showCompleted())">
              <span class="toggle-completed-icon">✅</span>
              Exibir concluídos
              <span class="tab-count">{{ completedDemands().length }}</span>
            </button>
            <button class="btn-primary" (click)="openNewDemandModal()">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Nova Demanda
            </button>
          </div>
        </div>

        <!-- Filters Section -->
        <div class="filters-section">
          <div class="filters-row">
            <div class="filter-group">
              <label for="filter-id">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
                ID (DMND)
              </label>
              <input 
                type="text" 
                id="filter-id"
                placeholder="Ex: DMND12345"
                [ngModel]="filterById()"
                (ngModelChange)="filterById.set($event)">
            </div>

            <div class="filter-group">
              <label for="filter-sistema">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                Sistema
              </label>
              <select 
                id="filter-sistema"
                [ngModel]="filterBySistema()"
                (ngModelChange)="filterBySistema.set($event)">
                <option value="">Todos</option>
                @for (sistema of availableSistemas(); track sistema) {
                  <option [value]="sistema">{{ sistema }}</option>
                }
              </select>
            </div>

            <div class="filter-group">
              <label for="filter-consultoria">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Consultoria
              </label>
              <select 
                id="filter-consultoria"
                [ngModel]="filterByConsultoria()"
                (ngModelChange)="filterByConsultoria.set($event)">
                <option value="">Todas</option>
                @for (consultoria of availableConsultorias(); track consultoria) {
                  <option [value]="consultoria">{{ consultoria }}</option>
                }
              </select>
            </div>

            <div class="filter-group">
              <label for="filter-status">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                Status
              </label>
              <select 
                id="filter-status"
                [ngModel]="filterByStatus()"
                (ngModelChange)="filterByStatus.set($event)">
                <option value="">Todos</option>
                @for (statusOption of statusOptions(); track statusOption.value) {
                  <option [value]="statusOption.value">{{ statusOption.config.icon }} {{ statusOption.config.label }}</option>
                }
              </select>
            </div>

            <div class="display-toggle">
              <button 
                class="toggle-btn" 
                [class.active]="displayMode() === 'list'"
                (click)="displayMode.set('list')"
                title="Visualização em lista">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="8" x2="21" y1="6" y2="6"></line>
                  <line x1="8" x2="21" y1="12" y2="12"></line>
                  <line x1="8" x2="21" y1="18" y2="18"></line>
                  <line x1="3" x2="3.01" y1="6" y2="6"></line>
                  <line x1="3" x2="3.01" y1="12" y2="12"></line>
                  <line x1="3" x2="3.01" y1="18" y2="18"></line>
                </svg>
              </button>
              <button 
                class="toggle-btn" 
                [class.active]="displayMode() === 'kanban'"
                (click)="displayMode.set('kanban')"
                title="Visualização Kanban">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="7" height="9" x="3" y="3" rx="1"></rect>
                  <rect width="7" height="5" x="14" y="3" rx="1"></rect>
                  <rect width="7" height="9" x="14" y="12" rx="1"></rect>
                  <rect width="7" height="5" x="3" y="16" rx="1"></rect>
                </svg>
              </button>
            </div>

            @if (hasActiveFilters()) {
              <button class="btn-clear-filters" (click)="clearFilters()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
                Limpar filtros
              </button>
            }
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
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h3>Nenhuma demanda encontrada</h3>
            <p>Crie uma nova demanda para começar a organizar suas tarefas</p>
            <button class="btn-primary" (click)="openNewDemandModal()">
              Criar primeira demanda
            </button>
          </div>
        } @else {
          @if (displayMode() === 'list') {
            <!-- List View -->
            <div class="demands-list">
              <div class="list-header">
                <span class="col-expand"></span>
                <span class="col-code">Código</span>
                <span class="col-title">Título</span>
                <span class="col-sistema">Sistema</span>
                <span class="col-consultoria">Consultoria</span>
                <span class="col-status">Status</span>
                <span class="col-priority">Prioridade</span>
                <span class="col-progress">Progresso</span>
                <span class="col-actions">Ações</span>
              </div>
              @for (demand of filteredDemands(); track demand.id) {
                <div class="list-item" [class.completed]="demand.status === 'concluido'">
                  <div class="list-row" (click)="toggleExpand(demand.id)">
                    <span class="col-expand">
                      <button class="btn-expand" [class.expanded]="expandedDemandId() === demand.id">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </span>
                    <span class="col-code">
                      <span class="code-badge">{{ demand.code }}</span>
                    </span>
                    <span class="col-title">{{ demand.title }}</span>
                    <span class="col-sistema">{{ getSistemaValue(demand) || '-' }}</span>
                    <span class="col-consultoria">{{ getConsultoriaValue(demand) || '-' }}</span>
                    <span class="col-status" (click)="$event.stopPropagation()">
                      <select 
                        class="status-select"
                        [ngModel]="demand.status"
                        (ngModelChange)="changeStatus(demand.id, $event)"
                        (click)="$event.stopPropagation()"
                        aria-label="Alterar status da demanda {{ demand.code }}">
                        @for (statusOption of statusOptions(); track statusOption.value) {
                          <option [value]="statusOption.value">{{ statusOption.config.icon }} {{ statusOption.config.label }}</option>
                        }
                      </select>
                    </span>
                    <span class="col-priority">
                      <span 
                        class="priority-badge" 
                        [style.background]="getPriorityConfig(demand.priority).bgColor"
                        [style.color]="getPriorityConfig(demand.priority).color">
                        {{ getPriorityConfig(demand.priority).label }}
                      </span>
                    </span>
                    <span class="col-progress">
                      <div class="progress-mini">
                        <div class="progress-bar-mini">
                          <div class="progress-fill-mini" [style.width.%]="getTaskProgress(demand)"></div>
                        </div>
                        <span class="progress-text-mini">{{ getCompletedTasksCount(demand) }}/{{ demand.tasks.length }}</span>
                      </div>
                    </span>
                    <span class="col-actions" (click)="$event.stopPropagation()">
                      <button class="btn-action-mini btn-edit-mini" (click)="openEditDemandModal(demand)" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button class="btn-action-mini btn-delete-mini" (click)="deleteDemand(demand.id)" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </span>
                  </div>
                  
                  <!-- Expanded Tasks Section -->
                  @if (expandedDemandId() === demand.id) {
                    <div class="list-expanded" (click)="$event.stopPropagation()">
                      <div class="expanded-tasks">
                        <div class="tasks-header-expanded">
                          <span class="tasks-title-expanded">Tarefas ({{ getCompletedTasksCount(demand) }}/{{ demand.tasks.length }})</span>
                        </div>
                        
                        <div class="tasks-list-expanded">
                          @for (task of demand.tasks; track task.id) {
                            <div class="task-item-expanded" [class.completed]="task.completed" [class.in-progress]="task.inProgress && !task.completed">
                              <label class="checkbox-container">
                                <input 
                                  type="checkbox" 
                                  [checked]="task.completed"
                                  (change)="toggleTask(demand.id, task)">
                                <span class="checkmark"></span>
                              </label>
                              
                              @if (editingTaskId() === task.id) {
                                <input 
                                  type="text" 
                                  class="task-edit-input"
                                  [value]="task.title"
                                  (blur)="saveTaskEdit($event, demand.id, task)"
                                  (keydown.enter)="saveTaskEdit($event, demand.id, task)"
                                  (keydown.escape)="editingTaskId.set(null)">
                              } @else {
                                <span class="task-title-expanded" (dblclick)="editingTaskId.set(task.id)">
                                  @if (task.inProgress && !task.completed) {
                                    <span class="in-progress-indicator">▶</span>
                                  }
                                  {{ task.title }}
                                </span>
                              }
                              @if (task.title === releaseDocTaskTitle) {
                                <button type="button" class="btn-icon-mini task-release-doc" (click)="openReleaseDoc(demand, $event)" title="Abrir documento de release">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                  </svg>
                                </button>
                              }

                              @if (!task.completed) {
                                <button 
                                  class="btn-icon-mini btn-progress" 
                                  [class.active]="task.inProgress"
                                  (click)="setInProgress(demand.id, task)" 
                                  [title]="task.inProgress ? 'Parar execução' : 'Executar agora'">
                                  @if (task.inProgress) {
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <rect x="6" y="4" width="4" height="16"></rect>
                                      <rect x="14" y="4" width="4" height="16"></rect>
                                    </svg>
                                  } @else {
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                    </svg>
                                  }
                                </button>
                              }

                              <button class="btn-icon-mini btn-delete-task" (click)="deleteTask(demand.id, task)" title="Excluir tarefa">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                          }
                        </div>

                        <div class="add-task-expanded">
                          <input 
                            type="text" 
                            placeholder="Adicionar nova tarefa..."
                            [value]="newTaskTitle()"
                            (input)="newTaskTitle.set($any($event.target).value)"
                            (keydown.enter)="addTask(demand.id)">
                          <button class="btn-add-task-mini" (click)="addTask(demand.id)" [disabled]="!newTaskTitle().trim()">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <!-- Kanban View -->
            <div class="kanban-board">
              @for (status of kanbanColumns(); track status) {
                <div
                  class="kanban-column"
                  [class.drag-over]="dragOverStatus() === status"
                  (dragover)="onKanbanDragOver($event, status)"
                  (dragleave)="onKanbanDragLeave($event)"
                  (drop)="onKanbanDrop($event, status)">

                  <div class="column-header" [style.border-top-color]="getStatusConfig(status).color">
                    <div class="column-header-info">
                      <span>{{ getStatusConfig(status).icon }}</span>
                      <span class="column-title">{{ getStatusConfig(status).label }}</span>
                    </div>
                    <span class="column-count">{{ getKanbanDemandsForStatus(status).length }}</span>
                  </div>

                  <div class="column-body">
                    @for (demand of getKanbanDemandsForStatus(status); track demand.id) {
                      <div
                        class="kanban-card"
                        [class.dragging]="draggingDemandId() === demand.id"
                        draggable="true"
                        (dragstart)="onKanbanDragStart($event, demand)"
                        (dragend)="onKanbanDragEnd()">

                        <div class="kanban-card-header" (click)="openCardModal(demand)">
                          <div class="kanban-card-top">
                            <span class="kanban-code">{{ demand.code }}</span>
                            <span class="kanban-priority"
                              [style.background]="getPriorityConfig(demand.priority).bgColor"
                              [style.color]="getPriorityConfig(demand.priority).color">
                              {{ getPriorityConfig(demand.priority).label }}
                            </span>
                          </div>
                          <h4 class="kanban-title">{{ demand.title }}</h4>
                          <div class="kanban-badges">
                            @if (getSistemaValue(demand)) {
                              <span class="kanban-sistema">{{ getSistemaValue(demand) }}</span>
                            }
                            @if (getConsultoriaValue(demand)) {
                              <span class="kanban-consultoria">{{ getConsultoriaValue(demand) }}</span>
                            }
                          </div>
                          <div class="kanban-progress">
                            <div class="kanban-progress-bar">
                              <div class="kanban-progress-fill" [style.width.%]="getTaskProgress(demand)"></div>
                            </div>
                            <span class="kanban-progress-text">{{ getCompletedTasksCount(demand) }}/{{ demand.tasks.length }}</span>
                          </div>
                        </div>
                      </div>
                    }
                    @if (getKanbanDemandsForStatus(status).length === 0) {
                      <div class="kanban-empty">Nenhuma demanda</div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }
      </main>

      @if (showModal()) {
        <app-demand-modal
          [demand]="editingDemand()"
          (onClose)="closeModal()"
          (onSave)="saveDemand($event)"
        />
      }

      @if (cardModalDemand(); as demand) {
        <div class="card-modal-overlay" (click)="closeCardModal()">
          <div class="card-modal" (click)="$event.stopPropagation()">
            <div class="card-modal-header">
              <div class="card-modal-top">
                <span class="kanban-code">{{ demand.code }}</span>
                <span class="kanban-priority"
                  [style.background]="getPriorityConfig(demand.priority).bgColor"
                  [style.color]="getPriorityConfig(demand.priority).color">
                  {{ getPriorityConfig(demand.priority).label }}
                </span>
                <button class="card-modal-close" (click)="closeCardModal()" aria-label="Fechar">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <h3 class="card-modal-title">{{ demand.title }}</h3>
              <div class="kanban-badges">
                @if (getSistemaValue(demand)) {
                  <span class="kanban-sistema">{{ getSistemaValue(demand) }}</span>
                }
                @if (getConsultoriaValue(demand)) {
                  <span class="kanban-consultoria">{{ getConsultoriaValue(demand) }}</span>
                }
              </div>
            </div>
            <div class="card-modal-body">
              <div class="card-modal-section">
                <label class="card-modal-label">Status</label>
                <select class="kanban-status-select"
                  [ngModel]="demand.status"
                  (ngModelChange)="changeStatus(demand.id, $event)">
                  @for (statusOption of statusOptions(); track statusOption.value) {
                    <option [value]="statusOption.value">{{ statusOption.config.icon }} {{ statusOption.config.label }}</option>
                  }
                </select>
              </div>
              <div class="card-modal-section">
                <div class="card-modal-tasks-header">
                  <label class="card-modal-label">Tarefas ({{ getCompletedTasksCount(demand) }}/{{ demand.tasks.length }})</label>
                  <div class="kanban-progress" style="flex:1; max-width: 200px;">
                    <div class="kanban-progress-bar">
                      <div class="kanban-progress-fill" [style.width.%]="getTaskProgress(demand)"></div>
                    </div>
                    <span class="kanban-progress-text">{{ getTaskProgress(demand) | number:'1.0-0' }}%</span>
                  </div>
                </div>
                <div class="card-modal-tasks-list">
                  @for (task of demand.tasks; track task.id) {
                    <div class="kanban-task-item" [class.completed]="task.completed" [class.in-progress]="task.inProgress && !task.completed">
                      <label class="checkbox-container">
                        <input type="checkbox" [checked]="task.completed" (change)="toggleTask(demand.id, task)">
                        <span class="checkmark"></span>
                      </label>
                      @if (editingTaskId() === task.id) {
                        <input type="text" class="task-edit-input" [value]="task.title"
                          (blur)="saveTaskEdit($event, demand.id, task)"
                          (keydown.enter)="saveTaskEdit($event, demand.id, task)"
                          (keydown.escape)="editingTaskId.set(null)">
                      } @else {
                        <span class="kanban-task-title" (dblclick)="editingTaskId.set(task.id)">
                          @if (task.inProgress && !task.completed) {
                            <span class="in-progress-indicator">▶</span>
                          }
                          {{ task.title }}
                        </span>
                      }
                      @if (!task.completed) {
                        <button class="btn-icon-mini btn-progress"
                          [class.active]="task.inProgress"
                          (click)="setInProgress(demand.id, task)"
                          [title]="task.inProgress ? 'Parar execução' : 'Executar agora'">
                          @if (task.inProgress) {
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                          } @else {
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          }
                        </button>
                      }
                      <button class="btn-icon-mini btn-delete-task" (click)="deleteTask(demand.id, task)" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  }
                </div>
                <div class="kanban-add-task">
                  <input type="text" placeholder="Nova tarefa..."
                    [value]="newTaskTitle()"
                    (input)="newTaskTitle.set($any($event.target).value)"
                    (keydown.enter)="addTask(demand.id)">
                  <button class="btn-add-task-mini" (click)="addTask(demand.id)" [disabled]="!newTaskTitle().trim()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="card-modal-footer">
              <button class="btn-kanban-edit" (click)="openEditDemandModal(demand); closeCardModal()">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Editar demanda
              </button>
              <button class="btn-kanban-delete" (click)="deleteDemandFromModal(demand.id)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Excluir
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .demands-container {
      min-height: 100vh;
      background: var(--bg-page);
    }

    .main-content {
      max-width: 1800px;
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
      color: var(--text-primary);
      margin: 0;
    }

    .demand-count {
      background: var(--border);
      color: var(--text-tertiary);
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

    .toggle-completed-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--border);
      background: var(--bg-surface);
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: var(--shadow-sm);
    }

    .toggle-completed-btn:hover {
      color: var(--text-secondary);
      border-color: var(--border-medium);
    }

    .toggle-completed-btn.active {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border-color: transparent;
    }

    .toggle-completed-btn.active .tab-count {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .toggle-completed-icon {
      font-size: 1rem;
    }

    .tab-count {
      background: var(--border);
      color: var(--text-tertiary);
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
      color: var(--text-tertiary);
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
      color: var(--text-muted);
      margin-bottom: 1.5rem;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0 0 0.5rem 0;
    }

    .empty-state p {
      color: var(--text-tertiary);
      margin: 0 0 1.5rem 0;
      max-width: 400px;
    }

    /* Grid - Cards padronizados */
    .demands-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 1.25rem;
    }

    .demands-grid app-demand-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    /* Filters Section */
    .filters-section {
      background: var(--bg-surface);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: var(--shadow-sm);
    }

    .filters-row {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      min-width: 160px;
    }

    .filter-group label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-tertiary);
    }

    .filter-group input,
    .filter-group select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      background: var(--bg-surface);
    }

    .filter-group input:focus,
    .filter-group select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .display-toggle {
      display: flex;
      background: var(--bg-surface-alt);
      border-radius: 8px;
      padding: 0.25rem;
      margin-left: auto;
    }

    .toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      border: none;
      background: transparent;
      border-radius: 6px;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .toggle-btn:hover {
      color: var(--text-secondary);
    }

    .toggle-btn.active {
      background: var(--bg-surface);
      color: #667eea;
      box-shadow: var(--shadow-sm);
    }

    .btn-clear-filters {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border);
      background: var(--bg-surface);
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-clear-filters:hover {
      background: var(--bg-surface-alt);
      border-color: var(--border-medium);
    }

    /* List View */
    .demands-list {
      background: var(--bg-surface);
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .list-header {
      display: grid;
      grid-template-columns: 40px 110px 1fr 100px 100px 120px 80px 100px 70px;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--bg-surface-hover);
      border-bottom: 1px solid var(--border);
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .list-item {
      border-bottom: 1px solid var(--border-light);
    }

    .list-item:last-child {
      border-bottom: none;
    }

    .list-row {
      display: grid;
      grid-template-columns: 40px 110px 1fr 100px 100px 120px 80px 100px 70px;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      align-items: center;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .list-row:hover {
      background: var(--bg-surface-hover);
    }

    .list-item.completed .list-row {
      opacity: 0.7;
      background: #f0fdf4;
    }

    .btn-expand {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .btn-expand:hover {
      background: var(--bg-surface-alt);
      color: var(--text-secondary);
    }

    .btn-expand.expanded {
      color: #667eea;
      transform: rotate(90deg);
    }

    .col-code {
      font-size: 0.8rem;
    }

    .code-badge {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.7rem;
      font-weight: 600;
      color: #667eea;
      background: #eef2ff;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
    }

    .col-title {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .col-sistema,
    .col-consultoria {
      font-size: 0.8rem;
      color: #4b5563;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.65rem;
      font-weight: 500;
      padding: 0.2rem 0.4rem;
      border-radius: 12px;
      white-space: nowrap;
    }

    .status-select {
      width: 100%;
      max-width: 130px;
      padding: 0.25rem 0.5rem;
      font-size: 0.7rem;
      font-weight: 500;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-surface);
      color: var(--text-secondary);
      cursor: pointer;
      transition: border-color 0.2s ease;
    }

    .status-select:hover {
      border-color: #667eea;
    }

    .status-select:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
    }

    .priority-badge {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.2rem 0.4rem;
      border-radius: 12px;
    }

    .progress-mini {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .progress-bar-mini {
      flex: 1;
      height: 5px;
      background: var(--border);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill-mini {
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .progress-text-mini {
      font-size: 0.7rem;
      color: var(--text-tertiary);
      white-space: nowrap;
    }

    .col-actions {
      display: flex;
      gap: 0.375rem;
    }

    .btn-action-mini {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.3rem;
      border: 1px solid var(--border);
      background: var(--bg-surface);
      border-radius: 5px;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-edit-mini:hover {
      background: var(--bg-surface-alt);
      color: #667eea;
      border-color: #667eea;
    }

    .btn-delete-mini:hover {
      background: #fef2f2;
      color: #dc2626;
      border-color: #fecaca;
    }

    /* Expanded Tasks Section */
    .list-expanded {
      padding: 0.75rem 1rem 1rem;
      background: var(--bg-surface-hover);
      border-top: 1px solid var(--border);
    }

    .expanded-tasks {
      max-width: 600px;
      margin-left: 40px;
    }

    .tasks-header-expanded {
      margin-bottom: 0.5rem;
    }

    .tasks-title-expanded {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-tertiary);
    }

    .tasks-list-expanded {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .task-item-expanded {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.5rem;
      background: var(--bg-surface);
      border-radius: 6px;
      border: 1px solid var(--border);
      transition: all 0.2s ease;
    }

    .task-item-expanded:hover {
      border-color: var(--border-medium);
    }

    .task-item-expanded.completed {
      opacity: 0.6;
    }

    .task-item-expanded.completed .task-title-expanded {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .task-item-expanded.in-progress {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
      border-color: rgba(102, 126, 234, 0.3);
    }

    .in-progress-indicator {
      color: #667eea;
      font-size: 0.6rem;
      margin-right: 0.2rem;
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
      width: 16px;
      height: 16px;
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
      width: 14px;
      height: 14px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .checkbox-container input:checked ~ .checkmark {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: #667eea;
    }

    .checkbox-container input:checked ~ .checkmark::after {
      content: '';
      position: absolute;
      left: 4px;
      top: 1px;
      width: 4px;
      height: 8px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .task-title-expanded {
      flex: 1;
      font-size: 0.8rem;
      color: var(--text-secondary);
      cursor: default;
    }

    .task-edit-input {
      flex: 1;
      font-size: 0.8rem;
      padding: 0.2rem 0.4rem;
      border: 1px solid #667eea;
      border-radius: 4px;
      outline: none;
    }

    .btn-icon-mini {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.2rem;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      opacity: 0;
    }

    .task-item-expanded:hover .btn-icon-mini {
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

    .btn-delete-task:hover {
      color: #dc2626;
      background: #fef2f2;
    }

    .add-task-expanded {
      display: flex;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .add-task-expanded input {
      flex: 1;
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.8rem;
      transition: all 0.2s ease;
    }

    .add-task-expanded input:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn-add-task-mini {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.4rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 6px;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-add-task-mini:hover:not(:disabled) {
      transform: scale(1.05);
    }

    .btn-add-task-mini:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 1200px) {
      .list-header,
      .list-row {
        grid-template-columns: 40px 100px 1fr 110px 80px 80px;
      }

      .col-sistema,
      .col-consultoria {
        display: none;
      }
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

      .filters-row {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-group {
        width: 100%;
      }

      .display-toggle {
        margin-left: 0;
        justify-content: center;
      }

      .list-header {
        display: none;
      }

      .list-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.75rem;
      }

      .col-expand {
        order: 1;
      }

      .col-code {
        order: 2;
        flex: 1;
      }

      .col-title {
        order: 3;
        width: 100%;
        white-space: normal;
      }

      .col-status {
        order: 4;
      }

      .col-priority {
        order: 5;
      }

      .col-progress {
        order: 6;
        flex: 1;
      }

      .col-actions {
        order: 7;
      }

      .expanded-tasks {
        margin-left: 0;
      }

      .kanban-board {
        flex-direction: column;
      }

      .kanban-column {
        flex: 1 1 auto !important;
        max-height: none !important;
      }
    }

    /* ===== Kanban View ===== */
    .kanban-board {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      padding-bottom: 1rem;
      height: calc(100vh - 280px);
    }

    .kanban-board::-webkit-scrollbar {
      height: 6px;
    }

    .kanban-board::-webkit-scrollbar-track {
      background: var(--bg-surface-alt);
      border-radius: 3px;
    }

    .kanban-board::-webkit-scrollbar-thumb {
      background: var(--border-medium);
      border-radius: 3px;
    }

    .kanban-column {
      flex: 0 0 290px;
      display: flex;
      flex-direction: column;
      background: var(--bg-surface);
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
      height: 100%;
      overflow: hidden;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }

    .kanban-column.drag-over {
      border-color: var(--accent);
      background: var(--accent-bg);
    }

    .column-header {
      padding: 0.875rem 1rem;
      border-top: 3px solid;
      border-radius: 12px 12px 0 0;
      background: var(--bg-surface-hover);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .column-header-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .column-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .column-count {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-tertiary);
      background: var(--bg-surface);
      padding: 0.125rem 0.5rem;
      border-radius: 10px;
    }

    .column-body {
      flex: 1;
      overflow-y: auto;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }

    .column-body::-webkit-scrollbar {
      width: 4px;
    }

    .column-body::-webkit-scrollbar-track {
      background: transparent;
    }

    .column-body::-webkit-scrollbar-thumb {
      background: var(--border-medium);
      border-radius: 2px;
    }

    .kanban-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      transition: all 0.15s ease;
      user-select: none;
      overflow: hidden;
    }

    .kanban-card:hover {
      border-color: var(--accent);
      box-shadow: var(--shadow-md);
    }

    .kanban-card.dragging {
      opacity: 0.4;
      transform: rotate(2deg) scale(0.98);
    }

    .kanban-card.kanban-expanded {
      border-color: var(--accent);
    }

    .kanban-card-header {
      padding: 0.875rem;
      cursor: grab;
    }

    .kanban-card-header:active {
      cursor: grabbing;
    }

    .kanban-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .kanban-code {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--accent);
      background: var(--accent-bg);
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    .kanban-priority {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 10px;
    }

    .kanban-title {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-primary);
      margin: 0 0 0.5rem;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .kanban-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }

    .kanban-sistema {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 600;
      color: #7c3aed;
      background: #f3e8ff;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    :host-context([data-theme="dark"]) .kanban-sistema {
      color: #c4b5fd;
      background: rgba(124, 58, 237, 0.2);
    }

    .kanban-consultoria {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 600;
      color: #0369a1;
      background: #e0f2fe;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    :host-context([data-theme="dark"]) .kanban-consultoria {
      color: #7dd3fc;
      background: rgba(14, 165, 233, 0.15);
    }

    .kanban-progress {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .kanban-progress-bar {
      flex: 1;
      height: 4px;
      background: var(--border);
      border-radius: 2px;
      overflow: hidden;
    }

    .kanban-progress-fill {
      height: 100%;
      background: var(--accent-gradient);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .kanban-progress-text {
      font-size: 0.7rem;
      color: var(--text-tertiary);
      white-space: nowrap;
    }

    .kanban-expanded {
      border-top: 1px solid var(--border);
      animation: fadeIn 0.2s ease;
      display: flex;
      flex-direction: column;
    }

    .kanban-tasks-scroll {
      max-height: 220px;
      overflow-y: auto;
      padding: 0.5rem 0.875rem 0;
    }

    .kanban-tasks-scroll::-webkit-scrollbar {
      width: 3px;
    }

    .kanban-tasks-scroll::-webkit-scrollbar-thumb {
      background: var(--border-medium);
      border-radius: 2px;
    }

    .kanban-expanded-footer {
      padding: 0.5rem 0.875rem 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .kanban-task-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.25rem;
      border-radius: 6px;
      transition: background 0.15s ease;
    }

    .kanban-task-item:hover {
      background: var(--bg-surface-hover);
    }

    .kanban-task-item.completed .kanban-task-title {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .kanban-task-item.in-progress {
      background: var(--accent-bg);
    }

    .kanban-task-title {
      flex: 1;
      font-size: 0.8rem;
      color: var(--text-secondary);
      cursor: default;
    }

    .kanban-add-task {
      display: flex;
      gap: 0.375rem;
      margin-top: 0.5rem;
    }

    .kanban-add-task input {
      flex: 1;
      padding: 0.375rem 0.625rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.8rem;
      background: var(--bg-input);
      color: var(--text-primary);
      transition: border-color 0.2s;
    }

    .kanban-add-task input:focus {
      outline: none;
      border-color: var(--accent);
    }

    .kanban-status-select {
      width: 100%;
      padding: 0.375rem 0.5rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.8rem;
      background: var(--bg-input);
      color: var(--text-primary);
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .kanban-status-select:focus {
      outline: none;
      border-color: var(--accent);
    }

    .kanban-card-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-kanban-edit, .btn-kanban-delete {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      flex: 1;
      padding: 0.375rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-kanban-edit {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
    }

    .btn-kanban-edit:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-medium);
    }

    .btn-kanban-delete {
      background: transparent;
      border: 1px solid #fecaca;
      color: #dc2626;
    }

    .btn-kanban-delete:hover {
      background: #fef2f2;
    }

    .kanban-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      color: var(--text-muted);
      font-size: 0.8rem;
      font-style: italic;
      border: 2px dashed var(--border);
      border-radius: 8px;
      min-height: 80px;
    }

    /* Card Detail Modal */
    .card-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.15s ease;
    }

    .card-modal {
      background: var(--bg-surface);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 100%;
      max-width: 520px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      animation: modalSlideUp 0.2s ease;
    }

    .card-modal-header {
      padding: 1.25rem 1.25rem 1rem;
      border-bottom: 1px solid var(--border);
    }

    .card-modal-top {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .card-modal-close {
      margin-left: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.15s ease;
    }

    .card-modal-close:hover {
      background: var(--bg-surface-alt);
      color: var(--text-secondary);
    }

    .card-modal-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 0.5rem;
      line-height: 1.4;
    }

    .card-modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.25rem;
    }

    .card-modal-section {
      margin-bottom: 1rem;
    }

    .card-modal-section:last-child {
      margin-bottom: 0;
    }

    .card-modal-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .card-modal-tasks-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .card-modal-tasks-header .card-modal-label {
      margin-bottom: 0;
    }

    .card-modal-tasks-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: 0.75rem;
    }

    .card-modal-tasks-list .kanban-task-item .btn-icon-mini {
      opacity: 1;
    }

    .card-modal-footer {
      padding: 0.875rem 1.25rem;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 0.5rem;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class DemandsComponent {
  private authService = inject(AuthService);
  private demandService = inject(DemandService);
  private router = inject(Router);
  private releaseDocService = inject(ReleaseDocumentService);
  readonly releaseDocTaskTitle = RELEASE_DOC_TASK_TITLE;

  demands = this.demandService.demands;
  loading = this.demandService.loading;

  showCompleted = signal(false);
  displayMode = signal<DisplayMode>('list');
  showModal = signal(false);
  editingDemand = signal<Demand | null>(null);
  expandedDemandId = signal<string | null>(null);
  editingTaskId = signal<string | null>(null);
  newTaskTitle = signal('');

  // Kanban
  draggingDemandId = signal<string | null>(null);
  dragOverStatus = signal<DemandStatus | null>(null);

  // Card detail modal
  cardModalDemandId = signal<string | null>(null);
  cardModalDemand = computed(() => {
    const id = this.cardModalDemandId();
    return id ? this.demands().find(d => d.id === id) ?? null : null;
  });

  private readonly KANBAN_ORDER: DemandStatus[] = [
    'estimativa', 'setup', 'desenvolvimento', 'homologacao', 'op_assistida', 'bloqueado', 'concluido'
  ];

  kanbanColumns = computed(() => {
    if (!this.showCompleted()) {
      return this.KANBAN_ORDER.filter(s => s !== 'concluido');
    }
    return [...this.KANBAN_ORDER];
  });

  getKanbanDemandsForStatus(status: DemandStatus): Demand[] {
    return this.filteredDemands().filter(d => d.status === status);
  }

  onKanbanDragStart(event: DragEvent, demand: Demand): void {
    this.draggingDemandId.set(demand.id);
    event.dataTransfer?.setData('text/plain', demand.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onKanbanDragEnd(): void {
    this.draggingDemandId.set(null);
    this.dragOverStatus.set(null);
  }

  onKanbanDragOver(event: DragEvent, status: DemandStatus): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverStatus.set(status);
  }

  onKanbanDragLeave(event: DragEvent): void {
    const related = event.relatedTarget as HTMLElement;
    const current = event.currentTarget as HTMLElement;
    if (!current.contains(related)) this.dragOverStatus.set(null);
  }

  async onKanbanDrop(event: DragEvent, targetStatus: DemandStatus): Promise<void> {
    event.preventDefault();
    const demandId = event.dataTransfer?.getData('text/plain');
    if (!demandId) return;
    this.dragOverStatus.set(null);
    this.draggingDemandId.set(null);
    await this.demandService.updateStatus(demandId, targetStatus);
  }

  // Filtros
  filterById = signal('');
  filterByConsultoria = signal('');
  filterBySistema = signal('');
  filterByStatus = signal<DemandStatus | ''>('');

  activeDemands = computed(() => 
    this.demands().filter(d => d.status !== 'concluido')
  );

  completedDemands = computed(() => 
    this.demands().filter(d => d.status === 'concluido')
  );

  // Lista de consultorias disponíveis (extraídas das demandas existentes)
  availableConsultorias = computed(() => {
    const consultorias = new Set<string>();
    this.demands().forEach(demand => {
      const consultoriaField = demand.customFields.find(f => f.name === 'Consultoria');
      if (consultoriaField?.value) {
        consultorias.add(consultoriaField.value);
      }
    });
    return Array.from(consultorias).sort();
  });

  // Lista de sistemas disponíveis
  availableSistemas = computed(() => {
    const sistemas = new Set<string>();
    this.demands().forEach(demand => {
      const sistemaField = demand.customFields.find(f => f.name === 'Sistema');
      if (sistemaField?.value) {
        sistemas.add(sistemaField.value);
      }
    });
    return Array.from(sistemas).sort();
  });

  // Lista de opções de status para o filtro
  statusOptions = computed(() => {
    return Object.entries(STATUS_CONFIG).map(([value, config]) => ({
      value: value as DemandStatus,
      config
    }));
  });

  hasActiveFilters = computed(() => {
    return this.filterById().trim() !== '' || 
           this.filterByConsultoria() !== '' || 
           this.filterBySistema() !== '' || 
           this.filterByStatus() !== '';
  });

  filteredDemands = computed(() => {
    const allDemands = this.demands();
    const showCompleted = this.showCompleted();
    const idFilter = this.filterById().trim().toLowerCase();
    const consultoriaFilter = this.filterByConsultoria();
    const sistemaFilter = this.filterBySistema();
    const statusFilter = this.filterByStatus();

    let filtered: Demand[];
    if (showCompleted) {
      filtered = [...allDemands];
    } else {
      filtered = allDemands.filter(d => d.status !== 'concluido');
    }

    // Aplicar filtro por ID
    if (idFilter) {
      filtered = filtered.filter(d => 
        d.code.toLowerCase().includes(idFilter)
      );
    }

    // Aplicar filtro por Consultoria
    if (consultoriaFilter) {
      filtered = filtered.filter(d => {
        const consultoriaField = d.customFields.find(f => f.name === 'Consultoria');
        return consultoriaField?.value === consultoriaFilter;
      });
    }

    // Aplicar filtro por Sistema
    if (sistemaFilter) {
      filtered = filtered.filter(d => {
        const sistemaField = d.customFields.find(f => f.name === 'Sistema');
        return sistemaField?.value === sistemaFilter;
      });
    }

    // Aplicar filtro por Status
    if (statusFilter) {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    // Ordenação apenas por prioridade
    return filtered.sort((a, b) => {
      const priorityA = PRIORITY_ORDER[a.priority] || 0;
      const priorityB = PRIORITY_ORDER[b.priority] || 0;
      return priorityB - priorityA;
    });
  });

  clearFilters(): void {
    this.filterById.set('');
    this.filterByConsultoria.set('');
    this.filterBySistema.set('');
    this.filterByStatus.set('');
  }

  toggleExpand(demandId: string): void {
    if (this.expandedDemandId() === demandId) {
      this.expandedDemandId.set(null);
    } else {
      this.expandedDemandId.set(demandId);
      this.newTaskTitle.set('');
    }
  }

  openCardModal(demand: Demand): void {
    this.cardModalDemandId.set(demand.id);
    this.newTaskTitle.set('');
  }

  closeCardModal(): void {
    this.cardModalDemandId.set(null);
  }

  async deleteDemandFromModal(demandId: string): Promise<void> {
    if (confirm('Tem certeza que deseja excluir esta demanda?')) {
      try {
        this.closeCardModal();
        await this.demandService.deleteDemand(demandId);
      } catch (error) {
        console.error('Error deleting demand:', error);
      }
    }
  }

  getConsultoriaValue(demand: Demand): string {
    const field = demand.customFields.find(f => f.name === 'Consultoria');
    return field?.value || '';
  }

  getSistemaValue(demand: Demand): string {
    const field = demand.customFields.find(f => f.name === 'Sistema');
    return field?.value || '';
  }

  getStatusConfig(status: DemandStatus) {
    return STATUS_CONFIG[status] || STATUS_CONFIG['setup'];
  }

  async changeStatus(demandId: string, status: DemandStatus): Promise<void> {
    await this.demandService.updateStatus(demandId, status);
  }

  getPriorityConfig(priority: Demand['priority']) {
    return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['medium'];
  }

  getTaskProgress(demand: Demand): number {
    if (demand.tasks.length === 0) return 0;
    const completed = demand.tasks.filter(t => t.completed).length;
    return (completed / demand.tasks.length) * 100;
  }

  getCompletedTasksCount(demand: Demand): number {
    return demand.tasks.filter(t => t.completed).length;
  }

  // Task actions
  async toggleTask(demandId: string, task: Task): Promise<void> {
    await this.demandService.toggleTask(demandId, task.id);
  }

  async addTask(demandId: string): Promise<void> {
    const title = this.newTaskTitle().trim();
    if (!title) return;

    await this.demandService.addTask(demandId, title);
    this.newTaskTitle.set('');
  }

  async saveTaskEdit(event: Event, demandId: string, task: Task): Promise<void> {
    const input = event.target as HTMLInputElement;
    const newTitle = input.value.trim();
    
    if (newTitle && newTitle !== task.title) {
      await this.demandService.updateTask(demandId, task.id, { title: newTitle });
    }
    
    this.editingTaskId.set(null);
  }

  async deleteTask(demandId: string, task: Task): Promise<void> {
    await this.demandService.deleteTask(demandId, task.id);
  }

  async setInProgress(demandId: string, task: Task): Promise<void> {
    await this.demandService.setTaskInProgress(demandId, task.id);
  }

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

  async saveDemand(data: { code: string; title: string; priority: Demand['priority']; status: Demand['status']; consultoria: string; sistema: string; useDefaultTasks: boolean }): Promise<void> {
    try {
      const editing = this.editingDemand();
      if (editing) {
        await this.demandService.updateDemand(editing.id, {
          code: data.code,
          title: data.title,
          priority: data.priority,
          status: data.status
        });
        await this.demandService.updateConsultoria(editing.id, data.consultoria);
        await this.demandService.updateSistema(editing.id, data.sistema);
      } else {
        await this.demandService.createDemand(data.code, data.title, data.priority, data.useDefaultTasks, data.status, data.consultoria, data.sistema);
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

  openReleaseDoc(demand: Demand, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const existing = this.releaseDocService.getByDemandId(demand.id);
    if (existing) {
      this.router.navigate(['/documentos-release', existing.id]);
    } else {
      this.router.navigate(['/documentos-release/novo'], { queryParams: { demandId: demand.id } });
    }
  }
}
