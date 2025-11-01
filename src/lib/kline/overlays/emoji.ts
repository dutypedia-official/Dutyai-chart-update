import type { OverlayTemplate } from 'klinecharts'

export interface EmojiData {
  emoji: string
  size?: number
  rotation?: number
  selected?: boolean
  active?: boolean
}

export interface EmojiStyles {
  box: {
    enabled: boolean
    stroke: string
    width: number
    fill: string
  }
  handles: {
    size: number
    fill: string
    stroke: string
  }
}

const emoji: OverlayTemplate = {
  name: 'emoji',
  totalStep: 2, // Single click to place
  needDefaultPointFigure: false, // We don't want default point indicators
  needDefaultXAxisFigure: false,
  needDefaultYAxisFigure: false,
  styles: {
    // Default transparent styles - no background fills
    box: {
      enabled: false,
      stroke: '#3b82f6',
      width: 1,
      fill: 'transparent'
    },
    handles: {
      size: 6,
      fill: '#3b82f6',
      stroke: '#3b82f6'
    }
  },
  createPointFigures: ({ coordinates, overlay }) => {
    if (coordinates.length === 0) return []
    
    const data = overlay.extendData as EmojiData
    if (!data || !data.emoji) return []
    
    const point = coordinates[0]
    const size = data.size || 24
    const rotation = data.rotation || 0
    const isSelected = data.selected || false
    const isActive = data.active || false
    
    const figures = []
    
    // Get styles from overlay or use defaults
    const styles = (overlay.styles as unknown as EmojiStyles) || {
      box: { enabled: false, stroke: '#3b82f6', width: 1, fill: 'transparent' },
      handles: { size: 6, fill: '#3b82f6', stroke: '#3b82f6' }
    }
    
    // Create the emoji figure with transparent background
    const emojiFigure = {
      type: 'text',
      attrs: {
        x: point.x,
        y: point.y,
        text: data.emoji,
        align: 'center',
        baseline: 'middle'
      },
      styles: {
        size: size,
        family: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
        weight: 'normal',
        // Ensure transparent background
        backgroundColor: 'transparent'
      }
    }
    
    figures.push(emojiFigure)
    
    // Add selection state: stroke-only bounding box + corner handles (no fill)
    if (isSelected) {
      const halfSize = size / 2
      const padding = 4 // Small padding around emoji
      
      // Stroke-only bounding box (no fill)
      const boundingBox = {
        type: 'rect',
        attrs: {
          x: point.x - halfSize - padding,
          y: point.y - halfSize - padding,
          width: size + (padding * 2),
          height: size + (padding * 2)
        },
        styles: {
          stroke: styles.box.stroke,
          strokeWidth: styles.box.width,
          fill: 'transparent', // No fill - stroke only
          backgroundColor: 'transparent'
        }
      }
      figures.push(boundingBox)
      
      // Corner handles (4 small squares at corners)
      const handleSize = styles.handles.size
      const handleOffset = halfSize + padding
      
      const corners = [
        { x: point.x - handleOffset - handleSize/2, y: point.y - handleOffset - handleSize/2 }, // Top-left
        { x: point.x + handleOffset - handleSize/2, y: point.y - handleOffset - handleSize/2 }, // Top-right
        { x: point.x - handleOffset - handleSize/2, y: point.y + handleOffset - handleSize/2 }, // Bottom-left
        { x: point.x + handleOffset - handleSize/2, y: point.y + handleOffset - handleSize/2 }  // Bottom-right
      ]
      
      corners.forEach(corner => {
        const handle = {
          type: 'rect',
          attrs: {
            x: corner.x,
            y: corner.y,
            width: handleSize,
            height: handleSize
          },
          styles: {
            fill: styles.handles.fill,
            stroke: styles.handles.stroke,
            strokeWidth: 1,
            backgroundColor: 'transparent'
          }
        }
        figures.push(handle)
      })
    }
    
    return figures
  },
  
  // Handle mouse events for selection and interaction
  onDrawStart: (event) => {
    return true
  },
  
  onDrawing: (event) => {
    return true
  },
  
  onDrawEnd: (event) => {
    return true // Complete after placing the emoji
  },
  
  // Handle click events for selection
  onPressedMoveStart: (event) => {
    return true
  },
  
  onPressedMoving: (event) => {
    return true
  },
  
  onPressedMoveEnd: (event) => {
    return true
  },
  
  // Selection and interaction events
  onSelected: (event) => {
    const data = event.overlay.extendData as EmojiData
    if (data) {
      data.selected = true
    }
    return false
  },
  
  onDeselected: (event) => {
    const data = event.overlay.extendData as EmojiData
    if (data) {
      data.selected = false
    }
    return false
  },
  
  onMouseEnter: (event) => {
    const data = event.overlay.extendData as EmojiData
    if (data) {
      data.active = true
    }
    return false
  },
  
  onMouseLeave: (event) => {
    const data = event.overlay.extendData as EmojiData
    if (data) {
      data.active = false
    }
    return false
  }
}

export default emoji