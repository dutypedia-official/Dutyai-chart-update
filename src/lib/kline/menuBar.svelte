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
        // IMMEDIATELY reapply saved chart styles BEFORE layout changes
        // This prevents the default color flicker
        if ($chart && $save.styles) {
          (window as any).__forceApplySavedCanvasColors = true;
          const styles = getThemeStyles($save.theme);
          _.merge(styles, $save.styles);
          $chart.setStyles(processLineChartStyles(styles));
          
          if ($ctx.applyCanvasColors) {
            $ctx.applyCanvasColors();
          }
          console.log('🎨 Pre-applied chart styles before fullscreen exit');
        }
        
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
          
          // Reapply immediately after first resize
          if ($chart && $save.styles) {
            (window as any).__forceApplySavedCanvasColors = true;
            const styles = getThemeStyles($save.theme);
            _.merge(styles, $save.styles);
            $chart.setStyles(processLineChartStyles(styles));
            if ($ctx.applyCanvasColors) {
              $ctx.applyCanvasColors();
            }
          }
        }, 10);
        
        setTimeout(() => {
          $chart?.resize();
          
          // Reapply again after second resize
          if ($chart && $save.styles) {
            (window as any).__forceApplySavedCanvasColors = true;
            const styles = getThemeStyles($save.theme);
            _.merge(styles, $save.styles);
            $chart.setStyles(processLineChartStyles(styles));
            if ($ctx.applyCanvasColors) {
              $ctx.applyCanvasColors();
            }
          }
        }, 100);
        
        setTimeout(() => {
          $chart?.resize();
          
          // Reapply with forced canvas redraw
          if ($chart && $save.styles) {
            (window as any).__forceApplySavedCanvasColors = true;
            
            const styles = getThemeStyles($save.theme);
            _.merge(styles, $save.styles);
            $chart.setStyles(processLineChartStyles(styles));
            
            if ($ctx.applyCanvasColors) {
              $ctx.applyCanvasColors();
              
              // Force chart to redraw by scrolling to current position
              const visibleRange = $chart.getVisibleRange();
              if (visibleRange) {
                $chart.scrollToDataIndex(visibleRange.to, 0);
              }
            }
            console.log('✅ Final chart colors applied after fullscreen exit');
          }
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
        const wasFullscreen = fullScreen;
        
        if (fullScreen !== isIOSFullscreen) {
          console.log(`🔄 iOS fullscreen state changed: ${fullScreen} → ${isIOSFullscreen}`);
          fullScreen = isIOSFullscreen;
          
          // If exiting fullscreen on iOS, pre-apply styles immediately
          if (wasFullscreen && !isIOSFullscreen && $chart && $save.styles) {
            (window as any).__forceApplySavedCanvasColors = true;
            const styles = getThemeStyles($save.theme);
            _.merge(styles, $save.styles);
            $chart.setStyles(processLineChartStyles(styles));
            if ($ctx.applyCanvasColors) {
              $ctx.applyCanvasColors();
            }
            console.log('🎨 Pre-applied chart styles for iOS exit');
          }
          
          // Trigger resize after fullscreen state change
          console.log('📏 Scheduling iOS chart resizes...');
          setTimeout(() => {
            $chart?.resize();
            
            // Reapply after first resize
            if (wasFullscreen && !isIOSFullscreen && $chart && $save.styles) {
              (window as any).__forceApplySavedCanvasColors = true;
              const styles = getThemeStyles($save.theme);
              _.merge(styles, $save.styles);
              $chart.setStyles(processLineChartStyles(styles));
              if ($ctx.applyCanvasColors) {
                $ctx.applyCanvasColors();
              }
            }
          }, 100);
          
          setTimeout(() => {
            $chart?.resize();
            
            // If exiting fullscreen on iOS, reapply saved chart styles
            if (wasFullscreen && !isIOSFullscreen && $chart && $save.styles) {
              (window as any).__forceApplySavedCanvasColors = true;
              
              const styles = getThemeStyles($save.theme);
              _.merge(styles, $save.styles);
              $chart.setStyles(processLineChartStyles(styles));
              
              if ($ctx.applyCanvasColors) {
                $ctx.applyCanvasColors();
                
                // Force chart to redraw by scrolling to current position
                const visibleRange = $chart.getVisibleRange();
                if (visibleRange) {
                  $chart.scrollToDataIndex(visibleRange.to, 0);
                }
              }
              console.log('✅ Final iOS chart colors applied');
            }
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
    { id: 'renko_atr', name: 'Duty AI Renko', icon: 'candle_solid' },
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
    } else if (typeId === 'renko_atr') {
      console.log('🎯 Setting up RENKO (ATR) chart from menuBar');
      $save.styles.candle.type = 'renko_atr';
      // Initialize default Renko settings if missing
      if (!$save.styles.candle.renko) {
        ($save.styles.candle as any).renko = {
          method: 'ATR',
          atrLength: 14,
          source: 'close',
          wick: false
        };
      }
      delete $save.styles.candle._isLineChart;
      delete $save.styles.candle.area;
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
    const currentType = $save.styles?.candle?.type || 'renko_atr';
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
  
  let isPlaying = $state(false);
  let currentSpeed = $state(1);
  
  function handleWhatNext() {
    try {
      if (typeof window !== 'undefined' && (window as any).predictNextCandle) {
        (window as any).predictNextCandle();
        // Toggle state
        if ((window as any).getAutoPlayState) {
          isPlaying = (window as any).getAutoPlayState();
        }
        if ((window as any).getPlaybackSpeed) {
          currentSpeed = (window as any).getPlaybackSpeed();
        }
      } else {
        console.error('❌ Prediction function not available');
      }
    } catch (error) {
      console.error('❌ Error calling prediction function:', error);
    }
  }

  function handleSpeedChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const newSpeed = parseFloat(target.value);
    currentSpeed = newSpeed;
    
    try {
      if (typeof window !== 'undefined' && (window as any).setPlaybackSpeed) {
        (window as any).setPlaybackSpeed(newSpeed);
      }
    } catch (error) {
      console.error('❌ Error changing speed:', error);
    }
  }

  function handleStop() {
    try {
      if (typeof window !== 'undefined' && (window as any).stopPrediction) {
        (window as any).stopPrediction();
        isPlaying = false;
      }
    } catch (error) {
      console.error('❌ Error stopping prediction:', error);
    }
  }

  function clickScreenShot(){
    // If user selected gradient background, composite chart over generated gradient
    const isGradient = _.get($save.styles, 'backgroundType') === 'gradient';
    const gradientCfg: any = _.get($save.styles, 'backgroundGradient');
    const hasGradient = isGradient && gradientCfg && Array.isArray(gradientCfg.stops) && gradientCfg.stops.length > 0;
    const toRgba = (hex: string, alpha: number) => {
      const clean = (hex || '#000000').replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16) || 0;
      const g = parseInt(clean.substring(2, 4), 16) || 0;
      const b = parseInt(clean.substring(4, 6), 16) || 0;
      const a = Math.max(0, Math.min(1, alpha ?? 1));
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    };
    if (hasGradient) {
      requestAnimationFrame(() => {
        try {
          const transparentUrl = $chart?.getConvertPictureUrl(true, 'png', 'rgba(0, 0, 0, 0)');
          if (!transparentUrl) {
            return;
          }
          const img = new Image();
          img.onload = () => {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            let grad: CanvasGradient;
            const type = gradientCfg.type === 'radial' ? 'radial' : 'linear';
            if (type === 'radial') {
              grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
            } else {
              const cssDeg = typeof gradientCfg.direction === 'number' ? gradientCfg.direction : 90;
              // Map CSS linear-gradient angle (0deg = up) to canvas angle (0rad = right, y down)
              const rad = ((cssDeg - 90) * Math.PI) / 180;
              const x = Math.cos(rad);
              const y = Math.sin(rad);
              const x0 = w / 2 - (w / 2) * x;
              const y0 = h / 2 - (h / 2) * y;
              const x1 = w / 2 + (w / 2) * x;
              const y1 = h / 2 + (h / 2) * y;
              grad = ctx.createLinearGradient(x0, y0, x1, y1);
            }
            const stops = [...gradientCfg.stops].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
            stops.forEach((s: any) => {
              const pos = Math.max(0, Math.min(1, (s.position ?? 0) / 100));
              const col = toRgba(s.color, (s.opacity ?? 100) / 100);
              grad.addColorStop(pos, col);
            });
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            screenShotUrl = canvas.toDataURL('image/png');
            showScreenShotModal = true;
          };
          img.src = transparentUrl;
        } catch (_) {
          let fallback = $save.theme === 'dark' ? '#151517' : '#ffffff';
          screenShotUrl = $chart?.getConvertPictureUrl(true, 'jpeg', fallback) ?? '';
          showScreenShotModal = true;
        }
      });
      return;
    }
    // Solid background: use currently applied background color
    let effectiveBg: string | undefined;
    try {
      const widget = document.querySelector('.kline-widget') as HTMLElement | null;
      const main = document.querySelector('.kline-main') as HTMLElement | null;
      const pickCssVar = (el: HTMLElement | null) => {
        if (!el) return '';
        const val = getComputedStyle(el).getPropertyValue('--chart-background-color').trim();
        if (val && !val.includes('gradient')) return val;
        return '';
      };
      effectiveBg = pickCssVar(widget) || pickCssVar(main) || undefined;
      if (!effectiveBg && $chart && typeof $chart.getStyles === 'function') {
        const styles = $chart.getStyles() ?? {};
        effectiveBg =
          _.get(styles, 'pane.backgroundColor') ||
          _.get(styles, 'candle.pane.backgroundColor') ||
          undefined;
      }
      if (!effectiveBg) {
        const savedSolid = _.get($save.styles, 'backgroundColor') as string | undefined;
        effectiveBg = savedSolid && typeof savedSolid === 'string' ? savedSolid : undefined;
      }
    } catch (_) {}
    if (!effectiveBg) {
      effectiveBg = $save.theme === 'dark' ? '#151517' : '#ffffff';
    }
    requestAnimationFrame(() => {
      screenShotUrl = $chart?.getConvertPictureUrl(true, 'jpeg', effectiveBg as string) ?? '';
      showScreenShotModal = true;
    });
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
    
    // IMMEDIATELY pre-apply saved chart styles before exit to prevent flicker
    if ($chart && $save.styles) {
      (window as any).__forceApplySavedCanvasColors = true;
      const styles = getThemeStyles($save.theme);
      _.merge(styles, $save.styles);
      $chart.setStyles(processLineChartStyles(styles));
      if ($ctx.applyCanvasColors) {
        $ctx.applyCanvasColors();
      }
      console.log('🎨 Pre-applied styles before iOS exit');
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
      
      // Multiple resize attempts with immediate style reapplication
      setTimeout(() => {
        console.log('📏 First chart resize...');
        $chart?.resize();
        
        // Reapply immediately after first resize
        if ($chart && $save.styles) {
          (window as any).__forceApplySavedCanvasColors = true;
          const styles = getThemeStyles($save.theme);
          _.merge(styles, $save.styles);
          $chart.setStyles(processLineChartStyles(styles));
          if ($ctx.applyCanvasColors) {
            $ctx.applyCanvasColors();
          }
        }
      }, 10);
      
      setTimeout(() => {
        $chart?.resize();
        
        // Reapply after second resize
        if ($chart && $save.styles) {
          (window as any).__forceApplySavedCanvasColors = true;
          const styles = getThemeStyles($save.theme);
          _.merge(styles, $save.styles);
          $chart.setStyles(processLineChartStyles(styles));
          if ($ctx.applyCanvasColors) {
            $ctx.applyCanvasColors();
          }
        }
      }, 100);
      
      setTimeout(() => {
        $chart?.resize();
        
        // Final reapplication with forced canvas redraw
        if ($chart && $save.styles) {
          (window as any).__forceApplySavedCanvasColors = true;
          
          const styles = getThemeStyles($save.theme);
          _.merge(styles, $save.styles);
          $chart.setStyles(processLineChartStyles(styles));
          
          if ($ctx.applyCanvasColors) {
            $ctx.applyCanvasColors();
            
            // Force chart to redraw by scrolling to current position
            const visibleRange = $chart.getVisibleRange();
            if (visibleRange) {
              $chart.scrollToDataIndex(visibleRange.to, 0);
            }
          }
          console.log('✅ Final iOS chart colors applied after exit');
        }
      }, 300);
      
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
    console.log('💾 SaveAsSelectSave triggered with layoutId:', layoutId);
    
    if (typeof window !== 'undefined' && (window as any).saveManager) {
      const saveManager = (window as any).saveManager;
      console.log('✅ SaveManager found, calling saveTo...');
      
      const result = await saveManager.saveTo(layoutId);
      if (result.success) {
        console.log('✅ Save to existing successful');
        showSaveAsSelectModal = false;
      } else {
        console.error('❌ Save to existing failed:', result.error);
      }
    } else {
      console.error('❌ SaveManager not available');
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
    
    try {
      menuContainerRef.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    } catch (_) {
      // Fallback for WebView implementations without smooth scroll
      menuContainerRef.scrollLeft = targetScroll;
    }
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

    <!-- Symbol Search Section - Professional TradingView Style -->
    <div class="symbol-search-section" onclick={() => showSymbolModal = true}>
      <div class="symbol-search-content">
        <div class="symbol-search-icon">
          <Search class="search-icon" />
        </div>
        <span class="symbol-name">{showName}</span>
      </div>
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
        aria-label="AI Indicators"
        title="AI Powered Indicators"
        type="button"
      >
        <!-- Continuous Glitter Animation Background -->
        <div class="ai-glitter-bg"></div>
        
        <!-- Glitter particles -->
        <div class="ai-glitter-particle ai-glitter-1"></div>
        <div class="ai-glitter-particle ai-glitter-2"></div>
        <div class="ai-glitter-particle ai-glitter-3"></div>
        <div class="ai-glitter-particle ai-glitter-4"></div>
        <div class="ai-glitter-particle ai-glitter-5"></div>
        
        <!-- Shine sweep effect -->
        <div class="ai-shine-sweep"></div>
        
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
      </button>
    </div>

    <!-- Chart Type Section - Professional Style -->
    <div class="chart-type-section">
      <button 
        class="pro-menu-btn" 
        onclick={() => showChartTypeModal = true}
        title="Chart Type"
      >
        <KlineIcon name={getCurrentChartType().icon} size={16}/>
        <span class="pro-menu-text">{getCurrentChartType().name}</span>
      </button>
    </div>

    <!-- Indicator Section - Professional Style -->
    <div class="indicator-section">
      <button 
        class="pro-menu-btn" 
        onclick={() => showIndSearchModal = true}
        title="Indicators"
      >
        <KlineIcon name="indicator" size={16}/>
        <span class="pro-menu-text">{m.indicator()}</span>
      </button>
    </div>
    
    <!-- Undo/Redo Section -->
    <div class="undo-redo-section">
      <button 
        class="undo-redo-btn {!canUndo ? 'undo-redo-disabled' : ''}"
        onclick={canUndo ? handleUndo : undefined}
        title="Undo (Ctrl+Z)"
      >
        <KlineIcon class="undo-redo-icon" name="undo" size={16}/>
      </button>
      <button 
        class="undo-redo-btn {!canRedo ? 'undo-redo-disabled' : ''}"
        onclick={canRedo ? handleRedo : undefined}
        title="Redo (Ctrl+Y)"
      >
        <KlineIcon class="undo-redo-icon" name="redo" size={16}/>
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
    <!-- Load Chart Button - Professional Style -->
    <button
      class="pro-menu-btn pro-menu-btn-icon-only"
      onclick={handleShowLoadPopup}
      title="Load Chart Layout"
      type="button"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 8l-3-3m3 3l3-3" />
      </svg>
    </button>
    
    <!-- What Next Prediction Button / Speed Controller - Professional Style -->
    {#if !isPlaying}
      <button 
        class="pro-menu-btn pro-menu-btn-icon-only"
        onclick={handleWhatNext}
        title="Play Prediction"
        type="button"
      >
        <KlineIcon name="play" size={18}/>
      </button>
    {:else}
      <div class="speed-controller">
        <input 
          type="range" 
          min="0.5" 
          max="10" 
          step="0.5" 
          value={currentSpeed}
          oninput={handleSpeedChange}
          class="speed-slider"
          title="Speed: {currentSpeed}x"
        />
        <span class="speed-label">{currentSpeed}x</span>
        <button 
          onclick={handleStop}
          class="pro-menu-btn pro-menu-btn-icon-only stop-btn"
          title="Stop"
          type="button"
        >
          ⏹
        </button>
      </div>
    {/if}
    
    <!-- Professional Icon Buttons -->
    <button 
      class="pro-menu-btn pro-menu-btn-icon-only"
      onclick={() => showTimezoneModal = true}
      title="Timezone"
      type="button"
    >
      <KlineIcon name="timezone" size={18}/>
    </button>
    
    <button 
      class="pro-menu-btn pro-menu-btn-icon-only"
      onclick={() => showChartSettingModal = true}
      title="Settings"
      type="button"
    >
      <KlineIcon name="setting" size={18}/>
    </button>
    
    <button 
      class="pro-menu-btn pro-menu-btn-icon-only"
      onclick={clickScreenShot}
      title="Screenshot"
      type="button"
    >
      <KlineIcon name="screenShot" size={18}/>
    </button>
    
    <button 
      class="pro-menu-btn pro-menu-btn-icon-only"
      onclick={() => {
        debugLog('🖱️ Fullscreen button clicked!');
        toggleFullscreen();
      }}
      title={fullScreen ? "Exit Fullscreen" : "Fullscreen"}
      type="button"
    >
      <KlineIcon name={fullScreen ? "exitFullScreen" : "fullScreen"} size={18}/>
    </button>
    
    <button 
      class="pro-menu-btn pro-menu-btn-icon-only"
      onclick={toggleTheme}
      title="Toggle Theme"
      type="button"
    >
      <KlineIcon name="theme" size={20}/>
    </button>
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
            <svg width="20" height="20" viewBox="0 0 448 448" fill="none" xmlns="http://www.w3.org/2000/svg">
              {#if isRotated}
                <!-- Rotate icon - counter-clockwise (exit rotation) -->
                <path d="M322.402 1.33524C319.002 2.83524 282.402 41.3352 279.802 46.2352C277.602 50.4352 277.602 56.6352 279.802 60.9352C282.102 65.5352 317.402 107.535 320.802 109.735C324.702 112.235 335.002 112.035 338.602 109.335C345.002 104.635 347.402 97.6352 345.002 90.4352C344.302 88.4352 340.902 83.3352 337.402 79.1352C333.902 74.9352 331.302 71.3352 331.502 71.1352C331.702 70.8352 334.802 71.2352 338.202 71.8352C379.802 79.7352 409.802 111.735 415.002 153.835C416.302 163.835 417.802 167.035 422.702 170.435C430.002 175.335 440.902 173.135 445.702 165.735C448.202 162.135 448.302 161.435 447.702 152.135C446.102 124.435 432.902 96.5352 411.102 74.9352C390.202 54.0352 367.102 42.7352 336.702 38.4352L331.902 37.8352L338.402 30.9352C345.302 23.5352 347.002 18.9352 345.502 12.0352C343.502 2.73524 331.702 -2.66476 322.402 1.33524Z" fill="currentColor"/>
                <path d="M169.504 40.9358C163.204 42.2358 157.004 44.7358 152.004 47.9358C149.504 49.5358 125.204 73.2358 97.8044 100.636C44.9044 153.736 44.8044 153.936 41.4044 167.236C39.3044 175.336 40.0044 188.336 43.0044 196.136C44.1044 199.336 47.1044 204.436 49.4044 207.636C51.8044 210.836 95.8043 255.336 147.104 306.536C217.704 376.836 241.704 400.236 245.604 402.236C259.904 409.736 277.304 409.836 292.304 402.336C296.404 400.336 308.404 388.836 348.304 349.136C393.904 303.636 399.404 297.736 402.504 291.736C406.904 282.936 408.404 275.436 407.704 265.436C407.104 255.636 404.304 247.836 398.604 240.236C396.204 237.036 352.404 192.736 301.404 141.836C200.004 40.8358 204.204 44.5358 189.304 41.4358C181.904 39.8358 175.704 39.7358 169.504 40.9358ZM185.804 74.8358C187.904 75.9358 229.704 117.136 281.704 169.136C363.504 251.136 373.904 261.836 374.504 265.236C376.204 274.436 377.804 272.436 326.204 324.336C299.004 351.536 277.104 372.736 275.304 373.536C270.904 375.436 266.604 375.336 262.204 373.036C257.604 370.636 76.8043 189.636 74.6043 185.236C72.4043 180.936 72.6043 175.636 75.0043 170.936C78.3043 164.336 78.8044 164.436 94.8044 172.336C108.704 179.136 109.704 179.436 117.404 179.736C123.904 180.036 126.704 179.636 131.504 177.936C136.904 175.836 139.304 173.836 156.604 156.536C173.904 139.236 175.904 136.836 178.004 131.436C179.704 126.636 180.104 123.836 179.804 117.336C179.504 109.636 179.204 108.636 172.404 94.7358C164.504 78.8358 164.504 78.3358 170.804 74.9358C175.604 72.4358 181.104 72.4358 185.804 74.8358ZM133.404 133.036L119.404 147.036L112.204 143.736L105.004 140.436L122.804 122.636L140.504 104.936L144.004 111.936L147.504 118.936L133.404 133.036Z" fill="currentColor"/>
                <path d="M310.402 275.936C308.602 276.336 305.902 277.536 304.402 278.736C299.102 282.436 278.102 304.436 277.102 307.336C275.502 311.236 275.802 318.536 277.502 321.836C280.902 328.436 288.102 331.836 295.802 330.436C298.802 329.836 302.002 327.236 313.902 315.636C321.802 307.836 328.902 300.036 329.602 298.236C334.902 285.836 323.602 272.736 310.402 275.936Z" fill="currentColor"/>
                <path d="M7.40372 276.837C-0.296283 281.537 -1.79628 290.337 2.00372 309.037C12.9037 362.537 55.5037 401.637 111.304 409.437L116.104 410.037L109.604 416.937C102.704 424.337 101.004 428.937 102.504 435.837C104.504 445.137 116.004 450.537 125.304 446.537C128.904 445.037 165.304 407.037 168.304 401.637C170.504 397.537 170.504 391.337 168.204 386.937C165.904 382.337 130.604 340.337 127.204 338.137C123.304 335.637 113.004 335.837 109.404 338.537C103.004 343.237 100.604 350.237 103.004 357.437C103.704 359.437 107.104 364.537 110.604 368.737C114.104 372.937 116.704 376.537 116.504 376.737C116.304 377.037 113.204 376.637 109.804 376.037C79.4037 370.237 54.9037 351.637 41.9037 324.437C36.6037 313.337 34.4037 305.937 32.9037 293.737C31.7037 284.037 30.2037 280.837 25.3037 277.437C20.5037 274.237 12.1037 273.937 7.40372 276.837Z" fill="currentColor"/>
              {:else}
                <!-- Rotate icon - clockwise (enter rotation) -->
                <path d="M322.402 1.33524C319.002 2.83524 282.402 41.3352 279.802 46.2352C277.602 50.4352 277.602 56.6352 279.802 60.9352C282.102 65.5352 317.402 107.535 320.802 109.735C324.702 112.235 335.002 112.035 338.602 109.335C345.002 104.635 347.402 97.6352 345.002 90.4352C344.302 88.4352 340.902 83.3352 337.402 79.1352C333.902 74.9352 331.302 71.3352 331.502 71.1352C331.702 70.8352 334.802 71.2352 338.202 71.8352C379.802 79.7352 409.802 111.735 415.002 153.835C416.302 163.835 417.802 167.035 422.702 170.435C430.002 175.335 440.902 173.135 445.702 165.735C448.202 162.135 448.302 161.435 447.702 152.135C446.102 124.435 432.902 96.5352 411.102 74.9352C390.202 54.0352 367.102 42.7352 336.702 38.4352L331.902 37.8352L338.402 30.9352C345.302 23.5352 347.002 18.9352 345.502 12.0352C343.502 2.73524 331.702 -2.66476 322.402 1.33524Z" fill="currentColor"/>
                <path d="M169.504 40.9358C163.204 42.2358 157.004 44.7358 152.004 47.9358C149.504 49.5358 125.204 73.2358 97.8044 100.636C44.9044 153.736 44.8044 153.936 41.4044 167.236C39.3044 175.336 40.0044 188.336 43.0044 196.136C44.1044 199.336 47.1044 204.436 49.4044 207.636C51.8044 210.836 95.8043 255.336 147.104 306.536C217.704 376.836 241.704 400.236 245.604 402.236C259.904 409.736 277.304 409.836 292.304 402.336C296.404 400.336 308.404 388.836 348.304 349.136C393.904 303.636 399.404 297.736 402.504 291.736C406.904 282.936 408.404 275.436 407.704 265.436C407.104 255.636 404.304 247.836 398.604 240.236C396.204 237.036 352.404 192.736 301.404 141.836C200.004 40.8358 204.204 44.5358 189.304 41.4358C181.904 39.8358 175.704 39.7358 169.504 40.9358ZM185.804 74.8358C187.904 75.9358 229.704 117.136 281.704 169.136C363.504 251.136 373.904 261.836 374.504 265.236C376.204 274.436 377.804 272.436 326.204 324.336C299.004 351.536 277.104 372.736 275.304 373.536C270.904 375.436 266.604 375.336 262.204 373.036C257.604 370.636 76.8043 189.636 74.6043 185.236C72.4043 180.936 72.6043 175.636 75.0043 170.936C78.3043 164.336 78.8044 164.436 94.8044 172.336C108.704 179.136 109.704 179.436 117.404 179.736C123.904 180.036 126.704 179.636 131.504 177.936C136.904 175.836 139.304 173.836 156.604 156.536C173.904 139.236 175.904 136.836 178.004 131.436C179.704 126.636 180.104 123.836 179.804 117.336C179.504 109.636 179.204 108.636 172.404 94.7358C164.504 78.8358 164.504 78.3358 170.804 74.9358C175.604 72.4358 181.104 72.4358 185.804 74.8358ZM133.404 133.036L119.404 147.036L112.204 143.736L105.004 140.436L122.804 122.636L140.504 104.936L144.004 111.936L147.504 118.936L133.404 133.036Z" fill="currentColor"/>
                <path d="M310.402 275.936C308.602 276.336 305.902 277.536 304.402 278.736C299.102 282.436 278.102 304.436 277.102 307.336C275.502 311.236 275.802 318.536 277.502 321.836C280.902 328.436 288.102 331.836 295.802 330.436C298.802 329.836 302.002 327.236 313.902 315.636C321.802 307.836 328.902 300.036 329.602 298.236C334.902 285.836 323.602 272.736 310.402 275.936Z" fill="currentColor"/>
                <path d="M7.40372 276.837C-0.296283 281.537 -1.79628 290.337 2.00372 309.037C12.9037 362.537 55.5037 401.637 111.304 409.437L116.104 410.037L109.604 416.937C102.704 424.337 101.004 428.937 102.504 435.837C104.504 445.137 116.004 450.537 125.304 446.537C128.904 445.037 165.304 407.037 168.304 401.637C170.504 397.537 170.504 391.337 168.204 386.937C165.904 382.337 130.604 340.337 127.204 338.137C123.304 335.637 113.004 335.837 109.404 338.537C103.004 343.237 100.604 350.237 103.004 357.437C103.704 359.437 107.104 364.537 110.604 368.737C114.104 372.937 116.704 376.537 116.504 376.737C116.304 377.037 113.204 376.637 109.804 376.037C79.4037 370.237 54.9037 351.637 41.9037 324.437C36.6037 313.337 34.4037 305.937 32.9037 293.737C31.7037 284.037 30.2037 280.837 25.3037 277.437C20.5037 274.237 12.1037 273.937 7.40372 276.837Z" fill="currentColor"/>
              {/if}
            </svg>
          </div>
        </div>
        <div class="menu-btn-glow"></div>
      </button>
    </div>
  </div>
</div>

<!-- Scroll Arrow Indicator -->
{#if showScrollArrow}
  <button 
    class="menu-scroll-arrow"
    onclick={(e) => handleScrollArrowClick(e)}
    ontouchstart={(e) => handleScrollArrowTouch(e)}
    ontouchend={(e) => { e.preventDefault(); e.stopPropagation(); }}
    onpointerdown={(e) => handleScrollArrowClick(e)}
    title="Scroll to see more"
    aria-label="Scroll right"
    type="button"
  >
    <span class="arrow-icon">
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
    </span>
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

/* Main Container - Transparent Background for Chart Integration */
.menu-container {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 44px;
  padding: 0 16px;
  background: var(--menu-bg);
  border-bottom: 1px solid var(--menu-border);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: var(--menu-shadow);
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* CSS Variables for Theming - Transparent Background for Chart Integration */
:global([data-theme="dark"]) {
  /* Dark Mode - Transparent with subtle tint */
  --menu-bg: rgba(15, 15, 25, 0.4);
  --menu-border: rgba(139, 92, 246, 0.15);
  --menu-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  --menu-text: rgba(255, 255, 255, 0.95);
  --menu-text-secondary: rgba(255, 255, 255, 0.7);
  --menu-hover-bg: rgba(139, 92, 246, 0.2);
  --menu-active-bg: rgba(139, 92, 246, 0.25);
  --menu-glow: rgba(139, 92, 246, 0.4);
  --menu-btn-bg: rgba(255, 255, 255, 0.06);
  --menu-btn-border: rgba(139, 92, 246, 0.2);
  --menu-btn-hover-border: rgba(139, 92, 246, 0.35);
  --menu-right-btn-bg: rgba(20, 18, 35, 0.5);
  --menu-accent: #8b5cf6;
  --menu-accent-hover: #a78bfa;
  --menu-surface: rgba(30, 27, 45, 0.5);
  --menu-surface-hover: rgba(40, 35, 55, 0.6);
}

:global([data-theme="light"]) {
  /* Light Mode - Transparent with subtle tint */
  --menu-bg: rgba(255, 255, 255, 0.4);
  --menu-border: rgba(59, 130, 246, 0.12);
  --menu-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  --menu-text: rgba(17, 24, 39, 0.95);
  --menu-text-secondary: rgba(17, 24, 39, 0.7);
  --menu-hover-bg: rgba(59, 130, 246, 0.12);
  --menu-active-bg: rgba(59, 130, 246, 0.18);
  --menu-glow: rgba(59, 130, 246, 0.2);
  --menu-btn-bg: rgba(0, 0, 0, 0.03);
  --menu-btn-border: rgba(59, 130, 246, 0.15);
  --menu-btn-hover-border: rgba(59, 130, 246, 0.3);
  --menu-right-btn-bg: rgba(255, 255, 255, 0.5);
  --menu-accent: #3b82f6;
  --menu-accent-hover: #2563eb;
  --menu-surface: rgba(249, 250, 251, 0.6);
  --menu-surface-hover: rgba(243, 244, 246, 0.7);
}

/* Left Section - Professional Spacing */
.menu-left-section {
  display: flex;
  align-items: center;
  height: 100%;
  flex-shrink: 0;
  gap: 10px;
}

/* Right Section - Professional Spacing */
.menu-right-section {
  display: flex;
  align-items: center;
  height: 100%;
  flex-shrink: 0;
  margin-left: auto;
  gap: 6px;
  padding-right: 4px;
}

/* Professional Save/Load Button Styling */
:global(.menu-right-section .btn) {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid var(--menu-btn-border);
  background: var(--menu-btn-bg);
  color: var(--menu-text);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

:global(.menu-right-section .btn:hover) {
  background: var(--menu-hover-bg);
  border-color: var(--menu-btn-hover-border);
  transform: none;
}

:global(.menu-right-section .btn-primary) {
  background: var(--menu-active-bg);
  border-color: var(--menu-accent);
  color: var(--menu-text);
}

:global(.menu-right-section .btn-primary:hover) {
  background: var(--menu-active-bg);
  border-color: var(--menu-accent-hover);
  opacity: 0.9;
}

:global(.menu-right-section .btn svg) {
  width: 16px;
  height: 16px;
  shape-rendering: geometricPrecision;
}

/* Menu Button Styles - Professional TradingView Style */
.menu-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  background: var(--menu-btn-bg);
  border: 1px solid var(--menu-btn-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.menu-btn:hover {
  background: var(--menu-hover-bg);
  border-color: var(--menu-btn-hover-border);
}

.menu-btn-active {
  background: var(--menu-active-bg);
  border-color: var(--menu-accent);
  color: var(--menu-text);
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
  font-size: 13px;
  font-weight: 500;
  color: var(--menu-text);
  white-space: nowrap;
  letter-spacing: 0;
  position: relative;
  z-index: 1;
}

.menu-btn-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, var(--menu-glow) 0%, transparent 70%);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translate(-50%, -50%);
  z-index: 0;
  pointer-events: none;
}

.menu-btn:hover .menu-btn-glow {
  width: 120%;
  height: 120%;
  opacity: 0.2;
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
  width: 36px;
  height: 32px;
  background: var(--menu-btn-bg);
  border: 1px solid var(--menu-btn-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.menu-toggle-btn:hover {
  background: var(--menu-hover-bg);
  border-color: var(--menu-btn-hover-border);
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
  fill: var(--menu-accent);
  transform: scale(1.05);
}

.menu-toggle-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, var(--menu-glow) 0%, transparent 70%);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translate(-50%, -50%);
  z-index: 0;
  pointer-events: none;
}

.menu-toggle-btn:hover .menu-toggle-glow {
  width: 120%;
  height: 120%;
  opacity: 0.2;
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
  height: 32px;
  padding: 0 16px;
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
  font-weight: 500;
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

/* Symbol Search Section - Professional TradingView Style */
.symbol-search-section {
  position: relative;
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 14px;
  background: var(--menu-btn-bg);
  border: 1px solid var(--menu-btn-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 140px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.symbol-search-section:hover {
  background: var(--menu-hover-bg);
  border-color: var(--menu-btn-hover-border);
}

.symbol-search-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.symbol-search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.symbol-search-icon :global(.search-icon) {
  width: 14px;
  height: 14px;
  color: var(--menu-text-secondary);
  transition: color 0.2s ease;
}

.symbol-search-section:hover .symbol-search-icon :global(.search-icon) {
  color: var(--menu-text);
}

.symbol-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--menu-text);
  white-space: nowrap;
  letter-spacing: 0;
  flex: 1;
  text-align: left;
}

/* Timeframe Section - Professional Style */
.timeframe-section {
  display: flex;
  align-items: center;
  margin-left: 12px;
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
  gap: 2px;
  background: var(--menu-surface);
  border: 1px solid var(--menu-btn-border);
  border-radius: 6px;
  padding: 2px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.timeframe-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 26px;
  padding: 0 10px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.timeframe-btn:hover {
  background: var(--menu-hover-bg);
}

.timeframe-btn-active {
  background: var(--menu-active-bg);
  color: var(--menu-text);
  font-weight: 600;
}

.timeframe-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--menu-text);
  white-space: nowrap;
  letter-spacing: 0;
  position: relative;
  z-index: 1;
}

.timeframe-more-btn .timeframe-text {
  font-size: 16px;
  line-height: 1;
}

.timeframe-inline-expand {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 2px;
}

.timeframe-btn-active .timeframe-text {
  color: var(--menu-text);
  font-weight: 600;
}

/* Chart Type and Indicator Sections - Professional Style */
.chart-type-section,
.indicator-section {
  display: flex;
  align-items: center;
  margin-left: 12px;
}

/* Professional Menu Button - TradingView Style */
.pro-menu-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  background: var(--menu-btn-bg);
  border: 1px solid var(--menu-btn-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px;
  font-weight: 500;
  color: var(--menu-text);
  white-space: nowrap;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.pro-menu-btn:hover {
  background: var(--menu-hover-bg);
  border-color: var(--menu-btn-hover-border);
}

.pro-menu-btn:active {
  transform: scale(0.98);
}

.pro-menu-btn-icon-only {
  padding: 0;
  width: 32px;
  min-width: 32px;
}

.pro-menu-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--menu-text);
  letter-spacing: 0;
}

/* AI Section - Professional Style */
.ai-section {
  display: flex;
  align-items: center;
  margin-left: 12px;
}

.ai-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  background: var(--menu-btn-bg);
  border: 1px solid var(--menu-btn-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  overflow: hidden;
}

.ai-btn:hover {
  background: var(--menu-hover-bg);
  border-color: var(--menu-btn-hover-border);
}

/* AI Glitter Animation Background */
.ai-glitter-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.1) 0%,
    rgba(59, 130, 246, 0.15) 25%,
    rgba(139, 92, 246, 0.1) 50%,
    rgba(59, 130, 246, 0.15) 75%,
    rgba(139, 92, 246, 0.1) 100%
  );
  background-size: 200% 200%;
  animation: ai-glitter-bg-shift 3s ease-in-out infinite;
  opacity: 0.6;
  z-index: 0;
}

:global([data-theme="light"]) .ai-glitter-bg {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.2) 0%,
    rgba(139, 92, 246, 0.3) 25%,
    rgba(59, 130, 246, 0.2) 50%,
    rgba(139, 92, 246, 0.3) 75%,
    rgba(59, 130, 246, 0.2) 100%
  );
  opacity: 0.8;
}

/* Glitter Particles */
.ai-glitter-particle {
  position: absolute;
  width: 3px;
  height: 3px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(139, 92, 246, 0.6);
}

:global([data-theme="light"]) .ai-glitter-particle {
  background: rgba(59, 130, 246, 0.9);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.9), 0 0 12px rgba(139, 92, 246, 0.8), 0 0 18px rgba(59, 130, 246, 0.6);
}

.ai-glitter-1 {
  top: 20%;
  left: 10%;
  animation: ai-glitter-float 2.5s ease-in-out infinite;
  animation-delay: 0s;
}

.ai-glitter-2 {
  top: 60%;
  left: 30%;
  animation: ai-glitter-float 3s ease-in-out infinite;
  animation-delay: 0.5s;
}

.ai-glitter-3 {
  top: 40%;
  left: 60%;
  animation: ai-glitter-float 2.8s ease-in-out infinite;
  animation-delay: 1s;
}

.ai-glitter-4 {
  top: 15%;
  left: 80%;
  animation: ai-glitter-float 3.2s ease-in-out infinite;
  animation-delay: 1.5s;
}

.ai-glitter-5 {
  top: 75%;
  left: 50%;
  animation: ai-glitter-float 2.7s ease-in-out infinite;
  animation-delay: 2s;
}

/* Shine Sweep Effect */
.ai-shine-sweep {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: ai-shine-sweep 2.5s ease-in-out infinite;
  z-index: 1;
}

:global([data-theme="light"]) .ai-shine-sweep {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(59, 130, 246, 0.5) 50%,
    transparent 100%
  );
}

/* Animations */
@keyframes ai-glitter-bg-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes ai-glitter-float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.4;
  }
  25% {
    transform: translate(8px, -8px) scale(1.2);
    opacity: 1;
  }
  50% {
    transform: translate(-5px, 5px) scale(0.9);
    opacity: 0.7;
  }
  75% {
    transform: translate(5px, 8px) scale(1.1);
    opacity: 0.9;
  }
}

