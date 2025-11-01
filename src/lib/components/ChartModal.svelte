<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  
  export let isOpen = false
  export let x = 0
  export let y = 0
  export let currentPrice = ''
  
  const dispatch = createEventDispatcher()
  
  function closeModal() {
    isOpen = false
    dispatch('close')
  }
  
  function resetChart() {
    dispatch('reset')
    closeModal()
  }
  
  function copyPrice() {
    dispatch('copy', { price: currentPrice })
    closeModal()
  }
  
  // Close modal when clicking outside
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      closeModal()
    }
  }
  
  // Handle escape key
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeModal()
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <!-- Modal Content -->
    <div class="modal-content" style="left: {x}px; top: {y}px;">
      <!-- Actions -->
      <div class="modal-actions">
        <button class="action-btn reset-btn" on:click={resetChart}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M3 12L7 8M3 12L7 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Reset Chart</span>
        </button>
        
        <button class="action-btn copy-btn" on:click={copyPrice}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
            <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>Copy Price {currentPrice ? `(${currentPrice})` : ''}</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-content {
    position: absolute;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    animation: modalSlideIn 0.2s ease-out;
    transform-origin: top left;
  }
  
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-10px);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
      filter: blur(0);
    }
  }
  

  
  .modal-actions {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    cursor: pointer;
    color: rgba(0, 0, 0, 0.7);
    transition: all 0.2s ease;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .action-btn:hover {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(0, 0, 0, 0.2);
    color: rgba(0, 0, 0, 0.9);
  }
  
  .action-btn:active {
    transform: scale(0.95);
  }
  
  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .modal-content {
      background: rgba(20, 20, 20, 0.95);
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .action-btn {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.8);
    }
    
    .action-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
      color: rgba(255, 255, 255, 1);
    }
    
    .action-btn span {
      color: rgba(255, 255, 255, 0.9);
    }
    
    .action-btn:hover span {
      color: rgba(255, 255, 255, 1);
    }
  }
  

</style>