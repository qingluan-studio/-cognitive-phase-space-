import { DataPacket } from '../shared/types';

export interface Image {
  pixels: number[][][];
  width: number;
  height: number;
  channels: number;
}

export interface Filter {
  name: string;
  kernel: number[][];
  params: Record<string, number>;
}

export interface Histogram {
  channels: number[][];
  bins: number;
}

export interface ImageStat {
  mean: number[];
  stdDev: number[];
  variance: number[];
  min: number[];
  max: number[];
  median: number[];
  mode: number[];
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export type InterpolationMethod = 'nearest' | 'bilinear' | 'bicubic' | 'lanczos';
export type BorderType = 'constant' | 'replicate' | 'reflect' | 'wrap';

export class ImageProcessing {
  private _images: Image[] = [];
  private _filters: Filter[] = [];
  private _counter: number = 0;
  private _histogram: Histogram | null = null;
  private _lastImage: Image | null = null;
  private _stats: ImageStat | null = null;
  private _borderType: BorderType = 'reflect';
  private _borderValue: number = 0;
  private _defaultInterpolation: InterpolationMethod = 'bilinear';

  get images(): Image[] {
    return this._images;
  }

  get filters(): Filter[] {
    return this._filters;
  }

  get histogram(): Histogram | null {
    return this._histogram;
  }

  get stats(): ImageStat | null {
    return this._stats;
  }

  get borderType(): BorderType {
    return this._borderType;
  }

  set borderType(value: BorderType) {
    this._borderType = value;
  }

  get borderValue(): number {
    return this._borderValue;
  }

  set borderValue(value: number) {
    this._borderValue = Math.min(255, Math.max(0, value));
  }

  get defaultInterpolation(): InterpolationMethod {
    return this._defaultInterpolation;
  }

  set defaultInterpolation(value: InterpolationMethod) {
    this._defaultInterpolation = value;
  }

