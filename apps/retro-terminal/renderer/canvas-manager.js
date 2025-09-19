// Canvas Manager - Handles canvas rendering for BASIC9000
class CanvasManager {
  constructor() {
    this.canvases = new Map();
    this.container = null;
    this.images = new Map();
    this.gradients = new Map();
    this.patterns = new Map();
    this.mouseStates = new Map();

    // Initialize container
    this.initContainer();

    // Setup IPC listeners
    window.api.on('canvas:command', (data) => {
      this.handleCommand(data.command, data.args);
    });

    // Setup mouse tracking
    this.setupMouseTracking();
  }

  initContainer() {
    // Create container for canvases
    this.container = document.createElement('div');
    this.container.id = 'canvas-container';
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '100';
    document.body.appendChild(this.container);
  }

  setupMouseTracking() {
    document.addEventListener('mousemove', (e) => {
      this.canvases.forEach((canvasData, id) => {
        const rect = canvasData.element.getBoundingClientRect();
        const state = this.mouseStates.get(id) || {};
        state.x = e.clientX - rect.left;
        state.y = e.clientY - rect.top;
        this.mouseStates.set(id, state);
      });
    });

    document.addEventListener('mousedown', (e) => {
      this.canvases.forEach((canvasData, id) => {
        const rect = canvasData.element.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const state = this.mouseStates.get(id) || {};
          state.clicked = true;
          state.button = e.button + 1; // Convert to 1-based
          this.mouseStates.set(id, state);
        }
      });
    });

