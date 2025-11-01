/**
 * Early bootstrap utility for sidebar state restoration
 * This module ensures sidebar state is restored before first paint to prevent flashing
 */

export interface SidebarBootstrapState {
  visible: boolean;
  widthPx: number;
  transitionsEnabled: boolean;
}

// Extend Window interface to include our global bootstrap state
declare global {
  interface Window {
    __sidebarBootstrap?: SidebarBootstrapState;
  }
}

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 280;

/**
 * Parse boolean from localStorage value
 */
function parseBool(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return value === 'true';
}

/**
 * Clamp width value within valid range
 */
function clampWidth(value: number, min: number = MIN_WIDTH, max: number = MAX_WIDTH, fallback: number = DEFAULT_WIDTH): number {
  if (isNaN(value) || value < min || value > max) {
    return fallback;
  }
  return value;
}

/**
 * Get the bootstrap state that was set early in app.html
 * This ensures we use the same state that was used for initial CSS variables
 */
export function getSidebarBootstrapState(): SidebarBootstrapState {
  if (typeof window !== 'undefined' && window.__sidebarBootstrap) {
    return window.__sidebarBootstrap;
  }
  
  // Fallback if bootstrap didn't run
  return {
    visible: false,
    widthPx: 0,
    transitionsEnabled: false
  };
}

/**
 * Update bootstrap state and sync with CSS variables
 */
export function updateSidebarBootstrapState(updates: Partial<SidebarBootstrapState>): void {
  if (typeof window !== 'undefined') {
    if (!window.__sidebarBootstrap) {
      window.__sidebarBootstrap = getSidebarBootstrapState();
    }
    
    window.__sidebarBootstrap = { ...window.__sidebarBootstrap, ...updates };
    
    // Update CSS variables to match state
    const root = document.documentElement;
    const state = window.__sidebarBootstrap;
    const widthValue = state.visible ? state.widthPx + 'px' : '0px';
    const visibleValue = state.visible ? '1' : '0';
    
    root.style.setProperty('--sidebar-width', widthValue);
    root.style.setProperty('--sidebar-visible', visibleValue);
    // Also update chart-specific variables
    root.style.setProperty('--chart-sidebar-width', widthValue);
    root.style.setProperty('--chart-sidebar-visible', visibleValue);
  }
}

/**
 * Save sidebar state to localStorage
 */
export function persistSidebarState(visible: boolean, widthPx: number): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem('dutyai.chart.sidebar.visible', String(visible));
      if (visible) {
        const clampedWidth = clampWidth(widthPx, MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH);
        localStorage.setItem('dutyai.chart.sidebar.widthPx', String(clampedWidth));
      }
    } catch (error) {
      console.warn('Failed to persist sidebar state:', error);
    }
  }
}

/**
 * Check if container is too narrow for sidebar
 */
export function checkContainerSize(): boolean {
  if (typeof window === 'undefined') return true;
  
  const containerWidth = window.innerWidth;
  const priceScaleWidth = 80;
  const minChartWidth = 300;
  const minRequiredWidth = MIN_WIDTH + priceScaleWidth + minChartWidth;
  
  return containerWidth >= minRequiredWidth;
}

/**
 * Enable transitions after initial layout is complete
 * This should be called after the first paint to avoid transition flashing
 */
export function enableSidebarTransitions(): void {
  updateSidebarBootstrapState({ transitionsEnabled: true });
}

/**
 * Disable transitions (useful during programmatic changes)
 */
export function disableSidebarTransitions(): void {
  updateSidebarBootstrapState({ transitionsEnabled: false });
}

/**
 * Update sidebar visibility and width
 */
export function setSidebarState(visible: boolean, widthPx?: number): void {
  const currentState = getSidebarBootstrapState();
  const newWidth = widthPx !== undefined ? widthPx : (visible ? DEFAULT_WIDTH : 0);
  
  updateSidebarBootstrapState({
    visible,
    widthPx: visible ? clampWidth(newWidth, MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH) : 0
  });
  
  persistSidebarState(visible, newWidth);
}

/**
 * Constants for external use
 */
export const SIDEBAR_CONSTANTS = {
  MIN_WIDTH,
  MAX_WIDTH,
  DEFAULT_WIDTH,
  PRICE_SCALE_WIDTH: 80
} as const;