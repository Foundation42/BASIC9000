import { createFunction, createNamespace } from './host.js';
import { requireNumberArg, requireStringArg } from './host-defaults.js';

// Canvas instance management
let nextCanvasId = 1;
const canvasInstances = new Map<number, CanvasState>();

interface CanvasState {
  id: number;
  name?: string;
  width: number;
  height: number;
  visible: boolean;
  x: number;
  y: number;
  zIndex: number;
  opacity: number;
  currentColor: string;
  lineWidth: number;
  font: string;
  textAlign: string;
  textBaseline: string;
  mouseX: number;
  mouseY: number;
  clicked: boolean;
  mouseButton: number;
}

// Image management
const loadedImages = new Map<string, any>();
let nextImageId = 1;

// Gradient and pattern management
const gradients = new Map<number, any>();
const patterns = new Map<number, any>();
let nextGradientId = 1;
let nextPatternId = 1;

// Store pending canvas commands to be sent via the host environment
const pendingCommands: Array<{ command: string; args: any }> = [];

// IPC communication with renderer through host environment
function sendCanvasCommand(command: string, args: any) {
  // Store command to be sent through the host environment
  pendingCommands.push({ command, args });

  // Try to send immediately if we have access to a global bridge
  if (typeof global !== 'undefined' && (global as any).__canvasBridge) {
    const bridge = (global as any).__canvasBridge;
    while (pendingCommands.length > 0) {
      const cmd = pendingCommands.shift();
      if (cmd) {
        bridge.send(cmd.command, cmd.args);
      }
    }
  }
}

function sendCanvasCommandSync(command: string, args: any): any {
  // For synchronous commands, we need to use the global bridge
  if (typeof global !== 'undefined' && (global as any).__canvasBridge) {
    const bridge = (global as any).__canvasBridge;
    return bridge.sendSync(command, args);
  }
  return null;
}

// Export function to get pending commands (for the host to process)
export function getAndClearPendingCanvasCommands() {
  const commands = [...pendingCommands];
  pendingCommands.length = 0;
  return commands;
}

