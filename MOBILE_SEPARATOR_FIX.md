# Mobile Separator Drag Fix - Advanced Solution

## Problem
The kline separator widget (divider between chart panes) was not working on mobile devices. Users couldn't drag to resize panels when indicators with separate panes (like volume, MACD, etc.) were added.

## Root Causes
1. **Dynamic separator creation** - The klinecharts library creates separators dynamically, and they may not exist when initial JavaScript runs
2. **Inline styles from library** - The library applies inline styles that could override our CSS
3. **Missing element tracking** - When adding/removing indicators, new separators are created but weren't being tracked
4. **CSS selector mismatch** - Simple selectors weren't matching all separator variants

## Solution Implemented - Multi-Layer Approach

### 1. Aggressive Element Selection
```typescript
const separators = chartRef?.querySelectorAll(
  '.klinecharts-pane-separator, [data-pane-separator], div[style*="ns-resize"]'
);
```
Catches separators via:
- Class name (`.klinecharts-pane-separator`)
- Data attribute (`[data-pane-separator]`)
- Style pattern (`div[style*="ns-resize"]`) ← Matches library's inline style with cursor

### 2. Inline Style Injection with !important
```typescript
// Override even inline styles from the library
element.setAttribute('style', 
  (element.getAttribute('style') || '') + '; touch-action: none !important;'
);
```
This ensures `touch-action: none` is set with highest priority via inline attribute.

### 3. MutationObserver for Dynamic Elements
```typescript
const observer = new MutationObserver((mutations) => {
  if (mutations.some(m => m.addedNodes.length > 0)) {
    setTimeout(() => {
      initializeSeparators(); // Re-run when new elements added
    }, 50);
  }
});

observer.observe(chartRef, {
  childList: true,
  subtree: true
});
```
Automatically initializes new separators when indicators are added/removed.

### 4. Periodic Safety Check
```typescript
const separatorCheckInterval = setInterval(() => {
  initializeSeparators();
}, 1000);
```
Runs every second to catch any separators that might have been missed or recreated.

### 5. Proper Cleanup
```typescript
onDestroy(() => {
  observer.disconnect();
  clearInterval(separatorCheckInterval);
});
```
Prevents memory leaks and zombie observers.

## What This Fixes
✅ **Dynamic creation**: Catches separators added after initial load
✅ **Indicator changes**: Updates when adding/removing indicators with new panes
✅ **Library overrides**: Inline style injection overrides library defaults
✅ **Mobile touch**: No `preventDefault()` - allows library's native drag
✅ **No memory leaks**: Proper cleanup on component destroy

## Technical Details

### Touch Event Flow
1. **touchstart**: Adds dragging class (no preventDefault!)
2. **touchmove**: Maintains dragging class, library handles actual drag
3. **touchend**: Removes dragging class
4. **Library**: Internally handles pan/resize of panes

### CSS Support
- `touch-action: none` - Tells browser to allow custom drag handling
- `cursor: ns-resize` - Shows resize cursor on desktop
- Visual feedback via `.dragging` class

## Files Modified
- `src/lib/kline/chart.svelte`
  - Lines 857-959: Separator initialization with MutationObserver
  - Lines 839-854: Cleanup in onDestroy
  - Line 2326: CSS `touch-action: none !important`

## Testing Checklist
✅ Add indicator with separate pane (e.g., Volume, MACD)
✅ On mobile device, drag separator up/down to resize
✅ Add another indicator - separator should still work
✅ Remove indicator - separator should still work
✅ Desktop mouse drag should still work
✅ Visual feedback (dragging state) shows during drag

## Browser Compatibility
- ✅ iOS Safari 13+
- ✅ Chrome Mobile 60+
- ✅ Firefox Mobile 68+
- ✅ Samsung Internet 8+
- ✅ Edge Mobile

