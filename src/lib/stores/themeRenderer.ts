import type { Chart } from 'klinecharts';
import type { ThemeSettingsV2, GradientSpec } from './themeSettings.js';
import _ from 'lodash';

/**
 * Apply theme settings to chart with preview mode support
 */
export function applyTheme(
  chart: Chart,
  theme: ThemeSettingsV2,
  opts?: { preview?: boolean }
): void {
  const isPreview = opts?.preview ?? false;

  // Apply background settings
  applyBackground(chart, theme.canvas.background);

  // Apply grid settings
  applyGrid(chart, theme.canvas.grid);

  // Add/remove preview watermark
  if (isPreview) {
    addPreviewWatermark(chart);
  } else {
    removePreviewWatermark(chart);
  }

  // Trigger chart repaint
  chart.resize();
}

/**
 * Apply background settings to chart
 */
function applyBackground(chart: Chart, background: ThemeSettingsV2['canvas']['background']): void {
  if (background.mode === 'solid' && background.solid) {
    setCanvasBackgroundSolid(chart, background.solid.color);
  } else if (background.mode === 'gradient' && background.gradient) {
    setCanvasBackgroundGradient(chart, background.gradient);
  }
}

/**
 * Apply grid settings to chart
 */
function applyGrid(chart: Chart, grid: ThemeSettingsV2['canvas']['grid']): void {
  if (grid.mode === 'solid' && grid.solid) {
    const color = grid.solid.color;
    const alpha = grid.solid.alpha ?? 1;
    setGridColorSolid(chart, color, alpha);
  } else if (grid.mode === 'gradient' && grid.gradient) {
    setGridGradient(chart, grid.gradient);
  }
}

/**
 * Set solid background color
 */
function setCanvasBackgroundSolid(chart: Chart, color: string): void {
  const currentStyles = chart.getStyles() ?? {};
  const newStyles = _.cloneDeep(currentStyles);
  
  // Set background color using lodash set method like existing code
  _.set(newStyles, 'pane.backgroundColor', color);
  _.set(newStyles, 'candle.pane.backgroundColor', color);
  
  chart.setStyles(newStyles as any);
}

/**
 * Set gradient background
 */
function setCanvasBackgroundGradient(chart: Chart, gradient: GradientSpec): void {
  const gradientCSS = generateGradientCSS(gradient);
  
  // Apply gradient via DOM manipulation since KLineCharts may not support CSS gradients directly
  const chartContainer = chart.getDom();
  if (chartContainer) {
    chartContainer.style.background = gradientCSS;
  }
}

/**
 * Set solid grid color
 */
function setGridColorSolid(chart: Chart, color: string, alpha: number = 1): void {
  const currentStyles = chart.getStyles() ?? {};
  const newStyles = _.cloneDeep(currentStyles);
  const gridColor = alpha < 1 ? hexToRgba(color, alpha) : color;
  
  // Set grid colors using lodash set method
  _.set(newStyles, 'grid.horizontal.color', gridColor);
  _.set(newStyles, 'grid.vertical.color', gridColor);
  
  chart.setStyles(newStyles as any);
}

/**
 * Set gradient grid color
 */
function setGridGradient(chart: Chart, gradient: GradientSpec): void {
  // For grid gradients, we'll use the first stop color as fallback
  // since KLineCharts may not support gradient grid colors
  const firstStop = gradient.stops[0];
  if (firstStop) {
    const alpha = (firstStop.alpha ?? 100) / 100;
    setGridColorSolid(chart, firstStop.color, alpha);
  }
}

/**
 * Add preview watermark to chart
 */
function addPreviewWatermark(chart: Chart): void {
  const chartContainer = chart.getDom();
  if (!chartContainer) return;
  
  // Remove existing watermark
  removePreviewWatermark(chart);
  
  // Create watermark element
  const watermark = document.createElement('div');
  watermark.id = 'theme-preview-watermark';
  watermark.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255, 0, 0, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: bold;
    z-index: 1000;
    pointer-events: none;
    font-family: monospace;
  `;
  watermark.textContent = 'PREVIEW';
  
  // Add to chart container
  const parentContainer = chartContainer.parentElement || chartContainer;
  parentContainer.style.position = 'relative';
  parentContainer.appendChild(watermark);
}

/**
 * Remove preview watermark from chart
 */
function removePreviewWatermark(chart: Chart): void {
  const chartContainer = chart.getDom();
  if (!chartContainer) return;
  
  const parentContainer = chartContainer.parentElement || chartContainer;
  const existingWatermark = parentContainer.querySelector('#theme-preview-watermark');
  if (existingWatermark) {
    existingWatermark.remove();
  }
}

/**
 * Generate CSS gradient string from gradient specification
 */
function generateGradientCSS(gradient: GradientSpec): string {
  if (!gradient.stops || gradient.stops.length === 0) {
    return 'transparent';
  }
  
  const sortedStops = [...gradient.stops].sort((a, b) => a.offset - b.offset);
  const stopStrings = sortedStops.map(stop => {
    const alpha = (stop.alpha ?? 100) / 100;
    const rgba = hexToRgba(stop.color, alpha);
    return `${rgba} ${stop.offset}%`;
  });
  
  if (gradient.type === 'linear') {
    const angle = gradient.angle ?? 0;
    return `linear-gradient(${angle}deg, ${stopStrings.join(', ')})`;
  } else if (gradient.type === 'radial') {
    const cx = gradient.cx ?? 50;
    const cy = gradient.cy ?? 50;
    const r = gradient.r ?? 50;
    return `radial-gradient(circle ${r}% at ${cx}% ${cy}%, ${stopStrings.join(', ')})`;
  }
  
  return 'transparent';
}

/**
 * Convert hex color to RGBA string
 */
function hexToRgba(hex: string, alpha: number): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}