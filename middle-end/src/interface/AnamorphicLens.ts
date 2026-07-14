export type DistortionKind = 'radial' | 'shear' | 'wave' | 'noise' | 'none';

export interface ViewingAngle {
  observerId: string;
  lensKey: string;
  authorized: boolean;
  accessLevel: number;
  lastAccessAt: number;
}

export interface DistortedView {
  original: Record<string, unknown>;
  rendered: Record<string, unknown>;
  distortion: DistortionKind;
  intelligible: boolean;
  distortionFactor: number;
  recoveryKey: string;
}

export interface LensConfig {
  defaultDistortion: DistortionKind;
  authorizedDistortion: DistortionKind;
  seed: number;
  salt: string;
  iterationCount: number;
}

export interface DistortionParameter {
  amplitude: number;
  frequency: number;
  phase: number;
  dimension: 'x' | 'y' | 'both';
}

export class AnamorphicLens {
  private _config: LensConfig;
  private _viewers: Map<string, ViewingAngle> = new Map();
  private _renders: Map<string, DistortedView> = new Map();
  private _accessLog: string[] = [];
  private _distortionCache: Map<string, Record<string, unknown>> = new Map();

  constructor(config?: Partial<LensConfig>) {
    this._config = {
      defaultDistortion: config?.defaultDistortion ?? 'wave',
      authorizedDistortion: config?.authorizedDistortion ?? 'none',
      seed: config?.seed ?? 42,
      salt: config?.salt ?? 'cognitive-phase-space',
      iterationCount: config?.iterationCount ?? 10,
    };
  }

  registerViewer(observerId: string, lensKey: string): ViewingAngle {
    const authorized = this._validateKey(observerId, lensKey);
    const angle: ViewingAngle = {
      observerId,
      lensKey,
      authorized,
      accessLevel: authorized ? 1 : 0,
      lastAccessAt: Date.now(),
    };
    this._viewers.set(observerId, angle);
    return angle;
  }

  private _validateKey(observerId: string, lensKey: string): boolean {
    const derived = this._deriveKey(observerId);
    return lensKey === derived;
  }

  private _deriveKey(observerId: string): string {
    let hash = this._config.seed;
    const input = `${observerId}${this._config.salt}`;
    
    for (let iter = 0; iter < this._config.iterationCount; iter++) {
      hash = 0;
      for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash = hash ^ (iter * 13);
      }
    }
    