    document.addEventListener('mouseup', (e) => {
      this.canvases.forEach((canvasData, id) => {
        const state = this.mouseStates.get(id) || {};
        state.clicked = false;
        state.button = 0;
        this.mouseStates.set(id, state);
      });
    });
  }

  handleCommand(command, args) {
    switch (command) {
      case 'create':
        this.createCanvas(args.id, args.width, args.height, args.name);
        break;
      case 'position':
        this.positionCanvas(args.id, args.x, args.y);
        break;
      case 'size':
        this.resizeCanvas(args.id, args.width, args.height);
        break;
      case 'show':
        this.showCanvas(args.id);
        break;
      case 'hide':
        this.hideCanvas(args.id);
        break;
      case 'layer':
        this.setLayer(args.id, args.zIndex);
        break;
      case 'opacity':
        this.setOpacity(args.id, args.opacity);
        break;
      case 'clear':
        this.clearCanvas(args.id, args.color);
        break;
      case 'destroy':
        this.destroyCanvas(args.id);
        break;

      // Drawing context
      case 'color':
        this.setColor(args.id, args.color);
        break;
      case 'lineWidth':
        this.setLineWidth(args.id, args.width);
        break;
      case 'globalAlpha':
        this.setGlobalAlpha(args.id, args.alpha);
        break;
      case 'font':
        this.setFont(args.id, args.font);
        break;
      case 'save':
        this.saveState(args.id);
        break;
      case 'restore':
        this.restoreState(args.id);
        break;

      // Drawing primitives
      case 'pixel':
        this.drawPixel(args.id, args.x, args.y, args.color);
        break;
      case 'moveTo':
        this.moveTo(args.id, args.x, args.y);
        break;
      case 'lineTo':
        this.lineTo(args.id, args.x, args.y);
        break;
      case 'line':
        this.drawLine(args.id, args.x1, args.y1, args.x2, args.y2);
        break;

      // Shapes
      case 'rect':
        this.drawRect(args.id, args.x, args.y, args.w, args.h);
        break;
      case 'fillRect':
        this.fillRect(args.id, args.x, args.y, args.w, args.h);
        break;
      case 'circle':
        this.drawCircle(args.id, args.x, args.y, args.radius);
        break;
      case 'fillCircle':
        this.fillCircle(args.id, args.x, args.y, args.radius);
        break;
      case 'arc':
        this.drawArc(args.id, args.x, args.y, args.radius, args.startAngle, args.endAngle);
        break;

      // Paths
      case 'beginPath':
        this.beginPath(args.id);
        break;
      case 'closePath':
        this.closePath(args.id);
        break;
      case 'stroke':
        this.stroke(args.id);
        break;
      case 'fill':
        this.fill(args.id);
        break;
      case 'curveTo':
        this.curveTo(args.id, args.cp1x, args.cp1y, args.cp2x, args.cp2y, args.x, args.y);
        break;

      // Transforms
      case 'translate':
        this.translate(args.id, args.dx, args.dy);
        break;
      case 'rotate':
        this.rotate(args.id, args.angle);
        break;
      case 'scale':
        this.scale(args.id, args.sx, args.sy);
        break;
      case 'resetMatrix':
        this.resetMatrix(args.id);
        break;
      case 'transform':
        this.transform(args.id, args.a, args.b, args.c, args.d, args.e, args.f);
        break;
      case 'setMatrix':
        this.setMatrix(args.id, args.a, args.b, args.c, args.d, args.e, args.f);
        break;

      // Text
      case 'text':
      case 'fillText':
        this.fillText(args.id, args.text, args.x, args.y);
        break;
      case 'strokeText':
        this.strokeText(args.id, args.text, args.x, args.y);
        break;
      case 'textAlign':
        this.setTextAlign(args.id, args.align);
        break;
      case 'textBaseline':
        this.setTextBaseline(args.id, args.baseline);
        break;

      // Images
      case 'loadImage':
        this.loadImage(args.id, args.path);
        break;
      case 'drawImage':
        this.drawImage(args.id, args.imageId, args);
        break;

      // Canvas copy
      case 'copyCanvas':
        this.copyCanvas(args);
        break;

      // Fill style
      case 'fillStyle':
        this.setFillStyle(args.id, args);
        break;

      // Pattern
      case 'createPattern':
        this.createPattern(args.id, args.imageId, args.repetition);
        break;
    }
  }

  createCanvas(id, width, height, name) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.display = 'none';
    canvas.style.pointerEvents = 'auto';

    const ctx = canvas.getContext('2d');

    this.container.appendChild(canvas);

    this.canvases.set(id, {
      element: canvas,
      ctx: ctx,
      visible: false,
      name: name
    });

    // Initialize mouse state
    this.mouseStates.set(id, {
      x: 0,
      y: 0,
      clicked: false,
      button: 0
    });
  }

  positionCanvas(id, x, y) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.element.style.left = x + 'px';
    canvasData.element.style.top = y + 'px';
  }

  resizeCanvas(id, width, height) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    // Save current image data
    const imageData = canvasData.ctx.getImageData(0, 0, canvasData.element.width, canvasData.element.height);

    // Resize canvas
    canvasData.element.width = width;
    canvasData.element.height = height;

    // Restore image data (clipped to new size)
    canvasData.ctx.putImageData(imageData, 0, 0);
  }

  showCanvas(id) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.element.style.display = 'block';
    canvasData.visible = true;
  }

  hideCanvas(id) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.element.style.display = 'none';
    canvasData.visible = false;
  }

  setLayer(id, zIndex) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.element.style.zIndex = zIndex;
  }

  setOpacity(id, opacity) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.element.style.opacity = opacity;
  }

  clearCanvas(id, color) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    const { ctx, element } = canvasData;

    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, element.width, element.height);
    } else {
      ctx.clearRect(0, 0, element.width, element.height);
    }
  }

  destroyCanvas(id) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.element.remove();
    this.canvases.delete(id);
    this.mouseStates.delete(id);
  }

  // Drawing context methods
  setColor(id, color) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.strokeStyle = color;
    canvasData.ctx.fillStyle = color;
  }

  setLineWidth(id, width) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.lineWidth = width;
  }

  setGlobalAlpha(id, alpha) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.globalAlpha = alpha;
  }

  setFont(id, font) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.font = font;
  }

  saveState(id) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.save();
  }

  restoreState(id) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.restore();
  }

  // Drawing primitives
  drawPixel(id, x, y, color) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    const { ctx } = canvasData;
    const oldFillStyle = ctx.fillStyle;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = oldFillStyle;
  }

  moveTo(id, x, y) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.moveTo(x, y);
  }

  lineTo(id, x, y) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.lineTo(x, y);
  }

  drawLine(id, x1, y1, x2, y2) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    const { ctx } = canvasData;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Shape methods
  drawRect(id, x, y, w, h) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.strokeRect(x, y, w, h);
  }

  fillRect(id, x, y, w, h) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.fillRect(x, y, w, h);
  }

  drawCircle(id, x, y, radius) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    const { ctx } = canvasData;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();
  }

  fillCircle(id, x, y, radius) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    const { ctx } = canvasData;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  drawArc(id, x, y, radius, startAngle, endAngle) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    const { ctx } = canvasData;
    ctx.beginPath();
    ctx.arc(x, y, radius, startAngle, endAngle);
    ctx.stroke();
  }

  // Path methods
  beginPath(id) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.beginPath();
  }

  closePath(id) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.closePath();
  }

  stroke(id) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.stroke();
  }

  fill(id) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.fill();
  }

  curveTo(id, cp1x, cp1y, cp2x, cp2y, x, y) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }

  // Transform methods
  translate(id, dx, dy) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.translate(dx, dy);
  }

  rotate(id, angle) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.rotate(angle);
  }

  scale(id, sx, sy) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.scale(sx, sy);
  }

  resetMatrix(id) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  transform(id, a, b, c, d, e, f) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.transform(a, b, c, d, e, f);
  }

  setMatrix(id, a, b, c, d, e, f) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.setTransform(a, b, c, d, e, f);
  }

  // Text methods
  fillText(id, text, x, y) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.fillText(text, x, y);
  }

  strokeText(id, text, x, y) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.strokeText(text, x, y);
  }

  setTextAlign(id, align) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.textAlign = align;
  }

  setTextBaseline(id, baseline) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    canvasData.ctx.textBaseline = baseline;
  }

  // Image methods
  loadImage(id, path) {
    const img = new Image();
    img.src = path;
    this.images.set(id, img);
  }

  drawImage(id, imageId, params) {
    const canvasData = this.canvases.get(id);
    const img = this.images.get(imageId);
    if (!canvasData || !img) return;

    const { ctx } = canvasData;

    if (params.sx !== undefined) {
      // Clip and scale
      ctx.drawImage(img, params.sx, params.sy, params.sw, params.sh,
                    params.dx, params.dy, params.dw, params.dh);
    } else if (params.w !== undefined) {
      // Draw scaled
      ctx.drawImage(img, params.x, params.y, params.w, params.h);
    } else {
      // Simple draw
      ctx.drawImage(img, params.x, params.y);
    }
  }

  // Canvas copy
  copyCanvas(params) {
    const sourceCanvas = this.canvases.get(params.sourceId);
    const destCanvas = this.canvases.get(params.destId);
    if (!sourceCanvas || !destCanvas) return;

    if (params.sx !== undefined) {
      // Partial copy
      destCanvas.ctx.drawImage(sourceCanvas.element,
                               params.sx, params.sy, params.sw, params.sh,
                               params.dx, params.dy, params.dw, params.dh);
    } else {
      // Full copy
      destCanvas.ctx.drawImage(sourceCanvas.element, params.x, params.y);
    }
  }

  // Fill style (gradients and patterns)
  setFillStyle(id, params) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return;

    if (params.style) {
      canvasData.ctx.fillStyle = params.style;
    } else if (params.gradient) {
      // Create gradient in context
      const grad = params.gradient;
      let ctxGradient;

      if (grad.type === 'linear') {
        ctxGradient = canvasData.ctx.createLinearGradient(grad.x1, grad.y1, grad.x2, grad.y2);
      } else if (grad.type === 'radial') {
        ctxGradient = canvasData.ctx.createRadialGradient(grad.x1, grad.y1, grad.r1, grad.x2, grad.y2, grad.r2);
      }

      if (ctxGradient && grad.stops) {
        grad.stops.forEach(stop => {
          ctxGradient.addColorStop(stop.position, stop.color);
        });
      }

      canvasData.ctx.fillStyle = ctxGradient;
    } else if (params.pattern) {
      const img = this.images.get(params.pattern.imageId);
      if (img) {
        const pattern = canvasData.ctx.createPattern(img, params.pattern.repetition);
        canvasData.ctx.fillStyle = pattern;
      }
    }
  }

  createPattern(id, imageId, repetition) {
    this.patterns.set(id, { imageId, repetition });
  }

  // Query methods for synchronous commands
  getMousePosition(id) {
    const state = this.mouseStates.get(id);
    return state ? { x: state.x, y: state.y } : { x: 0, y: 0 };
  }

  getClickState(id) {
    const state = this.mouseStates.get(id);
    return state ? state.clicked : false;
  }

  getMouseButton(id) {
    const state = this.mouseStates.get(id);
    return state ? state.button : 0;
  }

  getTextWidth(id, text) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return 0;

    return canvasData.ctx.measureText(text).width;
  }

  getPixel(id, x, y) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return '';

    const imageData = canvasData.ctx.getImageData(x, y, 1, 1);
    const [r, g, b, a] = imageData.data;
    return `rgba(${r},${g},${b},${a/255})`;
  }

  pointInPath(id, x, y) {
    const canvasData = this.canvases.get(id);
    if (!canvasData) return false;

    return canvasData.ctx.isPointInPath(x, y);
  }
}

// Export for use in renderer
window.canvasManager = new CanvasManager();