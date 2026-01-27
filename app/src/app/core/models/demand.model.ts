export interface CustomField {
  id: string;
  name: string;
  value: string;
  color: string; // hex color for badge
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  inProgress: boolean; // Tarefa em execução atual
  order: number;
  createdAt: Date;
  link?: string; // Link externo opcional
}

// Ordem de prioridade para ordenação (maior = mais prioritário)
export const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type DemandStatus = 'setup' | 'desenvolvimento' | 'homologacao' | 'op_assistida' | 'concluido';
export type ViewMode = 'active' | 'completed' | 'all';

export interface Demand {
  id: string;
  code: string; // DMNDXXXXX
  title: string;
  description?: string;
  priority: Priority;
  status: DemandStatus;
  tasks: Task[];
  customFields: CustomField[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  order: number;
}

// Default tasks that every LT has
export const DEFAULT_TASKS: Omit<Task, 'id' | 'createdAt'>[] = [
  { title: 'Mapear igualdade de Keyvaults por ambiente', completed: false, inProgress: false, order: 0 },
  { title: 'Criar documento de release', completed: false, inProgress: false, order: 1, link: 'https://lts-releases.web.app/releases' },
  { title: 'Equalizar branchs', completed: false, inProgress: false, order: 2 },
];

// Default custom field for Consultoria
export const DEFAULT_CUSTOM_FIELDS: Omit<CustomField, 'id'>[] = [
  { name: 'Consultoria', value: '', color: '#0891b2' }
];

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Baixa', color: '#059669', bgColor: '#d1fae5' },
  medium: { label: 'Média', color: '#d97706', bgColor: '#fef3c7' },
  high: { label: 'Alta', color: '#dc2626', bgColor: '#fee2e2' },
  critical: { label: 'Crítica', color: '#7c3aed', bgColor: '#ede9fe' },
};

export const STATUS_CONFIG: Record<DemandStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  setup: { label: 'Setup', color: '#6366f1', bgColor: '#eef2ff', icon: '⚙️' },
  desenvolvimento: { label: 'Desenvolvimento', color: '#f59e0b', bgColor: '#fffbeb', icon: '🔨' },
  homologacao: { label: 'Homologação', color: '#8b5cf6', bgColor: '#f5f3ff', icon: '🧪' },
  op_assistida: { label: 'Op. Assistida', color: '#06b6d4', bgColor: '#ecfeff', icon: '👀' },
  concluido: { label: 'Concluído', color: '#10b981', bgColor: '#d1fae5', icon: '✅' },
};
