import type { IndicatorTemplate, KLineData, IndicatorFigure, IndicatorStyle } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * Advanced RSI (Relative Strength Index) Indicator
 * TradingView-like implementation with triangle fill areas, editable levels, and multi-instance support
 * 
 * Features:
 * - Triangle fill areas for overbought/oversold zones
 * - Editable horizontal levels with add/remove functionality
 * - Y-axis synchronization showing RSI levels
 * - Real-time editing with live preview
 * - Multi-instance management with unique IDs
 * - Customizable styling for all elements
 * 
 * Formula: RSI = 100 - (100 / (1 + RS))
 * Where RS = Average Gain / Average Loss over the specified period
 */

interface RSILevel {
  id: string;
  value: number;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  thickness: number;
  label: string;
  visible: boolean;
}

interface RSIZone {
  id: string;
  topLevel: number;
  bottomLevel: number;
  fillColor: string;
  fillOpacity: number;
  visible: boolean;
  type: 'overbought' | 'oversold' | 'custom';
}

interface RSIInstance {
  id: string;
  period: number;
  levels: RSILevel[];
  zones: RSIZone[];
  lineColor: string;
  lineThickness: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  showLevels: boolean;
  showZones: boolean;
  yAxisSync: boolean;
  // Dynamic coloring options
  enableDynamicColoring: boolean;
  overboughtColor: string;
  oversoldColor: string;
  overboughtThreshold: number;
  oversoldThreshold: number;
}

// Global store for RSI instances
const rsiInstances = new Map<string, RSIInstance>();

// Default RSI configuration
const createDefaultRSIInstance = (id: string): RSIInstance => ({
  id,
  period: 14,
  lineColor: '#8B5CF6',
  lineThickness: 2,
  lineStyle: 'solid',
  showLevels: true,
  showZones: true,
  yAxisSync: true,
  // Dynamic coloring defaults
  enableDynamicColoring: true,
  overboughtColor: '#EF4444',
  oversoldColor: '#10B981',
  overboughtThreshold: 70,
  oversoldThreshold: 30,
  levels: [
    {
      id: 'overbought',
      value: 70,
      color: '#EF4444',
      lineStyle: 'solid',
      thickness: 1,
      label: 'Overbought',
      visible: true
    },
    {
      id: 'middle',
      value: 50,
      color: '#6B7280',
      lineStyle: 'dashed',
      thickness: 1,
      label: 'Middle',
      visible: true
    },
    {
      id: 'oversold',
      value: 30,
      color: '#10B981',
      lineStyle: 'solid',
      thickness: 1,
      label: 'Oversold',
      visible: true
    }
  ],
  zones: [
    {
      id: 'overbought_zone',
      topLevel: 100,
      bottomLevel: 70,
      fillColor: '#EF4444',
      fillOpacity: 0.1,
      visible: true,
      type: 'overbought'
    },
    {
      id: 'oversold_zone',
      topLevel: 30,
      bottomLevel: 0,
      fillColor: '#10B981',
      fillOpacity: 0.1,
      visible: true,
      type: 'oversold'
    }
  ]
});

