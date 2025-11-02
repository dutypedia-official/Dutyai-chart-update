/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { OverlayTemplate, LineAttrs, TextAttrs } from 'klinecharts'
import { getPrecision } from './utils'

// Default Fibonacci levels with distinct colors
const DEFAULT_FIBONACCI_LEVELS = [
  { value: 0, color: '#FF6B6B', visible: true },        // Red
  { value: 0.236, color: '#4ECDC4', visible: true },    // Teal
  { value: 0.382, color: '#45B7D1', visible: true },    // Blue
  { value: 0.5, color: '#96CEB4', visible: true },      // Green
  { value: 0.618, color: '#FFEAA7', visible: true },    // Yellow
  { value: 1, color: '#98D8C8', visible: true },        // Mint
  { value: 1.618, color: '#85C1E9', visible: true }     // Light Blue
]

const fibonacciSegment: OverlayTemplate = {
  name: 'fibonacciSegment',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  styles: {
    line: {
      size: 1,
      color: '#1e88e5'
    },
    polygon: {
      color: 'rgba(30, 136, 229, 0.1)'
    }
  },
  createPointFigures: ({ chart, coordinates, overlay, yAxis }) => {
    const precision = getPrecision(chart, overlay, yAxis)
    const figures: any[] = []
    
    if (coordinates.length > 1) {
      const points = overlay.points
      const startValue = points[0]?.value
      const endValue = points[1]?.value
      
      if (startValue === undefined || endValue === undefined) {
        return figures
      }
      
      const valueDif = endValue - startValue
      
      const startY = coordinates[0].y
      const endY = coordinates[1].y
      const yDif = endY - startY
      
      // Get Fibonacci levels from overlay extendData or use defaults
      const fibonacciLevels = (overlay as any).extendData?.fibonacciLevels || (overlay as any).fibonacciLevels || DEFAULT_FIBONACCI_LEVELS
      const visibleLevels = fibonacciLevels.filter((level: any) => level.visible)
      
      // Create filled zones (polygons) between levels
      for (let i = 0; i < visibleLevels.length - 1; i++) {
        const currentLevel = visibleLevels[i]
        const nextLevel = visibleLevels[i + 1]
        
        // For Fibonacci retracement, levels are calculated from the end point back towards start
        // This ensures proper direction regardless of drawing direction
        const y1 = endY - (yDif * currentLevel.value)
        const y2 = endY - (yDif * nextLevel.value)
        
        figures.push({
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: coordinates[0].x, y: y1 },
              { x: coordinates[1].x, y: y1 },
              { x: coordinates[1].x, y: y2 },
              { x: coordinates[0].x, y: y2 }
            ]
          },
          styles: {
            style: 'fill',
            color: currentLevel.color + '40' // Add transparency
          }
        })
      }
      
      // Create level lines and text
      const levelLines: LineAttrs[] = []
      const levelTexts: TextAttrs[] = []
      
      visibleLevels.forEach((level: any) => {
        // Calculate Y position: retracement from end point back towards start
        const y = endY - (yDif * level.value)
        // Calculate price: retracement from end value back towards start
        const price = (endValue - (valueDif * level.value)).toFixed(precision)
        
        levelLines.push({
          coordinates: [
            { x: coordinates[0].x, y },
            { x: coordinates[1].x, y }
          ]
        })
        
        levelTexts.push({
          x: coordinates[1].x + 5,
          y,
          text: `${price} (${(level.value * 100).toFixed(1)}%)`,
          baseline: 'middle',
          align: 'left'
        })
      })
      
      // Add level lines
      figures.push({
        type: 'line',
        attrs: levelLines,
        styles: {
          size: overlay.styles?.line?.size || 1,
          color: overlay.styles?.line?.color || '#1e88e5'
        }
      })
      
      // Add level text
      figures.push({
        type: 'text',
        ignoreEvent: true,
        attrs: levelTexts,
        styles: {
          color: overlay.styles?.text?.color || '#666666',
          backgroundColor: 'transparent'
        }
      })
      
      // Add trend line
      figures.push({
        type: 'line',
        attrs: {
          coordinates: [coordinates[0], coordinates[1]]
        },
        styles: {
          style: 'dashed',
          size: overlay.styles?.line?.size || 1,
          color: overlay.styles?.line?.color || '#1e88e5'
        }
      })
    }
    
    return figures
  }
}

export default fibonacciSegment
