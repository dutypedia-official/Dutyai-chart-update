# Custom Momentum Indicator Usage Guide

## Overview
The Custom Momentum Indicator is a TradingView-style momentum oscillator that replaces the AO (Awesome Oscillator) indicator. It provides extensive customization options for colors, thickness, and styles.

## Features
- **TradingView Style**: Uses the same color scheme and visual style as TradingView
- **Filled Histogram**: Solid filled bars instead of bordered bars for better visibility
- **Customizable Colors**: Set bullish, bearish, and neutral colors
- **Adjustable Thickness**: Control line and bar thickness
- **Style Options**: Choose between solid, dashed, or dotted lines
- **Dual Display**: Show as line, histogram, or both
- **Configurable Periods**: Adjust fast and slow moving average periods

## Basic Usage

### Default Configuration
```typescript
import { customMomentum } from './indicators/customMomentum';

// Use the default indicator
const indicator = customMomentum;
```

### Custom Configuration
```typescript
import { createCustomMomentum, defaultCustomMomentumConfig } from './indicators/customMomentum';

// Create a custom configuration
const customConfig = {
  ...defaultCustomMomentumConfig,
  fastPeriod: 9,
  slowPeriod: 21,
  bullishColor: '#00ff00', // Bright green
  bearishColor: '#ff0000', // Bright red
  lineThickness: 3,
  barThickness: 2,
  lineStyle: 'dashed' as const
};

const customIndicator = createCustomMomentum(customConfig);
```

## Configuration Options

### CustomIndicatorConfig Interface
```typescript
interface CustomIndicatorConfig {
  // Period settings
  fastPeriod: number;        // Fast EMA period (default: 12)
  slowPeriod: number;        // Slow EMA period (default: 26)
  
  // Color settings
  bullishColor: string;      // Color for bullish momentum (default: '#26a69a')
  bearishColor: string;      // Color for bearish momentum (default: '#ef5350')
  neutralColor: string;     // Color for neutral momentum (default: '#757575')
  
  // Style settings
  lineThickness: number;     // Line thickness (default: 2)
  barThickness: number;      // Bar thickness (default: 1)
  lineStyle: 'solid' | 'dashed' | 'dotted'; // Line style (default: 'solid')
  
  // Display settings
  showLine: boolean;         // Show momentum line (default: true)
  showHistogram: boolean;    // Show histogram bars (default: true)
  precision: number;         // Decimal precision (default: 5)
}
```

## Example Configurations

### TradingView Classic Style (Filled Bars)
```typescript
import { tradingViewFilledConfig, createCustomMomentum } from './indicators/customMomentum';

// Use the pre-configured TradingView style with filled bars
const tradingViewIndicator = createCustomMomentum(tradingViewFilledConfig);

// Or create custom TradingView style
const tradingViewStyle = {
  fastPeriod: 12,
  slowPeriod: 26,
  bullishColor: '#26a69a', // TradingView green - filled
  bearishColor: '#ef5350', // TradingView red - filled
  neutralColor: '#757575', // Gray - filled
  lineThickness: 2,
  barThickness: 4, // Thicker for better filled appearance
  lineStyle: 'solid' as const,
  showLine: true,
  showHistogram: true,
  precision: 5
};
```

### High Contrast Style
```typescript
const highContrastStyle = {
  fastPeriod: 9,
  slowPeriod: 21,
  bullishColor: '#00ff00', // Bright green
  bearishColor: '#ff0000', // Bright red
  neutralColor: '#ffff00', // Yellow
  lineThickness: 4,
  barThickness: 3,
  lineStyle: 'solid' as const,
  showLine: true,
  showHistogram: true,
  precision: 3
};
```

### Minimalist Style
```typescript
const minimalistStyle = {
  fastPeriod: 14,
  slowPeriod: 28,
  bullishColor: '#2e7d32', // Dark green
  bearishColor: '#c62828', // Dark red
  neutralColor: '#424242', // Dark gray
  lineThickness: 1,
  barThickness: 1,
  lineStyle: 'dotted' as const,
  showLine: true,
  showHistogram: false, // Only show line
  precision: 2
};
```

## Integration with Chart

The indicator is automatically available in the chart's indicator list as "Custom Momentum" with the short name "CM". Users can:

1. Add the indicator to their chart
2. Adjust the fast and slow periods in the indicator settings
3. The indicator will display both the momentum line and histogram by default
4. Colors will automatically change based on momentum direction

## Technical Details

- **Calculation**: Uses Exponential Moving Averages (EMA) instead of Simple Moving Averages
- **Momentum Formula**: Fast EMA - Slow EMA
- **Color Logic**: 
  - Green: Momentum is positive (bullish)
  - Red: Momentum is negative (bearish)
  - Gray: Momentum is zero (neutral)
- **Display**: Shows in a separate sub-pane below the main chart

## Migration from AO Indicator

The Custom Momentum Indicator provides similar functionality to the AO indicator but with enhanced customization:

- **Better Performance**: Uses EMA instead of SMA for smoother calculations
- **More Customizable**: Extensive color and style options
- **TradingView Compatible**: Matches TradingView's visual style
- **Flexible Display**: Choose between line, histogram, or both

## Troubleshooting

### Common Issues
1. **Indicator not showing**: Ensure the indicator is properly imported in index.ts
2. **Colors not changing**: Check that the color values are valid hex codes
3. **Performance issues**: Reduce the precision value for better performance
4. **Display issues**: Ensure both showLine and showHistogram are not false simultaneously

### Best Practices
- Use contrasting colors for better visibility
- Keep line thickness between 1-4 for optimal display
- Use solid lines for better performance
- Set appropriate precision based on your data scale
