# Chart Rendering Core

This directory contains the flicker-free rendering system for chart operations.

## Modules

- **RenderScheduler.ts** - RAF-batched rendering
- **RenderTransaction.ts** - Atomic render transactions
- **LayoutTransitionManager.ts** - First-frame transition gating
- **ActionCoalescer.ts** - Input coalescing and throttling
- **ChartRenderIntegration.ts** - High-level chart operation helpers
- **index.ts** - Public API exports

## Quick Start

```typescript
import { 
  getChartRenderIntegration,
  getRenderScheduler,
  getLayoutTransitionManager
} from './core';

const integration = getChartRenderIntegration();

// Flicker-free indicator addition
await integration.addIndicator({
  chart: chartInstance,
  name: 'RSI',
  params: [14]
});

// Smooth timeframe change
await integration.changeTimeframe({
  chart: chartInstance,
  period: newPeriod,
  loadDataFn: async () => await loadData()
});
```

## Documentation

See `FLICKER_FREE_RENDERING.md` in the project root for comprehensive documentation.

## Architecture Goals

1. **No Visual Flicker**: All operations complete atomically in a single frame
2. **No First-Paint Transitions**: Transitions disabled on initial render
3. **Single-Pass Resize**: Layout calculations happen once per operation
4. **No Teardown**: Reuse renderers, preserve state between updates
5. **Input Coalescing**: Batch rapid user actions efficiently
