/** Mapeamento de chave (Keyvault etc.): Key, Value, Ambiente - opcional no doc técnico */
export interface TechKeyMapping {
  id: string;
  key: string;
  value: string;
  ambiente: string;
}

/** Repositório impactado: Nome, Link e Stack */
export interface ImpactedRepo {
  id: string;
  name: string;
  link: string;
  /** Stack do projeto (ex: .NET 8, Angular 21, Node 20) */
  stack: string;
}

/** Um passo/tópico da documentação técnica (ex: Step 1: API - Criar novo endpoint) */
export interface TechDocumentStep {
  id: string;
  /** Ordem de exibição (1, 2, 3...) */
  order: number;
  /** Título do passo (ex: "API - Criar novo endpoint") */
  title: string;
  /** Descrição/detalhes do passo */
  description: string;
}

/** Documento técnico: formulário que gera documento (resumo, chaves opcional, passos em tópicos) */
export interface TechDocument {
  id: string;
  /** Título do documento */
  title: string;
  /** Resumo/contexto (opcional) */
  summary: string;
  /** Repositórios impactados (tabela Nome, Link) */
  impactedRepos?: ImpactedRepo[];
  /** Observações gerais */
  generalObservations?: string;
  /** Chaves alteradas (opcional) - tabela Key, Value, Ambiente */
  keyMappings: TechKeyMapping[];
  /** Passos da documentação (Step 1, Step 2, ...) */
  steps: TechDocumentStep[];
  /** Conteúdo livre legado (documentos antigos); se steps.length > 0, ignorado na renderização */
  content: string;
  /** Demanda vinculada (opcional) */
  demandId: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
