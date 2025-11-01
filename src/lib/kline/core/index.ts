/**
 * Flicker-free rendering system for chart operations
 * 
 * This module provides a comprehensive system to prevent visual flickering
 * during chart operations like indicator add/remove, timeframe changes,
 * chart type switches, and sidebar operations.
 */

export { RenderScheduler, getRenderScheduler, type RenderCallback } from './RenderScheduler';
export { 
  RenderTransaction, 
  getRenderTransaction, 
  type RenderReason, 
  type RenderTransactionConfig 
} from './RenderTransaction';
export { 
  LayoutTransitionManager, 
  getLayoutTransitionManager, 
  withoutTransitions,
  type TransitionState 
} from './LayoutTransitionManager';
export { 
  ActionCoalescer, 
  Debouncer, 
  Throttler,
  type CoalescedAction 
} from './ActionCoalescer';
export { 
  ChartRenderIntegration, 
  getChartRenderIntegration,
  type IndicatorOperation,
  type TimeframeOperation,
  type ChartTypeOperation,
  type SidebarOperation
} from './ChartRenderIntegration';
