import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, DemandService, Demand, Task, STATUS_CONFIG, DemandStatus, PRIORITY_CONFIG, PRIORITY_ORDER, Priority, STATUS_CRITICALITY } from '../../core';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  template: `
    <div class="dashboard-container">
      <app-header />
      
      <main class="main-content">
        <!-- Welcome Section -->
        <section class="welcome-section">
          <div class="welcome-content">
            <div class="welcome-text">
              <span class="greeting">{{ getGreeting() }},</span>
              <h1>{{ firstName() }}! 👋</h1>
              <p class="date-info">
                <span class="today">{{ todayFormatted() }}</span>
              </p>
            </div>
            @if (user()?.photoURL) {
              <img [src]="user()?.photoURL" [alt]="user()?.displayName" class="welcome-avatar">
            }
          </div>
        </section>

        <!-- Stats Cards -->
        <section class="stats-section stats-compact">
          <div class="stat-card stat-card-compact">
            <div class="stat-icon blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ totalDemands() }}</span>
              <span class="stat-label">Total</span>
            </div>
          </div>

          <div class="stat-card stat-card-compact">
            <div class="stat-icon orange">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ activeDemands() }}</span>
              <span class="stat-label">Ativas</span>
            </div>
          </div>

          <div class="stat-card stat-card-compact">
            <div class="stat-icon green">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ completedDemands() }}</span>
              <span class="stat-label">Concluídas</span>
            </div>
          </div>
        </section>

        <!-- Tarefas por Status -->
        <section class="priority-tasks-section">
          <div class="section-header">
            <h2>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 8 4-4 4 4"/>
                <path d="M7 4v16"/>
                <path d="M11 12h4"/>
                <path d="M11 16h7"/>
                <path d="M11 20h10"/>
              </svg>
              Tarefas Pendentes
            </h2>
            <span class="pending-count">{{ pendingTasksCount() }} pendente(s)</span>
          </div>
          
          @if (tasksByStatus().length > 0) {
            <div class="status-groups">
              @for (group of tasksByStatus(); track group.status) {
                <div class="status-group" [class.collapsed]="!isStatusExpanded(group.status)">
                  <button class="status-group-header" [style.border-left-color]="group.statusConfig.color" (click)="toggleStatusExpand(group.status)">
                    <span class="expand-icon" [class.expanded]="isStatusExpanded(group.status)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </span>
                    <span class="status-group-icon">{{ group.statusConfig.icon }}</span>
                    <span class="status-group-label" [style.color]="group.statusConfig.color">{{ group.statusConfig.label }}</span>
                    <span class="status-group-count">{{ group.tasks.length }}</span>
                  </button>
                  @if (isStatusExpanded(group.status)) {
                    <div class="status-group-tasks">
                      @for (item of group.tasks; track item.task.id) {
                        <div class="priority-task-item" [class.in-progress]="item.task.inProgress">
                          <div class="task-info">
                            <div class="task-meta">
                              <span class="task-demand-code">{{ item.demandCode }}</span>
                              @if (item.sistema) {
                                <span class="task-sistema-badge">{{ item.sistema }}</span>
                              }
                              @if (item.task.inProgress) {
                                <span class="in-progress-badge">
                                  <span class="pulse-dot-mini"></span>
                                  Em execução
                                </span>
                              }
                            </div>
                            <span class="task-title-text">{{ item.task.title }}</span>
                          </div>
                          <a routerLink="/demandas" class="btn-go-task-mini" title="Ver demanda">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="m9 18 6-6-6-6"/>
                            </svg>
                          </a>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="empty-priority-tasks">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <p>Nenhuma tarefa pendente!</p>
              <span>Todas as tarefas foram concluídas</span>
            </div>
          }
        </section>

        <!-- Current Task Section -->
        @if (currentTask()) {
          <section class="current-task-section">
            <div class="current-task-content">
              <div class="current-task-indicator">
                <span class="pulse-dot"></span>
                <span class="label">Executando agora</span>
              </div>
              <div class="current-task-info">
                <span class="task-demand-code">{{ currentTask()!.demand.code }}</span>
                <h3 class="task-title">{{ currentTask()!.task.title }}</h3>
                <p class="task-demand-title">{{ currentTask()!.demand.title }}</p>
              </div>
              <a routerLink="/demandas" class="btn-go-task">
                Ver demanda →
              </a>
            </div>
          </section>
        }

        <div class="content-grid">
          <!-- Daily Report Section -->
          <section class="daily-report-section">
            <div class="section-header">
              <h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Report para Daily
              </h2>
              <div class="report-actions">
                <a routerLink="/daily-report" class="btn-edit-report">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                  </svg>
                  Editar
                </a>
                <button class="btn-copy" (click)="copyDailyReport()" [disabled]="!dailyReport()">
                  @if (copied()) {
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Copiado!
                  } @else {
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copiar
                  }
                </button>
              </div>
            </div>
            <div class="report-content">
              @if (groupedCompletedTasks().length > 0) {
                <div class="report-grouped">
                  @for (group of groupedCompletedTasks(); track group.sistema) {
                    <div class="report-system-group">
                      <span class="system-label">{{ group.sistema }}</span>
                      @for (demand of group.demands; track demand.code) {
                        <div class="report-demand">
                          <span class="demand-code-mini">{{ demand.code }}</span>
                          <span class="task-count">{{ demand.tasks.length }} tarefa(s)</span>
                        </div>
                      }
                    </div>
                  }
                </div>
                <a routerLink="/daily-report" class="btn-view-full">Ver report completo →</a>
              } @else {
                <div class="empty-report">
                  <p>Nenhuma tarefa concluída nas últimas 24h</p>
                  <span>Complete tarefas para gerar o report</span>
                  <a routerLink="/daily-report" class="btn-add-manual">Adicionar item manual</a>
                </div>
              }
            </div>
          </section>

          <!-- Status Overview -->
          <section class="status-overview-section">
            <div class="section-header">
              <h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                Demandas por Status
              </h2>
              <a routerLink="/demandas" class="btn-link">Ver todas →</a>
            </div>
            <div class="status-list">
              @for (status of statusList; track status.key) {
                <div class="status-item">
                  <div class="status-info">
                    <span class="status-icon">{{ status.config.icon }}</span>
                    <span class="status-name">{{ status.config.label }}</span>
                  </div>
                  <div class="status-bar-container">
                    <div 
                      class="status-bar" 
                      [style.width.%]="getStatusPercentage(status.key)"
                      [style.background]="status.config.color">
                    </div>
                  </div>
                  <span class="status-count" [style.color]="status.config.color">
                    {{ getStatusCount(status.key) }}
                  </span>
                </div>
              }
            </div>
          </section>
        </div>

        <!-- Recent Activity -->
        <section class="recent-section">
          <div class="section-header">
            <h2>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Demandas Recentes
            </h2>
            <a routerLink="/demandas" class="btn-link">Ver todas →</a>
          </div>
          <div class="recent-demands">
            @if (recentDemands().length > 0) {
              @for (demand of recentDemands(); track demand.id) {
                <a [routerLink]="['/demandas']" class="demand-item">
                  <div class="demand-header">
                    <span class="demand-code">{{ demand.code }}</span>
                    <span 
                      class="demand-status" 
                      [style.background]="getStatusConfig(demand.status).bgColor"
                      [style.color]="getStatusConfig(demand.status).color">
                      {{ getStatusConfig(demand.status).icon }} {{ getStatusConfig(demand.status).label }}
                    </span>
                  </div>
                  <h4 class="demand-title">{{ demand.title }}</h4>
                  <div class="demand-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="getTaskProgress(demand)"></div>
                    </div>
                    <span class="progress-text">{{ getCompletedTasksCount(demand) }}/{{ demand.tasks.length }} tarefas</span>
                  </div>
                </a>
              }
            } @else {
              <div class="empty-recent">
                <p>Nenhuma demanda criada ainda</p>
                <a routerLink="/demandas" class="btn-primary">Criar Demanda</a>
              </div>
            }
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #f3f4f6;
    }

    .main-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Welcome Section */
    .welcome-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      padding: 2rem;
      margin-bottom: 2rem;
      color: white;
    }

    .welcome-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .greeting {
      font-size: 1rem;
      opacity: 0.9;
    }

    .welcome-text h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0.25rem 0 0.5rem;
    }

    .date-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }

    .today {
      font-size: 1rem;
      opacity: 0.9;
      text-transform: capitalize;
    }

    .welcome-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: 4px solid rgba(255, 255, 255, 0.3);
    }

    /* Stats Section */
    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stats-section.stats-compact {
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;

    }

    .stat-card.stat-card-compact {
      padding: 1rem;
      border-radius: 12px;
    }

    .stat-card-compact .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
    }

    .stat-card-compact .stat-value {
      font-size: 1.5rem;
    }

    .stat-card-compact .stat-label {
      font-size: 0.75rem;
    }

    /* Tarefas por Status */
    .priority-tasks-section {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .priority-tasks-section .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .priority-tasks-section .section-header h2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .priority-tasks-section .section-header h2 svg {
      color: #667eea;
    }

    .pending-count {
      background: #f3f4f6;
      color: #6b7280;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status-groups {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .status-group {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }

    .status-group-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: #f9fafb;
      border: none;
      border-left: 4px solid;
      cursor: pointer;
      transition: background 0.2s ease;
      text-align: left;
    }

    .status-group-header:hover {
      background: #f3f4f6;
    }

    .expand-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      transition: transform 0.2s ease;
    }

    .expand-icon.expanded {
      transform: rotate(90deg);
    }

    .status-group.collapsed .status-group-header {
      border-radius: 10px;
    }

    .status-group-icon {
      font-size: 0.9rem;
    }

    .status-group-label {
      font-size: 0.8rem;
      font-weight: 600;
    }

    .status-group-count {
      margin-left: auto;
      font-size: 0.7rem;
      font-weight: 600;
      color: #6b7280;
      background: white;
      padding: 0.125rem 0.5rem;
      border-radius: 10px;
    }

    .status-group-tasks {
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .priority-task-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: white;
      border-radius: 8px;
      transition: all 0.2s ease;
      border: 1px solid #f3f4f6;
    }

    .priority-task-item:hover {
      background: #f9fafb;
      border-color: #e5e7eb;
    }

    .priority-task-item.in-progress {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
      border: 1px solid rgba(102, 126, 234, 0.3);
    }

    .task-sistema-badge {
      font-size: 0.65rem;
      font-weight: 600;
      color: #7c3aed;
      background: #f3e8ff;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    .task-info {
      flex: 1;
      min-width: 0;
    }

    .task-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
      flex-wrap: wrap;
    }

    .task-demand-code {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.7rem;
      font-weight: 600;
      color: #667eea;
      background: #eef2ff;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    .task-priority-badge {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    .in-progress-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.65rem;
      font-weight: 600;
      color: #667eea;
      background: white;
      padding: 0.125rem 0.5rem;
      border-radius: 10px;
    }

    .pulse-dot-mini {
      width: 6px;
      height: 6px;
      background: #667eea;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    .task-title-text {
      display: block;
      font-size: 0.9rem;
      font-weight: 500;
      color: #1f2937;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-demand-name {
      display: block;
      font-size: 0.75rem;
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-go-task-mini {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #6b7280;
      text-decoration: none;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .btn-go-task-mini:hover {
      background: #667eea;
      border-color: #667eea;
      color: white;
    }

    .empty-priority-tasks {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      color: #10b981;
      text-align: center;
    }

    .empty-priority-tasks svg {
      margin-bottom: 0.75rem;
    }

    .empty-priority-tasks p {
      margin: 0;
      font-weight: 600;
      font-size: 1rem;
    }

    .empty-priority-tasks span {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    }

    .stat-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon.blue {
      background: #eef2ff;
      color: #667eea;
    }

    .stat-icon.orange {
      background: #fff7ed;
      color: #f59e0b;
    }

    .stat-icon.green {
      background: #d1fae5;
      color: #10b981;
    }

    .stat-icon.purple {
      background: #f3e8ff;
      color: #8b5cf6;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #6b7280;
    }

    /* Current Task Section */
    .current-task-section {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border: 2px solid rgba(102, 126, 234, 0.3);
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 2rem;
      animation: pulse-border 2s infinite;
    }

    @keyframes pulse-border {
      0%, 100% { border-color: rgba(102, 126, 234, 0.3); }
      50% { border-color: rgba(102, 126, 234, 0.6); }
    }

    .current-task-content {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .current-task-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      flex-shrink: 0;
    }

    .pulse-dot {
      width: 10px;
      height: 10px;
      background: #667eea;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
    }

    .current-task-indicator .label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #667eea;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .current-task-info {
      flex: 1;
    }

    .task-demand-code {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.75rem;
      font-weight: 600;
      color: #667eea;
      background: white;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
    }

    .current-task-info .task-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0.375rem 0 0.25rem;
    }

    .current-task-info .task-demand-title {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    .btn-go-task {
      padding: 0.625rem 1.25rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #667eea;
      text-decoration: none;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .btn-go-task:hover {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    /* Daily Report Section */
    .daily-report-section, .status-overview-section, .recent-section {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-header h2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }

    .section-header h2 svg {
      color: #667eea;
    }

    .report-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-edit-report {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.75rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      color: #6b7280;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-edit-report:hover {
      background: #f3f4f6;
      color: #667eea;
      border-color: #667eea;
    }

    .btn-copy {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      background: #eef2ff;
      border: none;
      border-radius: 8px;
      color: #667eea;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-copy:hover:not(:disabled) {
      background: #667eea;
      color: white;
    }

    .btn-copy:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-link {
      font-size: 0.875rem;
      font-weight: 500;
      color: #667eea;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .btn-link:hover {
      color: #764ba2;
    }

    .report-content {
      background: #f9fafb;
      border-radius: 12px;
      padding: 1rem;
      min-height: 150px;
    }

    .report-text {
      margin: 0;
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.85rem;
      color: #374151;
      white-space: pre-wrap;
      line-height: 1.6;
    }

    .report-grouped {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .report-system-group {
      background: #f9fafb;
      border-radius: 8px;
      padding: 0.75rem;
    }

    .system-label {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      color: #7c3aed;
      background: #f3e8ff;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .report-demand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
      margin-left: 0.5rem;
    }

    .demand-code-mini {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.7rem;
      font-weight: 600;
      color: #667eea;
      background: #eef2ff;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    .task-count {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .btn-view-full {
      display: block;
      text-align: center;
      padding: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #667eea;
      text-decoration: none;
      border-top: 1px solid #e5e7eb;
      margin-top: 0.5rem;
      transition: color 0.2s ease;
    }

    .btn-view-full:hover {
      color: #764ba2;
    }

    .btn-add-manual {
      display: inline-block;
      margin-top: 0.75rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #667eea;
      background: #eef2ff;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .btn-add-manual:hover {
      background: #667eea;
      color: white;
    }

    .empty-report {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 120px;
      color: #9ca3af;
      text-align: center;
    }

    .empty-report p {
      margin: 0;
      font-weight: 500;
    }

    .empty-report span {
      font-size: 0.875rem;
    }

    /* Status Overview */
    .status-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .status-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 140px;
    }

    .status-icon {
      font-size: 1rem;
    }

    .status-name {
      font-size: 0.875rem;
      color: #374151;
    }

    .status-bar-container {
      flex: 1;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }

    .status-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .status-count {
      min-width: 30px;
      text-align: right;
      font-weight: 600;
      font-size: 0.875rem;
    }

    /* Recent Demands */
    .recent-demands {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .demand-item {
      display: block;
      background: #f9fafb;
      border-radius: 12px;
      padding: 1rem;
      text-decoration: none;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .demand-item:hover {
      background: white;
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    }

    .demand-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .demand-code {
      font-family: 'SF Mono', 'Consolas', monospace;
      font-size: 0.75rem;
      font-weight: 600;
      color: #667eea;
      background: #eef2ff;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
    }

    .demand-status {
      font-size: 0.7rem;
      font-weight: 500;
      padding: 0.125rem 0.5rem;
      border-radius: 10px;
    }

    .demand-title {
      font-size: 0.95rem;
      font-weight: 500;
      color: #1f2937;
      margin: 0 0 0.75rem;
      line-height: 1.4;
    }

    .demand-progress {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .progress-bar {
      flex: 1;
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

    .progress-text {
      font-size: 0.75rem;
      color: #6b7280;
      white-space: nowrap;
    }

    .empty-recent {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: #9ca3af;
      text-align: center;
    }

    .empty-recent p {
      margin: 0 0 1rem;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .main-content {
        padding: 1rem;
      }

      .welcome-content {
        flex-direction: column-reverse;
        text-align: center;
        gap: 1rem;
      }

      .welcome-avatar {
        width: 60px;
        height: 60px;
      }

      .welcome-text h1 {
        font-size: 1.5rem;
      }

      .stats-section.stats-compact {
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
      }

      .stat-card-compact .stat-value {
        font-size: 1.25rem;
      }

      .stat-card-compact .stat-label {
        font-size: 0.65rem;
      }

      .priority-tasks-section {
        padding: 1rem;
      }

      .priority-task-item {
        padding: 0.5rem;
      }

      .task-title-text {
        font-size: 0.85rem;
      }

      .recent-demands {
        grid-template-columns: 1fr;
      }

      .current-task-content {
        flex-direction: column;
        text-align: center;
      }

      .btn-go-task {
        width: 100%;
        text-align: center;
      }
    }
  `]
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private demandService = inject(DemandService);

  user = this.authService.user;
  demands = this.demandService.demands;
  copied = signal(false);
  expandedStatuses = signal<Set<DemandStatus>>(new Set(['bloqueado', 'desenvolvimento', 'homologacao']));

  firstName = computed(() => {
    const name = this.user()?.displayName;
    if (!name) return 'Usuário';
    const parts = name.split(' ');
    return parts[0] || 'Usuário';
  });

  statusList = Object.entries(STATUS_CONFIG).map(([key, config]) => ({
    key: key as DemandStatus,
    config
  }));

  // Computed values
  totalDemands = computed(() => this.demands().length);
  activeDemands = computed(() => this.demands().filter(d => d.status !== 'concluido').length);
  completedDemands = computed(() => this.demands().filter(d => d.status === 'concluido').length);

  // Tarefas pendentes ordenadas por prioridade
  // Tarefas agrupadas por status e ordenadas por criticidade
  tasksByStatus = computed(() => {
    const grouped = new Map<DemandStatus, { 
      task: Task; 
      demandCode: string; 
      demandTitle: string;
      sistema: string;
    }[]>();

    this.demands()
      .filter(d => d.status !== 'concluido')
      .forEach(demand => {
        const sistema = demand.customFields.find(f => f.name === 'Sistema')?.value || '';
        
        demand.tasks
          .filter(t => !t.completed)
          .forEach(task => {
            if (!grouped.has(demand.status)) {
              grouped.set(demand.status, []);
            }
            grouped.get(demand.status)!.push({
              task,
              demandCode: demand.code,
              demandTitle: demand.title,
              sistema
            });
          });
      });

    // Converter para array e ordenar por criticidade do status
    const result: { 
      status: DemandStatus; 
      statusConfig: typeof STATUS_CONFIG[DemandStatus];
      tasks: { task: Task; demandCode: string; demandTitle: string; sistema: string }[];
    }[] = [];

    grouped.forEach((tasks, status) => {
      // Ordenar tarefas dentro do grupo: em progresso primeiro
      const sortedTasks = tasks.sort((a, b) => {
        if (a.task.inProgress && !b.task.inProgress) return -1;
        if (!a.task.inProgress && b.task.inProgress) return 1;
        return 0;
      });

      result.push({
        status,
        statusConfig: STATUS_CONFIG[status],
        tasks: sortedTasks.slice(0, 5) // Limitar a 5 tarefas por status
      });
    });

    // Ordenar grupos por criticidade do status (maior primeiro)
    return result.sort((a, b) => 
      (STATUS_CRITICALITY[b.status] || 0) - (STATUS_CRITICALITY[a.status] || 0)
    );
  });

  pendingTasksCount = computed(() => {
    return this.demands()
      .filter(d => d.status !== 'concluido')
      .reduce((acc, d) => acc + d.tasks.filter(t => !t.completed).length, 0);
  });

  currentTask = computed(() => {
    for (const demand of this.demands()) {
      const task = demand.tasks.find(t => t.inProgress && !t.completed);
      if (task) {
        return { task, demand };
      }
    }
    return null;
  });

  recentDemands = computed(() => {
    return [...this.demands()]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 6);
  });

  // Tarefas concluídas nas últimas 24h (baseado em quando a demanda foi atualizada)
  recentCompletedTasks = computed(() => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const tasks: { task: Task; demandCode: string; demandTitle: string; sistema: string }[] = [];

    this.demands().forEach(demand => {
      const sistema = demand.customFields.find(f => f.name === 'Sistema')?.value || 'Sem Sistema';
      
      demand.tasks.forEach(task => {
        if (task.completed) {
          // Se a demanda foi atualizada nas últimas 24h, consideramos as tarefas concluídas
          if (demand.updatedAt >= oneDayAgo) {
            tasks.push({
              task,
              demandCode: demand.code,
              demandTitle: demand.title,
              sistema
            });
          }
        }
      });
    });

    return tasks;
  });

  // Agrupa tarefas por Sistema e Demanda para exibição no dashboard
  groupedCompletedTasks = computed(() => {
    const tasks = this.recentCompletedTasks();
    const grouped = new Map<string, Map<string, { code: string; title: string; tasks: Task[] }>>();

    tasks.forEach(item => {
      if (!grouped.has(item.sistema)) {
        grouped.set(item.sistema, new Map());
      }

      const sistemaDemands = grouped.get(item.sistema)!;
      if (!sistemaDemands.has(item.demandCode)) {
        sistemaDemands.set(item.demandCode, {
          code: item.demandCode,
          title: item.demandTitle,
          tasks: []
        });
      }

      sistemaDemands.get(item.demandCode)!.tasks.push(item.task);
    });

    const result: { sistema: string; demands: { code: string; title: string; tasks: Task[] }[] }[] = [];
    grouped.forEach((demands, sistema) => {
      result.push({
        sistema,
        demands: Array.from(demands.values())
      });
    });

    return result.sort((a, b) => a.sistema.localeCompare(b.sistema));
  });

  dailyReport = computed(() => {
    const groups = this.groupedCompletedTasks();
    if (groups.length === 0) return '';

    let report = `📋 Daily Report - ${this.todayFormatted()}\n`;
    report += `${'─'.repeat(35)}\n\n`;

    groups.forEach(group => {
      report += `📦 ${group.sistema}\n`;
      group.demands.forEach(demand => {
        report += `   ${demand.code}\n`;
        demand.tasks.forEach(task => {
          report += `   • ${task.title}\n`;
        });
      });
      report += '\n';
    });

    return report.trim();
  });

  todayFormatted = computed(() => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return new Date().toLocaleDateString('pt-BR', options);
  });

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  isStatusExpanded(status: DemandStatus): boolean {
    return this.expandedStatuses().has(status);
  }

  toggleStatusExpand(status: DemandStatus): void {
    const current = new Set(this.expandedStatuses());
    if (current.has(status)) {
      current.delete(status);
    } else {
      current.add(status);
    }
    this.expandedStatuses.set(current);
  }

  getStatusConfig(status: DemandStatus) {
    return STATUS_CONFIG[status] || STATUS_CONFIG['setup'];
  }

  getStatusCount(status: DemandStatus): number {
    return this.demands().filter(d => d.status === status).length;
  }

  getStatusPercentage(status: DemandStatus): number {
    const total = this.totalDemands();
    if (total === 0) return 0;
    return (this.getStatusCount(status) / total) * 100;
  }

  getTaskProgress(demand: Demand): number {
    if (demand.tasks.length === 0) return 0;
    const completed = demand.tasks.filter(t => t.completed).length;
    return (completed / demand.tasks.length) * 100;
  }

  getCompletedTasksCount(demand: Demand): number {
    return demand.tasks.filter(t => t.completed).length;
  }

  async copyDailyReport(): Promise<void> {
    const report = this.dailyReport();
    if (!report) return;

    try {
      await navigator.clipboard.writeText(report);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }
}
