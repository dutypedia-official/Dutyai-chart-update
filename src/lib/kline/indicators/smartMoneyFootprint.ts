import type { IndicatorTemplate, KLineData, VisibleRange, XAxis, YAxis } from 'klinecharts';
import * as kc from 'klinecharts';

type SmartMoneyZoneType = 'accumulation' | 'distribution';

interface SmartMoneyZone {
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  low: number;
  high: number;
  type: SmartMoneyZoneType;
  score: number;              // 0..1
  priorReturn: number;        // prior trend % move
  avgVolumeFactor: number;    // avg volume factor in zone
  obvTrendScore: number;      // normalized OBV trend (-1..1)
}

interface SmfParams {
  zoneLookbackBars: number;
  minZoneBars: number;
  maxZoneBars: number;
  atrPeriod: number;
  volumeMAPeriod: number;
  minVolumeFactor: number;
  maxZoneWidthPct: number;
  priorTrendLookback: number;
  minOBVTrendStrength: number;
  minZoneScore: number;
  mergeNearbyZones: boolean;
  maxZonesDisplayed: number;
  showLabels: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function sma(values: number[], period: number): number[] {
  const n = values.length;
  const out = new Array(n).fill(0);
  if (period <= 1) {
    for (let i = 0; i < n; i++) out[i] = values[i] ?? 0;
    return out;
  }
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += values[i] ?? 0;
    if (i >= period) {
      sum -= values[i - period] ?? 0;
    }
    out[i] = i >= period - 1 ? sum / period : 0;
  }
  return out;
}

function computeATR(data: KLineData[], period: number): number[] {
  const n = data.length;
  const tr: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const h = data[i]?.high ?? 0;
    const l = data[i]?.low ?? 0;
    if (i === 0) {
      tr[i] = Math.max(0, h - l);
    } else {
      const pc = data[i - 1]?.close ?? 0;
      tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }
  }
  return sma(tr, Math.max(1, period));
}

function computeOBV(data: KLineData[]): number[] {
  const n = data.length;
  const obv: number[] = new Array(n).fill(0);
  let curr = 0;
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      curr = 0;
    } else {
      const c = data[i]?.close ?? 0;
      const pc = data[i - 1]?.close ?? 0;
      const v = data[i]?.volume ?? 0;
      if (c > pc) curr += v;
      else if (c < pc) curr -= v;
      // else unchanged
    }
    obv[i] = curr;
  }
  return obv;
}

function avg(arr: number[], s: number, e: number): number {
  let sum = 0;
  let cnt = 0;
  for (let i = s; i <= e; i++) {
    sum += arr[i] ?? 0;
    cnt++;
  }
  return cnt > 0 ? sum / cnt : 0;
}

function sliceMax(arr: number[], s: number, e: number): number {
  let m = -Infinity;
  for (let i = s; i <= e; i++) {
    const v = arr[i] ?? -Infinity;
    if (v > m) m = v;
  }
  return m === -Infinity ? 0 : m;
}
function sliceMin(arr: number[], s: number, e: number): number {
  let m = Infinity;
  for (let i = s; i <= e; i++) {
    const v = arr[i] ?? Infinity;
    if (v < m) m = v;
  }
  return m === Infinity ? 0 : m;
}

function computeObvTrendScore(obv: number[], s: number, e: number, avgVolume: number): number {
  if (e <= s) return 0;
  const slope = (obv[e] - obv[s]) / (e - s);
  const norm = avgVolume > 0 ? slope / (avgVolume * 5) : 0; // heuristic normalization
  return clamp(norm, -1, 1);
}

function calcPriorReturn(data: KLineData[], startIndex: number, lookback: number): number {
  const priorStart = Math.max(0, startIndex - lookback);
  const priorEnd = Math.max(0, startIndex - 1);
  const startClose = data[priorStart]?.close ?? 0;
  const endClose = data[priorEnd]?.close ?? 0;
  if (startClose <= 0) return 0;
  return (endClose - startClose) / startClose;
}

