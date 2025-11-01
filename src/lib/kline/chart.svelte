<script lang="ts">
  console.log('📊 Chart component script loaded');
  import {page} from '$app/stores';
  import { setContext } from 'svelte';
  import * as kc from 'klinecharts';
  import type {Nullable, IndicatorTemplate, FormatDateType, VisibleRange, Chart} from 'klinecharts'
  import {persisted} from 'svelte-persisted-store';
  import { ChartCtx, ChartSave } from './chart';
  import overlays from './overlays';
  import figures from './figures';
  import indicators from './indicators';
  import MyDatafeed from './mydatafeed';
  import {onMount} from 'svelte';
  import {adjustFromTo, makeFormatDate, setTimezone} from '../dateutil';
  import type {SymbolInfo, Period, BarArr} from './types';
  import DrawBar from './drawBar.svelte';
  import SidebarHost from './SidebarHost.svelte';

  import {browser} from '$app/environment';
  import {getThemeStyles,GetNumberDotOffset, build_ohlcvs, currentSymbol, currentPeriod, processLineChartStyles, convertToHeikinAshi} from './coms';
  import {tf_to_secs, toUTCStamp} from '../dateutil';
  import { createAlertStore } from '../stores/alerts';
	import Alert from '../alert.svelte';
  import { derived, writable } from 'svelte/store';
  import MenuBar from './menuBar.svelte';
  import ChartModal from '../components/ChartModal.svelte';
  import Toast from '../components/Toast.svelte';
  import type {Writable} from 'svelte/store';
	import _ from 'lodash';
  import { OverlayProjectionManager } from './overlays/overlayProjection';
  import { OverlayEventManager } from '../overlayEventManager';
  import { OverlayCreationManager } from '../overlayCreation';
  import { initializeOverlayAdapter } from './overlays/enhancedOverlayAdapter';
  import { createEnhancedOverlayTemplates } from './overlays/enhancedTemplates';
  import { getSidebarBootstrapState } from '../stores/sidebarBootstrap';
  import { getChartRenderIntegration, getRenderScheduler } from './core';
  import { TransactionalThemeManager } from '../stores/themeManager.js';
  import SaveSystemIntegration from './saveSystem/SaveSystemIntegration.svelte';
  import { initializeDrawingManager, type DrawingManager } from './drawingManager';
  import { normalizeSymbolKey } from './saveSystem/chartStateCollector';
  setTimezone('UTC')

  const datafeed = new MyDatafeed()
  overlays.forEach(o => kc.registerOverlay(o))
  figures.forEach(f => kc.registerFigure(f))
  indicators.forEach((o: IndicatorTemplate) => {
    if(o.extendData == 'datafeed'){
      o.extendData = datafeed
    }
    kc.registerIndicator(o)
  })
  


  let {
    ctx = writable<ChartCtx>(new ChartCtx()),
    save = persisted('chart', new ChartSave()),
    customLoad=false,
  }: {
    ctx: Writable<ChartCtx>,
    save: Writable<ChartSave>,
    customLoad?: boolean
  } = $props()

  const maxBarNum = 5000;
  if($save.key){
    $save.key = 'chart'
  }
  
  // Ensure allExgs is a Set (persisted store may serialize it as array)
  save.update(s => {
    if (!(s.allExgs instanceof Set)) {
      // Handle case where allExgs might be null, undefined, or not iterable
      const existingData = Array.isArray(s.allExgs) ? s.allExgs : [];
      s.allExgs = new Set(existingData);
    }
    return s;
  });

  let chartRef: HTMLElement
  let drawBarRef = $state<DrawBar>()
  let mainContainerRef = $state<HTMLDivElement>()
  let sidebarHostRef = $state<any>()
  const chart: Writable<Nullable<kc.Chart>> = writable(null)
  const batchNum = 500;
  const alerts = createAlertStore();
  
  // Flag to prevent theme subscription from overriding during manual style application
  let isApplyingManualStyles = false;
  
  // Flag to track initial data load
  let hasInitialDataLoaded = false;
  
  // Infinite scrolling state
  let isLoadingHistoricalData = $state(false);
  let historicalLoadError = $state<string | null>(null);
  
  // Render system integration
  const renderIntegration = getChartRenderIntegration();
  const scheduler = getRenderScheduler();
  
  // Global theme manager instance
  const globalThemeManager = new TransactionalThemeManager('global-chart', chart, $save.theme || 'dark');
  
  // Drawing manager for symbol-specific drawings
  let drawingManager: DrawingManager | null = null;
  
  setContext('ctx', ctx)
  setContext('save', save)
  setContext('chart', chart)
  setContext('alerts', alerts)
  setContext('datafeed', datafeed)
  setContext('renderIntegration', renderIntegration)
  setContext('globalThemeManager', globalThemeManager)
  setContext('drawingManager', { get: () => drawingManager })
  
  // Helper function to generate gradient CSS
  function generateGradientCSS(gradient: any): string {
    if (!gradient || !gradient.colors || gradient.colors.length === 0) {
      return '';
    }
    
    const angle = gradient.angle || 0;
    const colorStops = gradient.colors
      .map((c: any) => `${c.color} ${c.position}%`)
      .join(', ');
    
    return `linear-gradient(${angle}deg, ${colorStops})`;
  }

  // Helper function to apply saved canvas colors (background and grid)
  function applyCanvasColors() {
    if (!browser) return;
    
    // Set flag to prevent infinite loop
    isApplyingCanvasColors = true;
    
    try {
      // Read directly from $save.styles (reactive) instead of localStorage
      // This ensures we always get the latest values immediately after setting change
      const styles = $save.styles;
      if (!styles) return;
      
      // Apply background color or gradient
      const bgType = styles.backgroundType || 'solid';
      const chartContainer = document.querySelector('.kline-main');
      const chartWidget = document.querySelector('.kline-widget');
      
      // CRITICAL FIX: Apply background color even if user hasn't set custom colors
      // Use saved color if available, otherwise use default theme color
      if (bgType === 'solid') {
        const bgColor = styles.backgroundColor || ($save.theme === 'dark' ? '#070211' : '#ffffff');
        const bgOpacity = (styles.backgroundOpacity ?? 100) / 100;
        
        // Convert to rgba if needed
        let bgCSS = bgColor;
        if (bgOpacity !== 1 && bgColor.startsWith('#')) {
          const r = parseInt(bgColor.slice(1, 3), 16);
          const g = parseInt(bgColor.slice(3, 5), 16);
          const b = parseInt(bgColor.slice(5, 7), 16);
          bgCSS = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;
        }
        
        [chartContainer, chartWidget].forEach(el => {
          if (el) {
            (el as HTMLElement).style.background = bgCSS;
            (el as HTMLElement).style.backgroundColor = bgCSS;
            (el as HTMLElement).style.setProperty('--chart-background-color', bgCSS);
          }
        });
        
        console.log('🎨 Applied saved background color:', bgCSS);
      } else if (bgType === 'gradient' && styles.backgroundGradient) {
        // Apply gradient background
        const bgGradient = styles.backgroundGradient;
        const gradientCSS = bgGradient.css || generateGradientCSS(bgGradient);
        
        [chartContainer, chartWidget].forEach(el => {
          if (el) {
            (el as HTMLElement).style.background = gradientCSS;
            (el as HTMLElement).style.backgroundColor = gradientCSS;
            (el as HTMLElement).style.setProperty('--chart-background-color', gradientCSS);
          }
        });
        
        console.log('🎨 Applied saved gradient background:', gradientCSS);
      }
      
      // Apply grid color or gradient
      const gridType = styles.gridType || 'solid';
      
      // CRITICAL FIX: Apply grid color even if user hasn't set custom colors
      // Use saved color if available, otherwise use default theme color
      if ($chart && gridType === 'solid') {
        const gridColor = styles.grid?.horizontal?.color || ($save.theme === 'dark' ? '#081115' : '#F3F3F3');
        const currentStyles = $chart.getStyles() ?? {};
        const newStyles = _.cloneDeep(currentStyles);
        
        _.set(newStyles, 'grid.horizontal.color', gridColor);
        _.set(newStyles, 'grid.vertical.color', gridColor);
        
        // Use original setStyles to avoid triggering the wrapper
        if (originalSetStyles) {
          originalSetStyles(processLineChartStyles(newStyles as unknown as Record<string, unknown>));
        } else {
          $chart.setStyles(processLineChartStyles(newStyles as unknown as Record<string, unknown>));
        }
        
        console.log('🎨 Applied saved grid color:', gridColor);
      } else if ($chart && gridType === 'gradient' && styles.gridGradient) {
        // Apply gradient grid
        const gridGradient = styles.gridGradient;
        const gradientCSS = gridGradient.css || generateGradientCSS(gridGradient);
        
        const currentStyles = $chart.getStyles() ?? {};
        const newStyles = _.cloneDeep(currentStyles);
        
        _.set(newStyles, 'grid.horizontal.color', gradientCSS);
        _.set(newStyles, 'grid.vertical.color', gradientCSS);
        
        // Use original setStyles to avoid triggering the wrapper
        if (originalSetStyles) {
          originalSetStyles(processLineChartStyles(newStyles as unknown as Record<string, unknown>));
        } else {
          $chart.setStyles(processLineChartStyles(newStyles as unknown as Record<string, unknown>));
        }
        
        console.log('🎨 Applied saved gradient grid:', gradientCSS);
      }
    } catch (error) {
      console.error('Error applying canvas colors:', error);
    } finally {
      // Always reset flag
      isApplyingCanvasColors = false;
    }
  }
  
  // Expose applyCanvasColors to context so modals can call it after closing
  $ctx.applyCanvasColors = applyCanvasColors;
  
  // Register applyCanvasColors with render integration to preserve colors during operations
  renderIntegration.setApplyCanvasColorsFunction(applyCanvasColors);
  
  // Register applyCanvasColors with global theme manager to preserve colors during theme switches
  globalThemeManager.setApplyCanvasColorsFunction(applyCanvasColors);
  
  // Create wrapper functions for chart methods that need canvas color reapplication
  let originalChart: kc.Chart | null = null;
  let originalSetStyles: ((styles: any) => any) | null = null;
  let isApplyingCanvasColors = false; // Flag to prevent infinite loop
  
  // Watch for chart changes and wrap its methods
  $effect(() => {
    if ($chart && $chart !== originalChart) {
      originalChart = $chart;
      
      // Store original methods
      originalSetStyles = $chart.setStyles.bind($chart);
      const originalResize = $chart.resize.bind($chart);
      
      // Wrap setStyles to reapply canvas colors after
      ($chart as any).setStyles = function(styles: any) {
        const result = originalSetStyles!(styles);
        // Only reapply canvas colors if NOT already inside applyCanvasColors
        if (!isApplyingCanvasColors) {
          scheduler.request(() => applyCanvasColors());
        }
        return result;
      };
      
      // Wrap resize to reapply canvas colors after
      ($chart as any).resize = function() {
        const result = originalResize();
        // Use scheduler instead of setTimeout for better timing
        scheduler.request(() => applyCanvasColors());
        return result;
      };
      
      console.log('🔧 Chart methods wrapped to preserve canvas colors');
    }
  });
  


  console.log('📊 About to define onMount function');
  console.log('📊 Browser environment:', browser);
  
  // Load theme early to prevent blinking
  if (browser) {
    try {
      const savedChart = localStorage.getItem('chart');
      if (savedChart) {
        const chartData = JSON.parse(savedChart);
        if (chartData.theme && chartData.theme !== $save.theme) {
          $save.theme = chartData.theme;
          console.log('🎨 Theme loaded early:', chartData.theme);
        }
      }
    } catch (e) {
      console.log('Theme loading error:', e);
    }
  }
  
  // Try calling loadSymbols immediately regardless of browser environment
  console.log('🚀 Attempting to call loadSymbols immediately');
  loadSymbols().then(() => {
    console.log('✅ loadSymbols completed successfully');
    console.log('📊 allSymbols length:', $save.allSymbols.length);
  }).catch(err => {
    console.error('❌ loadSymbols failed:', err);
  });
  
  onMount(async () => {
    console.log('🚀 onMount started - browser:', browser);
    console.log('📊 chartRef:', chartRef);
    if (!chartRef) {
      console.error('❌ chartRef is not available');
      return;
    }
    // Get theme styles and merge with saved styles (saved styles should override theme)
    const themeStyles = getThemeStyles($save.theme);
    const mergedStyles = _.merge({}, themeStyles, $save.styles);
    console.log('🎨 onMount - Theme styles:', JSON.stringify(themeStyles, null, 2));
    console.log('💾 onMount - Saved styles:', JSON.stringify($save.styles, null, 2));
    console.log('🔄 onMount - Merged styles:', JSON.stringify(mergedStyles, null, 2));
    
    $chart = kc.init(chartRef, {
        styles: mergedStyles,
        customApi: {
          formatDate: (timestamp: number, format: string, type: FormatDateType) => {
            return makeFormatDate($save.period.timespan)(timestamp, format, type)
          }
        }
      });
    
    // Initialize overlay system
     if ($chart) {
       const projectionManager = new OverlayProjectionManager($chart);
       const eventManager = new OverlayEventManager($chart);
       const creationManager = new OverlayCreationManager($chart);
       
       // Initialize enhanced overlay adapter
       const overlayAdapter = initializeOverlayAdapter($chart);
       const enhancedTemplates = createEnhancedOverlayTemplates(overlayAdapter);
       
       // Connect the managers
       eventManager.setProjectionManager(projectionManager);
       eventManager.setCreationManager(creationManager);
       
       // Initialize event listeners
       eventManager.initialize();
       
       console.log('Enhanced overlay system initialized with templates:', Object.keys(enhancedTemplates));
       
       // Initialize Drawing Manager for symbol-specific drawings
       drawingManager = initializeDrawingManager({
         chart: $chart,
         persistenceKey: $save.key + '_drawings',
         onDrawingCreated: (drawing) => {
           console.log('✅ Drawing created:', drawing.id, 'for symbol:', drawing.symbolKey);
         },
         onDrawingRemoved: (drawingId, symbolKey) => {
           console.log('🗑️ Drawing removed:', drawingId, 'from symbol:', symbolKey);
         },
         onSymbolChanged: (oldSymbol, newSymbol) => {
           console.log('🔄 Symbol changed in DrawingManager:', oldSymbol, '→', newSymbol);
         }
       });
       
       // Set current symbol in drawing manager and overlay creation manager
       const currentSymbolKey = normalizeSymbolKey($save.symbol);
       drawingManager.setCurrentSymbol(currentSymbolKey);
       creationManager.setCurrentSymbolKey(currentSymbolKey);
       
       console.log('✅ DrawingManager initialized for symbol:', currentSymbolKey);
     }
    
    // 因暂时禁用云指标，所以直接触发完成
    $ctx.cloudIndLoaded += 1
    
    // Initialize current symbol and period stores
    currentSymbol.set($save.symbol);
    currentPeriod.set($save.period);
    
    // Load symbols on mount
    console.log('🚀 About to call loadSymbols from onMount');
    await loadSymbols();
    console.log('✅ loadSymbols completed from onMount');
    
    window.addEventListener('resize', () => {
      $chart?.resize()
      
      // Apply responsive theme styles on resize for mobile optimization
      setTimeout(() => {
        if ($chart) {
          const responsiveStyles = getThemeStyles($save.theme)
          _.merge(responsiveStyles, $state.snapshot($save.styles))
          $chart.setStyles(processLineChartStyles(responsiveStyles))
          
          // Reapply canvas colors to maintain visual consistency
          applyCanvasColors()
        }
      }, 100)
    })
    let chartObj = $chart!;
    
    // Set default chart view without excessive zoom
    setTimeout(() => {
      if (chartObj) {
        // Scroll to show latest data (right side)
        chartObj.scrollToRealTime();
      }
    }, 100);
    // Implement infinite scrolling for historical data loading
    // Since setLoadMoreDataCallback is not available in klinecharts v9.x,
    // we'll implement scroll detection manually
    setupInfiniteScrolling(chartObj);
    const styles = getThemeStyles($save.theme)
    _.merge(styles, $state.snapshot($save.styles))
    $chart?.setStyles(processLineChartStyles(styles))
    
    // CRITICAL FIX: Apply saved canvas colors immediately after chart initialization
    // This ensures custom colors are applied on first load without requiring settings click
    console.log('🎨 APPLYING SAVED CANVAS COLORS ON FIRST LOAD');
    applyCanvasColors();
    
    // ADDITIONAL FIX: Apply canvas colors again after a short delay to ensure they stick
    // This handles cases where the chart might override colors during initial setup
    setTimeout(() => {
      console.log('🎨 RE-APPLYING SAVED CANVAS COLORS AFTER DELAY');
      applyCanvasColors();
    }, 200);
    
    $ctx.initDone += 1
    
    // Load initial data with a delay to ensure chart is fully initialized
    if (!customLoad) {
      setTimeout(() => {
        if ($chart && !$ctx.loadingKLine) {
          console.log('🔄 Loading initial chart data after initialization');
          loadSymbolPeriod();
          hasInitialDataLoaded = true;
        }
      }, 100);
    }
    
    loadSymbols();
    
    // Debug: Check symbols in browser console
    setTimeout(() => {
      console.log('🔍 Current allSymbols:', $save.allSymbols);
      console.log('🔍 allSymbols length:', $save.allSymbols.length);
    }, 3000);
    
    // Focus the chart widget to enable keyboard events
    chartRef?.focus();
    
    // Enhanced separator interaction functionality
    setTimeout(() => {
      const separators = chartRef?.querySelectorAll('.klinecharts-pane-separator');
      separators?.forEach((separator) => {
        const element = separator as HTMLElement;
        
        // Add smooth cursor feedback
        element.style.transition = 'background-color 0.2s ease, transform 0.1s ease';
        
        // Enhanced mouse events for desktop
        element.addEventListener('mouseenter', () => {
          element.style.cursor = 'row-resize';
          element.style.transform = 'scaleY(1.2)';
        });
        
        element.addEventListener('mouseleave', () => {
          element.style.transform = 'scaleY(1)';
        });
        
        // Add dragging class for visual feedback
        element.addEventListener('mousedown', () => {
          element.classList.add('dragging');
          document.body.style.cursor = 'row-resize';
        });
        
        // Remove dragging class on mouse up (global)
        const handleMouseUp = () => {
          element.classList.remove('dragging');
          document.body.style.cursor = '';
        };
        
        document.addEventListener('mouseup', handleMouseUp);
        
        // Enhanced touch support for mobile
        element.addEventListener('touchstart', (e) => {
          e.preventDefault();
          element.classList.add('dragging');
          // Add haptic feedback if available
          if ('vibrate' in navigator) {
            navigator.vibrate(10);
          }
        });
        
        element.addEventListener('touchend', () => {
          element.classList.remove('dragging');
        });
      });
    }, 500); // Delay to ensure chart is fully rendered
  })

  // Setup infinite scrolling for historical data loading
  function setupInfiniteScrolling(chartObj: kc.Chart) {
    let lastVisibleRange: VisibleRange | null = null;
    let isLoadingHistorical = false;
    let lastLoadTime = 0;
    const loadCooldown = 800; // Reduced to 800ms for faster loading
    let consecutiveLoadCount = 0;
    const maxConsecutiveLoads = 5; // Allow more consecutive loads
    
    // Poll for scroll changes with optimized logic
    const checkScrollPosition = () => {
      try {
        const visibleRange = chartObj.getVisibleRange();
        
        if (!visibleRange || isLoadingHistorical) return;
        
        const dataList = chartObj.getDataList();
        if (dataList.length === 0) return;
        
        // More aggressive threshold for faster loading
        const visibleBars = visibleRange.to - visibleRange.from;
        const scrollThreshold = Math.max(3, Math.min(15, Math.floor(visibleBars * 0.15))); // 15% of visible range, min 3, max 15
        
        // Check if user scrolled to the left edge (need more historical data)
        const isScrollingLeft = lastVisibleRange && visibleRange.from < lastVisibleRange.from;
        const isNearLeftEdge = visibleRange.from <= scrollThreshold;
        const hasSignificantMovement = !lastVisibleRange || Math.abs(visibleRange.from - lastVisibleRange.from) > 1; // Reduced movement threshold
        
        // Adaptive cooldown - slow down but don't stop completely
        const now = Date.now();
        const adaptiveCooldown = consecutiveLoadCount >= maxConsecutiveLoads ? loadCooldown * 3 : loadCooldown;
        const canLoad = now - lastLoadTime > adaptiveCooldown;
        
        // More aggressive loading conditions
        const isVeryNearEdge = visibleRange.from <= Math.max(1, scrollThreshold / 2); // Very close to edge
        const shouldLoadAggressively = isVeryNearEdge && hasSignificantMovement && canLoad;
        const shouldLoadNormally = isScrollingLeft && isNearLeftEdge && hasSignificantMovement && canLoad;
        
        if (shouldLoadAggressively || shouldLoadNormally) {
          const firstDataPoint = dataList[0];
          console.log(`🚀 Infinite scroll triggered: from=${visibleRange.from}, threshold=${scrollThreshold}, dataLength=${dataList.length}, consecutive=${consecutiveLoadCount}`);
          loadMoreHistoricalData(firstDataPoint.timestamp);
          lastLoadTime = now;
          consecutiveLoadCount++;
          
          // Reset consecutive count gradually
          setTimeout(() => {
            consecutiveLoadCount = Math.max(0, consecutiveLoadCount - 1);
          }, loadCooldown * 1.5);
        }
        
        lastVisibleRange = { ...visibleRange }; // Create a copy to avoid reference issues
      } catch (error) {
        console.error('❌ Error checking scroll position:', error);
      }
    };
    
    // Load more historical data when scrolling left
    const loadMoreHistoricalData = async (earliestTimestamp: number) => {
      if (isLoadingHistorical || $ctx.loadingKLine || isLoadingHistoricalData) {
        console.log('⏳ Already loading data, skipping request...');
        return;
      }
      
      isLoadingHistorical = true;
      isLoadingHistoricalData = true;
      historicalLoadError = null;
      console.log('🔄 Loading more historical data...');
      
      try {
        const newData = await datafeed.loadMoreHistoricalData($save.symbol, $save.period, earliestTimestamp);
        
        if (newData.data.length > 0) {
          // Apply Heikin Ashi conversion if needed
          let klines = newData.data;
          if ($save.styles?.candle?.type === 'heikin_ashi') {
            klines = convertToHeikinAshi(klines);
          }
          
          // Get current data and merge properly
          const currentData = chartObj.getDataList();
          
          // Sort new data by timestamp (oldest first)
          klines.sort((a, b) => a.timestamp - b.timestamp);
          
          // Filter out any duplicates based on timestamp
          const existingTimestamps = new Set(currentData.map(d => d.timestamp));
          const uniqueNewData = klines.filter(d => !existingTimestamps.has(d.timestamp));
          
          if (uniqueNewData.length > 0) {
            // Store current scroll position and viewport info before adding new data
            const currentVisibleRange = chartObj.getVisibleRange();
            
            // Store the timestamp of the first visible bar to maintain relative position
            const firstVisibleTimestamp = currentVisibleRange && currentData[currentVisibleRange.from] 
              ? currentData[currentVisibleRange.from].timestamp 
              : null;
            
            // Merge data: new historical data first, then existing data
            const mergedData = [...uniqueNewData, ...currentData].sort((a, b) => a.timestamp - b.timestamp);
            
            // Apply the merged data to the chart
            chartObj.applyNewData(mergedData, true);
            
            console.log(`✅ Successfully loaded and merged ${uniqueNewData.length} more historical bars`);
            
            // Clear any previous errors
            historicalLoadError = null;
            
            // Preserve scroll position using multiple strategies for better accuracy
            if (currentVisibleRange && firstVisibleTimestamp) {
              // Strategy 1: Find the new index of the previously visible timestamp
              const newIndexOfFirstVisible = mergedData.findIndex(d => d.timestamp === firstVisibleTimestamp);
              
              if (newIndexOfFirstVisible !== -1) {
                // Use immediate scroll adjustment without delay for smoother experience
                try {
                  chartObj.scrollToDataIndex(newIndexOfFirstVisible);
                  console.log(`🎯 Scroll position adjusted to index ${newIndexOfFirstVisible} (was ${currentVisibleRange.from})`);
                } catch (_error) {
                  // Fallback: Use the simple offset method
                  const fallbackIndex = currentVisibleRange.from + uniqueNewData.length;
                  try {
                    chartObj.scrollToDataIndex(fallbackIndex);
                    console.log(`🔄 Fallback scroll to index ${fallbackIndex}`);
                  } catch (fallbackError) {
                    console.warn('Could not maintain scroll position:', fallbackError);
                  }
                }
              } else {
                // Fallback: Use offset method if timestamp lookup fails
                const offsetIndex = currentVisibleRange.from + uniqueNewData.length;
                try {
                  chartObj.scrollToDataIndex(offsetIndex);
                  console.log(`📍 Offset scroll to index ${offsetIndex}`);
                } catch (error) {
                  console.warn('Could not maintain scroll position:', error);
                }
              }
            }
          } else {
            console.log('📭 No new unique historical data to add');
          }
          
          // Add any overlays if present
          if (newData.lays && newData.lays.length > 0 && drawBarRef) {
            newData.lays.forEach(o => {
              drawBarRef!.addOverlay(o);
            });
          }
        } else {
          console.log('📭 No more historical data available');
        }
      } catch (error) {
        console.error('❌ Error loading more historical data:', error);
        historicalLoadError = error instanceof Error ? error.message : 'Failed to load historical data';
        
        // Show error alert to user
        alerts.addAlert('error', `Failed to load historical data: ${historicalLoadError}`);
      } finally {
        isLoadingHistorical = false;
        isLoadingHistoricalData = false;
      }
    };
    
    // Start polling for scroll changes with high frequency for fast response
    const scrollCheckInterval = setInterval(checkScrollPosition, 100); // Check every 100ms for faster response
    
    // Cleanup function (store reference for cleanup if needed)
    return () => {
      clearInterval(scrollCheckInterval);
      console.log('🧹 Infinite scrolling cleanup completed');
    };
  }

  async function loadSymbols(){
    console.log('🚀 loadSymbols function called. loadingPairs:', $ctx.loadingPairs, 'allSymbols length:', $save.allSymbols.length);
    // Force load symbols by bypassing condition temporarily
    // if($ctx.loadingPairs || $save.allSymbols.length > 0)return;
    $ctx.loadingPairs = true;
    console.log('🔄 Loading symbols...');
    console.log('🔄 loadSymbols proceeding');
    const symbols = await datafeed.getSymbols();
    console.log('📊 Symbols loaded:', symbols);
    console.log('📊 Symbols loaded count:', symbols.length);
    $save.allSymbols = symbols;
    const exgs = new Set<string>();
    symbols.forEach(s => {
      if (s.exchange){
        exgs.add(s.exchange)
      }
    })
    save.update(s => {
      exgs.forEach(e => {
        s.allExgs.add(e)
      })
      return s
    })
    $ctx.loadingPairs = false;
  }
  
  async function loadKlineRange(symbol: SymbolInfo, period: Period, start_ms: number, stop_ms: number,
                              loadMore: boolean = true) {
    const chartObj = $chart;
    if (!chartObj) return
    $ctx.loadingKLine = true
    const strategy = $page.url.searchParams.get('strategy');
    console.log('loadKlineRange', {symbol, period, start_ms, stop_ms, strategy})
    const kdata = await datafeed.getHistoryKLineData({
      symbol, period, from: start_ms, to: stop_ms, strategy
    })
    let klines = kdata.data
    

    
    // Apply Heikin Ashi conversion if chart type is heikin_ashi
    if ($save.styles?.candle?.type === 'heikin_ashi') {
      klines = convertToHeikinAshi(klines);
    }
    
    // Validate timestamps before applying to chart
    klines = klines.map((kline, index) => {
      if (!kline.timestamp || isNaN(kline.timestamp) || kline.timestamp <= 0) {
        console.warn(`Invalid timestamp in klines at index ${index}:`, kline.timestamp);
        kline.timestamp = Date.now() - (klines.length - index) * 60000; // Use fallback with proper spacing
      }
      return kline;
    });
    
    const hasMore = loadMore && klines.length > 0;
    chartObj.applyNewData(klines, hasMore);
    if(kdata.lays && kdata.lays.length > 0 && !!drawBarRef){
      kdata.lays.forEach(o => {
        drawBarRef!.addOverlay(o)
      })
    }
    $ctx.loadingKLine = false
    // 触发K线加载完毕事件
    $ctx.klineLoaded += 1
    if (klines.length) {
      const tf_msecs = tf_to_secs(period.timeframe) * 1000
      const curTime = new Date().getTime()
      const stop_ms = klines[klines.length - 1].timestamp + tf_msecs
      if (stop_ms + tf_msecs > curTime) {
        // 加载的是最新的bar，则自动开启websocket监听
        datafeed.subscribe(symbol, (param: unknown) => {
          const result = param as { bars: BarArr[], secs: number };
          const kline = chartObj.getDataList()
          const last = kline[kline.length - 1]
          const lastBar: BarArr | null = last && last.timestamp ? [
            last.timestamp, last.open, last.high, last.low, last.close, last.volume ?? 0
          ] : null
          const ohlcvArr = build_ohlcvs(result.bars, result.secs * 1000, tf_msecs, lastBar)
          const store = (chartObj as Chart & { getChartStore(): any }).getChartStore()
          store.addData(ohlcvArr, 'backward', {forward: true, backward:false})
        })
      }
    }
  }

  async function customLoadKline(){
    const start_ms = toUTCStamp($save.dateStart)
    let stop_ms = toUTCStamp($save.dateEnd)
    if(!start_ms || !stop_ms){
      alerts.addAlert('error', 'invalid time, please use: 202301011200')
      return;
    }
    const tf_msecs = tf_to_secs($save.period.timeframe) * 1000
    const totalNum = (stop_ms - start_ms) / tf_msecs;
    if(totalNum > maxBarNum){
      stop_ms = start_ms + tf_msecs * maxBarNum;
      // Silently cut the data range without showing alert
    }
    await loadKlineRange($save.symbol, $save.period, start_ms, stop_ms, false)
  }

  function loadSymbolPeriod(){
    console.log('🔄 loadSymbolPeriod called');
    const s = $save.symbol
    const p = $save.period
    console.log('🔄 Loading symbol:', s.ticker, 'period:', p.timeframe);
    const curTime = new Date().getTime()
    const [from, to] = adjustFromTo(p, curTime, batchNum)
    console.log('🔄 Time range:', new Date(from), 'to', new Date(curTime));
    loadKlineRange(s, p, from, curTime, !customLoad)
  }

  // 监听周期变化 (Timeframe changes) - with flicker-free rendering
  const period = derived(save, ($save) => $save.period.timeframe);
  period.subscribe((new_tf) => {
    try {
      $chart?.setCustomApi({
        formatDate: (timestamp: number, format: string, type: FormatDateType) => {
          return makeFormatDate($save.period.timespan)(timestamp, format, type)
        }
      })
    } catch (e) {
      // API compatibility issue with v9
    }
    
    // Update global period store for tooltip display
    currentPeriod.set($save.period);
    
    if ($ctx.loadingKLine || customLoad || !$chart) return
    
    // Use render integration for flicker-free timeframe change
    renderIntegration.changeTimeframe({
      chart: $chart,
      period: $save.period,
      loadDataFn: async () => {
        await loadSymbolPeriod();
      }
    });
  })
  
  // 监听币种变化
  const symbol = derived(save, ($save) => $save.symbol.ticker);
  symbol.subscribe((val) => {
    console.log('📊 Symbol subscription triggered:', val);
    console.log('📊 Current symbol:', $save.symbol);
    console.log('📊 Loading state:', $ctx.loadingKLine, 'Custom load:', customLoad);
    // Update global symbol store for tooltip
    currentSymbol.set($save.symbol);
    
    // Update DrawingManager with new symbol
    if (drawingManager) {
      const newSymbolKey = normalizeSymbolKey($save.symbol);
      drawingManager.setCurrentSymbol(newSymbolKey);
      console.log('🔄 DrawingManager updated to symbol:', newSymbolKey);
    }
    
    if ($ctx.loadingKLine || customLoad) return
    console.log('📊 Proceeding with symbol change - unsubscribing and loading new data');
    datafeed.unsubscribe()
    loadSymbolPeriod()
  })

  // 监听主题变化
  const theme = derived(save, ($save) => $save.theme);
  let previousTheme = $save.theme;
  theme.subscribe((new_val) => {
    console.log('🎨 THEME SUBSCRIPTION TRIGGERED:', new_val, 'Previous:', previousTheme)
    
    // Only proceed if theme actually changed
    if (new_val === previousTheme) {
      console.log('⏸️ Theme value unchanged, skipping subscription')
      return
    }
    
    console.log('🎨 THEME ACTUALLY CHANGED:', previousTheme, '->', new_val)
    previousTheme = new_val
    
    // Skip if we're manually applying styles to prevent override
    if (isApplyingManualStyles) {
      console.log('⏸️ Skipping theme subscription - manual styles being applied')
      return
    }
    
    // Check context flag as well
    if ($ctx.isApplyingManualStyles) {
      console.log('⏸️ SKIPPING theme application - manual styles are being applied via context')
      return
    }
    
    // 加载新指标时，修改默认颜色
    if(new_val == 'light'){
      $save.colorLong = 'green'
      $save.colorShort = 'red'
    }
    else{
      $save.colorLong = 'green'
      $save.colorShort = 'rgb(255,135,8)'
    }
    const styles = getThemeStyles($save.theme)
    console.log('🎨 Theme styles from getThemeStyles:', JSON.stringify(styles, null, 2))
    console.log('💾 Current save.styles:', JSON.stringify($save.styles, null, 2))
    
    // CRITICAL: Preserve chart type from $save.styles before merging
    const savedStyles = $state.snapshot($save.styles);
    const preservedChartType = savedStyles?.candle?.type;
    if (preservedChartType) {
      console.log('🔒 Preserving chart type during theme change:', preservedChartType);
    }
    
    const mergedStyles = _.merge({}, styles, savedStyles)
    
    // CRITICAL: Ensure chart type is preserved after merge
    if (preservedChartType && mergedStyles.candle) {
      mergedStyles.candle.type = preservedChartType;
    }
    
    console.log('🔄 Merged styles (theme + saved):', JSON.stringify(mergedStyles, null, 2))
    const processedStyles = processLineChartStyles(mergedStyles)
    console.log('✨ Final processed styles:', JSON.stringify(processedStyles, null, 2))
    $chart?.setStyles(processedStyles)
    console.log('✅ Styles applied to chart via theme subscription')
    
    // CRITICAL FIX: Apply saved canvas colors after theme change
    // This ensures custom colors persist when switching between dark/light modes
    console.log('🎨 APPLYING SAVED CANVAS COLORS AFTER THEME CHANGE');
    setTimeout(() => {
      applyCanvasColors();
      console.log('✅ Canvas colors reapplied after theme change');
    }, 100);
    
    // Debug: Check what the chart actually has after applying styles
    setTimeout(() => {
      console.log('🔍 CHART STATE CHECK after theme subscription:')
      const currentStyles = $chart?.getStyles()
      console.log('  - Current chart styles:', JSON.stringify(currentStyles, null, 2))
      console.log('  - Saved chart type in $save.styles:', $save.styles?.candle?.type)
    }, 200)
  })
  
  // 监听时区变化
  const timezone = derived(save, ($save) => $save.timezone);
  timezone.subscribe((new_val) => {
    $chart?.setTimezone(new_val)
    setTimezone(new_val)
  })
  
  // 监听图表类型变化 (特别是Heikin Ashi) - with flicker-free rendering
  const chartType = derived(save, ($save) => $save.styles?.candle?.type);
  chartType.subscribe((new_val) => {
    if ($ctx.loadingKLine || customLoad) return
    
    // 当切换到或从Heikin Ashi时，重新加载数据以应用转换
    const chartObj = $chart;
    if (!chartObj) return;
    
    if (new_val === 'heikin_ashi' || (new_val !== 'heikin_ashi' && chartObj.getDataList().length > 0)) {
      // Use render integration for flicker-free chart type change
      renderIntegration.switchChartType({
        chart: chartObj,
        newType: new_val || 'candle_solid',
        reloadDataFn: async () => {
          await loadSymbolPeriod();
        }
      });
    }
  })

  // 监听数据加载动作
  const fireOhlcv = derived(ctx, ($ctx) => $ctx.fireOhlcv);
  fireOhlcv.subscribe(async (val) => {
    if($ctx.timeStart && $ctx.timeEnd){
      await loadKlineRange($save.symbol, $save.period, $ctx.timeStart, $ctx.timeEnd)
      $ctx.timeStart = 0
      $ctx.timeEnd = 0
    }
    else{
      await customLoadKline()
    }
  })

  export function getChart(): Nullable<kc.Chart>{
    return $chart
  }
  
  export function setManualStylesFlag(value: boolean) {
    isApplyingManualStyles = value
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Handle Delete key for removing selected overlay
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      drawBarRef?.clickRemove()
    }
  }

  // Mouse tracking for crosshair
  let mouseChartX = $state(0)
  let mouseChartY = $state(0)

  // Modal state
  let showModal = $state(false)
  let modalX = $state(0)
  let modalY = $state(0)
  let modalPrice = $state('')

  // Toast state
  let toastRef: Toast
  let showToast = $state(false)
  let toastMessage = $state('')

  // Double tap detection variables
  let lastTapTime = 0
  let tapCount = 0
  let tapTimeout: NodeJS.Timeout | null = null

  function handleMouseMove(e: MouseEvent) {
    // Track mouse position for crosshair price calculation
    const chartRect = chartRef?.getBoundingClientRect()
    if (chartRect) {
      mouseChartX = e.clientX - chartRect.left
      mouseChartY = e.clientY - chartRect.top
    }
  }

  function handleRightClick(e: MouseEvent) {
    e.preventDefault()
    
    // Disable context menu on mobile devices - use double tap instead
    if (isMobileDevice()) {
      return
    }
    
    const chartRect = chartRef?.getBoundingClientRect()
    if (chartRect) {
      const x = e.clientX - chartRect.left
      const y = e.clientY - chartRect.top
      showModalAtPosition(x, y)
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      
      // Update mouse position for touch
      const chartRect = chartRef?.getBoundingClientRect()
      if (chartRect) {
        mouseChartX = touch.clientX - chartRect.left
        mouseChartY = touch.clientY - chartRect.top
      }

      // Check if touch is on modal - if so, don't handle it here
      const target = e.target as HTMLElement
      if (showModal && target && (target.closest('.modal-content') || target.closest('.action-btn'))) {
        return
      }

      // Double tap detection for mobile modal
      const currentTime = Date.now()
      const timeDiff = currentTime - lastTapTime
      
      if (timeDiff < 300 && timeDiff > 0) {
        tapCount++
        if (tapCount === 2) {
          // Double tap detected - show modal
          e.preventDefault()
          if (chartRect) {
            const x = touch.clientX - chartRect.left
            const y = touch.clientY - chartRect.top
            showModalAtPosition(x, y)
          }
          tapCount = 0
          return
        }
      } else {
        tapCount = 1
        
        // Single tap - hide modal if it's open and not on modal content
        if (showModal) {
          e.preventDefault()
          hideModal()
          tapCount = 0
          return
        }
      }
      
      lastTapTime = currentTime
      
      // Clear tap count after delay
      if (tapTimeout) {
        clearTimeout(tapTimeout)
      }
      tapTimeout = setTimeout(() => {
        tapCount = 0
      }, 300)
    }
  }

  function handleClick(e: MouseEvent) {
    // Hide modal when clicking elsewhere
    if (showModal) {
      hideModal()
    }
  }

  function showModalAtPosition(x: number, y: number) {
    modalX = x
    modalY = y
    modalPrice = getCurrentPriceAtMouse()
    showModal = true
  }

  function hideModal() {
    showModal = false
  }

  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0)
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        console.log('✅ Copied using modern clipboard API')
        return true
      }
    } catch (error) {
      console.warn('Modern clipboard API failed:', error)
    }

    // Fallback for mobile and older browsers
    try {
      // Create a temporary textarea element
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      textArea.style.opacity = '0'
      textArea.style.pointerEvents = 'none'
      textArea.setAttribute('readonly', '')
      
      document.body.appendChild(textArea)
      
      // Select and copy the text
      textArea.focus()
      textArea.select()
      textArea.setSelectionRange(0, text.length)
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        console.log('✅ Copied using fallback method')
        return true
      }
    } catch (error) {
      console.error('Fallback copy method failed:', error)
    }

    // Final fallback - try to use selection API
    try {
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        const span = document.createElement('span')
        span.textContent = text
        span.style.position = 'fixed'
        span.style.left = '-999999px'
        span.style.opacity = '0'
        
        document.body.appendChild(span)
        range.selectNode(span)
        selection.removeAllRanges()
        selection.addRange(range)
        
        const successful = document.execCommand('copy')
        document.body.removeChild(span)
        selection.removeAllRanges()
        
        if (successful) {
          console.log('✅ Copied using selection API fallback')
          return true
        }
      }
    } catch (error) {
      console.error('Selection API fallback failed:', error)
    }

    console.error('❌ All copy methods failed')
    return false
  }

  function resetChartView() {
    console.log('🔄 RESET CHART VIEW called')
    const chartObj = $chart
    if (chartObj) {
      // CRITICAL: Preserve chart type and grid color settings before reset
      const currentStyles = $save.styles
      const preservedChartType = currentStyles?.candle?.type
      const preservedGridSettings = {
        gridType: currentStyles.gridType,
        gridOpacity: currentStyles.gridOpacity,
        gridGradient: currentStyles.gridGradient,
        gridHorizontalColor: currentStyles.grid?.horizontal?.color,
        gridVerticalColor: currentStyles.grid?.vertical?.color
      }
      
      console.log('🔒 Preserving chart type:', preservedChartType)
      console.log('🎨 Preserving grid settings:', preservedGridSettings)
      
      // Reset styles to theme defaults first
      const themeStyles = getThemeStyles($save.theme)
      console.log('🎨 Resetting to theme styles:', JSON.stringify(themeStyles, null, 2))
      
      // Apply theme styles but preserve critical settings
      const mergedStyles = { ...themeStyles } as any
      
      // CRITICAL: Preserve chart type
      if (preservedChartType) {
        if (!mergedStyles.candle) {
          mergedStyles.candle = {} as any
        }
        (mergedStyles.candle as any).type = preservedChartType
        console.log('✅ Preserved chart type in reset:', preservedChartType)
      }
      
      if (preservedGridSettings.gridType === 'solid' && preservedGridSettings.gridHorizontalColor) {
        // Preserve solid grid color
        if (!(mergedStyles as any).grid) {
          (mergedStyles as any).grid = {}
        }
        if (!(mergedStyles as any).grid.horizontal) {
          (mergedStyles as any).grid.horizontal = {}
        }
        if (!(mergedStyles as any).grid.vertical) {
          (mergedStyles as any).grid.vertical = {}
        }
        (mergedStyles as any).grid.horizontal.color = preservedGridSettings.gridHorizontalColor
        (mergedStyles as any).grid.vertical.color = preservedGridSettings.gridVerticalColor || preservedGridSettings.gridHorizontalColor
      } else if (preservedGridSettings.gridType === 'gradient' && preservedGridSettings.gridGradient) {
        // Preserve gradient grid color
        const gradientCSS = (preservedGridSettings.gridGradient as any).css || generateGradientCSS(preservedGridSettings.gridGradient)
        if (gradientCSS) {
          if (!(mergedStyles as any).grid) {
            (mergedStyles as any).grid = {}
          }
          if (!(mergedStyles as any).grid.horizontal) {
            (mergedStyles as any).grid.horizontal = {}
          }
          if (!(mergedStyles as any).grid.vertical) {
            (mergedStyles as any).grid.vertical = {}
          }
          (mergedStyles as any).grid.horizontal.color = gradientCSS
          (mergedStyles as any).grid.vertical.color = gradientCSS
        }
      }
      
      chartObj.setStyles(processLineChartStyles(mergedStyles))
      
      // Reset all pane options to default (v9 compatibility)
      try {
        chartObj.setPaneOptions({})
      } catch (e) {
        // setPaneOptions API may differ in v9
      }
      
      // Note: Removed chartObj.removeOverlay() to preserve drawing lines
      
      // Reset zoom to default (1.0 scale)
      chartObj.zoomAtCoordinate(1.0, { x: 0, y: 0 })
      
      // Scroll to real time (latest data)
      chartObj.scrollToRealTime()
      
      // Reset save state but preserve chart type and grid settings
      save.update(s => {
        const newStyles: any = {}
        
        // CRITICAL: Preserve chart type
        if (preservedChartType) {
          if (!newStyles.candle) newStyles.candle = {}
          newStyles.candle.type = preservedChartType
        }
        
        // Preserve grid color settings
        if (preservedGridSettings.gridType) {
          newStyles.gridType = preservedGridSettings.gridType
        }
        if (preservedGridSettings.gridOpacity !== undefined) {
          newStyles.gridOpacity = preservedGridSettings.gridOpacity
        }
        if (preservedGridSettings.gridGradient) {
          newStyles.gridGradient = preservedGridSettings.gridGradient
        }
        if (preservedGridSettings.gridHorizontalColor) {
          if (!newStyles.grid) newStyles.grid = {}
          if (!newStyles.grid.horizontal) newStyles.grid.horizontal = {}
          if (!newStyles.grid.vertical) newStyles.grid.vertical = {}
          newStyles.grid.horizontal.color = preservedGridSettings.gridHorizontalColor
          newStyles.grid.vertical.color = preservedGridSettings.gridVerticalColor || preservedGridSettings.gridHorizontalColor
        }
        
        s.styles = newStyles
        s.options = {}
        return s
      })
      
      console.log('✅ Grid settings preserved after reset')
      
      // Force a complete redraw
      chartObj.resize()
    }
  }

  function getCurrentPriceAtMouse() {
    const chartObj = $chart
    if (!chartObj || mouseChartX === null || mouseChartY === null) return ''
    
    try {
      // Get the chart container dimensions for accurate coordinate conversion
      const chartRect = chartRef?.getBoundingClientRect()
      if (!chartRect) {
        return ''
      }
      
      // First priority: Use the chart library's built-in coordinate conversion
      // This is the most accurate method as it uses the actual chart scale
      if (chartObj && typeof chartObj.convertFromPixel === 'function') {
        try {
          const result: any = chartObj.convertFromPixel([{ x: mouseChartX, y: mouseChartY }], { paneId: 'candle_pane' })
          if (result && Array.isArray(result) && result[0] && typeof result[0].value === 'number') {
            return result[0].value.toFixed(2)
          }
        } catch (e) {
          // Fall through to alternative methods
        }
      }
      
      // Second priority: Fallback to manual calculation
      
      // Third priority: Manual calculation based on visible data range
      // This is the most reliable fallback when other methods fail
      const visibleRange = chartObj.getVisibleRange()
      const dataList = chartObj.getDataList()
      
      if (!dataList || dataList.length === 0 || !visibleRange) {
        return ''
      }
      
      const visibleData = dataList.slice(visibleRange.from, visibleRange.to + 1)
      if (visibleData.length === 0) {
        return ''
      }
      
      // Find the actual min/max prices in the visible range
      let minPrice = Infinity
      let maxPrice = -Infinity
      
      visibleData.forEach(data => {
        minPrice = Math.min(minPrice, data.low)
        maxPrice = Math.max(maxPrice, data.high)
      })
      
      // Use the calculated min/max from visible data
      
      const priceRange = maxPrice - minPrice
      if (priceRange <= 0) {
        return ''
      }
      
      // Calculate price based on mouse Y position relative to chart height
      // Note: Chart Y coordinates are inverted (0 at top, height at bottom)
      const relativeY = mouseChartY / chartRect.height
      const price = maxPrice - (relativeY * priceRange)
      
      return price.toFixed(2)
      
    } catch (error) {
      return ''
    }
  }


  
  console.log('📊 Chart script execution completed');
