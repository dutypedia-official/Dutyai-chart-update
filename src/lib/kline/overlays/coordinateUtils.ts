/**
 * Coordinate conversion utilities for overlay system
 * Handles transformation between data-space (timestamp, price) and screen-space (x, y) coordinates
 */

import type { Chart, Coordinate } from 'klinecharts'
import type { 
  OverlayPoint, 
  ScreenPoint, 
  CoordinateContext, 
  ProjectionResult,
  FutureDomainConfig
} from './overlayTypes'
import { OVERLAY_CONSTANTS } from './overlayTypes'

/**
 * Default future domain configuration
 */
const DEFAULT_FUTURE_CONFIG: FutureDomainConfig = {
  minMarginMs: OVERLAY_CONSTANTS.MIN_FUTURE_MARGIN_MS,
  maxMarginMs: OVERLAY_CONSTANTS.MAX_FUTURE_MARGIN_MS,
  defaultMarginPercent: OVERLAY_CONSTANTS.DEFAULT_FUTURE_MARGIN_PERCENT
}

/**
 * Convert data-space point to screen-space coordinate
 */
export function dataToScreen(
  point: OverlayPoint, 
  context: CoordinateContext
): ScreenPoint | null {
  try {
    const { chart, paneId = 'candle_pane' } = context
    
    // Use KLineCharts convertToPixel API
    const dataPoint = {
      timestamp: point.t,
      value: point.p
    }
    
    const coordinate = chart.convertToPixel(dataPoint, { paneId })
    
    if (!coordinate || typeof coordinate !== 'object') {
      return null
    }
    
    // Handle both single coordinate and array return types
    const coord = Array.isArray(coordinate) ? coordinate[0] : coordinate
    
    if (!coord || typeof coord !== 'object') {
      return null
    }
    
    // Validate coordinates
    if (typeof coord.x !== 'number' || typeof coord.y !== 'number' || 
        !isFinite(coord.x) || !isFinite(coord.y)) {
      return null
    }
    
    return { x: coord.x, y: coord.y }
  } catch (error) {
    console.error('Error converting data-space to screen-space:', error)
    return null
  }
}

/**
 * Convert screen-space coordinate to data-space point
 */
export function screenToData(
  screenPoint: ScreenPoint, 
  context: CoordinateContext,
  pointId?: string
): OverlayPoint | null {
  try {
    const { chart, paneId = 'candle_pane' } = context
    
    // Use KLineCharts convertFromPixel API
    const result = chart.convertFromPixel([screenPoint], { paneId })
    
    if (!result || !Array.isArray(result) || result.length === 0 || !result[0]) {
      return null
    }
    
    const dataPoint = result[0]
    
    // Validate conversion results
    if (typeof dataPoint.timestamp !== 'number' || typeof dataPoint.value !== 'number' ||
        !isFinite(dataPoint.timestamp) || !isFinite(dataPoint.value)) {
      return null
    }
    
    return {
      id: pointId || generatePointId(),
      t: Math.round(dataPoint.timestamp), // Round to nearest millisecond
      p: dataPoint.value
    }
  } catch (error) {
    console.error('Error converting screen-space to data-space:', error)
    return null
  }
}

/**
 * Project multiple data-space points to screen-space coordinates
 */
export function projectPoints(
  points: OverlayPoint[], 
  context: CoordinateContext
): ProjectionResult {
  const screenPoints: ScreenPoint[] = []
  let isVisible = true
  let isValid = true
  
  for (const point of points) {
    const screenPoint = dataToScreen(point, context)
    
    if (!screenPoint) {
      isValid = false
      // Use fallback coordinates to maintain array length
      screenPoints.push({ x: 0, y: 0 })
      continue
    }
    
    screenPoints.push(screenPoint)
    
    // Check if point is within visible area (basic check)
    // More sophisticated visibility checks can be added here
    if (screenPoint.x < -100 || screenPoint.x > 10000 || 
        screenPoint.y < -100 || screenPoint.y > 10000) {
      isVisible = false
    }
  }
  
  return {
    screenPoints,
    isVisible,
    isValid
  }
}

/**
 * Ensure future domain is extended to accommodate points beyond last candle
 */
