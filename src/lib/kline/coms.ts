import * as kc from 'klinecharts';
import type {NeighborData, Nullable, KLineData, CandleStyle} from 'klinecharts';
import type {BarArr, Period, Timespan, SymbolInfo} from "./types";
import {tf_to_secs, formatDate, dateTimeFormat} from "../dateutil";
import * as m from '$lib/paraglide/messages.js'
import { writable } from 'svelte/store';

// Global store for current symbol info
export const currentSymbol = writable<SymbolInfo | null>(null);
// Global store for current period info
export const currentPeriod = writable<Period | null>(null);


export const formatPrecision = kc.utils.formatPrecision
export const formatThousands = kc.utils.formatThousands
export const formatBigNumber = kc.utils.formatBigNumber
const TooltipFeaturePosition = kc.TooltipFeaturePosition

const _periods: Record<string, Period> = {}
// 有些周期需要对齐到指定的日期，下面应该按tfsecs从大到小排序
const tfsecs_origins = [
  {tfsecs: 604800, origin: 345600, date: '1970-01-05'},  // 周级别，从1970-01-05星期一开始
]


export function GetNumberDotOffset(value: number){
  value = Math.abs(value)
  if(value >= 1)return 0
  let count = 0;
  while (value < 1){
    value = value * 10;
    count += 1;
  }
  return count;
}

export function makePeriod(timeframe: string): Period {
  if (_periods[timeframe]) return _periods[timeframe]
  const sep_id = timeframe.length - 1
  const unit = timeframe.substring(sep_id);
  const num = timeframe.substring(0, sep_id);
  const num_val = parseInt(num);
  let timespan: Timespan = 'minute';
  if (unit == 'w') {
    timespan = 'week'
  } else if (unit == 'd') {
    timespan = 'day'
  } else if (unit == 'h') {
    timespan = 'hour'
  } else if (unit == 'm') {
    timespan = 'minute'
  } else if (unit == 's') {
    timespan = 'second'
  } else {
    throw new Error(`unsupport period: ${timeframe}`)
  }
  const secs = tf_to_secs(timeframe)
  _periods[timeframe] = {multiplier: num_val, timespan, timeframe, secs}
  return _periods[timeframe]
}

export const AllPeriods: Period[] = [
  makePeriod('1m'),
  makePeriod('5m'),
  makePeriod('15m'),
  makePeriod('30m'),
  makePeriod('1h'),
  makePeriod('2h'),
  makePeriod('4h'),
  makePeriod('8h'),
  makePeriod('12h'),
  makePeriod('1d'),
  makePeriod('3d'),
  makePeriod('1w'),
]


