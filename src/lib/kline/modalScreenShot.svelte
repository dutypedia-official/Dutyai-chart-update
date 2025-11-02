<script lang="ts">
  import Modal from "./modal.svelte"
  import { getContext } from "svelte";
  import { ChartSave } from "./chart";
  import type { Writable } from "svelte/store";
  
  let { show = $bindable(), url = $bindable() } = $props();

  const save = getContext('save') as Writable<ChartSave>;

  function handleConfirm(from: string) {
    if (from === 'confirm') {
      const a = document.createElement('a');
      a.download = 'screenshot';
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    show = false;
  }
</script>

<Modal title="Screenshot" width={540} bind:show={show} theme={$save.theme} click={handleConfirm}>
  <img 
    src={url} 
    alt="screenshot" 
    class="w-[500px] mt-5"
  />
</Modal>