<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let selectedColor = '#1677FF';
  export let show = false;
  export let opacity = 100;
  
  let colorPickerElement: HTMLElement;
  let gradientElement: HTMLElement;
  let isDragging = false;
  
  // State for color shortcuts (maximum 5 colors)
  let colorShortcuts: string[] = ['#FF4D4F', '#1890FF', '#52C41A', '#FA8C16', '#722ED1'];
  let showCustomColorPicker = false;
  let customColorPickerPosition = { x: 0, y: 0 };
  
  // Custom color picker state
  let customHexColor = '#000000';
  let hue = 0;
  let saturation = 100;
  let lightness = 50;
  
  // Enhanced color palette - organized in a more comprehensive grid
  const colorPalette = [
    ['#000000', '#1C1C1C', '#383838', '#545454', '#707070', '#8C8C8C', '#A8A8A8', '#C4C4C4', '#E0E0E0', '#FFFFFF'],
    ['#FF0000', '#FF4D4F', '#FF7875', '#FFA39E', '#FFCCC7', '#FFF1F0', '#FFEDED', '#FFF5F5', '#FFFAFA', '#FFFFFF'],
    ['#FF8C00', '#FA541C', '#FF7A45', '#FF9C6E', '#FFBB96', '#FFD8BF', '#FFE7BA', '#FFF2E8', '#FFF7E6', '#FFFBE6'],
    ['#FFD700', '#FADB14', '#FFEC3D', '#FFF566', '#FFFF8F', '#FFFFB8', '#FFFBE6', '#FFFBF0', '#FFFBF0', '#FFFBF0'],
    ['#32CD32', '#52C41A', '#73D13D', '#95DE64', '#B7EB8F', '#D9F7BE', '#F6FFED', '#F6FFED', '#F6FFED', '#F6FFED'],
    ['#00CED1', '#13C2C2', '#36CFC9', '#5CDBD3', '#87E8DE', '#B5F5EC', '#E6FFFB', '#E6FFFB', '#E6FFFB', '#E6FFFB'],
    ['#1E90FF', '#1890FF', '#40A9FF', '#69C0FF', '#91D5FF', '#BAE7FF', '#E6F7FF', '#E6F7FF', '#E6F7FF', '#E6F7FF'],
    ['#9370DB', '#722ED1', '#9254DE', '#B37FEB', '#D3ADF7', '#EFDBFF', '#F9F0FF', '#F9F0FF', '#F9F0FF', '#F9F0FF']
  ];
  
  // Handle color selection from palette
  function selectColor(color: string) {
    selectedColor = color;
    // Dispatch immediately for real-time updates
    dispatch('colorChange', color);
    // Don't close the picker automatically to allow for more selections
  }
  
  // Handle opacity change
  function handleOpacityChange(event: Event) {
    const target = event.target as HTMLInputElement;
    opacity = parseInt(target.value);
    dispatch('opacityChange', opacity);
  }
  
  // Handle Add Color button click
  function handleAddColorClick(event: MouseEvent) {
    event.stopPropagation();
    showCustomColorPicker = true;
  }
  
  // Add color to shortcuts (replace 5th color if full)
  function addColorToShortcuts(color: string) {
    if (colorShortcuts.length >= 5) {
      // Replace the last color (5th position)
      colorShortcuts = [...colorShortcuts.slice(0, 4), color];
    } else {
      colorShortcuts = [...colorShortcuts, color];
    }
    showCustomColorPicker = false;
  }
  
  // Convert HSL to hex
  function hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
  
  // Convert hex to HSL
  function hexToHsl(hex: string): { h: number, s: number, l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  }
  
  function updateCustomColorFromHSL() {
    customHexColor = hslToHex(hue, saturation, lightness);
    selectedColor = customHexColor;
    // Dispatch immediately for real-time updates
    dispatch('colorChange', customHexColor);
  }
  
  function updateCustomColorFromHex() {
    if (/^#[0-9A-F]{6}$/i.test(customHexColor)) {
      const hsl = hexToHsl(customHexColor);
      hue = hsl.h;
      saturation = hsl.s;
      lightness = hsl.l;
      selectedColor = customHexColor;
      // Dispatch immediately for real-time updates
      dispatch('colorChange', customHexColor);
    }
  }
  
  function addCustomColor() {
    // Validate hex color with simple regex
    if (customHexColor && /^#[0-9A-Fa-f]{6}$/.test(customHexColor)) {
      selectedColor = customHexColor;
      dispatch('colorChange', customHexColor);
      
      // Add to shortcuts if not already present
      if (!colorShortcuts.includes(customHexColor)) {
        colorShortcuts = [...colorShortcuts, customHexColor];
      }
      
      showCustomColorPicker = false;
    }
  }
  
  // Handle gradient area mouse events for drag functionality
  function handleGradientMouseDown(event: MouseEvent) {
    isDragging = true;
    updateColorFromPosition(event);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleGradientMouseMove);
    document.addEventListener('mouseup', handleGradientMouseUp);
    
    // Prevent text selection during drag
    event.preventDefault();
  }
  
  function handleGradientMouseMove(event: MouseEvent) {
    if (isDragging && gradientElement) {
      updateColorFromPosition(event);
    }
  }
  
  function handleGradientMouseUp() {
    isDragging = false;
    
    // Remove global mouse event listeners
    document.removeEventListener('mousemove', handleGradientMouseMove);
    document.removeEventListener('mouseup', handleGradientMouseUp);
  }
  
  function updateColorFromPosition(event: MouseEvent) {
    if (!gradientElement) return;
    
    const rect = gradientElement.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    
    saturation = x * 100;
    lightness = (1 - y) * 100;
    updateCustomColorFromHSL();
  }
  
  // Select color from add color picker
  function selectColorFromAddPicker(color: string) {
    addColorToShortcuts(color);
  }
  
  // Close color picker when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (colorPickerElement && !colorPickerElement.contains(target)) {
      show = false;
      showCustomColorPicker = false;
      dispatch('close');
    }
  }
  
  // Add event listener when show becomes true
  $: if (show && typeof document !== 'undefined') {
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 0);
  }
  
  // Remove event listener when show becomes false
  $: if (!show && typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside, true);
  }
  
  // Cleanup on component destroy
  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', handleClickOutside, true);
    }
  });
