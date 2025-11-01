<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { SavedLayoutMeta } from './types';

  // Props
  export let savedLayouts: SavedLayoutMeta[] = [];
  export let activeSaveId: string | null = null;
  export let isLoading = false;
  export let hasUnsavedChanges = false;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    save: void;
    saveAs: void;
    quickSave: void;
    load: { layoutId: string };
    delete: { layoutId: string };
    newLayout: void;
    showPopup: void;
  }>();

  // Get active layout info
  $: activeLayout = activeSaveId ? savedLayouts.find(l => l.id === activeSaveId) : null;
  $: hasActiveSave = !!activeLayout;

  function handleSaveClick() {
    // Always show popup for save options
    dispatch('showPopup');
  }
</script>

<!-- Single Save Button -->
<button
  class="btn btn-primary btn-sm min-w-[100px] transition-all duration-200"
  class:btn-warning={hasUnsavedChanges}
  on:click={handleSaveClick}
  disabled={isLoading}
  title="Save Layout Options"
>
  {#if isLoading}
    <span class="loading loading-spinner loading-xs"></span>
  {:else}
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  {/if}
  Save
  {#if hasUnsavedChanges}
    <span class="text-xs">•</span>
  {/if}
</button>



<style>
  /* No custom styles needed for the simple save button */
</style>