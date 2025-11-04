<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import ColorPicker from '../ColorPicker.svelte'
  
  export let visible = false
  export let levels: Array<{value: number, visible: boolean, color: string}> = []
  export let theme = 'dark'
  
  const dispatch = createEventDispatcher()
  
  let showColorPicker = false
  let colorPickerIndex = -1
  let colorPickerPosition = { x: 0, y: 0 }
  
  function handleLevelChange(index: number, field: 'value' | 'visible' | 'color', value: any) {
    dispatch('levelChange', { index, field, value })
  }
  
  function openColorPicker(event: MouseEvent, index: number) {
    colorPickerIndex = index
    colorPickerPosition = { x: event.clientX, y: event.clientY }
    showColorPicker = true
  }
  
  function handleColorChange(event: CustomEvent) {
    if (colorPickerIndex >= 0) {
      handleLevelChange(colorPickerIndex, 'color', event.detail)
    }
    showColorPicker = false
  }
  
  function closeColorPicker() {
    showColorPicker = false
    colorPickerIndex = -1
  }
  
  function handleReset() {
    dispatch('reset')
  }
  
  function handleConfirm() {
    dispatch('confirm')
  }
  
  function handleCancel() {
    dispatch('cancel')
  }
  
  function handleClickOutside(event: MouseEvent) {
    const modal = event.target as HTMLElement
    if (modal.classList.contains('modal-backdrop')) {
      handleCancel()
    }
  }
</script>

{#if visible}
  <!-- Modal backdrop -->
  <div 
    class="fixed inset-0 bg-transparent flex items-center justify-center z-[9999] modal-backdrop"
    onclick={handleClickOutside}
  >
    <!-- Modal content -->
    <div 
      class="relative {theme === 'dark' ? 'bg-[#1a1a1a] border-[#404040]' : 'bg-white border-gray-200'} 
             rounded-lg shadow-xl border max-w-md w-full mx-4 max-h-[80vh] overflow-hidden
             sm:max-w-lg md:max-w-xl lg:max-w-2xl"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b {theme === 'dark' ? 'border-[#404040]' : 'border-gray-200'}">
        <h3 class="text-lg font-semibold {theme === 'dark' ? 'text-white' : 'text-gray-900'}">
          Fibonacci Settings
        </h3>
        <button 
          class="w-8 h-8 rounded-full {theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} 
                 flex items-center justify-center transition-colors"
          onclick={handleCancel}
          title="Close"
        >
          <svg class="w-5 h-5 {theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-4 max-h-[60vh] overflow-y-auto">
        <div class="space-y-3">
          {#each levels as level, index}
            <div class="flex items-center gap-3 p-3 rounded-lg {theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}
                        sm:gap-4 sm:p-4">
              <!-- Visibility checkbox -->
              <input 
                type="checkbox" 
                bind:checked={level.visible}
                onchange={() => handleLevelChange(index, 'visible', level.visible)}
                class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-2
                       sm:w-4 sm:h-4 touch-manipulation"
              />
              
              <!-- Level value input -->
              <input 
                type="number" 
                bind:value={level.value}
                onchange={() => handleLevelChange(index, 'value', level.value)}
                step="0.001"
                min="0"
                max="10"
                class="w-24 px-3 py-2 text-sm rounded border touch-manipulation
                       sm:w-20 sm:px-2 sm:py-1
                       {theme === 'dark' 
                         ? 'bg-[#3a3a3a] border-[#555] text-white focus:border-blue-500' 
                         : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'} 
                       focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              
              <!-- Color picker button -->
              <button 
                class="w-10 h-10 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors
                       sm:w-8 sm:h-8 touch-manipulation"
                style="background-color: {level.color}"
                onclick={(e) => openColorPicker(e, index)}
                title="Change color"
              ></button>
              
              <!-- Level label -->
              <span class="text-sm {theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} flex-1
                           sm:text-sm">
                {level.value === 0 ? 'Start' : level.value === 1 ? 'End' : `${(level.value * 100).toFixed(1)}%`}
              </span>
            </div>
          {/each}
        </div>
      </div>
      
      <!-- Footer -->
      <div class="flex items-center justify-between p-4 border-t {theme === 'dark' ? 'border-[#404040]' : 'border-gray-200'}
                  sm:flex-row flex-col gap-3 sm:gap-0">
        <button 
          class="px-6 py-3 text-sm rounded {theme === 'dark' ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} 
                 transition-colors touch-manipulation min-h-[44px] w-full sm:w-auto
                 sm:px-4 sm:py-2 sm:min-h-[36px]"
          onclick={handleReset}
        >
          🔁 Reset
        </button>
        
        <div class="flex gap-3 w-full sm:w-auto sm:gap-2">
          <button 
            class="px-6 py-3 text-sm rounded {theme === 'dark' ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} 
                   transition-colors touch-manipulation min-h-[44px] flex-1 sm:flex-none
                   sm:px-4 sm:py-2 sm:min-h-[36px]"
            onclick={handleCancel}
          >
            ❌ Cancel
          </button>
          <button 
            class="px-6 py-3 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors
                   touch-manipulation min-h-[44px] flex-1 sm:flex-none
                   sm:px-4 sm:py-2 sm:min-h-[36px]"
            onclick={handleConfirm}
          >
            ✅ Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Color picker -->
{#if showColorPicker}
  <div class="fixed z-[10000]" style="left: {colorPickerPosition.x}px; top: {colorPickerPosition.y}px;">
    <ColorPicker 
      selectedColor={levels[colorPickerIndex]?.color || '#FF6B6B'}
      show={showColorPicker}
      on:colorChange={handleColorChange}
      on:close={closeColorPicker}
    />
  </div>
{/if}

<style>
  /* Custom scrollbar for the modal content */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
  
  /* Mobile responsive adjustments */
  @media (max-width: 768px) {
    .max-w-md {
      max-width: 95vw;
    }
  }
</style>