import type { IndicatorTemplate, KLineData, IndicatorFigure, IndicatorStyle } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * Advanced Stochastic Oscillator Indicator
 * TradingView-like implementation with %K and %D lines, editable levels, and multi-instance support
 * 
 * Features:
 * - %K and %D lines with customizable styling
 * - Editable horizontal levels (overbought/oversold/midline)
 * - Y-axis range 0-100 with proper scaling
 * - Real-time editing with live preview
 * - Multi-instance management with unique IDs
 * - Customizable styling for all elements
 * 
 * Formula: 
 * %K = 100 × [(Close - Lowest Low) ÷ (Highest High - Lowest Low)]
 * %D = SMA of %K over specified period
 */

interface StochasticLevel {
  id: string;
  value: number;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  thickness: number;
  label: string;
  visible: boolean;
}

interface StochasticZone {
  id: string;
  topLevel: number;
  bottomLevel: number;
  fillColor: string;
  fillOpacity: number;
  visible: boolean;
  type: 'overbought' | 'oversold' | 'custom';
}

interface StochasticInstance {
  id: string;
  kPeriod: number;        // %K period (default: 14)
  dPeriod: number;        // %D period (default: 3)
  levels: StochasticLevel[];
  zones: StochasticZone[];
  kLineColor: string;
  kLineThickness: number;
  kLineStyle: 'solid' | 'dashed' | 'dotted';
  dLineColor: string;
  dLineThickness: number;
  dLineStyle: 'solid' | 'dashed' | 'dotted';
  showLevels: boolean;
  showZones: boolean;
  overboughtLevel: number;
  oversoldLevel: number;
  midlineLevel: number;
  showOverbought: boolean;
  showOversold: boolean;
  showMidline: boolean;
}

// Global store for Stochastic instances
const stochasticInstances = new Map<string, StochasticInstance>();

// Default Stochastic configuration
const createDefaultStochasticInstance = (id: string): StochasticInstance => ({
  id,
  kPeriod: 14,
  dPeriod: 3,
  kLineColor: '#1E90FF',      // Blue for %K
  kLineThickness: 2,
  kLineStyle: 'solid',
  dLineColor: '#FF1493',      // Pink for %D
  dLineThickness: 2,
  dLineStyle: 'dashed',
  showLevels: true,
  showZones: true,
  overboughtLevel: 80,
  oversoldLevel: 20,
  midlineLevel: 50,
  showOverbought: true,
  showOversold: true,
  showMidline: false,
  levels: [
    {
      id: 'overbought',
      value: 80,
      color: '#EF4444',
      lineStyle: 'dashed',
      thickness: 1,
      label: 'Overbought',
      visible: true
    },
    {
      id: 'oversold',
      value: 20,
      color: '#10B981',
      lineStyle: 'dashed',
      thickness: 1,
      label: 'Oversold',
      visible: true
    },
    {
      id: 'midline',
      value: 50,
      color: '#6B7280',
      lineStyle: 'dotted',
      thickness: 1,
      label: 'Midline',
      visible: false
    }
  ],
  zones: [
    {
      id: 'overbought_zone',
      topLevel: 100,
      bottomLevel: 80,
      fillColor: '#EF4444',
      fillOpacity: 0.1,
      visible: true,
      type: 'overbought'
    },
    {
      id: 'oversold_zone',
      topLevel: 20,
      bottomLevel: 0,
      fillColor: '#10B981',
      fillOpacity: 0.1,
      visible: true,
      type: 'oversold'
    }
  ]
});

// Stochastic calculation functions
const calculateStochastic = (dataList: KLineData[], kPeriod: number, dPeriod: number): { k: number[], d: number[] } => {
  const kValues: number[] = [];
  const dValues: number[] = [];
  
  if (dataList.length < kPeriod) {
    return {
      k: dataList.map(() => NaN),
      d: dataList.map(() => NaN)
    };
  }

  // Calculate %K values
  for (let i = 0; i < dataList.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(NaN);
      continue;
    }

    // Find highest high and lowest low over the K period
    let highestHigh = dataList[i - kPeriod + 1].high;
    let lowestLow = dataList[i - kPeriod + 1].low;
    
    for (let j = i - kPeriod + 2; j <= i; j++) {
      if (dataList[j].high > highestHigh) {
        highestHigh = dataList[j].high;
      }
      if (dataList[j].low < lowestLow) {
        lowestLow = dataList[j].low;
      }
    }

    // Calculate %K
    const currentClose = dataList[i].close;
    const range = highestHigh - lowestLow;
    
    if (range === 0) {
      kValues.push(50); // Neutral value when no range
    } else {
      const k = 100 * ((currentClose - lowestLow) / range);
      kValues.push(k);
    }
  }

  // Calculate %D values (SMA of %K)
  for (let i = 0; i < kValues.length; i++) {
    if (i < kPeriod - 1 + dPeriod - 1) {
      dValues.push(NaN);
      continue;
    }

    // Calculate SMA of %K over D period
    let sum = 0;
    let validCount = 0;
    
    for (let j = i - dPeriod + 1; j <= i; j++) {
      if (!isNaN(kValues[j])) {
        sum += kValues[j];
        validCount++;
      }
    }
    
    if (validCount === 0) {
      dValues.push(NaN);
    } else {
      dValues.push(sum / validCount);
    }
  }

  return { k: kValues, d: dValues };
};

