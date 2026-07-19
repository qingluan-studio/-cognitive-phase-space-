import { DataPacket } from '../shared/types';
import { Image } from './ImageProcessing';

export interface Feature {
  name: string;
  vector: number[];
  type: string;
  strength: number;
}

export interface FeatureMap {
  features: Feature[];
  width: number;
  height: number;
  depth: number;
}

export class FeatureExtraction {
  private _features: Feature[] = [];
  private _featureMap: FeatureMap | null = null;
  private _counter: number = 0;
  private _method: string = 'default';
  private _lastFeature: Feature | null = null;

  get features(): Feature[] {
    return this._features;
  }

  get featureMap(): FeatureMap | null {
    return this._featureMap;
  }

  get method(): string {
    return this._method;
  }

  hog(image: Image, params: { cellSize?: number; blockSize?: number; bins?: number } = {}): number[] {
    const cellSize = params.cellSize || 8;
    const blockSize = params.blockSize || 2;
    const bins = params.bins || 9;
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const gradient = this._computeGradient(gray);
    const cellRows = Math.floor(gray.height / cellSize);
    const cellCols = Math.floor(gray.width / cellSize);
    const cells: number[][] = [];
    for (let cy = 0; cy < cellRows; cy++) {
      for (let cx = 0; cx < cellCols; cx++) {
        const hist = new Array(bins).fill(0);
        for (let y = 0; y < cellSize; y++) {
          for (let x = 0; x < cellSize; x++) {
            const py = cy * cellSize + y;
            const px = cx * cellSize + x;
            if (py < gradient.height && px < gradient.width) {
              const mag = gradient.pixels[py][px][0];
              const angle = gradient.pixels[py][px][1];
              const binIdx = Math.floor(((angle % 180) / 180) * bins);
              hist[Math.min(binIdx, bins - 1)] += mag;
            }
          }
        }
        cells.push(hist);
      }
    }
    const feature: number[] = [];
    const blockCells = blockSize * blockSize;
    for (let by = 0; by <= cellRows - blockSize; by++) {
      for (let bx = 0; bx <= cellCols - blockSize; bx++) {
        const blockVec: number[] = [];
        for (let dy = 0; dy < blockSize; dy++) {
          for (let dx = 0; dx < blockSize; dx++) {
            const idx = (by + dy) * cellCols + (bx + dx);
            blockVec.push(...cells[idx]);
          }
        }
        const norm = Math.sqrt(blockVec.reduce((a, b) => a + b * b, 0) + 1e-6);
        for (const v of blockVec) {
          feature.push(v / norm);
        }
      }
    }
    this._method = 'hog';
    this._lastFeature = { name: 'hog', vector: feature, type: 'descriptor', strength: 1 };
    this._features.push(this._lastFeature);
    return feature;
  }

