<script lang="ts">
  import { createEventDispatcher, getContext, onMount, tick } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import type { Writable } from 'svelte/store';
  import type { Chart } from 'klinecharts';
  import { ChartSave } from './chart';
  import RightSidebar from './RightSidebar.svelte';
  import SidebarResizeHandle from './SidebarResizeHandle.svelte';
  import { 
    getSidebarBootstrapState, 
    updateSidebarBootstrapState, 
    persistSidebarState,
    enableSidebarTransitions,
    disableSidebarTransitions,
    setSidebarState,
    checkContainerSize,
    SIDEBAR_CONSTANTS 
  } from '../stores/sidebarBootstrap';
  import { getChartRenderIntegration, getRenderScheduler, getLayoutTransitionManager, Throttler } from './core';

  // Props
  let { className = '' } = $props();

  // Context
  const chart = getContext('chart') as Writable<Chart | null>;
  const save = getContext('save') as Writable<ChartSave>;

  // Constants from bootstrap
  const { MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH, PRICE_SCALE_WIDTH } = SIDEBAR_CONSTANTS;

  // Initialize from bootstrap state
  const bootstrapState = getSidebarBootstrapState();
  const sidebarWidth = writable(bootstrapState.widthPx);
  
  // Sync save store with bootstrap state on initialization
  save.update(s => {
    s.showSidebar = bootstrapState.visible;
    return s;
  });

  // Derived state for external consumption
  const sidebarState = derived(
    [save, sidebarWidth],
    ([$save, $width]) => ({ visible: $save.showSidebar, widthPx: $width })
  );

  // Event dispatcher
  const dispatch = createEventDispatcher();

  // Track if transitions are enabled
  let transitionsEnabled = $state(false);
  
  // Render system integration
  const renderIntegration = getChartRenderIntegration();
  const scheduler = getRenderScheduler();
  const layoutManager = getLayoutTransitionManager();
  const resizeThrottler = new Throttler();
  
  // Register sidebar layout key
  layoutManager.register('sidebar');

  // Optimized chart resize using the render system
  function resizeChart() {
    if (!$chart) return;
    
    // Direct resize without throttling for immediate responsiveness on toggle
    // Throttler is only used for continuous operations (drag)
    scheduler.request(() => {
      $chart?.resize();
    });
  }
  
  // Throttled resize for drag operations
  function resizeChartThrottled() {
    if (!$chart) return;
    
    resizeThrottler.throttle(() => {
      scheduler.request(() => {
        $chart?.resize();
      });
    });
  }

  // Public API functions with smooth transitions
  export function openSidebar() {
    if (!$chart) return;
    
    const currentWidth = $sidebarWidth || DEFAULT_WIDTH;
    
    // Enable transitions for smooth animation
    layoutManager.enable('sidebar');
    
    // Update state
    save.update(s => {
      s.showSidebar = true;
      return s;
    });
    
    sidebarWidth.set(currentWidth);
    setSidebarState(true, currentWidth);
    dispatch('sidebar:toggle', { visible: true });
    
    // Multi-stage resize for smooth animation synchronized with CSS transition (200ms)
    requestAnimationFrame(() => {
      resizeChart(); // Immediate resize to start
      
      // Mid-animation resize
      setTimeout(() => {
        resizeChart();
      }, 100);
      
      // Final resize after transition completes
      setTimeout(() => {
        resizeChart();
      }, 250);
    });
  }

  export function closeSidebar() {
    if (!$chart) return;
    
    // Enable transitions for smooth animation
    layoutManager.enable('sidebar');
    
    // Update state
    save.update(s => {
      s.showSidebar = false;
      return s;
    });
    
    setSidebarState(false, 0);
    dispatch('sidebar:toggle', { visible: false });
    
    // Multi-stage resize for smooth animation synchronized with CSS transition (200ms)
    requestAnimationFrame(() => {
      resizeChart(); // Immediate resize to start
      
      // Mid-animation resize
      setTimeout(() => {
        resizeChart();
      }, 100);
      
      // Final resize after transition completes
      setTimeout(() => {
        resizeChart();
      }, 250);
    });
  }

  export function toggleSidebar() {
    const bootstrapState = getSidebarBootstrapState();
    if (bootstrapState.visible) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  export function setSidebarWidth(widthPx: number) {
    const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, widthPx));
    sidebarWidth.set(clampedWidth);
    
    if ($save.showSidebar) {
      setSidebarState(true, clampedWidth);
    }
    
    dispatch('sidebar:resize:move', { widthPx: clampedWidth });
    
    // Use throttled resize for drag operations to avoid layout thrashing
    resizeChartThrottled();
  }

  export function getSidebarState() {
    return $sidebarState;
  }

  // Handle resize events from the resize handle
  function handleResizeStart(event: CustomEvent) {
    // Temporarily disable transitions during drag for smooth dragging
    layoutManager.disable('sidebar');
    disableSidebarTransitions();
    dispatch('sidebar:resize:start', { widthPx: $sidebarWidth });
  }

  function handleResizeMove(event: CustomEvent) {
    const newWidth = event.detail.widthPx;
    setSidebarWidth(newWidth);
  }

  function handleResizeEnd(event: CustomEvent) {
    // Re-enable transitions after drag
    if (transitionsEnabled) {
      layoutManager.enable('sidebar');
      enableSidebarTransitions();
    }
    dispatch('sidebar:resize:end', { widthPx: $sidebarWidth });
  }

  // Handle double-click to reset to default width
  function handleDoubleClick() {
    setSidebarWidth(DEFAULT_WIDTH);
  }

  // Auto-collapse if container is too narrow
  function handleContainerSizeCheck() {
    if (!checkContainerSize() && $save.showSidebar) {
      closeSidebar();
      // Could show a tooltip here: "Sidebar hidden due to small width"
    }
  }

  // Keyboard support
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'S' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Only toggle if not in an input field
      const target = event.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
        event.preventDefault();
        toggleSidebar();
      }
    }
  }

  // Lifecycle
  onMount(() => {
    // Initialize async operations
    (async () => {
      // Disable transitions for initial render (prevent flash)
      layoutManager.disable('sidebar');
      
      // Wait for initial layout to settle
      await tick();
      
      // Check container size
      handleContainerSizeCheck();
      
      // Enable transitions after first paint for smooth toggle animations
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          transitionsEnabled = true;
          layoutManager.enable('sidebar');
          enableSidebarTransitions();
          
          console.log('✨ Sidebar transitions enabled');
          
          // Trigger chart resize to ensure proper layout
          if ($chart) {
            resizeChart();
          }
        });
      });
    })();
    
    // Listen for window resize
    const handleWindowResize = () => {
      handleContainerSizeCheck();
    };
    
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('keydown', handleKeydown);
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('keydown', handleKeydown);
      resizeThrottler.cancel();
    };
  });

  // Derived CSS custom properties - use bootstrap state for consistency
  const cssVars = $derived(() => {
    const state = getSidebarBootstrapState();
    const widthValue = state.visible ? `${state.widthPx}px` : '0px';
    return {
      '--sidebar-width': widthValue,
      '--sidebar-visible': state.visible ? '1' : '0',
      '--sidebar-transitions': state.transitionsEnabled ? 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
      'width': widthValue // Set width directly on the host
    };
  });
