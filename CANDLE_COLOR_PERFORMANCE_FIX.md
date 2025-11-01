# Candle Color Performance Fix

## Problem
After changing candle colors from the settings modal, the chart becomes slow and laggy during scrolling.

## Root Cause
The `updateCandleStyles()` function was calling `$chart.setStyles()` immediately on every color change. This triggered a full chart re-render for each color picker movement, causing performance degradation especially when:
- User is actively dragging color picker sliders
- User is scrolling the chart while the color preview is updating
- Multiple rapid color changes occur

## Solution
Implemented **debouncing** for candle style updates to batch multiple rapid changes into a single render operation.

### Changes Made

1. **Added Debounce Timer** (Line 28):
   ```typescript
   let candleStyleUpdateTimer: ReturnType<typeof setTimeout> | null = null;
   ```

2. **Modified `updateCandleStyles()` Function** (Lines 1228-1268):
   - Wrapped the style update logic in a debounced setTimeout (16ms delay)
   - Clears any pending updates before scheduling a new one
   - Only applies styles after user stops making changes for 16ms (~60fps)
   - Prevents excessive re-renders during rapid color changes

3. **Added Timer Cleanup** (Lines 40-43):
   - Clears pending style updates when modal is closed
   - Prevents memory leaks and unnecessary operations

## Technical Details

### Debounce Delay
- **16ms** was chosen as the debounce delay
- This corresponds to approximately 60fps (1000ms / 60 = 16.67ms)
- Ensures smooth visual updates while preventing excessive re-renders

### How It Works
1. User changes a candle color (e.g., bull body color)
2. `updateCandleStyles()` is called
3. Any pending update is cancelled
4. A new update is scheduled for 16ms in the future
5. If user makes another change within 16ms, step 3-4 repeat
6. Only when user pauses for 16ms does the actual `setStyles()` call execute
7. Chart re-renders once with all accumulated changes

## Benefits
- ✅ **Smooth scrolling** - No lag during chart navigation
- ✅ **Responsive UI** - Color picker still feels immediate
- ✅ **Reduced CPU usage** - Fewer chart re-renders
- ✅ **Better UX** - No stuttering during rapid color changes
- ✅ **Memory efficient** - Timer cleanup prevents leaks

## Testing Recommendations
1. Open Settings → Candle tab
2. Rapidly drag color picker sliders back and forth
3. Scroll the chart while color picker is open
4. Verify no lag or stuttering occurs
5. Close modal and verify chart scrolling remains smooth
6. Test with multiple color pickers (body, border, wick)

## Performance Metrics
**Before Fix:**
- Each color change = Immediate `setStyles()` call
- Rapid changes = Multiple re-renders per second
- Scrolling + color changes = Compounded lag

**After Fix:**
- Multiple color changes = Single debounced `setStyles()` call
- Maximum 60 re-renders per second (rate-limited)
- Scrolling + color changes = Smooth performance

## Related Files
- `/src/lib/kline/modalChartSetting.svelte` - Main settings modal with performance fix

## Notes
- This fix specifically targets candle color updates
- Background and grid color updates have separate optimization mechanisms
- The 16ms delay is imperceptible to users but significantly improves performance
- Timer is properly cleaned up to prevent memory leaks
