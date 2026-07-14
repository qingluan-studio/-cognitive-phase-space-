export interface ProbeSignature {
  fingerprint: string;
  pattern: 'port-scan' | 'capability-probe' | 'behavioral-fingerprint' | 'taxonomy-query';
  intensity: number;
  detectedAt: number;
  sourceIp?: string;
}

export interface CamouflageProfile {
  banalResponses: string[];
  fakeLatency: number;
  fakeCapabilities: string[];
  suppressMarkers: string[];
  noiseLevel: number;
}

export interface CrypsisState {
  concealed: boolean;
  concealmentLevel: number;
  probeCount: number;
  lastProbeAt: number | null;
  threatAssessment: number;
}

export interface PatternDetection {
  pattern: string;
  count: number;
  confidence: number;
  severity: number;
}

export interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export class CrypsisModule {
  private _profile: CamouflageProfile;
  private _state: CrypsisState = {
    concealed: false,
    concealmentLevel: 0,
    probeCount: 0,
    lastProbeAt: null,
    threatAssessment: 0,
  };
  private _probeLog: ProbeSignature[] = [];
  private _hiddenCapabilities: string[] = [];
  private _threshold = 0.6;
  private _patternHistory: Map<string, { timestamps: number[]; count: number }> = new Map();
  private _sourceTrackers: Map<string, { probes: number; firstSeen: number; lastSeen: number }> = new Map();
  private _confusionMatrix: ConfusionMatrix = {
    truePositives: 0,
    falsePositives: 0,
    trueNegatives: 0,
    falseNegatives: 0,
  };

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
      noiseLevel: profile?.noiseLevel ?? 0.1,
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
    
    this._trackSource(full);
    this._updatePatterns(full);
    
    const patternScore = this._computePatternScore(full);
    const sourceScore = this._computeSourceScore(full);
    const combined = 0.6 * signature.intensity + 0.2 * patternScore + 0.2 * sourceScore;
    
    this._state.concealmentLevel = Math.min(1, this._state.concealmentLevel + combined * 0.1);
    this._state.threatAssessment = this._state.concealmentLevel;
    
    if (this._state.concealmentLevel >= this._threshold) {
      this.engageCamouflage();
      this._confusionMatrix.truePositives++;
      return true;
    }
    
    this._confusionMatrix.falseNegatives++;
    return false;
  }

  private _trackSource(signature: ProbeSignature): void {
    if (!signature.sourceIp) return;
    const existing = this._sourceTrackers.get(signature.sourceIp);
    if (existing) {
      existing.probes++;
      existing.lastSeen = signature.detectedAt;
    } else {
      this._sourceTrackers.set(signature.sourceIp, {
        probes: 1,
        firstSeen: signature.detectedAt,
        lastSeen: signature.detectedAt,
      });
    }
  }

  private _updatePatterns(signature: ProbeSignature): void {
    const key = `${signature.pattern}:${signature.fingerprint.slice(0, 8)}`;
    const entry = this._patternHistory.get(key) || { timestamps: [], count: 0 };
    entry.timestamps.push(signature.detectedAt);
    entry.count++;
    if (entry.timestamps.length > 50) entry.timestamps.shift();
    this._patternHistory.set(key, entry);
  }

  private _computePatternScore(signature: ProbeSignature): number {
    const key = `${signature.pattern}:${signature.fingerprint.slice(0, 8)}`;
    const entry = this._patternHistory.get(key);
    if (!entry || entry.count < 3) return 0;
    
    const recent = entry.timestamps.slice(-10);
    const avgInterval = recent.length > 1 
      ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1)
      : Infinity;
    
    const burstScore = avgInterval < 1000 ? 0.8 : avgInterval < 5000 ? 0.4 : 0.1;
    const repetitionScore = Math.min(1, entry.count / 20);
    
    return 0.6 * burstScore + 0.4 * repetitionScore;
  }

  private _computeSourceScore(signature: ProbeSignature): number {
    if (!signature.sourceIp) return 0;
    const tracker = this._sourceTrackers.get(signature.sourceIp);
    if (!tracker) return 0;
    
    const duration = tracker.lastSeen - tracker.firstSeen;
    const rate = duration > 0 ? tracker.probes / (duration / 1000) : 0;
    const persistence = duration > 300000 ? 0.5 : 0;
    
    return Math.min(1, rate * 0.3 + persistence + tracker.probes * 0.05);
  }

  engageCamouflage(): void {
    this._state.concealed = true;
  }

  revealCapabilities(): string[] {
    this._state.concealed = false;
    this._state.concealmentLevel = 0;
    this._state.threatAssessment = 0;
    return [...this._hiddenCapabilities];
  }

  generateBanalResponse(request: string): string {
    if (!this._state.concealed) return request;
    
    const idx = Math.floor(Math.random() * this._profile.banalResponses.length);
    const baseResponse = this._profile.banalResponses[idx];
    
    const noise = this._profile.noiseLevel > 0 
      ? ` [${Math.random().toString(36).slice(2, 6)}]`
      : '';
    
    return baseResponse + noise;
  }

  getDetectionPatterns(): PatternDetection[] {
    const patterns: PatternDetection[] = [];
    for (const [key, entry] of this._patternHistory) {
      const [pattern] = key.split(':');
      const recent = entry.timestamps.slice(-5);
      const avgInterval = recent.length > 1
        ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1)
        : Infinity;
      
      const confidence = Math.min(1, entry.count / 10);
      const severity = avgInterval < 2000 ? 0.8 : avgInterval < 10000 ? 0.4 : 0.1;
      
      patterns.push({ pattern, count: entry.count, confidence, severity });
    }
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  getConfusionMatrix(): ConfusionMatrix {
    return { ...this._confusionMatrix };
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

  getThreatAssessment(): number {
    return this._state.threatAssessment;
  }

  setThreshold(value: number): void {
    this._threshold = Math.max(0, Math.min(1, value));
  }
}