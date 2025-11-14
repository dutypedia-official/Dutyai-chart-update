<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import { derived, type Writable } from 'svelte/store';
  import { SaveManager } from './SaveManager';
  import { ApiStorageProvider } from './ApiStorageProvider';
  import { collectGlobalState, applyGlobalState, getCurrentSymbol, normalizeSymbolKey } from './chartStateCollector';
  import type { ChartSave, ChartCtx } from '../chart';
  import type { ChartRuntimeContracts, SymbolKey, Drawing } from './types';
  import type { DrawingManager } from '../drawingManager';
  import { markClean } from '$lib/stores/unsavedChanges';

  // Get chart context
  const save = getContext('save') as Writable<ChartSave>;
  const ctx = getContext('ctx') as Writable<ChartCtx>;
  const chart = getContext('chart') as Writable<any>;
  const drawingManagerContext = getContext('drawingManager') as { get: () => DrawingManager | null };

  // Initialize save system
  const storage = new ApiStorageProvider();
  const saveManager = new SaveManager(storage);

  // Symbol change tracking
  let currentSymbolKey: SymbolKey | null = null;
  let symbolUnsubscribe: (() => void) | null = null;

  /**
   * Clear persisted chart cache (unsaved changes from localStorage)
   * This prevents WebView from showing cached unsaved changes
   */
  function clearPersistedChartCache() {
    try {
      console.log('🧹 Clearing persisted chart cache to prevent showing unsaved changes...');
      
      // Get current save state to preserve important data
      const currentSave = $save;
      
      // Clear the persisted localStorage completely
      const chartKey = 'chart';
      
      // Remove all chart-related cached data
      if (typeof localStorage !== 'undefined') {
        // Don't remove these - they are part of saved layouts system:
        // - 'activeSaveId' 
        // - 'savedLayouts'
        
        // Remove the main persisted chart store (contains unsaved indicators, drawings, etc)
        const storedChart = localStorage.getItem(chartKey);
        if (storedChart) {
          try {
            const parsed = JSON.parse(storedChart);
            // Keep only essential settings, remove volatile state
            const cleaned = {
              key: parsed.key || 'chart',
              theme: parsed.theme || 'dark',
              symbol: parsed.symbol || 'BINANCE:BTCUSDT',
              period: parsed.period || { timeframe: '1h', timespan: 'hour' },
              // Remove indicators, panes, overlays - these should come from saved layouts
              // indicators: [], // Will be loaded from saved layout
              // panes: [], // Will be loaded from saved layout
              // styles will be loaded from saved layout or default theme
            };
            localStorage.setItem(chartKey, JSON.stringify(cleaned));
            console.log('✅ Cleared unsaved chart changes, kept basic settings');
          } catch (e) {
            console.warn('⚠️ Could not parse stored chart, clearing completely:', e);
            localStorage.removeItem(chartKey);
          }
        }
        
        // Clear drawing caches (these should come from saved layouts only)
        localStorage.removeItem('chart_drawings');
        localStorage.removeItem('chart_overlays');
        localStorage.removeItem('dataSpaceOverlays');
        
        console.log('✅ Persisted chart cache cleared successfully');
      }
    } catch (error) {
      console.error('❌ Error clearing persisted chart cache:', error);
    }
  }

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
          // Only hide rendered drawings, do NOT delete stored symbol drawings
          if (!drawingManager) {
            console.warn('⚠️ DrawingManager not available, cannot clear drawings');
            return;
          }
          
          drawingManager.hideRenderedDrawings();
          console.log('🗑️ Cleared rendered drawings from chart (data preserved)');
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
          // Ensure current symbol is set to guarantee rendering
          drawingManager.setCurrentSymbol(currentSymbol);
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

      // Wire save events to clear unsaved changes flag on successful save/load
      saveManager.setEventHandlers({
        onSaved: () => {
          try { markClean(); } catch {}
        },
        onLoaded: () => {
          try { markClean(); } catch {}
        }
      });

      // Make save manager globally available for UI components
      if (typeof window !== 'undefined') {
        (window as any).saveManager = saveManager;
        
        // Expose force refresh function for WebView/Expo environments
        // This allows the parent app to trigger a fresh load from saved charts
        (window as any).forceRefreshChart = async () => {
          console.log('🔄 Force refresh triggered from WebView parent');
          await restoreActiveSavedData();
        };
        
        // Expose function to clear local cache and reload
        (window as any).clearChartCache = () => {
          console.log('🗑️ Clearing chart cache');
          try {
            // Clear persisted chart data
            localStorage.removeItem('chart');
            // Clear drawing data
            const dmKey = 'chart_drawings';
            localStorage.removeItem(dmKey);
            // Clear overlays
            localStorage.removeItem('chart_overlays');
            localStorage.removeItem('dataSpaceOverlays');
            console.log('✅ Chart cache cleared');
          } catch (e) {
            console.error('❌ Error clearing cache:', e);
          }
        };
      }

      // CRITICAL FIX: Clear persisted localStorage cache first, then load saved layouts
      // This ensures WebView always shows either saved layout or default chart
      // Never shows cached unsaved changes
      setTimeout(async () => {
        // Step 1: Clear persisted chart cache (unsaved changes)
        clearPersistedChartCache();
        
        // Step 2: Restore from saved layouts (or use default)
        await restoreActiveSavedData();
        
        // After auto-restore, baseline is clean
        try { markClean(); } catch {}
      }, 100);

      console.log('✅ Save system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize save system:', error);
    }
  }

  /**
   * Restore active saved data after chart initialization
   * This fixes the issue where chart refresh or WebView reopen clears indicators 
   * even when saved data is selected. Always prioritizes saved layouts over cached data.
   */
  async function restoreActiveSavedData() {
    try {
      console.log('🔍 Starting automatic restoration process (WebView-safe)...');
      
      // PRIORITY 1: Try to refresh saved layouts from server first (for logged-in users)
      let userId: string | null = null;
      try {
        userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      } catch {}
      
      if (userId) {
        console.log('🌐 User logged in, refreshing saved layouts from server...');
        try {
          await saveManager.refresh();
          console.log('✅ Saved layouts refreshed from server');
        } catch (e) {
          console.warn('⚠️ Could not refresh saved layouts from server:', e);
        }
      }
      
      // PRIORITY 2: Get the current active save ID from save manager
      const activeSaveId = saveManager.getActiveSaveId();
      console.log('🔍 Active save ID found:', activeSaveId);
      
      if (activeSaveId) {
        console.log('🔄 Restoring active saved data:', activeSaveId);
        
        // Load the active saved layout
        const result = await saveManager.load(activeSaveId);
        
        if (result.success) {
          console.log('✅ Active saved data restored successfully:', activeSaveId);
          return; // Successfully restored, exit
        } else {
          console.warn('⚠️ Failed to restore active saved data:', result.error);
          // Continue to try other options
        }
      }
      
      // PRIORITY 3: If no active layout or it failed, try to load from available saved layouts
      let savedLayoutsSnapshot: any[] = [];
      const unsubscribe = saveManager.state.subscribe((state: any) => {
        savedLayoutsSnapshot = state?.savedLayouts || [];
      });
      unsubscribe && unsubscribe();
      
      if (savedLayoutsSnapshot && savedLayoutsSnapshot.length > 0) {
        // Pick the first layout (most recent or default)
        const chosen = savedLayoutsSnapshot[0];
        console.log('🧭 Auto-selecting first saved layout:', chosen?.id, chosen?.name);
        if (chosen?.id) {
          const loadRes = await saveManager.load(chosen.id);
          if (loadRes.success) {
            console.log('✅ First saved layout auto-restored and set active:', chosen.id);
            return; // Successfully restored, exit
          } else {
            console.warn('⚠️ Failed to auto-load chosen layout:', loadRes.error);
          }
        }
      }
      
      // PRIORITY 4: No saved layouts found, use default chart
      console.log('ℹ️ No saved layouts found, using default chart configuration');
      
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