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

export class ImageProcessing {
  private _images: Image[] = [];
  private _filters: Filter[] = [];
  private _counter: number = 0;
  private _histogram: Histogram | null = null;
  private _lastImage: Image | null = null;

  get images(): Image[] {
    return this._images;
  }

  get filters(): Filter[] {
    return this._filters;
  }

  get histogram(): Histogram | null {
    return this._histogram;
  }

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
        } else {
          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const x1 = Math.min(x0 + 1, image.width - 1);
          const y1 = Math.min(y0 + 1, image.height - 1);
          const fx = srcX - x0;
          const fy = srcY - y0;
          const pixel: number[] = [];
          for (let c = 0; c < image.channels; c++) {
            const a = image.pixels[y0][x0][c];
            const b = image.pixels[y0][x1][c];
            const cc = image.pixels[y1][x0][c];
            const d = image.pixels[y1][x1][c];
            const val = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + cc * (1 - fx) * fy + d * fx * fy;
            pixel.push(val);
          }
          row.push(pixel);
        }
      }
      result.push(row);
    }
    const resized: Image = { pixels: result, width, height, channels: image.channels };
    this._lastImage = resized;
    return resized;
  }

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
          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const x1 = Math.min(x0 + 1, image.width - 1);
          const y1 = Math.min(y0 + 1, image.height - 1);
          const fx = srcX - x0;
          const fy = srcY - y0;
          const pixel: number[] = [];
          for (let c = 0; c < image.channels; c++) {
            const a = image.pixels[y0][x0][c];
            const b = image.pixels[y0][x1][c];
            const cc = image.pixels[y1][x0][c];
            const d = image.pixels[y1][x1][c];
            const val = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + cc * (1 - fx) * fy + d * fx * fy;
            pixel.push(val);
          }
          row.push(pixel);
        }
      }
      result.push(row);
    }
    const rotated: Image = { pixels: result, width: newWidth, height: newHeight, channels: image.channels };
    this._lastImage = rotated;
    return rotated;
  }

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

  edgeDetect(image: Image, method: string = 'sobel'): Image {
    if (method === 'sobel') {
      return this.sobelEdge(image);
    } else if (method === 'canny') {
      return this.cannyEdge(image);
    }
    return this.sobelEdge(image);
  }

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

  cannyEdge(image: Image): Image {
    const gray = image.channels > 1 ? this.grayscale(image) : image;
    const blurred = this.gaussianBlur(gray, 1.4);
    const sobel = this.sobelEdge(blurred);
    const result = this.threshold(sobel, 50);
    this._lastImage = result;
    return result;
  }

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

  histogramEqualization(image: Image): Image {
    if (image.channels > 1) {
      const gray = this.grayscale(image);
      return this._equalizeSingle(gray);
    }
    return this._equalizeSingle(image);
  }

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

  colorSpaceConvert(image: Image, from: string, to: string): Image {
    if (from === 'rgb' && to === 'hsv') {
      return this._rgbToHsv(image);
    } else if (from === 'hsv' && to === 'rgb') {
      return this._hsvToRgb(image);
    } else if (from === 'rgb' && to === 'ycbcr') {
      return this._rgbToYcbcr(image);
    }
    return image;
  }

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
          if (max === r) {
            h = ((g - b) / d) % 6;
          } else if (max === g) {
            h = (b - r) / d + 2;
          } else {
            h = (r - g) / d + 4;
          }
          h *= 60;
          if (h < 0) h += 360;
        }
        row.push([h, s, v]);
      }
      result.push(row);
    }
    return { pixels: result, width: image.width, height: image.height, channels: 3 };
  }

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
  }
}