export function createCanvasNamespace() {
  return createNamespace('CANVAS', {
    // Canvas Management
    CREATE: createFunction('CANVAS.CREATE', (args) => {
      const width = requireNumberArg('CANVAS.CREATE', args, 0);
      const height = requireNumberArg('CANVAS.CREATE', args, 1);
      const name = args.length >= 3 ? requireStringArg('CANVAS.CREATE', args, 2) : undefined;

      console.log('Canvas.CREATE called with:', { width, height, name });

      const id = nextCanvasId++;
      const state: CanvasState = {
        id,
        name,
        width,
        height,
        visible: false,
        x: 0,
        y: 0,
        zIndex: 1,
        opacity: 1.0,
        currentColor: 'white',
        lineWidth: 1,
        font: '16px monospace',
        textAlign: 'left',
        textBaseline: 'top',
        mouseX: 0,
        mouseY: 0,
        clicked: false,
        mouseButton: 0
      };

      canvasInstances.set(id, state);
      sendCanvasCommand('create', { id, width, height, name });
      return id;
    }),

    // Canvas Properties
    WIDTH: createFunction('CANVAS.WIDTH', (args) => {
      const canvasId = requireNumberArg('CANVAS.WIDTH', args, 0);
      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);
      return state.width;
    }),

    HEIGHT: createFunction('CANVAS.HEIGHT', (args) => {
      const canvasId = requireNumberArg('CANVAS.HEIGHT', args, 0);
      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);
      return state.height;
    }),

    VISIBLE: createFunction('CANVAS.VISIBLE', (args) => {
      const canvasId = requireNumberArg('CANVAS.VISIBLE', args, 0);
      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);
      return state.visible ? 1 : 0;
    }),

    // Positioning & Visibility
    POSITION: createFunction('CANVAS.POSITION', (args) => {
      const canvasId = requireNumberArg('CANVAS.POSITION', args, 0);
      const x = requireNumberArg('CANVAS.POSITION', args, 1);
      const y = requireNumberArg('CANVAS.POSITION', args, 2);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      state.x = x;
      state.y = y;
      sendCanvasCommand('position', { id: canvasId, x, y });
      return 0;
    }),

    SIZE: createFunction('CANVAS.SIZE', (args) => {
      const canvasId = requireNumberArg('CANVAS.SIZE', args, 0);
      const width = requireNumberArg('CANVAS.SIZE', args, 1);
      const height = requireNumberArg('CANVAS.SIZE', args, 2);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      state.width = width;
      state.height = height;
      sendCanvasCommand('size', { id: canvasId, width, height });
      return 0;
    }),

    SHOW: createFunction('CANVAS.SHOW', (args) => {
      const canvasId = requireNumberArg('CANVAS.SHOW', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      state.visible = true;
      sendCanvasCommand('show', { id: canvasId });
      return 0;
    }),

    HIDE: createFunction('CANVAS.HIDE', (args) => {
      const canvasId = requireNumberArg('CANVAS.HIDE', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      state.visible = false;
      sendCanvasCommand('hide', { id: canvasId });
      return 0;
    }),

    LAYER: createFunction('CANVAS.LAYER', (args) => {
      const canvasId = requireNumberArg('CANVAS.LAYER', args, 0);
      const zIndex = requireNumberArg('CANVAS.LAYER', args, 1);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      state.zIndex = zIndex;
      sendCanvasCommand('layer', { id: canvasId, zIndex });
      return 0;
    }),

    OPACITY: createFunction('CANVAS.OPACITY', (args) => {
      const canvasId = requireNumberArg('CANVAS.OPACITY', args, 0);
      const opacity = requireNumberArg('CANVAS.OPACITY', args, 1);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      state.opacity = Math.max(0, Math.min(1, opacity));
      sendCanvasCommand('opacity', { id: canvasId, opacity: state.opacity });
      return 0;
    }),

    // Canvas Lifecycle
    CLEAR: createFunction('CANVAS.CLEAR', (args) => {
      const canvasId = requireNumberArg('CANVAS.CLEAR', args, 0);
      const color = args.length >= 2 ? requireStringArg('CANVAS.CLEAR', args, 1) : undefined;

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('clear', { id: canvasId, color });
      return 0;
    }),

    DESTROY: createFunction('CANVAS.DESTROY', (args) => {
      const canvasId = requireNumberArg('CANVAS.DESTROY', args, 0);

      if (!canvasInstances.has(canvasId)) {
        throw new Error(`Invalid canvas handle: ${canvasId}`);
      }

      canvasInstances.delete(canvasId);
      sendCanvasCommand('destroy', { id: canvasId });
      return 0;
    }),

    // Drawing Context
    COLOR: createFunction('CANVAS.COLOR', (args) => {
      const canvasId = requireNumberArg('CANVAS.COLOR', args, 0);
      const color = requireStringArg('CANVAS.COLOR', args, 1);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      state.currentColor = color;
      sendCanvasCommand('color', { id: canvasId, color });
      return 0;
    }),

    LINEWIDTH: createFunction('CANVAS.LINEWIDTH', (args) => {
      const canvasId = requireNumberArg('CANVAS.LINEWIDTH', args, 0);
      const width = requireNumberArg('CANVAS.LINEWIDTH', args, 1);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      state.lineWidth = width;
      sendCanvasCommand('lineWidth', { id: canvasId, width });
      return 0;
    }),

    GLOBALPHA: createFunction('CANVAS.GLOBALPHA', (args) => {
      const canvasId = requireNumberArg('CANVAS.GLOBALPHA', args, 0);
      const alpha = Math.max(0, Math.min(1, requireNumberArg('CANVAS.GLOBALPHA', args, 1)));

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('globalAlpha', { id: canvasId, alpha });
      return 0;
    }),

    FONT: createFunction('CANVAS.FONT', (args) => {
      const canvasId = requireNumberArg('CANVAS.FONT', args, 0);
      const font = requireStringArg('CANVAS.FONT', args, 1);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      state.font = font;
      sendCanvasCommand('font', { id: canvasId, font });
      return 0;
    }),

    // Graphics State Stack
    SAVE: createFunction('CANVAS.SAVE', (args) => {
      const canvasId = requireNumberArg('CANVAS.SAVE', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('save', { id: canvasId });
      return 0;
    }),

    RESTORE: createFunction('CANVAS.RESTORE', (args) => {
      const canvasId = requireNumberArg('CANVAS.RESTORE', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('restore', { id: canvasId });
      return 0;
    }),

    // Basic Drawing Primitives
    PIXEL: createFunction('CANVAS.PIXEL', (args) => {
      const canvasId = requireNumberArg('CANVAS.PIXEL', args, 0);
      const x = requireNumberArg('CANVAS.PIXEL', args, 1);
      const y = requireNumberArg('CANVAS.PIXEL', args, 2);
      const color = args.length >= 4 ? requireStringArg('CANVAS.PIXEL', args, 3) : undefined;

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('pixel', { id: canvasId, x, y, color: color || state.currentColor });
      return 0;
    }),

    MOVETO: createFunction('CANVAS.MOVETO', (args) => {
      const canvasId = requireNumberArg('CANVAS.MOVETO', args, 0);
      const x = requireNumberArg('CANVAS.MOVETO', args, 1);
      const y = requireNumberArg('CANVAS.MOVETO', args, 2);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('moveTo', { id: canvasId, x, y });
      return 0;
    }),

    LINETO: createFunction('CANVAS.LINETO', (args) => {
      const canvasId = requireNumberArg('CANVAS.LINETO', args, 0);
      const x = requireNumberArg('CANVAS.LINETO', args, 1);
      const y = requireNumberArg('CANVAS.LINETO', args, 2);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('lineTo', { id: canvasId, x, y });
      return 0;
    }),

    LINE: createFunction('CANVAS.LINE', (args) => {
      const canvasId = requireNumberArg('CANVAS.LINE', args, 0);
      const x1 = requireNumberArg('CANVAS.LINE', args, 1);
      const y1 = requireNumberArg('CANVAS.LINE', args, 2);
      const x2 = requireNumberArg('CANVAS.LINE', args, 3);
      const y2 = requireNumberArg('CANVAS.LINE', args, 4);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('line', { id: canvasId, x1, y1, x2, y2 });
      return 0;
    }),

    // Shapes
    RECT: createFunction('CANVAS.RECT', (args) => {
      const canvasId = requireNumberArg('CANVAS.RECT', args, 0);
      const x = requireNumberArg('CANVAS.RECT', args, 1);
      const y = requireNumberArg('CANVAS.RECT', args, 2);
      const w = requireNumberArg('CANVAS.RECT', args, 3);
      const h = requireNumberArg('CANVAS.RECT', args, 4);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('rect', { id: canvasId, x, y, w, h });
      return 0;
    }),

    FILLRECT: createFunction('CANVAS.FILLRECT', (args) => {
      const canvasId = requireNumberArg('CANVAS.FILLRECT', args, 0);
      const x = requireNumberArg('CANVAS.FILLRECT', args, 1);
      const y = requireNumberArg('CANVAS.FILLRECT', args, 2);
      const w = requireNumberArg('CANVAS.FILLRECT', args, 3);
      const h = requireNumberArg('CANVAS.FILLRECT', args, 4);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('fillRect', { id: canvasId, x, y, w, h });
      return 0;
    }),

    CIRCLE: createFunction('CANVAS.CIRCLE', (args) => {
      const canvasId = requireNumberArg('CANVAS.CIRCLE', args, 0);
      const x = requireNumberArg('CANVAS.CIRCLE', args, 1);
      const y = requireNumberArg('CANVAS.CIRCLE', args, 2);
      const radius = requireNumberArg('CANVAS.CIRCLE', args, 3);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('circle', { id: canvasId, x, y, radius });
      return 0;
    }),

    FILLCIRCLE: createFunction('CANVAS.FILLCIRCLE', (args) => {
      const canvasId = requireNumberArg('CANVAS.FILLCIRCLE', args, 0);
      const x = requireNumberArg('CANVAS.FILLCIRCLE', args, 1);
      const y = requireNumberArg('CANVAS.FILLCIRCLE', args, 2);
      const radius = requireNumberArg('CANVAS.FILLCIRCLE', args, 3);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('fillCircle', { id: canvasId, x, y, radius });
      return 0;
    }),

    ARC: createFunction('CANVAS.ARC', (args) => {
      const canvasId = requireNumberArg('CANVAS.ARC', args, 0);
      const x = requireNumberArg('CANVAS.ARC', args, 1);
      const y = requireNumberArg('CANVAS.ARC', args, 2);
      const radius = requireNumberArg('CANVAS.ARC', args, 3);
      const startAngle = requireNumberArg('CANVAS.ARC', args, 4);
      const endAngle = requireNumberArg('CANVAS.ARC', args, 5);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('arc', { id: canvasId, x, y, radius, startAngle, endAngle });
      return 0;
    }),

    // Complex Paths
    BEGINPATH: createFunction('CANVAS.BEGINPATH', (args) => {
      const canvasId = requireNumberArg('CANVAS.BEGINPATH', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('beginPath', { id: canvasId });
      return 0;
    }),

    CURVETO: createFunction('CANVAS.CURVETO', (args) => {
      const canvasId = requireNumberArg('CANVAS.CURVETO', args, 0);
      const cp1x = requireNumberArg('CANVAS.CURVETO', args, 1);
      const cp1y = requireNumberArg('CANVAS.CURVETO', args, 2);
      const cp2x = requireNumberArg('CANVAS.CURVETO', args, 3);
      const cp2y = requireNumberArg('CANVAS.CURVETO', args, 4);
      const x = requireNumberArg('CANVAS.CURVETO', args, 5);
      const y = requireNumberArg('CANVAS.CURVETO', args, 6);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('curveTo', { id: canvasId, cp1x, cp1y, cp2x, cp2y, x, y });
      return 0;
    }),

    CLOSEPATH: createFunction('CANVAS.CLOSEPATH', (args) => {
      const canvasId = requireNumberArg('CANVAS.CLOSEPATH', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('closePath', { id: canvasId });
      return 0;
    }),

    STROKE: createFunction('CANVAS.STROKE', (args) => {
      const canvasId = requireNumberArg('CANVAS.STROKE', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('stroke', { id: canvasId });
      return 0;
    }),

    FILL: createFunction('CANVAS.FILL', (args) => {
      const canvasId = requireNumberArg('CANVAS.FILL', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('fill', { id: canvasId });
      return 0;
    }),

    // Transforms
    TRANSLATE: createFunction('CANVAS.TRANSLATE', (args) => {
      const canvasId = requireNumberArg('CANVAS.TRANSLATE', args, 0);
      const dx = requireNumberArg('CANVAS.TRANSLATE', args, 1);
      const dy = requireNumberArg('CANVAS.TRANSLATE', args, 2);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('translate', { id: canvasId, dx, dy });
      return 0;
    }),

    ROTATE: createFunction('CANVAS.ROTATE', (args) => {
      const canvasId = requireNumberArg('CANVAS.ROTATE', args, 0);
      const angle = requireNumberArg('CANVAS.ROTATE', args, 1);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('rotate', { id: canvasId, angle });
      return 0;
    }),

    SCALE: createFunction('CANVAS.SCALE', (args) => {
      const canvasId = requireNumberArg('CANVAS.SCALE', args, 0);
      const sx = requireNumberArg('CANVAS.SCALE', args, 1);
      const sy = requireNumberArg('CANVAS.SCALE', args, 2);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('scale', { id: canvasId, sx, sy });
      return 0;
    }),

    RESETMATRIX: createFunction('CANVAS.RESETMATRIX', (args) => {
      const canvasId = requireNumberArg('CANVAS.RESETMATRIX', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('resetMatrix', { id: canvasId });
      return 0;
    }),

    TRANSFORM: createFunction('CANVAS.TRANSFORM', (args) => {
      const canvasId = requireNumberArg('CANVAS.TRANSFORM', args, 0);
      const a = requireNumberArg('CANVAS.TRANSFORM', args, 1);
      const b = requireNumberArg('CANVAS.TRANSFORM', args, 2);
      const c = requireNumberArg('CANVAS.TRANSFORM', args, 3);
      const d = requireNumberArg('CANVAS.TRANSFORM', args, 4);
      const e = requireNumberArg('CANVAS.TRANSFORM', args, 5);
      const f = requireNumberArg('CANVAS.TRANSFORM', args, 6);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('transform', { id: canvasId, a, b, c, d, e, f });
      return 0;
    }),

    SETMATRIX: createFunction('CANVAS.SETMATRIX', (args) => {
      const canvasId = requireNumberArg('CANVAS.SETMATRIX', args, 0);
      const a = requireNumberArg('CANVAS.SETMATRIX', args, 1);
      const b = requireNumberArg('CANVAS.SETMATRIX', args, 2);
      const c = requireNumberArg('CANVAS.SETMATRIX', args, 3);
      const d = requireNumberArg('CANVAS.SETMATRIX', args, 4);
      const e = requireNumberArg('CANVAS.SETMATRIX', args, 5);
      const f = requireNumberArg('CANVAS.SETMATRIX', args, 6);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('setMatrix', { id: canvasId, a, b, c, d, e, f });
      return 0;
    }),

    // Text Rendering
    TEXT: createFunction('CANVAS.TEXT', (args) => {
      const canvasId = requireNumberArg('CANVAS.TEXT', args, 0);
      const text = requireStringArg('CANVAS.TEXT', args, 1);
      const x = requireNumberArg('CANVAS.TEXT', args, 2);
      const y = requireNumberArg('CANVAS.TEXT', args, 3);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('text', { id: canvasId, text, x, y });
      return 0;
    }),

    FILLTEXT: createFunction('CANVAS.FILLTEXT', (args) => {
      const canvasId = requireNumberArg('CANVAS.FILLTEXT', args, 0);
      const text = requireStringArg('CANVAS.FILLTEXT', args, 1);
      const x = requireNumberArg('CANVAS.FILLTEXT', args, 2);
      const y = requireNumberArg('CANVAS.FILLTEXT', args, 3);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('fillText', { id: canvasId, text, x, y });
      return 0;
    }),

    STROKETEXT: createFunction('CANVAS.STROKETEXT', (args) => {
      const canvasId = requireNumberArg('CANVAS.STROKETEXT', args, 0);
      const text = requireStringArg('CANVAS.STROKETEXT', args, 1);
      const x = requireNumberArg('CANVAS.STROKETEXT', args, 2);
      const y = requireNumberArg('CANVAS.STROKETEXT', args, 3);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('strokeText', { id: canvasId, text, x, y });
      return 0;
    }),

    // Text Measurement
    TEXTWIDTH: createFunction('CANVAS.TEXTWIDTH', (args) => {
      const canvasId = requireNumberArg('CANVAS.TEXTWIDTH', args, 0);
      const text = requireStringArg('CANVAS.TEXTWIDTH', args, 1);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      return sendCanvasCommandSync('textWidth', { id: canvasId, text }) || 0;
    }),

    TEXTHEIGHT: createFunction('CANVAS.TEXTHEIGHT', (args) => {
      const canvasId = requireNumberArg('CANVAS.TEXTHEIGHT', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      return sendCanvasCommandSync('textHeight', { id: canvasId }) || 0;
    }),

    // Text Alignment
    TEXTALIGN: createFunction('CANVAS.TEXTALIGN', (args) => {
      const canvasId = requireNumberArg('CANVAS.TEXTALIGN', args, 0);
      const align = requireStringArg('CANVAS.TEXTALIGN', args, 1);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      state.textAlign = align;
      sendCanvasCommand('textAlign', { id: canvasId, align });
      return 0;
    }),

    TEXTBASELINE: createFunction('CANVAS.TEXTBASELINE', (args) => {
      const canvasId = requireNumberArg('CANVAS.TEXTBASELINE', args, 0);
      const baseline = requireStringArg('CANVAS.TEXTBASELINE', args, 1);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      state.textBaseline = baseline;
      sendCanvasCommand('textBaseline', { id: canvasId, baseline });
      return 0;
    }),

    // Image Operations
    LOADIMAGE: createFunction('CANVAS.LOADIMAGE', (args) => {
      const path = requireStringArg('CANVAS.LOADIMAGE', args, 0);

      if (loadedImages.has(path)) {
        return loadedImages.get(path);
      }

      const imageId = nextImageId++;
      loadedImages.set(path, imageId);
      sendCanvasCommand('loadImage', { id: imageId, path });
      return imageId;
    }),

    DRAWIMAGE: createFunction('CANVAS.DRAWIMAGE', (args) => {
      const canvasId = requireNumberArg('CANVAS.DRAWIMAGE', args, 0);
      const imageId = requireNumberArg('CANVAS.DRAWIMAGE', args, 1);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      if (args.length === 4) {
        // Simple draw at position
        const x = requireNumberArg('CANVAS.DRAWIMAGE', args, 2);
        const y = requireNumberArg('CANVAS.DRAWIMAGE', args, 3);
        sendCanvasCommand('drawImage', { id: canvasId, imageId, x, y });
      } else if (args.length === 6) {
        // Draw scaled
        const x = requireNumberArg('CANVAS.DRAWIMAGE', args, 2);
        const y = requireNumberArg('CANVAS.DRAWIMAGE', args, 3);
        const w = requireNumberArg('CANVAS.DRAWIMAGE', args, 4);
        const h = requireNumberArg('CANVAS.DRAWIMAGE', args, 5);
        sendCanvasCommand('drawImage', { id: canvasId, imageId, x, y, w, h });
      } else if (args.length === 10) {
        // Clip and scale
        const sx = requireNumberArg('CANVAS.DRAWIMAGE', args, 2);
        const sy = requireNumberArg('CANVAS.DRAWIMAGE', args, 3);
        const sw = requireNumberArg('CANVAS.DRAWIMAGE', args, 4);
        const sh = requireNumberArg('CANVAS.DRAWIMAGE', args, 5);
        const dx = requireNumberArg('CANVAS.DRAWIMAGE', args, 6);
        const dy = requireNumberArg('CANVAS.DRAWIMAGE', args, 7);
        const dw = requireNumberArg('CANVAS.DRAWIMAGE', args, 8);
        const dh = requireNumberArg('CANVAS.DRAWIMAGE', args, 9);
        sendCanvasCommand('drawImage', { id: canvasId, imageId, sx, sy, sw, sh, dx, dy, dw, dh });
      }

      return 0;
    }),

    // Canvas-to-Canvas Operations
    COPY: createFunction('CANVAS.COPY', (args) => {
      const sourceId = requireNumberArg('CANVAS.COPY', args, 0);
      const destId = requireNumberArg('CANVAS.COPY', args, 1);

      const sourceState = canvasInstances.get(sourceId);
      const destState = canvasInstances.get(destId);
      if (!sourceState) throw new Error(`Invalid source canvas handle: ${sourceId}`);
      if (!destState) throw new Error(`Invalid destination canvas handle: ${destId}`);

      if (args.length === 4) {
        // Copy entire canvas
        const x = requireNumberArg('CANVAS.COPY', args, 2);
        const y = requireNumberArg('CANVAS.COPY', args, 3);
        sendCanvasCommand('copyCanvas', { sourceId, destId, x, y });
      } else if (args.length === 10) {
        // Partial copy
        const sx = requireNumberArg('CANVAS.COPY', args, 2);
        const sy = requireNumberArg('CANVAS.COPY', args, 3);
        const sw = requireNumberArg('CANVAS.COPY', args, 4);
        const sh = requireNumberArg('CANVAS.COPY', args, 5);
        const dx = requireNumberArg('CANVAS.COPY', args, 6);
        const dy = requireNumberArg('CANVAS.COPY', args, 7);
        const dw = requireNumberArg('CANVAS.COPY', args, 8);
        const dh = requireNumberArg('CANVAS.COPY', args, 9);
        sendCanvasCommand('copyCanvas', { sourceId, destId, sx, sy, sw, sh, dx, dy, dw, dh });
      }

      return 0;
    }),

    // Pixel Manipulation
    GETPIXELS: createFunction('CANVAS.GETPIXELS', (args) => {
      const canvasId = requireNumberArg('CANVAS.GETPIXELS', args, 0);
      const x = requireNumberArg('CANVAS.GETPIXELS', args, 1);
      const y = requireNumberArg('CANVAS.GETPIXELS', args, 2);
      const w = requireNumberArg('CANVAS.GETPIXELS', args, 3);
      const h = requireNumberArg('CANVAS.GETPIXELS', args, 4);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      return sendCanvasCommandSync('getPixels', { id: canvasId, x, y, w, h }) || [];
    }),

    PUTPIXELS: createFunction('CANVAS.PUTPIXELS', (args) => {
      const canvasId = requireNumberArg('CANVAS.PUTPIXELS', args, 0);
      const imageData = args[1]; // Array
      const x = requireNumberArg('CANVAS.PUTPIXELS', args, 2);
      const y = requireNumberArg('CANVAS.PUTPIXELS', args, 3);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      sendCanvasCommand('putPixels', { id: canvasId, imageData, x, y });
      return 0;
    }),

    GETPIXEL: createFunction('CANVAS.GETPIXEL', (args) => {
      const canvasId = requireNumberArg('CANVAS.GETPIXEL', args, 0);
      const x = requireNumberArg('CANVAS.GETPIXEL', args, 1);
      const y = requireNumberArg('CANVAS.GETPIXEL', args, 2);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      return sendCanvasCommandSync('getPixel', { id: canvasId, x, y }) || '';
    }),

    // Gradients
    LINEARGRADIENT: createFunction('CANVAS.LINEARGRADIENT', (args) => {
      const x1 = requireNumberArg('CANVAS.LINEARGRADIENT', args, 0);
      const y1 = requireNumberArg('CANVAS.LINEARGRADIENT', args, 1);
      const x2 = requireNumberArg('CANVAS.LINEARGRADIENT', args, 2);
      const y2 = requireNumberArg('CANVAS.LINEARGRADIENT', args, 3);

      const gradientId = nextGradientId++;
      gradients.set(gradientId, { type: 'linear', x1, y1, x2, y2, stops: [] });
      return gradientId;
    }),

    RADIALGRADIENT: createFunction('CANVAS.RADIALGRADIENT', (args) => {
      const x1 = requireNumberArg('CANVAS.RADIALGRADIENT', args, 0);
      const y1 = requireNumberArg('CANVAS.RADIALGRADIENT', args, 1);
      const r1 = requireNumberArg('CANVAS.RADIALGRADIENT', args, 2);
      const x2 = requireNumberArg('CANVAS.RADIALGRADIENT', args, 3);
      const y2 = requireNumberArg('CANVAS.RADIALGRADIENT', args, 4);
      const r2 = requireNumberArg('CANVAS.RADIALGRADIENT', args, 5);

      const gradientId = nextGradientId++;
      gradients.set(gradientId, { type: 'radial', x1, y1, r1, x2, y2, r2, stops: [] });
      return gradientId;
    }),

    ADDCOLORSTOP: createFunction('CANVAS.ADDCOLORSTOP', (args) => {
      const gradientId = requireNumberArg('CANVAS.ADDCOLORSTOP', args, 0);
      const position = requireNumberArg('CANVAS.ADDCOLORSTOP', args, 1);
      const color = requireStringArg('CANVAS.ADDCOLORSTOP', args, 2);

      const gradient = gradients.get(gradientId);
      if (!gradient) throw new Error(`Invalid gradient handle: ${gradientId}`);

      gradient.stops.push({ position, color });
      return 0;
    }),

    FILLSTYLE: createFunction('CANVAS.FILLSTYLE', (args) => {
      const canvasId = requireNumberArg('CANVAS.FILLSTYLE', args, 0);
      const style = args[1]; // Can be string (color) or number (gradient/pattern ID)

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      if (typeof style === 'string') {
        sendCanvasCommand('fillStyle', { id: canvasId, style });
      } else if (typeof style === 'number') {
        // Check if it's a gradient or pattern
        if (gradients.has(style)) {
          const gradient = gradients.get(style);
          sendCanvasCommand('fillStyle', { id: canvasId, gradient });
        } else if (patterns.has(style)) {
          const pattern = patterns.get(style);
          sendCanvasCommand('fillStyle', { id: canvasId, pattern });
        }
      }

      return 0;
    }),

    // Patterns
    PATTERN: createFunction('CANVAS.PATTERN', (args) => {
      const imageId = requireNumberArg('CANVAS.PATTERN', args, 0);
      const repetition = requireStringArg('CANVAS.PATTERN', args, 1);

      const patternId = nextPatternId++;
      patterns.set(patternId, { imageId, repetition });
      sendCanvasCommand('createPattern', { id: patternId, imageId, repetition });
      return patternId;
    }),

    // Mouse Events
    MOUSEX: createFunction('CANVAS.MOUSEX', (args) => {
      const canvasId = requireNumberArg('CANVAS.MOUSEX', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      const mousePos = sendCanvasCommandSync('getMousePosition', { id: canvasId });
      if (mousePos) {
        state.mouseX = mousePos.x;
        return mousePos.x;
      }
      return state.mouseX;
    }),

    MOUSEY: createFunction('CANVAS.MOUSEY', (args) => {
      const canvasId = requireNumberArg('CANVAS.MOUSEY', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      const mousePos = sendCanvasCommandSync('getMousePosition', { id: canvasId });
      if (mousePos) {
        state.mouseY = mousePos.y;
        return mousePos.y;
      }
      return state.mouseY;
    }),

    CLICKED: createFunction('CANVAS.CLICKED', (args) => {
      const canvasId = requireNumberArg('CANVAS.CLICKED', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      const clickState = sendCanvasCommandSync('getClickState', { id: canvasId });
      if (clickState !== null) {
        state.clicked = clickState;
        return clickState ? 1 : 0;
      }
      return state.clicked ? 1 : 0;
    }),

    MOUSEBUTTON: createFunction('CANVAS.MOUSEBUTTON', (args) => {
      const canvasId = requireNumberArg('CANVAS.MOUSEBUTTON', args, 0);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      const button = sendCanvasCommandSync('getMouseButton', { id: canvasId });
      if (button !== null) {
        state.mouseButton = button;
        return button;
      }
      return state.mouseButton;
    }),

    // Hit Testing
    POINTINPATH: createFunction('CANVAS.POINTINPATH', (args) => {
      const canvasId = requireNumberArg('CANVAS.POINTINPATH', args, 0);
      const x = requireNumberArg('CANVAS.POINTINPATH', args, 1);
      const y = requireNumberArg('CANVAS.POINTINPATH', args, 2);

      const state = canvasInstances.get(canvasId);
      if (!state) throw new Error(`Invalid canvas handle: ${canvasId}`);

      const inPath = sendCanvasCommandSync('pointInPath', { id: canvasId, x, y });
      return inPath ? 1 : 0;
    })
  });
}