import type { IndicatorTemplate, KLineData } from 'klinecharts'
import * as kc from 'klinecharts'

/**
 * TRIX (Triple Exponential Average) indicator
 * Calculates the rate of change of a triple exponentially smoothed moving average
 * 
 * TRIX = (EMA3(today) - EMA3(yesterday)) / EMA3(yesterday) * 100
 * Signal = EMA of TRIX
 */
export const trix: IndicatorTemplate = {
  name: 'TRIX',
  shortName: 'TRIX',
  precision: 4,
  calcParams: [14, 9], // [TRIX period, Signal period]
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    { key: 'trix', title: 'TRIX: ', type: 'line' },
    { key: 'signal', title: 'Signal: ', type: 'line' }
  ],
  minValue: undefined,
  maxValue: undefined,
  styles: {
    lines: [
      {
        color: '#2563eb', // Default blue color for TRIX line
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      },
      {
        color: '#dc2626', // Default red color for Signal line
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const { calcParams } = indicator
    const [trixPeriod, signalPeriod] = calcParams as [number, number]
    
    // Calculate TRIX values
    const trixValues = calculateTRIX(dataList, trixPeriod)
    
    // Calculate Signal line (EMA of TRIX)
    const signalValues = calculateEMA(trixValues, signalPeriod)
    
    return dataList.map((_, i) => {
      return {
        trix: trixValues[i],
        signal: signalValues[i]
      }
    })
  }
}

/**
 * Calculate TRIX values
 */
function calculateTRIX(dataList: KLineData[], period: number): (number | null)[] {
  const prices = dataList.map(d => d.close)
  
  // First EMA
  const ema1 = calculateEMA(prices, period)
  
  // Second EMA (EMA of EMA1)
  const ema2 = calculateEMA(ema1, period)
  
  // Third EMA (EMA of EMA2)
  const ema3 = calculateEMA(ema2, period)
  
  // Calculate TRIX as rate of change of EMA3
  const trixValues: (number | null)[] = []
  
  for (let i = 0; i < ema3.length; i++) {
    if (i === 0 || ema3[i] === null || ema3[i - 1] === null || ema3[i - 1] === 0) {
      trixValues.push(null)
    } else {
      const trix = ((ema3[i]! - ema3[i - 1]!) / ema3[i - 1]!) * 10000 // Multiply by 10000 for better readability
      trixValues.push(trix)
    }
  }
  
  return trixValues
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(values: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const multiplier = 2 / (period + 1)
  let ema: number | null = null
  
  for (let i = 0; i < values.length; i++) {
    if (values[i] === null) {
      result.push(null)
      continue
    }
    
    if (ema === null) {
      // Use SMA for the first value
      if (i >= period - 1) {
        let sum = 0
        let count = 0
        for (let j = i - period + 1; j <= i; j++) {
          if (values[j] !== null) {
            sum += values[j]!
            count++
          }
        }
        ema = count > 0 ? sum / count : null
      }
    } else {
      ema = (values[i]! * multiplier) + (ema * (1 - multiplier))
    }
    
    result.push(ema)
  }
  
  return result
}

export default trix