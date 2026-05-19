import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, DemandService, Demand, STATUS_CONFIG, DemandStatus, DailyTasksService, DailyTask, todayDateString } from '../../core';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
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

        <!-- Current Task Section - Executando agora (em destaque no início) -->
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
              <div class="current-task-actions">
                <button 
                  type="button"
                  class="btn-complete-task" 
                  (click)="completeCurrentTask()"
                  title="Concluir tarefa">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Concluir
                </button>
                <a routerLink="/demandas" class="btn-go-task">
                  Ver demanda →
                </a>
              </div>
            </div>
          </section>
        }

        <!-- Tarefas do dia -->
        <section class="daily-tasks-section">
          <div class="section-header">
            <h2>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Tarefas do dia
            </h2>
            <div class="daily-header-right">
              <span class="pending-count">{{ dailyDoneCount() }}/{{ dailyTasks().length }} concluídas</span>
              <a routerLink="/tarefas-do-dia" class="btn-link">Ver todas →</a>
            </div>
          </div>

          <div class="daily-progress-bar" role="progressbar" [attr.aria-valuenow]="dailyDoneCount()" [attr.aria-valuemin]="0" [attr.aria-valuemax]="dailyTasks().length || 1">
            <div class="daily-progress-fill" [style.width.%]="dailyProgressPercent()"></div>
          </div>

          <div class="daily-add-bar">
            <input
              type="text"
              class="daily-add-input"
              placeholder="Nova mini tarefa..."
              [ngModel]="newDailyTaskTitle()"
              (ngModelChange)="newDailyTaskTitle.set($event)"
              (keydown.enter)="addDailyTask()"
              aria-label="Nova tarefa do dia" />
            <button type="button" class="btn-daily-add" (click)="addDailyTask()" [disabled]="!newDailyTaskTitle().trim()">
              Adicionar
            </button>
          </div>

          @if (sortedDailyTasks().length > 0) {
            <ul class="daily-task-list">
              @for (task of sortedDailyTasks(); track task.id) {
                <li class="daily-task-item" [class.done]="task.status === 'done'">
                  <label class="checkbox-container-mini">
                    <input
                      type="checkbox"
                      [checked]="task.status === 'done'"
                      (change)="toggleDailyTask(task)"
                      [attr.aria-label]="'Marcar ' + task.title + ' como concluída'" />
                    <span class="checkmark-mini"></span>
                  </label>
                  <div class="task-info">
                    <span class="task-title-text">{{ task.title }}</span>
                    <div class="task-meta">
                      @if (task.demandCode) {
                        <span class="task-demand-code">{{ task.demandCode }}</span>
                      }
                      @if (task.sistema) {
                        <span class="task-sistema-badge">{{ task.sistema }}</span>
                      }
                      @if (task.source === 'demand') {
                        <span class="task-source-badge">Demanda</span>
                      }
                    </div>
                  </div>
                </li>
              }
            </ul>
          } @else {
            <div class="empty-priority-tasks">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <p>Nenhuma tarefa para hoje</p>
              <span>Adicione mini tarefas acima ou conclua tarefas nas demandas</span>
            </div>
          }
        </section>

        <!-- Status Overview - Big Numbers -->
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
          <div class="status-cards-grid">
            @for (status of statusList; track status.key) {
              <a routerLink="/demandas" class="status-number-card" [style.border-top-color]="status.config.color">
                <span class="status-card-icon">{{ status.config.icon }}</span>
                <span class="status-card-number" [style.color]="status.config.color">{{ getStatusCount(status.key) }}</span>
                <span class="status-card-label">{{ status.config.label }}</span>
              </a>
            }
          </div>
        </section>

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
      background: var(--bg-page);
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
      background: var(--bg-surface);
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

    /* Tarefas do dia */
    .daily-tasks-section {
      background: var(--bg-surface);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: var(--shadow-sm);
    }

    .daily-tasks-section .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .daily-tasks-section .section-header h2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .daily-tasks-section .section-header h2 svg {
      color: var(--accent);
    }

    .daily-header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .daily-progress-bar {
      height: 8px;
      background: var(--bg-surface-hover);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .daily-progress-fill {
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .daily-add-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .daily-add-input {
      flex: 1;
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 0.875rem;
      background: var(--bg-surface);
      color: var(--text-primary);
    }

    .daily-add-input:focus {
      outline: none;
      border-color: var(--accent);
    }

    .btn-daily-add {
      padding: 0.625rem 1rem;
      background: var(--accent);
      border: none;
      border-radius: 10px;
      color: white;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
    }

    .btn-daily-add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .daily-task-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .daily-task-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      background: var(--bg-surface-hover);
      border-radius: 8px;
      border: 1px solid var(--border-light);
    }

    .daily-task-item.done .task-title-text {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .task-source-badge {
      font-size: 0.65rem;
      font-weight: 600;
      color: #0369a1;
      background: #e0f2fe;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
    }

    .priority-tasks-section {
      background: var(--bg-surface);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: var(--shadow-sm);
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
      color: var(--text-primary);
      margin: 0;
    }

    .priority-tasks-section .section-header h2 svg {
      color: var(--accent);
    }

    .pending-count {
      background: var(--bg-surface-alt);
      color: var(--text-tertiary);
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
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
    }

    .status-group-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--bg-surface-hover);
      border: none;
      border-left: 4px solid;
      cursor: pointer;
      transition: background 0.2s ease;
      text-align: left;
    }

    .status-group-header:hover {
      background: var(--bg-surface-alt);
    }

    .expand-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
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
      color: var(--text-tertiary);
      background: var(--bg-surface);
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
      background: var(--bg-surface);
      border-radius: 8px;
      transition: all 0.2s ease;
      border: 1px solid var(--border-light);
    }

    .priority-task-item:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border);
    }

    .priority-task-item.in-progress {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
      border: 1px solid rgba(102, 126, 234, 0.3);
    }

    .checkbox-container-mini {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .checkbox-container-mini input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      width: 100%;
      height: 100%;
    }

    .checkmark-mini {
      position: relative;
      width: 18px;
      height: 18px;
      border: 2px solid #d1d5db;
      border-radius: 5px;
      transition: all 0.2s ease;
    }

    .checkbox-container-mini input:checked ~ .checkmark-mini {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: #667eea;
    }

    .checkbox-container-mini input:checked ~ .checkmark-mini::after {
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

    .task-actions-mini {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex-shrink: 0;
    }

    .btn-icon-mini {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.375rem;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-icon-mini:hover {
      background: var(--bg-surface-alt);
      color: var(--text-secondary);
    }

    .btn-progress-mini:hover {
      border-color: #667eea;
      color: var(--accent);
      background: var(--accent-bg);
    }

    .btn-progress-mini.active {
      color: var(--accent);
      background: var(--accent-bg);
      border-color: rgba(102, 126, 234, 0.3);
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
      color: var(--accent);
      background: var(--accent-bg);
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
      color: var(--accent);
      background: var(--bg-surface);
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
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-demand-name {
      display: block;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-go-task-mini {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-tertiary);
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
      color: var(--text-tertiary);
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
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
      background: var(--accent-bg);
      color: var(--accent);
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
      color: var(--text-primary);
    }

    .stat-label {
      font-size: 0.875rem;
      color: var(--text-tertiary);
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
      background: var(--bg-surface);
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
      color: var(--accent);
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
      color: var(--accent);
      background: var(--bg-surface);
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
    }

    .current-task-info .task-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0.375rem 0 0.25rem;
    }

    .current-task-info .task-demand-title {
      font-size: 0.875rem;
      color: var(--text-tertiary);
      margin: 0;
    }

    .current-task-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .btn-complete-task {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.625rem 1.25rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: none;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-complete-task:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .btn-go-task {
      padding: 0.625rem 1.25rem;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--accent);
      text-decoration: none;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .btn-go-task:hover {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .status-overview-section, .recent-section {
      background: var(--bg-surface);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
      margin-bottom: 2rem;
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
      color: var(--text-primary);
      margin: 0;
    }

    .section-header h2 svg {
      color: var(--accent);
    }

    .btn-link {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--accent);
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .btn-link:hover {
      color: #764ba2;
    }

    /* Status Overview - Big Numbers */
    .status-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 0.75rem;
    }

    .status-number-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 1rem 0.5rem;
      background: var(--bg-surface-hover);
      border-radius: 12px;
      border-top: 3px solid;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .status-number-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      background: var(--bg-surface);
    }

    .status-card-icon {
      font-size: 1.25rem;
    }

    .status-card-number {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1;
    }

    .status-card-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
      text-align: center;
    }

    /* Recent Demands */
    .recent-demands {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .demand-item {
      display: block;
      background: var(--bg-surface-hover);
      border-radius: 12px;
      padding: 1rem;
      text-decoration: none;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .demand-item:hover {
      background: var(--bg-surface);
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
      color: var(--accent);
      background: var(--accent-bg);
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
      color: var(--text-primary);
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
      background: var(--border);
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
      color: var(--text-tertiary);
      white-space: nowrap;
    }

    .empty-recent {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: var(--text-muted);
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

      .daily-tasks-section {
        padding: 1rem;
      }

      .daily-add-bar {
        flex-direction: column;
      }

      .btn-daily-add {
        width: 100%;
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

      .current-task-actions {
        flex-direction: column;
        width: 100%;
      }

      .btn-complete-task,
      .btn-go-task {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private demandService = inject(DemandService);
  private dailyTasksService = inject(DailyTasksService);

  user = this.authService.user;
  demands = this.demandService.demands;
  dailyTasks = this.dailyTasksService.todayTasks;
  newDailyTaskTitle = signal('');

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

  dailyDoneCount = computed(() => this.dailyTasks().filter(t => t.status === 'done').length);

  dailyProgressPercent = computed(() => {
    const total = this.dailyTasks().length;
    return total === 0 ? 0 : Math.round((this.dailyDoneCount() / total) * 100);
  });

  sortedDailyTasks = computed(() => {
    const list = [...this.dailyTasks()];
    return list.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  ngOnInit(): void {
    void this.initDailyTasks();
  }

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

  async addDailyTask(): Promise<void> {
    const title = this.newDailyTaskTitle().trim();
    const user = this.authService.user();
    if (!title || !user) return;

    const task: DailyTask = {
      id: this.dailyTasksService.generateId(),
      title,
      status: 'pending',
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    this.newDailyTaskTitle.set('');
    try {
      await this.dailyTasksService.setTasksForDay(user.uid, todayDateString(), [...this.dailyTasks(), task]);
    } catch (err) {
      console.error('Erro ao salvar tarefa do dia na home:', err);
    }
  }

  async toggleDailyTask(task: DailyTask): Promise<void> {
    const user = this.authService.user();
    if (!user) return;

    const done = task.status !== 'done';
    const tasks = this.dailyTasks().map(t =>
      t.id === task.id
        ? {
            ...t,
            status: done ? ('done' as const) : ('pending' as const),
            completedAt: done ? new Date().toISOString() : undefined
          }
        : t
    );

    try {
      await this.dailyTasksService.setTasksForDay(user.uid, todayDateString(), tasks);
    } catch (err) {
      console.error('Erro ao atualizar tarefa do dia na home:', err);
    }
  }

  private async initDailyTasks(): Promise<void> {
    await this.waitForAuth();
    const user = this.authService.user();
    if (!user) return;

    try {
      await this.dailyTasksService.ensureLoaded(user.uid);
    } catch (err) {
      console.error('Erro ao carregar tarefas do dia na home:', err);
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

  async completeCurrentTask(): Promise<void> {
    const current = this.currentTask();
    if (!current) return;
    await this.demandService.toggleTask(current.demand.id, current.task.id);
  }

}
