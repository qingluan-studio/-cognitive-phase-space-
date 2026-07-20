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

export interface KeyPoint {
  x: number;
  y: number;
  angle: number;
  scale: number;
  response: number;
  octave: number;
  layer: number;
}

export interface FeatureMatch {
  queryIdx: number;
  trainIdx: number;
  distance: number;
  score: number;
}

export interface FeatureCluster {
  id: number;
  centroid: number[];
  members: number[];
  label: string;
}

export interface FeatureStat {
  totalFeatures: number;
  totalDescriptors: number;
  methodCount: number;
  avgStrength: number;
  avgDim: number;
  matches: number;
  inliers: number;
  clusters: number;
}

export type DescriptorType = 'binary' | 'float' | 'histogram' | 'keypoint';
export type MatchStrategy = 'brute-force' | 'knn' | 'flann' | 'ratio-test' | 'cross-check' | 'ransac';

/**
 * FeatureExtraction
 * Comprehensive feature extraction module covering classical (HOG, SIFT, SURF, ORB,
 * BRIEF, BRISK, FAST, Harris, LBP, Gabor, Haar, FFT), modern binary descriptors
 * (AKAZE, KAZE, FREAK, LATCH, DAISY), feature matching (Brute-Force, FLANN-like,
 * Ratio Test, Cross-Check, RANSAC), homography estimation, PCA reduction,
 * Bag-of-Visual-Words clustering and CNN feature-map simulation.
 */
export class FeatureExtraction {
  private _features: Feature[] = [];
  private _featureMap: FeatureMap | null = null;
  private _counter: number = 0;
  private _method: string = 'default';
  private _lastFeature: Feature | null = null;
  private _matches: FeatureMatch[] = [];
  private _clusters: FeatureCluster[] = [];
  private _vocabulary: number[][] = [];
  private _bovwHistogram: number[] = [];
  private _homography: number[][] | null = null;
  private _inlierMask: boolean[] = [];
  private _dimReduction: number[][] | null = null;
  private _keypoints: KeyPoint[] = [];
  private _maxFeatures: number = 5000;
  private _contrastThreshold: number = 0.04;
  private _edgeThreshold: number = 10;
  private _sigma: number = 1.6;
  private _nOctaveLayers: number = 3;
  private _matchThreshold: number = 0.75;

  get features(): Feature[] {
    return this._features;
  }

  get featureMap(): FeatureMap | null {
    return this._featureMap;
  }

  get method(): string {
    return this._method;
  }

  get matches(): FeatureMatch[] {
    return this._matches;
  }

  get clusters(): FeatureCluster[] {
    return this._clusters;
  }

  get vocabulary(): number[][] {
    return this._vocabulary;
  }

  get homography(): number[][] | null {
    return this._homography;
  }

  get keypoints(): KeyPoint[] {
    return this._keypoints;
  }

  get maxFeatures(): number {
    return this._maxFeatures;
  }

  set maxFeatures(value: number) {
    this._maxFeatures = Math.max(1, Math.floor(value));
  }

  get contrastThreshold(): number {
    return this._contrastThreshold;
  }

  set contrastThreshold(value: number) {
    this._contrastThreshold = Math.max(0, Math.min(1, value));
  }

  get matchThreshold(): number {
    return this._matchThreshold;
  }

  set matchThreshold(value: number) {
    this._matchThreshold = Math.max(0, Math.min(1, value));
  }

  // ===========================================================================
  // Histogram of Oriented Gradients (HOG)
  // ===========================================================================
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

  histogramsOfOrientedGradients(image: Image): number[] {
    return this.hog(image);
  }

