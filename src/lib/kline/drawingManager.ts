/**
 * Drawing Manager
 * 
 * Manages symbol-specific drawings with strict isolation:
 * - Drawings are stored per symbol using symbolKey
 * - Only drawings matching current symbol are rendered
 * - Automatic cleanup and swap on symbol changes
 * - Migration support for legacy drawings without symbolKey
 */

import type { Chart } from 'klinecharts';
import type { Writable } from 'svelte/store';
import { get } from 'svelte/store';
import type { Drawing, SymbolKey } from './saveSystem/types';
import type { SymbolInfo } from './types';
import { normalizeSymbolKey } from './saveSystem/chartStateCollector';

/**
 * Drawing storage structure: symbol-keyed buckets
 */
export interface DrawingStore {
  drawingsBySymbol: Record<SymbolKey, Drawing[]>;
  version: number; // For future migration
}

/**
 * Drawing Manager Options
 */
export interface DrawingManagerOptions {
  chart: Chart;
  persistenceKey: string;
  onDrawingCreated?: (drawing: Drawing) => void;
  onDrawingRemoved?: (drawingId: string, symbolKey: SymbolKey) => void;
  onSymbolChanged?: (oldSymbol: SymbolKey, newSymbol: SymbolKey) => void;
}

/**
 * Drawing Manager Class
 * Central coordinator for symbol-aware drawing operations
 */
export class DrawingManager {
  private chart: Chart;
  private persistenceKey: string;
  private currentSymbol: SymbolKey | null = null;
  // Ephemeral mode: do not persist drawings unless saved via SaveManager
  private readonly ephemeralMode: boolean = true;
  
  // In-memory index: drawings by symbol
  private drawingsBySymbol: Map<SymbolKey, Drawing[]> = new Map();
  
  // Track rendered drawings on chart
  private renderedDrawingIds: Set<string> = new Set();
  
  // Event callbacks
  private onDrawingCreated?: (drawing: Drawing) => void;
  private onDrawingRemoved?: (drawingId: string, symbolKey: SymbolKey) => void;
  private onSymbolChanged?: (oldSymbol: SymbolKey, newSymbol: SymbolKey) => void;
  
  // Symbol change callbacks
  private symbolChangeCallbacks = new Set<(newSymbol: SymbolKey) => void>();

  constructor(options: DrawingManagerOptions) {
    this.chart = options.chart;
    this.persistenceKey = options.persistenceKey;
    this.onDrawingCreated = options.onDrawingCreated;
    this.onDrawingRemoved = options.onDrawingRemoved;
    this.onSymbolChanged = options.onSymbolChanged;
    
    // Ephemeral: skip loading from storage
    if (!this.ephemeralMode) {
      this.loadFromStorage();
    }
    
    console.log('✅ DrawingManager initialized with key:', this.persistenceKey);
  }

  /**
   * Set current symbol and trigger rendering
   */
  setCurrentSymbol(symbol: SymbolInfo | SymbolKey): void {
    const symbolKey = typeof symbol === 'string' 
      ? symbol 
      : normalizeSymbolKey(symbol);
    
    if (this.currentSymbol === symbolKey) {
      console.log('🔄 Symbol unchanged, skipping reload:', symbolKey);
      return;
    }
    
    const oldSymbol = this.currentSymbol;
    this.currentSymbol = symbolKey;
    
    console.log(`🔄 Symbol changed: ${oldSymbol} → ${symbolKey}`);
    
    // Clear current overlay/annotation layer
    this.clearRenderedDrawings();
    
    // Render drawings for new symbol
    this.renderDrawingsForCurrentSymbol();
    
    // Notify callbacks
    if (oldSymbol) {
      this.onSymbolChanged?.(oldSymbol, symbolKey);
      this.symbolChangeCallbacks.forEach(cb => cb(symbolKey));
    }
  }

  /**
   * Get current symbol key
   */
  getCurrentSymbol(): SymbolKey | null {
    return this.currentSymbol;
  }

