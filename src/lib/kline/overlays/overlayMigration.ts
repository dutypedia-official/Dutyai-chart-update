import type { Chart } from 'klinecharts'
import type { OverlayPoint, DataSpaceOverlay } from './overlayTypes'
import { convertLegacyCoordinates, validateDataPoint, generatePointId } from './coordinateUtils'

/**
 * Legacy overlay format that might exist in storage
 */
export interface LegacyOverlay {
  id: string
  type: string
  points: Array<{
    dataIndex?: number
    value?: number
    timestamp?: number
    x?: number
    y?: number
  }>
  styles?: Record<string, unknown>
  visible?: boolean
  locked?: boolean
  zLevel?: number
  extendLeft?: boolean
  extendRight?: boolean
  [key: string]: any
}

/**
 * Migration result for tracking success/failure
 */
export interface MigrationResult {
  success: boolean
  migratedCount: number
  failedCount: number
  errors: string[]
  migratedOverlays: DataSpaceOverlay[]
}

/**
 * Migration configuration options
 */
export interface MigrationConfig {
  validatePoints?: boolean
  preserveStyles?: boolean
  preserveExtensions?: boolean
  skipInvalidOverlays?: boolean
  logErrors?: boolean
}

const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  validatePoints: true,
  preserveStyles: true,
  preserveExtensions: true,
  skipInvalidOverlays: true,
  logErrors: true
}

/**
 * Overlay Migration Manager
 * Handles conversion of legacy overlays to new data-space coordinate system
 */
export class OverlayMigrationManager {
  private chart: Chart
  private config: MigrationConfig

  constructor(chart: Chart, config: Partial<MigrationConfig> = {}) {
    this.chart = chart
    this.config = { ...DEFAULT_MIGRATION_CONFIG, ...config }
  }

  /**
   * Migrate a single legacy overlay to new format
   */
  migrateSingleOverlay(legacyOverlay: LegacyOverlay): DataSpaceOverlay | null {
    try {
      // Convert legacy points to data-space coordinates
      const dataPoints = convertLegacyCoordinates(legacyOverlay.points, this.chart)
      
      if (dataPoints.length === 0) {
        if (this.config.logErrors) {
          console.warn(`No valid points found for overlay ${legacyOverlay.id}`)
        }
        return null
      }

      // Validate points if required
      if (this.config.validatePoints) {
        const validPoints = dataPoints.filter(point => validateDataPoint(point))
        if (validPoints.length !== dataPoints.length) {
          if (this.config.logErrors) {
            console.warn(`Some points failed validation for overlay ${legacyOverlay.id}`)
          }
          if (this.config.skipInvalidOverlays && validPoints.length === 0) {
            return null
          }
        }
      }

      // Create new overlay data structure
      const migratedOverlay: DataSpaceOverlay = {
        id: legacyOverlay.id || generatePointId(),
        type: legacyOverlay.type as DataSpaceOverlay['type'],
        points: dataPoints,
        style: {},
        visible: legacyOverlay.visible ?? true,
        lock: legacyOverlay.locked ?? false,
        createdAt: Date.now(),
        version: 1
      }

      // Preserve styles if configured
      if (this.config.preserveStyles && legacyOverlay.styles) {
        migratedOverlay.style = { ...legacyOverlay.styles }
      }

      // Preserve extension settings and other properties as additional fields
      if (this.config.preserveExtensions) {
        if (legacyOverlay.extendLeft !== undefined) {
          (migratedOverlay as any).extendLeft = legacyOverlay.extendLeft
        }
        if (legacyOverlay.extendRight !== undefined) {
          (migratedOverlay as any).extendRight = legacyOverlay.extendRight
        }
      }

      // Preserve any additional properties
      Object.keys(legacyOverlay).forEach(key => {
        if (!['id', 'type', 'points', 'style', 'visible', 'lock', 'createdAt', 'version', 'extendLeft', 'extendRight'].includes(key)) {
          (migratedOverlay as any)[key] = legacyOverlay[key]
        }
      })

      return migratedOverlay
    } catch (error) {
      if (this.config.logErrors) {
        console.error(`Error migrating overlay ${legacyOverlay.id}:`, error)
      }
      return null
    }
  }

  /**
   * Migrate multiple legacy overlays
   */
  migrateOverlays(legacyOverlays: LegacyOverlay[]): MigrationResult {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      migratedOverlays: []
    }