export const stochastic: IndicatorTemplate = {
  name: 'STOCH',
  shortName: 'Stoch',
  precision: 2,
  calcParams: [14, 3], // Default K period: 14, D period: 3
  shouldOhlc: false, // Stochastic is displayed in a separate pane
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  minValue: 0,
  maxValue: 100,
  figures: [
    {
      key: 'k',
      title: '%K: ',
      type: 'line'
    },
    {
      key: 'd',
      title: '%D: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#1E90FF',
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [0, 0]
      },
      {
        color: '#FF1493',
        size: 2,
        style: kc.LineType.Dashed,
        smooth: false,
        dashedValue: [4, 4]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const kPeriod = (indicator.calcParams[0] as number) || 14;
    const dPeriod = (indicator.calcParams[1] as number) || 3;
    const { k, d } = calculateStochastic(dataList, kPeriod, dPeriod);
    
    return k.map((kValue, index) => ({
      k: isNaN(kValue) ? null : kValue,
      d: isNaN(d[index]) ? null : d[index]
    }));
  },
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    const instanceId = (indicator as any).paneId || 'default';
    let instance = stochasticInstances.get(instanceId);
    
    if (!instance) {
      instance = createDefaultStochasticInstance(instanceId);
      stochasticInstances.set(instanceId, instance);
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
        
        if (topY !== null && bottomY !== null && 
            isFinite(topY) && isFinite(bottomY) && 
            isFinite(left) && isFinite(width)) {
          ctx.save();
          
          const zoneHeight = Math.abs(topY - bottomY);
          const zoneTop = Math.min(topY, bottomY);
          
          // Validate gradient coordinates are finite
          if (!isFinite(zoneHeight) || !isFinite(zoneTop) || zoneHeight === 0) {
            ctx.restore();
            return;
          }
          
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
        
        const y = yAxis.convertToPixel(level.value);
        
        if (y !== null && isFinite(y) && y >= top && y <= top + height && 
            isFinite(left) && isFinite(width)) {
          ctx.save();
          
          // Set line style
          ctx.strokeStyle = level.color;
          ctx.lineWidth = level.thickness;
          
          if (level.lineStyle === 'dashed') {
            ctx.setLineDash([4, 4]);
          } else if (level.lineStyle === 'dotted') {
            ctx.setLineDash([2, 6]);
          } else {
            ctx.setLineDash([]);
          }
          
          // Draw horizontal line
          ctx.beginPath();
          ctx.moveTo(left, y);
          ctx.lineTo(left + width, y);
          ctx.stroke();
          
          // Draw level label
          ctx.fillStyle = level.color;
          ctx.font = '10px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(`${level.value}`, left + 5, y - 3);
          
          ctx.restore();
        }
      });
    }
    
    ctx.restore();
    return false; // Let klinecharts draw the %K and %D lines
  }
};

