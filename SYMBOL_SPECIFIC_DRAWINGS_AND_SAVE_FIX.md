# Symbol-Specific Drawings and Save System Fix

## সমস্যা (Problems)

1. **Save System Not Working**: মেনুবার থেকে Save বাটনে ক্লিক করে নাম দিয়ে save করলে save হচ্ছিল না।
2. **Symbol-Specific Drawings Not Implemented**: Drawings সব symbols জুড়ে দেখা যাচ্ছিল - একটা symbol-এ drawing করলে অন্য symbol-এও দেখা যেত।

## সমাধান (Solutions)

### 1. Save System Integration with DrawingManager

**পরিবর্তন**: `src/lib/kline/saveSystem/SaveSystemIntegration.svelte`

**সমস্যা**: Save system DrawingManager-এর সাথে properly connected ছিল না। এটা empty overlaysStore object (`{}`) ব্যবহার করছিল drawings collect এবং render করার জন্য।

**সমাধান**:
- DrawingManager কে context থেকে access করা হয়েছে
- `collectDrawings()` function update করা হয়েছে DrawingManager থেকে symbol-specific drawings collect করার জন্য
- `renderDrawings()` function update করা হয়েছে DrawingManager-এ drawings load করার জন্য
- `clearAllDrawings()` function update করা হয়েছে DrawingManager ব্যবহার করার জন্য
- DrawingManager initialize হওয়ার জন্য retry logic যোগ করা হয়েছে

**Key Changes**:
```typescript
// Before - using empty overlaysStore
collectDrawings: (symbol: SymbolKey) => collectDrawings($save.symbol, $save.period, {}),

// After - using DrawingManager
collectDrawings: (symbol: SymbolKey) => {
  if (!drawingManager) {
    return [];
  }
  const drawings = drawingManager.getDrawingsForSymbol(symbol);
  return drawings;
},
```

### 2. Symbol-Specific Drawing Isolation

**বর্তমান অবস্থা**: DrawingManager ইতিমধ্যেই symbol-specific functionality implement করা আছে:

- প্রতিটি drawing-এ `symbolKey` property থাকে (e.g., `DSE:GP`)
- Drawings `drawingsBySymbol` Map-এ organized থাকে
- Symbol change হলে automatic cleanup এবং re-rendering হয়
- Hard guard আছে যাতে শুধুমাত্র current symbol-এর drawings render হয়

**Architecture**:
```
DrawingManager
├── drawingsBySymbol: Map<SymbolKey, Drawing[]>
├── setCurrentSymbol(symbol) -> Clear and re-render
├── addDrawing(drawing) -> Validate symbolKey
├── getDrawingsForSymbol(symbol) -> Return filtered drawings
└── renderDrawingsForCurrentSymbol() -> Only current symbol
```

### 3. Save/Load Workflow

**সম্পূর্ণ Flow**:

1. **Save করার সময়**:
   ```
   User clicks Save -> SaveModal appears -> User enters name
   -> SaveManager.save(name) called
   -> collectDrawings(currentSymbol) -> DrawingManager.getDrawingsForSymbol()
   -> Drawings saved in drawingsBySymbol[currentSymbol]
   -> Layout saved to localStorage
   ```

2. **Load করার সময়**:
   ```
   User clicks Load -> SaveManager.load(layoutId)
   -> applyGlobalState() -> Restore indicators, theme, etc.
   -> renderDrawings() -> DrawingManager.loadDrawingsForSymbol()
   -> Only current symbol's drawings rendered
   ```

3. **Symbol Change হলে**:
   ```
   User changes symbol -> DrawingManager.setCurrentSymbol(newSymbol)
   -> Clear rendered drawings
   -> Load and render drawings for new symbol
   -> SaveManager detects change and auto-swaps drawings if active save exists
   ```

## Implementation Details

### DrawingManager (Already Implemented)

`src/lib/kline/drawingManager.ts` - এই file-এ symbol-specific drawing management ইতিমধ্যেই fully implemented আছে:

**Key Features**:
- ✅ Symbol-keyed storage structure
- ✅ Automatic migration from legacy format
- ✅ Hard guards to prevent cross-symbol rendering
- ✅ Symbol change lifecycle management
- ✅ Data coordinates (time/price) based storage
- ✅ localStorage persistence

**Methods**:
- `setCurrentSymbol(symbol)` - Switch active symbol and trigger re-render
- `addDrawing(drawing)` - Add drawing with symbolKey validation
- `removeDrawing(drawingId)` - Remove drawing from any symbol
- `getDrawingsForSymbol(symbolKey)` - Get drawings for specific symbol
- `clearDrawingsForSymbol(symbolKey)` - Clear all drawings for a symbol
- `loadDrawingsForSymbol(symbolKey, drawings)` - Bulk load drawings
- `exportDrawings()` - Export all drawings for backup/save

### Integration Points

1. **drawBar.svelte** - Overlay creation syncs with DrawingManager:
   ```typescript
   // When overlay created or modified
   const drawing: Drawing = {
     id: overlay.id,
     symbolKey: normalizeSymbolKey($save.symbol), // CRITICAL
     type: overlay.name,
     points: overlayPoints,
     styles: overlay.styles,
     locked: overlay.lock,
     visible: overlay.visible
   };
   drawingManager.addDrawing(drawing);
   ```

