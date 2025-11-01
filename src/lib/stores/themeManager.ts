import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { Chart, Nullable } from 'klinecharts';
import _ from 'lodash';
import { 
  type ThemeSettingsV2, 
  type SettingsStore, 
  createThemeSettingsStore,
  deepCloneThemeSettings,
  persistThemeSettings,
  loadPersistedThemeSettings,
  generateGradientCSS,
  hexToRgba
} from './themeSettings.js';
import { processLineChartStyles } from '../kline/coms.js';

export interface ApplyThemeOptions {
  preview?: boolean;
}

export class TransactionalThemeManager {
  private settingsStore: Writable<SettingsStore>;
  private chart: Writable<Nullable<Chart>>;
  private chartId: string;
  private pendingThemeApplication: ThemeSettingsV2 | null = null;
  private chartUnsubscribe: (() => void) | null = null;
  private chartReadinessTimeout: ReturnType<typeof setTimeout> | null = null;
  private applyCanvasColorsFn: (() => void) | null = null; // Add this line

  constructor(chartId: string, chartStore: Writable<Nullable<Chart>>, initialTheme: string = 'dark') {
    this.chartId = chartId;
    this.chart = chartStore;
    this.settingsStore = createThemeSettingsStore(chartId, initialTheme);
    
    // Set up chart readiness monitoring
    this.setupChartReadinessMonitoring();
    
    // Load persisted settings on initialization
    this.loadPersistedSettings(initialTheme);
  }

  // Add method to register canvas colors function
  setApplyCanvasColorsFunction(fn: () => void): void {
    this.applyCanvasColorsFn = fn;
    console.log('🎨 Canvas colors function registered with theme manager');
  }

  // Add method to apply canvas colors
  private applyCanvasColorsIfAvailable(): void {
    if (this.applyCanvasColorsFn) {
      console.log('🎨 Applying canvas colors via theme manager');
      this.applyCanvasColorsFn();
    }
  }

  // Get the settings store for reactive access
  getStore(): Writable<SettingsStore> {
    return this.settingsStore;
  }

  // Set up monitoring for chart readiness
  private setupChartReadinessMonitoring(): void {
    // Subscribe to chart store changes to detect when chart becomes available
    this.chartUnsubscribe = this.chart.subscribe((chartInstance) => {
      if (chartInstance && this.pendingThemeApplication) {
        console.log('📊 Chart became available, applying pending theme');
        this.applyTheme(this.pendingThemeApplication, { preview: false });
        this.pendingThemeApplication = null;
        
        // Clear the timeout since chart is now available
        if (this.chartReadinessTimeout) {
          clearTimeout(this.chartReadinessTimeout);
          this.chartReadinessTimeout = null;
        }
      }
    });
    

  }

  // Set up timeout for pending theme application
  private setupChartReadinessTimeout(): void {
    if (this.chartReadinessTimeout) {
      clearTimeout(this.chartReadinessTimeout);
    }
    
    this.chartReadinessTimeout = setTimeout(() => {
      if (this.pendingThemeApplication) {
        console.warn('📊 Chart readiness timeout - clearing pending theme application');
        this.pendingThemeApplication = null;
      }
      this.chartReadinessTimeout = null;
    }, 10000); // 10 second timeout
  }

  // Clean up subscriptions and timeouts
  destroy(): void {
    if (this.chartUnsubscribe) {
      this.chartUnsubscribe();
      this.chartUnsubscribe = null;
    }
    if (this.chartReadinessTimeout) {
      clearTimeout(this.chartReadinessTimeout);
      this.chartReadinessTimeout = null;
    }
  }

  // Load persisted settings from localStorage
  private loadPersistedSettings(fallbackTheme: string): void {
    let persisted = loadPersistedThemeSettings(this.chartId, fallbackTheme);
    
    // Try to load from legacy system and merge if available
    const legacySettings = this.loadFromLegacySystem();
    if (legacySettings) {
      persisted = this.mergeThemeSettings(persisted, legacySettings);
    }
    
    this.settingsStore.update(store => ({
      ...store,
      current: persisted
    }));
    
    // Apply the loaded settings when chart is ready
    const chart = get(this.chart);
    if (chart) {
      // Chart is already available, apply immediately
      this.applyTheme(persisted, { preview: false });
    } else {
      // Chart not ready yet, store for later application
      console.log('📊 Chart not ready, deferring theme application');
      this.pendingThemeApplication = persisted;
      this.setupChartReadinessTimeout();
    }
  }

