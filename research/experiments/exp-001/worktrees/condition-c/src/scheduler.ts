import type { TaskPriority, TaskOptions, TaskResult, TaskHandler } from './types.js';

const PRIORITY_SCORES: Record<TaskPriority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

interface QueuedTask<T> {
  options: TaskOptions;
  handler: TaskHandler<T>;
  sequenceNumber: number;
  resolve: (value: TaskResult<T>) => void;
  reject: (reason: Error) => void;
  abortController: AbortController;
}

export class TaskScheduler {
  private maxConcurrency: number;
  private activeCount: number = 0;
  private queue: QueuedTask<unknown>[] = [];
  private sequenceCounter: number = 0;

  private capacity: number;
  private tokens: number;
  private refillRatePerSecond: number;
  private lastRefillTimestamp: number;
  private refillTimer: NodeJS.Timeout | null = null;

  constructor(options: { maxConcurrency: number; capacity: number; refillRatePerSecond: number }) {
    this.maxConcurrency = options.maxConcurrency;
    this.capacity = options.capacity;
    this.tokens = options.capacity;
    this.refillRatePerSecond = options.refillRatePerSecond;
    this.lastRefillTimestamp = Date.now();
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getAvailableTokens(): number {
    this.refillTokens();
    return this.tokens;
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTimestamp) / 1000;
    if (elapsedSeconds > 0) {
      const addedTokens = elapsedSeconds * this.refillRatePerSecond;
      this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
      this.lastRefillTimestamp = now;
    }
  }

  public submit<T>(options: TaskOptions, handler: TaskHandler<T>): Promise<TaskResult<T>> {
    return new Promise((resolve, reject) => {
      const abortController = new AbortController();
      const queuedTask: QueuedTask<T> = {
        options,
        handler,
        sequenceNumber: ++this.sequenceCounter,
        resolve: resolve as (value: TaskResult<unknown>) => void,
        reject,
        abortController,
      };

      this.queue.push(queuedTask as QueuedTask<unknown>);
      this.queue.sort((a, b) => {
        const prioDiff = PRIORITY_SCORES[b.options.priority] - PRIORITY_SCORES[a.options.priority];
        if (prioDiff !== 0) return prioDiff;
        return a.sequenceNumber - b.sequenceNumber;
      });

      this.pump();
    });
  }

  public cancel(taskId: string): boolean {
    const index = this.queue.findIndex((t) => t.options.id === taskId);
    if (index !== -1) {
      const [task] = this.queue.splice(index, 1);
      task.abortController.abort();
      task.resolve({
        id: taskId,
        success: false,
        error: new Error('Task cancelled in queue'),
        executionTimeMs: 0,
      });
      return true;
    }
    return false;
  }

  private pump(): void {
    this.refillTokens();

    while (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const nextTask = this.queue[0];
      if (this.tokens < nextTask.options.tokensRequired) {
        // Schedule next refill pump
        const needed = nextTask.options.tokensRequired - this.tokens;
        const waitMs = Math.ceil((needed / this.refillRatePerSecond) * 1000);
        if (!this.refillTimer) {
          this.refillTimer = setTimeout(() => {
            this.refillTimer = null;
            this.pump();
          }, Math.max(10, waitMs));
        }
        break;
      }

      this.queue.shift();
      this.tokens -= nextTask.options.tokensRequired;
      this.activeCount++;

      this.executeTask(nextTask);
    }
  }

  private async executeTask<T>(task: QueuedTask<T>): Promise<void> {
    const start = Date.now();
    try {
      const value = await task.handler(task.abortController.signal);
      task.resolve({
        id: task.options.id,
        success: true,
        value,
        executionTimeMs: Date.now() - start,
      });
    } catch (err) {
      task.resolve({
        id: task.options.id,
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
        executionTimeMs: Date.now() - start,
      });
    } finally {
      this.activeCount--;
      this.pump();
    }
  }
}
