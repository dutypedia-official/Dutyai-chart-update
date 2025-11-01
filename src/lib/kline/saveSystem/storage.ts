/**
 * Storage Provider Implementation
 * 
 * Provides localStorage-based persistence for chart save system
 * with migration support and future API backend compatibility
 */

import type { 
  StorageProvider, 
  SavedLayout, 
  SavedLayoutMeta 
} from './types';

// Storage keys
const STORAGE_KEYS = {
  LAYOUTS: 'chart.saves.v1',
  ACTIVE_SAVE_ID: 'chart.activeSaveId',
  // Legacy key for migration
  LEGACY_LAYOUTS: 'chart.saves.v0'
} as const;

/**
 * Generate a UUID v4 - Mobile compatible alternative to crypto.randomUUID()
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Normalize symbol key for consistent storage
 */
function normalizeSymbolKey(symbol: string): string {
  return symbol.toUpperCase().trim();
}

/**
 * Validate layout data structure
 */
function validateLayout(layout: any): layout is SavedLayout {
  return (
    layout &&
    typeof layout.id === 'string' &&
    typeof layout.name === 'string' &&
    typeof layout.createdAt === 'string' &&
    typeof layout.updatedAt === 'string' &&
    typeof layout.timezone === 'string' &&
    typeof layout.interval === 'string' &&
    typeof layout.chartType === 'string' &&
    typeof layout.theme === 'string' &&
    Array.isArray(layout.panes) &&
    Array.isArray(layout.indicators) &&
    typeof layout.drawingsBySymbol === 'object'
  );
}

/**
 * LocalStorage-based storage provider
 */
