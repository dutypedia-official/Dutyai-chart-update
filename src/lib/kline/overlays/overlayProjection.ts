/**
 * Overlay projection system for data-space coordinate anchoring
 * Handles re-rendering overlays on viewport changes, timeframe switches, etc.
 */

import type { Chart } from 'klinecharts'
import { ActionType } from 'klinecharts'
import type { 
  DataSpaceOverlay, 
  OverlayPoint, 
  ScreenPoint, 
  CoordinateContext,
  ProjectionResult,
  OverlayEventType,
  OverlayEventData
} from './overlayTypes'
import { dataToScreen, projectPoints, ensureFutureDomain } from './coordinateUtils'

/**
 * Overlay projection manager
 * Manages the lifecycle of overlays and their projection from data-space to screen-space
 */
export class OverlayProjectionManager {
  private chart: Chart
  private overlays: Map<string, DataSpaceOverlay> = new Map()
  private projectionQueue: Set<string> = new Set()
  private isProjecting: boolean = false
  private eventListeners: Map<OverlayEventType, Set<(data: OverlayEventData) => void>> = new Map()
  private resizeObserver?: ResizeObserver
  private periodicProjectionId?: number
  private lastViewportState?: string
  private animationFrameId: number | null = null

  constructor(chart: Chart) {
    this.chart = chart
    this.initializeEventListeners()
  }

  /**
   * Initialize chart event listeners for automatic re-projection
   */
  private initializeEventListeners(): void {
    // Subscribe to chart events that require overlay re-projection
    // Note: KLineCharts may not have all action types, so we use fallback methods
    
    // Try to subscribe to available action types
    // Since ActionType enum may be limited, we'll use a more robust approach
    
    // Use ResizeObserver for container changes
    if (typeof ResizeObserver !== 'undefined') {
      const container = this.chart.getDom()
      if (container) {
        const resizeObserver = new ResizeObserver(() => {
          this.scheduleProjection('resize')
        })
        resizeObserver.observe(container)
        this.resizeObserver = resizeObserver
      }
    }

    // Set up periodic re-projection as fallback
    // This ensures overlays stay synchronized even if specific events aren't available
    this.setupPeriodicProjection()
  }

  /**
   * Set up periodic projection to handle viewport changes
   */
  private setupPeriodicProjection(): void {
    this.periodicProjectionId = window.setInterval(() => {
      const currentViewportState = this.getViewportState()
      if (currentViewportState !== this.lastViewportState) {
        this.lastViewportState = currentViewportState
        this.scheduleProjection('scroll')
      }
    }, 100) // Check every 100ms
  }

  /**
   * Get current viewport state for change detection
   */
  private getViewportState(): string {
    try {
      const visibleRange = this.chart.getVisibleRange()
      const chartSize = this.chart.getSize()
      return JSON.stringify({ visibleRange, chartSize })
    } catch (e) {
      return ''
    }
  }

