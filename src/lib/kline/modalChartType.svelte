<script lang="ts">
  import Modal from "./modal.svelte"
  import { getContext } from "svelte";
  import { fly } from 'svelte/transition';
  import * as m from '$lib/paraglide/messages.js'
  import type { Chart, Nullable } from 'klinecharts';
  import { ChartCtx, ChartSave } from "./chart";
  import type { Writable } from "svelte/store";
  import _ from "lodash";
  import { getThemeStyles, processLineChartStyles } from "./coms";
  import Icon from './icon.svelte';

  let { show = $bindable() } = $props();
  
  const ctx = getContext('ctx') as Writable<ChartCtx>;
  const save = getContext('save') as Writable<ChartSave>;
  const chart = getContext('chart') as Writable<Nullable<Chart>>;
  
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
    { id: 'line_chart', name: 'Line', icon: 'line' } // Changed from 'line' to 'line_chart'
  ];
  
  // AI indicators that are incompatible with Renko chart
  const AI_INDICATORS = ['SMART_MONEY', 'TRAP_HUNTER', 'VOLCANIC', 'VOLCANIC_SIG'];
  
  // Check if any AI indicators are present in the chart
  function hasAIIndicators() {
    if (!$save || !$save.saveInds) return false;
    
    return Object.values($save.saveInds).some((indicator: any) => {
      return indicator && AI_INDICATORS.includes(indicator.name);
    });
  }
  
  // Warning message state
  let showWarning = $state(false);
  let warningMessage = $state('');
  
  // Auto-hide warning after 5 seconds
  $effect(() => {
    if (showWarning) {
      const timer = setTimeout(() => {
        showWarning = false;
      }, 5000);
      return () => clearTimeout(timer);
    }
  });

  function handleChartTypeClick(param: unknown, event?: MouseEvent) {
    const chartType = param as { id: string; name: string; icon: string };
    
    // Check if trying to select Renko when AI indicators are present
    if (chartType.id === 'renko_atr' && hasAIIndicators()) {
      warningMessage = `You cannot use Duty AI Renko chart with AI Indicator`;
      showWarning = true;
      console.log('⚠️ Cannot add Renko chart: AI indicators present');
      return;
    }
    console.log('📊 CHART TYPE CLICK:', chartType.id);
    
    // Add selection animation
    if (event) {
      const item = event.currentTarget as HTMLElement;
      item.classList.add('selecting');
      
      // Remove the class after animation completes
      setTimeout(() => {
        item.classList.remove('selecting');
      }, 800);
    }
    
    // Update chart type in styles
    if (!$save.styles.candle) {
      $save.styles.candle = {};
    }
    
    // Special handling for line_chart type
    if (chartType.id === 'line_chart') {
      console.log('🎯 Setting up LINE CHART (using area with transparent background)');
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
      
      // Mark this as a line chart in a custom property for tracking
      $save.styles.candle._isLineChart = true;
      console.log('✅ Line chart configured with area type and transparent background');
    } else if (chartType.id === 'area') {
      console.log('🎯 Setting up AREA CHART with gradient fill');
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
      console.log('✅ Area chart configured with gradient background');
    } else if (chartType.id === 'renko_atr') {
      console.log('🎯 Setting up RENKO (ATR) chart');
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
      // Remove line/area specific config if any
      delete $save.styles.candle._isLineChart;
      delete $save.styles.candle.area;
    } else {
      $save.styles.candle.type = chartType.id;
      // Remove line chart marker if switching to other type
      delete $save.styles.candle._isLineChart;
      // Clear area config if not area or line_chart type
      delete $save.styles.candle.area;
    }
    
    console.log('✅ Saved chart type to $save.styles:', {
      type: $save.styles.candle.type,
      isLineChart: $save.styles.candle._isLineChart,
      area: $save.styles.candle.area
    });
    
    // Apply the new styles to the chart with proper processing
    const styles = getThemeStyles($save.theme);
    _.merge(styles, $save.styles);
    const processedStyles = processLineChartStyles(styles);
    $chart?.setStyles(processedStyles);
    console.log('✅ Styles applied to chart with processing');
    
    show = false;
  }

  function getCurrentChartType() {
    // Check if this is a line chart (marked with _isLineChart flag)
    if ($save.styles?.candle?._isLineChart) {
      return 'line_chart';
    }
    const currentType = $save.styles?.candle?.type || 'renko_atr';
    return currentType;
  }
</script>

