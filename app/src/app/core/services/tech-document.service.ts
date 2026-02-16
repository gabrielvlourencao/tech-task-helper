import { Injectable, inject, signal, computed } from '@angular/core';
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
  getDoc,
  DocumentSnapshot
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import type { TechDocument } from '../models/tech-document.model';

const COLLECTION = 'techDocs';

@Injectable({
  providedIn: 'root'
})
export class TechDocumentService {
  private firebase = inject(FirebaseService);
  private authService = inject(AuthService);

  private listSignal = signal<TechDocument[]>([]);
  private loadingSignal = signal<boolean>(true);

  documents = this.listSignal.asReadonly();
  loading = this.loadingSignal.asReadonly();

  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.watchDocuments();
  }

  private watchDocuments(): void {
    const checkAndLoad = () => {
      const user = this.authService.user();

      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }

      if (!user) {
        this.listSignal.set([]);
        this.loadingSignal.set(false);
        return;
      }

      this.loadingSignal.set(true);
      const col = collection(this.firebase.firestore, COLLECTION);
      const q = query(
        col,
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );

      this.unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((d) => this.mapDoc(d));
          this.listSignal.set(docs);
          this.loadingSignal.set(false);
        },
        (error: { code?: string; message?: string }) => {
          this.listSignal.set([]);
          this.loadingSignal.set(false);
          const code = error?.code;
          const msg = String(error?.message ?? '');
          if (code === 'permission-denied') return;
          if (code === 'failed-precondition' || msg.includes('index')) {
            console.warn('Docs técnicos: índice Firestore necessário. Execute: firebase deploy --only firestore:indexes');
            return;
          }
          console.error('Erro ao carregar docs técnicos:', error);
        }
      );
    };

    setTimeout(() => checkAndLoad(), 100);
    setInterval(() => {
      if (this.authService.user() && !this.unsubscribe) checkAndLoad();
      else if (!this.authService.user() && this.unsubscribe) checkAndLoad();
    }, 500);
  }

  private mapDoc(docSnap: DocumentSnapshot): TechDocument {
    const data = docSnap.data() ?? {};
    return {
      id: docSnap.id,
      title: data['title'] ?? '',
      content: data['content'] ?? '',
      demandId: data['demandId'] ?? null,
      userId: data['userId'] ?? '',
      createdAt: (data['createdAt'] as Timestamp)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as Timestamp)?.toDate?.() ?? new Date()
    };
  }

  async getById(id: string): Promise<TechDocument | null> {
    const ref = doc(this.firebase.firestore, COLLECTION, id);
    try {
      const snap = await getDoc(ref);
      return snap.exists() ? this.mapDoc(snap) : null;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'permission-denied' || (err as Error)?.message?.includes('permission')) {
        return null;
      }
      throw err;
    }
  }

  async create(data: Omit<TechDocument, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const user = this.authService.user();
    if (!user) throw new Error('Usuário não autenticado');

    const payload = {
      title: data.title ?? '',
      content: data.content ?? '',
      demandId: data.demandId ?? null,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const ref = await addDoc(
      collection(this.firebase.firestore, COLLECTION),
      payload
    );
    return ref.id;
  }

  async update(
    id: string,
    data: Partial<Omit<TechDocument, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    const ref = doc(this.firebase.firestore, COLLECTION, id);
    const clean: Record<string, unknown> = {};
    if (data.title !== undefined) clean['title'] = data.title;
    if (data.content !== undefined) clean['content'] = data.content;
    if (data.demandId !== undefined) clean['demandId'] = data.demandId;
    clean['updatedAt'] = serverTimestamp();
    await updateDoc(ref, clean);
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.firebase.firestore, COLLECTION, id);
    await deleteDoc(ref);
  }
}
