/**
 * Save Manager
 * 
 * Central coordinator for chart save/load operations
 * Handles state collection, persistence, and restoration
 */

import { writable, type Writable } from 'svelte/store';
import type {
  SavedLayout,
  SavedLayoutMeta,
  StorageProvider,
  ChartRuntimeContracts,
  SaveResult,
  LoadResult,
  ValidationResult,
  SymbolKey,
  GlobalChartState,
  Drawing,
  SaveSystemEvents
} from './types';
import { defaultStorageProvider } from './storage';

/**
 * Save Manager State
 */
interface SaveManagerState {
  activeSaveId: string | null;
  savedLayouts: SavedLayoutMeta[];
  isLoading: boolean;
  lastError: string | null;
  initialized: boolean;
}

/**
 * Save Manager Class
 */
export class SaveManager {
  private storage: StorageProvider;
  private runtime: ChartRuntimeContracts | null = null;
  private events: Partial<SaveSystemEvents> = {};
  
  // Reactive state
  public state: Writable<SaveManagerState>;
  
  // Symbol change tracking
  private symbolChangeCallbacks = new Set<(symbol: SymbolKey) => void>();
  private currentSymbol: SymbolKey | null = null;

  constructor(storage?: StorageProvider) {
    this.storage = storage || defaultStorageProvider;
    
    this.state = writable<SaveManagerState>({
      activeSaveId: null,
      savedLayouts: [],
      isLoading: false,
      lastError: null,
      initialized: false
    });

    this.initialize();
  }

  /**
   * Initialize the save manager
   */
  private async initialize(): Promise<void> {
    try {
      this.updateState({ isLoading: true });
      
      // Load initial state
      const [activeSaveId, savedLayouts] = await Promise.all([
        this.storage.getActiveSaveId(),
        this.storage.listSavedLayouts()
      ]);

      this.updateState({
        activeSaveId,
        savedLayouts,
        isLoading: false,
        lastError: null
      });
    } catch (error) {
      console.error('Failed to initialize SaveManager:', error);
      this.updateState({
        isLoading: false,
        lastError: 'Failed to initialize save system'
      });
    }
  }

  /**
   * Set runtime contracts for chart interaction
   */
  setRuntimeContracts(runtime: ChartRuntimeContracts): void {
    this.runtime = runtime;
    
    // Set up symbol change monitoring
    this.runtime.onSymbolChange(this.handleSymbolChange.bind(this));
    this.currentSymbol = this.runtime.getCurrentSymbol();
    
    // Mark as initialized
    this.updateState({ initialized: true });
    console.log('✅ SaveManager fully initialized and ready');
  }

  /**
   * Set event handlers
   */
  setEventHandlers(events: Partial<SaveSystemEvents>): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * Handle symbol change events
   */
  private async handleSymbolChange(newSymbol: SymbolKey): Promise<void> {
    const oldSymbol = this.currentSymbol;
    this.currentSymbol = newSymbol;

    // If we have an active save, reload drawings for the new symbol
    const state = this.getState();
    if (state.activeSaveId && this.runtime) {
      try {
        const layout = await this.storage.getSavedLayout(state.activeSaveId);
        if (layout) {
          // Clear current drawings
          this.runtime.clearAllDrawings();
          
          // Load drawings for the new symbol
          const symbolDrawings = layout.drawingsBySymbol[newSymbol] || [];
          this.runtime.renderDrawings(symbolDrawings);
        }
      } catch (error) {
        console.error('Failed to reload drawings for symbol change:', error);
      }
    }

    // Notify symbol change callbacks
    this.symbolChangeCallbacks.forEach(callback => {
      try {
        callback(newSymbol);
      } catch (error) {
        console.error('Symbol change callback error:', error);
      }
    });
  }

  /**
   * Subscribe to symbol changes
   */
  onSymbolChange(callback: (symbol: SymbolKey) => void): void {
    this.symbolChangeCallbacks.add(callback);
  }

  /**
   * Unsubscribe from symbol changes
   */
  offSymbolChange(callback: (symbol: SymbolKey) => void): void {
    this.symbolChangeCallbacks.delete(callback);
  }

  /**
   * Update state
   */
  private updateState(updates: Partial<SaveManagerState>): void {
    this.state.update(state => ({ ...state, ...updates }));
  }

  /**
   * Get current state
   */
  private getState(): SaveManagerState {
    let currentState: SaveManagerState;
    this.state.subscribe(state => currentState = state)();
    return currentState!;
  }

  /**
   * Validate save name
   */
  validateSaveName(name: string, excludeId?: string): ValidationResult {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Name is required' };
    }

    if (name.length > 100) {
      return { valid: false, error: 'Name must be 100 characters or less' };
    }