function getIconTool(id: string, icon: string, color: string, ){
  return{
    id,
    position: TooltipFeaturePosition.Middle,
    marginLeft: 8,
    marginTop: 2,
    marginRight: 0,
    marginBottom: 0,
    paddingLeft: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    icon,
    fontFamily: 'icomoon',
    size: 14,
    color: color,
    activeColor: color,
    backgroundColor: 'transparent',
    activeBackgroundColor: 'rgba(22, 119, 255, 0.15)'
  }
}

  
export function getThemeStyles(theme: string): Record<string, unknown> {
  const color = theme === 'dark' ? '#929AA5' : '#76808F'
  const lineColor = theme === 'dark' ? '#555555' : '#dddddd'
  const gridColor = theme === 'dark' ? '#081115' : '#F3F3F3'
  const backgroundColor = theme === 'dark' ? '#070211' : '#ffffff'
  const tickerNameColor = theme === 'dark' ? '#FFFFFF' : '#333333'
  
  // Detect mobile device for responsive configuration
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  const isSmallMobile = typeof window !== 'undefined' && window.innerWidth <= 480
  
  // Mobile responsive font sizes and margins
  const xAxisFontSize = isSmallMobile ? 10 : isMobile ? 11 : 12
  const yAxisFontSize = isSmallMobile ? 10 : isMobile ? 11 : 12
  const xAxisMargin = isSmallMobile ? 2 : isMobile ? 3 : 4
  const yAxisMargin = isSmallMobile ? 2 : isMobile ? 3 : 4
  
  // 注意，modalSetting中设置的样式path，必须在这里指定，否则无法重置样式
  return {
    pane: {
      backgroundColor: backgroundColor
    },
    candle: {
      pane: {
        backgroundColor: backgroundColor
      },
      type: kc.CandleType.CandleSolid,
      priceMark: {
        last: {show: true},
        high: {show: true},
        low: {show: true},
      },
      tooltip: {
        text: {
          style: {
            fontSize: 32,
            fontWeight: 'bold',
            color: '#FFFFFF'
          }
        },
        title: {
          show: true,
          size: 32,
          family: 'Helvetica Neue',
          weight: 'bold',
          color: '#FFFFFF'
        },
        custom: function (data: NeighborData<Nullable<KLineData>>, styles: CandleStyle) {
          const defVal = styles.tooltip.defaultValue
          const current = data.current
          
          // Return empty array if current data is null
          if (!current) {
            return []
          }
          
          const prevClose = data.prev?.close ?? current.close
          const changeValue = current.close - prevClose
          const thousandsSeparator = ','
          const clow = current.low
          const minProce = Math.min(clow, data.prev?.low ?? clow, data.next?.low ?? clow)
          const pricePrecision = GetNumberDotOffset(minProce) + 2
          const volumePrecision = 3
      
          const volPrecision = formatPrecision(current.volume ?? defVal, volumePrecision)
          const volume = formatThousands(formatBigNumber(volPrecision), thousandsSeparator)
          const change = prevClose === 0 ? defVal : `${formatPrecision(changeValue / prevClose * 100)}%`
          
          // Color coding for price changes
          const isUp = changeValue > 0
          const isDown = changeValue < 0
          const priceColor = isUp ? '#00C851' : isDown ? '#FF4444' : color
          const changeColor = isUp ? '#00C851' : isDown ? '#FF4444' : color
          
          // Get ticker name and timeframe from global stores
          let tickerName = 'Unknown';
          let timeframe = '';
          let currentSymbolValue: any = null;
          let currentPeriodValue: any = null;
          
          // Get current values from stores without subscribing
          const unsubscribeSymbol = currentSymbol.subscribe(value => {
            currentSymbolValue = value;
          });
          unsubscribeSymbol(); // Immediately unsubscribe to avoid memory leaks
          
          const unsubscribePeriod = currentPeriod.subscribe(value => {
            currentPeriodValue = value;
          });
          unsubscribePeriod(); // Immediately unsubscribe to avoid memory leaks
          
          if (currentSymbolValue) {
            tickerName = currentSymbolValue.name || currentSymbolValue.ticker || 'Unknown';
          }
          
          if (currentPeriodValue) {
            timeframe = currentPeriodValue.timeframe || '';
          }
          
          const timeDisplay = timeframe || '';
          const displayName = tickerName === 'Unknown' ? 'Chart' : tickerName;
          
          return [
            {title: displayName + '  ', value: timeDisplay, color: tickerNameColor, style: {fontSize: '32px', fontWeight: 'bold', color: tickerNameColor}},
             {title: m.open_(), value: formatThousands(formatPrecision(current.open, pricePrecision), thousandsSeparator), color: current.open >= prevClose ? '#00C851' : '#FF4444'},
             {title: m.high_(), value: formatThousands(formatPrecision(current.high, pricePrecision), thousandsSeparator), color: '#00C851'},
             {title: m.low_(), value: formatThousands(formatPrecision(current.low, pricePrecision), thousandsSeparator), color: '#FF4444'},
             {title: m.close_(), value: formatThousands(formatPrecision(current.close, pricePrecision), thousandsSeparator), color: priceColor},
             {title: m.volume_(), value: volume, color: '#9C27B0'},
             {title: m.change_(), value: change, color: changeColor}
          ]
        }
      }
    },
    indicator: {
      lastValueMark: {
        show: true,
      },
      tooltip: {
        icons: [
          getIconTool('visible', '\ue903', color),
          getIconTool('invisible', '\ue901', color),
          getIconTool('setting', '\ue902', color),
          getIconTool('close', '\ue900', color),
        ]
      }
    },
    grid: {
      show: true,
      horizontal: {
        show: true,
        color: gridColor,
        style: kc.LineType.Solid,
        size: 1
      },
      vertical: {
        show: true,
        color: gridColor,
        style: kc.LineType.Solid,
        size: 1
      }
    },
    xAxis: {
      show: true,
      axisLine: {
        show: false
      },
      tickLine: {
        show: true
      },
      tickText: {
        show: true,
        style: {
          fontSize: xAxisFontSize,
          color: color,
          fontFamily: 'Arial, sans-serif'
        },
        margin: xAxisMargin
      }
    },
    yAxis: {
      type: 'normal',
      reverse: false,
      show: true,
      axisLine: {
        show: false
      },
      tickLine: {
        show: true
      },
      tickText: {
        show: true,
        style: {
          fontSize: yAxisFontSize,
          color: color,
          fontFamily: 'Arial, sans-serif'
        },
        margin: yAxisMargin
      }
    },
    separator: {
      size: 1,
      color: theme === 'dark' ? 'rgba(85, 85, 85, 0.3)' : 'rgba(221, 221, 221, 0.3)',
      fill: true,
      activeBackgroundColor: theme === 'dark' ? 'rgba(85, 85, 85, 0.1)' : 'rgba(221, 221, 221, 0.1)'
    }
  }
}

