<script lang="ts">
import type {OverlayEvent} from 'klinecharts';
import {OverlayMode, LineType} from 'klinecharts';
import { getContext, onMount, onDestroy } from 'svelte';
import type { Chart } from 'klinecharts'
import {ChartSave} from './chart';
import type {Writable} from 'svelte/store';
import { writable } from 'svelte/store';
import KlineIcon from './icon.svelte';
import type {Nullable} from 'klinecharts';
import * as m from '$lib/paraglide/messages.js'
import {derived} from 'svelte/store';
import type {ChartCtx} from './chart';
import _ from 'lodash';
import { overlayMap } from './overlays'
import ColorPicker from '../ColorPicker.svelte';
import { undoRedoManager } from './undoRedoManager';
import EmojiPicker from './EmojiPicker.svelte';
import FibonacciSettingsModal from '../components/FibonacciSettingsModal.svelte';
import { normalizeSymbolKey } from './saveSystem/chartStateCollector';
import type { Drawing } from './saveSystem/types';
import { markDirty } from '$lib/stores/unsavedChanges';

let popoverKey = $state('');
let modeIcon = $state('weakMagnet')
let mode = $state('normal')
let lock = $state(false)
let visiable = $state(true)
let hisLays: string[] = $state([])  // 按创建顺序，记录所有overlay，方便删除
let selectDraw = $state('')
let activeOverlayId = $state<string | null>(null)  // Track currently active overlay being created
let selectedOverlayCoords = $state<{x: number, y: number} | null>(null)
let showDeleteButton = $state(false)
let showContextMenu = $state(false)
let selectedOverlay = $state<any>(null)
let contextMenuStyles = $state({
  // Store thickness as string so it binds cleanly to the <select> options
  thickness: '3',
  style: 'solid',
  color: '#1677FF',
  opacity: 100
})

// Drag functionality for context menu
let isDragging = $state(false)
let dragOffset = $state({ x: 0, y: 0 })
let contextMenuPosition = $state<{x: number, y: number} | null>(null)
// Track last time user interacted with the floating panel (e.g., dragging)
let lastPanelInteractionAt = $state(0)

// Clone and Copy functionality
let copiedOverlay = $state<any>(null)
let isCloning = $state(false)
let showMoreOptions = $state(false)

let savedContextMenuPosition = $state<{x: number, y: number} | null>(null)
// Timestamp to debounce chart background clicks right after overlay selection
let lastOverlaySelectAt = 0

// Color picker state
let showColorPicker = $state(false)

// Emoji picker state
let showEmojiPicker = $state(false)
let emojiPickerPosition = $state({ x: 0, y: 0 })
let colorPickerPosition = $state({ x: 0, y: 0 })

// Scroll arrow state for vertical scrolling
let showScrollArrow = $state(false)
let drawbarContainerRef = $state<HTMLDivElement>()

// Fibonacci settings state
let showFibonacciSettings = $state(false)
let fibonacciLevels = $state([
  // Standard levels (visible by default)
  { value: 0, visible: true, color: '#FF6B6B' },
  { value: 0.236, visible: true, color: '#4ECDC4' },
  { value: 0.382, visible: true, color: '#45B7D1' },
  { value: 0.5, visible: true, color: '#96CEB4' },
  { value: 0.618, visible: true, color: '#FFEAA7' },
  { value: 1, visible: true, color: '#98D8C8' },
  { value: 1.618, visible: true, color: '#85C1E9' },
  // Additional levels (hidden by default)
  { value: 0.786, visible: false, color: '#DDA0DD' },
  { value: 1.272, visible: false, color: '#F7DC6F' },
  { value: 1.414, visible: false, color: '#BB8FCE' },
  { value: 2, visible: false, color: '#FFB6C1' },
  { value: 2.272, visible: false, color: '#98FB98' },
  { value: 2.414, visible: false, color: '#F0E68C' },
  { value: 2.618, visible: false, color: '#F8C471' },
  { value: 3, visible: false, color: '#DEB887' },
  { value: 3.618, visible: false, color: '#CD853F' },
  { value: 4, visible: false, color: '#D2691E' },
  { value: 4.236, visible: false, color: '#A0522D' },
  { value: 4.272, visible: false, color: '#8B4513' },
  { value: 4.618, visible: false, color: '#654321' }
])
let originalFibonacciLevels = $state([
  // Standard levels (visible by default)
  { value: 0, visible: true, color: '#FF6B6B' },
  { value: 0.236, visible: true, color: '#4ECDC4' },
  { value: 0.382, visible: true, color: '#45B7D1' },
  { value: 0.5, visible: true, color: '#96CEB4' },
  { value: 0.618, visible: true, color: '#FFEAA7' },
  { value: 1, visible: true, color: '#98D8C8' },
  { value: 1.618, visible: true, color: '#85C1E9' },
  // Additional levels (hidden by default)
  { value: 0.786, visible: false, color: '#DDA0DD' },
  { value: 1.272, visible: false, color: '#F7DC6F' },
  { value: 1.414, visible: false, color: '#BB8FCE' },
  { value: 2, visible: false, color: '#FFB6C1' },
  { value: 2.272, visible: false, color: '#98FB98' },
  { value: 2.414, visible: false, color: '#F0E68C' },
  { value: 2.618, visible: false, color: '#F8C471' },
  { value: 3, visible: false, color: '#DEB887' },
  { value: 3.618, visible: false, color: '#CD853F' },
  { value: 4, visible: false, color: '#D2691E' },
  { value: 4.236, visible: false, color: '#A0522D' },
  { value: 4.272, visible: false, color: '#8B4513' },
  { value: 4.618, visible: false, color: '#654321' }
])

// Chart container reference for relative positioning
let chartContainer: HTMLElement | null = null

// Function to get chart container bounds with improved detection
function getChartContainerBounds() {
  if (!chartContainer) {
    // Try multiple selectors to find the chart container
    chartContainer = document.querySelector('.chart-container') || 
                    document.querySelector('[data-chart-container]') || 
                    document.querySelector('.kline-chart') ||
                    document.querySelector('#chart') ||
                    document.querySelector('canvas')?.parentElement ||
                    document.body
  }
  
  const bounds = chartContainer?.getBoundingClientRect()
  if (!bounds) {
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
  }
  
  // Add some padding to ensure menu doesn't touch edges
  const padding = 10
  return { 
    left: bounds.left + padding, 
    top: bounds.top + padding, 
    width: bounds.width - (padding * 2), 
    height: bounds.height - (padding * 2) 
  }
}

// Function to update context menu position relative to chart
function updateContextMenuPosition() {
  if (!showContextMenu || !selectedOverlay || !contextMenuPosition) return
  
  // Get current overlay position
  if (selectedOverlay.points && selectedOverlay.points.length > 0) {
    const firstPoint = selectedOverlay.points[0]
    const coords = $chart?.convertToPixel(firstPoint, { paneId: 'candle_pane' })
    
    if (coords && typeof coords === 'object' && 'x' in coords && 'y' in coords && coords.x !== undefined && coords.y !== undefined) {
      const chartBounds = getChartContainerBounds()
      
      // Responsive menu dimensions based on screen size
      const isMobile = window.innerWidth <= 768
      const menuWidth = isMobile ? Math.min(250, window.innerWidth - 40) : 300
      const menuHeight = isMobile ? 40 : 60
      
      // Calculate position relative to chart container with smart positioning
      let relativeX = coords.x - 80
      let relativeY = coords.y - 30
      
      // Smart positioning: if menu would go outside bounds, position it differently
      if (relativeX + menuWidth > chartBounds.width) {
        relativeX = coords.x - menuWidth + 20 // Position to the left of the point
      }
      if (relativeY + menuHeight > chartBounds.height) {
        relativeY = coords.y - menuHeight - 10 // Position above the point
      }
      
      // Ensure menu stays within chart bounds with minimum margins
      const minMargin = isMobile ? 5 : 10
      const finalX = Math.max(minMargin, Math.min(relativeX, chartBounds.width - menuWidth - minMargin))
      const finalY = Math.max(minMargin, Math.min(relativeY, chartBounds.height - menuHeight - minMargin))
      
      contextMenuPosition = { x: finalX, y: finalY }
    }
  }
}

// Function to update color picker position
function updateColorPickerPosition() {
  if (!showColorPicker) return
  
  const chartBounds = getChartContainerBounds()
  const pickerWidth = 320
  const pickerHeight = 400
  
  // Keep color picker within bounds
  colorPickerPosition = {
    x: Math.max(10, Math.min(colorPickerPosition.x, chartBounds.width - pickerWidth)),
    y: Math.max(10, Math.min(colorPickerPosition.y, chartBounds.height - pickerHeight))
  }
}
 
 // Submenu scroll action to prevent page scrolling when scrolling submenu
function submenuScroll(node: HTMLElement) {
  function handleWheel(event: WheelEvent) {
    // Check if the submenu can scroll further
    const canScrollUp = node.scrollTop > 0
    const canScrollDown = node.scrollTop < node.scrollHeight - node.clientHeight
    
    // Only prevent default if we're at the scroll boundaries
    if ((event.deltaY < 0 && !canScrollUp) || (event.deltaY > 0 && !canScrollDown)) {
      event.preventDefault()
    }
    // Always stop propagation to prevent page scrolling
    event.stopPropagation()
  }
  
  function handleTouchMove(event: TouchEvent) {
    // Always prevent page scrolling on touch devices
    event.preventDefault()
    event.stopPropagation()
  }
  
  // Add event listeners
  node.addEventListener('wheel', handleWheel, { passive: false, capture: true })
  node.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
  
  return {
    destroy() {
      node.removeEventListener('wheel', handleWheel, { capture: true })
      node.removeEventListener('touchmove', handleTouchMove, { capture: true })
    }
  }
}
 
 // Window resize handler for responsive positioning
