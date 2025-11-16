/**
 * Chart State Collector
 * 
 * Functions to collect current chart state including:
 * - Global settings (timezone, interval, theme, etc.)
 * - Indicators with their configurations
 * - Drawings/overlays scoped by symbol
 */

 import type { Chart } from 'klinecharts';
 import * as kc from 'klinecharts';
import type { Writable } from 'svelte/store';
import { get } from 'svelte/store';
import type { 
  GlobalChartState, 
  SavedIndicator, 
  Drawing, 
  SymbolKey, 
  PaneConfig 
} from './types';
import type { ChartSave, SaveInd } from '../chart';
import type { SymbolInfo, Period } from '../types';

/**
 * Normalize symbol to consistent key format
 */
export function normalizeSymbolKey(symbol: SymbolInfo): SymbolKey {
  if (symbol.exchange && symbol.ticker) {
    return `${symbol.exchange.toUpperCase()}:${symbol.ticker.toUpperCase()}`;
  }
  return (symbol.ticker || symbol.name || 'UNKNOWN').toUpperCase();
}

/**
 * Collect global chart state (symbol-agnostic settings)
 */
export function collectGlobalState(
  save: ChartSave,
  chart: Chart | null
): GlobalChartState {
  // Collect pane configurations
  const panes: PaneConfig[] = [];
  
  if (chart) {
    try {
      // Get all panes from the chart
      // Note: KLineCharts v9/v10 API may vary, using safe approach
      const chartData = (chart as any).getChartStore?.() || chart;
      
      // Try to extract pane information
      if (chartData && typeof chartData.getPanes === 'function') {
        const chartPanes = chartData.getPanes();
        chartPanes.forEach((pane: any, index: number) => {
          panes.push({
            id: pane.id || `pane_${index}`,
            height: pane.height,
            minHeight: pane.minHeight,
            position: index,
            visible: pane.visible !== false
          });
        });
      } else {
        // Fallback: create basic pane structure
        panes.push({
          id: 'candle_pane',
          height: 400,
          position: 0,
          visible: true
        });
      }
    } catch (error) {
      console.warn('Error collecting pane configurations:', error);
      // Fallback pane configuration
      panes.push({
        id: 'candle_pane',
        height: 400,
        position: 0,
        visible: true
      });
    }
  }

  // CRITICAL FIX: Collect indicators from BOTH chart and saveInds
  // This ensures ALL indicators on the chart are saved, even if saveInds is out of sync
  const indicators: SavedIndicator[] = [];
  const indicatorsMap = new Map<string, SavedIndicator>();
  
  // STEP 1: First, collect from saveInds (has full data: params, styles, etc.)
  Object.entries(save.saveInds).forEach(([key, saveInd]) => {
    // Convert params array to object format
    const paramsObj: Record<string, any> = {};
    if (saveInd.params && Array.isArray(saveInd.params)) {
      saveInd.params.forEach((param, index) => {
        paramsObj[`param_${index}`] = param;
      });
    }
    
    // Convert styles array to object format
    const stylesObj: Record<string, any> = {};
    if (saveInd.styles && Array.isArray(saveInd.styles)) {
      saveInd.styles.forEach((style, index) => {
        stylesObj[`style_${index}`] = style;
      });
    } else if (saveInd.styles && typeof saveInd.styles === 'object') {
      Object.assign(stylesObj, saveInd.styles);
    }
    
    const savedIndicator: SavedIndicator = {
      id: key,
      type: saveInd.name,
      params: paramsObj,
      styles: stylesObj,
      paneId: saveInd.pane_id,
      visible: true, // Assume visible if saved
      // Include any additional properties
      ...Object.fromEntries(
        Object.entries(saveInd).filter(([k]) => 
          !['name', 'pane_id', 'params', 'styles'].includes(k)
        )
      )
    };
    
    // Use a composite key: name + paneId to avoid duplicates
    const compositeKey = `${saveInd.name}_${saveInd.pane_id || 'candle_pane'}`;
    indicatorsMap.set(compositeKey, savedIndicator);
  });
  
  // STEP 2: Get actual indicators from chart and ensure they're all included
  // This is critical: even if saveInds is incomplete, we save ALL indicators on the chart
  if (chart) {
    try {
      const chartIndicators = (chart.getIndicators?.() ?? []) as Array<{ 
        name: string; 
        paneId?: string;
        [key: string]: any;
      }>;
      
      console.log('📊 Collecting indicators from chart:', chartIndicators.length, 'found');
      
      chartIndicators.forEach((chartInd) => {
        if (!chartInd.name) return;
        
        const paneId = chartInd.paneId || 'candle_pane';
        const compositeKey = `${chartInd.name}_${paneId}`;
        
        // If we already have this indicator from saveInds, keep that (has more complete data)
        if (indicatorsMap.has(compositeKey)) {
          console.log(`✅ Indicator ${chartInd.name} (${paneId}) already in saveInds`);
          return;
        }
        
        // Indicator exists on chart but not in saveInds - try to find matching saveInd by name+paneId
        console.log(`⚠️ Indicator ${chartInd.name} (${paneId}) on chart but not in saveInds`);
        
        // Try to find a matching saveInd entry by searching all saveInds keys
        let matchingSaveInd: SaveInd | null = null;
        let matchingKey: string | null = null;
        
        for (const [key, saveInd] of Object.entries(save.saveInds)) {
          if (saveInd.name === chartInd.name && 
              (saveInd.pane_id === paneId || (!saveInd.pane_id && paneId === 'candle_pane'))) {
            matchingSaveInd = saveInd;
            matchingKey = key;
            break;
          }
        }
        
        // If we found a matching saveInd, use it (might have different key format)
        if (matchingSaveInd && matchingKey) {
          console.log(`✅ Found matching saveInd for ${chartInd.name} with key: ${matchingKey}`);
          
          // Convert the matching saveInd to SavedIndicator format
          const paramsObj: Record<string, any> = {};
          if (matchingSaveInd.params && Array.isArray(matchingSaveInd.params)) {
            matchingSaveInd.params.forEach((param, index) => {
              paramsObj[`param_${index}`] = param;
            });
          }
          
          const stylesObj: Record<string, any> = {};
          if (matchingSaveInd.styles && Array.isArray(matchingSaveInd.styles)) {
            matchingSaveInd.styles.forEach((style, index) => {
              stylesObj[`style_${index}`] = style;
            });
          } else if (matchingSaveInd.styles && typeof matchingSaveInd.styles === 'object') {
            Object.assign(stylesObj, matchingSaveInd.styles);
          }
          
          const savedIndicator: SavedIndicator = {
            id: matchingKey, // Use the original key
            type: matchingSaveInd.name,
            params: paramsObj,
            styles: stylesObj,
            paneId: matchingSaveInd.pane_id || paneId,
            visible: true,
            ...Object.fromEntries(
              Object.entries(matchingSaveInd).filter(([k]) => 
                !['name', 'pane_id', 'params', 'styles'].includes(k)
              )
            )
          };
          
          indicatorsMap.set(compositeKey, savedIndicator);
        } else {
          // No matching saveInd found - create basic entry (params/styles might be missing)
          console.log(`⚠️ No matching saveInd found for ${chartInd.name}, creating basic entry`);
          
          const newKey = `${paneId}_${chartInd.name}`;
          
          const savedIndicator: SavedIndicator = {
            id: newKey,
            type: chartInd.name,
            params: undefined, // Will use defaults when loading
            styles: undefined, // Will use defaults when loading
            paneId: paneId,
            visible: true
          };
          
          indicatorsMap.set(compositeKey, savedIndicator);
        }
      });
    } catch (error) {
      console.warn('⚠️ Failed to get indicators from chart, using saveInds only:', error);
    }
  }
  
  // Convert map to array
  indicators.push(...Array.from(indicatorsMap.values()));
  
  console.log(`✅ Collected ${indicators.length} indicators for saving (${Object.keys(save.saveInds).length} from saveInds, ${indicators.length - Object.keys(save.saveInds).length} from chart)`);

  return {
    timezone: save.timezone,
    interval: save.period.timeframe,
    chartType: save.styles?.candle?.type || 'candle_solid',
    theme: save.theme,
    panes,
    indicators,
    styles: save.styles || {},
    options: save.options || {}
  };
}

