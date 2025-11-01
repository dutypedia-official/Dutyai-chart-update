/**
 * Comprehensive Test Script for Chart Refresh Persistence
 * 
 * This script tests the complete workflow:
 * 1. Add indicators to chart
 * 2. Save chart
 * 3. Refresh chart (simulate reset)
 * 4. Verify indicators persist
 */

console.log('🧪 Chart Refresh Persistence Test Script Loaded');

// Helper function to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to check if indicators exist
function checkIndicators() {
  const chart = window.chart;
  if (!chart) {
    console.log('❌ Chart not found');
    return { count: 0, indicators: [] };
  }
  
  try {
    // Get all indicators from chart
    const indicators = chart.getIndicators ? chart.getIndicators() : [];
    console.log('📊 Current indicators:', indicators.map(ind => ({ 
      name: ind.name, 
      paneId: ind.paneId,
      visible: ind.visible 
    })));
    return { count: indicators.length, indicators };
  } catch (error) {
    console.error('❌ Error checking indicators:', error);
    return { count: 0, indicators: [] };
  }
}

// Helper function to add an indicator
async function addIndicator(type = 'MA', params = [20]) {
  console.log(`🔧 Adding ${type} indicator with params:`, params);
  
  const chart = window.chart;
  if (!chart) {
    console.log('❌ Chart not found');
    return false;
  }
  
  try {
    const indicatorConfig = {
      name: type,
      calcParams: params
    };
    
    const indicatorId = chart.createIndicator(indicatorConfig);
    console.log(`✅ Added ${type} indicator with ID:`, indicatorId);
    
    // Wait a bit for indicator to be created
    await wait(500);
    
    // Verify it was created
    const check = checkIndicators();
    console.log(`📊 Indicators after adding ${type}:`, check.count);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to add ${type} indicator:`, error);
    return false;
  }
}

// Helper function to save chart
async function saveChart(name) {
  console.log(`💾 Saving chart as "${name}"...`);
  
  const saveManager = window.saveManager;
  if (!saveManager) {
    console.log('❌ SaveManager not found');
    return false;
  }
  
  try {
    const result = await saveManager.save(name);
    console.log('💾 Save result:', result);
    return result.success;
  } catch (error) {
    console.error('❌ Failed to save chart:', error);
    return false;
  }
}

// Helper function to simulate chart refresh
async function simulateRefresh() {
  console.log('🔄 Simulating chart refresh...');
  
  // Check if we have the chart modal reset functionality
  const chart = window.chart;
  if (!chart) {
    console.log('❌ Chart not found for refresh simulation');
    return false;
  }
  
  // Try to find the resetChartView function or simulate it
  // We'll call the global restore function directly to test it
  if (typeof window.restoreActiveSaveAfterRefresh === 'function') {
    console.log('🔄 Calling restore function directly...');
    try {
      const result = await window.restoreActiveSaveAfterRefresh();
      console.log('🔄 Direct restore result:', result);
      return result && result.success;
    } catch (error) {
      console.error('❌ Failed to call restore function:', error);
      return false;
    }
  } else {
    console.log('❌ Global restore function not found');
    return false;
  }
}

// Main test function
async function runComprehensiveTest() {
  console.log('\n🧪 ===== STARTING COMPREHENSIVE TEST =====');
  
  // Wait for page to load
  console.log('⏳ Waiting for page to load...');
  await wait(3000);
  
  // Check initial state
  console.log('\n📍 Step 1: Checking initial state...');
  const initialCheck = checkIndicators();
  console.log(`📊 Initial indicators: ${initialCheck.count}`);
  
  // Step 2: Add indicators
  console.log('\n📍 Step 2: Adding test indicators...');
  const ma20Added = await addIndicator('MA', [20]);
  const ma50Added = await addIndicator('MA', [50]);
  const rsiAdded = await addIndicator('RSI', [14]);
  
  if (!ma20Added || !ma50Added || !rsiAdded) {
    console.log('❌ TEST FAILED: Could not add all indicators');
    return;
  }
  
  // Check indicators after adding
  console.log('\n📍 Step 2.5: Verifying indicators were added...');
  const afterAddCheck = checkIndicators();
  console.log(`📊 Indicators after adding: ${afterAddCheck.count}`);
  
  if (afterAddCheck.count < 3) {
    console.log('❌ TEST FAILED: Not all indicators were added successfully');
    return;
  }
  
  await wait(1000);
  
  // Step 3: Save chart
  console.log('\n📍 Step 3: Saving chart...');
  const testSaveName = 'test-refresh-persistence-' + Date.now();
  const saved = await saveChart(testSaveName);
  
  if (!saved) {
    console.log('❌ TEST FAILED: Could not save chart');
    return;
  }
  
  await wait(1000);
  
  // Step 4: Verify save manager state
  console.log('\n📍 Step 4: Verifying save manager state...');
  const saveManager = window.saveManager;
  if (saveManager) {
    const state = saveManager.getState();
    console.log('💾 Save manager state:', {
      activeSaveId: state.activeSaveId,
      hasActiveSave: saveManager.hasActiveSave(),
      savedLayoutsCount: state.savedLayouts.length
    });
  }
  
  // Step 5: Simulate refresh
  console.log('\n📍 Step 5: Simulating chart refresh...');
  const refreshed = await simulateRefresh();
  
  if (!refreshed) {
    console.log('❌ TEST FAILED: Could not simulate refresh');
    return;
  }
  
  // Wait for restore to complete
  await wait(2000);
  
  // Step 6: Check if indicators persist
  console.log('\n📍 Step 6: Checking indicators after refresh...');
  const afterRefreshCheck = checkIndicators();
  console.log(`📊 Indicators after refresh: ${afterRefreshCheck.count}`);
  
  // Final result
  console.log('\n🎯 ===== TEST RESULTS =====');
  console.log(`📊 Initial indicators: ${initialCheck.count}`);
  console.log(`📊 After adding: ${afterAddCheck.count}`);
  console.log(`📊 After refresh: ${afterRefreshCheck.count}`);
  
  if (afterRefreshCheck.count >= 3) {
    console.log('✅ TEST PASSED: Indicators persisted after refresh!');
    console.log('🎉 Chart refresh persistence is working correctly!');
  } else {
    console.log('❌ TEST FAILED: Indicators did not persist after refresh');
    console.log(`Expected at least 3 indicators, got ${afterRefreshCheck.count}`);
  }
  
  return afterRefreshCheck.count >= 3;
}

// Quick test function for manual testing
async function quickTest() {
  console.log('🚀 Running quick test...');
  
  // Check if everything is available
  console.log('🔍 Checking availability...');
  console.log('Chart available:', !!window.chart);
  console.log('SaveManager available:', !!window.saveManager);
  console.log('Restore function available:', typeof window.restoreActiveSaveAfterRefresh);
  
  if (window.saveManager) {
    const state = window.saveManager.getState();
    console.log('SaveManager state:', state);
  }
  
  const indicatorCheck = checkIndicators();
  console.log(`Current indicators: ${indicatorCheck.count}`);
  
  return {
    chartAvailable: !!window.chart,
    saveManagerAvailable: !!window.saveManager,
    restoreFunctionAvailable: typeof window.restoreActiveSaveAfterRefresh === 'function',
    currentIndicators: indicatorCheck.count
  };
}

// Export functions for manual testing
window.testRefreshPersistence = runComprehensiveTest;
window.quickTestRefresh = quickTest;
window.addTestIndicator = addIndicator;
window.saveTestChart = saveChart;
window.simulateTestRefresh = simulateRefresh;
window.checkTestIndicators = checkIndicators;

console.log('🧪 Test functions available:');
console.log('  - window.testRefreshPersistence() - Run full test');
console.log('  - window.quickTestRefresh() - Quick availability check');
console.log('  - window.addTestIndicator(type, params) - Add indicator');
console.log('  - window.saveTestChart(name) - Save chart');
console.log('  - window.simulateTestRefresh() - Simulate refresh');
console.log('  - window.checkTestIndicators() - Check current indicators');

// Auto-run quick test after a delay
setTimeout(() => {
  console.log('\n🔍 Auto-running quick test...');
  quickTest();
}, 2000);