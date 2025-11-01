import type { IndicatorTemplate, KLineData } from 'klinecharts'
import * as kc from 'klinecharts'

/**
 * Rate of Change (ROC) indicator
 * Calculates the percentage change between current price and price n periods ago
 */
export const roc: IndicatorTemplate = {
  name: 'ROC',
  shortName: 'ROC',
  precision: 2,
  calcParams: [14], // Default period
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    { key: 'roc', title: 'ROC: ', type: 'line' }
  ],
  minValue: undefined,
  maxValue: undefined,
  styles: {
    lines: [
      {
        color: '#FF6B6B', // Default red color for ROC line
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const { calcParams } = indicator
    const [period] = calcParams as [number]
    
    return dataList.map((kLineData, i) => {
      const roc = calculateROC(dataList, i, period)
      
      return {
        roc
      }
    })
  }
}

/**
 * Calculate ROC value for a given period
 */
function calculateROC(dataList: KLineData[], currentIndex: number, period: number): number | null {
  if (currentIndex < period) {
    return null
  }
  
  const currentPrice = dataList[currentIndex].close
  const pastPrice = dataList[currentIndex - period].close
  
  if (pastPrice === 0) {
    return null
  }
  
  return ((currentPrice - pastPrice) / pastPrice) * 100
}

export default roc