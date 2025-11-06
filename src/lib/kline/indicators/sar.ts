import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * SAR (Parabolic Stop and Reverse) Indicator
 * A trend-following indicator that provides potential reversal points
 * 
 * Formula:
 * - Rising SAR: SAR(n) = SAR(n-1) + AF * (EP - SAR(n-1))
 * - Falling SAR: SAR(n) = SAR(n-1) - AF * (SAR(n-1) - EP)
 * 
 * Where:
 * - AF = Acceleration Factor (starts at 0.02, increases by 0.02 each time EP is updated, max 0.20)
 * - EP = Extreme Point (highest high in uptrend, lowest low in downtrend)
 */
export const sar: IndicatorTemplate = {
  name: 'SAR',
  shortName: 'SAR',
  precision: 4,
  calcParams: [0.02, 0.02, 0.20], // Initial AF, AF increment, Max AF
  shouldOhlc: true, // SAR is overlaid on the main price chart
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 0,
  extendData: undefined,
  figures: [
    // SAR dots
    {
      key: 'sar',
      title: 'SAR: ',
      type: 'line'
    }
  ],
  styles: {
    lines: [
      {
        color: '#2563eb', // Default blue color for SAR dots
        size: 1, // Default dot size 1px
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const initialAF = (indicator.calcParams[0] as number) || 0.02;
    const afIncrement = (indicator.calcParams[1] as number) || 0.02;
    const maxAF = (indicator.calcParams[2] as number) || 0.20;
    
    const result: Array<{ sar?: number }> = [];
    
    if (dataList.length < 2) {
      return dataList.map(() => ({}));
    }

    // Initialize variables
    let isUpTrend = true;
    let af = initialAF;
    let ep = dataList[0].high; // Extreme Point
    let sar = dataList[0].low; // Initial SAR
    
    // First data point
    result.push({ sar: sar });

    // Calculate SAR for each subsequent data point
    for (let i = 1; i < dataList.length; i++) {
      const current = dataList[i];
      const previous = dataList[i - 1];
      
      // Calculate new SAR
      if (isUpTrend) {
        sar = sar + af * (ep - sar);
        
        // SAR should not be above the low of current or previous period in uptrend
        sar = Math.min(sar, current.low, previous.low);
        
        // Check for trend reversal
        if (current.low <= sar) {
          // Trend reversal to downtrend
          isUpTrend = false;
          sar = ep; // SAR becomes the previous EP
          ep = current.low; // New EP is current low
          af = initialAF; // Reset AF
        } else {
          // Continue uptrend
          if (current.high > ep) {
            ep = current.high; // Update EP to new high
            af = Math.min(af + afIncrement, maxAF); // Increase AF
          }
        }
      } else {
        sar = sar - af * (sar - ep);
        
        // SAR should not be below the high of current or previous period in downtrend
        sar = Math.max(sar, current.high, previous.high);
        
        // Check for trend reversal
        if (current.high >= sar) {
          // Trend reversal to uptrend
          isUpTrend = true;
          sar = ep; // SAR becomes the previous EP
          ep = current.high; // New EP is current high
          af = initialAF; // Reset AF
        } else {
          // Continue downtrend
          if (current.low < ep) {
            ep = current.low; // Update EP to new low
            af = Math.min(af + afIncrement, maxAF); // Increase AF
          }
        }
      }
      
      result.push({ sar });
    }

    return result;
  },

  // Custom draw function to render SAR dots with proper styling
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    if (!indicator.result || indicator.result.length === 0) return false;

    const visibleRange = chart.getVisibleRange();
    const { from, to } = visibleRange;
    const result = indicator.result;

    ctx.save();

    // Get line style configuration
    const lineStyle = indicator.styles?.lines?.[0] || {
      color: '#2563eb',
      size: 1
    };

    // Use the size property as dot size (radius)
    const dotSize = lineStyle.size || 1;

    // Draw SAR dots
    for (let i = from; i < to; i++) {
      const sarData = result[i] as any;
      if (!sarData || typeof sarData.sar !== 'number') continue;

      const x = xAxis.convertToPixel(i);
      const y = yAxis.convertToPixel(sarData.sar);

      // Check if the point is within the visible area
      if (x >= bounding.left && x <= bounding.left + bounding.width &&
          y >= bounding.top && y <= bounding.top + bounding.height) {
        
        // Draw the SAR dot as a small circle with configurable size
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, 2 * Math.PI);
        
        // Fill the circle
        ctx.fillStyle = lineStyle.color as string;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = lineStyle.color as string;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
    
    // Return true to prevent default drawing
    return true;
  }
};

export default sar;