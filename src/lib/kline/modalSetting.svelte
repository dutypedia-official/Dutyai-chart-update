<script lang="ts">
  import Modal from "./modal.svelte"
  import ModalChartSetting from "./modalChartSetting.svelte"
  import { getContext } from "svelte";
  import * as m from '$lib/paraglide/messages.js'
  import type { Chart, Nullable } from 'klinecharts';
  import { ChartCtx, ChartSave } from "./chart";
  import type { Writable } from "svelte/store";
	import _ from "lodash";
  import { getThemeStyles, processLineChartStyles } from "./coms";
  import { derived, writable } from "svelte/store";
  import { SvelteMap } from "svelte/reactivity"
  let { show = $bindable() } = $props();
  
  const tmp = new SvelteMap<string, any>();
  const ctx = getContext('ctx') as Writable<ChartCtx>;
  const save = getContext('save') as Writable<ChartSave>;
  const chart = getContext('chart') as Writable<Nullable<Chart>>;
  
  // Chart Setting modal state
  let showChartSettingModal = $state(false);
  
  // 样式配置选项
  interface OptionItem {
    key: string;
    text: string;
    component: string;
    dataSource?: Array<{ key: string; text: string }>;
  }
  
  const options: OptionItem[] = [
    {
      key: 'candle.priceMark.last.show',
      text: 'last_price_show',
      component: 'switch'
    },
    {
      key: 'candle.priceMark.high.show',
      text: 'high_price_show',
      component: 'switch'
    },
    {
      key: 'candle.priceMark.low.show',
      text: 'low_price_show',
      component: 'switch'
    },
    {
      key: 'indicator.lastValueMark.show',
      text: 'indicator_last_value_show',
      component: 'switch'
    },
    {
      key: 'yAxis.reverse',
      text: 'reverse_coordinate',
      component: 'switch',
    },
    {
      key: 'grid.show',
      text: 'grid_show',
      component: 'switch',
    }
  ];

  const optKeys: Record<string, boolean> = {
    // yAxis.type and yAxis.reverse should be handled as styles, not options
  }

  function update(key: string, value: any) {
    const style = $chart?.getStyles();
    const oldVal = _.get(style, key);
    
    // Handle klinecharts v10 API changes
    if (key === 'yAxis.reverse') {
      // Use setPaneOptions for axis configuration in v10
      try {
        $chart?.setPaneOptions({
          axis: {
            reverse: value as boolean
          }
        });
        
        // Also save to styles for persistence
        save.update(s => {
          _.set(s.styles, key, value)
          return s
        })
        
        tmp.set(key, value)
        return;
      } catch (error) {
        console.warn('setPaneOptions not available, falling back to styles:', error);
      }
    }
    
    if (oldVal == value) return
    tmp.set(key, value)
    
    // Update styles for all settings
    save.update(s => {
      _.set(s.styles, key, value)
      return s
    })
    
    // IMPORTANT: Merge with theme styles to preserve all settings including chart type
    const themeStyles = getThemeStyles($save.theme);
    const mergedStyles = _.merge({}, themeStyles, $save.styles);
    $chart?.setStyles(processLineChartStyles(mergedStyles));
  }

  function click(from: string) {
    if (from === 'reset') {
      // CRITICAL: Preserve chart type before reset
      const preservedChartType = $save.styles?.candle?.type;
      
      // Reset to default theme styles
      const defaultStyles = getThemeStyles($save.theme);
      
      // Clear custom styles for all options
      const styles = $save.styles;
      options.forEach((it) => {
        _.unset(styles, it.key)
      })
      
      save.update(s => {
        s.styles = styles
        // CRITICAL: Restore preserved chart type after reset
        if (preservedChartType) {
          if (!s.styles.candle) s.styles.candle = {};
          s.styles.candle.type = preservedChartType;
        }
        return s
      })
      
      // Apply with preserved chart type
      const mergedStyles = _.merge({}, defaultStyles, $save.styles);
      $chart?.setStyles(processLineChartStyles(mergedStyles));
      
      resetFromChart();
    }else{
      show = false;
    }
  }
 
  function resetFromChart(){
    let chartObj = $chart;
    if(!chartObj) return;
    const styles = chartObj.getStyles() ?? {};
    
    // Load all values from styles
    options.forEach((it) => {
      const value = _.get(styles, it.key);
      // Use default values if not found in styles
      if (it.key === 'yAxis.reverse') {
        tmp.set(it.key, value || false);
      } else {
        tmp.set(it.key, value);
      }
    })
  }

  let chartInit = derived(ctx, ($ctx) => $ctx.initDone)
  chartInit.subscribe(resetFromChart)

  // Initialize values when modal opens
  $effect(() => {
    if (show && $chart) {
      resetFromChart();
    }
  });
</script>

<Modal title={m.settings()} width={760} bind:show={show} click={click} buttons={['confirm', 'reset']}>
  <div class="grid grid-cols-[3fr_2fr_3fr_2fr] gap-5 mx-7 my-5 items-center">
    {#each options as item}
      <span class="text-base-content/70 text-right">{(m as any)[item.text]?.()}</span>
      {#if item.component === 'select'}
        <select 
          class="select select-bordered select-sm w-full"
          value={tmp.get(item.key)}
          onchange={(e) => update(item.key, e.currentTarget.value)}
        >
          {#each item.dataSource || [] as option}
            <option value={option.key}>{(m as any)[option.text]?.() || option.text}</option>
          {/each}
        </select>
      {:else if item.component === 'switch'}
        <input type="checkbox" class="toggle toggle-sm"
          checked={!!tmp.get(item.key)}
          onchange={(e) => update(item.key, e.currentTarget.checked)}/>
      {/if}
    {/each}
    
    <!-- Chart Setting Button -->
    <div class="col-span-4 mt-4 pt-4 border-t border-base-300">
      <button 
        class="btn btn-outline btn-primary w-full"
        onclick={() => showChartSettingModal = true}
      >
        Chart Setting
      </button>
    </div>
  </div>
</Modal>

<!-- Chart Setting Modal -->
<ModalChartSetting bind:show={showChartSettingModal} />
