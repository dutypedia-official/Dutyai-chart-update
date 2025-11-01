// Test script to verify data consistency
import MyDatafeed from './src/lib/kline/mydatafeed.ts';

const datafeed = new MyDatafeed();

// Test symbols
const testSymbols = [
	{ ticker: 'GP', type: 'stock' },
	{ ticker: 'ROBI', type: 'stock' }
];

// Test periods
const testPeriods = [
	{ timeframe: '1m' },
	{ timeframe: '5m' },
	{ timeframe: '15m' },
	{ timeframe: '1h' }
];

async function testDataConsistency() {
	console.log('🧪 Testing data consistency...');

	for (const symbol of testSymbols) {
		console.log(`\n📊 Testing symbol: ${symbol.ticker}`);

		for (const period of testPeriods) {
			console.log(`  ⏰ Testing timeframe: ${period.timeframe}`);

			// First call
			const data1 = await datafeed.getHistoryKLineData({
				symbol,
				period,
				from: Date.now() - 24 * 60 * 60 * 1000,
				to: Date.now()
			});

			// Second call (should return cached data)
			const data2 = await datafeed.getHistoryKLineData({
				symbol,
				period,
				from: Date.now() - 24 * 60 * 60 * 1000,
				to: Date.now()
			});

			// Check if data is identical
			const isIdentical = JSON.stringify(data1) === JSON.stringify(data2);
			console.log(`    ✅ Data consistency: ${isIdentical ? 'PASS' : 'FAIL'}`);

			if (data1.data.length > 0) {
				const currentPrice = datafeed.getCurrentPrice(symbol.ticker);
				const lastPrice = data1.data[data1.data.length - 1].close;
				console.log(`    💰 Current price: ${currentPrice}, Last price: ${lastPrice}`);
				console.log(`    🎯 Price consistency: ${currentPrice === lastPrice ? 'PASS' : 'FAIL'}`);
			}
		}
	}

	console.log('\n🏁 Test completed!');
}

// Run the test
testDataConsistency().catch(console.error);