  /**
   * Convert an RGB image to grayscale using the luminance formula
   */
  grayscale(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel = image.pixels[y][x];
        const gray = image.channels >= 3
          ? 0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2]
          : pixel[0];
        row.push([gray]);
      }
      result.push(row);
    }
    const grayImage: Image = { pixels: result, width: image.width, height: image.height, channels: 1 };
    this._lastImage = grayImage;
    this._images.push(grayImage);
    return grayImage;
  }

  /**
   * Resize an image using the specified interpolation method
   */
  resize(image: Image, width: number, height: number, method: string = 'bilinear'): Image {
    const result: number[][][] = [];
    const xRatio = image.width / width;
    const yRatio = image.height / height;
    for (let y = 0; y < height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < width; x++) {
        const srcX = x * xRatio;
        const srcY = y * yRatio;
        if (method === 'nearest') {
          const sx = Math.floor(srcX);
          const sy = Math.floor(srcY);
          row.push(image.pixels[Math.min(sy, image.height - 1)][Math.min(sx, image.width - 1)]);
        } else if (method === 'bicubic') {
          const pixel = this._bicubicInterp(image, srcX, srcY);
          row.push(pixel);
        } else if (method === 'lanczos') {
          const pixel = this._lanczosInterp(image, srcX, srcY, 3);
          row.push(pixel);
        } else {
          const pixel = this._bilinearInterp(image, srcX, srcY);
          row.push(pixel);
        }
      }
      result.push(row);
    }
    const resized: Image = { pixels: result, width, height, channels: image.channels };
    this._lastImage = resized;
    return resized;
  }

  /**
   * Crop a rectangular region from the image
   */
  crop(image: Image, x: number, y: number, w: number, h: number): Image {
    const result: number[][][] = [];
    for (let j = 0; j < h; j++) {
      const row: number[][] = [];
      for (let i = 0; i < w; i++) {
        const srcY = Math.min(Math.max(y + j, 0), image.height - 1);
        const srcX = Math.min(Math.max(x + i, 0), image.width - 1);
        row.push(image.pixels[srcY][srcX]);
      }
      result.push(row);
    }
    const cropped: Image = { pixels: result, width: w, height: h, channels: image.channels };
    this._lastImage = cropped;
    return cropped;
  }

  /**
   * Rotate an image by an arbitrary angle (in degrees)
   */
  rotate(image: Image, angle: number, method: string = 'bilinear'): Image {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const cx = image.width / 2;
    const cy = image.height / 2;
    const newWidth = Math.ceil(image.width * Math.abs(cos) + image.height * Math.abs(sin));
    const newHeight = Math.ceil(image.width * Math.abs(sin) + image.height * Math.abs(cos));
    const result: number[][][] = [];
    const ncx = newWidth / 2;
    const ncy = newHeight / 2;
    for (let y = 0; y < newHeight; y++) {
      const row: number[][] = [];
      for (let x = 0; x < newWidth; x++) {
        const dx = x - ncx;
        const dy = y - ncy;
        const srcX = cx + dx * cos + dy * sin;
        const srcY = cy - dx * sin + dy * cos;
        if (srcX < 0 || srcX >= image.width || srcY < 0 || srcY >= image.height) {
          const black: number[] = new Array(image.channels).fill(0);
          row.push(black);
        } else {
          row.push(this._bilinearInterp(image, srcX, srcY));
        }
      }
      result.push(row);
    }
    const rotated: Image = { pixels: result, width: newWidth, height: newHeight, channels: image.channels };
    this._lastImage = rotated;
    return rotated;
  }

  /**
   * Flip an image horizontally, vertically, or both
   */
  flip(image: Image, direction: 'horizontal' | 'vertical' | 'both'): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      const srcY = direction === 'vertical' || direction === 'both' ? image.height - 1 - y : y;
      for (let x = 0; x < image.width; x++) {
        const srcX = direction === 'horizontal' || direction === 'both' ? image.width - 1 - x : x;
        row.push(image.pixels[srcY][srcX]);
      }
      result.push(row);
    }
    const flipped: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = flipped;
    return flipped;
  }

  /**
   * Translate (shift) an image by dx and dy
   */
  translate(image: Image, dx: number, dy: number): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const srcX = x - dx;
        const srcY = y - dy;
        row.push(this._getPixelWithBorder(image, srcX, srcY));
      }
      result.push(row);
    }
    const translated: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = translated;
    return translated;
  }

  /**
   * Apply a shear transformation to the image
   */
  shear(image: Image, shearX: number, shearY: number): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const srcX = x - shearX * y;
        const srcY = y - shearY * x;
        row.push(this._getPixelWithBorder(image, srcX, srcY));
      }
      result.push(row);
    }
    const sheared: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = sheared;
    return sheared;
  }

  /**
   * Apply an affine transformation given 6 parameters [a, b, c, d, e, f]
   * Transform: x' = a*x + b*y + c, y' = d*x + e*y + f
   */
  affine(image: Image, matrix: [number, number, number, number, number, number]): Image {
    const [a, b, c, d, e, f] = matrix;
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const srcX = a * x + b * y + c;
        const srcY = d * x + e * y + f;
        row.push(this._getPixelWithBorder(image, srcX, srcY));
      }
      result.push(row);
    }
    const transformed: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = transformed;
    return transformed;
  }

  /**
   * Apply a perspective transformation given a 3x3 matrix
   */
  perspective(image: Image, matrix: number[][]): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const wx = matrix[0][0] * x + matrix[0][1] * y + matrix[0][2];
        const wy = matrix[1][0] * x + matrix[1][1] * y + matrix[1][2];
        const ww = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2];
        if (ww === 0) {
          row.push(new Array(image.channels).fill(0));
        } else {
          const srcX = wx / ww;
          const srcY = wy / ww;
          row.push(this._getPixelWithBorder(image, srcX, srcY));
        }
      }
      result.push(row);
    }
    const transformed: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = transformed;
    return transformed;
  }

  /**
   * Apply a convolution filter with the given kernel
   */
  blur(image: Image, kernel: number[][]): Image {
    const kSize = kernel.length;
    const kHalf = Math.floor(kSize / 2);
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel: number[] = new Array(image.channels).fill(0);
        let kSum = 0;
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const sy = y + ky - kHalf;
            const sx = x + kx - kHalf;
            if (sy >= 0 && sy < image.height && sx >= 0 && sx < image.width) {
              for (let c = 0; c < image.channels; c++) {
                pixel[c] += image.pixels[sy][sx][c] * kernel[ky][kx];
              }
              kSum += kernel[ky][kx];
            }
          }
        }
        for (let c = 0; c < image.channels; c++) {
          pixel[c] = kSum > 0 ? pixel[c] / kSum : pixel[c];
        }
        row.push(pixel);
      }
      result.push(row);
    }
    const blurred: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = blurred;
    return blurred;
  }

  /**
   * Gaussian blur with a given sigma
   */
  gaussianBlur(image: Image, sigma: number): Image {
    const kSize = Math.ceil(sigma * 3) * 2 + 1;
    const kernel: number[][] = [];
    const kHalf = Math.floor(kSize / 2);
    let sum = 0;
    for (let y = 0; y < kSize; y++) {
      const row: number[] = [];
      for (let x = 0; x < kSize; x++) {
        const dx = x - kHalf;
        const dy = y - kHalf;
        const val = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        row.push(val);
        sum += val;
      }
      kernel.push(row);
    }
    for (let y = 0; y < kSize; y++) {
      for (let x = 0; x < kSize; x++) {
        kernel[y][x] /= sum;
      }
    }
    return this.blur(image, kernel);
  }

  /**
   * Sharpen the image using a Laplacian kernel
   */
  sharpen(image: Image): Image {
    const kernel = [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0]
    ];
    const result = this._convolve(image, kernel);
    this._lastImage = result;
    return result;
  }

  /**
   * Box blur (average filter)
   */
  boxBlur(image: Image, kSize: number = 3): Image {
    const kernel: number[][] = [];
    for (let y = 0; y < kSize; y++) {
      const row: number[] = new Array(kSize).fill(1 / (kSize * kSize));
      kernel.push(row);
    }
    return this.blur(image, kernel);
  }

  /**
   * Median filter - replace each pixel with the median of its neighborhood
   */
  medianFilter(image: Image, kSize: number = 3): Image {
    const kHalf = Math.floor(kSize / 2);
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel: number[] = [];
        for (let c = 0; c < image.channels; c++) {
          const values: number[] = [];
          for (let ky = -kHalf; ky <= kHalf; ky++) {
            for (let kx = -kHalf; kx <= kHalf; kx++) {
              const py = Math.min(Math.max(y + ky, 0), image.height - 1);
              const px = Math.min(Math.max(x + kx, 0), image.width - 1);
              values.push(image.pixels[py][px][c]);
            }
          }
          values.sort((a, b) => a - b);
          pixel.push(values[Math.floor(values.length / 2)]);
        }
        row.push(pixel);
      }
      result.push(row);
    }
    const filtered: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = filtered;
    return filtered;
  }

  /**
   * Bilateral filter - edge-preserving smoothing
   */
  bilateralFilter(image: Image, kSize: number = 5, sigmaSpace: number = 1.5, sigmaColor: number = 25): Image {
    const kHalf = Math.floor(kSize / 2);
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel: number[] = new Array(image.channels).fill(0);
        let totalWeight = 0;
        const center = image.pixels[y][x];
        for (let ky = -kHalf; ky <= kHalf; ky++) {
          for (let kx = -kHalf; kx <= kHalf; kx++) {
            const py = Math.min(Math.max(y + ky, 0), image.height - 1);
            const px = Math.min(Math.max(x + kx, 0), image.width - 1);
            const dx = kx;
            const dy = ky;
            const spatialWeight = Math.exp(-(dx * dx + dy * dy) / (2 * sigmaSpace * sigmaSpace));
            let colorDiff = 0;
            for (let c = 0; c < image.channels; c++) {
              colorDiff += Math.pow(image.pixels[py][px][c] - center[c], 2);
            }
            const colorWeight = Math.exp(-colorDiff / (2 * sigmaColor * sigmaColor));
            const weight = spatialWeight * colorWeight;
            for (let c = 0; c < image.channels; c++) {
              pixel[c] += image.pixels[py][px][c] * weight;
            }
            totalWeight += weight;
          }
        }
        for (let c = 0; c < image.channels; c++) {
          pixel[c] = totalWeight > 0 ? pixel[c] / totalWeight : pixel[c];
        }
        row.push(pixel);
      }
      result.push(row);
    }
    const filtered: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = filtered;
    return filtered;
  }

  /**
   * Edge detection using Sobel, Prewitt, Roberts, or Canny
   */
  edgeDetect(image: Image, method: string = 'sobel'): Image {
    if (method === 'sobel') {
      return this.sobelEdge(image);
    } else if (method === 'canny') {
      return this.cannyEdge(image);
    } else if (method === 'prewitt') {
      return this.prewittEdge(image);
    } else if (method === 'roberts') {
      return this.robertsEdge(image);
    } else if (method === 'laplacian') {
      return this.laplacianEdge(image);
    } else if (method === 'log') {
      return this.laplacianOfGaussian(image);
    }
    return this.sobelEdge(image);
  }

  /**
   * Sobel edge detection
   */
  sobelEdge(image: Image): Image {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const gxKernel = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];
    const gyKernel = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];
    const gx = this._convolveSingle(gray, gxKernel);
    const gy = this._convolveSingle(gray, gyKernel);
    const result: number[][][] = [];
    for (let y = 0; y < gray.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < gray.width; x++) {
        const val = Math.sqrt(gx.pixels[y][x][0] ** 2 + gy.pixels[y][x][0] ** 2);
        row.push([Math.min(255, val)]);
      }
      result.push(row);
    }
    const edges: Image = { pixels: result, width: gray.width, height: gray.height, channels: 1 };
    this._lastImage = edges;
    return edges;
  }

  /**
   * Prewitt edge detection
   */
  prewittEdge(image: Image): Image {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const gxKernel = [
      [-1, 0, 1],
      [-1, 0, 1],
      [-1, 0, 1]
    ];
    const gyKernel = [
      [-1, -1, -1],
      [0, 0, 0],
      [1, 1, 1]
    ];
    const gx = this._convolveSingle(gray, gxKernel);
    const gy = this._convolveSingle(gray, gyKernel);
    const result: number[][][] = [];
    for (let y = 0; y < gray.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < gray.width; x++) {
        const val = Math.sqrt(gx.pixels[y][x][0] ** 2 + gy.pixels[y][x][0] ** 2);
        row.push([Math.min(255, val)]);
      }
      result.push(row);
    }
    const edges: Image = { pixels: result, width: gray.width, height: gray.height, channels: 1 };
    this._lastImage = edges;
    return edges;
  }

  /**
   * Roberts cross-gradient edge detection
   */
  robertsEdge(image: Image): Image {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const gxKernel = [[1, 0], [0, -1]];
    const gyKernel = [[0, 1], [-1, 0]];
    const gx = this._convolveSingle(gray, gxKernel);
    const gy = this._convolveSingle(gray, gyKernel);
    const result: number[][][] = [];
    for (let y = 0; y < gray.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < gray.width; x++) {
        const val = Math.sqrt(gx.pixels[y][x][0] ** 2 + gy.pixels[y][x][0] ** 2);
        row.push([Math.min(255, val)]);
      }
      result.push(row);
    }
    const edges: Image = { pixels: result, width: gray.width, height: gray.height, channels: 1 };
    this._lastImage = edges;
    return edges;
  }

  /**
   * Laplacian edge detection
   */
  laplacianEdge(image: Image): Image {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const kernel = [
      [0, -1, 0],
      [-1, 4, -1],
      [0, -1, 0]
    ];
    return this._convolveSingle(gray, kernel);
  }

  /**
   * Laplacian of Gaussian (LoG) edge detection
   */
  laplacianOfGaussian(image: Image, sigma: number = 1.4): Image {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const blurred = this.gaussianBlur(gray, sigma);
    const kernel = [
      [0, 0, -1, 0, 0],
      [0, -1, -2, -1, 0],
      [-1, -2, 16, -2, -1],
      [0, -1, -2, -1, 0],
      [0, 0, -1, 0, 0]
    ];
    const result = this._convolveSingle(blurred, kernel);
    this._lastImage = result;
    return result;
  }

  /**
   * Canny edge detection - simplified version
   */
  cannyEdge(image: Image): Image {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const blurred = this.gaussianBlur(gray, 1.4);
    const sobel = this.sobelEdge(blurred);
    const result = this.threshold(sobel, 50);
    this._lastImage = result;
    return result;
  }

  /**
   * Apply a simple threshold to the image
   */
  threshold(image: Image, threshold: number): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel = image.pixels[y][x];
        const newPixel = pixel.map(v => v >= threshold ? 255 : 0);
        row.push(newPixel);
      }
      result.push(row);
    }
    const threshed: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = threshed;
    return threshed;
  }

  /**
   * Otsu's thresholding - automatically compute optimal threshold
   */
  otsuThreshold(image: Image): { image: Image; threshold: number } {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const hist = new Array(256).fill(0);
    for (let y = 0; y < gray.height; y++) {
      for (let x = 0; x < gray.width; x++) {
        const v = Math.min(255, Math.max(0, Math.floor(gray.pixels[y][x][0])));
        hist[v]++;
      }
    }
    const total = gray.width * gray.height;
    let sum = 0;
    for (let t = 0; t < 256; t++) {
      sum += t * hist[t];
    }
    let sumB = 0;
    let wB = 0;
    let maxVar = 0;
    let threshold = 0;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const betweenVar = wB * wF * (mB - mF) ** 2;
      if (betweenVar > maxVar) {
        maxVar = betweenVar;
        threshold = t;
      }
    }
    const threshedImage = this.threshold(gray, threshold);
    return { image: threshedImage, threshold };
  }

  /**
   * Adaptive thresholding - threshold based on local mean
   */
  adaptiveThreshold(image: Image, blockSize: number = 11, C: number = 2): Image {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const result: number[][][] = [];
    const half = Math.floor(blockSize / 2);
    for (let y = 0; y < gray.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < gray.width; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -half; dy <= half; dy++) {
          for (let dx = -half; dx <= half; dx++) {
            const py = Math.min(Math.max(y + dy, 0), gray.height - 1);
            const px = Math.min(Math.max(x + dx, 0), gray.width - 1);
            sum += gray.pixels[py][px][0];
            count++;
          }
        }
        const localMean = sum / count;
        const val = gray.pixels[y][x][0] > localMean - C ? 255 : 0;
        row.push([val]);
      }
      result.push(row);
    }
    const threshed: Image = { pixels: result, width: gray.width, height: gray.height, channels: 1 };
    this._lastImage = threshed;
    return threshed;
  }

  /**
   * Histogram equalization for contrast enhancement
   */
  histogramEqualization(image: Image): Image {
    if (image.channels > 1) {
      const gray = this.grayscale(image);
      return this._equalizeSingle(gray);
    }
    return this._equalizeSingle(image);
  }

  /**
   * Contrast Limited Adaptive Histogram Equalization (CLAHE) - simplified
   */
  clahe(image: Image, tileSize: number = 8, clipLimit: number = 2.0): Image {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const result: number[][][] = [];
    const tilesX = Math.ceil(gray.width / tileSize);
    const tilesY = Math.ceil(gray.height / tileSize);
    const mappings: number[][][] = [];
    for (let ty = 0; ty < tilesY; ty++) {
      mappings.push([]);
      for (let tx = 0; tx < tilesX; tx++) {
        const hist = new Array(256).fill(0);
        let count = 0;
        for (let y = ty * tileSize; y < Math.min((ty + 1) * tileSize, gray.height); y++) {
          for (let x = tx * tileSize; x < Math.min((tx + 1) * tileSize, gray.width); x++) {
            const v = Math.min(255, Math.max(0, Math.floor(gray.pixels[y][x][0])));
            hist[v]++;
            count++;
          }
        }
        const clipCount = Math.floor(clipLimit * count / 256);
        let excess = 0;
        for (let i = 0; i < 256; i++) {
          if (hist[i] > clipCount) {
            excess += hist[i] - clipCount;
            hist[i] = clipCount;
          }
        }
        for (let i = 0; i < 256; i++) {
          hist[i] += Math.floor(excess / 256);
        }
        const cdf = new Array(256).fill(0);
        cdf[0] = hist[0];
        for (let i = 1; i < 256; i++) {
          cdf[i] = cdf[i - 1] + hist[i];
        }
        const mapping = cdf.map(v => Math.floor(v * 255 / count));
        mappings[ty].push(mapping);
      }
    }
    for (let y = 0; y < gray.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < gray.width; x++) {
        const tx = Math.min(tilesX - 1, Math.floor(x / tileSize));
        const ty = Math.min(tilesY - 1, Math.floor(y / tileSize));
        const v = Math.min(255, Math.max(0, Math.floor(gray.pixels[y][x][0])));
        const newVal = mappings[ty][tx][v];
        row.push([newVal]);
      }
      result.push(row);
    }
    const claheImage: Image = { pixels: result, width: gray.width, height: gray.height, channels: 1 };
    this._lastImage = claheImage;
    return claheImage;
  }

  /**
   * Gamma correction
   */
  gammaCorrection(image: Image, gamma: number): Image {
    const invGamma = 1 / Math.max(0.01, gamma);
    const lut = new Array(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = 255 * Math.pow(i / 255, invGamma);
    }
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel = image.pixels[y][x].map(v => {
          const idx = Math.min(255, Math.max(0, Math.floor(v)));
          return lut[idx];
        });
        row.push(pixel);
      }
      result.push(row);
    }
    const corrected: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = corrected;
    return corrected;
  }

  /**
   * Contrast stretching - linear min-max normalization
   */
  contrastStretch(image: Image): Image {
    const stats = this.computeStats(image);
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel = image.pixels[y][x].map((v, c) => {
          const min = stats.min[c];
          const max = stats.max[c];
          return max > min ? (v - min) * 255 / (max - min) : v;
        });
        row.push(pixel);
      }
      result.push(row);
    }
    const stretched: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = stretched;
    return stretched;
  }

  /**
   * Brightness adjustment
   */
  brightness(image: Image, value: number): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel = image.pixels[y][x].map(v => Math.min(255, Math.max(0, v + value)));
        row.push(pixel);
      }
      result.push(row);
    }
    const adjusted: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = adjusted;
    return adjusted;
  }

  /**
   * Contrast adjustment
   */
  contrast(image: Image, factor: number): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel = image.pixels[y][x].map(v => Math.min(255, Math.max(0, factor * (v - 128) + 128)));
        row.push(pixel);
      }
      result.push(row);
    }
    const adjusted: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = adjusted;
    return adjusted;
  }

  /**
   * Color space conversion
   */
  colorSpaceConvert(image: Image, from: string, to: string): Image {
    if (from === 'rgb' && to === 'hsv') return this._rgbToHsv(image);
    if (from === 'hsv' && to === 'rgb') return this._hsvToRgb(image);
    if (from === 'rgb' && to === 'ycbcr') return this._rgbToYcbcr(image);
    if (from === 'rgb' && to === 'lab') return this._rgbToLab(image);
    if (from === 'rgb' && to === 'yuv') return this._rgbToYuv(image);
    if (from === 'rgb' && to === 'cmyk') return this._rgbToCmyk(image);
    if (from === 'ycbcr' && to === 'rgb') return this._ycbcrToRgb(image);
    if (from === 'gray' && to === 'rgb') return this._grayToRgb(image);
    return image;
  }

  /**
   * Compute histogram of the image
   */
  computeHistogram(image: Image, bins: number = 256): Histogram {
    const channels: number[][] = [];
    for (let c = 0; c < image.channels; c++) {
      const ch = new Array(bins).fill(0);
      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          const val = Math.min(bins - 1, Math.max(0, Math.floor(image.pixels[y][x][c] / (256 / bins))));
          ch[val]++;
        }
      }
      channels.push(ch);
    }
    const histogram: Histogram = { channels, bins };
    this._histogram = histogram;
    return histogram;
  }

  /**
   * Compute image statistics: mean, std, variance, min, max, median, mode
   */
  computeStats(image: Image): ImageStat {
    const mean: number[] = [];
    const stdDev: number[] = [];
    const variance: number[] = [];
    const min: number[] = [];
    const max: number[] = [];
    const median: number[] = [];
    const mode: number[] = [];
    for (let c = 0; c < image.channels; c++) {
      const values: number[] = [];
      let sum = 0;
      let mn = Infinity;
      let mx = -Infinity;
      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          const v = image.pixels[y][x][c];
          values.push(v);
          sum += v;
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      }
      const n = values.length;
      const m = sum / n;
      let varSum = 0;
      for (const v of values) {
        varSum += (v - m) ** 2;
      }
      const vari = varSum / n;
      const std = Math.sqrt(vari);
      const sorted = [...values].sort((a, b) => a - b);
      const med = sorted[Math.floor(n / 2)];
      const hist = new Map<number, number>();
      let maxCount = 0;
      let modValue = 0;
      for (const v of values) {
        const cnt = (hist.get(v) || 0) + 1;
        hist.set(v, cnt);
        if (cnt > maxCount) {
          maxCount = cnt;
          modValue = v;
        }
      }
      mean.push(m);
      variance.push(vari);
      stdDev.push(std);
      min.push(mn);
      max.push(mx);
      median.push(med);
      mode.push(modValue);
    }
    const stats: ImageStat = { mean, stdDev, variance, min, max, median, mode };
    this._stats = stats;
    return stats;
  }

  /**
   * Morphological dilation
   */
  dilate(image: Image, kSize: number = 3): Image {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const kHalf = Math.floor(kSize / 2);
    const result: number[][][] = [];
    for (let y = 0; y < gray.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < gray.width; x++) {
        let maxVal = 0;
        for (let ky = -kHalf; ky <= kHalf; ky++) {
          for (let kx = -kHalf; kx <= kHalf; kx++) {
            const py = Math.min(Math.max(y + ky, 0), gray.height - 1);
            const px = Math.min(Math.max(x + kx, 0), gray.width - 1);
            if (gray.pixels[py][px][0] > maxVal) {
              maxVal = gray.pixels[py][px][0];
            }
          }
        }
        row.push([maxVal]);
      }
      result.push(row);
    }
    const dilated: Image = { pixels: result, width: gray.width, height: gray.height, channels: 1 };
    this._lastImage = dilated;
    return dilated;
  }

  /**
   * Morphological erosion
   */
  erode(image: Image, kSize: number = 3): Image {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const kHalf = Math.floor(kSize / 2);
    const result: number[][][] = [];
    for (let y = 0; y < gray.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < gray.width; x++) {
        let minVal = 255;
        for (let ky = -kHalf; ky <= kHalf; ky++) {
          for (let kx = -kHalf; kx <= kHalf; kx++) {
            const py = Math.min(Math.max(y + ky, 0), gray.height - 1);
            const px = Math.min(Math.max(x + kx, 0), gray.width - 1);
            if (gray.pixels[py][px][0] < minVal) {
              minVal = gray.pixels[py][px][0];
            }
          }
        }
        row.push([minVal]);
      }
      result.push(row);
    }
    const eroded: Image = { pixels: result, width: gray.width, height: gray.height, channels: 1 };
    this._lastImage = eroded;
    return eroded;
  }

  /**
   * Morphological opening - erosion followed by dilation
   */
  morphologicalOpening(image: Image, kSize: number = 3): Image {
    const eroded = this.erode(image, kSize);
    return this.dilate(eroded, kSize);
  }

  /**
   * Morphological closing - dilation followed by erosion
   */
  morphologicalClosing(image: Image, kSize: number = 3): Image {
    const dilated = this.dilate(image, kSize);
    return this.erode(dilated, kSize);
  }

  /**
   * Morphological gradient - difference between dilation and erosion
   */
  morphologicalGradient(image: Image, kSize: number = 3): Image {
    const dilated = this.dilate(image, kSize);
    const eroded = this.erode(image, kSize);
    const result: number[][][] = [];
    for (let y = 0; y < dilated.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < dilated.width; x++) {
        row.push([dilated.pixels[y][x][0] - eroded.pixels[y][x][0]]);
      }
      result.push(row);
    }
    const gradient: Image = { pixels: result, width: dilated.width, height: dilated.height, channels: 1 };
    this._lastImage = gradient;
    return gradient;
  }

  /**
   * Build a Gaussian pyramid
   */
  gaussianPyramid(image: Image, levels: number = 4): Image[] {
    const pyramid: Image[] = [image];
    let current = image;
    for (let i = 1; i < levels; i++) {
      const blurred = this.gaussianBlur(current, 1);
      current = this.resize(blurred, Math.floor(current.width / 2), Math.floor(current.height / 2), 'bilinear');
      pyramid.push(current);
    }
    return pyramid;
  }

  /**
   * Build a Laplacian pyramid
   */
  laplacianPyramid(image: Image, levels: number = 4): Image[] {
    const gaussian = this.gaussianPyramid(image, levels);
    const laplacian: Image[] = [];
    for (let i = 0; i < gaussian.length - 1; i++) {
      const current = gaussian[i];
      const next = gaussian[i + 1];
      const upsampled = this.resize(next, current.width, current.height, 'bilinear');
      const result: number[][][] = [];
      for (let y = 0; y < current.height; y++) {
        const row: number[][] = [];
        for (let x = 0; x < current.width; x++) {
          const pixel = current.pixels[y][x].map((v, c) => v - upsampled.pixels[y][x][c]);
          row.push(pixel);
        }
        result.push(row);
      }
      laplacian.push({ pixels: result, width: current.width, height: current.height, channels: current.channels });
    }
    laplacian.push(gaussian[gaussian.length - 1]);
    return laplacian;
  }

  /**
   * Invert (negative) of the image
   */
  invert(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        row.push(image.pixels[y][x].map(v => 255 - v));
      }
      result.push(row);
    }
    const inverted: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = inverted;
    return inverted;
  }

  /**
   * Add two images
   */
  addImages(image1: Image, image2: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image1.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image1.width; x++) {
        const pixel = image1.pixels[y][x].map((v, c) => {
          const other = image2.pixels[Math.min(y, image2.height - 1)][Math.min(x, image2.width - 1)][c] || 0;
          return Math.min(255, v + other);
        });
        row.push(pixel);
      }
      result.push(row);
    }
    const added: Image = { pixels: result, width: image1.width, height: image1.height, channels: image1.channels };
    this._lastImage = added;
    return added;
  }

  /**
   * Subtract two images
   */
  subtractImages(image1: Image, image2: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image1.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image1.width; x++) {
        const pixel = image1.pixels[y][x].map((v, c) => {
          const other = image2.pixels[Math.min(y, image2.height - 1)][Math.min(x, image2.width - 1)][c] || 0;
          return Math.max(0, v - other);
        });
        row.push(pixel);
      }
      result.push(row);
    }
    const subtracted: Image = { pixels: result, width: image1.width, height: image1.height, channels: image1.channels };
    this._lastImage = subtracted;
    return subtracted;
  }

  /**
   * Blend two images with a weight factor
   */
  blend(image1: Image, image2: Image, alpha: number): Image {
    const a = Math.min(1, Math.max(0, alpha));
    const b = 1 - a;
    const result: number[][][] = [];
    for (let y = 0; y < image1.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image1.width; x++) {
        const pixel = image1.pixels[y][x].map((v, c) => {
          const other = image2.pixels[Math.min(y, image2.height - 1)][Math.min(x, image2.width - 1)][c] || 0;
          return a * v + b * other;
        });
        row.push(pixel);
      }
      result.push(row);
    }
    const blended: Image = { pixels: result, width: image1.width, height: image1.height, channels: image1.channels };
    this._lastImage = blended;
    return blended;
  }

  /**
   * Draw a rectangle on the image
   */
  drawRectangle(image: Image, rect: Rect, color: RGBColor = { r: 255, g: 0, b: 0 }, thickness: number = 1): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel = [...image.pixels[y][x]];
        const onLeft = x >= rect.x && x < rect.x + thickness && y >= rect.y && y < rect.y + rect.height;
        const onRight = x >= rect.x + rect.width - thickness && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
        const onTop = y >= rect.y && y < rect.y + thickness && x >= rect.x && x < rect.x + rect.width;
        const onBottom = y >= rect.y + rect.height - thickness && y < rect.y + rect.height && x >= rect.x && x < rect.x + rect.width;
        if (onLeft || onRight || onTop || onBottom) {
          if (image.channels >= 3) {
            pixel[0] = color.r;
            pixel[1] = color.g;
            pixel[2] = color.b;
          } else {
            pixel[0] = (color.r + color.g + color.b) / 3;
          }
        }
        row.push(pixel);
      }
      result.push(row);
    }
    const drawn: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = drawn;
    return drawn;
  }

  /**
   * Draw a circle on the image
   */
  drawCircle(image: Image, center: Point2D, radius: number, color: RGBColor = { r: 255, g: 0, b: 0 }, thickness: number = 1): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel = [...image.pixels[y][x]];
        const dx = x - center.x;
        const dy = y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dist - radius) < thickness) {
          if (image.channels >= 3) {
            pixel[0] = color.r;
            pixel[1] = color.g;
            pixel[2] = color.b;
          } else {
            pixel[0] = (color.r + color.g + color.b) / 3;
          }
        }
        row.push(pixel);
      }
      result.push(row);
    }
    const drawn: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = drawn;
    return drawn;
  }

  /**
   * Draw a line between two points using Bresenham's algorithm
   */
  drawLine(image: Image, p1: Point2D, p2: Point2D, color: RGBColor = { r: 255, g: 255, b: 255 }, thickness: number = 1): Image {
    const result = image.pixels.map(row => row.map(pixel => [...pixel]));
    let x0 = Math.floor(p1.x);
    let y0 = Math.floor(p1.y);
    const x1 = Math.floor(p2.x);
    const y1 = Math.floor(p2.y);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (x0 >= 0 && x0 < image.width && y0 >= 0 && y0 < image.height) {
        for (let ty = -thickness + 1; ty < thickness; ty++) {
          for (let tx = -thickness + 1; tx < thickness; tx++) {
            const px = x0 + tx;
            const py = y0 + ty;
            if (px >= 0 && px < image.width && py >= 0 && py < image.height) {
              if (image.channels >= 3) {
                result[py][px][0] = color.r;
                result[py][px][1] = color.g;
                result[py][px][2] = color.b;
              } else {
                result[py][px][0] = (color.r + color.g + color.b) / 3;
              }
            }
          }
        }
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
    const drawn: Image = { pixels: result, width: image.width, height: image.height, channels: image.channels };
    this._lastImage = drawn;
    return drawn;
  }

  /**
   * Create a blank (black) image
   */
  createBlank(width: number, height: number, channels: number = 3, fillValue: number = 0): Image {
    const pixels: number[][][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < width; x++) {
        row.push(new Array(channels).fill(fillValue));
      }
      pixels.push(row);
    }
    return { pixels, width, height, channels };
  }

  /**
   * Create a test pattern image (gradients)
   */
  createGradient(width: number, height: number): Image {
    const pixels: number[][][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < width; x++) {
        const r = (x / width) * 255;
        const g = (y / height) * 255;
        const b = ((x + y) / (width + height)) * 255;
        row.push([r, g, b]);
      }
      pixels.push(row);
    }
    return { pixels, width, height, channels: 3 };
  }

  /**
   * Create a checkerboard pattern
   */
  createCheckerboard(width: number, height: number, squareSize: number = 16): Image {
    const pixels: number[][][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < width; x++) {
        const sx = Math.floor(x / squareSize);
        const sy = Math.floor(y / squareSize);
        const val = (sx + sy) % 2 === 0 ? 255 : 0;
        row.push([val, val, val]);
      }
      pixels.push(row);
    }
    return { pixels, width, height, channels: 3 };
  }

  /**
   * Pad an image with a border
   */
  pad(image: Image, top: number, bottom: number, left: number, right: number): Image {
    const newWidth = image.width + left + right;
    const newHeight = image.height + top + bottom;
    const result: number[][][] = [];
    for (let y = 0; y < newHeight; y++) {
      const row: number[][] = [];
      for (let x = 0; x < newWidth; x++) {
        if (y >= top && y < top + image.height && x >= left && x < left + image.width) {
          row.push(image.pixels[y - top][x - left]);
        } else {
          row.push(new Array(image.channels).fill(this._borderValue));
        }
      }
      result.push(row);
    }
    const padded: Image = { pixels: result, width: newWidth, height: newHeight, channels: image.channels };
    this._lastImage = padded;
    return padded;
  }

  /**
   * Compute the mean squared error between two images
   */
  mse(image1: Image, image2: Image): number {
    let sum = 0;
    let count = 0;
    const height = Math.min(image1.height, image2.height);
    const width = Math.min(image1.width, image2.width);
    const channels = Math.min(image1.channels, image2.channels);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          const d = image1.pixels[y][x][c] - image2.pixels[y][x][c];
          sum += d * d;
          count++;
        }
      }
    }
    return count > 0 ? sum / count : 0;
  }

  /**
   * Compute the peak signal-to-noise ratio (PSNR)
   */
  psnr(image1: Image, image2: Image): number {
    const mse = this.mse(image1, image2);
    if (mse === 0) return Infinity;
    return 10 * Math.log10((255 * 255) / mse);
  }

  /**
   * Apply a custom filter (kernel) to the image
   */
  applyFilter(image: Image, filter: Filter): Image {
    return this._convolve(image, filter.kernel);
  }

  /**
   * Register a filter for later use
   */
  registerFilter(filter: Filter): void {
    this._filters.push(filter);
  }

  /**
   * Serialize the image processing state
   */
  serialize(): string {
    return JSON.stringify({
      counter: this._counter,
      filters: this._filters,
      borderType: this._borderType,
      borderValue: this._borderValue,
      defaultInterpolation: this._defaultInterpolation
    });
  }

  /**
   * Deserialize the image processing state
   */
  deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      this._counter = data.counter || 0;
      this._filters = data.filters || [];
      this._borderType = data.borderType || 'reflect';
      this._borderValue = data.borderValue || 0;
      this._defaultInterpolation = data.defaultInterpolation || 'bilinear';
    } catch (e) {
      // ignore malformed input
    }
  }

  /**
   * Get the last processed image
   */
  getLastImage(): Image | null {
    return this._lastImage;
  }

  /**
   * Internal: equalize a single-channel image
   */
  private _equalizeSingle(image: Image): Image {
    const histogram = new Array(256).fill(0);
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const val = Math.min(255, Math.max(0, Math.floor(image.pixels[y][x][0])));
        histogram[val]++;
      }
    }
    const total = image.width * image.height;
    const cdf = new Array(256).fill(0);
    cdf[0] = histogram[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + histogram[i];
    }
    const cdfMin = cdf.find(v => v > 0) || 0;
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const val = Math.min(255, Math.max(0, Math.floor(image.pixels[y][x][0])));
        const equalized = Math.round((cdf[val] - cdfMin) / (total - cdfMin) * 255);
        row.push([equalized]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 1 };
  }

  /**
   * Internal: convert RGB to HSV
   */
  private _rgbToHsv(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const r = image.pixels[y][x][0] / 255;
        const g = image.pixels[y][x][1] / 255;
        const b = image.pixels[y][x][2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;
        if (d !== 0) {
          if (max === r) h = ((g - b) / d) % 6;
          else if (max === g) h = (b - r) / d + 2;
          else h = (r - g) / d + 4;
          h *= 60;
          if (h < 0) h += 360;
        }
        row.push([h, s, v]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 3 };
  }

  /**
   * Internal: convert HSV to RGB
   */
  private _hsvToRgb(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const h = image.pixels[y][x][0];
        const s = image.pixels[y][x][1];
        const v = image.pixels[y][x][2];
        const c = v * s;
        const hh = h / 60;
        const xVal = c * (1 - Math.abs(hh % 2 - 1));
        let r = 0, g = 0, b = 0;
        if (hh >= 0 && hh < 1) { r = c; g = xVal; }
        else if (hh >= 1 && hh < 2) { r = xVal; g = c; }
        else if (hh >= 2 && hh < 3) { g = c; b = xVal; }
        else if (hh >= 3 && hh < 4) { g = xVal; b = c; }
        else if (hh >= 4 && hh < 5) { r = xVal; b = c; }
        else { r = c; b = xVal; }
        const m = v - c;
        row.push([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 3 };
  }

  /**
   * Internal: convert RGB to YCbCr
   */
  private _rgbToYcbcr(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const r = image.pixels[y][x][0];
        const g = image.pixels[y][x][1];
        const b = image.pixels[y][x][2];
        const yy = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
        const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
        row.push([yy, cb, cr]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 3 };
  }

  /**
   * Internal: convert YCbCr to RGB
   */
  private _ycbcrToRgb(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const yy = image.pixels[y][x][0];
        const cb = image.pixels[y][x][1] - 128;
        const cr = image.pixels[y][x][2] - 128;
        const r = yy + 1.402 * cr;
        const g = yy - 0.344136 * cb - 0.714136 * cr;
        const b = yy + 1.772 * cb;
        row.push([r, g, b]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 3 };
  }

  /**
   * Internal: convert RGB to LAB (simplified)
   */
  private _rgbToLab(image: Image): Image {
    const xyz = this._rgbToXyz(image);
    const result: number[][][] = [];
    for (let y = 0; y < xyz.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < xyz.width; x++) {
        const xn = xyz.pixels[y][x][0] / 95.047;
        const yn = xyz.pixels[y][x][1] / 100;
        const zn = xyz.pixels[y][x][2] / 108.883;
        const fx = xn > 0.008856 ? Math.cbrt(xn) : (7.787 * xn + 16 / 116);
        const fy = yn > 0.008856 ? Math.cbrt(yn) : (7.787 * yn + 16 / 116);
        const fz = zn > 0.008856 ? Math.cbrt(zn) : (7.787 * zn + 16 / 116);
        const L = 116 * fy - 16;
        const a = 500 * (fx - fy);
        const b = 200 * (fy - fz);
        row.push([L, a, b]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 3 };
  }

  /**
   * Internal: convert RGB to XYZ
   */
  private _rgbToXyz(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        let r = image.pixels[y][x][0] / 255;
        let g = image.pixels[y][x][1] / 255;
        let b = image.pixels[y][x][2] / 255;
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        const X = r * 41.24 + g * 35.76 + b * 18.05;
        const Y = r * 21.26 + g * 71.52 + b * 7.22;
        const Z = r * 1.93 + g * 11.92 + b * 95.05;
        row.push([X, Y, Z]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 3 };
  }

  /**
   * Internal: convert RGB to YUV
   */
  private _rgbToYuv(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const r = image.pixels[y][x][0];
        const g = image.pixels[y][x][1];
        const b = image.pixels[y][x][2];
        const Y = 0.299 * r + 0.587 * g + 0.114 * b;
        const U = -0.14713 * r - 0.28886 * g + 0.436 * b;
        const V = 0.615 * r - 0.51499 * g - 0.10001 * b;
        row.push([Y, U, V]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 3 };
  }

  /**
   * Internal: convert RGB to CMYK
   */
  private _rgbToCmyk(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const r = image.pixels[y][x][0] / 255;
        const g = image.pixels[y][x][1] / 255;
        const b = image.pixels[y][x][2] / 255;
        const k = 1 - Math.max(r, g, b);
        const c = k < 1 ? (1 - r - k) / (1 - k) : 0;
        const m = k < 1 ? (1 - g - k) / (1 - k) : 0;
        const yy = k < 1 ? (1 - b - k) / (1 - k) : 0;
        row.push([c * 100, m * 100, yy * 100, k * 100]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 4 };
  }

  /**
   * Internal: convert grayscale to RGB
   */
  private _grayToRgb(image: Image): Image {
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const v = image.pixels[y][x][0];
        row.push([v, v, v]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 3 };
  }

  /**
   * Internal: convolve with a kernel
   */
  private _convolve(image: Image, kernel: number[][]): Image {
    const kSize = kernel.length;
    const kHalf = Math.floor(kSize / 2);
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        const pixel: number[] = new Array(image.channels).fill(0);
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const sy = Math.min(Math.max(y + ky - kHalf, 0), image.height - 1);
            const sx = Math.min(Math.max(x + kx - kHalf, 0), image.width - 1);
            for (let c = 0; c < image.channels; c++) {
              pixel[c] += image.pixels[sy][sx][c] * kernel[ky][kx];
            }
          }
        }
        row.push(pixel.map(v => Math.min(255, Math.max(0, v))));
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: image.channels };
  }

  /**
   * Internal: convolve single-channel image
   */
  private _convolveSingle(image: Image, kernel: number[][]): Image {
    const kSize = kernel.length;
    const kHalf = Math.floor(kSize / 2);
    const result: number[][][] = [];
    for (let y = 0; y < image.height; y++) {
      const row: number[][] = [];
      for (let x = 0; x < image.width; x++) {
        let val = 0;
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const sy = Math.min(Math.max(y + ky - kHalf, 0), image.height - 1);
            const sx = Math.min(Math.max(x + kx - kHalf, 0), image.width - 1);
            val += image.pixels[sy][sx][0] * kernel[ky][kx];
          }
        }
        row.push([val]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 1 };
  }

  /**
   * Internal: bilinear interpolation
   */
  private _bilinearInterp(image: Image, x: number, y: number): number[] {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, image.width - 1);
    const y1 = Math.min(y0 + 1, image.height - 1);
    const fx = x - x0;
    const fy = y - y0;
    const pixel: number[] = [];
    for (let c = 0; c < image.channels; c++) {
      const a = image.pixels[Math.min(y0, image.height - 1)][Math.min(x0, image.width - 1)][c];
      const b = image.pixels[Math.min(y0, image.height - 1)][x1][c];
      const cc = image.pixels[y1][Math.min(x0, image.width - 1)][c];
      const d = image.pixels[y1][x1][c];
      const val = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + cc * (1 - fx) * fy + d * fx * fy;
      pixel.push(val);
    }
    return pixel;
  }

  /**
   * Internal: bicubic interpolation
   */
  private _bicubicInterp(image: Image, x: number, y: number): number[] {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const pixel: number[] = new Array(image.channels).fill(0);
    for (let dy = -1; dy <= 2; dy++) {
      for (let dx = -1; dx <= 2; dx++) {
        const px = Math.min(Math.max(xi + dx, 0), image.width - 1);
        const py = Math.min(Math.max(yi + dy, 0), image.height - 1);
        const wx = this._cubicWeight(dx - fx);
        const wy = this._cubicWeight(dy - fy);
        for (let c = 0; c < image.channels; c++) {
          pixel[c] += image.pixels[py][px][c] * wx * wy;
        }
      }
    }
    return pixel.map(v => Math.min(255, Math.max(0, v)));
  }

  /**
   * Internal: cubic weight function
   */
  private _cubicWeight(t: number): number {
    const a = -0.5;
    const absT = Math.abs(t);
    if (absT <= 1) {
      return (a + 2) * absT * absT * absT - (a + 3) * absT * absT + 1;
    } else if (absT < 2) {
      return a * absT * absT * absT - 5 * a * absT * absT + 8 * a * absT - 4 * a;
    }
    return 0;
  }

  /**
   * Internal: Lanczos interpolation
   */
  private _lanczosInterp(image: Image, x: number, y: number, a: number = 3): number[] {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const pixel: number[] = new Array(image.channels).fill(0);
    let totalWeight = 0;
    for (let dy = -a + 1; dy <= a; dy++) {
      for (let dx = -a + 1; dx <= a; dx++) {
        const px = Math.min(Math.max(xi + dx, 0), image.width - 1);
        const py = Math.min(Math.max(yi + dy, 0), image.height - 1);
        const wx = this._lanczosKernel(dx - fx, a);
        const wy = this._lanczosKernel(dy - fy, a);
        const weight = wx * wy;
        totalWeight += weight;
        for (let c = 0; c < image.channels; c++) {
          pixel[c] += image.pixels[py][px][c] * weight;
        }
      }
    }
    if (totalWeight > 0) {
      for (let c = 0; c < image.channels; c++) {
        pixel[c] /= totalWeight;
      }
    }
    return pixel;
  }

  /**
   * Internal: Lanczos kernel function
   */
  private _lanczosKernel(x: number, a: number = 3): number {
    if (x === 0) return 1;
    if (Math.abs(x) >= a) return 0;
    const px = Math.PI * x;
    return (a * Math.sin(px) * Math.sin(px / a)) / (px * px);
  }

  /**
   * Internal: get pixel with border handling
   */
  private _getPixelWithBorder(image: Image, x: number, y: number): number[] {
    if (x >= 0 && x < image.width && y >= 0 && y < image.height) {
      return image.pixels[Math.floor(y)][Math.floor(x)];
    }
    if (this._borderType === 'constant') {
      return new Array(image.channels).fill(this._borderValue);
    } else if (this._borderType === 'replicate') {
      const px = Math.min(Math.max(Math.floor(x), 0), image.width - 1);
      const py = Math.min(Math.max(Math.floor(y), 0), image.height - 1);
      return image.pixels[py][px];
    } else if (this._borderType === 'reflect') {
      let px = Math.floor(x);
      let py = Math.floor(y);
      while (px < 0 || px >= image.width) {
        if (px < 0) px = -px;
        if (px >= image.width) px = 2 * image.width - px - 2;
      }
      while (py < 0 || py >= image.height) {
        if (py < 0) py = -py;
        if (py >= image.height) py = 2 * image.height - py - 2;
      }
      return image.pixels[py][px];
    } else {
      const px = ((Math.floor(x) % image.width) + image.width) % image.width;
      const py = ((Math.floor(y) % image.height) + image.height) % image.height;
      return image.pixels[py][px];
    }
  }

  toPacket(): DataPacket<Image> {
    const result = this._lastImage || { pixels: [], width: 0, height: 0, channels: 0 };
    this._counter++;
    return {
      id: `image-proc-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['computer-vision', 'image-processing'],
        priority: 1,
        phase: 'image-processing'
      }
    };
  }

  reset(): void {
    this._images = [];
    this._filters = [];
    this._counter = 0;
    this._histogram = null;
    this._lastImage = null;
    this._stats = null;
    this._borderType = 'reflect';
    this._borderValue = 0;
    this._defaultInterpolation = 'bilinear';
  }
}
