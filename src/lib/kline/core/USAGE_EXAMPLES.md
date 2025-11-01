# Flicker-Free Rendering - Usage Examples

## Example 1: Adding an Indicator

```typescript
import { getChartRenderIntegration } from './core';

async function addRSIIndicator(chart: Chart) {
  const integration = getChartRenderIntegration();
  
  const indicatorId = await integration.addIndicator({
    chart: chart,
    name: 'RSI',
    params: [14],
    isMain: false,
    paneId: 'pane_rsi'
  });
  
  console.log('Indicator added:', indicatorId);
}
```

## Example 2: Batch Adding Multiple Indicators

```typescript
import { getChartRenderIntegration } from './core';

async function addMultipleIndicators(chart: Chart) {
  const integration = getChartRenderIntegration();
  
  await integration.batchIndicatorOperations([
    {
      type: 'add',
      operation: {
        chart: chart,
        name: 'RSI',
        params: [14],
        isMain: false
      }
    },
    {
      type: 'add',
      operation: {
        chart: chart,
        name: 'MACD',
        params: [12, 26, 9],
        isMain: false
      }
    },
    {
      type: 'add',
      operation: {
        chart: chart,
        name: 'VOL',
        params: [],
        isMain: false
      }
    }
  ]);
  
  console.log('All indicators added in single transaction');
}
```

## Example 3: Changing Timeframe

```typescript
import { getChartRenderIntegration } from './core';

async function changeTimeframe(chart: Chart, newPeriod: Period) {
  const integration = getChartRenderIntegration();
  
  await integration.changeTimeframe({
    chart: chart,
    period: newPeriod,
    loadDataFn: async () => {
      // Your data loading logic
      const data = await fetchKlineData(newPeriod);
      chart.applyNewData(data);
    }
  });
  
  console.log('Timeframe changed smoothly');
}
```

## Example 4: Switching Chart Type

```typescript
import { getChartRenderIntegration } from './core';

async function switchToHeikinAshi(chart: Chart) {
  const integration = getChartRenderIntegration();
  
  await integration.switchChartType({
    chart: chart,
    newType: 'heikin_ashi',
    reloadDataFn: async () => {
      // Transform data to Heikin Ashi
      const rawData = chart.getDataList();
      const transformedData = convertToHeikinAshi(rawData);
      chart.applyNewData(transformedData);
    }
  });
  
  console.log('Chart type switched to Heikin Ashi');
}
```

## Example 5: Sidebar Toggle

```typescript
import { getChartRenderIntegration } from './core';

async function toggleSidebar(chart: Chart, visible: boolean, width: number) {
  const integration = getChartRenderIntegration();
  
  await integration.sidebarOperation({
    chart: chart,
    visible: visible,
    widthPx: visible ? width : 0
  });
  
  console.log('Sidebar toggled:', visible ? 'open' : 'closed');
}
```

## Example 6: Custom Transaction

```typescript
import { getRenderTransaction, type RenderTransactionConfig } from './core';

async function customChartOperation(chart: Chart) {
  const transaction = getRenderTransaction();
  
  const config: RenderTransactionConfig = {
    reason: 'custom',
    chart: chart,
    
    mutateState: () => {
      // Update chart state
      console.log('State mutated');
    },
    
    measure: () => {
      // Measure layout
      const container = chart.getContainer();
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      console.log('Measured:', width, height);
    },
    
    compute: async () => {
      // Perform calculations
      await heavyCalculation();
    },
    
    draw: (chart) => {
      // Custom drawing logic
      console.log('Custom drawing');
    },
    
    commit: () => {
      // Finalize
      chart.resize();
      console.log('Transaction committed');
    }
  };
  
  await transaction.run(config);
}
```

## Example 7: Using RenderScheduler Directly

