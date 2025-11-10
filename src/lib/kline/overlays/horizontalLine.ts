import type { OverlayTemplate, OverlayEvent, Coordinate } from 'klinecharts'

interface HorizontalLineData {
  showDot?: boolean
}

/**
 * Get horizontal straight line coordinates
 */
function getHorizontalStraightLine(coordinates: Coordinate[], bounding: any): { coordinates: Coordinate[] } {
  if (coordinates.length > 0) {
    const y = coordinates[0].y
    return {
      coordinates: [
        { x: 0, y },
        { x: bounding.width, y }
      ]
    }
  }
  return { coordinates: [] }
}

/**
 * Get horizontal ray line coordinates
 */
function getHorizontalRayLine(coordinates: Coordinate[], bounding: any): { coordinates: Coordinate[] } {
  if (coordinates.length > 1) {
    const y = coordinates[0].y
    const point1 = coordinates[0]
    const point2 = coordinates[1]
    
    if (point1.x > point2.x) {
      // Ray extends to the left
      return {
        coordinates: [
          { x: 0, y },
          point1
        ]
      }
    } else {
      // Ray extends to the right
      return {
        coordinates: [
          point1,
          { x: bounding.width, y }
        ]
      }
    }
  }
  return { coordinates: [] }
}

/**
 * Custom horizontal straight line overlay template
 * Always shows price in price panel (y-axis), shows dot only when actively selected
 */
const horizontalStraightLine: OverlayTemplate = {
  name: 'horizontalStraightLine',
  totalStep: 2,
  needDefaultPointFigure: false, // We'll draw our own points
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false, // We'll create custom y-axis figures
  
  createPointFigures: ({ coordinates, overlay, bounding }) => {
    if (coordinates.length < 1) return []
    
    console.log('horizontalStraightLine createPointFigures called', {
      overlayId: overlay.id,
      hasExtendData: !!overlay.extendData,
      extendData: overlay.extendData,
      selected: overlay.selected
    })
    
    // IMPORTANT: Always ensure extendData exists and has the correct shape
    // This is critical after refresh when overlays are restored from saved data
    if (!overlay.extendData || typeof overlay.extendData !== 'object') {
      overlay.extendData = { showDot: false }
    } else if (!('showDot' in overlay.extendData)) {
      // extendData exists but doesn't have showDot property
      (overlay.extendData as HorizontalLineData).showDot = false
    }
    const data = overlay.extendData as HorizontalLineData
    const figures: any[] = []
    
    // Get line coordinates
    const lineCoords = getHorizontalStraightLine(coordinates, bounding)
    
    if (lineCoords.coordinates.length > 0) {
      // Invisible hit area for easier interaction
      figures.push({
        type: 'line',
        attrs: lineCoords,
        styles: {
          color: 'transparent',
          size: 40, // Thick hit area
          style: 'solid'
        },
        ignoreEvent: false
      })
      
      // Visible line
      figures.push({
        type: 'line',
        attrs: lineCoords
      })
      
      // Show dot when selected - place it in the middle of the line for visibility
      if (data.showDot || overlay.selected) {
        // Calculate middle of the visible line for better visibility
        const middleX = bounding.width / 2
        const middleY = coordinates[0].y
        
        // Get the line color from overlay styles
        const lineColor = overlay.styles?.line?.color || overlay.styles?.color || '#1677FF'
        
        console.log('Drawing dot for horizontalStraightLine:', { 
          x: middleX, 
          y: middleY, 
          showDot: data.showDot, 
          selected: overlay.selected,
          color: lineColor
        })
        
        // Draw a prominent dot with the line color
        figures.push({
          type: 'circle',
          attrs: {
            x: middleX,
            y: middleY,
            r: 6
          },
          styles: {
            style: 'fill',
            color: lineColor
          }
        })
        
        // Add a border circle for better visibility
        figures.push({
          type: 'circle',
          attrs: {
            x: middleX,
            y: middleY,
            r: 7
          },
          styles: {
            style: 'stroke',
            color: '#ffffff',
            borderSize: 2
          }
        })
      }
    }
    
    return figures
  },
  
  createYAxisFigures: ({ overlay, coordinates, yAxis }) => {
    // Always show price on y-axis, regardless of selection state
    if (coordinates.length < 1 || !overlay.points || overlay.points.length < 1) return []
    
    const value = overlay.points[0]?.value
    if (value === undefined) return []
    
    // Format the value with appropriate precision
    const precision = yAxis?.getPrecision?.() ?? 2
    const formattedValue = value.toFixed(precision)
    
    // Get the line color from overlay styles
    const lineColor = overlay.styles?.line?.color || overlay.styles?.color || '#1677FF'
    
    return [
      {
        type: 'text',
        attrs: {
          x: 0,
          y: coordinates[0].y,
          text: formattedValue,
          baseline: 'middle'
        },
        styles: {
          backgroundColor: lineColor,
          color: '#FFFFFF'
        },
        ignoreEvent: true
      }
    ]
  },
  
  onClick: (event: OverlayEvent) => {
    console.log('🟢 horizontalStraightLine onClick called', {
      overlayId: event.overlay.id,
      overlayName: event.overlay.name,
      hasExtendData: !!event.overlay.extendData,
      extendData: event.overlay.extendData
    })
    
    // Ensure extendData exists and has correct structure
    if (!event.overlay.extendData || typeof event.overlay.extendData !== 'object') {
      event.overlay.extendData = { showDot: false }
    } else if (!('showDot' in event.overlay.extendData)) {
      (event.overlay.extendData as HorizontalLineData).showDot = false
    }
    const data = event.overlay.extendData as HorizontalLineData
    
    // Toggle dot on click
    data.showDot = !data.showDot
    console.log('✅ Toggled showDot to:', data.showDot, 'overlay:', event.overlay)
    
    // Force chart update
    if (event.chart) {
      console.log('Attempting to override overlay to force redraw...')
      event.chart.overrideOverlay({
        id: event.overlay.id,
        extendData: data
      })
    }
    
    return true
  },
  
  onSelected: (event: OverlayEvent) => {
    console.log('🟢 horizontalStraightLine onSelected called', {
      overlayId: event.overlay.id,
      overlayName: event.overlay.name,
      hasExtendData: !!event.overlay.extendData,
      extendData: event.overlay.extendData
    })
    
    // Ensure extendData exists and has correct structure
    if (!event.overlay.extendData || typeof event.overlay.extendData !== 'object') {
      event.overlay.extendData = { showDot: false }
    } else if (!('showDot' in event.overlay.extendData)) {
      (event.overlay.extendData as HorizontalLineData).showDot = false
    }
    const data = event.overlay.extendData as HorizontalLineData
    data.showDot = true
    console.log('✅ Set showDot to true:', data, 'overlay:', event.overlay)
    
    // Try to force chart update
    if (event.chart) {
      console.log('Attempting to override overlay to force redraw...')
      event.chart.overrideOverlay({
        id: event.overlay.id,
        extendData: data
      })
    }
    
    // Force update by returning true
    return true
  },
  
  onDeselected: (event: OverlayEvent) => {
    console.log('🔴 horizontalStraightLine onDeselected called')
    // Ensure extendData exists and has correct structure
    if (!event.overlay.extendData || typeof event.overlay.extendData !== 'object') {
      event.overlay.extendData = { showDot: false }
    } else if (!('showDot' in event.overlay.extendData)) {
      (event.overlay.extendData as HorizontalLineData).showDot = false
    }
    const data = event.overlay.extendData as HorizontalLineData
    data.showDot = false
    
    // Try to force chart update
    if (event.chart) {
      event.chart.overrideOverlay({
        id: event.overlay.id,
        extendData: data
      })
    }
    
    return true
  }
}

