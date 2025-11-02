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
  
  // Intelligent search function with relevance scoring
  function intelligentSearch(symbols: SymbolInfo[], searchTerm: string): SymbolInfo[] {
    if (!searchTerm || !searchTerm.trim()) {
      return symbols;
    }

    const term = searchTerm.trim().toLowerCase();
    const terms = term.split(/\s+/); // Support multiple words
    
    // Score each symbol based on relevance
    const scoredSymbols = symbols.map(symbol => {
      const ticker = symbol.ticker.toLowerCase();
      const name = (symbol.shortName || '').toLowerCase();
      const exchange = (symbol.exchange || '').toLowerCase();
      
      let score = 0;
      
      // For each search term
      terms.forEach(searchWord => {
        // Exact match (highest priority)
        if (ticker === searchWord) {
          score += 1000;
        }
        
        // Ticker starts with search term (very high priority)
        else if (ticker.startsWith(searchWord)) {
          score += 500;
        }
        
        // Ticker contains search term (high priority)
        else if (ticker.includes(searchWord)) {
          score += 300;
        }
        
        // Name starts with search term (good priority)
        else if (name.startsWith(searchWord)) {
          score += 200;
        }
        
        // Name contains search term (medium priority)
        else if (name.includes(searchWord)) {
          score += 100;
        }
        
        // Exchange matches (low priority)
        else if (exchange.includes(searchWord)) {
          score += 50;
        }
        
        // Fuzzy matching - check if characters appear in order
        else if (fuzzyMatch(ticker, searchWord)) {
          score += 30;
        }
        
        // Fuzzy matching in name
        else if (fuzzyMatch(name, searchWord)) {
          score += 20;
        }
      });
      
      // Bonus points for shorter ticker (more specific)
      if (score > 0 && ticker.length <= 5) {
        score += 10;
      }
      
      return { symbol, score };
    });
    
    // Filter out non-matching symbols and sort by score
    return scoredSymbols
      .filter(item => item.score > 0)
      .sort((a, b) => {
        // Sort by score (descending)
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // If same score, sort alphabetically by ticker
        return a.symbol.ticker.localeCompare(b.symbol.ticker);
      })
      .map(item => item.symbol);
  }
  
  // Fuzzy matching - checks if characters appear in order
  function fuzzyMatch(text: string, pattern: string): boolean {
    let patternIdx = 0;
    for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
      if (text[i] === pattern[patternIdx]) {
        patternIdx++;
      }
    }
    return patternIdx === pattern.length;
  }

  keyword.subscribe(value => {
    console.log('🔍 Modal keyword changed:', value);
    console.log('🔍 Available allSymbols:', $save.allSymbols);
    console.log('🔍 allSymbols length:', $save.allSymbols.length);
    
    if (!value || !value.trim()) {
      showList = $save.allSymbols;
      console.log('🔍 Showing all symbols:', showList);
      selectedIndex = -1;
      return;
    }
    
    // Use intelligent search
    showList = intelligentSearch($save.allSymbols, value);
    console.log('🔍 Filtered symbols with intelligent search:', showList);
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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div onkeydown={handleKeydown}>
  <Modal {title} width={650} maxHeight="85vh" bind:show={show} theme={$save.theme} buttons={[]}>
    <div class="flex flex-col gap-6">
      
      <!-- Search Bar -->
      <div class="relative">
        <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-base-content/50 pointer-events-none">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <input
          type="text"
          class="w-full pl-12 pr-4 py-3 text-sm bg-base-100 border border-base-300/50 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 placeholder:text-base-content/50"
          placeholder="Search symbols..."
          bind:value={$keyword}
          autofocus
        />
      </div>

      <!-- Symbol List -->
      <div class="relative rounded-lg overflow-hidden bg-base-100 border border-base-300/30">
        <div class="h-96 overflow-y-auto luxury-scrollbar">
          {#if $ctx.loadingPairs}
            <div class="flex justify-center py-16">
              <div class="relative">
                <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <div class="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-primary/60 rounded-full animate-spin" style="animation-delay: -0.15s;"></div>
              </div>
            </div>
          {:else if showList.length === 0}
            <div class="flex flex-col items-center justify-center py-16 text-center">
              <div class="w-16 h-16 rounded-full bg-base-200/50 flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <p class="text-lg font-semibold text-base-content/60 mb-2">No symbols found</p>
              <p class="text-sm text-base-content/40">Try a different search term</p>
            </div>
          {:else}
            <div class="divide-y divide-base-300/20">
              {#each showList as symbol, i}
                <div
                  class="group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200
                         {selectedIndex === i 
                           ? 'bg-primary/10 text-primary border-l-2 border-primary' 
                           : 'hover:bg-base-200/50 text-base-content'}"
                  onclick={() => selectSymbol(symbol)}
                >
                  <!-- Symbol Logo Container -->
                  <div class="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-base-200/50">
                    <img
                       src={`https://s3-api.bayah.app/cdn/symbol/logo/${symbol.ticker}.svg`}
                       alt={symbol.ticker}
                       class="w-full h-full object-cover"
                       onerror={(e) => {
                         const target = e.target as HTMLImageElement;
                         if (target) {
                           target.style.display='none';
                           const sibling = target.nextElementSibling as HTMLElement;
                           if (sibling) {
                             sibling.style.display='flex';
                           }
                         }
                       }}
                     />
                    <div class="absolute inset-0 bg-base-200 flex items-center justify-center hidden">
                      <span class="text-xs font-medium text-base-content/60">
                        {symbol.ticker.charAt(0)}
                      </span>
                    </div>
                  </div>

                  <!-- Symbol Information -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <h3 class="font-medium text-base">{symbol.ticker}</h3>
                      <span class="text-xs text-base-content/50">
                        {symbol.exchange}
                      </span>
                    </div>
                    {#if symbol.shortName && symbol.shortName !== symbol.ticker}
                      <p class="text-sm text-base-content/60 truncate mt-0.5">{symbol.shortName}</p>
                    {/if}
                  </div>

                  <!-- Selection Indicator -->
                  {#if selectedIndex === i}
                    <div class="flex-shrink-0">
                      <svg class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Luxury Premium Footer -->
      <div class="flex justify-center items-center py-2 mt-1">
        <div class="group relative cursor-pointer">
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out blur-xl"></div>
          <div class="relative flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-base-100/80 to-base-200/60 backdrop-blur-sm border border-base-300/30 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-500 ease-out">
            <div class="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-secondary animate-pulse"></div>
            <span class="text-sm font-medium text-base-content/70 group-hover:text-primary transition-colors duration-300">
              Powered by
            </span>
            <span class="text-sm font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent group-hover:from-secondary group-hover:to-primary transition-all duration-500">
              Duty AI
            </span>
            <div class="w-2 h-2 rounded-full bg-gradient-to-r from-secondary to-primary animate-pulse" style="animation-delay: 0.5s;"></div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</div>

<style>
  /* Premium Luxury Scrollbar */
  .luxury-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .luxury-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .luxury-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(99, 102, 241, 0.3), rgba(99, 102, 241, 0.6));
    border-radius: 3px;
    transition: all 0.3s ease;
  }
  
  .luxury-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(99, 102, 241, 0.5), rgba(99, 102, 241, 0.8));
    width: 8px;
  }
  
  /* Mobile responsive enhancements */
  @media (max-width: 640px) {
    .luxury-scrollbar {
      height: 300px !important;
    }
  }
</style>