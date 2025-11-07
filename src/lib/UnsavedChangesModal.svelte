<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let show = false;
  export let title = 'Unsaved changes';
  export let message = 'You have unsaved changes. If you refresh, your changes will be lost.';

  const dispatch = createEventDispatcher();

  function onCancel() {
    dispatch('cancel');
  }

  function onConfirm() {
    dispatch('confirm');
  }
</script>

{#if show}
  <div class="ucm-backdrop">
    <div class="ucm-modal" role="dialog" aria-modal="true" aria-labelledby="ucm-title">
      <div class="ucm-header">
        <h2 id="ucm-title">{title}</h2>
      </div>
      <div class="ucm-body">
        <p>{message}</p>
      </div>
      <div class="ucm-actions">
        <button class="btn btn-cancel" onclick={onCancel}>Cancel</button>
        <button class="btn btn-confirm" onclick={onConfirm}>Confirm</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .ucm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
  }

  .ucm-modal {
    width: 92%;
    max-width: 440px;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    background: var(--background-color, #0b0b0f);
    color: var(--text-color, #e5e7eb);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .ucm-header {
    padding: 16px 20px;
    background: linear-gradient(90deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15));
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .ucm-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .ucm-body {
    padding: 18px 20px 8px 20px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-color, #e5e7eb);
  }

  .ucm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px 20px 18px 20px;
  }

  .btn {
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 14px;
  }

  .btn-cancel {
    background: transparent;
    color: var(--text-color, #e5e7eb);
    border-color: rgba(255,255,255,0.1);
  }

  .btn-cancel:hover {
    background: rgba(255,255,255,0.06);
  }

  .btn-confirm {
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    color: white;
  }

  .btn-confirm:hover {
    filter: brightness(1.05);
  }

  /* Light mode support via CSS variables */
  :global([data-theme='light']) .ucm-modal {
    --background-color: #ffffff;
    --text-color: #111827;
    border-color: rgba(0,0,0,0.08);
  }

  :global([data-theme='light']) .ucm-header {
    background: linear-gradient(90deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08));
    border-bottom-color: rgba(0,0,0,0.06);
  }

  :global([data-theme='light']) .btn-cancel {
    border-color: rgba(0,0,0,0.12);
  }

  :global([data-theme='light']) .btn-cancel:hover {
    background: rgba(0,0,0,0.04);
  }
</style>


