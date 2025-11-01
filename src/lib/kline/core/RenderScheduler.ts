/**
 * RenderScheduler - RAF-batched rendering utility
 * 
 * Ensures all render operations are batched into a single requestAnimationFrame
 * to prevent multiple paints per frame and flickering.
 */

export type RenderCallback = () => void | Promise<void>;

export class RenderScheduler {
  private pending = false;
  private callbacks: RenderCallback[] = [];
  private rafId: number | null = null;

  /**
   * Request a render operation to be executed in the next frame
   * Multiple requests in the same frame are automatically batched
   */
  request(fn: RenderCallback): void {
    this.callbacks.push(fn);
    
    if (this.pending) return;
    
    this.pending = true;
    this.rafId = requestAnimationFrame(async () => {
      this.pending = false;
      this.rafId = null;
      
      const toExecute = [...this.callbacks];
      this.callbacks = [];
      
      // Execute all callbacks in order
      for (const callback of toExecute) {
        try {
          await callback();
        } catch (error) {
          console.error('RenderScheduler: Error executing callback', error);
        }
      }
    });
  }

  /**
   * Cancel any pending render operation
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pending = false;
    this.callbacks = [];
  }

  /**
   * Check if a render is currently pending
   */
  isPending(): boolean {
    return this.pending;
  }

  /**
   * Execute a callback immediately in the next frame, bypassing the batch queue
   * Useful for high-priority operations
   */
  immediate(fn: RenderCallback): void {
    requestAnimationFrame(async () => {
      try {
        await fn();
      } catch (error) {
        console.error('RenderScheduler: Error executing immediate callback', error);
      }
    });
  }
}

// Global singleton instance
let globalScheduler: RenderScheduler | null = null;

export function getRenderScheduler(): RenderScheduler {
  if (!globalScheduler) {
    globalScheduler = new RenderScheduler();
  }
  return globalScheduler;
}
