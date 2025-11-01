<script lang="ts">
  import Modal from "./modal.svelte"
  import { getContext } from "svelte";
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
    { id: 'ohlc', name: 'OHLC', icon: 'ohlc' },
    { id: 'area', name: 'Area', icon: 'area' },
    { id: 'line_chart', name: 'Line', icon: 'line' } // Changed from 'line' to 'line_chart'
  ];

  function handleChartTypeClick(param: unknown) {
    const chartType = param as { id: string; name: string; icon: string };
    console.log('📊 CHART TYPE CLICK:', chartType.id);
    
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
    
    // Apply the new styles to the chart
    const styles = getThemeStyles($save.theme);
    _.merge(styles, $save.styles);
    $chart?.setStyles(styles);
    console.log('✅ Styles applied to chart');
    
    show = false;
  }

  function getCurrentChartType() {
    // Check if this is a line chart (marked with _isLineChart flag)
    if ($save.styles?.candle?._isLineChart) {
      return 'line_chart';
    }
    const currentType = $save.styles?.candle?.type || 'candle_solid';
    return currentType;
  }

  // Mouse tracking for premium hover effects
  function handleItemHover(event: MouseEvent, chartType: any) {
    const item = event.currentTarget as HTMLElement;
    const rect = item.getBoundingClientRect();
    
    // Calculate mouse position relative to the item
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Update CSS variables for the hover effect
    item.style.setProperty('--mouse-x', `${x}px`);
    item.style.setProperty('--mouse-y', `${y}px`);
  }
</script>

