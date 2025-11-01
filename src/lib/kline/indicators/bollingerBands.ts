import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * Custom Bollinger Bands Indicator with Fill Color Support
 * Shows upper band, middle line (SMA), and lower band with fill color between bands
 */
export const bollingerBands: IndicatorTemplate = {
  name: 'BOLL',
  shortName: 'BOLL',
  precision: 2,
  calcParams: [20, 2], // Default period: 20, standard deviation: 2
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    // Upper band
    {
      key: 'upper',
      title: 'Upper: ',
      type: 'line'
    },
    // Middle line (SMA)
    {
      key: 'middle',
      title: 'Middle: ',
      type: 'line'
    },
    // Lower band
    {
      key: 'lower',
      title: 'Lower: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#2196F3', // Blue for upper band
        size: 1,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [0, 0] // Ensure solid line
      },
      {
        color: '#FF9800', // Orange for middle line
        size: 1,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [0, 0] // Ensure solid line
      },
      {
        color: '#2196F3', // Blue for lower band
        size: 1,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [0, 0] // Ensure solid line
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const period = (indicator.calcParams[0] as number) || 20;
    const stdDev = (indicator.calcParams[1] as number) || 2;
    const result: Array<{ upper?: number; middle?: number; lower?: number }> = [];
    
    if (dataList.length < period) {
      // Not enough data for calculation
      return dataList.map(() => ({}));
    }

    // Calculate Bollinger Bands for each data point
    for (let i = 0; i < dataList.length; i++) {
      if (i < period - 1) {
        result.push({});
        continue;
      }

      // Calculate Simple Moving Average (middle line)
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += dataList[j].close;
      }
      const sma = sum / period;
      
      // Calculate standard deviation
      let variance = 0;
      for (let j = i - period + 1; j <= i; j++) {
        variance += Math.pow(dataList[j].close - sma, 2);
      }
      const standardDeviation = Math.sqrt(variance / period);
      
      // Calculate upper and lower bands
      const upper = sma + (stdDev * standardDeviation);
      const lower = sma - (stdDev * standardDeviation);
      
      result.push({ 
        upper, 
        middle: sma, 
        lower 
      });
    }

    return result;
  },
  
  // Custom draw function to add fill color between bands
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    if (!indicator.result || indicator.result.length === 0) return false;

    const visibleRange = chart.getVisibleRange();
    const { from, to } = visibleRange;
    
    // Get the visible data points
    const visibleData = indicator.result.slice(from, to + 1);
    if (visibleData.length < 2) return false;

    ctx.save();
    
    // Get custom styles from indicator
    const upperBandStyle = indicator.styles?.lines?.[0] || { color: '#2196F3', size: 1, style: kc.LineType.Solid };
    const middleLineStyle = indicator.styles?.lines?.[1] || { color: '#FF9800', size: 1, style: kc.LineType.Solid };
    const lowerBandStyle = indicator.styles?.lines?.[2] || { color: '#2196F3', size: 1, style: kc.LineType.Solid };
    const fillStyle = indicator.styles?.fill || { color: 'rgba(33, 150, 243, 0.1)', opacity: 0.1 };
    
    // Create path for fill area between upper and lower bands
    ctx.beginPath();
    
    // Draw upper band line
    let firstPoint = true;
    for (let i = 0; i < visibleData.length; i++) {
      const data = visibleData[i];
      if (data.upper !== undefined) {
        const x = xAxis.convertToPixel(from + i);
        const y = yAxis.convertToPixel(data.upper);
        
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    
    // Draw lower band line (in reverse to create closed path)
    for (let i = visibleData.length - 1; i >= 0; i--) {
      const data = visibleData[i];
      if (data.lower !== undefined) {
        const x = xAxis.convertToPixel(from + i);
        const y = yAxis.convertToPixel(data.lower);
        ctx.lineTo(x, y);
      }
    }
    
    // Close the path
    ctx.closePath();
    
    // Fill the area between bands with custom color and opacity
    ctx.globalAlpha = fillStyle.opacity || 0.1; // Apply opacity
    ctx.fillStyle = fillStyle.color;
    ctx.fill();
    ctx.globalAlpha = 1.0; // Reset opacity for lines
    
    // Draw upper band line with custom style
    ctx.beginPath();
    firstPoint = true;
    for (let i = 0; i < visibleData.length; i++) {
      const data = visibleData[i];
      if (data.upper !== undefined) {
        const x = xAxis.convertToPixel(from + i);
        const y = yAxis.convertToPixel(data.upper);
        
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.strokeStyle = upperBandStyle.color;
    ctx.lineWidth = upperBandStyle.size;
    ctx.setLineDash(upperBandStyle.style === kc.LineType.Dashed ? [4, 4] : 
                   upperBandStyle.style === kc.LineType.Dotted ? [2, 2] : []);
    ctx.stroke();
    
    // Draw lower band line with custom style
    ctx.beginPath();
    firstPoint = true;
    for (let i = 0; i < visibleData.length; i++) {
      const data = visibleData[i];
      if (data.lower !== undefined) {
        const x = xAxis.convertToPixel(from + i);
        const y = yAxis.convertToPixel(data.lower);
        
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.strokeStyle = lowerBandStyle.color;
    ctx.lineWidth = lowerBandStyle.size;
    ctx.setLineDash(lowerBandStyle.style === kc.LineType.Dashed ? [4, 4] : 
                   lowerBandStyle.style === kc.LineType.Dotted ? [2, 2] : []);
    ctx.stroke();
    
    // Draw middle line (SMA) with custom style
    ctx.beginPath();
    firstPoint = true;
    for (let i = 0; i < visibleData.length; i++) {
      const data = visibleData[i];
      if (data.middle !== undefined) {
        const x = xAxis.convertToPixel(from + i);
        const y = yAxis.convertToPixel(data.middle);
        
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.strokeStyle = middleLineStyle.color;
    ctx.lineWidth = middleLineStyle.size;
    ctx.setLineDash(middleLineStyle.style === kc.LineType.Dashed ? [4, 4] : 
                   middleLineStyle.style === kc.LineType.Dotted ? [2, 2] : []);
    ctx.stroke();
    
    ctx.restore();
    return true;
  }
};
