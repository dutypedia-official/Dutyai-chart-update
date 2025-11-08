import { writable, get } from 'svelte/store';
import type { Chart, Nullable } from 'klinecharts';
import type { ChartSave } from './chart';
import { getDrawingManager } from './drawingManager';
import { normalizeSymbolKey } from './saveSystem/chartStateCollector';
import type { Drawing } from './saveSystem/types';

export interface UndoRedoAction {
  type: 'ADD_INDICATOR' | 'REMOVE_INDICATOR' | 'ADD_OVERLAY' | 'REMOVE_OVERLAY';
  data: any;
  timestamp: number;
  id: string;
}

export interface UndoRedoState {
  undoStack: UndoRedoAction[];
  redoStack: UndoRedoAction[];
  maxHistorySize: number;
}

class UndoRedoManager {
  private state = writable<UndoRedoState>({
    undoStack: [],
    redoStack: [],
    maxHistorySize: 50
  });

  private chart: Nullable<Chart> = null;
  private saveStore: any = null;
  private overlaysStore: any = null;

  // Initialize with chart and store references
  init({ chart, saveStore, overlaysStore }: { chart: Nullable<Chart>, saveStore: any, overlaysStore: any }) {
    this.chart = chart;
    this.saveStore = saveStore;
    this.overlaysStore = overlaysStore;
  }

  // Add action to undo stack
  addAction(action: UndoRedoAction) {
    this.state.update(state => {
      // Clear redo stack when new action is added
      state.redoStack = [];
      
      // Add to undo stack
      state.undoStack.push(action);
      
      // Limit stack size
      if (state.undoStack.length > state.maxHistorySize) {
        state.undoStack.shift();
      }
      
      return state;
    });
  }

  // Record indicator addition
  recordAddIndicator(name: string, paneId: string, params: unknown[], saveKey: string) {
    const action: UndoRedoAction = {
      type: 'ADD_INDICATOR',
      data: {
        name,
        paneId,
        params,
        saveKey
      },
      timestamp: Date.now(),
      id: `indicator_${name}_${paneId}_${Date.now()}`
    };
    this.addAction(action);
  }

  // Record indicator removal
  recordRemoveIndicator(name: string, paneId: string, params: unknown[], saveKey: string) {
    const action: UndoRedoAction = {
      type: 'REMOVE_INDICATOR',
      data: {
        name,
        paneId,
        params,
        saveKey
      },
      timestamp: Date.now(),
      id: `indicator_${name}_${paneId}_${Date.now()}`
    };
    this.addAction(action);
  }

  // Record overlay addition
  recordAddOverlay(overlayId: string, overlayData: any, overlayKey: string) {
    const action: UndoRedoAction = {
      type: 'ADD_OVERLAY',
      data: {
        overlayId,
        overlayData,
        overlayKey
      },
      timestamp: Date.now(),
      id: `overlay_${overlayId}_${Date.now()}`
    };
    this.addAction(action);
  }

  // Record overlay removal
  recordRemoveOverlay(overlayId: string, overlayData: any, overlayKey: string) {
    const action: UndoRedoAction = {
      type: 'REMOVE_OVERLAY',
      data: {
        overlayId,
        overlayData,
        overlayKey
      },
      timestamp: Date.now(),
      id: `overlay_${overlayId}_${Date.now()}`
    };
    this.addAction(action);
  }

  // Undo last action
  undo(): boolean {
    const currentState = get(this.state);
    if (currentState.undoStack.length === 0) {
      return false;
    }

    const action = currentState.undoStack[currentState.undoStack.length - 1];
    
    // Execute undo based on action type
    const success = this.executeUndo(action);
    
    if (success) {
      this.state.update(state => {
        // Move action from undo to redo stack
        const undoAction = state.undoStack.pop();
        if (undoAction) {
          state.redoStack.push(undoAction);
        }
        return state;
      });
    }
    
    return success;
  }

  // Redo last undone action
  redo(): boolean {
    const currentState = get(this.state);
    if (currentState.redoStack.length === 0) {
      return false;
    }

    const action = currentState.redoStack[currentState.redoStack.length - 1];
    
    // Execute redo based on action type
    const success = this.executeRedo(action);
    
    if (success) {
      this.state.update(state => {
        // Move action from redo to undo stack
        const redoAction = state.redoStack.pop();
        if (redoAction) {
          state.undoStack.push(redoAction);
        }
        return state;
      });
    }
    
    return success;
  }

