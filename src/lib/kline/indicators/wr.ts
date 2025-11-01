import type { IndicatorTemplate, KLineData, IndicatorFigure, IndicatorStyle } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * Advanced Williams %R (Williams Percentage Range) Indicator
 * TradingView-like implementation with triangle fill areas, editable levels, and multi-instance support
 * 
 * Features:
 * - Triangle fill areas for overbought/oversold zones
 * - Editable horizontal levels with add/remove functionality
 * - Y-axis synchronization showing WR levels
 * - Real-time editing with live preview
 * - Multi-instance management with unique IDs
 * - Customizable styling for all elements
 * 
 * Formula: %R = (Highest High - Close) / (Highest High - Lowest Low) * -100
 * Range: -100 to 0 (inverted from RSI's 0 to 100)
 */

interface WRLevel {
  id: string;
  value: number;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  thickness: number;
  label: string;
  visible: boolean;
}

interface WRZone {
  id: string;
  topLevel: number;
  bottomLevel: number;
  fillColor: string;
  fillOpacity: number;
  visible: boolean;
  type: 'overbought' | 'oversold' | 'custom';
}

interface WRInstance {
  id: string;
  period: number;
  levels: WRLevel[];
  zones: WRZone[];
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

// Global store for WR instances
const wrInstances = new Map<string, WRInstance>();

// Default WR configuration
const createDefaultWRInstance = (id: string): WRInstance => ({
  id,
  period: 14,
  lineColor: '#2563eb',
  lineThickness: 1,
  lineStyle: 'solid',
  showLevels: true,
  showZones: true,
  yAxisSync: true,
  // Dynamic coloring defaults
  enableDynamicColoring: true,
  overboughtColor: '#EF4444',
  oversoldColor: '#10B981',
  overboughtThreshold: -20,
  oversoldThreshold: -80,
  levels: [
    {
      id: 'overbought',
      value: -20,
      color: '#EF4444',
      lineStyle: 'solid',
      thickness: 1,
      label: 'Overbought',
      visible: true
    },
    {
      id: 'middle',
      value: -50,
      color: '#6B7280',
      lineStyle: 'dashed',
      thickness: 1,
      label: 'Middle',
      visible: true
    },
    {
      id: 'oversold',
      value: -80,
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
      topLevel: 0,
      bottomLevel: -20,
      fillColor: '#EF4444',
      fillOpacity: 0.1,
      visible: true,
      type: 'overbought'
    },
    {
      id: 'oversold_zone',
      topLevel: -80,
      bottomLevel: -100,
      fillColor: '#10B981',
      fillOpacity: 0.1,
      visible: true,
      type: 'oversold'
    }
  ]
});

// Williams %R calculation function
const calculateWR = (dataList: KLineData[], period: number): number[] => {
  const result: number[] = [];
  
  if (dataList.length < period) {
    return dataList.map(() => NaN);
  }

  for (let i = 0; i < dataList.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    // Find highest high and lowest low over the period
    let highestHigh = dataList[i - period + 1].high;
    let lowestLow = dataList[i - period + 1].low;
    
    for (let j = i - period + 2; j <= i; j++) {
      if (dataList[j].high > highestHigh) {
        highestHigh = dataList[j].high;
      }
      if (dataList[j].low < lowestLow) {
        lowestLow = dataList[j].low;
      }
    }
    
    // Calculate Williams %R: ((Highest High - Close) / (Highest High - Lowest Low)) * -100
    const currentClose = dataList[i].close;
    const wr = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    
    result.push(isNaN(wr) ? 0 : wr);
  }

  return result;
};

export const wr: IndicatorTemplate = {
  name: 'WR',
  shortName: 'WR',
  precision: 2,
  calcParams: [14], // Default period
  shouldOhlc: false, // WR is displayed in a separate pane
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  minValue: -100,
  maxValue: 0,
  figures: [
    {
      key: 'wr',
      title: 'WR: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#2563eb',
        size: 1,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const period = (indicator.calcParams[0] as number) || 14;
    const wrValues = calculateWR(dataList, period);
    
    return wrValues.map(value => ({
      wr: isNaN(value) ? null : value
    }));
  },
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    const instanceId = (indicator as any).paneId || 'default';
    let instance = wrInstances.get(instanceId);
    
    if (!instance) {
      instance = createDefaultWRInstance(instanceId);
      wrInstances.set(instanceId, instance);
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

        ctx.beginPath();
        ctx.moveTo(left, levelY);
        ctx.lineTo(left + width, levelY);
        ctx.stroke();

        // Draw level labels on the right side
        if (instance.yAxisSync) {
          ctx.font = '11px Arial';
          ctx.textAlign = 'left';
          ctx.fillStyle = level.color;
          ctx.fillText(`WR ${level.value}`, left + width + 5, levelY + 4);
        }

        ctx.restore();
      });
    }

    // Draw dynamic coloring for the WR line if enabled
    if (instance.enableDynamicColoring && indicator.result) {
      const { from, to } = visibleRange;
      
      for (let i = from; i < to; i++) {
        const dataIndex = i;
        if (dataIndex >= 0 && dataIndex < indicator.result.length) {
          const wrValue = (indicator.result[dataIndex] as any)?.wr;
          if (wrValue !== null && wrValue !== undefined) {
            const x = xAxis.convertToPixel(i);
            const y = yAxis.convertToPixel(wrValue);
            
            if (x !== null && y !== null) {
              ctx.save();
              
              // Determine color based on WR value
              let pointColor = instance.lineColor;
              if (wrValue > instance.overboughtThreshold) {
                pointColor = instance.overboughtColor;
              } else if (wrValue < instance.oversoldThreshold) {
                pointColor = instance.oversoldColor;
              }
              
              ctx.fillStyle = pointColor;
              ctx.beginPath();
              ctx.arc(x, y, 1, 0, 2 * Math.PI);
              ctx.fill();
              
              ctx.restore();
            }
          }
        }
      }
    }

    ctx.restore();

    // Return false to let the default drawing continue for the Williams %R line
    return false;
  }
};

