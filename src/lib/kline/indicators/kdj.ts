import type { IndicatorTemplate, KLineData } from 'klinecharts'
import * as kc from 'klinecharts'

/**
 * KDJ (Stochastic Oscillator) Indicator
 * K Line: Fast stochastic oscillator
 * D Line: Slow stochastic oscillator (moving average of K)
 * J Line: Divergence indicator (3*K - 2*D)
 */
export const kdj: IndicatorTemplate = {
  name: 'KDJ',
  shortName: 'KDJ',
  precision: 2,
  calcParams: [9, 3, 3], // K period, D period, J period (J period is same as D period)
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    { key: 'k', title: 'K: ', type: 'line' },
    { key: 'd', title: 'D: ', type: 'line' },
    { key: 'j', title: 'J: ', type: 'line' }
  ],
  minValue: 0,
  maxValue: 100,
  styles: {
    lines: [
      {
        color: '#FF8C00', // Orange for K line
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      {
        color: '#0000FF', // Blue for D line
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      {
        color: '#800080', // Purple for J line
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const { calcParams } = indicator
    const [kPeriod, dPeriod] = calcParams as [number, number]
    
    return dataList.map((kLineData, i) => {
      const k = calculateK(dataList, i, kPeriod)
      const d = calculateD(dataList, i, kPeriod, dPeriod)
      const j = calculateJ(k, d)
      
      return {
        k,
        d,
        j
      }
    })
  }
}

/**
 * Calculate K value (Fast Stochastic)
 * K = (Close - Lowest Low) / (Highest High - Lowest Low) * 100
 */
function calculateK(dataList: KLineData[], index: number, period: number): number | undefined {
  if (index < period - 1) return undefined
  
  const startIndex = Math.max(0, index - period + 1)
  let highestHigh = -Infinity
  let lowestLow = Infinity
  
  for (let i = startIndex; i <= index; i++) {
    const data = dataList[i]
    if (data.high > highestHigh) highestHigh = data.high
    if (data.low < lowestLow) lowestLow = data.low
  }
  
  const currentClose = dataList[index].close
  const range = highestHigh - lowestLow
  
  if (range === 0) return 50 // Avoid division by zero
  
  return ((currentClose - lowestLow) / range) * 100
}

/**
 * Calculate D value (Slow Stochastic - Moving Average of K)
 */
function calculateD(dataList: KLineData[], index: number, kPeriod: number, dPeriod: number): number | undefined {
  if (index < kPeriod + dPeriod - 2) return undefined
  
  let sum = 0
  let count = 0
  
  for (let i = 0; i < dPeriod; i++) {
    const kIndex = index - i
    if (kIndex >= 0) {
      const kValue = calculateK(dataList, kIndex, kPeriod)
      if (kValue !== undefined) {
        sum += kValue
        count++
      }
    }
  }
  
  return count > 0 ? sum / count : undefined
}

/**
 * Calculate J value (Divergence Indicator)
 * J = 3 * K - 2 * D
 */
function calculateJ(k: number | undefined, d: number | undefined): number | undefined {
  if (k === undefined || d === undefined) return undefined
  return 3 * k - 2 * d
}