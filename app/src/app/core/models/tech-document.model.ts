/** Documento técnico (desenho de solução, especificação técnica, etc.) - tipo Confluence */
export interface TechDocument {
  id: string;
  /** Título do documento */
  title: string;
  /** Conteúdo em texto (MVP: texto simples; futuramente Markdown/HTML) */
  content: string;
  /** Demanda vinculada (opcional - a demanda pode ainda não existir) */
  demandId: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
