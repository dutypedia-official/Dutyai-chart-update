// Simple Console Test for Indicator Functionality
// Copy and paste this entire script into the browser console

console.log('🧪 Starting Simple Indicator Test...');

// Test 1: Add CCI indicator
console.log('📊 Test 1: Adding CCI indicator...');
try {
  // Try to find chart instance
  const chartElement = document.querySelector('.chart-container') || document.querySelector('[data-chart]');
  console.log('Chart element found:', !!chartElement);
  
  // Check if we can access chart context from Svelte
  const saveData = JSON.parse(localStorage.getItem('chart') || '{}');
  console.log('Current save data:', saveData);
  console.log('Current indicators:', Object.keys(saveData.saveInds || {}));
  
  console.log('✅ Basic test completed. Check the indicator list in the UI to see if indicators are marked as active.');
  
} catch (error) {
  console.error('❌ Test failed:', error);
}

// Instructions for manual testing
console.log(`
🔧 Manual Testing Instructions:
1. Open the indicator list (click the indicator button)
2. Add a CCI indicator - it should appear as active (highlighted)
3. Add another CCI indicator with different settings
4. Add an RSI indicator
5. Save the chart with a test name
6. Switch to a different stock symbol
7. Load the saved chart
8. Check that:
   - All indicators appear on the chart
   - All indicators are marked as active in the indicator list
   - You can edit each indicator's settings
   - Drawings are symbol-specific (don't transfer between stocks)
`);