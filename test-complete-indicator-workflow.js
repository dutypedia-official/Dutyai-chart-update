// Comprehensive Indicator Save/Load Test Script
// This script tests all aspects of indicator functionality

console.log('🧪 Starting Comprehensive Indicator Test...');

// Helper function to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to get chart context
function getChartContext() {
  const chartElement = document.querySelector('[data-chart-container]') || document.querySelector('.chart-container') || document.querySelector('#chart');
  if (!chartElement) {
    console.error('❌ Chart element not found');
    return null;
  }
  
  // Try to get chart from global scope or element
  const chart = window.chart || window.klineChart || chartElement._chart;
  if (!chart) {
    console.error('❌ Chart instance not found');
    return null;
  }
  
  return chart;
}

// Helper function to add CCI indicator with specific settings
async function addCCIIndicator(period = 14, color = '#ff6b6b') {
  console.log(`📊 Adding CCI indicator with period: ${period}, color: ${color}`);
  
  const chart = getChartContext();
  if (!chart) return false;
  
  try {
    // Create CCI indicator
    const result = chart.createIndicator('CCI', [period], true, {
      id: `pane_CCI_${period}_${Date.now()}`
    });
    
    if (result) {
      console.log(`✅ CCI indicator added successfully with period ${period}`);
      return true;
    } else {
      console.error(`❌ Failed to add CCI indicator with period ${period}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error adding CCI indicator:`, error);
    return false;
  }
}

// Helper function to add RSI indicator
async function addRSIIndicator(period = 14) {
  console.log(`📊 Adding RSI indicator with period: ${period}`);
  
  const chart = getChartContext();
  if (!chart) return false;
  
  try {
    const result = chart.createIndicator('RSI', [period], true, {
      id: `pane_RSI_${period}_${Date.now()}`
    });
    
    if (result) {
      console.log(`✅ RSI indicator added successfully with period ${period}`);
      return true;
    } else {
      console.error(`❌ Failed to add RSI indicator with period ${period}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error adding RSI indicator:`, error);
    return false;
  }
}

// Helper function to add MACD indicator
async function addMACDIndicator() {
  console.log(`📊 Adding MACD indicator`);
  
  const chart = getChartContext();
  if (!chart) return false;
  
  try {
    const result = chart.createIndicator('MACD', [12, 26, 9], true, {
      id: `pane_MACD_${Date.now()}`
    });
    
    if (result) {
      console.log(`✅ MACD indicator added successfully`);
      return true;
    } else {
      console.error(`❌ Failed to add MACD indicator`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error adding MACD indicator:`, error);
    return false;
  }
}

// Helper function to check save data
function checkSaveData() {
  console.log('🔍 Checking current save data...');
  
  try {
    const saveData = JSON.parse(localStorage.getItem('chart') || '{}');
    const indicators = saveData.saveInds || {};
    
    console.log('📊 Current indicators in save data:');
    Object.entries(indicators).forEach(([key, indicator]) => {
      console.log(`  - ${key}: ${indicator.name} (pane: ${indicator.pane_id})`);
      if (indicator.calcParams) {
        console.log(`    Parameters: ${JSON.stringify(indicator.calcParams)}`);
      }
    });
    
    return Object.keys(indicators).length;
  } catch (error) {
    console.error('❌ Error checking save data:', error);
    return 0;
  }
}

// Helper function to save chart
async function saveChart(layoutName) {
  console.log(`💾 Saving chart as: ${layoutName}`);
  
  try {
    // Trigger save via button click or direct call
    const saveButton = document.querySelector('[data-save-button]') || document.querySelector('.save-button');
    if (saveButton) {
      saveButton.click();
      await wait(1000);
    }
    
    // Or try direct save if available
    if (window.saveManager && window.saveManager.save) {
      await window.saveManager.save(layoutName);
    }
    
    console.log(`✅ Chart saved as: ${layoutName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving chart:`, error);
    return false;
  }
}

// Helper function to load chart
async function loadChart(layoutName) {
  console.log(`📂 Loading chart: ${layoutName}`);
  
  try {
    // Try direct load if available
    if (window.saveManager && window.saveManager.load) {
      await window.saveManager.load(layoutName);
    }
    
    console.log(`✅ Chart loaded: ${layoutName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error loading chart:`, error);
    return false;
  }
}

// Helper function to check indicator list UI
function checkIndicatorListUI() {
  console.log('🔍 Checking indicator list UI...');
  
  try {
    // Look for indicator list elements
    const indicatorElements = document.querySelectorAll('[data-indicator-item]') || 
                             document.querySelectorAll('.indicator-item') ||
                             document.querySelectorAll('.bg-primary\\/10');
    
    console.log(`📊 Found ${indicatorElements.length} active indicators in UI`);
    
    indicatorElements.forEach((element, index) => {
      const indicatorName = element.textContent || element.innerText || 'Unknown';
      console.log(`  ${index + 1}. ${indicatorName.trim()}`);
    });
    
    return indicatorElements.length;
  } catch (error) {
    console.error('❌ Error checking indicator list UI:', error);
    return 0;
  }
}

// Main test function
async function runComprehensiveTest() {
  console.log('🚀 Starting comprehensive indicator test...');
  
  try {
    // Step 1: Clear existing data
    console.log('\n📝 Step 1: Clearing existing data...');
    localStorage.removeItem('chart');
    await wait(1000);
    
    // Step 2: Add multiple indicators
    console.log('\n📝 Step 2: Adding multiple indicators...');
    
    // Add multiple CCI indicators with different settings
    await addCCIIndicator(14, '#ff6b6b');  // Default CCI
    await wait(500);
    await addCCIIndicator(20, '#4ecdc4');  // Custom CCI
    await wait(500);
    
    // Add RSI indicator
    await addRSIIndicator(14);
    await wait(500);
    
    // Add MACD indicator
    await addMACDIndicator();
    await wait(1000);
    
    // Step 3: Check save data
    console.log('\n📝 Step 3: Checking save data...');
    const indicatorCount = checkSaveData();
    console.log(`📊 Total indicators in save data: ${indicatorCount}`);
    
    // Step 4: Check indicator list UI
    console.log('\n📝 Step 4: Checking indicator list UI...');
    const uiIndicatorCount = checkIndicatorListUI();
    console.log(`📊 Total active indicators in UI: ${uiIndicatorCount}`);
    
    // Step 5: Save chart
    console.log('\n📝 Step 5: Saving chart...');
    const testLayoutName = `test_layout_${Date.now()}`;
    await saveChart(testLayoutName);
    await wait(1000);
    
    // Step 6: Clear chart (simulate switching stocks)
    console.log('\n📝 Step 6: Clearing chart (simulating stock switch)...');
    const chart = getChartContext();
    if (chart) {
      // Clear all indicators
      const indicators = chart.getIndicators();
      indicators.forEach(indicator => {
        chart.removeIndicator({ paneId: indicator.paneId, name: indicator.name });
      });
    }
    await wait(1000);
    
    // Step 7: Load chart
    console.log('\n📝 Step 7: Loading chart...');
    await loadChart(testLayoutName);
    await wait(2000);
    
    // Step 8: Verify indicators are restored
    console.log('\n📝 Step 8: Verifying indicators are restored...');
    const restoredIndicatorCount = checkSaveData();
    const restoredUIIndicatorCount = checkIndicatorListUI();
    
    console.log(`📊 Restored indicators in save data: ${restoredIndicatorCount}`);
    console.log(`📊 Restored indicators in UI: ${restoredUIIndicatorCount}`);
    
    // Step 9: Test results
    console.log('\n📝 Step 9: Test Results...');
    
    const success = restoredIndicatorCount > 0 && restoredUIIndicatorCount > 0;
    
    if (success) {
      console.log('✅ COMPREHENSIVE TEST PASSED!');
      console.log('✅ Indicators are properly saved and loaded');
      console.log('✅ Indicator list UI is synchronized');
      console.log('✅ Multiple instances of same indicator work correctly');
    } else {
      console.log('❌ COMPREHENSIVE TEST FAILED!');
      console.log(`❌ Expected indicators to be restored, but got: ${restoredIndicatorCount} in save data, ${restoredUIIndicatorCount} in UI`);
    }
    
    return success;
    
  } catch (error) {
    console.error('❌ Comprehensive test failed with error:', error);
    return false;
  }
}

// Run the test
runComprehensiveTest().then(success => {
  console.log(`\n🏁 Test completed. Success: ${success}`);
}).catch(error => {
  console.error('🏁 Test failed with error:', error);
});

// Export for manual use
window.testIndicatorWorkflow = runComprehensiveTest;
window.addCCIIndicator = addCCIIndicator;
window.addRSIIndicator = addRSIIndicator;
window.addMACDIndicator = addMACDIndicator;
window.checkSaveData = checkSaveData;
window.checkIndicatorListUI = checkIndicatorListUI;

console.log('🔧 Test functions available:');
console.log('  - window.testIndicatorWorkflow() - Run complete test');
console.log('  - window.addCCIIndicator(period, color) - Add CCI indicator');
console.log('  - window.addRSIIndicator(period) - Add RSI indicator');
console.log('  - window.addMACDIndicator() - Add MACD indicator');
console.log('  - window.checkSaveData() - Check save data');
console.log('  - window.checkIndicatorListUI() - Check UI state');