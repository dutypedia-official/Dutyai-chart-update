# Indicator Implementation Guide 📊

এই গাইডটি BBI indicator implementation দেখে অন্যান্য indicator গুলো সহজে add এবং fix করার জন্য তৈরি করা হয়েছে।

## 🎯 Overview

BBI (Bull and Bear Index) indicator এর implementation pattern অনুসরণ করে যেকোনো indicator সঠিকভাবে implement করা যায়। এই গাইডে step-by-step process দেওয়া আছে।

## 📁 File Structure

```
src/lib/kline/
├── modalIndCfg.svelte     # Main indicator configuration modal
├── modalIndSearch.svelte  # Indicator search and add modal
└── chart.ts              # Chart context and state management
```

## 🔧 Implementation Steps

### Step 1: Variable Declaration

প্রতিটি indicator এর জন্য প্রয়োজনীয় variables declare করুন:

```typescript
// modalIndCfg.svelte এর script section এ

// Indicator state variables
let bbiGroups = $state<BbiGroup[]>([]);
let showBbiColorPalette = $state(false);
let bbiColorPalettePosition = $state({ x: 0, y: 0 });
let bbiColorPaletteIndex = $state(0);

// Indicator type check
$: isBbi = $ctx.editIndName === 'BBI';
```

### Step 2: Data Structure Definition

Indicator এর জন্য TypeScript interface define করুন:

```typescript
interface BbiGroup {
  id: string;
  name: string;
  period1: number;
  period2: number;
  period3: number;
  period4: number;
  color: string;
  thickness: number;
  lineStyle: string;
}
```

### Step 3: Initialization Function

Existing indicator data load করার জন্য initialization function তৈরি করুন:

```typescript
function initializeBbiGroups() {
  if (!isBbi) return;
  
  // Find all existing BBI indicators in save data
  const allBbiKeys = Object.keys($save.saveInds).filter(key => 
    $save.saveInds[key].name === 'BBI'
  ).sort((a, b) => {
    // Sort to ensure proper order
    if (a === `${$ctx.editPaneId}_BBI`) return -1;
    if (b === `${$ctx.editPaneId}_BBI`) return 1;
    return a.localeCompare(b);
  });
  
  if (allBbiKeys.length > 0) {
    // Load all existing groups
    bbiGroups = [];
    allBbiKeys.forEach((key, index) => {
      const savedInd = $save.saveInds[key];
      if (savedInd) {
        if ((savedInd as any).bbiGroup) {
          bbiGroups.push({...(savedInd as any).bbiGroup});
        } else if (savedInd.params && savedInd.params.length === 4) {
          // Create group from params if bbiGroup doesn't exist
          bbiGroups.push({
            id: crypto.randomUUID(),
            name: `BBI${index + 1}`,
            period1: savedInd.params[0] || 3,
            period2: savedInd.params[1] || 6,
            period3: savedInd.params[2] || 12,
            period4: savedInd.params[3] || 24,
            color: '#8B5CF6',
            thickness: 1,
            lineStyle: 'solid'
          });
        }
      }
    });
  } else {
    // Create default group if none exist
    bbiGroups = [{
      id: crypto.randomUUID(),
      name: 'BBI',
      period1: 3,
      period2: 6,
      period3: 12,
      period4: 24,
      color: '#8B5CF6',
      thickness: 1,
      lineStyle: 'solid'
    }];
  }
}
```

### Step 4: Add More Function

নতুন indicator group add করার function:

```typescript
function addBbiGroup() {
  if (!isBbi) return;
  
  const groupNumber = bbiGroups.length + 1;
  bbiGroups.push({
    id: crypto.randomUUID(),
    name: `BBI${groupNumber}`,
    period1: 3,
    period2: 6,
    period3: 12,
    period4: 24,
    color: '#8B5CF6',
    thickness: 1,
    lineStyle: 'solid'
  });
}
```

### Step 5: Remove Function

Indicator group remove করার function:

```typescript
function removeBbiGroup(groupId: string) {
  if (!isBbi || bbiGroups.length <= 1) return;
  
  const groupIndex = bbiGroups.findIndex(group => group.id === groupId);
  if (groupIndex === -1) return;
  
  // Remove from chart first
  if (groupIndex === 0) {
    // For first group, remove from current edit pane
    if ($chart && $ctx.editPaneId) {
      try {
        $chart.removeIndicator({ paneId: $ctx.editPaneId, name: 'BBI' });
      } catch (error) {
        console.log('Error removing BBI indicator:', error);
      }
    }
  } else {
    // For additional groups, find and remove
    const saveKey = `pane_BBI_${groupIndex + 1}_BBI`;
    const savedData = $save.saveInds[saveKey];
    
    if (savedData && savedData.pane_id && $chart) {
      try {
        $chart.removeIndicator({ paneId: savedData.pane_id, name: 'BBI' });
      } catch (error) {
        console.log('Error removing BBI indicator:', error);
      }
    }
  }
  
  // Remove from array
  bbiGroups = bbiGroups.filter(group => group.id !== groupId);
}
```

