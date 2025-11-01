type KLineData = {
	timestamp: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
};

export const transformApiDataToKLineData = (apiData: number[][]): KLineData[] => {
	console.log('transformApiDataToKLineData called with:', apiData);
	console.log('First few items:', apiData.slice(0, 3));
	
	// Correct order based on your data structure
	const [opens, highs, lows, closes, volumes, timestamps] = apiData;

	const length = Math.min(
		opens?.length || 0,
		highs?.length || 0,
		lows?.length || 0,
		closes?.length || 0,
		volumes?.length || 0,
		timestamps?.length || 0
	);

	console.log('length', length);

	const candles: KLineData[] = [];

	for (let i = 0; i < length; i++) {
		console.log(`Processing item ${i}:`, {
			open: opens[i],
			high: highs[i],
			low: lows[i],
			close: closes[i],
			volume: volumes[i],
			timestamp: timestamps[i]
		});
		
		// Validate timestamp to prevent "Invalid time value" errors
		const rawTimestamp = timestamps[i];
		let validTimestamp = rawTimestamp * 1000;
		
		console.log(`Original timestamp: ${rawTimestamp}, converted: ${validTimestamp}`);
		
		// Check if timestamp is valid
		if (!rawTimestamp || isNaN(rawTimestamp) || rawTimestamp <= 0) {
			console.warn(`Invalid timestamp at index ${i}:`, rawTimestamp);
			// Use current time as fallback
			validTimestamp = Date.now();
		}
		
		// Additional validation for the final timestamp
		if (isNaN(validTimestamp) || validTimestamp <= 0) {
			console.warn(`Invalid final timestamp at index ${i}:`, validTimestamp);
			validTimestamp = Date.now();
		}

		const candle: KLineData = {
			timestamp: validTimestamp,
			open: opens[i] || 0,
			high: highs[i] || 0,
			low: lows[i] || 0,
			close: closes[i] || 0,
			volume: volumes[i] || 0
		};

		candles.push(candle);
	}

	return candles;
};

export const calculateStockTotals = (positions: any) => {
	// Handle cases where positions is undefined, null, or not an array
	if (!Array.isArray(positions)) {
		return {
			totalCost: 0,
			totalRisk: 0
		};
	}

	let totalCost = 0;
	let totalRisk = 0;

	positions.forEach((position) => {
		totalCost += position.avgCost * position.quantity || 0;
		totalRisk += position.risk || 0;
	});

	return {
		totalCost,
		totalRisk
	};
};