// RSI calculation function
const calculateRSI = (dataList: KLineData[], period: number): number[] => {
  const result: number[] = [];
  
  if (dataList.length < period + 1) {
    return dataList.map(() => NaN);
  }

  let gains: number[] = [];
  let losses: number[] = [];

  // Calculate initial gains and losses
  for (let i = 1; i <= period; i++) {
    const change = dataList[i].close - dataList[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calculate initial averages
  let avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period;

  // Fill initial NaN values
  for (let i = 0; i < period; i++) {
    result.push(NaN);
  }

  // Calculate RSI for the first valid point
  let rs = avgGain / (avgLoss || 1);
  let rsi = 100 - (100 / (1 + rs));
  result.push(rsi);

  // Calculate RSI for remaining points using smoothed averages
  for (let i = period + 1; i < dataList.length; i++) {
    const change = dataList[i].close - dataList[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    // Smoothed averages (Wilder's smoothing)
    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;

    rs = avgGain / (avgLoss || 1);
    rsi = 100 - (100 / (1 + rs));
    result.push(rsi);
  }

  return result;
};

export const rsi: IndicatorTemplate = {
  name: 'RSI',
  shortName: 'RSI',
  precision: 2,
  calcParams: [14], // Default period
  shouldOhlc: false, // RSI is displayed in a separate pane
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  minValue: 0,
  maxValue: 100,
  figures: [
    {
      key: 'rsi',
      title: 'RSI: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#8B5CF6',
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const period = (indicator.calcParams[0] as number) || 14;
    const rsiValues = calculateRSI(dataList, period);
    
    return rsiValues.map(value => ({
      rsi: isNaN(value) ? null : value
    }));
  },
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    const instanceId = (indicator as any).paneId || 'default';
    let instance = rsiInstances.get(instanceId);
    
    if (!instance) {
      instance = createDefaultRSIInstance(instanceId);
      rsiInstances.set(instanceId, instance);
    }

    const { left, top, width, height } = bounding;
    const visibleRange = chart.getVisibleRange();
    
    ctx.save();
    
    // Draw zones (triangle fill areas) with TradingView-like styling
    if (instance.showZones) {
      instance.zones.forEach(zone => {
        if (!zone.visible) return;
        
        const topY = yAxis.convertToPixel(zone.topLevel);
        const bottomY = yAxis.convertToPixel(zone.bottomLevel);
        
        if (topY !== null && bottomY !== null) {
          ctx.save();
          
          const zoneHeight = Math.abs(topY - bottomY);
          const zoneTop = Math.min(topY, bottomY);
          
          // Create sophisticated gradient for triangle fill effect
          const gradient = ctx.createLinearGradient(left, zoneTop, left, zoneTop + zoneHeight);
          
          // Parse color and create variations
          const baseColor = zone.fillColor;
          const rgb = baseColor.match(/\w\w/g);
          if (rgb) {
            const r = parseInt(rgb[0], 16);
            const g = parseInt(rgb[1], 16);
            const b = parseInt(rgb[2], 16);
            
            // Create gradient stops for triangle effect
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${zone.fillOpacity * 0.8})`);
            gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${zone.fillOpacity * 0.6})`);
            gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${zone.fillOpacity * 0.3})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${zone.fillOpacity * 0.1})`);
          } else {
            // Fallback gradient
            gradient.addColorStop(0, zone.fillColor + Math.floor(zone.fillOpacity * 255).toString(16).padStart(2, '0'));
            gradient.addColorStop(0.5, zone.fillColor + Math.floor(zone.fillOpacity * 128).toString(16).padStart(2, '0'));
            gradient.addColorStop(1, zone.fillColor + Math.floor(zone.fillOpacity * 32).toString(16).padStart(2, '0'));
          }
          
          ctx.fillStyle = gradient;
          ctx.fillRect(left, zoneTop, width, zoneHeight);
          
          // Add subtle border for better definition
          ctx.strokeStyle = zone.fillColor + '40'; // 25% opacity border
          ctx.lineWidth = 0.5;
          ctx.strokeRect(left, zoneTop, width, zoneHeight);
          
          ctx.restore();
        }
      });
    }

    // Draw horizontal levels
    if (instance.showLevels) {
      instance.levels.forEach(level => {
        if (!level.visible) return;
        
        const levelY = yAxis.convertToPixel(level.value);
        if (levelY === null) return;

        ctx.save();
        ctx.strokeStyle = level.color;
        ctx.lineWidth = level.thickness;
        
        // Set line style
        if (level.lineStyle === 'dashed') {
          ctx.setLineDash([4, 4]);
        } else if (level.lineStyle === 'dotted') {
          ctx.setLineDash([2, 2]);
        } else {
          ctx.setLineDash([]);
        }

        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(left, levelY);
        ctx.lineTo(left + width, levelY);
        ctx.stroke();

        // Draw level label
        ctx.fillStyle = level.color;
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${level.value}`, left + 5, levelY - 3);
        
        ctx.restore();
      });
    }

    // Draw dynamic colored RSI line based on overbought/oversold zones
    if (indicator.result && indicator.result.length > 0 && instance.enableDynamicColoring) {
      ctx.save();
      
      const overboughtLevel = instance.overboughtThreshold;
      const oversoldLevel = instance.oversoldThreshold;
      const normalColor = instance.lineColor;
      const overboughtColor = instance.overboughtColor;
      const oversoldColor = instance.oversoldColor;
      
      ctx.lineWidth = instance.lineThickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Draw RSI line with dynamic coloring
      const rsiResults = indicator.result as Array<{ rsi?: number | null }>;
      for (let i = visibleRange.from; i < visibleRange.to && i < rsiResults.length - 1; i++) {
        const currentData = rsiResults[i];
        const nextData = rsiResults[i + 1];
        
        if (!currentData || !nextData || 
            currentData.rsi === null || currentData.rsi === undefined ||
            nextData.rsi === null || nextData.rsi === undefined) {
          continue;
        }
        
        const currentX = xAxis.convertToPixel(i);
        const nextX = xAxis.convertToPixel(i + 1);
        const currentY = yAxis.convertToPixel(currentData.rsi);
        const nextY = yAxis.convertToPixel(nextData.rsi);
        
        if (currentX === null || nextX === null || currentY === null || nextY === null) {
          continue;
        }
        
        // Determine color based on RSI value
        let lineColor = normalColor;
        if (currentData.rsi > overboughtLevel) {
          lineColor = overboughtColor; // Red for overbought
        } else if (currentData.rsi < oversoldLevel) {
          lineColor = oversoldColor;   // Green for oversold
        }
        
        ctx.strokeStyle = lineColor;
        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(nextX, nextY);
        ctx.stroke();
      }
      
      ctx.restore();
      
      ctx.restore();
      
      // Return true to prevent default RSI line drawing since we drew it ourselves
      return true;
    }

    ctx.restore();
    
    // Return false to allow default RSI line drawing when dynamic coloring is disabled
    return false;
  }
};

