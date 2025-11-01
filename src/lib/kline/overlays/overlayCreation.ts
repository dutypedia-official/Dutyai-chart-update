/**
 * Enhanced overlay creation system with data-space coordinate anchoring
 * Converts screen coordinates to timestamp/price coordinates during creation
 */

import type { Chart, OverlayEvent } from 'klinecharts'
import type { 
  DataSpaceOverlay, 
  OverlayPoint, 
  ScreenPoint,
  OverlayStyle
} from './overlayTypes'
import { screenToData, generatePointId } from './coordinateUtils'
import { OVERLAY_CONSTANTS } from './overlayTypes'

/**
 * Enhanced overlay creation options
 */
export interface OverlayCreationOptions {
  symbolKey?: string // Symbol key for the overlay (required for persistence)
  groupId?: string
  paneId?: string
  visible?: boolean
  lock?: boolean
  style?: OverlayStyle
  onDrawEnd?: (overlay: DataSpaceOverlay) => void
  onPressedMoving?: (overlay: DataSpaceOverlay) => void
  onPressedMoveEnd?: (overlay: DataSpaceOverlay) => void
  onSelected?: (overlay: DataSpaceOverlay) => void
  onDeselected?: (overlay: DataSpaceOverlay) => void
}

/**
 * Overlay creation manager
 */
export class OverlayCreationManager {
  private chart: Chart
  private overlayStorage: Map<string, DataSpaceOverlay> = new Map()
  private currentSymbolKey: string | null = null

  constructor(chart: Chart) {
    this.chart = chart
  }

  /**
   * Set the current symbol key for new overlays
   */
  setCurrentSymbolKey(symbolKey: string): void {
    this.currentSymbolKey = symbolKey
    console.log('📍 OverlayCreationManager symbol set:', symbolKey)
  }

  /**
   * Get the current symbol key
   */
  getCurrentSymbolKey(): string | null {
    return this.currentSymbolKey
  }

  /**
   * Create point from mouse coordinates
   * Converts screen coordinates to data-space coordinates
   */
  createPointFromMouse(mouseX: number, mouseY: number, paneId: string = 'candle_pane'): OverlayPoint {
    const screenPoint: ScreenPoint = { x: mouseX, y: mouseY }
    const context = { chart: this.chart, paneId }
    const dataPoint = screenToData(screenPoint, context)
    
    if (!dataPoint) {
      throw new Error('Failed to convert screen coordinates to data-space coordinates')
    }

    return dataPoint
  }

  /**
   * Create enhanced overlay with data-space coordinates
   */
  createOverlay(
    type: DataSpaceOverlay['type'],
    points: OverlayPoint[],
    options: OverlayCreationOptions = {}
  ): DataSpaceOverlay {
    // Use symbolKey from options or currentSymbolKey
    const symbolKey = options.symbolKey || this.currentSymbolKey
    
    if (!symbolKey) {
      console.warn('⚠️ Creating overlay without symbolKey - may not persist correctly')
    }
    
    const overlay: DataSpaceOverlay = {
      id: generatePointId(),
      symbolKey, // Include symbolKey for symbol-specific isolation
      type,
      points,
      style: options.style || this.getDefaultStyle(type),
      groupId: options.groupId,
      visible: options.visible !== false,
      lock: options.lock || false,
      createdAt: Date.now(),
      version: OVERLAY_CONSTANTS.CURRENT_VERSION
    }

    // Store in our data-space overlay storage
    this.overlayStorage.set(overlay.id, overlay)

    return overlay
  }