const param = m.param();
  
export const IndFieldsMap: Record<string, Record<string, unknown>[]> = {
  AO: [
    { title: 'Short Period', precision: 0, min: 1, default: 5 },
    { title: 'Long Period', precision: 0, min: 1, default: 34 },
    { title: 'Increasing Color', type: 'color', styleKey: 'bars[0].upColor', default: '#26A69A' },
    { title: 'Decreasing Color', type: 'color', styleKey: 'bars[0].downColor', default: '#EF5350' }
  ],
  BIAS: [
    { title: m.period(), precision: 0, min: 1, default: 6 }
  ],
  BOLL: [
    { title: m.period(), precision: 0, min: 1, default: 20 },
    { title: m.standard_deviation(), precision: 2, min: 1, default: 2 }
  ],
  BBI: [
    { title: param + '1', precision: 0, min: 1, default: 3 },
    { title: param + '2', precision: 0, min: 1, default: 6 },
    { title: param + '3', precision: 0, min: 1, default: 12 },
    { title: param + '4', precision: 0, min: 1, default: 24 }
  ],
  CCI: [
    { title: param + '1', precision: 0, min: 1, default: 20 }
  ],
  CR: [
    { title: param + '1', precision: 0, min: 1, default: 26 },
    { title: param + '2', precision: 0, min: 1, default: 10 },
    { title: param + '3', precision: 0, min: 1, default: 20 },
    { title: param + '4', precision: 0, min: 1, default: 40 },
    { title: param + '5', precision: 0, min: 1, default: 60 }
  ],
  DMI: [
    { title: 'DI Period', precision: 0, min: 1, default: 14 },
    { title: 'ADX Period', precision: 0, min: 1, default: 6 }
  ],
  EMV: [
    { title: param + '1', precision: 0, min: 1, default: 14 },
    { title: param + '2', precision: 0, min: 1, default: 9 }
  ],
  EMA: [
    { title: 'EMA1', precision: 0, min: 1, styleKey: 'lines[0].color', default: 5 },
    { title: 'EMA2', precision: 0, min: 1, styleKey: 'lines[1].color', default: 10 },
    { title: 'EMA3', precision: 0, min: 1, styleKey: 'lines[2].color', default: 30 },
  ],
  ICHIMOKU: [
    { title: 'Tenkan Period', precision: 0, min: 1, default: 9 },
    { title: 'Kijun Period', precision: 0, min: 1, default: 26 },
    { title: 'Senkou B Period', precision: 0, min: 1, default: 52 }
  ],
  MTM: [
    { title: param + '1', precision: 0, min: 1, default: 12 },
    { title: param + '2', precision: 0, min: 1, default: 6 }
  ],
  MA: [
    { title: 'MA1', precision: 0, min: 1, styleKey: 'lines[0].color', default: 5 },
    { title: 'MA2', precision: 0, min: 1, styleKey: 'lines[1].color', default: 10 },
    { title: 'MA3', precision: 0, min: 1, styleKey: 'lines[2].color', default: 30 },
  ],
  MACD: [
    { title: 'Fast Period', precision: 0, min: 1, default: 12 },
    { title: 'Slow Period', precision: 0, min: 1, default: 26 },
    { title: 'Signal Period', precision: 0, min: 1, default: 9 }
  ],
  OBV: [
    { title: param + '1', precision: 0, min: 1, default: 30 },
    { title: param + '2', precision: 0, min: 1, default: 10 }
  ],
  PVT: [],
  PSY: [
    { title: param + '1', precision: 0, min: 1, default: 12 },
    { title: param + '2', precision: 0, min: 1, default: 6 }
  ],
  ROC: [
    { title: param + '1', precision: 0, min: 1, default: 12 },
    { title: param + '2', precision: 0, min: 1, default: 6 }
  ],
  RSI: [
    { title: 'Period', precision: 0, min: 1, default: 14 },
    { title: 'Overbought', precision: 0, min: 50, max: 100, default: 70 },
    { title: 'Middle', precision: 0, min: 30, max: 70, default: 50 },
    { title: 'Oversold', precision: 0, min: 0, max: 50, default: 30 },
    { title: 'Line Color', type: 'color', styleKey: 'lines[0].color', default: '#FF6B35' },
    { title: 'Line Thickness', precision: 0, min: 1, max: 5, styleKey: 'lines[0].size', default: 1 }
  ],

  SMA: [
    { title: param + '1', precision: 0, min: 1, default: 12 },
    { title: param + '2', precision: 0, min: 1, default: 2 }
  ],
  KDJ: [
    { title: param + '1', precision: 0, min: 1, default: 9 },
    { title: param + '2', precision: 0, min: 1, default: 3 },
    { title: param + '3', precision: 0, min: 1, default: 3 }
  ],
  SAR: [
    { title: 'Start', precision: 3, min: 0.001, max: 0.1, default: 0.02 },
    { title: 'Increment', precision: 3, min: 0.001, max: 0.1, default: 0.02 },
    { title: 'Max value', precision: 2, min: 0.1, max: 1.0, default: 0.2 }
  ],
  TRIX: [
    { title: param + '1', precision: 0, min: 1, default: 12 },
    { title: param + '2', precision: 0, min: 1, default: 9 }
  ],
  VOL: [
    { title: 'MA1', precision: 0, min: 1, default: 5 },
    { title: 'MA2', precision: 0, min: 1, default: 10 },
    { title: 'MA3', precision: 0, min: 1, default: 20 }
  ],
  VR: [
    { title: param + '1', precision: 0, min: 1, default: 26 },
    { title: param + '2', precision: 0, min: 1, default: 6 },
    { title: param + '3', precision: 0, min: 1, default: 12 }
  ],
  WR: [
    { title: 'Period', precision: 0, min: 1, default: 14 },
    { title: 'Line Color', type: 'color', styleKey: 'lines[0].color', default: '#2563eb' },
    { title: 'Line Thickness', precision: 0, min: 1, max: 5, styleKey: 'lines[0].size', default: 1 }
  ],
  ZIGZAG: [
    { title: 'Deviation (%)', precision: 1, min: 1, max: 50, default: 5 },
    { title: 'Depth', precision: 0, min: 1, max: 50, default: 5 }
  ]
}

