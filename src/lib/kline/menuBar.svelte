<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { Chart, Nullable } from 'klinecharts';
  import KlineIcon from './icon.svelte';
  import { browser } from '$app/environment';
  import type {Writable} from 'svelte/store';
  import {ChartSave, ChartCtx} from './chart';
  import {GetNumberDotOffset, makePeriod, getThemeStyles, processLineChartStyles} from './coms';

  import {secs_to_tf} from '../dateutil';
  import _ from 'lodash';
  import { derived } from 'svelte/store';
  import * as m from '$lib/paraglide/messages.js';
  // @ts-ignore
  import Papa from 'papaparse';
  import ModalSymbol from './modalSymbol.svelte';
import ModalPeriod from './modalPeriod.svelte';
import ModalIndSearch from './modalIndSearch.svelte';
import ModalIndCfg from './modalIndCfg.svelte';
import ModalSetting from './modalSetting.svelte';
import ModalChartSetting from './modalChartSetting.svelte';
import ModalScreenShot from './modalScreenShot.svelte';
import ModalTimezone from './modalTimezone.svelte';
import ModalChartType from './modalChartType.svelte';
  import { undoRedoManager } from './undoRedoManager';
  import { Search } from 'lucide-svelte';
  import { TransactionalThemeManager } from '$lib/stores/themeManager.js';
  import SaveButton from './saveSystem/SaveButton.svelte';
  import SaveModal from './saveSystem/SaveModal.svelte';
  import ChartSavePopup from './saveSystem/ChartSavePopup.svelte';
  // Props
  let {customLoad = false, mainContainer = $bindable(), sidebarHost = $bindable()} = $props();

  // Context
  const chart = getContext('chart') as Writable<Nullable<Chart>>;
  const ctx = getContext('ctx') as Writable<ChartCtx>;
  const save = getContext('save') as Writable<ChartSave>;

  function isFullscreen() {
    if(!browser)return false;
    let doc = (document as any)
    let fullscreenElement =
        doc.fullscreenElement ||
        doc.mozFullScreenElement ||
        doc.webkitFullscreenElement ||
        doc.msFullscreenElement;

    return fullscreenElement != undefined;
  }

  // State
  let fullScreen = $state(isFullscreen());
  
  // Listen for fullscreen changes (ESC key, etc.)
  if (browser) {
    const handleFullscreenChange = () => {
      const wasFullscreen = fullScreen;
      fullScreen = isFullscreen();
      
      // If exiting fullscreen, add multiple resize attempts with increasing delays
      if (wasFullscreen && !fullScreen) {
        // Immediate style reset
        if (mainContainer) {
          mainContainer.style.cssText = '';
          mainContainer.classList.remove('fullscreen');
        }
        
        // Force layout recalculation and reset styles
        setTimeout(() => {
          if (mainContainer) {
            // Force reflow by reading layout properties
            mainContainer.offsetHeight;
            mainContainer.offsetWidth;
            // Trigger a style recalculation
            window.getComputedStyle(mainContainer).height;
          }
          $chart?.resize();
        }, 10);
        
        setTimeout(() => {
          $chart?.resize();
        }, 100);
        
        setTimeout(() => {
          $chart?.resize();
        }, 300);
        
        setTimeout(() => {
          $chart?.resize();
        }, 600);
        
        // Final resize after a longer delay
        setTimeout(() => {
          $chart?.resize();
        }, 1200);
      } else {
        // Normal resize for entering fullscreen
        setTimeout(() => {
          $chart?.resize();
        }, 100);
      }
    };

    // iOS-specific fullscreen change handler
    const handleIOSFullscreenChange = () => {
      console.log('📱 handleIOSFullscreenChange triggered');
      if (isIOSSafari()) {
        // For iOS, we need to check viewport changes and orientation changes
        const heightMatch = window.innerHeight === screen.height;
        const hasIOSClass = document.body.classList.contains('ios-fullscreen');
        const isStandalone = (window.navigator as any).standalone;
        
        console.log('🔍 iOS fullscreen checks:', {
          heightMatch,
          hasIOSClass,
          isStandalone,
          windowHeight: window.innerHeight,
          screenHeight: screen.height,
          currentFullScreen: fullScreen
        });
        
        const isIOSFullscreen = heightMatch || hasIOSClass || isStandalone;
        
        if (fullScreen !== isIOSFullscreen) {
          console.log(`🔄 iOS fullscreen state changed: ${fullScreen} → ${isIOSFullscreen}`);
          fullScreen = isIOSFullscreen;
          
          // Trigger resize after fullscreen state change
          console.log('📏 Scheduling iOS chart resizes...');
          setTimeout(() => {
            $chart?.resize();
          }, 100);
          
          setTimeout(() => {
            $chart?.resize();
          }, 300);
        } else {
          console.log('✅ No iOS fullscreen state change needed');
        }
      } else {
        console.log('❌ Not iOS Safari, skipping handler');
      }
    };
    
    // Standard fullscreen event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // iOS-specific event listeners
    if (isIOSSafari()) {
      // Listen for viewport changes on iOS
      window.addEventListener('resize', handleIOSFullscreenChange);
      window.addEventListener('orientationchange', handleIOSFullscreenChange);
      
      // Listen for iOS Safari specific events
      document.addEventListener('webkitfullscreenchange', handleIOSFullscreenChange);
      
      // Check for standalone mode changes (PWA)
      if ('standalone' in window.navigator) {
        window.addEventListener('beforeunload', () => {
          if (iosFullscreenCleanup) {
            iosFullscreenCleanup();
          }
        });
      }
    }
  }
  let showSymbolModal = $state(false);
