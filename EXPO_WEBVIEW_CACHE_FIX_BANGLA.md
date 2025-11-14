# Expo WebView Cache Fix - বাংলা গাইড

## সমস্যা কী ছিল?

আপনি যখন TradingView Chart টি Expo WebView তে ওপেন করতেন এবং indicators/layout মুছে দিয়ে chart close করে আবার open করতেন, তখন WebView cache এর কারণে পুরনো state দেখাত। এর ফলে:
- Saved chart থেকে load হতো না
- WebView এর cached data দেখাত
- প্রতিবার manually reload করতে হতো

## সমাধান কী করা হয়েছে?

### ১. Cache Control Meta Tags যোগ করা হয়েছে

`src/app.html` ফাইলে নতুন meta tags যোগ করা হয়েছে যা WebView কে cache করতে বাধা দেবে:

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

### ২. Auto-Restore Logic উন্নত করা হয়েছে

`SaveSystemIntegration.svelte` তে auto-restore logic উন্নত করা হয়েছে:

**পরিবর্তন:**
- Delay 500ms থেকে 100ms করা হয়েছে (দ্রুত restore)
- Priority-based restore system যোগ করা হয়েছে:
  1. প্রথমে server থেকে saved layouts refresh করে
  2. Active saved layout load করে
  3. না থাকলে প্রথম saved layout load করে
  4. কিছু না থাকলে default chart দেখায়

### ৩. WebView Integration Functions যোগ করা হয়েছে

দুইটি global function expose করা হয়েছে যা আপনি Expo থেকে call করতে পারবেন:

#### `window.forceRefreshChart()`
Chart কে force করে saved layout থেকে reload করে।

#### `window.clearChartCache()`
LocalStorage থেকে সব cached chart data মুছে দেয়।

## আপনার Expo App এ কিভাবে ব্যবহার করবেন

### Option 1: WebView এ incognito/cache disabled mode ব্যবহার করুন

```jsx
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: 'https://your-chart-url.com' }}
  incognito={true} // এটা cache disable করবে
  cacheEnabled={false} // এটাও cache disable করবে
  cacheMode="LOAD_NO_CACHE" // Android এর জন্য
/>
```

### Option 2: WebView mount হলে force refresh করুন

```jsx
import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';

export default function ChartScreen() {
  const webViewRef = useRef(null);

  const handleWebViewLoad = () => {
    // WebView load হলে force refresh trigger করুন
    webViewRef.current?.injectJavaScript(`
      if (window.forceRefreshChart) {
        window.forceRefreshChart();
      }
      true; // Required for iOS
    `);
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: 'https://your-chart-url.com' }}
      onLoadEnd={handleWebViewLoad}
      incognito={true}
      cacheEnabled={false}
    />
  );
}
```

### Option 3: Screen reopen হলে cache clear করুন

```jsx
import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';

export default function ChartScreen() {
  const webViewRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      // Screen focus পেলে cache clear করে refresh করুন
      webViewRef.current?.injectJavaScript(`
        if (window.clearChartCache) {
          window.clearChartCache();
        }
        if (window.forceRefreshChart) {
          window.forceRefreshChart();
        }
        true;
      `);
    }, [])
  );

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: 'https://your-chart-url.com' }}
      incognito={true}
      cacheEnabled={false}
    />
  );
}
```

### Option 4: Pull to Refresh যোগ করুন

```jsx
import React, { useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { RefreshControl, ScrollView } from 'react-native';

export default function ChartScreen() {
  const webViewRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Cache clear করুন
    webViewRef.current?.injectJavaScript(`
      if (window.clearChartCache) {
        window.clearChartCache();
      }
      true;
    `);
    
    // WebView reload করুন
    webViewRef.current?.reload();
    
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://your-chart-url.com' }}
        incognito={true}
        cacheEnabled={false}
        style={{ height: 800 }}
      />
    </ScrollView>
  );
}
```

## সম্পূর্ণ উদাহরণ (Best Practice)

```jsx
import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';

export default function TradingChartScreen() {
  const webViewRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Screen focus পেলে refresh করুন
  useFocusEffect(
    React.useCallback(() => {
      if (isLoaded) {
        webViewRef.current?.injectJavaScript(`
          console.log('🔄 Expo: Screen focused, refreshing chart...');
          if (window.forceRefreshChart) {
            window.forceRefreshChart();
          }
          true;
        `);
      }
    }, [isLoaded])
  );

  const handleWebViewLoad = () => {
    console.log('✅ WebView loaded');
    setIsLoaded(true);
    
    // Initial load এ force refresh করুন
    webViewRef.current?.injectJavaScript(`
      console.log('🚀 Expo: Initial load, forcing chart refresh...');
      setTimeout(() => {
        if (window.forceRefreshChart) {
          window.forceRefreshChart();
        }
      }, 500);
      true;
    `);
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📨 Message from WebView:', data);
      // Handle messages from chart if needed
    } catch (e) {
      console.log('Raw message:', event.nativeEvent.data);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://your-chart-url.com' }}
        onLoadEnd={handleWebViewLoad}
        onMessage={handleWebViewMessage}
        
        // Cache settings
        incognito={true}
        cacheEnabled={false}
        cacheMode="LOAD_NO_CACHE"
        
        // Performance settings
        javaScriptEnabled={true}
        domStorageEnabled={true}
        
        // Style
        style={styles.webView}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});
```

## Testing করুন

১. **Chart টি save করুন:**
   - Chart এ কিছু indicators যোগ করুন
   - "Save Chart" করুন একটা নাম দিয়ে

২. **Chart modify করুন:**
   - সব indicators মুছে দিন
   - Chart layout change করুন

৩. **App close করে আবার open করুন:**
   - Chart টি আপনার saved layout দিয়ে load হওয়া উচিত
   - Cached empty state দেখাবে না

## Debug Console Messages

Console এ এই messages দেখতে পাবেন:

```
🔍 Starting automatic restoration process (WebView-safe)...
🌐 User logged in, refreshing saved layouts from server...
✅ Saved layouts refreshed from server
🔍 Active save ID found: abc-123
🔄 Restoring active saved data: abc-123
✅ Active saved data restored successfully: abc-123
```

## সমস্যা থাকলে

যদি এখনও cache issue হয়:

১. **Expo app rebuild করুন:**
   ```bash
   expo start --clear
   ```

২. **WebView cache manually clear করুন:**
   ```jsx
   import { CookieManager } from '@react-native-cookies/cookies';
   
   // App start এ cache clear করুন
   CookieManager.clearAll().then(() => {
     console.log('Cookies cleared');
   });
   ```

৩. **Development mode এ test করুন:**
   - Development build use করুন production এর বদলে
   - Chrome DevTools দিয়ে debug করুন

## সারসংক্ষেপ

এখন আপনার chart:
✅ সবসময় saved layout থেকে load হবে  
✅ WebView cache ব্যবহার করবে না  
✅ প্রতিবার fresh data দেখাবে  
✅ Default chart দেখাবে যদি কোনো saved layout না থাকে  

আর কোনো সমস্যা হলে জানাবেন! 🚀