function handleWindowResize() {
  if (showContextMenu && selectedOverlay && contextMenuPosition) {
    // Recalculate position when window resizes
    if (selectedOverlay.points && selectedOverlay.points.length > 0) {
      const firstPoint = selectedOverlay.points[0]
      const coords = $chart?.convertToPixel(firstPoint, { paneId: 'candle_pane' })
      
      if (coords && typeof coords === 'object' && 'x' in coords && 'y' in coords && coords.x !== undefined && coords.y !== undefined) {
        // Ensure menu stays within new viewport bounds
        const menuWidth = 300
        const menuHeight = 200
        
        const finalX = Math.max(10, Math.min(coords.x - 80, window.innerWidth - menuWidth))
        const finalY = Math.max(10, Math.min(coords.y - 30, window.innerHeight - menuHeight))
        
        contextMenuPosition = { x: finalX, y: finalY }
      }
    }
  }
  
  if (showColorPicker) {
    // Keep color picker within new bounds
    const pickerWidth = 320
    const pickerHeight = 400
    
    colorPickerPosition = {
      x: Math.max(10, Math.min(colorPickerPosition.x, window.innerWidth - pickerWidth)),
      y: Math.max(10, Math.min(colorPickerPosition.y, window.innerHeight - pickerHeight))
    }
  }
}

// Load saved context menu position from localStorage
function loadSavedPosition() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('contextMenuPosition')
    if (saved) {
      try {
        savedContextMenuPosition = JSON.parse(saved)
      } catch (e) {
        console.log('Error loading saved position:', e)
      }
    }
  }
}

// Save context menu position to localStorage
function savePosition(position: {x: number, y: number}) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('contextMenuPosition', JSON.stringify(position))
    savedContextMenuPosition = position
  }
}

const lineStyles = [
  { key: 'solid', name: 'Solid', pattern: '────────' },
  { key: 'dashed', name: 'Dashed', pattern: '── ── ──' },
  { key: 'dotted', name: 'Dotted', pattern: '· · · · · ·' }
]

const colorPresets = [
  '#1677FF', '#FF4D4F', '#52C41A', '#FAAD14', 
  '#722ED1', '#13C2C2', '#FA541C', '#F759AB',
  '#2F54EB', '#389E0D', '#D4380D', '#7CB305'
]

const GROUP_ID = 'drawing_tools'

const save = getContext('save') as Writable<ChartSave>
const ctx = getContext('ctx') as Writable<ChartCtx>
const chart = getContext('chart') as Writable<Nullable<Chart>>
// Ephemeral in-memory overlays store (do not persist)
const overlays = writable<Record<string, Record<string, unknown>>>({})
const drawingManagerContext = getContext('drawingManager') as { get: () => any | null }

// Undo/Redo state
const undoRedoState = undoRedoManager.getState()
let canUndo = $state(false)
let canRedo = $state(false)

// Update undo/redo availability
$effect(() => {
  const state = $undoRedoState
  canUndo = state.undoStack.length > 0
  canRedo = state.redoStack.length > 0
})

// Initialize undo/redo manager when chart is available
$effect(() => {
  if ($chart) {
    undoRedoManager.init({ 
      chart: $chart, 
      saveStore: save, 
      overlaysStore: overlays 
    })
  }
})

function getOverlayKey(overlayId: string): string {
  const sym = $save.symbol;
  const symbol = sym.shortName ?? sym.name ?? sym.ticker;
  return `${symbol}_${$save.period.timeframe}_${overlayId}`
}

const singleLineOpts = [
  { key: 'segment', text: 'segment' },
  { key: 'arrow', text: 'arrow' },
  { key: 'rayLine', text: 'ray_line' },
  { key: 'straightLine', text: 'straight_line' },
  { key: 'priceLine', text: 'price_line' },
  { key: 'horizontalStraightLine', text: 'horizontal_straight_line' },
  { key: 'horizontalRayLine', text: 'horizontal_ray_line' },
  { key: 'horizontalSegment', text: 'horizontal_segment' },
  { key: 'verticalStraightLine', text: 'vertical_straight_line' },
  { key: 'verticalRayLine', text: 'vertical_ray_line' },
  { key: 'verticalSegment', text: 'vertical_segment' },
]

const moreLineOpts = [
  { key: 'priceChannelLine', text: 'price_channel_line' },
  { key: 'parallelStraightLine', text: 'parallel_straight_line' }
]

const polygonOpts = [
  { key: 'circle', text: 'circle' },
  { key: 'rect', text: 'rect' },
  { key: 'parallelogram', text: 'parallelogram' },
  { key: 'triangle', text: 'triangle' }
]

const fibonacciOpts = [
  { key: 'fibonacciSegment', text: 'fibonacci_segment' },
  { key: 'fibonacciCircle', text: 'fibonacci_circle' },
  { key: 'fibonacciSpiral', text: 'fibonacci_spiral' },
  { key: 'fibonacciSpeedResistanceFan', text: 'fibonacci_speed_resistance_fan' },
  { key: 'fibonacciExtension', text: 'fibonacci_extension' },
  { key: 'gannBox', text: 'gann_box' }
]

const waveOpts = [
  { key: 'xabcd', text: 'xabcd' },
  { key: 'abcd', text: 'abcd' },
  { key: 'threeWaves', text: 'three_waves' },
  { key: 'fiveWaves', text: 'five_waves' },
  { key: 'eightWaves', text: 'eight_waves' },
  { key: 'anyWaves', text: 'any_waves' },
]

const subMenu = $state([
  { key: 'single-line', icon: 'segment', list: singleLineOpts },
  { key: 'more-line', icon: 'priceChannelLine', list: moreLineOpts },
  { key: 'polygon', icon: 'circle', list: polygonOpts },
  { key: 'fibonacci', icon: 'fibonacciSegment', list: fibonacciOpts },
  { key: 'wave', icon: 'xabcd', list: waveOpts },
  { key: 'emoji', icon: 'emoji', list: [] }
])

const modes = $state([
  { key: 'weakMagnet', text: 'weakMagnet' },
  { key: 'strongMagnet', text: 'strongMagnet' }
])

function clickPopoverKey(val: string){
  if (popoverKey == val){
    popoverKey = ""
  }else{
    popoverKey = val
  }
}