export class LocalStorageProvider implements StorageProvider {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.migrate();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize storage provider:', error);
      throw error;
    }
  }

  /**
   * Migrate from legacy storage format
   */
  async migrate(): Promise<void> {
    try {
      const legacyData = localStorage.getItem(STORAGE_KEYS.LEGACY_LAYOUTS);
      if (!legacyData) return;

      console.log('🔄 Migrating chart saves from v0 to v1...');
      
      const legacyLayouts = JSON.parse(legacyData);
      if (!Array.isArray(legacyLayouts)) return;

      const currentData = localStorage.getItem(STORAGE_KEYS.LAYOUTS);
      if (currentData) {
        // v1 data already exists, don't overwrite
        localStorage.removeItem(STORAGE_KEYS.LEGACY_LAYOUTS);
        return;
      }

      // Convert legacy format to v1
      const migratedLayouts: SavedLayout[] = legacyLayouts.map((legacy: any) => ({
        id: legacy.id || generateUUID(),
        name: legacy.name || 'Migrated Layout',
        createdAt: legacy.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timezone: legacy.timezone || 'UTC',
        interval: legacy.interval || '1h',
        chartType: legacy.chartType || 'candles',
        theme: legacy.theme || 'dark',
        panes: legacy.panes || [],
        indicators: legacy.indicators || [],
        styles: legacy.styles || {},
        options: legacy.options || {},
        // Convert drawings to symbol-scoped format
        drawingsBySymbol: legacy.drawings ? {
          [normalizeSymbolKey(legacy.symbol || 'DEFAULT')]: legacy.drawings
        } : {}
      }));

      localStorage.setItem(STORAGE_KEYS.LAYOUTS, JSON.stringify(migratedLayouts));
      localStorage.removeItem(STORAGE_KEYS.LEGACY_LAYOUTS);
      
      console.log(`✅ Migrated ${migratedLayouts.length} layouts to v1 format`);
    } catch (error) {
      console.error('Migration failed:', error);
      // Don't throw - continue with empty state
    }
  }

  /**
   * Get all saved layout metadata
   */
  async listSavedLayouts(): Promise<SavedLayoutMeta[]> {
    await this.initialize();
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAYOUTS);
      if (!data) return [];

      const layouts: SavedLayout[] = JSON.parse(data);
      if (!Array.isArray(layouts)) return [];

      return layouts
        .filter(validateLayout)
        .map(layout => ({
          id: layout.id,
          name: layout.name,
          createdAt: layout.createdAt,
          updatedAt: layout.updatedAt
        }))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('Failed to list saved layouts:', error);
      return [];
    }
  }

  /**
   * Get a specific saved layout
   */
  async getSavedLayout(id: string): Promise<SavedLayout | null> {
    await this.initialize();
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAYOUTS);
      if (!data) return null;

      const layouts: SavedLayout[] = JSON.parse(data);
      if (!Array.isArray(layouts)) return null;

      const layout = layouts.find(l => l.id === id);
      return layout && validateLayout(layout) ? layout : null;
    } catch (error) {
      console.error('Failed to get saved layout:', error);
      return null;
    }
  }

  /**
   * Create a new saved layout
   */
  async createSavedLayout(
    layoutData: Omit<SavedLayout, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SavedLayout> {
    await this.initialize();
    
    try {
      const now = new Date().toISOString();
      const layout: SavedLayout = {
        ...layoutData,
        id: generateUUID(),
        createdAt: now,
        updatedAt: now,
        // Normalize symbol keys in drawings
        drawingsBySymbol: Object.fromEntries(
          Object.entries(layoutData.drawingsBySymbol).map(([symbol, drawings]) => [
            normalizeSymbolKey(symbol),
            drawings
          ])
        )
      };

      const data = localStorage.getItem(STORAGE_KEYS.LAYOUTS);
      const layouts: SavedLayout[] = data ? JSON.parse(data) : [];
      
      layouts.push(layout);
      localStorage.setItem(STORAGE_KEYS.LAYOUTS, JSON.stringify(layouts));
      
      return layout;
    } catch (error) {
      console.error('Failed to create saved layout:', error);
      throw new Error('Failed to save layout');
    }
  }

  /**
   * Update an existing saved layout
   */
  async updateSavedLayout(
    id: string, 
    updates: Partial<SavedLayout>
  ): Promise<SavedLayout> {
    await this.initialize();
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAYOUTS);
      if (!data) throw new Error('Layout not found');

      const layouts: SavedLayout[] = JSON.parse(data);
      const index = layouts.findIndex(l => l.id === id);
      
      if (index === -1) throw new Error('Layout not found');

      const updatedLayout: SavedLayout = {
        ...layouts[index],
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
        // Normalize symbol keys in drawings if provided
        drawingsBySymbol: updates.drawingsBySymbol ? 
          Object.fromEntries(
            Object.entries(updates.drawingsBySymbol).map(([symbol, drawings]) => [
              normalizeSymbolKey(symbol),
              drawings
            ])
          ) : layouts[index].drawingsBySymbol
      };

      layouts[index] = updatedLayout;
      localStorage.setItem(STORAGE_KEYS.LAYOUTS, JSON.stringify(layouts));
      
      return updatedLayout;
    } catch (error) {
      console.error('Failed to update saved layout:', error);
      throw new Error('Failed to update layout');
    }
  }

  /**
   * Delete a saved layout
   */
  async deleteSavedLayout(id: string): Promise<void> {
    await this.initialize();
    
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAYOUTS);
      if (!data) return;

      const layouts: SavedLayout[] = JSON.parse(data);
      const filteredLayouts = layouts.filter(l => l.id !== id);
      
      localStorage.setItem(STORAGE_KEYS.LAYOUTS, JSON.stringify(filteredLayouts));
      
      // Clear active save if it was the deleted layout
      const activeSaveId = await this.getActiveSaveId();
      if (activeSaveId === id) {
        await this.setActiveSaveId(null);
      }
    } catch (error) {
      console.error('Failed to delete saved layout:', error);
      throw new Error('Failed to delete layout');
    }
  }

  /**
   * Set the currently active save ID
   */
  async setActiveSaveId(id: string | null): Promise<void> {
    try {
      if (id === null) {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SAVE_ID);
      } else {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SAVE_ID, id);
      }
    } catch (error) {
      console.error('Failed to set active save ID:', error);
    }
  }

  /**
   * Get the currently active save ID
   */
  async getActiveSaveId(): Promise<string | null> {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_SAVE_ID);
    } catch (error) {
      console.error('Failed to get active save ID:', error);
      return null;
    }
  }

  /**
   * Check if a layout name already exists
   */
  async layoutNameExists(name: string, excludeId?: string): Promise<boolean> {
    const layouts = await this.listSavedLayouts();
    return layouts.some(layout => 
      layout.name === name && layout.id !== excludeId
    );
  }

  /**
   * Cleanup storage (remove invalid entries)
   */
  async cleanup(): Promise<void> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LAYOUTS);
      if (!data) return;

      const layouts: SavedLayout[] = JSON.parse(data);
      const validLayouts = layouts.filter(validateLayout);
      
      if (validLayouts.length !== layouts.length) {
        localStorage.setItem(STORAGE_KEYS.LAYOUTS, JSON.stringify(validLayouts));
        console.log(`🧹 Cleaned up ${layouts.length - validLayouts.length} invalid layouts`);
      }
    } catch (error) {
      console.error('Failed to cleanup storage:', error);
    }
  }
}

/**
 * Default storage provider instance
 */
export const defaultStorageProvider = new LocalStorageProvider();