<script lang="ts">
  import Modal from "./modal.svelte"
  import ColorPicker from "../ColorPicker.svelte"
  import GradientEditor from "../GradientEditor.svelte"
  import { getContext, onDestroy } from "svelte";
  import * as m from '$lib/paraglide/messages.js'
  import type { Chart, Nullable } from 'klinecharts';
  import { ChartCtx, ChartSave } from "./chart";
  import type { Writable } from "svelte/store";
  import _ from "lodash";
  import { getThemeStyles, processLineChartStyles } from "./coms";
  import { SvelteMap } from "svelte/reactivity"
  import { TransactionalThemeManager } from "$lib/stores/themeManager.js";

  let { show = $bindable() } = $props();
  
  const ctx = getContext('ctx') as Writable<ChartCtx>;
  const save = getContext('save') as Writable<ChartSave>;
  const chart = getContext('chart') as Writable<Nullable<Chart>>;
  
  // Initialize theme manager
  const themeManager = new TransactionalThemeManager('chart-settings', chart, 'dark');
  
  // Clean up theme manager on component destroy
  onDestroy(() => {
    themeManager.destroy();
  });
  
  // Track if modal was confirmed to avoid double-canceling
  let wasConfirmed = $state(false);
  
  // Debounce timer for candle style updates (for performance optimization)
  let candleStyleUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Open modal when show becomes true
  $effect(() => {
    if (show) {
      console.log('🔧 Settings modal OPENED');
      console.log('  - Current $save.styles.candle.type:', $save.styles?.candle?.type);
      console.log('  - Current chart.getStyles().candle.type:', $chart?.getStyles()?.candle?.type);
      wasConfirmed = false;
      themeManager.openModal();
    } else if (!wasConfirmed) {
      // Modal closed without confirm - cancel pending changes and reapply saved colors
      console.log('🚫 Settings modal CANCELLED');
      
      // Clear any pending candle style updates
      if (candleStyleUpdateTimer) {
        clearTimeout(candleStyleUpdateTimer);
        candleStyleUpdateTimer = null;
      }
      
      // Restore saved colors immediately
      // Force using saved styles (do not preserve current DOM preview colors)
      try { (window as any).__forceApplySavedCanvasColors = true; } catch (_) {}
      if ($ctx.applyCanvasColors) {
        $ctx.applyCanvasColors();
      }
    }
  });
  
  // Tab state
  let activeTab = $state('canvas');
  

  
  // Temporary color settings for preview
  const tempSettings = new SvelteMap<string, any>();
  
  // Color picker states
  let showBackgroundColorPicker = $state(false);
  let showGridColorPicker = $state(false);
  let showXAxisTickTextColorPicker = $state(false);
  let showYAxisTickTextColorPicker = $state(false);
  let backgroundColorPickerPosition = $state({ x: 0, y: 0 });
  let gridColorPickerPosition = $state({ x: 0, y: 0 });
  let xAxisTickTextColorPickerPosition = $state({ x: 0, y: 0 });
  let yAxisTickTextColorPickerPosition = $state({ x: 0, y: 0 });
  
  // Candle color picker states
  let showCandleBodyBullColorPicker = $state(false);
  let showCandleBodyBearColorPicker = $state(false);
  let showCandleBorderBullColorPicker = $state(false);
  let showCandleBorderBearColorPicker = $state(false);
  let showCandleWickBullColorPicker = $state(false);
  let showCandleWickBearColorPicker = $state(false);
  let candleBodyBullColorPickerPosition = $state({ x: 0, y: 0 });
  let candleBodyBearColorPickerPosition = $state({ x: 0, y: 0 });
  let candleBorderBullColorPickerPosition = $state({ x: 0, y: 0 });
  let candleBorderBearColorPickerPosition = $state({ x: 0, y: 0 });
  let candleWickBullColorPickerPosition = $state({ x: 0, y: 0 });
  let candleWickBearColorPickerPosition = $state({ x: 0, y: 0 });
  
  // Gradient editor states
  let showBackgroundGradientEditor = $state(false);
  let showGridGradientEditor = $state(false);
  
  // Restoration flag to prevent preview during restore
  let isRestoring = $state(false);
  
  // Color type dropdowns - Initialize from saved values to show correct type in dropdown
  let backgroundColorType = $state<'solid' | 'gradient'>(
    _.get($save.styles, 'backgroundType') || 'solid'
  );
  let gridColorType = $state<'solid' | 'gradient'>(
    _.get($save.styles, 'gridType') || 'solid'
  );
  
  // Note: Real-time preview is handled directly in the $effect handlers below
  // Theme manager is only used for final confirmation
  
  // Color values - Initialize from saved values
  let backgroundColor = $state(
    _.get($save.styles, 'backgroundColor') || '#000000'
  );
  let gridColor = $state(
    _.get($save.styles, 'grid.horizontal.color') || '#333333'
  );
  
  // Opacity values
  let backgroundOpacity = $state(100);
  let gridOpacity = $state(100);
  let xAxisTickTextOpacity = $state(100);
  let yAxisTickTextOpacity = $state(100);
  
  // Other Settings (Chart Settings) options
  const otherSettingsOptions: Array<{key: string, label: string, type: string, default: any, options?: Array<{value: string, label: string}>}> = [
    {
      key: 'candle.priceMark.last.show',
      label: 'Show Last Price',
      type: 'switch',
      default: true
    },
    {
      key: 'candle.priceMark.high.show',
      label: 'Show High Price',
      type: 'switch',
      default: true
    },
    {
      key: 'candle.priceMark.low.show',
      label: 'Show Low Price',
      type: 'switch',
      default: true
    },
    {
      key: 'indicator.lastValueMark.show',
      label: 'Show Indicator Last Value',
      type: 'switch',
      default: true
    },
    {
      key: 'yAxis.reverse',
      label: 'Reverse Coordinate',
      type: 'switch',
      default: false
    },
    {
      key: 'grid.show',
      label: 'Grid Show',
      type: 'switch',
      default: true
    }
  ];
  
  // Other Settings temporary values
  const otherSettingsTmp = new SvelteMap<string, any>();
  
  // Candle settings
  let candleBodyShow = $state(true);
  let candleBorderShow = $state(true);
  let candleWickShow = $state(true);
  
  // Candle colors (default values)
  let candleBodyBullColor = $state('#26a69a'); // Green for bull
  let candleBodyBearColor = $state('#ef5350'); // Red for bear
  let candleBorderBullColor = $state('#26a69a');
  let candleBorderBearColor = $state('#ef5350');
  let candleWickBullColor = $state('#26a69a');
  let candleWickBearColor = $state('#ef5350');
  

  
  // Gradient configurations - Initialize with saved or default values
  // Format MUST match GradientEditor: { position, color, opacity }
  let backgroundGradient = $state(
    _.get($save.styles, 'backgroundGradient') || {
      type: 'linear',
      direction: 90,
      stops: [
        { position: 0, color: '#1a1a1a', opacity: 100 },
        { position: 100, color: '#4a4a4a', opacity: 100 }
      ]
    }
  );
  
  let gridGradient = $state(
    _.get($save.styles, 'gridGradient') || {
      type: 'linear',
      direction: 90,
      stops: [
        { position: 0, color: '#2a2a2a', opacity: 100 },
        { position: 100, color: '#3a3a3a', opacity: 100 }
      ]
    }
  );
  
  // Generate CSS from gradient object
  function generateGradientCSS(gradient: any) {
    if (!gradient || !gradient.stops) return '';
    
    const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
    const stopStrings = sortedStops.map(stop => {
      const r = parseInt(stop.color.slice(1, 3), 16);
      const g = parseInt(stop.color.slice(3, 5), 16);
      const b = parseInt(stop.color.slice(5, 7), 16);
      const alpha = stop.opacity / 100;
      return `rgba(${r}, ${g}, ${b}, ${alpha}) ${stop.position}%`;
    });
    
    if (gradient.type === 'linear') {
      return `linear-gradient(${gradient.direction}deg, ${stopStrings.join(', ')})`;
    } else {
      return `radial-gradient(circle, ${stopStrings.join(', ')})`;
    }
  }

  // Helper function to extract hex color from rgba string
  function extractHexFromRgba(colorValue: string): string {
    if (typeof colorValue === 'string' && colorValue.startsWith('rgba(')) {
      const rgbaMatch = colorValue.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
      if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1]);
        const g = parseInt(rgbaMatch[2]);
        const b = parseInt(rgbaMatch[3]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    return colorValue;
  }

  // Default colors based on theme
  function getDefaultColors() {
    const theme = $save.theme;
    return {
      backgroundColor: theme === 'dark' ? '#070211' : '#ffffff',
      backgroundOpacity: 100,
      gridColor: theme === 'dark' ? '#081115' : '#F3F3F3',
      gridOpacity: 100,
      xAxisTickTextColor: theme === 'dark' ? '#ffffff' : '#000000',
      yAxisTickTextColor: theme === 'dark' ? '#ffffff' : '#000000'
    };
  }
  
  // Initialize temp settings when modal opens
  $effect(() => {
    if (show && $chart) {
      console.log('📂 Modal opened - restoring saved values...');
      isRestoring = true; // Set flag BEFORE restoring
      
      // Clear temp settings first
      tempSettings.clear();
      
      restoreSavedValues();
      // Use microtask to ensure restoreSavedValues completes first
      queueMicrotask(() => {
        isRestoring = false; // Clear flag AFTER restore
        console.log('✅ Restoration complete - preview enabled');
      });
    }
  });

  // Handle background color type changes with real-time preview
  $effect(() => {
    if (!$chart || !show || isRestoring) return;
    
    // Only track background-specific dependencies
    const currentBackgroundOpacity = backgroundOpacity;
    const currentBackgroundColor = backgroundColor;
    const currentBackgroundColorType = backgroundColorType;
    const currentBackgroundGradient = backgroundGradient;
    
    // Track deep changes to gradient by accessing stops
    const gradientStops = currentBackgroundGradient?.stops;
    const gradientType = currentBackgroundGradient?.type;
    const gradientDirection = currentBackgroundGradient?.direction;
    
    const chartContainer = document.querySelector('.kline-main');
    const chartWidget = document.querySelector('.kline-widget');
    
    if (currentBackgroundColorType === 'solid') {
      const bgColor = tempSettings.get('backgroundColor') || currentBackgroundColor || getDefaultColors().backgroundColor;
      const opacity = tempSettings.get('backgroundOpacity') ?? currentBackgroundOpacity ?? 100;
      const normalizedOpacity = opacity / 100;
      const rgbaColor = hexToRgba(bgColor, normalizedOpacity);
      
      [chartContainer, chartWidget].forEach(container => {
        if (container) {
          const element = container as HTMLElement;
          element.style.removeProperty('background');
          element.style.removeProperty('background-color');
          element.offsetHeight;
          element.style.setProperty('background', rgbaColor, 'important');
          element.style.setProperty('background-color', rgbaColor, 'important');
          element.style.setProperty('--chart-background-color', rgbaColor);
          element.offsetHeight;
        }
      });
    } else if (currentBackgroundColorType === 'gradient') {
      const bgGradient = tempSettings.get('backgroundGradient') || currentBackgroundGradient;
      
      let validGradient = bgGradient;
      if (!bgGradient || !bgGradient.stops || bgGradient.stops.length === 0) {
        validGradient = {
          type: 'linear',
          direction: 90,
          stops: [
            { position: 0, color: '#1a1a1a', opacity: 100 },
            { position: 100, color: '#4a4a4a', opacity: 100 }
          ]
        };
        tempSettings.set('backgroundGradient', validGradient);
      }
      
      const gradientCSS = validGradient.css || generateGradientCSS(validGradient);
      
      [chartContainer, chartWidget].forEach(container => {
        if (container) {
          const element = container as HTMLElement;
          element.style.removeProperty('background');
          element.style.removeProperty('background-color');
          element.offsetHeight;
          element.style.setProperty('background', gradientCSS, 'important');
          element.style.setProperty('background-color', gradientCSS, 'important');
          element.style.setProperty('--chart-background-color', gradientCSS);
          element.offsetHeight;
        }
      });
    }
   });

  // Handle grid color changes with real-time preview
  $effect(() => {
    if (!$chart || !show || isRestoring) return;
    
    // Only track grid-specific dependencies
    const currentGridOpacity = gridOpacity;
    const currentGridColor = gridColor;
    const currentGridColorType = gridColorType;
    const currentGridGradient = gridGradient;
    
    // Track deep changes to gradient by accessing stops
    const gradientStops = currentGridGradient?.stops;
    const gradientType = currentGridGradient?.type;
    const gradientDirection = currentGridGradient?.direction;
    
    console.log('🔄 Grid effect triggered:', {
      gridColorType: currentGridColorType,
      gridColor: currentGridColor,
      gridOpacity: currentGridOpacity
    });
    
    if (currentGridColorType === 'solid') {
      const gColor = tempSettings.get('gridColor') || currentGridColor || getDefaultColors().gridColor;
      const opacity = tempSettings.get('gridOpacity') ?? currentGridOpacity ?? 100;
      const rgbaColor = hexToRgba(gColor, opacity / 100);
      
      console.log('🎨 Applying solid grid color via effect:', rgbaColor);
      
      // Get current styles and merge grid changes
      const currentStyles = $chart.getStyles() ?? {};
      const newStyles = _.cloneDeep(currentStyles);
      
      // IMPORTANT: Preserve original chart type from $save.styles
      if ($save.styles?.candle?.type) {
        _.set(newStyles, 'candle.type', $save.styles.candle.type);
      }
      
      // Preserve current grid show state and set colors
      const currentGridShow = _.get(currentStyles, 'grid.show', true);
      _.set(newStyles, 'grid.show', currentGridShow);
      _.set(newStyles, 'grid.horizontal.show', currentGridShow);
      _.set(newStyles, 'grid.horizontal.color', rgbaColor);
      _.set(newStyles, 'grid.vertical.show', currentGridShow);
      _.set(newStyles, 'grid.vertical.color', rgbaColor);
      
      $chart.setStyles(newStyles);
    } else if (currentGridColorType === 'gradient') {
      const gGradient = tempSettings.get('gridGradient') || currentGridGradient;
      
      if (gGradient && gGradient.stops && gGradient.stops.length > 0) {
        const firstStop = gGradient.stops[0];
        const lastStop = gGradient.stops[gGradient.stops.length - 1];
        const avgColor = blendColors(firstStop.color, lastStop.color, 0.5);
        
        console.log('🎨 Applying gradient grid color via effect:', avgColor);
        
        const currentStyles = $chart.getStyles() ?? {};
        const newStyles = _.cloneDeep(currentStyles);
        
        if ($save.styles?.candle?.type) {
          _.set(newStyles, 'candle.type', $save.styles.candle.type);
        }
        
        const currentGridShow = _.get(currentStyles, 'grid.show', true);
        _.set(newStyles, 'grid.show', currentGridShow);
        _.set(newStyles, 'grid.horizontal.show', currentGridShow);
        _.set(newStyles, 'grid.horizontal.color', avgColor);
        _.set(newStyles, 'grid.vertical.show', currentGridShow);
        _.set(newStyles, 'grid.vertical.color', avgColor);
        
        $chart.setStyles(newStyles);
      }
    }
  });

  // Grid color preview is handled directly in the change handlers below
  
  function restoreSavedValues() {
    const defaults = getDefaultColors();
    
    console.log('🔄 Restoring saved values...', {
      backgroundType: _.get($save.styles, 'backgroundType'),
      gridType: _.get($save.styles, 'gridType')
    });
    
    // Restore background settings from saved values
    const savedBgType = _.get($save.styles, 'backgroundType') || 'solid';
    backgroundColorType = savedBgType; // This will trigger the $effect
    
    if (savedBgType === 'solid') {
      const savedBgColor = _.get($save.styles, 'backgroundColor') || defaults.backgroundColor;
      const savedBgOpacity = _.get($save.styles, 'backgroundOpacity') || defaults.backgroundOpacity;
      
      // Extract the actual color value if it contains rgba with opacity
      const actualBgColor = extractHexFromRgba(savedBgColor);
      
      backgroundColor = actualBgColor;
      backgroundOpacity = savedBgOpacity;
      tempSettings.set('backgroundColor', actualBgColor);
      tempSettings.set('backgroundOpacity', savedBgOpacity);
      
      console.log('✅ Restored solid BG:', actualBgColor, 'opacity:', savedBgOpacity);
    } else if (savedBgType === 'gradient') {
      const savedBgGradient = _.get($save.styles, 'backgroundGradient');
      if (savedBgGradient) {
        backgroundGradient = { ...savedBgGradient }; // Create new object to trigger reactivity
        tempSettings.set('backgroundGradient', savedBgGradient);
        console.log('✅ Restored gradient BG:', savedBgGradient);
      }
    }
    
    // Restore grid settings from saved values
    const savedGridType = _.get($save.styles, 'gridType') || 'solid';
    gridColorType = savedGridType;
    
    if (savedGridType === 'solid') {
      // Try to get saved grid color from the correct paths where it was saved
      const savedGridColor = _.get($save.styles, 'grid.horizontal.color') || 
                            _.get($save.styles, 'grid.vertical.color') || 
                            defaults.gridColor;
      const savedGridOpacity = _.get($save.styles, 'gridOpacity') || defaults.gridOpacity;
      
      // Extract the actual color value if it contains rgba with opacity
      const actualGridColor = extractHexFromRgba(savedGridColor);
      
      gridColor = actualGridColor;
      gridOpacity = savedGridOpacity;
      tempSettings.set('gridColor', actualGridColor);
      tempSettings.set('gridOpacity', savedGridOpacity);
      
      console.log('✅ Restored solid Grid:', actualGridColor, 'opacity:', savedGridOpacity);
    } else if (savedGridType === 'gradient') {
      const savedGridGradient = _.get($save.styles, 'gridGradient');
      if (savedGridGradient) {
        gridGradient = { ...savedGridGradient }; // Create new object to trigger reactivity
        tempSettings.set('gridGradient', savedGridGradient);
        console.log('✅ Restored gradient Grid:', savedGridGradient);
      }
    }
    
    // Restore xAxis tickText color and opacity from saved values
    const savedXAxisTickTextColor = _.get($save.styles, 'xAxis.tickText.color') || defaults.xAxisTickTextColor;
    const savedXAxisTickTextOpacity = _.get($save.styles, 'xAxis.tickText.opacity') || 100;
    const actualXAxisColor = extractHexFromRgba(savedXAxisTickTextColor);
    xAxisTickTextOpacity = savedXAxisTickTextOpacity;
    tempSettings.set('xAxisTickTextColor', actualXAxisColor);
    tempSettings.set('xAxisTickTextOpacity', savedXAxisTickTextOpacity);
    
    // Restore yAxis tickText color and opacity from saved values
    const savedYAxisTickTextColor = _.get($save.styles, 'yAxis.tickText.color') || defaults.yAxisTickTextColor;
    const savedYAxisTickTextOpacity = _.get($save.styles, 'yAxis.tickText.opacity') || 100;
    const actualYAxisColor = extractHexFromRgba(savedYAxisTickTextColor);
    yAxisTickTextOpacity = savedYAxisTickTextOpacity;
    tempSettings.set('yAxisTickTextColor', actualYAxisColor);
    tempSettings.set('yAxisTickTextOpacity', savedYAxisTickTextOpacity);
    
    // Restore candle colors from saved values
    const savedCandleBodyBullColor = _.get($save.styles, 'candle.bar.upColor') || '#26a69a';
    const savedCandleBodyBearColor = _.get($save.styles, 'candle.bar.downColor') || '#ef5350';
    const savedCandleBorderBullColor = _.get($save.styles, 'candle.bar.upBorderColor') || '#26a69a';
    const savedCandleBorderBearColor = _.get($save.styles, 'candle.bar.downBorderColor') || '#ef5350';
    const savedCandleWickBullColor = _.get($save.styles, 'candle.bar.upWickColor') || '#26a69a';
    const savedCandleWickBearColor = _.get($save.styles, 'candle.bar.downWickColor') || '#ef5350';
    
    candleBodyBullColor = savedCandleBodyBullColor;
    candleBodyBearColor = savedCandleBodyBearColor;
    candleBorderBullColor = savedCandleBorderBullColor;
    candleBorderBearColor = savedCandleBorderBearColor;
    candleWickBullColor = savedCandleWickBullColor;
    candleWickBearColor = savedCandleWickBearColor;
    
    // Restore other settings values
    otherSettingsOptions.forEach((option) => {
      const savedValue = _.get($save.styles, option.key);
      if (savedValue !== undefined) {
        otherSettingsTmp.set(option.key, savedValue);
      } else {
        otherSettingsTmp.set(option.key, option.default);
      }
    });
  }

  function resetToCurrentValues() {
    const defaults = getDefaultColors();
    
    // Reset to default values
    backgroundColor = defaults.backgroundColor;
    backgroundOpacity = defaults.backgroundOpacity;
    backgroundColorType = 'solid';
    backgroundGradient = { type: 'linear', direction: 0, stops: [] };
    
    gridColor = defaults.gridColor;
    gridOpacity = defaults.gridOpacity;
    gridColorType = 'solid';
    gridGradient = { type: 'linear', direction: 0, stops: [] };
    
    tempSettings.set('backgroundColor', defaults.backgroundColor);
    tempSettings.set('backgroundOpacity', defaults.backgroundOpacity);
    tempSettings.set('gridColor', defaults.gridColor);
    tempSettings.set('gridOpacity', defaults.gridOpacity);
    
    // Apply default background color with opacity
    const normalizedOpacity = defaults.backgroundOpacity / 100;
    const rgbaColor = hexToRgba(defaults.backgroundColor, normalizedOpacity);
    const chartContainer = document.querySelector('.kline-main');
    const chartWidget = document.querySelector('.kline-widget');
    if (chartContainer) {
      (chartContainer as HTMLElement).style.setProperty('--chart-background-color', rgbaColor);
    }
    if (chartWidget) {
      (chartWidget as HTMLElement).style.setProperty('--chart-background-color', rgbaColor);
    }
  }
  
  function updateChartPreview() {
    if (!$chart) return;
    
    const currentStyles = $chart.getStyles() ?? {};
    const newStyles = _.cloneDeep(currentStyles);
    
    // Update background color
    const bgColor = tempSettings.get('backgroundColor');
    if (bgColor) {
      _.set(newStyles, 'pane.backgroundColor', bgColor);
      _.set(newStyles, 'candle.pane.backgroundColor', bgColor);
    }
    
    // Update grid color
    const gridColor = tempSettings.get('gridColor');
    if (gridColor) {
      _.set(newStyles, 'grid.horizontal.color', gridColor);
      _.set(newStyles, 'grid.vertical.color', gridColor);
    }
    
    // Apply styles to chart for preview
    $chart.setStyles(processLineChartStyles(newStyles as unknown as Record<string, unknown>));
  }
  
  function handleBackgroundColorChange(event: CustomEvent) {
    backgroundColor = event.detail;
    tempSettings.set('backgroundColor', event.detail);
    
    // Apply IMMEDIATELY for real-time preview - BYPASS theme manager
    if (backgroundColorType === 'solid') {
      const normalizedOpacity = backgroundOpacity / 100;
      const rgbaColor = hexToRgba(event.detail, normalizedOpacity);
      
      const chartContainer = document.querySelector('.kline-main');
      const chartWidget = document.querySelector('.kline-widget');
      
      [chartContainer, chartWidget].forEach(container => {
        if (container) {
          const element = container as HTMLElement;
          element.style.removeProperty('background');
          element.style.removeProperty('background-color');
          element.style.removeProperty('background-image');
          element.offsetHeight;
          element.style.setProperty('background', rgbaColor, 'important');
          element.style.setProperty('background-color', rgbaColor, 'important');
          element.style.setProperty('--chart-background-color', rgbaColor);
          element.offsetHeight;
        }
      });
    }
  }

  function handleBackgroundOpacityChange(event: CustomEvent) {
    backgroundOpacity = event.detail;
    tempSettings.set('backgroundOpacity', event.detail);
    
    // Apply IMMEDIATELY for real-time preview
    if (backgroundColorType === 'solid') {
      const bgColor = tempSettings.get('backgroundColor') || backgroundColor || getDefaultColors().backgroundColor;
      const normalizedOpacity = event.detail / 100;
      const rgbaColor = hexToRgba(bgColor, normalizedOpacity);
      
      const chartContainer = document.querySelector('.kline-main');
      const chartWidget = document.querySelector('.kline-widget');
      
      [chartContainer, chartWidget].forEach(container => {
        if (container) {
          const element = container as HTMLElement;
          element.style.removeProperty('background');
          element.style.removeProperty('background-color');
          element.offsetHeight;
          element.style.setProperty('background', rgbaColor, 'important');
          element.style.setProperty('background-color', rgbaColor, 'important');
          element.style.setProperty('--chart-background-color', rgbaColor);
          element.offsetHeight;
        }
      });
    }
  }

  function handleGridColorChange(event: CustomEvent) {
    console.log('🎨 Grid color changed to:', event.detail);
    gridColor = event.detail;
    tempSettings.set('gridColor', event.detail);
    
    if (!$chart) {
      console.warn('⚠️ No chart available for grid color preview');
      return;
    }
    
    const rgbaColor = hexToRgba(event.detail, gridOpacity / 100);
    console.log('🎨 Applying grid color:', rgbaColor);
    
    // Get current styles and merge grid changes
    const currentStyles = $chart.getStyles() ?? {};
    const newStyles = _.cloneDeep(currentStyles);
    
    // IMPORTANT: Preserve original chart type from $save.styles
    if ($save.styles?.candle?.type) {
      _.set(newStyles, 'candle.type', $save.styles.candle.type);
    }
    
    // Preserve current grid show state and set colors
    const currentGridShow = _.get(currentStyles, 'grid.show', true);
    _.set(newStyles, 'grid.show', currentGridShow);
    _.set(newStyles, 'grid.horizontal.show', currentGridShow);
    _.set(newStyles, 'grid.horizontal.color', rgbaColor);
    _.set(newStyles, 'grid.vertical.show', currentGridShow);
    _.set(newStyles, 'grid.vertical.color', rgbaColor);
    
    console.log('🎨 New grid styles:', newStyles.grid);
    
    try {
      $chart.setStyles(newStyles);
      console.log('✅ Grid styles applied successfully');
    } catch (error) {
      console.error('❌ Failed to apply grid styles:', error);
    }
  }
  
  function handleGridOpacityChange(event: CustomEvent) {
    console.log('🎨 Grid opacity changed to:', event.detail);
    gridOpacity = event.detail;
    tempSettings.set('gridOpacity', event.detail);
    
    if (!$chart) {
      console.warn('⚠️ No chart available for grid opacity preview');
      return;
    }
    
    const gColor = tempSettings.get('gridColor') || gridColor || getDefaultColors().gridColor;
    const rgbaColor = hexToRgba(gColor, event.detail / 100);
    console.log('🎨 Applying grid opacity:', rgbaColor);
    
    // Get current styles and merge grid changes
    const currentStyles = $chart.getStyles() ?? {};
    const newStyles = _.cloneDeep(currentStyles);
    
    // IMPORTANT: Preserve original chart type from $save.styles
    if ($save.styles?.candle?.type) {
      _.set(newStyles, 'candle.type', $save.styles.candle.type);
    }
    
    // Preserve current grid show state and set colors
    const currentGridShow = _.get(currentStyles, 'grid.show', true);
    _.set(newStyles, 'grid.show', currentGridShow);
    _.set(newStyles, 'grid.horizontal.show', currentGridShow);
    _.set(newStyles, 'grid.horizontal.color', rgbaColor);
    _.set(newStyles, 'grid.vertical.show', currentGridShow);
    _.set(newStyles, 'grid.vertical.color', rgbaColor);
    
    console.log('🎨 New grid styles:', newStyles.grid);
    
    try {
      $chart.setStyles(newStyles);
      console.log('✅ Grid opacity applied successfully');
    } catch (error) {
      console.error('❌ Failed to apply grid opacity:', error);
    }
  }
  
  function handleXAxisTickTextColorChange(event: CustomEvent) {
    tempSettings.set('xAxisTickTextColor', event.detail);
    
    // Apply xAxis tickText color change immediately for real-time preview
    if ($chart) {
      const currentStyles = $chart.getStyles() ?? {};
      const newStyles = _.cloneDeep(currentStyles);
      
      _.set(newStyles, 'xAxis.tickText.color', event.detail);
      
      const processedStyles = processLineChartStyles(newStyles as unknown as Record<string, unknown>);
      $chart.setStyles(processedStyles);
    }
  }
  
  function handleYAxisTickTextColorChange(event: CustomEvent) {
    tempSettings.set('yAxisTickTextColor', event.detail);
    
    // Apply yAxis tickText color change immediately for real-time preview
    if ($chart) {
      const currentStyles = $chart.getStyles() ?? {};
      const newStyles = _.cloneDeep(currentStyles);
      
      _.set(newStyles, 'yAxis.tickText.color', event.detail);
      
      const processedStyles = processLineChartStyles(newStyles as unknown as Record<string, unknown>);
      $chart.setStyles(processedStyles);
    }
  }
  
  function handleXAxisTickTextOpacityChange(event: CustomEvent) {
    xAxisTickTextOpacity = event.detail;
    tempSettings.set('xAxisTickTextOpacity', event.detail);
    
    // Apply xAxis tickText opacity change immediately for real-time preview
    if ($chart) {
      const currentStyles = $chart.getStyles() ?? {};
      const newStyles = _.cloneDeep(currentStyles);
      const tickTextColor = tempSettings.get('xAxisTickTextColor') || getDefaultColors().xAxisTickTextColor;
      
      // Convert opacity from 0-100 range to 0-1 range
      const normalizedOpacity = event.detail / 100;
      
      // Convert hex color to rgba with opacity
      const rgbaColor = hexToRgba(tickTextColor, normalizedOpacity);
      
      _.set(newStyles, 'xAxis.tickText.color', rgbaColor);
      
      const processedStyles = processLineChartStyles(newStyles as unknown as Record<string, unknown>);
      $chart.setStyles(processedStyles);
    }
  }
  
  function handleYAxisTickTextOpacityChange(event: CustomEvent) {
    yAxisTickTextOpacity = event.detail;
    tempSettings.set('yAxisTickTextOpacity', event.detail);
    
    // Apply yAxis tickText opacity change immediately for real-time preview
    if ($chart) {
      const currentStyles = $chart.getStyles() ?? {};
      const newStyles = _.cloneDeep(currentStyles);
      const tickTextColor = tempSettings.get('yAxisTickTextColor') || getDefaultColors().yAxisTickTextColor;
      
      // Convert opacity from 0-100 range to 0-1 range
      const normalizedOpacity = event.detail / 100;
      
      // Convert hex color to rgba with opacity
      const rgbaColor = hexToRgba(tickTextColor, normalizedOpacity);
      
      _.set(newStyles, 'yAxis.tickText.color', rgbaColor);
      
      const processedStyles = processLineChartStyles(newStyles as unknown as Record<string, unknown>);
      $chart.setStyles(processedStyles);
    }
  }
  
  // Handle background gradient change
  function handleBackgroundGradientChange(event: CustomEvent) {
    backgroundGradient = { ...event.detail };
    tempSettings.set('backgroundGradient', backgroundGradient);
    
    // Apply DIRECTLY for immediate preview
    if (backgroundColorType === 'gradient') {
      const chartContainer = document.querySelector('.kline-main');
      const chartWidget = document.querySelector('.kline-widget');
      const gradientCSS = generateGradientCSS(backgroundGradient);
      
      [chartContainer, chartWidget].forEach(container => {
        if (container) {
          const element = container as HTMLElement;
          element.style.removeProperty('background');
          element.style.removeProperty('background-color');
          element.offsetHeight;
          element.style.setProperty('background', gradientCSS, 'important');
          element.style.setProperty('background-color', gradientCSS, 'important');
          element.style.setProperty('--chart-background-color', gradientCSS);
          element.offsetHeight;
        }
      });
    }
  }
  
  // Handle grid gradient change
  function handleGridGradientChange(event: CustomEvent) {
    gridGradient = { ...event.detail };
    tempSettings.set('gridGradient', gridGradient);
    
    // Apply DIRECTLY for immediate preview
    if ($chart && gridColorType === 'gradient') {
      const firstStop = event.detail.stops[0];
      const lastStop = event.detail.stops[event.detail.stops.length - 1];
      const avgColor = blendColors(firstStop.color, lastStop.color, 0.5);
      
      const currentStyles = $chart.getStyles() ?? {};
      const newStyles = _.cloneDeep(currentStyles);
      
      if ($save.styles?.candle?.type) {
        _.set(newStyles, 'candle.type', $save.styles.candle.type);
      }
      
      _.set(newStyles, 'grid.horizontal.color', avgColor);
      _.set(newStyles, 'grid.vertical.color', avgColor);
      
      const processedStyles = processLineChartStyles(newStyles as unknown as Record<string, unknown>);
      $chart.setStyles(processedStyles);
    }
  }
  
  // Helper function to blend two colors
  function blendColors(color1: string, color2: string, ratio: number): string {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
    const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
    const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  // Other Settings update function
  function updateOtherSetting(key: string, value: unknown) {
    const style = $chart?.getStyles();
    const oldVal = _.get(style, key);
    
    // Handle klinecharts v10 API changes
    if (key === 'yAxis.reverse') {
      // Use setPaneOptions for axis configuration in v10
      try {
        $chart?.setPaneOptions({
          axis: {
            reverse: value as boolean
          }
        });
        
        // Also save to styles for persistence
        save.update(s => {
          _.set(s.styles, key, value)
          return s
        })
        
        otherSettingsTmp.set(key, value)
        return;
      } catch (error) {
        console.warn('setPaneOptions not available, falling back to styles:', error);
      }
    } else if (key === 'yAxis.type') {
      // yAxis.type is not supported in v10, skip this setting
      console.warn('yAxis.type is not supported in klinecharts v10');
      return;
    }
    
    // For other settings, skip if value hasn't changed
    if (oldVal == value) return
    
    otherSettingsTmp.set(key, value)
    
    // Update styles for all other settings
    save.update(s => {
      _.set(s.styles, key, value)
      return s
    })
    
    // IMPORTANT: Apply with merged theme styles to preserve all settings including chart type
    const themeStyles = getThemeStyles($save.theme);
    const mergedStyles = _.merge({}, themeStyles, $save.styles);
    $chart?.setStyles(processLineChartStyles(mergedStyles));
  }
  
  // Reset other settings from chart
  function resetOtherSettingsFromChart() {
    let chartObj = $chart;
    if(!chartObj) return;
    const styles = chartObj.getStyles() ?? {};
    
    // Load all values from styles
    otherSettingsOptions.forEach((it) => {
      const value = _.get(styles, it.key);
      // Use default values if not found in styles
      if (it.key === 'yAxis.reverse') {
        otherSettingsTmp.set(it.key, value || false);
      } else {
        otherSettingsTmp.set(it.key, value || it.default);
      }
    })
  }
  
  // Helper function to convert hex color to rgba with opacity
  function hexToRgba(hex: string, opacity: number): string {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  function showBackgroundPicker(event: MouseEvent) {
    if (backgroundColorType === 'solid') {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      backgroundColorPickerPosition = {
        x: rect.right + 10,
        y: rect.top
      };
      showBackgroundColorPicker = true;
      showGridColorPicker = false;
      showBackgroundGradientEditor = false;
    showGridGradientEditor = false;
     showXAxisTickTextColorPicker = false;
     showYAxisTickTextColorPicker = false;
     hideAllCandleColorPickers();
    } else if (backgroundColorType === 'gradient') {
      showBackgroundGradientEditor = true;
      showBackgroundColorPicker = false;
      showGridColorPicker = false;
      showGridGradientEditor = false;
      showXAxisTickTextColorPicker = false;
      showYAxisTickTextColorPicker = false;
    }
  }
  
  function showGridPicker(event: MouseEvent) {
    console.log('🔥 Grid picker clicked, type:', gridColorType);
    if (gridColorType === 'solid') {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      gridColorPickerPosition = {
        x: rect.right + 10,
        y: rect.top
      };
      console.log('🔥 Opening grid color picker at:', gridColorPickerPosition);
      showGridColorPicker = true;
      showBackgroundColorPicker = false;
      showBackgroundGradientEditor = false;
      showGridGradientEditor = false;
      showXAxisTickTextColorPicker = false;
      showYAxisTickTextColorPicker = false;
    } else if (gridColorType === 'gradient') {
      showGridGradientEditor = true;
      showGridColorPicker = false;
      showBackgroundColorPicker = false;
      showBackgroundGradientEditor = false;
      showXAxisTickTextColorPicker = false;
      showYAxisTickTextColorPicker = false;
    }
  }
  
  function showXAxisTickTextPicker(event: MouseEvent) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    xAxisTickTextColorPickerPosition = {
      x: rect.right + 10,
      y: rect.top
    };
    showXAxisTickTextColorPicker = true;
    showBackgroundColorPicker = false;
    showGridColorPicker = false;
    showBackgroundGradientEditor = false;
    showGridGradientEditor = false;
    showYAxisTickTextColorPicker = false;
    hideAllCandleColorPickers();
  }
  
  function showYAxisTickTextPicker(event: MouseEvent) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    yAxisTickTextColorPickerPosition = {
      x: rect.right + 10,
      y: rect.top
    };
    showYAxisTickTextColorPicker = true;
    showBackgroundColorPicker = false;
    showGridColorPicker = false;
    showBackgroundGradientEditor = false;
    showGridGradientEditor = false;
    showXAxisTickTextColorPicker = false;
    hideAllCandleColorPickers();
  }
  
  // Candle color picker functions
  function hideAllCandleColorPickers() {
    showCandleBodyBullColorPicker = false;
    showCandleBodyBearColorPicker = false;
    showCandleBorderBullColorPicker = false;
    showCandleBorderBearColorPicker = false;
    showCandleWickBullColorPicker = false;
    showCandleWickBearColorPicker = false;
  }
  
  function showCandleBodyBullPicker(event: MouseEvent) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    candleBodyBullColorPickerPosition = {
      x: rect.right + 10,
      y: rect.top
    };
    // Hide all other color pickers
    showBackgroundColorPicker = false;
    showGridColorPicker = false;
    showXAxisTickTextColorPicker = false;
    showYAxisTickTextColorPicker = false;
    showBackgroundGradientEditor = false;
    showGridGradientEditor = false;
    hideAllCandleColorPickers();
    showCandleBodyBullColorPicker = true;
  }
  
  function showCandleBodyBearPicker(event: MouseEvent) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    candleBodyBearColorPickerPosition = {
      x: rect.right + 10,
      y: rect.top
    };
    // Hide all other color pickers
    showBackgroundColorPicker = false;
    showGridColorPicker = false;
    showXAxisTickTextColorPicker = false;
    showYAxisTickTextColorPicker = false;
    showBackgroundGradientEditor = false;
    showGridGradientEditor = false;
    hideAllCandleColorPickers();
    showCandleBodyBearColorPicker = true;
  }
  
  function showCandleBorderBullPicker(event: MouseEvent) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    candleBorderBullColorPickerPosition = {
      x: rect.right + 10,
      y: rect.top
    };
    // Hide all other color pickers
    showBackgroundColorPicker = false;
    showGridColorPicker = false;
    showXAxisTickTextColorPicker = false;
    showYAxisTickTextColorPicker = false;
    showBackgroundGradientEditor = false;
    showGridGradientEditor = false;
    hideAllCandleColorPickers();
    showCandleBorderBullColorPicker = true;
  }
  
  function showCandleBorderBearPicker(event: MouseEvent) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    candleBorderBearColorPickerPosition = {
      x: rect.right + 10,
      y: rect.top
    };
    // Hide all other color pickers
    showBackgroundColorPicker = false;
    showGridColorPicker = false;
    showXAxisTickTextColorPicker = false;
    showYAxisTickTextColorPicker = false;
    showBackgroundGradientEditor = false;
    showGridGradientEditor = false;
    hideAllCandleColorPickers();
    showCandleBorderBearColorPicker = true;
  }
  
  function showCandleWickBullPicker(event: MouseEvent) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    candleWickBullColorPickerPosition = {
      x: rect.right + 10,
      y: rect.top
    };
    // Hide all other color pickers
    showBackgroundColorPicker = false;
    showGridColorPicker = false;
    showXAxisTickTextColorPicker = false;
    showYAxisTickTextColorPicker = false;
    showBackgroundGradientEditor = false;
    showGridGradientEditor = false;
    hideAllCandleColorPickers();
    showCandleWickBullColorPicker = true;
  }
  
  function showCandleWickBearPicker(event: MouseEvent) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    candleWickBearColorPickerPosition = {
      x: rect.right + 10,
      y: rect.top
    };
    // Hide all other color pickers
    showBackgroundColorPicker = false;
    showGridColorPicker = false;
    showXAxisTickTextColorPicker = false;
    showYAxisTickTextColorPicker = false;
    showBackgroundGradientEditor = false;
    showGridGradientEditor = false;
    hideAllCandleColorPickers();
    showCandleWickBearColorPicker = true;
  }
  
  // Candle color change functions
  function updateCandleBodyBullColor(event: CustomEvent) {
    candleBodyBullColor = event.detail;
    updateCandleStyles();
  }
  
  function updateCandleBodyBearColor(event: CustomEvent) {
    candleBodyBearColor = event.detail;
    updateCandleStyles();
  }
  
  function updateCandleBorderBullColor(event: CustomEvent) {
    candleBorderBullColor = event.detail;
    updateCandleStyles();
  }
  
  function updateCandleBorderBearColor(event: CustomEvent) {
    candleBorderBearColor = event.detail;
    updateCandleStyles();
  }
  
  function updateCandleWickBullColor(event: CustomEvent) {
    candleWickBullColor = event.detail;
    updateCandleStyles();
  }
  
  function updateCandleWickBearColor(event: CustomEvent) {
    candleWickBearColor = event.detail;
    updateCandleStyles();
  }
  

  
  // Update candle styles with debouncing for better performance
  function updateCandleStyles() {
    // Clear any pending update
    if (candleStyleUpdateTimer) {
      clearTimeout(candleStyleUpdateTimer);
    }
    
    // Debounce the actual update to avoid excessive re-renders during scrolling
    candleStyleUpdateTimer = setTimeout(() => {
      if (!$chart) return;
      
      const currentStyles = $chart.getStyles() ?? {};
      const newStyles = _.cloneDeep(currentStyles);
      
      // IMPORTANT: Preserve original chart type from $save.styles
      // Don't use the converted type from chart.getStyles()
      if ($save.styles?.candle?.type) {
        _.set(newStyles, 'candle.type', $save.styles.candle.type);
      }
      
      // Update candle body colors
      if (candleBodyShow) {
        _.set(newStyles, 'candle.bar.upColor', candleBodyBullColor);
        _.set(newStyles, 'candle.bar.downColor', candleBodyBearColor);
      }
      
      // Update candle border colors
      if (candleBorderShow) {
        _.set(newStyles, 'candle.bar.upBorderColor', candleBorderBullColor);
        _.set(newStyles, 'candle.bar.downBorderColor', candleBorderBearColor);
      }
      
      // Update candle wick colors
      if (candleWickShow) {
        _.set(newStyles, 'candle.bar.upWickColor', candleWickBullColor);
        _.set(newStyles, 'candle.bar.downWickColor', candleWickBearColor);
      }
      
      const processedStyles = processLineChartStyles(newStyles as unknown as Record<string, unknown>);
      $chart.setStyles(processedStyles);
      
      candleStyleUpdateTimer = null;
    }, 16); // ~60fps, ensures smooth updates without excessive re-renders
  }
  
  // Toggle candle component visibility
  function toggleCandleBodyShow() {
    candleBodyShow = !candleBodyShow;
    updateCandleStyles();
  }
  
  function toggleCandleBorderShow() {
    candleBorderShow = !candleBorderShow;
    updateCandleStyles();
  }
  
  function toggleCandleWickShow() {
    candleWickShow = !candleWickShow;
    updateCandleStyles();
  }
  
  function click(from: string) {
    if (from === 'confirm') {
      console.log('🔧 CONFIRM CLICKED - Using theme manager');
      
      // Update theme manager with final settings (without applying preview)
      themeManager.updatePending((pending) => {
        // Handle background settings
        if (backgroundColorType === 'solid') {
          const bgColor = tempSettings.get('backgroundColor') || backgroundColor;
          const bgOpacity = tempSettings.get('backgroundOpacity') ?? backgroundOpacity;
          pending.canvas.background.mode = 'solid';
          pending.canvas.background.solid = { 
            color: bgColor,
            alpha: bgOpacity / 100
          };
          delete pending.canvas.background.gradient;
        } else if (backgroundColorType === 'gradient') {
          const bgGradient = tempSettings.get('backgroundGradient') || backgroundGradient;
          pending.canvas.background.mode = 'gradient';
          pending.canvas.background.gradient = bgGradient;
          delete pending.canvas.background.solid;
        }
        
        // Handle grid settings
        if (gridColorType === 'solid') {
          const gColor = tempSettings.get('gridColor') || gridColor;
          const gOpacity = tempSettings.get('gridOpacity') ?? gridOpacity;
          pending.canvas.grid.mode = 'solid';
          pending.canvas.grid.solid = { 
            color: gColor,
            alpha: gOpacity / 100
          };
          delete pending.canvas.grid.gradient;
        } else if (gridColorType === 'gradient') {
          const gGradient = tempSettings.get('gridGradient') || gridGradient;
          pending.canvas.grid.mode = 'gradient';
          pending.canvas.grid.gradient = gGradient;
          delete pending.canvas.grid.solid;
        }
      });
      
      // Update $save.styles FIRST before confirming
      // This ensures colors are immediately available for other operations
      save.update(s => {
        if (!s.styles) s.styles = {};
        if (!s.styles.candle) s.styles.candle = {} as any;
        if (!(s.styles as any).candle.bar) (s.styles as any).candle.bar = {};
        
        console.log('🎨 Saving settings - Background Type:', backgroundColorType);
        console.log('🎨 Saving settings - Grid Type:', gridColorType);
        
        // CRITICAL: Preserve chart type before any updates
        // Read from saved styles, not from chart.getStyles()
        const preservedChartType = s.styles?.candle?.type;
        if (preservedChartType) {
          console.log('🔒 Preserving chart type:', preservedChartType);
        }
        
        // Update background settings
        if (backgroundColorType === 'solid') {
          const bgColor = tempSettings.get('backgroundColor') || backgroundColor;
          const bgOpacity = tempSettings.get('backgroundOpacity') ?? backgroundOpacity;
          console.log('🎨 Solid BG:', { bgColor, bgOpacity });
          
          if (bgColor) {
            s.styles.backgroundColor = bgColor;
            s.styles.backgroundOpacity = bgOpacity;
            s.styles.backgroundType = 'solid';
            delete s.styles.backgroundGradient;
          }
        } else if (backgroundColorType === 'gradient') {
          const bgGradient = tempSettings.get('backgroundGradient') || backgroundGradient;
          console.log('🎨 Gradient BG:', bgGradient);
          
          // Check for 'stops' instead of 'colors'
          if (bgGradient && bgGradient.stops && bgGradient.stops.length > 0) {
            s.styles.backgroundGradient = bgGradient;
            s.styles.backgroundType = 'gradient';
            delete s.styles.backgroundColor;
            delete s.styles.backgroundOpacity;
            console.log('✅ Gradient background saved to $save.styles');
          } else {
            console.warn('⚠️ Invalid gradient data:', bgGradient);
          }
        }
        
        // Update grid settings
        if (gridColorType === 'solid') {
          const savedGridColor = tempSettings.get('gridColor') || gridColor;
          const savedGridOpacity = tempSettings.get('gridOpacity') ?? 100;
          console.log('🎨 Solid Grid:', { gridColor: savedGridColor, gridOpacity: savedGridOpacity });
          
          if (savedGridColor) {
            if (!s.styles.grid) s.styles.grid = {};
            if (!s.styles.grid.horizontal) s.styles.grid.horizontal = {};
            if (!s.styles.grid.vertical) s.styles.grid.vertical = {};
            
            s.styles.grid.horizontal.color = savedGridColor;
            s.styles.grid.vertical.color = savedGridColor;
            s.styles.gridOpacity = savedGridOpacity;
            s.styles.gridType = 'solid';
            delete s.styles.gridGradient;
          }
        } else if (gridColorType === 'gradient') {
          const savedGridGradient = tempSettings.get('gridGradient') || gridGradient;
          console.log('🎨 Gradient Grid:', savedGridGradient);
          
          // Check for 'stops' instead of 'colors'
          if (savedGridGradient && savedGridGradient.stops && savedGridGradient.stops.length > 0) {
            s.styles.gridGradient = savedGridGradient;
            s.styles.gridType = 'gradient';
            delete s.styles.grid?.horizontal?.color;
            delete s.styles.grid?.vertical?.color;
            delete s.styles.gridOpacity;
            console.log('✅ Gradient grid saved to $save.styles');
          } else {
            console.warn('⚠️ Invalid grid gradient data:', savedGridGradient);
          }
        }
        
        // Persist axis tick text colors and opacity to saved styles
        try {
          const xHex = tempSettings.get('xAxisTickTextColor') || getDefaultColors().xAxisTickTextColor;
          const xOp = tempSettings.get('xAxisTickTextOpacity') ?? 100;
          const xRgba = hexToRgba(xHex, (xOp as number) / 100);
          _.set(s.styles, 'xAxis.tickText.color', xRgba);
          _.set(s.styles, 'xAxis.tickText.opacity', xOp);
          
          const yHex = tempSettings.get('yAxisTickTextColor') || getDefaultColors().yAxisTickTextColor;
          const yOp = tempSettings.get('yAxisTickTextOpacity') ?? 100;
          const yRgba = hexToRgba(yHex, (yOp as number) / 100);
          _.set(s.styles, 'yAxis.tickText.color', yRgba);
          _.set(s.styles, 'yAxis.tickText.opacity', yOp);
        } catch (e) {
          console.warn('Failed to persist axis tick text colors:', e);
        }
        
        // Persist candle colors into saved styles
        try {
          const bar = (s.styles as any).candle.bar as Record<string, any>;
          // Body
          if (candleBodyShow) {
            bar.upColor = candleBodyBullColor;
            bar.downColor = candleBodyBearColor;
          }
          // Border
          if (candleBorderShow) {
            bar.upBorderColor = candleBorderBullColor;
            bar.downBorderColor = candleBorderBearColor;
          }
          // Wick
          if (candleWickShow) {
            bar.upWickColor = candleWickBullColor;
            bar.downWickColor = candleWickBearColor;
          }
        } catch (e) {
          console.warn('Failed to persist candle colors to $save.styles:', e);
        }
        
        // CRITICAL: Restore preserved chart type
        if (preservedChartType && s.styles.candle) {
          s.styles.candle.type = preservedChartType;
          console.log('✅ Restored chart type:', preservedChartType);
        }
        
        return s;
      });
      
      // Confirm the theme manager changes
      themeManager.confirm();
      
      // Mark as confirmed so cancel won't be called
      wasConfirmed = true;
      
      // Force next canvas color application to use saved styles (do not preserve previous DOM preview)
      try {
        (window as any).__forceApplySavedCanvasColors = true;
      } catch (_) {}
      // Apply immediately so gradient remains after closing
      if ($ctx.applyCanvasColors) {
        $ctx.applyCanvasColors();
      }

      show = false;
    } else if (from === 'reset') {
      console.log('🔄 RESET CLICKED - Using theme manager');
      
      // Reset to current settings (not global defaults)
      themeManager.reset();
      
      // Reset UI state to match the reset
      const defaults = getDefaultColors();
      backgroundColorType = 'solid';
      backgroundOpacity = defaults.backgroundOpacity;
      gridColorType = 'solid';
      gridOpacity = defaults.gridOpacity;
      xAxisTickTextOpacity = 100;
      yAxisTickTextOpacity = 100;
      
      // Reset candle settings to default values
      candleBodyShow = true;
      candleBorderShow = true;
      candleWickShow = true;
      candleBodyBullColor = '#26a69a';
      candleBodyBearColor = '#ef5350';
      candleBorderBullColor = '#26a69a';
      candleBorderBearColor = '#ef5350';
      candleWickBullColor = '#26a69a';
      candleWickBearColor = '#ef5350';
      // Persist canvas/grid/candle defaults into $save.styles and apply to chart immediately
      try {
        const defaults = getDefaultColors();
        // 1) Update saved styles
        save.update(s => {
          if (!s.styles) s.styles = {};
          // Canvas defaults
          s.styles.backgroundType = 'solid';
          s.styles.backgroundColor = defaults.backgroundColor;
          s.styles.backgroundOpacity = defaults.backgroundOpacity;
          delete s.styles.backgroundGradient;
          
          // Grid defaults
          if (!s.styles.grid) s.styles.grid = {};
          if (!s.styles.grid.horizontal) s.styles.grid.horizontal = {};
          if (!s.styles.grid.vertical) s.styles.grid.vertical = {};
          s.styles.gridType = 'solid';
          s.styles.gridOpacity = defaults.gridOpacity;
          s.styles.grid.horizontal.color = defaults.gridColor;
          s.styles.grid.vertical.color = defaults.gridColor;
          delete (s.styles as any).gridGradient;
          
          // Candle defaults
          if (!s.styles.candle) (s.styles as any).candle = {};
          if (!(s.styles as any).candle.bar) (s.styles as any).candle.bar = {};
          const bar = (s.styles as any).candle.bar as Record<string, any>;
          bar.upColor = candleBodyBullColor;
          bar.downColor = candleBodyBearColor;
          bar.upBorderColor = candleBorderBullColor;
          bar.downBorderColor = candleBorderBearColor;
          bar.upWickColor = candleWickBullColor;
          bar.downWickColor = candleWickBearColor;
          return s;
        });
        
        // 2) Apply to chart (preserve chart type)
        if ($chart) {
          // Merge theme + saved styles so chart fully reflects reset values
          const themeStyles = getThemeStyles($save.theme);
          const mergedStyles = _.merge({}, themeStyles, $save.styles);
          
          // Preserve chart type from saved styles
          if ($save.styles?.candle?.type) {
            _.set(mergedStyles, 'candle.type', $save.styles.candle.type);
          }
          
          const processed = processLineChartStyles(mergedStyles as unknown as Record<string, unknown>);
          $chart.setStyles(processed);
          
          // Also clear any inline background overrides applied during live preview
          try {
            const chartContainer = document.querySelector('.kline-main');
            const chartWidget = document.querySelector('.kline-widget');
            [chartContainer, chartWidget].forEach(container => {
              if (container) {
                const el = container as HTMLElement;
                el.style.removeProperty('background');
                el.style.removeProperty('background-color');
                el.style.removeProperty('background-image');
                el.style.removeProperty('--chart-background-color');
              }
            });
          } catch {}
          
          // Force next canvas color application to use saved styles
          try {
            (window as any).__forceApplySavedCanvasColors = true;
          } catch {}
          if ($ctx.applyCanvasColors) {
            $ctx.applyCanvasColors();
          }
        }
      } catch (e) {
        console.warn('Failed to apply default candle colors on reset:', e);
      }
      
      
      // Reset other settings to default values
      resetOtherSettingsFromChart();
      
      // Clear and reset tempSettings
      tempSettings.clear();
      tempSettings.set('backgroundColor', defaults.backgroundColor);
      tempSettings.set('backgroundOpacity', defaults.backgroundOpacity);
      tempSettings.set('gridColor', defaults.gridColor);
      tempSettings.set('gridOpacity', defaults.gridOpacity);
      tempSettings.set('xAxisTickTextColor', defaults.xAxisTickTextColor);
      tempSettings.set('xAxisTickTextOpacity', 100);
      tempSettings.set('yAxisTickTextColor', defaults.yAxisTickTextColor);
      tempSettings.set('yAxisTickTextOpacity', 100);
    } else {
      console.log('🚫 CANCEL CLICKED - Using theme manager');
      
      // Cancel all pending changes
      themeManager.cancel();
      
      show = false;
    }
    
    // Close all pickers and editors
    showBackgroundColorPicker = false;
    showGridColorPicker = false;
    showXAxisTickTextColorPicker = false;
    showYAxisTickTextColorPicker = false;
    showBackgroundGradientEditor = false;
    showGridGradientEditor = false;
    hideAllCandleColorPickers();
  }