export function isNumber (value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

export function readableNumber (value: string | number, keepLen=2): string {
  const v = +value
  if (isNumber(v)) {
    if (v > 1000000000) {
      return `${+((v / 1000000000).toFixed(keepLen))}B`
    }
    if (v > 1000000) {
      return `${+((v / 1000000).toFixed(keepLen))}M`
    }
    if (v > 1000) {
      return `${+((v / 1000).toFixed(keepLen))}K`
    }
  }
  return `${value}`
}


export function align_tfsecs(time_secs: number, tf_secs: number){
  if(time_secs > 1000000000000){
    throw Error('10 digit timestamp is require for align_tfsecs')
  }
  let origin_off = 0
  for(const item of tfsecs_origins){
    if(tf_secs < item.tfsecs)break
    if(tf_secs % item.tfsecs == 0){
      origin_off = item.origin
      break
    }
  }
  if(!origin_off){
    return Math.floor(time_secs / tf_secs) * tf_secs
  }
  return Math.floor((time_secs - origin_off) / tf_secs) * tf_secs + origin_off
}


export function align_tfmsecs(time_msecs: number, tf_msecs: number){
  // Validate timestamp to prevent errors
  if (!time_msecs || isNaN(time_msecs) || time_msecs <= 0) {
    console.warn('Invalid timestamp in align_tfmsecs:', time_msecs);
    time_msecs = Date.now(); // Use current time as fallback
  }
  
  if(time_msecs < 1000000000000){
    console.warn('13 digit timestamp is require for align_tfmsecs, got:', time_msecs);
    // Instead of throwing, try to fix it
    if (time_msecs < 1000000000) {
      // Looks like seconds, convert to milliseconds
      time_msecs = time_msecs * 1000;
    } else {
      // Use current time as fallback
      time_msecs = Date.now();
    }
  }
  if(tf_msecs < 1000){
    throw Error('milliseconds tf_msecs is require for align_tfmsecs')
  }
  const time_secs = Math.floor(time_msecs / 1000)
  const tf_secs = Math.floor(tf_msecs / 1000)
  return align_tfsecs(time_secs, tf_secs) * 1000
}

export function build_ohlcvs(details: BarArr[], in_msecs: number, tf_msecs: number, last_bar: BarArr | null = null): BarArr[] {
  // Validate and fix timestamps in details array
  details = details.map((row, index) => {
    const timestamp = row[0];
    if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
      console.warn(`Invalid timestamp in build_ohlcvs at index ${index}:`, timestamp);
      // Use current time as fallback
      row[0] = Date.now();
    }
    return row;
  });

  if(last_bar){
    // Validate last_bar timestamp
    if (!last_bar[0] || isNaN(last_bar[0]) || last_bar[0] <= 0) {
      console.warn('Invalid timestamp in last_bar:', last_bar[0]);
      last_bar[0] = Date.now();
    }
    last_bar[0] = align_tfmsecs(last_bar[0], tf_msecs)
  }
  if(in_msecs == tf_msecs){
    if(last_bar && details.length > 0 && details[0][0] > last_bar[0]){
      details.splice(0, 0, last_bar)
    }
    return details
  }
  const result: BarArr[] = last_bar ? [last_bar] : []
  let lastIdx = result.length - 1
  details.forEach((row: BarArr, index: number) => {
    // Additional validation before align_tfmsecs
    if (!row[0] || isNaN(row[0]) || row[0] <= 0) {
      console.warn(`Invalid timestamp in build_ohlcvs forEach at index ${index}:`, row[0]);
      row[0] = Date.now();
    }
    row[0] = align_tfmsecs(row[0], tf_msecs)
    if(lastIdx < 0 || row[0] > result[lastIdx][0]){
      result.push(row)
      lastIdx += 1
    }
    else{
      const prow = result[lastIdx]
      prow[2] = Math.max(prow[2], row[2])
      prow[3] = Math.min(prow[3], row[3])
      prow[4] = row[4]
      prow[5] += row[5]
    }
  })
  return result
}

