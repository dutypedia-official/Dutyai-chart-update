<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  let { className = '' } = $props();

  // Event dispatcher
  const dispatch = createEventDispatcher();

  // State
  let isDragging = $state(false);
  let startX = 0;
  let startWidth = 0;
  let handleElement: HTMLElement;

  // Constants
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 480;
  const RESIZE_STEP = 12; // For keyboard navigation

  // Pointer event handlers
  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) return; // Only handle left mouse button

    event.preventDefault();
    event.stopPropagation();

    isDragging = true;
    startX = event.clientX;
    
    // Get current width from parent
    const sidebarContainer = handleElement.closest('.sidebar-container') as HTMLElement;
    if (sidebarContainer) {
      startWidth = sidebarContainer.offsetWidth;
    }

    // Capture pointer for smooth dragging
    handleElement.setPointerCapture(event.pointerId);
    
    // Prevent text selection and scrolling during drag
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';
    handleElement.style.pointerEvents = 'auto';

    dispatch('resize:start', { widthPx: startWidth });
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isDragging) return;

    event.preventDefault();
    event.stopPropagation();

    const deltaX = event.clientX - startX;
    // For right sidebar: drag left (negative deltaX) = increase width, drag right (positive deltaX) = decrease width
    const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth - deltaX));

    // Use RAF to avoid layout thrashing
    requestAnimationFrame(() => {
      dispatch('resize:move', { widthPx: newWidth });
    });
  }

  function handlePointerUp(event: PointerEvent) {
    if (!isDragging) return;

    event.preventDefault();
    event.stopPropagation();

    isDragging = false;
    
    // Release pointer capture
    handleElement.releasePointerCapture(event.pointerId);
    
    // Restore normal interaction
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';
    handleElement.style.pointerEvents = '';

    const deltaX = event.clientX - startX;
    const finalWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth - deltaX));

    dispatch('resize:end', { widthPx: finalWidth });
  }

  function handlePointerCancel(event: PointerEvent) {
    if (!isDragging) return;

    isDragging = false;
    
    // Release pointer capture
    handleElement.releasePointerCapture(event.pointerId);
    
    // Restore normal interaction
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';
    handleElement.style.pointerEvents = '';

    // Reset to start width
    dispatch('resize:end', { widthPx: startWidth });
  }

  // Double-click handler
  function handleDoubleClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    dispatch('double-click');
  }

  // Keyboard navigation (optional)
  function handleKeyDown(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();

    const sidebarContainer = handleElement.closest('.sidebar-container') as HTMLElement;
    if (!sidebarContainer) return;

    const currentWidth = sidebarContainer.offsetWidth;
    let newWidth = currentWidth;

    if (event.key === 'ArrowLeft') {
      // For right sidebar: Arrow Left = expand (increase width)
      newWidth = Math.min(MAX_WIDTH, currentWidth + RESIZE_STEP);
    } else if (event.key === 'ArrowRight') {
      // For right sidebar: Arrow Right = shrink (decrease width)
      newWidth = Math.max(MIN_WIDTH, currentWidth - RESIZE_STEP);
    }

    if (newWidth !== currentWidth) {
      dispatch('resize:start', { widthPx: currentWidth });
      dispatch('resize:move', { widthPx: newWidth });
      dispatch('resize:end', { widthPx: newWidth });
    }
  }

  // Focus management
  function handleFocus() {
    // Add visual focus indicator
  }

  function handleBlur() {
    // Remove visual focus indicator
  }
</script>

<div
  bind:this={handleElement}
  class="sidebar-resize-handle {className}"
  class:dragging={isDragging}
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize sidebar"
  tabindex="0"
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerCancel}
  ondblclick={handleDoubleClick}
  onkeydown={handleKeyDown}
  onfocus={handleFocus}
  onblur={handleBlur}
>
  <!-- Visual indicator for the resize handle -->
  <div class="resize-indicator">
    <div class="resize-dots">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  </div>
</div>

<style>
  .sidebar-resize-handle {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 12px;
    cursor: ew-resize;
    background: transparent;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none; /* Prevent default touch behaviors */
  }

  .sidebar-resize-handle:hover,
  .sidebar-resize-handle:focus {
    background-color: rgba(var(--primary-color-rgb, 59, 130, 246), 0.1);
  }

  .sidebar-resize-handle:focus {
    outline: 2px solid var(--primary-color, #3b82f6);
    outline-offset: -1px;
  }

  .sidebar-resize-handle.dragging {
    background-color: rgba(var(--primary-color-rgb, 59, 130, 246), 0.2);
  }

  .resize-indicator {
    width: 4px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .resize-dots {
    display: flex;
    flex-direction: column;
    gap: 2px;
    opacity: 0.4;
    transition: opacity 120ms ease-out;
  }

  .sidebar-resize-handle:hover .resize-dots,
  .sidebar-resize-handle:focus .resize-dots,
  .sidebar-resize-handle.dragging .resize-dots {
    opacity: 0.8;
  }

  .dot {
    width: 2px;
    height: 2px;
    background-color: var(--text-color, #374151);
    border-radius: 50%;
  }

  /* High DPI support */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .dot {
      width: 1.5px;
      height: 1.5px;
    }
  }

  /* Touch-friendly sizing */
  @media (pointer: coarse) {
    .sidebar-resize-handle {
      width: 16px;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .resize-dots {
      transition: none;
    }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .dot {
      background-color: var(--text-color, #d1d5db);
    }
  }
</style>