```typescript
import { getRenderScheduler } from './core';

function scheduleMultipleUpdates(chart: Chart) {
  const scheduler = getRenderScheduler();
  
  // All these will execute in a single RAF
  scheduler.request(() => {
    chart.updateData(newData1);
  });
  
  scheduler.request(() => {
    chart.updateStyles(newStyles);
  });
  
  scheduler.request(() => {
    chart.resize();
  });
  
  console.log('All updates scheduled for next frame');
}
```

## Example 8: Coalescing Rapid User Input

```typescript
import { ActionCoalescer } from './core';

const indicatorCoalescer = new ActionCoalescer(100, async (actions) => {
  console.log(`Processing ${actions.length} indicator operations`);
  
  for (const action of actions) {
    await addIndicator(action.data.name, action.data.params);
  }
});

// User rapidly clicks to add multiple indicators
function onIndicatorButtonClick(name: string, params: any[]) {
  indicatorCoalescer.add(name, { name, params });
  // All clicks within 100ms will be batched
}
```

## Example 9: Layout Transition Control

```typescript
import { getLayoutTransitionManager } from './core';

function toggleElementWithoutFlash(element: HTMLElement) {
  const layoutManager = getLayoutTransitionManager();
  
  layoutManager.register('myElement', element);
  
  // Disable transitions
  layoutManager.disable('myElement');
  
  // Apply layout change
  element.style.width = '300px';
  element.style.opacity = '1';
  
  // Re-enable transitions after next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      layoutManager.enable('myElement');
    });
  });
}
```

## Example 10: Throttled Resize Handler

```typescript
import { Throttler } from './core';

const resizeThrottler = new Throttler();

window.addEventListener('resize', () => {
  resizeThrottler.throttle(() => {
    chart.resize();
    updateLayout();
  });
});

// Cleanup
window.addEventListener('beforeunload', () => {
  resizeThrottler.cancel();
});
```

## Example 11: Theme Change

```typescript
import { getChartRenderIntegration } from './core';

async function changeTheme(chart: Chart, newTheme: string) {
  const integration = getChartRenderIntegration();
  
  await integration.changeTheme(chart, () => {
    const themeStyles = getThemeStyles(newTheme);
    chart.setStyles(themeStyles);
  });
  
  console.log('Theme changed to:', newTheme);
}
```

## Example 12: Debounced Search

```typescript
import { Debouncer } from './core';

const searchDebouncer = new Debouncer(300);

function onSearchInput(query: string) {
  searchDebouncer.debounce(async () => {
    const results = await searchIndicators(query);
    displayResults(results);
  });
}
```

## Integration in Svelte Components

### In a Svelte Component

```svelte
<script lang="ts">
  import { getChartRenderIntegration, Throttler } from '$lib/kline/core';
  import { onMount } from 'svelte';
  
  let chart: Chart;
  const integration = getChartRenderIntegration();
  const resizeThrottler = new Throttler();
  
  async function handleIndicatorAdd(name: string) {
    await integration.addIndicator({
      chart: chart,
      name: name,
      params: getDefaultParams(name),
      isMain: false
    });
  }
  
  function handleResize() {
    resizeThrottler.throttle(() => {
      chart?.resize();
    });
  }
  
  onMount(() => {
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeThrottler.cancel();
    };
  });
</script>

<button onclick={() => handleIndicatorAdd('RSI')}>Add RSI</button>
```

## Best Practices Summary

1. **Always use integration helpers** for common operations
2. **Batch related operations** when possible
3. **Use throttling** for high-frequency events (resize, scroll)
4. **Use debouncing** for user input (search, text entry)
5. **Disable transitions** on initial render
6. **Clean up** schedulers/throttlers on unmount
7. **Await transactions** to ensure completion
8. **Handle errors** in async operations

## Performance Tips

- Use `immediate()` only for critical updates
- Keep coalescing windows between 50-100ms
- Avoid blocking operations in transaction phases
- Use `batch()` for multiple related operations
- Monitor RAF queue with debug logging
