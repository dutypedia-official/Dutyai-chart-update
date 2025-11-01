// Debug script to check save system status
console.log('=== Save System Debug ===');

// Check if saveManager exists
if (typeof window !== 'undefined' && window.saveManager) {
  console.log('✅ SaveManager found on window');
  
  // Get current state
  const state = window.saveManager.getState();
  console.log('📊 Current SaveManager state:', state);
  
  // Check localStorage
  const layoutsData = localStorage.getItem('chart.saves.v1');
  console.log('💾 localStorage data:', layoutsData ? JSON.parse(layoutsData) : 'No data');
  
  // Check active save ID
  const activeSaveId = localStorage.getItem('chart.activeSaveId');
  console.log('🎯 Active save ID:', activeSaveId);
  
} else {
  console.log('❌ SaveManager not found on window');
}

// Check if chart is loaded
if (typeof window !== 'undefined' && window.chart) {
  console.log('✅ Chart found on window');
} else {
  console.log('❌ Chart not found on window');
}