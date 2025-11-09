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
import ModalAI from './ModalAI.svelte';
  import { undoRedoManager } from './undoRedoManager';
  import { Search } from 'lucide-svelte';
  import { TransactionalThemeManager } from '$lib/stores/themeManager.js';
  import SaveButton from './saveSystem/SaveButton.svelte';
  import SaveModal from './saveSystem/SaveModal.svelte';
  import ChartSavePopup from './saveSystem/ChartSavePopup.svelte';
  import LoadChartPopup from './saveSystem/LoadChartPopup.svelte';
  import SaveAsSelectModal from './saveSystem/SaveAsSelectModal.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { slide, fade } from 'svelte/transition';
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
let showAIModal = $state(false);
  let screenShotUrl = $state('');
  let showName = $state('');
  let isRotated = $state(false);
  let showAllTimeframesMobile = $state(false);
  let isMobileView = $state(false);
  
  // Theme switch confirmation state
  let showThemeConfirm = $state(false);
  let pendingNewTheme: 'dark' | 'light' | null = $state(null);
  
  // Save system state
  let showSaveModal = $state(false);
  let showSaveAsSelectModal = $state(false);
  let showChartSavePopup = $state(false);
  let chartSavePopupPosition = $state({ x: 0, y: 0 });
  let showChartLoadPopup = $state(false);
  let chartLoadPopupPosition = $state({ x: 0, y: 0 });
  let savedLayouts = $state([]);
  let activeSaveId = $state(null);
  let isLoading = $state(false);
  let hasUnsavedChanges = $state(false);
  let toastVisible = $state(false);
  let toastMessage = $state('');

  // iOS fullscreen cleanup function
  let iosFullscreenCleanup: (() => void) | null = $state(null);
  
  // Visual debug function (console only)
  function debugLog(message: string) {
    console.log(message);
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
  
  // Scroll arrow state
  let showScrollArrow = $state(false);
  let menuContainerRef = $state<HTMLDivElement>();

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
    
    // Check scroll on mount
    checkScrollNeeded();
    
    // Handle scroll events
    const handleScroll = () => {
      checkScrollNeeded();
    };
    
    // Handle resize events
    const handleResize = () => {
      checkScrollNeeded();
      if (typeof window !== 'undefined') {
        isMobileView = window.innerWidth <= 768;
      }
    };
    
    if (menuContainerRef) {
      menuContainerRef.addEventListener('scroll', handleScroll);
    }
    
    window.addEventListener('resize', handleResize);
    
    // Also check after a short delay to ensure all elements are rendered
    setTimeout(() => {
      checkScrollNeeded();
      if (typeof window !== 'undefined') {
        isMobileView = window.innerWidth <= 768;
      }
    }, 500);
    
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
      
      if (menuContainerRef) {
        menuContainerRef.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleResize);
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
    // On mobile expanded view, auto-close after selection for better UX
    if (showAllTimeframesMobile) {
      showAllTimeframesMobile = false;
    }
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
    
    // Apply the new styles to the chart with proper processing
    const styles = getThemeStyles($save.theme);
    _.merge(styles, $save.styles);
    const processedStyles = processLineChartStyles(styles);
    $chart?.setStyles(processedStyles);
    
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

  // Determine if user actually customized canvas/grid relative to current theme defaults
  function hasCanvasOrGridCustomizations(): boolean {
    const s: any = $save.styles || {};
    const themeStyles: any = getThemeStyles($save.theme);

    // If top-level override keys exist, treat as customized
    if (s.backgroundColor || s.backgroundGradient || s.backgroundType || (s.backgroundOpacity !== undefined)) return true;
    if (s.gridGradient || s.gridType || (s.gridOpacity !== undefined)) return true;

    const normalize = (c: any): string => {
      if (!c || typeof c !== 'string') return '';
      const color = c.trim().toLowerCase();
      if (color.startsWith('rgba(')) {
        const m = color.match(/rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (m) {
          const r = Number(m[1]).toString(16).padStart(2, '0');
          const g = Number(m[2]).toString(16).padStart(2, '0');
          const b = Number(m[3]).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`;
        }
      }
      return color;
    };

    // Compare pane background against theme default
    const paneBg = normalize(_.get(s, 'pane.backgroundColor'));
    const candlePaneBg = normalize(_.get(s, 'candle.pane.backgroundColor'));
    const themePaneBg = normalize(_.get(themeStyles, 'pane.backgroundColor'));
    if (paneBg && themePaneBg && paneBg !== themePaneBg) return true;
    if (candlePaneBg && themePaneBg && candlePaneBg !== themePaneBg) return true;

    // Compare grid colors against theme default
    const gridH = normalize(_.get(s, 'grid.horizontal.color'));
    const gridV = normalize(_.get(s, 'grid.vertical.color'));
    const themeGridH = normalize(_.get(themeStyles, 'grid.horizontal.color'));
    const themeGridV = normalize(_.get(themeStyles, 'grid.vertical.color'));
    if (gridH && themeGridH && gridH !== themeGridH) return true;
    if (gridV && themeGridV && gridV !== themeGridV) return true;

    return false;
  }

  function applyThemeSwitch(newTheme: 'dark' | 'light', resetTemplate: boolean) {
    // Update DOM theme attribute for CSS variables (UI theme)
    const mainContainer = document.querySelector('.kline-main');
    if (mainContainer) {
      mainContainer.setAttribute('data-theme', newTheme);
    }

    if (resetTemplate) {
      // Clear custom background and grid colors from localStorage
      try {
        const savedChart = localStorage.getItem('chart');
        if (savedChart) {
          const chartData = JSON.parse(savedChart);
          if (chartData.styles) {
            delete chartData.styles.backgroundColor;
            delete chartData.styles.backgroundOpacity;
            delete chartData.styles.backgroundType;
            delete chartData.styles.backgroundGradient;
            if (chartData.styles.grid) {
              delete chartData.styles.grid.horizontal;
              delete chartData.styles.grid.vertical;
            }
            delete chartData.styles.gridColor;
            delete chartData.styles.gridOpacity;
            delete chartData.styles.gridType;
            delete chartData.styles.gridGradient;
            localStorage.setItem('chart', JSON.stringify(chartData));
            console.log('🧹 Cleared custom background and grid colors from localStorage');
          }
        }
      } catch (error) {
        console.error('Failed to clear custom colors from localStorage:', error);
      }

      if ($chart) {
        // Force next canvas color application to use theme defaults (do not preserve preview)
        (window as any).__forceApplyThemeDefaults = true;
        const themeStyles = getThemeStyles(newTheme);
        const currentSavedStyles = JSON.parse(JSON.stringify($save.styles || {}));
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

        const preservedChartType = currentSavedStyles?.candle?.type;
        const mergedStyles = _.merge({}, themeStyles, resetStyles);
        // Remove top-level custom canvas/grid keys so modal/init won't re-apply old values
        delete (mergedStyles as any).backgroundColor;
        delete (mergedStyles as any).backgroundOpacity;
        delete (mergedStyles as any).backgroundType;
        delete (mergedStyles as any).backgroundGradient;
        delete (mergedStyles as any).gridColor;
        delete (mergedStyles as any).gridOpacity;
        delete (mergedStyles as any).gridType;
        delete (mergedStyles as any).gridGradient;
        if (preservedChartType && mergedStyles.candle) {
          mergedStyles.candle.type = preservedChartType;
        }
        $chart.setStyles(processLineChartStyles(mergedStyles));
        $save.styles = mergedStyles;
      }

      try {
        const themeManager = new TransactionalThemeManager('chart-settings', chart, newTheme);
        themeManager.resetToThemeDefaults(newTheme);
        themeManager.destroy();
        console.log('🔄 Reset TransactionalThemeManager for theme toggle');
      } catch (error) {
        console.error('Failed to reset TransactionalThemeManager:', error);
      }
    }

    // Update the theme store (triggers chart theme subscription)
    $save.theme = newTheme;
  }

  function toggleTheme() {
    const newTheme: 'dark' | 'light' = $save.theme === 'dark' ? 'light' : 'dark';
    // If user customized canvas/grid colors, ask whether to switch the chart template too
    if (hasCanvasOrGridCustomizations()) {
      pendingNewTheme = newTheme;
      showThemeConfirm = true;
      return;
    }
    // No customizations: switch and reset to defaults
    applyThemeSwitch(newTheme, true);
  }

  function confirmThemeTemplateSwitch() {
    if (!pendingNewTheme) return;
    applyThemeSwitch(pendingNewTheme, true);
    showThemeConfirm = false;
    pendingNewTheme = null;
  }

  function cancelThemeTemplateSwitch() {
    if (!pendingNewTheme) return;
    // Switch only UI theme, preserve chart template colors
    applyThemeSwitch(pendingNewTheme, false);
    showThemeConfirm = false;
    pendingNewTheme = null;
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
        if (result.success) {
          // Close popup and show confirmation toast
          showChartSavePopup = false;
          toastMessage = 'Saved to current layout';
          toastVisible = true;
          setTimeout(() => { toastVisible = false; }, 2000);
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
    // Instead of name input, open selection modal to overwrite an existing layout
    showSaveAsSelectModal = true;
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

  async function handleSaveAsSelectSave(event: CustomEvent<{ layoutId: string }>) {
    const { layoutId } = event.detail;
    if (typeof window !== 'undefined' && (window as any).saveManager) {
      const saveManager = (window as any).saveManager;
      const result = await saveManager.saveTo(layoutId);
      if (result.success) {
        showSaveAsSelectModal = false;
      } else {
        console.error('Save to existing failed:', result.error);
      }
    }
  }

  function handleSaveAsSelectBack() {
    // Go back to the Save popup
    showSaveAsSelectModal = false;
    handleShowPopup();
  }

  function handleSaveAsSelectCancel() {
    showSaveAsSelectModal = false;
  }

  function handleShowPopup() {
    console.log('🎯 Save button clicked, showing popup...');
    console.log('📊 Current savedLayouts:', savedLayouts);
    console.log('🎯 Current activeSaveId:', activeSaveId);
    console.log('💾 SaveManager available:', !!(window as any).saveManager);

    // If user has no saved layouts yet, open New Layout modal directly
    try {
      if (typeof window !== 'undefined' && (window as any).saveManager) {
        const sm = (window as any).saveManager;
        const st = sm.getState();
        if (!st || !Array.isArray(st.savedLayouts) || st.savedLayouts.length === 0) {
          showChartSavePopup = false;
          showSaveModal = true;
          return;
        }
      } else if (!savedLayouts || savedLayouts.length === 0) {
        showChartSavePopup = false;
        showSaveModal = true;
        return;
      }
    } catch (e) {
      // Fallback to modal on error
      showChartSavePopup = false;
      showSaveModal = true;
      return;
    }
    
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

  function handleShowLoadPopup() {
    // Center the popup in the chart
    if (mainContainer) {
      const chartContainer = mainContainer.querySelector('.chart-container');
      if (chartContainer) {
        const rect = chartContainer.getBoundingClientRect();
        chartLoadPopupPosition = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      } else {
        const rect = mainContainer.getBoundingClientRect();
        chartLoadPopupPosition = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    }
    showChartLoadPopup = true;
  }

  // Check if menu container needs scroll
  function checkScrollNeeded() {
    if (!menuContainerRef) return;
    
    const { scrollWidth, clientWidth, scrollLeft } = menuContainerRef;
    const hasOverflow = scrollWidth > clientWidth;
    const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 5; // 5px threshold
    
    // Show arrow if there's overflow and not at the end
    showScrollArrow = hasOverflow && !isAtEnd;
  }

  // Auto-scroll the menu container
  function handleScrollArrowClick(e?: Event) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!menuContainerRef) return;
    
    const { scrollLeft, clientWidth, scrollWidth } = menuContainerRef;
    const scrollAmount = clientWidth * 0.7; // Scroll 70% of visible width
    const targetScroll = Math.min(scrollLeft + scrollAmount, scrollWidth - clientWidth);
    
    menuContainerRef.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }
  
  // Handle touch events for mobile WebView compatibility
  function handleScrollArrowTouch(e: TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
    handleScrollArrowClick();
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
<ModalAI bind:show={showAIModal} />
<SaveModal 
  bind:show={showSaveModal}
  {savedLayouts}
  {isLoading}
  mode="save"
  showExisting={false}
  on:save={handleSaveModalSave}
  on:cancel={handleSaveModalCancel}
/>

<SaveAsSelectModal 
  bind:show={showSaveAsSelectModal}
  {savedLayouts}
  {isLoading}
  on:saveTo={handleSaveAsSelectSave}
  on:back={handleSaveAsSelectBack}
  on:cancel={handleSaveAsSelectCancel}
/>

<ChartSavePopup
  bind:show={showChartSavePopup}
  {savedLayouts}
  {activeSaveId}
  {isLoading}
  {hasUnsavedChanges}
  position={chartSavePopupPosition}
  showLayouts={false}
  on:save={handleSave}
  on:saveAs={handleSaveAs}
  on:quickSave={handleSave}
  on:newLayout={handleNewLayout}
/>

<LoadChartPopup
  bind:show={showChartLoadPopup}
  {savedLayouts}
  {activeSaveId}
  position={chartLoadPopupPosition}
  {isLoading}
  on:load={handleLoad}
  on:delete={handleDelete}
/>

<!-- Success toast for save actions -->
<Toast bind:visible={toastVisible} message={toastMessage} duration={2000} />

<div class="menu-wrapper">
<div bind:this={menuContainerRef} class="menu-container">
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
      <!-- Desktop: show all timeframes as before -->
      {#if !isMobileView}
      <div class="timeframe-group desktop-only">
        {#each shortTermPeriods as period}
          <button 
            class="timeframe-btn {period.timeframe === $save.period?.timeframe ? 'timeframe-btn-active' : ''}"
            onclick={() => handlePeriodClick(period)}
          >
            <span class="timeframe-text">{period.timeframe}</span>
            <div class="timeframe-glow"></div>
          </button>
        {/each}
        <button 
          class="timeframe-btn {$save.period?.timeframe === '4h' ? 'timeframe-btn-active' : ''}"
          onclick={() => handlePeriodClick(hourlyPeriods[0])}
        >
          <span class="timeframe-text">4h</span>
          <div class="timeframe-glow"></div>
        </button>
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
      {/if}

      <!-- Mobile: show Daily + Weekly + more (...) -->
      {#if isMobileView}
      <div class="timeframe-group mobile-only">
        <!-- Daily -->
        {#if longTermPeriods.find(p => p.timeframe === '1d')}
          <button 
            class="timeframe-btn {$save.period?.timeframe === '1d' ? 'timeframe-btn-active' : ''}"
            onclick={() => handlePeriodClick(longTermPeriods.find(p => p.timeframe === '1d'))}
          >
            <span class="timeframe-text">1d</span>
            <div class="timeframe-glow"></div>
          </button>
        {/if}
        <!-- Weekly -->
        {#if longTermPeriods.find(p => p.timeframe === '1w')}
          <button 
            class="timeframe-btn {$save.period?.timeframe === '1w' ? 'timeframe-btn-active' : ''}"
            onclick={() => handlePeriodClick(longTermPeriods.find(p => p.timeframe === '1w'))}
          >
            <span class="timeframe-text">1w</span>
            <div class="timeframe-glow"></div>
          </button>
        {/if}
        <!-- More (...) button -->
        <button 
          class="timeframe-btn timeframe-more-btn {showAllTimeframesMobile ? 'timeframe-btn-active' : ''}"
          onclick={() => showAllTimeframesMobile = !showAllTimeframesMobile}
          aria-expanded={showAllTimeframesMobile}
          aria-label="More timeframes"
          title="More"
        >
          <span class="timeframe-text">⋯</span>
          <div class="timeframe-glow"></div>
        </button>
        {#if showAllTimeframesMobile}
          <div class="timeframe-inline-expand" in:slide={{ duration: 180 }} out:fade={{ duration: 120 }}>
            {#each shortTermPeriods as period}
              <button 
                class="timeframe-btn {period.timeframe === $save.period?.timeframe ? 'timeframe-btn-active' : ''}"
                onclick={() => handlePeriodClick(period)}
              >
                <span class="timeframe-text">{period.timeframe}</span>
                <div class="timeframe-glow"></div>
              </button>
            {/each}
            <!-- 4h -->
            <button 
              class="timeframe-btn {$save.period?.timeframe === '4h' ? 'timeframe-btn-active' : ''}"
              onclick={() => handlePeriodClick(hourlyPeriods[0])}
            >
              <span class="timeframe-text">4h</span>
              <div class="timeframe-glow"></div>
            </button>
            <!-- Monthly (avoid duplicate 1d/1w shown before) -->
            {#if longTermPeriods.find(p => p.timeframe === '1M')}
              <button 
                class="timeframe-btn {$save.period?.timeframe === '1M' ? 'timeframe-btn-active' : ''}"
                onclick={() => handlePeriodClick(longTermPeriods.find(p => p.timeframe === '1M'))}
              >
                <span class="timeframe-text">1M</span>
                <div class="timeframe-glow"></div>
              </button>
            {/if}
          </div>
        {/if}
      </div>
      {/if}
    </div>

    <!-- AI Section -->
    <div class="ai-section">
      <button 
        class="ai-btn group relative overflow-hidden" 
        onclick={() => showAIModal = true}
        aria-label="AI Features"
        title="AI Powered Features (Coming Soon)"
        type="button"
      >
        <div class="ai-btn-content">
          <div class="ai-icon-wrapper">
            <svg class="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <span class="ai-text">AI</span>
          <div class="ai-badge-mini">New</div>
        </div>
        <div class="ai-btn-glow"></div>
        <div class="ai-particles">
          <span class="particle"></span>
          <span class="particle"></span>
          <span class="particle"></span>
        </div>
      </button>
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
    <!-- Load Chart Button -->
    <button
      class="btn btn-secondary btn-sm min-w-[100px] transition-all duration-200"
      onclick={handleShowLoadPopup}
      title="Load Chart Layout"
      type="button"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 8l-3-3m3 3l3-3" />
      </svg>
      Load
    </button>
    {@render MenuButton(() => showTimezoneModal = true, "timezone", "")}
    {@render MenuButton(() => showChartSettingModal = true, "setting", "")}
    {@render MenuButton(clickScreenShot, "screenShot", "", 20)}
    {@render MenuButton(() => {
       debugLog('🖱️ Fullscreen button clicked!');
       toggleFullscreen();
     }, fullScreen ? "exitFullScreen" : "fullScreen", "", 18)}
     
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
    <div class="sidebar-toggle-wrapper hidden lg:flex">
      {@render MenuButton(toggleSidebar, "sidebar", "", 18)}
    </div>
  </div>
</div>

<!-- Scroll Arrow Indicator -->
{#if showScrollArrow}
  <button 
    class="menu-scroll-arrow"
    onclick={handleScrollArrowClick}
    ontouchstart={handleScrollArrowTouch}
    ontouchend={(e) => e.preventDefault()}
    title="Scroll to see more"
    aria-label="Scroll right"
    type="button"
  >
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2.5" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  </button>
{/if}
</div>

{#if showThemeConfirm}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
    <div class="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
      <div class="text-base-content text-lg font-semibold mb-2">Switch chart template theme?</div>
      <div class="text-base-content/80 text-sm mb-5">
        {`You're changing the user interface to the ${pendingNewTheme === 'light' ? 'Light' : 'Dark'} theme.`}
        <br/>
        Would you like to switch the chart template's theme too?
      </div>
      <div class="flex justify-end gap-2">
        <button class="btn btn-sm" onclick={cancelThemeTemplateSwitch} type="button">No</button>
        <button class="btn btn-sm btn-primary" onclick={confirmThemeTemplateSwitch} type="button">Yes</button>
      </div>
    </div>
  </div>
{/if}

<!-- Debug Overlay for iOS Testing -->
 

<style>
/* Menu Wrapper - contains menu-container and scroll arrow */
.menu-wrapper {
  position: relative;
  width: 100%;
}

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
  scroll-behavior: smooth;
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

.desktop-only {
  display: flex;
}
.mobile-only {
  display: none;
}

.timeframe-expand {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 16px;
  background: var(--menu-btn-bg);
  border: 1px solid var(--menu-btn-border);
  border-radius: 12px;
  padding: 6px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
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

.timeframe-more-btn .timeframe-text {
  font-size: 16px;
  line-height: 1;
}

.timeframe-inline-expand {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
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

/* AI Section */
.ai-section {
  display: flex;
  align-items: center;
  margin-left: 16px;
}

.ai-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 18px;
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
  border: 1.5px solid rgba(138, 43, 226, 0.4);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.ai-btn:hover {
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%);
  border-color: rgba(138, 43, 226, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(138, 43, 226, 0.4);
}

.ai-btn-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2;
}

.ai-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.ai-btn:hover .ai-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

.ai-icon {
  width: 18px;
  height: 18px;
  color: rgba(138, 43, 226, 1);
  filter: drop-shadow(0 2px 4px rgba(138, 43, 226, 0.4));
  transition: all 0.3s ease;
  animation: aiIconPulse 2s ease-in-out infinite;
}

@keyframes aiIconPulse {
  0%, 100% {
    filter: drop-shadow(0 2px 4px rgba(138, 43, 226, 0.4));
  }
  50% {
    filter: drop-shadow(0 3px 8px rgba(138, 43, 226, 0.6));
  }
}

.ai-btn:hover .ai-icon {
  color: rgba(168, 85, 247, 1);
}

.ai-text {
  font-size: 14px;
  font-weight: 700;
  color: rgba(138, 43, 226, 1);
  white-space: nowrap;
  letter-spacing: 0.5px;
  text-shadow: 0 0 10px rgba(138, 43, 226, 0.3);
  transition: all 0.3s ease;
}

.ai-btn:hover .ai-text {
  color: rgba(168, 85, 247, 1);
  text-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
}

.ai-badge-mini {
  font-size: 9px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #8a2be2 0%, #9932cc 100%);
  padding: 2px 6px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 6px rgba(138, 43, 226, 0.4);
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 6px rgba(138, 43, 226, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 3px 10px rgba(138, 43, 226, 0.6);
  }
}

.ai-btn-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(138, 43, 226, 0.4) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
  animation: glowPulse 3s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.4;
  }
}

.ai-btn:hover .ai-btn-glow {
  opacity: 0.6;
}

.ai-particles {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.ai-particles .particle {
  position: absolute;
  width: 3px;
  height: 3px;
  background: rgba(138, 43, 226, 0.6);
  border-radius: 50%;
  animation: particleFloat 3s ease-in-out infinite;
}

.ai-particles .particle:nth-child(1) {
  left: 20%;
  animation-delay: 0s;
}

.ai-particles .particle:nth-child(2) {
  left: 50%;
  animation-delay: 1s;
}

.ai-particles .particle:nth-child(3) {
  left: 80%;
  animation-delay: 2s;
}

@keyframes particleFloat {
  0%, 100% {
    transform: translateY(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-30px);
    opacity: 0;
  }
}

/* Light theme for AI button */
:global([data-theme="light"]) .ai-btn {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
  border-color: rgba(59, 130, 246, 0.3);
}

:global([data-theme="light"]) .ai-btn:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

:global([data-theme="light"]) .ai-icon {
  color: rgba(59, 130, 246, 1);
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3));
}

:global([data-theme="light"]) .ai-btn:hover .ai-icon {
  color: rgba(37, 99, 235, 1);
}

:global([data-theme="light"]) .ai-text {
  color: rgba(59, 130, 246, 1);
  text-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
}

:global([data-theme="light"]) .ai-btn:hover .ai-text {
  color: rgba(37, 99, 235, 1);
  text-shadow: 0 0 15px rgba(37, 99, 235, 0.3);
}

:global([data-theme="light"]) .ai-badge-mini {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

:global([data-theme="light"]) .ai-btn-glow {
  background: radial-gradient(circle at center, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
}

:global([data-theme="light"]) .ai-particles .particle {
  background: rgba(59, 130, 246, 0.5);
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
  .desktop-only {
    display: none;
  }
  .mobile-only {
    display: flex;
  }
  .timeframe-expand {
    margin-left: 8px;
    gap: 4px;
    padding: 4px;
  }
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

/* Mobile responsiveness for AI button */
@media (max-width: 768px) {
  .ai-btn {
    height: 32px;
    padding: 0 14px;
  }
  
  .ai-icon {
    width: 16px;
    height: 16px;
  }
  
  .ai-text {
    font-size: 13px;
  }
  
  .ai-badge-mini {
    font-size: 8px;
    padding: 2px 5px;
  }
}

@media (max-width: 480px) {
  .ai-btn {
    height: 30px;
    padding: 0 12px;
  }
  
  .ai-icon {
    width: 15px;
    height: 15px;
  }
  
  .ai-text {
    font-size: 12px;
  }
}

 

/* Smooth transitions for theme changes */
* {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}

/* Scroll Arrow Button */
.menu-scroll-arrow {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--menu-active-bg);
  border: 1.5px solid var(--menu-glow);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 
    0 4px 12px var(--menu-glow),
    0 2px 6px rgba(0, 0, 0, 0.2);
  animation: pulse-arrow 2s ease-in-out infinite;
  
  /* WebView touch support */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

.menu-scroll-arrow:hover {
  transform: translateY(-50%) scale(1.1);
  box-shadow: 
    0 6px 20px var(--menu-glow),
    0 3px 10px rgba(0, 0, 0, 0.3);
}

.menu-scroll-arrow:active {
  transform: translateY(-50%) scale(0.95);
}

.menu-scroll-arrow svg {
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

/* Arrow pulse animation */
@keyframes pulse-arrow {
  0%, 100% {
    transform: translateY(-50%) scale(1);
    box-shadow: 
      0 4px 12px var(--menu-glow),
      0 2px 6px rgba(0, 0, 0, 0.2);
  }
  50% {
    transform: translateY(-50%) scale(1.05);
    box-shadow: 
      0 6px 18px var(--menu-glow),
      0 3px 8px rgba(0, 0, 0, 0.25);
  }
}

/* Dark theme arrow styles */
:global([data-theme="dark"]) .menu-scroll-arrow {
  background: linear-gradient(135deg, #8a2be2 0%, #9932cc 100%);
  border-color: rgba(138, 43, 226, 0.6);
}

:global([data-theme="dark"]) .menu-scroll-arrow:hover {
  border-color: rgba(138, 43, 226, 0.8);
}

/* Light theme arrow styles */
:global([data-theme="light"]) .menu-scroll-arrow {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 
    0 4px 12px rgba(59, 130, 246, 0.4),
    0 2px 6px rgba(0, 0, 0, 0.1);
}

:global([data-theme="light"]) .menu-scroll-arrow:hover {
  border-color: rgba(59, 130, 246, 0.8);
  box-shadow: 
    0 6px 20px rgba(59, 130, 246, 0.5),
    0 3px 10px rgba(0, 0, 0, 0.15);
}

/* Mobile responsiveness for scroll arrow */
@media (max-width: 768px) {
  .menu-scroll-arrow {
    width: 32px;
    height: 32px;
    right: 6px;
  }
  
  .menu-scroll-arrow svg {
    width: 18px;
    height: 18px;
  }
}

@media (max-width: 480px) {
  .menu-scroll-arrow {
    width: 30px;
    height: 30px;
    right: 4px;
  }
  
  .menu-scroll-arrow svg {
    width: 16px;
    height: 16px;
  }
}
</style>