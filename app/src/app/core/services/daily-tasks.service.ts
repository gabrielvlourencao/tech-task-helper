import { Injectable, inject, signal, computed } from '@angular/core';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { DailyTask, DailyTasksEntry } from '../models/daily-task.model';

const COLLECTION = 'dailyTasks';
const LEGACY_COLLECTION = 'dailyReports';
const MAX_DAYS = 3;

function docId(userId: string, dayDate: string): string {
  const safe = dayDate.replace(/\s/g, '_');
  return `${userId}_${safe}`;
}

export function todayDateString(): string {
  return new Date().toDateString();
}

@Injectable({
  providedIn: 'root'
})
export class DailyTasksService {
  private firebase = inject(FirebaseService);

  private dayHistorySignal = signal<DailyTasksEntry[]>([]);
  private loadedUserId: string | null = null;

  /** Histórico compartilhado (últimos 3 dias). */
  dayHistory = this.dayHistorySignal.asReadonly();

  /** Tarefas de hoje — mesma referência no dashboard e em /tarefas-do-dia. */
  todayTasks = computed(() => this.getTasksForDay(todayDateString()));

  async ensureLoaded(userId: string): Promise<void> {
    if (this.loadedUserId !== null && this.loadedUserId !== userId) {
      this.dayHistorySignal.set([]);
      this.loadedUserId = null;
    }
    if (this.loadedUserId === userId) return;

    const entries = await this.fetchFromFirestore(userId);
    this.dayHistorySignal.set(entries);
    this.loadedUserId = userId;
  }

  getTasksForDay(dayDate: string): DailyTask[] {
    const entry = this.dayHistorySignal().find(e => e.dayDate === dayDate);
    return entry ? [...entry.tasks] : [];
  }

  async setTasksForDay(userId: string, dayDate: string, tasks: DailyTask[]): Promise<void> {
    await this.ensureLoaded(userId);
    this.patchDayInMemory(dayDate, tasks);
    await this.persistEntry(userId, { dayDate, tasks });
    await this.syncFromFirestore(userId);
  }

  async load(userId: string): Promise<DailyTasksEntry[]> {
    await this.ensureLoaded(userId);
    return this.dayHistorySignal();
  }

  async save(userId: string, entry: DailyTasksEntry): Promise<void> {
    await this.ensureLoaded(userId);
    this.patchDayInMemory(entry.dayDate, entry.tasks);
    await this.persistEntry(userId, entry);
    await this.syncFromFirestore(userId);
  }

