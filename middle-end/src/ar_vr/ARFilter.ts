import { DataPacket } from '../shared/types';

export interface ARFilter {
  id: string;
  name: string;
  type: 'face' | 'beauty' | 'sticker' | 'makeup' | 'background' | 'effect';
  effect: string;
  parameters: Record<string, number>;
}

export interface FaceFilter extends ARFilter {
  landmarks: number[];
  faceMesh: boolean;
}

interface FilterState {
  active: boolean;
  intensity: number;
  filter: ARFilter;
}

interface AnimationKeyframe {
  time: number;
  parameters: Record<string, number>;
}

export class ARFilter {
  private _filters: Map<string, ARFilter> = new Map();
  private _activeFilters: FilterState[] = [];
  private _animations: Map<string, AnimationKeyframe[]> = new Map();
  private _counter = 0;
  private _faceData = {
    landmarks: [] as number[][],
    detected: false,
    confidence: 0,
  };
  private _segmentation = {
    mask: '',
    quality: 0,
    personMask: false,
  };

  faceFilter(cameraFace: string, filter: ARFilter, landmarks: number[][]): { output: string; landmarks: number[][]; applied: boolean } {
    this._faceData = {
      landmarks,
      detected: landmarks.length > 0,
      confidence: landmarks.length > 0 ? Math.random() * 0.3 + 0.7 : 0,
    };
    const applied = landmarks.length > 0;
    this._applyFilter(filter);
    return {
      output: `face-filtered-${cameraFace}-${filter.id}`,
      landmarks,
      applied,
    };
  }

  beautyFilter(image: string, parameters: Record<string, number>): { output: string; parameters: Record<string, number> } {
    const filter: ARFilter = {
      id: `beauty-${Date.now()}-${this._counter++}`,
      name: 'beauty',
      type: 'beauty',
      effect: 'skin_smoothing',
      parameters,
    };
    this._applyFilter(filter);
    return {
      output: `beauty-${image}`,
      parameters: { ...parameters },
    };
  }

  stickerFilter(image: string, sticker: string, position: [number, number]): { output: string; sticker: string; position: [number, number] } {
    const filter: ARFilter = {
      id: `sticker-${Date.now()}-${this._counter++}`,
      name: sticker,
      type: 'sticker',
      effect: 'overlay',
      parameters: { x: position[0], y: position[1], scale: 1, rotation: 0 },
    };
    this._applyFilter(filter);
    return {
      output: `sticker-${image}-${sticker}`,
      sticker,
      position: [...position] as [number, number],
    };
  }

  makeupFilter(face: string, makeup: Record<string, string>, landmarks: number[][]): { output: string; makeup: Record<string, string> } {
    const filter: ARFilter = {
      id: `makeup-${Date.now()}-${this._counter++}`,
      name: 'makeup',
      type: 'makeup',
      effect: 'face_makeup',
      parameters: {
        lipColor: 1,
        foundation: 0.5,
        blush: 0.3,
        eyeshadow: 0.7,
        eyeliner: 0.8,
      },
    };
    this._applyFilter(filter);
    return {
      output: `makeup-${face}`,
      makeup: { ...makeup },
    };
  }

  hairColorFilter(face: string, color: string, mask: string): { output: string; color: string; maskQuality: number } {
    const quality = Math.random() * 0.3 + 0.7;
    const filter: ARFilter = {
      id: `hair-${Date.now()}-${this._counter++}`,
      name: `hair-${color}`,
      type: 'effect',
      effect: 'hair_color',
      parameters: { quality, hueShift: 0 },
    };
    this._applyFilter(filter);
    return {
      output: `hair-color-${face}`,
      color,
      maskQuality: quality,
    };
  }

  backgroundReplace(image: string, newBackground: string, segmentation: string): { output: string; background: string; edgeQuality: number } {
    const quality = Math.random() * 0.3 + 0.6;
    this._segmentation = {
      mask: segmentation,
      quality,
      personMask: true,
    };
    const filter: ARFilter = {
      id: `bg-replace-${Date.now()}-${this._counter++}`,
      name: 'background_replace',
      type: 'background',
      effect: 'replace',
      parameters: { edgeSoftness: 0.1, quality },
    };
    this._applyFilter(filter);
    return {
      output: `bg-replaced-${image}`,
      background: newBackground,
      edgeQuality: quality,
    };
  }

  backgroundBlur(image: string, level: number, segmentation: string): { output: string; blurLevel: number; quality: number } {
    const quality = Math.random() * 0.3 + 0.7;
    this._segmentation = {
      mask: segmentation,
      quality,
      personMask: true,
    };
    const filter: ARFilter = {
      id: `bg-blur-${Date.now()}-${this._counter++}`,
      name: 'background_blur',
      type: 'background',
      effect: 'blur',
      parameters: { level, quality },
    };
    this._applyFilter(filter);
    return {
      output: `bg-blur-${image}`,
      blurLevel: level,
      quality,
    };
  }

