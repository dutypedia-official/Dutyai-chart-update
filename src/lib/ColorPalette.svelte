<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  let { show = $bindable(), selectedColor = '#000000', position = { x: 0, y: 0 }, opacity = 100 } = $props();
  
  const dispatch = createEventDispatcher();
  
  function parseColorToRgb(color: string): { r: number; g: number; b: number } | null {
    const c = (color || '').trim();
    if (!c) return null;
    // Hex #RRGGBB
    if (/^#?[0-9A-Fa-f]{6}$/.test(c)) {
      const h = c.startsWith('#') ? c.slice(1) : c;
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16)
      };
    }
    // rgb() or rgba()
    const m = c.match(/^rgba?\(([^)]+)\)$/i);
    if (m) {
      const parts = m[1].split(',').map(v => parseFloat(v.trim()));
      if (parts.length >= 3 && parts.every(n => !isNaN(n))) {
        return { r: Math.round(parts[0]), g: Math.round(parts[1]), b: Math.round(parts[2]) };
      }
    }
    return null;
  }

  function buildRgba(color: string, opacityPercent: number): string | null {
    const rgb = parseColorToRgb(color);
    if (!rgb) return null;
    const a = Math.max(0, Math.min(100, opacityPercent)) / 100;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
  }

  // Color palette with 8 rows x 10 columns
  const colorPalette = [
    // Row 1: Grayscale
    ['#000000', '#1C1C1C', '#383838', '#545454', '#707070', '#8C8C8C', '#A8A8A8', '#C4C4C4', '#E0E0E0', '#FFFFFF'],
    // Row 2: Reds
    ['#FF0000', '#FF4D4F', '#FF7875', '#FFA39E', '#FFCCC7', '#FFF1F0', '#FFEDED', '#FFF5F5', '#FFFAFA', '#FFFFFF'],
    // Row 3: Oranges
    ['#FF8C00', '#FA541C', '#FF7A45', '#FF9C6E', '#FFBB96', '#FFD8BF', '#FFE7BA', '#FFF2E8', '#FFF7E6', '#FFFBE6'],
    // Row 4: Yellows
    ['#FFD700', '#FADB14', '#FFEC3D', '#FFF566', '#FFFF8F', '#FFFFB8', '#FFFBE6', '#FFFBF0', '#FFFBF0', '#FFFBF0'],
    // Row 5: Greens
    ['#32CD32', '#52C41A', '#73D13D', '#95DE64', '#B7EB8F', '#D9F7BE', '#F6FFED', '#F6FFED', '#F6FFED', '#F6FFED'],
    // Row 6: Cyans
    ['#00CED1', '#13C2C2', '#36CFC9', '#5CDBD3', '#87E8DE', '#B5F5EC', '#E6FFFB', '#E6FFFB', '#E6FFFB', '#E6FFFB'],
    // Row 7: Blues
    ['#1E90FF', '#1890FF', '#40A9FF', '#69C0FF', '#91D5FF', '#BAE7FF', '#E6F7FF', '#E6F7FF', '#E6F7FF', '#E6F7FF'],
    // Row 8: Purples
    ['#9370DB', '#722ED1', '#9254DE', '#B37FEB', '#D3ADF7', '#EFDBFF', '#F9F0FF', '#F9F0FF', '#F9F0FF', '#F9F0FF']
  ];
  
  // Quick color shortcuts
  const quickColors = [
    '#FF4D4F', // Red
    '#1890FF', // Blue
    '#52C41A', // Green
    '#FA8C16', // Orange
    '#722ED1', // Purple
    '#000000'  // Black (custom)
  ];
  
  function selectColor(color: string) {
    selectedColor = color;
    const rgba = buildRgba(color, opacity);
    dispatch('colorChange', { color, opacity, rgba });
    show = false;
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      show = false;
    }
  }

  function handleOpacityInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value);
    opacity = isNaN(value) ? 100 : Math.max(0, Math.min(100, value));
    const rgba = buildRgba(selectedColor, opacity);
    dispatch('opacityChange', { opacity, rgba, color: selectedColor });
    // Also emit combined color for real-time preview consumers
    dispatch('colorChange', { color: selectedColor, opacity, rgba });
  }
</script>

{#if show}
  <div 
    class="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
    onclick={handleBackdropClick}
  >
    <div 
      class="bg-base-100 rounded-lg shadow-xl p-4 w-full max-w-md max-h-[80vh] overflow-y-auto"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-base-content">Color Picker</h3>
        <button 
          class="btn btn-sm btn-primary"
          onclick={() => show = false}
        >
          OK
        </button>
      </div>
      
      <!-- Color Grid -->
      <div class="space-y-1 mb-4 max-h-60 overflow-y-auto">
        {#each colorPalette as row, rowIndex}
          <div class="flex gap-1 flex-wrap">
            {#each row as color, colIndex}
              <button
                class="w-6 h-6 rounded border-2 transition-all hover:scale-110 {selectedColor === color ? 'border-white shadow-lg' : 'border-base-300'}"
                style="background-color: {color}"
                onclick={() => selectColor(color)}
                title={color}
              ></button>
            {/each}
          </div>
        {/each}
      </div>
      
      <!-- Opacity Slider -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-base-content/70">Opacity</div>
          <div class="text-sm text-base-content/80">{opacity}%</div>
        </div>
        <div class="relative">
          <!-- Checkerboard background to visualize transparency -->
          <div class="absolute inset-0 h-2 rounded opacity-30"
               style="background-image: repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 8px 8px;"></div>
          <input
            type="range"
            min="0"
            max="100"
            bind:value={opacity}
            oninput={handleOpacityInput}
            class="relative w-full h-2 rounded appearance-none cursor-pointer"
            style="background: linear-gradient(to right, rgba(0,0,0,0), {buildRgba(selectedColor, 100) || selectedColor});"
          />
          <!-- Visual thumb (for consistent style across browsers) -->
          <div
            class="absolute top-1/2 w-4 h-4 bg-base-100 border-2 border-base-content rounded-full transform -translate-y-1/2 pointer-events-none shadow-sm"
            style="left: calc({opacity}% - 8px);"
          ></div>
        </div>
      </div>

      <!-- Quick Colors -->
      <div class="mb-4">
        <div class="text-sm text-base-content/70 mb-2">Quick Colors</div>
        <div class="flex gap-2 flex-wrap">
          {#each quickColors as color, index}
            <button
              class="w-8 h-8 rounded border-2 transition-all hover:scale-110 {selectedColor === color ? 'border-white shadow-lg' : 'border-base-300'}"
              style="background-color: {color}"
              onclick={() => selectColor(color)}
              title={color}
            ></button>
          {/each}
        </div>
      </div>
      
      <!-- Custom Color Input -->
      <div class="mt-3 pt-3 border-t border-base-300">
        <div class="text-xs text-base-content/60 mb-2">Custom Color</div>
        <div class="flex items-center gap-2 flex-wrap">
          <input
            type="color"
            class="w-8 h-8 rounded border border-base-300 cursor-pointer flex-shrink-0"
            value={selectedColor}
            onchange={(e) => {
              const target = e.target as HTMLInputElement;
              if (target) selectColor(target.value);
            }}
          />
          <input
            type="text"
            class="input input-xs flex-1 min-w-0 text-xs"
            value={selectedColor}
            onchange={(e) => {
              const target = e.target as HTMLInputElement;
              if (target) selectColor(target.value);
            }}
            placeholder="#000000"
          />
        </div>
      </div>
    </div>
  </div>
{/if}