  async addFromDemandTask(
    userId: string,
    payload: {
      demandId: string;
      demandCode: string;
      demandTaskId: string;
      taskTitle: string;
      sistema: string;
    }
  ): Promise<void> {
    await this.ensureLoaded(userId);
    const dayDate = todayDateString();
    const tasks = this.getTasksForDay(dayDate);

    const existing = tasks.find(
      t => t.demandId === payload.demandId && t.demandTaskId === payload.demandTaskId
    );
    if (existing) {
      if (existing.status !== 'done') {
        existing.status = 'done';
        existing.completedAt = new Date().toISOString();
        await this.setTasksForDay(userId, dayDate, tasks);
      }
      return;
    }

    const newTask: DailyTask = {
      id: this.generateId(),
      title: payload.taskTitle,
      status: 'done',
      source: 'demand',
      demandId: payload.demandId,
      demandCode: payload.demandCode,
      demandTaskId: payload.demandTaskId,
      sistema: payload.sistema,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    await this.setTasksForDay(userId, dayDate, [...tasks, newTask]);
  }

  async reopenDemandTask(
    userId: string,
    payload: { demandId: string; demandTaskId: string }
  ): Promise<void> {
    await this.ensureLoaded(userId);
    const dayDate = todayDateString();
    const tasks = this.getTasksForDay(dayDate);

    const task = tasks.find(
      t =>
        t.source === 'demand' &&
        t.demandId === payload.demandId &&
        t.demandTaskId === payload.demandTaskId
    );
    if (!task || task.status === 'pending') return;

    task.status = 'pending';
    task.completedAt = undefined;
    await this.setTasksForDay(userId, dayDate, tasks);
  }

  generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private patchDayInMemory(dayDate: string, tasks: DailyTask[]): void {
    this.dayHistorySignal.update(entries => {
      const copy = entries.map(e =>
        e.dayDate === dayDate ? { dayDate, tasks: [...tasks] } : { ...e, tasks: [...e.tasks] }
      );
      if (!copy.some(e => e.dayDate === dayDate)) {
        copy.unshift({ dayDate, tasks: [...tasks] });
      }
      copy.sort((a, b) => new Date(b.dayDate).getTime() - new Date(a.dayDate).getTime());
      return copy.slice(0, MAX_DAYS);
    });
  }

  private async syncFromFirestore(userId: string): Promise<void> {
    const entries = await this.fetchFromFirestore(userId);
    this.dayHistorySignal.set(entries);
    this.loadedUserId = userId;
  }

  private async persistEntry(userId: string, entry: DailyTasksEntry): Promise<void> {
    const id = docId(userId, entry.dayDate);
    const ref = doc(this.firebase.firestore, COLLECTION, id);

    await setDoc(
      ref,
      {
        userId,
        dayDate: entry.dayDate,
        tasks: entry.tasks,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    await this.cleanupOld(userId);
  }

  private async fetchFromFirestore(userId: string): Promise<DailyTasksEntry[]> {
    await this.migrateLegacyReports(userId);

    const col = collection(this.firebase.firestore, COLLECTION);
    const q = query(col, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const cutoff = this.cutoffDate();
    const entries: DailyTasksEntry[] = [];
    const toDelete: string[] = [];

    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const dayDate = data['dayDate'] as string;
      if (new Date(dayDate).getTime() < cutoff) {
        toDelete.push(docSnap.id);
        return;
      }
      entries.push({
        dayDate,
        tasks: (data['tasks'] ?? []) as DailyTask[]
      });
    });

    if (toDelete.length > 0) {
      const batch = writeBatch(this.firebase.firestore);
      toDelete.forEach(id => batch.delete(doc(this.firebase.firestore, COLLECTION, id)));
      await batch.commit();
    }

    entries.sort((a, b) => new Date(b.dayDate).getTime() - new Date(a.dayDate).getTime());
    return entries.slice(0, MAX_DAYS);
  }

  private cutoffDate(): number {
    const d = new Date();
    d.setDate(d.getDate() - MAX_DAYS);
    return d.getTime();
  }

  private async cleanupOld(userId: string): Promise<void> {
    const col = collection(this.firebase.firestore, COLLECTION);
    const q = query(col, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const cutoff = this.cutoffDate();
    const toDelete: string[] = [];

    snapshot.docs.forEach(docSnap => {
      const dayDate = docSnap.get('dayDate') as string;
      if (new Date(dayDate).getTime() < cutoff) {
        toDelete.push(docSnap.id);
      }
    });

    if (toDelete.length > 0) {
      const batch = writeBatch(this.firebase.firestore);
      toDelete.forEach(id => batch.delete(doc(this.firebase.firestore, COLLECTION, id)));
      await batch.commit();
    }
  }

  private async migrateLegacyReports(userId: string): Promise<void> {
    const legacyCol = collection(this.firebase.firestore, LEGACY_COLLECTION);
    const legacyQ = query(legacyCol, where('userId', '==', userId));
    const legacySnap = await getDocs(legacyQ);
    if (legacySnap.empty) return;

    const current = await this.fetchEntriesRaw(userId);
    const batch = writeBatch(this.firebase.firestore);

    legacySnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const dayDate = (data['workDate'] as string) || (data['targetDate'] as string);
      if (!dayDate) return;

      const reportItems = (data['reportItems'] ?? []) as {
        id: string;
        text: string;
        sistema?: string;
        demandCode?: string;
      }[];

      if (reportItems.length === 0) {
        batch.delete(doc(this.firebase.firestore, LEGACY_COLLECTION, docSnap.id));
        return;
      }

      const existing = current.find(e => e.dayDate === dayDate);
      const migratedTasks: DailyTask[] = reportItems.map(item => ({
        id: item.id || this.generateId(),
        title: item.text,
        status: 'done' as const,
        source: item.demandCode ? ('demand' as const) : ('manual' as const),
        demandCode: item.demandCode,
        sistema: item.sistema,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      }));

      const merged = existing
        ? { dayDate, tasks: [...existing.tasks, ...migratedTasks] }
        : { dayDate, tasks: migratedTasks };

      const id = docId(userId, dayDate);
      batch.set(doc(this.firebase.firestore, COLLECTION, id), {
        userId,
        dayDate,
        tasks: merged.tasks,
        updatedAt: serverTimestamp()
      });
      batch.delete(doc(this.firebase.firestore, LEGACY_COLLECTION, docSnap.id));
    });

    await batch.commit();
  }

  private async fetchEntriesRaw(userId: string): Promise<DailyTasksEntry[]> {
    const col = collection(this.firebase.firestore, COLLECTION);
    const q = query(col, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({
      dayDate: docSnap.data()['dayDate'] as string,
      tasks: (docSnap.data()['tasks'] ?? []) as DailyTask[]
    }));
  }
}
