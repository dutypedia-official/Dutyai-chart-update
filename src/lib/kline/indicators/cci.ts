import type { IndicatorTemplate, KLineData } from 'klinecharts'
import * as kc from 'klinecharts'

/**
 * CCI (Commodity Channel Index) indicator
 * Measures the variation of a security's price from its statistical mean
 */
export const cci: IndicatorTemplate = {
  name: 'CCI',
  shortName: 'CCI',
  precision: 2,
  calcParams: [20], // Default period
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    { key: 'cci', title: 'CCI: ', type: 'line' }
  ],
  minValue: undefined,
  maxValue: undefined,
  styles: {
    lines: [
      {
        color: '#2563eb', // Default blue color for CCI line
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
      const cci = calculateCCI(dataList, i, period)
      
      return {
        cci
      }
    })
  }
}

/**
 * Calculate CCI value for a given period
 * CCI = (Typical Price - Simple Moving Average) / (0.015 * Mean Deviation)
 */
function calculateCCI(dataList: KLineData[], currentIndex: number, period: number): number | null {
  if (currentIndex < period - 1) {
    return null
  }
  
  // Calculate typical prices for the period
  const typicalPrices: number[] = []
  for (let i = currentIndex - period + 1; i <= currentIndex; i++) {
    const candle = dataList[i]
    const typicalPrice = (candle.high + candle.low + candle.close) / 3
    typicalPrices.push(typicalPrice)
  }
  
  // Calculate Simple Moving Average of typical prices
  const sma = typicalPrices.reduce((sum, price) => sum + price, 0) / period
  
  // Calculate Mean Deviation
  const meanDeviation = typicalPrices.reduce((sum, price) => sum + Math.abs(price - sma), 0) / period
  
  // Avoid division by zero
  if (meanDeviation === 0) {
    return 0
  }
  
  // Current typical price
  const currentCandle = dataList[currentIndex]
  const currentTypicalPrice = (currentCandle.high + currentCandle.low + currentCandle.close) / 3
  
  // Calculate CCI
  const cci = (currentTypicalPrice - sma) / (0.015 * meanDeviation)
  
  return cci
}

export default cci