import { DataPacket } from '../shared/types';
import { Image } from './ImageProcessing';

export interface PixelClass {
  pixel: [number, number];
  class: string;
  confidence: number;
}

export interface Segmentation {
  mask: number[][];
  classes: string[];
  scores: number[];
}

export class SemanticSegmentation {
  private _segmentations: Segmentation[] = [];
  private _classes: string[] = [];
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _lastSegmentation: Segmentation | null = null;

  get segmentations(): Segmentation[] {
    return this._segmentations;
  }

  get classes(): string[] {
    return this._classes;
  }

  get modelType(): string {
    return this._modelType;
  }

  segment(image: Image, model: { name: string; classes?: string[] }): Segmentation {
    const classes = model.classes || ['background', 'person', 'car', 'building', 'tree', 'road'];
    const mask: number[][] = [];
    const scores: number[] = [];
    const seed = this._hash(model.name + image.width + 'x' + image.height);
    let s = seed;
    for (let y = 0; y < image.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < image.width; x++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const clsIdx = Math.floor(((s % 100) / 100 + y / image.height * 0.3 + x / image.width * 0.2) * classes.length) % classes.length;
        row.push(clsIdx);
      }
      mask.push(row);
    }
    for (let i = 0; i < classes.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      scores.push(0.5 + (s % 50) / 100);
    }
    const result: Segmentation = { mask, classes, scores };
    this._lastSegmentation = result;
    this._segmentations.push(result);
    this._classes = classes;
    this._modelType = model.name;
    return result;
  }

  fcnSegment(image: Image, model: { name: string; classes?: string[] }): Segmentation {
    const result = this.segment(image, model);
    this._modelType = 'fcn';
    return result;
  }

  unetSegment(image: Image, model: { name: string; classes?: string[] }): Segmentation {
    const result = this.segment(image, model);
    this._modelType = 'unet';
    return result;
  }

  deeplabv3(image: Image, model: { name: string; classes?: string[] }): Segmentation {
    const result = this.segment(image, model);
    this._modelType = 'deeplabv3';
    return result;
  }

  maskrcnnSegment(image: Image, model: { name: string; classes?: string[] }): Segmentation {
    const result = this.segment(image, model);
    this._modelType = 'maskrcnn';
    return result;
  }

  instanceSegment(image: Image, model: { name: string; classes?: string[] }): Segmentation {
    const result = this.segment(image, model);
    this._modelType = 'instance';
    return result;
  }

  panopticSegment(image: Image, model: { name: string; classes?: string[] }): Segmentation {
    const result = this.segment(image, model);
    this._modelType = 'panoptic';
    return result;
  }

  pixelAccuracy(pred: Segmentation, groundTruth: Segmentation): number {
    let correct = 0;
    let total = 0;
    const height = Math.min(pred.mask.length, groundTruth.mask.length);
    for (let y = 0; y < height; y++) {
      const width = Math.min(pred.mask[y].length, groundTruth.mask[y].length);
      for (let x = 0; x < width; x++) {
        if (pred.mask[y][x] === groundTruth.mask[y][x]) {
          correct++;
        }
        total++;
      }
    }
    return total > 0 ? correct / total : 0;
  }

  mIoU(pred: Segmentation, groundTruth: Segmentation): number {
    const numClasses = Math.max(pred.classes.length, groundTruth.classes.length);
    let totalIoU = 0;
    let count = 0;
    for (let c = 0; c < numClasses; c++) {
      let intersection = 0;
      let union = 0;
      const height = Math.min(pred.mask.length, groundTruth.mask.length);
      for (let y = 0; y < height; y++) {
        const width = Math.min(pred.mask[y].length, groundTruth.mask[y].length);
        for (let x = 0; x < width; x++) {
          const predC = pred.mask[y][x] === c ? 1 : 0;
          const gtC = groundTruth.mask[y][x] === c ? 1 : 0;
          intersection += predC * gtC;
          union += predC + gtC - predC * gtC;
        }
      }
      if (union > 0) {
        totalIoU += intersection / union;
        count++;
      }
    }
    return count > 0 ? totalIoU / count : 0;
  }

  diceCoefficient(pred: Segmentation, groundTruth: Segmentation): number {
    let intersection = 0;
    let predSum = 0;
    let gtSum = 0;
    const height = Math.min(pred.mask.length, groundTruth.mask.length);
    for (let y = 0; y < height; y++) {
      const width = Math.min(pred.mask[y].length, groundTruth.mask[y].length);
      for (let x = 0; x < width; x++) {
        const predC = pred.mask[y][x] > 0 ? 1 : 0;
        const gtC = groundTruth.mask[y][x] > 0 ? 1 : 0;
        intersection += predC * gtC;
        predSum += predC;
        gtSum += gtC;
      }
    }
    return (predSum + gtSum) > 0 ? (2 * intersection) / (predSum + gtSum) : 0;
  }

  precisionRecall(pred: Segmentation, groundTruth: Segmentation): { precision: number; recall: number } {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    const height = Math.min(pred.mask.length, groundTruth.mask.length);
    for (let y = 0; y < height; y++) {
      const width = Math.min(pred.mask[y].length, groundTruth.mask[y].length);
      for (let x = 0; x < width; x++) {
        const predC = pred.mask[y][x] > 0 ? 1 : 0;
        const gtC = groundTruth.mask[y][x] > 0 ? 1 : 0;
        if (predC === 1 && gtC === 1) tp++;
        if (predC === 1 && gtC === 0) fp++;
        if (predC === 0 && gtC === 1) fn++;
      }
    }
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    return { precision, recall };
  }

  colorizeSegmentation(mask: number[][], palette: [number, number, number][]): number[][][] {
    const result: number[][][] = [];
    for (let y = 0; y < mask.length; y++) {
      const row: number[][] = [];
      for (let x = 0; x < mask[y].length; x++) {
        const clsIdx = mask[y][x];
        row.push(palette[clsIdx % palette.length]);
      }
      result.push(row);
    }
    return result;
  }

  contourExtraction(mask: number[][]): [number, number][][] {
    const contours: [number, number][][] = [];
    const height = mask.length;
    const width = mask[0]?.length || 0;
    const visited: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      visited.push(new Array(width).fill(false));
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x] > 0 && !visited[y][x]) {
          const contour: [number, number][] = [];
          this._traceContour(mask, visited, x, y, contour);
          if (contour.length > 2) {
            contours.push(contour);
          }
        }
      }
    }
    return contours;
  }

  private _traceContour(mask: number[][], visited: boolean[][], startX: number, startY: number, contour: [number, number][]): void {
    const height = mask.length;
    const width = mask[0]?.length || 0;
    const directions = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    let x = startX;
    let y = startY;
    let dir = 0;
    let first = true;
    while (first || (x !== startX || y !== startY)) {
      first = false;
      contour.push([x, y]);
      visited[y][x] = true;
      let found = false;
      for (let d = 0; d < 8; d++) {
        const nd = (dir + d) % 8;
        const nx = x + directions[nd][0];
        const ny = y + directions[nd][1];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny][nx] > 0 && !visited[ny][nx]) {
          x = nx;
          y = ny;
          dir = (nd + 5) % 8;
          found = true;
          break;
        }
      }
      if (!found) break;
    }
  }

  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  toPacket(): DataPacket<Segmentation> {
    const result = this._lastSegmentation || { mask: [], classes: [], scores: [] };
    this._counter++;
    return {
      id: `segmentation-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['computer-vision', 'semantic-segmentation'],
        priority: 1,
        phase: 'segmentation'
      }
    };
  }

  reset(): void {
    this._segmentations = [];
    this._classes = [];
    this._counter = 0;
    this._modelType = 'default';
    this._lastSegmentation = null;
  }
}
