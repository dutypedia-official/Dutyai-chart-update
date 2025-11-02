<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import { derived, type Writable } from 'svelte/store';
  import { SaveManager } from './SaveManager';
  import { LocalStorageProvider } from './storage';
  import { collectGlobalState, applyGlobalState, getCurrentSymbol, normalizeSymbolKey } from './chartStateCollector';
  import type { ChartSave, ChartCtx } from '../chart';
  import type { ChartRuntimeContracts, SymbolKey, Drawing } from './types';
  import type { DrawingManager } from '../drawingManager';

  // Get chart context
  const save = getContext('save') as Writable<ChartSave>;
  const ctx = getContext('ctx') as Writable<ChartCtx>;
  const chart = getContext('chart') as Writable<any>;
  const drawingManagerContext = getContext('drawingManager') as { get: () => DrawingManager | null };

  // Initialize save system
  const storage = new LocalStorageProvider();
  const saveManager = new SaveManager(storage);

  // Symbol change tracking
  let currentSymbolKey: SymbolKey | null = null;
  let symbolUnsubscribe: (() => void) | null = null;

  onMount(async () => {
    // Wait for chart to be ready
    if (!$chart) {
      const unsubscribe = chart.subscribe((chartInstance) => {
        if (chartInstance) {
          unsubscribe();
          initializeSaveSystem(chartInstance);
        }
      });
    } else {
      initializeSaveSystem($chart);
    }
  });

  async function initializeSaveSystem(chartInstance: any) {
    try {
      // Wait for drawing manager to be initialized
      let retryCount = 0;
      const maxRetries = 20; // 2 seconds max wait
      
      while (!drawingManagerContext.get() && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retryCount++;
      }
      
      const drawingManager = drawingManagerContext.get();
      if (!drawingManager) {
        console.error('❌ DrawingManager not available after waiting');
        // Continue without drawing manager - save system will work without drawings
      } else {
        console.log('✅ DrawingManager is available for save system');
      }

      // Create runtime contracts
      const runtime: ChartRuntimeContracts = {
        getCurrentSymbol: () => getCurrentSymbol($save),
        
        collectGlobalState: () => collectGlobalState($save, chartInstance),
        
        collectDrawings: (symbol: SymbolKey) => {
          // Use DrawingManager to collect drawings
          if (!drawingManager) {
            console.warn('⚠️ DrawingManager not available, returning empty drawings');
            return [];
          }
          
          const drawings = drawingManager.getDrawingsForSymbol(symbol);
          console.log(`📥 Collected ${drawings.length} drawings for symbol:`, symbol);
          return drawings;
        },
        
        applyGlobalState: async (globalState) => await applyGlobalState(globalState, save, chartInstance),
        
        clearAllDrawings: () => {
          // Use DrawingManager to clear drawings
          if (!drawingManager) {
            console.warn('⚠️ DrawingManager not available, cannot clear drawings');
            return;
          }
          
          const currentSymbol = getCurrentSymbol($save);
          drawingManager.clearDrawingsForSymbol(currentSymbol);
          console.log('🗑️ Cleared all drawings for current symbol via DrawingManager');
        },
        
        renderDrawings: (drawings: Drawing[]) => {
          // Use DrawingManager to render drawings
          if (!drawingManager) {
            console.warn('⚠️ DrawingManager not available, cannot render drawings');
            return;
          }
          
          const currentSymbol = getCurrentSymbol($save);
          console.log(`🎨 Rendering ${drawings.length} drawings for symbol:`, currentSymbol);
          
          // Load drawings into the drawing manager
          drawingManager.loadDrawingsForSymbol(currentSymbol, drawings);
        },
        
        onSymbolChange: (callback) => {
          // Subscribe to symbol changes
          const symbolDerived = derived(save, ($save) => normalizeSymbolKey($save.symbol));
          symbolUnsubscribe = symbolDerived.subscribe((newSymbolKey) => {
            if (currentSymbolKey !== null && currentSymbolKey !== newSymbolKey) {
              console.log('🔄 Save system detected symbol change:', currentSymbolKey, '->', newSymbolKey);
              callback(newSymbolKey);
            }
            currentSymbolKey = newSymbolKey;
          });
        },
        
        offSymbolChange: (callback) => {
          // Unsubscribe from symbol changes
          if (symbolUnsubscribe) {
            symbolUnsubscribe();
            symbolUnsubscribe = null;
          }
        }
      };

      // Set runtime contracts
      saveManager.setRuntimeContracts(runtime);

      // Make save manager globally available for UI components
      if (typeof window !== 'undefined') {
        (window as any).saveManager = saveManager;
      }

      // CRITICAL FIX: Auto-restore active saved data after chart initialization
      // This ensures that when the chart is refreshed, the selected saved data persists
      // Adding a small delay to ensure chart is fully loaded before restoration
      setTimeout(async () => {
        await restoreActiveSavedData();
      }, 500);

      console.log('✅ Save system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize save system:', error);
    }
  }

  /**
   * Restore active saved data after chart initialization
   * This fixes the issue where chart refresh clears indicators even when saved data is selected
   */
  async function restoreActiveSavedData() {
    try {
      console.log('🔍 Starting automatic restoration process...');
      
      // Get the current active save ID from save manager
      const activeSaveId = saveManager.getActiveSaveId();
      console.log('🔍 Active save ID found:', activeSaveId);
      
      if (activeSaveId) {
        console.log('🔄 Restoring active saved data:', activeSaveId);
        
        // Load the active saved layout
        const result = await saveManager.load(activeSaveId);
        
        if (result.success) {
          console.log('✅ Active saved data restored successfully:', activeSaveId);
        } else {
          console.warn('⚠️ Failed to restore active saved data:', result.error);
        }
      } else {
        console.log('ℹ️ No active saved data to restore');
      }
    } catch (error) {
      console.error('❌ Error restoring active saved data:', error);
    }
  }

  onDestroy(() => {
    if (symbolUnsubscribe) {
      symbolUnsubscribe();
    }
    saveManager.destroy();
  });
</script>

<!-- This component has no visual output - it's purely for integration -->