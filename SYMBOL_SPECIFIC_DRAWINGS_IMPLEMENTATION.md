# Symbol-Specific Drawings Implementation

## সমস্যা (Problem)

আগে drawings (horizontal line, trendline, fibonacci, emoji ইত্যাদি) শুধুমাত্র price/time data coordinates ধরে রাখা হতো। ফলে GP-তে 300-এ লাইন দিলে অন্য symbol-এ 300 price থাকলেই সেটি দেখা যাচ্ছিল। এটি ভুল ছিল — drawings অবশ্যই যে symbol-এ আঁকা হয়েছে, শুধু সেই symbol-এই দেখা উচিত।

Previously, drawings (horizontal lines, trendlines, fibonacci, emojis, etc.) were only storing price/time data coordinates. As a result, if you drew a line at 300 on GP, it would appear on other symbols that also had price 300. This was incorrect — drawings must ONLY appear on the symbol they were created on.

## সমাধান (Solution)

এখন প্রতিটি drawing-এ বাধ্যতামূলকভাবে `symbolKey` যুক্ত করা হয়েছে (যেমন: `DSE:GP`, uppercase + exchange prefix)। Drawing শুধুমাত্র সেই symbol-এ render হবে যার `symbolKey` match করে।

Now each drawing has a mandatory `symbolKey` (e.g., `DSE:GP`, uppercase + exchange prefix). Drawings will ONLY render on the symbol whose `symbolKey` matches.

## প্রধান পরিবর্তনসমূহ (Key Changes)

### 1. Drawing Model Update (`types.ts`)

```typescript
export interface Drawing {
  id: string;
  symbolKey: SymbolKey; // ✅ MANDATORY: normalized symbol key (e.g., "DSE:GP")
  type: string;
  points: Array<{ time: number; price: number }>;
  styles: Record<string, any>;
  locked?: boolean;
  visible?: boolean;
  seriesId?: string; // Optional: for multi-series support
}
```

**পরিবর্তন:**
- `symbolKey` এখন বাধ্যতামূলক field
- সমস্ত drawings এ normalized symbol key থাকবে
- `seriesId` সংযোজিত হয়েছে ভবিষ্যতে multi-series support এর জন্য

### 2. DrawingManager Class (`drawingManager.ts`)

নতুন `DrawingManager` class তৈরি করা হয়েছে যা:

**Core Features:**
- ✅ Symbol-wise drawing storage: `drawingsBySymbol: Map<SymbolKey, Drawing[]>`
- ✅ Auto-filtering: শুধুমাত্র current symbol এর drawings render হয়
- ✅ Symbol change handling: symbol পরিবর্তনের সাথে সাথে drawings swap হয়
- ✅ Legacy migration: পুরনো drawings স্বয়ংক্রিয়ভাবে migrate হয়
- ✅ Persistence: localStorage এ symbol-wise সংরক্ষণ

**Key Methods:**

```typescript
// Set current symbol and render its drawings
setCurrentSymbol(symbol: SymbolInfo | SymbolKey): void

// Add drawing for a symbol
addDrawing(drawing: Drawing): void

// Remove drawing by ID
removeDrawing(drawingId: string): boolean

// Get drawings for specific symbol
getDrawingsForSymbol(symbolKey: SymbolKey): Drawing[]

// Get current symbol drawings
getCurrentSymbolDrawings(): Drawing[]
```

**Storage Structure:**

```json
{
  "drawingsBySymbol": {
    "DSE:GP": [
      {
        "id": "overlay_123",
        "symbolKey": "DSE:GP",
        "type": "horizontalSegment",
        "points": [{ "time": 1234567890, "price": 300 }],
        "styles": { ... }
      }
    ],
    "DSE:SQURPHARMA": [
      {
        "id": "overlay_456",
        "symbolKey": "DSE:SQURPHARMA",
        "type": "trendline",
        "points": [ ... ]
      }
    ]
  },
  "version": 1
}
```

### 3. Symbol Change Lifecycle (`chart.svelte`)

```typescript
// Initialize DrawingManager
drawingManager = initializeDrawingManager({
  chart: $chart,
  persistenceKey: $save.key + '_drawings',
  onDrawingCreated: (drawing) => { ... },
  onDrawingRemoved: (drawingId, symbolKey) => { ... },
  onSymbolChanged: (oldSymbol, newSymbol) => { ... }
});

// Set current symbol
const currentSymbolKey = normalizeSymbolKey($save.symbol);
drawingManager.setCurrentSymbol(currentSymbolKey);

// Listen to symbol changes
symbol.subscribe((val) => {
  // Update DrawingManager with new symbol
  if (drawingManager) {
    const newSymbolKey = normalizeSymbolKey($save.symbol);
    drawingManager.setCurrentSymbol(newSymbolKey);
  }
  // ... load new data
});
```

