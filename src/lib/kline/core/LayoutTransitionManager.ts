/**
 * LayoutTransitionManager - First-frame transition gating
 * 
 * Prevents CSS transitions from triggering on initial render or layout changes,
 * eliminating "flash" animations when toggling/resizing UI elements.
 */

export interface TransitionState {
  enabled: boolean;
  element?: HTMLElement;
}

export class LayoutTransitionManager {
  private states = new Map<string, TransitionState>();
  private transitionProperty = 'transition';
  
  /**
   * Register an element for transition management
   */
  register(key: string, element?: HTMLElement): void {
    this.states.set(key, { enabled: false, element });
  }

  /**
   * Disable transitions for a specific key
   */
  disable(key: string): void {
    const state = this.states.get(key);
    if (!state) return;

    state.enabled = false;
    
    if (state.element) {
      this.applyTransitionStyle(state.element, 'none');
    }
  }

  /**
   * Enable transitions for a specific key
   */
  enable(key: string): void {
    const state = this.states.get(key);
    if (!state) return;

    state.enabled = true;
    
    if (state.element) {
      this.applyTransitionStyle(state.element, '');
    }
  }

  /**
   * Disable transitions, execute a function, then re-enable after next frame
   */
  withoutTransitions<T>(key: string, fn: () => T): T {
    this.disable(key);
    const result = fn();
    
    // Re-enable after first paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.enable(key);
      });
    });
    
    return result;
  }

  /**
   * Apply layout changes without transitions
   * Useful for sidebar toggle, resize, etc.
   */
  applyLayout(key: string, applyFn: () => void, enableAfter = true): void {
    this.disable(key);
    applyFn();
    
    if (enableAfter) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.enable(key);
        });
      });
    }
  }

  /**
   * Check if transitions are enabled for a key
   */
  isEnabled(key: string): boolean {
    return this.states.get(key)?.enabled ?? false;
  }

  /**
   * Update the element reference for a key
   */
  updateElement(key: string, element: HTMLElement): void {
    const state = this.states.get(key);
    if (state) {
      state.element = element;
      
      // Apply current transition state
      if (state.enabled) {
        this.applyTransitionStyle(element, '');
      } else {
        this.applyTransitionStyle(element, 'none');
      }
    } else {
      this.register(key, element);
    }
  }

  /**
   * Apply transition style to an element
   */
  private applyTransitionStyle(element: HTMLElement, value: string): void {
    element.style.setProperty(this.transitionProperty, value);
  }

  /**
   * Clear all registered states
   */
  clear(): void {
    this.states.clear();
  }

  /**
   * Get all registered keys
   */
  getKeys(): string[] {
    return Array.from(this.states.keys());
  }
}

// Global singleton instance
let globalManager: LayoutTransitionManager | null = null;

export function getLayoutTransitionManager(): LayoutTransitionManager {
  if (!globalManager) {
    globalManager = new LayoutTransitionManager();
  }
  return globalManager;
}

/**
 * Utility function to disable transitions on an element temporarily
 */
export function withoutTransitions(element: HTMLElement, fn: () => void): void {
  const originalTransition = element.style.transition;
  element.style.transition = 'none';
  
  fn();
  
  // Force reflow to ensure transition is disabled
  void element.offsetHeight;
  
  requestAnimationFrame(() => {
    element.style.transition = originalTransition;
  });
}
