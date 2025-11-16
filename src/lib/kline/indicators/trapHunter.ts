import type { IndicatorTemplate, KLineData, VisibleRange, XAxis, YAxis } from 'klinecharts';
import * as kc from 'klinecharts';

type TrapType = 'bull' | 'bear';

interface TrapSignal {
	index: number;
	time: number;
	type: TrapType;
	score: number;
	breakoutLevel: number;
	reversalClose: number;
}

interface TrapResult {
	bullTrap?: boolean;
	bearTrap?: boolean;
	normal?: boolean;
	score?: number;
	breakoutLevel?: number;
	reversalClose?: number;
	type?: TrapType;
	time?: number;
}

function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, val));
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
		res[i] = i >= period - 1 ? sum / period : 0;
	}
	return res;
}

function getRecentHigh(data: KLineData[], i: number, lookback: number): number {
	const start = Math.max(0, i - lookback);
	let max = -Infinity;
	for (let k = start; k < i; k++) {
		if (data[k] && data[k].high > max) max = data[k].high;
	}
	return max === -Infinity ? 0 : max;
}

function getRecentLow(data: KLineData[], i: number, lookback: number): number {
	const start = Math.max(0, i - lookback);
	let min = Infinity;
	for (let k = start; k < i; k++) {
		if (data[k] && data[k].low < min) min = data[k].low;
	}
	return min === Infinity ? 0 : min;
}

function computeCandleParts(bar: KLineData) {
	const range = Math.max(0, (bar.high ?? 0) - (bar.low ?? 0));
	const body = Math.abs((bar.close ?? 0) - (bar.open ?? 0));
	const upperWick = Math.max(0, (bar.high ?? 0) - Math.max(bar.open ?? 0, bar.close ?? 0));
	const lowerWick = Math.max(0, Math.min(bar.open ?? 0, bar.close ?? 0) - (bar.low ?? 0));
	const upperWickRatio = range > 0 ? upperWick / range : 0;
	const lowerWickRatio = range > 0 ? lowerWick / range : 0;
	return { range, body, upperWick, lowerWick, upperWickRatio, lowerWickRatio };
}

/**
 * Trap Hunter Indicator
 * Detects bull and bear traps and renders markers/labels on the main price pane.
 *
 * calcParams (defaults):
 * [0] resistanceLookback = 20
 * [1] supportLookback = 20
 * [2] confirmationBars = 3
 * [3] maxTrapBars = 5
 * [4] volumeMAPeriod = 20
 * [5] minVolumeSpike = 1.3
 * [6] minBreakoutFactor = 0.0007
 * [7] minWickRatio = 0.35
	 * [8] minTrapScore = 0.5
	 * [9] enableNormalSignal = 1 (0/1)
	 * [10] normalQuietBars = 5
 */
