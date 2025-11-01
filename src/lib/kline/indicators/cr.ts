/**
 * Licensed under Apache License v2.0, see LICENSE file for details.
 */

import type { IndicatorTemplate, KLineData } from 'klinecharts'
import * as kc from 'klinecharts'

interface CrData {
  cr?: number
  ma1?: number
  ma2?: number
  ma3?: number
  ma4?: number
}

/**
 * Calculate CR (Energy Index) indicator
 * CR measures the relationship between highest/lowest prices and yesterday's middle price
 * 
 * @param dataList - Array of candlestick data
 * @param indicator - Indicator instance with calcParams
 * @returns Array of CR data points
 */
function calculateCR(dataList: KLineData[], indicator: any): CrData[] {
  const calcParams = indicator.calcParams || [26, 10, 20, 40, 60];
  const [period, ma1Period, ma2Period, ma3Period, ma4Period] = calcParams
  const result: CrData[] = []
  
  if (dataList.length < period + 1) {
    return result.concat(new Array(dataList.length).fill({}))
  }

  // Calculate CR values
  const crValues: number[] = []
  
  for (let i = 1; i < dataList.length; i++) {
    const current = dataList[i]
    const previous = dataList[i - 1]
    
    // Yesterday's middle price (typical price)
    const ym = (previous.high + previous.low + previous.close) / 3
    
    // P1: Sum of (high - ym) for positive values over period
    // P2: Sum of (ym - low) for positive values over period
    let p1 = 0
    let p2 = 0
    
    const startIndex = Math.max(0, i - period + 1)
    
    for (let j = startIndex; j <= i; j++) {
      const candle = dataList[j]
      const prevCandle = j > 0 ? dataList[j - 1] : candle
      const prevYm = (prevCandle.high + prevCandle.low + prevCandle.close) / 3
      
      const highDiff = candle.high - prevYm
      const lowDiff = prevYm - candle.low
      
      if (highDiff > 0) p1 += highDiff
      if (lowDiff > 0) p2 += lowDiff
    }
    
    // CR = P1 / P2 * 100
    const cr = p2 !== 0 ? (p1 / p2) * 100 : 100
    crValues.push(cr)
    
    // Calculate moving averages of CR
    const ma1 = calculateMA(crValues, ma1Period)
    const ma2 = calculateMA(crValues, ma2Period)
    const ma3 = calculateMA(crValues, ma3Period)
    const ma4 = calculateMA(crValues, ma4Period)
    
    result.push({
      cr,
      ma1: ma1 !== null ? ma1 : undefined,
      ma2: ma2 !== null ? ma2 : undefined,
      ma3: ma3 !== null ? ma3 : undefined,
      ma4: ma4 !== null ? ma4 : undefined
    })
  }
  
  // Pad the beginning with empty objects
  return new Array(dataList.length - result.length).fill({}).concat(result)
}

/**
 * Calculate simple moving average
 */
function calculateMA(values: number[], period: number): number | null {
  if (values.length < period) return null
  
  const sum = values.slice(-period).reduce((acc, val) => acc + val, 0)
  return sum / period
}

/**
 * CR (Energy Index) Indicator
 * Measures the relationship between price extremes and previous period's middle price
 */
export const cr: IndicatorTemplate = {
  name: 'CR',
  shortName: 'CR',
  precision: 2,
  calcParams: [26, 10, 20, 40, 60],
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    { key: 'cr', title: 'CR: ', type: 'line' },
    { key: 'ma1', title: 'MA1: ', type: 'line' },
    { key: 'ma2', title: 'MA2: ', type: 'line' },
    { key: 'ma3', title: 'MA3: ', type: 'line' },
    { key: 'ma4', title: 'MA4: ', type: 'line' }
  ],
  calc: calculateCR,
  regenerateFigures: (params: any[]) => {
    const [, ma1Period, ma2Period, ma3Period, ma4Period] = params
    return [
      { key: 'cr', title: 'CR: ', type: 'line' },
      { key: 'ma1', title: `MA${ma1Period}: `, type: 'line' },
      { key: 'ma2', title: `MA${ma2Period}: `, type: 'line' },
      { key: 'ma3', title: `MA${ma3Period}: `, type: 'line' },
      { key: 'ma4', title: `MA${ma4Period}: `, type: 'line' }
    ]
  },
  styles: {
    lines: [
      { color: '#FF6B35', size: 2, style: kc.LineType.Solid }, // CR line - orange
      { color: '#2196F3', size: 1, style: kc.LineType.Solid }, // MA1 - blue
      { color: '#4CAF50', size: 1, style: kc.LineType.Solid }, // MA2 - green
      { color: '#FF9800', size: 1, style: kc.LineType.Solid }, // MA3 - amber
      { color: '#9C27B0', size: 1, style: kc.LineType.Solid }  // MA4 - purple
    ]
  }
}