  /**
   * Add a drawing for a specific symbol
   */
  addDrawing(drawing: Drawing): void {
    // Validate symbolKey
    if (!drawing.symbolKey) {
      console.error('❌ Cannot add drawing without symbolKey:', drawing);
      throw new Error('Drawing must have a symbolKey');
    }
    
    // Get or create symbol bucket
    let symbolDrawings = this.drawingsBySymbol.get(drawing.symbolKey);
    if (!symbolDrawings) {
      symbolDrawings = [];
      this.drawingsBySymbol.set(drawing.symbolKey, symbolDrawings);
    }
    
    // Check for duplicate
    const existingIndex = symbolDrawings.findIndex(d => d.id === drawing.id);
    if (existingIndex >= 0) {
      // Update existing
      symbolDrawings[existingIndex] = drawing;
      console.log('🔄 Updated drawing:', drawing.id, 'for symbol:', drawing.symbolKey);
    } else {
      // Add new
      symbolDrawings.push(drawing);
      console.log('➕ Added drawing:', drawing.id, 'for symbol:', drawing.symbolKey);
    }
    
    // Persist to storage
    this.saveToStorage();
    
    // If this drawing is for current symbol, render it
    if (drawing.symbolKey === this.currentSymbol && drawing.visible !== false) {
      this.renderDrawing(drawing);
    }
    
    // Notify callback
    this.onDrawingCreated?.(drawing);
  }

  /**
   * Remove a drawing by ID (searches across all symbols)
   */
  removeDrawing(drawingId: string): boolean {
    let removed = false;
    let removedSymbol: SymbolKey | null = null;
    
    // Search across all symbols
    for (const [symbolKey, drawings] of this.drawingsBySymbol.entries()) {
      const index = drawings.findIndex(d => d.id === drawingId);
      if (index >= 0) {
        drawings.splice(index, 1);
        removed = true;
        removedSymbol = symbolKey;
        console.log('🗑️ Removed drawing:', drawingId, 'from symbol:', symbolKey);
        break;
      }
    }
    
    if (removed) {
      // Clean up empty symbol buckets
      if (removedSymbol && this.drawingsBySymbol.get(removedSymbol)?.length === 0) {
        this.drawingsBySymbol.delete(removedSymbol);
      }
      
      // Persist changes
      this.saveToStorage();
      
      // Remove from chart if rendered
      if (this.renderedDrawingIds.has(drawingId)) {
        this.chart.removeOverlay({ id: drawingId });
        this.renderedDrawingIds.delete(drawingId);
      }
      
      // Notify callback
      if (removedSymbol) {
        this.onDrawingRemoved?.(drawingId, removedSymbol);
      }
    }
    
    return removed;
  }

  /**
   * Remove drawing for specific symbol
   */
  removeDrawingForSymbol(drawingId: string, symbolKey: SymbolKey): boolean {
    const drawings = this.drawingsBySymbol.get(symbolKey);
    if (!drawings) return false;
    
    const index = drawings.findIndex(d => d.id === drawingId);
    if (index < 0) return false;
    
    drawings.splice(index, 1);
    
    // Clean up empty bucket
    if (drawings.length === 0) {
      this.drawingsBySymbol.delete(symbolKey);
    }
    
    this.saveToStorage();
    
    // Remove from chart if rendered
    if (this.renderedDrawingIds.has(drawingId)) {
      this.chart.removeOverlay({ id: drawingId });
      this.renderedDrawingIds.delete(drawingId);
    }
    
    this.onDrawingRemoved?.(drawingId, symbolKey);
    return true;
  }

  /**
   * Get drawings for a specific symbol
   */
  getDrawingsForSymbol(symbolKey: SymbolKey): Drawing[] {
    return this.drawingsBySymbol.get(symbolKey) || [];
  }

  /**
   * Get all drawings for current symbol
   */
  getCurrentSymbolDrawings(): Drawing[] {
    if (!this.currentSymbol) return [];
    return this.getDrawingsForSymbol(this.currentSymbol);
  }

  /**
   * Get all drawings across all symbols
   */
  getAllDrawings(): Map<SymbolKey, Drawing[]> {
    return new Map(this.drawingsBySymbol);
  }

  /**
   * Clear all drawings for a specific symbol
   */
  clearDrawingsForSymbol(symbolKey: SymbolKey): void {
    const drawings = this.drawingsBySymbol.get(symbolKey);
    if (!drawings) return;
    
    // Remove from chart if they're currently rendered
    if (symbolKey === this.currentSymbol) {
      drawings.forEach(drawing => {
        if (this.renderedDrawingIds.has(drawing.id)) {
          this.chart.removeOverlay({ id: drawing.id });
          this.renderedDrawingIds.delete(drawing.id);
        }
      });
    }
    
    this.drawingsBySymbol.delete(symbolKey);
    this.saveToStorage();
    
    console.log('🗑️ Cleared all drawings for symbol:', symbolKey);
  }

