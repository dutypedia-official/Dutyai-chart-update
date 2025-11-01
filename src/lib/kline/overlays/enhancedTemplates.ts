/**
 * Enhanced overlay templates using data-space coordinate system
 * These templates work with timestamp/price coordinates instead of pixel coordinates
 */

import type { Chart } from 'klinecharts'
import type { 
  DataSpaceOverlay, 
  OverlayPoint, 
  ScreenPoint, 
  ProjectionResult 
} from './overlayTypes'
import { OverlayTemplateAdapter, type EnhancedOverlayTemplate } from './enhancedOverlayAdapter'

/**
 * Enhanced Rectangle overlay template with larger hit area
 */
export function createEnhancedRectTemplate(adapter: OverlayTemplateAdapter): EnhancedOverlayTemplate {
  return adapter.createDataSpaceTemplate('enhancedRect', {
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    
    createDataSpaceFigures: ({ overlay, projectionResult, screenCoordinates }) => {
      if (screenCoordinates.length < 2) return []
      
      const [start, end] = screenCoordinates
      const figures = []
      
      // Larger invisible hit area for easier touch/drag interaction
      const hitAreaPadding = 30 // 30px padding around the rectangle
      figures.push({
        type: 'rect',
        attrs: {
          x: Math.min(start.x, end.x) - hitAreaPadding,
          y: Math.min(start.y, end.y) - hitAreaPadding,
          width: Math.abs(end.x - start.x) + (hitAreaPadding * 2),
          height: Math.abs(end.y - start.y) + (hitAreaPadding * 2)
        },
        styles: {
          style: 'fill',
          color: 'transparent' // Invisible but clickable
        },
        ignoreEvent: false // Make sure this captures events
      })
      
      // Visible rectangle
      figures.push({
        type: 'rect',
        attrs: {
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y)
        },
        styles: {
          style: 'stroke',
          color: overlay.style?.line?.color || '#1677FF',
          borderSize: overlay.style?.line?.size || 1,
          borderStyle: overlay.style?.line?.style || 'solid'
        }
      })
      
      return figures
    },
    
    onDrawStart: () => true,
    onDrawing: () => true,
    onDrawEnd: () => true
  })
}

/**
 * Enhanced Circle overlay template with larger hit area
 */
export function createEnhancedCircleTemplate(adapter: OverlayTemplateAdapter): EnhancedOverlayTemplate {
  return adapter.createDataSpaceTemplate('enhancedCircle', {
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    
    createDataSpaceFigures: ({ overlay, projectionResult, screenCoordinates }) => {
      if (screenCoordinates.length < 2) return []
      
      const [center, edge] = screenCoordinates
      const radius = Math.sqrt(
        Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
      )
      const figures = []
      
      // Larger invisible hit area for easier touch/drag interaction
      const hitAreaPadding = 30 // 30px additional radius
      figures.push({
        type: 'circle',
        attrs: {
          x: center.x,
          y: center.y,
          r: radius + hitAreaPadding
        },
        styles: {
          style: 'fill',
          color: 'transparent' // Invisible but clickable
        },
        ignoreEvent: false // Make sure this captures events
      })
      
      // Visible circle
      figures.push({
        type: 'circle',
        attrs: {
          x: center.x,
          y: center.y,
          r: radius
        },
        styles: {
          style: 'stroke',
          color: overlay.style?.line?.color || '#1677FF',
          borderSize: overlay.style?.line?.size || 1,
          borderStyle: overlay.style?.line?.style || 'solid'
        }
      })
      
      return figures
    },
    
    onDrawStart: () => true,
    onDrawing: () => true,
    onDrawEnd: () => true
  })
}

/**
 * Enhanced Line overlay template with larger hit area
 */
export function createEnhancedLineTemplate(adapter: OverlayTemplateAdapter): EnhancedOverlayTemplate {
  return adapter.createDataSpaceTemplate('enhancedLine', {
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    
    createDataSpaceFigures: ({ overlay, projectionResult, screenCoordinates }) => {
      if (screenCoordinates.length < 2) return []
      
      const figures = []
      
      // Draw line segments between consecutive points
      for (let i = 0; i < screenCoordinates.length - 1; i++) {
        const start = screenCoordinates[i]
        const end = screenCoordinates[i + 1]
        
        // Larger invisible hit area for easier touch/drag interaction
        figures.push({
          type: 'line',
          attrs: {
            coordinates: [
              { x: start.x, y: start.y },
              { x: end.x, y: end.y }
            ]
          },
          styles: {
            color: 'transparent', // Invisible but clickable
            size: 40, // Much thicker hit area
            style: 'solid'
          },
          ignoreEvent: false // Make sure this captures events
        })
        
        // Visible line
        figures.push({
          type: 'line',
          attrs: {
            coordinates: [
              { x: start.x, y: start.y },
              { x: end.x, y: end.y }
            ]
          },
          styles: {
            color: overlay.style?.line?.color || '#1677FF',
            size: overlay.style?.line?.size || 0.5,
            style: overlay.style?.line?.style || 'solid'
          }
        })
      }
      
      return figures
    },
    
    onDrawStart: () => true,
    onDrawing: () => true,
    onDrawEnd: () => true
  })
}

