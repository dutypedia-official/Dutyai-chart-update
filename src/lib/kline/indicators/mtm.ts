import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * MTM (Momentum) Indicator
 * Measures the rate of change in price over a specified period
 * Formula: MTM = Current Price - Price N periods ago
 * 
 * The indicator shows the momentum of price movement:
 * - Positive values indicate upward momentum
 * - Negative values indicate downward momentum
 * - Zero line crossovers signal potential trend changes
 */
export const mtm: IndicatorTemplate = {
  name: 'MTM',
  shortName: 'MTM',
  precision: 4,
  calcParams: [12], // Default period
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    {
      key: 'mtm',
      title: 'MTM: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#FF6B35', // Orange color for MTM line
        size: 2, // Default thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const period = (indicator.calcParams[0] as number) || 12;
    const result: Array<{ mtm?: number }> = [];
    
    if (dataList.length < period) {
      // Not enough data for calculation
      return dataList.map(() => ({}));
    }

    // Calculate MTM for each data point
    for (let i = 0; i < dataList.length; i++) {
      if (i < period) {
        result.push({});
        continue;
      }

      const currentPrice = dataList[i].close;
      const previousPrice = dataList[i - period].close;
      const mtm = currentPrice - previousPrice;

      result.push({ mtm });
    }

    return result;
  }
};

export default mtm;