<Modal bind:show title="Chart Type" width="550px" maxWidth="95vw" maxHeight="90vh" buttons={[]} theme={$save.theme} class="chart-type-modal-premium">
  <!-- Warning Message -->
  {#if showWarning}
    <div class="warning-banner" transition:fly="{{ y: -20, duration: 300 }}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 9v2m0 4h.01M10.29 3.86l-7.6 13.17A1 1 0 003.53 19h16.94a1 1 0 00.84-1.5L13.71 3.86a1 1 0 00-1.73 0z"></path>
      </svg>
      <span>{warningMessage}</span>
    </div>
  {/if}
  
  <div class="premium-grid">
    {#each chartTypes as chartType (chartType.id)}
      {@const isDisabled = chartType.id === 'renko_atr' && hasAIIndicators()}
      <button 
        class="chart-card"
        class:active={getCurrentChartType() === chartType.id}
        class:disabled={isDisabled}
        onclick={(e) => handleChartTypeClick(chartType, e)}
      >
        <!-- Animated background gradient -->
        <div class="card-bg"></div>
        
        <!-- Selection badge -->
        {#if getCurrentChartType() === chartType.id && !isDisabled}
          <div class="selection-badge">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M13.3 4.3L6 11.6 2.7 8.3l1.1-1.1L6 9.4l6.2-6.2 1.1 1.1z" 
                    fill="currentColor" stroke="currentColor" stroke-width="0.5"/>
            </svg>
          </div>
        {/if}
        
        <!-- Icon container with glow effect -->
        <div class="icon-container">
          <div class="icon-glow"></div>
          <Icon 
            name={chartType.icon} 
            size={26} 
            class="chart-icon"
          />
        </div>
        
        <!-- Label with modern typography -->
        <span class="chart-name">
          {chartType.name}
        </span>
        
        <!-- Shine effect on hover -->
        <div class="shine-effect"></div>
      </button>
    {/each}
  </div>
  
  <style>
    /* ===== PREMIUM GRID LAYOUT ===== */
    .premium-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      padding: 8px;
    }
    
    @media (max-width: 640px) {
      .premium-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 6px;
      }
    }
    
    @media (max-width: 480px) {
      .premium-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        padding: 8px;
      }
    }
    
    /* ===== PREMIUM CHART CARD ===== */
    .chart-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 20px 12px 18px;
      background: linear-gradient(145deg, 
        rgba(30, 35, 48, 0.6) 0%, 
        rgba(20, 25, 35, 0.4) 100%);
      border: 1.5px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: 
        0 4px 20px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }
    
    @media (max-width: 640px) {
      .chart-card {
        padding: 16px 10px 14px;
        gap: 8px;
      }
    }
    
    @media (max-width: 480px) {
      .chart-card {
        padding: 22px 14px 20px;
        gap: 12px;
      }
    }
    
    /* Animated background */
    .card-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(145deg,
        rgba(45, 55, 75, 0.3) 0%,
        rgba(30, 40, 60, 0.2) 50%,
        rgba(20, 30, 50, 0.3) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 0;
    }
    
    /* Hover state */
    .chart-card:hover {
      transform: translateY(-3px);
      border-color: rgba(255, 255, 255, 0.12);
      background: linear-gradient(145deg, 
        rgba(35, 45, 60, 0.7) 0%, 
        rgba(25, 35, 50, 0.5) 100%);
      box-shadow: 
        0 12px 40px rgba(0, 0, 0, 0.4),
        0 6px 20px rgba(20, 30, 50, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    
    .chart-card:hover .card-bg {
      opacity: 1;
    }
    
    /* Active state */
    .chart-card.active {
      background: linear-gradient(145deg, 
        rgba(30, 50, 80, 0.5) 0%,
        rgba(20, 40, 70, 0.4) 50%,
        rgba(25, 45, 75, 0.5) 100%);
      border-color: rgba(70, 120, 180, 0.4);
      box-shadow: 
        0 8px 32px rgba(30, 60, 100, 0.3),
        0 4px 16px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 0 0 1px rgba(60, 100, 150, 0.2);
      transform: translateY(-2px);
    }
    
    .chart-card.active .card-bg {
      background: linear-gradient(145deg,
        rgba(40, 65, 95, 0.4) 0%,
        rgba(30, 55, 85, 0.3) 50%,
        rgba(35, 60, 90, 0.4) 100%);
      opacity: 1;
    }
    
    .chart-card.active:hover {
      transform: translateY(-2px);
      border-color: rgba(80, 130, 190, 0.5);
    }
    
    /* ===== SELECTION BADGE ===== */
    .selection-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, 
        rgba(70, 120, 180, 0.9) 0%, 
        rgba(50, 100, 160, 0.85) 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      z-index: 10;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 
        0 3px 10px rgba(30, 60, 100, 0.4),
        0 1px 3px rgba(0, 0, 0, 0.3);
      animation: badgePulse 2.5s ease-in-out infinite;
    }
    
    @keyframes badgePulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 
          0 3px 10px rgba(30, 60, 100, 0.4),
          0 1px 3px rgba(0, 0, 0, 0.3);
      }
      50% {
        transform: scale(1.05);
        box-shadow: 
          0 4px 14px rgba(40, 70, 110, 0.5),
          0 2px 5px rgba(0, 0, 0, 0.35);
      }
    }
    
    /* ===== ICON CONTAINER ===== */
    .icon-container {
      position: relative;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: linear-gradient(145deg, 
        rgba(40, 50, 65, 0.5) 0%, 
        rgba(25, 35, 50, 0.3) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 
        0 3px 12px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
      z-index: 1;
    }
    
    @media (max-width: 640px) {
      .icon-container {
        width: 42px;
        height: 42px;
        border-radius: 10px;
      }
    }
    
    @media (max-width: 480px) {
      .icon-container {
        width: 50px;
        height: 50px;
        border-radius: 12px;
      }

    }
    
    .icon-glow {
      position: absolute;
      inset: -3px;
      background: linear-gradient(145deg, 
        rgba(50, 90, 140, 0.3) 0%, 
        rgba(35, 70, 120, 0.25) 100%);
      border-radius: inherit;
      opacity: 0;
      filter: blur(10px);
      transition: opacity 0.3s ease;
      z-index: -1;
    }
    
    .chart-card:hover .icon-container {
      transform: scale(1.06);
      background: linear-gradient(145deg, 
        rgba(50, 65, 85, 0.6) 0%, 
        rgba(35, 50, 70, 0.4) 100%);
      box-shadow: 
        0 5px 18px rgba(0, 0, 0, 0.25),
        0 2px 10px rgba(30, 50, 80, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    
    .chart-card.active .icon-container {
      background: linear-gradient(145deg, 
        rgba(40, 70, 110, 0.5) 0%, 
        rgba(30, 60, 95, 0.4) 100%);
      border-color: rgba(70, 110, 160, 0.3);
      transform: scale(1.04);
      box-shadow: 
        0 6px 20px rgba(30, 60, 100, 0.3),
        0 3px 12px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
    }
    
    .chart-card.active .icon-glow {
      opacity: 0.5;
    }
    
    /* ===== CHART ICON ===== */
    :global(.chart-icon) {
      color: rgba(200, 210, 230, 0.85);
      filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.3));
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 2;
    }
    
    .chart-card:hover :global(.chart-icon) {
      color: rgba(220, 230, 245, 0.95);
      filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.35));
      transform: scale(1.05);
    }
    
    .chart-card.active :global(.chart-icon) {
      color: rgba(160, 200, 240, 1);
      filter: drop-shadow(0 4px 12px rgba(40, 80, 130, 0.5));
      transform: scale(1.03);
    }
    
    /* ===== CHART NAME ===== */
    .chart-name {
      color: rgba(180, 190, 210, 0.85);
      font-size: 12px;
      font-weight: 500;
      text-align: center;
      line-height: 1.3;
      letter-spacing: 0.4px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1;
    }
    
    @media (max-width: 640px) {
      .chart-name {
        font-size: 11px;
      }
    }
    
    @media (max-width: 480px) {
      .chart-name {
        font-size: 12.5px;
      }
    }
    
    .chart-card:hover .chart-name {
      color: rgba(210, 220, 235, 0.95);
      transform: translateY(-1px);
    }
    
    .chart-card.active .chart-name {
      color: rgba(180, 210, 240, 1);
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    
    /* ===== SHINE EFFECT ===== */
    .shine-effect {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        115deg,
        transparent 25%,
        rgba(255, 255, 255, 0.08) 45%,
        rgba(200, 220, 240, 0.12) 50%,
        rgba(255, 255, 255, 0.08) 55%,
        transparent 75%
      );
      transform: translateX(-100%) skewX(-15deg);
      transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .chart-card:hover .shine-effect {
      transform: translateX(100%) skewX(-15deg);
    }
    
    /* ===== LIGHT THEME ===== */
    :global([data-theme="light"]) .chart-card {
      background: linear-gradient(145deg, #ffffff 0%, #f9fbff 100%);
      border-color: rgba(59, 130, 246, 0.15);
      box-shadow: 
        0 2px 6px rgba(59, 130, 246, 0.08),
        0 1px 2px rgba(0, 0, 0, 0.04);
    }
    
    :global([data-theme="light"]) .card-bg {
      background: transparent;
      opacity: 0;
    }
    
    :global([data-theme="light"]) .chart-card:hover {
      background: #ffffff;
      border-color: rgba(59, 130, 246, 0.25);
      box-shadow: 
        0 6px 14px rgba(59, 130, 246, 0.10),
        0 3px 8px rgba(0, 0, 0, 0.05);
    }
    
    :global([data-theme="light"]) .chart-card.active {
      background: linear-gradient(145deg, #e8f4ff 0%, #f0f8ff 100%);
      border-color: rgba(100, 150, 220, 0.4);
      box-shadow: 
        0 3px 10px rgba(100, 150, 220, 0.15),
        0 1px 4px rgba(0, 0, 0, 0.05);
    }
    
    :global([data-theme="light"]) .chart-card.active .card-bg {
      opacity: 0;
    }
    
    :global([data-theme="light"]) .icon-container {
      background: #f3f6fb;
      border-color: rgba(59, 130, 246, 0.15);
      box-shadow: 
        0 1px 3px rgba(0, 0, 0, 0.04),
        inset 0 0.5px 0 rgba(255, 255, 255, 1);
    }
    
    :global([data-theme="light"]) .chart-card:hover .icon-container {
      background: #f0f2f5;
      box-shadow: 
        0 2px 6px rgba(0, 0, 0, 0.05),
        inset 0 0.5px 0 rgba(255, 255, 255, 1);
    }
    
    :global([data-theme="light"]) .chart-card.active .icon-container {
      background: linear-gradient(145deg, #dceeff 0%, #e6f3ff 100%);
      border-color: rgba(100, 150, 220, 0.2);
      box-shadow: 
        0 2px 8px rgba(100, 150, 220, 0.12),
        inset 0 0.5px 0 rgba(255, 255, 255, 1);
    }
    
    :global([data-theme="light"]) .icon-glow {
      opacity: 0;
    }
    
    :global([data-theme="light"]) :global(.chart-icon) {
      color: #3b82f6;
      filter: drop-shadow(0 0.5px 1px rgba(59, 130, 246, 0.15));
    }
    
    :global([data-theme="light"]) .chart-card:hover :global(.chart-icon) {
      color: #2563eb;
      filter: drop-shadow(0 1px 2px rgba(37, 99, 235, 0.2));
    }
    
    :global([data-theme="light"]) .chart-card.active :global(.chart-icon) {
      color: #1d4ed8;
      filter: drop-shadow(0 1px 3px rgba(29, 78, 216, 0.3));
    }
    
    :global([data-theme="light"]) .chart-name {
      color: #334155;
    }
    
    :global([data-theme="light"]) .chart-card:hover .chart-name {
      color: #1f2937;
    }
    
    :global([data-theme="light"]) .chart-card.active .chart-name {
      color: #2563eb;
      font-weight: 600;
    }
    
    :global([data-theme="light"]) .selection-badge {
      background: linear-gradient(135deg, #5ba3f5 0%, #4a90e2 100%);
      border-color: rgba(255, 255, 255, 0.8);
      box-shadow: 
        0 2px 8px rgba(74, 144, 226, 0.3),
        0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    /* ===== WARNING BANNER ===== */
    .warning-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      margin-bottom: 16px;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.1) 100%);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 12px;
      color: rgba(251, 191, 36, 0.95);
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
    }
    
    .warning-banner svg {
      flex-shrink: 0;
      color: rgba(251, 191, 36, 1);
      filter: drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3));
    }
    
    :global([data-theme="light"]) .warning-banner {
      background: linear-gradient(135deg, rgba(254, 243, 199, 0.9) 0%, rgba(254, 226, 226, 0.8) 100%);
      border-color: rgba(217, 119, 6, 0.3);
      color: rgba(146, 64, 14, 0.95);
      box-shadow: 0 2px 8px rgba(217, 119, 6, 0.15);
    }
    
    :global([data-theme="light"]) .warning-banner svg {
      color: rgba(217, 119, 6, 1);
      filter: drop-shadow(0 1px 2px rgba(217, 119, 6, 0.2));
    }
    
    /* ===== DISABLED STATE ===== */
    .chart-card.disabled {
      opacity: 0.35;
      cursor: not-allowed;
      pointer-events: auto;
    }
    
    .chart-card.disabled:hover {
      transform: none;
      opacity: 0.35;
      border-color: rgba(255, 255, 255, 0.06);
      background: linear-gradient(145deg, 
        rgba(30, 35, 48, 0.6) 0%, 
        rgba(20, 25, 35, 0.4) 100%);
      box-shadow: 
        0 4px 20px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }
    
    .chart-card.disabled .card-bg {
      opacity: 0;
    }
    
    .chart-card.disabled .icon-container {
      transform: none;
    }
    
    .chart-card.disabled .shine-effect {
      display: none;
    }
    
    :global([data-theme="light"]) .chart-card.disabled {
      opacity: 0.4;
    }
    
    :global([data-theme="light"]) .chart-card.disabled:hover {
      opacity: 0.4;
    }
  </style>
</Modal>

