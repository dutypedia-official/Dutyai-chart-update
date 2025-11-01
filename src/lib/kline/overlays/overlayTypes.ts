/**
 * Overlay coordinate system types and utilities
 * Implements data-space coordinate anchoring for stable overlay positioning
 */

import type { Chart, Coordinate } from 'klinecharts'

/**
 * Data-space point representation
 * All overlay control points are stored in this format
 */
export interface OverlayPoint {
  /** Unique identifier for the point */
  id: string
  /** Timestamp in milliseconds (UNIX epoch) */
  t: number
  /** Price value (using number for precision, can be upgraded to Decimal later) */
  p: number
}

/**
 * Enhanced overlay data structure with data-space coordinates
 */
export interface DataSpaceOverlay {
  id: string
  symbolKey?: string // Symbol key for symbol-specific isolation (e.g., "DSE:GP")
  type: 'line' | 'ray' | 'hline' | 'vline' | 'fib' | 'trendline' | 'arrow' | 'circle' | 'rect' | 'triangle' | 'parallelogram'
  /** Data-space control points */
  points: OverlayPoint[]
  style: OverlayStyle
  /** Metadata */
  groupId?: string
  visible?: boolean
  lock?: boolean
  /** Creation timestamp for migration purposes */
  createdAt: number
  /** Version for backward compatibility */
  version: number
}

/**
 * Overlay styling options
 */
export interface OverlayStyle {
  line?: {
    color: string
    size: number
    style: 'solid' | 'dashed' | 'dotted'
    dashedValue?: number[]
  }
  text?: {
    color: string
    backgroundColor?: string
    borderColor?: string
    fontSize?: number
  }
  polygon?: {
    color: string
    fillColor?: string
  }
}

/**
 * Screen-space coordinate (for rendering)
 */
export interface ScreenPoint {
  x: number
  y: number
}

/**
 * Coordinate conversion context
 */
export interface CoordinateContext {
  chart: Chart
  paneId?: string
}

/**
 * Future domain configuration
 */
export interface FutureDomainConfig {
  /** Minimum future margin in milliseconds */
  minMarginMs: number
  /** Maximum future margin in milliseconds */
  maxMarginMs: number
  /** Default future margin as percentage of visible range */
  defaultMarginPercent: number
}

/**
 * Overlay projection result
 */
export interface ProjectionResult {
  /** Screen coordinates for rendering */
  screenPoints: ScreenPoint[]
  /** Whether all points are within visible area */
  isVisible: boolean
  /** Whether projection was successful */
  isValid: boolean
}

/**
 * Migration data for legacy overlays
 */
export interface LegacyOverlayData {
  id: string
  points: Array<{
    dataIndex?: number
    value?: number
    timestamp?: number
    x?: number
    y?: number
  }>
  [key: string]: any
}

/**
 * Event types for overlay system
 */
export type OverlayEventType = 
  | 'timeframeChange'
  | 'zoom'
  | 'scroll'
  | 'resize'
  | 'dataAppend'
  | 'priceScaleChange'
  | 'timezoneChange'

/**
 * Overlay event data
 */
export interface OverlayEventData {
  type: OverlayEventType
  chart: Chart
  timestamp: number
}

/**
 * Constants for the overlay system
 */
export const OVERLAY_CONSTANTS = {
  /** Current overlay data version */
  CURRENT_VERSION: 1,
  /** Default future domain margin in milliseconds (30 minutes) */
  DEFAULT_FUTURE_MARGIN_MS: 30 * 60 * 1000,
  /** Maximum future domain margin (24 hours) */
  MAX_FUTURE_MARGIN_MS: 24 * 60 * 60 * 1000,
  /** Minimum future domain margin (5 minutes) */
  MIN_FUTURE_MARGIN_MS: 5 * 60 * 1000,
  /** Default future margin as percentage of visible range */
  DEFAULT_FUTURE_MARGIN_PERCENT: 0.2,
  /** Precision for timestamp comparisons (1ms) */
  TIMESTAMP_PRECISION: 1,
  /** Precision for price comparisons (6 decimal places) */
  PRICE_PRECISION: 1e-6
} as const