  filterCombine(filters: ARFilter[], weights: number[]): { combined: string; filters: string[]; weights: number[] } {
    const normalizedWeights = this._normalizeWeights(weights);
    return {
      combined: `combined-${filters.map(f => f.id).join('-')}`,
      filters: filters.map(f => f.id),
      weights: normalizedWeights,
    };
  }

  filterAnimation(filter: ARFilter, timeline: { time: number; parameters: Record<string, number> }[]): { filterId: string; keyframes: number; duration: number } {
    this._animations.set(filter.id, timeline);
    return {
      filterId: filter.id,
      keyframes: timeline.length,
      duration: timeline.length > 0 ? timeline[timeline.length - 1].time : 0,
    };
  }

  faceMorph(face1: string, face2: string, amount: number, landmarks: number[][]): { output: string; amount: number; quality: number } {
    const quality = Math.random() * 0.3 + 0.6;
    return {
      output: `morph-${face1}-${face2}-${amount}`,
      amount,
      quality,
    };
  }

  cartoonEffect(image: string, parameters: Record<string, number>): { output: string; style: string; edgeStrength: number } {
    const filter: ARFilter = {
      id: `cartoon-${Date.now()}-${this._counter++}`,
      name: 'cartoon',
      type: 'effect',
      effect: 'cartoon_style',
      parameters,
    };
    this._applyFilter(filter);
    return {
      output: `cartoon-${image}`,
      style: (parameters.style as string) || 'cel_shaded',
      edgeStrength: parameters.edgeStrength || 0.5,
    };
  }

  glitchEffect(image: string, amount: number): { output: string; intensity: number; channels: string[] } {
    const filter: ARFilter = {
      id: `glitch-${Date.now()}-${this._counter++}`,
      name: 'glitch',
      type: 'effect',
      effect: 'glitch',
      parameters: { amount, rgbShift: amount * 0.5, scanlines: amount * 0.3 },
    };
    this._applyFilter(filter);
    return {
      output: `glitch-${image}`,
      intensity: amount,
      channels: ['r', 'g', 'b'],
    };
  }

  bokehEffect(image: string, aperture: number, focalPoint: [number, number]): { output: string; aperture: number; focalPoint: [number, number] } {
    const filter: ARFilter = {
      id: `bokeh-${Date.now()}-${this._counter++}`,
      name: 'bokeh',
      type: 'effect',
      effect: 'bokeh',
      parameters: { aperture, focalX: focalPoint[0], focalY: focalPoint[1] },
    };
    this._applyFilter(filter);
    return {
      output: `bokeh-${image}`,
      aperture,
      focalPoint: [...focalPoint] as [number, number],
    };
  }

  private _applyFilter(filter: ARFilter): void {
    const existing = this._activeFilters.find(f => f.filter.id === filter.id);
    if (existing) {
      existing.intensity = 1;
    } else {
      this._activeFilters.push({ active: true, intensity: 1, filter });
      this._filters.set(filter.id, filter);
    }
    if (this._activeFilters.length > 20) this._activeFilters.shift();
  }

  private _normalizeWeights(weights: number[]): number[] {
    const sum = weights.reduce((s, w) => s + w, 0);
    if (sum === 0) return weights.map(() => 1 / weights.length);
    return weights.map(w => w / sum);
  }

  get filterCount(): number {
    return this._filters.size;
  }

  get activeFilterCount(): number {
    return this._activeFilters.length;
  }

  get faceDetected(): boolean {
    return this._faceData.detected;
  }

  public toPacket(): DataPacket<{
    filters: number;
    activeFilters: number;
    animations: number;
    faceDetected: boolean;
    faceConfidence: number;
    segmentationQuality: number;
  }> {
    return {
      id: `ar-filter-${Date.now()}-${this._counter}`,
      payload: {
        filters: this._filters.size,
        activeFilters: this._activeFilters.length,
        animations: this._animations.size,
        faceDetected: this._faceData.detected,
        faceConfidence: this._faceData.confidence,
        segmentationQuality: this._segmentation.quality,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ar_vr', 'ar_filter', 'result'],
        priority: 0.7,
        phase: 'filtering',
      },
    };
  }

  public reset(): void {
    this._filters.clear();
    this._activeFilters = [];
    this._animations.clear();
    this._counter = 0;
    this._faceData = {
      landmarks: [],
      detected: false,
      confidence: 0,
    };
    this._segmentation = {
      mask: '',
      quality: 0,
      personMask: false,
    };
  }
}
