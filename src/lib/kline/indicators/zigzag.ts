import type { IndicatorTemplate, KLineData } from 'klinecharts';
import * as kc from 'klinecharts';

/**
 * ZigZag Indicator
 * Filters out minor price movements and highlights significant trend reversals
 * Connects significant highs and lows with straight lines
 * 
 * Parameters:
 * - Deviation (%): Minimum price change to form a new zigzag line (default: 5%)
 * - Depth: Minimum number of bars between zigzag pivots (default: 5)
 */
export const zigzag: IndicatorTemplate = {
  name: 'ZIGZAG',
  shortName: 'ZIGZAG',
  precision: 2,
  calcParams: [5, 5], // [deviation percentage, depth]
  shouldOhlc: true, // Overlay on main price chart
  shouldFormatBigNumber: false,
  visible: true,
  zLevel: 1,
  extendData: undefined,
  figures: [],
  styles: {
    lines: [
      {
        color: '#2962FF', // Blue color for zigzag line
        size: 2,
        style: kc.LineType.Solid,
        smooth: false,
        dashedValue: [2, 2]
      }
    ],
    circles: [
      {
        upColor: '#26A69A', // Green for lows
        downColor: '#EF5350', // Red for highs
        noChangeColor: '#888888'
      }
    ]
  },
  calc: (dataList: KLineData[], indicator) => {
    const deviation = ((indicator.calcParams[0] as number) || 5) / 100; // Convert percentage to decimal
    const depth = (indicator.calcParams[1] as number) || 5;
    
    const result: Array<{ zigzag?: number; isHigh?: boolean; isLow?: boolean }> = [];
    
    if (dataList.length < depth * 2) {
      return dataList.map(() => ({}));
    }

    // Find initial pivot point
    let lastPivotIndex = 0;
    let lastPivotPrice = dataList[0].high;
    let lastPivotType: 'high' | 'low' = 'high';
    let isSearchingHigh = false;

    // Initialize result array
    for (let i = 0; i < dataList.length; i++) {
      result.push({});
    }

    // Set the first pivot
    result[0] = { zigzag: dataList[0].close };

    // Find the first significant move
    for (let i = depth; i < dataList.length; i++) {
      const currentHigh = dataList[i].high;
      const currentLow = dataList[i].low;
      
      const highChange = Math.abs(currentHigh - lastPivotPrice) / lastPivotPrice;
      const lowChange = Math.abs(currentLow - lastPivotPrice) / lastPivotPrice;

      if (highChange >= deviation) {
        lastPivotIndex = i;
        lastPivotPrice = currentHigh;
        lastPivotType = 'high';
        isSearchingHigh = false;
        result[i] = { zigzag: currentHigh, isHigh: true };
        break;
      } else if (lowChange >= deviation) {
        lastPivotIndex = i;
        lastPivotPrice = currentLow;
        lastPivotType = 'low';
        isSearchingHigh = true;
        result[i] = { zigzag: currentLow, isLow: true };
        break;
      }
    }

    // Continue finding zigzag pivots
    for (let i = lastPivotIndex + depth; i < dataList.length; i++) {
      const currentHigh = dataList[i].high;
      const currentLow = dataList[i].low;

      if (isSearchingHigh) {
        // Looking for the next high
        const change = (currentHigh - lastPivotPrice) / lastPivotPrice;
        
        if (change >= deviation) {
          // Found a new high pivot
          lastPivotIndex = i;
          lastPivotPrice = currentHigh;
          lastPivotType = 'high';
          isSearchingHigh = false;
          result[i] = { zigzag: currentHigh, isHigh: true };
        } else if (lastPivotType === 'low' && currentLow < lastPivotPrice) {
          // Update the low if we find a lower low
          result[lastPivotIndex] = {};
          lastPivotIndex = i;
          lastPivotPrice = currentLow;
          result[i] = { zigzag: currentLow, isLow: true };
        }
      } else {
        // Looking for the next low
        const change = (lastPivotPrice - currentLow) / lastPivotPrice;
        
        if (change >= deviation) {
          // Found a new low pivot
          lastPivotIndex = i;
          lastPivotPrice = currentLow;
          lastPivotType = 'low';
          isSearchingHigh = true;
          result[i] = { zigzag: currentLow, isLow: true };
        } else if (lastPivotType === 'high' && currentHigh > lastPivotPrice) {
          // Update the high if we find a higher high
          result[lastPivotIndex] = {};
          lastPivotIndex = i;
          lastPivotPrice = currentHigh;
          result[i] = { zigzag: currentHigh, isHigh: true };
        }
      }
    }

    return result;
  },

  // Custom draw function to render zigzag lines and pivot points
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    if (!indicator.result || indicator.result.length === 0) return false;

    const visibleRange = chart.getVisibleRange();
    const { from, to } = visibleRange;
    const result = indicator.result;

    ctx.save();

    // Get style configuration (support solid/dashed/dotted via dashedValue)
    const lineStyle = indicator.styles?.lines?.[0] || {
      color: '#2962FF',
      size: 2,
      style: kc.LineType.Solid,
      dashedValue: [2, 2]
    } as any;

    const circleStyle = indicator.styles?.circles?.[0] || {
      upColor: '#26A69A',
      downColor: '#EF5350'
    };

    // Find all pivot points in visible range (and one before for line continuity)
    const pivots: Array<{ index: number; price: number; isHigh: boolean; isLow: boolean }> = [];
    
    // Check one point before visible range for line continuity
    for (let i = Math.max(0, from - 50); i < Math.min(to + 1, result.length); i++) {
      const zigzagData = result[i] as any;
      if (zigzagData && typeof zigzagData.zigzag === 'number') {
        pivots.push({
          index: i,
          price: zigzagData.zigzag,
          isHigh: zigzagData.isHigh || false,
          isLow: zigzagData.isLow || false
        });
      }
    }

    // Draw lines between consecutive pivots
    ctx.strokeStyle = (lineStyle.color as string) || '#2962FF';
    ctx.lineWidth = (lineStyle.size as number) || 2;
    // Apply dashed pattern if requested
    if (lineStyle.style === kc.LineType.Dashed) {
      const dv = Array.isArray(lineStyle.dashedValue) ? lineStyle.dashedValue as number[] : [4, 4];
      ctx.setLineDash(dv);
    } else {
      ctx.setLineDash([]);
    }

    for (let i = 0; i < pivots.length - 1; i++) {
      const pivot1 = pivots[i];
      const pivot2 = pivots[i + 1];

      const x1 = xAxis.convertToPixel(pivot1.index);
      const y1 = yAxis.convertToPixel(pivot1.price);
      const x2 = xAxis.convertToPixel(pivot2.index);
      const y2 = yAxis.convertToPixel(pivot2.price);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw pivot points as circles
    pivots.forEach(pivot => {
      if (pivot.index < from || pivot.index >= to) return;

      const x = xAxis.convertToPixel(pivot.index);
      const y = yAxis.convertToPixel(pivot.price);

      // Check if the point is within the visible area
      if (x >= bounding.left && x <= bounding.left + bounding.width &&
          y >= bounding.top && y <= bounding.top + bounding.height) {
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        
        // Color based on whether it's a high or low
        if (pivot.isHigh) {
          ctx.fillStyle = circleStyle.downColor as string; // Red for highs
        } else if (pivot.isLow) {
          ctx.fillStyle = circleStyle.upColor as string; // Green for lows
        } else {
          ctx.fillStyle = lineStyle.color as string;
        }
        
        ctx.fill();
        
        // Add white border for better visibility
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    ctx.restore();
    
    // Return true to prevent default drawing
    return true;
  }
};

export default zigzag;