  // Execute undo operation
  private executeUndo(action: UndoRedoAction): boolean {
    if (!this.chart) return false;

    try {
      switch (action.type) {
        case 'ADD_INDICATOR':
          // Remove the indicator that was added
          this.chart.removeIndicator({ paneId: action.data.paneId, name: action.data.name });
          
          // Remove from save store
          if (this.saveStore) {
            this.saveStore.update((s: any) => {
              delete s.saveInds[action.data.saveKey];
              return s;
            });
          }
          break;

        case 'REMOVE_INDICATOR':
          // Re-add the indicator that was removed
          const indId = this.chart.createIndicator({
            name: action.data.name,
            calcParams: action.data.params
          }, false, { id: action.data.paneId });
          
          // Restore to save store
          if (this.saveStore && indId) {
            this.saveStore.update((s: any) => {
              s.saveInds[action.data.saveKey] = {
                name: action.data.name,
                pane_id: action.data.paneId,
                params: action.data.params
              };
              return s;
            });
          }
          break;

        case 'ADD_OVERLAY':
          // Remove the overlay that was added
          this.chart.removeOverlay({ id: action.data.overlayId });
          
          // Remove from overlays store
          if (this.overlaysStore) {
            this.overlaysStore.update((ol: any) => {
              delete ol[action.data.overlayKey];
              return ol;
            });
          }
          // Also remove from DrawingManager
          try {
            const dm = getDrawingManager();
            if (dm) dm.removeDrawing(action.data.overlayId);
          } catch {}
          break;

        case 'REMOVE_OVERLAY':
          // Re-add the overlay that was removed
          const overlayId = this.chart.createOverlay(action.data.overlayData);
          
          // Restore to overlays store
          if (this.overlaysStore && overlayId) {
            this.overlaysStore.update((ol: any) => {
              ol[action.data.overlayKey] = action.data.overlayData;
              return ol;
            });
          }
          // Sync back into DrawingManager
          try {
            const dm = getDrawingManager();
            if (dm) {
              const save = get(this.saveStore) as ChartSave;
              const symbolKey = normalizeSymbolKey(save.symbol);
              const ov = action.data.overlayData;
              const points = Array.isArray(ov?.points)
                ? ov.points.map((p: any) => ({
                    time: p?.timestamp ?? p?.t ?? 0,
                    price: p?.value ?? p?.p ?? 0
                  }))
                : [];
              if (points.length > 0) {
                const drawing: Drawing = {
                  id: action.data.overlayId,
                  symbolKey,
                  type: ov?.name || 'unknown',
                  points,
                  styles: ov?.styles || {},
                  ...(ov?.extendData ? { extendData: ov.extendData } : {}),
                  locked: Boolean(ov?.lock),
                  visible: ov?.visible !== false
                };
                dm.addDrawing(drawing);
              }
            }
          } catch {}
          break;

        default:
          return false;
      }
      return true;
    } catch (error) {
      console.error('Error executing undo:', error);
      return false;
    }
  }

  // Execute redo operation
  private executeRedo(action: UndoRedoAction): boolean {
    if (!this.chart) return false;

    try {
      switch (action.type) {
        case 'ADD_INDICATOR':
          // Re-add the indicator
          const indId = this.chart.createIndicator({
            name: action.data.name,
            calcParams: action.data.params
          }, false, { id: action.data.paneId });
          
          // Restore to save store
          if (this.saveStore && indId) {
            this.saveStore.update((s: any) => {
              s.saveInds[action.data.saveKey] = {
                name: action.data.name,
                pane_id: action.data.paneId,
                params: action.data.params
              };
              return s;
            });
          }
          break;

        case 'REMOVE_INDICATOR':
          // Remove the indicator again
          this.chart.removeIndicator({ paneId: action.data.paneId, name: action.data.name });
          
          // Remove from save store
          if (this.saveStore) {
            this.saveStore.update((s: any) => {
              delete s.saveInds[action.data.saveKey];
              return s;
            });
          }
          break;

        case 'ADD_OVERLAY':
          // Re-add the overlay
          const overlayId = this.chart.createOverlay(action.data.overlayData);
          
          // Restore to overlays store
          if (this.overlaysStore && overlayId) {
            this.overlaysStore.update((ol: any) => {
              ol[action.data.overlayKey] = action.data.overlayData;
              return ol;
            });
          }
          // Also add to DrawingManager
          try {
            const dm = getDrawingManager();
            if (dm) {
              const save = get(this.saveStore) as ChartSave;
              const symbolKey = normalizeSymbolKey(save.symbol);
              const ov = action.data.overlayData;
              const points = Array.isArray(ov?.points)
                ? ov.points.map((p: any) => ({
                    time: p?.timestamp ?? p?.t ?? 0,
                    price: p?.value ?? p?.p ?? 0
                  }))
                : [];
              if (points.length > 0) {
                const drawing: Drawing = {
                  id: action.data.overlayId,
                  symbolKey,
                  type: ov?.name || 'unknown',
                  points,
                  styles: ov?.styles || {},
                  ...(ov?.extendData ? { extendData: ov.extendData } : {}),
                  locked: Boolean(ov?.lock),
                  visible: ov?.visible !== false
                };
                dm.addDrawing(drawing);
              }
            }
          } catch {}
          break;

        case 'REMOVE_OVERLAY':
          // Remove the overlay again
          this.chart.removeOverlay({ id: action.data.overlayId });
          
          // Remove from overlays store
          if (this.overlaysStore) {
            this.overlaysStore.update((ol: any) => {
              delete ol[action.data.overlayKey];
              return ol;
            });
          }
          // And remove from DrawingManager
          try {
            const dm = getDrawingManager();
            if (dm) dm.removeDrawing(action.data.overlayId);
          } catch {}
          break;

        default:
          return false;
      }
      return true;
    } catch (error) {
      console.error('Error executing redo:', error);
      return false;
    }
  }

  // Check if undo is available
  canUndo(): boolean {
    const currentState = get(this.state);
    return currentState.undoStack.length > 0;
  }

  // Check if redo is available
  canRedo(): boolean {
    const currentState = get(this.state);
    return currentState.redoStack.length > 0;
  }

  // Get current state for reactive updates
  getState() {
    return this.state;
  }

  // Clear all history
  clearHistory() {
    this.state.update(state => ({
      ...state,
      undoStack: [],
      redoStack: []
    }));
  }
}

// Export singleton instance
export const undoRedoManager = new UndoRedoManager();