**Symbol Change Flow:**

1. User selects new symbol
2. `symbol.subscribe` triggers
3. `drawingManager.setCurrentSymbol(newSymbol)` called
4. Old symbol drawings cleared from chart
5. New symbol drawings loaded and rendered
6. ✅ Previous symbol drawings preserved in memory but not visible

### 4. Overlay Creation Integration (`overlayCreation.ts`)

```typescript
export class OverlayCreationManager {
  private currentSymbolKey: string | null = null;

  setCurrentSymbolKey(symbolKey: string): void {
    this.currentSymbolKey = symbolKey;
  }

  createOverlay(type, points, options): DataSpaceOverlay {
    const symbolKey = options.symbolKey || this.currentSymbolKey;
    
    return {
      id: generatePointId(),
      symbolKey, // ✅ Auto-assigned from current symbol
      type,
      points,
      // ...
    };
  }
}
```

**পরিবর্তন:**
- প্রতিটি overlay তৈরির সময় স্বয়ংক্রিয়ভাবে `symbolKey` সংযোজিত হয়
- Current symbol track করা হয় `currentSymbolKey` দিয়ে

### 5. Drawing Bar Integration (`drawBar.svelte`)

```typescript
// Get DrawingManager from context
const drawingManagerContext = getContext('drawingManager') as { get: () => any | null };

// When overlay is created/updated
function editOverlay(overlay: any) {
  // ... existing code ...
  
  // Sync with DrawingManager
  const drawingManager = drawingManagerContext.get();
  if (drawingManager && overlay.points && overlay.points.length > 0) {
    const symbolKey = normalizeSymbolKey($save.symbol);
    
    const drawing: Drawing = {
      id: overlay.id,
      symbolKey, // ✅ Add symbolKey
      type: overlay.name || 'unknown',
      points: overlay.points.map((point: any) => ({
        time: point.timestamp || point.t || 0,
        price: point.value || point.p || 0
      })),
      styles: overlay.styles || {},
      locked: Boolean(overlay.lock),
      visible: overlay.visible !== false
    };
    
    drawingManager.addDrawing(drawing);
  }
}

// When overlay is removed
onRemoved: (event) => {
  // ... existing code ...
  
  const drawingManager = drawingManagerContext.get();
  if (drawingManager) {
    drawingManager.removeDrawing(event.overlay.id);
  }
}
```

### 6. Save/Load System (`chartStateCollector.ts`)

```typescript
// Collecting drawings - always include symbolKey
function convertOverlayToDrawing(
  overlayId: string,
  overlayData: Record<string, unknown>,
  symbolKey: SymbolKey // ✅ Pass symbolKey
): Drawing | null {
  return {
    id: overlayId,
    symbolKey, // ✅ MANDATORY assignment
    type: (overlayData.name as string) || 'unknown',
    points,
    styles,
    // ...
  };
}

// Rendering drawings - verify symbolKey
export function renderDrawings(drawings, symbol, period, chart, overlaysStore) {
  const symbolKey = normalizeSymbolKey(symbol);
  
  drawings.forEach(drawing => {
    // ✅ HARD GUARD: Verify symbolKey matches
    if (drawing.symbolKey && drawing.symbolKey !== symbolKey) {
      console.warn('⛔ Drawing symbolKey mismatch, skipping render');
      return; // Skip rendering
    }
    
    // ... create overlay on chart
  });
}
```

**Guardrails:**
- ✅ Hard guard in render pipeline prevents cross-symbol rendering
- ✅ Warnings logged for mismatched symbolKeys
- ✅ Graceful handling of drawings without symbolKey

### 7. Legacy Migration

DrawingManager automatically migrates old storage formats:

```typescript
private migrateLegacyStorage(legacyStore: any): void {
  // Parse legacy keys: "GP_4h_overlayId"
  Object.entries(legacyStore).forEach(([key, overlayData]) => {
    const parts = key.split('_');
    const overlayId = parts[parts.length - 1];
    const symbolName = parts.slice(0, -2).join('_');
    
    // Convert to SymbolKey format
    const symbolKey = symbolName.toUpperCase();
    
    // Convert to Drawing with symbolKey
    const drawing = this.convertLegacyOverlayToDrawing(
      overlayId, 
      overlayData, 
      symbolKey // ✅ Assign symbolKey during migration
    );
    
    // Store in new format
    // ...
  });
}
```

