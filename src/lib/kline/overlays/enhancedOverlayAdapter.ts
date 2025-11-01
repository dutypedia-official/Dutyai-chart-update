/**
 * Enhanced overlay adapter for data-space coordinate system
 * Bridges existing overlay templates with new coordinate anchoring system
 */

import type { Chart, OverlayTemplate, OverlayEvent } from 'klinecharts'
import type { 
  DataSpaceOverlay, 
  OverlayPoint, 
  ScreenPoint, 
  CoordinateContext,
  ProjectionResult 
} from './overlayTypes'
import { dataToScreen, projectPoints } from './coordinateUtils'

/**
 * Enhanced overlay template that works with data-space coordinates
 */
export interface EnhancedOverlayTemplate extends OverlayTemplate {
  /** Original template for fallback */
  originalTemplate: OverlayTemplate
  /** Enhanced point figure creation using data-space coordinates */
  createDataSpaceFigures?: (params: {
    overlay: DataSpaceOverlay
    chart: Chart
    projectionResult: ProjectionResult
    screenCoordinates: ScreenPoint[]
  }) => any[]
}

/**
 * Adapter class to enhance existing overlay templates
 */
export class OverlayTemplateAdapter {
  private chart: Chart
  private context: CoordinateContext

  constructor(chart: Chart) {
    this.chart = chart
    this.context = { chart }
  }

  /**
   * Enhance an existing overlay template to work with data-space coordinates
   */
  enhanceTemplate(originalTemplate: OverlayTemplate): EnhancedOverlayTemplate {
    const enhanced: EnhancedOverlayTemplate = {
      ...originalTemplate,
      originalTemplate,
      
      // Override createPointFigures to use data-space coordinates
      createPointFigures: (params: any) => {
        const { overlay, coordinates } = params
        
        // If this is a data-space overlay, project to screen coordinates
        if (this.isDataSpaceOverlay(overlay)) {
          const dataOverlay = overlay as DataSpaceOverlay
          const projectionResult = projectPoints(dataOverlay.points, this.context)
          
          if (!projectionResult.isValid) {
            return []
          }
          
          // Use enhanced figure creation if available
          if (enhanced.createDataSpaceFigures) {
            return enhanced.createDataSpaceFigures({
              overlay: dataOverlay,
              chart: this.chart,
              projectionResult,
              screenCoordinates: projectionResult.screenPoints
            })
          }
          
          // Fallback to original template with projected coordinates
          return originalTemplate.createPointFigures?.({
            ...params,
            coordinates: projectionResult.screenPoints
          }) || []
        }
        
        // For legacy overlays, use original behavior
        return originalTemplate.createPointFigures?.(params) || []
      }
    }

    return enhanced
  }

  /**
   * Create a data-space aware overlay template from scratch
   */
  createDataSpaceTemplate(
    name: string,
    config: {
      totalStep: number
      createDataSpaceFigures: EnhancedOverlayTemplate['createDataSpaceFigures']
      styles?: any
      needDefaultPointFigure?: boolean
      needDefaultXAxisFigure?: boolean
      needDefaultYAxisFigure?: boolean
      onDrawStart?: (event: OverlayEvent<unknown>) => boolean
  onDrawing?: (event: OverlayEvent<unknown>) => boolean
  onDrawEnd?: (event: OverlayEvent<unknown>) => boolean
  onClick?: (event: OverlayEvent<unknown>) => boolean
  onDoubleClick?: (event: OverlayEvent<unknown>) => boolean
  onRightClick?: (event: OverlayEvent<unknown>) => boolean
  onPressedMoveStart?: (event: OverlayEvent<unknown>) => boolean
  onPressedMoving?: (event: OverlayEvent<unknown>) => boolean
  onPressedMoveEnd?: (event: OverlayEvent<unknown>) => boolean
  onMouseEnter?: (event: OverlayEvent<unknown>) => boolean
  onMouseLeave?: (event: OverlayEvent<unknown>) => boolean
  onSelected?: (event: OverlayEvent<unknown>) => boolean
  onDeselected?: (event: OverlayEvent<unknown>) => boolean
    }
  ): EnhancedOverlayTemplate {
    const baseTemplate: OverlayTemplate = {
      name,
      totalStep: config.totalStep,
      needDefaultPointFigure: config.needDefaultPointFigure ?? true,
      needDefaultXAxisFigure: config.needDefaultXAxisFigure ?? true,
      needDefaultYAxisFigure: config.needDefaultYAxisFigure ?? true,
      styles: config.styles,
      onDrawStart: config.onDrawStart,
      onDrawing: config.onDrawing,
      onDrawEnd: config.onDrawEnd,
      onClick: config.onClick,
      onDoubleClick: config.onDoubleClick,
      onRightClick: config.onRightClick,
      onPressedMoveStart: config.onPressedMoveStart,
      onPressedMoving: config.onPressedMoving,
      onPressedMoveEnd: config.onPressedMoveEnd,
      onMouseEnter: config.onMouseEnter,
      onMouseLeave: config.onMouseLeave,
      onSelected: config.onSelected,
      onDeselected: config.onDeselected
    }

    return this.enhanceTemplate({
      ...baseTemplate,
      createDataSpaceFigures: config.createDataSpaceFigures
    } as any)
  }

  /**
   * Check if an overlay uses data-space coordinates
   */
  private isDataSpaceOverlay(overlay: unknown): overlay is DataSpaceOverlay {
    return overlay && 
           typeof overlay === 'object' && 
           'points' in overlay &&
           Array.isArray((overlay as any).points) &&
           (overlay as any).points.length > 0 &&
           (overlay as any).points.every((point: unknown) => 
             point && 
             typeof point === 'object' &&
             't' in point &&
             'p' in point &&
             'id' in point &&
             typeof (point as any).t === 'number' && 
             typeof (point as any).p === 'number' &&
             typeof (point as any).id === 'string'
           )
  }

  /**
   * Convert screen coordinates back to data-space for editing
   */
  screenToDataSpace(screenPoints: ScreenPoint[]): OverlayPoint[] {
    // This would be implemented using screenToData utility
    // For now, return empty array as placeholder
    return []
  }

  /**
   * Update chart context when chart changes
   */
  updateChart(chart: Chart): void {
    this.chart = chart
    this.context = { chart }
  }
}

/**
 * Global adapter instance
 */
let globalAdapter: OverlayTemplateAdapter | null = null

/**
 * Initialize the overlay template adapter
 */
export function initializeOverlayAdapter(chart: Chart): OverlayTemplateAdapter {
  globalAdapter = new OverlayTemplateAdapter(chart)
  return globalAdapter
}

/**
 * Get the global overlay template adapter
 */
export function getOverlayAdapter(): OverlayTemplateAdapter | null {
  return globalAdapter
}

/**
 * Utility function to enhance multiple templates at once
 */
export function enhanceOverlayTemplates(
  templates: Record<string, OverlayTemplate>,
  chart: Chart
): Record<string, EnhancedOverlayTemplate> {
  const adapter = new OverlayTemplateAdapter(chart)
  const enhanced: Record<string, EnhancedOverlayTemplate> = {}
  
  Object.entries(templates).forEach(([name, template]) => {
    enhanced[name] = adapter.enhanceTemplate(template)
  })
  
  return enhanced
}