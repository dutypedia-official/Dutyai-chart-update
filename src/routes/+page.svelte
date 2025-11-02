<script lang="ts">
  import Chart from '$lib/kline/chart.svelte';
  import { writable } from 'svelte/store';
  import { persisted } from 'svelte-persisted-store';
  import { ChartCtx, ChartSave } from '$lib/kline/chart';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import type { SymbolInfo } from '$lib/kline/types';
  
  console.log('📄 +page.svelte loaded');
  
  const ctx = writable<ChartCtx>(new ChartCtx());
  const save = persisted('chart', new ChartSave());

  // Handle URL parameter for symbol selection
  onMount(() => {
    const symbolParam = $page.url.searchParams.get('symbol');
    if (symbolParam) {
      console.log('🔗 Symbol parameter found in URL:', symbolParam);
      
      let attempts = 0;
      const maxAttempts = 50; // Maximum 5 seconds (50 * 100ms)
      
      // Wait for symbols to be loaded, then find and set the symbol
      const checkAndSetSymbol = () => {
        attempts++;
        const currentSave = $save;
        
        if (currentSave.allSymbols && currentSave.allSymbols.length > 0) {
          // Find symbol by ticker (case-insensitive)
          const foundSymbol = currentSave.allSymbols.find(
            (s: SymbolInfo) => s.ticker.toLowerCase() === symbolParam.toLowerCase()
          );
          
          if (foundSymbol) {
            console.log('✅ Found symbol from URL parameter:', foundSymbol);
            save.update(s => {
              s.symbol = foundSymbol;
              return s;
            });
          } else {
            console.warn('⚠️ Symbol not found in available symbols:', symbolParam);
            console.log('📊 Available symbols:', currentSave.allSymbols.map(s => s.ticker).join(', '));
            
            // Show user-friendly message about available symbols
            const availableSymbols = currentSave.allSymbols.slice(0, 10).map(s => s.ticker).join(', ');
            console.log(`💡 Try one of these symbols: ${availableSymbols}${currentSave.allSymbols.length > 10 ? '...' : ''}`);
          }
        } else if (attempts < maxAttempts) {
          // Symbols not loaded yet, try again in 100ms
          console.log(`⏳ Waiting for symbols to load... (attempt ${attempts}/${maxAttempts})`);
          setTimeout(checkAndSetSymbol, 100);
        } else {
          console.error('❌ Timeout waiting for symbols to load. Symbol parameter will be ignored.');
        }
      };
      
      checkAndSetSymbol();
    }
  });
</script>

<Chart {ctx} {save}></Chart>