// Export utility functions for managing RSI instances
export const RSIManager = {
  createInstance: (id: string, config?: Partial<RSIInstance>): RSIInstance => {
    const instance = createDefaultRSIInstance(id);
    if (config) {
      Object.assign(instance, config);
    }
    rsiInstances.set(id, instance);
    return instance;
  },

  getInstance: (id: string): RSIInstance | undefined => {
    return rsiInstances.get(id);
  },

  updateInstance: (id: string, updates: Partial<RSIInstance>): boolean => {
    const instance = rsiInstances.get(id);
    if (!instance) return false;
    
    Object.assign(instance, updates);
    rsiInstances.set(id, instance);
    return true;
  },

  deleteInstance: (id: string): boolean => {
    return rsiInstances.delete(id);
  },

  addLevel: (instanceId: string, level: Omit<RSILevel, 'id'>): string => {
    const instance = rsiInstances.get(instanceId);
    if (!instance) throw new Error(`RSI instance ${instanceId} not found`);
    
    const levelId = `level_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newLevel: RSILevel = { 
      ...level, 
      id: levelId,
      value: Math.max(0, Math.min(100, level.value)) // Clamp between 0-100
    };
    instance.levels.push(newLevel);
    
    return levelId;
  },

  removeLevel: (instanceId: string, levelId: string): boolean => {
    const instance = rsiInstances.get(instanceId);
    if (!instance) return false;
    
    const index = instance.levels.findIndex(level => level.id === levelId);
    if (index === -1) return false;
    
    instance.levels.splice(index, 1);
    return true;
  },

  updateLevel: (instanceId: string, levelId: string, updates: Partial<RSILevel>): boolean => {
    const instance = rsiInstances.get(instanceId);
    if (!instance) return false;
    
    const level = instance.levels.find(l => l.id === levelId);
    if (!level) return false;
    
    // Validate value if being updated
    if (updates.value !== undefined) {
      updates.value = Math.max(0, Math.min(100, updates.value));
    }
    
    // Validate thickness
    if (updates.thickness !== undefined) {
      updates.thickness = Math.max(1, Math.min(5, updates.thickness));
    }
    
    Object.assign(level, updates);
    return true;
  },

  addZone: (instanceId: string, zone: Omit<RSIZone, 'id'>): string => {
    const instance = rsiInstances.get(instanceId);
    if (!instance) throw new Error(`RSI instance ${instanceId} not found`);
    
    // Ensure proper order and clamping
    const top = Math.max(0, Math.min(100, Math.max(zone.topLevel, zone.bottomLevel)));
    const bottom = Math.max(0, Math.min(100, Math.min(zone.topLevel, zone.bottomLevel)));
    
    const zoneId = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newZone: RSIZone = { 
      ...zone, 
      id: zoneId,
      topLevel: top,
      bottomLevel: bottom,
      fillOpacity: Math.max(0, Math.min(1, zone.fillOpacity || 0.15)) // Validate opacity
    };
    instance.zones.push(newZone);
    
    return zoneId;
  },

  removeZone: (instanceId: string, zoneId: string): boolean => {
    const instance = rsiInstances.get(instanceId);
    if (!instance) return false;
    
    const index = instance.zones.findIndex(zone => zone.id === zoneId);
    if (index === -1) return false;
    
    instance.zones.splice(index, 1);
    return true;
  },

  updateZone: (instanceId: string, zoneId: string, updates: Partial<RSIZone>): boolean => {
    const instance = rsiInstances.get(instanceId);
    if (!instance) return false;
    
    const zone = instance.zones.find(z => z.id === zoneId);
    if (!zone) return false;
    
    // Validate levels if being updated
    if (updates.topLevel !== undefined) {
      updates.topLevel = Math.max(0, Math.min(100, updates.topLevel));
    }
    if (updates.bottomLevel !== undefined) {
      updates.bottomLevel = Math.max(0, Math.min(100, updates.bottomLevel));
    }
    
    // Validate opacity
    if (updates.fillOpacity !== undefined) {
      updates.fillOpacity = Math.max(0, Math.min(1, updates.fillOpacity));
    }
    
    Object.assign(zone, updates);
    
    // Ensure proper order after update
    if (zone.topLevel < zone.bottomLevel) {
      const temp = zone.topLevel;
      zone.topLevel = zone.bottomLevel;
      zone.bottomLevel = temp;
    }
    
    return true;
  },

  getInstanceConfig: (instanceId: string): RSIInstance | null => {
    return rsiInstances.get(instanceId) || null;
  },

  resetInstance: (instanceId: string): void => {
    const defaultInstance = createDefaultRSIInstance(instanceId);
    rsiInstances.set(instanceId, defaultInstance);
  },

  exportInstanceConfig: (instanceId: string): any => {
    const instance = rsiInstances.get(instanceId);
    if (instance) {
      return {
        id: instanceId,
        period: instance.period,
        lineColor: instance.lineColor,
        lineThickness: instance.lineThickness,
        lineStyle: instance.lineStyle,
        showLevels: instance.showLevels,
        showZones: instance.showZones,
        yAxisSync: instance.yAxisSync,
        levels: instance.levels.map(level => ({ ...level })),
        zones: instance.zones.map(zone => ({ ...zone }))
      };
    }
    return null;
  },

  importInstanceConfig: (config: any): boolean => {
    try {
      const instance: RSIInstance = {
        id: config.id,
        period: config.period || 14,
        lineColor: config.lineColor || '#8B5CF6',
        lineThickness: config.lineThickness || 2,
        lineStyle: config.lineStyle || 'solid',
        showLevels: config.showLevels ?? true,
        showZones: config.showZones ?? true,
        yAxisSync: config.yAxisSync ?? true,
        enableDynamicColoring: config.enableDynamicColoring ?? true,
        overboughtColor: config.overboughtColor || '#EF4444',
        oversoldColor: config.oversoldColor || '#10B981',
        overboughtThreshold: config.overboughtThreshold || 70,
        oversoldThreshold: config.oversoldThreshold || 30,
        levels: config.levels || [],
        zones: config.zones || []
      };
      
      rsiInstances.set(config.id, instance);
      return true;
    } catch (error) {
      console.error('Failed to import RSI instance config:', error);
      return false;
    }
  },

  getAllInstances: (): Map<string, RSIInstance> => {
    return new Map(rsiInstances);
  },

  clearAllInstances: (): void => {
    rsiInstances.clear();
  }
};

export default rsi;