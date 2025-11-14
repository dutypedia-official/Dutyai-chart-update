import type { KLineData } from 'klinecharts';

export type EruptionDirection = 'bullish' | 'bearish';

export interface VolcanicEruption {
  index: number;
  time: number;
  direction: EruptionDirection;
  pressureAtSignal: number;
  rangeExpansion: number;
  volumeFactor: number;
  breakoutLevel: number;
}

export interface VolcanicMoveSettings {
  bbPeriod: number;
  bbStdDev: number;
  atrPeriod: number;
  volMAPeriod: number;
  lookbackForNorm: number;
  pressureSMA: number;
  minPressureForAlert: number;
  eruptionConfirmBars: number;
  minVolExpansion: number;
  minRangeExpansion: number;
  minBreakoutBodyPct: number;
  breakoutLookback: number;
  // Weights
  w1?: number;
  w2?: number;
  w3?: number;
  // Debounce eruptions
  minBarsBetweenEruptions?: number;
  // Accuracy refinements
  trendEMAPeriod?: number;
  requireTrendAlign?: number; // 0/1
  breakoutBufferPct?: number; // e.g., 0.001 = 0.1%
  requireBBBandBreak?: number; // 0/1 - require close beyond BB upper/lower
  retestWindow?: number; // bars to check closes hold above/below breakout level
}

export const DEFAULT_SETTINGS: VolcanicMoveSettings = {
  bbPeriod: 16,
  bbStdDev: 2.0,
  atrPeriod: 14,
  volMAPeriod: 20,
  lookbackForNorm: 60,
  pressureSMA: 2,
  minPressureForAlert: 0.55,
  eruptionConfirmBars: 1,
  minVolExpansion: 1.0,
  minRangeExpansion: 1.0,
  minBreakoutBodyPct: 0.5,
  breakoutLookback: 10,
  w1: 0.5,
  w2: 0.3,
  w3: 0.2,
  minBarsBetweenEruptions: 1,
  // New accuracy-related defaults tuned for speed
  trendEMAPeriod: 30,
  requireTrendAlign: 0,
  breakoutBufferPct: 0.0007,
  requireBBBandBreak: 0,
  retestWindow: 1
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sma(values: number[], period: number): number[] {
  const res: number[] = new Array(values.length).fill(0);
  if (period <= 1) {
    for (let i = 0; i < values.length; i++) res[i] = values[i] ?? 0;
    return res;
  }
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
    if (i >= period) {
      sum -= values[i - period] ?? 0;
    }
    res[i] = i >= period - 1 ? sum / period : NaN;
  }
  return res;
}

function stdDev(values: number[], period: number): number[] {
  const res: number[] = new Array(values.length).fill(NaN);
  if (period <= 1) return values.map(() => 0);
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j] ?? 0;
    const mean = sum / period;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = (values[j] ?? 0) - mean;
      variance += d * d;
    }
    res[i] = Math.sqrt(variance / period);
  }
  return res;
}

function ema(values: number[], period: number): number[] {
  const res: number[] = new Array(values.length).fill(NaN);
  if (period <= 1) return values.slice();
  const k = 2 / (period + 1);
  let prev = NaN;
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? 0;
    if (!Number.isFinite(prev)) {
      // seed EMA with SMA of first period
      if (i >= period - 1) {
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) sum += values[j] ?? 0;
        prev = sum / period;
        res[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      res[i] = prev;
    }
  }
  return res;
}

function trueRange(curr: KLineData, prev?: KLineData): number {
  if (!curr) return 0;
  const high = curr.high ?? 0;
  const low = curr.low ?? 0;
  const prevClose = prev?.close ?? curr.close ?? 0;
  return Math.max(
    high - low,
    Math.abs(high - prevClose),
    Math.abs(low - prevClose)
  );
}

function atr(data: KLineData[], period: number): number[] {
  const trList = data.map((d, i) => trueRange(d, i > 0 ? data[i - 1] : undefined));
  const res: number[] = new Array(data.length).fill(NaN);
  if (period <= 1) return trList;
  let sum = 0;
  for (let i = 0; i < trList.length; i++) {
    sum += trList[i] ?? 0;
    if (i === period - 1) {
      res[i] = sum / period;
    } else if (i >= period) {
      // Wilder's smoothing
      res[i] = ((res[i - 1] ?? 0) * (period - 1) + (trList[i] ?? 0)) / period;
    }
  }
  return res;
}

function rollingMin(values: number[], lookback: number): number[] {
  const res = new Array(values.length).fill(NaN);
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - lookback + 1);
    let min = Infinity;
    for (let j = start; j <= i; j++) {
      if (Number.isFinite(values[j]) && (values[j] as number) < min) min = values[j] as number;
    }
    res[i] = min === Infinity ? NaN : min;
  }
  return res;
}

