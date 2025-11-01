/**
 * ActionCoalescer - Coalesces rapid actions into batched operations
 * 
 * Prevents multiple rapid operations (e.g., adding multiple indicators quickly)
 * from causing separate render cycles.
 */

export type CoalescedAction<T = any> = {
  id: string;
  data: T;
  timestamp: number;
};

export class ActionCoalescer<T = any> {
  private actions: Map<string, CoalescedAction<T>> = new Map();
  private timeoutId: number | null = null;
  private windowMs: number;
  private callback: (actions: CoalescedAction<T>[]) => void | Promise<void>;

  constructor(windowMs: number, callback: (actions: CoalescedAction<T>[]) => void | Promise<void>) {
    this.windowMs = windowMs;
    this.callback = callback;
  }

  /**
   * Add an action to the coalescing window
   * If an action with the same ID exists, it will be replaced
   */
  add(id: string, data: T): void {
    this.actions.set(id, {
      id,
      data,
      timestamp: Date.now()
    });

    this.scheduleFlush();
  }

  /**
   * Schedule a flush of all pending actions
   */
  private scheduleFlush(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.windowMs) as unknown as number;
  }

  /**
   * Flush all pending actions immediately
   */
  async flush(): Promise<void> {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.actions.size === 0) return;

    const toProcess = Array.from(this.actions.values());
    this.actions.clear();

    try {
      await this.callback(toProcess);
    } catch (error) {
      console.error('ActionCoalescer: Error executing callback', error);
    }
  }

  /**
   * Cancel all pending actions
   */
  cancel(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.actions.clear();
  }

  /**
   * Get the number of pending actions
   */
  getPendingCount(): number {
    return this.actions.size;
  }

  /**
   * Check if any actions are pending
   */
  hasPending(): boolean {
    return this.actions.size > 0;
  }
}

/**
 * Debouncer - Simple debounce utility for individual actions
 */
export class Debouncer {
  private timeoutId: number | null = null;
  private delayMs: number;

  constructor(delayMs: number) {
    this.delayMs = delayMs;
  }

  /**
   * Debounce a function call
   */
  debounce(fn: () => void | Promise<void>): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(async () => {
      this.timeoutId = null;
      try {
        await fn();
      } catch (error) {
        console.error('Debouncer: Error executing function', error);
      }
    }, this.delayMs) as unknown as number;
  }

  /**
   * Cancel pending debounced call
   */
  cancel(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Check if a call is pending
   */
  isPending(): boolean {
    return this.timeoutId !== null;
  }
}

/**
 * Throttler - RAF-throttled function execution
 * Ensures a function runs at most once per frame
 */
export class Throttler {
  private rafId: number | null = null;
  private pending = false;
  private lastArgs: any[] | null = null;

  /**
   * Throttle a function to run at most once per RAF
   */
  throttle<T extends (...args: any[]) => void | Promise<void>>(fn: T, ...args: Parameters<T>): void {
    this.lastArgs = args;

    if (this.pending) return;

    this.pending = true;
    this.rafId = requestAnimationFrame(async () => {
      this.pending = false;
      this.rafId = null;
      
      const currentArgs = this.lastArgs;
      this.lastArgs = null;

      try {
        await fn(...(currentArgs as Parameters<T>));
      } catch (error) {
        console.error('Throttler: Error executing function', error);
      }
    });
  }

  /**
   * Cancel pending throttled call
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pending = false;
    this.lastArgs = null;
  }

  /**
   * Check if a call is pending
   */
  isPending(): boolean {
    return this.pending;
  }
}
