import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * Custom Volume Indicator with Triangle Fill for Moving Average
 * Shows volume bars and EMA with triangle fill style
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
      type: 'bar'
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
    const emaPeriod = (indicator.calcParams[0] as number) || 20;
    const result: Array<{ volume?: number; ema?: number }> = [];
    
    if (dataList.length === 0) return result;

    // Calculate EMA of volume
    let emaValue: number | undefined = undefined;
    const multiplier = 2 / (emaPeriod + 1);
    
    for (let i = 0; i < dataList.length; i++) {
      const currentVolume = dataList[i].volume || 0;
      
      if (i === 0) {
        emaValue = currentVolume;
      } else if (emaValue !== undefined) {
        emaValue = (currentVolume * multiplier) + (emaValue * (1 - multiplier));
      }
      
      result.push({
        volume: currentVolume,
        ema: emaValue
      });
    }

    return result;
  },
  
  // Custom draw function to add triangle fill for moving average
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    if (!indicator.result || indicator.result.length === 0) return false;

    const visibleRange = chart.getVisibleRange();
    if (!visibleRange) return false;

    const { from, to } = visibleRange;
    const dataList = chart.getDataList();
    
    if (!dataList || dataList.length === 0) return false;

    // Get EMA line color from styles
    const emaColor = indicator.styles?.lines?.[0]?.color || '#8B5CF6';
    
    // Draw triangle fill for EMA line
    ctx.save();
    
    // Set fill style with some transparency for triangle effect
    ctx.fillStyle = emaColor + '40'; // Add 40 for 25% opacity
    ctx.strokeStyle = emaColor;
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    
    let firstPoint = true;
    let lastX = 0;
    let lastY = 0;
    
    // Draw the EMA line with triangle fill
    for (let i = from; i <= to && i < indicator.result.length; i++) {
      const data = indicator.result[i] as any;
      if (!data || data.ema === undefined) continue;
      
      const x = xAxis.convertToPixel(i);
      const y = yAxis.convertToPixel(data.ema);
      
      if (firstPoint) {
        ctx.moveTo(x, bounding.top + bounding.height); // Start from bottom
        ctx.lineTo(x, y); // Go to EMA point
        firstPoint = false;
      } else {
        ctx.lineTo(x, y); // Continue EMA line
      }
      
      lastX = x;
      lastY = y;
    }
    
    // Close the triangle by going back to bottom
    if (!firstPoint) {
      ctx.lineTo(lastX, bounding.top + bounding.height); // Go to bottom
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
    return false; // Continue with default drawing for volume bars
  }
};

export default volume;