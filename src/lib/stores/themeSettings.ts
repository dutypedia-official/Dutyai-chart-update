import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';

// Gradient types
export type GradientStop = {
  offset: number;
  color: string;
  alpha?: number;
};

export type GradientSpec = {
  type: "linear" | "radial";
  angle?: number;               // linear
  cx?: number; cy?: number; r?: number; // radial
  stops: GradientStop[];
  css?: string;                 // Generated CSS for convenience
};

// Theme settings v2 data model
export type ThemeSettingsV2 = {
  version: 2;
  canvas: {
    background: {
      mode: "solid" | "gradient";
      solid?: { color: string; alpha?: number };
      gradient?: GradientSpec;
    };
    grid: {
      mode: "solid" | "gradient";
      solid?: { color: string; alpha?: number };
      gradient?: GradientSpec;
    };
  };
};

// Store shape for transactional settings
export type SettingsStore = {
  current: ThemeSettingsV2;     // last saved & applied
  pending: ThemeSettingsV2 | null; // deep clone of current while modal is open
  chartId: string;              // scope per chart instance
};

// Default theme settings
export function getDefaultThemeSettingsV2(theme: string = 'dark'): ThemeSettingsV2 {
  return {
    version: 2,
    canvas: {
      background: {
        mode: "solid",
        solid: { 
          color: theme === 'dark' ? '#070211' : '#ffffff',
          alpha: 1
        }
      },
      grid: {
        mode: "solid",
        solid: { 
          color: theme === 'dark' ? '#081115' : '#F3F3F3',
          alpha: 1
        }
      }
    }
  };
}

// Deep clone utility for theme settings
export function deepCloneThemeSettings(settings: ThemeSettingsV2): ThemeSettingsV2 {
  return JSON.parse(JSON.stringify(settings));
}

// Create transactional theme settings store
export function createThemeSettingsStore(chartId: string, initialTheme: string = 'dark'): Writable<SettingsStore> {
  const defaultSettings = getDefaultThemeSettingsV2(initialTheme);
  
  const initialStore: SettingsStore = {
    current: defaultSettings,
    pending: null,
    chartId
  };

  return writable(initialStore);
}

// Persistence utilities
export function persistThemeSettings(chartId: string, settings: ThemeSettingsV2): void {
  const key = `dutyai.chart.theme.${chartId}`;
  try {
    localStorage.setItem(key, JSON.stringify(settings));
    console.debug('THEME_PERSIST', { chartId, settings });
  } catch (error) {
    console.error('Failed to persist theme settings:', error);
  }
}

export function loadPersistedThemeSettings(chartId: string, fallbackTheme: string = 'dark'): ThemeSettingsV2 {
  const key = `dutyai.chart.theme.${chartId}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate version and structure
      if (parsed.version === 2 && parsed.canvas) {
        console.debug('THEME_LOAD', { chartId, settings: parsed });
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load persisted theme settings:', error);
  }
  
  // Return default if loading failed
  return getDefaultThemeSettingsV2(fallbackTheme);
}

// Utility to generate CSS from gradient spec
export function generateGradientCSS(gradient: GradientSpec): string {
  if (!gradient || !gradient.stops || gradient.stops.length === 0) {
    return 'transparent';
  }

  const stops = gradient.stops.map(stop => {
    const alpha = stop.alpha !== undefined ? stop.alpha : 1;
    const color = stop.color;
    // Convert hex to rgba if alpha is not 1
    if (alpha !== 1 && color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha}) ${stop.offset * 100}%`;
    }
    return `${color} ${stop.offset * 100}%`;
  }).join(', ');

  if (gradient.type === 'linear') {
    const angle = gradient.angle || 0;
    return `linear-gradient(${angle}deg, ${stops})`;
  } else if (gradient.type === 'radial') {
    const cx = gradient.cx || 0.5;
    const cy = gradient.cy || 0.5;
    const r = gradient.r || 0.5;
    return `radial-gradient(circle at ${cx * 100}% ${cy * 100}%, ${stops})`;
  }

  return 'transparent';
}

// Utility to convert hex color to rgba
export function hexToRgba(hex: string, alpha: number = 1): string {
  if (!hex.startsWith('#')) return hex;
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}