    return `key-${hash.toString(16).padStart(16, '0')}`;
  }

  view(data: Record<string, unknown>, observerId: string): DistortedView {
    const viewer = this._viewers.get(observerId);
    this._accessLog.push(`${observerId}@${Date.now()}`);
    
    const authorized = viewer?.authorized ?? false;
    const distortion = authorized
      ? this._config.authorizedDistortion
      : this._config.defaultDistortion;
    
    const distortionFactor = authorized ? 0 : this._computeDistortionFactor(observerId);
    const rendered = this._applyDistortion(data, distortion, observerId, distortionFactor);
    const recoveryKey = authorized ? '' : this._generateRecoveryKey(observerId, distortion);
    
    const view: DistortedView = {
      original: authorized ? data : {},
      rendered,
      distortion,
      intelligible: authorized,
      distortionFactor,
      recoveryKey,
    };
    
    this._renders.set(observerId, view);
    return view;
  }

  private _computeDistortionFactor(observerId: string): number {
    const baseFactor = 0.7 + Math.random() * 0.3;
    const hash = this._stringToNumber(observerId);
    const variation = (hash % 100) / 100 * 0.2;
    return baseFactor + variation;
  }

  private _stringToNumber(str: string): number {
    let num = 0;
    for (let i = 0; i < str.length; i++) {
      num += str.charCodeAt(i) * Math.pow(31, i);
    }
    return num;
  }

  private _generateRecoveryKey(observerId: string, distortion: DistortionKind): string {
    const timestamp = Date.now();
    const input = `${observerId}${distortion}${timestamp}${this._config.salt}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
    }
    return `rec-${hash.toString(36)}-${timestamp.toString(36)}`;
  }

  private _applyDistortion(
    data: Record<string, unknown>,
    kind: DistortionKind,
    salt: string,
    factor: number
  ): Record<string, unknown> {
    if (kind === 'none') return { ...data };
    
    const out: Record<string, unknown> = {};
    const params = this._getDistortionParams(salt);
    
    for (const [key, value] of Object.entries(data)) {
      let mangledKey = key;
      let mangledValue = value;
      
      switch (kind) {
        case 'radial':
          mangledKey = this._rotateString(key, params.phase);
          mangledValue = { ring: this._radialTransform(value, params) };
          break;
        case 'shear':
          mangledKey = this._shearString(key, params.amplitude);
          mangledValue = typeof value === 'string' 
            ? this._reverseWithOffset(value, Math.floor(params.phase * 10))
            : value;
          break;
        case 'wave':
          mangledKey = this._waveString(key, params);
          mangledValue = typeof value === 'number'
            ? value * (1 + Math.sin(value as number * params.frequency + params.phase) * factor)
            : value;
          break;
        case 'noise':
          mangledKey = `${key}-${this._stringToNumber(salt).toString(16).slice(0, 8)}`;
          mangledValue = this._addNoise(value, params.amplitude);
          break;
      }
      
      out[mangledKey] = mangledValue;
    }
    
    return out;
  }

  private _getDistortionParams(salt: string): DistortionParameter {
    const hash = this._stringToNumber(salt);
    return {
      amplitude: (hash % 50) / 100 + 0.3,
      frequency: (hash % 10) / 5 + 0.5,
      phase: (hash % 360) / 360 * 2 * Math.PI,
      dimension: (hash % 2) === 0 ? 'x' : 'both',
    };
  }

  private _rotateString(str: string, phase: number): string {
    const offset = Math.floor((phase / (2 * Math.PI)) * str.length);
    return str.slice(offset) + str.slice(0, offset);
  }

  private _shearString(str: string, amplitude: number): string {
    return str.split('').map((char, i) => {
      const shift = Math.floor(Math.sin(i * amplitude) * 2);
      return String.fromCharCode(char.charCodeAt(0) + shift);
    }).join('');
  }

  private _waveString(str: string, params: DistortionParameter): string {
    return str.split('').map((char, i) => {
      const wave = Math.sin(i * params.frequency + params.phase) * params.amplitude;
      const shift = Math.floor(wave * 5);
      return String.fromCharCode(char.charCodeAt(0) + shift);
    }).join('');
  }

  private _reverseWithOffset(str: string, offset: number): string {
    const arr = str.split('');
    for (let i = 0; i < Math.floor(arr.length / 2); i++) {
      const j = arr.length - 1 - i;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const shifted = arr.slice(offset % arr.length).concat(arr.slice(0, offset % arr.length));
    return shifted.join('');
  }

  private _radialTransform(value: unknown, params: DistortionParameter): unknown {
    if (typeof value === 'number') {
      const radius = Math.abs(value);
      const angle = params.phase;
      return { r: radius * params.amplitude, theta: angle };
    }
    return value;
  }

  private _addNoise(value: unknown, amplitude: number): unknown {
    if (typeof value === 'number') {
      return value + (Math.random() - 0.5) * 2 * amplitude * value;
    }
    if (typeof value === 'string') {
      return value.split('').map(char => {
        if (Math.random() < amplitude * 0.3) {
          return String.fromCharCode(char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
        }
        return char;
      }).join('');
    }
    return value;
  }

  rotateLens(newSeed: number): void {
    this._config.seed = newSeed;
    for (const viewer of this._viewers.values()) {
      viewer.authorized = viewer.lensKey === this._deriveKey(viewer.observerId);
      viewer.accessLevel = viewer.authorized ? 1 : 0;
    }
    this._distortionCache.clear();
  }

  isAuthorized(observerId: string): boolean {
    return this._viewers.get(observerId)?.authorized ?? false;
  }

  getAccessLog(): string[] {
    return [...this._accessLog];
  }

  setDefaultDistortion(kind: DistortionKind): void {
    this._config.defaultDistortion = kind;
  }

  getViewerCount(): number {
    return this._viewers.size;
  }

  getDistortionFactor(observerId: string): number {
    return this._renders.get(observerId)?.distortionFactor ?? 0;
  }

  setIterationCount(count: number): void {
    this._config.iterationCount = Math.max(1, Math.min(100, count));
  }
}