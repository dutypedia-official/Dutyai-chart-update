/**
 * Event management system for overlay re-projection
 * Handles chart events that require overlay updates
 */

import type { Chart } from 'klinecharts';
import type { OverlayProjectionManager } from './kline/overlays/overlayProjection';
import type { OverlayCreationManager } from './overlayCreation';

/**
 * Event types that trigger overlay re-projection
 */
export type OverlayEventType = 
  | 'timeframeChange'
  | 'zoom'
  | 'scroll'
  | 'resize'
  | 'dataUpdate'
  | 'priceScaleChange';

/**
 * Event listener configuration
 */
export interface EventListenerConfig {
  debounceMs?: number;
  throttleMs?: number;
  enabled?: boolean;
}

/**
 * Default event configurations
 */
const DEFAULT_EVENT_CONFIG: Record<OverlayEventType, EventListenerConfig> = {
  timeframeChange: { debounceMs: 100, enabled: true },
  zoom: { throttleMs: 16, enabled: true }, // ~60fps
  scroll: { throttleMs: 16, enabled: true },
  resize: { debounceMs: 250, enabled: true },
  dataUpdate: { debounceMs: 50, enabled: true },
  priceScaleChange: { debounceMs: 100, enabled: true }
};

/**
 * Event manager for overlay system
 */
export class OverlayEventManager {
  private chart: Chart;
  private projectionManager: OverlayProjectionManager | null = null;
  private creationManager: OverlayCreationManager | null = null;
  private eventListeners: Map<string, () => void> = new Map();
  private resizeObserver: ResizeObserver | null = null;
  private config: Record<OverlayEventType, EventListenerConfig>;
  private debounceTimers: Map<OverlayEventType, NodeJS.Timeout> = new Map();
  private throttleTimers: Map<OverlayEventType, number> = new Map();

  constructor(
    chart: Chart, 
    config: Partial<Record<OverlayEventType, EventListenerConfig>> = {}
  ) {
    this.chart = chart;
    this.config = { ...DEFAULT_EVENT_CONFIG, ...config };
  }

  /**
   * Set the projection manager
   */
  setProjectionManager(manager: OverlayProjectionManager): void {
    this.projectionManager = manager;
  }

  /**
   * Set the creation manager
   */
  setCreationManager(manager: OverlayCreationManager): void {
    this.creationManager = manager;
  }

  /**
   * Initialize all event listeners
   */
  initialize(): void {
    this.setupChartEventListeners();
    this.setupResizeObserver();
    this.setupCustomEventListeners();
  }

  /**
   * Setup chart-specific event listeners
   */
  private setupChartEventListeners(): void {
    // Note: KLineCharts doesn't expose direct zoom/scroll events
    // We'll use a polling approach to detect viewport changes
    this.setupViewportChangeDetection();
  }

  /**
   * Setup viewport change detection using polling
   */
  private setupViewportChangeDetection(): void {
    let lastVisibleRange: { from: number; to: number } | null = null;
    let lastPriceRange: { min: number; max: number } | null = null;

    const checkViewportChanges = () => {
      try {
        const currentRange = this.chart.getVisibleRange();
        
        if (currentRange && this.hasRangeChanged(lastVisibleRange, currentRange)) {
          lastVisibleRange = currentRange;
          this.handleEvent('scroll');
        }

        // Note: Price scale change detection may not be available in current KLineCharts API
        // This is a placeholder for future implementation when the API is available
      } catch (error) {
        console.error('Error checking viewport changes:', error);
      }
    };

    // Poll for changes at 60fps
    const intervalId = setInterval(checkViewportChanges, 16);
    this.eventListeners.set('viewportPolling', () => clearInterval(intervalId));
  }

