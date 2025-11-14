import type { IndicatorTemplate, KLineData, VisibleRange, XAxis, YAxis } from 'klinecharts';
import * as kc from 'klinecharts';
import { computeVolcanicMove, DEFAULT_SETTINGS, type VolcanicMoveSettings, type VolcanicEruption } from './volcanicCore';

interface EruptionRow {
  bull?: boolean;
  bear?: boolean;
  pressure?: number;
  rangeExpansion?: number;
  volumeFactor?: number;
  breakoutLevel?: number;
}

/**
 * Volcanic Move Detector (Eruption Signals)
 * Overlay indicator to render eruption markers/labels on the main price chart.
 */
export const volcanicEruptions: IndicatorTemplate = {
  name: 'VOLCANIC_SIG',
  shortName: 'VOLCSIG',
  precision: 2,
  shouldOhlc: true,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  figures: [],
  styles: {
    texts: [{ color: '#ffffff', size: 10 }]
  },
  calc: (dataList: KLineData[], indicator) => {
    const p = indicator.calcParams as unknown[] | undefined;
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
    const { eruptions } = computeVolcanicMove(dataList, settings);

    const rows: EruptionRow[] = new Array(dataList.length).fill(null).map(() => ({}));
    eruptions.forEach(e => {
      const r = rows[e.index] || {};
      if (e.direction === 'bullish') r.bull = true;
      if (e.direction === 'bearish') r.bear = true;
      r.pressure = e.pressureAtSignal;
      r.rangeExpansion = e.rangeExpansion;
      r.volumeFactor = e.volumeFactor;
      r.breakoutLevel = e.breakoutLevel;
      rows[e.index] = r;
    });
    return rows;
  },
  draw: ({ ctx, chart, indicator, xAxis, yAxis }) => {
    const res = indicator.result as EruptionRow[] | undefined;
    if (!res || res.length === 0) return false;

    const dataList = chart.getDataList();
    const vr: VisibleRange = chart.getVisibleRange();
    const from = Math.max(0, vr.from);
    const to = Math.min(res.length - 1, vr.to);

    function drawMarker(x: number, y: number, color: string, up: boolean) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      if (up) {
        // marker below candle (bullish): upward triangle
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x - 5, y - 4);
        ctx.lineTo(x + 5, y - 4);
      } else {
        // marker above candle (bearish): downward triangle
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x - 5, y + 4);
        ctx.lineTo(x + 5, y + 4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawLabel(x: number, y: number, text: string, color: string) {
      ctx.save();
      ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // background
      const padX = 6;
      const h = 16;
      const metrics = ctx.measureText(text);
      const w = Math.ceil(metrics.width) + padX * 2;
      const rx = 4;
      const bx = x - w / 2;
      const by = y - h / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.moveTo(bx + rx, by);
      ctx.lineTo(bx + w - rx, by);
      ctx.quadraticCurveTo(bx + w, by, bx + w, by + rx);
      ctx.lineTo(bx + w, by + h - rx);
      ctx.quadraticCurveTo(bx + w, by + h, bx + w - rx, by + h);
      ctx.lineTo(bx + rx, by + h);
      ctx.quadraticCurveTo(bx, by + h, bx, by + h - rx);
      ctx.lineTo(bx, by + rx);
      ctx.quadraticCurveTo(bx, by, bx + rx, by);
      ctx.closePath();
      ctx.fill();
      // text
      ctx.fillStyle = color;
      ctx.fillText(text, x, y + 0.5);
      ctx.restore();
    }

    for (let i = from; i <= to; i++) {
      const row = res[i];
      if (!row || (!row.bull && !row.bear)) continue;
      const x = (xAxis as XAxis).convertToPixel(i);
      const k = dataList[i];
      if (!k) continue;

      if (row.bull) {
        const y = (yAxis as YAxis).convertToPixel(k.low) + 12;
        drawMarker(x, y, '#F59E0B', true);
        drawLabel(x, y + 16, 'Volcanic Move (Bullish)', '#F59E0B');
      }
      if (row.bear) {
        const y = (yAxis as YAxis).convertToPixel(k.high) - 12;
        drawMarker(x, y, '#EF4444', false);
        drawLabel(x, y - 16, 'Volcanic Move (Bearish)', '#EF4444');
      }
    }
    return true;
  },
  // Tooltip shows eruption metrics
  // @ts-expect-error - klinecharts typing may vary by version
  createTooltipDataSource: ({ dataIndex, indicator, defaultStyles }) => {
    const res = (indicator.result as EruptionRow[])?.[dataIndex];
    if (!res || (!res.bull && !res.bear)) return { values: [] };
    const dir = res.bull ? 'Bullish' : 'Bearish';
    const pressure = res.pressure !== undefined ? Number(res.pressure).toFixed(2) : '—';
    const rangeExp = res.rangeExpansion !== undefined ? Number(res.rangeExpansion).toFixed(2) : '—';
    const volFactor = res.volumeFactor !== undefined ? Number(res.volumeFactor).toFixed(2) : '—';
    return {
      styles: defaultStyles,
      values: [
        { title: 'Eruption', value: dir },
        { title: 'Pressure', value: pressure },
        { title: 'Range x', value: rangeExp },
        { title: 'Volume x', value: volFactor }
      ]
    };
  }
};

export default volcanicEruptions;


