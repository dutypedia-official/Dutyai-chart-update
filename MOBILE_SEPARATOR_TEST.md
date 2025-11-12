# Mobile Separator Drag - Testing Guide

## How to Test

### Quick Test (Desktop - using browser DevTools)
1. Open browser DevTools (F12)
2. Toggle device emulation (Ctrl+Shift+M / Cmd+Shift+M)
3. Choose iPhone 12 or similar
4. Add an indicator with a separate pane (e.g., Volume, MACD, RSI)
5. In the simulated mobile view:
   - Look for the horizontal line between the main chart and indicator pane
   - Try to drag it up/down
   - The separator should move and resize the panes

### Real Mobile Device Test
1. Open the chart on your mobile device (iPhone, Android, etc.)
2. Add an indicator with a separate pane (Volume, MACD, RSI, KDJ, etc.)
3. Locate the separator line between the two panes
4. **Drag the separator vertically** to resize
   - This should now work smoothly
   - You might feel a slight vibration (haptic feedback)

## How to Add Indicators with Separate Panes
1. Click the **"Add Indicator"** button
2. Search for indicators like:
   - **Volume (VOL)** - Shows volume bars
   - **MACD** - Shows moving average convergence divergence
   - **RSI** - Shows relative strength index
   - **KDJ** - Shows KDJ indicator
   - **Stochastic** - Shows stochastic oscillator

3. These will create new panes below the main candlestick chart

## What Should Happen
✅ When you touch the separator, it should have a **dragging class** applied  
✅ The panes should resize smoothly as you drag  
✅ Release your finger and it should stay at the new size  
✅ You can add/remove indicators and the separator still works  

## Debugging in Console

If it's not working, open browser console (F12) and check for:

```javascript
// Check if separator has touch-action set
const sep = document.querySelector('.klinecharts-pane-separator');
console.log('Separator:', sep);
console.log('Style:', sep?.getAttribute('style'));
console.log('Has touch-action:', sep?.getAttribute('style')?.includes('touch-action'));
```

## Expected Output
```
Separator: <div style="... touch-action: none !important; ...">
Style: width: 100%; height: 7px; ... touch-action: none !important;
Has touch-action: true
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Separator won't move | touch-action not set | Refresh page or check console |
| Only works on desktop | Library not receiving touch | Check that preventDefault() is removed |
| Separator disappears | Library recreating elements | Observer should catch it within 50ms |
| Works once then breaks | Event listener not reattached | Check MutationObserver is running |

## How the Fix Works

1. **Selector Pattern**: `div[style*="ns-resize"]`
   - Catches the separator even without class name
   - Matches library's inline cursor style

2. **Inline Style Injection**: `touch-action: none !important`
   - Set directly on element after library creates it
   - Using `setAttribute()` to preserve library's inline styles

3. **MutationObserver**: Watches for new elements
   - Automatically initializes new separators
   - Triggered when indicators are added/removed

4. **Periodic Check**: Runs every 1 second
   - Safety net for any separators that were missed
   - Prevents breaking when library recreates elements

## Performance Notes
- ✅ MutationObserver is efficient (only runs on element additions)
- ✅ Interval check every 1 second is minimal overhead
- ✅ All cleanup done on component destroy (no memory leaks)
- ✅ No preventDefault() blocking - uses library's native handlers