/**
 * Collect drawings/overlays for a specific symbol
 */
export function collectDrawings(
  symbol: SymbolInfo,
  period: Period,
  overlaysStore: Record<string, Record<string, unknown>>
): Drawing[] {
  const drawings: Drawing[] = [];
  const symbolKey = normalizeSymbolKey(symbol);
  
  // Create overlay key prefix for current symbol and timeframe
  const symbolName = symbol.shortName ?? symbol.name ?? symbol.ticker;
  const overlayPrefix = `${symbolName}_${period.timeframe}_`;
  
  try {
    // Iterate through stored overlays
    Object.entries(overlaysStore).forEach(([key, overlayData]) => {
      if (key.startsWith(overlayPrefix)) {
        // Extract overlay ID from key
        const overlayId = key.replace(overlayPrefix, '');
        
        // Convert overlay data to Drawing format with symbolKey
        const drawing = convertOverlayToDrawing(overlayId, overlayData, symbolKey);
        if (drawing) {
          drawings.push(drawing);
        }
      }
    });
  } catch (error) {
    console.warn('Error collecting drawings for symbol:', symbolKey, error);
  }
  
  return drawings;
}

/**
 * Convert overlay data to Drawing format
 */
function convertOverlayToDrawing(
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
          if (point.timestamp && point.value) {
            points.push({ time: point.timestamp, price: point.value });
          } else if (point.time && point.price) {
            points.push({ time: point.time, price: point.price });
          } else if (point.t && point.p) {
            points.push({ time: point.t, price: point.p });
          }
        }
      });
    }
    
    // Only include drawings with valid data coordinates
    if (points.length === 0) {
      console.warn('Overlay has no valid data coordinates:', overlayId);
      return null;
    }
    
    return {
      id: overlayId,
      symbolKey, // MANDATORY: assign symbolKey to ensure symbol-specific isolation
      type: (overlayData.name as string) || 'unknown',
      points,
      styles: (overlayData.styles as Record<string, any>) || {},
      locked: Boolean(overlayData.lock),
      visible: overlayData.visible !== false,
      // Include any additional properties (but not symbolKey from overlayData to avoid conflicts)
      ...Object.fromEntries(
        Object.entries(overlayData).filter(([k]) => 
          !['name', 'points', 'styles', 'lock', 'visible', 'symbolKey'].includes(k)
        )
      )
    };
  } catch (error) {
    console.warn('Error converting overlay to drawing:', overlayId, error);
    return null;
  }
}

