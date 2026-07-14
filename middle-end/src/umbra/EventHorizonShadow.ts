export interface HorizonShadowPixel {
  x: number;
  y: number;
  brightness: number;
  inShadow: boolean;
}

export type ShadowImage = {
  pixels: number;
  shadowPixels: number;
  contrast: number;
  resolution: number;
};

export interface EventHorizonConfig {
  resolution: number;
  photonRingRadius: number;
  shadowRadius: number;
}

export class EventHorizonShadow {
  private _config: EventHorizonConfig;
  private _pixels: HorizonShadowPixel[] = [];
  private _image: ShadowImage | null = null;
  private _state: Record<string, unknown> = {};
  private _gravitationalRedshift: number = 0.8;
  private _spinParameter: number = 0.9;

  constructor(config: EventHorizonConfig) {
    this._config = config;
    this._render();
  }

  get pixelCount(): number {
    return this._pixels.length;
  }

  get resolution(): number {
    return this._config.resolution;
  }

  private _render(): void {
    this._pixels = [];
    const n = this._config.resolution;
    const center = (n - 1) / 2;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = x - center;
        const dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inShadow = dist <= this._config.shadowRadius;
        const ringDist = Math.abs(dist - this._config.photonRingRadius);
        const dopplerFactor = 1 / Math.sqrt(1 - this._spinParameter * this._spinParameter);
        const brightness = inShadow
          ? 0
          : Math.exp(-ringDist * 0.5 * dopplerFactor) * this._gravitationalRedshift + 0.1;
        this._pixels.push({ x, y, brightness, inShadow });
      }
    }
  }

  computeImage(): ShadowImage {
    const shadowPixels = this._pixels.filter((p) => p.inShadow).length;
    const totalBrightness = this._pixels.reduce((acc, p) => acc + p.brightness, 0);
    const avgBrightness = totalBrightness / this._pixels.length;
    const contrast = avgBrightness > 0 ? (1 - shadowPixels / this._pixels.length) / avgBrightness : 0;
    this._image = {
      pixels: this._pixels.length,
      shadowPixels,
      contrast,
      resolution: this._config.resolution,
    };
    return this._image;
  }

  isShadowVisible(): boolean {
    return this.computeImage().contrast > 0.5;
  }

  shadowArea(): number {
    return this._pixels.filter((p) => p.inShadow).length;
  }

  brightnessAt(x: number, y: number): number {
    const pixel = this._pixels.find((p) => p.x === x && p.y === y);
    return pixel ? pixel.brightness : 0;
  }

  brightestPixel(): HorizonShadowPixel | null {
    if (this._pixels.length === 0) return null;
    return this._pixels.reduce((best, p) => (p.brightness > best.brightness ? p : best));
  }

  setShadowRadius(radius: number): void {
    this._config.shadowRadius = radius;
    this._render();
    this._state.shadowRadiusUpdated = radius;
  }

  averageBrightness(): number {
    if (this._pixels.length === 0) return 0;
    return this._pixels.reduce((acc, p) => acc + p.brightness, 0) / this._pixels.length;
  }

  report(): Record<string, unknown> {
    return {
      pixelCount: this._pixels.length,
      image: this._image,
      state: this._state,
    };
  }

  computePhotonRingFlux(): number {
    const ringPixels = this._pixels.filter(p => {
      const dx = p.x - (this._config.resolution - 1) / 2;
      const dy = p.y - (this._config.resolution - 1) / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return Math.abs(dist - this._config.photonRingRadius) < 1.5;
    });
    return ringPixels.reduce((a, p) => a + p.brightness, 0);
  }

  setSpinParameter(a: number): void {
    this._spinParameter = Math.max(0, Math.min(0.999, a));
    this._render();
  }

  computeGravitationalRedshift(): number {
    return this._gravitationalRedshift / Math.sqrt(1 - this._spinParameter);
  }
}