  // ===========================================================================
  // SIFT (Scale-Invariant Feature Transform)
  // ===========================================================================
  sift(image: Image): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    const keypoints: KeyPoint[] = [];
    const octaves = 4;
    const scalesPerOctave = 5;
    let current = gray;
    for (let o = 0; o < octaves; o++) {
      for (let s = 0; s < scalesPerOctave; s++) {
        const sigma = this._sigma * Math.pow(2, s / scalesPerOctave);
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
          keypoints.push({
            x: kp.x,
            y: kp.y,
            angle: kp.angle,
            scale: sigma,
            response: kp.strength,
            octave: o,
            layer: s
          });
        }
      }
      current = this._halfSize(current);
    }
    this._method = 'sift';
    this._features.push(...features);
    this._keypoints.push(...keypoints);
    return features;
  }

  // ===========================================================================
  // SURF (Speeded-Up Robust Features)
  // ===========================================================================
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
            const descriptor = this._computeSurfDescriptor(gray, x, y);
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

  private _computeSurfDescriptor(image: Image, x: number, y: number): number[] {
    const descriptor = new Array(64).fill(0);
    for (let i = 0; i < 64; i++) {
      descriptor[i] = (Math.sin(x * 0.1 + i * 0.5) + Math.cos(y * 0.1 + i * 0.3)) * 0.5 + 0.5;
    }
    const norm = Math.sqrt(descriptor.reduce((a, b) => a + b * b, 0)) || 1;
    return descriptor.map(v => v / norm);
  }

  // ===========================================================================
  // ORB (Oriented FAST and Rotated BRIEF)
  // ===========================================================================
  orb(image: Image, nfeatures: number = 500): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    const fastKeypoints = this.fast(gray, 20);
    const sorted = fastKeypoints.sort((a, b) => b.strength - a.strength).slice(0, nfeatures);
    for (const kp of sorted) {
      // Bug fix: Feature type only has { name, vector, type, strength }
      // fast() returns vector=[x, y], so we must read from vector instead of x/y.
      const kx = kp.vector[0];
      const ky = kp.vector[1];
      const angle = this._computeOrientation(gray, Math.floor(kx), Math.floor(ky));
      const descriptor = this._computeBriefDescriptor(gray, Math.floor(kx), Math.floor(ky));
      features.push({
        name: `orb-${features.length}`,
        vector: descriptor,
        type: 'keypoint',
        strength: kp.strength
      });
      this._keypoints.push({
        x: kx,
        y: ky,
        angle,
        scale: 1,
        response: kp.strength,
        octave: 0,
        layer: 0
      });
    }
    this._method = 'orb';
    this._features.push(...features);
    return features;
  }

  private _computeOrientation(image: Image, x: number, y: number): number {
    const radius = 7;
    let m01 = 0;
    let m10 = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = Math.min(Math.max(x + dx, 0), image.width - 1);
        const py = Math.min(Math.max(y + dy, 0), image.height - 1);
        const val = image.pixels[py][px][0];
        m01 += dy * val;
        m10 += dx * val;
      }
    }
    return Math.atan2(m01, m10);
  }

  // ===========================================================================
  // BRISK (Binary Robust Invariant Scalable Keypoints)
  // ===========================================================================
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

  // ===========================================================================
  // FAST (Features from Accelerated Segment Test)
  // ===========================================================================
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

  // ===========================================================================
  // Harris Corner Detector
  // ===========================================================================
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

  // ===========================================================================
  // Shi-Tomasi Corner Detector (Good Features To Track)
  // ===========================================================================
  shiTomasi(image: Image, maxCorners: number = 100, qualityLevel: number = 0.01): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const ix = this._sobelX(gray);
    const iy = this._sobelY(gray);
    const responses: number[][] = [];
    let maxR = 0;
    for (let y = 1; y < gray.height - 1; y++) {
      const row: number[] = [];
      for (let x = 1; x < gray.width - 1; x++) {
        let sxx = 0, syy = 0, sxy = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const gx = ix.pixels[y + dy][x + dx][0];
            const gy = iy.pixels[y + dy][x + dx][0];
            sxx += gx * gx;
            syy += gy * gy;
            sxy += gx * gy;
          }
        }
        const trace = sxx + syy;
        const det = sxx * syy - sxy * sxy;
        const lam = (trace - Math.sqrt(Math.max(0, trace * trace - 4 * det))) / 2;
        row.push(lam);
        if (lam > maxR) maxR = lam;
      }
      responses.push(row);
    }
    const candidates: Feature[] = [];
    const threshold = qualityLevel * maxR;
    for (let y = 0; y < responses.length; y++) {
      for (let x = 0; x < responses[y].length; x++) {
        if (responses[y][x] > threshold) {
          candidates.push({
            name: `shitomasi-${candidates.length}`,
            vector: [x + 1, y + 1],
            type: 'corner',
            strength: responses[y][x] / maxR
          });
        }
      }
    }
    candidates.sort((a, b) => b.strength - a.strength);
    const result = candidates.slice(0, maxCorners);
    this._method = 'shi-tomasi';
    this._features.push(...result);
    return result;
  }

  // ===========================================================================
  // LBP (Local Binary Pattern) - texture descriptor
  // ===========================================================================
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

  // Uniform LBP: only 58 patterns of (8,1) are uniform.
  uniformLbp(image: Image, radius: number = 1, neighbors: number = 8): number[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const uniformCount = neighbors * (neighbors - 1) + 3;
    const histogram = new Array(uniformCount).fill(0);
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
        const transitions = this._countTransitions(pattern, neighbors);
        const bin = transitions <= 2 ? this._uniformMap(pattern, neighbors) : uniformCount - 1;
        histogram[bin]++;
      }
    }
    const total = gray.width * gray.height;
    this._method = 'uniform-lbp';
    const feature = histogram.map(v => v / total);
    this._lastFeature = { name: 'uniform-lbp', vector: feature, type: 'texture', strength: 1 };
    this._features.push(this._lastFeature);
    return feature;
  }

  private _countTransitions(pattern: number, n: number): number {
    let count = 0;
    for (let i = 0; i < n; i++) {
      const b1 = (pattern >> i) & 1;
      const b2 = (pattern >> ((i + 1) % n)) & 1;
      if (b1 !== b2) count++;
    }
    return count;
  }

  private _uniformMap(pattern: number, n: number): number {
    let ones = 0;
    for (let i = 0; i < n; i++) {
      if ((pattern >> i) & 1) ones++;
    }
    if (ones === 0) return 0;
    if (ones === n) return n * (n - 1) + 1;
    let start = 0;
    while (((pattern >> start) & 1) === 0) start++;
    return (ones - 1) * n + start + 1;
  }

  // ===========================================================================
  // Color histogram
  // ===========================================================================
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

  // HSV color histogram ( HSV )
  hsvHistogram(image: Image, bins: number = 16): number[] {
    const hist = new Array(bins * 3).fill(0);
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const r = image.pixels[y][x][0] / 255;
        const g = image.channels > 1 ? image.pixels[y][x][1] / 255 : r;
        const b = image.channels > 2 ? image.pixels[y][x][2] / 255 : r;
        const { h, s, v } = this._rgb2hsv(r, g, b);
        hist[Math.floor(h * bins) % bins]++;
        hist[bins + Math.floor(s * bins)]++;
        hist[2 * bins + Math.floor(v * bins)]++;
      }
    }
    const total = image.width * image.height;
    const feat = hist.map(v => v / total);
    this._method = 'hsv-histogram';
    this._lastFeature = { name: 'hsv-histogram', vector: feat, type: 'color', strength: 1 };
    this._features.push(this._lastFeature);
    return feat;
  }

  private _rgb2hsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
      if (h < 0) h += 1;
    }
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h, s, v };
  }

  // ===========================================================================
  // Gabor filter response ( texture )
  // ===========================================================================
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
    const total = Math.max(1, (gray.height - 2 * half) * (gray.width - 2 * half));
    mean /= total;
    const feature = [mean, variance / total];
    this._method = 'gabor';
    this._lastFeature = { name: 'gabor', vector: feature, type: 'texture', strength: 1 };
    this._features.push(this._lastFeature);
    return feature;
  }

  // Gabor bank: multiple orientations and frequencies
  gaborBank(image: Image, orientations: number = 8, scales: number = 4): number[] {
    const features: number[] = [];
    for (let s = 0; s < scales; s++) {
      const frequency = 0.05 + s * 0.1;
      for (let o = 0; o < orientations; o++) {
        const theta = (o / orientations) * Math.PI;
        const f = this.gaborFilter(image, { frequency, theta, sigma: 3 + s });
        features.push(...f);
      }
    }
    this._method = 'gabor-bank';
    this._lastFeature = { name: 'gabor-bank', vector: features, type: 'texture', strength: 1 };
    this._features.push(this._lastFeature);
    return features;
  }

  // ===========================================================================
  // Haar-like features ( cascade )
  // ===========================================================================
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
          } else if (feat.type === 'diagonal') {
            const q = Math.floor(fSize / 2);
            const tl = this._integralSum(integral, cx - fHalf, cy - fHalf, q, q);
            const br = this._integralSum(integral, cx, cy, q, q);
            const tr = this._integralSum(integral, cx, cy - fHalf, q, q);
            const bl = this._integralSum(integral, cx - fHalf, cy, q, q);
            white = tl + br;
            black = tr + bl;
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

  // ===========================================================================
  // FFT-based features ( frequency-domain )
  // ===========================================================================
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

  // Power spectral density feature
  powerSpectrum(image: Image): number[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: number[] = [];
    const size = Math.min(gray.width, gray.height);
    const n = 1 << Math.floor(Math.log2(size));
    let totalEnergy = 0;
    for (let u = 0; u < n; u++) {
      let energy = 0;
      for (let v = 0; v < n; v++) {
        let re = 0;
        let im = 0;
        for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) {
            const angle = 2 * Math.PI * ((u * x + v * y) / n);
            re += gray.pixels[Math.min(y, gray.height - 1)][Math.min(x, gray.width - 1)][0] * Math.cos(angle);
            im -= gray.pixels[Math.min(y, gray.height - 1)][Math.min(x, gray.width - 1)][0] * Math.sin(angle);
          }
        }
        energy += re * re + im * im;
      }
      features.push(energy / (n * n));
      totalEnergy += energy;
    }
    if (totalEnergy > 0) {
      for (let i = 0; i < features.length; i++) features[i] /= totalEnergy;
    }
    this._method = 'power-spectrum';
    this._lastFeature = { name: 'power-spectrum', vector: features, type: 'frequency', strength: 1 };
    this._features.push(this._lastFeature);
    return features;
  }

  // ===========================================================================
  // AKAZE (Accelerated-KAZE) - simulated
  // ===========================================================================
  akaze(image: Image, threshold: number = 0.001): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    // Nonlinear scale space (simulated with successive Gaussian blurs)
    let current = gray;
    for (let o = 0; o < 4; o++) {
      const blurred = this._gaussianBlur(current, 1.6 * Math.pow(2, o / 3));
      for (let y = 5; y < blurred.height - 5; y += 2) {
        for (let x = 5; x < blurred.width - 5; x += 2) {
          const det = this._hessianDeterminant(blurred, x, y);
          if (det > threshold) {
            const descriptor = this._computeMldbDescriptor(blurred, x, y);
            features.push({
              name: `akaze-${features.length}`,
              vector: descriptor,
              type: 'keypoint',
              strength: det
            });
          }
        }
      }
      current = this._halfSize(current);
    }
    this._method = 'akaze';
    this._features.push(...features);
    return features;
  }

  private _hessianDeterminant(image: Image, x: number, y: number): number {
    const dxx = this._secondDerivative(image, x, y, 'x');
    const dyy = this._secondDerivative(image, x, y, 'y');
    const dxy = this._secondDerivative(image, x, y, 'xy');
    return dxx * dyy - dxy * dxy;
  }

  private _secondDerivative(image: Image, x: number, y: number, dir: 'x' | 'y' | 'xy'): number {
    const pix = (px: number, py: number) => {
      const cx = Math.min(Math.max(px, 0), image.width - 1);
      const cy = Math.min(Math.max(py, 0), image.height - 1);
      return image.pixels[cy][cx][0];
    };
    if (dir === 'x') return pix(x + 1, y) - 2 * pix(x, y) + pix(x - 1, y);
    if (dir === 'y') return pix(x, y + 1) - 2 * pix(x, y) + pix(x, y - 1);
    return (pix(x + 1, y + 1) - pix(x - 1, y + 1) - pix(x + 1, y - 1) + pix(x - 1, y - 1)) / 4;
  }

  private _computeMldbDescriptor(image: Image, x: number, y: number): number[] {
    const descriptor = new Array(486).fill(0);
    let idx = 0;
    for (let r = 1; r <= 3; r++) {
      for (let i = 0; i < r * 8; i++) {
        const angle = (i / (r * 8)) * 2 * Math.PI;
        const px = Math.floor(x + r * 2 * Math.cos(angle));
        const py = Math.floor(y + r * 2 * Math.sin(angle));
        if (px >= 0 && px < image.width && py >= 0 && py < image.height) {
          descriptor[idx] = image.pixels[py][px][0] / 255;
        }
        idx++;
      }
    }
    return descriptor.slice(0, 486);
  }

  // ===========================================================================
  // KAZE features (simulated)
  // ===========================================================================
  kaze(image: Image, threshold: number = 0.001): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    for (let o = 0; o < 4; o++) {
      const blurred = this._gaussianBlur(gray, 1.6 * Math.pow(2, o / 3));
      for (let y = 5; y < blurred.height - 5; y += 3) {
        for (let x = 5; x < blurred.width - 5; x += 3) {
          const det = this._hessianDeterminant(blurred, x, y);
          if (det > threshold) {
            const desc = new Array(64).fill(0);
            for (let i = 0; i < 64; i++) {
              desc[i] = (Math.sin(x * 0.05 + i * 0.2) + Math.cos(y * 0.05 + i * 0.3)) * 0.5 + 0.5;
            }
            const norm = Math.sqrt(desc.reduce((a, b) => a + b * b, 0)) || 1;
            features.push({
              name: `kaze-${features.length}`,
              vector: desc.map(v => v / norm),
              type: 'keypoint',
              strength: det
            });
          }
        }
      }
    }
    this._method = 'kaze';
    this._features.push(...features);
    return features;
  }

  // ===========================================================================
  // BRIEF descriptor (binary, simulated as float)
  // ===========================================================================
  brief(image: Image, keypoints: Feature[]): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const descriptors: Feature[] = [];
    for (const kp of keypoints) {
      const x = Math.floor(kp.vector[0]);
      const y = Math.floor(kp.vector[1]);
      const desc = this._computeBriefDescriptor(gray, x, y);
      descriptors.push({
        name: `brief-${descriptors.length}`,
        vector: desc,
        type: 'binary',
        strength: kp.strength
      });
    }
    this._method = 'brief';
    this._features.push(...descriptors);
    return descriptors;
  }

  // ===========================================================================
  // FREAK descriptor (simulated binary)
  // ===========================================================================
  freak(image: Image, keypoints: Feature[]): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const descriptors: Feature[] = [];
    const rings = [6, 6, 6, 6, 6, 6, 6, 6];
    for (const kp of keypoints) {
      const x = Math.floor(kp.vector[0]);
      const y = Math.floor(kp.vector[1]);
      const desc: number[] = [];
      let r = 1;
      for (const cnt of rings) {
        for (let i = 0; i < cnt; i++) {
          const angle = (i / cnt) * 2 * Math.PI;
          const px = Math.floor(x + r * Math.cos(angle));
          const py = Math.floor(y + r * Math.sin(angle));
          const qpx = Math.floor(x + (r + 2) * Math.cos(angle));
          const qpy = Math.floor(y + (r + 2) * Math.sin(angle));
          if (px >= 0 && px < gray.width && py >= 0 && py < gray.height &&
              qpx >= 0 && qpx < gray.width && qpy >= 0 && qpy < gray.height) {
            desc.push(gray.pixels[py][px][0] < gray.pixels[qpy][qpx][0] ? 1 : 0);
          } else {
            desc.push(0);
          }
        }
        r++;
      }
      descriptors.push({
        name: `freak-${descriptors.length}`,
        vector: desc,
        type: 'binary',
        strength: kp.strength
      });
    }
    this._method = 'freak';
    this._features.push(...descriptors);
    return descriptors;
  }

  // ===========================================================================
  // LATCH descriptor
  // ===========================================================================
  latch(image: Image, keypoints: Feature[]): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const descriptors: Feature[] = [];
    for (const kp of keypoints) {
      const x = Math.floor(kp.vector[0]);
      const y = Math.floor(kp.vector[1]);
      const desc = new Array(512).fill(0);
      for (let i = 0; i < 512; i++) {
        const a = this._hash(`${i}-a`) % 7 - 3;
        const b = this._hash(`${i}-b`) % 7 - 3;
        const c = this._hash(`${i}-c`) % 7 - 3;
        const pixA = this._pixelAtSafe(gray, x + a, y + a);
        const pixB = this._pixelAtSafe(gray, x + b, y - b);
        const pixC = this._pixelAtSafe(gray, x - c, y + c);
        desc[i] = (pixA - pixB) * (pixA - pixB) > (pixA - pixC) * (pixA - pixC) ? 1 : 0;
      }
      descriptors.push({
        name: `latch-${descriptors.length}`,
        vector: desc,
        type: 'binary',
        strength: kp.strength
      });
    }
    this._method = 'latch';
    this._features.push(...descriptors);
    return descriptors;
  }

  private _pixelAtSafe(image: Image, x: number, y: number): number {
    const px = Math.min(Math.max(x, 0), image.width - 1);
    const py = Math.min(Math.max(y, 0), image.height - 1);
    return image.pixels[py][px][0];
  }

  // ===========================================================================
  // DAISY descriptor
  // ===========================================================================
  daisy(image: Image, keypoints: Feature[]): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const descriptors: Feature[] = [];
    const rings = 3;
    const ringRadii = [4, 8, 12];
    const histograms = 8;
    const bins = 8;
    for (const kp of keypoints) {
      const x = Math.floor(kp.vector[0]);
      const y = Math.floor(kp.vector[1]);
      const desc: number[] = [];
      for (let r = 0; r < rings; r++) {
        const radius = ringRadii[r];
        for (let h = 0; h < histograms; h++) {
          const angle = (h / histograms) * 2 * Math.PI;
          const cx = x + radius * Math.cos(angle);
          const cy = y + radius * Math.sin(angle);
          for (let b = 0; b < bins; b++) {
            const dx = (b % 3) - 1;
            const dy = Math.floor(b / 3) - 1;
            desc.push(this._pixelAtSafe(gray, Math.floor(cx + dx), Math.floor(cy + dy)));
          }
        }
      }
      const norm = Math.sqrt(desc.reduce((a, b) => a + b * b, 0)) || 1;
      descriptors.push({
        name: `daisy-${descriptors.length}`,
        vector: desc.map(v => v / norm),
        type: 'descriptor',
        strength: kp.strength
      });
    }
    this._method = 'daisy';
    this._features.push(...descriptors);
    return descriptors;
  }

  // ===========================================================================
  // BOW / Bag-of-Visual-Words
  // ===========================================================================
  buildVocabulary(images: Image[], k: number = 100, sampleSize: number = 1000): number[][] {
    const allDescriptors: number[][] = [];
    for (const img of images) {
      const feats = this.sift(img);
      const sampled = this._sampleArray(feats.map(f => f.vector), sampleSize);
      allDescriptors.push(...sampled);
    }
    const vocabulary = this._kmeans(allDescriptors, k, 10);
    this._vocabulary = vocabulary;
    return vocabulary;
  }

  computeBoVW(image: Image): number[] {
    if (this._vocabulary.length === 0) {
      throw new Error('Vocabulary not built. Call buildVocabulary first.');
    }
    const features = this.sift(image);
    const hist = new Array(this._vocabulary.length).fill(0);
    for (const f of features) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < this._vocabulary.length; i++) {
        const d = this._euclideanDistance(f.vector, this._vocabulary[i]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      hist[bestIdx]++;
    }
    const total = hist.reduce((a, b) => a + b, 0) || 1;
    this._bovwHistogram = hist.map(v => v / total);
    this._method = 'bovw';
    this._lastFeature = { name: 'bovw', vector: this._bovwHistogram, type: 'histogram', strength: 1 };
    this._features.push(this._lastFeature);
    return this._bovwHistogram;
  }

  private _sampleArray<T>(arr: T[], n: number): T[] {
    if (arr.length <= n) return arr;
    const step = arr.length / n;
    const result: T[] = [];
    for (let i = 0; i < n; i++) {
      result.push(arr[Math.floor(i * step)]);
    }
    return result;
  }

  private _kmeans(data: number[][], k: number, iterations: number): number[][] {
    if (data.length === 0) return [];
    const dim = data[0].length;
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      centroids.push([...data[Math.floor(Math.random() * data.length)]]);
    }
    for (let iter = 0; iter < iterations; iter++) {
      const clusters: number[][][] = Array(k).fill(null).map(() => []);
      for (const point of data) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < k; i++) {
          const d = this._euclideanDistance(point, centroids[i]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        clusters[bestIdx].push(point);
      }
      for (let i = 0; i < k; i++) {
        if (clusters[i].length > 0) {
          const newCentroid = new Array(dim).fill(0);
          for (const p of clusters[i]) {
            for (let d = 0; d < dim; d++) newCentroid[d] += p[d];
          }
          for (let d = 0; d < dim; d++) newCentroid[d] /= clusters[i].length;
          centroids[i] = newCentroid;
        }
      }
    }
    return centroids;
  }

  // ===========================================================================
  // Feature matching
  // ===========================================================================
  featureMatching(features1: Feature[], features2: Feature[], method: string = 'brute-force'): FeatureMatch[] {
    const matches: FeatureMatch[] = [];
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
        matches.push({ queryIdx: i, trainIdx: bestJ, distance: bestDist, score: 1 / (1 + bestDist) });
      }
    }
    this._matches = matches;
    return matches;
  }

  // KNN matching
  knnMatch(features1: Feature[], features2: Feature[], k: number = 2): FeatureMatch[][] {
    const allMatches: FeatureMatch[][] = [];
    for (let i = 0; i < features1.length; i++) {
      const distances: { j: number; d: number }[] = [];
      for (let j = 0; j < features2.length; j++) {
        distances.push({ j, d: this._euclideanDistance(features1[i].vector, features2[j].vector) });
      }
      distances.sort((a, b) => a.d - b.d);
      const top: FeatureMatch[] = distances.slice(0, k).map(x => ({
        queryIdx: i,
        trainIdx: x.j,
        distance: x.d,
        score: 1 / (1 + x.d)
      }));
      allMatches.push(top);
    }
    return allMatches;
  }

  // Lowe's ratio test
  ratioTestMatch(features1: Feature[], features2: Feature[], ratio: number = 0.75): FeatureMatch[] {
    const knn = this.knnMatch(features1, features2, 2);
    const matches: FeatureMatch[] = [];
    for (const pair of knn) {
      if (pair.length === 2 && pair[0].distance < ratio * pair[1].distance) {
        matches.push(pair[0]);
      }
    }
    this._matches = matches;
    return matches;
  }

  // Cross-check matching
  crossCheckMatch(features1: Feature[], features2: Feature[]): FeatureMatch[] {
    const forward = this.featureMatching(features1, features2);
    const backward = this.featureMatching(features2, features1);
    const matches: FeatureMatch[] = [];
    for (const f of forward) {
      const b = backward.find(x => x.queryIdx === f.trainIdx && x.trainIdx === f.queryIdx);
      if (b) {
        matches.push(f);
      }
    }
    this._matches = matches;
    return matches;
  }

  // FLANN-style matching (simulated with hashing)
  flannMatch(features1: Feature[], features2: Feature[]): FeatureMatch[] {
    // LSH bucket for binary features or KD-tree for floating point (here: simplified)
    const buckets = new Map<number, number[]>();
    const numBuckets = 16;
    for (let j = 0; j < features2.length; j++) {
      const hash = this._lshHash(features2[j].vector, numBuckets);
      if (!buckets.has(hash)) buckets.set(hash, []);
      buckets.get(hash)!.push(j);
    }
    const matches: FeatureMatch[] = [];
    for (let i = 0; i < features1.length; i++) {
      const hash = this._lshHash(features1[i].vector, numBuckets);
      const candidates = buckets.get(hash) || [];
      let bestDist = Infinity;
      let bestJ = -1;
      for (const j of candidates) {
        const dist = this._euclideanDistance(features1[i].vector, features2[j].vector);
        if (dist < bestDist) {
          bestDist = dist;
          bestJ = j;
        }
      }
      if (bestJ >= 0) {
        matches.push({ queryIdx: i, trainIdx: bestJ, distance: bestDist, score: 1 / (1 + bestDist) });
      }
    }
    this._matches = matches;
    return matches;
  }

  private _lshHash(vec: number[], buckets: number): number {
    let hash = 0;
    const step = Math.max(1, Math.floor(vec.length / buckets));
    for (let i = 0; i < vec.length; i += step) {
      hash = (hash * 31 + Math.floor(vec[i] * 1000)) % 1000003;
    }
    return Math.abs(hash) % buckets;
  }

  // RANSAC for outlier rejection
  ransacMatch(features1: Feature[], features2: Feature[], iterations: number = 1000, threshold: number = 3.0): FeatureMatch[] {
    const initial = this.ratioTestMatch(features1, features2);
    if (initial.length < 4) return initial;
    let bestInliers: FeatureMatch[] = [];
    let bestMask: boolean[] = [];
    for (let iter = 0; iter < iterations; iter++) {
      const sample = this._randomSample(initial, 4);
      const H = this._estimateHomography(sample, features1, features2);
      if (!H) continue;
      const inliers: FeatureMatch[] = [];
      const mask: boolean[] = [];
      for (const m of initial) {
        const p1 = features1[m.queryIdx].vector;
        const p2 = features2[m.trainIdx].vector;
        if (p1.length < 2 || p2.length < 2) {
          mask.push(false);
          continue;
        }
        const projected = this._applyHomography(H, p1[0], p1[1]);
        const dx = projected[0] - p2[0];
        const dy = projected[1] - p2[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold) {
          inliers.push(m);
          mask.push(true);
        } else {
          mask.push(false);
        }
      }
      if (inliers.length > bestInliers.length) {
        bestInliers = inliers;
        bestMask = mask;
      }
    }
    this._inlierMask = bestMask;
    this._homography = bestInliers.length >= 4 ?
      this._estimateHomography(bestInliers, features1, features2) : null;
    this._matches = bestInliers;
    return bestInliers;
  }

  private _randomSample<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy[idx]);
      copy.splice(idx, 1);
    }
    return result;
  }

  private _estimateHomography(sample: FeatureMatch[], f1: Feature[], f2: Feature[]): number[][] | null {
    if (sample.length < 4) return null;
    // Simplified DLT: build matrix A and solve via normal equations.
    const A: number[][] = [];
    const b: number[] = [];
    for (const m of sample) {
      const p1 = f1[m.queryIdx].vector;
      const p2 = f2[m.trainIdx].vector;
      if (p1.length < 2 || p2.length < 2) continue;
      const x = p1[0];
      const y = p1[1];
      const xp = p2[0];
      const yp = p2[1];
      A.push([x, y, 1, 0, 0, 0, -xp * x, -xp * y]);
      A.push([0, 0, 0, x, y, 1, -yp * x, -yp * y]);
      b.push(xp);
      b.push(yp);
    }
    if (A.length < 8) return null;
    const AtA = this._matmul(this._transpose(A), A);
    const Atb = this._matvec(this._transpose(A), b);
    const h = this._solve(AtA, Atb);
    if (!h) return null;
    return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
  }

  private _applyHomography(H: number[][], x: number, y: number): [number, number] {
    const w = H[2][0] * x + H[2][1] * y + H[2][2];
    const xp = (H[0][0] * x + H[0][1] * y + H[0][2]) / (w || 1);
    const yp = (H[1][0] * x + H[1][1] * y + H[1][2]) / (w || 1);
    return [xp, yp];
  }

  private _transpose(m: number[][]): number[][] {
    const rows = m.length;
    const cols = m[0].length;
    const t: number[][] = Array(cols).fill(null).map(() => new Array(rows).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        t[j][i] = m[i][j];
      }
    }
    return t;
  }

  private _matmul(a: number[][], b: number[][]): number[][] {
    const n = a.length;
    const m = b[0].length;
    const k = b.length;
    const result: number[][] = Array(n).fill(null).map(() => new Array(m).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        let sum = 0;
        for (let p = 0; p < k; p++) {
          sum += a[i][p] * b[p][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  private _matvec(a: number[][], v: number[]): number[] {
    const n = a.length;
    const k = v.length;
    const result = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let p = 0; p < k; p++) {
        sum += a[i][p] * v[p];
      }
      result[i] = sum;
    }
    return result;
  }

  private _solve(A: number[][], b: number[]): number[] | null {
    const n = A.length;
    const m = A[0].length;
    // Gaussian elimination on [A | b]
    const M: number[][] = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < Math.min(n, m); col++) {
      let pivot = col;
      for (let r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      }
      [M[col], M[pivot]] = [M[pivot], M[col]];
      if (Math.abs(M[col][col]) < 1e-10) continue;
      for (let r = 0; r < n; r++) {
        if (r !== col) {
          const factor = M[r][col] / M[col][col];
          for (let c = col; c <= m; c++) {
            M[r][c] -= factor * M[col][c];
          }
        }
      }
    }
    const x = new Array(m).fill(0);
    for (let i = 0; i < Math.min(n, m); i++) {
      if (Math.abs(M[i][i]) > 1e-10) x[i] = M[i][m] / M[i][i];
    }
    return x;
  }

  // ===========================================================================
  // PCA dimensionality reduction
  // ===========================================================================
  pca(features: number[][], targetDim: number = 64): number[][] {
    if (features.length === 0) return [];
    const n = features.length;
    const d = features[0].length;
    const mean = new Array(d).fill(0);
    for (const f of features) {
      for (let i = 0; i < d; i++) mean[i] += f[i] / n;
    }
    const centered = features.map(f => f.map((v, i) => v - mean[i]));
    // Covariance matrix
    const cov: number[][] = Array(d).fill(null).map(() => new Array(d).fill(0));
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += centered[k][i] * centered[k][j];
        }
        cov[i][j] = sum / Math.max(1, n - 1);
      }
    }
    // Power iteration to find top eigenvalues
    const eigenvectors: number[][] = [];
    let covCopy = cov.map(r => [...r]);
    for (let ev = 0; ev < targetDim; ev++) {
      let v = new Array(d).fill(1 / Math.sqrt(d));
      for (let iter = 0; iter < 50; iter++) {
        const next = this._matvec(covCopy, v);
        const norm = Math.sqrt(next.reduce((a, b) => a + b * b, 0)) || 1;
        v = next.map(x => x / norm);
      }
      const eigenvalue = this._matvec(covCopy, v).reduce((a, b, i) => a + b * v[i], 0) / d;
      eigenvectors.push(v);
      // Deflate covariance matrix
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          covCopy[i][j] -= eigenvalue * v[i] * v[j];
        }
      }
    }
    // Project features
    const projected = centered.map(c => {
      return eigenvectors.map(ev => ev.reduce((a, b, i) => a + b * c[i], 0));
    });
    this._dimReduction = eigenvectors;
    return projected;
  }

  // ===========================================================================
  // CNN feature maps (simulated)
  // ===========================================================================
  cnnFeatureMaps(image: Image, layers: { name: string; outChannels: number; kernelSize: number; stride: number }[]): FeatureMap {
    let current = image;
    const allFeatures: Feature[] = [];
    for (const layer of layers) {
      const maps = this._simulatedConv2d(current, layer.outChannels, layer.kernelSize, layer.stride);
      const mapFeatures: Feature[] = [];
      for (let c = 0; c < maps.length; c++) {
        const flat: number[] = [];
        for (let y = 0; y < maps[c].length; y++) {
          for (let x = 0; x < maps[c][y].length; x++) {
            flat.push(maps[c][y][x]);
          }
        }
        const norm = Math.sqrt(flat.reduce((a, b) => a + b * b, 0)) || 1;
        const feat = flat.map(v => v / norm);
        mapFeatures.push({
          name: `${layer.name}-c${c}`,
          vector: feat,
          type: 'cnn-feature',
          strength: norm
        });
      }
      allFeatures.push(...mapFeatures);
      // Use first channel as next input (downsampling)
      current = {
        pixels: maps[0].map(row => row.map(v => [v * 255])),
        width: maps[0][0]?.length || 0,
        height: maps[0].length,
        channels: 1
      };
    }
    const result: FeatureMap = {
      features: allFeatures,
      width: current.width,
      height: current.height,
      depth: layers.length
    };
    this._featureMap = result;
    this._features.push(...allFeatures);
    this._method = 'cnn';
    return result;
  }

  private _simulatedConv2d(image: Image, outChannels: number, kernelSize: number, stride: number): number[][][] {
    const outH = Math.floor((image.height - kernelSize) / stride) + 1;
    const outW = Math.floor((image.width - kernelSize) / stride) + 1;
    const result: number[][][] = [];
    for (let c = 0; c < outChannels; c++) {
      const channel: number[][] = [];
      let seed = c * 7919 + 1;
      for (let y = 0; y < outH; y++) {
        const row: number[] = [];
        for (let x = 0; x < outW; x++) {
          let val = 0;
          for (let ky = 0; ky < kernelSize; ky++) {
            for (let kx = 0; kx < kernelSize; kx++) {
              const py = y * stride + ky;
              const px = x * stride + kx;
              seed = (seed * 1103515245 + 12345) & 0x7fffffff;
              const w = (seed / 0x7fffffff) * 2 - 1;
              val += image.pixels[Math.min(py, image.height - 1)][Math.min(px, image.width - 1)][0] * w / kernelSize / kernelSize;
            }
          }
          // ReLU
          row.push(Math.max(0, val / 255));
        }
        channel.push(row);
      }
      result.push(channel);
    }
    return result;
  }

  // Global pooling to get feature vector from CNN feature map
  globalAveragePooling(featureMap: FeatureMap): number[] {
    if (!featureMap || featureMap.features.length === 0) return [];
    const feature: number[] = [];
    for (const f of featureMap.features) {
      const avg = f.vector.reduce((a, b) => a + b, 0) / Math.max(1, f.vector.length);
      feature.push(avg);
    }
    this._method = 'gap';
    this._lastFeature = { name: 'gap', vector: feature, type: 'cnn-feature', strength: 1 };
    this._features.push(this._lastFeature);
    return feature;
  }

  // ===========================================================================
  // Edge-based features (additional)
  // ===========================================================================
  edgeHistogram(image: Image, bins: number = 8): number[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const ix = this._sobelX(gray);
    const iy = this._sobelY(gray);
    const hist = new Array(bins).fill(0);
    for (let y = 0; y < gray.height; y++) {
      for (let x = 0; x < gray.width; x++) {
        const gx = ix.pixels[y][x][0];
        const gy = iy.pixels[y][x][0];
        const mag = Math.sqrt(gx * gx + gy * gy);
        const angle = (Math.atan2(gy, gx) + Math.PI) / (2 * Math.PI);
        const bin = Math.floor(angle * bins) % bins;
        hist[bin] += mag;
      }
    }
    const total = hist.reduce((a, b) => a + b, 0) || 1;
    this._method = 'edge-histogram';
    const feature = hist.map(v => v / total);
    this._lastFeature = { name: 'edge-histogram', vector: feature, type: 'edge', strength: 1 };
    this._features.push(this._lastFeature);
    return feature;
  }

  // ===========================================================================
  // Statistical texture features (Haralick-like)
  // ===========================================================================
  textureStatistics(image: Image): number[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const levels = 8;
    const glcm: number[][] = Array(levels).fill(null).map(() => new Array(levels).fill(0));
    for (let y = 0; y < gray.height; y++) {
      for (let x = 0; x < gray.width - 1; x++) {
        const v1 = Math.min(levels - 1, Math.floor(gray.pixels[y][x][0] / (256 / levels)));
        const v2 = Math.min(levels - 1, Math.floor(gray.pixels[y][x + 1][0] / (256 / levels)));
        glcm[v1][v2]++;
      }
    }
    const total = glcm.flat().reduce((a, b) => a + b, 0) || 1;
    for (let i = 0; i < levels; i++) {
      for (let j = 0; j < levels; j++) {
        glcm[i][j] /= total;
      }
    }
    let contrast = 0;
    let energy = 0;
    let homogeneity = 0;
    let entropy = 0;
    let correlation = 0;
    let meanI = 0;
    let meanJ = 0;
    let stdI = 0;
    let stdJ = 0;
    for (let i = 0; i < levels; i++) {
      for (let j = 0; j < levels; j++) {
        const p = glcm[i][j];
        contrast += (i - j) * (i - j) * p;
        energy += p * p;
        homogeneity += p / (1 + Math.abs(i - j));
        if (p > 0) entropy -= p * Math.log2(p);
        meanI += i * p;
        meanJ += j * p;
      }
    }
    for (let i = 0; i < levels; i++) {
      for (let j = 0; j < levels; j++) {
        stdI += (i - meanI) ** 2 * glcm[i][j];
        stdJ += (j - meanJ) ** 2 * glcm[i][j];
      }
    }
    stdI = Math.sqrt(stdI);
    stdJ = Math.sqrt(stdJ);
    if (stdI > 0 && stdJ > 0) {
      for (let i = 0; i < levels; i++) {
        for (let j = 0; j < levels; j++) {
          correlation += ((i - meanI) * (j - meanJ) * glcm[i][j]) / (stdI * stdJ);
        }
      }
    }
    const feature = [contrast, energy, homogeneity, entropy, correlation, meanI, meanJ, stdI, stdJ];
    this._method = 'texture-stat';
    this._lastFeature = { name: 'texture-stat', vector: feature, type: 'texture', strength: 1 };
    this._features.push(this._lastFeature);
    return feature;
  }

  // ===========================================================================
  // Blob detection (Laplacian of Gaussian based)
  // ===========================================================================
  blobDetection(image: Image, threshold: number = 0.05): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    const sigmas = [1, 2, 4, 8];
    let maxResponse = 0;
    const responses: { x: number; y: number; sigma: number; response: number }[][] = sigmas.map(s => {
      const blurred = this._gaussianBlur(gray, s);
      const resp: { x: number; y: number; sigma: number; response: number }[] = [];
      const lap = this._laplacian(blurred);
      for (let y = 1; y < gray.height - 1; y++) {
        for (let x = 1; x < gray.width - 1; x++) {
          const r = lap.pixels[y][x][0] * s * s;
          if (Math.abs(r) > maxResponse) maxResponse = Math.abs(r);
          resp.push({ x, y, sigma: s, response: r });
        }
      }
      return resp;
    });
    for (let s = 0; s < sigmas.length; s++) {
      for (const r of responses[s]) {
        if (Math.abs(r.response) > threshold * maxResponse) {
          features.push({
            name: `blob-${features.length}`,
            vector: [r.x, r.y, r.sigma],
            type: 'blob',
            strength: Math.abs(r.response) / maxResponse
          });
        }
      }
    }
    this._method = 'blob';
    this._features.push(...features);
    return features;
  }

  private _laplacian(image: Image): Image {
    const kernel = [[0, 1, 0], [1, -4, 1], [0, 1, 0]];
    return this._convolve(image, kernel);
  }

  // ===========================================================================
  // Star detector (simulated)
  // ===========================================================================
  starDetector(image: Image, threshold: number = 30): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    const radii = [1, 2, 3, 5, 8, 13];
    for (let y = 8; y < gray.height - 8; y += 2) {
      for (let x = 8; x < gray.width - 8; x += 2) {
        let maxResponse = 0;
        let bestR = 0;
        for (const r of radii) {
          let sum = 0;
          for (let a = 0; a < 16; a++) {
            const angle = (a / 16) * 2 * Math.PI;
            const px = Math.floor(x + r * Math.cos(angle));
            const py = Math.floor(y + r * Math.sin(angle));
            if (px >= 0 && px < gray.width && py >= 0 && py < gray.height) {
              sum += gray.pixels[py][px][0];
            }
          }
          const avg = sum / 16;
          const response = Math.abs(gray.pixels[y][x][0] - avg);
          if (response > maxResponse) {
            maxResponse = response;
            bestR = r;
          }
        }
        if (maxResponse > threshold) {
          features.push({
            name: `star-${features.length}`,
            vector: [x, y, bestR],
            type: 'keypoint',
            strength: maxResponse / 255
          });
        }
      }
    }
    this._method = 'star';
    this._features.push(...features);
    return features;
  }

  // ===========================================================================
  // MSER (Maximally Stable Extremal Regions) - simplified
  // ===========================================================================
  mser(image: Image, delta: number = 5, minArea: number = 30, maxArea: number = 14400): Feature[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const features: Feature[] = [];
    const thresholdLevels = 10;
    for (let t = 0; t < thresholdLevels; t++) {
      const threshold = Math.floor((t / thresholdLevels) * 255);
      const regions = this._findRegions(gray, threshold);
      for (const region of regions) {
        if (region.area >= minArea && region.area <= maxArea) {
          features.push({
            name: `mser-${features.length}`,
            vector: [region.cx, region.cy, region.area],
            type: 'region',
            strength: region.area / maxArea
          });
        }
      }
    }
    this._method = 'mser';
    this._features.push(...features);
    return features;
  }

  private _findRegions(image: Image, threshold: number): { cx: number; cy: number; area: number }[] {
    const visited: boolean[][] = Array(image.height).fill(null).map(() => new Array(image.width).fill(false));
    const regions: { cx: number; cy: number; area: number }[] = [];
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (!visited[y][x] && image.pixels[y][x][0] > threshold) {
          const region = this._floodFill(image, visited, x, y, threshold);
          if (region.area > 5) regions.push(region);
        }
      }
    }
    return regions;
  }

  private _floodFill(image: Image, visited: boolean[][], startX: number, startY: number, threshold: number): { cx: number; cy: number; area: number } {
    const queue: [number, number][] = [[startX, startY]];
    let sumX = 0;
    let sumY = 0;
    let area = 0;
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      if (x < 0 || x >= image.width || y < 0 || y >= image.height) continue;
      if (visited[y][x] || image.pixels[y][x][0] <= threshold) continue;
      visited[y][x] = true;
      sumX += x;
      sumY += y;
      area++;
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      if (queue.length > 10000) break;
    }
    return { cx: sumX / Math.max(1, area), cy: sumY / Math.max(1, area), area };
  }

  // ===========================================================================
  // Deep embedding extractor (simulated)
  // ===========================================================================
  deepEmbedding(image: Image, model: { name: string; dim: number }): number[] {
    const gray = image.channels > 1 ? this._toGray(image) : image;
    const dim = model.dim;
    const embedding = new Array(dim).fill(0);
    let seed = this._hash(model.name);
    for (let i = 0; i < dim; i++) {
      let sum = 0;
      for (let y = 0; y < gray.height; y += 4) {
        for (let x = 0; x < gray.width; x += 4) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          const w = (seed / 0x7fffffff) * 2 - 1;
          sum += gray.pixels[y][x][0] * w;
        }
      }
      embedding[i] = sum / (gray.width * gray.height);
    }
    const norm = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0)) || 1;
    this._method = 'deep-embedding';
    const feature = embedding.map(v => v / norm);
    this._lastFeature = { name: 'deep-embedding', vector: feature, type: 'embedding', strength: 1 };
    this._features.push(this._lastFeature);
    return feature;
  }

  // ===========================================================================
  // Aggregation and statistics
  // ===========================================================================
  aggregate(method: 'mean' | 'max' | 'sum' = 'mean'): number[] {
    if (this._features.length === 0) return [];
    const maxLen = Math.max(...this._features.map(f => f.vector.length));
    const result = new Array(maxLen).fill(0);
    if (method === 'mean' || method === 'sum') {
      for (const f of this._features) {
        for (let i = 0; i < f.vector.length; i++) {
          result[i] += f.vector[i];
        }
      }
      if (method === 'mean') {
        for (let i = 0; i < maxLen; i++) result[i] /= this._features.length;
      }
    } else {
      for (const f of this._features) {
        for (let i = 0; i < f.vector.length; i++) {
          if (f.vector[i] > result[i]) result[i] = f.vector[i];
        }
      }
    }
    return result;
  }

  statistics(): FeatureStat {
    const descriptors = this._features.filter(f => f.type === 'descriptor' || f.type === 'binary' || f.type === 'cnn-feature');
    const avgStrength = this._features.length > 0 ?
      this._features.reduce((a, b) => a + b.strength, 0) / this._features.length : 0;
    const avgDim = this._features.length > 0 ?
      this._features.reduce((a, b) => a + b.vector.length, 0) / this._features.length : 0;
    return {
      totalFeatures: this._features.length,
      totalDescriptors: descriptors.length,
      methodCount: new Set(this._features.map(f => f.name.split('-')[0])).size,
      avgStrength,
      avgDim,
      matches: this._matches.length,
      inliers: this._inlierMask.filter(v => v).length,
      clusters: this._clusters.length
    };
  }

  serialize(): string {
    return JSON.stringify({
      features: this._features,
      matches: this._matches,
      clusters: this._clusters,
      vocabulary: this._vocabulary,
      method: this._method,
      counter: this._counter,
      keypoints: this._keypoints
    });
  }

  deserialize(data: string): void {
    const obj = JSON.parse(data);
    this._features = obj.features || [];
    this._matches = obj.matches || [];
    this._clusters = obj.clusters || [];
    this._vocabulary = obj.vocabulary || [];
    this._method = obj.method || 'default';
    this._counter = obj.counter || 0;
    this._keypoints = obj.keypoints || [];
  }

  // ===========================================================================
  // Private helpers
  // ===========================================================================
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
    this._matches = [];
    this._clusters = [];
    this._vocabulary = [];
    this._bovwHistogram = [];
    this._homography = null;
    this._inlierMask = [];
    this._dimReduction = null;
    this._keypoints = [];
  }
}
