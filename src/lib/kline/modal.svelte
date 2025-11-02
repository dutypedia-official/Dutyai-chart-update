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
    theme?: string
    children?: Snippet<[]>
    click?: (type: string) => void
  }

  let {
    width = 600, 
    maxWidth = "min(600px, 95vw)",
    maxHeight = "90vh",
    title = "", 
    buttons = ['confirm'], 
    show = $bindable(false), 
    center = false,
    class: className = "",
    theme = 'dark',
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
  <!-- Premium Modal Overlay (Clean, No Blur) -->
  <div 
    class="fixed inset-0 z-[70] flex items-center justify-center px-3 sm:px-4 md:px-6 animate-in fade-in duration-200 modal-overlay"
    onclick={close}
  >
    <!-- Ultra-Premium Modal Container -->
    <div 
      class="relative rounded-3xl shadow-luxury animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col modal-container {className}"
      data-theme={theme}
      style="width: {typeof width === 'string' ? width : width + 'px'}; max-width: {maxWidth}; max-height: {maxHeight};"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Premium Header with Luxury Styling -->
      <div class="relative px-4 sm:px-6 py-4 sm:py-5 border-b modal-header">
        <div class="flex justify-between items-center gap-4">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="icon-badge">
              <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 class="font-bold text-lg sm:text-xl md:text-2xl tracking-tight text-base-content truncate">{title}</h3>
          </div>
          <button 
            class="close-btn flex-shrink-0"
            onclick={close}
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Modal Content with Premium Scrollbar -->
      <div class="flex-1 overflow-y-auto premium-scrollbar {center ? 'flex justify-center items-center' : ''} px-4 sm:px-6 py-4 sm:py-5">
        {#if children}
          {@render children()}
        {/if}
      </div>

      <!-- Premium Action Buttons -->
      {#if buttons.length > 0}
        <div class="modal-action px-4 sm:px-6 py-4 sm:py-5 border-t modal-footer">
          <div class="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end w-full">
            {#each buttons as btn}
              <button 
                class="btn-premium {getButtonClass(btn)} w-full sm:w-auto sm:min-w-[120px]"
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
  /* === ANIMATIONS === */
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

  /* === MODAL OVERLAY === */
  .modal-overlay {
    background-color: rgba(0, 0, 0, 0.5);
  }

  /* === PREMIUM SCROLLBAR === */
  .premium-scrollbar {
    scrollbar-width: thin;
  }
  
  .premium-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .premium-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .premium-scrollbar::-webkit-scrollbar-thumb {
    border-radius: 10px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .premium-scrollbar::-webkit-scrollbar-thumb:hover {
    transform: scaleX(1.2);
  }

  /* === LUXURY SHADOW === */
  .shadow-luxury {
    box-shadow: 
      0 0 0 1px rgba(0, 0, 0, 0.03),
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  /* === PREMIUM BUTTONS === */
  .btn-premium {
    padding: 0.625rem 1.25rem;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.3s ease-out;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .btn-premium:hover {
    transform: scale(1.05);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .btn-premium:active {
    transform: scale(0.95);
  }

  .btn-premium:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
  }

  @media (min-width: 640px) {
    .btn-premium {
      font-size: 1rem;
    }
  }

  /* === CLOSE BUTTON === */
  .close-btn {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease-out;
  }

  .close-btn:hover {
    transform: rotate(90deg) scale(1.1);
  }

  @media (min-width: 640px) {
    .close-btn {
      width: 2.5rem;
      height: 2.5rem;
    }
  }

  /* === ICON BADGE === */
  .icon-badge {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.3s;
  }

  @media (min-width: 640px) {
    .icon-badge {
      width: 3rem;
      height: 3rem;
    }
  }

  /* ========================================
     LIGHT MODE STYLING (Modern & Clean)
     ======================================== */
  
  .modal-container[data-theme="light"] {
    background: linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
    border: 1.5px solid rgba(59, 130, 246, 0.15);
  }

  .modal-container[data-theme="light"] .shadow-luxury {
    box-shadow: 
      0 0 0 1px rgba(59, 130, 246, 0.08),
      0 8px 16px -4px rgba(59, 130, 246, 0.12),
      0 24px 40px -8px rgba(59, 130, 246, 0.08),
      0 12px 16px -8px rgba(0, 0, 0, 0.03);
  }
  
  .modal-container[data-theme="light"] .modal-header {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.04) 0%, rgba(99, 102, 241, 0.02) 100%);
    border-bottom-color: rgba(59, 130, 246, 0.12);
  }
  
  .modal-container[data-theme="light"] .modal-footer {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.02) 0%, rgba(99, 102, 241, 0.01) 100%);
    border-top-color: rgba(59, 130, 246, 0.12);
  }

  .modal-container[data-theme="light"] .icon-badge {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.08) 100%);
    color: rgb(37, 99, 235);
  }

  .modal-container[data-theme="light"] .close-btn {
    background: rgba(59, 130, 246, 0.05);
    color: rgb(71, 85, 105);
  }

  .modal-container[data-theme="light"] .close-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
  }

  .modal-container[data-theme="light"] .btn-premium.btn-primary {
    background: linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(37, 99, 235) 100%);
    color: white;
    border: none;
  }

  .modal-container[data-theme="light"] .btn-premium.btn-primary:hover {
    background: linear-gradient(135deg, rgb(37, 99, 235) 0%, rgb(29, 78, 216) 100%);
  }

  .modal-container[data-theme="light"] .btn-premium.btn-ghost {
    background: rgba(59, 130, 246, 0.05);
    color: rgb(71, 85, 105);
  }

  .modal-container[data-theme="light"] .btn-premium.btn-ghost:hover {
    background: rgba(59, 130, 246, 0.12);
    color: rgb(30, 58, 138);
  }

  /* Light Mode Scrollbar */
  .modal-container[data-theme="light"] .premium-scrollbar {
    scrollbar-color: rgba(59, 130, 246, 0.25) transparent;
  }
  
  .modal-container[data-theme="light"] .premium-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.2));
  }
  
  .modal-container[data-theme="light"] .premium-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.5), rgba(59, 130, 246, 0.4));
  }

  /* ========================================
     DARK MODE STYLING (Luxury & Premium)
     ======================================== */
  
  .modal-container[data-theme="dark"] {
    background: linear-gradient(145deg, #0f172a 0%, #1e1b4b 50%, #1a1a2e 100%);
    border: 1.5px solid rgba(139, 92, 246, 0.2);
  }

  .modal-container[data-theme="dark"] .shadow-luxury {
    box-shadow: 
      0 0 0 1px rgba(139, 92, 246, 0.15),
      0 8px 16px -4px rgba(139, 92, 246, 0.2),
      0 24px 40px -8px rgba(0, 0, 0, 0.4),
      0 12px 16px -8px rgba(139, 92, 246, 0.1);
  }
  
  .modal-container[data-theme="dark"] .modal-header {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%);
    border-bottom-color: rgba(139, 92, 246, 0.2);
  }
  
  .modal-container[data-theme="dark"] .modal-footer {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(99, 102, 241, 0.02) 100%);
    border-top-color: rgba(139, 92, 246, 0.2);
  }

  .modal-container[data-theme="dark"] .icon-badge {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.12) 100%);
    color: rgb(167, 139, 250);
  }

  .modal-container[data-theme="dark"] .close-btn {
    background: rgba(139, 92, 246, 0.1);
    color: rgb(203, 213, 225);
  }

  .modal-container[data-theme="dark"] .close-btn:hover {
    background: rgba(239, 68, 68, 0.15);
    color: rgb(248, 113, 113);
  }

  .modal-container[data-theme="dark"] .btn-premium.btn-primary {
    background: linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(124, 58, 237) 100%);
    color: white;
    border: none;
  }

  .modal-container[data-theme="dark"] .btn-premium.btn-primary:hover {
    background: linear-gradient(135deg, rgb(124, 58, 237) 0%, rgb(109, 40, 217) 100%);
  }

  .modal-container[data-theme="dark"] .btn-premium.btn-ghost {
    background: rgba(139, 92, 246, 0.1);
    color: rgb(203, 213, 225);
  }

  .modal-container[data-theme="dark"] .btn-premium.btn-ghost:hover {
    background: rgba(139, 92, 246, 0.2);
    color: rgb(226, 232, 240);
  }

  /* Dark Mode Scrollbar */
  .modal-container[data-theme="dark"] .premium-scrollbar {
    scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
  }
  
  .modal-container[data-theme="dark"] .premium-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, rgba(139, 92, 246, 0.4), rgba(139, 92, 246, 0.25));
  }
  
  .modal-container[data-theme="dark"] .premium-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, rgba(139, 92, 246, 0.6), rgba(139, 92, 246, 0.45));
  }

  /* ========================================
     RESPONSIVE DESIGN
     ======================================== */
  
  @media (max-width: 640px) {
    .modal-container {
      border-radius: 1.25rem;
      width: calc(100vw - 1.5rem) !important;
      max-width: calc(100vw - 1.5rem) !important;
      margin: 0 0.75rem;
    }

    .btn-premium {
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
    }
  }

  @media (min-width: 641px) and (max-width: 768px) {
    .modal-container {
      width: calc(100vw - 3rem) !important;
      max-width: calc(100vw - 3rem) !important;
      margin: 0 1.5rem;
    }
  }

  @media (min-width: 769px) {
    .modal-container {
      width: 600px !important;
      max-width: 600px !important;
    }
  }
</style>