export const trapHunter: IndicatorTemplate = {
	name: 'TRAP_HUNTER',
	shortName: 'TRAP',
	precision: 2,
	shouldOhlc: true,
	shouldFormatBigNumber: false,
	visible: true,
	zLevel: 0,
	figures: [],
	styles: {
		texts: [
			{ color: '#ffffff', size: 10 },
		]
	},

	calc: (data: KLineData[], indicator) => {
		const p = indicator.calcParams || [];
		const resistanceLookback = (p[0] as number) ?? 20;
		const supportLookback = (p[1] as number) ?? 20;
		const confirmationBars = Math.max(1, (p[2] as number) ?? 3);
		const maxTrapBars = Math.max(1, (p[3] as number) ?? 5);
		const volumeMAPeriod = Math.max(1, (p[4] as number) ?? 20);
		const minVolumeSpike = (p[5] as number) ?? 1.3;
		const minBreakoutFactor = (p[6] as number) ?? 0.0007;
		const minWickRatio = (p[7] as number) ?? 0.35;
		const minTrapScore = (p[8] as number) ?? 0.5;
		const enableNormalSignal = ((p[9] as number) ?? 1) > 0 ? 1 : 0;
		const normalQuietBars = Math.max(1, (p[10] as number) ?? 5);

		const volumes = data.map(d => d?.volume ?? 0);
		const volMA = sma(volumes, volumeMAPeriod);

		const result: TrapResult[] = new Array(data.length).fill(null).map(() => ({}));

		let lastBullIdx = -1000;
		let lastBearIdx = -1000;
		let lastTrapIdx = -1000;
		let lastNormalIdx = -1000;

		for (let i = 0; i < data.length; i++) {
			const bar = data[i];
			if (!bar || i === 0) continue;

			// Compute reference levels
			const recentHigh = getRecentHigh(data, i, resistanceLookback);
			const recentLow = getRecentLow(data, i, supportLookback);
			if (recentHigh === 0 || recentLow === 0) continue; // insufficient lookback window

			const vma = volMA[i] || 0;
			const volSpikeFactor = vma > 0 ? (bar.volume ?? 0) / vma : 0;
			const { range, upperWickRatio, lowerWickRatio } = computeCandleParts(bar);
			const closeNearHigh = range > 0 ? ((bar.high - bar.close) / range) < 0.4 : false;
			const closeNearLow = range > 0 ? ((bar.close - bar.low) / range) < 0.4 : false;

			// ---------------- Bull Trap Candidate ----------------
			const isBullBreakout = (bar.high ?? 0) >= recentHigh * (1 + minBreakoutFactor);
			const bullInitOkay = (bar.close ?? 0) > (bar.open ?? 0) || closeNearHigh;
			const bullVolumeOkay = volSpikeFactor >= minVolumeSpike;

			if (isBullBreakout && bullInitOkay && bullVolumeOkay) {
				// check immediate failure in same bar (close back below breakout)
				let confirmed = -1;
				if ((bar.close ?? 0) < recentHigh) {
					confirmed = i;
				}
				// search confirmation j within next confirmationBars
				const jMax = Math.min(data.length - 1, i + confirmationBars);
				if (confirmed === -1) {
					for (let j = i + 1; j <= jMax; j++) {
						if ((data[j]?.close ?? 0) < recentHigh) {
							confirmed = j;
							break;
						}
					}
				}
				if (confirmed !== -1) {
					// evaluate within window [i .. min(i+maxTrapBars, confirmed)]
					const windowEnd = Math.min(confirmed, i + maxTrapBars);
					let maxUpperWick = upperWickRatio;
					let bearishCount = 0;
					let hasStrongBearish = false;
					for (let k = i; k <= windowEnd; k++) {
						const parts = computeCandleParts(data[k]);
						if (parts.upperWickRatio > maxUpperWick) maxUpperWick = parts.upperWickRatio;
						if ((data[k].close ?? 0) < (data[k].open ?? 0)) {
							bearishCount++;
							// strong bearish: decent body relative to range
							const strong = parts.range > 0 ? (parts.body / parts.range) >= 0.45 : false;
							if (strong) hasStrongBearish = true;
						}
					}

					const breakoutStrength = clamp(((bar.high - recentHigh) / Math.max(1e-8, recentHigh)) / (minBreakoutFactor * 3), 0, 1);
					const volumeStrength = clamp(volSpikeFactor / (minVolumeSpike * 2), 0, 1);
					const wickStrength = clamp(maxUpperWick, 0, 1);
					const reversalStrength = clamp((bar.high - (data[confirmed].close ?? 0)) / Math.max(1e-8, bar.high), 0, 1);

					const score = clamp(
						0.3 * breakoutStrength +
						0.3 * volumeStrength +
						0.2 * wickStrength +
						0.2 * reversalStrength,
						0, 1
					);

					// Accept either long upper wick OR strong bearish presence
					const patternOk = (maxUpperWick >= minWickRatio) || hasStrongBearish;
					if (patternOk && score >= minTrapScore && confirmed - lastBullIdx >= 2) {
						lastBullIdx = confirmed;
						lastTrapIdx = confirmed;
						result[confirmed] = {
							...result[confirmed],
							bullTrap: true,
							type: 'bull',
							score,
							breakoutLevel: recentHigh,
							reversalClose: data[confirmed].close,
							time: data[confirmed].timestamp as number
						};
					}
				}
			}

			// ---------------- Bear Trap Candidate ----------------
			// Slightly more permissive on the downside so valid bear traps (buy traps)
			// are not filtered out too aggressively.
			const bearBreakFactor = minBreakoutFactor * 0.85;
			const bearMinVolume = minVolumeSpike * 0.9;
			const isBearBreakdown = (bar.low ?? 0) <= recentLow * (1 - bearBreakFactor);
			// Bear-init conditions:
			// - classic breakdown candle (close < open)
			// - or close near the lows
			// - or strong lower wick (hammer-style rejection) even if the close is off the lows
			const bearInitOkay =
				(bar.close ?? 0) < (bar.open ?? 0) ||
				closeNearLow ||
				lowerWickRatio >= minWickRatio;
			const bearVolumeOkay = volSpikeFactor >= bearMinVolume;

			if (isBearBreakdown && bearInitOkay && bearVolumeOkay) {
				const jMax = Math.min(data.length - 1, i + confirmationBars);
				let confirmed = -1;
				// same-bar snapback
				if ((bar.close ?? 0) > recentLow) {
					confirmed = i;
				}
				if (confirmed === -1) {
					for (let j = i + 1; j <= jMax; j++) {
						if ((data[j]?.close ?? 0) > recentLow) {
							confirmed = j;
							break;
						}
					}
				}
				if (confirmed !== -1) {
					const windowEnd = Math.min(confirmed, i + maxTrapBars);
					let maxLowerWick = lowerWickRatio;
					let bullishCount = 0;
					let hasStrongBullish = false;
					for (let k = i; k <= windowEnd; k++) {
						const parts = computeCandleParts(data[k]);
						if (parts.lowerWickRatio > maxLowerWick) maxLowerWick = parts.lowerWickRatio;
						if ((data[k].close ?? 0) > (data[k].open ?? 0)) {
							bullishCount++;
							const strong = parts.range > 0 ? (parts.body / parts.range) >= 0.45 : false;
							if (strong) hasStrongBullish = true;
						}
					}

					const breakdownStrength = clamp(((recentLow - bar.low) / Math.max(1e-8, recentLow)) / (bearBreakFactor * 3), 0, 1);
					const volumeStrength = clamp(volSpikeFactor / (bearMinVolume * 2), 0, 1);
					const wickStrength = clamp(maxLowerWick, 0, 1);
					const reversalStrength = clamp(((data[confirmed].close ?? 0) - bar.low) / Math.max(1e-8, (data[confirmed].close ?? 0)), 0, 1);

					const score = clamp(
						0.3 * breakdownStrength +
						0.3 * volumeStrength +
						0.2 * wickStrength +
						0.2 * reversalStrength,
						0, 1
					);

					const patternOk = (maxLowerWick >= minWickRatio) || hasStrongBullish;
					if (patternOk && score >= minTrapScore && confirmed - lastBearIdx >= 2) {
						lastBearIdx = confirmed;
						lastTrapIdx = confirmed;
						result[confirmed] = {
							...result[confirmed],
							bearTrap: true,
							type: 'bear',
							score,
							breakoutLevel: recentLow,
							reversalClose: data[confirmed].close,
							time: data[confirmed].timestamp as number
						};
					}
				}
			}

			// ---------------- Normal (Calm/Stable) State ----------------
			if (enableNormalSignal) {
				// Enter normal only if sufficiently quiet since last trap and not breaking levels
				const volSpike = volMA[i] > 0 ? (bar.volume ?? 0) / volMA[i] : 0;
				const { upperWickRatio, lowerWickRatio } = computeCandleParts(bar);
				const wickThresh = Math.max(0.1, minWickRatio * 0.8);
				const volThresh = Math.max(1.0, minVolumeSpike * 0.85);
				const insideRange =
					(bar.close ?? 0) <= recentHigh * (1 + minBreakoutFactor * 0.5) &&
					(bar.close ?? 0) >= recentLow * (1 - minBreakoutFactor * 0.5);

				const calmNow =
					volSpike <= volThresh &&
					upperWickRatio <= wickThresh &&
					lowerWickRatio <= wickThresh &&
					insideRange;

				const gapSinceTrap = i - lastTrapIdx;
				const gapSinceNormal = i - lastNormalIdx;
				const normalDebounce = Math.max(8, normalQuietBars);

				if (calmNow && gapSinceTrap >= normalQuietBars && gapSinceNormal >= normalDebounce) {
					lastNormalIdx = i;
					result[i] = {
						...result[i],
						normal: true,
						time: data[i].timestamp as number
					};
				}
			}
		}

		return result;
	},

	// Custom draw markers and labels on main price pane
	draw: ({ ctx, chart, indicator, xAxis, yAxis }) => {
		const res = indicator.result as TrapResult[] | undefined;
		if (!res || res.length === 0) return false;

		const dataList = chart.getDataList();
		const vr: VisibleRange = chart.getVisibleRange();
		const from = Math.max(0, vr.from);
		const to = Math.min(res.length - 1, vr.to);

		function drawMarker(x: number, y: number, color: string, type: TrapType | 'normal') {
			ctx.save();
			ctx.fillStyle = color;
			ctx.strokeStyle = color;
			ctx.lineWidth = 1;
			if (type === 'normal') {
				// small circle
				ctx.beginPath();
				ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
				ctx.fill();
			} else {
				// Draw small triangle marker
				ctx.beginPath();
				if (type === 'bull') {
					// triangle pointing up (above candle)
					ctx.moveTo(x, y - 6);
					ctx.lineTo(x - 5, y + 4);
					ctx.lineTo(x + 5, y + 4);
				} else {
					// triangle pointing down (below candle)
					ctx.moveTo(x, y + 6);
					ctx.lineTo(x - 5, y - 4);
					ctx.lineTo(x + 5, y - 4);
				}
				ctx.closePath();
				ctx.fill();
			}
			ctx.restore();
		}

		function drawLabel(x: number, y: number, text: string, color: string) {
			ctx.save();
			ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillStyle = color;
			ctx.strokeStyle = 'rgba(0,0,0,0.2)';
			// Background rounded rect
			const padX = 6, padY = 3;
			const metrics = ctx.measureText(text);
			const w = Math.ceil(metrics.width) + padX * 2;
			const h = 16;
			const rx = 4;
			const bx = x - w / 2;
			const by = y - h / 2;
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
			ctx.fillStyle = 'rgba(0,0,0,0.6)';
			ctx.fill();

			// Text
			ctx.fillStyle = color;
			ctx.fillText(text, x, y + 0.5);
			ctx.restore();
		}

		function drawBreakoutLine(x: number, y: number, color: string) {
			ctx.save();
			ctx.strokeStyle = color;
			ctx.lineWidth = 1;
			ctx.setLineDash([4, 3]);
			ctx.beginPath();
			ctx.moveTo(x - 10, y);
			ctx.lineTo(x + 10, y);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.restore();
		}

		for (let i = from; i <= to; i++) {
			const item = res[i];
			if (!item || (!item.bullTrap && !item.bearTrap && !item.normal)) continue;

			const x = (xAxis as XAxis).convertToPixel(i);
			const k = dataList[i];
			if (!k) continue;

			if (item.bullTrap) {
				// marker above candle high
				const y = (yAxis as YAxis).convertToPixel(k.high) - 12;
				const color = '#EF4444'; // red
				drawMarker(x, y, color, 'bull');
				const labelY = y - 16;
				const text = `Bull Trap ${((item.score ?? 0) * 100).toFixed(0)}%`;
				drawLabel(x, labelY, text, '#F59E0B');
				if (item.breakoutLevel) {
					const yBreak = (yAxis as YAxis).convertToPixel(item.breakoutLevel);
					drawBreakoutLine(x, yBreak, '#F59E0B');
				}
			}

			if (item.bearTrap) {
				// marker below candle low
				const y = (yAxis as YAxis).convertToPixel(k.low) + 12;
				const color = '#10B981'; // green
				drawMarker(x, y, color, 'bear');
				const labelY = y + 16;
				const text = `Bear Trap ${((item.score ?? 0) * 100).toFixed(0)}%`;
				drawLabel(x, labelY, text, '#34D399');
				if (item.breakoutLevel) {
					const yBreak = (yAxis as YAxis).convertToPixel(item.breakoutLevel);
					drawBreakoutLine(x, yBreak, '#34D399');
				}
			}

			if (item.normal) {
				// draw a small blue dot near candle body mid
				const mid = (k.high + k.low) / 2;
				const y = (yAxis as YAxis).convertToPixel(mid);
				const color = '#3B82F6'; // blue
				drawMarker(x, y, color, 'normal');
				drawLabel(x, y - 16, 'Stable', '#60A5FA');
			}
		}
		return true;
	},

	// Tooltip shows details on hover
	// @ts-expect-error - klinecharts typing may vary by version
	createTooltipDataSource: ({ dataIndex, indicator, defaultStyles }) => {
		const res = (indicator.result as TrapResult[])?.[dataIndex];
		if (!res || (!res.bullTrap && !res.bearTrap && !res.normal)) return { values: [] };
		const typeText = res.normal ? 'Stable' : (res.bullTrap ? 'Bull Trap' : 'Bear Trap');
		const score = res.score !== undefined ? Number(res.score).toFixed(2) : '—';
		const level = res.breakoutLevel !== undefined ? Number(res.breakoutLevel).toFixed(indicator.precision ?? 2) : '—';
		const reversal = res.reversalClose !== undefined ? Number(res.reversalClose).toFixed(indicator.precision ?? 2) : '—';
		return {
			styles: defaultStyles,
			values: [
				{ title: 'Trap', value: typeText },
				...(res.normal ? [] : [
					{ title: 'Score', value: score },
					{ title: 'Level', value: level },
					{ title: 'Reversal', value: reversal }
				])
			]
		};
	}
};

export default trapHunter;