</script>



<div bind:this={mainContainerRef} class="kline-main" data-theme="{$save.theme}" 
     onclick={() => $ctx.clickChart += 1}>
  <div class="alerts-container">
    {#each $alerts as alert (alert.id)}
      <Alert type={alert.type} text={alert.text} />
    {/each}
  </div>
  <MenuBar customLoad={customLoad} bind:mainContainer={mainContainerRef} bind:sidebarHost={sidebarHostRef}/>
  <div class="chart-container">
    <div class="kline-content">
      {#if $save.showDrawBar}
        <DrawBar bind:this={drawBarRef}/>
      {/if}
      <div bind:this={chartRef} class="kline-widget" role="application" tabindex="0"
            onkeydown={handleKeyDown} 
            oncontextmenu={handleRightClick} 
            onmousemove={handleMouseMove}
            ontouchstart={handleTouchStart}
            onclick={handleClick}></div>
     </div>
     
     <!-- Right Sidebar -->
     <SidebarHost bind:this={sidebarHostRef} />
   </div>
   

   
   <!-- Loading indicator for infinite scrolling -->
   {#if isLoadingHistoricalData}
     <div class="historical-loading-indicator">
       <div class="loading-spinner"></div>
       <span>Loading historical data...</span>
     </div>
   {/if}

   <!-- Chart Modal -->
   <ChartModal 
     bind:isOpen={showModal}
     x={modalX}
     y={modalY}
     currentPrice={modalPrice}
     on:reset={resetChartView}
     on:copy={async (e) => {
       if (e.detail.price) {
         const success = await copyToClipboard(e.detail.price)
         if (success) {
           toastMessage = `Price ${e.detail.price} copied!`
           toastRef?.showToast()
           hideModal()
         } else {
           toastMessage = 'Failed to copy price'
           toastRef?.showToast()
         }
       }
     }}
     on:close={hideModal}
   />
   
   <!-- Toast Notification -->
  <Toast 
    bind:this={toastRef}
    bind:visible={showToast}
    message={toastMessage}
    duration={2000}
  />
  
  <!-- Save System Integration -->
  <SaveSystemIntegration />
</div>

<style>
  .kline-main{
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    color: var(--text-color);
    background-color: var(--background-color);
    min-height: 0; /* Ensure proper flex behavior */
    height: 100%; /* Explicit height for proper layout */
    transition: none; /* Disable transitions during fullscreen changes */
  }
  
  /* Horizontal container for content and sidebar */
  .chart-container {
    flex: 1;
    display: flex;
    flex-direction: row;
    width: 100%;
    height: var(--widget-height);
    min-height: 0;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1); /* Smooth resize transition */
  }
  
  .kline-main:fullscreen {
    width: 100vw !important;
    height: 100vh !important;
    --period-bar-height: 38px;
    --drawing-bar-width: 52px;
    --widget-width: calc(100% - var(--drawing-bar-width));
    --widget-height: calc(100% - var(--period-bar-height));
  }
  
  /* Ensure proper layout restoration after fullscreen */
  .kline-main:not(:fullscreen) {
    width: auto !important;
    height: 100% !important;
  }

  .kline-content{
    flex: 1;
    display: flex;
    flex-direction: row;
    min-width: 0; /* Allow flex item to shrink below content size */
    height: 100%;
    border-left: 3.5px solid var(--border-color);
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1); /* Smooth resize transition */
  }

  .kline-widget{
    flex: 1;
    width: var(--widget-width);
    height: 100%;
    margin-left: 0;
    padding: 0;
    overflow: hidden;
    outline: none;
    border-right: 3.5px solid var(--border-color);
    background-color: var(--chart-background-color, var(--background-color));
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1); /* Smooth resize transition */
  }

  .kline-widget:focus {
    outline: none;
  }

  :host {
    --period-bar-height: 38px;
    --drawing-bar-width: 52px;
    --widget-width: calc(100% - var(--drawing-bar-width));
    --widget-height: calc(100% - var(--period-bar-height));
  }

  [data-theme="light"] {
    --primary-color: #1677ff;
    --selected-color: fade(#1677ff, 15%);
    --hover-background-color: rgba(22, 119, 255, 0.15);
    --background-color: #ffffff;
    --popover-background-color: #ffffff;
    --text-color: #051441;
    --text-second-color: #76808F;
    --border-color: #ebedf1;
    --chart-background-color: #ffffff;
    --separator-hover-color: rgba(221, 221, 221, 0.5);
    --separator-active-color: rgba(221, 221, 221, 0.7);
  }
  [data-theme="dark"] {
    --primary-color: #1677ff;
    --selected-color: fade(#1677ff, 15%);
    --hover-background-color: rgba(22, 119, 255, 0.15);
    --background-color: #0f0f0f;
    --popover-background-color: #1c1c1f;
    --text-color: #cccccc;
    --text-second-color: #929AA5;
    --border-color: #292929;
    --chart-background-color: #0f0f0f;
    --separator-hover-color: rgba(85, 85, 85, 0.5);
    --separator-active-color: rgba(85, 85, 85, 0.7);
  }


  @font-face {
    font-family: 'icomoon';
    src:  url('/fonts/icomoon.eot?f4efml');
    src:  url('/fonts/icomoon.eot?f4efml#iefix') format('embedded-opentype'),
      url('/fonts/icomoon.ttf?f4efml') format('truetype'),
      url('/fonts/icomoon.woff?f4efml') format('woff'),
      url('/fonts/icomoon.svg?f4efml#icomoon') format('svg');
    font-weight: normal;
    font-style: normal;
    font-display: block;
  }







  /* Historical data loading indicator */
  .historical-loading-indicator {
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: var(--popover-background-color);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-second-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }

  .loading-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--border-color);
    border-top: 2px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Mobile responsive styles */
  @media (max-width: 768px) {
    .kline-main {
      min-height: 400px; /* Ensure minimum height on mobile */
    }
    
    .chart-container {
      height: calc(100vh - var(--period-bar-height) - 60px); /* Account for mobile browser UI */
      min-height: 350px;
    }
    
    .kline-widget {
      padding-bottom: 20px; /* Extra padding to prevent XAxis text cutoff */
      box-sizing: border-box;
    }
    
    .kline-content {
      border-left-width: 2px; /* Thinner border on mobile */
    }
    
    .kline-widget {
      border-right-width: 2px; /* Thinner border on mobile */
    }


  }

  @media (max-width: 480px) {
    .kline-main {
      min-height: 350px; /* Smaller minimum height for very small screens */
    }
    
    .chart-container {
      height: calc(100vh - var(--period-bar-height) - 80px); /* More space for mobile browser UI */
      min-height: 300px;
    }
    
    .kline-widget {
      padding-bottom: 25px; /* More padding for very small screens */
    }
    
    .kline-content {
      border-left-width: 1px; /* Even thinner border on small mobile */
    }
    
    .kline-widget {
      border-right-width: 1px; /* Even thinner border on small mobile */
    }
  }

  /* Enhanced separator styling for better interaction */
  :global(.klinecharts-pane-separator) {
    position: relative !important;
    cursor: ns-resize !important;
    transition: background-color 0.2s ease !important;
    z-index: 10 !important;
    /* Performance optimizations */
    will-change: transform, background-color !important;
    transform: translateZ(0) !important; /* Force hardware acceleration */
    backface-visibility: hidden !important;
    perspective: 1000px !important;
    contain: layout style paint !important; /* CSS containment for better performance */
  }

  /* Enhanced touch area for mobile */
  :global(.klinecharts-pane-separator::before) {
    content: '' !important;
    position: absolute !important;
    top: -5px !important;
    left: 0 !important;
    right: 0 !important;
    bottom: -5px !important;
    background: transparent !important;
    cursor: ns-resize !important;
    z-index: 11 !important;
  }

  /* Hover effects for desktop */
  :global(.klinecharts-pane-separator:hover) {
    background-color: var(--separator-hover-color) !important;
  }

  /* Active state during drag */
  :global(.klinecharts-pane-separator:active),
  :global(.klinecharts-pane-separator.dragging) {
    background-color: var(--separator-active-color) !important;
  }

  /* Touch-friendly sizing for mobile devices */
  @media (pointer: coarse) {
    :global(.klinecharts-pane-separator::before) {
      top: -8px !important;
      bottom: -8px !important;
    }
    
    :global(.klinecharts-pane-separator) {
      min-height: 16px !important;
    }
  }

  /* High DPI support */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    :global(.klinecharts-pane-separator) {
      transform: translateZ(0) !important;
    }
  }

</style>