<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from '../modal.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import type { SavedLayoutMeta, ValidationResult } from './types';

  // Props
  export let show = false;
  export let savedLayouts: SavedLayoutMeta[] = [];
  export let isLoading = false;
  export let mode: 'save' | 'saveAs' = 'save'; // save = new save, saveAs = save existing with new name
  export let showExisting: boolean = false; // control showing saved list inside save modal

  // State
  let layoutName = '';
  let validationResult: ValidationResult = { valid: true };
  let isValidating = false;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    save: { name: string };
    cancel: void;
  }>();

  // Reset state when modal opens/closes
  $: if (show) {
    layoutName = '';
    validationResult = { valid: true };
    isValidating = false;
  }

  // Real-time validation
  $: if (layoutName.trim()) {
    validateName(layoutName.trim());
  } else {
    validationResult = { valid: false, error: 'Layout name is required' };
  }

  function validateName(name: string): void {
    isValidating = true;
    
    // Basic validation
    if (!name) {
      validationResult = { valid: false, error: 'Layout name is required' };
      isValidating = false;
      return;
    }

    if (name.length < 2) {
      validationResult = { valid: false, error: 'Layout name must be at least 2 characters' };
      isValidating = false;
      return;
    }

    if (name.length > 50) {
      validationResult = { valid: false, error: 'Layout name must be less than 50 characters' };
      isValidating = false;
      return;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      validationResult = { valid: false, error: 'Layout name contains invalid characters' };
      isValidating = false;
      return;
    }

    // Check for duplicate names
    const isDuplicate = savedLayouts.some(layout => 
      layout.name.toLowerCase() === name.toLowerCase()
    );
    
    if (isDuplicate) {
      validationResult = { valid: false, error: 'A layout with this name already exists' };
      isValidating = false;
      return;
    }

    // All validations passed
    validationResult = { valid: true };
    isValidating = false;
  }

  function handleSave(): void {
    const trimmedName = layoutName.trim();
    if (validationResult.valid && trimmedName) {
      dispatch('save', { name: trimmedName });
    }
  }

  function handleCancel(): void {
    show = false;
    dispatch('cancel');
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && validationResult.valid && layoutName.trim()) {
      event.preventDefault();
      handleSave();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  // Get modal title based on mode
  $: modalTitle = mode === 'save' ? 'Save Chart Layout' : 'Save Layout As';
</script>

<Modal 
  bind:show 
  title={modalTitle}
  width={450}
  buttons={[]}
>
  <div class="space-y-6">
    <!-- Layout Name Input -->
    <div class="space-y-2">
      <label for="layout-name" class="block text-sm font-medium text-base-content">
        Layout Name
      </label>
      <input
        id="layout-name"
        type="text"
        bind:value={layoutName}
        onkeydown={handleKeydown}
        placeholder="Enter layout name..."
        class="w-full px-4 py-3 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-base-100 text-base-content placeholder-base-content/50"
        class:border-error={!validationResult.valid && layoutName.trim()}
        class:border-success={validationResult.valid && layoutName.trim()}
        disabled={isLoading}
        autofocus
      />
      
      <!-- Validation Message -->
      {#if layoutName.trim() && !validationResult.valid}
        <div class="flex items-center gap-2 text-sm text-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {validationResult.error}
        </div>
      {:else if validationResult.valid && layoutName.trim()}
        <div class="flex items-center gap-2 text-sm text-success">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Layout name is available
        </div>
      {/if}
    </div>

    <!-- Existing Layouts Info (optional) -->
    {#if showExisting && savedLayouts.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-base-content/70">Existing Layouts ({savedLayouts.length})</h4>
        <div class="max-h-32 overflow-y-auto space-y-1 p-3 bg-base-200/30 rounded-lg border border-base-300/50">
          {#each savedLayouts as layout}
            <div class="flex items-center justify-between text-sm">
              <span class="text-base-content/80">{layout.name}</span>
              <span class="text-xs text-base-content/50">
                {new Date(layout.updatedAt).toLocaleDateString()}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Action Buttons -->
    <div class="flex gap-3 justify-end pt-4 border-t border-base-300/50">
      <button 
        class="btn btn-ghost min-w-[100px] rounded-lg font-medium transition-all duration-200"
        onclick={handleCancel}
        disabled={isLoading}
      >
        Cancel
      </button>
      <button 
        class="btn btn-primary min-w-[100px] rounded-lg font-medium transition-all duration-200 hover:scale-105"
        onclick={handleSave}
        disabled={!validationResult.valid || !layoutName.trim() || isLoading || isValidating}
      >
        {#if isLoading}
          <span class="loading loading-spinner loading-sm"></span>
          Saving...
        {:else}
          Save Layout
        {/if}
      </button>
    </div>
  </div>
</Modal>

<style>
  /* Custom scrollbar for existing layouts */
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }
  
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: rgba(156, 163, 175, 0.7);
  }
</style>