export function addOverlay(data: any){
  let moved = false;
  const overlayClass = overlayMap[data.name] ?? {}
  const defData = {
    groupId: GROUP_ID,
    onDrawEnd: (event: OverlayEvent<unknown>) => {
      if(overlayClass.onDrawEnd){
        overlayClass.onDrawEnd(event)
      }
      // Save the overlay data
      editOverlay(event.overlay)
      
      // Record overlay addition for undo/redo
      const overlayKey = getOverlayKey(event.overlay.id)
      undoRedoManager.recordAddOverlay(event.overlay.id, event.overlay, overlayKey)
      
      // Clear active overlay ID since drawing is complete
      if (activeOverlayId === event.overlay.id) {
        activeOverlayId = null
      }
      
      return true
    },
    onPressedMoving: (event: OverlayEvent<unknown>) => {
      if(overlayClass.onPressedMoving){
        overlayClass.onPressedMoving(event)
      }
      moved = true;
      return false
    },
    onPressedMoveEnd: (event: OverlayEvent<unknown>) => {
      if(!moved)return true
      moved = false
      editOverlay(event.overlay)
      
      // Update delete button position if this overlay is selected
      if (selectDraw === event.overlay.id && event.overlay.points && event.overlay.points.length > 0) {
        const firstPoint = event.overlay.points[0]
        // Use the overlay's actual paneId instead of hardcoded 'candle_pane'
        const paneId = (event.overlay as any).paneId || 'candle_pane'
        const coords = $chart?.convertToPixel(firstPoint, { paneId })
        if (coords && typeof coords === 'object' && 'x' in coords && 'y' in coords && coords.x !== undefined && coords.y !== undefined) {
          selectedOverlayCoords = { x: coords.x - 80, y: coords.y - 30 }
        }
      }
      return true
    },
    onSelected: (event: OverlayEvent<unknown>) => {
      if(overlayClass.onSelected){
        overlayClass.onSelected(event)
      }
      // Prevent immediate hide from chart click debouncer on desktop
      lastOverlaySelectAt = Date.now()
      selectDraw = event.overlay.id
      selectedOverlay = event.overlay
      
      // Set current styles from selected overlay
      if (event.overlay.styles?.line) {
        const lineStyles = event.overlay.styles.line
        contextMenuStyles.thickness = String(lineStyles.size || 2)
        contextMenuStyles.color = lineStyles.color || '#1677FF'
        contextMenuStyles.style = lineStyles.style === LineType.Dashed ? 'dashed' : 'solid'
      }
      
      // Show context menu near the selected overlay
      if (event.overlay.points && event.overlay.points.length > 0) {
        const firstPoint = event.overlay.points[0]
        // Use the overlay's actual paneId instead of hardcoded 'candle_pane'
        const paneId = (event.overlay as any).paneId || 'candle_pane'
        const coords = $chart?.convertToPixel(firstPoint, { paneId })
        if (coords && typeof coords === 'object' && 'x' in coords && 'y' in coords && coords.x !== undefined && coords.y !== undefined) {
          selectedOverlayCoords = { x: coords.x - 80, y: coords.y - 30 }
          
          // Use saved position if available, otherwise use default position
          if (savedContextMenuPosition) {
            contextMenuPosition = { ...savedContextMenuPosition }
          } else {
            contextMenuPosition = { x: coords.x - 80, y: coords.y - 30 }
          }
          
          showContextMenu = true
          showDeleteButton = false
          // Load current overlay styles
            if (event.overlay.styles && event.overlay.styles.line) {
              contextMenuStyles.thickness = String(event.overlay.styles.line.size || 1)
              contextMenuStyles.color = event.overlay.styles.line.color || '#1677FF'
              
              // Determine style based on LineType and dashedValue
              if (event.overlay.styles.line.style === LineType.Dashed) {
                const dashedValue = event.overlay.styles.line.dashedValue
                if (dashedValue && dashedValue[0] === 2 && dashedValue[1] === 8) {
                  contextMenuStyles.style = 'dotted'
                } else {
                  contextMenuStyles.style = 'dashed'
                }
              } else {
                contextMenuStyles.style = 'solid'
              }
            }
        }
      }
      return true;
    },
    onDeselected: (event: OverlayEvent<unknown>) => {
      if(overlayClass.onDeselected){
        overlayClass.onDeselected(event)
      }
      selectDraw = ''
      showDeleteButton = false
      showContextMenu = false
      showMoreOptions = false
      selectedOverlayCoords = null
      selectedOverlay = null
      return true;
    },
    onRemoved: (event: OverlayEvent<unknown>) => {
      if(overlayClass.onRemoved){
        overlayClass.onRemoved(event)
      }
      overlays.update(ol => {
        delete ol[getOverlayKey(event.overlay.id)]
        return ol
      })
      
      // Sync with DrawingManager
      const drawingManager = drawingManagerContext.get()
      if (drawingManager) {
        try {
          drawingManager.removeDrawing(event.overlay.id)
          console.log('🗑️ Removed drawing from DrawingManager:', event.overlay.id)
          // Mark unsaved changes
          markDirty();
        } catch (error) {
          console.error('Error removing drawing from DrawingManager:', error)
        }
      }
      
      return true
    }
  }
  // 合并时保留原有的事件处理器
  const layId = $chart?.createOverlay(_.mergeWith({}, defData, data, (objValue, srcValue, key) => {
    if (key.startsWith('on') && objValue && srcValue) {
      return (event: OverlayEvent<unknown>) => {
        srcValue(event)
        return objValue(event)
      }
    }
  }))
  if(layId){
    if(Array.isArray(layId)){
      hisLays.push(...(layId as string[]))
      // Set the first overlay as active if it's being created
      if ((layId as string[]).length > 0) {
        activeOverlayId = (layId as string[])[0]
      }
    }
    else{
      hisLays.push(layId as string)
      // Set this overlay as active since it's being created
      activeOverlayId = layId as string
    }
  }
  return layId;
}

function startOverlay(val: string){
  // Convert contextMenuStyles to overlay styles format
  let lineStyle = LineType.Solid
  let dashedValue = [8, 4] // Default dashed pattern
  
  if (contextMenuStyles.style === 'dashed') {
    lineStyle = LineType.Dashed
    dashedValue = [8, 4]
  } else if (contextMenuStyles.style === 'dotted') {
    lineStyle = LineType.Dashed // KLineCharts doesn't have dotted, use dashed with small pattern
    dashedValue = [2, 6]
  }
  
  // Ensure numeric thickness for KLineCharts
  const numericThickness = Number(contextMenuStyles.thickness) || 1

  const overlayStyles = {
    line: {
      size: numericThickness,
      color: contextMenuStyles.color,
      style: lineStyle,
      dashedValue: dashedValue
    },
    text: {
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 100, 255, 0.7)',
      borderColor: '#FFFFFF'
    },
    polygon: {
      color: contextMenuStyles.color + '20' // Add 20% opacity
    }
  }
  
  addOverlay({
    name: val,
    visible: visiable,
    lock: lock,
    mode: mode as OverlayMode,
    styles: overlayStyles
  })
}


function clickSubPopover(index: number, value: string){
  subMenu[index].icon = value;
  startOverlay(value)
  popoverKey = '';
}

function clickMode(){
  let cur_mode = modeIcon
  if (mode !== 'normal') {
    cur_mode = 'normal'
  }
  mode = cur_mode;
  $chart?.overrideOverlay({ mode: cur_mode as OverlayMode })
}

function clickSubMode(value: string){
  modeIcon = value;
  mode = value;
  popoverKey = '';
  $chart?.overrideOverlay({ mode: value as OverlayMode })
}

function getSubmenuPosition(key: string): number {
  // Calculate position based on button index
  const buttonHeight = 52; // Approximate height of each button including divider
  let index = 0;
  
  if (key === 'crosshair') index = 0;
  else if (subMenu.find(item => item.key === key)) {
    index = 1 + subMenu.findIndex(item => item.key === key);
  } else if (key === 'ruler') {
    index = 1 + subMenu.length + 1;
  } else if (key === 'mode') {
    index = 1 + subMenu.length + 2;
  } else if (key === 'lock') {
    index = 1 + subMenu.length + 3;
  } else if (key === 'visible') {
    index = 1 + subMenu.length + 4;
  } else if (key === 'remove') {
    index = 1 + subMenu.length + 5;
  }
  
  return index * buttonHeight;
}

function toggleLock(){
  lock = !lock;
  $chart?.overrideOverlay({ lock: lock });
}

function toggleVisiable(){
  visiable = !visiable
  $chart?.overrideOverlay({ visible: visiable })
}

function resetToCrosshair() {
  // Reset to normal crosshair mode
  mode = 'normal'
  modeIcon = 'weakMagnet'
  
  // Remove any active overlay being created
  if (activeOverlayId) {
    $chart?.removeOverlay({ id: activeOverlayId })
    // Remove from history as well
    const index = hisLays.indexOf(activeOverlayId)
    if (index > -1) {
      hisLays.splice(index, 1)
    }
    activeOverlayId = null
  }
  
  // Stop any active overlay creation by setting mode to normal
  $chart?.overrideOverlay({ mode: OverlayMode.Normal })
  
  // Close any open popovers
  popoverKey = ''
  
  // Hide context menu if open
  showContextMenu = false
  showDeleteButton = false
  showMoreOptions = false
  selectedOverlayCoords = null
  selectedOverlay = null
  
  // Deselect any currently selected overlay
  selectDraw = ''
}

export function clickRemove(){
  let args: any = { groupId: GROUP_ID };
  let overlayToRemove = null
  
  if(selectDraw){
    args['id'] = selectDraw
    overlayToRemove = selectedOverlay
  }
  else if(hisLays.length > 0){
    const overlayId = hisLays.pop()
    args['id'] = overlayId
    // Try to get overlay data before removal
     if (overlayId && $chart) {
       const overlays = $chart.getOverlays({ id: overlayId })
       if (overlays && overlays.length > 0) {
         overlayToRemove = overlays[0]
       }
     }
  }
  
  // Record overlay removal for undo/redo before actually removing
  if (overlayToRemove) {
    const overlayKey = getOverlayKey(overlayToRemove.id)
    undoRedoManager.recordRemoveOverlay(overlayToRemove.id, overlayToRemove, overlayKey)
  }
  
  $chart?.removeOverlay(args)
  showContextMenu = false
  showDeleteButton = false
  showMoreOptions = false
  selectedOverlayCoords = null
  selectedOverlay = null
}

function updateOverlayStyles() {
  if (!selectedOverlay || !$chart) return
  
  // Normalize thickness to number
  const numericThickness = Number(contextMenuStyles.thickness) || 1
  let lineStyle = LineType.Solid
  let dashedValue = [8, 4] // Default dashed pattern
  
  if (contextMenuStyles.style === 'dashed') {
    lineStyle = LineType.Dashed
    dashedValue = [8, 4]
  } else if (contextMenuStyles.style === 'dotted') {
    lineStyle = LineType.Dashed // KLineCharts doesn't have dotted, use dashed with small pattern
    dashedValue = [2, 6]
  }
  
  // Convert opacity percentage to hex (0-100% to 00-FF)
  const opacityHex = Math.round((contextMenuStyles.opacity / 100) * 255).toString(16).padStart(2, '0')
  const colorWithOpacity = contextMenuStyles.color + opacityHex
  
  const newStyles = {
    line: {
      size: numericThickness,
      color: colorWithOpacity,
      style: lineStyle,
      dashedValue: dashedValue
    },
    // Force text color to always be white for visibility
    text: {
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 100, 255, 0.7)',
      borderColor: '#FFFFFF'
    },
    // Update polygon fill color with transparency
    polygon: {
      color: colorWithOpacity
    }
  }
  
  try {
    $chart.overrideOverlay({
      id: selectedOverlay.id,
      styles: newStyles
    })
  } catch (e) {
    // Handle API compatibility issues
    console.log('Error updating overlay styles:', e)
  }
  
  // Update stored overlay data
  editOverlay({
    ...selectedOverlay,
    styles: { ...selectedOverlay.styles, ...newStyles }
  })
}