  /**
   * Convert legacy overlay to data-space overlay
   */
  convertLegacyOverlay(legacyOverlay: any, paneId: string = 'candle_pane'): DataSpaceOverlay | null {
    try {
      const dataSpacePoints: OverlayPoint[] = []
      
      if (legacyOverlay.points && Array.isArray(legacyOverlay.points)) {
        for (const point of legacyOverlay.points) {
          let dataPoint: OverlayPoint
          
          if (point.timestamp && point.value !== undefined) {
            // Already in data-space format
            dataPoint = {
              id: generatePointId(),
              t: point.timestamp,
              p: point.value
            }
          } else if (point.x !== undefined && point.y !== undefined) {
            // Convert from screen coordinates
            const screenPoint: ScreenPoint = { x: point.x, y: point.y }
            const context = { chart: this.chart, paneId }
            const convertedPoint = screenToData(screenPoint, context)
            
            if (!convertedPoint) {
              console.warn('Failed to convert legacy point:', point)
              continue
            }
            
            dataPoint = {
              id: generatePointId(),
              t: convertedPoint.t,
              p: convertedPoint.p
            }
          } else {
            console.warn('Invalid legacy point format:', point)
            continue
          }
          
          dataSpacePoints.push(dataPoint)
        }
      }

      if (dataSpacePoints.length === 0) {
        return null
      }

      // Try to extract symbolKey from legacy overlay or use current symbol
      const symbolKey = legacyOverlay.symbolKey || this.currentSymbolKey
      
      if (!symbolKey) {
        console.warn('⚠️ Converting legacy overlay without symbolKey:', legacyOverlay.id)
      }

      const overlay: DataSpaceOverlay = {
        id: legacyOverlay.id || generatePointId(),
        symbolKey, // Include symbolKey for symbol isolation
        type: legacyOverlay.name || legacyOverlay.type || 'line',
        points: dataSpacePoints,
        style: this.convertLegacyStyle(legacyOverlay.styles),
        groupId: legacyOverlay.groupId,
        visible: legacyOverlay.visible !== false,
        lock: legacyOverlay.lock || false,
        createdAt: Date.now(),
        version: OVERLAY_CONSTANTS.CURRENT_VERSION
      }

      this.overlayStorage.set(overlay.id, overlay)
      return overlay
    } catch (error) {
      console.error('Error converting legacy overlay:', error)
      return null
    }
  }

  /**
   * Update overlay points (for drag operations)
   */
  updateOverlayPoints(overlayId: string, newPoints: OverlayPoint[]): boolean {
    const overlay = this.overlayStorage.get(overlayId)
    if (!overlay) {
      return false
    }

    overlay.points = newPoints
    this.overlayStorage.set(overlayId, overlay)
    return true
  }

  /**
   * Get overlay by ID
   */
  getOverlay(overlayId: string): DataSpaceOverlay | undefined {
    return this.overlayStorage.get(overlayId)
  }

  /**
   * Get all overlays
   */
  getAllOverlays(): DataSpaceOverlay[] {
    return Array.from(this.overlayStorage.values())
  }

  /**
   * Remove overlay
   */
  removeOverlay(overlayId: string): boolean {
    return this.overlayStorage.delete(overlayId)
  }

  /**
   * Clear all overlays
   */
  clearAllOverlays(): void {
    this.overlayStorage.clear()
  }

