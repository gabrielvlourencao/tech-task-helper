import type { DemandStatus } from './demand.model';

/** Mapeamento de chave (Keyvault etc.): Key, Value, Ambiente */
export interface KeyMapping {
  id: string;
  key: string;
  value: string;
  ambiente: string;
}

/** Repositório afetado (link GitHub/Azure DevOps) */
export interface RepoAfetado {
  id: string;
  nome?: string;
  url: string;
}

export type ReleaseDocumentStatus = 'rascunho' | 'finalizado';

export interface ReleaseDocument {
  id: string;
  demandId: string;
  userId: string;
  /** DEV - LT - Funcional/Gestor de projetos (texto livre) */
  dev: string;
  lt: string;
  funcionalGestor: string;
  /** Mapeamento de chaves alteradas (Key, Value, Ambiente) */
  keyMappings: KeyMapping[];
  /** Repositórios afetados (links) */
  reposAfetados: RepoAfetado[];
  /** Observações gerais */
  observacoesGerais: string;
  /** Status da release (independente da demanda); finalizar = concluir release */
  status: ReleaseDocumentStatus;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
}

export const RELEASE_DOC_TASK_TITLE = 'Criar documento de release';