// Drag functionality for context menu
function startDrag(e: MouseEvent | TouchEvent) {
  isDragging = true
  lastPanelInteractionAt = Date.now()
  
  // Handle both mouse and touch events
  const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX
  const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY
  
  const rect = (e.target as HTMLElement).closest('.context-menu-container')?.getBoundingClientRect()
  if (rect) {
    // Use actual rendered panel position (viewport coords) for precise grab offset
    dragOffset.x = clientX - rect.left
    dragOffset.y = clientY - rect.top
  } else if (contextMenuPosition) {
    // Fallback to stored position
    dragOffset.x = clientX - contextMenuPosition.x
    dragOffset.y = clientY - contextMenuPosition.y
  }
  e.preventDefault()
  // Prevent bubbling to chart container which could be interpreted as a click
  if (e.stopPropagation) (e as any).stopPropagation()
}

function onMouseMove(e: MouseEvent | TouchEvent) {
  if (isDragging && contextMenuPosition) {
    lastPanelInteractionAt = Date.now()
    // Handle both mouse and touch events
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY
    
    // Responsive menu dimensions
    const isMobile = window.innerWidth <= 768
    const menuWidth = isMobile ? Math.min(250, window.innerWidth - 40) : 300
    const menuHeight = isMobile ? 40 : 60
    const minMargin = isMobile ? 5 : 10
    
    const chartRect = chartContainer?.getBoundingClientRect()
    // Compute desired viewport-fixed position directly under cursor
    let desiredLeft = clientX - dragOffset.x
    let desiredTop = clientY - dragOffset.y
    
    // Constrain within chart viewport bounds
    const minX = (chartRect?.left || 0) + minMargin
    const maxX = (chartRect ? chartRect.right : window.innerWidth) - menuWidth - minMargin
    const minY = (chartRect?.top || 0) + minMargin
    const maxY = (chartRect ? chartRect.bottom : window.innerHeight) - menuHeight - minMargin
    
    contextMenuPosition.x = Math.max(minX, Math.min(desiredLeft, maxX))
    contextMenuPosition.y = Math.max(minY, Math.min(desiredTop, maxY))
  }
}

function stopDrag() {
  if (isDragging && contextMenuPosition) {
    savePosition(contextMenuPosition)
  }
  isDragging = false
  lastPanelInteractionAt = Date.now()
}

// Touch event handlers
function startTouchDrag(e: TouchEvent) {
  startDrag(e)
}

function onTouchMove(e: TouchEvent) {
  onMouseMove(e)
}

function stopTouchDrag() {
  stopDrag()
}

// Color picker functions
function openColorPicker(event: MouseEvent) {
  event.stopPropagation()
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  colorPickerPosition = {
    x: Math.max(10, Math.min(rect.left, window.innerWidth - 320)), // 320px is color picker width
    y: Math.max(10, Math.min(rect.bottom + 5, window.innerHeight - 400)) // 400px estimated height
  }
  showColorPicker = true
}

function handleColorChange(event: CustomEvent) {
  contextMenuStyles.color = event.detail
  updateOverlayStyles()
}

function handleOpacityChange(event: CustomEvent) {
  contextMenuStyles.opacity = event.detail
  updateOverlayStyles()
}

function closeColorPicker() {
  showColorPicker = false
}

// Undo/Redo functions
function handleUndo() {
  const success = undoRedoManager.undo()
  if (success) {
    console.log('Undo successful')
  } else {
    console.log('Nothing to undo')
  }
}

function handleRedo() {
  const success = undoRedoManager.redo()
  if (success) {
    console.log('Redo successful')
  } else {
    console.log('Nothing to redo')
  }
}

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  // Check for Ctrl+Z (Undo)
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    handleUndo()
  }
  // Check for Ctrl+Y or Ctrl+Shift+Z (Redo)
  else if (((event.ctrlKey || event.metaKey) && event.key === 'y') || 
           ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')) {
    event.preventDefault()
    handleRedo()
  }
  // Delete selected overlay with Delete/Backspace
  else if ((event.key === 'Delete' || event.key === 'Backspace') && selectDraw) {
    event.preventDefault()
    clickRemove()
  }
  // Check for Ctrl+C (Copy)
  else if ((event.ctrlKey || event.metaKey) && event.key === 'c' && selectedOverlay) {
    event.preventDefault()
    copyOverlay()
  }
  // Check for Ctrl+V (Paste)
  else if ((event.ctrlKey || event.metaKey) && event.key === 'v' && copiedOverlay) {
    event.preventDefault()
    pasteOverlay(event)
  }
}

// Clone functionality - creates a duplicate with slight offset
function cloneOverlay() {
  if (!selectedOverlay || !$chart) return
  
  isCloning = true
  
  try {
    // Create a deep copy of the overlay data
    const clonedData = JSON.parse(JSON.stringify(selectedOverlay))
    
    // Generate new ID for the clone
    const timestamp = Date.now()
    clonedData.id = `${selectedOverlay.name}_clone_${timestamp}`
    
    // Add slight offset to the clone points to make it visible
    if (clonedData.points && Array.isArray(clonedData.points)) {
      clonedData.points = clonedData.points.map((point: any) => {
        if (point && typeof point === 'object') {
          return {
            ...point,
            timestamp: point.timestamp ? point.timestamp + (1000 * 60 * 5) : point.timestamp, // 5 minutes offset
            value: point.value ? point.value * 1.002 : point.value // 0.2% price offset
          }
        }
        return point
      })
    }
    
    // Create the cloned overlay using addOverlay to ensure proper event handlers
    const cloneId = addOverlay(clonedData)
    
    if (cloneId) {
      // Handle nullable string types
      const actualId = Array.isArray(cloneId) ? cloneId[0] : cloneId
      if (actualId) {
        // Store in overlays for persistence (already done in addOverlay)
        const overlayKey = getOverlayKey(actualId)
        
        // Record for undo/redo
        undoRedoManager.recordAddOverlay(actualId, clonedData, overlayKey)
        
        // Auto-select the cloned overlay to show floating menu
        setTimeout(() => {
          const clonedOverlay = $chart.getOverlays({ id: actualId })[0]
          if (clonedOverlay) {
            selectDraw = actualId
            selectedOverlay = clonedOverlay
            
            // Set current styles from cloned overlay
            if (clonedOverlay.styles?.line) {
              const lineStyles = clonedOverlay.styles.line
              contextMenuStyles.thickness = String(lineStyles.size || 2)
              contextMenuStyles.color = lineStyles.color || '#1677FF'
              contextMenuStyles.style = lineStyles.style === LineType.Dashed ? 'dashed' : 'solid'
            }
            
            // Show context menu near the cloned overlay
            if (clonedOverlay.points && clonedOverlay.points.length > 0) {
              const firstPoint = clonedOverlay.points[0]
              const coords = $chart?.convertToPixel(firstPoint, { paneId: 'candle_pane' })
              if (coords && typeof coords === 'object' && 'x' in coords && 'y' in coords && coords.x !== undefined && coords.y !== undefined) {
                selectedOverlayCoords = { x: coords.x - 80, y: coords.y - 30 }
                
                // Use saved position if available, otherwise use default position
                if (savedContextMenuPosition) {
                  contextMenuPosition = { ...savedContextMenuPosition }
                } else {
                  contextMenuPosition = { x: coords.x - 80, y: coords.y - 30 }
                }
                
                showContextMenu = true
                showDeleteButton = false
                showMoreOptions = false // Reset more options dropdown
              }
            }
          }
        }, 100) // Small delay to ensure overlay is fully created
      }
      
      console.log('Overlay cloned successfully')
    }
  } catch (error) {
    console.error('Error cloning overlay:', error)
  } finally {
    isCloning = false
  }
}

// Copy functionality - stores overlay data for pasting
function copyOverlay() {
  if (!selectedOverlay) return
  
  try {
    // Create a deep copy of the overlay data for clipboard
    copiedOverlay = JSON.parse(JSON.stringify(selectedOverlay))
    console.log('Overlay copied to clipboard')
    
    // Optional: Show visual feedback
    showContextMenu = false
    
    // Show temporary feedback (you could add a toast notification here)
    setTimeout(() => {
      console.log('Copy operation completed')
    }, 100)
  } catch (error) {
    console.error('Error copying overlay:', error)
  }
}

