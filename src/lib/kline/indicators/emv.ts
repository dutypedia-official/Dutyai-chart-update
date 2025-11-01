import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * EMV (Ease of Movement) Indicator
 * Measures the relationship between price change and volume
 * Formula: EMV = Distance Moved / Box Ratio
 * Where:
 * - Distance Moved = ((High + Low) / 2) - ((Previous High + Previous Low) / 2)
 * - Box Ratio = Volume / (High - Low)
 * 
 * The indicator shows how easily a price can move based on volume
 * Positive values indicate upward movement with ease
 * Negative values indicate downward movement with ease
 */
export const emv: IndicatorTemplate = {
  name: 'EMV',
  shortName: 'EMV',
  precision: 4,
  calcParams: [14, 9], // EMV period, SMA period for smoothing
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    // Raw EMV line
    {
      key: 'emv',
      title: 'EMV: ',
      type: 'line'
    },
    // Smoothed EMV line (Simple Moving Average)
    {
      key: 'emvSma',
      title: 'EMV SMA: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#FF6B35', // Orange color for raw EMV line
        size: 2, // Default thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      {
        color: '#2196F3', // Blue color for smoothed EMV line
        size: 1, // Default thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const emvPeriod = (indicator.calcParams[0] as number) || 14; // EMV calculation period
    const smaPeriod = (indicator.calcParams[1] as number) || 9; // SMA smoothing period
    const result: Array<{ emv?: number; emvSma?: number }> = [];
    
    if (dataList.length < 2) {
      // Need at least 2 data points for EMV calculation
      return dataList.map(() => ({}));
    }

    const emvValues: number[] = [];

    // Calculate EMV for each data point
    for (let i = 0; i < dataList.length; i++) {
      if (i === 0) {
        // First data point - no previous data for comparison
        result.push({});
        continue;
      }

      const current = dataList[i];
      const previous = dataList[i - 1];
      
      // Calculate Distance Moved
      const currentMidpoint = (current.high + current.low) / 2;
      const previousMidpoint = (previous.high + previous.low) / 2;
      const distanceMoved = currentMidpoint - previousMidpoint;
      
      // Calculate Box Ratio
      const priceRange = current.high - current.low;
      const volume = current.volume || 0;
      
      let emvValue = 0;
      if (priceRange > 0 && volume > 0) {
        // EMV = Distance Moved / Box Ratio
        // Box Ratio = Volume / Price Range
        const boxRatio = volume / priceRange;
        emvValue = distanceMoved / boxRatio;
      }
      
      emvValues.push(emvValue);
      
      // Calculate Simple Moving Average of EMV for smoothing
      let emvSmaValue: number | undefined = undefined;
      if (emvValues.length >= smaPeriod) {
        let sum = 0;
        for (let j = emvValues.length - smaPeriod; j < emvValues.length; j++) {
          sum += emvValues[j];
        }
        emvSmaValue = sum / smaPeriod;
      }
      
      result.push({
        emv: emvValue,
        emvSma: emvSmaValue
      });
    }

    return result;
  },
  
  // Custom draw function to add reference lines
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    const visibleRange = chart.getVisibleRange();
    if (!indicator.result || indicator.result.length === 0) return false;

    // Draw horizontal reference line at zero
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    // Zero line (neutral level) - Gray
    ctx.strokeStyle = 'rgba(107, 114, 128, 0.6)';
    ctx.beginPath();
    const zeroY = yAxis.convertToPixel(0);
    ctx.moveTo(bounding.left, zeroY);
    ctx.lineTo(bounding.left + bounding.width, zeroY);
    ctx.stroke();

    ctx.restore();
    return false; // Continue with default drawing for the lines
  }
};