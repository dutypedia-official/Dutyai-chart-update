<script lang="ts">
  import { getContext } from "svelte";
  import { ChartSave } from "./chart";
  import type { Writable } from "svelte/store";

  // Props for customization
  export let className = '';
  
  const save = getContext('save') as Writable<ChartSave>;
</script>

<div class="right-sidebar hidden md:flex {className}" data-theme={$save.theme}>
  <!-- Top section with 3 icons -->
  <div class="top-section">
    <!-- Watch List Icon -->
    <button class="sidebar-icon" title="Watch List">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    
    <!-- Alarm Icon -->
    <button class="sidebar-icon" title="Alerts">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13.73 21A2 2 0 0 1 10.27 21" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    
    <!-- Ask AI Button -->
    <button class="sidebar-icon ask-ai-btn" title="Ask AI">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 12C13.1046 12 14 11.1046 14 10C14 8.89543 13.1046 8 12 8C10.8954 8 10 8.89543 10 10C10 11.1046 10.8954 12 12 12Z" fill="currentColor"/>
      </svg>
    </button>
  </div>
  
  <!-- Bottom section with 2 icons -->
  <div class="bottom-section">
    <!-- Calendar Icon -->
    <button class="sidebar-icon" title="Calendar">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="0.5"/>
        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="0.5" stroke-linecap="round"/>
        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="0.5" stroke-linecap="round"/>
        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="0.5"/>
      </svg>
    </button>
    
    <!-- Portfolio Icon -->
    <button class="sidebar-icon" title="Portfolio">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="0.5"/>
        <path d="M16 21V5A2 2 0 0 0 14 3H10A2 2 0 0 0 8 5V21" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .right-sidebar {
    width: 60px;
    height: 100%;
    background-color: var(--background-color);
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    position: relative;
  }
  
  .top-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
  }
  
  .bottom-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
  }
  
  .sidebar-icon {
    width: 44px;
    height: 44px;
    border: none;
    background-color: transparent;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-color, #666666);
  }
  
  .sidebar-icon:hover {
    background-color: var(--hover-bg, rgba(0, 123, 255, 0.1));
    color: var(--primary-color, #007bff);
    transform: translateY(-1px);
  }
  
  .sidebar-icon:active {
    transform: translateY(0);
  }
  
  .ask-ai-btn {
    background-color: var(--primary-color, #007bff);
    color: white;
  }
  
  .ask-ai-btn:hover {
    background-color: var(--primary-hover, #0056b3);
    color: white;
  }
  
  /* Theme support */
  .right-sidebar[data-theme="dark"] {
    --text-color: #e5e5e5;
    --hover-bg: rgba(255, 255, 255, 0.1);
    --primary-color: #0084ff;
    --primary-hover: #0066cc;
  }
  
  .right-sidebar[data-theme="light"] {
    --text-color: #666666;
    --hover-bg: rgba(0, 123, 255, 0.1);
    --primary-color: #007bff;
    --primary-hover: #0056b3;
  }
  
  /* Mobile responsive - hide only on mobile phones */
  @media (max-width: 767px) {
    .right-sidebar {
      display: none !important;
    }
  }
</style>