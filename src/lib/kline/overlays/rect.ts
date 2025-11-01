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

import type { OverlayTemplate } from 'klinecharts'

const rect: OverlayTemplate = {
  name: 'rect',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  styles: {
    polygon: {
      color: 'rgba(22, 119, 255, 0.15)'
    }
  },
  createPointFigures: ({ coordinates }) => {
    if (coordinates.length > 1) {
      const figures = []
      
      // Larger invisible hit area for easier touch/drag interaction
      const hitAreaPadding = 30 // 30px padding around the rectangle
      const expandedCoords = [
        { x: coordinates[0].x - hitAreaPadding, y: coordinates[0].y - hitAreaPadding },
        { x: coordinates[1].x + hitAreaPadding, y: coordinates[0].y - hitAreaPadding },
        { x: coordinates[1].x + hitAreaPadding, y: coordinates[1].y + hitAreaPadding },
        { x: coordinates[0].x - hitAreaPadding, y: coordinates[1].y + hitAreaPadding }
      ]
      
      figures.push({
        type: 'polygon',
        attrs: {
          coordinates: expandedCoords
        },
        styles: { 
          style: 'fill',
          color: 'transparent' // Invisible but clickable
        },
        ignoreEvent: false // Make sure this captures events
      })
      
      // Visible rectangle
      figures.push({
        type: 'polygon',
        attrs: {
          coordinates: [
            coordinates[0],
            { x: coordinates[1].x, y: coordinates[0].y },
            coordinates[1],
            { x: coordinates[0].x, y: coordinates[1].y }
          ]
        },
        styles: { style: 'stroke_fill' }
      })
      
      return figures
    }
    return []
  }
}

export default rect
