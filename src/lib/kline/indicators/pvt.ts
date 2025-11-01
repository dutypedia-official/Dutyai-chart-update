import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * PVT (Price Volume Trend) Indicator
 * Shows the relationship between price and volume changes
 * Formula: PVT = Previous PVT + (Volume × ((Close - Previous Close) / Previous Close))
 */
export const pvt: IndicatorTemplate = {
  name: 'PVT',
  shortName: 'PVT',
  precision: 2,
  calcParams: [], // PVT doesn't require parameters
  shouldOhlc: false,
  shouldFormatBigNumber: true,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    // PVT line
    {
      key: 'pvt',
      title: 'PVT: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#FF6B35', // Orange color for PVT line
        size: 2, // Default thickness
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const result: Array<{ pvt?: number }> = [];
    
    if (dataList.length < 2) {
      // Not enough data for calculation
      return dataList.map(() => ({}));
    }

    // First data point - PVT starts at 0
    result.push({ pvt: 0 });
    
    let previousPVT = 0;

    // Calculate PVT for each subsequent data point
    for (let i = 1; i < dataList.length; i++) {
      const current = dataList[i];
      const previous = dataList[i - 1];
      
      // Check if we have valid data
      if (current.close == null || previous.close == null || current.volume == null || 
          current.close <= 0 || previous.close <= 0) {
        result.push({});
        continue;
      }

      // Calculate price change ratio
      const priceChangeRatio = (current.close - previous.close) / previous.close;
      
      // Calculate PVT: Previous PVT + (Volume × Price Change Ratio)
      // Note: Volume can be 0, which is valid for PVT calculation
      const currentPVT = previousPVT + (current.volume * priceChangeRatio);
      
      result.push({ pvt: currentPVT });
      previousPVT = currentPVT;
    }

    return result;
  }
};

export default pvt;