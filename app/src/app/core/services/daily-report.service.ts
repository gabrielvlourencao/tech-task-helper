import { Injectable, inject } from '@angular/core';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

export interface ReportItemDoc {
  id: string;
  text: string;
  sistema?: string;
  demandCode?: string;
}

export interface DailyEntryDoc {
  targetDate: string;
  workDate: string;
  reportItems: ReportItemDoc[];
  comments: { id: string; text: string }[];
  includeTasksInReport?: boolean;
}

const COLLECTION = 'dailyReports';
const MAX_DAYS = 3;

/** Gera id de documento único por usuário e data (sem espaços para Firestore). */
function docId(userId: string, targetDate: string): string {
  const safe = targetDate.replace(/\s/g, '_');
  return `${userId}_${safe}`;
}

@Injectable({
  providedIn: 'root'
})
export class DailyReportService {
  private firebase = inject(FirebaseService);

  /**
   * Carrega os reports do usuário dos últimos dias.
   * Remove no Firestore entradas com mais de 3 dias.
   */
  async load(userId: string): Promise<DailyEntryDoc[]> {
    const col = collection(this.firebase.firestore, COLLECTION);
    const q = query(col, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - MAX_DAYS);
    const threeDaysAgoTime = threeDaysAgo.getTime();

    const entries: DailyEntryDoc[] = [];
    const toDelete: string[] = [];

    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const targetDate = data['targetDate'] as string;
      const entryDate = new Date(targetDate).getTime();

      if (entryDate < threeDaysAgoTime) {
        toDelete.push(docSnap.id);
        return;
      }

      entries.push({
        targetDate: data['targetDate'],
        workDate: data['workDate'] ?? targetDate,
        reportItems: data['reportItems'] ?? [],
        comments: data['comments'] ?? [],
        includeTasksInReport: data['includeTasksInReport'] ?? true
      });
    });

    if (toDelete.length > 0) {
      const batch = writeBatch(this.firebase.firestore);
      toDelete.forEach(id => {
        batch.delete(doc(this.firebase.firestore, COLLECTION, id));
      });
      await batch.commit();
    }

    entries.sort((a, b) => new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime());
    return entries.slice(0, MAX_DAYS);
  }

  /**
   * Salva uma entrada (cria ou atualiza) e mantém só as últimas 3 no Firestore.
   */
  async save(userId: string, entry: DailyEntryDoc): Promise<void> {
    const id = docId(userId, entry.targetDate);
    const ref = doc(this.firebase.firestore, COLLECTION, id);

    await setDoc(ref, {
      userId,
      targetDate: entry.targetDate,
      workDate: entry.workDate,
      reportItems: entry.reportItems,
      comments: entry.comments,
      includeTasksInReport: entry.includeTasksInReport ?? true,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await this.cleanupOld(userId);
  }

  /** Adiciona somente a tarefa recém-concluída ao report de amanhã. */
  async addCompletedTask(
    userId: string,
    payload: { demandCode: string; taskTitle: string; sistema: string }
  ): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDate = tomorrow.toDateString();
    const workDate = new Date().toDateString();

    const entries = await this.load(userId);
    let entry = entries.find(e => e.targetDate === targetDate);

    const newItem: ReportItemDoc = {
      id: this.generateId(),
      text: payload.taskTitle,
      sistema: payload.sistema,
      demandCode: payload.demandCode
    };

    if (entry) {
      const alreadyExists = entry.reportItems.some(
        i => i.demandCode === payload.demandCode && i.text === payload.taskTitle
      );
      if (alreadyExists) return;
      entry = {
        ...entry,
        reportItems: [...entry.reportItems, newItem]
      };
    } else {
      entry = {
        targetDate,
        workDate,
        reportItems: [newItem],
        comments: [],
        includeTasksInReport: true
      };
    }

    await this.save(userId, entry);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /** Remove entradas com mais de 3 dias. */
  private async cleanupOld(userId: string): Promise<void> {
    const col = collection(this.firebase.firestore, COLLECTION);
    const q = query(col, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - MAX_DAYS);
    const threeDaysAgoTime = threeDaysAgo.getTime();

    const toDelete: string[] = [];
    snapshot.docs.forEach(docSnap => {
      const targetDate = docSnap.get('targetDate') as string;
      if (new Date(targetDate).getTime() < threeDaysAgoTime) {
        toDelete.push(docSnap.id);
      }
    });

    if (toDelete.length > 0) {
      const batch = writeBatch(this.firebase.firestore);
      toDelete.forEach(id => {
        batch.delete(doc(this.firebase.firestore, COLLECTION, id));
      });
      await batch.commit();
    }
  }
}
