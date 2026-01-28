import { Injectable, signal, inject, computed } from '@angular/core';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { Demand, Task, CustomField, DEFAULT_TASKS, DEFAULT_CUSTOM_FIELDS, DemandStatus } from '../models/demand.model';

@Injectable({
  providedIn: 'root'
})
export class DemandService {
  private firebase = inject(FirebaseService);
  private authService = inject(AuthService);

  private demandsSignal = signal<Demand[]>([]);
  private loadingSignal = signal<boolean>(true);

  demands = this.demandsSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();

  private unsubscribe: (() => void) | null = null;

  constructor() {
    // Watch auth state and load demands when user is authenticated
    this.watchDemands();
  }

  private watchDemands(): void {
    const checkAndLoad = () => {
      const user = this.authService.user();
      
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }

      if (!user) {
        this.demandsSignal.set([]);
        this.loadingSignal.set(false);
        return;
      }

      this.loadingSignal.set(true);
      
      const demandsRef = collection(this.firebase.firestore, 'demands');
      // Query simples sem orderBy para não precisar de índice composto
      const q = query(
        demandsRef,
        where('userId', '==', user.uid)
      );

      this.unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          const demands: Demand[] = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const demand: Demand = {
              ...data,
              id: docSnap.id,
              status: data['status'] || 'setup', // Default para demandas antigas
              createdAt: (data['createdAt'] as Timestamp)?.toDate() || new Date(),
              updatedAt: (data['updatedAt'] as Timestamp)?.toDate() || new Date(),
              completedAt: data['completedAt'] ? (data['completedAt'] as Timestamp).toDate() : undefined,
              todayCompletedDefaultTasks: data['todayCompletedDefaultTasks'] || [],
              tasks: (data['tasks'] || []).map((task: Task & { createdAt?: Timestamp; completedAt?: Timestamp }) => ({
                ...task,
                inProgress: task.inProgress || false, // Default para tarefas antigas
                createdAt: task.createdAt instanceof Timestamp 
                  ? task.createdAt.toDate() 
                  : new Date(task.createdAt || Date.now()),
                completedAt: task.completedAt instanceof Timestamp
                  ? task.completedAt.toDate()
                  : task.completedAt ? new Date(task.completedAt) : undefined
              }))
            } as Demand;
            
            return demand;
          });
          // Ordenar no cliente
          demands.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          this.demandsSignal.set(demands);
          this.loadingSignal.set(false);
          
          // Adicionar tarefas padrão concluídas hoje (fora do snapshot para evitar loops)
          demands.forEach(demand => {
            this.addTodayCompletedDefaultTasks(demand).catch(err => {
              console.error('Erro ao processar tarefas padrão:', err);
            });
          });
        },
        (error) => {
          console.error('Erro ao carregar demandas:', error);
          this.loadingSignal.set(false);
        }
      );
    };

    // Initial check
    setTimeout(() => checkAndLoad(), 100);
    
    // Re-check periodically for auth changes
    setInterval(() => {
      if (this.authService.user() && !this.unsubscribe) {
        checkAndLoad();
      } else if (!this.authService.user() && this.unsubscribe) {
        checkAndLoad();
      }
    }, 500);
  }

  private generateDemandCode(): string {
    const num = Math.floor(Math.random() * 90000) + 10000;
    return `DMND${num}`;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Adiciona apenas tarefas padrão que foram concluídas hoje e não existem na demanda.
   * Isso permite que tarefas padrão concluídas hoje sejam restauradas automaticamente,
   * mas tarefas concluídas em outros dias não serão restauradas.
   */
  private async addTodayCompletedDefaultTasks(demand: Demand): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Limpa o rastreamento de tarefas concluídas em dias anteriores
    // e mantém apenas as que foram concluídas hoje
    const todayCompleted = (demand.todayCompletedDefaultTasks || []).filter(taskTitle => {
      // Verifica se a tarefa existe e foi concluída hoje
      const task = demand.tasks.find(t => t.title === taskTitle);
      if (!task || !task.completed || !task.completedAt) {
        return false;
      }
      const taskCompletedDate = new Date(task.completedAt);
      taskCompletedDate.setHours(0, 0, 0, 0);
      return taskCompletedDate.getTime() === today.getTime();
    });
    
    // Se o rastreamento mudou, atualiza
    const needsUpdate = todayCompleted.length !== (demand.todayCompletedDefaultTasks || []).length;
    
    // Verifica quais tarefas padrão existem na demanda
    const existingTaskTitles = new Set(demand.tasks.map(t => t.title));
    const tasksToAdd: Task[] = [];
    
    // Para cada tarefa padrão concluída hoje, verifica se não existe
    todayCompleted.forEach((taskTitle) => {
      // Se a tarefa já existe, não adiciona
      if (existingTaskTitles.has(taskTitle)) {
        return;
      }
      
      // Encontra a tarefa padrão correspondente
      const defaultTask = DEFAULT_TASKS.find(dt => dt.title === taskTitle);
      if (!defaultTask) {
        return;
      }
      
      // Adiciona a tarefa padrão concluída hoje
      const maxOrder = demand.tasks.length > 0 
        ? Math.max(...demand.tasks.map(t => t.order)) 
        : -1;
      
      const newTask: Task = {
        ...defaultTask,
        id: this.generateId(),
        completed: true,
        completedAt: new Date(),
        createdAt: new Date(),
        order: maxOrder + 1
      };
      
      tasksToAdd.push(newTask);
    });
    
    // Se há tarefas para adicionar ou o rastreamento mudou, atualiza no Firebase
    if (tasksToAdd.length > 0 || needsUpdate) {
      const updatedTasks = tasksToAdd.length > 0 ? [...demand.tasks, ...tasksToAdd] : demand.tasks;
      const demandRef = doc(this.firebase.firestore, 'demands', demand.id);
      
      try {
        await updateDoc(demandRef, {
          tasks: updatedTasks.map(t => ({
            ...t,
            createdAt: t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt),
            completedAt: t.completedAt instanceof Date ? t.completedAt : (t.completedAt ? new Date(t.completedAt) : undefined)
          })),
          todayCompletedDefaultTasks: todayCompleted,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Erro ao adicionar tarefas padrão concluídas hoje:', err);
      }
    }
  }

  async createDemand(
    code: string,
    title: string,
    priority: Demand['priority'] = 'medium',
    useDefaultTasks: boolean = true,
    status: DemandStatus = 'setup',
    consultoria: string = '',
    sistema: string = ''
  ): Promise<string> {
    const user = this.authService.user();
    if (!user) throw new Error('Usuário não autenticado');

    const tasks: Task[] = useDefaultTasks 
      ? DEFAULT_TASKS.map((task, index) => ({
          ...task,
          id: this.generateId(),
          createdAt: new Date(),
          order: index
        }))
      : [];

    // Default custom fields (Consultoria e Sistema) com valores preenchidos
    const customFields: CustomField[] = DEFAULT_CUSTOM_FIELDS.map(field => ({
      ...field,
      id: this.generateId(),
      value: field.name === 'Consultoria' ? consultoria : field.name === 'Sistema' ? sistema : field.value
    }));

    const currentDemands = this.demandsSignal();
    const maxOrder = currentDemands.length > 0 
      ? Math.max(...currentDemands.map(d => d.order)) 
      : -1;

    const demandData = {
      code: code || this.generateDemandCode(),
      title,
      priority,
      status,
      tasks,
      customFields,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      order: maxOrder + 1
    };

    const docRef = await addDoc(
      collection(this.firebase.firestore, 'demands'),
      demandData
    );

    return docRef.id;
  }

  async updateStatus(demandId: string, status: DemandStatus): Promise<void> {
    const updates: Record<string, unknown> = { status };
    
    if (status === 'concluido') {
      updates['completedAt'] = serverTimestamp();
    } else {
      updates['completedAt'] = null;
    }
    
    await this.updateDemand(demandId, updates as Partial<Demand>);
  }

  async updateConsultoria(demandId: string, value: string): Promise<void> {
    const demand = this.demandsSignal().find(d => d.id === demandId);
    if (!demand) throw new Error('Demanda não encontrada');

    const updatedFields = demand.customFields.map(field =>
      field.name === 'Consultoria' ? { ...field, value } : field
    );

    await this.updateDemand(demandId, { customFields: updatedFields });
  }

  async updateSistema(demandId: string, value: string): Promise<void> {
    const demand = this.demandsSignal().find(d => d.id === demandId);
    if (!demand) throw new Error('Demanda não encontrada');

    // Verifica se o campo Sistema já existe
    const hasSystemField = demand.customFields.some(f => f.name === 'Sistema');
    
    let updatedFields: CustomField[];
    if (hasSystemField) {
      updatedFields = demand.customFields.map(field =>
        field.name === 'Sistema' ? { ...field, value } : field
      );
    } else {
      // Adiciona o campo Sistema se não existir (para demandas antigas)
      updatedFields = [
        ...demand.customFields,
        { id: this.generateId(), name: 'Sistema', value, color: '#7c3aed' }
      ];
    }

    await this.updateDemand(demandId, { customFields: updatedFields });
  }

  async updateDemand(demandId: string, updates: Partial<Omit<Demand, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    const demandRef = doc(this.firebase.firestore, 'demands', demandId);
    await updateDoc(demandRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  async deleteDemand(demandId: string): Promise<void> {
    const demandRef = doc(this.firebase.firestore, 'demands', demandId);
    await deleteDoc(demandRef);
  }

  // Task operations
  async addTask(demandId: string, taskTitle: string): Promise<void> {
    const demand = this.demandsSignal().find(d => d.id === demandId);
    if (!demand) throw new Error('Demanda não encontrada');

    const maxOrder = demand.tasks.length > 0 
      ? Math.max(...demand.tasks.map(t => t.order)) 
      : -1;

    const newTask: Task = {
      id: this.generateId(),
      title: taskTitle,
      completed: false,
      inProgress: false,
      order: maxOrder + 1,
      createdAt: new Date()
    };

    await this.updateDemand(demandId, {
      tasks: [...demand.tasks, newTask]
    });
  }

  async updateTask(demandId: string, taskId: string, updates: Partial<Task>): Promise<void> {
    const demand = this.demandsSignal().find(d => d.id === demandId);
    if (!demand) throw new Error('Demanda não encontrada');

    const updatedTasks = demand.tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );

    await this.updateDemand(demandId, { tasks: updatedTasks });
  }

  async deleteTask(demandId: string, taskId: string): Promise<void> {
    const demand = this.demandsSignal().find(d => d.id === demandId);
    if (!demand) throw new Error('Demanda não encontrada');

    const task = demand.tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada');

    const filteredTasks = demand.tasks.filter(task => task.id !== taskId);
    const updates: Partial<Demand> = { tasks: filteredTasks };
    
    // Se a tarefa removida é uma tarefa padrão concluída hoje, remove do rastreamento
    const isDefaultTask = DEFAULT_TASKS.some(dt => dt.title === task.title);
    if (isDefaultTask && task.completed && task.completedAt) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const taskCompletedDate = new Date(task.completedAt);
      taskCompletedDate.setHours(0, 0, 0, 0);
      
      // Se foi concluída hoje, remove do rastreamento para que não seja restaurada
      if (taskCompletedDate.getTime() === today.getTime() && demand.todayCompletedDefaultTasks) {
        updates.todayCompletedDefaultTasks = demand.todayCompletedDefaultTasks.filter(t => t !== task.title);
      }
    }
    
    await this.updateDemand(demandId, updates);
  }

  async toggleTask(demandId: string, taskId: string): Promise<void> {
    const demand = this.demandsSignal().find(d => d.id === demandId);
    if (!demand) throw new Error('Demanda não encontrada');

    const task = demand.tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada');

    // Se está completando, remove do inProgress e salva a data de conclusão
    const updates: Partial<Task> = { completed: !task.completed };
    const demandUpdates: Partial<Demand> = {};
    
    if (!task.completed) {
      updates.inProgress = false;
      updates.completedAt = new Date(); // Salva a data de conclusão
      
      // Se é uma tarefa padrão concluída hoje, adiciona ao rastreamento
      const isDefaultTask = DEFAULT_TASKS.some(dt => dt.title === task.title);
      if (isDefaultTask) {
        const today = new Date().toDateString();
        const todayCompleted = demand.todayCompletedDefaultTasks || [];
        if (!todayCompleted.includes(task.title)) {
          demandUpdates.todayCompletedDefaultTasks = [...todayCompleted, task.title];
        }
      }
    } else {
      // Se está desmarcando, remove a data de conclusão
      updates.completedAt = undefined;
      
      // Remove do rastreamento se for tarefa padrão
      const isDefaultTask = DEFAULT_TASKS.some(dt => dt.title === task.title);
      if (isDefaultTask && demand.todayCompletedDefaultTasks) {
        demandUpdates.todayCompletedDefaultTasks = demand.todayCompletedDefaultTasks.filter(t => t !== task.title);
      }
    }

    await this.updateTask(demandId, taskId, updates);
    
    // Atualiza o rastreamento na demanda se necessário
    if (Object.keys(demandUpdates).length > 0) {
      await this.updateDemand(demandId, demandUpdates);
    }
  }

  async setTaskInProgress(demandId: string, taskId: string): Promise<void> {
    const allDemands = this.demandsSignal();
    
    // Primeiro, remove inProgress de todas as tarefas de todas as demandas
    for (const demand of allDemands) {
      const tasksWithProgress = demand.tasks.filter(t => t.inProgress && t.id !== taskId);
      if (tasksWithProgress.length > 0) {
        const updatedTasks = demand.tasks.map(t => ({
          ...t,
          inProgress: false
        }));
        await this.updateDemand(demand.id, { tasks: updatedTasks });
      }
    }

    // Agora marca a tarefa selecionada como inProgress
    const demand = allDemands.find(d => d.id === demandId);
    if (!demand) throw new Error('Demanda não encontrada');

    const task = demand.tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada');

    // Toggle: se já está em progresso, remove; senão, adiciona
    const updatedTasks = demand.tasks.map(t => ({
      ...t,
      inProgress: t.id === taskId ? !t.inProgress : false
    }));

    await this.updateDemand(demandId, { tasks: updatedTasks });
  }

  // Retorna a tarefa atualmente em progresso
  getCurrentTask(): { task: Task; demand: Demand } | null {
    for (const demand of this.demandsSignal()) {
      const task = demand.tasks.find(t => t.inProgress && !t.completed);
      if (task) {
        return { task, demand };
      }
    }
    return null;
  }

  // Custom fields operations
  async addCustomField(demandId: string, field: Omit<CustomField, 'id'>): Promise<void> {
    const demand = this.demandsSignal().find(d => d.id === demandId);
    if (!demand) throw new Error('Demanda não encontrada');

    const newField: CustomField = {
      ...field,
      id: this.generateId()
    };

    await this.updateDemand(demandId, {
      customFields: [...demand.customFields, newField]
    });
  }

  async updateCustomField(demandId: string, fieldId: string, updates: Partial<CustomField>): Promise<void> {
    const demand = this.demandsSignal().find(d => d.id === demandId);
    if (!demand) throw new Error('Demanda não encontrada');

    const updatedFields = demand.customFields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );

    await this.updateDemand(demandId, { customFields: updatedFields });
  }

  async deleteCustomField(demandId: string, fieldId: string): Promise<void> {
    const demand = this.demandsSignal().find(d => d.id === demandId);
    if (!demand) throw new Error('Demanda não encontrada');

    const filteredFields = demand.customFields.filter(field => field.id !== fieldId);
    await this.updateDemand(demandId, { customFields: filteredFields });
  }

  // Reorder demands
  async reorderDemands(demandIds: string[]): Promise<void> {
    const batch = writeBatch(this.firebase.firestore);
    
    demandIds.forEach((id, index) => {
      const demandRef = doc(this.firebase.firestore, 'demands', id);
      batch.update(demandRef, { order: index, updatedAt: serverTimestamp() });
    });

    await batch.commit();
  }
}
