import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';
import { computeVolcanicMove, DEFAULT_SETTINGS, type VolcanicMoveSettings } from './volcanicCore';

/**
 * Volcanic Move Detector (Pressure)
 * Sub-pane oscillator 0..1 indicating compression pressure buildup.
 * Draws a horizontal threshold and colors the line above threshold with a "hot" color.
 */
export const volcanicPressure: IndicatorTemplate = {
  name: 'VOLCANIC',
  shortName: 'VOLC',
  precision: 2,
  shouldOhlc: false,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  minValue: 0,
  maxValue: 1,
  figures: [
    {
      key: 'pressure',
      title: 'Pressure: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#60A5FA', // base cool color
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const p = indicator.calcParams as unknown[] | undefined;
    // Map calcParams array to settings with defaults
    const settings: Partial<VolcanicMoveSettings> = {
      bbPeriod: (p?.[0] as number) ?? DEFAULT_SETTINGS.bbPeriod,
      bbStdDev: (p?.[1] as number) ?? DEFAULT_SETTINGS.bbStdDev,
      atrPeriod: (p?.[2] as number) ?? DEFAULT_SETTINGS.atrPeriod,
      volMAPeriod: (p?.[3] as number) ?? DEFAULT_SETTINGS.volMAPeriod,
      lookbackForNorm: (p?.[4] as number) ?? DEFAULT_SETTINGS.lookbackForNorm,
      pressureSMA: (p?.[5] as number) ?? DEFAULT_SETTINGS.pressureSMA,
      minPressureForAlert: (p?.[6] as number) ?? DEFAULT_SETTINGS.minPressureForAlert,
      eruptionConfirmBars: (p?.[7] as number) ?? DEFAULT_SETTINGS.eruptionConfirmBars,
      minVolExpansion: (p?.[8] as number) ?? DEFAULT_SETTINGS.minVolExpansion,
      minRangeExpansion: (p?.[9] as number) ?? DEFAULT_SETTINGS.minRangeExpansion,
      minBreakoutBodyPct: (p?.[10] as number) ?? DEFAULT_SETTINGS.minBreakoutBodyPct,
      breakoutLookback: (p?.[11] as number) ?? DEFAULT_SETTINGS.breakoutLookback,
      minBarsBetweenEruptions: (p?.[12] as number) ?? DEFAULT_SETTINGS.minBarsBetweenEruptions,
      trendEMAPeriod: (p?.[13] as number) ?? (DEFAULT_SETTINGS as any).trendEMAPeriod ?? 50,
      requireTrendAlign: (p?.[14] as number) ?? 1,
      breakoutBufferPct: (p?.[15] as number) ?? 0.001,
      requireBBBandBreak: (p?.[16] as number) ?? 1,
      retestWindow: (p?.[17] as number) ?? 2
    };

    const { pressureSmoothed } = computeVolcanicMove(dataList, settings);

    return pressureSmoothed.map(val => ({
      pressure: Number.isFinite(val) ? val : null
    }));
  },
  // Custom draw to add threshold line and dynamic color when above threshold
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    const results = indicator.result as Array<{ pressure?: number | null }>;
    if (!results || results.length === 0) return false;

    const vr = chart.getVisibleRange();
    const from = Math.max(0, vr.from);
    const to = Math.min(results.length - 1, vr.to);

    const params = indicator.calcParams as number[] | undefined;
    const minPressureForAlert = (params?.[6] as number) ?? DEFAULT_SETTINGS.minPressureForAlert;

    const baseColor = indicator.styles?.lines?.[0]?.color || '#60A5FA';
    const hotColor = '#F59E0B';
    const lineWidth = indicator.styles?.lines?.[0]?.size || 2;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw threshold horizontal line
    const yThresh = yAxis.convertToPixel(minPressureForAlert);
    if (yThresh !== null) {
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(bounding.left, yThresh);
      ctx.lineTo(bounding.left + bounding.width, yThresh);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw pressure line with dynamic coloring above/below threshold
    let prevX: number | null = null;
    let prevY: number | null = null;
    let prevVal: number | null = null;

    for (let i = from; i <= to; i++) {
      const val = results[i]?.pressure ?? null;
      if (val === null || val === undefined) {
        prevX = prevY = prevVal = null;
        continue;
      }
      const x = xAxis.convertToPixel(i);
      const y = yAxis.convertToPixel(val);
      if (x === null || y === null) {
        prevX = prevY = prevVal = null;
        continue;
      }

      if (prevX !== null && prevY !== null && prevVal !== null) {
        // Choose color based on the current segment average relative to threshold
        const segAvg = (prevVal + val) / 2;
        ctx.strokeStyle = segAvg >= minPressureForAlert ? hotColor : baseColor;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      prevX = x;
      prevY = y;
      prevVal = val;
    }

    ctx.restore();
    // We drew the line ourselves; prevent default figure drawing
    return true;
  },
  // Tooltip for quick reading
  // @ts-expect-error - compatible with klinecharts tooltip hook
  createTooltipDataSource: ({ dataIndex, indicator, defaultStyles }) => {
    const row = (indicator.result as Array<{ pressure?: number | null }>)[dataIndex];
    if (!row) return { values: [] };
    const params = indicator.calcParams as number[] | undefined;
    const threshold = (params?.[6] as number) ?? DEFAULT_SETTINGS.minPressureForAlert;
    const pressure = row.pressure !== null && row.pressure !== undefined ? Number(row.pressure).toFixed(2) : '—';
    return {
      styles: defaultStyles,
      values: [
        { title: 'Pressure', value: pressure },
        { title: 'Alert ≥', value: Number(threshold).toFixed(2) }
      ]
    };
  }
};

export default volcanicPressure;


