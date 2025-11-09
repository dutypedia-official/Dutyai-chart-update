<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from '../modal.svelte';
  import type { SavedLayoutMeta } from './types';

  export let show = false;
  export let savedLayouts: SavedLayoutMeta[] = [];
  export let isLoading = false;

  let selectedId: string | null = null;

  const dispatch = createEventDispatcher<{
    saveTo: { layoutId: string };
    back: void;
    cancel: void;
  }>();

  $: if (show) {
    selectedId = null;
  }

  function handleSave() {
    if (selectedId) {
      console.log('💾 SaveAsSelectModal dispatching saveTo event with layoutId:', selectedId);
      dispatch('saveTo', { layoutId: selectedId });
    } else {
      console.log('❌ SaveAsSelectModal: No layout selected');
    }
  }

  function handleBack() {
    dispatch('back');
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<Modal bind:show title="Save As: Choose Layout to Overwrite" width={520} buttons={[]}> 
  <div class="space-y-4">
    <!-- Header with Back -->
    <div class="flex items-center justify-between">
      <button class="btn btn-ghost btn-sm" onclick={handleBack} title="Back">
        ← Back
      </button>
      <div></div>
    </div>

    <div class="text-sm text-base-content/70">
      Select a saved layout to overwrite with the current chart.
    </div>

    <!-- List -->
    <div class="max-h-80 overflow-y-auto divide-y divide-base-300/50 rounded-lg border border-base-300/50">
      {#if isLoading}
        <div class="p-6 text-center text-base-content/60 text-sm">
          <span class="loading loading-spinner loading-xs"></span>
        </div>
      {:else if savedLayouts.length === 0}
        <div class="p-6 text-center text-base-content/60 text-sm">
          No saved layouts found.
        </div>
      {:else}
        {#each savedLayouts as layout}
          <label class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-base-200">
            <input 
              type="radio" 
              name="save-as-target"
              value={layout.id}
              bind:group={selectedId}
              class="radio radio-primary"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-base-content truncate">{layout.name}</div>
              <div class="text-xs text-base-content/60">{new Date(layout.updatedAt).toLocaleString()}</div>
            </div>
          </label>
        {/each}
      {/if}
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-2">
      <button class="btn btn-ghost" onclick={handleCancel} disabled={isLoading}>Cancel</button>
      <button
        class="btn btn-primary"
        onclick={handleSave}
        disabled={!selectedId || isLoading}
      >
        {#if isLoading}
          <span class="loading loading-spinner loading-xs"></span>
          Saving...
        {:else}
          Save
        {/if}
      </button>
    </div>
  </div>
</Modal>

<style>
  .overflow-y-auto { scrollbar-width: thin; scrollbar-color: rgba(156,163,175,0.5) transparent; }
  .overflow-y-auto::-webkit-scrollbar { width: 6px; }
  .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
  .overflow-y-auto::-webkit-scrollbar-thumb { background-color: rgba(156,163,175,0.5); border-radius: 3px; }
  .overflow-y-auto::-webkit-scrollbar-thumb:hover { background-color: rgba(156,163,175,0.7); }
</style>


