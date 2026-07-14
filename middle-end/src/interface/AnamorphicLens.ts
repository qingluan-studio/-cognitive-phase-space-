/**
 * 变形镜头：从特定角度对数据进行扭曲投影，只有持有正确视角密钥
 * 的观察者才能解读真实内容，其余视角看到的皆为变形后的误导画面。
 */

export type DistortionKind = 'radial' | 'shear' | 'wave' | 'noise' | 'none';

export interface ViewingAngle {
  observerId: string;
  lensKey: string;
  authorized: boolean;
}

export interface DistortedView {
  original: Record<string, unknown>;
  rendered: Record<string, unknown>;
  distortion: DistortionKind;
  intelligible: boolean;
}

export interface LensConfig {
  defaultDistortion: DistortionKind;
  authorizedDistortion: DistortionKind;
  seed: number;
}

export class AnamorphicLens {
  private _config: LensConfig;
  private _viewers: Map<string, ViewingAngle> = new Map();
  private _renders: Map<string, DistortedView> = new Map();
  private _accessLog: string[] = [];

  constructor(config?: Partial<LensConfig>) {
    this._config = {
      defaultDistortion: config?.defaultDistortion ?? 'wave',
      authorizedDistortion: config?.authorizedDistortion ?? 'none',
      seed: config?.seed ?? 42,
    };
  }

  registerViewer(observerId: string, lensKey: string): ViewingAngle {
    const authorized = lensKey === this._deriveKey(observerId);
    const angle: ViewingAngle = { observerId, lensKey, authorized };
    this._viewers.set(observerId, angle);
    return angle;
  }

  private _deriveKey(observerId: string): string {
    let hash = this._config.seed;
    for (let i = 0; i < observerId.length; i++) {
      hash = (hash * 31 + observerId.charCodeAt(i)) >>> 0;
    }
    return `key-${hash.toString(16)}`;
  }

  view(data: Record<string, unknown>, observerId: string): DistortedView {
    const viewer = this._viewers.get(observerId);
    this._accessLog.push(`${observerId}@${Date.now()}`);
    const authorized = viewer?.authorized ?? false;
    const distortion = authorized
      ? this._config.authorizedDistortion
      : this._config.defaultDistortion;
    const rendered = this._applyDistortion(data, distortion, observerId);
    const view: DistortedView = {
      original: authorized ? data : {},
      rendered,
      distortion,
      intelligible: authorized,
    };
    this._renders.set(observerId, view);
    return view;
  }

  private _applyDistortion(
    data: Record<string, unknown>,
    kind: DistortionKind,
    salt: string
  ): Record<string, unknown> {
    if (kind === 'none') return { ...data };
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const saltedKey = kind === 'noise' ? `${key}-${salt.length}` : key;
      const mangled = kind === 'shear' ? String(value).split('').reverse().join('') : value;
      out[saltedKey] = kind === 'radial' ? { ring: mangled } : mangled;
    }
    return out;
  }

  rotateLens(newSeed: number): void {
    this._config.seed = newSeed;
    for (const viewer of this._viewers.values()) {
      viewer.authorized = viewer.lensKey === this._deriveKey(viewer.observerId);
    }
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
}
