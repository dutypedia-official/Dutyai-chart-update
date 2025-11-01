// Test script to manually test save functionality
console.log('=== Testing Save Functionality ===');

async function testSaveSystem() {
  if (!window.saveManager) {
    console.error('❌ SaveManager not available');
    return;
  }
  
  try {
    console.log('🧪 Testing save functionality...');
    
    // Test save
    const saveResult = await window.saveManager.save('Test Layout ' + Date.now());
    console.log('💾 Save result:', saveResult);
    
    // Check if saved layouts are updated
    const state = window.saveManager.getState();
    console.log('📊 Updated state:', state);
    
    // Check localStorage directly
    const layoutsData = localStorage.getItem('chart.saves.v1');
    console.log('💾 localStorage after save:', layoutsData ? JSON.parse(layoutsData) : 'No data');
    
  } catch (error) {
    console.error('❌ Save test failed:', error);
  }
}

// Run test after a delay to ensure everything is loaded
setTimeout(testSaveSystem, 2000);