function classifyAndScore(
  data: KLineData[],
  obv: number[],
  atr: number[],
  volFactor: number[],
  s: number,
  e: number,
  cfg: SmfParams
): SmartMoneyZone | null {
  const highs: number[] = [];
  const lows: number[] = [];
  const closes: number[] = [];
  for (let i = s; i <= e; i++) {
    highs.push(data[i]?.high ?? 0);
    lows.push(data[i]?.low ?? 0);
    closes.push(data[i]?.close ?? 0);
  }
  const zoneHigh = Math.max(...highs);
  const zoneLow = Math.min(...lows);
  const zoneMid = (zoneHigh + zoneLow) / 2;
  const width = zoneHigh - zoneLow;
  if (zoneMid <= 0) return null;
  const zoneWidthPct = width / zoneMid;
  if (!isFinite(zoneWidthPct) || zoneWidthPct <= 0) return null;
  if (zoneWidthPct > cfg.maxZoneWidthPct) return null; // compression requirement

  // Volume health
  const avgVolFactor = avg(volFactor, s, e);
  if (!(avgVolFactor >= cfg.minVolumeFactor)) return null;

  // Range consistency vs ATR
  const ranges: number[] = [];
  for (let i = s; i <= e; i++) ranges.push((data[i]?.high ?? 0) - (data[i]?.low ?? 0));
  const avgRange = ranges.length ? ranges.reduce((a, b) => a + b, 0) / ranges.length : 0;
  const atrAvg = avg(atr, s, e);
  if (atrAvg > 0 && avgRange / atrAvg > 1.8) {
    // avoid crazy whipsaws
    return null;
  }

  // Close position distribution
  let sumPos = 0;
  let bull = 0;
  let bear = 0;
  for (let i = s; i <= e; i++) {
    const c = data[i]?.close ?? 0;
    const o = data[i]?.open ?? 0;
    const pos = width > 0 ? clamp((c - zoneLow) / width, 0, 1) : 0.5;
    sumPos += pos;
    if (c > o) bull++;
    else if (c < o) bear++;
  }
  const avgClosePos = (sumPos / Math.max(1, e - s + 1)) || 0.5;

  // Prior trend
  const priorReturn = calcPriorReturn(data, s, cfg.priorTrendLookback);
  const priorDown = priorReturn <= -0.05; // -5%
  const priorUp = priorReturn >= 0.05; // +5%
  const trendScoreDown = priorDown ? clamp(Math.abs(priorReturn) / 0.15, 0, 1) : 0;
  const trendScoreUp = priorUp ? clamp(Math.abs(priorReturn) / 0.15, 0, 1) : 0;

  // OBV trend
  const avgVol = avg(data.map(d => d?.volume ?? 0), s, e);
  const obvTrendScore = computeObvTrendScore(obv, s, e, avgVol); // -1..1

  const closeBiasScore = clamp((avgClosePos - 0.5) / 0.3 + 0.5, 0, 1); // 0..1, higher => upper bias
  const volumeScore = clamp((avgVolFactor - cfg.minVolumeFactor) / Math.max(1e-6, cfg.minVolumeFactor), 0, 1);

  const w1 = 0.3, w2 = 0.3, w3 = 0.2, w4 = 0.2;

  const accumulationScore =
    w1 * trendScoreDown +
    w2 * clamp((obvTrendScore - cfg.minOBVTrendStrength) / (1 - cfg.minOBVTrendStrength), 0, 1) +
    w3 * closeBiasScore +
    w4 * volumeScore;

  const distributionScore =
    w1 * trendScoreUp +
    w2 * clamp(((-obvTrendScore) - cfg.minOBVTrendStrength) / (1 - cfg.minOBVTrendStrength), 0, 1) +
    w3 * (1 - closeBiasScore) +
    w4 * volumeScore;

  const zoneScore = clamp(Math.max(accumulationScore, distributionScore), 0, 1);
  if (zoneScore < cfg.minZoneScore) return null;

  const type: SmartMoneyZoneType = accumulationScore > distributionScore ? 'accumulation' : 'distribution';
  return {
    startIndex: s,
    endIndex: e,
    startTime: (data[s]?.timestamp as number) ?? 0,
    endTime: (data[e]?.timestamp as number) ?? 0,
    low: zoneLow,
    high: zoneHigh,
    type,
    score: zoneScore,
    priorReturn,
    avgVolumeFactor: avgVolFactor,
    obvTrendScore
  };
}