/**
 * Custom horizontal ray line overlay template
 * Always shows price in price panel (y-axis), shows dot only when actively selected
 */
const horizontalRayLine: OverlayTemplate = {
  name: 'horizontalRayLine',
  totalStep: 3,
  needDefaultPointFigure: false, // We'll draw our own points
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false, // We'll create custom y-axis figures
  
  createPointFigures: ({ coordinates, overlay, bounding }) => {
    if (coordinates.length < 2) return []
    
    console.log('horizontalRayLine createPointFigures called', {
      overlayId: overlay.id,
      hasExtendData: !!overlay.extendData,
      extendData: overlay.extendData,
      selected: overlay.selected
    })
    
    // IMPORTANT: Always ensure extendData exists and has the correct shape
    // This is critical after refresh when overlays are restored from saved data
    if (!overlay.extendData || typeof overlay.extendData !== 'object') {
      overlay.extendData = { showDot: false }
    } else if (!('showDot' in overlay.extendData)) {
      // extendData exists but doesn't have showDot property
      (overlay.extendData as HorizontalLineData).showDot = false
    }
    const data = overlay.extendData as HorizontalLineData
    const figures: any[] = []
    
    // Get line coordinates
    const lineCoords = getHorizontalRayLine(coordinates, bounding)
    
    if (lineCoords.coordinates.length > 0) {
      // Invisible hit area for easier interaction
      figures.push({
        type: 'line',
        attrs: lineCoords,
        styles: {
          color: 'transparent',
          size: 40, // Thick hit area
          style: 'solid'
        },
        ignoreEvent: false
      })
      
      // Visible line
      figures.push({
        type: 'line',
        attrs: lineCoords
      })
      
      // Show dot when selected - place it in the middle of the line for visibility
      if (data.showDot || overlay.selected) {
        // For ray line, show dot at the starting point
        const dotX = coordinates[0].x
        const dotY = coordinates[0].y
        
        // Get the line color from overlay styles
        const lineColor = overlay.styles?.line?.color || overlay.styles?.color || '#1677FF'
        
        console.log('Drawing dot for horizontalRayLine:', { 
          x: dotX, 
          y: dotY, 
          showDot: data.showDot, 
          selected: overlay.selected,
          color: lineColor
        })
        
        // Draw a prominent dot with the line color
        figures.push({
          type: 'circle',
          attrs: {
            x: dotX,
            y: dotY,
            r: 6
          },
          styles: {
            style: 'fill',
            color: lineColor
          }
        })
        
        // Add a border circle for better visibility
        figures.push({
          type: 'circle',
          attrs: {
            x: dotX,
            y: dotY,
            r: 7
          },
          styles: {
            style: 'stroke',
            color: '#ffffff',
            borderSize: 2
          }
        })
      }
    }
    
    return figures
  },
  
  createYAxisFigures: ({ overlay, coordinates, yAxis }) => {
    // Always show price on y-axis, regardless of selection state
    if (coordinates.length < 1 || !overlay.points || overlay.points.length < 1) return []
    
    const value = overlay.points[0]?.value
    if (value === undefined) return []
    
    // Format the value with appropriate precision
    const precision = yAxis?.getPrecision?.() ?? 2
    const formattedValue = value.toFixed(precision)
    
    // Get the line color from overlay styles
    const lineColor = overlay.styles?.line?.color || overlay.styles?.color || '#1677FF'
    
    return [
      {
        type: 'text',
        attrs: {
          x: 0,
          y: coordinates[0].y,
          text: formattedValue,
          baseline: 'middle'
        },
        styles: {
          backgroundColor: lineColor,
          color: '#FFFFFF'
        },
        ignoreEvent: true
      }
    ]
  },
  
  onClick: (event: OverlayEvent) => {
    console.log('🟢 horizontalRayLine onClick called', {
      overlayId: event.overlay.id,
      overlayName: event.overlay.name,
      hasExtendData: !!event.overlay.extendData,
      extendData: event.overlay.extendData
    })
    
    // Ensure extendData exists and has correct structure
    if (!event.overlay.extendData || typeof event.overlay.extendData !== 'object') {
      event.overlay.extendData = { showDot: false }
    } else if (!('showDot' in event.overlay.extendData)) {
      (event.overlay.extendData as HorizontalLineData).showDot = false
    }
    const data = event.overlay.extendData as HorizontalLineData
    
    // Toggle dot on click
    data.showDot = !data.showDot
    console.log('✅ Toggled showDot to:', data.showDot, 'overlay:', event.overlay)
    
    // Force chart update
    if (event.chart) {
      console.log('Attempting to override overlay to force redraw...')
      event.chart.overrideOverlay({
        id: event.overlay.id,
        extendData: data
      })
    }
    
    return true
  },
  
  onSelected: (event: OverlayEvent) => {
    console.log('🟢 horizontalRayLine onSelected called', {
      overlayId: event.overlay.id,
      overlayName: event.overlay.name,
      hasExtendData: !!event.overlay.extendData,
      extendData: event.overlay.extendData
    })
    
    // Ensure extendData exists and has correct structure
    if (!event.overlay.extendData || typeof event.overlay.extendData !== 'object') {
      event.overlay.extendData = { showDot: false }
    } else if (!('showDot' in event.overlay.extendData)) {
      (event.overlay.extendData as HorizontalLineData).showDot = false
    }
    const data = event.overlay.extendData as HorizontalLineData
    data.showDot = true
    console.log('✅ Set showDot to true:', data, 'overlay:', event.overlay)
    
    // Try to force chart update
    if (event.chart) {
      console.log('Attempting to override overlay to force redraw...')
      event.chart.overrideOverlay({
        id: event.overlay.id,
        extendData: data
      })
    }
    
    // Force update by returning true
    return true
  },
  
  onDeselected: (event: OverlayEvent) => {
    console.log('🔴 horizontalRayLine onDeselected called')
    // Ensure extendData exists and has correct structure
    if (!event.overlay.extendData || typeof event.overlay.extendData !== 'object') {
      event.overlay.extendData = { showDot: false }
    } else if (!('showDot' in event.overlay.extendData)) {
      (event.overlay.extendData as HorizontalLineData).showDot = false
    }
    const data = event.overlay.extendData as HorizontalLineData
    data.showDot = false
    
    // Try to force chart update
    if (event.chart) {
      event.chart.overrideOverlay({
        id: event.overlay.id,
        extendData: data
      })
    }
    
    return true
  }
}

export { horizontalStraightLine, horizontalRayLine }
export default [horizontalStraightLine, horizontalRayLine]

