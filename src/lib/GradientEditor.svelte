<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import ColorPicker from './ColorPicker.svelte';
  
  const dispatch = createEventDispatcher();
  
  export let show = false;
  export let initialGradient = {
    type: 'linear',
    direction: 0,
    stops: [
      { position: 0, color: '#ffffff', opacity: 100 },
      { position: 100, color: '#000000', opacity: 100 }
    ]
  };
  
  let gradientEditorElement: HTMLElement;
  let gradientBarElement: HTMLElement;
  let isDraggingStop = false;
  let dragStopIndex = -1;
  let showColorPicker = false;
  let colorPickerPosition = { x: 0, y: 0 };
  let activeStopIndex = 0;
  
  // Gradient configuration
  let gradientType = initialGradient.type;
  let gradientDirection = initialGradient.direction;
  let gradientStops = [...initialGradient.stops];
  
  // Direction presets for linear gradients
  const directionPresets = [
    { angle: 0, label: '→', title: 'Left to Right' },
    { angle: 45, label: '↗', title: 'Bottom-Left to Top-Right' },
    { angle: 90, label: '↑', title: 'Bottom to Top' },
    { angle: 135, label: '↖', title: 'Bottom-Right to Top-Left' },
    { angle: 180, label: '←', title: 'Right to Left' },
    { angle: 225, label: '↙', title: 'Top-Right to Bottom-Left' },
    { angle: 270, label: '↓', title: 'Top to Bottom' },
    { angle: 315, label: '↘', title: 'Top-Left to Bottom-Right' }
  ];
  
  // Generate CSS gradient string
  function generateGradientCSS() {
    const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position);
    const stopStrings = sortedStops.map(stop => {
      const rgba = hexToRgba(stop.color, stop.opacity / 100);
      return `${rgba} ${stop.position}%`;
    });
    
    if (gradientType === 'linear') {
      return `linear-gradient(${gradientDirection}deg, ${stopStrings.join(', ')})`;
    } else {
      return `radial-gradient(circle, ${stopStrings.join(', ')})`;
    }
  }
  
  // Convert hex color to rgba
  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  // Handle gradient type change
  function handleTypeChange(type: string) {
    gradientType = type;
    emitGradientChange();
  }
  
  // Handle direction change
  function handleDirectionChange(direction: number) {
    gradientDirection = direction;
    emitGradientChange();
  }
  
  // Handle direction slider change
  function handleDirectionSlider(event: Event) {
    const target = event.target as HTMLInputElement;
    gradientDirection = parseInt(target.value);
    emitGradientChange();
  }
  
  // Add new color stop
  function addColorStop() {
    if (gradientStops.length >= 5) return; // Maximum 5 stops
    
    // Find a good position for the new stop
    const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position);
    let newPosition = 50;
    
    // Find the largest gap between stops
    let maxGap = 0;
    let gapPosition = 50;
    
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const gap = sortedStops[i + 1].position - sortedStops[i].position;
      if (gap > maxGap) {
        maxGap = gap;
        gapPosition = sortedStops[i].position + gap / 2;
      }
    }
    
    if (maxGap > 10) {
      newPosition = gapPosition;
    }
    
    const newStop = {
      position: newPosition,
      color: '#808080',
      opacity: 100
    };
    
    gradientStops = [...gradientStops, newStop];
    activeStopIndex = gradientStops.length - 1;
    emitGradientChange();
  }
  
  // Remove color stop
  function removeColorStop(index: number) {
    if (gradientStops.length <= 2) return; // Minimum 2 stops
    
    gradientStops = gradientStops.filter((_, i) => i !== index);
    if (activeStopIndex >= gradientStops.length) {
      activeStopIndex = gradientStops.length - 1;
    }
    emitGradientChange();
  }
  
  // Handle stop position change
  function handleStopPositionChange(index: number, position: number) {
    gradientStops[index].position = Math.max(0, Math.min(100, position));
    emitGradientChange();
  }
  
  // Handle stop color change
  function handleStopColorChange(index: number, color: string) {
    gradientStops[index].color = color;
    emitGradientChange();
  }
  
  // Handle stop opacity change
  function handleStopOpacityChange(index: number, opacity: number) {
    gradientStops[index].opacity = Math.max(0, Math.min(100, opacity));
    emitGradientChange();
  }
  
  // Show color picker for stop
  function showStopColorPicker(event: MouseEvent, index: number) {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    colorPickerPosition = {
      x: rect.right + 10,
      y: rect.top
    };
    activeStopIndex = index;
    showColorPicker = true;
  }
  
  // Handle color picker change
  function handleColorPickerChange(event: CustomEvent) {
    if (activeStopIndex >= 0 && activeStopIndex < gradientStops.length) {
      gradientStops[activeStopIndex].color = event.detail;
      emitGradientChange();
    }
  }
  
  // Handle opacity picker change
  function handleOpacityPickerChange(event: CustomEvent) {
    if (activeStopIndex >= 0 && activeStopIndex < gradientStops.length) {
      gradientStops[activeStopIndex].opacity = event.detail;
      emitGradientChange();
    }
  }
  
  // Handle gradient bar mouse events for dragging stops
  function handleGradientBarMouseDown(event: MouseEvent) {
    if (!gradientBarElement) return;
    
    const rect = gradientBarElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    // Check if clicking on an existing stop
    let clickedStopIndex = -1;
    const stopTolerance = 8; // pixels
    
    gradientStops.forEach((stop, index) => {
      const stopX = (stop.position / 100) * rect.width;
      if (Math.abs(x - stopX) <= stopTolerance) {
        clickedStopIndex = index;
      }
    });
    
    if (clickedStopIndex >= 0) {
      // Start dragging existing stop
      isDraggingStop = true;
      dragStopIndex = clickedStopIndex;
      activeStopIndex = clickedStopIndex;
    } else if (gradientStops.length < 5) {
      // Add new stop at click position
      const newStop = {
        position: Math.max(0, Math.min(100, percentage)),
        color: '#808080',
        opacity: 100
      };
      gradientStops = [...gradientStops, newStop];
      activeStopIndex = gradientStops.length - 1;
      emitGradientChange();
    }
  }
  
  // Handle mouse move for dragging stops
  function handleGradientBarMouseMove(event: MouseEvent) {
    if (!isDraggingStop || dragStopIndex < 0 || !gradientBarElement) return;
    
    const rect = gradientBarElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    gradientStops[dragStopIndex].position = percentage;
    emitGradientChange();
  }
  
  // Handle mouse up for dragging stops
  function handleGradientBarMouseUp() {
    isDraggingStop = false;
    dragStopIndex = -1;
  }
  
  // Emit gradient change event
  function emitGradientChange() {
    const gradient = {
      type: gradientType,
      direction: gradientDirection,
      stops: [...gradientStops],
      css: generateGradientCSS()
    };
    dispatch('gradientChange', gradient);
  }
  
  // Handle click outside to close
  function handleClickOutside(event: MouseEvent) {
    if (gradientEditorElement && !gradientEditorElement.contains(event.target as Node)) {
      show = false;
    }
  }
  
  // Handle backdrop click
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      show = false;
    }
  }
  
  // Add event listeners when show becomes true
  $: if (show && typeof document !== 'undefined') {
    setTimeout(() => {
      document.addEventListener('mousemove', handleGradientBarMouseMove);
      document.addEventListener('mouseup', handleGradientBarMouseUp);
    }, 0);
  }
  
  // Remove event listener when show becomes false
  $: if (!show && typeof document !== 'undefined') {
    document.removeEventListener('mousemove', handleGradientBarMouseMove);
    document.removeEventListener('mouseup', handleGradientBarMouseUp);
  }
  
  // Cleanup on component destroy
  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('mousemove', handleGradientBarMouseMove);
      document.removeEventListener('mouseup', handleGradientBarMouseUp);
    }
  });
  
  // Initialize gradient on mount
  onMount(() => {
    emitGradientChange();
  });