    for (const legacyOverlay of legacyOverlays) {
      try {
        const migrated = this.migrateSingleOverlay(legacyOverlay)
        if (migrated) {
          result.migratedOverlays.push(migrated)
          result.migratedCount++
        } else {
          result.failedCount++
          result.errors.push(`Failed to migrate overlay ${legacyOverlay.id}`)
        }
      } catch (error) {
        result.failedCount++
        const errorMessage = `Error migrating overlay ${legacyOverlay.id}: ${error instanceof Error ? error.message : String(error)}`
        result.errors.push(errorMessage)
        if (this.config.logErrors) {
          console.error(errorMessage)
        }
      }
    }

    result.success = result.failedCount === 0
    return result
  }

  /**
   * Migrate overlays from localStorage or other storage
   */
  migrateFromStorage(storageKey: string = 'chart_overlays'): MigrationResult {
    try {
      const storedData = localStorage.getItem(storageKey)
      if (!storedData) {
        return {
          success: true,
          migratedCount: 0,
          failedCount: 0,
          errors: [],
          migratedOverlays: []
        }
      }

      const legacyOverlays: LegacyOverlay[] = JSON.parse(storedData)
      if (!Array.isArray(legacyOverlays)) {
        throw new Error('Invalid overlay data format in storage')
      }

      return this.migrateOverlays(legacyOverlays)
    } catch (error) {
      const errorMessage = `Error reading from storage: ${error instanceof Error ? error.message : String(error)}`
      if (this.config.logErrors) {
        console.error(errorMessage)
      }
      return {
        success: false,
        migratedCount: 0,
        failedCount: 0,
        errors: [errorMessage],
        migratedOverlays: []
      }
    }
  }

  /**
   * Save migrated overlays back to storage
   */
  saveMigratedOverlays(
    migratedOverlays: DataSpaceOverlay[], 
    storageKey: string = 'chart_overlays_migrated'
  ): boolean {
    try {
      localStorage.setItem(storageKey, JSON.stringify(migratedOverlays))
      return true
    } catch (error) {
      if (this.config.logErrors) {
        console.error('Error saving migrated overlays:', error)
      }
      return false
    }
  }

  /**
   * Perform complete migration from legacy storage to new format
   */
  performCompleteMigration(
    legacyStorageKey: string = 'chart_overlays',
    newStorageKey: string = 'chart_overlays_v2'
  ): MigrationResult {
    const migrationResult = this.migrateFromStorage(legacyStorageKey)
    
    if (migrationResult.success && migrationResult.migratedOverlays.length > 0) {
      const saved = this.saveMigratedOverlays(migrationResult.migratedOverlays, newStorageKey)
      if (!saved) {
        migrationResult.success = false
        migrationResult.errors.push('Failed to save migrated overlays to storage')
      }
    }

    return migrationResult
  }

  /**
   * Check if migration is needed
   */
  static isMigrationNeeded(
    legacyStorageKey: string = 'chart_overlays',
    newStorageKey: string = 'chart_overlays_v2'
  ): boolean {
    const hasLegacyData = localStorage.getItem(legacyStorageKey) !== null
    const hasNewData = localStorage.getItem(newStorageKey) !== null
    return hasLegacyData && !hasNewData
  }

  /**
   * Get migration statistics
   */
  static getMigrationStats(result: MigrationResult): string {
    const total = result.migratedCount + result.failedCount
    const successRate = total > 0 ? ((result.migratedCount / total) * 100).toFixed(1) : '0'
    
    return `Migration completed: ${result.migratedCount}/${total} overlays migrated successfully (${successRate}% success rate)`
  }
}

/**
 * Utility function to detect legacy overlay format
 */
export function isLegacyOverlay(param: unknown): overlay is LegacyOverlay {
  if (!overlay || typeof overlay !== 'object') return false
  
  // Check if it has the old format characteristics
  if (Array.isArray(overlay.points)) {
    return overlay.points.some(param => 
      point && typeof point === 'object' && (
        typeof point.x === 'number' || 
        typeof point.y === 'number' || 
        typeof point.dataIndex === 'number'
      )
    )
  }
  
  return false
}

/**
 * Utility function to detect new overlay format
 */
export function isNewFormatOverlay(param: unknown): overlay is DataSpaceOverlay {
  if (!overlay || typeof overlay !== 'object') return false
  
  // Check if it has the new format characteristics
  if (Array.isArray(overlay.points)) {
    return overlay.points.every(param => 
      point && typeof point === 'object' && 
      typeof point.t === 'number' && 
      typeof point.p === 'number' &&
      typeof point.id === 'string'
    )
  }
  
  return false
}