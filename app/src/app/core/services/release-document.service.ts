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
  DocumentSnapshot,
  deleteField
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import type {
  ReleaseDocument,
  ReleaseDocumentStatus,
  KeyMapping,
  RepoAfetado
} from '../models/release-document.model';

const COLLECTION = 'releaseDocs';

@Injectable({
  providedIn: 'root'
})
export class ReleaseDocumentService {
  private firebase = inject(FirebaseService);
  private authService = inject(AuthService);

  private listSignal = signal<ReleaseDocument[]>([]);
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
            console.warn('Documentos de release: índice do Firestore necessário. Execute: firebase deploy --only firestore:indexes');
            return;
          }
          console.error('Erro ao carregar documentos de release:', error);
        }
      );
    };

    setTimeout(() => checkAndLoad(), 100);
    setInterval(() => {
      if (this.authService.user() && !this.unsubscribe) checkAndLoad();
      else if (!this.authService.user() && this.unsubscribe) checkAndLoad();
    }, 500);
  }

  private mapDoc(docSnap: DocumentSnapshot): ReleaseDocument {
    const data = docSnap.data() ?? {};
    return {
      id: docSnap.id,
      demandId: data['demandId'] ?? '',
      userId: data['userId'] ?? '',
      dev: data['dev'] ?? '',
      lt: data['lt'] ?? '',
      funcionalGestor: data['funcionalGestor'] ?? '',
      keyMappings: Array.isArray(data['keyMappings']) ? data['keyMappings'] : [],
      reposAfetados: Array.isArray(data['reposAfetados']) ? data['reposAfetados'] : [],
      observacoesGerais: data['observacoesGerais'] ?? '',
      status: (data['status'] as ReleaseDocumentStatus) ?? 'rascunho',
      createdAt: (data['createdAt'] as Timestamp)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as Timestamp)?.toDate?.() ?? new Date(),
      finalizedAt: data['finalizedAt']
        ? (data['finalizedAt'] as Timestamp).toDate()
        : undefined
    };
  }

  async getById(id: string): Promise<ReleaseDocument | null> {
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

  getByDemandId(demandId: string): ReleaseDocument | undefined {
    return this.listSignal().find((d) => d.demandId === demandId);
  }

  getByDemandId$(demandId: string) {
    return computed(() =>
      this.listSignal().find((d) => d.demandId === demandId)
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  async create(
    demandId: string,
    data: Omit<
      ReleaseDocument,
      'id' | 'demandId' | 'userId' | 'createdAt' | 'updatedAt' | 'status' | 'finalizedAt'
    >
  ): Promise<string> {
    const user = this.authService.user();
    if (!user) throw new Error('Usuário não autenticado');

    const payload = {
      demandId,
      userId: user.uid,
      dev: data.dev ?? '',
      lt: data.lt ?? '',
      funcionalGestor: data.funcionalGestor ?? '',
      keyMappings: data.keyMappings ?? [],
      reposAfetados: data.reposAfetados ?? [],
      observacoesGerais: data.observacoesGerais ?? '',
      status: 'rascunho' as ReleaseDocumentStatus,
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
    data: Partial<
      Omit<
        ReleaseDocument,
        'id' | 'demandId' | 'userId' | 'createdAt' | 'updatedAt' | 'finalizedAt'
      >
    >
  ): Promise<void> {
    const ref = doc(this.firebase.firestore, COLLECTION, id);
    const clean: Record<string, unknown> = {};
    if (data.dev !== undefined) clean['dev'] = data.dev;
    if (data.lt !== undefined) clean['lt'] = data.lt;
    if (data.funcionalGestor !== undefined)
      clean['funcionalGestor'] = data.funcionalGestor;
    if (data.keyMappings !== undefined) clean['keyMappings'] = data.keyMappings;
    if (data.reposAfetados !== undefined)
      clean['reposAfetados'] = data.reposAfetados;
    if (data.observacoesGerais !== undefined)
      clean['observacoesGerais'] = data.observacoesGerais;
    if (data.status !== undefined) clean['status'] = data.status;
    clean['updatedAt'] = serverTimestamp();
    await updateDoc(ref, clean);
  }

  async finalize(id: string): Promise<void> {
    const ref = doc(this.firebase.firestore, COLLECTION, id);
    await updateDoc(ref, {
      status: 'finalizado',
      finalizedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async unFinalize(id: string): Promise<void> {
    const ref = doc(this.firebase.firestore, COLLECTION, id);
    await updateDoc(ref, {
      status: 'rascunho',
      finalizedAt: deleteField(),
      updatedAt: serverTimestamp()
    });
  }

  async delete(id: string): Promise<void> {
    const ref = doc(this.firebase.firestore, COLLECTION, id);
    await deleteDoc(ref);
  }

  createKeyMapping(): KeyMapping {
    return {
      id: this.generateId(),
      key: '',
      value: '',
      ambiente: ''
    };
  }

  createRepoAfetado(): RepoAfetado {
    return { id: this.generateId(), url: '' };
  }
}