// Export utility functions for managing WR instances
export const WRManager = {
  createInstance: (id: string, config?: Partial<WRInstance>): WRInstance => {
    const instance = createDefaultWRInstance(id);
    if (config) {
      Object.assign(instance, config);
    }
    wrInstances.set(id, instance);
    return instance;
  },

  getInstance: (id: string): WRInstance | undefined => {
    return wrInstances.get(id);
  },

  updateInstance: (id: string, updates: Partial<WRInstance>): boolean => {
    const instance = wrInstances.get(id);
    if (!instance) return false;
    
    Object.assign(instance, updates);
    wrInstances.set(id, instance);
    return true;
  },

  deleteInstance: (id: string): boolean => {
    return wrInstances.delete(id);
  },

  addLevel: (instanceId: string, level: Omit<WRLevel, 'id'>): string => {
    const instance = wrInstances.get(instanceId);
    if (!instance) throw new Error(`WR instance ${instanceId} not found`);
    
    const levelId = `level_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newLevel: WRLevel = { 
      ...level, 
      id: levelId,
      value: Math.max(-100, Math.min(0, level.value)) // Clamp between -100 to 0
    };
    instance.levels.push(newLevel);
    
    return levelId;
  },

  removeLevel: (instanceId: string, levelId: string): boolean => {
    const instance = wrInstances.get(instanceId);
    if (!instance) return false;
    
    const index = instance.levels.findIndex(level => level.id === levelId);
    if (index === -1) return false;
    
    instance.levels.splice(index, 1);
    return true;
  },

  updateLevel: (instanceId: string, levelId: string, updates: Partial<WRLevel>): boolean => {
    const instance = wrInstances.get(instanceId);
    if (!instance) return false;
    
    const level = instance.levels.find(l => l.id === levelId);
    if (!level) return false;
    
    // Validate value if being updated
    if (updates.value !== undefined) {
      updates.value = Math.max(-100, Math.min(0, updates.value));
    }
    
    // Validate thickness
    if (updates.thickness !== undefined) {
      updates.thickness = Math.max(1, Math.min(5, updates.thickness));
    }
    
    Object.assign(level, updates);
    return true;
  },

  addZone: (instanceId: string, zone: Omit<WRZone, 'id'>): string => {
    const instance = wrInstances.get(instanceId);
    if (!instance) throw new Error(`WR instance ${instanceId} not found`);
    
    // Ensure proper order and clamping for WR range (-100 to 0)
    const top = Math.max(-100, Math.min(0, Math.max(zone.topLevel, zone.bottomLevel)));
    const bottom = Math.max(-100, Math.min(0, Math.min(zone.topLevel, zone.bottomLevel)));
    
    const zoneId = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newZone: WRZone = { 
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
    const instance = wrInstances.get(instanceId);
    if (!instance) return false;
    
    const index = instance.zones.findIndex(zone => zone.id === zoneId);
    if (index === -1) return false;
    
    instance.zones.splice(index, 1);
    return true;
  },

  updateZone: (instanceId: string, zoneId: string, updates: Partial<WRZone>): boolean => {
    const instance = wrInstances.get(instanceId);
    if (!instance) return false;
    
    const zone = instance.zones.find(z => z.id === zoneId);
    if (!zone) return false;
    
    // Validate levels if being updated (WR range: -100 to 0)
    if (updates.topLevel !== undefined) {
      updates.topLevel = Math.max(-100, Math.min(0, updates.topLevel));
    }
    if (updates.bottomLevel !== undefined) {
      updates.bottomLevel = Math.max(-100, Math.min(0, updates.bottomLevel));
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

  getInstanceConfig: (instanceId: string): WRInstance | null => {
    return wrInstances.get(instanceId) || null;
  },

  resetInstance: (instanceId: string): void => {
    const defaultInstance = createDefaultWRInstance(instanceId);
    wrInstances.set(instanceId, defaultInstance);
  },

  exportInstanceConfig: (instanceId: string): any => {
    const instance = wrInstances.get(instanceId);
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
      const instance: WRInstance = {
        id: config.id,
        period: config.period || 14,
        lineColor: config.lineColor || '#FF6B35',
        lineThickness: config.lineThickness || 2,
        lineStyle: config.lineStyle || 'solid',
        showLevels: config.showLevels ?? true,
        showZones: config.showZones ?? true,
        yAxisSync: config.yAxisSync ?? true,
        enableDynamicColoring: config.enableDynamicColoring ?? true,
        overboughtColor: config.overboughtColor || '#EF4444',
        oversoldColor: config.oversoldColor || '#10B981',
        overboughtThreshold: config.overboughtThreshold || -20,
        oversoldThreshold: config.oversoldThreshold || -80,
        levels: config.levels || [],
        zones: config.zones || []
      };
      
      wrInstances.set(config.id, instance);
      return true;
    } catch (error) {
      console.error('Failed to import WR instance config:', error);
      return false;
    }
  },

  getAllInstances: (): Map<string, WRInstance> => {
    return new Map(wrInstances);
  },

  clearAllInstances: (): void => {
    wrInstances.clear();
  }
};

export default wr;