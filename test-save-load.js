// Comprehensive Save/Load Test Script
// Run this in browser console to test the complete workflow

window.testSaveLoadWorkflow = async function() {
  console.log('🧪 Starting Save/Load Workflow Test...');
  
  // Check if SaveManager is available
  if (!window.saveManager) {
    console.error('❌ SaveManager not available');
    return;
  }
  
  const saveManager = window.saveManager;
  console.log('✅ SaveManager available and initialized:', saveManager.state);
  
  // Step 1: Clear any existing saves for clean test
  console.log('\n📝 Step 1: Clearing existing test saves...');
  const currentLayouts = saveManager.state.subscribe ? 
    await new Promise(resolve => {
      const unsubscribe = saveManager.state.subscribe(state => {
        unsubscribe();
        resolve(state.savedLayouts);
      });
    }) : [];
  
  // Step 2: Check current chart state
  console.log('\n📊 Step 2: Current chart state...');
  console.log('Current localStorage data:', Object.keys(localStorage).filter(k => k.includes('chart')));
  
  // Step 3: Test save functionality
  console.log('\n💾 Step 3: Testing save functionality...');
  const testSaveName = 'Test_CCI_Layout_' + Date.now();
  
  try {
    const saveResult = await saveManager.save(testSaveName);
    console.log('Save result:', saveResult);
    
    if (saveResult.success) {
      console.log('✅ Save successful!');
      
      // Step 4: Verify save data
      console.log('\n🔍 Step 4: Verifying saved data...');
      const savedLayout = await saveManager.storage.getSavedLayout(saveResult.layoutId);
      console.log('Saved layout data:', {
        id: savedLayout?.id,
        name: savedLayout?.name,
        indicatorCount: savedLayout?.indicators?.length || 0,
        indicators: savedLayout?.indicators?.map(ind => ({
          type: ind.type,
          paneId: ind.paneId,
          params: ind.params
        })) || []
      });
      
      // Step 5: Test load functionality
      console.log('\n🔄 Step 5: Testing load functionality...');
      const loadResult = await saveManager.load(saveResult.layoutId);
      console.log('Load result:', loadResult);
      
      if (loadResult.success) {
        console.log('✅ Load successful!');
        console.log('🎉 Save/Load workflow test completed successfully!');
      } else {
        console.error('❌ Load failed:', loadResult.error);
      }
      
    } else {
      console.error('❌ Save failed:', saveResult.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Helper function to add CCI indicator for testing
window.addCCIForTest = function() {
  console.log('📈 Adding CCI indicator for testing...');
  
  // Try to find and click the indicator search button
  const indicatorButton = document.querySelector('[title="Indicators"]') || 
                         document.querySelector('button[aria-label*="indicator"]') ||
                         document.querySelector('button:has(svg)');
  
  if (indicatorButton) {
    console.log('Found indicator button, clicking...');
    indicatorButton.click();
    
    setTimeout(() => {
      // Look for CCI in the list
      const cciButton = Array.from(document.querySelectorAll('button, div')).find(el => 
        el.textContent && el.textContent.includes('CCI')
      );
      
      if (cciButton) {
        console.log('Found CCI button, clicking...');
        cciButton.click();
        console.log('✅ CCI indicator should be added now');
      } else {
        console.log('❌ CCI button not found in indicator list');
      }
    }, 500);
  } else {
    console.log('❌ Indicator button not found');
  }
};

console.log('🔧 Test functions loaded:');
console.log('- Run window.testSaveLoadWorkflow() to test complete save/load workflow');
console.log('- Run window.addCCIForTest() to add CCI indicator for testing');