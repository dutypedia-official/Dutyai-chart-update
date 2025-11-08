import type { Chart } from 'klinecharts';
import type { OverlayPoint, ScreenPoint, CoordinateContext } from './kline/overlays/overlayTypes';
import { screenToData, dataToScreen } from './kline/overlays/coordinateUtils';
import { getDrawingManager } from './kline/drawingManager';
import { markDirty } from './stores/unsavedChanges';
import type { Drawing } from './kline/saveSystem/types';

/**
 * Data-space point interface for overlay creation
 */
export interface DataSpacePoint {
	timestamp: number;
	value: number;
}

/**
 * Screen coordinate point interface
 */
export interface ScreenCoordinatePoint {
	x: number;
	y: number;
	id?: string;
}

/**
 * Mixed point type that can be either screen coordinates or data-space coordinates
 */
export type MixedPoint = DataSpacePoint | ScreenCoordinatePoint;

/**
 * Overlay configuration interface
 */
export interface OverlayConfig {
	points?: MixedPoint[];
	_isDataSpace?: boolean;
	[key: string]: any;
}

/**
 * Type guard to check if a point is a screen coordinate point
 */
function isScreenCoordinatePoint(point: any): point is ScreenCoordinatePoint {
	return typeof point === 'object' && point !== null && 
		   typeof point.x === 'number' && typeof point.y === 'number';
}

/**
 * Type guard to check if a point is a data-space point
 */
function isDataSpacePoint(point: any): point is DataSpacePoint {
	return typeof point === 'object' && point !== null && 
		   typeof point.timestamp === 'number' && typeof point.value === 'number';
}

/**
 * Type guard to check if an object is an overlay config
 */
function isOverlayConfig(obj: any): obj is OverlayConfig {
	return typeof obj === 'object' && obj !== null;
}

/**
 * Enhanced overlay creation system that stores overlays in data-space coordinates
 * instead of pixel coordinates for viewport-independent persistence
 */
export class OverlayCreationManager {
	private chart: Chart;
	private currentSymbolKey: string | null = null;

	constructor(chart: Chart) {
		this.chart = chart;
	}

		/**
		 * Convert a data-space overlay (timestamp/value) to Drawing format
		 */
		private toDrawing(overlayId: string, dataSpaceOverlay: any): Drawing | null {
			try {
				if (!this.currentSymbolKey) return null;
				const points = Array.isArray(dataSpaceOverlay?.points)
					? dataSpaceOverlay.points
						.map((pt: any) => {
							if (pt && typeof pt === 'object') {
								if (typeof pt.timestamp === 'number' && typeof pt.value === 'number') {
									return { time: pt.timestamp, price: pt.value };
								}
								if (typeof pt.t === 'number' && typeof pt.p === 'number') {
									return { time: pt.t, price: pt.p };
								}
							}
							return null;
						})
						.filter(Boolean)
					: [];
				
				if (points.length === 0) return null;
				
				const name = (dataSpaceOverlay?.name || dataSpaceOverlay?.type || 'unknown') as string;
				const styles = (dataSpaceOverlay?.styles || dataSpaceOverlay?.style || {}) as Record<string, any>;
				const locked = Boolean((dataSpaceOverlay as any)?.lock);
				const visible = (dataSpaceOverlay as any)?.visible !== false;
				
				const drawing: Drawing = {
					id: overlayId,
					symbolKey: this.currentSymbolKey,
					type: name,
					points,
					styles,
					// Preserve extendData such as emoji payloads
					...(dataSpaceOverlay?.extendData ? { extendData: dataSpaceOverlay.extendData } : {}),
					locked,
					visible
				};
				
				return drawing;
			} catch {
				return null;
			}
		}

	/**
	 * Set the current symbol key for new overlays
	 */
	setCurrentSymbolKey(symbolKey: string): void {
		this.currentSymbolKey = symbolKey;
		console.log('📍 OverlayCreationManager symbol set:', symbolKey);
	}

	/**
	 * Get the current symbol key
	 */
	getCurrentSymbolKey(): string | null {
		return this.currentSymbolKey;
	}

	/**
	 * Creates a data-space point from mouse coordinates
	 */
	createPointFromMouse(mouseX: number, mouseY: number): DataSpacePoint | null {
		try {
			const screenPoint: ScreenPoint = { x: mouseX, y: mouseY };
			const context: CoordinateContext = { chart: this.chart };
			const dataPoint = screenToData(screenPoint, context);
			
			if (!dataPoint) {
				return null;
			}

			return {
				timestamp: dataPoint.t,
				value: dataPoint.p
			};
		} catch (error) {
			console.error('Failed to create point from mouse coordinates:', error);
			return null;
		}
	}