2. **chart.svelte** - Initializes DrawingManager:
   ```typescript
   drawingManager = initializeDrawingManager({
     chart: $chart,
     persistenceKey: $save.key + '_drawings',
     onDrawingCreated: (drawing) => { /* ... */ },
     onDrawingRemoved: (drawingId, symbolKey) => { /* ... */ }
   });
   ```

3. **SaveSystemIntegration.svelte** - Connects save system with DrawingManager:
   ```typescript
   const runtime: ChartRuntimeContracts = {
     collectDrawings: (symbol) => drawingManager.getDrawingsForSymbol(symbol),
     renderDrawings: (drawings) => drawingManager.loadDrawingsForSymbol(currentSymbol, drawings),
     clearAllDrawings: () => drawingManager.clearDrawingsForSymbol(currentSymbol),
     // ... other contracts
   };
   ```

## Testing Checklist

### Save Functionality
- [x] Click Save button -> Modal appears ✅
- [x] Enter layout name -> Validation works ✅
- [x] Save layout -> Drawings saved with current symbol ✅
- [x] Reload page -> Active save persists ✅
- [x] Load saved layout -> Drawings restored for current symbol ✅

### Symbol-Specific Drawings
- [x] Draw on Symbol A (e.g., DSE:GP) ✅
- [x] Switch to Symbol B (e.g., DSE:ACI) -> Symbol A drawings hidden ✅
- [x] Draw on Symbol B -> New drawings only visible on Symbol B ✅
- [x] Switch back to Symbol A -> Original drawings reappear ✅
- [x] Save layout on Symbol A -> Only Symbol A drawings saved ✅
- [x] Switch to Symbol B and load layout -> Symbol A drawings don't appear ✅

### Edge Cases
- [x] Multiple drawings on same symbol ✅
- [x] Drawing removal works correctly ✅
- [x] Symbol change clears rendered drawings ✅
- [x] No console errors during symbol switch ✅
- [x] localStorage persistence works ✅
- [x] Migration from legacy format works ✅

## QA / Acceptance Criteria

### ✅ Symbol Isolation
- **GP-তে 300-এ horizontal line আঁকলে** → ACI-তে গেলে কিছুই দেখা যাবে না (যদিও ACI-র price 300 কাছাকাছি)
- **GP-তে trendline/fib/emoji আঁকলে** → শুধুই GP-তে দৃশ্যমান
- **Symbol change করলে** → আগের drawings clear হয়, নতুন symbol-এর drawings-ই render হয়

### ✅ Save/Load
- **Save করার পর reload করলে** → Symbol-wise visibility বজায় থাকে
- **Active save থাকলে symbol change করলে** → Automatically correct symbol-এর drawings load হয়
- **Layout load করলে** → শুধু current symbol-এর drawings restore হয়

### ✅ Performance & Stability
- **Console-এ কোনো error নেই**
- **Performance unaffected** - Symbol switch fast এবং smooth
- **Drawing operations responsive** - No lag when adding/removing drawings
- **localStorage efficient** - Only saves when needed

## Migration Notes

**Automatic Migration**: যদি পুরনো format-এ drawings থাকে (without symbolKey), DrawingManager automatically migrate করবে:
- Legacy overlay keys parse করবে (e.g., `GP_4h_overlayId`)
- Symbol name extract করবে
- symbolKey assign করবে
- নতুন format-এ save করবে

**No Data Loss**: সব existing drawings preserve হবে, শুধু নতুন symbol-specific structure-এ organize হবে।

## Files Modified

1. `src/lib/kline/saveSystem/SaveSystemIntegration.svelte` - ✅ Updated
   - Connected with DrawingManager
   - Updated collectDrawings/renderDrawings/clearAllDrawings
   - Added retry logic for DrawingManager initialization

2. `src/lib/kline/drawingManager.ts` - ✅ Already Implemented
   - Symbol-specific storage
   - Automatic cleanup on symbol change
   - Hard guards for rendering
   - Migration support

3. `src/lib/kline/drawBar.svelte` - ✅ Already Syncing
   - Adds symbolKey to new drawings
   - Syncs with DrawingManager on create/remove

## Summary

**সব কাজ সম্পন্ন হয়েছে**:
1. ✅ Save system এখন DrawingManager-এর সাথে properly integrated
2. ✅ Symbol-specific drawings fully implemented এবং working
3. ✅ Save/Load workflow complete
4. ✅ Automatic migration from legacy format
5. ✅ No performance issues
6. ✅ No console errors
7. ✅ All acceptance criteria met

**এখন যা হবে**:
- Save button click করলে proper save modal আসবে ✅
- নাম দিয়ে save করলে drawings symbol-specific save হবে ✅
- Symbol change করলে শুধু সেই symbol-এর drawings দেখা যাবে ✅
- Load করলে correct symbol-এর drawings restore হবে ✅

---

**Date**: November 2, 2025  
**Status**: ✅ Completed  
**Version**: 2.0 (Symbol-Specific + Save Integration)

