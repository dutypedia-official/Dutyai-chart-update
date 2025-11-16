<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut, elasticOut } from 'svelte/easing';
  import { ChartSave, ChartCtx } from "./chart";
  import type { Writable } from "svelte/store";
  import type { Chart, Nullable } from 'klinecharts';
  import * as kc from 'klinecharts';
  import { undoRedoManager } from './undoRedoManager';
  import { markDirty } from '$lib/stores/unsavedChanges';
  import KlineIcon from './icon.svelte';
  import _ from "lodash";
  import { getThemeStyles, processLineChartStyles } from "./coms";
  
  let { show = $bindable() } = $props();
  
  // Get context variables
  const ctx = getContext('ctx') as Writable<ChartCtx>;
  const save = getContext('save') as Writable<ChartSave>;
  const chart = getContext('chart') as Writable<Nullable<Chart>>;
  
  // AI-powered indicators list
  const aiIndicators = [
    { name: 'SMART_MONEY', title: 'Smart Money Footprint', is_main: true, icon: '💰' },
    { name: 'TRAP_HUNTER', title: 'Trap Hunter (Bull/Bear Traps)', is_main: true, icon: '🎯' },
    { name: 'VOLCANIC', title: 'Volcanic Move (Pressure) (Sub Pane)', is_main: false, icon: '🌋' },
    { name: 'VOLCANIC_SIG', title: 'Volcanic Eruptions (Markers) (Main Pane)', is_main: true, icon: '💥' }
  ];
  
  // Unique loading phases for each indicator
  const indicatorLoadingPhases: Record<string, Array<{ text: string; duration: number; subtext: string }>> = {
    SMART_MONEY: [
      { text: "💰 Tracking institutional money flow", duration: 1200, subtext: "Analyzing whale movements..." },
      { text: "🏦 Detecting smart money footprints", duration: 1400, subtext: "Scanning OBV patterns..." },
      { text: "📊 Mapping accumulation zones", duration: 1300, subtext: "Identifying support levels..." },
      { text: "🎯 Calculating volume clusters", duration: 1200, subtext: "Processing 50,000+ trades..." },
      { text: "✨ Activating smart money radar", duration: 1100, subtext: "Deploying footprint tracker..." }
    ],
    TRAP_HUNTER: [
      { text: "🎯 Scanning for bull/bear traps", duration: 1200, subtext: "Analyzing false breakouts..." },
      { text: "🔍 Detecting fake-out patterns", duration: 1400, subtext: "Identifying trap signatures..." },
      { text: "⚡ Processing trap probability", duration: 1300, subtext: "Calculating 20+ parameters..." },
      { text: "🚨 Mapping high-risk zones", duration: 1200, subtext: "Locating potential traps..." },
      { text: "✨ Deploying trap detection AI", duration: 1100, subtext: "Activating alert system..." }
    ],
    VOLCANIC: [
      { text: "🌋 Measuring market pressure", duration: 1200, subtext: "Analyzing momentum buildup..." },
      { text: "📈 Detecting volcanic activity", duration: 1400, subtext: "Scanning RSI extremes..." },
      { text: "🔥 Calculating eruption zones", duration: 1300, subtext: "Processing pressure levels..." },
      { text: "⚡ Tracking explosive setups", duration: 1200, subtext: "Identifying breakout points..." },
      { text: "✨ Activating volcanic pressure", duration: 1100, subtext: "Deploying oscillator..." }
    ],
    VOLCANIC_SIG: [
      { text: "💥 Detecting eruption signals", duration: 1200, subtext: "Scanning breakout candles..." },
      { text: "🚀 Analyzing explosive moves", duration: 1400, subtext: "Tracking volume spikes..." },
      { text: "🎯 Mapping eruption markers", duration: 1300, subtext: "Calculating signal strength..." },
      { text: "⚡ Processing 15,000+ patterns", duration: 1200, subtext: "Identifying eruption points..." },
      { text: "✨ Deploying eruption markers", duration: 1100, subtext: "Activating signal alerts..." }
    ]
  };
  
  // Track selected indicators - Use $state for better reactivity
  let selectedIndicators = $state<Set<string>>(new Set());
  
  // Recompute selected indicators whenever AI modal is open & chart indicators are available
  $effect(() => {
    if (!show || !$chart) return;
    
    const chartObj = $chart;
    let activeIndicators = new Set<string>();
    
    try {
      // Prefer authoritative source: indicators actually on the chart
      const chartIndicators = (chartObj.getIndicators?.() ?? []) as Array<{ name: string; paneId?: string }>;
      activeIndicators = new Set(chartIndicators.map(ind => ind.name));
      console.log('🧠 AI Modal (open) - from chart.getIndicators:', chartIndicators);
    } catch (e) {
      console.warn('⚠️ AI Modal - getIndicators failed, falling back to saveInds', e);
      // Fallback: derive from saveInds
      const fallback = new Set<string>();
      if ($save && $save.saveInds) {
        Object.values($save.saveInds).forEach((indicator: any) => {
          if (indicator && indicator.name) {
            fallback.add(indicator.name);
          }
        });
      }
      activeIndicators = fallback;
    }
    
    console.log('🔄 AI Modal (open) - selectedIndicators updated:', Array.from(activeIndicators));
    console.log('🔍 AI Modal (open) - saveInds keys:', Object.keys($save.saveInds || {}));
    
    selectedIndicators = activeIndicators;
  });
  
  let wasOpenedFromAIModal = $state(false);
  
  // AI Loading animation state
  let loadingIndicator = $state<string | null>(null);
  let loadingPhase = $state(0);
  let loadingProgress = $state(0);
  let currentLoadingPhases = $state<Array<{ text: string; duration: number; subtext: string }>>([]);
  
  // Watch for edit popup state changes
  $effect(() => {
    if (!$ctx.modalIndCfg && wasOpenedFromAIModal) {
      wasOpenedFromAIModal = false;
      setTimeout(() => {
        show = true;
      }, 100);
    }
  });
  
  // Debug: Log when modal opens to check state
  $effect(() => {
    if (show) {
      console.log('🎯 AI Modal opened');
      console.log('📊 Current saveInds:', $save.saveInds);
      console.log('✅ AI indicators in chart:', Array.from(selectedIndicators));
    }
  });
  
  function handleClose() {
    show = false;
  }
  
  // Check if Renko chart is active and convert to Candle if needed
  function convertRenkoToCandleIfNeeded() {
    const currentType = $save.styles?.candle?.type;
    if (currentType === 'renko_atr') {
      console.log('🔄 Converting Renko chart to Candlestick for AI indicator compatibility');
      
      // Change to candlestick
      $save.styles.candle.type = 'candle_solid';
      
      // Remove Renko-specific config
      delete ($save.styles.candle as any).renko;
      delete $save.styles.candle._isLineChart;
      delete $save.styles.candle.area;
      
      // Apply the new styles
      const styles = getThemeStyles($save.theme);
      _.merge(styles, $save.styles);
      const processedStyles = processLineChartStyles(styles);
      $chart?.setStyles(processedStyles);
      
      console.log('✅ Chart converted from Renko to Candlestick');
      return true;
    }
    return false;
  }
  
  // Simulate AI loading with realistic phases (indicator-specific)
  async function simulateAILoading(name: string) {
    loadingIndicator = name;
    loadingPhase = 0;
    loadingProgress = 0;
    
    // Get specific loading phases for this indicator
    currentLoadingPhases = indicatorLoadingPhases[name] || indicatorLoadingPhases.SMART_MONEY;
    
    // Go through each phase
    for (let i = 0; i < currentLoadingPhases.length; i++) {
      loadingPhase = i;
      const phase = currentLoadingPhases[i];
      
      // Animate progress for this phase
      const startProgress = (i / currentLoadingPhases.length) * 100;
      const endProgress = ((i + 1) / currentLoadingPhases.length) * 100;
      const steps = 20;
      const stepDuration = phase.duration / steps;
      
      for (let step = 0; step <= steps; step++) {
        loadingProgress = startProgress + ((endProgress - startProgress) * (step / steps));
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
    }
    
    // Loading complete, now add indicator
    loadingIndicator = null;
    loadingPhase = 0;
    loadingProgress = 0;
    currentLoadingPhases = [];
  }
  
  async function addIndicator(isMain: boolean, name: string) {
    // Start AI loading animation
    await simulateAILoading(name);
    
    // Check and convert Renko chart if needed before adding AI indicator
    convertRenkoToCandleIfNeeded();
    
    let success = false;
    
    if (name === 'SMART_MONEY') {
      const paneId = 'candle_pane';
      const chartObj = $chart;
      if (chartObj) {
        const ind_id = chartObj.createIndicator({
          name: 'SMART_MONEY',
          calcParams: [40, 5, 25, 14, 20, 1.2, 0.03, 20, 0.2, 0.6, 1, 20, 1]
        }, true, {id: paneId});
        
        if (ind_id) {
          const ind = {
            name: 'SMART_MONEY',
            pane_id: paneId,
            params: [40, 5, 25, 14, 20, 1.2, 0.03, 20, 0.2, 0.6, 1, 20, 1]
          };
          const saveKey = `${paneId}_SMART_MONEY`;
          save.update(s => {
            s.saveInds[saveKey] = ind;
            return s;
          });
          markDirty();
          undoRedoManager.recordAddIndicator(name, paneId, ind.params, saveKey);
          success = true;
        }
      }
    } else if (name === 'TRAP_HUNTER') {
      const paneId = 'candle_pane';
      const chartObj = $chart;
      if (chartObj) {
        // Slightly more relaxed defaults so both bull and bear traps show
        // a bit more frequently out of the box, without killing accuracy.
        const params = [20, 20, 3, 5, 20, 1.3, 0.0007, 0.35, 0.5, 1, 5];
        const ind_id = chartObj.createIndicator({
          name: 'TRAP_HUNTER',
          calcParams: params
        }, true, {id: paneId});
        
        if (ind_id) {
          const ind = {
            name: 'TRAP_HUNTER',
            pane_id: paneId,
            params
          };
          const saveKey = `${paneId}_TRAP_HUNTER`;
          save.update(s => {
            s.saveInds[saveKey] = ind;
            return s;
          });
          markDirty();
          undoRedoManager.recordAddIndicator(name, paneId, ind.params, saveKey);
          success = true;
        }
      }
    } else if (name === 'VOLCANIC') {
      const paneId = 'pane_VOLCANIC';
      const chartObj = $chart;
      if (chartObj) {
        // Use the full, friendly defaults aligned with volcanicCore + coms.ts,
        // slightly relaxed so the user sees signals without manual tuning.
        const params = [
          16,      // BB Period
          2.0,     // BB StdDev
          14,      // ATR Period
          20,      // Volume MA Period
          60,      // Normalize Lookback
          2,       // Pressure SMA
          0.50,    // Min Pressure Alert (slightly softer than 0.55)
          1,       // Confirm Bars
          0.8,     // Min Volume x (softer than 1.0)
          0.8,     // Min Range x (softer than 1.0)
          0.40,    // Min Body % of Range (softer than 0.5)
          10,      // Breakout Lookback
          1,       // Min Bars Between Signals
          30,      // Trend EMA Period
          0,       // Require Trend Align (0 = off by default)
          0.0007,  // Breakout Buffer %
          0,       // Require BB Band Break (0 = off by default)
          1        // Retest Window (bars)
        ];

        const ind_id = chartObj.createIndicator(
          {
            name: 'VOLCANIC',
            calcParams: params
          },
          false,
          { id: paneId }
        );
        
        if (ind_id) {
          const ind = {
            name: 'VOLCANIC',
            pane_id: paneId,
            params
          };
          const saveKey = `${paneId}_VOLCANIC`;
          save.update(s => {
            s.saveInds[saveKey] = ind;
            return s;
          });
          markDirty();
          undoRedoManager.recordAddIndicator(name, paneId, ind.params, saveKey);
          success = true;
        }
      }
    } else if (name === 'VOLCANIC_SIG') {
      const paneId = 'candle_pane';
      const chartObj = $chart;
      if (chartObj) {
        // Match VOLCANIC defaults so pressure pane and main chart markers stay in sync
        const params = [
          16,      // BB Period
          2.0,     // BB StdDev
          14,      // ATR Period
          20,      // Volume MA Period
          60,      // Normalize Lookback
          2,       // Pressure SMA
          0.50,    // Min Pressure Alert
          1,       // Confirm Bars
          0.8,     // Min Volume x
          0.8,     // Min Range x
          0.40,    // Min Body % of Range
          10,      // Breakout Lookback
          1,       // Min Bars Between Signals
          30,      // Trend EMA Period
          0,       // Require Trend Align
          0.0007,  // Breakout Buffer %
          0,       // Require BB Band Break
          1        // Retest Window (bars)
        ];

        const ind_id = chartObj.createIndicator(
          {
            name: 'VOLCANIC_SIG',
            calcParams: params
          },
          true,
          { id: paneId }
        );
        
        if (ind_id) {
          const ind = {
            name: 'VOLCANIC_SIG',
            pane_id: paneId,
            params
          };
          const saveKey = `${paneId}_VOLCANIC_SIG`;
          save.update(s => {
            s.saveInds[saveKey] = ind;
            return s;
          });
          markDirty();
          undoRedoManager.recordAddIndicator(name, paneId, ind.params, saveKey);
          success = true;
        }
      }
    }
    
    if (success) {
      console.log(`✅ ${name} added successfully from AI modal`);
    }
  }
  
  function openEditPopup(paneId: string, name: string) {
    wasOpenedFromAIModal = true;
    show = false;
    ctx.update(c => {
      c.editPaneId = paneId;
      c.editIndName = name;
      c.modalIndCfg = true;
      return c;
    });
  }
  
  async function delInd(paneId: string, name: string) {
    console.log('🗑️ Deleting indicator:', { paneId, name });
    if(!$chart) {
      console.log('❌ No chart available');
      return;
    }
    
    const chartObj = $chart;
    const saveKey = `${paneId}_${name}`;
    const indicatorData = $save.saveInds[saveKey];
    
    if (indicatorData) {
      undoRedoManager.recordRemoveIndicator(name, paneId, indicatorData.params || [], saveKey);
    }
    
    try {
      chartObj.removeIndicator({ paneId, name });
      console.log('✅ Indicator removed');
      
      save.update(s => {
        delete s.saveInds[saveKey];
        return s;
      });
      markDirty();
    } catch (error) {
      console.log('❌ Error removing indicator:', error);
    }
  }
</script>

{#if show}
  <!-- Backdrop - Light and Non-blurry -->
  <div 
    class="ai-modal-backdrop" 
    transition:fade={{ duration: 200 }}
    onclick={handleClose}
    role="presentation"
  ></div>
  
  <!-- Modal Container -->
  <div 
    class="ai-modal-container"
    transition:fly={{ y: 20, duration: 300, easing: cubicOut }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="ai-modal-title"
  >
    <!-- Animated Background -->
    <div class="ai-background">
      <!-- Gradient Orbs -->
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
    </div>
    
    <!-- Content -->
    <div class="ai-content">
      <!-- Header -->
      <div class="ai-header">
        <div class="ai-header-left">
          <div class="ai-icon-small">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div class="ai-header-text">
            <h2 id="ai-modal-title" class="ai-title">AI Indicators</h2>
            <p class="ai-subtitle">Duty AI Advanced Algorithm - Exclusive for Pro Traders</p>
          </div>
        </div>
        <button class="close-btn" onclick={handleClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <!-- Indicators List -->
      <div class="indicators-list">
        {#each aiIndicators as ind, index (ind.name)}
          {@const isSelected = selectedIndicators.has(ind.name)}
          {@const isLoading = loadingIndicator === ind.name}
          {@const paneId = ind.is_main ? 'candle_pane' : `pane_${ind.name}`}
          <div 
            class="indicator-row {isSelected ? 'indicator-selected' : ''} {isLoading ? 'indicator-loading' : ''}"
            onclick={() => !isSelected && !isLoading && addIndicator(ind.is_main, ind.name)}
          >
            {#if isLoading}
              <!-- AI Loading State -->
              <div class="ai-loading-overlay">
                <!-- Animated Background Particles -->
                <div class="particles-container">
                  {#each Array(12) as _, i}
                    <div class="particle" style="--delay: {i * 0.15}s; --x: {Math.random() * 100}%; --y: {Math.random() * 100}%"></div>
                  {/each}
                </div>
                
                <!-- Data Stream Effect -->
                <div class="data-stream">
                  {#each Array(8) as _, i}
                    <div class="stream-line" style="--stream-delay: {i * 0.2}s; left: {10 + i * 12}%"></div>
                  {/each}
                </div>
                
                <div class="loading-content">
                  <!-- Animated AI Icon with Multiple Rings -->
                  <div class="ai-loader-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    <div class="ai-pulse-ring ring-1"></div>
                    <div class="ai-pulse-ring ring-2"></div>
                    <div class="ai-pulse-ring ring-3"></div>
                    <div class="ai-glow"></div>
                  </div>
                  
                  <!-- Loading Text with Subtext -->
                  <div class="loading-text-container">
                    <div class="loading-text-main">
                      {currentLoadingPhases[loadingPhase]?.text || ''}
                    </div>
                    <div class="loading-text-sub">
                      {currentLoadingPhases[loadingPhase]?.subtext || ''}
                    </div>
                  </div>
                  
                  <!-- Progress Bar with Segments -->
                  <div class="progress-container">
                    <div class="progress-bar" style="width: {loadingProgress}%">
                      <div class="progress-glow"></div>
                    </div>
                    <div class="progress-segments">
                      {#each Array(5) as _, i}
                        <div class="segment" class:active={loadingPhase >= i}></div>
                      {/each}
                    </div>
                  </div>
                  
                  <!-- Progress Percentage with Status -->
                  <div class="progress-info">
                    <div class="progress-percentage">
                      {Math.round(loadingProgress)}%
                    </div>
                    <div class="progress-status">
                      Phase {loadingPhase + 1}/5
                    </div>
                  </div>
                </div>
              </div>
            {:else}
              <!-- Normal State -->
              <!-- Indicator Icon -->
              <div class="indicator-icon">
                {ind.icon}
              </div>
              
              <!-- Indicator Info -->
              <div class="indicator-info">
                <span class="indicator-name">{ind.title}</span>
              </div>
              
              <!-- Action Buttons for Selected Indicators -->
              {#if isSelected}
                <div class="indicator-actions">
                  <button 
                    class="action-btn edit-btn"
                    title="Edit Parameters"
                    onclick={(e) => {
                      e.stopPropagation();
                      openEditPopup(paneId, ind.name);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button 
                    class="action-btn delete-btn"
                    title="Remove Indicator"
                    onclick={(e) => {
                      e.stopPropagation();
                      delInd(paneId, ind.name);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              {:else}
                <div class="add-indicator-hint">
                  <span>Click to add</span>
                </div>
              {/if}
            {/if}
          </div>
        {/each}
        
        <!-- Coming Soon Item - Inside Indicator List -->
        <div class="indicator-row coming-soon-item disabled" onclick={(e) => e.stopPropagation()}>
          <!-- Glitter Animation Background -->
          <div class="coming-soon-glitter-bg"></div>
          
          <!-- Glitter particles -->
          <div class="coming-soon-glitter-particle coming-soon-glitter-1"></div>
          <div class="coming-soon-glitter-particle coming-soon-glitter-2"></div>
          <div class="coming-soon-glitter-particle coming-soon-glitter-3"></div>
          <div class="coming-soon-glitter-particle coming-soon-glitter-4"></div>
          <div class="coming-soon-glitter-particle coming-soon-glitter-5"></div>
          
          <!-- Shine sweep effect -->
          <div class="coming-soon-shine-sweep"></div>
          
          <div class="indicator-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div class="indicator-info">
            <span class="indicator-name">AI Trade Entry Finder and more AI algorithms</span>
            <span class="coming-soon-badge">Coming Soon</span>
          </div>
        </div>
      </div>
      
      <!-- Powered by Footer -->
      <div class="ai-powered-footer">
        <span class="powered-by-text">Powered by Duty AI</span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Backdrop - Light and Clean (No Blur) */
  .ai-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 9998;
  }
  
  /* Modal Container */
  .ai-modal-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 550px;
    max-height: 90vh;
    background: linear-gradient(135deg, 
      rgba(10, 4, 28, 0.98) 0%, 
      rgba(26, 15, 46, 0.98) 50%, 
      rgba(10, 4, 28, 0.98) 100%);
    border: 2px solid rgba(138, 43, 226, 0.4);
    border-radius: 20px;
    box-shadow: 
      0 20px 60px rgba(138, 43, 226, 0.4),
      0 10px 30px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    overflow: hidden;
    z-index: 9999;
  }
  
  /* Animated Background */
  .ai-background {
    position: absolute;
    inset: 0;
    overflow: hidden;
    opacity: 0.4;
  }
  
  /* Gradient Orbs */
  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    animation: float 10s ease-in-out infinite;
  }
  
  .orb-1 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(138, 43, 226, 0.5) 0%, transparent 70%);
    top: -150px;
    left: -100px;
    animation-delay: 0s;
  }
  
  .orb-2 {
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
    bottom: -100px;
    right: -80px;
    animation-delay: 3s;
  }
  
  .orb-3 {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 6s;
  }
  
  @keyframes float {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(30px, -30px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
  }
  
  /* Content */
  .ai-content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 90vh;
  }
  
  /* Header */
  .ai-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 28px;
    border-bottom: 1px solid rgba(138, 43, 226, 0.2);
    background: rgba(0, 0, 0, 0.2);
  }
  
  .ai-header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .ai-icon-small {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(138, 43, 226, 0.2);
    border: 1px solid rgba(138, 43, 226, 0.4);
    border-radius: 10px;
    color: rgba(138, 43, 226, 1);
  }
  
  .ai-icon-small svg {
    width: 24px;
    height: 24px;
  }
  
  .ai-header-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .ai-title {
    font-size: 20px;
    font-weight: 700;
    color: rgba(220, 200, 255, 0.95);
    margin: 0;
    line-height: 1;
  }
  
  .ai-subtitle {
    font-size: 13px;
    font-weight: 600;
    background: linear-gradient(135deg, 
      rgba(138, 43, 226, 0.9) 0%, 
      rgba(168, 85, 247, 0.9) 50%,
      rgba(59, 130, 246, 0.9) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0;
    line-height: 1.3;
    animation: subtitleGlow 3s ease-in-out infinite;
    text-shadow: 0 0 20px rgba(138, 43, 226, 0.5);
  }
  
  @keyframes subtitleGlow {
    0%, 100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.2);
    }
  }
  
  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: rgba(180, 160, 220, 0.7);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .close-btn:hover {
    background: rgba(138, 43, 226, 0.2);
    color: rgba(220, 200, 255, 1);
  }
  
  .close-btn svg {
    width: 20px;
    height: 20px;
  }
  
  /* Indicators List */
  .indicators-list {
    padding: 12px;
    overflow-y: auto;
    max-height: calc(90vh - 100px);
  }
  
  .indicator-row {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    margin-bottom: 8px;
    background: rgba(138, 43, 226, 0.05);
    border: 1px solid rgba(138, 43, 226, 0.15);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: 60px;
  }
  
  .indicator-row:hover {
    background: rgba(138, 43, 226, 0.12);
    border-color: rgba(138, 43, 226, 0.3);
    transform: translateX(4px);
  }
  
  .indicator-row.indicator-selected {
    background: rgba(138, 43, 226, 0.2);
    border-color: rgba(138, 43, 226, 0.4);
    cursor: default;
  }
  
  .indicator-row.indicator-selected:hover {
    transform: none;
  }
  
  .indicator-icon {
    font-size: 28px;
    margin-right: 16px;
    filter: drop-shadow(0 2px 8px rgba(138, 43, 226, 0.4));
  }
  
  .indicator-info {
    flex: 1;
    min-width: 0;
  }
  
  .indicator-name {
    font-size: 15px;
    font-weight: 600;
    color: rgba(220, 200, 255, 0.95);
    line-height: 1.4;
  }
  
  .indicator-actions {
    display: flex;
    gap: 8px;
    margin-left: 12px;
  }
  
  .action-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(138, 43, 226, 0.2);
    border: 1px solid rgba(138, 43, 226, 0.3);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .action-btn svg {
    width: 16px;
    height: 16px;
    color: rgba(200, 180, 240, 0.9);
  }
  
  .action-btn:hover {
    transform: scale(1.1);
  }
  
  .edit-btn:hover {
    background: rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.5);
  }
  
  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.5);
  }
  
  .add-indicator-hint {
    font-size: 13px;
    color: rgba(160, 140, 200, 0.6);
    padding: 0 12px;
  }
  
  /* ===== LIGHT MODE STYLES ===== */
  :global([data-theme="light"]) .ai-modal-backdrop {
    background: rgba(0, 0, 0, 0.25);
  }
  
  :global([data-theme="light"]) .ai-modal-container {
    background: linear-gradient(135deg, 
      rgba(255, 255, 255, 0.98) 0%, 
      rgba(248, 250, 252, 0.98) 50%, 
      rgba(255, 255, 255, 0.98) 100%);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 
      0 20px 60px rgba(59, 130, 246, 0.15),
      0 10px 30px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 1);
  }
  
  :global([data-theme="light"]) .ai-background {
    opacity: 0.15;
  }
  
  :global([data-theme="light"]) .orb-1 {
    background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
  }
  
  :global([data-theme="light"]) .orb-2 {
    background: radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%);
  }
  
  :global([data-theme="light"]) .orb-3 {
    background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
  }
  
  :global([data-theme="light"]) .ai-header {
    border-bottom-color: rgba(59, 130, 246, 0.15);
    background: rgba(248, 250, 252, 0.5);
  }
  
  :global([data-theme="light"]) .ai-icon-small {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.25);
    color: rgba(59, 130, 246, 1);
  }
  
  :global([data-theme="light"]) .ai-title {
    color: #1e293b;
  }
  
  :global([data-theme="light"]) .ai-subtitle {
    background: linear-gradient(135deg, 
      rgba(59, 130, 246, 1) 0%, 
      rgba(99, 102, 241, 1) 50%,
      rgba(139, 92, 246, 1) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
  }
  
  :global([data-theme="light"]) .close-btn {
    color: #64748b;
  }
  
  :global([data-theme="light"]) .close-btn:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  
  :global([data-theme="light"]) .indicator-row {
    background: rgba(59, 130, 246, 0.03);
    border-color: rgba(59, 130, 246, 0.12);
  }
  
  :global([data-theme="light"]) .indicator-row:hover {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.2);
  }
  
  :global([data-theme="light"]) .indicator-row.indicator-selected {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
  }
  
  :global([data-theme="light"]) .indicator-name {
    color: #1e293b;
  }
  
  :global([data-theme="light"]) .action-btn {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.2);
  }
  
  :global([data-theme="light"]) .action-btn svg {
    color: #3b82f6;
  }
  
  :global([data-theme="light"]) .edit-btn:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.3);
  }
  
  :global([data-theme="light"]) .delete-btn:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
  }
  
  :global([data-theme="light"]) .delete-btn:hover svg {
    color: #ef4444;
  }
  
  :global([data-theme="light"]) .add-indicator-hint {
    color: #94a3b8;
  }
  
  /* ===== AI LOADING OVERLAY ===== */
  .indicator-row.indicator-loading {
    cursor: wait;
    position: relative;
    overflow: visible;
    border: 2px solid transparent;
    background: linear-gradient(135deg, rgba(10, 4, 28, 0.95), rgba(15, 8, 35, 0.98)) padding-box,
                linear-gradient(135deg, rgba(138, 43, 226, 0.6), rgba(59, 130, 246, 0.4)) border-box;
    animation: borderGlow 2s ease-in-out infinite;
    min-height: 220px;
    padding: 24px 20px;
    align-items: stretch;
  }
  
  @keyframes borderGlow {
    0%, 100% {
      border-color: rgba(138, 43, 226, 0.4);
      box-shadow: 0 0 20px rgba(138, 43, 226, 0.3);
    }
    50% {
      border-color: rgba(138, 43, 226, 0.8);
      box-shadow: 0 0 40px rgba(138, 43, 226, 0.6);
    }
  }
  
  .ai-loading-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, 
      rgba(138, 43, 226, 0.2) 0%, 
      rgba(59, 130, 246, 0.15) 100%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    animation: overlayFadeIn 0.4s ease;
  }
  
  @keyframes overlayFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  /* Particles Animation */
  .particles-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    border-radius: 12px;
  }
  
  .particle {
    position: absolute;
    width: 3px;
    height: 3px;
    background: rgba(138, 43, 226, 0.8);
    border-radius: 50%;
    left: var(--x);
    top: var(--y);
    animation: particleFloat 3s ease-in-out infinite;
    animation-delay: var(--delay);
    box-shadow: 0 0 10px rgba(138, 43, 226, 0.8);
  }
  
  @keyframes particleFloat {
    0%, 100% {
      transform: translate(0, 0) scale(0.5);
      opacity: 0;
    }
    20% {
      opacity: 1;
      transform: translate(-20px, -30px) scale(1);
    }
    80% {
      opacity: 1;
      transform: translate(20px, -60px) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(0, -80px) scale(0.5);
    }
  }
  
  /* Data Stream Effect */
  .data-stream {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    border-radius: 12px;
  }
  
  .stream-line {
    position: absolute;
    width: 2px;
    height: 40px;
    top: -40px;
    background: linear-gradient(180deg, 
      transparent 0%, 
      rgba(138, 43, 226, 0.8) 50%, 
      transparent 100%);
    animation: streamFlow 2s linear infinite;
    animation-delay: var(--stream-delay);
    box-shadow: 0 0 8px rgba(138, 43, 226, 0.6);
  }
  
  @keyframes streamFlow {
    0% {
      transform: translateY(0);
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    100% {
      transform: translateY(calc(100% + 80px));
      opacity: 0;
    }
  }
  
  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    width: 100%;
    height: 100%;
    position: relative;
    z-index: 2;
    justify-content: center;
  }
  
  /* AI Loader Icon */
  .ai-loader-icon {
    position: relative;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .ai-loader-icon svg {
    width: 36px;
    height: 36px;
    color: rgba(138, 43, 226, 1);
    filter: drop-shadow(0 0 15px rgba(138, 43, 226, 0.9));
    animation: aiIconSpin 2.5s ease-in-out infinite;
    position: relative;
    z-index: 3;
  }
  
  @keyframes aiIconSpin {
    0% {
      transform: rotateY(0deg) rotateZ(0deg) scale(1);
    }
    25% {
      transform: rotateY(90deg) rotateZ(10deg) scale(1.1);
    }
    50% {
      transform: rotateY(180deg) rotateZ(0deg) scale(1.15);
    }
    75% {
      transform: rotateY(270deg) rotateZ(-10deg) scale(1.1);
    }
    100% {
      transform: rotateY(360deg) rotateZ(0deg) scale(1);
    }
  }
  
  .ai-pulse-ring {
    position: absolute;
    inset: -10px;
    border: 2px solid rgba(138, 43, 226, 0.6);
    border-radius: 50%;
    z-index: 1;
  }
  
  .ring-1 {
    animation: pulsate1 1.8s ease-out infinite;
  }
  
  .ring-2 {
    animation: pulsate2 1.8s ease-out infinite 0.6s;
  }
  
  .ring-3 {
    animation: pulsate3 1.8s ease-out infinite 1.2s;
  }
  
  @keyframes pulsate1 {
    0% {
      transform: scale(0.8);
      opacity: 1;
      border-color: rgba(138, 43, 226, 0.8);
    }
    100% {
      transform: scale(2);
      opacity: 0;
      border-color: rgba(138, 43, 226, 0);
    }
  }
  
  @keyframes pulsate2 {
    0% {
      transform: scale(0.8);
      opacity: 1;
      border-color: rgba(168, 85, 247, 0.8);
    }
    100% {
      transform: scale(2);
      opacity: 0;
      border-color: rgba(168, 85, 247, 0);
    }
  }
  
  @keyframes pulsate3 {
    0% {
      transform: scale(0.8);
      opacity: 1;
      border-color: rgba(59, 130, 246, 0.8);
    }
    100% {
      transform: scale(2);
      opacity: 0;
      border-color: rgba(59, 130, 246, 0);
    }
  }
  
  .ai-glow {
    position: absolute;
    inset: -20px;
    background: radial-gradient(circle, 
      rgba(138, 43, 226, 0.4) 0%, 
      transparent 70%);
    border-radius: 50%;
    animation: glowPulse 2s ease-in-out infinite;
    z-index: 0;
  }
  
  @keyframes glowPulse {
    0%, 100% {
      transform: scale(0.8);
      opacity: 0.4;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.8;
    }
  }
  
  /* Loading Text */
  .loading-text-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
  }
  
  .loading-text-main {
    font-size: 15px;
    font-weight: 700;
    color: rgba(220, 200, 255, 0.95);
    text-align: center;
    line-height: 1.3;
    animation: textGlow 2s ease-in-out infinite;
    text-shadow: 0 0 20px rgba(138, 43, 226, 0.6);
  }
  
  .loading-text-sub {
    font-size: 12px;
    font-weight: 500;
    color: rgba(180, 160, 220, 0.8);
    text-align: center;
    line-height: 1.2;
    animation: textPulse 1.5s ease-in-out infinite;
  }
  
  @keyframes textGlow {
    0%, 100% {
      text-shadow: 0 0 15px rgba(138, 43, 226, 0.5);
      transform: scale(1);
    }
    50% {
      text-shadow: 0 0 30px rgba(138, 43, 226, 0.8);
      transform: scale(1.02);
    }
  }
  
  @keyframes textPulse {
    0%, 100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }
  
  /* Progress Container */
  .progress-container {
    width: 100%;
    position: relative;
    margin-bottom: 4px;
  }
  
  .progress-bar {
    height: 8px;
    background: linear-gradient(90deg, 
      rgba(138, 43, 226, 1) 0%, 
      rgba(168, 85, 247, 1) 50%, 
      rgba(59, 130, 246, 1) 100%);
    background-size: 300% 100%;
    border-radius: 4px;
    transition: width 0.2s ease-out;
    animation: progressShimmer 2s linear infinite;
    box-shadow: 
      0 0 15px rgba(138, 43, 226, 0.8),
      0 0 30px rgba(138, 43, 226, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    position: relative;
    overflow: hidden;
  }
  
  .progress-glow {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%);
    animation: progressGlowMove 1.5s linear infinite;
  }
  
  @keyframes progressShimmer {
    0% {
      background-position: 300% 0;
    }
    100% {
      background-position: -300% 0;
    }
  }
  
  @keyframes progressGlowMove {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(200%);
    }
  }
  
  /* Progress Segments */
  .progress-segments {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    justify-content: center;
  }
  
  .segment {
    width: 30px;
    height: 4px;
    background: rgba(138, 43, 226, 0.2);
    border-radius: 2px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .segment.active {
    background: linear-gradient(90deg, 
      rgba(138, 43, 226, 1) 0%, 
      rgba(168, 85, 247, 1) 100%);
    box-shadow: 0 0 10px rgba(138, 43, 226, 0.8);
    animation: segmentGlow 1.5s ease-in-out infinite;
  }
  
  .segment.active::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.6) 50%,
      transparent 100%);
    animation: segmentShine 1s linear infinite;
  }
  
  @keyframes segmentGlow {
    0%, 100% {
      box-shadow: 0 0 10px rgba(138, 43, 226, 0.6);
    }
    50% {
      box-shadow: 0 0 20px rgba(138, 43, 226, 1);
    }
  }
  
  @keyframes segmentShine {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(200%);
    }
  }
  
  /* Progress Info */
  .progress-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 4px;
  }
  
  .progress-percentage {
    font-size: 14px;
    font-weight: 800;
    background: linear-gradient(135deg, 
      rgba(138, 43, 226, 1) 0%, 
      rgba(168, 85, 247, 1) 50%,
      rgba(59, 130, 246, 1) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: percentageBounce 0.8s ease-in-out infinite;
    text-shadow: 0 0 20px rgba(138, 43, 226, 0.8);
  }
  
  .progress-status {
    font-size: 11px;
    font-weight: 600;
    color: rgba(180, 160, 220, 0.8);
    background: rgba(138, 43, 226, 0.2);
    padding: 4px 10px;
    border-radius: 10px;
    border: 1px solid rgba(138, 43, 226, 0.3);
    animation: statusPulse 2s ease-in-out infinite;
  }
  
  @keyframes percentageBounce {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
  
  @keyframes statusPulse {
    0%, 100% {
      border-color: rgba(138, 43, 226, 0.3);
      background: rgba(138, 43, 226, 0.15);
    }
    50% {
      border-color: rgba(138, 43, 226, 0.6);
      background: rgba(138, 43, 226, 0.3);
    }
  }
  
  /* ===== LIGHT MODE - LOADING ANIMATION ===== */
  :global([data-theme="light"]) .indicator-row.indicator-loading {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98)) padding-box,
                linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(99, 102, 241, 0.3)) border-box;
  }
  
  :global([data-theme="light"]) .ai-loading-overlay {
    background: linear-gradient(135deg, 
      rgba(59, 130, 246, 0.08) 0%, 
      rgba(99, 102, 241, 0.06) 100%);
  }
  
  :global([data-theme="light"]) .particle {
    background: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
  }
  
  :global([data-theme="light"]) .stream-line {
    background: linear-gradient(180deg, 
      transparent 0%, 
      rgba(59, 130, 246, 0.6) 50%, 
      transparent 100%);
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
  }
  
  :global([data-theme="light"]) .ai-loader-icon svg {
    color: #3b82f6;
    filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.5));
  }
  
  :global([data-theme="light"]) .ai-pulse-ring {
    border-color: rgba(59, 130, 246, 0.4);
  }
  
  :global([data-theme="light"]) .ai-glow {
    background: radial-gradient(circle, 
      rgba(59, 130, 246, 0.25) 0%, 
      transparent 70%);
  }
  
  :global([data-theme="light"]) .loading-text-main {
    color: #1e293b;
    text-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
  }
  
  :global([data-theme="light"]) .loading-text-sub {
    color: #64748b;
  }
  
  :global([data-theme="light"]) .progress-bar {
    background: linear-gradient(90deg, 
      rgba(59, 130, 246, 1) 0%, 
      rgba(99, 102, 241, 1) 50%, 
      rgba(139, 92, 246, 1) 100%);
    box-shadow: 
      0 0 12px rgba(59, 130, 246, 0.5),
      0 0 20px rgba(59, 130, 246, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }
  
  :global([data-theme="light"]) .segment {
    background: rgba(59, 130, 246, 0.15);
  }
  
  :global([data-theme="light"]) .segment.active {
    background: linear-gradient(90deg, 
      rgba(59, 130, 246, 1) 0%, 
      rgba(99, 102, 241, 1) 100%);
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
  }
  
  :global([data-theme="light"]) .progress-percentage {
    background: linear-gradient(135deg, 
      rgba(59, 130, 246, 1) 0%, 
      rgba(99, 102, 241, 1) 50%,
      rgba(139, 92, 246, 1) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
  }
  
  :global([data-theme="light"]) .progress-status {
    color: #64748b;
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.2);
  }
  
  /* Mobile Responsiveness */
  @media (max-width: 640px) {
    .ai-modal-container {
      max-width: 95%;
      border-radius: 16px;
    }
    
    .ai-header {
      padding: 20px 20px;
    }
    
    .ai-icon-small {
      width: 36px;
      height: 36px;
    }
    
    .ai-icon-small svg {
      width: 20px;
      height: 20px;
    }
    
    .ai-title {
      font-size: 18px;
    }
    
    .ai-subtitle {
      font-size: 12px;
    }
    
    .indicators-list {
      padding: 8px;
    }
    
    .indicator-row {
      padding: 14px 16px;
    }
    
    .indicator-icon {
      font-size: 24px;
      margin-right: 12px;
    }
    
    .indicator-name {
      font-size: 14px;
    }
    
    .action-btn {
      width: 28px;
      height: 28px;
    }
    
    .action-btn svg {
      width: 14px;
      height: 14px;
    }
  }
  
  @media (max-width: 480px) {
    .ai-header {
      padding: 16px;
    }
    
    .ai-header-left {
      gap: 12px;
    }
    
    .indicator-row {
      padding: 12px 14px;
    }
    
    .add-indicator-hint {
      font-size: 12px;
    }
  }
  
  /* Coming Soon Item - Inside Indicator List */
  .coming-soon-item {
    opacity: 0.7;
    cursor: not-allowed;
    position: relative;
    overflow: hidden;
  }
  
  .coming-soon-item.disabled {
    pointer-events: none;
  }
  
  .coming-soon-item:hover {
    transform: none !important;
    background: rgba(138, 43, 226, 0.05) !important;
    border-color: rgba(138, 43, 226, 0.15) !important;
  }
  
  /* Coming Soon Glitter Animation Background */
  .coming-soon-glitter-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(138, 43, 226, 0.1) 0%,
      rgba(59, 130, 246, 0.15) 25%,
      rgba(138, 43, 226, 0.1) 50%,
      rgba(59, 130, 246, 0.15) 75%,
      rgba(138, 43, 226, 0.1) 100%
    );
    background-size: 200% 200%;
    animation: coming-soon-glitter-bg-shift 3s ease-in-out infinite;
    opacity: 0.6;
    z-index: 0;
  }
  
  :global([data-theme="light"]) .coming-soon-glitter-bg {
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
  
  /* Coming Soon Glitter Particles */
  .coming-soon-glitter-particle {
    position: absolute;
    width: 3px;
    height: 3px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    pointer-events: none;
    z-index: 1;
    box-shadow: 0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(138, 43, 226, 0.6);
  }
  
  :global([data-theme="light"]) .coming-soon-glitter-particle {
    background: rgba(59, 130, 246, 0.9);
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.9), 0 0 12px rgba(139, 92, 246, 0.8), 0 0 18px rgba(59, 130, 246, 0.6);
  }
  
  .coming-soon-glitter-1 {
    top: 20%;
    left: 10%;
    animation: coming-soon-glitter-float 2.5s ease-in-out infinite;
    animation-delay: 0s;
  }
  
  .coming-soon-glitter-2 {
    top: 60%;
    left: 30%;
    animation: coming-soon-glitter-float 3s ease-in-out infinite;
    animation-delay: 0.5s;
  }
  
  .coming-soon-glitter-3 {
    top: 40%;
    left: 60%;
    animation: coming-soon-glitter-float 2.8s ease-in-out infinite;
    animation-delay: 1s;
  }
  
  .coming-soon-glitter-4 {
    top: 15%;
    left: 80%;
    animation: coming-soon-glitter-float 3.2s ease-in-out infinite;
    animation-delay: 1.5s;
  }
  
  .coming-soon-glitter-5 {
    top: 75%;
    left: 50%;
    animation: coming-soon-glitter-float 2.7s ease-in-out infinite;
    animation-delay: 2s;
  }
  
  /* Coming Soon Shine Sweep Effect */
  .coming-soon-shine-sweep {
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
    animation: coming-soon-shine-sweep 2.5s ease-in-out infinite;
    z-index: 1;
  }
  
  :global([data-theme="light"]) .coming-soon-shine-sweep {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(59, 130, 246, 0.5) 50%,
      transparent 100%
    );
  }
  
  /* Coming Soon Animations */
  @keyframes coming-soon-glitter-bg-shift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  
  @keyframes coming-soon-glitter-float {
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
  
  @keyframes coming-soon-shine-sweep {
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
  
  .coming-soon-item .indicator-icon {
    font-size: 28px;
    margin-right: 16px;
    opacity: 0.6;
    position: relative;
    z-index: 2;
  }
  
  .coming-soon-item .indicator-icon svg {
    width: 24px;
    height: 24px;
    color: rgba(220, 200, 255, 0.5);
  }
  
  .coming-soon-item .indicator-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    z-index: 2;
  }
  
  .coming-soon-item .indicator-name {
    font-size: 15px;
    font-weight: 600;
    color: rgba(220, 200, 255, 0.7);
    line-height: 1.4;
  }
  
  .coming-soon-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    color: rgba(138, 43, 226, 0.9);
    background: rgba(138, 43, 226, 0.15);
    padding: 4px 10px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: 1px solid rgba(138, 43, 226, 0.3);
    width: fit-content;
  }
  
  /* Powered by Footer */
  .ai-powered-footer {
    padding: 16px 20px;
    text-align: center;
    border-top: 1px solid rgba(138, 43, 226, 0.2);
    background: rgba(138, 43, 226, 0.03);
  }
  
  .powered-by-text {
    font-size: 12px;
    font-weight: 500;
    color: rgba(220, 200, 255, 0.6);
    letter-spacing: 0.5px;
  }
  
  /* Light Mode Styles for Coming Soon */
  :global([data-theme="light"]) .coming-soon-item {
    background: rgba(59, 130, 246, 0.03) !important;
    border-color: rgba(59, 130, 246, 0.12) !important;
  }
  
  :global([data-theme="light"]) .coming-soon-item:hover {
    background: rgba(59, 130, 246, 0.03) !important;
    border-color: rgba(59, 130, 246, 0.12) !important;
  }
  
  :global([data-theme="light"]) .coming-soon-item .indicator-icon svg {
    color: rgba(59, 130, 246, 0.4);
  }
  
  :global([data-theme="light"]) .coming-soon-item .indicator-name {
    color: rgba(30, 41, 59, 0.6);
  }
  
  :global([data-theme="light"]) .coming-soon-badge {
    color: rgba(59, 130, 246, 0.9);
    background: rgba(59, 130, 246, 0.12);
    border-color: rgba(59, 130, 246, 0.25);
  }
  
  :global([data-theme="light"]) .ai-powered-footer {
    border-top-color: rgba(59, 130, 246, 0.15);
    background: rgba(59, 130, 246, 0.02);
  }
  
  :global([data-theme="light"]) .powered-by-text {
    color: rgba(30, 41, 59, 0.5);
  }
</style>