<Modal bind:show title="Chart Type" width="auto" maxWidth="95vw" maxHeight="90vh" buttons={[]} class="chart-type-modal">
  <div class="premium-chart-grid p-4 sm:p-5">
    {#each chartTypes as chartType (chartType.id)}
      <div 
        class="premium-chart-item group"
        class:active={getCurrentChartType() === chartType.id}
        onclick={() => handleChartTypeClick(chartType)}
        onmousemove={(e) => handleItemHover(e, chartType)}
      >
        <!-- Simplified icon with direct styling -->
        <div class="premium-icon-container">
          <Icon 
            name={chartType.icon} 
            size={20} 
            class="premium-icon {getCurrentChartType() === chartType.id ? 'active-icon' : ''}"
          />
          {#if getCurrentChartType() === chartType.id}
            <svg class="active-indicator" width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                    fill="currentColor" 
                    class="checkmark"
              />
            </svg>
          {/if}
        </div>
        
        <!-- Chart type name -->
        <div class="premium-chart-name">
          {chartType.name}
        </div>
        
        <!-- Visual effects -->
        <div class="premium-hover-effect"></div>
        {#if getCurrentChartType() === chartType.id}
          <div class="active-glow"></div>
        {/if}
      </div>
    {/each}
  </div>
  
  <style>
    .premium-chart-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      max-width: 400px;
      margin: 0 auto;
    }
    
    @media (max-width: 480px) {
      .premium-chart-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        max-width: none;
      }
    }
    
    .premium-chart-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 8px;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: linear-gradient(135deg, 
        rgba(255, 255, 255, 0.05) 0%, 
        rgba(255, 255, 255, 0.02) 50%, 
        rgba(255, 255, 255, 0.05) 100%
      );
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    
    @media (max-width: 480px) {
      .premium-chart-item {
        padding: 10px 6px;
        border-radius: 14px;
      }
    }
    
    .premium-chart-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      border-color: rgba(138, 43, 226, 0.3);
      background: linear-gradient(135deg, 
        rgba(138, 43, 226, 0.1) 0%, 
        rgba(138, 43, 226, 0.05) 50%, 
        rgba(138, 43, 226, 0.1) 100%
      );
    }
    
    .premium-chart-item.active {
      background: linear-gradient(135deg, 
        rgba(138, 43, 226, 0.2) 0%, 
        rgba(138, 43, 226, 0.15) 50%, 
        rgba(138, 43, 226, 0.2) 100%
      );
      border-color: rgba(138, 43, 226, 0.4);
      box-shadow: 
        0 4px 20px rgba(138, 43, 226, 0.25),
        0 0 0 1px rgba(138, 43, 226, 0.3);
    }
    
    .premium-icon-container {
      position: relative;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      background: linear-gradient(135deg, 
        rgba(255, 255, 255, 0.1) 0%, 
        rgba(255, 255, 255, 0.05) 100%
      );
      transition: all 0.3s ease;
    }
    
    @media (max-width: 480px) {
      .premium-icon-container {
        width: 40px;
        height: 40px;
        margin-bottom: 8px;
        border-radius: 10px;
      }
    }
    
    .premium-chart-item:hover .premium-icon-container {
      background: linear-gradient(135deg, 
        rgba(138, 43, 226, 0.2) 0%, 
        rgba(138, 43, 226, 0.1) 100%
      );
    }
    
    .premium-chart-item.active .premium-icon-container {
      background: linear-gradient(135deg, 
        rgba(138, 43, 226, 0.3) 0%, 
        rgba(138, 43, 226, 0.2) 100%
      );
    }
    
    .premium-icon {
      color: rgba(255, 255, 255, 0.8);
      transition: all 0.3s ease;
    }
    
    .premium-chart-item:hover .premium-icon {
      color: rgba(255, 255, 255, 0.95);
    }
    
    .active-icon {
      color: #ffffff !important;
    }
    
    .active-indicator {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #8a2be2 0%, #6a0dad 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(138, 43, 226, 0.4);
    }
    
    .checkmark {
      color: #ffffff;
      width: 12px;
      height: 12px;
    }
    
    .premium-chart-name {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      text-align: center;
      transition: all 0.3s ease;
    }
    
    .premium-chart-item:hover .premium-chart-name {
      color: #ffffff;
    }
    
    .premium-chart-item.active .premium-chart-name {
      color: #ffffff;
      font-weight: 600;
    }
    
    .premium-hover-effect {
      position: absolute;
      inset: 0;
      border-radius: 16px;
      background: radial-gradient(
        400px circle at var(--mouse-x) var(--mouse-y),
        rgba(138, 43, 226, 0.1),
        transparent 40%
      );
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    
    .premium-chart-item:hover .premium-hover-effect {
      opacity: 1;
    }
    
    .active-glow {
      position: absolute;
      inset: -2px;
      border-radius: 18px;
      background: linear-gradient(45deg, 
        rgba(138, 43, 226, 0.4), 
        rgba(138, 43, 226, 0.2), 
        rgba(138, 43, 226, 0.4)
      );
      filter: blur(8px);
      z-index: -1;
      animation: activeGlow 2s ease-in-out infinite alternate;
    }
    
    @keyframes activeGlow {
      0% { opacity: 0.6; }
      100% { opacity: 0.8; }
    }
    
    /* Light theme adjustments - Fixed text colors */
    :global([data-theme="light"]) .premium-chart-item {
      background: linear-gradient(135deg, 
        rgba(240, 240, 240, 0.8) 0%, 
        rgba(245, 245, 245, 0.9) 50%, 
        rgba(240, 240, 240, 0.8) 100%
      );
      border: 1px solid rgba(0, 0, 0, 0.15);
    }
    
    :global([data-theme="light"]) .premium-chart-item:hover {
      border-color: rgba(59, 130, 246, 0.3);
      background: linear-gradient(135deg, 
        rgba(59, 130, 246, 0.08) 0%, 
        rgba(59, 130, 246, 0.04) 50%, 
        rgba(59, 130, 246, 0.08) 100%
      );
    }
    
    :global([data-theme="light"]) .premium-chart-item.active {
      background: linear-gradient(135deg, 
        rgba(59, 130, 246, 0.15) 0%, 
        rgba(59, 130, 246, 0.1) 50%, 
        rgba(59, 130, 246, 0.15) 100%
      );
      border-color: rgba(59, 130, 246, 0.4);
      box-shadow: 
        0 4px 20px rgba(59, 130, 246, 0.15),
        0 0 0 1px rgba(59, 130, 246, 0.2);
    }
    
    :global([data-theme="light"]) .premium-icon-container {
      background: linear-gradient(135deg, 
        rgba(230, 230, 230, 0.7) 0%, 
        rgba(235, 235, 235, 0.8) 100%
      );
    }
    
    :global([data-theme="light"]) .premium-chart-item:hover .premium-icon-container {
      background: linear-gradient(135deg, 
        rgba(59, 130, 246, 0.1) 0%, 
        rgba(59, 130, 246, 0.05) 100%
      );
    }
    
    :global([data-theme="light"]) .premium-chart-item.active .premium-icon-container {
      background: linear-gradient(135deg, 
        rgba(59, 130, 246, 0.2) 0%, 
        rgba(59, 130, 246, 0.1) 100%
      );
    }
    
    /* Light mode - Force black text for ALL unselected items */
    :global([data-theme="light"]) .chart-type-modal .premium-chart-item:not(.active) .premium-icon {
      color: #000000 !important;
    }
    
    :global([data-theme="light"]) .chart-type-modal .premium-chart-item:not(.active):hover .premium-icon {
      color: #000000 !important;
    }
    
    :global([data-theme="light"]) .chart-type-modal .premium-chart-item:not(.active) .premium-chart-name {
      color: #000000 !important;
      font-weight: 500;
    }
    
    :global([data-theme="light"]) .chart-type-modal .premium-chart-item:not(.active):hover .premium-chart-name {
      color: #000000 !important;
      font-weight: 600;
    }
    
    /* Additional specificity for any nested elements */
    :global([data-theme="light"]) .chart-type-modal .premium-chart-item:not(.active) * {
      color: #000000 !important;
    }
    
    :global([data-theme="light"]) .chart-type-modal .premium-chart-item:not(.active) svg {
      color: #000000 !important;
      fill: #000000 !important;
    }
    
    /* Light mode - Selected/Active items - Force white text */
    :global([data-theme="light"]) .chart-type-modal .premium-chart-item.active .premium-icon,
    :global([data-theme="light"]) .chart-type-modal .active-icon {
      color: #ffffff !important;
    }
    
    :global([data-theme="light"]) .chart-type-modal .premium-chart-item.active .premium-chart-name {
      color: #ffffff !important;
      font-weight: 600;
    }
    
    /* Override any nested elements in active items to be white */
    :global([data-theme="light"]) .chart-type-modal .premium-chart-item.active * {
      color: #ffffff !important;
    }
    
    :global([data-theme="light"]) .chart-type-modal .premium-chart-item.active svg {
      color: #ffffff !important;
      fill: #ffffff !important;
    }
    
    :global([data-theme="light"]) .premium-hover-effect {
      background: radial-gradient(
        400px circle at var(--mouse-x) var(--mouse-y),
        rgba(59, 130, 246, 0.08),
        transparent 40%
      );
    }
    
    :global([data-theme="light"]) .active-glow {
      background: linear-gradient(45deg, 
        rgba(59, 130, 246, 0.3), 
        rgba(59, 130, 246, 0.15), 
        rgba(59, 130, 246, 0.3)
      );
    }
    
    :global([data-theme="light"]) .checkmark {
      color: #ffffff !important;
    }
  </style>
</Modal>