function mergeZones(zones: SmartMoneyZone[], cfg: SmfParams): SmartMoneyZone[] {
  if (!cfg.mergeNearbyZones || zones.length <= 1) return zones.slice(0, cfg.maxZonesDisplayed);
  const sorted = zones.slice().sort((a, b) => a.startIndex - b.startIndex);
  const merged: SmartMoneyZone[] = [];
  const gapBars = Math.max(2, Math.floor(cfg.minZoneBars / 2));
  const priceOverlapPct = Math.max(0.01, cfg.maxZoneWidthPct * 1.5);

  function priceRangesClose(a: SmartMoneyZone, b: SmartMoneyZone): boolean {
    const midA = (a.low + a.high) / 2;
    const midB = (b.low + b.high) / 2;
    if (midA <= 0 || midB <= 0) return false;
    return Math.abs(midA - midB) / ((midA + midB) / 2) <= priceOverlapPct;
  }

  for (const z of sorted) {
    if (merged.length === 0) {
      merged.push(z);
      continue;
    }
    const last = merged[merged.length - 1];
    const overlap = z.startIndex <= last.endIndex + gapBars;
    if (overlap && z.type === last.type && priceRangesClose(last, z)) {
      const low = Math.min(last.low, z.low);
      const high = Math.max(last.high, z.high);
      merged[merged.length - 1] = {
        startIndex: Math.min(last.startIndex, z.startIndex),
        endIndex: Math.max(last.endIndex, z.endIndex),
        startTime: Math.min(last.startTime, z.startTime),
        endTime: Math.max(last.endTime, z.endTime),
        low,
        high,
        type: last.type,
        score: Math.max(last.score, z.score),
        priorReturn: Math.abs(z.score) >= Math.abs(last.score) ? z.priorReturn : last.priorReturn,
        avgVolumeFactor: (last.avgVolumeFactor + z.avgVolumeFactor) / 2,
        obvTrendScore: (last.obvTrendScore + z.obvTrendScore) / 2
      };
    } else {
      merged.push(z);
    }
  }

  // limit by score
  return merged
    .sort((a, b) => b.score - a.score)
    .slice(0, cfg.maxZonesDisplayed)
    .sort((a, b) => a.startIndex - b.startIndex);
}