    const state = this.getState();
    const nameExists = state.savedLayouts.some(layout => 
      layout.name === name && layout.id !== excludeId
    );

    if (nameExists) {
      return { valid: false, error: 'Name already exists' };
    }

    return { valid: true };
  }

  /**
   * Collect current chart state
   */
  private async collectCurrentState(): Promise<{
    global: GlobalChartState;
    drawings: Drawing[];
    symbol: SymbolKey;
  } | null> {
    if (!this.runtime) {
      throw new Error('Runtime contracts not set');
    }

    try {
      const symbol = this.runtime.getCurrentSymbol();
      const global = this.runtime.collectGlobalState();
      const drawings = this.runtime.collectDrawings(symbol);

      return { global, drawings, symbol };
    } catch (error) {
      console.error('Failed to collect chart state:', error);
      return null;
    }
  }

  /**
   * Save current chart state
   */
  async save(name: string): Promise<SaveResult> {
    try {
      this.updateState({ isLoading: true, lastError: null });

      // Validate name
      const validation = this.validateSaveName(name);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Collect current state
      const currentState = await this.collectCurrentState();
      if (!currentState) {
        return { success: false, error: 'Failed to collect chart state' };
      }

      // Create layout data
      const layoutData = {
        name,
        timezone: currentState.global.timezone,
        interval: currentState.global.interval,
        chartType: currentState.global.chartType,
        theme: currentState.global.theme,
        panes: currentState.global.panes,
        indicators: currentState.global.indicators,
        styles: currentState.global.styles,
        options: currentState.global.options,
        drawingsBySymbol: {
          [currentState.symbol]: currentState.drawings
        }
      };

      // Save to storage
      const layout = await this.storage.createSavedLayout(layoutData);
      
      // Update active save
      await this.storage.setActiveSaveId(layout.id);
      
      // Refresh state
      const savedLayouts = await this.storage.listSavedLayouts();
      this.updateState({
        activeSaveId: layout.id,
        savedLayouts,
        isLoading: false
      });

      // Notify event handlers
      this.events.onSaved?.(layout);

      return { success: true, layout };
    } catch (error) {
      console.error('Save failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      
      this.updateState({
        isLoading: false,
        lastError: errorMessage
      });

      this.events.onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Quick save to active layout
   */
  async quickSave(): Promise<SaveResult> {
    const state = this.getState();
    
    if (!state.activeSaveId) {
      return { success: false, error: 'No active save to update' };
    }

    try {
      this.updateState({ isLoading: true, lastError: null });

      // Get existing layout
      const existingLayout = await this.storage.getSavedLayout(state.activeSaveId);
      if (!existingLayout) {
        return { success: false, error: 'Active save not found' };
      }

      // Collect current state
      const currentState = await this.collectCurrentState();
      if (!currentState) {
        return { success: false, error: 'Failed to collect chart state' };
      }

      // Update layout with current state
      const updates = {
        timezone: currentState.global.timezone,
        interval: currentState.global.interval,
        chartType: currentState.global.chartType,
        theme: currentState.global.theme,
        panes: currentState.global.panes,
        indicators: currentState.global.indicators,
        styles: currentState.global.styles,
        options: currentState.global.options,
        drawingsBySymbol: {
          ...existingLayout.drawingsBySymbol,
          [currentState.symbol]: currentState.drawings
        }
      };

      const layout = await this.storage.updateSavedLayout(state.activeSaveId, updates);
      
      // Refresh state
      const savedLayouts = await this.storage.listSavedLayouts();
      this.updateState({
        savedLayouts,
        isLoading: false
      });

      // Notify event handlers
      this.events.onSaved?.(layout);

      return { success: true, layout };
    } catch (error) {
      console.error('Quick save failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Quick save failed';
      
      this.updateState({
        isLoading: false,
        lastError: errorMessage
      });

      this.events.onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Save current chart state into an existing layout by ID
   */
  async saveTo(layoutId: string): Promise<SaveResult> {
    try {
      this.updateState({ isLoading: true, lastError: null });

      // Get existing layout
      const existingLayout = await this.storage.getSavedLayout(layoutId);
      if (!existingLayout) {
        return { success: false, error: 'Selected layout not found' };
      }

      // Collect current state
      const currentState = await this.collectCurrentState();
      if (!currentState) {
        return { success: false, error: 'Failed to collect chart state' };
      }

      // Update layout with current state
      const updates = {
        timezone: currentState.global.timezone,
        interval: currentState.global.interval,
        chartType: currentState.global.chartType,
        theme: currentState.global.theme,
        panes: currentState.global.panes,
        indicators: currentState.global.indicators,
        styles: currentState.global.styles,
        options: currentState.global.options,
        drawingsBySymbol: {
          ...existingLayout.drawingsBySymbol,
          [currentState.symbol]: currentState.drawings
        }
      };

      const layout = await this.storage.updateSavedLayout(layoutId, updates);

      // Keep the active save as the overwritten layout for continuity
      await this.storage.setActiveSaveId(layoutId);

      // Refresh state
      const savedLayouts = await this.storage.listSavedLayouts();
      this.updateState({
        activeSaveId: layoutId,
        savedLayouts,
        isLoading: false
      });

      // Notify event handlers
      this.events.onSaved?.(layout);

      return { success: true, layout };
    } catch (error) {
      console.error('Save to existing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      this.updateState({ isLoading: false, lastError: errorMessage });
      this.events.onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Save as new layout
   */
  async saveAs(name: string): Promise<SaveResult> {
    return this.save(name);
  }

  /**
   * Load a saved layout
   */
  async load(layoutId: string): Promise<LoadResult> {
    try {
      this.updateState({ isLoading: true, lastError: null });
      console.log('🔄 Loading layout:', layoutId);

      // Get layout from storage
      const layout = await this.storage.getSavedLayout(layoutId);
      if (!layout) {
        console.error('❌ Layout not found:', layoutId);
        return { success: false, error: 'Layout not found' };
      }

      console.log('📊 Layout data loaded:', {
        name: layout.name,
        indicatorCount: layout.indicators?.length || 0,
        indicators: layout.indicators?.map(ind => ind.type) || []
      });

      if (!this.runtime) {
        console.error('❌ Runtime contracts not set');
        return { success: false, error: 'Runtime contracts not set' };
      }

      // Apply global state
      console.log('🔧 Applying global state with indicators:', layout.indicators?.length || 0);
      await this.runtime.applyGlobalState({
        timezone: layout.timezone,
        interval: layout.interval,
        chartType: layout.chartType,
        theme: layout.theme,
        panes: layout.panes,
        indicators: layout.indicators,
        styles: layout.styles,
        options: layout.options
      });

      // Apply symbol-scoped drawings
      const currentSymbol = this.runtime.getCurrentSymbol();
      this.runtime.clearAllDrawings();
      
      const symbolDrawings = layout.drawingsBySymbol[currentSymbol] || [];
      this.runtime.renderDrawings(symbolDrawings);

      // Update active save
      await this.storage.setActiveSaveId(layout.id);
      
      this.updateState({
        activeSaveId: layout.id,
        isLoading: false
      });

      // Notify event handlers
      this.events.onLoaded?.(layout);

      console.log('✅ Layout loaded successfully:', {
        layoutId: layout.id,
        name: layout.name,
        indicatorsRestored: layout.indicators?.length || 0
      });

      return { success: true };
    } catch (error) {
      console.error('Load failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Load failed';
      
      this.updateState({
        isLoading: false,
        lastError: errorMessage
      });

      this.events.onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete a saved layout
   */
  async delete(layoutId: string): Promise<LoadResult> {
    try {
      this.updateState({ isLoading: true, lastError: null });

      await this.storage.deleteSavedLayout(layoutId);
      
      // Refresh state
      const [activeSaveId, savedLayouts] = await Promise.all([
        this.storage.getActiveSaveId(),
        this.storage.listSavedLayouts()
      ]);

      this.updateState({
        activeSaveId,
        savedLayouts,
        isLoading: false
      });

      // Notify event handlers
      this.events.onDeleted?.(layoutId);

      return { success: true };
    } catch (error) {
      console.error('Delete failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      
      this.updateState({
        isLoading: false,
        lastError: errorMessage
      });

      this.events.onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if there's an active save
   */
  hasActiveSave(): boolean {
    return this.getState().activeSaveId !== null;
  }

  /**
   * Get active save ID
   */
  getActiveSaveId(): string | null {
    return this.getState().activeSaveId;
  }

  /**
   * Clear active save
   */
  async clearActiveSave(): Promise<void> {
    await this.storage.setActiveSaveId(null);
    this.updateState({ activeSaveId: null });
  }

  /**
   * Refresh saved layouts list
   */
  async refresh(): Promise<void> {
    try {
      this.updateState({ isLoading: true });
      
      const savedLayouts = await this.storage.listSavedLayouts();
      
      this.updateState({
        savedLayouts,
        isLoading: false,
        lastError: null
      });
    } catch (error) {
      console.error('Refresh failed:', error);
      this.updateState({
        isLoading: false,
        lastError: 'Failed to refresh layouts'
      });
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.runtime) {
      // Remove symbol change listener
      this.symbolChangeCallbacks.clear();
    }
  }
}

/**
 * Default save manager instance
 */
export const defaultSaveManager = new SaveManager();