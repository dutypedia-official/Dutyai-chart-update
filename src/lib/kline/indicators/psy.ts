import type { IndicatorTemplate, KLineData } from 'klinecharts'
import * as kc from 'klinecharts'

/**
 * PSY (Psychological Line) indicator with MAPSY support
 * PSY: Calculates the percentage of rising periods over a given period
 * MAPSY: Moving average of PSY values
 */
export const psy: IndicatorTemplate = {
  name: 'PSY',
  shortName: 'PSY',
  precision: 2,
  calcParams: [12, 6], // Default periods for PSY and MAPSY
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    { key: 'psy', title: 'PSY: ', type: 'line' },
    { key: 'mapsy', title: 'MAPSY: ', type: 'line' }
  ],
  minValue: 0,
  maxValue: 100,
  styles: {
    lines: [
      {
        color: '#2563eb', // Default blue color for PSY line
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      {
        color: '#dc2626', // Default red color for MAPSY line
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const { calcParams } = indicator
    const [psyPeriod, mapsyPeriod] = calcParams as [number, number]
    
    return dataList.map((kLineData, i) => {
      const psy = calculatePSY(dataList, i, psyPeriod)
      const mapsy = calculateMAPSY(dataList, i, psyPeriod, mapsyPeriod)
      
      return {
        psy,
        mapsy
      }
    })
  }
}

/**
 * Calculate PSY value for a given period
 * PSY = (Number of rising periods / Total periods) * 100
 */
function calculatePSY(dataList: KLineData[], currentIndex: number, period: number): number | null {
  if (currentIndex < period) {
    return null
  }
  
  let risingCount = 0
  
  for (let i = currentIndex - period + 1; i <= currentIndex; i++) {
    if (i > 0 && dataList[i].close > dataList[i - 1].close) {
      risingCount++
    }
  }
  
  return (risingCount / period) * 100
}

/**
 * Calculate MAPSY (Moving Average of PSY) value
 */
function calculateMAPSY(dataList: KLineData[], currentIndex: number, psyPeriod: number, mapsyPeriod: number): number | null {
  if (currentIndex < psyPeriod + mapsyPeriod - 1) {
    return null
  }
  
  let psySum = 0
  let validCount = 0
  
  for (let i = currentIndex - mapsyPeriod + 1; i <= currentIndex; i++) {
    const psyValue = calculatePSY(dataList, i, psyPeriod)
    if (psyValue !== null) {
      psySum += psyValue
      validCount++
    }
  }
  
  return validCount > 0 ? psySum / validCount : null
}

export default psy