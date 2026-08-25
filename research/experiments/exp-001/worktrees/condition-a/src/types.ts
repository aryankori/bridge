export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TaskOptions {
  id: string;
  priority: TaskPriority;
  tokensRequired: number;
}

export interface TaskResult<T> {
  id: string;
  success: boolean;
  value?: T;
  error?: Error;
  executionTimeMs: number;
}

export type TaskHandler<T> = (signal: AbortSignal) => Promise<T>;
