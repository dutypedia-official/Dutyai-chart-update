<script lang="ts">
  import Chart from '$lib/kline/chart.svelte';
  import { writable } from 'svelte/store';
  import { persisted } from 'svelte-persisted-store';
  import { ChartCtx, ChartSave } from '$lib/kline/chart';
  
  console.log('📄 +page.svelte loaded');
  
  const ctx = writable<ChartCtx>(new ChartCtx());
  const save = persisted('chart', new ChartSave());
</script>

<Chart {ctx} {save}></Chart>