function rollingMax(values: number[], lookback: number): number[] {
  const res = new Array(values.length).fill(NaN);
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - lookback + 1);
    let max = -Infinity;
    for (let j = start; j <= i; j++) {
      if (Number.isFinite(values[j]) && (values[j] as number) > max) max = values[j] as number;
    }
    res[i] = max === -Infinity ? NaN : max;
  }
  return res;
}

function normalize(x: number, min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 0.5;
  if (max === min) return 0.5;
  return clamp((x - min) / (max - min), 0, 1);
}

function recentHigh(data: KLineData[], i: number, lookback: number): number {
  const start = Math.max(0, i - lookback);
  let max = -Infinity;
  for (let j = start; j < i; j++) {
    if (data[j] && (data[j].high ?? -Infinity) > max) max = data[j].high as number;
  }
  return max === -Infinity ? NaN : max;
}

function recentLow(data: KLineData[], i: number, lookback: number): number {
  const start = Math.max(0, i - lookback);
  let min = Infinity;
  for (let j = start; j < i; j++) {
    if (data[j] && (data[j].low ?? Infinity) < min) min = data[j].low as number;
  }
  return min === Infinity ? NaN : min;
}

export function computeVolcanicMove(
  candles: KLineData[],
  cfg: Partial<VolcanicMoveSettings>
): { pressure: number[]; pressureSmoothed: number[]; eruptions: VolcanicEruption[] } {
  const s: VolcanicMoveSettings = { ...DEFAULT_SETTINGS, ...cfg };
  const n = candles.length;
  const close = candles.map(c => c?.close ?? 0);
  const volume = candles.map(c => c?.volume ?? 0);

  if (n === 0) {
    return { pressure: [], pressureSmoothed: [], eruptions: [] };
  }

  // BB width percentage
  const mb = sma(close, s.bbPeriod);
  const sd = stdDev(close, s.bbPeriod);
  const upper = new Array(n).fill(NaN);
  const lower = new Array(n).fill(NaN);
  const bbWidthPct = new Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(mb[i]) && Number.isFinite(sd[i])) {
      upper[i] = (mb[i] as number) + s.bbStdDev * (sd[i] as number);
      lower[i] = (mb[i] as number) - s.bbStdDev * (sd[i] as number);
      const width = (upper[i] as number) - (lower[i] as number);
      const c = close[i] || 1;
      bbWidthPct[i] = c !== 0 ? width / Math.abs(c) : 0;
    }
  }

  // Trend EMA
  const trendEmaLen = Math.max(2, s.trendEMAPeriod ?? 50);
  const emaClose = ema(close, trendEmaLen);

  // ATR percentage
  const atrVals = atr(candles, s.atrPeriod);
  const atrPct = atrVals.map((a, i) => {
    const c = close[i] || 1;
    return c !== 0 ? (a ?? 0) / Math.abs(c) : 0;
  });

  // Volume factor
  const volMA = sma(volume, s.volMAPeriod);
  const volFactor = volume.map((v, i) => {
    const denom = volMA[i] ?? 0;
    return denom > 0 ? v / denom : 0;
  });

  // Historical normalization windows
  const lb = Math.max(10, s.lookbackForNorm);
  const bbMin = rollingMin(bbWidthPct, lb);
  const bbMax = rollingMax(bbWidthPct, lb);
  const atrMin = rollingMin(atrPct, lb);
  const atrMax = rollingMax(atrPct, lb);

  const bbCompression = new Array(n).fill(0);
  const atrCompression = new Array(n).fill(0);
  const volCompression = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const bbN = normalize(bbWidthPct[i] ?? 0, bbMin[i], bbMax[i]);
    const atrN = normalize(atrPct[i] ?? 0, atrMin[i], atrMax[i]);
    // compression is inverse of normalized value
    bbCompression[i] = 1 - bbN;
    atrCompression[i] = 1 - atrN;

    const vf = Math.max(volFactor[i] ?? 0, 1e-8);
    const inv = clamp(1 / vf, 0, 2);
    volCompression[i] = clamp(inv / 2, 0, 1);
  }

  const w1 = s.w1 ?? 0.5;
  const w2 = s.w2 ?? 0.3;
  const w3 = s.w3 ?? 0.2;

  const pressure = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const raw = w1 * bbCompression[i] + w2 * atrCompression[i] + w3 * volCompression[i];
    pressure[i] = clamp(raw, 0, 1);
  }
  const pressureSmoothed = sma(pressure, Math.max(1, s.pressureSMA)).map(v => (Number.isFinite(v) ? v : 0));

  // Eruption detection
  const eruptions: VolcanicEruption[] = [];
  const minBarsApart = Math.max(1, s.minBarsBetweenEruptions ?? 8);
  let lastEruptionIdx = -10000;
  let inHighPressure = false;
  let highPressureStart = -1;

  for (let i = 0; i < n; i++) {
    const p = pressureSmoothed[i] ?? 0;
    if (p >= s.minPressureForAlert) {
      if (!inHighPressure) {
        inHighPressure = true;
        highPressureStart = i;
      }
    } else {
      inHighPressure = false;
    }

    // candidate on bar i if within or shortly after high pressure regime
    const nearHighPressure = inHighPressure || (highPressureStart >= 0 && i - highPressureStart <= s.eruptionConfirmBars + 2);
    if (!nearHighPressure) continue;
    if (i - lastEruptionIdx < minBarsApart) continue;

    // Expansion checks
    const tr = trueRange(candles[i], i > 0 ? candles[i - 1] : undefined);
    const typical = atrVals[i] ?? tr;
    const rangeExpansion = typical > 0 ? tr / typical : 0;
    if (rangeExpansion < s.minRangeExpansion) continue;

    const vf = volFactor[i] ?? 0;
    if (vf < s.minVolExpansion) continue;

    const bar = candles[i];
    const candleRange = Math.max(0, (bar.high ?? 0) - (bar.low ?? 0));
    const body = Math.abs((bar.close ?? 0) - (bar.open ?? 0));
    const bodyPct = candleRange > 0 ? body / candleRange : 0;
    if (bodyPct < s.minBreakoutBodyPct) continue;

    const recentH = recentHigh(candles, i, s.breakoutLookback);
    const recentL = recentLow(candles, i, s.breakoutLookback);

    // Determine direction via breakout vs recent extrema + buffer + band break + trend align
    const buffer = Math.max(0, s.breakoutBufferPct ?? 0.001);
    const requireBand = (s.requireBBBandBreak ?? 1) > 0;
    const requireTrend = (s.requireTrendAlign ?? 1) > 0;
    const emaNow = emaClose[i];
    const emaPrev = i > 0 ? emaClose[i - 1] : emaNow;
    const trendUp = Number.isFinite(emaNow) && Number.isFinite(emaPrev) && (bar.close ?? 0) > (emaNow as number) && (emaNow as number) >= (emaPrev as number);
    const trendDown = Number.isFinite(emaNow) && Number.isFinite(emaPrev) && (bar.close ?? 0) < (emaNow as number) && (emaNow as number) <= (emaPrev as number);
    const upperBand = upper[i];
    const lowerBand = lower[i];

    let bullishBreak = Number.isFinite(recentH) && (bar.close ?? 0) > (recentH as number) * (1 + buffer);
    let bearishBreak = Number.isFinite(recentL) && (bar.close ?? 0) < (recentL as number) * (1 - buffer);
    if (requireBand) {
      bullishBreak = bullishBreak && Number.isFinite(upperBand) && (bar.close ?? 0) > (upperBand as number);
      bearishBreak = bearishBreak && Number.isFinite(lowerBand) && (bar.close ?? 0) < (lowerBand as number);
    }
    if (requireTrend) {
      bullishBreak = bullishBreak && trendUp;
      bearishBreak = bearishBreak && trendDown;
    }

    if (!bullishBreak && !bearishBreak) continue;

    // Confirmation window
    const k = i;
    const confirmTo = Math.min(n - 1, k + Math.max(1, s.eruptionConfirmBars));
    let followThrough = 0;
    let validRetest = true;
    const retestBars = Math.max(1, s.retestWindow ?? 2);

    if (bullishBreak) {
      for (let j = k; j <= confirmTo; j++) {
        const c = candles[j];
        if ((c.close ?? 0) >= (bar.high ?? 0)) followThrough++;
        // reject if close falls back below breakout level within retest window
        if (j <= k + retestBars && Number.isFinite(recentH) && (c.close ?? 0) < (recentH as number)) {
          validRetest = false;
        }
      }
    } else if (bearishBreak) {
      for (let j = k; j <= confirmTo; j++) {
        const c = candles[j];
        if ((c.close ?? 0) <= (bar.low ?? 0)) followThrough++;
        if (j <= k + retestBars && Number.isFinite(recentL) && (c.close ?? 0) > (recentL as number)) {
          validRetest = false;
        }
      }
    }

    const majorityNeeded = Math.ceil((confirmTo - k + 1) / 2);
    if (validRetest && followThrough >= majorityNeeded) {
      const direction: EruptionDirection = bullishBreak ? 'bullish' : 'bearish';
      const breakoutLevel = bullishBreak ? (recentH as number) : (recentL as number);
      eruptions.push({
        index: k,
        time: (bar.timestamp as number) ?? 0,
        direction,
        pressureAtSignal: p,
        rangeExpansion,
        volumeFactor: vf,
        breakoutLevel
      });
      lastEruptionIdx = k;
    }
  }

  return { pressure, pressureSmoothed, eruptions };
}