// Paste functionality - creates overlay from copied data
function pasteOverlay(event?: KeyboardEvent) {
  if (!copiedOverlay || !$chart) return
  
  try {
    // Create a new overlay from copied data
    const pastedData = JSON.parse(JSON.stringify(copiedOverlay))
    
    // Generate new ID for the pasted overlay
    const timestamp = Date.now()
    pastedData.id = `${copiedOverlay.name}_paste_${timestamp}`
    
    // If pasting via keyboard, try to position near current mouse or center
    if (event && pastedData.points && Array.isArray(pastedData.points)) {
      // Add slight offset to avoid overlapping with original
      pastedData.points = pastedData.points.map((point: any) => {
        if (point && typeof point === 'object') {
          return {
            ...point,
            timestamp: point.timestamp ? point.timestamp + (1000 * 60 * 10) : point.timestamp, // 10 minutes offset
            value: point.value ? point.value * 1.005 : point.value // 0.5% price offset
          }
        }
        return point
      })
    }
    
    // Create the pasted overlay using addOverlay to ensure proper event handlers
    const pasteId = addOverlay(pastedData)
    
    if (pasteId) {
      // Handle nullable string types
      const actualId = Array.isArray(pasteId) ? pasteId[0] : pasteId
      if (actualId) {
        // Store in overlays for persistence (already done in addOverlay)
        const overlayKey = getOverlayKey(actualId)
        
        // Record for undo/redo
        undoRedoManager.recordAddOverlay(actualId, pastedData, overlayKey)
        
        // Auto-select the pasted overlay to show floating menu
        setTimeout(() => {
          const pastedOverlay = $chart.getOverlays({ id: actualId })[0]
          if (pastedOverlay) {
            selectDraw = actualId
            selectedOverlay = pastedOverlay
            
            // Set current styles from pasted overlay
            if (pastedOverlay.styles?.line) {
              const lineStyles = pastedOverlay.styles.line
              contextMenuStyles.thickness = String(lineStyles.size || 2)
              contextMenuStyles.color = lineStyles.color || '#1677FF'
              contextMenuStyles.style = lineStyles.style === LineType.Dashed ? 'dashed' : 'solid'
            }
            
            // Show context menu near the pasted overlay
            if (pastedOverlay.points && pastedOverlay.points.length > 0) {
              const firstPoint = pastedOverlay.points[0]
              const coords = $chart?.convertToPixel(firstPoint, { paneId: 'candle_pane' })
              if (coords && typeof coords === 'object' && 'x' in coords && 'y' in coords && coords.x !== undefined && coords.y !== undefined) {
                selectedOverlayCoords = { x: coords.x - 80, y: coords.y - 30 }
                
                // Use saved position if available, otherwise use default position
                if (savedContextMenuPosition) {
                  contextMenuPosition = { ...savedContextMenuPosition }
                } else {
                  contextMenuPosition = { x: coords.x - 80, y: coords.y - 30 }
                }
                
                showContextMenu = true
                showDeleteButton = false
                showMoreOptions = false // Reset more options dropdown
              }
            }
          }
        }, 100) // Small delay to ensure overlay is fully created
      }
      
      console.log('Overlay pasted successfully')
    }
  } catch (error) {
    console.error('Error pasting overlay:', error)
  }
}

function editOverlay(overlay: any){
  if(overlay.groupId !== GROUP_ID)return
  const keys = ['extendData', 'groupId', 'id', 'lock', 'mode', 'name', 'paneId', 'points', 'styles',
    'totalStep', 'visible', 'zLevel']
  const oid = getOverlayKey(overlay['id'])
  overlays.update(ol => {
    ol[oid] = Object.fromEntries(keys.map(k => [k, overlay[k]]))
    return ol
  })
  
  // Sync with DrawingManager
  const drawingManager = drawingManagerContext.get()
  if (drawingManager && overlay.points && overlay.points.length > 0) {
    try {
      const symbolKey = normalizeSymbolKey($save.symbol)
      
      // Convert overlay to Drawing format
      const drawing: Drawing = {
        id: overlay.id,
        symbolKey, // CRITICAL: Add symbolKey for symbol isolation
        type: overlay.name || 'unknown',
        points: overlay.points.map((point: any) => ({
          time: point.timestamp || point.t || 0,
          price: point.value || point.p || 0
        })),
        styles: overlay.styles || {},
        // Preserve extendData (e.g., emoji, size, others)
        ...(overlay.extendData ? { extendData: overlay.extendData } : {}),
        locked: Boolean(overlay.lock),
        visible: overlay.visible !== false
      }
      
      // Add/update in DrawingManager
      drawingManager.addDrawing(drawing)
      // Mark unsaved changes
      markDirty();
    } catch (error) {
      console.error('Error syncing overlay to DrawingManager:', error)
    }
  }
}

function openEmojiPicker() {
  showEmojiPicker = !showEmojiPicker
  if (showEmojiPicker) {
    // Position the emoji picker near the emoji button
    const bounds = getChartContainerBounds()
    emojiPickerPosition = {
      x: bounds.left + 60, // Position to the right of the toolbar
      y: bounds.top + 100
    }
  }
}

function handleEmojiSelect(event: CustomEvent) {
  const { emoji } = event.detail
  console.log('Selected emoji:', emoji)
  
  // Close the emoji picker
  showEmojiPicker = false
  
  // Create emoji overlay with transparent background styles
  addOverlay({
    name: 'emoji',
    visible: visiable,
    lock: lock,
    mode: mode as OverlayMode,
    extendData: { emoji, size: 24 },
    styles: {
      box: {
        enabled: false,
        stroke: '#3b82f6',
        width: 1,
        fill: 'transparent'
      },
      handles: {
        size: 6,
        fill: '#3b82f6',
        stroke: '#3b82f6'
      }
    }
  })
}

function updateEmojiSize(newSize: string) {
  if (!selectedOverlay || selectedOverlay.name !== 'emoji') return
  
  const size = parseInt(newSize)
  if (isNaN(size) || size < 16 || size > 64) return
  
  // Update the overlay's extendData
  if (selectedOverlay.extendData) {
    selectedOverlay.extendData.size = size
  }
  
  // Update the overlay in the chart
  if ($chart && selectedOverlay.id) {
    $chart.overrideOverlay({
      id: selectedOverlay.id,
      extendData: selectedOverlay.extendData
    })
    
    // Save the updated overlay
    editOverlay(selectedOverlay)
  }
}

// Fibonacci Settings Functions
function openFibonacciSettings() {
  if (selectedOverlay?.name === 'fibonacciSegment') {
    // Load current levels from the overlay if they exist (check both extendData and legacy format)
    const existingLevels = selectedOverlay.extendData?.fibonacciLevels || selectedOverlay.fibonacciLevels
    if (existingLevels) {
      fibonacciLevels = [...existingLevels]
    }
    originalFibonacciLevels = [...fibonacciLevels]
    showFibonacciSettings = true
  }
}

function closeFibonacciSettings() {
  showFibonacciSettings = false
}

function resetFibonacciLevels() {
  fibonacciLevels = [
    { value: 0, visible: true, color: '#FF6B6B' },
    { value: 0.236, visible: true, color: '#4ECDC4' },
    { value: 0.382, visible: true, color: '#45B7D1' },
    { value: 0.5, visible: true, color: '#96CEB4' },
    { value: 0.618, visible: true, color: '#FFEAA7' },
    { value: 0.786, visible: true, color: '#DDA0DD' },
    { value: 1, visible: true, color: '#98D8C8' },
    { value: 1.272, visible: true, color: '#F7DC6F' },
    { value: 1.414, visible: true, color: '#BB8FCE' },
    { value: 1.618, visible: true, color: '#85C1E9' },
    { value: 2.618, visible: true, color: '#F8C471' }
  ]
  updateFibonacciOverlay()
}

function confirmFibonacciSettings() {
  updateFibonacciOverlay()
  showFibonacciSettings = false
}

function cancelFibonacciSettings() {
  fibonacciLevels = [...originalFibonacciLevels]
  showFibonacciSettings = false
}

function updateFibonacciOverlay() {
  if (!selectedOverlay || selectedOverlay.name !== 'fibonacciSegment' || !$chart) return
  
  // Update the overlay with new fibonacci levels using extendData
  $chart.overrideOverlay({
    id: selectedOverlay.id,
    extendData: {
      ...selectedOverlay.extendData,
      fibonacciLevels: [...fibonacciLevels]
    }
  })
  
  // Update the selected overlay reference
  selectedOverlay.fibonacciLevels = [...fibonacciLevels]
  
  // Save the updated overlay
  editOverlay(selectedOverlay)
}

function updateFibonacciLevel(index: number, field: 'value' | 'visible' | 'color', value: any) {
  if (index >= 0 && index < fibonacciLevels.length) {
    fibonacciLevels[index] = { ...fibonacciLevels[index], [field]: value }
    // Real-time update
    updateFibonacciOverlay()
  }
}

const clickChart = derived(ctx, ($ctx) => $ctx.clickChart);
clickChart.subscribe(() => {
  popoverKey = ''
  // Hide floating panel when clicking on chart background.
  // Skip if just selected an overlay (to avoid immediate hide due to event bubbling).
  const now = Date.now()
  if ((now - lastOverlaySelectAt > 150) && !isDragging) {
    // Keep floating panel visible while a drawing is selected.
    // Only hide if there is no active selection; actual deselect logic
    // is handled by the overlay onDeselected handler.
    if (!selectDraw && !selectedOverlay) {
      showContextMenu = false
      showDeleteButton = false
      showMoreOptions = false
      selectedOverlayCoords = null
    }
  }
})

// Removed persisted overlay rehydration to keep drawings ephemeral until saved

// Global mouse and touch event listeners for drag functionality
onMount(() => {
  loadSavedPosition()
  if (typeof document !== 'undefined') {
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', stopDrag)
    // Add touch event listeners for mobile support
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', stopTouchDrag)
    document.addEventListener('touchcancel', stopTouchDrag)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleWindowResize)
  }
})

onMount(() => {
  // Add keyboard event listener for undo/redo shortcuts
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', handleKeydown)
  }
})

// Check if drawbar container needs scroll arrow
function checkScrollNeeded() {
  if (!drawbarContainerRef) return
  
  const { scrollHeight, clientHeight, scrollTop } = drawbarContainerRef
  const hasOverflow = scrollHeight > clientHeight
  const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5 // 5px threshold
  
  // Show arrow if there's overflow and not at the bottom
  showScrollArrow = hasOverflow && !isAtBottom
}

