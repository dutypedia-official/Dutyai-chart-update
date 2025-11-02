<script lang="ts">
  import Modal from "./modal.svelte"
  import { getContext } from "svelte";
  import * as m from '$lib/paraglide/messages.js'
  import { ChartSave, ChartCtx } from "./chart";
  import type { Writable } from "svelte/store";
  import type { Chart, Nullable } from 'klinecharts';
  import * as kc from 'klinecharts';
  import { derived } from "svelte/store";
  import { IndFieldsMap } from './coms';
  import ColorPalette from '../ColorPalette.svelte';
  import { generateUUID } from './saveSystem/storage';
  import { RSIManager } from './indicators/rsi';
  import { WRManager } from './indicators/wr';
  
  // Volume Group Interface (VR-style implementation)
  interface VolGroup {
    id: string;
    paneId?: string;
    period: number; // EMA period (default: 20)
    styles: {
      histogram: {upColor: string, downColor: string, thickness: number, lineStyle: string};
      ema: {color: string, thickness: number, lineStyle: string};
    };
  }
  
  let { show = $bindable() } = $props();
  
  const ctx = getContext('ctx') as Writable<ChartCtx>;
  const save = getContext('save') as Writable<ChartSave>;
  const chart = getContext('chart') as Writable<Nullable<Chart>>;
  let params = $state<unknown[]>([]);
  let fields = $state<Record<string, any>[]>([]);
  let styles = $state<{color: string, thickness: number, lineStyle: string}[]>([]);
  
  // PVT specific variables
  let pvtColor = $state('#FF6B35');
  let pvtThickness = $state(2);
  let pvtStyle = $state('solid');

  // Bollinger Bands specific variables
  let bollingerFillColor = $state('#2196F3'); // Default blue color
  let bollingerFillOpacity = $state(5); // Default 5%
  let bollingerUpperColor = $state('#2196F3');
  let bollingerMiddleColor = $state('#FF9800');
  let bollingerLowerColor = $state('#2196F3');
  let bollingerThickness = $state(1);
  let bollingerLineStyle = $state('solid');
  let bollingerPeriod = $state(20);
  let bollingerStdDev = $state(2);
  
  // Color palette states for all indicators
  let showMacdColorPalette = $state(false);
  let macdColorPalettePosition = $state({ x: 0, y: 0 });
  let showCciColorPalette = $state(false);
  let cciColorPalettePosition = $state({ x: 0, y: 0 });
  let cciColorPaletteIndex = $state(0); // Track which CCI line is being edited

  let showDmiColorPalette = $state(false);
  let dmiColorPalettePosition = $state({ x: 0, y: 0 });
  let dmiColorPaletteIndex = $state(0); // Track which DMI group is being edited
  let dmiColorPaletteType = $state('diPlus'); // Track which line type (diPlus, diMinus, adx)
  let showEmvColorPalette = $state(false);
  let emvColorPalettePosition = $state({ x: 0, y: 0 });
  let showKdjColorPalette = $state(false);
  let kdjColorPalettePosition = $state({ x: 0, y: 0 });
  let showKdjGroupColorPalette = $state(false);
  let kdjGroupColorPalettePosition = $state({ x: 0, y: 0 });
  let kdjGroupColorPaletteIndex = $state(0); // Track which KDJ group and line (0=K, 1=D, 2=J)
  let showMtmColorPalette = $state(false);
  let mtmColorPalettePosition = $state({ x: 0, y: 0 });
  let mtmColorPaletteIndex = $state(0);
  let showTrixColorPalette = $state(false);
  let trixColorPalettePosition = $state({ x: 0, y: 0 });
  // VOL Groups state (VR-style implementation)
  let volGroups = $state<VolGroup[]>([]);
  let showVolColorPalette = $state(false);
  let volColorPalettePosition = $state({ x: 0, y: 0 });
  let volColorPaletteIndex = $state(0);
  let volColorPaletteType = $state<'histogram' | 'histogram-down' | 'ema'>('histogram');
  
  // Additional color palette states for other indicators
  let showWrColorPalette = $state(false);
  let wrColorPalettePosition = $state({ x: 0, y: 0 });
  
  // WR level color palette states
  let showWrOverboughtColorPalette = $state(false);
  let wrOverboughtColorPalettePosition = $state({ x: 0, y: 0 });
  let showWrOversoldColorPalette = $state(false);
  let wrOversoldColorPalettePosition = $state({ x: 0, y: 0 });
  let showWrMiddleLineColorPalette = $state(false);
  let wrMiddleLineColorPalettePosition = $state({ x: 0, y: 0 });
  let wrColorPaletteGroupIndex = $state(0); // Track which WR group is being edited
  let showVrColorPalette = $state(false);
  let vrColorPalettePosition = $state({ x: 0, y: 0 });
  let vrColorPaletteGroupIndex = $state(0); // Track which VR group is being edited
  let vrColorPaletteLineType = $state('vr'); // Track which line type (vr, vrShort, vrLong)
  let showRocColorPalette = $state(false);
  let rocColorPalettePosition = $state({ x: 0, y: 0 });
  let rocColorPaletteIndex = $state(0); // Track which ROC group is being edited
  let showPsyColorPalette = $state(false);
  let psyColorPalettePosition = $state({ x: 0, y: 0 });
  let psyColorPaletteIndex = $state(0); // Track which PSY group and line (0=psy, 1=mapsy)
  let showObvColorPalette = $state(false);
  let obvColorPalettePosition = $state({ x: 0, y: 0 });
  let obvColorPaletteIndex = $state(0); // Track which OBV group and line (0=obv, 1=maobv)
  let showZigzagColorPalette = $state(false);
  let zigzagColorPalettePosition = $state({ x: 0, y: 0 });
  let showPvtColorPalette = $state(false);
  let pvtColorPalettePosition = $state({ x: 0, y: 0 });
  let pvtColorPaletteIndex = $state(0); // Track which PVT group is being edited
  let showSarColorPalette = $state(false);
  let sarColorPalettePosition = $state({ x: 0, y: 0 });
  let sarColorPaletteIndex = $state(0); // Track which SAR group is being edited
  let showBiasColorPalette = $state(false);
  let biasColorPalettePosition = $state({ x: 0, y: 0 });
  let biasColorPaletteIndex = $state(0); // Track which BIAS line is being edited
  let showIchimokuColorPalette = $state(false);
  let ichimokuColorPalettePosition = $state({ x: 0, y: 0 });
  let showCustomMomentumColorPalette = $state(false);
  let customMomentumColorPalettePosition = $state({ x: 0, y: 0 });
  let showCustomAoColorPalette = $state(false);
let customAoColorPalettePosition = $state({ x: 0, y: 0 });
let aoColorPaletteIndex = $state(0); // Track which AO group and color type (0=increasing, 1=decreasing)

  // CR indicator color palette states
  let showCrColorPalette = $state(false);
  let crColorPalettePosition = $state({ x: 0, y: 0 });
  let crColorPaletteIndex = $state(0); // Track which CR group is being edited
  let crColorPaletteType = $state('cr'); // Track which line type (cr, ma1, ma2, ma3, ma4)
  
  // Additional specific line color palette states for multi-line indicators
  let showMacdLineColorPalette = $state(false);
  let macdLineColorPalettePosition = $state({ x: 0, y: 0 });
  let showMacdSignalColorPalette = $state(false);
  let macdSignalColorPalettePosition = $state({ x: 0, y: 0 });
  let showMacdHistColorPalette = $state(false);
  let macdHistColorPalettePosition = $state({ x: 0, y: 0 });
  
  // RSI color palette states
  let showRsiOverboughtColorPalette = $state(false);
  let rsiOverboughtColorPalettePosition = $state({ x: 0, y: 0 });
  let showRsiOversoldColorPalette = $state(false);
  let rsiOversoldColorPalettePosition = $state({ x: 0, y: 0 });
  let showRsiMiddleLineColorPalette = $state(false);
  let rsiMiddleLineColorPalettePosition = $state({ x: 0, y: 0 });
  let rsiColorPaletteGroupIndex = $state(0); // Track which RSI group is being edited
  

  
  let showVolIncreasingColorPalette = $state(false);
  let volIncreasingColorPalettePosition = $state({ x: 0, y: 0 });
  let showVolDecreasingColorPalette = $state(false);
  let volDecreasingColorPalettePosition = $state({ x: 0, y: 0 });
  
  let showBiasLine1ColorPalette = $state(false);
  let biasLine1ColorPalettePosition = $state({ x: 0, y: 0 });
  let showBiasLine2ColorPalette = $state(false);
  let biasLine2ColorPalettePosition = $state({ x: 0, y: 0 });
  let showBiasLine3ColorPalette = $state(false);
  let biasLine3ColorPalettePosition = $state({ x: 0, y: 0 });
  
  // Bollinger Bands color palette states
  let showBollingerFillColorPalette = $state(false);
  let bollingerFillColorPalettePosition = $state({ x: 0, y: 0 });
  let showBollingerUpperColorPalette = $state(false);
  let bollingerUpperColorPalettePosition = $state({ x: 0, y: 0 });
  let showBollingerMiddleColorPalette = $state(false);
  let bollingerMiddleColorPalettePosition = $state({ x: 0, y: 0 });
  let showBollingerLowerColorPalette = $state(false);
  let bollingerLowerColorPalettePosition = $state({ x: 0, y: 0 });
  
  // EMA and SMA color palette states
  let showEmaColorPalette = $state(false);
  let emaColorPalettePosition = $state({ x: 0, y: 0 });
  let emaColorPaletteIndex = $state(0); // Track which EMA line is being edited
  let showSmaColorPalette = $state(false);
  let smaColorPalettePosition = $state({ x: 0, y: 0 });
  let smaColorPaletteIndex = $state(0); // Track which SMA line is being edited
  let ichimokuColorPaletteIndex = $state(0); // Track which Ichimoku line is being edited
  
  // MA color palette states
  let showMaColorPalette = $state(false);
  let maColorPalettePosition = $state({ x: 0, y: 0 });
  let maColorPaletteIndex = $state(0); // Track which MA line is being edited
  
  // BBI color palette states
  let showBbiColorPalette = $state(false);
  let bbiColorPalettePosition = $state({ x: 0, y: 0 });
  let bbiColorPaletteIndex = $state(0); // Track which BBI group is being edited

  // RSI color palette states
  let showRsiColorPalette = $state(false);
  let rsiColorPalettePosition = $state({ x: 0, y: 0 });
  let rsiColorPaletteIndex = $state(0); // Track which RSI group is being edited

  // Simplified delInd function for BBI deletion
  function delInd(paneId: string, name: string) {
    if(!$chart) return;
    
    try {
      ($chart as any).removeIndicator({ paneId, name });
    } catch (error) {
      console.log('Error removing indicator:', error);
    }
    
    // Clean up saved state
    save.update(s => {
      const key = `${paneId}_${name}`;
      delete s.saveInds[key];
      return s;
    });
  }

  // Check if current indicator is Bollinger Bands, MACD, BIAS, AO, WR, BBI, EMA, PVT, VOL, or SAR
  const isBollingerBands = $derived($ctx.editIndName === 'BOLL');
  const isMacd = $derived($ctx.editIndName === 'MACD');
  const isBias = $derived($ctx.editIndName === 'BIAS');
  const isAo = $derived($ctx.editIndName === 'AO');
  const isWr = $derived($ctx.editIndName === 'WR');
  const isVr = $derived($ctx.editIndName === 'VR');
  const isBbi = $derived($ctx.editIndName === 'BBI');
  const isEma = $derived($ctx.editIndName === 'EMA');
  const isSma = $derived($ctx.editIndName === 'SMA');
  const isMa = $derived($ctx.editIndName === 'MA');
  const isIchimoku = $derived($ctx.editIndName === 'ICHIMOKU');
  const isBrar = $derived($ctx.editIndName === 'BRAR');
  const isPvt = $derived($ctx.editIndName === 'PVT');
  const isVol = $derived($ctx.editIndName === 'VOL');
  const isSar = $derived($ctx.editIndName === 'SAR');
  const isDmi = $derived($ctx.editIndName === 'DMI');
  const isTrix = $derived($ctx.editIndName === 'TRIX');
  const isRoc = $derived($ctx.editIndName === 'ROC');
  const isZigzag = $derived($ctx.editIndName === 'ZIGZAG');
  const isPsy = $derived($ctx.editIndName === 'PSY');
  const isObv = $derived($ctx.editIndName === 'OBV');
  const isCr = $derived($ctx.editIndName === 'CR');

  const isKdj = $derived($ctx.editIndName === 'KDJ');
  const isCci = $derived($ctx.editIndName === 'CCI');
  const isEmv = $derived($ctx.editIndName === 'EMV');
  const isMtm = $derived($ctx.editIndName === 'MTM');
  const isRsi = $derived($ctx.editIndName === 'RSI');

  // ZigZag specific style variables
  let zigzagColor = $state('#2962FF');
  let zigzagThickness = $state(2);
  let zigzagLineStyle = $state('solid');

  // CR specific style variables
  let crPeriod = $state(26);
  let crMa1Period = $state(10);
  let crMa2Period = $state(20);
  let crMa3Period = $state(40);
  let crMa4Period = $state(60);
  let crColor = $state('#FF6B35');
  let crMa1Color = $state('#2196F3');
  let crMa2Color = $state('#4CAF50');
  let crMa3Color = $state('#FF9800');
  let crMa4Color = $state('#9C27B0');
  let crThickness = $state(2);
  let crMa1Thickness = $state(1);
  let crMa2Thickness = $state(1);
  let crMa3Thickness = $state(1);
  let crMa4Thickness = $state(1);
  let crLineStyle = $state('solid');
  let crMa1LineStyle = $state('solid');
  let crMa2LineStyle = $state('solid');
  let crMa3LineStyle = $state('solid');
  let crMa4LineStyle = $state('solid');

  // Debug show variable changes
  $effect(() => {
    if (isZigzag) {
      console.log('🔍 ZigZag show variable changed:', show);
    }
  });

  // ROC initialization effect
  $effect(() => {
    if (isRoc && !rocInitialized) {
      console.log('🎯 ROC modal opened, initializing...');
      rocInitialized = true;
      initializeRocGroups();
      // Detect paneIds for existing indicators after a short delay
      setTimeout(() => {
        detectRocPaneIds();
      }, 100);
    } else if (!isRoc && rocInitialized) {
      // Reset flag when ROC modal is closed
      rocInitialized = false;
    }
  });

  // RSI initialization effect
  let rsiInitialized = $state(false);
  $effect(() => {
    if (isRsi && !rsiInitialized) {
      console.log('🎯 RSI modal opened, initializing...');
      rsiInitialized = true;
      initializeRsiGroups();
    } else if (!isRsi && rsiInitialized) {
      // Reset flag when RSI modal is closed
      rsiInitialized = false;
    }
  });

  // TRIX initialization effect
  $effect(() => {
    if (isTrix && !trixInitialized) {
      console.log('🎯 TRIX modal opened, initializing...');
      trixInitialized = true;
      initializeTrixGroups();
    } else if (!isTrix && trixInitialized) {
      // Reset flag when TRIX modal is closed
      trixInitialized = false;
    }
  });

  // VR initialization effect
  let vrInitialized = $state(false);
  $effect(() => {
    if (isVr && !vrInitialized) {
      console.log('🎯 VR modal opened, initializing...');
      vrInitialized = true;
      initializeVrGroups();
    } else if (!isVr && vrInitialized) {
      // Reset flag when VR modal is closed
      vrInitialized = false;
    }
  });

  // Volume initialization effect
  let volInitialized = $state(false);
  $effect(() => {
    if (isVol && !volInitialized) {
      console.log('🎯 Volume modal opened, initializing...');
      volInitialized = true;
      initializeVolGroups();
    } else if (!isVol && volInitialized) {
      // Reset flag when Volume modal is closed
      volInitialized = false;
    }
  });

  // VR real-time parameter update effects
  $effect(() => {
    if (isVr && vrInitialized && $chart) {
      // Watch for changes in VR groups and update indicators in real-time
      vrGroups.forEach((group, index) => {
        // This effect will trigger when any property of the group changes
        const { period, shortPeriod, longPeriod, styles } = group;
        
        // Trigger update when parameters or styles change
        if (period && shortPeriod && longPeriod && styles) {
          // Small delay to prevent excessive updates during rapid changes
          const timeoutId = setTimeout(() => {
            updateVrIndicator(index);
          }, 100);
          
          return () => clearTimeout(timeoutId);
        }
      });
    }
  });

  // MACD groups management
  let macdGroups = $state<Array<{
    id: string;
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
    styles: {
      macd: {color: string, thickness: number, lineStyle: string};
      signal: {color: string, thickness: number, lineStyle: string};
      histogram: {color: string, thickness: number, lineStyle: string};
    }
  }>>([]);

  // Williams %R groups management
  let wrGroups = $state<Array<{
    id: string;
    period: number;
    overboughtLevel: number;
    middleLevel: number;
    oversoldLevel: number;
    paneId?: string; // Track which pane this WR indicator belongs to
    styles: {
      wr: {color: string, thickness: number, lineStyle: string};
      overbought: {color: string, thickness: number, lineStyle: string};
      oversold: {color: string, thickness: number, lineStyle: string};
      middleLine: {color: string, thickness: number, lineStyle: string};
    }
  }>>([]);

  // VR groups management
  let vrGroups = $state<Array<{
    id: string;
    paneId?: string;
    period: number;
    shortPeriod: number;
    longPeriod: number;
    styles: {
      vr: {color: string, thickness: number, lineStyle: string};
      vrShort: {color: string, thickness: number, lineStyle: string};
      vrLong: {color: string, thickness: number, lineStyle: string};
      [key: string]: {color: string, thickness: number, lineStyle: string};
    }
  }>>([]);

  // AO groups management
  let aoGroups = $state<Array<{
    id: string;
    shortPeriod: number;
    longPeriod: number;
    styles: {
      increasing: {color: string};
      decreasing: {color: string};
    }
  }>>([]);

  // BBI groups management
  let bbiGroups = $state<Array<{
    id: string;
    name: string;
    period1: number;
    period2: number;
    period3: number;
    period4: number;
    color: string;
    thickness: number;
    lineStyle: string;
  }>>([]);

  // BIAS groups management
  let biasGroups = $state<Array<{
    id: string;
    name: string;
    period: number;
    color: string;
    thickness: number;
    lineStyle: string;
  }>>([]);

  // SAR groups management
  let sarGroups = $state<Array<{
    id: string;
    start: number;
    increment: number;
    maxValue: number;
    color: string;
    dotSize: number;
  }>>([]);

  // DMI groups management
  let dmiGroups = $state<Array<{
    id: string;
    name: string;
    diPeriod: number;
    adxPeriod: number;
    styles: {
      diPlus: {color: string, thickness: number, lineStyle: string};
      diMinus: {color: string, thickness: number, lineStyle: string};
      adx: {color: string, thickness: number, lineStyle: string};
    }
  }>>([]);

  // TRIX groups management
  let trixGroups = $state<Array<{
    id: string;
    name: string;
    trixPeriod: number;
    signalPeriod: number;
    paneId?: string;
    styles: {
      trix: {color: string, thickness: number, lineStyle: string};
      signal: {color: string, thickness: number, lineStyle: string};
    }
  }>>([]);

  // CR groups management
  let crGroups = $state<Array<{
    id: string;
    name: string;
    crPeriod: number;
    crMa1Period: number;
    crMa2Period: number;
    crMa3Period: number;
    crMa4Period: number;
    styles: {
      cr: {color: string, thickness: number, lineStyle: string};
      ma1: {color: string, thickness: number, lineStyle: string};
      ma2: {color: string, thickness: number, lineStyle: string};
      ma3: {color: string, thickness: number, lineStyle: string};
      ma4: {color: string, thickness: number, lineStyle: string};
    }
  }>>([]);

  // ROC groups management
  let rocGroups = $state<Array<{
    id: string;
    period: number;
    period2: number;
    paneId?: string; // Track which pane this ROC indicator belongs to
    name?: string; // Display name for the group
    styles: {
      roc: {color: string, thickness: number, lineStyle: string};
      roc2: {color: string, thickness: number, lineStyle: string, visible: boolean};
    }
  }>>([]);
  
  // Flag to prevent infinite initialization loops
  let rocInitialized = $state(false);
  let trixInitialized = $state(false);

  // PSY groups management
  let psyGroups = $state<Array<{
    id: string;
    psyPeriod: number;
    mapsyPeriod: number;
    showMapsy: boolean;
    actualPaneId?: string; // Track which pane this PSY indicator belongs to
    styles: {
      psy: {color: string, thickness: number, lineStyle: string};
      mapsy: {color: string, thickness: number, lineStyle: string};
    }
  }>>([]);

  // OBV groups management
  let obvGroups = $state<Array<{
    id: string;
    obvPeriod: number;
    maobvPeriod: number;
    showMaobv: boolean;
    actualPaneId?: string; // Track which pane this OBV indicator belongs to
    styles: {
      obv: {color: string, thickness: number, lineStyle: string};
      maobv: {color: string, thickness: number, lineStyle: string};
    }
  }>>([]);



  // KDJ groups management
  let kdjGroups = $state<Array<{
    id: string;
    kPeriod: number;
    dPeriod: number;
    actualPaneId?: string; // Track which pane this KDJ indicator belongs to
    styles: {
      k: {color: string, thickness: number, lineStyle: string};
      d: {color: string, thickness: number, lineStyle: string};
      j: {color: string, thickness: number, lineStyle: string};
    }
  }>>([]);

  // CCI groups management
  let cciGroups = $state<Array<{
    id: string;
    name: string;
    period: number;
    color: string;
    thickness: number;
    lineStyle: string;
  }>>([]);

  // Clear CCI groups when CCI is removed from indicator list
  export function clearCciGroups() {
    cciGroups = [];
    console.log('✅ CCI groups cleared from modal state');
  }

  // EMV groups management
  let emvGroups = $state<Array<{
    id: string;
    name: string;
    period: number;
    period2: number;
    color: string;
    thickness: number;
    lineStyle: string;
  }>>([]);

  // Clear EMV groups when EMV is removed from indicator list
  export function clearEmvGroups() {
    emvGroups = [];
    console.log('✅ EMV groups cleared from modal state');
  }

  // MTM groups management
  let mtmGroups = $state<Array<{
    id: string;
    name: string;
    period: number;
    color: string;
    thickness: number;
    lineStyle: string;
  }>>([]);

  // Clear MTM groups when MTM is removed from indicator list
  export function clearMtmGroups() {
    mtmGroups = [];
    console.log('✅ MTM groups cleared from modal state');
  }

  // Clear OBV groups when OBV is removed from indicator list
  export function clearObvGroups() {
    obvGroups = [];
    console.log('✅ OBV groups cleared from modal state');
  }

  // Clear PSY groups when PSY is removed from indicator list
  export function clearPsyGroups() {
    psyGroups = [];
    console.log('✅ PSY groups cleared from modal state');
  }

  // PVT groups management
  let pvtGroups = $state<Array<{
    id: string;
    name: string;
    color: string;
    thickness: number;
    lineStyle: string;
  }>>([]);

  // Clear PVT groups when PVT is removed from indicator list
  export function clearPvtGroups() {
    pvtGroups = [];
    console.log('✅ PVT groups cleared from modal state');
  }

  // Clear VOL groups when VOL is removed from indicator list
  export function clearVolGroups() {
    volGroups = [];
    console.log('✅ VOL groups cleared from modal state');
  }

  // Clear WR groups when WR is removed from indicator list
  export function clearWrGroups() {
    wrGroups = [];
    console.log('✅ WR groups cleared from modal state');
  }

  // Initialize default PVT group
  function initializePvtGroups() {
    if (!isPvt) return;
    
    // Check for saved PVT groups
    const savedKey = `${$ctx.editPaneId}_PVT`;
    const savedInd = $save.saveInds[savedKey];
    
    if (savedInd && (savedInd as any).pvtGroups && (savedInd as any).pvtGroups.length > 0) {
      // Load saved PVT groups
      pvtGroups = [...(savedInd as any).pvtGroups];
    } else if (pvtGroups.length === 0) {
      // Create default PVT group
      pvtGroups = [{
        id: generateUUID(),
        name: 'PVT #1',
        color: '#2563eb',
        thickness: 1,
        lineStyle: 'solid'
      }];
    }
  }

  function addPvtGroup() {
    if (!isPvt) return;
    
    const newGroup = {
      id: generateUUID(),
      name: `PVT #${pvtGroups.length + 1}`,
      color: '#2563eb',
      thickness: 1,
      lineStyle: 'solid'
    };
    
    pvtGroups.push(newGroup);
    
    // Add to chart immediately with proper styling
    if ($chart) {
      // Convert line style to klinecharts format
      let lineStyle = kc.LineType.Solid;
      let dashedValue = [2, 2];
      
      if (newGroup.lineStyle === 'dashed') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [4, 4];
      } else if (newGroup.lineStyle === 'dotted') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [2, 2];
      }
      
      const indicatorStyles = {
        lines: [{
          color: newGroup.color,
          size: newGroup.thickness,
          style: lineStyle,
          dashedValue: dashedValue
        }]
      };

      // Create PVT indicator with custom styles
      const paneId = $chart?.createIndicator({
        name: 'PVT',
        styles: indicatorStyles,
        figures: [
          {
            key: 'pvt',
            title: 'PVT: ',
            type: 'line'
          }
        ]
      }, false);
      
      console.log('✅ Created PVT indicator on pane:', paneId);
      
      // Save the new group to persistent storage
      if (paneId) {
        save.update(s => {
          const saveKey = `${paneId}_PVT`;
          if (!s.saveInds[saveKey]) {
            s.saveInds[saveKey] = {
              name: 'PVT',
              pane_id: paneId,
              pvtGroups: []
            };
          }
          
          // Ensure pvtGroups array exists
          if (!s.saveInds[saveKey].pvtGroups) {
            s.saveInds[saveKey].pvtGroups = [];
          }
          
          // Add the new group
          s.saveInds[saveKey].pvtGroups.push({...newGroup});
          console.log('💾 Saved new PVT group to storage:', saveKey, newGroup);
          
          return s;
        });
      }
    }
    
    console.log('➕ Added new PVT group:', newGroup.name, 'ID:', newGroup.id);
  }

  function removePvtGroup(groupIndex: number) {
    if (!isPvt || pvtGroups.length <= 1 || groupIndex < 0 || groupIndex >= pvtGroups.length) return;
    
    console.log('🗑️ Removing PVT group at index:', groupIndex);
    
    // Remove from groups array
    const oldLength = pvtGroups.length;
    const groupToRemove = pvtGroups[groupIndex];
    
    pvtGroups.splice(groupIndex, 1);
    console.log(`📝 Removed group: ${oldLength} -> ${pvtGroups.length}`);
    
    // Update names
    pvtGroups.forEach((group, index) => {
      group.name = `PVT #${index + 1}`;
    });
    
    // Remove all PVT indicators from chart and re-add remaining ones
    if ($chart) {
      try {
        const indicators = $chart?.getIndicators();
        const pvtIndicators = indicators.filter(ind => ind.name === 'PVT');
        console.log('📈 PVT indicators found:', pvtIndicators.length);
        
        // Remove all PVT indicators
        for (const indicator of pvtIndicators) {
          console.log('🗑️ Removing PVT from pane:', indicator.paneId);
          $chart?.removeIndicator({ paneId: indicator.paneId, name: 'PVT' });
        }
        
        // Re-add remaining PVT groups
        pvtGroups.forEach((group, index) => {
          // Convert line style to klinecharts format
          let lineStyle = kc.LineType.Solid;
          let dashedValue = [2, 2];
          
          if (group.lineStyle === 'dashed') {
            lineStyle = kc.LineType.Dashed;
            dashedValue = [4, 4];
          } else if (group.lineStyle === 'dotted') {
            lineStyle = kc.LineType.Dashed;
            dashedValue = [2, 2];
          }
          
          const indicatorStyles = {
            lines: [{
              color: group.color,
              size: group.thickness,
              style: lineStyle,
              dashedValue: dashedValue
            }]
          };

          console.log('➕ Re-adding PVT group:', group.name, 'at index:', index);
          const paneId = $chart?.createIndicator({
            name: 'PVT',
            styles: indicatorStyles,
            figures: [
              {
                key: 'pvt',
                title: 'PVT: ',
                type: 'line'
              }
            ]
          }, false);
          
          // Update save data for the new pane
          if (paneId) {
            save.update(s => {
              const saveKey = `${paneId}_PVT`;
              if (!s.saveInds[saveKey]) {
                s.saveInds[saveKey] = {
                  name: 'PVT',
                  pane_id: paneId,
                  pvtGroups: []
                };
              }
              
              // Ensure pvtGroups array exists
              if (!s.saveInds[saveKey].pvtGroups) {
                s.saveInds[saveKey].pvtGroups = [];
              }
              
              // Add the group at the correct index
              s.saveInds[saveKey].pvtGroups[index] = {...group};
              
              return s;
            });
          }
        });
        
        console.log('✅ Successfully updated PVT indicators on chart');
      } catch (error) {
        console.error('❌ Error updating PVT indicators:', error);
      }
    }
    
    console.log('✅ PVT group removed. Remaining groups:', pvtGroups.length);
  }

  // Clear ROC groups when ROC is removed from indicator list
  export function clearRocGroups() {
    rocGroups = [];
    console.log('✅ ROC groups cleared from modal state');
  }

  // RSI groups management
  let rsiGroups = $state<Array<{
    id: string;
    period: number;
    overboughtLevel: number;
    middleLevel: number;
    oversoldLevel: number;
    paneId?: string; // Track which pane this RSI indicator belongs to
    styles: {
      rsi: {color: string, thickness: number, lineStyle: string};
      // Dynamic coloring options
      overboughtColor: string;
      oversoldColor: string;
      middleLineColor: string;
    }
  }>>([]);

  // Clear RSI groups when RSI is removed from indicator list
  export function clearRsiGroups() {
    rsiGroups = [];
    console.log('✅ RSI groups cleared from modal state');
  }

  // Initialize default RSI group
  function initializeRsiGroups() {
    if (!isRsi) return;
    
    // Check for saved RSI groups
    const savedKey = `${$ctx.editPaneId}_RSI`;
    const savedInd = $save.saveInds[savedKey];
    
    if (savedInd && (savedInd as any).rsiGroups && (savedInd as any).rsiGroups.length > 0) {
      // Load saved RSI groups
      rsiGroups = [...(savedInd as any).rsiGroups];
    } else if (rsiGroups.length === 0) {
      // Create default RSI group with current pane ID
      const defaultGroup = {
        id: generateUUID(),
        period: 14,
        overboughtLevel: 70,
        middleLevel: 50,
        oversoldLevel: 30,
        paneId: $ctx.editPaneId, // Assign current pane ID to first RSI
        styles: {
          rsi: {color: '#8B5CF6', thickness: 2, lineStyle: 'solid'},
          // Dynamic coloring defaults
          overboughtColor: '#EF4444', // Red for overbought
          oversoldColor: '#10B981',   // Green for oversold
          middleLineColor: '#6B7280'  // Gray for middle line
        }
      };
      
      rsiGroups = [defaultGroup];
      
      // Create RSI instance in RSIManager for the default group
      RSIManager.createInstance($ctx.editPaneId, {
        period: defaultGroup.period,
        lineColor: defaultGroup.styles.rsi.color,
        lineThickness: defaultGroup.styles.rsi.thickness,
        lineStyle: defaultGroup.styles.rsi.lineStyle as 'solid' | 'dashed' | 'dotted',
        levels: [
          {
            id: 'overbought',
            value: defaultGroup.overboughtLevel,
            color: '#EF4444',
            lineStyle: 'solid',
            thickness: 1,
            label: 'Overbought',
            visible: true
          },
          {
            id: 'middle',
            value: defaultGroup.middleLevel,
            color: '#6B7280',
            lineStyle: 'dashed',
            thickness: 1,
            label: 'Middle',
            visible: true
          },
          {
            id: 'oversold',
            value: defaultGroup.oversoldLevel,
            color: '#10B981',
            lineStyle: 'solid',
            thickness: 1,
            label: 'Oversold',
            visible: true
          }
        ]
      });
    }
  }

  function addRsiGroup() {
    if (!isRsi) return;
    
    // Generate unique pane ID for the new RSI instance
    const newPaneId = `pane_RSI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newGroup = {
      id: generateUUID(),
      period: 14,
      overboughtLevel: 70,
      middleLevel: 50,
      oversoldLevel: 30,
      paneId: newPaneId, // Store the pane ID with the group
      styles: {
        rsi: {color: '#8B5CF6', thickness: 2, lineStyle: 'solid'},
        // Dynamic coloring defaults
        overboughtColor: '#EF4444', // Red for overbought
        oversoldColor: '#10B981',   // Green for oversold
        middleLineColor: '#6B7280'  // Gray for middle line
      }
    };
    
    rsiGroups.push(newGroup);
    
    // Create RSI instance in RSIManager with the levels
    RSIManager.createInstance(newPaneId, {
      period: newGroup.period,
      lineColor: newGroup.styles.rsi.color,
      lineThickness: newGroup.styles.rsi.thickness,
      lineStyle: newGroup.styles.rsi.lineStyle as 'solid' | 'dashed' | 'dotted',
      levels: [
        {
          id: 'overbought',
          value: newGroup.overboughtLevel,
          color: '#EF4444',
          lineStyle: 'solid',
          thickness: 1,
          label: 'Overbought',
          visible: true
        },
        {
          id: 'middle',
          value: newGroup.middleLevel,
          color: '#6B7280',
          lineStyle: 'dashed',
          thickness: 1,
          label: 'Middle',
          visible: true
        },
        {
          id: 'oversold',
          value: newGroup.oversoldLevel,
          color: '#10B981',
          lineStyle: 'solid',
          thickness: 1,
          label: 'Oversold',
          visible: true
        }
      ]
    });
    
    // Add to chart immediately with proper styling in a new sub-pane
    if ($chart) {
      // Convert line style to klinecharts format
      let lineStyle = kc.LineType.Solid;
      let dashedValue = [2, 2];
      
      if (newGroup.styles.rsi.lineStyle === 'dashed') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [4, 4];
      } else if (newGroup.styles.rsi.lineStyle === 'dotted') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [2, 2];
      }
      
      const indicatorId = $chart.createIndicator({
        name: 'RSI',
        calcParams: [newGroup.period],
        styles: {
          lines: [{
            color: newGroup.styles.rsi.color,
            size: newGroup.styles.rsi.thickness,
            style: lineStyle,
            dashedValue: dashedValue
          }]
        }
      }, false, { id: newPaneId }); // false = create in sub-pane, not main pane
      
      // Save the indicator to the save system
      if (indicatorId) {
        const saveKey = `${newPaneId}_RSI`;
        save.update(s => {
          s.saveInds[saveKey] = {
            name: 'RSI',
            pane_id: newPaneId,
            params: [newGroup.period]
          };
          return s;
        });
      }
    }
    
    console.log('➕ Added new RSI group in new pane:', newGroup.id, newPaneId);
  }

  function removeRsiGroup(groupIndex: number) {
    if (!isRsi || rsiGroups.length <= 1 || groupIndex < 0 || groupIndex >= rsiGroups.length) return;
    
    console.log('🗑️ Removing RSI group at index:', groupIndex);
    
    // Get the group to remove
    const groupToRemove = rsiGroups[groupIndex];
    const paneIdToRemove = groupToRemove.paneId;
    
    // Remove from groups array
    const oldLength = rsiGroups.length;
    rsiGroups.splice(groupIndex, 1);
    console.log(`📝 Removed group: ${oldLength} -> ${rsiGroups.length}`);
    
    // Remove the specific RSI indicator from its pane
    if ($chart && paneIdToRemove) {
      try {
        console.log('🗑️ Removing RSI from pane:', paneIdToRemove);
        
        // Remove RSI instance from RSIManager
        RSIManager.deleteInstance(paneIdToRemove);
        
        // Use delInd function for proper removal (includes cleanup and error handling)
        delInd(paneIdToRemove, 'RSI');
        
      } catch (error) {
        console.error('❌ Error removing RSI indicator:', error);
      }
    }
    
    console.log('✅ RSI group removed. Remaining groups:', rsiGroups.length);
  }

  function updateRsiIndicator(groupIndex: number) {
    if (!isRsi || !$chart || groupIndex < 0 || groupIndex >= rsiGroups.length) return;
    
    const group = rsiGroups[groupIndex];
    const paneId = group.paneId || $ctx.editPaneId;
    
    console.log('🔄 Updating RSI indicator:', groupIndex, paneId);
    
    try {
      // Update RSI levels in RSIManager first
      RSIManager.updateInstance(paneId, {
        period: group.period,
        lineColor: group.styles.rsi.color,
        lineThickness: group.styles.rsi.thickness,
        lineStyle: group.styles.rsi.lineStyle as 'solid' | 'dashed' | 'dotted',
        enableDynamicColoring: true,
        overboughtColor: group.styles.overboughtColor || '#EF4444',
        oversoldColor: group.styles.oversoldColor || '#10B981',
        overboughtThreshold: group.overboughtLevel,
        oversoldThreshold: group.oversoldLevel,
        levels: [
          {
            id: 'overbought',
            value: group.overboughtLevel,
            color: group.styles.overboughtColor || '#EF4444',
            lineStyle: 'solid',
            thickness: 1,
            label: 'Overbought',
            visible: true
          },
          {
            id: 'middle',
            value: group.middleLevel,
            color: group.styles.middleLineColor || '#6B7280',
            lineStyle: 'dashed',
            thickness: 1,
            label: 'Middle',
            visible: true
          },
          {
            id: 'oversold',
            value: group.oversoldLevel,
            color: group.styles.oversoldColor || '#10B981',
            lineStyle: 'solid',
            thickness: 1,
            label: 'Oversold',
            visible: true
          }
        ]
      });
      
      // Remove the existing RSI indicator from this specific pane
      $chart.removeIndicator({ paneId: paneId, name: 'RSI' });
      
      // Convert line style to klinecharts format
      let lineStyle = kc.LineType.Solid;
      let dashedValue = [2, 2];
      
      if (group.styles.rsi.lineStyle === 'dashed') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [4, 4];
      } else if (group.styles.rsi.lineStyle === 'dotted') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [2, 2];
      }
      
      // Re-create the RSI indicator with updated parameters
      const indicatorId = $chart.createIndicator({
        name: 'RSI',
        calcParams: [group.period],
        styles: {
          lines: [{
            color: group.styles.rsi.color,
            size: group.styles.rsi.thickness,
            style: lineStyle,
            dashedValue: dashedValue
          }]
        }
      }, paneId === $ctx.editPaneId, { id: paneId });
      
      // Update the save system
      if (indicatorId) {
        const saveKey = `${paneId}_RSI`;
        save.update(s => {
          s.saveInds[saveKey] = {
            name: 'RSI',
            pane_id: paneId,
            params: [group.period]
          };
          return s;
        });
      }
      
      console.log('✅ RSI indicator and levels updated successfully');
      
    } catch (error) {
      console.error('❌ Error updating RSI indicator:', error);
    }
  }

  // Initialize default MACD group
  function initializeMacdGroups() {
    if (!isMacd) return;
    
    // Check for saved MACD groups
    const savedKey = `${$ctx.editPaneId}_MACD`;
    const savedInd = $save.saveInds[savedKey];
    
    if (savedInd && (savedInd as any).macdGroups && (savedInd as any).macdGroups.length > 0) {
      // Load saved MACD groups
      macdGroups = [...(savedInd as any).macdGroups];
    } else if (macdGroups.length === 0) {
      // Create default MACD group
      macdGroups = [{
        id: generateUUID(),
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        styles: {
          macd: {color: '#2563eb', thickness: 1, lineStyle: 'solid'},
          signal: {color: '#dc2626', thickness: 1, lineStyle: 'solid'},
          histogram: {color: '#16a34a', thickness: 1, lineStyle: 'solid'}
        }
      }];
    }
  }

  function addMacdGroup() {
    if (!isMacd) return;
    
    macdGroups.push({
      id: generateUUID(),
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      styles: {
        macd: {color: '#2563eb', thickness: 1, lineStyle: 'solid'},
        signal: {color: '#dc2626', thickness: 1, lineStyle: 'solid'},
        histogram: {color: '#16a34a', thickness: 1, lineStyle: 'solid'}
      }
    });
  }

  function removeMacdGroup(groupId: string) {
    if (!isMacd || macdGroups.length <= 1) return;
    macdGroups = macdGroups.filter(group => group.id !== groupId);
  }

  // Initialize default EMV group
  function initializeEmvGroups() {
    if (!isEmv) return;
    
    try {
      // Check for saved EMV groups
      const savedKey = `${$ctx.editPaneId}_EMV`;
      const savedInd = $save.saveInds[savedKey];
      
      if (savedInd && (savedInd as any).emvGroups && Array.isArray((savedInd as any).emvGroups) && (savedInd as any).emvGroups.length > 0) {
        // Validate and load saved EMV groups
        const validGroups = (savedInd as any).emvGroups.filter((group: any) => 
          group && 
          typeof group.id === 'string' && 
          typeof group.name === 'string' &&
          typeof group.period === 'number' && group.period > 0 &&
          typeof group.period2 === 'number' && group.period2 > 0 &&
          typeof group.color === 'string' &&
          typeof group.thickness === 'number' && group.thickness > 0 &&
          typeof group.lineStyle === 'string'
        );
        
        if (validGroups.length > 0) {
          emvGroups = [...validGroups];
          console.log('✅ Loaded', validGroups.length, 'valid EMV groups');
        } else {
          console.warn('⚠️ No valid EMV groups found in saved data, creating default');
          createDefaultEmvGroup();
        }
      } else if (emvGroups.length === 0) {
        // Create default EMV group
        createDefaultEmvGroup();
      }
    } catch (error) {
      console.error('❌ Error initializing EMV groups:', error);
      createDefaultEmvGroup();
    }
  }

  function createDefaultEmvGroup() {
    emvGroups = [{
      id: generateUUID(),
      name: 'EMV #1',
      period: 14,
      period2: 9,
      color: '#2563eb',
      thickness: 2,
      lineStyle: 'solid'
    }];
    console.log('✅ Created default EMV group');
  }

  function addEmvGroup() {
    if (!isEmv) return;
    
    try {
      // Limit maximum number of EMV groups to prevent performance issues
      const maxGroups = 10;
      if (emvGroups.length >= maxGroups) {
        console.warn(`⚠️ Maximum number of EMV groups (${maxGroups}) reached`);
        return;
      }
      
      const groupNumber = emvGroups.length + 1;
      const newGroup = {
        id: generateUUID(),
        name: `EMV #${groupNumber}`,
        period: 14,
        period2: 9,
        color: '#2563eb',
        thickness: 2,
        lineStyle: 'solid'
      };
      
      emvGroups.push(newGroup);
      console.log('✅ Added new EMV group:', newGroup.name);
    } catch (error) {
      console.error('❌ Error adding EMV group:', error);
    }
  }

  function removeEmvGroup(groupId: string) {
    if (!isEmv || emvGroups.length <= 1) {
      console.warn('⚠️ Cannot remove EMV group: minimum one group required');
      return;
    }
    
    try {
      if (!groupId || typeof groupId !== 'string') {
        console.error('❌ Invalid group ID provided for EMV group removal');
        return;
      }
      
      const initialLength = emvGroups.length;
      emvGroups = emvGroups.filter(group => group.id !== groupId);
      
      if (emvGroups.length < initialLength) {
        console.log('✅ Removed EMV group with ID:', groupId);
      } else {
        console.warn('⚠️ EMV group not found for removal:', groupId);
      }
    } catch (error) {
      console.error('❌ Error removing EMV group:', error);
    }
  }

  // Initialize default MTM group
  function initializeMtmGroups() {
    if (!isMtm) return;
    
    try {
      // Check for saved MTM groups
      const savedKey = `${$ctx.editPaneId}_MTM`;
      const savedInd = $save.saveInds[savedKey];
      
      if (savedInd && (savedInd as any).mtmGroups && Array.isArray((savedInd as any).mtmGroups) && (savedInd as any).mtmGroups.length > 0) {
        // Validate and load saved MTM groups
        const validGroups = (savedInd as any).mtmGroups.filter((group: any) => 
          group && 
          typeof group.id === 'string' && 
          typeof group.name === 'string' &&
          typeof group.period === 'number' && group.period > 0 &&
          typeof group.color === 'string' &&
          typeof group.thickness === 'number' && group.thickness > 0 &&
          typeof group.lineStyle === 'string'
        );
        
        if (validGroups.length > 0) {
          mtmGroups = [...validGroups];
          console.log('✅ Loaded', validGroups.length, 'valid MTM groups');
        } else {
          console.warn('⚠️ No valid MTM groups found in saved data, creating default');
          createDefaultMtmGroup();
        }
      } else if (mtmGroups.length === 0) {
        // Create default MTM group
        createDefaultMtmGroup();
      }
    } catch (error) {
      console.error('❌ Error initializing MTM groups:', error);
      createDefaultMtmGroup();
    }
  }

  function createDefaultMtmGroup() {
    mtmGroups = [{
      id: generateUUID(),
      name: 'MTM #1',
      period: 14,
      color: '#2563eb',
      thickness: 2,
      lineStyle: 'solid'
    }];
    console.log('✅ Created default MTM group');
  }

  function addMtmGroup() {
    if (!isMtm) return;
    
    try {
      // Limit maximum number of MTM groups to prevent performance issues
      const maxGroups = 10;
      if (mtmGroups.length >= maxGroups) {
        console.warn(`⚠️ Maximum number of MTM groups (${maxGroups}) reached`);
        return;
      }
      
      const groupNumber = mtmGroups.length + 1;
      const newGroup = {
        id: generateUUID(),
        name: `MTM #${groupNumber}`,
        period: 14,
        color: '#2563eb',
        thickness: 2,
        lineStyle: 'solid'
      };
      
      mtmGroups.push(newGroup);
      console.log('✅ Added new MTM group:', newGroup.name);
    } catch (error) {
      console.error('❌ Error adding MTM group:', error);
    }
  }

  function removeMtmGroup(groupId: string) {
    if (!isMtm || mtmGroups.length <= 1) {
      console.warn('⚠️ Cannot remove MTM group: minimum one group required');
      return;
    }
    
    try {
      if (!groupId || typeof groupId !== 'string') {
        console.error('❌ Invalid group ID provided for MTM group removal');
        return;
      }
      
      const initialLength = mtmGroups.length;
      mtmGroups = mtmGroups.filter(group => group.id !== groupId);
      
      if (mtmGroups.length < initialLength) {
        console.log('✅ Removed MTM group with ID:', groupId);
      } else {
        console.warn('⚠️ MTM group not found for removal:', groupId);
      }
    } catch (error) {
      console.error('❌ Error removing MTM group:', error);
    }
  }



  // Initialize default Williams %R group
  function initializeWrGroups() {
    if (!isWr) return;
    
    // Check for consolidated Williams %R groups first
    const mainSavedKey = `${$ctx.editPaneId}_WR`;
    const mainSavedInd = $save.saveInds[mainSavedKey];
    
    if (mainSavedInd && (mainSavedInd as any).wrGroups && (mainSavedInd as any).wrGroups.length > 0) {
      // Load consolidated Williams %R groups
      wrGroups = [...(mainSavedInd as any).wrGroups];
      return;
    }
    
    // Fallback: Load from individual saved groups
    const loadedGroups: any[] = [];
    
    // Check for multiple WR groups saved with different keys
    Object.keys($save.saveInds).forEach(key => {
      if ((key.includes('_WR') || key.startsWith('WR_')) && key !== mainSavedKey) {
        const savedInd = $save.saveInds[key];
        if (savedInd && (savedInd as any).wrGroup) {
          loadedGroups.push((savedInd as any).wrGroup);
        }
      }
    });
    
    // Check for single WR group in main key
    if (mainSavedInd && (mainSavedInd as any).wrGroup) {
      loadedGroups.unshift((mainSavedInd as any).wrGroup);
    }
    
    if (loadedGroups.length > 0) {
      // Load all found Williams %R groups
      wrGroups = [...loadedGroups];
    } else if (wrGroups.length === 0) {
      // Create default Williams %R group
      wrGroups = [{
        id: generateUUID(),
        period: 14,
        overboughtLevel: -20,
        middleLevel: -50,
        oversoldLevel: -80,
        paneId: $ctx.editPaneId, // Assign the current edit pane ID to the default group
        styles: {
          wr: {color: '#2563eb', thickness: 1, lineStyle: 'solid'},
          overbought: {color: '#EF4444', thickness: 1, lineStyle: 'solid'},
          oversold: {color: '#10B981', thickness: 1, lineStyle: 'solid'},
          middleLine: {color: '#6B7280', thickness: 1, lineStyle: 'solid'}
        }
      }];
    }
  }

  function addWrGroup() {
    if (!isWr) return;
    
    // Generate unique pane ID for the new WR instance
    const newPaneId = `pane_WR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newGroup = {
      id: generateUUID(),
      period: 14,
      overboughtLevel: -20,
      middleLevel: -50,
      oversoldLevel: -80,
      paneId: newPaneId, // Store the pane ID with the group
      styles: {
        wr: {color: '#2563eb', thickness: 1, lineStyle: 'solid'},
        overbought: {color: '#EF4444', thickness: 1, lineStyle: 'solid'},
        oversold: {color: '#10B981', thickness: 1, lineStyle: 'solid'},
        middleLine: {color: '#6B7280', thickness: 1, lineStyle: 'solid'}
      }
    };
    
    wrGroups.push(newGroup);
    
    // Create WR instance in WRManager with the levels
    WRManager.createInstance(newPaneId, {
      period: newGroup.period,
      lineColor: newGroup.styles.wr.color,
      lineThickness: newGroup.styles.wr.thickness,
      lineStyle: newGroup.styles.wr.lineStyle as 'solid' | 'dashed' | 'dotted',
      levels: [
        {
          id: 'overbought',
          value: newGroup.overboughtLevel,
          color: newGroup.styles.overbought.color,
          lineStyle: newGroup.styles.overbought.lineStyle as 'solid' | 'dashed' | 'dotted',
          thickness: newGroup.styles.overbought.thickness,
          label: 'Overbought',
          visible: true
        },
        {
          id: 'middle',
          value: newGroup.middleLevel,
          color: newGroup.styles.middleLine.color,
          lineStyle: newGroup.styles.middleLine.lineStyle as 'solid' | 'dashed' | 'dotted',
          thickness: newGroup.styles.middleLine.thickness,
          label: 'Middle',
          visible: true
        },
        {
          id: 'oversold',
          value: newGroup.oversoldLevel,
          color: newGroup.styles.oversold.color,
          lineStyle: newGroup.styles.oversold.lineStyle as 'solid' | 'dashed' | 'dotted',
          thickness: newGroup.styles.oversold.thickness,
          label: 'Oversold',
          visible: true
        }
      ]
    });
    
    // Add to chart immediately with proper styling in a new sub-pane
    if ($chart) {
      // Convert line style to klinecharts format
      let lineStyle = kc.LineType.Solid;
      let dashedValue = [2, 2];
      
      if (newGroup.styles.wr.lineStyle === 'dashed') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [4, 4];
      } else if (newGroup.styles.wr.lineStyle === 'dotted') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [2, 2];
      }
      
      const indicatorId = $chart.createIndicator({
        name: 'WR',
        calcParams: [newGroup.period],
        styles: {
          lines: [{
            color: newGroup.styles.wr.color,
            size: newGroup.styles.wr.thickness,
            style: lineStyle,
            dashedValue: dashedValue
          }]
        }
      }, false, { id: newPaneId }); // false = create in sub-pane, not main pane
      
      // Save the indicator to the save system
      if (indicatorId) {
        const saveKey = `${newPaneId}_WR`;
        save.update(s => {
          s.saveInds[saveKey] = {
            name: 'WR',
            pane_id: newPaneId,
            params: [newGroup.period]
          };
          return s;
        });
      }
    }
    
    console.log('➕ Added new WR group in new pane:', newGroup.id, newPaneId);
  }

  function removeWrGroup(groupId: string) {
    if (!isWr || wrGroups.length <= 1) return;
    
    // Find the group to be removed to get its pane information
    const groupToRemove = wrGroups.find(group => group.id === groupId);
    if (!groupToRemove) return;
    
    // Find the index of the group
    const groupIndex = wrGroups.findIndex(group => group.id === groupId);
    
    // Use the group's paneId
    const paneIdToRemove = groupToRemove.paneId;
    
    // Remove from wrGroups array first
    wrGroups = wrGroups.filter(group => group.id !== groupId);
    
    // Remove from WRManager if it exists
    if (paneIdToRemove) {
      WRManager.deleteInstance(paneIdToRemove);
    }
    
    // Use delInd function to remove from chart and clean up save system
    if (paneIdToRemove) {
      delInd(paneIdToRemove, 'WR');
    }
    
    console.log('🗑️ Removed WR group from pane:', paneIdToRemove);
  }

  function updateWrIndicator(groupIndex: number) {
    if (!isWr || !$chart || groupIndex < 0 || groupIndex >= wrGroups.length) return;
    
    const group = wrGroups[groupIndex];
    const paneId = group.paneId || $ctx.editPaneId;
    
    console.log('🔄 Updating WR indicator:', groupIndex, paneId);
    
    try {
      // Update WR levels in WRManager first
      WRManager.updateInstance(paneId, {
        period: group.period,
        lineColor: group.styles.wr.color,
        lineThickness: group.styles.wr.thickness,
        lineStyle: group.styles.wr.lineStyle as 'solid' | 'dashed' | 'dotted',
        enableDynamicColoring: true,
        overboughtColor: group.styles.overbought.color || '#EF4444',
        oversoldColor: group.styles.oversold.color || '#10B981',
        overboughtThreshold: group.overboughtLevel,
        oversoldThreshold: group.oversoldLevel,
        levels: [
          {
            id: 'overbought',
            value: group.overboughtLevel,
            color: group.styles.overbought.color || '#EF4444',
            lineStyle: group.styles.overbought.lineStyle as 'solid' | 'dashed' | 'dotted',
            thickness: group.styles.overbought.thickness,
            label: 'Overbought',
            visible: true
          },
          {
            id: 'middle',
            value: group.middleLevel,
            color: group.styles.middleLine.color || '#6B7280',
            lineStyle: group.styles.middleLine.lineStyle as 'solid' | 'dashed' | 'dotted',
            thickness: group.styles.middleLine.thickness,
            label: 'Middle',
            visible: true
          },
          {
            id: 'oversold',
            value: group.oversoldLevel,
            color: group.styles.oversold.color || '#10B981',
            lineStyle: group.styles.oversold.lineStyle as 'solid' | 'dashed' | 'dotted',
            thickness: group.styles.oversold.thickness,
            label: 'Oversold',
            visible: true
          }
        ]
      });
      
      // Remove the existing WR indicator from this specific pane
      $chart.removeIndicator({ paneId: paneId, name: 'WR' });
      
      // Convert line style to klinecharts format
      let lineStyle = kc.LineType.Solid;
      let dashedValue = [2, 2];
      
      if (group.styles.wr.lineStyle === 'dashed') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [4, 4];
      } else if (group.styles.wr.lineStyle === 'dotted') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [2, 2];
      }
      
      // Re-create the WR indicator with updated parameters
      const indicatorId = $chart.createIndicator({
        name: 'WR',
        calcParams: [group.period],
        styles: {
          lines: [{
            color: group.styles.wr.color,
            size: group.styles.wr.thickness,
            style: lineStyle,
            dashedValue: dashedValue
          }]
        }
      }, paneId === $ctx.editPaneId, { id: paneId });
      
      // Update the save system
      if (indicatorId) {
        const saveKey = `${paneId}_WR`;
        save.update(s => {
          s.saveInds[saveKey] = {
            name: 'WR',
            pane_id: paneId,
            params: [group.period]
          };
          return s;
        });
      }
      
      console.log('✅ WR indicator and levels updated successfully');
      
    } catch (error) {
      console.error('❌ Error updating WR indicator:', error);
    }
  }

  // Initialize default VR group
  function initializeVrGroups() {
    if (!isVr) return;
    
    // Load all VR indicators from save system (like RSI does)
    const vrEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'VR');
    
    if (vrEntries.length > 0) {
      // Load VR groups from all saved VR indicators
      vrGroups = vrEntries.map(([saveKey, savedInd]) => {
        // Check if this indicator has saved VR group data
        if ((savedInd as any).vrGroups && (savedInd as any).vrGroups.length > 0) {
          return (savedInd as any).vrGroups[0]; // Take first group from saved data
        } else if ((savedInd as any).vrGroup) {
          return (savedInd as any).vrGroup; // Single VR group
        } else {
          // Create group from basic saved indicator data
          return {
            id: generateUUID(),
            paneId: savedInd.pane_id,
            period: (savedInd.params?.[0] as number) || 26,
            shortPeriod: (savedInd.params?.[1] as number) || 6,
            longPeriod: (savedInd.params?.[2] as number) || 12,
            styles: {
              vr: {color: '#FF6B35', thickness: 2, lineStyle: 'solid'},
              vrShort: {color: '#2196F3', thickness: 1, lineStyle: 'solid'},
              vrLong: {color: '#4CAF50', thickness: 1, lineStyle: 'solid'}
            }
          };
        }
      });
      
      console.log('✅ Loaded VR groups from save system:', vrGroups.length);
    } else if (vrGroups.length === 0) {
      // Create default VR group with current pane ID (like RSI does)
      const defaultGroup = {
        id: generateUUID(),
        paneId: $ctx.editPaneId, // Assign current pane ID to first VR
        period: 26,
        shortPeriod: 6,
        longPeriod: 12,
        styles: {
          vr: {color: '#FF6B35', thickness: 2, lineStyle: 'solid'},
          vrShort: {color: '#2196F3', thickness: 1, lineStyle: 'solid'},
          vrLong: {color: '#4CAF50', thickness: 1, lineStyle: 'solid'}
        }
      };
      
      vrGroups = [defaultGroup];
      console.log('✅ Created default VR group with pane ID:', $ctx.editPaneId);
    }
  }

  // Initialize Volume groups (VR-style implementation)
  function initializeVolGroups() {
    if (!isVol) return;
    
    // Load all VOL indicators from save system
    const volEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'VOL');
    
    if (volEntries.length > 0) {
      // Load Volume groups from all saved VOL indicators
      volGroups = volEntries.map(([saveKey, savedInd]) => {
        // Check if this indicator has saved Volume group data
        if ((savedInd as any).volGroups && (savedInd as any).volGroups.length > 0) {
          return (savedInd as any).volGroups[0]; // Take first group from saved data
        } else if ((savedInd as any).volGroup) {
          return (savedInd as any).volGroup; // Single Volume group
        } else {
          // Create group from basic saved indicator data
          return {
            id: generateUUID(),
            paneId: savedInd.pane_id,
            period: (savedInd.params?.[0] as number) || 20, // Default 20-period EMA
            styles: {
              histogram: {upColor: '#26a69a', downColor: '#ef5350', thickness: 1, lineStyle: 'solid'}, // Green/Red
              ema: {color: '#8B5CF6', thickness: 1, lineStyle: 'dotted'} // Purple
            }
          };
        }
      });
      
      console.log('✅ Loaded Volume groups from save system:', volGroups.length);
    } else if (volGroups.length === 0) {
      // Create default Volume group with current pane ID
      const defaultGroup = {
        id: generateUUID(),
        paneId: $ctx.editPaneId, // Assign current pane ID to first Volume
        period: 20, // Default 20-period EMA
        styles: {
          histogram: {upColor: '#26a69a', downColor: '#ef5350', thickness: 1, lineStyle: 'solid'}, // Green/Red
          ema: {color: '#8B5CF6', thickness: 1, lineStyle: 'dotted'} // Purple
        }
      };
      
      volGroups = [defaultGroup];
      console.log('✅ Created default Volume group:', defaultGroup);
    }
  }

  function addVrGroup() {
    if (!isVr) return;
    
    // Generate unique pane ID for new VR group
    const newPaneId = `pane_VR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newGroup = {
      id: generateUUID(),
      paneId: newPaneId,
      period: 26,
      shortPeriod: 6,
      longPeriod: 12,
      styles: {
        vr: {color: '#FF6B35', thickness: 2, lineStyle: 'solid'},
        vrShort: {color: '#2196F3', thickness: 1, lineStyle: 'solid'},
        vrLong: {color: '#4CAF50', thickness: 1, lineStyle: 'solid'}
      }
    };
    
    vrGroups.push(newGroup);
    
    // Add to chart immediately with proper styling in a new sub-pane (like RSI does)
    if ($chart) {
      // Convert line style to klinecharts format
      let lineStyle = kc.LineType.Solid;
      let dashedValue = [2, 2];
      
      if (newGroup.styles.vr.lineStyle === 'dashed') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [4, 4];
      } else if (newGroup.styles.vr.lineStyle === 'dotted') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [2, 2];
      }
      
      const indicatorId = $chart.createIndicator({
        name: 'VR',
        calcParams: [newGroup.period, newGroup.shortPeriod, newGroup.longPeriod],
        styles: {
          lines: [{
            color: newGroup.styles.vr.color,
            size: newGroup.styles.vr.thickness,
            style: lineStyle,
            dashedValue: dashedValue
          }]
        }
      }, false, { id: newPaneId }); // false = create in sub-pane, not main pane
      
      // Save the indicator to the save system
      if (indicatorId) {
        const saveKey = `${newPaneId}_VR`;
        save.update(s => {
          s.saveInds[saveKey] = {
            name: 'VR',
            pane_id: newPaneId,
            params: [newGroup.period, newGroup.shortPeriod, newGroup.longPeriod]
          };
          return s;
        });
      }
    }
    
    console.log('➕ Added new VR group in new pane:', newGroup.id, newPaneId);
  }

  function removeVrGroup(groupIndex: number) {
    if (!isVr || vrGroups.length <= 1 || groupIndex < 0 || groupIndex >= vrGroups.length) return;
    
    console.log('🗑️ Removing VR group at index:', groupIndex);
    
    // Get the group to remove
    const groupToRemove = vrGroups[groupIndex];
    const paneIdToRemove = groupToRemove.paneId;
    
    // Remove from groups array
    const oldLength = vrGroups.length;
    vrGroups.splice(groupIndex, 1);
    console.log(`📝 Removed group: ${oldLength} -> ${vrGroups.length}`);
    
    // Remove the specific VR indicator from its pane
    if ($chart && paneIdToRemove) {
      try {
        console.log('🗑️ Removing VR from pane:', paneIdToRemove);
        
        // Use delInd function for proper removal (includes cleanup and error handling)
        delInd(paneIdToRemove, 'VR');
        
      } catch (error) {
        console.error('❌ Error removing VR indicator:', error);
      }
    }
    
    console.log('✅ VR group removed. Remaining groups:', vrGroups.length);
    
    console.log('🗑️ Removed VR group from list (will be applied on confirm)');
  }

  function addVolGroup() {
    if (!isVol) return;
    
    // Generate unique pane ID for new Volume group
    const newPaneId = `pane_VOL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newGroup = {
      id: generateUUID(),
      paneId: newPaneId,
      period: 20, // Default 20-period EMA
      styles: {
        histogram: {upColor: '#26a69a', downColor: '#ef5350', thickness: 1, lineStyle: 'solid'}, // Green/Red
        ema: {color: '#8B5CF6', thickness: 1, lineStyle: 'dotted'} // Purple with dotted style
      }
    };
    
    volGroups.push(newGroup);
    
    // Add to chart immediately with proper styling in a new sub-pane
    if ($chart) {
      // Convert line style to klinecharts format
      let lineStyle = kc.LineType.Solid;
      let dashedValue = [2, 2];
      
      if (newGroup.styles.ema.lineStyle === 'dashed') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [4, 4];
      } else if (newGroup.styles.ema.lineStyle === 'dotted') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [2, 2];
      }
      
      const indicatorId = $chart.createIndicator({
        name: 'VOL',
        calcParams: [newGroup.period], // EMA period
        styles: {
          bars: [{
            upColor: newGroup.styles.histogram.upColor,
            downColor: newGroup.styles.histogram.downColor,
            noChangeColor: newGroup.styles.histogram.upColor
          }],
          lines: [{
            color: newGroup.styles.ema.color,
            size: newGroup.styles.ema.thickness,
            style: lineStyle,
            dashedValue: dashedValue
          }]
        }
      }, false, { id: newPaneId }); // false = create in sub-pane, not main pane
      
      // Save the indicator to the save system
      if (indicatorId) {
        const saveKey = `${newPaneId}_VOL`;
        save.update(s => {
          s.saveInds[saveKey] = {
            name: 'VOL',
            pane_id: newPaneId,
            params: [newGroup.period],
            volGroup: newGroup
          };
          return s;
        });
      }
    }
    
    console.log('➕ Added new Volume group in new pane:', newGroup.id, newPaneId);
  }

  function removeVolGroup(groupIndex: number) {
    if (!isVol || volGroups.length <= 1 || groupIndex < 0 || groupIndex >= volGroups.length) return;
    
    console.log('🗑️ Removing Volume group at index:', groupIndex);
    
    // Get the group to remove
    const groupToRemove = volGroups[groupIndex];
    const paneIdToRemove = groupToRemove.paneId;
    
    // Remove from groups array
    const oldLength = volGroups.length;
    volGroups.splice(groupIndex, 1);
    console.log(`📝 Removed group: ${oldLength} -> ${volGroups.length}`);
    
    // Remove the specific Volume indicator from its pane
    if ($chart && paneIdToRemove) {
      try {
        console.log('🗑️ Removing Volume from pane:', paneIdToRemove);
        
        // Use delInd function for proper removal (includes cleanup and error handling)
        delInd(paneIdToRemove, 'VOL');
        
      } catch (error) {
        console.error('❌ Error removing Volume indicator:', error);
      }
    }
    
    console.log('✅ Volume group removed. Remaining groups:', volGroups.length);
    console.log('🗑️ Removed Volume group from list (will be applied on confirm)');
  }

  function updateVrIndicator(groupIndex: number) {
    if ($ctx.editIndName !== 'VR' || !$chart || groupIndex < 0 || groupIndex >= vrGroups.length) return;
    
    const group = vrGroups[groupIndex];
    const paneId = group.paneId || $ctx.editPaneId;
    
    console.log('🔄 Updating VR indicator:', groupIndex, paneId);
    
    try {
      // Remove the existing VR indicator from this specific pane
      $chart.removeIndicator({ paneId: paneId, name: 'VR' });
      
      // Convert line styles to klinecharts format
      const convertLineStyle = (style: string) => {
        switch (style) {
          case 'dashed': return { style: kc.LineType.Dashed, dashedValue: [4, 4] };
          case 'dotted': return { style: kc.LineType.Dashed, dashedValue: [2, 2] };
          default: return { style: kc.LineType.Solid, dashedValue: [2, 2] };
        }
      };
      
      const vrStyle = convertLineStyle(group.styles.vr.lineStyle);
      const vrShortStyle = convertLineStyle(group.styles.vrShort.lineStyle);
      const vrLongStyle = convertLineStyle(group.styles.vrLong.lineStyle);
      
      // Re-create the VR indicator with updated parameters
      const indicatorId = $chart.createIndicator({
        name: 'VR',
        calcParams: [group.period, group.shortPeriod, group.longPeriod],
        styles: {
          lines: [
            {
              color: group.styles.vr.color,
              size: group.styles.vr.thickness,
              style: vrStyle.style,
              dashedValue: vrStyle.dashedValue
            },
            {
              color: group.styles.vrShort.color,
              size: group.styles.vrShort.thickness,
              style: vrShortStyle.style,
              dashedValue: vrShortStyle.dashedValue
            },
            {
              color: group.styles.vrLong.color,
              size: group.styles.vrLong.thickness,
              style: vrLongStyle.style,
              dashedValue: vrLongStyle.dashedValue
            }
          ]
        }
      }, paneId === $ctx.editPaneId, { id: paneId });
      
      // Update the save system
      if (indicatorId) {
        const saveKey = `${paneId}_VR`;
        save.update(s => {
          s.saveInds[saveKey] = {
            name: 'VR',
            pane_id: paneId,
            params: [group.period, group.shortPeriod, group.longPeriod]
          };
          return s;
        });
      }
      
      console.log('✅ VR indicator updated successfully');
    } catch (error) {
      console.error('❌ Error updating VR indicator:', error);
    }
  }

  function updateVolIndicator(groupIndex: number) {
    if ($ctx.editIndName !== 'VOL' || !$chart || groupIndex < 0 || groupIndex >= volGroups.length) return;
    
    const group = volGroups[groupIndex];
    const paneId = group.paneId;
    
    if (!paneId) {
      console.warn('⚠️ No paneId found for Volume group:', groupIndex);
      return;
    }
    
    try {
      console.log('🔄 Updating Volume indicator for group:', groupIndex, 'paneId:', paneId);
      
      // Remove the existing Volume indicator from this specific pane
      $chart.removeIndicator({ paneId: paneId, name: 'VOL' });
      
      // Convert line style to klinecharts format
      let lineStyle = kc.LineType.Solid;
      let dashedValue = [2, 2];
      
      if (group.styles.ema.lineStyle === 'dashed') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [4, 4];
      } else if (group.styles.ema.lineStyle === 'dotted') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [2, 2];
      }
      
      // Debug logging for volume colors
      console.log('updateVolIndicator - Colors being applied:', {
        upColor: group.styles.histogram.upColor,
        downColor: group.styles.histogram.downColor,
        noChangeColor: group.styles.histogram.upColor,
        emaColor: group.styles.ema.color
      });

      // Re-create the Volume indicator with updated parameters
      const indicatorId = $chart.createIndicator({
        name: 'VOL',
        calcParams: [group.period], // EMA period
        styles: {
          bars: [{
            upColor: group.styles.histogram.upColor,
            downColor: group.styles.histogram.downColor,
            noChangeColor: group.styles.histogram.upColor
          }],
          lines: [{
            color: group.styles.ema.color,
            size: group.styles.ema.thickness,
            style: lineStyle,
            dashedValue: dashedValue
          }]
        }
      }, paneId === $ctx.editPaneId, { id: paneId });
      
      // Update the save system
      if (indicatorId) {
        const saveKey = `${paneId}_VOL`;
        save.update(s => {
          s.saveInds[saveKey] = {
            name: 'VOL',
            pane_id: paneId,
            params: [group.period],
            volGroup: group
          };
          return s;
        });
      }
      
      console.log('✅ Volume indicator updated successfully');
       
     } catch (error) {
       console.error('❌ Error updating Volume indicator:', error);
     }
  }

  function updateEmaIndicator() {
    if ($ctx.editIndName !== 'EMA' || !$chart) return;
    
    try {
      console.log('🔄 Updating EMA indicator');
      
      // Remove the existing EMA indicator from the edit pane
      $chart.removeIndicator({ paneId: $ctx.editPaneId, name: 'EMA' });
      
      // Re-create the EMA indicator with updated parameters
      const indicatorId = $chart.createIndicator({
        name: 'EMA',
        calcParams: params,
        styles: {
          lines: params.map((_, index) => {
            const style = styles[index];
            let lineStyle = kc.LineType.Solid;
            let dashedValue = [2, 2];
            
            if (style?.lineStyle === 'dashed') {
              lineStyle = kc.LineType.Dashed;
              dashedValue = [4, 4];
            } else if (style?.lineStyle === 'dotted') {
              lineStyle = kc.LineType.Dashed;
              dashedValue = [2, 2];
            }
            
            return {
              color: style?.color || '#FF6B6B',
              size: style?.thickness || 1,
              style: lineStyle,
              dashedValue: dashedValue
            };
          })
        }
      }, true, { id: $ctx.editPaneId });
      
      console.log('✅ EMA indicator updated successfully');
       
     } catch (error) {
       console.error('❌ Error updating EMA indicator:', error);
     }
  }

  // Initialize default BBI group
  function initializeBbiGroups() {
    if (!isBbi) return;
    
    // Find all existing BBI indicators in the save data
    const allBbiKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'BBI'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_BBI first, then pane_BBI_2_BBI, etc.
      if (a === `${$ctx.editPaneId}_BBI`) return -1;
      if (b === `${$ctx.editPaneId}_BBI`) return 1;
      return a.localeCompare(b);
    });
    
    console.log('🔍 Found existing BBI keys:', allBbiKeys);
    
    if (allBbiKeys.length > 0) {
      // Load all existing BBI groups
      bbiGroups = [];
      
      allBbiKeys.forEach((key, index) => {
        const savedInd = $save.saveInds[key];
        if (savedInd) {
          // Check if this saved indicator has a bbiGroup property
          if ((savedInd as any).bbiGroup) {
            // Load from bbiGroup property
            bbiGroups.push({...(savedInd as any).bbiGroup});
          } else if (savedInd.params && savedInd.params.length === 4) {
            // Create group from params if bbiGroup doesn't exist
            bbiGroups.push({
              id: generateUUID(),
              name: `BBI${index + 1}`,
              period1: savedInd.params[0] || 3,
              period2: savedInd.params[1] || 6,
              period3: savedInd.params[2] || 12,
              period4: savedInd.params[3] || 24,
              color: '#8B5CF6',
              thickness: 1,
              lineStyle: 'solid'
            });
          }
        }
      });
      
      console.log('✅ Loaded', bbiGroups.length, 'existing BBI groups');
    } else if (bbiGroups.length === 0) {
      // Create default BBI group if none exist
      bbiGroups = [{
        id: generateUUID(),
        name: 'BBI',
        period1: 3,
        period2: 6,
        period3: 12,
        period4: 24,
        color: '#8B5CF6',
        thickness: 1,
        lineStyle: 'solid'
      }];
      
      console.log('🆕 Created default BBI group');
    }
  }

  function addBbiGroup() {
    if (!isBbi) return;
    
    const groupNumber = bbiGroups.length + 1;
    bbiGroups.push({
      id: generateUUID(),
      name: `BBI${groupNumber}`,
      period1: 3,
      period2: 6,
      period3: 12,
      period4: 24,
      color: '#8B5CF6',
      thickness: 1,
      lineStyle: 'solid'
    });
  }

  function removeBbiGroup(groupId: string) {
    if (!isBbi || bbiGroups.length <= 1) return;
    
    // Find the index of the group being removed
    const groupIndex = bbiGroups.findIndex(group => group.id === groupId);
    if (groupIndex === -1) return;
    
    console.log('🗑️ Removing BBI group at index:', groupIndex, 'ID:', groupId);
    
    // Remove the corresponding indicator from the chart FIRST
    if (groupIndex === 0) {
      // For the first group, remove from the current edit pane
      if ($chart && $ctx.editPaneId) {
        try {
          console.log('🗑️ Removing BBI from edit pane:', $ctx.editPaneId);
          $chart?.removeIndicator({ paneId: $ctx.editPaneId, name: 'BBI' });
          console.log('✅ Successfully removed BBI from edit pane');
        } catch (error) {
          console.log('❌ Error removing BBI indicator from edit pane:', error);
        }
      }
      
      // Clean up saved state for the first group
      save.update(s => {
        const saveKey = `${$ctx.editPaneId}_BBI`;
        console.log('🧹 Cleaning saved state key:', saveKey);
        delete s.saveInds[saveKey];
        return s;
      });
    } else {
      // For additional groups, find and remove the corresponding indicator
      const saveKey = `pane_BBI_${groupIndex + 1}_BBI`;
      const savedData = $save.saveInds[saveKey];
      
      console.log('🗑️ Looking for saved data with key:', saveKey, 'Found:', !!savedData);
      
      if (savedData && savedData.pane_id && $chart) {
        try {
          console.log('🗑️ Removing BBI from pane:', savedData.pane_id);
          $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'BBI' });
          console.log('✅ Successfully removed BBI from pane:', savedData.pane_id);
        } catch (error) {
          console.log('❌ Error removing BBI indicator from pane:', savedData.pane_id, error);
        }
      }
      
      // Clean up saved state for this group
      save.update(s => {
        console.log('🧹 Cleaning saved state for key:', saveKey);
        delete s.saveInds[saveKey];
        
        // Reindex remaining groups to maintain consistency
        const remainingGroups = Object.keys(s.saveInds).filter(key => 
          key.startsWith('pane_BBI_') && s.saveInds[key].name === 'BBI'
        ).sort();
        
        console.log('🔄 Reindexing remaining BBI groups:', remainingGroups);
        
        // Remove all pane_BBI_* entries and recreate them with correct indices
        remainingGroups.forEach(key => {
          delete s.saveInds[key];
        });
        
        return s;
      });
    }
    
    // Remove the group from the array AFTER removing from chart
    bbiGroups = bbiGroups.filter(group => group.id !== groupId);
    console.log('✅ BBI group removed from array. Remaining groups:', bbiGroups.length);
  }

  // Initialize TRIX groups
  function initializeTrixGroups() {
    if (!isTrix) return;
    
    // Find all existing TRIX indicators in the save data
    const allTrixKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'TRIX'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_TRIX first, then pane_TRIX_2_TRIX, etc.
      if (a === `${$ctx.editPaneId}_TRIX`) return -1;
      if (b === `${$ctx.editPaneId}_TRIX`) return 1;
      return a.localeCompare(b);
    });
    
    console.log('🔍 Found existing TRIX keys:', allTrixKeys);
    
    if (allTrixKeys.length > 0) {
      // Load all existing TRIX groups
      trixGroups = [];
      
      allTrixKeys.forEach((key, index) => {
        const savedInd = $save.saveInds[key];
        if (savedInd) {
          // Check if this saved indicator has a trixGroup property
          if ((savedInd as any).trixGroup) {
            // Load from trixGroup property and ensure paneId is set
            const group = {...(savedInd as any).trixGroup};
            if (!group.paneId) {
              group.paneId = savedInd.pane_id || $ctx.editPaneId;
            }
            trixGroups.push(group);
          } else if (savedInd.params && savedInd.params.length >= 2) {
            // Create group from params if trixGroup doesn't exist
            trixGroups.push({
              id: generateUUID(),
              name: `TRIX${index + 1}`,
              trixPeriod: savedInd.params[0] || 15,
              signalPeriod: savedInd.params[1] || 9,
              paneId: savedInd.pane_id || $ctx.editPaneId, // Set paneId properly
              styles: {
                trix: {color: '#2563eb', thickness: 2, lineStyle: 'solid'},
                signal: {color: '#dc2626', thickness: 1, lineStyle: 'solid'}
              }
            });
          }
        }
      });
      
      console.log('✅ Loaded', trixGroups.length, 'existing TRIX groups');
    } else if (trixGroups.length === 0) {
      // Create default TRIX group if none exist
      trixGroups = [{
        id: generateUUID(),
        name: 'TRIX',
        trixPeriod: 15,
        signalPeriod: 9,
        paneId: $ctx.editPaneId, // Set paneId for default group
        styles: {
          trix: {color: '#2563eb', thickness: 2, lineStyle: 'solid'},
          signal: {color: '#dc2626', thickness: 1, lineStyle: 'solid'}
        }
      }];
      
      console.log('🆕 Created default TRIX group');
    }
  }

  function addTrixGroup() {
    if (!isTrix) return;
    
    // Generate unique pane ID for the new TRIX instance
    const newPaneId = `pane_TRIX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newGroup = {
      id: generateUUID(),
      name: `TRIX${trixGroups.length + 1}`,
      trixPeriod: 15,
      signalPeriod: 9,
      paneId: newPaneId, // Store the pane ID with the group
      styles: {
        trix: {color: '#2563eb', thickness: 2, lineStyle: 'solid'},
        signal: {color: '#dc2626', thickness: 1, lineStyle: 'solid'}
      }
    };
    
    trixGroups.push(newGroup);
    
    // Add to chart immediately with proper styling in a new sub-pane
    if ($chart) {
      // Convert line styles to klinecharts format
      let trixLineStyle = kc.LineType.Solid;
      let trixDashedValue = [2, 2];
      let signalLineStyle = kc.LineType.Solid;
      let signalDashedValue = [2, 2];
      
      if (newGroup.styles.trix.lineStyle === 'dashed') {
        trixLineStyle = kc.LineType.Dashed;
        trixDashedValue = [4, 4];
      } else if (newGroup.styles.trix.lineStyle === 'dotted') {
        trixLineStyle = kc.LineType.Dashed;
        trixDashedValue = [2, 2];
      }
      
      if (newGroup.styles.signal.lineStyle === 'dashed') {
        signalLineStyle = kc.LineType.Dashed;
        signalDashedValue = [4, 4];
      } else if (newGroup.styles.signal.lineStyle === 'dotted') {
        signalLineStyle = kc.LineType.Dashed;
        signalDashedValue = [2, 2];
      }
      
      const indicatorId = $chart.createIndicator({
        name: 'TRIX',
        calcParams: [newGroup.trixPeriod, newGroup.signalPeriod],
        styles: {
          lines: [
            {
              color: newGroup.styles.trix.color,
              size: newGroup.styles.trix.thickness,
              style: trixLineStyle,
              dashedValue: trixDashedValue
            },
            {
              color: newGroup.styles.signal.color,
              size: newGroup.styles.signal.thickness,
              style: signalLineStyle,
              dashedValue: signalDashedValue
            }
          ]
        }
      }, false, { id: newPaneId }); // false = create in sub-pane, not main pane
      
      // Save the indicator to the save system
      if (indicatorId) {
        const saveKey = `${newPaneId}_TRIX`;
        save.update(s => {
          s.saveInds[saveKey] = {
            name: 'TRIX',
            pane_id: newPaneId,
            params: [newGroup.trixPeriod, newGroup.signalPeriod]
          };
          return s;
        });
      }
    }
    
    console.log('➕ Added new TRIX group in new pane:', newGroup.id, newPaneId);
  }

  function removeTrixGroup(groupIndex: number) {
    if (!isTrix || trixGroups.length <= 1 || groupIndex < 0 || groupIndex >= trixGroups.length) return;
    
    console.log('🗑️ Removing TRIX group at index:', groupIndex);
    
    // Get the group to remove
    const groupToRemove = trixGroups[groupIndex];
    // Use editPaneId as fallback if paneId is missing (for first group)
    const paneIdToRemove = groupToRemove.paneId || $ctx.editPaneId;
    
    // Remove from groups array
    const oldLength = trixGroups.length;
    trixGroups.splice(groupIndex, 1);
    console.log(`📝 Removed group: ${oldLength} -> ${trixGroups.length}`);
    
    // Remove the specific TRIX indicator from its pane
    if ($chart && paneIdToRemove) {
      try {
        console.log('🗑️ Removing TRIX from pane:', paneIdToRemove);
        
        // Use delInd function for proper removal (includes cleanup and error handling)
        delInd(paneIdToRemove, 'TRIX');
        
      } catch (error) {
        console.error('❌ Error removing TRIX indicator:', error);
      }
    }
    
    console.log('✅ TRIX group removed. Remaining groups:', trixGroups.length);
  }

  // Initialize default BIAS groups
  function initializeBiasGroups() {
    if (!isBias) return;
    
    // Find all existing BIAS indicators in the save data
    const allBiasKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'BIAS'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_BIAS first, then pane_BIAS_2_BIAS, etc.
      if (a === `${$ctx.editPaneId}_BIAS`) return -1;
      if (b === `${$ctx.editPaneId}_BIAS`) return 1;
      return a.localeCompare(b);
    });
    
    console.log('🔍 Found existing BIAS keys:', allBiasKeys);
    
    if (allBiasKeys.length > 0) {
      // Load all existing BIAS groups
      biasGroups = [];
      
      allBiasKeys.forEach((key, index) => {
        const savedInd = $save.saveInds[key];
        if (savedInd) {
          // Check if this saved indicator has a biasGroup property
          if ((savedInd as any).biasGroup) {
            // Load from biasGroup property
            biasGroups.push({...(savedInd as any).biasGroup});
          } else if (savedInd.params && savedInd.params.length >= 1) {
            // Create group from params if biasGroup doesn't exist
            biasGroups.push({
              id: generateUUID(),
              name: `BIAS${index + 1}`,
              period: savedInd.params[0] || 6,
              color: '#2196F3',
              thickness: 1,
              lineStyle: 'solid'
            });
          }
        }
      });
      
      console.log('✅ Loaded', biasGroups.length, 'existing BIAS groups');
    } else if (biasGroups.length === 0) {
      // Create default BIAS group if none exist
      biasGroups = [{
        id: generateUUID(),
        name: 'BIAS',
        period: 6,
        color: '#2196F3',
        thickness: 1,
        lineStyle: 'solid'
      }];
      
      console.log('🆕 Created default BIAS group');
    }
  }

  function addBiasGroup() {
    if (!isBias) return;
    
    const groupNumber = biasGroups.length + 1;
    biasGroups.push({
      id: generateUUID(),
      name: `BIAS${groupNumber}`,
      period: 6,
      color: '#2196F3',
      thickness: 1,
      lineStyle: 'solid'
    });
  }

  function removeBiasGroup(groupId: string) {
    if (!isBias || biasGroups.length <= 1) return;
    
    // Find the group index
    const groupIndex = biasGroups.findIndex(group => group.id === groupId);
    if (groupIndex === -1) return;
    
    console.log('🗑️ Removing BIAS group at index:', groupIndex, 'ID:', groupId);
    
    try {
      // Remove from chart first
      if (groupIndex === 0) {
        // For the first group, remove from the edit pane
        console.log('🗑️ Removing BIAS from edit pane:', $ctx.editPaneId);
        $chart?.removeIndicator({ paneId: $ctx.editPaneId, name: 'BIAS' });
        console.log('✅ Successfully removed BIAS from edit pane');
      }
      
      // Remove from saved data
      save.update((s: ChartSave) => {
        const saveKey = groupIndex === 0 ? 
          `${$ctx.editPaneId}_BIAS` : 
          `pane_BIAS_${groupIndex + 1}_BIAS`;
        
        if (s.saveInds[saveKey]) {
          const savedData = s.saveInds[saveKey];
          
          // For non-first groups, also remove from their specific panes
          if (groupIndex > 0) {
            const innerSaveKey = `pane_BIAS_${groupIndex + 1}_BIAS`;
            if (s.saveInds[innerSaveKey]) {
              const innerSavedData = s.saveInds[innerSaveKey];
              console.log('🗑️ Removing BIAS from pane:', innerSavedData.pane_id);
              $chart?.removeIndicator({ paneId: innerSavedData.pane_id, name: 'BIAS' });
              console.log('✅ Successfully removed BIAS from pane:', innerSavedData.pane_id);
            }
          }
          
          console.log('🧹 Cleaning saved state for key:', saveKey);
          delete s.saveInds[saveKey];
        }
        
        // Reindex remaining groups to maintain consistency
        const remainingGroups = Object.keys(s.saveInds).filter(key => 
          key.startsWith('pane_BIAS_') && s.saveInds[key].name === 'BIAS'
        ).sort();
        
        console.log('🔄 Reindexing remaining BIAS groups:', remainingGroups);
        
        // Remove all pane_BIAS_* entries and recreate them with correct indices
        remainingGroups.forEach(key => {
          delete s.saveInds[key];
        });
        
        return s;
      });
    } catch (error) {
      console.log('❌ Error removing BIAS indicator:', error);
    }
    
    // Remove the group from the array AFTER removing from chart
    biasGroups = biasGroups.filter(group => group.id !== groupId);
    console.log('✅ BIAS group removed from array. Remaining groups:', biasGroups.length);
  }

  // Initialize default CCI groups
  function initializeCciGroups() {
    if (!isCci) return;
    
    // Find all existing CCI indicators in the save data
    const allCciKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'CCI'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_CCI first, then pane_CCI_2_CCI, etc.
      if (a === `${$ctx.editPaneId}_CCI`) return -1;
      if (b === `${$ctx.editPaneId}_CCI`) return 1;
      return a.localeCompare(b);
    });
    
    console.log('🔍 Found existing CCI keys:', allCciKeys);
    
    if (allCciKeys.length > 0) {
      // Load all existing CCI groups
      cciGroups = [];
      let groupCounter = 1; // Track actual group numbers for proper naming
      
      allCciKeys.forEach((key, index) => {
        const savedInd = $save.saveInds[key];
        if (savedInd) {
          // Check if this saved indicator has a cciGroup property
          if ((savedInd as any).cciGroup) {
            // Load from cciGroup property and ensure proper naming
            const group = {...(savedInd as any).cciGroup};
            // Update name to reflect current position
            group.name = groupCounter === 1 ? 'CCI' : `CCI${groupCounter}`;
            cciGroups.push(group);
            groupCounter++;
          } else if (savedInd.params && savedInd.params.length >= 1) {
            // Create group from params if cciGroup doesn't exist
            cciGroups.push({
              id: generateUUID(),
              name: groupCounter === 1 ? 'CCI' : `CCI${groupCounter}`,
              period: savedInd.params[0] || 14,
              color: '#FF9800',
              thickness: 1,
              lineStyle: 'solid'
            });
            groupCounter++;
          }
        }
      });
      
      console.log('✅ Loaded', cciGroups.length, 'existing CCI groups with proper naming');
    } else if (cciGroups.length === 0) {
      // Create default CCI group if none exist
      cciGroups = [{
        id: generateUUID(),
        name: 'CCI',
        period: 14,
        color: '#FF9800',
        thickness: 1,
        lineStyle: 'solid'
      }];
      
      console.log('🆕 Created default CCI group');
    }
  }

  function addCciGroup() {
    if (!isCci) return;
    
    const groupNumber = cciGroups.length + 1;
    const groupName = groupNumber === 1 ? 'CCI' : `CCI${groupNumber}`;
    
    cciGroups.push({
      id: generateUUID(),
      name: groupName,
      period: 14,
      color: '#FF9800',
      thickness: 1,
      lineStyle: 'solid'
    });
    
    console.log('➕ Added new CCI group:', groupName);
  }

  function removeCciGroup(groupId: string) {
    if (!isCci || cciGroups.length <= 1) return;
    
    // Find the group index
    const groupIndex = cciGroups.findIndex(group => group.id === groupId);
    if (groupIndex === -1) return;
    
    console.log('🗑️ Removing CCI group at index:', groupIndex, 'ID:', groupId);
    
    try {
      // Remove from chart first
      if (groupIndex === 0) {
        // For the first group, remove from the edit pane
        console.log('🗑️ Removing CCI from edit pane:', $ctx.editPaneId);
        $chart?.removeIndicator({ paneId: $ctx.editPaneId, name: 'CCI' });
        console.log('✅ Successfully removed CCI from edit pane');
      }
      
      // Remove from saved data
      save.update((s: ChartSave) => {
        const saveKey = groupIndex === 0 ? 
          `${$ctx.editPaneId}_CCI` : 
          `pane_CCI_${groupIndex + 1}_CCI`;
        
        if (s.saveInds[saveKey]) {
          const savedData = s.saveInds[saveKey];
          
          // For non-first groups, also remove from their specific panes
          if (groupIndex > 0) {
            const innerSaveKey = `pane_CCI_${groupIndex + 1}_CCI`;
            if (s.saveInds[innerSaveKey]) {
              const innerSavedData = s.saveInds[innerSaveKey];
              console.log('🗑️ Removing CCI from pane:', innerSavedData.pane_id);
              $chart?.removeIndicator({ paneId: innerSavedData.pane_id, name: 'CCI' });
              console.log('✅ Successfully removed CCI from pane:', innerSavedData.pane_id);
            }
          }
          
          console.log('🧹 Cleaning saved state for key:', saveKey);
          delete s.saveInds[saveKey];
        }
        
        // Reindex remaining groups to maintain consistency
        const remainingGroups = Object.keys(s.saveInds).filter(key => 
          key.startsWith('pane_CCI_') && s.saveInds[key].name === 'CCI'
        ).sort();
        
        console.log('🔄 Reindexing remaining CCI groups:', remainingGroups);
        
        // Remove all pane_CCI_* entries and recreate them with correct indices
        remainingGroups.forEach(key => {
          delete s.saveInds[key];
        });
        
        return s;
      });
    } catch (error) {
      console.log('❌ Error removing CCI indicator:', error);
    }
    
    // Remove the group from the array AFTER removing from chart
    cciGroups = cciGroups.filter(group => group.id !== groupId);
    console.log('✅ CCI group removed from array. Remaining groups:', cciGroups.length);
  }

  // Initialize default SAR group
  function initializeSarGroups() {
    if (!isSar) return;
    
    // Check for saved SAR groups
    const savedKey = `${$ctx.editPaneId}_SAR`;
    const savedInd = $save.saveInds[savedKey];
    
    if (savedInd && (savedInd as any).sarGroups && (savedInd as any).sarGroups.length > 0) {
      // Load saved SAR groups
      sarGroups = [...(savedInd as any).sarGroups];
    } else if (sarGroups.length === 0) {
      // Create default SAR group
      sarGroups = [{
        id: generateUUID(),
        start: 0.02,
        increment: 0.02,
        maxValue: 0.2,
        color: '#FF6B6B',
        dotSize: 3
      }];
    }
  }



  function removeSarGroup(groupId: string) {
    if (!isSar || sarGroups.length <= 1) return;
    sarGroups = sarGroups.filter(group => group.id !== groupId);
  }

  // Initialize default DMI group
  function initializeDmiGroups() {
    if (!isDmi) return;

    // Find all existing DMI indicators in the save data
    const allDmiKeys = Object.keys($save.saveInds).filter(key =>
      $save.saveInds[key].name === 'DMI'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_DMI first, then pane_DMI_2_DMI, etc.
      if (a === `${$ctx.editPaneId}_DMI`) return -1;
      if (b === `${$ctx.editPaneId}_DMI`) return 1;
      return a.localeCompare(b);
    });

    console.log('🔍 Found existing DMI keys:', allDmiKeys);

    if (allDmiKeys.length > 0) {
      // Load all existing DMI groups
      dmiGroups = [];

      allDmiKeys.forEach((key, index) => {
        const savedInd = $save.saveInds[key];

        // Check if this saved indicator has a dmiGroup property
        if ((savedInd as any).dmiGroup) {
          // Load from dmiGroup property
          dmiGroups.push({...(savedInd as any).dmiGroup});
        } else {
          // Create group from params if dmiGroup doesn't exist
          dmiGroups.push({
            id: generateUUID(),
            name: `DMI${index + 1}`,
            diPeriod: savedInd.params?.[0] || 14,
            adxPeriod: savedInd.params?.[1] || 6,
            styles: {
              diPlus: {color: '#22c55e', thickness: 1, lineStyle: 'solid'},
              diMinus: {color: '#ef4444', thickness: 1, lineStyle: 'solid'},
              adx: {color: '#3b82f6', thickness: 1, lineStyle: 'solid'}
            }
          });
        }
      });

      console.log('✅ Loaded', dmiGroups.length, 'existing DMI groups');
    } else if (dmiGroups.length === 0) {
      // Create default DMI group if none exist
      dmiGroups = [{
        id: generateUUID(),
        name: 'DMI',
        diPeriod: 14,
        adxPeriod: 6,
        styles: {
          diPlus: {color: '#22c55e', thickness: 1, lineStyle: 'solid'},
          diMinus: {color: '#ef4444', thickness: 1, lineStyle: 'solid'},
          adx: {color: '#3b82f6', thickness: 1, lineStyle: 'solid'}
        }
      }];

      console.log('🆕 Created default DMI group');
    }
  }

  function initializeCrGroups() {
    if (!isCr) return;

    // Find all existing CR indicators in the save data
    const allCrKeys = Object.keys($save.saveInds).filter(key =>
      $save.saveInds[key].name === 'CR'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_CR first, then pane_CR_2_CR, etc.
      if (a === `${$ctx.editPaneId}_CR`) return -1;
      if (b === `${$ctx.editPaneId}_CR`) return 1;
      return a.localeCompare(b);
    });

    console.log('🔍 Found existing CR keys:', allCrKeys);

    if (allCrKeys.length > 0) {
      // Load all existing CR groups
      crGroups = [];

      allCrKeys.forEach((key, index) => {
        const savedInd = $save.saveInds[key];

        // Check if this saved indicator has a crGroup property
        if ((savedInd as any).crGroup) {
          // Load from crGroup property
          crGroups.push({...(savedInd as any).crGroup});
        } else {
          // Create group from params if crGroup doesn't exist
          crGroups.push({
            id: generateUUID(),
            name: `CR${index + 1}`,
            crPeriod: savedInd.params?.[0] || 26,
            crMa1Period: savedInd.params?.[1] || 10,
            crMa2Period: savedInd.params?.[2] || 20,
            crMa3Period: savedInd.params?.[3] || 40,
            crMa4Period: savedInd.params?.[4] || 60,
            styles: {
              cr: {color: '#FF6B35', thickness: 2, lineStyle: 'solid'},
              ma1: {color: '#2196F3', thickness: 1, lineStyle: 'solid'},
              ma2: {color: '#4CAF50', thickness: 1, lineStyle: 'solid'},
              ma3: {color: '#FF9800', thickness: 1, lineStyle: 'solid'},
              ma4: {color: '#9C27B0', thickness: 1, lineStyle: 'solid'}
            }
          });
        }
      });

      console.log('✅ Loaded', crGroups.length, 'existing CR groups');
    } else if (crGroups.length === 0) {
      // Create default CR group if none exist
      crGroups = [{
        id: generateUUID(),
        name: 'CR',
        crPeriod: 26,
        crMa1Period: 10,
        crMa2Period: 20,
        crMa3Period: 40,
        crMa4Period: 60,
        styles: {
          cr: {color: '#FF6B35', thickness: 2, lineStyle: 'solid'},
          ma1: {color: '#2196F3', thickness: 1, lineStyle: 'solid'},
          ma2: {color: '#4CAF50', thickness: 1, lineStyle: 'solid'},
          ma3: {color: '#FF9800', thickness: 1, lineStyle: 'solid'},
          ma4: {color: '#9C27B0', thickness: 1, lineStyle: 'solid'}
        }
      }];

      console.log('🆕 Created default CR group');
    }
  }

  function addDmiGroup() {
    if (!isDmi) return;
    
    const groupNumber = dmiGroups.length + 1;
    dmiGroups.push({
      id: generateUUID(),
      name: `DMI${groupNumber}`,
      diPeriod: 14,
      adxPeriod: 6,
      styles: {
        diPlus: {color: '#22c55e', thickness: 1, lineStyle: 'solid'},
        diMinus: {color: '#ef4444', thickness: 1, lineStyle: 'solid'},
        adx: {color: '#3b82f6', thickness: 1, lineStyle: 'solid'}
      }
    });
  }

  function removeDmiGroup(groupId: string) {
    if (!isDmi || dmiGroups.length <= 1) return;

    // Find the group index to determine which indicator to remove
    const groupIndex = dmiGroups.findIndex(group => group.id === groupId);
    if (groupIndex === -1) return;

    console.log('🗑️ Removing DMI group at index:', groupIndex, 'ID:', groupId);

    // Remove the indicator from the chart
    if (groupIndex === 0) {
      // First group - remove from current edit pane
      try {
        console.log('🗑️ Removing DMI from edit pane:', $ctx.editPaneId);
        $chart?.removeIndicator({ paneId: $ctx.editPaneId, name: 'DMI' });
        console.log('✅ Successfully removed DMI from edit pane');
      } catch (error) {
        console.log('❌ Error removing DMI indicator from edit pane:', error);
      }

      // Remove from save data
      save.update(s => {
        const saveKey = `${$ctx.editPaneId}_DMI`;
        delete s.saveInds[saveKey];
        return s;
      });
    } else {
      // Other groups - remove from their specific panes
      const saveKey = `pane_DMI_${groupIndex + 1}_DMI`;
      const savedData = $save.saveInds[saveKey];
      
      if (savedData) {
        try {
          console.log('🗑️ Removing DMI from pane:', savedData.pane_id);
          $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'DMI' });
          console.log('✅ Successfully removed DMI from pane:', savedData.pane_id);
        } catch (error) {
          console.log('❌ Error removing DMI indicator from pane:', savedData.pane_id, error);
        }
      }

      // Remove from save data and reindex remaining groups
      save.update(s => {
        // Get all remaining DMI groups after this one
        const remainingGroups = Object.keys(s.saveInds).filter(key => 
          key.startsWith('pane_DMI_') && s.saveInds[key].name === 'DMI'
        ).sort();

        console.log('🔄 Reindexing remaining DMI groups:', remainingGroups);

        // Remove all pane_DMI_* entries and recreate them with correct indices
        remainingGroups.forEach(key => delete s.saveInds[key]);

        // Recreate with correct indices (excluding the removed group)
        const filteredGroups = dmiGroups.filter((_, idx) => idx !== groupIndex);
        filteredGroups.slice(1).forEach((group, idx) => {
          const newKey = `pane_DMI_${idx + 2}_DMI`;
          const newPaneId = `pane_DMI_${idx + 2}`;
          s.saveInds[newKey] = {
            name: 'DMI',
            dmiGroup: group,
            pane_id: newPaneId,
            params: [group.diPeriod, group.adxPeriod]
          };
        });

        return s;
      });
    }

    // Remove from groups array
    dmiGroups = dmiGroups.filter(group => group.id !== groupId);
    console.log('✅ DMI group removed from array. Remaining groups:', dmiGroups.length);
  }

  function addCrGroup() {
    if (!isCr) return;
    
    const groupNumber = crGroups.length + 1;
    crGroups.push({
      id: generateUUID(),
      name: `CR${groupNumber}`,
      crPeriod: 26,
      crMa1Period: 10,
      crMa2Period: 20,
      crMa3Period: 40,
      crMa4Period: 60,
      styles: {
        cr: {color: '#FF6B35', thickness: 2, lineStyle: 'solid'},
        ma1: {color: '#2196F3', thickness: 1, lineStyle: 'solid'},
        ma2: {color: '#4CAF50', thickness: 1, lineStyle: 'solid'},
        ma3: {color: '#FF9800', thickness: 1, lineStyle: 'solid'},
        ma4: {color: '#9C27B0', thickness: 1, lineStyle: 'solid'}
      }
    });
  }

  function removeCrGroup(groupId: string) {
    if (!isCr || crGroups.length <= 1) return;

    // Find the group index to determine which indicator to remove
    const groupIndex = crGroups.findIndex(group => group.id === groupId);
    if (groupIndex === -1) return;

    console.log('🗑️ Removing CR group at index:', groupIndex, 'ID:', groupId);

    // Remove the indicator from the chart
    if (groupIndex === 0) {
      // First group - remove from current edit pane
      try {
        console.log('🗑️ Removing CR from edit pane:', $ctx.editPaneId);
        $chart?.removeIndicator({ paneId: $ctx.editPaneId, name: 'CR' });
        console.log('✅ Successfully removed CR from edit pane');
      } catch (error) {
        console.log('❌ Error removing CR indicator from edit pane:', error);
      }

      // Remove from save data
      save.update(s => {
        const saveKey = `${$ctx.editPaneId}_CR`;
        delete s.saveInds[saveKey];
        return s;
      });
    } else {
      // Other groups - remove from their specific panes
      const saveKey = `pane_CR_${groupIndex + 1}_CR`;
      const savedData = $save.saveInds[saveKey];
      
      if (savedData) {
        try {
          console.log('🗑️ Removing CR from pane:', savedData.pane_id);
          $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'CR' });
          console.log('✅ Successfully removed CR from pane:', savedData.pane_id);
        } catch (error) {
          console.log('❌ Error removing CR indicator from pane:', savedData.pane_id, error);
        }
      }

      // Remove from save data and reindex remaining groups
      save.update(s => {
        // Get all remaining CR groups after this one
        const remainingGroups = Object.keys(s.saveInds).filter(key => 
          key.startsWith('pane_CR_') && s.saveInds[key].name === 'CR'
        ).sort();

        console.log('🔄 Reindexing remaining CR groups:', remainingGroups);

        // Remove all pane_CR_* entries and recreate them with correct indices
        remainingGroups.forEach(key => delete s.saveInds[key]);

        // Recreate with correct indices (excluding the removed group)
        const filteredGroups = crGroups.filter((_, idx) => idx !== groupIndex);
        filteredGroups.slice(1).forEach((group, idx) => {
          const newKey = `pane_CR_${idx + 2}_CR`;
          const newPaneId = `pane_CR_${idx + 2}`;
          s.saveInds[newKey] = {
            name: 'CR',
            crGroup: group,
            pane_id: newPaneId,
            params: [group.crPeriod, group.crMa1Period, group.crMa2Period, group.crMa3Period, group.crMa4Period]
          };
        });

        return s;
      });
    }

    // Remove from groups array
    crGroups = crGroups.filter(group => group.id !== groupId);
    console.log('✅ CR group removed from array. Remaining groups:', crGroups.length);
  }

  // Initialize default ROC group
  function initializeRocGroups() {
    if (!isRoc) return;
    
    // Check for saved ROC groups
    const savedKey = `${$ctx.editPaneId}_ROC`;
    const savedInd = $save.saveInds[savedKey];
    
    if (savedInd && (savedInd as any).rocGroups && (savedInd as any).rocGroups.length > 0) {
      // Load saved ROC groups
      rocGroups = [...(savedInd as any).rocGroups];
      // Set paneId for loaded groups (first group uses current edit pane)
      rocGroups.forEach((group, index) => {
        if (!group.paneId) {
          group.paneId = index === 0 ? $ctx.editPaneId : undefined; // Will be set when indicator is found
        }
      });
    } else if (savedInd && (savedInd as any).rocGroup) {
      // Load single ROC group for editing
      rocGroups = [(savedInd as any).rocGroup];
      // Set paneId for the single group
      if (rocGroups[0] && !rocGroups[0].paneId) {
        rocGroups[0].paneId = $ctx.editPaneId;
      }
    } else if (rocGroups.length === 0) {
      // Create default ROC group with period 14 as requested
      rocGroups = [{
        id: generateUUID(),
        period: 14,
        period2: 21,
        paneId: $ctx.editPaneId, // Set paneId for default group
        styles: {
          roc: {color: '#2563eb', thickness: 1, lineStyle: 'solid'},
          roc2: {color: '#dc2626', thickness: 1, lineStyle: 'solid', visible: false}
        }
      }];
    }
  }

  // Function to detect and set paneIds for existing ROC indicators
  function detectRocPaneIds() {
    if (!$chart || !isRoc) return;
    
    try {
      const indicators = $chart?.getIndicators();
      const rocIndicators = indicators.filter(ind => ind.name === 'ROC');
      
      console.log('🔍 Detecting paneIds for ROC indicators:', rocIndicators.length);
      
      // Match ROC indicators with groups based on their order
      rocIndicators.forEach((indicator, index) => {
        if (index < rocGroups.length && !rocGroups[index].paneId) {
          rocGroups[index].paneId = indicator.paneId;
          console.log(`📍 Set paneId ${indicator.paneId} for ROC group ${index}`);
        }
      });
    } catch (error) {
      console.error('❌ Error detecting ROC paneIds:', error);
    }
  }

  function addRocGroup() {
    if (!isRoc || !$chart) return;
    
    // Add new ROC group with default period 14 and unique colors
    const colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c'];
    const colorIndex = rocGroups.length % colors.length;
    
    const newGroup = {
      id: generateUUID(),
      period: 14,
      period2: 21,
      paneId: undefined as string | undefined,
      styles: {
        roc: {color: colors[colorIndex], thickness: 1, lineStyle: 'solid'},
        roc2: {color: colors[(colorIndex + 1) % colors.length], thickness: 1, lineStyle: 'solid', visible: false}
      }
    };
    
    rocGroups.push(newGroup);
    
    // Create indicator on chart immediately
    const calcParams = [newGroup.period];
    
    // Determine line style
    let lineStyle = kc.LineType.Solid;
    let dashedValue = [2, 2];
    
    if (newGroup.styles.roc.lineStyle === 'dashed') {
      lineStyle = kc.LineType.Dashed;
      dashedValue = [4, 4];
    } else if (newGroup.styles.roc.lineStyle === 'dotted') {
      lineStyle = kc.LineType.Dashed;
      dashedValue = [2, 2];
    }
    
    // Create indicator styles
    const indicatorStyles = {
      lines: [{
        color: newGroup.styles.roc.color,
        size: newGroup.styles.roc.thickness,
        style: lineStyle,
        dashedValue: dashedValue,
        smooth: false
      }]
    };

    // Create indicator configuration
    const indicatorConfig = {
      name: 'ROC',
      calcParams: calcParams,
      styles: indicatorStyles,
      figures: [
        { key: 'roc', title: 'ROC: ', type: 'line' }
      ]
    };

    // If this is the first ROC group, override in current pane
    // Otherwise create in new sub-panel
    let paneId;
    if (rocGroups.length === 1) {
      $chart?.overrideIndicator({
        ...indicatorConfig,
        paneId: $ctx.editPaneId
      });
      paneId = $ctx.editPaneId;
    } else {
      // Create new sub-panel for additional ROC instances
      paneId = $chart?.createIndicator(indicatorConfig, false, { axis: { gap: { bottom: 2 } } });
    }
    
    // Store paneId in the group
    newGroup.paneId = paneId ?? undefined;
    
    // Update saved state
    save.update(s => {
      const saveKey = `${$ctx.editPaneId}_ROC`;
      if (!s.saveInds[saveKey]) {
        s.saveInds[saveKey] = {
          name: 'ROC',
          pane_id: $ctx.editPaneId,
          params: [newGroup.period],
          rocGroups: []
        };
      }
      
      // Ensure rocGroups array exists
      if (!s.saveInds[saveKey].rocGroups) {
        s.saveInds[saveKey].rocGroups = [];
      }
      
      // Add the new group
      s.saveInds[saveKey].rocGroups = [...rocGroups];
      
      return s;
    });
  }

  function removeRocGroup(groupId: string) {
    if (!isRoc || rocGroups.length <= 1) return;
    
    // Find the index of the group to remove
    const groupIndex = rocGroups.findIndex(group => group.id === groupId);
    if (groupIndex === -1) return;
    
    console.log('🗑️ Removing ROC group at index:', groupIndex, 'with ID:', groupId);
    
    // Remove from groups array
    const oldLength = rocGroups.length;
    rocGroups.splice(groupIndex, 1);
    console.log(`📝 Removed ROC group: ${oldLength} -> ${rocGroups.length}`);
    
    // Update names for remaining groups
    rocGroups.forEach((group, index) => {
      group.name = `ROC #${index + 1}`;
    });
    
    // Remove all ROC indicators from chart and re-add remaining ones (like PVT)
    if ($chart) {
      try {
        const indicators = $chart?.getIndicators();
        const rocIndicators = indicators.filter(ind => ind.name === 'ROC');
        console.log('📈 ROC indicators found:', rocIndicators.length);
        
        // Remove all ROC indicators
        for (const indicator of rocIndicators) {
          console.log('🗑️ Removing ROC from pane:', indicator.paneId);
          $chart?.removeIndicator({ paneId: indicator.paneId, name: 'ROC' });
        }
        
        // Re-add remaining ROC groups
        rocGroups.forEach((group, index) => {
          // Convert line style to klinecharts format
          let lineStyle = kc.LineType.Solid;
          let dashedValue = [2, 2];
          
          if (group.styles.roc.lineStyle === 'dashed') {
            lineStyle = kc.LineType.Dashed;
            dashedValue = [4, 4];
          } else if (group.styles.roc.lineStyle === 'dotted') {
            lineStyle = kc.LineType.Dashed;
            dashedValue = [2, 2];
          }
          
          const indicatorStyles = {
            lines: [{
              color: group.styles.roc.color,
              size: group.styles.roc.thickness,
              style: lineStyle,
              dashedValue: dashedValue
            }]
          };

          console.log('➕ Re-adding ROC group:', `ROC_${index + 1}`, 'at index:', index);
          const paneId = $chart?.createIndicator({
            name: 'ROC',
            calcParams: [group.period],
            styles: indicatorStyles,
            figures: [
              {
                key: 'roc',
                title: 'ROC: ',
                type: 'line'
              }
            ]
          }, false);
          
          // Update group with new paneId
          if (paneId) {
            group.paneId = paneId;
            
            // Update save data for the new pane
            save.update(s => {
              const saveKey = `${paneId}_ROC`;
              if (!s.saveInds[saveKey]) {
                s.saveInds[saveKey] = {
                  name: 'ROC',
                  pane_id: paneId,
                  rocGroups: []
                };
              }
              
              // Ensure rocGroups array exists
              if (!s.saveInds[saveKey].rocGroups) {
                s.saveInds[saveKey].rocGroups = [];
              }
              
              // Add the group at the correct index
              s.saveInds[saveKey].rocGroups[index] = {...group};
              
              return s;
            });
          }
        });
        
        console.log('✅ Successfully updated ROC indicators on chart');
      } catch (error) {
        console.error('❌ Error updating ROC indicators:', error);
      }
    }
    
    console.log('✅ ROC group removed. Remaining groups:', rocGroups.length);
  }

  // Real-time ROC indicator update function (similar to PVT's updatePvtIndicator)
  function updateRocIndicator(groupIndex: number) {
    const group = rocGroups[groupIndex];
    if (!group || !$chart) {
      console.warn('❌ updateRocIndicator: Missing group or chart', { group, chart: !!$chart });
      return;
    }
    
    console.log('🔄 updateRocIndicator called:', { groupIndex, group });
    
    // Convert line style to klinecharts format
    let lineStyle = kc.LineType.Solid;
    let dashedValue = [2, 2];
    
    if (group.styles.roc.lineStyle === 'dashed') {
      lineStyle = kc.LineType.Dashed;
      dashedValue = [4, 4];
    } else if (group.styles.roc.lineStyle === 'dotted') {
      lineStyle = kc.LineType.Dashed;
      dashedValue = [2, 2];
    }
    
    // Find the specific indicator instance on the chart
    const indicators = $chart?.getIndicators();
    const rocIndicators = indicators.filter(ind => ind.name === 'ROC');
    
    console.log('📊 Found ROC indicators on chart:', rocIndicators.length);
    console.log('📊 Looking for group index:', groupIndex);
    
    // Use groupIndex to match with chart indicators
    if (rocIndicators.length > groupIndex) {
      const indicator = rocIndicators[groupIndex];
      console.log('✅ Found matching ROC indicator by index, updating styles...');
      
      // Update the indicator with new styles
      const result = $chart?.overrideIndicator({
        name: 'ROC',
        paneId: indicator.paneId,
        calcParams: [group.period],
        styles: {
          lines: [{
            color: group.styles.roc.color,
            size: group.styles.roc.thickness,
            style: lineStyle,
            dashedValue: dashedValue,
            smooth: false
          }]
        },
        figures: [
          { key: 'roc', title: 'ROC: ', type: 'line' }
        ]
      });
      
      console.log('🎨 overrideIndicator result:', result);
      console.log('🎨 Applied styles:', {
        color: group.styles.roc.color,
        size: group.styles.roc.thickness,
        style: lineStyle,
        dashedValue: dashedValue
      });
      
      // Persist changes to save data immediately
      const saveKey = `${indicator.paneId}_ROC`;
      
      console.log('💾 Using save key:', saveKey);
      
      save.update(s => {
        if (!s.saveInds[saveKey]) {
          s.saveInds[saveKey] = {
            name: 'ROC',
            pane_id: indicator.paneId,
            params: [group.period],
            rocGroups: []
          };
        }
        
        // Ensure rocGroups array exists
        if (!s.saveInds[saveKey].rocGroups) {
          s.saveInds[saveKey].rocGroups = [];
        }
        
        // Update the specific group in saved data
        const savedGroups = s.saveInds[saveKey].rocGroups || [];
        
        // Ensure the array is large enough
        while (savedGroups.length <= groupIndex) {
          savedGroups.push({});
        }
        
        // Update the group at the correct index
        savedGroups[groupIndex] = {...group};
        
        s.saveInds[saveKey].rocGroups = savedGroups;
        s.saveInds[saveKey].params = [group.period];
        
        console.log('💾 Persisted ROC changes to save data:', saveKey, group);
        
        return s;
      });
      
      console.log('✅ ROC indicator updated successfully:', groupIndex, group);
    } else {
      console.error('❌ ROC indicator not found on chart for group index:', groupIndex);
      console.log('📊 Available ROC indicators:', rocIndicators.length);
      console.log('📊 Requested group index:', groupIndex);
    }
  }

  // Initialize default PSY group
  function initializePsyGroups() {
    if (!isPsy) return;
    
    // Reset psyGroups first
    psyGroups = [];
    
    // Find all PSY indicators for this session
    const psyKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'PSY'
    ).sort((a, b) => {
      // Sort to ensure proper order: main pane first, then numbered instances
      if (a === `${$ctx.editPaneId}_PSY`) return -1;
      if (b === `${$ctx.editPaneId}_PSY`) return 1;
      return a.localeCompare(b);
    });
    
    if (psyKeys.length > 0) {
      // Load from saved data
      psyGroups = psyKeys.map((key, index) => {
        const savedData = $save.saveInds[key];
        if (savedData.psyGroup) {
          // New format with individual groups
          return {
            ...savedData.psyGroup,
            id: savedData.psyGroup.id || generateUUID(),
            actualPaneId: savedData.pane_id
          };
        } else if (savedData.psyGroups) {
          // Legacy format with grouped data
          const group = savedData.psyGroups[index] || savedData.psyGroups[0];
          return {
            ...group,
            id: group.id || generateUUID(),
            actualPaneId: savedData.pane_id
          };
        } else {
          // Fallback: create from params
          const [psyPeriod = 12, mapsyPeriod = 6] = savedData.params || [12, 6];
          const colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c'];
          return {
            id: generateUUID(),
            psyPeriod,
            mapsyPeriod,
            showMapsy: true,
            actualPaneId: savedData.pane_id,
            styles: {
              psy: {
                color: colors[index % colors.length],
                thickness: 1,
                lineStyle: 'solid'
              },
              mapsy: {
                color: colors[(index + 1) % colors.length],
                thickness: 1,
                lineStyle: 'solid'
              }
            }
          };
        }
      });
    } else {
      // Create default PSY group with periods 12 and 6
      psyGroups.push({
        id: generateUUID(),
        psyPeriod: 12,
        mapsyPeriod: 6,
        showMapsy: true, // Default to show MAPSY
        styles: {
          psy: {color: '#2563eb', thickness: 1, lineStyle: 'solid'},
          mapsy: {color: '#dc2626', thickness: 1, lineStyle: 'solid'}
        }
      });
    }
    
    // Ensure all groups have unique IDs
    psyGroups = psyGroups.map(group => ({
      ...group,
      id: group.id || generateUUID()
    }));
  }

  function addPsyGroup() {
    if (!isPsy) return;
    
    // Add new PSY group with default periods and unique colors
    const colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c'];
    const colorIndex = psyGroups.length % colors.length;
    
    const newGroup = {
      id: generateUUID(),
      psyPeriod: 12,
      mapsyPeriod: 6,
      showMapsy: true,
      actualPaneId: undefined as string | undefined,
      styles: {
        psy: {color: colors[colorIndex], thickness: 1, lineStyle: 'solid'},
        mapsy: {color: colors[(colorIndex + 1) % colors.length], thickness: 1, lineStyle: 'solid'}
      }
    };
    
    psyGroups.push(newGroup);
    
    // Check if there are already PSY groups (indicating edit pane has PSY)
    // Use current psyGroups state instead of saved state for better popup synchronization
    const hasExistingPsy = psyGroups.length > 1;
    
    // If there are already PSY groups, create in new sub-pane
    if (hasExistingPsy) {
      // Find the next available index for pane naming
      let nextIndex = 2;
      while (Object.keys($save.saveInds).some(key => key === `psy_${String(nextIndex).padStart(3, '0')}_PSY`)) {
        nextIndex++;
      }
      
      const groupIndex = psyGroups.length - 1;
      const calcParams = [newGroup.psyPeriod, newGroup.mapsyPeriod];
      
      // Create figures array based on showMapsy setting
      const figures = [
        { key: 'psy', title: 'PSY: ', type: 'line' }
      ];
      
      if (newGroup.showMapsy) {
        figures.push({ key: 'mapsy', title: 'MAPSY: ', type: 'line' });
      }
      
      // Create indicator styles for PSY and MAPSY lines
      const indicatorStyles: any = {
        lines: []
      };
      
      // PSY line style
      let psyLineStyle = kc.LineType.Solid;
      let psyDashedValue = [2, 2];
      
      if (newGroup.styles.psy.lineStyle === 'dashed') {
        psyLineStyle = kc.LineType.Dashed;
        psyDashedValue = [4, 4];
      } else if (newGroup.styles.psy.lineStyle === 'dotted') {
        psyLineStyle = kc.LineType.Dashed;
        psyDashedValue = [2, 2];
      }
      
      indicatorStyles.lines.push({
        color: newGroup.styles.psy.color,
        size: newGroup.styles.psy.thickness,
        style: psyLineStyle,
        dashedValue: psyDashedValue,
        smooth: false
      });
      
      // MAPSY line style (only if showMapsy is true)
      if (newGroup.showMapsy) {
        let mapsyLineStyle = kc.LineType.Solid;
        let mapsyDashedValue = [2, 2];
        
        if (newGroup.styles.mapsy.lineStyle === 'dashed') {
          mapsyLineStyle = kc.LineType.Dashed;
          mapsyDashedValue = [4, 4];
        } else if (newGroup.styles.mapsy.lineStyle === 'dotted') {
          mapsyLineStyle = kc.LineType.Dashed;
          mapsyDashedValue = [2, 2];
        }
        
        indicatorStyles.lines.push({
          color: newGroup.styles.mapsy.color,
          size: newGroup.styles.mapsy.thickness,
          style: mapsyLineStyle,
          dashedValue: mapsyDashedValue,
          smooth: false
        });
      }
      
      // Create new PSY indicator in a new sub-pane
      const newPaneId = `psy_${String(nextIndex).padStart(3, '0')}`;
      console.log(`🆕 Immediately creating PSY ${nextIndex} with pane ID:`, newPaneId);
      
      const result = $chart?.createIndicator({
        name: 'PSY',
        calcParams: calcParams,
        styles: indicatorStyles,
        figures: figures
      }, false, { id: newPaneId, axis: { gap: { bottom: 2 } } });
      
      // Store the pane ID for later reference
      if (result) {
        console.log(`✅ PSY ${nextIndex} created with pane ID:`, newPaneId);
        newGroup.actualPaneId = newPaneId;
        
        // Immediately save this group configuration
        save.update(s => {
          const saveKey = `psy_${String(nextIndex).padStart(3, '0')}_PSY`;
          s.saveInds[saveKey] = {
            name: 'PSY',
            psyGroup: newGroup,
            pane_id: newPaneId,
            groupIndex: groupIndex,
            params: [newGroup.psyPeriod, newGroup.mapsyPeriod]
          };
          return s;
        });
      }
    } else {
      // If edit pane doesn't have PSY, this will be handled by handlePsyConfirm
      console.log(`📝 New PSY group will be added to edit pane on confirm`);
    }
  }

  function removePsyGroup(groupId: string) {
    if (!isPsy || psyGroups.length <= 1) return;
    
    // Find the group index
    const groupIndex = psyGroups.findIndex(group => group.id === groupId);
    if (groupIndex === -1) return;
    
    console.log('🗑️ Removing PSY group at index:', groupIndex, 'ID:', groupId);
    
    try {
      // Special handling when removing the first group
      if (groupIndex === 0 && psyGroups.length > 1) {
        console.log('🔄 Special handling: First PSY removed, promoting second PSY to first position');
        
        // Remove the group from the array FIRST
        psyGroups = psyGroups.filter(group => group.id !== groupId);
        console.log('✅ PSY group removed from array. Remaining groups:', psyGroups.length);
        
        // The new first group (previously second) needs to be moved to edit pane
        const newFirstGroup = psyGroups[0];
        
        // Remove the old second PSY from its sub-pane first
        if (newFirstGroup.actualPaneId) {
          console.log('🗑️ Removing old second PSY from sub-pane:', newFirstGroup.actualPaneId);
          $chart?.removeIndicator({ paneId: newFirstGroup.actualPaneId, name: 'PSY' });
        }
        
        // Clear the actualPaneId since it's now going to edit pane
        newFirstGroup.actualPaneId = undefined;
        
        // Update the PSY in edit pane with new first group's settings
        console.log('📊 Updating PSY in edit pane with new first group settings');
        updatePsyIndicator(0);
        
      } else {
        // For non-first groups, remove from their specific panes
        const saveKey = `pane_PSY_${groupIndex + 1}_PSY`;
        if ($save.saveInds[saveKey]) {
          const savedData = $save.saveInds[saveKey];
          console.log('🗑️ Removing PSY from pane:', savedData.pane_id);
          $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'PSY' });
          console.log('✅ Successfully removed PSY from pane:', savedData.pane_id);
        } else {
          // Try to remove using the group's actual pane ID if available
          const group = psyGroups[groupIndex];
          if (group.actualPaneId) {
            console.log('🗑️ Removing PSY from actual pane:', group.actualPaneId);
            $chart?.removeIndicator({ paneId: group.actualPaneId, name: 'PSY' });
            console.log('✅ Successfully removed PSY from actual pane:', group.actualPaneId);
          }
        }
        
        // Remove the group from the array
        psyGroups = psyGroups.filter(group => group.id !== groupId);
        console.log('✅ PSY group removed from array. Remaining groups:', psyGroups.length);
      }
      
      // Remove from saved data and reindex
      save.update(s => {
        // Clear all PSY-related saved data
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'PSY') {
            console.log('🧹 Cleaning saved state for key:', key);
            delete s.saveInds[key];
          }
        });
        
        // Re-save remaining groups with correct indexing
        psyGroups.forEach((group, index) => {
          const saveKey = index === 0 ? `${$ctx.editPaneId}_PSY` : `pane_PSY_${index + 1}_PSY`;
          // Use actual pane ID if available, otherwise fallback to generated one
          const paneId = index === 0 ? $ctx.editPaneId : (group.actualPaneId || `pane_PSY_${index + 1}`);
          
          s.saveInds[saveKey] = {
            name: 'PSY',
            psyGroup: group,
            pane_id: paneId,
            groupIndex: index,
            psyGroups: index === 0 ? [...psyGroups] : undefined, // Store all groups in first entry
            params: [group.psyPeriod, group.mapsyPeriod]
          };
          
          console.log('💾 Re-saved PSY group', index, 'with key:', saveKey, 'and pane ID:', paneId);
        });
        
        return s;
      });
      
    } catch (error) {
      console.error('❌ Error removing PSY group:', error);
    }
  }

  // Update PSY indicator immediately when parameters change
  function updatePsyIndicator(groupIndex: number) {
    const group = psyGroups[groupIndex];
    if (!group || !$chart) return;
    
    const paneId = groupIndex === 0 ? $ctx.editPaneId : (group.actualPaneId || `psy_${String(groupIndex + 1).padStart(3, '0')}`);
    
    // Create figures array based on showMapsy setting
    const figures = [
      { key: 'psy', title: 'PSY: ', type: 'line' }
    ];
    
    if (group.showMapsy) {
      figures.push({ key: 'mapsy', title: 'MAPSY: ', type: 'line' });
    }
    
    // Create indicator styles for PSY and MAPSY lines
    const indicatorStyles: any = {
      lines: []
    };
    
    // PSY line style
    let psyLineStyle = kc.LineType.Solid;
    let psyDashedValue = [2, 2];
    
    if (group.styles.psy.lineStyle === 'dashed') {
      psyLineStyle = kc.LineType.Dashed;
      psyDashedValue = [4, 4];
    } else if (group.styles.psy.lineStyle === 'dotted') {
      psyLineStyle = kc.LineType.Dashed;
      psyDashedValue = [2, 2];
    }
    
    indicatorStyles.lines.push({
      color: group.styles.psy.color,
      size: group.styles.psy.thickness,
      style: psyLineStyle,
      dashedValue: psyDashedValue,
      smooth: false
    });
    
    // MAPSY line style (only if showMapsy is true)
    if (group.showMapsy) {
      let mapsyLineStyle = kc.LineType.Solid;
      let mapsyDashedValue = [2, 2];
      
      if (group.styles.mapsy.lineStyle === 'dashed') {
        mapsyLineStyle = kc.LineType.Dashed;
        mapsyDashedValue = [4, 4];
      } else if (group.styles.mapsy.lineStyle === 'dotted') {
        mapsyLineStyle = kc.LineType.Dashed;
        mapsyDashedValue = [2, 2];
      }
      
      indicatorStyles.lines.push({
        color: group.styles.mapsy.color,
        size: group.styles.mapsy.thickness,
        style: mapsyLineStyle,
        dashedValue: mapsyDashedValue,
        smooth: false
      });
    }
    
    // Update the existing indicator with new parameters and styles
    $chart?.overrideIndicator({
      name: 'PSY',
      paneId: paneId,
      styles: indicatorStyles,
      calcParams: [group.psyPeriod, group.mapsyPeriod],
      figures: figures
    });
    
    // CRITICAL: Also persist changes to save data immediately
    const saveKey = groupIndex === 0 ? `${$ctx.editPaneId}_PSY` : `psy_${String(groupIndex + 1).padStart(3, '0')}_PSY`;
    
    save.update(s => {
      if (s.saveInds[saveKey]) {
        // Update existing saved indicator
        s.saveInds[saveKey].params = [group.psyPeriod, group.mapsyPeriod];
        s.saveInds[saveKey].psyGroup = {...group}; // Store complete group data
        console.log('💾 Persisted PSY changes to save data:', saveKey, group);
      }
      return s;
    });
    
    console.log('🔄 Updated PSY indicator:', groupIndex, group);
  }

  // Initialize default OBV group
  function initializeObvGroups() {
    if (!isObv) return;
    
    // Reset obvGroups first
    obvGroups = [];
    
    // Check for saved OBV groups - look for all OBV indicators
    const obvEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'OBV');
    
    if (obvEntries.length > 0) {
      // Load saved OBV groups
      
      // Sort by groupIndex to maintain order
      obvEntries.sort(([keyA, indA], [keyB, indB]) => {
        const indexA = (indA as any).groupIndex || 0;
        const indexB = (indB as any).groupIndex || 0;
        return indexA - indexB;
      });
      
      obvEntries.forEach(([key, ind]) => {
        const obvData = ind as any;
        if (obvData.obvGroup) {
          const group = obvData.obvGroup;
          // Load actualPaneId from saved data
          if (obvData.pane_id) {
            group.actualPaneId = obvData.pane_id;
          }
          obvGroups.push(group);
        } else if (obvData.obvGroups && obvData.obvGroups.length > 0) {
          // Handle old format where all groups were saved together
          obvGroups = [...obvData.obvGroups];
          // Load actualPaneId for each group
          obvGroups.forEach((group, index) => {
            if (index > 0 && obvData.pane_id) {
              group.actualPaneId = obvData.pane_id;
            }
          });
        } else {
          // Handle legacy format
          const group = {
            id: generateUUID(),
            obvPeriod: obvData.params?.[0] || 30,
            maobvPeriod: obvData.params?.[1] || 10,
            showMaobv: true,
            actualPaneId: undefined as string | undefined,
            styles: {
              obv: {color: '#FF6B35', thickness: 2, lineStyle: 'solid'},
              maobv: {color: '#2196F3', thickness: 1, lineStyle: 'solid'}
            }
          };
          // Load actualPaneId from saved data
          if (obvData.pane_id) {
            group.actualPaneId = obvData.pane_id;
          }
          obvGroups.push(group);
        }
      });
    } else {
      // Create default OBV group with periods 30 and 10
      obvGroups.push({
        id: generateUUID(),
        obvPeriod: 30,
        maobvPeriod: 10,
        showMaobv: true, // Default to show MAOBV
        styles: {
          obv: {color: '#FF6B35', thickness: 2, lineStyle: 'solid'},
          maobv: {color: '#2196F3', thickness: 1, lineStyle: 'solid'}
        }
      });
    }
  }

  function addObvGroup() {
    if (!isObv) return;
    
    // Add new OBV group with default periods and unique colors
    const colors = ['#FF6B35', '#2196F3', '#16a34a', '#ca8a04', '#9333ea', '#c2410c'];
    const colorIndex = obvGroups.length % colors.length;
    
    const newGroup = {
      id: generateUUID(),
      obvPeriod: 30,
      maobvPeriod: 10,
      showMaobv: true,
      actualPaneId: undefined as string | undefined,
      styles: {
        obv: {color: colors[colorIndex], thickness: 2, lineStyle: 'solid'},
        maobv: {color: colors[(colorIndex + 1) % colors.length], thickness: 1, lineStyle: 'solid'}
      }
    };
    
    obvGroups.push(newGroup);
    
    // Check if there are already OBV groups (indicating edit pane has OBV)
    // Use current obvGroups state instead of saved state for better popup synchronization
    const hasExistingObv = obvGroups.length > 1;
    
    // If there are already OBV groups, create in new sub-pane
    if (hasExistingObv) {
      // Find the next available index for pane naming
      let nextIndex = 2;
      while (Object.keys($save.saveInds).some(key => key === `pane_OBV_${nextIndex}_OBV`)) {
        nextIndex++;
      }
      
      const groupIndex = obvGroups.length - 1;
      const calcParams = [newGroup.obvPeriod, newGroup.maobvPeriod];
      
      // Create indicator styles for OBV and MAOBV lines
      const indicatorStyles: any = {
        lines: [
          {
            color: newGroup.styles.obv.color,
            size: newGroup.styles.obv.thickness,
            style: newGroup.styles.obv.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: newGroup.styles.obv.lineStyle === 'dashed' ? [4, 4] : [2, 2]
          },
          {
            color: newGroup.styles.maobv.color,
            size: newGroup.styles.maobv.thickness,
            style: newGroup.styles.maobv.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: newGroup.styles.maobv.lineStyle === 'dashed' ? [4, 4] : [2, 2]
          }
        ]
      };
      
      // Create new OBV indicator in a new sub-pane
      const newPaneId = `pane_OBV_${nextIndex}`;
      console.log(`🆕 Immediately creating OBV ${nextIndex} with pane ID:`, newPaneId);
      
      const result = $chart?.createIndicator({
        name: 'OBV',
        calcParams: calcParams,
        styles: indicatorStyles
      }, false, { id: newPaneId, axis: { gap: { bottom: 2 } } });
      
      // Store the pane ID for later reference
      if (result) {
        console.log(`✅ OBV ${nextIndex} created with pane ID:`, newPaneId);
        newGroup.actualPaneId = newPaneId;
        
        // Immediately save this group configuration
        save.update(s => {
          const saveKey = `pane_OBV_${nextIndex}_OBV`;
          s.saveInds[saveKey] = {
            name: 'OBV',
            obvGroup: newGroup,
            pane_id: newPaneId,
            groupIndex: groupIndex,
            params: [newGroup.obvPeriod, newGroup.maobvPeriod]
          };
          return s;
        });
      }
    } else {
      // If edit pane doesn't have OBV, this will be handled by handleObvConfirm
      console.log(`📝 New OBV group will be added to edit pane on confirm`);
    }
  }

  function removeObvGroup(groupId: string) {
    if (!isObv || obvGroups.length <= 1) return;
    
    // Find the group index
    const groupIndex = obvGroups.findIndex(group => group.id === groupId);
    if (groupIndex === -1) return;
    
    console.log('🗑️ Removing OBV group at index:', groupIndex, 'ID:', groupId);
    
    try {
      // Remove from chart first
      if (groupIndex === 0) {
        // For the first group, remove from the edit pane
        console.log('🗑️ Removing OBV from edit pane:', $ctx.editPaneId);
        $chart?.removeIndicator({ paneId: $ctx.editPaneId, name: 'OBV' });
        console.log('✅ Successfully removed OBV from edit pane');
      } else {
        // For non-first groups, remove from their specific panes
        const saveKey = `pane_OBV_${groupIndex + 1}_OBV`;
        if ($save.saveInds[saveKey]) {
          const savedData = $save.saveInds[saveKey];
          console.log('🗑️ Removing OBV from pane:', savedData.pane_id);
          $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'OBV' });
          console.log('✅ Successfully removed OBV from pane:', savedData.pane_id);
        } else {
          // Try to remove using the group's actual pane ID if available
          const group = obvGroups[groupIndex];
          if (group.actualPaneId) {
            console.log('🗑️ Removing OBV from actual pane:', group.actualPaneId);
            $chart?.removeIndicator({ paneId: group.actualPaneId, name: 'OBV' });
            console.log('✅ Successfully removed OBV from actual pane:', group.actualPaneId);
          }
        }
      }
      
      // Remove the group from the array FIRST
      obvGroups = obvGroups.filter(group => group.id !== groupId);
      console.log('✅ OBV group removed from array. Remaining groups:', obvGroups.length);
      
      // Remove from saved data and reindex
      save.update((s: ChartSave) => {
        // Clear all OBV-related saved data
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'OBV') {
            console.log('🧹 Cleaning saved state for key:', key);
            delete s.saveInds[key];
          }
        });
        
        // Re-save remaining groups with correct indexing
        obvGroups.forEach((group, index) => {
          const saveKey = index === 0 ? `${$ctx.editPaneId}_OBV` : `pane_OBV_${index + 1}_OBV`;
          // Use actual pane ID if available, otherwise fallback to generated one
          const paneId = index === 0 ? $ctx.editPaneId : (group.actualPaneId || `pane_OBV_${index + 1}`);
          
          s.saveInds[saveKey] = {
            name: 'OBV',
            obvGroup: group,
            pane_id: paneId,
            groupIndex: index,
            obvGroups: index === 0 ? [...obvGroups] : undefined, // Store all groups in first entry
            params: [group.obvPeriod, group.maobvPeriod]
          };
        });
        
        return s;
      });
      
      console.log('✅ OBV group removal completed');
    } catch (error) {
      console.error('❌ Error removing OBV group:', error);
    }
  }

  // Initialize default KDJ group
  function initializeKdjGroups() {
    if (!isKdj) return;
    
    console.log('🔄 Initializing KDJ groups for edit pane:', $ctx.editPaneId);
    
    // Find all existing KDJ indicators in save data
    const allKdjKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'KDJ'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_KDJ first, then pane_KDJ_X_KDJ
      if (a === `${$ctx.editPaneId}_KDJ`) return -1;
      if (b === `${$ctx.editPaneId}_KDJ`) return 1;
      return a.localeCompare(b);
    });
    
    console.log('🔍 Found KDJ keys:', allKdjKeys);
    
    if (allKdjKeys.length > 0) {
      // Load all existing KDJ groups
      kdjGroups = [];
      allKdjKeys.forEach((key, index) => {
        const savedInd = $save.saveInds[key];
        console.log(`🔄 Loading KDJ group ${index + 1} from key:`, key, savedInd);
        
        if (savedInd) {
          // Check if this saved indicator has a kdjGroup property
          if ((savedInd as any).kdjGroup) {
            // Load from kdjGroup property and preserve actual pane ID
            const group = {...(savedInd as any).kdjGroup};
            // For additional KDJ indicators, preserve the actual pane ID
            if (index > 0 && savedInd.pane_id) {
              group.actualPaneId = savedInd.pane_id;
            }
            kdjGroups.push(group);
          } else if (savedInd.params && savedInd.params.length >= 2) {
            // Create group from params if kdjGroup doesn't exist
            const group = {
              id: generateUUID(),
              kPeriod: savedInd.params[0] || 9,
              dPeriod: savedInd.params[1] || 3,
              actualPaneId: undefined as string | undefined,
              styles: {
                k: {color: '#FF6B35', thickness: 1, lineStyle: 'solid'},
                d: {color: '#2196F3', thickness: 1, lineStyle: 'solid'},
                j: {color: '#9C27B0', thickness: 1, lineStyle: 'solid'}
              }
            };
            // For additional KDJ indicators, preserve the actual pane ID
            if (index > 0 && savedInd.pane_id) {
              group.actualPaneId = savedInd.pane_id;
            }
            kdjGroups.push(group);
          }
        }
      });
      
      console.log('✅ Loaded', kdjGroups.length, 'existing KDJ groups');
    } else if (kdjGroups.length === 0) {
      // Create default KDJ group if none exist
      kdjGroups = [{
        id: generateUUID(),
        kPeriod: 9,
        dPeriod: 3,
        styles: {
          k: {color: '#FF6B35', thickness: 1, lineStyle: 'solid'},
          d: {color: '#2196F3', thickness: 1, lineStyle: 'solid'},
          j: {color: '#9C27B0', thickness: 1, lineStyle: 'solid'}
        }
      }];
      
      console.log('🆕 Created default KDJ group');
    }
  }

  function addKdjGroup() {
    if (!isKdj) return;
    
    // Add new KDJ group with default periods and unique colors
    const colors = ['#FF6B35', '#2196F3', '#9C27B0', '#16a34a', '#ca8a04', '#dc2626'];
    const colorIndex = kdjGroups.length % colors.length;
    
    const newGroup = {
      id: generateUUID(),
      kPeriod: 9,
      dPeriod: 3,
      actualPaneId: undefined as string | undefined,
      styles: {
        k: {color: colors[colorIndex], thickness: 1, lineStyle: 'solid'},
        d: {color: colors[(colorIndex + 1) % colors.length], thickness: 1, lineStyle: 'solid'},
        j: {color: colors[(colorIndex + 2) % colors.length], thickness: 1, lineStyle: 'solid'}
      }
    };
    
    kdjGroups.push(newGroup);
    
    // If this is not the first group, immediately create the new KDJ indicator in a new sub-pane
    if (kdjGroups.length > 1) {
      const groupIndex = kdjGroups.length - 1;
      const calcParams = [newGroup.kPeriod, newGroup.dPeriod, 3];
      
      // Create indicator styles for K, D, and J lines
      const indicatorStyles: any = {
        lines: [
          {
            color: newGroup.styles.k.color,
            size: newGroup.styles.k.thickness,
            style: newGroup.styles.k.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: newGroup.styles.k.lineStyle === 'dashed' ? [4, 4] : [2, 2]
          },
          {
            color: newGroup.styles.d.color,
            size: newGroup.styles.d.thickness,
            style: newGroup.styles.d.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: newGroup.styles.d.lineStyle === 'dashed' ? [4, 4] : [2, 2]
          },
          {
            color: newGroup.styles.j.color,
            size: newGroup.styles.j.thickness,
            style: newGroup.styles.j.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: newGroup.styles.j.lineStyle === 'dashed' ? [4, 4] : [2, 2]
          }
        ]
      };
      
      // Create new KDJ indicator in a new sub-pane
      const newPaneId = `pane_KDJ_${groupIndex + 1}`;
      console.log(`🆕 Immediately creating KDJ ${groupIndex + 1} with pane ID:`, newPaneId);
      
      const result = $chart?.createIndicator({
        name: 'KDJ',
        calcParams: calcParams,
        styles: indicatorStyles
      }, false, { id: newPaneId, axis: { gap: { bottom: 2 } } });
      
      // Store the pane ID for later reference
      if (result) {
        console.log(`✅ KDJ ${groupIndex + 1} created with pane ID:`, newPaneId);
        newGroup.actualPaneId = newPaneId;
        
        // Immediately save this group configuration
        save.update(s => {
          const saveKey = `pane_KDJ_${groupIndex + 1}_KDJ`;
          s.saveInds[saveKey] = {
            name: 'KDJ',
            kdjGroup: newGroup,
            pane_id: newPaneId,
            groupIndex: groupIndex,
            params: [newGroup.kPeriod, newGroup.dPeriod, 3]
          };
          return s;
        });
      }
    }
  }

  // Update KDJ indicator immediately when parameters change
  function updateKdjIndicator(groupIndex: number) {
    const group = kdjGroups[groupIndex];
    if (!group || !$chart) return;
    
    const paneId = groupIndex === 0 ? $ctx.editPaneId : (group.actualPaneId || `pane_KDJ_${groupIndex + 1}`);
    
    const indicatorStyles: any = {
      lines: [
        {
          color: group.styles.k.color,
          size: group.styles.k.thickness,
          style: group.styles.k.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
          dashedValue: group.styles.k.lineStyle === 'dashed' ? [4, 4] : [2, 2]
        },
        {
          color: group.styles.d.color,
          size: group.styles.d.thickness,
          style: group.styles.d.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
          dashedValue: group.styles.d.lineStyle === 'dashed' ? [4, 4] : [2, 2]
        },
        {
          color: group.styles.j.color,
          size: group.styles.j.thickness,
          style: group.styles.j.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
          dashedValue: group.styles.j.lineStyle === 'dashed' ? [4, 4] : [2, 2]
        }
      ]
    };
    
    // Update the existing indicator with new parameters and styles
    $chart?.overrideIndicator({
      name: 'KDJ',
      paneId: paneId,
      styles: indicatorStyles,
      calcParams: [group.kPeriod, group.dPeriod, 3]
    });
    
    // CRITICAL: Also persist changes to save data immediately
    const saveKey = groupIndex === 0 ? `${$ctx.editPaneId}_KDJ` : `pane_KDJ_${groupIndex + 1}_KDJ`;
    
    save.update(s => {
      if (s.saveInds[saveKey]) {
        // Update existing saved indicator
        s.saveInds[saveKey].params = [group.kPeriod, group.dPeriod, 3];
        s.saveInds[saveKey].kdjGroup = {...group}; // Store complete group data
        console.log('💾 Persisted KDJ changes to save data:', saveKey, group);
      }
      return s;
    });
    
    console.log('🔄 Updated KDJ indicator:', groupIndex, group);
  }
  
  // Update KDJ color immediately when changed
  function updateKdjColor(groupIndex: number, lineType: 'k' | 'd' | 'j') {
    const group = kdjGroups[groupIndex];
    if (!group || !$chart) return;
    
    const paneId = groupIndex === 0 ? $ctx.editPaneId : (group.actualPaneId || `pane_KDJ_${groupIndex + 1}`);
    
    // Update only the specific line style
    const lineStyles = {
      k: { 
        color: group.styles.k.color, 
        size: group.styles.k.thickness, 
        style: group.styles.k.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
        dashedValue: group.styles.k.lineStyle === 'dashed' ? [4, 4] : [2, 2]
      },
      d: { 
        color: group.styles.d.color, 
        size: group.styles.d.thickness, 
        style: group.styles.d.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
        dashedValue: group.styles.d.lineStyle === 'dashed' ? [4, 4] : [2, 2]
      },
      j: { 
        color: group.styles.j.color, 
        size: group.styles.j.thickness, 
        style: group.styles.j.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
        dashedValue: group.styles.j.lineStyle === 'dashed' ? [4, 4] : [2, 2]
      }
    };
    
    // Create indicator styles with only the updated line
    const indicatorStyles: any = {
      lines: [lineStyles.k, lineStyles.d, lineStyles.j]
    };
    
    // Update the indicator with the new styles
    $chart?.overrideIndicator({
      name: 'KDJ',
      paneId: paneId,
      styles: indicatorStyles
    });
    
    console.log('🎨 Updated KDJ color:', lineType, group.styles[lineType].color);
  }

  // Update Ichimoku indicator immediately when parameters change
  function updateIchimokuIndicator() {
    if (!isIchimoku || !$chart) return;
    
    const paneId = $ctx.editPaneId;
    
    // Create indicator styles for all Ichimoku lines
    const indicatorStyles: any = {
      lines: fields.map((field, i) => ({
        color: styles[i].color,
        size: styles[i].thickness,
        style: styles[i].lineStyle === 'dashed' ? kc.LineType.Dashed : 
               styles[i].lineStyle === 'dotted' ? kc.LineType.Dashed : kc.LineType.Solid,
        dashedValue: styles[i].lineStyle === 'dashed' ? [4, 4] : [2, 2]
      }))
    };
    
    // Update the existing indicator with new parameters and styles
    $chart?.overrideIndicator({
      name: 'ICHIMOKU',
      paneId: paneId,
      styles: indicatorStyles,
      calcParams: params
    });
    
    // Persist changes to save data immediately
    const saveKey = `${paneId}_ICHIMOKU`;
    
    save.update(s => {
      if (s.saveInds[saveKey]) {
        // Update existing saved indicator
        s.saveInds[saveKey].params = [...params];
        s.saveInds[saveKey].styles = styles.map(style => ({...style})); // Deep copy styles
        console.log('💾 Persisted Ichimoku changes to save data:', saveKey, params, styles);
      }
      return s;
    });
    
    console.log('🔄 Updated Ichimoku indicator:', params, styles);
  }

  function removeKdjGroup(groupId: string) {
    if (!isKdj || kdjGroups.length <= 1) return;
    
    // Find the group index
    const groupIndex = kdjGroups.findIndex(group => group.id === groupId);
    if (groupIndex === -1) return;
    
    console.log('🗑️ Removing KDJ group at index:', groupIndex, 'ID:', groupId);
    
    try {
      // Remove from chart first
      if (groupIndex === 0) {
        // For the first group, remove from the edit pane
        console.log('🗑️ Removing KDJ from edit pane:', $ctx.editPaneId);
        $chart?.removeIndicator({ paneId: $ctx.editPaneId, name: 'KDJ' });
        console.log('✅ Successfully removed KDJ from edit pane');
      } else {
        // For non-first groups, remove from their specific panes
        const saveKey = `pane_KDJ_${groupIndex + 1}_KDJ`;
        if ($save.saveInds[saveKey]) {
          const savedData = $save.saveInds[saveKey];
          console.log('🗑️ Removing KDJ from pane:', savedData.pane_id);
          $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'KDJ' });
          console.log('✅ Successfully removed KDJ from pane:', savedData.pane_id);
        } else {
          // Try to remove using the group's actual pane ID if available
          const group = kdjGroups[groupIndex];
          if (group.actualPaneId) {
            console.log('🗑️ Removing KDJ from actual pane:', group.actualPaneId);
            $chart?.removeIndicator({ paneId: group.actualPaneId, name: 'KDJ' });
            console.log('✅ Successfully removed KDJ from actual pane:', group.actualPaneId);
          }
        }
      }
      
      // Remove the group from the array FIRST
      kdjGroups = kdjGroups.filter(group => group.id !== groupId);
      console.log('✅ KDJ group removed from array. Remaining groups:', kdjGroups.length);
      
      // Remove from saved data and reindex
      save.update((s: ChartSave) => {
        // Clear all KDJ-related saved data
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'KDJ') {
            console.log('🧹 Cleaning saved state for key:', key);
            delete s.saveInds[key];
          }
        });
        
        // Re-save remaining groups with correct indices
        kdjGroups.forEach((group, index) => {
          const saveKey = index === 0 ? `${$ctx.editPaneId}_KDJ` : `pane_KDJ_${index + 1}_KDJ`;
          const paneId = index === 0 ? $ctx.editPaneId : (group.actualPaneId || `pane_KDJ_${index + 1}`);
          
          console.log(`💾 Re-saving KDJ group ${index + 1} with key:`, saveKey, 'pane ID:', paneId);
          
          s.saveInds[saveKey] = {
            name: 'KDJ',
            kdjGroup: group,
            pane_id: paneId,
            groupIndex: index,
            kdjGroups: index === 0 ? [...kdjGroups] : undefined,
            params: [group.kPeriod, group.dPeriod, 3]
          };
        });
        
        return s;
      });
      
      console.log('🔄 KDJ groups reindexed successfully');
      
    } catch (error) {
      console.log('❌ Error removing KDJ indicator:', error);
    }
  }

  // Update OBV indicator immediately when parameters change
  function updateObvIndicator(groupIndex: number) {
    const group = obvGroups[groupIndex];
    if (!group || !$chart) return;
    
    const paneId = groupIndex === 0 ? $ctx.editPaneId : (group.actualPaneId || `pane_OBV_${groupIndex + 1}`);
    
    // Create figures array based on showMaobv setting
    const figures = [
      { key: 'obv', title: 'OBV: ', type: 'line' }
    ];
    
    if (group.showMaobv) {
      figures.push({ key: 'maobv', title: 'MAOBV: ', type: 'line' });
    }
    
    // Create indicator styles
    const indicatorStyles: any = {
      lines: []
    };
    
    // OBV line style
    let obvLineStyle = kc.LineType.Solid;
    let obvDashedValue = [2, 2];
    
    if (group.styles.obv.lineStyle === 'dashed') {
      obvLineStyle = kc.LineType.Dashed;
      obvDashedValue = [4, 4];
    } else if (group.styles.obv.lineStyle === 'dotted') {
      obvLineStyle = kc.LineType.Dashed;
      obvDashedValue = [2, 2];
    }
    
    indicatorStyles.lines.push({
      color: group.styles.obv.color,
      size: group.styles.obv.thickness,
      style: obvLineStyle,
      dashedValue: obvDashedValue,
      smooth: false
    });
    
    // MAOBV line style (only if showMaobv is true)
    if (group.showMaobv) {
      let maobvLineStyle = kc.LineType.Solid;
      let maobvDashedValue = [2, 2];
      
      if (group.styles.maobv.lineStyle === 'dashed') {
        maobvLineStyle = kc.LineType.Dashed;
        maobvDashedValue = [4, 4];
      } else if (group.styles.maobv.lineStyle === 'dotted') {
        maobvLineStyle = kc.LineType.Dashed;
        maobvDashedValue = [2, 2];
      }
      
      indicatorStyles.lines.push({
        color: group.styles.maobv.color,
        size: group.styles.maobv.thickness,
        style: maobvLineStyle,
        dashedValue: maobvDashedValue,
        smooth: false
      });
    }
    
    // Update the existing indicator with new parameters and styles
    $chart?.overrideIndicator({
      name: 'OBV',
      paneId: paneId,
      styles: indicatorStyles,
      calcParams: [group.obvPeriod, group.maobvPeriod],
      figures: figures
    });
    
    // CRITICAL: Also persist changes to save data immediately
    const saveKey = groupIndex === 0 ? `${$ctx.editPaneId}_OBV` : `pane_OBV_${groupIndex + 1}_OBV`;
    
    save.update(s => {
      if (s.saveInds[saveKey]) {
        // Update existing saved indicator
        s.saveInds[saveKey].params = [group.obvPeriod, group.maobvPeriod];
        s.saveInds[saveKey].obvGroup = {...group}; // Store complete group data
        console.log('💾 Persisted OBV changes to save data:', saveKey, group);
      }
      return s;
    });
    
    console.log('🔄 Updated OBV indicator:', groupIndex, group);
  }

  // AO groups management functions
  function initializeAoGroups() {
    if (!isAo) return;
    
    console.log('🔄 Initializing AO groups for edit pane:', $ctx.editPaneId);
    
    // Find all existing AO indicators in save data
    const allAoKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'AO'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_AO first, then pane_AO_X_AO
      if (a === `${$ctx.editPaneId}_AO`) return -1;
      if (b === `${$ctx.editPaneId}_AO`) return 1;
      return a.localeCompare(b);
    });
    
    console.log('🔍 Found AO keys:', allAoKeys);
    
    if (allAoKeys.length > 0) {
      // Load all existing AO groups
      aoGroups = [];
      allAoKeys.forEach((key, index) => {
        const savedInd = $save.saveInds[key];
        console.log(`🔄 Loading AO group ${index + 1} from key:`, key, savedInd);
        
        if (savedInd) {
          if ((savedInd as any).aoGroup) {
            // Load from aoGroup data
            aoGroups.push({...(savedInd as any).aoGroup});
          } else if (savedInd.params && savedInd.params.length === 2) {
            // Create group from params if aoGroup doesn't exist
            aoGroups.push({
              id: generateUUID(),
              shortPeriod: savedInd.params[0] || 5,
              longPeriod: savedInd.params[1] || 34,
              styles: {
                increasing: {color: '#26A69A'},
                decreasing: {color: '#EF5350'}
              }
            });
          }
        }
      });
      
      console.log('✅ Loaded AO groups:', aoGroups.length);
    } else {
      // Check if there's an existing AO indicator created from indicator list
      const existingAoIndicator = Object.entries($save.saveInds).find(([key, ind]) => 
        ind.name === 'AO' && key.includes($ctx.editPaneId || '')
      );
      
      if (existingAoIndicator) {
        const [, ind] = existingAoIndicator;
        console.log('🔄 Found existing AO indicator, creating group from it');
        aoGroups = [{
          id: generateUUID(),
          shortPeriod: ind.params?.[0] || 5,
          longPeriod: ind.params?.[1] || 34,
          styles: {
            increasing: {color: '#26A69A'},
            decreasing: {color: '#EF5350'}
          }
        }];
      } else {
        // Initialize with default AO group
        console.log('🔄 Creating default AO group');
        aoGroups = [{
          id: generateUUID(),
          shortPeriod: 5,
          longPeriod: 34,
          styles: {
            increasing: {color: '#26A69A'},
            decreasing: {color: '#EF5350'}
          }
        }];
      }
    }
  }

  // Bollinger Bands initialization function
  function initializeBollingerBands() {
    if (!isBollingerBands) return;
    
    // Get saved Bollinger Bands configuration
    const savedKey = `${$ctx.editPaneId}_${$ctx.editIndName}`;
    const savedInd = $save.saveInds[savedKey];

    if (savedInd && savedInd.bollingerStyles) {
      // Load saved styles
      bollingerFillColor = savedInd.bollingerStyles.fillColor || '#2196F3';
      bollingerFillOpacity = savedInd.bollingerStyles.fillOpacity ?? 5; // Default 5%
      bollingerUpperColor = savedInd.bollingerStyles.upperColor || '#2196F3';
      bollingerMiddleColor = savedInd.bollingerStyles.middleColor || '#FF9800';
      bollingerLowerColor = savedInd.bollingerStyles.lowerColor || '#2196F3';
      bollingerThickness = savedInd.bollingerStyles.thickness || 1;
      bollingerLineStyle = savedInd.bollingerStyles.lineStyle || 'solid';
    } else {
      // Use default values
      bollingerFillColor = '#2196F3';
      bollingerFillOpacity = 5; // Default 5%
      bollingerUpperColor = '#2196F3';
      bollingerMiddleColor = '#FF9800';
      bollingerLowerColor = '#2196F3';
      bollingerThickness = 1;
      bollingerLineStyle = 'solid';
    }

    // Load saved parameters
    if (savedInd && savedInd.params && savedInd.params.length >= 2) {
      bollingerPeriod = savedInd.params[0] || 20;
      bollingerStdDev = savedInd.params[1] || 2;
    } else {
      // Use default parameters
      bollingerPeriod = 20;
      bollingerStdDev = 2;
    }
  }

  function addAoGroup() {
    if (!isAo) return;
    
    const colors = ['#26A69A', '#EF5350', '#8B5CF6', '#F59E0B', '#10B981', '#F97316', '#06B6D4', '#84CC16'];
    const colorIndex = aoGroups.length % colors.length;
    
    aoGroups.push({
      id: generateUUID(),
      shortPeriod: 5,
      longPeriod: 34,
      styles: {
        increasing: {color: colors[colorIndex]},
        decreasing: {color: colors[(colorIndex + 1) % colors.length]}
      }
    });
  }

  function removeAoGroup(groupId: string) {
    if (!isAo) return;
    
    // If removing the last group, don't allow it
    if (aoGroups.length <= 1) return;
    
    // Find the group to remove
    const groupToRemove = aoGroups.find(group => group.id === groupId);
    if (!groupToRemove) return;
    
    // Find the index of the group to remove
    const groupIndex = aoGroups.findIndex(group => group.id === groupId);
    
    // Remove from chart if it's not the first group (first group uses current edit pane)
    if (groupIndex > 0) {
      // For additional groups, we need to find the corresponding chart indicator
      // Since we can't directly identify which chart indicator corresponds to which group,
      // we'll need to remove all AO indicators and recreate them
      const allAoEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'AO');
      
      // Remove all AO indicators from chart
      allAoEntries.forEach(([key, ind]) => {
        if (ind.pane_id && ind.pane_id !== $ctx.editPaneId) {
          // Remove additional AO indicators (not the first one)
          $chart?.removeIndicator({ paneId: ind.pane_id, name: 'AO' });
        }
      });
      
      // Clean up saved data for additional groups
      save.update(s => {
        Object.keys(s.saveInds).forEach(key => {
          if (s.saveInds[key].name === 'AO' && s.saveInds[key].groupIndex > 0) {
            delete s.saveInds[key];
          }
        });
        return s;
      });
    }
    
    // Remove from groups array
    aoGroups = aoGroups.filter(group => group.id !== groupId);
  }



  // Initialize CR indicator with saved values
  function initializeCr() {
    const savedKey = `${$ctx.editPaneId}_CR`;
    const savedInd = $save.saveInds[savedKey];
    
    if (savedInd) {
      // Load saved values
      crPeriod = savedInd.crPeriod || 26;
      crMa1Period = savedInd.crMa1Period || 10;
      crMa2Period = savedInd.crMa2Period || 20;
      crMa3Period = savedInd.crMa3Period || 40;
      crMa4Period = savedInd.crMa4Period || 60;
      crColor = savedInd.crColor || '#FF6B35';
      crMa1Color = savedInd.crMa1Color || '#2196F3';
      crMa2Color = savedInd.crMa2Color || '#4CAF50';
      crMa3Color = savedInd.crMa3Color || '#FF9800';
      crMa4Color = savedInd.crMa4Color || '#9C27B0';
      crThickness = savedInd.crThickness || 2;
      crMa1Thickness = savedInd.crMa1Thickness || 1;
      crMa2Thickness = savedInd.crMa2Thickness || 1;
      crMa3Thickness = savedInd.crMa3Thickness || 1;
      crMa4Thickness = savedInd.crMa4Thickness || 1;
      crLineStyle = savedInd.crLineStyle || 'solid';
      crMa1LineStyle = savedInd.crMa1LineStyle || 'solid';
      crMa2LineStyle = savedInd.crMa2LineStyle || 'solid';
      crMa3LineStyle = savedInd.crMa3LineStyle || 'solid';
      crMa4LineStyle = savedInd.crMa4LineStyle || 'solid';
    }
  }

  // Color palette handlers for all indicators
  function showMacdColorPaletteHandler(event: MouseEvent) {
    // Center the color palette in the viewport
    macdColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showMacdColorPalette = true;
  }

  function showCciColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      cciColorPaletteIndex = index;
      cciColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showCciColorPalette = true;
    };
  }



  function showDmiColorPaletteHandler(groupIndex: number, lineType: string) {
    return (event: MouseEvent) => {
      dmiColorPaletteIndex = groupIndex;
      dmiColorPaletteType = lineType;
      dmiColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showDmiColorPalette = true;
    };
  }

  function showEmvColorPaletteHandler(event: MouseEvent) {
    // Center the color palette in the viewport
    emvColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showEmvColorPalette = true;
  }

  function showMtmColorPaletteHandler(groupIndex: number) {
    return (event: MouseEvent) => {
      // Store the group index for color change
      mtmColorPaletteIndex = groupIndex;
      // Center the color palette in the viewport
      mtmColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showMtmColorPalette = true;
    };
  }

  function showCrColorPaletteHandler(groupIndex: number, lineType: string) {
    return (event: MouseEvent) => {
      crColorPaletteIndex = groupIndex;
      crColorPaletteType = lineType;
      crColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showCrColorPalette = true;
    };
  }

  function showKdjColorPaletteHandler(event: MouseEvent) {
    // Center the color palette in the viewport
    kdjColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showKdjColorPalette = true;
  }

  function showKdjGroupColorPaletteHandler(groupIndex: number, lineIndex: number) {
    return (event: MouseEvent) => {
      // Calculate index: groupIndex * 3 + lineIndex (0=K, 1=D, 2=J)
      kdjGroupColorPaletteIndex = groupIndex * 3 + lineIndex;
      kdjGroupColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showKdjGroupColorPalette = true;
    };
  }

  function showTrixColorPaletteHandler(event: MouseEvent) {
    // Center the color palette in the viewport
    trixColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showTrixColorPalette = true;
  }

  function showVolColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      volColorPaletteIndex = index;
      volColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showVolColorPalette = true;
    };
  }

  // Volume Groups color palette handler (VR-style implementation)
  function showVolGroupColorPaletteHandler(groupIndex: number, type: 'histogram' | 'histogram-down' | 'ema') {
    return (event: MouseEvent) => {
      volColorPaletteIndex = groupIndex;
      volColorPaletteType = type;
      volColorPalettePosition = { x: event.clientX, y: event.clientY };
      showVolColorPalette = true;
    };
  }

  // Additional color palette handlers for other indicators
  function showWrColorPaletteHandler(groupIndex: number) {
    return (event: MouseEvent) => {
      wrColorPaletteGroupIndex = groupIndex;
      if (event.currentTarget && event.currentTarget instanceof Element) {
        const rect = event.currentTarget.getBoundingClientRect();
        wrColorPalettePosition = { 
          x: rect.left + rect.width / 2, 
          y: rect.bottom + 5 
        };
      } else {
        wrColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      }
      showWrColorPalette = true;
    };
  }

  // WR level color palette handlers
  function showWrOverboughtColorPaletteHandler(groupIndex: number) {
    return (event: MouseEvent) => {
      wrColorPaletteGroupIndex = groupIndex;
      if (event.currentTarget && event.currentTarget instanceof Element) {
        const rect = event.currentTarget.getBoundingClientRect();
        wrOverboughtColorPalettePosition = { 
          x: rect.left + rect.width / 2, 
          y: rect.bottom + 5 
        };
      } else {
        wrOverboughtColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      }
      showWrOverboughtColorPalette = true;
    };
  }

  function showWrOversoldColorPaletteHandler(groupIndex: number) {
    return (event: MouseEvent) => {
      wrColorPaletteGroupIndex = groupIndex;
      if (event.currentTarget && event.currentTarget instanceof Element) {
        const rect = event.currentTarget.getBoundingClientRect();
        wrOversoldColorPalettePosition = { 
          x: rect.left + rect.width / 2, 
          y: rect.bottom + 5 
        };
      } else {
        wrOversoldColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      }
      showWrOversoldColorPalette = true;
    };
  }

  function showWrMiddleLineColorPaletteHandler(groupIndex: number) {
    return (event: MouseEvent) => {
      wrColorPaletteGroupIndex = groupIndex;
      if (event.currentTarget && event.currentTarget instanceof Element) {
        const rect = event.currentTarget.getBoundingClientRect();
        wrMiddleLineColorPalettePosition = { 
          x: rect.left + rect.width / 2, 
          y: rect.bottom + 5 
        };
      } else {
        wrMiddleLineColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      }
      showWrMiddleLineColorPalette = true;
    };
  }

  function showVrColorPaletteHandler(groupIndex: number, lineType: 'vr' | 'vrShort' | 'vrLong') {
    return (event: MouseEvent) => {
      vrColorPaletteGroupIndex = groupIndex;
      vrColorPaletteLineType = lineType;
      vrColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showVrColorPalette = true;
    };
  }

  function showRocColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      rocColorPaletteIndex = index;
      rocColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showRocColorPalette = true;
    };
  }

  function showPsyColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      psyColorPaletteIndex = index;
      psyColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showPsyColorPalette = true;
    };
  }

  function showObvColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      obvColorPaletteIndex = index;
      obvColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showObvColorPalette = true;
    };
  }

  function showZigzagColorPaletteHandler(event: MouseEvent) {
    zigzagColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showZigzagColorPalette = true;
  }

  function showPvtColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      pvtColorPaletteIndex = index;
      pvtColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showPvtColorPalette = true;
    };
  }

  function showSarColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      sarColorPaletteIndex = index;
      sarColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showSarColorPalette = true;
    };
  }

  function showCustomMomentumColorPaletteHandler(event: MouseEvent) {
    customMomentumColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showCustomMomentumColorPalette = true;
  }

  function showCustomAoColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      aoColorPaletteIndex = index;
      customAoColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showCustomAoColorPalette = true;
    };
  }

  // Specific line color palette handlers for multi-line indicators
  function showMacdLineColorPaletteHandler(event: MouseEvent) {
    macdLineColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showMacdLineColorPalette = true;
  }

  function showMacdSignalColorPaletteHandler(event: MouseEvent) {
    macdSignalColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showMacdSignalColorPalette = true;
  }

  function showMacdHistColorPaletteHandler(event: MouseEvent) {
    macdHistColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showMacdHistColorPalette = true;
  }



  function showVolIncreasingColorPaletteHandler(event: MouseEvent) {
    volIncreasingColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showVolIncreasingColorPalette = true;
  }

  function showVolDecreasingColorPaletteHandler(event: MouseEvent) {
    volDecreasingColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showVolDecreasingColorPalette = true;
  }

  // BIAS color palette handler
  function showBiasColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      biasColorPaletteIndex = index;
      biasColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showBiasColorPalette = true;
    };
  }

  function showBiasLine3ColorPaletteHandler(event: MouseEvent) {
    biasLine3ColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showBiasLine3ColorPalette = true;
  }

  // Bollinger Bands color palette handlers
  function showBollingerFillColorPaletteHandler(event: MouseEvent) {
    bollingerFillColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showBollingerFillColorPalette = true;
  }

  function showBollingerUpperColorPaletteHandler(event: MouseEvent) {
    bollingerUpperColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showBollingerUpperColorPalette = true;
  }

  function showBollingerMiddleColorPaletteHandler(event: MouseEvent) {
    bollingerMiddleColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showBollingerMiddleColorPalette = true;
  }

  function showBollingerLowerColorPaletteHandler(event: MouseEvent) {
    bollingerLowerColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    showBollingerLowerColorPalette = true;
  }

  // EMA and SMA color palette handlers
  function showEmaColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      emaColorPaletteIndex = index;
      emaColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showEmaColorPalette = true;
    };
  }

  function showSmaColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      smaColorPaletteIndex = index;
      smaColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showSmaColorPalette = true;
    };
  }

  function showIchimokuColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      ichimokuColorPaletteIndex = index;
      ichimokuColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showIchimokuColorPalette = true;
    };
  }

  // MA color palette handler
  function showMaColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      maColorPaletteIndex = index;
      maColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showMaColorPalette = true;
    };
  }

  // BBI color palette handler
  function showBbiColorPaletteHandler(index: number) {
    return (event: MouseEvent) => {
      bbiColorPaletteIndex = index;
      bbiColorPalettePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      showBbiColorPalette = true;
    };
  }

  // 当编辑的指标改变时，更新参数
  const showEdit = derived(ctx, ($ctx) => $ctx.modalIndCfg)
  showEdit.subscribe(() => {
    if (!$ctx.editIndName) return;
    
    // Initialize MACD groups if this is MACD indicator
    if (isMacd) {
      initializeMacdGroups();
      return; // Skip normal parameter handling for MACD
    }
    
    // Initialize PVT groups if this is PVT indicator
    if (isPvt) {
      initializePvtGroups();
      return; // Skip normal parameter handling for PVT
    }
    
    // Initialize EMV groups if this is EMV indicator
    if (isEmv) {
      initializeEmvGroups();
      return; // Skip normal parameter handling for EMV
    }
    
    // Initialize MTM groups if this is MTM indicator
    if (isMtm) {
      initializeMtmGroups();
      return; // Skip normal parameter handling for MTM
    }
    
    // Initialize Williams %R groups if this is Williams %R indicator
    if (isWr) {
      initializeWrGroups();
      return; // Skip normal parameter handling for Williams %R
    }
    
    // Initialize VR groups if this is VR indicator
    if (isVr) {
      initializeVrGroups();
      return; // Skip normal parameter handling for VR
    }
    
    // Initialize BBI groups if this is BBI indicator
    if (isBbi) {
      initializeBbiGroups();
      return; // Skip normal parameter handling for BBI
    }
    
    // Initialize TRIX groups if this is TRIX indicator
    if (isTrix) {
      initializeTrixGroups();
      return; // Skip normal parameter handling for TRIX
    }
    
    // Initialize BIAS groups if this is BIAS indicator
    if (isBias) {
      initializeBiasGroups();
      return; // Skip normal parameter handling for BIAS
    }

    // Initialize CCI groups if this is CCI indicator
    if (isCci) {
      initializeCciGroups();
      return; // Skip normal parameter handling for CCI
    }

    // Initialize SAR groups if this is SAR indicator
    if (isSar) {
      initializeSarGroups();
      return; // Skip normal parameter handling for SAR
    }
    
    // Initialize DMI groups if this is DMI indicator
    if (isDmi) {
      initializeDmiGroups();
      return; // Skip normal parameter handling for DMI
    }
    
    // Initialize CR groups if this is CR indicator
    if (isCr) {
      initializeCrGroups();
      return; // Skip normal parameter handling for CR
    }
    
    // Initialize ROC groups if this is ROC indicator
    if (isRoc) {
      initializeRocGroups();
      return; // Skip normal parameter handling for ROC
    }
    
    // Initialize PSY groups if this is PSY indicator
    if (isPsy) {
      initializePsyGroups();
      return; // Skip normal parameter handling for PSY
    }
    
    // Initialize OBV groups if this is OBV indicator
    if (isObv) {
      initializeObvGroups();
      return; // Skip normal parameter handling for OBV
    }
    
    // Initialize KDJ groups if this is KDJ indicator
    if (isKdj) {
      initializeKdjGroups();
      return; // Skip normal parameter handling for KDJ
    }
    
    // Initialize AO groups if this is AO indicator
    if (isAo) {
      initializeAoGroups();
      return; // Skip normal parameter handling for AO
    }
    
    // Initialize CR if this is CR indicator
    if (isCr) {
      initializeCr();
      return; // Skip normal parameter handling for CR
    }
    
    // Initialize Bollinger Bands if this is BOLL indicator
    if (isBollingerBands) {
      initializeBollingerBands();
      return; // Skip normal parameter handling for Bollinger Bands
    }
    
    // Get saved indicator configuration from save store
    const savedKey = `${$ctx.editPaneId}_${$ctx.editIndName}`;
    const savedInd = $save.saveInds[savedKey];
    
    if (savedInd && savedInd.fields && !isBollingerBands) {
       // Use saved fields configuration (only for non-Bollinger Bands indicators)
       fields.splice(0, fields.length, ...savedInd.fields);
       params.splice(0, params.length, ...savedInd.params || []);
       styles.splice(0, styles.length, ...(savedInd.styles || []));
     } else {
       // Use default fields from IndFieldsMap
       const defaultFields = IndFieldsMap[$ctx.editIndName] || [];
       
       // For Bollinger Bands, always use exactly the default 2 parameters
       if (isBollingerBands) {
         fields.splice(0, fields.length, ...defaultFields);
         // Always use default parameters for Bollinger Bands to ensure consistency
         const defaultParams = defaultFields.map(f => f.default);
         params.splice(0, params.length, ...defaultParams);
         // If there are saved params, use them but ensure we only have 2
         if (savedInd && savedInd.params && savedInd.params.length >= 2) {
           params[0] = savedInd.params[0]; // Period
           params[1] = savedInd.params[1]; // StdDev
         }
      } else {
        // Normal behavior for other indicators
        fields.splice(0, fields.length, ...defaultFields);
        if (savedInd && savedInd.params) {
          params.splice(0, params.length, ...savedInd.params);
          styles.splice(0, styles.length, ...(savedInd.styles || []));
        } else {
          // Use default parameters - exclude only pure color type parameters
          const defaultParams = defaultFields
            .filter((f: any) => f.type !== 'color')
            .map((f: any) => f.default);
          params.splice(0, params.length, ...defaultParams);
        }
      }
    }
     
     // Ensure styles array matches params length
     if (isTrix) {
       // For TRIX, we need two style objects - one for Period line and one for Signal line
       while (styles.length < 2) {
         if (styles.length === 0) {
           // Period line style (blue)
           styles.push({color: '#2563eb', thickness: 1, lineStyle: 'solid'});
         } else {
           // Signal line style (red)
           styles.push({color: '#dc2626', thickness: 1, lineStyle: 'solid'});
         }
       }
       while (styles.length > 2) {
         styles.pop();
       }
     } else {
       while (styles.length < params.length) {
         styles.push({color: '#2563eb', thickness: 1, lineStyle: 'solid'});
       }
       while (styles.length > params.length) {
         styles.pop();
       }
     }
  });

  // Listen for clear CCI groups signal
  const clearCciSignal = derived(ctx, ($ctx) => $ctx.clearCciGroups);
  clearCciSignal.subscribe((signal) => {
    if (signal > 0) {
      clearCciGroups();
    }
  });

  // Listen for clear EMV groups signal
  const clearEmvSignal = derived(ctx, ($ctx) => $ctx.clearEmvGroups);
  clearEmvSignal.subscribe((signal) => {
    if (signal > 0) {
      clearEmvGroups();
    }
  });

  // Listen for clear MTM groups signal
  const clearMtmSignal = derived(ctx, ($ctx) => $ctx.clearMtmGroups);
  clearMtmSignal.subscribe((signal) => {
    if (signal > 0) {
      clearMtmGroups();
    }
  });

  // Listen for clear OBV groups signal
  const clearObvSignal = derived(ctx, ($ctx) => $ctx.clearObvGroups);
  clearObvSignal.subscribe((signal) => {
    if (signal > 0) {
      clearObvGroups();
    }
  });

  // Listen for clear PSY groups signal
  const clearPsySignal = derived(ctx, ($ctx) => $ctx.clearPsyGroups);
  clearPsySignal.subscribe((signal) => {
    if (signal > 0) {
      clearPsyGroups();
    }
  });

  // Listen for clear PVT groups signal
  const clearPvtSignal = derived(ctx, ($ctx) => $ctx.clearPvtGroups);
  clearPvtSignal.subscribe((signal) => {
    if (signal > 0) {
      clearPvtGroups();
    }
  });

  // Listen for clear ROC groups signal
  const clearRocSignal = derived(ctx, ($ctx) => $ctx.clearRocGroups);
  clearRocSignal.subscribe((signal) => {
    if (signal > 0) {
      clearRocGroups();
    }
  });

  // Listen for clear VOL groups signal
  const clearVolSignal = derived(ctx, ($ctx) => $ctx.clearVolGroups);
  clearVolSignal.subscribe((signal) => {
    if (signal > 0) {
      clearVolGroups();
    }
  });

  // Listen for clear WR groups signal
  const clearWrSignal = derived(ctx, ($ctx) => $ctx.clearWrGroups);
  clearWrSignal.subscribe((signal) => {
    if (signal > 0) {
      clearWrGroups();
    }
  });

  function deleteParam(index: number) {
    // Prevent deletion for Bollinger Bands
    if (isBollingerBands) return;
    
    if (params.length <= 1) return; // Keep at least one parameter
    params.splice(index, 1);
    fields.splice(index, 1);
    styles.splice(index, 1);
  }

  function addParam() {
    // Prevent adding parameters for Bollinger Bands
    if (isBollingerBands) return;
    
    // For BIAS, create a new indicator in a separate panel instead of adding parameters
    if (isBias) {
      createNewBiasIndicator();
      return;
    }
    
    // For AO, create a new indicator in a separate panel instead of adding parameters
    if (isAo) {
      createNewAoIndicator();
      return;
    }
    
    // For WR, create a new indicator in a separate panel instead of adding parameters
    if (isWr) {
      createNewWrIndicator();
      return;
    }
    
    // For TRIX, create a new indicator in a separate panel instead of adding parameters
    if (isTrix) {
      createNewTrixIndicator();
      return;
    }
    
    if (fields.length >= 10) return; // Limit to 10 parameters
    const lastField = fields[fields.length - 1];
    const newField = { ...lastField, title: `${lastField.title.replace(/\d+$/, '')}${fields.length + 1}` };
    fields.push(newField);
    params.push((newField as any).default || 0);
    styles.push({color: '#2563eb', thickness: 1, lineStyle: 'solid'});
  }

  function createNewBiasIndicator() {
    const chartObj = $chart;
    if (!chartObj) return;
    
    // Create a new BIAS indicator with default parameters
    const calcParams = [6]; // Default period for BIAS
    
    const ind_id = chartObj.createIndicator({
      name: 'BIAS', 
      calcParams,
      // @ts-expect-error
      createTooltipDataSource: ({ indicator }) => {
        const icon_ids = [indicator.visible ? 1: 0, 2, 3];
        const styles = chartObj.getStyles().indicator.tooltip;
        const icons = icon_ids.map(i => styles.features[i])
        return { icons }
      }
    }, false, { axis: { gap: { bottom: 2 } } })
    
    if(!ind_id) return;
    
    // Use the indicator ID as pane ID (this is how KlineCharts works)
    const pane_id = ind_id;
    
    const ind = {name: 'BIAS', pane_id, params: calcParams}
    const saveKey = `${pane_id}_BIAS`
    
    save.update(s => {
      s.saveInds[saveKey] = ind;
      return s
    })
    
    // Close the modal after creating the new indicator
    show = false;
  }

  function createNewAoIndicator() {
    const chartObj = $chart;
    if (!chartObj) return;
    
    // Create a new AO indicator with default parameters
    const calcParams = [5, 34]; // Default Short SMA and Long SMA for AO
    
    const ind_id = chartObj.createIndicator({
      name: 'AO', 
      calcParams,
      // @ts-expect-error
      createTooltipDataSource: ({ indicator }) => {
        const icon_ids = [indicator.visible ? 1: 0, 2, 3];
        const styles = chartObj.getStyles().indicator.tooltip;
        const icons = icon_ids.map(i => styles.features[i])
        return { icons }
      }
    }, false, { axis: { gap: { bottom: 2 } } })
    
    // Update AO indicator styles after creation to ensure both positive and negative show as filled bars
    if (ind_id) {
      // Get current styles and update indicator styles
      const currentStyles = chartObj.getStyles();
      chartObj.setStyles({
        ...currentStyles,
        indicator: {
          ...currentStyles.indicator,
          bars: [
            {
              upColor: '#8B5CF6', // Purple fill for positive values
              downColor: '#EF4444', // Red fill for negative values
              noChangeColor: '#8B5CF6' // Purple fill for zero values
            }
          ]
        }
      });
    }
    
    if(!ind_id) return;
    
    // Use the indicator ID as pane ID (this is how KlineCharts works)
    const pane_id = ind_id;
    
    const ind = {name: 'AO', pane_id, params: calcParams}
    const saveKey = `${pane_id}_AO`
    
    save.update(s => {
      s.saveInds[saveKey] = ind;
      return s
    })
    
    // Close the modal after creating the new indicator
    show = false;
  }

  function createNewWrIndicator() {
    const chartObj = $chart;
    if (!chartObj) return;
    
    // Create a new WR indicator with default parameters
    const calcParams = [14]; // Default period for WR
    
    const ind_id = chartObj.createIndicator({
      name: 'WR', 
      calcParams,
      // @ts-expect-error
      createTooltipDataSource: ({ indicator }) => {
        const icon_ids = [indicator.visible ? 1: 0, 2, 3];
        const styles = chartObj.getStyles().indicator.tooltip;
        const icons = icon_ids.map(i => styles.features[i])
        return { icons }
      }
    }, false, { axis: { gap: { bottom: 2 } } })
    
    if(!ind_id) return;
    
    // Use the indicator ID as pane ID (this is how KlineCharts works)
    const pane_id = ind_id;
    
    const ind = {name: 'WR', pane_id, params: calcParams}
    const saveKey = `${pane_id}_WR`
    
    save.update(s => {
      s.saveInds[saveKey] = ind;
      return s
    })
    
    // Close the modal after creating the new indicator
    show = false;
  }

  function createNewTrixIndicator() {
    const chartObj = $chart;
    if (!chartObj) return;
    
    // Create a new TRIX indicator with default parameters
    const calcParams = [15, 9]; // Default Period and Signal for TRIX
    
    const ind_id = chartObj.createIndicator({
      name: 'TRIX', 
      calcParams,
      // @ts-expect-error
      createTooltipDataSource: ({ indicator }) => {
        const icon_ids = [indicator.visible ? 1: 0, 2, 3];
        const styles = chartObj.getStyles().indicator.tooltip;
        const icons = icon_ids.map(i => styles.features[i])
        return { icons }
      }
    }, false, { axis: { gap: { bottom: 2 } } })
    
    if(!ind_id) return;
    
    // Use the indicator ID as pane ID (this is how KlineCharts works)
    const pane_id = ind_id;
    
    const ind = {name: 'TRIX', pane_id, params: calcParams}
    const saveKey = `${pane_id}_TRIX`
    
    save.update(s => {
      s.saveInds[saveKey] = ind;
      return s
    })
    
    // Close the modal after creating the new indicator
    show = false;
  }

  function handleCrConfirm() {
    if (!isCr) return;

    // Get existing CR indicators to determine which ones already exist
    const existingCrKeys = Object.keys($save.saveInds).filter(key =>
      $save.saveInds[key].name === 'CR'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_CR first, then pane_CR_2_CR, etc.
      if (a === `${$ctx.editPaneId}_CR`) return -1;
      if (b === `${$ctx.editPaneId}_CR`) return 1;
      return a.localeCompare(b);
    });

    console.log('🔧 Applying CR changes. Existing keys:', existingCrKeys);
    console.log('🔧 Current CR groups:', crGroups.length);

    // Remove excess indicators if we have fewer groups now
    const currentGroupCount = crGroups.length;
    if (existingCrKeys.length > currentGroupCount) {
      for (let i = currentGroupCount; i < existingCrKeys.length; i++) {
        const key = existingCrKeys[i];
        const savedData = $save.saveInds[key];
        
        try {
          console.log('🗑️ Removing excess CR indicator from pane:', savedData.pane_id);
          $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'CR' });
        } catch (error) {
          console.log('❌ Error removing excess CR indicator:', error);
        }
        
        delete $save.saveInds[key];
      }
    }

    // Apply each CR group as a separate indicator
    crGroups.forEach((group, index) => {
      const calcParams = [group.crPeriod, group.crMa1Period, group.crMa2Period, group.crMa3Period, group.crMa4Period];
      const indicatorStyles = {
        lines: [
          {
            color: group.styles.cr.color,
            size: group.styles.cr.thickness,
            style: group.styles.cr.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: group.styles.cr.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          },
          {
            color: group.styles.ma1.color,
            size: group.styles.ma1.thickness,
            style: group.styles.ma1.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: group.styles.ma1.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          },
          {
            color: group.styles.ma2.color,
            size: group.styles.ma2.thickness,
            style: group.styles.ma2.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: group.styles.ma2.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          },
          {
            color: group.styles.ma3.color,
            size: group.styles.ma3.thickness,
            style: group.styles.ma3.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: group.styles.ma3.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          },
          {
            color: group.styles.ma4.color,
            size: group.styles.ma4.thickness,
            style: group.styles.ma4.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: group.styles.ma4.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          }
        ]
      };

      // For the first CR group, always update the current edit pane
      if (index === 0) {
        console.log('🔄 Updating first CR in pane:', $ctx.editPaneId);
        $chart?.overrideIndicator({
          name: 'CR',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: $ctx.editPaneId
        });
      } else {
        // For additional groups, check if they already exist or create new ones
        const expectedSaveKey = `pane_CR_${index + 1}_CR`;
        const existingGroup = existingCrKeys.find(key => key === expectedSaveKey);
        
        if (existingGroup) {
          // Update existing CR in its pane
          const existingData = $save.saveInds[existingGroup];
          console.log('🔄 Updating existing CR in pane:', existingData.pane_id);
          $chart?.overrideIndicator({
            name: 'CR',
            calcParams: calcParams,
            styles: indicatorStyles,
            paneId: existingData.pane_id
          });
        } else {
          // Create new CR in new pane
          const newPaneId = `pane_CR_${index + 1}`;
          console.log('🆕 Creating new CR in pane:', newPaneId);
          const newIndicatorId = $chart?.createIndicator({
            name: 'CR',
            calcParams: calcParams,
            styles: indicatorStyles
          }, true, { id: newPaneId });
          
          console.log('✅ Created new CR indicator with ID:', newIndicatorId, 'in pane:', newPaneId);
        }
      }
    });

    // Save CR groups configuration
    save.update(s => {
      // Clear existing CR data first
      Object.keys(s.saveInds).forEach(key => {
        if (s.saveInds[key].name === 'CR') {
          delete s.saveInds[key];
        }
      });

      // Save each CR group separately
      crGroups.forEach((group, index) => {
        const saveKey = index === 0 ? `${$ctx.editPaneId}_CR` : `pane_CR_${index + 1}_CR`;
        const paneId = index === 0 ? $ctx.editPaneId : `pane_CR_${index + 1}`;
        const saveData: any = {
          name: 'CR',
          crGroup: group,
          pane_id: paneId,
          groupIndex: index,
          crGroups: index === 0 ? [...crGroups] : undefined,
          params: [group.crPeriod, group.crMa1Period, group.crMa2Period, group.crMa3Period, group.crMa4Period]
        };
        
        s.saveInds[saveKey] = saveData;
        console.log('💾 Saved CR group', index, 'with key:', saveKey, 'and pane ID:', paneId);
      });

      return s;
    });

    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });

    show = false;
  }

  function handleMacdConfirm() {
    // Apply each MACD group as a separate indicator in different panes
    macdGroups.forEach((group, index) => {
      const indicatorName = index === 0 ? 'MACD' : `MACD_${index + 1}`;
      const calcParams = [group.fastPeriod, group.slowPeriod, group.signalPeriod];
      
      // Create indicator styles for MACD, Signal, and Histogram lines
      const indicatorStyles: any = {
        lines: [
          {
            color: group.styles.macd.color,
            size: group.styles.macd.thickness,
            style: group.styles.macd.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: group.styles.macd.lineStyle === 'dashed' ? [4, 4] : [2, 2]
          },
          {
            color: group.styles.signal.color,
            size: group.styles.signal.thickness,
            style: group.styles.signal.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: group.styles.signal.lineStyle === 'dashed' ? [4, 4] : [2, 2]
          },
          {
            color: group.styles.histogram.color,
            size: group.styles.histogram.thickness,
            style: group.styles.histogram.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: group.styles.histogram.lineStyle === 'dashed' ? [4, 4] : [2, 2]
          }
        ]
      };

      // For the first MACD group, use the current edit pane
      // For additional groups, create new panes
      if (index === 0) {
        $chart?.overrideIndicator({
          name: 'MACD',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: $ctx.editPaneId
        });
      } else {
        // Create new pane for additional MACD instances
        $chart?.createIndicator({
          name: 'MACD',
          calcParams: calcParams,
          styles: indicatorStyles
        }, false, { axis: { gap: { bottom: 2 } } }); // Create in new pane
      }
    });

    // Save MACD groups configuration
    save.update(s => {
      // Save each MACD group separately
      macdGroups.forEach((group, index) => {
        const saveKey = index === 0 ? `${$ctx.editPaneId}_MACD` : `MACD_${index + 1}`;
        const saveData: any = {
          name: 'MACD',
          macdGroup: group,
          pane_id: index === 0 ? $ctx.editPaneId : `new_pane_${index}`,
          groupIndex: index
        };
        
        s.saveInds[saveKey] = saveData;
      });
      return s;
    });
    
    // Clear edit state
    console.log('🔄 Clearing edit state and closing popup...');
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      console.log('✅ Context updated - modalIndCfg set to false');
      return c;
    });
    
    show = false;
  }

  function handleWrConfirm() {
    if (!isWr) return;
    
    // Apply changes to existing Williams %R groups only
    wrGroups.forEach((group, index) => {
      // Only update if group has a valid paneId and exists in chart
      if (group.paneId) {
        updateWrIndicator(index);
      }
    });

    // Save Williams %R groups configuration
    save.update(s => {
      // Save all WR groups together for easier loading
      const mainSaveKey = `${$ctx.editPaneId}_WR`;
      const mainSaveData: any = {
        name: 'WR',
        wrGroups: wrGroups,
        pane_id: $ctx.editPaneId
      };
      s.saveInds[mainSaveKey] = mainSaveData;
      
      // Also save each Williams %R group separately for backward compatibility
      wrGroups.forEach((group, index) => {
        const saveKey = index === 0 ? `${$ctx.editPaneId}_WR_single` : `WR_${index + 1}`;
        const saveData: any = {
          name: 'WR',
          wrGroup: group,
          pane_id: index === 0 ? $ctx.editPaneId : `new_pane_${index}`,
          groupIndex: index
        };
        
        s.saveInds[saveKey] = saveData;
      });
      return s;
    });
    
    try {
      // Clear edit state
      console.log('🔄 Clearing edit state and closing popup...');
      ctx.update(c => {
        c.editIndName = '';
        c.editPaneId = '';
        c.modalIndCfg = false;
        console.log('✅ Context updated - modalIndCfg set to false');
        return c;
      });
      
      show = false;
      console.log('✅ Popup show flag set to false - handleKdjConfirm completed successfully');
    } catch (error) {
      console.error('❌ Error in handleKdjConfirm:', error);
      // Even if there's an error, we should still close the popup
      console.log('🔄 Forcing popup close due to error...');
      ctx.update(c => {
        c.editIndName = '';
        c.editPaneId = '';
        c.modalIndCfg = false;
        return c;
      });
      show = false;
      console.log('✅ Popup forcefully closed after error');
    }
  }

  function handleVrConfirm() {
    if (!isVr) return;
    
    // Apply each VR group's changes to their respective indicators (like RSI does)
    vrGroups.forEach((group, index) => {
      const calcParams = [group.period, group.shortPeriod, group.longPeriod];
      const indicatorStyles = {
        lines: [
          {
            color: group.styles.vr.color,
            size: group.styles.vr.thickness,
            style: group.styles.vr.lineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
            dashedValue: group.styles.vr.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          },
          {
            color: group.styles.vrShort.color,
            size: group.styles.vrShort.thickness,
            style: group.styles.vrShort.lineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
            dashedValue: group.styles.vrShort.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          },
          {
            color: group.styles.vrLong.color,
            size: group.styles.vrLong.thickness,
            style: group.styles.vrLong.lineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
            dashedValue: group.styles.vrLong.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          }
        ]
      };

      // Update the existing VR indicator in its pane
      if (group.paneId) {
        $chart?.overrideIndicator({
          name: 'VR',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: group.paneId
        });
        
        console.log(`✅ Updated VR indicator in pane: ${group.paneId}`);
      }
    });

    // Save VR groups configuration
    save.update(s => {
      // Save each VR group separately with their proper pane IDs
      vrGroups.forEach((group, index) => {
        const saveKey = `${group.paneId}_VR`;
        const saveData: any = {
          name: 'VR',
          vrGroup: group,
          pane_id: group.paneId,
          params: [group.period, group.shortPeriod, group.longPeriod],
          groupIndex: index
        };
        
        s.saveInds[saveKey] = saveData;
        console.log(`💾 Saved VR group to: ${saveKey}`);
      });
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
  }

  function handleVolConfirm() {
    if (!isVol) return;
    
    // Apply each Volume group's changes to their respective indicators
    volGroups.forEach((group, index) => {
      const calcParams = [group.period];
      const indicatorStyles = {
        bars: [
          {
            upColor: group.styles.histogram.upColor,
            downColor: group.styles.histogram.downColor,
            noChangeColor: group.styles.histogram.upColor
          }
        ],
        lines: [
          {
            color: group.styles.ema.color,
            size: group.styles.ema.thickness,
            style: group.styles.ema.lineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
            dashedValue: group.styles.ema.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          }
        ]
      };

      // Update the existing Volume indicator in its pane
      if (group.paneId) {
        $chart?.overrideIndicator({
          name: 'VOL',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: group.paneId
        });
        
        console.log(`✅ Updated Volume indicator in pane: ${group.paneId}`);
      }
    });

    // Save Volume groups configuration
    save.update(s => {
      // Save each Volume group separately with their proper pane IDs
      volGroups.forEach((group, index) => {
        const saveKey = `${group.paneId}_VOL`;
        const saveData: any = {
          name: 'VOL',
          volGroup: group,
          pane_id: group.paneId,
          params: [group.period],
          groupIndex: index
        };
        
        s.saveInds[saveKey] = saveData;
        console.log(`💾 Saved Volume group to: ${saveKey}`);
      });
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
  }

  function handleBbiConfirm() {
    if (!isBbi) return;
    
    // Get existing BBI indicators to determine which ones already exist
    const existingBbiKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'BBI'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_BBI first, then pane_BBI_2_BBI, etc.
      if (a === `${$ctx.editPaneId}_BBI`) return -1;
      if (b === `${$ctx.editPaneId}_BBI`) return 1;
      return a.localeCompare(b);
    });
    
    console.log('🔧 Applying BBI changes. Existing keys:', existingBbiKeys);
    console.log('🔧 Current BBI groups:', bbiGroups.length);
    
    // Remove indicators that are no longer needed (if we have fewer groups now)
    const currentGroupCount = bbiGroups.length;
    if (existingBbiKeys.length > currentGroupCount) {
      for (let i = currentGroupCount; i < existingBbiKeys.length; i++) {
        const key = existingBbiKeys[i];
        const savedData = $save.saveInds[key];
        if (savedData && savedData.pane_id) {
          try {
            console.log('🗑️ Removing excess BBI indicator from pane:', savedData.pane_id);
            $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'BBI' });
          } catch (error) {
            console.log('❌ Error removing excess BBI indicator:', error);
          }
        }
      }
    }
    
    // Apply each BBI group as a separate indicator
    bbiGroups.forEach((group, index) => {
      const calcParams = [group.period1, group.period2, group.period3, group.period4];
      const indicatorStyles = {
        lines: [{
          color: group.color,
          size: group.thickness,
          style: group.lineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
          dashedValue: group.lineStyle === 'dashed' ? [4, 4] : 
                      group.lineStyle === 'dotted' ? [2, 6] : [2, 2],
          smooth: false
        }]
      };

      // For the first BBI group, always update the current edit pane
      if (index === 0) {
        console.log('🔄 Updating first BBI in pane:', $ctx.editPaneId);
        $chart?.overrideIndicator({
          name: 'BBI',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: $ctx.editPaneId
        });
      } else {
        // For additional groups, check if they already exist using the correct key pattern
        const expectedSaveKey = `pane_BBI_${index + 1}_BBI`;
        const existingGroup = existingBbiKeys.find(key => key === expectedSaveKey);
        
        if (existingGroup) {
          // Update existing indicator
          const existingData = $save.saveInds[existingGroup];
          if (existingData && existingData.pane_id) {
            console.log('🔄 Updating existing BBI in pane:', existingData.pane_id);
            $chart?.overrideIndicator({
              name: 'BBI',
              calcParams: calcParams,
              styles: indicatorStyles,
              paneId: existingData.pane_id
            });
          }
        } else {
          // Create new pane with controlled pane ID for truly new groups
          const newPaneId = `pane_BBI_${index + 1}`;
          console.log('🆕 Creating new BBI in pane:', newPaneId);
          const newIndicatorId = $chart?.createIndicator({
            name: 'BBI',
            calcParams: calcParams,
            styles: indicatorStyles
          }, true, { id: newPaneId }); // Use controlled pane ID
          
          // Store the actual pane ID that was created
          if (newIndicatorId) {
            console.log('✅ Created new BBI indicator with ID:', newIndicatorId, 'in pane:', newPaneId);
          }
        }
      }
    });

    // Save BBI groups configuration
    save.update(s => {
      // Clear existing BBI data first
      Object.keys(s.saveInds).forEach(key => {
        if (s.saveInds[key].name === 'BBI') {
          delete s.saveInds[key];
        }
      });
      
      // Save each BBI group separately
      bbiGroups.forEach((group, index) => {
        const saveKey = index === 0 ? `${$ctx.editPaneId}_BBI` : `pane_BBI_${index + 1}_BBI`;
        const paneId = index === 0 ? $ctx.editPaneId : `pane_BBI_${index + 1}`;
        const saveData: any = {
          name: 'BBI',
          bbiGroup: group,
          pane_id: paneId,
          groupIndex: index,
          bbiGroups: index === 0 ? [...bbiGroups] : undefined,
          params: [group.period1, group.period2, group.period3, group.period4]
        };
        
        s.saveInds[saveKey] = saveData;
        console.log('💾 Saved BBI group', index, 'with key:', saveKey, 'and pane ID:', paneId);
      });
      
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
  }

  function handleEmvConfirm() {
    if (!isEmv) {
      console.warn('⚠️ handleEmvConfirm called but not in EMV mode');
      return;
    }
    
    try {
      // Validate EMV groups before processing
      if (!emvGroups || emvGroups.length === 0) {
        console.error('❌ No EMV groups to process');
        return;
      }
      
      // Validate each group
      const validGroups = emvGroups.filter(group => {
        if (!group || typeof group !== 'object') return false;
        if (typeof group.period !== 'number' || group.period <= 0) return false;
        if (typeof group.period2 !== 'number' || group.period2 <= 0) return false;
        if (typeof group.color !== 'string' || !group.color) return false;
        if (typeof group.thickness !== 'number' || group.thickness <= 0) return false;
        if (typeof group.lineStyle !== 'string' || !group.lineStyle) return false;
        return true;
      });
      
      if (validGroups.length === 0) {
        console.error('❌ No valid EMV groups found');
        return;
      }
      
      if (validGroups.length !== emvGroups.length) {
        console.warn(`⚠️ ${emvGroups.length - validGroups.length} invalid EMV groups filtered out`);
        emvGroups = validGroups;
      }
      
      // Get existing EMV indicators to determine which ones already exist
      const existingEmvKeys = Object.keys($save.saveInds).filter(key => 
        $save.saveInds[key] && $save.saveInds[key].name === 'EMV'
      ).sort((a, b) => {
        // Sort to ensure proper order: editPaneId_EMV first, then pane_EMV_2_EMV, etc.
        if (a === `${$ctx.editPaneId}_EMV`) return -1;
        if (b === `${$ctx.editPaneId}_EMV`) return 1;
        return a.localeCompare(b);
      });
      
      console.log('🔧 Applying EMV changes. Existing keys:', existingEmvKeys);
      console.log('🔧 Current EMV groups:', emvGroups.length);
    
    // Remove indicators that are no longer needed (if we have fewer groups now)
    const currentGroupCount = emvGroups.length;
    if (existingEmvKeys.length > currentGroupCount) {
      for (let i = currentGroupCount; i < existingEmvKeys.length; i++) {
        const key = existingEmvKeys[i];
        const savedData = $save.saveInds[key];
        if (savedData && savedData.pane_id) {
          try {
            console.log('🗑️ Removing excess EMV indicator from pane:', savedData.pane_id);
            $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'EMV' });
          } catch (error) {
            console.log('❌ Error removing excess EMV indicator:', error);
          }
        }
      }
    }
    
    // Apply each EMV group as a separate indicator
    emvGroups.forEach((group, index) => {
      const calcParams = [group.period, group.period2];
      const indicatorStyles = {
        lines: [{
          color: group.color,
          size: group.thickness,
          style: group.lineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
          dashedValue: group.lineStyle === 'dashed' ? [4, 4] : 
                      group.lineStyle === 'dotted' ? [2, 6] : [2, 2],
          smooth: false
        }]
      };

      // For the first EMV group, always update the current edit pane
      if (index === 0) {
        console.log('🔄 Updating first EMV in pane:', $ctx.editPaneId);
        $chart?.overrideIndicator({
          name: 'EMV',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: $ctx.editPaneId
        });
      } else {
        // For additional groups, check if they already exist using the correct key pattern
        const expectedSaveKey = `pane_EMV_${index + 1}_EMV`;
        const existingGroup = existingEmvKeys.find(key => key === expectedSaveKey);
        
        if (existingGroup) {
          // Update existing indicator
          const existingData = $save.saveInds[existingGroup];
          if (existingData && existingData.pane_id) {
            console.log('🔄 Updating existing EMV in pane:', existingData.pane_id);
            $chart?.overrideIndicator({
              name: 'EMV',
              calcParams: calcParams,
              styles: indicatorStyles,
              paneId: existingData.pane_id
            });
          }
        } else {
          // Create new pane with controlled pane ID for truly new groups
          const newPaneId = `pane_EMV_${index + 1}`;
          console.log('🆕 Creating new EMV in pane:', newPaneId);
          const newIndicatorId = $chart?.createIndicator({
            name: 'EMV',
            calcParams: calcParams,
            styles: indicatorStyles
          }, true, { id: newPaneId }); // Use controlled pane ID
          
          // Store the actual pane ID that was created
          if (newIndicatorId) {
            console.log('✅ Created new EMV indicator with ID:', newIndicatorId, 'in pane:', newPaneId);
          }
        }
      }
    });

      // Save EMV groups configuration
      save.update(s => {
        try {
          // Clear existing EMV data first
          Object.keys(s.saveInds).forEach(key => {
            if (s.saveInds[key] && s.saveInds[key].name === 'EMV') {
              delete s.saveInds[key];
            }
          });
          
          // Save each EMV group separately
          emvGroups.forEach((group, index) => {
            try {
              const saveKey = index === 0 ? `${$ctx.editPaneId}_EMV` : `pane_EMV_${index + 1}_EMV`;
              const paneId = index === 0 ? $ctx.editPaneId : `pane_EMV_${index + 1}`;
              
              if (!saveKey || !paneId) {
                console.error(`❌ Invalid save key or pane ID for EMV group ${index}`);
                return;
              }
              
              const saveData: any = {
                name: 'EMV',
                emvGroup: group,
                pane_id: paneId,
                groupIndex: index,
                emvGroups: index === 0 ? [...emvGroups] : undefined,
                params: [group.period, group.period2]
              };
              
              s.saveInds[saveKey] = saveData;
              console.log('💾 Saved EMV group', index, 'with key:', saveKey, 'and pane ID:', paneId);
            } catch (error) {
              console.error(`❌ Error saving EMV group ${index}:`, error);
            }
          });
        } catch (error) {
          console.error('❌ Error in EMV save operation:', error);
        }
        
        return s;
      });
      
      // Clear edit state
      ctx.update(c => {
        c.editIndName = '';
        c.editPaneId = '';
        c.modalIndCfg = false;
        return c;
      });
      
      show = false;
      console.log('✅ EMV configuration completed successfully');
      
    } catch (error) {
      console.error('❌ Critical error in handleEmvConfirm:', error);
      // Don't close the modal if there was an error
    }
  }

  function handleMtmConfirm() {
    if (!isMtm) {
      console.warn('⚠️ handleMtmConfirm called but not in MTM mode');
      return;
    }
    
    try {
      // Validate MTM groups before processing
      if (!mtmGroups || mtmGroups.length === 0) {
        console.error('❌ No MTM groups to process');
        return;
      }
      
      // Validate each group
      const validGroups = mtmGroups.filter(group => {
        if (!group || typeof group !== 'object') return false;
        if (typeof group.period !== 'number' || group.period <= 0) return false;
        if (typeof group.color !== 'string' || !group.color) return false;
        if (typeof group.thickness !== 'number' || group.thickness <= 0) return false;
        if (typeof group.lineStyle !== 'string' || !group.lineStyle) return false;
        return true;
      });
      
      if (validGroups.length === 0) {
        console.error('❌ No valid MTM groups found');
        return;
      }
      
      if (validGroups.length !== mtmGroups.length) {
        console.warn(`⚠️ ${mtmGroups.length - validGroups.length} invalid MTM groups filtered out`);
        mtmGroups = validGroups;
      }
      
      // Get existing MTM indicators to determine which ones already exist
      const existingMtmKeys = Object.keys($save.saveInds).filter(key => 
        $save.saveInds[key] && $save.saveInds[key].name === 'MTM'
      ).sort((a, b) => {
        // Sort to ensure proper order: editPaneId_MTM first, then pane_MTM_2_MTM, etc.
        if (a === `${$ctx.editPaneId}_MTM`) return -1;
        if (b === `${$ctx.editPaneId}_MTM`) return 1;
        return a.localeCompare(b);
      });
      
      console.log('🔧 Applying MTM changes. Existing keys:', existingMtmKeys);
      console.log('🔧 Current MTM groups:', mtmGroups.length);
    
    // Remove indicators that are no longer needed (if we have fewer groups now)
    const currentGroupCount = mtmGroups.length;
    if (existingMtmKeys.length > currentGroupCount) {
      for (let i = currentGroupCount; i < existingMtmKeys.length; i++) {
        const key = existingMtmKeys[i];
        const savedData = $save.saveInds[key];
        if (savedData && savedData.pane_id) {
          try {
            console.log('🗑️ Removing excess MTM indicator from pane:', savedData.pane_id);
            $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'MTM' });
          } catch (error) {
            console.log('❌ Error removing excess MTM indicator:', error);
          }
        }
      }
    }
    
    // Apply each MTM group as a separate indicator
    mtmGroups.forEach((group, index) => {
      const calcParams = [group.period];
      const indicatorStyles = {
        lines: [{
          color: group.color,
          size: group.thickness,
          style: group.lineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
          dashedValue: group.lineStyle === 'dashed' ? [4, 4] : 
                      group.lineStyle === 'dotted' ? [2, 6] : [2, 2],
          smooth: false
        }]
      };

      // For the first MTM group, always update the current edit pane
      if (index === 0) {
        console.log('🔄 Updating first MTM in pane:', $ctx.editPaneId);
        $chart?.overrideIndicator({
          name: 'MTM',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: $ctx.editPaneId
        });
      } else {
        // For additional groups, check if they already exist using the correct key pattern
        const expectedSaveKey = `pane_MTM_${index + 1}_MTM`;
        const existingGroup = existingMtmKeys.find(key => key === expectedSaveKey);
        
        if (existingGroup) {
          // Update existing indicator
          const existingData = $save.saveInds[existingGroup];
          if (existingData && existingData.pane_id) {
            console.log('🔄 Updating existing MTM in pane:', existingData.pane_id);
            $chart?.overrideIndicator({
              name: 'MTM',
              calcParams: calcParams,
              styles: indicatorStyles,
              paneId: existingData.pane_id
            });
          }
        } else {
          // Create new pane with controlled pane ID for truly new groups
          const newPaneId = `pane_MTM_${index + 1}`;
          console.log('🆕 Creating new MTM in pane:', newPaneId);
          const newIndicatorId = $chart?.createIndicator({
            name: 'MTM',
            calcParams: calcParams,
            styles: indicatorStyles
          }, true, { id: newPaneId }); // Use controlled pane ID
          
          // Store the actual pane ID that was created
          if (newIndicatorId) {
            console.log('✅ Created new MTM indicator with ID:', newIndicatorId, 'in pane:', newPaneId);
          }
        }
      }
    });

      // Save MTM groups configuration
      save.update(s => {
        try {
          // Clear existing MTM data first
          Object.keys(s.saveInds).forEach(key => {
            if (s.saveInds[key] && s.saveInds[key].name === 'MTM') {
              delete s.saveInds[key];
            }
          });
          
          // Save each MTM group separately
          mtmGroups.forEach((group, index) => {
            try {
              const saveKey = index === 0 ? `${$ctx.editPaneId}_MTM` : `pane_MTM_${index + 1}_MTM`;
              const paneId = index === 0 ? $ctx.editPaneId : `pane_MTM_${index + 1}`;
              
              if (!saveKey || !paneId) {
                console.error(`❌ Invalid save key or pane ID for MTM group ${index}`);
                return;
              }
              
              const saveData: any = {
                name: 'MTM',
                mtmGroup: group,
                pane_id: paneId,
                groupIndex: index,
                mtmGroups: index === 0 ? [...mtmGroups] : undefined,
                params: [group.period]
              };
              
              s.saveInds[saveKey] = saveData;
              console.log('💾 Saved MTM group', index, 'with key:', saveKey, 'and pane ID:', paneId);
            } catch (error) {
              console.error(`❌ Error saving MTM group ${index}:`, error);
            }
          });
        } catch (error) {
          console.error('❌ Error in MTM save operation:', error);
        }
        
        return s;
      });
      
      // Clear edit state
      ctx.update(c => {
        c.editIndName = '';
        c.editPaneId = '';
        c.modalIndCfg = false;
        return c;
      });
      
      show = false;
      console.log('✅ MTM configuration completed successfully');
      
    } catch (error) {
      console.error('❌ Critical error in handleMtmConfirm:', error);
      // Don't close the modal if there was an error
    }
  }

  function handleBiasConfirm() {
    if (!isBias) return;
    
    // Get existing BIAS indicators to determine which ones already exist
    const existingBiasKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'BIAS'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_BIAS first, then pane_BIAS_2_BIAS, etc.
      if (a === `${$ctx.editPaneId}_BIAS`) return -1;
      if (b === `${$ctx.editPaneId}_BIAS`) return 1;
      return a.localeCompare(b);
    });
    
    console.log('🔧 Applying BIAS changes. Existing keys:', existingBiasKeys);
    console.log('🔧 Current BIAS groups:', biasGroups.length);
    
    // Remove indicators that are no longer needed (if we have fewer groups now)
    const currentGroupCount = biasGroups.length;
    if (existingBiasKeys.length > currentGroupCount) {
      for (let i = currentGroupCount; i < existingBiasKeys.length; i++) {
        const key = existingBiasKeys[i];
        const savedData = $save.saveInds[key];
        if (savedData && savedData.pane_id) {
          try {
            console.log('🗑️ Removing excess BIAS indicator from pane:', savedData.pane_id);
            $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'BIAS' });
          } catch (error) {
            console.log('❌ Error removing excess BIAS indicator:', error);
          }
        }
      }
    }
    
    // Apply each BIAS group as a separate indicator
    biasGroups.forEach((group, index) => {
      const calcParams = [group.period];
      const indicatorStyles = {
        lines: [{
          color: group.color,
          size: group.thickness,
          style: group.lineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
          dashedValue: group.lineStyle === 'dashed' ? [4, 4] : 
                      group.lineStyle === 'dotted' ? [2, 6] : [2, 2],
          smooth: false
        }]
      };

      // For the first BIAS group, always update the current edit pane
      if (index === 0) {
        console.log('🔄 Updating first BIAS in pane:', $ctx.editPaneId);
        $chart?.overrideIndicator({
          name: 'BIAS',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: $ctx.editPaneId
        });
      } else {
        // For additional groups, check if they already exist using the correct key pattern
        const expectedSaveKey = `pane_BIAS_${index + 1}_BIAS`;
        const existingGroup = existingBiasKeys.find(key => key === expectedSaveKey);
        
        if (existingGroup) {
          // Update existing indicator
          const existingData = $save.saveInds[existingGroup];
          if (existingData && existingData.pane_id) {
            console.log('🔄 Updating existing BIAS in pane:', existingData.pane_id);
            $chart?.overrideIndicator({
              name: 'BIAS',
              calcParams: calcParams,
              styles: indicatorStyles,
              paneId: existingData.pane_id
            });
          }
        } else {
          // Create new pane with controlled pane ID for truly new groups
          const newPaneId = `pane_BIAS_${index + 1}`;
          console.log('🆕 Creating new BIAS in pane:', newPaneId);
          const newIndicatorId = $chart?.createIndicator({
            name: 'BIAS',
            calcParams: calcParams,
            styles: indicatorStyles
          }, true, { id: newPaneId }); // Use controlled pane ID
          
          // Store the actual pane ID that was created
          if (newIndicatorId) {
            console.log('✅ Created new BIAS indicator with ID:', newIndicatorId, 'in pane:', newPaneId);
          }
        }
      }
    });

    // Save BIAS groups configuration
    save.update(s => {
      // Clear existing BIAS data first
      Object.keys(s.saveInds).forEach(key => {
        if (s.saveInds[key].name === 'BIAS') {
          delete s.saveInds[key];
        }
      });
      
      // Save each BIAS group separately
      biasGroups.forEach((group, index) => {
        const saveKey = index === 0 ? `${$ctx.editPaneId}_BIAS` : `pane_BIAS_${index + 1}_BIAS`;
        const paneId = index === 0 ? $ctx.editPaneId : `pane_BIAS_${index + 1}`;
        const saveData: any = {
          name: 'BIAS',
          biasGroup: group,
          pane_id: paneId,
          groupIndex: index,
          biasGroups: index === 0 ? [...biasGroups] : undefined,
          params: [group.period]
        };
        
        s.saveInds[saveKey] = saveData;
        console.log('💾 Saved BIAS group', index, 'with key:', saveKey, 'and pane ID:', paneId);
      });
      
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
    console.log('✅ BIAS configuration saved successfully');
  }

  function handleCciConfirm() {
    if (!isCci) return;
    
    // Get existing CCI indicators to determine which ones already exist
    const existingCciKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'CCI'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_CCI first, then pane_CCI_2_CCI, etc.
      if (a === `${$ctx.editPaneId}_CCI`) return -1;
      if (b === `${$ctx.editPaneId}_CCI`) return 1;
      return a.localeCompare(b);
    });
    
    console.log('🔧 Applying CCI changes. Existing keys:', existingCciKeys);
    console.log('🔧 Current CCI groups:', cciGroups.length);
    
    // Create a mapping of existing CCI groups to their saved keys
    const groupToKeyMap = new Map();
    const expectedKeys: string[] = [];
    const usedKeys = new Set(); // Track which keys have been assigned
    
    // First, try to match existing groups with their saved data by comparing group properties
    cciGroups.forEach((group, index) => {
      let matchedKey = null;
      
      // Try to find a matching saved indicator by comparing properties
      for (const key of existingCciKeys) {
        if (usedKeys.has(key)) continue; // Skip already used keys
        
        const savedData = $save.saveInds[key];
        if (savedData && savedData.cciGroup) {
          // Match by group ID if available, otherwise by properties
          if (savedData.cciGroup.id === group.id || 
              (savedData.cciGroup.period === group.period && 
               savedData.cciGroup.color === group.color &&
               savedData.cciGroup.thickness === group.thickness &&
               savedData.cciGroup.lineStyle === group.lineStyle)) {
            matchedKey = key;
            usedKeys.add(key);
            break;
          }
        }
      }
      
      // If no match found, generate new key based on current position
      if (!matchedKey) {
        // Find the next available key slot
        let keyIndex = index + 1;
        let candidateKey;
        
        do {
          candidateKey = keyIndex === 1 ? `${$ctx.editPaneId}_CCI` : `pane_CCI_${keyIndex}_CCI`;
          keyIndex++;
        } while (usedKeys.has(candidateKey) || existingCciKeys.includes(candidateKey));
        
        matchedKey = candidateKey;
        usedKeys.add(matchedKey);
      }
      
      groupToKeyMap.set(group.id, matchedKey);
      expectedKeys.push(matchedKey);
    });
    
    // Find keys that should be removed (exist but not in expected)
    const keysToRemove = existingCciKeys.filter(key => !expectedKeys.includes(key));
    
    // Remove indicators that are no longer needed
    keysToRemove.forEach(key => {
      const savedData = $save.saveInds[key];
      if (savedData && savedData.pane_id) {
        try {
          console.log('🗑️ Removing CCI indicator from pane:', savedData.pane_id, 'key:', key);
          $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'CCI' });
        } catch (error) {
          console.log('❌ Error removing CCI indicator:', error);
        }
      }
    });
    
    // Apply each CCI group as a separate indicator using mapped keys
    cciGroups.forEach((group, index) => {
      const calcParams = [group.period];
      const indicatorStyles = {
        lines: [{
          color: group.color,
          size: group.thickness,
          style: group.lineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
          dashedValue: group.lineStyle === 'dashed' ? [4, 4] : 
                      group.lineStyle === 'dotted' ? [2, 6] : [2, 2],
          smooth: false
        }]
      };

      const saveKey = groupToKeyMap.get(group.id);
      const existingData = $save.saveInds[saveKey];
      
      if (existingData && existingData.pane_id) {
        // Update existing indicator
        console.log('🔄 Updating existing CCI in pane:', existingData.pane_id, 'with key:', saveKey);
        $chart?.overrideIndicator({
          name: 'CCI',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: existingData.pane_id
        });
      } else {
        // Create new indicator
        const paneId = saveKey === `${$ctx.editPaneId}_CCI` ? $ctx.editPaneId : saveKey.replace('_CCI', '');
        console.log('🆕 Creating new CCI in pane:', paneId, 'with key:', saveKey);
        const newIndicatorId = $chart?.createIndicator({
          name: 'CCI',
          calcParams: calcParams,
          styles: indicatorStyles
        }, true, { id: paneId }); // Use controlled pane ID
        
        // Store the actual pane ID that was created
        if (newIndicatorId) {
          console.log('✅ Created new CCI indicator with ID:', newIndicatorId, 'in pane:', paneId);
        }
      }
    });

    // Save CCI groups configuration
    save.update(s => {
      // Remove only the keys that should be deleted
      keysToRemove.forEach(key => {
        delete s.saveInds[key];
        console.log('🗑️ Deleted save data for key:', key);
      });
      
      // Save each CCI group separately using the mapped keys
      cciGroups.forEach((group, index) => {
        const saveKey = groupToKeyMap.get(group.id);
        const paneId = saveKey === `${$ctx.editPaneId}_CCI` ? $ctx.editPaneId : saveKey.replace('_CCI', '');
        const saveData: any = {
          name: 'CCI',
          cciGroup: group,
          pane_id: paneId,
          groupIndex: index,
          cciGroups: index === 0 ? [...cciGroups] : undefined,
          params: [group.period]
        };
        
        s.saveInds[saveKey] = saveData;
        console.log('💾 Saved CCI group', index, 'with key:', saveKey, 'and pane ID:', paneId);
      });
      
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
    console.log('✅ CCI configuration saved successfully');
  }

  function handleSarConfirm() {
    if (!isSar) return;
    
    // Apply each SAR group as a separate indicator - all in main panel
    sarGroups.forEach((group, index) => {
      const calcParams = [group.start, group.increment, group.maxValue];
      const indicatorStyles = {
        lines: [{
          color: group.color,
          size: group.dotSize,
          style: kc.LineType.Solid
        }]
      };

      // For the first SAR group, update the current edit pane (main panel)
      if (index === 0) {
        $chart?.overrideIndicator({
          name: 'SAR',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: 'candle_pane'
        }); // Force main panel
      } else {
        // For additional groups, create in main panel only
        $chart?.createIndicator({
          name: 'SAR',
          calcParams: calcParams,
          styles: indicatorStyles
        }, false, { id: 'candle_pane' }); // false = don't create new pane, use main panel
      }
    });

    // Save SAR groups configuration
    save.update(s => {
      // Clear existing SAR data first
      Object.keys(s.saveInds).forEach(key => {
        if (s.saveInds[key].name === 'SAR') {
          delete s.saveInds[key];
        }
      });
      
      // Save each SAR group separately
      sarGroups.forEach((group, index) => {
        const saveKey = index === 0 ? `candle_pane_SAR` : `SAR_${index + 1}`;
        const saveData: any = {
          name: 'SAR',
          sarGroup: group,
          pane_id: 'candle_pane', // Always main panel
          groupIndex: index,
          sarGroups: index === 0 ? [...sarGroups] : undefined,
          params: [group.start, group.increment, group.maxValue]
        };
        
        s.saveInds[saveKey] = saveData;
      });
      
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
  }

  function handleDmiConfirm() {
    if (!isDmi) return;

    // Get existing DMI indicators to determine which ones already exist
    const existingDmiKeys = Object.keys($save.saveInds).filter(key =>
      $save.saveInds[key].name === 'DMI'
    ).sort((a, b) => {
      // Sort to ensure proper order: editPaneId_DMI first, then pane_DMI_2_DMI, etc.
      if (a === `${$ctx.editPaneId}_DMI`) return -1;
      if (b === `${$ctx.editPaneId}_DMI`) return 1;
      return a.localeCompare(b);
    });

    console.log('🔧 Applying DMI changes. Existing keys:', existingDmiKeys);
    console.log('🔧 Current DMI groups:', dmiGroups.length);

    // Remove excess indicators if we have fewer groups now
    const currentGroupCount = dmiGroups.length;
    if (existingDmiKeys.length > currentGroupCount) {
      for (let i = currentGroupCount; i < existingDmiKeys.length; i++) {
        const key = existingDmiKeys[i];
        const savedData = $save.saveInds[key];
        
        try {
          console.log('🗑️ Removing excess DMI indicator from pane:', savedData.pane_id);
          $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'DMI' });
        } catch (error) {
          console.log('❌ Error removing excess DMI indicator:', error);
        }
        
        delete $save.saveInds[key];
      }
    }

    // Apply each DMI group as a separate indicator
    dmiGroups.forEach((group, index) => {
      const calcParams = [group.diPeriod, group.adxPeriod];
      const indicatorStyles = {
        lines: [
          {
            color: group.styles.diPlus.color,
            size: group.styles.diPlus.thickness,
            style: group.styles.diPlus.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: group.styles.diPlus.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          },
          {
            color: group.styles.diMinus.color,
            size: group.styles.diMinus.thickness,
            style: group.styles.diMinus.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: group.styles.diMinus.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          },
          {
            color: group.styles.adx.color,
            size: group.styles.adx.thickness,
            style: group.styles.adx.lineStyle === 'dashed' ? kc.LineType.Dashed : kc.LineType.Solid,
            dashedValue: group.styles.adx.lineStyle === 'dashed' ? [4, 4] : [2, 2],
            smooth: false
          }
        ]
      };

      // For the first DMI group, always update the current edit pane
      if (index === 0) {
        console.log('🔄 Updating first DMI in pane:', $ctx.editPaneId);
        $chart?.overrideIndicator({
          name: 'DMI',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: $ctx.editPaneId
        });
      } else {
        // For additional groups, check if they already exist or create new ones
        const expectedSaveKey = `pane_DMI_${index + 1}_DMI`;
        const existingGroup = existingDmiKeys.find(key => key === expectedSaveKey);
        
        if (existingGroup) {
          // Update existing DMI in its pane
          const existingData = $save.saveInds[existingGroup];
          console.log('🔄 Updating existing DMI in pane:', existingData.pane_id);
          $chart?.overrideIndicator({
            name: 'DMI',
            calcParams: calcParams,
            styles: indicatorStyles,
            paneId: existingData.pane_id
          });
        } else {
          // Create new DMI in new pane
          const newPaneId = `pane_DMI_${index + 1}`;
          console.log('🆕 Creating new DMI in pane:', newPaneId);
          const newIndicatorId = $chart?.createIndicator({
            name: 'DMI',
            calcParams: calcParams,
            styles: indicatorStyles
          }, true, { id: newPaneId });
          
          console.log('✅ Created new DMI indicator with ID:', newIndicatorId, 'in pane:', newPaneId);
        }
      }
    });

    // Save DMI groups configuration
    save.update(s => {
      // Clear existing DMI data first
      Object.keys(s.saveInds).forEach(key => {
        if (s.saveInds[key].name === 'DMI') {
          delete s.saveInds[key];
        }
      });

      // Save each DMI group separately
      dmiGroups.forEach((group, index) => {
        const saveKey = index === 0 ? `${$ctx.editPaneId}_DMI` : `pane_DMI_${index + 1}_DMI`;
        const paneId = index === 0 ? $ctx.editPaneId : `pane_DMI_${index + 1}`;
        const saveData: any = {
          name: 'DMI',
          dmiGroup: group,
          pane_id: paneId,
          groupIndex: index,
          dmiGroups: index === 0 ? [...dmiGroups] : undefined,
          params: [group.diPeriod, group.adxPeriod]
        };
        
        s.saveInds[saveKey] = saveData;
        console.log('💾 Saved DMI group', index, 'with key:', saveKey, 'and pane ID:', paneId);
      });

      return s;
    });

    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });

    show = false;
  }

  function updatePvtStyles() {
    if (!isPvt || !$chart) return;
    
    let lineStyle = kc.LineType.Solid;
    let dashedValue = [2, 2];
    
    if (pvtStyle === 'dashed') {
      lineStyle = kc.LineType.Dashed;
      dashedValue = [4, 4];
    }
    
    const indicatorStyles = {
      lines: [{
        color: pvtColor,
        size: pvtThickness,
        style: lineStyle,
        dashedValue: dashedValue
      }]
    };

    $chart?.overrideIndicator({
      name: 'PVT',
      styles: indicatorStyles,
      paneId: $ctx.editPaneId
    });

    // Save PVT styling
    save.update(s => {
      const saveKey = `${$ctx.editPaneId}_PVT`;
      s.saveInds[saveKey] = {
        ...s.saveInds[saveKey],
        pvtColor,
        pvtThickness,
        pvtStyle
      };
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
  }

  function updatePvtGroupStyle(groupId: string, property: string, value: any) {
    if (!isPvt || !$chart) return;
    
    // Update the group in the array
    const groupIndex = pvtGroups.findIndex(g => g.id === groupId);
    if (groupIndex === -1) return;
    
    (pvtGroups[groupIndex] as any)[property] = value;
    
    // Call the comprehensive update function
    updatePvtIndicator(groupIndex);
  }

  // Comprehensive PVT indicator update function (similar to KDJ's updateKdjIndicator)
  function updatePvtIndicator(groupIndex: number) {
    const group = pvtGroups[groupIndex];
    if (!group || !$chart) {
      console.warn('❌ updatePvtIndicator: Missing group or chart', { group, chart: !!$chart });
      return;
    }
    
    console.log('🔄 updatePvtIndicator called:', { groupIndex, group });
    
    // Convert line style to klinecharts format
    let lineStyle = kc.LineType.Solid;
    let dashedValue = [2, 2];
    
    if (group.lineStyle === 'dashed') {
      lineStyle = kc.LineType.Dashed;
      dashedValue = [4, 4];
    } else if (group.lineStyle === 'dotted') {
      lineStyle = kc.LineType.Dashed;
      dashedValue = [2, 2];
    }
    
    // Find the specific indicator instance on the chart
    const indicators = $chart?.getIndicators();
    const pvtIndicators = indicators.filter(ind => ind.name === 'PVT');
    
    console.log('📊 Found PVT indicators on chart:', pvtIndicators.length);
    console.log('📊 Looking for group index:', groupIndex);
    
    // FIXED: Use groupIndex to match with chart indicators instead of ID matching
    // Since PVT indicators are created in order, we can use the groupIndex
    if (pvtIndicators.length > groupIndex) {
      const indicator = pvtIndicators[groupIndex];
      console.log('✅ Found matching PVT indicator by index, updating styles...');
      
      // Update the indicator with new styles
      const result = $chart?.overrideIndicator({
        name: 'PVT',
        paneId: indicator.paneId,
        styles: {
          lines: [{
            color: group.color,
            size: group.thickness,
            style: lineStyle,
            dashedValue: dashedValue,
            smooth: false
          }]
        },
        figures: [
          {
            key: 'pvt',
            title: 'PVT: ',
            type: 'line'
          }
        ]
      });
      
      console.log('🎨 overrideIndicator result:', result);
      console.log('🎨 Applied styles:', {
        color: group.color,
        size: group.thickness,
        style: lineStyle,
        dashedValue: dashedValue
      });
      
      // CRITICAL: Persist changes to save data immediately (like KDJ)
      // Use the indicator's pane ID for the save key
      const saveKey = `${indicator.paneId}_PVT`;
      
      console.log('💾 Using save key:', saveKey);
      
      save.update(s => {
        if (!s.saveInds[saveKey]) {
          // Create new save entry if it doesn't exist
          s.saveInds[saveKey] = {
            name: 'PVT',
            pane_id: indicator.paneId,
            pvtGroups: []
          };
        }
        
        // Ensure pvtGroups array exists
        if (!s.saveInds[saveKey].pvtGroups) {
          s.saveInds[saveKey].pvtGroups = [];
        }
        
        // Update the specific group in saved data using groupIndex
        const savedGroups = s.saveInds[saveKey].pvtGroups || [];
        
        // Ensure the array is large enough
        while (savedGroups.length <= groupIndex) {
          savedGroups.push({});
        }
        
        // Update the group at the correct index
        savedGroups[groupIndex] = {...group};
        
        s.saveInds[saveKey].pvtGroups = savedGroups;
        console.log('💾 Persisted PVT changes to save data:', saveKey, group);
        
        return s;
      });
      
      console.log('✅ PVT indicator updated successfully:', groupIndex, group);
    } else {
      console.error('❌ PVT indicator not found on chart for group index:', groupIndex);
      console.log('📊 Available PVT indicators:', pvtIndicators.length);
      console.log('📊 Requested group index:', groupIndex);
    }
  }

  // Comprehensive TRIX indicator update function
  function updateTrixIndicator(groupIndex: number) {
    if (!isTrix || !$chart || groupIndex < 0 || groupIndex >= trixGroups.length) return;
    
    const group = trixGroups[groupIndex];
    console.log('🔄 Updating TRIX indicator:', groupIndex, group);
    
    try {
      // Determine the pane ID for this group
      let paneId = group.paneId || $ctx.editPaneId;
      
      console.log('🔍 Using pane ID for TRIX update:', paneId, 'for group:', groupIndex);
      
      // Remove the existing TRIX indicator from this specific pane
      $chart.removeIndicator({ paneId: paneId, name: 'TRIX' });
      
      // Convert line styles to klinecharts format
      function convertLineStyle(style: string) {
        let lineStyle = kc.LineType.Solid;
        let dashedValue = [2, 2];
        
        if (style === 'dashed') {
          lineStyle = kc.LineType.Dashed;
          dashedValue = [4, 4];
        } else if (style === 'dotted') {
          lineStyle = kc.LineType.Dashed;
          dashedValue = [2, 2];
        }
        
        return { lineStyle, dashedValue };
      }
      
      const trixStyle = convertLineStyle(group.styles.trix.lineStyle);
      const signalStyle = convertLineStyle(group.styles.signal.lineStyle);
      
      // Re-create the TRIX indicator with updated parameters
      const indicatorId = $chart.createIndicator({
        name: 'TRIX',
        calcParams: [group.trixPeriod, group.signalPeriod],
        styles: {
          lines: [
            {
              color: group.styles.trix.color,
              size: group.styles.trix.thickness,
              style: trixStyle.lineStyle,
              dashedValue: trixStyle.dashedValue
            },
            {
              color: group.styles.signal.color,
              size: group.styles.signal.thickness,
              style: signalStyle.lineStyle,
              dashedValue: signalStyle.dashedValue
            }
          ]
        }
      }, paneId === $ctx.editPaneId, { id: paneId });
      
      // Update the save system
      if (indicatorId) {
        const saveKey = `${paneId}_TRIX`;
        save.update(s => {
          if (!s.saveInds[saveKey]) {
            s.saveInds[saveKey] = {
              name: 'TRIX',
              pane_id: paneId,
              params: [group.trixPeriod, group.signalPeriod]
            };
          } else {
            s.saveInds[saveKey].params = [group.trixPeriod, group.signalPeriod];
          }
          
          // Save the group data for persistence
          (s.saveInds[saveKey] as any).trixGroup = {...group};
          
          return s;
        });
      }
      
      console.log('✅ TRIX indicator updated successfully:', groupIndex);
      
    } catch (error) {
      console.error('❌ Error updating TRIX indicator:', error);
    }
  }

  function handleRocConfirm() {
    if (!isRoc || !$chart) return;
    
    // Get existing ROC indicators on the chart
    const indicators = $chart?.getIndicators();
    const rocIndicators = indicators.filter(ind => ind.name === 'ROC');
    
    console.log('📊 Found ROC indicators on chart:', rocIndicators.length);
    console.log('📊 ROC groups to apply:', rocGroups.length);
    
    // Apply changes to existing ROC indicators
    rocGroups.forEach((group, groupIndex) => {
      const calcParams = [group.period];
      
      // Determine line style
      let lineStyle = kc.LineType.Solid;
      let dashedValue = [2, 2];
      
      if (group.styles.roc.lineStyle === 'dashed') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [4, 4];
      } else if (group.styles.roc.lineStyle === 'dotted') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [2, 2];
      }
      
      // Find the corresponding indicator for this group
      const indicator = rocIndicators[groupIndex];
      
      if (indicator) {
        console.log(`🎨 Updating existing ROC indicator ${groupIndex} in pane:`, indicator.paneId);
        
        // Update existing indicator
        const result = $chart?.overrideIndicator({
          name: 'ROC',
          paneId: indicator.paneId,
          calcParams: calcParams,
          styles: {
            lines: [{
              color: group.styles.roc.color,
              size: group.styles.roc.thickness,
              style: lineStyle,
              dashedValue: dashedValue,
              smooth: false
            }]
          },
          figures: [
            { key: 'roc', title: 'ROC: ', type: 'line' }
          ]
        });
        
        console.log('🎨 overrideIndicator result:', result);
        
        // Save to storage using the indicator's pane ID
        const saveKey = `${indicator.paneId}_ROC`;
        
        save.update(s => {
          if (!s.saveInds[saveKey]) {
            s.saveInds[saveKey] = {
              name: 'ROC',
              pane_id: indicator.paneId,
              params: calcParams,
              rocGroups: []
            };
          }
          
          // Ensure rocGroups array exists
          if (!s.saveInds[saveKey].rocGroups) {
            s.saveInds[saveKey].rocGroups = [];
          }
          
          // Update the specific group in saved data
          const savedGroups = s.saveInds[saveKey].rocGroups || [];
          
          // Ensure the array is large enough
          while (savedGroups.length <= groupIndex) {
            savedGroups.push({});
          }
          
          // Update the group at the correct index
          savedGroups[groupIndex] = {...group};
          
          s.saveInds[saveKey].rocGroups = savedGroups;
          s.saveInds[saveKey].params = calcParams;
          
          console.log('💾 Persisted ROC changes to save data:', saveKey, group);
          
          return s;
        });
        
        console.log('✅ ROC indicator updated successfully:', groupIndex, group);
      } else {
        console.log(`➕ Creating new ROC indicator for group ${groupIndex}`);
        
        // Create new indicator for additional groups
        const indicatorConfig = {
          name: 'ROC',
          calcParams: calcParams,
          styles: {
            lines: [{
              color: group.styles.roc.color,
              size: group.styles.roc.thickness,
              style: lineStyle,
              dashedValue: dashedValue,
              smooth: false
            }]
          },
          figures: [
            { key: 'roc', title: 'ROC: ', type: 'line' }
          ]
        };
        
        // Create in new sub-panel
        $chart?.createIndicator(indicatorConfig, false, { axis: { gap: { bottom: 2 } } });
      }
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
  }

  function handlePsyConfirm() {
    if (!isPsy) return;
    
    // Get existing PSY indicators to determine which ones already exist
    const existingPsyKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'PSY'
    ).sort((a, b) => {
      if (a === `${$ctx.editPaneId}_PSY`) return -1;
      if (b === `${$ctx.editPaneId}_PSY`) return 1;
      return a.localeCompare(b);
    });
    
    // Remove excess indicators if needed
    const currentGroupCount = psyGroups.length;
    if (existingPsyKeys.length > currentGroupCount) {
      for (let i = currentGroupCount; i < existingPsyKeys.length; i++) {
        const key = existingPsyKeys[i];
        const savedData = $save.saveInds[key];
        if (savedData && savedData.pane_id) {
          try {
            $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'PSY' });
          } catch (error) {
            console.log('Error removing excess PSY indicator:', error);
          }
        }
      }
    }
    
    // Apply each PSY group as a separate indicator in its own sub-panel
    psyGroups.forEach((group, index) => {
      const calcParams = [group.psyPeriod, group.mapsyPeriod];
      
      // Create figures array based on showMapsy setting
      const figures = [
        { key: 'psy', title: 'PSY: ', type: 'line' }
      ];
      
      if (group.showMapsy) {
        figures.push({ key: 'mapsy', title: 'MAPSY: ', type: 'line' });
      }
      
      // Create indicator styles
      const indicatorStyles: any = {
        lines: []
      };
      
      // PSY line style
      let psyLineStyle = kc.LineType.Solid;
      let psyDashedValue = [2, 2];
      
      if (group.styles.psy.lineStyle === 'dashed') {
        psyLineStyle = kc.LineType.Dashed;
        psyDashedValue = [4, 4];
      } else if (group.styles.psy.lineStyle === 'dotted') {
        psyLineStyle = kc.LineType.Dashed;
        psyDashedValue = [2, 2];
      }
      
      indicatorStyles.lines.push({
        color: group.styles.psy.color,
        size: group.styles.psy.thickness,
        style: psyLineStyle,
        dashedValue: psyDashedValue,
        smooth: false
      });
      
      // MAPSY line style (only if showMapsy is true)
      if (group.showMapsy) {
        let mapsyLineStyle = kc.LineType.Solid;
        let mapsyDashedValue = [2, 2];
        
        if (group.styles.mapsy.lineStyle === 'dashed') {
          mapsyLineStyle = kc.LineType.Dashed;
          mapsyDashedValue = [4, 4];
        } else if (group.styles.mapsy.lineStyle === 'dotted') {
          mapsyLineStyle = kc.LineType.Dashed;
          mapsyDashedValue = [2, 2];
        }
        
        indicatorStyles.lines.push({
          color: group.styles.mapsy.color,
          size: group.styles.mapsy.thickness,
          style: mapsyLineStyle,
          dashedValue: mapsyDashedValue,
          smooth: false
        });
      }

      // Create indicator configuration
      const indicatorConfig = {
        name: 'PSY',
        calcParams: calcParams,
        styles: indicatorStyles,
        figures: figures
      };

      // For the first PSY group, use the current edit pane
      // For additional groups, create new sub-panels with unique IDs
      if (index === 0) {
        $chart?.overrideIndicator({
          ...indicatorConfig,
          paneId: $ctx.editPaneId
        });
      } else {
        // Handle additional indicators with proper pane management
        const expectedSaveKey = `psy_${String(index + 1).padStart(3, '0')}_PSY`;
        const existingGroup = existingPsyKeys.find(key => key === expectedSaveKey);
        
        if (existingGroup) {
          // Update existing indicator
          const existingData = $save.saveInds[existingGroup];
          if (existingData && existingData.pane_id) {
            $chart?.overrideIndicator({
              ...indicatorConfig,
              paneId: existingData.pane_id
            });
          }
        } else {
          // Create new sub-panel for additional PSY instances
          const newPaneId = `psy_${String(index + 1).padStart(3, '0')}`;
          const result = $chart?.createIndicator(indicatorConfig, false, { 
            id: newPaneId, 
            axis: { gap: { bottom: 2 } } 
          });
          
          // Store the pane ID for later reference
          if (result) {
            console.log(`✅ PSY ${index + 1} created with pane ID:`, newPaneId);
            group.actualPaneId = newPaneId;
          }
        }
      }
    });

    // Save PSY groups configuration with individual save keys
    save.update(s => {
      // Clear existing PSY data
      Object.keys(s.saveInds).forEach(key => {
        if (s.saveInds[key].name === 'PSY') {
          delete s.saveInds[key];
        }
      });
      
      // Save each PSY group individually
      psyGroups.forEach((group, index) => {
        const saveKey = index === 0 ? `${$ctx.editPaneId}_PSY` : `psy_${String(index + 1).padStart(3, '0')}_PSY`;
        const paneId = index === 0 ? $ctx.editPaneId : group.actualPaneId || `psy_${String(index + 1).padStart(3, '0')}`;
        
        s.saveInds[saveKey] = {
          name: 'PSY',
          psyGroup: group,
          pane_id: paneId,
          groupIndex: index,
          params: [group.psyPeriod, group.mapsyPeriod]
        };
      });
      
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
  }

  function handleObvConfirm() {
    if (!isObv) return;
    
    // Get existing OBV indicators to determine which ones already exist
    const existingObvKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'OBV'
    );
    
    // Apply each OBV group as a separate indicator
    obvGroups.forEach((group, index) => {
      const calcParams = [group.obvPeriod, group.maobvPeriod];
      
      // Create figures array based on showMaobv setting
      const figures = [
        { key: 'obv', title: 'OBV: ', type: 'line' }
      ];
      
      if (group.showMaobv) {
        figures.push({ key: 'maobv', title: 'MAOBV: ', type: 'line' });
      }
      
      // Create indicator styles
      const indicatorStyles: any = {
        lines: []
      };
      
      // OBV line style
      let obvLineStyle = kc.LineType.Solid;
      let obvDashedValue = [2, 2];
      
      if (group.styles.obv.lineStyle === 'dashed') {
        obvLineStyle = kc.LineType.Dashed;
        obvDashedValue = [4, 4];
      } else if (group.styles.obv.lineStyle === 'dotted') {
        obvLineStyle = kc.LineType.Dashed;
        obvDashedValue = [2, 2];
      }
      
      indicatorStyles.lines.push({
        color: group.styles.obv.color,
        size: group.styles.obv.thickness,
        style: obvLineStyle,
        dashedValue: obvDashedValue,
        smooth: false
      });
      
      // MAOBV line style (only if showMaobv is true)
      if (group.showMaobv) {
        let maobvLineStyle = kc.LineType.Solid;
        let maobvDashedValue = [2, 2];
        
        if (group.styles.maobv.lineStyle === 'dashed') {
          maobvLineStyle = kc.LineType.Dashed;
          maobvDashedValue = [4, 4];
        } else if (group.styles.maobv.lineStyle === 'dotted') {
          maobvLineStyle = kc.LineType.Dashed;
          maobvDashedValue = [2, 2];
        }
        
        indicatorStyles.lines.push({
          color: group.styles.maobv.color,
          size: group.styles.maobv.thickness,
          style: maobvLineStyle,
          dashedValue: maobvDashedValue,
          smooth: false
        });
      }

      // Create indicator configuration
      const indicatorConfig = {
        name: 'OBV',
        calcParams: calcParams,
        styles: indicatorStyles,
        figures: figures
      };

      // For the first OBV group, always update the current edit pane
      if (index === 0) {
        $chart?.overrideIndicator({
          ...indicatorConfig,
          paneId: $ctx.editPaneId
        });
      } else {
        // For additional groups, check if they already exist
        const expectedSaveKey = `pane_OBV_${index + 1}_OBV`;
        const existingGroup = existingObvKeys.find(key => key === expectedSaveKey);
        
        if (existingGroup) {
          // Update existing indicator
          const existingData = $save.saveInds[existingGroup];
          if (existingData && existingData.pane_id) {
            $chart?.overrideIndicator({
              ...indicatorConfig,
              paneId: existingData.pane_id
            });
          }
        } else {
          // Create new pane only for truly new groups
          const newPaneId = `pane_OBV_${index + 1}`;
          const result = $chart?.createIndicator(indicatorConfig, false, { id: newPaneId, axis: { gap: { bottom: 2 } } });
          
          // Store the pane ID for later reference
          if (result) {
            console.log(`✅ OBV ${index + 1} created with pane ID:`, newPaneId);
            group.actualPaneId = newPaneId;
          }
        }
      }
    });

    // Save OBV groups configuration
    save.update(s => {
      // Clear existing OBV data first
      Object.keys(s.saveInds).forEach(key => {
        if (s.saveInds[key].name === 'OBV') {
          delete s.saveInds[key];
        }
      });
      
      // Save each OBV group separately using KDJ pattern
      obvGroups.forEach((group, index) => {
        const saveKey = index === 0 ? `${$ctx.editPaneId}_OBV` : `pane_OBV_${index + 1}_OBV`;
        // Use actual pane ID if available, otherwise fallback to generated one
        const paneId = index === 0 ? $ctx.editPaneId : (group.actualPaneId || `pane_OBV_${index + 1}`);
        
        const saveData: any = {
          name: 'OBV',
          obvGroup: group,
          pane_id: paneId,
          groupIndex: index,
          obvGroups: index === 0 ? [...obvGroups] : undefined,
          params: [group.obvPeriod, group.maobvPeriod]
        };
        
        s.saveInds[saveKey] = saveData;
      });
      
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
  }

  function handleKdjConfirm() {
    console.log('🚀 handleKdjConfirm started');
    if (!isKdj) {
      console.log('❌ Not KDJ indicator, returning early');
      return;
    }
    
    try {
      console.log('🔄 Applying KDJ changes, groups:', kdjGroups.length);
      console.log('📊 Current KDJ groups data:', JSON.parse(JSON.stringify(kdjGroups)));
      
      // Don't clear existing indicators - just update them with current values
      // This preserves any immediate changes made by updateKdjIndicator
      console.log('🔄 Preserving existing indicators and updating with current values');
    
      // Apply each KDJ group - use updateKdjIndicator to ensure consistency
      kdjGroups.forEach((group, index) => {
        console.log(`🔄 Applying KDJ group ${index + 1} with current values`);
        updateKdjIndicator(index);
      });

    // Save KDJ groups configuration - update existing entries
    save.update((s: ChartSave) => {
      // Save each KDJ group separately
      kdjGroups.forEach((group, index) => {
        const saveKey = index === 0 ? `${$ctx.editPaneId}_KDJ` : `pane_KDJ_${index + 1}_KDJ`;
        // Use actual pane ID if available, otherwise fallback to generated one
        const paneId = index === 0 ? $ctx.editPaneId : (group.actualPaneId || `pane_KDJ_${index + 1}`);
        
        console.log(`💾 Updating saved KDJ group ${index + 1} with key:`, saveKey, 'pane ID:', paneId);
        
        s.saveInds[saveKey] = {
          name: 'KDJ',
          kdjGroup: group,
          pane_id: paneId,
          groupIndex: index,
          kdjGroups: index === 0 ? [...kdjGroups] : undefined, // Store all groups in first entry
          params: [group.kPeriod, group.dPeriod, 3]
        };
      });
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
    } catch (error) {
      console.error('❌ Error in handleKdjConfirm main logic:', error);
      // Even if there's an error in the main logic, we should still close the popup
      console.log('🔄 Forcing popup close due to error in main logic...');
      ctx.update(c => {
        c.editIndName = '';
        c.editPaneId = '';
        c.modalIndCfg = false;
        return c;
      });
      show = false;
      console.log('✅ Popup forcefully closed after error in main logic');
    }
  }

  function handleZigzagConfirm() {
    if (!isZigzag) return;
    
    // Create indicator styles for ZigZag
    const indicatorStyles: any = {
      lines: [
        {
          color: zigzagColor,
          size: zigzagThickness,
          style: zigzagLineStyle === 'solid' ? 0 : zigzagLineStyle === 'dashed' ? 1 : 2,
          smooth: false,
          dashedValue: [2, 2]
        }
      ]
    };

    // Update the ZigZag indicator
    $chart?.overrideIndicator({
      name: 'ZIGZAG',
      calcParams: [params[0], params[1]], // [deviation, depth]
      styles: indicatorStyles,
      paneId: $ctx.editPaneId
    });

    // Save ZigZag configuration
    save.update(s => {
      const saveKey = `${$ctx.editPaneId}_ZIGZAG`;
      const saveData: any = {
        name: 'ZIGZAG',
        pane_id: $ctx.editPaneId,
        params: [params[0], params[1]],
        styles: indicatorStyles
      };
      
      s.saveInds[saveKey] = saveData;
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
  }

  function handleAoConfirm() {
    if (!isAo) return;
    
    console.log('🔄 Applying AO changes, groups:', aoGroups.length);
    
    // Get existing AO indicators
    const existingAoKeys = Object.keys($save.saveInds).filter(key => 
      $save.saveInds[key].name === 'AO'
    ).sort((a, b) => {
      // Sort to prioritize editPaneId_AO first
      if (a === `${$ctx.editPaneId}_AO`) return -1;
      if (b === `${$ctx.editPaneId}_AO`) return 1;
      return a.localeCompare(b);
    });
    
    console.log('🔍 Existing AO keys:', existingAoKeys);
    
    // Remove excess indicators if needed
    const currentGroupCount = aoGroups.length;
    if (existingAoKeys.length > currentGroupCount) {
      console.log(`🗑️ Removing ${existingAoKeys.length - currentGroupCount} excess AO indicators`);
      for (let i = currentGroupCount; i < existingAoKeys.length; i++) {
        const key = existingAoKeys[i];
        const savedData = $save.saveInds[key];
        if (savedData && savedData.pane_id) {
          console.log('🗑️ Removing AO indicator from pane:', savedData.pane_id);
          try {
            $chart?.removeIndicator({ paneId: savedData.pane_id, name: 'AO' });
          } catch (error) {
            console.log('Error removing excess AO indicator:', error);
          }
        }
      }
    }
    
    // Apply each AO group
    aoGroups.forEach((group, index) => {
      const calcParams = [group.shortPeriod, group.longPeriod];
      
      // Create indicator styles for AO bars
      const indicatorStyles: any = {
        bars: [
          {
            upColor: group.styles.increasing.color,
            downColor: group.styles.decreasing.color,
            noChangeColor: '#888888'
          }
        ]
      };

      if (index === 0) {
        // Update first AO indicator in current pane
        console.log('🔄 Updating first AO indicator in pane:', $ctx.editPaneId);
        $chart?.overrideIndicator({
          name: 'AO',
          calcParams: calcParams,
          styles: indicatorStyles,
          paneId: $ctx.editPaneId
        });
      } else {
        // Handle additional AO indicators
        const expectedSaveKey = `pane_AO_${index + 1}_AO`;
        const existingGroup = existingAoKeys.find(key => key === expectedSaveKey);
        
        if (existingGroup) {
          // Update existing additional AO indicator
          const existingData = $save.saveInds[existingGroup];
          if (existingData && existingData.pane_id) {
            console.log(`🔄 Updating existing AO ${index + 1} in pane:`, existingData.pane_id);
            $chart?.overrideIndicator({
              name: 'AO',
              calcParams: calcParams,
              styles: indicatorStyles,
              paneId: existingData.pane_id
            });
          }
        } else {
          // Create new AO indicator
          const newPaneId = `pane_AO_${index + 1}`;
          console.log(`🆕 Creating new AO ${index + 1} with pane ID:`, newPaneId);
          $chart?.createIndicator({
            name: 'AO',
            calcParams: calcParams,
            styles: indicatorStyles
          }, true, { id: newPaneId });
        }
      }
    });

    // Save AO groups configuration
    save.update(s => {
      // Clear existing AO data first
      Object.keys(s.saveInds).forEach(key => {
        if (s.saveInds[key].name === 'AO') {
          delete s.saveInds[key];
        }
      });
      
      // Save each AO group separately
      aoGroups.forEach((group, index) => {
        const saveKey = index === 0 ? `${$ctx.editPaneId}_AO` : `pane_AO_${index + 1}_AO`;
        const paneId = index === 0 ? $ctx.editPaneId : `pane_AO_${index + 1}`;
        
        console.log(`💾 Saving AO group ${index + 1} with key:`, saveKey);
        
        s.saveInds[saveKey] = {
          name: 'AO',
          aoGroup: group,
          pane_id: paneId,
          groupIndex: index,
          aoGroups: index === 0 ? [...aoGroups] : undefined, // Store all groups in first entry
          params: [group.shortPeriod, group.longPeriod]
        };
      });
      return s;
    });
    
    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
  }



  function handleBollingerBandsConfirm() {
    if (!isBollingerBands) return;

    // Create custom styles for Bollinger Bands
    const indicatorStyles = {
      lines: [
        {
          color: bollingerUpperColor,
          size: bollingerThickness,
          style: bollingerLineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
          dashedValue: bollingerLineStyle === 'dashed' ? [4, 4] : [0, 0]
        },
        {
          color: bollingerMiddleColor,
          size: bollingerThickness,
          style: bollingerLineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
          dashedValue: bollingerLineStyle === 'dashed' ? [4, 4] : [0, 0]
        },
        {
          color: bollingerLowerColor,
          size: bollingerThickness,
          style: bollingerLineStyle === 'solid' ? kc.LineType.Solid : kc.LineType.Dashed,
          dashedValue: bollingerLineStyle === 'dashed' ? [4, 4] : [0, 0]
        }
      ],
      fill: {
        color: bollingerFillColor,
        opacity: bollingerFillOpacity / 100 // Convert percentage to decimal (0-1)
      }
    };

    $chart?.overrideIndicator({
      name: 'BOLL',
      calcParams: [bollingerPeriod, bollingerStdDev],
      styles: indicatorStyles,
      paneId: $ctx.editPaneId
    });

    // Save Bollinger Bands configuration
    save.update(s => {
      const saveData: any = {
        name: 'BOLL',
        pane_id: $ctx.editPaneId,
        params: [bollingerPeriod, bollingerStdDev],
        bollingerStyles: {
          fillColor: bollingerFillColor,
          fillOpacity: bollingerFillOpacity, // Save opacity percentage
          upperColor: bollingerUpperColor,
          middleColor: bollingerMiddleColor,
          lowerColor: bollingerLowerColor,
          thickness: bollingerThickness,
          lineStyle: bollingerLineStyle
        }
      };

      s.saveInds[`${$ctx.editPaneId}_BOLL`] = saveData;
      return s;
    });

    // Clear edit state
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });

    show = false;
  }

  function handleConfirm(from: string) {
    console.log('🔄 handleConfirm called with:', from);
    console.log('📊 Current context:', {
      editIndName: $ctx.editIndName,
      editPaneId: $ctx.editPaneId,
      isKdj: isKdj,
      kdjGroups: kdjGroups
    });
    
    if (from === 'close' || from === 'cancel') {
      // If this is a BBI indicator being edited and user clicks close (X button), delete the indicator
      if (from === 'close' && isBbi && $ctx.editIndName && $ctx.editPaneId) {
        // Delete the BBI indicator from chart and save data
        const bbiEntries = Object.entries($save.saveInds).filter(([key, ind]) => ind.name === 'BBI');
        bbiEntries.forEach(([key, ind]) => {
          delInd(ind.pane_id, 'BBI');
        });
        
        // Clear all BBI-related saved data
        save.update(s => {
          Object.keys(s.saveInds).forEach(key => {
            if (s.saveInds[key].name === 'BBI') {
              delete s.saveInds[key];
            }
          });
          return s;
        });
      }
      
      // Clear edit state to prevent modal from getting stuck
      ctx.update(c => {
        c.editIndName = '';
        c.editPaneId = '';
        c.modalIndCfg = false;
        return c;
      });
      
      show = false;
      return;
    }
    
    // Handle MACD groups specially
    if (from === 'confirm' && isMacd && $ctx.editIndName && $ctx.editPaneId) {
      handleMacdConfirm();
      return;
    }
    
    // Handle PVT groups specially - apply all changes to chart and save
    if (from === 'confirm' && isPvt && $ctx.editIndName && $ctx.editPaneId) {
      console.log('🔄 PVT Confirm: Applying all changes to chart');
      
      // Apply all PVT group changes to chart
      pvtGroups.forEach((group, index) => {
        console.log(`🔄 Applying PVT group ${index}:`, group);
        updatePvtIndicator(index);
      });
      
      // Save PVT groups
      save.update(s => {
        const saveKey = `${$ctx.editPaneId}_PVT`;
        s.saveInds[saveKey] = {
          ...s.saveInds[saveKey],
          pvtGroups: [...pvtGroups]
        };
        console.log('💾 Saved PVT groups to:', saveKey);
        return s;
      });
      
      // Clear edit state
      ctx.update(c => {
        c.editIndName = '';
        c.editPaneId = '';
        c.modalIndCfg = false;
        return c;
      });
      
      show = false;
      return;
    }
    
    // Handle CR specially
    if (from === 'confirm' && isCr && $ctx.editIndName && $ctx.editPaneId) {
      handleCrConfirm();
      return;
    }
    
    // Handle Williams %R groups specially
    if (from === 'confirm' && isWr && $ctx.editIndName && $ctx.editPaneId) {
      handleWrConfirm();
      return;
    }
    
    // Handle VR groups specially
    if (from === 'confirm' && isVr && $ctx.editIndName && $ctx.editPaneId) {
      handleVrConfirm();
      return;
    }
    
    // Handle Volume groups specially
    if (from === 'confirm' && isVol && $ctx.editIndName && $ctx.editPaneId) {
      handleVolConfirm();
      return;
    }
    
    // Handle BBI groups specially
    if (from === 'confirm' && isBbi && $ctx.editIndName && $ctx.editPaneId) {
      handleBbiConfirm();
      return;
    }

    // Handle EMV groups specially
    if (from === 'confirm' && isEmv && $ctx.editIndName && $ctx.editPaneId) {
      handleEmvConfirm();
      return;
    }
    
    // Handle MTM groups specially
    if (from === 'confirm' && isMtm && $ctx.editIndName && $ctx.editPaneId) {
      handleMtmConfirm();
      return;
    }
    
    // Handle BIAS groups specially
    if (from === 'confirm' && isBias && $ctx.editIndName && $ctx.editPaneId) {
      handleBiasConfirm();
      return;
    }

    // Handle CCI groups specially
    if (from === 'confirm' && isCci && $ctx.editIndName && $ctx.editPaneId) {
      handleCciConfirm();
      return;
    }

    // Handle SAR groups specially
    if (from === 'confirm' && isSar && $ctx.editIndName && $ctx.editPaneId) {
      handleSarConfirm();
      return;
    }
    
    // Handle DMI groups specially
    if (from === 'confirm' && isDmi && $ctx.editIndName && $ctx.editPaneId) {
      handleDmiConfirm();
      return;
    }
    
    // Handle ROC groups specially
    if (from === 'confirm' && isRoc && $ctx.editIndName && $ctx.editPaneId) {
      handleRocConfirm();
      return;
    }
    
    // Handle PSY groups specially
    if (from === 'confirm' && isPsy && $ctx.editIndName && $ctx.editPaneId) {
      handlePsyConfirm();
      return;
    }
    
    // Handle OBV groups specially
    if (from === 'confirm' && isObv && $ctx.editIndName && $ctx.editPaneId) {
      handleObvConfirm();
      return;
    }
    
    // Handle KDJ groups specially
    if (from === 'confirm' && isKdj && $ctx.editIndName && $ctx.editPaneId) {
      console.log('✅ KDJ confirm condition met, calling handleKdjConfirm');
      handleKdjConfirm();
      return;
    }
    
    // Handle AO groups specially
    if (from === 'confirm' && isAo && $ctx.editIndName && $ctx.editPaneId) {
      handleAoConfirm();
      return;
    }
    
    // Handle Bollinger Bands specially
    if (from === 'confirm' && isBollingerBands && $ctx.editIndName && $ctx.editPaneId) {
      handleBollingerBandsConfirm();
      return;
    }
    
    // Handle ZigZag specially
    console.log('🔍 Checking ZigZag conditions:', {
      from,
      isZigzag,
      editIndName: $ctx.editIndName,
      editPaneId: $ctx.editPaneId
    });
    
    if (from === 'confirm' && isZigzag && $ctx.editIndName && $ctx.editPaneId) {
      console.log('🎯 ZigZag confirm clicked');
      
      // Create indicator styles for ZigZag
      const indicatorStyles: any = {
        lines: [
          {
            color: zigzagColor,
            size: zigzagThickness,
            style: zigzagLineStyle === 'solid' ? 0 : zigzagLineStyle === 'dashed' ? 1 : 2,
            smooth: false,
            dashedValue: [2, 2]
          }
        ]
      };

      console.log('🎯 ZigZag styles:', indicatorStyles);

      // Update the ZigZag indicator
      try {
        $chart?.overrideIndicator({
          name: 'ZIGZAG',
          calcParams: [params[0], params[1]], // [deviation, depth]
          styles: indicatorStyles,
          paneId: $ctx.editPaneId
        });
        console.log('✅ ZigZag indicator updated');
      } catch (error) {
        console.error('❌ Error updating ZigZag:', error);
      }

      // Save ZigZag configuration
      save.update(s => {
        const saveKey = `${$ctx.editPaneId}_ZIGZAG`;
        const saveData: any = {
          name: 'ZIGZAG',
          pane_id: $ctx.editPaneId,
          params: [params[0], params[1]],
          styles: indicatorStyles
        };
        
        s.saveInds[saveKey] = saveData;
        console.log('💾 ZigZag saved:', saveData);
        return s;
      });
      
      // Clear edit state
      ctx.update(c => {
        c.editIndName = '';
        c.editPaneId = '';
        c.modalIndCfg = false;
        return c;
      });
      
      console.log('🚪 Closing ZigZag popup, show before:', show);
      show = false;
      console.log('🚪 Show after setting false:', show);
      
      // Force close the modal
      setTimeout(() => {
        console.log('🚪 Force closing ZigZag popup after timeout');
        show = false;
      }, 100);
      
      return;
    }
    
    if (from !== 'confirm' || !$ctx.editIndName || !$ctx.editPaneId || fields.length === 0) {
      show = false;
      return;
    }
    
    const result: unknown[] = [];
    const indicatorStyles: any = {
      lines: [],
      bars: []
    };
    
    // Separate numeric parameters from color parameters
    params.forEach((param: any, i: number) => {
      const field = fields[i];
      
      if (field && field.type === 'color') {
        // Handle color parameters - apply to bars style
        const styleKey = (field as any).styleKey;
        if (styleKey) {
          const match = styleKey.match(/^(\w+)\[(\d+)\]\.(\w+)$/);
          if (match) {
            const [, category, index, prop] = match;
            const idx = parseInt(index);
            
            if (!indicatorStyles[category]) indicatorStyles[category] = [];
            if (!indicatorStyles[category][idx]) indicatorStyles[category][idx] = {};
            indicatorStyles[category][idx][prop] = param || field.default;
          }
        }
      } else {
        // Handle numeric parameters
        if (!kc.utils.isValid(param) || param === '') {
          if (field && field.default) {
            param = field.default
          }
        }
        if(param){
          result.push(Number(param))
        }
      }
    });
    
    // Apply line styling from styles array
    styles.forEach((style, index) => {
      let lineStyle = kc.LineType.Solid;
      let dashedValue = [2, 2];
      
      if (style.lineStyle === 'dashed') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [4, 4];
      } else if (style.lineStyle === 'dotted') {
        lineStyle = kc.LineType.Dashed;
        dashedValue = [2, 6]; // Short dash, long gap for dotted effect
      }
      
      indicatorStyles.lines[index] = {
        color: style.color,
        size: style.thickness,
        style: lineStyle,
        dashedValue: dashedValue
      };
    });

    $chart?.overrideIndicator({
      name: $ctx.editIndName,
      calcParams: result,
      styles: indicatorStyles,
      paneId: $ctx.editPaneId
    });

    save.update(s => {
      const saveData: any = {
        name: $ctx.editIndName,
        params: result,
        pane_id: $ctx.editPaneId,
        styles: [...styles] // Save styling configuration
      };
      
      // Only save custom fields for non-Bollinger Bands indicators
      if (!isBollingerBands) {
        saveData.fields = [...fields];
      }
      
      s.saveInds[`${$ctx.editPaneId}_${$ctx.editIndName}`] = saveData;
      return s
    })
    
    // Clear edit state after confirming changes
    ctx.update(c => {
      c.editIndName = '';
      c.editPaneId = '';
      c.modalIndCfg = false;
      return c;
    });
    
    show = false;
  }

</script>

<Modal title={$ctx.editIndName} width="min(90vw, 800px)" maxHeight="90vh" bind:show={show} click={handleConfirm}>
  <div class="responsive-modal-content">
    {#if isMacd}
    <!-- MACD Minimalist UI -->
    <div class="space-y-2 mt-3">
      {#each macdGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- MACD Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">MACD {groupIndex + 1}</span>
            {#if macdGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeMacdGroup(group.id)}
                title="Remove MACD"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
          
          <!-- Parameters Row -->
          <div class="grid grid-cols-3 gap-2 sm:gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Fast</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.fastPeriod} 
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Slow</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.slowPeriod} 
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Signal</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.signalPeriod} 
                min="1"
              />
            </div>
          </div>
          
          <!-- MACD Line Style -->
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">MACD:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showMacdLineColorPaletteHandler}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.macd.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.macd.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.macd.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            
            <!-- Signal Line Style -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">Signal:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showMacdSignalColorPaletteHandler}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.signal.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.signal.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.signal.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            
            <!-- Histogram Style -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">Hist:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showMacdHistColorPaletteHandler}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.histogram.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.histogram.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.histogram.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>


        </div>
      {/each}
      
      <!-- Add More MACD Button -->
      <div class="flex justify-center mt-3">
        <button 
          class="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1" 
          onclick={addMacdGroup}
          title="Add More MACD"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add MACD</span>
        </button>
      </div>
    </div>
  {:else if isRsi}
    <!-- RSI Minimalist UI -->
    <div class="space-y-2 mt-3">
      {#each rsiGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- RSI Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">RSI {groupIndex + 1}</span>
            {#if rsiGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeRsiGroup(groupIndex)}
                title="Remove RSI"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>

          <!-- RSI Parameters -->
          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <!-- Period -->
            <div class="space-y-1">
              <label class="text-xs text-base-content/70">Period</label>
              <input 
                type="number" 
                class="input input-xs w-full bg-base-100 border-base-300 text-xs" 
                bind:value={group.period}
                onchange={() => updateRsiIndicator(groupIndex)}
                min="1" 
                max="100"
              />
            </div>

            <!-- Overbought Level -->
            <div class="space-y-1">
              <label class="text-xs text-base-content/70">Overbought</label>
              <input 
                type="number" 
                class="input input-xs w-full bg-base-100 border-base-300 text-xs" 
                bind:value={group.overboughtLevel}
                onchange={() => updateRsiIndicator(groupIndex)}
                min="50" 
                max="100"
              />
            </div>

            <!-- Middle Level -->
            <div class="space-y-1">
              <label class="text-xs text-base-content/70">Middle</label>
              <input 
                type="number" 
                class="input input-xs w-full bg-base-100 border-base-300 text-xs" 
                bind:value={group.middleLevel}
                onchange={() => updateRsiIndicator(groupIndex)}
                min="0" 
                max="100"
              />
            </div>

            <!-- Oversold Level -->
            <div class="space-y-1">
              <label class="text-xs text-base-content/70">Oversold</label>
              <input 
                type="number" 
                class="input input-xs w-full bg-base-100 border-base-300 text-xs" 
                bind:value={group.oversoldLevel}
                onchange={() => updateRsiIndicator(groupIndex)}
                min="0" 
                max="50"
              />
            </div>
          </div>

          <!-- RSI Line Style -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-base-content/70">RSI Line</span>
              <div class="flex items-center gap-2">
                <!-- Color -->
                <button 
                  class="w-6 h-6 rounded border border-base-300 flex-shrink-0"
                  style="background-color: {group.styles.rsi.color}"
                  onclick={(e) => {
                    rsiColorPaletteIndex = groupIndex;
                    const rect = e.currentTarget.getBoundingClientRect();
                    rsiColorPalettePosition = { 
                      x: rect.left + rect.width / 2, 
                      y: rect.bottom + 5 
                    };
                    showRsiColorPalette = true;
                  }}
                  title="Change RSI Color"
                ></button>
                
                <!-- Thickness -->
                <select 
                  class="select select-xs bg-base-100 border-base-300 text-xs min-h-0 h-6 w-12"
                  bind:value={group.styles.rsi.thickness}
                  onchange={() => updateRsiIndicator(groupIndex)}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
                
                <!-- Line Style -->
                <select 
                  class="select select-xs bg-base-100 border-base-300 text-xs min-h-0 h-6 w-16"
                  bind:value={group.styles.rsi.lineStyle}
                  onchange={() => updateRsiIndicator(groupIndex)}
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Color Customization Section -->
          <div class="space-y-2 border-t border-base-200 pt-2">
            <span class="text-xs text-base-content/70 font-medium">Zone Colors</span>
            
            <!-- Overbought Color -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-base-content/60">Overbought</span>
              <button 
                class="w-6 h-6 rounded border border-base-300 flex-shrink-0"
                style="background-color: {group.styles.overboughtColor || '#EF4444'}"
                onclick={(e) => {
                  rsiColorPaletteGroupIndex = groupIndex;
                  const rect = e.currentTarget.getBoundingClientRect();
                  rsiOverboughtColorPalettePosition = { 
                    x: rect.left + rect.width / 2, 
                    y: rect.bottom + 5 
                  };
                  showRsiOverboughtColorPalette = true;
                }}
                title="Change Overbought Color"
              ></button>
            </div>

            <!-- Oversold Color -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-base-content/60">Oversold</span>
              <button 
                class="w-6 h-6 rounded border border-base-300 flex-shrink-0"
                style="background-color: {group.styles.oversoldColor || '#10B981'}"
                onclick={(e) => {
                  rsiColorPaletteGroupIndex = groupIndex;
                  const rect = e.currentTarget.getBoundingClientRect();
                  rsiOversoldColorPalettePosition = { 
                    x: rect.left + rect.width / 2, 
                    y: rect.bottom + 5 
                  };
                  showRsiOversoldColorPalette = true;
                }}
                title="Change Oversold Color"
              ></button>
            </div>

            <!-- Middle Line Color -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-base-content/60">Middle Line</span>
              <button 
                class="w-6 h-6 rounded border border-base-300 flex-shrink-0"
                style="background-color: {group.styles.middleLineColor || '#6B7280'}"
                onclick={(e) => {
                  rsiColorPaletteGroupIndex = groupIndex;
                  const rect = e.currentTarget.getBoundingClientRect();
                  rsiMiddleLineColorPalettePosition = { 
                    x: rect.left + rect.width / 2, 
                    y: rect.bottom + 5 
                  };
                  showRsiMiddleLineColorPalette = true;
                }}
                title="Change Middle Line Color"
              ></button>
            </div>
          </div>
        </div>
      {/each}

      <!-- Add RSI Button -->
      <div class="flex justify-center mt-3">
        <button 
          class="btn btn-xs btn-outline btn-primary gap-1 sm:gap-2"
          onclick={addRsiGroup}
          title="Add More RSI"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add RSI</span>
        </button>
      </div>
    </div>
  {:else if isDmi}
    <!-- DMI Minimalist UI -->
    <div class="space-y-2 mt-3">
      {#each dmiGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- DMI Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">DMI {groupIndex + 1}</span>
            {#if dmiGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeDmiGroup(group.id)}
                title="Remove DMI"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
          
          <!-- Parameters Row -->
          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">DI Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.diPeriod} 
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">ADX Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.adxPeriod} 
                min="1"
              />
            </div>
          </div>
          
          <!-- DMI Line Styles -->
          <div class="space-y-2">
            <!-- DI+ Line Style -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">DI+:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showDmiColorPaletteHandler(groupIndex, 'diPlus')}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.diPlus.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.diPlus.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.diPlus.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            
            <!-- DI- Line Style -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">DI-:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showDmiColorPaletteHandler(groupIndex, 'diMinus')}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.diMinus.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.diMinus.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.diMinus.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            
            <!-- ADX Line Style -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">ADX:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showDmiColorPaletteHandler(groupIndex, 'adx')}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.adx.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.adx.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.adx.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More DMI Button -->
      <div class="flex justify-center mt-3">
        <button 
          class="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1" 
          onclick={addDmiGroup}
          title="Add More DMI"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add DMI</span>
        </button>
      </div>
    </div>
  {:else if isWr}
    <!-- Williams %R Enhanced UI -->
    <div class="space-y-2 mt-3">
      {#each wrGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- Williams %R Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">Williams %R {groupIndex + 1}</span>
            {#if wrGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeWrGroup(group.id)}
                title="Remove Williams %R"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
          
          <!-- Parameters Row -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.period} 
                min="1"
                onchange={() => updateWrIndicator(groupIndex)}
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Overbought</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.overboughtLevel} 
                min="-50" 
                max="0"
                onchange={() => updateWrIndicator(groupIndex)}
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Middle</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.middleLevel} 
                min="-70" 
                max="-30"
                onchange={() => updateWrIndicator(groupIndex)}
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Oversold</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.oversoldLevel} 
                min="-100" 
                max="-50"
                onchange={() => updateWrIndicator(groupIndex)}
              />
            </div>
          </div>
          
          <!-- WR Line Style -->
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">WR Line:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showWrColorPaletteHandler(groupIndex)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.wr.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.wr.thickness} onchange={() => updateWrIndicator(groupIndex)}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.wr.lineStyle} onchange={() => updateWrIndicator(groupIndex)}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
          
          <!-- Level Lines Configuration -->
          <div class="space-y-2">
            <div class="text-xs font-medium text-base-content/80 border-b border-base-200 pb-1">Level Lines</div>
            
            <!-- Overbought Line -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-20 font-medium">Overbought:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showWrOverboughtColorPaletteHandler(groupIndex)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.overbought.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.overbought.thickness} onchange={() => updateWrIndicator(groupIndex)}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.overbought.lineStyle} onchange={() => updateWrIndicator(groupIndex)}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            
            <!-- Middle Line -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-20 font-medium">Middle:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showWrMiddleLineColorPaletteHandler(groupIndex)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.middleLine.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.middleLine.thickness} onchange={() => updateWrIndicator(groupIndex)}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.middleLine.lineStyle} onchange={() => updateWrIndicator(groupIndex)}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            
            <!-- Oversold Line -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-20 font-medium">Oversold:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showWrOversoldColorPaletteHandler(groupIndex)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.oversold.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.oversold.thickness} onchange={() => updateWrIndicator(groupIndex)}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.oversold.lineStyle} onchange={() => updateWrIndicator(groupIndex)}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More Williams %R Button -->
      <div class="flex justify-center mt-3">
        <button 
          class="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1" 
          onclick={addWrGroup}
          title="Add More Williams %R"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add Williams %R</span>
        </button>
      </div>
    </div>
  {:else if isVr}
    <!-- VR Minimalist UI -->
    <div class="space-y-2 mt-3">
      {#each vrGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- VR Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">VR {groupIndex + 1}</span>
            {#if vrGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeVrGroup(groupIndex)}
                title="Remove VR"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
          
          <!-- Parameters Row -->
          <div class="grid grid-cols-3 gap-2 sm:gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.period} 
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Short Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.shortPeriod} 
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Long Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.longPeriod} 
                min="1"
              />
            </div>
          </div>
          
          <!-- VR Main Line Style Controls -->
          <div class="space-y-2">
            <div class="text-xs font-medium text-base-content/70">VR Main Line</div>
            <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
                <button 
                  class="btn btn-sm btn-outline"
                  onclick={showVrColorPaletteHandler(groupIndex, 'vr')}
                >
                  <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.vr.color}"></div>
                </button>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
                <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.vr.thickness} onchange={() => updateVrIndicator(groupIndex)}>
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                  <option value={5}>5px</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
                <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.vr.lineStyle} onchange={() => updateVrIndicator(groupIndex)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- VR Short Line Style Controls -->
          <div class="space-y-2">
            <div class="text-xs font-medium text-base-content/70">VR Short Line</div>
            <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
                <button 
                  class="btn btn-sm btn-outline"
                  onclick={showVrColorPaletteHandler(groupIndex, 'vrShort')}
                >
                  <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.vrShort.color}"></div>
                </button>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
                <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.vrShort.thickness} onchange={() => updateVrIndicator(groupIndex)}>
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                  <option value={5}>5px</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
                <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.vrShort.lineStyle} onchange={() => updateVrIndicator(groupIndex)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- VR Long Line Style Controls -->
          <div class="space-y-2">
            <div class="text-xs font-medium text-base-content/70">VR Long Line</div>
            <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
                <button 
                  class="btn btn-sm btn-outline"
                  onclick={showVrColorPaletteHandler(groupIndex, 'vrLong')}
                >
                  <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.vrLong.color}"></div>
                </button>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
                <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.vrLong.thickness} onchange={() => updateVrIndicator(groupIndex)}>
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                  <option value={5}>5px</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
                <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.vrLong.lineStyle} onchange={() => updateVrIndicator(groupIndex)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More VR Button -->
      <div class="flex justify-center mt-3">
        <button 
          class="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1" 
          onclick={addVrGroup}
          title="Add More VR"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add More VR</span>
        </button>
      </div>
    </div>
  {:else if isBbi}
    <!-- BBI Minimalist UI -->
    <div class="space-y-2 mt-3">
      {#each bbiGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- BBI Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">BBI {groupIndex + 1}</span>
            {#if bbiGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeBbiGroup(group.id)}
                title="Remove BBI"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
          
          <!-- Periods Row -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">P1</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.period1} 
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">P2</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.period2} 
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">P3</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.period3} 
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">P4</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.period4} 
                min="1"
              />
            </div>
          </div>
          
          <!-- Style Controls Row -->
          <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showBbiColorPaletteHandler(groupIndex)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.color}"></div>
              </button>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More BBI Button -->
      <div class="flex justify-center mt-3">
        <button 
          class="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1" 
          onclick={addBbiGroup}
          title="Add More BBI"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add BBI</span>
        </button>
      </div>
    </div>
  {:else if isEmv}
    <!-- EMV Minimalist UI -->
    <div class="space-y-2 mt-3">
      {#each emvGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- EMV Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">{group.name}</span>
            {#if emvGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeEmvGroup(group.id)}
                title="Remove EMV"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
          
          <!-- Parameters Row -->
          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Period 1</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.period} 
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Period 2</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.period2} 
                min="1"
              />
            </div>
          </div>
          
          <!-- Style Controls Row -->
          <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showEmvColorPaletteHandler}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.color}"></div>
              </button>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More EMV Button -->
      <div class="flex justify-center mt-3">
        <button 
          class="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1" 
          onclick={addEmvGroup}
          title="Add More EMV"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add EMV</span>
        </button>
      </div>
    </div>
  {:else if isMtm}
    <!-- MTM Minimalist UI -->
    <div class="space-y-2 mt-3">
      {#each mtmGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- MTM Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">{group.name}</span>
            {#if mtmGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeMtmGroup(group.id)}
                title="Remove MTM"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
          
          <!-- Parameters Row -->
          <div class="grid grid-cols-1 gap-2 sm:gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.period} 
                min="1"
              />
            </div>
          </div>
          
          <!-- Style Controls Row -->
          <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showMtmColorPaletteHandler(groupIndex)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.color}"></div>
              </button>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More MTM Button -->
      <div class="flex justify-center mt-3">
        <button 
          class="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1" 
          onclick={addMtmGroup}
          title="Add More MTM"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add MTM</span>
        </button>
      </div>
    </div>
  {:else if isAo}
    <!-- AO Groups UI -->
    <div class="space-y-2 mt-3">
      {#each aoGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- AO Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">
              {groupIndex === 0 ? 'Awesome Oscillator' : `AO ${groupIndex + 1}`}
            </span>
            <button
              class="btn btn-xs btn-ghost text-error hover:bg-error/10"
              onclick={() => removeAoGroup(group.id)}
              title="Remove this AO"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Parameters Section -->
          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Short Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                min="1"
                bind:value={group.shortPeriod}
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Long Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                min="1"
                bind:value={group.longPeriod}
              />
            </div>
          </div>
          
          <!-- Color Section -->
          <div class="border-t border-base-300 pt-2 mt-2">
            <label class="text-xs text-base-content/60 mb-2 block">Histogram Colors</label>
            <div class="grid grid-cols-1 gap-2">
              <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-base-100 border border-base-200">
                <span class="text-xs text-base-content/70 flex-1">Increasing Color</span>
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded border-2 border-base-300" style="background-color: {group.styles.increasing.color}"></div>
                  <button 
                    class="btn btn-sm btn-outline"
                    onclick={showCustomAoColorPaletteHandler(groupIndex * 2)}
                  >
                    <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.increasing.color}"></div>
                  </button>
                </div>
              </div>
              <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-base-100 border border-base-200">
                <span class="text-xs text-base-content/70 flex-1">Decreasing Color</span>
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded border-2 border-base-300" style="background-color: {group.styles.decreasing.color}"></div>
                  <button 
                    class="btn btn-sm btn-outline"
                    onclick={showCustomAoColorPaletteHandler(groupIndex * 2 + 1)}
                  >
                    <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.decreasing.color}"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More AO Button -->
      <div class="flex justify-center mt-3">
        <button 
          class="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1" 
          onclick={addAoGroup}
          title="Add More Awesome Oscillator"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add More AO</span>
        </button>
      </div>
    </div>

  {:else if isCr}
    <!-- CR (Energy Index) Indicator Groups UI -->
    <div class="space-y-2 mt-3">
      {#each crGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- CR Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">CR {groupIndex + 1}</span>
            {#if crGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeCrGroup(group.id)}
                title="Remove CR"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
          
          <!-- Parameters Section -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">CR Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.crPeriod}
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">MA1 Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.crMa1Period}
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">MA2 Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.crMa2Period}
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">MA3 Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.crMa3Period}
                min="1"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">MA4 Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.crMa4Period}
                min="1"
              />
            </div>
          </div>
          
          <!-- CR Line Styles -->
          <div class="space-y-2">
            <!-- CR Line Style -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">CR:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showCrColorPaletteHandler(groupIndex, 'cr')}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.cr.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.cr.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.cr.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            
            <!-- MA1 Line Style -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">MA1:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showCrColorPaletteHandler(groupIndex, 'ma1')}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.ma1.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.ma1.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.ma1.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            
            <!-- MA2 Line Style -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">MA2:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showCrColorPaletteHandler(groupIndex, 'ma2')}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.ma2.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.ma2.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.ma2.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            
            <!-- MA3 Line Style -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">MA3:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showCrColorPaletteHandler(groupIndex, 'ma3')}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.ma3.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.ma3.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.ma3.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            
            <!-- MA4 Line Style -->
            <div class="flex items-center gap-2 text-xs text-base-content/70">
              <span class="w-12 font-medium">MA4:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showCrColorPaletteHandler(groupIndex, 'ma4')}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.ma4.color}"></div>
              </button>
              <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.ma4.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.ma4.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More CR Button -->
      <div class="flex justify-center mt-3">
        <button 
          class="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1" 
          onclick={addCrGroup}
          title="Add More CR"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add CR</span>
        </button>
      </div>
    </div>

  {:else if isZigzag}
    <!-- ZigZag Custom UI -->
    <div class="space-y-2 mt-3">
      <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
        <!-- ZigZag Header -->
        <div class="flex items-center justify-between">
          <span class="text-xs sm:text-sm font-medium text-base-content/80">ZigZag Indicator</span>
        </div>
        
        <!-- Parameters Section - Vertical Layout -->
        <div class="space-y-3">
          <!-- Deviation % -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-base-content/60">Deviation %</label>
            <input 
              type="number" 
              class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
              min="1"
              max="50"
              step="0.1"
              bind:value={params[0]}
            />
          </div>
          
          <!-- Depth -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-base-content/60">Depth</label>
            <input 
              type="number" 
              class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
              min="1"
              max="50"
              bind:value={params[1]}
            />
          </div>
        </div>
        
        <!-- Style Section -->
        <div class="border-t border-base-300 pt-2 mt-2">
          <label class="text-xs text-base-content/60 mb-2 block">ZigZag Line Style</label>
          <div class="space-y-3">
            <!-- Color -->
            <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-base-100 border border-base-200">
              <span class="text-xs text-base-content/70 flex-1">Line Color</span>
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded border-2 border-base-300" style="background-color: {zigzagColor}"></div>
                <button 
                  class="btn btn-sm btn-outline"
                  onclick={showZigzagColorPaletteHandler}
                >
                  <div class="w-4 h-4 rounded border border-base-300" style="background-color: {zigzagColor}"></div>
                </button>
              </div>
            </div>
            
            <!-- Thickness -->
            <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-base-100 border border-base-200">
              <span class="text-xs text-base-content/70 flex-1">Line Thickness</span>
              <select 
                class="select select-bordered select-xs w-20" 
                bind:value={zigzagThickness}
              >
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
            </div>
            
            <!-- Line Style -->
            <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-base-100 border border-base-200">
              <span class="text-xs text-base-content/70 flex-1">Line Style</span>
              <select 
                class="select select-bordered select-xs w-24" 
                bind:value={zigzagLineStyle}
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  {:else if isPvt}
    <!-- PVT Multi-Instance UI -->
    <div class="space-y-2 mt-3">
      {#each pvtGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- PVT Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">{group.name} (ID: {group.id.slice(0, 8)})</span>
            {#if pvtGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removePvtGroup(groupIndex)}
                title="Delete this PVT instance"
              >
                ✕
              </button>
            {/if}
          </div>
          
          <!-- Style Controls Row -->
          <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showPvtColorPaletteHandler(groupIndex)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.color}"></div>
              </button>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
              <select 
                class="select select-bordered select-xs w-16 sm:w-20 text-xs"
                bind:value={group.thickness}
                onchange={(e) => {
                  if (e.target) {
                    group.thickness = parseInt((e.target as HTMLSelectElement).value);
                    updatePvtIndicator(groupIndex);
                  }
                }}
              >
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
              <select 
                class="select select-bordered select-xs w-20 sm:w-24 text-xs"
                bind:value={group.lineStyle}
                onchange={(e) => {
                  if (e.target) {
                    group.lineStyle = (e.target as HTMLSelectElement).value;
                    updatePvtIndicator(groupIndex);
                  }
                }}
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More PVT Button -->
      <div class="flex justify-center mt-3">
        <button 
          class="btn btn-sm btn-primary"
          onclick={addPvtGroup}
        >
          ➕ Add More PVT
        </button>
      </div>
    </div>
  {:else if isSar}
    <!-- SAR Minimalist UI -->
    <div class="space-y-2 mt-3">
      {#each sarGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- SAR Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">SAR {groupIndex + 1}</span>
            {#if sarGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeSarGroup(group.id)}
                title="Remove SAR Group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>
          
          <!-- SAR Parameters Row -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Start</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.start} 
                min="0.001" 
                max="0.1" 
                step="0.001"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Increment</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.increment} 
                min="0.001" 
                max="0.1" 
                step="0.001"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Max value</label>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                bind:value={group.maxValue} 
                min="0.1" 
                max="1.0" 
                step="0.01"
              />
            </div>
          </div>
          
          <!-- Style Controls Row -->
          <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4">
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showSarColorPaletteHandler(groupIndex)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.color}"></div>
              </button>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Dot size:</label>
              <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.dotSize}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if isEma}
    <!-- EMA Specific UI -->
    <div class="space-y-3 sm:space-y-4 mt-3 sm:mt-5">
      {#each fields as field, i}
        <div class="border border-base-300 rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- Parameter Value -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span class="w-full sm:w-20 text-base-content/70 text-sm font-medium min-w-fit">{field.title}</span>
            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <input type="number" class="flex-1 input input-bordered input-sm min-w-0" bind:value={params[i]} onchange={() => updateEmaIndicator()}/>
              {#if params.length > 1}
                <button 
                  class="btn btn-sm btn-circle btn-ghost text-error hover:bg-error/10 flex-shrink-0" 
                  onclick={() => deleteParam(i)}
                  title="Delete EMA parameter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              {:else}
                <div class="w-8 flex-shrink-0"></div>
              {/if}
            </div>
          </div>
          
          <!-- Styling Controls -->
          {#if styles[i]}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <!-- Color Picker -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showEmaColorPaletteHandler(i)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {styles[i].color}"></div>
              </button>
            </div>
            
            <!-- Thickness Dropdown -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
              <select class="select select-bordered select-xs flex-1 min-w-0" bind:value={styles[i].thickness} onchange={() => updateEmaIndicator()}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
            </div>
            
            <!-- Line Style Selector -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
              <select class="select select-bordered select-xs flex-1 min-w-0" bind:value={styles[i].lineStyle} onchange={() => updateEmaIndicator()}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
          {/if}
        </div>
      {/each}
      
      <!-- Add EMA Parameter Button -->
      {#if fields.length < 10}
        <div class="flex justify-center mt-4">
          <button 
            class="btn btn-sm btn-outline btn-primary" 
            onclick={addParam}
            title="Add more EMA"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M12 4v16m8-8H4" />
            </svg>
            Add EMA
          </button>
        </div>
      {/if}
    </div>
  {:else if isVol}
    <!-- Volume Groups UI (VR-style implementation) -->
    <div class="space-y-3 mt-3">
      {#each volGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- Volume Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">Volume {groupIndex + 1}</span>
            {#if volGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeVolGroup(groupIndex)}
                title="Remove Volume"
              >
                <span class="text-xs">×</span>
              </button>
            {:else}
              <div class="w-6"></div>
            {/if}
          </div>

          <!-- Volume Parameters -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <!-- Period -->
            <div class="flex flex-col gap-1">
              <label class="text-xs text-base-content/60">Period</label>
              <input 
                type="number" 
                class="input input-bordered input-xs" 
                bind:value={group.period}
                onchange={() => updateVolIndicator(groupIndex)}
                min="1"
                max="200"
              />
            </div>
          </div>

          <!-- Volume Histogram Styling -->
          <div class="space-y-2">
            <h4 class="text-xs font-medium text-base-content/70">Volume Histogram</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <!-- Increasing Color -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Up Color:</label>
                <button 
                  class="btn btn-xs btn-outline"
                  onclick={showVolGroupColorPaletteHandler(groupIndex, 'histogram')}
                >
                  <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.histogram.upColor}"></div>
                </button>
              </div>
              
              <!-- Decreasing Color -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Down Color:</label>
                <button 
                  class="btn btn-xs btn-outline"
                  onclick={showVolGroupColorPaletteHandler(groupIndex, 'histogram-down')}
                >
                  <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.histogram.downColor}"></div>
                </button>
              </div>
            </div>
          </div>

          <!-- EMA Line Styling -->
          <div class="space-y-2">
            <h4 class="text-xs font-medium text-base-content/70">EMA Line</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <!-- EMA Color -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
                <button 
                  class="btn btn-xs btn-outline"
                  onclick={showVolGroupColorPaletteHandler(groupIndex, 'ema')}
                >
                  <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.ema.color}"></div>
                </button>
              </div>
              
              <!-- EMA Thickness -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
                <select 
                  class="select select-bordered select-xs flex-1 min-w-0" 
                  bind:value={group.styles.ema.thickness}
                  onchange={() => updateVolIndicator(groupIndex)}
                >
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                  <option value={5}>5px</option>
                </select>
              </div>
              
              <!-- EMA Line Style -->
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
                <select 
                  class="select select-bordered select-xs flex-1 min-w-0" 
                  bind:value={group.styles.ema.lineStyle}
                  onchange={() => updateVolIndicator(groupIndex)}
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      {/each}

      <!-- Add More Volume Button -->
      <div class="flex justify-center mt-4">
        <button 
          class="btn btn-sm btn-outline btn-primary" 
          onclick={addVolGroup}
          title="Add more Volume indicator"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M12 4v16m8-8H4" />
          </svg>
          Add More Volume
        </button>
      </div>
    </div>
  {:else if isTrix}
    <!-- TRIX Groups UI -->
    <div class="space-y-3 mt-3">
      {#each trixGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- TRIX Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">{group.name}</span>
            {#if trixGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeTrixGroup(groupIndex)}
                title="Remove TRIX"
              >
                <span class="text-xs">×</span>
              </button>
            {/if}
          </div>
          
          <!-- Parameters Row -->
          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <div class="flex items-center gap-2 sm:gap-3">
              <span class="text-xs sm:text-sm text-base-content/60 w-12 sm:w-16 flex-shrink-0">TRIX:</span>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm flex-1 max-w-16 sm:max-w-20 text-xs sm:text-sm" 
                bind:value={group.trixPeriod}
                min="1"
                oninput={() => updateTrixIndicator(groupIndex)}
              />
            </div>
            <div class="flex items-center gap-2 sm:gap-3">
              <span class="text-xs sm:text-sm text-base-content/60 w-12 sm:w-16 flex-shrink-0">Signal:</span>
              <input 
                type="number" 
                class="input input-bordered input-xs sm:input-sm flex-1 max-w-16 sm:max-w-20 text-xs sm:text-sm" 
                bind:value={group.signalPeriod}
                min="1"
                oninput={() => updateTrixIndicator(groupIndex)}
              />
            </div>
          </div>
          
          <!-- TRIX Line Style Controls -->
          <div class="space-y-2">
            <div class="flex items-center gap-1">
              <span class="text-xs text-base-content/60">TRIX Line:</span>
              <div class="w-3 h-2 rounded" style="background-color: {group.styles.trix.color}"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
                <input 
                  type="color" 
                  class="w-8 h-6 rounded border border-base-300 cursor-pointer" 
                  bind:value={group.styles.trix.color}
                  oninput={() => updateTrixIndicator(groupIndex)}
                />
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
                <select class="select select-bordered select-xs w-12 text-xs" bind:value={group.styles.trix.thickness} onchange={() => updateTrixIndicator(groupIndex)}>
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                  <option value={5}>5px</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
                <select class="select select-bordered select-xs w-16 text-xs" bind:value={group.styles.trix.lineStyle} onchange={() => updateTrixIndicator(groupIndex)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- Signal Line Style Controls -->
          <div class="space-y-2">
            <div class="flex items-center gap-1">
              <span class="text-xs text-base-content/60">Signal Line:</span>
              <div class="w-3 h-2 rounded" style="background-color: {group.styles.signal.color}"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
                <input 
                  type="color" 
                  class="w-8 h-6 rounded border border-base-300 cursor-pointer" 
                  bind:value={group.styles.signal.color}
                  oninput={() => updateTrixIndicator(groupIndex)}
                />
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
                <select class="select select-bordered select-xs w-12 text-xs" bind:value={group.styles.signal.thickness} onchange={() => updateTrixIndicator(groupIndex)}>
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                  <option value={5}>5px</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
                <select class="select select-bordered select-xs w-16 text-xs" bind:value={group.styles.signal.lineStyle} onchange={() => updateTrixIndicator(groupIndex)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More TRIX Button -->
      <div class="flex justify-center pt-2">
        <button 
          class="btn btn-xs btn-outline btn-primary gap-1 text-xs" 
          onclick={() => addTrixGroup()}
          title="Add More TRIX"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          + Add More TRIX
        </button>
      </div>
    </div>
  {:else if isBias}
    <!-- BIAS Groups UI -->
    <div class="space-y-3 mt-3">
      {#each biasGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- BIAS Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">BIAS {groupIndex + 1}</span>
            {#if biasGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeBiasGroup(group.id)}
                title="Remove BIAS"
              >
                <span class="text-xs">×</span>
              </button>
            {/if}
          </div>
          
          <!-- Period Input -->
          <div class="flex items-center gap-2 sm:gap-3">
            <span class="text-xs sm:text-sm text-base-content/60 w-12 sm:w-16 flex-shrink-0">Period:</span>
            <input 
              type="number" 
              class="input input-bordered input-xs sm:input-sm flex-1 max-w-16 sm:max-w-20 text-xs sm:text-sm" 
              bind:value={group.period}
              min="1"
            />
          </div>
          
          <!-- Style Controls Row -->
          <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <!-- Color -->
            <div class="flex items-center gap-1">
              <span class="text-base-content/60 text-xs">Color:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showBiasColorPaletteHandler(groupIndex)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.color}"></div>
              </button>
            </div>
            
            <!-- Thickness -->
            <div class="flex items-center gap-1">
              <span class="text-base-content/60 text-xs">Width:</span>
              <select class="select select-bordered select-xs w-12 sm:w-16 text-xs" bind:value={group.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
              </select>
            </div>
            
            <!-- Line Style -->
            <div class="flex items-center gap-1">
              <span class="text-base-content/60 text-xs">Style:</span>
              <select class="select select-bordered select-xs w-14 sm:w-20 text-xs" bind:value={group.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dash</option>
                <option value="dotted">Dot</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More BIAS Button -->
      <div class="flex justify-center pt-2">
        <button 
          class="btn btn-xs btn-outline btn-primary gap-1" 
          onclick={addBiasGroup}
          title="Add More BIAS"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add BIAS</span>
        </button>
      </div>
    </div>
  {:else if isCci}
    <!-- CCI Groups UI -->
    <div class="space-y-3 mt-3">
      {#each cciGroups as group, groupIndex}
        <div class="bg-base-50 border border-base-200 rounded-md p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- CCI Header -->
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-medium text-base-content/80">CCI {groupIndex + 1}</span>
            {#if cciGroups.length > 1}
              <button 
                class="btn btn-xs btn-circle btn-ghost text-error hover:bg-error/10" 
                onclick={() => removeCciGroup(group.id)}
                title="Remove CCI"
              >
                <span class="text-xs">×</span>
              </button>
            {/if}
          </div>
          
          <!-- Period Input -->
          <div class="flex items-center gap-2 sm:gap-3">
            <span class="text-xs sm:text-sm text-base-content/60 w-12 sm:w-16 flex-shrink-0">Period:</span>
            <input 
              type="number" 
              class="input input-bordered input-xs sm:input-sm flex-1 max-w-16 sm:max-w-20 text-xs sm:text-sm" 
              bind:value={group.period}
              min="1"
            />
          </div>
          
          <!-- Style Controls Row -->
          <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <!-- Color -->
            <div class="flex items-center gap-1">
              <span class="text-base-content/60 text-xs">Color:</span>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showCciColorPaletteHandler(groupIndex)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.color}"></div>
              </button>
            </div>
            
            <!-- Thickness -->
            <div class="flex items-center gap-1">
              <span class="text-base-content/60 text-xs">Width:</span>
              <select class="select select-bordered select-xs w-12 sm:w-16 text-xs" bind:value={group.thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
              </select>
            </div>
            
            <!-- Line Style -->
            <div class="flex items-center gap-1">
              <span class="text-base-content/60 text-xs">Style:</span>
              <select class="select select-bordered select-xs w-14 sm:w-20 text-xs" bind:value={group.lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dash</option>
                <option value="dotted">Dot</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More CCI Button -->
      <div class="flex justify-center pt-2">
        <button 
          class="btn btn-xs btn-outline btn-primary gap-1" 
          onclick={addCciGroup}
          title="Add More CCI"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-xs sm:text-sm">Add CCI</span>
        </button>
      </div>
    </div>
  {:else if isIchimoku}
    <!-- Ichimoku Specific UI - Single Unified Card -->
    <div class="mt-3 sm:mt-5">
      <div class="border border-base-300 rounded-lg p-4 bg-base-50/50">
        <!-- Ichimoku Header -->
        <div class="flex items-center gap-3 mb-6 pb-4 border-b border-base-200">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-base-content">Ichimoku Kinko Hyo</h3>
            <p class="text-sm text-base-content/60">Complete cloud indicator with all components</p>
          </div>
        </div>

        <!-- All Parameters in Single Section -->
        <div class="space-y-5">
          {#each fields as field, i}
            <!-- Parameter Row -->
            <div class="flex flex-col lg:flex-row lg:items-center gap-4 p-3 bg-base-100/50 rounded-lg">
              <!-- Parameter Info & Period -->
              <div class="flex items-center justify-between lg:justify-start lg:gap-4 flex-1">
                <div class="flex items-center gap-3">
                  <div class="w-4 h-4 rounded-full border-2 border-white shadow-sm" style="background-color: {styles[i].color}"></div>
                  <span class="text-sm font-medium text-base-content min-w-fit">{field.title}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-base-content/60">Period:</span>
                  <input 
                    type="number" 
                    class="input input-bordered input-sm w-16 text-center" 
                    bind:value={params[i]}
                    min="1"
                    max="200"
                    onchange={() => updateIchimokuIndicator()}
                  />
                </div>
              </div>
              
              <!-- Styling Controls -->
              <div class="flex flex-wrap lg:flex-nowrap items-center gap-3 lg:gap-4">
                <!-- Color Picker -->
                <div class="flex items-center gap-2">
                  <label class="text-xs text-base-content/60">Color:</label>
                  <button 
                    class="btn btn-sm btn-outline"
                    onclick={showIchimokuColorPaletteHandler(i)}
                  >
                    <div class="w-4 h-4 rounded border border-base-300" style="background-color: {styles[i].color}"></div>
                  </button>
                </div>
                
                <!-- Thickness -->
                <div class="flex items-center gap-2">
                  <label class="text-xs text-base-content/60">Thickness:</label>
                  <select class="select select-bordered select-xs w-16" bind:value={styles[i].thickness} onchange={() => updateIchimokuIndicator()}>
                    <option value={1}>1px</option>
                    <option value={2}>2px</option>
                    <option value={3}>3px</option>
                    <option value={4}>4px</option>
                    <option value={5}>5px</option>
                  </select>
                </div>
                
                <!-- Line Style -->
                <div class="flex items-center gap-2">
                  <label class="text-xs text-base-content/60">Style:</label>
                  <select class="select select-bordered select-xs w-20" bind:value={styles[i].lineStyle} onchange={() => updateIchimokuIndicator()}>
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </div>
              </div>
            </div>
          {/each}
        </div>

        <!-- Ichimoku Info Footer -->
        <div class="mt-6 pt-4 border-t border-base-200">
          <div class="text-xs text-base-content/60 space-y-1">
            <p><strong>Components:</strong> Tenkan Sen (Conversion), Kijun Sen (Base), Senkou Span A & B (Cloud)</p>
            <p><strong>Usage:</strong> Trend direction, support/resistance levels, and momentum analysis</p>
          </div>
        </div>
      </div>
    </div>
  {:else if isSma}
    <!-- SMA Specific UI -->
    <div class="space-y-3 sm:space-y-4 mt-3 sm:mt-5">
      {#each fields as field, i}
        <div class="border border-base-300 rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- Parameter Value -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span class="w-full sm:w-20 text-base-content/70 text-sm font-medium min-w-fit">{field.title}</span>
            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <input type="number" class="flex-1 input input-bordered input-sm min-w-0" bind:value={params[i]}/>
              {#if params.length > 1}
                <button 
                  class="btn btn-sm btn-circle btn-ghost text-error hover:bg-error/10 flex-shrink-0" 
                  onclick={() => deleteParam(i)}
                  title="Delete SMA parameter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              {:else}
                <div class="w-8 flex-shrink-0"></div>
              {/if}
            </div>
          </div>
          
          <!-- Styling Controls -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <!-- Color Picker -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showSmaColorPaletteHandler(i)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {styles[i].color}"></div>
              </button>
            </div>
            
            <!-- Thickness Dropdown -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
              <select class="select select-bordered select-xs flex-1 min-w-0" bind:value={styles[i].thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
            </div>
            
            <!-- Line Style Selector -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
              <select class="select select-bordered select-xs flex-1 min-w-0" bind:value={styles[i].lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add SMA Parameter Button -->
      {#if fields.length < 10}
        <div class="flex justify-center mt-4">
          <button 
            class="btn btn-sm btn-outline btn-primary" 
            onclick={addParam}
            title="Add more SMA"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M12 4v16m8-8H4" />
            </svg>
            Add SMA
          </button>
        </div>
      {/if}
    </div>
  {:else if isMa}
    <!-- MA Specific UI -->
    <div class="space-y-3 sm:space-y-4 mt-3 sm:mt-5">
      {#each fields as field, i}
        <div class="border border-base-300 rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- Parameter Value -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span class="w-full sm:w-20 text-base-content/70 text-sm font-medium min-w-fit">{field.title}</span>
            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <input type="number" class="flex-1 input input-bordered input-sm min-w-0" bind:value={params[i]}/>
              {#if params.length > 1}
                <button 
                  class="btn btn-sm btn-circle btn-ghost text-error hover:bg-error/10 flex-shrink-0" 
                  onclick={() => deleteParam(i)}
                  title="Delete MA parameter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              {:else}
                <div class="w-8 flex-shrink-0"></div>
              {/if}
            </div>
          </div>
          
          <!-- Styling Controls -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <!-- Color Picker -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showMaColorPaletteHandler(i)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {styles[i].color}"></div>
              </button>
            </div>
            
            <!-- Thickness Dropdown -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
              <select class="select select-bordered select-xs flex-1 min-w-0" bind:value={styles[i].thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
            </div>
            
            <!-- Line Style Selector -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
              <select class="select select-bordered select-xs flex-1 min-w-0" bind:value={styles[i].lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add MA Parameter Button -->
      {#if fields.length < 10}
        <div class="flex justify-center mt-4">
          <button 
            class="btn btn-sm btn-outline btn-primary" 
            onclick={addParam}
            title="Add more MA"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M12 4v16m8-8H4" />
            </svg>
            Add MA
          </button>
        </div>
      {/if}
    </div>
  {:else if isRoc}
    <!-- ROC Specific UI -->
    <div class="space-y-2 sm:space-y-3 mt-2 sm:mt-3">
      {#each rocGroups as group, groupIndex}
        <div class="border border-base-300 rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- Group Header -->
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-base-content/80">ROC {groupIndex + 1}</h4>
            {#if rocGroups.length > 1}
              <button 
                class="btn btn-xs btn-ghost text-error hover:bg-error/10"
                onclick={() => removeRocGroup(group.id)}
                title="Remove ROC"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>

          <!-- ROC Parameters and Styling -->
          <div class="space-y-3">
            <!-- Period -->
            <div class="flex flex-col gap-2">
              <span class="text-base-content/70 text-xs font-medium">Period</span>
              <input type="number" class="input input-bordered input-xs text-xs w-full max-w-24" bind:value={group.period} onchange={() => updateRocIndicator(groupIndex)}/>
            </div>
            
            <!-- Styling Controls -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <!-- Color Picker -->
              <div class="flex items-center gap-3">
                <label class="text-xs text-base-content/60 min-w-[45px]">Color:</label>
                <button 
                  class="btn btn-sm btn-outline"
                  onclick={showRocColorPaletteHandler(groupIndex)}
                >
                  <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.roc.color}"></div>
                </button>
              </div>
              
              <!-- Thickness -->
              <div class="flex items-center gap-3">
                <span class="text-base-content/60 text-xs min-w-[60px]">Thickness:</span>
                <select class="select select-bordered select-xs w-16 text-xs" bind:value={group.styles.roc.thickness} onchange={() => updateRocIndicator(groupIndex)}>
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                  <option value={5}>5px</option>
                </select>
              </div>
              
              <!-- Line Style -->
              <div class="flex items-center gap-3">
                <span class="text-base-content/60 text-xs min-w-[35px]">Style:</span>
                <select class="select select-bordered select-xs w-20 text-xs" bind:value={group.styles.roc.lineStyle} onchange={() => updateRocIndicator(groupIndex)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More ROC Button -->
      <div class="flex justify-center pt-1">
        <button 
          class="btn btn-xs btn-outline btn-primary gap-1 text-xs" 
          onclick={addRocGroup}
          title="Add more ROC"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          + Add More ROC
        </button>
      </div>
    </div>
  {:else if isPsy}
    <!-- PSY Specific UI -->
    <div class="space-y-2 sm:space-y-3 mt-2 sm:mt-3">
      {#each psyGroups as group, groupIndex}
        <div class="border border-base-300 rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- Group Header -->
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-base-content/80">PSY {groupIndex + 1}</h4>
            {#if psyGroups.length > 1}
              <button 
                class="btn btn-xs btn-ghost text-error hover:bg-error/10"
                onclick={() => removePsyGroup(group.id)}
                title="Remove PSY"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>

          <!-- PSY Parameters -->
          <div class="space-y-3">
            <!-- Param1 (PSY Period) -->
            <div class="flex flex-col gap-2">
              <span class="text-base-content/70 text-xs font-medium">Param 1 (PSY Period)</span>
              <input type="number" class="input input-bordered input-xs text-xs w-full max-w-24" bind:value={group.psyPeriod} onchange={() => updatePsyIndicator(groupIndex)}/>
            </div>
            
            <!-- PSY Line Styling -->
            <div class="space-y-2">
              <span class="text-base-content/70 text-xs font-medium">PSY Line Style</span>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <!-- Color Picker -->
                <div class="flex items-center gap-3">
                  <label class="text-xs text-base-content/60 min-w-[45px]">Color:</label>
                  <button 
                    class="btn btn-xs btn-outline"
                    onclick={showPsyColorPaletteHandler(groupIndex * 2)}
                  >
                    <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.psy.color}"></div>
                  </button>
                </div>
                
                <!-- Thickness -->
                <div class="flex items-center gap-3">
                  <span class="text-base-content/60 text-xs min-w-[60px]">Thickness:</span>
                  <select class="select select-bordered select-xs w-16 text-xs" bind:value={group.styles.psy.thickness} onchange={() => updatePsyIndicator(groupIndex)}>
                    <option value={1}>1px</option>
                    <option value={2}>2px</option>
                    <option value={3}>3px</option>
                    <option value={4}>4px</option>
                    <option value={5}>5px</option>
                  </select>
                </div>
                
                <!-- Line Style -->
                <div class="flex items-center gap-3">
                  <span class="text-base-content/60 text-xs min-w-[35px]">Style:</span>
                  <select class="select select-bordered select-xs w-20 text-xs" bind:value={group.styles.psy.lineStyle} onchange={() => updatePsyIndicator(groupIndex)}>
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- Param2 (MAPSY Period) -->
            <div class="flex flex-col gap-2">
              <span class="text-base-content/70 text-xs font-medium">Param 2 (MAPSY Period)</span>
              <input type="number" class="input input-bordered input-xs text-xs w-full max-w-24" bind:value={group.mapsyPeriod} onchange={() => updatePsyIndicator(groupIndex)}/>
            </div>
            
            <!-- MAPSY Line Styling -->
            <div class="space-y-2">
              <span class="text-base-content/70 text-xs font-medium">MAPSY Line Style</span>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <!-- Color Picker -->
                <div class="flex items-center gap-3">
                  <label class="text-xs text-base-content/60 min-w-[45px]">Color:</label>
                  <button 
                    class="btn btn-xs btn-outline"
                    onclick={showPsyColorPaletteHandler(groupIndex * 2 + 1)}
                  >
                    <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.mapsy.color}"></div>
                  </button>
                </div>
                
                <!-- Thickness -->
                <div class="flex items-center gap-3">
                  <span class="text-base-content/60 text-xs min-w-[60px]">Thickness:</span>
                  <select class="select select-bordered select-xs w-16 text-xs" bind:value={group.styles.mapsy.thickness} onchange={() => updatePsyIndicator(groupIndex)}>
                    <option value={1}>1px</option>
                    <option value={2}>2px</option>
                    <option value={3}>3px</option>
                    <option value={4}>4px</option>
                    <option value={5}>5px</option>
                  </select>
                </div>
                
                <!-- Line Style -->
                <div class="flex items-center gap-3">
                  <span class="text-base-content/60 text-xs min-w-[35px]">Style:</span>
                  <select class="select select-bordered select-xs w-20 text-xs" bind:value={group.styles.mapsy.lineStyle} onchange={() => updatePsyIndicator(groupIndex)}>
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- Show MAPSY Checkbox -->
            <div class="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                class="checkbox checkbox-primary checkbox-sm" 
                bind:checked={group.showMapsy}
                id="showMapsy_{group.id}"
                onchange={() => updatePsyIndicator(groupIndex)}
              />
              <label for="showMapsy_{group.id}" class="text-sm text-base-content/80 cursor-pointer">Show MAPSY</label>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More PSY Button -->
      <div class="flex justify-center pt-1">
        <button 
          class="btn btn-xs btn-outline btn-primary gap-1 text-xs" 
          onclick={addPsyGroup}
          title="Add more PSY"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          + Add More PSY
        </button>
      </div>
    </div>
  {:else if isObv}
    <!-- OBV Specific UI -->
    <div class="space-y-2 sm:space-y-3 mt-2 sm:mt-3">
      {#each obvGroups as group, groupIndex}
        <div class="border border-base-300 rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- Group Header -->
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-base-content/80">OBV {groupIndex + 1}</h4>
            {#if obvGroups.length > 1}
              <button 
                class="btn btn-xs btn-ghost text-error hover:bg-error/10"
                onclick={() => removeObvGroup(group.id)}
                title="Remove OBV"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>

          <!-- OBV Parameters -->
          <div class="space-y-3">
            <!-- Param1 (OBV Period) -->
            <div class="flex flex-col gap-2">
              <span class="text-base-content/70 text-xs font-medium">Param 1 (OBV Period)</span>
              <input type="number" class="input input-bordered input-xs text-xs w-full max-w-24" bind:value={group.obvPeriod}
                oninput={() => {
                  console.log('🔢 OBV period input:', group.obvPeriod);
                  setTimeout(() => updateObvIndicator(groupIndex), 10);
                }}
                onchange={() => {
                  console.log('🔢 OBV period changed:', group.obvPeriod);
                  updateObvIndicator(groupIndex);
                }}
                onblur={() => {
                  console.log('🔢 OBV period blur:', group.obvPeriod);
                  updateObvIndicator(groupIndex);
                }}/>
            </div>
            
            <!-- OBV Line Styling -->
            <div class="space-y-2">
              <span class="text-base-content/70 text-xs font-medium">OBV Line Style</span>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <!-- Color Picker -->
                <div class="flex items-center gap-3">
                  <label class="text-xs text-base-content/60 min-w-[45px]">Color:</label>
                  <button 
                    class="btn btn-xs btn-outline"
                    onclick={showObvColorPaletteHandler(groupIndex * 2)}
                  >
                    <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.obv.color}"></div>
                  </button>
                </div>
                
                <!-- Thickness -->
                <div class="flex items-center gap-3">
                  <span class="text-base-content/60 text-xs min-w-[60px]">Thickness:</span>
                  <select class="select select-bordered select-xs w-16 text-xs" bind:value={group.styles.obv.thickness}
                    onchange={() => {
                      console.log('📏 Updated OBV thickness to:', group.styles.obv.thickness);
                      updateObvIndicator(groupIndex);
                    }}>
                    <option value={1}>1px</option>
                    <option value={2}>2px</option>
                    <option value={3}>3px</option>
                    <option value={4}>4px</option>
                    <option value={5}>5px</option>
                  </select>
                </div>
                
                <!-- Line Style -->
                <div class="flex items-center gap-3">
                  <span class="text-base-content/60 text-xs min-w-[35px]">Style:</span>
                  <select class="select select-bordered select-xs w-20 text-xs" bind:value={group.styles.obv.lineStyle}
                    onchange={() => {
                      console.log('🎨 Updated OBV line style to:', group.styles.obv.lineStyle);
                      updateObvIndicator(groupIndex);
                    }}>
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- Param2 (MAOBV Period) -->
            <div class="flex flex-col gap-2">
              <span class="text-base-content/70 text-xs font-medium">Param 2 (MAOBV Period)</span>
              <input type="number" class="input input-bordered input-xs text-xs w-full max-w-24" bind:value={group.maobvPeriod}
                oninput={() => {
                  console.log('🔢 MAOBV period input:', group.maobvPeriod);
                  setTimeout(() => updateObvIndicator(groupIndex), 10);
                }}
                onchange={() => {
                  console.log('🔢 MAOBV period changed:', group.maobvPeriod);
                  updateObvIndicator(groupIndex);
                }}
                onblur={() => {
                  console.log('🔢 MAOBV period blur:', group.maobvPeriod);
                  updateObvIndicator(groupIndex);
                }}/>
            </div>
            
            <!-- MAOBV Line Styling -->
            <div class="space-y-2">
              <span class="text-base-content/70 text-xs font-medium">MAOBV Line Style</span>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <!-- Color Picker -->
                <div class="flex items-center gap-3">
                  <label class="text-xs text-base-content/60 min-w-[45px]">Color:</label>
                  <button 
                    class="btn btn-xs btn-outline"
                    onclick={showObvColorPaletteHandler(groupIndex * 2 + 1)}
                  >
                    <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.maobv.color}"></div>
                  </button>
                </div>
                
                <!-- Thickness -->
                <div class="flex items-center gap-3">
                  <span class="text-base-content/60 text-xs min-w-[60px]">Thickness:</span>
                  <select class="select select-bordered select-xs w-16 text-xs" bind:value={group.styles.maobv.thickness}
                    onchange={() => {
                      console.log('📏 Updated MAOBV thickness to:', group.styles.maobv.thickness);
                      updateObvIndicator(groupIndex);
                    }}>
                    <option value={1}>1px</option>
                    <option value={2}>2px</option>
                    <option value={3}>3px</option>
                    <option value={4}>4px</option>
                    <option value={5}>5px</option>
                  </select>
                </div>
                
                <!-- Line Style -->
                <div class="flex items-center gap-3">
                  <span class="text-base-content/60 text-xs min-w-[35px]">Style:</span>
                  <select class="select select-bordered select-xs w-20 text-xs" bind:value={group.styles.maobv.lineStyle}
                    onchange={() => {
                      console.log('🎨 Updated MAOBV line style to:', group.styles.maobv.lineStyle);
                      updateObvIndicator(groupIndex);
                    }}>
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- Show MAOBV Checkbox -->
            <div class="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                class="checkbox checkbox-primary checkbox-sm" 
                bind:checked={group.showMaobv}
                id="showMaobv_{group.id}"
                onchange={() => {
                  console.log('✅ Updated showMaobv to:', group.showMaobv);
                  updateObvIndicator(groupIndex);
                }}
              />
              <label for="showMaobv_{group.id}" class="text-sm text-base-content/80 cursor-pointer">Show MAOBV</label>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More OBV Button -->
      <div class="flex justify-center pt-1">
        <button 
          class="btn btn-xs btn-outline btn-primary gap-1 text-xs" 
          onclick={addObvGroup}
          title="Add more OBV"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          + Add More OBV
        </button>
      </div>
    </div>
  {:else if isKdj}
    <!-- KDJ Specific UI -->
    <div class="space-y-2 sm:space-y-3 mt-2 sm:mt-3">
      {#each kdjGroups as group, groupIndex}
        <div class="border border-base-300 rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- Group Header -->
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-medium text-base-content/80">KDJ {groupIndex + 1}</h4>
            {#if kdjGroups.length > 1}
              <button 
                class="btn btn-xs btn-ghost text-error hover:bg-error/10"
                onclick={() => removeKdjGroup(group.id)}
                title="Remove KDJ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            {/if}
          </div>

          <!-- KDJ Parameters -->
          <div class="space-y-3">
            <!-- Parameters Row -->
            <div class="grid grid-cols-2 gap-2 sm:gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-xs text-base-content/60">K Period</label>
                <input 
                  type="number" 
                  class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                  bind:value={group.kPeriod} 
                  min="1"
                  oninput={(e) => {
                    if (e.target) {
                      console.log('📊 K Period changed to:', (e.target as HTMLInputElement).value, 'for group:', groupIndex);
                      updateKdjIndicator(groupIndex);
                    }
                  }}
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs text-base-content/60">D Period</label>
                <input 
                  type="number" 
                  class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm" 
                  bind:value={group.dPeriod} 
                  min="1"
                  oninput={(e) => {
                    if (e.target) {
                      console.log('📊 D Period changed to:', (e.target as HTMLInputElement).value, 'for group:', groupIndex);
                      updateKdjIndicator(groupIndex);
                    }
                  }}
                />
              </div>
            </div>
            
            <!-- K Line Style -->
            <div class="space-y-2">
              <span class="text-base-content/70 text-xs font-medium">K Line Style</span>
              <div class="flex items-center gap-2 text-xs text-base-content/70">
                <span class="w-12 font-medium">K:</span>
                <button 
                  class="btn btn-sm btn-outline"
                  onclick={showKdjGroupColorPaletteHandler(groupIndex, 0)}
                >
                  <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.k.color}"></div>
                </button>
                <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.k.thickness} onchange={() => updateKdjIndicator(groupIndex)}>
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                  <option value={5}>5px</option>
                </select>
                <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.k.lineStyle} onchange={() => updateKdjIndicator(groupIndex)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
            
            <!-- D Line Style -->
            <div class="space-y-2">
              <span class="text-base-content/70 text-xs font-medium">D Line Style</span>
              <div class="flex items-center gap-2 text-xs text-base-content/70">
                <span class="w-12 font-medium">D:</span>
                <button 
                  class="btn btn-sm btn-outline"
                  onclick={showKdjGroupColorPaletteHandler(groupIndex, 1)}
                >
                  <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.d.color}"></div>
                </button>
                <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.d.thickness} onchange={() => updateKdjIndicator(groupIndex)}>
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                  <option value={5}>5px</option>
                </select>
                <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.d.lineStyle} onchange={() => updateKdjIndicator(groupIndex)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
            
            <!-- J Line Style -->
            <div class="space-y-2">
              <span class="text-base-content/70 text-xs font-medium">J Line Style</span>
              <div class="flex items-center gap-2 text-xs text-base-content/70">
                <span class="w-12 font-medium">J:</span>
                <button 
                  class="btn btn-sm btn-outline"
                  onclick={showKdjGroupColorPaletteHandler(groupIndex, 2)}
                >
                  <div class="w-4 h-4 rounded border border-base-300" style="background-color: {group.styles.j.color}"></div>
                </button>
                <select class="select select-bordered select-xs w-14 sm:w-16 text-xs" bind:value={group.styles.j.thickness} onchange={() => updateKdjIndicator(groupIndex)}>
                  <option value={1}>1px</option>
                  <option value={2}>2px</option>
                  <option value={3}>3px</option>
                  <option value={4}>4px</option>
                  <option value={5}>5px</option>
                </select>
                <select class="select select-bordered select-xs w-16 sm:w-20 text-xs" bind:value={group.styles.j.lineStyle} onchange={() => updateKdjIndicator(groupIndex)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add More KDJ Button -->
      <div class="flex justify-center pt-1">
        <button 
          class="btn btn-xs btn-outline btn-primary gap-1 text-xs" 
          onclick={addKdjGroup}
          title="Add more KDJ"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          + Add More KDJ
        </button>
      </div>
    </div>
  {:else if isBollingerBands}
    <!-- Bollinger Bands Custom UI -->
    <div class="space-y-4 mt-3">
      <!-- Parameters Section -->
      <div class="bg-base-50 border border-base-200 rounded-md p-3 space-y-3">
        <h4 class="text-sm font-medium text-base-content/80">Parameters</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Period -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-base-content/60">Period</label>
            <input
              type="number"
              class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm"
              min="1"
              max="200"
              bind:value={bollingerPeriod}
            />
          </div>
          <!-- Standard Deviation -->
          <div class="flex flex-col gap-1">
            <label class="text-xs text-base-content/60">Standard Deviation</label>
            <input
              type="number"
              class="input input-bordered input-xs sm:input-sm text-xs sm:text-sm"
              min="0.1"
              max="10"
              step="0.1"
              bind:value={bollingerStdDev}
            />
          </div>
        </div>
      </div>

      <!-- Fill Color Section -->
      <div class="bg-base-50 border border-base-200 rounded-md p-3 space-y-3">
        <h4 class="text-sm font-medium text-base-content/80">Fill Area Settings</h4>
        
        <!-- Fill Color -->
        <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-base-100 border border-base-200">
          <span class="text-xs text-base-content/70 flex-1">Fill Color</span>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded border-2 border-base-300" style="background-color: {bollingerFillColor}; opacity: {bollingerFillOpacity / 100}"></div>
            <button 
              class="btn btn-sm btn-outline"
              onclick={showBollingerFillColorPaletteHandler}
            >
              <div class="w-4 h-4 rounded border border-base-300" style="background-color: {bollingerFillColor}; opacity: {bollingerFillOpacity / 100}"></div>
            </button>
          </div>
        </div>
        
        <!-- Opacity Slider -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs text-base-content/70">Opacity</label>
            <span class="text-xs font-medium text-primary">{bollingerFillOpacity}%</span>
          </div>
          <input 
            type="range" 
            class="range range-primary range-xs" 
            min="0" 
            max="100" 
            step="1"
            bind:value={bollingerFillOpacity}
          />
          <div class="flex justify-between text-xs text-base-content/50">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <!-- Line Colors Section -->
      <div class="bg-base-50 border border-base-200 rounded-md p-3 space-y-3">
        <h4 class="text-sm font-medium text-base-content/80">Line Colors</h4>
        <div class="space-y-2">
          <!-- Upper Band Color -->
          <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-base-100 border border-base-200">
            <span class="text-xs text-base-content/70 flex-1">Upper Band</span>
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded border-2 border-base-300" style="background-color: {bollingerUpperColor}"></div>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showBollingerUpperColorPaletteHandler}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {bollingerUpperColor}"></div>
              </button>
            </div>
          </div>
          
          <!-- Middle Line Color -->
          <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-base-100 border border-base-200">
            <span class="text-xs text-base-content/70 flex-1">Middle Line (SMA)</span>
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded border-2 border-base-300" style="background-color: {bollingerMiddleColor}"></div>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showBollingerMiddleColorPaletteHandler}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {bollingerMiddleColor}"></div>
              </button>
            </div>
          </div>
          
          <!-- Lower Band Color -->
          <div class="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-base-100 border border-base-200">
            <span class="text-xs text-base-content/70 flex-1">Lower Band</span>
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded border-2 border-base-300" style="background-color: {bollingerLowerColor}"></div>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showBollingerLowerColorPaletteHandler}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {bollingerLowerColor}"></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Line Style Section -->
      <div class="bg-base-50 border border-base-200 rounded-md p-3 space-y-3">
        <h4 class="text-sm font-medium text-base-content/80">Line Style</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Thickness -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
            <select class="select select-bordered select-xs flex-1 min-w-0" bind:value={bollingerThickness}>
              <option value={1}>1px</option>
              <option value={2}>2px</option>
              <option value={3}>3px</option>
              <option value={4}>4px</option>
              <option value={5}>5px</option>
            </select>
          </div>

          <!-- Line Style -->
          <div class="flex items-center gap-2">
            <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
            <select class="select select-bordered select-xs flex-1 min-w-0" bind:value={bollingerLineStyle}>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  {:else if !fields.length}
    <div class="flex justify-center items-center min-h-[120px]">
      <div class="text-base-content/70">{m.no_ind_params()}</div>
    </div>
  {:else}
    <div class="space-y-3 sm:space-y-4 mt-3 sm:mt-5">
      {#each fields as field, i}
        <div class="border border-base-300 rounded-lg p-2 sm:p-3 space-y-2 sm:space-y-3">
          <!-- Parameter Value -->
          <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span class="w-full sm:w-16 text-base-content/70 text-sm font-medium min-w-fit">{field.title}</span>
            <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <input type="number" class="flex-1 input input-bordered input-sm min-w-0" bind:value={params[i]}/>
              {#if params.length > 1 && !isBollingerBands}
                <button 
                  class="btn btn-sm btn-circle btn-ghost text-error hover:bg-error/10 flex-shrink-0" 
                  onclick={() => deleteParam(i)}
                  title="Delete parameter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              {:else if !isBollingerBands}
                <div class="w-8 flex-shrink-0"></div>
              {/if}
            </div>
          </div>
          
          <!-- Styling Controls -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <!-- Color Picker -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Color:</label>
              <button 
                class="btn btn-sm btn-outline"
                onclick={showCciColorPaletteHandler(i)}
              >
                <div class="w-4 h-4 rounded border border-base-300" style="background-color: {styles[i].color}"></div>
              </button>
            </div>
            
            <!-- Thickness Dropdown -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Thickness:</label>
              <select class="select select-bordered select-xs flex-1 min-w-0" bind:value={styles[i].thickness}>
                <option value={1}>1px</option>
                <option value={2}>2px</option>
                <option value={3}>3px</option>
                <option value={4}>4px</option>
                <option value={5}>5px</option>
              </select>
            </div>
            
            <!-- Line Style Selector -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-base-content/60 min-w-fit">Style:</label>
              <select class="select select-bordered select-xs flex-1 min-w-0" bind:value={styles[i].lineStyle}>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- Add Parameter Button - Hidden for Bollinger Bands, PVT, and ZigZag -->
      {#if fields.length < 10 && !isBollingerBands && !isPvt && !isZigzag}
        <div class="flex justify-center mt-4">
          <button 
            class="btn btn-sm btn-outline btn-primary" 
            onclick={addParam}
            title={isBias ? "Add more BIAS indicator" : isAo ? "Add more Awesome Oscillator" : isWr ? "Add more WR indicator" : isEma ? "Add more EMA" : "Add parameter"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      {/if}
    </div>
  {/if}
  </div>
</Modal>

<!-- Color Palettes for all indicators -->
<ColorPalette 
  bind:show={showMacdColorPalette}
  selectedColor={macdGroups[0]?.styles?.macd?.color || '#2563eb'}
  position={macdColorPalettePosition}
  on:colorChange={(e) => {
    if (macdGroups.length > 0) {
      macdGroups[0].styles.macd.color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showCciColorPalette}
  selectedColor={cciGroups[cciColorPaletteIndex]?.color || '#2563eb'}
  position={cciColorPalettePosition}
  on:colorChange={(e) => {
    if (cciGroups.length > cciColorPaletteIndex) {
      cciGroups[cciColorPaletteIndex].color = e.detail.color;
    }
  }}
/>



<ColorPalette 
  bind:show={showDmiColorPalette}
  selectedColor={dmiGroups[0]?.styles?.diPlus?.color || '#2563eb'}
  position={dmiColorPalettePosition}
  on:colorChange={(e) => {
    if (dmiGroups.length > 0) {
      dmiGroups[0].styles.diPlus.color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showEmvColorPalette}
  selectedColor={styles[0]?.color || '#2563eb'}
  position={emvColorPalettePosition}
  on:colorChange={(e) => {
    if (styles.length > 0) {
      styles[0].color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showMtmColorPalette}
  selectedColor={mtmGroups[mtmColorPaletteIndex]?.color || '#2563eb'}
  position={mtmColorPalettePosition}
  on:colorChange={(e) => {
    if (mtmGroups[mtmColorPaletteIndex]) {
      mtmGroups[mtmColorPaletteIndex].color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showKdjColorPalette}
  selectedColor={styles[0]?.color || '#2563eb'}
  position={kdjColorPalettePosition}
  on:colorChange={(e) => {
    if (styles.length > 0) {
      styles[0].color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showTrixColorPalette}
  selectedColor={styles[0]?.color || '#2563eb'}
  position={trixColorPalettePosition}
  on:colorChange={(e) => {
    if (styles.length > 0) {
      styles[0].color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showVolColorPalette}
  selectedColor={
    volColorPaletteType === 'histogram' 
      ? (volGroups[volColorPaletteIndex]?.styles?.histogram?.upColor || '#26a69a')
      : volColorPaletteType === 'histogram-down'
      ? (volGroups[volColorPaletteIndex]?.styles?.histogram?.downColor || '#ef5350')
      : (volGroups[volColorPaletteIndex]?.styles?.ema?.color || '#2563eb')
  }
  position={volColorPalettePosition}
  on:colorChange={(e) => {
    if (volGroups.length > volColorPaletteIndex) {
      if (volColorPaletteType === 'histogram') {
        volGroups[volColorPaletteIndex].styles.histogram.upColor = e.detail.color;
      } else if (volColorPaletteType === 'histogram-down') {
        volGroups[volColorPaletteIndex].styles.histogram.downColor = e.detail.color;
      } else if (volColorPaletteType === 'ema') {
        volGroups[volColorPaletteIndex].styles.ema.color = e.detail.color;
      }
      updateVolIndicator(volColorPaletteIndex);
    }
  }}
/>

<!-- WR ColorPalette components -->
<ColorPalette 
  bind:show={showWrColorPalette}
  selectedColor={wrGroups[wrColorPaletteGroupIndex]?.styles?.wr?.color || '#2563eb'}
  position={wrColorPalettePosition}
  on:colorChange={(e) => {
    if (wrGroups.length > wrColorPaletteGroupIndex && wrGroups[wrColorPaletteGroupIndex].styles.wr) {
      wrGroups[wrColorPaletteGroupIndex].styles.wr.color = e.detail.color;
      updateWrIndicator(wrColorPaletteGroupIndex);
    }
  }}
/>

<!-- WR Level ColorPalette components -->
<ColorPalette 
  bind:show={showWrOverboughtColorPalette}
  selectedColor={wrGroups[wrColorPaletteGroupIndex]?.styles?.overbought?.color || '#FF4444'}
  position={wrOverboughtColorPalettePosition}
  on:colorChange={(e) => {
    if (wrGroups.length > wrColorPaletteGroupIndex && wrGroups[wrColorPaletteGroupIndex].styles.overbought) {
      wrGroups[wrColorPaletteGroupIndex].styles.overbought.color = e.detail.color;
      updateWrIndicator(wrColorPaletteGroupIndex);
    }
  }}
/>

<ColorPalette 
  bind:show={showWrOversoldColorPalette}
  selectedColor={wrGroups[wrColorPaletteGroupIndex]?.styles?.oversold?.color || '#00C851'}
  position={wrOversoldColorPalettePosition}
  on:colorChange={(e) => {
    if (wrGroups.length > wrColorPaletteGroupIndex && wrGroups[wrColorPaletteGroupIndex].styles.oversold) {
      wrGroups[wrColorPaletteGroupIndex].styles.oversold.color = e.detail.color;
      updateWrIndicator(wrColorPaletteGroupIndex);
    }
  }}
/>

<ColorPalette 
  bind:show={showWrMiddleLineColorPalette}
  selectedColor={wrGroups[wrColorPaletteGroupIndex]?.styles?.middleLine?.color || '#808080'}
  position={wrMiddleLineColorPalettePosition}
  on:colorChange={(e) => {
    if (wrGroups.length > wrColorPaletteGroupIndex && wrGroups[wrColorPaletteGroupIndex].styles.middleLine) {
      wrGroups[wrColorPaletteGroupIndex].styles.middleLine.color = e.detail.color;
      updateWrIndicator(wrColorPaletteGroupIndex);
    }
  }}
/>

<ColorPalette 
  bind:show={showVrColorPalette}
  selectedColor={vrGroups[vrColorPaletteGroupIndex]?.styles?.[vrColorPaletteLineType]?.color || '#2563eb'}
  position={vrColorPalettePosition}
  on:colorChange={(e) => {
    if (vrGroups.length > vrColorPaletteGroupIndex && vrGroups[vrColorPaletteGroupIndex].styles[vrColorPaletteLineType]) {
      vrGroups[vrColorPaletteGroupIndex].styles[vrColorPaletteLineType].color = e.detail.color;
      updateVrIndicator(vrColorPaletteGroupIndex);
    }
  }}
/>

<ColorPalette 
  bind:show={showRocColorPalette}
  selectedColor={rocGroups[rocColorPaletteIndex]?.styles?.roc?.color || '#2563eb'}
  position={rocColorPalettePosition}
  on:colorChange={(e) => {
    if (rocGroups.length > rocColorPaletteIndex) {
      rocGroups[rocColorPaletteIndex].styles.roc.color = e.detail.color;
      updateRocIndicator(rocColorPaletteIndex);
    }
  }}
/>

<ColorPalette 
  bind:show={showPsyColorPalette}
  selectedColor={(psyColorPaletteIndex % 2 === 0) 
    ? (psyGroups[Math.floor(psyColorPaletteIndex / 2)]?.styles?.psy?.color || '#2563eb')
    : (psyGroups[Math.floor(psyColorPaletteIndex / 2)]?.styles?.mapsy?.color || '#dc2626')
  }
  position={psyColorPalettePosition}
  on:colorChange={(e) => {
    const groupIndex = Math.floor(psyColorPaletteIndex / 2);
    if (psyGroups.length > groupIndex) {
      if (psyColorPaletteIndex % 2 === 0) {
        // PSY line (even index)
        psyGroups[groupIndex].styles.psy.color = e.detail.color;
        console.log('🎨 Updated PSY color to:', e.detail.color);
      } else {
        // MAPSY line (odd index)
        psyGroups[groupIndex].styles.mapsy.color = e.detail.color;
        console.log('🎨 Updated MAPSY color to:', e.detail.color);
      }
      // Update the indicator immediately with new color
      updatePsyIndicator(groupIndex);
    }
  }}
/>

<ColorPalette 
  bind:show={showObvColorPalette}
  selectedColor={(obvColorPaletteIndex % 2 === 0) 
    ? (obvGroups[Math.floor(obvColorPaletteIndex / 2)]?.styles?.obv?.color || '#FF6B35')
    : (obvGroups[Math.floor(obvColorPaletteIndex / 2)]?.styles?.maobv?.color || '#2196F3')
  }
  position={obvColorPalettePosition}
  on:colorChange={(e) => {
    const groupIndex = Math.floor(obvColorPaletteIndex / 2);
    if (obvGroups.length > groupIndex) {
      if (obvColorPaletteIndex % 2 === 0) {
        // OBV line (even index)
        obvGroups[groupIndex].styles.obv.color = e.detail.color;
        console.log('🎨 Updated OBV color to:', e.detail.color);
      } else {
        // MAOBV line (odd index)
        obvGroups[groupIndex].styles.maobv.color = e.detail.color;
        console.log('🎨 Updated MAOBV color to:', e.detail.color);
      }
      // Immediately update the chart with new color
      updateObvIndicator(groupIndex);
    }
  }}
/>

<ColorPalette 
  bind:show={showZigzagColorPalette}
  selectedColor={zigzagColor}
  position={zigzagColorPalettePosition}
  on:colorChange={(e) => {
    zigzagColor = e.detail.color;
  }}
/>

<ColorPalette 
  bind:show={showPvtColorPalette}
  selectedColor={pvtGroups[pvtColorPaletteIndex]?.color || '#FF6B35'}
  position={pvtColorPalettePosition}
  on:colorChange={(e) => {
    if (pvtGroups.length > pvtColorPaletteIndex) {
      pvtGroups[pvtColorPaletteIndex].color = e.detail.color;
      console.log('🎨 Updated PVT color to:', e.detail.color);
      // Immediately update the chart with new color
      updatePvtIndicator(pvtColorPaletteIndex);
    }
  }}
/>

<ColorPalette 
  bind:show={showSarColorPalette}
  selectedColor={sarGroups[sarColorPaletteIndex]?.color || '#2563eb'}
  position={sarColorPalettePosition}
  on:colorChange={(e) => {
    if (sarGroups.length > sarColorPaletteIndex) {
      sarGroups[sarColorPaletteIndex].color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showBiasColorPalette}
  selectedColor={biasGroups[biasColorPaletteIndex]?.color || '#2563eb'}
  position={biasColorPalettePosition}
  on:colorChange={(e) => {
    if (biasGroups.length > biasColorPaletteIndex) {
      biasGroups[biasColorPaletteIndex].color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showIchimokuColorPalette}
  selectedColor={styles[ichimokuColorPaletteIndex]?.color || '#2563eb'}
  position={ichimokuColorPalettePosition}
  on:colorChange={(e) => {
    if (styles.length > ichimokuColorPaletteIndex) {
      styles[ichimokuColorPaletteIndex].color = e.detail.color;
      updateIchimokuIndicator();
    }
  }}
/>

<ColorPalette 
  bind:show={showCustomMomentumColorPalette}
  selectedColor={styles[0]?.color || '#2563eb'}
  position={customMomentumColorPalettePosition}
  on:colorChange={(e) => {
    if (styles.length > 0) {
      styles[0].color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showCustomAoColorPalette}
  selectedColor={(aoColorPaletteIndex % 2 === 0)
    ? (aoGroups[Math.floor(aoColorPaletteIndex / 2)]?.styles?.increasing?.color || '#00C851')
    : (aoGroups[Math.floor(aoColorPaletteIndex / 2)]?.styles?.decreasing?.color || '#FF4444')
  }
  position={customAoColorPalettePosition}
  on:colorChange={(e) => {
    const groupIndex = Math.floor(aoColorPaletteIndex / 2);
    if (aoGroups[groupIndex]) {
      if (aoColorPaletteIndex % 2 === 0) {
        // Increasing color
        aoGroups[groupIndex].styles.increasing.color = e.detail.color;
      } else {
        // Decreasing color
        aoGroups[groupIndex].styles.decreasing.color = e.detail.color;
      }
    }
  }}
/>

<!-- ColorPalette components for multi-line indicators -->
<ColorPalette 
  bind:show={showMacdLineColorPalette}
  selectedColor={macdGroups[0]?.styles?.macd?.color || '#2563eb'}
  position={macdLineColorPalettePosition}
  on:colorChange={(e) => {
    if (macdGroups.length > 0) {
      macdGroups[0].styles.macd.color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showMacdSignalColorPalette}
  selectedColor={macdGroups[0]?.styles?.signal?.color || '#dc2626'}
  position={macdSignalColorPalettePosition}
  on:colorChange={(e) => {
    if (macdGroups.length > 0) {
      macdGroups[0].styles.signal.color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showMacdHistColorPalette}
  selectedColor={macdGroups[0]?.styles?.histogram?.color || '#16a34a'}
  position={macdHistColorPalettePosition}
  on:colorChange={(e) => {
    if (macdGroups.length > 0) {
      macdGroups[0].styles.histogram.color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showDmiColorPalette}
  selectedColor={(dmiGroups[dmiColorPaletteIndex]?.styles as any)?.[dmiColorPaletteType]?.color || '#2563eb'}
  position={dmiColorPalettePosition}
  on:colorChange={(e) => {
    if (dmiGroups.length > dmiColorPaletteIndex && (dmiGroups[dmiColorPaletteIndex].styles as any)[dmiColorPaletteType]) {
      (dmiGroups[dmiColorPaletteIndex].styles as any)[dmiColorPaletteType].color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showVolIncreasingColorPalette}
  selectedColor={aoGroups[0]?.styles?.increasing?.color || '#16a34a'}
  position={volIncreasingColorPalettePosition}
  on:colorChange={(e) => {
    if (aoGroups.length > 0) {
      aoGroups[0].styles.increasing.color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showVolDecreasingColorPalette}
  selectedColor={aoGroups[0]?.styles?.decreasing?.color || '#dc2626'}
  position={volDecreasingColorPalettePosition}
  on:colorChange={(e) => {
    if (aoGroups.length > 0) {
      aoGroups[0].styles.decreasing.color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showBiasLine1ColorPalette}
  selectedColor={styles[0]?.color || '#2563eb'}
  position={biasLine1ColorPalettePosition}
  on:colorChange={(e) => {
    if (styles.length > 0) {
      styles[0].color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showBiasLine2ColorPalette}
  selectedColor={styles[1]?.color || '#dc2626'}
  position={biasLine2ColorPalettePosition}
  on:colorChange={(e) => {
    if (styles.length > 1) {
      styles[1].color = e.detail.color;
    }
  }}
/>

<ColorPalette 
  bind:show={showBiasLine3ColorPalette}
  selectedColor={styles[2]?.color || '#16a34a'}
  position={biasLine3ColorPalettePosition}
  on:colorChange={(e) => {
    if (styles.length > 2) {
      styles[2].color = e.detail.color;
    }
  }}
/>

<!-- ColorPalette components for Bollinger Bands -->
<ColorPalette 
  bind:show={showBollingerFillColorPalette}
  selectedColor={bollingerFillColor}
  position={bollingerFillColorPalettePosition}
  on:colorChange={(e) => {
    bollingerFillColor = e.detail.color;
  }}
/>

<ColorPalette 
  bind:show={showBollingerUpperColorPalette}
  selectedColor={bollingerUpperColor}
  position={bollingerUpperColorPalettePosition}
  on:colorChange={(e) => {
    bollingerUpperColor = e.detail.color;
  }}
/>

<ColorPalette 
  bind:show={showBollingerMiddleColorPalette}
  selectedColor={bollingerMiddleColor}
  position={bollingerMiddleColorPalettePosition}
  on:colorChange={(e) => {
    bollingerMiddleColor = e.detail.color;
  }}
/>

<ColorPalette 
  bind:show={showBollingerLowerColorPalette}
  selectedColor={bollingerLowerColor}
  position={bollingerLowerColorPalettePosition}
  on:colorChange={(e) => {
    bollingerLowerColor = e.detail.color;
  }}
/>

<!-- ColorPalette components for EMA and SMA -->
<ColorPalette 
  bind:show={showEmaColorPalette}
  selectedColor={styles[emaColorPaletteIndex]?.color || '#2563eb'}
  position={emaColorPalettePosition}
  on:colorChange={(e) => {
    if (styles.length > emaColorPaletteIndex) {
      styles[emaColorPaletteIndex].color = e.detail.color;
      updateEmaIndicator();
    }
  }}
/>

<ColorPalette 
  bind:show={showSmaColorPalette}
  selectedColor={styles[smaColorPaletteIndex]?.color || '#2563eb'}
  position={smaColorPalettePosition}
  on:colorChange={(e) => {
    if (styles.length > smaColorPaletteIndex) {
      styles[smaColorPaletteIndex].color = e.detail.color;
    }
  }}
/>

<!-- ColorPalette component for MA -->
<ColorPalette 
  bind:show={showMaColorPalette}
  selectedColor={styles[maColorPaletteIndex]?.color || '#2563eb'}
  position={maColorPalettePosition}
  on:colorChange={(e) => {
    if (styles.length > maColorPaletteIndex) {
      styles[maColorPaletteIndex].color = e.detail.color;
    }
  }}
/>

<!-- ColorPalette component for BBI -->
<ColorPalette 
  bind:show={showBbiColorPalette}
  selectedColor={bbiGroups[bbiColorPaletteIndex]?.color || '#2563eb'}
  position={bbiColorPalettePosition}
  on:colorChange={(e) => {
    if (bbiGroups.length > bbiColorPaletteIndex) {
      bbiGroups[bbiColorPaletteIndex].color = e.detail.color;
    }
  }}
/>

<!-- ColorPalette component for KDJ Groups -->
<ColorPalette 
  bind:show={showKdjGroupColorPalette}
  selectedColor={(() => {
    const groupIndex = Math.floor(kdjGroupColorPaletteIndex / 3);
    const lineIndex = kdjGroupColorPaletteIndex % 3;
    const group = kdjGroups[groupIndex];
    if (!group) return '#2563eb';
    
    switch (lineIndex) {
      case 0: return group.styles.k.color;
      case 1: return group.styles.d.color;
      case 2: return group.styles.j.color;
      default: return '#2563eb';
    }
  })()}
  position={kdjGroupColorPalettePosition}
  on:colorChange={(e) => {
    const groupIndex = Math.floor(kdjGroupColorPaletteIndex / 3);
    const lineIndex = kdjGroupColorPaletteIndex % 3;
    const group = kdjGroups[groupIndex];
    
    console.log('🎨 KDJ Color change:', {
      groupIndex,
      lineIndex,
      newColor: e.detail.color,
      group: group
    });
    
    if (group) {
      switch (lineIndex) {
        case 0:
          group.styles.k.color = e.detail.color;
          console.log('🎨 Updated K color to:', e.detail.color);
          break;
        case 1:
          group.styles.d.color = e.detail.color;
          console.log('🎨 Updated D color to:', e.detail.color);
          break;
        case 2:
          group.styles.j.color = e.detail.color;
          console.log('🎨 Updated J color to:', e.detail.color);
          break;
      }
      console.log('🎨 Updated KDJ group:', group);
      // Immediately update the chart with new color
      updateKdjIndicator(groupIndex);
    }
  }}
/>

<!-- ColorPalette component for CR -->
<ColorPalette 
  bind:show={showCrColorPalette}
  selectedColor={(() => {
    const group = crGroups[crColorPaletteIndex];
    if (!group) return '#2563eb';
    
    switch (crColorPaletteType) {
      case 'cr': return group.styles.cr.color;
      case 'ma1': return group.styles.ma1.color;
      case 'ma2': return group.styles.ma2.color;
      case 'ma3': return group.styles.ma3.color;
      case 'ma4': return group.styles.ma4.color;
      default: return '#2563eb';
    }
  })()}
  position={crColorPalettePosition}
  on:colorChange={(e) => {
    const group = crGroups[crColorPaletteIndex];
    if (!group) return;
    
    switch (crColorPaletteType) {
      case 'cr':
        group.styles.cr.color = e.detail.color;
        break;
      case 'ma1':
        group.styles.ma1.color = e.detail.color;
        break;
      case 'ma2':
        group.styles.ma2.color = e.detail.color;
        break;
      case 'ma3':
        group.styles.ma3.color = e.detail.color;
        break;
      case 'ma4':
        group.styles.ma4.color = e.detail.color;
        break;
    }
  }}
/>

<ColorPalette 
  bind:show={showRsiColorPalette}
  selectedColor={rsiGroups[rsiColorPaletteIndex]?.styles?.rsi?.color || '#8B5CF6'}
  position={rsiColorPalettePosition}
  on:colorChange={(e) => {
    if (rsiGroups.length > rsiColorPaletteIndex) {
      rsiGroups[rsiColorPaletteIndex].styles.rsi.color = e.detail.color;
      updateRsiIndicator(rsiColorPaletteIndex);
    }
  }}
/>

<!-- RSI Overbought Color Palette -->
<ColorPalette 
  bind:show={showRsiOverboughtColorPalette}
  selectedColor={rsiGroups[rsiColorPaletteGroupIndex]?.styles?.overboughtColor || '#EF4444'}
  position={rsiOverboughtColorPalettePosition}
  on:colorChange={(e) => {
    if (rsiGroups.length > rsiColorPaletteGroupIndex) {
      rsiGroups[rsiColorPaletteGroupIndex].styles.overboughtColor = e.detail.color;
      updateRsiIndicator(rsiColorPaletteGroupIndex);
    }
  }}
/>

<!-- RSI Oversold Color Palette -->
<ColorPalette 
  bind:show={showRsiOversoldColorPalette}
  selectedColor={rsiGroups[rsiColorPaletteGroupIndex]?.styles?.oversoldColor || '#10B981'}
  position={rsiOversoldColorPalettePosition}
  on:colorChange={(e) => {
    if (rsiGroups.length > rsiColorPaletteGroupIndex) {
      rsiGroups[rsiColorPaletteGroupIndex].styles.oversoldColor = e.detail.color;
      updateRsiIndicator(rsiColorPaletteGroupIndex);
    }
  }}
/>

<!-- RSI Middle Line Color Palette -->
<ColorPalette 
  bind:show={showRsiMiddleLineColorPalette}
  selectedColor={rsiGroups[rsiColorPaletteGroupIndex]?.styles?.middleLineColor || '#6B7280'}
  position={rsiMiddleLineColorPalettePosition}
  on:colorChange={(e) => {
    if (rsiGroups.length > rsiColorPaletteGroupIndex) {
      rsiGroups[rsiColorPaletteGroupIndex].styles.middleLineColor = e.detail.color;
      updateRsiIndicator(rsiColorPaletteGroupIndex);
    }
  }}
/>

<style>
  .responsive-modal-content {
    /* Ensure content is scrollable and responsive */
    max-height: calc(90vh - 120px); /* Account for header and buttons */
    overflow-y: auto;
    padding: 0;
  }
  
  /* Responsive grid improvements */
  @media (max-width: 640px) {
    .responsive-modal-content .grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
    
    .responsive-modal-content .grid-cols-3 {
      grid-template-columns: 1fr;
    }
    
    .responsive-modal-content .grid-cols-2 {
      grid-template-columns: 1fr;
    }
  }
  
  @media (min-width: 641px) and (max-width: 768px) {
    .responsive-modal-content .grid-cols-3 {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  /* Better spacing for mobile */
  @media (max-width: 640px) {
    .responsive-modal-content .space-y-2 > * + * {
      margin-top: 0.5rem;
    }
    
    .responsive-modal-content .space-y-3 > * + * {
      margin-top: 0.75rem;
    }
  }
  
  /* Custom scrollbar for modal content */
  .responsive-modal-content {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
  }
  
  .responsive-modal-content::-webkit-scrollbar {
    width: 6px;
  }
  
  .responsive-modal-content::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .responsive-modal-content::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 3px;
    transition: background 0.2s;
  }
  
  .responsive-modal-content::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);
  }
</style>