  /**
   * Schedule overlay projection with debouncing
   */
  private scheduleProjection(eventType: OverlayEventType): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.projectAllOverlays(eventType)
      this.animationFrameId = null
    })
  }

  /**
   * Add an overlay to the projection system
   */
  addOverlay(overlay: DataSpaceOverlay): void {
    this.overlays.set(overlay.id, overlay)
    
    // Ensure future domain if overlay extends beyond last candle
    if (overlay.points.length > 0) {
      ensureFutureDomain(overlay.points, this.chart)
    }
    
    // Project the new overlay immediately
    this.projectOverlay(overlay)
  }

  /**
   * Remove an overlay from the projection system
   */
  removeOverlay(overlayId: string): void {
    this.overlays.delete(overlayId)
    
    // Remove from chart if it exists
    try {
      this.chart.removeOverlay({ id: overlayId })
    } catch (e) {
      console.warn('Could not remove overlay from chart:', e)
    }
  }

  /**
   * Update an existing overlay
   */
  updateOverlay(overlay: DataSpaceOverlay): void {
    if (this.overlays.has(overlay.id)) {
      this.overlays.set(overlay.id, overlay)
      
      // Ensure future domain if overlay extends beyond last candle
      if (overlay.points.length > 0) {
        ensureFutureDomain(overlay.points, this.chart)
      }
      
      // Re-project the updated overlay
      this.projectOverlay(overlay)
    }
  }

  /**
   * Get an overlay by ID
   */
  getOverlay(overlayId: string): DataSpaceOverlay | undefined {
    return this.overlays.get(overlayId)
  }

  /**
   * Get all overlays
   */
  getAllOverlays(): DataSpaceOverlay[] {
    return Array.from(this.overlays.values())
  }

  /**
   * Project a single overlay from data-space to screen-space
   */
  private projectOverlay(overlay: DataSpaceOverlay): ProjectionResult {
    const context: CoordinateContext = {
      chart: this.chart,
      paneId: 'candle_pane' // Default pane, could be configurable
    }

    const result = projectPoints(overlay.points, context)
    
    if (result.isValid && overlay.visible !== false) {
      // Update the chart overlay with new screen coordinates
      this.updateChartOverlay(overlay, result.screenPoints)
    }

    return result
  }

  /**
   * Project all overlays
   */
  private projectAllOverlays(eventType: OverlayEventType): void {
    if (this.isProjecting) {
      return // Prevent recursive projection
    }

    this.isProjecting = true

    try {
      const eventData: OverlayEventData = {
        type: eventType,
        chart: this.chart,
        timestamp: Date.now()
      }

      // Emit event to listeners
      this.emitEvent(eventType, eventData)

      // Project each overlay
      for (const overlay of this.overlays.values()) {
        if (overlay.visible !== false) {
          this.projectOverlay(overlay)
        }
      }
    } finally {
      this.isProjecting = false
    }
  }

  /**
   * Update chart overlay with new screen coordinates
   */
  private updateChartOverlay(overlay: DataSpaceOverlay, screenPoints: ScreenPoint[]): void {
    try {
      // Convert screen points to KLineCharts coordinate format
      const coordinates = screenPoints.map(point => ({
        x: point.x,
        y: point.y
      }))

      // Create overlay data in KLineCharts format
      const overlayData = {
        id: overlay.id,
        name: overlay.type,
        points: coordinates.map((coord, index) => ({
          ...coord,
          timestamp: overlay.points[index]?.t,
          value: overlay.points[index]?.p
        })),
        styles: this.convertOverlayStyles(overlay.style),
        visible: overlay.visible,
        lock: overlay.lock
      }

      // Update or create overlay on chart
      const existingOverlays = this.chart.getOverlays({ id: overlay.id })
      const existingOverlay = existingOverlays.length > 0 ? existingOverlays[0] : null
      if (existingOverlay) {
        // Update existing overlay
        this.chart.overrideOverlay(overlayData)
      } else {
        // Create new overlay
        this.chart.createOverlay(overlayData)
      }
    } catch (error) {
      console.error('Error updating chart overlay:', error)
    }
  }

  /**
   * Convert overlay styles to KLineCharts format
   */
  private convertOverlayStyles(style: any): any {
    // Convert our overlay style format to KLineCharts style format
    const chartStyles: any = {}

    if (style.line) {
      chartStyles.line = {
        color: style.line.color,
        size: style.line.size,
        style: style.line.style === 'dashed' ? 'dashed' : 'solid'
      }
      
      if (style.line.dashedValue) {
        chartStyles.line.dashedValue = style.line.dashedValue
      }
    }

    if (style.text) {
      chartStyles.text = {
        color: style.text.color,
        backgroundColor: style.text.backgroundColor,
        borderColor: style.text.borderColor,
        fontSize: style.text.fontSize
      }
    }

    if (style.polygon) {
      chartStyles.polygon = {
        color: style.polygon.color,
        fillColor: style.polygon.fillColor
      }
    }

    return chartStyles
  }

  /**
   * Handle timeframe changes
   */
  onTimeframeChange(): void {
    // Re-project all overlays after timeframe change
    this.scheduleProjection('timeframeChange')
  }

  /**
   * Handle timezone changes
   */
  onTimezoneChange(): void {
    // Re-project all overlays after timezone change
    this.scheduleProjection('timezoneChange')
  }

  /**
   * Handle price scale changes
   */
  onPriceScaleChange(): void {
    // Re-project all overlays after price scale change
    this.scheduleProjection('priceScaleChange')
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: OverlayEventType, listener: (data: OverlayEventData) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: OverlayEventType, listener: (data: OverlayEventData) => void): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(eventType: OverlayEventType, data: OverlayEventData): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('Error in overlay event listener:', error)
        }
      })
    }
  }

  /**
   * Force re-projection of all overlays
   */
  forceProjection(): void {
    this.projectAllOverlays('resize')
  }

  /**
   * Clear all overlays
   */
  clearAllOverlays(): void {
    for (const overlayId of this.overlays.keys()) {
      this.removeOverlay(overlayId)
    }
    this.overlays.clear()
  }

  /**
   * Dispose of the projection manager
   */
  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = undefined
    }
    
    if (this.periodicProjectionId) {
      clearInterval(this.periodicProjectionId)
      this.periodicProjectionId = undefined
    }
    
    this.clearAllOverlays()
    this.eventListeners.clear()
  }
}

/**
 * Create a global projection manager instance
 */
let globalProjectionManager: OverlayProjectionManager | null = null

/**
 * Get or create the global projection manager
 */
export function getProjectionManager(chart: Chart): OverlayProjectionManager {
  if (!globalProjectionManager) {
    globalProjectionManager = new OverlayProjectionManager(chart)
  }
  return globalProjectionManager
}

/**
 * Reset the global projection manager
 */
export function resetProjectionManager(): void {
  if (globalProjectionManager) {
    globalProjectionManager.dispose()
    globalProjectionManager = null
  }
}