import type { IndicatorTemplate } from 'klinecharts'

/**
 * Custom Momentum Oscillator - TradingView Style
 * 
 * A customizable momentum indicator that shows the difference between
 * fast and slow moving averages with customizable colors, thickness, and styles.
 * 
 * Features:
 * - Customizable periods for fast and slow moving averages
 * - Customizable colors for bullish/bearish momentum
 * - Customizable line thickness and style
 * - TradingView-style color coding
 */
export const customMomentum: IndicatorTemplate = {
  name: 'Custom Momentum',
  shortName: 'CM',
  calcParams: [12, 26], // Fast period, Slow period
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  precision: 5,
  styles: {
    lines: [
      {
        color: '#26a69a', // Default bullish color (TradingView green)
        size: 2, // Default line thickness
        style: 'solid' // solid, dashed, dotted
      }
    ],
    bars: [
      {
        upColor: '#26a69a', // Bullish momentum color (filled)
        downColor: '#ef5350', // Bearish momentum color (filled)
        noChangeColor: '#757575', // Neutral color (filled)
        size: 3, // Increased bar thickness for better filled appearance
        borderColor: '#26a69a', // Same as fill color for positive bars
        borderSize: 0, // No border thickness
        borderStyle: 'solid'
      }
    ]
  },
  figures: [
    {
      key: 'momentum',
      title: 'Momentum: ',
      type: 'line',
      baseValue: 0
    },
    {
      key: 'histogram',
      title: 'Histogram: ',
      type: 'bar',
      baseValue: 0,
      styles: {
        upColor: '#26a69a',
        downColor: '#ef5350',
        noChangeColor: '#757575'
      }
    }
  ],
  calc: (dataList, indicator) => {
    const fastPeriod = (indicator.calcParams[0] as number) || 12;
    const slowPeriod = (indicator.calcParams[1] as number) || 26;
    
    const result: Array<{ momentum?: number; histogram?: number }> = [];
    
    for (let i = 0; i < dataList.length; i++) {
      const kLineData = dataList[i];
      const closePrice = kLineData.close;
      
      if (i >= slowPeriod - 1) {
        // Calculate fast EMA
        let fastEMA = 0;
        if (i === slowPeriod - 1) {
          // Initialize with SMA
          let sum = 0;
          for (let j = i - fastPeriod + 1; j <= i; j++) {
            sum += dataList[j].close;
          }
          fastEMA = sum / fastPeriod;
        } else {
          // Calculate EMA
          const multiplier = 2 / (fastPeriod + 1);
          fastEMA = (closePrice * multiplier) + (result[i - 1].momentum || 0) * (1 - multiplier);
        }
        
        // Calculate slow EMA
        let slowEMA = 0;
        if (i === slowPeriod - 1) {
          // Initialize with SMA
          let sum = 0;
          for (let j = i - slowPeriod + 1; j <= i; j++) {
            sum += dataList[j].close;
          }
          slowEMA = sum / slowPeriod;
        } else {
          // Calculate EMA
          const multiplier = 2 / (slowPeriod + 1);
          slowEMA = (closePrice * multiplier) + (result[i - 1].momentum || 0) * (1 - multiplier);
        }
        
        // Momentum = Fast EMA - Slow EMA
        const momentumValue = fastEMA - slowEMA;
        
        // Histogram shows the momentum as bars
        const histogramValue = momentumValue;
        
        result.push({ 
          momentum: momentumValue,
          histogram: histogramValue
        });
      } else {
        result.push({});
      }
    }
    
    return result;
  }
};

/**
 * Custom Indicator Configuration Interface
 * Allows users to customize the indicator appearance and behavior
 */
export interface CustomIndicatorConfig {
  // Period settings
  fastPeriod: number;
  slowPeriod: number;
  
  // Color settings
  bullishColor: string;
  bearishColor: string;
  neutralColor: string;
  
  // Style settings
  lineThickness: number;
  barThickness: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  
  // Display settings
  showLine: boolean;
  showHistogram: boolean;
  precision: number;
}

/**
 * Create a customized version of the momentum indicator
 */
export function createCustomMomentum(config: CustomIndicatorConfig): IndicatorTemplate {
  return {
    ...customMomentum,
    name: `Custom Momentum (${config.fastPeriod},${config.slowPeriod})`,
    shortName: `CM(${config.fastPeriod},${config.slowPeriod})`,
    calcParams: [config.fastPeriod, config.slowPeriod],
    precision: config.precision,
    styles: {
      lines: config.showLine ? [
        {
          color: config.bullishColor,
          size: config.lineThickness,
          style: config.lineStyle
        }
      ] : [],
      bars: config.showHistogram ? [
        {
          upColor: config.bullishColor,
          downColor: config.bearishColor,
          noChangeColor: config.neutralColor,
          size: config.barThickness,
          borderColor: config.bullishColor, // Same as fill color for consistency
          borderSize: 0, // No border thickness
          borderStyle: 'solid'
        }
      ] : []
    },
    figures: [
      ...(config.showLine ? [{
        key: 'momentum',
        title: 'Momentum: ',
        type: 'line' as const,
        baseValue: 0
      }] : []),
      ...(config.showHistogram ? [{
        key: 'histogram',
        title: 'Histogram: ',
        type: 'bar' as const,
        baseValue: 0,
        styles: {
          upColor: config.bullishColor,
          downColor: config.bearishColor,
          noChangeColor: config.neutralColor
        }
      }] : [])
    ]
  };
}

/**
 * Default configuration for the custom momentum indicator
 */
export const defaultCustomMomentumConfig: CustomIndicatorConfig = {
  fastPeriod: 12,
  slowPeriod: 26,
  bullishColor: '#26a69a', // TradingView green
  bearishColor: '#ef5350', // TradingView red
  neutralColor: '#757575', // Gray
  lineThickness: 2,
  barThickness: 3, // Increased for better filled bar visibility
  lineStyle: 'solid',
  showLine: true,
  showHistogram: true,
  precision: 5
};

/**
 * TradingView-style configuration with filled bars
 */
export const tradingViewFilledConfig: CustomIndicatorConfig = {
  fastPeriod: 12,
  slowPeriod: 26,
  bullishColor: '#26a69a', // TradingView green - filled
  bearishColor: '#ef5350', // TradingView red - filled
  neutralColor: '#757575', // Gray - filled
  lineThickness: 2,
  barThickness: 4, // Thicker for better filled appearance
  lineStyle: 'solid',
  showLine: true,
  showHistogram: true,
  precision: 5
};

export default customMomentum;
