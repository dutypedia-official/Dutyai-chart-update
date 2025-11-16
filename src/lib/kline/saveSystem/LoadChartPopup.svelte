<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import type { SavedLayoutMeta } from './types';

  // Props
  export let show = false;
  export let savedLayouts: SavedLayoutMeta[] = [];
  export let activeSaveId: string | null = null;
  export let isLoading = false;
  export let position = { x: 0, y: 0 };

  // State
  let popupRef: HTMLDivElement;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    load: { layoutId: string };
    delete: { layoutId: string };
    close: void;
  }>();

  // Close popup when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (popupRef && !popupRef.contains(event.target as Node)) {
      handleClose();
    }
  }

  // Handle keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }

  onMount(() => {
    if (browser && show) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeydown);
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    }
  });

  // Update event listeners when show changes
  $: if (browser && show) {
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeydown);
    }, 0);
  } else if (browser) {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeydown);
  }

  function handleClose() {
    show = false;
    dispatch('close');
  }

  function handleLoad(layoutId: string) {
    dispatch('load', { layoutId });
    handleClose();
  }

  // Prevent re-loading the currently active layout from the list
  function handleLayoutClick(layoutId: string) {
    if (layoutId === activeSaveId) {
      // Already applied layout – ignore click but keep hover for delete button
      return;
    }
    handleLoad(layoutId);
  }

  function handleDelete(event: MouseEvent, layoutId: string) {
    event.stopPropagation();
    dispatch('delete', { layoutId });
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Calculate popup position to keep it within chart bounds
  function getPopupStyle() {
    if (!browser) {
      return `left: ${position.x}px; top: ${position.y}px;`;
    }
    const popupWidth = 320;
    const popupHeight = 400;
    const chartContainer = document.querySelector('.chart-container') || document.querySelector('.kline-widget');
    if (!chartContainer) {
      return `left: ${position.x}px; top: ${position.y}px;`;
    }
    const bounds = chartContainer.getBoundingClientRect();
    let x = bounds.left + (bounds.width / 2) - (popupWidth / 2);
    let y = bounds.top + (bounds.height / 2) - (popupHeight / 2);
    x = Math.max(20, Math.min(x, window.innerWidth - popupWidth - 20));
    y = Math.max(20, Math.min(y, window.innerHeight - popupHeight - 20));
    return `left: ${x}px; top: ${y}px;`;
  }
</script>

{#if show}
  <!-- Backdrop -->
  <div class="fixed inset-0 bg-transparent z-40" on:click={handleClose}></div>

  <!-- Main Popup -->
  <div
    bind:this={popupRef}
    class="fixed z-50 bg-base-100 border border-base-300 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200"
    style={getPopupStyle()}
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-base-300/50">
      <h3 class="text-lg font-semibold text-base-content">Load Chart Layout</h3>
      <button
        class="btn btn-ghost btn-sm btn-circle"
        on:click={handleClose}
        title="Close"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Saved Layouts List -->
    <div class="max-h-80 overflow-y-auto">
      {#if isLoading}
        <div class="p-6 text-center text-base-content/60 text-sm">
          <span class="loading loading-spinner loading-xs"></span>
        </div>
      {:else if savedLayouts.length === 0}
        <div class="p-6 text-center text-base-content/60 text-sm">
          No saved layouts yet
        </div>
      {:else}
        <div class="p-4">
          <div class="text-xs font-medium text-base-content/70 px-2 py-2">
            Saved Layouts ({savedLayouts.length})
          </div>
          <div class="space-y-1">
            {#each savedLayouts as layout}
              <div
                class="group flex items-center justify-between px-3 py-2 hover:bg-base-200 rounded-md transition-colors duration-150 cursor-pointer {layout.id === activeSaveId ? 'bg-primary/10' : ''}"
                on:click={() => handleLayoutClick(layout.id)}
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-base-content truncate">
                      {layout.name}
                    </span>
                    {#if layout.id === activeSaveId}
                      <div class="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    {/if}
                  </div>
                  <div class="text-xs text-base-content/60">
                    {formatDate(new Date(layout.updatedAt).getTime())}
                  </div>
                </div>

                <button
                  class="opacity-0 group-hover:opacity-100 p-1 hover:bg-error/20 rounded transition-all duration-150"
                  on:click={(e) => handleDelete(e, layout.id)}
                  title="Delete layout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }
  .overflow-y-auto::-webkit-scrollbar { width: 6px; }
  .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
  .overflow-y-auto::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 3px; }
  .overflow-y-auto::-webkit-scrollbar-thumb:hover { background-color: rgba(156, 163, 175, 0.7); }
</style>


