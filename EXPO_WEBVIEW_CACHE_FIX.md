# Expo WebView Cache Fix - Technical Summary

## Problem Statement

When using the TradingView chart in an Expo/React Native WebView:
- Chart state was being cached in the WebView's localStorage
- When closing and reopening the WebView, cached state was displayed
- Saved chart layouts were not being loaded automatically
- Users had to manually refresh to see saved layouts

## Solution Implementation

### 1. Cache Control Headers (`src/app.html`)

Added HTTP cache control meta tags to prevent WebView caching:

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

**Impact:** Prevents browser/WebView from caching HTML and resources

### 2. Enhanced Auto-Restore Logic (`src/lib/kline/saveSystem/SaveSystemIntegration.svelte`)

#### Changes Made:

**A. Reduced Restore Delay**
- Changed from 500ms to 100ms
- Ensures saved layouts load before user sees cached data

**B. Priority-Based Restore System**
Implemented a 4-tier priority system:

```typescript
Priority 1: Refresh from server (if logged in)
  ↓
Priority 2: Load active saved layout ID
  ↓
Priority 3: Load first available saved layout
  ↓
Priority 4: Use default chart configuration
```

**C. Server Sync First**
- Always attempts to refresh saved layouts from server first
- Ensures cross-device consistency
- Handles offline scenarios gracefully

#### Code Flow:

```typescript
async function restoreActiveSavedData() {
  // 1. Check if user is logged in
  const userId = localStorage.getItem('userId');
  
  if (userId) {
    // 2. Refresh layouts from server
    await saveManager.refresh();
  }
  
  // 3. Try to load active layout
  const activeSaveId = saveManager.getActiveSaveId();
  if (activeSaveId) {
    const result = await saveManager.load(activeSaveId);
    if (result.success) return; // Success, exit
  }
  
  // 4. Try to load first available layout
  const savedLayouts = saveManager.state.savedLayouts;
  if (savedLayouts.length > 0) {
    const result = await saveManager.load(savedLayouts[0].id);
    if (result.success) return; // Success, exit
  }
  
  // 5. Fall back to default chart
  console.log('Using default chart configuration');
}
```

### 3. WebView Integration Functions

Added two global functions that can be called from React Native:

#### `window.forceRefreshChart()`
Forces chart to reload from saved layouts immediately.

```javascript
// Usage from Expo/React Native
webViewRef.current?.injectJavaScript(`
  window.forceRefreshChart();
  true; // Required for iOS
`);
```

#### `window.clearChartCache()`
Clears all cached chart data from localStorage.

```javascript
// Usage from Expo/React Native
webViewRef.current?.injectJavaScript(`
  window.clearChartCache();
  true; // Required for iOS
`);
```

## Integration with Expo/React Native

### Recommended WebView Configuration

```jsx
<WebView
  source={{ uri: 'https://your-chart-url.com' }}
  
  // Disable caching
  incognito={true}
  cacheEnabled={false}
  cacheMode="LOAD_NO_CACHE"
  
  // Enable required features
  javaScriptEnabled={true}
  domStorageEnabled={true}
  
  // Event handlers
  onLoadEnd={handleWebViewLoad}
  onMessage={handleWebViewMessage}
/>
```

### Implementation Patterns

#### Pattern 1: Auto-refresh on Screen Focus

```jsx
import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  React.useCallback(() => {
    webViewRef.current?.injectJavaScript(`
      if (window.forceRefreshChart) {
        window.forceRefreshChart();
      }
      true;
    `);
  }, [])
);
```

#### Pattern 2: Initial Load Refresh

```jsx
const handleWebViewLoad = () => {
  webViewRef.current?.injectJavaScript(`
    setTimeout(() => {
      if (window.forceRefreshChart) {
        window.forceRefreshChart();
      }
    }, 500);
    true;
  `);
};
```

#### Pattern 3: Pull-to-Refresh

```jsx
const onRefresh = async () => {
  webViewRef.current?.injectJavaScript(`
    if (window.clearChartCache) {
      window.clearChartCache();
    }
    true;
  `);
  webViewRef.current?.reload();
};
```

## Technical Details

### Data Flow

```
WebView Opens
    ↓
HTML Loaded (no cache due to meta tags)
    ↓
Chart Component Mounts
    ↓
SaveSystemIntegration Mounts
    ↓
Wait 100ms for DOM ready
    ↓
restoreActiveSavedData() called
    ↓
Priority 1: Refresh from server (if logged in)
    ↓
Priority 2: Try active saved layout
    ↓
Priority 3: Try first available layout
    ↓
Priority 4: Use default chart
    ↓
Chart rendered with correct state
```

### Cache Strategy

