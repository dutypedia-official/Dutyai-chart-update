<script lang="ts">
  import Chart from '$lib/kline/chart.svelte';
  import { writable, get } from 'svelte/store';
  import { persisted } from 'svelte-persisted-store';
  import { ChartCtx, ChartSave } from '$lib/kline/chart';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import type { SymbolInfo } from '$lib/kline/types';
  import { browser } from '$app/environment';
  
  console.log('📄 +page.svelte loaded');
  
  const ctx = writable<ChartCtx>(new ChartCtx());
  const save = persisted('chart', new ChartSave());
  let mounted = false;
  let currentTheme: 'dark' | 'light' = 'light';

  function applyTheme(theme: 'dark' | 'light') {
    if (!browser) return;
    currentTheme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    // Notify any listeners (e.g., chart internals/toolbars) that theme changed
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    console.log('🖌️ Applied theme to document:', theme);
  }

  // Handle URL parameters for symbol selection and theme
  onMount(() => {
    // Determine initial theme: URL param > saved > system preference
    const urlTheme = $page.url.searchParams.get('theme');
    const savedTheme = get(save)?.theme as 'dark' | 'light' | undefined;
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme: 'dark' | 'light' =
      (urlTheme === 'dark' || urlTheme === 'light')
        ? urlTheme
        : (savedTheme === 'dark' || savedTheme === 'light')
          ? savedTheme
          : (systemDark ? 'dark' : 'light');

    // Persist and apply
    save.update(s => {
      s.theme = initialTheme;
      return s;
    });
    applyTheme(initialTheme);

    // React to later theme changes (e.g., menu toggle) and keep DOM in sync
    const unsubscribe = save.subscribe(s => {
      const next = (s.theme === 'dark' || s.theme === 'light') ? s.theme : (systemDark ? 'dark' : 'light');
      if (next !== currentTheme) {
        applyTheme(next);
      }
    });
    
    // Handle symbol parameter
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
    
    // Handle userId parameter
    const userIdParam = $page.url.searchParams.get('userId');
    if (userIdParam) {
      console.log('👤 User ID parameter found in URL:', userIdParam);
      
      try {
        // Save userId to localStorage
        localStorage.setItem('userId', userIdParam);
        console.log('✅ User ID saved to localStorage:', userIdParam);
        
        // Remove userId parameter from URL without reloading the page
        const url = new URL(window.location.href);
        url.searchParams.delete('userId');
        window.history.replaceState({}, '', url.toString());
        console.log('🔗 User ID parameter removed from URL');
        
      } catch (error) {
        console.error('❌ Failed to save user ID to localStorage:', error);
      }
    }

    mounted = true;

    return () => {
      unsubscribe();
    };
  });
</script>

{#if mounted}
  <Chart {ctx} {save}></Chart>
{/if}