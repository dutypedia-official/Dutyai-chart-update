<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut, elasticOut } from 'svelte/easing';
  
  let { show = $bindable() } = $props();
  
  let particles: Array<{x: number, y: number, vx: number, vy: number, size: number, delay: number}> = [];
  let mounted = $state(false);
  
  // Auto close after 6 seconds
  $effect(() => {
    if (show) {
      const timer = setTimeout(() => {
        show = false;
      }, 6000);
      
      return () => clearTimeout(timer);
    }
  });
  
  onMount(() => {
    mounted = true;
    // Generate particles for background animation
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 2
      });
    }
  });
  
  function handleClose() {
    show = false;
  }
</script>

{#if show}
  <!-- Backdrop -->
  <div 
    class="ai-modal-backdrop" 
    transition:fade={{ duration: 400 }}
    onclick={handleClose}
    role="presentation"
  ></div>
  
  <!-- Modal Container -->
  <div 
    class="ai-modal-container"
    transition:scale={{ duration: 600, easing: elasticOut, start: 0.5 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="ai-modal-title"
  >
    <!-- Animated Background -->
    <div class="ai-background">
      <!-- Gradient Orbs -->
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>
      
      <!-- Particles -->
      {#if mounted}
        {#each particles as particle, i}
          <div 
            class="particle"
            style="
              left: {particle.x}%;
              top: {particle.y}%;
              width: {particle.size}px;
              height: {particle.size}px;
              animation-delay: {particle.delay}s;
            "
          ></div>
        {/each}
      {/if}
      
      <!-- Neural Network Lines -->
      <svg class="neural-network" viewBox="0 0 400 300">
        <g class="network-lines">
          <line x1="50" y1="50" x2="150" y2="100" class="network-line" style="animation-delay: 0s;"/>
          <line x1="150" y1="100" x2="250" y2="80" class="network-line" style="animation-delay: 0.2s;"/>
          <line x1="250" y1="80" x2="350" y2="120" class="network-line" style="animation-delay: 0.4s;"/>
          <line x1="50" y1="150" x2="150" y2="180" class="network-line" style="animation-delay: 0.3s;"/>
          <line x1="150" y1="180" x2="250" y2="200" class="network-line" style="animation-delay: 0.5s;"/>
          <line x1="250" y1="200" x2="350" y2="180" class="network-line" style="animation-delay: 0.7s;"/>
          <line x1="150" y1="100" x2="150" y2="180" class="network-line" style="animation-delay: 0.6s;"/>
          <line x1="250" y1="80" x2="250" y2="200" class="network-line" style="animation-delay: 0.8s;"/>
        </g>
        <g class="network-nodes">
          <circle cx="50" cy="50" r="4" class="network-node" style="animation-delay: 0s;"/>
          <circle cx="150" cy="100" r="5" class="network-node" style="animation-delay: 0.2s;"/>
          <circle cx="250" cy="80" r="4" class="network-node" style="animation-delay: 0.4s;"/>
          <circle cx="350" cy="120" r="4" class="network-node" style="animation-delay: 0.6s;"/>
          <circle cx="50" cy="150" r="4" class="network-node" style="animation-delay: 0.3s;"/>
          <circle cx="150" cy="180" r="5" class="network-node" style="animation-delay: 0.5s;"/>
          <circle cx="250" cy="200" r="4" class="network-node" style="animation-delay: 0.7s;"/>
          <circle cx="350" cy="180" r="4" class="network-node" style="animation-delay: 0.9s;"/>
        </g>
      </svg>
    </div>
    
    <!-- Content -->
    <div class="ai-content">
      <!-- AI Icon with Animation -->
      <div 
        class="ai-icon-wrapper"
        in:scale={{ duration: 800, delay: 200, easing: elasticOut }}
      >
        <div class="ai-icon-glow"></div>
        <svg class="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        <div class="pulse-ring"></div>
        <div class="pulse-ring pulse-ring-2"></div>
      </div>
      
      <!-- AI Badge -->
      <div 
        class="ai-badge"
        in:fly={{ y: -20, duration: 600, delay: 400, easing: cubicOut }}
      >
        <span class="ai-badge-text">AI Powered</span>
      </div>
      
      <!-- Main Title -->
      <h2 
        id="ai-modal-title"
        class="ai-title"
        in:fly={{ y: 30, duration: 600, delay: 600, easing: cubicOut }}
      >
        <span class="gradient-text">Coming Soon</span>
      </h2>
      
      <!-- Description -->
      <div 
        class="ai-description"
        in:fly={{ y: 30, duration: 600, delay: 800, easing: cubicOut }}
      >
        <p class="ai-text">
          আমরা আনছি <span class="highlight">AI-Powered</span> বিশ্লেষণ এবং ট্রেডিং সহায়তা
        </p>
        <p class="ai-text-secondary">
          আরও কিছু দিন আমাদের সাথে থাকুন। শীঘ্রই আসছে অত্যাধুনিক এবং উদ্ভাবনী ফিচার।
        </p>
      </div>
      
      <!-- Features Preview -->
      <div 
        class="features-preview"
        in:fly={{ y: 30, duration: 600, delay: 1000, easing: cubicOut }}
      >
        <div class="feature-item">
          <div class="feature-icon">🎯</div>
          <span>Smart Predictions</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">📊</div>
          <span>Pattern Recognition</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">⚡</div>
          <span>Real-time Insights</span>
        </div>
      </div>
      
      <!-- Loading Bar -->
      <div 
        class="loading-bar-container"
        in:fade={{ duration: 400, delay: 1200 }}
      >
        <div class="loading-bar"></div>
      </div>
      
      <!-- Close hint -->
      <p 
        class="close-hint"
        in:fade={{ duration: 400, delay: 1400 }}
      >
        Click anywhere to close
      </p>
    </div>
  </div>
{/if}

<style>
  /* Backdrop */
  .ai-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 9998;
  }
  
  /* Modal Container */
  .ai-modal-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    background: linear-gradient(135deg, 
      rgba(10, 4, 28, 0.95) 0%, 
      rgba(26, 15, 46, 0.98) 50%, 
      rgba(10, 4, 28, 0.95) 100%);
    border: 2px solid rgba(138, 43, 226, 0.3);
    border-radius: 24px;
    box-shadow: 
      0 20px 60px rgba(138, 43, 226, 0.3),
      0 10px 30px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    overflow: hidden;
    z-index: 9999;
  }
  
  /* Animated Background */
  .ai-background {
    position: absolute;
    inset: 0;
    overflow: hidden;
    opacity: 0.6;
  }
  
  /* Gradient Orbs */
  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    animation: float 8s ease-in-out infinite;
  }
  
  .orb-1 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(138, 43, 226, 0.4) 0%, transparent 70%);
    top: -150px;
    left: -100px;
    animation-delay: 0s;
  }
  
  .orb-2 {
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
    bottom: -100px;
    right: -80px;
    animation-delay: 2s;
  }
  
  .orb-3 {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 4s;
  }
  
  @keyframes float {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(30px, -30px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
  }
  
  /* Particles */
  .particle {
    position: absolute;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    animation: particleFloat 6s ease-in-out infinite;
  }
  
  @keyframes particleFloat {
    0%, 100% {
      transform: translate(0, 0);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      transform: translate(var(--tx, 20px), var(--ty, -50px));
      opacity: 0;
    }
  }
  
  /* Neural Network */
  .neural-network {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.3;
  }
  
  .network-line {
    stroke: rgba(138, 43, 226, 0.5);
    stroke-width: 1;
    animation: pulse 3s ease-in-out infinite;
  }
  
  .network-node {
    fill: rgba(138, 43, 226, 0.8);
    animation: nodePulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      stroke-opacity: 0.3;
      stroke-width: 1;
    }
    50% {
      stroke-opacity: 0.8;
      stroke-width: 2;
    }
  }
  
  @keyframes nodePulse {
    0%, 100% {
      opacity: 0.5;
      r: 3;
    }
    50% {
      opacity: 1;
      r: 5;
    }
  }
  
  /* Content */
  .ai-content {
    position: relative;
    z-index: 10;
    padding: 60px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  /* AI Icon */
  .ai-icon-wrapper {
    position: relative;
    width: 100px;
    height: 100px;
    margin-bottom: 24px;
  }
  
  .ai-icon {
    width: 100%;
    height: 100%;
    color: rgba(138, 43, 226, 1);
    filter: drop-shadow(0 4px 20px rgba(138, 43, 226, 0.6));
    animation: iconRotate 10s linear infinite;
  }
  
  @keyframes iconRotate {
    0% {
      transform: rotateY(0deg);
    }
    100% {
      transform: rotateY(360deg);
    }
  }
  
  .ai-icon-glow {
    position: absolute;
    inset: -20px;
    background: radial-gradient(circle, rgba(138, 43, 226, 0.4) 0%, transparent 70%);
    border-radius: 50%;
    animation: glowPulse 2s ease-in-out infinite;
  }
  
  @keyframes glowPulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.8;
    }
  }
  
  .pulse-ring {
    position: absolute;
    inset: -10px;
    border: 2px solid rgba(138, 43, 226, 0.5);
    border-radius: 50%;
    animation: ringPulse 2s ease-out infinite;
  }
  
  .pulse-ring-2 {
    animation-delay: 1s;
  }
  
  @keyframes ringPulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }
  
  /* AI Badge */
  .ai-badge {
    display: inline-flex;
    align-items: center;
    padding: 8px 20px;
    background: linear-gradient(135deg, rgba(138, 43, 226, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
    border: 1px solid rgba(138, 43, 226, 0.4);
    border-radius: 20px;
    margin-bottom: 20px;
    backdrop-filter: blur(10px);
  }
  
  .ai-badge-text {
    font-size: 14px;
    font-weight: 600;
    color: rgba(200, 150, 255, 1);
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  
  /* Title */
  .ai-title {
    font-size: 48px;
    font-weight: 800;
    margin-bottom: 24px;
    line-height: 1.2;
  }
  
  .gradient-text {
    background: linear-gradient(135deg, 
      rgba(138, 43, 226, 1) 0%, 
      rgba(168, 85, 247, 1) 50%, 
      rgba(59, 130, 246, 1) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradientShift 3s ease-in-out infinite;
  }
  
  @keyframes gradientShift {
    0%, 100% {
      filter: hue-rotate(0deg) brightness(1);
    }
    50% {
      filter: hue-rotate(20deg) brightness(1.2);
    }
  }
  
  /* Description */
  .ai-description {
    margin-bottom: 32px;
  }
  
  .ai-text {
    font-size: 18px;
    color: rgba(220, 200, 255, 0.95);
    margin-bottom: 12px;
    line-height: 1.6;
  }
  
  .ai-text-secondary {
    font-size: 16px;
    color: rgba(180, 160, 220, 0.8);
    line-height: 1.6;
  }
  
  .highlight {
    color: rgba(138, 43, 226, 1);
    font-weight: 700;
    text-shadow: 0 0 10px rgba(138, 43, 226, 0.5);
  }
  
  /* Features Preview */
  .features-preview {
    display: flex;
    gap: 24px;
    margin-bottom: 32px;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .feature-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    background: rgba(138, 43, 226, 0.1);
    border: 1px solid rgba(138, 43, 226, 0.2);
    border-radius: 12px;
    transition: all 0.3s ease;
    animation: featureFloat 3s ease-in-out infinite;
  }
  
  .feature-item:nth-child(1) { animation-delay: 0s; }
  .feature-item:nth-child(2) { animation-delay: 0.5s; }
  .feature-item:nth-child(3) { animation-delay: 1s; }
  
  @keyframes featureFloat {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-8px);
    }
  }
  
  .feature-item:hover {
    background: rgba(138, 43, 226, 0.2);
    border-color: rgba(138, 43, 226, 0.4);
    transform: translateY(-4px);
  }
  
  .feature-icon {
    font-size: 28px;
    filter: drop-shadow(0 2px 8px rgba(138, 43, 226, 0.4));
  }
  
  .feature-item span {
    font-size: 13px;
    font-weight: 600;
    color: rgba(200, 180, 240, 0.9);
    white-space: nowrap;
  }
  
  /* Loading Bar */
  .loading-bar-container {
    width: 100%;
    max-width: 300px;
    height: 4px;
    background: rgba(138, 43, 226, 0.2);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 20px;
  }
  
  .loading-bar {
    height: 100%;
    background: linear-gradient(90deg, 
      rgba(138, 43, 226, 0.6) 0%, 
      rgba(168, 85, 247, 1) 50%, 
      rgba(59, 130, 246, 0.6) 100%);
    animation: loading 2s ease-in-out infinite;
  }
  
  @keyframes loading {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  /* Close Hint */
  .close-hint {
    font-size: 13px;
    color: rgba(160, 140, 200, 0.6);
    margin: 0;
    animation: hintBlink 2s ease-in-out infinite;
  }
  
  @keyframes hintBlink {
    0%, 100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }
  
  /* Mobile Responsiveness */
  @media (max-width: 640px) {
    .ai-modal-container {
      max-width: 95%;
      border-radius: 20px;
    }
    
    .ai-content {
      padding: 40px 24px;
    }
    
    .ai-icon-wrapper {
      width: 80px;
      height: 80px;
    }
    
    .ai-title {
      font-size: 36px;
    }
    
    .ai-text {
      font-size: 16px;
    }
    
    .ai-text-secondary {
      font-size: 14px;
    }
    
    .features-preview {
      gap: 12px;
    }
    
    .feature-item {
      padding: 12px 16px;
    }
    
    .feature-icon {
      font-size: 24px;
    }
    
    .feature-item span {
      font-size: 11px;
    }
  }
  
  @media (max-width: 480px) {
    .ai-content {
      padding: 32px 20px;
    }
    
    .ai-icon-wrapper {
      width: 70px;
      height: 70px;
    }
    
    .ai-title {
      font-size: 32px;
    }
    
    .ai-badge-text {
      font-size: 12px;
    }
    
    .features-preview {
      flex-direction: column;
      gap: 10px;
    }
    
    .feature-item {
      flex-direction: row;
      width: 100%;
      justify-content: flex-start;
      padding: 12px;
    }
  }
</style>

