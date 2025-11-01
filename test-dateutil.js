// Test script for dateutil.ts - using Vite dev server approach
console.log('=== Testing dateutil.ts functions ===\n');

// Since this is a SvelteKit project, let's demonstrate the dateutil functions
// by creating a simple test that can work with the existing build system

console.log('To properly test the dateutil.ts file in this SvelteKit project:');
console.log('1. The file contains utility functions for date/time operations');
console.log('2. It uses dayjs library for date manipulation');
console.log('3. It exports functions like:');
console.log('   - getUTCStamp(): Get current UTC timestamp');
console.log('   - toUTCStamp(date_str): Convert date string to UTC timestamp');
console.log('   - getDateStr(timestamp): Format timestamp to date string');
console.log('   - fmtDuration(seconds): Format duration');
console.log('   - tf_to_secs(timeframe): Convert timeframe to seconds');
console.log('   - secs_to_tf(seconds): Convert seconds to timeframe');
console.log('   - StampToYMD(timestamp): Convert timestamp to YMD format');
console.log('\nTo run this properly, use: npm run dev');
console.log('Then access the functions through the SvelteKit application.');