  // Load theme settings from legacy $save.styles system
  private loadFromLegacySystem(): Partial<ThemeSettingsV2> | null {
    try {
      const savedChart = localStorage.getItem('chart');
      if (!savedChart) return null;
      
      const chartData = JSON.parse(savedChart);
      if (!chartData.styles) return null;
      
      // CRITICAL: Log current chart type in localStorage
      console.log('📦 Loading from localStorage - chart type:', chartData.styles?.candle?.type);
      
      const legacySettings: Partial<ThemeSettingsV2> = {
        canvas: {
          background: {} as any,
          grid: {} as any
        }
      };
      
      // Load background settings
      const bgType = chartData.styles.backgroundType || 'solid';
      if (bgType === 'solid' && chartData.styles.backgroundColor) {
        legacySettings.canvas!.background = {
          mode: 'solid',
          solid: {
            color: chartData.styles.backgroundColor,
            alpha: (chartData.styles.backgroundOpacity ?? 100) / 100
          }
        };
      } else if (bgType === 'gradient' && chartData.styles.backgroundGradient) {
        legacySettings.canvas!.background = {
          mode: 'gradient',
          gradient: chartData.styles.backgroundGradient
        };
      }
      
      // Load grid settings
      const gridType = chartData.styles.gridType || 'solid';
      if (gridType === 'solid') {
        const gridColor = chartData.styles.grid?.horizontal?.color || 
                         chartData.styles.grid?.vertical?.color;
        if (gridColor) {
          // Extract hex color if it's in rgba format
          const hexColor = this.extractHexFromColor(gridColor);
          const gridOpacity = chartData.styles.gridOpacity ?? 100;
          
          legacySettings.canvas!.grid = {
            mode: 'solid',
            solid: {
              color: hexColor,
              alpha: gridOpacity / 100
            }
          };
        }
      } else if (gridType === 'gradient' && chartData.styles.gridGradient) {
        legacySettings.canvas!.grid = {
          mode: 'gradient',
          gradient: chartData.styles.gridGradient
        };
      }
      
      console.debug('LEGACY_LOAD', { loadedSettings: legacySettings });
      return legacySettings;
    } catch (error) {
      console.error('Failed to load from legacy system:', error);
      return null;
    }
  }

  // Extract hex color from rgba or hex string
  private extractHexFromColor(color: string): string {
    if (color.startsWith('#')) {
      return color;
    }
    if (color.startsWith('rgba') || color.startsWith('rgb')) {
      // Try to extract rgb values and convert back to hex
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    }
    return color;
  }

  // Merge theme settings (legacy takes precedence over defaults)
  private mergeThemeSettings(base: ThemeSettingsV2, legacy: Partial<ThemeSettingsV2>): ThemeSettingsV2 {
    const merged = deepCloneThemeSettings(base);
    
    if (legacy.canvas?.background) {
      merged.canvas.background = legacy.canvas.background;
    }
    if (legacy.canvas?.grid) {
      merged.canvas.grid = legacy.canvas.grid;
    }
    
    return merged;
  }

  // Open modal - initialize pending state
  openModal(): void {
    this.settingsStore.update(store => {
      if (store.pending === null) {
        store.pending = deepCloneThemeSettings(store.current);
        console.debug('THEME_MODAL_OPEN', { pending: store.pending });
      }
      return store;
    });
  }

  // Update pending settings (for live preview)
  updatePending(updater: (pending: ThemeSettingsV2) => void, applyPreview: boolean = false): void {
    this.settingsStore.update(store => {
      if (store.pending) {
        updater(store.pending);
        // Only apply theme if explicitly requested (for final confirmation)
        if (applyPreview) {
          this.applyTheme(store.pending, { preview: true });
        }
        console.debug('THEME_PENDING_UPDATE', { pending: store.pending, applyPreview });
      }
      return store;
    });
  }