@keyframes ai-shine-sweep {
  0% {
    left: -100%;
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    left: 100%;
    opacity: 0;
  }
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
  transition: transform 0.2s ease;
}

.ai-btn:hover .ai-icon-wrapper {
  transform: scale(1.05);
}

.ai-icon {
  width: 16px;
  height: 16px;
  color: var(--menu-text);
  transition: color 0.2s ease;
}

.ai-btn:hover .ai-icon {
  color: var(--menu-accent);
}

.ai-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--menu-text);
  white-space: nowrap;
  letter-spacing: 0;
  transition: color 0.2s ease;
}

.ai-btn:hover .ai-text {
  color: var(--menu-accent);
}

.ai-badge-mini {
  font-size: 9px;
  font-weight: 600;
  color: white;
  background: var(--menu-accent);
  padding: 2px 5px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Undo/Redo Section - Professional Style */
.undo-redo-section {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 12px;
  background: var(--menu-surface);
  border: 1px solid var(--menu-btn-border);
  border-radius: 6px;
  padding: 2px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
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

 

/* Speed Controller - Compact Inline Design */
.speed-controller {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  height: 32px;
}

.speed-slider {
  width: 60px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border-color);
  outline: none;
  border-radius: 2px;
  cursor: pointer;
}

.speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.speed-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.speed-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--primary-color);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.speed-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}

.speed-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-color);
  min-width: 28px;
  text-align: center;
}

.stop-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 2px 4px;
  color: var(--text-color);
  opacity: 0.7;
  transition: opacity 0.2s ease, transform 0.1s ease;
  line-height: 1;
}

.stop-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.stop-btn:active {
  transform: scale(0.95);
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .speed-controller {
    height: 28px;
    padding: 3px 6px;
    gap: 4px;
  }
  
  .speed-slider {
    width: 50px;
  }
  
  .speed-label {
    font-size: 10px;
    min-width: 24px;
  }
  
  .stop-btn {
    font-size: 14px;
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
  pointer-events: auto;
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

/* Subtle horizontal nudge to suggest scrolling */
.menu-scroll-arrow .arrow-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  animation: arrow-nudge 2.4s ease-in-out infinite;
  will-change: transform;
}

@keyframes arrow-nudge {
  0%, 60%, 100% { transform: translateX(0); }
  12%, 22% { transform: translateX(6px); }
  30% { transform: translateX(0); }
}
</style>