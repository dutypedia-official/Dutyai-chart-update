<script lang="ts">
  import * as m from '$lib/paraglide/messages.js'
	import type { Snippet } from 'svelte';

  interface PropsType {
    width?: number | string
    maxHeight?: string
    title: string
    buttons?: string[]
    show: boolean
    center?: boolean
    children?: Snippet<[]>
    click?: (type: string) => void
  }

  let {
    width = 400, 
    maxHeight = "80vh",
    title = "", 
    buttons = ['confirm'], 
    show = $bindable(false), 
    center = false,
    children,
    click
  }: PropsType = $props();

  function handleButtonClick(type: string) {
    if (type === 'close') {
      show = false;
    }
    click && click(type)
  }

  function getButtonClass(type: string): string {
    switch (type) {
      case 'confirm':
        return 'btn-primary';
      case 'cancel':
        return 'btn-ghost';
      default:
        return 'btn-secondary';
    }
  }

  function close(e: MouseEvent){
    show = false
    e.stopPropagation()
    click && click('close')
  }

</script>

{#if show}
  <!-- Premium Modal Overlay (No Background) -->
  <div 
    class="fixed inset-0 z-[70] flex items-center justify-center px-4 animate-in fade-in duration-200"
    onclick={close}
  >
    <!-- Premium Modal Container -->
    <div 
      class="relative bg-base-100 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col"
      style="width: {typeof width === 'string' ? width : width + 'px'}; max-width: 90vw; max-height: {maxHeight}; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Elegant Header with Gradient -->
      <div class="relative px-6 py-5 border-b border-base-300/50 bg-gradient-to-r from-base-200/30 to-base-300/20">
        <div class="flex justify-between items-center">
          <h3 class="font-semibold text-xl tracking-tight text-base-content">{title}</h3>
          <button 
            class="btn btn-sm btn-ghost btn-circle hover:bg-base-300/50 hover:rotate-90 transition-all duration-300"
            onclick={close}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Modal Content -->
      <div class="flex-1 overflow-y-auto custom-scrollbar {center ? 'flex justify-center items-center' : ''} px-6 py-4">
        {#if children}
          {@render children()}
        {/if}
      </div>

      <!-- Action Buttons (if any) -->
      {#if buttons.length > 0}
        <div class="modal-action px-6 py-4 border-t border-base-300/50 bg-base-200/20">
          <div class="flex gap-3 justify-end w-full">
            {#each buttons as btn}
              <button 
                class="btn {getButtonClass(btn)} min-w-[100px] rounded-lg font-medium transition-all duration-200 hover:scale-105"
                onclick={() => handleButtonClick(btn)}
              >
                {(m as any)[btn]()}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes zoom-in-95 {
    from { 
      opacity: 0;
      transform: scale(0.95);
    }
    to { 
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .animate-in {
    animation-fill-mode: both;
  }
  
  .fade-in {
    animation-name: fade-in;
  }
  
  .zoom-in-95 {
    animation-name: zoom-in-95;
  }
  
  .duration-200 {
    animation-duration: 200ms;
  }
  
  .duration-300 {
    animation-duration: 300ms;
  }
  
  /* Custom scrollbar for modal content */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 3px;
    transition: background 0.2s;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);
  }
</style>