  // Confirm changes - commit pending to current
  confirm(): void {
    this.settingsStore.update(store => {
      if (store.pending) {
        store.current = deepCloneThemeSettings(store.pending);
        
        // Persist the changes
        persistThemeSettings(this.chartId, store.current);
        
        // Apply final theme (not preview)
        this.applyTheme(store.current, { preview: false });
        
        // ALSO persist to old system for backwards compatibility
        this.syncToLegacySystem(store.current);
        
        console.debug('THEME_COMMIT', { current: store.current });
        
        // Clear pending
        store.pending = null;
      }
      return store;
    });
  }

  // Sync theme settings to legacy $save.styles system
  private syncToLegacySystem(theme: ThemeSettingsV2): void {
    try {
      const savedChart = localStorage.getItem('chart');
      if (savedChart) {
        const chartData = JSON.parse(savedChart);
        
        // CRITICAL: Preserve original chart type before any updates
        const preservedChartType = chartData.styles?.candle?.type;
        console.log('🔒 Preserving chart type in syncToLegacySystem:', preservedChartType);
        
        // Update legacy styles
        if (!chartData.styles) {
          chartData.styles = {};
        }
        
        // Sync background settings
        if (theme.canvas.background.mode === 'solid' && theme.canvas.background.solid) {
          chartData.styles.backgroundColor = theme.canvas.background.solid.color;
          chartData.styles.backgroundOpacity = (theme.canvas.background.solid.alpha ?? 1) * 100;
          chartData.styles.backgroundType = 'solid';
          delete chartData.styles.backgroundGradient;
        } else if (theme.canvas.background.mode === 'gradient' && theme.canvas.background.gradient) {
          chartData.styles.backgroundGradient = theme.canvas.background.gradient;
          chartData.styles.backgroundType = 'gradient';
          delete chartData.styles.backgroundColor;
          delete chartData.styles.backgroundOpacity;
        }
        
        // Sync grid settings
        if (theme.canvas.grid.mode === 'solid' && theme.canvas.grid.solid) {
          if (!chartData.styles.grid) {
            chartData.styles.grid = {};
          }
          if (!chartData.styles.grid.horizontal) {
            chartData.styles.grid.horizontal = {};
          }
          if (!chartData.styles.grid.vertical) {
            chartData.styles.grid.vertical = {};
          }
          
          const gridColor = theme.canvas.grid.solid.alpha !== undefined && theme.canvas.grid.solid.alpha !== 1
            ? hexToRgba(theme.canvas.grid.solid.color, theme.canvas.grid.solid.alpha)
            : theme.canvas.grid.solid.color;
          
          chartData.styles.grid.horizontal.color = gridColor;
          chartData.styles.grid.vertical.color = gridColor;
          chartData.styles.gridOpacity = (theme.canvas.grid.solid.alpha ?? 1) * 100;
          chartData.styles.gridType = 'solid';
          delete chartData.styles.gridGradient;
        } else if (theme.canvas.grid.mode === 'gradient' && theme.canvas.grid.gradient) {
          chartData.styles.gridGradient = theme.canvas.grid.gradient;
          chartData.styles.gridType = 'gradient';
        }
        
        // CRITICAL: Restore preserved chart type after all updates
        if (preservedChartType) {
          if (!chartData.styles.candle) {
            chartData.styles.candle = {};
          }
          chartData.styles.candle.type = preservedChartType;
          console.log('✅ Restored chart type in syncToLegacySystem:', preservedChartType);
        }
        
        // Save back to localStorage
        localStorage.setItem('chart', JSON.stringify(chartData));
        console.debug('LEGACY_SYNC', { syncedStyles: chartData.styles, preservedChartType });
      }
    } catch (error) {
      console.error('Failed to sync to legacy system:', error);
    }
  }