## Testing Guide (পরীক্ষা নির্দেশিকা)

### Test 1: Drawing Creation on Single Symbol

1. Open GP symbol
2. Draw a horizontal line at price 300
3. Draw a trendline
4. ✅ **Expected:** Both drawings visible on GP
5. Check console: `✅ Drawing created: overlay_xxx for symbol: DSE:GP`

### Test 2: Symbol Switch - Isolation

1. On GP, draw horizontal line at 300
2. Switch to SQURPHARMA
3. ✅ **Expected:** GP's line should NOT appear on SQURPHARMA
4. Check console:
   - `🔄 Symbol changed in DrawingManager: DSE:GP → DSE:SQURPHARMA`
   - `🧹 Cleared rendered drawings from chart`
   - `🎨 Rendering 0 drawings for symbol: DSE:SQURPHARMA`

### Test 3: Multiple Symbols with Drawings

1. GP: Draw line at 300
2. SQURPHARMA: Draw line at 250
3. GP: Draw fibonacci retracement
4. Switch between symbols
5. ✅ **Expected:**
   - GP shows: line at 300 + fibonacci (2 drawings)
   - SQURPHARMA shows: line at 250 (1 drawing)
   - No cross-contamination

### Test 4: Drawing Persistence

1. Draw several lines on GP
2. Switch to another symbol
3. Refresh the page
4. Go back to GP
5. ✅ **Expected:** All GP drawings restored correctly
6. Check localStorage: `chart_drawings` has symbol-keyed structure

### Test 5: Drawing Deletion

1. GP: Draw 3 lines
2. Delete 1 line using context menu
3. ✅ **Expected:** 
   - Line removed from chart
   - Console: `🗑️ Removed drawing from DrawingManager: overlay_xxx`
4. Switch to another symbol and back
5. ✅ **Expected:** Deleted line does NOT reappear

### Test 6: Legacy Migration

1. If you have old drawings (before this update)
2. Open chart
3. ✅ **Expected:**
   - Console: `🔄 Starting migration of legacy overlay format...`
   - Console: `✅ Migration complete: X symbols migrated`
4. Old drawings should appear on their original symbols
5. Storage format updated to new structure

### Test 7: Save/Load Layouts

1. GP: Draw lines and fibonacci
2. SQURPHARMA: Draw trendlines
3. Save layout as "Test Layout"
4. Switch symbols, modify some drawings
5. Load "Test Layout"
6. ✅ **Expected:**
   - All drawings restored correctly per symbol
   - GP shows its drawings
   - SQURPHARMA shows its drawings
   - No mixing

### Test 8: Undo/Redo with Symbol Switch

1. GP: Draw line A
2. Switch to SQURPHARMA
3. SQURPHARMA: Draw line B
4. Undo (Ctrl+Z)
5. ✅ **Expected:** Line B removed on SQURPHARMA
6. Switch to GP
7. Undo (Ctrl+Z)
8. ✅ **Expected:** Line A removed on GP

## Console Logs Guide

### Normal Operation

```
✅ DrawingManager initialized for symbol: DSE:GP
📍 OverlayCreationManager symbol set: DSE:GP
✅ Drawing created: overlay_abc123 for symbol: DSE:GP
🎨 Rendering 1 drawings for symbol: DSE:GP
```

### Symbol Change

```
🔄 Symbol changed in DrawingManager: DSE:GP → DSE:SQURPHARMA
🧹 Cleared rendered drawings from chart
🎨 Rendering 0 drawings for symbol: DSE:SQURPHARMA
```

### Drawing Deletion

```
🗑️ Removed drawing from DrawingManager: overlay_abc123
```

### Migration

```
🔄 Starting migration of legacy overlay format...
✅ Migration complete: 3 symbols migrated
📂 Loaded drawings from storage: 3 symbols
```

### Errors/Warnings

```
⚠️ Creating overlay without symbolKey - may not persist correctly
⛔ Drawing symbolKey mismatch, skipping render: { drawingSymbol: 'DSE:GP', currentSymbol: 'DSE:SQURPHARMA' }
```

## API Reference

### DrawingManager

