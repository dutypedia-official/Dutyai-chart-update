# Theme Manager Test Guide

## Overview
This guide covers testing the TransactionalThemeManager implementation for the Chart Settings modal.

## Test Scenarios

### 1. Modal Lifecycle Tests

#### Test 1.1: Open Modal
- **Action**: Click Chart Settings button
- **Expected**: 
  - Modal opens
  - Pending state is created (copy of current)
  - Preview mode is NOT active initially
  - Console shows: `THEME_MODAL_OPEN`

#### Test 1.2: Close Modal (Cancel)
- **Action**: Click X or Cancel button
- **Expected**:
  - Modal closes
  - Changes are reverted to original state
  - Pending state is cleared
  - Console shows: `THEME_CANCEL`

#### Test 1.3: Confirm Changes
- **Action**: Make changes, then click Confirm
- **Expected**:
  - Changes are saved to localStorage
  - Current state is updated
  - Pending state is cleared
  - Preview watermark is removed
  - Console shows: `THEME_COMMIT` and `THEME_PERSIST`

#### Test 1.4: Reset Changes
- **Action**: Make changes, then click Reset
- **Expected**:
  - Changes revert to current saved state (not defaults)
  - Preview shows reset state
  - Console shows: `THEME_RESET`

### 2. Canvas Tab UI Tests

#### Test 2.1: Background Color (Solid)
- **Action**: 
  1. Select "Solid" background type
  2. Change background color
  3. Adjust opacity slider
- **Expected**:
  - Preview watermark appears: "PREVIEW"
  - Background changes immediately
  - Pending state updates with solid color and alpha
  - Console shows color change events

#### Test 2.2: Background Color (Gradient)
- **Action**:
  1. Select "Gradient" background type
  2. Open gradient editor
  3. Modify gradient stops
- **Expected**:
  - Preview watermark appears
  - Background shows gradient immediately
  - Pending state updates with gradient spec
  - Solid properties are removed from pending

#### Test 2.3: Grid Color (Solid)
- **Action**:
  1. Select "Solid" grid type
  2. Change grid color
  3. Adjust opacity
- **Expected**:
  - Grid color changes immediately
  - Pending state updates correctly
  - Preview watermark shows

#### Test 2.4: Grid Color (Gradient)
- **Action**:
  1. Select "Gradient" grid type
  2. Configure gradient
- **Expected**:
  - Grid shows blended gradient color
  - Pending state has gradient spec
  - Solid properties removed

#### Test 2.5: Color Type Switching
- **Action**: Switch between Solid ↔ Gradient for background/grid
- **Expected**:
  - Mode changes in pending state
  - Appropriate properties added/removed
  - Visual updates immediately

### 3. Persistence Tests

#### Test 3.1: Settings Persistence
- **Action**:
  1. Make changes and confirm
  2. Refresh page
  3. Open Chart Settings
- **Expected**:
  - Settings are loaded from localStorage
  - UI reflects saved settings
  - Console shows: `THEME_LOAD`

#### Test 3.2: Multiple Chart Instances
- **Action**: Test with different chartId values
- **Expected**:
  - Each chart has separate localStorage key
  - Settings don't interfere between charts

### 4. Error Handling Tests

#### Test 4.1: localStorage Unavailable
- **Action**: Disable localStorage in browser
- **Expected**:
  - Graceful fallback to defaults
  - Error logged but app continues working

#### Test 4.2: Corrupted localStorage Data
- **Action**: Manually corrupt theme data in localStorage
- **Expected**:
  - Falls back to defaults
  - Error logged
  - App continues working

### 5. Performance Tests

#### Test 5.1: Rapid UI Changes
- **Action**: Quickly change multiple settings
- **Expected**:
  - No lag or freezing
  - All changes reflected
  - No memory leaks

#### Test 5.2: Large Gradient Configurations
- **Action**: Create complex gradients with many stops
- **Expected**:
  - Smooth performance
  - Correct rendering

## Debug Information

### Console Logs to Watch For:
- `THEME_MODAL_OPEN`: Modal opened, pending state created
- `THEME_COMMIT`: Changes confirmed and saved
- `THEME_CANCEL`: Changes cancelled and reverted
- `THEME_RESET`: Changes reset to current state
- `THEME_PERSIST`: Settings saved to localStorage
- `THEME_LOAD`: Settings loaded from localStorage

### Visual Indicators:
- **Preview Watermark**: Red "PREVIEW" badge in top-right when in preview mode
- **Immediate Updates**: All changes should be visible immediately
- **Smooth Transitions**: No flickering or jarring changes

## Test Checklist

- [ ] Modal opens and closes correctly
- [ ] Preview mode works with watermark
- [ ] Solid colors work for background and grid
- [ ] Gradients work for background and grid
- [ ] Opacity controls work
- [ ] Color type switching works
- [ ] Confirm saves changes permanently
- [ ] Cancel reverts all changes
- [ ] Reset works correctly
- [ ] Settings persist across page reloads
- [ ] Error handling works gracefully
- [ ] Performance is acceptable
- [ ] Console logs are informative
- [ ] No JavaScript errors in console

## Known Limitations

1. Grid gradients use blended average color (technical limitation)
2. Preview watermark requires `.kline-main` container
3. localStorage keys are scoped per chartId

## Troubleshooting

### If changes don't persist:
1. Check browser localStorage is enabled
2. Verify console for `THEME_PERSIST` logs
3. Check localStorage in DevTools for `dutyai.chart.theme.*` keys

### If preview doesn't work:
1. Verify `.kline-main` container exists
2. Check for CSS conflicts
3. Ensure chart instance is available

### If UI doesn't update:
1. Check console for errors
2. Verify reactive statements are working
3. Check if chart instance is properly bound