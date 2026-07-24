/**
 * Symbolic Canvas Engine — 符号画布引擎
 *
 * DeepSeek 提出的核心思想：让 AI 不直接生成像素，而是生成绘制指令。
 * 颜色、笔触、形状都被编码为符号（例如 1=红色、2=蓝色），
 * 本地渲染器解释这些符号并生成最终图像/视频帧。
 *
 * 优势：
 *   - 指令级表示体积极小（几 KB 可替代几 MB 像素图）
 *   - 可无限扩展：向右/向下 append 符号序列即可
 *   - 天然适合水逻辑：轨迹可在符号空间中施加物理约束
 *   - 无外部 API：AI 只产文本/代码，渲染在本地完成
 *
 * 扩展性：
 *   - 单个 SymbolicCanvas 可以水平或垂直 extend，生成长卷
 *   - 多个 canvas 可以按时间轴排列，构成视频
 */

import { DataPacket } from '../shared/types';

function _genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ColorToken {
  id: number;
  name: string;
  rgb: [number, number, number];
}

export interface BrushToken {
  id: number;
  name: string;
  size: number;
  opacity: number;
}

export interface CanvasCell {
  x: number;
  y: number;
  colorId: number;
  brushId: number;
  depth: number; // z-order / layer
}

export interface SymbolicCanvas {
  id: string;
  width: number;
  height: number;
  cells: CanvasCell[];
  palette: Record<number, ColorToken>;
  brushes: Record<number, BrushToken>;
  instructionHistory: string[];
}

export interface RenderOptions {
  scale: number;
  background: [number, number, number];
  antialias: boolean;
}

export class SymbolicCanvasEngine {
  private _palette: Record<number, ColorToken> = {
    0: { id: 0, name: 'void', rgb: [0, 0, 0] },
    1: { id: 1, name: 'red', rgb: [255, 0, 0] },
    2: { id: 2, name: 'blue', rgb: [0, 0, 255] },
    3: { id: 3, name: 'green', rgb: [0, 255, 0] },
    4: { id: 4, name: 'white', rgb: [255, 255, 255] },
    5: { id: 5, name: 'sky', rgb: [135, 206, 235] },
    6: { id: 6, name: 'earth', rgb: [139, 69, 19] },
    7: { id: 7, name: 'leaf', rgb: [34, 139, 34] },
  };

  private _brushes: Record<number, BrushToken> = {
    0: { id: 0, name: 'pixel', size: 1, opacity: 1.0 },
    1: { id: 1, name: 'soft', size: 2, opacity: 0.7 },
    2: { id: 2, name: 'broad', size: 4, opacity: 0.9 },
  };

  constructor() {}

  get palette(): Record<number, ColorToken> {
    return { ...this._palette };
  }

  get brushes(): Record<number, BrushToken> {
    return { ...this._brushes };
  }