</script>

{#if show}
  <div 
    bind:this={colorPickerElement}
    class="color-picker-container fixed z-[80] bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#404040] rounded-lg shadow-xl p-3 transition-all duration-200"
    class:w-64={!showCustomColorPicker}
    class:w-80={showCustomColorPicker}
    style="
      left: 50%; 
      top: 50%; 
      transform: translate(-50%, -50%); 
      max-height: 90vh; 
      max-width: 90vw;
      overflow-y: auto;
    "
    onclick={(e) => e.stopPropagation()}
  >
    {#if !showCustomColorPicker}
      <!-- Normal Color Picker View -->
      <!-- Header with OK button -->
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm text-gray-900 dark:text-gray-300 font-medium">Color Picker</span>
        <button
          class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
          onclick={() => show = false}
        >
          OK
        </button>
      </div>
      
      <!-- Color palette grid -->
      <div class="mb-3">
        {#each colorPalette as row}
          <div class="flex gap-0.5 mb-0.5">
            {#each row as color}
              <button
                class="w-4 h-4 border hover:scale-110 transition-transform cursor-pointer
                       {selectedColor === color ? 'border-white dark:border-white border-2' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400'}"
                style="background-color: {color};"
                onclick={() => selectColor(color)}
              ></button>
            {/each}
          </div>
        {/each}
      </div>
      
      <!-- Color shortcuts -->
      <div class="mb-3">
        <div class="flex items-center gap-2 mb-2">
          {#each colorShortcuts as shortcutColor}
            <button
              class="w-5 h-5 rounded border hover:scale-110 transition-transform cursor-pointer
                     {selectedColor === shortcutColor ? 'border-white dark:border-white border-2' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400'}"
              style="background-color: {shortcutColor};"
              onclick={() => selectColor(shortcutColor)}
            ></button>
          {/each}
          
          <!-- Add color button -->
          <button
            class="w-5 h-5 rounded border-2 border-dashed border-gray-400 dark:border-gray-500 hover:border-gray-500 dark:hover:border-gray-300 
                   flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            onclick={handleAddColorClick}
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M12 4v16m8-8H4"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Opacity slider -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-gray-900 dark:text-gray-300">Opacity</span>
          <span class="text-xs text-gray-900 dark:text-gray-300">{opacity}%</span>
        </div>
        <div class="relative">
          <!-- Checkered background for transparency preview -->
          <div class="absolute inset-0 h-2 rounded opacity-30"
               style="background-image: repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 6px 6px;"></div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            bind:value={opacity}
            oninput={handleOpacityChange}
            class="relative w-full h-2 rounded appearance-none cursor-pointer opacity-slider"
            style="background: linear-gradient(to right, transparent, {selectedColor});"
          />
          <!-- Slider handle -->
          <div 
            class="absolute top-1/2 w-4 h-4 bg-white border-2 border-gray-800 rounded-full transform -translate-y-1/2 pointer-events-none shadow-sm"
            style="left: calc({opacity}% - 8px);"
          ></div>
        </div>
      </div>
    {:else}
      <!-- Custom Color Picker View -->
      <div class="mb-3 flex items-center justify-between">
        <span class="text-sm text-gray-900 dark:text-gray-300 font-medium">Custom Color Picker</span>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            onclick={() => show = false}
          >
            OK
          </button>
          <button 
            onclick={() => showCustomColorPicker = false}
            class="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Hex Input -->
      <div class="mb-3">
        <label class="block text-xs text-gray-600 dark:text-gray-400 mb-2">Hex Color</label>
        <input 
          type="text" 
          bind:value={customHexColor}
          oninput={updateCustomColorFromHex}
          class="w-full px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-300 dark:border-[#404040] rounded text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
          placeholder="#000000"
        />
      </div>
      
      <!-- Color Preview -->
      <div class="mb-3">
        <div class="w-full h-6 rounded border border-gray-300 dark:border-[#404040]" style="background-color: {customHexColor};"></div>
      </div>
      
      <!-- Gradient Color Box -->
      <div class="mb-3">
        <label class="block text-xs text-gray-600 dark:text-gray-400 mb-2">Color Picker</label>
        <div 
          bind:this={gradientElement}
          class="relative w-full h-24 rounded border border-gray-300 dark:border-[#404040] cursor-crosshair"
          style="background: linear-gradient(to bottom, transparent, black), linear-gradient(to right, white, hsl({hue}, 100%, 50%));"
          onmousedown={handleGradientMouseDown}
        >
          <!-- Saturation/Lightness indicator -->
          <div 
            class="absolute w-3 h-3 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style="left: {saturation}%; top: {100 - lightness}%;"
          ></div>
        </div>
      </div>
      
      <!-- Hue Slider -->
      <div class="mb-3">
        <label class="block text-xs text-gray-600 dark:text-gray-400 mb-2">Hue</label>
        <div class="relative">
          <input 
            type="range" 
            min="0" 
            max="360" 
            bind:value={hue}
            oninput={updateCustomColorFromHSL}
            class="w-full h-4 rounded appearance-none cursor-pointer"
            style="background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);"
          />
          <!-- Hue handle -->
          <div 
            class="absolute top-1/2 w-4 h-4 bg-white border-2 border-gray-800 rounded-full transform -translate-y-1/2 pointer-events-none shadow-sm"
            style="left: calc({hue / 360 * 100}% - 8px);"
          ></div>
        </div>
      </div>
      
      <!-- Add Button -->
      <button 
        onclick={addCustomColor}
        class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
      >
        Add Color
      </button>
    {/if}
  </div>
{/if}



<style>
  .opacity-slider {
    background: transparent;
  }
  
  .opacity-slider::-webkit-slider-thumb {
    appearance: none;
    width: 0;
    height: 0;
    background: transparent;
    border: none;
  }
  
  .opacity-slider::-moz-range-thumb {
    width: 0;
    height: 0;
    background: transparent;
    border: none;
    border-radius: 0;
  }
</style>