  // Cancel changes - revert to current
  cancel(): void {
    this.settingsStore.update(store => {
      if (store.pending) {
        // Revert to current settings
        this.applyTheme(store.current, { preview: false });
        
        console.debug('THEME_CANCEL', { reverted_to: store.current });
        
        // Clear pending
        store.pending = null;
      }
      return store;
    });
  }

  // Reset pending to current (not global defaults)
  reset(): void {
    this.settingsStore.update(store => {
      if (store.pending) {
        store.pending = deepCloneThemeSettings(store.current);
        
        // Apply preview of reset state
        this.applyTheme(store.pending, { preview: true });
        
        console.debug('THEME_RESET', { pending: store.pending });
      }
      return store;
    });
  }

  // Apply theme to chart renderer
  applyTheme(theme: ThemeSettingsV2, opts: ApplyThemeOptions = {}): void {
    const chart = get(this.chart);
    if (!chart) {
      console.log('📊 Chart not available for theme application, storing for later');
      // Store the theme for later application when chart becomes ready
      if (!opts.preview) {
        this.pendingThemeApplication = theme;
        this.setupChartReadinessTimeout();
      }
      return;
    }

    // Validate theme configuration
    if (!theme || !theme.canvas) {
      console.warn('Invalid theme configuration, skipping application');
      return;
    }

    const isPreview = opts.preview || false;
    
    // Add preview watermark if in preview mode
    if (isPreview) {
      this.addPreviewWatermark();
    } else {
      this.removePreviewWatermark();
    }

    try {
      // Apply background immediately for real-time updates
      if (theme.canvas.background) {
        this.applyBackground(theme.canvas.background);
      }
      
      // Only apply grid on final confirmation, not during preview
      // Grid changes are handled directly by the modal for real-time preview
      if (!isPreview) {
        if (theme.canvas.grid) {
          this.applyGrid(theme.canvas.grid, chart);
        }
        
        // Apply saved canvas colors after theme application
        // This ensures custom colors persist during theme switches
        setTimeout(() => {
          this.applyCanvasColorsIfAvailable();
        }, 150);
      }
      
      console.debug('THEME_APPLIED', { 
        theme: theme.canvas, 
        preview: isPreview,
        chartId: this.chartId,
        appliedGrid: !isPreview
      });
      
    } catch (error) {
      console.error('Failed to apply theme:', error);
    }
  }

  // Apply background settings
  private applyBackground(background: ThemeSettingsV2['canvas']['background']): void {
    const chartContainer = document.querySelector('.kline-main') as HTMLElement;
    const chartWidget = document.querySelector('.kline-widget') as HTMLElement;
    
    if (!chartContainer && !chartWidget) {
      console.warn('Chart containers not found for background application');
      return;
    }

    // Handle missing or invalid background configuration
    if (!background) {
      console.warn('Background configuration is null or undefined, skipping');
      return;
    }

    let backgroundCSS: string;

    if (background.mode === 'solid' && background.solid && background.solid.color) {
      const alpha = background.solid.alpha !== undefined ? background.solid.alpha : 1;
      backgroundCSS = alpha !== 1 ? hexToRgba(background.solid.color, alpha) : background.solid.color;
    } else if (background.mode === 'gradient' && background.gradient) {
      backgroundCSS = generateGradientCSS(background.gradient);
    } else {
      // Fallback to default background if configuration is invalid
      console.warn('Invalid background configuration, using fallback');
      backgroundCSS = '#070211'; // Default dark background
    }

    console.log('🎨 Applying background:', backgroundCSS);

    // Apply to both containers with immediate forced updates
    [chartContainer, chartWidget].forEach(container => {
      if (container) {
        // Force immediate style update
        container.style.removeProperty('background');
        container.style.removeProperty('background-color');
        container.offsetHeight; // Force reflow
        
        container.style.background = backgroundCSS;
        container.style.backgroundColor = backgroundCSS;
        container.style.setProperty('--chart-background-color', backgroundCSS);
        
        // Force another reflow to ensure immediate visual update
        container.offsetHeight;
      }
    });
  }