  /**
   * Clear all drawings for current symbol
   */
  clearCurrentSymbolDrawings(): void {
    if (!this.currentSymbol) return;
    this.clearDrawingsForSymbol(this.currentSymbol);
  }

  /**
   * Clear rendered drawings from chart (without deleting data)
   */
  private clearRenderedDrawings(): void {
    // Remove all currently rendered overlays
    this.renderedDrawingIds.forEach(id => {
      try {
        this.chart.removeOverlay({ id });
      } catch (error) {
        console.warn('Failed to remove overlay:', id, error);
      }
    });
    
    this.renderedDrawingIds.clear();
    console.log('🧹 Cleared rendered drawings from chart');
  }

  /**
   * Public: hide all rendered drawings from chart without altering stored data
   */
  public hideRenderedDrawings(): void {
    this.clearRenderedDrawings();
  }

  /**
   * Render drawings for current symbol
   */
  private renderDrawingsForCurrentSymbol(): void {
    if (!this.currentSymbol) {
      console.log('⚠️ No current symbol, skipping render');
      return;
    }
    
    const drawings = this.getDrawingsForSymbol(this.currentSymbol);
    console.log(`🎨 Rendering ${drawings.length} drawings for symbol:`, this.currentSymbol);
    
    drawings.forEach(drawing => {
      if (drawing.visible !== false) {
        this.renderDrawing(drawing);
      }
    });
  }

  /**
   * Public: force re-render of current symbol drawings
   */
  public renderCurrentSymbolDrawings(): void {
    this.clearRenderedDrawings();
    this.renderDrawingsForCurrentSymbol();
  }

  /**
   * Render a single drawing on the chart
   */
  private renderDrawing(drawing: Drawing): void {
    // HARD GUARD: Verify symbolKey matches current symbol
    if (drawing.symbolKey !== this.currentSymbol) {
      console.warn('⛔ Drawing symbolKey mismatch, skipping render:', {
        drawingSymbol: drawing.symbolKey,
        currentSymbol: this.currentSymbol
      });
      return;
    }
    
    try {
      // Convert Drawing to KLineChart overlay format
      const overlayData = {
        id: drawing.id,
        name: drawing.type,
        points: drawing.points.map(point => ({
          timestamp: point.time,
          value: point.price,
          t: point.time,
          p: point.price
        })),
        styles: drawing.styles,
        lock: drawing.locked,
        visible: drawing.visible,
        // Include any additional properties
        ...Object.fromEntries(
          Object.entries(drawing).filter(([k]) => 
            !['id', 'symbolKey', 'type', 'points', 'styles', 'locked', 'visible', 'seriesId'].includes(k)
          )
        )
      };
      
      // Create overlay on chart
      const overlayId = this.chart.createOverlay(overlayData);
      
      if (overlayId) {
        this.renderedDrawingIds.add(drawing.id);
        console.log('✅ Rendered drawing:', drawing.id, 'for symbol:', drawing.symbolKey);
      }
    } catch (error) {
      console.error('❌ Failed to render drawing:', drawing.id, error);
    }
  }