/**
 * Process line chart styles by converting line chart type to area chart without fill
 * @param styles - The chart styles object
 * @returns Modified styles for line chart
 * 
 * IMPORTANT: This function converts 'line' to 'area' for rendering ONLY.
 * The original chart type should ALWAYS be preserved in $save.styles.candle.type
 */
export function processLineChartStyles(styles: Record<string, unknown>): Record<string, unknown> {
  // Create a deep copy to avoid modifying the original styles
  const processedStyles = JSON.parse(JSON.stringify(styles));
  
  // Store the original chart type as a marker
  const originalChartType = processedStyles.candle?.type;
  if (originalChartType) {
    processedStyles._originalChartType = originalChartType;
  }
  
  // NOTE: Line chart handling removed - now handled directly in modalChartType.svelte
  // Line charts are saved as area type with _isLineChart flag and transparent background
  
  // Check if this is an area chart type (and NOT a line chart disguised as area)
  if (processedStyles.candle && processedStyles.candle.type === 'area' && !processedStyles.candle._isLineChart) {
    // Ensure area configuration exists
    if (!processedStyles.candle.area) {
      processedStyles.candle.area = {};
    }
    
    // Set gradient fill for area chart
    // Try to get color from various sources, fallback to blue
    const lineColor = processedStyles.candle.bar?.upColor || 
                     processedStyles.candle.bar?.downColor ||
                     processedStyles.candle.priceMark?.last?.text?.color || 
                     processedStyles.candle.tooltip?.text?.color || 
                     '#2196F3'; // Default blue color
    
    processedStyles.candle.area = {
      ...processedStyles.candle.area,
      backgroundColor: [{
        offset: 0,
        color: lineColor + '60' // Add transparency (37% opacity)
      }, {
        offset: 1,
        color: lineColor + '10' // Very light transparency at bottom
      }]
    };
  }
  
  // IMPORTANT: Preserve critical settings that should not be lost during style processing
  // These settings are essential for chart functionality and user preferences
  
  // Preserve yAxis settings (type, reverse, etc.)
  if (styles.yAxis) {
    processedStyles.yAxis = {
      ...processedStyles.yAxis,
      ...styles.yAxis
    };
  }
  
  // Preserve xAxis settings
  if (styles.xAxis) {
    processedStyles.xAxis = {
      ...processedStyles.xAxis,
      ...styles.xAxis
    };
  }
  
  // Preserve grid settings
  if (styles.grid) {
    processedStyles.grid = {
      ...processedStyles.grid,
      ...styles.grid
    };
  }
  
  // Preserve indicator settings
  if (styles.indicator) {
    processedStyles.indicator = {
      ...processedStyles.indicator,
      ...styles.indicator
    };
  }
  // Check if this is a heikin_ashi chart type
  else if (processedStyles.candle && processedStyles.candle.type === 'heikin_ashi') {
    // Convert heikin_ashi to candle_solid for rendering
    processedStyles.candle.type = 'candle_solid';
  }
  
  return processedStyles;
}