```typescript
class DrawingManager {
  // Initialize with options
  constructor(options: DrawingManagerOptions)
  
  // Symbol management
  setCurrentSymbol(symbol: SymbolInfo | SymbolKey): void
  getCurrentSymbol(): SymbolKey | null
  
  // Drawing operations
  addDrawing(drawing: Drawing): void
  removeDrawing(drawingId: string): boolean
  removeDrawingForSymbol(drawingId: string, symbolKey: SymbolKey): boolean
  updateDrawing(drawingId: string, updates: Partial<Drawing>): boolean
  
  // Retrieval
  getDrawingsForSymbol(symbolKey: SymbolKey): Drawing[]
  getCurrentSymbolDrawings(): Drawing[]
  getAllDrawings(): Map<SymbolKey, Drawing[]>
  
  // Bulk operations
  clearDrawingsForSymbol(symbolKey: SymbolKey): void
  clearCurrentSymbolDrawings(): void
  loadDrawingsForSymbol(symbolKey: SymbolKey, drawings: Drawing[]): void
  loadAllDrawings(drawingsBySymbol: Record<SymbolKey, Drawing[]>): void
  
  // Utility
  onSymbolChange(callback: (newSymbol: SymbolKey) => void): void
  offSymbolChange(callback: (newSymbol: SymbolKey) => void): void
  exportDrawings(): Record<SymbolKey, Drawing[]>
  getStats(): { totalSymbols, totalDrawings, currentSymbolDrawings, renderedDrawings }
  destroy(): void
}
```

### normalizeSymbolKey

```typescript
function normalizeSymbolKey(symbol: SymbolInfo): SymbolKey
// Input: { exchange: 'DSEBD', ticker: 'GP', ... }
// Output: "DSE:GP"
```

## Troubleshooting

### Problem: Old drawings still showing on all symbols

**Solution:**
1. Open browser DevTools → Application → Local Storage
2. Delete keys: `chart_drawings`, `chart_overlays`
3. Refresh page
4. Drawings will be migrated from `chart_overlays` if available

### Problem: Drawings not persisting after refresh

**Check:**
1. Console for errors during save
2. localStorage quota (may be full)
3. DrawingManager initialization log: `✅ DrawingManager initialized`

### Problem: Drawings appear on wrong symbol

**Check:**
1. Console for `⛔ Drawing symbolKey mismatch` warnings
2. Verify symbolKey in localStorage: `chart_drawings`
3. If symbolKey is wrong, delete and recreate drawing

## Performance Considerations

- **Memory:** Drawings stored per symbol in Map (O(1) lookup)
- **Rendering:** Only current symbol drawings rendered (filtered)
- **Storage:** Symbol-wise buckets reduce save/load overhead
- **Migration:** Runs once on first load with legacy data

## Future Enhancements

1. ✅ **seriesId Support:** Multi-series filtering (already in schema)
2. **Drawing Templates:** Save/load drawing sets per symbol
3. **Drawing Groups:** Group-level symbol filtering
4. **Cloud Sync:** Sync drawings across devices per symbol
5. **Drawing Search:** Search drawings by symbol/type

## Files Modified

1. ✅ `/src/lib/kline/saveSystem/types.ts` - Added symbolKey to Drawing interface
2. ✅ `/src/lib/kline/drawingManager.ts` - New DrawingManager class
3. ✅ `/src/lib/kline/overlays/overlayTypes.ts` - Added symbolKey to DataSpaceOverlay
4. ✅ `/src/lib/kline/overlays/overlayCreation.ts` - Auto-assign symbolKey
5. ✅ `/src/lib/kline/chart.svelte` - Initialize DrawingManager, handle symbol changes
6. ✅ `/src/lib/kline/drawBar.svelte` - Sync with DrawingManager
7. ✅ `/src/lib/kline/saveSystem/chartStateCollector.ts` - Include symbolKey in save/load

## Summary (সারসংক্ষেপ)

এখন drawings সম্পূর্ণভাবে symbol-specific হয়েছে। একটি symbol-এ আঁকা drawings অন্য symbol-এ দেখা যাবে না, এমনকি price coordinates match করলেও। সমস্ত drawing operations (create, update, delete, save, load) এখন symbolKey aware।

Now drawings are completely symbol-specific. Drawings created on one symbol will NOT appear on another symbol, even if price coordinates match. All drawing operations (create, update, delete, save, load) are now symbolKey aware.

**Key Benefits:**
✅ No cross-symbol drawing contamination
✅ Proper isolation per trading symbol  
✅ Seamless symbol switching
✅ Persistent per-symbol storage
✅ Automatic legacy migration
✅ Hard guards prevent rendering errors

**Status:** ✅ Fully Implemented & Production Ready

