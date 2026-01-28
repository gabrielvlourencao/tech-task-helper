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
            return {
              ...data,
              id: docSnap.id,
              status: data['status'] || 'setup', // Default para demandas antigas
              createdAt: (data['createdAt'] as Timestamp)?.toDate() || new Date(),
              updatedAt: (data['updatedAt'] as Timestamp)?.toDate() || new Date(),
              completedAt: data['completedAt'] ? (data['completedAt'] as Timestamp).toDate() : undefined,
              tasks: (data['tasks'] || []).map((task: Task & { createdAt?: Timestamp }) => ({
                ...task,
                inProgress: task.inProgress || false, // Default para tarefas antigas
                createdAt: task.createdAt instanceof Timestamp 
                  ? task.createdAt.toDate() 
                  : new Date(task.createdAt || Date.now())
              }))
            } as Demand;
          });
          // Ordenar no cliente
          demands.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          this.demandsSignal.set(demands);
          this.loadingSignal.set(false);
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

    const filteredTasks = demand.tasks.filter(task => task.id !== taskId);
    await this.updateDemand(demandId, { tasks: filteredTasks });
  }

  async toggleTask(demandId: string, taskId: string): Promise<void> {
    const demand = this.demandsSignal().find(d => d.id === demandId);
    if (!demand) throw new Error('Demanda não encontrada');

    const task = demand.tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Tarefa não encontrada');

    // Se está completando, remove do inProgress
    const updates: Partial<Task> = { completed: !task.completed };
    if (!task.completed) {
      updates.inProgress = false;
    }

    await this.updateTask(demandId, taskId, updates);
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