export const smartMoneyFootprint: IndicatorTemplate = {
  name: 'SMART_MONEY',
  shortName: 'SMF',
  precision: 2,
  shouldOhlc: true,
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  figures: [],
  styles: {
    // custom draw, provide defaults for potential future style overrides
  },

  calc: (dataList: KLineData[], indicator) => {
    const p = indicator.calcParams || [];
    const cfg: SmfParams = {
      zoneLookbackBars: Math.max(10, (p[0] as number) ?? 40),
      minZoneBars: Math.max(3, (p[1] as number) ?? 5),
      maxZoneBars: Math.max(5, (p[2] as number) ?? 25),
      atrPeriod: Math.max(1, (p[3] as number) ?? 14),
      volumeMAPeriod: Math.max(1, (p[4] as number) ?? 20),
      minVolumeFactor: (p[5] as number) ?? 1.2,
      maxZoneWidthPct: (p[6] as number) ?? 0.03,
      priorTrendLookback: Math.max(1, (p[7] as number) ?? 20),
      minOBVTrendStrength: (p[8] as number) ?? 0.2,
      minZoneScore: (p[9] as number) ?? 0.6,
      mergeNearbyZones: ((p[10] as number) ?? 1) > 0,
      maxZonesDisplayed: Math.max(1, (p[11] as number) ?? 20),
      showLabels: ((p[12] as number) ?? 1) > 0
    };

    const n = dataList.length;
    const result: any[] = new Array(n).fill({});
    if (n === 0) {
      (indicator as any).zones = [];
      (indicator as any).cfg = cfg;
      return result;
    }

    const atr = computeATR(dataList, cfg.atrPeriod);
    const volumes = dataList.map(d => d?.volume ?? 0);
    const volMA = sma(volumes, cfg.volumeMAPeriod);
    const volFactor = volumes.map((v, i) => {
      const denom = volMA[i] || 0;
      return denom > 0 ? v / denom : 0;
    });
    const obv = computeOBV(dataList);

    let zones: SmartMoneyZone[] = [];
    // sliding window
    for (let i = 0; i < n; i++) {
      const endIndex = i;
      const windowMax = Math.min(cfg.zoneLookbackBars, endIndex + 1);
      // Try a few window sizes to keep compute reasonable
      const candidates: number[] = [];
      const minW = cfg.minZoneBars;
      const maxW = Math.min(cfg.maxZoneBars, windowMax);
      if (maxW >= minW) {
        const midW = Math.floor((minW + maxW) / 2);
        candidates.push(minW);
        if (midW !== minW && midW !== maxW) candidates.push(midW);
        if (maxW !== minW) candidates.push(maxW);
      }
      for (const w of candidates) {
        const s = endIndex - w + 1;
        if (s < 0) continue;
        const zone = classifyAndScore(dataList, obv, atr, volFactor, s, endIndex, cfg);
        if (zone) zones.push(zone);
      }
    }

    let finalized = mergeZones(zones, cfg);

    // Fallback pass with looser thresholds if nothing detected
    if (finalized.length === 0 && n >= Math.max(60, cfg.minZoneBars * 4)) {
      const looseCfg: SmfParams = {
        ...cfg,
        maxZoneWidthPct: cfg.maxZoneWidthPct * 2,
        minVolumeFactor: Math.min(cfg.minVolumeFactor, 0.9),
        minOBVTrendStrength: Math.max(0.05, cfg.minOBVTrendStrength * 0.5),
        minZoneScore: Math.max(0.4, cfg.minZoneScore - 0.15)
      };
      zones = [];
      for (let i = 0; i < n; i++) {
        const endIndex = i;
        const windowMax = Math.min(looseCfg.zoneLookbackBars, endIndex + 1);
        const candidates: number[] = [];
        const minW = looseCfg.minZoneBars;
        const maxW = Math.min(looseCfg.maxZoneBars, windowMax);
        if (maxW >= minW) {
          const midW = Math.floor((minW + maxW) / 2);
          candidates.push(minW);
          if (midW !== minW && midW !== maxW) candidates.push(midW);
          if (maxW !== minW) candidates.push(maxW);
        }
        for (const w of candidates) {
          const s = endIndex - w + 1;
          if (s < 0) continue;
          const zone = classifyAndScore(dataList, obv, atr, volFactor, s, endIndex, looseCfg);
          if (zone) zones.push(zone);
        }
      }
      finalized = mergeZones(zones, looseCfg);
    }

    (indicator as any).zones = finalized;
    (indicator as any).cfg = cfg;
    return result;
  },

  draw: ({ ctx, chart, indicator, xAxis, yAxis }) => {
    const zones: SmartMoneyZone[] = (indicator as any).zones || [];
    if (!zones.length) return false;
    const cfg: SmfParams = (indicator as any).cfg || {};

    const vr: VisibleRange = chart.getVisibleRange();
    const from = Math.max(0, vr.from);
    const to = vr.to;

    // Colors
    const accFill = 'rgba(16, 185, 129, 0.28)'; // slightly more visible
    const accBorder = 'rgba(16, 185, 129, 0.7)';
    const distFill = 'rgba(239, 68, 68, 0.28)'; // slightly more visible
    const distBorder = 'rgba(239, 68, 68, 0.7)';

    ctx.save();

    for (const z of zones) {
      // skip if completely outside view
      if (z.endIndex < from || z.startIndex > to) continue;
      const x1 = (xAxis as XAxis).convertToPixel(z.startIndex);
      const x2 = (xAxis as XAxis).convertToPixel(z.endIndex);
      const yHigh = (yAxis as YAxis).convertToPixel(z.high);
      const yLow = (yAxis as YAxis).convertToPixel(z.low);
      if (!isFinite(x1) || !isFinite(x2) || yHigh == null || yLow == null) continue;

      const left = Math.min(x1, x2);
      const width = Math.max(1, Math.abs(x2 - x1));
      const top = Math.min(yHigh, yLow);
      const height = Math.abs(yHigh - yLow);

      // Fill
      ctx.fillStyle = z.type === 'accumulation' ? accFill : distFill;
      // @ts-expect-error - roundRect may not exist on older canvases
      const drawRect = ctx.roundRect ?? ctx.rect;
      ctx.beginPath();
      // Prefer rounded corners a little for modern look
      try {
        // @ts-expect-error - roundRect signature
        drawRect.call(ctx, left, top, width, height, 4);
      } catch {
        ctx.rect(left, top, width, height);
      }
      ctx.closePath();
      ctx.fill();

      // Border
      ctx.strokeStyle = z.type === 'accumulation' ? accBorder : distBorder;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.stroke();

      // Label
      if (cfg.showLabels) {
        const label = `${z.type === 'accumulation' ? 'Accumulation' : 'Distribution'} (${z.score.toFixed(2)})`;
        const lx = left + width + 6; // right edge with a small offset
        const ly = top + height / 2;

        ctx.save();
        ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const color = z.type === 'accumulation' ? '#10B981' : '#EF4444';
        const bg = 'rgba(0,0,0,0.55)';
        const padX = 6, padY = 3;
        const metrics = ctx.measureText(label);
        const w = Math.ceil(metrics.width) + padX * 2;
        const h = 16;
        const rx = 4;
        const bx = lx;
        const by = ly - h / 2;

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
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(label, bx + padX, ly + 0.5);
        ctx.restore();
      }
    }

    ctx.restore();
    return true;
  },

  // Tooltip: show zone info if cursor is within any zone at dataIndex
  // @ts-expect-error - klinecharts typing may vary by version
  createTooltipDataSource: ({ dataIndex, indicator, defaultStyles }) => {
    const zones: SmartMoneyZone[] = (indicator as any).zones || [];
    const z = zones.find(zz => dataIndex >= zz.startIndex && dataIndex <= zz.endIndex);
    if (!z) return { values: [] };
    const typeText = z.type === 'accumulation' ? 'Accumulation' : 'Distribution';
    const durationBars = z.endIndex - z.startIndex + 1;
    return {
      styles: defaultStyles,
      values: [
        { title: 'Footprint', value: typeText },
        { title: 'Score', value: z.score.toFixed(2) },
        { title: 'Price', value: `${z.low.toFixed(indicator.precision ?? 2)}–${z.high.toFixed(indicator.precision ?? 2)}` },
        { title: 'Duration', value: `${durationBars} bars` },
        { title: 'Prior Trend', value: `${(z.priorReturn * 100).toFixed(1)}%` },
        { title: 'Avg Volume x', value: z.avgVolumeFactor.toFixed(2) },
        { title: 'OBV Trend', value: z.obvTrendScore > 0.05 ? 'Up' : (z.obvTrendScore < -0.05 ? 'Down' : 'Flat') }
      ]
    };
  }
};

export default smartMoneyFootprint;