/**
 * Enhanced Trend Line overlay template with larger hit area
 */
export function createEnhancedTrendLineTemplate(adapter: OverlayTemplateAdapter): EnhancedOverlayTemplate {
  return adapter.createDataSpaceTemplate('enhancedTrendLine', {
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    
    createDataSpaceFigures: ({ overlay, projectionResult, screenCoordinates, chart }) => {
      if (screenCoordinates.length < 2) return []
      
      const [start, end] = screenCoordinates
      const figures = []
      
      // Extend line to chart boundaries if extendLeft or extendRight is enabled
      let lineStart = start
      let lineEnd = end
      
      const extendLeft = (overlay as any).extendLeft
      const extendRight = (overlay as any).extendRight
      
      if (extendLeft || extendRight) {
        const chartBounding = chart.getSize()
        if (chartBounding) {
          const slope = (end.y - start.y) / (end.x - start.x)
          
          if (extendLeft) {
            const leftY = start.y + slope * (0 - start.x)
            lineStart = { x: 0, y: leftY }
          }
          
          if (extendRight) {
            const rightY = start.y + slope * (chartBounding.width - start.x)
            lineEnd = { x: chartBounding.width, y: rightY }
          }
        }
      }
      
      // Larger invisible hit area for easier touch/drag interaction
      figures.push({
        type: 'line',
        attrs: {
          coordinates: [
            { x: lineStart.x, y: lineStart.y },
            { x: lineEnd.x, y: lineEnd.y }
          ]
        },
        styles: {
          color: 'transparent', // Invisible but clickable
          size: 40, // Much thicker hit area
          style: 'solid'
        },
        ignoreEvent: false // Make sure this captures events
      })
      
      // Visible trend line
      figures.push({
        type: 'line',
        attrs: {
          coordinates: [
            { x: lineStart.x, y: lineStart.y },
            { x: lineEnd.x, y: lineEnd.y }
          ]
        },
        styles: {
          color: overlay.style?.line?.color || '#1677FF',
          size: overlay.style?.line?.size || 0.5,
          style: overlay.style?.line?.style || 'solid'
        }
      })
      
      return figures
    },
    
    onDrawStart: () => true,
    onDrawing: () => true,
    onDrawEnd: () => true
  })
}

/**
 * Enhanced Fibonacci Retracement overlay template with larger hit areas
 */
export function createEnhancedFibonacciTemplate(adapter: OverlayTemplateAdapter): EnhancedOverlayTemplate {
  return adapter.createDataSpaceTemplate('enhancedFibonacci', {
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    
    createDataSpaceFigures: ({ overlay, projectionResult, screenCoordinates }) => {
      if (screenCoordinates.length < 2) return []
      
      const [start, end] = screenCoordinates
      const figures: unknown[] = []
      
      // Fibonacci levels
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]
      const priceRange = end.y - start.y
      
      levels.forEach(level => {
        const y = start.y + (priceRange * level)
        
        // Larger invisible hit area for easier touch/drag interaction
        figures.push({
          type: 'line',
          attrs: {
            coordinates: [
              { x: Math.min(start.x, end.x), y },
              { x: Math.max(start.x, end.x), y }
            ]
          },
          styles: {
            color: 'transparent', // Invisible but clickable
            size: 30, // Thicker hit area
            style: 'solid'
          },
          ignoreEvent: false // Make sure this captures events
        })
        
        // Visible Fibonacci line
        figures.push({
          type: 'line',
          attrs: {
            coordinates: [
              { x: Math.min(start.x, end.x), y },
              { x: Math.max(start.x, end.x), y }
            ]
          },
          styles: {
            color: overlay.style?.line?.color || '#1677FF',
            style: 'dashed',
            size: overlay.style?.line?.size || 2
          }
        })
        
        // Add level text
        figures.push({
          type: 'text',
          attrs: {
            x: Math.max(start.x, end.x) + 5,
            y: y,
            text: `${(level * 100).toFixed(1)}%`
          },
          styles: {
            color: overlay.style?.text?.color || '#666666',
            size: overlay.style?.text?.fontSize || 12
          }
        })
      })
      
      return figures
    },
    
    onDrawStart: () => true,
    onDrawing: () => true,
    onDrawEnd: () => true
  })
}

/**
 * Registry of all enhanced overlay templates
 */
export function createEnhancedOverlayTemplates(adapter: OverlayTemplateAdapter): Record<string, EnhancedOverlayTemplate> {
  return {
    enhancedRect: createEnhancedRectTemplate(adapter),
    enhancedCircle: createEnhancedCircleTemplate(adapter),
    enhancedLine: createEnhancedLineTemplate(adapter),
    enhancedTrendLine: createEnhancedTrendLineTemplate(adapter),
    enhancedFibonacci: createEnhancedFibonacciTemplate(adapter)
  }
}

/**
 * Helper function to get all enhanced templates for manual registration
 * Note: KLineCharts doesn't have a registerOverlay method in the Chart API
 * Templates should be registered globally or used directly in overlay creation
 */
export function getEnhancedTemplatesForRegistration(adapter: OverlayTemplateAdapter): EnhancedOverlayTemplate[] {
  const templates = createEnhancedOverlayTemplates(adapter)
  return Object.values(templates)
}