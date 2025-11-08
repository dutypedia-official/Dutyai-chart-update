import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

// Define types for SuperTrend data
interface SuperTrendData {
  superTrend?: number;
  trend?: number; // 1 for uptrend, -1 for downtrend
  buySignal?: number; // Price level for buy signal
  sellSignal?: number; // Price level for sell signal
}

/**
 * SuperTrend Indicator
 * A trend-following indicator that uses ATR (Average True Range) to calculate dynamic support and resistance levels
 * 
 * Formula:
 * - Basic Upper Band = (High + Low) / 2 + Multiplier × ATR
 * - Basic Lower Band = (High + Low) / 2 - Multiplier × ATR
 * - Final Upper Band = If current close > previous upper → finalUpper = currentUpper, else finalUpper = previousUpper
 * - Final Lower Band = same logic for lower
 * - Trend Flip: If Close > FinalUpperBand → Uptrend (green), else if Close < FinalLowerBand → Downtrend (red)
 */
export const superTrend: IndicatorTemplate = {
  name: 'SUPERTREND',
  shortName: 'ST',
  precision: 2,
  calcParams: [10, 3], // Default period: 10, multiplier: 3
  shouldOhlc: true, // SuperTrend is overlaid on the main price chart
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: {
    showLabels: true // Default: show Buy/Sell labels
  },
  figures: [
    // SuperTrend line
    {
      key: 'superTrend',
      title: 'SuperTrend: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#00FF00', // Green for uptrend
        size: 2, // Default line thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [0, 0]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const period = (indicator.calcParams[0] as number) || 10;
    const multiplier = (indicator.calcParams[1] as number) || 3;
    const result: Array<SuperTrendData> = [];
    
    if (dataList.length < period) {
      return dataList.map(() => ({}));
    }

    // Helper function to calculate True Range
    const calculateTrueRange = (current: KLineData, previous?: KLineData): number => {
      if (!previous) {
        return current.high - current.low;
      }
      
      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - previous.close);
      const tr3 = Math.abs(current.low - previous.close);
      
      return Math.max(tr1, tr2, tr3);
    };

    // Helper function to calculate ATR (Average True Range)
    const calculateATR = (index: number): number => {
      if (index < period - 1) return 0;
      
      let sum = 0;
      for (let i = index - period + 1; i <= index; i++) {
        const current = dataList[i];
        const previous = i > 0 ? dataList[i - 1] : undefined;
        sum += calculateTrueRange(current, previous);
      }
      
      return sum / period;
    };

    // Initialize variables for SuperTrend calculation
    let previousTrend = 1; // Start with uptrend
    let finalUpperBand = 0;
    let finalLowerBand = 0;

    // Calculate SuperTrend for each data point
    for (let i = 0; i < dataList.length; i++) {
      if (i < period - 1) {
        result.push({});
        continue;
      }

      const current = dataList[i];
      const previous = i > 0 ? dataList[i - 1] : current;
      const atr = calculateATR(i);
      
      // Calculate basic bands
      const hl2 = (current.high + current.low) / 2;
      const basicUpperBand = hl2 + (multiplier * atr);
      const basicLowerBand = hl2 - (multiplier * atr);
      
      // Calculate final bands
      if (i === period - 1) {
        // First calculation
        finalUpperBand = basicUpperBand;
        finalLowerBand = basicLowerBand;
      } else {
        const prevResult = result[i - 1];
        const prevClose = previous.close;
        
        // Final Upper Band logic
        if (basicUpperBand < finalUpperBand || prevClose > finalUpperBand) {
          finalUpperBand = basicUpperBand;
        }
        
        // Final Lower Band logic
        if (basicLowerBand > finalLowerBand || prevClose < finalLowerBand) {
          finalLowerBand = basicLowerBand;
        }
      }
      
      // Determine trend and SuperTrend value
      let currentTrend = previousTrend;
      let superTrendValue = 0;
      let buySignal: number | undefined;
      let sellSignal: number | undefined;
      
      if (i > period - 1) {
        const prevSuperTrend = result[i - 1].superTrend || 0;
        
        // Trend determination logic
        if (previousTrend === 1 && current.close <= finalLowerBand) {
          currentTrend = -1; // Switch to downtrend
        } else if (previousTrend === -1 && current.close >= finalUpperBand) {
          currentTrend = 1; // Switch to uptrend
        }
        
        // Generate signals on trend change
        if (currentTrend !== previousTrend) {
          if (currentTrend === 1) {
            // Buy signal
            buySignal = finalLowerBand;
          } else {
            // Sell signal
            sellSignal = finalUpperBand;
          }
        }
      }
      
      // Set SuperTrend value based on trend
      if (currentTrend === 1) {
        superTrendValue = finalLowerBand;
      } else {
        superTrendValue = finalUpperBand;
      }
      
      result.push({
        superTrend: superTrendValue,
        trend: currentTrend,
        buySignal: buySignal,
        sellSignal: sellSignal
      });
      
      previousTrend = currentTrend;
    }

    return result;
  },
  
  // Custom draw function for dynamic coloring and Buy/Sell signals
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    if (!indicator.result || indicator.result.length === 0) return false;

    const visibleRange = chart.getVisibleRange();
    const { from, to } = visibleRange;
    
    // Get the visible data points
    const visibleData = indicator.result.slice(from, to + 1);
    if (visibleData.length < 2) return false;

    ctx.save();
    
    // Get custom style data (colors, thickness, style per trend) from extendData
    const extendData = indicator.extendData as any;
    const showLabels = extendData?.showLabels !== false;
    const uptrendColor = extendData?.uptrendColor || '#00FF00';
    const downtrendColor = extendData?.downtrendColor || '#FF0000';
    const uptrendThickness = extendData?.uptrendThickness ?? 2;
    const downtrendThickness = extendData?.downtrendThickness ?? 2;
    const uptrendLineStyle = extendData?.uptrendLineStyle || 'solid'; // 'solid' | 'dashed' | 'dotted'
    const downtrendLineStyle = extendData?.downtrendLineStyle || 'solid';
    
    // Draw SuperTrend line with dynamic coloring
    let segments: Array<{start: number, end: number, trend: number}> = [];
    let currentSegmentStart = 0;
    let currentTrend = (visibleData[0] as any)?.trend || 1;
    
    // Group consecutive points with same trend
    for (let i = 1; i < visibleData.length; i++) {
      const data = visibleData[i] as any;
      if (data.trend !== currentTrend || i === visibleData.length - 1) {
        segments.push({
          start: currentSegmentStart,
          end: i === visibleData.length - 1 && data.trend === currentTrend ? i : i - 1,
          trend: currentTrend
        });
        currentSegmentStart = i;
        currentTrend = data.trend || 1;
      }
    }
    
    // Draw each segment with appropriate color and style
    segments.forEach(segment => {
      const isUp = segment.trend === 1;
      const color = isUp ? uptrendColor : downtrendColor;
      const lineWidth = isUp ? uptrendThickness : downtrendThickness;
      const styleName = isUp ? uptrendLineStyle : downtrendLineStyle;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = Number(lineWidth) || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Set line style
      if (styleName === 'dashed') ctx.setLineDash([4, 4]);
      else if (styleName === 'dotted') ctx.setLineDash([2, 6]);
      else ctx.setLineDash([]);
      
      ctx.beginPath();
      let firstPoint = true;
      
      for (let i = segment.start; i <= segment.end; i++) {
        const data = visibleData[i] as any;
        if (data.superTrend !== undefined) {
          const x = xAxis.convertToPixel(from + i);
          const y = yAxis.convertToPixel(data.superTrend);
          
          if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      
      ctx.stroke();
    });
    
    // Draw Buy/Sell signals if enabled
    if (showLabels) {
      for (let i = 0; i < visibleData.length; i++) {
        const data = visibleData[i] as any;
        const x = xAxis.convertToPixel(from + i);
        
        // Draw Buy signal
        if (data.buySignal !== undefined) {
          const y = yAxis.convertToPixel(data.buySignal);
          
          // Draw green circle for buy signal
          ctx.fillStyle = '#00FF00';
          ctx.beginPath();
          ctx.arc(x, y - 10, 4, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw "BUY" text
          ctx.fillStyle = '#00FF00';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('BUY', x, y - 20);
        }
        
        // Draw Sell signal
        if (data.sellSignal !== undefined) {
          const y = yAxis.convertToPixel(data.sellSignal);
          
          // Draw red circle for sell signal
          ctx.fillStyle = '#FF0000';
          ctx.beginPath();
          ctx.arc(x, y + 10, 4, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw "SELL" text
          ctx.fillStyle = '#FF0000';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('SELL', x, y + 25);
        }
      }
    }
    
    ctx.restore();
    return true;
  }
};

export default superTrend;