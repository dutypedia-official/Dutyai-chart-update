<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import { derived, type Writable } from 'svelte/store';
  import { SaveManager } from './SaveManager';
  import { LocalStorageProvider } from './storage';
  import { collectGlobalState, collectDrawings, applyGlobalState, clearAllDrawings, renderDrawings, getCurrentSymbol, normalizeSymbolKey } from './chartStateCollector';
  import type { ChartSave, ChartCtx } from '../chart';
  import type { ChartRuntimeContracts, SymbolKey } from './types';

  // Get chart context
  const save = getContext('save') as Writable<ChartSave>;
  const ctx = getContext('ctx') as Writable<ChartCtx>;
  const chart = getContext('chart') as Writable<any>;

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
      // Create runtime contracts
      const runtime: ChartRuntimeContracts = {
        getCurrentSymbol: () => getCurrentSymbol($save),
        
        collectGlobalState: () => collectGlobalState($save, chartInstance),
        
        collectDrawings: (symbol: SymbolKey) => collectDrawings($save.symbol, $save.period, {}),
        
        applyGlobalState: async (globalState) => await applyGlobalState(globalState, save, chartInstance),
        
        clearAllDrawings: () => clearAllDrawings($save.symbol, $save.period, {}),
        
        renderDrawings: (drawings) => renderDrawings(drawings, $save.symbol, $save.period, chartInstance, {}),
        
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
          console.log('✅ Restored data includes indicators:', result.data?.indicators?.length || 0);
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