import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * VR (Volume Variation Rate) Indicator
 * Shows the relationship between volume and price changes
 * Formula: VR = (UV + 1/2 * EV) / (DV + 1/2 * EV) * 100
 * Where:
 * - UV = Volume on up days (close > previous close)
 * - DV = Volume on down days (close < previous close)
 * - EV = Volume on equal days (close = previous close)
 */
export const vr: IndicatorTemplate = {
  name: 'VR',
  shortName: 'VR',
  precision: 2,
  calcParams: [26, 6, 12], // period, short period, long period
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    // VR line
    {
      key: 'vr',
      title: 'VR: ',
      type: 'line'
    },
    // Short VR line
    {
      key: 'vrShort',
      title: 'VR Short: ',
      type: 'line'
    },
    // Long VR line
    {
      key: 'vrLong',
      title: 'VR Long: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#FF6B35', // Orange color for main VR line
        size: 2, // Default thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      {
        color: '#2196F3', // Blue color for short VR line
        size: 1, // Default thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      {
        color: '#4CAF50', // Green color for long VR line
        size: 1, // Default thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const period = (indicator.calcParams[0] as number) || 26; // Main period
    const shortPeriod = (indicator.calcParams[1] as number) || 6; // Short period
    const longPeriod = (indicator.calcParams[2] as number) || 12; // Long period
    
    const result: Array<{ vr?: number, vrShort?: number, vrLong?: number }> = [];
    
    if (dataList.length < Math.max(period, shortPeriod, longPeriod) + 1) {
      // Not enough data for calculation
      return dataList.map(() => ({}));
    }

    // Helper function to calculate VR for a given period
    const calculateVR = (endIndex: number, calcPeriod: number): number => {
      if (endIndex < calcPeriod) return 100; // Default VR value
      
      let upVolume = 0;
      let downVolume = 0;
      let equalVolume = 0;
      
      for (let i = endIndex - calcPeriod + 1; i <= endIndex; i++) {
        if (i === 0) continue; // Skip first data point as we need previous close
        
        const current = dataList[i];
        const previous = dataList[i - 1];
        
        if (current.close > previous.close) {
          upVolume += current.volume || 0;
        } else if (current.close < previous.close) {
          downVolume += current.volume || 0;
        } else {
          equalVolume += current.volume || 0;
        }
      }
      
      // VR formula: (UV + 1/2 * EV) / (DV + 1/2 * EV) * 100
      const numerator = upVolume + (equalVolume / 2);
      const denominator = downVolume + (equalVolume / 2);
      
      if (denominator === 0) return 100; // Avoid division by zero
      
      return (numerator / denominator) * 100;
    };

    // Calculate VR for each data point
    for (let i = 0; i < dataList.length; i++) {
      const vrMain = calculateVR(i, period);
      const vrShort = calculateVR(i, shortPeriod);
      const vrLong = calculateVR(i, longPeriod);
      
      result.push({
        vr: vrMain,
        vrShort: vrShort,
        vrLong: vrLong
      });
    }

    return result;
  },
  
  // Custom draw function to add reference lines
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    const visibleRange = chart.getVisibleRange();
    if (!indicator.result || indicator.result.length === 0) return false;

    // Draw horizontal reference lines
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // 100 line (neutral level) - Gray
    ctx.strokeStyle = 'rgba(107, 114, 128, 0.6)';
    ctx.beginPath();
    const neutralY = yAxis.convertToPixel(100);
    ctx.moveTo(bounding.left, neutralY);
    ctx.lineTo(bounding.left + bounding.width, neutralY);
    ctx.stroke();
    
    // 150 line (overbought level) - Red
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.beginPath();
    const overboughtY = yAxis.convertToPixel(150);
    ctx.moveTo(bounding.left, overboughtY);
    ctx.lineTo(bounding.left + bounding.width, overboughtY);
    ctx.stroke();
    
    // 70 line (oversold level) - Green
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.beginPath();
    const oversoldY = yAxis.convertToPixel(70);
    ctx.moveTo(bounding.left, oversoldY);
    ctx.lineTo(bounding.left + bounding.width, oversoldY);
    ctx.stroke();

    ctx.restore();
    return false; // Continue with default drawing for the lines
  }
};