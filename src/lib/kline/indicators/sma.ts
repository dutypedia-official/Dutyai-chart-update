import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * SMA (Simple Moving Average) Indicator
 * A basic trend-following indicator that calculates the average of closing prices over a specified period
 * 
 * Formula: SMA = (Sum of Close Prices over N periods) / N
 * 
 * The indicator is plotted directly on the main chart panel
 * Default settings: Period 20, Orange color (#FF6C37), 2px line thickness
 */
export const sma: IndicatorTemplate = {
  name: 'SMA',
  shortName: 'SMA',
  precision: 2,
  calcParams: [20], // Default period: 20
  shouldOhlc: true, // SMA is overlaid on the main price chart
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    {
      key: 'sma',
      title: 'SMA: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#FF6C37', // Vibrant orange color
        size: 2, // 2px line thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const period = (indicator.calcParams[0] as number) || 20;
    const result: Array<{ sma?: number }> = [];
    
    if (dataList.length < period) {
      // Not enough data for calculation
      return dataList.map(() => ({}));
    }

    // Calculate SMA for each data point
    for (let i = 0; i < dataList.length; i++) {
      if (i < period - 1) {
        // Not enough data yet for this point
        result.push({});
        continue;
      }

      // Calculate Simple Moving Average
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += dataList[j].close;
      }
      const smaValue = sum / period;
      
      result.push({ sma: smaValue });
    }

    return result;
  },
  
  // Custom draw function to ensure the line renders above candles with proper styling
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    if (!indicator.result || indicator.result.length === 0) return false;

    const visibleRange = chart.getVisibleRange();
    const { from, to } = visibleRange;
    
    // Get the visible data points
    const visibleData = indicator.result.slice(from, to + 1);
    if (visibleData.length < 2) return false;

    ctx.save();
    
    // Get custom styles from indicator
    const lineStyle = indicator.styles?.lines?.[0] || { 
      color: '#FF6C37', 
      size: 2, 
      style: kc.LineType.Solid 
    };
    
    // Draw SMA line
    ctx.beginPath();
    let firstPoint = true;
    
    for (let i = 0; i < visibleData.length; i++) {
      const data = visibleData[i];
      if (data.sma !== undefined) {
        const x = xAxis.convertToPixel(from + i);
        const y = yAxis.convertToPixel(data.sma);
        
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    
    // Apply line styling
    ctx.strokeStyle = lineStyle.color;
    ctx.lineWidth = lineStyle.size;
    
    // Handle different line styles - check the actual style type
    if (lineStyle.style === kc.LineType.Dashed) {
      ctx.setLineDash([8, 4]); // Dashed pattern
    } else if (lineStyle.style === kc.LineType.Dotted) {
      ctx.setLineDash([2, 2]); // Dotted pattern
    } else {
      // Solid line - explicitly set empty array
      ctx.setLineDash([]);
    }
    
    ctx.stroke();
    ctx.restore();
    
    return true;
  }
};

export default sma;

