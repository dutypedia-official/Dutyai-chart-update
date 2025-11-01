import type { IndicatorTemplate } from 'klinecharts'

/**
 * Custom Awesome Oscillator (AO) - TradingView Style
 * 
 * A completely custom-built Awesome Oscillator that mimics TradingView's AO
 * without using any TradingView packages. Built from scratch with:
 * - Custom calculation logic
 * - TradingView-style colors and appearance
 * - Filled histogram bars
 * - Customizable parameters
 */
export const customAO: IndicatorTemplate = {
  name: 'Custom AO',
  shortName: 'CAO',
  calcParams: [5, 34], // Short SMA period, Long SMA period (TradingView default)
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  precision: 5,
  styles: {
    bars: [
      {
        upColor: '#26a69a', // TradingView green for positive AO
        downColor: '#ef5350', // TradingView red for negative AO
        noChangeColor: '#757575', // Gray for zero AO
        size: 3, // Increased bar thickness for better solid appearance
        borderColor: '#26a69a', // Same as upColor for solid positive bars
        borderSize: 0, // No border - completely filled
        borderStyle: 'solid',
        fillColor: '#26a69a', // Explicit fill color for positive bars
        strokeColor: '#26a69a' // Same as fill for solid appearance
      }
    ]
  },
  figures: [
    {
      key: 'ao',
      title: 'AO: ',
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
    const shortPeriod = (indicator.calcParams[0] as number) || 5;
    const longPeriod = (indicator.calcParams[1] as number) || 34;
    
    const result: Array<{ ao?: number }> = [];
    
    // Calculate AO for each data point
    for (let i = 0; i < dataList.length; i++) {
      if (i >= longPeriod - 1) {
        // Calculate median prices for the required periods
        const shortPrices: number[] = [];
        const longPrices: number[] = [];
        
        // Get median prices for short period
        for (let j = i - shortPeriod + 1; j <= i; j++) {
          const medianPrice = (dataList[j].high + dataList[j].low) / 2;
          shortPrices.push(medianPrice);
        }
        
        // Get median prices for long period
        for (let j = i - longPeriod + 1; j <= i; j++) {
          const medianPrice = (dataList[j].high + dataList[j].low) / 2;
          longPrices.push(medianPrice);
        }
        
        // Calculate Simple Moving Averages
        const shortSMA = shortPrices.reduce((sum, price) => sum + price, 0) / shortPeriod;
        const longSMA = longPrices.reduce((sum, price) => sum + price, 0) / longPeriod;
        
        // AO = Short SMA - Long SMA
        const aoValue = shortSMA - longSMA;
        
        result.push({ ao: aoValue });
      } else {
        result.push({});
      }
    }
    
    return result;
  },
  // Custom draw function to ensure solid filled bars
  draw: (ctx, dataList, indicator, xAxis, yAxis) => {
    const shortPeriod = (indicator.calcParams[0] as number) || 5;
    const longPeriod = (indicator.calcParams[1] as number) || 34;
    
    ctx.save();
    
    for (let i = longPeriod - 1; i < dataList.length; i++) {
      const kLineData = dataList[i];
      const aoValue = kLineData.ao;
      
      if (aoValue !== undefined) {
        const x = xAxis.convertToPixel(i);
        const y = yAxis.convertToPixel(0);
        const aoY = yAxis.convertToPixel(aoValue);
        
        // Determine bar color based on AO value
        let barColor = '#757575'; // Default gray
        if (aoValue > 0) {
          barColor = '#26a69a'; // TradingView green
        } else if (aoValue < 0) {
          barColor = '#ef5350'; // TradingView red
        }
        
        // Draw solid filled bar
        ctx.fillStyle = barColor;
        ctx.strokeStyle = barColor; // Same color for border
        ctx.lineWidth = 1;
        
        const barWidth = Math.max(2, xAxis.getPixelDistance(1) * 0.8);
        const barHeight = Math.abs(y - aoY);
        const barX = x - barWidth / 2;
        const barY = Math.min(y, aoY);
        
        // Draw filled rectangle
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Draw border with same color for solid appearance
        ctx.strokeRect(barX, barY, barWidth, barHeight);
      }
    }
    
    ctx.restore();
  }
};

/**
 * Custom AO Configuration Interface
 */
export interface CustomAOConfig {
  // Period settings
  shortPeriod: number;
  longPeriod: number;
  
  // Color settings
  positiveColor: string;  // Color for positive AO values
  negativeColor: string;  // Color for negative AO values
  neutralColor: string;   // Color for zero AO values
  
  // Style settings
  barThickness: number;
  precision: number;
}

/**
 * Create a customized version of the AO indicator
 */
export function createCustomAO(config: CustomAOConfig): IndicatorTemplate {
  return {
    ...customAO,
    name: `Custom AO (${config.shortPeriod},${config.longPeriod})`,
    shortName: `CAO(${config.shortPeriod},${config.longPeriod})`,
    calcParams: [config.shortPeriod, config.longPeriod],
    precision: config.precision,
    styles: {
      bars: [
        {
          upColor: config.positiveColor,
          downColor: config.negativeColor,
          noChangeColor: config.neutralColor,
          size: config.barThickness,
          borderColor: config.positiveColor, // Same as positive color for solid bars
          borderSize: 0, // No border - completely filled
          borderStyle: 'solid',
          fillColor: config.positiveColor, // Explicit fill color for positive bars
          strokeColor: config.positiveColor // Same as fill for solid appearance
        }
      ]
    },
    figures: [
      {
        key: 'ao',
        title: 'AO: ',
        type: 'bar',
        baseValue: 0,
        styles: {
          upColor: config.positiveColor,
          downColor: config.negativeColor,
          noChangeColor: config.neutralColor
        }
      }
    ]
  };
}

/**
 * Default TradingView-style configuration for Custom AO
 */
export const defaultCustomAOConfig: CustomAOConfig = {
  shortPeriod: 5,
  longPeriod: 34,
  positiveColor: '#26a69a', // TradingView green
  negativeColor: '#ef5350', // TradingView red
  neutralColor: '#757575',   // Gray
  barThickness: 3, // Increased for better solid appearance
  precision: 5
};

/**
 * High contrast configuration for better visibility
 */
export const highContrastAOConfig: CustomAOConfig = {
  shortPeriod: 5,
  longPeriod: 34,
  positiveColor: '#00ff00', // Bright green
  negativeColor: '#ff0000', // Bright red
  neutralColor: '#ffff00',  // Yellow
  barThickness: 3,
  precision: 3
};

/**
 * Minimalist configuration for clean appearance
 */
export const minimalistAOConfig: CustomAOConfig = {
  shortPeriod: 5,
  longPeriod: 34,
  positiveColor: '#2e7d32', // Dark green
  negativeColor: '#c62828', // Dark red
  neutralColor: '#424242',  // Dark gray
  barThickness: 1,
  precision: 2
};

export default customAO;