/**
 * Get the original chart type from processed styles or saved styles
 * This is useful when reading from chart.getStyles() which may have converted types
 * @param chartStyles - Styles from chart.getStyles()
 * @param savedStyles - Original styles from $save.styles
 * @returns The original chart type
 */
export function getOriginalChartType(chartStyles: any, savedStyles: any): string {
  // First priority: Check saved styles (source of truth)
  if (savedStyles?.candle?.type) {
    console.log('✅ Using chart type from $save.styles:', savedStyles.candle.type);
    return savedStyles.candle.type;
  }
  
  // Second priority: Check if processed styles have marker
  if (chartStyles?._originalChartType) {
    console.log('✅ Using original chart type from marker:', chartStyles._originalChartType);
    return chartStyles._originalChartType;
  }
  
  // Fallback: Use chart styles (but this might be converted)
  if (chartStyles?.candle?.type) {
    console.log('⚠️ Using chart type from chart.getStyles() (might be converted):', chartStyles.candle.type);
    return chartStyles.candle.type;
  }
  
  console.log('⚠️ No chart type found, defaulting to candle_solid');
  return 'candle_solid';
}

/**
 * Convert regular OHLC data to Heikin Ashi format
 * Based on the Heikin Ashi formula:
 * - HA Close = (Open + High + Low + Close) / 4
 * - HA Open = (Previous HA Open + Previous HA Close) / 2
 * - HA High = Max(High, HA Open, HA Close)
 * - HA Low = Min(Low, HA Open, HA Close)
 */
export function convertToHeikinAshi(data: any[]): any[] {
  if (!data || data.length === 0) return data;
  
  const heikinAshiData = [];
  let prevHAOpen = 0;
  let prevHAClose = 0;
  
  for (let i = 0; i < data.length; i++) {
    const current = data[i] as any;
    
    // Calculate Heikin Ashi values
    const haClose = (current.open + current.high + current.low + current.close) / 4;
    
    let haOpen;
    if (i === 0) {
      // For the first candle, use the average of open and close
      haOpen = (current.open + current.close) / 2;
    } else {
      // For subsequent candles, use the average of previous HA open and close
      haOpen = (prevHAOpen + prevHAClose) / 2;
    }
    
    const haHigh = Math.max(current.high, haOpen, haClose);
    const haLow = Math.min(current.low, haOpen, haClose);
    
    // Create the Heikin Ashi candle
    const heikinAshiCandle = {
      ...current,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose
    };
    
    heikinAshiData.push(heikinAshiCandle);
    
    // Store for next iteration
    prevHAOpen = haOpen;
    prevHAClose = haClose;
  }
  
  return heikinAshiData;
}