// Auto-scroll the drawbar container
function handleScrollArrowClick(e?: Event) {
  if (e) {
    e.preventDefault()
    e.stopPropagation()
  }
  
  if (!drawbarContainerRef) return
  
  const { scrollTop, clientHeight, scrollHeight } = drawbarContainerRef
  const scrollAmount = clientHeight * 0.7 // Scroll 70% of visible height
  const targetScroll = Math.min(scrollTop + scrollAmount, scrollHeight - clientHeight)
  
  drawbarContainerRef.scrollTo({
    top: targetScroll,
    behavior: 'smooth'
  })
}

// Handle touch events for mobile WebView compatibility
function handleScrollArrowTouch(e: TouchEvent) {
  e.preventDefault()
  e.stopPropagation()
  handleScrollArrowClick()
}

// Monitor scroll state for drawbar
onMount(() => {
  // Check scroll on mount
  checkScrollNeeded()
  
  // Handle scroll events
  const handleScroll = () => {
    checkScrollNeeded()
  }
  
  // Handle resize events
  const handleResize = () => {
    checkScrollNeeded()
  }
  
  if (drawbarContainerRef) {
    drawbarContainerRef.addEventListener('scroll', handleScroll)
  }
  
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
  }
  
  // Also check after a short delay to ensure all elements are rendered
  setTimeout(checkScrollNeeded, 500)
  
  return () => {
    if (drawbarContainerRef) {
      drawbarContainerRef.removeEventListener('scroll', handleScroll)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize)
    }
  }
})

onDestroy(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', stopDrag)
    document.removeEventListener('keydown', handleKeydown)
    // Remove touch event listeners
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', stopTouchDrag)
    document.removeEventListener('touchcancel', stopTouchDrag)
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleWindowResize)
  }
})

// Public API for external overlay event forwarding (from DrawingManager)
export function externalSelectOverlay(overlay: any) {
  try {
    lastOverlaySelectAt = Date.now()
    // Simulate onSelected handler logic
    selectDraw = overlay.id
    selectedOverlay = overlay
    // Update context menu styles
    if (overlay.styles?.line) {
      const lineStyles = overlay.styles.line
      // Keep thickness as string so it matches <select> option values
      contextMenuStyles.thickness = String(lineStyles.size || 2)
      contextMenuStyles.color = lineStyles.color || '#1677FF'
      contextMenuStyles.style = lineStyles.style === LineType.Dashed ? 'dashed' : 'solid'
    }
    // Position floating panel
    if (overlay.points && overlay.points.length > 0) {
      const firstPoint = overlay.points[0]
      const paneId = (overlay as any).paneId || 'candle_pane'
      const coords = $chart?.convertToPixel(firstPoint, { paneId })
      if (coords && typeof coords === 'object' && 'x' in coords && 'y' in coords && coords.x !== undefined && coords.y !== undefined) {
        selectedOverlayCoords = { x: coords.x - 80, y: coords.y - 30 }
        // Use saved position if available
        if (savedContextMenuPosition) {
          contextMenuPosition = { ...savedContextMenuPosition }
        } else {
          contextMenuPosition = { x: coords.x - 80, y: coords.y - 30 }
        }
        showContextMenu = true
        showDeleteButton = false
      }
    }
  } catch (e) {
    console.warn('externalSelectOverlay failed:', e)
  }
}

// External deselect handler for overlays rendered by DrawingManager
export function externalDeselectOverlay(overlay: any) {
  try {
    // Only clear if this overlay is currently selected
    if (selectDraw === overlay.id || selectedOverlay?.id === overlay.id) {
      selectDraw = ''
      showDeleteButton = false
      showContextMenu = false
      showMoreOptions = false
      selectedOverlayCoords = null
      selectedOverlay = null
    }
  } catch (e) {
    console.warn('externalDeselectOverlay failed:', e)
  }
}

export function externalSyncOverlay(overlay: any) {
  try {
    editOverlay(overlay)
  } catch (e) {
    console.warn('externalSyncOverlay failed:', e)
  }
}

export function externalRemoved(overlayId: string) {
  try {
    if (selectDraw === overlayId) {
      selectDraw = ''
      showDeleteButton = false
      showContextMenu = false
      showMoreOptions = false
      selectedOverlayCoords = null
      selectedOverlay = null
    }
  } catch (e) {
    console.warn('externalRemoved failed:', e)
  }
}
</script>

