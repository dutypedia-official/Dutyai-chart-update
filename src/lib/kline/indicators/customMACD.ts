import type { IndicatorTemplate } from 'klinecharts'

// TradingView-style MACD with fully filled histogram bars (no borders)
export const customMACD: IndicatorTemplate = {
  name: 'MACD',
  shortName: 'MACD',
  calcParams: [12, 26, 9],
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  precision: 4,
  styles: {
    lines: [
      { color: '#2563eb', size: 1, style: 0, dashedValue: [2, 2] }, // MACD line
      { color: '#dc2626', size: 1, style: 0, dashedValue: [2, 2] }  // Signal line
    ],
    bars: [
      {
        upColor: '#22c55e',
        downColor: '#ef4444',
        noChangeColor: '#22c55e',
        // explicitly ensure no borders are drawn by default engines
        borderSize: 0,
        borderColor: '#22c55e'
      }
    ]
  },
  figures: [
    { key: 'macd', title: 'MACD: ', type: 'line', baseValue: 0 },
    { key: 'signal', title: 'Signal: ', type: 'line', baseValue: 0 },
    { key: 'hist', title: 'Hist: ', type: 'bar', baseValue: 0 }
  ],
  calc: (dataList, indicator) => {
    const fast = (indicator.calcParams?.[0] as number) || 12
    const slow = (indicator.calcParams?.[1] as number) || 26
    const signalPeriod = (indicator.calcParams?.[2] as number) || 9

    const ema = (period: number, src: number[]): number[] => {
      const k = 2 / (period + 1)
      const out: number[] = []
      let prev: number | undefined
      for (let i = 0; i < src.length; i++) {
        const v = src[i]
        if (prev === undefined) {
          prev = v
        } else {
          prev = v * k + prev * (1 - k)
        }
        out.push(prev)
      }
      return out
    }

    const closes = dataList.map(d => d.close)
    const emaFast = ema(fast, closes)
    const emaSlow = ema(slow, closes)

    const macdLine: number[] = closes.map((_, i) => (emaFast[i] ?? NaN) - (emaSlow[i] ?? NaN))
    const signalLine = ema(signalPeriod, macdLine.map(v => (Number.isFinite(v) ? v : 0)))

    const result: Array<{ macd?: number; signal?: number; hist?: number }> = []
    for (let i = 0; i < dataList.length; i++) {
      if (!Number.isFinite(macdLine[i]) || !Number.isFinite(signalLine[i])) {
        result.push({})
        continue
      }
      const macd = macdLine[i]
      const signal = signalLine[i]
      const hist = (macd as number) - (signal as number)
      result.push({ macd, signal, hist })
    }
    return result
  },
  // Custom draw to guarantee filled histogram bars without borders
  // and crisp rendering when zoomed out (snap to pixel grid)
  draw: ({ ctx, chart, indicator, xAxis, yAxis }) => {
    if (!indicator.result || indicator.result.length === 0) return false

    const styles = indicator.styles || {}
    const upColor = styles?.bars?.[0]?.upColor || '#22c55e'
    const downColor = styles?.bars?.[0]?.downColor || '#ef4444'
    const noChangeColor = styles?.bars?.[0]?.noChangeColor || upColor

    const lineStyles = styles?.lines || []

    const visible = chart.getVisibleRange()
    const from = Math.max(visible.from, 0)
    const to = Math.min(visible.to, indicator.result.length - 1)

    // Draw histogram bars first (fully filled)
    ctx.save()
    for (let i = from; i <= to; i++) {
      const r = indicator.result[i] as any
      if (!r || typeof r.hist !== 'number') continue
      const x = xAxis.convertToPixel(i)
      const baseY = yAxis.convertToPixel(0)
      const valY = yAxis.convertToPixel(r.hist)
      const unitW = xAxis.convertToPixel(1) - xAxis.convertToPixel(0)
      const barWidth = Math.max(1, Math.floor(unitW * 0.8))
      const y = Math.min(baseY, valY)
      const h = Math.abs(baseY - valY)
      let color = noChangeColor
      if (r.hist > 0) color = upColor
      else if (r.hist < 0) color = downColor
      ctx.fillStyle = color
      const barX = Math.round(x - barWidth / 2)
      const barY = Math.round(y)
      const barH = Math.max(1, Math.round(h))
      ctx.fillRect(barX, barY, barWidth, barH)
    }
    ctx.restore()

    // Helper to draw a line path
    const drawLine = (key: 'macd' | 'signal', s: any) => {
      ctx.save()
      ctx.beginPath()
      ctx.lineWidth = s?.size ?? 1
      if (s?.style === 1) {
        ctx.setLineDash(s?.dashedValue ?? [4, 4])
      } else {
        ctx.setLineDash([])
      }
      ctx.strokeStyle = s?.color || '#ffffff'
      const lw = ctx.lineWidth
      const offset = (lw % 2 ? 0.5 : 0)
      ctx.lineCap = 'butt'
      ctx.lineJoin = 'miter'
      let first = true
      for (let i = from; i <= to; i++) {
        const r = indicator.result[i] as any
        if (!r || typeof r[key] !== 'number') continue
        const x = Math.round(xAxis.convertToPixel(i)) + offset
        const y = Math.round(yAxis.convertToPixel(r[key])) + offset
        if (first) {
          ctx.moveTo(x, y)
          first = false
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
      ctx.restore()
    }

    drawLine('macd', lineStyles[0])
    drawLine('signal', lineStyles[1])

    // we fully handled drawing; prevent default
    return true
  }
}

export default customMACD


