<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  
  export let message = ''

  export let duration = 3000
  export let visible = false
  
  const dispatch = createEventDispatcher()
  
  let toastElement: HTMLDivElement
  
  onMount(() => {
    if (visible) {
      showToast()
    }
  })
  
  export function showToast() {
    visible = true
    
    // Auto hide after duration
    setTimeout(() => {
      hideToast()
    }, duration)
  }
  
  export function hideToast() {
    visible = false
    dispatch('hide')
  }
  

</script>

{#if visible}
  <div 
    bind:this={toastElement}
    class="toast"
    class:show={visible}
  >
    <span class="toast-message">{message}</span>
  </div>
{/if}

<style>
  .toast {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
    transition: all 0.3s ease;
    pointer-events: none;
  }
  
  .toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  
  .toast-message {
    font-size: 12px;
    font-weight: 500;
    color: #22c55e;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    white-space: nowrap;
  }
  
  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    .toast-message {
      color: #4ade80;
    }
  }
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    .toast {
      top: 8px;
    }
    
    .toast-message {
      font-size: 11px;
    }
  }
</style>