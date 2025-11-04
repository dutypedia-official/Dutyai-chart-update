# KDJ Indicator Pane ID Fix

## সমস্যা (Problem)

KDJ indicator এ একটি pane ID tracking সমস্যা ছিল:

1. একটি KDJ indicator add করুন
2. Edit এ গিয়ে আরও 2টি KDJ add করুন (মোট 3টি)
3. প্রথম KDJ টি remove করুন
4. এবার "Add More KDJ" এ click করুন
5. নতুন KDJ টি chart এর sub pane এ create হচ্ছিল না

**মূল কারণ:** KDJ indicator নতুন pane তৈরি করার সময় শুধুমাত্র array index (`kdjGroups.length - 1`) ব্যবহার করছিল। কোনো KDJ remove করার পর, array length কমে যেত কিন্তু আগে তৈরি হওয়া pane ID গুলো still exist করছিল। এর ফলে pane ID conflict হচ্ছিল।

## সমাধান (Solution)

### 1. **Proper Next Index Tracking in `addKdjGroup()`**

```javascript
// পুরানো কোড (Old Code):
const newPaneId = `pane_KDJ_${groupIndex + 1}`;

// নতুন কোড (New Code):
// Check all existing KDJ pane IDs to avoid conflicts
const existingPaneIds = Object.values($save.saveInds)
  .filter((ind: any) => ind.name === 'KDJ' && ind.pane_id)
  .map((ind: any) => ind.pane_id);

let nextIndex = 2;
while (existingPaneIds.includes(`pane_KDJ_${nextIndex}`)) {
  nextIndex++;
}

const newPaneId = `pane_KDJ_${nextIndex}`;
```

এখন নতুন KDJ add করার সময়:
- সব existing KDJ এর actual pane ID check করা হয়
- যে pane ID টি ব্যবহার হয়নি সেটি select করা হয়
- PSY indicator এর মতো same approach

### 2. **Special Handling for First Group Removal in `removeKdjGroup()`**

```javascript
// Special handling when removing the first group
if (groupIndex === 0 && kdjGroups.length > 1) {
  console.log('🔄 Special handling: First KDJ removed, promoting second KDJ to first position');
  
  // Remove the group from the array FIRST
  kdjGroups = kdjGroups.filter(group => group.id !== groupId);
  
  // The new first group (previously second) needs to be moved to edit pane
  const newFirstGroup = kdjGroups[0];
  
  // Remove the old second KDJ from its sub-pane first
  if (newFirstGroup.actualPaneId) {
    console.log('🗑️ Removing old second KDJ from sub-pane:', newFirstGroup.actualPaneId);
    $chart?.removeIndicator({ paneId: newFirstGroup.actualPaneId, name: 'KDJ' });
  }
  
  // Clear the actualPaneId since it's now going to edit pane
  newFirstGroup.actualPaneId = undefined;
  
  // Update the KDJ in edit pane with new first group's settings
  console.log('📊 Updating KDJ in edit pane with new first group settings');
  updateKdjIndicator(0);
}
```

প্রথম KDJ remove করার সময়:
1. পুরানো দ্বিতীয় KDJ টি তার sub-pane থেকে remove করা হয়
2. তার `actualPaneId` clear করা হয়
3. Edit pane এ নতুন settings এ update করা হয়
4. PSY indicator এর pattern follow করা হয়েছে

## টেস্ট করার ধাপ (Testing Steps)

1. একটি KDJ indicator add করুন
2. Edit এ গিয়ে "Add More KDJ" click করে আরও 2টি KDJ add করুন (মোট 3টি KDJ)
3. প্রথম KDJ টি remove করুন (🗑️ button দিয়ে)
4. এবার আবার "Add More KDJ" এ click করুন
5. নতুন KDJ টি properly একটি নতুন sub pane এ create হবে ✅

## পরিবর্তিত ফাইল (Modified Files)

- `src/lib/kline/modalIndCfg.svelte`
  - `addKdjGroup()` function - Line ~5506-5592
  - `removeKdjGroup()` function - Line ~5733-5817

## মূল উন্নতি (Key Improvements)

1. ✅ **Conflict-free Pane IDs:** নতুন KDJ add করার সময় actual pane IDs check করা হয়
2. ✅ **Proper First Group Removal:** প্রথম KDJ remove করার সময় দ্বিতীয় KDJ properly edit pane এ move হয়
3. ✅ **Consistent with PSY Pattern:** PSY indicator এর মতো same approach ব্যবহার করা হয়েছে
4. ✅ **Better Console Logging:** Debug করার জন্য detailed console logs যোগ করা হয়েছে

## Technical Details

### Pane ID Structure:
- First KDJ: Uses edit pane ID (`$ctx.editPaneId`)
- Additional KDJs: Use unique pane IDs like `pane_KDJ_2`, `pane_KDJ_3`, etc.

### Save Key Structure:
- First KDJ: `${editPaneId}_KDJ`
- Additional KDJs: `pane_KDJ_${nextIndex}_KDJ`

### actualPaneId Tracking:
- First KDJ: `actualPaneId = undefined` (uses edit pane)
- Additional KDJs: `actualPaneId = "pane_KDJ_N"` (stores actual pane ID)

এই fix এর পর KDJ indicator এর multiple instances properly manage হবে, removal এর পরেও নতুন KDJ add করা যাবে কোনো conflict ছাড়াই।