/**
 * Apply global chart state to the chart
 */
export async function applyGlobalState(
  globalState: GlobalChartState,
  save: Writable<ChartSave>,
  chart: Chart | null
): Promise<void> {
  try {
    console.log('🔄 Applying global state:', globalState);
    
    // HARD RESET: clear **all** existing indicators from the chart
    // This avoids any chance of indicators from previous layouts stacking
    if (chart) {
      try {
        // Empty filter -> remove all indicators on all panes
        (chart as any).removeIndicator({});
        console.log('🧹 Removed all existing indicators before applying new layout');
      } catch (error) {
        console.warn('Failed to clear existing indicators before applying layout:', error);
      }
    }
    
    // Prepare new indicators data
    const newSaveInds: Record<string, SaveInd> = {};
    
    // Apply indicators
    globalState.indicators.forEach(indicator => {
      // Convert params object back to array format
      const paramsArray: any[] = [];
      if (indicator.params && typeof indicator.params === 'object') {
        Object.entries(indicator.params).forEach(([key, value]) => {
          if (key.startsWith('param_')) {
            const index = parseInt(key.replace('param_', ''));
            paramsArray[index] = value;
          }
        });
      }
      
      // Convert styles object back to array format
      const stylesArray: {color: string, thickness: number, lineStyle: string}[] = [];
      if (indicator.styles && typeof indicator.styles === 'object') {
        Object.entries(indicator.styles).forEach(([key, value]) => {
          if (key.startsWith('style_') && typeof value === 'object') {
            const index = parseInt(key.replace('style_', ''));
            stylesArray[index] = value as {color: string, thickness: number, lineStyle: string};
          }
        });
      }
      
      const saveInd: SaveInd = {
        name: indicator.type,
        pane_id: indicator.paneId,
        params: paramsArray.length > 0 ? paramsArray : undefined,
        styles: stylesArray.length > 0 ? stylesArray : undefined,
        // Include any additional properties
        ...Object.fromEntries(
          Object.entries(indicator).filter(([k]) => 
            !['id', 'type', 'paneId', 'params', 'styles', 'visible'].includes(k)
          )
        )
      };
      
      newSaveInds[indicator.id] = saveInd;
    });
    
    // Update the save store using update method for proper reactivity
    save.update(s => {
      // Apply global state to save
      s.timezone = globalState.timezone;
      s.period = {
        ...s.period,
        timeframe: globalState.interval
      };
      // Preserve current user-selected theme; do not override from layout loads
      // But when loading a layout, completely replace styles/options so the new
      // layout does NOT stack on top of the previous one.
      
      // Replace styles (canvas/candle/grid colors etc.) from saved layout
      s.styles = globalState.styles && typeof globalState.styles === 'object'
        ? { ...globalState.styles }
        : {};
      
      // Ensure chart type is exactly what the layout specifies
      if (!s.styles.candle) s.styles.candle = {};
      s.styles.candle.type = globalState.chartType;
      
      // Replace options with layout options (no merging with previous layout)
      s.options = globalState.options && typeof globalState.options === 'object'
        ? { ...globalState.options }
        : {};
      
      // Replace saveInds completely
      s.saveInds = newSaveInds;
      
      return s;
    });
    
    // Apply saved styles to the chart so colors take effect immediately
    if (chart) {
      try {
        const currentSave = get(save);
        if ((chart as any).setStyles && currentSave.styles) {
          (chart as any).setStyles(currentSave.styles);
          console.log('🎨 Applied saved styles to chart');
        }
      } catch (e) {
        console.warn('Failed to apply saved styles to chart:', e);
      }
    }
    
    // Create indicators on the chart
    if (chart && globalState.indicators.length > 0) {
      console.log('Creating indicators on chart:', globalState.indicators.length);
      
      for (const indicator of globalState.indicators) {
        try {
          // Convert params object back to array format
          const paramsArray: any[] = [];
          if (indicator.params && typeof indicator.params === 'object') {
            Object.entries(indicator.params).forEach(([key, value]) => {
              if (key.startsWith('param_')) {
                const index = parseInt(key.replace('param_', ''));
                paramsArray[index] = value;
              }
            });
          }
          
          // Convert styles object back to array format
          const stylesArray: {color: string, thickness: number, lineStyle: string}[] = [];
          if (indicator.styles && typeof indicator.styles === 'object') {
            Object.entries(indicator.styles).forEach(([key, value]) => {
              if (key.startsWith('style_') && typeof value === 'object') {
                const index = parseInt(key.replace('style_', ''));
                stylesArray[index] = value as {color: string, thickness: number, lineStyle: string};
              }
            });
          }
          
          // Create indicator configuration
          const indicatorConfig: any = {
            name: indicator.type,
            calcParams: paramsArray.length > 0 ? paramsArray : undefined,
            visible: indicator.visible !== false
          };
          
          // Map saved generic styles (color/thickness/lineStyle) to klinecharts style schema
          if (stylesArray.length > 0) {
            indicatorConfig.styles = {
              lines: stylesArray.map((s) => {
                const isDashed = s.lineStyle === 'dashed' || s.lineStyle === 'dotted';
                const dashedValue = s.lineStyle === 'dotted' ? [2, 2] : [4, 4];
                return {
                  color: s.color,
                  size: s.thickness ?? 1,
                  style: isDashed ? kc.LineType.Dashed : kc.LineType.Solid,
                  dashedValue: isDashed ? dashedValue : [2, 2]
                };
              })
            };
          }
          
          // Special handling for SUPERTREND (Smart Trend) which uses extendData to style segments
          if (indicator.type === 'SUPERTREND') {
            const group: any = (indicator as any).superTrendGroup;
            // Build extendData from saved group if present, otherwise use dashed defaults
            const extend = group ? {
              showLabels: Boolean(group.showLabels),
              uptrendColor: group.styles?.uptrend?.color ?? '#00FF00',
              downtrendColor: group.styles?.downtrend?.color ?? '#FF0000',
              uptrendThickness: group.styles?.uptrend?.thickness ?? 1,
              downtrendThickness: group.styles?.downtrend?.thickness ?? 1,
              uptrendLineStyle: group.styles?.uptrend?.lineStyle ?? 'dashed',
              downtrendLineStyle: group.styles?.downtrend?.lineStyle ?? 'dashed'
            } : {
              showLabels: true,
              uptrendColor: '#00FF00',
              downtrendColor: '#FF0000',
              uptrendThickness: 1,
              downtrendThickness: 1,
              uptrendLineStyle: 'dashed',
              downtrendLineStyle: 'dashed'
            };
            indicatorConfig.extendData = extend;
            // Ensure base line style matches intended uptrend default if no explicit styles were saved
            if (!indicatorConfig.styles) {
              const upDashed = extend.uptrendLineStyle === 'dotted' || extend.uptrendLineStyle === 'dashed';
              indicatorConfig.styles = {
                lines: [{
                  color: extend.uptrendColor,
                  size: extend.uptrendThickness,
                  style: upDashed ? kc.LineType.Dashed : kc.LineType.Solid,
                  dashedValue: extend.uptrendLineStyle === 'dotted' ? [2, 2] : [4, 4]
                }]
              };
            }
          }
          
          // Determine if this should be stacked (true for main panel, false for sub-panels)
          const isStack = indicator.paneId === 'candle_pane';
          
          // Create the indicator on the chart
          const createdIndicatorId = chart.createIndicator(indicatorConfig, isStack, {
            id: indicator.paneId
          });
          
          console.log(`Created indicator ${indicator.type} with ID:`, createdIndicatorId);
        } catch (error) {
          console.error(`Failed to create indicator ${indicator.type}:`, error);
        }
      }
    }
    
    console.log('Applied global state:', {
      timezone: globalState.timezone,
      interval: globalState.interval,
      chartType: globalState.chartType,
      theme: globalState.theme,
      indicatorCount: globalState.indicators.length,
      indicatorsCreated: chart ? globalState.indicators.length : 0
    });
  } catch (error) {
    console.error('Error applying global state:', error);
    throw error;
  }
}

