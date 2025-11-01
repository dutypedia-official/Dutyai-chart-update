import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * Ichimoku Kinko Hyo (Ichimoku Cloud) Indicator
 * A comprehensive trend-following indicator that shows support/resistance, momentum, and trend direction
 * 
 * Components:
 * - Tenkan-sen (Conversion Line): (9-period high + 9-period low) / 2
 * - Kijun-sen (Base Line): (26-period high + 26-period low) / 2
 * - Senkou Span A (Leading Span A): (Tenkan-sen + Kijun-sen) / 2, plotted 26 periods ahead
 * - Senkou Span B (Leading Span B): (52-period high + 52-period low) / 2, plotted 26 periods ahead
 * - Chikou Span (Lagging Span): Current close price, plotted 26 periods behind
 */
export const ichimoku: IndicatorTemplate = {
  name: 'ICHIMOKU',
  shortName: 'ICHIMOKU',
  precision: 4,
  calcParams: [9, 26, 52], // Tenkan period, Kijun period, Senkou B period
  shouldOhlc: true, // Ichimoku is typically overlaid on the main price chart
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    // Tenkan-sen (Conversion Line)
    {
      key: 'tenkan',
      title: 'Tenkan: ',
      type: 'line'
    },
    // Kijun-sen (Base Line)
    {
      key: 'kijun',
      title: 'Kijun: ',
      type: 'line'
    },
    // Senkou Span A (Leading Span A)
    {
      key: 'senkouA',
      title: 'Senkou A: ',
      type: 'line'
    },
    // Senkou Span B (Leading Span B)
    {
      key: 'senkouB',
      title: 'Senkou B: ',
      type: 'line'
    },
    // Chikou Span (Lagging Span)
    {
      key: 'chikou',
      title: 'Chikou: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      // Tenkan-sen (Conversion Line) - Red
      {
        color: '#FF6B6B',
        size: 1,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      // Kijun-sen (Base Line) - Blue
      {
        color: '#4ECDC4',
        size: 1,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      // Senkou Span A (Leading Span A) - Green
      {
        color: '#45B7D1',
        size: 1,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      // Senkou Span B (Leading Span B) - Orange
      {
        color: '#FFA07A',
        size: 1,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      // Chikou Span (Lagging Span) - Purple
      {
        color: '#9B59B6',
        size: 1,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const tenkanPeriod = (indicator.calcParams[0] as number) || 9;
    const kijunPeriod = (indicator.calcParams[1] as number) || 26;
    const senkouBPeriod = (indicator.calcParams[2] as number) || 52;
    const displacement = kijunPeriod; // Standard displacement is 26 periods
    
    const result: Array<{
      tenkan?: number;
      kijun?: number;
      senkouA?: number;
      senkouB?: number;
      chikou?: number;
    }> = [];

    // Helper function to get highest high and lowest low over a period
    const getHighLow = (startIndex: number, period: number) => {
      let high = -Infinity;
      let low = Infinity;
      
      for (let i = startIndex; i < startIndex + period && i < dataList.length; i++) {
        if (dataList[i].high > high) high = dataList[i].high;
        if (dataList[i].low < low) low = dataList[i].low;
      }
      
      return { high, low };
    };

    // Calculate for each data point
    for (let i = 0; i < dataList.length; i++) {
      const currentResult: any = {};

      // Calculate Tenkan-sen (Conversion Line)
      if (i >= tenkanPeriod - 1) {
        const { high, low } = getHighLow(i - tenkanPeriod + 1, tenkanPeriod);
        currentResult.tenkan = (high + low) / 2;
      }

      // Calculate Kijun-sen (Base Line)
      if (i >= kijunPeriod - 1) {
        const { high, low } = getHighLow(i - kijunPeriod + 1, kijunPeriod);
        currentResult.kijun = (high + low) / 2;
      }

      // Calculate Senkou Span A (Leading Span A) - displaced forward
      if (i >= kijunPeriod - 1) {
        const tenkanIndex = i;
        const kijunIndex = i;
        
        if (tenkanIndex >= tenkanPeriod - 1 && kijunIndex >= kijunPeriod - 1) {
          const { high: tenkanHigh, low: tenkanLow } = getHighLow(tenkanIndex - tenkanPeriod + 1, tenkanPeriod);
          const { high: kijunHigh, low: kijunLow } = getHighLow(kijunIndex - kijunPeriod + 1, kijunPeriod);
          
          const tenkan = (tenkanHigh + tenkanLow) / 2;
          const kijun = (kijunHigh + kijunLow) / 2;
          
          // For displacement, we calculate the value but it will be plotted ahead
          currentResult.senkouA = (tenkan + kijun) / 2;
        }
      }

      // Calculate Senkou Span B (Leading Span B) - displaced forward
      if (i >= senkouBPeriod - 1) {
        const { high, low } = getHighLow(i - senkouBPeriod + 1, senkouBPeriod);
        currentResult.senkouB = (high + low) / 2;
      }

      // Calculate Chikou Span (Lagging Span) - current close displaced backward
      currentResult.chikou = dataList[i].close;

      result.push(currentResult);
    }

    // Apply displacement for Senkou spans and Chikou
    const finalResult = result.map((item, index) => {
      const displaced: any = { ...item };

      // Senkou Span A and B are plotted 26 periods ahead
      // So we take the value from 26 periods ago
      if (index >= displacement) {
        displaced.senkouA = result[index - displacement]?.senkouA;
        displaced.senkouB = result[index - displacement]?.senkouB;
      } else {
        displaced.senkouA = undefined;
        displaced.senkouB = undefined;
      }

      // Chikou Span is plotted 26 periods behind
      // So we take the close value from 26 periods ahead
      if (index + displacement < result.length) {
        displaced.chikou = dataList[index + displacement]?.close;
      } else {
        displaced.chikou = undefined;
      }

      return displaced;
    });

    return finalResult;
  },

  // Custom draw function to create the cloud (Kumo) between Senkou Span A and B
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    if (!indicator.result || indicator.result.length === 0) return false;

    const visibleRange = chart.getVisibleRange();
    const { from, to } = visibleRange;
    const result = indicator.result;

    // Draw the cloud (Kumo) between Senkou Span A and B
    ctx.save();
    
    const cloudPoints: Array<{ x: number; yA: number; yB: number }> = [];
    
    // Collect points for the cloud
    for (let i = from; i < to; i++) {
      const data = result[i] as any;
      if (data && data.senkouA !== undefined && data.senkouB !== undefined) {
        const x = xAxis.convertToPixel(i);
        const yA = yAxis.convertToPixel(data.senkouA);
        const yB = yAxis.convertToPixel(data.senkouB);
        cloudPoints.push({ x, yA, yB });
      }
    }

    // Draw the cloud if we have points
    if (cloudPoints.length > 1) {
      ctx.globalAlpha = 0.2; // Make cloud semi-transparent
      
      // Determine cloud color based on Senkou A vs Senkou B relationship
      const isUpCloud = cloudPoints[0].yA < cloudPoints[0].yB; // A above B
      ctx.fillStyle = isUpCloud ? '#4CAF50' : '#F44336'; // Green for bullish, red for bearish
      
      // Draw the filled area between Senkou A and B
      ctx.beginPath();
      
      // Draw top line (Senkou A or B, whichever is higher)
      ctx.moveTo(cloudPoints[0].x, Math.min(cloudPoints[0].yA, cloudPoints[0].yB));
      for (let i = 1; i < cloudPoints.length; i++) {
        ctx.lineTo(cloudPoints[i].x, Math.min(cloudPoints[i].yA, cloudPoints[i].yB));
      }
      
      // Draw bottom line (Senkou A or B, whichever is lower) in reverse
      for (let i = cloudPoints.length - 1; i >= 0; i--) {
        ctx.lineTo(cloudPoints[i].x, Math.max(cloudPoints[i].yA, cloudPoints[i].yB));
      }
      
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.restore();
    return false; // Let the default line drawing continue
  }
};