**Before Fix:**
```
localStorage (persisted) → Chart State → Display
                ↑
           (cached data)
```

**After Fix:**
```
Server/SavedLayouts → Chart State → Display
        ↑
   (fresh data)
   
localStorage only used as fallback
```

### Console Debug Messages

When chart loads, you'll see these console messages:

```
🔍 Starting automatic restoration process (WebView-safe)...
🌐 User logged in, refreshing saved layouts from server...
✅ Saved layouts refreshed from server
🔍 Active save ID found: abc-123
🔄 Restoring active saved data: abc-123
✅ Active saved data restored successfully: abc-123
```

## Testing Checklist

- [ ] Save a chart layout with indicators
- [ ] Delete all indicators from chart
- [ ] Close WebView/App completely
- [ ] Reopen WebView/App
- [ ] Verify saved layout is restored (not empty state)
- [ ] Test with no saved layouts (should show default)
- [ ] Test with multiple saved layouts (should load first/active)
- [ ] Test offline (should use cached saved layout IDs)

## Troubleshooting

### Issue: Chart still shows cached state

**Solution 1: Clear app cache**
```bash
# For Expo
expo start --clear

# For React Native
react-native start --reset-cache
```

**Solution 2: Add explicit cache clearing**
```jsx
import { CookieManager } from '@react-native-cookies/cookies';

// On app start
CookieManager.clearAll();
```

**Solution 3: Force reload on mount**
```jsx
useEffect(() => {
  webViewRef.current?.injectJavaScript(`
    window.clearChartCache();
    window.location.reload(true);
  `);
}, []);
```

### Issue: Saved layouts not loading

**Check:**
1. User is logged in (`localStorage.getItem('userId')`)
2. Saved layouts exist (check SaveManager state)
3. Server API is responding (check network tab)
4. Active save ID is valid (check localStorage `activeSaveId`)

### Issue: Chart loads twice (flicker)

**Solution:** Increase restore delay slightly
```typescript
setTimeout(async () => {
  await restoreActiveSavedData();
}, 200); // Increased from 100ms
```

## Performance Impact

- **Initial Load Time:** ~100ms faster (reduced delay)
- **Network Requests:** +1 request (server refresh) if logged in
- **Memory Usage:** Minimal increase (global functions)
- **Cache Storage:** Reduced (no persistent HTML cache)

## Browser Compatibility

✅ Chrome/Chromium WebView (Android)  
✅ WKWebView (iOS)  
✅ Safari  
✅ Chrome Desktop  
✅ Firefox  
✅ Edge  

## Security Considerations

- Meta tags prevent sensitive data caching
- localStorage still used for saved layout IDs (not sensitive)
- Server refresh ensures data freshness
- No credentials cached in WebView

## Future Enhancements

1. **Active Layout Tracking:** Server-side active layout flag
2. **Layout Versioning:** Track layout version changes
3. **Conflict Resolution:** Handle concurrent edits
4. **Offline Mode:** Better offline layout support
5. **Layout Sync:** Real-time sync across devices

## API Reference

### Global Functions

#### `window.forceRefreshChart()`
**Type:** `() => Promise<void>`  
**Description:** Forces chart to reload from saved layouts  
**Usage:** Call from React Native to trigger refresh  
**Returns:** Promise that resolves when refresh is complete

#### `window.clearChartCache()`
**Type:** `() => void`  
**Description:** Clears localStorage cache for chart data  
**Usage:** Call before reload to ensure fresh state  
**Side Effects:** Removes items: `chart`, `chart_drawings`, `chart_overlays`, `dataSpaceOverlays`

#### `window.saveManager`
**Type:** `SaveManager`  
**Description:** Global SaveManager instance  
**Methods:**
- `getActiveSaveId(): string | null`
- `load(layoutId: string): Promise<LoadResult>`
- `save(): Promise<SaveResult>`
- `refresh(): Promise<void>`

## Summary

### What Changed
✅ Cache control headers prevent WebView caching  
✅ Auto-restore loads saved layouts immediately  
✅ Priority system ensures correct data source  
✅ Global functions for React Native integration  
✅ Server-first approach for logged-in users  

### Expected Behavior
✅ Chart always loads from saved layouts (if available)  
✅ No cached empty state after reopening  
✅ Default chart shown only when no saved layouts exist  
✅ Seamless experience across app restarts  

### Integration Required
📱 Update WebView props in Expo/React Native  
📱 Add screen focus refresh logic  
📱 Optional: Add pull-to-refresh  
📱 Optional: Add explicit cache clearing  

---

For Bengali documentation, see: `EXPO_WEBVIEW_CACHE_FIX_BANGLA.md`

