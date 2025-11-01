/**
 * ChartRenderIntegration - Integration helpers for chart operations
 * 
 * Provides high-level functions to integrate the render system with chart operations:
 * - Indicator add/remove
 * - Timeframe changes
 * - Chart type switches
 * - Sidebar operations
 */

import type { Chart } from 'klinecharts';
import { getRenderTransaction, type RenderTransactionConfig } from './RenderTransaction';
import { getLayoutTransitionManager } from './LayoutTransitionManager';
import { getRenderScheduler } from './RenderScheduler';
import { browser } from '$app/environment';

export interface IndicatorOperation {
  chart: Chart;
  name: string;
  paneId?: string;
  params?: any[];
  isMain?: boolean;
}

export interface TimeframeOperation {
  chart: Chart;
  period: any;
  loadDataFn: () => Promise<void>;
}

export interface ChartTypeOperation {
  chart: Chart;
  newType: string;
  reloadDataFn: () => Promise<void>;
}

export interface SidebarOperation {
  chart: Chart;
  visible: boolean;
  widthPx?: number;
}

export class ChartRenderIntegration {
  private transaction = getRenderTransaction();
  private layoutManager = getLayoutTransitionManager();
  private scheduler = getRenderScheduler();
  private applyCanvasColorsFn: (() => void) | null = null;

  /**
   * Set the canvas colors apply function (called after operations)
   */
  setApplyCanvasColorsFunction(fn: () => void): void {
    this.applyCanvasColorsFn = fn;
  }

  /**
   * Reapply saved canvas colors from localStorage
   */
  private reapplyCanvasColors(): void {
    if (this.applyCanvasColorsFn) {
      this.applyCanvasColorsFn();
    }
  }

  /**
   * Add an indicator with flicker-free rendering
   */
  async addIndicator(op: IndicatorOperation): Promise<string | null> {
    let indicatorId: string | null = null;

    await this.transaction.run({
      reason: 'indicator',
      chart: op.chart,
      
      mutateState: () => {
        // Create indicator
        indicatorId = op.chart.createIndicator({
          name: op.name,
          calcParams: op.params
        }, op.isMain ?? false, op.paneId ? { id: op.paneId } : undefined) as string;
      },
      
      compute: async () => {
        // Indicator calculation happens automatically
        // Wait a tick to ensure it's complete
        await new Promise(resolve => setTimeout(resolve, 0));
      },
      
      commit: () => {
        // Chart will auto-render, but we ensure it's in the same frame
        console.log(`✅ Indicator added: ${op.name} (${indicatorId})`);
        
        // Reapply saved canvas colors to preserve user settings
        this.scheduler.request(() => {
          this.reapplyCanvasColors();
        });
      }
    });

    return indicatorId;
  }

  /**
   * Remove an indicator with flicker-free rendering
   */
  async removeIndicator(op: IndicatorOperation): Promise<void> {
    await this.transaction.run({
      reason: 'indicator',
      chart: op.chart,
      
      mutateState: () => {
        // Remove indicator
        op.chart.removeIndicator({ 
          paneId: op.paneId!, 
          name: op.name 
        });
      },
      
      commit: () => {
        console.log(`✅ Indicator removed: ${op.name}`);
      }
    });
  }

  /**
   * Change timeframe with flicker-free rendering
   */
  async changeTimeframe(op: TimeframeOperation): Promise<void> {
    await this.transaction.run({
      reason: 'timeframe',
      chart: op.chart,
      
      compute: async () => {
        // Load new data for the timeframe
        await op.loadDataFn();
      },
      
      commit: () => {
        // Data is already applied via loadDataFn
        console.log('✅ Timeframe changed');
        
        // Reapply saved canvas colors to preserve user settings
        this.scheduler.request(() => {
          this.reapplyCanvasColors();
        });
      }
    });
  }

  /**
   * Switch chart type with flicker-free rendering
   */
  async switchChartType(op: ChartTypeOperation): Promise<void> {
    await this.transaction.run({
      reason: 'type',
      chart: op.chart,
      
      mutateState: () => {
        // Chart type is usually handled via styles
        // The actual type switching happens in the reload
      },
      
      compute: async () => {
        // Reload data with new type transformation
        await op.reloadDataFn();
      },
      
      commit: () => {
        console.log(`✅ Chart type switched to: ${op.newType}`);
        
        // Reapply saved canvas colors to preserve user settings
        this.scheduler.request(() => {
          this.reapplyCanvasColors();
        });
      }
    });
  }

  /**
   * Toggle/resize sidebar with flicker-free rendering
   */
  async sidebarOperation(op: SidebarOperation): Promise<void> {
    const layoutKey = 'sidebar';
    this.layoutManager.register(layoutKey);

    await this.transaction.run({
      reason: 'sidebar',
      chart: op.chart,
      skipTransitions: true,
      
      mutateState: () => {
        // Disable transitions for first frame
        this.layoutManager.disable(layoutKey);
      },
      
      measure: () => {
        // Container measurements happen automatically
        // but we ensure they're in the same frame
      },
      
      commit: () => {
        // Resize chart
        this.scheduler.request(() => {
          op.chart.resize();
          
          // Reapply saved canvas colors after resize
          this.reapplyCanvasColors();
          
          // Re-enable transitions after next frame
          requestAnimationFrame(() => {
            this.layoutManager.enable(layoutKey);
          });
        });
      }
    });
  }

  /**
   * Theme change with flicker-free rendering
   */
  async changeTheme(chart: Chart, applyStylesFn: () => void): Promise<void> {
    await this.transaction.run({
      reason: 'theme',
      chart: chart,
      
      mutateState: () => {
        applyStylesFn();
      },
      
      commit: () => {
        console.log('✅ Theme changed');
      }
    });
  }

  /**
   * Generic chart resize operation
   */
  resizeChart(chart: Chart): void {
    this.scheduler.request(() => {
      chart.resize();
    });
  }

  /**
   * Batch multiple indicator operations
   */
  async batchIndicatorOperations(
    operations: Array<{ type: 'add' | 'remove', operation: IndicatorOperation }>
  ): Promise<void> {
    const configs: RenderTransactionConfig[] = operations.map(op => ({
      reason: 'indicator' as const,
      chart: op.operation.chart,
      
      mutateState: () => {
        if (op.type === 'add') {
          op.operation.chart.createIndicator({
            name: op.operation.name,
            calcParams: op.operation.params
          }, op.operation.isMain ?? false, op.operation.paneId ? { id: op.operation.paneId } : undefined);
        } else {
          op.operation.chart.removeIndicator({
            paneId: op.operation.paneId!,
            name: op.operation.name
          });
        }
      }
    }));

    await this.transaction.batch(configs);
  }
}

// Global singleton instance
let globalIntegration: ChartRenderIntegration | null = null;

export function getChartRenderIntegration(): ChartRenderIntegration {
  if (!globalIntegration) {
    globalIntegration = new ChartRenderIntegration();
  }
  return globalIntegration;
}
