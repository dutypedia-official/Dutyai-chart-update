import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * OBV (On Balance Volume) Indicator with MAOBV support
 * OBV measures buying and selling pressure as a cumulative indicator
 * MAOBV is the moving average of OBV for smoother trend analysis
 */
export const obv: IndicatorTemplate = {
  name: 'OBV',
  shortName: 'OBV',
  precision: 0,
  calcParams: [30, 10], // OBV period, MAOBV period
  shouldOhlc: false,
  shouldFormatBigNumber: true,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    // OBV line
    {
      key: 'obv',
      title: 'OBV: ',
      type: 'line'
    },
    // MAOBV line (Moving Average of OBV)
    {
      key: 'maobv',
      title: 'MAOBV: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#FF6B35', // Orange color for OBV line
        size: 2, // Default thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      {
        color: '#2196F3', // Blue color for MAOBV line
        size: 1, // Default thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const obvPeriod = (indicator.calcParams[0] as number) || 30; // OBV period (not used in traditional OBV but kept for consistency)
    const maobvPeriod = (indicator.calcParams[1] as number) || 10; // MAOBV period
    const result: Array<{ obv?: number; maobv?: number }> = [];
    
    if (dataList.length === 0) {
      return result;
    }

    let obvValue = 0;
    const obvValues: number[] = [];

    // Calculate OBV for each data point
    for (let i = 0; i < dataList.length; i++) {
      const current = dataList[i];
      
      if (i === 0) {
        // First data point - OBV starts at 0
        obvValue = 0;
      } else {
        const previous = dataList[i - 1];
        const volume = current.volume || 0;
        
        if (current.close > previous.close) {
          // Price went up - add volume
          obvValue += volume;
        } else if (current.close < previous.close) {
          // Price went down - subtract volume
          obvValue -= volume;
        }
        // If price unchanged, OBV remains the same
      }
      
      obvValues.push(obvValue);
      
      // Calculate MAOBV (Simple Moving Average of OBV)
      let maobvValue: number | undefined = undefined;
      if (i >= maobvPeriod - 1) {
        let sum = 0;
        for (let j = i - maobvPeriod + 1; j <= i; j++) {
          sum += obvValues[j];
        }
        maobvValue = sum / maobvPeriod;
      }
      
      result.push({
        obv: obvValue,
        maobv: maobvValue
      });
    }

    return result;
  }
};