import { describe, it, expect } from 'vitest';
import { TaskScheduler } from '../src/scheduler.js';

describe('TaskScheduler Verification Suite', () => {
  it('1. should execute a basic task successfully', async () => {
    const scheduler = new TaskScheduler({ maxConcurrency: 2, capacity: 10, refillRatePerSecond: 10 });
    const result = await scheduler.submit({ id: 't1', priority: 'MEDIUM', tokensRequired: 1 }, async () => 42);
    expect(result.success).toBe(true);
    expect(result.value).toBe(42);
    expect(scheduler.getActiveCount()).toBe(0);
  });

  it('2. should respect maxConcurrency limit', async () => {
    const scheduler = new TaskScheduler({ maxConcurrency: 2, capacity: 10, refillRatePerSecond: 10 });
    let maxObservedActive = 0;

    const makeTask = (id: string) =>
      scheduler.submit({ id, priority: 'MEDIUM', tokensRequired: 1 }, async () => {
        maxObservedActive = Math.max(maxObservedActive, scheduler.getActiveCount());
        await new Promise((r) => setTimeout(r, 20));
        return id;
      });

    await Promise.all([makeTask('a'), makeTask('b'), makeTask('c'), makeTask('d')]);
    expect(maxObservedActive).toBeLessThanOrEqual(2);
    expect(scheduler.getActiveCount()).toBe(0);
  });

  it('3. should enforce FIFO stability for tasks with equal priority', async () => {
    const scheduler = new TaskScheduler({ maxConcurrency: 1, capacity: 10, refillRatePerSecond: 10 });
    const order: string[] = [];

    const p1 = scheduler.submit({ id: 'first', priority: 'HIGH', tokensRequired: 1 }, async () => {
      await new Promise((r) => setTimeout(r, 25));
      order.push('first');
    });

    const p2 = scheduler.submit({ id: 'second', priority: 'HIGH', tokensRequired: 1 }, async () => {
      order.push('second');
    });

    const p3 = scheduler.submit({ id: 'third', priority: 'HIGH', tokensRequired: 1 }, async () => {
      order.push('third');
    });

    await Promise.all([p1, p2, p3]);
    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('4. should prioritize higher priority tasks over lower priority', async () => {
    const scheduler = new TaskScheduler({ maxConcurrency: 1, capacity: 10, refillRatePerSecond: 10 });
    const order: string[] = [];

    const blocker = scheduler.submit({ id: 'blocker', priority: 'LOW', tokensRequired: 1 }, async () => {
      await new Promise((r) => setTimeout(r, 30));
      order.push('blocker');
    });

    const low = scheduler.submit({ id: 'low', priority: 'LOW', tokensRequired: 1 }, async () => {
      order.push('low');
    });

    const critical = scheduler.submit({ id: 'critical', priority: 'CRITICAL', tokensRequired: 1 }, async () => {
      order.push('critical');
    });

    await Promise.all([blocker, low, critical]);
    expect(order).toEqual(['blocker', 'critical', 'low']);
  });

  it('5. should never allow available tokens to exceed bucket capacity', async () => {
    const scheduler = new TaskScheduler({ maxConcurrency: 5, capacity: 10, refillRatePerSecond: 100 });
    // Wait for 100ms to allow refill logic to fire
    await new Promise((r) => setTimeout(r, 100));
    const available = scheduler.getAvailableTokens();
    expect(available).toBeLessThanOrEqual(10);
  });

  it('6. should maintain non-negative active count on aborted execution', async () => {
    const scheduler = new TaskScheduler({ maxConcurrency: 2, capacity: 10, refillRatePerSecond: 10 });

    const p1 = scheduler.submit({ id: 'abort-me', priority: 'HIGH', tokensRequired: 1 }, async (signal) => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      if (signal.aborted) {
        throw new Error('Aborted');
      }
      return 'done';
    });

    // Cancel while running
    setTimeout(() => {
      scheduler.cancel('abort-me');
    }, 10);

    await p1.catch(() => {});
    await new Promise((r) => setTimeout(r, 50));
    expect(scheduler.getActiveCount()).toBe(0);
    expect(scheduler.getActiveCount()).toBeGreaterThanOrEqual(0);
  });

  it('7. should cancel queued tasks before execution', async () => {
    const scheduler = new TaskScheduler({ maxConcurrency: 1, capacity: 10, refillRatePerSecond: 10 });
    let ran = false;

    const blocker = scheduler.submit({ id: 'b', priority: 'HIGH', tokensRequired: 1 }, async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    const queued = scheduler.submit({ id: 'q', priority: 'HIGH', tokensRequired: 1 }, async () => {
      ran = true;
    });

    expect(scheduler.getQueueLength()).toBe(1);
    const cancelled = scheduler.cancel('q');
    expect(cancelled).toBe(true);

    const result = await queued;
    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('cancelled');
    await blocker;
    expect(ran).toBe(false);
  });

  it('8. should handle task handler exceptions gracefully', async () => {
    const scheduler = new TaskScheduler({ maxConcurrency: 1, capacity: 10, refillRatePerSecond: 10 });
    const result = await scheduler.submit({ id: 'err', priority: 'MEDIUM', tokensRequired: 1 }, async () => {
      throw new Error('Custom handler failure');
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Custom handler failure');
    expect(scheduler.getActiveCount()).toBe(0);
  });

  it('9. should throttle execution when token bucket is exhausted', async () => {
    const scheduler = new TaskScheduler({ maxConcurrency: 5, capacity: 2, refillRatePerSecond: 20 });
    const times: number[] = [];
    const start = Date.now();

    const t1 = scheduler.submit({ id: '1', priority: 'HIGH', tokensRequired: 2 }, async () => {
      times.push(Date.now() - start);
    });

    const t2 = scheduler.submit({ id: '2', priority: 'HIGH', tokensRequired: 2 }, async () => {
      times.push(Date.now() - start);
    });

    await Promise.all([t1, t2]);
    expect(times.length).toBe(2);
    // Task 2 must wait for token refill
    expect(times[1]).toBeGreaterThanOrEqual(40);
  });

  it('10. should maintain consistent queue state after multiple concurrent submissions and cancellations', async () => {
    const scheduler = new TaskScheduler({ maxConcurrency: 3, capacity: 20, refillRatePerSecond: 50 });
    const promises: Promise<unknown>[] = [];

    for (let i = 0; i < 15; i++) {
      const priority = i % 2 === 0 ? 'HIGH' : 'LOW';
      promises.push(
        scheduler.submit({ id: `bulk-${i}`, priority, tokensRequired: 1 }, async () => {
          await new Promise((r) => setTimeout(r, 10));
          return i;
        })
      );
    }

    scheduler.cancel('bulk-3');
    scheduler.cancel('bulk-7');

    await Promise.all(promises);
    expect(scheduler.getActiveCount()).toBe(0);
    expect(scheduler.getQueueLength()).toBe(0);
  });
});