// Stochastic Manager for instance management
export const StochasticManager = {
  createInstance: (id: string, config?: Partial<StochasticInstance>): StochasticInstance => {
    const instance = { ...createDefaultStochasticInstance(id), ...config };
    stochasticInstances.set(id, instance);
    return instance;
  },

  getInstance: (id: string): StochasticInstance | undefined => {
    return stochasticInstances.get(id);
  },

  updateInstance: (id: string, updates: Partial<StochasticInstance>): boolean => {
    const instance = stochasticInstances.get(id);
    if (instance) {
      Object.assign(instance, updates);
      return true;
    }
    return false;
  },

  deleteInstance: (id: string): boolean => {
    return stochasticInstances.delete(id);
  },

  addLevel: (instanceId: string, level: Omit<StochasticLevel, 'id'>): string => {
    const instance = stochasticInstances.get(instanceId);
    if (instance) {
      const levelId = `level_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newLevel: StochasticLevel = {
        id: levelId,
        ...level
      };
      instance.levels.push(newLevel);
      return levelId;
    }
    throw new Error(`Stochastic instance ${instanceId} not found`);
  },

  removeLevel: (instanceId: string, levelId: string): boolean => {
    const instance = stochasticInstances.get(instanceId);
    if (instance) {
      const index = instance.levels.findIndex(level => level.id === levelId);
      if (index !== -1) {
        instance.levels.splice(index, 1);
        return true;
      }
    }
    return false;
  },

  updateLevel: (instanceId: string, levelId: string, updates: Partial<StochasticLevel>): boolean => {
    const instance = stochasticInstances.get(instanceId);
    if (instance) {
      const level = instance.levels.find(l => l.id === levelId);
      if (level) {
        Object.assign(level, updates);
        
        // Update instance level values if they match standard levels
        if (levelId === 'overbought') {
          instance.overboughtLevel = level.value;
        } else if (levelId === 'oversold') {
          instance.oversoldLevel = level.value;
        } else if (levelId === 'midline') {
          instance.midlineLevel = level.value;
        }
        
        return true;
      }
    }
    return false;
  },

  addZone: (instanceId: string, zone: Omit<StochasticZone, 'id'>): string => {
    const instance = stochasticInstances.get(instanceId);
    if (instance) {
      const zoneId = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newZone: StochasticZone = {
        id: zoneId,
        ...zone
      };
      instance.zones.push(newZone);
      return zoneId;
    }
    throw new Error(`Stochastic instance ${instanceId} not found`);
  },

  removeZone: (instanceId: string, zoneId: string): boolean => {
    const instance = stochasticInstances.get(instanceId);
    if (instance) {
      const index = instance.zones.findIndex(zone => zone.id === zoneId);
      if (index !== -1) {
        instance.zones.splice(index, 1);
        return true;
      }
    }
    return false;
  },

  updateZone: (instanceId: string, zoneId: string, updates: Partial<StochasticZone>): boolean => {
    const instance = stochasticInstances.get(instanceId);
    if (instance) {
      const zone = instance.zones.find(z => z.id === zoneId);
      if (zone) {
        Object.assign(zone, updates);
        return true;
      }
    }
    return false;
  },

  getInstanceConfig: (instanceId: string): StochasticInstance | null => {
    return stochasticInstances.get(instanceId) || null;
  },

  resetInstance: (instanceId: string): void => {
    const defaultInstance = createDefaultStochasticInstance(instanceId);
    stochasticInstances.set(instanceId, defaultInstance);
  },

  exportInstanceConfig: (instanceId: string): any => {
    const instance = stochasticInstances.get(instanceId);
    if (!instance) return null;
    
    return {
      id: instance.id,
      kPeriod: instance.kPeriod,
      dPeriod: instance.dPeriod,
      kLineColor: instance.kLineColor,
      kLineThickness: instance.kLineThickness,
      kLineStyle: instance.kLineStyle,
      dLineColor: instance.dLineColor,
      dLineThickness: instance.dLineThickness,
      dLineStyle: instance.dLineStyle,
      showLevels: instance.showLevels,
      showZones: instance.showZones,
      overboughtLevel: instance.overboughtLevel,
      oversoldLevel: instance.oversoldLevel,
      midlineLevel: instance.midlineLevel,
      showOverbought: instance.showOverbought,
      showOversold: instance.showOversold,
      showMidline: instance.showMidline,
      levels: instance.levels.map(level => ({ ...level })),
      zones: instance.zones.map(zone => ({ ...zone }))
    };
  },

  importInstanceConfig: (config: any): boolean => {
    try {
      const instance: StochasticInstance = {
        id: config.id,
        kPeriod: config.kPeriod || 14,
        dPeriod: config.dPeriod || 3,
        kLineColor: config.kLineColor || '#1E90FF',
        kLineThickness: config.kLineThickness || 2,
        kLineStyle: config.kLineStyle || 'solid',
        dLineColor: config.dLineColor || '#FF1493',
        dLineThickness: config.dLineThickness || 2,
        dLineStyle: config.dLineStyle || 'dashed',
        showLevels: config.showLevels !== false,
        showZones: config.showZones !== false,
        overboughtLevel: config.overboughtLevel || 80,
        oversoldLevel: config.oversoldLevel || 20,
        midlineLevel: config.midlineLevel || 50,
        showOverbought: config.showOverbought !== false,
        showOversold: config.showOversold !== false,
        showMidline: config.showMidline || false,
        levels: config.levels || createDefaultStochasticInstance(config.id).levels,
        zones: config.zones || createDefaultStochasticInstance(config.id).zones
      };
      
      stochasticInstances.set(config.id, instance);
      return true;
    } catch (error) {
      console.error('Failed to import Stochastic instance config:', error);
      return false;
    }
  },

  getAllInstances: (): Map<string, StochasticInstance> => {
    return new Map(stochasticInstances);
  },

  clearAllInstances: (): void => {
    stochasticInstances.clear();
  }
};

export default stochastic;