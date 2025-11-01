/**
 * RenderTransaction - Atomic render transaction system
 * 
 * Ensures complex operations (indicator add, timeframe change, etc.) 
 * complete as a single atomic unit: measure → compute → draw → commit
 */

import type { Chart } from 'klinecharts';
import { getRenderScheduler } from './RenderScheduler';

export type RenderReason = 'indicator' | 'timeframe' | 'type' | 'sidebar' | 'theme' | 'resize' | 'init';

export interface RenderTransactionConfig {
  reason: RenderReason;
  chart?: Chart | null;
  
  // Phase 1: Mutate state (series, indicators, etc.)
  mutateState?: () => void | Promise<void>;
  
  // Phase 2: Measure layout (container sizes, canvas dimensions)
  measure?: () => void | Promise<void>;
  
  // Phase 3: Compute (indicator calculations, scales, axes)
  compute?: () => void | Promise<void>;
  
  // Phase 4: Draw (render to offscreen or direct)
  draw?: (chart: Chart) => void | Promise<void>;
  
  // Phase 5: Commit (finalize, apply styles, resize)
  commit?: () => void | Promise<void>;
  
  // Optional: Cleanup after transaction
  cleanup?: () => void;
  
  // Skip transition for this transaction (first frame)
  skipTransitions?: boolean;
}

export class RenderTransaction {
  private scheduler = getRenderScheduler();
  private inProgress = false;
  private queue: RenderTransactionConfig[] = [];

  /**
   * Run a render transaction atomically
   * All phases execute in a single RAF callback
   */
  async run(config: RenderTransactionConfig): Promise<void> {
    // If already in progress, queue this transaction
    if (this.inProgress) {
      this.queue.push(config);
      return;
    }

    this.inProgress = true;

    try {
      await this.executeTransaction(config);
    } finally {
      this.inProgress = false;
      
      // Process queued transactions
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        this.run(next);
      }
    }
  }

  private async executeTransaction(config: RenderTransactionConfig): Promise<void> {
    const { reason, chart, mutateState, measure, compute, draw, commit, cleanup, skipTransitions } = config;
    
    console.log(`🔄 RenderTransaction [${reason}] starting...`);
    const startTime = performance.now();

    // Execute all phases in a single RAF
    this.scheduler.request(async () => {
      try {
        // Phase 1: Mutate state
        if (mutateState) {
          await mutateState();
        }

        // Phase 2: Measure layout
        if (measure) {
          await measure();
        }

        // Phase 3: Compute (calculations, scales)
        if (compute) {
          await compute();
        }

        // Phase 4: Draw
        if (draw && chart) {
          await draw(chart);
        }

        // Phase 5: Commit
        if (commit) {
          await commit();
        }

        const duration = performance.now() - startTime;
        console.log(`✅ RenderTransaction [${reason}] completed in ${duration.toFixed(2)}ms`);

      } catch (error) {
        console.error(`❌ RenderTransaction [${reason}] failed:`, error);
      } finally {
        // Cleanup
        if (cleanup) {
          cleanup();
        }
      }
    });
  }

  /**
   * Run multiple transactions as a batch
   * Useful for operations like adding multiple indicators at once
   */
  async batch(configs: RenderTransactionConfig[]): Promise<void> {
    if (configs.length === 0) return;
    
    // Coalesce multiple configs into a single transaction
    const coalesced: RenderTransactionConfig = {
      reason: configs[0].reason,
      chart: configs[0].chart,
      
      mutateState: async () => {
        for (const config of configs) {
          if (config.mutateState) await config.mutateState();
        }
      },
      
      measure: async () => {
        for (const config of configs) {
          if (config.measure) await config.measure();
        }
      },
      
      compute: async () => {
        for (const config of configs) {
          if (config.compute) await config.compute();
        }
      },
      
      draw: async (chart: Chart) => {
        for (const config of configs) {
          if (config.draw) await config.draw(chart);
        }
      },
      
      commit: async () => {
        for (const config of configs) {
          if (config.commit) await config.commit();
        }
      },
      
      cleanup: () => {
        for (const config of configs) {
          if (config.cleanup) config.cleanup();
        }
      }
    };

    await this.run(coalesced);
  }

  /**
   * Check if a transaction is currently in progress
   */
  isInProgress(): boolean {
    return this.inProgress;
  }

  /**
   * Get the number of queued transactions
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

// Global singleton instance
let globalTransaction: RenderTransaction | null = null;

export function getRenderTransaction(): RenderTransaction {
  if (!globalTransaction) {
    globalTransaction = new RenderTransaction();
  }
  return globalTransaction;
}