  /**
   * Update drawing data (e.g., after drag)
   */
  updateDrawing(drawingId: string, updates: Partial<Drawing>): boolean {
    // Find the drawing across all symbols
    for (const [symbolKey, drawings] of this.drawingsBySymbol.entries()) {
      const index = drawings.findIndex(d => d.id === drawingId);
      if (index >= 0) {
        // Merge updates (but prevent symbolKey change)
        const existingDrawing = drawings[index];
        drawings[index] = {
          ...existingDrawing,
          ...updates,
          symbolKey: existingDrawing.symbolKey // Preserve original symbolKey
        };
        
        this.saveToStorage();
        console.log('🔄 Updated drawing:', drawingId);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Bulk load drawings (used during layout restore)
   */
  loadDrawingsForSymbol(symbolKey: SymbolKey, drawings: Drawing[]): void {
    // Validate all drawings have correct symbolKey
    const validDrawings = drawings.filter(d => {
      if (d.symbolKey !== symbolKey) {
        console.warn('⚠️ Drawing symbolKey mismatch during bulk load:', {
          expected: symbolKey,
          actual: d.symbolKey,
          drawingId: d.id
        });
        return false;
      }
      return true;
    });
    
    // Store drawings
    this.drawingsBySymbol.set(symbolKey, validDrawings);
    this.saveToStorage();
    
    // If this is the current symbol, render
    if (symbolKey === this.currentSymbol) {
      this.clearRenderedDrawings();
      this.renderDrawingsForCurrentSymbol();
    }
    
    console.log(`📥 Loaded ${validDrawings.length} drawings for symbol:`, symbolKey);
  }

  /**
   * Bulk load all drawings (used during app initialization)
   */
  loadAllDrawings(drawingsBySymbol: Record<SymbolKey, Drawing[]>): void {
    this.drawingsBySymbol.clear();
    
    Object.entries(drawingsBySymbol).forEach(([symbolKey, drawings]) => {
      // Validate and filter
      const validDrawings = drawings.filter(d => {
        if (!d.symbolKey) {
          console.warn('⚠️ Drawing missing symbolKey, assigning:', symbolKey);
          d.symbolKey = symbolKey; // Migration: assign symbolKey
        }
        return true;
      });
      
      this.drawingsBySymbol.set(symbolKey, validDrawings);
    });
    
    this.saveToStorage();
    
    // Re-render current symbol
    if (this.currentSymbol) {
      this.clearRenderedDrawings();
      this.renderDrawingsForCurrentSymbol();
    }
    
    console.log('📥 Loaded drawings for', this.drawingsBySymbol.size, 'symbols');
  }

  /**
   * Save drawings to localStorage
   */
  private saveToStorage(): void {
    if (this.ephemeralMode) return;
    try {
      const store: DrawingStore = {
        drawingsBySymbol: Object.fromEntries(this.drawingsBySymbol),
        version: 1
      };
      
      localStorage.setItem(this.persistenceKey, JSON.stringify(store));
    } catch (error) {
      console.error('❌ Failed to save drawings to storage:', error);
    }
  }

  /**
   * Clear persisted storage so unsaved drawings do not survive reload
   */
  public clearPersistedStorage(): void {
    try {
      localStorage.removeItem(this.persistenceKey);
      console.log('🧹 Cleared persisted drawing storage for key:', this.persistenceKey);
    } catch (error) {
      console.warn('Failed to clear persisted drawing storage:', error);
    }
  }

  /**
   * Load drawings from localStorage
   */
  private loadFromStorage(): void {
    if (this.ephemeralMode) return;
    try {
      const stored = localStorage.getItem(this.persistenceKey);
      if (!stored) {
        console.log('📭 No stored drawings found');
        return;
      }
      
      const store: DrawingStore = JSON.parse(stored);
      
      // Migrate old format if needed
      if (!store.version) {
        console.log('🔄 Migrating legacy drawing storage...');
        this.migrateLegacyStorage(store);
        return;
      }
      
      // Load drawings
      Object.entries(store.drawingsBySymbol || {}).forEach(([symbolKey, drawings]) => {
        // Ensure all drawings have symbolKey
        const validDrawings = drawings.map(d => {
          if (!d.symbolKey) {
            d.symbolKey = symbolKey;
          }
          return d;
        });
        
        this.drawingsBySymbol.set(symbolKey, validDrawings);
      });
      
      console.log('📂 Loaded drawings from storage:', this.drawingsBySymbol.size, 'symbols');
    } catch (error) {
      console.error('❌ Failed to load drawings from storage:', error);
      // Graceful fallback - continue with empty state
      this.drawingsBySymbol.clear();
    }
  }

  /**
   * Migrate legacy overlay storage to new format
   */
  private migrateLegacyStorage(legacyStore: any): void {
    console.log('🔄 Starting migration of legacy overlay format...');
    
    // Legacy format: Record<string, Record<string, unknown>>
    // Keys like: "GP_4h_overlayId"
    if (typeof legacyStore === 'object' && !legacyStore.drawingsBySymbol) {
      const drawingsBySymbol: Record<SymbolKey, Drawing[]> = {};
      
      Object.entries(legacyStore).forEach(([key, overlayData]: [string, any]) => {
        try {
          // Parse legacy key: symbolName_timeframe_overlayId
          const parts = key.split('_');
          if (parts.length < 3) {
            console.warn('⚠️ Invalid legacy key format:', key);
            return;
          }
          
          const overlayId = parts[parts.length - 1];
          const timeframe = parts[parts.length - 2];
          const symbolName = parts.slice(0, -2).join('_');
          
          // Convert to SymbolKey format (best effort)
          // This may not include exchange prefix, but it's better than nothing
          const symbolKey = symbolName.toUpperCase();
          
          // Convert overlay to Drawing format
          const drawing = this.convertLegacyOverlayToDrawing(overlayId, overlayData, symbolKey);
          
          if (drawing) {
            if (!drawingsBySymbol[symbolKey]) {
              drawingsBySymbol[symbolKey] = [];
            }
            drawingsBySymbol[symbolKey].push(drawing);
          }
        } catch (error) {
          console.warn('⚠️ Failed to migrate legacy overlay:', key, error);
        }
      });
      
      // Load migrated data
      Object.entries(drawingsBySymbol).forEach(([symbolKey, drawings]) => {
        this.drawingsBySymbol.set(symbolKey, drawings);
      });
      
      // Save in new format
      this.saveToStorage();
      
      console.log('✅ Migration complete:', this.drawingsBySymbol.size, 'symbols migrated');
    }
  }

  /**
   * Convert legacy overlay to Drawing format
   */
  private convertLegacyOverlayToDrawing(
    overlayId: string,
    overlayData: Record<string, unknown>,
    symbolKey: SymbolKey
  ): Drawing | null {
    try {
      // Extract points in data coordinates
      const points: Array<{ time: number; price: number }> = [];
      
      if (overlayData.points && Array.isArray(overlayData.points)) {
        overlayData.points.forEach((point: any) => {
          if (point && typeof point === 'object') {
            // Handle different point formats
            if (point.timestamp && point.value !== undefined) {
              points.push({ time: point.timestamp, price: point.value });
            } else if (point.time && point.price !== undefined) {
              points.push({ time: point.time, price: point.price });
            } else if (point.t && point.p !== undefined) {
              points.push({ time: point.t, price: point.p });
            }
          }
        });
      }
      
      // Only include drawings with valid data coordinates
      if (points.length === 0) {
        console.warn('Legacy overlay has no valid data coordinates:', overlayId);
        return null;
      }
      
      return {
        id: overlayId,
        symbolKey, // CRITICAL: Assign symbolKey during migration
        type: (overlayData.name as string) || 'unknown',
        points,
        styles: (overlayData.styles as Record<string, any>) || {},
        locked: Boolean(overlayData.lock),
        visible: overlayData.visible !== false,
        // Include any additional properties
        ...Object.fromEntries(
          Object.entries(overlayData).filter(([k]) => 
            !['name', 'points', 'styles', 'lock', 'visible'].includes(k)
          )
        )
      };
    } catch (error) {
      console.warn('Error converting legacy overlay to drawing:', overlayId, error);
      return null;
    }
  }

  /**
   * Subscribe to symbol changes
   */
  onSymbolChange(callback: (newSymbol: SymbolKey) => void): void {
    this.symbolChangeCallbacks.add(callback);
  }

  /**
   * Unsubscribe from symbol changes
   */
  offSymbolChange(callback: (newSymbol: SymbolKey) => void): void {
    this.symbolChangeCallbacks.delete(callback);
  }

  /**
   * Export all drawings for backup/save
   */
  exportDrawings(): Record<SymbolKey, Drawing[]> {
    return Object.fromEntries(this.drawingsBySymbol);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSymbols: number;
    totalDrawings: number;
    currentSymbolDrawings: number;
    renderedDrawings: number;
  } {
    let totalDrawings = 0;
    this.drawingsBySymbol.forEach(drawings => {
      totalDrawings += drawings.length;
    });
    
    return {
      totalSymbols: this.drawingsBySymbol.size,
      totalDrawings,
      currentSymbolDrawings: this.getCurrentSymbolDrawings().length,
      renderedDrawings: this.renderedDrawingIds.size
    };
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.clearRenderedDrawings();
    this.symbolChangeCallbacks.clear();
    this.drawingsBySymbol.clear();
    console.log('🗑️ DrawingManager destroyed');
  }
}

/**
 * Global drawing manager instance
 */
let globalDrawingManager: DrawingManager | null = null;

/**
 * Initialize global drawing manager
 */
export function initializeDrawingManager(options: DrawingManagerOptions): DrawingManager {
  if (globalDrawingManager) {
    console.warn('⚠️ DrawingManager already initialized, destroying old instance');
    globalDrawingManager.destroy();
  }
  
  globalDrawingManager = new DrawingManager(options);
  return globalDrawingManager;
}

/**
 * Get global drawing manager
 */
export function getDrawingManager(): DrawingManager | null {
  return globalDrawingManager;
}

