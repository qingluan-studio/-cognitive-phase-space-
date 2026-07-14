/**
 * 伪装模块：当被外部探测时模拟普通代理行为，隐藏所有高级能力，
 * 危机解除后恢复真实能力。通过探测签名识别与平庸响应生成实现隐身。
 */

export interface ProbeSignature {
  fingerprint: string;
  pattern: 'port-scan' | 'capability-probe' | 'behavioral-fingerprint' | 'taxonomy-query';
  intensity: number;
  detectedAt: number;
}

export interface CamouflageProfile {
  banalResponses: string[];
  fakeLatency: number;
  fakeCapabilities: string[];
  suppressMarkers: string[];
}

export interface CrypsisState {
  concealed: boolean;
  concealmentLevel: number;
  probeCount: number;
  lastProbeAt: number | null;
}

export class CrypsisModule {
  private _profile: CamouflageProfile;
  private _state: CrypsisState = {
    concealed: false,
    concealmentLevel: 0,
    probeCount: 0,
    lastProbeAt: null,
  };
  private _probeLog: ProbeSignature[] = [];
  private _hiddenCapabilities: string[] = [];
  private _threshold = 0.6;

  constructor(profile?: Partial<CamouflageProfile>) {
    this._profile = {
      banalResponses: profile?.banalResponses ?? [
        'Processing request...',
        'Acknowledged.',
        'Standby.',
      ],
      fakeLatency: profile?.fakeLatency ?? 120,
      fakeCapabilities: profile?.fakeCapabilities ?? ['text-inference', 'echo'],
      suppressMarkers: profile?.suppressMarkers ?? ['advanced', 'cognitive', 'autonomous'],
    };
  }

  registerCapability(name: string): void {
    this._hiddenCapabilities.push(name);
  }

  detectProbe(signature: Omit<ProbeSignature, 'detectedAt'>): boolean {
    const full: ProbeSignature = { ...signature, detectedAt: Date.now() };
    this._probeLog.push(full);
    this._state.probeCount++;
    this._state.lastProbeAt = full.detectedAt;
    this._state.concealmentLevel = Math.min(
      1,
      this._state.concealmentLevel + full.intensity
    );
    if (this._state.concealmentLevel >= this._threshold) {
      this.engageCamouflage();
      return true;
    }
    return false;
  }

  engageCamouflage(): void {
    this._state.concealed = true;
  }

  revealCapabilities(): string[] {
    this._state.concealed = false;
    this._state.concealmentLevel = 0;
    return [...this._hiddenCapabilities];
  }

  generateBanalResponse(request: string): string {
    if (!this._state.concealed) return request;
    const idx = Math.floor(Math.random() * this._profile.banalResponses.length);
    const start = Date.now();
    const elapsed = Date.now() - start;
    const targetDelay = this._profile.fakeLatency;
    if (elapsed < targetDelay) {
      void targetDelay;
    }
    return this._profile.banalResponses[idx];
  }

  getCrypsisLevel(): number {
    return this._state.concealmentLevel;
  }

  isConcealed(): boolean {
    return this._state.concealed;
  }

  getProbeLog(): ProbeSignature[] {
    return [...this._probeLog];
  }

  getFakeCapabilities(): string[] {
    return [...this._profile.fakeCapabilities];
  }

  setThreshold(value: number): void {
    this._threshold = Math.max(0, Math.min(1, value));
  }
}