let showPeriodModal = $state(false);
let showIndSearchModal = $state(false);
let showSettingModal = $state(false);
let showChartSettingModal = $state(false);
let showScreenShotModal = $state(false);
let showTimezoneModal = $state(false);
  let screenShotUrl = $state('');
  let showName = $state('');
  let isRotated = $state(false);
  
  // Save system state
  let showSaveModal = $state(false);
  let showChartSavePopup = $state(false);
  let chartSavePopupPosition = $state({ x: 0, y: 0 });
  let savedLayouts = $state([]);
  let activeSaveId = $state(null);
  let isLoading = $state(false);
  let hasUnsavedChanges = $state(false);

  // iOS fullscreen cleanup function
  let iosFullscreenCleanup: (() => void) | null = $state(null);
  
  // Visual debugging for iOS (when console is not accessible)
  let debugLogs: string[] = $state([]);
  let showDebugOverlay = $state(false);
  
  // Visual debug function for iOS
  function debugLog(message: string) {
    console.log(message); // Still log to console if available
    debugLogs = [...debugLogs.slice(-20), `${new Date().toLocaleTimeString()}: ${message}`]; // Keep last 20 logs
  }

  let fileRef = $state<HTMLInputElement>()
  let periodBarRef: HTMLElement

  const shortTermPeriods = [
    { timeframe: '1m', multiplier: 1, timespan: 'minute', secs: 60 },
    { timeframe: '5m', multiplier: 5, timespan: 'minute', secs: 300 },
    { timeframe: '15m', multiplier: 15, timespan: 'minute', secs: 900 },
    { timeframe: '30m', multiplier: 30, timespan: 'minute', secs: 1800 },
    { timeframe: '1h', multiplier: 1, timespan: 'hour', secs: 3600 },
  ];

  const longTermPeriods = [
    { timeframe: '1d', multiplier: 1, timespan: 'day', secs: 86400 },
    { timeframe: '1w', multiplier: 1, timespan: 'week', secs: 604800 },
    { timeframe: '1M', multiplier: 1, timespan: 'month', secs: 2592000 },
  ];

  const hourlyPeriods = [
    { timeframe: '4h', multiplier: 4, timespan: 'hour', secs: 14400 },
  ];

  // Chart type options
  const chartTypes = [
    { id: 'candle_solid', name: 'Candlestick', icon: 'candle_solid' },
    { id: 'candle_stroke', name: 'Hollow', icon: 'candle_stroke' },
    { id: 'candle_up_stroke', name: 'Up Hollow', icon: 'candle_up_stroke' },
    { id: 'candle_down_stroke', name: 'Down Hollow', icon: 'candle_down_stroke' },
    { id: 'heikin_ashi', name: 'Heikin Ashi', icon: 'candle_solid' },
    { id: 'ohlc', name: 'OHLC', icon: 'ohlc' },
    { id: 'area', name: 'Area', icon: 'area' },
    { id: 'line_chart', name: 'Line', icon: 'line' }
  ];

  let showChartTypeModal = $state(false);

  // Undo/Redo state
  let canUndo = $state(false);
  let canRedo = $state(false);

  // Sync with SaveManager state
  $effect(() => {
    let unsubscribe: (() => void) | null = null;
    let checkInterval: NodeJS.Timeout | null = null;
    
    function tryConnectToSaveManager() {
      if (typeof window !== 'undefined' && (window as any).saveManager) {
        const saveManager = (window as any).saveManager;
        
        // Check if SaveManager is initialized by subscribing to its state
        unsubscribe = saveManager.state.subscribe((state: any) => {
          console.log('📊 SaveManager state updated:', state);
          
          if (state.initialized) {
            console.log('🔗 SaveManager is initialized, updating UI state...');
            savedLayouts = state.savedLayouts;
            activeSaveId = state.activeSaveId;
            isLoading = state.isLoading;
            // hasUnsavedChanges would be managed separately based on chart changes
            
            // Clear the check interval once connected and initialized
            if (checkInterval) {
              clearInterval(checkInterval);
              checkInterval = null;
            }
          } else {
            console.log('⏳ SaveManager exists but not yet initialized...');
          }
        });
        
        return true;
      }
      return false;
    }
    
    // Try to connect immediately
    if (!tryConnectToSaveManager()) {
      // If not available, check every 100ms until it becomes available
      console.log('⏳ Waiting for SaveManager to be available...');
      checkInterval = setInterval(() => {
        tryConnectToSaveManager();
      }, 100);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  });

  // Handle orientation change
  function handleOrientationChange() {
    if ($chart) {
      setTimeout(() => {
        $chart.resize();
      }, 300);
    }
  }

  // Initialize undo/redo manager and update state
  onMount(() => {
    undoRedoManager.init({ 
      chart: $chart, 
      saveStore: save, 
      overlaysStore: null // menuBar doesn't have access to overlays store
    });
    
    // Update undo/redo state
    const updateUndoRedoState = () => {
      canUndo = undoRedoManager.canUndo();
      canRedo = undoRedoManager.canRedo();
    };
    
    // Initial state update
    updateUndoRedoState();
    
    // Listen for state changes
    const interval = setInterval(updateUndoRedoState, 100);
    
    // Listen for orientation changes
    if (browser) {
      if ('screen' in window && 'orientation' in window.screen) {
        window.screen.orientation.addEventListener('change', handleOrientationChange);
      } else {
        window.addEventListener('orientationchange', handleOrientationChange);
      }
    }
    
    return () => {
      clearInterval(interval);
      
      if (browser) {
        // Remove orientation change listeners
        if ('screen' in window && 'orientation' in window.screen) {
          window.screen.orientation.removeEventListener('change', handleOrientationChange);
        } else {
          window.removeEventListener('orientationchange', handleOrientationChange);
        }
      }
    };
  });

  // Undo/Redo functions
  function handleUndo() {
    if (canUndo) {
      undoRedoManager.undo();
    }
  }

  function handleRedo() {
    if (canRedo) {
      undoRedoManager.redo();
    }
  }

  function handlePeriodClick(period: any) {
    $save.period = period;
  }

  function handleChartTypeClick(chartType: any) {
    // Update chart type in styles
    if (!$save.styles.candle) {
      $save.styles.candle = {};
    }
    
    // Special handling for line_chart type (same as modalChartType.svelte)
    const typeId = chartType.key || chartType.id;
    
    if (typeId === 'line_chart') {
      console.log('🎯 Setting up LINE CHART from menuBar');
      $save.styles.candle.type = 'area';
      
      // Get line color
      const lineColor = $save.styles.candle?.bar?.upColor || '#2196F3';
      
      // Configure area to display as pure line
      $save.styles.candle.area = {
        lineSize: 2,
        lineColor: lineColor,
        lineSmooth: false,
        value: 'close',
        backgroundColor: [
          { offset: 0, color: 'rgba(0, 0, 0, 0)' },
          { offset: 1, color: 'rgba(0, 0, 0, 0)' }
        ]
      };
      
      // Mark this as a line chart
      $save.styles.candle._isLineChart = true;
    } else if (typeId === 'area') {
      console.log('🎯 Setting up AREA CHART from menuBar');
      $save.styles.candle.type = 'area';
      
      // Remove line chart marker
      delete $save.styles.candle._isLineChart;
      
      // Get line color for gradient
      const lineColor = $save.styles.candle?.bar?.upColor || '#2196F3';
      
      // Configure area with gradient background
      $save.styles.candle.area = {
        lineSize: 2,
        lineColor: lineColor,
        lineSmooth: false,
        value: 'close',
        backgroundColor: [
          { offset: 0, color: lineColor + '60' }, // 60 = ~38% opacity
          { offset: 1, color: lineColor + '10' }  // 10 = ~6% opacity
        ]
      };
      console.log('✅ Area chart configured with gradient from menuBar');
    } else {
      $save.styles.candle.type = typeId;
      // Remove line chart marker
      delete $save.styles.candle._isLineChart;
      // Clear area config if not area or line_chart type
      delete $save.styles.candle.area;
    }
    
    // Apply the new styles to the chart
    const styles = getThemeStyles($save.theme);
    _.merge(styles, $save.styles);
    $chart?.setStyles(styles);
    
    showChartTypeModal = false;
  }

  function getCurrentChartType() {
    // Check if this is a line chart (marked with _isLineChart flag)
    if ($save.styles?.candle?._isLineChart) {
      return chartTypes.find(type => type.id === 'line_chart') || chartTypes[0];
    }
    const currentType = $save.styles?.candle?.type || 'candle_solid';
    const chartType = chartTypes.find(type => type.id === currentType);
    return chartType || chartTypes[0];
  }

  const ticker = derived(save, ($save) => $save.symbol.ticker);
  const shortName = derived(save, ($save) => $save.symbol.shortName);
  
  // Always use shortName if available, otherwise fallback to ticker
  ticker.subscribe(() => {
    showName = $save.symbol.shortName || $save.symbol.ticker;
  })
  shortName.subscribe(() => {
    showName = $save.symbol.shortName || $save.symbol.ticker;
  })

  function toggleTheme() {
    const newTheme = $save.theme === 'dark' ? 'light' : 'dark';
    
    // CRITICAL: Clear custom background and grid colors from localStorage
    // This ensures theme colors take precedence over any saved custom colors
    try {
      const savedChart = localStorage.getItem('chart');
      if (savedChart) {
        const chartData = JSON.parse(savedChart);
        if (chartData.styles) {
          // Clear custom background colors
          delete chartData.styles.backgroundColor;
          delete chartData.styles.backgroundOpacity;
          delete chartData.styles.backgroundType;
          delete chartData.styles.backgroundGradient;
          
          // Clear custom grid colors
          if (chartData.styles.grid) {
            delete chartData.styles.grid.horizontal;
            delete chartData.styles.grid.vertical;
          }
          delete chartData.styles.gridColor;
          delete chartData.styles.gridOpacity;
          delete chartData.styles.gridType;
          delete chartData.styles.gridGradient;
          
          // Save back to localStorage
          localStorage.setItem('chart', JSON.stringify(chartData));
          console.log('🧹 Cleared custom background and grid colors from localStorage');
        }
      }
    } catch (error) {
      console.error('Failed to clear custom colors from localStorage:', error);
    }
    
    // Apply theme immediately for real-time preview
    if ($chart) {
      const themeStyles = getThemeStyles(newTheme);
      const currentSavedStyles = JSON.parse(JSON.stringify($save.styles || {}));
      
      // Reset background and grid colors to theme defaults
      // This ensures user's custom colors are overridden with theme colors
      // Type assertion for themeStyles to fix TypeScript errors
      const typedThemeStyles = themeStyles as {
        pane: { backgroundColor: string };
        candle: { pane: { backgroundColor: string } };
        grid: { horizontal: { color: string }; vertical: { color: string } };
      };
      
      const resetStyles = {
        ...currentSavedStyles,
        pane: {
          ...currentSavedStyles.pane,
          backgroundColor: typedThemeStyles.pane.backgroundColor
        },
        candle: {
          ...currentSavedStyles.candle,
          pane: {
            ...currentSavedStyles.candle?.pane,
            backgroundColor: typedThemeStyles.candle.pane.backgroundColor
          }
        },
        grid: {
          ...currentSavedStyles.grid,
          horizontal: {
            ...currentSavedStyles.grid?.horizontal,
            color: typedThemeStyles.grid.horizontal.color
          },
          vertical: {
            ...currentSavedStyles.grid?.vertical,
            color: typedThemeStyles.grid.vertical.color
          }
        }
      };
      
      // Preserve chart type and other custom settings
      const preservedChartType = currentSavedStyles?.candle?.type;
      const mergedStyles = _.merge({}, themeStyles, resetStyles);
      
      if (preservedChartType && mergedStyles.candle) {
        mergedStyles.candle.type = preservedChartType;
      }
      
      // Apply styles immediately
      $chart.setStyles(processLineChartStyles(mergedStyles));
      
      // Update saved styles to reflect the reset colors
      $save.styles = mergedStyles;
      
      // Update DOM theme attribute for CSS variables
      const mainContainer = document.querySelector('.kline-main');
      if (mainContainer) {
        mainContainer.setAttribute('data-theme', newTheme);
      }
    }
    
    // CRITICAL: Reset TransactionalThemeManager to prevent interference
    // This ensures the theme manager doesn't override theme colors with custom colors
    try {
      const themeManager = new TransactionalThemeManager('chart-settings', chart, newTheme);
      themeManager.resetToThemeDefaults(newTheme);
      themeManager.destroy(); // Clean up the temporary instance
      console.log('🔄 Reset TransactionalThemeManager for theme toggle');
    } catch (error) {
      console.error('Failed to reset TransactionalThemeManager:', error);
    }
    
    // Update the theme value (this will trigger the theme subscription)
    $save.theme = newTheme;
  }

  function clickLoadData() {
    $ctx.timeStart = 0;
    $ctx.timeEnd = 0;
    $ctx.fireOhlcv += 1;
  }

  function loadDataFile(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target.files || !target.files.length) return;
    const file = target.files[0];
    const name = file.name.split('.').shift() || 'Unknown';
    
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (param: any) => {
        const karr = param.data.map((data: any) => ({
          timestamp: parseInt(data[0]),
          open: parseFloat(data[1]),
          high: parseFloat(data[2]),
          low: parseFloat(data[3]),
          close: parseFloat(data[4]),
          volume: parseFloat(data[5])
        }));
        
        showName = name;
        if (karr.length > 1) {
          const lastIdx = karr.length - 1;
          const min_intv = Math.min(karr[1].timestamp - karr[0].timestamp, karr[lastIdx].timestamp - karr[lastIdx-1].timestamp);
          $save.period = makePeriod(secs_to_tf(min_intv / 1000));
        }
        if (karr.length > 0) {
          const pricePrec = GetNumberDotOffset(Math.min(karr[0].low, karr[karr.length - 1].low)) + 3
          // $chart?.setPrecision({price: pricePrec, volume: 0})
        }
        $chart?.applyNewData(karr, false)
        $ctx.loadingKLine = false
        $ctx.klineLoaded += 1
      }
    });
  }
  
  function clickScreenShot(){
    let bgColor = $save.theme === 'dark' ? '#151517' : '#ffffff'
    screenShotUrl = $chart?.getConvertPictureUrl(true, 'jpeg', bgColor) ?? ''
    showScreenShotModal = true
  }
  


  function exitFullscreen() {
    if(!browser)return;
    
    // Check if we're on iOS and using our custom fullscreen
    if (isIOSSafari() && iosFullscreenCleanup) {
      iosFullscreenCleanup();
      return;
    }
    
    let elem = (document as any);
    const doExit = elem.exitFullscreen ?? elem.mozCancelFullScreen ??
        elem.webkitExitFullscreen ?? elem.msExitFullscreen;
    
    if (doExit) {
      doExit.call(elem);
    } else if (isIOSSafari()) {
      // Fallback for iOS Safari
      exitFullscreenIOS();
    }
  }

  function toggleFullscreen() {
    debugLog('🔄 toggleFullscreen called, current fullScreen: ' + fullScreen);
    debugLog('🔍 iOS detection - isIOS(): ' + isIOS() + ', isIOSSafari(): ' + isIOSSafari());
    
    if (fullScreen) {
      debugLog('🚪 Exiting fullscreen...');
      exitFullscreen()
    } else {
      // Check if we're on iOS Safari and use iOS-specific method
      if (isIOSSafari()) {
        debugLog('📱 Using iOS Safari fullscreen method');
        enterFullscreenIOS();
      } else {
        debugLog('🖥️ Using standard fullscreen method');
        enterFullscreen();
      }
    }
    // Don't manually toggle fullScreen state here, let the event listeners handle it
  }

  function toggleLeftBar(){
    $save.showDrawBar = !$save.showDrawBar
    // Use RAF instead of setTimeout(0) for better performance
    requestAnimationFrame(() => {
      $chart?.resize()
    })
  }

  function toggleSidebar(){
    if (sidebarHost && sidebarHost.toggleSidebar) {
      sidebarHost.toggleSidebar();
    } else {
      // Fallback to simple toggle if sidebarHost is not available
      $save.showSidebar = !$save.showSidebar
      requestAnimationFrame(() => {
        $chart?.resize()
      })
    }
  }

  // Detect iOS device
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  // iOS Safari detection
  function isIOSSafari() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
    return isIOS && isSafari;
  }

  // iOS-specific fullscreen function with multiple fallbacks
  function enterFullscreenIOS() {
    debugLog('📱 enterFullscreenIOS called');
    if (!browser) {
      debugLog('❌ Browser not available');
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      const elem = mainContainer as any;
      debugLog('🎯 mainContainer element: ' + (elem ? 'Found' : 'Not found'));
      
      // Method 1: Try webkitRequestFullscreen (works in newer iOS Safari)
      if (elem && elem.webkitRequestFullscreen) {
        debugLog('🔧 Trying webkitRequestFullscreen...');
        try {
          elem.webkitRequestFullscreen();
          
          // iOS doesn't always fire fullscreen events reliably
          setTimeout(() => {
            debugLog('✅ webkitRequestFullscreen success, setting fullScreen = true');
            fullScreen = true;
            resolve(true);
          }, 300);
          return;
        } catch (error) {
          debugLog('❌ webkitRequestFullscreen failed: ' + error);
        }
      } else {
        debugLog('❌ webkitRequestFullscreen not available');
      }
      
      // Method 2: Try webkitEnterFullscreen for video elements (iOS specific)
      if (elem && elem.webkitEnterFullscreen) {
        try {
          elem.webkitEnterFullscreen();
          setTimeout(() => {
            fullScreen = true;
            resolve(true);
          }, 300);
          return;
        } catch (error) {
          console.log('webkitEnterFullscreen failed:', error);
        }
      }
      
      // Method 3: iOS Safari viewport manipulation fallback
      debugLog('🔧 Trying viewport manipulation fallback...');
      try {
        // Store original viewport meta tag
        const originalViewport = document.querySelector('meta[name="viewport"]');
        const originalContent = originalViewport?.getAttribute('content') || '';
        debugLog('📋 Original viewport content: ' + originalContent);
        
        // Set viewport for fullscreen-like experience
        const viewportMeta = originalViewport || document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        
        if (!originalViewport) {
          document.head.appendChild(viewportMeta);
          console.log('➕ Added new viewport meta tag');
        } else {
          console.log('🔄 Updated existing viewport meta tag');
        }
        
        // Hide Safari UI by scrolling
        window.scrollTo(0, 1);
        console.log('📜 Scrolled to hide Safari UI');
        
        // Add CSS to maximize the experience
        const style = document.createElement('style');
        style.id = 'ios-fullscreen-style';
        style.textContent = `
          body.ios-fullscreen {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100vh !important;
            overflow: hidden !important;
            -webkit-overflow-scrolling: touch !important;
          }
          
          .ios-fullscreen #main-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 9999 !important;
          }
          
          /* Hide Safari bottom bar */
          @supports (padding: max(0px)) {
            .ios-fullscreen {
              padding-bottom: env(safe-area-inset-bottom) !important;
            }
          }
        `;
        document.head.appendChild(style);
        console.log('🎨 Added iOS fullscreen CSS styles');
        
        // Preserve current theme before applying fullscreen class
        const currentTheme = mainContainer?.getAttribute('data-theme') || $save.theme;
        debugLog('🎨 Preserving theme during iOS fullscreen: ' + currentTheme);
        
        // Apply fullscreen class
        document.body.classList.add('ios-fullscreen');
        console.log('✅ Applied ios-fullscreen class to body');
        
        // Restore theme attribute after DOM manipulation
        if (mainContainer) {
          mainContainer.setAttribute('data-theme', currentTheme);
          debugLog('🔄 Restored theme attribute: ' + currentTheme);
        }
        
        setTimeout(() => {
          window.scrollTo(0, 0);
          fullScreen = true;
          debugLog('🎯 iOS fullscreen activated successfully!');
          
          // Store cleanup function for later
          iosFullscreenCleanup = () => {
            debugLog('🧹 Cleaning up iOS fullscreen...');
            
            // Preserve current theme before cleanup
            const currentTheme = mainContainer?.getAttribute('data-theme') || $save.theme;
            debugLog('🎨 Preserving theme during cleanup: ' + currentTheme);
            
            document.body.classList.remove('ios-fullscreen');
            const styleEl = document.getElementById('ios-fullscreen-style');
            if (styleEl) styleEl.remove();
            
            // Restore original viewport
            if (originalViewport && originalContent) {
              originalViewport.setAttribute('content', originalContent);
            }
            
            // Restore theme attribute after cleanup
            if (mainContainer) {
              mainContainer.setAttribute('data-theme', currentTheme);
              debugLog('🔄 Restored theme attribute after cleanup: ' + currentTheme);
            }
            
            fullScreen = false;
            debugLog('✅ iOS fullscreen cleanup completed');
          };
          
          resolve(true);
        }, 100);
        
      } catch (error) {
        console.log('iOS Safari viewport fallback failed:', error);
        resolve(false);
      }
    });
  }

  // iOS-specific exit fullscreen function
  function exitFullscreenIOS() {
    console.log('🚪 exitFullscreenIOS called');
    if (!browser) {
      console.log('❌ Browser not available');
      return;
    }
    
    try {
      // Method 1: Try webkitExitFullscreen
      if ((document as any).webkitExitFullscreen) {
        console.log('🔧 Trying webkitExitFullscreen...');
        (document as any).webkitExitFullscreen();
      } else {
        console.log('❌ webkitExitFullscreen not available');
      }
      
      // Method 2: Use stored cleanup function
      if (iosFullscreenCleanup) {
        console.log('🧹 Using stored cleanup function...');
        iosFullscreenCleanup();
        iosFullscreenCleanup = null;
      } else {
        console.log('❌ No stored cleanup function available');
      }
      
      // Method 3: Manual cleanup
      console.log('🔧 Performing manual cleanup...');
      
      // Preserve current theme before cleanup
      const currentTheme = mainContainer?.getAttribute('data-theme') || $save.theme;
      console.log('🎨 Preserving theme during manual cleanup: ' + currentTheme);
      
      document.body.classList.remove('ios-fullscreen');
      const styleEl = document.getElementById('ios-fullscreen-style');
      if (styleEl) {
        styleEl.remove();
        console.log('🗑️ Removed iOS fullscreen styles');
      }
      
      // Restore viewport
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        console.log('📱 Restored viewport meta tag');
      }
      
      // Restore theme attribute after cleanup
      if (mainContainer) {
        mainContainer.setAttribute('data-theme', currentTheme);
        console.log('🔄 Restored theme attribute after manual cleanup: ' + currentTheme);
      }
      
      // Update fullscreen state
      fullScreen = false;
      console.log('✅ Set fullScreen = false');
      
      // Trigger resize after exit
      setTimeout(() => {
        console.log('📏 Triggering chart resize...');
        $chart?.resize();
      }, 100);
      
    } catch (error) {
      console.log('❌ iOS exit fullscreen failed:', error);
    }
  }

  // Enhanced fullscreen function with iOS support
  function enterFullscreen() {
    if (!browser) return Promise.resolve();
    
    // Use iOS-specific method for iOS devices
    if (isIOS()) {
      return enterFullscreenIOS();
    }
    
    // Standard fullscreen for other devices
    return new Promise((resolve) => {
      let elem = mainContainer as any;
      if (elem && elem.requestFullscreen) {
        elem.requestFullscreen().then(() => resolve(true)).catch(() => resolve(false));
      } else if (elem && elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
        setTimeout(() => resolve(true), 100);
      } else if (elem && elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
        setTimeout(() => resolve(true), 100);
      } else if (elem && elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
        setTimeout(() => resolve(true), 100);
      } else {
        resolve(false);
      }
    });
  }

  // Function to toggle mobile screen rotation with iOS support
  async function toggleRotate() {
    if (!browser) return;
    
    try {
      if (!isRotated) {
        // iOS-specific handling
        if (isIOS()) {
          // For iOS, we focus on viewport optimization and user instruction
          try {
            // Try fullscreen first
            await enterFullscreenIOS();
            
            // iOS doesn't support orientation lock via API in most cases
            // Show user instruction for manual rotation
            if (window.DeviceOrientationEvent) {
              // Create a visual indicator for iOS users
              showIOSRotationHint();
            }
            
            isRotated = true;
            
            // Optimize viewport for iOS
            setTimeout(() => {
              // Hide Safari UI elements
              window.scrollTo(0, 1);
              setTimeout(() => {
                window.scrollTo(0, 0);
                if ($chart) {
                  $chart.resize();
                }
              }, 100);
            }, 200);
            
          } catch (error) {
            console.log('iOS rotation setup failed:', error);
            // Even if some parts fail, mark as rotated for UI consistency
            isRotated = true;
          }
        } else {
          // Android and other devices - original logic
          await enterFullscreen();
          
          setTimeout(async () => {
            try {
              if ('screen' in window && 'orientation' in window.screen && 'lock' in (window.screen.orientation as any)) {
                await (window.screen.orientation as any).lock('landscape');
              } else {
                console.log('Screen Orientation API not supported. Please rotate your device manually.');
              }
            } catch (orientationError) {
              console.log('Screen orientation lock failed:', orientationError);
            }
            
            isRotated = true;
            
            if ($chart) {
              setTimeout(() => {
                $chart.resize();
              }, 200);
            }
          }, 100);
        }
        
      } else {
        // Exit rotation mode
        if (isIOS()) {
           // iOS exit handling
           try {
             // Hide rotation hint if shown
             hideIOSRotationHint();
             
             // Try multiple exit methods for iOS
             let exitSuccess = false;
             
             // Method 1: Standard document exit fullscreen
             if ((document as any).webkitExitFullscreen) {
               try {
                 (document as any).webkitExitFullscreen();
                 exitSuccess = true;
               } catch (error) {
                 console.log('webkitExitFullscreen failed:', error);
               }
             }
             
             // Method 2: Use stored cleanup function for viewport fallback
             if ((window as any).iosFullscreenCleanup) {
               try {
                 (window as any).iosFullscreenCleanup();
                 delete (window as any).iosFullscreenCleanup;
                 exitSuccess = true;
               } catch (error) {
                 console.log('iOS cleanup function failed:', error);
               }
             }
             
             // Method 3: Manual cleanup if other methods fail
             if (!exitSuccess) {
               try {
                 document.body.classList.remove('ios-fullscreen');
                 const styleEl = document.getElementById('ios-fullscreen-style');
                 if (styleEl) styleEl.remove();
                 
                 // Reset viewport
                 const viewportMeta = document.querySelector('meta[name="viewport"]');
                 if (viewportMeta) {
                   viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
                 }
               } catch (error) {
                 console.log('Manual iOS cleanup failed:', error);
               }
             }
             
             isRotated = false;
             fullScreen = false;
             
             setTimeout(() => {
               if ($chart) {
                 $chart.resize();
               }
             }, 300);
             
           } catch (error) {
             console.log('iOS exit rotation failed:', error);
             isRotated = false;
             fullScreen = false;
           }
        } else {
          // Android and other devices
          try {
            if ('screen' in window && 'orientation' in window.screen && 'unlock' in window.screen.orientation) {
              window.screen.orientation.unlock();
            }
          } catch (orientationError) {
            console.log('Screen orientation unlock failed:', orientationError);
          }
          
          await exitFullscreen();
          isRotated = false;
          
          if ($chart) {
            setTimeout(() => {
              $chart.resize();
            }, 300);
          }
        }
      }
    } catch (error) {
      console.error('Rotation failed:', error);
      isRotated = false;
    }
  }

  // iOS rotation hint functions
  function showIOSRotationHint() {
    // Remove existing hint if any
    hideIOSRotationHint();
    
    const hint = document.createElement('div');
    hint.id = 'ios-rotation-hint';
    hint.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 280px;
        backdrop-filter: blur(10px);
      ">
        <div style="font-size: 24px; margin-bottom: 10px;">📱</div>
        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Rotate Your Device</div>
        <div style="font-size: 14px; opacity: 0.8;">Turn your device to landscape mode for the best experience</div>
        <div style="margin-top: 15px; font-size: 12px; opacity: 0.6;">Tap anywhere to dismiss</div>
      </div>
    `;
    
    hint.onclick = hideIOSRotationHint;
    document.body.appendChild(hint);
    
    // Auto-hide after 4 seconds
    setTimeout(hideIOSRotationHint, 4000);
  }

  function hideIOSRotationHint() {
    const hint = document.getElementById('ios-rotation-hint');
    if (hint) {
      hint.remove();
    }
  }

  // Save system handlers
  async function handleSave() {
    if (typeof window !== 'undefined' && (window as any).saveManager) {
      const saveManager = (window as any).saveManager;
      const state = saveManager.getState();
      
      if (state.activeSaveId) {
        // Quick save to existing layout
        const result = await saveManager.quickSave();
        if (!result.success) {
          console.error('Quick save failed:', result.error);
        }
      } else {
        // No active save, show save as dialog
        // Close the ChartSavePopup first
        showChartSavePopup = false;
        // Then show the SaveModal
        showSaveModal = true;
      }
    }
  }

  function handleSaveAs() {
    // Close the ChartSavePopup first
    showChartSavePopup = false;
    // Then show the SaveModal
    showSaveModal = true;
  }

  function handleNewLayout() {
    // Close the ChartSavePopup first
    showChartSavePopup = false;
    // Then show the SaveModal
    showSaveModal = true;
  }

  async function handleLoad(event: CustomEvent<{ layoutId: string }>) {
    const { layoutId } = event.detail;
    if (typeof window !== 'undefined' && (window as any).saveManager) {
      const saveManager = (window as any).saveManager;
      const result = await saveManager.load(layoutId);
      if (!result.success) {
        console.error('Load failed:', result.error);
      }
    }
  }

  async function handleDelete(event: CustomEvent<{ layoutId: string }>) {
    const { layoutId } = event.detail;
    if (typeof window !== 'undefined' && (window as any).saveManager) {
      const saveManager = (window as any).saveManager;
      const result = await saveManager.delete(layoutId);
      if (!result.success) {
        console.error('Delete failed:', result.error);
      }
    }
  }

  async function handleSaveModalSave(event: CustomEvent<{ name: string }>) {
    const { name } = event.detail;
    
    if (typeof window !== 'undefined' && (window as any).saveManager) {
      const saveManager = (window as any).saveManager;
      
      // Create new layout with the provided name
      const result = await saveManager.save(name);
      
      if (result.success) {
        showSaveModal = false;
      } else {
        console.error('Save failed:', result.error);
      }
    }
  }

  function handleSaveModalCancel() {
    showSaveModal = false;
  }

  function handleShowPopup() {
    console.log('🎯 Save button clicked, showing popup...');
    console.log('📊 Current savedLayouts:', savedLayouts);
    console.log('🎯 Current activeSaveId:', activeSaveId);
    console.log('💾 SaveManager available:', !!(window as any).saveManager);
    
    // Calculate popup position in the center of the chart
    if (mainContainer) {
      const chartContainer = mainContainer.querySelector('.chart-container');
      if (chartContainer) {
        const rect = chartContainer.getBoundingClientRect();
        chartSavePopupPosition = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      } else {
        // Fallback to main container center
        const rect = mainContainer.getBoundingClientRect();
        chartSavePopupPosition = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    }
    showChartSavePopup = true;
  }

</script>

{#snippet MenuButton(onClick: () => void, icon: string = "", text: string = "", size: number = 16, isActive: boolean = false)}
  <button 
    class="menu-btn group relative overflow-hidden {isActive ? 'menu-btn-active' : ''}" 
    onclick={onClick}
    aria-label={text || icon}
    title={text || icon}
    type="button"
  >
    <div class="menu-btn-content">
      {#if icon}
        <div class="menu-icon-wrapper">
          <KlineIcon name={icon} size={size}/>
        </div>
      {/if}
      {#if text}
        <span class="menu-text">{text}</span>
      {/if}
    </div>
    <div class="menu-btn-glow"></div>
  </button>
{/snippet}

<ModalSymbol bind:show={showSymbolModal} />
<ModalPeriod bind:show={showPeriodModal} />
<ModalIndSearch bind:show={showIndSearchModal} />
<ModalIndCfg bind:show={$ctx.modalIndCfg} />
<ModalSetting bind:show={showSettingModal} />
<ModalChartSetting bind:show={showChartSettingModal} />
<ModalScreenShot bind:show={showScreenShotModal} bind:url={screenShotUrl} />
<ModalTimezone bind:show={showTimezoneModal} />
<ModalChartType bind:show={showChartTypeModal} />
<SaveModal 
  bind:show={showSaveModal}
  {savedLayouts}
  {isLoading}
  mode="save"
  on:save={handleSaveModalSave}
  on:cancel={handleSaveModalCancel}
/>

<ChartSavePopup
  bind:show={showChartSavePopup}
  {savedLayouts}
  {activeSaveId}
  {isLoading}
  {hasUnsavedChanges}
  position={chartSavePopupPosition}
  on:save={handleSave}
  on:saveAs={handleSaveAs}
  on:quickSave={handleSave}
  on:load={handleLoad}
  on:delete={handleDelete}
  on:newLayout={handleNewLayout}
/>

<div bind:this={periodBarRef} class="menu-container">
  <!-- Left side scrollable content -->
  <div class="menu-left-section">
    <!-- Toggle Button -->
    <div class="menu-toggle-wrapper">
      <button class="menu-toggle-btn" onclick={toggleLeftBar} title="Toggle Left Panel">
        <div class="menu-toggle-icon-wrapper">
          <svg class="menu-toggle-icon {!$save.showDrawBar ? 'rotate' : ''}" viewBox="0 0 1024 1024">
            <path d="M192.037 287.953h640.124c17.673 0 32-14.327 32-32s-14.327-32-32-32H192.037c-17.673 0-32 14.327-32 32s14.327 32 32 32zM832.161 479.169H438.553c-17.673 0-32 14.327-32 32s14.327 32 32 32h393.608c17.673 0 32-14.327 32-32s-14.327-32-32-32zM832.161 735.802H192.037c-17.673 0-32 14.327-32 32s14.327 32 32 32h640.124c17.673 0 32-14.327 32-32s-14.327-32-32-32zM319.028 351.594l-160 160 160 160z"/>
          </svg>
        </div>
        <div class="menu-toggle-glow"></div>
      </button>
    </div>

    <!-- Custom Load Section -->
    {#if customLoad}
    <div class="custom-load-section">
      <input type="file" bind:this={fileRef} class="hidden" accept="text/csv" onchange={loadDataFile}/>
      <button class="custom-load-btn" onclick={() => fileRef?.click()}>
        <span class="custom-load-text">打开</span>
        <div class="custom-load-glow"></div>
      </button>
    </div>
    {/if}

    <!-- Symbol Search Section -->
    <div class="symbol-search-section" onclick={() => showSymbolModal = true}>
      <div class="symbol-search-content">
        <div class="symbol-search-icon">
          <Search class="search-icon" />
        </div>
        <span class="symbol-name">{showName}</span>
      </div>
      <div class="symbol-search-glow"></div>
    </div>

    <!-- Timeframe Section -->
    <div class="timeframe-section">
      <div class="timeframe-group">
        {#each shortTermPeriods as period}
          <button 
            class="timeframe-btn {period.timeframe === $save.period?.timeframe ? 'timeframe-btn-active' : ''}"
            onclick={() => handlePeriodClick(period)}
          >
            <span class="timeframe-text">{period.timeframe}</span>
            <div class="timeframe-glow"></div>
          </button>
        {/each}
        
        <!-- 4h button -->
        <button 
          class="timeframe-btn {$save.period?.timeframe === '4h' ? 'timeframe-btn-active' : ''}"
          onclick={() => handlePeriodClick(hourlyPeriods[0])}
        >
          <span class="timeframe-text">4h</span>
          <div class="timeframe-glow"></div>
        </button>
        
        <!-- Daily, Weekly, Monthly buttons -->
        {#each longTermPeriods as period}
          <button 
            class="timeframe-btn {period.timeframe === $save.period?.timeframe ? 'timeframe-btn-active' : ''}"
            onclick={() => handlePeriodClick(period)}
          >
            <span class="timeframe-text">{period.timeframe}</span>
            <div class="timeframe-glow"></div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Chart Type Section -->
    <div class="chart-type-section">
      {@render MenuButton(() => showChartTypeModal = true, getCurrentChartType().icon, getCurrentChartType().name)}
    </div>

    <!-- Indicator Section -->
    <div class="indicator-section">
      {@render MenuButton(() => showIndSearchModal = true, "indicator", m.indicator())}
    </div>
    
    <!-- Undo/Redo Section -->
    <div class="undo-redo-section">
      <button 
        class="undo-redo-btn {!canUndo ? 'undo-redo-disabled' : ''}"
        onclick={canUndo ? handleUndo : undefined}
        title="Undo (Ctrl+Z)"
      >
        <KlineIcon class="undo-redo-icon" name="undo" size={16}/>
        <div class="undo-redo-glow"></div>
      </button>
      <button 
        class="undo-redo-btn {!canRedo ? 'undo-redo-disabled' : ''}"
        onclick={canRedo ? handleRedo : undefined}
        title="Redo (Ctrl+Y)"
      >
        <KlineIcon class="undo-redo-icon" name="redo" size={16}/>
        <div class="undo-redo-glow"></div>
      </button>
    </div>
  </div>
  
  <!-- Right side icons -->
  <div class="menu-right-section">
    <!-- Save System -->
    <SaveButton 
      {savedLayouts}
      {activeSaveId}
      {isLoading}
      {hasUnsavedChanges}
      on:save={handleSave}
      on:saveAs={handleSaveAs}
      on:quickSave={handleSave}
      on:load={handleLoad}
      on:delete={handleDelete}
      on:newLayout={handleNewLayout}
      on:showPopup={handleShowPopup}
    />
    {@render MenuButton(() => showTimezoneModal = true, "timezone", "")}
    {@render MenuButton(() => showChartSettingModal = true, "setting", "")}
    {@render MenuButton(clickScreenShot, "screenShot", "", 20)}
    {@render MenuButton(() => {
       debugLog('🖱️ Fullscreen button clicked!');
       toggleFullscreen();
     }, fullScreen ? "exitFullScreen" : "fullScreen", "", 18)}
     <!-- Debug toggle button for iOS testing -->
     {#if isIOS()}
       {@render MenuButton(() => {
         showDebugOverlay = !showDebugOverlay;
         debugLog('🐛 Debug overlay toggled: ' + showDebugOverlay);
       }, "setting", "Debug", 16, showDebugOverlay)}
     {/if}
     {@render MenuButton(toggleTheme, "theme", "", 22)}
    <!-- Rotate button - only visible on mobile/tablet -->
    <div class="rotate-button-wrapper">
      <button 
         class="menu-btn {isRotated ? 'menu-btn-active' : ''}" 
         onclick={toggleRotate}
         title={isRotated ? "Exit Fullscreen & Rotation" : "Fullscreen & Rotate to Landscape"}
         type="button"
       >
        <div class="menu-btn-content">
          <div class="menu-icon-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              {#if isRotated}
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              {:else}
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
              {/if}
            </svg>
          </div>
        </div>
        <div class="menu-btn-glow"></div>
      </button>
    </div>
    <!-- Sidebar toggle button - hidden on mobile, shown on desktop at the end -->
    <div class="sidebar-toggle-wrapper hidden md:flex">
      {@render MenuButton(toggleSidebar, "sidebar", "", 18)}
    </div>
  </div>
</div>

<!-- Debug Overlay for iOS Testing -->
{#if showDebugOverlay && isIOS()}
  <div class="debug-overlay">
    <div class="debug-header">
      <h3>iOS Debug Console</h3>
      <button onclick={() => {
        debugLogs = [];
        debugLog('🧹 Debug logs cleared');
      }}>Clear</button>
      <button onclick={() => showDebugOverlay = false}>×</button>
    </div>
    <div class="debug-logs">
      {#each debugLogs as log}
        <div class="debug-log-item">{log}</div>
      {/each}
      {#if debugLogs.length === 0}
        <div class="debug-log-item">No logs yet. Click fullscreen button to start debugging.</div>
      {/if}
    </div>
  </div>
{/if}

<style>
/* Main Container */
.menu-container {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 56px;
  padding: 0 16px;
  background: var(--menu-bg);
  border-bottom: 2px solid var(--menu-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: var(--menu-shadow);
}

/* CSS Variables for Theming */
:global([data-theme="dark"]) {
  --menu-bg: linear-gradient(135deg, #0a041c 0%, #1a0f2e 50%, #0a041c 100%);
  --menu-border: rgba(138, 43, 226, 0.3);
  --menu-shadow: 0 4px 20px rgba(138, 43, 226, 0.15), 0 2px 8px rgba(0, 0, 0, 0.3);
  --menu-text: #ffffff;
  --menu-text-secondary: rgba(255, 255, 255, 0.7);
  --menu-hover-bg: rgba(138, 43, 226, 0.2);
  --menu-active-bg: linear-gradient(135deg, #8a2be2 0%, #9932cc 100%);
  --menu-glow: rgba(138, 43, 226, 0.4);
  --menu-btn-bg: rgba(255, 255, 255, 0.05);
  --menu-btn-border: rgba(138, 43, 226, 0.2);
}

:global([data-theme="light"]) {
  --menu-bg: linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%);
  --menu-border: rgba(59, 130, 246, 0.2);
  --menu-shadow: 0 4px 20px rgba(59, 130, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.1);
  --menu-text: #1f2937;
  --menu-text-secondary: rgba(31, 41, 55, 0.7);
  --menu-hover-bg: rgba(59, 130, 246, 0.1);
  --menu-active-bg: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  --menu-glow: rgba(59, 130, 246, 0.3);
  --menu-btn-bg: rgba(0, 0, 0, 0.02);
  --menu-btn-border: rgba(59, 130, 246, 0.15);
}

/* Left Section */
.menu-left-section {
  display: flex;
  align-items: center;
  height: 100%;
  flex-shrink: 0;
  gap: 12px;
}

/* Right Section */
.menu-right-section {
  display: flex;
  align-items: center;
  height: 100%;
  flex-shrink: 0;
  margin-left: auto;
  gap: 8px;
  padding-right: 8px;
}

/* Menu Button Styles */
.menu-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 16px;
  background: var(--menu-btn-bg);
  border: 1px solid var(--menu-btn-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.menu-btn:hover {
  background: var(--menu-hover-bg);
  border-color: var(--menu-glow);
  transform: translateY(-1px);
  box-shadow: 0 8px 25px var(--menu-glow);
}

.menu-btn-active {
  background: var(--menu-active-bg);
  border-color: var(--menu-glow);
  color: white;
  box-shadow: 0 4px 15px var(--menu-glow);
}

.menu-btn-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2;
}

.menu-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.menu-btn:hover .menu-icon-wrapper {
  transform: scale(1.1);
}

.menu-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--menu-text);
  white-space: nowrap;
  letter-spacing: 0.025em;
}

.menu-btn-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, var(--menu-glow) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.menu-btn:hover .menu-btn-glow {
  opacity: 0.3;
}

/* Toggle Button */
.menu-toggle-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.menu-toggle-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 32px;
  background: var(--menu-btn-bg);
  border: 1px solid var(--menu-btn-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.menu-toggle-btn:hover {
  background: var(--menu-hover-bg);
  border-color: var(--menu-glow);
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 8px 25px var(--menu-glow);
}

.menu-toggle-icon-wrapper {
  position: relative;
  z-index: 2;
}

.menu-toggle-icon {
  width: 24px;
  height: 24px;
  fill: var(--menu-text);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-toggle-btn:hover .menu-toggle-icon {
  fill: var(--menu-glow);
  transform: scale(1.1);
}

.menu-toggle-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, var(--menu-glow) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.menu-toggle-btn:hover .menu-toggle-glow {
  opacity: 0.4;
}

.rotate {
  transform: rotate(180deg);
  transform-style: preserve-3d;
}

/* Custom Load Section */
.custom-load-section {
  display: flex;
  align-items: center;
}

.custom-load-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 20px;
  background: var(--menu-active-bg);
  border: 1px solid var(--menu-glow);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.custom-load-btn:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 8px 25px var(--menu-glow);
}

.custom-load-text {
  font-size: 13px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.025em;
  z-index: 2;
  position: relative;
}

.custom-load-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.custom-load-btn:hover .custom-load-glow {
  opacity: 1;
}

/* Symbol Search Section */
.symbol-search-section {
  position: relative;
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 16px;
  background: var(--menu-btn-bg);
  border: 1px solid var(--menu-btn-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  min-width: 120px;
}

.symbol-search-section:hover {
  background: var(--menu-hover-bg);
  border-color: var(--menu-glow);
  transform: translateY(-1px);
  box-shadow: 0 8px 25px var(--menu-glow);
}

.symbol-search-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2;
}

.symbol-search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}



.symbol-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--menu-text);
  white-space: nowrap;
  letter-spacing: 0.025em;
}

.symbol-search-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, var(--menu-glow) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.symbol-search-section:hover .symbol-search-glow {
  opacity: 0.3;
}

/* Timeframe Section */
.timeframe-section {
  display: flex;
  align-items: center;
  margin-left: 16px;
}

.timeframe-group {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--menu-btn-bg);
  border: 1px solid var(--menu-btn-border);
  border-radius: 12px;
  padding: 4px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.timeframe-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 26px;
  padding: 0 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.timeframe-btn:hover {
  background: var(--menu-hover-bg);
  transform: translateY(-1px);
}

.timeframe-btn-active {
  background: var(--menu-active-bg);
  color: white;
  box-shadow: 0 4px 12px var(--menu-glow);
}

.timeframe-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--menu-text);
  white-space: nowrap;
  letter-spacing: 0.025em;
  z-index: 2;
  position: relative;
}

.timeframe-btn-active .timeframe-text {
  color: white;
}

.timeframe-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, var(--menu-glow) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.timeframe-btn:hover .timeframe-glow {
  opacity: 0.3;
}

/* Chart Type and Indicator Sections */
.chart-type-section,
.indicator-section {
  display: flex;
  align-items: center;
  margin-left: 16px;
}

/* Undo/Redo Section */
.undo-redo-section {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 16px;
  background: var(--menu-btn-bg);
  border: 1px solid var(--menu-btn-border);
  border-radius: 12px;
  padding: 4px;
}

.undo-redo-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.undo-redo-btn:hover:not(.undo-redo-disabled) {
  background: var(--menu-hover-bg);
  transform: translateY(-1px);
}

.undo-redo-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}



.undo-redo-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, var(--menu-glow) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.undo-redo-btn:hover:not(.undo-redo-disabled) .undo-redo-glow {
  opacity: 0.3;
}

/* Hide scrollbar completely */
:global(.menu-container::-webkit-scrollbar) {
  display: none;
}

:global(.menu-container) {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .menu-container {
    height: 52px;
    padding: 0 12px;
    gap: 8px;
  }
  
  .menu-left-section {
    gap: 8px;
  }
  
  .menu-right-section {
    gap: 6px;
  }
  
  .menu-btn {
    height: 36px;
    padding: 0 12px;
    border-radius: 10px;
  }
  
  .menu-text {
    font-size: 13px;
  }
  
  .menu-toggle-btn {
    width: 40px;
    height: 40px;
  }
  
  .menu-toggle-icon {
    width: 20px;
    height: 20px;
  }
  
  .symbol-search-section {
    height: 36px;
    padding: 0 12px;
    min-width: 100px;
  }
  
  .symbol-name {
    font-size: 13px;
  }
  
  .timeframe-btn {
    min-width: 32px;
    height: 28px;
    padding: 0 10px;
  }
  
  .timeframe-text {
    font-size: 12px;
  }
  
  .undo-redo-btn {
    width: 32px;
    height: 28px;
  }
}

@media (max-width: 480px) {
  .menu-container {
    height: 48px;
    padding: 0 8px;
  }
  
  .menu-btn {
    height: 32px;
    padding: 0 10px;
  }
  
  .menu-text {
    font-size: 12px;
  }
  
  .menu-toggle-btn {
    width: 36px;
    height: 36px;
  }
  
  .symbol-search-section {
    height: 32px;
    padding: 0 10px;
    min-width: 80px;
  }
  
  .timeframe-btn {
    min-width: 28px;
    height: 24px;
    padding: 0 8px;
  }
  
  .timeframe-text {
    font-size: 11px;
  }
  
  .undo-redo-btn {
    width: 28px;
    height: 24px;
  }
}

/* Animation for premium feel */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 5px var(--menu-glow);
  }
  50% {
    box-shadow: 0 0 20px var(--menu-glow), 0 0 30px var(--menu-glow);
  }
}

.menu-btn-active {
  animation: pulse-glow 2s ease-in-out infinite;
}

/* Rotate Button Styles */
.rotate-button-wrapper {
  display: none; /* Hidden by default on desktop */
}

/* Show rotate button only on mobile and tablet devices */
@media (max-width: 1024px) {
  .rotate-button-wrapper {
    display: flex;
    align-items: center;
  }
}

/* Additional mobile-specific styles for rotate button */
@media (max-width: 768px) {
  .rotate-button-wrapper .menu-btn {
    height: 36px;
    padding: 0 12px;
  }
}

@media (max-width: 480px) {
  .rotate-button-wrapper .menu-btn {
    height: 32px;
    padding: 0 10px;
  }
}

/* Debug Overlay Styles for iOS Testing */
.debug-overlay {
  position: fixed;
  top: 60px;
  right: 10px;
  width: 300px;
  max-height: 400px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  border: 1px solid #333;
  border-radius: 8px;
  z-index: 10000;
  font-family: monospace;
  font-size: 12px;
  overflow: hidden;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #333;
  border-bottom: 1px solid #555;
}

.debug-header h3 {
  margin: 0;
  font-size: 14px;
  color: #00ff00;
}

.debug-header button {
  background: #555;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.debug-header button:hover {
  background: #666;
}

.debug-logs {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
}

.debug-log-item {
  padding: 4px 0;
  border-bottom: 1px solid #333;
  word-wrap: break-word;
  line-height: 1.4;
}

.debug-log-item:last-child {
  border-bottom: none;
}

/* Mobile responsive debug overlay */
@media (max-width: 768px) {
  .debug-overlay {
    width: calc(100vw - 20px);
    right: 10px;
    left: 10px;
    max-height: 300px;
  }
}

/* Smooth transitions for theme changes */
* {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}
</style>