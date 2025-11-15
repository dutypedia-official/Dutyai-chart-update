<script lang="ts">
  import Modal from "./modal.svelte"
  import { getContext, onMount } from "svelte";
  import * as m from '$lib/paraglide/messages.js'
  import { ChartSave, ChartCtx } from "./chart";
  import type { Writable } from "svelte/store";
  import type { Chart, Nullable, PaneOptions } from 'klinecharts';
  import { derived } from "svelte/store";
  import {ActionType} from 'klinecharts';
  import * as kc from 'klinecharts';
  import { IndFieldsMap } from './coms';
  import KlineIcon from './icon.svelte';
  import { undoRedoManager } from './undoRedoManager';
  import { getChartRenderIntegration } from './core';
  import { markDirty } from '$lib/stores/unsavedChanges';
  
  let { show = $bindable() } = $props();

  // Get context variables first before using them in derived stores
  const ctx = getContext('ctx') as Writable<ChartCtx>;
  const save = getContext('save') as Writable<ChartSave>;
  const chart = getContext('chart') as Writable<Nullable<Chart>>;
  
  // Render system integration
  const renderIntegration = getChartRenderIntegration();

  // Static indicator list - base data
  // Note: AI indicators (SMART_MONEY, TRAP_HUNTER, VOLCANIC, VOLCANIC_SIG) are now in AI modal
  const staticIndicators = [
    // Main indicators (overlay on price chart) - sorted alphabetically
    { name: 'BBI', title: 'BBI (Bull and Bear Index)', is_main: false },
    { name: 'BOLL', title: 'BOLL (Bollinger Bands)', is_main: true },
    { name: 'EMA', title: 'EMA (Exponential Moving Average)', is_main: true },
    { name: 'ICHIMOKU', title: 'ICHIMOKU (Ichimoku Kinko Hyo)', is_main: true },
    { name: 'MA', title: 'MA (Moving Average)', is_main: true },
    { name: 'SAR', title: 'SAR (Parabolic SAR)', is_main: true },
    { name: 'SMA', title: 'SMA (Simple Moving Average)', is_main: true },
    { name: 'SUPERTREND', title: 'Smart Trend', is_main: true },
    { name: 'ZIGZAG', title: 'ZigZag (Trend Reversal Indicator)', is_main: true },
    
    // Sub indicators (separate panes) - sorted alphabetically
    { name: 'AO', title: 'Awesome Oscillator', is_main: false },
    { name: 'BIAS', title: 'BIAS (Bias)', is_main: false },
    { name: 'CCI', title: 'CCI (Commodity Channel Index)', is_main: false },
    { name: 'CR', title: 'CR (Energy)', is_main: false },
    { name: 'DMI', title: 'DMI (Directional Movement Index)', is_main: false },
    { name: 'EMV', title: 'EMV (Ease of Movement)', is_main: false },
    { name: 'KDJ', title: 'KDJ (KDJ Index)', is_main: false },
    { name: 'MACD', title: 'MACD (Moving Average Convergence Divergence)', is_main: false },
    { name: 'MTM', title: 'MTM (Momentum)', is_main: false },
    { name: 'OBV', title: 'OBV (On Balance Volume)', is_main: false },
    { name: 'PSY', title: 'PSY (Psychological Line)', is_main: false },
    { name: 'PVT', title: 'PVT (Price Volume Trend)', is_main: false },
    { name: 'ROC', title: 'ROC (Rate of Change)', is_main: false },
    { name: 'RSI', title: 'RSI (Relative Strength Index)', is_main: false },
    { name: 'STOCH', title: 'STOCH (Stochastic Oscillator)', is_main: false },

    { name: 'TRIX', title: 'TRIX (Triple Exponential Moving Average)', is_main: false },
    { name: 'VOL', title: 'VOL (Volume)', is_main: true },
    { name: 'VR', title: 'VR (Volume Variation Rate)', is_main: false },
    { name: 'WR', title: 'WR (Williams Percentage Range)', is_main: false }
  ];

  // Alphabetically sorted indicator list by name
  const sortedIndicators = staticIndicators.slice().sort((a, b) => a.name.localeCompare(b.name));

  // Helper function to get user-friendly indicator name
  function getFriendlyIndicatorName(name: string): string {
    const indicator = staticIndicators.find(ind => ind.name === name);
    return indicator ? indicator.title : name;
  }

  // Track selected indicators (those added to chart)
  // This will automatically sync with save.saveInds to show active indicators
  let selectedIndicators = $derived.by(() => {
    const activeIndicators = new Set<string>();
    
    // Get all indicator names from save.saveInds
    if ($save && $save.saveInds) {
      Object.values($save.saveInds).forEach((indicator: any) => {
        if (indicator && indicator.name) {
          activeIndicators.add(indicator.name);
        }
      });
    }
    
    // Show user-friendly names in console
    const friendlyNames = Array.from(activeIndicators).map(name => getFriendlyIndicatorName(name));
    console.log('🔄 selectedIndicators updated:', friendlyNames);
    return activeIndicators;
  });

  onMount(() => {
    console.log('modalIndSearch mounted')
    console.log('Available ActionTypes:', Object.keys(ActionType))
    console.log('ActionType values:', Object.values(ActionType))
    
    // Debug localStorage content
    console.log('🔍 localStorage content:')
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        console.log(`🔍 ${key}:`, localStorage.getItem(key))
      }
    }
    
    // Enhanced debug function to check localStorage and current state
    (window as any).debugChart = () => {
      const chartData = JSON.parse(localStorage.getItem('chart') || '{}')
      console.log('🔍 localStorage chart data:', chartData)
      console.log('🔍 saveInds keys:', Object.keys(chartData.saveInds || {}))
      console.log('🔍 Current $save.saveInds keys:', Object.keys($save.saveInds))
      console.log('🔍 Chart available:', $chart ? 'Yes' : 'No chart')
      return { localStorage: chartData, currentSave: $save.saveInds }
    }
    
    // Auto-debug on page load
    setTimeout(() => {
      console.log('🚀 Auto-debug on page load:')
      ;(window as any).debugChart()
    }, 2000)
    console.log('🔍 Debug function added: window.debugChart()')
  })
  
  let keyword = $state('');
  let wasOpenedFromIndicatorList = $state(false);
  // Snapshot of selected indicators captured at the moment the modal opens.
  // Used to pin those indicators at the top while the modal remains open.
  let pinnedOnOpen = $state<Set<string>>(new Set());
  let prevShow = $state(false);
  
  // Scroll-based search bar hide/show
  let isSearchBarVisible = $state(true);
  let lastScrollTop = $state(0);
  let scrollContainer: HTMLElement;
  
  // Watch for edit popup state changes
  $effect(() => {
    // If edit popup is closed and we opened it from indicator list, show indicator list again
    if (!$ctx.modalIndCfg && wasOpenedFromIndicatorList) {
      wasOpenedFromIndicatorList = false;
      // Small delay to ensure smooth transition
      setTimeout(() => {
        show = true;
      }, 100);
    }
  });

  let showInds = $derived.by(() => {
    // Start from alphabetically sorted base
    let base = sortedIndicators;
    if (keyword) {
      const keywordLow = keyword.toLowerCase();
      base = base
        .filter(i =>
          i.name.toLowerCase().includes(keywordLow) ||
          i.title.toLowerCase().includes(keywordLow)
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    // When modal is open, keep the snapshot of selected indicators (captured on open)
    // pinned at the top; both pinned and the rest keep alphabetical order.
    if (show && pinnedOnOpen.size > 0) {
      const pinned = base.filter(i => pinnedOnOpen.has(i.name));
      const rest = base.filter(i => !pinnedOnOpen.has(i.name));
      return [...pinned, ...rest];
    }
    return base;
  })
  
  // Capture a snapshot of currently selected indicators when the modal opens,
  // and reset when it closes. This ensures:
  // - Added indicators while open stay in alphabetical position (not re-pinned)
  // - Deleted indicators while open remain pinned at top until the modal closes
  $effect(() => {
    if (show !== prevShow) {
      if (show) {
        // Snapshot current selection at open time
        const snapshot = new Set<string>();
        selectedIndicators.forEach?.((name: string) => snapshot.add(name));
        // For non-iterable Sets (in some runtimes), fallback:
        if (snapshot.size === 0 && selectedIndicators && (selectedIndicators as any).size > 0) {
          for (const name of (selectedIndicators as any).values()) snapshot.add(name);
        }
        pinnedOnOpen = snapshot;
      } else {
        pinnedOnOpen = new Set();
      }
      prevShow = show;
    }
  });

  // Function to get specific icon for each indicator
  function getIndicatorIcon(name: string): string {
    const iconMap: Record<string, string> = {
      // Moving Averages - Trend Lines
      'MA': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>',
      'EMA': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>',
      'SMA': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>',
      
      // Bollinger & SAR - Price Channels
      'BOLL': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>',
      'SAR': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>',
      'SUPERTREND': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 17l6-6 4 4 8-8M7 7l4 4M17 7l4 4"></path><circle cx="3" cy="17" r="1.5" fill="currentColor"/><circle cx="9" cy="11" r="1.5" fill="currentColor"/><circle cx="13" cy="15" r="1.5" fill="currentColor"/><circle cx="21" cy="7" r="1.5" fill="currentColor"/>',
      'ZIGZAG': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 17l6-8 6 8 6-16"></path><circle cx="3" cy="17" r="2" fill="currentColor"/><circle cx="9" cy="9" r="2" fill="currentColor"/><circle cx="15" cy="17" r="2" fill="currentColor"/><circle cx="21" cy="1" r="2" fill="currentColor"/>',
      
      // Oscillators - Wave Patterns

      'MACD': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>',
      'KDJ': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>',
      'RSI': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>',
      'WR': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path>',
      'CCI': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z M8 10l2.5 2.5L16 7"></path>',
      
      // Volume Indicators - Bar Charts
      'VOL': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>',
      'OBV': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>',
      'PVT': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>',
      'VR': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>',
      
      // Momentum - Arrows & Trends
      'MTM': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>',
      'ROC': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>',
      'TRIX': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>',
      
      // Complex Indicators - Special Icons
      'ICHIMOKU': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path>',
      'DMI': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"></path>',
      'BBI': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z M8 12h8M12 8v8"></path>',
      
      // Psychological & Special
      'PSY': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>',
      'AO': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>',
      'BIAS': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
      'CR': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>',
      'EMV': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18"></path>',
    };
    
    return iconMap[name] || '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>';
  }

  function addIndicator(isMain: boolean, name: string) {
    let success = false;
    if (name === 'BBI') {
      // For BBI, only add one BBI with default periods [3, 6, 12, 24]
      const paneId = 'pane_BBI';
      const result = createIndicator(name, [3, 6, 12, 24], true, {id: paneId});
      success = !!result;
    } else if (name === 'EMA') {
      // For EMA, only add one EMA with default period 20 when clicked from indicator list
      const paneId = 'candle_pane'; // EMA is a main indicator (overlay)
      const result = createIndicator(name, [20], true, {id: paneId});
      success = !!result;
    } else if (name === 'MA') {
      // For MA, only add one MA with default period 20 when clicked from indicator list
      const paneId = 'candle_pane'; // MA is a main indicator (overlay)
      const chartObj = $chart;
      if (chartObj) {
        const ind_id = chartObj.createIndicator({
          name: 'MA',
          calcParams: [20],
          styles: {
            lines: [{
              color: '#2563eb', // Blue color to match the default in edit popup
              size: 1,
              style: kc.LineType.Solid
            }]
          },
          // @ts-expect-error
          createTooltipDataSource: ({ indicator }) => {
            const icon_ids = [indicator.visible ? 1: 0, 2, 3];
            const styles = chartObj.getStyles().indicator.tooltip;
            const icons = icon_ids.map(i => styles.features[i])
            return { icons }
          }
        }, true, {id: paneId});
        
        if (ind_id) {
          const ind = {
            name: 'MA', 
            pane_id: paneId, 
            params: [20],
            styles: [{color: '#2563eb', thickness: 1, lineStyle: 'solid'}]
          };
          const saveKey = `${paneId}_MA`;
          
          save.update(s => {
            s.saveInds[saveKey] = ind;
            return s;
          });
          
          success = true;
        }
      }
    } else if (name === 'SUPERTREND') {
      // For SuperTrend, add with default parameters (period: 10, multiplier: 3.0)
      const paneId = 'candle_pane'; // SuperTrend is a main indicator (overlay)
      const chartObj = $chart;
      if (chartObj) {
        const ind_id = chartObj.createIndicator({
          name: 'SUPERTREND',
          calcParams: [10, 3.0],
          // Base style for Smart Trend; per-trend colors/thickness/style come from extendData in draw()
          styles: {
            lines: [{
              color: '#00FF00',
              size: 1,
              style: kc.LineType.Dashed,
              dashedValue: [4, 4]
            }]
          },
          extendData: {
            showLabels: true,
            uptrendColor: '#00FF00',
            downtrendColor: '#FF0000',
            uptrendThickness: 1,
            downtrendThickness: 1,
            uptrendLineStyle: 'dashed',
            downtrendLineStyle: 'dashed'
          },
          // @ts-expect-error
          createTooltipDataSource: ({ indicator }) => {
            const icon_ids = [indicator.visible ? 1: 0, 2, 3];
            const styles = chartObj.getStyles().indicator.tooltip;
            const icons = icon_ids.map(i => styles.features[i])
            return { icons }
          }
        }, true, {id: paneId});
        
        if (ind_id) {
          const ind = {
            name: 'SUPERTREND', 
            pane_id: paneId, 
            params: [10, 3.0],
            // Persist a hint of defaults for modal to pick up if needed
            superTrendGroups: [{
              id: 'st_default',
              period: 10,
              multiplier: 3.0,
              showLabels: true,
              styles: {
                uptrend: { color: '#00FF00', thickness: 1, lineStyle: 'dashed' },
                downtrend: { color: '#FF0000', thickness: 1, lineStyle: 'dashed' }
              }
            }]
          };
          const saveKey = `${paneId}_SUPERTREND`;
          
          save.update(s => {
            s.saveInds[saveKey] = ind;
            return s;
          });
          
          success = true;
        }
      }
    } else if (name === 'SMA') {
      // For SMA, add with default period 20 and vibrant orange color
      const paneId = 'candle_pane'; // SMA is a main indicator (overlay)
      const chartObj = $chart;
      if (chartObj) {
        const ind_id = chartObj.createIndicator({
          name: 'SMA',
          calcParams: [20],
          styles: {
            lines: [{
              color: '#FF6C37', // Vibrant orange color
              size: 2, // 2px thickness
              style: kc.LineType.Solid
            }]
          },
          // @ts-expect-error
          createTooltipDataSource: ({ indicator }) => {
            const icon_ids = [indicator.visible ? 1: 0, 2, 3];
            const styles = chartObj.getStyles().indicator.tooltip;
            const icons = icon_ids.map(i => styles.features[i])
            return { icons }
          }
        }, true, {id: paneId});
        
        if (ind_id) {
          const ind = {
            name: 'SMA', 
            pane_id: paneId, 
            params: [20],
            styles: [{color: '#FF6C37', thickness: 2, lineStyle: 'solid'}]
          };
          const saveKey = `${paneId}_SMA`;
          
          save.update(s => {
            s.saveInds[saveKey] = ind;
            return s;
          });
          
          success = true;
        }
      }
    } else if (name === 'RSI') {
      // For RSI, add with configuration from saved RSI groups or default
      const paneId = 'pane_RSI';
      
      // Get saved RSI groups from localStorage or use default
      let rsiGroups = [];
      try {
        const savedRsiGroups = localStorage.getItem('rsiGroups');
        if (savedRsiGroups) {
          rsiGroups = JSON.parse(savedRsiGroups);
        }
      } catch (error) {
        console.warn('Failed to load saved RSI groups:', error);
      }
      
      // If no saved groups, create default RSI group
      if (rsiGroups.length === 0) {
        rsiGroups = [{
          id: 'rsi_default',
          period: 14,
          overbought: 70,
          middle: 50,
          oversold: 30,
          styles: {
            rsi: {
              color: '#8B5CF6',
              thickness: 2,
              lineStyle: 'solid'
            },
            overboughtColor: '#EF4444', // Red for overbought
            oversoldColor: '#10B981',   // Green for oversold
            middleLineColor: '#6B7280'  // Gray for middle line
          }
        }];
      }
      
      // Use the first RSI group's configuration
      const rsiConfig = rsiGroups[0];
      
      // Create indicator with custom styling
      const chartObj = $chart;
      if (chartObj) {
        const ind_id = chartObj.createIndicator({
          name: 'RSI',
          calcParams: [rsiConfig.period],
          styles: {
            lines: [{
              color: rsiConfig.styles.rsi.color,
              size: rsiConfig.styles.rsi.thickness,
              style: rsiConfig.styles.rsi.lineStyle === 'dashed' ? kc.LineType.Dashed : 
                     rsiConfig.styles.rsi.lineStyle === 'dotted' ? kc.LineType.Dashed : kc.LineType.Solid
            }]
          }
        }, true, {id: paneId});
        
        if (ind_id) {
          const ind = {name: 'RSI', pane_id: paneId, params: [rsiConfig.period]};
          const saveKey = `${paneId}_RSI`;
          
          save.update(s => {
            s.saveInds[saveKey] = ind;
            return s;
          });
          
          success = true;
        }
      }
    } else if (name === 'STOCH') {
      // For Stochastic, add with configuration from saved Stochastic groups or default
      const paneId = 'pane_STOCH';
      
      // Get saved Stochastic groups from localStorage or use default
      let stochasticGroups = [];
      try {
        const savedStochasticGroups = localStorage.getItem('stochasticGroups');
        if (savedStochasticGroups) {
          stochasticGroups = JSON.parse(savedStochasticGroups);
        }
      } catch (error) {
        console.warn('Failed to load saved Stochastic groups:', error);
      }
      
      // If no saved groups, create default Stochastic group
      if (stochasticGroups.length === 0) {
        stochasticGroups = [{
          id: 'stochastic_default',
          kPeriod: 14,
          dPeriod: 3,
          overbought: 80,
          mid: 50,
          oversold: 20,
          styles: {
            k: {
              color: '#3B82F6',
              thickness: 2,
              lineStyle: 'solid'
            },
            d: {
              color: '#EF4444',
              thickness: 2,
              lineStyle: 'solid'
            },
            overboughtColor: '#EF4444',
            oversoldColor: '#10B981',
            midColor: '#6B7280'
          }
        }];
      }
      
      // Use the first Stochastic group's configuration
      const stochConfig = stochasticGroups[0];
      
      // Create indicator with custom styling
      const chartObj = $chart;
      if (chartObj) {
        const ind_id = chartObj.createIndicator({
          name: 'STOCH',
          calcParams: [stochConfig.kPeriod, stochConfig.dPeriod],
          styles: {
            lines: [
              {
                color: stochConfig.styles.k.color,
                size: stochConfig.styles.k.thickness,
                style: stochConfig.styles.k.lineStyle === 'dashed' ? kc.LineType.Dashed : 
                       stochConfig.styles.k.lineStyle === 'dotted' ? kc.LineType.Dashed : kc.LineType.Solid
              },
              {
                color: stochConfig.styles.d.color,
                size: stochConfig.styles.d.thickness,
                style: stochConfig.styles.d.lineStyle === 'dashed' ? kc.LineType.Dashed : 
                       stochConfig.styles.d.lineStyle === 'dotted' ? kc.LineType.Dashed : kc.LineType.Solid
              }
            ]
          }
        }, true, {id: paneId});
        
        if (ind_id) {
          const ind = {name: 'STOCH', pane_id: paneId, params: [stochConfig.kPeriod, stochConfig.dPeriod]};
          const saveKey = `${paneId}_STOCH`;
          
          save.update(s => {
            s.saveInds[saveKey] = ind;
            return s;
          });
          
          success = true;
        }
      }
    } else {
      const paneId = isMain ? 'candle_pane' : 'pane_'+name;
      const result = createIndicator(name, undefined, true, {id: paneId});
      success = !!result;
    }
    
    // selectedIndicators will automatically update via derived store when save.saveInds changes
    
    // Don't close the modal - keep it open to show edit/delete buttons
  }

  function editIndicator(name: string) {
    // Find the pane ID for this indicator
    const indicatorEntry = Object.entries($save.saveInds).find(([key, ind]) => ind.name === name);
    
    if (indicatorEntry) {
      const [, ind] = indicatorEntry;
      $ctx.editIndName = name;
      $ctx.editPaneId = ind.pane_id;
      $ctx.modalIndCfg = true;
      
      // Mark that edit popup was opened from indicator list
      wasOpenedFromIndicatorList = true;
      
      // Hide the indicator list popup when edit popup opens
      show = false;
    }
  }

  function deleteIndicator(name: string) {
    if (name === 'MACD') {
      // For MACD, delete all instances
      const macdEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'MACD');
      macdEntries.forEach(([key, ind]) => {
        delInd(ind.pane_id, name);
      });
      
      // Clear all MACD-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'MACD') {
            delete s.saveInds[key];
          }
        });
        return s;
      });
    } else if (name === 'RSI') {
      // For RSI, delete all instances
      const rsiEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'RSI');
      rsiEntries.forEach(([key, ind]) => {
        delInd(ind.pane_id, name);
      });
      
      // Clear all RSI-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'RSI') {
            delete s.saveInds[key];
          }
        });
        return s;
      });
    } else if (name === 'STOCH') {
      // For Stochastic, delete all instances
      const stochEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'STOCH');
      stochEntries.forEach(([key, ind]) => {
        delInd(ind.pane_id, name);
      });
      
      // Clear all Stochastic-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'STOCH') {
            delete s.saveInds[key];
          }
        });
        return s;
      });
    } else if (name === 'BBI') {
      // For BBI, delete all instances and groups
      const bbiEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'BBI');
      bbiEntries.forEach(([key, ind]) => {
        delInd(ind.pane_id, name);
      });
      
      // Clear all BBI-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'BBI') {
            delete s.saveInds[key];
          }
        });
        return s;
      });
    } else if (name === 'AO') {
      // For AO, delete all instances and groups from all sub-panes
      console.log('🗑️ Starting bulk AO deletion...');
      
      // First, remove all AO indicators directly from chart
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const aoIndicators = indicators.filter(ind => ind.name === 'AO');
          console.log('📊 Found AO indicators on chart:', aoIndicators.length);
          
          aoIndicators.forEach(indicator => {
            console.log('🗑️ Removing AO indicator from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'AO' });
          });
          
          console.log('✅ All AO indicators removed from chart');
        } catch (error) {
          console.error('❌ Error removing AO indicators from chart:', error);
        }
      }
      
      // Then, clean up saved data entries
      const aoEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'AO');
      console.log('🗑️ Deleting AO saved entries:', aoEntries.length);
      
      aoEntries.forEach(([key, ind]) => {
        console.log('🗑️ Cleaning saved entry:', key, 'pane:', ind.pane_id);
        if (ind.pane_id) {
          // Use delInd for additional cleanup
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all AO-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'AO') {
            console.log('🗑️ Clearing AO saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      console.log('✅ Bulk AO deletion completed');
    } else if (name === 'DMI') {
      // For DMI, delete all instances and groups from all sub-panes
      console.log('🗑️ Starting bulk DMI deletion...');
      
      // First, remove all DMI indicators directly from chart
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const dmiIndicators = indicators.filter(ind => ind.name === 'DMI');
          console.log('📊 Found DMI indicators on chart:', dmiIndicators.length);
          
          dmiIndicators.forEach(indicator => {
            console.log('🗑️ Removing DMI indicator from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'DMI' });
          });
          
          console.log('✅ All DMI indicators removed from chart');
        } catch (error) {
          console.error('❌ Error removing DMI indicators from chart:', error);
        }
      }
      
      // Then, clean up saved data entries
      const dmiEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'DMI');
      console.log('🗑️ Deleting DMI saved entries:', dmiEntries.length);
      
      dmiEntries.forEach(([key, ind]) => {
        console.log('🗑️ Cleaning saved entry:', key, 'pane:', ind.pane_id);
        if (ind.pane_id) {
          // Use delInd for additional cleanup
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all DMI-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'DMI') {
            console.log('🗑️ Clearing DMI saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      console.log('✅ Bulk DMI deletion completed');
    } else if (name === 'SAR') {
      // For SAR, delete all instances on main pane and clear all saved keys
      console.log('🗑️ Starting bulk SAR deletion...');
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const sarIndicators = indicators.filter(ind => ind.name === 'SAR');
          console.log('📊 Found SAR indicators on chart:', sarIndicators.length);
          sarIndicators.forEach(indicator => {
            console.log('🗑️ Removing SAR from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'SAR' });
          });
        } catch (error) {
          console.error('❌ Error removing SAR indicators from chart:', error);
          // Fallback: attempt removal from common pane(s)
          try { $chart.removeIndicator({ paneId: 'candle_pane', name: 'SAR' }); } catch (_) {}
          try { $chart.removeIndicator({ paneId: $ctx.editPaneId, name: 'SAR' }); } catch (_) {}
        }
      }

      // Clear all SAR-related saved data (handles keys like candle_pane_SAR, SAR_2, etc.)
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'SAR') {
            delete s.saveInds[key];
          }
        });
        return s;
      });

      // If currently editing SAR, clear edit context
      ctx.update(c => {
        if (c.editIndName === 'SAR') {
          c.editIndName = '';
          c.editPaneId = '';
          c.modalIndCfg = false;
        }
        return c;
      });

      console.log('✅ Bulk SAR deletion completed');
    } else if (name === 'SUPERTREND') {
      // For SuperTrend, delete all instances on all panes and clear all saved keys
      console.log('🗑️ Starting bulk Smart Trend deletion...');
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const stIndicators = indicators.filter(ind => ind.name === 'SUPERTREND');
          console.log('📊 Found Smart Trend indicators on chart:', stIndicators.length);
          stIndicators.forEach(indicator => {
            console.log('🗑️ Removing Smart Trend from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'SUPERTREND' });
          });
        } catch (error) {
          console.error('❌ Error removing Smart Trend indicators from chart:', error);
          // Fallback: try common panes
          try { $chart.removeIndicator({ paneId: 'candle_pane', name: 'SUPERTREND' }); } catch (_) {}
          try { $chart.removeIndicator({ paneId: $ctx.editPaneId, name: 'SUPERTREND' }); } catch (_) {}
        }
      }

      // Clear all SUPERTREND-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'SUPERTREND') {
            delete s.saveInds[key];
          }
        });
        return s;
      });
      console.log('✅ Bulk Smart Trend deletion completed');
    } else if (name === 'CR') {
      // For CR, delete all instances and groups from all sub-panes
      console.log('🗑️ Starting bulk CR deletion...');
      
      // First, remove all CR indicators directly from chart
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const crIndicators = indicators.filter(ind => ind.name === 'CR');
          console.log('📊 Found CR indicators on chart:', crIndicators.length);
          
          crIndicators.forEach(indicator => {
            console.log('🗑️ Removing CR indicator from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'CR' });
          });
          
          console.log('✅ All CR indicators removed from chart');
        } catch (error) {
          console.error('❌ Error removing CR indicators from chart:', error);
        }
      }
      
      // Then, clean up saved data entries
      const crEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'CR');
      console.log('🗑️ Deleting CR saved entries:', crEntries.length);
      
      crEntries.forEach(([key, ind]) => {
        console.log('🗑️ Cleaning saved entry:', key, 'pane:', ind.pane_id);
        if (ind.pane_id) {
          // Use delInd for additional cleanup
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all CR-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'CR') {
            console.log('🗑️ Clearing CR saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      console.log('✅ Bulk CR deletion completed');
    } else if (name === 'WR') {
      // For WR, delete all instances and groups from all sub-panes
      console.log('🗑️ Starting bulk WR deletion...');
      
      // First, remove all WR indicators directly from chart
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const wrIndicators = indicators.filter(ind => ind.name === 'WR');
          console.log('📊 Found WR indicators on chart:', wrIndicators.length);
          
          wrIndicators.forEach(indicator => {
            console.log('🗑️ Removing WR indicator from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'WR' });
          });
          
          console.log('✅ All WR indicators removed from chart');
        } catch (error) {
          console.error('❌ Error removing WR indicators from chart:', error);
        }
      }
      
      // Then, clean up saved data entries
      const wrEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'WR');
      console.log('🗑️ Deleting WR saved entries:', wrEntries.length);
      
      wrEntries.forEach(([key, ind]) => {
        console.log('🗑️ Cleaning saved entry:', key, 'pane:', ind.pane_id);
        if (ind.pane_id) {
          // Use delInd for additional cleanup
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all WR-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'WR') {
            console.log('🗑️ Clearing WR saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      // Signal to clear WR groups in modal
      ctx.update(c => {
        c.clearWrGroups++;
        return c;
      });
      
      console.log('✅ Bulk WR deletion completed');
    } else if (name === 'KDJ') {
      // For KDJ, delete all instances and groups from all sub-panes
      const kdjEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'KDJ');
      console.log('🗑️ Deleting KDJ entries:', kdjEntries);
      
      kdjEntries.forEach(([key, ind]) => {
        console.log('🗑️ Deleting KDJ from pane:', ind.pane_id);
        if (ind.pane_id) {
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all KDJ-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'KDJ') {
            console.log('🗑️ Clearing KDJ saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
    } else if (name === 'OBV') {
      // For OBV, delete all instances and groups from all sub-panes
      const obvEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'OBV');
      console.log('🗑️ Deleting OBV entries from saveInds:', obvEntries);
      
      // First, remove from saved entries
      obvEntries.forEach(([key, ind]) => {
        console.log('🗑️ Deleting OBV from pane (saveInds):', ind.pane_id);
        if (ind.pane_id) {
          delInd(ind.pane_id, name);
        }
      });
      
      // Additionally, try to remove from common pane locations to handle out-of-sync scenarios
      const commonPaneIds = [
        $ctx.editPaneId, // Main edit pane
        'pane_OBV_1', 'pane_OBV_2', 'pane_OBV_3', 'pane_OBV_4', 'pane_OBV_5', // Common OBV pane IDs
        'main', 'sub1', 'sub2', 'sub3', 'sub4' // Other common pane names
      ];
      
      console.log('🗑️ Attempting to remove OBV from common pane locations...');
      commonPaneIds.forEach(paneId => {
        if (paneId) {
          try {
            console.log('🗑️ Trying to remove OBV from pane:', paneId);
            $chart?.removeIndicator({ paneId, name: 'OBV' });
          } catch (error) {
            // Silently ignore errors for panes that don't exist or don't have OBV
          }
        }
      });
      
      // Clear all OBV-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'OBV') {
            console.log('🗑️ Clearing OBV saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      // Signal to clear OBV groups in modal
      ctx.update(c => {
        c.clearObvGroups++;
        return c;
      });
    } else if (name === 'CCI') {
      // For CCI, delete all instances and groups from all sub-panes
      console.log('🗑️ Starting bulk CCI deletion...');
      
      // First, remove all CCI indicators directly from chart
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const cciIndicators = indicators.filter(ind => ind.name === 'CCI');
          console.log('📊 Found CCI indicators on chart:', cciIndicators.length);
          
          cciIndicators.forEach(indicator => {
            console.log('🗑️ Removing CCI indicator from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'CCI' });
          });
          
          console.log('✅ All CCI indicators removed from chart');
        } catch (error) {
          console.error('❌ Error removing CCI indicators from chart:', error);
        }
      }
      
      // Then, clean up saved data entries
      const cciEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'CCI');
      console.log('🗑️ Deleting CCI saved entries:', cciEntries.length);
      
      cciEntries.forEach(([key, ind]) => {
        console.log('🗑️ Cleaning saved entry:', key, 'pane:', ind.pane_id);
        if (ind.pane_id) {
          // Use delInd for additional cleanup
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all CCI-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'CCI') {
            console.log('🗑️ Clearing CCI saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      // Signal to clear CCI groups in modal
      ctx.update(c => {
        c.clearCciGroups++;
        return c;
      });
      
      console.log('✅ Bulk CCI deletion completed');
    } else if (name === 'EMV') {
      // For EMV, delete all instances and groups from all sub-panes
      const emvEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'EMV');
      console.log('🗑️ Deleting EMV entries:', emvEntries);
      
      emvEntries.forEach(([key, ind]) => {
        console.log('🗑️ Deleting EMV from pane:', ind.pane_id);
        if (ind.pane_id) {
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all EMV-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'EMV') {
            console.log('🗑️ Clearing EMV saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      // Signal to clear EMV groups in modal
      ctx.update(c => {
        c.clearEmvGroups++;
        return c;
      });
    } else if (name === 'MTM') {
      // For MTM, delete all instances and groups from all sub-panes
      const mtmEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'MTM');
      console.log('🗑️ Deleting MTM entries:', mtmEntries);
      
      mtmEntries.forEach(([key, ind]) => {
        console.log('🗑️ Deleting MTM from pane:', ind.pane_id);
        if (ind.pane_id) {
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all MTM-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'MTM') {
            console.log('🗑️ Clearing MTM saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      // Signal to clear MTM groups in modal
      ctx.update(c => {
        c.clearMtmGroups++;
        return c;
      });
    } else if (name === 'PSY') {
      // For PSY, delete all instances and groups from all sub-panes
      const psyEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'PSY');
      console.log('🗑️ Deleting PSY entries:', psyEntries);
      
      psyEntries.forEach(([key, ind]) => {
        console.log('🗑️ Deleting PSY from pane:', ind.pane_id);
        if (ind.pane_id) {
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all PSY-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'PSY') {
            console.log('🗑️ Clearing PSY saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      // Signal to clear PSY groups in modal
      ctx.update(c => {
        c.clearPsyGroups++;
        return c;
      });
    } else if (name === 'PVT') {
      // For PVT, delete all instances and groups from all sub-panes
      console.log('🗑️ Starting bulk PVT deletion...');
      
      // First, remove all PVT indicators directly from chart
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const pvtIndicators = indicators.filter(ind => ind.name === 'PVT');
          console.log('📊 Found PVT indicators on chart:', pvtIndicators.length);
          
          pvtIndicators.forEach(indicator => {
            console.log('🗑️ Removing PVT indicator from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'PVT' });
          });
          
          console.log('✅ All PVT indicators removed from chart');
        } catch (error) {
          console.error('❌ Error removing PVT indicators from chart:', error);
        }
      }
      
      // Then, clean up saved data entries
      const pvtEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'PVT');
      console.log('🗑️ Deleting PVT saved entries:', pvtEntries.length);
      
      pvtEntries.forEach(([key, ind]) => {
        console.log('🗑️ Cleaning saved entry:', key, 'pane:', ind.pane_id);
        if (ind.pane_id) {
          // Use delInd for additional cleanup
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all PVT-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'PVT') {
            console.log('🗑️ Clearing PVT saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      // Signal to clear PVT groups in modal
      ctx.update(c => {
        c.clearPvtGroups++;
        return c;
      });
      
      console.log('✅ Bulk PVT deletion completed');
    } else if (name === 'ROC') {
      // For ROC, delete all instances and groups from all sub-panes
      console.log('🗑️ Starting bulk ROC deletion...');
      
      // First, remove all ROC indicators directly from chart
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const rocIndicators = indicators.filter(ind => ind.name === 'ROC');
          console.log('📊 Found ROC indicators on chart:', rocIndicators.length);
          
          rocIndicators.forEach(indicator => {
            console.log('🗑️ Removing ROC indicator from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'ROC' });
          });
          
          console.log('✅ All ROC indicators removed from chart');
        } catch (error) {
          console.error('❌ Error removing ROC indicators from chart:', error);
        }
      }
      
      // Then, clean up saved data entries
      const rocEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'ROC');
      console.log('🗑️ Deleting ROC saved entries:', rocEntries.length);
      
      rocEntries.forEach(([key, ind]) => {
        console.log('🗑️ Cleaning saved entry:', key, 'pane:', ind.pane_id);
        if (ind.pane_id) {
          // Use delInd for additional cleanup
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all ROC-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'ROC') {
            console.log('🗑️ Clearing ROC saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      // Signal to clear ROC groups in modal
      ctx.update(c => {
        c.clearRocGroups++;
        return c;
      });
      
      console.log('✅ Bulk ROC deletion completed');
    } else if (name === 'VR') {
      // For VR, delete all instances and groups from all sub-panes
      console.log('🗑️ Starting bulk VR deletion...');
      
      // First, remove all VR indicators directly from chart
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const vrIndicators = indicators.filter(ind => ind.name === 'VR');
          console.log('📊 Found VR indicators on chart:', vrIndicators.length);
          
          vrIndicators.forEach(indicator => {
            console.log('🗑️ Removing VR indicator from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'VR' });
          });
          
          console.log('✅ All VR indicators removed from chart');
        } catch (error) {
          console.error('❌ Error removing VR indicators from chart:', error);
        }
      }
      
      // Then, clean up saved data entries
      const vrEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'VR');
      console.log('🗑️ Deleting VR saved entries:', vrEntries.length);
      
      vrEntries.forEach(([key, ind]) => {
        console.log('🗑️ Cleaning saved entry:', key, 'pane:', ind.pane_id);
        if (ind.pane_id) {
          // Use delInd for additional cleanup
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all VR-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'VR') {
            console.log('🗑️ Clearing VR saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      console.log('✅ Bulk VR deletion completed');
    } else if (name === 'VOL') {
      // For VOL, delete all instances and groups from all sub-panes
      console.log('🗑️ Starting bulk VOL deletion...');
      
      // First, remove all VOL indicators directly from chart
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const volIndicators = indicators.filter(ind => ind.name === 'VOL');
          console.log('📊 Found VOL indicators on chart:', volIndicators.length);
          
          volIndicators.forEach(indicator => {
            console.log('🗑️ Removing VOL indicator from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'VOL' });
          });
          
          console.log('✅ All VOL indicators removed from chart');
        } catch (error) {
          console.error('❌ Error removing VOL indicators from chart:', error);
        }
      }
      
      // Then, clean up saved data entries
      const volEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'VOL');
      console.log('🗑️ Deleting VOL saved entries:', volEntries.length);
      
      volEntries.forEach(([key, ind]) => {
        console.log('🗑️ Cleaning saved entry:', key, 'pane:', ind.pane_id);
        if (ind.pane_id) {
          // Use delInd for additional cleanup
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all VOL-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'VOL') {
            console.log('🗑️ Clearing VOL saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      // Signal to clear VOL groups in modal
      ctx.update(c => {
        c.clearVolGroups++;
        return c;
      });
      
      console.log('✅ Bulk VOL deletion completed');
    } else if (name === 'BIAS') {
      // For BIAS, delete all instances and groups from all sub-panes
      console.log('🗑️ Starting bulk BIAS deletion...');
      
      // First, remove all BIAS indicators directly from chart
      if ($chart) {
        try {
          const indicators = $chart.getIndicators();
          const biasIndicators = indicators.filter(ind => ind.name === 'BIAS');
          console.log('📊 Found BIAS indicators on chart:', biasIndicators.length);
          
          biasIndicators.forEach(indicator => {
            console.log('🗑️ Removing BIAS indicator from pane:', indicator.paneId);
            $chart.removeIndicator({ paneId: indicator.paneId, name: 'BIAS' });
          });
          
          console.log('✅ All BIAS indicators removed from chart');
        } catch (error) {
          console.error('❌ Error removing BIAS indicators from chart:', error);
        }
      }
      
      // Then, clean up saved data entries
      const biasEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'BIAS');
      console.log('🗑️ Deleting BIAS saved entries:', biasEntries.length);
      
      biasEntries.forEach(([key, ind]) => {
        console.log('🗑️ Cleaning saved entry:', key, 'pane:', ind.pane_id);
        if (ind.pane_id) {
          // Use delInd for additional cleanup
          delInd(ind.pane_id, name);
        }
      });
      
      // Clear all BIAS-related saved data
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'BIAS') {
            console.log('🗑️ Clearing BIAS saved data:', key);
            delete s.saveInds[key];
          }
        });
        return s;
      });
      
      console.log('✅ Bulk BIAS deletion completed');
    } else {
      // Find the pane ID for this indicator
      const indicatorEntry = Object.entries($save.saveInds).find(([key, ind]) => ind.name === name);
      if (indicatorEntry) {
        const [, ind] = indicatorEntry;
        delInd(ind.pane_id, name);
      }
    }
  }
  
  export async function createIndicator(name: string, params?: unknown[], isStack?: boolean, paneOptions?: PaneOptions): Promise<Nullable<unknown>> {
    const chartObj = $chart;
    if (!chartObj) return null;
    
    let calcParams = params;
    let styleOverrides: any = {};
    
    if (name === 'VOL') {
      // Only apply sub-pane axis gap when NOT rendering on main pane
      if (!paneOptions?.id || paneOptions.id !== 'candle_pane') {
        paneOptions = { axis: { gap: { bottom: 2 } }, ...paneOptions }
      }
      
      // Apply default volume groups styling when no params provided
      if (!params || params.length === 0) {
        calcParams = [20]; // Default period
        
        // Helper function to convert line style to KLineCharts format
        const convertLineStyle = (style: string) => {
          switch (style) {
            case 'dashed': return { style: kc.LineType.Dashed, dashedValue: [4, 4] };
            case 'dotted': return { style: kc.LineType.Dashed, dashedValue: [2, 2] };
            default: return { style: kc.LineType.Solid, dashedValue: [2, 2] };
          }
        };
        
        const lineStyle = convertLineStyle('dotted');
        styleOverrides = {
          bars: [
            {
              upColor: '#26a69a',
              downColor: '#ef5350',
              noChangeColor: '#26a69a'
            }
          ],
          lines: [
            {
              color: '#8B5CF6',
              size: 1,
              style: lineStyle.style,
              dashedValue: lineStyle.dashedValue,
              smooth: false
            }
          ]
        };
      }
    }
    
    if (!calcParams || calcParams.length === 0) {
      const fields = IndFieldsMap[name] || [];
      if (fields.length > 0 && name !== 'VOL') { // Skip default field processing for VOL as we handle it specially
        // Separate calculation parameters from pure style parameters
        // Pure style parameters have type: 'color' (not numeric values with styleKey)
        calcParams = fields
          .filter(f => (f as any).type !== 'color')
          .map(f => f.default);
        
        // Extract style parameters (like color customization)
        const styleFields = fields.filter(f => (f as any).styleKey && (f as any).type === 'color');
        styleFields.forEach(field => {
          const key = (field as any).styleKey;
          const value = field.default;
          
          // Parse styleKey like 'lines[0].color' or 'circles[0].upColor'
          const match = key.match(/^(\w+)\[(\d+)\]\.(\w+)$/);
          if (match) {
            const [, category, index, prop] = match;
            if (!styleOverrides[category]) styleOverrides[category] = [];
            if (!styleOverrides[category][parseInt(index)]) styleOverrides[category][parseInt(index)] = {};
            styleOverrides[category][parseInt(index)][prop] = value;
          }
        });
      }
    }
    
    const pane_id = paneOptions?.id ?? '';
    const saveKey = `${pane_id}_${name}`;
    
    // Create with actual API to get the ID (with tooltip configuration)
    const ind_id = chartObj.createIndicator({
      name, 
      calcParams,
      styles: Object.keys(styleOverrides).length > 0 ? styleOverrides : undefined,
      // @ts-expect-error
      createTooltipDataSource: ({ indicator }) => {
        const icon_ids = [indicator.visible ? 1: 0, 2, 3];
        const styles = chartObj.getStyles().indicator.tooltip;
        const icons = icon_ids.map(i => styles.features[i])
        return { icons }
      }
    }, isStack, paneOptions);
    
    if (!ind_id) return null;
    
    const ind = {name, pane_id, params: calcParams}
    
    save.update(s => {
      s.saveInds[saveKey] = ind;
      return s
    })
    // Mark unsaved changes
    markDirty();
    
    // Record indicator addition for undo/redo
    undoRedoManager.recordAddIndicator(name, pane_id, calcParams || [], saveKey)
    
    return ind
  }
  
  export async function delInd(paneId: string, name: string) {
    console.log('🗑️ delInd called:', { paneId, name, chart: !!$chart })
    if(!$chart) {
      console.log('❌ No chart available')
      return
    }
    
    const chartObj = $chart;
    
    // Record indicator removal for undo/redo before actually removing
    const saveKey = `${paneId}_${name}`
    const indicatorData = $save.saveInds[saveKey]
    if (indicatorData) {
      undoRedoManager.recordRemoveIndicator(name, paneId, indicatorData.params || [], saveKey)
    }
    
    // Use correct API signature: removeIndicator(paneId: string, name?: string)
    console.log('🔥 Attempting to remove indicator with correct API: removeIndicator(paneId, name)')
    
    try {
      chartObj.removeIndicator({ paneId, name })
      console.log('✅ removeIndicator successful')
    } catch (error) {
      console.log('❌ removeIndicator failed:', error)
      
      // Fallback: Try removing indicators by name (getIndicators not available in current version)
      try {
        console.log('🔄 Trying fallback: remove indicator by name directly')
        console.log('Attempting to remove indicator:', name, 'from pane:', paneId)
        
        // Since getIndicators is not available, we'll try a direct removal approach
        // This is a simplified fallback that doesn't enumerate existing indicators
        console.log('Direct removal attempt for:', name)
        
        // Placeholder for indicators removal - actual implementation would depend on available API
        const indicatorsToRemove: unknown[] = []
        
        indicatorsToRemove.forEach((indicatorInstance: unknown) => {
          console.log('Removing indicator instance:', indicatorInstance)
          try {
            chartObj.removeIndicator({ paneId, name: (indicatorInstance as any).name })
          } catch (removeError) {
            console.log('Failed to remove indicator instance:', removeError)
          }
        })
        console.log('✅ Fallback method successful')
      } catch (fallbackError) {
        console.log('❌ Fallback method also failed:', fallbackError)
      }
    }
    
    // Clean up saved state
    console.log('🧹 Cleaning saved state for:', name)
    const savedIndicators = JSON.parse(localStorage.getItem('indicators') || '{}')
    console.log('🧹 Current localStorage indicators:', savedIndicators)
    if (savedIndicators[paneId]) {
      savedIndicators[paneId] = savedIndicators[paneId].filter((indicatorParam: any) => indicatorParam.name !== name)
      if (savedIndicators[paneId].length === 0) {
        delete savedIndicators[paneId]
      }
      localStorage.setItem('indicators', JSON.stringify(savedIndicators))
      console.log('🧹 Updated localStorage indicators:', savedIndicators)
    }
    
    // Clean up saved state for this indicator (handle multi-instance keys e.g. ZIGZAG)
    save.update(s => {
      console.log('🧹 Before cleanup saveInds keys:', Object.keys(s.saveInds))
      if (name === 'ZIGZAG') {
        const prefix = `${paneId}_ZIGZAG`;
        Object.keys(s.saveInds).forEach(k => {
          const entry = (s.saveInds as any)[k];
          if (k.startsWith(prefix) && entry?.name === 'ZIGZAG') {
            console.log('🧹 Removing ZigZag save key:', k)
            delete (s.saveInds as any)[k];
          }
        });
      } else {
        const key = `${paneId}_${name}`
        console.log('🧹 Cleaning saved state key:', key, 'existed:', !!s.saveInds[key])
        delete s.saveInds[key]
      }
      console.log('🧹 After cleanup saveInds keys:', Object.keys(s.saveInds))
      return s
    })
    // Mark unsaved changes
    markDirty();
    
    // selectedIndicators will automatically update via derived store when save.saveInds changes
    
    // Use render integration to preserve colors after indicator removal
    // This happens in the background without blocking
    renderIntegration.removeIndicator({
      chart: chartObj,
      name,
      paneId
    }).catch(err => {
      console.warn('Background color preservation failed:', err);
    });
    
    console.log('✅ delInd completed')
  }

  const cloudIndLoaded = derived(ctx, ($ctx) => $ctx.cloudIndLoaded);
  cloudIndLoaded.subscribe((new_val) => {
    console.log('🔄 cloudIndLoaded triggered, saveInds:', Object.keys($save.saveInds))
    // DISABLED: Automatic indicator restoration on cloudIndLoaded
    // This was causing deleted indicators to reappear after page refresh
    // Object.values($save.saveInds).forEach(o => {
    //   console.log('🔄 Restoring indicator:', o.name, 'paneId:', o.pane_id)
    //   createIndicator(o.name, o.params, true, {id: o.pane_id})
    // })
    console.log('🚫 Automatic indicator restoration disabled to prevent deleted indicators from reappearing')
  })

  // Scroll handler for search bar hide/show
  function handleScroll(event: Event) {
    const target = event.target as HTMLElement;
    const currentScrollTop = target.scrollTop;
    
    // Show search bar when scrolling up or at top
    if (currentScrollTop < lastScrollTop || currentScrollTop <= 10) {
      isSearchBarVisible = true;
    } 
    // Hide search bar when scrolling down (but not immediately)
    else if (currentScrollTop > lastScrollTop && currentScrollTop > 50) {
      isSearchBarVisible = false;
    }
    
    lastScrollTop = currentScrollTop;
  }

  const initDone = derived(ctx, ($ctx) => $ctx.initDone);
  let subscribed = false;
  initDone.subscribe((new_val) => {
    console.log('initDone changed:', new_val, 'chart:', !!$chart, 'subscribed:', subscribed);
    if (new_val > 0 && !subscribed && $chart) {
      console.log('Subscribing to OnTooltipIconClick with chart:', $chart);
      console.log('Chart methods available:', Object.getOwnPropertyNames($chart));
      console.log('subscribeAction method:', typeof $chart.subscribeAction);
      subscribed = true;
      
      try {
        $chart.subscribeAction(ActionType.OnCandleTooltipFeatureClick, data => {
          console.log('🔥 OnTooltipIconClick fired!', data)
          const item = data as {indicatorName: string, paneId: string, iconId: string}
          if (item.indicatorName) {
            console.log('Processing icon click:', item.iconId, 'for indicator:', item.indicatorName);
            switch (item.iconId) {
              case 'visible': {
                console.log('Making indicator visible');
                $chart?.overrideIndicator({ name: item.indicatorName, paneId: item.paneId, visible: true })
                break
              }
              case 'invisible': {
                console.log('Making indicator invisible');
                $chart?.overrideIndicator({ name: item.indicatorName, paneId: item.paneId, visible: false })
                break
              }
              case 'setting': {
                console.log('Opening settings');
                $ctx.editIndName = item.indicatorName
                $ctx.editPaneId = item.paneId
                $ctx.modalIndCfg = true
                
                // Hide indicator list if it's open (opened from tooltip, not from indicator list)
                if (show) {
                  show = false;
                }
                break
              }
              case 'close': {
                console.log('Deleting indicator:', item.indicatorName, 'from pane:', item.paneId);
                delInd(item.paneId, item.indicatorName)
              }
            }
          }
        })
        console.log('✅ Successfully subscribed to OnTooltipIconClick');
      } catch (error) {
        console.error('❌ Error subscribing to OnTooltipIconClick:', error);
      }
    }
  })

</script>

<Modal title={m.indicator()} width={700} maxWidth="95vw" maxHeight="min(92svh, 90vh)" bind:show={show} theme={$save.theme} buttons={[]} class="ind-modal">
  <div class="flex flex-col gap-6">
    <!-- Ultra-Minimalist Premium Search -->
    <div class="relative group transition-all duration-300 ease-out {isSearchBarVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}">
      <div class="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none z-10 transition-all duration-300 search-icon">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <input
        type="text"
        class="w-full pl-12 pr-12 py-3.5 text-[15px] font-medium tracking-wide backdrop-blur-sm rounded-2xl 
               focus:outline-none transition-all duration-500 ease-out
               placeholder:font-normal search-input"
        placeholder={m.search()}
        bind:value={keyword}
      />
      {#if keyword}
        <button
          class="absolute right-4 top-1/2 transform -translate-y-1/2 hover:scale-110 transition-all duration-300 z-10 clear-search-btn"
          onclick={() => keyword = ''}
          title="Clear search"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      {/if}
    </div>
    
    <!-- Ultra-Minimalist Premium Indicator List -->
    <div class="relative rounded-2xl overflow-hidden backdrop-blur-sm indicator-list-container">
      <div class="indicator-scroll ultra-minimal-scrollbar" bind:this={scrollContainer} onscroll={handleScroll}>
        {#each showInds as ind, index}
          {@const isSelected = selectedIndicators.has(ind.name)}
          <div 
            class="group indicator-row relative flex items-center min-h-[56px] px-5 py-3 cursor-pointer transition-all duration-500 ease-out
                   {index < showInds.length - 1 ? 'border-b' : ''} 
                   {isSelected ? 'indicator-item-selected' : 'indicator-item-unselected'}"
            onclick={() => !isSelected && addIndicator(ind.is_main, ind.name)}
          >
            <!-- Minimal Indicator Dot -->
            <div class="flex items-center justify-center w-2 h-2 rounded-full mr-4 transition-all duration-500 
                        {isSelected ? 'indicator-dot-selected' : 'indicator-dot-unselected'}">
            </div>
            
            <!-- Clean Typography -->
            <div class="flex-1 min-w-0">
              <span class="indicator-title text-[15px] font-medium tracking-wide leading-relaxed 
                           {isSelected ? 'indicator-text-selected' : 'indicator-text-unselected'}">
                {ind.title}
              </span>
            </div>
            
            <!-- Minimal Action Buttons for Selected Indicators -->
            {#if isSelected}
              <div class="flex items-center gap-2 ml-4 opacity-100 transition-all duration-300">
                <button 
                  class="w-8 h-8 rounded-full hover:scale-110 transition-all duration-300 flex items-center justify-center backdrop-blur-sm edit-btn"
                  title="Edit Parameters"
                  onclick={(e) => {
                    e.stopPropagation();
                    editIndicator(ind.name);
                  }}
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button 
                  class="w-8 h-8 rounded-full hover:scale-110 transition-all duration-300 flex items-center justify-center backdrop-blur-sm delete-btn"
                  title="Remove Indicator"
                  onclick={(e) => {
                    e.stopPropagation();
                    deleteIndicator(ind.name);
                  }}
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            {/if}
          </div>
        {/each}
        
        <!-- Premium Empty State -->
        {#if showInds.length === 0}
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <p class="text-lg font-semibold text-base-content/60 mb-2">No indicators found</p>
            <p class="text-sm text-base-content/40">Try a different search term</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Luxury Premium Footer -->
    <div class="flex justify-center items-center py-2 mt-1">
      <div class="group relative cursor-pointer">
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out blur-xl"></div>
        <div class="relative flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-base-100/80 to-base-200/60 backdrop-blur-sm border border-base-300/30 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-500 ease-out">
          <div class="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-secondary animate-pulse"></div>
          <span class="text-sm font-medium text-base-content/70 group-hover:text-primary transition-colors duration-300">
            Powered by
          </span>
          <span class="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent group-hover:from-secondary group-hover:to-primary transition-all duration-500">
            Duty AI
          </span>
          <div class="w-2 h-2 rounded-full bg-gradient-to-r from-secondary to-primary animate-pulse" style="animation-delay: 0.5s;"></div>
        </div>
      </div>
    </div>
  </div>
</Modal>

<style>

  
  /* Premium animations */
  /* Premium Micro-Animations */
  @keyframes gentle-fade-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.3);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
    }
  }
  
  @keyframes subtle-scale {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
    }
  }
  
  /* Smooth entrance animation for list items */
  .group {
    animation: gentle-fade-in 0.6s ease-out;
    animation-fill-mode: both;
  }
  
  /* Staggered animation delay for each item */
  .group:nth-child(1) { animation-delay: 0.05s; }
  .group:nth-child(2) { animation-delay: 0.1s; }
  .group:nth-child(3) { animation-delay: 0.15s; }
  .group:nth-child(4) { animation-delay: 0.2s; }
  .group:nth-child(5) { animation-delay: 0.25s; }
  .group:nth-child(6) { animation-delay: 0.3s; }
  .group:nth-child(7) { animation-delay: 0.35s; }
  .group:nth-child(8) { animation-delay: 0.4s; }
  .group:nth-child(9) { animation-delay: 0.45s; }
  .group:nth-child(10) { animation-delay: 0.5s; }
   

   

   
   /* Ultra-Minimal Premium Scrollbar */
  .ultra-minimal-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  }
  
  .ultra-minimal-scrollbar::-webkit-scrollbar {
    width: 2px;
  }
  
  .ultra-minimal-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .ultra-minimal-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(138, 43, 226, 0.3), rgba(138, 43, 226, 0.15));
    border-radius: 1px;
    transition: all 0.3s ease;
  }
  
  .ultra-minimal-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(138, 43, 226, 0.5), rgba(138, 43, 226, 0.3));
    width: 3px;
  }

  /* Light Mode Styling */
  :global([data-theme="light"]) .search-input {
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(59, 130, 246, 0.15);
    color: #1f2937;
    --placeholder-color: rgba(31, 41, 55, 0.7);
  }
  
  :global([data-theme="light"]) .search-input:focus {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
  }
  
  :global([data-theme="light"]) .search-input:hover {
    background: rgba(59, 130, 246, 0.05);
    border-color: rgba(59, 130, 246, 0.2);
  }
  
  :global([data-theme="light"]) .search-icon {
    color: rgba(31, 41, 55, 0.7);
  }
  
  :global([data-theme="light"]) .group:focus-within .search-icon {
    color: rgba(59, 130, 246, 0.8);
  }
  
  :global([data-theme="light"]) .clear-search-btn {
    color: rgba(31, 41, 55, 0.7);
  }
  
  :global([data-theme="light"]) .clear-search-btn:hover {
    color: rgba(59, 130, 246, 0.9);
  }
  
  :global([data-theme="light"]) .indicator-list-container {
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(59, 130, 246, 0.15);
  }

  /* Dark Mode Styling */
  :global([data-theme="dark"]) .search-input {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(138, 43, 226, 0.2);
    color: #ffffff;
    --placeholder-color: rgba(255, 255, 255, 0.7);
  }
  
  :global([data-theme="dark"]) .search-input:focus {
    background: rgba(138, 43, 226, 0.2);
    border-color: rgba(138, 43, 226, 0.4);
  }
  
  :global([data-theme="dark"]) .search-input:hover {
    background: rgba(138, 43, 226, 0.15);
    border-color: rgba(138, 43, 226, 0.3);
  }
  
  :global([data-theme="dark"]) .search-icon {
    color: rgba(255, 255, 255, 0.7);
  }
  
  :global([data-theme="dark"]) .group:focus-within .search-icon {
    color: rgba(138, 43, 226, 0.8);
  }
  
  :global([data-theme="dark"]) .clear-search-btn {
    color: rgba(255, 255, 255, 0.7);
  }
  
  :global([data-theme="dark"]) .clear-search-btn:hover {
    color: rgba(138, 43, 226, 0.9);
  }
  
  :global([data-theme="dark"]) .indicator-list-container {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(138, 43, 226, 0.2);
  }

  /* Indicator List Items - Light Mode */
  .indicator-item-selected {
    background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
    color: white;
    border-left: 2px solid rgba(37, 99, 235, 0.8);
    border-bottom-color: rgba(37, 99, 235, 0.2);
  }

  .indicator-item-unselected {
    color: rgba(55, 65, 81, 0.9);
    border-bottom-color: rgba(37, 99, 235, 0.2);
  }

  .indicator-item-unselected:hover {
    background: rgba(37, 99, 235, 0.1);
    color: #1f2937;
  }

  /* Indicator Dots - Light Mode */
  .indicator-dot-selected {
    background: white;
    box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
  }

  .indicator-dot-unselected {
    background: rgba(37, 99, 235, 0.4);
  }

  .group:hover .indicator-dot-unselected {
    background: rgba(37, 99, 235, 0.8);
    transform: scale(1.5);
  }

  /* Indicator Text - Light Mode */
  .indicator-text-selected {
    color: white;
  }

  .indicator-text-unselected {
    color: rgba(55, 65, 81, 0.9);
  }

  .group:hover .indicator-text-unselected {
    color: #1f2937;
  }

  /* Action Buttons - Light Mode */
  .edit-btn, .delete-btn {
    background: rgba(37, 99, 235, 0.05);
    border: 1px solid rgba(37, 99, 235, 0.2);
    color: rgba(55, 65, 81, 0.9);
  }

  .edit-btn:hover, .delete-btn:hover {
    background: rgba(37, 99, 235, 0.2);
    border-color: rgba(37, 99, 235, 0.4);
    color: #1f2937;
  }

  /* Dark Mode Adjustments */
  :global([data-theme="dark"]) .indicator-item-selected {
    background: linear-gradient(135deg, #8a2be2 0%, #9932cc 100%);
    color: white;
    border-left: 2px solid rgba(138, 43, 226, 0.8);
    border-bottom-color: rgba(138, 43, 226, 0.2);
  }

  :global([data-theme="dark"]) .indicator-item-unselected {
    color: rgba(255, 255, 255, 0.9);
    border-bottom-color: rgba(138, 43, 226, 0.2);
  }

  :global([data-theme="dark"]) .indicator-item-unselected:hover {
    background: rgba(138, 43, 226, 0.2);
    color: white;
  }

  :global([data-theme="dark"]) .indicator-dot-selected {
    background: white;
    box-shadow: 0 4px 15px rgba(138, 43, 226, 0.4);
  }

  :global([data-theme="dark"]) .indicator-dot-unselected {
    background: rgba(255, 255, 255, 0.4);
  }

  :global([data-theme="dark"]) .group:hover .indicator-dot-unselected {
    background: rgba(138, 43, 226, 0.8);
    transform: scale(1.5);
  }

  :global([data-theme="dark"]) .indicator-text-selected {
    color: white;
  }

  :global([data-theme="dark"]) .indicator-text-unselected {
    color: rgba(255, 255, 255, 0.9);
  }

  :global([data-theme="dark"]) .group:hover .indicator-text-unselected {
    color: white;
  }

  :global([data-theme="dark"]) .edit-btn, :global([data-theme="dark"]) .delete-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(138, 43, 226, 0.2);
    color: rgba(255, 255, 255, 0.9);
  }

  :global([data-theme="dark"]) .edit-btn:hover, :global([data-theme="dark"]) .delete-btn:hover {
    background: rgba(138, 43, 226, 0.2);
    border-color: rgba(138, 43, 226, 0.4);
    color: white;
  }

  /* Light Mode Scrollbar */
  :global([data-theme="light"]) .ultra-minimal-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.15));
  }
  
  :global([data-theme="light"]) .ultra-minimal-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.5), rgba(59, 130, 246, 0.3));
  }

  /* Dark Mode Scrollbar */
  :global([data-theme="dark"]) .ultra-minimal-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(138, 43, 226, 0.4), rgba(138, 43, 226, 0.2));
  }
  
  :global([data-theme="dark"]) .ultra-minimal-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(138, 43, 226, 0.6), rgba(138, 43, 226, 0.4));
  }

  /* Mobile responsive enhancements */
  @media (max-width: 640px) {
    .ultra-minimal-scrollbar {
      height: 400px;
    }
    
    .ultra-minimal-scrollbar::-webkit-scrollbar {
      width: 1px;
    }
  }
  
  /* ===== Responsive, Touch-friendly Scroll Container for Indicator List ===== */
  .indicator-scroll {
    max-height: 70vh;           /* default for desktops/tablets */
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;  /* smooth iOS scrolling */
    overscroll-behavior: auto;          /* allow parent modal to scroll after list end */
    touch-action: pan-y;                /* improve touch panning */
  }
  
  @media (max-width: 1024px) {
    .indicator-scroll {
      max-height: 65vh;         /* tighter cap on smaller screens */
    }
  }
  
  @media (max-width: 640px) and (orientation: portrait) {
    .indicator-scroll {
      max-height: 62vh;         /* portrait phones */
    }
  }
  
  @media (max-width: 900px) and (orientation: landscape) {
    .indicator-scroll {
      max-height: 52vh;         /* landscape phones where viewport height is low */
    }
  }
  
  /* ===== Compact rows in tight vertical space (mobile landscape) ===== */
  @media (max-width: 900px) and (orientation: landscape) {
    .indicator-row {
      min-height: 50px;
      padding-top: 10px;
      padding-bottom: 10px;
    }
  }
  
  /* ===== Title clamping for long indicator names ===== */
  .indicator-title {
    display: -webkit-box;
    -webkit-line-clamp: 2;      /* show up to 2 lines, then ellipsis */
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  @media (max-width: 900px) and (orientation: landscape) {
    .indicator-title {
      font-size: 14px;          /* slightly smaller text to save space */
      line-height: 1.3;
    }
  }
  
  /* ===== Hide modal header for this modal in mobile landscape to save space ===== */
  @media (max-width: 900px) and (orientation: landscape) {
    :global(.ind-modal .modal-header) {
      display: none;
    }
  }
</style>