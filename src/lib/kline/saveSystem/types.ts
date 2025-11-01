/**
 * Chart Save System Types
 * 
 * Defines the data models for saving and loading chart layouts with:
 * - Symbol-scoped drawings (only show for matching symbols)
 * - Global settings (indicators, theme, timezone, etc.)
 */

export type SymbolKey = string; // normalized symbol key (e.g., "DSE:GP")

/**
 * Drawing data stored in data coordinates (time, price) only
 * Never store pixel/screen coordinates to ensure proper scaling
 * MUST include symbolKey to ensure drawings only show on their original symbol
 */
export interface Drawing {
  id: string;
  symbolKey: SymbolKey; // MANDATORY: normalized symbol key (e.g., "DSE:GP")
  type: string; // line, fib, rect, text, etc
  points: Array<{ time: number; price: number }>; // DATA COORDS ONLY
  styles: Record<string, any>;
  locked?: boolean;
  visible?: boolean;
  seriesId?: string; // Optional: for multi-series support
  // Additional properties for specific drawing types
  [key: string]: any;
}

/**
 * Pane configuration for chart layout
 */
export interface PaneConfig {
  id: string;
  height?: number;
  minHeight?: number;
  position?: number;
  visible?: boolean;
}

/**
 * Indicator configuration with all necessary data for restoration
 */
export interface SavedIndicator {
  id: string; // instance id
  type: string; // MACD, RSI, etc
  params: Record<string, any>;
  styles: Record<string, any>;
  paneId: string;
  visible: boolean;
  // Additional indicator-specific properties
  fields?: any[];
  [key: string]: any;
}

/**
 * Complete saved layout containing both global and symbol-scoped data
 */
export interface SavedLayout {
  id: string; // uuid
  name: string; // max 100 chars
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp

  // Global (symbol-agnostic) settings:
  timezone: string;
  interval: string; // e.g., "1m", "15m", "1D"
  chartType: string; // candles/area/renko etc
  theme: string; // light/dark or theme token
  panes: PaneConfig[]; // pane sizes/order
  indicators: SavedIndicator[];

  // Chart styling and options
  styles: Record<string, any>;
  options: Record<string, any>;

  // Symbol-scoped drawings:
  drawingsBySymbol: Record<SymbolKey, Drawing[]>;
}

/**
 * Metadata for saved layout (for listing without loading full data)
 */
export interface SavedLayoutMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Global chart state that applies across all symbols
 */
export interface GlobalChartState {
  timezone: string;
  interval: string;
  chartType: string;
  theme: string;
  panes: PaneConfig[];
  indicators: SavedIndicator[];
  styles: Record<string, any>;
  options: Record<string, any>;
}

/**
 * Chart state collection result
 */
export interface ChartStateSnapshot {
  global: GlobalChartState;
  drawings: Drawing[];
  currentSymbol: SymbolKey;
}

/**
 * Storage provider interface for persistence abstraction
 */
export interface StorageProvider {
  // Layout management
  listSavedLayouts(): Promise<SavedLayoutMeta[]>;
  getSavedLayout(id: string): Promise<SavedLayout | null>;
  createSavedLayout(layout: Omit<SavedLayout, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedLayout>;
  updateSavedLayout(id: string, updates: Partial<SavedLayout>): Promise<SavedLayout>;
  deleteSavedLayout(id: string): Promise<void>;

  // Active save tracking
  setActiveSaveId(id: string | null): Promise<void>;
  getActiveSaveId(): Promise<string | null>;

  // Migration and maintenance
  migrate?(): Promise<void>;
  cleanup?(): Promise<void>;
}

/**
 * Save operation result
 */
export interface SaveResult {
  success: boolean;
  layout?: SavedLayout;
  error?: string;
}

/**
 * Load operation result
 */
export interface LoadResult {
  success: boolean;
  error?: string;
}

/**
 * Save modal state
 */
export interface SaveModalState {
  show: boolean;
  mode: 'save' | 'saveAs';
  initialName?: string;
  onSave?: (name: string) => Promise<void>;
  onCancel?: () => void;
}

/**
 * Validation result for save operations
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Chart runtime contracts interface
 */
export interface ChartRuntimeContracts {
  // Symbol management
  getCurrentSymbol(): SymbolKey;
  
  // State collection
  collectGlobalState(): GlobalChartState;
  collectDrawings(symbol: SymbolKey): Drawing[];
  
  // State application
  applyGlobalState(state: GlobalChartState): Promise<void>;
  clearAllDrawings(): void;
  renderDrawings(drawings: Drawing[]): void;
  
  // Event handling
  onSymbolChange(callback: (newSymbol: SymbolKey) => void): void;
  offSymbolChange(callback: (newSymbol: SymbolKey) => void): void;
}

/**
 * Save system events
 */
export interface SaveSystemEvents {
  onSaved: (layout: SavedLayout) => void;
  onLoaded: (layout: SavedLayout) => void;
  onDeleted: (layoutId: string) => void;
  onError: (error: string) => void;
}