</script>

<div 
  class="sidebar-host {className}" 
  style={Object.entries(cssVars).map(([key, value]) => `${key}: ${value}`).join('; ')}
>
  {#if $sidebarState.visible}
    <div class="sidebar-container" style="width: {$sidebarWidth}px;">
      <RightSidebar />
      <SidebarResizeHandle
        on:resize:start={handleResizeStart}
        on:resize:move={handleResizeMove}
        on:resize:end={handleResizeEnd}
        on:double-click={handleDoubleClick}
      />
    </div>
  {/if}
</div>

<style>
  .sidebar-host {
    display: flex;
    flex-direction: row;
    height: 100%;
    position: relative;
    flex-shrink: 0; /* Prevent sidebar from shrinking */
    overflow: hidden; /* Hide content when width is 0 */
    transition: var(--sidebar-transitions, width 200ms cubic-bezier(0.4, 0, 0.2, 1)); /* Smooth width transition */
  }

  .sidebar-container {
    display: flex;
    flex-direction: row;
    height: 100%;
    position: relative;
    flex-shrink: 0; /* Prevent sidebar from shrinking */
    background-color: var(--background-color);
    border-left: 1px solid var(--border-color);
  }

  /* Ensure smooth transitions without layout thrashing */
  .sidebar-container * {
    will-change: auto;
  }

  /* Performance optimization with smooth easing */
  @media (prefers-reduced-motion: no-preference) {
    .sidebar-host {
      transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sidebar-container {
      transition: opacity 150ms ease-out;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sidebar-host,
    .sidebar-container {
      transition: none;
    }
  }
</style>