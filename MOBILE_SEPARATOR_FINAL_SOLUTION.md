# Mobile Separator Drag - Final Solution

## Problem
Pane separators (dividers between chart panes) could not be dragged on mobile devices in the klinecharts library.

## Root Cause
The klinecharts library **already has built-in drag support for separators**, but on touch devices, the browser's default touch behaviors (scrolling, zooming) were preventing the library's drag handlers from working.

## Solution Implemented
We added a **CSS rule that disables browser default touch behaviors on separator elements**:

```css
:global(div[style*="ns-resize"]) {
  touch-action: none !important;
}
```

This tells the browser:
- ✅ Don't scroll when touching the separator
- ✅ Don't zoom when pinching on the separator
- ✅ **Allow the element's own pointer/touch handlers to work**

## What Was Changed

### 1. Added CSS Rule
**File:** `src/lib/kline/chart.svelte`

**Location:** Lines 2376-2379 in the `<style>` block

```css
/* CRITICAL: Catch separators created with inline styles (ns-resize) */
:global(div[style*="ns-resize"]) {
  touch-action: none !important;
}
```

### 2. Existing CSS Rule (Already Present)
**Location:** Lines 2367 in the `<style>` block

```css
:global(.klinecharts-pane-separator) {
  touch-action: none !important; /* Allow custom drag handling on mobile */
}
```

## How It Works

1. **When page loads:** The CSS rules apply to all separator elements
2. **When you touch a separator on mobile:** 
   - The `touch-action: none` CSS rule prevents default touch scrolling
   - The klinecharts library's native pointer/touch handlers take over
   - Dragging the separator resizes the panes normally

## Testing

### On Desktop
✅ Mouse drag on separator works (unchanged)

### On Mobile/Touch Devices
1. Add an indicator with a separate pane (Volume, MACD, RSI, etc.)
2. Locate the horizontal line between panes
3. Touch and drag the separator vertically
4. The panes should resize smoothly

### Expected Behavior
- Touching separator shows no visual feedback from browser
- Dragging moves smoothly without page scrolling
- Releasing touch keeps the new pane sizes
- Works on all indicators with multi-pane layouts

## Browser Support
✅ iOS Safari 13+  
✅ Chrome Mobile 60+  
✅ Firefox Mobile 68+  
✅ Samsung Internet 8+  
✅ All modern touch-capable browsers

## CSS Properties Used

| Property | Value | Purpose |
|----------|-------|---------|
| `touch-action` | `none` | Disable browser default touch behaviors |
| `!important` | - | Ensure rule applies over library styles |

## Why This Works

The klinecharts library already implements separator drag using:
- `pointerdown`, `pointermove`, `pointerup` events (modern browsers)
- `touchstart`, `touchmove`, `touchend` events (fallback)

The problem was the **browser intercepted these events** before the library could use them.

By setting `touch-action: none`, we tell the browser:
> "Don't handle touch events for this element - let the application handle them instead"

This allows the klinecharts library to receive and process the drag events properly.

## No Additional JavaScript Needed

Unlike many mobile drag solutions, we **don't need custom JavaScript drag logic** because:
1. The library already has working drag code
2. We just needed to enable it on touch devices
3. The CSS solution is simple, reliable, and low-overhead

## Cleanup
No cleanup needed - the CSS rule is permanent and applies to all separators automatically.

## References
- [MDN: touch-action CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)
- [W3C: Pointer Events](https://www.w3.org/TR/pointerevents/)