/**
 * Clear all drawings from overlays store for current symbol
 */
export function clearAllDrawings(
  symbol: SymbolInfo,
  period: Period,
  overlaysStore: any
): void {
  try {
    const symbolName = symbol.shortName ?? symbol.name ?? symbol.ticker;
    const overlayPrefix = `${symbolName}_${period.timeframe}_`;
    
    overlaysStore.update((ol: Record<string, unknown>) => {
      const keysToDelete = Object.keys(ol).filter(key => key.startsWith(overlayPrefix));
      keysToDelete.forEach(key => delete ol[key]);
      return ol;
    });
    
    console.log('Cleared drawings for symbol:', normalizeSymbolKey(symbol));
  } catch (error) {
    console.error('Error clearing drawings:', error);
  }
}

/**
 * Render drawings for current symbol
 */
export function renderDrawings(
  drawings: Drawing[],
  symbol: SymbolInfo,
  period: Period,
  chart: Chart | null,
  overlaysStore: any
): void {
  if (!chart || drawings.length === 0) return;
  
  try {
    const symbolKey = normalizeSymbolKey(symbol);
    const symbolName = symbol.shortName ?? symbol.name ?? symbol.ticker;
    const overlayPrefix = `${symbolName}_${period.timeframe}_`;
    
    // Convert drawings back to overlay format and add to chart
    drawings.forEach(drawing => {
      // HARD GUARD: Verify symbolKey matches current symbol
      if (drawing.symbolKey && drawing.symbolKey !== symbolKey) {
        console.warn('⛔ Drawing symbolKey mismatch, skipping render:', {
          drawingSymbol: drawing.symbolKey,
          currentSymbol: symbolKey,
          drawingId: drawing.id
        });
        return;
      }
      
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
        // Include any additional properties (excluding symbolKey to avoid confusion)
        ...Object.fromEntries(
          Object.entries(drawing).filter(([k]) => 
            !['id', 'symbolKey', 'type', 'points', 'styles', 'locked', 'visible', 'seriesId'].includes(k)
          )
        )
      };
      
      // Add to chart
      try {
        chart.createOverlay(overlayData);
      } catch (overlayError) {
        console.warn('Failed to create overlay:', drawing.id, overlayError);
      }
      
      // Store in overlays store
      const overlayKey = `${overlayPrefix}${drawing.id}`;
      overlaysStore.update((ol: Record<string, unknown>) => {
        ol[overlayKey] = overlayData;
        return ol;
      });
    });
    
    console.log('Rendered drawings for symbol:', symbolKey, 'count:', drawings.length);
  } catch (error) {
    console.error('Error rendering drawings:', error);
  }
}

/**
 * Get current symbol from save store
 */
export function getCurrentSymbol(save: ChartSave): SymbolKey {
  return normalizeSymbolKey(save.symbol);
}