  sift(image: Image): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    const octaves = 4;
    const scalesPerOctave = 5;
    let current = gray;
    for (let o = 0; o < octaves; o++) {
      for (let s = 0; s < scalesPerOctave; s++) {
        const sigma = 1.6 * Math.pow(2, s / scalesPerOctave);
        const blurred = this._gaussianBlur(current, sigma);
        const kps = this._findExtrema(blurred, o, s);
        for (const kp of kps) {
          const descriptor = this._computeSiftDescriptor(blurred, kp.x, kp.y, kp.angle);
          features.push({
            name: `sift-${features.length}`,
            vector: descriptor,
            type: 'keypoint',
            strength: kp.strength
          });
        }
      }
      current = this._halfSize(current);
    }
    this._method = 'sift';
    this._features.push(...features);
    return features;
  }

  surf(image: Image): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    const integral = this._integralImage(gray);
    const octaves = 4;
    for (let o = 0; o < octaves; o++) {
      const filterSize = 9 * Math.pow(2, o);
      const step = Math.max(1, Math.floor(filterSize / 3));
      for (let y = filterSize; y < gray.height - filterSize; y += step) {
        for (let x = filterSize; x < gray.width - filterSize; x += step) {
          const hessian = this._hessianResponse(integral, x, y, filterSize);
          if (hessian > 1000) {
            const descriptor = new Array(64).fill(0);
            for (let i = 0; i < 64; i++) {
              descriptor[i] = (Math.sin(x * 0.1 + i * 0.5) + Math.cos(y * 0.1 + i * 0.3)) * hessian / 10000;
            }
            features.push({
              name: `surf-${features.length}`,
              vector: descriptor,
              type: 'keypoint',
              strength: hessian / 10000
            });
          }
        }
      }
    }
    this._method = 'surf';
    this._features.push(...features);
    return features;
  }

  orb(image: Image, nfeatures: number = 500): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    const fastKeypoints = this.fast(gray, 20);
    const sorted = fastKeypoints.sort((a, b) => b.strength - a.strength).slice(0, nfeatures);
    for (const kp of sorted) {
      const descriptor = this._computeBriefDescriptor(gray, Math.floor(kp.x), Math.floor(kp.y));
      features.push({
        name: `orb-${features.length}`,
        vector: descriptor,
        type: 'keypoint',
        strength: kp.strength
      });
    }
    this._method = 'orb';
    this._features.push(...features);
    return features;
  }

  brisk(image: Image): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    const threshold = 30;
    for (let y = 5; y < gray.height - 5; y += 3) {
      for (let x = 5; x < gray.width - 5; x += 3) {
        const center = gray.pixels[y][x][0];
        let count = 0;
        for (let r = 3; r <= 5; r++) {
          for (let a = 0; a < 16; a++) {
            const angle = (a / 16) * 2 * Math.PI;
            const px = Math.floor(x + r * Math.cos(angle));
            const py = Math.floor(y + r * Math.sin(angle));
            if (py >= 0 && py < gray.height && px >= 0 && px < gray.width) {
              if (Math.abs(gray.pixels[py][px][0] - center) > threshold) {
                count++;
              }
            }
          }
        }
        if (count > 12) {
          const descriptor = new Array(64).fill(0);
          for (let i = 0; i < 64; i++) {
            descriptor[i] = (this._hash(`${x}-${y}-${i}`) % 256) / 255;
          }
          features.push({
            name: `brisk-${features.length}`,
            vector: descriptor,
            type: 'keypoint',
            strength: count / 60
          });
        }
      }
    }
    this._method = 'brisk';
    this._features.push(...features);
    return features;
  }

  fast(image: Image, threshold: number = 20): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    const offsets = [
      [0, -3], [1, -3], [2, -2], [3, -1], [3, 0], [3, 1],
      [2, 2], [1, 3], [0, 3], [-1, 3], [-2, 2], [-3, 1],
      [-3, 0], [-3, -1], [-2, -2], [-1, -3]
    ];
    for (let y = 3; y < gray.height - 3; y++) {
      for (let x = 3; x < gray.width - 3; x++) {
        const center = gray.pixels[y][x][0];
        let brighter = 0;
        let darker = 0;
        for (const [dx, dy] of offsets) {
          const px = x + dx;
          const py = y + dy;
          const val = gray.pixels[py][px][0];
          if (val > center + threshold) brighter++;
          if (val < center - threshold) darker++;
        }
        if (brighter >= 12 || darker >= 12) {
          const strength = Math.max(brighter, darker) / 16;
          features.push({
            name: `fast-${features.length}`,
            vector: [x, y],
            type: 'keypoint',
            strength
          });
        }
      }
    }
    this._method = 'fast';
    this._features.push(...features);
    return features;
  }

  harrisCorner(image: Image, threshold: number = 0.01): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    const ix = this._sobelX(gray);
    const iy = this._sobelY(gray);
    const ixx: number[][] = [];
    const iyy: number[][] = [];
    const ixy: number[][] = [];
    for (let y = 0; y < gray.height; y++) {
      ixx.push([]);
      iyy.push([]);
      ixy.push([]);
      for (let x = 0; x < gray.width; x++) {
        ixx[y].push(ix.pixels[y][x][0] ** 2);
        iyy[y].push(iy.pixels[y][x][0] ** 2);
        ixy[y].push(ix.pixels[y][x][0] * iy.pixels[y][x][0]);
      }
    }
    const k = 0.04;
    const responses: number[][] = [];
    for (let y = 0; y < gray.height; y++) {
      responses.push([]);
      for (let x = 0; x < gray.width; x++) {
        const windowSize = 3;
        const half = 1;
        let sxx = 0, syy = 0, sxy = 0;
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const py = y + dy;
            const px = x + dx;
            if (py >= 0 && py < gray.height && px >= 0 && px < gray.width) {
              sxx += ixx[py][px];
              syy += iyy[py][px];
              sxy += ixy[py][px];
            }
          }
        }
        const det = sxx * syy - sxy * sxy;
        const trace = sxx + syy;
        const r = det - k * trace * trace;
        responses[y].push(r);
      }
    }
    let maxR = 0;
    for (let y = 0; y < gray.height; y++) {
      for (let x = 0; x < gray.width; x++) {
        maxR = Math.max(maxR, Math.abs(responses[y][x]));
      }
    }
    for (let y = 1; y < gray.height - 1; y++) {
      for (let x = 1; x < gray.width - 1; x++) {
        const r = responses[y][x];
        if (r > threshold * maxR) {
          let isMax = true;
          for (let dy = -1; dy <= 1 && isMax; dy++) {
            for (let dx = -1; dx <= 1 && isMax; dx++) {
              if (dy !== 0 || dx !== 0) {
                if (responses[y + dy][x + dx] >= r) {
                  isMax = false;
                }
              }
            }
          }
          if (isMax) {
            features.push({
              name: `harris-${features.length}`,
              vector: [x, y],
              type: 'corner',
              strength: r / maxR
            });
          }
        }
      }
    }
    this._method = 'harris';
    this._features.push(...features);
    return features;
  }

  lbp(image: Image, radius: number = 1, neighbors: number = 8): number[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const histogram = new Array(256).fill(0);
    for (let y = radius; y < gray.height - radius; y++) {
      for (let x = radius; x < gray.width - radius; x++) {
        const center = gray.pixels[y][x][0];
        let pattern = 0;
        for (let i = 0; i < neighbors; i++) {
          const angle = (i / neighbors) * 2 * Math.PI;
          const px = Math.floor(x + radius * Math.cos(angle));
          const py = Math.floor(y + radius * Math.sin(angle));
          if (py >= 0 && py < gray.height && px >= 0 && px < gray.width) {
            if (gray.pixels[py][px][0] >= center) {
              pattern |= 1 << i;
            }
          }
        }
        histogram[pattern]++;
      }
    }
    const total = gray.width * gray.height;
    const feature = histogram.map(v => v / total);
    this._method = 'lbp';
    this._lastFeature = { name: 'lbp', vector: feature, type: 'texture', strength: 1 };
    this._features.push(this._lastFeature);
    return feature;
  }

  colorHistogram(image: Image, bins: number = 256): number[] {
    const histogram: number[] = [];
    for (let c = 0; c < image.channels; c++) {
      const ch = new Array(bins).fill(0);
      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          const val = Math.min(bins - 1, Math.max(0, Math.floor(image.pixels[y][x][c] / (256 / bins))));
          ch[val]++;
        }
      }
      const total = image.width * image.height;
      histogram.push(...ch.map(v => v / total));
    }
    this._method = 'color-histogram';
    this._lastFeature = { name: 'color-histogram', vector: histogram, type: 'color', strength: 1 };
    this._features.push(this._lastFeature);
    return histogram;
  }

  histogramsOfOrientedGradients(image: Image): number[] {
    return this.hog(image);
  }

  gaborFilter(image: Image, params: { frequency?: number; theta?: number; sigma?: number } = {}): number[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const frequency = params.frequency || 0.1;
    const theta = params.theta || 0;
    const sigma = params.sigma || 5;
    const size = Math.ceil(sigma * 3) * 2 + 1;
    const half = Math.floor(size / 2);
    const kernel: number[][] = [];
    for (let y = 0; y < size; y++) {
      const row: number[] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - half;
        const dy = y - half;
        const xr = dx * Math.cos(theta) + dy * Math.sin(theta);
        const yr = -dx * Math.sin(theta) + dy * Math.cos(theta);
        const gaussian = Math.exp(-(xr * xr + yr * yr) / (2 * sigma * sigma));
        const sinusoid = Math.cos(2 * Math.PI * frequency * xr);
        row.push(gaussian * sinusoid);
      }
      kernel.push(row);
    }
    let mean = 0;
    let variance = 0;
    for (let y = half; y < gray.height - half; y++) {
      for (let x = half; x < gray.width - half; x++) {
        let val = 0;
        for (let ky = 0; ky < size; ky++) {
          for (let kx = 0; kx < size; kx++) {
            val += gray.pixels[y + ky - half][x + kx - half][0] * kernel[ky][kx];
          }
        }
        mean += val;
      }
    }
    const total = (gray.height - 2 * half) * (gray.width - 2 * half);
    mean /= total;
    const feature = [mean, variance / total];
    this._method = 'gabor';
    this._lastFeature = { name: 'gabor', vector: feature, type: 'texture', strength: 1 };
    this._features.push(this._lastFeature);
    return feature;
  }

  haarFeatures(image: Image, cascade: { type: string; size: number }[]): number[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const integral = this._integralImage(gray);
    const features: number[] = [];
    const windowSize = 24;
    for (let y = 0; y <= gray.height - windowSize; y += 8) {
      for (let x = 0; x <= gray.width - windowSize; x += 8) {
        let score = 0;
        for (const feat of cascade) {
          const fSize = feat.size;
          const fHalf = Math.floor(fSize / 2);
          const cx = x + Math.floor(windowSize / 2);
          const cy = y + Math.floor(windowSize / 2);
          let white = 0;
          let black = 0;
          if (feat.type === 'edge-v') {
            white = this._integralSum(integral, cx - fHalf, cy - fHalf, fHalf, fSize);
            black = this._integralSum(integral, cx, cy - fHalf, fHalf, fSize);
          } else if (feat.type === 'edge-h') {
            white = this._integralSum(integral, cx - fHalf, cy - fHalf, fSize, fHalf);
            black = this._integralSum(integral, cx - fHalf, cy, fSize, fHalf);
          }
          score += (white - black) / (fSize * fSize);
        }
        features.push(score);
      }
    }
    this._method = 'haar';
    this._lastFeature = { name: 'haar', vector: features, type: 'cascade', strength: 1 };
    this._features.push(this._lastFeature);
    return features;
  }

  fftFeatures(image: Image): number[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const size = Math.min(gray.width, gray.height);
    const n = 1 << Math.floor(Math.log2(size));
    const features: number[] = [];
    const step = Math.floor(gray.width / n);
    for (let i = 0; i < 64; i++) {
      let sum = 0;
      for (let y = 0; y < n; y += 2) {
        for (let x = 0; x < n; x += 2) {
          const py = Math.min(y * step, gray.height - 1);
          const px = Math.min(x * step, gray.width - 1);
          sum += gray.pixels[py][px][0] * Math.sin(i * x * 0.1) * Math.cos(i * y * 0.1);
        }
      }
      features.push(Math.abs(sum) / (n * n));
    }
    this._method = 'fft';
    this._lastFeature = { name: 'fft', vector: features, type: 'frequency', strength: 1 };
    this._features.push(this._lastFeature);
    return features;
  }

  featureMatching(features1: Feature[], features2: Feature[], method: string = 'brute-force'): { i: number; j: number; distance: number }[] {
    const matches: { i: number; j: number; distance: number }[] = [];
    for (let i = 0; i < features1.length; i++) {
      let bestDist = Infinity;
      let bestJ = -1;
      for (let j = 0; j < features2.length; j++) {
        const dist = this._euclideanDistance(features1[i].vector, features2[j].vector);
        if (dist < bestDist) {
          bestDist = dist;
          bestJ = j;
        }
      }
      if (bestJ >= 0) {
        matches.push({ i, j: bestJ, distance: bestDist });
      }
    }
    return matches;
  }

  private _toGray(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const p = image.pixels[y][x];
        const gray = image.channels >= 3 ? 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] : p[0];
        row.push([gray]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 1 };
  }

  private _computeGradient(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const left = x > 0 ? image.pixels[y][x - 1][0] : image.pixels[y][x][0];
        const right = x < image.width - 1 ? image.pixels[y][x + 1][0] : image.pixels[y][x][0];
        const top = y > 0 ? image.pixels[y - 1][x][0] : image.pixels[y][x][0];
        const bottom = y < image.height - 1 ? image.pixels[y + 1][x][0] : image.pixels[y][x][0];
        const gx = right - left;
        const gy = bottom - top;
        const mag = Math.sqrt(gx * gx + gy * gy);
        const angle = Math.atan2(gy, gx) * 180 / Math.PI;
        row.push([mag, angle]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 2 };
  }

  private _gaussianBlur(image: Image, sigma: number): Image {
    const kSize = Math.ceil(sigma * 3) * 2 + 1;
    const kHalf = Math.floor(kSize / 2);
    const kernel: number[] = [];
    let sum = 0;
    for (let i = 0; i < kSize; i++) {
      const x = i - kHalf;
      const val = Math.exp(-x * x / (2 * sigma * sigma));
      kernel.push(val);
      sum += val;
    }
    for (let i = 0; i < kSize; i++) {
      kernel[i] /= sum;
    }
    const temp: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        let val = 0;
        for (let k = 0; k < kSize; k++) {
          const px = Math.min(Math.max(x + k - kHalf, 0), image.width - 1);
          val += image.pixels[y][px][0] * kernel[k];
        }
        row.push([val]);
      }
      temp.push(row);
    }
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        let val = 0;
        for (let k = 0; k < kSize; k++) {
          const py = Math.min(Math.max(y + k - kHalf, 0), image.height - 1);
          val += temp[py][x][0] * kernel[k];
        }
        row.push([val]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 1 };
  }

  private _findExtrema(image: Image, octave: number, scale: number): { x: number; y: number; angle: number; strength: number }[] {
    const kps: { x: number; y: number; angle: number; strength: number }[] = [];
    for (let y = 5; y < image.height - 5; y += 3) {
      for (let x = 5; x < image.width - 5; x += 3) {
        const val = image.pixels[y][x][0];
        let isMax = true;
        let isMin = true;
        for (let dy = -1; dy <= 1 && (isMax || isMin); dy++) {
          for (let dx = -1; dx <= 1 && (isMax || isMin); dx++) {
            if (dy !== 0 || dx !== 0) {
              const py = y + dy;
              const px = x + dx;
              if (py >= 0 && py < image.height && px >= 0 && px < image.width) {
                const nv = image.pixels[py][px][0];
                if (nv >= val) isMax = false;
                if (nv <= val) isMin = false;
              }
            }
          }
        }
        if (isMax || isMin) {
          kps.push({ x, y, angle: 0, strength: Math.abs(val) / 255 });
        }
      }
    }
    return kps;
  }

  private _computeSiftDescriptor(image: Image, x: number, y: number, angle: number): number[] {
    const descriptor = new Array(128).fill(0);
    for (let i = 0; i < 128; i++) {
      descriptor[i] = (Math.sin(x * 0.01 + i * 0.1) + Math.cos(y * 0.01 + i * 0.2)) * 0.5 + 0.5;
    }
    const norm = Math.sqrt(descriptor.reduce((a, b) => a + b * b, 0)) || 1;
    return descriptor.map(v => v / norm);
  }

  private _computeBriefDescriptor(image: Image, x: number, y: number): number[] {
    const descriptor = new Array(256).fill(0);
    for (let i = 0; i < 256; i++) {
      const angle1 = i * 0.1;
      const angle2 = (i + 128) * 0.1;
      const r1 = 3 + (i % 5);
      const r2 = 3 + ((i + 3) % 5);
      const x1 = x + r1 * Math.cos(angle1);
      const y1 = y + r1 * Math.sin(angle1);
      const x2 = x + r2 * Math.cos(angle2);
      const y2 = y + r2 * Math.sin(angle2);
      const px1 = Math.floor(Math.max(0, Math.min(image.width - 1, x1)));
      const py1 = Math.floor(Math.max(0, Math.min(image.height - 1, y1)));
      const px2 = Math.floor(Math.max(0, Math.min(image.width - 1, x2)));
      const py2 = Math.floor(Math.max(0, Math.min(image.height - 1, y2)));
      descriptor[i] = image.pixels[py1][px1][0] < image.pixels[py2][px2][0] ? 1 : 0;
    }
    return descriptor;
  }

  private _halfSize(image: Image): Image {
    const newW = Math.floor(image.width / 2);
    const newH = Math.floor(image.height / 2);
    const result: number[][][] = [];
    for (let y = 0; y < newH; y++) {
      const row: number[][] = [];
      for (let x = 0; x < newW; x++) {
        row.push(image.pixels[y * 2][x * 2]);
      }
      result.push(row);
    }
    return { pixels: result, width: newW, height: newH, channels: image.channels };
  }

  private _integralImage(image: Image): number[][] {
    const integral: number[][] = [];
    for (let y = 0; y < image.height; y++) {
      integral.push(new Array(image.width).fill(0));
    }
    for (let y = 0; y < image.height; y++) {
      let rowSum = 0;
      for (let x = 0; x < image.width; x++) {
        rowSum += image.pixels[y][x][0];
        integral[y][x] = rowSum + (y > 0 ? integral[y - 1][x] : 0);
      }
    }
    return integral;
  }

  private _integralSum(integral: number[][], x: number, y: number, w: number, h: number): number {
    const x2 = Math.min(x + w - 1, integral[0].length - 1);
    const y2 = Math.min(y + h - 1, integral.length - 1);
    let sum = integral[y2][x2];
    if (x > 0) sum -= integral[y2][x - 1];
    if (y > 0) sum -= integral[y - 1][x2];
    if (x > 0 && y > 0) sum += integral[y - 1][x - 1];
    return sum;
  }

  private _hessianResponse(integral: number[][], x: number, y: number, size: number): number {
    const half = Math.floor(size / 2);
    const dxx = this._integralSum(integral, x - half, y - Math.floor(half / 3), size, Math.floor(half * 2 / 3));
    const dyy = this._integralSum(integral, x - Math.floor(half / 3), y - half, Math.floor(half * 2 / 3), size);
    const dxy = this._integralSum(integral, x - half, y - half, Math.floor(half), Math.floor(half));
    return dxx * dyy - dxy * dxy;
  }

  private _sobelX(image: Image): Image {
    const kernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    return this._convolve(image, kernel);
  }

  private _sobelY(image: Image): Image {
    const kernel = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    return this._convolve(image, kernel);
  }

  private _convolve(image: Image, kernel: number[][]): Image {
    const kSize = kernel.length;
    const kHalf = Math.floor(kSize / 2);
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        let val = 0;
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const py = Math.min(Math.max(y + ky - kHalf, 0), image.height - 1);
            const px = Math.min(Math.max(x + kx - kHalf, 0), image.width - 1);
            val += image.pixels[py][px][0] * kernel[ky][kx];
          }
        }
        row.push([val]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 1 };
  }

  private _euclideanDistance(v1: number[], v2: number[]): number {
    const minLen = Math.min(v1.length, v2.length);
    let sum = 0;
    for (let i = 0; i < minLen; i++) {
      const d = v1[i] - v2[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
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

  toPacket(): DataPacket<Feature[]> {
    this._counter++;
    return {
      id: `feature-${Date.now()}-${this._counter}`,
      payload: this._features,
      metadata: {
        createdAt: Date.now(),
        route: ['computer-vision', 'feature-extraction'],
        priority: 1,
        phase: 'feature-extraction'
      }
    };
  }

  reset(): void {
    this._features = [];
    this._featureMap = null;
    this._counter = 0;
    this._method = 'default';
    this._lastFeature = null;
  }
}