  /**
   * 从 AI 生成的指令创建画布。
   * 指令格式示例：
   *   "fill 1"           -> 用颜色 1（红）填满画布
   *   "line 0 0 10 0 2"  -> 从 (0,0) 到 (10,0) 画颜色 2（蓝）的线
   *   "rect 5 5 8 8 3"   -> 从 (5,5) 到 (8,8) 填充颜色 3（绿）
   */
  createCanvas(
    instructions: string[],
    width = 64,
    height = 64,
  ): SymbolicCanvas {
    const canvas: SymbolicCanvas = {
      id: `canvas-${_genId()}`,
      width,
      height,
      cells: [],
      palette: this._palette,
      brushes: this._brushes,
      instructionHistory: [...instructions],
    };

    // 默认背景用 void(0)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        canvas.cells.push({ x, y, colorId: 0, brushId: 0, depth: 0 });
      }
    }

    for (const instr of instructions) {
      this._executeInstruction(canvas, instr);
    }

    return canvas;
  }

  /**
   * 水平扩展画布：在右侧追加新的符号列。
   * 适合生成清明上河图式的长卷。
   */
  extendHorizontal(canvas: SymbolicCanvas, instructions: string[]): SymbolicCanvas {
    const extensionWidth = this._estimateWidth(instructions);
    const newWidth = canvas.width + extensionWidth;
    const extended: SymbolicCanvas = {
      id: `${canvas.id}-ext-h`,
      width: newWidth,
      height: canvas.height,
      cells: [...canvas.cells],
      palette: canvas.palette,
      brushes: canvas.brushes,
      instructionHistory: [...canvas.instructionHistory, ...instructions],
    };

    // 新增列先用 void 填充
    for (let y = 0; y < canvas.height; y++) {
      for (let x = canvas.width; x < newWidth; x++) {
        extended.cells.push({ x, y, colorId: 0, brushId: 0, depth: 0 });
      }
    }

    for (const instr of instructions) {
      this._executeInstruction(extended, instr, canvas.width, 0);
    }

    return extended;
  }

  /**
   * 垂直扩展画布：在底部追加新的符号行。
   */
  extendVertical(canvas: SymbolicCanvas, instructions: string[]): SymbolicCanvas {
    const extensionHeight = this._estimateHeight(instructions);
    const newHeight = canvas.height + extensionHeight;
    const extended: SymbolicCanvas = {
      id: `${canvas.id}-ext-v`,
      width: canvas.width,
      height: newHeight,
      cells: [...canvas.cells],
      palette: canvas.palette,
      brushes: canvas.brushes,
      instructionHistory: [...canvas.instructionHistory, ...instructions],
    };

    for (let y = canvas.height; y < newHeight; y++) {
      for (let x = 0; x < canvas.width; x++) {
        extended.cells.push({ x, y, colorId: 0, brushId: 0, depth: 0 });
      }
    }

    for (const instr of instructions) {
      this._executeInstruction(extended, instr, 0, canvas.height);
    }

    return extended;
  }

  /**
   * 将符号画布渲染为像素矩阵。
   * 这里返回一个纯 TS 表示，未来可对接 Canvas API / ImageData。
   */
  renderToPixels(
    canvas: SymbolicCanvas,
    options: Partial<RenderOptions> = {},
  ): number[][][] {
    const opts: RenderOptions = {
      scale: 1,
      background: [0, 0, 0],
      antialias: false,
      ...options,
    };

    const w = canvas.width * opts.scale;
    const h = canvas.height * opts.scale;
    const pixels: number[][][] = [];

    for (let y = 0; y < h; y++) {
      const row: number[][] = [];
      for (let x = 0; x < w; x++) {
        const cx = Math.floor(x / opts.scale);
        const cy = Math.floor(y / opts.scale);
        const cell = this._findCell(canvas, cx, cy);
        const color = cell ? canvas.palette[cell.colorId]?.rgb ?? opts.background : opts.background;
        row.push(color);
      }
      pixels.push(row);
    }

    return pixels;
  }

  /**
   * 将多个 SymbolicCanvas 按时间轴组合成视频帧序列。
   */
  canvasSequenceToFrames(canvases: SymbolicCanvas[]): number[][][][] {
    return canvases.map((c) => this.renderToPixels(c));
  }

  toPacket(canvas: SymbolicCanvas): DataPacket<SymbolicCanvas> {
    return {
      id: `packet-${_genId()}`,
      payload: canvas,
      metadata: {
        createdAt: Date.now(),
        route: ['ouroboros', 'symbolic-canvas'],
        priority: 1,
        phase: 'rendered',
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // 内部工具
  // ═══════════════════════════════════════════════════════════════════

  private _executeInstruction(
    canvas: SymbolicCanvas,
    instr: string,
    offsetX = 0,
    offsetY = 0,
  ): void {
    const parts = instr.trim().toLowerCase().split(/\s+/);
    if (parts.length === 0) return;

    const cmd = parts[0];
    const nums = parts.slice(1).map((p) => parseInt(p, 10));

    if (cmd === 'fill' && nums.length >= 1) {
      const colorId = nums[0];
      for (const cell of canvas.cells) {
        cell.colorId = colorId;
      }
    }

    if (cmd === 'line' && nums.length >= 5) {
      const [x0, y0, x1, y1, colorId] = nums;
      this._drawLine(canvas, x0 + offsetX, y0 + offsetY, x1 + offsetX, y1 + offsetY, colorId);
    }

    if (cmd === 'rect' && nums.length >= 5) {
      const [x0, y0, x1, y1, colorId] = nums;
      for (let y = y0 + offsetY; y <= y1 + offsetY; y++) {
        for (let x = x0 + offsetX; x <= x1 + offsetX; x++) {
          this._setCell(canvas, x, y, colorId);
        }
      }
    }

    if (cmd === 'point' && nums.length >= 3) {
      const [x, y, colorId] = nums;
      this._setCell(canvas, x + offsetX, y + offsetY, colorId);
    }
  }

  private _drawLine(
    canvas: SymbolicCanvas,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    colorId: number,
  ): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      this._setCell(canvas, x, y, colorId);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  private _setCell(canvas: SymbolicCanvas, x: number, y: number, colorId: number): void {
    const cell = this._findCell(canvas, x, y);
    if (cell) {
      cell.colorId = colorId;
    }
  }

  private _findCell(canvas: SymbolicCanvas, x: number, y: number): CanvasCell | undefined {
    return canvas.cells.find((c) => c.x === x && c.y === y);
  }

  private _estimateWidth(instructions: string[]): number {
    let maxX = 0;
    for (const instr of instructions) {
      const nums = instr.split(/\s+/).slice(1).map((p) => parseInt(p, 10));
      for (const n of nums) {
        if (!isNaN(n)) maxX = Math.max(maxX, n);
      }
    }
    return maxX + 1;
  }

  private _estimateHeight(instructions: string[]): number {
    // 与 width 逻辑相同，都是按最大坐标估算
    return this._estimateWidth(instructions);
  }
}