	/**
	 * Creates an overlay with data-space coordinates
	 */
	createDataSpaceOverlay(overlayConfig: any): OverlayConfig {
		if (!isOverlayConfig(overlayConfig) || !overlayConfig.points || !Array.isArray(overlayConfig.points)) {
			return overlayConfig;
		}

		// Convert screen points to data-space points
		const dataSpacePoints = overlayConfig.points.map((point: MixedPoint) => {
			if (isScreenCoordinatePoint(point)) {
				// This is a screen coordinate, convert to data-space
				const dataPoint = this.createPointFromMouse(point.x, point.y);
				return dataPoint ? {
					timestamp: dataPoint.timestamp,
					value: dataPoint.value
				} : point;
			} else if (isDataSpacePoint(point)) {
				// Already in data-space format
				return point;
			}
			return point;
		});

		return {
			...overlayConfig,
			points: dataSpacePoints,
			_isDataSpace: true // Flag to identify data-space overlays
		};
	}

	/**
	 * Converts legacy pixel-based overlay to data-space overlay
	 */
	convertLegacyOverlay(overlay: any): OverlayConfig {
		if (!isOverlayConfig(overlay) || overlay._isDataSpace || !overlay.points) {
			return overlay; // Already converted or no points to convert
		}

		const dataSpacePoints = overlay.points.map((point: MixedPoint) => {
			if (isScreenCoordinatePoint(point)) {
				const dataPoint = this.createPointFromMouse(point.x, point.y);
				return dataPoint ? {
					timestamp: dataPoint.timestamp,
					value: dataPoint.value
				} : point;
			}
			return point;
		});

		return {
			...overlay,
			points: dataSpacePoints,
			_isDataSpace: true
		};
	}

	/**
	 * Converts data-space overlay to screen coordinates for rendering
	 */
	projectOverlayToScreen(overlay: any): OverlayConfig {
		if (!isOverlayConfig(overlay) || !overlay._isDataSpace || !overlay.points) {
			return overlay; // Not a data-space overlay or no points
		}

		const screenPoints = overlay.points.map((point: MixedPoint) => {
			if (isDataSpacePoint(point)) {
				const overlayPoint: OverlayPoint = {
					id: (point as any).id || 'temp',
					t: point.timestamp,
					p: point.value
				};
				const context: CoordinateContext = { chart: this.chart };
				const screenPoint = dataToScreen(overlayPoint, context);
				return screenPoint ? {
					x: screenPoint.x,
					y: screenPoint.y
				} : point;
			}
			return point;
		});

		return {
			...overlay,
			points: screenPoints
		};
	}

	/**
	 * Adds an overlay to the chart using data-space coordinates
	 */
	addOverlay(overlayConfig: any): string | null {
		try {
			const dataSpaceOverlay = this.createDataSpaceOverlay(overlayConfig);
			const screenOverlay = this.projectOverlayToScreen(dataSpaceOverlay);
			
			// Store the data-space version for persistence
			const overlayId = this.chart.createOverlay(screenOverlay as any);
			
      if (overlayId) {
				const id = Array.isArray(overlayId) ? overlayId[0] : overlayId;
				if (typeof id === 'string') {
						// Sync with DrawingManager (symbol-scoped), skip localStorage persistence
						// Sync to DrawingManager so symbol changes correctly show/hide drawings
						const dm = getDrawingManager();
						if (dm) {
							const drawing = this.toDrawing(id, dataSpaceOverlay);
							if (drawing) {
								dm.addDrawing(drawing);
								// Mark unsaved since a new overlay was created
								try { markDirty(); } catch {}
							}
						}
				}
				return id;
			}
			
			return null;
		} catch (error) {
			console.error('Failed to add overlay:', error);
			return null;
		}
	}

	/**
	 * Stores data-space overlay for persistence
	 */
	private storeDataSpaceOverlay(overlayId: string, overlay: OverlayConfig): void {
		// No-op to disable localStorage persistence for overlays
		return;
	}

	/**
	 * Retrieves stored data-space overlay
	 */
	getStoredDataSpaceOverlay(overlayId: string): OverlayConfig | null {
		try {
			const stored = localStorage.getItem('dataSpaceOverlays');
			if (!stored) return null;
			
			const overlays = JSON.parse(stored);
			return overlays[overlayId] || null;
		} catch (error) {
			console.error('Failed to retrieve data-space overlay:', error);
			return null;
		}
	}

	/**
	 * Removes stored data-space overlay
	 */
	removeStoredDataSpaceOverlay(overlayId: string): void {
		try {
			// Remove from DrawingManager so it stops rendering on symbol change
			const dm = getDrawingManager();
			if (dm) {
				dm.removeDrawing(overlayId);
				// Mark unsaved since a drawing was removed
				try { markDirty(); } catch {}
			}
		} catch (error) {
			console.error('Failed to remove overlay from DrawingManager:', error);
		}
	}
}

/**
 * Global instance for overlay creation management
 */
let overlayCreationManager: OverlayCreationManager | null = null;

/**
 * Initialize the overlay creation manager
 */
export function initializeOverlayCreation(chart: Chart): OverlayCreationManager {
	overlayCreationManager = new OverlayCreationManager(chart);
	return overlayCreationManager;
}

/**
 * Get the current overlay creation manager instance
 */
export function getOverlayCreationManager(): OverlayCreationManager | null {
	return overlayCreationManager;
}