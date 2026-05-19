export type DailyTaskStatus = 'pending' | 'done';
export type DailyTaskSource = 'manual' | 'demand';

export interface DailyTask {
  id: string;
  title: string;
  status: DailyTaskStatus;
  source: DailyTaskSource;
  demandId?: string;
  demandCode?: string;
  demandTaskId?: string;
  sistema?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DailyTasksEntry {
  dayDate: string;
  tasks: DailyTask[];
}