  /**
   * Get default style for overlay type
   */
  private getDefaultStyle(type: DataSpaceOverlay['type']): OverlayStyle {
    const defaultStyles: Record<DataSpaceOverlay['type'], OverlayStyle> = {
      line: {
        line: {
          color: '#1890ff',
          size: 0.5,
          style: 'solid'
        },
        text: {
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 100, 255, 0.7)',
          borderColor: '#FFFFFF'
        }
      },
      ray: {
        line: {
          color: '#1890ff',
          size: 0.5,
          style: 'solid'
        },
        text: {
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 100, 255, 0.7)',
          borderColor: '#FFFFFF'
        }
      },
      hline: {
        line: {
          color: '#1890ff',
          size: 0.5,
          style: 'solid'
        },
        text: {
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 100, 255, 0.7)',
          borderColor: '#FFFFFF'
        }
      },
      vline: {
        line: {
          color: '#1890ff',
          size: 0.5,
          style: 'solid'
        },
        text: {
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 100, 255, 0.7)',
          borderColor: '#FFFFFF'
        }
      },
      trendline: {
        line: {
          color: '#1890ff',
          size: 0.5,
          style: 'solid'
        },
        text: {
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 100, 255, 0.7)',
          borderColor: '#FFFFFF'
        }
      },
      fib: {
        line: {
          color: '#1890ff',
          size: 0.5,
          style: 'solid'
        },
        text: {
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 100, 255, 0.7)',
          borderColor: '#FFFFFF'
        }
      },
      arrow: {
        line: {
          color: '#1890ff',
          size: 0.5,
          style: 'solid'
        },
        text: {
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 100, 255, 0.7)',
          borderColor: '#FFFFFF'
        }
      },
      circle: {
        line: {
          color: '#1890ff',
          size: 0.5,
          style: 'solid'
        },
        polygon: {
          color: '#1890ff20'
        },
        text: {
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 100, 255, 0.7)',
          borderColor: '#FFFFFF'
        }
      },
      rect: {
        line: {
          color: '#1890ff',
          size: 0.5,
          style: 'solid'
        },
        polygon: {
          color: '#1890ff20'
        },
        text: {
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 100, 255, 0.7)',
          borderColor: '#FFFFFF'
        }
      },
      triangle: {
        line: {
          color: '#1890ff',
          size: 0.5,
          style: 'solid'
        },
        polygon: {
          color: '#1890ff20'
        },
        text: {
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 100, 255, 0.7)',
          borderColor: '#FFFFFF'
        }
      },
      parallelogram: {
        line: {
          color: '#1890ff',
          size: 0.5,
          style: 'solid'
        },
        polygon: {
          color: '#1890ff20'
        },
        text: {
          color: '#FFFFFF',
          backgroundColor: 'rgba(0, 100, 255, 0.7)',
          borderColor: '#FFFFFF'
        }
      }
    }

    return defaultStyles[type] || defaultStyles.line
  }

  /**
   * Convert legacy styles to new format
   */
  private convertLegacyStyle(legacyStyles: any): OverlayStyle {
    if (!legacyStyles) {
      return this.getDefaultStyle('line')
    }

    const style: OverlayStyle = {}

    if (legacyStyles.line) {
      style.line = {
        color: legacyStyles.line.color || '#1890ff',
        size: legacyStyles.line.size || 1,
        style: legacyStyles.line.style === 'dashed' ? 'dashed' : 'solid',
        dashedValue: legacyStyles.line.dashedValue
      }
    }

    if (legacyStyles.text) {
      style.text = {
        color: legacyStyles.text.color || '#1890ff',
        backgroundColor: legacyStyles.text.backgroundColor,
        borderColor: legacyStyles.text.borderColor,
        fontSize: legacyStyles.text.fontSize
      }
    }

    if (legacyStyles.polygon) {
      style.polygon = {
        color: legacyStyles.polygon.color || '#1890ff',
        fillColor: legacyStyles.polygon.fillColor
      }
    }

    return style
  }

  /**
   * Create event handlers that work with data-space coordinates
   */
  createEventHandlers(options: OverlayCreationOptions) {
    return {
      onDrawEnd: (event: OverlayEvent<unknown>) => {
        // Convert the overlay to data-space format
        const dataSpaceOverlay = this.convertLegacyOverlay(event.overlay)
        if (dataSpaceOverlay && options.onDrawEnd) {
          options.onDrawEnd(dataSpaceOverlay)
        }
        return true
      },
      onPressedMoving: (event: OverlayEvent<unknown>) => {
        const dataSpaceOverlay = this.convertLegacyOverlay(event.overlay)
        if (dataSpaceOverlay && options.onPressedMoving) {
          options.onPressedMoving(dataSpaceOverlay)
        }
        return false
      },
      onPressedMoveEnd: (event: OverlayEvent<unknown>) => {
        const dataSpaceOverlay = this.convertLegacyOverlay(event.overlay)
        if (dataSpaceOverlay && options.onPressedMoveEnd) {
          options.onPressedMoveEnd(dataSpaceOverlay)
        }
        return true
      },
      onSelected: (event: OverlayEvent<unknown>) => {
        const dataSpaceOverlay = this.convertLegacyOverlay(event.overlay)
        if (dataSpaceOverlay && options.onSelected) {
          options.onSelected(dataSpaceOverlay)
        }
        return true
      },
      onDeselected: (event: OverlayEvent<unknown>) => {
        const dataSpaceOverlay = this.getOverlay(event.overlay.id)
        if (dataSpaceOverlay && options.onDeselected) {
          options.onDeselected(dataSpaceOverlay)
        }
        return true
      }
    }
  }
}

/**
 * Global overlay creation manager instance
 */
let globalOverlayCreationManager: OverlayCreationManager | null = null

/**
 * Initialize overlay creation manager
 */
export function initializeOverlayCreation(chart: Chart): OverlayCreationManager {
  globalOverlayCreationManager = new OverlayCreationManager(chart)
  return globalOverlayCreationManager
}

/**
 * Get global overlay creation manager
 */
export function getOverlayCreationManager(): OverlayCreationManager | null {
  return globalOverlayCreationManager
}