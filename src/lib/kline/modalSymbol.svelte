<script lang="ts">
  import Modal from "./modal.svelte"
  import { getContext } from "svelte";
  import * as m from '$lib/paraglide/messages.js'
	import { ChartSave, ChartCtx } from "./chart";
  import { writable, type Writable } from "svelte/store";
	import type { SymbolInfo } from "./types";

  let { show = $bindable() } = $props();

  const title = m.symbol_search();
  let keyword = writable("");
  let showList = $state<SymbolInfo[]>([]);
  let selectedIndex = $state(-1);

  const ctx = getContext('ctx') as Writable<ChartCtx>;
  const save = getContext('save') as Writable<ChartSave>;
  
  // Log when modal is shown
  $effect(() => {
    if (show) {
      console.log('🔍 Modal opened! Available symbols:', $save.allSymbols.length);
      console.log('🔍 Current symbol:', $save.symbol);
      // Initialize showList when modal opens
      showList = $save.allSymbols;
    }
  });
  
  // Global test function for debugging
  if (typeof window !== 'undefined') {
    (window as any).testSymbolChange = () => {
      if ($save.allSymbols.length > 0) {
        const testSymbol = $save.allSymbols[1]; // Pick second symbol
        console.log('🧪 Testing symbol change to:', testSymbol);
        selectSymbol(testSymbol);
      } else {
        console.log('🧪 No symbols available for testing');
      }
    };
  }
  
  keyword.subscribe(value => {
    console.log('🔍 Modal keyword changed:', value);
    console.log('🔍 Available allSymbols:', $save.allSymbols);
    console.log('🔍 allSymbols length:', $save.allSymbols.length);
    if (!value) {
      showList = $save.allSymbols;
      console.log('🔍 Showing all symbols:', showList);
      return;
    }
    
    const searchTerm = $keyword.toLowerCase();
    showList = $save.allSymbols.filter(symbol => 
      symbol.ticker.toLowerCase().includes(searchTerm) ||
      symbol.shortName?.toLowerCase().includes(searchTerm) ||
      symbol.exchange.toLowerCase().includes(searchTerm)
    );
    console.log('🔍 Filtered symbols:', showList);
    selectedIndex = -1; // Reset selection when search changes
  });

  function selectSymbol(symbol: SymbolInfo) {
    console.log('🎯 Symbol selected:', symbol);
    console.log('🎯 Previous symbol:', $save.symbol);
    $save.symbol = symbol;
    console.log('🎯 New symbol set:', $save.symbol);
    show = false; // Close modal after selection
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!show || showList.length === 0) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, showList.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < showList.length) {
          selectSymbol(showList[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        show = false;
        break;
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div onkeydown={handleKeydown}>
  <Modal {title} width={600} bind:show={show} buttons={[]}>
    <div class="p-4">
      
      <!-- Simple Search Bar -->
      <div class="mb-4">
        <input
          type="text"
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          placeholder="Search"
          bind:value={$keyword}
          autofocus
        />
      </div>



      <!-- Symbol List -->
      <div class="max-h-80 overflow-y-auto">
        {#if $ctx.loadingPairs}
          <div class="flex justify-center py-8">
            <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        {:else if showList.length === 0}
          <div class="text-center py-8 text-gray-500 dark:text-gray-400">
            No symbols found
          </div>
        {:else}
          <div class="space-y-1">
            {#each showList as symbol, i}
              <div
                class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded {selectedIndex === i ? 'bg-blue-50 dark:bg-blue-900' : ''}"
                onclick={() => selectSymbol(symbol)}
              >
                <!-- Logo -->
                <div class="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                  {#if symbol.logo}
                    <img
                       src={symbol.logo}
                       alt={symbol.ticker}
                       class="w-6 h-6 rounded-full object-cover"
                       onerror={(e) => {e.target.style.display='none'; e.target.nextElementSibling.style.display='flex';}}
                     />
                    <span class="text-xs font-semibold text-gray-600 dark:text-gray-300 hidden">
                      {symbol.ticker.charAt(0)}
                    </span>
                  {:else}
                    <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {symbol.ticker.charAt(0)}
                    </span>
                  {/if}
                </div>

                <!-- Symbol Info -->
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-gray-900 dark:text-white">{symbol.ticker}</div>
                  {#if symbol.shortName && symbol.shortName !== symbol.ticker}
                    <div class="text-sm text-gray-600 dark:text-gray-300 truncate">{symbol.shortName}</div>
                  {/if}
                </div>

                <!-- Exchange -->
                <div class="text-right flex-shrink-0">
                  <div class="text-xs font-semibold text-gray-700 dark:text-gray-300">{symbol.exchange}</div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
       <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 text-center">
         <p class="text-xs text-gray-500 dark:text-gray-400">
           Powered by Duty AI
         </p>
       </div>
    </div>
  </Modal>
</div>