### Step 6: Apply/Confirm Function

Changes apply করার main function:

```typescript
function handleBbiConfirm() {
  if (!isBbi) return;
  
  // Get existing indicators
  const existingBbiKeys = Object.keys($save.saveInds).filter(key => 
    $save.saveInds[key].name === 'BBI'
  ).sort((a, b) => {
    if (a === `${$ctx.editPaneId}_BBI`) return -1;
    if (b === `${$ctx.editPaneId}_BBI`) return 1;
    return a.localeCompare(b);
  });
  
  // Remove excess indicators if needed
  const currentGroupCount = bbiGroups.length;
  if (existingBbiKeys.length > currentGroupCount) {
    for (let i = currentGroupCount; i < existingBbiKeys.length; i++) {
      const key = existingBbiKeys[i];
      const savedData = $save.saveInds[key];
      if (savedData && savedData.pane_id) {
        try {
          $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'BBI' });
        } catch (error) {
          console.log('Error removing excess indicator:', error);
        }
      }
    }
  }
  
  // Apply each group
  bbiGroups.forEach((group, index) => {
    const calcParams = [group.period1, group.period2, group.period3, group.period4];
    const indicatorStyles = {
      lines: [{
        color: group.color,
        size: group.thickness,
        style: group.lineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
        smooth: false
      }]
    };

    if (index === 0) {
      // Update first indicator in current pane
      $chart?.overrideIndicator({
        name: 'BBI',
        calcParams: calcParams,
        styles: indicatorStyles,
        paneId: $ctx.editPaneId
      });
    } else {
      // Handle additional indicators
      const expectedSaveKey = `pane_BBI_${index + 1}_BBI`;
      const existingGroup = existingBbiKeys.find(key => key === expectedSaveKey);
      
      if (existingGroup) {
        // Update existing
        const existingData = $save.saveInds[existingGroup];
        if (existingData && existingData.pane_id) {
          $chart?.overrideIndicator({
            name: 'BBI',
            calcParams: calcParams,
            styles: indicatorStyles,
            paneId: existingData.pane_id
          });
        }
      } else {
        // Create new
        const newPaneId = `pane_BBI_${index + 1}`;
        $chart?.createIndicator({
          name: 'BBI',
          calcParams: calcParams,
          styles: indicatorStyles
        }, true, { id: newPaneId });
      }
    }
  });

  // Save configuration
  save.update(s => {
    // Clear existing data
    Object.keys(s.saveInds).forEach(key => {
      if (s.saveInds[key].name === 'BBI') {
        delete s.saveInds[key];
      }
    });
    
    // Save each group
    bbiGroups.forEach((group, index) => {
      const saveKey = index === 0 ? `${$ctx.editPaneId}_BBI` : `pane_BBI_${index + 1}_BBI`;
      const paneId = index === 0 ? $ctx.editPaneId : `pane_BBI_${index + 1}`;
      
      s.saveInds[saveKey] = {
        name: 'BBI',
        bbiGroup: group,
        pane_id: paneId,
        groupIndex: index,
        bbiGroups: index === 0 ? [...bbiGroups] : undefined,
        params: [group.period1, group.period2, group.period3, group.period4]
      };
    });
    
    return s;
  });
  
  // Clear edit state
  ctx.update(c => {
    c.editIndName = '';
    c.editPaneId = '';
    c.modalIndCfg = false;
    return c;
  });
  
  show = false;
}
```

### Step 7: Color Palette Handler

Color selection এর জন্য handler:

```typescript
function showBbiColorPaletteHandler(index: number) {
  return (event: MouseEvent) => {
    bbiColorPaletteIndex = index;
    bbiColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showBbiColorPalette = true;
  };
}
```

### Step 8: UI Template

Svelte template section:

```svelte
{:else if isBbi}
  <!-- BBI Groups UI -->
  <div class="space-y-2 mt-3">
    {#each bbiGroups as group, groupIndex}
      <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <span class="text-xs sm:text-sm font-medium text-base-content/80">BBI {groupIndex + 1}</span>
          {#if bbiGroups.length > 1}
            <button 
              class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
              onclick={() => removeBbiGroup(group.id)}
              title="Remove BBI"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
        
        <!-- Parameters -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-base-content/60">P1</label>
            <input 
              type="number" 
              class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
              bind:value={group.period1} 
              min="1"
            />
          </div>
          <!-- Repeat for other periods -->
        </div>
        
        <!-- Style Controls -->
        <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
          <div class="flex items-center gap-2">
            <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
            <button 
              class="btn btn-sm btn-outline"
              onclick={showBbiColorPaletteHandler(groupIndex)}
            >
              <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.color}"></div>
            </button>
          </div>
          <!-- Add thickness and line style controls -->
        </div>
      </div>
    {/each}
    
    <!-- Add More Button -->
    <div class="flex justify-center mt-3">
      <button 
        class="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1" 
        onclick={addBbiGroup}
        title="Add More BBI"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="text-xs sm:text-sm">Add BBI</span>
      </button>
    </div>
  </div>
{/if}
```

### Step 9: Color Palette Component

Color palette component add করুন:

```svelte
<!-- Color Palette for BBI -->
<ColorPalette
  bind:show={showBbiColorPalette}
  selectedColor={bbiGroups[bbiColorPaletteIndex]?.color || '#2563eb'}
  position={bbiColorPalettePosition}
  oncolorchange={(e) => {
    if (bbiGroups.length > bbiColorPaletteIndex) {
      bbiGroups[bbiColorPaletteIndex].color = e.detail.color;
    }
  }}
/>
```

### Step 10: Reactive Statement

Edit mode এর জন্য reactive statement:

```typescript
// Initialize groups when edit mode changes
const showEdit = derived(ctx, ($ctx) => $ctx.modalIndCfg)
showEdit.subscribe(() => {
  if (!$ctx.editIndName) return;
  
  if (isBbi) {
    initializeBbiGroups();
    return;
  }
  
  // Add other indicator initializations here
});
```

## 🔄 Common Patterns

### Save Key Pattern
```typescript
// First indicator: `${editPaneId}_INDICATOR_NAME`
// Additional indicators: `pane_INDICATOR_NAME_${index + 1}_INDICATOR_NAME`

const saveKey = index === 0 ? 
  `${$ctx.editPaneId}_BBI` : 
  `pane_BBI_${index + 1}_BBI`;
```

### Pane ID Pattern
```typescript
// First indicator: uses editPaneId
// Additional indicators: `pane_INDICATOR_NAME_${index + 1}`

const paneId = index === 0 ? 
  $ctx.editPaneId : 
  `pane_BBI_${index + 1}`;
```

## 🐛 Common Issues & Solutions

### Issue 1: Duplicate Indicators
**Problem:** নতুন indicator তৈরি হয় existing update করার পরিবর্তে
**Solution:** `overrideIndicator` ব্যবহার করুন `createIndicator` এর পরিবর্তে

### Issue 2: Data Not Loading
**Problem:** Edit করার সময় existing data load হয় না
**Solution:** Initialization function এ সব save keys check করুন

### Issue 3: Incorrect Save Keys
**Problem:** Wrong save key pattern ব্যবহার করা
**Solution:** Consistent key pattern follow করুন

## 📝 Checklist for New Indicator

- [ ] Variables declared
- [ ] Interface defined
- [ ] Initialization function created
- [ ] Add/Remove functions implemented
- [ ] Apply/Confirm function created
- [ ] Color palette handler added
- [ ] UI template created
- [ ] Color palette component added
- [ ] Reactive statement added
- [ ] Save key pattern followed
- [ ] Testing completed

## 🎯 Best Practices

1. **Consistent Naming:** সব function এবং variable এ consistent naming pattern ব্যবহার করুন
2. **Error Handling:** Try-catch block ব্যবহার করুন chart operations এর জন্য
3. **Logging:** Console.log ব্যবহার করুন debugging এর জন্য
4. **Type Safety:** TypeScript interfaces ব্যবহার করুন
5. **State Management:** Proper state management follow করুন

## 🔗 Related Files

- `modalIndCfg.svelte` - Main configuration modal
- `modalIndSearch.svelte` - Indicator search modal
- `chart.ts` - Chart context
- `ColorPalette.svelte` - Color picker component

---

এই গাইড follow করে যেকোনো indicator সহজে implement করা যাবে। BBI pattern অনুসরণ করলে consistent এবং bug-free implementation পাওয়া যাবে।