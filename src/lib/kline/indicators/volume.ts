import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * Volume indicator with EMA and proper up/down color logic
 */
export const volume: IndicatorTemplate = {
  name: 'VOL',
  shortName: 'VOL',
  precision: 0,
  calcParams: [20], // EMA period
  shouldOhlc: false,
  shouldFormatBigNumber: true,
  visible: true,
  // Draw underneath candles when stacked on main pane
  zLevel: -1,
  extendData: undefined,
  // Empty figures so this indicator does NOT affect main pane y-axis scaling
  figures: [],
  styles: {
    bars: [
      {
        upColor: '#26a69a', // Green for up volume
        downColor: '#ef5350', // Red for down volume
        noChangeColor: '#26a69a',
        // Default 70% opacity for volume histogram bars
        // Consumers may override with styles.bars[0].opacity
        opacity: 0.7 as unknown as number
      }
    ],
    lines: [
      {
        color: '#8B5CF6', // Purple for EMA line
        size: 1, // 1 pixel thickness as requested
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const params = indicator.calcParams as number[];
    const period = params[0] || 20;
    const result: any[] = [];

    // Calculate volume and EMA
    for (let i = 0; i < dataList.length; i++) {
      const kLineData = dataList[i];
      const volume = kLineData.volume || 0;

      // Calculate EMA
      let ema = 0;
      if (i === 0) {
        ema = volume;
      } else {
        const multiplier = 2 / (period + 1);
        const prevEma = result[i - 1]?.ema || volume;
        ema = volume * multiplier + prevEma * (1 - multiplier);
      }

      result.push({
        volume,
        ema
      });
    }

    return result;
  },
  
  // Custom draw function for volume bars with proper color logic
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    if (!indicator.result || indicator.result.length === 0) return false;

    const visibleRange = chart.getVisibleRange();
    if (!visibleRange) return false;

    const { from, to } = visibleRange;
    const dataList = chart.getDataList();
    
    if (!dataList || dataList.length === 0) return false;

    // Get colors from styles
    const upColor = indicator.styles?.bars?.[0]?.upColor || '#26a69a';
    const downColor = indicator.styles?.bars?.[0]?.downColor || '#ef5350';
    const noChangeColor = indicator.styles?.bars?.[0]?.noChangeColor || '#26a69a';
    const emaColor = indicator.styles?.lines?.[0]?.color || '#8B5CF6';
    
    ctx.save();

    // Determine visible max volume for relative scaling
    let maxVol = 0;
    for (let i = from; i <= to && i < indicator.result.length; i++) {
      const d = indicator.result[i] as any;
      if (!d) continue;
      if (d.volume != null && d.volume > maxVol) maxVol = d.volume;
      if (d.ema != null && d.ema > maxVol) maxVol = Math.max(maxVol, d.ema);
    }
    if (maxVol <= 0) {
      ctx.restore();
      return true;
    }

    // Reserve a bottom band for volume (e.g., 22% of pane height)
    const bandRatio = 0.22;
    const bandHeight = Math.max(10, Math.floor(bounding.height * bandRatio));
    const bandBottomY = bounding.top + bounding.height - 1;
    const bandTopY = bandBottomY - bandHeight;
    // Reduce effective drawing height by an additional 20% (total ~44% shorter from original)
    const effectiveScale = 0.56;
    const effectiveBandHeight = Math.max(1, Math.floor(bandHeight * effectiveScale));

    // Draw volume bars scaled into the reserved band (does not affect price axis)
    for (let i = from; i <= to && i < indicator.result.length && i < dataList.length; i++) {
      const data = indicator.result[i] as any;
      if (!data || data.volume == null) continue;
      
      const currentCandle = dataList[i];
      const previousCandle = i > 0 && i - 1 < dataList.length ? dataList[i - 1] : null;
      
      // Determine bar color based on price movement
      let barColor = noChangeColor;
      if (previousCandle && currentCandle && typeof currentCandle.close === 'number' && typeof previousCandle.close === 'number') {
        if (currentCandle.close > previousCandle.close) {
          barColor = upColor;
        } else if (currentCandle.close < previousCandle.close) {
          barColor = downColor;
        }
      }
      
      const x = xAxis.convertToPixel(i);
      const valueRatio = Math.min(1, data.volume / maxVol);
      const barHeight = Math.max(1, Math.floor(valueRatio * effectiveBandHeight));
      const y = bandBottomY - barHeight;
      
      // Calculate bar width (similar to candlestick width)
      const barWidth = Math.max(1, (xAxis.convertToPixel(1) - xAxis.convertToPixel(0)) * 0.8);
      
      // Apply opacity: prefer explicit bars[0].opacity; else parse alpha from color (rgba); else default 0.7
      const configuredOpacity = (indicator as any)?.styles?.bars?.[0]?.opacity;
      let opacity = typeof configuredOpacity === 'number' ? configuredOpacity : undefined;
      if (opacity == null) {
        const m = (barColor || '').toString().match(/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i);
        if (m) {
          const a = m[1] != null ? parseFloat(m[1]) : 1;
          opacity = isNaN(a) ? 0.7 : a;
        } else {
          opacity = 0.7;
        }
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
      ctx.fillStyle = barColor;
      ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
    }
    // Reset alpha for subsequent drawings
    ctx.globalAlpha = 1;

    // Draw EMA line within the same band (+ triangle fill if visible)
    const emaVisible = (indicator as any)?.styles?.lines?.[0]?.visible !== false;
    if (emaVisible) {
      const lineStyle = indicator.styles?.lines?.[0]?.style || kc.LineType.Solid;
      const lineSize = indicator.styles?.lines?.[0]?.size || 1;
      const dashedValue = indicator.styles?.lines?.[0]?.dashedValue || [2, 2];
      ctx.lineWidth = lineSize;
      ctx.strokeStyle = emaColor;
      if (lineStyle === kc.LineType.Dashed) {
        ctx.setLineDash(dashedValue);
      } else {
        ctx.setLineDash([]);
      }

      // Collect points for fill and line
      const pts: Array<{x:number,y:number}> = [];
      for (let i = from; i <= to && i < indicator.result.length; i++) {
        const data = indicator.result[i] as any;
        if (!data || data.ema == null) continue;
        const x = xAxis.convertToPixel(i);
        const ratio = Math.min(1, data.ema / maxVol);
        const y = bandBottomY - Math.floor(ratio * effectiveBandHeight);
        pts.push({ x, y });
      }

      if (pts.length > 1) {
        // Triangle fill under EMA within the band
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0].x, bandBottomY);
        for (const p of pts) ctx.lineTo(p.x, p.y);
        ctx.lineTo(pts[pts.length - 1].x, bandBottomY);
        ctx.closePath();
        // 25% opacity fill
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = emaColor;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();

        // Stroke EMA line on top
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      }
    }
    
    ctx.restore();
    return true; // We handled all drawing, don't use default rendering
  }
};

export default volume;