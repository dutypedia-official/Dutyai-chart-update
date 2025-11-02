<script lang="ts">
  import * as m from '$lib/paraglide/messages.js'
	import type { Snippet } from 'svelte';

  interface PropsType {
    width?: number | string
    maxWidth?: string
    maxHeight?: string
    title: string
    buttons?: string[]
    show: boolean
    center?: boolean
    class?: string
    children?: Snippet<[]>
    click?: (type: string) => void
  }

  let {
    width = 400, 
    maxWidth = "90vw",
    maxHeight = "80vh",
    title = "", 
    buttons = ['confirm'], 
    show = $bindable(false), 
    center = false,
    class: className = "",
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
      class="relative bg-base-100 dark:bg-base-100/95 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col backdrop-blur-xl modal-container {className}"
      style="width: {typeof width === 'string' ? width : width + 'px'}; max-width: {maxWidth}; max-height: {maxHeight};"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Elegant Header with Gradient -->
      <div class="relative px-6 py-5 border-b border-base-300/40 dark:border-base-300/60 bg-gradient-to-r from-base-200/25 dark:from-base-200/15 to-base-300/15 dark:to-base-300/25 modal-header">
        <div class="flex justify-between items-center">
          <h3 class="font-semibold text-xl tracking-tight text-base-content">{title}</h3>
          <button 
            class="btn btn-sm btn-ghost btn-circle hover:bg-base-300/40 dark:hover:bg-base-300/60 hover:rotate-90 transition-all duration-300"
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
        <div class="modal-action px-6 py-4 border-t border-base-300/40 dark:border-base-300/60 bg-base-200/15 dark:bg-base-200/25 modal-footer">
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
  
  /* Premium Luxury Scrollbar for modal content */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(99, 102, 241, 0.3) transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(99, 102, 241, 0.3), rgba(99, 102, 241, 0.6));
    border-radius: 3px;
    transition: all 0.3s ease;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(99, 102, 241, 0.5), rgba(99, 102, 241, 0.8));
    width: 8px;
  }
  
  /* Light Mode Styling */
  :global([data-theme="light"]) .modal-container {
    border: 1px solid rgba(59, 130, 246, 0.2);
    box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.1);
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%);
  }
  
  :global([data-theme="light"]) .modal-header {
    border-bottom-color: rgba(59, 130, 246, 0.2);
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%);
  }
  
  :global([data-theme="light"]) .modal-footer {
    border-top-color: rgba(59, 130, 246, 0.2);
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.02) 0%, rgba(59, 130, 246, 0.01) 100%);
  }
  
  /* Dark Mode Styling */
  :global([data-theme="dark"]) .modal-container {
    border: 1px solid rgba(138, 43, 226, 0.3);
    box-shadow: 0 25px 50px -12px rgba(138, 43, 226, 0.15), 0 2px 8px rgba(0, 0, 0, 0.3);
    background: linear-gradient(135deg, #0a041c 0%, #1a0f2e 50%, #0a041c 100%);
  }
  
  :global([data-theme="dark"]) .modal-header {
    border-bottom-color: rgba(138, 43, 226, 0.3);
    background: linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(138, 43, 226, 0.05) 100%);
  }
  
  :global([data-theme="dark"]) .modal-footer {
    border-top-color: rgba(138, 43, 226, 0.3);
    background: linear-gradient(135deg, rgba(138, 43, 226, 0.05) 0%, rgba(138, 43, 226, 0.02) 100%);
  }

  /* Light Mode Scrollbar */
  :global([data-theme="light"]) .custom-scrollbar {
    scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
  }
  
  :global([data-theme="light"]) .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.15));
  }
  
  :global([data-theme="light"]) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.5), rgba(59, 130, 246, 0.3));
  }

  /* Dark Mode Scrollbar */
  :global([data-theme="dark"]) .custom-scrollbar {
    scrollbar-color: rgba(138, 43, 226, 0.4) transparent;
  }
  
  :global([data-theme="dark"]) .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(138, 43, 226, 0.4), rgba(138, 43, 226, 0.2));
  }
  
  :global([data-theme="dark"]) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(138, 43, 226, 0.6), rgba(138, 43, 226, 0.4));
  }
</style>