  /**
   * Setup resize observer for container changes
   */
  private setupResizeObserver(): void {
    const container = this.chart.getDom();
    if (!container) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.handleEvent('resize');
    });

    this.resizeObserver.observe(container);
  }

  /**
   * Setup custom event listeners for timeframe and data changes
   */
  private setupCustomEventListeners(): void {
    // Listen for custom events dispatched by the chart component
    const container = this.chart.getDom();
    if (!container) return;

    const timeframeListener = () => this.handleEvent('timeframeChange');
    const dataUpdateListener = () => this.handleEvent('dataUpdate');

    container.addEventListener('timeframeChange', timeframeListener);
    container.addEventListener('dataUpdate', dataUpdateListener);

    this.eventListeners.set('timeframeChange', () => {
      container.removeEventListener('timeframeChange', timeframeListener);
    });

    this.eventListeners.set('dataUpdate', () => {
      container.removeEventListener('dataUpdate', dataUpdateListener);
    });
  }

  /**
   * Handle an overlay event with debouncing/throttling
   */
  private handleEvent(eventType: OverlayEventType): void {
    const config = this.config[eventType];
    if (!config.enabled) return;

    if (config.debounceMs) {
      this.debounceEvent(eventType, config.debounceMs);
    } else if (config.throttleMs) {
      this.throttleEvent(eventType, config.throttleMs);
    } else {
      this.executeEvent(eventType);
    }
  }

  /**
   * Debounce an event
   */
  private debounceEvent(eventType: OverlayEventType, delay: number): void {
    const existingTimer = this.debounceTimers.get(eventType);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.executeEvent(eventType);
      this.debounceTimers.delete(eventType);
    }, delay);

    this.debounceTimers.set(eventType, timer);
  }

  /**
   * Throttle an event
   */
  private throttleEvent(eventType: OverlayEventType, delay: number): void {
    const lastExecution = this.throttleTimers.get(eventType) || 0;
    const now = Date.now();

    if (now - lastExecution >= delay) {
      this.executeEvent(eventType);
      this.throttleTimers.set(eventType, now);
    }
  }

  /**
   * Execute the event handler
   */
  private executeEvent(eventType: OverlayEventType): void {
    try {
      // Trigger re-projection if projection manager is available
      if (this.projectionManager) {
        // Use the public method to trigger projection
        this.projectionManager.forceProjection();
      }

      // Dispatch custom event for other components
      const container = this.chart.getDom();
      if (container) {
        container.dispatchEvent(new CustomEvent('overlayEvent', {
          detail: { type: eventType, timestamp: Date.now() }
        }));
      }
    } catch (error) {
      console.error(`Error handling ${eventType} event:`, error);
    }
  }

  /**
   * Check if visible range has changed
   */
  private hasRangeChanged(
    lastRange: { from: number; to: number } | null,
    currentRange: { from: number; to: number }
  ): boolean {
    if (!lastRange) return true;
    return lastRange.from !== currentRange.from || lastRange.to !== currentRange.to;
  }

  /**
   * Check if price range has changed
   */
  private hasPriceRangeChanged(
    lastRange: { min: number; max: number } | null,
    currentRange: { min: number; max: number }
  ): boolean {
    if (!lastRange) return true;
    return Math.abs(lastRange.min - currentRange.min) > 1e-8 || 
           Math.abs(lastRange.max - currentRange.max) > 1e-8;
  }

  /**
   * Manually trigger an event
   */
  triggerEvent(eventType: OverlayEventType): void {
    this.handleEvent(eventType);
  }

  /**
   * Update event configuration
   */
  updateConfig(eventType: OverlayEventType, config: EventListenerConfig): void {
    this.config[eventType] = { ...this.config[eventType], ...config };
  }

  /**
   * Enable/disable specific event types
   */
  setEventEnabled(eventType: OverlayEventType, enabled: boolean): void {
    this.config[eventType].enabled = enabled;
  }

  /**
   * Cleanup all event listeners
   */
  destroy(): void {
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.throttleTimers.clear();

    // Remove all event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners.clear();

    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}

/**
 * Global event manager instance
 */
let overlayEventManager: OverlayEventManager | null = null;

/**
 * Initialize the overlay event manager
 */
export function initializeOverlayEventManager(
  chart: Chart,
  config?: Partial<Record<OverlayEventType, EventListenerConfig>>
): OverlayEventManager {
  overlayEventManager = new OverlayEventManager(chart, config);
  return overlayEventManager;
}

/**
 * Get the current overlay event manager instance
 */
export function getOverlayEventManager(): OverlayEventManager | null {
  return overlayEventManager;
}

/**
 * Dispatch a custom timeframe change event
 */
export function dispatchTimeframeChange(chart: Chart): void {
  const container = chart.getDom();
  if (container) {
    container.dispatchEvent(new CustomEvent('timeframeChange'));
  }
}

/**
 * Dispatch a custom data update event
 */
export function dispatchDataUpdate(chart: Chart): void {
  const container = chart.getDom();
  if (container) {
    container.dispatchEvent(new CustomEvent('dataUpdate'));
  }
}