</script>

<Modal title="Chart Setting" width="min(90vw, 700px)" bind:show={show} theme={$save.theme} click={click} buttons={['confirm', 'reset']}>
  <div class="flex flex-col lg:flex-row min-h-[400px] max-h-[70vh] overflow-hidden">
    <!-- Left Column - Tab Menu -->
    <div class="w-full lg:w-48 border-b lg:border-b-0 lg:border-r border-base-300 pb-4 lg:pb-0 lg:pr-4 mb-4 lg:mb-0">
      <div class="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 overflow-x-auto lg:overflow-x-visible">
        <button 
          class="flex-shrink-0 lg:w-full text-left px-4 py-2 rounded-lg transition-colors duration-200"
          class:bg-primary={activeTab === 'canvas'}
          class:text-primary-content={activeTab === 'canvas'}
          class:hover:bg-base-200={activeTab !== 'canvas'}
          onclick={() => activeTab = 'canvas'}
        >
          Canvas
        </button>
        <button 
          class="flex-shrink-0 lg:w-full text-left px-4 py-2 rounded-lg transition-colors duration-200"
          class:bg-primary={activeTab === 'other'}
          class:text-primary-content={activeTab === 'other'}
          class:hover:bg-base-200={activeTab !== 'other'}
          onclick={() => activeTab = 'other'}
        >
          Other Settings
        </button>
        <button 
          class="flex-shrink-0 lg:w-full text-left px-4 py-2 rounded-lg transition-colors duration-200"
          class:bg-primary={activeTab === 'candle'}
          class:text-primary-content={activeTab === 'candle'}
          class:hover:bg-base-200={activeTab !== 'candle'}
          onclick={() => activeTab = 'candle'}
        >
          Candle
        </button>
      </div>
    </div>
    
    <!-- Right Column - Settings Content -->
    <div class="flex-1 lg:pl-6 overflow-y-auto">
      {#if activeTab === 'canvas'}
        <div class="space-y-6 pb-6">
          <h4 class="text-lg font-semibold mb-4">Canvas Settings</h4>
          
          <!-- Background Color Setting -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-base-content/80">Background color</label>
            <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <select 
                class="select select-bordered select-sm w-full sm:w-32"
                bind:value={backgroundColorType}
              >
                <option value="solid">Solid</option>
                <option value="gradient">Gradient</option>
              </select>
              
              <button 
                class="w-8 h-8 rounded border-2 border-base-300 cursor-pointer hover:border-primary transition-colors flex-shrink-0"
                style="background: {backgroundColorType === 'gradient' ? (tempSettings.get('backgroundGradient')?.css || generateGradientCSS(backgroundGradient) || 'linear-gradient(0deg, #ffffff 0%, #000000 100%)') : (tempSettings.get('backgroundColor') || getDefaultColors().backgroundColor)}"
                onclick={showBackgroundPicker}
              ></button>
            </div>
          </div>
          
          <!-- Grid Color Setting -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-base-content/80">Grid color</label>
            <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <select 
                class="select select-bordered select-sm w-full sm:w-32"
                bind:value={gridColorType}
              >
                <option value="solid">Solid</option>
                <option value="gradient">Gradient</option>
              </select>
              
              <button 
                class="w-8 h-8 rounded border-2 border-base-300 cursor-pointer hover:border-primary transition-colors flex-shrink-0"
                style="background: {gridColorType === 'gradient' ? (tempSettings.get('gridGradient')?.css || generateGradientCSS(gridGradient) || 'linear-gradient(0deg, #f3f3f3 0%, #1c1c1c 100%)') : (tempSettings.get('gridColor') || gridColor || getDefaultColors().gridColor)}"
                onclick={showGridPicker}
              ></button>
            </div>
          </div>
          
          <!-- X-Axis Tick Text Color Setting -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-base-content/80">X-Axis tick text color</label>
            <div class="flex items-center space-x-3">
              <button 
                class="w-8 h-8 rounded border-2 border-base-300 cursor-pointer hover:border-primary transition-colors flex-shrink-0"
                style="background: {tempSettings.get('xAxisTickTextColor') || getDefaultColors().xAxisTickTextColor}"
                onclick={showXAxisTickTextPicker}
              ></button>
            </div>
          </div>
          
          <!-- Y-Axis Tick Text Color Setting -->
          <div class="space-y-3">
            <label class="text-sm font-medium text-base-content/80">Y-Axis tick text color</label>
            <div class="flex items-center space-x-3">
              <button 
                class="w-8 h-8 rounded border-2 border-base-300 cursor-pointer hover:border-primary transition-colors flex-shrink-0"
                style="background: {tempSettings.get('yAxisTickTextColor') || getDefaultColors().yAxisTickTextColor}"
                onclick={showYAxisTickTextPicker}
              ></button>
            </div>
          </div>
        </div>
      {:else if activeTab === 'other'}
        <div class="space-y-6 pb-6">
          <h4 class="text-lg font-semibold mb-4">Other Settings</h4>
          
          <div class="grid grid-cols-1 gap-4">
            {#each otherSettingsOptions as option}
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 space-y-2 sm:space-y-0">
                <label class="text-sm font-medium text-base-content/80 flex-1">{option.label}</label>
                
                {#if option.type === 'select'}
                   <select 
                     class="select select-bordered select-sm w-full sm:w-32 flex-shrink-0"
                     value={otherSettingsTmp.get(option.key) || option.default}
                     onchange={(e) => updateOtherSetting(option.key, (e.target as HTMLSelectElement).value)}
                   >
                     {#each option.options || [] as opt}
                       <option value={(opt as {value: string, label: string}).value}>{(opt as {value: string, label: string}).label}</option>
                     {/each}
                   </select>
                 {:else if option.type === 'switch'}
                   <input 
                     type="checkbox" 
                     class="toggle toggle-sm flex-shrink-0"
                     checked={otherSettingsTmp.get(option.key) || option.default}
                     onchange={(e) => updateOtherSetting(option.key, (e.target as HTMLInputElement).checked)}
                   />
                 {/if}
              </div>
            {/each}
          </div>
        </div>
      {:else if activeTab === 'candle'}
        <div class="space-y-6 pb-6">
          <h4 class="text-lg font-semibold mb-4">Candle Color Customization</h4>
          
          <!-- Body Section -->
          <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-base-300">
              <div class="flex items-center space-x-3 mb-3 sm:mb-0">
                <input 
                  type="checkbox" 
                  class="checkbox checkbox-sm"
                  bind:checked={candleBodyShow}
                  onchange={toggleCandleBodyShow}
                />
                <label class="text-sm font-medium text-base-content">Body</label>
              </div>
              
              <div class="flex space-x-3">
                <div class="flex flex-col items-center space-y-1">
                  <span class="text-xs text-base-content/60">Bull</span>
                  <button 
                    class="w-8 h-8 rounded border-2 border-base-300 flex-shrink-0"
                    style="background-color: {candleBodyBullColor}"
                    onclick={showCandleBodyBullPicker}
                    disabled={!candleBodyShow}
                    class:opacity-50={!candleBodyShow}
                  ></button>
                </div>
                <div class="flex flex-col items-center space-y-1">
                  <span class="text-xs text-base-content/60">Bear</span>
                  <button 
                    class="w-8 h-8 rounded border-2 border-base-300 flex-shrink-0"
                    style="background-color: {candleBodyBearColor}"
                    onclick={showCandleBodyBearPicker}
                    disabled={!candleBodyShow}
                    class:opacity-50={!candleBodyShow}
                  ></button>
                </div>
              </div>
            </div>
            
            <!-- Borders Section -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-base-300">
              <div class="flex items-center space-x-3 mb-3 sm:mb-0">
                <input 
                  type="checkbox" 
                  class="checkbox checkbox-sm"
                  bind:checked={candleBorderShow}
                  onchange={toggleCandleBorderShow}
                />
                <label class="text-sm font-medium text-base-content">Borders</label>
              </div>
              
              <div class="flex space-x-3">
                <div class="flex flex-col items-center space-y-1">
                  <span class="text-xs text-base-content/60">Bull</span>
                  <button 
                    class="w-8 h-8 rounded border-2 border-base-300 flex-shrink-0"
                    style="background-color: {candleBorderBullColor}"
                    onclick={showCandleBorderBullPicker}
                    disabled={!candleBorderShow}
                    class:opacity-50={!candleBorderShow}
                  ></button>
                </div>
                <div class="flex flex-col items-center space-y-1">
                  <span class="text-xs text-base-content/60">Bear</span>
                  <button 
                    class="w-8 h-8 rounded border-2 border-base-300 flex-shrink-0"
                    style="background-color: {candleBorderBearColor}"
                    onclick={showCandleBorderBearPicker}
                    disabled={!candleBorderShow}
                    class:opacity-50={!candleBorderShow}
                  ></button>
                </div>
              </div>
            </div>
            
            <!-- Wick Section -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3">
              <div class="flex items-center space-x-3 mb-3 sm:mb-0">
                <input 
                  type="checkbox" 
                  class="checkbox checkbox-sm"
                  bind:checked={candleWickShow}
                  onchange={toggleCandleWickShow}
                />
                <label class="text-sm font-medium text-base-content">Wick</label>
              </div>
              
              <div class="flex space-x-3">
                <div class="flex flex-col items-center space-y-1">
                  <span class="text-xs text-base-content/60">Bull</span>
                  <button 
                    class="w-8 h-8 rounded border-2 border-base-300 flex-shrink-0"
                    style="background-color: {candleWickBullColor}"
                    onclick={showCandleWickBullPicker}
                    disabled={!candleWickShow}
                    class:opacity-50={!candleWickShow}
                  ></button>
                </div>
                <div class="flex flex-col items-center space-y-1">
                  <span class="text-xs text-base-content/60">Bear</span>
                  <button 
                    class="w-8 h-8 rounded border-2 border-base-300 flex-shrink-0"
                    style="background-color: {candleWickBearColor}"
                    onclick={showCandleWickBearPicker}
                    disabled={!candleWickShow}
                    class:opacity-50={!candleWickShow}
                  ></button>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/if}
    </div>
  </div>
</Modal>

<!-- Background Color Picker -->
{#if showBackgroundColorPicker}
  <ColorPicker 
    bind:show={showBackgroundColorPicker}
    selectedColor={tempSettings.get('backgroundColor') || getDefaultColors().backgroundColor}
    opacity={backgroundOpacity}
    on:colorChange={handleBackgroundColorChange}
    on:opacityChange={handleBackgroundOpacityChange}
  />
{/if}

<!-- Grid Color Picker -->
{#if showGridColorPicker}
  <ColorPicker 
    bind:show={showGridColorPicker}
    selectedColor={tempSettings.get('gridColor') || gridColor || getDefaultColors().gridColor}
    opacity={gridOpacity}
    on:colorChange={handleGridColorChange}
    on:opacityChange={handleGridOpacityChange}
  />
{/if}

<!-- X-Axis Tick Text Color Picker -->
{#if showXAxisTickTextColorPicker}
  <ColorPicker 
    bind:show={showXAxisTickTextColorPicker}
    selectedColor={tempSettings.get('xAxisTickTextColor') || getDefaultColors().xAxisTickTextColor}
    opacity={xAxisTickTextOpacity}

    on:colorChange={handleXAxisTickTextColorChange}
    on:opacityChange={handleXAxisTickTextOpacityChange}
  />
{/if}

<!-- Y-Axis Tick Text Color Picker -->
{#if showYAxisTickTextColorPicker}
  <ColorPicker 
    bind:show={showYAxisTickTextColorPicker}
    selectedColor={tempSettings.get('yAxisTickTextColor') || getDefaultColors().yAxisTickTextColor}
    opacity={yAxisTickTextOpacity}

    on:colorChange={handleYAxisTickTextColorChange}
    on:opacityChange={handleYAxisTickTextOpacityChange}
  />
{/if}

<!-- Candle Body Bull Color Picker -->
{#if showCandleBodyBullColorPicker}
  <ColorPicker 
    bind:show={showCandleBodyBullColorPicker}
    selectedColor={candleBodyBullColor}

    on:colorChange={updateCandleBodyBullColor}
  />
{/if}

<!-- Candle Body Bear Color Picker -->
{#if showCandleBodyBearColorPicker}
  <ColorPicker 
    bind:show={showCandleBodyBearColorPicker}
    selectedColor={candleBodyBearColor}

    on:colorChange={updateCandleBodyBearColor}
  />
{/if}

<!-- Candle Border Bull Color Picker -->
{#if showCandleBorderBullColorPicker}
  <ColorPicker 
    bind:show={showCandleBorderBullColorPicker}
    selectedColor={candleBorderBullColor}

    on:colorChange={updateCandleBorderBullColor}
  />
{/if}

<!-- Candle Border Bear Color Picker -->
{#if showCandleBorderBearColorPicker}
  <ColorPicker 
    bind:show={showCandleBorderBearColorPicker}
    selectedColor={candleBorderBearColor}

    on:colorChange={updateCandleBorderBearColor}
  />
{/if}

<!-- Candle Wick Bull Color Picker -->
{#if showCandleWickBullColorPicker}
  <ColorPicker 
    bind:show={showCandleWickBullColorPicker}
    selectedColor={candleWickBullColor}

    on:colorChange={updateCandleWickBullColor}
  />
{/if}

<!-- Candle Wick Bear Color Picker -->
{#if showCandleWickBearColorPicker}
  <ColorPicker 
    bind:show={showCandleWickBearColorPicker}
    selectedColor={candleWickBearColor}

    on:colorChange={updateCandleWickBearColor}
  />
{/if}





<!-- Background Gradient Editor -->
{#if showBackgroundGradientEditor}
  <GradientEditor 
    bind:show={showBackgroundGradientEditor}
    initialGradient={backgroundGradient}
    on:gradientChange={handleBackgroundGradientChange}
  />
{/if}

<!-- Grid Gradient Editor -->
{#if showGridGradientEditor}
  <GradientEditor 
    bind:show={showGridGradientEditor}
    initialGradient={gridGradient}
    on:gradientChange={handleGridGradientChange}
  />
{/if}