{#snippet DrawButton(onClick: () => void, icon: string, itemKey: string = '', subItems: {key: string, text: string}[] = [])}
  <div class="group flex flex-row items-center justify-center relative w-full mt-3 cursor-pointer transition-all duration-300 ease-in-out">
    <!-- Premium button with hover effects -->
    <div 
      class="premium-button w-10 h-10 rounded-lg flex items-center justify-center relative overflow-hidden transition-all duration-300 ease-in-out
             bg-[var(--menu-btn-bg)] border border-[var(--menu-btn-border)]
             hover:bg-[var(--menu-hover-bg)] hover:border-[var(--menu-btn-hover-border)] hover:shadow-lg
             group-hover:scale-105 group-hover:translate-y-[-1px]"
      onclick={onClick}
    >
      <!-- Button glow effect -->
      <div class="button-glow absolute inset-0 bg-[var(--menu-glow)] opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-lg"></div>
      
      <!-- Icon with premium styling -->
      <KlineIcon 
        name={icon} 
        active={itemKey === 'mode' && mode === modeIcon}
        class="relative z-10 text-[var(--menu-text)] group-hover:text-[var(--menu-glow)] transition-colors duration-300"
      />
      
      <!-- Active state indicator -->
      {#if (itemKey === 'mode' && mode === modeIcon) || (itemKey && itemKey === popoverKey)}
        <div class="active-indicator absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[var(--menu-glow)] rounded-full"></div>
      {/if}
    </div>
    
    <!-- Premium hover arrow for submenus -->
    {#if subItems.length > 0}
      <div 
        class="premium-arrow flex items-center justify-center absolute top-1/2 right-[2px] transform -translate-y-1/2 
               w-5 h-5 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all duration-300 ease-in-out
               bg-[var(--menu-btn-bg)] border border-[var(--menu-btn-border)] rounded-full shadow-sm
               hover:bg-[var(--menu-hover-bg)] hover:border-[var(--menu-btn-hover-border)] cursor-pointer z-20"
        onclick={() => clickPopoverKey(itemKey)}
      >
        <svg 
          class:rotate-180={popoverKey === itemKey} 
          class="w-2 h-2 transition-all duration-300 ease-in-out text-[var(--menu-text)] group-hover:text-[var(--menu-glow)]" 
          viewBox="0 0 8 12"
          fill="currentColor"
        >
          <path d="M1.705 0.295C1.315 -0.095 0.685 -0.095 0.295 0.295C-0.095 0.685 -0.095 1.315 0.295 1.705L5.59 7L0.295 12.295C-0.095 12.685 -0.095 13.315 0.295 13.705C0.685 14.095 1.315 14.095 1.705 13.705L7.705 7.705C8.095 7.315 8.095 6.685 7.705 6.295L1.705 0.295Z"/>
        </svg>
      </div>
      
      <!-- Premium submenu - moved outside overflow container -->
      {#if itemKey === popoverKey}
        <div class="submenu-portal"></div>
      {/if}
    {/if}
  </div>
{/snippet}

{#snippet Divider()}
  <div class="w-full h-px bg-[var(--menu-btn-border)] mt-3 opacity-50"></div>
{/snippet}

<div class="drawbar-wrapper">
<div bind:this={drawbarContainerRef} class="drawbar-container w-[52px] h-full box-border border-r border-r-[var(--menu-border)] bg-[var(--menu-bg)] shadow-[var(--menu-shadow)] transition-all duration-300 ease-in-out overflow-y-auto scrollbar-hidden" onclick={(e) => e.stopPropagation()}>
  <!-- Premium Crosshair button at the top -->
  {@render DrawButton(resetToCrosshair, 'crosshair')}
  
  {@render Divider()}
  
  <!-- Premium drawing tools section -->
  {#each subMenu as item}
    {@render DrawButton(() => item.key === 'emoji' ? openEmojiPicker() : startOverlay(item.icon), item.icon, item.key, item.list)}
  {/each}
  
  {@render Divider()}
  
  <!-- Premium ruler button -->
  {@render DrawButton(() => startOverlay('ruler'), 'ruler')}
  
  {@render Divider()}
  
  <!-- Premium mode toggle -->
  {@render DrawButton(clickMode, modeIcon, 'mode', modes)}
  
  {@render Divider()}
  
  <!-- Premium lock toggle -->
  {@render DrawButton(toggleLock, lock ? 'lock' : 'unlock')}
  
  {@render Divider()}
  
  <!-- Premium visibility toggle -->
  {@render DrawButton(toggleVisiable, visiable ? 'visible' : 'invisible')}
  
  {@render Divider()}
  
  <!-- Premium remove button -->
  {@render DrawButton(clickRemove, 'remove')}
</div>

<!-- Minimal Scroll Arrow Indicator for Drawing Toolbar -->
{#if showScrollArrow}
  <button 
    class="drawbar-scroll-arrow"
    onclick={handleScrollArrowClick}
    ontouchstart={handleScrollArrowTouch}
    ontouchend={(e) => e.preventDefault()}
    title="Scroll to see more tools"
    aria-label="Scroll down"
    type="button"
  >
    <svg 
      width="12" 
      height="12" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      stroke-width="2.5" 
      stroke-linecap="round" 
      stroke-linejoin="round"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </button>
{/if}
</div>

<!-- Premium submenu rendered outside overflow container -->
{#if popoverKey}
  {#each subMenu as item}
    {#if item.key === popoverKey && item.list.length > 0}
      <ul class="premium-submenu fixed min-w-[140px] max-h-[70vh] z-[9999] rounded-lg shadow-2xl border border-[var(--menu-btn-border)] overflow-y-auto
                bg-[var(--menu-bg)] backdrop-blur-sm transition-all duration-300 ease-in-out"
          style="left: {60}px; top: {getSubmenuPosition(popoverKey)}px;"
          use:submenuScroll>
        {#each item.list as data}
          <li 
            class="px-4 py-3 flex flex-row items-center gap-3 transition-all duration-200 ease-in-out
                   text-[var(--menu-text)] hover:bg-[var(--menu-hover-bg)] hover:text-[var(--menu-glow)] cursor-pointer"
            onmouseenter={(e) => e.currentTarget.style.backgroundColor = 'var(--menu-hover-bg)'}
            onmouseleave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            onclick={() => popoverKey === 'mode' ? clickSubMode(data.key) : clickSubPopover(subMenu.findIndex(i => i.key === popoverKey), data.key)}
          >
            <KlineIcon name={data.key} class="w-4 h-4"/>
            <span class="text-sm font-medium">{m[data.text as keyof typeof m]()}</span>
          </li>
        {/each}
      </ul>
    {/if}
  {/each}
  
  <!-- Mode submenu -->
  {#if popoverKey === 'mode'}
    <ul class="premium-submenu fixed min-w-[140px] max-h-[70vh] z-[9999] rounded-lg shadow-2xl border border-[var(--menu-btn-border)] overflow-y-auto
              bg-[var(--menu-bg)] backdrop-blur-sm transition-all duration-300 ease-in-out"
        style="left: {60}px; top: {getSubmenuPosition('mode')}px;"
        use:submenuScroll>
      {#each modes as data}
        <li 
          class="px-4 py-3 flex flex-row items-center gap-3 transition-all duration-200 ease-in-out
                 text-[var(--menu-text)] hover:bg-[var(--menu-hover-bg)] hover:text-[var(--menu-glow)] cursor-pointer"
          onmouseenter={(e) => e.currentTarget.style.backgroundColor = 'var(--menu-hover-bg)'}
          onmouseleave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          onclick={() => clickSubMode(data.key)}
        >
          <KlineIcon name={data.key} class="w-4 h-4"/>
          <span class="text-sm font-medium">{m[data.text as keyof typeof m]()}</span>
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<!-- Responsive Context menu for selected drawing -->
{#if showContextMenu && contextMenuPosition}
  <div 
    class="context-menu-container fixed z-50 rounded-md shadow-lg\n           {$save.theme === 'dark' ? 'bg-[#2A2A2A] border border-[#404040]' : 'bg-white border border-gray-200'} {isDragging ? 'cursor-grabbing' : ''}\n           px-1 py-1 sm:px-2 sm:py-1\n           max-w-[85vw] sm:max-w-none" data-theme={$save.theme}
    style="left: {contextMenuPosition.x}px; 
           top: {contextMenuPosition.y}px;"
    onclick={(e) => e.stopPropagation()}
  >
    
    <!-- Compact horizontal toolbar -->
    <div class="flex items-center gap-1 sm:gap-2 flex-nowrap">
      {#if selectedOverlay?.name !== 'emoji'}
        <!-- Compact drag handle -->
        <div 
          class="drag-handle cursor-grab hover:cursor-grabbing flex items-center justify-center 
                 w-6 h-6 rounded {$save.theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors
                 touch-manipulation"
          onmousedown={startDrag}
          ontouchstart={startTouchDrag}
          title="Drag to move"
        >
          <div class="flex flex-col gap-0.5">
            <div class="flex gap-0.5">
              <div class="w-0.5 h-0.5 {$save.theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'} rounded-full"></div>
              <div class="w-0.5 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
            </div>
            <div class="flex gap-0.5">
              <div class="w-0.5 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
              <div class="w-0.5 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
            </div>
            <div class="flex gap-0.5">
              <div class="w-0.5 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
              <div class="w-0.5 h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
            </div>
          </div>
        </div>
        
        <!-- Compact color picker button -->
        <button 
          class="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 
                 cursor-pointer hover:scale-110 transition-transform touch-manipulation"
          style="background-color: {contextMenuStyles.color};"
          onclick={openColorPicker}
          title="Choose color"
        ></button>
        
        <!-- Thickness dropdown - consistent across devices -->
        <select 
          bind:value={contextMenuStyles.thickness}
          onchange={updateOverlayStyles}
          class="px-1 py-1 text-xs border rounded cursor-pointer\n                 {$save.theme === 'dark' ? 'bg-[#2C2C2C] border-[#3A3A3A] text-white' : 'bg-white border-gray-300 text-gray-900'} touch-manipulation\n                 w-[50px] h-[28px]"
          title="Line thickness"
        >
          <option value="1">1px</option>
          <option value="2">2px</option>
          <option value="3">3px</option>
          <option value="4">4px</option>
          <option value="5">5px</option>
          <option value="6">6px</option>
          <option value="7">7px</option>
          <option value="8">8px</option>
        </select>
        
        <!-- Line style dropdown - consistent across devices -->
        <select 
          bind:value={contextMenuStyles.style}
          onchange={updateOverlayStyles}
          class="px-1 py-1 text-xs border rounded cursor-pointer\n                 {$save.theme === 'dark' ? 'bg-[#2C2C2C] border-[#3A3A3A] text-white' : 'bg-white border-gray-300 text-gray-900'} touch-manipulation\n                 w-[50px] h-[28px]"
          title="Line style"
        >
          <option value="solid">Line</option>
          <option value="dashed">Dash</option>
          <option value="dotted">Dot</option>
        </select>
      {:else}
        <!-- Emoji icon and size control for emoji overlays -->
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-8 h-8 text-lg">
            {selectedOverlay?.extendData?.emoji || '😀'}
          </div>
          
          <!-- Size control slider - responsive -->
          <div class="flex items-center gap-1 sm:gap-2 min-w-[100px] sm:min-w-[120px]">
            <span class="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Size:</span>
            <input 
              type="range" 
              min="16" 
              max="64" 
              value={selectedOverlay?.extendData?.size || 24}
              class="flex-1 h-2 sm:h-1 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider touch-manipulation"
              oninput={(e) => updateEmojiSize((e.target as HTMLInputElement)?.value || '24')}
              title="Emoji size: {selectedOverlay?.extendData?.size || 24}px"
            />
            <span class="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">
              {selectedOverlay?.extendData?.size || 24}
            </span>
          </div>
        </div>
      {/if}
      
      <!-- Settings button for Fibonacci Retracement Segment -->
      {#if selectedOverlay?.name === 'fibonacciSegment'}
        <button 
          class="w-8 h-8 rounded {$save.theme === 'dark' ? 'hover:bg-blue-900' : 'hover:bg-blue-100'} transition-colors duration-200
                 flex items-center justify-center"
          onclick={() => { openFibonacciSettings(); }}
          title="Fibonacci Settings"
        >
          <svg class="w-4 h-4 {$save.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </button>
      {/if}

      <!-- More options dropdown (hidden for emoji) -->
       {#if selectedOverlay?.name !== 'emoji'}
         <div class="relative">
          <button 
            class="w-8 h-8 rounded {$save.theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors duration-200
                   flex items-center justify-center"
            onclick={() => { showMoreOptions = !showMoreOptions }}
            title="More options"
          >
            <svg class="w-4 h-4 {$save.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
            </svg>
          </button>
          
          {#if showMoreOptions}
            <div class="absolute bottom-full right-0 mb-2 {$save.theme === 'dark' ? 'bg-[#2A2A2A] border-[#404040]' : 'bg-white border-gray-200'} rounded-lg shadow-lg py-1 min-w-[120px] z-60">
              <button 
                class="w-full px-3 py-2 text-left text-sm {$save.theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} flex items-center gap-2"
                onclick={() => { cloneOverlay(); showMoreOptions = false; }}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Clone
              </button>
              <button 
                class="w-full px-3 py-2 text-left text-sm {$save.theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} flex items-center gap-2"
                onclick={() => { copyOverlay(); showMoreOptions = false; }}
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                </svg>
                Copy
              </button>
            </div>
          {/if}
        </div>
       {/if}
      
      <!-- Delete button -->
      <button 
        class="w-8 h-8 rounded {$save.theme === 'dark' ? 'hover:bg-red-900' : 'hover:bg-red-100'} transition-colors duration-200
               flex items-center justify-center"
        onclick={() => { clickRemove(); showContextMenu = false; selectedOverlayCoords = null; }}
        title="Delete"
      >
        <svg class="w-4 h-4 {$save.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
    </div>
  </div>
{/if}

<!-- Delete button overlay for selected drawing -->
{#if showDeleteButton && selectedOverlayCoords}
  <div 
    class="fixed z-50 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer shadow-lg transition-all duration-200"
    style="left: {selectedOverlayCoords.x}px; top: {selectedOverlayCoords.y}px;"
    onclick={clickRemove}
    title="Delete selected drawing"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
    </svg>
  </div>
{/if}

<!-- Advanced Color Picker -->
<ColorPicker 
  bind:selectedColor={contextMenuStyles.color}
  bind:opacity={contextMenuStyles.opacity}
  bind:show={showColorPicker}
  on:colorChange={handleColorChange}
  on:opacityChange={handleOpacityChange}
  on:close={closeColorPicker}
/>

<!-- Emoji Picker -->
<EmojiPicker 
  bind:show={showEmojiPicker}
  bind:position={emojiPickerPosition}
  on:select={handleEmojiSelect}
/>

<!-- Fibonacci Settings Modal -->
<FibonacciSettingsModal 
  bind:visible={showFibonacciSettings}
  bind:levels={fibonacciLevels}
  theme={$save.theme}
  on:levelChange={(e) => updateFibonacciLevel(e.detail.index, e.detail.field, e.detail.value)}
  on:reset={resetFibonacciLevels}
  on:confirm={confirmFibonacciSettings}
  on:cancel={cancelFibonacciSettings}
/>

<style>
  /* Drawbar Wrapper */
  .drawbar-wrapper {
    position: relative;
    height: 100%;
  }

  /* Premium DrawBar CSS Variables - Perfectly matching top menu bar */
  .drawbar-container {
    --menu-bg: linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%);
    --menu-btn-bg: rgba(0, 0, 0, 0.02);
    --menu-btn-border: rgba(59, 130, 246, 0.15);
    --menu-btn-hover-border: rgba(59, 130, 246, 0.3);
    --menu-hover-bg: rgba(59, 130, 246, 0.1);
    --menu-text: #1f2937;
    --menu-text-secondary: rgba(31, 41, 55, 0.7);
    --menu-glow: rgba(59, 130, 246, 0.3);
    --menu-active-bg: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    --menu-border: rgba(59, 130, 246, 0.2);
    --menu-shadow: 0 4px 20px rgba(59, 130, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  :global([data-theme="dark"]) .drawbar-container {
    --menu-bg: linear-gradient(135deg, #0a041c 0%, #1a0f2e 50%, #0a041c 100%);
    --menu-btn-bg: rgba(255, 255, 255, 0.05);
    --menu-btn-border: rgba(138, 43, 226, 0.2);
    --menu-btn-hover-border: rgba(138, 43, 226, 0.4);
    --menu-hover-bg: rgba(138, 43, 226, 0.2);
    --menu-text: #ffffff;
    --menu-text-secondary: rgba(255, 255, 255, 0.7);
    --menu-glow: rgba(138, 43, 226, 0.4);
    --menu-active-bg: linear-gradient(135deg, #8a2be2 0%, #9932cc 100%);
    --menu-border: rgba(138, 43, 226, 0.3);
    --menu-shadow: 0 4px 20px rgba(138, 43, 226, 0.15), 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .arrow-icon path {
    fill: #333333;
  }
  
  :global([data-theme="dark"]) .arrow-icon path {
    fill: white;
  }
  
  :global([data-theme="light"]) .arrow-icon path {
    fill: #333333;
  }
  
  /* Premium Button Animations */
  .premium-button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .premium-button:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.15);
  }

  .premium-arrow {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .premium-arrow:hover {
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }

  .premium-submenu {
    backdrop-filter: blur(10px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--menu-btn-border);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .premium-submenu li {
    transition: all 0.2s ease-in-out;
  }

  .premium-submenu li:hover {
    transform: translateX(4px);
  }

  /* Active state animation */
  .active-indicator {
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
    50% {
      opacity: 0.7;
      transform: translateX(-50%) scale(1.2);
    }
  }

  /* Button glow animation */
  @keyframes button-glow {
    0%, 100% {
      box-shadow: 0 0 5px var(--menu-glow);
    }
    50% {
      box-shadow: 0 0 20px var(--menu-glow), 0 0 30px var(--menu-glow);
    }
  }

  .premium-button:hover {
    animation: button-glow 2s ease-in-out infinite;
  }

  /* Emoji size slider styles */
  .slider {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }
  
  .slider::-webkit-slider-track {
    background: #d1d5db;
    height: 4px;
    border-radius: 2px;
  }
  
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    background: #3b82f6;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .slider::-moz-range-track {
    background: #d1d5db;
    height: 4px;
    border-radius: 2px;
    border: none;
  }
  
  .slider::-moz-range-thumb {
    background: #3b82f6;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  /* Dark theme slider styles */
  :global([data-theme="dark"]) .slider::-webkit-slider-track {
    background: #4b5563;
  }
  
  :global([data-theme="dark"]) .slider::-moz-range-track {
    background: #4b5563;
  }

  /* Smooth transitions for premium feel */
  .drawbar-container * {
    transition: background-color 0.3s ease, border-color 0.3s ease, 
                color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
  }

  /* Hidden scrollbar for small devices */
  .scrollbar-hidden {
    /* Hide scrollbar for Chrome, Safari and Opera */
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* Internet Explorer 10+ */
  }
  
  .scrollbar-hidden::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
  }

  /* Context menu mobile responsiveness */
  .context-menu-container {
    /* Prevent text selection during drag */
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    
    /* Improve touch handling */
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }

  /* Mobile-specific context menu styles */
  @media (max-width: 768px) {
    .context-menu-container {
      /* Compact size for mobile */
      min-height: 32px;
      
      /* Minimal spacing for compact UI */
      padding: 4px 6px !important;
      
      /* Prevent menu from being too wide on mobile */
      max-width: calc(100vw - 20px);
      
      /* Ensure proper z-index on mobile */
      z-index: 9999;
      
      /* Add subtle shadow for better visibility */
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      
      /* Smaller border radius for compact look */
      border-radius: 6px;
    }
    
    /* Compact touch targets for mobile */
    .context-menu-container .drag-handle {
      min-width: 32px;
      min-height: 32px;
      padding: 4px;
      /* Add visual feedback for touch */
      transition: background-color 0.2s ease;
    }
    
    .context-menu-container .drag-handle:active {
      background-color: rgba(0, 0, 0, 0.1);
    }
    
    .context-menu-container button {
      min-width: 32px;
      min-height: 32px;
      padding: 4px 6px;
      /* Better touch feedback */
      transition: all 0.2s ease;
    }
    
    .context-menu-container button:active {
      transform: scale(0.95);
      background-color: rgba(0, 0, 0, 0.1);
    }
    
    .context-menu-container select {
      height: 28px !important;
      font-size: 12px; /* Prevent zoom on iOS */
      padding: 4px 6px !important;
    }
    
    /* Better spacing between elements */
    .context-menu-container > * {
      margin: 4px 0;
    }
    

  }

  /* Ensure smooth scrolling on mobile devices */
  @media (max-width: 768px) {
    .drawbar-container {
      scroll-behavior: smooth;
      /* Add padding to prevent content from being cut off */
      padding-bottom: 20px;
    }
  }

  /* Touch-friendly scrolling for tablets */
  @media (max-width: 1024px) and (min-width: 769px) {
    .drawbar-container {
      scroll-behavior: smooth;
      padding-bottom: 15px;
    }
  }

  /* Minimal Scroll Arrow for Drawbar - Subtle Design */
  .drawbar-scroll-arrow {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.25);
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 999;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
    opacity: 0.7;
    
    /* WebView touch support */
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
  }

  .drawbar-scroll-arrow:hover {
    opacity: 1;
    transform: translateX(-50%) scale(1.08);
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(59, 130, 246, 0.4);
    box-shadow: 0 3px 10px rgba(59, 130, 246, 0.25);
  }

  .drawbar-scroll-arrow:active {
    transform: translateX(-50%) scale(0.95);
  }

  .drawbar-scroll-arrow svg {
    color: #3b82f6;
    filter: drop-shadow(0 1px 2px rgba(59, 130, 246, 0.3));
  }

  /* Dark theme - minimal purple tones */
  :global([data-theme="dark"]) .drawbar-scroll-arrow {
    background: rgba(138, 43, 226, 0.15);
    border-color: rgba(138, 43, 226, 0.25);
    box-shadow: 0 2px 6px rgba(138, 43, 226, 0.15);
  }

  :global([data-theme="dark"]) .drawbar-scroll-arrow:hover {
    background: rgba(138, 43, 226, 0.25);
    border-color: rgba(138, 43, 226, 0.4);
    box-shadow: 0 3px 10px rgba(138, 43, 226, 0.25);
  }

  :global([data-theme="dark"]) .drawbar-scroll-arrow svg {
    color: #9d6dcc;
    filter: drop-shadow(0 1px 2px rgba(138, 43, 226, 0.3));
  }

  /* Light theme - minimal blue tones */
  :global([data-theme="light"]) .drawbar-scroll-arrow {
    background: rgba(59, 130, 246, 0.12);
    border-color: rgba(59, 130, 246, 0.2);
  }

  :global([data-theme="light"]) .drawbar-scroll-arrow:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.35);
  }

  :global([data-theme="light"]) .drawbar-scroll-arrow svg {
    color: #2563eb;
  }

  /* Mobile responsiveness - even more subtle */
  @media (max-width: 768px) {
    .drawbar-scroll-arrow {
      width: 20px;
      height: 20px;
      bottom: 6px;
      opacity: 0.65;
    }
    
    .drawbar-scroll-arrow svg {
      width: 10px;
      height: 10px;
    }
  }

  @media (max-width: 480px) {
    .drawbar-scroll-arrow {
      width: 18px;
      height: 18px;
      bottom: 4px;
      opacity: 0.6;
    }
    
    .drawbar-scroll-arrow svg {
      width: 9px;
      height: 9px;
    }
  }
</style>