export function ensureFutureDomain(
  points: OverlayPoint[], 
  chart: Chart,
  config: Partial<FutureDomainConfig> = {}
): void {
  // Future domain extension disabled - chart will end at the last real candle
  // This prevents any future placeholder candles from being added
  return
}

/**
 * Find the closest data point timestamp using binary search
 */
export function findClosestTimestamp(
  targetTimestamp: number, 
  chart: Chart
): number | null {
  try {
    const dataList = chart.getDataList()
    if (!dataList || dataList.length === 0) {
      return null
    }
    
    // Binary search for closest timestamp
    let left = 0
    let right = dataList.length - 1
    let closest = dataList[0].timestamp
    let minDiff = Math.abs(targetTimestamp - closest)
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const midTimestamp = dataList[mid].timestamp
      const diff = Math.abs(targetTimestamp - midTimestamp)
      
      if (diff < minDiff) {
        minDiff = diff
        closest = midTimestamp
      }
      
      if (midTimestamp < targetTimestamp) {
        left = mid + 1
      } else if (midTimestamp > targetTimestamp) {
        right = mid - 1
      } else {
        return midTimestamp // Exact match
      }
    }
    
    return closest
  } catch (error) {
    console.error('Error finding closest timestamp:', error)
    return null
  }
}

/**
 * Validate that a data-space point is reasonable
 */
export function validateDataPoint(point: OverlayPoint): boolean {
  return (
    typeof point.t === 'number' && 
    typeof point.p === 'number' &&
    isFinite(point.t) && 
    isFinite(point.p) &&
    point.t > 0 && // Reasonable timestamp
    point.p > 0 && // Reasonable price (assuming no negative prices)
    typeof point.id === 'string' &&
    point.id.length > 0
  )
}

/**
 * Generate a unique point ID
 */
export function generatePointId(): string {
  return `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate the time range of visible data
 */
export function getVisibleTimeRange(chart: Chart): { from: number; to: number } | null {
  try {
    const visibleRange = chart.getVisibleRange()
    return visibleRange ? {
      from: visibleRange.from,
      to: visibleRange.to
    } : null
  } catch (error) {
    console.error('Error getting visible time range:', error)
    return null
  }
}

/**
 * Check if a timestamp is within the visible range
 */
export function isTimestampVisible(timestamp: number, chart: Chart): boolean {
  const range = getVisibleTimeRange(chart)
  if (!range) return false
  
  return timestamp >= range.from && timestamp <= range.to
}

/**
 * Convert legacy overlay coordinates to data-space points
 */
export function convertLegacyCoordinates(
  legacyPoints: Array<{ dataIndex?: number; value?: number; timestamp?: number; x?: number; y?: number }>,
  chart: Chart
): OverlayPoint[] {
  const dataPoints: OverlayPoint[] = []
  const dataList = chart.getDataList()
  
  for (const legacyPoint of legacyPoints) {
    let timestamp: number | undefined
    let price: number | undefined
    
    // Try to extract timestamp and price from legacy format
    if (typeof legacyPoint.timestamp === 'number') {
      timestamp = legacyPoint.timestamp
    } else if (typeof legacyPoint.dataIndex === 'number' && dataList && dataList[legacyPoint.dataIndex]) {
      timestamp = dataList[legacyPoint.dataIndex].timestamp
    } else if (typeof legacyPoint.x === 'number' && typeof legacyPoint.y === 'number') {
      // Convert pixel coordinates to data-space
      const screenPoint: ScreenPoint = { x: legacyPoint.x, y: legacyPoint.y }
      const context: CoordinateContext = { chart }
      const dataPoint = screenToData(screenPoint, context)
      if (dataPoint) {
        timestamp = dataPoint.t
        price = dataPoint.p
      }
    }
    
    // Extract price from legacy format
    if (typeof legacyPoint.value === 'number') {
      price = legacyPoint.value
    }
    
    // Create data-space point if we have both timestamp and price
    if (typeof timestamp === 'number' && typeof price === 'number') {
      dataPoints.push({
        id: generatePointId(),
        t: timestamp,
        p: price
      })
    } else {
      console.warn('Could not convert legacy point to data-space:', legacyPoint)
    }
  }
  
  return dataPoints
}