  // Apply grid settings
  private applyGrid(grid: ThemeSettingsV2['canvas']['grid'], chart: Chart): void {
    const currentStyles = chart.getStyles() ?? {};
    const newStyles = _.cloneDeep(currentStyles);

    // CRITICAL: Preserve original chart type from localStorage
    // chart.getStyles() may have converted types (e.g. 'line' -> 'area')
    try {
      const savedChart = localStorage.getItem('chart');
      if (savedChart) {
        const chartData = JSON.parse(savedChart);
        if (chartData.styles?.candle?.type) {
          if (!newStyles.candle) {
            (newStyles as any).candle = {};
          }
          (newStyles as any).candle.type = chartData.styles.candle.type;
          console.log('🔒 Preserved chart type in applyGrid:', chartData.styles.candle.type);
        }
      }
    } catch (error) {
      console.warn('Failed to preserve chart type:', error);
    }

    let gridColor: string;

    if (grid.mode === 'solid' && grid.solid) {
      const alpha = grid.solid.alpha !== undefined ? grid.solid.alpha : 1;
      gridColor = alpha !== 1 ? hexToRgba(grid.solid.color, alpha) : grid.solid.color;
    } else if (grid.mode === 'gradient' && grid.gradient) {
      // For grid gradients, use blended color since chart grids don't support gradients directly
      const stops = grid.gradient.stops;
      if (stops.length === 1) {
        gridColor = stops[0].color;
      } else if (stops.length >= 2) {
        // Simple blend of first and last colors
        gridColor = this.blendColors(stops[0].color, stops[stops.length - 1].color, 0.5);
      } else {
        console.warn('Invalid grid gradient configuration');
        return;
      }
    } else {
      console.warn('Invalid grid configuration');
      return;
    }

    console.log('🎨 ThemeManager applying grid color:', gridColor);

    // Force grid to be visible and apply colors
    _.set(newStyles, 'grid.show', true);
    _.set(newStyles, 'grid.horizontal.show', true);
    _.set(newStyles, 'grid.horizontal.color', gridColor);
    _.set(newStyles, 'grid.vertical.show', true);
    _.set(newStyles, 'grid.vertical.color', gridColor);

    // Apply styles directly without processLineChartStyles for immediate grid updates
    chart.setStyles(newStyles);
    console.log('✅ Applied grid styles directly:', { gridColor, gridConfig: newStyles.grid });
  }

  // Utility to blend two hex colors
  private blendColors(color1: string, color2: string, ratio: number): string {
    if (!color1.startsWith('#') || !color2.startsWith('#')) {
      return color1; // Fallback to first color
    }

    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
    const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
    const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Add preview watermark
  private addPreviewWatermark(): void {
    this.removePreviewWatermark(); // Remove existing first
    
    const chartContainer = document.querySelector('.kline-main') as HTMLElement;
    if (!chartContainer) return;

    const watermark = document.createElement('div');
    watermark.id = 'theme-preview-watermark';
    watermark.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 1000;
      pointer-events: none;
    `;
    watermark.textContent = 'PREVIEW';
    
    chartContainer.style.position = 'relative';
    chartContainer.appendChild(watermark);
  }

  // Remove preview watermark
  private removePreviewWatermark(): void {
    const watermark = document.getElementById('theme-preview-watermark');
    if (watermark) {
      watermark.remove();
    }
  }

  // Get current settings (for external access)
  getCurrentSettings(): ThemeSettingsV2 {
    return get(this.settingsStore).current;
  }

  // Get pending settings (for external access)
  getPendingSettings(): ThemeSettingsV2 | null {
    return get(this.settingsStore).pending;
  }

  // Check if modal is open (has pending changes)
  isModalOpen(): boolean {
    return get(this.settingsStore).pending !== null;
  }

  // Reset current state to theme defaults (called by toggle function)
  resetToThemeDefaults(theme: string): void {
    // Get default theme settings without any custom colors
    const defaultSettings = loadPersistedThemeSettings(this.chartId, theme);
    
    this.settingsStore.update(store => ({
      ...store,
      current: defaultSettings,
      pending: null // Clear any pending state
    }));
    
    console.log('🔄 Reset TransactionalThemeManager to theme defaults:', theme);
  }
}