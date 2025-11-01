import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * Volume indicator with EMA and proper up/down color logic
 */
export const volume: IndicatorTemplate = {
  name: 'VOL',
  shortName: 'VOL',
  precision: 0,
  calcParams: [20], // EMA period
  shouldOhlc: false,
  shouldFormatBigNumber: true,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    // Volume bars
    {
      key: 'volume',
      title: 'Volume: ',
      type: 'bar',
      baseValue: 0
    },
    // EMA line
    {
      key: 'ema',
      title: 'EMA: ',
      type: 'line'
    }
  ],
  styles: {
    bars: [
      {
        upColor: '#26a69a', // Green for up volume
        downColor: '#ef5350', // Red for down volume
        noChangeColor: '#26a69a'
      }
    ],
    lines: [
      {
        color: '#8B5CF6', // Purple for EMA line
        size: 1, // 1 pixel thickness as requested
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const params = indicator.calcParams as number[];
    const period = params[0] || 20;
    const result: any[] = [];

    // Calculate volume and EMA
    for (let i = 0; i < dataList.length; i++) {
      const kLineData = dataList[i];
      const volume = kLineData.volume || 0;

      // Calculate EMA
      let ema = 0;
      if (i === 0) {
        ema = volume;
      } else {
        const multiplier = 2 / (period + 1);
        const prevEma = result[i - 1]?.ema || volume;
        ema = volume * multiplier + prevEma * (1 - multiplier);
      }

      result.push({
        volume,
        ema
      });
    }

    return result;
  },
  
  // Custom draw function for volume bars with proper color logic
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    if (!indicator.result || indicator.result.length === 0) return false;

    const visibleRange = chart.getVisibleRange();
    if (!visibleRange) return false;

    const { from, to } = visibleRange;
    const dataList = chart.getDataList();
    
    if (!dataList || dataList.length === 0) return false;

    // Get colors from styles
    const upColor = indicator.styles?.bars?.[0]?.upColor || '#26a69a';
    const downColor = indicator.styles?.bars?.[0]?.downColor || '#ef5350';
    const noChangeColor = indicator.styles?.bars?.[0]?.noChangeColor || '#26a69a';
    const emaColor = indicator.styles?.lines?.[0]?.color || '#8B5CF6';
    
    // Debug logging
    console.log('Volume indicator colors:', {
      upColor,
      downColor,
      noChangeColor,
      emaColor,
      styles: indicator.styles
    });
    
    ctx.save();
    
    // Draw volume bars with proper colors based on price movement
    for (let i = from; i <= to && i < indicator.result.length; i++) {
      const data = indicator.result[i] as any;
      if (!data || data.volume === undefined) continue;
      
      const currentCandle = dataList[i];
      const previousCandle = i > 0 ? dataList[i - 1] : null;
      
      // Determine bar color based on price movement
      let barColor = noChangeColor;
      if (previousCandle) {
        if (currentCandle.close > previousCandle.close) {
          barColor = upColor;
        } else if (currentCandle.close < previousCandle.close) {
          barColor = downColor;
        }
      }
      
      const x = xAxis.convertToPixel(i);
      const volumeY = yAxis.convertToPixel(data.volume);
      const baseY = yAxis.convertToPixel(0);
      
      // Calculate bar width (similar to candlestick width)
      const barWidth = Math.max(1, (xAxis.convertToPixel(1) - xAxis.convertToPixel(0)) * 0.8);
      
      // Draw volume bar
      ctx.fillStyle = barColor;
      ctx.fillRect(x - barWidth / 2, volumeY, barWidth, baseY - volumeY);
    }
    
    // Draw EMA line with triangle fill
    ctx.fillStyle = emaColor + '40'; // Add 40 for 25% opacity
    ctx.strokeStyle = emaColor;
    
    // Get line style configuration from indicator styles
    const lineStyle = indicator.styles?.lines?.[0]?.style || kc.LineType.Solid;
    const lineSize = indicator.styles?.lines?.[0]?.size || 1;
    const dashedValue = indicator.styles?.lines?.[0]?.dashedValue || [2, 2];
    
    ctx.lineWidth = lineSize;
    
    // Set line dash pattern based on style
    if (lineStyle === kc.LineType.Dashed) {
      ctx.setLineDash(dashedValue);
    } else {
      ctx.setLineDash([]);
    }
    
    ctx.beginPath();
    
    let firstPoint = true;
    let lastX = 0;
    let lastY = 0;
    
    // Get the 0 line position
    const zeroLineY = yAxis.convertToPixel(0);
    
    // Draw the EMA line with triangle fill
    for (let i = from; i <= to && i < indicator.result.length; i++) {
      const data = indicator.result[i] as any;
      if (!data || data.ema === undefined) continue;
      
      const x = xAxis.convertToPixel(i);
      const y = yAxis.convertToPixel(data.ema);
      
      if (firstPoint) {
        ctx.moveTo(x, zeroLineY); // Start from 0 line
        ctx.lineTo(x, y); // Go to EMA point
        firstPoint = false;
      } else {
        ctx.lineTo(x, y); // Continue EMA line
      }
      
      lastX = x;
      lastY = y;
    }
    
    // Close the triangle by going back to 0 line
    if (!firstPoint) {
      ctx.lineTo(lastX, zeroLineY); // Go to 0 line
      ctx.closePath();
      
      // Fill the triangle area
      ctx.fill();
      
      // Draw the EMA line on top
      ctx.beginPath();
      firstPoint = true;
      
      for (let i = from; i <= to && i < indicator.result.length; i++) {
        const data = indicator.result[i] as any;
        if (!data || data.ema === undefined) continue;
        
        const x = xAxis.convertToPixel(i);
        const y = yAxis.convertToPixel(data.ema);
        
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }
    
    ctx.restore();
    return true; // We handled all drawing, don't use default rendering
  }
};

export default volume;