</script>

{#if show}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 z-[70] flex items-center justify-center p-4"
    onclick={handleBackdropClick}
  >
    <!-- Modal Content -->
    <div 
      bind:this={gradientEditorElement}
      class="gradient-editor-container bg-[#2A2A2A] border border-[#404040] rounded-lg shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="p-4">
        <div class="mb-4">
          <!-- Header with title and OK button -->
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-white">Gradient Editor</h3>
            <button
              class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
              onclick={() => show = false}
            >
              OK
            </button>
          </div>
          
          <!-- Gradient Type Selection -->
          <div class="mb-4">
            <label class="block text-xs text-gray-400 mb-2">Gradient Type</label>
            <div class="flex gap-2">
              <button
                class="flex-1 px-3 py-2 text-xs rounded transition-colors"
                class:bg-blue-600={gradientType === 'linear'}
                class:text-white={gradientType === 'linear'}
                class:bg-[#404040]={gradientType !== 'linear'}
                class:text-gray-300={gradientType !== 'linear'}
                onclick={() => handleTypeChange('linear')}
              >
                Linear
              </button>
              <button
                class="flex-1 px-3 py-2 text-xs rounded transition-colors"
                class:bg-blue-600={gradientType === 'radial'}
                class:text-white={gradientType === 'radial'}
                class:bg-[#404040]={gradientType !== 'radial'}
                class:text-gray-300={gradientType !== 'radial'}
                onclick={() => handleTypeChange('radial')}
              >
                Radial
              </button>
            </div>
          </div>
          
          <!-- Direction Controls (only for linear) -->
          {#if gradientType === 'linear'}
            <div class="mb-4">
              <label class="block text-xs text-gray-400 mb-2">Direction</label>
              
              <!-- Direction Presets -->
              <div class="grid grid-cols-4 gap-1 mb-3">
                {#each directionPresets as preset}
                  <button
                    class="w-8 h-8 text-sm rounded border transition-colors flex items-center justify-center"
                    class:border-blue-500={gradientDirection === preset.angle}
                    class:bg-blue-600={gradientDirection === preset.angle}
                    class:text-white={gradientDirection === preset.angle}
                    class:border-[#404040]={gradientDirection !== preset.angle}
                    class:text-gray-300={gradientDirection !== preset.angle}
                    title={preset.title}
                    onclick={() => handleDirectionChange(preset.angle)}
                  >
                    {preset.label}
                  </button>
                {/each}
              </div>
              
              <!-- Direction Slider -->
              <div class="relative">
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  bind:value={gradientDirection}
                  oninput={handleDirectionSlider}
                  class="w-full h-2 rounded appearance-none cursor-pointer bg-[#404040]"
                />
                <div class="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0°</span>
                  <span class="text-gray-300">{gradientDirection}°</span>
                  <span>360°</span>
                </div>
              </div>
            </div>
          {/if}
          
          <!-- Gradient Preview -->
          <div class="mb-4">
            <label class="block text-xs text-gray-400 mb-2">Preview</label>
            <div 
              class="w-full h-12 rounded border border-[#404040]"
              style="background: {generateGradientCSS()};"
            ></div>
          </div>
          
          <!-- Gradient Bar with Stops -->
          <div class="mb-4">
            <label class="block text-xs text-gray-400 mb-2">Color Stops</label>
            <div class="relative">
              <!-- Gradient Bar -->
              <div 
                bind:this={gradientBarElement}
                class="relative w-full h-6 rounded border border-[#404040] cursor-pointer"
                style="background: {generateGradientCSS()};"
                onmousedown={handleGradientBarMouseDown}
              >
                <!-- Color Stops -->
                {#each gradientStops as stop, index}
                  <div 
                    class="absolute top-0 w-4 h-6 border-2 rounded cursor-grab transform -translate-x-1/2"
                    class:border-white={index === activeStopIndex}
                    class:border-gray-500={index !== activeStopIndex}
                    style="left: {stop.position}%; background-color: {stop.color};"
                    onclick={(e) => { e.stopPropagation(); activeStopIndex = index; }}
                  >
                    <!-- Remove button for stops (only if more than 2 stops) -->
                    {#if gradientStops.length > 2}
                      <button
                        class="absolute -top-2 -right-1 w-3 h-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        onclick={(e) => { e.stopPropagation(); removeColorStop(index); }}
                      >
                        ×
                      </button>
                    {/if}
                  </div>
                {/each}
              </div>
              
              <!-- Add Stop Button -->
              {#if gradientStops.length < 5}
                <button
                  class="mt-2 w-full py-1 text-xs text-gray-400 border border-dashed border-gray-600 rounded hover:border-gray-400 hover:text-gray-300 transition-colors"
                  onclick={addColorStop}
                >
                  + Add Color Stop
                </button>
              {/if}
            </div>
          </div>
          
          <!-- Active Stop Configuration -->
          {#if activeStopIndex >= 0 && activeStopIndex < gradientStops.length}
            <div class="mb-4 p-3 bg-[#1A1A1A] rounded border border-[#404040]">
              <h4 class="text-xs font-medium text-gray-300 mb-3">Stop {activeStopIndex + 1} Configuration</h4>
              
              <!-- Position -->
              <div class="mb-3">
                <label class="block text-xs text-gray-400 mb-1">Position</label>
                <div class="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    bind:value={gradientStops[activeStopIndex].position}
                    oninput={(e) => handleStopPositionChange(activeStopIndex, parseInt(e.currentTarget.value))}
                    class="flex-1 h-2 rounded appearance-none cursor-pointer bg-[#404040]"
                  />
                  <span class="text-xs text-gray-300 w-8">{gradientStops[activeStopIndex].position}%</span>
                </div>
              </div>
              
              <!-- Color -->
              <div class="mb-3">
                <label class="block text-xs text-gray-400 mb-1">Color</label>
                <div class="flex items-center gap-2">
                  <button
                    class="w-8 h-8 rounded border-2 border-[#404040] cursor-pointer hover:border-gray-300 transition-colors"
                    style="background-color: {gradientStops[activeStopIndex].color};"
                    onclick={(e) => showStopColorPicker(e, activeStopIndex)}
                  ></button>
                  <input 
                    type="text" 
                    bind:value={gradientStops[activeStopIndex].color}
                    oninput={(e) => handleStopColorChange(activeStopIndex, e.currentTarget.value)}
                    class="flex-1 px-2 py-1 bg-[#404040] border border-[#555] rounded text-white text-xs focus:border-blue-500 focus:outline-none"
                    placeholder="#000000"
                  />
                </div>
              </div>
              
              <!-- Opacity -->
              <div>
                <label class="block text-xs text-gray-400 mb-1">Opacity</label>
                <div class="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    bind:value={gradientStops[activeStopIndex].opacity}
                    oninput={(e) => handleStopOpacityChange(activeStopIndex, parseInt(e.currentTarget.value))}
                    class="flex-1 h-2 rounded appearance-none cursor-pointer bg-[#404040]"
                  />
                  <span class="text-xs text-gray-300 w-8">{gradientStops[activeStopIndex].opacity}%</span>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Color Picker for Stops -->
{#if showColorPicker}
  <ColorPicker 
    bind:show={showColorPicker}
    selectedColor={gradientStops[activeStopIndex]?.color || '#000000'}
    opacity={gradientStops[activeStopIndex]?.opacity || 100}
    on:colorChange={handleColorPickerChange}
    on:opacityChange={handleOpacityPickerChange}
  />
{/if}

<style>
  /* Custom range slider styles */
  input[type="range"] {
    background: transparent;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: #ffffff;
    border: 2px solid #404040;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #ffffff;
    border: 2px solid #404040;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .gradient-editor-container {
    user-select: none;
  }
  
  /* Custom scrollbar for webkit browsers */
  .gradient-editor-container::-webkit-scrollbar {
    width: 6px;
  }
  
  .gradient-editor-container::-webkit-scrollbar-track {
    background: #1A1A1A;
    border-radius: 3px;
  }
  
  .gradient-editor-container::-webkit-scrollbar-thumb {
    background: #404040;
    border-radius: 3px;
  }
  
  .gradient-editor-container::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>