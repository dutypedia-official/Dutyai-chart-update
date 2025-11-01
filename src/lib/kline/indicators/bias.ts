import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * BIAS (Bias) Indicator
 * Shows the percentage difference between the closing price and its moving average
 */
export const bias: IndicatorTemplate = {
  name: 'BIAS',
  shortName: 'BIAS',
  precision: 2,
  calcParams: [6], // Default period for BIAS1
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    // BIAS line
    {
      key: 'bias',
      title: 'BIAS: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#2196F3', // Default blue color for BIAS line
        size: 1, // Default thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const period = (indicator.calcParams[0] as number) || 6; // Use configurable period
    const result: Array<{ bias?: number }> = [];
    
    if (dataList.length < period) {
      // Not enough data for calculation
      return dataList.map(() => ({}));
    }

    // Calculate BIAS for each data point
    for (let i = 0; i < dataList.length; i++) {
      if (i < period - 1) {
        result.push({});
        continue;
      }

      // Calculate moving average for the period
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += dataList[j].close;
      }
      const ma = sum / period;
      
      // Calculate BIAS: ((Close - MA) / MA) * 100
      const bias = ((dataList[i].close - ma) / ma) * 100;
      
      result.push({ bias });
    }

    return result;
  }
};