# Mobile Separator Drag - Debug Guide

## Current Status
- ✅ CSS `touch-action: none` is applied correctly
- ❌ Separator drag is not working on mobile
- ❓ Touch events might not be reaching the separator element

## What to Test

1. **Refresh the page** (Ctrl+Shift+R / Cmd+Shift+R)
2. **Add an indicator with separate pane** (Volume, MACD, etc.)
3. **Open browser console** (F12)
4. **Look for these logs:**

```
📌 Setting up separator event logging
✅ Separator event logging attached
🔍 Found X separators in chartRef
Separator 0: { touchAction: "none", cursor: "ns-resize", style: "..." }
```

5. **Try dragging the separator on mobile/device emulation**
6. **Watch for:**

```
✅ TOUCHSTART fired on separator!
✅ TOUCHMOVE fired on separator!
✅ TOUCHEND fired
```

## If You See the Logs

✅ **Great!** The touch events ARE reaching the separator.
- This means `touch-action: none` CSS is working correctly
- The klinecharts library should be handling the drag natively
- The issue might be with how the library handles touch

## If You DON'T See the Logs

❌ **The touch events are NOT reaching the separator element.**

This could mean:
1. **The separator is in a Shadow DOM** - klinecharts uses shadow DOM?
2. **The separator is in an iframe** - Event delegation doesn't work across iframes
3. **The library is blocking events** - Library has `pointer-events: none`
4. **Parent element is blocking** - Check if chartRef has the events

### Run This in Console:

```javascript
// Check if the separator itself receives events
const sep = document.querySelector('div[style*="ns-resize"]');
const originalTouchStart = sep.ontouchstart;
sep.ontouchstart = function(e) {
  console.log('🔴 DIRECT touchstart on separator element!');
  if (originalTouchStart) originalTouchStart.call(this, e);
};
console.log('Attached direct listener to separator element');
```

Then try dragging again. If this logs `🔴 DIRECT touchstart`, the element IS receiving events.

## Expected Behavior

With `touch-action: none` properly set:
1. Browser doesn't scroll/zoom when you drag the separator
2. Touch events fire normally on the element
3. The klinecharts library's internal drag handler should work

If the library has touch drag support, dragging should already work. If not, we need to implement custom logic.

## Next Steps

Please share:
1. Do you see the initial logs at page load?
2. When you drag the separator, do you see `✅ TOUCHSTART fired`?
3. What does the console show?

This will help identify where the problem is!

